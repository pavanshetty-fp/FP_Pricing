import * as React from "react";
import { CalendarOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { ListTable, TwoLineCell } from "./ListTable";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { ASSET_ORDER_GROUP_DIMS } from "./groupDims";
import { AssetOrderSheet, type AssetOrderDraft } from "./AssetOrderSheet";
import { useSavedViews } from "./useSavedViews";
import { DATE_FMT, dateKeyOf, formatFullDate, relativeLabel, startOfDay } from "./data";
import {
  ASSET_ORDERS,
  ASSET_ORDER_COLUMNS,
  ASSET_ORDER_SEARCH_FIELDS,
  ASSET_ORDER_STATUSES,
  ASSET_TYPES,
  SALES_REPS,
  matchesAssetOrder,
  matchesAssetOrderIn,
  sortAssetOrders,
  type AssetOrder,
  type AssetOrderColumnKey,
  type AssetSortState,
  ASSET_ORDER_STATUS_TONE,
} from "./assetOrders";
import { useLoggedRows } from "./activity";
import { diffAssetOrder } from "./salesActivity";

/**
 * Asset Orders list — the same shell as Fuel Orders: preset-view row with the
 * CTA and Export, the action bar, the table, pagination.
 *
 * DATE-SCOPED, like Fuel Orders: every row carries a delivery date, so the
 * toolbar keeps the date stepper and the list shows one day at a time.
 *
 * NO BULK-ACTION BAR, and no row checkboxes with it. Fuel Orders' bar exists
 * because a dispatcher edits five specific fields across many orders; which
 * fields an asset order needs edited in bulk was not specified, and inventing a
 * verb set is exactly the kind of guess worth not making. The column set, the
 * sheet and everything else is here — say the word and the bar is a small
 * addition on top of the same `BulkEditDialog` the fuel screen already uses.
 */
const STATUS_TONE = ASSET_ORDER_STATUS_TONE;

const TOGGLE_COLUMNS = ASSET_ORDER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  dateKey: string;
  colScope: string;
  colQuery: string;
  /** The filter row's boxes, by column key. Optional so a view saved before
   *  the row still applies. */
  colFilters?: Record<string, string>;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    hidden: [...s.hidden].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters ?? {}).filter(([, v]) => v.trim() !== "").sort(([a], [b]) => a.localeCompare(b))
    ),
  });

/**
 * WHAT EACH COLUMN PRINTS, as text a header box can match — the same rule as
 * `brokerColumnText` in 3PL: a box under a header matches what is written
 * above the rows beneath it, never a field the cell does not show.
 */
function assetOrderColumnText(r: AssetOrder, key: AssetOrderColumnKey): string {
  switch (key) {
    case "order":
      return r.orderNo;
    case "customer":
      return `${r.customer.title} ${r.customer.description ?? ""}`;
    case "salesRep":
      return r.salesRep;
    case "date":
      return `${r.date.title} ${r.date.description ?? ""}`;
    case "status":
      return r.status;
    default:
      return "";
  }
}

