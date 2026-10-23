import * as React from "react";
import { DATE_FMT, dateKeyOf, startOfDay } from "../unified-view/data";
import { statusTones } from "../unified-view/statusKind";
import type { ActivityEntry } from "../unified-view/activity";
import type { RuleFrequency } from "../unified-view/threepl/RuleFrequency";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";

/*
  CUSTOMER PORTAL — ORDERS (Pavan, 2026-10-13; one number, 2026-10-21).

  What the CUSTOMER sees: the fuel orders they send their supplier (the
  tenant), each for ONE ship-to and any number of its tanks and assets, with
  a planned date. THE ORDER THE CUSTOMER CREATES IS THE ORDER (Pavan,
  2026-10-21): its number (ORD-…) is the one the tenant works with — no
  request number, no separate tenant order. No quote either: prices are
  agreed beforehand in Pricing, per product, for a period. And no accept or
  decline — the tenant takes every order; the customer sees only whether a
  driver is on it yet (Unassigned → Scheduled), then its delivery.

  No customer-side approval (Pavan, 2026-10-13): a user allowed to create an
  order sends it straight to the tenant.

  INVENTED, all of it: the account, ship-tos, tanks and seed requests.
*/

/** The signed-in customer account. */
export const ACCOUNT = "Cardinal Logistics";
/** Who is acting — the signed-in customer user. */
export const PORTAL_ACTOR = "Pavan Shetty";
/** The supplier — the tenant whose portal this is (white-labelled, PRD FR-19). */
export const TENANT = "Lone Star Fuels";

/* ------------------------------------------------------------ statuses --- */

