import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dateKeyOf } from "../data";
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

export type Repeat = "weekly" | "monthly" | "yearly";
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
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <div className="flex gap-1">
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
              "flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
              on
                ? "bg-primary text-primary-foreground"
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKeyOf(today);
  const picked = new Set(value.dates ?? []);
  /* Opens on the month of the first picked date, else this month. */
  const [month, setMonth] = React.useState(() => {
    const first = [...picked].sort()[0];
    return first
      ? new Date(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const atThisMonth =
    month.getFullYear() === today.getFullYear() &&
    month.getMonth() === today.getMonth();
  const shift = (n: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const toggle = (key: string) => {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...value, dates: [...next].sort() });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            Select date/s
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              disabled={atThisMonth}
              onClick={() => shift(-1)}
            >
              <ChevronLeft />
            </Button>
            <span className="w-32 text-center text-sm font-medium tabular-nums text-foreground">
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => shift(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: daysIn }, (_, i) => {
            const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
            const key = dateKeyOf(d);
            const on = picked.has(key);
            const past = key < todayKey;
            return (
              <button
                key={key}
                type="button"
                disabled={past}
                aria-pressed={on}
                aria-label={d.toDateString()}
                onClick={() => toggle(key)}
                className={cn(
                  "flex h-12 w-10 flex-col items-center justify-center gap-0.5 rounded-md text-sm font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-fp-card-1 text-foreground hover:bg-accent",
                  past && "cursor-not-allowed opacity-40 hover:bg-fp-card-1"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-normal",
                    on ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {WEEKDAYS[d.getDay()].letter}
                </span>
                {i + 1}
              </button>
            );
          })}
        </div>
        {picked.size === 0 && (
          <p className="text-xs text-status-failed">Pick at least one date.</p>
        )}
      </div>

      <Row label="Repeat">
        <Select
          value={String(value.dateRepeat ?? 1)}
          onValueChange={(v) => onChange({ ...value, dateRepeat: Number(v) })}
        >
          <SelectTrigger className="w-62">
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

  return (
    <div className="flex flex-col gap-5">
      {/* DAYS OR DATE (Pavan, 2026-10-01). Two different ways of saying when,
          so two tabs rather than a "same date" option among the weeks — a
          date answer made the day badges above it meaningless. */}
      <Tabs
        value={value.basis ?? "days"}
        onValueChange={(v) => set("basis", v as FrequencyBasis)}
      >
        <TabsList>
          <TabsTrigger value="days">Days</TabsTrigger>
          <TabsTrigger value="date">Date</TabsTrigger>
        </TabsList>
      </Tabs>

      {(value.basis ?? "days") === "date" ? (
        <DatePart value={value} onChange={onChange} />
      ) : (
      <>
      {/* ONE LINE: the days on the left, a divider, then Repeat and its
          continuation (Pavan, 2026-09-25). There was room on the right, and
          two rows made one question read as two. The end date stays below. */}
      {/* 60px between the days and Repeat, no divider (Pavan, 2026-09-25).
          Repeat and its continuation sit 16px apart, each filling its half. */}
      <div className="flex items-stretch gap-15">
      {(
        <div className="flex shrink-0 flex-col gap-3">
          {/* THE BADGES ARE THE ANSWER, and Daily is a shortcut over them
              rather than a second way of answering. Touching a day while all
              seven are lit takes that day out, which is what "not daily any
              more" means — so the switch follows the badges and never has to
              be turned off by hand. */}
          {/* LABELLED LIKE THE FIELDS BESIDE IT (Pavan, 2026-09-25), so the
              badges start on the same line as the Repeat select. */}
          <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Select day/s
          </span>
          <DayBadges
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
          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground">
            <Switch
              checked={value.dayMode === "daily"}
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
            Daily
          </label>
          {value.dayMode === "specific" && value.days.length === 0 && (
            <p className="text-xs text-status-failed">
              Pick at least one day.
            </p>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] content-start gap-4">
        <Row label="Repeat">
          <Select
            value={value.repeat}
            onValueChange={(v) => set("repeat", v as Repeat)}
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
                    ? "bg-primary text-primary-foreground"
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
            <Input
              type="date"
              className="w-62"
              value={value.endKey}
              aria-label="End date"
              onChange={(e) => e.target.value && set("endKey", e.target.value)}
            />
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
