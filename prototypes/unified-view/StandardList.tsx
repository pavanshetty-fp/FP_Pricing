import * as React from "react";
import { toast } from "sonner";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { FuelOrdersViewBar } from "./FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "./ListToolbar";
import { ListFilters, type ListFacet } from "./ListFilters";
import { ExportSheet, type ExportFilterRow } from "./ExportSheet";
import { ListTable, type ListColumn, type ListSort } from "./ListTable";
import { useSavedViews } from "./useSavedViews";

/*
  THE STANDARD LIST — the Unified View list (Quotes / Orders) as one piece,
  so every table page has the same parts in the same places (the Customer
  Portal's lists, Service Work's reference pages — Pavan, 2026-10-22): the
  view row with saved views, a segment and the CTA; the toolbar with search,
  Filters, search by column and the column menu; the chip shelf; the table;
  pagination; export that asks first. One view (a table), so no view switch.

  A screen hands it its rows, columns, what each column prints, its facets,
  and what Create and opening a row do.
*/

interface ViewState {
  /** THE DISPLAY IT OPENS IN — table, board or map (Pavan, 2026-10-21). */
  mode?: ListView;
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
  colFilters: Record<string, string>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  facets: string[];
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    mode: s.mode ?? "table",
    hidden: [...s.hidden].sort(),
    facets: [...s.facets].sort(),
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters)
        .filter(([, v]) => v.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  });

export interface StandardListProps<R, K extends string> {
  rows: R[];
  /** Must include the pinned `actions` column. */
  columns: ListColumn<K>[];
  defaultHidden?: K[];
  rowId: (r: R) => string;
  /** What a column PRINTS — searched, filtered by the header boxes, sorted. */
  text: (r: R, key: K) => string;
  /** A sort that is not the printed text — numbers, lifecycle position. */
  sortValue?: (r: R, key: K) => string | number | undefined;
  renderCell: (r: R, key: K) => React.ReactNode;
  facets: ListFacet[];
  /** The values a row has for a facet — several for a many-valued field. */
  facetValues: (r: R, facet: string) => string[];
  storageKey: string;
  noun: string;
  nounOne: string;
  searchPlaceholder: string;
  /** Omit both for a list the customer does not create in (Invoices). */
  ctaLabel?: string;
  onCreate?: () => void;
  /** Above the view row — a page's overview cards (Orders' layout). */
  above?: React.ReactNode;
  /** The alert banner — under the toolbar, as in every module (2026-10-25). */
  banner?: React.ReactNode;
  /**
   * Sets the facet filter from outside — a banner title applies its filter.
   * Ids are `facet:value`; `n` changes on every press.
   */
  applyFacets?: { ids: string[]; n: number };
  /** Reports the facet filter as it changes — a banner knows its filter is on. */
  onFacetsChange?: (ids: string[]) => void;
  /** Omit for a list whose rows open nothing (yet). */
  onOpen?: (r: R) => void;
  openLabel: (r: R) => string;
  emptyIcon: React.ReactNode;
  /** Beside the Filters button — e.g. Recommendations (3PL's place for it). */
  afterFilters?: React.ReactNode;
  segments?: { key: string; label: string }[];
  segmentValue?: string;
  onSegmentChange?: (key: string) => void;
}

