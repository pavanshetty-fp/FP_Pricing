import * as React from "react";
import { ArrowUpRight, BellRing, ChevronDown, Clock, FileQuestion, Lock, Repeat } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Pill, pillColorClass } from "@/components/ui/pill";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { QuietPattern } from "@/components/ui/quiet-pattern";
import { SheetSectionNote } from "@/components/side-sheet/parts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DATE_FMT, startOfDay } from "../unified-view/data";
import { kindTone } from "../unified-view/statusKind";
import {
  DELIVERED,
  REQUEST_STATUS_TONE,
  orderListRows,
  quantityOf,
  createRequest,
  updateRequest,
  lastProductFor,
  isRunningLate,
  lacksPod,
  onCreditHold,
  TENANT,
  YET_TO_DELIVER,
  assetById,
  dateOfKey,
  printKey,
  quantityText,
  todayKey,
  useRequests,
  windowText,
  type OrderRequest,
  type RequestStatus,
} from "./orders";
import { OrderRequestSheet } from "./OrderRequestSheet";
import { TankHealthCard } from "./TankHealth";
import { OutlineShine } from "@/components/ui/outline-shine";
import { MetricIcon, TERM_ICONS } from "@/components/ui/term-icons";
import { TrendChip } from "@/components/ui/trend-chip";
import { SHIP_TOS } from "./orders";
import { ActionSheet } from "./ActionSheet";
import { Button } from "@/components/ui/button";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import { NumberLink } from "./cells";
import {
  CREDIT,
  DEFAULT_RANGE,
  OPEN_INVOICES,
  PRICED_PRODUCTS,
  RANGES,
  daysSinceEmpty,
  headline,
  periods,
  productTotals,
  spend,
  dailySpend,
  type NoteLevel,
  type RangeWeeks,
  type Week,
} from "./dashboard";

/*
  THE DASHBOARD (Pavan, 2026-10-13; reworked after the Anirudh review,
  2026-10-17) — a few things to glance at, in order:

    Attention required   orders on hold for credit (a count), quotes waiting,
                         orders running late, deliveries with no proof
    Schedule             the next 7 days of deliveries
    Tank levels          every monitored tank, emptiest first
    Spend                total spend and spend by product — history only,
                         never against market
    Billing & credit     open invoices; credit where the tenant gives it

  Delivery performance (headlines, requests by week, empty-tank reports) is
  a REPORT now, on the Reports page. Asset health (driver notes) is out
  until notes are structured.

  CHARTS (dataviz skill): the DS dashboard palette `fp-viz-1…3` in its fixed
  order, validated; thin marks, rounded data ends, 2px gaps, recessive grid,
  one axis, a hover on every mark; text stays in text tokens and every series
  is named in a legend, so nothing is carried by colour alone.
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd3 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 3 });
const num = (n: number) => Math.round(n).toLocaleString();
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const weekLabel = (w: Week) => SHORT.format(w.start);
const weekEnd = (w: Week) => {
  const d = new Date(w.start);
  d.setDate(d.getDate() + 6);
  return d;
};

/* THE SERIES' HUES — fixed order, never cycled. Literal so Tailwind keeps them. */
const VIZ = {
  1: { bg: "bg-fp-viz-1", fill: "fill-fp-viz-1", stroke: "stroke-fp-viz-1" },
  2: { bg: "bg-fp-viz-2", fill: "fill-fp-viz-2", stroke: "stroke-fp-viz-2" },
  3: { bg: "bg-fp-viz-3", fill: "fill-fp-viz-3", stroke: "stroke-fp-viz-3" },
  4: { bg: "bg-fp-viz-4", fill: "fill-fp-viz-4", stroke: "stroke-fp-viz-4" },
  5: { bg: "bg-fp-viz-5", fill: "fill-fp-viz-5", stroke: "stroke-fp-viz-5" },
  7: { bg: "bg-fp-viz-7", fill: "fill-fp-viz-7", stroke: "stroke-fp-viz-7" },
  /* GREEN = YOUR PRICE, RED = MARKET (Pavan, 2026-10-13) — the palette's own
     green and red, not the status tokens. */
  6: { bg: "bg-fp-viz-6", fill: "fill-fp-viz-6", stroke: "stroke-fp-viz-6" },
  8: { bg: "bg-fp-viz-8", fill: "fill-fp-viz-8", stroke: "stroke-fp-viz-8" },
} as const;

/* ------------------------------------------------------------ pieces --- */

function Card({
  bare,
  title,
  note,
  aside,
  children,
  className,
}: {
  title: string;
  /** An explainer behind an ⓘ beside the title — opens on click. */
  note?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** No frame — a part of a shared card, set apart by a divider. */
  bare?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 p-4",
        !bare && "rounded-xl border border-border bg-fp-surface-1b",
        className
      )}
    >
      <header className="flex min-h-7 items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {note && <SheetSectionNote label={`About ${title}`}>{note}</SheetSectionNote>}
        </span>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A titled group of cards — the page's structure. */
