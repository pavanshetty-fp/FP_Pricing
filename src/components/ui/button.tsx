import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // `bg-transparent`, NOT `bg-background`. `--background` is the APP
        // background (#efefeb light), which is right only when the button sits
        // ON it — and wrong on the white content layer, where every toolbar and
        // every table row puts outline buttons. Measured on one gallery route
        // before this change: 51 controls filled #efefeb on a #ffffff layer.
        //
        // Transparent is neutral-or-better everywhere, which is why this belongs
        // in the variant rather than at call sites: on the app background it
        // composites to the identical colour, on the content layer it renders
        // #ffffff, and on a card it inherits the card instead of fighting it.
        //
        // The stroke is `--input` in BOTH themes now. The variant already used
        // `--input` in dark; light was the odd one out at `--border` (#cdd4de vs
        // the field's #abb3c2), so an outline button read a shade lighter than
        // the input beside it in every toolbar.
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground dark:bg-fp-field-fill dark:hover:bg-fp-field-fill-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // The affirmative counterpart to `destructive`: a filled button for the
        // one action that MOVES SOMETHING FORWARD where an outline would be
        // read as optional. Same green the status family uses, with its own
        // foreground — see the note on `--status-success-foreground`.
        success:
          "bg-status-success text-status-success-foreground hover:bg-status-success/90 focus-visible:ring-status-success/30",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
