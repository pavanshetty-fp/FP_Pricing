import * as React from "react";
import {
  CURRENT_USER,
  NOW,
  DAY,
  FIELD_LABEL,
  NOT_SET,
  recordAction,
  recordTitle,
  type ChangeRecord,
  type ConfigRow,
  type Edit,
  type Entity,
  type EntityMap,
  type ImpactLine,
  type SetupField,
} from "./changeLog";
import { logSnapshot, setFeeLog } from "./changeLogStore";
import {
  CUSTOMERS,
  SHIPTOS,
  PRODUCTS,
  CATEGORIES,
  customerOf,
  productOf,
  shiptoOf,
  stateOf,
} from "./seed";

/*
  FEE RULE ENGINE (Yash, 2026-11-24) — spec: docs/unified-view/pricing/fee-rule-engine.md.

  Two layers. CONFIGURATION (Pricing setup › Fee) holds a fee's value, its
  scope (who it reaches) and its application (when it applies, and whether a
  person reviews it on the order). APPLICATION (a ship-to's or customer's
  pricing) only removes a fee that reaches it, or puts it back — no editing,
  no adding outside the scope.

  · Scope rows: Include / Exclude × customer × hubs × ship-tos, and products by
    category. Exclude wins. Empty lists mean "All", which takes in records
    added later. A hub is a customer's own group of ship-tos; one hub name is
    shared by many customers.
  · Removals: a customer's reach every ship-to that follows the customer (tag
    Customer or Hub); a ship-to's reach only that price. A price on its own
    pricing (tag Ship-to) keeps the customer's removals as they stood when it
    went its own way; a reset drops its own removals.
  · Rules run on what is known: planned facts before delivery, actual facts
    after. Quantity is known only once delivered. Amounts are worked out once
    the delivery is in.

  This store owns fees for the configuration pages and orders. The change
  log's per-row fee lists (`ConfigRow.fees`) stay as history; phase 2 joins
  them (bulk rules).
*/

// ------------------------------------------------------------------ types --

export type FeeWhen = "always" | "rule";
export type ChargePer = "gallon" | "delivery" | "asset" | "hour" | "mile";
export type RangeBy = "quantity" | "distance" | "time";
export type ApplicableType = "all" | "delivery" | "extraction";

export interface Band {
  from: number;
  to: number | null;
  rate: number;
}
export interface FeeAmount {
  kind: "flat" | "range";
  rate: number;
  unit: "$" | "%";
  per: ChargePer;
  rangeBy: RangeBy;
  bands: Band[];
  /** VENDOR-SPECIFIC RATES (Yash, 2026-11-24) — a flat rate per vendor;
   *  vendors not named, and first-party orders, use the rate above. */
  vendorSpecific?: boolean;
  vendorRates?: VendorRate[];
}
export interface VendorRate {
  vendors: string[];
  rate: number | null;
}
/** The 3PL vendors that can carry an order (the live app's vendor list). */
export const VENDORS = [
  "FCOIN",
  "Star Transport",
  "Atlas Petroleum",
  "Bayline Fuel Supply",
  "Cardinal Energy",
  "Granite Ridge Fuel",
  "Keystone Bulk",
  "Meridian Supply Co.",
  "Northfield Fuels",
  "Redstone Distributing",
  "Westmark Petroleum",
];
/** The flat rate for an order's vendor — the default when it has none. */
export function rateFor(a: FeeAmount, vendor: string | null): number {
  if (!vendor || !a.vendorSpecific) return a.rate;
  const row = (a.vendorRates ?? []).find((r) => r.vendors.includes(vendor) && r.rate !== null);
  return row ? (row.rate as number) : a.rate;
}

export interface ScopeRow {
  mode: "include" | "exclude";
  /** "" = all customers. */
  customer: string;
  /** [] = all hubs. */
  hubs: string[];
  /** [] = all ship-tos. */
  shiptos: string[];
}
export interface ProductRow {
  mode: "include" | "exclude";
  /** "" = all categories. */
  category: string;
  /** [] = all products (of the category). */
  products: string[];
}

export type CondKind =
  | "dayTime"
  | "period"
  | "date"
  | "leadTime"
  | "quantity"
  | "orderType"
  | "assetType"
  | "assets";
export interface Cond {
  kind: CondKind | "";
  op: string;
  days?: number[];
  from?: string;
  to?: string;
  fromDay?: number;
  toDay?: number;
  holidays?: string[];
  months?: [number, number];
  n?: number | null;
  n2?: number | null;
  values?: string[];
}
export interface FeeRule {
  match: "all" | "any";
  conds: Cond[];
  tz: "shipto" | "tenant";
}

export interface Fee {
  id: string;
  name: string;
  code: string;
  erpId: string;
  desc: string;
  applicableType: ApplicableType;
  when: FeeWhen;
  /** Offered on the order; a person applies it. */
  review: boolean;
  rule: FeeRule;
  scope: ScopeRow[];
  products: ProductRow[];
  amount: FeeAmount;
  active: boolean;
}

/** How a fee applies, as the lists and pills say it. */
export type FeeMode = "always" | "rule" | "review" | "ruleReview";
export const modeOf = (f: Pick<Fee, "when" | "review">): FeeMode =>
  f.when === "always"
    ? f.review
      ? "review"
      : "always"
    : f.review
      ? "ruleReview"
      : "rule";
export const MODE_LABEL: Record<FeeMode, string> = {
  always: "Always applied",
  rule: "By rule",
  review: "Review and apply",
  ruleReview: "By rule · review",
};
/** Always applied and charged without a person — the only fees in a configured price ($/gal); rule fees wait on the order. */
export const isCharged = (f: Fee) => f.when === "always" && !f.review;

