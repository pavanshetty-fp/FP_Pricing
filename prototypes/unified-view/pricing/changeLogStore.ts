import * as React from "react";
import { toast } from "sonner";
import {
  CURRENT_USER,
  NOW,
  buildSeed,
  ordersFor,
  project,
  recordTitle,
  undoProjection,
  IS_LIST,
  revertRows,
  rollbackEligible,
  stateProjection,
  type Source,
  type Setting,
  type SetupField,
  type ChangeRecord,
  type ConfigRow,
  type Edit,
  type Entity,
  type EntityMap,
} from "./changeLog";

/*
  THE CHANGE LOG, ONE STORE FOR EVERY PRICING PAGE (Yash, 2026-11-16).
  Activity feed reads it today; Customer & Ship-to and Order price trace will
  read the same records, and the bulk edit will write to it. Module state, so
  leaving a page and coming back keeps what was done (the prototype has no
  server). The prototype's clock moves a minute per write, so new changes sort
  first.
*/

interface State {
  rows: ConfigRow[];
  entities: Entity[];
  changes: ChangeRecord[];
  /** Customers' own pricing records, set up on Customer pricing before any
   *  ship-to inherits them. */
  customerOwn: Record<string, ConfigRow>;
  /** Pricing setup's own fields, by entity id (status, address, hubs, rate shape). */
  meta: Record<string, SetupMeta>;
  /** A setup record's own activity — what changed besides its price (the
   *  price is in the change log). One entry per open sheet, by session. */
  audit: Record<string, SetupAudit[]>;
  tick: number;
}

export interface SetupAudit {
  session: string;
  at: number;
  by: string;
  changes: string[];
  /** The record as the sheet found it — what a roll back puts back. */
  before?: SetupSnapshot;
  /** "Created", "Edited", "Activated", "Deactivated", "Rolled back". */
  action: string;
}
export interface SetupSnapshot {
  name: string;
  desc: string;
  value?: number;
  meta: SetupMeta;
}

/* PRICING SETUP (Yash, 2026-11-17) — what the setup pages keep about a rate
   type, market or margin beyond its name and value. The dev site's forms. */
export interface MarginProductRow {
  category: string;
  products: string[];
  kind: "Fixed" | "Volume based";
  rate: number;
}
export interface VolumeTier {
  from: number;
  to: number | null;
  rate: number;
}
export interface SetupMeta {
  active: boolean;
  /** Rate type: listed on Today's pricing. */
  showInTodays?: boolean;
  /** Market. */
  address?: string;
  hubs?: string[];
  /** Margin. */
  appliesTo?: "all" | "specific";
  productRows?: MarginProductRow[];
  rateKind?: "fixed" | "volume";
  unit?: "$/gal" | "%";
  tiers?: VolumeTier[];
}

const SEED = buildSeed();
/* The sample setup edits leave their records as they say: Lake Charles has
   a second hub, OPIS Rack High is switched off. */
const SEED_META = (): Record<string, SetupMeta> => {
  const out: Record<string, SetupMeta> = {};
  for (const e of SEED.entities) {
    if (e.id === "k-lake-charles") out[e.id] = { ...metaOf(e, {}), hubs: ["Lake Charles hub", "Sulphur hub"] };
    if (e.id === "r-opis-rack-high") out[e.id] = { ...metaOf(e, {}), active: false };
  }
  return out;
};
let state: State = { rows: SEED.rows, entities: SEED.entities, changes: SEED.changes, customerOwn: {}, meta: {}, audit: seedAudit(SEED.entities, SEED.changes), tick: 0 };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const nowOf = (s: State) => NOW + s.tick * 60_000;
const nextId = (s: State) => `CH-${Math.max(...s.changes.map((c) => Number(c.id.slice(3)))) + 1}`;
const entityMapOf = (s: State): EntityMap => new Map(s.entities.map((e) => [e.id, e]));
const rowMapOf = (s: State) => new Map(s.rows.map((r) => [r.id, r]));

/** The one change Undo is offered on: the most recent that took effect,
 *  unless that is itself an undo. */
export function latestIdOf(changes: ChangeRecord[]): string | null {
  const done = changes
    .filter((c) => c.status === "applied" || c.status === "partlyFailed" || c.status === "undone")
    .sort((a, b) => b.effectiveAt - a.effectiveAt)[0];
  return done && !done.undoOf && done.status !== "undone" ? done.id : null;
}

