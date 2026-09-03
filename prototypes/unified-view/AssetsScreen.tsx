import * as React from "react";
import { Database, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { ListToolbar, ColumnSearchChip, type ListView } from "./ListToolbar";
import { ListFilters } from "./ListFilters";
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
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({ ...s, hidden: [...s.hidden].sort() });

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

  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    colScope,
    colQuery,
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      colScope: "asset",
      colQuery: "",
    }),
    []
  );

  const applyState = (s: ViewState) => {
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
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  // A global-search hit lands here: open that asset's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      rows.filter(
        (a) =>
          (!q || matchesAsset(a, q)) && (!cq || matchesAssetIn(a, cq, colScope))
      ),
    [rows, q, cq, colScope]
  );
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
          <Badge variant="secondary">{a.los}</Badge>
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create New Asset"
        onCreateOrder={() => setCreating(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search assets, IDs, hubs…"
          filters={
            <ListFilters
              facets={[
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
              ]}
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
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          onHideAllColumns={() => setHidden(new Set(TOGGLE_COLUMNS.map((c) => c.key)))}
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
          view={view}
          onViewChange={setView}
        />
        <ColumnSearchChip
          searchFields={ASSET_SEARCH_FIELDS}
          colScope={colScope}
          colQuery={colQuery}
          onClear={() => {
            setColQuery("");
            setPage(1);
          }}
        />
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 ? (
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
              openLabel={(a) => `Open asset ${a.displayName}`}
              onOpenRow={(a) => setOpenId(a.id)}
            />
          )}
        </div>
      </div>

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
