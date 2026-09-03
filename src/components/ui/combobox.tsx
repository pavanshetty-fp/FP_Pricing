import * as React from "react";
import { Check, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectTriggerClasses } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/*
  Combobox — a select you can TYPE INTO.

  Composed, not invented: Popover + Command, which is exactly how the pattern
  was already shown in the showcase. This is that composition made reusable, so
  a real form gets search by naming a component instead of rebuilding thirty
  lines of it and drifting from the demo.

  IT WEARS THE SELECT'S TRIGGER, from `selectTriggerClasses`. A field that is a
  select in every way except that you can filter it must not announce itself as
  a different control; the search box appears inside the list, where the
  difference actually is.

  WHY NOT PUT SEARCH IN `Select` ITSELF: Radix Select owns every keystroke for
  its own type-ahead, so a text input cannot live in its list. The two are
  siblings, not a component and its variant.

  SEARCH APPEARS ONLY WHEN THERE IS SOMETHING TO SEARCH (`searchThreshold`, 8).
  Below that the whole list is visible at once and a search field is a row of
  chrome standing between the click and the answer. Above it, scanning stops
  being possible and typing is the only fast path.
*/

export interface ComboboxOption {
  value: string;
  /** Shown instead of `value`. */
  label?: string;
  /** Second line, for the fact that tells two similar options apart. */
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (ComboboxOption | string)[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  /** Option count at or above which the search field appears. */
  searchThreshold?: number;
  /** Trigger classes — width lives here, as it does on `SelectTrigger`. */
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  "aria-label"?: string;
  id?: string;
}

const normalise = (o: ComboboxOption | string): ComboboxOption =>
  typeof o === "string" ? { value: o } : o;

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  disabled,
  size = "default",
  searchThreshold = 8,
  className,
  contentClassName,
  align = "start",
  "aria-label": ariaLabel,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo(() => options.map(normalise), [options]);
  const selected = items.find((o) => o.value === value);
  const showSearch = items.length >= searchThreshold;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          data-slot="select-trigger"
          data-size={size}
          data-placeholder={selected ? undefined : ""}
          className={cn(selectTriggerClasses, className)}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selected ? (selected.label ?? selected.value) : placeholder}
          </span>
          <ChevronDownIcon className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={4}
        /* Matches the field it dropped from, so the list reads as that field
           opening rather than as a panel that happens to be nearby. */
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0",
          contentClassName
        )}
      >
        <Command>
          {showSearch && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.value} ${o.description ?? ""}`}
                  disabled={o.disabled}
                  onSelect={() => {
                    onValueChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      o.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label ?? o.value}</span>
                    {o.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {o.description}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
