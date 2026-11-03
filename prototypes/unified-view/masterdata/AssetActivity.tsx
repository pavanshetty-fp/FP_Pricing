import * as React from "react";
import { ArrowRightLeft, Droplet, FileSignature, Gauge, PackageCheck, ReceiptText, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, money } from "../threepl/directoryCore";
import { contractUse, deliveryStats, type MdAsset } from "./assets";
import { gal } from "./assetParts";

/*
  ASSET ACTIVITY LOG — TYPE TILES OVER THE TABLE (Pavan chose V3 of three,
  2026-11-03; the plain table and the day feed are archived in
  docs/archive/asset-360-versions-2026-11-03.md). A strip of tiles, one per
  type, each with its count and the one figure that matters for it
  (gallons delivered, open service orders, billed and overdue…). A tile is
  a quick filter — it sets the Type filter; the table under it is the full
  list unit.
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