/*
  THE CUSTOMER-FACING LIFECYCLE (Pavan, 2026-10-13; cut 2026-10-21). An order
  sent to the tenant is UNASSIGNED until a driver is put on it, then
  SCHEDULED; its delivery and billing follow. No review, quote, accept or
  reject steps (2026-10-21) — pricing is agreed in Pricing, and the tenant
  takes every order.
*/
export const REQUEST_STATUSES = [
  "Draft",
  /* Sent — no driver on it yet. */
  "Unassigned",
  /* A driver is on it. */
  "Scheduled",
  "Out for delivery",
  "Partial delivery",
  "Delivered",
  "Invoiced",
  "Paid",
  "Canceled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** THE ORDERS LIST'S STATES, in life order. */
export const LIST_STATUSES: RequestStatus[] = [...REQUEST_STATUSES];

/* KINDS, NEVER TONES — docs/unified-view/1-components.md §Status kinds. */
export const REQUEST_STATUS_TONE = statusTones<RequestStatus>({
  Draft: "neutral",
  /* Waiting on the tenant to put a driver on it. */
  Unassigned: "caution",
  Scheduled: "info",
  "Out for delivery": "info",
  "Partial delivery": "critical",
  Delivered: "success",
  /* Waiting on payment. */
  Invoiced: "caution",
  Paid: "success",
  /* An end, not a fault. */
  Canceled: "neutral",
});

/** Lifecycle position — status sorts by this, never the alphabet. */
export const statusRank = (s: RequestStatus) => REQUEST_STATUSES.indexOf(s);

/* ---------------------------------------------------- ship-tos & assets --- */

/*
  SHIP-TOS AND ASSETS (Pavan, 2026-10-13) — the CUSTOMER keeps these: they
  add and edit them directly, no tenant approval; the tenant reads them to
  take orders. Every asset has its own coordinates, so where it stands inside
  the ship-to is known. An asset is the customer's own or RENTED. A tank
  level exists only where a tank monitor is fitted (estimating the others
  from usage is for later).

  One live list, mutated in place by the sites store below, so Orders reads
  new ship-tos and assets the moment they are added. INVENTED seed.
*/
/* ASSET TYPES — the FleetPanda portal's categories (TANK · CARD_LOCK_PUMP ·
   GENERATOR · EQUIPMENT, demo data 2026-10-14) plus the kinds this
   prototype already had. */
export const ASSET_TYPES = ["Tank", "Card lock pump", "Generator", "Equipment", "Tote", "Reefer truck", "Light tower", "Reservoir"];
/* SIZE IS OPTIONAL FOR THESE (Pavan, 2026-10-14) — a pump or a piece of
   equipment has no tank of its own; the real data keeps their size at 0. */
export const SIZE_OPTIONAL = ["Card lock pump", "Equipment"];
export const sizeRequired = (type: string) => !SIZE_OPTIONAL.includes(type);
export type ActiveStatus = "Active" | "Inactive";

export interface Asset {
  id: string;
  /** Display name. */
  name: string;
  /** The customer's own unique identifier for it. */
  code: string;
  /** RFID tag code, if it wears one. */
  rfid: string;
  /** Its ID in the customer's ERP. */
  erpId: string;
  type: string;
  /** Product categories it can hold — the line-of-service words. */
  categories: string[];
  /** Products it takes; the first is its usual one. */
  products: string[];
  /** = products[0] — the product an order line starts from. */
  product: string;
  /** Gallons. */
  capacity: number;
  rented: boolean;
  monitor: boolean;
  monitorId: string;
  /** Last monitor reading, % full — only when `monitor`. */
  level: number;
  /** The monitor's battery, % — only when `monitor` (Pavan, 2026-10-17). */
  battery: number;
  /** Day-to-day usage, gal/day — the monitor's average (Pavan, 2026-10-17). */
  dailyUse: number;
  lat: number | null;
  lng: number | null;
  status: ActiveStatus;
  notes: string;
  audit?: ActivityEntry[];
}

export interface ShipTo {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
  /** Minutes from midnight — when deliveries can be made. */
  hoursStart: number;
  hoursEnd: number;
  /** PREFERRED WINDOWS new orders here start with (Pavan, 2026-10-17). */
  preferred?: TimeSpan[];
  /** Delivery instructions for the driver — the real product's
      "deliveryInstructions" (gate codes, PPE, where to park, photos). */
  accessNotes: string;
  /** The PO number orders to this ship-to start with — optional. */
  poNumber: string;
  /** Geofence radius round the pin, MILES — null for none. */
  geofence: number | null;
  status: ActiveStatus;
  assets: Asset[];
  audit?: ActivityEntry[];
}

/*
  PRODUCT CATEGORIES (Pavan, 2026-10-13) — what an asset is compatible with:
  Gas · Additive · Aviation fuel · Propane, with the products that sit under
  each. Lubricant is kept for the hydraulic oil. Not the LOS words — those
  are the Orders filter's.
*/
export const PRODUCT_CATEGORIES = ["Gas", "Additive", "Aviation fuel", "Propane", "Lubricant"] as const;
const CATEGORY_OF: Record<string, (typeof PRODUCT_CATEGORIES)[number]> = {
  Diesel: "Gas",
  "Dyed Diesel": "Gas",
  "Unleaded 87": "Gas",
  DEF: "Additive",
  "Jet A": "Aviation fuel",
  "Avgas 100LL": "Aviation fuel",
  Propane: "Propane",
  "Hydraulic Oil AW-46": "Lubricant",
};

export const PRODUCTS = [
  "Diesel",
  "Dyed Diesel",
  "Unleaded 87",
  "DEF",
  "Jet A",
  "Avgas 100LL",
  "Propane",
  "Hydraulic Oil AW-46",
];

/*
  LINE OF SERVICE — the 3PL line switch's words (All · Fuel · Lubricants ·
  Propane), the "same data, same control" rule. DEF rides with fuel, as on
  3PL. A request is in a line when any of its products is.
*/
export const LINE_SCOPES = ["All", "Fuel", "Lubricants", "Propane"] as const;
export type LineScope = (typeof LINE_SCOPES)[number];
const LINE_OF: Record<string, Exclude<LineScope, "All">> = {
  Diesel: "Fuel",
  "Dyed Diesel": "Fuel",
  "Unleaded 87": "Fuel",
  DEF: "Fuel",
  "Jet A": "Fuel",
  "Avgas 100LL": "Fuel",
  Propane: "Propane",
  "Hydraulic Oil AW-46": "Lubricants",
};
/** Products in the chosen categories (all when none chosen). */
export const productsIn = (cats: readonly string[]) =>
  cats.length ? PRODUCTS.filter((p) => cats.includes(CATEGORY_OF[p])) : PRODUCTS;
export const categoryOf = (product: string): string => CATEGORY_OF[product];
export const inLine = (r: { lines: { product: string }[] }, scope: LineScope) =>
  scope === "All" || r.lines.some((l) => LINE_OF[l.product] === scope);

/** The tenant's terminal — where the trucks leave from. INVENTED. */
export const TERMINAL = { name: `${"Lone Star Fuels"} terminal`, lat: 29.88, lng: -95.06 };

const asset = (
  id: string,
  name: string,
  type: string,
  product: string,
  capacity: number,
  at: [number, number],
  o: { rented?: boolean; monitor?: string; level?: number; battery?: number; use?: number; rfid?: string; products?: string[] } = {}
): Asset => ({
  id,
  name,
  code: `CL-${id.toUpperCase().replace("-", "")}`,
  rfid: o.rfid ?? "",
  erpId: `ERP-${40100 + id.charCodeAt(0) * 10 + Number(id.slice(2))}`,
  type,
  categories: Array.from(new Set((o.products ?? [product]).map((p) => CATEGORY_OF[p]))),
  products: o.products ?? [product],
  product,
  capacity,
  rented: o.rented ?? false,
  monitor: Boolean(o.monitor),
  monitorId: o.monitor ?? "",
  level: o.level ?? 0,
  battery: o.battery ?? 0,
  dailyUse: o.use ?? 0,
  lat: at[0],
  lng: at[1],
  status: "Active",
  notes: "",
});

export const SHIP_TOS: ShipTo[] = [
  {
    id: "st-a",
    name: "Cardinal Hub A",
    street: "2410 Navigation Blvd",
    city: "Houston",
    state: "Texas",
    zip: "77003",
    lat: 29.78,
    lng: -95.38,
    contactName: "Rosa Delgado",
    contactPhone: "(713) 555-0142",
    hoursStart: 5 * 60,
    hoursEnd: 19 * 60,
    preferred: [{ start: 10 * 60, end: 11 * 60 }],
    accessNotes:
      "Gate code 4471, weekdays 6 AM–6 PM only. Tanks are behind building 2 — park on the east apron, not in the loading lanes. Photo each gauge before and after.",
    poNumber: "PO-77000",
    geofence: 0.1,
    status: "Active",
    assets: [
      asset("a-1", "Tank A1", "Tank", "Diesel", 10000, [29.7803, -95.3806], { monitor: "TM8K2A91", level: 64, battery: 86, use: 900, rfid: "E2801160600002" }),
      asset("a-2", "Tank A2", "Tank", "Diesel", 10000, [29.7805, -95.3804], {
        monitor: "TM8K2A92",
        level: 31,
        battery: 62,
        use: 700,
        /* A MULTI-PRODUCT TANK — five products it can take (Pavan, 2026-10-14). */
        products: ["Diesel", "Dyed Diesel", "Unleaded 87", "Jet A", "Avgas 100LL"],
      }),
      asset("a-3", "DEF Tote 1", "Tote", "DEF", 330, [29.7801, -95.3799], { rented: true, monitor: "TT2D1A03", level: 92, battery: 74, use: 25 }),
      asset("a-4", "Generator G-12", "Generator", "Diesel", 500, [29.7797, -95.3811], { monitor: "TG6G12A4", level: 84, battery: 15, use: 60 }),
      asset("a-5", "Hydraulic Reservoir H-2", "Reservoir", "Hydraulic Oil AW-46", 275, [29.7799, -95.3802], { monitor: "TR4H2A05", level: 55, battery: 91, use: 12 }),
      /* A YARD-FULL MORE (Pavan, 2026-10-21 — orders of ten tanks). INVENTED. */
      asset("a-6", "Generator G-14", "Generator", "Diesel", 500, [29.7796, -95.3808], { monitor: "TG6G14A6", level: 41, battery: 66, use: 55 }),
      asset("a-7", "Generator G-15", "Generator", "Diesel", 500, [29.7795, -95.3806], { monitor: "TG6G15A7", level: 27, battery: 82, use: 58 }),
      asset("a-8", "Light Tower L-9", "Light tower", "Diesel", 60, [29.7802, -95.3813], { monitor: "TL4L9A08", level: 35, battery: 44, use: 7 }),
      asset("a-9", "Light Tower L-10", "Light tower", "Diesel", 60, [29.7804, -95.3814], { monitor: "TL4L10A9", level: 19, battery: 71, use: 7 }),
      asset("a-10", "DEF Tote 2", "Tote", "DEF", 330, [29.7800, -95.3797], { monitor: "TT2D2A10", level: 48, battery: 63, use: 22 }),
    ],
  },
  {
    id: "st-b",
    name: "Cardinal Hub B",
    street: "11800 W Little York Rd",
    city: "Houston",
    state: "Texas",
    zip: "77041",
    lat: 29.96,
    lng: -95.56,
    contactName: "Mike Turner",
    contactPhone: "(281) 555-0187",
    hoursStart: 6 * 60,
    hoursEnd: 20 * 60,
    accessNotes:
      "Check in at the guard house and leave your license there. Hi-vis vest past the yellow line. Signature required, printed name too.",
    poNumber: "",
    geofence: 0.15,
    status: "Active",
    assets: [
      asset("b-1", "Tank B1", "Tank", "Diesel", 12000, [29.9602, -95.5604], { monitor: "TM3P7B11", level: 72, battery: 48, use: 1100, rfid: "E2801160600417" }),
      asset("b-2", "Tank B2", "Tank", "Unleaded 87", 8000, [29.9606, -95.5601], { monitor: "TM3P7B12", level: 18, battery: 79, use: 450 }),
      asset("b-3", "Reefer Truck R-7", "Reefer truck", "Dyed Diesel", 150, [29.9598, -95.5609], { rented: true, monitor: "TL9R7X03", level: 8, battery: 57, use: 20 }),
      /* A PUMP HAS NO TANK — size left at 0, as in the real data. */
      asset("b-4", "Card Lock Pump 2", "Card lock pump", "Diesel", 0, [29.9600, -95.5612]),
    ],
  },
  {
    id: "st-c",
    name: "Cardinal Overflow",
    street: "8901 Clinton Dr",
    city: "Houston",
    state: "Texas",
    zip: "77029",
    lat: 29.64,
    lng: -95.22,
    contactName: "Dee Park",
    contactPhone: "(713) 555-0119",
    hoursStart: 6 * 60,
    hoursEnd: 18 * 60,
    accessNotes: "",
    poNumber: "",
    geofence: null,
    status: "Active",
    assets: [
      asset("c-1", "Tank O1", "Tank", "Dyed Diesel", 6000, [29.6403, -95.2204], { monitor: "TM5C2O01", level: 22, battery: 33, use: 380 }),
      asset("c-2", "Propane Tank P1", "Tank", "Propane", 1000, [29.6398, -95.2197], { rented: true }),
      asset("c-3", "Light Tower L-3", "Light tower", "Diesel", 60, [29.6407, -95.2211], { rented: true, monitor: "TL4L3T07", level: 0, battery: 9, use: 8 }),
    ],
  },
];

/* THE SEED'S HISTORY — each record was set up some weeks ago. INVENTED. */
{
  const at = new Date(Date.now() - 60 * 86_400_000).toISOString();
  for (const st of SHIP_TOS) {
    st.audit = [{ at, by: PORTAL_ACTOR, changes: ["Ship-to created"] }];
    for (const a of st.assets) a.audit = [{ at, by: PORTAL_ACTOR, changes: ["Asset added"] }];
  }
}

export const assetById = (id: string): Asset | undefined =>
  SHIP_TOS.flatMap((s) => s.assets).find((a) => a.id === id);
export const shipToOfAsset = (id: string): ShipTo | undefined =>
  SHIP_TOS.find((s) => s.assets.some((a) => a.id === id));

/* ---------------------------------------------------------- the request --- */

/**
 * One line: a tank or asset, the product going into it, and how much — the
 * 3PL Delivery Order's line (Top off · Asset · Product · Qty). TOP OFF IS A
 * CHECKBOX: ticked, the tank is filled and no gallons are typed; the typed
 * number is kept, so unticking hands it back, but it never counts.
 */
export interface RequestLine {
  /** "" — a line can name a product with no tank, as on 3PL. */
  assetId: string;
  product: string;
  topOff: boolean;
  gal: number;
  /** THE TANK'S LEVEL WHEN ORDERED, and once delivered what it was refilled
      to — % full, from its monitor (Pavan, 2026-10-17). */
  levelAtOrder?: number;
  levelAfter?: number;
}

/** A span of the day, minutes from midnight. */
export interface TimeSpan {
  start: number;
  end: number;
}

export const FREQUENCIES = [
  "Daily",
  "Every weekday (Mon–Fri)",
  "Weekly",
  "Every 2 weeks",
  "Monthly",
];

export interface OrderRequest {
  id: string;
  /** THE ORDER NUMBER, ORD-… — the customer's and the tenant's alike
      (Pavan, 2026-10-21). The field keeps its old name. */
  requestNo: string;
  shipTo: string;
  lines: RequestLine[];
  /** `YYYY-MM-DD`, or "" while unset. */
  date: string;
  /** Minutes from midnight. */
  windowStart: number;
  windowEnd: number;
  /** PREFERRED WINDOWS inside the delivery window — none, one or several
      (Pavan, 2026-10-17: window 8–2, preferred 10–12). */
  preferred: TimeSpan[];
  po: string;
  instructions: string;
  recurring: boolean;
  frequency: string;
  /** THE RULE'S OWN FREQUENCY UNIT (Pavan, 2026-10-20) — set on the order
      when Recurring is ticked; `frequency` is its one-line summary. */
  schedule?: RuleFrequency;
  /** `YYYY-MM-DD`, or "" for no end. */
  endDate: string;
  status: RequestStatus;
  flags: Flag[];
  documents: RequestDoc[];
  /** While out for delivery — who is driving, and the live trip. */
  trip?: Trip;
  /** Once the tenant has invoiced it. */
  invoiceNo?: string;
  /** A partial delivery: the gallons that did not arrive. */
  undeliveredGal?: number;
  /** WHAT THE CUSTOMER ASKED THE TENANT, awaiting confirmation (Pavan,
      2026-10-22) — a change or a cancellation. Not a status: the order keeps
      its own (Unassigned or Scheduled) and wears an "Awaiting confirmation"
      pill until the tenant answers. */
  changeRequest?: { kind: "change" | "cancel"; what: string; note: string; at: string };
  /** MADE BY A RULE (Pavan, 2026-10-16) — which one; the order is its own
      record from then on. */
  ruleId?: string;
  ruleNo?: string;
  /**
   * WHAT THE CUSTOMER SENT BACK on an "Action needed" (Pavan, 2026-10-15 —
   * PRD FR-25): a note, files, and for a credit hold the payment they made
   * offline. The tenant reads it and releases the hold.
   */
  customerReply?: {
    at: string;
    note: string;
    files: string[];
    payment?: { paidOn: string; amount: string; reference: string };
  };
  updatedAt: string;
  audit?: ActivityEntry[];
}

/*
  THE LIVE TRIP (Pavan, 2026-10-13 — the map tracks trucks out for delivery).
  Where the truck is, is worked out from the clock between leaving the
  terminal and its ETA. INVENTED.
*/
export interface Trip {
  driver: string;
  truck: string;
  departedAt: string;
  eta: string;
}
/** 0 at the terminal, 1 at the site. */
export function tripProgress(t: Trip, now = Date.now()) {
  const a = Date.parse(t.departedAt);
  const b = Date.parse(t.eta);
  return Math.min(1, Math.max(0, (now - a) / (b - a)));
}

export const blankLine = (): RequestLine => ({ assetId: "", product: "", topOff: false, gal: 0 });

/* ------------------------------------------------- flags & documents ---- */

/*
  FLAGS (Pavan, 2026-10-13) — what needs the customer's eye on a request:
  late risk, a driver's note, an invoice past due, a credit hold.
*/
export const FLAG_KINDS = [
  "At risk of being late",
  "Driver note",
  "Invoice past due",
  "Credit hold",
] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];
/** How much it matters — drives the text colour: red · amber · plain. */
export type FlagLevel = "critical" | "warning" | "info";
export interface Flag {
  kind: FlagKind;
  detail: string;
  level: FlagLevel;
}

