import * as React from "react";
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  GroupHeaderRow,
  TableColumnHeader,
  useTableColumns,
  type GroupNode,
} from "@/components/tables-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Generic list table — the chrome only, with cells supplied by the caller.
 *
 * The chrome is the DS DataTable's (Figma 28165:3758) and is copied from
 * FuelOrdersTable rather than re-derived, so the three lists are identical
 * where they should be: outer stroke on `border`, sticky Surface-1a header with
 * a bottom hairline so rows scroll under it, 40px header row, 56px body rows,
 * px-3 cells, the asc → desc → unsorted sort glyph cycle, and a pinned trailing
 * actions column whose opaque fill re-applies the row's hover/selected tint as a
 * `before` overlay (otherwise the pinned cell hides it).
 *
 * FuelOrdersTable is deliberately NOT refactored onto this. Its Product and Tags
 * cells carry measured-width truncation with a ResizeObserver, which nothing
 * else needs; moving it would be churn without benefit. This exists so Asset
 * Orders and Customers do not each re-copy the chrome a third and fourth time.
 *
 * DS FOLLOW-UP: this shell, `TwoLineCell` and `OverflowBadge` are not
 * screen-specific. They belong beside `tables-layout/DataTable` once the DS
 * version can take a column set and a cell renderer as props.
 */

export interface ListColumn<K extends string> {
  key: K;
  label: string;
  width: number;
  sortable?: boolean;
  /**
   * `right` for money and for counts that are compared down the column —
   * the digits line up and the eye reads magnitude without reading numbers.
   * `center` for a short count that is READ rather than compared, where a
   * right edge miles from the header looks like a mistake.
   */
  align?: "left" | "right" | "center";
}

export interface ListSort<K extends string> {
  key: K;
  dir: "asc" | "desc";
}

export interface ListTableProps<Row, K extends string> {
  rows: Row[];
  columns: ListColumn<K>[];
  hidden?: Set<K>;
  sort: ListSort<K> | null;
  onSort: (key: K) => void;
  /** Stable identity for the React key. */
  rowId: (row: Row) => string;
  /** Cell content per column. `actions` is supplied by this component. */
  renderCell: (row: Row, key: K) => React.ReactNode;
  /** Opens the row's side sheet, via the pinned chevron. */
  onOpenRow?: (row: Row) => void;
  /** Accessible label for that chevron, e.g. `Open order 4592866`. */
  openLabel: (row: Row) => string;
  /** Which column key holds the pinned chevron. */
  actionsKey: K;
  /**
   * SELECTION IS OPT-IN. A list with nothing to do to a selection should not
   * spend 44px on a checkbox column that leads nowhere, so the column exists
   * only when the handlers for it do — the same rule the bulk bar follows.
   */
  selectedIds?: ReadonlySet<string>;
  onToggleRow?: (id: string) => void;
  /** `next` is the state the header checkbox is moving TO, so the caller does
   *  not have to re-derive it from the current selection. */
  onToggleAll?: (next: boolean) => void;
  /**
   * Skeleton rows in place of content. Not a spinner: a list that collapses to
   * a spinner loses its own height, and the page jumps when the rows land.
   */
  loading?: boolean;
  skeletonRows?: number;
  /**
   * Column order, as keys. Supply with `onReorderColumns` to keep it in a saved
   * view; leave both off and the table remembers it for the session only. The
   * pinned chevron column never moves.
   */
  columnOrder?: string[];
  onReorderColumns?: (next: string[]) => void;
  /** Reader-set column widths in px, by key. Same dual-mode as the order. */
  columnWidths?: Record<string, number>;
  onResizeColumns?: (next: Record<string, number>) => void;
  /**
   * Grouped render list from `groupRows`. Omitted, the table renders `rows`
   * flat — which is what every ungrouped list does.
   */
  nodes?: GroupNode<Row>[];
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroupCollapse?: (id: string) => void;
  /** What one record is called in a group header — "asset", "account". */
  groupNoun?: string;
  /** Unit for the summed measure the headers carry, e.g. `gal`. */
  groupUnit?: string;
}

