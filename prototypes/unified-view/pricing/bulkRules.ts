import * as React from "react";
import {
  CURRENT_USER,
  DAY,
  NOW,
  customerOf,
  effectivePrice,
  money,
  plural,
  productOf,
  readSetting,
  shiptoOf,
  uniq,
  type ConfigRow,
  type EntityMap,
} from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { LINES_OF_SERVICE } from "../customers";
import { categoryOf } from "./seed";

/*
  BULK RULES (Yash, 2026-11-18) — read as IF / AND / THEN: IF a price matches
  the record (business line, LOS, region, market), AND it belongs to these
  customers, ship-tos and products (and their configurations), THEN change
  these settings — EXCEPT what is left out. A rule is kept and can run again;
  each run keeps every price it touched, before → after, and why the rest
  did not change. A template is a rule's definition without a date.

  Runs do NOT write to the change log yet (Yash, 2026-11-18): what a run set
  is kept here, on top of the configuration rows, so the next preview reads
  the prices the last run left.
*/

// ------------------------------------------------------------- vocabulary --

/** The repo's business lines (Sales settings) and lines of service (customers). */
export const BUSINESS_LINES = ["Fuel", "Lubricants", "Equipment"];
export const LOS: string[] = [...LINES_OF_SERVICE];

/* REGIONS, THE UMBRELLA OVER MARKETS (Yash, 2026-11-18) — invented and
   flagged: the sample's nine markets grouped the way a Gulf South dispatcher
   would say them. */
export const REGIONS: Record<string, string[]> = {
  Louisiana: ["Lake Charles", "Baton Rouge", "Shreveport"],
  "Upper Texas Coast": ["Houston", "Beaumont"],
  "Central Texas": ["Austin"],
  "West Texas": ["Midland"],
  "Mississippi Delta": ["Greenville"],
  "Alabama Gulf Coast": ["Mobile"],
};
export const REGION_NAMES = Object.keys(REGIONS);
export const MARKET_NAMES = Object.values(REGIONS).flat();
export const regionOf = (market: string) => REGION_NAMES.find((r) => REGIONS[r].includes(market)) ?? "";

