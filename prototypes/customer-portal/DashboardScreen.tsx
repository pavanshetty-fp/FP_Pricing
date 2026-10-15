import * as React from "react";
import { ArrowDown, ArrowUp, BellRing, ChevronDown, ChevronRight, Repeat } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SheetSectionNote } from "@/components/side-sheet/parts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DATE_FMT, startOfDay } from "../unified-view/data";
import {
  REQUEST_STATUS_TONE,
  TENANT,
  YET_TO_DELIVER,
  assetById,
  dateOfKey,
  printKey,
  quantityText,
  shipToOfAsset,
  todayKey,
  useRequests,
  windowText,
  type OrderRequest,
} from "./orders";
import { OrderRequestSheet } from "./OrderRequestSheet";
import {
  CREDIT,
  DEFAULT_RANGE,
  DRIVER_NOTES,
  OPEN_INVOICES,
  PRICED_PRODUCTS,
  RANGES,
  SHOW_MARKET_PRICE,
  daysSinceEmpty,
  headline,
  periods,
  productTotals,
  savings,
  type NoteLevel,
  type RangeWeeks,
  type Week,
} from "./dashboard";

/*
  THE DASHBOARD (Pavan, 2026-10-13) — the landing page. It answers, in order:

    How are my requests being met?   four headline figures, each against the
                                     same number of weeks before
    What needs me now?               orders, and assets drivers flagged
    Week on week                     requests on time / late / partial; times
                                     a tank was found empty (the goal is 0)
    Money                            invoices to pay; credit, when the tenant
                                     gives it
    Products and price               gallons per product against the period
                                     before; the price paid against market
    Coming up                        the next 7 days of deliveries

  DEFAULT RANGE = 8 FULL WEEKS (Pavan, 2026-10-13): eight bars is enough to
  see a trend and short enough that a change made last month shows; it spans
  two monthly invoice cycles. 4 and 12 weeks are a press away.

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
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex shrink-0 flex-col gap-3" aria-label={title}>
      <h2 className="pt-2 text-base font-semibold text-foreground">{title}</h2>
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
function Change({ now, then, goodWhenDown, points }: { now: number; then: number; goodWhenDown?: boolean; points?: boolean }) {
  const d = points ? now - then : then ? ((now - then) / then) * 100 : 0;
  const shown = points ? Math.abs(d).toFixed(1) : String(Math.abs(Math.round(d)));
  if (shown === "0" || shown === "0.0") return <span className="text-sm text-muted-foreground">No change</span>;
  const up = d > 0;
  const good = goodWhenDown ? !up : up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        good ? "text-status-success" : "text-status-processing"
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full [&_svg]:size-3",
          good ? "bg-status-success/15" : "bg-status-processing/15"
        )}
      >
        {up ? <ArrowUp /> : <ArrowDown />}
      </span>
      {shown}
      {points ? " pts" : "%"}
    </span>
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
      title: "Time to confirm",
      value: a.hoursToConfirm.toFixed(1),
      unit: "hrs",
      change: <Change now={a.hoursToConfirm} then={b.hoursToConfirm} goodWhenDown />,
      note: `from request to scheduled by ${TENANT}`,
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

const LEVEL_TEXT: Record<NoteLevel, string> = {
  critical: "text-status-failed",
  warning: "text-status-processing",
  info: "text-foreground",
};

/*
  WHAT THE CUSTOMER HAS TO DO (Pavan, 2026-10-13) — the title is the action
  itself, not the state ("Waiting on you" said nothing); the line under it
  says why, from the request's own flag where it has one.
*/
function actionOf(r: OrderRequest): { action: string; why: string; level: NoteLevel } | null {
  const flag = (k: string) => r.flags.find((f) => f.kind === k);
  const hold = flag("Credit hold");
  if (r.status === "Action needed")
    return hold
      ? { action: "Clear your balance to release this order", why: hold.detail, level: "critical" }
      : { action: `Answer ${TENANT}’s question`, why: `${TENANT} needs more from you before it can schedule.`, level: "critical" };
  if (r.status === "Quote sent")
    return { action: "Accept or decline the quote", why: `${TENANT} has priced this request; it is not scheduled until you accept.`, level: "warning" };
  if (r.status === "Invoice disputed")
    return {
      action: `Settle the disputed invoice with ${TENANT}`,
      why: flag("Invoice past due")?.detail ?? "The invoice is on hold until the dispute is settled.",
      level: "warning",
    };
  if (r.status === "Partial delivery")
    return {
      action: "Reorder the gallons not delivered",
      why: flag("Driver note")?.detail ?? "Part of this order was not delivered.",
      level: "warning",
    };
  const late = flag("At risk of being late");
  if (late) return { action: "Confirm the site can take a later delivery", why: late.detail, level: "warning" };
  if (hold) return { action: "Clear your balance to release this order", why: hold.detail, level: "critical" };
  return null;
}

