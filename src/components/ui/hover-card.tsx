import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

/**
 * Trigger States — Figma "Hover Card / Trigger" (216:3085). The `link` variant
 * bakes the documented states so call sites don't hand-roll them:
 *   Default → plain · Hover → underline · Focus → ring · Disabled → dimmed.
 * Omit `variant` (or pass `asChild`) for the bare pass-through used when the
 * trigger is a custom element.
 */
const hoverCardTriggerVariants = cva(
  "inline-flex w-fit cursor-pointer items-center rounded-sm font-medium text-foreground underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: { variant: { link: "" } },
  }
);

function HoverCardTrigger({
  className,
  variant,
  children,
  asChild,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger> &
  VariantProps<typeof hoverCardTriggerVariants>) {
  // A variant renders its own focusable <button>; without one, pass through
  // (preserving the existing `asChild` API for custom trigger elements).
  if (variant) {
    return (
      <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" asChild>
        <button
          className={cn(hoverCardTriggerVariants({ variant }), className)}
          {...(props as React.ComponentProps<"button">)}
          type="button"
        >
          {children}
        </button>
      </HoverCardPrimitive.Trigger>
    );
  }
  return (
    <HoverCardPrimitive.Trigger
      data-slot="hover-card-trigger"
      className={className}
      asChild={asChild}
      {...props}
    >
      {children}
    </HoverCardPrimitive.Trigger>
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  hoverCardTriggerVariants,
};
