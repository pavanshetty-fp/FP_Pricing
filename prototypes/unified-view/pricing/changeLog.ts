// Change History (the `audit` variant): the pricing audit log.
//
// One record shape for every way pricing changes. A record is one submit — an
// inline edit, a bulk change, an entity edit in Pricing Setup, an import — and
// it can carry several edits at once (say, margin added and market set on the
// same rows), each with the rows it was aimed at. Under it, one impact line per
// ShipTo × product × setting it moved, with the value before and after, saved
// at the moment of the change.
//
// The seed is a simulation, not a list: ~120 days of changes are generated and
// applied, in order, to the starting configuration, so every line's "before"
// is what the row really held at the time and today's Configuration is the
// result of the whole log. Scheduled and canceled changes are not applied;
// their lines are a projection against current pricing.
//
// Customers, ShipTos and products are the Price Notices seed (12 customers,
// ~260 ShipTos, 24 products), so the log runs at the scale a tenant has.
import { CUSTOMERS, PRODUCTS, SHIPTOS, customerOf, productOf, shiptoOf, stateOf } from "./seed";

export { customerOf, productOf, shiptoOf };

/** The prototype's clock — 10:40 AM today, so the date picker's Today and
 *  the log agree (was fixed at 13 Nov 2026 in the old prototype). */
