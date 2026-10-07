import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  THE ADD ON A TABLE — a tab hanging off the card's bottom-left corner.

  WHY NOT A BAND INSIDE THE CARD. A full-width strip draws a rule across the
  whole card to carry one small act, and what it reads as is an empty extra
  row of the table. (Pavan, 2026-09-22 — after both were built and put side by
  side.)

  WHY FILLED AND NOT OUTLINED. It takes the table's own header tint, so it
  continues the table rather than sitting near it as a separate control. An
  outline would be a second box under a card that already has one, which is
  the nesting `docs/ds/ui/2-rules.md` §10f exists to remove.

  A PLUS, AND THE WORDS ON HOVER. The row it adds is one of many and the sign
  says the act; a permanent label makes an ordinary add look like the
  section's main one. The label still arrives on keyboard focus, so it is not
  a thing only a mouse can find, and the button keeps its `aria-label` either
  way — the collapsed state is a visual economy, never a nameless control.
*/

/* IT CAN OPEN A MENU (Pavan, 2026-10-07). When one add offers a choice of
   row — the quote's Fee or Tax — it is a menu's trigger, so whatever the
   trigger hands it (ref, pointer and key handlers, aria) is passed through.
   Nothing about how it looks changes. */
export function HangingAdd({
  label,
  onClick,
  disabled,
  className,
  ...trigger
}: {
  /** "Add products", "Add vendor" — the table's own noun, always plural-safe. */
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
} & Omit<React.ComponentPropsWithRef<"button">, "onClick" | "className" | "disabled">) {
  const [open, setOpen] = React.useState(false);

  return (
    <button
      {...trigger}
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className={cn(
        /* SQUARE ON TOP, ROUNDED BELOW — the top edge is the card's bottom
           edge, and a radius there would show a notch between them. */
        "flex h-8 items-center rounded-t-none rounded-b-md bg-fp-table-header px-2.5",
        "text-sm font-medium text-foreground outline-none transition-colors",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      <Plus className="size-4 shrink-0" />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-[max-width,opacity,padding] duration-200",
          open ? "max-w-[140px] pl-1.5 opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {label}
      </span>
    </button>
  );
}
