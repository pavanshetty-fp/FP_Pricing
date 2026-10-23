import * as React from "react";
import {
  Caravan,
  ClipboardList,
  Contact,
  Database,
  Droplet,
  FileText,
  Fuel,
  HardHat,
  LayoutGrid,
  Search,
  Truck,
  Users,
  Wrench,
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
  MODULE_LABEL,
  SEARCH_INDEX,
  TYPE_LABEL,
  TYPE_ORDER,
  TYPE_SINGULAR,
  matchedKeyword,
  moduleCounts,
  queryTerms,
  searchAll,
  typeCounts,
  type ScopeCount,
  type SearchEntry,
  type SearchModule,
  type SearchType,
} from "./searchIndex";

/**
 * Global search — one query across every module, with counts (Pavan,
 * 2026-10-23 — the LinkedIn pattern).
 *
 * FIRST PILL ROW: "All" plus one pill per module that has results, each with
 * its count. SECOND ROW, once a module is chosen: that module's record types
 * with their counts. Every count is the number of matches in the whole index;
 * a capped group says how many more it holds.
 *
 * Built on the DS `Command` (cmdk) inside a `Dialog`, so arrow-key navigation,
 * the active-row highlight and Enter are the DS's behaviour rather than
 * re-implemented. cmdk's own filter is off — `shouldFilter` false — because
 * the matching is done in `searchAll`, which matches every word of the query in
 * any order across every field; cmdk's single fuzzy pass would disagree with
 * the counts on the pills.
 *
 * KEYBOARD: ↑ ↓ move, Enter opens, Tab steps through the module pills and
 * Shift+Tab through the record-type pills of the chosen module. The pills keep
 * focus in the query field when clicked, so typing carries on.
 *
 * DS FOLLOW-UP: this is a command palette, not a Unified View thing. It belongs
 * in the DS beside `top-bar/`, taking its index and scopes as props.
 */

const TYPE_ICON: Record<SearchType, React.ReactNode> = {
  "delivery-order": <Truck />,
  "fuel-order": <Fuel />,
  "asset-order": <ClipboardList />,
  quote: <FileText />,
  "service-order": <Wrench />,
  customer: <Users />,
  vendor: <Contact />,
  product: <Droplet />,
  asset: <Database />,
  "rental-asset": <Caravan />,
  technician: <HardHat />,
  page: <LayoutGrid />,
};

/** Seeded so the empty state is not blank on first open. */
const RECENT_IDS = ["page-sales-orders", "cu-cu-2"];

/** Rows a group shows before it says how many more it holds. */
const CAP_ALL = 5;
const CAP_MODULE = 5;
const CAP_TYPE = 50;

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

/** The text with every query term set in the foreground ink. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-foreground">
            {p}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}

/** A scope pill — a button around the DS pill; selected wears the selection tokens. */
function ScopePill({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      // Keep focus in the query field so typing and ↑ ↓ carry on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Pill
        className={cn(
          "gap-1.5 transition-colors",
          selected
            ? "bg-selected font-medium text-selected-foreground"
            : "hover:text-foreground"
        )}
      >
        {label} <span className="tabular-nums">{count.toLocaleString("en-US")}</span>
      </Pill>
    </button>
  );
}

function PillRow<K extends string>({
  label,
  all,
  items,
  value,
  onChange,
}: {
  label: string;
  /** The "All" pill's count. */
  all: number;
  items: ScopeCount<K>[];
  value: K | null;
  onChange: (key: K | null) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <ScopePill label="All" count={all} selected={value === null} onSelect={() => onChange(null)} />
      {items.map((s) => (
        <ScopePill
          key={s.key}
          label={s.label}
          count={s.count}
          selected={value === s.key}
          onSelect={() => onChange(s.key)}
        />
      ))}
    </div>
  );
}