export const NOW = (() => {
  const d = new Date();
  d.setHours(10, 40, 0, 0);
  return d.getTime();
})();
export const DAY = 86_400_000;
export const CURRENT_USER = "Yash J";
const USERS = ["Yash J", "Priya Nair", "Cody McLelland", "Valarie Rogers", "Marcus Hale", "Deepika Jain", "Ankit Rao"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
const pick = <T,>(xs: readonly T[], seed: string) => xs[Math.floor(hash(seed) * xs.length)];

// ----------------------------------------------------------------- entities --

export type Setting = "margin" | "fee" | "tax" | "rateType" | "market" | "adder";
export const SETTINGS: Setting[] = ["margin", "fee", "tax", "rateType", "market", "adder"];
export const SETTING_LABEL: Record<Setting, string> = {
  margin: "Margin",
  fee: "Fees",
  tax: "Tax",
  rateType: "Rate type",
  market: "Market",
  adder: "Adders",
};
/** Settings priced per gallon carry a value; rate type and market are names. */
export const HAS_VALUE: Record<Setting, boolean> = { margin: true, fee: true, tax: true, rateType: false, market: false, adder: true };
/** Settings a row holds several of. */
export const IS_LIST: Record<Setting, boolean> = { margin: true, fee: true, tax: true, rateType: false, market: false, adder: true };
const ROW_KEY = { margin: "margins", fee: "fees", tax: "taxes", adder: "adders" } as const;

export interface Entity {
  id: string;
  setting: Setting;
  name: string;
  /** $/gal, for margin, fee, tax and adder. */
  value?: number;
  desc?: string;
  /** A margin created from a typed value, named by it. */
  dynamic?: boolean;
}

const MARGIN_SEED: [string, number, string][] = [
  ["Standard Rack Margin", 0.15, "Default margin for rack-priced accounts"],
  ["Fleet Contract Margin", 0.18, "Contracted fleet accounts on the Gulf Coast"],
  ["Ag Co-op Margin", 0.12, "Agricultural co-operative members"],
  ["Oilfield Account Margin", 0.22, "Well-service and frac accounts in the Permian"],
  ["Marine Bunker Margin", 0.26, "Dockside and offshore marine deliveries"],
  ["Contractor Margin", 0.16, "Construction and aggregates contractors"],
  ["Municipal Bid Margin", 0.1, "Awarded city and county bids"],
  ["Freight Recovery Margin", 0.03, "Recovers freight on remote drops"],
  ["Winter Fleet Margin", 0.21, "Seasonal fleet accounts, Nov–Feb"],
];
const FEE_SEED: [string, number, string][] = [
  ["Environmental Fee", 0.02, "State environmental recovery"],
  ["Delivery Fee", 0.05, "Per-gallon delivery charge"],
  ["Small Drop Fee", 0.08, "Drops under 500 gallons"],
  ["Inspection Fee", 0.01, "Tank inspection recovery"],
  ["Fuel Surcharge", 0.03, "Carrier fuel surcharge"],
  ["Weekend Delivery Fee", 0.04, "Saturday and Sunday drops"],
];
const TAX_SEED: [string, number, string][] = [
  ["Federal Excise", 0.244, "Federal excise tax"],
  ["LA State Excise", 0.2, "Louisiana state excise"],
  ["TX State Excise", 0.2, "Texas state excise"],
  ["MS State Excise", 0.18, "Mississippi state excise"],
  ["NM State Excise", 0.21, "New Mexico state excise"],
  ["AL State Excise", 0.29, "Alabama state excise"],
  ["LUST Fee", 0.001, "Leaking underground storage tank fee"],
  ["LA Parish Sales Tax", 0.03, "Parish sales tax, Louisiana"],
];
const ADDER_SEED: [string, number, string][] = [
  ["Hurricane Season Surcharge", 0.04, "Gulf Coast storm-season supply cost"],
  ["Winter Blend Adder", 0.025, "Winterized diesel premium"],
  ["River Access Adder", 0.02, "Barge and river-access drops"],
];
const RATE_TYPES = ["OPIS Rack Avg", "OPIS Rack Low", "OPIS Rack High", "Contract Rack", "Spot"];
const MARKETS = ["Houston", "Lake Charles", "Baton Rouge", "Shreveport", "Midland", "Austin", "Greenville", "Mobile", "Beaumont"];

const RATE_DESC: Record<string, string> = {
  "OPIS Rack Avg": "Average of the day's OPIS rack postings",
  "OPIS Rack Low": "Lowest OPIS rack posting of the day",
  "OPIS Rack High": "Highest OPIS rack posting of the day",
  "Contract Rack": "Supplier contract rack price",
  Spot: "Spot market price at lifting",
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const ent = (setting: Setting, prefix: string) => ([name, value, desc]: [string, number, string]): Entity =>
  ({ id: `${prefix}-${slug(name)}`, setting, name, value, desc });

export const ENTITIES: Entity[] = [
  ...MARGIN_SEED.map(ent("margin", "m")),
  ...FEE_SEED.map(ent("fee", "f")),
  ...TAX_SEED.map(ent("tax", "t")),
  ...ADDER_SEED.map(ent("adder", "a")),
  ...RATE_TYPES.map((name): Entity => ({ id: `r-${slug(name)}`, setting: "rateType", name, desc: RATE_DESC[name] })),
  ...MARKETS.map((name): Entity => ({ id: `k-${slug(name)}`, setting: "market", name, desc: `Rack prices posted at ${name} terminals` })),
];

export const money = (n: number, dp = 4) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(dp)}`;
export const cents = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n) * 1000) / 10}¢`;
/** "$0.40": a dynamic margin's name is its value, at the precision typed. */
export const dynamicName = (v: number) => {
  const s = String(Number(v.toFixed(4)));
  return `$${Number(s).toFixed(Math.max(2, (s.split(".")[1] ?? "").length))}`;
};

// ---------------------------------------------------------- configuration --

export type AppliedFrom = "shipto" | "customer" | "hub";

export interface ConfigRow {
  id: string;
  customerId: string;
  shiptoId: string;
  productId: string;
  rateType: string;
  market: string;
  margins: string[];
  fees: string[];
  taxes: string[];
  adders: string[];
  /** $/gal off, configured on the record — not part of bulk changes. */
  discount: number;
  applied: AppliedFrom;
  /** No pricing set up yet — the row waits to be configured. */
  configured: boolean;
  /** Base price today, $/gal. */
  base: number;
}

const MARKET_BY_STATE: Record<string, string[]> = {
  LA: ["k-lake-charles", "k-baton-rouge", "k-shreveport"],
  TX: ["k-houston", "k-midland", "k-austin", "k-beaumont"],
  MS: ["k-greenville"],
  NM: ["k-midland"],
  AL: ["k-mobile"],
};
const CUSTOMER_MARGIN: Record<string, string> = {
  onsite: "m-contractor-margin",
  adamas: "m-oilfield-account-margin",
  mustang: "m-oilfield-account-margin",
  gulf: "m-fleet-contract-margin",
  bayou: "m-contractor-margin",
  lonestar: "m-standard-rack-margin",
  pelican: "m-marine-bunker-margin",
  redriver: "m-contractor-margin",
  "delta-ag": "m-ag-co-op-margin",
  permian: "m-oilfield-account-margin",
  coastal: "m-municipal-bid-margin",
  natchez: "m-standard-rack-margin",
};

/** The first two ShipTos on Configuration (OnSite): every case lands on them. */
const DEMO_SHIPTOS = SHIPTOS.filter((st) => st.customerId === "onsite").slice(0, 2).map((st) => st.id);

function seedRows(): ConfigRow[] {
  return SHIPTOS.flatMap((s) => {
    const n = 2 + Math.floor(hash(`n${s.id}`) * 3);
    const start = Math.floor(hash(`p${s.id}`) * PRODUCTS.length);
    const st = stateOf(s);
    return Array.from({ length: n }, (_, i): ConfigRow => {
      const p = PRODUCTS[(start + i * 5) % PRODUCTS.length];
      const id = `${s.id}~${p.id}`;
      const margin = CUSTOMER_MARGIN[s.customerId] ?? "m-standard-rack-margin";
      return {
        id,
        customerId: s.customerId,
        shiptoId: s.id,
        productId: p.id,
        rateType: `r-${slug(pick(RATE_TYPES.slice(0, 4), `rt${id}`))}`,
        market: pick(MARKET_BY_STATE[st] ?? ["k-houston"], `mk${s.id}`),
        margins: hash(`fr${s.id}`) > 0.78 ? [margin, "m-freight-recovery-margin"] : [margin],
        fees: hash(`fd${id}`) > 0.55 ? ["f-environmental-fee", "f-delivery-fee"] : ["f-environmental-fee"],
        taxes: ["t-federal-excise", `t-${st.toLowerCase()}-state-excise`].filter((t) => TAX_SEED.some(([nm]) => `t-${slug(nm)}` === t)),
        adders: s.customerId === "gulf" || s.customerId === "pelican" ? ["a-hurricane-season-surcharge"] : [],
        discount: hash(`dc${s.customerId}`) > 0.6 ? 0.01 : 0,
        // Most ShipTos inherit their customer's pricing; some carry their own; a few price from a hub.
        // Natchez prices every ShipTo on its own (its customer record isn't set up).
        applied: s.customerId === "natchez" ? "shipto" : hash(`ap${s.id}`) > 0.9 ? "hub" : hash(`ap${s.id}`) > 0.6 ? "shipto" : "customer",
        // A few rows are new and not priced yet — never the demo ShipTos.
        configured: DEMO_SHIPTOS.includes(s.id) || hash(`uc${id}`) < 0.95,
        base: 2.4 + Math.round(hash(`b${id}`) * 1100) / 1000,
      };
    });
  });
}

// ------------------------------------------------------------------ changes --

export type Operation = "add" | "replace" | "set" | "remove" | "edit" | "create";
export const OPERATION_LABEL: Record<Operation, string> = {
  add: "Add",
  replace: "Replace",
  set: "Set",
  remove: "Remove",
  edit: "Edit value",
  create: "Create",
};

/** What happened, read at a glance — the Action column. */
export type Action = "Configured" | "Reset" | "Added" | "Removed" | "Replaced" | "Changed" | "Value changed" | "Created" | "Multiple";
export const ACTIONS: Action[] = ["Configured", "Reset", "Added", "Removed", "Replaced", "Changed", "Value changed", "Created", "Multiple"];
const OP_ACTION: Record<Operation, Action> = {
  add: "Added",
  remove: "Removed",
  replace: "Replaced",
  set: "Changed",
  edit: "Value changed",
  create: "Created",
};
export const editAction = (e: { operation: Operation }) => OP_ACTION[e.operation];
export function recordAction(c: { edits: { operation: Operation }[]; undoOf?: string; configures?: boolean; resets?: boolean }): Action {
  if (c.configures) return "Configured";
  if (c.resets) return "Reset";
  const a = [...new Set(c.edits.map(editAction))];
  return a.length === 1 ? a[0] : "Multiple";
}
/** One line's action: for a list, did things come off, go on, or both. */
export function lineAction(l: ImpactLine): Action {
  if (!IS_LIST[l.setting]) return "Changed";
  if (l.before.includes(" · ")) return "Value changed";
  const off = l.beforeIds.some((id) => !l.afterIds.includes(id));
  const on = l.afterIds.some((id) => !l.beforeIds.includes(id));
  return off && on ? "Replaced" : on ? "Added" : "Removed";
}

/** One edit: what it does, to which rows. A submit carries one or more. */
export interface Edit {
  setting: Setting;
  operation: Operation;
  entityIds: string[];
  /** Edit: the entity's new value. */
  amount?: number;
  rowIds: string[];
  /** Made from Customer Pricing (inherited by these rows), not on the rows. */
  via?: "customer";
  /** Sets up pricing on unconfigured rows. */
  configure?: boolean;
  /** Puts a ShipTo row back on its customer's pricing. */
  reset?: boolean;
}

/** Where the change was made. */
export type Source = "shiptoInline" | "shiptoBulk" | "customer" | "setup" | "import";
export const SOURCE_LABEL: Record<Source, string> = {
  shiptoInline: "Ship-to pricing · Inline",
  shiptoBulk: "Ship-to pricing · Bulk",
  customer: "Customer pricing",
  setup: "Pricing setup",
  import: "Import",
};

export type ChangeStatus = "applied" | "partlyFailed" | "scheduled" | "canceled" | "undone";
export const STATUS_LABEL: Record<ChangeStatus, string> = {
  applied: "Applied",
  partlyFailed: "Partly failed",
  scheduled: "Scheduled",
  canceled: "Canceled",
  undone: "Undone",
};

export interface ImpactLine {
  rowId: string;
  customerId: string;
  shiptoId: string;
  productId: string;
  setting: Setting;
  before: string;
  after: string;
  /** Entities on the row before and after — what entity history reads. */
  beforeIds: string[];
  afterIds: string[];
  /** $/gal the row's price moves by (0 for name-only settings). */
  delta: number;
  outcome: "changed" | "failed" | "pending";
  error?: string;
}

export type OrderReason = "Locked" | "Manual price" | "Quoted price";
export interface OrderImpact {
  id: string;
  rowId: string;
  customerId: string;
  shiptoId: string;
  productId: string;
  delivery: number;
  gallons: number;
  before: number;
  after: number;
  status: "repriced" | "kept";
  reason?: OrderReason;
}

export interface ChangeRecord {
  id: string;
  title: string;
  edits: Edit[];
  source: Source;
  by: string;
  madeAt: number;
  /** When it took (or takes) effect. Equals madeAt unless scheduled. */
  effectiveAt: number;
  status: ChangeStatus;
  /** Rows in scope already at the target — counted, not recorded. */
  noChange: number;
  lines: ImpactLine[];
  orders: OrderImpact[];
  undoOf?: string;
  undoneBy?: string;
  editedAt?: number;
  retriedAt?: number;
  /** Set pricing up where there was none. */
  configures?: boolean;
  /** Put ShipTo rows back on their customer's pricing. */
  resets?: boolean;
}

export const scopeOf = (c: { edits: Edit[] }) => [...new Set(c.edits.flatMap((e) => e.rowIds))];
export const settingsOf = (c: { edits: Edit[] }) => [...new Set(c.edits.map((e) => e.setting))];

// ---------------------------------------------------------------- applying --

export type EntityMap = Map<string, Entity>;

/** How a row reads for one setting, which entities that is, and its $/gal. */
export function readSetting(row: ConfigRow, setting: Setting, ents: EntityMap): { text: string; ids: string[]; value: number } {
  if (IS_LIST[setting]) {
    const ids = row[ROW_KEY[setting as keyof typeof ROW_KEY]];
    const list = ids.map((id) => ents.get(id)).filter((x): x is Entity => !!x);
    return {
      text: list.length ? list.map((x) => x.name).join(", ") : "None",
      ids,
      value: list.reduce((n, x) => n + (x.value ?? 0), 0),
    };
  }
  const id = setting === "rateType" ? row.rateType : row.market;
  if (!id) return { text: "—", ids: [], value: 0 };
  return { text: ents.get(id)?.name ?? "—", ids: [id], value: 0 };
}

export const effectivePrice = (row: ConfigRow, ents: EntityMap) =>
  row.base +
  readSetting(row, "margin", ents).value +
  readSetting(row, "fee", ents).value +
  readSetting(row, "tax", ents).value +
  readSetting(row, "adder", ents).value -
  row.discount;

/** The dynamic margin for a value, created if it doesn't exist yet. */
export function dynamicMargin(value: number, ents: EntityMap): Entity {
  const v = Math.max(0, Math.round(value * 10000) / 10000);
  const name = dynamicName(v);
  const found = [...ents.values()].find((x) => x.setting === "margin" && x.name === name);
  if (found) return found;
  const m: Entity = { id: `m-dyn-${slug(name)}`, setting: "margin", name, value: v, dynamic: true, desc: "Created from Configuration" };
  ents.set(m.id, m);
  return m;
}

/** The row after one edit. */
export function applyEdit(row: ConfigRow, e: Edit): ConfigRow {
  if (IS_LIST[e.setting]) {
    const key = ROW_KEY[e.setting as keyof typeof ROW_KEY];
    const list = row[key];
    if (e.operation === "add") return { ...row, [key]: [...new Set([...list, ...e.entityIds])] };
    if (e.operation === "replace") return { ...row, [key]: [...e.entityIds] };
    if (e.operation === "remove") return { ...row, [key]: list.filter((x) => !e.entityIds.includes(x)) };
    return row;
  }
  if (e.operation === "set" && e.entityIds[0]) return { ...row, [e.setting]: e.entityIds[0] };
  return row;
}

/** A Pricing Setup edit changes the entity itself, so every row using it moves. */
function rowsUsing(rows: ConfigRow[], id: string, setting: Setting) {
  return rows.filter((r) => IS_LIST[setting] && r[ROW_KEY[setting as keyof typeof ROW_KEY]].includes(id));
}

export interface Projection {
  lines: ImpactLine[];
  noChange: number;
  /** Rows after the change, keyed by id — to commit. */
  next: Map<string, ConfigRow>;
}

const lineBase = (row: ConfigRow, setting: Setting) => ({
  rowId: row.id,
  customerId: row.customerId,
  shiptoId: row.shiptoId,
  productId: row.productId,
  setting,
  outcome: "changed" as const,
});

/** What a submit would do, against current pricing. Edits apply in order, so a
 *  later edit sees an earlier one. For an entity edit, `ents` must already
 *  hold the new value and `before` the old one. */
export function project(rows: ConfigRow[], edits: Edit[], ents: EntityMap, before?: EntityMap): Projection {
  const work = new Map(rows.map((r) => [r.id, r]));
  const next = new Map<string, ConfigRow>();
  const lines: ImpactLine[] = [];
  let noChange = 0;
  for (const e of edits) {
    if (e.operation === "edit") {
      const ent0 = (before ?? ents).get(e.entityIds[0]);
      const ent1 = ents.get(e.entityIds[0]);
      if (!ent0 || !ent1 || ent0.value === ent1.value) continue;
      for (const row of rowsUsing(rows, e.entityIds[0], e.setting)) {
        lines.push({
          ...lineBase(row, e.setting),
          before: `${ent0.name} · ${money(ent0.value ?? 0)}`,
          after: `${ent1.name} · ${money(ent1.value ?? 0)}`,
          beforeIds: [ent0.id],
          afterIds: [ent1.id],
          delta: Math.round(((ent1.value ?? 0) - (ent0.value ?? 0)) * 10000) / 10000,
        });
      }
      continue;
    }
    for (const id of e.rowIds) {
      const row = work.get(id);
      if (!row) continue;
      // Unconfigured rows have no pricing to change — only a configure sets them up.
      if (!row.configured && !e.configure) continue;
      const after = applyEdit(row, e);
      const was = readSetting(row, e.setting, ents);
      const now = readSetting(after, e.setting, ents);
      if (was.text === now.text) {
        noChange++;
        continue;
      }
      lines.push({
        ...lineBase(row, e.setting),
        before: was.text,
        after: now.text,
        beforeIds: was.ids,
        afterIds: now.ids,
        delta: Math.round((now.value - was.value) * 10000) / 10000,
      });
      work.set(id, after);
      next.set(id, after);
    }
  }
  return { lines, noChange, next };
}

/** Open orders on the changed rows: most reprice; locked orders, manual
 *  prices and quoted prices keep the price they have. One set per row, priced
 *  by the row's net move. */
export function ordersFor(lines: ImpactLine[], rows: Map<string, ConfigRow>, at: number, seed: string): OrderImpact[] {
  const byRow = new Map<string, { l: ImpactLine; delta: number }>();
  for (const l of lines) {
    if (l.outcome === "failed") continue;
    const cur = byRow.get(l.rowId);
    byRow.set(l.rowId, { l, delta: (cur?.delta ?? 0) + l.delta });
  }
  const out: OrderImpact[] = [];
  for (const [rowId, { l, delta: d }] of byRow) {
    const h = hash(`o${seed}${rowId}`);
    const n = h > 0.62 ? 2 : h > 0.3 ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const k = hash(`k${seed}${rowId}${i}`);
      const row = rows.get(rowId);
      const price = (row?.base ?? 2.9) + 0.6 + Math.round(hash(`pr${rowId}`) * 300) / 1000;
      const delta = d || Math.round((hash(`d${seed}${rowId}`) - 0.45) * 60) / 1000;
      const kept = k > 0.82;
      out.push({
        id: `ORD-${58000 + Math.floor(hash(`id${seed}${rowId}${i}`) * 9000)}`,
        rowId,
        customerId: l.customerId,
        shiptoId: l.shiptoId,
        productId: l.productId,
        delivery: at + Math.ceil(k * 6) * DAY,
        gallons: 500 + Math.floor(hash(`g${seed}${rowId}${i}`) * 75) * 100,
        before: price,
        after: kept ? price : Math.round((price + delta) * 10000) / 10000,
        status: kept ? "kept" : "repriced",
        reason: kept ? (k > 0.95 ? "Quoted price" : k > 0.89 ? "Manual price" : "Locked") : undefined,
      });
    }
  }
  return out;
}

