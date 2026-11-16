import * as React from "react";
import { toast } from "sonner";
import {
  CURRENT_USER,
  NOW,
  buildSeed,
  ordersFor,
  project,
  undoProjection,
  type ChangeRecord,
  type ConfigRow,
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
  tick: number;
}

const SEED = buildSeed();
let state: State = { rows: SEED.rows, entities: SEED.entities, changes: SEED.changes, tick: 0 };
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

export function useChangeLog() {
  const s = React.useSyncExternalStore(subscribe, () => state);
  const entityMap = React.useMemo(() => entityMapOf(s), [s.entities]); // eslint-disable-line react-hooks/exhaustive-deps
  const latestId = React.useMemo(() => latestIdOf(s.changes), [s.changes]);
  return { changes: s.changes, rows: s.rows, entityMap, latestId, now: nowOf(s) };
}
