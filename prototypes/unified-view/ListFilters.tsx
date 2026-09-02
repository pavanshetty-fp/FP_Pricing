import * as React from "react";
import { ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Faceted filter panel, generic over its facets.
 *
 * Structure is the DS panel's (Figma "Action Bar Unit · Filter interactions",
 * 27665:14074): facet side menu + options pane + Clear All / Apply footer, same
 * sizes and classes Fuel Orders proved.
 *
 * SEARCH IS PER-FACET, and that is the rule this carries forward: a facet gets a
 * search field when its list cannot be taken in at once, and does not when it is
 * short enough to scan. `searchable` is an explicit flag rather than a length
 * threshold, so a facet cannot silently gain or lose the control as its options
 * change.
 *
 * DS FOLLOW-UP: this is the parameterised `tables-layout/FilterPanel` that
 * `docs/handoff-ds-adoption-2.md` Task 5 asks for. When the DS version takes
 * facets as props, this file deletes itself.
 */
export interface ListFacetSection {
  title: string;
  options: string[];
}

export interface ListFacet {
  key: string;
  label: string;
  /** Flat option list. Omit when the facet uses `sections`. */
  options?: string[];
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
  f.options ?? f.sections?.flatMap((sec) => sec.options) ?? [];

export function ListFilters({
  facets,
  onApply,
}: {
  facets: ListFacet[];
  /**
   * Fires on Apply and on Clear All with the selected `facetKey:option` ids.
   *
   * Left out, the panel is a composition demo — it shows the interaction and
   * narrows nothing, which is what every screen got before Order Types moved
   * in here from a tab row. A facet that REPLACES working behaviour has to be
   * wired, so the caller passes this and applies what it can.
   */
  onApply?: (selected: ReadonlySet<string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [facetKey, setFacetKey] = React.useState(facets[0]?.key ?? "");
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");

  const facet = facets.find((f) => f.key === facetKey) ?? facets[0];

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const q = query.toLowerCase();
  const match = (o: string) => o.toLowerCase().includes(q);
  /** One shape for both facet kinds: an unlabelled section is a flat list. */
  const sections: ListFacetSection[] = facet
    ? (facet.sections ?? [{ title: "", options: facet.options ?? [] }]).map(
        (sec) => ({ ...sec, options: sec.options.filter(match) })
      )
    : [];
  const hits = sections.reduce((n, sec) => n + sec.options.length, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Button variant="outline" size="sm">
          <ListFilter />
          Filters
          {checked.size > 0 && (
            <span className="ml-1 rounded-full bg-accent px-1.5 text-xs tabular-nums">
              {checked.size}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[600px] overflow-hidden p-0">
        <div className="flex h-[264px]">
          <div className="flex w-[200px] shrink-0 flex-col gap-1 overflow-auto border-r border-border p-2">
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

          <div className="flex min-w-0 flex-1 flex-col">
            {facet?.searchable && (
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
                "min-h-0 flex-1 overflow-auto px-2 pb-2",
                !facet?.searchable && "pt-2"
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
                      const id = `${facet.key}:${opt}`;
                      return (
                        <div
                          key={id}
                          className="flex min-h-8 items-center gap-2 py-1"
                        >
                          <Checkbox
                            checked={checked.has(id)}
                            onCheckedChange={() => toggle(id)}
                            aria-label={opt}
                          />
                          <span className="flex-1 text-sm">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              {hits === 0 && (
                <p className="px-2 py-1 text-sm text-muted-foreground">
                  No matches.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-16 items-center justify-between border-t border-border px-4">
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
              onApply?.(checked);
              setOpen(false);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
