import * as React from "react";
import { toast } from "sonner";
import { Database, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { FuelOrdersViewBar } from "./FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "./ListToolbar";
import { ListFilters, type ListFacet } from "./ListFilters";
import { ExportSheet, type ExportFilterRow } from "./ExportSheet";
import { ListTable, OverflowList, TwoLineCell } from "./ListTable";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { ASSET_GROUP_DIMS } from "./groupDims";
import { AssetSheet, type AssetDraft } from "./AssetSheet";
import { useSavedViews } from "./useSavedViews";
import { DATE_FMT, dateKeyOf, startOfDay } from "./data";
import {
  ASSETS,
  ASSET_COLUMNS,
  ASSET_LOS,
  ASSET_SEARCH_FIELDS,
  ASSET_STATUSES,
  ASSET_STATUS_TONE,
  HUBS,
  PRODUCT_COMPATIBILITY,
  matchesAsset,
  matchesAssetIn,
  sortAssets,
  type Asset,
  type AssetColumnKey,
  type AssetTableSortState,
} from "./assets";

/**
 * Assets list — the fourth and last rail destination, on the same shell as the
 * other three.
 *
 * NOT DATE-SCOPED. `Created On` is a record date, not an operational one, so
 * scoping the list to one day would show almost nothing. Same call as Customers,
 * and the reason `ListToolbar` takes the scope control as an option.
 *
 * TEN COLUMNS, the widest list here — the Display Name and Unique ID share one
 * two-line cell (the pair was specified as "unique ID right under display
 * name"), and Tank Monitor does the same with its ID so "Yes" is never shown
 * without saying which monitor. Product Compatibility uses the `+N` overflow.
 *
 * No bulk-action bar, for the same reason as the other two new screens: the verb
 * set was not specified.
 */
const TOGGLE_COLUMNS = ASSET_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

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
  /** The filter row's boxes, by column key. Optional so a view saved before
   *  the row still applies. */
  colFilters?: Record<string, string>;
  /* ORDER AND WIDTHS (Pavan, 2026-10-07) — what 3PL's views keep. Optional so
     a view saved before them still applies. */
  /** Column order as keys. Empty means "as declared". */
  columnOrder?: string[];
  /** Reader-set column widths in px, by key. Empty means "as declared". */
  columnWidths?: Record<string, number>;
  /* FACETS (Pavan, 2026-10-07). Optional so a view saved before them applies. */
  facets?: string[];
}

/* FILTERS APPLY (Pavan, 2026-10-07). The panel used to tick and do nothing;
   now it stages, applies and shows chips — 3PL's and Quotes'. */
const ASSET_FACETS: ListFacet[] = [
  { key: "status", label: "Status", options: [...ASSET_STATUSES] },
  { key: "los", label: "LOS", options: ASSET_LOS },
  { key: "hub", label: "Hub", options: HUBS, searchable: true },
  {
    key: "products",
    label: "Product Compatibility",
    options: PRODUCT_COMPATIBILITY,
    searchable: true,
  },
  { key: "monitor", label: "Tank Monitor", options: ["Yes", "No"] },
];

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    mode: s.mode ?? "table",
    hidden: [...s.hidden].sort(),
    facets: [...(s.facets ?? [])].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters ?? {}).filter(([, v]) => v.trim() !== "").sort(([a], [b]) => a.localeCompare(b))
    ),
  });

/**
 * WHAT EACH COLUMN PRINTS, as text a header box can match — the same rule as
 * `brokerColumnText` in 3PL: a box under a header matches what is written
 * above the rows beneath it. Products match every one, not only the first the
 * cell shows — the rest are one hover away behind its `+N`.
 */
function assetColumnText(a: Asset, key: AssetColumnKey): string {
  switch (key) {
    case "asset":
      return `${a.displayName} ${a.uniqueId}`;
    case "erpId":
      return a.erpId;
    case "hub":
      return a.hub;
    case "los":
      return a.los;
    case "products":
      return a.products.join(" ");
    case "capacity":
      return `${a.capacityGal.toLocaleString()} gal`;
    case "monitor":
      return a.tankMonitor ? `Yes ${a.tankMonitorId}` : "No";
    case "createdOn":
      return a.createdOn;
    case "status":
      return a.status;
    default:
      return "";
  }
}

