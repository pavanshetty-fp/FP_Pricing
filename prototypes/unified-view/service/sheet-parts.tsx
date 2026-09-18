import * as React from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

/**
 * A SINGLE-HANDLE SLIDER FOR ONE MEASURE — hours on site, miles driven.
 *
 * SAME CONTROL AS THE DELIVERY WINDOW, minus one handle. Both answer "how
 * much", both are read far more often than they are typed, and both want the
 * figure PRINTED rather than estimated from where the handle sits — a slider
 * whose value can only be guessed is one nobody trusts for anything that ends
 * up on an invoice.
 *
 * ONE HANDLE BECAUSE IT IS NOT A RANGE. A delivery window is two facts, a
 * start and an end; four hours is one. Two handles would ask the reader which
 * of them was the answer.
 *
 * ONE FIELD, ONE HEIGHT — the label and the value share the label's line, and
 * the track plus its scale fill exactly the 36px a control occupies, so this
 * sits on the same baselines as the fields beside it.
 */
export function MeasureSlider({
  label,
  value,
  onChange,
  max,
  step,
  /** How the figure reads — "4 h", "16 mi". */
  format,
  /** Marks under the track, so the handle has something to mean. */
  ticks,
  trailing,
  tickLabel,
  className,
  "aria-label": ariaLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step: number;
  format: (v: number) => string;
  ticks: number[];
  /** What the figure costs, shown at the far edge of the label row. */
  trailing?: React.ReactNode;
  /** How a tick reads, when it is not just its own number. */
  tickLabel?: (v: number) => string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="text-sm font-medium whitespace-nowrap text-foreground">
            {label}
          </span>
          <span className="truncate text-sm tabular-nums text-foreground">
            {format(value)}
          </span>
        </span>
        {/* WHAT IT COMES TO, at the other edge — the reason anybody moves this
            handle is the figure it puts on the bill, and having to look two
            sections down to see it is what makes a slider feel vague. */}
        {trailing && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {trailing}
          </span>
        )}
      </div>

      <div className="relative h-9">
        <Slider
          className="absolute inset-x-0 top-1.5"
          aria-label={ariaLabel ?? label}
          min={0}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3 leading-none select-none"
        >
          {ticks.map((t, i) => {
            const first = i === 0;
            const last = i === ticks.length - 1;
            return (
              <span
                key={t}
                className={cn(
                  "absolute bottom-0 text-[11px] leading-none tabular-nums text-muted-foreground",
                  first && "left-0",
                  last && "right-0",
                  !first && !last && "-translate-x-1/2"
                )}
                style={first || last ? undefined : { left: `${(t / max) * 100}%` }}
              >
                {tickLabel ? tickLabel(t) : t}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * A CARD IN THE SHEET'S RIGHT-HAND RAIL.
 *
 * Copied verbatim from the 3PL order sheet, for the reason the rail exists
 * there: one rule decides which side a card is on — can you type into it? What
 * you fill in goes left, what the order HAS BECOME goes right. Once an
 * editable number and a computed one share a column they look identical, and
 * the reader stops knowing which is which.
 */
export function RailCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-fp-surface-1a px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          {icon && <span className="[&_svg]:size-3.5">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One label / value line inside a rail card. */
export function RailRow({
  label,
  value,
  bold,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <span className="min-w-0 text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "shrink-0 text-right text-sm tabular-nums",
          bold ? "font-semibold text-foreground" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
