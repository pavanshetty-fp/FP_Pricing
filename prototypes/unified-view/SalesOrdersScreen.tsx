import * as React from "react";
import { dateWindowOf } from "@/components/ui/date-picker";
import { CalendarOff, SearchX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { FuelOrdersViewBar, viewStateKey, type ViewState } from "./FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement, BoardWithBar } from "./ListToolbar";
import { ListFilters, type ListFacet } from "./ListFilters";
import { ExportSheet, type ExportFilterRow } from "./ExportSheet";
import { ListTable, TwoLineCell } from "./ListTable";
import { DateRangeFilter, type DateRange } from "./threepl/DateRangeFilter";
import {
  BrokerBoard,
  type BoardCardUnit,
  type BoardLane,
} from "./threepl/BrokerBoard";
import { OrderMapView } from "./OrderMapView";
import { ListSplitView, listSplitCount, type ListSplitItem } from "./ListSplitView";
import { FuelOrdersBulkBar } from "./FuelOrdersBulkBar";
import { OrderSheet, type OrderDraft } from "./OrderSheet";
import { AssetOrderSheet, type AssetOrderDraft } from "./AssetOrderSheet";
import { PlannedCell, ProductCell, QtyCell } from "./FuelOrdersTable";
import { Pill, PillList } from "@/components/ui/pill";
import {
  UNIT_SHORT,
  driverStage,
  getSalesSettings,
  notify,
  overSla,
  stageIds,
  stageLabel,
  stageLaneColor,
  stageTone,
  stageKind,
  stageColor,
  typeColor,
  useSalesSettings,
} from "./salesSettings";
import { useSavedViews } from "./useSavedViews";
import { useLoggedRows } from "./activity";
import { diffAssetOrder, diffFuelOrder } from "./salesActivity";
import { quoteOrders } from "./quoteStore";
import type { SalesDrill } from "./SalesDashboard";
import {
  DATE_FMT,
  FUEL_ORDERS,
  dateKeyOf,
  formatFullDate,
  plannedAt,
  relativeLabel,
  splitGallons,
  startOfDay,
} from "./data";
import {
  ASSET_ORDERS,
  ASSET_TYPES,
  SALES_REPS,
  type AssetOrder,
} from "./assetOrders";
import type { FuelOrder } from "./types";
import {
  SALES_ORDER_COLUMNS,
  SALES_ORDER_GROUP_DIMS,
  SALES_ORDER_SEARCH_FIELDS,
  customerOf,
  dateKeyOfRow,
  dateOf,
  defaultRangeFor,
  inSalesLine,
  orderNoOf,
  salesOrderColumnText,
  salesTypeCode,
  shipToOf,
  sortSalesOrders,
  statusOf,
  matchesSalesOrder,
  type SalesLine,
  type SalesOrderColumnKey,
  type SalesOrderRow,
} from "./salesOrders";

/*
  SALES · ORDERS (Pavan, 2026-10-07) — Fuel Orders and Asset Orders as one
  page, built like 3PL's Delivery Orders: one record list, the Line of Service
  switch on the right of the view bar (All · Fuel Orders · Asset Orders, All
  by default), Create Order as a menu, one table whose columns cover both
  kinds. Everything each page had comes across: board, map, date range,
  filters with chips, the filter row, saved views, the bulk bar (fuel rows) and
  the urgent-overdue banner (fuel rows).
*/

/** Shared with the order sheet — one list, so bulk and single edits agree. */
const DRIVER_OPTIONS = ["Shriya", "Shriya Test 2", "Aakash"];
const TAG_OPTIONS = [
  "Keep Full",
  "Rush",
  "Night",
  "Weekend",
  "Split Load",
  "Hazmat",
  "After Hours",
];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** What a saved view captures — the two pages' states, together. The line is
 *  not in it: 3PL's views do not keep the line either (2026-10-07). */
type SalesViewState = ViewState & {
  dateKeyTo?: string;
  colFilters?: Record<string, string>;
  cardOff?: Record<string, string[]>;
  laneSort?: Record<string, string | undefined>;
  overdueOnly?: boolean;
  facets?: string[];
  mode?: ListView;
};

const salesViewStateKey = (s: SalesViewState) =>
  JSON.stringify([
    viewStateKey(s),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    Object.entries(s.colFilters ?? {})
      .filter(([, v]) => v.trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
    s.dateKeyTo ?? s.dateKey,
    s.cardOff ?? {},
    Object.entries(s.laneSort ?? {})
      .filter(([, v]) => v)
      .sort(([a], [b]) => a.localeCompare(b)),
    Boolean(s.overdueOnly),
    [...(s.facets ?? [])].sort(),
    s.columnOrder,
    s.columnWidths,
    s.mode ?? "table",
  ]);

/** Columns the column menu can toggle (everything with a label). */
const TOGGLE_COLUMNS = SALES_ORDER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/* "REMIND ME LATER" IS THE DS's NOW — `BannerSnooze`, the standard set
   (promoted from here, Pavan, 2026-10-13). */

/* EACH STAGE'S LANE COLOUR lives with the stages now — `stageLaneColor`
   in salesSettings.ts, so an added stage has one (Pavan, 2026-10-07). */

/* ---- the board's card fields — both kinds' units ------------------------ */

type CardUnit = { key: string; label: string; group?: string };
const CUSTOMER_UNITS: CardUnit[] = [
  { key: "customer", label: "Ship-to Details" },
  { key: "customer.site", label: "Ship-to name", group: "customer" },
  { key: "customer.account", label: "Customer", group: "customer" },
];
const FUEL_UNITS: CardUnit[] = [
  { key: "schedule", label: "Schedule" },
  { key: "product", label: "Delivery Product Details" },
  { key: "product.product", label: "Product", group: "product" },
  { key: "product.qty", label: "Quantity", group: "product" },
  { key: "product.total", label: "Total", group: "product" },
  { key: "driver", label: "Driver" },
];
const ASSET_UNITS: CardUnit[] = [
  { key: "date", label: "Delivery Date" },
  { key: "asset", label: "Asset Details" },
  { key: "asset.qty", label: "Quantity", group: "asset" },
  { key: "asset.serial", label: "Serial #", group: "asset" },
  { key: "salesRep", label: "Sales Rep" },
];
/** Every unit — what the parent/child toggle rule reads. */
const ALL_UNITS: CardUnit[] = [...CUSTOMER_UNITS, ...FUEL_UNITS, ...ASSET_UNITS];

/* THE MENU OFFERS WHAT THE LINE'S CARDS CAN SHOW (2026-10-07). */
const unitsFor = (line: SalesLine): CardUnit[] =>
  line === "Fuel Orders"
    ? [...CUSTOMER_UNITS, ...FUEL_UNITS]
    : line === "Asset Orders"
      ? [...CUSTOMER_UNITS, ...ASSET_UNITS]
      : [
          ...CUSTOMER_UNITS,
          FUEL_UNITS[0],
          ASSET_UNITS[0],
          ...FUEL_UNITS.slice(1, 5),
          ...ASSET_UNITS.slice(1, 4),
          FUEL_UNITS[5],
          ASSET_UNITS[4],
        ];

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

const lanesInScope = (scope: string | null): string[] =>
  scope ? [scope] : stageIds();

/** One field on or off in one lane's set — 3PL's parent/child rule. */
function toggleField(
  current: ReadonlySet<string>,
  key: string,
  turningOff: boolean
): Set<string> {
  const next = new Set(current);
  const kids = ALL_UNITS.filter((c) => c.group === key).map((c) => c.key);
  const entry = ALL_UNITS.find((c) => c.key === key);
  if (!turningOff) {
    next.delete(key);
    for (const c of kids) next.delete(c);
    if (entry?.group) next.delete(entry.group);
    return next;
  }
  next.add(key);
  for (const c of kids) next.add(c);
  if (entry?.group) {
    const siblings = ALL_UNITS.filter((c) => c.group === entry.group).map((c) => c.key);
    if (siblings.every((sib) => next.has(sib))) next.add(entry.group);
  }
  return next;
}

/** Card fields as plain sorted arrays, so a view can hold and compare them. */
const cardOffToArrays = (c: Record<string, ReadonlySet<string>>) =>
  Object.fromEntries(
    Object.keys(c)
      .sort()
      .map((k) => [k, [...c[k]].sort()])
  );

/** A fuel card's units, less what the lane has switched off. */
function fuelCardUnits(r: FuelOrder, off: ReadonlySet<string>): BoardCardUnit[] {
  const unit = UNIT_SHORT[getSalesSettings().unit];
  const showProduct = !off.has("product.product");
  const showQty = !off.has("product.qty");
  const units: BoardCardUnit[] = [
    {
      kind: "stack",
      key: "customer",
      /* SHIP-TO FIRST, the customer small under it (Pavan, 2026-10-23). */
      heading: "Ship-to Details",
      lines: [
        ...(off.has("customer.site")
          ? []
          : [{ text: r.customer.description, level: 1 as const }]),
        ...(off.has("customer.account") ? [] : [{ text: r.customer.title, level: 3 as const }]),
      ],
    },
    {
      kind: "inline",
      key: "schedule",
      heading: "Schedule",
      parts: r.planned ? [r.planned.date, r.planned.time] : ["Not planned"],
    },
    {
      kind: "rows",
      key: "product",
      heading: "Delivery Product Details",
      rows:
        showProduct || showQty
          ? r.products.map((p) => ({
              asset: showProduct ? p.name : "",
              qty: showQty ? `${p.gal.toLocaleString()} ${unit}` : "",
            }))
          : [],
      total:
        r.products.length > 1 && !off.has("product.total")
          ? `${r.qtyGal.toLocaleString()} ${unit}`
          : undefined,
    },
    {
      kind: "stack",
      key: "driver",
      heading: "Driver",
      lines: [{ text: r.driver?.name ?? "Unassigned", level: 2 as const }],
    },
  ];
  /* A HEADING WITH NOTHING UNDER IT IS NOT A UNIT — 3PL's rule. */
  return units.filter((u) => {
    if (off.has(u.key)) return false;
    if (u.kind === "stack") return u.lines.length > 0;
    if (u.kind === "rows") return u.rows.length > 0 || Boolean(u.total);
    return true;
  });
}

/** An asset card's units, less what the lane has switched off. */
function assetCardUnits(r: AssetOrder, off: ReadonlySet<string>): BoardCardUnit[] {
  const units: BoardCardUnit[] = [
    {
      kind: "stack",
      key: "customer",
      heading: "Ship-to Details",
      lines: [
        ...(off.has("customer.site") ? [] : [{ text: r.shipTo, level: 1 as const }]),
        ...(off.has("customer.account") ? [] : [{ text: r.customer.title, level: 3 as const }]),
      ],
    },
    { kind: "inline", key: "date", heading: "Delivery Date", parts: [r.date.title] },
    {
      kind: "rows",
      key: "asset",
      heading: "Asset Details",
      /* THE ASSET TYPE IS THE ROW, so it is not a switch — as on 3PL. */
      rows: [
        {
          asset: r.assetType,
          qty: off.has("asset.qty") ? "" : `${r.quantity} ${r.quantity === 1 ? "unit" : "units"}`,
          assetId: off.has("asset.serial") ? undefined : r.serialNo,
        },
      ],
    },
    {
      kind: "stack",
      key: "salesRep",
      heading: "Sales Rep",
      lines: [{ text: r.salesRep, level: 2 as const }],
    },
  ];
  return units.filter((u) => {
    if (off.has(u.key)) return false;
    if (u.kind === "stack") return u.lines.length > 0;
    return true;
  });
}

/* ---- the ways a lane can be ordered ------------------------------------ */

const plannedMs = (r: SalesOrderRow) =>
  (r.kind === "fuel" ? plannedAt(r.fuel)?.getTime() : undefined) ?? Number.POSITIVE_INFINITY;
const qtyOf = (r: SalesOrderRow) => (r.kind === "fuel" ? r.fuel.qtyGal : r.asset.quantity);

const LANE_SORTS: Record<
  string,
  { label: string; compare: (a: SalesOrderRow, b: SalesOrderRow) => number }
> = {
  "time-asc": {
    label: "Schedule time — earliest first",
    compare: (a, b) => plannedMs(a) - plannedMs(b),
  },
  "time-desc": {
    label: "Schedule time — latest first",
    /* No plan stays last in both directions. */
    compare: (a, b) => {
      const av = plannedMs(a);
      const bv = plannedMs(b);
      return (bv === Infinity ? -Infinity : bv) - (av === Infinity ? -Infinity : av) || 0;
    },
  },
  "qty-desc": { label: "Quantity — largest first", compare: (a, b) => qtyOf(b) - qtyOf(a) },
  "qty-asc": { label: "Quantity — smallest first", compare: (a, b) => qtyOf(a) - qtyOf(b) },
  "customer-asc": {
    label: "Customer — A to Z",
    compare: (a, b) => customerOf(a).localeCompare(customerOf(b)),
  },
  "order-desc": {
    label: "Order # — newest first",
    compare: (a, b) => Number(orderNoOf(b)) - Number(orderNoOf(a)),
  },
  "urgent-first": {
    label: "Urgent first",
    compare: (a, b) =>
      Number(b.kind === "fuel" && b.fuel.urgent) - Number(a.kind === "fuel" && a.fuel.urgent),
  },
};

/* EACH LINE KEEPS ITS OWN PAGE'S SORTS (2026-10-07). All drops Quantity —
   gallons against units is not an order — and Asset Orders never had the
   time sorts, because an asset order carries no planned time. */
const COMMON_LANE_SORTS: Record<SalesLine, string[]> = {
  All: ["time-asc", "time-desc", "customer-asc", "order-desc"],
  "Fuel Orders": ["time-asc", "time-desc", "qty-desc", "qty-asc", "customer-asc", "order-desc"],
  "Asset Orders": ["qty-desc", "qty-asc", "customer-asc", "order-desc"],
};

function laneSortKeys(line: SalesLine, lane: string): string[] {
  const urgent =
    line !== "Asset Orders" && (lane === "Requested" || lane === "Scheduled")
      ? ["urgent-first"]
      : [];
  return [...urgent, ...COMMON_LANE_SORTS[line]];
}

/**
 * URGENT AND LATE: a fuel order marked urgent, not yet out of the yard — in
 * a stage before Dispatched, in the settings' order (2026-10-07) — and its
 * planned moment has passed.
 */
const isOverdueUrgent = (r: SalesOrderRow, now: number) => {
  if (r.kind !== "fuel" || !r.fuel.urgent) return false;
  const ids = stageIds();
  const at = ids.indexOf(r.fuel.status);
  return (
    at !== -1 &&
    at < ids.indexOf("Dispatched") &&
    (plannedAt(r.fuel)?.getTime() ?? Number.POSITIVE_INFINITY) < now
  );
};

/** In its stage longer than the stage's SLA (Sales Settings › Workflow). */
const isOverSla = (r: SalesOrderRow, now: number) =>
  r.kind === "fuel"
    ? overSla(r.fuel.status, r.fuel.stageSince, now)
    : overSla(r.asset.status, r.asset.stageSince, now);
const approvalOf = (r: SalesOrderRow) =>
  r.kind === "fuel" ? r.fuel.approvalFor : r.asset.approvalFor;

/** The notification a move into a stage raises (Sales Settings › Notifications). */
const STAGE_EVENT: Record<string, string> = {
  Dispatched: "dispatched",
  Delivered: "delivered",
  Canceled: "canceled",
};
const announceMove = (orderNo: string, to: string) => {
  const event = STAGE_EVENT[to];
  if (event) notify(event, `${orderNo} · ${stageLabel(to)}`);
};

/** The banner's filter, as the chip shelf names it. */
const OVERDUE_FACETS = [{ key: "urgent", label: "Urgent" }];
const OVERDUE_ID = "urgent:Overdue for dispatch";

const uniq = (xs: string[]) => Array.from(new Set(xs));
const sameDay = (a: Date, b: Date) => dateKeyOf(a) === dateKeyOf(b);

/** What to open in a sheet — which kind, which row. */
type Opened = { kind: "fuel" | "asset"; id: string };

export function SalesOrdersScreen({
  focus,
  drill = null,
  onCreateQuote,
}: {
  focus?: { id: string; n: number } | null;
  /** Arrived from the Sales dashboard — the Fuel Orders line, on that day,
   *  narrowed by these column boxes. A nonce so the same press twice lands. */
  drill?: (SalesDrill & { n: number }) | null;
  /** Create Order › Create Quote — opens the Quotes create sheet. */
  onCreateQuote?: () => void;
}) {
  /* THE ORDERS ACCEPTED QUOTES MADE COME FIRST — they live in the quote store,
     which outlives this screen. */
  const fuelSeed = React.useMemo(() => [...quoteOrders(), ...FUEL_ORDERS], []);
  /* SALES SETTINGS DRIVE THE STAGES — their names, order, lanes, SLAs and
     approvals (Pavan, 2026-10-07). Read here so a change re-renders. */
  const settings = useSalesSettings();
  /* TWO SETTERS, TWO CHANGE LOGS — each record keeps its own (activity.tsx). */
  const [fuelRows, setFuelRows] = useLoggedRows(fuelSeed, diffFuelOrder);
  const [assetRows, setAssetRows] = useLoggedRows<AssetOrder>(ASSET_ORDERS, diffAssetOrder);
  /** Ids made on this screen, newest first — they lead the unsorted list. */
  const [createdIds, setCreatedIds] = React.useState<string[]>([]);
  const rows = React.useMemo<SalesOrderRow[]>(() => {
    const all: SalesOrderRow[] = [
      ...fuelRows.map((f) => ({ kind: "fuel" as const, id: f.id, fuel: f })),
      ...assetRows.map((a) => ({ kind: "asset" as const, id: a.id, asset: a })),
    ];
    if (createdIds.length === 0) return all;
    const rank = (id: string) => {
      const i = createdIds.indexOf(id);
      return i === -1 ? Number.POSITIVE_INFINITY : i;
    };
    return [...all].sort((a, b) => rank(a.id) - rank(b.id) || 0);
  }, [fuelRows, assetRows, createdIds]);

  // Picker options come from the data, so a sheet can't offer a value the
  // table has never seen.
  const fuelCustomers = React.useMemo(() => uniq(fuelSeed.map((r) => r.customer.title)), [fuelSeed]);
  const fuelShipTos = React.useMemo(
    () => uniq(fuelSeed.map((r) => r.customer.description)),
    [fuelSeed]
  );
  const productNames = React.useMemo(
    () => uniq(fuelSeed.flatMap((r) => r.products.map((p) => p.name))),
    [fuelSeed]
  );
  const assetCustomers = React.useMemo(() => uniq(ASSET_ORDERS.map((r) => r.customer.title)), []);
  const assetShipTos = React.useMemo(() => uniq(ASSET_ORDERS.map((r) => r.shipTo)), []);

  /* THE LINE OF SERVICE — All by default, as 3PL's. It narrows the list
     before everything else on the page. */
  const [line, setLine] = React.useState<SalesLine>("All");
  const [opened, setOpened] = React.useState<Opened | null>(null);
  const [creating, setCreating] = React.useState<"fuel" | "asset" | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SalesOrderColumnKey; dir: "asc" | "desc" } | null>(
    null
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<SalesOrderColumnKey>>(new Set());
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [range, setRange] = React.useState<DateRange>(() => defaultRangeFor("All"));
  const [cardOff, setCardOff] = React.useState<Record<string, ReadonlySet<string>>>({});
  const [cardScope, setCardScope] = React.useState<string | null>(null);
  const cardUnits = React.useMemo(() => unitsFor(line), [line]);
  /* On All lanes a field reads hidden unless it shows in EVERY lane. */
  const scopedHidden = React.useMemo<ReadonlySet<string>>(() => {
    if (cardScope) return cardOff[cardScope] ?? EMPTY_SET;
    const out = new Set<string>();
    for (const u of ALL_UNITS) {
      if (stageIds(settings).some((l) => (cardOff[l] ?? EMPTY_SET).has(u.key))) out.add(u.key);
    }
    return out;
  }, [cardOff, cardScope, settings]);
  const [laneSort, setLaneSort] = React.useState<Record<string, string | undefined>>({});
  /** The banner's Show orders — exactly the urgent orders overdue for dispatch. */
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /* LIST VIEW (Pavan, 2026-10-29) — the picked order and status pill. */
  const [listId, setListId] = React.useState<string | null>(null);
  const [listStatus, setListStatus] = React.useState<string | null>(null);
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  /* EXPORT ASKS FIRST (G10, Pavan, 2026-10-07) — 3PL's ExportSheet. */
  const [exporting, setExporting] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );

  /* THE FACETS — the two pages' sets, as the line offers them. Line of
     Service is the switch, so it is not one of them. */
  const facets = React.useMemo<ListFacet[]>(() => {
    const fuel = rows.filter((r) => r.kind === "fuel" && inSalesLine(line, r));
    const assets = rows.filter((r) => r.kind === "asset" && inSalesLine(line, r));
    const inLine = [...fuel, ...assets];
    return [
      /* ORDER KIND IS A FILTER (Pavan, 2026-10-21) — it was the All · Fuel
         Orders · Asset Orders switch above the list. One kind ticked sets the
         list to that kind, as the switch did. */
      { key: "orderKind", label: "Order Kind", options: ["Fuel Orders", "Asset Orders"] },
      ...(line !== "Asset Orders"
        ? [{ key: "type", label: "Type", options: ["Delivery", "Extraction"] }]
        : []),
      { key: "status", label: "Status", options: stageIds(settings).map((id) => stageLabel(id, settings)) },
      {
        key: "customer",
        label: "Customer",
        options: uniq(inLine.map(customerOf)),
        searchable: true,
      },
      { key: "shipTo", label: "Ship-To", options: uniq(inLine.map(shipToOf)), searchable: true },
      ...(line !== "Asset Orders"
        ? [
            {
              key: "product",
              label: "Product",
              options: uniq(
                fuel.flatMap((r) => (r.kind === "fuel" ? r.fuel.products.map((p) => p.name) : []))
              ),
              searchable: true,
            },
          ]
        : []),
      ...(line !== "Fuel Orders"
        ? [
            { key: "assetType", label: "Asset Type", options: ASSET_TYPES, searchable: true },
            { key: "salesRep", label: "Sales Rep", options: SALES_REPS },
          ]
        : []),
    ];
  }, [rows, line, settings]);

  React.useEffect(() => {
    if (!drill) return;
    /* THE DASHBOARD COUNTS FUEL ORDERS, so it lands on that line. */
    const day = startOfDay(drill.date);
    setRange({ from: day, to: day });
    setOverdueOnly(false);
    setFacetSel(new Set(["orderKind:Fuel Orders"]));
    setSearch("");
    setColQuery("");
    setView("table");
    setColFilters(drill.colFilters);
    setColFiltersOpen(Object.keys(drill.colFilters).length > 0);
    setPage(1);
  }, [drill]);

  // A global-search hit lands here: open that order's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(null);
    setOpened({ kind: focus.id.startsWith("ao-") ? "asset" : "fuel", id: focus.id });
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const fromKey = dateKeyOf(range.from);
  const toKey = dateKeyOf(range.to);
  const onDate = React.useMemo(
    () =>
      rows.filter(
        (r) => inSalesLine(line, r) && dateKeyOfRow(r) >= fromKey && dateKeyOfRow(r) <= toKey
      ),
    [rows, line, fromKey, toKey]
  );
  /* OVERDUE IS A CLAIM ABOUT THE CLOCK, so the clock is read once a minute. */
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const searched = React.useMemo(
    () =>
      onDate.filter(
        (r) =>
          (!q || matchesSalesOrder(r, q)) &&
          (!cq || salesOrderColumnText(r, colScope).toLowerCase().includes(cq)) &&
          (!overdueOnly || isOverdueUrgent(r, now)) &&
          activeColFilters.every(([key, value]) =>
            salesOrderColumnText(r, key).toLowerCase().includes(value.trim().toLowerCase())
          )
      ),
    [onDate, q, cq, colScope, activeColFilters, overdueOnly, now]
  );
  /* AND across facets, OR within one. A facet only one kind has leaves the
     other kind out once it is ticked. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const on = (facet: string) => [...sel].some((id) => id.startsWith(`${facet}:`));
      const pass = (facet: string, values: string[]) =>
        !on(facet) || values.some((v) => sel.has(`${facet}:${v}`));
      return searched.filter(
        (r) =>
          pass("orderKind", [r.kind === "fuel" ? "Fuel Orders" : "Asset Orders"]) &&
          pass("type", r.kind === "fuel" ? [r.fuel.type.label] : []) &&
          pass("status", [stageLabel(statusOf(r))]) &&
          pass("customer", [customerOf(r)]) &&
          pass("shipTo", [shipToOf(r)]) &&
          pass("product", r.kind === "fuel" ? r.fuel.products.map((p) => p.name) : []) &&
          pass("assetType", r.kind === "asset" ? [r.asset.assetType] : []) &&
          pass("salesRep", r.kind === "asset" ? [r.asset.salesRep] : [])
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
  const sorted = React.useMemo(
    () => sortSalesOrders(filtered, sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the stage order and names sort and group the rows
    [filtered, sort, settings]
  );

  /* THE BANNER — urgent fuel orders whose planned time has gone by. Derived,
     never seeded, and absent when there are none. */
  const overdue = React.useMemo(() => onDate.filter((r) => isOverdueUrgent(r, now)), [onDate, now]);

  const boardLanes = React.useMemo<BoardLane[]>(
    () =>
      stageIds(settings).map((stage) => {
        let cards = sorted.filter((r) => statusOf(r) === stage);
        const chosen = laneSort[stage];
        const cmp =
          chosen && laneSortKeys(line, stage).includes(chosen)
            ? LANE_SORTS[chosen]?.compare
            : undefined;
        if (cmp) cards = [...cards].sort(cmp);
        const off = cardOff[stage] ?? EMPTY_SET;
        return {
          key: stage,
          /* AN ADDED STAGE IS A LANE, under its name (2026-10-07). */
          title: stageLabel(stage, settings),
          color: stageLaneColor(stage, settings),
          apart: stage === "Canceled",
          emptyLabel: "No orders",
          cards: cards.map((r) => {
            /* OVER SLA IS A WARNING (critical); A MOVE WAITING ON APPROVAL
               WAITS ON SOMEBODY (caution) — ui §10b. */
            const badges = [
              ...(isOverSla(r, now) ? [{ label: "Over SLA", tone: "critical" as const }] : []),
              ...(approvalOf(r) ? [{ label: "Needs approval", tone: "caution" as const }] : []),
            ];
            return {
              id: r.id,
              title: orderNoOf(r),
              code: salesTypeCode(r),
              badges: badges.length ? badges : undefined,
              units: r.kind === "fuel" ? fuelCardUnits(r.fuel, off) : assetCardUnits(r.asset, off),
            };
          }),
        };
      }),
    [sorted, laneSort, cardOff, line, settings, now]
  );

  /* THE LIST VIEW'S ROWS — the board's cards, in lane order. */
  const listItems: ListSplitItem[] = React.useMemo(
    () =>
      boardLanes.flatMap((l) =>
        l.cards.map((card) => {
          const r = sorted.find((x) => x.id === card.id)!;
          const st = statusOf(r);
          return {
            card,
            status: st,
            label: stageLabel(st, settings),
            tone: stageTone(st, settings),
            when:
              r.kind === "fuel"
                ? r.fuel.planned
                  ? `${r.fuel.planned.date}, ${r.fuel.planned.time}`
                  : "Not planned"
                : r.asset.date.title,
          };
        })
      ),
    [boardLanes, sorted, settings]
  );

  /* ✕ is "I have seen this"; snooze is a deadline. Both reset with the range. */
  const [alertDismissed, setAlertDismissed] = React.useState(false);
  const [snoozedUntil, setSnoozedUntil] = React.useState<number | null>(null);
  React.useEffect(() => {
    setAlertDismissed(false);
    setSnoozedUntil(null);
  }, [fromKey, toKey]);
  React.useEffect(() => {
    if (snoozedUntil == null) return;
    const ms = snoozedUntil - Date.now();
    if (ms <= 0) {
      setSnoozedUntil(null);
      return;
    }
    const t = window.setTimeout(() => setSnoozedUntil(null), ms);
    return () => window.clearTimeout(t);
  }, [snoozedUntil]);
  const alertVisible = overdue.length > 0 && !alertDismissed && snoozedUntil == null;

  /* A GROUP'S TOTAL ONLY WHERE IT ADDS UP — gallons on Fuel Orders, units on
     Asset Orders, none on All (2026-10-07). */
  const measureUnit =
    line === "Fuel Orders" ? UNIT_SHORT[settings.unit] : line === "Asset Orders" ? "units" : undefined;
  const measureOf = React.useCallback((r: SalesOrderRow) => qtyOf(r), []);
  const g = useGrouping<SalesOrderRow, SalesOrderColumnKey>({
    dimensions: SALES_ORDER_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r: SalesOrderRow) => r.id, []),
    measureOf: measureUnit ? measureOf : undefined,
    hiddenColumns: hidden,
    page,
    pageSize,
  });
  const pageRows = g.visibleRows;

  const current: SalesViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    columnOrder,
    columnWidths,
    pageSize,
    dateKey: fromKey,
    dateKeyTo: toKey,
    colScope,
    colQuery,
    groupBy: g.groupBy,
    colFilters,
    cardOff: cardOffToArrays(cardOff),
    laneSort,
    overdueOnly,
    facets: [...facetSel].sort(),
    mode: view,
  };
  /* DEFAULT OPENS ON THE LINE'S OWN DAY — today, or tomorrow on Asset Orders. */
  const defaultState: SalesViewState = React.useMemo(() => {
    const r = defaultRangeFor(line);
    return {
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      columnOrder: [],
      columnWidths: {},
      pageSize: 25,
      dateKey: dateKeyOf(r.from),
      dateKeyTo: dateKeyOf(r.to),
      colScope: "customer",
      colQuery: "",
      groupBy: [],
      colFilters: {},
      cardOff: {},
      laneSort: {},
      overdueOnly: false,
      facets: [],
      mode: "table",
    };
  }, [line]);

  const applyState = (st: SalesViewState) => {
    setSearch(st.search);
    setSort(
      st.sortKey && st.sortDir ? { key: st.sortKey as SalesOrderColumnKey, dir: st.sortDir } : null
    );
    setHidden(new Set(st.hidden as SalesOrderColumnKey[]));
    setColumnOrder(st.columnOrder ?? []);
    setColumnWidths(st.columnWidths ?? {});
    setPageSize(st.pageSize);
    const [y, m, d] = st.dateKey.split("-").map(Number);
    const [ty, tm, td] = (st.dateKeyTo ?? st.dateKey).split("-").map(Number);
    setRange({ from: new Date(y, m - 1, d), to: new Date(ty, tm - 1, td) });
    setCardOff(
      Object.fromEntries(Object.entries(st.cardOff ?? {}).map(([k, v]) => [k, new Set(v)]))
    );
    setLaneSort(st.laneSort ?? {});
    setOverdueOnly(Boolean(st.overdueOnly));
    setFacetSel(new Set(st.facets ?? []));
    setColScope(st.colScope);
    setColQuery(st.colQuery);
    const filters = st.colFilters ?? {};
    setColFilters(filters);
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    setView(st.mode ?? "table");
    g.setGrouping(st.groupBy ?? []);
    setPage(1);
  };

  const savedViews = useSavedViews({
    current,
    defaultState,
    keyOf: salesViewStateKey,
    apply: applyState,
    /* REMEMBERED ACROSS VISITS (Pavan, 2026-10-09); a dashboard drill wins. */
    storageKey: "sales-orders",
    restore: !drill,
  });

  /*
    PICKING A LINE (Pavan, 2026-10-07). A tab selection, as 3PL's. Two things
    follow it:
      • ON A FRESH DEFAULT VIEW, THE DAY FOLLOWS THE LINE — Asset Orders opens
        on tomorrow, All and Fuel Orders on today. "Fresh" is the Default tab
        with its range never moved from the line being left; a range somebody
        chose, or a saved view's, stays put.
      • Ticks and the banner's filter the new line has no facet for are
        dropped — a narrowing with no chip to clear it would be invisible.
  */
  const changeLine = (next: SalesLine) => {
    if (next === line) return;
    const was = defaultRangeFor(line);
    if (
      savedViews.activeId === null &&
      sameDay(range.from, was.from) &&
      sameDay(range.to, was.to)
    ) {
      setRange(defaultRangeFor(next));
    }
    const offered = new Set(
      [
        "orderKind",
        "status",
        "customer",
        "shipTo",
        ...(next !== "Asset Orders" ? ["type", "product"] : []),
        ...(next !== "Fuel Orders" ? ["assetType", "salesRep"] : []),
      ]
    );
    setFacetSel((prev) => new Set([...prev].filter((id) => offered.has(id.split(":")[0]))));
    if (next === "Asset Orders") setOverdueOnly(false);
    setLine(next);
    setPage(1);
  };

  /* THE LINE FOLLOWS THE ORDER KIND FILTER — exactly one kind ticked is that
     kind's list; none or both is All. */
  React.useEffect(() => {
    const kinds = [...facetSel].filter((id) => id.startsWith("orderKind:")).map((id) => id.slice(10));
    changeLine(kinds.length === 1 ? (kinds[0] as SalesLine) : "All");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetSel]);

  const onSort = (key: SalesOrderColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  /* ---- the bulk bar — fuel edits reach the fuel rows of a selection ----- */

  /* A MIXED SELECTION (Pavan, 2026-10-07): the five field edits are a fuel
     order's fields, so they reach the fuel orders in it; Delete reaches every
     order selected. Previews read the full row list, not the page. */
  const selectedFuel = React.useMemo(
    () => fuelRows.filter((r) => selectedIds.has(r.id)),
    [fuelRows, selectedIds]
  );
  const unselectedFuel = React.useMemo(
    () => fuelRows.filter((r) => !selectedIds.has(r.id)),
    [fuelRows, selectedIds]
  );
  const applyToSelected = (fn: (r: FuelOrder) => FuelOrder) =>
    setFuelRows((prev) => prev.map((r) => (selectedIds.has(r.id) ? fn(r) : r)));

  const bulk = {
    setProducts: (names: string[]) =>
      applyToSelected((r) => {
        const split = splitGallons(r.qtyGal, names.length);
        return { ...r, products: names.map((name, i) => ({ name, gal: split[i] })) };
      }),
    setDriver: (driver: string | null) =>
      applyToSelected((r) => {
        /* THE SAME RULE AS THE SHEET'S PICK — the settings' stage before
           Scheduled, its approval and the quote rule (2026-10-07). */
        const status = driverStage(r, Boolean(driver));
        return {
          ...r,
          driver: driver ? { name: driver, initials: initialsOf(driver) } : null,
          status,
          stageSince: status !== r.status ? new Date().toISOString() : r.stageSince,
        };
      }),
    setPlannedDate: (d: Date) =>
      applyToSelected((r) => ({
        ...r,
        planned: { date: DATE_FMT.format(d), time: r.planned?.time ?? "12:00 PM" },
      })),
    setPlannedTime: (time: string) =>
      applyToSelected((r) => ({
        ...r,
        planned: { date: r.planned?.date ?? r.date.title, time },
      })),
    addTags: (tags: string[]) =>
      applyToSelected((r) => ({ ...r, tags: Array.from(new Set([...r.tags, ...tags])) })),
    remove: () => {
      setFuelRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setAssetRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    },
  };

  /* ---- create and autosave ---------------------------------------------- */

  /**
   * A NEW ORDER HAS TO BE WHERE THE READER IS LOOKING — 3PL's `revealOn`: the
   * range widens to take its day, and a line that leaves its kind out moves
   * to the kind's own line.
   */
  const revealOn = (when: Date, kind: "fuel" | "asset") => {
    setRange((r) => {
      const day = startOfDay(when);
      if (day >= startOfDay(r.from) && day <= startOfDay(r.to)) return r;
      return {
        from: day < startOfDay(r.from) ? day : r.from,
        to: day > startOfDay(r.to) ? day : r.to,
      };
    });
    /* A new order of the other kind than the one filtered — drop the kind
       filter so it shows. */
    if (line !== "All" && line !== (kind === "fuel" ? "Fuel Orders" : "Asset Orders")) {
      setFacetSel((prev) => new Set([...prev].filter((id) => !id.startsWith("orderKind:"))));
    }
  };

  const relative = (date: Date) =>
    relativeLabel(Math.round((date.getTime() - startOfDay(new Date()).getTime()) / 86_400_000), date);

  /**
   * Create Fuel Order. The order number continues the fuel series (+2); the
   * delivery date is the first day of the range, so it lands on screen. THE
   * SHEET IS HANDED OVER TO THE NEW ROW: same sheet, now with a number, and
   * every edit from here on autosaves.
   */
  const createFuel = (draft: OrderDraft) => {
    const date = range.from;
    const nextNo = Math.max(...fuelRows.map((r) => Number(r.orderNo))) + 2;
    const newRow: FuelOrder = {
      id: `fo-new-${nextNo}`,
      orderNo: String(nextNo),
      type: {
        code: draft.typeCode,
        label: draft.typeCode === "D" ? "Delivery" : "Extraction",
      },
      customer: { title: draft.customer, description: draft.shipTo },
      products: draft.products,
      qtyGal: draft.products.reduce((n, p) => n + p.gal, 0),
      date: { title: DATE_FMT.format(date), description: relative(date) },
      dateKey: dateKeyOf(date),
      planned: draft.plannedDate
        ? { date: DATE_FMT.format(draft.plannedDate), time: draft.plannedTime || "12:00 PM" }
        : null,
      tags: draft.tags,
      status: driverStage({ status: "Requested" }, Boolean(draft.driver)),
      stageSince: new Date().toISOString(),
      urgent: draft.urgent,
      poc: draft.poc,
      driver: draft.driver ? { name: draft.driver, initials: initialsOf(draft.driver) } : null,
      extra: draft.extra,
    };
    setFuelRows((prev) => [newRow, ...prev]);
    /* ORDER CREATED, AND URGENT ORDER CREATED — Sales Settings ›
       Notifications (2026-10-07). */
    notify("created", `Order ${newRow.orderNo} created`);
    if (newRow.urgent) notify("urgent", `Urgent order ${newRow.orderNo} created`);
    setCreatedIds((prev) => [newRow.id, ...prev]);
    revealOn(date, "fuel");
    setPage(1);
    setCreating(null);
    setOpened({ kind: "fuel", id: newRow.id });
  };

  /** Fold a fuel sheet draft back onto its row — the sheet's autosave. */
  const saveFuel = React.useCallback(
    (order: FuelOrder, draft: OrderDraft) => {
      const plannedDate = draft.plannedDate;
      const time = draft.plannedTime.trim();
      /* A HALF-TYPED TIME IS NOT A PLAN. */
      const readable = /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time);
      const status = driverStage(
        { status: draft.status, fromQuote: order.fromQuote },
        Boolean(draft.driver)
      );
      /* A MOVE STARTS THE STAGE'S CLOCK, and says so if its row asks. */
      const moved = status !== order.status;
      if (moved) announceMove(order.orderNo, status);
      setFuelRows((prev) =>
        prev.map((r) =>
          r.id !== order.id
            ? r
            : {
                ...r,
                type: {
                  code: draft.typeCode,
                  label: draft.typeCode === "D" ? "Delivery" : "Extraction",
                },
                customer: { title: draft.customer, description: draft.shipTo },
                products: draft.products,
                qtyGal: draft.products.reduce((n, p) => n + p.gal, 0),
                planned:
                  !plannedDate || !time
                    ? null
                    : readable
                      ? { date: DATE_FMT.format(plannedDate), time }
                      : r.planned,
                status,
                stageSince: moved ? new Date().toISOString() : r.stageSince,
                approvalFor: draft.approvalFor,
                urgent: draft.urgent,
                poc: draft.poc,
                driver: draft.driver
                  ? { name: draft.driver, initials: initialsOf(draft.driver) }
                  : null,
                tags: draft.tags,
                extra: draft.extra,
              }
        )
      );
    },
    [setFuelRows]
  );

  /** Create Asset Order — the 61xxxxx series in steps of 3, handed over. */
  const createAsset = (draft: AssetOrderDraft) => {
    const when = draft.deliveryDate ?? range.from;
    const nextNo = Math.max(...assetRows.map((r) => Number(r.orderNo))) + 3;
    const newRow: AssetOrder = {
      id: `ao-new-${nextNo}`,
      orderNo: String(nextNo),
      customer: { title: draft.customer, description: draft.erpId },
      salesRep: draft.salesRep,
      date: { title: DATE_FMT.format(when), description: relative(when) },
      dateKey: dateKeyOf(when),
      status: draft.status,
      assetType: draft.assetType,
      quantity: draft.quantity,
      serialNo: draft.serialNo,
      shipTo: draft.shipTo,
      poNumber: draft.poNumber,
      note: draft.note,
      poc: draft.poc,
      stageSince: new Date().toISOString(),
      extra: draft.extra,
    };
    setAssetRows((prev) => [newRow, ...prev]);
    notify("created", `Order ${newRow.orderNo} created`);
    setCreatedIds((prev) => [newRow.id, ...prev]);
    revealOn(when, "asset");
    setPage(1);
    setCreating(null);
    setOpened({ kind: "asset", id: newRow.id });
  };

  const saveAsset = React.useCallback(
    (order: AssetOrder, draft: AssetOrderDraft) => {
      const moved = draft.status !== order.status;
      if (moved) announceMove(order.orderNo, draft.status);
      setAssetRows((prev) =>
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
                stageSince: moved ? new Date().toISOString() : r.stageSince,
                approvalFor: draft.approvalFor,
                extra: draft.extra,
                poNumber: draft.poNumber,
                note: draft.note,
                poc: draft.poc,
                ...(draft.deliveryDate
                  ? {
                      date: {
                        title: DATE_FMT.format(draft.deliveryDate),
                        description: relativeLabel(
                          Math.round(
                            (draft.deliveryDate.getTime() - startOfDay(new Date()).getTime()) /
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
    },
    [setAssetRows]
  );

  const openRow = (r: SalesOrderRow) => {
    setCreating(null);
    setOpened({ kind: r.kind, id: r.id });
  };
  const openById = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (r) openRow(r);
  };
  const closeSheet = (o: boolean) => {
    if (o) return;
    setCreating(null);
    setOpened(null);
  };

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  /* ---- cells ------------------------------------------------------------ */

  const dash = <span className="text-sm text-muted-foreground">—</span>;
  const renderCell = (r: SalesOrderRow, key: SalesOrderColumnKey) => {
    const f = [colFilters[key], search];
    switch (key) {
      case "order":
        return <span className="truncate text-sm tabular-nums text-foreground">{orderNoOf(r)}</span>;
      case "type": {
        /* THE PILL STYLE, a trial after Lovable (Pavan, 2026-10-09) — on the
           columns that were already chips: Type, Status, Tags. */
        /* THE FULL TAG, in the colour chosen for it in Sales Settings
           (Pavan, 2026-10-09). */
        const c = salesTypeCode(r);
        return <Pill color={typeColor(c.label, settings)}>{c.label}</Pill>;
      }
      case "customer":
        return <TwoLineCell title={customerOf(r)} description={shipToOf(r)} q={f} />;
      case "products":
        return r.kind === "fuel" ? (
          <ProductCell products={r.fuel.products} />
        ) : (
          <span className="truncate text-sm text-foreground">{r.asset.assetType}</span>
        );
      case "qty":
        return r.kind === "fuel" ? (
          <QtyCell products={r.fuel.products} total={r.fuel.qtyGal} />
        ) : (
          <span className="text-sm text-foreground">
            <span className="font-medium tabular-nums">{r.asset.quantity}</span>{" "}
            <span className="text-xs text-muted-foreground">
              {r.asset.quantity === 1 ? "unit" : "units"}
            </span>
          </span>
        );
      case "date": {
        const d = dateOf(r);
        return <TwoLineCell title={d.title} description={d.description ?? ""} q={f} />;
      }
      case "planned":
        return r.kind === "fuel" ? <PlannedCell planned={r.fuel.planned} /> : dash;
      case "status":
        /* THE STAGE'S NAME AND KIND from Sales Settings; OVER SLA beside it
           as a critical chip, a move waiting on approval as a caution one
           (Pavan, 2026-10-07). */
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Pill kind={stageKind(statusOf(r), settings)} color={stageColor(statusOf(r), settings)}>
              {stageLabel(statusOf(r), settings)}
            </Pill>
            {isOverSla(r, now) && <Pill kind="critical">Over SLA</Pill>}
            {approvalOf(r) && <Pill kind="caution">Needs approval</Pill>}
          </span>
        );
      case "driver":
        if (r.kind !== "fuel") return dash;
        /* THE NAME ALONE — no initials beside it (Pavan, 2026-10-09). */
        return r.fuel.driver ? (
          <span className="truncate text-sm text-foreground">{r.fuel.driver.name}</span>
        ) : (
          <span className="truncate text-sm italic text-muted-foreground">— Unassigned</span>
        );
      case "salesRep":
        return r.kind === "asset" ? (
          <span className="truncate text-sm text-foreground">{r.asset.salesRep}</span>
        ) : (
          dash
        );
      case "tags":
        return r.kind === "fuel" ? <PillList values={r.fuel.tags} label="tags" /> : dash;
      default:
        return null;
    }
  };

  /* THE WINDOW, IN WORDS — one day reads as a date, a range as a range. */
  const rangeLabel =
    fromKey === toKey
      ? formatFullDate(range.from)
      : `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`;
  const noun = line === "Fuel Orders" ? "fuel orders" : line === "Asset Orders" ? "asset orders" : "orders";

  /* EVERY NARROWING THAT IS ON, for the export sheet to list — each drops
     what the shelf's own chip drops (3PL's, 2026-10-07). The line of service
     is which list this is, not a filter, so it is not in here. */
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
      label: SALES_ORDER_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: SALES_ORDER_COLUMNS.find((c) => c.key === key)?.label ?? key,
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
    {
      key: "urgent",
      label: "Urgent",
      values: overdueOnly
        ? [{ value: "Overdue for dispatch", onRemove: () => { setOverdueOnly(false); setPage(1); } }]
        : [],
    },
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

  const openFuel =
    opened?.kind === "fuel" ? (fuelRows.find((r) => r.id === opened.id) ?? null) : null;
  const openAsset =
    opened?.kind === "asset" ? (assetRows.find((r) => r.id === opened.id) ?? null) : null;

  /* THE PICKER'S "All dates" AND LIVE COUNT — read off every record's day. */
  const dateWindow = React.useMemo(() => dateWindowOf(rows.map(dateKeyOfRow)), [rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create Order"
        /* CREATE IS A MENU, as 3PL's — three different forms, so the choice
           comes before the form (Pavan, 2026-10-07). */
        createMenu={[
          { key: "fuel", label: "Create Fuel Order" },
          { key: "asset", label: "Create Asset Order" },
          { key: "quote", label: "Create Quote" },
        ]}
        onCreateSelect={(key) => {
          if (key === "quote") {
            onCreateQuote?.();
            return;
          }
          setOpened(null);
          setCreating(key === "asset" ? "asset" : "fuel");
        }}
        onExport={() => setExporting(true)}
      />


      <div className="mt-4 shrink-0">
        <ListToolbar
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={view === "list" ? listSplitCount(listItems, listStatus) : sorted.length} one="order" many="orders" rest={view === "board" ? `across ${boardLanes.filter((l) => l.cards.length > 0).length} of ${boardLanes.length} lanes · ${rangeLabel}` : `· ${rangeLabel}`} />}
          boardView
          mapView
          listView
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search orders, sites, drivers…"
          /* Not on the board, which is already grouped — by lane. */
          showGroupBy={view !== "board"}
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
          cardFields={{
            units: cardUnits,
            hidden: scopedHidden,
            scope: cardScope,
            scopes: stageIds(settings).map((stage) => ({ key: stage, label: stageLabel(stage, settings) })),
            onScopeChange: setCardScope,
            onShowAll: () =>
              setCardOff((prev) => {
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope)) next[lane] = new Set();
                return next;
              }),
            onToggle: (k) =>
              setCardOff((prev) => {
                const turningOff = !scopedHidden.has(k);
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope)) {
                  next[lane] = toggleField(prev[lane] ?? EMPTY_SET, k, turningOff);
                }
                return next;
              }),
          }}
          searchFields={SALES_ORDER_SEARCH_FIELDS}
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
                    /* Closing the row clears it. */
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
        {/* ONE SHELF for the ticks, the banner's filter and the column search. */}
        <FilterChips
          facets={[...facets, ...OVERDUE_FACETS]}
          selected={new Set([...facetSel, ...(overdueOnly ? [OVERDUE_ID] : [])])}
          onChange={(next) => {
            setOverdueOnly(next.has(OVERDUE_ID));
            setFacetSel(new Set([...next].filter((id) => id !== OVERDUE_ID)));
            setPage(1);
          }}
        >
          <ColumnSearchChip
            /* ALONE ON THE SHELF it keeps its own top margin (Pavan, 2026-10-07). */
            className={facetSel.size > 0 || overdueOnly ? "" : undefined}
            searchFields={SALES_ORDER_SEARCH_FIELDS}
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

      {/* `relative` anchors the floating bulk-action bar. */}
      {/* THE BANNER SITS UNDER SEARCH AND FILTERS (Pavan, 2026-10-25 — every
          module): the tools first, then what needs attention, then the list
          it narrows. */}
      {/* THE DS ALERT BANNER (Pavan, 2026-10-15) — the count in the tag, and
          its filter as "View details" beside the words, which becomes
          "Clear filter" while the overdue filter is on. */}
      {alertVisible && (
        <AlertBanner
          className="mt-4 shrink-0"
          alerts={[
            {
              id: "overdue",
              status: "warning",
              tag: "Overdue",
              /* THE STAGE BY ITS NAME — renamed in Sales Settings, renamed here. */
              title: `${overdue.length} urgent ${overdue.length === 1 ? "order" : "orders"} overdue for dispatch`,
              count: overdue.length,
              onApply: () => {
                setOverdueOnly(true);
                setPage(1);
              },
            },
          ]}
          appliedId={overdueOnly ? "overdue" : null}
          onClearApplied={() => {
            setOverdueOnly(false);
            setPage(1);
          }}
          onSnooze={(_id, ms) => setSnoozedUntil(Date.now() + ms)}
          onDismiss={() => setAlertDismissed(true)}
        />
      )}

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">{q ? <SearchX /> : <CalendarOff />}</EmptyMedia>
                <EmptyTitle>{q ? "No matching orders" : "Nothing scheduled"}</EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No ${noun} in ${rangeLabel} match “${search.trim()}”.`
                    : `No ${noun} are scheduled for ${rangeLabel}.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (q) setSearch("");
                    else {
                      const today = startOfDay(new Date());
                      setRange({ from: today, to: today });
                    }
                    setPage(1);
                  }}
                >
                  {q ? "Clear search" : "Go to today"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : view === "map" ? (
            /* THE MAP READS THE SAME LIST THE TABLE DOES — every filter applies. */
            <OrderMapView
              orders={sorted.map((r) => ({
                id: r.id,
                orderNo: orderNoOf(r),
                site: shipToOf(r),
                subtitle: customerOf(r),
                status: stageLabel(statusOf(r), settings),
                tone: stageTone(statusOf(r), settings),
                color: stageColor(statusOf(r), settings),
              }))}
              onOpenOrder={openById}
            />
          ) : view === "list" ? (
            /* LIST VIEW (Pavan, 2026-10-29) — 3PL's unit: rows and status
               pills on the left, the order's own sheet docked on the right. */
            <ListSplitView
              barRef={bar.ref}
              items={listItems}
              steps={stageIds(settings).map((st) => ({ key: st, label: stageLabel(st, settings) }))}
              status={listStatus}
              onStatusChange={setListStatus}
              selectedId={listId}
              onSelect={setListId}
              renderDetail={(id) => {
                const fuel = fuelRows.find((r) => r.id === id);
                const asset = assetRows.find((r) => r.id === id);
                return fuel ? (
                  <OrderSheet
                    order={fuel}
                    mode="edit"
                    open
                    onOpenChange={() => {}}
                    onSave={saveFuel}
                    onCreate={createFuel}
                    customers={fuelCustomers}
                    shipTos={fuelShipTos}
                    productNames={productNames}
                  />
                ) : asset ? (
                  <AssetOrderSheet
                    order={asset}
                    mode="edit"
                    open
                    onOpenChange={() => {}}
                    onSave={saveAsset}
                    onCreate={createAsset}
                    customers={assetCustomers}
                    shipTos={assetShipTos}
                  />
                ) : null;
              }}
            />
          ) : view === "board" ? (
            <BoardWithBar barRef={bar.ref}>
              <BrokerBoard
                lanes={boardLanes}
                onOpenCard={openById}
                laneSortOptions={(laneKey) =>
                  laneSortKeys(line, laneKey).map((k) => ({ key: k, label: LANE_SORTS[k].label }))
                }
                laneSort={laneSort}
                onLaneSortChange={(laneKey, option) =>
                  setLaneSort((prev) => ({ ...prev, [laneKey]: option ?? undefined }))
                }
              />
            </BoardWithBar>
          ) : (
            <ListTable
              topBar={bar.slot}
              rows={pageRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="order"
              groupUnit={measureUnit}
              columns={SALES_ORDER_COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onToggleAll={toggleAll}
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open order ${orderNoOf(r)}`}
              onOpenRow={openRow}
              showColumnFilters={colFiltersOpen}
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
            />
          )}
        </div>

        {view === "table" && selectedIds.size > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <div className="pointer-events-auto">
              <FuelOrdersBulkBar
                count={selectedIds.size}
                editCount={selectedFuel.length}
                onClear={() => setSelectedIds(new Set())}
                onSetProducts={bulk.setProducts}
                onSetDriver={bulk.setDriver}
                onSetPlannedDate={bulk.setPlannedDate}
                onSetPlannedTime={bulk.setPlannedTime}
                onAddTags={bulk.addTags}
                onDelete={bulk.remove}
                productOptions={productNames}
                driverOptions={DRIVER_OPTIONS}
                tagOptions={TAG_OPTIONS}
                selectedOrders={selectedFuel}
                unselectedOrders={unselectedFuel}
              />
            </div>
          </div>
        )}
      </div>

      {/* EXPORT ASKS BEFORE IT ACTS (G10, Pavan, 2026-10-07). What leaves is
          `sorted` — the whole narrowed set, not the page. */}
      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Orders"
        noun={noun}
        nounOne={noun.replace(/s$/, "")}
        count={sorted.length}
        date={
          <DateRangeFilter
            {...dateWindow}
            noun="orders"
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
            fullWidth
          />
        }
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
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? noun.replace(/s$/, "") : noun} as .${format}`);
        }}
      />

      {/* EACH KIND OPENS ITS OWN SHEET — both create-then-autosave. */}
      <OrderSheet
        order={openFuel}
        mode={creating === "fuel" ? "create" : "edit"}
        open={creating === "fuel" || openFuel !== null}
        onOpenChange={closeSheet}
        onSave={saveFuel}
        onCreate={createFuel}
        customers={fuelCustomers}
        shipTos={fuelShipTos}
        productNames={productNames}
      />
      <AssetOrderSheet
        order={openAsset}
        mode={creating === "asset" ? "create" : "edit"}
        open={creating === "asset" || openAsset !== null}
        onOpenChange={closeSheet}
        onSave={saveAsset}
        onCreate={createAsset}
        customers={assetCustomers}
        shipTos={assetShipTos}
      />

      {/* THE BOARD GETS A TOTAL INSTEAD OF PAGINATION (G19, Pavan, 2026-10-07)
          — 3PL's line: the lane counts add up to it, and it states the window. */}
      {view === "map" && sorted.length > 0 && (
        <div className="mt-4 flex shrink-0 items-baseline gap-2 text-sm">
          <span className="font-medium text-foreground">
            {sorted.length.toLocaleString()}{" "}
            {sorted.length === 1 ? noun.replace(/s$/, "") : noun}
          </span>
          <span className="text-muted-foreground">
            across {boardLanes.filter((l) => l.cards.length > 0).length} of{" "}
            {boardLanes.length} lanes · {rangeLabel}
          </span>
        </div>
      )}

      <div className={cn("mt-4 shrink-0", view !== "table" && "hidden")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="order"
            total={g.total}
            unit={measureUnit}
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
