import * as React from "react";
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, TextSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollXBar } from "@/components/ui/scroll-x";
import { useA11y } from "@/components/theme/a11y";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OverflowChip, type BreakdownRow } from "./BreakdownCard";
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

/** A value that reads as one thing — a record number or code (no spaces),
    or a date ("Oct 23, 2026"). */
const ONE_LINE = /^(\S+|[A-Z][a-z]{2} \d{1,2}, \d{4})$/;

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
  /**
   * ITS SHARE OF THE SPARE WIDTH (Pavan, 2026-11-13). Once any column in a
   * table sets it, every column takes `grow ?? 1` shares — even by default,
   * `0` keeps a column at its width (a value that can't run long), `2` gives
   * a name-plus-address column twice the room. Unset everywhere, the old
   * rule holds: a share in proportion to how far a column is wider than 120.
   */
  grow?: number;
}

export interface ListSort<K extends string> {
  key: K;
  dir: "asc" | "desc";
}

export interface ListTableProps<Row, K extends string> {
  /** A ROW ABOVE THE HEADER, inside the table's frame and outside its scroll —
   *  for the table's own tools (see `ListToolbarProps.tableToolsInto`). */
  topBar?: React.ReactNode;
  /** Every cell sits at the top of its row — for rows that grow tall with
   *  stacked lines, so the record's own cells read first. */
  alignTop?: boolean;
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
  /**
   * A BOX PER COLUMN, UNDER THE HEADERS.
   *
   * The question "where is the Halvorsen order" is asked OF a column, so it is
   * answered at the column. A single search box asks it of the whole row and
   * brings back everything that mentions the word anywhere; a popover that
   * searches one named column asks it properly but only once, so two
   * conditions meant two searches and remembering the first.
   *
   * The boxes are AND-ed, because that is what typing in two of them looks
   * like it should do. The row only exists while the reader has asked for it —
   * see `ListToolbarProps.onToggleColumnFilters` — because 40px of empty
   * inputs above every table is a permanent cost for an occasional question.
   */
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (key: K, value: string) => void;
  showColumnFilters?: boolean;
  /**
   * SEARCH BY COLUMN IN THE HEADER (Pavan, 2026-11-08) — given, a solid tab
   * slides out from the header row's left edge on hover (stays while the row
   * is open); hovering the tab spells out "Search by column".
   */
  onToggleColumnFilters?: () => void;
  /** What one record is called in a group header — "asset", "account". */
  groupNoun?: string;
  /** Unit for the summed measure the headers carry, e.g. `gal`. */
  groupUnit?: string;
  /**
   * A NESTED LAYER — the DS expandable row (`tables-layout/DataTable`,
   * Pavan, 2026-10-17). Given, the first column's cell leads with a small
   * chevron that turns down and opens this content in a full-width row
   * beneath: pinned to the visible width, WHITE (the content layer), and a
   * 2px GREEN rail that runs unbroken from the parent row's left edge into
   * it. The open parent keeps a tint and drops its bottom divider (DS ui
   * §10j).
   */
  renderExpanded?: (row: Row) => React.ReactNode;
  /** The chevron's label, e.g. `Show tanks for REQ-1115`. */
  expandLabel?: (row: Row, open: boolean) => string;
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
  columnFilters,
  onToggleColumnFilters,
  onColumnFilterChange,
  showColumnFilters = false,
  renderExpanded,
  expandLabel,
  alignTop = false,
  topBar,
}: ListTableProps<Row, K>) {
  const expandable = Boolean(renderExpanded);
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(() => new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  /* THE FRAME'S WIDTH — what the columns fill, and what a nested layer
     spans (the visible width, not the scrolled one). */
  const frame = React.useRef<HTMLDivElement>(null);
  /* THE TABLE ARRIVES FROM BELOW (Pavan, 2026-11-05) — as the board's lanes
     settle in from the right, the table rises and its rows stack up from the
     bottom one after another. Only while the view is arriving: a sort, a filter or a new page
     afterwards does not replay it. */
  const [entering, setEntering] = React.useState(true);
  /* BOTTOM ROW FIRST — the rows on screen, counted from the frame's height
     (a 40px header, 56px rows); the last one in view leads. */
  const [inView, setInView] = React.useState(14);
  React.useLayoutEffect(() => {
    const h = frame.current?.clientHeight ?? 0;
    if (h) setInView(Math.max(1, Math.ceil((h - 40) / 56)));
  }, []);
  React.useEffect(() => {
    const t = window.setTimeout(() => setEntering(false), 900);
    return () => window.clearTimeout(t);
  }, []);
  const [frameWidth, setFrameWidth] = React.useState<number | undefined>();
  React.useEffect(() => {
    if (!frame.current) return;
    const el = frame.current;
    const ro = new ResizeObserver(() => setFrameWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
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
  /* NO CHEVRON COLUMN (Pavan, 2026-10-19): the row itself opens the
     record — a click anywhere on it, or Enter on a focused row — so the
     pinned chevron cell at the end is gone from every list. `actionsKey`
     names that column so it is dropped here. */
  const visible = cols.arrange(columns.filter((c) => !hidden?.has(c.key) && c.key !== actionsKey));

  /* THE CHECKBOX COLUMN IS NOT A COLUMN. It cannot be hidden, reordered,
     resized or sorted, so it sits outside `cols` entirely and is drawn as a
     fixed 44px cell at the head of every row — the mirror of the pinned
     chevron at the tail. */
  const selectable = Boolean(selectedIds && onToggleRow);
  const ids = rows.map(rowId);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selectedIds!.has(id));
  const someSelected = selectable && ids.some((id) => selectedIds!.has(id));
  const span = visible.length + (selectable ? 1 : 0);
  /* NO EMPTY SPACE ON THE RIGHT, EVER (Pavan, 2026-10-22). Each column starts
     at the width its longest value needs (DS ui §10p); when the table is
     narrower than its frame, the spare width goes to the columns that hold
     the most — a column gets a share in proportion to how far it is wider
     than 120px, so an icon, a count or a short code stays as it is and a
     name, an address or a contact takes the room. Wider than the frame, the
     table scrolls. */
  /* RECORD NUMBERS AND DATES STAY ON ONE LINE (Pavan, 2026-10-23). At a
     bigger Text size the other cells wrap inside their column, but a value
     like "D-105370" or "Oct 23, 2026" broken in two stops reading as one, so
     its column widens by exactly what the value lacks. Measured after paint;
     it only ever grows while the text size holds, so it can't see-saw. */
  const textSize = useA11y().text;
  const [oneLine, setOneLine] = React.useState<{ at: number; need: Record<string, number> }>({ at: 0, need: {} });
  const need = oneLine.at === textSize ? oneLine.need : {};
  React.useLayoutEffect(() => {
    const root = frame.current;
    if (!root || textSize === 0) return;
    const lead = selectedIds && onToggleRow ? 1 : 0;
    const next: Record<string, number> = { ...need };
    let grew = false;
    root.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((tr) => {
      if (tr.children.length !== visible.length + lead) return;
      visible.forEach((c, i) => {
        const td = tr.children[i + lead] as HTMLElement;
        td.querySelectorAll<HTMLElement>(".truncate").forEach((el) => {
          if (!ONE_LINE.test(el.textContent?.trim() ?? "")) return;
          el.dataset.oneLine = "";
          const short = el.scrollWidth - el.clientWidth;
          if (short <= 1) return;
          const want = Math.ceil(td.offsetWidth + short);
          if (want > (next[c.key] ?? 0)) {
            next[c.key] = want;
            grew = true;
          }
        });
      });
    });
    if (grew || oneLine.at !== textSize) setOneLine({ at: textSize, need: next });
    /* Re-measured when the text size, the rows or the columns change. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textSize, rows, frameWidth, visible.map((c) => c.key).join(), oneLine]);
  const base = visible.map((c) => Math.max(cols.widthOf(c), need[c.key] ?? 0));
  const widths = (() => {
    const lead = selectable ? 44 : 0;
    const spare = (frameWidth ?? 0) - lead - base.reduce((a, b) => a + b, 0);
    if (spare <= 0) return base;
    const weight = visible.some((c) => c.grow !== undefined)
      ? visible.map((c) => Math.max(0, c.grow ?? 1))
      : base.map((w) => Math.max(0, w - 120));
    const total = weight.reduce((a, b) => a + b, 0) || base.reduce((a, b) => a + b, 0);
    const share = total === 0 ? base.map(() => 0) : (weight.some((w) => w > 0) ? weight : base).map((w) => w / total);
    const out = base.map((w, i) => Math.floor(w + spare * share[i]));
    /* What rounding left goes on the widest column, so the edge lands exactly. */
    const left = (frameWidth ?? 0) - lead - out.reduce((a, b) => a + b, 0);
    const widest = out.indexOf(Math.max(...out));
    if (widest >= 0) out[widest] += Math.max(0, left);
    return out;
  })();

  const body = (
    <div
      ref={frame}
      data-view-box={topBar ? undefined : ""}
      data-view-table=""
      data-entering={entering ? "" : undefined}
      className={cn(
        "overflow-auto [&_[data-slot=table-container]]:overflow-visible",
        "min-h-0 flex-1"
      )}
    >
      <Table style={{ tableLayout: "fixed", width: widths.reduce((a, b) => a + b, selectable ? 44 : 0) }}>
        <colgroup>
          {selectable && <col style={{ width: "44px" }} />}
          {visible.map((c, i) => (
            <col key={c.key} style={{ width: `${widths[i]}px` }} />
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
              /* THE SORTED COLUMN (Pavan, 2026-10-21): a real arrow, not a
                 chevron, on a darker grey header; its cells a very light grey. */
              const SortIcon = !active
                ? ChevronsUpDown
                : sort.dir === "asc"
                  ? ArrowUp
                  : ArrowDown;
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
                          active ? "opacity-100" : "opacity-50"
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
          {showColumnFilters && onColumnFilterChange && (
            /* THE SECOND HEADER ROW, not a first body row: it scrolls and
               sticks with the headers it belongs to, and the table's own
               `<thead>` is what tells a screen reader these are not records. */
            /* THE BAND IS QUIETER THAN THE HEADER IT SITS UNDER. At the same
               fill the two read as one 80px header, and the boxes looked like
               part of the column names rather than something you do to them.
               On the content layer's own surface the strip recedes and the
               inputs are the only thing in it with an edge — which is right,
               because they are the only thing in it you can touch. */
            <TableRow className="h-11 hover:bg-transparent">
              {selectable && (
                <TableHead className="border-b border-fp-outline-1 bg-fp-surface-1b px-3" />
              )}
              {visible.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "border-b border-fp-outline-1 bg-fp-surface-1b px-2",
                    col.key === actionsKey && "sticky right-0 z-30"
                  )}
                >
                  {col.label ? (
                    <Input
                      value={columnFilters?.[col.key] ?? ""}
                      onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                      /* THE PLACEHOLDER GOES WHERE IT WOULD BE CUT. A column
                         narrow enough to clip the word shows an empty box
                         instead — "Filte" reads as a bug, and the row of
                         identical boxes has already said what they are. */
                      placeholder={(columnWidths?.[col.key] ?? col.width) >= 96 ? "Filter…" : ""}
                      aria-label={`Filter by ${col.label}`}
                      /* `data-no-row-open` keeps a click in the box from being
                         read as a click on the row it sits above. */
                      data-no-row-open
                      /* `rounded-md` and no shadow — the DS's field shape.
                         A pill is the chip vocabulary, and a raised field in a
                         strip of fields lifts a row of boxes off a surface
                         they belong to. */
                      className="h-7 rounded-md px-2.5 text-xs shadow-none"
                    />
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          )}
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
          ).map((node, rowIndex) =>
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
            <React.Fragment key={node.id}>
            <TableRow
              style={{ "--fp-row": Math.max(inView - 1 - rowIndex, 0) } as React.CSSProperties}
              className={cn(
                "fp-row-in group/row h-14",
                onOpenRow && "cursor-pointer outline-none focus-visible:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                /* The open parent keeps a tint and drops its divider, so the
                   rail runs on into its layer (DS). */
                expanded.has(node.id) && "border-b-0 bg-fp-row-hover hover:bg-fp-row-hover"
              )}
              data-state={selectedIds?.has(node.id) ? "selected" : undefined}
              data-expanded={expanded.has(node.id) ? "true" : undefined}
              /* THE ROW IS THE CONTROL — reachable by keyboard, Enter or
                 Space opens it, and it says what it opens. */
              tabIndex={onOpenRow ? 0 : undefined}
              aria-label={onOpenRow ? openLabel(node.row) : undefined}
              onKeyDown={(e) => {
                if (!onOpenRow || e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenRow(node.row);
                }
              }}
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
                <TableCell className={cn("px-3", expanded.has(node.id) && "relative before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-status-success/70")}>
                  <Checkbox
                    checked={selectedIds!.has(node.id)}
                    onCheckedChange={() => onToggleRow!(node.id)}
                    aria-label={`Select ${openLabel(node.row).replace(/^Open /, "")}`}
                  />
                </TableCell>
              )}
              {visible.map((col, ci) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    "px-3",
                    alignTop && "align-top py-3",
                    /* THE RAIL STARTS ON THE OPEN PARENT'S FIRST CELL. */
                    ci === 0 && !selectable && expanded.has(node.id) && "relative before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-status-success/70",
                    sort?.key === col.key && "fp-sorted-cell",
                    col.key === actionsKey &&
                      /* THE PINNED CELL WEARS THE ROW'S STATE — hover, an open
                         nested layer, selection — so it never reads as a
                         white box at the end of a tinted row. */
                      "sticky right-0 z-10 bg-fp-surface-1b before:pointer-events-none before:absolute before:inset-0 group-hover/row:before:bg-fp-row-hover group-data-[expanded=true]/row:before:bg-fp-row-hover group-data-[state=selected]/row:before:bg-fp-row-selected"
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
                    ) : expandable && ci === 0 ? (
                      /* THE CHEVRON LEADS THE FIRST CELL (DS) — not a column. */
                      <span className="flex min-w-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(node.id)}
                          aria-expanded={expanded.has(node.id)}
                          aria-label={expandLabel?.(node.row, expanded.has(node.id)) ?? (expanded.has(node.id) ? "Collapse row" : "Expand row")}
                          className="-ml-1 shrink-0 rounded p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <ChevronRight className={cn("size-4 transition-transform", expanded.has(node.id) && "rotate-90")} />
                        </button>
                        <span className="min-w-0">{renderCell(node.row, col.key)}</span>
                      </span>
                    ) : (
                      renderCell(node.row, col.key)
                    )}
                  </span>
                </TableCell>
              ))}
              
            </TableRow>
            {expandable && expanded.has(node.id) && (
              <TableRow className="hover:bg-transparent data-[state=selected]:bg-transparent">
                {/* THE LAYER IS WHITE (the content layer), end to end, pinned to
                    the visible width so its columns stay put. Its rail is the
                    parent's — the same 2px strip at the same left edge, so the
                    two meet without a step (Pavan, 2026-10-17). */}
                <TableCell colSpan={span} className="bg-fp-surface-1b p-0">
                  <div className="sticky left-0 bg-fp-surface-1b before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-status-success/70" style={{ width: frameWidth }}>
                    {renderExpanded!(node.row)}
                  </div>
                </TableCell>
              </TableRow>
            )}
            </React.Fragment>
              )
            )}
        </TableBody>
      </Table>
    </div>
  );
  const columnSearchTab = onToggleColumnFilters ? (
    <ColumnSearchTab open={Boolean(showColumnFilters)} onToggle={onToggleColumnFilters} flush={Boolean(topBar)} />
  ) : null;
  /* THE FRAME — the table, the column-search tab over it, and the sideways
     scrollbar under it (scroll-x.tsx). */
  const framed = (cls: string) => (
    <div className={cn("group/frame relative flex flex-col", cls)}>
      {body}
      <ScrollXBar target={frame} />
      {columnSearchTab}
    </div>
  );
  if (!topBar) return framed("h-full overflow-hidden rounded-md border border-border");
  return (
    <div data-view-box="" data-view-table="" className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      <div className="shrink-0 border-b border-fp-outline-1 bg-fp-surface-1b">{topBar}</div>
      {framed("flex min-h-0 flex-1 flex-col")}
    </div>
  );
}

