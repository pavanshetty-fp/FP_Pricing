import * as React from "react";
import {
  Map as MapIcon,
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

/**
 * `map` is opt-in: a list only offers it when its records have a PLACE, which
 * is true of vendors and of nothing else in the Directory. A view toggle that
 * shows a dead third option on every screen teaches people to ignore it.
 */
export type ListView = "table" | "board" | "map";

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
  /** Offer the map view. Off unless the records are geographic. */
  mapView?: boolean;
  /** Omit entirely on lists that are not date-scoped. */
  dateScope?: { date: Date; onDateChange: (d: Date) => void };
  /**
   * A DIFFERENT date control, in the same slot. 3PL scopes by a RANGE because a
   * broker's delivery windows run over weekends and a one-day view of those is
   * a lane that keeps looking empty — but that is 3PL's answer, not every
   * list's, so it is supplied rather than switched on. Wins over `dateScope`.
   */
  dateControl?: React.ReactNode;
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
  mapView = false,
  dateScope,
  dateControl,
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
        {(dateControl ?? dateScope) && (
          <>
            {dateControl ?? (
              <DateFilter
                value={dateScope!.date}
                onChange={dateScope!.onDateChange}
              />
            )}
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
        {mapView && (
          <IconTool
            label="Map view"
            active={view === "map"}
            onClick={() => onViewChange("map")}
          >
            <MapIcon />
          </IconTool>
        )}

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
  className = "mt-3",
}: {
  searchFields: ListSearchField[];
  colScope: string;
  colQuery: string;
  onClear: () => void;
  /** Overridable so the chip can join a shelf that already has its own top
   *  margin — see `FilterChips`, which is the other thing on that shelf. */
  className?: string;
}) {
  if (!colQuery.trim()) return null;
  const label = searchFields.find((f) => f.key === colScope)?.label ?? "column";
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
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

/**
 * THE FILTERS THAT ARE ON, as removable chips under the toolbar.
 *
 * A COUNT IS NOT AN ANSWER. "Filters 7" says the list has been narrowed and
 * refuses to say how — the only way to find out was to open the panel, walk
 * six facets and read the checkboxes, which is the whole of what the chips do
 * at a glance. And a narrowing you cannot see is one you forget you applied:
 * the empty list that follows reads as "no orders" rather than "no orders that
 * match the six things you asked for".
 *
 * ONE LINE, ALWAYS — IT SCROLLS RATHER THAN WRAPS. This shelf sits between the
 * toolbar and the data and every pixel of it comes out of the data. Wrapped,
 * its height is a function of how many filters are on and how long their names
 * are: tick eight vendors and the board loses three rows of card to a list of
 * what you just did. A capped count would not fix it either — five chips fit
 * on one line or do not depending on the words in them, and nothing can know
 * that without measuring. A scroller is one line at every width and every
 * count, which is the only promise worth making about a strip in this
 * position, and the same call the stage bar makes for the same reason.
 *
 * ONE CHIP PER VALUE, NOT PER FACET. A chip per facet would be shorter and
 * would only be removable whole — and the reason to look at this row at all is
 * usually to take ONE thing off.
 */
export function FilterChips({
  facets,
  selected,
  onChange,
  className,
  children,
}: {
  /** Key → label, for naming the facet a value came from. */
  facets: { key: string; label: string }[];
  /** Applied ids, as `facetKey:option` — what `ListFilters` emits. */
  selected: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
  className?: string;
  /** Anything else on the same shelf — the column-search chip, usually. */
  children?: React.ReactNode;
}) {
  const ids = [...selected];
  if (ids.length === 0) return children ? <>{children}</> : null;

  const labelOf = (key: string) =>
    facets.find((f) => f.key === key)?.label ?? key;

  return (
    <div className={cn("mt-3 flex shrink-0 items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {ids.map((id) => {
          /* SPLIT ON THE FIRST COLON ONLY — a ship-to option can hold one. */
          const at = id.indexOf(":");
          const facet = labelOf(id.slice(0, at));
          const value = id.slice(at + 1);
          return (
            <span
              key={id}
              title={`${facet}: ${value}`}
              className="inline-flex max-w-[220px] shrink-0 items-center gap-1 rounded-full bg-fp-card-1 py-0.5 pr-1 pl-2 text-[11px] text-foreground"
            >
              <span className="truncate">
                <span className="text-muted-foreground">{facet}: </span>
                {value}
              </span>
              <button
                type="button"
                aria-label={`Remove filter ${facet}: ${value}`}
                onClick={() => {
                  const next = new Set(selected);
                  next.delete(id);
                  onChange(next);
                }}
                className="shrink-0 rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        {children}
      </div>
      {/* PINNED OUTSIDE THE SCROLLER, because the way out of a narrowing must
          not itself be somewhere you have to scroll to. Clear All is in the
          panel too — this is where you are when you decide you want none of
          it. */}
      <button
        type="button"
        onClick={() => onChange(new Set())}
        className="shrink-0 rounded-sm text-[11px] text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Clear all
      </button>
    </div>
  );
}
