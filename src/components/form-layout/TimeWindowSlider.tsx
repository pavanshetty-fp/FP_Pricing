import type * as React from "react";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/*
  A delivery window, as a range on a day.

  WHY NOT A DROPDOWN. The list held six fixed windows, and a window is not a
  category — it is two times. A customer who can take a load between 7 and 11
  had to be filed under "6:00 AM – 10:00 AM" and the two hours of difference
  lived in somebody's head. Six options also cannot say "all day", which is a
  real answer, or "a two-hour slot", which is the one that matters when a site
  has a gate that opens twice.

  THE DAY IS THE SCALE, and it is drawn: midnight to midnight with the working
  hours marked, so a window reads as a POSITION rather than as a pair of
  numbers. That is the whole argument for a slider here — you are choosing
  where in the day something sits, and a list makes you translate.

  THIRTY-MINUTE STEPS. Fuel delivery is not scheduled to the minute, and a
  slider that can land on 8:07 offers a precision the business does not have.
*/

const STEP_MIN = 30;
const DAY_MIN = 24 * 60;

/** `8:00 AM`. Midnight prints as `12:00 AM`, and 24:00 as `12:00 AM` next day. */
export function formatMinutes(total: number): string {
  const m = ((total % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

/** `8:00 AM` back to minutes. Tolerant of the `8:00 AM – 12:00 PM` halves. */
export function parseMinutes(label: string): number | null {
  const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

/** `"8:00 AM – 12:00 PM"` → `[480, 720]`. Null when it does not parse. */
export function parseWindow(label: string): [number, number] | null {
  const [a, b] = label.split(/[–-]/);
  if (!a || !b) return null;
  const start = parseMinutes(a);
  const end = parseMinutes(b);
  return start === null || end === null ? null : [start, end];
}

export const formatWindow = (start: number, end: number) =>
  `${formatMinutes(start)} – ${formatMinutes(end)}`;

/** Hours worth labelling. Every sixth, so the scale reads without crowding. */
const TICKS = [0, 6, 12, 18, 24];

/** `4 hr window`, or `All day` when the pair covers midnight to midnight. */
export function formatSpan(start: number, end: number): string {
  const span = end - start;
  if (span >= DAY_MIN) return "All day";
  return `${(span / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hr window`;
}

export interface TimeWindowSliderProps {
  /** Minutes from midnight. */
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  /** Shortest window the slider will allow, in minutes. Default 60. */
  minSpan?: number;
  /**
   * The field's own label. Given here rather than by a wrapping `SheetField`
   * so the label and the value it produces share ONE line — see below.
   */
  label?: React.ReactNode;
  /** Marks the label with the destructive asterisk the DS forms already use. */
  required?: boolean;
  /** Read-only — a record past the point where its schedule can move. */
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function TimeWindowSlider({
  start,
  end,
  onChange,
  minSpan = 60,
  label,
  required,
  disabled,
  className,
  "aria-label": ariaLabel = "Delivery window",
}: TimeWindowSliderProps) {
  return (
    /*
      ONE FIELD, ONE HEIGHT. The label, the value and the track used to sit on
      three lines, which made this field taller than the date beside it and
      broke the row: two controls that are answered together should finish
      together. Label and value now share the label's line, and the track and
      its scale fill exactly the 36px a control occupies — so the field is the
      same height as any other, and the row's baselines line up.
    */
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* THE VALUE IS READ, not inferred from where the handles sit. A slider
          whose value can only be estimated is one people distrust for anything
          precise — so it is printed, next to the name of the thing it sets. */}
      {/* THE WINDOW NEVER TRUNCATES (2026-10-15 — sheets now fit their
          content, so a half-width field is ~280px). The span note is the one
          that gives way: it truncates first. */}
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="flex shrink-0 items-baseline gap-2">
          {label && (
            <span className="text-sm font-medium whitespace-nowrap text-foreground">
              {label}
              {required && <span className="text-destructive"> *</span>}
            </span>
          )}
          <span className="text-sm whitespace-nowrap tabular-nums text-foreground">
            {formatWindow(start, end)}
          </span>
        </span>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {formatSpan(start, end)}
        </span>
      </div>

      {/*
        THE CONTROL ZONE IS THE INPUT'S OWN 36px, and the two parts are placed
        inside it rather than stacked to fill it. The scale is pinned to the
        floor, so its baseline is the input's bottom edge.

        THE TRACK IS CENTRED BETWEEN THE TWO LINES OF TEXT, not in the box.
        Centring it in the box put 21px of air above it and 7px below, so the
        value on top read as belonging to nothing and the scale looked stuck to
        the track. It now sits halfway between the bottom of the value and the
        top of the scale — 12px of air either side — which is what makes the
        three lines read as one control.
      */}
      <div className="relative h-9">
        <Slider
          className="absolute inset-x-0 top-1.5"
          aria-label={ariaLabel}
          min={0}
          max={DAY_MIN}
          step={STEP_MIN}
          minStepsBetweenThumbs={minSpan / STEP_MIN}
          value={[start, end]}
          disabled={disabled}
          onValueChange={([a, b]) => onChange(a, b)}
        />

        {/* THE SCALE, so the handles have something to mean. Without it the
            track is a bare line and "where in the day is this" is unanswerable
            without reading the numbers above.

            THE END LABELS ARE NOT CENTRED. Midnight sits at 0% and at 100%, so
            centring hung half of each one outside the field — the left edge of
            the form stepped out and back for one label. They are pinned to the
            edges instead, which is also where the track starts and stops. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3 leading-none select-none"
        >
          {TICKS.map((h, i) => {
            const first = i === 0;
            const last = i === TICKS.length - 1;
            return (
              <span
                key={h}
                className={cn(
                  "absolute bottom-0 text-[11px] leading-none tabular-nums text-muted-foreground",
                  first && "left-0",
                  last && "right-0",
                  !first && !last && "-translate-x-1/2"
                )}
                style={first || last ? undefined : { left: `${(h / 24) * 100}%` }}
              >
                {h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
