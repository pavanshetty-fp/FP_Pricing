import { ArrowRight, Battery, Info, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BreakdownPopover, type BreakdownCardProps } from "../unified-view/BreakdownCard";
import { dateKeyOf } from "../unified-view/data";
import { StatusChip } from "@/components/ui/status-chip";
import { NumberLink } from "./cells";
import { usePortalNav } from "./nav";
import {
  DELIVERED,
  LOW_BATTERY,
  REQUEST_STATUS_TONE,
  assetById,
  daysUntil,
  daysToEmpty,
  galAtDelivery,
  galNow,
  levelBand,
  pctAfterDelivery,
  suggestedGal,
  todayKey,
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
function fulfilmentCard(a: Asset, line: RequestLine, dateKey: string, delivered: boolean, r?: OrderRequest): BreakdownCardProps {
  const fmt = (k: string) => dayFmt.format(new Date(`${k}T00:00`));
  /* DELIVERED — the day's own numbers: the level when requested, what the
     tank used until the truck actually came, what went in, and the
     monitor's reading after. */
  if (delivered && line.levelAfter !== undefined) {
    const createdKey = r?.audit?.[0]?.at ? dateKeyOf(new Date(r.audit[0].at)) : "";
    const span =
      createdKey && dateKey
        ? Math.max(0, Math.round((new Date(`${dateKey}T00:00`).getTime() - new Date(`${createdKey}T00:00`).getTime()) / 86_400_000))
        : 0;
    const atOrder = line.levelAtOrder !== undefined ? Math.round((line.levelAtOrder / 100) * a.capacity) : null;
    const used = atOrder !== null ? Math.min(atOrder, a.dailyUse * span) : null;
    return {
      title: `${a.name} — delivered${dateKey ? ` on the planned date, ${fmt(dateKey)}` : ""}`,
      rows: [
        ...(atOrder !== null
          ? [
              {
                label: `Order created${createdKey ? ` · ${fmt(createdKey)}` : ""}`,
                sub: `the tank was at ${line.levelAtOrder}% of ${gal(a.capacity)}`,
                value: gal(atOrder),
              },
              {
                label: "Used until the planned date",
                sub: `${gal(a.dailyUse)}/day × ${span} day${span === 1 ? "" : "s"}${createdKey && dateKey ? ` (${fmt(createdKey)} → ${fmt(dateKey)})` : ""}`,
                value: `− ${gal(used!)}`,
              },
              { label: `Left on ${dateKey ? fmt(dateKey) : "the day"}`, sub: `${Math.round(((atOrder - used!) / a.capacity) * 100)}% of the tank`, value: gal(atOrder - used!) },
            ]
          : []),
        { label: "Delivered", sub: line.topOff ? "top off — filled to the brim" : "quantity requested", value: line.topOff ? "Top off" : `+ ${gal(line.gal)}` },
        { label: "Reading after delivery", sub: "the tank monitor's actual level", value: `${line.levelAfter}%` },
      ],
      total: { label: "On fulfilment", value: `${line.levelAfter}%` },
    };
  }
  /* NOT DELIVERED YET — counted to the planned date the tenant has now; past
     it and still not delivered, the tank is still emptying: from today. */
  const days = daysUntil(dateKey);
  const late = Boolean(dateKey) && dateKey < todayKey();
  const day = dateKey && days > 0 ? fmt(dateKey) : "today";
  const now = galNow(a);
  const left = galAtDelivery(a, days);
  const used = now - left;
  const into = line.topOff ? a.capacity - left : line.gal;
  const end = Math.min(a.capacity, left + into);
  const over = left + into - a.capacity;
  const pct = pctAfterDelivery(a, days, line.gal, line.topOff);
  return {
    title: late
      ? `${a.name} — planned for ${fmt(dateKey)}, not delivered yet`
      : day === "today"
        ? `${a.name} — planned for today`
        : `${a.name} — planned date ${day}`,
    rows: [
      { label: `Today · ${dayFmt.format(new Date())}`, sub: `the tank is at ${a.level}% of ${gal(a.capacity)}`, value: gal(now) },
      {
        label: "Used until the planned date",
        sub: !dateKey
          ? "no date yet — counted as today"
          : late
            ? "the planned day has passed — counted from today's reading"
            : days === 0
              ? "delivery is today"
              : `${gal(a.dailyUse)}/day × ${days} day${days === 1 ? "" : "s"} (today → ${day})`,
        value: `− ${gal(used)}`,
      },
      { label: day === "today" ? "Left today" : `Left on ${day}`, sub: `${Math.round((left / a.capacity) * 100)}% of the tank`, value: gal(left) },
      { label: "Delivered", sub: line.topOff ? "top off — filled to the brim" : "quantity requested", value: `+ ${gal(into)}` },
      ...(over > 0 ? [{ label: "Does not fit", sub: `the tank holds ${gal(a.capacity)}`, value: `− ${gal(over)}` }] : []),
    ],
    total: { label: "On fulfilment", value: `${pct}% · ${gal(end)}` },
  };
}

/** The %, pressable — its worked sum opens above it. */
function FulfilmentFigure({
  line,
  dateKey,
  delivered,
  r,
}: {
  line: RequestLine;
  dateKey: string;
  delivered: boolean;
  r?: OrderRequest;
}) {
  const a = assetById(line.assetId);
  if (!a?.monitor || !a.capacity) return dash;
  const card = fulfilmentCard(a, line, dateKey, delivered, r);
  const pct = card.total!.value.split("%")[0];
  return (
    <BreakdownPopover
      label={`How ${pct}% on fulfilment is worked out for ${a.name}`}
      width={340}
      card={card}
      className="rounded"
      trigger={
        <span className="text-sm tabular-nums text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 hover:decoration-solid">
          {pct}%
        </span>
      }
    />
  );
}

/** ON FULFILMENT while ordering — the % after delivery on the draft's date. */
export function AfterDelivery({ line, days, dateKey = "" }: { line: RequestLine; days?: number; dateKey?: string }) {
  void days;
  return <FulfilmentFigure line={line} dateKey={dateKey} delivered={false} />;
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
          title: "On fulfilment — the tank's level once this order is delivered",
          rows: [
            {
              label: "Example",
              sub: `order created today, ${dayFmt.format(new Date())} · planned date ${dayFmt.format(new Date(Date.now() + 5 * 86_400_000))}, 5 days later · 10,000 gal tank`,
            },
            { label: `1 · Today · ${dayFmt.format(new Date())}`, sub: "the tank monitor reads 64% of 10,000 gal", value: "6,400 gal" },
            {
              label: "2 · Used until the planned date",
              sub: "900 gal/day × 5 days — the tank keeps emptying while the order waits",
              value: "− 4,500 gal",
            },
            {
              label: `3 · Left on ${dayFmt.format(new Date(Date.now() + 5 * 86_400_000))}`,
              sub: "64% today is only 19% by the planned date",
              value: "1,900 gal",
            },
            { label: "4 · Delivered", sub: "the quantity requested (a top off fills it to the brim)", value: "+ 5,200 gal" },
            { label: "= On fulfilment", sub: "1,900 + 5,200 = 7,100 gal of 10,000", value: "71%" },
            { label: "The tenant decides", sub: "the request goes to the tenant; the sum follows what happens to it" },
            { label: "Planned date moved", sub: "counted to the new planned date instead" },
            { label: "Planned date passed, not delivered", sub: "the tank is still emptying — counted from today's reading until it arrives" },
            {
              label: "Delivered",
              sub: "the actual numbers: the level when the order was created, used until it arrived, delivered, and the monitor's reading after",
            },
          ],
        }}
      />
    </span>
  );
}

