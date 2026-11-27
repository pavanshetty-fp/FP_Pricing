import * as React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Panel } from "../DashboardParts";
import { SummaryCard } from "../SheetCards";
import { STATUS_LABEL, customerOf, fmtStamp, plural, shiptoOf, uniq, type ChangeRecord, type EntityMap, type ImpactLine } from "./changeLog";
import { ChangeText } from "./ChangeText";
import { RecordSheet } from "../RecordSheet";
import { ListFilters, type ListFacet } from "../ListFilters";
import { FilterChips } from "../ListToolbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { METHOD_LABEL, type DrillBar, type RichInsight } from "./customerShipto";

/*
  CUSTOMER & SHIP-TO, ROUND 5 (Yash, 2026-11-17 — team feedback):
  - INSIGHTS IN THREE VERSIONS, switched on the card so the PMs can pick:
    Compact (three figures; View all opens a side sheet), Descriptive (a line
    each; the card grows to show all), Grouped (Needs a look · Activity ·
    Patterns, all ten at once). Read-only in every version.
  - WHERE AND WHO DRILL INSIDE THEIR CARD. A press goes one level down in
    that card only — never the page's scope or the Timeline's filters — and
    a breadcrumb walks back. A bar that goes further shows a chevron.
  - THE TIMELINE IS A TIMELINE: days down the page, each change with its
    time, what changed, who, how it was made, and how many ship-tos it
    reached (pressing that lists them). No row opens; "Show more" instead of
    pages, so the order of changes stays in one run.
*/

// ---------------------------------------------------------------- insights --

export type InsightsVersion = "compact" | "descriptive";
const VERSION_LABEL: Record<InsightsVersion, string> = { compact: "Compact", descriptive: "Descriptive" };
const COMPACT = 3;
const DESCRIPTIVE = 4;

/** "View all 10" / "Show fewer" — under the card's content, as in Where and Who. */
function MoreToggle({ open, total, onToggle }: { open: boolean; total: number; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 self-start px-2 text-xs font-medium text-foreground hover:bg-foreground/5" onClick={onToggle}>
      <span className="underline decoration-current/50 decoration-dotted underline-offset-4">{open ? "Show fewer" : `View all ${total}`}</span>
    </Button>
  );
}