export type Which = "configured" | "unconfigured" | "both";
export const WHICH: { key: Which; label: string }[] = [
  { key: "configured", label: "Configured" },
  { key: "unconfigured", label: "Unconfigured" },
  { key: "both", label: "Both" },
];
export const whichLabel = (w: Which) => WHICH.find((x) => x.key === w)!.label;
export type Source = "first" | "3pl";
export const SOURCES: { key: Source; label: string }[] = [
  { key: "first", label: "First party" },
  { key: "3pl", label: "3PL" },
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/* SAMPLE FACTS, INVENTED AND FLAGGED: the configuration rows carry no
   business line, line of service, region or pricing source. DEF is sold
   with the lubricants; every other product is fuel. Propane is the propane
   line; "Transport" products go by transport, "Short Truck" ones by tank
   wagon, the rest either. A market's region is its umbrella. One ship-to in
   five is served by a 3PL. */
export function factsOfRow(r: ConfigRow, ents: EntityMap) {
  const p = productOf(r.productId);
  const market = ents.get(r.market)?.name ?? "Houston";
  const los =
    p.id === "lpg" ? "Propane" : /Transport/.test(p.name) ? "Transportation" : /Short Truck/.test(p.name) ? "Tank Wagon" : hash(`los${r.shiptoId}`) > 0.5 ? "Tank Wagon" : "Transportation";
  const source: Source = hash(`src${r.shiptoId}`) > 0.8 ? "3pl" : "first";
  return { businessLine: p.categoryId === "def" ? "Lubricants" : "Fuel", los, market, region: regionOf(market), source };
}

// --------------------------------------------------------------- changes --

export type ChangeSetting = "rateType" | "base" | "margin" | "fee" | "tax" | "adder";
export type ChangeAction = "set" | "adjustAmount" | "adjustPercent" | "add" | "replace" | "remove";

export const SETTINGS: { key: ChangeSetting; label: string; actions: ChangeAction[] }[] = [
  { key: "rateType", label: "Rate type", actions: ["set"] },
  { key: "base", label: "Base price", actions: ["set", "adjustAmount", "adjustPercent"] },
  { key: "margin", label: "Margin", actions: ["set", "add", "replace", "remove"] },
  { key: "fee", label: "Fees", actions: ["add", "replace", "remove"] },
  { key: "tax", label: "Taxes", actions: ["add", "replace", "remove"] },
  { key: "adder", label: "Adders", actions: ["add", "replace", "remove"] },
];
export const settingLabel = (s: ChangeSetting) => SETTINGS.find((x) => x.key === s)!.label;

export function actionLabel(s: ChangeSetting, a: ChangeAction) {
  switch (a) {
    case "set":
      return s === "rateType" ? "Set to" : "Set to ($/gal)";
    case "adjustAmount":
      return "Adjust by ($/gal)";
    case "adjustPercent":
      return "Adjust by (%)";
    case "add":
      return "Add";
    case "replace":
      return "Replace with";
    case "remove":
      return "Remove";
  }
}

/** THE ACTIONS A CHANGE MAY TAKE beside the other rows (Yash, 2026-11-18): a
 *  value — rate type, base price — is changed once; a list — margins, fees,
 *  taxes, adders — takes Add and Remove together, one row each, but Set or
 *  Replace says it all and stands alone. */
export function actionsFor(s: ChangeSetting, others: ChangeRow[]): ChangeAction[] {
  const all = SETTINGS.find((x) => x.key === s)!.actions;
  const mine = others.filter((o) => o.setting === s);
  if (!mine.length) return all;
  if (s === "rateType" || s === "base") return [];
  if (mine.some((o) => o.action === "set" || o.action === "replace")) return [];
  return all.filter((a) => (a === "add" || a === "remove") && !mine.some((o) => o.action === a));
}

/** What the value cell takes for a setting and action. */
export function valueKind(s: ChangeSetting | "", a: ChangeAction): "none" | "rateType" | "amount" | "entities" {
  if (!s) return "none";
  if (s === "rateType") return "rateType";
  if (s === "base") return "amount";
  if (s === "margin" && a === "set") return "amount";
  return "entities";
}

/** One change — a setting, what to do to it, and the value. */
export interface ChangeRow {
  setting: ChangeSetting | "";
  action: ChangeAction;
  entityIds: string[];
  amount: string;
}

/** A change is filled when it has what its setting and action need. */
export function changeReady(c: ChangeRow) {
  const k = valueKind(c.setting, c.action);
  if (k === "none") return false;
  if (k === "rateType" || k === "entities") return c.entityIds.length > 0;
  return Number.isFinite(num(c.amount));
}

// ------------------------------------------------------------------ rules --

/** One IF row — empty for "All". Several values in a cell mean any of them;
 *  rows are OR'd. Region is one value, the umbrella over its markets. */
export interface WhereRow {
  businessLines: string[];
  los: string[];
  region: string;
  markets: string[];
}
/** One customer line — empty customer, ship-tos or products for "All" — and
 *  which of its configurations: the ones set up, the missing ones, or both. */
export interface TargetRow {
  customerId: string;
  shiptoIds: string[];
  productIds: string[];
  which: Which;
  /** Except only: tanks — a price is left out when its tank is picked. */
  assetIds?: string[];
}

/* SAMPLE TANKS, INVENTED AND FLAGGED (Yash, 2026-11-19: Except takes an
   asset). Prices carry no asset; here every ship-to × product price is
   served from one tank, named for its product: "Tank DCT-104". */
export const assetOf = (r: { shiptoId: string; productId: string }) => `${r.shiptoId}~${r.productId}`;
export const assetName = (id: string) => {
  const [shiptoId, productId] = id.split("~");
  return `Tank ${productOf(productId).code}-${100 + Math.floor(hash(`tk${shiptoId}`) * 900)} · ${shiptoOf(shiptoId).name}`;
};

/* ------------------------------------------------- version 2 conditions -- */

/* VERSION 2 — IF THIS, THEN THAT (Yash, 2026-11-18). The IF is a list the
   reader builds: pick a condition (region, market, customer, ship-to…), then
   its values; conditions are ordered by priority — each narrows what the next
   one offers (a customer picked first limits the regions to that customer's;
   a region picked first limits the customers to that region's). Options a
   condition above rules out are shown dimmed, with why. */
export type CondField =
  | "region"
  | "businessLine"
  | "los"
  | "market"
  | "customer"
  | "shipto"
  | "product"
  | "category"
  | "rateType"
  | "applied"
  | "configurations";
export const COND_FIELDS: { key: CondField; label: string; one?: boolean }[] = [
  /* REGION TAKES SEVERAL IN VERSION 2 (Yash, 2026-11-18). */
  /* THE ORDER PEOPLE ASK IN (Yash, 2026-11-19): region, customer, ship-to,
     rate type, market, product, then the rest. */
  { key: "region", label: "Region" },
  { key: "customer", label: "Customer" },
  { key: "shipto", label: "Ship-to" },
  { key: "rateType", label: "Rate type" },
  { key: "market", label: "Market" },
  { key: "product", label: "Product" },
  { key: "businessLine", label: "Business line" },
  { key: "los", label: "LOS" },
  /* MORE OF WHAT A PRICE CARRIES (Yash, 2026-11-18: "more conditions"). */
  { key: "category", label: "Product category" },
  { key: "applied", label: "Applied pricing" },
  { key: "configurations", label: "Configurations", one: true },
];
export const condLabel = (f: CondField) => COND_FIELDS.find((x) => x.key === f)!.label;
/** One condition — a field and its values (ids for customer, ship-to and
 *  product; names otherwise; "configured" · "unconfigured" · "both" for
 *  configurations). */
export interface Condition {
  field: CondField | "";
  values: string[];
}
export const blankCondition = (): Condition => ({ field: "", values: [] });
/** "All" picked for a condition — every value, now and later (Yash, 2026-11-18). */
export const ALL_VALUES = "*";
export const ALL_LABEL: Record<CondField, string> = {
  region: "All regions",
  market: "All markets",
  businessLine: "All business lines",
  los: "All LOS",
  customer: "All customers",
  shipto: "All ship-tos",
  product: "All products",
  category: "All product categories",
  rateType: "All rate types",
  applied: "Any applied pricing",
  configurations: "Both",
};

export const APPLIED: Record<ConfigRow["applied"], string> = { shipto: "Ship-to", customer: "Customer", hub: "Hub" };

/** What a price reads for a condition's field. */
export function fieldValue(f: CondField, r: ConfigRow, ents: EntityMap): string {
  if (f === "customer") return r.customerId;
  if (f === "shipto") return r.shiptoId;
  if (f === "product") return r.productId;
  if (f === "configurations") return r.configured ? "configured" : "unconfigured";
  if (f === "category") return categoryOf(productOf(r.productId).categoryId).name;
  if (f === "rateType") return ents.get(r.rateType)?.name ?? "";
  if (f === "applied") return APPLIED[r.applied];
  const facts = factsOfRow(r, ents);
  return f === "businessLine" ? facts.businessLine : f === "los" ? facts.los : f === "market" ? facts.market : facts.region;
}

/** A price meets a condition — an unfinished one (no field, no value) asks nothing. */
export function conditionHits(c: Condition, r: ConfigRow, ents: EntityMap) {
  if (!c.field || !c.values.length || c.values.includes(ALL_VALUES)) return true;
  if (c.field === "configurations") return whichHits(c.values[0] as Which, r);
  return c.values.includes(fieldValue(c.field, r, ents));
}

export interface RuleDef {
  name: string;
  source: Source;
  /** VERSION 2 — the IF as ordered conditions; when present it stands in
   *  for `where` and `targets`. */
  conditions?: Condition[];
  /** IF, AS GROUPS (Yash, 2026-11-19): the conditions in a group all hold
   *  (AND); any one group is enough (OR). When present it stands in for
   *  `conditions`. */
  groups?: Condition[][];
  where: WhereRow[];
  targets: TargetRow[];
  changes: ChangeRow[];
  exclude: TargetRow[];
}

export interface RunResult {
  rowId: string;
  outcome: "updated" | "unchanged" | "skipped" | "failed";
  reason?: string;
  /** For a price the run touched: how it stood, and what moved. */
  before?: ConfigRow;
  lines?: { label: string; before: string; after: string }[];
  priceBefore?: number | null;
  priceAfter?: number | null;
}
export interface Run {
  id: string;
  n: number;
  /** When it runs, or ran. */
  at: number;
  by: string;
  status: "scheduled" | "running" | "done";
  /** Prices it covers, and how many are through. */
  total: number;
  progress: number;
  results: RunResult[];
}

export interface Rule extends RuleDef {
  id: string;
  /** Planned day and time; `timeSet` false = run when created. */
  at: number;
  timeSet: boolean;
  createdBy: string;
  createdAt: number;
  runs: Run[];
}

export interface Template extends RuleDef {
  id: string;
  editedAt: number;
  editedBy: string;
}

export const blankWhere = (): WhereRow => ({ businessLines: [], los: [], region: "", markets: [] });
export const blankTarget = (): TargetRow => ({ customerId: "", shiptoIds: [], productIds: [], which: "configured" });
export const blankChange = (): ChangeRow => ({ setting: "", action: "set", entityIds: [], amount: "" });
export const blankDef = (): RuleDef => ({
  name: "",
  source: "first",
  where: [blankWhere()],
  targets: [blankTarget()],
  changes: [blankChange()],
  exclude: [],
});
export const blankDefV2 = (): RuleDef => ({ ...blankDef(), conditions: [blankCondition()] });
/** A version 1 definition read as version 2 conditions — a v1 template
 *  loaded into a v2 rule keeps what it says. */
export function toConditions(d: RuleDef): Condition[] {
  if (d.conditions) return d.conditions;
  const out: Condition[] = [];
  /* EVERY CONDITION ROW, MERGED — version 2 takes several values per condition. */
  const all = <K extends "businessLines" | "los" | "markets">(k: K) => uniq(d.where.flatMap((w) => w[k]));
  const regions = uniq(d.where.map((w) => w.region).filter(Boolean));
  if (regions.length) out.push({ field: "region", values: regions });
  if (all("markets").length) out.push({ field: "market", values: all("markets") });
  if (all("businessLines").length) out.push({ field: "businessLine", values: all("businessLines") });
  if (all("los").length) out.push({ field: "los", values: all("los") });
  const customers = d.targets.map((t) => t.customerId).filter(Boolean);
  if (customers.length) out.push({ field: "customer", values: customers });
  const shiptos = d.targets.flatMap((t) => t.shiptoIds);
  if (shiptos.length) out.push({ field: "shipto", values: shiptos });
  const products = uniq(d.targets.flatMap((t) => t.productIds));
  if (products.length) out.push({ field: "product", values: products });
  const which = d.targets.find((t) => t.which !== "configured")?.which;
  if (which) out.push({ field: "configurations", values: [which] });
  return out.length ? out : [blankCondition()];
}
export const defOf = (r: RuleDef): RuleDef => ({
  name: r.name,
  source: r.source,
  ...(r.conditions ? { conditions: r.conditions } : {}),
  ...(r.groups ? { groups: r.groups } : {}),
  where: r.where,
  targets: r.targets,
  changes: r.changes,
  exclude: r.exclude,
});

export const whereSet = (w: WhereRow) => w.businessLines.length + w.los.length + w.markets.length > 0 || !!w.region;
export const targetSet = (t: TargetRow) => !!t.customerId || t.shiptoIds.length > 0 || t.productIds.length > 0 || t.which !== "configured";

// --------------------------------------------------------------- matching --

const hit = (cell: string[], v: string) => cell.length === 0 || cell.includes(v);
const inTarget = (t: TargetRow, r: ConfigRow) =>
  (!t.customerId || t.customerId === r.customerId) && hit(t.shiptoIds, r.shiptoId) && hit(t.productIds, r.productId) && hit(t.assetIds ?? [], assetOf(r));
/** An Except row asks something — one left at "All" leaves nothing out. */
export const exceptSet = (t: TargetRow) => !!t.customerId || t.shiptoIds.length > 0 || t.productIds.length > 0 || (t.assetIds?.length ?? 0) > 0;

/** The IF as groups: AND inside a group, OR between groups. */
export const groupsOf = (d: RuleDef): Condition[][] => d.groups ?? [d.conditions ?? toConditions(d)];
/** The groups that ask something — a group with nothing picked adds nothing. */
const askingGroups = (d: RuleDef) => {
  const all = groupsOf(d);
  /* NOTHING ASKED, NOTHING MATCHED (Yash, 2026-11-19) — an empty set until a condition is picked. */
  return all.filter((g) => !groupEmpty(g));
};
/** A group asks about configurations — else it takes set-up prices only. */
const asksWhich = (g: Condition[]) => g.some((c) => c.field === "configurations" && c.values.length > 0);
/** A price meets a group: every condition in it holds. */
export const groupHits = (g: Condition[], r: ConfigRow, ents: EntityMap) => (asksWhich(g) || r.configured) && g.every((c) => conditionHits(c, r, ents));
/** A group that asks nothing yet — no field picked. */
export const groupEmpty = (g: Condition[]) => !g.some((c) => c.field && c.values.length);
/** Two groups ask the same — same fields, same values, any order. */
export const sameGroup = (a: Condition[], b: Condition[]) => {
  const key = (g: Condition[]) =>
    g
      .filter((c) => c.field && c.values.length)
      .map((c) => `${c.field}=${[...c.values].sort().join("|")}`)
      .sort()
      .join("&");
  return key(a) !== "" && key(a) === key(b);
};
const whichHits = (w: Which, r: ConfigRow) => w === "both" || (w === "configured") === r.configured;

/** IF: the pricing source, and any one of the condition rows. */
export function whereMatches(def: Pick<RuleDef, "where" | "source">, r: ConfigRow, ents: EntityMap) {
  const f = factsOfRow(r, ents);
  if (f.source !== def.source) return false;
  return def.where.some(
    (w) => hit(w.businessLines, f.businessLine) && hit(w.los, f.los) && (!w.region || w.region === f.region) && hit(w.markets, f.market)
  );
}

/** The prices a rule reaches: IF, AND a customer line (with its
 *  configurations), EXCEPT what is left out. An exclusion left at "All"
 *  leaves nothing out. */
export function matchRows(def: RuleDef, rows: ConfigRow[], ents: EntityMap): ConfigRow[] {
  if (def.groups || def.conditions) {
    /* IF THIS: the source, then ANY group whose conditions ALL hold; set-up
       prices only unless the group asks about configurations. Except after,
       across every group. */
    const exclude2 = def.exclude.filter(exceptSet);
    const groups = askingGroups(def);
    return rows.filter(
      (r) => factsOfRow(r, ents).source === def.source && groups.some((g) => groupHits(g, r, ents)) && !exclude2.some((t) => inTarget(t, r))
    );
  }
  const exclude = def.exclude.filter((t) => !!t.customerId || t.shiptoIds.length > 0 || t.productIds.length > 0);
  return rows.filter(
    (r) =>
      whereMatches(def, r, ents) &&
      (def.targets.length === 0 ? r.configured : def.targets.some((t) => inTarget(t, r) && whichHits(t.which, r))) &&
      !exclude.some((t) => inTarget(t, r))
  );
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/* A MARGIN SET BY A RULE is a typed value, not one of the setup's margins:
   kept on the row as "rule:0.22", read straight into the price. */
const DYN = "rule:";
export const dynMargin = (r: ConfigRow) => {
  const d = r.margins.find((m) => m.startsWith(DYN));
  return d === undefined ? null : Number(d.slice(DYN.length));
};
/** The row's price, $/gal, with a rule's typed margin. */
export const priceOf = (r: ConfigRow, ents: EntityMap) => effectivePrice(r, ents) + (dynMargin(r) ?? 0);

const LIST_KEY = { margin: "margins", fee: "fees", tax: "taxes", adder: "adders" } as const;

function applyChange(r: ConfigRow, c: ChangeRow): ConfigRow {
  const s = c.setting;
  if (!s) return r;
  if (s === "rateType") return { ...r, rateType: c.entityIds[0] };
  if (s === "base") {
    const a = num(c.amount);
    if (c.action === "set") return { ...r, base: a };
    if (c.action === "adjustAmount") return { ...r, base: round4(r.base + a) };
    return { ...r, base: round4(r.base * (1 + a / 100)) };
  }
  const key = LIST_KEY[s];
  const ids = r[key];
  if (s === "margin" && c.action === "set") return { ...r, margins: [`${DYN}${num(c.amount)}`] };
  if (c.action === "add") return { ...r, [key]: uniq([...ids, ...c.entityIds]) };
  if (c.action === "replace") return { ...r, [key]: [...c.entityIds] };
  return { ...r, [key]: ids.filter((id) => !c.entityIds.includes(id)) };
}

/** How one setting reads on a row. */
export function settingText(s: ChangeSetting, r: ConfigRow, ents: EntityMap): string {
  if (!r.configured) return "Not set";
  switch (s) {
    case "rateType":
      return ents.get(r.rateType)?.name ?? "—";
    case "base":
      return money(r.base);
    case "margin": {
      const dyn = dynMargin(r);
      return money((dyn ?? 0) + readSetting(r, "margin", ents).value);
    }
    default: {
      const v = readSetting(r, s, ents);
      /* THE TOTAL ONLY — which ones are in the row's breakdown. */
      return v.ids.length ? money(v.value) : "None";
    }
  }
}

export interface Preview {
  row: ConfigRow;
  outcome: "updated" | "unchanged" | "skipped";
  reason?: string;
  /** Each setting the rule changes, before → after. */
  lines: { label: string; before: string; after: string }[];
  /** The price on the row, before → after. */
  priceBefore: number | null;
  priceAfter: number | null;
  next: ConfigRow;
}

/** What one rule does to one price. */
export function previewRow(def: RuleDef, r: ConfigRow, ents: EntityMap, adjusted?: Set<string>): Preview {
  const changes = def.changes.filter(changeReady);
  const price = r.configured ? priceOf(r, ents) : null;
  const base = { row: r, priceBefore: price, priceAfter: price, next: r, lines: [] as Preview["lines"] };
  if (!changes.length) return { ...base, outcome: "skipped", reason: "No change set" };
  /* AN ADJUSTMENT LANDS ONCE — running the rule again does not add +2% on
     top of +2% where an earlier run already did it. */
  if (adjusted?.has(r.id) && changes.some((c) => c.action === "adjustAmount" || c.action === "adjustPercent"))
    return { ...base, outcome: "unchanged", reason: "Already adjusted by this rule" };
  /* CREATING A PRICE takes a rate type and a base price. */
  if (!r.configured) {
    const has = (s: ChangeSetting) => changes.some((c) => c.setting === s && (s !== "base" || c.action === "set"));
    if (!has("rateType") || !has("base")) return { ...base, outcome: "skipped", reason: "Needs a rate type and base price to create" };
  }
  let next: ConfigRow = { ...r, configured: true };
  for (const c of changes) next = applyChange(next, c);
  if (next.base < 0) return { ...base, outcome: "skipped", reason: "Base price would fall below zero" };
  const lines = uniq(changes.map((c) => c.setting as ChangeSetting)).map((s) => ({
    label: settingLabel(s),
    before: settingText(s, r, ents),
    after: settingText(s, next, ents),
  }));
  const priceAfter = priceOf(next, ents);
  const same = lines.every((l) => l.before === l.after) && priceAfter === price;
  return same ? { ...base, outcome: "unchanged", reason: "Already at this price", lines } : { ...base, next, outcome: "updated", lines, priceAfter };
}

/** The prices a rule's runs have already updated. */
export const adjustedBy = (r: { runs?: Run[] }) => new Set((r.runs ?? []).flatMap((x) => x.results.filter((y) => y.outcome === "updated").map((y) => y.rowId)));

/** ONE GROUP'S SHARE (Yash, 2026-11-19) — what it matches on its own, what
 *  it adds that no group above it has, and what it would update. */
export interface GroupImpact {
  matched: number;
  customers: number;
  shiptos: number;
  update: number;
  /** Matched here and in an earlier group — counted once overall. */
  shared: number;
  /** The same conditions as an earlier group (its number, 1-based). */
  sameAs: number | null;
  /** Every price it matches is already in other groups. */
  addsNothing: boolean;
  empty: boolean;
  /** Something is picked in it. */
  asked: boolean;
  /** Matched by this combination alone. */
  unique: number;
  /** Also matched by another — how many, with each other one (1-based). */
  repeated: number;
  repeatedWith: { with: number; n: number }[];
}

/** WHICH COMBINATIONS MATCHED A RECORD, as the records list reads it:
 *  "Combination 1", or "Combinations 1, 2" (Yash, 2026-11-19). */
export const comboLabel = (ks: number[]) => (ks.length === 1 ? `Combination ${ks[0]}` : `Combinations ${ks.join(", ")}`);

export function previewRule(def: RuleDef, rows: ConfigRow[], ents: EntityMap, adjusted?: Set<string>) {
  const matched = matchRows(def, rows, ents);
  const list = matched.map((r) => previewRow(def, r, ents, adjusted));
  const updated = list.filter((p) => p.outcome === "updated");
  const willUpdate = new Set(updated.map((p) => p.row.id));
  const kept = new Set(matched.map((r) => r.id));
  const groups = groupsOf(def);
  const asking = groups.some((g) => !groupEmpty(g));
  const sets = groups.map((g) => (asking && groupEmpty(g) ? [] : matched.filter((r) => groupHits(g, r, ents))));
  const groupImpacts: GroupImpact[] = groups.map((g, i) => {
    const mine = sets[i];
    const elsewhere = new Set(sets.filter((_, k) => k !== i).flatMap((s) => s.map((r) => r.id)));
    const earlier = new Set(sets.slice(0, i).flatMap((s) => s.map((r) => r.id)));
    const same = groups.slice(0, i).findIndex((h) => sameGroup(h, g));
    return {
      matched: mine.length,
      customers: uniq(mine.map((r) => r.customerId)).length,
      shiptos: uniq(mine.map((r) => r.shiptoId)).length,
      update: mine.filter((r) => willUpdate.has(r.id)).length,
      shared: mine.filter((r) => earlier.has(r.id)).length,
      sameAs: same >= 0 ? same + 1 : null,
      /* A copy is flagged as the copy (sameAs) — neither half also says "adds nothing". */
      addsNothing: !groupEmpty(g) && groups.length > 1 && mine.length > 0 && mine.every((r) => elsewhere.has(r.id)) && !groups.some((h, k) => k !== i && sameGroup(h, g)),
      empty: !groupEmpty(g) && mine.length === 0,
      asked: !groupEmpty(g),
      unique: mine.filter((r) => !elsewhere.has(r.id)).length,
      repeated: mine.filter((r) => elsewhere.has(r.id)).length,
      repeatedWith: sets
        .map((st, k) => ({ with: k + 1, n: k === i ? 0 : mine.filter((r) => st.includes(r)).length }))
        .filter((x) => x.n > 0),
    };
  });
  const askedSets = sets.filter((_, k) => !groupEmpty(groups[k]));
  /* EACH RECORD'S COMBINATIONS — and the outcomes split by them. */
  const combos: Record<string, number[]> = {};
  sets.forEach((st, k) => st.forEach((r) => (combos[r.id] = [...(combos[r.id] ?? []), k + 1])));
  const splitOf = (ids: string[]) => {
    const by = new Map<string, number>();
    ids.forEach((id) => {
      const l = comboLabel(combos[id] ?? []);
      by.set(l, (by.get(l) ?? 0) + 1);
    });
    return [...by].map(([label, n]) => ({ label, n })).sort((a, b) => a.label.localeCompare(b.label));
  };
  const inMany = matched.filter((r) => askedSets.filter((s) => s.includes(r)).length > 1).length;
  /* WHY NOT CHANGING, IN WORDS — and how many each. */
  const reasons = uniq(list.filter((p) => p.outcome !== "updated").map((p) => p.reason ?? "Not changing")).map((reason) => ({
    reason,
    n: list.filter((p) => p.outcome !== "updated" && (p.reason ?? "Not changing") === reason).length,
  }));
  void kept;
  return {
    groups: groupImpacts,
    combos,
    split: { update: splitOf(updated.map((p) => p.row.id)), skip: splitOf(list.filter((p) => p.outcome !== "updated").map((p) => p.row.id)) },
    inMany,
    reasons,
    /* THE HIERARCHY — each customer, its ship-tos, its prices matched and to update. */
    byCustomer: uniq(matched.map((r) => r.customerId)).map((customerId) => {
      const mine = matched.filter((r) => r.customerId === customerId);
      return {
        customerId,
        shiptos: uniq(mine.map((r) => r.shiptoId)).length,
        matched: mine.length,
        update: mine.filter((r) => willUpdate.has(r.id)).length,
        /* WHICH GROUPS REACH THIS CUSTOMER (1-based) — the card says it beside the name. */
        groups: sets.map((st, k) => (st.some((r) => r.customerId === customerId) ? k + 1 : 0)).filter(Boolean),
      };
    }),
    list,
    matched: matched.length,
    updated,
    /* NOT CHANGING — skipped, and already at this price — with why. */
    skipped: list.filter((p) => p.outcome !== "updated"),
    customers: uniq(updated.map((p) => p.row.customerId)),
    shiptos: uniq(updated.map((p) => p.row.shiptoId)),
    products: uniq(updated.map((p) => p.row.productId)),
    /* SET-UP PRICES A SET, REPLACE OR REMOVE OVERWRITES — said with the review. */
    overwrites: updated.filter((p) => p.row.configured && def.changes.some((c) => changeReady(c) && (c.action === "set" || c.action === "replace" || c.action === "remove"))).length,
  };
}

/* ONE PRICE IN THIRTY FAILS on a first try, for a reason a person can act on;
   a later run of the same rule mostly gets them through. */
const FAIL_REASONS = ["Rate type not posted at this market today", "Price locked by an open order", "Ship-to on credit hold"];
function failureOf(ruleId: string, runN: number, rowId: string) {
  const h = hash(`fail${ruleId}${rowId}`);
  if (h > 0.035) return null;
  if (runN > 1 && hash(`retry${ruleId}${rowId}${runN}`) > 0.2) return null;
  return FAIL_REASONS[Math.floor(hash(`why${rowId.split("~")[0]}`) * FAIL_REASONS.length)];
}

// ----------------------------------------------------------------- store --

interface State {
  /** Which iteration of the create form the list opens (Yash, 2026-11-18). */
  version: 1 | 2;
  rules: Rule[];
  templates: Template[];
  /** What runs have set, by configuration row. */
  overlay: Record<string, ConfigRow>;
  seeded: boolean;
}

let state: State = { version: 2, rules: [], templates: [], overlay: {}, seeded: false };
export const setVersion = (version: 1 | 2) => set({ version });
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const withOverlay = (rows: ConfigRow[], overlay: Record<string, ConfigRow>) => rows.map((r) => overlay[r.id] ?? r);

let seq = 100;
const newId = (p: string) => `${p}-${++seq}`;

/** Run a rule now: the results are worked out at once, the progress plays out. */
function startRun(rule: Rule, rows: ConfigRow[], ents: EntityMap, at: number): { run: Run; overlay: Record<string, ConfigRow> } {
  const n = rule.runs.length + 1;
  const p = previewRule(rule, withOverlay(rows, state.overlay), ents, adjustedBy(rule));
  const overlay: Record<string, ConfigRow> = {};
  const results: RunResult[] = p.list.map((x) => {
    if (x.outcome !== "updated") return { rowId: x.row.id, outcome: x.outcome, reason: x.reason };
    const why = failureOf(rule.id, n, x.row.id);
    if (why) return { rowId: x.row.id, outcome: "failed", reason: why };
    overlay[x.row.id] = x.next;
    return { rowId: x.row.id, outcome: "updated", before: x.row, lines: x.lines, priceBefore: x.priceBefore, priceAfter: x.priceAfter };
  });
  return { run: { id: newId("run"), n, at, by: CURRENT_USER, status: "running", total: results.length, progress: 0, results }, overlay };
}

/* THE PROGRESS PLAYS OUT over a few seconds — an eighth of the prices a beat. */
const timers = new Map<string, number>();
function play(ruleId: string, runId: string) {
  if (timers.has(runId)) return;
  const tick = () => {
    const rule = state.rules.find((r) => r.id === ruleId);
    const run = rule?.runs.find((x) => x.id === runId);
    if (!rule || !run) return void timers.delete(runId);
    const step = Math.max(1, Math.ceil(run.total / 8));
    const progress = Math.min(run.total, run.progress + step);
    const done = progress >= run.total;
    updateRun(ruleId, runId, { progress, status: done ? "done" : "running" });
    if (done) {
      timers.delete(runId);
      onRunDone?.(rule, { ...run, progress, status: "done" });
    } else timers.set(runId, window.setTimeout(tick, 450));
  };
  timers.set(runId, window.setTimeout(tick, 450));
}
let onRunDone: ((rule: Rule, run: Run) => void) | null = null;
/** The list's toast when a run finishes, wherever the reader is. */
export const setRunDoneHandler = (fn: typeof onRunDone) => {
  onRunDone = fn;
};

function updateRun(ruleId: string, runId: string, patch: Partial<Run>) {
  set({
    rules: state.rules.map((r) => (r.id === ruleId ? { ...r, runs: r.runs.map((x) => (x.id === runId ? { ...x, ...patch } : x)) } : r)),
  });
}

/** Create a rule. Today with no time set runs now; a later moment waits. */
export function createRule(def: RuleDef, at: number, timeSet: boolean, rows: ConfigRow[], ents: EntityMap): Rule {
  const rule: Rule = { ...def, id: newId("rule"), at, timeSet, createdBy: CURRENT_USER, createdAt: NOW, runs: [] };
  if (at > NOW) {
    rule.runs = [{ id: newId("run"), n: 1, at, by: CURRENT_USER, status: "scheduled", total: 0, progress: 0, results: [] }];
    set({ rules: [rule, ...state.rules] });
    return rule;
  }
  const { run, overlay } = startRun(rule, rows, ents, NOW);
  rule.runs = [run];
  set({ rules: [rule, ...state.rules], overlay: { ...state.overlay, ...overlay } });
  play(rule.id, run.id);
  return rule;
}

/** Run again: matches everything afresh — new ship-tos come in, failed prices
 *  are tried again, prices already right read unchanged. A scheduled run
 *  that has not happened runs now instead. */
export function runAgain(ruleId: string, rows: ConfigRow[], ents: EntityMap) {
  const rule = state.rules.find((r) => r.id === ruleId);
  if (!rule) return;
  const kept = rule.runs.filter((x) => x.status !== "scheduled");
  const { run, overlay } = startRun({ ...rule, runs: kept }, rows, ents, NOW);
  set({
    rules: state.rules.map((r) => (r.id === ruleId ? { ...r, runs: [...kept, run] } : r)),
    overlay: { ...state.overlay, ...overlay },
  });
  play(ruleId, run.id);
}

/** An edit to a rule — it applies from the next run; past runs keep theirs. */
export function updateRule(id: string, patch: Partial<Rule>) {
  set({ rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

export function createTemplate(def: RuleDef): Template {
  const t: Template = { ...defOf(def), id: newId("tpl"), editedAt: NOW, editedBy: CURRENT_USER };
  set({ templates: [t, ...state.templates] });
  return t;
}
export function updateTemplate(id: string, def: RuleDef) {
  set({ templates: state.templates.map((t) => (t.id === id ? { ...t, ...defOf(def), editedAt: NOW, editedBy: CURRENT_USER } : t)) });
}

// ------------------------------------------------------------------ seed --

const ch = (setting: ChangeSetting, action: ChangeAction, value: string | string[]): ChangeRow => ({
  setting,
  action,
  entityIds: Array.isArray(value) ? value : [],
  amount: Array.isArray(value) ? "" : value,
});
const def = (p: Partial<RuleDef> & { name: string; changes: ChangeRow[] }): RuleDef => ({ ...blankDef(), ...p });
const cust = (...ids: string[]): TargetRow[] => ids.map((customerId) => ({ ...blankTarget(), customerId }));
const DIESEL = ["dct", "ddt", "dcb", "ddb", "ulsd"];

const TPL: RuleDef[] = [
  def({
    name: "Missing diesel base",
    where: [{ ...blankWhere(), region: "Upper Texas Coast", markets: ["Houston"] }],
    targets: [{ ...blankTarget(), productIds: DIESEL, which: "unconfigured" }],
    changes: [ch("rateType", "set", ["r-opis-rack-avg"]), ch("base", "set", "2.85"), ch("margin", "add", ["m-standard-rack-margin"])],
  }),
  def({ name: "Contractor margin", targets: cust("onsite", "bayou"), changes: [ch("margin", "set", "0.22")] }),
  def({ name: "Propane delivery fee", where: [{ ...blankWhere(), los: ["Propane"] }], changes: [ch("fee", "add", ["f-delivery-fee"])] }),
  def({ name: "Base increase 2%", changes: [ch("base", "adjustPercent", "2")] }),
];

const RULES: (RuleDef & { daysAgo: number; runs: number; future?: number })[] = [
  { ...TPL[0], name: "Houston missing diesel base", daysAgo: 6, runs: 1 },
  { ...TPL[1], name: "Contractor margin to $0.22", targets: cust("onsite", "bayou", "redriver"), daysAgo: 4, runs: 1 },
  { ...TPL[2], daysAgo: 0, runs: 0, future: 2 },
  {
    ...TPL[3],
    name: "Gulf base +2%",
    where: [{ ...blankWhere(), markets: ["Mobile", "Beaumont"] }],
    exclude: [{ ...blankTarget(), customerId: "coastal", productIds: ["u87"] }],
    daysAgo: 9,
    runs: 2,
  },
  {
    ...def({
      name: "Tank wagon surcharge and margin",
      where: [{ ...blankWhere(), businessLines: ["Fuel"], los: ["Tank Wagon"], region: "Louisiana" }],
      changes: [ch("fee", "add", ["f-fuel-surcharge"]), ch("margin", "set", "0.19")],
    }),
    daysAgo: 2,
    runs: 1,
  },
  { ...def({ name: "Permian base +$0.03", targets: cust("permian", "mustang"), changes: [ch("base", "adjustAmount", "0.03")] }), daysAgo: 1, runs: 1 },
];

function seed(rows: ConfigRow[], ents: EntityMap) {
  state = {
    ...state,
    seeded: true,
    templates: TPL.map((d, i) => ({ ...d, id: `tpl-${i + 1}`, editedAt: NOW - (i + 3) * DAY, editedBy: ["Yash J", "Deepika Jain", "Ankit Rao", "Yash J"][i] })),
  };
  const out: Rule[] = [];
  RULES.forEach((d, i) => {
    const { daysAgo, runs, future, ...rest } = d;
    const at = future ? startOfDay(NOW + future * DAY) + 6 * 3_600_000 : NOW - daysAgo * DAY - 3 * 3_600_000;
    let rule: Rule = { ...rest, id: `rule-${i + 1}`, at, timeSet: !!future, createdBy: i % 2 ? "Deepika Jain" : "Yash J", createdAt: at - DAY, runs: [] };
    if (future) rule.runs = [{ id: `run-${i}-1`, n: 1, at, by: rule.createdBy, status: "scheduled", total: 0, progress: 0, results: [] }];
    for (let k = 0; k < runs; k++) {
      const { run, overlay } = startRun(rule, rows, ents, at + k * 2 * DAY);
      rule = { ...rule, runs: [...rule.runs, { ...run, by: rule.createdBy, status: "done", progress: run.total }] };
      state = { ...state, overlay: { ...state.overlay, ...overlay } };
    }
    out.unshift(rule);
  });
  state = { ...state, rules: out.sort((a, b) => b.createdAt - a.createdAt) };
}
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Bulk rules and templates, with the configuration as runs have left it. */
export function useBulkRules() {
  const log = useChangeLog();
  if (!state.seeded) seed(log.rows, log.entityMap);
  const s = React.useSyncExternalStore(subscribe, () => state);
  const rows = React.useMemo(() => withOverlay(log.rows, s.overlay), [log.rows, s.overlay]);
  return { version: s.version, rules: s.rules, templates: s.templates, rows, entityMap: log.entityMap, entities: log.entities };
}

// ------------------------------------------------------------------ reads --

export const lastRun = (r: Rule) => r.runs[r.runs.length - 1] ?? null;
export const countOf = (run: Run, o: RunResult["outcome"]) => run.results.filter((x) => x.outcome === o).length;

/** "Scheduled" · "Running" · "Done" · "Partly failed". */
export function ruleStatus(r: Rule): "Scheduled" | "Running" | "Done" | "Partly failed" {
  const run = lastRun(r);
  if (!run || run.status === "scheduled") return "Scheduled";
  if (run.status === "running") return "Running";
  return countOf(run, "failed") ? "Partly failed" : "Done";
}

/** One change as it reads: "Margin $0.2200", "Base price +2%". */
export function changeText(c: ChangeRow, ents: EntityMap) {
  if (!c.setting || !changeReady(c)) return "";
  const v = changeValue(c, ents);
  /* A LIST CHANGE LEADS WITH ITS VERB — "Add Delivery Fee", "Fees: replace
     with …" — a value change with its setting: "Margin $0.2200". */
  if (c.action === "add" || c.action === "remove") return v.charAt(0).toUpperCase() + v.slice(1);
  if (c.action === "replace") return `${settingLabel(c.setting)}: ${v}`;
  return `${settingLabel(c.setting)} ${v}`;
}

/** A change's value, without its setting's name. */
export function changeValue(c: ChangeRow, ents: EntityMap) {
  const names = c.entityIds.map((id) => ents.get(id)?.name ?? id);
  const list = names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
  const a = num(c.amount);
  switch (c.action) {
    case "set":
      return c.setting === "rateType" ? list : money(a);
    case "adjustAmount":
      return `${a >= 0 ? "+" : "−"}${money(Math.abs(a))}`;
    case "adjustPercent":
      return `${a >= 0 ? "+" : ""}${a}%`;
    case "add":
      return `add ${list}`;
    case "replace":
      return `replace with ${list}`;
    case "remove":
      return `remove ${list}`;
  }
}

/** What a definition changes: the settings, and the values. */
export function changesText(d: RuleDef, ents: EntityMap) {
  const ready = d.changes.filter(changeReady);
  const first = ready[0];
  return {
    settings: ready.length ? uniq(ready.map((c) => settingLabel(c.setting as ChangeSetting))).join(" · ") : "—",
    values: !first ? "—" : ready.length === 1 ? changeText(first, ents) : `${changeText(first, ents)} +${ready.length - 1}`,
    all: ready.map((c) => changeText(c, ents)).join(" · ") || "—",
  };
}

/** The IF rows, in a few words: "Fuel · Tank Wagon · Louisiana". */
export function whereText(d: RuleDef) {
  const rows = d.where.filter(whereSet);
  if (!rows.length) return "Any record";
  const one = (w: WhereRow) => [...w.businessLines, ...w.los, ...(w.region ? [w.region] : []), ...w.markets].join(" · ");
  return rows.length === 1 ? one(rows[0]) : `${one(rows[0])} +${rows.length - 1} more`;
}

/** Where a definition applies, in a few words. */
export function scopeText(d: RuleDef) {
  if (d.conditions) {
    const set = d.conditions.filter((c) => c.field && c.values.length && !c.values.includes(ALL_VALUES));
    if (!set.length) return "All prices";
    const one = (c: Condition) =>
      c.field === "customer" ? customerOf(c.values[0]).name : c.field === "shipto" ? shiptoOf(c.values[0]).name : c.field === "product" ? productOf(c.values[0]).name : c.values[0];
    const first = set[0];
    const head = first.values.length === 1 ? one(first) : `${plural(first.values.length, condLabel(first.field as CondField).toLowerCase())}`;
    return set.length === 1 ? head : `${head} +${set.length - 1}`;
  }
  const parts: string[] = [];
  const targets = d.targets.filter((t) => t.customerId);
  if (targets.length) parts.push(targets.length === 1 ? customerOf(targets[0].customerId).name : plural(targets.length, "customer"));
  const vals = uniq(d.where.flatMap((w) => [...w.businessLines, ...w.los, ...(w.region ? [w.region] : []), ...w.markets]));
  if (vals.length) parts.push(vals.length === 1 ? vals[0] : `${vals[0]} +${vals.length - 1}`);
  if (d.targets.some((t) => t.which === "unconfigured")) parts.push("Unconfigured");
  return parts.length ? parts.join(" · ") : "All prices";
}

export const shiptoName = (id: string) => shiptoOf(id).name;
