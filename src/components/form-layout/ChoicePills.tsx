import * as React from "react";
import { cn } from "@/lib/utils";

/*
  Single-select "Options" pills (Figma 27593:15012) — Low / Medium / High /
  Critical. The active pill fills; the rest are quiet surface chips.
*/
const OPTIONS = ["Low", "Medium", "High", "Critical"];

export function ChoicePills({ defaultValue = "Low" }: { defaultValue?: string }) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(opt)}
            aria-pressed={active}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-foreground text-background"
                : "border border-border bg-fp-surface-1a text-foreground hover:border-fp-outline-2"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