export function ListTable<Row, K extends string>({
  rows,
  columns,
  hidden,
  sort,
  onSort,
  rowId,
  renderCell,
  onOpenRow,
  openLabel,
  actionsKey,
  selectedIds,
  onToggleRow,
  onToggleAll,
  loading = false,
  skeletonRows = 10,
  nodes,
  collapsedGroups,
  onToggleGroupCollapse,
  groupNoun = "record",
  groupUnit = "",
  columnOrder,
  onReorderColumns,
  columnWidths,
  onResizeColumns,
}: ListTableProps<Row, K>) {
  /* THE PINNED CHEVRON IS THE FRAME, not a column: it is how a row is opened
     and it is stuck to the right edge so it survives a sideways scroll. It
     does not move, and nothing can be dropped past it. */
  /* Columns move and resize because the DS header does it — see
     `useTableColumns`. Nothing here but which column is structure. */
  const cols = useTableColumns({
    keys: React.useMemo(() => columns.map((c) => c.key), [columns]),
    fixed: React.useMemo(() => [actionsKey], [actionsKey]),
    order: columnOrder,
    onOrderChange: onReorderColumns,
    widths: columnWidths,
    onWidthsChange: onResizeColumns,
  });
  const visible = cols.arrange(columns.filter((c) => !hidden?.has(c.key)));

  /* THE CHECKBOX COLUMN IS NOT A COLUMN. It cannot be hidden, reordered,
     resized or sorted, so it sits outside `cols` entirely and is drawn as a
     fixed 44px cell at the head of every row — the mirror of the pinned
     chevron at the tail. */
  const selectable = Boolean(selectedIds && onToggleRow);
  const ids = rows.map(rowId);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selectedIds!.has(id));
  const someSelected = selectable && ids.some((id) => selectedIds!.has(id));
  const span = visible.length + (selectable ? 1 : 0);

  return (
    <div className="h-full overflow-auto rounded-md border border-border [&_[data-slot=table-container]]:overflow-visible">
      <Table style={{ tableLayout: "fixed" }}>
        <colgroup>
          {selectable && <col style={{ width: "44px" }} />}
          {visible.map((c) => (
            <col key={c.key} style={{ width: `${cols.widthOf(c)}px` }} />
          ))}
        </colgroup>
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="h-10">
            {selectable && (
              <TableHead className="border-b border-fp-outline-1 bg-fp-table-header px-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => onToggleAll?.(!allSelected)}
                  aria-label={allSelected ? "Clear selection" : "Select all rows on this page"}
                />
              </TableHead>
            )}
            {visible.map((col) => {
              const active = sort?.key === col.key;
              const SortIcon = !active
                ? ChevronsUpDown
                : sort.dir === "asc"
                  ? ChevronUp
                  : ChevronDown;
              return (
                <TableColumnHeader
                  key={col.key}
                  cols={cols}
                  col={col}
                  aria-sort={
                    active
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "border-b border-fp-outline-1 bg-fp-table-header px-3 text-xs font-medium text-muted-foreground",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.key === actionsKey && "sticky right-0 z-30"
                  )}
                >
                  {col.label && col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      aria-label={`Sort by ${col.label}`}
                      className={cn(
                        "inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                        active && "text-foreground"
                      )}
                    >
                      {col.label}
                      <SortIcon
                        className={cn(
                          "size-3.5",
                          active ? "opacity-100" : "opacity-70"
                        )}
                      />
                    </button>
                  ) : col.label ? (
                    <span>{col.label}</span>
                  ) : null}
                </TableColumnHeader>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={`sk-${i}`} className="h-14">
                  {selectable && (
                    <TableCell className="px-3">
                      <Skeleton className="size-4 rounded-[4px]" />
                    </TableCell>
                  )}
                  {visible.map((col) => (
                    <TableCell key={col.key} className="px-3">
                      {col.key === actionsKey ? null : (
                        <Skeleton
                          className="h-4"
                          /* Widths vary per column and per row so the block
                             reads as text arriving, not as a loading bar. */
                          style={{ width: `${45 + ((i * 17 + col.key.length * 11) % 45)}%` }}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : (nodes ??
            rows.map((row) => ({
              kind: "row" as const,
              id: rowId(row),
              depth: 0,
              row,
            }))
          ).map((node) =>
            node.kind === "group" ? (
              <GroupHeaderRow
                key={node.id}
                colSpan={span}
                depth={node.depth}
                label={node.label}
                dimLabel={node.dimLabel}
                count={node.count}
                measure={node.measure}
                unit={groupUnit}
                noun={groupNoun}
                collapsed={Boolean(collapsedGroups?.has(node.id))}
                onToggle={() => onToggleGroupCollapse?.(node.id)}
              />
            ) : (
            /* THE WHOLE ROW OPENS THE RECORD.
               The chevron stays — it is where the eye goes to learn that a row
               CAN be opened, and it is the only part of a 1,400px row a
               keyboard can reach. But making it the only target means a reader
               who has just finished reading a row at the far left has to travel
               the width of the table to act on what they read, and clicking the
               row is what everybody tries first anyway.

               CLICKS THAT LAND ON SOMETHING ELSE ARE NOT ROW CLICKS. A
               checkbox, the chevron, a link inside a cell — each is its own
               act, and an ancestor handler that fired as well would make one
               press do two things. `closest` on the real target is how the row
               tells the difference; a text selection dragged across a cell is
               not a click either. */
            <TableRow
              key={node.id}
              className={cn("group/row h-14", onOpenRow && "cursor-pointer")}
              data-state={selectedIds?.has(node.id) ? "selected" : undefined}
              onClick={(e) => {
                if (!onOpenRow) return;
                const t = e.target as HTMLElement | null;
                if (t?.closest("button,a,input,label,[role='checkbox'],[data-no-row-open]"))
                  return;
                if (window.getSelection()?.toString()) return;
                onOpenRow(node.row);
              }}
            >
              {selectable && (
                <TableCell className="px-3">
                  <Checkbox
                    checked={selectedIds!.has(node.id)}
                    onCheckedChange={() => onToggleRow!(node.id)}
                    aria-label={`Select ${openLabel(node.row).replace(/^Open /, "")}`}
                  />
                </TableCell>
              )}
              {visible.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    "px-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.key === actionsKey &&
                      "sticky right-0 z-10 bg-fp-surface-1b before:pointer-events-none before:absolute before:inset-0 group-hover/row:before:bg-fp-row-hover group-data-[state=selected]/row:before:bg-fp-row-selected"
                  )}
                >
                  <span className={cn(col.key === actionsKey && "relative")}>
                    {col.key === actionsKey ? (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={openLabel(node.row)}
                          onClick={() => onOpenRow?.(node.row)}
                        >
                          <ChevronRight />
                        </Button>
                      </div>
                    ) : (
                      renderCell(node.row, col.key)
                    )}
                  </span>
                </TableCell>
              ))}
            </TableRow>
              )
            )}
        </TableBody>
      </Table>
    </div>
  );
}

/** Primary over a muted secondary — the DS two-line cell. */
export function TwoLineCell({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{description}</span>
    </div>
  );
}

/**
 * First value plus a `+N` for the rest, the remainder behind a hover card. The
 * same idiom the Fuel Orders Product and Tags cells use, except the visible
 * count is fixed at one rather than measured — for these columns the COUNT is
 * the information and the first value is only an anchor.
 */
export function OverflowList({
  values,
  label,
}: {
  values: string[];
  label: string;
}) {
  if (values.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const [first, ...rest] = values;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-sm text-foreground">{first}</span>
      {rest.length > 0 && (
        <HoverCard openDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              aria-label={`Show all ${values.length} ${label}`}
              className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Badge variant="secondary" className="tabular-nums">
                +{rest.length}
              </Badge>
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="start" className="w-auto max-w-72 p-2">
            <div className="flex flex-col gap-1">
              {values.map((v) => (
                <span key={v} className="text-sm text-foreground">
                  {v}
                </span>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}
