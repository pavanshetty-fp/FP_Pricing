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

/*
  Faceted Filter panel — Figma "Action Bar Unit · Filter interactions"
  (27665:14074). Opens from the Filters button: a side menu (facets) + an
  options pane (search + checkbox list, some options expand into sub-selections)
  + a Clear All / Apply Filters footer.
*/

const FACETS = ["Menu 1", "Menu 2", "Menu 3"];

interface Option {
  key: string;
  label: string;
  sub?: { title: string; items: { key: string; label: string }[] };
}

const OPTIONS: Option[] = [
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
];

export function FilterPanel() {
  const [open, setOpen] = React.useState(false);
  const [facet, setFacet] = React.useState(FACETS[0]);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const subCount = (opt: Option) =>
    opt.sub ? opt.sub.items.filter((s) => checked.has(s.key)).length : 0;

  const options = OPTIONS.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilter />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[600px] overflow-hidden p-0">
        <div className="flex h-[264px]">
          {/* Facet side menu */}
          <div className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border p-2">
            {FACETS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFacet(f)}
                className={cn(
                  "flex h-8 items-center rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
                  facet === f
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Options pane */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search object"
                  className="h-8 pl-8"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
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
