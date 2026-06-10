import * as React from "react";
import { Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/*
  Token multi-select / combobox — "Dropdown … Add Margins" (Figma 27593:15012).
  Empty state shows a "+ Add Margins" affordance; chosen options render as
  removable token chips (leading initial badge + label + ×). Re-opening the
  popover toggles membership.
*/

const OPTIONS = [
  "Text 1",
  "Text 2",
  "Text 3",
  "Margin A",
  "Margin B",
  "Margin C",
];

export function MultiSelect({
  defaultSelected = [],
}: {
  defaultSelected?: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(defaultSelected);

  const toggle = (opt: string) =>
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );

  const remove = (opt: string) =>
    setSelected((prev) => prev.filter((o) => o !== opt));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-2 py-2 text-left outline-none transition-colors",
            "hover:border-fp-outline-2 focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=open]:border-ring",
            selected.length === 0 && "justify-center"
          )}
        >
          {selected.map((opt) => (
            <span
              key={opt}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-fp-surface-1b py-1 pr-1 pl-1.5 text-sm"
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-semibold uppercase">
                {opt[0]}
              </span>
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
            Add Margins
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-1">
        {OPTIONS.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-semibold uppercase">
                {opt[0]}
              </span>
              <span className="flex-1">{opt}</span>
              {active && <Check className="size-4 text-foreground" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
