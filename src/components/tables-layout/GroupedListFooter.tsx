import { ChevronsDownUp, ChevronsUpDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMeasure } from "./grouping";

/*
  Footer for a grouped list — what stands in for pagination.

  Row pagination and grouping contradict each other: at 25 rows a page, a group
  straddles the boundary and its header claims a count and a total for orders
  that are not on screen. So while grouped the list scrolls whole and this
  footer reports the shape of it instead of a page position.

  It keeps the same left/centre/right skeleton as `TablePagination` — count on
  the left, controls in the middle, nothing claimed on the right — so the
  bottom of the screen does not jump when grouping turns on.
*/

export interface GroupedListFooterProps {
  groupCount: number;
  rowCount: number;
  /** What one record is called — "order", "asset", "account". */
  noun: string;
  /** Total across the list, in the same measure the headers carry. Omit when
   *  the list has nothing that sums. */
  total?: number;
  unit?: string;
  /**
   * A multi-value dimension is active, so the group counts add up to more than
   * `rowCount`. Said out loud rather than left for someone to discover.
   */
  overCounts: boolean;
  allCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function GroupedListFooter({
  groupCount,
  rowCount,
  noun,
  total,
  unit,
  overCounts,
  allCollapsed,
  onExpandAll,
  onCollapseAll,
}: GroupedListFooterProps) {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          {plural(groupCount, "group")} · {plural(rowCount, noun)}
          {total !== undefined && ` · ${formatMeasure(total, unit ?? "")}`}
        </span>
        {overCounts && (
          <span className="flex items-center gap-1.5 text-xs">
            <Layers className="size-3.5" />
            {noun}s appear in every group they match, so the group counts add up
            to more than {rowCount}
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={allCollapsed ? onExpandAll : onCollapseAll}
      >
        {allCollapsed ? <ChevronsUpDown /> : <ChevronsDownUp />}
        {allCollapsed ? "Expand all" : "Collapse all"}
      </Button>
    </div>
  );
}
