import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "../data";
import { CUSTOMERS } from "../customers";
import type { TwoLine } from "../types";
import { VENDORS } from "./vendors";

/*
  3PL (brokerage) orders — the broker's Order Dashboard dataset.

  PROVENANCE. Unlike the Sales screens, which were transcribed from screenshots,
  this module's MODEL is transcribed from FleetPanda's own product spec
  ("3PL (Third-Party Logistics)", the 3PL-102 doc). Everything structural below
  is quoted from it, not guessed:

    • The seven-stage lifecycle and its exact order (§5.2 "Order Stages"), with
      the core progression stated as
        Draft -> Assigned -> Accepted -> Completed -> Accounting Sync Ready
        -> Accounting Synced
      and BLOCKED positioned between Created and Assigned ("Order is blocked due
      to a customer credit issue").
    • The order-type filter tabs All / Regular / Recurring / Movement (§5.2
      "Order Type Filter Tabs"), which is why `kind` exists as a field separate
      from `orderType`.
    • Order numbering: Movement Orders carry an "M" prefix, standard delivery
      orders "D" (§5.20 "Order numbering").
    • The create-order field set, section by section (§5.3): customer + ship-to,
      planned date with a start/end time WINDOW, PO number, order type, urgent
      flag, signature-on-delivery, hub, asset/product lines with a per-line
      top-off toggle, primary POC, salesperson, delivery instructions.
    • Multiple vendors invited at once, first to accept wins (§5.5–5.7), which is
      why `invitedVendorIds` is a list and `vendorId` is the one that accepted.
    • Movement orders default to the Request-Quote pricing flow and take Fee +
      Tax rather than rate-per-gallon (§5.20).

  STATUS IS AN EXPLICIT FIELD, deliberately. The Fuel Orders screen derives its
  status from whether a driver is assigned, and `HANDOFF.md` open question 1
  records that this contradicted the source app. Here the spec states a lifecycle
  outright, so it is stored, not computed — and the invariants that tie it to the
  vendor fields are asserted in `assertConsistent` below rather than left to the
  seeds to get right by hand.

  INVENTED, and flagged: order numbers, the delivery windows, the gallon
  quantities, POC and salesperson names, hub names, delivery instructions, and
  the quote figures. Customer names and ship-tos are REUSED from the Sales
  `customers.ts` dataset, which is faithful rather than lazy — the spec says
  customer entities sync from Dispatch and are the same records ("customer-
  related entities are synced almost in real-time between Dispatch and 3PL").
*/

/** §5.2 Order Stages, in the spec's own order. Blocked sits after Draft. */
export type BrokerStatus =
  | "Draft"
  | "Blocked"
  | "Assigned"
  | "Accepted"
  | "Completed"
  | "Accounting Sync Ready"
  | "Accounting Synced";

/** Lane / tab order. The board renders lanes in exactly this sequence. */
export const BROKER_STATUSES: BrokerStatus[] = [
  "Draft",
  "Blocked",
  "Assigned",
  "Accepted",
  "Completed",
  "Accounting Sync Ready",
  "Accounting Synced",
];

/** What the dashboard's filter tabs split on (§5.2). NOT the Order Type field. */
export type OrderKind = "Regular" | "Recurring" | "Movement";

export const ORDER_KINDS: OrderKind[] = ["Regular", "Recurring", "Movement"];

/**
 * The Order Type field from §5.3 Section 2 ("Classify the order (e.g.,
 * Emergency, Core)"). Movement orders are auto-set to "Asset Movement" and it is
 * the only type they can take (§5.20), which `assertConsistent` enforces.
 */
export type BrokerOrderType = "Core" | "Emergency" | "Asset Movement";

/** §5.20 — a movement order runs in one of two directions. */
export type MovementDirection = "Asset Delivery" | "Asset Pickup";

/**
 * One asset/product line. `topOff` is the spec's per-line-item toggle: an asset
 * marked for top-off carries no requested volume, so `gal` is null and must
 * stay null — the two are mutually exclusive, not merely usually different.
 */
export interface OrderLine {
  asset: string;
  product: string;
  /** Requested gallons, or `null` when the line is a top-off. */
  gal: number | null;
  topOff: boolean;
}

/** A vendor's submitted quote (§5.9 / §5.20). Shape follows the order's kind. */
export interface VendorQuote {
  vendorId: string;
  /** Fuel orders: rate per gallon + a service charge. */
  ratePerGal?: number;
  serviceCharge?: number;
  /** Movement orders: fee + tax instead. Total unit cost = fee + tax. */
  fee?: number;
  tax?: number;
}