/*
  DOCUMENTS (Pavan, 2026-10-13) — everything on a request, whoever added it:
  what the tenant shares (tickets, BOLs, invoices) and what the
  customer uploads.
*/
export const DOC_KINDS = ["Delivery ticket", "BOL", "Invoice", "Photo", "Other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export interface RequestDoc {
  id: string;
  name: string;
  kind: DocKind;
  /** The tenant's name, or the customer user who uploaded it. */
  by: string;
  at: string;
}

export const dateOfKey = (key: string): Date | null => {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const printKey = (key: string) => {
  const d = dateOfKey(key);
  return d ? DATE_FMT.format(d) : "—";
};
export const windowText = (r: Pick<OrderRequest, "windowStart" | "windowEnd">) =>
  `${formatMinutes(r.windowStart)} – ${formatMinutes(r.windowEnd)}`;

/** Gallons asked for, and how many lines are top off. */
export function quantityOf(lines: RequestLine[]) {
  return {
    gal: lines.reduce((n, l) => n + (l.topOff ? 0 : l.gal), 0),
    topOff: lines.filter((l) => l.topOff).length,
  };
}

/** A line's quantity as the app prints it. */
export const lineQty = (l: RequestLine) =>
  l.topOff ? "Top off" : l.gal > 0 ? `${l.gal.toLocaleString()} gal` : "—";

export function quantityText(lines: RequestLine[]): string {
  const { gal, topOff } = quantityOf(lines);
  /* ALL TOP OFF SAYS THE WORD, not a number — interactions T2. */
  if (topOff === 0) return gal > 0 ? gal.toLocaleString() : "";
  const t = `${topOff} top off`;
  return gal > 0 ? `${gal.toLocaleString()} + ${t}` : t;
}

const assetNames = (r: OrderRequest) =>
  r.lines.map((l) => assetById(l.assetId)?.name).filter(Boolean) as string[];
const productNames = (r: OrderRequest) =>
  Array.from(new Set(r.lines.map((l) => l.product).filter(Boolean)));

/* --------------------------------------------------------------- seed ---- */

const dayKey = (offset: number) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  return dateKeyOf(d);
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

type Seed = [
  status: RequestStatus,
  shipTo: number,
  lines: [asset: string, topOff: boolean, gal: number][],
  dayOffset: number,
  window: [number, number],
  po: string,
  recurring: string,
  updatedHoursAgo: number,
];

const SEED: Seed[] = [
  ["Unassigned", 0, [["a-1", false, 4000], ["a-2", false, 3500]], 2, [8, 12], "PO-77120", "", 1],
  ["Scheduled", 1, [["b-2", false, 2200]], 0, [15, 19], "", "", 2],
  ["Unassigned", 1, [["b-1", true, 0], ["b-2", false, 2500]], 3, [7, 11], "", "", 3],
  ["Unassigned", 2, [["c-1", false, 3000]], 1, [9, 13], "", "", 5],
  ["Scheduled", 0, [["a-1", false, 6000], ["a-3", false, 250], ["a-5", false, 120]], 4, [8, 16], "PO-77131", "", 8],
  /* PLANNED YESTERDAY, NOT DELIVERED — running late (Pavan, 2026-10-19). */
  ["Scheduled", 1, [["b-1", false, 5000]], -1, [6, 10], "PO-77098", "Weekly", 20],
  ["Scheduled", 0, [["a-4", true, 0], ["a-2", false, 4200]], 0, [13, 17], "", "", 26],
  ["Out for delivery", 2, [["c-2", false, 800]], 0, [8, 12], "PO-77090", "", 2],
  ["Out for delivery", 0, [["a-1", false, 5200], ["a-3", false, 200]], 0, [10, 14], "", "Every 2 weeks", 1.5],
  ["Partial delivery", 1, [["b-2", false, 6000]], -1, [13, 17], "", "", 18],
  ["Delivered", 0, [["a-1", false, 5500], ["a-3", false, 300]], 0, [6, 9], "PO-77071", "Every 2 weeks", 4],
  ["Delivered", 2, [["c-1", false, 2800]], 0, [6, 9], "", "", 3],
  ["Invoiced", 2, [["c-1", true, 0], ["c-3", true, 0]], -6, [7, 11], "PO-77052", "", 90],
  ["Invoiced", 0, [["a-2", false, 3900]], -3, [8, 12], "PO-77066", "", 60],
  ["Invoiced", 1, [["b-1", false, 7000]], -9, [9, 13], "PO-77044", "", 120],
  ["Paid", 0, [["a-2", false, 4800]], -14, [8, 12], "PO-77010", "Monthly", 300],
  ["Unassigned", 2, [["c-2", false, 600]], 5, [12, 16], "", "", 30],
  ["Invoiced", 1, [["b-3", true, 0]], -3, [8, 12], "", "", 96],
  ["Canceled", 0, [["a-4", false, 450]], -4, [14, 18], "", "", 70],
  ["Canceled", 2, [["c-1", false, 2000]], -5, [8, 12], "PO-77031", "", 110],
  ["Scheduled", 2, [["c-1", false, 2500]], 0, [14, 18], "PO-77140", "", 4],
  ["Delivered", 1, [["b-1", false, 4100]], 0, [5, 8], "", "", 5],
  ["Draft", 1, [["b-1", false, 3000]], 6, [8, 12], "", "", 0.5],
  /* TEN TANKS ON ONE ORDER (Pavan, 2026-10-21) — the whole of Hub A's yard. */
  ["Scheduled", 0, [["a-1", false, 3600], ["a-2", false, 4200], ["a-3", false, 150], ["a-4", true, 0], ["a-5", false, 120], ["a-6", true, 0], ["a-7", false, 360], ["a-8", false, 40], ["a-9", false, 48], ["a-10", false, 170]], 0, [6, 12], "PO-77152", "", 1],
  ["Unassigned", 0, [["a-1", false, 3000], ["a-2", false, 3800], ["a-3", false, 120], ["a-4", false, 300], ["a-5", false, 100], ["a-6", false, 280], ["a-7", true, 0], ["a-8", false, 36], ["a-9", true, 0], ["a-10", false, 160]], 1, [7, 13], "", "", 0.8],
];

/* SAMPLE FLAGS, by seed row. INVENTED. */
const SEED_FLAGS: Record<number, Flag[]> = {
  3: [{ kind: "Credit hold", detail: "Account is on credit hold until the balance is cleared.", level: "critical" }],
  7: [{ kind: "At risk of being late", detail: "ETA 12:40 PM, past the 8:00 AM – 12:00 PM window.", level: "warning" }],
  9: [{ kind: "Driver note", detail: "Gate locked at Cardinal Hub B; 2,400 gal not delivered.", level: "warning" }],
  11: [{ kind: "Driver note", detail: "Water found at the bottom of Tank O1.", level: "critical" }],
  12: [{ kind: "Invoice past due", detail: "Due 6 days ago.", level: "critical" }],
  14: [
    { kind: "Invoice past due", detail: "Due 2 days ago; due date paused by the dispute.", level: "warning" },
    { kind: "Driver note", detail: "Tank B1 sensor offline on arrival.", level: "info" },
  ],
};

/* ASKS AWAITING THE TENANT, by seed row (Pavan, 2026-10-22). INVENTED. */
const SEED_ASKS: Record<number, NonNullable<OrderRequest["changeRequest"]>> = {
  0: { kind: "change", what: "Planned date", note: "Move it to Friday morning — the yard is closed Thursday.", at: hoursAgo(3) },
  20: { kind: "cancel", what: "Cancel the order", note: "The site is shut for maintenance that day.", at: hoursAgo(4) },
};

/** What the tenant has shared by this point, plus a sample upload. INVENTED. */
function seedDocs(status: RequestStatus, i: number, at: string): RequestDoc[] {
  const n = 4400 + i;
  const docs: RequestDoc[] = [];
  const add = (name: string, kind: DocKind, by = TENANT) =>
    docs.push({ id: `doc-${i}-${docs.length}`, name, kind, by, at });
  const rank = statusRank(status);
  if (rank >= statusRank("Partial delivery") && rank <= statusRank("Paid")) {
    /* ONE DELIVERED ORDER CAME WITHOUT ITS TICKET — no proof of delivery. */
    if (i !== 11) add(`Delivery ticket T-${n}.pdf`, "Delivery ticket");
    add(`BOL B-${n}.pdf`, "BOL");
  }
  if (status === "Invoiced" || status === "Paid")
    add(`Invoice INV-${5400 + i}.pdf`, "Invoice");
  if (i % 4 === 1) add("Site access map.png", "Photo", PORTAL_ACTOR);
  return docs;
}

export const FIRST_REQUEST_NO = 8801;

export const SEED_REQUESTS: OrderRequest[] = SEED.map(
  ([status, s, lines, offset, [ws, we], po, recurring, ago], i) => {
    const shipTo = SHIP_TOS[s];
    const at = hoursAgo(ago);
    /* CREATED DAYS BEFORE ITS REQUESTED DATE (Pavan, 2026-10-18): the
       requested date is when the customer wants it delivered, so a request
       is made 2–6 days ahead of it — never after its own latest change. */
    const lead = 2 + (i % 5);
    const want = new Date(`${dayKey(offset)}T09:00`).getTime() - lead * 86_400_000;
    const created = new Date(Math.min(Date.parse(hoursAgo(ago + 2)), want)).toISOString();
    /* THE FIRST 23 ROWS KEEP THEIR NUMBERS (invoices and the dashboard name
       them); rows added after take the next ones up. */
    const n = i < 23 ? FIRST_REQUEST_NO + 22 - i : FIRST_REQUEST_NO + i;
    return {
      id: `ord-${n}`,
      requestNo: `ORD-${n}`,
      shipTo: shipTo.name,
      lines: lines.map(([assetId, topOff, gal], j) => {
        const a = assetById(assetId);
        /* ORDERED LOW, REFILLED HIGH — invented, from the monitor. */
        const at = a?.monitor && status !== "Draft" ? 8 + ((i * 7 + j * 11) % 28) : undefined;
        /* Delivered or past it (DELIVERED is declared further down). */
        const done = ["Partial delivery", "Delivered", "Invoiced", "Paid"].includes(status);
        return {
          assetId,
          product: a?.product ?? "",
          topOff,
          gal,
          levelAtOrder: at,
          /* REFILLED TO WHAT THE SUM SAYS (Pavan, 2026-10-18): at the
             request, less the days' use until the delivery, plus what went
             in — so a delivered order's breakdown adds up. */
          levelAfter:
            at !== undefined && done && a
              ? (() => {
                  if (topOff) return 100;
                  const made = dateKeyOf(new Date(created));
                  const span = Math.max(
                    0,
                    Math.round((new Date(`${dayKey(offset)}T00:00`).getTime() - new Date(`${made}T00:00`).getTime()) / 86_400_000)
                  );
                  const atGal = Math.round((at / 100) * a.capacity);
                  const left = atGal - Math.min(atGal, a.dailyUse * span);
                  return Math.min(100, Math.round(((left + gal) / a.capacity) * 100));
                })()
              : undefined,
        };
      }),
      date: dayKey(offset),
      windowStart: ws * 60,
      windowEnd: we * 60,
      preferred: i % 3 === 0 && we - ws >= 4 ? [{ start: (ws + 1) * 60, end: (ws + 3) * 60 }] : [],
      po,
      instructions: "",
      recurring: recurring !== "",
      frequency: recurring,
      endDate: "",
      status,
      flags: SEED_FLAGS[i] ?? [],
      changeRequest: SEED_ASKS[i],
      trip:
        status === "Out for delivery"
          ? {
              driver: ["Marcus Reyes", "Dana Holt"][i % 2],
              truck: ["Truck 14", "Truck 22"][i % 2],
              departedAt: new Date(Date.now() - (30 + 15 * (i % 2)) * 60_000).toISOString(),
              eta: new Date(Date.now() + (35 + 20 * (i % 2)) * 60_000).toISOString(),
            }
          : undefined,
      documents: seedDocs(status, i, at),
      /* THE PARTIAL DROP'S SHORTFALL — the driver's note says 2,400 gal. */
      undeliveredGal: status === "Partial delivery" ? 2400 : undefined,
      invoiceNo:
        status === "Invoiced" || status === "Paid"
          ? `INV-${5400 + i}`
          : undefined,
      updatedAt: at,
      audit: [
        { at: created, by: PORTAL_ACTOR, changes: ["Order created"] },
        ...(status === "Draft"
          ? []
          : [{ at, by: status === "Unassigned" ? PORTAL_ACTOR : TENANT, changes: [`Status: ${status}`] }]),
      ],
    };
  }
);

/* ----------------------------------------------------------- estimate ---- */

/*
  THE ESTIMATED COST (Pavan, 2026-10-13) — from the market price and the
  customer's own pricing, shown before AND after submitting, and always said
  to be an estimate, not the final price.

  INVENTED: the market prices, the customer's differentials and the band.
*/
/** Today's market (rack) price, $/gal. */
export const MARKET_PRICE: Record<string, number> = {
  Diesel: 3.412,
  "Dyed Diesel": 3.188,
  "Unleaded 87": 2.964,
  DEF: 2.75,
  "Jet A": 4.36,
  "Avgas 100LL": 5.84,
  Propane: 1.92,
};
/** The pricing the tenant has set for this customer, against the market, $/gal. */
export const CUSTOMER_DIFF: Record<string, number> = {
  Diesel: -0.08,
  "Dyed Diesel": -0.06,
  "Unleaded 87": -0.05,
  DEF: -0.06,
  "Jet A": -0.09,
  "Avgas 100LL": -0.11,
  Propane: -0.07,
};
/** How far the market may move before the quote, either way, $/gal. */
const BAND = 0.04;
/** When the market prices were read — the estimate's "as of". */
export const PRICES_AS_OF = (() => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
})();

