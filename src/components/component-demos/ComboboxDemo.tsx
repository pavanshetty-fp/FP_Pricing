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
        lives inside the list, which is where the difference is. Every list
        searches, short ones included: a field that takes typing at nine options
        and ignores it at five is one you have to test before you can trust.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Short list" />
        <p className="text-sm text-muted-foreground">
          Five options still get a search field. Consistency is worth more than
          the row it costs — reaching for the keyboard always works.
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
        <SectionHeading as="h3" title="Long list" />
        <p className="text-sm text-muted-foreground">
          Past a screenful, scanning stops working and typing is the only fast
          path — which is what the short list is being consistent with.
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
