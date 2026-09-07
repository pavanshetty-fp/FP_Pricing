import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  STEPS — the numbered progress indicator for work that has an order to it.

  Named after the DS library's "Pro Blocks / Buttons / Steps". Built from the
  repo's own tokens rather than lifted pixel-for-pixel, which is this project's
  standing rule for visual values.

  IT IS NOT A TAB STRIP, and that is the whole reason it exists. Tabs are views
  of one thing and may be read in any order; a step is a STAGE, and the second
  one exists because the first produced something. Two labels under an underline
  say "pick one"; numbered discs joined by a rule say "this, then that" — and
  the rule between them is what carries the sequence, so it is the part that
  cannot be dropped.

  THREE STATES, and each says something different about what has happened:
    complete  — filled disc, a tick instead of the number. It is done.
    current   — filled disc, the number. It is where you are.
    upcoming  — hollow disc. It is ahead of you.
  A step can also be UNREACHABLE, which is not the same as upcoming: upcoming is
  "not yet", unreachable is "not possible", and the second one owes an
  explanation. `disabledReason` is both the tooltip and the reason it is dimmed.
*/

export interface StepItem {
  value: string;
  label: string;
  /** Under the label — what this step is for. Optional. */
  description?: string;
  /**
   * Why this step cannot be opened. Present = disabled, and shown on hover:
   * a control that refuses a click without saying why just gets clicked again.
   */
  disabledReason?: string;
}

export function Steps({
  steps,
  value,
  onValueChange,
  className,
  ...props
}: {
  steps: StepItem[];
  value: string;
  onValueChange?: (next: string) => void;
} & Omit<React.ComponentProps<"ol">, "onChange">) {
  const at = Math.max(0, steps.findIndex((s) => s.value === value));

  return (
    <ol
      data-slot="steps"
      className={cn("flex min-w-0 items-center", className)}
      {...props}
    >
      {steps.map((s, i) => {
        const state = i < at ? "complete" : i === at ? "current" : "upcoming";
        const disabled = Boolean(s.disabledReason);
        return (
          <li
            key={s.value}
            data-slot="step"
            data-state={state}
            className={cn("flex min-w-0 items-center", i > 0 && "flex-1")}
          >
            {/* THE RULE BETWEEN TWO STEPS IS THE SEQUENCE. It fills, so a wide
                strip spaces its steps out rather than bunching them left, and
                it darkens behind you: the line you have already walked. */}
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "mx-3 h-px min-w-6 flex-1",
                  i <= at ? "bg-foreground/40" : "bg-fp-outline-1"
                )}
              />
            )}
            <button
              type="button"
              aria-current={state === "current" ? "step" : undefined}
              disabled={disabled}
              title={s.disabledReason}
              onClick={() => onValueChange?.(s.value)}
              className={cn(
                "group/step flex min-w-0 items-center gap-2.5 rounded-md py-1 pr-2 text-left outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors",
                  state === "upcoming"
                    ? "border-fp-outline-2 text-muted-foreground group-hover/step:border-foreground/50 group-hover/step:text-foreground"
                    : "border-foreground bg-foreground text-background"
                )}
              >
                {state === "complete" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "truncate text-sm transition-colors",
                    state === "current"
                      ? "font-medium text-foreground"
                      : "text-muted-foreground group-hover/step:text-foreground"
                  )}
                >
                  {s.label}
                </span>
                {s.description && (
                  <span className="truncate text-xs text-muted-foreground">
                    {s.description}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
