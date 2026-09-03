import * as React from "react";
import {
  columnsHiddenByGrouping,
  groupRows,
  type GroupDim,
} from "./grouping";

/*
  Everything a list screen needs to be groupable, in one hook — so every list
  groups identically instead of near-copies drifting apart.

  It owns the two pieces of state (the ordered dimension stack and which groups
  are collapsed) and derives the rest, including the two behaviours that are
  easy to get subtly wrong per screen:

  • PAGINATION IS SUSPENDED WHILE GROUPED. At a page of rows a group straddles
    the boundary and its header claims a count and a total for records that are
    not on screen. Grouped, the hook hands back every row and the screen swaps
    its pagination footer for `GroupedListFooter`.

  • THE GROUPED COLUMN IS HIDDEN. A column that repeats its own group header on
    every row is dead width. `effectiveHidden` merges those into whatever the
    user hid by hand, without touching that set — so clearing the grouping
    restores exactly the columns they chose.
*/

export interface UseGroupingOptions<Row, K extends string> {
  /** Every dimension this list offers. */
  dimensions: GroupDim<Row>[];
  /** Filtered and sorted rows — the whole list, not a page. */
  rows: Row[];
  rowId: (row: Row) => string;
  /** The one column that sums to something true for this list. */
  measureOf: (row: Row) => number;
  /** Columns the user hid by hand. */
  hiddenColumns: Set<K>;
  page: number;
  pageSize: number;
}

export function useGrouping<Row, K extends string>({
  dimensions,
  rows,
  rowId,
  measureOf,
  hiddenColumns,
  page,
  pageSize,
}: UseGroupingOptions<Row, K>) {
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const dims = React.useMemo(
    () =>
      groupBy
        .map((k) => dimensions.find((d) => d.key === k))
        .filter((d): d is GroupDim<Row> => Boolean(d)),
    [groupBy, dimensions]
  );
  const grouped = dims.length > 0;

  /* A key with no dimension behind it holds a slot in the stack and shows in
     the menu's count while producing no groups — which is what happens when a
     list's dimensions change under a saved or restored grouping. `dims` already
     drops it; this makes the value handed back agree. */
  const activeKeys = React.useMemo(() => dims.map((d) => d.key), [dims]);

  const visibleRows = React.useMemo(
    () => (grouped ? rows : rows.slice((page - 1) * pageSize, page * pageSize)),
    [rows, page, pageSize, grouped]
  );

  const groups = React.useMemo(
    () => groupRows(visibleRows, dims, { rowId, measureOf, collapsed }),
    [visibleRows, dims, collapsed, rowId, measureOf]
  );

  const effectiveHidden = React.useMemo(() => {
    if (!grouped) return hiddenColumns;
    const next = new Set(hiddenColumns);
    for (const key of columnsHiddenByGrouping(dims)) next.add(key as K);
    return next;
  }, [hiddenColumns, dims, grouped]);

  /** Menu shape — the engine's dimensions minus the parts it doesn't need. */
  const menuDimensions = React.useMemo(
    () => dimensions.map((d) => ({ key: d.key, label: d.label, multi: d.multi })),
    [dimensions]
  );

  const setGrouping = (next: string[]) => {
    setGroupBy(next);
    // Collapse state is keyed by group path, and every path changes when the
    // dimensions do. Keeping it would collapse arbitrary new groups.
    setCollapsed(new Set());
  };

  const toggleGroupCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed =
    groups.groupIds.length > 0 &&
    groups.groupIds.every((id) => collapsed.has(id));

  return {
    groupBy: activeKeys,
    setGrouping,
    grouped,
    groups,
    collapsed,
    toggleGroupCollapse,
    expandAll: () => setCollapsed(new Set()),
    collapseAll: () => setCollapsed(new Set(groups.groupIds)),
    allCollapsed,
    visibleRows,
    effectiveHidden,
    menuDimensions,
    total: React.useMemo(
      () => rows.reduce((n, r) => n + measureOf(r), 0),
      [rows, measureOf]
    ),
  };
}
