import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelectList } from "@/components/ui/multi-select-list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * CUSTOMER / SHIP-TO SCOPE (Yash, 2026-11-16) — the DS multi-select list
 * (checkbox rows, the choice as chips above) in a popover. "All …" stands
 * alone: picking it clears the rest, picking any other clears it. The
 * trigger reads All, the one name, or how many.
 */
export function ScopePicker({
  all,
  noun,
  options,
  value,
  onChange,
  className,
}: {
  /** "All customers". */
  all: string;
  /** "customers" — for "3 customers". */
  noun: string;
  options: { id: string; name: string }[];
  /** Ids; empty means All. */
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  const byName = React.useMemo(() => new Map(options.map((o) => [o.name, o.id])), [options]);
  const names = value.map((id) => options.find((o) => o.id === id)?.name).filter((n): n is string => !!n);
  const label = names.length === 0 ? all : names.length === 1 ? names[0] : `${names.length} ${noun}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className ?? "w-56 justify-between font-normal"}>
          <span className="truncate">{label}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <MultiSelectList
          options={[all, ...options.map((o) => o.name)]}
          value={names.length ? names : [all]}
          onChange={(next) => {
            const added = next.find((n) => !(names.length ? names : [all]).includes(n));
            if (added === all || next.length === 0) return onChange([]);
            onChange(next.filter((n) => n !== all).map((n) => byName.get(n)!).filter(Boolean));
          }}
          placeholder={`Search ${noun}`}
        />
      </PopoverContent>
    </Popover>
  );
}
