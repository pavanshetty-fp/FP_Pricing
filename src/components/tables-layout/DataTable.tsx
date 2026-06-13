import * as React from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
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
import { COLUMNS, statusBadgeVariant } from "./data";
import type {
  ColumnKey,
  RowStatus,
  SortState,
  TableRow as TableRowData,
} from "./types";

const STATUS_DOT: Record<RowStatus, string> = {
  Success: "bg-status-success",
  Processing: "bg-status-processing",
  Failed: "bg-status-failed",
};

function StatusText({ status }: { status: RowStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </span>
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
 * Dropdown-column cell — Figma "Drop Down behaviour" (27999:7846). The whole
 * two-line cell is the trigger, styled as an outlined input box:
 *   default → no box · hover → fp-outline-2 border + fp-surface-1b fill ·
 *   open/selected → fp-card-1 fill (border reserved so there's no layout shift).
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
            "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-left outline-none transition-colors",
            "hover:border-fp-outline-2 hover:bg-fp-surface-1b",
            "focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=open]:border-fp-outline-2 data-[state=open]:bg-fp-card-1"
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
}

export function DataTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  sort,
  onSort,
  onRowAction,
}: DataTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id));
  const headerState = allSelected ? true : someSelected ? "indeterminate" : false;

  return (
    <div className="overflow-x-auto">
      <Table style={{ tableLayout: "fixed" }}>
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="h-10">
            {COLUMNS.map((col) => {
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
                    "px-3 text-xs font-medium text-muted-foreground",
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
              selected={selectedIds.has(row.id)}
              onToggle={() => onToggleRow(row.id)}
              onRowAction={onRowAction}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Row({
  row,
  selected,
  onToggle,
  onRowAction,
}: {
  row: TableRowData;
  selected: boolean;
  onToggle: () => void;
  onRowAction?: (variant: RowSheetVariant, row: TableRowData) => void;
}) {
  const [switchOn, setSwitchOn] = React.useState(row.switchOn);
  const [toggle, setToggle] = React.useState(row.toggle);

  return (
    <TableRow data-state={selected ? "selected" : undefined} className="h-14">
      {/* select */}
      <TableCell className="px-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${row.id}`}
        />
      </TableCell>
      {/* Static */}
      <TableCell className="px-3">
        <StatusText status={row.status} />
      </TableCell>
      {/* Dropdown — the whole cell is the trigger (Figma 27999:7846) */}
      <TableCell className="px-3">
        <CellDropdown
          title={row.dropdown.title}
          description={row.dropdown.description}
        />
      </TableCell>
      {/* Descriptive Text */}
      <TableCell className="px-3">
        <TwoLine
          title={row.descriptive.title}
          description={row.descriptive.description}
        />
      </TableCell>
      {/* Badge — variant resolved from the row's status (semantic-variable rule) */}
      <TableCell className="px-3">
        <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
      </TableCell>
      {/* Badge w/ avatar + status */}
      <TableCell className="px-3">
        <span className="inline-flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarFallback className="text-[10px]">U</AvatarFallback>
          </Avatar>
          <StatusText status={row.statusBadge} />
        </span>
      </TableCell>
      {/* Switch */}
      <TableCell className="px-3">
        <Switch
          checked={switchOn}
          onCheckedChange={setSwitchOn}
          aria-label="Toggle row"
        />
      </TableCell>
      {/* Button */}
      <TableCell className="px-3">
        <Button variant="outline" size="xs">
          Button
        </Button>
      </TableCell>
      {/* Icon dropdown */}
      <TableCell className="px-3">
        <Button variant="outline" size="icon-sm" aria-label="Open">
          <CirclePlay />
        </Button>
      </TableCell>
      {/* Progress */}
      <TableCell className="px-3">
        <Progress value={row.progress} className="h-1.5 w-24" />
      </TableCell>
      {/* Image */}
      <TableCell className="px-3">
        <div className="size-8 rounded-md border border-border bg-foreground/90" />
      </TableCell>
      {/* Toggle Group */}
      <TableCell className="px-3">
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
      </TableCell>
      {/* Amount — hovering reveals the price-breakdown information card */}
      <TableCell className="px-3 text-right text-sm tabular-nums">
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger variant="link" className="ml-auto tabular-nums">
            {currency.format(row.amount)}
          </HoverCardTrigger>
          <HoverCardContent align="end" side="left" className="w-[380px]">
            <InvoiceCard />
          </HoverCardContent>
        </HoverCard>
      </TableCell>
      {/* Actions */}
      <TableCell className="px-3">
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
      </TableCell>
    </TableRow>
  );
}
