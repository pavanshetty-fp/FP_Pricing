import { Calculator, Calendar, Smile, User, CreditCard, Settings } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";

/** Command showcase — an inline searchable palette (cmdk). */
export function CommandDemo() {
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
    </Stack>
  );
}
