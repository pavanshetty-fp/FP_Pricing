import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateKeyOf, formatFullDate, startOfDay } from "./data";

/**
 * Delivery-date filter — ‹ date › stepper with a calendar picker.
 *
 * Defaults to today and steps a day at a time in either direction, so past and
 * future dates are both reachable. The pill opens the DS Calendar for a jump,
 * with a "Today" reset in its footer; the reset is disabled while today is
 * already selected so the control never offers a no-op.
 *
 * Sits in the toolbar rather than inside the Filters panel: it is the one filter
 * whose current value has to stay legible at a glance, since every row on screen
 * is scoped by it.
 */
export interface DateFilterProps {
  value: Date;
  onChange: (next: Date) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const step = (days: number) => {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    onChange(startOfDay(next));
  };

  const today = startOfDay(new Date());
  const isToday = dateKeyOf(value) === dateKeyOf(today);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Previous day"
        onClick={() => step(-1)}
      >
        <ChevronLeft />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Delivery date: ${formatFullDate(value)}. Pick a date`}
          >
            {formatFullDate(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => d && onChange(startOfDay(d))}
            defaultMonth={value}
            autoFocus
          />
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={isToday}
              onClick={() => onChange(today)}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Next day"
        onClick={() => step(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
