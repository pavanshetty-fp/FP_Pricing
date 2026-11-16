import {
  SETTING_LABEL,
  SOURCE_LABEL,
  customerOf,
  effectivePrice,
  fmtDate,
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

export interface Insight {
  key: string;
  title: string;
  count: number;
  /** A fact about the set, not an explanation. */
  why?: string;
  items: string[];
}

/** WORTH A REVIEW — the prototype's flags, read off the log. */
export function insightsOf(scope: Scope, ents: EntityMap): Insight[] {
  const out: Insight[] = [];
  const name = (id: string) => ents.get(id)?.name ?? id;

  const rep = new Map<string, number[]>();
  scope.changes.forEach((x) =>
    uniq(x.lines.map((l) => `${l.setting}|${l.rowId}`)).forEach((k) => rep.set(k, [...(rep.get(k) ?? []), x.c.effectiveAt]))
  );
  const repeated = [...rep].filter(([, ts]) => ts.length >= 3).sort((a, b) => b[1].length - a[1].length);
  if (repeated.length) {
    const lineOf = (k: string) => scope.changes.flatMap((x) => x.lines).find((l) => `${l.setting}|${l.rowId}` === k)!;
    out.push({
      key: "repeated",
      title: "Edited repeatedly",
      count: repeated.length,
      items: repeated.slice(0, 3).map(([k, ts]) => {
        const l = lineOf(k);
        return `${SETTING_LABEL[l.setting]} on ${shiptoOf(l.shiptoId).name} · ${productOf(l.productId).name} — ${ts.length} times, last ${fmtDate(ts[0])}`;
      }),
    });
  }

  const removed = scope.changes.flatMap((x) =>
    x.lines
      .filter((l) => l.setting === "fee" && l.beforeIds.some((id) => !l.afterIds.includes(id)))
      .map((l) => ({ l, c: x.c }))
  );
  if (removed.length) {
    const by: Record<string, number> = {};
    removed.forEach(({ c }) => (by[c.by] = (by[c.by] ?? 0) + 1));
    const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0];
    out.push({
      key: "fees",
      title: "Fees removed",
      count: removed.length,
      why: removed.length > 1 ? `Mostly by ${top}` : `By ${top}`,
      items: removed.slice(0, 3).map(
        ({ l, c }) =>
          `${l.beforeIds.filter((id) => !l.afterIds.includes(id)).map(name).join(", ")} from ${shiptoOf(l.shiptoId).name} · ${productOf(l.productId).name} (${fmtDate(c.effectiveAt)}, ${c.by})`
      ),
    });
  }

  const outside = scope.changes.filter((x) => OUTSIDE_UI.includes(x.c.source));
  if (outside.length) {
    const by: Record<string, number> = {};
    outside.forEach((x) => (by[SOURCE_LABEL[x.c.source]] = (by[SOURCE_LABEL[x.c.source]] ?? 0) + 1));
    out.push({
      key: "outside",
      title: "Changed outside the pricing screens",
      count: outside.length,
      items: Object.entries(by).map(([k, n]) => `${k}: ${n} ${n === 1 ? "change" : "changes"}`),
    });
  }
  return out;
}
