import { DASH, dateOffset, daysFromToday, formatDate, money } from "../threepl/directoryCore";
import { gal, type MdAsset } from "./assets";

/*
  THE ASSET'S STORY, AS WORDS — the journey's milestones and the activity
  log's events, built from the asset record. Plain data, no React, so the
  eval can read every line a user will see (guard `repeated-copy`: a detail
  never says again what its title already says — Pavan, 2026-11-03,
  "Received into the fleet at Irving Hub · New unit received").
*/

export const EVENT_TYPES = ["Deliveries", "Service", "Equipment", "Billing", "Movement", "Lease", "Asset"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface ActivityEvent {
  id: string;
  at: string;
  type: EventType;
  source: string;
  event: string;
  detail: string;
  status: string;
}

/**
 * What has happened to the asset, newest first — its history and the real
 * records behind it (deliveries, service orders, inspections, parts fitted,
 * invoices, completed moves, leases). Nothing planned, nothing made up: a
 * row is an event that took place on or before the data's today.
 */
export function activityEvents(a: MdAsset): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const typeOf = (action: string): EventType =>
    /Fuel delivered/.test(action) ? "Deliveries"
      : /Invoice/.test(action) ? "Billing"
        : /^SO-|overdue/i.test(action) ? "Service"
          : /^AMO-|Movement/.test(action) ? "Movement"
            : /^LA-/.test(action) ? "Lease"
              : /Monitor/.test(action) ? "Equipment"
                : "Asset";
  const day = (iso: string) => `${iso.slice(0, 10)}T08:00:00Z`;
  a.audit.forEach((e) => {
    const type = typeOf(e.action);
    out.push({ id: e.id, at: e.at, type, source: e.by, event: e.action, detail: e.changes.join(" · ") || DASH, status: type === "Deliveries" ? "Delivered" : "Done" });
  });
  a.serviceOrders.forEach((o) =>
    out.push({ id: `so-${o.id}`, at: o.scheduled, type: "Service", source: o.technician, event: `${o.id} · ${o.job}`, detail: o.amount === null ? DASH : money(o.amount), status: o.stage }),
  );
  a.compliance.forEach((c) => {
    if (c.last) out.push({ id: `cp-${c.requirement}`, at: day(c.last), type: "Service", source: c.authority, event: c.requirement, detail: `Next due ${formatDate(c.due)}`, status: c.status });
  });
  a.leakChecks.forEach((l) =>
    out.push({ id: `lc-${l.id}`, at: day(l.date), type: "Service", source: l.technician, event: `${l.id} · Leak check`, detail: `${l.method} · ${l.pressure}`, status: l.result }),
  );
  a.peripherals.forEach((p) =>
    out.push({ id: `pr-${p.id}`, at: day(p.installed), type: "Equipment", source: p.model, event: `${p.type} fitted`, detail: `${p.serial} · warranty to ${formatDate(p.warrantyEnds)}`, status: p.status }),
  );
  a.invoices.forEach((i) =>
    out.push({ id: `in-${i.id}`, at: day(i.issued), type: "Billing", source: "Billing", event: `${i.id} · ${i.serviceOrder}`, detail: `${money(i.total)} · due ${formatDate(i.due)}`, status: i.status }),
  );
  a.movements.forEach((m) => {
    if (m.status === "Completed")
      out.push({ id: `mv-${m.id}`, at: day(m.scheduled), type: "Movement", source: m.source, event: `${m.id} · Moved`, detail: `${m.from} → ${m.to}`, status: m.status });
  });
  a.leases.forEach((l) => {
    if (l.from && l.status !== "Draft")
      out.push({ id: `ls-${l.id}`, at: day(l.from), type: "Lease", source: a.customer ?? DASH, event: `${l.id} · Contract started`, detail: l.committedGal ? `${gal(l.committedGal)} committed` : DASH, status: l.status });
  });
  const today = `${dateOffset(0)}T23:59:59Z`;
  const audit = new Set(a.audit.map((e) => e.id));
  return out
    .filter((r) => audit.has(r.id) || r.at <= today)
    .sort((x, y) => y.at.localeCompare(x.at));
}

