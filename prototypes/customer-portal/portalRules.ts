import * as React from "react";
import { toast } from "sonner";
import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "../unified-view/data";
import { toSchedule, type RuleFrequency } from "../unified-view/threepl/RuleFrequency";
import type { Schedule } from "../unified-view/threepl/recurring";
import {
  PORTAL_ACTOR,
  allRequests,
  assetById,
  dateOfKey,
  insertRequests,
  nextRequestNo,
  updateRequest,
  type OrderRequest,
  type RequestLine,
  type TimeSpan,
} from "./orders";

/*
  THE CUSTOMER'S RECURRING RULE (Pavan, 2026-10-16) — set it once, and the
  orders keep coming. One ship-to per rule. The rule says WHEN (the 3PL
  frequency picker: days, dates, daily, weekdays, custom cycle), WHAT (tanks,
  products, quantities or Top off), and HOW ITS ORDERS ARE MADE:

    lead days    each order is made this many days before its date (7, as 3PL)
    off days     a date on a weekend or holiday runs anyway, is skipped, or
                 moves to the next working day
    PO           one standing PO on every order, or each order asks for one
    remind       a notification as each order is made

  THE ORDERS ARE DRAFTS. The rule makes each one as an ordinary order request
  in Draft, marked with the rule; the customer sends it to the supplier from
  there. The supplier approves nothing about the rule — it is the customer's
  workflow. Once made, an order is its own record: editing it never changes
  the rule, and editing the rule changes only dates not yet made. Skipped
  dates and a paused rule make nothing. INVENTED where seeded.
*/

export type RuleStatus = "Active" | "Paused" | "Ended";
export const RULE_STATUSES: RuleStatus[] = ["Active", "Paused", "Ended"];
export type OffDays = "run" | "skip" | "next";
export const OFF_DAYS: { value: OffDays; label: string }[] = [
  { value: "run", label: "Deliver anyway" },
  { value: "skip", label: "Skip that delivery" },
  { value: "next", label: "Move to the next working day" },
];
export const LEAD_DAYS = [3, 5, 7, 14];

export interface PortalRule {
  id: string;
  ruleNo: string;
  name: string;
  shipTo: string;
  frequency: RuleFrequency;
  /** `yyyy-mm-dd` — the first day it may run. */
  startKey: string;
  /** End after this many deliveries — null for no count (the end date, if
      any, is the frequency's). */
  endAfter: number | null;
  windowStart: number;
  windowEnd: number;
  /** Preferred windows inside the delivery window; its orders inherit them. */
  preferred: TimeSpan[];
  lines: RequestLine[];
  instructions: string;
  leadDays: number;
  offDays: OffDays;
  po: { mode: "standing" | "each"; number: string };
  remind: boolean;
  status: RuleStatus;
  skipped: string[];
  createdAt: string;
  audit: { at: string; by: string; changes: string[] }[];
}

/** Weekends, and the holidays the tenant closes on. INVENTED. */
const HOLIDAYS = ["2026-11-26", "2026-12-25", "2027-01-01"];
const isOffDay = (d: Date) => d.getDay() === 0 || d.getDay() === 6 || HOLIDAYS.includes(dateKeyOf(d));

export const scheduleOfRule = (r: PortalRule): Schedule => toSchedule(r.frequency);

/**
 * THE DATES A RULE RUNS ON — from its start, after the off-day rule, up to
 * its end date or its count, within `days` of today. Skipped dates are
 * returned with `skipped` so a list can show them.
 */
export function runDates(r: PortalRule, days = 31, from = startOfDay(new Date())) {
  const sched = scheduleOfRule(r);
  const start = dateOfKey(r.startKey) ?? from;
  const end = r.frequency.endKey ? dateOfKey(r.frequency.endKey) : null;
  const out: { key: string; skipped: boolean }[] = [];
  const seen = new Set<string>();
  let count = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (end && d > end) break;
    if ((d.getTime() - from.getTime()) / 86_400_000 > days) break;
    if (!sched.hits(d)) continue;
    let run = d;
    if (isOffDay(d)) {
      if (r.offDays === "skip") continue;
      if (r.offDays === "next") {
        run = new Date(d);
        while (isOffDay(run)) run.setDate(run.getDate() + 1);
      }
    }
    const key = dateKeyOf(run);
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
    if (r.endAfter && count > r.endAfter) break;
    if (run < from) continue;
    out.push({ key, skipped: r.skipped.includes(key) });
  }
  return out;
}

const dayLabel = (key: string) => {
  const d = dateOfKey(key)!;
  const today = startOfDay(new Date());
  return { title: DATE_FMT.format(d), description: relativeLabel(Math.round((d.getTime() - today.getTime()) / 86_400_000), d) };
};
export { dayLabel as ruleDayLabel };

/* ------------------------------------------------------------- store --- */

