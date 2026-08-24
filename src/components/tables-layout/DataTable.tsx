import * as React from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  Bold,
  Italic,
  Underline,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  User,
  PanelRightOpen,
  Table2,
  PackagePlus,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { InvoiceCard } from "@/components/info-cards";
import { usePreferences } from "@/components/preferences";
import { StatusChip } from "@/components/ui/status-chip";
import { COLUMNS, statusBadgeVariant, statusTone } from "./data";
import type {
  ColumnDef,
  ColumnKey,
  SortState,
  TableRow as TableRowData,
} from "./types";

/**
 * Editable text cell — reads as a plain Static cell, behaves as a text field.
 * Click (or focus + Enter) turns it into an input in place; Enter commits,
 * Escape reverts, blur commits. Leading/trailing icons are optional and toggled
 * from Component Control → Table cell.
 *
 * Follows the DS editable-cell recipe: the control fills the whole cell (the
 * `td` drops its padding) so hover paints `bg-accent` edge to edge, with the
 * focus ring inset rather than outside the cell.
 */
function CellEditable({
  value,
  onChange,
  leading,
  trailing,
}: {
  value: string;
  onChange: (next: string) => void;
  leading: boolean;
  trailing: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onChange(next);
    else setDraft(value);
  };

  // One frame shared by both states, so switching to the input shifts nothing.
  const frame =
    "flex h-full w-full items-center gap-2 px-3 py-2.5 text-left text-sm outline-none transition-colors";

  if (editing) {
    return (
      <div className={cn(frame, "bg-accent ring-2 ring-ring/50 ring-inset")}>
        {leading && <Tag className="size-4 shrink-0 text-muted-foreground" />}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          aria-label="Edit cell text"
          autoFocus
          className="min-w-0 flex-1 bg-transparent p-0 text-sm text-foreground outline-none"
        />
        {trailing && <Pencil className="size-4 shrink-0 text-muted-foreground" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        frame,
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      )}
    >
      {leading && <Tag className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate text-foreground">{value}</span>
      {trailing && <Pencil className="size-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}

function TwoLine({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{description}</span>
    </div>
  );
}

/**
 * Dropdown-column cell — Figma "Table / Cell" (28165:3806). The whole two-line
 * cell is the trigger and fills the entire td; the hover/open lift is the same
 * full-cell behaviour as the form table's CellSelect: no inset outline, the
 * --accent fill covers the whole cell (the cell sits on Surface-1b).
 * Menu: Label + a checkbox item (real toggle, stays open) + items / separator /
 * Label + items.
 */
function CellDropdown({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [checked, setChecked] = React.useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            "flex h-full w-full items-center justify-between gap-2 px-3 py-2.5 text-left outline-none transition-colors",
            "hover:bg-accent",
            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
            "data-[state=open]:bg-accent"
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm text-foreground">{title}</span>
            <span className="truncate text-xs text-muted-foreground">
              {description}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Label Text
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={checked}
            onCheckedChange={setChecked}
            onSelect={(e) => e.preventDefault()}
          >
            Checkbox Text
          </DropdownMenuCheckboxItem>
          {[0, 1].map((i) => (
            <DropdownMenuItem key={i}>
              <User />
              Dropdown Menu Item Text
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Label Text
          </DropdownMenuLabel>
          {[0, 1, 2].map((i) => (
            <DropdownMenuItem key={i}>
              <User />
              Dropdown Menu Item Text
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/* ---------------------------------------------------------------------------
 * Nested (expandable) sub-table — read-only example of a child dataset.
 * Treatment (per reference): END-TO-END — the sub-table runs full-bleed inside
 * the parent's row (no inset card, no indent), on a recessed `bg-background`
 * surface (one step below the content layer) with a left accent to tie it to
 * the parent. Generous row rhythm, muted column headers, a two-line
 * "Effective Duration" cell. The parent row sits on the lighter content-layer
 * surface above with a filled badge, so it stays the more prominent tier.
 * ------------------------------------------------------------------------- */
const NESTED_COLUMNS = [
  "Product",
  "Vendor",
  "Market",
  "Base Price",
  "Effective Duration",
  "Created at",
] as const;

type NestedRow = {
  product: string;
  vendor: string;
  market: string;
  price: string;
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
};

const NESTED_ROWS: NestedRow[] = [
  { product: "Dyed Diesel", vendor: "Lard Oil", market: "Iowa", price: "$0.10", effectiveFrom: "07/27/2025 12:30 PM", effectiveTo: "07/28/2026 11:59 PM", createdAt: "07/27/2025 12:20 PM" },
  { product: "CLR Diesel", vendor: "Lard Oil", market: "Iowa", price: "$0.20", effectiveFrom: "07/27/2025 12:30 PM", effectiveTo: "07/28/2026 11:59 PM", createdAt: "07/27/2025 12:20 PM" },
  { product: "Dyed Diesel", vendor: "Fronk Oil", market: "Iowa", price: "$0.10", effectiveFrom: "07/27/2025 12:30 PM", effectiveTo: "07/28/2026 11:59 PM", createdAt: "07/27/2025 12:20 PM" },
  { product: "CLR Diesel", vendor: "Fronk Oil", market: "Iowa", price: "$0.25", effectiveFrom: "07/27/2025 12:30 PM", effectiveTo: "07/28/2026 11:59 PM", createdAt: "07/27/2025 12:20 PM" },
  { product: "Dyed Diesel", vendor: "AllStar Fuel", market: "Iowa", price: "$0.25", effectiveFrom: "07/27/2025 12:30 PM", effectiveTo: "07/28/2026 11:59 PM", createdAt: "07/27/2025 12:20 PM" },
];

function NestedTable({ width }: { width?: number }) {
  return (
    // Pinned to the visible viewport width (sticky left) so the detail's columns
    // sit comfortably and don't scroll away with the wide parent grid. The td
    // behind it carries the recessed fill end-to-end; this adds the left accent.
    <div
      className="sticky left-0 border-l-2 border-status-success/70 bg-background"
      style={{ width }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {NESTED_COLUMNS.map((label) => (
                <th
                  key={label}
                  className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NESTED_ROWS.map((row, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="whitespace-nowrap px-4 py-3.5 text-foreground">
                  {row.product}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                  {row.vendor}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                  {row.market}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-foreground">
                  {row.price}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-muted-foreground">
                  <div className="flex flex-col leading-snug">
                    <span>{row.effectiveFrom}</span>
                    <span>{row.effectiveTo}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-muted-foreground">
                  {row.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Side-sheet variants a row action can open (typed inline to avoid a cycle). */
export type RowSheetVariant = "narrow" | "wide" | "dense";

export interface DataTableProps {
  rows: TableRowData[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** Current sort (owned by the parent so it can sort the full dataset). */
  sort: SortState | null;
  /** Toggle sort for a column (parent cycles asc → desc → unsorted). */
  onSort: (key: ColumnKey) => void;
  /** Open a side sheet from a row action. Omit to hide those menu items. */
  onRowAction?: (variant: RowSheetVariant, row: TableRowData) => void;
  /** Hidden column keys (driven by the action bar's column-filters menu). */
  hidden?: Set<ColumnKey>;
  /** Optional control rendered in the header's rightmost cell, revealed on
   *  header hover (e.g. the column tools popover). */
  headerAction?: React.ReactNode;
}

export function DataTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  sort,
  onSort,
  onRowAction,
  hidden,
  headerAction,
}: DataTableProps) {
  // Cell edits live here (keyed by row id) rather than inside Row: rows unmount
  // when the page changes, and an edit must outlive that.
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const { editableIcons } = usePreferences();

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id));
  const headerState = allSelected ? true : someSelected ? "indeterminate" : false;
  const visibleColumns = COLUMNS.filter((c) => !hidden?.has(c.key));

  // Measure the scroll viewport so an expanded row's detail can fill the VISIBLE
  // width (not the table's much wider scroll width) — its columns then sit
  // comfortably like the reference and stay pinned as the grid scrolls sideways.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = React.useState<number>();
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // Outer stroke around the whole table (Figma 28165:3758) — bound to the
    // `border` token (follows the FP variable; updated to FP/Outline 1), rounded.
    // This element owns BOTH scroll axes so the sticky header pins to its top; the
    // shadcn <Table> wraps the table in its own `overflow-x-auto` div — neutralize
    // it (`table-container` → overflow-visible) so THIS element is the sticky
    // header's scroll anchor, not that inner wrapper.
    <div
      ref={scrollRef}
      className="h-full overflow-auto rounded-md border border-border [&_[data-slot=table-container]]:overflow-visible"
    >
      <Table style={{ tableLayout: "fixed" }}>
        <colgroup>
          {visibleColumns.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
          ))}
        </colgroup>
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="group/hdr h-10">
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
                    active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    // Solid fill (Surface 1a) + bottom hairline so body rows
                    // scroll UNDER the header, not through the titles. Stickiness
                    // is on the <thead> (th-level sticky is unreliable with
                    // collapsed table borders).
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
                        active && "text-foreground",
                        col.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {col.label}
                      <SortIcon
                        className={cn("size-3.5", active ? "opacity-100" : "opacity-70")}
                      />
                    </button>
                  ) : col.label ? (
                    <span>{col.label}</span>
                  ) : col.key === "actions" ? (
                    <div className="flex justify-end">{headerAction}</div>
                  ) : null}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <Row
              key={row.id}
              row={row}
              columns={visibleColumns}
              selected={selectedIds.has(row.id)}
              onToggle={() => onToggleRow(row.id)}
              onRowAction={onRowAction}
              // First row demonstrates an expandable nested sub-table.
              expandable={idx === 0}
              detailWidth={viewportWidth}
              editableValue={edits[row.id] ?? row.editable}
              onEditableChange={(next) =>
                setEdits((prev) => ({ ...prev, [row.id]: next }))
              }
              editableIcons={editableIcons}
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
  onRowAction,
  expandable = false,
  detailWidth,
  editableValue,
  onEditableChange,
  editableIcons,
}: {
  row: TableRowData;
  columns: ColumnDef[];
  selected: boolean;
  onToggle: () => void;
  editableValue: string;
  onEditableChange: (next: string) => void;
  editableIcons: Record<"leading" | "trailing", boolean>;
  onRowAction?: (variant: RowSheetVariant, row: TableRowData) => void;
  /** When true, the row shows a disclosure chevron that reveals a nested table. */
  expandable?: boolean;
  /** Visible viewport width, so the expanded detail fills the screen, not the
   *  table's wider scroll width. */
  detailWidth?: number;
}) {
  const [switchOn, setSwitchOn] = React.useState(row.switchOn);
  const [toggle, setToggle] = React.useState(row.toggle);
  const [expanded, setExpanded] = React.useState(false);

  // One renderer per column key — header and body share the same visible set,
  // so hiding a column (column-filters menu) drops both in lockstep.
  const cells: Record<ColumnKey, React.ReactNode> = {
    select: (
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={`Select ${row.id}`}
      />
    ),
    status: <StatusChip tone={statusTone(row.status)}>{row.status}</StatusChip>,
    editable: (
      <CellEditable
        value={editableValue}
        onChange={onEditableChange}
        leading={editableIcons.leading}
        trailing={editableIcons.trailing}
      />
    ),
    dropdown: (
      <CellDropdown
        title={row.dropdown.title}
        description={row.dropdown.description}
      />
    ),
    descriptive: (
      <TwoLine
        title={row.descriptive.title}
        description={row.descriptive.description}
      />
    ),
    badge: <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
    statusBadge: (
      <span className="inline-flex items-center gap-2">
        <Avatar className="size-5">
          <AvatarFallback className="text-[10px]">U</AvatarFallback>
        </Avatar>
        <StatusChip tone={statusTone(row.statusBadge)}>{row.statusBadge}</StatusChip>
      </span>
    ),
    switch: (
      <Switch
        checked={switchOn}
        onCheckedChange={setSwitchOn}
        aria-label="Toggle row"
      />
    ),
    button: (
      <Button variant="outline" size="xs">
        Button
      </Button>
    ),
    iconDropdown: (
      <Button variant="outline" size="icon-sm" aria-label="Open">
        <CirclePlay />
      </Button>
    ),
    progress: <Progress value={row.progress} className="h-1.5 w-24" />,
    image: (
      <div className="size-8 rounded-md border border-border bg-foreground/90" />
    ),
    toggle: (
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={toggle}
        onValueChange={(v) => v && setToggle(v)}
      >
        <ToggleGroupItem value="bold" aria-label="Bold" className="px-2">
          <Bold className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic" className="px-2">
          <Italic className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline" className="px-2">
          <Underline className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    ),
    amount: (
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger variant="link" className="ml-auto tabular-nums">
          {currency.format(row.amount)}
        </HoverCardTrigger>
        <HoverCardContent align="end" side="left" className="w-[380px]">
          <InvoiceCard />
        </HoverCardContent>
      </HoverCard>
    ),
    actions: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Row actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onRowAction && (
            <>
              <DropdownMenuItem onSelect={() => onRowAction("narrow", row)}>
                <PanelRightOpen />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRowAction("wide", row)}>
                <Table2 />
                Tank list
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRowAction("dense", row)}>
                <PackagePlus />
                Assign asset
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2 />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  return (
    <>
      <TableRow
        data-state={selected ? "selected" : undefined}
        data-expanded={expanded ? "true" : undefined}
        // A subtle tint anchors the parent while its children are open, so the
        // parent row stays at least as prominent as the nested sub-table.
        // Drop the bottom divider when expanded so the green accent rail runs
        // seamlessly from this row into the nested block (no grey notch).
        className={cn(
          "h-14",
          expanded && "border-b-0 bg-accent/40 hover:bg-accent/40"
        )}
      >
        {columns.map((col, ci) => (
          <TableCell
            key={col.key}
            className={cn(
              // Dropdown cells zero their padding so the trigger fills the whole
              // cell (full-cell hover, like the form table); others keep px-3.
              col.key === "dropdown" || col.key === "editable" ? "p-0" : "px-3",
              col.align === "right" && "text-right text-sm tabular-nums",
              // When expanded, carry the green accent up the parent row's left
              // edge so the line runs from the top of this row into the nested
              // detail below as one continuous rail.
              ci === 0 && expanded && "border-l-2 border-status-success/70"
            )}
          >
            {col.key === "status" && expandable ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  aria-label={expanded ? "Collapse row" : "Expand row"}
                  className="-ml-1 rounded p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <ChevronRight
                    className={cn("size-4 transition-transform", expanded && "rotate-90")}
                  />
                </button>
                {cells[col.key]}
              </div>
            ) : (
              cells[col.key]
            )}
          </TableCell>
        ))}
      </TableRow>
      {expandable && expanded && (
        <TableRow className="hover:bg-transparent data-[state=selected]:bg-transparent">
          {/* Recessed surface spans the full row (end-to-end); the inner detail
              is pinned to the visible width so its columns stay comfortable. */}
          <TableCell colSpan={columns.length} className="bg-background p-0">
            <NestedTable width={detailWidth} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