/*
  NEEDS YOUR ACTION — a wide banner, not a card (Pavan, 2026-10-13): every
  item shows at once, each a tile that opens its order. Lightly decorative:
  the warning wash and a soft glow in the corner.
*/
function ActionBanner({ rows, onOpen }: { rows: OrderRequest[]; onOpen: (id: string) => void }) {
  /* COLLAPSED BY DEFAULT (Pavan, 2026-10-13) — the header and its count;
     opened, every item. */
  const [open, setOpen] = React.useState(false);
  const order: NoteLevel[] = ["critical", "warning", "info"];
  const items = rows
    .map((r) => ({ r, a: actionOf(r) }))
    .filter((x): x is { r: OrderRequest; a: NonNullable<ReturnType<typeof actionOf>> } => x.a !== null)
    .sort((x, y) => order.indexOf(x.a.level) - order.indexOf(y.a.level));
  if (items.length === 0) return null;
  return (
    <section
      aria-label="Needs your action"
      className="relative isolate shrink-0 overflow-hidden rounded-xl border border-status-processing/20 bg-status-processing/5 p-4"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-status-processing/10 blur-3xl"
      />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-status-processing/15 text-status-processing [&_svg]:size-4">
          <BellRing />
        </span>
        <span className="text-base font-semibold text-foreground">Needs your action</span>
        <span className="rounded-full bg-status-processing/15 px-2 py-0.5 text-xs font-medium tabular-nums text-status-processing">
          {items.length}
        </span>
        <ChevronDown
          className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ r, a }) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex h-full w-full flex-col gap-1.5 rounded-lg border border-border bg-fp-surface-1b p-3 text-left transition-colors hover:border-fp-outline-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className={cn("text-sm font-semibold", LEVEL_TEXT[a.level])}>{a.action}</span>
              <span className="text-sm text-muted-foreground">{a.why}</span>
              <span className="mt-auto flex items-center justify-between gap-3 pt-1">
                <span className="truncate text-xs text-muted-foreground">
                  {r.requestNo} · {r.shipTo} · {r.date ? printKey(r.date) : "No date"}
                </span>
                <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
                  {r.status}
                </StatusChip>
              </span>
            </button>
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
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </li>
  );
}

/* DRIVER REPORTS — a table (Pavan, 2026-10-13): asset, ship-to, the issue,
   driver, date, order. The issue's name is coloured by level as Flags are. */