export function editTitle(e: Edit, ents: EntityMap): string {
  const names = e.entityIds.map((id) => ents.get(id)?.name ?? id).join(", ");
  const s = SETTING_LABEL[e.setting];
  switch (e.operation) {
    case "add":
      return e.setting === "adder" ? `Adjustment ${names} added` : `${names} added`;
    case "replace":
      return `${s} replaced with ${names}`;
    case "set":
      return `${s} set to ${names}`;
    case "remove":
      return `${names} removed`;
    case "edit":
      return `${names} changed to ${money(e.amount ?? 0)}`;
    case "create":
      return `${names} created`;
  }
}

export const recordTitle = (edits: Edit[], ents: EntityMap) =>
  edits.length === 1
    ? editTitle(edits[0], ents)
    : `${edits.length} changes: ${[...new Set(edits.map((e) => SETTING_LABEL[e.setting]))].join(", ")}`;

// ------------------------------------------------------------- simulation --

interface Plan {
  at: number;
  by: string;
  source: Source;
  edits: (rows: ConfigRow[], ents: EntityMap) => Edit[];
  status?: ChangeStatus;
  effectiveAt?: number;
  /** Fail this share of lines (a partly failed run). */
  fail?: number;
  /** Undo this change straight after, by the same person. */
  undoAfter?: number;
}

