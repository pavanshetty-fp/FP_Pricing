import { cn } from "@/lib/utils";

/**
 * The affordance for `useColumnOrder` — a grip on the divider at a column's
 * right edge, revealed only while the pointer is on that divider.
 *
 * WHY THE DIVIDER AND NOT THE WHOLE HEADER. A header that can be dragged looks
 * exactly like one that cannot, so something has to say so; but a mark that is
 * always drawn is a mark on every header at once, and a row of eleven grips
 * reads as decoration rather than as a control. The divider is the one place a
 * pointer already goes when someone is thinking about the shape of the table —
 * it is where a spreadsheet puts the same affordance — and revealing it there
 * costs the header nothing until it is wanted.
 *
 * IT BELONGS TO THE COLUMN ON ITS LEFT, the same convention a spreadsheet's
 * divider follows. The zone straddles the edge so it can be hit from either
 * side, but what it drags is the header it sits inside.
 *
 * The grip is NOT the only drag target — the whole `<th>` is draggable. This is
 * the sign, not the handle, so someone who never finds it can still just drag
 * the header, and someone who never uses a pointer has ⌘/Ctrl + ← →.
 */
export function ColumnDragGrip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        /* Straddles the boundary: 12px wide, centred on the header's right
           edge, full height so the whole divider is live. */
        "absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-grab items-center justify-center",
        "opacity-0 transition-opacity duration-100 hover:opacity-100",
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
