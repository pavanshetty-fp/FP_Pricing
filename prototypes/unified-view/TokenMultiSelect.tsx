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

/**
 * Token multi-select — chips with a remove ×, plus an "+ Add …" affordance that
 * opens a searchable list with a check on the chosen options.
 *
 * This is the DS's `form-layout/MultiSelect` (Figma "Dropdown … Add Margins",
 * 27593:15012) — markup, sizes and classes copied verbatim so the two cannot
 * drift. The only change is the API: the DS version hardcodes its option list
 * and label and keeps selection in private state, so it can't be pointed at
 * anything. This one takes `options`, `value`, `onChange` and `addLabel`.
 *
 * DS FOLLOW-UP: generalise `MultiSelect` to take those four props and delete
 * this file. It is a copy only because the DS component cannot currently be
 * reused, not because this screen needs anything different.
 */

/** Small circular initial badge used as a token / item leading glyph. */
function InitialBadge({ label }: { label: string }) {
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-semibold uppercase">
      {label[0]}
    </span>
  );
}

export interface TokenMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Trailing affordance, e.g. "Add tags". */
  addLabel: string;
  /** Search field placeholder, e.g. "Search tags...". */
  searchPlaceholder: string;
}

export function TokenMultiSelect({
  options,
  value,
  onChange,
  addLabel,
  searchPlaceholder,
}: TokenMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (opt: string) =>
    onChange(
      value.includes(opt) ? value.filter((o) => o !== opt) : [...value, opt]
    );

  const remove = (opt: string) => onChange(value.filter((o) => o !== opt));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-2 py-2 text-left outline-none transition-colors",
            "hover:border-fp-outline-2 focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=open]:border-ring",
            value.length === 0 && "justify-center"
          )}
        >
          {value.map((opt) => (
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
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  icon={<InitialBadge label={opt} />}
                  selected={value.includes(opt)}
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
