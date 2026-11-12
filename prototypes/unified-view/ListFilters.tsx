import * as React from "react";
import { History, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  clearActiveFilters,
  groupIds,
  listKeyOf,
  readHistory,
  recordHistory,
  setActiveFilters,
  type HistoryEntry,
} from "./filterMemory";

/**
 * Faceted filter panel, generic over its facets.
 *
 * Structure is the DS panel's (Figma "Action Bar Unit · Filter interactions",
 * 27665:14074): facet side menu + options pane + Clear All / Apply footer, same
 * sizes and classes Fuel Orders proved.
 *
 * EVERY FACET HAS A SEARCH (Pavan, 2026-11-02 — was per-facet via
 * `searchable`, which is now ignored): short lists too, so the pane is the
 * same whichever facet is open.
 *
 * DS FOLLOW-UP: this is the parameterised `tables-layout/FilterPanel` that
 * `docs/handoff-ds-adoption-2.md` Task 5 asks for. When the DS version takes
 * facets as props, this file deletes itself.
 */
/**
 * An option is either a bare value, or a value with a second line under it —
 * a ship-to needs its address to be told apart from a similarly-named site, and
 * the checkbox label alone cannot carry that.
 */
export type ListOption = string | { value: string; description: string };

const optionValue = (o: ListOption) => (typeof o === "string" ? o : o.value);
const optionDescription = (o: ListOption) =>
  typeof o === "string" ? undefined : o.description;

export interface ListFacetSection {
  title: string;
  options: ListOption[];
}

export interface ListFacet {
  key: string;
  label: string;
  /** Flat option list. Omit when the facet uses `sections`. */
  options?: ListOption[];
  /**
   * A facet that asks the SAME question at several grains — ship-to name, ZIP,
   * state are all "which address" — puts them in one pane under sub-headings
   * rather than eating three rows of the facet menu. Selections across sections
   * are independent, and the facet's count is their total.
   */
  sections?: ListFacetSection[];
  /** Give the options pane a search field. Off for lists you can take in whole. */
  searchable?: boolean;
}

/** Every option a facet holds, flat — for counting and for search. */
const facetOptions = (f: ListFacet): string[] =>
  (f.options ?? f.sections?.flatMap((sec) => sec.options) ?? []).map(optionValue);

