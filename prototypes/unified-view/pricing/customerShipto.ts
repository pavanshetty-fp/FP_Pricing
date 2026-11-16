import {
  SETTING_LABEL,
  SOURCE_LABEL,
  customerOf,
  effectivePrice,
  productOf,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ConfigRow,
  type EntityMap,
  type ImpactLine,
  type Source,
} from "./changeLog";
import { SHIPTOS } from "./seed";

/*
  CHANGE LOG › CUSTOMER & SHIP-TO — the data (Yash, 2026-11-16), after the
  "Customer & ShipTo" tab of pricing-change-log-prototype.html, read off the
  shared change log rather than its own sample events.

  ASSIGNMENT vs INHERITED (PRD §6): a change made on the ship-to's own pricing
  (inline, bulk) or imported is an assignment; an edit to a shared entity in
  Pricing setup, or to the customer's pricing the ship-to follows, is inherited.
*/

export const INHERITED_SOURCES: Source[] = ["setup", "customer"];
export const kindOf = (c: ChangeRecord) => (INHERITED_SOURCES.includes(c.source) ? "Inherited" : "Assignment");
/** Made outside the Pricing screens — bulk upload and imports. */
export const OUTSIDE_UI: Source[] = ["shiptoBulk", "import"];

export interface Scope {
  /** The ship-tos in view, by id. */
  shiptos: string[];
  set: Set<string>;
  /** Changes that touch them, newest first, with the lines that do. */
  changes: { c: ChangeRecord; lines: ImpactLine[] }[];
}

export function scopeOf(changes: ChangeRecord[], customerIds: string[], shiptoIds: string[], inWindow: (c: ChangeRecord) => boolean): Scope {
  const shiptos = shiptoIds.length ? shiptoIds : SHIPTOS.filter((s) => customerIds.includes(s.customerId)).map((s) => s.id);
  const set = new Set(shiptos);
  const scoped = changes
    .filter(inWindow)
    .map((c) => ({ c, lines: c.lines.filter((l) => set.has(l.shiptoId)) }))
    .filter((x) => x.lines.length > 0)
    .sort((a, b) => b.c.effectiveAt - a.c.effectiveAt);
  return { shiptos, set, changes: scoped };
}

/** Did it take effect — the changes a price "now" is made of. */
const tookEffect = (c: ChangeRecord) => c.status === "applied" || c.status === "partlyFailed" || c.status === "undone";

export interface WhereRow {
  key: string;
  name: string;
  sub: string;
  changes: number;
  assignment: number;
  inherited: number;
  last: number | null;
  lastBy: string;
}

/** Several ship-tos: changes per ship-to. One ship-to: per entity. */
export function whereOf(scope: Scope): { by: "shipto" | "entity"; rows: WhereRow[] } {
  const row = (key: string, name: string, sub: string, list: ChangeRecord[]): WhereRow => ({
    key,
    name,
    sub,
    changes: list.length,
    assignment: list.filter((c) => kindOf(c) === "Assignment").length,
    inherited: list.filter((c) => kindOf(c) === "Inherited").length,
    last: list[0]?.effectiveAt ?? null,
    lastBy: list[0]?.by ?? "",
  });
  if (scope.shiptos.length > 1) {
    return {
      by: "shipto",
      rows: scope.shiptos
        .map((id) => row(id, shiptoOf(id).name, customerOf(shiptoOf(id).customerId).name, scope.changes.filter((x) => x.lines.some((l) => l.shiptoId === id)).map((x) => x.c)))
        .filter((r) => r.changes > 0)
        .sort((a, b) => b.changes - a.changes),
    };
  }
  const settings = uniq(scope.changes.flatMap((x) => x.lines.map((l) => l.setting)));
  return {
    by: "entity",
    rows: settings
      .map((st) => row(st, SETTING_LABEL[st], "", scope.changes.filter((x) => x.lines.some((l) => l.setting === st)).map((x) => x.c)))
      .sort((a, b) => b.changes - a.changes),
  };
}

export interface WhoRow {
  name: string;
  changes: number;
  mostly: string;
  via: string;
  last: number;
}

export function whoOf(scope: Scope): WhoRow[] {
  const people = uniq(scope.changes.map((x) => x.c.by));
  return people
    .map((name) => {
      const mine = scope.changes.filter((x) => x.c.by === name);
      const count: Record<string, number> = {};
      mine.forEach((x) => uniq(x.lines.map((l) => SETTING_LABEL[l.setting])).forEach((s) => (count[s] = (count[s] ?? 0) + 1)));
      const top = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 2);
      return {
        name,
        changes: mine.length,
        mostly: top.join(" & "),
        via: uniq(mine.map((x) => SOURCE_LABEL[x.c.source])).join(", "),
        last: mine[0].c.effectiveAt,
      };
    })
    .sort((a, b) => b.changes - a.changes);
}