/** Undo the latest change: a new change that puts every row it moved back.
 *  Returns the new change's id. */
export function undoChange(id: string): string | null {
  const s = state;
  const rec = s.changes.find((c) => c.id === id);
  if (!rec || id !== latestIdOf(s.changes)) return null;
  const ents = entityMapOf(s);
  const proj = undoProjection(s.rows, rec, ents);
  const uid = nextId(s);
  const t = nowOf(s) + 60_000;
  const u: ChangeRecord = {
    id: uid,
    title: `Undo of ${rec.id}`,
    edits: rec.edits,
    source: rec.source,
    by: CURRENT_USER,
    madeAt: t,
    effectiveAt: t,
    status: "applied",
    noChange: 0,
    lines: proj.lines,
    orders: ordersFor(proj.lines, rowMapOf(s), t, uid),
    undoOf: rec.id,
  };
  set({
    rows: s.rows.map((r) => proj.next.get(r.id) ?? r),
    changes: [u, ...s.changes.map((c) => (c.id === id ? { ...c, status: "undone" as const, undoneBy: uid } : c))],
    tick: s.tick + 1,
  });
  toast.success(`${rec.id} undone · ${proj.lines.length.toLocaleString()} rows back to their earlier values`);
  return uid;
}

/** Re-run only the failed rows. In the prototype they all go through. */
export function retryChange(id: string) {
  const s = state;
  const rec = s.changes.find((c) => c.id === id);
  if (!rec) return;
  const failedRows = new Set(rec.lines.filter((l) => l.outcome === "failed").map((l) => l.rowId));
  const edits = rec.edits.map((e) => ({ ...e, rowIds: e.rowIds.filter((r) => failedRows.has(r)) }));
  const proj = project(s.rows, edits, entityMapOf(s));
  const now = nowOf(s);
  set({
    rows: s.rows.map((r) => proj.next.get(r.id) ?? r),
    changes: s.changes.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "applied" as const,
            retriedAt: now + 60_000,
            lines: c.lines.map((l) => (l.outcome === "failed" ? { ...l, outcome: "changed" as const, error: undefined } : l)),
            orders: [...c.orders, ...ordersFor(proj.lines, rowMapOf(s), now, `${id}r`)],
          }
        : c
    ),
    tick: s.tick + 1,
  });
  toast.success(`${failedRows.size} failed ${failedRows.size === 1 ? "price" : "prices"} applied`);
}

/** Move a scheduled change to another time; it keeps its id and history. */
export function rescheduleChange(id: string, when: number) {
  const s = state;
  set({
    changes: s.changes.map((c) =>
      c.id === id ? { ...c, effectiveAt: when, editedAt: nowOf(s) + 60_000, orders: ordersFor(c.lines, rowMapOf(s), when, id) } : c
    ),
    tick: s.tick + 1,
  });
  toast.success(`${id} rescheduled`);
}

export function cancelChange(id: string) {
  set({ changes: state.changes.map((c) => (c.id === id ? { ...c, status: "canceled" as const } : c)) });
  toast.success(`${id} canceled`);
}

/**
 * SAVE A PRICING SHEET (Yash, 2026-11-17). A sheet autosaves; every save of
 * one open sheet is ONE change in the log, rewritten as the sheet changes —
 * a pick per autosave would bury the log. `baseline` holds the rows as the
 * sheet found them; each save puts those back and applies the edits again.
 * A save that ends where the sheet started removes its change. Returns the
 * change's id (null when there is none).
 *
 * `configure` sets pricing up on rows (or a customer) that had none — that
 * one is the footer's act, not an autosave.
 */
