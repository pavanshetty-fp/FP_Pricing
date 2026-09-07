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
 * Shown only under the pointer. Always drawn, it would be a mark on every
 * header at once, and a row of eleven of them reads as decoration rather than
 * as a control.
 */
export function ColumnResizeHandle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "absolute inset-y-0 -right-1.5 z-20 flex w-3 cursor-col-resize items-center justify-center",
        "opacity-0 transition-opacity duration-100 hover:opacity-100 focus-visible:opacity-100",
        "outline-none data-[resizing]:opacity-100",
        className
      )}
    >
      <span className="flex h-2.5 items-stretch gap-[2px]">
        <span className="w-px rounded-full bg-fp-outline-2" />
        <span className="w-px rounded-full bg-fp-outline-2" />
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
 */
export function ColumnMoveGrip({ className }: { className?: string }) {
  return (
    <GripVertical
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-0 size-3 -translate-y-1/2 text-fp-outline-2",
        "opacity-0 transition-opacity duration-100 group-hover/th:opacity-100",
        className
      )}
    />
  );
}
