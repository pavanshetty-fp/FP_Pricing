import * as React from "react";
import { toast } from "sonner";
import { CalendarOff, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { AlertBanner, type BannerAlert } from "@/components/ui/alert-banner";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { GroupedListFooter, useGrouping, type GroupDim } from "@/components/tables-layout";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { HeadFold, displayViewsFor, topBannerClass, useHeadFold, useTopBanner } from "../HeadFold";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ExportSheet, type ExportFilterRow, type ExportSummary } from "../ExportSheet";
import { ListTable, TwoLineCell, type ListColumn, type ListSort } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import { kindTone } from "../statusKind";
import { TERM_ICONS } from "@/components/ui/term-icons";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import { DAY, NOW, fmtDate, fmtWhen, plural, uniq } from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { fitColumns } from "./fitColumns";
import { ORDER_STATUS_KIND, buildOrders, money2, money3, orderLabel, type PricedOrder } from "./orderTrace";
import { OrderTraceSheet } from "./OrderTraceSheet";

/*
  CHANGE LOG › ORDER PRICE TRACE (Yash, 2026-11-16) — every delivered and
  invoiced order, and how its price was made. The prototype opened on a search
  box for one order; here it is the List page (as Activity feed): search,
  Filters with Customer · Ship-to · Product first, Group by, the delivery-date
  window, saved views, Export — so "this customer's orders at this ship-to" is
  a filter, and "which orders did a change hit" is the banner. A row opens the
  order's trace in a sheet. Trace only for now; Order Pricing Insights'
  actions (fix missing fees, configure products) are a later phase for the PM.
*/

type Key = "order" | "customer" | "shipto" | "product" | "delivered" | "gallons" | "perGal" | "total" | "after" | "status" | "actions";

const COLUMNS: ListColumn<Key>[] = [
  { key: "order", label: "Order", width: 140, sortable: true },
  { key: "customer", label: "Customer", width: 220, sortable: true },
  { key: "shipto", label: "Ship-to", width: 220, sortable: true },
  { key: "product", label: "Product", width: 180, sortable: true },
  { key: "delivered", label: "Delivered", width: 180, sortable: true },
  { key: "gallons", label: "Gallons", width: 110, sortable: true },
  { key: "perGal", label: "Price ($/gal)", width: 130, sortable: true },
  { key: "total", label: "Total", width: 130, sortable: true },
  { key: "after", label: "Changed after order", width: 170, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "actions", label: "", width: 44 },
];
const TOGGLE = COLUMNS.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label }));

const VALUES: Record<string, (o: PricedOrder) => string[]> = {
  customer: (o) => [orderLabel(o).customer],
  shipto: (o) => [orderLabel(o).shipto],
  product: (o) => [orderLabel(o).product],
  status: (o) => [o.status],
  after: (o) => [o.appliedAfterOrder ? "Yes" : "No"],
  rateType: (o) => [o.rateType],
  market: (o) => [o.market],
};

const GROUP_DIMS: GroupDim<PricedOrder>[] = [
  { key: "customer", label: "Customer", hides: "customer", valuesOf: VALUES.customer },
  { key: "shipto", label: "Ship-to", hides: "shipto", valuesOf: VALUES.shipto },
  { key: "product", label: "Product", hides: "product", valuesOf: VALUES.product },
  { key: "day", label: "Delivery day", valuesOf: (o) => [fmtDate(o.deliveredAt)] },
  { key: "status", label: "Status", hides: "status", order: ["Delivered", "Invoiced"], valuesOf: VALUES.status },
];

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
const keyOf = (s: ViewState) =>
  JSON.stringify({ ...s, mode: s.mode ?? "table", hidden: [...s.hidden].sort(), facets: [...(s.facets ?? [])].sort() });

const lastMonth = (): DateRange => ({ from: startOfDay(new Date(NOW - 29 * DAY)), to: startOfDay(new Date(NOW)) });
const inWindow = (t: number, r: DateRange) => t >= r.from.getTime() && t < r.to.getTime() + DAY;

