import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Accessible switch (track h-5 / w-9 to mirror shadcn small switch). */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