/**
 * AN ORDER'S TANKS, NESTED UNDER ITS ROW (DS ui §10j). Asset, product,
 * quantity, then the tank's level now, its level on fulfilment (ordered →
 * refilled), days to empty and the monitor's battery.
 */
export function OrderTanksLayer({ r }: { r: OrderRequest }) {
  const head = ["Asset", "Product", "Qty (gal)", "Current level", "On fulfilment", "Days to empty", "Battery"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={cn("whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground", i === 2 && "text-right")}
              >
                {h === "On fulfilment" ? <FulfilmentHead /> : h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.lines.map((l, i) => {
            const a = assetById(l.assetId);
            return (
              <tr key={i} className="border-t border-border/60">
                <td className="whitespace-nowrap px-4 py-3.5 text-foreground">{a?.name ?? "No tank"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">{l.product || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-foreground">
                  {l.topOff ? "Top off" : l.gal.toLocaleString()}
                </td>
                <td className="px-4 py-3.5">
                  <LevelReading asset={a} />
                </td>
                <td className="px-4 py-3.5">
                  <FulfilmentPct line={l} r={r} />
                </td>
                <td className="px-4 py-3.5">
                  <DaysToEmpty asset={a} />
                </td>
                <td className="px-4 py-3.5">
                  <BatteryCell asset={a} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A REQUEST'S TANKS, NESTED UNDER ITS ROW (Pavan, 2026-10-19) — where each
 * went: the order the tenant put it on and that order's status, or Pending
 * while it waits; and the tank's level now.
 */
export function RequestTanksLayer({ r, all }: { r: OrderRequest; all: OrderRequest[] }) {
  const nav = usePortalNav();
  const head = ["Asset", "Product", "Qty (gal)", "Order", "Order status", "Current level", "Days to empty"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={cn("whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground", i === 2 && "text-right")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.lines.map((l, i) => {
            const a = assetById(l.assetId);
            const o = l.orderNo ? all.find((x) => x.requestNo === l.orderNo) : undefined;
            const accepted = r.status === "Accepted" || r.status === "Partly accepted";
            return (
              <tr key={i} className="border-t border-border/60">
                <td className="whitespace-nowrap px-4 py-3.5 text-foreground">{a?.name ?? "No tank"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">{l.product || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-foreground">
                  {l.topOff ? "Top off" : l.gal.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {l.orderNo ? (
                    <NumberLink no={l.orderNo} onOpen={nav.openOrder} />
                  ) : accepted ? (
                    <span className="text-muted-foreground">Pending</span>
                  ) : (
                    dash
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  {o ? (
                    <StatusChip tone={REQUEST_STATUS_TONE[o.status]} variant="text">
                      {o.status}
                    </StatusChip>
                  ) : (
                    dash
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <LevelReading asset={a} />
                </td>
                <td className="px-4 py-3.5">
                  <DaysToEmpty asset={a} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