/**
 * SEARCH BY COLUMN, AT THE HEADER'S RIGHT EDGE (Pavan, 2026-11-08) — over the
 * table, not in a column, so it holds the right edge however far the table
 * scrolls sideways. Hidden until the header row is hovered (or the search row
 * is open); it slides in from the right, the header row's height, above every
 * layer of the header; hovered, it spells itself out. THE GREY: the header
 * mixed 12% toward the ink — about five steps darker than the header in light,
 * the same distance in dark, from two tokens.
 *
 * Put it inside a `group/frame relative` box that also holds the table. Every
 * table with column search uses it (Pavan, 2026-11-12) — ListTable and the
 * hand-built Recurring tables.
 */
export function ColumnSearchTab({ open, onToggle, flush = true }: { open: boolean; onToggle: () => void; flush?: boolean }) {
  return (
    <div className={cn("pointer-events-none absolute right-0 z-50 flex h-10 w-60 justify-end overflow-hidden", flush ? "top-0" : "top-px right-px")}>
      <button
        type="button"
        aria-label="Search by column"
        aria-pressed={open}
        onClick={onToggle}
        className={cn(
          "group/cs flex h-full items-center bg-[color-mix(in_oklab,var(--fp-table-header),var(--foreground)_12%)] px-3 text-xs font-medium text-foreground outline-none transition-[translate,opacity] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
          open
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "translate-x-full opacity-0 group-has-[thead:hover]/frame:pointer-events-auto group-has-[thead:hover]/frame:translate-x-0 group-has-[thead:hover]/frame:opacity-100 hover:pointer-events-auto hover:translate-x-0 hover:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-x-0 focus-visible:opacity-100"
        )}
      >
        <TextSearch className="size-3.5 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap transition-[max-width,margin] duration-200 ease-out group-hover/cs:ml-1.5 group-hover/cs:max-w-32 group-focus-visible/cs:ml-1.5 group-focus-visible/cs:max-w-32">
          Search by column
        </span>
      </button>
    </div>
  );
}