export function savePricing(opts: {
  changeId: string | null;
  baseline: ConfigRow[];
  edits: Edit[];
  source: "shiptoInline" | "customer";
  configure?: boolean;
  /** A customer's own record — written when no ship-to inherits it. */
  customer?: { id: string; before: ConfigRow | null; after: ConfigRow };
}): string | null {
  const s = state;
  const ents = entityMapOf(s);
  const base = new Map(opts.baseline.map((r) => [r.id, r]));
  const rows0 = s.rows.map((r) => base.get(r.id) ?? r);
  const proj = project(rows0, opts.edits, ents);
  const own = { ...s.customerOwn };
  if (opts.customer) {
    if (opts.customer.before) own[opts.customer.id] = opts.customer.after;
    else if (opts.configure) own[opts.customer.id] = opts.customer.after;
  }
  const ownMoved = !!opts.customer && JSON.stringify(opts.customer.before) !== JSON.stringify(opts.customer.after);
  const without = s.changes.filter((c) => c.id !== opts.changeId);
  if (proj.lines.length === 0 && !ownMoved) {
    set({ rows: rows0, changes: without, customerOwn: own });
    return null;
  }
  const id = opts.changeId ?? nextId(s);
  const prev = s.changes.find((c) => c.id === opts.changeId);
  const t = prev?.madeAt ?? nowOf(s) + 60_000;
  const rows = rows0.map((r) => {
    const n = proj.next.get(r.id);
    if (!n) return r;
    return {
      ...n,
      ...(opts.configure ? { configured: true } : {}),
      /* A ship-to edited on its own stops inheriting its customer's pricing. */
      ...(opts.source === "shiptoInline" && r.applied === "customer" ? { applied: "shipto" as const } : {}),
    };
  });
  const rec: ChangeRecord = {
    id,
    title: recordTitle(opts.edits, ents),
    edits: opts.edits,
    source: opts.source,
    by: CURRENT_USER,
    madeAt: t,
    effectiveAt: t,
    status: "applied",
    noChange: proj.noChange,
    lines: proj.lines,
    orders: ordersFor(proj.lines, new Map(rows.map((r) => [r.id, r])), t, id),
    configures: opts.configure || undefined,
    customerId: opts.customer?.id,
  };
  set({ rows, changes: [rec, ...without], customerOwn: own, tick: prev ? s.tick : s.tick + 1 });
  return id;
}

/** Rows put to given states, logged as one change (a reset or a rollback). */
function writeStates(targets: Map<string, ConfigRow>, meta: { source: Source; resets?: boolean; rollbackOf?: string; customerId?: string }): string | null {
  const s = state;
  const ents = entityMapOf(s);
  const proj = stateProjection(s.rows, targets, ents);
  if (!proj.next.size) return null;
  const id = nextId(s);
  const t = nowOf(s) + 60_000;
  const settings = [...new Set(proj.lines.map((l) => l.setting))];
  const edits: Edit[] = settings.map((st) => {
    const ls = proj.lines.filter((l) => l.setting === st);
    return {
      setting: st,
      operation: IS_LIST[st] ? "replace" : "set",
      entityIds: [...new Set(ls.flatMap((l) => l.afterIds))],
      rowIds: [...new Set(ls.map((l) => l.rowId))],
      reset: meta.resets || undefined,
    };
  });
  /* A reset that moves no price still names its rows, so their history shows it. */
  if (!edits.length) edits.push({ setting: "margin", operation: "replace", entityIds: [], rowIds: [...proj.next.keys()], reset: meta.resets || undefined });
  const rows = s.rows.map((r) => proj.next.get(r.id) ?? r);
  const rec: ChangeRecord = {
    id,
    title: meta.resets ? "Reset to customer pricing" : `Rollback of ${meta.rollbackOf}`,
    edits,
    source: meta.source,
    by: CURRENT_USER,
    madeAt: t,
    effectiveAt: t,
    status: "applied",
    noChange: 0,
    lines: proj.lines,
    orders: ordersFor(proj.lines, new Map(rows.map((r) => [r.id, r])), t, id),
    resets: meta.resets,
    rollbackOf: meta.rollbackOf,
    customerId: meta.customerId,
  };
  set({ rows, changes: [rec, ...s.changes], tick: s.tick + 1 });
  return id;
}

/** The customer pricing a ship-to row would take back. */
export function customerRecordFor(rows: ConfigRow[], own: Record<string, ConfigRow>, row: ConfigRow): ConfigRow | null {
  return own[row.customerId] ?? rows.find((r) => r.customerId === row.customerId && r.applied === "customer" && r.id !== row.id) ?? null;
}

