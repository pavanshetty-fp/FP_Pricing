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
import { FUEL_ORDERS } from "./data";

/*
  Fuel Orders filters — the DS faceted Filter panel (Figma "Action Bar Unit ·
  Filter interactions", 27665:14074): facet side menu + options pane (search +
  checkbox list) + Clear All / Apply footer. Structure, sizes and classes are
  the DS panel's; only the facets and options are this screen's.

  The source Sales Console showed these as six standalone pills; they collapse in
  here, which is why this screen has no second toolbar row. Delivery Date is the
  exception — it lives in the toolbar as its own stepper (see DateFilter).
*/

/** Options read off the dataset, so the facet lists can't drift from the rows. */
const uniq = (xs: string[]) => Array.from(new Set(xs));

const CUSTOMERS = uniq(FUEL_ORDERS.map((o) => o.customer.title));
const SHIP_TOS = uniq(FUEL_ORDERS.map((o) => o.customer.description));
const PRODUCTS = uniq(FUEL_ORDERS.flatMap((o) => o.products.map((p) => p.name)));

interface Facet {
  key: string;
  label: string;
  options?: string[];
  /** Known gap — the source app's options for this facet weren't captured. */
  unknown?: boolean;
}

const FACETS: Facet[] = [
  { key: "type", label: "Type", options: ["Delivery", "Extraction"] },
  { key: "status", label: "Status", options: ["Assigned", "Unassigned"] },
  { key: "customer", label: "Customer", options: CUSTOMERS },
  { key: "shipTo", label: "Ship-To", options: SHIP_TOS },
  { key: "category", label: "Category", unknown: true },
  { key: "product", label: "Product", options: PRODUCTS },
];

export function FuelOrdersFilters() {
  const [open, setOpen] = React.useState(false);
  const [facetKey, setFacetKey] = React.useState(FACETS[0].key);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");

  const facet = FACETS.find((f) => f.key === facetKey) ?? FACETS[0];

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const options = (facet.options ?? []).filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          {/* Facet side menu */}
          <div className="flex w-[200px] shrink-0 flex-col gap-1 overflow-auto border-r border-border p-2">
            {FACETS.map((f) => {
              const n = (f.options ?? []).filter((o) => checked.has(`${f.key}:${o}`))
                .length;
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

          {/* Options pane */}
          <div className="flex min-w-0 flex-1 flex-col">
            {facet.unknown ? (
              // Known gap — this facet exists in the source app but its options
              // were not captured. Left visible rather than invented.
              <p className="p-3 text-sm text-muted-foreground">
                Options for “{facet.label}” haven’t been captured from the source
                app yet.
              </p>
            ) : (
              <>
                <div className="p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${facet.label.toLowerCase()}`}
                      className="h-8 pl-8"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
                  {options.map((opt) => {
                    const id = `${facet.key}:${opt}`;
                    return (
                      <div key={id} className="flex min-h-8 items-center gap-2 py-1">
                        <Checkbox
                          checked={checked.has(id)}
                          onCheckedChange={() => toggle(id)}
                          aria-label={opt}
                        />
                        <span className="flex-1 text-sm">{opt}</span>
                      </div>
                    );
                  })}
                  {options.length === 0 && (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      No matches.
                    </p>
                  )}
                </div>
              </>
            )}
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
