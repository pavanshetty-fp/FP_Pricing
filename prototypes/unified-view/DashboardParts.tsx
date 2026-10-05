import * as React from "react";
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

  ONE HUE FOR EVERY CHART (`fp-lane-blue`, validated against both surfaces).
  Each chart here is a single series — counts per stage, per day, per type —
  so colour carries no identity; the name and number beside each bar do. A
  second hue would only invite the reader to look for a meaning it does not
  have. The surface is the DS dashboard's: Surface-1a on a hairline.
*/

const BAR = "bg-fp-lane-blue";

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
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-fp-outline-1 bg-fp-surface-1a",
        className
      )}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-fp-outline-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </header>
      <div className="min-w-0 flex-1 p-4">{children}</div>
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
      className="flex min-w-0 flex-col items-start gap-1 rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-4 text-left outline-none transition-colors enabled:hover:border-fp-outline-2 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
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
  return (
    <div className="flex items-end gap-0.5" style={{ height: height + 40 }}>
      {data.map((d) => (
        <Tooltip key={d.key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={d.onOpen}
              disabled={!d.onOpen}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-xs tabular-nums text-foreground">{d.value}</span>
              <span className="flex w-full items-end justify-center" style={{ height }}>
                <span
                  className={cn(
                    "w-full max-w-12 rounded-t-sm transition-opacity group-hover:opacity-80",
                    d.value > 0 ? BAR : "bg-fp-outline-1"
                  )}
                  style={{ height: d.value > 0 ? Math.max(4, (d.value / max) * height) : 2 }}
                />
              </span>
              <span className="w-full truncate text-center text-xs text-muted-foreground">
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
}: {
  data: BarDatum[];
  format?: (n: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this range.</p>;
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
                <span className="h-1.5 w-full rounded-full bg-fp-outline-1/60">
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
