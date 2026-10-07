import * as React from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CodeDisc, type CodeDiscTone } from "@/components/ui/code-disc";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BreakdownCard } from "./BreakdownCard";
import { FUEL_ORDER_COLUMNS } from "./data";
import type {
  FuelOrder,
  FuelOrderColumnDef,
  FuelOrderColumnKey,
  FuelOrderStatus,
  OrderTypeCode,
  ProductQty,
  PlannedAt,
  SortState,
  TwoLine as TwoLineData,
} from "./types";
import {
  GroupHeaderRow,
  TableColumnHeader,
  useTableColumns,
  type GroupNode,
  groupSelectionState,
} from "@/components/tables-layout";
import { statusTones } from "./statusKind";

/** Structure, not content — see `useColumnOrder` in the table below. */
const FIXED_COLUMNS = ["select", "actions"];

const QTY_FMT = new Intl.NumberFormat("en-US");

/*
  The two mappings below are ALL this screen owns about type and status. The
  rendering lives in the DS (`CodeDisc`, `StatusChip`); the DS ships hues and
  channels and binds no meaning to them, so declaring the meaning is the
  application's job. This is the same split the DS's own table uses via
  `statusTone` in tables-layout/data.ts.
*/

/** Order type → pastel hue. */
export const TYPE_TONE: Record<OrderTypeCode, CodeDiscTone> = {
  D: "pastel-blue",
  E: "pastel-amber",
};

/** Order status → colour channel. Exported so the map view reads a status the
 *  same way the table does rather than keeping a second copy of the mapping. */
export const STATUS_TONE: Record<FuelOrderStatus, StatusTone> = statusTones({
  /* Waiting on a dispatcher to schedule it. */
  Requested: "caution",
  /* True, and asks nothing — not finished. */
  Scheduled: "info",
  Dispatched: "info",
  Delivered: "success",
  /* Not a warning — grey, never red. */
  Cancelled: "neutral",
});

/**
 * WHAT EACH COLUMN PRINTS, as text a header box can match — the same rule as
 * `brokerColumnText` in 3PL: a box under a header matches what is written
 * above the rows beneath it. Lists match every value, not only the ones the
 * cell has room for — the rest are one hover away behind its `+N`.
 */
export function fuelOrderColumnText(r: FuelOrder, key: FuelOrderColumnKey): string {
  switch (key) {
    case "order":
      return r.orderNo;
    case "type":
      return `${r.type.code} ${r.type.label}`;
    case "customer":
      return `${r.customer.title} ${r.customer.description}`;
    case "products":
      return r.products.map((p) => p.name).join(" ");
    case "qtyGal":
      return `${QTY_FMT.format(r.qtyGal)} gal`;
    case "date":
      return `${r.date.title} ${r.date.description}`;
    case "planned":
      return r.planned ? `${r.planned.date} ${r.planned.time}` : "";
    case "status":
      return r.status;
    case "driver":
      return r.driver ? r.driver.name : "Unassigned";
    case "tags":
      return r.tags.join(" ");
    default:
      return "";
  }
}

function TwoLine({ title, description }: TwoLineData) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{description}</span>
    </div>
  );
}

/** Planned date over planned time. Em-dash when nothing is planned yet. */
function PlannedCell({ planned }: { planned: PlannedAt | null }) {
  if (!planned) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">{planned.date}</span>
      <span className="truncate text-xs tabular-nums text-muted-foreground">
        {planned.time}
      </span>
    </div>
  );
}

/**
 * Product cell — comma-separated names, truncated to whatever the column can
 * actually hold, with the remainder collapsed into a "+N" chip that reveals the
 * full list on hover.
 *
 * Width-driven rather than a fixed count: the column is a fixed 220px but names
 * run from "123" to "200* Diesel Onroad clear", so any fixed count either wastes
 * the cell or overflows it. An invisible sibling measures the real joined string
 * (and the real chip) so the fit is exact rather than estimated, and the count is
 * recomputed whenever the cell resizes. `truncate` on the visible span is the
 * safety net if a measurement is ever momentarily stale.
 */
