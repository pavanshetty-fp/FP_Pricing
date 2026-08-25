import * as React from "react";
import { ListFilter, ChevronDown, ChevronUp, Search } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
  Faceted Filter panel — Figma "Action Bar Unit · Filter interactions"
  (27665:14074). Opens from the Filters button: a side menu (facets) + an
  options pane (checkbox list, some options expand into sub-selections) + a
  Clear All / Apply Filters footer.
*/

export interface FilterOption {
  key: string;
  label: string;
  sub?: { title: string; items: { key: string; label: string }[] };
}

export interface Facet {
  key: string;
  label: string;
  options: FilterOption[];
  /**
   * Whether this facet's options pane gets a search field.
   *
   * A facet gets one when its list **cannot be taken in at once**; it does not
   * when the list is short enough to scan. On a two-option facet a search field
   * is a control that can only ever filter to one of the two — noise, and it
   * pushes the options down for nothing.
   *
   * This is deliberately an explicit per-facet flag rather than a length
   * threshold. A threshold silently changes a facet's affordance as its options
   * grow or shrink, so the same facet gains and loses a control without anyone
   * deciding.
   */
  searchable?: boolean;
}

const DEFAULT_FACETS: Facet[] = [
  {
    key: "menu-1",
    label: "Menu 1",
    // Long enough that scanning is work — this one earns a search field.
    searchable: true,
    options: [
      { key: "o1", label: "Option Label 1" },
      {
        key: "o4",
        label: "Option Label 4",
        sub: {
          title: "Title 1",
          items: [
            { key: "o4-s1", label: "Sub Selection 1" },
            { key: "o4-s2", label: "Sub Selection 2" },
          ],
        },
      },
      { key: "o2", label: "Option Label 2" },
      { key: "o3", label: "Option Label 3" },
      { key: "o5", label: "Option Label 5" },
      { key: "o6", label: "Option Label 6" },
    ],
  },
  {
    key: "menu-2",
    // Two options: a search field here could only ever filter to one of them.
    label: "Menu 2",
    options: [
      { key: "m2-a", label: "Option Label A" },
      { key: "m2-b", label: "Option Label B" },
    ],
  },
  {
    key: "menu-3",
    label: "Menu 3",
    options: [
      { key: "m3-a", label: "Option Label A" },
      { key: "m3-b", label: "Option Label B" },
      { key: "m3-c", label: "Option Label C" },
      { key: "m3-d", label: "Option Label D" },
    ],
  },
];

export function FilterPanel({
  compact = false,
  facets = DEFAULT_FACETS,
}: {
  compact?: boolean;
  facets?: Facet[];
}) {
  const [open, setOpen] = React.useState(false);
  const [facetKey, setFacetKey] = React.useState(facets[0]?.key ?? "");
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const active = facets.find((f) => f.key === facetKey) ?? facets[0];

  // Switching facets clears the query. Carrying it over would let a term typed
  // on a searchable facet silently filter a facet with no field to clear it in.
  const selectFacet = (key: string) => {
    setFacetKey(key);
    setQuery("");
    setExpanded(null);
  };

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const subCount = (opt: FilterOption) =>
    opt.sub ? opt.sub.items.filter((s) => checked.has(s.key)).length : 0;

  const options = active.searchable
    ? active.options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : active.options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Filters">
                <ListFilter />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Filters</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <ListFilter />
            Filters
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent align="start" className="w-[600px] overflow-hidden p-0">
        <div className="flex h-[264px]">
          {/* Facet side menu */}
          <div className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border p-2">
            {facets.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => selectFacet(f.key)}
                className={cn(
                  "flex h-8 items-center rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
                  active.key === f.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Options pane */}
          <div className="flex min-w-0 flex-1 flex-col">
            {active.searchable && (
              <div className="p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${active.label}…`}
                    aria-label={`Search ${active.label}`}
                    className="h-8 pl-8"
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                "min-h-0 flex-1 overflow-auto px-2 pb-2",
                // Without the search field above it, the list would start flush
                // against the panel edge.
                !active.searchable && "pt-2"
              )}
            >
              {options.map((opt) => {
                const n = subCount(opt);
                const isOpen = expanded === opt.key;
                return (
                  <div key={opt.key}>
                    <div className="flex h-8 items-center gap-2">
                      <Checkbox
                        checked={checked.has(opt.key)}
                        onCheckedChange={() => toggle(opt.key)}
                        aria-label={opt.label}
                      />
                      <span className="flex-1 truncate text-sm">{opt.label}</span>
                      {opt.sub && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : opt.key)}
                          aria-expanded={isOpen}
                          className="flex items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {n > 0 && <span>{n} selections</span>}
                          {isOpen ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {opt.sub && isOpen && (
                      <div className="pl-6">
                        <p className="px-2 py-1 text-xs text-muted-foreground">
                          {opt.sub.title}
                        </p>
                        {opt.sub.items.map((s) => (
                          <div key={s.key} className="flex h-8 items-center gap-2">
                            <Checkbox
                              checked={checked.has(s.key)}
                              onCheckedChange={() => toggle(s.key)}
                              aria-label={s.label}
                            />
                            <span className="truncate text-sm">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex h-16 items-center justify-between border-t border-border px-4">
          <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
            Clear All
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