export interface ThenNowRow {
  id: string;
  shipto: string;
  customer: string;
  product: string;
  then: number;
  now: number;
  delta: number;
  why: string;
}

/** Each ship-to × product: its configured price at the start of the window
 *  and now, and what moved it — biggest moves first. */
export function thenNowOf(scope: Scope, rows: ConfigRow[], ents: EntityMap): ThenNowRow[] {
  const moved = new Map<string, ImpactLine[]>();
  scope.changes
    .filter((x) => tookEffect(x.c))
    .forEach((x) => x.lines.filter((l) => l.outcome === "changed").forEach((l) => moved.set(l.rowId, [...(moved.get(l.rowId) ?? []), l])));
  return rows
    .filter((r) => scope.set.has(r.shiptoId) && r.configured)
    .map((r) => {
      const lines = moved.get(r.id) ?? [];
      const delta = Math.round(lines.reduce((t, l) => t + l.delta, 0) * 10000) / 10000;
      const now = effectivePrice(r, ents);
      const count: Record<string, number> = {};
      lines.forEach((l) => (count[SETTING_LABEL[l.setting]] = (count[SETTING_LABEL[l.setting]] ?? 0) + 1));
      return {
        id: r.id,
        shipto: shiptoOf(r.shiptoId).name,
        customer: customerOf(r.customerId).name,
        product: productOf(r.productId).name,
        then: now - delta,
        now,
        delta,
        why: Object.entries(count)
          .map(([k, n]) => (n > 1 ? `${k} ×${n}` : k))
          .join(" · "),
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/*
  INSIGHTS — the prototype's "worth a review" flags, short (Yash, 2026-11-16:
  "too text heavy"). Each is a count of CHANGES with one fact under it, and
  each is a Timeline facet, so pressing it shows exactly the changes it counts.
*/
export type FlagKey = "repeated" | "fees" | "outside";
export const FLAG_LABEL: Record<FlagKey, string> = {
  repeated: "Edited 3+ times",
  fees: "Fees removed",
  outside: "Outside pricing screens",
};

export interface Insight {
  key: FlagKey;
  label: string;
  count: number;
  note: string;
}

/** Which flags each change in scope carries. */
export function flagsOf(scope: Scope): Map<string, Set<FlagKey>> {
  const flags = new Map<string, Set<FlagKey>>();
  const add = (id: string, f: FlagKey) => flags.set(id, new Set([...(flags.get(id) ?? []), f]));
  const rep = new Map<string, string[]>();
  scope.changes.forEach((x) => uniq(x.lines.map((l) => `${l.setting}|${l.rowId}`)).forEach((k) => rep.set(k, [...(rep.get(k) ?? []), x.c.id])));
  rep.forEach((ids) => ids.length >= 3 && ids.forEach((id) => add(id, "repeated")));
  scope.changes.forEach((x) => {
    if (x.lines.some((l) => l.setting === "fee" && l.beforeIds.some((id) => !l.afterIds.includes(id)))) add(x.c.id, "fees");
    if (OUTSIDE_UI.includes(x.c.source)) add(x.c.id, "outside");
  });
  return flags;
}

export function insightsOf(scope: Scope, flags: Map<string, Set<FlagKey>>): Insight[] {
  const of = (f: FlagKey) => scope.changes.filter((x) => flags.get(x.c.id)?.has(f)).map((x) => x.c);
  const top = (list: string[]) => {
    const n: Record<string, number> = {};
    list.forEach((v) => (n[v] = (n[v] ?? 0) + 1));
    return Object.keys(n).sort((a, b) => n[b] - n[a]);
  };
  const repeated = of("repeated");
  const fees = of("fees");
  const outside = of("outside");
  return [
    { key: "repeated", label: FLAG_LABEL.repeated, count: repeated.length, note: repeated.length ? `Mostly ${top(repeated.flatMap((c) => uniq(c.lines.map((l) => SETTING_LABEL[l.setting]))))[0]}` : "None" },
    { key: "fees", label: FLAG_LABEL.fees, count: fees.length, note: fees.length ? `Mostly by ${top(fees.map((c) => c.by))[0]}` : "None" },
    {
      key: "outside",
      label: FLAG_LABEL.outside,
      count: outside.length,
      note: outside.length ? top(outside.map((c) => SOURCE_LABEL[c.source])).map((k) => `${k}: ${outside.filter((c) => SOURCE_LABEL[c.source] === k).length}`).join(" · ") : "None",
    },
  ];
}
