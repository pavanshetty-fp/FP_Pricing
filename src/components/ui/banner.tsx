import * as React from "react";
import { Info, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Banners — FP custom component (Figma "Banners" 28149:1712). Two types:

  - BannerCallout (Type 1): a prominent, full-width bar. In LIGHT it is a solid
    status fill with white text; in DARK it is a near-black tint of the same
    hue with a 1px rim in the status colour, because a saturated bar on a dark
    ground is the loudest thing on the page whatever it has to say. Carries an
    optional CTA (right) OR a dismiss ✕. Used where the action quick-filters a
    section (e.g. a data table).
  - BannerInline (Type 2): a compact 32px alert on the Card-1 surface; the
    status is carried by the icon + text accent color, with a dismiss ✕.

  Colors live in the token layer (--fp-banner-*); see src/index.css.
*/

type BannerStatus = "info" | "caution" | "warning" | "success";

const calloutVariants = cva(
  // THE RIM IS ALWAYS DRAWN, and is transparent in light. A border that
  // appears only in one theme changes the box's height between them; one that
  // is always there and only sometimes coloured does not.
  "flex items-center gap-3 rounded-md border px-4 py-3 text-fp-banner-foreground",
  {
    variants: {
      status: {
        info: "border-fp-banner-border-info bg-fp-banner-info",
        caution: "border-fp-banner-border-caution bg-fp-banner-caution",
        warning: "border-fp-banner-border-warning bg-fp-banner-warning",
        success: "border-fp-banner-border-success bg-fp-banner-success",
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
      info: "text-fp-banner-accent-info",
      caution: "text-fp-banner-accent-caution",
      warning: "text-fp-banner-accent-warning",
      success: "text-fp-banner-accent-success",
    },
  },
  defaultVariants: { status: "default" },
});

export interface BannerInlineProps
  extends Omit<React.ComponentProps<"div">, "children" | "title">,
    VariantProps<typeof inlineAccent> {
  children: React.ReactNode;
  /**
   * A heading over the message, in the status colour.
   *
   * WITHOUT IT THE BANNER IS ONE 32px LINE, which is the shape it was built
   * for and the shape most alerts want. Some say a thing and then say what
   * follows from it — a state and its consequence — and squeezing both into one
   * truncating line lost the half that mattered. With a title the banner grows
   * to fit and stops truncating; the message drops to muted so the two lines
   * are a heading and a body rather than two sentences of equal weight.
   */
  title?: React.ReactNode;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

function BannerInline({
  status = "default",
  className,
  children,
  title,
  onDismiss,
  icon,
  ...props
}: BannerInlineProps) {
  return (
    <div
      role="status"
      data-status={status}
      className={cn(
        "flex gap-2 rounded-md bg-fp-card-1 px-3",
        title ? "items-start py-2.5" : "h-8 items-center",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "shrink-0 [&_svg]:size-4",
          title && "mt-px",
          inlineAccent({ status })
        )}
      >
        {icon ?? <Info />}
      </span>
      {title ? (
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("text-sm font-medium", inlineAccent({ status }))}>
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{children}</span>
        </span>
      ) : (
        <span className={cn("flex-1 truncate text-sm", inlineAccent({ status }))}>
          {children}
        </span>
      )}
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
