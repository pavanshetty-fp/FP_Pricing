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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
 * THE FILTERS THAT ARE ON, as one chip per facet under the toolbar.
 *
 * A COUNT IS NOT AN ANSWER. "Filters 7" says the list has been narrowed and
 * refuses to say how — the only way to find out was to open the panel, walk
 * six facets and read the checkboxes, which is the whole of what this shelf
 * does at a glance. And a narrowing you cannot see is one you forget you
 * applied: the short list that follows reads as "no customers" rather than "no
 * customers that match the seven things you asked for".
 *
 * ONE CHIP PER FACET, NOT PER VALUE. Per value, three cities were three chips
 * that said "City" three times to say one thing — and the row grew with the
 * TICKS rather than with the questions, so picking six cities buried the one
 * status filter that was also on. Grouped, the shelf is as long as the number
 * of QUESTIONS you have asked, which is a small number and a stable one, and
 * the shape of the narrowing is legible from across the room: Status, City,
 * Vendor.
 *
 * ONE VALUE SHOWS ITSELF; SEVERAL SHOW A COUNT. "City: Bakersfield" is shorter
 * than "City 1" and says more, so a lone value is never hidden behind a digit.
 * Past one there is no width to say them all and no honest way to pick which
 * one to print, so the chip says how many and the hover card says which —
 * WITH their own crosses, because the reason to look at this row is usually to
 * take ONE thing off, and a group that could only be removed whole would send
 * you back to the panel to do it.
 *
 * ONE LINE, ALWAYS — IT SCROLLS RATHER THAN WRAPS. This shelf sits between the
 * toolbar and the data and every pixel of it comes out of the data. Wrapped,
 * its height is a function of how many filters are on and how long their names
 * are. Grouping makes a second line unlikely; the scroller makes it
 * impossible, which is the only promise worth making about a strip in this
 * position.
 */
export function FilterChips({
  facets,
  selected,
  onChange,
  className,
  children,
}: {
  /** Key → label, in the order the panel lists them. */
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

  const drop = (gone: string[]) => {
    const next = new Set(selected);
    for (const id of gone) next.delete(id);
    onChange(next);
  };

  /* GROUPED IN THE PANEL'S OWN ORDER, so the shelf and the facet menu read the
     same way round. Ids whose facet is not declared keep their raw key and go
     last rather than disappearing. */
  const groups: { key: string; label: string; ids: string[] }[] = [];
  const bucket = (key: string, label: string) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label, ids: [] }));
    return g;
  };
  for (const f of facets) {
    const mine = ids.filter((id) => id.startsWith(`${f.key}:`));
    if (mine.length) bucket(f.key, f.label).ids.push(...mine);
  }
  for (const id of ids) {
    /* SPLIT ON THE FIRST COLON ONLY — a ship-to option can hold one. */
    const key = id.slice(0, id.indexOf(":"));
    if (!facets.some((f) => f.key === key)) bucket(key, key).ids.push(id);
  }

  const valueOf = (id: string) => id.slice(id.indexOf(":") + 1);

  return (
    <div className={cn("mt-3 flex shrink-0 items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {groups.map((g) => {
          const one = g.ids.length === 1;
          const chip = (
            <span
              className={cn(
                "inline-flex max-w-[240px] shrink-0 items-center gap-1 rounded-full bg-fp-card-1 py-0.5 pr-1 pl-2 text-[11px] text-foreground",
                !one && "cursor-default"
              )}
            >
              <span className="truncate">
                <span className="text-muted-foreground">
                  {g.label}
                  {one ? ": " : " "}
                </span>
                {one ? valueOf(g.ids[0]) : null}
              </span>
              {!one && (
                <span className="shrink-0 rounded-full bg-accent px-1.5 tabular-nums">
                  {g.ids.length}
                </span>
              )}
              <button
                type="button"
                aria-label={
                  one
                    ? `Remove filter ${g.label}: ${valueOf(g.ids[0])}`
                    : `Remove all ${g.ids.length} ${g.label} filters`
                }
                onClick={() => drop(g.ids)}
                className="shrink-0 rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3" />
              </button>
            </span>
          );

          if (one) return <React.Fragment key={g.key}>{chip}</React.Fragment>;

          return (
            <HoverCard key={g.key} openDelay={120} closeDelay={120}>
              <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
              <HoverCardContent
                align="start"
                className="w-auto max-w-[280px] min-w-[180px] p-1.5"
              >
                <p className="px-1.5 pb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  {g.label}
                </p>
                <ul className="flex flex-col">
                  {g.ids.map((id) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-sm py-0.5 pr-0.5 pl-1.5 hover:bg-accent/60"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                        {valueOf(id)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove filter ${g.label}: ${valueOf(id)}`}
                        onClick={() => drop([id])}
                        className="shrink-0 rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </HoverCardContent>
            </HoverCard>
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
