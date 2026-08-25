import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Generic scope stepper — `‹ label ›`. Fills `DataActionControl`'s `scopeControl`
 * slot: whatever narrows the dataset before presentation or actions apply to it
 * (a date, a period, a shift). The DS ships the shape; the application supplies
 * the label and what stepping means.
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
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous"
        onClick={onPrev}
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft />
      </Button>
      <span className="px-1 text-sm whitespace-nowrap text-foreground tabular-nums">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next"
        onClick={onNext}
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