function ProductCell({ products }: { products: ProductQty[] }) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = React.useState(products.length);

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const probe = textRef.current;
    const measure = measureRef.current;
    if (!row || !probe || !measure) return;

    const names = products.map((p) => p.name);

    const compute = () => {
      const avail = row.clientWidth;
      if (!avail) return;
      // The chip is only present when something is actually hidden; measure the
      // real element (its width changes with the digit count) plus the flex gap.
      const chip = measure.lastElementChild as HTMLElement | null;
      const chipW = chip ? chip.offsetWidth + 4 : 0;

      // Walk down from "all of them" to the largest prefix that fits.
      let fit = 1;
      for (let k = names.length; k >= 1; k--) {
        probe.textContent = names.slice(0, k).join(", ");
        const needed = probe.offsetWidth + (k < names.length ? chipW : 0);
        if (needed <= avail) {
          fit = k;
          break;
        }
      }
      setVisible(fit);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    return () => ro.disconnect();
  }, [products]);

  const hidden = products.length - visible;

  return (
    <div
      ref={rowRef}
      className="relative flex min-w-0 items-center gap-1 overflow-hidden"
    >
      <span className="truncate text-sm text-foreground">
        {products
          .slice(0, visible)
          .map((p) => p.name)
          .join(", ")}
      </span>

      {hidden > 0 && (
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              aria-label={`Show all ${products.length} products`}
              className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Badge variant="outline" className="cursor-pointer tabular-nums">
                +{hidden}
              </Badge>
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="start" side="top" className="w-[260px]">
            <BreakdownCard
              title={`All products (${products.length})`}
              rows={products.map((p) => ({ label: p.name }))}
            />
          </HoverCardContent>
        </HoverCard>
      )}

      {/* Measurement only — never painted, never hit-tested, out of the a11y tree. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-1 whitespace-nowrap"
      >
        <span ref={textRef} className="text-sm" />
        <Badge variant="outline" className="tabular-nums">
          +{Math.max(1, products.length - 1)}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Tags cell — badges, as many as genuinely fit, remainder behind a "+N" chip.
 *
 * Same measured approach as ProductCell but measuring BADGES rather than a
 * joined string, and capped at two even when more would fit: a row of tags is
 * scannable at two and becomes noise past that.
 */
const TAGS_MAX = 2;

function TagsCell({ tags }: { tags: string[] }) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(Math.min(tags.length, TAGS_MAX));

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure || tags.length === 0) return;

    const compute = () => {
      const avail = row.clientWidth;
      if (!avail) return;
      const kids = [...measure.children] as HTMLElement[];
      const badges = kids.slice(0, tags.length);
      const chip = kids[tags.length];
      const chipW = chip ? chip.offsetWidth + 4 : 0;

      let fit = 0;
      let used = 0;
      for (let i = 0; i < Math.min(badges.length, TAGS_MAX); i++) {
        const w = badges[i].offsetWidth + (i > 0 ? 4 : 0);
        const remains = i < tags.length - 1;
        if (used + w + (remains ? chipW : 0) > avail) break;
        used += w;
        fit = i + 1;
      }
      // Always show at least one tag; it truncates rather than vanishing.
      setVisible(Math.max(1, fit));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    return () => ro.disconnect();
  }, [tags]);

  if (tags.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const hidden = tags.length - visible;

  return (
    <div
      ref={rowRef}
      className="relative flex min-w-0 items-center gap-1 overflow-hidden"
    >
      {tags.slice(0, visible).map((t) => (
        <Badge key={t} variant="secondary" className="min-w-0 truncate">
          {t}
        </Badge>
      ))}

      {hidden > 0 && (
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              aria-label={`Show all ${tags.length} tags`}
              className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Badge variant="outline" className="cursor-pointer tabular-nums">
                +{hidden}
              </Badge>
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="start" side="top" className="w-[220px]">
            <BreakdownCard
              title={`All tags (${tags.length})`}
              rows={tags.map((t) => ({ label: t }))}
            />
          </HoverCardContent>
        </HoverCard>
      )}

      {/* Measurement only — never painted, never hit-tested. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-1 whitespace-nowrap"
      >
        {tags.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
        <Badge variant="outline" className="tabular-nums">
          +{Math.max(1, tags.length - 1)}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Qty cell — the row total, with a per-product gallon breakdown on hover when
 * the order has more than one product line. Single-line orders have nothing to
 * break down, so they stay plain text rather than offering a dead trigger.
 */
function QtyCell({ products, total }: { products: ProductQty[]; total: number }) {
  const amount = QTY_FMT.format(total);

  if (products.length < 2) {
    return (
      <span className="text-sm text-foreground">
        <span className="font-medium tabular-nums">{amount}</span>{" "}
        <span className="text-xs text-muted-foreground">gal</span>
      </span>
    );
  }

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      {/*
        Bare `asChild` trigger rather than `variant="link"`. That variant puts
        `hover:underline` on the trigger itself, and CSS text-decoration set on
        an ancestor is drawn across all inline descendants — a child cannot
        cancel it — so the "gal" unit got underlined too. Underlining the number
        span directly off `group-hover` keeps the rule on the value alone.

        The trigger still covers number + unit so the hover target stays
        comfortable; only the ink moved. Affordances from the DS link variant
        (cursor, radius, underline-offset, focus ring) are carried over by hand.
      */}
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`${amount} gallons across ${products.length} products`}
          className="group/qty cursor-pointer rounded-sm text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="font-medium tabular-nums underline-offset-4 group-hover/qty:underline group-focus-visible/qty:underline">
            {amount}
          </span>{" "}
          <span className="text-xs text-muted-foreground">gal</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" side="top" className="w-[280px]">
        <BreakdownCard
          title="Gallons by product"
          rows={products.map((p) => ({
            label: p.name,
            value: QTY_FMT.format(p.gal),
          }))}
          total={{ label: "Total", value: QTY_FMT.format(total) }}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

export interface FuelOrdersTableProps {
  rows: FuelOrder[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** Select or clear a whole group at once, collapsed rows included. */
  onToggleGroup?: (rowIds: string[], checked: boolean) => void;
  sort: SortState | null;
  onSort: (key: FuelOrderColumnKey) => void;
  hidden?: Set<FuelOrderColumnKey>;
  /** Open the order's side sheet — the chevron in the sticky last column. */
  onOpenOrder?: (row: FuelOrder) => void;
  /**
   * Grouped render list from `groupRows`. Omitted, the table renders `rows`
   * flat — which is what every ungrouped list does.
   */
  nodes?: GroupNode<FuelOrder>[];
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroupCollapse?: (id: string) => void;
  /**
   * Column order, as keys. Supply with `onReorderColumns` to keep it in a saved
   * view; leave both off and the table remembers it for the session only.
   */
  columnOrder?: string[];
  onReorderColumns?: (next: string[]) => void;
  /** Reader-set column widths in px, by key. Same dual-mode as the order. */
  columnWidths?: Record<string, number>;
  onResizeColumns?: (next: Record<string, number>) => void;
  /**
   * The filter row under the headers — one box per column, AND-ed. Same
   * contract and same look as `ListTableProps.columnFilters`; this table is
   * its own, so it draws its own copy of the row.
   */
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (key: FuelOrderColumnKey, value: string) => void;
  showColumnFilters?: boolean;
}

/**
 * Fuel Orders table. Chrome is the DS DataTable's (Figma 28165:3758): outer
 * stroke on the `border` token, sticky Surface-1a header with a bottom hairline
 * so rows scroll under it, 40px header row, 56px body rows, px-3 cells, and the
 * asc → desc → unsorted sort glyph cycle.
 */
export function FuelOrdersTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onToggleGroup,
  sort,
  onSort,
  hidden,
  onOpenOrder,
  nodes,
  collapsedGroups,
  onToggleGroupCollapse,
  columnOrder,
  onReorderColumns,
  columnWidths,
  onResizeColumns,
  columnFilters,
  onColumnFilterChange,
  showColumnFilters = false,
}: FuelOrdersTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id));
  const headerState = allSelected ? true : someSelected ? "indeterminate" : false;

  /* THE SELECT BOX AND THE ROW-OPEN CHEVRON ARE THE FRAME, not columns: one is
     how you pick rows and the other is how you open one, and the chevron is
     pinned to the right edge so it survives a sideways scroll. Neither moves,
     and nothing can be dropped outside them. */
  /* Columns move and resize because the DS header does it — see
     `useTableColumns`. Nothing here but which columns are structure. */
  const cols = useTableColumns({
    keys: React.useMemo(() => FUEL_ORDER_COLUMNS.map((c) => c.key), []),
    fixed: FIXED_COLUMNS,
    order: columnOrder,
    onOrderChange: onReorderColumns,
    widths: columnWidths,
    onWidthsChange: onResizeColumns,
  });
  const visibleColumns = cols.arrange(
    FUEL_ORDER_COLUMNS.filter((c) => !hidden?.has(c.key))
  );

  return (
    <div className="h-full overflow-auto rounded-md border border-border [&_[data-slot=table-container]]:overflow-visible">
      <Table style={{ tableLayout: "fixed" }}>
        <colgroup>
          {visibleColumns.map((c) => (
            <col key={c.key} style={{ width: `${cols.widthOf(c)}px` }} />
          ))}
        </colgroup>
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="h-10">
            {visibleColumns.map((col) => {
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
                    // Pinned so the row-open control stays reachable while the
                    // grid scrolls sideways. z-30 clears the sticky thead (z-20).
                    col.key === "actions" && "sticky right-0 z-30"
                  )}
                >
                  {col.key === "select" ? (
                    <Checkbox
                      checked={headerState}
                      onCheckedChange={(c) => onToggleAll(c === true)}
                      aria-label="Select all rows"
                    />
                  ) : col.label && col.sortable ? (
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
          {showColumnFilters && onColumnFilterChange && (
            /* THE SECOND HEADER ROW — a copy of ListTable's, kept identical:
               it sticks with the headers it belongs to, on a band quieter than
               the header so the boxes read as something you do to the columns
               rather than part of their names. */
            <TableRow className="h-11 hover:bg-transparent">
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "border-b border-fp-outline-1 bg-fp-surface-1b px-2",
                    col.key === "actions" && "sticky right-0 z-30"
                  )}
                >
                  {col.label ? (
                    <Input
                      value={columnFilters?.[col.key] ?? ""}
                      onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                      /* No placeholder where the word would be cut. */
                      placeholder={cols.widthOf(col) >= 96 ? "Filter…" : ""}
                      aria-label={`Filter by ${col.label}`}
                      data-no-row-open
                      className="h-7 rounded-md px-2.5 text-xs shadow-none"
                    />
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {(nodes ??
            rows.map((row) => ({
              kind: "row" as const,
              id: row.id,
              depth: 0,
              row,
            }))
          ).map((node) =>
            node.kind === "group" ? (
              <GroupHeaderRow
                key={node.id}
                colSpan={visibleColumns.length}
                depth={node.depth}
                label={node.label}
                dimLabel={node.dimLabel}
                count={node.count}
                measure={node.measure}
                unit="gal"
                noun="order"
                collapsed={Boolean(collapsedGroups?.has(node.id))}
                onToggle={() => onToggleGroupCollapse?.(node.id)}
                selection={
                  onToggleGroup && {
                    state: groupSelectionState(node.rowIds, selectedIds),
                    onChange: (checked) => onToggleGroup(node.rowIds, checked),
                  }
                }
              />
            ) : (
              <Row
                key={node.id}
                row={node.row}
                columns={visibleColumns}
                selected={selectedIds.has(node.row.id)}
                onToggle={() => onToggleRow(node.row.id)}
                onOpenOrder={onOpenOrder}
              />
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Row({
  row,
  columns,
  selected,
  onToggle,
  onOpenOrder,
}: {
  row: FuelOrder;
  columns: FuelOrderColumnDef[];
  selected: boolean;
  onToggle: () => void;
  onOpenOrder?: (row: FuelOrder) => void;
}) {
  const cells: Record<FuelOrderColumnKey, React.ReactNode> = {
    select: (
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={`Select order ${row.orderNo}`}
      />
    ),
    order: (
      <span className="truncate text-sm tabular-nums text-foreground">
        {row.orderNo}
      </span>
    ),
    type: (
      <CodeDisc
        code={row.type.code}
        label={row.type.label}
        tone={TYPE_TONE[row.type.code]}
      />
    ),
    customer: <TwoLine {...row.customer} />,
    products: <ProductCell products={row.products} />,
    qtyGal: <QtyCell products={row.products} total={row.qtyGal} />,
    date: <TwoLine {...row.date} />,
    planned: <PlannedCell planned={row.planned} />,
    status: (
      // `variant="text"` = dot + coloured label, no fill. NOTE the contrast gap
      // documented on StatusChip: text/success and text/processing fail AA on a
      // light surface (3.30 / 3.19) because the light `--status-*` values are
      // too pale for text on #ffffff. FP-dark is this screen's default and the
      // treatment was chosen there; revisit if light mode becomes primary, or
      // once Figma supplies darker light-mode status values.
      <StatusChip tone={STATUS_TONE[row.status]} variant="text">
        {row.status}
      </StatusChip>
    ),
    driver: row.driver ? (
      <span className="flex min-w-0 items-center gap-2">
        <Avatar className="size-5 shrink-0">
          <AvatarFallback className="text-[10px]">
            {row.driver.initials}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm text-foreground">{row.driver.name}</span>
      </span>
    ) : (
      <span className="truncate text-sm italic text-muted-foreground">
        — Unassigned
      </span>
    ),
    tags: <TagsCell tags={row.tags} />,
    actions: (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Open order ${row.orderNo}`}
          onClick={() => onOpenOrder?.(row)}
        >
          <ChevronRight />
        </Button>
      </div>
    ),
  };

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className="group/row h-14"
    >
      {columns.map((col) => (
        <TableCell
          key={col.key}
          className={cn(
            "px-3",
            col.align === "right" && "text-right",
            // The pinned cell needs its own opaque fill or the scrolling grid
            // shows through it. That fill would also hide the row's hover and
            // selected tints, so those are re-applied as a `before` overlay
            // using the same token and alpha the row itself uses — the pinned
            // cell then matches the rest of the row exactly instead of
            // approximating it with a hardcoded composite.
            col.key === "actions" &&
              "sticky right-0 z-10 bg-fp-surface-1b before:pointer-events-none before:absolute before:inset-0 group-hover/row:before:bg-fp-row-hover group-data-[state=selected]/row:before:bg-fp-row-selected"
          )}
        >
          {/* `relative` lifts real content above the overlay. */}
          <span className={cn(col.key === "actions" && "relative")}>
            {cells[col.key]}
          </span>
        </TableCell>
      ))}
    </TableRow>
  );
}
