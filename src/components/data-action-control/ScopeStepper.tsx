import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Generic scope stepper — `‹ label ›`. Fills `DataActionControl`'s `scopeControl`
 * slot: whatever narrows the dataset before presentation or actions apply to it
 * (a date, a period, a shift). The DS ships the shape; the application supplies
 * the label and what stepping means.
 *
 * Three separately-outlined boxes, not a borderless icon-text-icon run: the
 * label is a value you are stepping THROUGH, so it reads as a field with a
 * control either side. The label box borrows `buttonVariants({ outline, sm })`
 * rather than re-declaring border/fill classes, so the three boxes cannot drift
 * apart across themes — the outline variant swaps `border`/`bg` between light
 * and dark, and all three inherit that swap together. It is `pointer-events-none`
 * because it is a readout, not a button.
 *
 * The boxes render transparent on the content layer (#ffffff in light) because
 * the `outline` variant itself is transparent — see `ui/button.tsx`. This file
 * used to carry a call-site correction for that; it no longer needs one.
 */

export function ScopeStepper({
  label,
  onPrev,
  onNext,
}: {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon-sm" aria-label="Previous" onClick={onPrev}>
        <ChevronLeft />
      </Button>
      <span
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "pointer-events-none font-normal whitespace-nowrap tabular-nums"
        )}
      >
        {label}
      </span>
      <Button variant="outline" size="icon-sm" aria-label="Next" onClick={onNext}>
        <ChevronRight />
      </Button>
    </div>
  );
}