export function InsightsPanel({ insights }: { insights: RichInsight[] }) {
  const [version, setVersion] = React.useState<InsightsVersion>("compact");
  const [all, setAll] = React.useState(false);
  const limit = version === "compact" ? COMPACT : DESCRIPTIVE;
  const shown = all ? insights : insights.slice(0, limit);

  return (
    <SummaryCard title="Insights">
      {/* THE DEMO SWITCH — for the PMs to choose one; it goes once they do. */}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={version}
        onValueChange={(v) => {
          if (!v) return;
          setVersion(v as InsightsVersion);
          setAll(false);
        }}
        aria-label="Insights version"
        className="-mt-1 self-start"
      >
        {(Object.keys(VERSION_LABEL) as InsightsVersion[]).map((v) => (
          <ToggleGroupItem key={v} value={v} className="px-3 text-xs">
            {VERSION_LABEL[v]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* COMPACT — three to a row, every cell ruled (the grid's gap shows the
          border colour), names wrap rather than cut. */}
      {version === "compact" && (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          {shown.map((i) => (
            <div key={i.key} className="flex min-w-0 flex-col gap-1 bg-fp-surface-1b p-4">
              <span className="text-xs font-medium text-muted-foreground">{i.label}</span>
              <span className="text-xl font-semibold break-words text-foreground">{i.value}</span>
              <span className="text-xs text-muted-foreground">{i.note}</span>
            </div>
          ))}
          {/* An unfilled last row keeps its cells, so the rules stay whole. */}
          {Array.from({ length: (3 - (shown.length % 3)) % 3 }, (_, k) => (
            <div key={`pad${k}`} aria-hidden className="hidden bg-fp-surface-1b sm:block" />
          ))}
        </div>
      )}

      {/* DESCRIPTIVE — the fact with its number as the line, why under it. */}
      {version === "descriptive" && (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {shown.map((i) => (
            <li key={i.key} className="flex flex-col gap-0.5 py-2.5">
              <span className="text-sm font-medium text-foreground">{i.headline}</span>
              {i.sub && <span className="text-sm text-muted-foreground">{i.sub}</span>}
            </li>
          ))}
        </ul>
      )}

      {insights.length > limit && <MoreToggle open={all} total={insights.length} onToggle={() => setAll((o) => !o)} />}
    </SummaryCard>
  );
}

// ------------------------------------------------------------- drill card --

export interface DrillStep {
  key: string;
  label: string;
}

/**
 * A BAR CARD THAT DRILLS IN PLACE (Yash, 2026-11-17). `path` is where the
 * card stands ("All customers" first); a bar with `canOpen` goes one level
 * down. The page's scope and the Timeline are never touched.
 */
export function DrillCard({
  title,
  path,
  onBack,
  bars,
  canOpen,
  onOpen,
  one,
  many,
  top = 5,
}: {
  title: string;
  path: DrillStep[];
  /** Back to step `i` of the path. */
  onBack: (i: number) => void;
  bars: DrillBar[];
  canOpen: boolean;
  onOpen: (key: string, label: string) => void;
  one: string;
  many: string;
  top?: number;
}) {
  const [all, setAll] = React.useState(false);
  React.useEffect(() => setAll(false), [path.map((p) => p.key).join("/")]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorted = bars.filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
  const shown = all ? sorted : sorted.slice(0, top);
  const total = sorted.reduce((t, b) => t + b.value, 0) || 1;
  const max = Math.max(1, ...sorted.map((b) => b.value));
  return (
    <Panel className="flex-1" title={title} aside={sorted.length > top && !all ? `Top ${top} of ${plural(sorted.length, one, many)}` : plural(sorted.length, one, many)}>
      {/* WHERE THE CARD STANDS — each step walks back to it. */}
      {path.length > 1 && <nav aria-label={`${title} level`} className="-mt-1 mb-2 flex min-h-7 flex-wrap items-center gap-1 text-sm">
        {path.length > 1 && (
          <Button variant="ghost" size="icon-sm" aria-label="Back" className="-ml-1.5 size-7" onClick={() => onBack(path.length - 2)}>
            <ChevronLeft />
          </Button>
        )}
        {path.map((p, i) => (
          <React.Fragment key={p.key}>
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />}
            {i < path.length - 1 ? (
              <button type="button" onClick={() => onBack(i)} className="rounded-sm text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50">
                {p.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">{p.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>}
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this range.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((b) => {
            const body = (
              <>
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={cn("min-w-0 truncate text-foreground", canOpen && "group-hover/bar:underline")}>{b.label}</span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums text-foreground">
                    {b.value.toLocaleString()}
                    <span className="inline-block w-10 text-right text-xs text-muted-foreground">{Math.round((b.value / total) * 100)}%</span>
                    {canOpen && <ChevronRight aria-hidden className="size-4 text-muted-foreground group-hover/bar:text-foreground" />}
                  </span>
                </span>
                <span className="h-2 w-full rounded-full bg-fp-viz-1/12 dark:bg-fp-viz-1/20">
                  <span className="block h-full rounded-full bg-fp-viz-1" style={{ width: `${(b.value / max) * 100}%` }} />
                </span>
              </>
            );
            return (
              <li key={b.key}>
                {canOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(b.key, b.label)}
                    aria-label={`${b.label}, ${plural(b.value, "change")} — show what is under it`}
                    className="group/bar flex w-full cursor-pointer flex-col gap-1 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex w-full flex-col gap-1 px-2 py-1.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {sorted.length > top && (
        <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs font-medium text-foreground hover:bg-foreground/5" onClick={() => setAll((o) => !o)}>
          <span className="underline decoration-current/50 decoration-dotted underline-offset-4">
            {all ? `Show top ${top}` : `View ${sorted.length - top} ${sorted.length - top === 1 ? "other" : "others"}`}
          </span>
        </Button>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- timeline --


const PAGE = 20;

/** One ship-to it reached. */
export interface AffectedShipto {
  customerId: string;
  shiptoId: string;
}

/**
 * A COUNT OPENS A SIDE SHEET, NOT A DROPDOWN (Yash, 2026-11-17) — a plain
 * list of who it reached: ship-tos with their address and customer, or
 * customers with their ID. Nothing more (Yash, 2026-11-17: products and
 * their names were too much).
 */
export function ShiptoCount({
  lines,
  shiptoIds,
  kind = "shiptos",
  label,
  inCell,
  level = 1,
  title,
  subtitle,
  hubOf,
}: {
  /** With it, the list is a table: Ship-to · Customer · Hub (fee sheets,
   *  Yash 2026-11-24). */
  hubOf?: (shiptoId: string) => string;
  /** A change's lines: the ship-tos it reached. */
  lines?: ImpactLine[];
  /** Or ship-tos by id. */
  shiptoIds?: string[];
  /** List the ship-tos, or their customers. */
  kind?: AffectedKind;
  /** Kept for callers that narrowed to rows; the list shows ship-tos only. */
  rowIds?: string[];
  label?: string;
  inCell?: boolean;
  /** 2 when opened from inside a sheet. */
  level?: 1 | 2;
  title?: string;
  subtitle?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ids = shiptoIds ?? uniq((lines ?? []).map((l) => l.shiptoId));
  if (ids.length === 0) return <span>No ship-tos</span>;
  const items = (): AffectedShipto[] => ids.map((id) => ({ customerId: shiptoOf(id).customerId, shiptoId: id }));
  /* The sheet is a portal, but its events still bubble through here — so a
     press inside it never reaches the table row behind. */
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "cursor-pointer rounded-sm text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50",
          inCell ? "text-sm" : "font-medium"
        )}
      >
        {label ?? plural(ids.length, "ship-to")}
      </button>
      {open && (
        <AffectedSheet
          items={items()}
          kind={kind}
          level={level}
          title={title ?? (kind === "customers" ? "Customers affected" : "Ship-tos affected")}
          subtitle={subtitle}
          hubOf={hubOf}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}

export type AffectedKind = "shiptos" | "customers";

const TwoLines = ({ top, below }: { top: string; below: string }) => (
  <span className="flex min-w-0 flex-col">
    <span className="truncate" title={top}>
      {top}
    </span>
    {below && (
      <span className="truncate text-xs text-muted-foreground" title={below}>
        {below}
      </span>
    )}
  </span>
);

/** Who a change reached, as a plain list on a side sheet. */
export function AffectedSheet({
  items,
  kind = "shiptos",
  title,
  subtitle,
  level = 1,
  hubOf,
  onClose,
}: {
  hubOf?: (shiptoId: string) => string;
  items: AffectedShipto[];
  kind?: AffectedKind;
  title: string;
  subtitle?: string;
  level?: 1 | 2;
  onClose: () => void;
}) {
  /* A CUSTOMER'S SHIP-TO COUNT OPENS ITS SHIP-TOS IN THE SAME SHEET (Yash,
     2026-11-17); the path above walks back. */
  const [drill, setDrill] = React.useState<string | null>(null);
  const customers = uniq(items.map((x) => x.customerId));
  const shown = drill ? items.filter((x) => x.customerId === drill) : items;
  /* ONE CUSTOMER NEEDS NO CUSTOMER COLUMN (Yash, 2026-11-17) — just the
     ship-tos, each with its address under it. */
  const oneCustomer = uniq(shown.map((x) => x.customerId)).length === 1;
  const listing = kind === "customers" && !drill ? "customers" : "shiptos";
  /* A PLAIN LIST, NOT A TABLE (Yash, 2026-11-17) — no filters, no sideways
     scroll: a search, then each name with its line under it. */
  const [q, setQ] = React.useState("");
  React.useEffect(() => setQ(""), [drill]);
  /* FILTERS ON THE SHIP-TO TABLE (Yash, 2026-11-25) — Customer and Hub, the
     export sheet's filter icon beside the search, chips under it. */
  const filtering = !!hubOf && listing === "shiptos";
  const [sel, setSel] = React.useState<ReadonlySet<string>>(new Set());
  const facets: ListFacet[] = filtering
    ? [
        { key: "customer", label: "Customer", options: uniq(shown.map((x) => customerOf(x.customerId).name)).sort() },
        { key: "hub", label: "Hub", options: uniq(shown.map((x) => hubOf!(x.shiptoId))).sort() },
      ]
    : [];
  const passes = (shiptoId: string, f: ReadonlySet<string> = sel) => {
    const of = (key: string) => [...f].filter((id) => id.startsWith(`${key}:`)).map((id) => id.slice(key.length + 1));
    const cs = of("customer");
    const hs = of("hub");
    return (!cs.length || cs.includes(customerOf(shiptoOf(shiptoId).customerId).name)) && (!hs.length || hs.includes(hubOf?.(shiptoId) ?? ""));
  };
  const has = (...t: string[]) => !q.trim() || t.some((x) => x.toLowerCase().includes(q.trim().toLowerCase()));
  const rows =
    listing === "customers"
      ? customers
          .map((id) => ({ id, top: customerOf(id).name, below: "", n: items.filter((x) => x.customerId === id).length }))
          .filter((r) => has(r.top, r.below))
      : shown
          .map((x) => ({
            id: x.shiptoId,
            top: shiptoOf(x.shiptoId).name,
            below: oneCustomer || hubOf ? shiptoOf(x.shiptoId).address : `${shiptoOf(x.shiptoId).address} · ${customerOf(x.customerId).name}`,
            n: 0,
          }))
          .filter((r) => has(r.top, r.below, customerOf(shiptoOf(r.id).customerId).name, hubOf?.(r.id) ?? "") && (!filtering || passes(r.id)));
  return (
    <RecordSheet
      size={hubOf ? "data" : "form"}
      fit={hubOf ? { tables: [[280, 220, 180]] } : undefined}
      presentation="sheet"
      level={level}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      editTitle={drill ? `${customerOf(drill).name} ship-tos` : title}
      createTitle=""
      createAction=""
      showCancel={false}
      stepNav={false}
      noFooter
      headerSubtitle={
        drill ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => setDrill(null)}>
                    {title}
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{customerOf(drill).name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : subtitle ? (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        ) : undefined
      }
      onSubmit={onClose}
    >
      <div className="flex min-h-0 flex-col gap-3">
        {/* The search runs the sheet's full width (Yash, 2026-11-17). */}
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={listing === "customers" ? "Search customers" : "Search ship-tos"}
              aria-label={listing === "customers" ? "Search customers" : "Search ship-tos"}
              className="h-8 pl-8"
            />
          </div>
          {filtering && (
            <ListFilters
              fullWidth
              historyKey="fee-shiptos"
              facets={facets}
              value={sel}
              onApply={setSel}
              countFor={(f) => shown.filter((x) => passes(x.shiptoId, f)).length}
            />
          )}
        </div>
        {filtering && <FilterChips className="mt-0" facets={facets} selected={sel} onChange={setSel} />}
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
        ) : hubOf && listing === "shiptos" ? (
          /* SHIP-TO · CUSTOMER · HUB (Yash, 2026-11-24) — where each sits. */
          /* SHRINK-0 (Yash, 2026-11-25 — it didn't scroll): the sheet body
              scrolls; the table no longer squeezes and clips its rows. */
          <div data-table-variant="T2" className="shrink-0 overflow-hidden rounded-lg border border-border">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col />
                <col className="w-[34%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th className="px-3 py-2.5 text-left font-medium">Ship-to</th>
                  <th className="px-3 py-2.5 text-left font-medium">Customer</th>
                  <th className="px-3 py-2.5 text-left font-medium">Hub</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="h-12 border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <TwoLines top={r.top} below={r.below} />
                    </td>
                    <td className="truncate px-3">{customerOf(shiptoOf(r.id).customerId).name}</td>
                    <td className="truncate px-3">{hubOf(r.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="flex shrink-0 flex-col divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <TwoLines top={r.top} below={r.below} />
                {listing === "customers" && (
                  <button
                    type="button"
                    onClick={() => setDrill(r.id)}
                    className="shrink-0 cursor-pointer rounded-sm text-sm text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {plural(r.n, "ship-to")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </RecordSheet>
  );
}

export function ChangeTimeline({
  items,
  ents,
  tools,
  chips,
}: {
  items: { c: ChangeRecord; lines: ImpactLine[] }[];
  ents: EntityMap;
  /** Search and Filters, beside the title. */
  tools?: React.ReactNode;
  /** The filter chips, under it. */
  chips?: React.ReactNode;
}) {
  const [limit, setLimit] = React.useState(PAGE);
  React.useEffect(() => setLimit(PAGE), [items]);
  const shown = items.slice(0, limit);
  return (
    <Panel title="Timeline" aside={tools}>
      {chips}
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No changes match.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* TEXT FIRST (Yash, 2026-11-17): the stamp, a dot on the title's
              line, the change as the line, then one muted line — how it was
              made · the ship-tos it reached · who. No chips. */}
          <ol className="flex flex-col">
            {shown.map((x, i) => (
              <li key={x.c.id} className="relative grid grid-cols-[196px_20px_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0">
                <span className="pt-px text-sm whitespace-nowrap tabular-nums text-muted-foreground">{fmtStamp(x.c.effectiveAt)}</span>
                <span className="relative flex justify-center">
                  {i < shown.length - 1 && <span aria-hidden className="absolute top-3 -bottom-6 w-px bg-border" />}
                  <span aria-hidden className="relative mt-1.5 size-2.5 rounded-full bg-fp-viz-1" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-1 text-sm font-medium text-foreground">
                    <ChangeText plain c={x.c} ents={ents} />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {METHOD_LABEL[x.c.source]} · {plural(uniq(x.lines.map((l) => l.customerId)).length, "customer")} · <ShiptoCount lines={x.lines} /> · {x.c.by}
                    {x.c.status !== "applied" && ` · ${STATUS_LABEL[x.c.status]}`}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {items.length > limit && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, items.length - limit)} more
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

/**
 * "(2 other customers)" — ON A CUSTOMER'S FEED, the customers a bulk change
 * also reached (Yash, 2026-11-18). Pressed, a side sheet lists them with the
 * ship-tos it reached at each; View activity opens the change as it reached
 * that customer.
 */
export function OtherCustomers({
  rows,
  onActivity,
}: {
  rows: { name: string; shiptos: number }[];
  /** Opens the change as it reached one customer (a full page). */
  onActivity: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const grid = "grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-4 px-4";
  return (
    <span onClick={(e) => e.stopPropagation()} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-sm text-sm text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        +{plural(rows.length, "customer")}
      </button>
      {open && (
        <RecordSheet
          size="form"
          presentation="sheet"
          open
          onOpenChange={(v) => !v && setOpen(false)}
          mode="edit"
          editTitle="Other customers"
          createTitle=""
          createAction=""
          showCancel={false}
          stepNav={false}
          noFooter
          onSubmit={() => setOpen(false)}
        >
          <div className="overflow-hidden rounded-lg border border-border">
            <div className={cn(grid, "h-10 bg-muted/50 text-xs font-medium text-muted-foreground")}>
              <span>Customer</span>
              <span>Ship-tos</span>
              <span className="w-[108px]" />
            </div>
            <ul className="flex flex-col divide-y divide-border border-t border-border">
              {rows.map((r) => (
                <li key={r.name} className={cn(grid, "py-2.5")}>
                  <span className="min-w-0 truncate text-sm text-foreground">{r.name}</span>
                  <span className="text-sm text-foreground">{plural(r.shiptos, "ship-to")}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onActivity(r.name);
                    }}
                  >
                    View activity
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </RecordSheet>
      )}
    </span>
  );
}
