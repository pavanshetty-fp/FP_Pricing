import * as React from "react";
import {
  Columns3,
  KanbanSquare,
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
import { Combobox } from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GroupByMenu,
  type GroupByDimension,
} from "@/components/tables-layout/GroupByMenu";
import { DateFilter } from "./DateFilter";

/**
 * The action bar, generic over the list it serves.
 *
 * Composition is the DS's CURRENT Data Action Control toolbar
 * (`data-action-control/DataActionControl.tsx`, the finalized Option 1) and is
 * unchanged from what Fuel Orders proved:
 *
 *   LEFT   320px search (leading glyph, trailing clear ×) · Filters · Group By
 *   RIGHT  [date scope] │ view switch │ search-by-column · show/hide columns
 *
 * Both dividers, `gap-3` left / `gap-1` right, the 32px control height, the
 * ghost `icon-sm` tools with tooltips and the `bg-accent` active state on the
 * view switch are the DS's values.
 *
 * WHAT THIS PARAMETERISES, and why it exists: the facet panel, the column list
 * and the search-by-column fields were welded to one screen's data, so a second
 * list could not reuse the unit. They are props now. This is exactly the change
 * `docs/handoff-ds-adoption-2.md` asks the DS to make to `FilterPanel` and the
 * two column tools — done here first, across three screens, so the DS side has a
 * worked example rather than a description.
 *
 * `dateScope` is OPTIONAL and that is the point: a date stepper belongs on a list
 * whose every row sits on one date, and is meaningless on one that carries no
 * date at all. Fuel Orders and Asset Orders pass it; Customers does not.
 */

export type ListView = "table" | "board";

export interface ListSearchField {
  key: string;
  label: string;
}

export interface ListToolbarProps<K extends string> {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  /** The screen's facet panel — a `Filters` trigger plus its popover. */
  filters: React.ReactNode;
  columns: { key: K; label: string }[];
  hiddenColumns: Set<K>;
  onToggleColumn: (key: K) => void;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
  /** Columns the "Search by column" tool can be pointed at. */
  searchFields: ListSearchField[];
  colScope: string;
  onColScopeChange: (v: string) => void;
  colQuery: string;
  onColQueryChange: (v: string) => void;
  view: ListView;
  onViewChange: (v: ListView) => void;
  /** Omit entirely on lists that are not date-scoped. */
  dateScope?: { date: Date; onDateChange: (d: Date) => void };
  /**
   * Grouping. `dimensions` are a property of the list's DATA, so each screen
   * supplies its own; the menu is ordered and capped at two levels.
   */
  groupBy?: {
    dimensions: GroupByDimension[];
    value: string[];
    onChange: (next: string[]) => void;
  };
}

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
          // Same fill as the chips: `--chip`, not `--accent`. At #cad1db the
          // control-emphasis token sits far too heavy on white inside a 32px
          // button. Dark is unchanged — `--chip` is #2a2f37 there.
          className={cn(active && "bg-chip text-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ListToolbar<K extends string>({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  columns,
  hiddenColumns,
  onToggleColumn,
  onShowAllColumns,
  onHideAllColumns,
  searchFields,
  colScope,
  onColScopeChange,
  colQuery,
  onColQueryChange,
  view,
  onViewChange,
  dateScope,
  groupBy,
}: ListToolbarProps<K>) {
  const colLabel =
    searchFields.find((f) => f.key === colScope)?.label ?? "column";
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
            placeholder={searchPlaceholder}
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
        {filters}
        {groupBy ? (
          <GroupByMenu
            dimensions={groupBy.dimensions}
            value={groupBy.value}
            onChange={groupBy.onChange}
          />
        ) : (
          <GroupByMenu />
        )}
      </div>

      {/* RIGHT — [date] │ view switch │ column tools */}
      <div className="flex items-center gap-1">
        {dateScope && (
          <>
            <DateFilter
              value={dateScope.date}
              onChange={dateScope.onDateChange}
            />
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
          </>
        )}

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
            <Combobox
              size="sm"
              className="w-full"
              value={colScope}
              onValueChange={onColScopeChange}
              options={searchFields.map((f) => ({
                value: f.key,
                label: f.label,
              }))}
              placeholder="Choose a column"
              searchPlaceholder="Search columns…"
              emptyText="No column found."
            />
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
      </div>
    </div>
  );
}

/** The active column-search chip the DS unit renders under the toolbar. */
export function ColumnSearchChip({
  searchFields,
  colScope,
  colQuery,
  onClear,
}: {
  searchFields: ListSearchField[];
  colScope: string;
  colQuery: string;
  onClear: () => void;
}) {
  if (!colQuery.trim()) return null;
  const label = searchFields.find((f) => f.key === colScope)?.label ?? "column";
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