// ------------------------------------------------------------- vocabulary --

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DAY_SHORT = DAYS.map((d) => d.slice(0, 3));
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const TIMES = Array.from(
  { length: 48 },
  (_, i) =>
    `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);
export const timeLabel = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const HOLIDAYS: { id: string; name: string }[] = [
  { id: "01-01", name: "New Year's Day" },
  { id: "05-25", name: "Memorial Day" },
  { id: "07-04", name: "Independence Day" },
  { id: "09-07", name: "Labor Day" },
  { id: "11-26", name: "Thanksgiving Day" },
  { id: "12-25", name: "Christmas Day" },
];
export const ORDER_TYPES = ["Delivery", "Extraction"];
export const ASSET_TYPES = [
  "Truck",
  "Trailer",
  "Generator",
  "Excavator",
  "Light tower",
  "Tank",
];
export const APPLICABLE_LABEL: Record<ApplicableType, string> = {
  all: "Delivery and extraction",
  delivery: "Delivery",
  extraction: "Extraction",
};
export const PER_LABEL: Record<ChargePer, string> = {
  gallon: "Gallon",
  delivery: "Delivery",
  asset: "Asset",
  hour: "Hour",
  mile: "Mile",
};
export const RANGE_LABEL: Record<RangeBy, string> = {
  quantity: "Quantity (gal)",
  distance: "Distance (mi)",
  time: "Time on site (min)",
};

export const COND_LABEL: Record<CondKind, string> = {
  dayTime: "Delivery days & times",
  period: "Delivery period",
  date: "Delivery date",
  leadTime: "Lead time",
  quantity: "Delivered quantity",
  orderType: "Order type",
  assetType: "Asset type",
  assets: "Number of assets",
};
export const COND_KINDS = Object.keys(COND_LABEL) as CondKind[];
export const COND_OPS: Record<CondKind, [string, string][]> = {
  dayTime: [
    ["within", "Within"],
    ["outside", "Outside"],
  ],
  period: [["from", "From – to"]],
  date: [
    ["holiday", "Is a holiday"],
    ["months", "Is in months"],
  ],
  leadTime: [
    ["within", "Within (hours)"],
    ["sameDay", "Same day"],
  ],
  quantity: [
    ["lt", "Less than"],
    ["gte", "At least"],
    ["between", "Between"],
  ],
  orderType: [["any", "Is any of"]],
  assetType: [
    ["any", "Is any of"],
    ["none", "Is none of"],
  ],
  assets: [
    ["gte", "At least"],
    ["lte", "At most"],
    ["between", "Between"],
  ],
};
export const blankCond = (kind: CondKind): Cond => {
  switch (kind) {
    case "dayTime":
      return {
        kind,
        op: "within",
        days: [1, 2, 3, 4, 5],
        from: "07:00",
        to: "17:00",
      };
    case "period":
      return {
        kind,
        op: "from",
        fromDay: 5,
        from: "17:00",
        toDay: 1,
        to: "00:00",
      };
    case "date":
      return {
        kind,
        op: "holiday",
        holidays: HOLIDAYS.map((h) => h.id),
        months: [11, 1],
      };
    case "leadTime":
      return { kind, op: "within", n: 4 };
    case "quantity":
      return { kind, op: "lt", n: 100, n2: null };
    case "orderType":
      return { kind, op: "any", values: ["Delivery"] };
    case "assetType":
      return { kind, op: "any", values: [] };
    case "assets":
      return { kind, op: "gte", n: 1, n2: null };
  }
};

// ------------------------------------------------------------------ hubs --

/** A ship-to's hub — its market's hub (the market is set once per ship-to). */
export function hubOf(
  shiptoId: string,
  rows: ConfigRow[],
  ents: EntityMap,
): string {
  const r = rows.find((x) => x.shiptoId === shiptoId && x.market);
  const m = r ? ents.get(r.market)?.name : undefined;
  return `${m ?? "Houston"} hub`;
}
/** Every ship-to's hub, at once. */
export function hubMap(
  rows: ConfigRow[],
  ents: EntityMap,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rows)
    if (!out.has(r.shiptoId) && r.market)
      out.set(r.shiptoId, `${ents.get(r.market)?.name ?? "Houston"} hub`);
  return out;
}
export function useHubMap(rows: ConfigRow[], ents: EntityMap) {
  const m = React.useMemo(() => hubMap(rows, ents), [rows, ents]);
  return React.useCallback(
    (shiptoId: string) => m.get(shiptoId) ?? "Houston hub",
    [m],
  );
}

/** Every hub in use, or the ones a customer's ship-tos sit under. */
export function hubsIn(
  rows: ConfigRow[],
  ents: EntityMap,
  customerId?: string,
): string[] {
  const ids = [
    ...new Set(
      rows
        .filter((r) => !customerId || r.customerId === customerId)
        .map((r) => r.shiptoId),
    ),
  ];
  return [...new Set(ids.map((id) => hubOf(id, rows, ents)))].sort();
}

// ----------------------------------------------------------------- reach --

const rowHit = (
  s: ScopeRow,
  customerId: string,
  hub: string,
  shiptoId: string,
) =>
  (!s.customer || s.customer === customerId) &&
  (!s.hubs.length || s.hubs.includes(hub)) &&
  (!s.shiptos.length || s.shiptos.includes(shiptoId));
const prodHit = (p: ProductRow, productId: string) => {
  const cat = productOf(productId).categoryId;
  return (
    (!p.category || p.category === cat) &&
    (!p.products.length || p.products.includes(productId))
  );
};

/** Does the fee's scope take in this ship-to × product? With why not, in words. */
export function inScope(
  f: Fee,
  row: ConfigRow,
  hub: string,
): { ok: boolean; why?: string } {
  const inc = f.scope.filter((s) => s.mode === "include");
  const exc = f.scope.filter((s) => s.mode === "exclude");
  if (
    inc.length &&
    !inc.some((s) => rowHit(s, row.customerId, hub, row.shiptoId))
  )
    return { ok: false, why: "Ship-to not in the fee's scope" };
  if (exc.some((s) => rowHit(s, row.customerId, hub, row.shiptoId)))
    return { ok: false, why: "Ship-to excluded in the fee's scope" };
  const pinc = f.products.filter((p) => p.mode === "include");
  const pexc = f.products.filter((p) => p.mode === "exclude");
  if (pinc.length && !pinc.some((p) => prodHit(p, row.productId)))
    return { ok: false, why: "Product not in the fee's scope" };
  if (pexc.some((p) => prodHit(p, row.productId)))
    return { ok: false, why: "Product excluded in the fee's scope" };
  return { ok: true };
}

// --------------------------------------------------------------- amounts --

const money = (n: number, dp = 2) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const perGalText = (n: number) => `$${n.toFixed(4)}`;

/** The fee's rate, as a list reads it: "$0.0485 / gallon", "$75.00 – $0.00 / delivery". */
export function rateText(a: FeeAmount): string {
  const per = `/ ${PER_LABEL[a.per].toLowerCase()}`;
  if (a.kind === "flat") {
    if (a.unit === "%") return `${a.rate}% of product`;
    const vendors = a.vendorSpecific ? (a.vendorRates ?? []).filter((r) => r.vendors.length && r.rate !== null).length : 0;
    return `${a.per === "gallon" ? perGalText(a.rate) : money(a.rate)} ${per}${vendors ? ` · ${vendors} vendor rate${vendors > 1 ? "s" : ""}` : ""}`;
  }
  const rates = a.bands.map((b) => b.rate);
  const fmt = (n: number) => (a.per === "gallon" ? perGalText(n) : money(n));
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  return `${lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`} ${per}`;
}

/** $/gal a fee adds to a configured price — flat $ per gallon only. */
export const perGallon = (f: Fee) =>
  f.amount.kind === "flat" && f.amount.unit === "$" && f.amount.per === "gallon"
    ? f.amount.rate
    : 0;

// ---------------------------------------------------------------- orders --

/** The facts an order carries for fees. Planned before delivery; actual after. */
export interface OrderFacts {
  orderType: "Delivery" | "Extraction";
  createdAt: number;
  plannedAt: number;
  /** Null until delivered. */
  deliveredAt: number | null;
  orderedGallons: number;
  /** Null until delivered. */
  deliveredGallons: number | null;
  assetTypes: string[];
  assets: number;
  miles: number;
  minutesOnSite: number | null;
  /** $ of the product lines (base + margin) — for % fees. */
  productTotal: number;
  /** The 3PL vendor carrying it; null for first party. */
  vendor: string | null;
}

type Tri = "yes" | "no" | "unknown";
const minOf = (t: number) => {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes();
};
const hm = (v?: string) => {
  const [h, m] = (v ?? "00:00").split(":").map(Number);
  return h * 60 + m;
};
const mmdd = (t: number) => {
  const d = new Date(t);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function condHolds(c: Cond, o: OrderFacts): Tri {
  const when = o.deliveredAt ?? o.plannedAt;
  const d = new Date(when);
  switch (c.kind) {
    case "dayTime": {
      const inDay = (c.days ?? []).includes(d.getDay());
      const m = minOf(when);
      const a = hm(c.from);
      const b = hm(c.to);
      const inTime = a <= b ? m >= a && m < b : m >= a || m < b;
      const within = inDay && inTime;
      return (c.op === "outside" ? inDay && !inTime : within) ? "yes" : "no";
    }
    case "period": {
      /* A weekly window that may run across days: Fri 17:00 – Mon 00:00. */
      const week = 7 * 1440;
      const at = d.getDay() * 1440 + minOf(when);
      const a = (c.fromDay ?? 0) * 1440 + hm(c.from);
      const b = (c.toDay ?? 0) * 1440 + hm(c.to);
      const len = (b - a + week) % week || week;
      return (at - a + week) % week < len ? "yes" : "no";
    }
    case "date": {
      if (c.op === "holiday")
        return (c.holidays ?? []).includes(mmdd(when)) ? "yes" : "no";
      const [s, e] = c.months ?? [0, 11];
      const m = d.getMonth();
      return (s <= e ? m >= s && m <= e : m >= s || m <= e) ? "yes" : "no";
    }
    case "leadTime": {
      if (c.op === "sameDay")
        return new Date(o.createdAt).toDateString() === d.toDateString()
          ? "yes"
          : "no";
      return when - o.createdAt <= (c.n ?? 0) * 3_600_000 ? "yes" : "no";
    }
    case "quantity": {
      /* DELIVERED QUANTITY ONLY (Yash, 2026-11-24) — unknown until delivered. */
      if (o.deliveredGallons === null) return "unknown";
      const q = o.deliveredGallons;
      const n = c.n ?? 0;
      return (
        c.op === "lt"
          ? q < n
          : c.op === "gte"
            ? q >= n
            : q >= n && q <= (c.n2 ?? n)
      )
        ? "yes"
        : "no";
    }
    case "orderType":
      return (c.values ?? []).includes(o.orderType) ? "yes" : "no";
    case "assetType": {
      const hit = o.assetTypes.some((t) => (c.values ?? []).includes(t));
      return (c.op === "none" ? !hit : hit) ? "yes" : "no";
    }
    case "assets": {
      const n = c.n ?? 0;
      return (
        c.op === "gte"
          ? o.assets >= n
          : c.op === "lte"
            ? o.assets <= n
            : o.assets >= n && o.assets <= (c.n2 ?? n)
      )
        ? "yes"
        : "no";
    }
    default:
      return "yes";
  }
}

export function ruleHolds(r: FeeRule, o: OrderFacts): Tri {
  const cs = r.conds.filter((c) => c.kind);
  if (!cs.length) return "yes";
  const res = cs.map((c) => condHolds(c, o));
  if (r.match === "all")
    return res.includes("no")
      ? "no"
      : res.includes("unknown")
        ? "unknown"
        : "yes";
  return res.includes("yes")
    ? "yes"
    : res.includes("unknown")
      ? "unknown"
      : "no";
}

/** The fee's $ on a delivered order — null before delivery. */
/** How the fee's amount is worked out on this order, in one line:
 *  "$0.0485 × 80 gal", "Band 0–100 gal → $75.00", "3% of $260.00". */
export function calcText(f: Fee, o: OrderFacts): string {
  const a = f.amount;
  const g = o.deliveredGallons ?? o.orderedGallons;
  const m = (n: number, dp = 2) => `$${n.toFixed(dp)}`;
  const unitsOf = (per: ChargePer) =>
    per === "gallon"
      ? `${g.toLocaleString()} gal`
      : per === "asset"
        ? `${o.assets} assets`
        : per === "hour"
          ? `${Math.ceil((o.minutesOnSite ?? 0) / 60)} hr`
          : per === "mile"
            ? `${o.miles} mi`
            : "1 delivery";
  if (a.kind === "flat") {
    const r = rateFor(a, o.vendor);
    const who = o.vendor && r !== a.rate ? ` (${o.vendor} rate)` : "";
    if (a.unit === "%") return `${r}% of ${m(o.productTotal)}${who}`;
    return `${m(r, a.per === "gallon" ? 4 : 2)} × ${unitsOf(a.per)}${who}`;
  }
  const x = a.rangeBy === "quantity" ? g : a.rangeBy === "distance" ? o.miles : (o.minutesOnSite ?? 0);
  const u = a.rangeBy === "quantity" ? "gal" : a.rangeBy === "distance" ? "mi" : "min";
  const b = a.bands.find((y) => x >= y.from && (y.to === null || x <= y.to)) ?? a.bands[a.bands.length - 1];
  if (!b) return "No band";
  const band = `${b.from}${b.to === null ? "+" : `–${b.to}`} ${u}`;
  if (a.rangeBy === "time" && a.per === "hour") return `Band ${band} → ${m(b.rate)} × ${Math.max(0, Math.ceil((x - b.from) / 60))} hr past ${b.from} min`;
  return `Band ${band} → ${m(b.rate)} × ${unitsOf(a.per)}`;
}

export function amountOn(f: Fee, o: OrderFacts): number | null {
  if (o.deliveredAt === null || o.deliveredGallons === null) return null;
  const a = f.amount;
  const units = (per: ChargePer) =>
    per === "gallon"
      ? o.deliveredGallons!
      : per === "asset"
        ? o.assets
        : per === "hour"
          ? Math.ceil((o.minutesOnSite ?? 0) / 60)
          : per === "mile"
            ? o.miles
            : 1;
  if (a.kind === "flat")
    return a.unit === "%"
      ? (o.productTotal * rateFor(a, o.vendor)) / 100
      : rateFor(a, o.vendor) * units(a.per);
  const x =
    a.rangeBy === "quantity"
      ? o.deliveredGallons!
      : a.rangeBy === "distance"
        ? o.miles
        : (o.minutesOnSite ?? 0);
  const band =
    a.bands.find((b) => x >= b.from && (b.to === null || x <= b.to)) ??
    a.bands[a.bands.length - 1];
  if (!band) return 0;
  /* Time bands bill the hours past the band's start (first hour free, then hourly). */
  if (a.rangeBy === "time" && a.per === "hour")
    return band.rate * Math.max(0, Math.ceil((x - band.from) / 60));
  return band.rate * units(a.per);
}

// ------------------------------------------------------------------ seed --

const flat = (
  rate: number,
  per: ChargePer,
  unit: "$" | "%" = "$",
): FeeAmount => ({
  kind: "flat",
  rate,
  unit,
  per,
  rangeBy: "quantity",
  bands: [{ from: 0, to: null, rate: 0 }],
});
const range = (
  rangeBy: RangeBy,
  per: ChargePer,
  bands: [number, number | null, number][],
): FeeAmount => ({
  kind: "range",
  rate: 0,
  unit: "$",
  per,
  rangeBy,
  bands: bands.map(([from, to, rate]) => ({ from, to, rate })),
});
const ALL_SCOPE: ScopeRow[] = [
  { mode: "include", customer: "", hubs: [], shiptos: [] },
];
const ALL_PRODUCTS: ProductRow[] = [
  { mode: "include", category: "", products: [] },
];
const noRule = (): FeeRule => ({ match: "all", conds: [], tz: "shipto" });
const rule = (conds: Cond[], match: "all" | "any" = "all"): FeeRule => ({
  match,
  conds,
  tz: "shipto",
});

const fee = (
  p: Partial<Fee> & Pick<Fee, "id" | "name" | "code" | "amount">,
): Fee => ({
  erpId: `ERP-${p.code}`,
  desc: "",
  applicableType: "all",
  when: "always",
  review: false,
  rule: noRule(),
  scope: ALL_SCOPE,
  products: ALL_PRODUCTS,
  active: true,
  ...p,
});

const LA_SHIPTOS = SHIPTOS.filter((s) => stateOf(s) === "LA").map((s) => s.id);
const FLEET_SITES = SHIPTOS.filter((s) =>
  /Fleet Yard|Truck Terminal|Fuel Island/.test(s.name),
).map((s) => s.id);

/* THE USE CASES (Fee use cases.xlsx, 2026-11-24) — one fee each, as the
   sheet's "Fee logic" column puts it. */
const SEED: Fee[] = [
  fee({
    id: "fe-hazmat",
    name: "Hazmat fee",
    code: "HAZMAT",
    desc: "Covers hazmat compliance on propane",
    amount: flat(0.0195, "gallon"),
    scope: [
      ...ALL_SCOPE,
      { mode: "exclude", customer: "coastal", hubs: [], shiptos: [] },
    ],
    products: [{ mode: "include", category: "heating", products: ["lpg"] }],
  }),
  fee({
    id: "fe-fuel-surcharge",
    name: "Fuel surcharge",
    code: "FUEL-SUR",
    desc: "Every diesel and gasoline delivery",
    amount: flat(0.0485, "gallon"),
    products: [
      { mode: "include", category: "diesel", products: [] },
      { mode: "include", category: "gasoline", products: [] },
    ],
  }),
  fee({
    id: "fe-environmental",
    name: "Environmental fee",
    code: "ENV-LA",
    desc: "Louisiana state environmental fee",
    amount: flat(15, "delivery"),
    scope: [{ mode: "include", customer: "", hubs: [], shiptos: LA_SHIPTOS }],
  }),
  fee({
    id: "fe-weekend",
    name: "Weekend fee",
    code: "WKND",
    desc: "Friday 5 PM to Monday midnight",
    when: "rule",
    amount: flat(150, "delivery"),
    rule: rule([blankCond("period")]),
  }),
  fee({
    id: "fe-holiday",
    name: "Holiday fee",
    code: "HOLIDAY",
    desc: "Deliveries on holidays",
    when: "rule",
    amount: flat(200, "delivery"),
    rule: rule([blankCond("date")]),
  }),
  fee({
    id: "fe-after-hours",
    name: "After-hours fee",
    code: "AFTER-HR",
    desc: "Weekdays outside 7 AM – 5 PM",
    when: "rule",
    amount: flat(125, "delivery"),
    rule: rule([{ ...blankCond("dayTime"), op: "outside" }]),
  }),
  fee({
    id: "fe-rush",
    name: "Rush fee",
    code: "RUSH",
    desc: "Delivered within 4 hours of the call",
    when: "rule",
    amount: flat(100, "delivery"),
    rule: rule([blankCond("leadTime")]),
  }),
  fee({
    id: "fe-winter-peak",
    name: "Winter peak surcharge",
    code: "WINTER",
    desc: "December to February deliveries",
    when: "rule",
    amount: flat(0.02, "gallon"),
    rule: rule([{ ...blankCond("date"), op: "months", months: [11, 1] }]),
  }),
  fee({
    id: "fe-small-delivery",
    name: "Small-delivery fee",
    code: "SMALL",
    desc: "Drops under 100 gallons",
    when: "rule",
    amount: flat(50, "delivery"),
    rule: rule([blankCond("quantity")]),
  }),
  fee({
    id: "fe-low-volume",
    name: "Tiered low-volume fee",
    code: "LOW-VOL",
    desc: "The smaller the drop, the higher the fee",
    amount: range("quantity", "delivery", [
      [0, 100, 75],
      [101, 250, 40],
      [251, null, 0],
    ]),
  }),
  fee({
    id: "fe-per-asset",
    name: "Per-asset fueling fee",
    code: "ASSET",
    desc: "On-site fleet fueling, per vehicle",
    when: "rule",
    amount: flat(5, "asset"),
    scope: [{ mode: "include", customer: "", hubs: [], shiptos: FLEET_SITES }],
    rule: rule([{ ...blankCond("assetType"), values: ["Truck", "Trailer"] }]),
  }),
  fee({
    id: "fe-demurrage",
    name: "Demurrage",
    code: "DEMUR",
    desc: "First hour on site free, then hourly",
    amount: range("time", "hour", [
      [0, 60, 0],
      [61, null, 90],
    ]),
  }),
  fee({
    id: "fe-pump-out",
    name: "Pump-out fee",
    code: "PUMP",
    desc: "Pumping out a tank, hourly",
    applicableType: "extraction",
    amount: flat(85, "hour"),
  }),
  fee({
    id: "fe-remote",
    name: "Remote-location fee",
    code: "REMOTE",
    desc: "Sites far from the yard",
    amount: range("distance", "delivery", [
      [0, 50, 0],
      [51, 100, 35],
      [101, null, 70],
    ]),
  }),
  fee({
    id: "fe-dry-run",
    name: "Dry-run fee",
    code: "DRY-RUN",
    desc: "Truck arrived and couldn't deliver",
    review: true,
    amount: flat(150, "delivery"),
  }),
  fee({
    id: "fe-off-route",
    name: "Off-route fee",
    code: "OFF-ROUTE",
    desc: "Wanted today, not on today's route",
    review: true,
    amount: flat(125, "delivery"),
  }),
  fee({
    id: "fe-leak-check",
    name: "Leak-check fee",
    code: "LEAK",
    desc: "Tank ran empty, leak check needed",
    review: true,
    amount: flat(125, "delivery"),
    scope: [
      ...ALL_SCOPE,
      { mode: "exclude", customer: "delta-ag", hubs: [], shiptos: [] },
    ],
  }),
  fee({
    id: "fe-customer-delivery",
    name: "Customer delivery fee",
    code: "CUST-DEL",
    desc: "Flat fee agreed with five accounts",
    amount: {
      ...flat(25, "delivery"),
      vendorSpecific: true,
      vendorRates: [
        { vendors: ["FCOIN", "Star Transport"], rate: 30 },
        { vendors: ["Atlas Petroleum"], rate: 35 },
      ],
    },
    scope: ["onsite", "bayou", "redriver", "pelican", "natchez"].map(
      (c): ScopeRow => ({
        mode: "include",
        customer: c,
        hubs: [],
        shiptos: [],
      }),
    ),
  }),
];

// ----------------------------------------------------------------- store --

/** What a fee event did — the Activity feed reads it as a change. */
export type FeeEventKind = "create" | "edit" | "assign" | "unassign" | "order";
export interface FeeFieldEdit {
  field: SetupField;
  from: string;
  to: string;
}
export interface FeeAudit {
  at: number;
  by: string;
  change: string;
  action: string;
  kind?: FeeEventKind;
  /** Edit: the fields, old → new. */
  edits?: FeeFieldEdit[];
  /** The prices (ship-to × product) it reached when it was made. */
  rowIds?: string[];
  /** Assign / unassign on a customer's pricing. */
  customerId?: string;
}

interface State {
  fees: Fee[];
  /** Removed on a customer's pricing: customerId → fee ids. */
  customerOff: Record<string, string[]>;
  /** Removed on one price (ship-to × product): rowId → fee ids. */
  rowOff: Record<string, string[]>;
  /** A price on its own pricing keeps the customer's removals as they stood
   *  when it went its own way: rowId → fee ids. */
  ownSnap: Record<string, string[]>;
  /** Review fees applied on an order: orderId → fee ids. */
  orderApplied: Record<string, string[]>;
  /** An order's status set by hand in Order well (demo): orderId → status. */
  orderStatus: Record<string, "Scheduled" | "Delivered" | "Invoiced">;
  audit: Record<string, FeeAudit[]>;
  tick: number;
}

let state: State = {
  fees: SEED,
  customerOff: { mustang: ["fe-low-volume"] },
  rowOff: {},
  ownSnap: {},
  orderApplied: {},
  orderStatus: {},
  audit: Object.fromEntries(
    SEED.map((f, i) => [
      f.id,
      [
        {
          at: NOW - (40 + i * 3) * DAY,
          by: ["Priya Nair", "Cody McLelland", "Valarie Rogers"][i % 3],
          change: "Created",
          action: "Added",
          kind: "create" as const,
        },
      ],
    ]),
  ),
  tick: 0,
};
/* ONE STORE ACROSS TABS (Yash, 2026-11-24) — Edit fee opens the fee in a
   new tab, so the fees, removals and applies are kept in the browser and
   shared between tabs: an edit in one shows in the other. */
/* v3 (2026-11-27): history entries carry what they changed and reached, so
   the Activity feed can read them; older saved fees start from the sample. */
const KEY = "fp-pricing-fees-v3";
try {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
  if (raw) state = { ...state, ...(JSON.parse(raw) as Partial<State>) };
} catch {
  /* storage blocked or old — start from the seed */
}
const listeners = new Set<() => void>();
const save = () => {
  try {
    const { fees, customerOff, rowOff, ownSnap, orderApplied, orderStatus, audit, tick } = state;
    window.localStorage.setItem(KEY, JSON.stringify({ fees, customerOff, rowOff, ownSnap, orderApplied, orderStatus, audit, tick }));
  } catch {
    /* storage full or blocked — this tab keeps working */
  }
};
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  save();
  syncLog();
  listeners.forEach((l) => l());
};
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = { ...state, ...(JSON.parse(e.newValue) as Partial<State>) };
      syncLog();
      listeners.forEach((l) => l());
    } catch {
      /* ignore a bad write */
    }
  });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const nowOf = () => NOW + state.tick * 60_000;
