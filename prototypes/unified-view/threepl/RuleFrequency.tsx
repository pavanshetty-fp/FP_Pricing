import * as React from "react";
import { DateKeyField } from "@/components/ui/date-picker";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectTriggerClasses } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "../data";
import type { Schedule } from "./recurring";

/*
  HOW OFTEN — the frequency a rule is built from.

  TWO QUESTIONS, NOT ONE, and keeping them apart is the whole design.

    WHICH DAYS   Sunday through Saturday, as badges. Daily lights all seven;
                 otherwise the reader picks.
    HOW IT REPEATS  weekly, monthly or yearly — and what that means differs
                 enough per choice that each gets its own follow-up rather
                 than one list of twenty phrases.

  A SINGLE DROPDOWN OF PHRASES CANNOT DO THIS. "Monthly On First Thursday" is
  one entry in a list that would need a hundred to cover the real range, and
  every one of them has to be read to be understood. Two badges lit and the
  word "monthly" is understood before it is read.

  THE BADGES ARE THE SAME SEVEN THE LIST SHOWS. A reader who picks S–M–T–W–T
  here sees exactly that shape back in the Frequency column, which is what
  makes the column readable at all.

  EVERY SHAPE STILL COMES OUT AS A `Schedule`, so the list cell, the calendar
  and the generator are untouched by any of this — `toSchedule` is the whole
  seam.
*/