function DriverReports() {
  const notes = [...DRIVER_NOTES].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card title="Driver reports" aside={<span className="text-sm tabular-nums text-muted-foreground">{notes.length}</span>}>
      <div className="-mx-4 -mb-4 overflow-hidden rounded-b-xl border-t border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-fp-table-header hover:bg-fp-table-header">
              <TableHead className="pl-4">Asset</TableHead>
              <TableHead>Ship-to</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="pr-4">Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="pl-4 font-medium text-foreground">{assetById(n.assetId)?.name ?? "Asset"}</TableCell>
                <TableCell>{shipToOfAsset(n.assetId)?.name ?? "—"}</TableCell>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-col gap-0.5">
                    <span className={cn("font-medium", LEVEL_TEXT[n.level])}>{n.kind}</span>
                    <span className="text-xs text-muted-foreground">{n.detail}</span>
                  </span>
                </TableCell>
                <TableCell>{n.driver}</TableCell>
                <TableCell className="tabular-nums">{DATE_FMT.format(new Date(n.at))}</TableCell>
                <TableCell className="pr-4 tabular-nums">{n.requestNo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------- week on week --- */

function RequestsChart({ weeks }: { weeks: Week[] }) {
  const series: BarSeries[] = [
    { key: "onTime", label: "On time", hue: 1, value: (w) => w.onTime },
    { key: "late", label: "Late", hue: 2, value: (w) => w.late },
    { key: "partial", label: "Partial", hue: 3, value: (w) => w.partial },
  ];
  const tot = (f: (w: Week) => number) => weeks.reduce((a, w) => a + f(w), 0);
  return (
    <Card title="Requests by week">
      <Legend
        items={series.map((s) => ({ hue: VIZ[s.hue].bg, label: s.label, value: num(tot(s.value)) }))}
      />
      {/* FILLS THE CARD — beside Empty-tank reports, both axes sit on the
          cards' foot (Pavan, 2026-10-14). */}
      <WeekBars
        fill
        weeks={weeks}
        series={series}
        extra={(w) => [{ label: "Cancelled", value: num(w.cancelled) }]}
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
          const live = rows.find((r) => r.requestNo === i.requestNo);
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
                  {i.requestNo} · {i.shipTo}
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

function ProductsCard({ now, before, n }: { now: Week[]; before: Week[]; n: number }) {
  const a = productTotals(now);
  const b = productTotals(before);
  const rows = a
    .map((r, i) => ({ ...r, before: b[i].gal }))
    .filter((r) => r.gal > 0 || r.before > 0)
    .sort((x, y) => y.gal - x.gal);
  const max = Math.max(...rows.flatMap((r) => [r.gal, r.before]), 1);
  return (
    <Card title="Volume by product">
      <Legend
        items={[
          { hue: VIZ[1].bg, label: `Last ${n} weeks` },
          { hue: "bg-muted-foreground/35", label: `${n} weeks before` },
        ]}
      />
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const d = r.before ? Math.round(((r.gal - r.before) / r.before) * 100) : 0;
          return (
            <li key={r.product} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3" title={`${r.product}: ${num(r.gal)} gal (before: ${num(r.before)} gal)`}>
              <span className="truncate text-sm text-foreground">{r.product}</span>
              <span className="flex flex-col gap-0.5">
                <span className="h-2 rounded-r-[4px] bg-fp-viz-1" style={{ width: `${(r.gal / max) * 100}%` }} />
                <span className="h-1.5 rounded-r-[3px] bg-muted-foreground/35" style={{ width: `${(r.before / max) * 100}%` }} />
              </span>
              <span className="flex w-28 items-center justify-end gap-2 text-right">
                <span className="text-sm tabular-nums text-foreground">{num(r.gal)}</span>
                <span className="w-10 text-xs tabular-nums text-muted-foreground">
                  {d === 0 ? "—" : `${d > 0 ? "+" : "−"}${Math.abs(d)}%`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/*
  PRICE VS MARKET, PER PRODUCT (Pavan, 2026-10-13) — two cards in a row: on
  the left, what the customer saved against market for the chosen product
  and weeks; on the right, a tab per product and their price (green) against
  the market's (red), week by week. The point is to show the value of
  ordering through the tenant.
*/
function SavingsCard({
  weeks,
  before,
  product,
  n,
  bare,
}: {
  weeks: Week[];
  before: Week[];
  product: string;
  n: number;
  bare?: boolean;
}) {
  const saved = savings(weeks, product);
  const all = savings(weeks);
  const allBefore = savings(before);
  const avg = (k: "paid" | "market") =>
    weeks.reduce((a, w) => a + (w.prices[product]?.[k] ?? 0), 0) / Math.max(1, weeks.length);
  return (
    <Card bare={bare} title="Saved vs market">
      <dl className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">
            {product} · last {n} weeks
          </dt>
          <dd className="text-4xl font-semibold tabular-nums text-status-success">{usd.format(saved)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className={cn("size-2 rounded-[2px]", VIZ[6].bg)} />
              Your average
            </dt>
            <dd className="text-base font-semibold tabular-nums text-foreground">
              {usd3.format(avg("paid"))}
              <span className="text-xs font-normal text-muted-foreground"> /gal</span>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className={cn("size-2 rounded-[2px]", VIZ[8].bg)} />
              Market average
            </dt>
            <dd className="text-base font-semibold tabular-nums text-foreground">
              {usd3.format(avg("market"))}
              <span className="text-xs font-normal text-muted-foreground"> /gal</span>
            </dd>
          </div>
        </div>
        {/* ALL PRODUCTS — the figure first, its label under it, and on the
            right the change on the weeks before; its hover says from what
            (Pavan, 2026-10-14). No other words. */}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-0.5">
            <dd className="text-base font-semibold tabular-nums text-foreground">{usd.format(all)}</dd>
            <dt className="text-xs text-muted-foreground">All products · last {n} weeks</dt>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">
                <Change now={all} then={allBefore} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {usd.format(allBefore)} saved in the {n} weeks before
            </TooltipContent>
          </Tooltip>
        </div>
      </dl>
    </Card>
  );
}

function PriceCard({
  weeks,
  product,
  onProduct,
  bare,
}: {
  weeks: Week[];
  product: string;
  onProduct: (p: string) => void;
  bare?: boolean;
}) {
  return (
    <Card bare={bare} title="Price vs market">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={product}
        onValueChange={(v) => v && onProduct(v)}
        aria-label="Product"
        className="flex w-fit flex-wrap"
      >
        {PRICED_PRODUCTS.map((p) => (
          <ToggleGroupItem key={p} value={p} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
            {p}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Legend
        items={[
          { hue: VIZ[6].bg, label: "Your price", line: "solid" },
          { hue: VIZ[8].bg, label: "Market price", line: "dashed" },
        ]}
      />
      <WeekLines
        fill
        weeks={weeks}
        format={(v) => usd3.format(v)}
        series={[
          { key: "paid", label: "Your price", hue: 6, value: (w) => w.prices[product]?.paid ?? 0 },
          { key: "market", label: "Market price", hue: 8, dashed: true, value: (w) => w.prices[product]?.market ?? 0 },
        ]}
      />
    </Card>
  );
}

/* ----------------------------------------------------------- coming up --- */

function ComingUp({ rows, onOpen }: { rows: OrderRequest[]; onOpen: (id: string) => void }) {
  const t = todayKey();
  const end = (() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const next = rows
    .filter((r) => r.date >= t && r.date <= end && (YET_TO_DELIVER.includes(r.status) || r.status === "Out for delivery"))
    .sort((a, b) => a.date.localeCompare(b.date) || a.windowStart - b.windowStart);
  return (
    <Card title="Next 7 days" aside={<span className="text-sm tabular-nums text-muted-foreground">{next.length}</span>}>
      {next.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliveries planned.</p>
      ) : (
        <div className="-mx-4 -mb-4 overflow-hidden rounded-b-xl border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-fp-table-header hover:bg-fp-table-header">
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Ship-to</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Repeats</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {next.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                  <TableCell className="pl-4">{r.date === t ? "Today" : printKey(r.date)}</TableCell>
                  <TableCell className="tabular-nums">{windowText(r)}</TableCell>
                  <TableCell className="font-medium text-foreground tabular-nums">{r.requestNo}</TableCell>
                  <TableCell>{r.shipTo}</TableCell>
                  <TableCell className="text-right tabular-nums">{quantityText(r.lines)}</TableCell>
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
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- screen --- */

export function DashboardScreen() {
  const rows = useRequests();
  const [range, setRange] = React.useState<RangeWeeks>(DEFAULT_RANGE);
  const { now, before } = periods(range);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creatingId, setCreatingId] = React.useState<string | null>(null);
  const [product, setProduct] = React.useState<string>(PRICED_PRODUCTS[0]);
  const from = now[0];
  const to = now[now.length - 1];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-6">
      {/* THE RANGE — one row above everything it scopes. */}
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

      {/* BELOW PERFORMANCE, COLLAPSED (Pavan, 2026-10-13). */}
      <ActionBanner rows={rows} onOpen={setOpenId} />

      <Section title="Products & pricing">
        {/* THE TENANT CHOOSES WHETHER MARKET PRICES ARE SHOWN. ONE CARD, TWO
            PARTS RULED APART (Pavan, 2026-10-14) — as the Delivery
            performance headlines: saved against market, then the chart. */}
        {SHOW_MARKET_PRICE && (
          <div className="grid divide-y divide-border rounded-xl border border-border bg-fp-surface-1b lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:divide-x lg:divide-y-0">
            <SavingsCard bare weeks={now} before={before} product={product} n={range} />
            <PriceCard bare weeks={now} product={product} onProduct={setProduct} />
          </div>
        )}
        <ProductsCard now={now} before={before} n={range} />
      </Section>

      <Section title="Asset health">
        <DriverReports />
      </Section>

      <Section title="Billing & credit">
        <div className="grid gap-4 lg:grid-cols-2">
          <InvoicesCard rows={rows} onOpen={setOpenId} />
          {/* CREDIT ONLY WHERE THE TENANT GIVES IT (Pavan, 2026-10-13). */}
          {CREDIT.enabled && <CreditCard weeks={now} />}
        </div>
      </Section>

      <Section title="Schedule">
        <ComingUp rows={rows} onOpen={setOpenId} />
      </Section>

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
