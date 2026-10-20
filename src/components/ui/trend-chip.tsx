import * as React from "react";
import { cn } from "@/lib/utils";

/*
  TREND CHIP — THE ONE UP / DOWN MARKER (Pavan, 2026-10-20; DS ui §10k).
  A soft pill with a small filled triangle: green when the change is good,
  red when it's bad (the reference's two, `--fp-trend-up` / `--fp-trend-down`),
  grey when there's no change. The triangle shows the direction; the colour
  shows good or bad — so a count the customer wants low (late orders) goes
  down in green with `good`. Every figure card in every module uses it; no
  arrows in circles, no orange.
*/
export function TrendChip({
  dir,
  good = dir === "up",
  size = "md",
  children,
  className,
}: {
  dir: "up" | "down" | "same";
  /** Whether this change is good news — green. Defaults to "up is good". */
  good?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md font-medium tabular-nums",
        size === "md" ? "h-7 px-2 text-sm" : "h-5 px-1.5 text-xs",
        dir === "same"
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-fp-trend-up-bg text-fp-trend-up"
            : "bg-fp-trend-down-bg text-fp-trend-down",
        className
      )}
    >
      {dir !== "same" && (
        <span
          aria-hidden
          className={cn(
            "size-0 border-x-[5px] border-x-transparent",
            dir === "up" ? "border-b-[6px] border-b-current" : "border-t-[6px] border-t-current"
          )}
        />
      )}
      {children}
    </span>
  );
}
