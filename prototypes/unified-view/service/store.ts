import * as React from "react";
import {
  SERVICE_ORDERS,
  TECHNICIANS,
  diffServiceOrder,
  type ServiceOrder,
} from "./work";

/*
  ONE LIST OF SERVICE ORDERS (Pavan, 2026-09-24).

  The dispatch board and the technician's phone read and write the SAME
  orders, so an outcome on one is an outcome on the other: a technician who
  arrives, starts, quotes or finishes moves the order on the board; a
  dispatcher who assigns, reschedules or edits changes the technician's job.

  THE CHANGE LOG IS WRITTEN HERE, round the only setter, so no path — the
  sheet's autosave, the board's acts, the phone's steps, a split, creation —
  can forget. Each write says who made it.
*/

/** An order put back to before anybody started it. */
const notStarted = (o: ServiceOrder): ServiceOrder => ({
  ...o,
  status: "Assigned",
  arrivedAt: null,
  startedAt: null,
  visits: [],
  completedAt: null,
  labor: 0,
  laborOverride: null,
  quote: null,
  assessment: null,
  assessmentLines: undefined,
  signed: false,
  invoiceCreated: false,
  invoicedAt: null,
  synced: false,
  partNeeded: null,
  parts: o.parts.map((p) => ({ ...p, fittedQty: undefined })),
});

/**
 * THE SHARED SEED, arranged for a technician's day (Pavan,
 * 2026-09-24): each technician's FIRST TWO jobs are Yet to start, and NOBODY
 * STARTS WITH AN ONGOING JOB — only one may be Ongoing at a time, so a
 * seeded one would block starting either of them. The first job started
 * becomes the one Ongoing.
 */
export function phoneSeed(all: ServiceOrder[]): ServiceOrder[] {
  const out = all.map((o) => ({ ...o }));
  for (const t of TECHNICIANS) {
    const mine = out
      .filter((o) => o.technicianId === t.id && o.status !== "Cancelled")
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
    const reset = new Set(mine.slice(0, 2).map((o) => o.id));
    for (const o of mine) if (o.status === "Ongoing") reset.add(o.id);
    reset.forEach((id) => {
      const i = out.findIndex((o) => o.id === id);
      out[i] = notStarted(out[i]);
    });
    /* THE FIRST JOB CARRIES SEVERAL TASKS, so the task cards can be seen as a
       list (2026-09-24) — most seeded orders have one. Dummy, and only in the
       phone's copy. */
    const first = mine[0] && out.findIndex((o) => o.id === mine[0].id);
    if (first !== undefined && first >= 0 && out[first].assets.length < 3) {
      const o = out[first];
      const extra = [
        { workType: "Leak check", fault: "Weeping at the bottom collar" },
        { workType: "Hose swap", fault: "Hose kinked and split" },
      ].map((x, k) => ({
        assetId: "",
        assetName: `${o.assetName || "Asset"} — ${k === 0 ? "fill line" : "dispenser"}`,
        assetType: o.assetType,
        ...x,
      }));
      out[first] = { ...o, assets: [...o.assets, ...extra].slice(0, 3) };
    }
  }
  return out;
}


let store: ServiceOrder[] = phoneSeed(SERVICE_ORDERS);
const listeners = new Set<() => void>();

/** Write the orders, logging what changed against `by`. */
export function setServiceOrders(
  fn: (prev: ServiceOrder[]) => ServiceOrder[],
  by: string = "Dana Whitfield"
) {
  const prev = store;
  const next = fn(prev);
  if (next === prev) return;
  const at = new Date().toISOString();
  store = next.map((r) => {
    const before = prev.find((x) => x.id === r.id);
    if (!before)
      return r.audit.length > 0
        ? r
        : {
            ...r,
            audit: [{ at, by, changes: [r.status === "Drafted" ? "Order created as a draft" : "Order created"] }],
          };
    if (before === r) return r;
    /* A DRAFT BEING FILLED IN WRITES NOTHING — the same rule 3PL follows.
       What gets logged is the commitment, not every field on the way. */
    if (before.status === "Drafted" && r.status === "Drafted") return r;
    const changes = diffServiceOrder(before, r);
    return changes.length > 0 ? { ...r, audit: [...r.audit, { at, by, changes }] } : r;
  });
  listeners.forEach((l) => l());
}

export function useServiceOrders(): [ServiceOrder[], typeof setServiceOrders] {
  const rows = React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => store
  );
  return [rows, setServiceOrders];
}