/** Put a ship-to row back on its customer's pricing. */
export function resetToCustomer(rowId: string): string | null {
  const s = state;
  const row = s.rows.find((r) => r.id === rowId);
  const rec = row && customerRecordFor(s.rows, s.customerOwn, row);
  if (!row || !rec) return null;
  const target: ConfigRow = { ...row, rateType: rec.rateType, market: rec.market, margins: rec.margins, fees: rec.fees, taxes: rec.taxes, adders: rec.adders, applied: "customer", configured: true };
  return writeStates(new Map([[row.id, target]]), { source: "shiptoInline", resets: true });
}

/** The changes on these rows that can be rolled back, newest first. */
export function rollbackCandidates(rowIds: string[], changes: ChangeRecord[]) {
  return changes.filter((c) => rollbackEligible(changes, c, rowIds)).sort((a, b) => b.effectiveAt - a.effectiveAt);
}

/** What rolling this change back on these rows would move. */
export function rollbackPlan(rowIds: string[], changeId: string) {
  const s = state;
  const rec = s.changes.find((c) => c.id === changeId);
  if (!rec) return null;
  return stateProjection(s.rows, revertRows(s.rows, rec, rowIds), entityMapOf(s));
}

export function rollbackChange(rowIds: string[], changeId: string, source: Source, customerId?: string): string | null {
  const plan = rollbackPlan(rowIds, changeId);
  if (!plan) return null;
  return writeStates(plan.next, { source, rollbackOf: changeId, customerId });
}

/** A new margin, fee, tax or adder — made from a pricing sheet's + New, and
 *  logged as Pricing setup. */
export function addEntity(setting: Setting, name: string, value: number, desc?: string): string {
  const s = state;
  const prefix = { margin: "m", fee: "f", tax: "t", adder: "a", rateType: "r", market: "k" }[setting];
  const base = `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  let id = base;
  for (let i = 2; s.entities.some((e) => e.id === id); i++) id = `${base}-${i}`;
  const cid = nextId(s);
  const t = nowOf(s) + 60_000;
  const rec: ChangeRecord = {
    id: cid,
    title: name,
    edits: [{ setting, operation: "create", entityIds: [id], amount: value, rowIds: [] }],
    source: "setup",
    by: CURRENT_USER,
    madeAt: t,
    effectiveAt: t,
    status: "applied",
    noChange: 0,
    lines: [],
    orders: [],
  };
  set({ entities: [...s.entities, { id, setting, name, value, desc }], changes: [rec, ...s.changes], tick: s.tick + 1 });
  return id;
}

/* A SETUP RECORD'S HISTORY BEFORE THE PROTOTYPE OPENS (Yash, 2026-11-17) —
   every rate type, market and margin was created by someone, some time ago,
   and most were touched since. Deterministic, so a reload tells the same story.
   A record the change log already creates is not created twice. */
function seedAudit(entities: Entity[], changes: ChangeRecord[]): Record<string, SetupAudit[]> {
  /* Inside, not module constants: the store's state is built from this
     before the module's later lines run. */
  const SETUP_KINDS = new Set(["rateType", "market", "margin"]);
  const TEAM = ["Yash J", "Priya Nair", "Cody McLelland", "Valarie Rogers", "Marcus Hale"];
  const out: Record<string, SetupAudit[]> = {};
  const DAYMS = 86_400_000;
  for (const e of entities) {
    if (!SETUP_KINDS.has(e.setting)) continue;
    const hs = (k: string) => h01(`${k}${e.id}`);
    const who = (k: string) => TEAM[Math.floor(hs(k) * TEAM.length)];
    const created = changes.some((c) => c.edits.some((x) => x.operation === "create" && x.entityIds.includes(e.id)));
    const born = NOW - Math.floor(120 + hs("born") * 160) * DAYMS - Math.floor(hs("bh") * 9) * 3_600_000;
    const list: SetupAudit[] = [];
    if (!created) list.push({ session: `seed-born-${e.id}`, at: born, by: who("bw"), changes: ["Created"], action: "Added" });
    const edit = (k: string, daysAgo: number, change: string, action = "Updated") =>
      list.push({ session: `seed-${k}-${e.id}`, at: NOW - daysAgo * DAYMS - Math.floor(hs(k) * 8) * 3_600_000, by: who(`${k}w`), changes: [change], action });
    if (e.setting === "rateType") {
      edit("td", 60 + Math.floor(hs("td") * 40), `Today's pricing: ${hs("tdv") > 0.3 ? "shown" : "hidden"}`);
      if (hs("ds") > 0.4) edit("ds", 20 + Math.floor(hs("ds") * 30), "Description changed");
    } else if (e.setting === "market") {
      edit("hb", 70 + Math.floor(hs("hb") * 30), `Hubs: ${e.name} hub`);
      if (hs("ad") > 0.5) edit("ad", 15 + Math.floor(hs("ad") * 30), "Market address changed");
    } else {
      if (hs("ds") > 0.3) edit("ds", 40 + Math.floor(hs("ds") * 50), "Description changed");
      if (hs("off") > 0.7) {
        edit("off", 30 + Math.floor(hs("off") * 10), "Deactivated", "Deactivated");
        edit("on", 10 + Math.floor(hs("on") * 15), "Activated", "Activated");
      }
    }
    out[e.id] = list.sort((a, b) => b.at - a.at);
  }
  return out;
}