export function ListFilters({
  facets,
  value,
  onApply,
  fullWidth = false,
  countFor,
  historyKey,
}: {
  facets: ListFacet[];
  /** Which list's RECENT HISTORY this is — defaults to the facets it has. */
  historyKey?: string;
  /** Stretch the trigger to its container — for a row of its own, in a sheet. */
  fullWidth?: boolean;
  /**
   * What is actually applied, when the caller keeps it.
   *
   * The panel STAGES changes — nothing narrows until Apply — so it holds its
   * own working copy, and that copy has to be reset to the truth each time the
   * panel opens or it will re-apply a tick the reader took off somewhere else.
   * Somewhere else is the chip shelf: take a chip off, open the panel, and
   * without this the checkbox would still be on.
   */
  value?: ReadonlySet<string>;
  /**
   * Fires on Apply and on Clear All with the selected `facetKey:option` ids.
   *
   * Left out, the panel is a composition demo — it shows the interaction and
   * narrows nothing, which is what every screen got before Order Types moved
   * in here from a tab row. A facet that REPLACES working behaviour has to be
   * wired, so the caller passes this and applies what it can.
   */
  onApply?: (selected: ReadonlySet<string>) => void;
  /**
   * HOW MANY ROWS THE TICKS WOULD LEAVE (Pavan, 2026-10-05) — shown on the
   * footer's left as the reader ticks, before Apply. The screen answers it
   * with the same narrowing it applies, everything else on screen included
   * (search, column boxes, scope). Left out, the footer has no count.
   */
  countFor?: (selected: ReadonlySet<string>) => number;
}) {
  const [open, setOpen] = React.useState(false);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  /* RECENT HISTORY (Pavan, 2026-10-21) — the toolbar's panel only; the
     export sheet's copy applies as it goes and keeps none. */
  const list = historyKey ?? listKeyOf(facets);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  /* THE VIEW ROW NAMES A VIEW FROM WHAT IS ON — see `filterMemory`. */
  React.useEffect(() => {
    if (fullWidth) return;
    setActiveFilters(facets, value ?? checked);
    return () => clearActiveFilters(facets);
  });

  const applied = value ? value.size : checked.size;

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next && value) setChecked(new Set(value));
        if (next && !fullWidth) setHistory(readHistory(list));
        setOpen(next);
      }}
    >
      {/* `asChild` slots onto exactly ONE child, so this note sits outside the
          trigger — as raw text inside it, React counted it as a second child and
          Radix threw "failed to slot onto its children".
          `bg-transparent` makes the button outline-only, like the search field
          beside it: the DS `outline` variant fills with `bg-background` (#efefeb
          light), the APP background, which is right when the button sits on it
          and wrong here on the white content layer, where it read as a filled
          grey block next to a transparent input. The stroke moves to
          `--input` so it matches the field beside it: the `outline` variant uses
          `--border` in light but ALREADY uses `--input` in dark, so light was the
          odd one out and the button read a shade lighter than the input. */}
      <PopoverTrigger asChild>
        {fullWidth ? (
          /* IN THE EXPORT SHEET, AN ICON (Pavan, 2026-11-12) — the same
             popover as the page's Filters, opened from a filter icon beside
             the count. */
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={applied > 0 ? `Filters, ${applied} applied` : "Filters"}
            className="relative"
          >
            <ListFilter />
            {applied > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-accent px-1 text-[10px] leading-4 tabular-nums text-accent-foreground">
                {applied}
              </span>
            )}
          </Button>
        ) : (
        <Button
          variant="outline"
          size="sm"
        >
          <ListFilter />
          Filters
          {/* THE COUNT IS WHAT IS APPLIED, NOT WHAT IS TICKED. The panel's own
              ticks are a draft until Apply, and the button is read with the
              panel shut — a number that moved as you ticked would be counting
              a narrowing that has not happened. It also has to follow a chip
              being taken off outside the panel. Falls back to the ticks only
              where the caller does not keep the applied set. */}
          {applied > 0 && (
            <span className="ml-1 rounded-full bg-accent px-1.5 text-xs tabular-nums">
              {applied}
            </span>
          )}
        </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={fullWidth ? "end" : "start"} className="w-[600px] overflow-hidden p-0">
        <ListFilterPanel
          facets={facets}
          checked={checked}
          onToggle={toggle}
          menuWidth={200}
          height={264}
          history={fullWidth ? undefined : history}
          onPickHistory={(ids) => setChecked(new Set(ids))}
        />

        {/* THE COUNT ON THE LEFT, BOTH ACTS ON THE RIGHT (Pavan,
            2026-10-05). The number is what Apply would show — read before
            committing to it. Clear All sits beside Apply as its quieter
            sibling, not across the bar from it. */}
        <div className="flex h-16 items-center justify-between gap-3 border-t border-border px-4">
          <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {countFor && (
              <>
                <span className="font-medium text-foreground">
                  {countFor(checked).toLocaleString()}
                </span>{" "}
                {countFor(checked) === 1 ? "result" : "results"}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const empty = new Set<string>();
                setChecked(empty);
                onApply?.(empty);
              }}
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!fullWidth) recordHistory(list, checked);
                onApply?.(checked);
                setOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The panel's BODY — facet menu, options pane — with no chrome of its own.
 *
 * Split out so the same two panes can be a popover on a toolbar and a plain
 * block inside a sheet. The export sheet takes the second form: a panel that
 * opens another floating panel on top of itself is two layers deep for one
 * question, and the reader loses sight of the count they are deciding about.
 *
 * IT DOES NOT OWN WHAT IS TICKED. The popover stages its ticks until Apply and
 * the sheet applies them as they happen, and that difference belongs to the
 * caller — this renders a set and reports toggles.
 */
