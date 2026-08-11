import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const fmt = (d?: Date) =>
  d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

/** Date Picker — a Popover + Calendar composition (single date or range). */
export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        Date Picker — a <code className="text-foreground">Popover</code> +{" "}
        <code className="text-foreground">Calendar</code> composition for a date
        or a range.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Single date" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-64 justify-start font-normal">
              <CalendarIcon className="text-muted-foreground" />
              {date ? fmt(date) : <span className="text-muted-foreground">Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Date range" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-72 justify-start font-normal">
              <CalendarIcon className="text-muted-foreground" />
              {range?.from ? (
                range.to ? `${fmt(range.from)} – ${fmt(range.to)}` : fmt(range.from)
              ) : (
                <span className="text-muted-foreground">Pick a range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} />
          </PopoverContent>
        </Popover>
      </Stack>
    </Stack>
  );
}
