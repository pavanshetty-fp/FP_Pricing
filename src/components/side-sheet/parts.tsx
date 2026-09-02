import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* Shared building blocks for the Side Sheet variants (Figma 27610:58293). */

/** Section = muted group heading + fields. */
export function SheetSection({
  title,
  action,
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-h-7 items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
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
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
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
