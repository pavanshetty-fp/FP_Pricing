import {
  SETTING_LABEL,
  SOURCE_LABEL,
  customerOf,
  plural,
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

// ------------------------------------------------- round 5 (2026-11-17) --

/** HOW A CHANGE WAS MADE — the Timeline's word for its source. */
export const METHOD_LABEL: Record<Source, string> = {
  shiptoInline: "Manual",
  customer: "Manual · Customer pricing",
  shiptoBulk: "Bulk",
  setup: "Pricing setup",
  import: "Import",
};

export type InsightTheme = "attention" | "activity" | "pattern";
export const THEME_LABEL: Record<InsightTheme, string> = { attention: "Needs a look", activity: "Activity", pattern: "Patterns" };

/** An insight in three lengths: a figure (`value`), a short `note` under it,
 *  and the whole `sentence` for the descriptive version. */
export interface RichInsight extends Insight {
  theme: InsightTheme;
  sentence: string;
}

const fmtDay = (t: number) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(t);
const usd = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(n).toFixed(3)}`;

/**
 * TEN INSIGHTS (Yash, 2026-11-17) — numbers and verbs, so each version of
 * the card is tried at its real load. Read-only facts; they open nothing.
 */
export function insightsAll(scope: Scope, ents: EntityMap, scheduledAhead: ChangeRecord[]): RichInsight[] {
  const tally = (list: string[]) => {
    const n: Record<string, number> = {};
    list.forEach((v) => (n[v] = (n[v] ?? 0) + 1));
    return Object.keys(n)
      .sort((a, b) => n[b] - n[a])
      .map((k) => ({ name: k, n: n[k] }));
  };
  const name = (id: string) => ents.get(id)?.name ?? id;
  const all = scope.changes;
  const most = tally(all.flatMap((x) => uniq(x.lines.flatMap((l) => [...l.beforeIds, ...l.afterIds])).map(name)))[0];
  const removedBy = all.flatMap((x) =>
    x.lines.filter((l) => l.setting === "fee").flatMap((l) => l.beforeIds.filter((id) => !l.afterIds.includes(id)).map(() => x.c.by))
  );
  const remover = tally(removedBy)[0];
  const outside = all.filter((x) => OUTSIDE_UI.includes(x.c.source));
  const failed = all.flatMap((x) => x.lines.filter((l) => l.outcome === "failed"));
  const failedShiptos = uniq(failed.map((l) => l.shiptoId));
  const ahead = scheduledAhead.filter((c) => c.lines.some((l) => scope.set.has(l.shiptoId))).sort((a, b) => a.effectiveAt - b.effectiveAt);
  const days = tally(all.filter((x) => x.c.status !== "scheduled").map((x) => fmtDay(x.c.effectiveAt)))[0];
  const person = tally(all.map((x) => x.c.by))[0];
  const moves = all.flatMap((x) => x.lines.filter((l) => l.outcome === "changed" && l.delta !== 0).map((l) => l.delta));
  const avg = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : 0;
  const ship = tally(all.flatMap((x) => uniq(x.lines.map((l) => l.shiptoId))))[0];
  const bulk = all.filter((x) => x.c.source === "shiptoBulk").length;
  const pct = all.length ? Math.round((bulk / all.length) * 100) : 0;

  return [
    {
      key: "failed",
      theme: "attention",
      label: "Failed prices",
      value: failed.length.toLocaleString(),
      note: failed.length ? `At ${plural(failedShiptos.length, "ship-to")}` : "None",
      sentence: failed.length
        ? `${plural(failed.length, "price")} at ${plural(failedShiptos.length, "ship-to")} did not update and still carry the old value.`
        : "Every change here went through.",
    },
    {
      key: "fees",
      theme: "attention",
      label: "Fees removed",
      value: removedBy.length.toLocaleString(),
      note: remover ? `Mostly by ${remover.name}` : "None",
      sentence: remover
        ? `${plural(removedBy.length, "fee")} came off prices, ${remover.n} of them by ${remover.name} — check these were intended.`
        : "No fee was taken off a price.",
    },
    {
      key: "outside",
      theme: "attention",
      label: "Outside the UI",
      value: outside.length.toLocaleString(),
      note: "Import or system sync",
      sentence: outside.length
        ? `${plural(outside.length, "change")} came through import or system sync, not the pricing screens.`
        : "Every change was made in the pricing screens.",
    },
    {
      key: "most",
      theme: "pattern",
      label: "Changed most",
      value: most ? `${most.n} times` : "—",
      note: most ? most.name : "No changes",
      sentence: most ? `${most.name} changed ${most.n} times — more than anything else here.` : "Nothing changed.",
    },
    {
      key: "shipto",
      theme: "pattern",
      label: "Busiest ship-to",
      value: ship ? shiptoOf(ship.name).name : "—",
      note: ship ? plural(ship.n, "change") : "None",
      sentence: ship ? `${shiptoOf(ship.name).name} (${customerOf(shiptoOf(ship.name).customerId).name}) was changed ${ship.n} times.` : "No ship-to changed.",
    },
    {
      key: "move",
      theme: "pattern",
      label: "Average move",
      value: moves.length ? `${usd(avg)}/gal` : "—",
      note: moves.length ? `Across ${plural(moves.length, "price")}` : "No price moved",
      sentence: moves.length
        ? `Prices moved ${usd(avg)}/gal on average across ${plural(moves.length, "price")} that changed in value.`
        : "No change moved a price's value.",
    },
    {
      key: "bulk",
      theme: "pattern",
      label: "Made in bulk",
      value: `${pct}%`,
      note: `${plural(bulk, "change")} of ${all.length.toLocaleString()}`,
      sentence: `${pct}% of changes were made in bulk; the rest one ship-to at a time, in Pricing setup or by import.`,
    },
    {
      key: "busiest",
      theme: "activity",
      label: "Busiest day",
      value: days ? days.name : "—",
      note: days ? plural(days.n, "change") : "None",
      sentence: days ? `${days.name} had the most changes: ${days.n}.` : "No changes in these dates.",
    },
    {
      key: "person",
      theme: "activity",
      label: "Most changes by",
      value: person ? person.name : "—",
      note: person ? plural(person.n, "change") : "None",
      sentence: person ? `${person.name} made ${plural(person.n, "change")} — more than anyone else here.` : "Nobody made a change.",
    },
    {
      key: "ahead",
      theme: "activity",
      label: "Scheduled ahead",
      value: ahead.length.toLocaleString(),
      note: ahead.length ? `Next ${fmtDay(ahead[0].effectiveAt)}` : "None",
      sentence: ahead.length ? `${plural(ahead.length, "change")} are scheduled; the next applies ${fmtDay(ahead[0].effectiveAt)}.` : "Nothing is scheduled.",
    },
  ] as RichInsight[];
}

/** A bar in a drill card: a name, its changes, and what a press opens. */
export interface DrillBar {
  key: string;
  label: string;
  value: number;
  detail: string;
}

const lastOf = (list: ChangeRecord[]) => (list[0] ? fmtDay(list[0].effectiveAt) : "—");

/** WHERE: customers → a customer's ship-tos → one ship-to's named items. */
export function whereLevel(scope: Scope, ents: EntityMap, path: { customer?: string; shipto?: string }): DrillBar[] {
  if (path.shipto) {
    const lines = scope.changes.map((x) => ({ c: x.c, lines: x.lines.filter((l) => l.shiptoId === path.shipto) })).filter((x) => x.lines.length);
    const items = new Map<string, { type: string; list: ChangeRecord[] }>();
    for (const x of lines)
      for (const l of x.lines)
        for (const id of uniq([...l.beforeIds, ...l.afterIds])) {
          const it = items.get(id) ?? { type: SETTING_LABEL[l.setting], list: [] };
          if (!it.list.includes(x.c)) it.list.push(x.c);
          items.set(id, it);
        }
    return [...items].map(([id, it]) => ({ key: id, label: ents.get(id)?.name ?? id, value: it.list.length, detail: `${it.type} · last ${lastOf(it.list)}` }));
  }
  if (path.customer) {
    const ids = scope.shiptos.filter((id) => shiptoOf(id).customerId === path.customer);
    return ids.map((id) => {
      const list = scope.changes.filter((x) => x.lines.some((l) => l.shiptoId === id)).map((x) => x.c);
      return { key: id, label: shiptoOf(id).name, value: list.length, detail: `Last ${lastOf(list)} · ${list[0]?.by ?? ""}` };
    });
  }
  const custs = uniq(scope.shiptos.map((id) => shiptoOf(id).customerId));
  return custs.map((cid) => {
    const mine = scope.changes.filter((x) => x.lines.some((l) => l.customerId === cid));
    const list = mine.map((x) => x.c);
    const ships = uniq(mine.flatMap((x) => x.lines.filter((l) => l.customerId === cid).map((l) => l.shiptoId))).length;
    return { key: cid, label: customerOf(cid).name, value: list.length, detail: `${plural(ships, "ship-to")} · last ${lastOf(list)}` };
  });
}

/** WHO: people → a person's customers → that customer's ship-tos they changed. */
export function whoLevel(scope: Scope, path: { person?: string; customer?: string }): DrillBar[] {
  if (!path.person) {
    return whoOf(scope).map((p) => ({ key: p.name, label: p.name, value: p.changes, detail: `Mostly ${p.mostly} · ${p.via}` }));
  }
  const mine = scope.changes.filter((x) => x.c.by === path.person);
  if (path.customer) {
    const ids = uniq(mine.flatMap((x) => x.lines.filter((l) => l.customerId === path.customer).map((l) => l.shiptoId)));
    return ids.map((id) => {
      const list = mine.filter((x) => x.lines.some((l) => l.shiptoId === id)).map((x) => x.c);
      return { key: id, label: shiptoOf(id).name, value: list.length, detail: `Last ${lastOf(list)} · ${list[0]?.by ?? ""}` };
    });
  }
  const custs = uniq(mine.flatMap((x) => x.lines.map((l) => l.customerId)));
  return custs.map((cid) => {
    const hit = mine.filter((x) => x.lines.some((l) => l.customerId === cid));
    const ships = uniq(hit.flatMap((x) => x.lines.filter((l) => l.customerId === cid).map((l) => l.shiptoId))).length;
    return { key: cid, label: customerOf(cid).name, value: hit.length, detail: `${plural(ships, "ship-to")} · last ${lastOf(hit.map((x) => x.c))}` };
  });
}