export function AssetOrdersScreen({ focus }: { focus?: { id: string; n: number } | null } = {}) {
  /* THE SETTER WRITES THE CHANGE LOG (sales, 2026-09-23) — see activity.tsx. */
  const [rows, setRows] = useLoggedRows<AssetOrder>(ASSET_ORDERS, diffAssetOrder);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<AssetSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<AssetOrderColumnKey>>(new Set());
  const [date, setDate] = React.useState(() => startOfDay(new Date()));
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );

  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    dateKey: dateKeyOf(date),
    colScope,
    colQuery,
    colFilters,
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      dateKey: dateKeyOf(startOfDay(new Date())),
      colScope: "customer",
      colQuery: "",
      colFilters: {},
    }),
    []
  );

  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(
      s.sortKey && s.sortDir
        ? { key: s.sortKey as AssetOrderColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as AssetOrderColumnKey[]));
    setPageSize(s.pageSize);
    const [y, m, d] = s.dateKey.split("-").map(Number);
    setDate(new Date(y, m - 1, d));
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  // A global-search hit lands here: open that asset order's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const onDate = React.useMemo(
    () => rows.filter((r) => r.dateKey === dateKeyOf(date)),
    [rows, date]
  );
  const filtered = React.useMemo(
    () =>
      onDate.filter(
        (r) =>
          (!q || matchesAssetOrder(r, q)) &&
          (!cq || matchesAssetOrderIn(r, cq, colScope)) &&
          /* AND-ed, and each box matches the text its own column PRINTS —
             see `assetOrderColumnText`. */
          activeColFilters.every(([key, value]) =>
            assetOrderColumnText(r, key as AssetOrderColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [onDate, q, cq, colScope, activeColFilters]
  );
  const sorted = React.useMemo(() => sortAssetOrders(filtered, sort), [filtered, sort]);
  /* Grouping. The hook owns the dimension stack and the collapsed set, and
     suspends pagination while grouped — a group cannot straddle a page
     boundary and still have an honest header. */
  const g = useGrouping<(typeof sorted)[number], AssetOrderColumnKey>({
    dimensions: ASSET_ORDER_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r) => r.id, []),
    measureOf: React.useCallback((r: (typeof sorted)[number]) => r.quantity, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  const onSort = (key: AssetOrderColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const customers = React.useMemo(
    () => Array.from(new Set(ASSET_ORDERS.map((r) => r.customer.title))),
    []
  );
  const shipTos = React.useMemo(
    () => Array.from(new Set(ASSET_ORDERS.map((r) => r.shipTo))),
    []
  );

  const saveOrder = (order: AssetOrder, draft: AssetOrderDraft) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== order.id
          ? r
          : {
              ...r,
              customer: { title: draft.customer, description: draft.erpId },
              shipTo: draft.shipTo,
              salesRep: draft.salesRep,
              assetType: draft.assetType,
              quantity: draft.quantity,
              serialNo: draft.serialNo,
              status: draft.status,
              poNumber: draft.poNumber,
              note: draft.note,
              ...(draft.deliveryDate
                ? {
                    date: {
                      title: DATE_FMT.format(draft.deliveryDate),
                      description: relativeLabel(
                        Math.round(
                          (draft.deliveryDate.getTime() -
                            startOfDay(new Date()).getTime()) /
                            86_400_000
                        ),
                        draft.deliveryDate
                      ),
                    },
                    dateKey: dateKeyOf(draft.deliveryDate),
                  }
                : {}),
            }
      )
    );

  /** Order numbers continue the 61xxxxx series in steps of 3, as the seeds do. */
  const createOrder = (draft: AssetOrderDraft) => {
    const when = draft.deliveryDate ?? date;
    const nextNo = Math.max(...rows.map((r) => Number(r.orderNo))) + 3;
    const offset = Math.round(
      (when.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
    );
    setRows((prev) => [
      {
        id: `ao-new-${nextNo}`,
        orderNo: String(nextNo),
        customer: { title: draft.customer, description: draft.erpId },
        salesRep: draft.salesRep,
        date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
        dateKey: dateKeyOf(when),
        status: draft.status,
        assetType: draft.assetType,
        quantity: draft.quantity,
        serialNo: draft.serialNo,
        shipTo: draft.shipTo,
        poNumber: draft.poNumber,
        note: draft.note,
      },
      ...prev,
    ]);
    setPage(1);
  };

  const renderCell = (row: AssetOrder, key: AssetOrderColumnKey) => {
    switch (key) {
      case "order":
        return (
          <span className="truncate text-sm tabular-nums text-foreground">
            {row.orderNo}
          </span>
        );
      case "customer":
        return <TwoLineCell {...row.customer} />;
      case "salesRep":
        return <span className="truncate text-sm text-foreground">{row.salesRep}</span>;
      case "date":
        return <TwoLineCell {...row.date} />;
      case "status":
        return (
          <StatusChip tone={STATUS_TONE[row.status]} variant="text">
            {row.status}
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
        ctaLabel="Create Asset Order"
        onCreateOrder={() => setCreating(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search asset orders, customers, reps…"
          filters={
            <ListFilters
              facets={[
                { key: "status", label: "Status", options: [...ASSET_ORDER_STATUSES] },
                { key: "salesRep", label: "Sales Rep", options: SALES_REPS },
                { key: "customer", label: "Customer", options: customers, searchable: true },
                { key: "assetType", label: "Asset Type", options: ASSET_TYPES, searchable: true },
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
          searchFields={ASSET_ORDER_SEARCH_FIELDS}
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
          dateScope={{
            date,
            onDateChange: (d) => {
              setDate(d);
              setPage(1);
            },
          }}
        />
        <ColumnSearchChip
          searchFields={ASSET_ORDER_SEARCH_FIELDS}
          colScope={colScope}
          colQuery={colQuery}
          onClear={() => {
            setColQuery("");
            setPage(1);
          }}
        />
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
                  {q ? <SearchX /> : <CalendarOff />}
                </EmptyMedia>
                <EmptyTitle>
                  {q ? "No matching asset orders" : "Nothing scheduled"}
                </EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No asset orders on ${formatFullDate(date)} match “${search.trim()}”.`
                    : `No asset orders are scheduled for ${formatFullDate(date)}.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (q) setSearch("");
                    else setDate(startOfDay(new Date()));
                    setPage(1);
                  }}
                >
                  {q ? "Clear search" : "Go to today"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ListTable
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="order"
              groupUnit="units"
              columns={ASSET_ORDER_COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              openLabel={(r) => `Open order ${r.orderNo}`}
              onOpenRow={(r) => setOpenId(r.id)}
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

      <AssetOrderSheet
        order={rows.find((r) => r.id === openId) ?? null}
        mode={creating ? "create" : "edit"}
        open={creating || openId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setOpenId(null);
        }}
        onSave={saveOrder}
        onCreate={createOrder}
        customers={customers}
        shipTos={shipTos}
      />

      <div className={cn("mt-4 shrink-0", view === "board" && "hidden")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="order"
            total={g.total}
            unit="units"
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
