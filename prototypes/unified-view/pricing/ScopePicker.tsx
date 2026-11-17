import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

/**
 * CUSTOMER / SHIP-TO PICKER (Yash, 2026-11-17) — one field per scope, outside
 * the cards: a search and checkbox rows, nothing else in the list (what is
 * picked shows as chips under the title, not inside). "All …" stands alone.
 */
export function ScopePicker({
  all,
  noun,
  options,
  value,
  onChange,
}: {
  all: string;
  noun: string;
  options: string[];
  /** Picked names; empty means All. */
  value: string[];
  onChange: (names: string[]) => void;
}) {
  const label = value.length === 0 ? all : value.length === 1 ? value[0] : `${value.length} ${noun}`;
  const toggle = (n: string) => onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-56 justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={`Search ${noun}`} />
          <CommandList className="max-h-72">
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={all} onSelect={() => onChange([])} className="gap-2">
                <Checkbox checked={value.length === 0} tabIndex={-1} className="pointer-events-none" />
                {all}
              </CommandItem>
              {options.map((n) => (
                <CommandItem key={n} value={n} onSelect={() => toggle(n)} className="gap-2">
                  <Checkbox checked={value.includes(n)} tabIndex={-1} className="pointer-events-none" />
                  {n}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
