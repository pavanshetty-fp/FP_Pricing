import * as React from "react";
import { useColumnOrder, type ColumnHeaderDragProps } from "./useColumnOrder";
import { useColumnWidths, type ColumnResizeProps } from "./useColumnWidths";

/*
  THE TABLE'S COLUMN BEHAVIOUR, IN ONE CALL.

  Reordering and resizing are not features a table opts into — they are what a
  column IS for anyone reading one. Split across two hooks and five header
  classes they were something each table had to remember to wire, and the one
  that forgot looked identical to the one that could not. This composes them,
  wires the guard between them, and hands the result to `TableColumnHeader`,
  which is the only thing a table has to render.

  A new table gets both by using that header. There is no "enable" flag, because
  a table that does not want them is a table whose columns the reader may not
  arrange, and that is not a default anyone should be able to reach for by
  omission.
*/

export interface UseTableColumnsOptions {
  /** Every column key, in the order the table declares them. */
  keys: string[];
  /**
   * Structure, not content — the leading select box and the trailing row-open
   * cell. These neither move nor resize, and nothing can be dropped past them.
   */
  fixed?: string[];
  /** Supply with `onOrderChange` to keep the order in a saved view. */
  order?: string[];
  onOrderChange?: (next: string[]) => void;
  /** Supply with `onWidthsChange` to keep the widths in a saved view. */
  widths?: Record<string, number>;
  onWidthsChange?: (next: Record<string, number>) => void;
}

export interface UseTableColumnsResult {
  /** Sorts a column list into the reader's order. */
  arrange: <T extends { key: string }>(cols: T[]) => T[];
  /** The width to render — the reader's if they set one, else the declared one. */
  widthOf: (col: { key: string; width: number }) => number;
  /** True for a column that is structure rather than content. */
  isFixed: (key: string) => boolean;
  /** Internals `TableColumnHeader` spreads. Callers should not need these. */
  headerProps: (key: string) => ColumnHeaderDragProps;
  resizeProps: (col: { key: string; width: number }) => ColumnResizeProps | null;
}

export function useTableColumns({
  keys,
  fixed = [],
  order,
  onOrderChange,
  widths,
  onWidthsChange,
}: UseTableColumnsOptions): UseTableColumnsResult {
  const width = useColumnWidths({
    fixed,
    value: widths,
    onChange: onWidthsChange,
  });
  /* THE GUARD LIVES HERE so no table can forget it: both gestures start on a
     header, and without this the browser starts a column drag out of a resize
     press. */
  const orderState = useColumnOrder({
    keys,
    fixed,
    value: order,
    onChange: onOrderChange,
    canDrag: () => !width.isResizing(),
  });

  const fixedSet = React.useMemo(() => new Set(fixed), [fixed]);

  return {
    arrange: orderState.arrange,
    widthOf: width.widthOf,
    isFixed: (key) => fixedSet.has(key),
    headerProps: orderState.headerProps,
    resizeProps: width.resizeProps,
  };
}
