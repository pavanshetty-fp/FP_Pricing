import * as React from "react";
import { toast } from "sonner";
import { History, MoreHorizontal, Pencil, SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner, type BannerAlert } from "@/components/ui/alert-banner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { GroupedListFooter, useGrouping, type GroupDim } from "@/components/tables-layout";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { HeadFold, displayViewsFor, topBannerClass, useHeadFold, useTopBanner } from "../HeadFold";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ExportSheet, type ExportFilterRow, type ExportSummary } from "../ExportSheet";
import { ListTable, type ListColumn, type ListSort } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import { plural, uniq } from "./changeLog";
import { fitColumns } from "./fitColumns";

/*
  THE CONFIGURATION LIST (Yash, 2026-11-17) — Ship-to pricing and Customer
  pricing are the same List page as Activity feed and Order price trace:
  saved views as tabs, the Settings gear, search, Filters, Group by, the
  banner on top, Export, pages. No date window — configuration is how pricing
  stands now. A row opens its pricing sheet; its ⋯ (UX-46 · IX-3) has Edit or
  Configure pricing, and History.
*/

interface ViewState {
  mode?: ListView;
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
  colFilters?: Record<string, string>;
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  facets?: string[];
}
const keyOfState = (s: ViewState) =>
  JSON.stringify({ ...s, mode: s.mode ?? "table", hidden: [...s.hidden].sort(), facets: [...(s.facets ?? [])].sort() });

export interface ConfigListProps<T, K extends string> {
  storageKey: string;
  rows: T[];
  rowId: (r: T) => string;
  columns: ListColumn<K>[];
  /** What each column prints — search, the header boxes and the widths read it. */
  lines: (r: T, key: K) => string[];
  sortValue?: (r: T, key: K) => string | number | undefined;
  renderCell: (r: T, key: K) => React.ReactNode;
  /** Columns sized by their pill, not their text. */
  pillColumns?: K[];
  facets: { key: string; label: string; searchable?: boolean; order?: string[] }[];
  values: Record<string, (r: T) => string[]>;
  groupDims: GroupDim<T>[];
  noun: string;
  one: string;
  searchPlaceholder: string;
  /** The unconfigured banner: how many, and the facet value that shows them. */
  unconfigured: { count: number; title: string; facet: string };
  /** Alerts shown before the unconfigured one — a bulk rule's run. */
  leadAlerts?: BannerAlert[];
  configured: (r: T) => boolean;
  nameOf: (r: T) => string;
  onOpen: (r: T) => void;
  onHistory: (r: T) => void;
  /** More acts for a row, under the shared ones. */
  menuExtra?: (r: T) => React.ReactNode;
  exportSummary: (rows: T[]) => ExportSummary;
}

