import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

const MODULES = ["Dispatch", "Routing", "Fleet", "Terminals", "Invoicing"];

/** Combobox showcase — an autocomplete select (Popover + Command). */
export function ComboboxDemo() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        Combobox — an autocomplete select composed from{" "}
        <code className="text-foreground">Popover</code> +{" "}
        <code className="text-foreground">Command</code>.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-64 justify-between font-normal">
              {value || "Select a module…"}
              <ChevronsUpDown className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search module…" />
              <CommandList>
                <CommandEmpty>No module found.</CommandEmpty>
                <CommandGroup>
                  {MODULES.map((m) => (
                    <CommandItem key={m} value={m} onSelect={(v) => { setValue(v === value ? "" : v); setOpen(false); }}>
                      <Check className={cn("mr-2 size-4", value === m ? "opacity-100" : "opacity-0")} />
                      {m}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </Stack>
    </Stack>
  );
}
