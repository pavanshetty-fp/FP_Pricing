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
}: {
  schedule: Schedule;
  className?: string;
}) {
  const on = new Set(schedule.days);
  const live = DAYS.filter((_, i) => on.has(i)).map((d) => d.name);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {schedule.badge ? (
        /* ONE WORD IN PLACE OF THE ROW. Sized to match a lit day badge so the
           column keeps one rhythm whichever shape a row takes. */
        <span className="inline-flex h-5 w-fit items-center rounded-sm bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
          {schedule.badge}
        </span>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex w-fit cursor-default gap-0.5"
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
                    "flex size-5 items-center justify-center rounded-sm text-[11px] font-medium tabular-nums",
                    on.has(i)
                      ? "bg-primary text-primary-foreground"
                      : /* AN UNLIT DAY IS STILL A DAY. Dropping it would make
                           the row a different width per rule and destroy the
                           comparison the row exists for; so it stays, faint,
                           on the surface below. */
                        "bg-fp-card-1 text-muted-foreground/60"
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
      <span className="truncate text-xs text-muted-foreground">
        {schedule.cadence}
      </span>
    </div>
  );
}
