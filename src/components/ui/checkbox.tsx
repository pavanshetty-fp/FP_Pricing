import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Accessible tri-state checkbox (height/h-4 = 16px). */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled, className, ...props }, ref) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === "indeterminate";
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={isIndeterminate ? "mixed" : isChecked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!isChecked)}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-transparent text-primary-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          (isChecked || isIndeterminate) && "border-primary bg-primary",
          className
        )}
        {...props}
      >
        {isIndeterminate ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : isChecked ? (
          <Check className="size-3" strokeWidth={3} />
        ) : null}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
