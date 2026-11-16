import {
  SETTING_LABEL,
  SOURCE_LABEL,
  customerOf,
  shiptoOf,
  uniq,
  type ChangeRecord,
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
export const OUTSIDE_UI: Source[] = ["import"];

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

export type FlagKey = "repeated" | "fees" | "outside";
export const FLAG_LABEL: Record<FlagKey, string> = {
  repeated: "Edited 3+ times",
  fees: "Fees removed",
  outside: "Outside pricing screens",
};

export interface Insight {
  key: string;
  label: string;
  value: string;
  note: string;
}

/** INSIGHTS, READ-ONLY (Yash, 2026-11-16) — the prototype's three, in its words:
 *  what changed most, fees removed and by whom, what came in outside the UI.
 *  Facts to read, not filters: they open nothing. */
export function insightsOf(scope: Scope, ents: EntityMap): Insight[] {
  const top = (list: string[]) => {
    const n: Record<string, number> = {};
    list.forEach((v) => (n[v] = (n[v] ?? 0) + 1));
    const k = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return k ? { name: k, n: n[k] } : null;
  };
  const name = (id: string) => ents.get(id)?.name ?? id;
  /* The record changed most — each change counts once per entity it touched. */
  const most = top(scope.changes.flatMap((x) => uniq(x.lines.flatMap((l) => [...l.beforeIds, ...l.afterIds])).map(name)));
  const removed = scope.changes.flatMap((x) =>
    x.lines
      .filter((l) => l.setting === "fee")
      .flatMap((l) => l.beforeIds.filter((id) => !l.afterIds.includes(id)).map(() => x.c.by))
  );
  const by = top(removed);
  const outside = scope.changes.filter((x) => OUTSIDE_UI.includes(x.c.source)).length;
  return [
    {
      key: "most",
      label: "Changed most",
      value: most ? `${most.n} times` : "—",
      note: most ? `${most.name} — more than anything else here` : "No changes",
    },
    {
      key: "fees",
      label: "Fees removed",
      value: removed.length.toLocaleString(),
      note: by ? `Mostly by ${by.name} — check these were intended` : "None",
    },
    {
      key: "outside",
      label: "Outside the UI",
      value: outside.toLocaleString(),
      note: "Came through import or system sync, not the UI",
    },
  ];
}