export interface LineEstimate {
  line: RequestLine;
  market: number;
  diff: number;
  /** $/gal, low and high. */
  rateLow: number;
  rateHigh: number;
  /** $, low and high — null for top off, priced on delivery. */
  low: number | null;
  high: number | null;
}

export function estimate(lines: RequestLine[]) {
  const rows: LineEstimate[] = lines
    .filter((l) => l.product && MARKET_PRICE[l.product] !== undefined)
    .map((line) => {
      const market = MARKET_PRICE[line.product];
      const diff = CUSTOMER_DIFF[line.product] ?? 0;
      const rate = market + diff;
      const priced = !line.topOff && line.gal > 0;
      return {
        line,
        market,
        diff,
        rateLow: rate - BAND,
        rateHigh: rate + BAND,
        low: priced ? line.gal * (rate - BAND) : null,
        high: priced ? line.gal * (rate + BAND) : null,
      };
    });
  return {
    rows,
    low: rows.reduce((n, r) => n + (r.low ?? 0), 0),
    high: rows.reduce((n, r) => n + (r.high ?? 0), 0),
  };
}

/* ------------------------------------------------------------- cancel ---- */

/** The tenant's cancel cut-off before the requested window. INVENTED: 24 h. */
export const CANCEL_CUTOFF_HOURS = 24;

