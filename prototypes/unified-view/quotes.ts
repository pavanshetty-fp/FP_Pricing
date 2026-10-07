import type { ActivityEntry } from "./activity";
import { CUSTOMERS } from "./customers";
import { DATE_FMT, FUEL_ORDERS, MONEY, dateKeyOf, startOfDay } from "./data";
import { statusTones } from "./statusKind";

/*
  QUOTES — a Sales destination (Pavan, 2026-10-07). A price offered to a
  customer for fuel at one ship-to; once the customer accepts it, it becomes a
  fuel order at Requested.

  Draft → Sent → Accepted. EXPIRED IS NOT STORED: it is a Sent quote whose
  valid-through date has passed, so it is derived every time it is read and
  cannot go on saying "Sent" after the date (Pavan, 2026-10-07).
*/

/** What is stored. */
export type QuoteStage = "Draft" | "Sent" | "Accepted";
/** What is shown — the stored stage, or Expired. */
export type QuoteStatus = QuoteStage | "Expired";

export const QUOTE_STATUSES: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Expired"];

/* KINDS, NEVER TONES (Pavan, 2026-10-07) — docs/unified-view/1-components.md
   §Status kinds. Sent is waiting on the customer; Expired is an end that is
   not an outcome. */
export const QUOTE_STATUS_TONE = statusTones<QuoteStatus>({
  Draft: "neutral",
  Sent: "caution",
  Accepted: "success",
  Expired: "neutral",
});

/** How a margin, a fee or a tax is entered. */
export type AdjustUnit = "perGal" | "total" | "percent";

export interface Adjust {
  value: number;
  unit: AdjustUnit;
}

export const ADJUST_UNITS: { value: AdjustUnit; label: string }[] = [
  { value: "perGal", label: "$/gal" },
  { value: "total", label: "$" },
  { value: "percent", label: "%" },
];

/**
 * ONE PRODUCT LINE — the order's `{ name, gal }`, plus the base rate it is
 * priced from. `base` is filled from the price list for the line's product,
 * the quote's market and the line's gallon tier, and re-filled whenever any of
 * the three changes — unless somebody typed it (`baseSet`), which only
 * "Reapply rate" undoes.
 */
export interface QuoteLine {
  name: string;
  gal: number;
  /** $/gal. `null` while there is no market or product to price from. */
  base: number | null;
  baseSet: boolean;
}

export interface Quote {
  id: string;
  quoteNo: string;
  customer: string;
  shipTo: string;
  email: string;
  /** `YYYY-MM-DD`, or "" while unset. */
  validThrough: string;
  market: string;
  lines: QuoteLine[];
  /* QUOTE-LEVEL, NOT PER LINE (Pavan, 2026-10-07 — decision 2). One margin,
     one fee and one tax, each spread over every line by its unit. */
  margin: Adjust;
  fees: Adjust;
  tax: Adjust;
  notes: string;
  stage: QuoteStage;
  /** ISO — the Updated column. */
  updatedAt: string;
  /** The fuel order an accepted quote made. */
  orderId?: string;
  orderNo?: string;
  audit?: ActivityEntry[];
}

/* ------------------------------------------------------------ status ----- */

const todayKey = () => dateKeyOf(startOfDay(new Date()));

/** Expired = Sent, and the valid-through date is behind today. */
export function quoteStatus(q: Quote): QuoteStatus {
  if (q.stage === "Sent" && q.validThrough && q.validThrough < todayKey()) return "Expired";
  return q.stage;
}

/* --------------------------------------------------------- price list ---- */

/*
  THE PRICE LIST — INVENTED (Pavan, 2026-10-07 — decision 3). A small stand-in
  for the pricing configuration Sales would read from: markets × products ×
  gallon tiers → base $/gal. Nothing here comes from a real rate card, and
  there is no Pricing-module work behind it.
*/
export const MARKETS = ["Houston", "Dallas–Fort Worth", "San Antonio"];

