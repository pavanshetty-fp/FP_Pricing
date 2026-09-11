import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

/** Small circular initial badge used as a token / item leading glyph. */
function InitialBadge({ label }: { label: string }) {
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-semibold uppercase">
      {label[0]}
    </span>
  );
}

/*
  Token multi-select / combobox — "Dropdown … Add Margins" (Figma 27593:15012).
  Empty state shows an add affordance; chosen options render as removable token
  chips (leading initial badge + label + ×). Re-opening the popover toggles
  membership.

  TWO MODES, so one component serves the showcase and a real form:

  • UNCONTROLLED (no `value`) — the original demo: its own state over its own
    six options. Every existing caller lands here unchanged.
  • CONTROLLED (`value` + `onChange`) — the caller owns the selection and
    supplies the options, because WHAT can be chosen is a property of the data,
    not of the control. Same split the Group By menu and the bulk bar make.

  The labels follow: `addLabel` and `searchPlaceholder` said "Margins" because
  the demo was about margins. A form picking POCs should not.
*/

const DEMO_OPTIONS = [
  "Text 1",
  "Text 2",
  "Text 3",
  "Margin A",
  "Margin B",
  "Margin C",
];

export interface MultiSelectProps {
  /** Uncontrolled starting selection. Ignored when `value` is supplied. */
  defaultSelected?: string[];
  /** Choosable options. Defaults to the showcase's own list. */
  options?: readonly string[];
  /** Supply with `onChange` to control the selection. */
  value?: string[];
  onChange?: (next: string[]) => void;
  /** The add affordance's label, shown when nothing is chosen. */
  addLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /**
   * Merged into the trigger, so the same control can serve as a full-width
   * FIELD or as a section-heading ACTION. The base is the field: `w-full` and
   * a 44px box. A heading action passes `w-auto` and a lighter frame — one
   * control either way, because two would drift apart.
   */
  className?: string;
}

export function MultiSelect({
  defaultSelected = [],
  options = DEMO_OPTIONS,
  value,
  onChange,
  addLabel = "Add Margins",
  searchPlaceholder = "Search margins...",
  emptyText = "No options found.",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [own, setOwn] = React.useState<string[]>(defaultSelected);
  const controlled = value !== undefined;
  const selected = controlled ? value : own;
  const commit = (next: string[]) => {
    if (!controlled) setOwn(next);
    onChange?.(next);
  };

  const toggle = (opt: string) =>
    commit(
      selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]
    );

  const remove = (opt: string) => commit(selected.filter((o) => o !== opt));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="multiselect-trigger"
          className={cn(
            "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-2 py-2 text-left outline-none transition-colors",
            "hover:border-fp-outline-2 focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=open]:border-ring",
            selected.length === 0 && "justify-center",
            className
          )}
        >
          {selected.map((opt) => (
            <span
              key={opt}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-fp-surface-1b py-1 pr-1 pl-1.5 text-sm"
            >
              <InitialBadge label={opt} />
              {opt}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${opt}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(opt);
                }}
                className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Plus className="size-4" />
            {addLabel}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  icon={<InitialBadge label={opt} />}
                  selected={selected.includes(opt)}
                  // keep the menu open for multi-select; cmdk doesn't close it
                  onSelect={() => toggle(opt)}
                >
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