let rules: PortalRule[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useRules(): PortalRule[] {
  return React.useSyncExternalStore(subscribe, () => rules);
}
export const allRules = () => rules;

const audit = (r: PortalRule, change: string): PortalRule => ({
  ...r,
  audit: [...r.audit, { at: new Date().toISOString(), by: PORTAL_ACTOR, changes: [change] }],
});

export function blankRule(): PortalRule {
  const n = 2000 + rules.length + 1;
  const today = dateKeyOf(startOfDay(new Date()));
  return {
    id: `rule-${n}-${Date.now()}`,
    ruleNo: `R-${n}`,
    /* ITS NUMBER UNTIL RENAMED — as 3PL's rule (Pavan, 2026-10-16). */
    name: `R-${n}`,
    shipTo: "",
    frequency: {
      dayMode: "specific",
      days: [2],
      repeat: "weekly",
      times: ["08:00"],
      basis: "days",
      dates: [],
      dateRepeat: 1,
      monthWeeks: [1],
      yearlyMode: "firstMonth",
      months: [0],
      endKey: null,
    },
    startKey: today,
    endAfter: null,
    windowStart: 8 * 60,
    windowEnd: 12 * 60,
    preferred: [],
    lines: [{ assetId: "", product: "", topOff: false, gal: 0 }],
    instructions: "",
    leadDays: 7,
    offDays: "run",
    po: { mode: "standing", number: "" },
    remind: true,
    status: "Active",
    skipped: [],
    createdAt: new Date().toISOString(),
    audit: [],
  };
}

export function saveRule(r: PortalRule, isNew: boolean) {
  rules = isNew
    ? [audit(r, "Rule created"), ...rules]
    : rules.map((x) => (x.id === r.id ? audit(r, "Rule changed — from the next order not yet made") : x));
  emit();
  generate(true);
}
export function setRuleStatus(id: string, status: RuleStatus) {
  rules = rules.map((x) => (x.id === id ? audit({ ...x, status }, `Rule ${status === "Active" ? "resumed" : status.toLowerCase()}`) : x));
  emit();
  if (status === "Active") generate(true);
}
export function toggleRuleSkip(id: string, key: string) {
  rules = rules.map((x) =>
    x.id !== id
      ? x
      : audit(
          { ...x, skipped: x.skipped.includes(key) ? x.skipped.filter((k) => k !== key) : [...x.skipped, key] },
          `${x.skipped.includes(key) ? "Back on" : "Skipped"} · ${DATE_FMT.format(dateOfKey(key)!)}`
        )
  );
  emit();
}

/* ---------------------------------------------------------- generator --- */

/**
 * MAKE WHAT IS DUE. For each active rule, every run date from today to its
 * lead days ahead that has no order yet becomes a Draft order request, marked
 * with the rule. Once per rule and date (the id is both), so an order already
 * made is never made again and the customer's edits to it stand.
 */
export function generate(say = false) {
  const today = startOfDay(new Date());
  const existing = allRequests();
  const made: OrderRequest[] = [];
  let no = nextRequestNo();
  for (const r of rules) {
    if (r.status !== "Active" || !r.shipTo) continue;
    for (const d of runDates(r, r.leadDays, today)) {
      if (d.skipped) continue;
      const id = `${r.id}-${d.key}`;
      if (existing.some((x) => x.id === id || (x.ruleId === r.id && x.date === d.key))) continue;
      const at = new Date().toISOString();
      made.push({
        id,
        requestNo: `ORD-${no++}`,
        shipTo: r.shipTo,
        lines: r.lines
          .filter((l) => l.product)
          .map((l) => {
            const a = assetById(l.assetId);
            return a?.monitor ? { ...l, levelAtOrder: a.level } : { ...l };
          }),
        date: d.key,
        windowStart: r.windowStart,
        windowEnd: r.windowEnd,
        preferred: r.preferred.map((p) => ({ ...p })),
        po: r.po.mode === "standing" ? r.po.number : "",
        instructions: r.instructions,
        recurring: false,
        frequency: "",
        endDate: "",
        status: "Draft",
        flags: [],
        documents: [],
        ruleId: r.id,
        ruleNo: r.ruleNo,
        updatedAt: at,
        audit: [{ at, by: "System — Recurring", changes: [`Made from rule ${r.ruleNo}`] }],
      });
    }
  }
  if (made.length === 0) return;
  insertRequests(made);
  if (say)
    for (const m of made.slice(0, 3)) {
      const r = rules.find((x) => x.id === m.ruleId);
      if (r?.remind) toast(`${m.requestNo} made from ${r.ruleNo} — a draft to review and send`);
    }
}

/* -------------------------------------------------------------- seed --- */

/*
  THE ACCOUNT'S STANDING ORDERS, AS RULES — one per recurring order on the
  seed, that order its first. INVENTED.
*/
{
  const weekday = (key: string) => (dateOfKey(key) ?? new Date()).getDay();
  for (const q of allRequests().filter((x) => x.recurring && x.status !== "Draft")) {
    const wd = weekday(q.date);
    const n = 2001 + rules.length;
    const base = blankRule();
    const frequency: RuleFrequency =
      q.frequency === "Every 2 weeks"
        ? { ...base.frequency, days: [wd], repeat: "cycle", cycleWeeks: [[wd], []], cycleStartKey: q.date }
        : q.frequency === "Monthly"
          ? { ...base.frequency, days: [wd], repeat: "monthly", monthWeeks: [Math.min(4, Math.floor(((dateOfKey(q.date) ?? new Date()).getDate() - 1) / 7) + 1)] }
          : { ...base.frequency, days: [wd], repeat: "weekly" };
    const rule: PortalRule = {
      ...base,
      id: `rule-${n}`,
      ruleNo: `R-${n}`,
      name: `R-${n}`,
      shipTo: q.shipTo,
      frequency,
      startKey: q.date,
      windowStart: q.windowStart,
      windowEnd: q.windowEnd,
      preferred: q.preferred.map((p) => ({ ...p })),
      lines: q.lines.map((l) => ({ ...l })),
      po: { mode: q.po ? "standing" : "each", number: q.po },
      createdAt: q.audit?.[0]?.at ?? new Date().toISOString(),
      audit: [{ at: q.audit?.[0]?.at ?? new Date().toISOString(), by: PORTAL_ACTOR, changes: ["Rule created"] }],
    };
    rules = [...rules, rule];
    updateRequest(q.id, { ruleId: rule.id, ruleNo: rule.ruleNo });
  }
  generate(false);
}