/** Gallon tiers, by the line's own gallons. INVENTED. */
const TIERS = [
  { from: 0, label: "Under 2,500 gal" },
  { from: 2500, label: "2,500–7,499 gal" },
  { from: 7500, label: "7,500+ gal" },
];

/** The products the fuel orders carry — a quote can only offer what an order can hold. */
export const QUOTE_PRODUCTS: string[] = Array.from(
  new Set(FUEL_ORDERS.flatMap((r) => r.products.map((p) => p.name)))
);

/** INVENTED base rates, $/gal, for the smallest tier in Houston. */
const PRODUCT_BASE: Record<string, number> = {
  "Gas Pr 1": 2.689,
  "123": 2.745,
  "200* Diesel Onroad clear": 3.412,
  "CLR DSL": 3.358,
  Test: 2.95,
  "1652": 3.104,
  CTL1: 3.215,
};

/** INVENTED market spreads over Houston, $/gal. */
const MARKET_SPREAD: Record<string, number> = {
  Houston: 0,
  "Dallas–Fort Worth": 0.064,
  "San Antonio": 0.038,
};

/** INVENTED tier discounts, $/gal off the smallest tier. */
const TIER_DISCOUNT = [0, 0.045, 0.092];

/** The price list as a table — market → product → one rate per tier. INVENTED. */
export const PRICE_LIST: Record<string, Record<string, number[]>> = Object.fromEntries(
  MARKETS.map((m) => [
    m,
    Object.fromEntries(
      QUOTE_PRODUCTS.map((p) => [
        p,
        TIER_DISCOUNT.map(
          (d) => Math.round(((PRODUCT_BASE[p] ?? 3) + (MARKET_SPREAD[m] ?? 0) - d) * 1000) / 1000
        ),
      ])
    ),
  ])
);

function tierOf(gal: number): number {
  let t = 0;
  TIERS.forEach((tier, i) => {
    if (gal >= tier.from) t = i;
  });
  return t;
}

/** The list rate for one line, or `null` when it cannot be priced yet. */
export function listRate(market: string, product: string, gal: number): number | null {
  return PRICE_LIST[market]?.[product]?.[tierOf(gal)] ?? null;
}

/** Re-fill every line nobody typed a rate into. */
export function reprice(lines: QuoteLine[], market: string): QuoteLine[] {
  return lines.map((l) => (l.baseSet ? l : { ...l, base: listRate(market, l.name, l.gal) }));
}

/** Every line back on the list rate — "Reapply rate". */
export function reapplyRates(lines: QuoteLine[], market: string): QuoteLine[] {
  return lines.map((l) => ({ ...l, baseSet: false, base: listRate(market, l.name, l.gal) }));
}

/* ------------------------------------------------------------ pricing ---- */

/*
  THE ARITHMETIC (Pavan, 2026-10-07 — decision 2).

  Margin, fees and tax are set ONCE for the quote and applied to every line:
    $/gal    the same amount on every gallon;
    $ total  that amount spread evenly over every gallon on the quote;
    %        margin is a % of the line's base, fees a % of base + margin,
             tax a % of base + margin + fees (tax is on the selling price).
  So each line has its own net $/gal, the quote total is the sum of the lines,
  and the net effective $/gal is that total over the total gallons — the
  build-up beside it is the gallon-weighted average of each part, so the parts
  add up to the net exactly.
*/
export interface LinePrice {
  base: number;
  margin: number;
  fees: number;
  tax: number;
  net: number;
  total: number;
}

export interface QuotePrice {
  gallons: number;
  lines: (LinePrice | null)[];
  /** Gallon-weighted $/gal for each part, over the priced lines. */
  base: number;
  margin: number;
  fees: number;
  tax: number;
  net: number;
  total: number;
  /** Every line has a product, gallons and a base rate. */
  complete: boolean;
}

