import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Combobox } from "@/components/ui/combobox";

const MODULES = ["Dispatch", "Routing", "Fleet", "Terminals", "Invoicing"];
const TERMINALS = [
  "Greensbro KM2",
  "Kern River T4",
  "Bakersfield South",
  "Fresno Junction",
  "Stockton Deepwater",
  "Sacramento Delta",
  "Long Beach Pier F",
  "Barstow Yard",
  "Colton Rail",
  "Mojave North",
];

/** Combobox showcase — the select you can type into. */
export function ComboboxDemo() {
  const [value, setValue] = React.useState("");
  const [terminal, setTerminal] = React.useState("");
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        Combobox — a <code className="text-foreground">Select</code> you can type
        into. Same trigger, so it reads as the same control; the search field
        lives inside the list, which is where the difference is.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Short list — no search" />
        <p className="text-sm text-muted-foreground">
          Under the threshold the whole list is visible at once, so a search
          field would be a row of chrome between the click and the answer.
        </p>
        <Combobox
          className="w-64"
          value={value}
          onValueChange={setValue}
          options={MODULES}
          placeholder="Select a module…"
        />
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Long list — search appears" />
        <p className="text-sm text-muted-foreground">
          At eight options or more, scanning stops working and typing is the
          only fast path.
        </p>
        <Combobox
          className="w-64"
          value={terminal}
          onValueChange={setTerminal}
          options={TERMINALS}
          placeholder="Select a terminal…"
          searchPlaceholder="Search terminals…"
          emptyText="No terminal found."
        />
      </Stack>
    </Stack>
  );
}
