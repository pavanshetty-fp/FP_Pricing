import * as React from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  UserPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CodeDisc, type CodeDiscTone } from "@/components/ui/code-disc";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SchedulingWindow,
  SortState,
  TwoLine as TwoLineData,
} from "./types";

const QTY_FMT = new Intl.NumberFormat("en-US");

/*
  The two mappings below are ALL this screen owns about type and status. The
  rendering lives in the DS (`CodeDisc`, `StatusChip`); the DS ships hues and
  channels and binds no meaning to them, so declaring the meaning is the
  application's job. This is the same split the DS's own table uses via
  `statusTone` in tables-layout/data.ts.
*/

/** Order type → pastel hue. */
const TYPE_TONE: Record<OrderTypeCode, CodeDiscTone> = {
  D: "pastel-blue",
  E: "pastel-amber",
};

/** Order status → colour channel. */
const STATUS_TONE: Record<FuelOrderStatus, StatusTone> = {
  Assigned: "success",
  Unassigned: "processing",
};

function TwoLine({ title, description }: TwoLineData) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{description}</span>
    </div>
  );
}

/** Scheduling window — a from/to range, or an em-dash when none is booked. */
function WindowCell({ window }: { window: SchedulingWindow | null }) {
  if (!window) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <span className="truncate text-sm tabular-nums text-foreground">
      {window.from} – {window.to}
    </span>
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
 * Qty cell — the row total, with a per-product gallon breakdown on hover when
 * the order has more than one product line. Single-line orders have nothing to
 * break down, so they stay plain text rather than offering a dead trigger.
 */
function QtyCell({ products, total }: { products: ProductQty[]; total: number }) {
  const value = (
    <>
      <span className="font-medium tabular-nums">{QTY_FMT.format(total)}</span>{" "}
      <span className="text-xs text-muted-foreground">gal</span>
    </>
  );

  if (products.length < 2) {
    return <span className="text-sm text-foreground">{value}</span>;
  }

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger
        variant="link"
        aria-label={`${QTY_FMT.format(total)} gallons across ${products.length} products`}
        className="text-sm"
      >
        {value}
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
  sort: SortState | null;
  onSort: (key: FuelOrderColumnKey) => void;
  hidden?: Set<FuelOrderColumnKey>;
  /** Open the order's side sheet. Omit to hide those row actions. */
  onOpenOrder?: (row: FuelOrder) => void;
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
  sort,
  onSort,
  hidden,
  onOpenOrder,
}: FuelOrdersTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id));
  const headerState = allSelected ? true : someSelected ? "indeterminate" : false;
  const visibleColumns = FUEL_ORDER_COLUMNS.filter((c) => !hidden?.has(c.key));

  return (
    <div className="h-full overflow-auto rounded-md border border-border [&_[data-slot=table-container]]:overflow-visible">
      <Table style={{ tableLayout: "fixed" }}>
        <colgroup>
          {visibleColumns.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
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
                <TableHead
                  key={col.key}
                  aria-sort={
                    active
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "border-b border-fp-outline-1 bg-fp-surface-1a px-3 text-xs font-medium text-muted-foreground",
                    col.align === "right" && "text-right"
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
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              columns={visibleColumns}
              selected={selectedIds.has(row.id)}
              onToggle={() => onToggleRow(row.id)}
              onOpenOrder={onOpenOrder}
            />
          ))}
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
    window: <WindowCell window={row.window} />,
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
    actions: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Row actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onOpenOrder && (
            <>
              <DropdownMenuItem onSelect={() => onOpenOrder(row)}>
                <PanelRightOpen />
                View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem>
            <Pencil />
            Edit order
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus />
            Assign driver
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            Cancel order
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <TableRow data-state={selected ? "selected" : undefined} className="h-14">
      {columns.map((col) => (
        <TableCell
          key={col.key}
          className={cn("px-3", col.align === "right" && "text-right")}
        >
          {cells[col.key]}
        </TableCell>
      ))}
    </TableRow>
  );
}
