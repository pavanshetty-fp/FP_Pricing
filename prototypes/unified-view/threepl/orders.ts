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
export type BrokerOrderType =
  | "Core"
  | "Emergency"
  | "Asset Movement"
  | "Delivery"
  | "Extraction"
  | "Pump Out"
  | "Transport";

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
  /**
   * Fill this asset rather than deliver a stated quantity — the "Top off"
   * column in the Delivery Order table. It is the checkbox itself, not a mode
   * over a selection: one tick, one meaning, whatever else is on screen.
   */
  topOff: boolean;
  /** The asset belongs to the broker, not the customer — badged on the row. */
  rental?: boolean;
}

/**
 * Loading accounts — the ONE table the Load Order's three selects read.
 *
 * A loading account is the real entity: it belongs to a terminal AND a
 * supplier, and it carries the products that can be drawn on it. Terminal and
 * Supplier are therefore not independent lists — they are the distinct values
 * of this table, narrowed by what has already been chosen. Three free-standing
 * vocabularies would let someone pick a terminal, a supplier and an account
 * that have nothing to do with each other.
 */
export interface LoadingAccount {
  name: string;
  terminal: string;
  supplier: string;
  /** What can be loaded on this account. A line's product must be in here. */
  products: string[];
}

export const LOADING_ACCOUNTS: LoadingAccount[] = [
  {
    name: "Greensbro Premium",
    terminal: "Greensbro KM2",
    supplier: "Liberty P56",
    products: ["Dyed Diesel", "Clear Diesel #2"],
  },
  {
    name: "Greensbro Bulk",
    terminal: "Greensbro KM2",
    supplier: "Pioneer Distributing",
    products: ["Unleaded 87", "Unleaded 91"],
  },
  {
    name: "Liberty Standard",
    terminal: "Liberty P56",
    supplier: "Liberty P56",
    products: ["Clear Diesel #2", "DEF Bulk"],
  },
  {
    name: "Washington Contract",
    terminal: "Lib Washington 124",
    supplier: "Sunrise Energy",
    products: ["Dyed Diesel", "Unleaded 87", "DEF Bulk"],
  },
  {
    name: "Kern Premium",
    terminal: "Kern River T4",
    supplier: "Pioneer Distributing",
    products: ["Hydraulic Oil AW-46", "Clear Diesel #2"],
  },
  {
    name: "Kern Retail",
    terminal: "Kern River T4",
    supplier: "Sunrise Energy",
    products: ["Unleaded 87", "Unleaded 91", "Dyed Diesel"],
  },
];

const uniqueSorted = (xs: string[]) => [...new Set(xs)].sort();

/**
 * The three selects, narrowed by EVERY product on the order at once.
 *
 * One account serves the whole order, so it must be able to carry all of them —
 * an account that covers two of three products would leave the third with
 * nowhere to load. When no account covers the set, every list comes back empty,
 * which is the honest answer: this combination cannot be loaded from one place.
 */
export const loadOptions = (
  products: string[],
  terminal?: string,
  supplier?: string
) => {
  const needed = [...new Set(products)];
  const covering = LOADING_ACCOUNTS.filter((a) =>
    needed.every((p) => a.products.includes(p))
  );
  const forTerminal = terminal
    ? covering.filter((a) => a.terminal === terminal)
    : covering;
  const forSupplier = supplier
    ? forTerminal.filter((a) => a.supplier === supplier)
    : forTerminal;
  return {
    terminals: uniqueSorted(covering.map((a) => a.terminal)),
    suppliers: uniqueSorted(forTerminal.map((a) => a.supplier)),
    accounts: uniqueSorted(forSupplier.map((a) => a.name)),
    /** No single account covers this product set. */
    impossible: needed.length > 0 && covering.length === 0,
  };
};


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
  /** The delivery site. Always a `SHIP_TO_SITES` name — see the note there. */
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
  zip: string;
  state: string;
  createdBy: string;
  tags: string[];
  /** Set only on a recurring order. `null` on every other kind. */
  recurrence: { fromDateKey: string; frequency: string } | null;
  /**
   * Where each PRODUCT on the order is drawn from. One row per distinct
   * product, because a product is what a terminal and an account are chosen
   * for — two assets carrying the same product load once, together.
   *
   * `null` while the load order has not been created: it is optional, and an
   * empty array would be indistinguishable from "created but not filled".
   */
  loadOrder:
    | {
        product: string;
        terminal: string;
        supplier: string;
        loadingAccount: string;
        /** Set aside on the order without being deleted from it. */
        excluded?: boolean;
      }[]
    | null;
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
  /* A topped-off line contributes NO stated gallons — how much goes in is
     decided at the tank. It may still carry the number someone typed before
     ticking the box, which is kept so unticking hands it back; summing that
     would put gallons into a total nobody promised. */
  return lines.reduce((sum, l) => sum + (l.topOff ? 0 : (l.gal ?? 0)), 0);
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

