import {
  DAY,
  NOW,
  customerOf,
  productOf,
  readSetting,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ConfigRow,
  type EntityMap,
  type Setting,
} from "./changeLog";
import { CUSTOMERS, categoryOf, cityOf, stateOf } from "./seed";

/*
  PRICING CONFIGURATION — SHIP-TO AND CUSTOMER (Yash, 2026-11-17). The
  production Configuration table's columns (screenshots, 2026-11-17), read
  off the change log's rows so an edit here shows in the log and the log's
  undo shows here. First party only for now; the Mode switch (first party ·
  third party) comes later.
*/

/** The hubs a customer can price from — markets' hubs and the terminals. */
export const HUBS: string[] = [
  "Houston hub", "Lake Charles hub", "Baton Rouge hub", "Shreveport hub", "Midland hub", "Austin hub", "Greenville hub", "Mobile hub", "Beaumont hub",
  "Pasadena terminal", "Port Arthur terminal", "Port Fourchon terminal", "Morgan City terminal", "Odessa terminal", "Pecos yard", "Hobbs yard",
  "Galveston terminal", "Texas City terminal", "Natchez terminal", "Vidalia yard", "Lufkin yard", "Nacogdoches yard", "Houma terminal", "Sulphur yard",
];

/** Where a row's pricing comes from — the Applied pricing column. */
export const APPLIED_LABEL = { shipto: "Ship-to", customer: "Customer", hub: "Hub" } as const;
export const UNCONFIGURED = "Unconfigured";

/* County or parish by city — the sample's towns. */
const COUNTY: Record<string, string> = {
  Andrews: "Andrews County",
  Austin: "Travis County",
  "Baton Rouge": "East Baton Rouge Parish",
  Baytown: "Harris County",
  Beaumont: "Jefferson County",
  "Bossier City": "Bossier Parish",
  Center: "Shelby County",
  Cleveland: "Bolivar County",
  Creole: "Cameron Parish",
  "Denham Springs": "Livingston Parish",
  Diboll: "Angelina County",
  Galveston: "Galveston County",
  Georgetown: "Williamson County",
  Gonzales: "Ascension Parish",
  Greenville: "Washington County",
  Hobbs: "Lea County",
  Houma: "Terrebonne Parish",
  Indianola: "Sunflower County",
  Jennings: "Jefferson Davis Parish",
  Kermit: "Winkler County",
  "Lake Charles": "Calcasieu Parish",
  "League City": "Galveston County",
  Lufkin: "Angelina County",
  Midland: "Midland County",
  Minden: "Webster Parish",
  Mobile: "Mobile County",
  Monahans: "Ward County",
  "Morgan City": "St. Mary Parish",
  Nacogdoches: "Nacogdoches County",
  Natchez: "Adams County",
  Odessa: "Ector County",
  Pasadena: "Harris County",
  Pecos: "Reeves County",
  "Port Arthur": "Jefferson County",
  "Port Fourchon": "Lafourche Parish",
  Prairieville: "Ascension Parish",
  "Round Rock": "Williamson County",
  "San Marcos": "Hays County",
  Seminole: "Gaines County",
  Shreveport: "Caddo Parish",
  Sulphur: "Calcasieu Parish",
  "Texas City": "Galveston County",
  Vidalia: "Concordia Parish",
  Westlake: "Calcasieu Parish",
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/** The facts a row carries that pricing does not set. */
export interface RowFacts {
  category: string;
  state: string;
  county: string;
  /** The hub it prices from, when Applied pricing is Hub. */
  hub: string | null;
  /** Last delivery of this product here, or null. */
  lastDelivery: number | null;
}
export function factsOf(r: ConfigRow, ents: EntityMap): RowFacts {
  const s = shiptoOf(r.shiptoId);
  const city = cityOf(s).split(",")[0].trim();
  const market = ents.get(r.market)?.name;
  const h = hash(`ld${r.id}`);
  return {
    category: categoryOf(productOf(r.productId).categoryId).name,
    state: stateOf(s),
    county: COUNTY[city] ?? "—",
    hub: r.applied === "hub" && r.configured ? `${market ?? "Houston"} hub` : null,
    lastDelivery: r.configured && h > 0.3 ? NOW - Math.floor(h * 40 * DAY) - Math.floor(hash(`lt${r.id}`) * 10) * 3_600_000 : null,
  };
}

/** A list setting as the table prints it: the names, then how many. */
export function listCell(row: ConfigRow, setting: Setting, ents: EntityMap, one: string, many: string) {
  const r = readSetting(row, setting, ents);
  const n = r.ids.length;
  /* THE TOTAL LEADS (Yash, 2026-11-17): what they add up to, $/gal; the
     count under it opens which ones apply. */
  const items = r.ids.map((id) => ({ name: ents.get(id)?.name ?? id, value: ents.get(id)?.value ?? 0 }));
  const values = n ? perGal(r.value) : "None";
  return { names: n ? r.text : "None", values, items, count: `${n} ${n === 1 ? one : many}`, value: r.value, ids: r.ids };
}

/** "+4¢" — the adders' total, as the production table shows it. */
export const centsOf = (v: number) => `${v >= 0 ? "+" : "−"}${Number((Math.abs(v) * 100).toFixed(2))}¢`;
export const perGal = (v: number) => `$${v.toFixed(4)}`;

/** Customer pricing: one record per customer, inherited by its ship-tos that
 *  are not priced on their own (or from a hub). */
export interface CustomerPricing {
  customerId: string;
  /** Rows that inherit it. */
  rowIds: string[];
  shiptos: number;
  /** The record — the customer's own, or read from its first inheriting row. */
  record: ConfigRow | null;
}
export function customerPricing(rows: ConfigRow[], own: Record<string, ConfigRow>): CustomerPricing[] {
  return CUSTOMERS.map((c) => {
    const inh = rows.filter((r) => r.customerId === c.id && r.applied === "customer");
    return {
      customerId: c.id,
      rowIds: inh.map((r) => r.id),
      shiptos: uniq(inh.map((r) => r.shiptoId)).length,
      record: own[c.id] ?? inh[0] ?? null,
    };
  });
}

/** The changes that reached a ship-to, or a customer's own pricing. Newest first. */
export function historyOf(changes: ChangeRecord[], target: PricingTarget): ChangeRecord[] {
  return changes
    .filter((c) => c.status !== "canceled")
    .filter((c) =>
      target.kind === "row"
        ? c.lines.some((l) => l.shiptoId === target.shiptoId) || c.edits.some((e) => e.rowIds.some((id) => id.startsWith(`${target.shiptoId}~`)))
        : (c.source === "customer" && (c.lines.some((l) => l.customerId === target.customerId) || c.customerId === target.customerId))
    )
    .sort((a, b) => b.effectiveAt - a.effectiveAt);
}

/** What a pricing sheet is open on. */
export type PricingTarget =
  | { kind: "row"; rowId: string; shiptoId: string }
  | { kind: "customer"; customerId: string };

export const targetName = (t: PricingTarget, rowOf: (id: string) => ConfigRow | undefined) => {
  if (t.kind === "customer") return customerOf(t.customerId).name;
  const r = rowOf(t.rowId);
  return r ? `${shiptoOf(r.shiptoId).name} · ${productOf(r.productId).name}` : "";
};