export interface BrokerOrder {
  id: string;
  /** "D-104882" or "M-104883" — the prefix is derived from `kind`, never typed. */
  orderNo: string;
  kind: OrderKind;
  orderType: BrokerOrderType;
  /** Customer name over its ERP id — the same two-line cell the Sales lists use. */
  customer: TwoLine;
  shipTo: string;
  /** Planned date, formatted, over its relative label. */
  date: TwoLine;
  /** `YYYY-MM-DD` — what the toolbar's date stepper matches. */
  dateKey: string;
  /** The §5.3 start/end delivery window, e.g. `{ start: "8:00 AM", end: "12:00 PM" }`. */
  window: { start: string; end: string };
  lines: OrderLine[];
  status: BrokerStatus;
  /** The vendor that ACCEPTED. Null until one does. */
  vendorId: string | null;
  /** Every vendor invited. More than one is normal — first to accept wins. */
  invitedVendorIds: string[];
  /** §5.9 — the broker asked for pricing instead of a plain acknowledgement. */
  quoteRequested: boolean;
  quotes: VendorQuote[];
  urgent: boolean;
  signatureOnDelivery: boolean;
  poNumber: string;
  /** Ship-to site name, distinct from the address line in `shipTo`. */
  shipToName: string;
  zip: string;
  state: string;
  createdBy: string;
  tags: string[];
  hub: string;
  primaryPoc: string;
  salesperson: string;
  instructions: string;
  /** Only ever set on `Blocked` — the credit reason shown on the card. */
  blockedReason: string | null;
  /** Movement orders only. */
  movement: {
    direction: MovementDirection;
    yard: string;
    tankType: string;
    capacityGal: number;
  } | null;
}

/** Sum of the requested gallons. Top-off lines contribute nothing — they have no
 *  requested volume, and counting them as 0 is the honest arithmetic. */
export function totalGal(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + (l.gal ?? 0), 0);
}

/** True when every line is a top-off, so the Qty cell reads "Top-off", not "0". */
export function isAllTopOff(lines: OrderLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.topOff);
}

/** Total unit cost of a quote — rate x gallons + charge, or fee + tax. */
export function quoteTotal(q: VendorQuote, gal: number): number {
  if (q.fee !== undefined || q.tax !== undefined) {
    return (q.fee ?? 0) + (q.tax ?? 0);
  }
  return (q.ratePerGal ?? 0) * gal + (q.serviceCharge ?? 0);
}

export type BrokerColumnKey =
  | "order"
  | "customer"
  | "shipTo"
  | "date"
  | "window"
  | "qty"
  | "vendor"
  | "status"
  | "actions";

export interface BrokerColumnDef {
  key: BrokerColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "left" | "right";
}