export const WEEKDAYS = [
  { letter: "S", name: "Sunday" },
  { letter: "M", name: "Monday" },
  { letter: "T", name: "Tuesday" },
  { letter: "W", name: "Wednesday" },
  { letter: "T", name: "Thursday" },
  { letter: "F", name: "Friday" },
  { letter: "S", name: "Saturday" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type Repeat = "weekly" | "monthly" | "yearly" | "cycle";

/** CUSTOM CYCLE (Pavan, 2026-10-06) — 2 to 4 weeks, each with its own days. */
export const CYCLE_LENGTHS = [2, 3, 4];
const DAY_MS = 86_400_000;
/** The Sunday that starts `d`'s week, at midnight. */
const weekStart = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
};
const keyToDate = (k: string) =>
  new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
/** Which week of the cycle `d` falls in, or -1 before the cycle starts. */
export const cycleWeekOf = (d: Date, startKey: string, length: number) => {
  const n = Math.round((weekStart(d).getTime() - weekStart(keyToDate(startKey)).getTime()) / (7 * DAY_MS));
  return n < 0 ? -1 : n % length;
};
/**
 * DAYS OR DATES (Pavan, 2026-10-01) — the two ways a rule says when. Days is
 * weekdays and how they repeat; Date is dates picked on a calendar and how
 * often that set comes round.
 */
export type FrequencyBasis = "days" | "date";

/** How often the picked dates come round: every N months, 0 = only once. */
export const DATE_REPEATS = [
  { n: 1, label: "Every month" },
  { n: 2, label: "Every 2 months" },
  { n: 3, label: "Every 3 months" },
  { n: 6, label: "Every 6 months" },
  { n: 12, label: "Every year" },
  { n: 0, label: "Does not repeat" },
];

/** 0 = every week (the fifth, partial one included); 1–4 = that week. */
export const MONTH_WEEKS = [
  { n: 0, label: "Every week" },
  { n: 1, label: "First week" },
  { n: 2, label: "Second week" },
  { n: 3, label: "Third week" },
  { n: 4, label: "Fourth week" },
];
export type YearlyMode = "firstMonth" | "specificMonths";

export interface RuleFrequency {
  basis: FrequencyBasis;
  /** DATE basis — the picked calendar dates, as `yyyy-mm-dd`. */
  dates: string[];
  /** DATE basis — every N months; 0 is just the picked dates. */
  dateRepeat: number;
  /** `daily` lights all seven and cannot be unpicked one at a time. */
  dayMode: "daily" | "specific";
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  repeat: Repeat;
  /**
   * WEEKLY ONLY — how many drops a week, and a time of day for each.
   *
   * The days say WHEN IN THE WEEK; this says how many runs and at what hour,
   * because two drops on a Monday is a real arrangement and the days alone
   * cannot express it.
   */
  times: string[];
  /**
   * WHICH WEEKS OF THE MONTH (Pavan, 2026-10-01) — checkboxes, one or several.
   * `[0]` is every week and stands alone; ticking a single week drops it.
   */
  monthWeeks: number[];
  yearlyMode: YearlyMode;
  /** 0-based, for `specificMonths`. */
  months: number[];
  /** `null` is "no end date", and it is the default. */
  endKey: string | null;
  /** CYCLE ONLY — one list of weekdays per week of the cycle. */
  cycleWeeks?: number[][];
  /** CYCLE ONLY — a day in the week the cycle's Week 1 is, as `yyyy-mm-dd`. */
  cycleStartKey?: string;
}

export function blankFrequency(): RuleFrequency {
  return {
    dayMode: "specific",
    days: [2],
    repeat: "weekly",
    times: ["08:00"],
    basis: "days",
    dates: [],
    dateRepeat: 1,
    monthWeeks: [1],
    yearlyMode: "firstMonth",
    months: [0],
    endKey: null,
  };
}

/** 1st, 2nd, 3rd, 4th… */
const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

const nthWeekdayOfMonth = (d: Date) => Math.floor((d.getDate() - 1) / 7) + 1;

const listNames = (xs: string[]) =>
  xs.length <= 1
    ? (xs[0] ?? "")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/**
 * THE SEAM. Everything downstream — the list's Frequency cell, the calendar,
 * the generator — takes a `Schedule`, so the picker's richer shape is turned
 * into one here and nothing else has to know it exists.
 */
export function toSchedule(f: RuleFrequency): Schedule {
  if (f.basis === "date") {
    /* THE PICKED DATES, AND HOW OFTEN THEY COME ROUND. No weekday pattern,
       so one badge instead of the row. Repeating keeps each date's day of
       the month; one past a month's end (the 31st in April) falls on its
       last day, so no month is skipped. */
    const keys = [...(f.dates ?? [])].sort();
    const every = f.dateRepeat ?? 1;
    const dom = [...new Set(keys.map((k) => Number(k.slice(8, 10))))].sort(
      (a, b) => a - b
    );
    const first = keys[0];
    const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();
    const firstMonth = first
      ? Number(first.slice(0, 4)) * 12 + Number(first.slice(5, 7)) - 1
      : 0;
    return {
      raw: `date:${every}:${keys.join(",")}`,
      label:
        keys.length === 0
          ? "No dates picked"
          : every === 0
            ? `On ${keys.length} ${keys.length === 1 ? "date" : "dates"}`
            : `${every === 1 ? "Every month" : `Every ${every} months`} on the ${listNames(dom.map(ordinal))}`,
      days: [],
      badge: every === 0 ? "Dates" : "Monthly",
      cadence:
        every === 0
          ? `${keys.length} ${keys.length === 1 ? "date" : "dates"}, no repeat`
          : `${dom.length} ${dom.length === 1 ? "date" : "dates"} ${every === 1 ? "every month" : `every ${every} months`}`,
      hits: (d) => {
        if (keys.length === 0) return false;
        const key = dateKeyOf(d);
        if (every === 0) return keys.includes(key);
        if (key < first) return false;
        if ((monthIndex(d) - firstMonth) % every !== 0) return false;
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return dom.some((x) => Math.min(x, last) === d.getDate());
      },
    };
  }
  if (f.repeat === "cycle") {
    const weeks = f.cycleWeeks ?? [f.days, []];
    const start = f.cycleStartKey ?? dateKeyOf(weekStart(new Date()));
    const short = (ds: number[]) =>
      ds.length === 0 ? "none" : ds.map((x) => WEEKDAYS[x].name.slice(0, 3)).join(", ");
    return {
      raw: `cycle:${start}:${weeks.map((w) => w.join(",")).join("|")}`,
      label: weeks.map((w, i) => `Week ${i + 1}: ${short(w)}`).join(" · "),
      days: [...new Set(weeks.flat())].sort((a, b) => a - b),
      cycle: weeks,
      badge: null,
      cadence: `${weeks.length}-week cycle`,
      hits: (d) => {
        const i = cycleWeekOf(d, start, weeks.length);
        return i >= 0 && weeks[i].includes(d.getDay());
      },
    };
  }
  const days = f.dayMode === "daily" ? [0, 1, 2, 3, 4, 5, 6] : [...f.days];
  const onDay = (d: Date) => days.includes(d.getDay());
  const dayNames = days.map((d) => WEEKDAYS[d].name);

  if (f.repeat === "weekly") {
    const perWeek =
      f.times.length > 1 ? `, ${f.times.length}× a day` : "";
    return {
      raw: `weekly:${days.join(",")}`,
      label:
        f.dayMode === "daily" ? "Every day" : `Every ${listNames(dayNames)}`,
      days,
      badge: f.dayMode === "daily" ? "Daily" : null,
      cadence: `Every week${perWeek}`,
      hits: onDay,
    };
  }

  if (f.repeat === "monthly") {
    const weeks = [...(f.monthWeeks ?? [1])].sort((a, b) => a - b);
    const every = weeks.length === 0 || weeks.includes(0);
    const weekWords = weeks.map((n) => ["", "first", "second", "third", "fourth"][n]);
    const capital = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    return {
      raw: `monthly:weeks:${weeks.join(",")}:${days.join(",")}`,
      label: every
        ? `Every ${listNames(dayNames)}`
        : `${capital(listNames(weekWords))} ${listNames(dayNames)} of the month`,
      days,
      badge: null,
      cadence: every
        ? "Every week of the month"
        : `${capital(weekWords.join(", "))} ${weeks.length === 1 ? "week" : "weeks"} of every month`,
      hits: (d) => onDay(d) && (every || weeks.includes(nthWeekdayOfMonth(d))),
    };
  }

  const months = f.yearlyMode === "firstMonth" ? [0] : [...f.months];
  const monthNames = months.map((m) => MONTHS[m]);
  return {
    raw: `yearly:${f.yearlyMode}:${months.join(",")}`,
    label:
      f.yearlyMode === "firstMonth"
        ? "Every January"
        : `Every ${listNames(monthNames)}`,
    days,
    badge: "Yearly",
    cadence:
      f.yearlyMode === "firstMonth"
        ? "First month of every year"
        : `${months.length} ${months.length === 1 ? "month" : "months"} a year`,
    hits: (d) => months.includes(d.getMonth()) && onDay(d),
  };
}

/* ---------------------------------------------------------------------------
 * The picker
 * ------------------------------------------------------------------------ */

function DayBadges({
  value,
  onChange,
  stretch,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  /** Fill the row — the frequency unit is wider (Pavan, 2026-10-16). */
  stretch?: boolean;
}) {
  return (
    <div className={cn("flex gap-1", stretch && "w-full")}>
      {WEEKDAYS.map((d, i) => {
        const on = value.includes(i);
        return (
          <button
            key={i}
            type="button"
            aria-pressed={on}
            aria-label={d.name}
            onClick={() =>
              onChange(
                on ? value.filter((x) => x !== i) : [...value, i].sort()
              )
            }
            className={cn(
              "flex h-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
              stretch ? "min-w-8 flex-1" : "w-8",
              on
                ? "bg-accent-violet text-accent-violet-foreground"
                : "bg-fp-card-1 text-muted-foreground hover:text-foreground"
            )}
          >
            {d.letter}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * WHICH WEEKS, AS CHECKBOXES IN A DROPDOWN (Pavan, 2026-10-01). One or several
 * weeks; "of the month" is said once, beside the field, not in every option.
 * Every week stands alone — it is all of them, the partial fifth included —
 * so ticking it clears the single weeks and ticking a single week clears it.
 * Picking dates instead is the Date tab, not an option here.
 */
function MonthPartPicker({
  value,
  onChange,
}: {
  value: RuleFrequency;
  onChange: (next: RuleFrequency) => void;
}) {
  const weeks = value.monthWeeks ?? [1];
  const toggleWeek = (n: number) => {
    let next: number[];
    if (n === 0) next = weeks.includes(0) ? [] : [0];
    else {
      const singles = weeks.filter((x) => x !== 0);
      next = singles.includes(n)
        ? singles.filter((x) => x !== n)
        : [...singles, n].sort((a, b) => a - b);
    }
    onChange({ ...value, monthWeeks: next });
  };
  const summary = weeks.includes(0)
      ? "Every week"
      : weeks.length === 0
        ? "Pick weeks"
        : weeks.length === 1
          ? `${["", "First", "Second", "Third", "Fourth"][weeks[0]]} week`
          : /* SHORT WHEN SEVERAL, so the field never cuts the answer off. */
            `${weeks.map((n) => ["", "1st", "2nd", "3rd", "4th"][n]).join(", ")} weeks`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Which weeks of the month"
              className={cn(selectTriggerClasses, "w-full min-w-0")}
            >
              <span
                className={cn(
                  "truncate",
                  weeks.length === 0 && "text-muted-foreground"
                )}
              >
                {summary}
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            {MONTH_WEEKS.map((w) => (
              <DropdownMenuCheckboxItem
                key={w.n}
                checked={weeks.includes(w.n)}
                /* Stays open — several weeks are picked in one visit. */
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggleWeek(w.n)}
              >
                {w.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="shrink-0 text-sm text-muted-foreground">
          of the month
        </span>
      </div>
      {weeks.length === 0 && (
        <p className="text-xs text-status-failed">Pick at least one week.</p>
      )}
    </div>
  );
}

/**
 * THE DATE TAB — dates picked from a strip, and how often that set comes
 * round. Picking the 5th and the 20th with Every month is twice a month.
 *
 * A STRIP, NOT A CALENDAR GRID (Pavan, 2026-10-01). The month runs left to
 * right across the whole width of the unit, as many dates to a line as fit,
 * and wraps; Repeat sits under it, because it is asked after the dates.
 * Each date carries its weekday letter so the strip still reads as a week.
 */
function DatePart({
  value,
  onChange,
}: {
  value: RuleFrequency;
  onChange: (next: RuleFrequency) => void;
}) {
  /* DATES OF THE MONTH, NOT OF A MONTH (Pavan, 2026-10-20) — 1 to 31, no
     month to step through: the dates repeat every month, or every N. Each
     pick is kept as that date's next turn from today (this month if it's
     still ahead, else next month), which is where the repeat starts. */
  const today = new Date();
  const picked = new Set((value.dates ?? []).map((k) => Number(k.slice(8, 10))));
  const keyOf = (dom: number) => {
    const ahead = dom >= today.getDate();
    const m = new Date(today.getFullYear(), today.getMonth() + (ahead ? 0 : 1), 1);
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(dom).padStart(2, "0")}`;
  };
  const toggle = (dom: number) => {
    const next = new Set(picked);
    if (next.has(dom)) next.delete(dom);
    else next.add(dom);
    onChange({ ...value, dates: [...next].sort((x, y) => x - y).map(keyOf).sort() });
  };

  return (
    /* THE DATES TAKE THE ROW; REPEAT SITS AT ITS RIGHT EDGE, well apart. */
    <div className="flex items-start gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Select dates</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
          {Array.from({ length: 31 }, (_, i) => {
            const dom = i + 1;
            const on = picked.has(dom);
            return (
              <button
                key={dom}
                type="button"
                aria-pressed={on}
                aria-label={`The ${ordinal(dom)}`}
                onClick={() => toggle(dom)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-md text-sm font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  on
                    ? "bg-accent-violet text-accent-violet-foreground"
                    : "bg-fp-card-1 text-foreground hover:bg-accent"
                )}
              >
                {dom}
              </button>
            );
          })}
        </div>
        {picked.size === 0 && (
          <p className="text-xs text-status-failed">Pick at least one date.</p>
        )}
      </div>

      <div className="w-62 shrink-0">
        <Row label="Repeat">
          <Select
            value={String(value.dateRepeat ?? 1)}
            onValueChange={(v) => onChange({ ...value, dateRepeat: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_REPEATS.map((r) => (
                <SelectItem key={r.n} value={String(r.n)}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </div>
    </div>
  );
}

/** Switching Repeat; into a cycle, the days already picked become Week 1. */
function withRepeat(value: RuleFrequency, repeat: Repeat): RuleFrequency {
  if (repeat !== "cycle" || value.cycleWeeks) return { ...value, repeat };
  const days = value.dayMode === "daily" ? [0, 1, 2, 3, 4, 5, 6] : value.days;
  return {
    ...value,
    repeat,
    cycleWeeks: [days, []],
    cycleStartKey: value.cycleStartKey ?? dateKeyOf(weekStart(new Date())),
  };
}

/**
 * CUSTOM CYCLE (Pavan, 2026-10-06) — Repeat, how many weeks, when Week 1
 * starts, then one row of day badges per week, and the next four weeks as
 * they will run. A week with no days is a week with no delivery.
 */
function CyclePart({
  value,
  onChange,
  part,
}: {
  value: RuleFrequency;
  onChange: (next: RuleFrequency) => void;
  /* IN THREE PLACES (Pavan, 2026-10-16): the weeks where the day badges
     are, the settings where Repeat is, the preview under both. */
  part: "weeks" | "settings" | "preview";
}) {
  const weeks = value.cycleWeeks ?? [value.days, []];
  const startKey = value.cycleStartKey ?? dateKeyOf(weekStart(new Date()));
  const setWeeks = (next: number[][]) => onChange({ ...value, cycleWeeks: next });
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const first = weekStart(keyToDate(startKey));
  const preview = Array.from({ length: 4 }, (_, k) => {
    const from = new Date(first.getTime() + k * 7 * DAY_MS);
    const ds = weeks[k % weeks.length];
    return {
      label: fmt.format(from),
      days: ds.length === 0 ? "No delivery" : ds.map((x) => WEEKDAYS[x].name.slice(0, 3)).join(", "),
    };
  });
  if (part === "settings")
    return (
      <div className="grid grid-cols-2 content-start gap-6">
        <Row label="Cycle length">
          <Select
            value={String(weeks.length)}
            onValueChange={(v) => {
              const n = Number(v);
              setWeeks(Array.from({ length: n }, (_, i) => weeks[i] ?? []));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CYCLE_LENGTHS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} weeks
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Week 1 starts">
          <DateKeyField
            value={startKey}
            onChange={(key) => onChange({ ...value, cycleStartKey: key })}
          />
        </Row>
      </div>
    );
  if (part === "weeks")
    return (
      <div className="flex flex-col gap-2">
        {weeks.map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-sm font-medium text-foreground">
              Week {i + 1}
            </span>
            <DayBadges
              stretch
              value={w}
              onChange={(next) => setWeeks(weeks.map((x, j) => (j === i ? next : x)))}
            />
          </div>
        ))}
        {weeks.every((w) => w.length === 0) && (
          <p className="text-xs text-status-failed">Pick at least one day.</p>
        )}
      </div>
    );
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">Next 4 weeks</span>
      <div className="grid grid-cols-4 gap-2">
        {preview.map((p) => (
          <div
            key={p.label}
            className="flex flex-col rounded-md border border-fp-outline-1 px-3 py-2"
          >
            <span className="text-xs text-muted-foreground">Week of {p.label}</span>
            <span className="truncate text-sm text-foreground">{p.days}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuleFrequencyPicker({
  value,
  onChange,
}: {
  value: RuleFrequency;
  onChange: (next: RuleFrequency) => void;
}) {
  const set = <K extends keyof RuleFrequency>(k: K, v: RuleFrequency[K]) =>
    onChange({ ...value, [k]: v });

  /* WHAT THEY HAD BEFORE DAILY. Ticking Daily fills all seven; going back to
     Specific with all seven still lit is a "specific days" answer that reads
     as daily, and leaves the reader unpicking six badges to get back to where
     they were. The set they came in with is remembered and handed back. */
  const beforeDaily = React.useRef<number[]>(value.days);

  const days = value.dayMode === "daily" ? [0, 1, 2, 3, 4, 5, 6] : value.days;
  const cycle = value.repeat === "cycle";

  return (
    <div className="flex flex-col gap-5">
      {/* DAYS OR DATE (Pavan, 2026-10-01) — THE DS SEGMENT CONTROL (Pavan,
          2026-10-16), the one the lists use for All / Fuel / Lubricants. */}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.basis ?? "days"}
        onValueChange={(v) => v && set("basis", v as FrequencyBasis)}
        aria-label="Days or date"
        className="h-7 w-fit"
      >
        {(["days", "date"] as const).map((k) => (
          <ToggleGroupItem
            key={k}
            value={k}
            /* Greyscale — the DS segment control's own selection. */
            className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium"
          >
            {k === "days" ? "Days" : "Date"}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {(value.basis ?? "days") === "date" ? (
        <DatePart value={value} onChange={onChange} />
      ) : (
      <>
      {/* THE DAYS UNIT WIDER, REPEAT NARROWER (Pavan, 2026-10-16). A custom
          cycle swaps its week rows into the same place, and its settings
          into Repeat's — on and off look the same, only the content moves. */}
      <div className="flex items-start gap-15">
        <div className="flex w-[360px] shrink-0 flex-col gap-3">
          {cycle ? (
            <CyclePart part="weeks" value={value} onChange={onChange} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Select day/s</span>
              <DayBadges
                stretch
                value={days}
                onChange={(next) => {
                  if (value.dayMode === "daily") beforeDaily.current = next;
                  onChange({
                    ...value,
                    dayMode: next.length === 7 ? "daily" : "specific",
                    days: next,
                  });
                }}
              />
            </div>
          )}
          {/* DAILY AND CUSTOM CYCLE, SIDE BY SIDE — the word, then its switch
              (Pavan, 2026-10-16). Daily means nothing inside a cycle. */}
          <div className="flex items-center gap-6">
            <label
              className={cn(
                "flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground",
                cycle && "cursor-not-allowed opacity-50"
              )}
            >
              Daily
              <Switch
                checked={!cycle && value.dayMode === "daily"}
                disabled={cycle}
                onCheckedChange={(on) => {
                  if (on) beforeDaily.current = value.days;
                  const back = beforeDaily.current;
                  onChange({
                    ...value,
                    dayMode: on ? "daily" : "specific",
                    days: on
                      ? [0, 1, 2, 3, 4, 5, 6]
                      : back.length > 0 && back.length < 7
                        ? back
                        : [],
                  });
                }}
              />
            </label>
            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground">
              Custom cycle
              <Switch
                checked={cycle}
                onCheckedChange={(on) =>
                  onChange(on ? withRepeat(value, "cycle") : { ...value, repeat: "weekly" })
                }
              />
            </label>
          </div>
          {!cycle && value.dayMode === "specific" && value.days.length === 0 && (
            <p className="text-xs text-status-failed">Pick at least one day.</p>
          )}
        </div>

      {/* THE REST OF THE ROW, FILLED (Pavan, 2026-10-16 — DS ui "A row of
          fields fills its row"): the two fields share it equally, 24px apart. */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
      {cycle ? (
        <CyclePart part="settings" value={value} onChange={onChange} />
      ) : (
      <div className="grid grid-cols-2 content-start gap-6">
        <Row label="Repeat">
          <Select
            value={value.repeat}
            onValueChange={(v) => onChange(withRepeat(value, v as Repeat))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        {value.repeat === "weekly" && (
          <Row label="Times a day">
            <Select
              value={String(value.times.length)}
              onValueChange={(v) => {
                const n = Number(v);
                const next = Array.from(
                  { length: n },
                  (_, i) => value.times[i] ?? ["08:00", "14:00", "18:00"][i % 3]
                );
                set("times", next);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "time" : "times"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        )}

        {value.repeat === "monthly" && (
          <Row label="Which part of the month">
            <MonthPartPicker value={value} onChange={onChange} />
          </Row>
        )}

        {value.repeat === "yearly" && (
          <Row label="Which part of the year">
            <Select
              value={value.yearlyMode}
              onValueChange={(v) => set("yearlyMode", v as YearlyMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="firstMonth">
                  First month of every year
                </SelectItem>
                <SelectItem value="specificMonths">
                  Specific months of the year
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>
        )}
      </div>
      )}
      {/* WEEKLY, MORE THAN ONCE — a time per drop, under Repeat so it reads
          as part of it (Pavan, 2026-09-25). Two deliveries on one day
          is a real arrangement and the day badges cannot say it. */}
      {value.repeat === "weekly" && value.times.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {value.times.map((t, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Drop {i + 1}
              </span>
              <Input
                type="time"
                className="w-[130px]"
                value={t}
                aria-label={`Time for drop ${i + 1}`}
                onChange={(e) =>
                  set(
                    "times",
                    value.times.map((x, j) => (j === i ? e.target.value : x))
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
      </div>
      </div>

      {cycle && <CyclePart part="preview" value={value} onChange={onChange} />}

      {value.repeat === "yearly" && value.yearlyMode === "specificMonths" && (
        <div className="flex flex-wrap gap-1.5">
          {MONTHS.map((m, i) => {
            const on = value.months.includes(i);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set(
                    "months",
                    on
                      ? value.months.filter((x) => x !== i)
                      : [...value.months, i].sort((a, b) => a - b)
                  )
                }
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  on
                    ? "bg-accent-violet text-accent-violet-foreground"
                    : "bg-fp-card-1 text-muted-foreground hover:text-foreground"
                )}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}

      </>
      )}

      {/* NO END DATE IS THE DEFAULT, so there is nothing to say until
          somebody wants one — the offer to add one is the whole control. */}
      <div className="flex flex-wrap items-center gap-3">
        {value.endKey === null ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => {
              const d = new Date();
              d.setFullYear(d.getFullYear() + 1);
              set("endKey", d.toISOString().slice(0, 10));
            }}
          >
            <Plus />
            Add an end date
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {/* AS WIDE AS THE DAY BUTTONS ABOVE — seven 32px buttons and six
                4px gaps, 248px (Pavan, 2026-09-25). */}
            <div className="w-62">
              <DateKeyField value={value.endKey} placeholder="End date" onChange={(key) => set("endKey", key)} />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove the end date"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => set("endKey", null)}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * THE NEXT DELIVERIES A FREQUENCY MAKES — from today, up to its end date.
 * Shared by every Create recurring rule (3PL, Customer Portal).
 */
export function nextHits(f: RuleFrequency, count = 4, from = startOfDay(new Date())): string[] {
  const sched = toSchedule(f);
  const end = f.endKey ? new Date(`${f.endKey}T00:00`) : null;
  const out: string[] = [];
  for (let i = 0; i < 400 && out.length < count; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    if (end && d > end) break;
    if (sched.hits(d)) out.push(dateKeyOf(d));
  }
  return out;
}

/**
 * NEXT 4 DELIVERIES — the strip pinned above a rule form's Create button
 * (Pavan, 2026-10-16), so what the rule will make is always in view.
 */
export function NextDeliveries({ keys }: { keys: string[] }) {
  const today = startOfDay(new Date());
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">Next 4 deliveries</span>
      <div className="grid grid-cols-4 gap-2">
        {keys.length === 0 ? (
          <span className="col-span-4 text-sm text-muted-foreground">—</span>
        ) : (
          keys.map((k) => {
            const d = new Date(`${k}T00:00`);
            return (
              <div key={k} className="flex flex-col rounded-md border border-fp-outline-1 px-3 py-1.5">
                <span className="text-sm text-foreground">{DATE_FMT.format(d)}</span>
                <span className="text-xs text-muted-foreground">
                  {relativeLabel(Math.round((d.getTime() - today.getTime()) / 86_400_000), d)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* THE FREQUENCY UNIT IN ONE LINE (Pavan, 2026-10-20) — for the list's
   Repeats column and anywhere an order's repeat is named. */
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function scheduleSummary(f: RuleFrequency): string {
  if (f.basis === "date") {
    if (!f.dates.length) return "";
    const th = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
    const doms = [...new Set(f.dates.map((k) => Number(k.slice(8, 10))))].sort((a, b) => a - b).map(th).join(", ");
    const every = f.dateRepeat ?? 1;
    return `${every === 0 ? "Once" : every === 1 ? "Every month" : `Every ${every} months`} · ${doms}`;
  }
  if (f.repeat === "cycle") return `Every ${(f.cycleWeeks ?? []).length || 2} weeks`;
  const days = f.dayMode === "daily" ? "Every day" : f.days.slice().sort().map((d) => DAY_SHORT[d]).join(", ");
  if (!days) return "";
  return f.repeat === "weekly" || f.dayMode === "daily" ? (f.dayMode === "daily" ? days : `Weekly · ${days}`) : `${f.repeat[0].toUpperCase()}${f.repeat.slice(1)} · ${days}`;
}

/** A FREQUENCY CARRIED AS TEXT — an order's `recurrence.frequency`, which
    `parseSchedule` reads back (Pavan, 2026-10-20: the order sheet now uses
    the rule's frequency unit). */
export const encodeFrequency = (f: RuleFrequency) => `rf:${JSON.stringify(f)}`;
export const decodeFrequency = (raw: string): RuleFrequency | null => {
  if (!raw.startsWith("rf:")) return null;
  try {
    return JSON.parse(raw.slice(3)) as RuleFrequency;
  } catch {
    return null;
  }
};

/** AN OLD CADENCE AS THE UNIT (Pavan, 2026-10-20) — orders saved with the
    former frequency list open on what they said. "Custom" and anything else
    unknown start blank. */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function frequencyFromLegacy(raw: string): RuleFrequency | null {
  const base = blankFrequency();
  if (raw === "Daily") return { ...base, dayMode: "daily", days: [0, 1, 2, 3, 4, 5, 6] };
  if (raw === "Every Weekday (Monday To Friday)") return { ...base, days: [1, 2, 3, 4, 5] };
  const w = /^Weekly On (\w+)$/.exec(raw);
  if (w && DAY_NAMES.includes(w[1])) return { ...base, days: [DAY_NAMES.indexOf(w[1])] };
  const m = /^Monthly On (\w+) (\w+)$/.exec(raw);
  if (m && DAY_NAMES.includes(m[2])) {
    const nth = ["First", "Second", "Third", "Fourth"].indexOf(m[1]) + 1;
    return { ...base, repeat: "monthly", monthWeeks: [nth || 1], days: [DAY_NAMES.indexOf(m[2])] };
  }
  const y = /^Annually On (\w+) (\d+)$/.exec(raw);
  if (y && MONTH_NAMES.includes(y[1])) {
    const mo = MONTH_NAMES.indexOf(y[1]);
    const now = new Date();
    const key = `${now.getFullYear()}-${String(mo + 1).padStart(2, "0")}-${String(Number(y[2])).padStart(2, "0")}`;
    return { ...base, basis: "date", dates: [key], dateRepeat: 12 };
  }
  return null;
}
