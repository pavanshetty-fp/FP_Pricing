import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
  THE MODULE DASHBOARD'S PARTS (Pavan, 2026-10-05) — shared by 3PL and Sales.

  EVERYTHING ON A DASHBOARD IS A WAY INTO A LIST. A number, a bar or a row is
  pressed to open the list it counts, already narrowed to exactly those rows,
  so the dashboard never states a figure the reader cannot go and check.

  WHITE CARDS ON A GROUND (2026-10-05, after the reference dashboard): the
  dashboard sits on the inner-panel grey and every card is the content layer,
  borderless, rounded large. In dark the two swap so the cards still sit
  above their ground.

  COLOUR BY THE JOB IT DOES, from the validated `--fp-viz-*` palette:
  · a count over stages or time is ONE series — slot 1 blue, the peak lit and
    the rest a quiet tint of it, so the eye finds the busiest bar first;
  · a share of a whole is IDENTITY — one segment per part in the palette's
    fixed order, with a dot beside each name so colour is never alone;
  · a ranking is ONE series again — slot 1 blue throughout.
*/

/** The dashboard's ground — wraps the cards. */
export const DASHBOARD_GROUND = "rounded-xl bg-fp-surface-1a p-3 dark:bg-fp-surface-1b";
const CARD = "rounded-xl bg-fp-surface-1b shadow-xs dark:bg-fp-surface-1a";

const BAR = "bg-fp-viz-1";
/** Categorical slots in their fixed order. Literal so Tailwind keeps them. */
const VIZ = [
  "bg-fp-viz-1",
  "bg-fp-viz-2",
  "bg-fp-viz-3",
  "bg-fp-viz-4",
  "bg-fp-viz-5",
  "bg-fp-viz-6",
  "bg-fp-viz-7",
  "bg-fp-viz-8",
];

export function Panel({
  title,
  aside,
  className,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", CARD, className)}>
      <header className="flex items-baseline justify-between gap-3 px-5 pt-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </header>
      <div className="min-w-0 flex-1 px-5 pt-4 pb-5">{children}</div>
    </section>
  );
}

/** A headline number. Pressing it opens the rows it counts. */
export function StatTile({
  label,
  value,
  note,
  onOpen,
}: {
  label: string;
  value: string;
  note?: string;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className={cn(
        "flex min-w-0 flex-col items-start gap-2 p-5 text-left outline-none transition-shadow enabled:cursor-pointer enabled:hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50",
        CARD
      )}
    >
      {/* THE OPEN ARROW ON EVERY FIGURE TILE (Pavan, 2026-10-26 — the CP
          overview's shape in every module). The tile is the button, so the
          arrow is drawn, not a second control. */}
      <span className="flex w-full items-start justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {onOpen && (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-input bg-transparent text-foreground dark:bg-fp-field-fill [&_svg]:size-4"
          >
            <ArrowUpRight />
          </span>
        )}
      </span>
      <span className="text-3xl font-semibold tabular-nums text-foreground">{value}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </button>
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** What the tooltip says, e.g. "3 orders · $9,323". */
  detail?: string;
  onOpen?: () => void;
}

/**
 * VERTICAL BARS — a count per stage or per day. The value sits above each
 * bar and the label under it; hover names it in full; press opens it. Bars
 * keep a 4px rounded top on a shared baseline and a 2px gap between them.
 */
