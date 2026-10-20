import { startOfDay } from "../unified-view/data";
import { PRODUCTS, MARKET_PRICE, CUSTOMER_DIFF, orderNoFor } from "./orders";
import { INVOICES, OPEN, totalOf } from "./invoices";

/*
  THE DASHBOARD'S DATA (Pavan, 2026-10-13) — how the tenant has been
  fulfilling this customer's requests, week by week, and what needs the
  customer's eye now. The weekly history is INVENTED (no real feed yet); the
  lists that need attention read the live requests where they can.

  WEEKS ARE FULL WEEKS, Monday to Sunday, ending last Sunday — a part-week
  would always look worse than the ones before it.

  RUN DRY = A DRIVER FOUND A TANK EMPTY (Pavan, 2026-10-13). How long it sat
  empty is not known, so it is counted as times, not days: empty for a few
  minutes is still empty.
*/

/** The default range: 8 full weeks. */
export const RANGES = [4, 8, 12] as const;
export type RangeWeeks = (typeof RANGES)[number];
export const DEFAULT_RANGE: RangeWeeks = 8;

export interface Week {
  /** Monday. */
  start: Date;
  onTime: number;
  late: number;
  partial: number;
  cancelled: number;
  galRequested: number;
  galDelivered: number;
  /** Times a driver found a tank empty. */
  foundEmpty: number;
  /** Hours, on average, from a request being sent to it being scheduled. */
  hoursToConfirm: number;
  /** Gallons delivered per product. */
  byProduct: Record<string, number>;
  /** $/gal per product — what the customer paid and the market price that week. */
  prices: Record<string, { paid: number; market: number }>;
  /** Credit used that week, $ — for a customer the tenant gives credit. */
  creditUsed: number;
}

/* A SEEDED RANDOM, so the invented history is the same on every load. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* HOW THE GALLONS SPLIT, roughly — the customer's mix. INVENTED. */
const MIX: Record<string, number> = {
  Diesel: 0.5,
  "Dyed Diesel": 0.17,
  "Unleaded 87": 0.14,
  DEF: 0.04,
  "Jet A": 0.06,
  "Avgas 100LL": 0.01,
  Propane: 0.06,
  "Hydraulic Oil AW-46": 0.02,
};

const lastMonday = () => {
  const d = startOfDay(new Date());
  const back = ((d.getDay() + 6) % 7) + 7; // the Monday of last week
  d.setDate(d.getDate() - back);
  return d;
};

/** 24 full weeks, oldest first — enough for 12 weeks and the 12 before them. */
export const WEEKS: Week[] = (() => {
  const r = rng(4711);
  const first = lastMonday();
  first.setDate(first.getDate() - 23 * 7);
  return Array.from({ length: 24 }, (_, i) => {
    const t = i / 23; // 0 oldest → 1 newest: the service has been improving
    const total = Math.round(30 + r() * 10 + t * 6);
    const late = Math.round(total * (0.17 - 0.11 * t + (r() - 0.5) * 0.05));
    const partial = Math.round(total * (0.08 - 0.05 * t + (r() - 0.5) * 0.03));
    const cancelled = Math.round(r() * 2);
    const galRequested = Math.round(total * (2900 + r() * 500)) ;
    const galDelivered = Math.round(galRequested * (0.9 + 0.07 * t + (r() - 0.5) * 0.02));
    const byProduct: Record<string, number> = {};
    for (const p of PRODUCTS) byProduct[p] = Math.round(galDelivered * (MIX[p] ?? 0) * (0.85 + r() * 0.3));
    /* THE MARKET MOVES TOGETHER, each product round its own level; the
       customer's price follows it at the tenant's differential. */
    const swing = (r() - 0.5) * 0.06 + Math.sin(i / 3) * 0.025;
    const prices: Week["prices"] = {};
    for (const p of PRODUCTS) {
      const base = MARKET_PRICE[p];
      if (base === undefined) continue;
      const market = base * (1 + swing + (r() - 0.5) * 0.01);
      prices[p] = {
        market: Number(market.toFixed(3)),
        paid: Number((market + (CUSTOMER_DIFF[p] ?? 0) + (r() - 0.5) * 0.02).toFixed(3)),
      };
    }
    /* THE LAST THREE WEEKS FOUND NOTHING EMPTY; the one before, once —
       the driver note below. */
    const foundEmpty = i >= 21 ? 0 : i === 20 ? 1 : Math.max(0, Math.round(3.4 - 3 * t + (r() - 0.5) * 1.6));
    return {
      start: (() => {
        const d = new Date(first);
        d.setDate(d.getDate() + i * 7);
        return d;
      })(),
      onTime: Math.max(0, total - late - partial - cancelled),
      late: Math.max(0, late),
      partial: Math.max(0, partial),
      cancelled,
      galRequested,
      galDelivered,
      foundEmpty,
      hoursToConfirm: Number((9.5 - 5 * t + (r() - 0.5) * 1.5).toFixed(1)),
      byProduct,
      prices,
      creditUsed: Math.round((88000 + r() * 50000 + t * 12000) / 100) * 100,
    };
  });
})();

/** The chosen range, and the same number of weeks before it. */
export function periods(n: RangeWeeks) {
  return { now: WEEKS.slice(-n), before: WEEKS.slice(-2 * n, -n) };
}

const sum = (ws: Week[], f: (w: Week) => number) => ws.reduce((a, w) => a + f(w), 0);

