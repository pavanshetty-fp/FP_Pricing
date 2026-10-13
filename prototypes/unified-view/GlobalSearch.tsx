import * as React from "react";
import {
  ClipboardList,
  Database,
  Fuel,
  LayoutGrid,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  KIND_LABEL,
  SEARCH_SCOPES,
  groupByKind,
  searchAll,
  type SearchEntry,
  type SearchKind,
} from "./searchIndex";

/**
 * Global search — one query across every segment.
 *
 * STRUCTURE from the reference, VISUALS from the DS. What was taken: scope tabs
 * with a live result count, results grouped by segment, a recent + pages empty
 * state, a right-aligned segment badge per row, and a keyboard-hint footer. What
 * was NOT taken: the reference's own palette (it is a light theme; this runs in
 * FP-dark by default and reads its colours from the token layer) and its scope
 * taxonomy — 3PL / Lease / Sales / Pricing / Shared are modules this prototype
 * does not have, so the scopes here are the four segments that actually exist.
 *
 * Built on the DS `Command` (cmdk) inside a `Dialog`, so arrow-key navigation,
 * the active-row highlight and type-ahead filtering are the DS's behaviour
 * rather than re-implemented. cmdk's own filter is disabled — `shouldFilter`
 * false — because the matching is done in `searchAll`, which matches every word
 * of the query in any order across every field. cmdk's default is a single
 * fuzzy pass over one string and would quietly disagree with the count shown in
 * the tab row.
 *
 * DS FOLLOW-UP: this is a command palette, not a Fuel-Orders thing. It belongs
 * in the DS beside `top-bar/`, taking its index and scopes as props.
 */

const KIND_ICON: Record<SearchKind, React.ReactNode> = {
  page: <LayoutGrid />,
  "fuel-order": <Fuel />,
  "asset-order": <ClipboardList />,
  "broker-order": <Truck />,
  customer: <Users />,
  asset: <Database />,
};

/** Seeded so the empty state is not blank on first open. */
const RECENT_IDS = ["page-sales-orders", "cu-cu-2"];

export interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Go to a result: switch MODULE and rail destination, then open the record if
   * there is one. The module is part of the address — without it a 3PL hit found
   * while the Sales module is active would set a rail key that module does not
   * have.
   */
  onNavigate: (moduleKey: string, navKey: string, recordId: string | null) => void;
}

export function GlobalSearch({ open, onOpenChange, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState<SearchKind | "all">("all");

  // Reset on every open — a palette that reopens mid-query is disorienting.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setScope("all");
  }, [open]);

  const hits = React.useMemo(() => searchAll(query, scope), [query, scope]);
  const groups = React.useMemo(() => groupByKind(hits), [hits]);
  const searching = query.trim().length > 0;

  // Empty state: recents, then every page (respecting the active scope).
  const recents = React.useMemo(
    () =>
      RECENT_IDS.map((id) => searchAll("", "all").find((e) => e.id === id)).filter(
        (e): e is SearchEntry => Boolean(e)
      ),
    []
  );
  const pages = React.useMemo(
    () => searchAll("", scope).filter((e) => e.kind === "page"),
    [scope]
  );

  const go = (e: SearchEntry) => {
    onNavigate(e.moduleKey, e.navKey, e.recordId);
    onOpenChange(false);
  };

  const scopeIndex = SEARCH_SCOPES.findIndex((s) => s.key === scope);
  const cycleScope = () =>
    setScope(SEARCH_SCOPES[(scopeIndex + 1) % SEARCH_SCOPES.length].key);

  const Row = ({ entry }: { entry: SearchEntry }) => (
    <CommandItem
      key={entry.id}
      value={entry.id}
      onSelect={() => go(entry)}
      className="gap-3 py-2"
      icon={
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-fp-card-1 text-muted-foreground [&_svg]:size-4">
          {KIND_ICON[entry.kind]}
        </span>
      }
      shortcut={
        <Pill>
          {KIND_LABEL[entry.kind]}
        </Pill>
      }
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {entry.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {entry.subtitle}
        </span>
      </span>
    </CommandItem>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-[12%] w-full translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <Command
          shouldFilter={false}
          loop
          onKeyDown={(e) => {
            // Tab cycles the scope, as the footer advertises.
            if (e.key === "Tab") {
              e.preventDefault();
              cycleScope();
            }
          }}
        >
          {/* Query row */}
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything — orders, customers, assets, pages"
              aria-label="Search everything"
              className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Esc</Kbd>
          </div>

          {/* Scope tabs + live count */}
          <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            {SEARCH_SCOPES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScope(s.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  scope === s.key
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
            <span className="ml-auto shrink-0 pr-1 text-xs tabular-nums text-muted-foreground">
              {searching
                ? `${hits.length} result${hits.length === 1 ? "" : "s"}`
                : `${pages.length} page${pages.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <CommandList className="max-h-[52vh]">
            {searching ? (
              <>
                <CommandEmpty>
                  No results for “{query.trim()}”
                  {scope !== "all"
                    ? ` in ${SEARCH_SCOPES.find((s) => s.key === scope)?.label}`
                    : ""}
                  .
                </CommandEmpty>
                {groups.map((g) => (
                  <CommandGroup key={g.kind} heading={g.label}>
                    {g.items.slice(0, 6).map((e) => (
                      <Row key={e.id} entry={e} />
                    ))}
                    {g.items.length > 6 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        +{g.items.length - 6} more in {g.label}
                      </div>
                    )}
                  </CommandGroup>
                ))}
              </>
            ) : (
              <>
                {scope === "all" && recents.length > 0 && (
                  <CommandGroup heading="Recent">
                    {recents.map((e) => (
                      <Row key={e.id} entry={e} />
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading="Pages">
                  {pages.map((e) => (
                    <Row key={e.id} entry={e} />
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Keyboard hints */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> open
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Tab</Kbd> scope
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd> toggle
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
