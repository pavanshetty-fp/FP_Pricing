import * as React from "react";
import {
  Map as MapIcon,
  Columns3,
  GripVertical,
  KanbanSquare,
  LayoutList,
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
import { Switch } from "@/components/ui/switch";
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
 *          (on the board that last pair is replaced by the card-fields menu)
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
  /**
   * QUICK FILTERS — a segmented control beside the facet panel.
   *
   * For the one or two splits a reader flips between constantly, where opening
   * a panel to tick a box and closing it again is the wrong amount of work.
   * It sits on the LEFT cluster with search and Filters because it narrows the
   * list, which is what everything on that side does; the right-hand side acts
   * on the view. See `docs/ds/ui/2-rules.md` §10.
   *
   * NOT A REPLACEMENT FOR THE PANEL. A split belongs here only when it is
   * exhaustive and short — All plus two or three — and when a reader changes
   * it several times a session. Everything else stays a facet.
   */
  quickFilters?: React.ReactNode;
  /** Right after the Filters button — e.g. Recommendations. */
  afterFilters?: React.ReactNode;
  /**
   * `group` makes an entry a CHILD of the entry with that key — one level, no
   * deeper. A board card is not a flat list of fields: "Customer Details" is a
   * heading with three lines under it, and a reader who wants the account but
   * not the street address had no way to say so while the unit was one switch.
   *
   * Turning a parent off takes its children with it, because the heading is
   * the only thing holding them together; turning the last child off leaves a
   * heading with nothing under it, so it takes the parent too.
   */
  columns: { key: K; label: string; group?: K }[];
  /**
   * THE SAME ORDER THE TABLE IS IN, EDITABLE HERE TOO.
   *
   * Dragging a header is the direct way to move a column and it is only
   * available to columns you can SEE — the one you want is usually the one
   * scrolled off the right edge, which is why you opened this menu. The list
   * is already every column in the table, in order; a grip makes it the place
   * you arrange them as well as the place you choose them.
   *
   * Supply both to turn it on. Left off, the list is still a list.
   */
  columnOrder?: string[];
  onReorderColumns?: (next: string[]) => void;
  hiddenColumns: Set<K>;
  onToggleColumn: (key: K) => void;
  onShowAllColumns: () => void;
  /** Columns the "Search by column" tool can be pointed at. */
  searchFields: ListSearchField[];
  colScope: string;
  onColScopeChange: (v: string) => void;
  colQuery: string;
  onColQueryChange: (v: string) => void;
  /**
   * A FILTER ROW IN THE TABLE, INSTEAD OF A POPOVER THAT SEARCHES ONE COLUMN.
   *
   * The popover asked you to name a column and then type in it — two controls
   * and a menu to do what a box under the header does by sitting there. It
   * also only ever held ONE column at a time, so "Halvorsen, in Fresno" was
   * two searches and the memory of the first. A row of boxes is the same
   * question asked of every column at once, and the answer is where the column
   * is.
   *
   * Supply this and the button becomes a toggle for that row. Leave it off and
   * the popover stays — a table that has not grown the row yet still needs a
   * way to search a column.
   */
  columnFiltersOpen?: boolean;
  onToggleColumnFilters?: () => void;
  /** How many of the row's boxes have something in them. */
  columnFilterCount?: number;
  view: ListView;
  onViewChange: (v: ListView) => void;
  /** Offer the map view. Off unless the records are geographic. */
  mapView?: boolean;
  /**
   * WHETHER THIS LIST HAS A BOARD AT ALL. Default FALSE (2026-10-01) — most
   * lists here have no board, and the ones that do say so.
   *
   * The same call `mapView` makes, and for the same reason: a view switch that
   * offers a board to a list with no board is a dead control, and the rule
   * three lines down — the one that hides the column tools off the table —
   * exists precisely because a control with nothing behind it is worse than no
   * control. A list of standing arrangements has no lanes to put them in.
   */
  boardView?: boolean;
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
  /**
   * OFF WHERE THE VIEW IS ALREADY GROUPED.
   *
   * Grouping cuts a flat list into headed sections. A board has no flat list to
   * cut: it is already sections, one per lane, and that grouping is the view
   * itself rather than a setting on it. A second dimension over the top would
   * have to nest — groups inside lanes, or lanes inside groups — and neither is
   * a board any more. The control stayed on screen doing nothing, which is
   * worse than not offering it.
   */
  showGroupBy?: boolean;
  /**
   * WHAT IS ON THE CARD — the board's own version of the column menu.
   *
   * A card is not a table row: the reader is not choosing columns, they are
   * choosing which UNITS of the record the card carries, and those units nest.
   * "Customer Details" is a heading with three lines under it, and somebody who
   * wants the account but not the street address has to be able to say so.
   *
   * It is a SEPARATE control rather than the column menu re-aimed, because one
   * icon that changes its subject with the view is one icon nobody can read
   * (`docs/ds/ui/2-rules.md` §10). This one is named for the card, carries its
   * own icon, and appears only on the board.
   *
   * NO ORDERING HERE. A card's units read top to bottom in the order the work
   * happens — who it is for, when, what, and who is taking it — which is the
   * card's design, not a preference.
   */
  cardFields?: {
    units: { key: string; label: string; group?: string }[];
    hidden: ReadonlySet<string>;
    onToggle: (key: string) => void;
    onShowAll: () => void;
    /**
     * WHICH LANE THE MENU IS SPEAKING FOR. `null` is every lane at once.
     *
     * A board card is not one design repeated down the page — what a card in
     * the first lane should say is not what one in the last should — so a
     * single field list could only ever be right for one lane. The scope is
     * the first thing in the menu because it changes what every tick under it
     * means.
     */
    scope?: string | null;
    scopes?: { key: string; label: string }[];
    onScopeChange?: (scope: string | null) => void;
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
  quickFilters,
  afterFilters,
  columns,
  hiddenColumns,
  onToggleColumn,
  onShowAllColumns,
  searchFields,
  colScope,
  onColScopeChange,
  colQuery,
  onColQueryChange,
  columnFiltersOpen,
  onToggleColumnFilters,
  columnFilterCount = 0,
  columnOrder,
  onReorderColumns,
  view,
  onViewChange,
  mapView = false,
  boardView = false,
  dateScope,
  dateControl,
  groupBy,
  showGroupBy = true,
  cardFields,
}: ListToolbarProps<K>) {
  const multiView = boardView || mapView;
  const colLabel =
    searchFields.find((f) => f.key === colScope)?.label ?? "column";
  const shown = columns.filter((c) => !hiddenColumns.has(c.key)).length;
  const cardShown = cardFields
    ? cardFields.units.filter((u) => !cardFields.hidden.has(u.key)).length
    : 0;

  /* THE LIST FOLLOWS THE TABLE. Reading them in a different sequence from the
     columns they stand for would make the menu a second opinion about the
     order rather than a view of it. Keys the order has not heard of keep their
     declared place, which is how a saved view survives a new column. */
  const reorderable = Boolean(columnOrder && onReorderColumns);
  const ordered = React.useMemo(() => {
    if (!columnOrder) return columns;
    const rank = new Map(columnOrder.map((k, i) => [k, i]));
    return [...columns].sort((a, b) => {
      const ai = rank.get(a.key) ?? columns.findIndex((c) => c.key === a.key);
      const bi = rank.get(b.key) ?? columns.findIndex((c) => c.key === b.key);
      return ai - bi;
    });
  }, [columns, columnOrder]);

  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);
  /** Puts `key` where `target` sits. */
  const moveColumn = (key: string, target: string) => {
    if (!onReorderColumns || key === target) return;
    const keys = ordered.map((c) => c.key as string);
    const next = keys.filter((k) => k !== key);
    next.splice(next.indexOf(target), 0, key);
    onReorderColumns(next);
  };
  /** One step up or down — the keyboard's version of the same move. */
  const nudgeColumn = (key: string, delta: -1 | 1) => {
    const keys = ordered.map((c) => c.key as string);
    const at = keys.indexOf(key);
    const to = at + delta;
    if (at === -1 || to < 0 || to >= keys.length) return;
    onReorderColumns?.(
      (() => {
        const next = [...keys];
        next.splice(at, 1);
        next.splice(to, 0, key);
        return next;
      })()
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* LEFT — quick filters · search · Filters · Group By

          THE QUICK FILTERS COME FIRST, before the search box, because they are
          the coarsest cut on the row: they decide WHICH SET you are searching
          and filtering inside. Reading left to right then matches the order
          somebody actually narrows — pick the book, then find the row. */}
      <div className="flex items-center gap-3">
        {quickFilters}
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
        {afterFilters}
        {showGroupBy &&
          (groupBy ? (
            <GroupByMenu
              dimensions={groupBy.dimensions}
              value={groupBy.value}
              onChange={groupBy.onChange}
            />
          ) : (
            <GroupByMenu />
          ))}
      </div>

      {/* RIGHT — [date]   view switch │ column tools */}
      <div className="flex items-center gap-1">
        {(dateControl ?? dateScope) && (
          <>
            {dateControl ?? (
              <DateFilter
                value={dateScope!.date}
                onChange={dateScope!.onDateChange}
              />
            )}
            {/* SPACE, NOT A RULE (Pavan, 2026-10-05): 12px plus the row's 4px
                gap each side — 20px between the date and the view switch. */}
            <div className="w-3 shrink-0" aria-hidden />
          </>
        )}

        {/* ONE VIEW, NO SWITCH (Pavan, 2026-10-01). A table-only list gets no
            Table-view icon — a switch with one position switches nothing.
            The column tools after it stay: they belong to the table. */}
        {multiView && (
          <IconTool
            label="Table view"
            active={view === "table"}
            onClick={() => onViewChange("table")}
          >
            <Table2 />
          </IconTool>
        )}
        {boardView && (
          <IconTool
            label="Board view"
            active={view === "board"}
            onClick={() => onViewChange("board")}
          >
            <KanbanSquare />
          </IconTool>
        )}
        {mapView && (
          <IconTool
            label="Map view"
            active={view === "map"}
            onClick={() => onViewChange("map")}
          >
            <MapIcon />
          </IconTool>
        )}

        {/* COLUMN TOOLS ARE A TABLE'S TOOLS, AND ONLY A TABLE'S.

            Search by column and Show/Hide columns both name a thing the reader
            can see: a header to type under, a column to take away. On a board
            or a map there are no columns on screen, so the controls were either
            doing nothing or — worse, on the board — quietly redefining
            themselves to mean the card's units, which is a second meaning for
            one button that nobody could guess from the icon.

            The board's units did not go away with the button: they have their
            own control below, named for the card and shown only on the board.

            THIS IS A LIST RULE, NOT A 3PL ONE: it lives here so every screen
            using this toolbar gets it. See `docs/ds/ui/2-rules.md` §10. */}
        {view === "table" && (
          <>
        {multiView && <div className="mx-1 h-5 w-px bg-border" aria-hidden />}

        {/* Search by column — the row, where the table has one. */}
        {onToggleColumnFilters ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Search by column"
                aria-pressed={columnFiltersOpen}
                onClick={onToggleColumnFilters}
                className={cn(
                  (columnFiltersOpen || columnFilterCount > 0) &&
                    "bg-accent text-foreground"
                )}
              >
                <TextSearch />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {columnFiltersOpen ? "Hide column search" : "Search by column"}
            </TooltipContent>
          </Tooltip>
        ) : (
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
        )}

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
            <div className="max-h-64 overflow-y-auto">
              {ordered.map((c) => {
                const draggable = reorderable && !c.group;
                return (
                  <div
                    key={c.key}
                    draggable={draggable}
                    onDragStart={
                      draggable
                        ? (e) => {
                            setDragKey(c.key);
                            e.dataTransfer.effectAllowed = "move";
                            /* Firefox starts no drag without payload. */
                            e.dataTransfer.setData("text/plain", c.key);
                          }
                        : undefined
                    }
                    onDragOver={
                      draggable
                        ? (e) => {
                            if (!dragKey || dragKey === c.key) return;
                            e.preventDefault();
                            setOverKey(c.key);
                          }
                        : undefined
                    }
                    onDrop={
                      draggable
                        ? (e) => {
                            e.preventDefault();
                            if (dragKey) moveColumn(dragKey, c.key);
                            setDragKey(null);
                            setOverKey(null);
                          }
                        : undefined
                    }
                    onDragEnd={() => {
                      setDragKey(null);
                      setOverKey(null);
                    }}
                    className={cn(
                      "flex items-center rounded-sm transition-colors hover:bg-accent has-[:focus-visible]:bg-accent",
                      dragKey === c.key && "opacity-40",
                      /* WHERE IT WILL LAND, on the row it will land on. A line
                         between rows would need to know which side of the gap
                         the pointer is on; tinting the target says the same
                         thing and cannot be off by one. */
                      overKey === c.key && dragKey && "bg-accent"
                    )}
                  >
                    {reorderable && (
                      <span
                        className={cn(
                          "flex w-5 shrink-0 items-center justify-center self-stretch",
                          draggable
                            ? "cursor-grab text-muted-foreground active:cursor-grabbing"
                            : "opacity-0"
                        )}
                        aria-hidden={!draggable}
                      >
                        {draggable && <GripVertical className="size-3.5" />}
                      </span>
                    )}
                    <label
                      className={cn(
                        "flex flex-1 cursor-pointer items-center gap-2 py-1.5 pr-2 text-sm",
                        /* THE INDENT IS THE ONLY THING SAYING "UNDER". A child
                           at the parent's left edge is a sibling with a smaller
                           label; the offset and the lighter weight say which
                           heading it belongs to without a line or a disclosure
                           arrow. */
                        c.group
                          ? "pl-5 text-[13px] text-muted-foreground"
                          : reorderable
                            ? "pl-0"
                            : "pl-2"
                      )}
                      /* THE KEYBOARD MOVES IT TOO. A grip nobody can reach
                         without a mouse is an ordering only some readers get
                         to change. */
                      onKeyDown={
                        draggable
                          ? (e) => {
                              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.preventDefault();
                                nudgeColumn(c.key, e.key === "ArrowUp" ? -1 : 1);
                              }
                            }
                          : undefined
                      }
                    >
                      <Checkbox
                        checked={!hiddenColumns.has(c.key)}
                        onCheckedChange={() => onToggleColumn(c.key)}
                      />
                      <span className="flex-1 truncate">{c.label}</span>
                    </label>
                  </div>
                );
              })}
            </div>
            <Separator className="my-1" />
            {/* SHOW ALL, AND NOTHING FACING IT. Hide all emptied the table —
                a control whose only outcome is a screen with no data in it,
                sitting one slip of the hand from the one people actually use.
                Show all is a way BACK from a narrowing, which is the only one
                of the two anybody was reaching for; alone, it goes to the
                right, where the act in a footer belongs. */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                disabled={hiddenColumns.size === 0}
                onClick={onShowAllColumns}
              >
                Show all
              </Button>
            </div>
          </PopoverContent>
        </Popover>
          </>
        )}

        {/* WHAT IS ON THE CARD — the board's own control, in the slot the
            column tools vacate. Same place, different subject, and the subject
            is written at the top of the menu and spoken by the icon, so the
            two can never be mistaken for one control that moved. */}
        {view === "board" && cardFields && (
          <>
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Card fields"
                    >
                      <LayoutList />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Card fields</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-60 p-1">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Card fields
                  </span>
                  <span className="rounded bg-fp-card-1 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                    {cardShown}/{cardFields.units.length}
                  </span>
                </div>
                {/* WHICH CARDS THIS IS ABOUT, above the ticks it governs. A
                    card in the first lane and one in the last are answering
                    different questions, so the field list has to be able to
                    differ between them — and the reader has to be told which
                    set they are editing BEFORE they edit it, not after. */}
                {cardFields.scopes && cardFields.onScopeChange && (
                  <div className="px-2 pb-2">
                    <Combobox
                      size="sm"
                      className="w-full"
                      value={cardFields.scope ?? ALL_LANES}
                      onValueChange={(v) =>
                        cardFields.onScopeChange?.(v === ALL_LANES ? null : v)
                      }
                      options={[
                        { value: ALL_LANES, label: "All lanes" },
                        ...cardFields.scopes.map((sc) => ({
                          value: sc.key,
                          label: sc.label,
                        })),
                      ]}
                      placeholder="All lanes"
                      searchPlaceholder="Search lanes…"
                      emptyText="No lane found."
                    />
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto">
                  {/* A TOGGLE PER CATEGORY, a tick per field inside it (Pavan,
                      2026-09-23). The category — Customer, Asset & Fault — is
                      the decision somebody actually makes about a card, so it
                      is a switch: on or off, and it reads that way. Its fields
                      are the finer adjustment, shown only while the category
                      is on, because ticking a field inside a hidden block
                      changes nothing anybody can see. */}
                  {cardFields.units.map((u) => {
                    if (!u.group) {
                      const on = !cardFields.hidden.has(u.key);
                      return (
                        <label
                          key={u.key}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent has-[:focus-visible]:bg-accent"
                        >
                          <span className="flex-1 truncate">{u.label}</span>
                          <Switch
                            size="sm"
                            checked={on}
                            onCheckedChange={() => cardFields.onToggle(u.key)}
                          />
                        </label>
                      );
                    }
                    if (cardFields.hidden.has(u.group)) return null;
                    return (
                      <label
                        key={u.key}
                        className="flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-5 text-[13px] text-muted-foreground transition-colors hover:bg-accent has-[:focus-visible]:bg-accent"
                      >
                        <Checkbox
                          checked={!cardFields.hidden.has(u.key)}
                          onCheckedChange={() => cardFields.onToggle(u.key)}
                        />
                        <span className="flex-1 truncate">{u.label}</span>
                      </label>
                    );
                  })}
                </div>
                <Separator className="my-1" />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cardFields.hidden.size === 0}
                    onClick={cardFields.onShowAll}
                  >
                    Show all
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    </div>
  );
}

/* The scope option standing for "every lane". A sentinel rather than "" —
   the combobox treats an empty value as nothing chosen. */
const ALL_LANES = "__all__";

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
