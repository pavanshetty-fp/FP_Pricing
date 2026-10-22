import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import {
  DateField,
  DatePickerPanel,
  DateRangePopover,
  formatDateRange,
  type DateRange,
} from "@/components/ui/date-picker";

const today = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
})();

/** Date Picker — the ONE picker every screen uses (DS ui §10p). */
export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date | null>(null);
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-xl text-sm text-muted-foreground">
        One date picker for every module and every screen: presets on the left,
        two months with the range drawn on them, typed start → end dates, a live
        count of what the window catches, Reset and Apply. A range picker picks
        one day too — click it and Apply.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Filter — a range" />
        <DateRangePopover value={range} onChange={setRange} count={() => 42} noun="orders" align="start">
          <Button variant="outline" size="sm" className="w-fit">
            {formatDateRange(range)}
          </Button>
        </DateRangePopover>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Form field — one date" />
        <div className="w-64">
          <DateField value={date} onChange={setDate} />
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="The panel" />
        <div className="w-fit rounded-lg border border-border">
          <DatePickerPanel value={range} onApply={(r) => r && setRange(r)} count={() => 42} noun="orders" />
        </div>
      </Stack>
    </Stack>
  );
}