export function GlobalSearch({ open, onOpenChange, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = React.useState("");
  const [moduleScope, setModuleScope] = React.useState<SearchModule | null>(null);
  const [typeScope, setTypeScope] = React.useState<SearchType | null>(null);

  // Reset on every open — a palette that reopens mid-query is disorienting.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setModuleScope(null);
    setTypeScope(null);
  }, [open]);

  const terms = React.useMemo(() => queryTerms(query), [query]);
  const searching = terms.length > 0;

  /* EVERY COUNT COMES FROM THE FULL HIT LIST — never from what a group shows. */
  const hits = React.useMemo(() => (searching ? searchAll(query) : []), [query, searching]);
  const modules = React.useMemo(() => {
    const counts = moduleCounts(hits);
    // A chosen module stays on the row at 0 rather than vanishing under the cursor.
    if (moduleScope && !counts.some((m) => m.key === moduleScope))
      counts.push({ key: moduleScope, label: MODULE_LABEL[moduleScope], count: 0 });
    return counts;
  }, [hits, moduleScope]);
  const inModule = React.useMemo(
    () => (moduleScope ? hits.filter((e) => e.moduleKey === moduleScope) : hits),
    [hits, moduleScope]
  );
  const types = React.useMemo(() => {
    const counts = typeCounts(inModule);
    if (typeScope && !counts.some((t) => t.key === typeScope))
      counts.push({ key: typeScope, label: TYPE_LABEL[typeScope], count: 0 });
    return counts;
  }, [inModule, typeScope]);
  const shown = React.useMemo(
    () => (typeScope ? inModule.filter((e) => e.type === typeScope) : inModule),
    [inModule, typeScope]
  );

  /* GROUPS: by module under "All", by record type once a module is chosen. */
  const groups = React.useMemo(() => {
    if (!moduleScope) {
      return modules
        .filter((m) => m.count > 0)
        .map((m) => ({
          key: m.key,
          label: m.label,
          // Index rank, not type order: a title match leads whatever its type.
          items: shown.filter((e) => e.moduleKey === m.key),
          cap: CAP_ALL,
        }));
    }
    return TYPE_ORDER.map((t) => ({
      key: t,
      label: TYPE_LABEL[t],
      items: shown.filter((e) => e.type === t),
      cap: typeScope ? CAP_TYPE : CAP_MODULE,
    })).filter((g) => g.items.length > 0);
  }, [modules, moduleScope, typeScope, shown]);

  // Empty state: recents, then every page.
  const recents = React.useMemo(
    () =>
      RECENT_IDS.map((id) => SEARCH_INDEX.find((e) => e.id === id)).filter(
        (e): e is SearchEntry => Boolean(e)
      ),
    []
  );
  const pages = React.useMemo(() => SEARCH_INDEX.filter((e) => e.type === "page"), []);

  /* THE ACTIVE ROW IS HELD HERE so a scope change never leaves Enter with no
     row: when the active row leaves the list, the first row takes over. */
  const visibleIds = React.useMemo(
    () =>
      searching
        ? groups.flatMap((g) => g.items.slice(0, g.cap).map((e) => e.id))
        : [...recents, ...pages].map((e) => e.id),
    [searching, groups, recents, pages]
  );
  const [active, setActive] = React.useState("");
  React.useEffect(() => {
    if (!visibleIds.includes(active)) setActive(visibleIds[0] ?? "");
  }, [visibleIds, active]);

  const go = (e: SearchEntry) => {
    onNavigate(e.moduleKey, e.navKey, e.recordId);
    onOpenChange(false);
  };

  const chooseModule = (m: SearchModule | null) => {
    setModuleScope(m);
    setTypeScope(null);
  };

  const cycleModule = () => {
    const keys: (SearchModule | null)[] = [null, ...modules.map((m) => m.key)];
    chooseModule(keys[(keys.indexOf(moduleScope) + 1) % keys.length]);
  };
  const cycleType = () => {
    if (!moduleScope) return;
    const keys: (SearchType | null)[] = [null, ...types.map((t) => t.key)];
    setTypeScope(keys[(keys.indexOf(typeScope) + 1) % keys.length]);
  };

  const scopeName = typeScope
    ? `${TYPE_LABEL[typeScope]} in ${MODULE_LABEL[moduleScope!]}`
    : moduleScope
      ? MODULE_LABEL[moduleScope]
      : null;

  const Row = ({ entry }: { entry: SearchEntry }) => {
    const extra = searching ? matchedKeyword(entry, terms) : null;
    return (
      <CommandItem
        key={entry.id}
        value={entry.id}
        onSelect={() => go(entry)}
        className="gap-3 py-2"
        icon={
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-fp-card-1 text-muted-foreground [&_svg]:size-4">
            {TYPE_ICON[entry.type]}
          </span>
        }
      >
        <span className="flex min-w-0 flex-col items-start gap-1">
          <span className="flex min-w-0 max-w-full items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              <Highlight text={entry.title} terms={terms} />
            </span>
            <Pill className="shrink-0">
              {TYPE_SINGULAR[entry.type]} · {MODULE_LABEL[entry.moduleKey]}
            </Pill>
          </span>
          <span className="max-w-full truncate text-xs text-muted-foreground">
            <Highlight text={entry.subtitle} terms={terms} />
            {extra && (
              <>
                {" · "}
                <Highlight text={extra} terms={terms} />
              </>
            )}
          </span>
        </span>
      </CommandItem>
    );
  };

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
          value={active}
          onValueChange={setActive}
          onKeyDown={(e) => {
            // Tab steps the module pills; Shift+Tab the chosen module's types.
            if (e.key === "Tab" && searching) {
              e.preventDefault();
              if (e.shiftKey) cycleType();
              else cycleModule();
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
              placeholder="Search every module — orders, customers, vendors, assets, pages"
              aria-label="Search every module"
              className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Esc</Kbd>
          </div>

          {/* Scope pills — modules, then the chosen module's record types */}
          {searching && (hits.length > 0 || moduleScope) && (
            <div className="flex flex-col items-start gap-2 border-b border-border px-3 py-2">
              <PillRow
                label="Module"
                all={hits.length}
                items={modules}
                value={moduleScope}
                onChange={chooseModule}
              />
              {moduleScope && (
                <PillRow
                  label="Record type"
                  all={inModule.length}
                  items={types}
                  value={typeScope}
                  onChange={setTypeScope}
                />
              )}
            </div>
          )}

          <CommandList className="max-h-[52vh]">
            {searching ? (
              <>
                <CommandEmpty>
                  No results for “{query.trim()}”{scopeName ? ` in ${scopeName}` : ""}.
                </CommandEmpty>
                {groups.map((g) => (
                  <CommandGroup key={g.key} heading={g.label}>
                    {g.items.slice(0, g.cap).map((e) => (
                      <Row key={e.id} entry={e} />
                    ))}
                    {g.items.length > g.cap && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {(g.items.length - g.cap).toLocaleString("en-US")} more in {g.label}
                      </div>
                    )}
                  </CommandGroup>
                ))}
              </>
            ) : (
              <>
                {recents.length > 0 && (
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