export function StandardList<R, K extends string>({
  rows,
  columns,
  defaultHidden = [],
  rowId,
  text,
  sortValue,
  renderCell,
  facets,
  facetValues,
  storageKey,
  noun,
  nounOne,
  searchPlaceholder,
  ctaLabel,
  onCreate,
  above,
  banner,
  applyFacets,
  onFacetsChange,
  onOpen,
  openLabel,
  emptyIcon,
  segments,
  segmentValue,
  onSegmentChange,
  afterFilters,
}: StandardListProps<R, K>) {
  const labelled = columns.filter((c) => c.label);
  const firstKey = labelled[0]?.key ?? "";
  const toggleColumns = labelled.map((c) => ({ key: c.key, label: c.label }));
  const defaults: ViewState = {
    mode: "table",
    search: "",
    sortKey: null,
    sortDir: null,
    hidden: defaultHidden,
    pageSize: 25,
    colScope: firstKey,
    colQuery: "",
    colFilters: {},
    columnOrder: [],
    columnWidths: {},
    facets: [],
  };
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<ListSort<K> | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<K>>(() => new Set(defaultHidden));
  const [colScope, setColScope] = React.useState<string>(firstKey);
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  React.useEffect(() => {
    if (!applyFacets) return;
    setFacetSel(new Set(applyFacets.ids));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyFacets?.n]);
  React.useEffect(() => {
    onFacetsChange?.([...facetSel]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetSel]);
  const [exporting, setExporting] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );

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
  const applyState = (s: ViewState) => {
    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as K, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as K[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setColFilters(s.colFilters);
    setColFiltersOpen(Object.values(s.colFilters).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder);
    setColumnWidths(s.columnWidths);
    setFacetSel(new Set(s.facets));
    setPage(1);
  };
  const savedViews = useSavedViews({ current, defaultState: defaults, keyOf, apply: applyState, storageKey });

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (!q || labelled.some((c) => text(r, c.key).toLowerCase().includes(q))) &&
          (!cq || text(r, colScope as K).toLowerCase().includes(cq)) &&
          activeColFilters.every(([key, value]) =>
            text(r, key as K).toLowerCase().includes(value.trim().toLowerCase())
          )
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, q, cq, colScope, activeColFilters, text]
  );
  /* Facets AND across, OR within one. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      return searched.filter((r) =>
        facets.every((f) => {
          const mine = [...sel].filter((id) => id.startsWith(`${f.key}:`));
          return mine.length === 0 || facetValues(r, f.key).some((v) => sel.has(`${f.key}:${v}`));
        })
      );
    },
    [searched, facets, facetValues]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (r: R) => sortValue?.(r, sort.key) ?? text(r, sort.key).toLowerCase();
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [filtered, sort, sortValue, text]);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const onSort = (key: K) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const narrowed = q !== "" || cq !== "" || facetSel.size > 0 || activeColFilters.length > 0;
  const nothing = sorted.length === 0 && !colFiltersOpen;
  const dropFacets = (gone: string[]) => {
    const next = new Set(facetSel);
    for (const id of gone) next.delete(id);
    setFacetSel(next);
    setPage(1);
  };
  const exportFilters: ExportFilterRow[] = [
    {
      key: "search",
      label: "Search",
      values: search.trim() ? [{ value: search.trim(), onRemove: () => setSearch("") }] : [],
    },
    {
      key: "colSearch",
      label: toggleColumns.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim() ? [{ value: colQuery.trim(), onRemove: () => setColQuery("") }] : [],
    },
    ...facets.map((f) => {
      const mine = [...facetSel].filter((id) => id.startsWith(`${f.key}:`));
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({ value: id.slice(id.indexOf(":") + 1), onRemove: () => dropFacets([id]) })),
        onRemoveAll: () => dropFacets(mine),
      };
    }),
  ];

  const filtersControl = (full?: boolean) => (
    <ListFilters
      facets={facets}
      value={facetSel}
      countFor={(sel) => narrowFacets(sel).length}
      onApply={(sel) => {
        setFacetSel(sel);
        setPage(1);
      }}
      fullWidth={full}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {above && <div className="mb-8 shrink-0">{above}</div>}
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel={ctaLabel}
        onCreateOrder={onCreate}
        onExport={() => setExporting(true)}
        segments={segments}
        segmentValue={segmentValue}
        onSegmentChange={onSegmentChange}
      />

      {/* THE BANNER SITS ABOVE SEARCH AND FILTERS (Pavan, 2026-11-02 — was
          under them; it cut across the line joining the table to its tools).
          Every module: what needs attention, then the tools, then the list. */}
      {banner && <div className="mt-4 shrink-0">{banner}</div>}
      <div className="mt-4 shrink-0">
        <ListToolbar
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one={nounOne} many={noun} />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder={searchPlaceholder}
          filters={filtersControl()}
          afterFilters={afterFilters}
          columns={toggleColumns}
          hiddenColumns={hidden}
          columnOrder={columnOrder}
          onReorderColumns={setColumnOrder}
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          searchFields={toggleColumns}
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
          columnFiltersOpen={colFiltersOpen}
          onToggleColumnFilters={() =>
            setColFiltersOpen((open) => {
              if (open) {
                setColFilters({});
                setPage(1);
              }
              return !open;
            })
          }
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
          showGroupBy={false}
        />
        <FilterChips
          facets={facets}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        >
          <ColumnSearchChip
            className={facetSel.size > 0 ? "" : undefined}
            searchFields={toggleColumns}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => setColQuery("")}
          />
        </FilterChips>
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        {nothing ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">{narrowed ? <SearchX /> : emptyIcon}</EmptyMedia>
              <EmptyTitle>{narrowed ? `No matching ${noun}` : `No ${noun} yet`}</EmptyTitle>
              {narrowed && (
                <EmptyDescription>{`${rows.length} ${noun} in all. Clear the search or a filter to see them.`}</EmptyDescription>
              )}
            </EmptyHeader>
            {(narrowed || ctaLabel) && <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (narrowed) {
                    setSearch("");
                    setColQuery("");
                    setColFilters({});
                    setFacetSel(new Set());
                  } else onCreate?.();
                  setPage(1);
                }}
              >
                {narrowed ? "Clear all" : ctaLabel}
              </Button>
            </EmptyContent>}
          </Empty>
        ) : (
          <ListTable
            topBar={bar.slot}
            rows={pageRows}
            columns={columns}
            hidden={hidden}
            sort={sort}
            onSort={onSort}
            rowId={rowId}
            renderCell={renderCell}
            actionsKey={"actions" as K}
            columnOrder={columnOrder}
            onReorderColumns={setColumnOrder}
            columnWidths={columnWidths}
            onResizeColumns={setColumnWidths}
            openLabel={openLabel}
            onOpenRow={onOpen}
            showColumnFilters={colFiltersOpen}
            columnFilters={colFilters}
            onColumnFilterChange={(key, value) => {
              setColFilters((prev) => ({ ...prev, [key]: value }));
              setPage(1);
            }}
          />
        )}
      </div>

      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title={`Export ${noun[0].toUpperCase()}${noun.slice(1)}`}
        noun={noun}
        nounOne={nounOne}
        count={sorted.length}
        filtersControl={filtersControl(true)}
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? nounOne : noun} as .${format}`);
        }}
      />

      <div className="mt-4 shrink-0">
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
      </div>
    </div>
  );
}
