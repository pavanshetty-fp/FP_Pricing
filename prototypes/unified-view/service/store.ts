import * as React from "react";
import type { ReturnMode } from "./settings";
import {
  SERVICE_ORDERS,
  shortfallLabel,
  splitParts,
  type PartLine,
  type WorkStatus,
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
      .filter((o) => o.technicianId === t.id && o.status !== "Canceled")
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

/** The next free order number. */
export const nextServiceOrderNo = (rows: ServiceOrder[]) =>
  `SO-${Math.max(...rows.map((r) => Number(r.orderNo.slice(3)) || 0)) + 1}`;

const keyOfDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * PARTS MISSING — THE THREE OUTCOMES, in one place (2026-09-24). The board,
 * the order sheet and the phone all call this, so they cannot disagree about
 * what "the rest" becomes. The visit has already been closed by the caller.
 * Returns the new rows and what to tell the reader.
 */
export function resolveShortfall(
  rows: ServiceOrder[],
  id: string,
  data: { parts: PartLine[]; note?: string | null; mode: ReturnMode; nativeBilling: boolean }
): { rows: ServiceOrder[]; title: string; description: string } {
  const order = rows.find((r) => r.id === id);
  if (!order) return { rows, title: "", description: "" };
  const { owed } = splitParts(data.parts);
  const shortfall = shortfallLabel(data.parts);
  const at = new Date().toISOString();
  const note = data.note ?? order.techNotes;

  /* ROLLED OVER — the same order tomorrow, everything kept. */
  if (data.mode === "rollover") {
    /* THE DAY AFTER THE VISIT — tomorrow — at the booking's own time of day. */
    const next = new Date();
    next.setDate(next.getDate() + 1);
    if (order.scheduledAt) {
      const t = new Date(order.scheduledAt);
      next.setHours(t.getHours(), t.getMinutes(), 0, 0);
    }
    return {
      rows: rows.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "Assigned" as WorkStatus,
              parts: data.parts,
              /* THE CALLOUT: an Assigned order that is not a normal one. */
              partNeeded: shortfall,
              techNotes: note,
              arrivedAt: null,
              completedAt: null,
              scheduledAt: next.toISOString(),
              dateKey: keyOfDay(next),
            }
          : r
      ),
      title: `${order.orderNo} rolled over to tomorrow`,
      description: `${shortfall} still owed · same technician.`,
    };
  }

  /* THE REST, AS ITS OWN ORDER — shared by the two outcomes that close this
     one. It starts from nothing but what is owed: labour, mileage and fees
     belong to the visit that happened. No technician and no date. */
  const no = nextServiceOrderNo(rows);
  const linked = data.mode === "neworder";
  const rest: ServiceOrder = {
    ...order,
    id: `so-owed-${no}`,
    orderNo: no,
    status: (linked ? "Linked order" : "Parts pending") as WorkStatus,
    audit: [],
    fault: `Awaiting parts — ${shortfall}`,
    assets: order.assets.map((a) => ({ ...a, fault: `Awaiting parts — ${shortfall}` })),
    parts: owed,
    arrivedAt: null,
    visits: [],
    startedAt: null,
    assessment: null,
    assessmentLines: undefined,
    siteAssessment: undefined,
    /* THE PREVIOUS TECHNICIAN'S NOTES GO WITH IT, so whoever takes it knows. */
    techNotes: note,
    labor: 0,
    laborOverride: null,
    fees: [],
    quote: null,
    extraCharges: [],
    invoiceCreated: false,
    invoicedAt: null,
    synced: false,
    partNeeded: shortfall,
    returnOf: linked ? order.orderNo : null,
    spawnedReturn: null,
    signed: false,
    completedAt: null,
    technicianId: null,
    scheduledAt: null,
    dateKey: keyOfDay(new Date()),
  };
  return {
    rows: [
      rest,
      ...rows.map((r) =>
        r.id === id
          ? {
              ...r,
              parts: data.parts,
              status: (linked ? "Completed — linked" : "Completed") as WorkStatus,
              completedAt: at,
              signed: true,
              partNeeded: null,
              techNotes: note,
              spawnedReturn: linked ? no : null,
              invoiceCreated: data.nativeBilling,
              invoicedAt: data.nativeBilling ? at : null,
            }
          : r
      ),
    ],
    title: `${order.orderNo} completed`,
    description: linked
      ? `New order ${no} carries ${shortfall}, linked back.`
      : `${no} waits in the queue as Parts pending — ${shortfall}.`,
  };
}