/**
 * POC directory. The sheet picks a NAME and shows that person's phone and email
 * beside it — they are attributes of the person, never typed per order, so they
 * render read-only rather than as a second and third input to keep in sync.
 */
export const POC_DIRECTORY: Record<string, { phone: string; email: string }> = {
  "Marisol Vega": { phone: "+1-415-555-0142", email: "marisol.vega@example.com" },
  "Dwight Feeney": { phone: "+1-661-555-0188", email: "dwight.feeney@example.com" },
  "Anita Kaur": { phone: "+1-916-555-0119", email: "anita.kaur@example.com" },
  "Ray Obuya": { phone: "+1-713-555-0164", email: "ray.obuya@example.com" },
  "Colleen Marsh": { phone: "+1-918-555-0173", email: "colleen.marsh@example.com" },
};

/** Same rule as the POC directory — a salesperson's number follows the person. */
export const SALES_CONTACTS: Record<string, string> = {
  "Dana Whitfield": "+1-415-555-0210",
  "Marcus Reed": "+1-661-555-0233",
  "Priya Raman": "+1-916-555-0247",
  "Tom Alvarez": "+1-713-555-0269",
};

/**
 * Listing Type — the reference calls this field Listing Type on the order sheet
 * and shows "Core" in it, which is the same vocabulary the Order Type field
 * carries. Treated as ONE field under the reference's label rather than
 * duplicated, since two required selects offering the same values would be a
 * bug waiting to be reported.
 */
export const LISTING_TYPES: BrokerOrderType[] = [
  "Core",
  "Emergency",
  "Delivery",
  "Pump Out",
  "Transport",
  "Extraction",
  "Asset Movement",
];

/**
 * Recurrence cadences. The first five are phrased against the order's own date
 * — "Monthly On First Thursday" says what will happen, where a bare "Monthly"
 * leaves the reader to work out which day. "Custom" opens the rule builder.
 */
export const RECURRENCE_FREQUENCIES = [
  "Daily",
  "Weekly On Thursday",
  "Monthly On First Thursday",
  "Annually On September 3",
  "Every Weekday (Monday To Friday)",
  "Custom",
];

export const SALESPEOPLE = [
  "Dana Whitfield",
  "Marcus Reed",
  "Priya Raman",
  "Tom Alvarez",
];

/**
 * The broker's own yards — where a movement order starts or ends.
 *
 * A ROW, NOT A NAME. The sheet shows a yard's address the moment one is chosen,
 * the same way it shows a ship-to's, and a list of three strings could not
 * answer that. `YARDS` is derived from this so the two can never disagree.
 *
 * INVENTED, like `SHIP_TO_SITES` — real yards were never captured. Each sits in
 * the town it is named for, so a route reads as a route.
 */
export const YARD_SITES = [
  {
    name: "Fresno Yard",
    street: "3140 S East Ave",
    city: "Fresno",
    state: "California",
    zip: "93725",
    latLng: "36.69540, -119.75620",
  },
  {
    name: "Turlock Yard",
    street: "901 N Golden State Blvd",
    city: "Turlock",
    state: "California",
    zip: "95380",
    latLng: "37.51380, -120.85410",
  },
  {
    name: "Kern Yard",
    street: "6215 Rosedale Hwy",
    city: "Bakersfield",
    state: "California",
    zip: "93308",
    latLng: "35.38210, -119.08760",
  },
];

export const YARDS = YARD_SITES.map((y) => y.name);

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
/** `8:00 AM – 12:00 PM` — the single value the Delivery Window select shows. */
export const formatWindow = (w: { start: string; end: string }) =>
  `${w.start} – ${w.end}`;

