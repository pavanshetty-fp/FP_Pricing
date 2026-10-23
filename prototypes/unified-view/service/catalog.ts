import { RENTAL_ASSETS } from "../threepl/directory";
import {
  FEE_BOOK,
  LABOR_RATE,
  WORK_TYPES,
  WORK_TYPE_CATEGORY,
  TASK_KIND_LABEL,
  type ServiceOrder,
} from "./work";

/*
  THE SERVICE PLATFORM'S REFERENCE SCREENS (Pavan and Deepika, 2026-09-24),
  after Anirudh's unified design: price book, parts, agreements, maintenance,
  compliance, performance.

  BUILT FROM WHAT THE MODULE ALREADY HOLDS where it can be — the price book
  IS `WORK_TYPES`, the parts are the parts it names, the assets and customers
  are the real rental fleet — so an order and these screens agree. What has
  no source yet is INVENTED and deterministic: stock levels, bins, vendors,
  plans, visit counts, certificate dates.
*/

const DAY = 86_400_000;
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ─────────────────────────────────────────────────────────── price book ── */

/** How long each job usually takes. INVENTED until the real book arrives. */
const LABOR_HOURS: Record<string, number> = {
  "Leak check": 2,
  "Hose swap": 1.5,
  "Pump replace": 3,
  "Nozzle replace": 1,
  "Monitor install": 2,
  "Tank swap": 4,
};

export interface PriceBookRow {
  code: string;
  job: string;
  category: string;
  laborHours: number;
  parts: string[];
  fee: number;
  /** Parts + fee + the usual hours at the standard rate — what the job comes to. */
  flatRate: number;
}

export const PRICE_BOOK: PriceBookRow[] = Object.entries(WORK_TYPES).map(([job, book]) => {
  const hours = LABOR_HOURS[job] ?? 1;
  const parts = book.parts.reduce((s, p) => s + p.cost * p.qty, 0);
  const fee = book.fees.reduce((s, f) => s + f.amount, 0);
  return {
    code: job
      .split(" ")
      .map((w) => w.slice(0, 3).toUpperCase())
      .join("-"),
    job,
    category: TASK_KIND_LABEL[WORK_TYPE_CATEGORY[job] ?? "Parts"],
    laborHours: hours,
    parts: book.parts.map((p) => (p.qty > 1 ? `${p.name} ×${p.qty}` : p.name)),
    fee,
    flatRate: Math.round(parts + fee + hours * LABOR_RATE),
  };
});

export { FEE_BOOK };

/* ──────────────────────────────────────────────────────────────── parts ── */

export interface InventoryRow {
  sku: string;
  part: string;
  bin: string;
  vendor: string;
  onHand: number;
  reorderAt: number;
  cost: number;
}

const VENDORS = ["GPI Direct", "OPW Supply", "Cim-Tek", "Fisher"];

/** Every part the price book names, plus the common consumables. */
export const INVENTORY: InventoryRow[] = (() => {
  const seen = new Map<string, number>();
  for (const b of Object.values(WORK_TYPES)) for (const p of b.parts) seen.set(p.name, p.cost);
  const extra: [string, number][] = [
    ["Spin-on filter", 30],
    ["Pump seal kit", 88],
    ["Regulator diaphragm", 64],
  ];
  for (const [n, c] of extra) if (!seen.has(n)) seen.set(n, c);
  return [...seen.entries()].map(([part, cost], i) => ({
    sku: part.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() + "-" + String(100 + i * 7),
    part,
    bin: `${"ABCD"[i % 4]}-${String(3 + i * 4).padStart(2, "0")}`,
    vendor: VENDORS[i % VENDORS.length],
    onHand: [4, 11, 2, 26, 1, 6, 9, 3][i % 8],
    reorderAt: [2, 4, 3, 10, 3, 2, 4, 3][i % 8],
    cost,
  }));
})();

export const stockStatus = (r: InventoryRow) => (r.onHand <= r.reorderAt ? "Reorder" : "Stocked");

/* ─────────────────────────────────────────────────────────── agreements ── */

/** The fleet that sits at customers — where agreements and plans attach. */
const PLACED = RENTAL_ASSETS.filter((a) => a.customer && a.shipTo);

export type AgreementStatus = "Active" | "Renewal due" | "Lapsed";

export interface AgreementRow {
  no: string;
  kind: "Membership" | "MSA";
  customer: string;
  asset: string;
  plan: string;
  visitsUsed: number;
  visitsIncluded: number;
  monthly: number;
  renewsKey: string;
  autoRenew: boolean;
  status: AgreementStatus;
}

const PLANS = [
  { plan: "Basic", visits: 2, monthly: 40 },
  { plan: "Plus", visits: 4, monthly: 95 },
  { plan: "Premium", visits: 6, monthly: 160 },
];