/* ─────────────────────────────────────────────────────────── journey ── */

export type MilestoneState = "Done" | "Current" | "Upcoming";
export type MilestoneKind = "received" | "placed" | "moved" | "lease" | "workshop" | "end";

export interface Milestone {
  id: string;
  date: string;
  state: MilestoneState;
  kind: MilestoneKind;
  title: string;
  detail: string;
  /** Linked records — a lease, an order. */
  refs: string[];
}

/** Days between two ISO dates — the start date is already on its own milestone. */
const spanDays = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const placeKind = (location: string, note: string, lease: string | null): MilestoneKind =>
  /workshop|refurb/i.test(`${location} ${note}`) ? "workshop" : lease ? "placed" : "moved";

/** Every milestone in the asset's life, past and expected, oldest first. */
export function journeyMilestones(a: MdAsset): Milestone[] {
  const today = dateOffset(0);
  const out: Milestone[] = [];
  a.journey.forEach((p, i) => {
    const current = !p.to;
    const [place, who] = p.location.split(" — ");
    const kind: MilestoneKind = i === 0 ? "received" : placeKind(p.location, p.note, p.lease);
    /* A new lease on this placement — the day its contract started. */
    const started = Boolean(p.lease) && p.lease !== a.journey[i - 1]?.lease;
    /* A SENTENCE, NOT A LOCATION STRING — what happened, then where. */
    const verb =
      i === 0
        ? a.ownership === "Rental" ? "Received into the fleet at" : "Registered at"
        : kind === "workshop"
          ? "In the workshop at"
          : started
            ? "Placed at"
            : "Moved to";
    out.push({
      id: `pl-${i}`,
      date: p.from,
      state: current ? "Current" : "Done",
      kind,
      title: `${verb} ${place}`,
      /* "Agriland FS" is a customer; "yard" is a description — dropped. */
      detail: [
        who && /^[A-Z]/.test(who) ? who : null,
        started ? "Contract started" : null,
        p.note || null,
        /* The date is in its own column — say how long, not when again. */
        current ? `${-(daysFromToday(p.from) ?? 0)} days so far` : `until ${formatDate(p.to)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      refs: [p.lease, p.order].filter((x): x is string => Boolean(x)),
    });
  });
  a.leases.forEach((l) => {
    if (l.status === "Ended" && l.to)
      out.push({ id: `le-${l.id}`, date: l.to, state: "Done", kind: "lease", title: "Contract ended", detail: l.from ? `Ran ${spanDays(l.from, l.to)} days` : DASH, refs: [l.id] });
    if (l.status === "Active" && l.to)
      out.push({ id: `le-${l.id}`, date: l.to, state: "Upcoming", kind: "end", title: "Contract expected to end", detail: l.from ? `Runs ${spanDays(l.from, l.to)} days` : DASH, refs: [l.id] });
    if ((l.status === "Signed" || l.status === "Draft") && l.from)
      out.push({
        id: `ls-${l.id}`,
        date: l.from,
        state: "Upcoming",
        kind: "lease",
        title: l.status === "Draft" ? "Renewal would start" : "Contract starts",
        detail: l.status === "Draft" ? "Drafted, not signed" : "Signed",
        refs: [l.id],
      });
  });
  a.movements.forEach((m) => {
    if ((m.status === "Scheduled" || m.status === "Draft") && m.scheduled >= today)
      out.push({ id: `mv-${m.id}`, date: m.scheduled, state: "Upcoming", kind: "moved", title: `Move to ${m.to}`, detail: `From ${m.from} · ${m.status.toLowerCase()}`, refs: [m.id] });
  });
  return out.sort((x, y) => x.date.localeCompare(y.date));
}
