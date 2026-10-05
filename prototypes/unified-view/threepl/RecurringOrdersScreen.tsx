import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  MoreHorizontal,
  Repeat,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/tables-layout";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ColumnSearchChip,
  FilterChips,
  ListToolbar,
  type ListView,
} from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { useSavedViews } from "../useSavedViews";
import { downloadCsv } from "../csv";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DATE_FMT, dateKeyOf, startOfDay } from "../data";
import {
  BROKER_STATUS_TONE,
  totalGal,
  type BrokerStatus,
  LINE_SCOPES,
  inLineScope,
  businessesOf,
  type LineScope,
} from "./orders";
import { VENDORS } from "./vendors";
import {
  RECURRING_PARENTS,
  SERIES_STATUSES,
  buildSeries,
  matchesSeries,
  upcomingCount,
  type Delivery,
  type RecurringSeries,
  type SeriesOverride,
  type SeriesStatus,
} from "./recurring";
import { ScheduleCell } from "./ScheduleCell";
import { statusTones } from "../statusKind";

/*
  RECURRING ORDERS — the destination, V2 (parent/child).

  WHY THIS IS A DESTINATION AND NOT A TAB. Recurring Orders has been both: a
  kind-tab on Delivery Orders and an item in the Orders drawer pointing at
  nothing. The tab answers "which of today's orders are recurring", which is a
  question about ORDERS. This screen answers "what standing arrangements do we
  have", which is a question about SCHEDULES — a different list of a different
  thing, and the engineering doc puts its home here too. The tab stays; it is
  not a duplicate of this.

  ONE ROW PER RECURRING ORDER, opening onto its deliveries. The row is the
  parent order — number, customer, ship-to, partner — because in V2 that is
  literally what a series is. Expanding it reveals the generated orders in the
  DS's established nested sub-table treatment: full-bleed inside the parent's
  row, recessed a surface step, left accent, muted headers.

  THE FIRST ROW INSIDE IS THE PARENT ITSELF, badged "First delivery". That is
  not a rendering accident — in this model the schedule and delivery one are the
  same record, and a reader comparing V2 against V1 has to be able to see it.

  COLUMNS MATCH THE ORDERS TABLE where the same fact appears — Order #, Customer,
  Ship To, Planned Date, Qty, Partner and Status keep their widths from
  `BROKER_COLUMNS`. A reader who has learnt the orders list has learnt this one.

  NO COLUMN TOOLS, NO SAVED VIEWS, NO MAP. The directory lists carry them
  because they have twenty columns and four screens sharing a shell. This has
  nine columns and one screen, and a toolbar of controls that do nothing is the
  dead-control rule broken eight times in a row.
*/

/** Four tones, six words — see the note on `SeriesStatus`. */
const SERIES_TONE = statusTones<SeriesStatus>({
  /* Set up, not yet running. True, and asks nothing. */
  Upcoming: "info",
  /* Running. Asks nothing — a series being live is not an achievement. */
  Active: "info",
  /* Waiting on somebody to resume it. NOT red: pausing is a decision. */
  Paused: "caution",
  Cancelled: "neutral",
  Ended: "neutral",
  Expired: "neutral",
});

const SERIES_COLUMNS = [
  { key: "order", label: "Order # / Created", width: 165 },
  { key: "customer", label: "Customer", width: 230 },
  { key: "shipTo", label: "Ship To", width: 190 },
  { key: "schedule", label: "Schedule", width: 190 },
  { key: "next", label: "Next Delivery", width: 165 },
  { key: "upcoming", label: "Upcoming", width: 100, align: "right" as const },
  { key: "vendor", label: "Partner", width: 210 },
  { key: "status", label: "Series", width: 210 },
  { key: "actions", label: "", width: 44 },
];

const DELIVERY_COLUMNS = [
  { key: "order", label: "Order # / Created", width: 165 },
  { key: "date", label: "Planned Date", width: 165 },
  { key: "products", label: "Products", width: 230 },
  { key: "qty", label: "Qty (Gal)", width: 110, align: "right" as const },
  { key: "vendor", label: "Partner", width: 210 },
  { key: "status", label: "Status", width: 210 },
];

/** What the list can be narrowed by. Same three questions as V1's. */
/** Same three segments as V1 — see the note there. */
const OPERATIONS = [
  { key: "all", label: "All" },
  { key: "first", label: "First party operations" },
  { key: "third", label: "Third party operations" },
] as const;

type Operations = (typeof OPERATIONS)[number]["key"];

