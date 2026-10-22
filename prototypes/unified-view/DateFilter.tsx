import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-picker";
import { formatFullDate, startOfDay } from "./data";

/**
 * Delivery-date filter — ‹ date › stepper with a calendar picker.
 *
 * Defaults to today and steps a day at a time in either direction, so past and
 * future dates are both reachable. The pill opens the shared date picker in
 * its one-date form — Today is its first preset.
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

      {/* THE SHARED PICKER, one date (DS ui §10p). */}
      <DateField value={value} onChange={(d) => d && onChange(startOfDay(d))} align="end">
        <Button
          variant="outline"
          size="sm"
          aria-label={`Delivery date: ${formatFullDate(value)}. Pick a date`}
        >
          {formatFullDate(value)}
        </Button>
      </DateField>

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