/**
 * The delivery sites. THE single source for a ship-to on a broker order: the
 * name the order stores, the address the filter and the sheet show, and the
 * coordinates the sheet displays all come from one row here.
 *
 * INVENTED — real sites were never captured. Spread across six states so the
 * ship-to facets have something to be judged on.
 */
export const SHIP_TO_SITES = [
  {
    name: "Bray North Yard",
    street: "4820 N Golden State Blvd",
    city: "Fresno",
    state: "California",
    zip: "93706",
    latLng: "36.81120, -119.83450",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "180 asset", product: "Dyed Diesel", rental: true }, { name: "180 asset", product: "Clear Diesel #2", rental: false }, { name: "Asset 1", product: "Unleaded 87", rental: true }, { name: "VEND TANK", product: "Dyed Diesel", rental: false }],
  },
  {
    name: "Bray Depot 2",
    street: "1177 Weedpatch Hwy",
    city: "Bakersfield",
    state: "California",
    zip: "93307",
    latLng: "35.34210, -118.94860",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Asset 1", product: "Clear Diesel #2", rental: true }, { name: "Asset 2", product: "Unleaded 91", rental: false }, { name: "Yard Tank 4", product: "DEF Bulk", rental: false }],
  },
  {
    name: "Morris Yard 4",
    street: "930 Richards Blvd",
    city: "Sacramento",
    state: "California",
    zip: "95815",
    latLng: "38.60130, -121.48210",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Tank 104", product: "Dyed Diesel", rental: false }, { name: "Tank 105", product: "Clear Diesel #2", rental: false }, { name: "Lube Skid", product: "Hydraulic Oil AW-46", rental: true }],
  },
  {
    name: "GPM Southside",
    street: "12600 Federal Rd",
    city: "Houston",
    state: "Texas",
    zip: "77029",
    latLng: "29.78440, -95.23110",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Southside A", product: "Unleaded 87", rental: false }, { name: "Southside B", product: "Unleaded 91", rental: false }, { name: "DEF Tote 2", product: "DEF Bulk", rental: true }],
  },
  {
    name: "Halvorsen Main",
    street: "6215 S Union Ave",
    city: "Tulsa",
    state: "Oklahoma",
    zip: "74107",
    latLng: "36.08320, -96.00410",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Main Bulk", product: "Clear Diesel #2", rental: false }, { name: "Main Skid", product: "Dyed Diesel", rental: true }],
  },
  {
    name: "Cardinal Hub A",
    street: "2401 Front St",
    city: "Toledo",
    state: "Ohio",
    zip: "43605",
    latLng: "41.64470, -83.51190",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Hub Tank 1", product: "Dyed Diesel", rental: false }, { name: "Hub Tank 2", product: "Unleaded 87", rental: false }, { name: "Rental Skid 9", product: "Clear Diesel #2", rental: true }],
  },
  {
    name: "Westbrook Farm 1",
    street: "3810 40th St S",
    city: "Fargo",
    state: "North Dakota",
    zip: "58102",
    latLng: "46.83190, -96.85640",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Farm Tank", product: "Dyed Diesel", rental: false }, { name: "Farm DEF", product: "DEF Bulk", rental: false }],
  },
  {
    name: "Ironline Depot",
    street: "1720 Dean Forest Rd",
    city: "Savannah",
    state: "Georgia",
    zip: "31408",
    latLng: "32.10650, -81.19980",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Depot Bulk", product: "Clear Diesel #2", rental: false }, { name: "Depot Lube", product: "Hydraulic Oil AW-46", rental: true }, { name: "Depot 87", product: "Unleaded 87", rental: false }],
  },
];

/** Every asset name known across sites — what the Add Asset combobox offers. */
export const ALL_ASSET_NAMES = [
  ...new Set(SHIP_TO_SITES.flatMap((s) => s.assets.map((a) => a.name))),
].sort();

/** `4820 N Golden State Blvd, Fresno, CA 93706` — the line shown under a site.
 *  Takes the address fields alone, so a yard and a ship-to print identically. */
export const siteAddress = (s: {
  street: string;
  city: string;
  state: string;
  zip: string;
}) => `${s.street}, ${s.city}, ${STATE_ABBR[s.state] ?? s.state} ${s.zip}`;

