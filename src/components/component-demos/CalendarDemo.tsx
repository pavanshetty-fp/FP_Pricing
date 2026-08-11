import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Calendar } from "@/components/ui/calendar";

/** Calendar showcase — a date field (react-day-picker) themed to the DS. */
export function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">Calendar</code> — a date picker (react-day-picker) themed to the DS.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Single date" />
        <Calendar mode="single" selected={date} onSelect={setDate} className="w-fit rounded-md border border-fp-outline-1" />
      </Stack>
    </Stack>
  );
}
