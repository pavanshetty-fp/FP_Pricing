import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface MultiSelectListProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Placeholder for the filter field. Omit the field entirely with `searchable={false}`. */
  placeholder?: string;
  /** Shown when the filter matches nothing. */
  empty?: string;
  /**
   * Give the list a filter field. Same rule as the filter panel's facets: a list
   * gets one when it cannot be taken in at once. Explicit, not a length
   * threshold.
   */
  searchable?: boolean;
  className?: string;
}

/**
 * Multi-select option list — **checkbox rows**, with the current selection as
 * removable chips above them.
 *
 * Why not `CommandItem`'s `selected` prop: that renders a small trailing check,
 * which is right for a **single**-select list because it marks *the* chosen row.
 * On a **multi**-select list it reads as "this is the current value" rather than
 * "tick as many as you like" — and before anything is chosen, a check-marked
 * list is visually identical to a single-select one, so people read it as
 * single-select and never discover they can pick more. Observed exactly that.
 *
 * The checkbox is `pointer-events-none` with `tabIndex={-1}` on purpose: the ROW
 * owns the click via `onSelect`, so letting the box take its own would toggle
 * twice and land back where it started. The row remains keyboard-operable
 * through cmdk, and the checkbox stays purely a visual indicator.
 *
 * ```tsx
 * <MultiSelectList
 *   options={products}
 *   value={selected}
 *   onChange={setSelected}
 *   placeholder="Search products…"
 * />
 * ```
 */
export function MultiSelectList({
  options,
  value,
  onChange,
  placeholder = "Search…",
  empty = "No matches.",
  searchable = true,
  className,
}: MultiSelectListProps) {
  const toggle = (option: string) =>
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-fp-card-1 py-0.5 pr-1 pl-2.5 text-xs text-foreground"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => toggle(v)}
                className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Command className="rounded-md border border-border">
        {searchable && <CommandInput placeholder={placeholder} />}
        <CommandList>
          {searchable && <CommandEmpty>{empty}</CommandEmpty>}
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => toggle(option)}
                aria-checked={value.includes(option)}
                icon={
                  <Checkbox
                    checked={value.includes(option)}
                    className="pointer-events-none"
                    tabIndex={-1}
                  />
                }
              >
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