/** The newest sheet edit on a record that can be rolled back, or null. */
export function rollbackableSetup(audit: SetupAudit[] | undefined): SetupAudit | null {
  const latest = (audit ?? [])[0];
  return latest && latest.before && latest.action !== "Rolled back" ? latest : null;
}

/** Put a record back as it was before its newest edit; logged as a roll back. */
export function rollbackSetup(id: string): boolean {
  const s = state;
  const entry = rollbackableSetup(s.audit[id]);
  const e = s.entities.find((x) => x.id === id);
  if (!entry || !entry.before || !e) return false;
  const b = entry.before;
  if (b.value !== undefined && e.value !== b.value) saveSetupChange({ changeId: null, id, fields: [], value: { base: e.value ?? 0, amount: b.value } });
  updateSetup(id, { name: b.name, desc: b.desc, meta: b.meta });
  logSetup(id, `rollback-${nowOf(state)}`, [`Rolled back: ${entry.changes.join(", ")}`], { action: "Rolled back" });
  return true;
}

const MARKET_STATE: Record<string, string> = { Houston: "TX", Austin: "TX", Midland: "TX", Beaumont: "TX", "Lake Charles": "LA", "Baton Rouge": "LA", Shreveport: "LA", Greenville: "MS", Mobile: "AL" };
function h01(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
/** An entity's setup fields — what was saved, else the sample's defaults. */
export function metaOf(e: Entity, meta: Record<string, SetupMeta>): SetupMeta {
  if (meta[e.id]) return meta[e.id];
  /* Every sample record is in use on prices, so it starts active. */
  const active = true;
  if (e.setting === "rateType") return { active, showInTodays: h01(`td${e.id}`) > 0.3 };
  if (e.setting === "market") return { active, address: `${e.name}, ${MARKET_STATE[e.name] ?? "TX"}, USA`, hubs: [`${e.name} hub`] };
  if (e.setting === "margin") return { active, appliesTo: "all", rateKind: "fixed", unit: "$/gal" };
  return { active };
}

/** Make a rate type, market or margin; logged as Pricing setup. */
export function createSetup(setting: Setting, name: string, desc: string | undefined, value: number | undefined, meta: SetupMeta): string {
  const id = addEntity(setting, name, value ?? 0, desc);
  const s = state;
  set({
    entities: s.entities.map((e) => (e.id === id && value === undefined ? { ...e, value: undefined } : e)),
    meta: { ...s.meta, [id]: meta },
  });
  return id;
}

/** Name, description and setup fields — not logged (the log holds prices). */
export function updateSetup(id: string, patch: { name?: string; desc?: string; meta?: SetupMeta }) {
  const s = state;
  set({
    entities: s.entities.map((e) => (e.id === id ? { ...e, ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.desc !== undefined ? { desc: patch.desc } : {}) } : e)),
    meta: patch.meta ? { ...s.meta, [id]: patch.meta } : s.meta,
    tick: s.tick + 1,
  });
}

/** A SETUP SHEET'S EDITS, AS ONE CHANGE (Yash, 2026-11-18) — its rate (a
 *  margin, any rate kind) and its own fields (name, description, hubs,
 *  address, Today's pricing, status), rewritten as the sheet settles, as
 *  savePricing. Returns the change id, or null when nothing differs. */
