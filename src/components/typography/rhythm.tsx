import * as React from "react";
import { cn } from "@/lib/utils";

/*
  Vertical-rhythm helpers — Figma "Text Spacing Templates" (node 27634:21171).
  The DS rhythm steps (all on the 4px base):
    section 96px · title 24px (overline→title) · heading 16px ·
    body 12px (heading→body) · pair 2px (value↔label).
*/

const SPACE = {
  section: "gap-24", // 96px — between content sections
  title: "gap-6", // 24px — eyebrow/overline → title
  heading: "gap-4", // 16px — title → supporting body (upper bound)
  body: "gap-3", // 12px — heading → supporting body (lower bound)
  pair: "gap-0.5", // 2px — value ↔ label
  none: "gap-0",
} as const;

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Vertical rhythm step between children. */
  space?: keyof typeof SPACE;
}

/** Vertical flex stack with DS-rhythm gaps. */
export function Stack({ space = "body", className, ...props }: StackProps) {
  return <div className={cn("flex flex-col", SPACE[space], className)} {...props} />;
}

/** Overline / eyebrow — 12px uppercase tracked, muted. */
export function Eyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs font-medium uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export interface SectionHeadingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Heading element to render for the title. */
  as?: "h1" | "h2" | "h3";
}

/**
 * Eyebrow → title → description with the DS rhythm baked in:
 * 24px eyebrow→title, 12px title→description.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={className} {...props}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading
        className={cn(
          "text-2xl font-semibold tracking-tight text-foreground",
          eyebrow && "mt-6" // 24px overline→title
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export interface LabelValueProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
}

/** Data pair — value on top, 2px gap, uppercase label below. */
export function LabelValue({
  label,
  value,
  className,
  ...props
}: LabelValueProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)} {...props}>
      <span className="text-sm text-foreground">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
