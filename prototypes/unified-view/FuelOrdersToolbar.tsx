import * as React from "react";
import {
  Columns3,
  KanbanSquare,
  Plus,
  Search,
  Table2,
  TextSearch,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GroupByMenu } from "@/components/tables-layout/GroupByMenu";
import { DateFilter } from "./DateFilter";
import { FuelOrdersFilters } from "./FuelOrdersFilters";
import { FUEL_ORDER_SEARCH_FIELDS } from "./data";
import type { FuelOrderColumnKey } from "./types";

/**
 * Fuel Orders action bar — the DS's CURRENT Data Action Control toolbar
 * (`data-action-control/DataActionControl.tsx`, the finalized Option 1).
 *
 * This replaced an older read of the unit (Figma 27614:56583) that put the
 * column-visibility control in a button welded to the search field's right edge
 * and left the right-hand side to the date stepper and the CTA. The DS has since
 * settled on a different split, and this now follows it exactly:
 *
 *   LEFT   320px search input (leading glyph, trailing clear ×) · Filters · Group By
 *   RIGHT  [date] │ view switch │ search-by-column · show/hide columns │ Create
 *
 * Both dividers, the `gap-1` right cluster, the `gap-3` left cluster, the 32px
 * control height, the ghost `icon-sm` tools with tooltips, and the `bg-accent`
 * active state on the view switch are the DS's values, not re-derived here.
 *
 * ONE ADDITION, which is the point of keeping it: the DELIVERY-DATE STEPPER
 * LEADS the right cluster. The DS unit has no such control because its demo
 * table is not date-scoped; this screen's every row is, and the value has to
 * stay readable without opening a panel. It sits ahead of the icon tools rather
 * than between them and the CTA, so the cluster reads outward from what scopes
 * the data (the date) through how it is presented (view, columns) to the action
 * that adds to it (Create) — and the date no longer splits the icon tools from
 * the button they have nothing to do with.
 *
 * TWO SUBSTITUTIONS, both because the DS parts are welded to the DS's own demo
 * data rather than because this screen wants something different:
 *
 * 1. `FuelOrdersFilters` stands in for the DS `FilterPanel` — this screen's
 *    facets are Customer / Product / Driver / Status / Category, not the demo's.
 * 2. The show/hide list and the search-by-column picker read this screen's
 *    columns via `FUEL_ORDER_SEARCH_FIELDS`, the local analogue of the DS's
 *    `helpers.ts` SEARCH_FIELDS (typed to the demo's row shape).
 *
 * `GroupByMenu` is used AS THE DS SHIPS IT — it is presentational, so it needed
 * no fork.
 *
 * DS FOLLOW-UP: `FilterPanel` and the two column tools should take their facets,
 * columns and search fields as props. Then the substitutions collapse and this
 * file is a thin arrangement of DS parts plus the date stepper.
 */

/** Icon button in the toolbar, wrapped in a tooltip. The DS's `IconTool`. */
function IconTool({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className={cn(active && "bg-accent text-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export type FuelOrdersView = "table" | "board";

export interface FuelOrdersToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  columns: { key: FuelOrderColumnKey; label: string }[];
  hiddenColumns: Set<FuelOrderColumnKey>;
  onToggleColumn: (key: FuelOrderColumnKey) => void;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
  /** Search-by-column: which column, and the query inside it. */
  colScope: string;
  onColScopeChange: (v: string) => void;
  colQuery: string;
  onColQueryChange: (v: string) => void;
  view: FuelOrdersView;
  onViewChange: (v: FuelOrdersView) => void;
  date: Date;
  onDateChange: (d: Date) => void;
  onCreateOrder?: () => void;
}

export function FuelOrdersToolbar({
  searchValue,
  onSearchChange,
  columns,
  hiddenColumns,
  onToggleColumn,
  onShowAllColumns,
  onHideAllColumns,
  colScope,
  onColScopeChange,
  colQuery,
  onColQueryChange,
  view,
  onViewChange,
  date,
  onDateChange,
  onCreateOrder,
}: FuelOrdersToolbarProps) {
  const colLabel =
    FUEL_ORDER_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "column";
  const shown = columns.filter((c) => !hiddenColumns.has(c.key)).length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* LEFT — search · Filters · Group By */}
      <div className="flex items-center gap-3">
        <div className="relative w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search fuel orders, sites, drivers…"
            aria-label="Search all columns"
            className={cn("h-8 pl-8", searchValue && "pr-8")}
          />
          {searchValue && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <FuelOrdersFilters />
        <GroupByMenu />
      </div>

      {/* RIGHT — date │ view switch │ column tools │ Create */}
      <div className="flex items-center gap-1">
        {/* KEPT from the previous toolbar — every row on screen is scoped by it,
            so it leads the cluster rather than sitting next to the CTA. */}
        <DateFilter value={date} onChange={onDateChange} />

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <IconTool
          label="Table view"
          active={view === "table"}
          onClick={() => onViewChange("table")}
        >
          <Table2 />
        </IconTool>
        <IconTool
          label="Board view"
          active={view === "board"}
          onClick={() => onViewChange("board")}
        >
          <KanbanSquare />
        </IconTool>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        {/* Search by column */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Search by column"
                  className={cn(colQuery.trim() && "text-foreground")}
                >
                  <TextSearch />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Search by column</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-64 space-y-2 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TextSearch className="size-3.5" /> Search by column
            </div>
            <Select value={colScope} onValueChange={onColScopeChange}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Choose a column" />
              </SelectTrigger>
              <SelectContent>
                {FUEL_ORDER_SEARCH_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={colQuery}
                onChange={(e) => onColQueryChange(e.target.value)}
                placeholder={`Find in ${colLabel}…`}
                className={cn("h-8 pl-8", colQuery && "pr-8")}
              />
              {colQuery && (
                <button
                  type="button"
                  aria-label="Clear column search"
                  onClick={() => onColQueryChange("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Show/Hide columns */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Show/Hide columns"
                >
                  <Columns3 />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Show/Hide columns</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-56 p-1">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Columns
              </span>
              <span className="rounded bg-fp-card-1 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {shown}/{columns.length}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {columns.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent has-[:focus-visible]:bg-accent"
                >
                  <Checkbox
                    checked={!hiddenColumns.has(c.key)}
                    onCheckedChange={() => onToggleColumn(c.key)}
                  />
                  <span className="flex-1 truncate">{c.label}</span>
                </label>
              ))}
            </div>
            <Separator className="my-1" />
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={hiddenColumns.size === 0}
                onClick={onShowAllColumns}
              >
                Show all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={hiddenColumns.size === columns.length}
                onClick={onHideAllColumns}
              >
                Hide all
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button size="sm" onClick={onCreateOrder}>
          <Plus />
          Create Order
        </Button>
      </div>
    </div>
  );
}

/**
 * The active column-search chip the DS unit renders under the toolbar, so a
 * narrowing set from a closed popover can't go unnoticed.
 */
export function ColumnSearchChip({
  colScope,
  colQuery,
  onClear,
}: {
  colScope: string;
  colQuery: string;
  onClear: () => void;
}) {
  if (!colQuery.trim()) return null;
  const label =
    FUEL_ORDER_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "column";
  return (
    <div className="mt-3 flex shrink-0 items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-fp-card-1 py-0.5 pr-1 pl-2 text-[11px] text-foreground">
        <Search className="size-3 text-muted-foreground" />
        {label}: “{colQuery}”
        <button
          type="button"
          aria-label="Clear column search"
          onClick={onClear}
          className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3" />
        </button>
      </span>
    </div>
  );
}