/*
  WHAT CANCEL DOES, BY WHERE THE REQUEST IS (PRD FR-27):
    now      Unassigned, or Scheduled outside the cut-off — canceled
             at once
    request  Scheduled inside the cut-off — the tenant decides,
             and a fee may apply
    blocked  out for delivery — too late to cancel here
    none     already finished or already ended
*/
export type CancelRule = "now" | "request" | "blocked" | "none";

export function cancelRule(r: OrderRequest, now = new Date()): CancelRule {
  switch (r.status) {
    case "Unassigned":
      return "now";
    case "Scheduled": {
      const start = dateOfKey(r.date);
      if (!start) return "now";
      start.setMinutes(r.windowStart);
      return start.getTime() - now.getTime() > CANCEL_CUTOFF_HOURS * 3600_000 ? "now" : "request";
    }
    case "Out for delivery":
      return "blocked";
    default:
      return "none";
  }
}

/* --------------------------------------------------------- the product --- */

/** The product last ordered for this tank or asset, if any. */
export function lastProductFor(assetId: string, all: OrderRequest[]): string | undefined {
  return [...all]
    .filter((r) => r.status !== "Draft")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .flatMap((r) => r.lines)
    .find((l) => l.assetId === assetId && l.product)?.product;
}

/* ----------------------------------------------------------- overview ---- */

export const todayKey = () => dateKeyOf(startOfDay(new Date()));

/** An order that is live — not a draft, not canceled. */
export const LIVE: RequestStatus[] = REQUEST_STATUSES.filter((st) => !["Draft", "Canceled"].includes(st));
export const DELIVERED: RequestStatus[] = [
  "Partial delivery",
  "Delivered",
  "Invoiced",
  "Paid",
];

/** Live, today, not yet delivered and not on the road. */
export const YET_TO_DELIVER: RequestStatus[] = LIVE.filter(
  (st) => !DELIVERED.includes(st) && st !== "Out for delivery"
);