const rowsOf = (rows: ConfigRow[], f: (r: ConfigRow) => boolean) => rows.filter(f).map((r) => r.id);
const catOf = (r: ConfigRow) => productOf(r.productId).categoryId;
const at = (daysAgo: number, h: number, m = 0) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const marginIds = MARGIN_SEED.map(([n]) => `m-${slug(n)}`);

/** A steady background of everyday changes over the last ~120 days. */
function backgroundPlans(): Plan[] {
  const out: Plan[] = [];
  for (let d = 120; d >= 1; d--) {
    // Enough history to read as real, not so much that every entity's log is noise.
    const per = d <= 14 ? 2 : d <= 45 ? 1 : d % 3 === 0 ? 1 : 0;
    for (let i = 0; i < per; i++) {
      const seed = `bg${d}-${i}`;
      const h = hash(seed);
      const by = pick(USERS, `u${seed}`);
      const time = at(d, 7 + Math.floor(hash(`t${seed}`) * 10), Math.floor(hash(`mm${seed}`) * 60));
      const cust = pick(CUSTOMERS, `c${seed}`).id;
      if (h < 0.42) {
        // Inline: one row, one setting.
        const kind = pick(["fee", "rateType", "margin"] as const, `k${seed}`);
        out.push({
          at: time,
          by,
          source: "shiptoInline",
          edits: (rows, ents) => {
            // The demo ShipTos carry only their curated cases.
            const row = pick(rows.filter((r) => r.customerId === cust && !DEMO_SHIPTOS.includes(r.shiptoId)), `row${seed}`);
            if (kind === "margin") {
              const cur = readSetting(row, "margin", ents).value;
              const m = dynamicMargin(cur + (hash(`dir${seed}`) > 0.4 ? 1 : -1) * pick([0.005, 0.01, 0.02], `a${seed}`), ents);
              return [{ setting: "margin", operation: "replace", entityIds: [m.id], rowIds: [row.id] }];
            }
            if (kind === "fee")
              return [
                {
                  setting: "fee",
                  operation: hash(`fa${seed}`) > 0.5 ? "add" : "remove",
                  entityIds: [pick(["f-small-drop-fee", "f-delivery-fee", "f-fuel-surcharge"], `fe${seed}`)],
                  rowIds: [row.id],
                },
              ];
            return [{ setting: "rateType", operation: "set", entityIds: [`r-${slug(pick(RATE_TYPES, `r${seed}`))}`], rowIds: [row.id] }];
          },
        });
      } else if (h < 0.82) {
        // Bulk: a customer's rows, often one product category; now and then two edits in one submit.
        /* ACROSS ACCOUNTS (Yash, 2026-11-16: "why always 1 customer?") — a
           market or rate-type move, a new fee, hits several customers at once,
           so four bulk changes in ten span two or three of them. */
        /* Seven in ten span three to six customers (Yash, 2026-11-16: "at
           least 4–5"); the rest stay on one account. */
        const many = 3 + Math.floor(hash(`n${seed}`) * 4);
        const custs =
          hash(`sp${seed}`) > 0.3
            ? uniq([cust, ...Array.from({ length: many * 2 }, (_, k) => pick(CUSTOMERS, `c${k}${seed}`).id)]).slice(0, many)
            : [cust];
        const cat = hash(`cat${seed}`) > 0.4 ? pick(["diesel", "gasoline", "def", "bio"], `cc${seed}`) : null;
        const kind = pick(["margin", "margin", "fee", "market", "rateType", "tax", "pair"] as const, `bk${seed}`);
        out.push({
          at: time,
          by,
          source: hash(`src${seed}`) > 0.9 ? "import" : "shiptoBulk",
          edits: (rows) => {
            const ids = rowsOf(rows, (r) => custs.includes(r.customerId) && (!cat || catOf(r) === cat) && !DEMO_SHIPTOS.includes(r.shiptoId));
            const margin: Edit = { setting: "margin", operation: hash(`mo${seed}`) > 0.6 ? "add" : "replace", entityIds: [pick(marginIds, `me${seed}`)], rowIds: ids };
            const market: Edit = { setting: "market", operation: "set", entityIds: [`k-${slug(pick(MARKETS, `km${seed}`))}`], rowIds: ids };
            if (kind === "margin") return [margin];
            if (kind === "pair") return [{ setting: "rateType", operation: "set", entityIds: [pick(["r-contract-rack", "r-opis-rack-low"], `pr${seed}`)], rowIds: ids }, market];
            if (kind === "fee")
              return [{ setting: "fee", operation: "add", entityIds: [pick(["f-small-drop-fee", "f-inspection-fee", "f-fuel-surcharge", "f-delivery-fee"], `bf${seed}`)], rowIds: ids }];
            if (kind === "tax") return [{ setting: "tax", operation: "add", entityIds: ["t-lust-fee"], rowIds: ids }];
            if (kind === "market") return [market];
            return [{ setting: "rateType", operation: "set", entityIds: [pick(["r-contract-rack", "r-opis-rack-low", "r-opis-rack-avg"], `rr${seed}`)], rowIds: ids }];
          },
        });
      } else {
        // Pricing Setup: an entity's own value.
        // Routine value edits stay off the entities every demo row carries.
        const id = hash(`sk${seed}`) > 0.3
          ? pick(["m-municipal-bid-margin", "m-marine-bunker-margin", "m-oilfield-account-margin", "m-ag-co-op-margin"], `se${seed}`)
          : pick(["f-small-drop-fee", "f-inspection-fee"], `sf${seed}`);
        out.push({
          at: time,
          by,
          source: "setup",
          edits: (_r, ents) => {
            const e = ents.get(id)!;
            const nv = Math.max(0.005, Math.round(((e.value ?? 0.1) + (hash(`ev${seed}`) > 0.4 ? 0.01 : -0.01)) * 10000) / 10000);
            return [{ setting: e.setting, operation: "edit", entityIds: [id], amount: nv, rowIds: [] }];
          },
        });
      }
    }
  }
  return out;
}