export function ListFilterPanel({
  facets,
  checked,
  onToggle,
  menuWidth = 200,
  height,
  className,
  history,
  onPickHistory,
}: {
  facets: ListFacet[];
  /** RECENT HISTORY — filter sets applied in the last 24 hours. The menu
      leads with it only when there are some. */
  history?: HistoryEntry[];
  onPickHistory?: (ids: string[]) => void;
  /** Ticked ids, as `facetKey:option`. */
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** The facet column's width. Narrower inside a sheet than in the popover. */
  menuWidth?: number;
  /**
   * Fix the panes' height and let them scroll inside it.
   *
   * FOR A POPOVER, which cannot grow past the window it floats in. Left out —
   * the sheet — the panel is as tall as its longest pane and nothing scrolls:
   * a facet list in a column with room to spare does not need a viewport of its
   * own, and a scroller hides how much there is to read.
   */
  height?: number;
  className?: string;
}) {
  const [facetKey, setFacetKey] = React.useState(facets[0]?.key ?? "");
  const [query, setQuery] = React.useState("");

  const HISTORY = "__history";
  const showHistory = facetKey === HISTORY && Boolean(history?.length);
  const facet = facets.find((f) => f.key === facetKey) ?? facets[0];

  const q = query.toLowerCase();
  /* Search matches the description as well as the value: on a ship-to facet the
     address IS what people search by — a city or a state, not the site name. */
  const match = (o: ListOption) =>
    optionValue(o).toLowerCase().includes(q) ||
    (optionDescription(o) ?? "").toLowerCase().includes(q);
  /** One shape for both facet kinds: an unlabelled section is a flat list. */
  const sections: ListFacetSection[] = facet
    ? (facet.sections ?? [{ title: "", options: facet.options ?? [] }]).map(
        (sec) => ({ ...sec, options: sec.options.filter(match) })
      )
    : [];
  const hits = sections.reduce((n, sec) => n + sec.options.length, 0);

  const scrolls = height !== undefined;

  return (
    <div className={cn("flex", className)} style={height ? { height } : undefined}>
      <div
        className={cn(
          "flex shrink-0 flex-col gap-1 border-r border-border p-2",
          scrolls && "overflow-auto"
        )}
        style={{ width: menuWidth }}
      >
        {history && history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFacetKey(HISTORY);
              setQuery("");
            }}
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
              showHistory ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="size-4 shrink-0" />
            <span className="flex-1 truncate">Recent history</span>
            <span className="text-xs tabular-nums text-muted-foreground">{history.length}</span>
          </button>
        )}
        {facets.map((f) => {
          const n = facetOptions(f).filter((o) =>
            checked.has(`${f.key}:${o}`)
          ).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFacetKey(f.key);
                setQuery("");
              }}
              className={cn(
                "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
                facetKey === f.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex-1 truncate">{f.label}</span>
              {n > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showHistory ? (
        /* EACH SET AS IT WAS APPLIED, by category — a press puts its ticks
           back; Apply applies them. */
        <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 p-2", scrolls && "min-h-0 overflow-auto")}>
          {history!.map((e) => {
            const on = e.ids.length === checked.size && e.ids.every((id) => checked.has(id));
            return (
              <button
                key={e.at}
                type="button"
                aria-pressed={on}
                onClick={() => onPickHistory?.(e.ids)}
                className={cn(
                  "flex flex-col gap-1 rounded-md border px-3 py-2 text-left outline-none transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50",
                  on ? "border-selected-border bg-selected" : "border-border"
                )}
              >
                {groupIds(facets, e.ids).map((g) => (
                  <span key={g.key} className="flex min-w-0 gap-1.5 text-sm">
                    <span className="shrink-0 text-muted-foreground">{g.label}</span>
                    <span className="truncate text-foreground">{g.values.join(", ")}</span>
                  </span>
                ))}
                <span className="text-xs text-muted-foreground">{ago(e.at)}</span>
              </button>
            );
          })}
        </div>
      ) : (
      <div className="flex min-w-0 flex-1 flex-col">
        {/* EVERY FACET GETS A SEARCH (Pavan, 2026-11-02) — even a short
            list; the pane reads the same whichever facet is open. */}
        {facet && (
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${facet.label.toLowerCase()}…`}
                className="h-8 pl-8"
              />
            </div>
          </div>
        )}
        <div
          className={cn(
            "flex-1 px-2 pb-2",
            scrolls && "min-h-0 overflow-auto"
          )}
        >
          {sections.map((sec) =>
            sec.options.length === 0 ? null : (
              <div key={sec.title || "flat"} className="flex flex-col">
                {sec.title && (
                  <p className="px-0.5 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {sec.title}
                  </p>
                )}
                {sec.options.map((opt) => {
                  const value = optionValue(opt);
                  const description = optionDescription(opt);
                  const id = `${facet.key}:${value}`;
                  return (
                    <label
                      key={id}
                      className="flex min-h-8 items-start gap-2 py-1"
                    >
                      <Checkbox
                        checked={checked.has(id)}
                        onCheckedChange={() => onToggle(id)}
                        aria-label={value}
                        /* Nudged down so it centres on the FIRST line, not on
                           the two-line block. */
                        className="mt-0.5"
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm">{value}</span>
                        {description && (
                          <span className="text-xs text-muted-foreground">
                            {description}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )
          )}
          {hits === 0 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

/** "Just now", "12 min ago", "3 h ago" — inside the 24 hours history keeps. */
function ago(at: number) {
  const min = Math.round((Date.now() - at) / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  return `${Math.round(min / 60)} h ago`;
}
