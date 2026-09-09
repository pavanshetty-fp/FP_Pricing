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

/** Hours worth labelling. Every third, so the scale reads without crowding. */
const TICKS = [0, 6, 12, 18, 24];

export interface TimeWindowSliderProps {
  /** Minutes from midnight. */
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  /** Shortest window the slider will allow, in minutes. Default 60. */
  minSpan?: number;
  className?: string;
  "aria-label"?: string;
}

export function TimeWindowSlider({
  start,
  end,
  onChange,
  minSpan = 60,
  className,
  "aria-label": ariaLabel = "Delivery window",
}: TimeWindowSliderProps) {
  const span = end - start;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* THE VALUE IS READ ABOVE THE TRACK, not inferred from the thumbs. A
          slider whose current value can only be estimated by looking at where
          the handles sit is a slider people distrust for anything precise. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {formatWindow(start, end)}
        </span>
        <span className="text-xs text-muted-foreground">
          {span >= DAY_MIN
            ? "All day"
            : `${(span / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hr window`}
        </span>
      </div>

      <Slider
        aria-label={ariaLabel}
        min={0}
        max={DAY_MIN}
        step={STEP_MIN}
        minStepsBetweenThumbs={minSpan / STEP_MIN}
        value={[start, end]}
        onValueChange={([a, b]) => onChange(a, b)}
      />

      {/* THE SCALE, so the handles have something to mean. Without it the
          track is a bare line and "where in the day is this" is unanswerable
          without reading the numbers above. */}
      <div aria-hidden className="relative h-4 select-none">
        {TICKS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}
          </span>
        ))}
      </div>
    </div>
  );
}
