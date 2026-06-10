import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* Shared building blocks for the Side Sheet variants (Figma 27610:58293). */

/** Section = muted group heading + fields. */
export function SheetSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Field = label + control + helper text. */
export function SheetField({
  label,
  description,
  children,
  className,
}: {
  label?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
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