export function saveSetupChange(opts: {
  changeId: string | null;
  id: string;
  fields: { field: SetupField; from: string; to: string }[];
  value?: { base: number; amount: number; products?: string[] };
}): string | null {
  const s = state;
  const ent = s.entities.find((e) => e.id === opts.id)!;
  const v = opts.value && opts.value.amount !== opts.value.base ? opts.value : null;
  const before = new Map(s.entities.map((e) => [e.id, e.id === opts.id && v ? { ...e, value: v.base } : e]));
  const after = new Map(s.entities.map((e) => [e.id, e.id === opts.id && v ? { ...e, value: v.amount } : e]));
  const entities = v ? s.entities.map((e) => (e.id === opts.id ? { ...e, value: v.amount } : e)) : s.entities;
  const without = s.changes.filter((c) => c.id !== opts.changeId);
  const edits: Edit[] = [
    ...(v ? [{ setting: ent.setting, operation: "edit" as const, entityIds: [opts.id], amount: v.amount, rowIds: [], products: v.products }] : []),
    ...opts.fields.map((f) => ({ setting: ent.setting, operation: "edit" as const, entityIds: [opts.id], rowIds: [], ...f })),
  ];
  if (!edits.length) {
    set({ entities, changes: without });
    return null;
  }
  const proj = project(s.rows, edits, after, before);
  const id = opts.changeId ?? nextId(s);
  const prev = s.changes.find((c) => c.id === opts.changeId);
  const t = prev?.madeAt ?? nowOf(s) + 60_000;
  const rec: ChangeRecord = {
    id,
    title: recordTitle(edits, after),
    edits,
    source: "setup",
    by: CURRENT_USER,
    madeAt: t,
    effectiveAt: t,
    status: "applied",
    noChange: proj.noChange,
    lines: proj.lines,
    orders: ordersFor(proj.lines, new Map(s.rows.map((r) => [r.id, r])), t, id),
  };
  set({ entities, changes: [rec, ...without], tick: prev ? s.tick : s.tick + 1 });
  return id;
}

export function setSetupActive(id: string, active: boolean) {
  const s = state;
  const e = s.entities.find((x) => x.id === id)!;
  const before: SetupSnapshot = { name: e.name, desc: e.desc ?? "", value: e.value, meta: metaOf(e, s.meta) };
  set({ meta: { ...s.meta, [id]: { ...metaOf(e, s.meta), active } }, tick: s.tick + 1 });
  logSetup(id, `status-${nowOf(state)}`, [active ? "Activated" : "Deactivated"], { before, action: active ? "Activated" : "Deactivated" });
  /* …and in the Activity feed, with the ship-tos that use it. */
  saveSetupChange({ changeId: null, id, fields: [{ field: "active", from: active ? "Inactive" : "Active", to: active ? "Active" : "Inactive" }] });
}

/** Write (or rewrite) one sheet session's entry in a record's activity. An
 *  empty list removes it — the sheet is back where it opened. */
export function logSetup(id: string, session: string, changes: string[], opts: { before?: SetupSnapshot; action?: string } = {}) {
  const s = state;
  const list = s.audit[id] ?? [];
  const prev = list.find((a) => a.session === session);
  const rest = list.filter((a) => a.session !== session);
  const entry: SetupAudit = { session, at: prev?.at ?? nowOf(s) + 60_000, by: CURRENT_USER, changes, before: opts.before ?? prev?.before, action: opts.action ?? prev?.action ?? "Edited" };
  const next = changes.length ? [entry, ...rest] : rest;
  set({ audit: { ...s.audit, [id]: next }, tick: prev ? s.tick : s.tick + 1 });
}

export function useChangeLog() {
  const s = React.useSyncExternalStore(subscribe, () => state);
  const entityMap = React.useMemo(() => entityMapOf(s), [s.entities]); // eslint-disable-line react-hooks/exhaustive-deps
  const latestId = React.useMemo(() => latestIdOf(s.changes), [s.changes]);
  return { changes: s.changes, rows: s.rows, customerOwn: s.customerOwn, entities: s.entities, meta: s.meta, audit: s.audit, entityMap, latestId, now: nowOf(s) };
}

/* Seeded after metaOf and its tables exist. */
state = { ...state, meta: SEED_META() };