function perGal(a: Adjust, on: number, gallons: number): number {
  if (a.unit === "perGal") return a.value;
  if (a.unit === "total") return gallons > 0 ? a.value / gallons : 0;
  return (on * a.value) / 100;
}

export function priceQuote(q: Pick<Quote, "lines" | "margin" | "fees" | "tax">): QuotePrice {
  const priced = q.lines.filter((l) => l.base !== null && l.name && l.gal > 0);
  const gallons = priced.reduce((n, l) => n + l.gal, 0);
  const lines = q.lines.map((l): LinePrice | null => {
    if (l.base === null || !l.name || l.gal <= 0) return null;
    const base = l.base;
    const margin = perGal(q.margin, base, gallons);
    const fees = perGal(q.fees, base + margin, gallons);
    const tax = perGal(q.tax, base + margin + fees, gallons);
    const net = base + margin + fees + tax;
    return { base, margin, fees, tax, net, total: net * l.gal };
  });
  const sum = (k: keyof LinePrice) =>
    lines.reduce((n, p, i) => (p ? n + p[k] * q.lines[i].gal : n), 0);
  const avg = (k: keyof LinePrice) => (gallons > 0 ? sum(k) / gallons : 0);
  const total = lines.reduce((n, p) => n + (p?.total ?? 0), 0);
  return {
    gallons,
    lines,
    base: avg("base"),
    margin: avg("margin"),
    fees: avg("fees"),
    tax: avg("tax"),
    net: gallons > 0 ? total / gallons : 0,
    total,
    complete: q.lines.length > 0 && lines.every(Boolean),
  };
}

/* -------------------------------------------------------- sample data ---- */

const dayKey = (offset: number) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  return dateKeyOf(d);
};
const isoAt = (offset: number, hour: number) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 15);
  return d.toISOString();
};

const contactOf = (name: string) => CUSTOMERS.find((c) => c.name === name)?.contactEmail ?? "";

/*
  SAMPLE QUOTES — INVENTED (Pavan, 2026-10-07). Customers and ship-tos are the
  Customers fixtures; products are the fuel orders' own. Mixed on purpose: two
  drafts, sent ones still open, two Sent past their date (so Expired shows),
  and accepted ones that made an order.
*/
interface SeedQuote {
  customer: string;
  shipTo: string;
  market: string;
  lines: [string, number][];
  margin: Adjust;
  fees: Adjust;
  tax: Adjust;
  stage: QuoteStage;
  /** Days from today. */
  valid: number;
  updated: number;
  notes?: string;
}

