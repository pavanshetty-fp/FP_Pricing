import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DATE_FMT, dateKeyOf, startOfDay } from "../data";

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * A date RANGE, stepped a window at a time.
 *
 * 3PL ONLY, and deliberately: a fuel dispatcher works one day and steps through
 * days, but a broker's orders sit against a delivery window that routinely runs
 * over a weekend, and a one-day view of those is a lane that keeps looking
 * empty. The arrows move by the length of the window you are on — a week steps
 * a week — so stepping never silently changes how much you are looking at.
 */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
}) {
  const days =
    Math.round((value.to.getTime() - value.from.getTime()) / 86_400_000) + 1;

  const step = (dir: -1 | 1) => {
    const shift = dir * days * 86_400_000;
    onChange({
      from: startOfDay(new Date(value.from.getTime() + shift)),
      to: startOfDay(new Date(value.to.getTime() + shift)),
    });
  };

  const today = startOfDay(new Date());
  const isToday = days === 1 && dateKeyOf(value.from) === dateKeyOf(today);

  /* ONE DAY READS AS ONE DAY. "Sep 7 – Sep 7" is a range only a computer would
     write, so a single-day window prints as a date. */
  const label =
    dateKeyOf(value.from) === dateKeyOf(value.to)
      ? DATE_FMT.format(value.from)
      : `${DATE_FMT.format(value.from)} – ${DATE_FMT.format(value.to)}`;

  const preset = (n: number) => {
    const from = today;
    const to = startOfDay(new Date(today.getTime() + (n - 1) * 86_400_000));
    onChange({ from, to });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={days === 1 ? "Previous day" : `Previous ${days} days`}
        onClick={() => step(-1)}
      >
        <ChevronLeft />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Delivery dates: ${label}. Pick a range`}
          >
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={(r) => {
              if (!r?.from) return;
              /* A HALF-PICKED RANGE IS A DAY, not nothing: the first click
                 already means something, and waiting for the second leaves the
                 board unchanged under a calendar that looks like it worked. */
              onChange({
                from: startOfDay(r.from),
                to: startOfDay(r.to ?? r.from),
              });
            }}
            defaultMonth={value.from}
            numberOfMonths={2}
            autoFocus
          />
          <Separator />
          <div className="flex items-center gap-1 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              disabled={isToday}
              onClick={() => preset(1)}
            >
              Today
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => preset(7)}>
              Next 7 days
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => preset(30)}>
              Next 30 days
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label={days === 1 ? "Next day" : `Next ${days} days`}
        onClick={() => step(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
