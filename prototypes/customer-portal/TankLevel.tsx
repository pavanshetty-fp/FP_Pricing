import { ArrowRight, Battery, Info, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BreakdownPopover, type BreakdownCardProps } from "../unified-view/BreakdownCard";
import { dateKeyOf } from "../unified-view/data";
import {
  DELIVERED,
  LOW_BATTERY,
  assetById,
  daysUntil,
  daysToEmpty,
  galAtDelivery,
  galNow,
  levelBand,
  pctAfterDelivery,
  suggestedGal,
  type Asset,
  type LevelBand,
  type OrderRequest,
  type RequestLine,
} from "./orders";

/*
  TANK LEVEL, BATTERY, AND WHAT AN ORDER DOES TO THE TANK (Pavan, 2026-10-17).
  A tank monitor reads the level in %, banded on the monitor — shown by COLOUR
  only, no band words:

    ≤ 10      red, blinking
    10 – 49   red
    50 – 79   yellow
    ≥ 80      green

  Separate cells, separate columns: the LEVEL (a gauge in the band's colour and
  the %), the monitor's BATTERY (red under 20%), DAYS TO EMPTY from day-to-day
  usage, the SUGGESTED quantity (full on the delivery day, its sum on hover)
  and the level ON FULFILMENT (just the %). An asset with no monitor says so.
*/

const BAND_FILL: Record<LevelBand, string> = {
  Urgent: "bg-fp-lane-red",
  Low: "bg-fp-lane-red",
  Moderate: "bg-fp-lane-yellow",
  Sufficient: "bg-fp-lane-green",
};
const dash = <span className="text-sm text-muted-foreground">—</span>;

export function LevelGauge({ pct, className }: { pct: number; className?: string }) {
  const band = levelBand(pct);
  return (
    <span aria-hidden className={cn("relative h-2 w-14 shrink-0 overflow-hidden rounded-full bg-muted", className)}>
      <span
        className={cn("absolute inset-y-0 left-0 rounded-full", BAND_FILL[band], band === "Urgent" && "fp-urgent-blink")}
        style={{ width: `${Math.max(pct, 3)}%` }}
      />
    </span>
  );
}

/* THE BATTERY IN THE SAME COLOURS as the level (Pavan, 2026-10-17): red
   under 50, yellow under 80, green from 80 — text-strength mixes of the lane
   hues so yellow and green stay readable. */
const BAND_TEXT: Record<LevelBand, string> = {
  Urgent: "text-status-failed",
  Low: "text-status-failed",
  Moderate: "text-[color-mix(in_oklab,var(--color-fp-lane-yellow)_60%,var(--foreground))]",
  Sufficient: "text-[color-mix(in_oklab,var(--color-fp-lane-green)_65%,var(--foreground))]",
};

export function BatteryReading({ pct }: { pct: number }) {
  const Icon = pct < 10 ? BatteryWarning : pct < LOW_BATTERY ? BatteryLow : pct >= 80 ? BatteryFull : pct >= 40 ? BatteryMedium : Battery;
  return (
    <span className={cn("flex shrink-0 items-center gap-1 text-sm tabular-nums", BAND_TEXT[levelBand(pct)])} title={`Monitor battery ${pct}%`}>
      <Icon className="size-4" aria-hidden />
      {pct}%
    </span>
  );
}

/** THE LEVEL — gauge and %; or "No monitor". */
export function LevelReading({ asset, className }: { asset: Asset | undefined; className?: string }) {
  if (!asset?.monitor) return <span className={cn("text-sm text-muted-foreground", className)}>No monitor</span>;
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)} aria-label={`${asset.level}% full`}>
      <LevelGauge pct={asset.level} />
      <span className="text-sm tabular-nums text-foreground">{asset.level}%</span>
    </span>
  );
}

/** THE MONITOR'S BATTERY — a dash where there is no monitor. */
export function BatteryCell({ asset }: { asset: Asset | undefined }) {
  if (!asset?.monitor) return dash;
  return <BatteryReading pct={asset.battery} />;
}

/** DAYS TO EMPTY at today's usage — red when it runs out before delivery. */
export function DaysToEmpty({ asset, days }: { asset: Asset | undefined; days?: number }) {
  const d = asset ? daysToEmpty(asset) : null;
  if (d === null) return dash;
  const short = days !== undefined && d <= days;
  return (
    <span className={cn("text-sm tabular-nums", short ? "text-status-failed" : "text-foreground")}>
      {d === 0 ? "Empty" : `${d} day${d === 1 ? "" : "s"}`}
    </span>
  );
}

/**
 * SUGGESTED — enough to be full on the delivery day, its sum on hover;
 * pressing it puts it in the quantity.
 */
