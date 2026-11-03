import * as React from "react";
import { ArrowRightLeft, Droplet, FileSignature, Gauge, PackageCheck, ReceiptText, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateOffset, formatDate, money } from "../threepl/directoryCore";
import { contractUse, deliveryStats, type MdAsset } from "./assets";
import { Status, gal } from "./assetParts";

/*
  ASSET ACTIVITY LOG — VERSIONS (Pavan, 2026-11-03: "suggestions to improve
  the asset activity log … two to three options, V1 V2 V3").

    V1  the table (as it was) — the full list unit.
    V2  THE DAY FEED — the Activity card's timeline at full width, grouped
        under a heading per day (sticky while you scroll), newest first:
        type mark, what happened, who and when, the record's status.
    V3  BY TYPE, THEN THE TABLE — a strip of tiles, one per type, each with
        its count and the one figure that matters for it (gallons delivered,
        open service orders, billed and overdue…). A tile is a quick filter
        (it sets the Type filter); the table under it is V1.
*/

export interface LogItem {
  id: string;
  at: string;
  type: string;
  source: string;
  title: string;
  detail: string;
  status: string;
}

export const TYPE_ICON: Record<string, React.ReactNode> = {
  Deliveries: <Droplet />,
  Service: <Wrench />,
  Equipment: <Gauge />,
  Billing: <ReceiptText />,
  Movement: <ArrowRightLeft />,
  Lease: <FileSignature />,
  Asset: <PackageCheck />,
};

const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

/** A day's heading — Today, Yesterday, or the date. */
const dayLabel = (day: string) =>
  day === dateOffset(0) ? "Today" : day === dateOffset(-1) ? "Yesterday" : formatDate(day);

/* ───────────────────────────────────────────────────────── V2 · feed ── */

export function ActivityFeed({ items }: { items: LogItem[] }) {
  const days: { day: string; items: LogItem[] }[] = [];
  for (const it of items) {
    const day = it.at.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(it);
    else days.push({ day, items: [it] });
  }
  return (
    <div data-view-box="" className="h-full overflow-auto rounded-md border border-border">
      {days.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No events match these filters.</p>
      ) : (
        days.map((d) => (
          <section key={d.day}>
            <h3 className="sticky top-0 z-20 border-b border-border bg-fp-table-header px-4 py-2 text-xs font-medium text-muted-foreground">
              {dayLabel(d.day)}
              <span className="ml-2 tabular-nums">{d.items.length}</span>
            </h3>
            <ol className="flex flex-col px-4 py-3">
              {d.items.map((it, i) => (
                <li key={it.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < d.items.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-3.25 w-px bg-border" />}
                  <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground [&_svg]:size-3.5">
                    {TYPE_ICON[it.type]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                    <span className="text-sm text-foreground">{it.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[it.detail !== "–" ? it.detail : null, it.source, TIME.format(new Date(it.at))].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5">
                    <Status value={it.status} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── V3 · tiles ── */

/** The one figure that matters for each type. */
function figureOf(a: MdAsset, type: string): string {
  switch (type) {
    case "Deliveries": {
      const s = deliveryStats(a);
      return `${gal(s.totalGal)} · ${s.monthCount} this month`;
    }
    case "Service": {
      const open = a.serviceOrders.filter((o) => o.stage === "Open" || o.stage === "Assigned").length;
      return `${open} open`;
    }
    case "Billing": {
      const total = a.invoices.reduce((s, i) => s + i.total, 0);
      const overdue = a.invoices.filter((i) => i.status === "Overdue").length;
      return `${money(total)}${overdue ? ` · ${overdue} overdue` : ""}`;
    }
    case "Equipment": {
      const due = a.peripherals.filter((p) => p.status !== "Active").length;
      return due ? `${due} warranty to check` : "Warranties active";
    }
    case "Movement":
      return `${a.movements.filter((m) => m.status === "Completed").length} completed`;
    case "Lease": {
      const c = contractUse(a);
      const active = a.leases.find((l) => l.status === "Active");
      return active ? `${active.id}${c ? ` · ${Math.round((c.used / c.committed) * 100)}% used` : ""}` : "No active lease";
    }
    default:
      return a.journey[0] ? `Since ${formatDate(a.journey[0].from)}` : "";
  }
}

export function TypeTiles({
  asset: a,
  items,
  picked,
  onPick,
}: {
  asset: MdAsset;
  /** Every event, unfiltered — a tile counts its type, whatever is applied. */
  items: LogItem[];
  picked: string[];
  onPick: (type: string) => void;
}) {
  const types = [...new Set(items.map((i) => i.type))];
  return (
    <div className="grid shrink-0 grid-cols-4 gap-3">
      {types.map((t) => {
        const on = picked.includes(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(t)}
            className={cn(
              "flex min-w-0 flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left outline-none transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50",
              on && "border-foreground/25 bg-muted hover:bg-muted",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
                {TYPE_ICON[t]}
                {t}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{items.filter((i) => i.type === t).length}</span>
            </span>
            <span className="w-full truncate text-xs text-muted-foreground">{figureOf(a, t)}</span>
          </button>
        );
      })}
    </div>
  );
}
