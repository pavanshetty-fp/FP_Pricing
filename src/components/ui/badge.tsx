import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    // Variants + states from Figma "Badge" (23:995).
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Chip fill is `--chip`, its own token: #efefeb light, #2a2f37 dark.
        // NOT `--secondary` (#cad1db light), which reads as a heavy block on the
        // white content layer, and not a borrowed surface token either — the
        // value light wants is `--background`, which is #080808 in dark and would
        // render chips near-black. `--secondary` stays as it is because it also
        // fills secondary BUTTONS, which need the weight.
        secondary:
          "bg-chip text-secondary-foreground hover:bg-chip/80",
        outline:
          "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        // soft tint — red @10% bg + red text (DS, not a solid fill)
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        // verified — fixed DS blue + BadgeCheck icon (pass as child)
        verified: "bg-verified text-verified-foreground hover:bg-verified/90",
        link: "text-primary underline-offset-4 hover:underline",
        // Pastel fills — one pair per hue, same in both themes. Applications
        // bind meaning to a hue; the DS only ships the hues. See index.css.
        "pastel-blue":
          "bg-pastel-blue text-pastel-blue-foreground hover:bg-pastel-blue/90",
        "pastel-amber":
          "bg-pastel-amber text-pastel-amber-foreground hover:bg-pastel-amber/90",
        "pastel-violet":
          "bg-pastel-violet text-pastel-violet-foreground hover:bg-pastel-violet/90",
        "pastel-rose":
          "bg-pastel-rose text-pastel-rose-foreground hover:bg-pastel-rose/90",
        "pastel-slate":
          "bg-pastel-slate text-pastel-slate-foreground hover:bg-pastel-slate/90",
        "pastel-teal":
          "bg-pastel-teal text-pastel-teal-foreground hover:bg-pastel-teal/90",
        "pastel-green":
          "bg-pastel-green text-pastel-green-foreground hover:bg-pastel-green/90",
      },
      /**
       * Geometry, independent of colour.
       *   pill — the default badge.
       *   disc — a 16px circle carrying one or two characters (a "code disc").
       *          Prefer the CodeDisc component over `shape="disc"` directly: it
       *          enforces the tooltip + aria-label that stop the letter being
       *          the only carrier of meaning.
       */
      shape: {
        pill: "",
        disc: "size-4 justify-center rounded-full p-0 text-[9px] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "pill",
    },
  }
)

function Badge({
  className,
  variant = "default",
  shape = "pill",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-shape={shape}
      className={cn(badgeVariants({ variant, shape }), className)}
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
        secondary: "bg-chip text-secondary-foreground",
        outline: "border border-border text-foreground",
        ghost: "text-foreground",
        destructive: "bg-destructive/10 text-destructive",
        verified: "bg-verified text-verified-foreground",
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
