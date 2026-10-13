import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Truck } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  be delivered — its change on the same weekday last week, and a seven-day
  trend line on the right. How much is already delivered is in the details
  sheet, not here (Pavan, 2026-10-13). Read-only; the one control is the
  open icon in the corner, which brings up today's details.
*/

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });

/* THE TREND LINES' HUES — the reference's violet and orange, as the DS
   lane violet and chart orange. Literal so Tailwind keeps them. */
const HUE = {
  violet: { stroke: "stroke-fp-lane-violet", fill: "var(--color-fp-lane-violet)" },
  orange: { stroke: "stroke-fp-viz-2", fill: "var(--fp-viz-2)" },
};

/** Seven days, oldest first — a 2px line over a fading wash, a hover per day. */
function Sparkline({
  values,
  labels,
  hue,
  format,
}: {
  values: number[];
  labels: string[];
  hue: keyof typeof HUE;
  format: (n: number) => string;
}) {
  const id = React.useId();
  const W = 132;
  const H = 52;
  const max = Math.max(...values, 1);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 3 - (v / max) * (H - 8);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[52px] w-[132px] shrink-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={HUE[hue].fill} stopOpacity="0.22" />
          <stop offset="1" stopColor={HUE[hue].fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={HUE[hue].stroke} />
      {/* A HOVER PER DAY — a column bigger than the mark. */}
      {values.map((v, i) => (
        <rect key={i} x={x(i) - W / 14} y={0} width={W / 7} height={H} fill="transparent">
          <title>{`${labels[i]}: ${format(v)}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** The change on last week — up green, down orange, each with its arrow. */
function Change({ now, then }: { now: number; then: number }) {
  if (!then) return null;
  const d = Math.round(((now - then) / then) * 100);
  const up = d >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        up ? "text-status-success" : "text-status-processing"
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full [&_svg]:size-3",
          up ? "bg-status-success/15" : "bg-status-processing/15"
        )}
      >
        {up ? <ArrowUp /> : <ArrowDown />}
      </span>
      {Math.abs(d)}%
    </span>
  );
}

function Tile({
  title,
  value,
  unit,
  then,
  thenLabel,
  trend,
  trendLabels,
  hue,
  format,
}: {
  title: string;
  value: number;
  unit: string;
  then: number;
  thenLabel: string;
  trend: number[];
  trendLabels: string[];
  hue: keyof typeof HUE;
  format: (n: number) => string;
}) {
  return (
    <section className="flex min-w-0 flex-1 items-end justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-3xl font-semibold tabular-nums text-foreground">{format(value)}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          <Change now={value} then={then} />
        </p>
        <p className="text-xs text-muted-foreground">compared to {thenLabel}</p>
      </div>
      <Sparkline values={trend} labels={trendLabels} hue={hue} format={format} />
    </section>
  );
}

export function OverviewCards({
  rows,
  onDetails,
}: {
  rows: OrderRequest[];
  onDetails: () => void;
}) {
  const st = todayStats(rows);
  const today = new Date();
  const day = (back: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    return d;
  };
  /* The trend: the six days before today, then today so far. */
  const labels = [6, 5, 4, 3, 2, 1].map((b) => WEEKDAY.format(day(b))).concat("Today");
  const thenLabel = `last ${WEEKDAY.format(day(7))}`;
  return (
    <div className="relative flex shrink-0 flex-col divide-y divide-border rounded-xl border border-border bg-fp-surface-1b md:flex-row md:divide-x md:divide-y-0">
      <Tile
        title="Today’s orders"
        value={st.due}
        unit={st.due === 1 ? "order" : "orders"}
        then={PAST_WEEK.orders[0]}
        thenLabel={thenLabel}
        trend={[...PAST_WEEK.orders.slice(1), st.due]}
        trendLabels={labels}
        hue="violet"
        format={(n) => n.toLocaleString()}
      />
      <Tile
        title="Gallons to be delivered today"
        value={st.galRequested}
        unit="gal"
        then={PAST_WEEK.gallons[0]}
        thenLabel={thenLabel}
        trend={[...PAST_WEEK.gallons.slice(1), st.galRequested]}
        trendLabels={labels}
        hue="orange"
        format={(n) => n.toLocaleString()}
      />
      {/* THE ONE CONTROL — opens today's details (Pavan, 2026-10-13). */}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="View today’s details"
        title="View today’s details"
        onClick={onDetails}
        className="absolute top-2.5 right-2.5 rounded-full"
      >
        <ArrowUpRight />
      </Button>
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
