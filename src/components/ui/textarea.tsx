import * as React from "react";

import { cn } from "@/lib/utils";

/* Sentence case by default, same rule and same reasoning as `Input`. A
   textarea holds prose, so there is no case where `none` is the better start.
   Overridable per call site. */
function Textarea({
  className,
  autoCapitalize,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      autoCapitalize={autoCapitalize ?? "sentences"}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-fp-surface-1b px-3 py-2 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-fp-field-fill dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
