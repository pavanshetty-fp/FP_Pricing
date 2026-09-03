import * as React from "react";
import { CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* Shared building blocks for the Side Sheet variants (Figma 27610:58293). */

/** Section = muted group heading + fields. */
export function SheetSection({
  title,
  action,
  note,
  children,
  className,
}: {
  title: string;
  /**
   * Controls that act on the SECTION rather than on one field — "Add asset",
   * "Refresh". They sit on the heading row, right-aligned, because a control
   * that owns a whole section has no field to belong to.
   */
  action?: React.ReactNode;
  /** An explainer beside the heading — typically `SheetSectionNote`. */
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  /* SECTION RHYTHM — 40 / 16. The gap between sections is 40px (owned by the
     sheet body); the gap between a section's title and its content is 16px. The
     outer gap being 2.5x the inner is what makes a heading read as belonging to
     the block beneath it rather than floating between two blocks. At 20 the
     title sat almost equidistant from both; below 16 it welds to the first
     field and the whole boundary rests on the 40. */
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex min-h-7 items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
          {/* Sits WITH the heading, not after the content: an explanation of
              how a section works belongs where the section is named, and on
              demand rather than as a paragraph everyone reads once. */}
          {note}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Field = label + control + helper text. */
export function SheetField({
  label,
  description,
  required,
  children,
  className,
}: {
  /**
   * A node, not just a string: a field's label row sometimes carries a control
   * that acts on the whole field — an "Invite" beside a picker — and that
   * control belongs on the label row rather than trailing the field's body.
   */
  label?: React.ReactNode;
  description?: string;
  /** Marks the label with the destructive asterisk the DS forms already use. */
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}
      {/* HELPER TEXT IS PART OF THE CONTROL, 4px under it — not the next thing
          down the form. At the field gap it floats between two controls and gets
          read as a label for the one below. Label→control keeps the field's own
          rhythm; control→helper is always 4px. */}
      <div className="flex flex-col gap-1">
        {children}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

/** The top-of-body alert banner shared by every variant. */
export function InfoAlert() {
  return (
    <Alert>
      <CircleAlert />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>This is an alert description.</AlertDescription>
    </Alert>
  );
}

/**
 * The "why does this section behave this way" explainer, on demand.
 *
 * A paragraph under a section is read once and then permanently in the way; the
 * rule it states is needed at the moment someone WONDERS, which is rarely the
 * moment they first arrive. On CLICK rather than hover, because hover cannot be
 * reached by touch and a tooltip that appears while you are aiming at something
 * else is worse than no tooltip.
 *
 * Deliberately NARROW. Explanations set to the full width of a sheet become one
 * long line that has to be tracked back across; a few short lines are read at a
 * glance.
 */
export function SheetSectionNote({
  label = "About this section",
  children,
}: {
  /** Names the button for assistive tech. */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:text-foreground"
        >
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-xs leading-relaxed">
        {children}
      </PopoverContent>
    </Popover>
  );
}