const SEED: SeedQuote[] = [
  { customer: "Bray, Raymond and Marks", shipTo: "Bray North Yard", market: "Houston", lines: [["200* Diesel Onroad clear", 6000], ["Gas Pr 1", 1500]], margin: { value: 0.18, unit: "perGal" }, fees: { value: 85, unit: "total" }, tax: { value: 0, unit: "percent" }, stage: "Draft", valid: 14, updated: 0 },
  { customer: "Morris Group", shipTo: "Morris West Terminal", market: "Dallas–Fort Worth", lines: [["CLR DSL", 9000]], margin: { value: 6, unit: "percent" }, fees: { value: 0.02, unit: "perGal" }, tax: { value: 8.25, unit: "percent" }, stage: "Sent", valid: 10, updated: -1, notes: "Price holds for loads delivered before the valid-through date." },
  { customer: "Gonzalez, Palmer and Miller", shipTo: "GPM Southside", market: "San Antonio", lines: [["123", 2200], ["1652", 800], ["CTL1", 400]], margin: { value: 0.15, unit: "perGal" }, fees: { value: 120, unit: "total" }, tax: { value: 8.25, unit: "percent" }, stage: "Sent", valid: -3, updated: -9 },
  { customer: "Cardinal Logistics", shipTo: "Cardinal Hub A", market: "Houston", lines: [["200* Diesel Onroad clear", 12000]], margin: { value: 0.12, unit: "perGal" }, fees: { value: 0.015, unit: "perGal" }, tax: { value: 0, unit: "percent" }, stage: "Accepted", valid: 5, updated: -2 },
  { customer: "Westbrook Agriculture", shipTo: "Westbrook Farm 2", market: "San Antonio", lines: [["Gas Pr 1", 3000]], margin: { value: 5, unit: "percent" }, fees: { value: 60, unit: "total" }, tax: { value: 6.25, unit: "percent" }, stage: "Sent", valid: 21, updated: -1 },
  { customer: "Bray, Raymond and Marks", shipTo: "Bray Depot 2", market: "Houston", lines: [["CLR DSL", 4000], ["Test", 500]], margin: { value: 0.2, unit: "perGal" }, fees: { value: 0, unit: "perGal" }, tax: { value: 0, unit: "percent" }, stage: "Draft", valid: 0, updated: -3 },
  { customer: "Morris Group", shipTo: "Morris Group - 505112", market: "Dallas–Fort Worth", lines: [["123", 1800]], margin: { value: 0.16, unit: "perGal" }, fees: { value: 45, unit: "total" }, tax: { value: 8.25, unit: "percent" }, stage: "Accepted", valid: 2, updated: -6 },
  { customer: "Cardinal Logistics", shipTo: "Cardinal Overflow", market: "Houston", lines: [["CTL1", 2600], ["1652", 2600]], margin: { value: 7, unit: "percent" }, fees: { value: 0.01, unit: "perGal" }, tax: { value: 0, unit: "percent" }, stage: "Sent", valid: -1, updated: -12 },
  { customer: "Gonzalez, Palmer and Miller", shipTo: "Gonzalez, Palmer and Miller", market: "San Antonio", lines: [["200* Diesel Onroad clear", 7800]], margin: { value: 0.14, unit: "perGal" }, fees: { value: 150, unit: "total" }, tax: { value: 8.25, unit: "percent" }, stage: "Sent", valid: 6, updated: 0 },
  { customer: "Westbrook Agriculture", shipTo: "Westbrook Farm 1", market: "San Antonio", lines: [["Gas Pr 1", 1200], ["123", 1200]], margin: { value: 0.22, unit: "perGal" }, fees: { value: 0, unit: "perGal" }, tax: { value: 6.25, unit: "percent" }, stage: "Accepted", valid: -4, updated: -15 },
];

export const FIRST_QUOTE_NO = 2041;

export const SEED_QUOTES: Quote[] = SEED.map((s, i) => {
  const stamp = isoAt(s.updated, 9 + (i % 7));
  return {
    id: `qt-${i + 1}`,
    quoteNo: `Q-${FIRST_QUOTE_NO + SEED.length - 1 - i}`,
    customer: s.customer,
    shipTo: s.shipTo,
    email: contactOf(s.customer),
    validThrough: dayKey(s.valid),
    market: s.market,
    lines: s.lines.map(([name, gal]) => ({
      name,
      gal,
      base: listRate(s.market, name, gal),
      baseSet: false,
    })),
    margin: s.margin,
    fees: s.fees,
    tax: s.tax,
    notes: s.notes ?? "",
    stage: s.stage,
    updatedAt: stamp,
    audit: [{ at: stamp, by: "Dana Whitfield", changes: ["Quote created"] }],
  };
});

/* ------------------------------------------------------------- columns --- */

export type QuoteColumnKey =
  | "quoteNo"
  | "customer"
  | "shipTo"
  | "products"
  | "gallons"
  | "market"
  | "net"
  | "total"
  | "email"
  | "validThrough"
  | "status"
  | "updated"
  | "actions";