const log = (
  id: string,
  change: string,
  action = "Updated",
  patch: Partial<State> = {},
  extra: Partial<FeeAudit> = {},
) => {
  const entry: FeeAudit = {
    at: nowOf() + 60_000,
    by: CURRENT_USER,
    change,
    action,
    ...extra,
  };
  set({
    ...patch,
    audit: { ...state.audit, [id]: [entry, ...(state.audit[id] ?? [])] },
    tick: state.tick + 1,
  });
};

export function useFees() {
  return React.useSyncExternalStore(subscribe, () => state);
}
export const feeById = (id: string) => state.fees.find((f) => f.id === id);

export function createFee(f: Fee): string {
  let id = `fe-${f.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
  for (let i = 2; state.fees.some((x) => x.id === id); i++) id = `${id}-${i}`;
  log(id, "Created", "Added", { fees: [...state.fees, { ...f, id }] }, { kind: "create" });
  return id;
}
/** The prices a fee reaches now — configured ship-to × product in its scope. */
function reachIds(f: Fee | undefined): string[] {
  if (!f) return [];
  const { rows, ents } = logSnapshot();
  const hubs = hubMap(rows, ents);
  return rows
    .filter((r) => r.configured && inScope(f, r, hubs.get(r.shiptoId) ?? "Houston hub").ok)
    .map((r) => r.id);
}
const actionOf = (edits: FeeFieldEdit[]) =>
  recordAction({ edits: edits.map((e) => ({ operation: "edit" as const, field: e.field, to: e.to })) });
/** Autosave of an open fee sheet — `edits` are what moved since its last save.
 *  The change reaches what the fee reached before or reaches now. */
export function updateFee(f: Fee, edits: FeeFieldEdit[]) {
  const prev = state.fees.find((x) => x.id === f.id);
  const fees = state.fees.map((x) => (x.id === f.id ? f : x));
  if (!edits.length) return set({ fees });
  const rowIds = [...new Set([...reachIds(prev), ...reachIds(f)])];
  log(f.id, edits.map(feeEditText).join(" · "), actionOf(edits), { fees }, { kind: "edit", edits, rowIds });
}
export function setFeeActive(id: string, active: boolean) {
  const edits: FeeFieldEdit[] = [{ field: "active", from: active ? "Inactive" : "Active", to: active ? "Active" : "Inactive" }];
  log(
    id,
    active ? "Activated" : "Deactivated",
    active ? "Activated" : "Deactivated",
    { fees: state.fees.map((x) => (x.id === id ? { ...x, active } : x)) },
    { kind: "edit", edits, rowIds: reachIds(feeById(id)) },
  );
}

const ruleOf = (f: Fee) => (f.when === "rule" ? ruleText(f.rule) : NOT_SET);
/** What an open sheet changed: each field, old → new. */
export function feeEdits(a: Fee, b: Fee): FeeFieldEdit[] {
  const out: FeeFieldEdit[] = [];
  const add = (field: SetupField, from: string, to: string) => from !== to && out.push({ field, from, to });
  add("name", a.name, b.name);
  add("code", a.code, b.code);
  add("erpId", a.erpId, b.erpId);
  add("desc", a.desc, b.desc);
  add("applicable", APPLICABLE_LABEL[a.applicableType], APPLICABLE_LABEL[b.applicableType]);
  add("application", MODE_LABEL[modeOf(a)], MODE_LABEL[modeOf(b)]);
  if (JSON.stringify(a.rule) !== JSON.stringify(b.rule) && b.when === "rule") add("rule", ruleOf(a), ruleOf(b));
  if (JSON.stringify(a.scope) !== JSON.stringify(b.scope) || JSON.stringify(a.products) !== JSON.stringify(b.products)) add("scope", scopeText(a), scopeText(b));
  if (JSON.stringify(a.amount) !== JSON.stringify(b.amount)) add("rate", rateText(a.amount), rateText(b.amount));
  add("active", a.active ? "Active" : "Inactive", b.active ? "Active" : "Inactive");
  return out;
}
/** One field edit, in words: "Rate: $0.0195 / gallon → $0.0210 / gallon". */
export const feeEditText = (e: FeeFieldEdit) =>
  e.field === "active"
    ? e.to === "Active" ? "Activated" : "Deactivated"
    : e.field === "desc"
      ? "Description updated"
      : `${FIELD_LABEL[e.field]}: ${e.from || NOT_SET} → ${e.to || NOT_SET}`;
/** What an open sheet changed, in words. */
export const feeDiff = (a: Fee, b: Fee): string[] => feeEdits(a, b).map(feeEditText);

// ------------------------------------------------- fees in the change log --

/* FEES IN THE ACTIVITY FEED (Yash, 2026-11-27) — every fee event but an
   order's is a change in the log: Added, Updated / Activated / Deactivated
   with the prices it reached, Assigned / Unassigned on a customer or a price.
   Built from the fee history, once per entry. */
const recCache = new WeakMap<FeeAudit, ChangeRecord>();
function feeRecord(feeId: string, a: FeeAudit, n: number, ents: EntityMap, rowOf: (id: string) => ConfigRow | undefined): ChangeRecord | null {
  const kind = a.kind;
  if (!kind || kind === "order") return null;
  const cached = recCache.get(a);
  if (cached) return cached;
  const rowIds = a.rowIds ?? [];
  const edits: Edit[] =
    kind === "create"
      ? [{ setting: "fee", operation: "create", entityIds: [feeId], rowIds: [] }]
      : kind === "edit"
        ? (a.edits ?? []).map((e) => ({ setting: "fee" as const, operation: "edit" as const, entityIds: [feeId], rowIds: [], ...e }))
        : [{ setting: "fee", operation: kind === "assign" ? "add" : "remove", entityIds: [feeId], rowIds, ...(a.customerId ? { via: "customer" as const } : {}) }];
  if (!edits.length) return null;
  const name = ents.get(feeId)?.name ?? feeId;
  const lines: ImpactLine[] = [];
  if (kind !== "create")
    for (const id of rowIds) {
      const r = rowOf(id);
      if (!r) continue;
      const at = { rowId: r.id, customerId: r.customerId, shiptoId: r.shiptoId, productId: r.productId, setting: "fee" as const, delta: 0, outcome: "changed" as const };
      if (kind === "edit") for (const e of a.edits ?? []) lines.push({ ...at, before: e.from, after: e.to, beforeIds: [feeId], afterIds: [feeId], field: e.field });
      else if (kind === "assign") lines.push({ ...at, before: "", after: name, beforeIds: [], afterIds: [feeId] });
      else lines.push({ ...at, before: name, after: "", beforeIds: [feeId], afterIds: [] });
    }
  const rec: ChangeRecord = {
    id: `CH-F-${feeId}-${n}`,
    title: recordTitle(edits, ents),
    edits,
    source: kind === "assign" || kind === "unassign" ? (a.customerId ? "customer" : "shiptoInline") : "setup",
    by: a.by,
    madeAt: a.at,
    effectiveAt: a.at,
    status: "applied",
    noChange: 0,
    lines,
    orders: [],
    ...(a.customerId ? { customerId: a.customerId } : {}),
    external: "fee",
  };
  recCache.set(a, rec);
  return rec;
}
function syncLog() {
  const feeEnts: Entity[] = state.fees.map((f) => ({ id: f.id, setting: "fee", name: f.name, desc: f.desc }));
  const { rows, ents } = logSnapshot();
  const all: EntityMap = new Map([...ents, ...feeEnts.map((e) => [e.id, e] as const)]);
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const changes: ChangeRecord[] = [];
  for (const f of state.fees) {
    const list = state.audit[f.id] ?? [];
    list.forEach((a, k) => {
      const rec = feeRecord(f.id, a, list.length - 1 - k, all, (id) => rowMap.get(id));
      if (rec) changes.push(rec);
    });
  }
  setFeeLog(feeEnts, changes);
}
syncLog();

// ------------------------------------------------------- what applies -----

export type FeeState = "applied" | "removed";
export type FeeVia = "customer" | "hub" | "shipto" | "all";
export interface RowFee {
  fee: Fee;
  state: FeeState;
  /** What brought it in — the narrowest scope row that matched. */
  via: FeeVia;
  /** Where it was removed, when removed. */
  removedAt?: "customer" | "row";
}

function viaOf(f: Fee, row: ConfigRow, hub: string): FeeVia {
  const hits = f.scope.filter(
    (s) => s.mode === "include" && rowHit(s, row.customerId, hub, row.shiptoId),
  );
  if (hits.some((s) => s.shiptos.length)) return "shipto";
  if (hits.some((s) => s.hubs.length)) return "hub";
  if (hits.some((s) => s.customer)) return "customer";
  return "all";
}
/** WHICH SCOPE COMBINATION REACHES THIS PRICE (Yash, 2026-11-24) — the
 *  include row that matched, and the products: "All customers · Heating Fuels",
 *  "Lake Charles hub · OnSite", "Picked ship-to". */
export function matchText(f: Fee, row: ConfigRow, hub: string): string {
  const hit = f.scope.find((s) => s.mode === "include" && rowHit(s, row.customerId, hub, row.shiptoId));
  const cname = (id: string) => CUSTOMERS.find((c) => c.id === id)?.name ?? id;
  const who = !hit
    ? "—"
    : hit.shiptos.length
      ? "Picked ship-to"
      : hit.hubs.length
        ? `${hub}${hit.customer ? ` · ${cname(hit.customer)}` : ""}`
        : hit.customer
          ? cname(hit.customer)
          : "All customers";
  const prod = f.products.find((p) => p.mode === "include" && (p.category || p.products.length) && prodHit(p, row.productId));
  const what = prod ? (prod.products.length ? productOf(row.productId).name : CATEGORIES.find((c) => c.id === prod.category)?.name ?? "") : "";
  return what ? `${who} · ${what}` : who;
}
export const VIA_LABEL: Record<FeeVia, string> = {
  customer: "Customer",
  hub: "Hub",
  shipto: "Ship-to",
  all: "All",
};

/** The customer removals that reach a price: a price on its own pricing keeps
 *  them as they stood when it went its own way. */
function customerOffFor(row: ConfigRow, s: State): string[] {
  if (row.applied === "shipto") return s.ownSnap[row.id] ?? [];
  return s.customerOff[row.customerId] ?? [];
}

/** Keep each price's snapshot in step with its Applied pricing: one going
 *  its own way takes the customer's removals as they stand; one put back on
 *  the customer (Reset pricing) drops its own removals. Run as rows change. */
export function syncOwn(rows: ConfigRow[]) {
  let snap: Record<string, string[]> | null = null;
  let off: Record<string, string[]> | null = null;
  for (const r of rows) {
    const has = r.id in state.ownSnap;
    if (r.applied === "shipto" && !has) {
      snap = snap ?? { ...state.ownSnap };
      snap[r.id] = [...(state.customerOff[r.customerId] ?? [])];
    } else if (r.applied !== "shipto" && has) {
      snap = snap ?? { ...state.ownSnap };
      delete snap[r.id];
      off = off ?? { ...state.rowOff };
      delete off[r.id];
    }
  }
  if (snap || off)
    state = {
      ...state,
      ownSnap: snap ?? state.ownSnap,
      rowOff: off ?? state.rowOff,
    };
}

/** Every active fee that reaches a price, applied or removed. */
export function feesOnRow(
  row: ConfigRow,
  hub: string,
  s: State = state,
): RowFee[] {
  const custOff = customerOffFor(row, s);
  const own = s.rowOff[row.id] ?? [];
  return s.fees
    .filter((f) => f.active && inScope(f, row, hub).ok)
    .map((f): RowFee => {
      const removedAt = own.includes(f.id)
        ? "row"
        : custOff.includes(f.id)
          ? "customer"
          : undefined;
      return {
        fee: f,
        state: removedAt ? "removed" : "applied",
        via: viaOf(f, row, hub),
        removedAt,
      };
    });
}

/** A price's fee cell: $/gal of the charged per-gallon fees, and how many apply. */
export function feeCell(list: Pick<RowFee, "fee" | "state">[]) {
  const on = list.filter((x) => x.state === "applied");
  return {
    perGal: on
      .filter((x) => isCharged(x.fee))
      .reduce((t, x) => t + perGallon(x.fee), 0),
    count: on.length,
    groups: feeGroupText(list),
  };
}

/** GROUP COUNTS FOR THE FEE CELL (Yash, 2026-11-25 — for the demo, to decide
 *  against "N fees"): "14 applied · 1 to review · 1 removed",
 *  empty groups left out. */
export function feeGroupText(list: Pick<RowFee, "fee" | "state">[]): string {
  const on = list.filter((x) => x.state === "applied");
  const n = (m: FeeMode[]) => on.filter((x) => m.includes(modeOf(x.fee))).length;
  const parts: [number, string][] = [
    /* By rule counts as applied on a price (Yash, 2026-11-26). */
    [n(["always", "rule"]), "applied"],
    [n(["review", "ruleReview"]), "to review"],
    [list.length - on.length, "removed"],
  ];
  const text = parts.filter(([c]) => c > 0).map(([c, l]) => `${c} ${l}`).join(" · ");
  return text || "No fees";
}

export interface CustomerFee {
  fee: Fee;
  state: FeeState;
  /** Of the customer's prices that follow it, how many the fee reaches. */
  reach: number;
  of: number;
  /** The ship-tos those prices sit at, and how many follow the customer. */
  shiptoIds: string[];
  ofShiptos: number;
}
/** The fees that reach a customer's prices (those following the customer). */
export function feesOnCustomer(
  customerId: string,
  rows: ConfigRow[],
  hubOfRow: (r: ConfigRow) => string,
  s: State = state,
): CustomerFee[] {
  const mine = rows.filter(
    (r) =>
      r.customerId === customerId && r.configured && r.applied !== "shipto",
  );
  const off = s.customerOff[customerId] ?? [];
  return s.fees
    .filter((f) => f.active)
    .map((f) => {
      const hit = mine.filter((r) => inScope(f, r, hubOfRow(r)).ok);
      return {
        fee: f,
        reach: hit.length,
        of: mine.length,
        shiptoIds: [...new Set(hit.map((r) => r.shiptoId))],
        ofShiptos: new Set(mine.map((r) => r.shiptoId)).size,
      };
    })
    .filter((x) => x.reach > 0)
    .map((x) => ({
      ...x,
      state: off.includes(x.fee.id)
        ? ("removed" as const)
        : ("applied" as const),
    }));
}

const pname = (r: ConfigRow) =>
  `${shiptoOf(r.shiptoId).name} · ${productOf(r.productId).name}`;

/** Remove a fee from one price, or put it back. A fee the customer removed
 *  comes back on this price only when its own pricing is the ship-to's. */
export function setRowFee(row: ConfigRow, feeId: string, on: boolean) {
  const own = state.rowOff[row.id] ?? [];
  const rowOff = {
    ...state.rowOff,
    [row.id]: on
      ? own.filter((x) => x !== feeId)
      : [...new Set([...own, feeId])],
  };
  const patch: Partial<State> = { rowOff };
  if (on && row.applied === "shipto")
    patch.ownSnap = {
      ...state.ownSnap,
      [row.id]: (state.ownSnap[row.id] ?? []).filter((x) => x !== feeId),
    };
  log(
    feeId,
    `${on ? "Put back on" : "Removed from"} ${pname(row)}`,
    on ? "Assigned" : "Unassigned",
    patch,
    { kind: on ? "assign" : "unassign", rowIds: [row.id] },
  );
}
export function setCustomerFee(customerId: string, feeId: string, on: boolean) {
  const cur = state.customerOff[customerId] ?? [];
  /* The prices following the customer that the fee reaches. */
  const fee = feeById(feeId);
  const { rows, ents } = logSnapshot();
  const hubs = hubMap(rows, ents);
  const rowIds = fee
    ? rows
        .filter((r) => r.customerId === customerId && r.configured && r.applied !== "shipto" && inScope(fee, r, hubs.get(r.shiptoId) ?? "Houston hub").ok)
        .map((r) => r.id)
    : [];
  log(
    feeId,
    `${on ? "Put back on" : "Removed from"} ${customerOf(customerId).name}`,
    on ? "Assigned" : "Unassigned",
    {
      customerOff: {
        ...state.customerOff,
        [customerId]: on
          ? cur.filter((x) => x !== feeId)
          : [...new Set([...cur, feeId])],
      },
    },
    { kind: on ? "assign" : "unassign", rowIds, customerId },
  );
}

/** ORDER STATUS BY HAND (Yash, 2026-11-24) — move a demo order between
 *  Scheduled, Delivered and Invoiced to see its fees change. */
export function setOrderStatus(orderId: string, status: "Scheduled" | "Delivered" | "Invoiced") {
  const entry: FeeAudit = { at: nowOf() + 60_000, by: CURRENT_USER, change: `Status: ${status} · order ${orderId}`, action: "Updated" };
  set({ orderStatus: { ...state.orderStatus, [orderId]: status }, audit: { ...state.audit, [`order:${orderId}`]: [entry, ...(state.audit[`order:${orderId}`] ?? [])] }, tick: state.tick + 1 });
}

/** A review fee applied on an order, or taken off again. */
export function setOrderFee(orderId: string, feeId: string, on: boolean) {
  const cur = state.orderApplied[orderId] ?? [];
  log(
    feeId,
    `${on ? "Applied on" : "Taken off"} order ${orderId}`,
    on ? "Assigned" : "Unassigned",
    {
      orderApplied: {
        ...state.orderApplied,
        [orderId]: on
          ? [...new Set([...cur, feeId])]
          : cur.filter((x) => x !== feeId),
      },
    },
    { kind: "order" },
  );
}

// ---------------------------------------------------------- on an order --

export type OrderFeeState = "charged" | "pending" | "offered" | "applied";
export interface OrderFee {
  fee: Fee;
  state: OrderFeeState;
  /** $ — null until the delivery is in. */
  amount: number | null;
  /** Why it is here: "Always applied", the rule's reading. */
  why: string;
}

/** The fees on an order of this price: the ones that reach the price and
 *  apply to the order's type, by their rule on what is known so far. */
export function feesOnOrder(
  orderId: string,
  row: ConfigRow,
  hub: string,
  o: OrderFacts,
  s: State = state,
): OrderFee[] {
  const applied = s.orderApplied[orderId] ?? [];
  const out: OrderFee[] = [];
  for (const x of feesOnRow(row, hub, s)) {
    if (x.state !== "applied") continue;
    const f = x.fee;
    if (
      f.applicableType !== "all" &&
      f.applicableType !== o.orderType.toLowerCase()
    )
      continue;
    const holds = f.when === "rule" ? ruleHolds(f.rule, o) : "yes";
    if (holds === "no") continue;
    /* A rule that can't be read yet (delivered quantity) waits for delivery. */
    if (holds === "unknown") continue;
    const amount = amountOn(f, o);
    if (amount === 0) continue;
    const why = f.when === "rule" ? ruleText(f.rule) : MODE_LABEL[modeOf(f)];
    if (f.review)
      out.push({
        fee: f,
        state: applied.includes(f.id) ? "applied" : "offered",
        amount,
        why,
      });
    else
      out.push({
        fee: f,
        state: o.deliveredAt === null ? "pending" : "charged",
        amount,
        why,
      });
  }
  return out;
}

// ------------------------------------------------------------- reading --

const days = (ds: number[]) => {
  const k = [...ds].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (k.length === 7) return "Every day";
  if (k.join() === "1,2,3,4,5") return "Mon–Fri";
  if (k.join() === "6,0") return "Sat–Sun";
  return k.map((d) => DAY_SHORT[d]).join(", ");
};
export function condText(c: Cond): string {
  switch (c.kind) {
    case "dayTime":
      return `${days(c.days ?? [])} ${c.op === "outside" ? "outside" : ""} ${timeLabel(c.from ?? "00:00")}–${timeLabel(c.to ?? "00:00")}`.replace(
        /\s+/g,
        " ",
      );
    case "period":
      return `${DAY_SHORT[c.fromDay ?? 0]} ${timeLabel(c.from ?? "00:00")} – ${DAY_SHORT[c.toDay ?? 0]} ${timeLabel(c.to ?? "00:00")}`;
    case "date":
      return c.op === "holiday"
        ? `${(c.holidays ?? []).length} holidays`
        : `${MONTHS[(c.months ?? [0, 0])[0]].slice(0, 3)} – ${MONTHS[(c.months ?? [0, 0])[1]].slice(0, 3)}`;
    case "leadTime":
      return c.op === "sameDay"
        ? "Same day"
        : `Delivered within ${c.n ?? 0}h of order`;
    case "quantity":
      return `Delivered ${c.op === "lt" ? "<" : c.op === "gte" ? "≥" : ""} ${c.n ?? 0}${c.op === "between" ? `–${c.n2 ?? 0}` : ""} gal`.replace(
        /\s+/g,
        " ",
      );
    case "orderType":
      return (c.values ?? []).join(" or ");
    case "assetType":
      return `${c.op === "none" ? "No" : ""} ${(c.values ?? []).join(" / ")}`.trim();
    case "assets":
      return `${c.op === "gte" ? "≥" : c.op === "lte" ? "≤" : ""} ${c.n ?? 0}${c.op === "between" ? `–${c.n2 ?? 0}` : ""} assets`.trim();
    default:
      return "";
  }
}
export const ruleText = (r: FeeRule) =>
  r.conds
    .filter((c) => c.kind)
    .map(condText)
    .join(r.match === "all" ? " and " : " or ") || "No conditions";

/** What a fee's scope takes in, in a few words. */
export function scopeText(f: Fee): string {
  const name = (id: string) => CUSTOMERS.find((c) => c.id === id)?.name ?? id;
  const one = (s: ScopeRow) =>
    s.shiptos.length
      ? `${s.shiptos.length} ship-tos`
      : s.hubs.length
        ? `${s.hubs.length === 1 ? s.hubs[0] : `${s.hubs.length} hubs`}${s.customer ? ` · ${name(s.customer)}` : ""}`
        : s.customer
          ? name(s.customer)
          : "All customers";
  const inc = f.scope.filter((s) => s.mode === "include").map(one);
  const exc = f.scope.filter((s) => s.mode === "exclude").map(one);
  const cats = f.products
    .filter((p) => p.mode === "include" && (p.category || p.products.length))
    .map((p) =>
      p.products.length
        ? `${p.products.length} products`
        : (CATEGORIES.find((c) => c.id === p.category)?.name ?? ""),
    );
  return [
    inc.length > 2 ? `${inc.length} customers` : inc.join(", ") || "None",
    exc.length ? `except ${exc.join(", ")}` : "",
    cats.length ? `· ${cats.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const blankFee = (): Fee =>
  fee({ id: "", name: "", code: "", erpId: "", amount: flat(0, "delivery") });

export { PRODUCTS, CATEGORIES, CUSTOMERS, SHIPTOS };

// --------------------------------------------------------------- simulator --

export interface SimResult {
  state: "charged" | "pending" | "offered" | "none";
  /** Each check, in order, and whether it held. */
  checks: { label: string; ok: boolean | null }[];
  amount: number | null;
}

/** FEE SIMULATOR (Yash, 2026-11-24) — run a fee, as it stands in the sheet,
 *  on a sample order: scope, order type, then each rule condition. */
export function simulate(f: Fee, row: Pick<ConfigRow, "customerId" | "shiptoId" | "productId">, hub: string, o: OrderFacts): SimResult {
  const checks: SimResult["checks"] = [];
  const sc = inScope(f, row as ConfigRow, hub);
  checks.push({ label: sc.ok ? "In the fee's scope" : (sc.why ?? "Not in scope"), ok: sc.ok });
  const typeOk = f.applicableType === "all" || f.applicableType === o.orderType.toLowerCase();
  checks.push({ label: `Order type: ${o.orderType}`, ok: typeOk });
  let ruleOk: Tri = "yes";
  if (f.when === "rule") {
    const cs = f.rule.conds.filter((c) => c.kind);
    cs.forEach((c) => {
      const r = condHolds(c, o);
      checks.push({ label: condText(c), ok: r === "unknown" ? null : r === "yes" });
    });
    ruleOk = ruleHolds(f.rule, o);
  }
  if (!sc.ok || !typeOk || ruleOk === "no") return { state: "none", checks, amount: null };
  if (ruleOk === "unknown") return { state: "pending", checks, amount: null };
  const amount = amountOn(f, o);
  if (f.review) return { state: "offered", checks, amount };
  return { state: o.deliveredAt === null ? "pending" : "charged", checks, amount };
}