/** The four headline figures for a set of weeks. */
export function headline(ws: Week[]) {
  const delivered = sum(ws, (w) => w.onTime + w.late + w.partial);
  return {
    onTimePct: delivered ? (sum(ws, (w) => w.onTime) / delivered) * 100 : 0,
    fillPct: (sum(ws, (w) => w.galDelivered) / Math.max(1, sum(ws, (w) => w.galRequested))) * 100,
    foundEmpty: sum(ws, (w) => w.foundEmpty),
    hoursToConfirm: ws.length ? sum(ws, (w) => w.hoursToConfirm) / ws.length : 0,
  };
}

/** Gallons per product over a set of weeks — products with none left out. */
export function productTotals(ws: Week[]) {
  return PRODUCTS.map((p) => ({ product: p, gal: sum(ws, (w) => w.byProduct[p] ?? 0) }));
}

/** Products with a market price — the price card's tabs. */
export const PRICED_PRODUCTS = PRODUCTS.filter((p) => MARKET_PRICE[p] !== undefined);

/** What the gallons cost, $ — at the customer's price or at market, on one product (or all). */
export function spend(ws: Week[], at: "paid" | "market", product?: string) {
  const ps = product ? [product] : PRICED_PRODUCTS;
  return sum(ws, (w) => ps.reduce((a, p) => a + (w.prices[p] ? w.prices[p][at] * (w.byProduct[p] ?? 0) : 0), 0));
}

/* NO MARKET COMPARISON for the customer (Anirudh review, 2026-10-17). */

/* ------------------------------------------------------------- credit --- */

/*
  CREDIT (Pavan, 2026-10-13) — not every customer has it: the tenant gives
  credit to some and not others, so the card shows only when it is on. The
  limit is per week; accepted quotes and placed orders take from it before
  they are invoiced (committed), invoices take from it (used). INVENTED.
*/
export const CREDIT = {
  enabled: true,
  period: "week" as const,
  limit: 150_000,
  used: 62_400,
  committed: 41_800,
  /** The day it resets. */
  resets: "Monday",
};

/* ----------------------------------------------------------- invoices --- */

export interface OpenInvoice {
  invoiceNo: string;
  orderNo: string;
  shipTo: string;
  amount: number;
  /** `YYYY-MM-DD`. */
  due: string;
  disputed: boolean;
}


/** Invoices not yet paid — read from the one invoice store (invoices.ts). */
export const OPEN_INVOICES: OpenInvoice[] = INVOICES.filter((i) => OPEN.includes(i.status)).map((i) => ({
  invoiceNo: i.invoiceNo,
  orderNo: i.orderNo,
  shipTo: i.shipTo,
  amount: totalOf(i),
  due: i.due,
  disputed: i.status === "Payment disputed" || i.status === "Invoice disputed",
}));

/* -------------------------------------------------------- driver notes --- */

/*
  WHAT DRIVERS NOTED AT DELIVERY (Pavan, 2026-10-13) — the assets that need
  the customer's attention: water in a tank, a leak, a broken gauge, blocked
  access, a tank found empty. Level colours the note's name as Flags do (red
  · amber · plain). The newest ones tie to the live requests. INVENTED.
*/
export type NoteLevel = "critical" | "warning" | "info";
export interface DriverNote {
  id: string;
  kind: string;
  detail: string;
  level: NoteLevel;
  assetId: string;
  requestNo: string;
  driver: string;
  /** ISO. */
  at: string;
}

const daysAgo = (d: number, h = 10) => {
  const t = startOfDay(new Date());
  t.setDate(t.getDate() - d);
  t.setHours(h);
  return t.toISOString();
};

export const DRIVER_NOTES: DriverNote[] = [
  {
    id: "dn-1",
    kind: "Water in tank",
    detail: "Water found at the bottom of the tank.",
    level: "critical",
    assetId: "c-1",
    requestNo: orderNoFor("REQ-1112"),
    driver: "Marcus Reyes",
    at: daysAgo(0, 8),
  },
  {
    id: "dn-2",
    kind: "Access blocked",
    detail: "Gate locked; 2,400 gal not delivered.",
    level: "warning",
    assetId: "b-2",
    requestNo: orderNoFor("REQ-1114"),
    driver: "Dana Holt",
    at: daysAgo(1, 15),
  },
  {
    id: "dn-3",
    kind: "Damaged fill cap",
    detail: "Fill cap cracked; fuel could get contaminated.",
    level: "warning",
    assetId: "a-4",
    requestNo: orderNoFor("REQ-1086"),
    driver: "Marcus Reyes",
    at: daysAgo(6, 11),
  },
  {
    id: "dn-4",
    kind: "Gauge not working",
    detail: "Tank monitor offline on arrival.",
    level: "info",
    assetId: "b-1",
    requestNo: orderNoFor("REQ-1109"),
    driver: "Luis Ortega",
    at: daysAgo(9, 9),
  },
  {
    id: "dn-5",
    kind: "Tank found empty",
    detail: "Tank was empty when the driver arrived.",
    level: "critical",
    assetId: "b-2",
    requestNo: orderNoFor("REQ-1079"),
    driver: "Dana Holt",
    at: daysAgo(23, 7),
  },
];

/** Days since a driver last found a tank empty. */
export function daysSinceEmpty(): number | null {
  const last = DRIVER_NOTES.filter((n) => n.kind === "Tank found empty")
    .map((n) => Date.parse(n.at))
    .sort((a, b) => b - a)[0];
  return last ? Math.floor((startOfDay(new Date()).getTime() - startOfDay(new Date(last)).getTime()) / 86_400_000) : null;
}