export const AGREEMENTS: AgreementRow[] = PLACED.slice(0, 8).map((a, i) => {
  const p = PLANS[i % 3];
  const renews = addDays(today(), [160, 6, -105, 220, 45, -20, 300, 12][i]);
  const days = (renews.getTime() - today().getTime()) / DAY;
  const status: AgreementStatus = days < 0 ? "Lapsed" : days <= 30 ? "Renewal due" : "Active";
  /* AN MSA IS A YEAR'S FEE COVERING A SCHEDULE (Deepika, 2026-09-24). */
  const msa = i % 4 === 3;
  return {
    no: `SA-${1140 + i * 7}`,
    kind: msa ? "MSA" : "Membership",
    customer: a.customer!,
    asset: a.name,
    plan: msa ? "Master service agreement" : p.plan,
    visitsUsed: Math.min(p.visits, [2, 5, 2, 1, 3, 2, 0, 4][i]),
    visitsIncluded: msa ? 12 : p.visits,
    monthly: msa ? 450 : p.monthly,
    renewsKey: keyOf(renews),
    autoRenew: i % 3 !== 2,
    status,
  };
});

/* ─────────────────────────────────────────────────────────── maintenance ── */

export interface MaintenancePlan {
  id: string;
  no: string;
  asset: string;
  assetId: string;
  assetType: string;
  customer: string;
  shipTo: string;
  task: string;
  everyMonths: number;
  lastKey: string;
  nextKey: string;
}

export const MAINTENANCE_PLANS: MaintenancePlan[] = PLACED.slice(0, 7).map((a, i) => {
  const every = [6, 12, 3, 12, 18, 6, 3][i];
  const last = addDays(today(), -[50, 350, 80, 140, 100, 170, 95][i]);
  const next = new Date(last);
  next.setMonth(next.getMonth() + every);
  return {
    id: `mp-${i}`,
    no: `MP-${301 + i}`,
    asset: a.name,
    assetId: a.id,
    assetType: a.assetType,
    customer: a.customer!,
    shipTo: a.shipTo!,
    task: Object.keys(WORK_TYPES)[i % Object.keys(WORK_TYPES).length],
    everyMonths: every,
    lastKey: keyOf(last),
    nextKey: keyOf(next),
  };
});

/* ───────────────────────────────────────────────────────────── compliance ── */

export type ComplianceStatus = "OK" | "Due soon" | "Overdue";

export interface ComplianceItem {
  no: string;
  asset: string;
  customer: string;
  requirement: string;
  authority: string;
  lastKey: string;
  dueKey: string;
  status: ComplianceStatus;
}

/**
 * LONG-CYCLE COMPLIANCE (Deepika, 2026-09-24) — tests an asset needs because
 * it sits at a customer for years: a tank tightness test, a cargo tank
 * inspection, a regulator recertification.
 */
const REQUIREMENTS = [
  { requirement: "Tank tightness test", authority: "State EPA", years: 1 },
  { requirement: "DOT cargo tank inspection", authority: "FMCSA", years: 1 },
  { requirement: "Propane regulator recert", authority: "NFPA 58", years: 2 },
  { requirement: "Overfill prevention check", authority: "State EPA", years: 1 },
];

export const COMPLIANCE: ComplianceItem[] = PLACED.slice(2, 8).map((a, i) => {
  const r = REQUIREMENTS[i % REQUIREMENTS.length];
  const due = addDays(today(), [20, 310, -40, 220, 9, 150][i]);
  const last = new Date(due);
  last.setFullYear(last.getFullYear() - r.years);
  const days = (due.getTime() - today().getTime()) / DAY;
  return {
    no: `CP-${71 + i}`,
    asset: a.name,
    customer: a.customer!,
    requirement: r.requirement,
    authority: r.authority,
    lastKey: keyOf(last),
    dueKey: keyOf(due),
    status: days < 0 ? "Overdue" : days <= 30 ? "Due soon" : "OK",
  };
});

/* ─────────────────────────────────────────────────────────── performance ── */

/** Work still on the books — not yet finished. */
const OPEN = new Set(["Drafted", "Parts pending", "Linked order", "Assigned", "Yet to start", "Ongoing"]);

/**
 * THE NUMBERS, COUNTED OFF THE ORDERS — never stored, so they cannot go
 * stale. First-time fix: finished jobs that did not need a second visit.
 * Quote attach: finished jobs that carried a quote.
 */
export function performance(rows: ServiceOrder[]) {
  const finished = rows.filter((r) => r.completedAt && r.status !== "Canceled");
  const firstTime = finished.filter((r) => r.visits.length <= 1 && r.status !== "Completed — linked");
  const quoted = finished.filter((r) => r.quote);
  const invoiced = rows.filter((r) => r.invoiceCreated);
  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
  return {
    open: rows.filter((r) => OPEN.has(r.status)).length,
    firstTimeFix: pct(firstTime.length, finished.length),
    quoteAttach: pct(quoted.length, finished.length),
    invoicedCount: invoiced.length,
    synced: rows.filter((r) => r.synced).length,
    finished: finished.length,
  };
}