/* EVERY COLUMN SORTS — DS rule (Pavan, 2026-10-07). */
export const QUOTE_COLUMNS: {
  key: QuoteColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "left" | "right";
}[] = [
  { key: "quoteNo", label: "Quote #", width: 110, sortable: true },
  { key: "customer", label: "Customer", width: 210, sortable: true },
  { key: "shipTo", label: "Ship-to", width: 190, sortable: true },
  { key: "products", label: "Product", width: 200, sortable: true },
  { key: "gallons", label: "Gallons", width: 110, sortable: true, align: "right" },
  { key: "market", label: "Market", width: 150, sortable: true },
  { key: "net", label: "Net $/gal", width: 110, sortable: true, align: "right" },
  { key: "total", label: "Quote total", width: 130, sortable: true, align: "right" },
  { key: "email", label: "Customer email", width: 220, sortable: true },
  { key: "validThrough", label: "Valid through", width: 130, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "updated", label: "Updated", width: 140, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/** A `YYYY-MM-DD` key as the app prints a date. */
export const dateOfKey = (key: string): Date | null => {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const printKey = (key: string) => {
  const d = dateOfKey(key);
  return d ? DATE_FMT.format(d) : "—";
};

/** What each column PRINTS, as text a header box or a search can match. */
export function quoteColumnText(q: Quote, key: QuoteColumnKey): string {
  const p = priceQuote(q);
  switch (key) {
    case "quoteNo":
      return q.quoteNo;
    case "customer":
      return q.customer;
    case "shipTo":
      return q.shipTo;
    case "products":
      return q.lines.map((l) => l.name).join(" ");
    case "gallons":
      return String(p.gallons);
    case "market":
      return q.market;
    case "net":
      return p.gallons > 0 ? p.net.toFixed(3) : "";
    case "total":
      return p.total.toFixed(2);
    case "email":
      return q.email;
    case "validThrough":
      return printKey(q.validThrough);
    case "status":
      return quoteStatus(q);
    case "updated":
      return DATE_FMT.format(new Date(q.updatedAt));
    default:
      return "";
  }
}

export const QUOTE_SEARCH_FIELDS = QUOTE_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

export function matchesQuote(q: Quote, query: string): boolean {
  return QUOTE_SEARCH_FIELDS.map((f) => quoteColumnText(q, f.key))
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortValue(q: Quote, key: QuoteColumnKey): string | number {
  const p = priceQuote(q);
  switch (key) {
    case "gallons":
      return p.gallons;
    case "net":
      return p.net;
    case "total":
      return p.total;
    case "validThrough":
      return q.validThrough;
    case "updated":
      return q.updatedAt;
    case "status":
      return QUOTE_STATUSES.indexOf(quoteStatus(q));
    default:
      return quoteColumnText(q, key).toLowerCase();
  }
}

export interface QuoteSort {
  key: QuoteColumnKey;
  dir: "asc" | "desc";
}

export function sortQuotes(rows: Quote[], sort: QuoteSort | null): Quote[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

/* ------------------------------------------------------------ activity --- */

const say = (out: string[], label: string, from: unknown, to: unknown) => {
  if (String(from ?? "") === String(to ?? "")) return;
  out.push(`${label}: ${from || "—"} → ${to || "—"}`);
};

/** What a quote writes down — the events, not every keystroke. */
export function diffQuote(a: Quote, b: Quote): string[] {
  const out: string[] = [];
  say(out, "Status", a.stage, b.stage);
  say(out, "Customer", a.customer, b.customer);
  say(out, "Ship-to", a.shipTo, b.shipTo);
  say(out, "Market", a.market, b.market);
  say(out, "Valid through", a.validThrough && printKey(a.validThrough), b.validThrough && printKey(b.validThrough));
  const lines = (q: Quote) => q.lines.map((l) => `${l.name || "—"} ${l.gal} gal`).join(" · ");
  say(out, "Products", lines(a), lines(b));
  const total = (q: Quote) => {
    const p = priceQuote(q);
    return p.gallons > 0 ? MONEY(p.total) : "";
  };
  say(out, "Quote total", total(a), total(b));
  return out;
}