function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex shrink-0 flex-col gap-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3 pt-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Legend({ items }: { items: { hue: string; label: string; value?: string; line?: "solid" | "dashed" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {it.line ? (
            <span
              aria-hidden
              className={cn("h-0.5 w-4", it.line === "dashed" ? "bg-[length:6px_2px] bg-repeat-x" : it.hue)}
              style={
                it.line === "dashed"
                  ? { backgroundImage: `linear-gradient(to right, var(--${it.hue.replace("bg-", "")}) 60%, transparent 60%)` }
                  : undefined
              }
            />
          ) : (
            <span aria-hidden className={cn("size-2.5 rounded-[3px]", it.hue)} />
          )}
          {it.label}
          {it.value && <span className="font-medium tabular-nums text-foreground">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Change against the period before. `goodWhenDown` for counts the customer wants low. */
function Change({
  now,
  then,
  goodWhenDown,
  points,
  pct,
}: {
  now: number;
  then: number;
  goodWhenDown?: boolean;
  points?: boolean;
  /** A percentage already worked out — shown to one decimal. */
  pct?: number;
}) {
  const d = pct ?? (points ? now - then : then ? ((now - then) / then) * 100 : 0);
  const shown = points || pct !== undefined ? Math.abs(d).toFixed(1) : String(Math.abs(Math.round(d)));
  if (shown === "0" || shown === "0.0") return <span className="text-sm text-muted-foreground">No change</span>;
  const up = d > 0;
  /* THE ONE MARKER (DS ui §10k, Pavan, 2026-10-20). */
  return (
    <TrendChip dir={up ? "up" : "down"} good={goodWhenDown ? !up : up}>
      {shown}
      {points ? " pts" : "%"}
    </TrendChip>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size.w, size.h] as const;
}

/** A hover card that follows the mark — a title and one row per series. */
function Tip({ x, title, rows }: { x: number; title: string; rows: { hue?: string; label: string; value: string }[] }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-0 z-10 min-w-40 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 shadow-md"
      style={{ left: x }}
    >
      <p className="mb-1 text-xs font-medium text-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.hue && <span aria-hidden className={cn("size-2 rounded-[2px]", r.hue)} />}
            {r.label}
          </span>
          <span className="font-medium tabular-nums text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = Math.ceil(v / p);
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

/* -------------------------------------------------- weekly bar chart --- */

interface BarSeries {
  key: string;
  label: string;
  hue: keyof typeof VIZ;
  value: (w: Week) => number;
  /* A SECOND CUE BESIDE COLOUR — green and red sit in the validator's 6–8
     band for protan readers in light mode, legal only with one. */
  dashed?: boolean;
}

/** Weeks across, one stacked bar each; a hover per week. One axis. */
function WeekBars({
  weeks,
  series,
  height = 168,
  format = num,
  extra,
  fill,
  limit,
}: {
  weeks: Week[];
  series: BarSeries[];
  /** A threshold drawn across the plot — a credit limit. */
  limit?: { value: number; label: string };
  height?: number;
  /** Take the height the card leaves it (at least `height`). */
  fill?: boolean;
  format?: (n: number) => string;
  /** More rows for the hover, after the series. */
  extra?: (w: Week) => { label: string; value: string }[];
}) {
  const [ref, W, H] = useWidth<HTMLDivElement>();
  if (fill && H > height) height = H;
  const [hover, setHover] = React.useState<number | null>(null);
  const padL = 40;
  const padB = 22;
  const padT = 8;
  const plotW = Math.max(0, W - padL);
  const plotH = height - padB - padT;
  const totals = weeks.map((w) => series.reduce((a, s) => a + s.value(w), 0));
  const max = niceMax(Math.max(...totals, limit?.value ?? 0, 1));
  const slot = weeks.length ? plotW / weeks.length : 0;
  const bw = Math.min(28, slot * 0.56);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const every = weeks.length > 8 ? 2 : 1;
  return (
    <div
      ref={ref}
      className={cn("relative w-full", fill && "min-h-0 flex-1")}
      style={fill ? { minHeight: height } : { height }}
      onMouseLeave={() => setHover(null)}
    >
      {W > 0 && (
        <svg width={W} height={height} className="absolute inset-x-0 top-0 block" role="img" aria-label={series.map((s) => s.label).join(", ") + " by week"}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {/* THE LIMIT — a strong dashed rule with its name at the right end. */}
          {limit && (
            <g>
              <line x1={padL} x2={W} y1={y(limit.value)} y2={y(limit.value)} className="stroke-foreground" strokeWidth={1.5} strokeDasharray="6 4" />
              <text x={W} y={y(limit.value) - 6} textAnchor="end" className="fill-foreground text-[11px] font-medium">
                {limit.label}
              </text>
            </g>
          )}
          {weeks.map((w, i) => {
            const cx = padL + slot * i + slot / 2;
            let acc = 0;
            const parts = series
              .map((s) => ({ s, v: s.value(w) }))
              .filter((p) => p.v > 0);
            return (
              <g key={i} opacity={hover === null || hover === i ? 1 : 0.45}>
                {parts.map((p, j) => {
                  const top = y(acc + p.v);
                  const h = Math.max(0, y(acc) - top - (j > 0 ? 2 : 0));
                  acc += p.v;
                  const last = j === parts.length - 1;
                  /* THE DATA END IS ROUNDED, THE BASE SQUARE — 4px. */
                  const r = last ? Math.min(4, h, bw / 2) : 0;
                  const x0 = cx - bw / 2;
                  const d = `M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${top + h} Z`;
                  return <path key={p.s.key} d={d} className={VIZ[p.s.hue].fill} />;
                })}
                {i % every === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                    {weekLabel(w)}
                  </text>
                )}
                {/* THE HIT TARGET — the whole column, bigger than the mark. */}
                <rect
                  x={padL + slot * i}
                  y={0}
                  width={slot}
                  height={padT + plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && weeks[hover] && (
        <Tip
          x={Math.min(Math.max(padL + slot * hover + slot / 2, 80), W - 80)}
          title={`Week of ${weekLabel(weeks[hover])} – ${SHORT.format(weekEnd(weeks[hover]))}`}
          rows={[
            ...series.map((s) => ({ hue: VIZ[s.hue].bg, label: s.label, value: format(s.value(weeks[hover])) })),
            ...(extra ? extra(weeks[hover]) : []),
          ]}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------- weekly line chart --- */

/** Weeks across, a 2px line per series, a crosshair on hover. One axis. */
function WeekLines({
  weeks,
  series,
  height = 168,
  format,
  fill,
}: {
  weeks: Week[];
  series: BarSeries[];
  height?: number;
  format: (n: number) => string;
  /** Take the height the card leaves it (at least `height`). */
  fill?: boolean;
}) {
  const [ref, W, H] = useWidth<HTMLDivElement>();
  if (fill && H > height) height = H;
  const [hover, setHover] = React.useState<number | null>(null);
  const padL = 48;
  const padB = 22;
  const padR = 20;
  const plotW = Math.max(0, W - padL - padR);
  const plotH = height - padB - 6;
  const all = weeks.flatMap((w) => series.map((s) => s.value(w)));
  const lo = Math.floor(Math.min(...all) * 10) / 10;
  const hi = Math.ceil(Math.max(...all) * 10) / 10;
  const x = (i: number) => padL + (weeks.length > 1 ? (i / (weeks.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => 6 + plotH - ((v - lo) / Math.max(0.01, hi - lo)) * plotH;
  const ticks = [lo, (lo + hi) / 2, hi];
  const every = weeks.length > 8 ? 2 : 1;
  return (
    <div
      ref={ref}
      className={cn("relative w-full", fill && "min-h-0 flex-1")}
      style={fill ? { minHeight: height } : { height }}
      onMouseLeave={() => setHover(null)}
    >
      {W > 0 && (
        <svg
          width={W}
          height={height}
          className="absolute inset-x-0 top-0 block"
          role="img"
          aria-label={series.map((s) => s.label).join(" and ") + " by week"}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left - padL) / Math.max(1, plotW)) * (weeks.length - 1));
            setHover(Math.min(weeks.length - 1, Math.max(0, i)));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {weeks.map((w, i) =>
            i % every === 0 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {weekLabel(w)}
              </text>
            ) : null
          )}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={6} y2={6 + plotH} className="stroke-muted-foreground/50" strokeWidth={1} />
          )}
          {series.map((s) => (
            <path
              key={s.key}
              d={weeks.map((w, i) => `${i ? "L" : "M"}${x(i)},${y(s.value(w))}`).join(" ")}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "6 5" : undefined}
              className={VIZ[s.hue].stroke}
            />
          ))}
          {hover !== null &&
            series.map((s) => (
              <circle
                key={s.key}
                cx={x(hover)}
                cy={y(s.value(weeks[hover]))}
                r={4}
                strokeWidth={2}
                className={cn(VIZ[s.hue].fill, "stroke-fp-surface-1b")}
              />
            ))}
        </svg>
      )}
      {hover !== null && weeks[hover] && (
        <Tip
          x={Math.min(Math.max(x(hover), 80), W - 80)}
          title={`Week of ${weekLabel(weeks[hover])}`}
          rows={series.map((s) => ({ hue: VIZ[s.hue].bg, label: s.label, value: format(s.value(weeks[hover])) }))}
        />
      )}
    </div>
  );
}


/*
  A BAR PER DAY (Pavan, 2026-10-20) — the period day by day, the bar's height
  the day's spend; the axis names each week's Monday. Each bar carries its
  gallons: written on it where the bar is wide enough, and always in the
  hover with the spend.
*/
const DAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
function DayBars({
  days,
  label,
  format,
  /* 40% TALLER (Pavan, 2026-10-20). */
  height = 252,
}: {
  days: { date: Date; value: number; gal: number }[];
  label: string;
  format: (n: number) => string;
  height?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);
  const padL = 56;
  const padB = 22;
  const padR = 8;
  const plotW = Math.max(0, W - padL - padR);
  const plotH = height - padB - 6;
  const hi = Math.max(...days.map((d) => d.value), 1);
  const slot = plotW / Math.max(1, days.length);
  const gap = Math.min(2, slot * 0.25);
  const bw = Math.max(1, slot - gap);
  const x = (i: number) => padL + i * slot + gap / 2;
  const y = (v: number) => 6 + plotH - (v / hi) * plotH;
  const ticks = [0, hi / 2, hi];
  /* GALLONS ON THE BAR where it fits; the hover says it either way. */
  const onBar = bw >= 30;
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {W > 0 && (
        <svg width={W} height={height} className="absolute inset-x-0 top-0 block" role="img" aria-label={`${label} spend by day`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {days.map((d, i) => (
            <g key={i} onMouseEnter={() => setHover(i)}>
              {/* A HOVER COLUMN bigger than the bar. */}
              <rect x={padL + i * slot} y={6} width={slot} height={plotH} fill="transparent" />
              <rect
                x={x(i)}
                y={y(d.value)}
                width={bw}
                height={Math.max(0, 6 + plotH - y(d.value))}
                rx={Math.min(2, bw / 2)}
                className={cn(VIZ[1].fill, hover !== null && hover !== i && "opacity-50")}
              />
              {onBar && d.gal > 0 && (
                <text x={x(i) + bw / 2} y={y(d.value) - 4} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {num(d.gal)}
                </text>
              )}
              {/* A NARROW BAR CARRIES ITS GALLONS UPRIGHT, inside it, when
                  it is tall enough to hold the figure. */}
              {!onBar && bw >= 9 && d.gal > 0 && 6 + plotH - y(d.value) >= 34 && (
                <text
                  transform={`translate(${x(i) + bw / 2}, ${y(d.value) + 4}) rotate(90)`}
                  dy="0.35em"
                  className="pointer-events-none fill-fp-surface-1b text-[9px] font-medium tabular-nums"
                >
                  {num(d.gal)}
                </text>
              )}
              {i % 7 === 0 && (
                <text x={x(i)} y={height - 6} className="fill-muted-foreground text-[11px]">
                  {SHORT.format(d.date)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && days[hover] && (
        <Tip
          x={Math.min(Math.max(x(hover) + bw / 2, 80), W - 80)}
          title={DAY_FMT.format(days[hover].date)}
          rows={[
            { hue: VIZ[1].bg, label: "Spend", value: format(days[hover].value) },
            { label: "Gallons", value: `${num(days[hover].gal)} gal` },
          ]}
        />
      )}
    </div>
  );
}

/*
  EVERY PRODUCT, DAY BY DAY, ON ONE CHART (Pavan, 2026-10-20 — "compare"):
  a bar per day stacked by product's gallons, a colour each from the DS
  categorical palette in its fixed order, named in the legend. The stack
  shows the day's total and which product led it; the hover ranks that day's
  products, highest first, with gallons and spend. No product tabs.
*/
const PRODUCT_HUE: (keyof typeof VIZ)[] = [1, 2, 3, 4, 5, 6, 7];

function ProductStack({ weeks, height = 280 }: { weeks: Week[]; height?: number }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);
  const series = PRICED_PRODUCTS.map((p, k) => ({ p, hue: PRODUCT_HUE[k % PRODUCT_HUE.length], days: dailySpend(weeks, p) }));
  const n = series[0]?.days.length ?? 0;
  const totals = Array.from({ length: n }, (_, i) => series.reduce((t, s) => t + s.days[i].gal, 0));
  const hi = Math.max(...totals, 1);
  const padL = 56;
  const padB = 22;
  const padR = 8;
  const plotW = Math.max(0, W - padL - padR);
  const plotH = height - padB - 6;
  const slot = plotW / Math.max(1, n);
  const gap = Math.min(2, slot * 0.25);
  const bw = Math.max(1, slot - gap);
  const x = (i: number) => padL + i * slot + gap / 2;
  const h = (v: number) => (v / hi) * plotH;
  const base = 6 + plotH;
  const ticks = [0, hi / 2, hi];
  return (
    <div className="flex flex-col gap-3">
      <Legend items={series.map((s) => ({ hue: VIZ[s.hue].bg, label: s.p }))} />
      <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        {W > 0 && (
          <svg width={W} height={height} className="absolute inset-x-0 top-0 block" role="img" aria-label="Gallons by product, day by day">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={base - h(t)} y2={base - h(t)} className="stroke-border" strokeWidth={1} />
                <text x={padL - 8} y={base - h(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                  {num(t)}
                </text>
              </g>
            ))}
            {Array.from({ length: n }, (_, i) => {
              let y0 = base;
              return (
                <g key={i} onMouseEnter={() => setHover(i)} className={cn(hover !== null && hover !== i && "opacity-50")}>
                  <rect x={padL + i * slot} y={6} width={slot} height={plotH} fill="transparent" />
                  {series.map((s) => {
                    const hh = h(s.days[i].gal);
                    y0 -= hh;
                    return hh > 0 ? <rect key={s.p} x={x(i)} y={y0} width={bw} height={hh} className={VIZ[s.hue].fill} /> : null;
                  })}
                  {i % 7 === 0 && (
                    <text x={x(i)} y={height - 6} className="fill-muted-foreground text-[11px]">
                      {SHORT.format(series[0].days[i].date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && series[0]?.days[hover] && (
          <Tip
            x={Math.min(Math.max(x(hover) + bw / 2, 90), W - 90)}
            title={`${DAY_FMT.format(series[0].days[hover].date)} · ${num(totals[hover])} gal`}
            rows={[...series]
              .filter((s) => s.days[hover].gal > 0)
              .sort((a, b) => b.days[hover].gal - a.days[hover].gal)
              .map((s) => ({
                hue: VIZ[s.hue].bg,
                label: s.p,
                value: `${num(s.days[hover].gal)} gal · ${usd.format(s.days[hover].usd)}`,
              }))}
          />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- headlines --- */

function Headlines({ now, before, n }: { now: Week[]; before: Week[]; n: number }) {
  const a = headline(now);
  const b = headline(before);
  const since = daysSinceEmpty();
  const tiles: { title: string; value: string; unit?: string; change: React.ReactNode; note: string }[] = [
    {
      title: "On-time delivery",
      value: `${a.onTimePct.toFixed(1)}%`,
      change: <Change now={a.onTimePct} then={b.onTimePct} points />,
      note: "delivered inside the promised window",
    },
    {
      title: "Fill rate",
      value: `${a.fillPct.toFixed(1)}%`,
      change: <Change now={a.fillPct} then={b.fillPct} points />,
      note: "of gallons requested were delivered",
    },
    {
      title: "Tanks found empty",
      value: String(a.foundEmpty),
      unit: a.foundEmpty === 1 ? "time" : "times",
      change: <Change now={a.foundEmpty} then={b.foundEmpty} goodWhenDown />,
      note: since !== null ? `${since} days since the last one` : "none on record",
    },
    {
      title: "Time to schedule",
      value: a.hoursToConfirm.toFixed(1),
      unit: "hrs",
      change: <Change now={a.hoursToConfirm} then={b.hoursToConfirm} goodWhenDown />,
      note: `from order to driver assigned by ${TENANT}`,
    },
  ];
  return (
    <div className="grid shrink-0 grid-cols-1 divide-y divide-border rounded-xl border border-border bg-fp-surface-1b sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
      {tiles.map((t) => (
        <section key={t.title} className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">{t.title}</h3>
          {/* THE EXPLAINER IS BEHIND THE NUMBER (Pavan, 2026-10-14) — no line
              under it; the figure changes under the pointer, a click shows it. */}
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${t.title}`}
                  /* NO UNDERLINE (Pavan, 2026-10-14) — the figure softens under
                     the pointer, as the alert banner's pressable titles do. */
                  className="cursor-pointer rounded-sm text-3xl font-semibold tabular-nums text-foreground outline-none transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:opacity-60"
                >
                  {t.value}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 text-xs leading-relaxed">
                {t.note[0].toUpperCase() + t.note.slice(1)}. Compared with the {n} weeks before.
              </PopoverContent>
            </Popover>
            {t.unit && <span className="text-sm text-muted-foreground">{t.unit}</span>}
            {t.change}
          </p>
        </section>
      ))}
    </div>
  );
}

/* --------------------------------------------------- needs attention --- */


/*
  WHAT THE CUSTOMER HAS TO DO (Pavan, 2026-10-13) — the title is the action
  itself, not the state ("Waiting on you" said nothing); the line under it
  says why, from the request's own flag where it has one.
*/
export type ActionKind = "credit" | "late" | "pod";
export interface NeededAction {
  kind: ActionKind;
  action: string;
  why: string;
  level: NoteLevel;
}

/*
  ATTENTION REQUIRED, IN ANIRUDH'S ORDER (review 2026-10-17): orders on hold
  for credit (one tile — how many, no balance: we only get a yes/no), orders
  running late (planned date passed, not delivered — no ETA
  yet), orders delivered with no proof of delivery. Nothing else: invoice
  disputes are not in the product yet.
*/
const KIND_ORDER: ActionKind[] = ["credit", "late", "pod"];

function actionOf(r: OrderRequest): NeededAction | null {
  if (isRunningLate(r)) {
    const d = Math.round((startOfDay(new Date()).getTime() - (dateOfKey(r.date)?.getTime() ?? 0)) / 86_400_000);
    return {
      kind: "late",
      action: "Running late",
      why: `Planned for ${printKey(r.date)} — ${d} ${d === 1 ? "day" : "days"} ago — and not delivered yet.`,
      level: "critical",
    };
  }
  if (lacksPod(r))
    return {
      kind: "pod",
      action: "No proof of delivery",
      why: `Delivered, but ${TENANT} has not shared the delivery ticket.`,
      level: "warning",
    };
  return null;
}

/*
  THE SHINE (Pavan, 2026-10-15 — replaces the comet that ran the outline):
  while "Attention required" is collapsed, a red diagonal band sweeps LEFT
  TO RIGHT across the card — seen ONLY on its outline, never on the
  background — taking the comet's ~1.9 s, every 6 seconds. The outline is a
  ring masked out of a full-size layer just inside the border; the band
  moves inside it. Still for reduced motion.
*/
/*
  THE ACTION TILE — TRIAL ON ONE KIND (Pavan, 2026-10-15), after his
  company-card reference: on top an icon tile, the PROBLEM in 1–3 words and
  one line of at most six words; at the right the act as a pill ("Clear
  dues"). The request number leads the title. A rule; then the order — ship-to,
  asset, product, total gallons — and the planned date with how many days
  are left, to nudge the customer to act.
*/
/* EVERY KIND'S FACE — the problem in 1–3 words, a line of at most six, the
   act on the pill (Pavan, 2026-10-15). */
const ACTION_FACE: Record<Exclude<ActionKind, "credit">, { icon: React.ReactNode; problem: string; line: string; pill: string }> = {
  late: { icon: <Clock />, problem: "Running late", line: "Planned date passed, not delivered", pill: "Late" },
  pod: { icon: <FileQuestion />, problem: "No proof of delivery", line: `No delivery ticket from ${TENANT}`, pill: "Ask for POD" },
};

/*
  ORDERS ON HOLD FOR CREDIT — ONE TILE (Anirudh, 2026-10-17): how many are
  blocked, so the customer sees what is at stake and clears it with the
  tenant directly. No balance and no payment here — the tenant gives a
  yes/no. Each order opens from its number.
*/
function CreditHoldTile({ held, onOpenOrder }: { held: OrderRequest[]; onOpenOrder: (id: string) => void }) {
  const gal = held.reduce((t, r) => t + r.lines.reduce((n, l) => n + (l.topOff ? 0 : l.gal), 0), 0);
  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-border bg-fp-surface-1b">
      <span className="flex items-start gap-3 p-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", pillColorClass("neutral", "violet"))}>
          <Lock />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-semibold text-foreground">
            {held.length} {held.length === 1 ? "order" : "orders"} on hold due to credit
          </span>
          <span className="text-sm text-muted-foreground">Clear it with {TENANT} to release them</span>
        </span>
        <StatusChip tone={kindTone("critical")} variant="text">
          On hold
        </StatusChip>
      </span>
      <span className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border p-3">
        <span className="col-span-2 flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Orders</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {held.map((r) => (
              <NumberLink key={r.id} no={r.requestNo} onOpen={() => onOpenOrder(r.id)} />
            ))}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Gallons held</span>
          <span className="text-sm tabular-nums text-foreground">{gal ? `${gal.toLocaleString()} gal` : "Top off"}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Ship-tos</span>
          <span className="truncate text-sm text-foreground">{Array.from(new Set(held.map((r) => r.shipTo))).join(", ")}</span>
        </span>
      </span>
    </div>
  );
}

function ActionTile({ r, a, onOpen }: { r: OrderRequest; a: NeededAction; onOpen: () => void }) {
  const face = ACTION_FACE[a.kind as Exclude<ActionKind, "credit">];
  const lines = r.lines.filter((l) => l.assetId || l.product);
  const assets = Array.from(new Set(lines.map((l) => assetById(l.assetId)?.name ?? "No tank")));
  const products = Array.from(new Set(lines.map((l) => l.product).filter(Boolean)));
  const qty = quantityText(r.lines);
  /* HOW LONG UNTIL IT IS DUE — a nudge to act (Pavan, 2026-10-15). */
  const d = r.date ? Math.round(((dateOfKey(r.date)?.getTime() ?? 0) - startOfDay(new Date()).getTime()) / 86_400_000) : null;
  /* A DELIVERED ORDER HAS NO COUNTDOWN — its date is when it came. */
  const delivered = DELIVERED.includes(r.status);
  const left =
    d === null || delivered ? "" : d > 1 ? `${d} more days left` : d === 1 ? "1 more day left" : d === 0 ? "Due today" : `${-d} ${d === -1 ? "day" : "days"} late`;
  const fact = (label: string, value: string) => (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm text-foreground" title={value}>
        {value}
      </span>
    </span>
  );
  const many = (label: string, values: string[]) => (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5" title={values.join(", ")}>
        <span className="truncate text-sm text-foreground">{values[0] ?? "—"}</span>
        {values.length > 1 && <Pill className="h-5 shrink-0 px-2 tabular-nums">+{values.length - 1}</Pill>}
      </span>
    </span>
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col rounded-xl border border-border bg-fp-surface-1b text-left transition-colors hover:border-fp-outline-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex items-start gap-3 p-3">
        {/* THE ICON WEARS THE VIOLET PILL'S COLOURS (Pavan, 2026-10-15 — after
            his reference card): calm, not an alarm; the pill carries urgency. */}
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", pillColorClass("neutral", "violet"))}>
          {face.icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          {/* THE REQUEST LEADS THE TITLE — "REQ-1120: Credit on hold" (Pavan,
              2026-10-15). */}
          <span className="text-base font-semibold text-foreground">
            {r.requestNo}: {face.problem}
          </span>
          <span className="text-sm text-muted-foreground">{face.line}</span>
        </span>
        {/* THE PILL SAYS THE ACT. */}
        <StatusChip tone={kindTone(a.level === "critical" ? "critical" : "caution")} variant="text">
          {face.pill}
        </StatusChip>
      </span>
      <span className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border p-3">
        {fact("Ship-to", r.shipTo || "—")}
        {/* MORE THAN ONE → THE FIRST AND "+N" (Pavan, 2026-10-15). */}
        {many("Asset", assets)}
        {many("Product", products)}
        {fact("Total gallons", qty ? `${qty} gal` : "—")}
        {/* THE COUNTDOWN AT THE RIGHT EDGE, on the date's line (Pavan,
            2026-10-15). */}
        {/* A LIGHTER RULE INSIDE THE CARD (Pavan, 2026-10-15). */}
        <span className="col-span-2 flex items-end justify-between gap-3 border-t border-border/50 pt-2.5">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{delivered ? "Delivered" : "Planned date"}</span>
            <span className="truncate text-sm text-foreground">{r.date ? `${printKey(r.date)}, ${windowText(r)}` : "No date"}</span>
          </span>
          {left && (
            <span className={cn("shrink-0 text-xs font-medium leading-5", d !== null && d <= 2 ? "text-status-failed" : "text-status-processing")}>
              {left}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/*
  NEEDS YOUR ACTION — a wide banner, not a card (Pavan, 2026-10-13): every
  item shows at once, each a tile that opens its order. Lightly decorative:
  the warning wash and a soft glow in the corner.
*/
function ActionBanner({
  rows,
  onOpen,
  onOpenOrder,
}: {
  rows: OrderRequest[];
  onOpen: (id: string) => void;
  onOpenOrder: (id: string) => void;
}) {
  /* COLLAPSED BY DEFAULT (Pavan, 2026-10-13) — the header and its count;
     opened, every item. */
  const [open, setOpen] = React.useState(false);
  const held = rows.filter(onCreditHold);
  const items = rows
    .map((r) => ({ r, a: actionOf(r) }))
    .filter((x): x is { r: OrderRequest; a: NonNullable<ReturnType<typeof actionOf>> } => x.a !== null)
    .sort((x, y) => KIND_ORDER.indexOf(x.a.kind) - KIND_ORDER.indexOf(y.a.kind));
  const count = items.length + (held.length ? 1 : 0);
  if (count === 0) return null;
  return (
    <section
      aria-label="Attention required"
      className="relative isolate shrink-0 overflow-hidden rounded-xl border border-status-processing/20 bg-status-processing/5 p-4"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-status-processing/10 blur-3xl"
      />
      {!open && <OutlineShine />}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-status-processing/15 text-status-processing [&_svg]:size-4">
          <BellRing />
        </span>
        <span className="text-base font-semibold text-foreground">Attention required</span>
        <span className="rounded-full bg-status-processing/15 px-2 py-0.5 text-xs font-medium tabular-nums text-status-processing">
          {count}
        </span>
        <ChevronDown
          className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {held.length > 0 && (
          <li>
            <CreditHoldTile held={held} onOpenOrder={onOpenOrder} />
          </li>
        )}
        {items.map(({ r, a }) => (
          <li key={r.id}>
            <ActionTile r={r} a={a} onOpen={() => onOpen(r.id)} />
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}

function Row({ onClick, children, label }: { onClick?: () => void; children: React.ReactNode; label: string }) {
  return (
    <li>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="group/row flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {/* NO TRAILING CHEVRON — the row is the control (Pavan, 2026-10-19). */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      </button>
    </li>
  );
}

function RequestsChart({ weeks }: { weeks: Week[] }) {
  const series: BarSeries[] = [
    { key: "onTime", label: "On time", hue: 1, value: (w) => w.onTime },
    { key: "late", label: "Late", hue: 2, value: (w) => w.late },
    { key: "partial", label: "Partial", hue: 3, value: (w) => w.partial },
  ];
  const tot = (f: (w: Week) => number) => weeks.reduce((a, w) => a + f(w), 0);
  return (
    <Card title="Orders by week">
      <Legend
        items={series.map((s) => ({ hue: VIZ[s.hue].bg, label: s.label, value: num(tot(s.value)) }))}
      />
      {/* FILLS THE CARD — beside Empty-tank reports, both axes sit on the
          cards' foot (Pavan, 2026-10-14). */}
      <WeekBars
        fill
        weeks={weeks}
        series={series}
        extra={(w) => [{ label: "Canceled", value: num(w.canceled) }]}
      />
    </Card>
  );
}

function EmptyChart({ weeks }: { weeks: Week[] }) {
  const since = daysSinceEmpty();
  const total = weeks.reduce((a, w) => a + w.foundEmpty, 0);
  return (
    <Card
      title="Empty-tank reports by week"
      /* THE EXPLAINER ON CLICK (Pavan, 2026-10-14) — not a line under the
         title. */
      note={`${total} ${total === 1 ? "time" : "times"} in these weeks, from drivers’ notes. The goal is 0.`}
      aside={
        since !== null && (
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{since}</span> days since the last one
          </span>
        )
      }
    >
      <WeekBars fill weeks={weeks} series={[{ key: "empty", label: "Found empty", hue: 1, value: (w) => w.foundEmpty }]} />
    </Card>
  );
}

/* --------------------------------------------------------------- money --- */

const daysFromToday = (key: string) => {
  const d = dateOfKey(key);
  return d ? Math.round((d.getTime() - startOfDay(new Date()).getTime()) / 86_400_000) : 0;
};

function InvoicesCard({ rows, onOpen }: { rows: OrderRequest[]; onOpen: (id: string) => void }) {
  const inv = [...OPEN_INVOICES].sort((a, b) => a.due.localeCompare(b.due));
  const bucket = (f: (d: number) => boolean) => inv.filter((i) => f(daysFromToday(i.due)));
  const overdue = bucket((d) => d < 0);
  const week = bucket((d) => d >= 0 && d <= 7);
  const later = bucket((d) => d > 7);
  const total = (xs: typeof inv) => xs.reduce((a, i) => a + i.amount, 0);
  /* AGING — how far past due, part to whole. ORDERED, so one hue light to
     dark (sequential), with not-yet-due in neutral grey. */
  const aging = [
    { key: "Not due", hue: "bg-muted-foreground/35", xs: bucket((d) => d >= 0) },
    { key: "1–30 days late", hue: "bg-fp-viz-2/55", xs: bucket((d) => d < 0 && d >= -30) },
    { key: "31+ days late", hue: "bg-fp-viz-2", xs: bucket((d) => d < -30) },
  ].filter((a) => a.xs.length > 0);
  const all = total(inv);
  return (
    <Card title="Open invoices" aside={<span className="text-sm font-semibold tabular-nums text-foreground">{usd.format(all)}</span>}>
      {/* THE FIGURES ROW — the same height as Credit's beside it, figures on
          the bottom, so the two cards' numbers and bars line up (Pavan,
          2026-10-14). */}
      <dl className="grid h-16 grid-cols-3 items-end gap-3">
        {[
          { label: "Overdue", xs: overdue, cls: "text-status-failed" },
          { label: "Due in 7 days", xs: week, cls: "text-foreground" },
          { label: "Later", xs: later, cls: "text-foreground" },
        ].map((b) => (
          <div key={b.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">
              {b.label} · {b.xs.length}
            </dt>
            <dd className={cn("text-lg leading-none font-semibold tabular-nums", b.cls)}>{usd.format(total(b.xs))}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <div className="flex h-2.5 w-full gap-0.5" role="img" aria-label="Invoice aging">
          {aging.map((a, i) => (
            <span
              key={a.key}
              title={`${a.key}: ${usd.format(total(a.xs))}`}
              className={cn("h-full", a.hue, i === 0 && "rounded-l-full", i === aging.length - 1 && "rounded-r-full")}
              style={{ width: `${(total(a.xs) / all) * 100}%` }}
            />
          ))}
        </div>
        <Legend items={aging.map((a) => ({ hue: a.hue, label: a.key, value: usd.format(total(a.xs)) }))} />
      </div>
      <ul className="-mx-2 flex flex-col divide-y divide-border">
        {inv.map((i) => {
          const d = daysFromToday(i.due);
          const live = rows.find((r) => r.requestNo === i.orderNo);
          return (
            <Row key={i.invoiceNo} label={`Open ${i.invoiceNo}`} onClick={live ? () => onOpen(live.id) : undefined}>
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">
                  {i.invoiceNo}
                  {i.disputed && <span className="ml-2 text-xs font-normal text-status-processing">Disputed</span>}
                </span>
                <span className="text-sm font-medium tabular-nums text-foreground">{usd.format(i.amount)}</span>
              </span>
              <span className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">
                  {i.orderNo} · {i.shipTo}
                </span>
                <span className={cn("shrink-0", d < 0 ? "text-status-failed" : "text-muted-foreground")}>
                  {d < 0 ? `${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Due today" : `Due in ${d} ${d === 1 ? "day" : "days"}`}
                </span>
              </span>
            </Row>
          );
        })}
      </ul>
    </Card>
  );
}

function CreditCard({ weeks }: { weeks: Week[] }) {
  const { limit, used, committed } = CREDIT;
  const available = Math.max(0, limit - used - committed);
  const parts = [
    { key: "Used", hue: VIZ[1].bg, v: used },
    { key: "Committed", hue: VIZ[2].bg, v: committed },
  ];
  return (
    <Card
      title="Credit"
      aside={
        <span className="text-xs text-muted-foreground">
          {usd.format(limit)} a {CREDIT.period} · resets {CREDIT.resets}
        </span>
      }
    >
      <p className="flex h-16 flex-wrap items-end gap-x-2">
        <span className="text-3xl leading-none font-semibold tabular-nums text-foreground">{usd.format(available)}</span>
        <span className="text-sm leading-none text-muted-foreground">available this week</span>
      </p>
      <div className="flex flex-col gap-2">
        {/* PART TO WHOLE — the track is the limit. */}
        {/* THE SAME BAR AS THE INVOICE AGING — 10px, 2px gaps, rounded ends. */}
        <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label="Credit used, committed and available">
          {parts.map((p) => (
            <span
              key={p.key}
              title={`${p.key}: ${usd.format(p.v)}`}
              className={cn("h-full first:rounded-l-full", p.hue)}
              style={{ width: `${(p.v / limit) * 100}%` }}
            />
          ))}
        </div>
        <Legend
          items={[
            ...parts.map((p) => ({ hue: p.hue, label: p.key, value: usd.format(p.v) })),
            { hue: "bg-muted", label: "Available", value: usd.format(available) },
          ]}
        />
      </div>
      {/* THE CHART TAKES THE REST OF THE CARD — it sits beside Open invoices,
          which is taller (Pavan, 2026-10-13). */}
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <WeekBars
          fill
          weeks={weeks}
          height={160}
          series={[{ key: "used", label: "Credit used", hue: 1, value: (w) => w.creditUsed }]}
          limit={{ value: limit, label: `Credit limit ${usd.format(limit)}` }}
          format={(n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : usd.format(n))}
          extra={(w) => [{ label: "Of the limit", value: `${Math.round((w.creditUsed / limit) * 100)}%` }]}
        />
      </div>
    </Card>
  );
}

/* --------------------------------------------------- products & price --- */

/*
  SPEND, AS HISTORY (Anirudh, 2026-10-17 — no market comparison: a customer
  shown "x% under market" starts shopping on price). What the account spent
  over the weeks, all products or one, week by week; then per product.
*/
const ALL = "All products";

function SpendCard({ weeks, n }: { weeks: Week[]; n: number }) {
  const [product, setProduct] = React.useState<string>(ALL);
  const one = product === ALL ? undefined : product;
  const total = spend(weeks, "paid", one);
  const gal = weeks.reduce(
    (a, w) => a + (one ? (w.byProduct[one] ?? 0) : PRICED_PRODUCTS.reduce((t, p) => t + (w.byProduct[p] ?? 0), 0)),
    0
  );
  return (
    <div className="grid divide-y divide-border rounded-xl border border-border bg-fp-surface-1b lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:divide-x lg:divide-y-0">
      <Card bare title="Total spend">
        <dl className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">
              {product} · last {n} weeks
            </dt>
            <dd className="text-4xl font-semibold tabular-nums text-foreground">{usd.format(total)}</dd>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Gallons</dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">{num(gal)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Average price</dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">
                {usd3.format(total / Math.max(1, gal))}
                <span className="text-xs font-normal text-muted-foreground"> /gal</span>
              </dd>
            </div>
          </div>
          <QuietPattern className="-mx-4 -mb-4 min-h-16 flex-1 rounded-bl-[11px]" />
        </dl>
      </Card>
      <Card bare title="Spend by week" aside={<span className="text-xs text-muted-foreground">Last {n} weeks</span>}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={product}
          onValueChange={(v) => v && setProduct(v)}
          aria-label="Product"
          className="flex w-fit flex-wrap"
        >
          {[ALL, ...PRICED_PRODUCTS].map((p) => (
            <ToggleGroupItem key={p} value={p} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <WeekLines
          fill
          weeks={weeks}
          format={(v) => usd.format(v)}
          series={[{ key: "paid", label: "Spend", hue: 6, value: (w) => spend([w], "paid", one) }]}
        />
      </Card>
    </div>
  );
}

/*
  SPEND BY PRODUCT (Pavan, 2026-10-20) — two views on a toggle. TOTALS: the
  period's spend per product, largest first. BY PRODUCT: that spend day by
  day, a product at a time (All by default) — the week-on-week line is above
  in Spend by week; this is day to day.
*/
function SpendByProductCard({ weeks, n }: { weeks: Week[]; n: number }) {
  const [view, setView] = React.useState<"totals" | "byProduct" | "compare">("totals");
  const [product, setProduct] = React.useState<string>(ALL);
  const rows = productTotals(weeks)
    .map((r) => ({ ...r, usd: PRICED_PRODUCTS.includes(r.product) ? spend(weeks, "paid", r.product) : null }))
    .filter((r) => r.gal > 0)
    .sort((x, y) => (y.usd ?? 0) - (x.usd ?? 0) || y.gal - x.gal);
  const max = Math.max(...rows.map((r) => r.usd ?? 0), 1);
  const days = dailySpend(weeks, product === ALL ? undefined : product).map((d) => ({ date: d.date, value: d.usd, gal: d.gal }));
  return (
    <Card
      title="Spend by product"
      aside={
        <span className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Last {n} weeks</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(v) => v && setView(v as "totals" | "byProduct" | "compare")}
            aria-label="Spend by product view"
            className="h-7"
          >
            <ToggleGroupItem value="totals" className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
              Totals
            </ToggleGroupItem>
            <ToggleGroupItem value="byProduct" className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
              By days
            </ToggleGroupItem>
            <ToggleGroupItem value="compare" className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
              Compare
            </ToggleGroupItem>
          </ToggleGroup>
        </span>
      }
    >
      {view === "totals" ? (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.product} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3" title={`${r.product}: ${num(r.gal)} gal`}>
              <span className="truncate text-sm text-foreground">{r.product}</span>
              <span className="h-2 rounded-r-[4px] bg-fp-viz-1" style={{ width: `${((r.usd ?? 0) / max) * 100}%` }} />
              <span className="flex w-44 items-center justify-end gap-3 text-right">
                <span className="text-xs tabular-nums text-muted-foreground">{num(r.gal)} gal</span>
                <span className="w-20 text-sm tabular-nums text-foreground">{r.usd === null ? "—" : usd.format(r.usd)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : view === "compare" ? (
        <ProductStack weeks={weeks} />
      ) : (
        <>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={product}
            onValueChange={(v) => v && setProduct(v)}
            aria-label="Product"
            className="flex w-fit flex-wrap"
          >
            {[ALL, ...PRICED_PRODUCTS].map((p) => (
              <ToggleGroupItem key={p} value={p} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <DayBars days={days} label={product === ALL ? "All products" : product} format={(v) => usd.format(v)} />
        </>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------- coming up --- */

/*
  THE SCHEDULE AS CARDS (Pavan, 2026-10-19 — like the Orders page's overview):
  one card, three tiles ruled apart — Today, Tomorrow, the next 7 days —
  each with how many deliveries, how many products, the gallons and how many
  ship-tos it covers. "View details" opens the full table in a sheet.
*/
const dayKeyAhead = (n: number) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** THE 7 DAYS BEFORE TODAY — every delivery that was planned for them
    (made or not), to compare the week ahead against. */
function previousWeek(rows: OrderRequest[]) {
  const from = dayKeyAhead(-7);
  const to = dayKeyAhead(-1);
  const gone: RequestStatus[] = ["Draft", "Canceled"];
  return orderListRows(rows).filter((r) => r.date >= from && r.date <= to && !gone.includes(r.status));
}

/** Every delivery still to come in the next 7 days — the Orders list's rows. */
function upcoming(rows: OrderRequest[]) {
  const t = todayKey();
  const end = dayKeyAhead(6);
  return orderListRows(rows)
    .filter((r) => r.date >= t && r.date <= end && (YET_TO_DELIVER.includes(r.status) || r.status === "Out for delivery"))
    .sort((a, b) => a.date.localeCompare(b.date) || a.windowStart - b.windowStart);
}

/** UP, DOWN OR THE SAME as the 7 days before (Pavan, 2026-10-20 — the
    reference's chip): a soft pill with a small filled triangle — green up,
    red down, grey the same. */
function WeekChange({ now, then }: { now: number; then: number }) {
  const same = now === then;
  const pct = then ? Math.round((Math.abs(now - then) / then) * 100) : null;
  return (
    <TrendChip dir={same ? "same" : now > then ? "up" : "down"}>
      {same ? "Same" : pct === null ? `+${now - then}` : `${pct}%`}
    </TrendChip>
  );
}

/** One figure of the next 7 days, against the 7 days before. The term's
    icon at the top right, in the accent (Pavan, 2026-10-20). */
function ScheduleTile({
  title,
  icon: Icon,
  value,
  then,
  format = (n: number) => n.toLocaleString(),
  unit,
  sub,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: number;
  then: number;
  format?: (n: number) => string;
  unit?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-1 flex-col gap-1 px-4 py-3", className)}>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {/* THE FIGURE, ITS CHANGE AND THE "VS" LINE ARE ONE UNIT; the icon,
          larger, sits beside it, centred on it (Pavan, 2026-10-20). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{format(value)}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            <WeekChange now={value} then={then} />
          </p>
          <p className="text-xs text-muted-foreground">
            {sub ? `${sub} · ` : ""}vs {format(then)} the previous 7 days
          </p>
        </div>
        {/* THE DS METRIC ICON (§10k). */}
        <MetricIcon icon={Icon} />
      </div>
    </section>
  );
}

function ScheduleOverview({
  rows,
  onOpen,
  details,
  setDetails,
}: {
  rows: OrderRequest[];
  onOpen: (id: string) => void;
  details: boolean;
  setDetails: (o: boolean) => void;
}) {
  const next = upcoming(rows);
  const before = previousWeek(rows);
  const figures = (list: OrderRequest[]) => ({
    deliveries: list.length,
    products: new Set(list.flatMap((r) => r.lines.map((l) => l.product).filter(Boolean))).size,
    q: quantityOf(list.flatMap((r) => r.lines)),
    sites: new Set(list.map((r) => r.shipTo)).size,
  });
  const a = figures(next);
  const b = figures(before);
  const shipTos = SHIP_TOS.filter((x) => x.status === "Active").length;
  return (
    <>
      <div className="relative shrink-0 rounded-xl border border-border bg-fp-surface-1b">
        {/* FOUR FIGURES, THE NEXT 7 DAYS (Pavan, 2026-10-19). */}
        <div className="flex flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
          <ScheduleTile title="Deliveries" icon={TERM_ICONS.deliveries} value={a.deliveries} then={b.deliveries} />
          <ScheduleTile title="Products" icon={TERM_ICONS.products} value={a.products} then={b.products} />
          <ScheduleTile
            title="Gallons"
            icon={TERM_ICONS.gallons}
            value={a.q.gal}
            then={b.q.gal}
            format={num}
            unit="gal"
            sub={a.q.topOff ? `+ ${a.q.topOff} top off` : undefined}
          />
          {/* Room for the corner button. */}
          <ScheduleTile
            title="Ship-tos"
            icon={TERM_ICONS.shipTos}
            value={a.sites}
            then={b.sites}
            unit={`of ${shipTos}`}
            className="pr-12"
          />
        </div>
        {/* THE ONE CONTROL, IN THE CARD'S CORNER — as the Orders overview. */}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="View the next 7 days"
          title="View details"
          onClick={() => setDetails(true)}
          className="absolute top-2.5 right-2.5 rounded-full"
        >
          <ArrowUpRight />
        </Button>
      </div>
      <RecordSheet
        fit={{ tables: [[CELL.date, CELL.pick, CELL.pick, CELL.pick, CELL.pick, CELL.number, CELL.pick, CELL.status]] }}
        open={details}
        onOpenChange={setDetails}
        mode="edit"
        editTitle="Next 7 days"
        createTitle=""
        createAction=""
        showCancel={false}
        onSubmit={() => {}}
        footerPrimary={null}
      >
        <ScheduleTable
          list={next}
          onOpen={(id) => {
            setDetails(false);
            onOpen(id);
          }}
        />
      </RecordSheet>
    </>
  );
}

function ScheduleTable({ list, onOpen }: { list: OrderRequest[]; onOpen: (id: string) => void }) {
  const t = todayKey();
  if (list.length === 0) return <p className="text-sm text-muted-foreground">No deliveries planned.</p>;
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-fp-table-header hover:bg-fp-table-header">
            <TableHead className="pl-4">Date</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Ship-to</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Repeats</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
              <TableCell className="pl-4">{r.date === t ? "Today" : printKey(r.date)}</TableCell>
              <TableCell className="tabular-nums">{windowText(r)}</TableCell>
              <TableCell className="font-medium text-foreground tabular-nums">{r.requestNo}</TableCell>
              <TableCell>{r.shipTo}</TableCell>
              <TableCell className="tabular-nums">{quantityText(r.lines)}</TableCell>
              <TableCell>
                {r.recurring ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat className="size-3.5 text-muted-foreground" />
                    {r.frequency}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="pr-4">
                <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
                  {r.status}
                </StatusChip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------------------------------------------------------------- screen --- */

export function DashboardScreen() {
  const rows = useRequests();
  const [range, setRange] = React.useState<RangeWeeks>(DEFAULT_RANGE);
  const { now } = periods(range);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creatingId, setCreatingId] = React.useState<string | null>(null);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const actionReq = rows.find((r) => r.id === actionId) ?? null;
  const from = now[0];
  const to = now[now.length - 1];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-6">

      {/* WHAT NEEDS YOU, FIRST (Anirudh review, 2026-10-17) — delivery
          performance moved to Reports. A tile opens what is needed; the
          order is one press further. */}
      <ActionBanner rows={rows} onOpen={setActionId} onOpenOrder={setOpenId} />

      {/* THE NEXT 7 DAYS, UP FRONT (Anirudh, 2026-10-17). */}
      {/* THE HEADER SAYS THE SPAN, once (Pavan, 2026-10-20). */}
      <Section title="Schedule for the next 7 days">
        <ScheduleOverview rows={rows} onOpen={setOpenId} details={scheduleOpen} setDetails={setScheduleOpen} />
      </Section>

      {/* TANK HEALTH (Pavan, 2026-10-20) — levels by band, days to empty,
          monitor battery; each count opens its tanks, each can be ordered. */}
      <Section title="Tank monitor readings">
        <TankHealthCard
          rows={rows}
          onCreateOrder={(shipTo, assetId) => {
            const r = createRequest();
            updateRequest(r.id, {
              shipTo,
              lines: [
                {
                  assetId,
                  product: lastProductFor(assetId, rows) ?? assetById(assetId)?.product ?? "",
                  topOff: false,
                  gal: 0,
                },
              ],
            });
            setCreatingId(r.id);
            setOpenId(r.id);
          }}
        />
      </Section>

      {/* THE RANGE SITS ON SPEND, the unit it scopes (Pavan, 2026-10-20). */}
      <Section
        title="Spend"
        aside={
          <span className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {SHORT.format(from.start)} – {DATE_FMT.format(weekEnd(to))}
            </span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(range)}
              onValueChange={(v) => v && setRange(Number(v) as RangeWeeks)}
              aria-label="Time range"
              className="h-7"
            >
              {RANGES.map((r) => (
                <ToggleGroupItem key={r} value={String(r)} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
                  Last {r} weeks
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </span>
        }
      >
        <SpendCard weeks={now} n={range} />
        <SpendByProductCard weeks={now} n={range} />
      </Section>

      <Section title="Billing & credit">
        <div className="grid gap-4 lg:grid-cols-2">
          <InvoicesCard rows={rows} onOpen={setOpenId} />
          {/* CREDIT ONLY WHERE THE TENANT GIVES IT (Pavan, 2026-10-13). */}
          {CREDIT.enabled && <CreditCard weeks={now} />}
        </div>
      </Section>

      <ActionSheet
        request={actionReq}
        action={actionReq ? actionOf(actionReq) : null}
        open={actionId !== null}
        onOpenChange={(o) => !o && setActionId(null)}
        onViewOrder={(id) => {
          setActionId(null);
          setOpenId(id);
        }}
      />
      <OrderRequestSheet
        request={rows.find((r) => r.id === openId) ?? null}
        open={openId !== null}
        creating={creatingId !== null && creatingId === openId}
        onOpenChange={(o) => {
          if (o) return;
          setOpenId(null);
          setCreatingId(null);
        }}
        onDuplicate={(id) => {
          setCreatingId(id);
          setOpenId(id);
        }}
      />
    </div>
  );
}

/*
  DELIVERY PERFORMANCE — A REPORT (Anirudh review, 2026-10-17: the dashboard
  is a few things to glance at; reports are what you generate and take
  away). The four headlines against the weeks before, then requests by week
  and empty-tank reports. On the Reports page.
*/
export function DeliveryPerformanceReport() {
  const [range, setRange] = React.useState<RangeWeeks>(DEFAULT_RANGE);
  const { now, before } = periods(range);
  const from = now[0];
  const to = now[now.length - 1];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {SHORT.format(from.start)} – {DATE_FMT.format(weekEnd(to))}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(range)}
          onValueChange={(v) => v && setRange(Number(v) as RangeWeeks)}
          aria-label="Time range"
          className="h-7"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem key={r} value={String(r)} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
              Last {r} weeks
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Section title="Delivery performance">
        <Headlines now={now} before={before} n={range} />
        <div className="grid gap-4 lg:grid-cols-2">
          <RequestsChart weeks={now} />
          <EmptyChart weeks={now} />
        </div>
      </Section>
    </div>
  );
}