export function AssetsScreen({ focus }: { focus?: { id: string; n: number } | null } = {}) {
  const [rows, setRows] = React.useState<Asset[]>(ASSETS);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<AssetTableSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<AssetColumnKey>>(new Set());
  const [colScope, setColScope] = React.useState("asset");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /* Empty = the table's declared order; the table fills in anything a saved
     order does not mention, so a stale view never costs a column. */
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  /* EXPORT ASKS FIRST (G10, Pavan, 2026-10-07) — 3PL's ExportSheet. */
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
  const defaultState: ViewState = React.useMemo(
    () => ({
    mode: "table",
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      colScope: "asset",
      colQuery: "",
      colFilters: {},
      columnOrder: [],
      columnWidths: {},
      facets: [],
    }),
    []
  );

  const applyState = (s: ViewState) => {

    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(
      s.sortKey && s.sortDir
        ? { key: s.sortKey as AssetColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as AssetColumnKey[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setFacetSel(new Set(s.facets ?? []));
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: "sales-assets" });

  // A global-search hit lands here: open that asset's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      rows.filter(
        (a) =>
          (!q || matchesAsset(a, q)) && (!cq || matchesAssetIn(a, cq, colScope)) &&
          /* AND-ed, and each box matches the text its own column PRINTS —
             see `assetColumnText`. */
          activeColFilters.every(([key, value]) =>
            assetColumnText(a, key as AssetColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [rows, q, cq, colScope, activeColFilters]
  );
  /* Facets AND across, OR within one. Product Compatibility passes when the
     asset holds any ticked product. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const on = (facet: string) => [...sel].some((id) => id.startsWith(`${facet}:`));
      const pass = (facet: string, value: string) => !on(facet) || sel.has(`${facet}:${value}`);
      return searched.filter(
        (a) =>
          pass("status", a.status) &&
          pass("los", a.los) &&
          pass("hub", a.hub) &&
          (!on("products") || a.products.some((p) => sel.has(`products:${p}`))) &&
          pass("monitor", a.tankMonitor ? "Yes" : "No")
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
  const sorted = React.useMemo(() => sortAssets(filtered, sort), [filtered, sort]);
  /* Grouping. The hook owns the dimension stack and the collapsed set, and
     suspends pagination while grouped — a group cannot straddle a page
     boundary and still have an honest header. */
  const g = useGrouping<(typeof sorted)[number], AssetColumnKey>({
    dimensions: ASSET_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r) => r.id, []),
    measureOf: React.useCallback((r: (typeof sorted)[number]) => r.capacityGal, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  const onSort = (key: AssetColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const saveAsset = (asset: Asset, draft: AssetDraft) =>
    setRows((prev) =>
      prev.map((a) => (a.id !== asset.id ? a : { ...a, ...draft }))
    );

  /** Created On is stamped here — it is the date of record, so it is set once,
   *  at creation, and never offered as a field. */
  const createAsset = (draft: AssetDraft) => {
    const now = startOfDay(new Date());
    setRows((prev) => [
      {
        id: `as-new-${prev.length + 1}`,
        ...draft,
        createdOn: DATE_FMT.format(now),
        createdOnKey: dateKeyOf(now),
      },
      ...prev,
    ]);
    setPage(1);
  };

  const renderCell = (a: Asset, key: AssetColumnKey) => {
    switch (key) {
      case "asset":
        return <TwoLineCell title={a.displayName} description={a.uniqueId} />;
      // Em-dash fallbacks so a record created without these reads as "empty"
      // rather than as a blank cell — and so LOS never renders an empty pill.
      case "erpId":
        return (
          <span className="truncate text-sm tabular-nums text-muted-foreground">
            {a.erpId || "—"}
          </span>
        );
      case "hub":
        return (
          <span className="truncate text-sm text-foreground">{a.hub || "—"}</span>
        );
      case "los":
        return a.los ? (
          <Pill>{a.los}</Pill>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "products":
        return <OverflowList values={a.products} label="products" />;
      case "capacity":
        return (
          <span className="text-sm tabular-nums text-foreground">
            <span className="font-medium">{a.capacityGal.toLocaleString()}</span>{" "}
            <span className="text-xs text-muted-foreground">gal</span>
          </span>
        );
      case "monitor":
        // "Yes" alone would leave the operator asking which monitor, so the id
        // rides underneath it. "No" has nothing to qualify.
        return a.tankMonitor ? (
          <TwoLineCell title="Yes" description={a.tankMonitorId} />
        ) : (
          <span className="text-sm text-muted-foreground">No</span>
        );
      case "createdOn":
        return <span className="truncate text-sm text-foreground">{a.createdOn}</span>;
      case "status":
        return (
          <StatusChip tone={ASSET_STATUS_TONE[a.status]} variant="text">
            {a.status}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  /* EVERY NARROWING THAT IS ON, for the export sheet to list — each drops
     what the shelf's own chip drops (3PL's, 2026-10-07). */
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
      values: search.trim()
        ? [{ value: search.trim(), onRemove: () => { setSearch(""); setPage(1); } }]
        : [],
    },
    {
      key: "colSearch",
      label: ASSET_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: ASSET_COLUMNS.find((c) => c.key === key)?.label ?? key,
      values: [
        {
          value: value.trim(),
          onRemove: () => {
            setColFilters((prev) => ({ ...prev, [key]: "" }));
            setPage(1);
          },
        },
      ],
    })),
    ...ASSET_FACETS.map((f) => {
      const mine = [...facetSel].filter((id) => id.startsWith(`${f.key}:`));
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({
          value: id.slice(id.indexOf(":") + 1),
          onRemove: () => dropFacets([id]),
        })),
        onRemoveAll: () => dropFacets(mine),
      };
    }),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create New Asset"
        onCreateOrder={() => setCreating(true)}
        onExport={() => setExporting(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one="asset" many="assets" />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search assets, IDs, hubs…"
          filters={
            <ListFilters
              facets={ASSET_FACETS}
              value={facetSel}
              countFor={(sel) => narrowFacets(sel).length}
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
            />
          }
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
          columns={TOGGLE_COLUMNS}
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
          searchFields={ASSET_SEARCH_FIELDS}
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
          /* THE ROW, NOT THE POPOVER — the 3PL behaviour. Table view only. */
          columnFiltersOpen={view === "table" && colFiltersOpen}
          onToggleColumnFilters={
            view !== "table"
              ? undefined
              : () =>
                  setColFiltersOpen((open) => {
                    /* Closing the row clears it: a narrowing with no boxes on
                       screen would be one nobody could see. */
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
        />
        {/* ONE SHELF for the facets and the column search — 3PL's. */}
        <FilterChips
          facets={ASSET_FACETS}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        >
          <ColumnSearchChip
            /* ALONE ON THE SHELF it keeps its own top margin (Pavan, 2026-10-07). */
            className={facetSel.size > 0 ? "" : undefined}
            searchFields={ASSET_SEARCH_FIELDS}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => {
              setColQuery("");
              setPage(1);
            }}
          />
        </FilterChips>
        {/* One chip per header box that has something typed in it. */}
        {activeColFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeColFilters.map(([key, value]) => (
              <ColumnSearchChip
                key={key}
                className=""
                searchFields={TOGGLE_COLUMNS}
                colScope={key}
                colQuery={value.trim()}
                onClear={() => {
                  setColFilters((prev) => ({ ...prev, [key]: "" }));
                  setPage(1);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {/* THE ROW STAYS WHILE IT IS OPEN. An empty result swaps the table
              for the empty state, which would take the boxes with it — the
              reader would lose the thing they were typing in. */}
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {q ? <SearchX /> : <Database />}
                </EmptyMedia>
                <EmptyTitle>
                  {q ? "No matching assets" : "No assets yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No assets match “${search.trim()}”.`
                    : "Create the first asset to get started."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (q) setSearch("");
                    else setCreating(true);
                    setPage(1);
                  }}
                >
                  {q ? "Clear search" : "Create New Asset"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ListTable
              topBar={bar.slot}
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="asset"
              groupUnit="gal"
              columns={ASSET_COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(a) => a.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(a) => `Open asset ${a.displayName}`}
              onOpenRow={(a) => setOpenId(a.id)}
              showColumnFilters={colFiltersOpen}
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* EXPORT ASKS BEFORE IT ACTS (G10, Pavan, 2026-10-07). What leaves is
          the whole narrowed set, not the page. */}
      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Assets"
        noun="assets"
        nounOne="asset"
        count={sorted.length}
        filtersControl={
          <ListFilters
            facets={ASSET_FACETS}
            value={facetSel}
            countFor={(sel) => narrowFacets(sel).length}
            onApply={(sel) => {
              setFacetSel(sel);
              setPage(1);
            }}
            fullWidth
          />
        }
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? "asset" : "assets"} as .${format}`);
        }}
      />

      <AssetSheet
        asset={rows.find((a) => a.id === openId) ?? null}
        mode={creating ? "create" : "edit"}
        open={creating || openId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setOpenId(null);
        }}
        onSave={saveAsset}
        onCreate={createAsset}
      />

      <div className={cn("mt-4 shrink-0", view === "board" && "hidden")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="asset"
            total={g.total}
            unit="gal"
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