export function OrderTraceScreen() {
  const log = useChangeLog();
  const orders = React.useMemo(() => buildOrders(log.changes, log.rows, log.entityMap), [log.changes, log.rows, log.entityMap]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<DateRange>(lastMonth);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<ListSort<Key> | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<Key>>(new Set());
  const [colScope, setColScope] = React.useState("order");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = React.useState(false);
  const [alertDismissed, setAlertDismissed] = React.useState(false);
  const [snoozedUntil, setSnoozedUntil] = React.useState(0);
  const [alertApplied, setAlertApplied] = React.useState(false);
  const activeColFilters = React.useMemo(() => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""), [colFilters]);

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
    () => ({ mode: "table", search: "", sortKey: null, sortDir: null, hidden: [], pageSize: 25, colScope: "order", colQuery: "", colFilters: {}, columnOrder: [], columnWidths: {}, facets: [] }),
    []
  );
  const applyState = (s: ViewState) => {
    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as Key, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as Key[]));
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
  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: "pricing-order-trace" });

  /* WHAT EACH COLUMN PRINTS — search, the column boxes and the widths read it. */
  const lines = React.useCallback((o: PricedOrder, key: Key): string[] => {
    const n = orderLabel(o);
    switch (key) {
      case "order":
        return [o.id, o.invoice ?? "Not invoiced"];
      case "customer":
        return [n.customer];
      case "shipto":
        return [n.shipto];
      case "product":
        return [n.product];
      case "delivered":
        return [fmtWhen(o.deliveredAt), `Ordered ${fmtWhen(o.placedAt)}`];
      case "gallons":
        return [`${o.gallons.toLocaleString()} gal`];
      case "perGal":
        return [money3(o.perGal)];
      case "total":
        return [money2(o.total)];
      case "after":
        return [o.appliedAfterOrder ? plural(o.appliedAfterOrder, "change") : "—"];
      case "status":
        return [o.status];
      default:
        return [""];
    }
  }, []);
  const text = (o: PricedOrder, key: Key) => lines(o, key).join(" ");
  const sortValue = (o: PricedOrder, key: Key): string | number =>
    key === "delivered" ? o.deliveredAt : key === "gallons" ? o.gallons : key === "perGal" ? o.perGal : key === "total" ? o.total : key === "after" ? o.appliedAfterOrder : text(o, key).toLowerCase();

  const textSize = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).fontSize;
  const columns = React.useMemo(() => fitColumns(COLUMNS, orders, lines, ["status", "after"]), [orders, lines, textSize]); // eslint-disable-line react-hooks/exhaustive-deps

  /* THE FACETS — Customer · Ship-to · Product first (PRD §6). */
  const facets = React.useMemo<ListFacet[]>(() => {
    const opts = (k: string) => uniq(orders.flatMap(VALUES[k])).sort();
    return [
      { key: "customer", label: "Customer", options: opts("customer"), searchable: true },
      { key: "shipto", label: "Ship-to", options: opts("shipto"), searchable: true },
      { key: "product", label: "Product", options: opts("product"), searchable: true },
      { key: "status", label: "Status", options: ["Delivered", "Invoiced"] },
      { key: "after", label: "Changed after order", options: ["Yes", "No"] },
      { key: "rateType", label: "Rate type", options: opts("rateType") },
      { key: "market", label: "Market", options: opts("market"), searchable: true },
    ];
  }, [orders]);

  const windowed = React.useMemo(() => orders.filter((o) => inWindow(o.deliveredAt, range)), [orders, range]);
  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      windowed.filter(
        (o) =>
          (!q || TOGGLE.some((c) => text(o, c.key).toLowerCase().includes(q))) &&
          (!cq || text(o, colScope as Key).toLowerCase().includes(cq)) &&
          activeColFilters.every(([k, v]) => text(o, k as Key).toLowerCase().includes(v.trim().toLowerCase()))
      ),
    [windowed, q, cq, colScope, activeColFilters] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const by = new Map<string, string[]>();
      for (const id of sel) {
        const i = id.indexOf(":");
        by.set(id.slice(0, i), [...(by.get(id.slice(0, i)) ?? []), id.slice(i + 1)]);
      }
      return searched.filter((o) => [...by].every(([k, vs]) => VALUES[k](o).some((v) => vs.includes(v))));
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [filtered, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const bar = useViewBar();
  const g = useGrouping<PricedOrder, Key>({
    dimensions: GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((o: PricedOrder) => o.id, []),
    measureOf: React.useCallback((o: PricedOrder) => o.gallons, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });
  const onSort = (key: Key) => {
    setSort((prev) => (prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null));
    setPage(1);
  };

  const renderCell = (o: PricedOrder, key: Key) => {
    const l = lines(o, key);
    switch (key) {
      case "order":
      case "delivered":
        return <TwoLineCell title={l[0]} description={l[1]} />;
      case "after":
        return o.appliedAfterOrder ? <Pill kind="caution">{l[0]}</Pill> : "—";
      case "status":
        return (
          <StatusChip tone={kindTone(ORDER_STATUS_KIND[o.status])} variant="text">
            {o.status}
          </StatusChip>
        );
      default:
        return l[0];
    }
  };

  /* THE BANNER — orders a change reached after they were placed. */
  const hit = windowed.filter((o) => o.appliedAfterOrder > 0);
  const alerts: BannerAlert[] =
    hit.length && !alertDismissed
      ? [
          {
            id: "after",
            status: "caution",
            tag: "Changed after order",
            title: `${plural(hit.length, "order")} priced with a change made after the order was placed`,
            count: hit.length,
            onApply: () => {
              setFacetSel(new Set(["after:Yes"]));
              setAlertApplied(true);
              setPage(1);
            },
          },
        ]
      : [];
  const alertVisible = alerts.length > 0 && Date.now() >= snoozedUntil;
  useTopBanner(alertVisible);

  const dateWindow = React.useMemo(() => dateWindowOf(orders.map((o) => dateKeyOf(new Date(o.deliveredAt)))), [orders]);
  const setWindow = (next: DateRange) => {
    setRange(next);
    setPage(1);
  };
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
  const exportSummary: ExportSummary = {
    tilesTitle: "Overview",
    tiles: [
      { label: "Ship-tos", value: uniq(sorted.map((o) => o.shiptoId)).length.toLocaleString(), icon: TERM_ICONS.shipTos },
      { label: "Customers", value: uniq(sorted.map((o) => o.customerId)).length.toLocaleString(), icon: TERM_ICONS.customers },
      { label: "Gallons", value: sorted.reduce((t, o) => t + o.gallons, 0).toLocaleString(), icon: TERM_ICONS.gallons },
    ],
  };

  const narrowed = q !== "" || cq !== "" || facetSel.size > 0 || activeColFilters.length > 0;
  const fold = useHeadFold();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {alertVisible && (
        <AlertBanner
          className={topBannerClass(fold.collapsed)}
          alerts={alerts}
          appliedId={alertApplied ? "after" : null}
          onClearApplied={() => {
            setFacetSel(new Set());
            setAlertApplied(false);
            setPage(1);
          }}
          onSnooze={(_id, ms) => setSnoozedUntil(Date.now() + ms)}
          onDismiss={() => setAlertDismissed(true)}
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
          viewStatement={<ViewStatement count={sorted.length} one="order" many="orders" />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search orders, invoices, customers, ship-tos…"
          filters={filtersControl()}
          dateControl={<DateRangeFilter {...dateWindow} noun="orders" value={range} onChange={setWindow} />}
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
          columns={TOGGLE}
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
          searchFields={TOGGLE}
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
            searchFields={TOGGLE}
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
                <EmptyMedia variant="icon">{narrowed ? <SearchX /> : <CalendarOff />}</EmptyMedia>
                <EmptyTitle>{narrowed ? "No matching orders" : "No orders delivered in these dates"}</EmptyTitle>
                <EmptyDescription>
                  {narrowed ? `${plural(windowed.length, "order")} in these dates. Clear the search or a filter to see them.` : `${plural(orders.length, "order")} in all.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (narrowed) {
                      setSearch("");
                      setColQuery("");
                      setColFilters({});
                      setFacetSel(new Set());
                      setAlertApplied(false);
                    } else if (dateWindow.all) setRange(dateWindow.all);
                    setPage(1);
                  }}
                >
                  {narrowed ? "Clear all" : "Show all dates"}
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
              groupNoun="order"
              groupUnit="gal"
              columns={columns}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(o) => o.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(o) => `Open the price trace of ${o.id}`}
              onOpenRow={(o) => setOpenId(o.id)}
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
        title="Export orders"
        noun="orders"
        nounOne="order"
        count={sorted.length}
        range={{ value: range, onChange: setWindow, ...dateWindow }}
        filtersControl={filtersControl(true)}
        summary={exportSummary}
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(`Exporting ${plural(sorted.length, "order")} as .${format}`);
        }}
      />

      <OrderTraceSheet order={orders.find((o) => o.id === openId) ?? null} onClose={() => setOpenId(null)} />

      <div className="mt-4 shrink-0">
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="order"
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