/** The handful of changes the prototype's story leans on. */
function storyPlans(): Plan[] {
  /* ONE ACCOUNT OR SEVERAL (Yash, 2026-11-16) — a bulk change reaches the
     accounts of a region at once, as it does in a tenant's day. */
  const cust = (c: string | string[], cat?: string) => (rows: ConfigRow[]) =>
    rowsOf(rows, (x) => ([] as string[]).concat(c).includes(x.customerId) && (!cat || catOf(x) === cat));
  /** The demo ShipTo's rows. */
  const demo = (rows: ConfigRow[]) => rowsOf(rows, (x) => x.shiptoId === DEMO_SHIPTOS[0]);
  const demo2 = (rows: ConfigRow[]) => rowsOf(rows, (x) => x.shiptoId === DEMO_SHIPTOS[1]);
  /** A customer-pricing edit: the customer's ShipTos that inherit it. */
  const inherit = (c: string, setting: Setting, operation: Operation, entityIds: string[]) => (rows: ConfigRow[]): Edit[] => [
    { setting, operation, entityIds, rowIds: rowsOf(rows, (x) => x.customerId === c && x.applied === "customer") },
  ];
  const one =
    (setting: Setting, operation: Operation, entityIds: string[], scope: (r: ConfigRow[]) => string[]) =>
    (rows: ConfigRow[]): Edit[] => [{ setting, operation, entityIds, rowIds: scope(rows) }];
  return [
    // Same weekday last week, for the stat comparison.
    { at: at(7, 9, 5), by: "Priya Nair", source: "shiptoBulk", edits: one("fee", "add", ["f-fuel-surcharge"], cust(["mustang", "bayou", "redriver", "coastal", "lonestar"])) },
    { at: at(7, 13, 20), by: "Cody McLelland", source: "shiptoInline", edits: one("margin", "add", ["m-freight-recovery-margin"], (r) => cust("bayou")(r).slice(0, 1)) },
    // ---- Every case, for the demo. Inline ones land on Creole County Road 12 Depot
    // (OnSite), so its ShipTo history shows them all.
    { at: at(40, 9, 10), by: "Yash J", source: "setup", edits: () => [{ setting: "tax", operation: "create", entityIds: ["t-la-parish-sales-tax"], rowIds: [] }] },
    { at: at(39, 10, 0), by: "Priya Nair", source: "shiptoBulk", edits: one("tax", "add", ["t-la-parish-sales-tax"], cust(["onsite", "bayou", "pelican", "delta-ag", "natchez"])) },
    { at: at(30, 11, 30), by: "Marcus Hale", source: "setup", edits: () => [{ setting: "tax", operation: "edit", entityIds: ["t-la-parish-sales-tax"], amount: 0.035, rowIds: [] }] },
    { at: at(26, 14, 0), by: "Valarie Rogers", source: "shiptoInline", edits: one("tax", "remove", ["t-la-parish-sales-tax"], (r) => demo(r).slice(0, 1)) },
    { at: at(22, 9, 45), by: "Cody McLelland", source: "shiptoBulk", edits: one("tax", "replace", ["t-federal-excise", "t-tx-state-excise"], cust(["lonestar", "adamas", "permian", "mustang"], "def")) },
    { at: at(35, 8, 15), by: "Yash J", source: "setup", edits: () => [{ setting: "adder", operation: "create", entityIds: ["a-river-access-adder"], rowIds: [] }] },
    { at: at(34, 9, 0), by: "Yash J", source: "shiptoInline", edits: one("adder", "add", ["a-river-access-adder"], (r) => demo(r)) },
    { at: at(20, 13, 10), by: "Priya Nair", source: "setup", edits: () => [{ setting: "adder", operation: "edit", entityIds: ["a-river-access-adder"], amount: 0.03, rowIds: [] }] },
    { at: at(12, 15, 40), by: "Marcus Hale", source: "shiptoInline", edits: one("adder", "remove", ["a-river-access-adder"], (r) => demo(r).slice(1, 2)) },
    { at: at(18, 10, 20), by: "Valarie Rogers", source: "shiptoInline", edits: one("margin", "add", ["m-freight-recovery-margin"], (r) => demo(r).slice(0, 1)) },
    { at: at(11, 9, 5), by: "Cody McLelland", source: "shiptoInline", edits: one("margin", "remove", ["m-freight-recovery-margin"], (r) => demo(r).slice(0, 1)) },
    { at: at(16, 11, 0), by: "Yash J", source: "shiptoInline", edits: one("fee", "replace", ["f-delivery-fee"], (r) => demo(r).slice(1, 2)) },
    { at: at(15, 16, 25), by: "Priya Nair", source: "shiptoInline", edits: one("market", "set", ["k-baton-rouge"], (r) => demo(r).slice(0, 1)) },
    { at: at(14, 8, 30), by: "Marcus Hale", source: "shiptoInline", edits: one("rateType", "set", ["r-contract-rack"], (r) => demo(r).slice(1, 2)) },
    { at: at(28, 12, 0), by: "Yash J", source: "setup", edits: () => [{ setting: "margin", operation: "create", entityIds: ["m-winter-fleet-margin"], rowIds: [] }] },
    // The second demo ShipTo (Lake Charles FM 1960 Hub): every entity, every action.
    { at: at(33, 10, 5), by: "Cody McLelland", source: "shiptoInline", edits: one("margin", "replace", ["m-standard-rack-margin"], (r) => demo2(r).slice(0, 1)) },
    { at: at(29, 15, 20), by: "Priya Nair", source: "shiptoInline", edits: one("fee", "add", ["f-small-drop-fee"], (r) => demo2(r).slice(1, 2)) },
    { at: at(24, 9, 0), by: "Valarie Rogers", source: "shiptoInline", edits: one("fee", "remove", ["f-small-drop-fee"], (r) => demo2(r).slice(1, 2)) },
    { at: at(21, 11, 40), by: "Marcus Hale", source: "shiptoInline", edits: one("tax", "add", ["t-lust-fee"], (r) => demo2(r).slice(0, 1)) },
    { at: at(19, 14, 0), by: "Yash J", source: "shiptoInline", edits: one("adder", "add", ["a-winter-blend-adder"], (r) => demo2(r).slice(2, 3)) },
    { at: at(17, 10, 30), by: "Priya Nair", source: "shiptoInline", edits: one("rateType", "set", ["r-opis-rack-high"], (r) => demo2(r).slice(0, 1)) },
    { at: at(12, 9, 15), by: "Cody McLelland", source: "shiptoInline", edits: one("market", "set", ["k-lake-charles"], (r) => demo2(r).slice(2, 3)) },
    // OnSite's customer pricing: every entity and action, inherited by its ShipTos.
    { at: at(31, 8, 50), by: "Valarie Rogers", source: "customer", edits: inherit("onsite", "margin", "replace", ["m-contractor-margin"]) },
    { at: at(27, 13, 30), by: "Priya Nair", source: "customer", edits: inherit("onsite", "fee", "add", ["f-fuel-surcharge"]) },
    { at: at(23, 10, 10), by: "Marcus Hale", source: "customer", edits: inherit("onsite", "fee", "remove", ["f-fuel-surcharge"]) },
    { at: at(20, 9, 30), by: "Yash J", source: "customer", edits: inherit("onsite", "rateType", "set", ["r-opis-rack-avg"]) },
    { at: at(16, 15, 0), by: "Cody McLelland", source: "customer", edits: inherit("onsite", "market", "set", ["k-lake-charles"]) },
    { at: at(9, 11, 45), by: "Valarie Rogers", source: "customer", edits: inherit("onsite", "adder", "add", ["a-river-access-adder"]) },
    { at: at(4, 16, 20), by: "Priya Nair", source: "customer", edits: inherit("onsite", "adder", "remove", ["a-river-access-adder"]) },
    { at: at(3, 9, 5), by: "Yash J", source: "customer", edits: inherit("onsite", "tax", "replace", ["t-federal-excise", "t-la-state-excise", "t-lust-fee"]) },
    // Pricing Setup: Contractor Margin's value, which both demo ShipTos carry.
    { at: at(6, 14, 15), by: "Valarie Rogers", source: "setup", edits: () => [{ setting: "margin", operation: "edit", entityIds: ["m-contractor-margin"], amount: 0.17, rowIds: [] }] },
    // Pricing Setup: a fee's value edited, so every entity type has one.
    { at: at(25, 10, 0), by: "Marcus Hale", source: "setup", edits: () => [{ setting: "fee", operation: "edit", entityIds: ["f-weekend-delivery-fee"], amount: 0.045, rowIds: [] }] },
    // Customer pricing: every entity, set once for a customer and inherited.
    { at: at(13, 10, 0), by: "Priya Nair", source: "customer", edits: inherit("onsite", "tax", "add", ["t-lust-fee"]) },
    { at: at(10, 14, 30), by: "Valarie Rogers", source: "customer", edits: inherit("gulf", "adder", "add", ["a-winter-blend-adder"]) },
    { at: at(8, 11, 15), by: "Cody McLelland", source: "customer", edits: inherit("bayou", "market", "set", ["k-baton-rouge"]) },
    { at: at(6, 9, 50), by: "Marcus Hale", source: "customer", edits: inherit("mustang", "fee", "remove", ["f-delivery-fee"]) },
    // Customer pricing: set once for the customer, reaching every ShipTo of it.
    { at: at(9, 10, 30), by: "Valarie Rogers", source: "customer", edits: inherit("redriver", "margin", "replace", ["m-contractor-margin"]) },
    { at: at(5, 14, 5), by: "Priya Nair", source: "customer", edits: inherit("pelican", "fee", "add", ["f-delivery-fee"]) },
    { at: at(1, 9, 40), by: "Marcus Hale", source: "customer", edits: inherit("delta-ag", "rateType", "set", ["r-opis-rack-avg"]) },
    // Pricing Setup: a new fee created (not on any row yet).
    { at: at(2, 11, 20), by: "Yash J", source: "setup", edits: () => [{ setting: "fee", operation: "create", entityIds: ["f-weekend-delivery-fee"], rowIds: [] }] },
    // A change undone straight after.
    { at: at(3, 15, 10), by: "Valarie Rogers", source: "shiptoBulk", edits: one("market", "set", ["k-beaumont"], cust(["coastal", "gulf", "lonestar"])), undoAfter: 12 },
    // A schedule canceled before it ran.
    { at: at(4, 11, 0), by: "Marcus Hale", source: "shiptoBulk", edits: one("margin", "replace", ["m-standard-rack-margin"], cust(["lonestar", "adamas", "permian", "mustang"])), status: "canceled", effectiveAt: at(2, 6, 0) },
    // Last night's scheduled run, partly failed: rate type and market together.
    {
      at: at(2, 16, 45),
      by: "Priya Nair",
      source: "shiptoBulk",
      edits: (r) => [
        { setting: "rateType", operation: "set", entityIds: ["r-contract-rack"], rowIds: cust(["lonestar", "adamas", "permian", "mustang"])(r) },
        { setting: "market", operation: "set", entityIds: ["k-houston"], rowIds: cust(["lonestar", "adamas", "permian", "mustang"])(r) },
      ],
      effectiveAt: at(1, 18, 0),
      fail: 0.06,
    },
    // Today, before 10:40.
    { at: at(0, 7, 12), by: "Yash J", source: "setup", edits: () => [{ setting: "margin", operation: "edit", entityIds: ["m-ag-co-op-margin"], amount: 0.135, rowIds: [] }] },
    { at: at(0, 8, 3), by: "Cody McLelland", source: "shiptoBulk", edits: one("fee", "add", ["f-small-drop-fee"], cust(["lonestar", "gulf", "coastal", "mustang"], "gasoline")) },
    { at: at(0, 8, 40), by: "Valarie Rogers", source: "shiptoInline", edits: one("rateType", "set", ["r-opis-rack-low"], (r) => cust("redriver")(r).slice(1, 2)) },
    { at: at(0, 9, 15), by: "Priya Nair", source: "shiptoBulk", edits: one("margin", "replace", ["m-marine-bunker-margin"], cust(["gulf", "coastal", "pelican", "bayou"])) },
    { at: at(0, 9, 52), by: "Marcus Hale", source: "import", edits: one("market", "set", ["k-austin"], cust(["lonestar", "adamas", "mustang"])) },
    {
      at: at(0, 10, 18),
      by: "Yash J",
      source: "shiptoBulk",
      edits: (r, ents) => [{ setting: "margin", operation: "add", entityIds: [dynamicMargin(0.015, ents).id], rowIds: cust(["onsite", "bayou", "pelican", "delta-ag", "natchez"], "diesel")(r) }],
    },
    // Two schedules on the same Gulf Coast rows: the one that runs later wins.
    { at: at(0, 9, 30), by: "Yash J", source: "shiptoBulk", edits: one("margin", "add", ["m-freight-recovery-margin"], cust(["gulf", "coastal", "pelican", "bayou"], "diesel")), status: "scheduled", effectiveAt: at(0, 14, 0) },
    {
      at: at(0, 10, 5),
      by: "Priya Nair",
      source: "shiptoBulk",
      edits: (r, ents) => [{ setting: "margin", operation: "replace", entityIds: [dynamicMargin(0.21, ents).id], rowIds: cust(["gulf", "coastal", "pelican", "bayou"])(r) }],
      status: "scheduled",
      effectiveAt: at(-1, 6, 0),
    },
  ];
}