export function SuggestedGal({ asset, days, onUse }: { asset: Asset | undefined; days: number; onUse?: (gal: number) => void }) {
  if (!asset?.monitor || !asset.capacity) return dash;
  const gal = suggestedGal(asset, days);
  const now = galNow(asset);
  const left = galAtDelivery(asset, days);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={!onUse}
          onClick={() => onUse?.(gal)}
          aria-label={`Use the suggested ${gal.toLocaleString()} gal`}
          className="rounded text-sm tabular-nums text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50 disabled:no-underline"
        >
          {gal.toLocaleString()} gal
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col gap-1 tabular-nums">
        <span>In the tank now · {now.toLocaleString()} gal ({asset.level}%)</span>
        <span>
          Used before delivery · {asset.dailyUse.toLocaleString()} gal/day × {days} day{days === 1 ? "" : "s"} ={" "}
          {(now - left).toLocaleString()} gal
        </span>
        <span>Left at delivery · {left.toLocaleString()} gal</span>
        <span className="font-medium">
          Suggested · {asset.capacity.toLocaleString()} − {left.toLocaleString()} = {gal.toLocaleString()} gal (full)
        </span>
      </TooltipContent>
    </Tooltip>
  );
}


/**
 * ON FULFILMENT, once sent — the % when ordered and, once delivered, the %
 * it was refilled to. Just the percentages.
 */
export function LineLevel({ line }: { line: RequestLine }) {
  if (line.levelAtOrder === undefined) return dash;
  return (
    <span
      className="flex items-center gap-1.5 text-sm tabular-nums text-foreground"
      aria-label={`Ordered at ${line.levelAtOrder}%${line.levelAfter !== undefined ? `, refilled to ${line.levelAfter}%` : ""}`}
    >
      {line.levelAtOrder}%
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {line.levelAfter !== undefined ? `${line.levelAfter}%` : <span className="text-muted-foreground">—</span>}
    </span>
  );
}

/* ------------------------------------------------- on fulfilment ---- */

const gal = (n: number) => `${n.toLocaleString()} gal`;
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/**
 * THE WORKED SUM behind one "on fulfilment" % (Pavan, 2026-10-18): the tank
 * keeps emptying until the planned day, so today's level is not the level
 * the delivery lands on. Today → less daily usage × days to the planned date
 * → left that day → plus what is delivered → the %. Once delivered, the
 * monitor's own reading.
 */
/*
  THE FORMULA, THEN THE SAME FORMULA IN NUMBERS (Pavan, 2026-10-20) — no
  line-by-line steps: the formula in words, then the very same expression
  with this tank's numbers in the same places, and its outcome.
*/
const n = (v: number) => Math.round(v).toLocaleString();
const FORMULA_NOW =
  "((gallons now − daily use × days to the planned date) + gallons delivered) ÷ tank size";

function fulfilmentCard(a: Asset, line: RequestLine, dateKey: string, delivered: boolean, r?: OrderRequest): BreakdownCardProps {
  const fmt = (k: string) => dayFmt.format(new Date(`${k}T00:00`));
  /* DELIVERED — the same formula from the day it was ordered to the day it
     came; the monitor's own reading is the outcome. */
  if (delivered && line.levelAfter !== undefined) {
    const createdKey = r?.audit?.[0]?.at ? dateKeyOf(new Date(r.audit[0].at)) : "";
    const span =
      createdKey && dateKey
        ? Math.max(0, Math.round((new Date(`${dateKey}T00:00`).getTime() - new Date(`${createdKey}T00:00`).getTime()) / 86_400_000))
        : 0;
    const atOrder = line.levelAtOrder !== undefined ? Math.round((line.levelAtOrder / 100) * a.capacity) : null;
    const into = line.topOff ? null : line.gal;
    return {
      title: `${a.name} — delivered${dateKey ? ` ${fmt(dateKey)}` : ""}`,
      rows: [
        ...(atOrder !== null
          ? [
              {
                label: "This tank",
                sub: `((${n(atOrder)} − ${n(a.dailyUse)} × ${span}) + ${into === null ? "top off" : n(into)}) ÷ ${n(a.capacity)} = ${line.levelAfter}% · the monitor's reading after delivery`,
              },
            ]
          : []),
      ],
      total: { label: "On fulfilment", value: `${line.levelAfter}%` },
    };
  }
  /* NOT DELIVERED YET — to the planned date the tenant has now; past it and
     still not delivered, the tank is still emptying: from today. */
  const days = daysUntil(dateKey);
  const now = galNow(a);
  const left = galAtDelivery(a, days);
  const into = line.topOff ? a.capacity - left : line.gal;
  const raw = now - a.dailyUse * days;
  const sum = left + into;
  const pct = pctAfterDelivery(a, days, line.gal, line.topOff);
  /* THE TWO THINGS THAT GO WRONG (Pavan, 2026-10-20). */
  const warnings: string[] = [];
  if (raw < 0 && a.dailyUse > 0) {
    const dry = Math.floor(now / a.dailyUse);
    const on = new Date();
    on.setHours(0, 0, 0, 0);
    on.setDate(on.getDate() + dry);
    warnings.push(
      `Tank empty — it runs dry ${dry === 0 ? "today" : `on ${dayFmt.format(on)}`}, ${days - dry} ${days - dry === 1 ? "day" : "days"} before the planned date.`
    );
  }
  /* LOW EVEN AFTER IT COMES (Pavan, 2026-10-22) — under a quarter full once
     delivered, the tank is still the next problem. */
  if (raw >= 0 && pct < 25)
    warnings.push(`Low after delivery — only ${pct}% full once this arrives.`);
  if (sum > a.capacity)
    warnings.push(
      `Tank overload — ${n(sum - a.capacity)} gal won't fit in the ${n(a.capacity)} gal tank. That overage might cause a penalty by the tenant.`
    );
  return {
    title: `${a.name} — ${dateKey ? `planned for ${fmt(dateKey)}` : "no planned date yet"}`,
    rows: [
      {
        label: "This tank",
        sub: `((${n(now)} − ${n(a.dailyUse)} × ${days}) + ${line.topOff ? `${n(into)} (top off)` : n(into)}) ÷ ${n(a.capacity)} = ${n(sum)} ÷ ${n(a.capacity)} = ${pct}%${raw < 0 ? " (empty before it arrives, so it starts from 0)" : ""}`,
      },
    ],
    total: { label: "On fulfilment", value: `${pct}% · ${gal(sum)}` },
    warnings,
  };
}