const STATE_ABBR: Record<string, string> = {
  California: "CA",
  Texas: "TX",
  Oklahoma: "OK",
  Ohio: "OH",
  "North Dakota": "ND",
  Georgia: "GA",
};

/**
 * What the "Order Types" facet offers. It is deliberately a MIXED predicate,
 * because the reference panel is: Urgent is a flag, Movement is the order kind,
 * and the other four are the Order Type field. One question a broker asks
 * ("what kind of work is this?"), so one facet — rather than three facets that
 * each answer a third of it.
 */
export const ORDER_TYPE_FILTERS = [
  "Urgent Orders",
  "Movement",
  "Core",
  "Delivery",
  "Emergency",
  "Extraction",
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

/**
 * The yard-side assets a movement order can carry.
 *
 * NAMES, not records — the records live in `directory.ts` (`RENTAL_ASSETS`),
 * which reads this file and so cannot be read back from it. `assertMovementAssetsExist`
 * over there fails the build if the two ever disagree, which is what keeps a
 * movement order's asset the same object the Rental Assets screen lists rather
 * than a string that merely looks like one.
 */
export const MOVEMENT_ASSET_NAMES = [
  "Yard Tank 7",
  "Yard Tank 8",
  "DEF Tote 5",
  "Pump Cart 3",
  "Lube Skid 9",
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

export const WINDOWS: { start: string; end: string }[] = [
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
    /* ONE ship-to concept. `SHIP_TO_SITES` is the list — the site carries the
       name, the street, the city/state/ZIP and the coordinates together, so a
       ship-to can never be a name in one place and an address in another. The
       customer's own `shipTos` array is not used here for that reason. */
    const site = SHIP_TO_SITES[i % SHIP_TO_SITES.length];
    const shipTo = site.name;
    const offset = OFFSETS[i % OFFSETS.length];
    const when = new Date(today);
    when.setDate(when.getDate() + offset);

    const isMovement = kind === "Movement";
    /* An order's lines are the SITE'S assets, picked from its list — never
       invented tank names. That is what the sheet does, so the seed has to do
       it too or an existing order shows rows the site does not have and the
       Rental badge never appears on one. */
    const nLines = isMovement
      ? 1
      : Math.min(site.assets.length, 1 + Math.floor(pick() * 3));
    const lines: OrderLine[] = Array.from({ length: nLines }, (_, k) => {
      // Top-off lines exist on ~1 in 6 fuel lines and never on movement orders,
      // which carry an asset rather than a requested volume.
      const topOff = !isMovement && pick() < 0.17;
      const asset = site.assets[(i + k) % site.assets.length];
      return {
        asset: isMovement
          ? MOVEMENT_ASSET_NAMES[(i + k) % MOVEMENT_ASSET_NAMES.length]
          : asset.name,
        product: isMovement
          ? PRODUCTS[(i + k) % PRODUCTS.length]
          : asset.product,
        gal: topOff ? null : 150 + Math.floor(pick() * 34) * 50,
        topOff,
        rental: isMovement ? false : asset.rental,
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
        : pick() < 0.14
          ? "Emergency"
          : pick() < 0.3
            ? "Delivery"
            : pick() < 0.42
              ? "Extraction"
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
      zip: site.zip,
      state: site.state,
      createdBy:
        kind === "Recurring"
          ? "System — Recurring"
          : CREATED_BY[i % (CREATED_BY.length - 1)],
      tags: pick() < 0.45 ? [ORDER_TAGS[i % ORDER_TAGS.length]] : [],
      loadOrder: null,
      recurrence:
        kind === "Recurring"
          ? {
              fromDateKey: dateKeyOf(when),
              frequency:
                RECURRENCE_FREQUENCIES[i % RECURRENCE_FREQUENCIES.length],
            }
          : null,
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

  /* EVERY STATE THE UI DISTINGUISHES MUST EXIST IN THE FIXTURE, or nobody can
     see whether it works. Urgent (14%) and Recurring (25%) are drawn
     independently, so the both-at-once card — the one the card's stacked badges
     exist for — was absent by chance. Every third recurring order is forced
     urgent so the case lands on most days: the board is scoped to ONE date, so
     a single forced row would only be visible on the day it happens to fall. */
  rows
    .filter((r) => r.kind === "Recurring")
    .forEach((r, k) => {
      if (k % 3 === 0) r.urgent = true;
    });

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
