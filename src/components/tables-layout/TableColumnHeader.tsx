import * as React from "react";
import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";
import { ColumnMoveGrip, ColumnResizeHandle } from "./ColumnHandles";
import type { UseTableColumnsResult } from "./useTableColumns";

/**
 * A table's column header. Render this instead of `<TableHead>` and the column
 * moves and resizes — there is nothing else to wire.
 *
 * WHAT IT CARRIES, so that no table has to remember it:
 *
 *  • the drag props that make the header the move target, and the keyboard
 *    ⌘/Ctrl + ← → that moves it without a pointer;
 *  • the drop indicator — the dragged header fades, the one it will land
 *    against draws a rule on the side it will land on;
 *  • `ColumnResizeHandle` on the right edge and `ColumnMoveGrip` at the label,
 *    both lit by this header's own hover and by nothing else;
 *  • `group/th`, `relative` and the focus ring the two of them depend on.
 *
 * A FIXED column gets none of it: the leading select box and the trailing
 * row-open cell are the frame a row is read inside rather than content, and the
 * trailing one is pinned to the right edge so it survives a sideways scroll.
 */
export function TableColumnHeader({
  cols,
  col,
  className,
  children,
  ...props
}: {
  /** The `useTableColumns` result. */
  cols: UseTableColumnsResult;
  col: { key: string; width: number };
} & React.ComponentProps<typeof TableHead>) {
  const fixed = cols.isFixed(col.key);
  const resize = cols.resizeProps(col);

  return (
    <TableHead
      {...cols.headerProps(col.key)}
      {...props}
      className={cn(
        "group/th relative",
        !fixed && "cursor-grab",
        // The column being dragged fades out of the way.
        "data-[dragging]:opacity-40",
        // The one it will land against draws a rule on the side it lands on.
        "before:pointer-events-none before:absolute before:inset-y-0 before:w-0.5 before:bg-transparent",
        "data-[drop=before]:before:left-0 data-[drop=before]:before:bg-ring",
        "data-[drop=after]:before:right-0 data-[drop=after]:before:bg-ring",
        "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
        className
      )}
    >
      {/* The resize handle is FIRST so the move grip can be its peer and step
          aside once the pointer actually reaches the divider. */}
      {resize && <ColumnResizeHandle {...resize} />}
      {!fixed && <ColumnMoveGrip />}
      {children}
    </TableHead>
  );
}
