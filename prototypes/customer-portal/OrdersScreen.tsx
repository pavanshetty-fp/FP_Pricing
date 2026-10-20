import * as React from "react";
import { toast } from "sonner";
import { ClipboardList, SearchX } from "lucide-react";
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
import { FuelOrdersViewBar } from "../unified-view/FuelOrdersViewBar";
import {
  ListToolbar,
  ColumnSearchChip,
  FilterChips,
  type ListView,
} from "../unified-view/ListToolbar";
import { ListFilters, type ListFacet } from "../unified-view/ListFilters";
import { ExportSheet, type ExportFilterRow } from "../unified-view/ExportSheet";
import { ListTable, TwoLineCell } from "../unified-view/ListTable";
import { OrderMapView, type MapOrder } from "../unified-view/OrderMapView";
import { BrokerBoard, type BoardLane, type LaneColor } from "../unified-view/threepl/BrokerBoard";
import { DateRangeFilter, type DateRange } from "../unified-view/threepl/DateRangeFilter";
import { dateKeyOf, formatFullDate, startOfDay } from "../unified-view/data";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { AssetsCell, DocumentsCell, FlagsCell, ProductsCell, QuantityCell, RulePill } from "./cells";
import { useSavedViews } from "../unified-view/useSavedViews";
import { DATE_FMT } from "../unified-view/data";
import {
  DEFAULT_HIDDEN,
  sentOn,
  isOrder,
  galNow,
  LIST_STATUSES,
  orderListRows,
  quantityOf,
  requestByNo,
  REQUEST_LIST_COLUMNS,
  FLAG_KINDS,
  PRODUCTS,
  LINE_SCOPES,
  TERMINAL,
  inLine,
  lineQty,
  tripProgress,
  type LineScope,
  type RequestStatus,
  REQUEST_COLUMNS,
  REQUEST_SEARCH_FIELDS,
  REQUEST_STATUS_TONE,
  SHIP_TOS,
  assetById,
  createRequest,
  lastProductFor,
  lowTanksWithoutOrder,
  matchesRequest,
  printKey,
  requestColumnText,
  sortRequests,
  updateRequest,
  useRequests,
  windowText,
  type OrderRequest,
  type RequestColumnKey,
  type RequestSort,
  orderTheRest,
} from "./orders";
import { OrderRequestSheet } from "./OrderRequestSheet";
import { BatteryCell, LevelGauge, OrderTanksLayer } from "./TankLevel";
import { OutlineShine } from "@/components/ui/outline-shine";
import { cn } from "@/lib/utils";
import { NumberLink } from "./cells";
import { usePortalNav } from "./nav";
import { GroupedListFooter, useGrouping, type GroupDim } from "@/components/tables-layout";
import { MapHoverCard, OverviewCards } from "./overview";
import { AlertBanner, type BannerAlert } from "@/components/ui/alert-banner";
import { bannerSoftAction } from "@/components/ui/banner";
import { TodaySheet } from "./TodaySheet";

/**
 * ORDERS — the customer's order requests (Pavan, 2026-10-13). The Unified
 * View list: the view row with the CTA, the toolbar, the table, pagination.
 *
 * NOT DATE-SCOPED, as Quotes: a customer looks across all of their requests,
 * past and coming; the planned date is a column that sorts. One view — a
 * table — so no view switch.
 */