export function BarColumns({ data, height = 140 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  /* THE PEAK IS LIT — the first bar at the maximum, when there is one. */
  const peak = data.findIndex((d) => d.value === max && d.value > 0);
  return (
    <div className="flex items-end gap-0.5" style={{ height: height + 40 }}>
      {data.map((d, i) => (
        <Tooltip key={d.key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={d.onOpen}
              disabled={!d.onOpen}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-sm px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "text-xs tabular-nums",
                  i === peak ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {d.value}
              </span>
              <span className="flex w-full items-end justify-center" style={{ height }}>
                <span
                  className={cn(
                    "w-full max-w-11 rounded-md transition-colors",
                    d.value === 0
                      ? "bg-fp-outline-1"
                      : i === peak
                        ? BAR
                        : "bg-fp-viz-1/15 group-hover:bg-fp-viz-1/40 dark:bg-fp-viz-1/25 dark:group-hover:bg-fp-viz-1/50"
                  )}
                  style={{ height: d.value > 0 ? Math.max(6, (d.value / max) * height) : 3 }}
                />
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-xs",
                  i === peak ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {d.label}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-medium">{d.label}</span>
            {" · "}
            {d.detail ?? d.value}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * A RANKED LIST WITH BARS — share of a whole, or the top few of something.
 * Name on the left, the figure and its share on the right, the bar under the
 * name. Press a row to open it.
 */
export function BarList({
  data,
  format = (n) => n.toLocaleString(),
  share = false,
  total: wholeTotal,
}: {
  /** THE WHOLE, WHEN ONLY PART OF IT IS SHOWN (Pricing, 2026-11-16) — a top
   *  five's percentages are shares of everything, not of the five. Optional:
   *  without it the shown bars are the whole, as before. */
  total?: number;
  data: BarDatum[];
  format?: (n: number) => string;
  /**
   * A SHARE OF A WHOLE: one segmented bar across the top, a segment per part
   * in the palette's fixed order, and a coloured dot beside each name below.
   * A ninth part and beyond fold into the last slot's neighbour — keep
   * shares to eight.
   */
  share?: boolean;
}) {
  const total = wholeTotal || data.reduce((s, d) => s + d.value, 0) || 1;
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this range.</p>;
  if (share) return <ShareBar data={data} format={format} total={total} />;
  return (
    <ul className="flex flex-col gap-1">
      {data.map((d) => (
        <li key={d.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={d.onOpen}
                disabled={!d.onOpen}
                className="flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left outline-none transition-colors enabled:hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-foreground">{d.label}</span>
                  <span className="shrink-0 tabular-nums text-foreground">
                    {format(d.value)}
                    <span className="ml-2 inline-block w-10 text-right text-xs text-muted-foreground">
                      {Math.round((d.value / total) * 100)}%
                    </span>
                  </span>
                </span>
                <span className="h-2 w-full rounded-full bg-fp-viz-1/12 dark:bg-fp-viz-1/20">
                  <span
                    className={cn("block h-full rounded-full", BAR)}
                    style={{ width: `${(d.value / max) * 100}%` }}
                  />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-medium">{d.label}</span>
              {" · "}
              {d.detail ?? format(d.value)}
            </TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

/** The share form of `BarList` — see its `share` prop. */
function ShareBar({
  data,
  format,
  total,
}: {
  data: BarDatum[];
  format: (n: number) => string;
  total: number;
}) {
  const parts = data.slice(0, VIZ.length);
  return (
    <div className="flex flex-col gap-4">
      {/* 2px surface gaps between segments; rounded only at the two ends. */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {parts.map((d, i) =>
          d.value > 0 ? (
            <Tooltip key={d.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={d.onOpen}
                  disabled={!d.onOpen}
                  aria-label={`${d.label}: ${format(d.value)}`}
                  className={cn("h-full min-w-1 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50", VIZ[i])}
                  style={{ width: `${(d.value / total) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{d.label}</span>
                {" · "}
                {d.detail ?? format(d.value)}
              </TooltipContent>
            </Tooltip>
          ) : null
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        {parts.map((d, i) => (
          <li key={d.key}>
            <button
              type="button"
              onClick={d.onOpen}
              disabled={!d.onOpen}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors enabled:hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", VIZ[i])} />
                <span className="truncate text-foreground">{d.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                {format(d.value)}
                <span className="ml-2 inline-block w-10 text-right text-xs text-muted-foreground">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