/** Primary over a muted secondary — the DS two-line cell. */
/**
 * THE PART OF THE CELL THAT ANSWERED THE FILTER, marked.
 *
 * Reordering the cell so the matched value comes first says WHICH value; this
 * says which part of it. On a column of near-identical names — Clear Diesel #2
 * beside Dyed Diesel — "dies" fetches both and the eye still has to work out
 * what it typed. A mark puts the answer where the question was asked.
 *
 * THE BRAND, AT A QUARTER. The DS binds no meaning to a colour until a usage
 * rule does, and this is the rule: brand is already "the thing you have
 * pointed at" — the active tab, the primary act — and a search match is the
 * same claim about a word. A quarter keeps it a tint under body text rather
 * than a block of fill with letters on top.
 */
export function Hit({
  text,
  q,
}: {
  text: string;
  /**
   * One needle or several. The list search and a column's own filter box are
   * both live at once and both narrowed this row, so both are marked: a reader
   * who typed in two places should see both answers, not whichever the cell
   * happened to be told about.
   */
  q?: string | (string | undefined)[];
}) {
  const needles = (Array.isArray(q) ? q : [q])
    .map((n) => n?.trim().toLowerCase())
    .filter((n): n is string => Boolean(n));
  if (needles.length === 0) return <>{text}</>;

  /* EVERY RUN ANY NEEDLE HITS, merged. Two needles that overlap — "diesel" in
     the search box and "dies" in the column — would otherwise mark the same
     letters twice and split the word into fragments. */
  const hay = text.toLowerCase();
  const spans: [number, number][] = [];
  for (const n of needles) {
    let at = hay.indexOf(n);
    while (at !== -1) {
      spans.push([at, at + n.length]);
      at = hay.indexOf(n, at + 1);
    }
  }
  if (spans.length === 0) return <>{text}</>;
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [from, to] of spans) {
    const last = merged[merged.length - 1];
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }

  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [from, to] of merged) {
    if (from > at) parts.push(text.slice(at, from));
    parts.push(
      <mark
        key={`${from}-${to}`}
        className="rounded-xs bg-brand/25 font-medium text-foreground"
      >
        {text.slice(from, to)}
      </mark>
    );
    at = to;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

export function TwoLineCell({
  title,
  description,
  q,
}: {
  title: string;
  description: string;
  /** Filter text for this column — the matched run is marked. */
  q?: string | (string | undefined)[];
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">
        <Hit text={title} q={q} />
      </span>
      <span className="truncate text-xs text-muted-foreground">
        <Hit text={description} q={q} />
      </span>
    </div>
  );
}

/**
 * First value plus a `+N` chip for the rest. The chip opens the shared
 * breakdown card ON CLICK (Pavan, 2026-10-14 — one way everywhere; was a
 * hover list). The count is the information here; the first value is only
 * an anchor. Rows may carry a sub-line and a figure (`rows`).
 */
export function OverflowList({
  values,
  label,
  rows,
}: {
  values: string[];
  label: string;
  /** Richer rows for the card — default: one per value. */
  rows?: BreakdownRow[];
}) {
  if (values.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const [first, ...rest] = values;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-sm text-foreground">{first}</span>
      {rest.length > 0 && (
        <OverflowChip
          count={rest.length}
          label={`Show all ${values.length} ${label}`}
          /* WIDER WHEN ROWS CARRY DETAIL — a sub-line and a figure. */
          width={rows ? 360 : undefined}
          card={{
            title: `All ${label} (${values.length})`,
            rows: rows ?? values.map((v) => ({ label: v })),
          }}
        />
      )}
    </div>
  );
}