/*
  THE OVERVIEW'S FIGURES (Pavan, 2026-10-13) — read-only counts: the statuses
  each counts, on the date it is about (today, or any date for invoices).
*/
export interface Drill {
  key: string;
  label: string;
  statuses: RequestStatus[];
  /** `today` sets the date range to today; `any` widens it to every request. */
  range: "today" | "any";
}
export const DRILLS: Record<string, Drill> = {
  today: { key: "today", label: "Today's orders", statuses: LIVE, range: "today" },
  delivered: { key: "delivered", label: "Delivered", statuses: DELIVERED, range: "today" },
  out: { key: "out", label: "Out for delivery", statuses: ["Out for delivery"], range: "today" },
  pending: { key: "pending", label: "Yet to be delivered", statuses: YET_TO_DELIVER, range: "today" },
  invoices: { key: "invoices", label: "Invoices to review", statuses: ["Invoiced"], range: "any" },
};

/** One drill's count: every request with its statuses, on its own range. */
export function drillCount(rows: OrderRequest[], d: Drill) {
  const t = todayKey();
  return rows.filter((r) => d.statuses.includes(r.status) && (d.range === "any" || r.date === t))
    .length;
}

/* THE REFERENCE CARD'S TONES, by meaning (Pavan, 2026-10-13) — done green,
   under way violet, coming orange; the DS lane green and violet, and the
   chart orange lifted a sixth toward white. Green is the lane green as it
   stands: lifted, it fell out of the validated lightness band (dataviz
   validator, 2026-10-13). Literal so Tailwind keeps them. */
export const DAY_TONE = {
  delivered: "bg-fp-lane-green",
  out: "bg-fp-lane-violet",
  pending: "bg-[color-mix(in_oklab,var(--fp-viz-2)_85%,white)]",
} as const;

/*
  TODAY, IN FIGURES (Pavan, 2026-10-13) — what the overview cards and the
  details sheet read: today's live requests, how many are delivered, out
  and yet to go, and gallons delivered of gallons requested, overall and by
  product. A top-off line has no gallons until it is delivered, so it is
  counted beside them.
*/
export function todayStats(rows: OrderRequest[]) {
  const t = todayKey();
  const todays = rows.filter((r) => r.date === t && LIVE.includes(r.status));
  const isDelivered = (r: OrderRequest) => DELIVERED.includes(r.status);
  const products = PRODUCTS.map((product) => {
    const mine = todays.flatMap((r) =>
      r.lines.filter((l) => l.product === product).map((l) => ({ l, done: isDelivered(r) }))
    );
    const gal = (xs: typeof mine) => xs.reduce((g, x) => g + (x.l.topOff ? 0 : x.l.gal), 0);
    return {
      product,
      requested: gal(mine),
      delivered: gal(mine.filter((x) => x.done)),
      topOff: mine.filter((x) => x.l.topOff).length,
      lines: mine.length,
    };
  }).filter((p) => p.lines > 0);
  return {
    todays,
    due: todays.length,
    delivered: todays.filter(isDelivered).length,
    out: todays.filter((r) => r.status === "Out for delivery").length,
    pending: todays.filter((r) => YET_TO_DELIVER.includes(r.status)).length,
    products,
    galRequested: products.reduce((g, p) => g + p.requested, 0),
    galDelivered: products.reduce((g, p) => g + p.delivered, 0),
    topOff: products.reduce((n, p) => n + p.topOff, 0),
  };
}

/*
  THE LAST SEVEN DAYS (Pavan, 2026-10-13 — the tiles' trend and change).
  Orders and gallons requested for each of the seven days before today,
  oldest first; [0] is the same weekday last week, which today is compared
  with. INVENTED.
*/
export const PAST_WEEK = {
  orders: [7, 9, 8, 6, 10, 8, 9],
  gallons: [24900, 28100, 26400, 21800, 31200, 25500, 27300],
};

/* ------------------------------------------------------------- tanks ----- */

/** A tank at or under this is nearly empty — the Urgent band (Pavan,
    2026-10-17); at or under EMPTY, empty. */
export const LOW_LEVEL = 10;
export const EMPTY_LEVEL = 3;

/*
  NEARLY EMPTY, AND NOTHING ORDERED (Pavan, 2026-10-13) — a tank at or under
  the low level with no live request on its way to it. The list's critical
  banner names them.
*/
export function lowTanksWithoutOrder(all: OrderRequest[]) {
  const open = new Set(
    all
      .filter((r) => LIVE.includes(r.status) && !DELIVERED.includes(r.status))
      .flatMap((r) => r.lines.map((l) => l.assetId))
  );
  return SHIP_TOS.flatMap((s) =>
    s.assets
      .filter((a) => a.monitor && a.status === "Active" && a.level <= LOW_LEVEL && !open.has(a.id))
      .map((a) => ({ asset: a, shipTo: s.name }))
  );
}

/* ------------------------------------------------------------ columns ---- */

export type RequestColumnKey =
  | "requestNo"
  | "shipTo"
  | "assets"
  | "products"
  | "quantity"
  | "level"
  | "fulfill"
  | "daysToEmpty"
  | "battery"
  | "date"
  | "repeats"
  | "po"
  | "flags"
  | "documents"
  | "status"
  | "updated"
  | "actions";