export interface Seed {
  rows: ConfigRow[];
  entities: Entity[];
  changes: ChangeRecord[];
}

export function buildSeed(): Seed {
  // Unconfigured rows carry no pricing at all.
  let rows = seedRows().map((r) =>
    r.configured ? r : { ...r, rateType: "", market: "", margins: [], fees: [], taxes: [], adders: [], discount: 0, applied: "shipto" as const },
  );
  const ents: EntityMap = new Map(ENTITIES.map((e) => [e.id, { ...e }]));
  const plans = [...backgroundPlans(), ...storyPlans()].sort((a, b) => a.at - b.at);
  const changes: ChangeRecord[] = [];
  let n = 1000;
  const pending: Plan[] = [];

  const commit = (p: Plan, edits: Edit[], undoOf?: string, explicit?: Projection) => {
    const before = new Map(ents);
    if (!explicit) for (const e of edits) if (e.operation === "edit") ents.set(e.entityIds[0], { ...ents.get(e.entityIds[0])!, value: e.amount });
    const proj = explicit ?? project(rows, edits, ents, before);
    if (proj.lines.length === 0 && !edits.some((e) => e.operation === "create")) {
      for (const e of edits) if (e.operation === "edit") ents.set(e.entityIds[0], before.get(e.entityIds[0])!);
      return null;
    }
    const id = `CH-${++n}`;
    const lines = proj.lines.map((l) => (p.fail && hash(`f${id}${l.rowId}`) < p.fail ? { ...l, outcome: "failed" as const, error: "Pricing service timed out" } : l));
    const failed = new Set(lines.filter((l) => l.outcome === "failed").map((l) => l.rowId));
    // Editing a ShipTo row gives it its own pricing: it stops inheriting the customer's.
    // (Seeded bulk changes are treated as fills that keep the inheritance, so the
    // demo still has customers whose ShipTos inherit; live bulk edits do flip.)
    const own = p.source === "shiptoInline";
    rows = rows.map((r) => (proj.next.has(r.id) && !failed.has(r.id) ? { ...proj.next.get(r.id)!, ...(own && r.applied === "customer" ? { applied: "shipto" as const } : {}) } : r));
    const eff = p.effectiveAt ?? p.at;
    const rec: ChangeRecord = {
      id,
      title: undoOf ? `Undo of ${undoOf}` : recordTitle(edits, ents),
      edits,
      source: p.source,
      by: p.by,
      madeAt: p.at,
      effectiveAt: eff,
      status: failed.size ? "partlyFailed" : "applied",
      noChange: proj.noChange,
      lines,
      orders: ordersFor(lines, new Map(rows.map((r) => [r.id, r])), eff, id),
      undoOf,
    };
    changes.push(rec);
    return rec;
  };

  for (const p of plans) {
    if (p.status === "scheduled" || p.status === "canceled") {
      pending.push(p);
      continue;
    }
    const edits = p.edits(rows, ents).filter((e) => e.operation === "edit" || e.rowIds.length);
    if (!edits.length) continue;
    const rec = commit(p, edits);
    if (rec && p.undoAfter) {
      const u = commit({ ...p, at: p.at + p.undoAfter * 60_000, effectiveAt: undefined }, edits, rec.id, undoProjection(rows, rec, ents));
      if (u) {
        rec.status = "undone";
        rec.undoneBy = u.id;
      }
    }
  }
  // Schedules and cancellations: projected on today's pricing, not applied.
  for (const p of pending) {
    const edits = p.edits(rows, ents);
    const proj = project(rows, edits, ents);
    const id = `CH-${++n}`;
    const eff = p.effectiveAt ?? p.at;
    changes.push({
      id,
      title: recordTitle(edits, ents),
      edits,
      source: p.source,
      by: p.by,
      madeAt: p.at,
      effectiveAt: eff,
      status: p.status!,
      noChange: proj.noChange,
      lines: proj.lines.map((l) => ({ ...l, outcome: "pending" as const })),
      orders: ordersFor(proj.lines, new Map(rows.map((r) => [r.id, r])), eff, id),
    });
  }
  changes.sort((a, b) => b.madeAt - a.madeAt);
  return { rows, entities: [...ents.values()], changes };
}

