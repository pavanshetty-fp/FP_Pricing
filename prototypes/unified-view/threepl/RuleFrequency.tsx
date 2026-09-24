import * as React from "react";
import { Plus, X } from "lucide-react";
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
export type MonthlyMode = "firstWeek" | "specificDays" | "everyMonth";
export type YearlyMode = "firstMonth" | "specificMonths";

export interface RuleFrequency {
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
  monthlyMode: MonthlyMode;
  yearlyMode: YearlyMode;
  /** 0-based, for `specificMonths`. */
  months: number[];
  /**
   * THE DATES, for "Same date every month" (Pavan, 2026-09-24) — one or
   * several, 1–31, and the rule runs on those dates every month.
   */
  monthDates: number[];
  /** `null` is "no end date", and it is the default. */
  endKey: string | null;
}

export function blankFrequency(): RuleFrequency {
  return {
    dayMode: "specific",
    days: [2],
    repeat: "weekly",
    times: ["08:00"],
    monthlyMode: "firstWeek",
    yearlyMode: "firstMonth",
    months: [0],
    monthDates: [1],
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
    if (f.monthlyMode === "everyMonth") {
      /* THE SAME DATE EACH MONTH — no weekday pattern at all, so the badge row
         would light nothing and say nothing. One word instead. */
      /* THE PICKED DATES, EVERY MONTH (Pavan, 2026-09-24) — it said `true`
         for every day, which cut an order daily. A date past the month's end
         (the 31st in April) falls on the month's last day, so no month is
         skipped. */
      const dates = [...(f.monthDates ?? [])].sort((a, b) => a - b);
      return {
        raw: `monthly:date:${dates.join(",")}`,
        label: dates.length
          ? `Every month on the ${listNames(dates.map(ordinal))}`
          : "Same date every month",
        days: [],
        badge: "Monthly",
        cadence: `${dates.length} ${dates.length === 1 ? "date" : "dates"} a month`,
        hits: (d) => {
          const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          return dates.some((x) => Math.min(x, last) === d.getDate());
        },
      };
    }
    const firstOnly = f.monthlyMode === "firstWeek";
    return {
      raw: `monthly:${f.monthlyMode}:${days.join(",")}`,
      label: firstOnly
        ? `First ${listNames(dayNames)} of the month`
        : `Every ${listNames(dayNames)}`,
      days,
      badge: null,
      cadence: firstOnly
        ? "First week of every month"
        : "Those days, every month",
      hits: (d) => onDay(d) && (!firstOnly || nthWeekdayOfMonth(d) === 1),
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
  /* A DAY PATTERN MEANS NOTHING to a rule that runs on a date each month, so
     the badges step aside rather than sitting there inert. */
  const daysApply = !(
    value.repeat === "monthly" && value.monthlyMode === "everyMonth"
  );

  return (
    <div className="flex flex-col gap-5">
      {daysApply && (
        <div className="flex flex-col gap-3">
          {/* THE BADGES ARE THE ANSWER, and Daily is a shortcut over them
              rather than a second way of answering. Touching a day while all
              seven are lit takes that day out, which is what "not daily any
              more" means — so the switch follows the badges and never has to
              be turned off by hand. */}
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

      <div className="grid grid-cols-2 gap-4">
        <Row label="Repeat">
          <Select
            value={value.repeat}
            onValueChange={(v) => set("repeat", v as Repeat)}
          >
            <SelectTrigger>
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
              <SelectTrigger>
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
            <Select
              value={value.monthlyMode}
              onValueChange={(v) => set("monthlyMode", v as MonthlyMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="firstWeek">
                  First week of every month
                </SelectItem>
                <SelectItem value="specificDays">
                  Those days, every week of the month
                </SelectItem>
                <SelectItem value="everyMonth">
                  Same date every month
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>
        )}

        {value.repeat === "yearly" && (
          <Row label="Which part of the year">
            <Select
              value={value.yearlyMode}
              onValueChange={(v) => set("yearlyMode", v as YearlyMode)}
            >
              <SelectTrigger>
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

      {/* WEEKLY, MORE THAN ONCE — a time per drop. Two deliveries on one day
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

      {value.repeat === "monthly" && value.monthlyMode === "everyMonth" && (
        <div className="flex flex-col gap-1.5">
          <div className="grid w-fit grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => {
              const on = (value.monthDates ?? []).includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  aria-label={`The ${ordinal(n)}`}
                  onClick={() =>
                    set(
                      "monthDates",
                      on
                        ? value.monthDates.filter((x) => x !== n)
                        : [...(value.monthDates ?? []), n].sort((a, b) => a - b)
                    )
                  }
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-colors",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "bg-fp-card-1 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(value.monthDates ?? []).length === 0 && (
            <p className="text-xs text-status-failed">Pick at least one date.</p>
          )}
        </div>
      )}

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
            <Input
              type="date"
              className="w-[170px]"
              value={value.endKey}
              aria-label="End date"
              onChange={(e) => e.target.value && set("endKey", e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove the end date"
              onClick={() => set("endKey", null)}
            >
              <X />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