export const REQUEST_COLUMNS: {
  key: RequestColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "left" | "right";
}[] = [
  /* SET BY HAND TO FILL THE TABLE (Pavan, 2026-10-21): each from its widest
     cell (DS ui §10p) plus 15–20%; Ship-to wider again; Tanks & assets fits a
     24-character name and a "+N". */
  { key: "requestNo", label: "Order #", width: 140, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 240, sortable: true },
  { key: "assets", label: "Tanks & assets", width: 240, sortable: true },
  { key: "products", label: "Product", width: 130, sortable: true },
  { key: "quantity", label: "Quantity (Gal)", width: 155, sortable: true },
  /* THE TANKS' READINGS, IN THE ORDER'S ROW (Pavan, 2026-10-21 — trial of
     bringing the nested layer up; see OrdersScreen's TANK_LAYOUT). */
  { key: "level", label: "Current level", width: 150 },
  { key: "fulfill", label: "On fulfilment", width: 140 },
  { key: "daysToEmpty", label: "Days to empty", width: 130 },
  { key: "battery", label: "Battery", width: 110 },
  { key: "date", label: "Planned date", width: 165, sortable: true },
  { key: "status", label: "Status", width: 200, sortable: true },
  /* WHAT NEEDS THE EYE, and WHAT HAS BEEN SHARED (Pavan, 2026-10-13). */
  { key: "flags", label: "Flags", width: 180, sortable: true },
  { key: "documents", label: "Documents", width: 150, sortable: true },
  { key: "repeats", label: "Repeats", width: 110, sortable: true },
  { key: "po", label: "PO #", width: 120, sortable: true },
  { key: "updated", label: "Updated", width: 140, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/* HIDDEN UNTIL ASKED FOR — so Status is on screen without scrolling
   (docs/unified-view/2-layouts.md §5). All are in the column menu. */
export const DEFAULT_HIDDEN: RequestColumnKey[] = ["po", "repeats", "updated"];

/* THE ORDERS LIST'S COLUMNS — no delivery-flags column. */
export const REQUEST_LIST_COLUMNS = REQUEST_COLUMNS.filter((c) => c.key !== "flags");

export const REQUEST_SEARCH_FIELDS = REQUEST_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/** What each column PRINTS, as text a header box or a search can match. */
export function requestColumnText(r: OrderRequest, key: RequestColumnKey): string {
  switch (key) {
    case "requestNo": {
      const s = sentOn(r);
      return `${r.requestNo} ${s ? DATE_FMT.format(new Date(s)) : ""}`;
    }
    case "shipTo":
      return r.shipTo;
    case "assets":
      return assetNames(r).join(", ");
    case "products":
      return productNames(r).join(", ");
    case "quantity":
      return quantityText(r.lines);
    case "date":
      return r.date ? `${printKey(r.date)} ${windowText(r)}` : "";
    case "repeats":
      return r.recurring ? r.frequency : "";
    case "po":
      return r.po;
    case "flags":
      return r.flags.map((f) => f.kind).join(", ");
    case "documents":
      return r.documents.map((d) => d.name).join(", ");
    case "status":
      return r.status;
    case "updated":
      return DATE_FMT.format(new Date(r.updatedAt));
    default:
      return "";
  }
}

export function matchesRequest(r: OrderRequest, q: string): boolean {
  return REQUEST_SEARCH_FIELDS.map((f) => requestColumnText(r, f.key))
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export interface RequestSort {
  key: RequestColumnKey;
  dir: "asc" | "desc";
}

function sortValue(r: OrderRequest, key: RequestColumnKey): string | number {
  switch (key) {
    case "quantity":
      return quantityOf(r.lines).gal;
    case "date":
      return `${r.date}-${String(r.windowStart).padStart(4, "0")}`;
    case "status":
      return statusRank(r.status);
    case "flags":
      return r.flags.length;
    case "documents":
      return r.documents.length;
    case "updated":
      return r.updatedAt;
    default:
      return requestColumnText(r, key).toLowerCase();
  }
}

export function sortRequests(rows: OrderRequest[], sort: RequestSort | null): OrderRequest[] {
  /* Unsorted, the newest change is on top. */
  if (!sort) return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, sort.key);
    const y = sortValue(b, sort.key);
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}

/* -------------------------------------------------------------- store ---- */

/*
  ONE OWNER FOR THE REQUESTS — outlives the screen, so a request made here
  is still here after visiting another page. The setter writes the activity
  log, as `quoteStore` does.
*/
/*
  THE SEED'S FILLS, TUNED (Pavan, 2026-10-22): every order fills (or, once
  delivered, filled) its monitored tanks to somewhere between 45% and 94% —
  but for ONE overload (a big tank sent 120%) and ONE that stays low (a near-
  empty tank sent too little, ~18%). Quantities only; the tanks are as seeded.
  Plain arithmetic here — the tank helpers further down are not defined yet
  when this runs.
*/
/** `examples` off: the ideal fills only — for orders made later (a rule's). */
function tuneFulfilment(rows: OrderRequest[], examples = true): OrderRequest[] {
  const today = startOfDay(new Date()).getTime();
  let k = 0;
  let overload = !examples;
  let low = !examples;
  return rows.map((r) => {
    if (!r.date) return r;
    /* DELIVERED — refilled to 45–94%: the gallons that sum to it, and the
       monitor's reading after, from the level when ordered (as the seed). */
    if (DELIVERED.includes(r.status)) {
      const made = r.audit?.[0]?.at ? startOfDay(new Date(r.audit[0].at)).getTime() : today;
      const span = Math.max(0, Math.round((new Date(`${r.date}T00:00`).getTime() - made) / 86_400_000));
      return {
        ...r,
        lines: r.lines.map((l) => {
          const a = assetById(l.assetId);
          if (!a?.monitor || !a.capacity || l.topOff || l.levelAtOrder === undefined) return l;
          const atGal = Math.round((l.levelAtOrder / 100) * a.capacity);
          const left = atGal - Math.min(atGal, a.dailyUse * span);
          const target = 45 + ((k++ * 17) % 50);
          const gal = Math.max(10, Math.round(((target / 100) * a.capacity - left) / 10) * 10);
          return { ...l, gal, levelAfter: Math.min(100, Math.round(((left + gal) / a.capacity) * 100)) };
        }),
      };
    }
    const days = Math.max(0, Math.round((new Date(`${r.date}T00:00`).getTime() - today) / 86_400_000));
    return {
      ...r,
      lines: r.lines.map((l) => {
        const a = assetById(l.assetId);
        if (!a?.monitor || !a.capacity || l.topOff) return l;
        const left = Math.max(0, Math.round((a.level / 100) * a.capacity) - a.dailyUse * days);
        let target = 45 + ((k++ * 17) % 50);
        if (!overload && a.capacity >= 1000 && left / a.capacity < 0.8) {
          overload = true;
          target = 120;
        } else if (!low && left / a.capacity < 0.1) {
          low = true;
          target = 18;
        }
        return { ...l, gal: Math.max(10, Math.round(((target / 100) * a.capacity - left) / 10) * 10) };
      }),
    };
  });
}

let requests: OrderRequest[] = tuneFulfilment(SEED_REQUESTS);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRequests(): OrderRequest[] {
  return React.useSyncExternalStore(subscribe, () => requests);
}

export function updateRequest(id: string, patch: Partial<OrderRequest>, change?: string) {
  const at = new Date().toISOString();
  requests = requests.map((r) =>
    r.id !== id
      ? r
      : {
          ...r,
          ...patch,
          updatedAt: at,
          /* MEANINGFUL EVENTS ONLY — a draft's typing is not logged. */
          audit: change ? [...(r.audit ?? []), { at, by: PORTAL_ACTOR, changes: [change] }] : r.audit,
        }
  );
  emit();
}

/** A blank Draft, made the moment Create Order is pressed. */
export function createRequest(recurring = false): OrderRequest {
  const n = nextRequestNo();
  const at = new Date().toISOString();
  const r: OrderRequest = {
    id: `ord-new-${n}`,
    requestNo: `ORD-${n}`,
    /* One ship-to on the account is simply that ship-to. */
    shipTo: SHIP_TOS.length === 1 ? SHIP_TOS[0].name : "",
    lines: [blankLine()],
    date: "",
    windowStart: 8 * 60,
    windowEnd: 12 * 60,
    preferred: [],
    po: "",
    instructions: "",
    recurring,
    frequency: recurring ? FREQUENCIES[2] : "",
    endDate: "",
    status: "Draft",
    flags: [],
    documents: [],
    updatedAt: at,
    audit: [{ at, by: PORTAL_ACTOR, changes: ["Order created"] }],
  };
  requests = [r, ...requests];
  emit();
  return r;
}

/** Requests a rule made — added once each (their id is rule + date). */
export function insertRequests(made: OrderRequest[]) {
  const have = new Set(requests.map((r) => r.id));
  const fresh = tuneFulfilment(made.filter((r) => !have.has(r.id)), false);
  if (fresh.length === 0) return;
  requests = [...fresh, ...requests];
  emit();
}

/** The next order number — for a new order and a rule's orders. */
export function nextRequestNo() {
  return Math.max(FIRST_REQUEST_NO - 1, ...requests.map((r) => Number(r.requestNo.slice(4)) || 0)) + 1;
}

/** Every request, as it is now — for reads outside React. */
export const allRequests = () => requests;

/*
  DUPLICATE (Pavan, 2026-10-13 — "Duplicate", not "Reorder"): a new Draft
  with the same ship-to, tanks, products, quantities, window, recurrence and
  instructions. The date is left blank — the old one has usually passed.
*/
export function duplicateRequest(id: string): OrderRequest | null {
  const src = requests.find((r) => r.id === id);
  if (!src) return null;
  const r = createRequest();
  updateRequest(r.id, {
    shipTo: src.shipTo,
    lines: src.lines.map((l) => ({ ...l })),
    windowStart: src.windowStart,
    windowEnd: src.windowEnd,
    preferred: src.preferred.map((p) => ({ ...p })),
    instructions: src.instructions,
    recurring: src.recurring,
    frequency: src.frequency,
  });
  const at = new Date().toISOString();
  requests = requests.map((x) =>
    x.id === r.id
      ? { ...x, audit: [{ at, by: PORTAL_ACTOR, changes: [`Duplicated from ${src.requestNo}`] }] }
      : x
  );
  emit();
  return requests.find((x) => x.id === r.id)!;
}

/** A ship-to renamed — its requests follow it, so none loses its site. */
export function renameShipToInRequests(from: string, to: string) {
  if (from === to) return;
  requests = requests.map((r) => (r.shipTo === from ? { ...r, shipTo: to } : r));
  emit();
}

/** Drop an untouched new draft, closed unfilled. */
export function discardRequest(id: string) {
  requests = requests.filter((r) => r.id !== id);
  emit();
}

/*
  ORDER THE REST (Pavan, 2026-10-15 — PRD FR-28): a new request for the
  gallons a partial delivery left, to the same ship-to and tanks, split over
  its lines in proportion; the date is left to choose.
*/
export function orderTheRest(id: string): OrderRequest | null {
  const src = requests.find((r) => r.id === id);
  if (!src || !src.undeliveredGal) return null;
  const r = duplicateRequest(id);
  if (!r) return null;
  const asked = src.lines.reduce((t, l) => t + (l.topOff ? 0 : l.gal), 0) || 1;
  updateRequest(r.id, {
    recurring: false,
    frequency: "",
    lines: src.lines.map((l) => ({ ...l, topOff: false, gal: Math.round((src.undeliveredGal! * (l.gal || asked)) / asked) })),
    instructions: `The rest of ${src.requestNo} (${src.undeliveredGal.toLocaleString()} gal not delivered).`,
  });
  const at = new Date().toISOString();
  requests = requests.map((x) =>
    x.id === r.id ? { ...x, audit: [{ at, by: PORTAL_ACTOR, changes: [`The rest of ${src.requestNo}`] }] } : x
  );
  emit();
  return requests.find((x) => x.id === r.id)!;
}

/* -------------------------------------------------------- level bands --- */

/*
  TANK LEVEL BANDS (Pavan, 2026-10-17) — set on the monitor, read here:
  10% or lower Urgent (red, blinking), under 50 Low (red), under 80 Moderate
  (yellow), 80 and above Sufficient (green). Batteries under 20% are low.
*/
export type LevelBand = "Urgent" | "Low" | "Moderate" | "Sufficient";
export const levelBand = (pct: number): LevelBand =>
  pct <= 10 ? "Urgent" : pct < 50 ? "Low" : pct < 80 ? "Moderate" : "Sufficient";
export const LOW_BATTERY = 20;

/** Preferred windows kept inside the delivery window — trimmed, empties dropped. */
export const clampPreferred = (p: TimeSpan[], start: number, end: number): TimeSpan[] =>
  p
    .map((x) => ({ start: Math.max(start, Math.min(x.start, end)), end: Math.min(end, Math.max(x.end, start)) }))
    .filter((x) => x.end > x.start);

/* -------------------------------------------------- tank arithmetic ---- */

/*
  WHAT THE MONITOR TELLS AN ORDER (Pavan, 2026-10-17). From the level, the
  size and the day-to-day usage:

    in the tank now      = level% × capacity
    days to empty        = in the tank now ÷ daily use
    left at delivery     = in the tank now − daily use × days until delivery
    SUGGESTED            = capacity − left at delivery   (full on the day)
    after delivery       = (left at delivery + ordered) ÷ capacity

  e.g. 10,000 gal tank at 20% (2,000), 400 gal/day, delivery in 2 days:
  1,200 left → suggested 8,800; ordering 6,000 makes it 72%.
*/
export const galNow = (a: Asset) => Math.round((a.level / 100) * a.capacity);
export const daysToEmpty = (a: Asset): number | null =>
  a.monitor && a.dailyUse > 0 ? Math.floor(galNow(a) / a.dailyUse) : null;
/** Whole days from today to a `YYYY-MM-DD` — 0 for today, unset or past. */
export const daysUntil = (key: string) => {
  if (!key) return 0;
  const d = new Date(`${key}T00:00`);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d.getTime() - t.getTime()) / 86_400_000));
};
export const galAtDelivery = (a: Asset, days: number) => Math.max(0, galNow(a) - a.dailyUse * days);
/** Fill to full on the delivery day, to the nearest 10 gal. */
export const suggestedGal = (a: Asset, days: number) =>
  Math.max(0, Math.round((a.capacity - galAtDelivery(a, days)) / 10) * 10);