/** Undo puts each changed row's before value back, and touches nothing else. */
export function undoProjection(rows: ConfigRow[], rec: ChangeRecord, ents: EntityMap): Projection {
  const work = new Map(rows.map((r) => [r.id, r]));
  const next = new Map<string, ConfigRow>();
  const lines: ImpactLine[] = [];
  // Last line first, so a row edited twice ends where it started.
  for (const l of [...rec.lines].reverse()) {
    if (l.outcome !== "changed") continue;
    const row = work.get(l.rowId);
    if (!row) continue;
    const s = l.setting;
    const back: ConfigRow = IS_LIST[s] ? { ...row, [ROW_KEY[s as keyof typeof ROW_KEY]]: l.beforeIds } : { ...row, [s]: l.beforeIds[0] };
    const was = readSetting(row, s, ents);
    const now = readSetting(back, s, ents);
    if (was.text === now.text) continue;
    lines.push({ ...lineBase(row, s), before: was.text, after: now.text, beforeIds: was.ids, afterIds: now.ids, delta: Math.round((now.value - was.value) * 10000) / 10000 });
    work.set(row.id, back);
    next.set(row.id, back);
  }
  return { lines: lines.reverse(), noChange: 0, next };
}

// ------------------------------------------------------------- formatting --

const DT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const D = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const T = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
export const fmtDateTime = (t: number) => DT.format(t);
export const fmtDate = (t: number) => D.format(t);
export const fmtTime = (t: number) => T.format(t);
export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const isSameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);
/** "Today, 2:00 PM" / "Tomorrow, 6:00 AM" / "Nov 12, 2026, 6:00 PM". */
export function fmtWhen(t: number) {
  if (isSameDay(t, NOW)) return `Today, ${fmtTime(t)}`;
  if (isSameDay(t, NOW + DAY)) return `Tomorrow, ${fmtTime(t)}`;
  if (isSameDay(t, NOW - DAY)) return `Yesterday, ${fmtTime(t)}`;
  return fmtDateTime(t);
}
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
export const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Base-price moves for one ShipTo in a period — Price Explorer owns these, the
 *  history only counts them. Roughly one feed update per product per weekday. */
