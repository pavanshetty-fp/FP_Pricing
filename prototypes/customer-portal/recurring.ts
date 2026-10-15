import * as React from "react";
import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "../unified-view/data";
import { parseSchedule, type Schedule } from "../unified-view/threepl/recurring";
import { dateOfKey, type OrderRequest } from "./orders";

/*
  RECURRING ORDERS, THE 3PL WAY (Pavan, 2026-10-15) — one row per series,
  opening onto its deliveries, as on 3PL's Recurring Orders. A series is a
  recurring request; its first delivery is that request, the rest are the
  dates its frequency hits next (a month out). The customer can pause or
  resume a series, end it, or skip one coming date — the tenant makes each
  order as its date comes. Statuses as 3PL: Active · Paused · Ended.
*/

export type SeriesStatus = "Active" | "Paused" | "Ended";
export const SERIES_STATUSES: SeriesStatus[] = ["Active", "Paused", "Ended"];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NTH = ["First", "Second", "Third", "Fourth"];

/** The portal's frequency, read the way 3PL reads its own. */
export function scheduleOf(r: OrderRequest): Schedule {
  const d = dateOfKey(r.date) ?? startOfDay(new Date());
  const wd = WEEKDAYS[d.getDay()];
  const raw =
    r.frequency === "Daily"
      ? "Daily"
      : r.frequency.startsWith("Every weekday")
        ? "Every Weekday (Monday To Friday)"
        : r.frequency === "Weekly"
          ? `Weekly On ${wd}`
          : r.frequency === "Monthly"
            ? `Monthly On ${NTH[Math.min(3, Math.floor((d.getDate() - 1) / 7))]} ${wd}`
            : /* Every 2 weeks — 3PL reads "Custom" as fortnightly on the start day. */ "Custom";
  return parseSchedule(raw, r.date || dateKeyOf(d));
}

export interface SeriesDelivery {
  key: string;
  dateKey: string;
  date: { title: string; description: string };
  /** The request itself — the first delivery. */
  request?: OrderRequest;
  skipped: boolean;
}

export interface Series {
  id: string;
  request: OrderRequest;
  schedule: Schedule;
  status: SeriesStatus;
  deliveries: SeriesDelivery[];
  nextKey: string | null;
}

/* THE CUSTOMER'S CHANGES — paused, ended, skipped dates. */
interface Override {
  paused?: boolean;
  ended?: boolean;
  skipped?: string[];
}
let overrides: Record<string, Override> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useSeriesOverrides() {
  return React.useSyncExternalStore(subscribe, () => overrides);
}
function patch(id: string, p: Override) {
  overrides = { ...overrides, [id]: { ...overrides[id], ...p } };
  emit();
}
export const setPaused = (id: string, paused: boolean) => patch(id, { paused });
export const endSeries = (id: string) => patch(id, { ended: true });
export function toggleSkip(id: string, dateKey: string) {
  const s = overrides[id]?.skipped ?? [];
  patch(id, { skipped: s.includes(dateKey) ? s.filter((k) => k !== dateKey) : [...s, dateKey] });
}

const HORIZON_DAYS = 31;

export function buildSeries(r: OrderRequest, o: Override = {}): Series {
  const schedule = scheduleOf(r);
  const today = startOfDay(new Date());
  const start = dateOfKey(r.date) ?? today;
  const status: SeriesStatus = o.ended ? "Ended" : o.paused ? "Paused" : "Active";
  const label = (d: Date) => ({
    title: DATE_FMT.format(d),
    description: relativeLabel(Math.round((d.getTime() - today.getTime()) / 86_400_000), d),
  });
  const deliveries: SeriesDelivery[] = [{ key: r.id, dateKey: r.date, date: label(start), request: r, skipped: false }];
  if (status !== "Ended") {
    const from = new Date(Math.max(start.getTime(), today.getTime()));
    for (let i = 1; i <= HORIZON_DAYS; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      if (!schedule.hits(d)) continue;
      const k = dateKeyOf(d);
      deliveries.push({ key: `${r.id}-${k}`, dateKey: k, date: label(d), skipped: (o.skipped ?? []).includes(k) });
    }
  }
  const next = status === "Active" ? deliveries.find((d) => !d.request && !d.skipped) : undefined;
  return { id: r.id, request: r, schedule, status, deliveries, nextKey: next?.dateKey ?? null };
}
