import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Schedule } from "./recurring";

/*
  A SCHEDULE, AS A SHAPE RATHER THAN A SENTENCE.

  "Monthly On First Thursday" is precise and unreadable at a glance, and a
  reader scanning twenty rules is not reading — they are COMPARING. Seven
  letters with the live ones lit compare instantly: three rules that all run on
  Thursday look alike down the column, and the one that runs Monday to Friday
  does not.

  THE LETTERS SAY WHICH DAYS, THE LINE UNDER THEM SAYS HOW OFTEN. They are two
  different facts and neither can carry the other: the same lit Thursday is
  every week, every second week, or the first week of the month, and that is
  the whole difference between three schedules. The row alone would make them
  identical.

  SUNDAY FIRST, because the rule sheet's calendar is Sunday-first, and a week
  that starts on a different day in two places on one screen is two weeks.

  TWO LETTERS REPEAT — T for Tuesday and Thursday, S for Saturday and Sunday —
  which is what every calendar does and what position resolves. The full day
  name is the accessible name and the tooltip, so the ambiguity never reaches
  anyone who needs it resolved.

  A PATTERN THAT IS NOT A WEEKDAY HABIT GETS ONE WORD INSTEAD. Daily would
  light all seven, which is a row nobody needs to read; a yearly date lights
  none, which is a row that says nothing. Both are clearer as a single badge.
*/

const DAYS = [
  { letter: "S", name: "Sunday" },
  { letter: "M", name: "Monday" },
  { letter: "T", name: "Tuesday" },
  { letter: "W", name: "Wednesday" },
  { letter: "T", name: "Thursday" },
  { letter: "F", name: "Friday" },
  { letter: "S", name: "Saturday" },
];

export function ScheduleCell({
  schedule,
  className,
  roomy = false,
  emphasis = false,
}: {
  schedule: Schedule;
  className?: string;
  /** Bigger day badges and more air — the Recurring Orders list (Pavan,
      2026-10-01: "too tight"). */
  roomy?: boolean;
  /** LIFTED (Pavan, 2026-10-07 — "very dull") for a recommendation, where the
      frequency is the headline: larger badges in the info hue, and a cycle's
      weeks set apart as their own labelled rows. */
  emphasis?: boolean;
}) {
  if (emphasis) roomy = true;
  /* A LIT DAY IS THE ACCENT (Pavan, 2026-10-16) — the same violet the
     frequency picker marks a picked day with, so the list and the form say
     the same thing the same way (DS ui/2-rules "The accent"). */
  const lit = "bg-accent-violet text-accent-violet-foreground";
  /* A CUSTOM CYCLE IS ONE ROW PER WEEK (Pavan, 2026-10-06), each led by
     its week — W1, W2 — so the shape still compares down the column. */
  if (schedule.cycle) {
    return (
      <div className={cn("flex min-w-0 flex-col", roomy ? "gap-1.5" : "gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex w-fit cursor-default flex-col",
                emphasis ? "divide-y divide-border" : "gap-0.5"
              )}
              role="img"
              aria-label={schedule.label}
            >
              {schedule.cycle.map((week, w) => (
                <div
                  key={w}
                  className={cn(
                    "flex items-center",
                    roomy ? "gap-1" : "gap-0.5",
                    emphasis && "py-1.5 first:pt-0 last:pb-0"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "text-muted-foreground",
                      emphasis ? "w-14 text-xs font-medium text-foreground" : "w-6",
                      !emphasis && (roomy ? "text-xs" : "text-[11px]")
                    )}
                  >
                    {emphasis ? `Week ${w + 1}` : `W${w + 1}`}
                  </span>
                  {DAYS.map((d, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={cn(
                        "flex items-center justify-center rounded-sm font-medium tabular-nums",
                        roomy ? "size-6 text-xs" : "size-5 text-[11px]",
                        week.includes(i) ? lit : "text-muted-foreground/50"
                      )}
                    >
                      {d.letter}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </TooltipTrigger>
          <TooltipContent>{schedule.label}</TooltipContent>
        </Tooltip>
        <span className={cn("truncate", emphasis ? "text-sm font-medium text-foreground" : "text-xs text-muted-foreground")}>
          {schedule.cadence}
        </span>
      </div>
    );
  }
  const on = new Set(schedule.days);
  const live = DAYS.filter((_, i) => on.has(i)).map((d) => d.name);

  return (
    <div className={cn("flex min-w-0 flex-col", roomy ? "gap-1.5" : "gap-1", className)}>
      {schedule.badge ? (
        /* ONE WORD IN PLACE OF THE ROW. Sized to match a lit day badge so the
           column keeps one rhythm whichever shape a row takes. */
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-sm px-1.5 font-medium",
            lit,
            roomy ? "h-6 text-xs" : "h-5 text-[11px]"
          )}
        >
          {schedule.badge}
        </span>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn("flex w-fit cursor-default", roomy ? "gap-1" : "gap-0.5")}
              role="img"
              aria-label={
                live.length > 0
                  ? `Runs on ${live.join(", ")}`
                  : "No weekday pattern"
              }
            >
              {DAYS.map((d, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={cn(
                    "flex items-center justify-center rounded-sm font-medium tabular-nums",
                    roomy ? "size-6 text-xs" : "size-5 text-[11px]",
                    on.has(i)
                      ? /* QUIETER (Pavan, 2026-10-05): a soft grey square and
                           dark ink, not a solid black one — the column was
                           taking the whole row's attention. */
                        lit
                      : /* AN UNLIT DAY IS STILL A DAY. Dropping it would make
                           the row a different width per rule and destroy the
                           comparison the row exists for; so it stays, as a faint
                           letter with no square. */
                        "text-muted-foreground/50"
                  )}
                >
                  {d.letter}
                </span>
              ))}
            </div>
          </TooltipTrigger>
          <TooltipContent>{schedule.label}</TooltipContent>
        </Tooltip>
      )}
      <span className={cn("truncate", emphasis ? "text-sm font-medium text-foreground" : "text-xs text-muted-foreground")}>
        {schedule.cadence}
      </span>
    </div>
  );
}
