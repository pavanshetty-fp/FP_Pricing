import * as React from "react";
import { Calculator, Calendar, Smile, User, CreditCard, Settings } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";

const SAMPLE_OPTIONS = [
  "Option Label 1",
  "Option Label 2",
  "Option Label 3",
  "Option Label 4",
  "Option Label 5",
];

/** Command showcase — an inline searchable palette (cmdk). */
export function CommandDemo() {
  const [single, setSingle] = React.useState<string>("Option Label 2");
  const [multi, setMulti] = React.useState<string[]>(["Option Label 1"]);
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Command</code> (cmdk) — a searchable
        list with groups, items and shortcuts. Type to filter.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Inline" />
        <Command className="rounded-lg border border-fp-outline-1">
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem><Calendar />Calendar</CommandItem>
              <CommandItem><Smile />Search emoji</CommandItem>
              <CommandItem><Calculator />Calculator</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem><User />Profile<CommandShortcut variant="keycap">⌘P</CommandShortcut></CommandItem>
              <CommandItem><CreditCard />Billing<CommandShortcut variant="keycap">⌘B</CommandShortcut></CommandItem>
              <CommandItem><Settings />Settings<CommandShortcut variant="keycap">⌘S</CommandShortcut></CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="Cardinality is explicit in the affordance"
          description="A trailing check marks THE chosen row — right for single-select. For multi-select use checkbox rows: a check reads as 'this is the current value', and before anything is picked a check-marked list is indistinguishable from a single-select one, so people never discover they can pick more."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Single-select — CommandItem selected
            </p>
            <Command className="rounded-md border border-border">
              <CommandList>
                <CommandGroup>
                  {SAMPLE_OPTIONS.slice(0, 4).map((o) => (
                    <CommandItem
                      key={o}
                      value={o}
                      selected={single === o}
                      onSelect={() => setSingle(o)}
                    >
                      {o}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Multi-select — MultiSelectList
            </p>
            <MultiSelectList
              options={SAMPLE_OPTIONS}
              value={multi}
              onChange={setMulti}
              placeholder="Search options…"
            />
          </div>
        </div>
      </Stack>
    </Stack>
  );
}
