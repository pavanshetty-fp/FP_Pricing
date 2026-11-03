import * as React from "react";
import { toast } from "sonner";
import { StatusChip } from "@/components/ui/status-chip";
import { kindTone, type StatusKind } from "../statusKind";
import { DASH, dateOffset, formatDate, money, type AuditEvent } from "../threepl/directoryCore";
import { type MdAsset, type MdAssetStatus } from "./assets";
import type { MovementDraft, ServiceDraft } from "./AssetOrderForms";
import { formatWindow } from "@/components/form-layout/TimeWindowSlider";

/*
  The parts the Assets list and its Asset 360 sheet share — status pills by
  kind, the reading cells and the record's actions.
*/

/* STATUS BY KIND (ui §10b): out and earning is simply true, free is good
   news, a due service is waiting on someone, a customer's own tank is a fact. */
export const STATUS_KIND: Record<MdAssetStatus, StatusKind> = {
  "On rent": "info",
  Available: "success",
  "Service due": "caution",
  "On site": "neutral",
};

export const kindOf = (s: string): StatusKind =>
  /* Active and Linked are simply true (info, as ACTIVE_KIND); done is success. */
  /^(Active|Linked|Open|Invoiced)$/.test(s)
    ? "info"
    : /^(Current|Pass|Paid|Completed)$/.test(s)
    ? "success"
    : /^(Expiring|Due soon|Sent|Assigned|Scheduled|In transit|Signed|Pending)$/.test(s)
      ? "caution"
      : /^(Expired|Overdue|Fail)$/.test(s)
        ? "critical"
        : "neutral";

export const Status = ({ value }: { value: string }) => <StatusChip tone={kindTone(kindOf(value))}>{value}</StatusChip>;

export const Muted = ({ children = DASH }: { children?: React.ReactNode }) => (
  <span className="text-sm text-muted-foreground">{children}</span>
);

export { gal } from "./assets";
export const perMonth = (n: number | null) => (n === null ? DASH : `${money(n)} / mo`);
/** `Sep 5, 2026 · 3:10 PM` — the board card's date and time, everywhere here. */
const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
export const stamp = (iso: string | null) =>
  iso ? `${formatDate(iso.slice(0, 10))} · ${TIME.format(new Date(iso))}` : DASH;

/** A share of a whole, drawn as the level gauge's shape in the info hue. */
export function UsageBar({ pct }: { pct: number }) {
  return (
    <span aria-hidden className="relative h-2 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-fp-lane-blue"
        style={{ width: `${Math.max(Math.min(pct, 100), 3)}%` }}
      />
    </span>
  );
}

/** Gauge and % over the gallons — the monitor and contract cells. */
export function Reading({ bar, pct, line }: { bar: React.ReactNode; pct: number; line: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-2">
        {bar}
        <span className="text-sm tabular-nums text-foreground">{pct}%</span>
      </span>
      <span className="truncate text-xs tabular-nums text-muted-foreground">{line}</span>
    </div>
  );
}


/* ────────────────────────────────────────────────────────── record ── */

/** What the record's buttons do — each writes the record and its history. */
export function assetActions(a: MdAsset, update: (uid: string, fn: (a: MdAsset) => MdAsset) => void) {
  const log = (action: string, changes: string[] = []): AuditEvent => ({
    id: `au-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    by: "Dana Whitfield",
    action,
    changes,
  });

  /** A movement order from the create sheet — scheduled, its paper to come. */
  const createMovement = (d: MovementDraft) => {
    const id = `AMO-${3450 + a.movements.length}`;
    update(a.uid, (x) => ({
      ...x,
      movements: [
        { id, source: d.linked ? "Lease" : "Dispatch", from: d.from, to: d.to, scheduled: d.date, status: "Scheduled", documents: "Pending" },
        ...x.movements,
      ],
      audit: [log(`${id} · Movement order created`, [`${d.from} → ${d.to}`, `${d.direction} · ${formatWindow(d.windowStart, d.windowEnd)}`]), ...x.audit],
    }));
    toast.success(`Movement order ${id} created`);
  };

  /** A service order from the create sheet — Assigned once a technician is named. */
  const createService = (d: ServiceDraft) => {
    const id = `SO-${4440 + a.serviceOrders.length}`;
    const day = d.scheduled || d.requested || dateOffset(1);
    update(a.uid, (x) => ({
      ...x,
      serviceOrders: [
        { id, job: d.jobType, technician: d.technician || "Unassigned", scheduled: `${day}T09:00:00Z`, amount: null, stage: d.technician ? "Assigned" : "Open", documents: "Pending" },
        ...x.serviceOrders,
      ],
      audit: [log(`${id} · Service order created`, [d.jobType, `${d.priority} priority`]), ...x.audit],
    }));
    toast.success(`Service order ${id} created`);
  };

  const toggleMonitor = () => {
    const linking = !a.monitor?.linked;
    update(a.uid, (x) =>
      x.monitor
        ? {
            ...x,
            monitor: { ...x.monitor, linked: linking, levelGal: linking ? Math.round(x.capacityGal * 0.5) : null, lastPing: linking ? new Date().toISOString() : x.monitor.lastPing },
            audit: [log(`Monitor ${linking ? "linked" : "unlinked"}`, [x.monitor.id]), ...x.audit],
          }
        : x,
    );
    toast.success(`Monitor ${linking ? "linked" : "unlinked"}`);
  };

  return { createMovement, createService, toggleMonitor };
}