const SERIES_FACETS: {
  key: string;
  label: string;
  options: string[];
  valueOf: (s: RecurringSeries) => string;
  searchable?: boolean;
}[] = [
  {
    key: "series",
    label: "Series",
    options: SERIES_STATUSES,
    valueOf: (s) => s.status,
  },
  {
    key: "partner",
    label: "Partner",
    options: [...new Set(VENDORS.map((v) => v.name))].sort(),
    valueOf: (s) => VENDORS.find((v) => v.id === s.parent.vendorId)?.name ?? "",
    searchable: true,
  },
  {
    key: "frequency",
    label: "Frequency",
    options: [
      ...new Set(RECURRING_PARENTS.map((p) => p.recurrence?.frequency ?? "")),
    ]
      .filter(Boolean)
      .sort(),
    valueOf: (s) => s.schedule.raw,
  },
];

const SERIES_SEARCH_FIELDS: {
  key: string;
  label: string;
  text: (s: RecurringSeries) => string;
}[] = [
  { key: "order", label: "Order #", text: (s) => s.parent.orderNo },
  {
    key: "customer",
    label: "Customer",
    text: (s) => `${s.parent.customer.title} ${s.parent.customer.description}`,
  },
  { key: "shipTo", label: "Ship To", text: (s) => s.parent.shipTo },
  { key: "schedule", label: "Schedule", text: (s) => s.schedule.label },
  {
    key: "vendor",
    label: "Partner",
    text: (s) => VENDORS.find((v) => v.id === s.parent.vendorId)?.name ?? "",
  },
];

function vendorName(id: string | null): string {
  if (!id) return "—";
  return VENDORS.find((v) => v.id === id)?.name ?? "—";
}