/* NOT CAPPED (Pavan, 2026-10-22): 1,200 gal into a 1,000 gal tank reads
   120% — the overload is the figure, not hidden behind "full". */
export const pctAfterDelivery = (a: Asset, days: number, gal: number, topOff: boolean) =>
  topOff ? 100 : Math.round(((galAtDelivery(a, days) + gal) / a.capacity) * 100);

/**
 * WHEN THE ORDER WAS SENT TO THE TENANT (Pavan, 2026-10-19) — shown under its
 * number; null while it is a draft. The PLANNED DATE (`date`) is a different
 * thing: when the customer wants it delivered.
 */
export function sentOn(r: OrderRequest): string | null {
  if (r.status === "Draft") return null;
  const sent = r.audit?.find((e) => e.changes.some((c) => c === "Order submitted" || c === "Request submitted"));
  return sent?.at ?? r.audit?.[0]?.at ?? null;
}

/** THE CUSTOMER ASKS FOR A CHANGE to a sent order (Pavan, 2026-10-19). */
export const CHANGE_KINDS = ["Planned date", "Delivery window", "Quantity", "Tanks or products", "Cancel the order", "Something else"];
export function requestChange(id: string, what: string, note: string) {
  const o = requests.find((x) => x.id === id);
  if (!o) return;
  updateRequest(
    id,
    {
      changeRequest: { kind: what === "Cancel the order" ? "cancel" : "change", what, note, at: new Date().toISOString() },
    },
    `Change requested · ${what}${note ? ` — ${note}` : ""}`
  );
}

/** The list's rows: every order, and the record a press opens is its own. */
export function orderListRows(all: OrderRequest[]): OrderRequest[] {
  return all;
}

/* ---------------------------------------------- dashboard attention ---- */

/** STILL TO ARRIVE — sent, not yet delivered. */
export const NOT_DELIVERED: RequestStatus[] = ["Unassigned", "Scheduled", "Out for delivery"];
/** RUNNING LATE (Anirudh, 2026-10-17): its planned date has passed and it is
    not delivered. There is no ETA to judge it by yet. */
export const isRunningLate = (r: OrderRequest) => NOT_DELIVERED.includes(r.status) && !!r.date && r.date < todayKey();
/** NO PROOF OF DELIVERY: delivered, but no delivery ticket on it. */
export const lacksPod = (r: OrderRequest) =>
  DELIVERED.includes(r.status) && !r.documents.some((d) => d.kind === "Delivery ticket");
/** ON HOLD FOR CREDIT — a yes/no from the tenant; no balance. */
export const onCreditHold = (r: OrderRequest) => r.flags.some((f) => f.kind === "Credit hold");

export { scheduleSummary } from "../unified-view/threepl/RuleFrequency";
