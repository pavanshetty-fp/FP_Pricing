import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        // base/primary (#abb3c2) light pill with dark text — e.g. "Create Task"
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        // transparent w/ border — e.g. "Filters", "Group By", "Views"
        outline:
          "border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-muted text-foreground hover:bg-muted/80",
        ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-transparent text-destructive hover:bg-destructive/10",
        brand: "bg-brand text-white hover:bg-brand/90",
      },
      size: {
        default: "h-9 px-4 py-2", // height/h-9
        sm: "h-8 px-3", // height/h-8 — action-bar controls
        xs: "h-7 px-2.5 text-xs", // height/h-7
        icon: "size-8", // 32x32 icon button
        "icon-sm": "size-7",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "sm",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
