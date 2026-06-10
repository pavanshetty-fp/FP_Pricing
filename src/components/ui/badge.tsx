import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    // Variants + states from Figma "Badge" (23:995).
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        // soft tint — red @10% bg + red text (DS, not a solid fill)
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        // verified — fixed DS blue + BadgeCheck icon (pass as child)
        verified: "bg-verified text-white hover:bg-verified/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

const badgeNumberVariants = cva(
  "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        ghost: "text-foreground",
        destructive: "bg-destructive/10 text-destructive",
        verified: "bg-verified text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeNumberProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof badgeNumberVariants> {
  count: number
  /** Numbers above `max` render as `max+` (e.g. 99+). */
  max?: number
}

/** Circular count badge — Figma "Badge Number" (17100:10130). */
function BadgeNumber({
  className,
  variant = "default",
  count,
  max = 99,
  ...props
}: BadgeNumberProps) {
  const label = count > max ? `${max}+` : String(count)
  return (
    <span
      data-slot="badge-number"
      data-variant={variant}
      className={cn(badgeNumberVariants({ variant }), className)}
      {...props}
    >
      {label}
    </span>
  )
}

export { Badge, badgeVariants, BadgeNumber, badgeNumberVariants }