/** Widths follow the DS column-frame vocabulary; actions = 44 as everywhere. */
export const BROKER_COLUMNS: BrokerColumnDef[] = [
  { key: "order", label: "Order #", width: 130, sortable: true },
  { key: "customer", label: "Customer", width: 230 },
  { key: "shipTo", label: "Ship To", width: 190 },
  { key: "date", label: "Planned Date", width: 165, sortable: true },
  { key: "window", label: "Delivery Window", width: 160 },
  { key: "qty", label: "Qty (Gal)", width: 110, sortable: true, align: "right" },
  { key: "vendor", label: "Delivery Partner", width: 210 },
  { key: "status", label: "Status", width: 200, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export const HUBS = ["Fresno Hub", "Bakersfield Hub", "Sacramento Hub"];

export const POCS = [
  "Marisol Vega",
  "Dwight Feeney",
  "Anita Kaur",
  "Ray Obuya",
  "Colleen Marsh",
];

export const SALESPEOPLE = [
  "Dana Whitfield",
  "Marcus Reed",
  "Priya Raman",
  "Tom Alvarez",
];

export const YARDS = ["Fresno Yard", "Turlock Yard", "Kern Yard"];

/**
 * Statuses the FILTER offers, which is a longer list than the board's lanes.
 *
 * `BROKER_STATUSES` above is the LIFECYCLE — the lanes the board renders, in
 * order. Overdue, Cancelled and Partial Accounting Synced are filterable states
 * that are not lanes: Overdue is a derived condition rather than a stage,
 * Cancelled is a terminal exit, and Partial Accounting Synced sits between two
 * lanes. Keeping the two lists apart means adding a filter option never
 * silently adds a board lane.
 */
export const BROKER_STATUS_FILTERS = [
  "Overdue",
  "Created / Draft",
  "Assigned",
  "Accepted",
  "Completed",
  "Accounting Sync Ready",
  "Partial Accounting Synced",
  "Accounting Synced",
  "Cancelled",
  "Blocked",
];

/* Ship-to geography. INVENTED — real addresses were never captured, so these
   are plausible sites across several US states, which is what the ship-to
   facets need to be judged on at all. */
export const SHIP_TO_SITES = [
  { name: "Bray North Yard", zip: "93706", state: "California" },
  { name: "Bray Depot 2", zip: "93307", state: "California" },
  { name: "Morris Yard 4", zip: "95815", state: "California" },
  { name: "GPM Southside", zip: "77029", state: "Texas" },
  { name: "Halvorsen Main", zip: "74107", state: "Oklahoma" },
  { name: "Cardinal Hub A", zip: "43605", state: "Ohio" },
  { name: "Westbrook Farm 1", zip: "58102", state: "North Dakota" },
  { name: "Ironline Depot", zip: "31408", state: "Georgia" },
];

export const CREATED_BY = [
  "Dana Whitfield",
  "Marcus Reed",
  "Alicia Bray",
  "System — Recurring",
];

export const ORDER_TAGS = [
  "Keep Full",
  "Rush",
  "Night",
  "Weekend",
  "Split Load",
  "Hazmat",
  "After Hours",
];

export const TANK_TYPES = [
  "Single-wall skid tank",
  "Double-wall skid tank",
  "Vertical bulk tank",
  "Poly DEF tote",
];

export const PRODUCTS = [
  "Dyed Diesel",
  "Clear Diesel #2",
  "Unleaded 87",
  "Unleaded 91",
  "DEF Bulk",
  "Hydraulic Oil AW-46",
];

const WINDOWS: { start: string; end: string }[] = [
  { start: "6:00 AM", end: "10:00 AM" },
  { start: "8:00 AM", end: "12:00 PM" },
  { start: "10:00 AM", end: "2:00 PM" },
  { start: "12:00 PM", end: "4:00 PM" },
  { start: "2:00 PM", end: "6:00 PM" },
  { start: "6:00 PM", end: "10:00 PM" },
];

const CREDIT_REASONS = [
  "Over credit limit",
  "Credit status unapproved",
  "42 days overdue",
];

const INSTRUCTIONS = [
  "Gate code 4417. Tanks are behind the shop, back in from the north side.",
  "Call the POC 30 minutes out. No entry before 7am.",
  "Fill both saddle tanks. Do not top the day tank.",
  "",
];

/*
  Seed expansion.

  The board has SEVEN lanes, and a lane with one card in it teaches nothing about
  how the board behaves — so the generator distributes across all seven and puts
  a deliberate majority on TODAY, which is where the date stepper opens. Dates
  are offsets from today, computed at module load, so the relative labels
  (Today / Tomorrow / Yesterday) stay correct on whatever day this is opened.
*/

/** Deterministic pseudo-random, so the dataset is identical on every reload. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Which vendor fields a status implies. Encoded once so a seed cannot produce an
 * order that is `Accepted` with nobody assigned, or `Draft` with three invites
 * out — the exact class of contradiction `HANDOFF.md` open question 1 is about.
 */
function vendorStateFor(
  status: BrokerStatus,
  kind: OrderKind,
  pick: () => number
): { vendorId: string | null; invitedVendorIds: string[] } {
  if (status === "Draft" || status === "Blocked") {
    return { vendorId: null, invitedVendorIds: [] };
  }
  // THE POOL IS FILTERED BY BUSINESS LINE. The spec makes Business Lines a
  // filter on the vendor picker (§5.5 "Table View") precisely because a carrier
  // that only moves tanks cannot haul 2,200 gallons of diesel. Drawing from the
  // whole vendor list produced exactly that: a bulk fuel order out for
  // acknowledgement to Pacific Tank Movers, whose only line is Asset Movement.
  const needs = kind === "Movement" ? "Asset Movement" : "Bulk Fuel";
  const pool = VENDORS.filter((v) =>
    v.businessLines.some((b) => b === needs)
  ).map((v) => v.id);
  const first = pool[Math.floor(pick() * pool.length)];
  if (status === "Assigned") {
    // Out for acknowledgement. Sometimes to one vendor, sometimes to several —
    // both are normal, and the difference is what the rejection rule turns on.
    const extra = pool.filter((id) => id !== first);
    const n = pick() < 0.45 ? 1 + Math.floor(pick() * 2) : 0;
    return {
      vendorId: null,
      invitedVendorIds: [first, ...extra.slice(0, n)],
    };
  }
  // Accepted and everything downstream of it: one vendor holds the order, and
  // it is one of the vendors that was invited.
  const alsoInvited = pool.filter((id) => id !== first).slice(0, pick() < 0.4 ? 1 : 0);
  return { vendorId: first, invitedVendorIds: [first, ...alsoInvited] };
}

const FIRST_ORDER_NO = 104_620;

export const BROKER_ORDERS: BrokerOrder[] = (() => {
  const pick = rng(20260901);
  const today = startOfDay(new Date());
  const rows: BrokerOrder[] = [];

  // Day offsets: today is over-weighted so the board opens full.
  const OFFSETS = [0, 0, 0, 0, 0, 0, 1, 1, -1, 2, -2, 3];

  const TOTAL = 108;
  for (let i = 0; i < TOTAL; i++) {
    const status = BROKER_STATUSES[i % BROKER_STATUSES.length];
    const kind: OrderKind =
      i % 11 === 0 ? "Movement" : i % 4 === 0 ? "Recurring" : "Regular";
    const cust = CUSTOMERS[i % CUSTOMERS.length];
    const shipTo = cust.shipTos[i % cust.shipTos.length] ?? cust.name;
    const site = SHIP_TO_SITES[i % SHIP_TO_SITES.length];
    const offset = OFFSETS[i % OFFSETS.length];
    const when = new Date(today);
    when.setDate(when.getDate() + offset);

    const isMovement = kind === "Movement";
    const nLines = isMovement ? 1 : 1 + Math.floor(pick() * 3);
    const lines: OrderLine[] = Array.from({ length: nLines }, (_, k) => {
      // Top-off lines exist on ~1 in 6 fuel lines and never on movement orders,
      // which carry an asset rather than a requested volume.
      const topOff = !isMovement && pick() < 0.17;
      return {
        asset: isMovement
          ? `${TANK_TYPES[i % TANK_TYPES.length]} · ${["A", "B", "C"][k % 3]}`
          : `Tank ${String(101 + ((i * 3 + k) % 40))}`,
        product: PRODUCTS[(i + k) % PRODUCTS.length],
        gal: topOff ? null : 150 + Math.floor(pick() * 34) * 50,
        topOff,
      };
    });

    const { vendorId, invitedVendorIds } = vendorStateFor(status, kind, pick);
    // Movement orders always run the quote flow (§5.20); fuel orders sometimes.
    const quoteRequested = isMovement || pick() < 0.25;
    const gal = totalGal(lines);
    const quotes: VendorQuote[] =
      quoteRequested && invitedVendorIds.length > 0
        ? invitedVendorIds
            // Only vendors that have actually replied have a quote on file, so
            // an Assigned order can legitimately show fewer quotes than invites.
            .filter((_, k) => status !== "Assigned" || k === 0 || pick() < 0.5)
            .map((vid) =>
              isMovement
                ? {
                    vendorId: vid,
                    fee: 220 + Math.floor(pick() * 18) * 10,
                    tax: 18 + Math.floor(pick() * 9) * 2,
                  }
                : {
                    vendorId: vid,
                    ratePerGal: Number((2.85 + pick() * 0.9).toFixed(3)),
                    serviceCharge: 35 + Math.floor(pick() * 8) * 5,
                  }
            )
        : [];

    rows.push({
      id: `bo-${i}`,
      orderNo: `${isMovement ? "M" : "D"}-${FIRST_ORDER_NO + i * 7}`,
      kind,
      orderType: isMovement
        ? "Asset Movement"
        : pick() < 0.18
          ? "Emergency"
          : "Core",
      customer: { title: cust.name, description: cust.erpId },
      shipTo,
      date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
      dateKey: dateKeyOf(when),
      window: WINDOWS[i % WINDOWS.length],
      lines,
      status,
      vendorId,
      invitedVendorIds,
      quoteRequested,
      quotes,
      urgent: pick() < 0.14,
      signatureOnDelivery: pick() < 0.4,
      poNumber: pick() < 0.7 ? `PO-${70_000 + i * 13}` : "",
      shipToName: site.name,
      zip: site.zip,
      state: site.state,
      createdBy:
        kind === "Recurring"
          ? "System — Recurring"
          : CREATED_BY[i % (CREATED_BY.length - 1)],
      tags: pick() < 0.45 ? [ORDER_TAGS[i % ORDER_TAGS.length]] : [],
      hub: HUBS[i % HUBS.length],
      primaryPoc: POCS[i % POCS.length],
      salesperson: SALESPEOPLE[i % SALESPEOPLE.length],
      instructions: INSTRUCTIONS[i % INSTRUCTIONS.length],
      blockedReason:
        status === "Blocked" ? CREDIT_REASONS[i % CREDIT_REASONS.length] : null,
      movement: isMovement
        ? {
            direction: i % 22 === 0 ? "Asset Pickup" : "Asset Delivery",
            yard: YARDS[i % YARDS.length],
            tankType: TANK_TYPES[i % TANK_TYPES.length],
            capacityGal: [250, 500, 1000, 2000][i % 4],
          }
        : null,
    });
    void gal;
  }
  return rows;
})();

/*
  Invariants. Asserted rather than trusted, because every one of them is a rule
  the SPEC states and a seed could silently break.
*/
export function assertConsistent(rows: BrokerOrder[]): string[] {
  const problems: string[] = [];
  for (const r of rows) {
    if (r.kind === "Movement") {
      if (!r.orderNo.startsWith("M-")) problems.push(`${r.orderNo}: movement order without an M prefix`);
      if (r.orderType !== "Asset Movement") problems.push(`${r.orderNo}: movement order typed ${r.orderType}`);
      if (!r.movement) problems.push(`${r.orderNo}: movement order with no movement detail`);
      if (r.lines.length !== 1) problems.push(`${r.orderNo}: movement orders carry exactly one asset`);
    } else if (!r.orderNo.startsWith("D-")) {
      problems.push(`${r.orderNo}: delivery order without a D prefix`);
    }
    const preVendor = r.status === "Draft" || r.status === "Blocked";
    if (preVendor && (r.vendorId || r.invitedVendorIds.length)) {
      problems.push(`${r.orderNo}: ${r.status} cannot have vendors`);
    }
    if (r.status === "Assigned" && r.vendorId) {
      problems.push(`${r.orderNo}: Assigned means invited, not accepted`);
    }
    if (r.status === "Assigned" && r.invitedVendorIds.length === 0) {
      problems.push(`${r.orderNo}: Assigned with nobody invited`);
    }
    if (!preVendor && r.status !== "Assigned" && !r.vendorId) {
      problems.push(`${r.orderNo}: ${r.status} with no accepting vendor`);
    }
    if (r.vendorId && !r.invitedVendorIds.includes(r.vendorId)) {
      problems.push(`${r.orderNo}: accepting vendor was never invited`);
    }
    // A partner has to actually run the line of business the order needs.
    const needs = r.kind === "Movement" ? "Asset Movement" : "Bulk Fuel";
    for (const id of r.invitedVendorIds) {
      const v = VENDORS.find((x) => x.id === id);
      if (v && !v.businessLines.some((b) => b === needs)) {
        problems.push(`${r.orderNo}: ${v.name} does not run ${needs}`);
      }
    }
    if ((r.status === "Blocked") !== (r.blockedReason !== null)) {
      problems.push(`${r.orderNo}: blocked reason and status disagree`);
    }
    for (const l of r.lines) {
      if (l.topOff && l.gal !== null) {
        problems.push(`${r.orderNo}: a top-off line cannot also request gallons`);
      }
      if (!l.topOff && l.gal === null) {
        problems.push(`${r.orderNo}: a non-top-off line needs gallons`);
      }
    }
  }
  return problems;
}

export type BrokerSortDir = "asc" | "desc";
export interface BrokerSortState {
  key: BrokerColumnKey;
  dir: BrokerSortDir;
}

function sortValue(r: BrokerOrder, key: BrokerColumnKey): string | number {
  switch (key) {
    case "order":
      // Numeric part only, so D- and M- series interleave by number rather than
      // the prefix sorting every movement order to one end.
      return Number(r.orderNo.slice(2));
    case "customer":
      return r.customer.title.toLowerCase();
    case "shipTo":
      return r.shipTo.toLowerCase();
    case "date":
      return r.dateKey;
    case "window":
      return r.window.start;
    case "qty":
      return totalGal(r.lines);
    case "vendor":
      return (VENDORS.find((v) => v.id === r.vendorId)?.name ?? "").toLowerCase();
    case "status":
      // Lifecycle order, not alphabetical — sorting by status means "how far
      // along is this", and A-Z would put Accounting Synced before Draft.
      return BROKER_STATUSES.indexOf(r.status);
    default:
      return "";
  }
}

export function sortBrokerOrders(
  rows: BrokerOrder[],
  sort: BrokerSortState | null
): BrokerOrder[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

export function matchesBrokerOrder(r: BrokerOrder, q: string): boolean {
  return [
    r.orderNo,
    r.customer.title,
    r.customer.description,
    r.shipTo,
    r.date.title,
    r.status,
    r.kind,
    r.orderType,
    r.poNumber,
    r.hub,
    r.primaryPoc,
    r.salesperson,
    VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
    ...r.lines.map((l) => `${l.asset} ${l.product}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const BROKER_SEARCH_FIELDS = [
  { key: "order", label: "Order #", text: (r: BrokerOrder) => r.orderNo },
  {
    key: "customer",
    label: "Customer",
    text: (r: BrokerOrder) => `${r.customer.title} ${r.customer.description}`,
  },
  { key: "shipTo", label: "Ship To", text: (r: BrokerOrder) => r.shipTo },
  { key: "date", label: "Planned Date", text: (r: BrokerOrder) => r.date.title },
  {
    key: "vendor",
    label: "Delivery Partner",
    text: (r: BrokerOrder) => VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
  },
  { key: "status", label: "Status", text: (r: BrokerOrder) => r.status },
  { key: "poNumber", label: "PO Number", text: (r: BrokerOrder) => r.poNumber },
];

export function matchesBrokerOrderIn(
  r: BrokerOrder,
  q: string,
  scope: string
): boolean {
  if (!q) return true;
  const f = BROKER_SEARCH_FIELDS.find((x) => x.key === scope);
  return f ? f.text(r).toLowerCase().includes(q) : true;
}

/*
  ── The app's own status mappings ──────────────────────────────────────────────
  Per the DS's colour governance a status carries no colour until a usage rule
  binds it: the DS ships visual CHANNELS (`StatusTone`) and lane FILLS
  (`--fp-lane-*`), and each application declares its own mapping. This is 3PL's,
  declared once here so the board, the table and the sheet cannot drift — exactly
  how `statusTone()` in `tables-layout/data.ts` does it for the DS's own table.
*/

/** Lane fills, following the lifecycle: neutral -> in-flight -> done, with the
 *  credit hold as the one red. */
export const BROKER_LANE_COLOR: Record<BrokerStatus, LaneColorName> = {
  Draft: "grey",
  Blocked: "red",
  Assigned: "blue",
  Accepted: "cyan",
  Completed: "green",
  "Accounting Sync Ready": "yellow",
  "Accounting Synced": "purple",
};

/** The DS lane palette's key names. Kept as a local type so this data module
 *  does not import from a component. */
type LaneColorName =
  | "grey"
  | "blue"
  | "yellow"
  | "green"
  | "cyan"
  | "purple"
  | "violet"
  | "pink"
  | "orange"
  | "red";

/**
 * Chip tones. The DS ships four channels and this lifecycle has seven stages, so
 * three of them share `processing` — which is correct rather than a compromise:
 * Assigned, Accepted and Accounting Sync Ready are all "in flight", and the DS's
 * rule is that colour is never the only carrier of meaning. The label spells the
 * stage out in every case.
 */
export const BROKER_STATUS_TONE: Record<
  BrokerStatus,
  "success" | "processing" | "failed" | "neutral"
> = {
  Draft: "neutral",
  Blocked: "failed",
  Assigned: "processing",
  Accepted: "processing",
  Completed: "success",
  "Accounting Sync Ready": "processing",
  "Accounting Synced": "success",
};

/** Half-hour grid for the §5.3 start/end window selects. */
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hour12}:${m === 0 ? "00" : "30"} ${h < 12 ? "AM" : "PM"}`);
    }
  }
  return out;
})();

/**
 * "6:00 AM" -> 360. The delivery window is stored as the formatted strings the
 * UI shows, so anything that ORDERS by time has to parse them — sorting the
 * strings puts "10:00 AM" before "6:00 AM".
 */
export function timeToMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}