const TOGGLE_COLUMNS = REQUEST_COLUMNS.filter((c) => c.label).map((c) => ({
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
  colFilters: Record<string, string>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  facets: string[];
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    hidden: [...s.hidden].sort(),
    facets: [...s.facets].sort(),
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters)
        .filter(([, v]) => v.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  });

const DEFAULT_STATE: ViewState = {
  search: "",
  sortKey: null,
  sortDir: null,
  hidden: DEFAULT_HIDDEN,
  pageSize: 25,
  colScope: "requestNo",
  colQuery: "",
  colFilters: {},
  columnOrder: [],
  columnWidths: {},
  facets: [],
};

/* WHICH HAND-OFF HAS BEEN ANSWERED — outside the component, so a remount
   on the way back does not make a second draft (the Quotes rule). */
let answeredPrefill: number | null = null;

/*
  ORDERS (Pavan, 2026-10-19) — ONE LIST, everything in it: every request,
  and for an accepted one a row per order it went on (`orderListRows`), each
  in its own state. The columns are the order-request columns; GROUP BY
  (beside Filters) gathers the rows by Request or by Order number, by Status
  or by Ship-to.
*/
let answeredFocus: number | null = null;

const ORDER_GROUP_DIMS: GroupDim<OrderRequest>[] = [
  { key: "request", label: "Request", hides: "requestNo", valuesOf: (r) => [r.requestNo] },
  { key: "order", label: "Order number", hides: "orders", valuesOf: (r) => (r.orderRef ? [r.orderRef] : []) },
  { key: "status", label: "Status", hides: "status", order: [...LIST_STATUSES], valuesOf: (r) => [r.status] },
  { key: "shipTo", label: "Ship-to", hides: "shipTo", valuesOf: (r) => (r.shipTo ? [r.shipTo] : []) },
];

export function OrdersScreen({
  prefill,
  focus,
}: {
  /** An order started elsewhere (Sites & Assets): its ship-to and tanks. */
  prefill?: { shipTo: string; assetIds: string[]; n: number } | null;
  /** An order to open on arrival — a link from an invoice. */
  focus?: { requestNo: string; n: number } | null;
} = {}) {
  const all = useRequests();
  const rows = React.useMemo(() => orderListRows(all), [all]);
  const orderRows = React.useMemo(() => all.filter(isOrder), [all]);
  const COLUMNS = REQUEST_LIST_COLUMNS;
  const SIDE = LIST_STATUSES;
  const nav = usePortalNav();
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* OPENED FROM A LINK — the order behind an invoice. */
  React.useEffect(() => {
    /* ONCE PER LINK — switching segments later does not reopen it. */
    if (!focus || focus.n === answeredFocus) return;
    /* A NUMBER OPENS ITS RECORD — a request (REQ-…) or an order (ORD-…). */
    const r = all.find((x) => x.requestNo === focus.requestNo);
    if (!r) return;
    answeredFocus = focus.n;
    setOpenId(r.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n]);
  const [creatingId, setCreatingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<RequestSort | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<RequestColumnKey>>(() => new Set(DEFAULT_HIDDEN));
  const [colScope, setColScope] = React.useState("requestNo");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = React.useState(false);
  const [todayOpen, setTodayOpen] = React.useState(false);
  /* THE LINE SWITCH (3PL's, "All" first) and THE DATE RANGE — a request's
     record is a delivery day, so the list opens on today (2-layouts §4). */
  const [line, setLine] = React.useState<LineScope>("All");
  const today = startOfDay(new Date());
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });
  const fromKey = dateKeyOf(range.from);
  const toKey = dateKeyOf(range.to);
  /* THE MAP MOVES — the trucks' places are read from the clock. */
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (view !== "map") return;
    const t = window.setInterval(() => setNow(Date.now()), 3000);
    return () => window.clearInterval(t);
  }, [view]);
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
    colScope,
    colQuery,
    colFilters,
    columnOrder,
    columnWidths,
    facets: [...facetSel],
  };

  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as RequestColumnKey, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as RequestColumnKey[]));
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

  const savedViews = useSavedViews({
    current,
    defaultState: DEFAULT_STATE,
    keyOf,
    apply: applyState,
    storageKey: "portal-orders-list",
  });

  const startCreate = () => {
    /* CREATE, THEN AUTOSAVE: the Draft exists from this press on. */
    const r = createRequest();
    setCreatingId(r.id);
    setOpenId(r.id);
    setPage(1);
  };

  /* AN ORDER HANDED OVER — a draft for that ship-to, each tank on a line
     with the product last ordered for it. Top off when it came from a
     monitored tank's own sheet; otherwise one blank line. */
  React.useEffect(() => {
    if (!prefill || prefill.n === answeredPrefill) return;
    answeredPrefill = prefill.n;
    const r = createRequest();
    updateRequest(r.id, {
      shipTo: prefill.shipTo,
      lines: prefill.assetIds.length
        ? prefill.assetIds.map((id) => {
            const a = assetById(id);
            return {
              assetId: id,
              product: lastProductFor(id, all) ?? a?.product ?? "",
              topOff: true,
              gal: 0,
            };
          })
        : r.lines,
    });
    setCreatingId(r.id);
    setOpenId(r.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.n]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          inLine(r, line) &&
          /* A draft with no date yet is shown whatever the range. */
          (!r.date || (r.date >= fromKey && r.date <= toKey)) &&
          (!q || matchesRequest(r, q)) &&
          (!cq || requestColumnText(r, colScope as RequestColumnKey).toLowerCase().includes(cq)) &&
          activeColFilters.every(([key, value]) =>
            requestColumnText(r, key as RequestColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [rows, q, cq, colScope, activeColFilters, line, fromKey, toKey]
  );
  /* Facets AND across, OR within one. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const has = (facet: string) => [...sel].some((id) => id.startsWith(`${facet}:`));
      const pass = (facet: string, values: string[]) =>
        !has(facet) || values.some((v) => sel.has(`${facet}:${v}`));
      return searched.filter(
        (r) =>
          pass("status", [r.status]) &&
          pass("shipTo", [r.shipTo]) &&
          pass(
            "product",
            r.lines.map((l) => l.product)
          ) &&
          pass("repeats", [r.recurring || r.ruleId ? "Recurring" : "One-time"]) &&
        pass(
            "flags",
            r.flags.map((f) => f.kind)
          )
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  const sorted = React.useMemo(() => sortRequests(filtered, sort), [filtered, sort]);
  /* GROUPED, EVERY ROW SHOWS — a group is never cut by a page edge. */
  const g = useGrouping<OrderRequest, RequestColumnKey>({
    dimensions: ORDER_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r: OrderRequest) => r.id, []),
    measureOf: React.useCallback((r: OrderRequest) => quantityOf(r.lines).gal, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });
  const pageRows = g.visibleRows;

  const facets: ListFacet[] = React.useMemo(
    () => [
      { key: "status", label: "Status", options: [...SIDE] },
      { key: "flags", label: "Flags", options: [...FLAG_KINDS] },
      { key: "shipTo", label: "Ship-to", options: SHIP_TOS.map((s) => s.name) },
      { key: "product", label: "Product", options: PRODUCTS },
      { key: "repeats", label: "Repeats", options: ["One-time", "Recurring"] },
    ],
    []
  );

  const onSort = (key: RequestColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const renderCell = (r: OrderRequest, key: RequestColumnKey) => {
    const muted = <span className="text-sm text-muted-foreground">—</span>;
    switch (key) {
      case "requestNo": {
        /* THE NUMBER'S OWN DAY under it (Pavan, 2026-10-19) — a request's,
           the day it was sent; an order's, the day the tenant accepted. */
        const s = sentOn(r);
        return <TwoLineCell title={r.requestNo} description={s ? DATE_FMT.format(new Date(s)) : "Not sent"} />;
      }
      case "orders": {
        /* THIS ROW'S ORDER — or Pending for tanks not on one yet. */
        if (r.orderRef !== undefined)
          return r.orderRef ? (
            <NumberLink no={r.orderRef} onOpen={nav.openOrder} />
          ) : (
            <span className="text-sm text-muted-foreground">Pending</span>
          );
        const nos = Array.from(new Set(r.lines.map((l) => l.orderNo).filter(Boolean))) as string[];
        const waiting = r.status === "Partly accepted" && r.lines.some((l) => !l.orderNo);
        if (nos.length === 0) return muted;
        return (
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            {nos.map((n) => (
              <NumberLink key={n} no={n} onOpen={nav.openOrder} />
            ))}
            {waiting && <span className="text-muted-foreground">+ pending</span>}
          </span>
        );
      }
      case "shipTo":
        return r.shipTo ? <span className="truncate text-sm">{r.shipTo}</span> : muted;
      case "assets":
        return <AssetsCell r={r} />;
      case "products":
        return <ProductsCell r={r} />;
      case "quantity":
        return <QuantityCell r={r} />;
      case "flags":
        return <FlagsCell r={r} />;
      case "documents":
        return <DocumentsCell r={r} />;
      case "date":
        return r.date ? <TwoLineCell title={printKey(r.date)} description={windowText(r)} /> : muted;
      case "repeats":
        return r.ruleNo ? <RulePill ruleNo={r.ruleNo} /> : r.recurring ? <span className="text-sm">{r.frequency}</span> : muted;
      case "po":
        return r.po ? <span className="text-sm">{r.po}</span> : muted;
      case "status":
        return (
          <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
            {r.status}
          </StatusChip>
        );
      case "updated": {
        const d = new Date(r.updatedAt);
        return (
          <TwoLineCell
            title={DATE_FMT.format(d)}
            description={d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          />
        );
      }
      default:
        return null;
    }
  };

  /* ---- THE ALERTS (Pavan, 2026-10-13) — every kind that needs the
     customer's eye, most serious first; each one, pressed, narrows the list
     to what it counts (on every date, unless it is about today). ---- */
  const [dismissed, setDismissed] = React.useState<ReadonlySet<string>>(new Set());
  const [snoozed, setSnoozed] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    const next = Object.values(snoozed).filter((t) => t > Date.now());
    if (next.length === 0) return;
    const t = window.setTimeout(() => setSnoozed((p) => ({ ...p })), Math.min(...next) - Date.now());
    return () => window.clearTimeout(t);
  }, [snoozed]);
  const everyDate = (): DateRange => {
    const dated = rows.map((r) => r.date).filter(Boolean).sort();
    const at = (k: string) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    return dated.length ? { from: at(dated[0]), to: at(dated[dated.length - 1]) } : { from: today, to: today };
  };
  const [applied, setApplied] = React.useState<{ id: string; key: string | null } | null>(null);
  const narrowTo = (facetIds: string[], when: "today" | "any", text = "") => {
    setFacetSel(new Set(facetIds));
    setRange(when === "today" ? { from: today, to: today } : everyDate());
    setSearch(text);
    setColQuery("");
    setColFilters({});
    setColFiltersOpen(false);
    setLine("All");
    setPage(1);
  };
  const orderFor = (shipTo: string, assetIds: string[]) => {
    const r = createRequest();
    updateRequest(r.id, {
      shipTo,
      lines: assetIds.map((id) => ({
        assetId: id,
        product: lastProductFor(id, rows) ?? assetById(id)?.product ?? "",
        topOff: true,
        gal: 0,
      })),
    });
    setCreatingId(r.id);
    setOpenId(r.id);
    setPage(1);
  };
  const reqItems = (list: OrderRequest[], detail: (r: OrderRequest) => string) =>
    list.map((r) => ({
      id: r.id,
      title: `${r.requestNo} · ${r.shipTo}`,
      detail: detail(r),
      onApply: () => narrowTo([], "any", r.requestNo),
    }));
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const flagged = (kind: string) => rows.filter((r) => r.flags.some((f) => f.kind === kind));
  const flagDetail = (kind: string) => (r: OrderRequest) => r.flags.find((f) => f.kind === kind)?.detail ?? "";
  const tanks = lowTanksWithoutOrder(all);
  const actionNeeded = rows.filter((r) => r.status === "Action needed");
  const pastDue = flagged("Invoice past due");
  const partial = rows.filter((r) => r.status === "Partial delivery");
  const quotes = rows.filter((r) => r.status === "Quote received");
  const late = flagged("At risk of being late");
  /* EACH LIST ITS OWN ALERTS — the asks (tanks, answers, quotes) on Order
     Requests; the deliveries (late, partial, past due) on Orders. */
  const allAlerts: BannerAlert[] = [
    tanks.length > 0 && {
      id: "tanks",
      status: "warning" as const,
      tag: "Needs action",
      title: `${plural(tanks.length, "tank is", "tanks are")} nearly empty with no order placed`,
      count: tanks.length,
      items: tanks.map((t) => ({
        id: t.asset.id,
        title: t.asset.name,
        /* THE TANK AS IT IS DRAWN EVERYWHERE (Pavan, 2026-10-20), a column
           each: where it is, its level bar, the %, the monitor's battery, and
           the gallons in it out of its size. */
        facts: (
          <>
            <span className="truncate text-sm text-muted-foreground">{t.shipTo}</span>
            <LevelGauge pct={t.asset.level} className="w-24" />
            <span className="text-sm tabular-nums text-foreground">{t.asset.level}%</span>
            <BatteryCell asset={t.asset} />
            <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {galNow(t.asset).toLocaleString()} of {t.asset.capacity.toLocaleString()} gal
            </span>
          </>
        ),
        action: (
          /* A NUDGE ON THE OUTLINE (Pavan, 2026-10-20) — the dashboard's
             shine, in a light grey and a wider band. */
          <Button variant="outline" size="sm" className={cn(bannerSoftAction, "relative")} onClick={() => orderFor(t.shipTo, [t.asset.id])}>
            Create Order Request
            {/* ON the outline, FULLY WHITE, a 2px ring centred on the 1px
                border and a wider band — so it reads (Pavan, 2026-10-20). */}
            <OutlineShine color="var(--color-white)" band="50%" thickness={2} inset={-1.5} />
          </Button>
        ),
      })),
    },
    actionNeeded.length > 0 && {
      id: "action",
      status: "warning" as const,
      tag: "Needs action",
      title: `${plural(actionNeeded.length, "request needs", "requests need")} your answer`,
      count: actionNeeded.length,
      onApply: () => narrowTo(["status:Action needed"], "any"),
      items: reqItems(actionNeeded, (r) => r.flags[0]?.detail ?? "Lone Star Fuels asked for more information"),
    },
    pastDue.length > 0 && {
      id: "pastDue",
      status: "warning" as const,
      tag: "Overdue",
      title: `${plural(pastDue.length, "invoice is", "invoices are")} past due`,
      count: pastDue.length,
      onApply: () => narrowTo(["flags:Invoice past due"], "any"),
      items: reqItems(pastDue, flagDetail("Invoice past due")),
    },
    partial.length > 0 && {
      id: "partial",
      status: "warning" as const,
      tag: "Exception",
      title: `${plural(partial.length, "delivery was", "deliveries were")} only partly made`,
      count: partial.length,
      onApply: () => narrowTo(["status:Partial delivery"], "any"),
      /* ORDER THE REST, from the banner (Pavan, 2026-10-15). */
      items: reqItems(partial, (r) => r.flags[0]?.detail ?? "").map((it, i) => ({
        ...it,
        action: partial[i].undeliveredGal ? (
          <Button
            variant="outline"
            size="sm"
            className={bannerSoftAction}
            onClick={() => {
              const n = orderTheRest(partial[i].id);
              if (!n) return;
              setCreatingId(n.id);
              setOpenId(n.id);
            }}
          >
            Order the rest
          </Button>
        ) : undefined,
      })),
    },
    quotes.length > 0 && {
      id: "quotes",
      status: "caution" as const,
      tag: "Needs action",
      title: `${plural(quotes.length, "quote is", "quotes are")} waiting for you to accept`,
      count: quotes.length,
      onApply: () => narrowTo(["status:Quote received"], "any"),
      items: reqItems(quotes, (r) => (r.date ? `Planned for ${printKey(r.date)}` : "")),
    },
    late.length > 0 && {
      id: "late",
      status: "caution" as const,
      tag: "At risk",
      title: `${plural(late.length, "delivery is", "deliveries are")} at risk of being late`,
      count: late.length,
      onApply: () => narrowTo(["flags:At risk of being late"], "any"),
      items: reqItems(late, flagDetail("At risk of being late")),
    },
  ].filter(Boolean) as BannerAlert[];
  /* WHICH ALERT'S FILTER IS ON (Pavan, 2026-10-14) — the list's state as the
     press left it. Changing the filter by hand ends it; "Clear filter" on the
     banner puts the list back to its default (today, nothing narrowed). */
  const stateKey = JSON.stringify([[...facetSel].sort(), search, range]);
  const alertsApplied = allAlerts.map((a) => ({
    ...a,
    onApply: a.onApply && (() => (a.onApply!(), setApplied({ id: a.id, key: null }))),
    items: a.items?.map((it) => ({
      ...it,
      onApply: it.onApply && (() => (it.onApply!(), setApplied({ id: a.id, key: null }))),
    })),
  }));
  React.useEffect(() => {
    if (applied && applied.key === null) setApplied({ ...applied, key: stateKey });
  }, [applied, stateKey]);
  const alerts = alertsApplied.filter((a) => !dismissed.has(a.id) && !((snoozed[a.id] ?? 0) > Date.now()));

  const nothing = sorted.length === 0 && !(view === "table" && colFiltersOpen);

  /* THE BOARD — one lane per status, in lifecycle order; the ends that are
     not steps of the work sit apart (2-layouts §6). Lane colour follows the
     status's kind. */
  const boardLanes = React.useMemo<BoardLane[]>(() => {
    const ENDS: RequestStatus[] = ["Quote declined", "Quote expired", "Rejected", "Cancelled"];
    const KIND_LANE: Record<string, LaneColor> = {
      neutral: "grey",
      processing: "yellow",
      info: "blue",
      success: "green",
      failed: "red",
    };
    /* ONE "QUOTE" LANE (Pavan, 2026-10-19) for both of its states — Quote
       received, Quote accepted; each card says which. Scheduled follows. */
    const QUOTE: RequestStatus[] = ["Quote received", "Quote accepted"];
    const laneOf = (st: RequestStatus) => (QUOTE.includes(st) ? "Quote" : st);
    const steps = SIDE.filter((st) => !ENDS.includes(st) && st !== "Quote accepted");
    return [...steps, ...ENDS.filter((st) => SIDE.includes(st))].map((st) => ({
      key: laneOf(st),
      title: laneOf(st),
      color: KIND_LANE[REQUEST_STATUS_TONE[st]] ?? "grey",
      apart: st === ENDS[0],
      emptyLabel: "No orders",
      cards: sorted
        .filter((r) => laneOf(r.status) === laneOf(st))
        .map((r) => ({
          id: r.id,
          title: r.requestNo,

          /* ACCEPTED, AND ITS QUOTE TO HAND (Pavan, 2026-10-19). */
          footerAction:
            Boolean(r.orderRef) && r.status === "Scheduled" && r.documents.some((d) => d.kind === "Quote")
              ? {
                  label: "Quote received",
                  actionLabel: "View quote",
                  actionVariant: "outline" as const,
                  onAction: () => {
                    /* THE QUOTE IS THE REQUEST'S — open the request. */
                    setCreatingId(null);
                    setOpenId(requestByNo(r.requestNo, all)?.id ?? r.openId ?? r.id);
                  },
                }
              : undefined,
          /* IN THE QUOTE LANE, WHICH QUOTE STATE — a pill: received waits on
             the customer, accepted on the tenant. */
          badges: [
            ...(r.status === "Quote received"
              ? [{ label: "Quote received", tone: "caution" as const }]
              : r.status === "Quote accepted"
                ? [{ label: "Quote accepted", tone: "success" as const }]
                : []),
            ...r.flags
              .filter((f) => f.level !== "info")
              .map((f) => ({ label: f.kind, tone: f.level === "critical" ? ("critical" as const) : ("caution" as const) })),
          ],
          units: [
            { kind: "stack" as const, key: "shipTo", heading: "Ship-to", lines: [{ text: r.shipTo || "—", level: 1 as const }] },
            {
              kind: "inline" as const,
              key: "schedule",
              heading: "Planned",
              parts: r.date ? [printKey(r.date), windowText(r)] : ["No date"],
            },
            {
              kind: "rows" as const,
              key: "lines",
              heading: "Tanks & products",
              rows: r.lines.map((l) => ({
                asset: `${assetById(l.assetId)?.name ?? "No tank"} · ${l.product || "—"}`,
                qty: lineQty(l),
              })),
            },
          ],
        })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted]);

  /* THE MAP — the same narrowed list, each request a pin at its ship-to;
     trucks out for delivery move along their road (Pavan, 2026-10-13). */
  const mapOrders: MapOrder[] = sorted.map((r) => {
    const site = SHIP_TOS.find((x) => x.name === r.shipTo);
    return {
      id: r.id,
      orderNo: r.requestNo,
      site: r.shipTo,
      subtitle: r.date ? `${printKey(r.date)} · ${windowText(r)}` : "No date",
      status: r.status,
      tone: REQUEST_STATUS_TONE[r.status],
      coords: site ? { lat: site.lat, lng: site.lng } : undefined,
    };
  });
  const trucks = sorted
    .filter((r) => r.status === "Out for delivery" && r.trip)
    .map((r) => {
      const site = SHIP_TOS.find((x) => x.name === r.shipTo)!;
      const eta = new Date(r.trip!.eta);
      return {
        id: `truck-${r.id}`,
        orderId: r.id,
        label: `${r.trip!.truck} · ${r.requestNo} · ETA ${formatMinutes(eta.getHours() * 60 + eta.getMinutes())}`,
        from: { lat: TERMINAL.lat, lng: TERMINAL.lng },
        fromLabel: TERMINAL.name,
        to: { lat: site.lat, lng: site.lng },
        progress: tripProgress(r.trip!, now),
      };
    });
  const narrowed = q !== "" || cq !== "" || facetSel.size > 0;

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
      label: REQUEST_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: COLUMNS.find((c) => c.key === key)?.label ?? key,
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
    ...facets.map((f) => {
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
      {/* THE OVERVIEW SITS ABOVE EVERYTHING (Pavan, 2026-10-13) — the
          view row, the banner and the tools come after it. */}
      {/* 20px UNDER THE TITLE (Pavan, 2026-10-15) — the header's 12 and the
          body's padding, less 14. Everything below moves up with it. */}
      {/* THE DAY'S DELIVERIES ARE THE ORDERS' (Pavan, 2026-10-19) — counted
          from orders on both segments, so the page does not jump on a switch. */}
      <div className="-mt-3.5 shrink-0">
        <OverviewCards rows={orderRows} onDetails={() => setTodayOpen(true)} />
      </div>
      <TodaySheet rows={orderRows} open={todayOpen} onOpenChange={setTodayOpen} />

      {/* AIR BETWEEN THE OVERVIEW AND THE CONTROLS (Pavan, 2026-10-13). */}
      <div className="mt-8 shrink-0">
      <FuelOrdersViewBar
        {...savedViews}
        /* ORDERS COME FROM THE TENANT — only a request is created here. */
        ctaLabel="Create Request"
        onCreateOrder={startCreate}
        onExport={() => setExporting(true)}
        segments={LINE_SCOPES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(v) => {
          setLine(v as LineScope);
          setPage(1);
        }}
      />
      </div>

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search requests, orders, ship-tos, tanks…"
          /* GROUP BY, BESIDE FILTERS (Pavan, 2026-10-19) — Request, Order
             number, Status, Ship-to. Off on the board, already in lanes. */
          showGroupBy={view === "table"}
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
          filters={
            <ListFilters
              facets={facets}
              value={facetSel}
              countFor={(sel) => narrowFacets(sel).length}
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
            />
          }
          columns={COLUMNS.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label }))}
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
          searchFields={REQUEST_SEARCH_FIELDS}
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
          boardView
          mapView
          dateControl={
            <DateRangeFilter
              value={range}
              onChange={(next) => {
                setRange(next);
                setPage(1);
              }}
            />
          }
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
            searchFields={REQUEST_SEARCH_FIELDS}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => {
              setColQuery("");
              setPage(1);
            }}
          />
        </FilterChips>
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

      {/* THE ALERTS — the DS alert banner, one kind at a time with ‹ 1 of N ›;
          pressing an alert applies the filter it describes. In the portal it
          sits BELOW the toolbar, search and filter chips, right above the
          list (Pavan, 2026-10-14). */}
      {alerts.length > 0 && (
        <AlertBanner
          className="mt-4 shrink-0"
          alerts={alerts}
          onSnooze={(id, ms) => setSnoozed((prev) => ({ ...prev, [id]: Date.now() + ms }))}
          onDismiss={(id) => setDismissed((prev) => new Set(prev).add(id))}
          appliedId={applied && applied.key === stateKey ? applied.id : null}
          onClearApplied={() => {
            narrowTo([], "today");
            setApplied(null);
          }}
        />
      )}

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {nothing ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">{narrowed ? <SearchX /> : <ClipboardList />}</EmptyMedia>
                <EmptyTitle>
                  {narrowed ? "No matching orders" : "No orders yet"}
                </EmptyTitle>
                {narrowed && (
                  <EmptyDescription>
                    {`${rows.length} orders in all. Clear the search or a filter to see them.`}
                  </EmptyDescription>
                )}
              </EmptyHeader>
              {(
              
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (narrowed) {
                      setSearch("");
                      setColQuery("");
                      setFacetSel(new Set());
                    } else startCreate();
                    setPage(1);
                  }}
                >
                  {narrowed ? "Clear all" : "Create Request"}
                </Button>
              </EmptyContent>
              )}
            </Empty>
          ) : view === "board" ? (
            <BrokerBoard
              lanes={boardLanes}
              onOpenCard={(id) => {
                setCreatingId(null);
                setOpenId(rows.find((x) => x.id === id)?.openId ?? id);
              }}
            />
          ) : view === "map" ? (
            <OrderMapView
              orders={mapOrders}
              trucks={trucks}
              minPad={0.04}
              onOpenOrder={(id) => {
                setCreatingId(null);
                setOpenId(rows.find((x) => x.id === id)?.openId ?? id);
              }}
              hoverCard={(pins) => (
                <MapHoverCard requests={pins.map((p) => rows.find((r) => r.id === p.id)!).filter(Boolean)} />
              )}
            />
          ) : (
            <ListTable
              rows={pageRows}
              columns={COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open ${r.orderRef ? `order ${r.orderRef} for` : "request"} ${r.requestNo}`}
              onOpenRow={(r) => {
                setCreatingId(null);
                setOpenId(r.openId ?? r.id);
              }}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="row"
              groupUnit="gal"
              /* EACH ORDER'S TANKS, ONE LAYER DOWN (Pavan, 2026-10-17). */
              /* ONE SET OF TANK DETAILS ON EVERY ROW (Pavan, 2026-10-20) — a request
                 not yet on an order shows the same seven columns; its order
                 is the row's own Orders column. */
              renderExpanded={(r) => <OrderTanksLayer r={r} />}
              expandLabel={(r, open) => `${open ? "Hide" : "Show"} tanks for ${r.requestNo}`}
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

      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Orders"
        noun="orders"
        nounOne="order"
        count={sorted.length}
        filtersControl={
          <ListFilters
            facets={facets}
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
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? "order" : "orders"} as .${format}`);
        }}
      />

      <OrderRequestSheet
        request={all.find((r) => r.id === openId) ?? null}
        open={openId !== null}
        creating={creatingId !== null && creatingId === openId}
        onOpenChange={(o) => {
          if (o) return;
          setOpenId(null);
          setCreatingId(null);
        }}
        onDuplicate={(id) => {
          /* The copy opens as a new order, in place of the one it came from. */
          setCreatingId(id);
          setOpenId(id);
          setPage(1);
        }}
      />

      {/* A BOARD AND A MAP ARE NOT PAGED — they get a total that says its
          scope (2-layouts §9), worded and weighted as on 3PL and Sales: the
          count in medium, then lanes and the date range muted; nothing when
          there is nothing. */}
      {view !== "table" ? (
        sorted.length > 0 ? (
          <div className="mt-4 flex shrink-0 items-baseline gap-2 text-sm">
            <span className="font-medium text-foreground">
              {sorted.length.toLocaleString()} {sorted.length === 1 ? "order" : "orders"}
            </span>
            <span className="text-muted-foreground">
              across {boardLanes.filter((l) => l.cards.length > 0).length} of {boardLanes.length} lanes ·{" "}
              {dateKeyOf(range.from) === dateKeyOf(range.to)
                ? formatFullDate(range.from)
                : `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`}
            </span>
          </div>
        ) : null
      ) : g.grouped ? (
        <div className="mt-4 shrink-0">
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="row"
            total={g.total}
            unit="gal"
            overCounts={g.groups.overCounts}
            allCollapsed={g.allCollapsed}
            onExpandAll={g.expandAll}
            onCollapseAll={g.collapseAll}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}
