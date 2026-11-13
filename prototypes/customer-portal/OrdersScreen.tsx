import * as React from "react";
import { dateWindowOf } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { ClipboardList, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { HeadFold, displayViewsFor, useHeadFold } from "../unified-view/HeadFold";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement, BoardWithBar } from "../unified-view/ListToolbar";
import { ListFilters, type ListFacet } from "../unified-view/ListFilters";
import { ExportSheet, type ExportFilterRow } from "../unified-view/ExportSheet";
import { ListTable, TwoLineCell } from "../unified-view/ListTable";
import { OrderMapView, type MapOrder } from "../unified-view/OrderMapView";
import { type BoardLane, type LaneColor } from "../unified-view/threepl/BrokerBoard";
import { BoardV2 } from "../unified-view/threepl/BoardV2";
import { DateRangeFilter, type DateRange } from "../unified-view/threepl/DateRangeFilter";
import { dateKeyOf, formatFullDate, startOfDay } from "../unified-view/data";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { AwaitingPill, DocumentsCell, FlagsCell, RulePill, awaitingLabel } from "./cells";
import { useSavedViews } from "../unified-view/useSavedViews";
import { DATE_FMT } from "../unified-view/data";
import {
  DEFAULT_HIDDEN,
  sentOn,
  galNow,
  LIST_STATUSES,
  orderListRows,
  quantityOf,
  REQUEST_LIST_COLUMNS,
  FLAG_KINDS,
  PRODUCTS,
  LINE_SCOPES,
  TERMINAL,
  inLine,
  lineQty,
  tripProgress,
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
import { BatteryCell, DaysToEmpty, FulfilmentPct, LevelGauge, LevelReading } from "./TankLevel";
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

const DEFAULT_STATE: ViewState = {
  mode: "table",
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
  ORDERS (Pavan, 2026-10-19; one number 2026-10-21) — ONE LIST, one row per
  order (ORD-…), the number the customer and the tenant share. GROUP BY
  (beside Filters) gathers the rows by Status or by Ship-to.
*/
let answeredFocus: number | null = null;

const ORDER_GROUP_DIMS: GroupDim<OrderRequest>[] = [
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
  const orderRows = all;
  const COLUMNS = REQUEST_LIST_COLUMNS;
  const SIDE = LIST_STATUSES;
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
  const [todayAbout, setTodayAbout] = React.useState<"orders" | "gallons">("orders");
  /* THE LINE SWITCH (3PL's, "All" first) and THE DATE RANGE — a request's
     record is a delivery day, so the list opens on today (2-layouts §4). */
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
              topOff: false,
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
    [rows, q, cq, colScope, activeColFilters, fromKey, toKey]
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
          /* LINE OF SERVICE IS A FILTER (Pavan, 2026-10-21) — any of its
             products in the line. */
          pass("line", LINE_SCOPES.filter((l) => l !== "All" && inLine(r, l))) &&
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
  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
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
      { key: "line", label: "Line of Service", options: LINE_SCOPES.filter((l) => l !== "All") },
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

  /*
    EVERY TANK IN THE ORDER'S OWN ROW (Pavan, 2026-10-21 — chose "A" over a
    band per tank): each tank is a line inside the row, and the tank columns
    — tank, product, quantity, level, on fulfillment, days to empty, battery
    — line up line for line; the order's own cells show once. No nested
    layer.
  */
  const perTank = (r: OrderRequest, one: (l: OrderRequest["lines"][number]) => React.ReactNode, right = false) => {
    if (r.lines.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
    return (
      <div className="-my-0.5 flex flex-col gap-1.5">
        {r.lines.map((l, i) => (
          <div key={i} className={cn("flex h-6 min-w-0 items-center", right && "justify-end")}>
            {one(l)}
          </div>
        ))}
      </div>
    );
  };
  const renderCell = (r: OrderRequest, key: RequestColumnKey) => {
    const muted = <span className="text-sm text-muted-foreground">—</span>;
    const reading = (node: (l: OrderRequest["lines"][number]) => React.ReactNode) => perTank(r, node);
    switch (key) {
      case "level":
        return reading((l) => <LevelReading asset={assetById(l.assetId)} />);
      case "fulfill":
        return reading((l) => <FulfilmentPct line={l} r={r} />);
      case "daysToEmpty":
        return reading((l) => <DaysToEmpty asset={assetById(l.assetId)} />);
      case "battery":
        return reading((l) => <BatteryCell asset={assetById(l.assetId)} />);
      case "requestNo": {
        /* THE NUMBER'S OWN DAY under it (Pavan, 2026-10-19) — the day the
           order was sent to the tenant. */
        const s = sentOn(r);
        return <TwoLineCell title={r.requestNo} description={s ? DATE_FMT.format(new Date(s)) : "Not sent"} />;
      }
      case "shipTo":
        return r.shipTo ? <span className="truncate text-sm">{r.shipTo}</span> : muted;
      case "assets":
        return perTank(r, (l) => <span className="truncate text-sm text-foreground">{assetById(l.assetId)?.name ?? "No tank"}</span>);
      case "products":
        return perTank(r, (l) => <span className="truncate text-sm">{l.product || "—"}</span>);
      case "quantity":
        return perTank(r, (l) => <span className="text-sm tabular-nums text-foreground">{lineQty(l)}</span>);
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
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
              {r.status}
            </StatusChip>
            <AwaitingPill r={r} />
          </span>
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
    setPage(1);
  };
  const orderFor = (shipTo: string, assetIds: string[]) => {
    const r = createRequest();
    updateRequest(r.id, {
      shipTo,
      lines: assetIds.map((id) => ({
        assetId: id,
        product: lastProductFor(id, rows) ?? assetById(id)?.product ?? "",
        topOff: false,
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
  const pastDue = flagged("Invoice past due");
  const partial = rows.filter((r) => r.status === "Partial delivery");
  const late = flagged("At risk of being late");
  /* THE LIST'S ALERTS — empty tanks with nothing ordered, and the
     deliveries (late, partial, past due). */
  const allAlerts: BannerAlert[] = [
    tanks.length > 0 && {
      id: "tanks",
      status: "warning" as const,
      tag: "Needs action",
      title: `${plural(tanks.length, "tank is", "tanks are")} nearly empty with no order placed`,
      count: tanks.length,
      /* THE SAME SHAPE AS THE OTHER ALERTS (Pavan, 2026-10-26) — the count
         in the tag and View details, which narrows the list to the ship-tos
         those tanks are at. */
      onApply: () => narrowTo([...new Set(tanks.map((t) => `shipTo:${t.shipTo}`))], "any"),
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
          /* The CTA shine comes from the banner (DS AlertBanner). */
          <Button variant="outline" size="sm" className={bannerSoftAction} onClick={() => orderFor(t.shipTo, [t.asset.id])}>
            Create Order
          </Button>
        ),
      })),
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
    const ENDS: RequestStatus[] = ["Canceled"];
    const KIND_LANE: Record<string, LaneColor> = {
      neutral: "grey",
      processing: "yellow",
      info: "blue",
      success: "green",
      failed: "red",
    };
    const laneOf = (st: RequestStatus) => st;
    const steps = SIDE.filter((st) => !ENDS.includes(st));
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

          /* AN ASK AWAITING THE TENANT stands out on the card — its pill, and
             a caution strip at the foot that opens the order (Pavan,
             2026-10-22). */
          alert: r.changeRequest
            ? {
                status: "caution" as const,
                text: `${awaitingLabel(r)} · ${r.changeRequest.what}`,
                actionLabel: "View",
                onAction: () => {
                  setCreatingId(null);
                  setOpenId(r.id);
                },
              }
            : undefined,
          badges: [
            ...(r.changeRequest ? [{ label: awaitingLabel(r)!, tone: "caution" as const }] : []),
            ...r.flags
              .filter((f) => f.level !== "info")
              .map((f) => ({ label: f.kind, tone: f.level === "critical" ? ("critical" as const) : ("caution" as const) })),
          ],
          units: [
            { kind: "stack" as const, key: "shipTo", heading: "Ship-to Details", lines: [{ text: r.shipTo || "—", level: 1 as const }] },
            {
              kind: "inline" as const,
              key: "schedule",
              heading: "Planned",
              parts: r.date ? [printKey(r.date), windowText(r)] : ["No date"],
              /* THE BOARD'S ONE FORM (Pavan, 2026-11-02): the date, then one
                 time — the window's start, not the window. */
              planned: r.date
                ? { date: printKey(r.date), time: formatMinutes(r.windowStart) }
                : { date: "No date" },
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

  /* THE PICKER'S "All dates" AND LIVE COUNT — read off every record's day. */
  const dateWindow = React.useMemo(() => dateWindowOf(rows.map((r) => r.date ?? "")), [rows]);

  const fold = useHeadFold();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE OVERVIEW SITS ABOVE EVERYTHING (Pavan, 2026-10-13) — the
          view row, the banner and the tools come after it. */}
      {/* 20px UNDER THE TITLE (Pavan, 2026-10-15) — the header's 12 and the
          body's padding, less 14. Everything below moves up with it. */}
      {/* THE DAY'S DELIVERIES ARE THE ORDERS' (Pavan, 2026-10-19) — counted
          from orders on both segments, so the page does not jump on a switch. */}
      {/* THE OVERVIEW FOLDS WITH THE VIEWS ROW — everything above the search
          row goes (Pavan, 2026-11-13). */}
      <HeadFold collapsed={fold.collapsed}>
      <div className="-mt-3.5 shrink-0">
        <OverviewCards rows={orderRows} onDetails={(about) => (setTodayAbout(about), setTodayOpen(true))} />
      </div>

      {/* AIR BETWEEN THE OVERVIEW AND THE CONTROLS (Pavan, 2026-10-13). */}
      <div className="mt-8 shrink-0">
      <FuelOrdersViewBar
        {...savedViews}
        {...displayViewsFor({ board: true, map: true }, view, setView)}
        /* ORDERS COME FROM THE TENANT — only a request is created here. */
        ctaLabel="Create Order"
        onCreateOrder={startCreate}
        onExport={() => setExporting(true)}
      />
      </div>
      </HeadFold>
      <TodaySheet rows={orderRows} about={todayAbout} open={todayOpen} onOpenChange={setTodayOpen} />


      {/* THE BANNER SITS ABOVE SEARCH AND FILTERS (Pavan, 2026-11-02 — was
          under them; it cut across the line joining the table to its tools).
          Every module: what needs attention, then the tools, then the list. */}
      {alerts.length > 0 && (
        <AlertBanner
          className={fold.gap}
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
      <div className={alerts.length > 0 ? "mt-4 shrink-0" : fold.gap}>
        <ListToolbar
          viewSwitch={false}
          headCollapse={fold.headCollapse}
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one="order" many="orders" rest={view === "board" ? `across ${boardLanes.filter((l) => l.cards.length > 0).length} of ${boardLanes.length} lanes · ${dateKeyOf(range.from) === dateKeyOf(range.to) ? formatFullDate(range.from) : `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`}` : `· ${dateKeyOf(range.from) === dateKeyOf(range.to) ? formatFullDate(range.from) : `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`}`} />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search orders, ship-tos, tanks…"
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
          settings
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
          boardView
          mapView
          dateControl={
            <DateRangeFilter
              {...dateWindow}
              noun="orders"
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
                  {narrowed ? "Clear all" : "Create Order"}
                </Button>
              </EmptyContent>
              )}
            </Empty>
          ) : view === "board" ? (
            <BoardWithBar barRef={bar.ref}>
              <BoardV2
                lanes={boardLanes}
                onOpenCard={(id) => {
                  setCreatingId(null);
                  setOpenId(id);
                }}
              />
            </BoardWithBar>
          ) : view === "map" ? (
            <OrderMapView
              orders={mapOrders}
              trucks={trucks}
              minPad={0.04}
              onOpenOrder={(id) => {
                setCreatingId(null);
                setOpenId(id);
              }}
              hoverCard={(pins) => (
                <MapHoverCard requests={pins.map((p) => rows.find((r) => r.id === p.id)!).filter(Boolean)} />
              )}
            />
          ) : (
            <ListTable
              topBar={bar.slot}
              /* A TALL ORDER READS FROM ITS TOP (Pavan, 2026-10-21) — the
                 number, ship-to, date and status sit level with its first tank. */
              alignTop
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
              openLabel={(r) => `Open order ${r.requestNo}`}
              onOpenRow={(r) => {
                setCreatingId(null);
                setOpenId(r.id);
              }}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="row"
              groupUnit="gal"
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
      {view === "map" ? (
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
