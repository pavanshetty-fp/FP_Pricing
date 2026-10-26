import * as React from "react";
import { ArrowUpRight, Truck } from "lucide-react";
import { MetricIcon, TERM_ICONS } from "@/components/ui/term-icons";
import { TrendChip } from "@/components/ui/trend-chip";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { Button } from "@/components/ui/button";
import {
  REQUEST_STATUS_TONE,
  assetById,
  lineQty,
  printKey,
  windowText,
  todayStats,
  PAST_WEEK,
  type OrderRequest,
} from "./orders";

/*
  THE OVERVIEW (Pavan, 2026-10-13) — ONE card, two tiles ruled apart, after
  his "New subscriptions" reference: today's total — orders, and gallons to
  be delivered — its change on the same weekday last week. How much is
  already delivered is in the details sheet, not here (Pavan, 2026-10-13).

  ICON LEADS, ARROW CLOSES, PER TILE (Pavan, 2026-10-26): the term's metric
  icon on the left, as tall as the text beside it; the text as one block;
  and each tile its own open arrow on the right, opening ITS sheet — today's
  orders, or today's gallons.
*/

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });

/** The change on the same weekday last week — the DS trend chip (§10k). */
function Change({ now, then }: { now: number; then: number }) {
  if (!then) return null;
  const d = Math.round(((now - then) / then) * 100);
  return <TrendChip dir={d === 0 ? "same" : d > 0 ? "up" : "down"}>{d === 0 ? "Same" : `${Math.abs(d)}%`}</TrendChip>;
}

/* THE TERM'S ICON, NOT A TREND LINE (Pavan, 2026-10-20) — figure, unit and
   change as one unit; the icon before the text, the open arrow after it. */
function Tile({
  title,
  icon,
  value,
  unit,
  then,
  thenLabel,
  onOpen,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: number;
  unit: string;
  then: number;
  thenLabel: string;
  onOpen: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
      <MetricIcon icon={icon} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-3xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          <Change now={value} then={then} />
        </p>
        <p className="text-xs text-muted-foreground">compared to {thenLabel}</p>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`View ${title.toLowerCase()}`}
        title={`View ${title.toLowerCase()}`}
        onClick={onOpen}
        className="self-start rounded-full"
      >
        <ArrowUpRight />
      </Button>
    </section>
  );
}

export function OverviewCards({
  rows,
  onDetails,
}: {
  rows: OrderRequest[];
  /** Opens today's sheet on the tile's own subject. */
  onDetails: (about: "orders" | "gallons") => void;
}) {
  const st = todayStats(rows);
  const today = new Date();
  const day = (back: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    return d;
  };
  const thenLabel = `last ${WEEKDAY.format(day(7))}`;
  return (
    <div className="shrink-0 rounded-xl border border-border bg-fp-surface-1b">
      <div className="flex flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
      <Tile
        title="Today’s orders"
        icon={TERM_ICONS.deliveries}
        value={st.due}
        unit={st.due === 1 ? "order" : "orders"}
        then={PAST_WEEK.orders[0]}
        thenLabel={thenLabel}
        onOpen={() => onDetails("orders")}
      />
      <Tile
        title="Gallons to be delivered today"
        icon={TERM_ICONS.gallons}
        value={st.galRequested}
        unit="gal"
        then={PAST_WEEK.gallons[0]}
        thenLabel={thenLabel}
        onOpen={() => onDetails("gallons")}
      />
      </div>
    </div>
  );
}

/*
  THE MAP PIN'S HOVER CARD (Pavan, 2026-10-13) — primary details only, one
  block per request at that ship-to; pressing the pin opens the full sheet.
*/
export function MapHoverCard({ requests }: { requests: OrderRequest[] }) {
  return (
    <div className="flex max-h-96 flex-col divide-y divide-border overflow-auto">
      {requests.map((r) => {
        const eta = r.trip ? new Date(r.trip.eta) : null;
        return (
          <div key={r.id} className="flex flex-col gap-2 p-3">
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{r.requestNo}</span>
              <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
                {r.status}
              </StatusChip>
            </span>
            <span className="text-xs text-muted-foreground">
              {r.shipTo} · {r.date ? `${printKey(r.date)}, ${windowText(r)}` : "No date"}
            </span>
            <ul className="flex flex-col gap-0.5">
              {r.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3 text-sm">
                  <span className="truncate text-foreground">
                    {assetById(l.assetId)?.name ?? "No tank"} · {l.product || "—"}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">{lineQty(l)}</span>
                </li>
              ))}
            </ul>
            {r.trip && eta && (
              <span className="flex items-center gap-1.5 text-xs text-foreground">
                <Truck className="size-3.5 text-muted-foreground" />
                {r.trip.truck} · {r.trip.driver} · ETA{" "}
                {formatMinutes(eta.getHours() * 60 + eta.getMinutes())}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
