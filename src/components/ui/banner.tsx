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
  // THE RIM IS ALWAYS DRAWN, and is transparent in light on the solid variant.
  // A border that appears only in one theme changes the box's height between
  // them; one that is always there and only sometimes coloured does not.
  "flex items-center rounded-md border",
  {
    variants: {
      status: { info: "", caution: "", warning: "", success: "" },
      /*
        SOLID SAYS "STOP", SOFT SAYS "LOOK". The solid bar is the DS's loudest
        voice and it takes the whole width of a section; a page that carries a
        standing condition — two orders waiting on a driver, a sync that has
        not run — needs to say so without shouting over the work it sits above.
        Soft is the same anatomy at a tenth of the fill: the status is in the
        icon and the rim, the title is body text, and the page underneath stays
        readable.
      */
      /*
        SOFT IS ONE LINE, AND ITS BOX IS SIZED FOR ONE. Solid wraps to two or
        three — it carries a paragraph — so it keeps the roomier padding and
        top-aligns its icon and actions against a growing block. Soft never
        wraps: everything in it is centred on a single baseline and the
        vertical padding only has to clear the 32px action button.
      */
      variant: {
        solid: "gap-3 px-4 py-3 text-fp-banner-foreground",
        soft: "gap-2.5 px-3 py-1.5",
      },
    },
    compoundVariants: [
      { variant: "solid", status: "info", class: "border-fp-banner-border-info bg-fp-banner-info" },
      { variant: "solid", status: "caution", class: "border-fp-banner-border-caution bg-fp-banner-caution" },
      { variant: "solid", status: "warning", class: "border-fp-banner-border-warning bg-fp-banner-warning" },
      { variant: "solid", status: "success", class: "border-fp-banner-border-success bg-fp-banner-success" },
      // The soft fill and rim are alphas of the INLINE accent — the shade that
      // already carries this status as text — so a soft banner cannot drift
      // from the inline one beside it.
      { variant: "soft", status: "info", class: "border-fp-banner-accent-info/30 bg-fp-banner-accent-info/10" },
      { variant: "soft", status: "caution", class: "border-fp-banner-accent-caution/30 bg-fp-banner-accent-caution/10" },
      { variant: "soft", status: "warning", class: "border-fp-banner-accent-warning/30 bg-fp-banner-accent-warning/10" },
      { variant: "soft", status: "success", class: "border-fp-banner-accent-success/30 bg-fp-banner-accent-success/10" },
    ],
    defaultVariants: { status: "info", variant: "solid" },
  }
);

/**
 * The fill for an action sitting ON a soft banner.
 *
 * An outline button disappears into a tinted wash — its stroke is a neighbour
 * of the rim around it and its fill is the wash itself, so the one thing the
 * banner wants you to press is the one thing with no edge. The action is a
 * RAISED TILE instead: the content layer in light (white) and the app ground
 * in dark (near-black), i.e. the surface furthest from the wash in each theme.
 *
 * Two tokens rather than one because no single surface is white in light AND
 * black in dark — that inversion is exactly what the two ends of the ladder
 * are. Exported so every soft banner's action matches without each call site
 * re-deriving it.
 */
export const bannerSoftAction =
  "bg-fp-surface-1b text-foreground hover:bg-fp-surface-1b/85 dark:bg-fp-surface-base dark:hover:bg-fp-surface-base/80";

export interface BannerCalloutProps
  extends Omit<React.ComponentProps<"div">, "children" | "title">,
    VariantProps<typeof calloutVariants> {
  /**
   * The banner message. Optional: a soft banner is usually a `title` alone,
   * and a second clause that only restates it is noise on a bar that sits
   * above the work all day.
   */
  children?: React.ReactNode;
  /**
   * A bold lead before the message, on the same line.
   *
   * TWO WEIGHTS, ONE LINE. What has happened and what follows from it are one
   * sentence read at two speeds: the title is what a passing eye takes, the
   * message is what it takes if it stops. Stacked they would be two rows of
   * equal claim; set on one line at two weights, the second half is available
   * without demanding anything.
   */
  title?: React.ReactNode;
  /**
   * A count in the status colour, ahead of the actions. Only worth passing
   * when it says something the title does not.
   */
  count?: number;
  /** Right-aligned controls — a Button, or several. */
  action?: React.ReactNode;
  /** When provided, renders a trailing dismiss ✕ AFTER any action. */
  onDismiss?: () => void;
  /** Leading icon override (defaults to Lucide Info). */
  icon?: React.ReactNode;
}

function BannerCallout({
  status = "info",
  variant = "solid",
  className,
  children,
  title,
  count,
  action,
  onDismiss,
  icon,
  ...props
}: BannerCalloutProps) {
  const soft = variant === "soft";
  return (
    <div
      role="status"
      data-status={status}
      data-variant={variant}
      className={cn(calloutVariants({ status, variant }), className)}
      {...props}
    >
      <span
        className={cn(
          "shrink-0",
          soft
            ? cn("[&_svg]:size-4", inlineAccent({ status }))
            : "mt-0.5 self-start text-fp-banner-foreground/90 [&_svg]:size-5"
        )}
      >
        {icon ?? <Info />}
      </span>
      <p
        className={cn(
          "flex min-w-0 flex-1 gap-x-2 text-sm",
          soft ? "items-center leading-none" : "flex-wrap items-baseline leading-snug"
        )}
      >
        {title && (
          <span className={cn("font-medium", soft && "text-foreground")}>{title}</span>
        )}
        {children && <span className={cn(soft && "text-muted-foreground")}>{children}</span>}
      </p>
      {count != null && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-xs tabular-nums",
            soft ? inlineAccent({ status }) : "self-start text-fp-banner-foreground/80"
          )}
        >
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", soft ? "bg-current" : "bg-fp-banner-foreground/80")}
          />
          {count}
        </span>
      )}
      {action && (
        <div className={cn("flex shrink-0 items-center gap-2", !soft && "self-start")}>
          {action}
        </div>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            "-mr-1 shrink-0 rounded-sm p-1 outline-none transition-colors focus-visible:ring-2",
            !soft && "self-start",
            soft
              ? "text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50"
              : "text-fp-banner-foreground/80 hover:bg-fp-banner-foreground/15 hover:text-fp-banner-foreground focus-visible:ring-fp-banner-foreground/50"
          )}
        >
          <X className="size-4" />
        </button>
      )}
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
