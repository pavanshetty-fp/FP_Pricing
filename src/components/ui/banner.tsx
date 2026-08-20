import * as React from "react";
import { Info, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Banners — FP custom component (Figma "Banners" 28149:1712). Two types:

  - BannerCallout (Type 1): a prominent, full-width bar with a solid status
    fill and white text. Carries an optional CTA (right) OR a dismiss ✕.
    Used where the action quick-filters a section (e.g. a data table).
  - BannerInline (Type 2): a compact 32px alert on the Card-1 surface; the
    status is carried by the icon + text accent color, with a dismiss ✕.

  Colors live in the token layer (--fp-banner-*); see src/index.css.
*/

type BannerStatus = "info" | "caution" | "warning" | "success";

const calloutVariants = cva(
  "flex items-center gap-3 rounded-md px-4 py-3 text-fp-banner-foreground",
  {
    variants: {
      status: {
        info: "bg-fp-banner-info",
        caution: "bg-fp-banner-caution",
        warning: "bg-fp-banner-warning",
        success: "bg-fp-banner-success",
      },
    },
    defaultVariants: { status: "info" },
  }
);

export interface BannerCalloutProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof calloutVariants> {
  /** The banner message. */
  children: React.ReactNode;
  /** Right-aligned CTA slot (e.g. a ghost Button). Mutually exclusive with onDismiss. */
  action?: React.ReactNode;
  /** When provided, renders a trailing dismiss ✕ instead of the action. */
  onDismiss?: () => void;
  /** Leading icon override (defaults to Lucide Info). */
  icon?: React.ReactNode;
}

function BannerCallout({
  status = "info",
  className,
  children,
  action,
  onDismiss,
  icon,
  ...props
}: BannerCalloutProps) {
  return (
    <div
      role="status"
      data-status={status}
      className={cn(calloutVariants({ status }), className)}
      {...props}
    >
      <span className="mt-0.5 shrink-0 self-start text-fp-banner-foreground/90 [&_svg]:size-5">
        {icon ?? <Info />}
      </span>
      <p className="flex-1 text-sm leading-snug">{children}</p>
      {action ? (
        <div className="shrink-0 self-start">{action}</div>
      ) : onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 self-start rounded-sm p-1 text-fp-banner-foreground/80 outline-none transition-colors hover:bg-fp-banner-foreground/15 hover:text-fp-banner-foreground focus-visible:ring-2 focus-visible:ring-fp-banner-foreground/50"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

const inlineAccent = cva("", {
  variants: {
    status: {
      default: "text-foreground",
      caution: "text-fp-banner-accent-caution",
      warning: "text-fp-banner-accent-warning",
      success: "text-fp-banner-accent-success",
    },
  },
  defaultVariants: { status: "default" },
});

export interface BannerInlineProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof inlineAccent> {
  children: React.ReactNode;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

function BannerInline({
  status = "default",
  className,
  children,
  onDismiss,
  icon,
  ...props
}: BannerInlineProps) {
  return (
    <div
      role="status"
      data-status={status}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md bg-fp-card-1 px-3",
        className
      )}
      {...props}
    >
      <span className={cn("shrink-0 [&_svg]:size-4", inlineAccent({ status }))}>
        {icon ?? <Info />}
      </span>
      <span className={cn("flex-1 truncate text-sm", inlineAccent({ status }))}>
        {children}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export { BannerCallout, BannerInline };
export type { BannerStatus };
