import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateRangePopover, formatDateRange, type DateRange } from "@/components/ui/date-picker";
import { dateKeyOf, startOfDay } from "../data";

export type { DateRange };

const DAY = 86_400_000;

/**
 * The toolbar control: a window you can step, and the picker behind its label.
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
  fullWidth = false,
  all,
  count,
  noun,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  /**
   * Stretch the control to its container, the LABEL taking the slack.
   *
   * On the toolbar it sits in a row of controls and is as wide as the date it
   * prints. Given a row of its own — the export sheet's Date line — that left
   * it huddled against one edge under a full-width heading. The arrows keep
   * their 32px either way: they are the same act at any width, and a stepper
   * that grows with the panel stops reading as one.
   */
  fullWidth?: boolean;
  /** "All dates" and the span it means here — the screen's records. */
  all?: DateRange;
  /** Live "N orders match" in the picker's footer. */
  count?: (r: DateRange) => number;
  noun?: string;
}) {
  const days = Math.round((value.to.getTime() - value.from.getTime()) / DAY) + 1;

  const step = (dir: -1 | 1) => {
    const shift = dir * days * DAY;
    onChange({
      from: startOfDay(new Date(value.from.getTime() + shift)),
      to: startOfDay(new Date(value.to.getTime() + shift)),
    });
  };

  /* ONE DAY READS AS ONE DAY. "Sep 7 – Sep 7" is a range only a computer would
     write, so a single-day window prints as a date. Everything reads as
     "All dates", and has no next or previous. */
  const isAll =
    !!all && dateKeyOf(all.from) === dateKeyOf(value.from) && dateKeyOf(all.to) === dateKeyOf(value.to);
  const label = isAll ? "All dates" : formatDateRange(value);
  /* IN THE EXPORT SHEET, A CALENDAR ICON (Pavan, 2026-11-12) — the same
     picker popover as the page's date control, opened beside the count. */
  if (fullWidth) {
    return (
      <DateRangePopover
        value={value}
        onChange={onChange}
        all={all}
        count={count}
        noun={noun}
        resetTo={(() => {
          const t = startOfDay(new Date());
          return { from: t, to: t };
        })()}
      >
        <Button variant="outline" size="icon-sm" aria-label={`Date range: ${label}. Change`}>
          <CalendarDays />
        </Button>
      </DateRangePopover>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", fullWidth && "w-full")}>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={days === 1 ? "Previous day" : `Previous ${days} days`}
        disabled={isAll}
        onClick={() => step(-1)}
      >
        <ChevronLeft />
      </Button>

      {/* THE SHARED PICKER (DS ui §10p) — presets, two months, typed dates,
          a live count; nothing changes until Apply. */}
      <DateRangePopover
        value={value}
        onChange={onChange}
        all={all}
        count={count}
        noun={noun}
        resetTo={(() => {
          const t = startOfDay(new Date());
          return { from: t, to: t };
        })()}
      >
        <Button
          variant="outline"
          size="sm"
          className={cn(fullWidth && "h-8 flex-1")}
          aria-label={`Delivery dates: ${label}. Pick a date or range`}
        >
          {label}
        </Button>
      </DateRangePopover>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label={days === 1 ? "Next day" : `Next ${days} days`}
        disabled={isAll}
        onClick={() => step(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
