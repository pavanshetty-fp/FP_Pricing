import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleGroupItemDef {
  value: string;
  label: string; // for aria-label
  icon: React.ReactNode;
}

export interface ToggleGroupProps {
  items: ToggleGroupItemDef[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** Single-select icon toggle group (each toggle = size-8, joined). */
function ToggleGroup({ items, value, onValueChange, className }: ToggleGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center divide-x divide-border overflow-hidden rounded-md border border-input",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => onValueChange?.(item.value)}
            className={cn(
              "flex size-8 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4",
              active && "bg-accent text-accent-foreground"
            )}
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
}

export { ToggleGroup };