function TwoLineCell({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="truncate text-sm text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">
        {description}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The deliveries a series has made and will make
 * ------------------------------------------------------------------------ */

/**
 * The nested sub-table, in the DS's own expandable-row treatment: pinned to the
 * viewport's left edge so its columns stay put while the wide parent grid
 * scrolls, on the recessed `bg-background` surface one step below the content
 * layer, with a left accent tying it to the row above.
 */
function DeliveryTable({
  series,
  width,
}: {
  series: RecurringSeries;
  width?: number;
}) {
  return (
    <div
      className="sticky left-0 border-l-2 border-status-processing/70 bg-background"
      style={{ width }}
    >
      {/* WHY NOTHING IS COMING, SAID HERE. The doc's whole "when nothing gets
          created" table is silent in the product — logged, never shown — and
          this is the one place a broker is actually looking when they ask. */}
      {series.stalledReason && (
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          <span>{series.stalledReason}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {DELIVERY_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground",
                    c.align === "right" && "text-right",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.deliveries.map((d) => (
              <DeliveryRow key={d.id} d={d} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeliveryRow({ d }: { d: Delivery }) {
  const gal = totalGal(d.lines);
  const first = d.lines[0]?.product ?? "—";
  const more = d.lines.length - 1;

  return (
    <tr className="border-t border-border/60">
      <td className="whitespace-nowrap px-4 py-3 text-foreground">
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{d.orderNo}</span>
          {/* THE PARENT, SEEN FROM BELOW. In V2 the schedule and the first
              delivery are one record, and this badge is where that shows. */}
          {d.isParent && (
            <Badge variant="secondary" className="shrink-0">
              First delivery
            </Badge>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
        <div className="flex flex-col leading-tight">
          <span className="text-foreground">{d.date.title}</span>
          <span className="text-xs">{d.date.description}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <span className="truncate">{first}</span>
        {more > 0 && (
          <span className="ml-1.5 text-xs text-muted-foreground">+{more}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">
        {gal > 0 ? gal.toLocaleString() : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
        {vendorName(d.vendorId)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusChip tone={BROKER_STATUS_TONE[d.status]} variant="soft">
            {d.status}
          </StatusChip>
          {/* CANCELLED BY A PAUSE IS NOT CANCELLED BY A PERSON, and the two
              are different acts with different futures: this one comes back
              when the pause lifts. */}
          {d.cancelledByPause && (
            <span className="text-xs text-muted-foreground">by pause</span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------ */

export function RecurringOrdersScreen({
  onCreateRule,
}: {
  /** See V1 — a recurring order is created by the order flow, not here. */
  onCreateRule?: () => void;
} = {}) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const todayKey = dateKeyOf(today);

  /* THE BROKER'S OWN CHANGES, held here rather than in the fixture. Pause,
     resume, end and cancel all hand a new override back and the series is
     rebuilt from it — see `buildSeries`. */
  const [overrides, setOverrides] = React.useState<
    Record<string, SeriesOverride>
  >({});
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(
    new Set(),
  );
  const [search, setSearch] = React.useState("");
  const [applied, setApplied] = React.useState<ReadonlySet<string>>(new Set());
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set());
  const [view, setView] = React.useState<ListView>("table");
  const [colScope, setColScope] = React.useState(SERIES_SEARCH_FIELDS[0].key);
  const [colQuery, setColQuery] = React.useState("");
  const [ops, setOps] = React.useState<Operations>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [line, setLine] = React.useState<LineScope>("All");
  const [business, setBusiness] = React.useState<string | null>(null);

  /* The visible width the nested table pins itself to. */
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [innerWidth, setInnerWidth] = React.useState<number | undefined>();
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInnerWidth(el.clientWidth));
    ro.observe(el);
    setInnerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const all = React.useMemo(
    () =>
      RECURRING_PARENTS.map((p, i) =>
        buildSeries(p, i, today, overrides[p.id] ?? {}),
      ),
    [overrides, today],
  );

  const rows = React.useMemo(() => {
    const cq = colQuery.trim().toLowerCase();
    const field = SERIES_SEARCH_FIELDS.find((f) => f.key === colScope);
    const byFacet = [...applied].reduce<Record<string, string[]>>((acc, id) => {
      const at = id.indexOf(":");
      const k = id.slice(0, at);
      (acc[k] ??= []).push(id.slice(at + 1));
      return acc;
    }, {});
    return all.filter((s) => {
      if (!inLineScope(line, s.parent.serviceLine)) return false;
      if (business !== null && s.parent.business !== business) return false;
      if (ops === "first" && s.parent.jobType !== "Transportation") return false;
      if (ops === "third" && s.parent.jobType !== "Brokerage") return false;
      if (!matchesSeries(s, search)) return false;
      if (cq && field && !field.text(s).toLowerCase().includes(cq))
        return false;
      return Object.entries(byFacet).every(([k, wanted]) => {
        const facet = SERIES_FACETS.find((f) => f.key === k);
        return !facet || wanted.includes(facet.valueOf(s));
      });
    });
  }, [all, search, applied, colScope, colQuery, line, business, ops]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = React.useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );
  React.useEffect(() => {
    setPage(1);
  }, [search, applied, colQuery, colScope, line, business, ops]);

  /** The columns actually drawn — the pinned actions cell never hides. */
  const visibleColumns = React.useMemo(
    () =>
      SERIES_COLUMNS.filter((c) => c.key === "actions" || !hidden.has(c.key)),
    [hidden],
  );

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const patch = (id: string, next: SeriesOverride) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));

  /* ── The row menu's acts. Each is the doc's own, with its own consequence ── */

  const pauseNow = (s: RecurringSeries) => {
    patch(s.id, {
      pauses: [
        ...s.pauses,
        {
          fromKey: todayKey,
          toKey: null,
          by: "You",
          at: new Date().toISOString(),
        },
      ],
    });
    const hit = upcomingCount(s, today);
    toast.success(`Paused ${s.parent.orderNo}`, {
      description:
        hit > 0
          ? `${hit} unfinished ${hit === 1 ? "order" : "orders"} cancelled. Resuming brings them back.`
          : "No orders were affected.",
    });
  };

  const resume = (s: RecurringSeries) => {
    patch(s.id, { pauses: [] });
    toast.success(`Resumed ${s.parent.orderNo}`, {
      description:
        "Cancelled orders restored, then re-checked against the schedule.",
    });
  };

  const endToday = (s: RecurringSeries) => {
    patch(s.id, { endKey: todayKey });
    toast.success(`${s.parent.orderNo} ends ${DATE_FMT.format(today)}`, {
      description:
        "Unfinished orders after that date are cancelled. Delivered ones stay.",
    });
  };

  const cancelSeries = (s: RecurringSeries) => {
    patch(s.id, { cancelled: true });
    toast.success(`Cancelled ${s.parent.orderNo}`, {
      description:
        "Generation stopped. The schedule stays here and can be restarted.",
    });
  };

  const restart = (s: RecurringSeries) => {
    patch(s.id, { cancelled: false, endKey: null, pauses: [] });
    toast.success(`Restarted ${s.parent.orderNo}`);
  };

  const filtered =
    search.trim().length > 0 || applied.size > 0 || colQuery.trim().length > 0;

  type ViewState = {
    search: string;
    applied: string[];
    hidden: string[];
    colScope: string;
    colQuery: string;
  };
  const savedViews = useSavedViews<ViewState>({
    current: {
      search,
      applied: [...applied],
      hidden: [...hidden],
      colScope,
      colQuery,
    },
    defaultState: {
      search: "",
      applied: [],
      hidden: [],
      colScope: SERIES_SEARCH_FIELDS[0].key,
      colQuery: "",
    },
    keyOf: (v) =>
      JSON.stringify({
        ...v,
        applied: [...v.applied].sort(),
        hidden: [...v.hidden].sort(),
      }),
    apply: (v) => {
      setSearch(v.search);
      setApplied(new Set(v.applied));
      setHidden(new Set(v.hidden));
      setColScope(v.colScope);
      setColQuery(v.colQuery);
      setPage(1);
    },
  });

  const clearAll = () => {
    setSearch("");
    setApplied(new Set());
    setColQuery("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE SCOPE SHELF — preset views, the line and its business, Export and
          the CTA. Same bar as the orders board and as V1. */}
      <FuelOrdersViewBar
        {...savedViews}
        onResetToDefault={() => {
          setBusiness(null);
          savedViews.onResetToDefault();
        }}
        segments={LINE_SCOPES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(l) => {
          setLine(l as LineScope);
          setBusiness(null);
          setPage(1);
        }}
        presets={businessesOf(line).map((b) => ({ key: b, label: b }))}
        presetKey={business}
        onPresetChange={(b) => {
          setBusiness((prev) => (prev === b ? null : b));
          setPage(1);
        }}
        ctaLabel="Create Order"
        onCreateOrder={onCreateRule}
        onExport={() => {
          downloadCsv(
            `recurring-orders-${new Date().toISOString().slice(0, 10)}`,
            rows.map((s) => ({
              "Order #": s.parent.orderNo,
              Customer: s.parent.customer.title,
              "Ship to": s.parent.shipTo,
              Schedule: s.schedule.label,
              "Next delivery": s.nextKey ?? "",
              Upcoming: upcomingCount(s, today),
              Partner: vendorName(s.parent.vendorId),
              Series: s.status,
              Reason: s.stalledReason ?? "",
            })),
          );
          toast.success(
            `Exported ${rows.length} recurring ${rows.length === 1 ? "order" : "orders"}`,
            {
              description: "The filtered list, all pages, in the order shown.",
            },
          );
        }}
      />

      {/* THE TOOLBAR AND THE CHIPS ARE ONE SHELF, and the shelf is spaced
          off the bar above it — `mt-4`, the same step the orders board and
          the directory lists use. Dropped in without it, the view bar and
          the toolbar sat flush and read as one crowded band. */}
      <div className="mt-4 shrink-0">
        {/* THE ACTION UNIT — the same one every list in this app carries, in the
          same order. Board, map and Group By are switched off rather than
          drawn dead: a series has no lanes, no pins, and row grouping over a
          list whose rows already expand is two disclosure mechanics fighting
            for one triangle. */}
        <ListToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search recurring orders, customers, sites…"
          filters={
            <ListFilters
              facets={SERIES_FACETS.map((f) => ({
                key: f.key,
                label: f.label,
                options: f.options,
                searchable: f.searchable,
              }))}
              value={applied}
              onApply={setApplied}
            />
          }
          quickFilters={
            /* OUTLINE + SPACING 0 — the DS's own joined segmented control.
               It draws the box round the set and the hairlines between the
               segments, which is what says these three are one choice rather
               than three buttons that happen to sit together. */
            <ToggleGroup
              type="single"
              variant="outline"
              value={ops}
              onValueChange={(v) => v && setOps(v as Operations)}
              className="h-8 shrink-0"
            >
              {OPERATIONS.map((o) => (
                <ToggleGroupItem
                  key={o.key}
                  value={o.key}
                  className="h-8 px-3 text-sm"
                >
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
          showGroupBy={false}
          boardView={false}
          columns={SERIES_COLUMNS.filter((c) => c.key !== "actions").map(
            (c) => ({
              key: c.key,
              label: c.label,
            }),
          )}
          hiddenColumns={hidden as Set<string>}
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          searchFields={SERIES_SEARCH_FIELDS.map((f) => ({
            key: f.key,
            label: f.label,
          }))}
          colScope={colScope}
          onColScopeChange={setColScope}
          colQuery={colQuery}
          onColQueryChange={setColQuery}
          view={view}
          onViewChange={setView}
        />

        <FilterChips
          facets={SERIES_FACETS.map((f) => ({ key: f.key, label: f.label }))}
          selected={applied}
          onChange={setApplied}
        >
          <ColumnSearchChip
            searchFields={SERIES_SEARCH_FIELDS.map((f) => ({
              key: f.key,
              label: f.label,
            }))}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => setColQuery("")}
          />
        </FilterChips>
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        {rows.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {filtered ? <SearchX /> : <Repeat />}
              </EmptyMedia>
              <EmptyTitle>
                {filtered
                  ? "No recurring orders match"
                  : "No recurring orders yet"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Nothing found. Check the spelling, or clear the filters above."
                  : "A delivery order set to recur appears here, with the orders it generates."}
              </EmptyDescription>
            </EmptyHeader>
            {filtered && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear search and filters
              </Button>
            )}
          </Empty>
        ) : (
          <div
            ref={scrollRef}
            className="h-full overflow-auto rounded-md border border-border [&_[data-slot=table-container]]:overflow-visible"
          >
            {/* BORDER-SEPARATE, AND IT IS THE WHOLE FIX.

                Chrome will not honour `position: sticky` on a table CELL while
                the table's borders are collapsed, and it ignores z-index on
                `<thead>` in that mode too — so a collapsed table can hold its
                header still (sticky on the header) or paint it above the body
                (sticky on the cells), but never both. That is why a scrolled
                row could be read straight through the header.

                Separating the borders lets the cells stick properly and
                respect z-index. The cost is that a border on a `<tr>` stops
                painting, so the row rule moves onto the cells — which is where
                the header's own borders already were. */}
              <Table
                style={{ tableLayout: "fixed" }}
                className="border-separate border-spacing-0"
              >
              <colgroup>
                <col style={{ width: "44px" }} />
                {visibleColumns.map((c) => (
                  <col key={c.key} style={{ width: `${c.width}px` }} />
                ))}
              </colgroup>
              {/* THE CELLS STICK, NOT THE HEADER — see the note in the V1 screen: a
                  collapsed-border table ignores z-index on `<thead>`, so a
                  sticky header paints under the body it is holding still
                  for. */}
              <TableHeader className="bg-fp-table-header">
                <TableRow className="h-10 bg-fp-table-header">
                  <TableHead className="sticky top-0 z-20 border-b border-fp-outline-1 bg-fp-table-header px-3" />
                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      className={cn(
                        "sticky top-0 z-20 whitespace-nowrap border-b border-fp-outline-1 bg-fp-table-header px-3 text-xs font-medium text-muted-foreground",
                        c.align === "right" && "text-right",
                      )}
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((s) => {
                  const open = expanded.has(s.id);
                  const ahead = upcomingCount(s, today);
                  return (
                    <React.Fragment key={s.id}>
                      <TableRow
                        /* The row rule moves onto the cells — see the note on
                           the table's separated borders. */
                        className="group/row h-14 cursor-pointer [&>td]:border-b [&>td]:border-fp-outline-1"
                        onClick={(e) => {
                          const t = e.target as HTMLElement | null;
                          if (
                            t?.closest("button,a,input,label,[role='checkbox']")
                          )
                            return;
                          if (window.getSelection()?.toString()) return;
                          toggleExpand(s.id);
                        }}
                      >
                        <TableCell className="px-3">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-expanded={open}
                            aria-label={
                              open
                                ? `Hide deliveries for ${s.parent.orderNo}`
                                : `Show deliveries for ${s.parent.orderNo}`
                            }
                            onClick={() => toggleExpand(s.id)}
                          >
                            {open ? <ChevronDown /> : <ChevronRight />}
                          </Button>
                        </TableCell>

                        <TableCell className="px-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <Repeat className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            <div className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate text-sm tabular-nums text-foreground">
                                {s.parent.orderNo}
                              </span>
                              {/* WHEN IT WAS SET UP. In V2 that is the order's
                                  own creation, because the order IS the rule —
                                  which is the model, said in one line. */}
                              <span className="truncate text-xs text-muted-foreground">
                                {s.parent.audit[0]
                                  ? DATE_FMT.format(
                                      new Date(s.parent.audit[0].at)
                                    )
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-3">
                          <TwoLineCell
                            title={s.parent.customer.title}
                            description={s.parent.customer.description}
                          />
                        </TableCell>

                        <TableCell className="px-3">
                          <span className="truncate text-sm text-foreground">
                            {s.parent.shipTo}
                          </span>
                        </TableCell>

                        {/* THE SCHEDULE AS A SHAPE, the same cell V1 uses.
                            Repeated table patterns behave the same: two
                            versions of one screen describing a schedule two
                            different ways would have the reader comparing the
                            descriptions rather than the models. */}
                        <TableCell className="px-3">
                          <ScheduleCell schedule={s.schedule} />
                        </TableCell>

                        <TableCell className="px-3">
                          {s.nextKey ? (
                            <span className="text-sm tabular-nums text-foreground">
                              {DATE_FMT.format(
                                new Date(`${s.nextKey}T00:00:00`),
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="px-3 text-right tabular-nums">
                          {ahead > 0 ? (
                            <span className="text-sm text-foreground">
                              {ahead}
                            </span>
                          ) : (
                            /* A ZERO THAT HAS A REASON SAYS SO. An empty count
                               on an Active series is the doc's commonest
                               support call, and a bare 0 is what makes it one. */
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default text-sm text-muted-foreground underline decoration-dotted underline-offset-4">
                                  0
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {s.stalledReason ??
                                  "Nothing scheduled in the next month"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>

                        <TableCell className="px-3">
                          <span className="truncate text-sm text-foreground">
                            {vendorName(s.parent.vendorId)}
                          </span>
                        </TableCell>

                        <TableCell className="px-3">
                          <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
                            <StatusChip
                              tone={SERIES_TONE[s.status]}
                              variant="soft"
                              className="self-start"
                            >
                              {s.status}
                            </StatusChip>
                            {/* ENDED AND EXPIRED SHARE A TONE AND MUST NOT
                                SHARE A MEANING. The line under the word is
                                what separates "somebody stopped this" from
                                "the date arrived" — the audit story the doc
                                says a shared badge destroys. */}
                            {/* TRUNCATED, BUT NEVER UNREADABLE. The reason is
                                the valuable half of this cell and the column is
                                210px; a clipped sentence with no way to finish
                                it is worse than no sentence. */}
                            {s.stalledReason && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default truncate text-xs text-muted-foreground">
                                    {s.stalledReason}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {s.stalledReason}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="sticky right-0 z-10 bg-fp-surface-1b px-3 before:pointer-events-none before:absolute before:inset-0 group-hover/row:before:bg-fp-row-hover">
                          <span className="relative">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Actions for ${s.parent.orderNo}`}
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-60"
                                >
                                  {/* ONLY THE ACTS THAT APPLY. A Resume on a
                                      running series and a Pause on a cancelled
                                      one are dead controls, and hiding them
                                      beats greying them out here: the menu is
                                      short enough that its shape is the
                                      answer. */}
                                  {s.status === "Active" ||
                                  s.status === "Upcoming" ? (
                                    <DropdownMenuItem
                                      onSelect={() => pauseNow(s)}
                                    >
                                      Pause now
                                    </DropdownMenuItem>
                                  ) : null}
                                  {s.status === "Paused" && (
                                    <DropdownMenuItem
                                      onSelect={() => resume(s)}
                                    >
                                      Resume
                                    </DropdownMenuItem>
                                  )}
                                  {(s.status === "Active" ||
                                    s.status === "Paused" ||
                                    s.status === "Upcoming") && (
                                    <>
                                      <DropdownMenuItem
                                        onSelect={() => endToday(s)}
                                      >
                                        End recurrence today
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={() => cancelSeries(s)}
                                      >
                                        Cancel series
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {(s.status === "Cancelled" ||
                                    s.status === "Ended" ||
                                    s.status === "Expired") && (
                                    <DropdownMenuItem
                                      onSelect={() => restart(s)}
                                    >
                                      Restart series
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </span>
                        </TableCell>
                      </TableRow>

                      {open && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className="bg-background p-0"
                          >
                            <DeliveryTable series={s} width={innerWidth} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* THE PAGE POSITION, and beside it the one fact about the list that a
          count cannot carry: the horizon. A broker who sets up a weekly order
          and counts four deliveries needs to know that is the WINDOW and not
          the life of the schedule, and it is true of the list rather than of
          any row, so it sits here rather than on all of them. */}
      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Showing deliveries from today through one month out
        </span>
        <TablePagination
          page={safePage}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

/** Re-exported for the invariant note in the README. */
export type { BrokerStatus };