/** The %, pressable — its worked sum opens above it. */
function FulfilmentFigure({
  line,
  dateKey,
  delivered,
  r,
  asset,
}: {
  line: RequestLine;
  dateKey: string;
  delivered: boolean;
  r?: OrderRequest;
  /** The tank itself, for a module whose tanks aren't the portal's (3PL). */
  asset?: Asset;
}) {
  const a = asset ?? assetById(line.assetId);
  if (!a?.monitor || !a.capacity) return dash;
  /* NO PLANNED DATE, NO FIGURE (Pavan, 2026-10-20) — the sum runs to the
     planned date; until one is picked there is nothing to work out. */
  if (!delivered && !dateKey) return dash;
  const card = fulfilmentCard(a, line, dateKey, delivered, r);
  const pct = card.total!.value.split("%")[0];
  return (
    <BreakdownPopover
      label={`How ${pct}% on fulfilment is worked out for ${a.name}`}
      width={380}
      card={card}
      className="rounded"
      trigger={
        <span className="inline-flex items-center gap-1">
          <span
            className={cn(
              "text-sm tabular-nums underline decoration-current/50 decoration-dotted underline-offset-4 hover:decoration-solid",
              card.warnings?.length ? "text-status-failed" : "text-foreground"
            )}
          >
            {pct}%
          </span>
          {card.warnings?.length ? <TriangleAlert aria-label="Warning" className="size-3.5 text-status-failed" /> : null}
        </span>
      }
    />
  );
}

/** ON FULFILMENT while ordering — the % after delivery on the draft's date. */
export function AfterDelivery({
  line,
  days,
  dateKey = "",
  asset,
}: {
  line: RequestLine;
  days?: number;
  dateKey?: string;
  /** The tank itself, when it isn't one of the portal's (3PL). */
  asset?: Asset;
}) {
  void days;
  return <FulfilmentFigure line={line} dateKey={dateKey} delivered={false} asset={asset} />;
}

/** ON FULFILMENT for a sent order — refilled to once delivered, else expected. */
export function FulfilmentPct({ line, r }: { line: RequestLine; r: OrderRequest }) {
  return <FulfilmentFigure line={line} dateKey={r.date} delivered={DELIVERED.includes(r.status)} r={r} />;
}

/** "On fulfilment" and its ⓘ — what the column is, and how its sum runs. */
export function FulfilmentHead({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      On fulfilment
      <BreakdownPopover
        label="What on fulfilment means"
        width={360}
        className="inline-flex text-muted-foreground hover:text-foreground"
        trigger={<Info className="size-3.5" />}
        /* THE EXAMPLE PAVAN GAVE (2026-10-18): a request made today, planned
           5 days out, a 10,000 gal tank at 64% using 900 gal a day — the
           64% is not what the truck finds. */
        card={{
          title: "Tank levels once delivered",
          rows: [{ label: "Formula", sub: `On fulfilment = ${FORMULA_NOW}` }],
        }}
      />
    </span>
  );
}

