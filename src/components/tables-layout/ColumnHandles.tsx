import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  TWO GESTURES, TWO TARGETS, TWO CURSORS.

  A header can be moved and it can be resized, and both start with a pointer
  held on a header. If they shared a target the table would guess, and it would
  guess wrong in the way that costs the most: you meant to widen a column and
  you reordered the table instead.

  So the boundary resizes and the body moves — the split every spreadsheet
  already taught. The cursor says which is which before the press: `col-resize`
  on the divider, `grab` on the header.
*/

/**
 * The divider handle — resize. Straddles the boundary so it can be hit from
 * either side, and belongs to the column on its LEFT, the way a spreadsheet's
 * divider does.
 *
 * WHAT IT DRAWS is the boundary itself and a short bar on either side of it:
 * `┆│┆`. The full-height rule is the edge you are about to move — these headers
 * carry no column rules otherwise, so the divider has to be drawn before it can
 * be grabbed — and the two bars are the grip on it. Two bars alone read as the
 * same six-dot mark the move grip uses; the rule between them is what makes the
 * gesture legible as "this edge, left or right".
 *
 * IT LIGHTS WITH ITS HEADER, not with its own 12px zone. Hovering the Status
 * cell shows the edge between Status and Customer, and nothing else — the
 * divider you are about to reach for is the one belonging to the column you are
 * already on. Gated on the zone instead, the mark only appeared once the pointer
 * had found a 12px strip it had no reason to aim at; gated on nothing, all
 * eleven dividers lit at once and the row read as a grid, not as a control.
 *
 * It is still a `peer`, so the move grip can get out of its way once the pointer
 * actually reaches the divider: two marks on one header at the moment of
 * pressing is the table offering two gestures and saying nothing about which one
 * the press will take.
 */
export function ColumnResizeHandle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "peer/resize absolute inset-y-0 -right-1.5 z-20 flex w-3 cursor-col-resize items-center justify-center",
        "opacity-0 transition-opacity duration-100",
        "group-hover/th:opacity-100 hover:opacity-100 focus-visible:opacity-100",
        "outline-none data-[resizing]:opacity-100",
        className
      )}
    >
      <span className="flex h-full items-center gap-[3px]">
        <span className="h-2.5 w-px rounded-full bg-fp-outline-2" />
        <span className="h-full w-px bg-fp-outline-2" />
        <span className="h-2.5 w-px rounded-full bg-fp-outline-2" />
      </span>
    </span>
  );
}

/**
 * The move sign — a grip that fades in over the header's own left padding when
 * the header is hovered. Twelve pixels wide at `left-0`, which is exactly the
 * header's `px-3`, so it costs the label no room and nothing reflows.
 *
 * IT IS THE SIGN, NOT THE HANDLE: the whole `<th>` is draggable, so the target
 * is the header rather than this 12px mark, and ⌘/Ctrl + ← → moves a focused
 * header for anyone not using a pointer.
 *
 * IT YIELDS TO THE DIVIDER. Both marks come up together when the header is
 * hovered — one saying the column moves, one showing the edge that resizes —
 * but rendered AFTER `ColumnResizeHandle` it is that handle's `peer`, so it
 * hides the moment the pointer actually reaches the divider. Up to that point
 * the two are describing different halves of the header; from there on they
 * would be two answers to one press.
 */
export function ColumnMoveGrip({ className }: { className?: string }) {
  return (
    <GripVertical
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-0 size-3 -translate-y-1/2 text-fp-outline-2",
        "opacity-0 transition-opacity duration-100 group-hover/th:opacity-100",
        "peer-hover/resize:opacity-0",
        className
      )}
    />
  );
}
