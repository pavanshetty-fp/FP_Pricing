import { cn } from "@/lib/utils";

export interface TabsProps {
  tabs: string[];
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** Underline tab strip. Active tab gets a foreground underline. */
function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex items-center", className)}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange?.(tab)}
            className={cn(
              "relative h-8 px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