export function basePriceMoves(shiptoId: string, rows: ConfigRow[], from: number, to: number) {
  const products = rows.filter((r) => r.shiptoId === shiptoId).length;
  const days = Math.max(1, Math.round((to - from) / DAY));
  return Math.round(products * days * (5 / 7) * (0.8 + hash(`bp${shiptoId}`) * 0.4));
}

// ------------------------------------------------------------ summaries --

/** The Change column, read with Action beside it: what moved, not the verb.
 *  Added / removed / created: the names. Replaced / changed: before → after.
 *  A value edit: the entity's old → new $/gal. */
/** One edit's change: names for add/remove/create, before → after for a
 *  replace or set, old → new $/gal for a value edit. `lines` are the rows it
 *  moved (to read what it replaced). */
/* A CHANGE AS PARTS (Yash, 2026-11-16) — text, and a name list that shows
   its first names and folds the rest into "+N" (hover lists them, as Service
   Work's order rows do). `editSummary` / `changeSummary` are the same parts as
   plain text, for search, sort and titles. */
export type SummaryPart = string | { names: string[]; label: string };
const partsText = (parts: SummaryPart[]) =>
  parts.map((p) => (typeof p === "string" ? p : p.names.length <= 2 ? p.names.join(", ") : `${p.names[0]} +${p.names.length - 1} more`)).join("");

export function editParts(e: Edit, lines: ImpactLine[], ents: EntityMap): SummaryPart[] {
  /* WHAT MOVED, BY NAME: a margin made from a typed value reads as a rate
     ("$0.21/gal"). */
  const name = (id: string) => {
    const ent = ents.get(id);
    return ent ? (ent.dynamic ? `${ent.name}/gal` : ent.name) : id;
  };
  const label = ({ margin: "margins", fee: "fees", tax: "taxes", rateType: "rate types", market: "markets", adder: "adders" } as const)[e.setting];
  const list = (ids: string[]): SummaryPart => ({ names: ids.map(name), label });
  if (e.operation === "add" || e.operation === "remove" || e.operation === "create") return [list(e.entityIds)];
  if (e.operation === "edit") {
    const was = lines.find((l) => l.setting === e.setting && l.beforeIds.includes(e.entityIds[0]))?.before.split(" · ")[1];
    return [list(e.entityIds), was ? `: ${was} → ${money(e.amount ?? 0)}` : `: ${money(e.amount ?? 0)}`];
  }
  const mine = lines.filter((l) => l.setting === e.setting);
  const off = uniq(mine.flatMap((l) => l.beforeIds.filter((id) => !l.afterIds.includes(id))));
  return off.length ? [list(off), " → ", list(e.entityIds)] : [list(e.entityIds)];
}

export const editSummary = (e: Edit, lines: ImpactLine[], ents: EntityMap) => partsText(editParts(e, lines, ents));

export function changeParts(c: ChangeRecord, ents: EntityMap): SummaryPart[] {
  if (c.undoOf) return [`Undo of ${c.undoOf}`];
  if (c.resets) return ["Reset to customer pricing"];
  return c.edits.flatMap((e, i) => [
    ...(i > 0 ? [" · "] : []),
    ...(c.edits.length > 1 ? [`${SETTING_LABEL[e.setting]}: `] : []),
    ...editParts(e, c.lines, ents),
  ]);
}

/** The Change column as text: what moved. */
export const changeSummary = (c: ChangeRecord, ents: EntityMap) => partsText(changeParts(c, ents));

// ------------------------------------------------------- customer pricing --

/** Customer Pricing: one record per customer, inherited by every ShipTo of it
 *  that isn't priced on its own (or from a hub). Shown from the first
 *  inheriting row; an edit here lands on all of them. */
export interface CustomerRow {
  customerId: string;
  /** ShipTo × product rows that inherit customer pricing. */
  rowIds: string[];
  shiptos: number;
  sample: ConfigRow;
}
export function customerRows(rows: ConfigRow[]): CustomerRow[] {
  return CUSTOMERS.map((c) => {
    const mine = rows.filter((r) => r.customerId === c.id);
    const inh = mine.filter((r) => r.applied === "customer");
    return { customerId: c.id, rowIds: inh.map((r) => r.id), shiptos: new Set(inh.map((r) => r.shiptoId)).size, sample: inh[0] ?? mine[0] };
  }).filter((r) => !!r.sample);
}