export function ConfigList<T, K extends string>(p: ConfigListProps<T, K>) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<ListSort<K> | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<K>>(new Set());
  const first = p.columns[0].key;
  const [colScope, setColScope] = React.useState<string>(first);
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<ReadonlySet<string>>(new Set());
  const alertDismissed = dismissed.has("unconfigured");
  const [snoozedUntil, setSnoozedUntil] = React.useState(0);
  const [alertApplied, setAlertApplied] = React.useState(false);
  const activeColFilters = React.useMemo(() => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""), [colFilters]);
  const toggle = React.useMemo(() => p.columns.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label })), [p.columns]);

  const current: ViewState = {
    mode: view,
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    colScope,
    colQuery,
    colFilters,
    columnOrder,
    columnWidths,
    facets: [...facetSel],
  };
  const defaultState: ViewState = React.useMemo(
    () => ({ mode: "table", search: "", sortKey: null, sortDir: null, hidden: [], pageSize: 25, colScope: first, colQuery: "", colFilters: {}, columnOrder: [], columnWidths: {}, facets: [] }),
    [first]
  );
  const applyState = (s: ViewState) => {
    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as K, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as K[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setColFilters(s.colFilters ?? {});
    setColFiltersOpen(Object.values(s.colFilters ?? {}).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setFacetSel(new Set(s.facets ?? []));
    setPage(1);
  };
  const savedViews = useSavedViews({ current, defaultState, keyOf: keyOfState, apply: applyState, storageKey: p.storageKey });

  const text = (r: T, key: K) => p.lines(r, key).join(" ");
  const textSize = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).fontSize;

  const facets = React.useMemo<ListFacet[]>(
    () =>
      p.facets.map((f) => ({
        key: f.key,
        label: f.label,
        searchable: f.searchable,
        options: f.order ?? uniq(p.rows.flatMap(p.values[f.key])).sort(),
      })),
    [p.rows] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      p.rows.filter(
        (r) =>
          (!q || toggle.some((c) => text(r, c.key).toLowerCase().includes(q))) &&
          (!cq || text(r, colScope as K).toLowerCase().includes(cq)) &&
          activeColFilters.every(([k, v]) => text(r, k as K).toLowerCase().includes(v.trim().toLowerCase()))
      ),
    [p.rows, q, cq, colScope, activeColFilters] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const by = new Map<string, string[]>();
      for (const id of sel) {
        const i = id.indexOf(":");
        by.set(id.slice(0, i), [...(by.get(id.slice(0, i)) ?? []), id.slice(i + 1)]);
      }
      return searched.filter((r) => [...by].every(([k, vs]) => p.values[k](r).some((v) => vs.includes(v))));
    },
    [searched] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (r: T) => p.sortValue?.(r, sort.key) ?? text(r, sort.key).toLowerCase();
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [filtered, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const bar = useViewBar();
  const g = useGrouping<T, K>({
    dimensions: p.groupDims,
    rows: sorted,
    rowId: p.rowId,
    hiddenColumns: hidden,
    page,
    pageSize,
  });
  /* WIDEST RENDERED CELL (UX-45) — the rows on this page, not the whole
     list: one long name three pages away no longer widens every page. */
  const columns = React.useMemo(() => fitColumns(p.columns, g.visibleRows, p.lines, p.pillColumns ?? []), [g.visibleRows, textSize]); // eslint-disable-line react-hooks/exhaustive-deps
  const onSort = (key: K) => {
    setSort((prev) => (prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null));
    setPage(1);
  };

  /* THE BANNER — records still waiting to be configured (production's
     "Reminder: … still pending"). View details filters to them. */
  /* A BULK RULE'S RUN COMES FIRST (Yash, 2026-11-26) — most serious first
     (UX-139): while it runs, pricing here is locked. */
  const alerts: BannerAlert[] = [
    ...(p.leadAlerts ?? []).filter((a) => !dismissed.has(a.id)),
    ...(p.unconfigured.count && !alertDismissed
      ? [
          {
            id: "unconfigured",
            status: "caution" as const,
            tag: "Unconfigured",
            title: p.unconfigured.title,
            count: p.unconfigured.count,
            onApply: () => {
              setFacetSel(new Set([p.unconfigured.facet]));
              setAlertApplied(true);
              setPage(1);
            },
          },
        ]
      : ([] as BannerAlert[])),
  ];
  const alertVisible = alerts.length > 0 && Date.now() >= snoozedUntil;
  useTopBanner(alertVisible);

  const filtersControl = (fullWidth?: boolean) => (
    <ListFilters
      facets={facets}
      value={facetSel}
      countFor={(sel) => narrowFacets(sel).length}
      onApply={(sel) => {
        setFacetSel(sel);
        setAlertApplied(false);
        setPage(1);
      }}
      fullWidth={fullWidth}
    />
  );
  const dropFacets = (gone: string[]) => {
    const next = new Set(facetSel);
    gone.forEach((id) => next.delete(id));
    setFacetSel(next);
    setPage(1);
  };
  const exportFilters: ExportFilterRow[] = [
    { key: "search", label: "Search", values: search.trim() ? [{ value: search.trim(), onRemove: () => setSearch("") }] : [] },
    ...facets.map((f) => {
      const mine = [...facetSel].filter((id) => id.startsWith(`${f.key}:`));
      return { key: f.key, label: f.label, values: mine.map((id) => ({ value: id.slice(id.indexOf(":") + 1), onRemove: () => dropFacets([id]) })), onRemoveAll: () => dropFacets(mine) };
    }),
  ];

  const narrowed = q !== "" || cq !== "" || facetSel.size > 0 || activeColFilters.length > 0;
  const fold = useHeadFold();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {alertVisible && (
        <AlertBanner
          className={topBannerClass(fold.collapsed)}
          alerts={alerts}
          appliedId={alertApplied ? "unconfigured" : null}
          onClearApplied={() => {
            setFacetSel(new Set());
            setAlertApplied(false);
            setPage(1);
          }}
          onSnooze={(_id, ms) => setSnoozedUntil(Date.now() + ms)}
          onDismiss={(id) => setDismissed((d) => new Set(d).add(id))}
        />
      )}
      <HeadFold collapsed={fold.collapsed}>
        <FuelOrdersViewBar {...savedViews} {...displayViewsFor({ board: false, map: false }, view, setView)} onExport={() => setExporting(true)} />
      </HeadFold>

      <div className={fold.gap}>
        <ListToolbar
          viewSwitch={false}
          headCollapse={fold.headCollapse}
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one={p.one} many={p.noun} />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder={p.searchPlaceholder}
          filters={filtersControl()}
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
          columns={toggle}
          hiddenColumns={hidden}
          columnOrder={columnOrder}
          onReorderColumns={setColumnOrder}
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k as K)) next.delete(k as K);
              else next.add(k as K);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          searchFields={toggle}
          colScope={colScope}
          onColScopeChange={(v) => {
            setColScope(v);
            setPage(1);
          }}
          colQuery={colQuery}
          onColQueryChange={(v) => {
            setColQuery(v);
            setPage(1);
          }}
          columnFiltersOpen={view === "table" && colFiltersOpen}
          settings
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
        />
        <FilterChips
          facets={facets}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setAlertApplied(false);
            setPage(1);
          }}
        >
          <ColumnSearchChip
            className={facetSel.size > 0 ? "" : undefined}
            searchFields={toggle}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => {
              setColQuery("");
              setPage(1);
            }}
          />
        </FilterChips>
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{`No matching ${p.noun}`}</EmptyTitle>
                <EmptyDescription>{`${plural(p.rows.length, p.one, p.noun)} in all. Clear the search or a filter to see them.`}</EmptyDescription>
              </EmptyHeader>
              {narrowed && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setColQuery("");
                      setColFilters({});
                      setFacetSel(new Set());
                      setAlertApplied(false);
                      setPage(1);
                    }}
                  >
                    Clear all
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <ListTable
              topBar={bar.slot}
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun={p.one}
              columns={columns}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={p.rowId}
              renderCell={p.renderCell}
              actionsKey={"actions" as K}
              rowMenu={(r) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.nameOf(r)}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem onSelect={() => p.onOpen(r)}>
                      {p.configured(r) ? <Pencil /> : <SlidersHorizontal />}
                      {p.configured(r) ? "Edit pricing" : "Configure pricing"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => p.onHistory(r)}>
                      <History />
                      History
                    </DropdownMenuItem>
                    {p.menuExtra?.(r)}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open the pricing of ${p.nameOf(r)}`}
              onOpenRow={p.onOpen}
              showColumnFilters={colFiltersOpen}
              onToggleColumnFilters={() =>
                setColFiltersOpen((open) => {
                  if (open) {
                    setColFilters({});
                    setPage(1);
                  }
                  return !open;
                })
              }
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title={`Export ${p.noun}`}
        noun={p.noun}
        nounOne={p.one}
        count={sorted.length}
        filtersControl={filtersControl(true)}
        summary={p.exportSummary(sorted)}
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(`Exporting ${plural(sorted.length, p.one, p.noun)} as .${format}`);
        }}
      />

      <div className="mt-4 shrink-0">
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun={p.one}
            overCounts={g.groups.overCounts}
            allCollapsed={g.allCollapsed}
            onExpandAll={g.expandAll}
            onCollapseAll={g.collapseAll}
          />
        ) : (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
