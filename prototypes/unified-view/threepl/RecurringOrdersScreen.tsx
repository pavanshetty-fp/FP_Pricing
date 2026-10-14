import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Info,
  MoreHorizontal,
  Repeat,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { OverflowChip } from "../BreakdownCard";
import { Input } from "@/components/ui/input";
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
import {
  TableColumnHeader,
  TablePagination,
  useTableColumns,
} from "@/components/tables-layout";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ColumnSearchChip,
  FilterChips,
  ListToolbar,
  type ListView,
} from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ExportSheet, type ExportFilterRow } from "../ExportSheet";
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
  BROKER_STATUSES,
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

  THE LIST FEATURES DELIVERY ORDERS HAS (Pavan, 2026-10-07) — saved views,
  the filter row, columns that sort, move and resize, Export through the
  sheet. Built on the DS header (`useTableColumns` + `TableColumnHeader`),
  not on `ListTable`, because `ListTable` has no expandable row and no row
  menu yet. No map: a series has no place.
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

/* EVERY COLUMN SORTS, MOVES AND RESIZES (Pavan, 2026-10-07) — the list
   features Delivery Orders has. `sort` is what the column sorts BY. */
interface SeriesCol {
  key: string;
  label: string;
  width: number;
  align?: "right";
  sort?: (s: RecurringSeries) => string | number;
}

const SERIES_COLUMNS: SeriesCol[] = [
  { key: "order", label: "Order # / Created", width: 165, sort: (s) => s.parent.orderNo },
  { key: "customer", label: "Customer", width: 230, sort: (s) => s.parent.customer.title },
  { key: "shipTo", label: "Ship To", width: 190, sort: (s) => s.parent.shipTo },
  { key: "schedule", label: "Schedule", width: 190, sort: (s) => s.schedule.label },
  /* No next date sorts last, as on Rules. */
  { key: "next", label: "Next Delivery", width: 165, sort: (s) => s.nextKey ?? "9999" },
  {
    key: "upcoming",
    label: "Upcoming",
    width: 100,
    align: "right",
    sort: (s) => upcomingCount(s, startOfDay(new Date())),
  },
  { key: "vendor", label: "Partner", width: 210, sort: (s) => vendorName(s.parent.vendorId) },
  /* Lifecycle order, not A-Z. */
  { key: "status", label: "Series", width: 210, sort: (s) => SERIES_STATUSES.indexOf(s.status) },
  { key: "actions", label: "", width: 44 },
];

const SERIES_KEYS = SERIES_COLUMNS.map((c) => c.key);
const FIXED_KEYS = ["actions"];

interface DeliveryCol {
  key: string;
  label: string;
  width: number;
  align?: "right";
  sort: (d: Delivery) => string | number;
}

const DELIVERY_COLUMNS: DeliveryCol[] = [
  { key: "order", label: "Order # / Created", width: 165, sort: (d) => d.orderNo },
  { key: "date", label: "Planned Date", width: 165, sort: (d) => d.dateKey },
  { key: "products", label: "Products", width: 230, sort: (d) => d.lines[0]?.product ?? "" },
  { key: "qty", label: "Qty (Gal)", width: 110, align: "right", sort: (d) => totalGal(d.lines) },
  { key: "vendor", label: "Partner", width: 210, sort: (d) => vendorName(d.vendorId) },
  { key: "status", label: "Status", width: 210, sort: (d) => BROKER_STATUSES.indexOf(d.status) },
];

type SortState = { key: string; dir: "asc" | "desc" } | null;

/** ASC → DESC → UNSORTED, the three-press cycle every table here uses. */
const nextSort = (prev: SortState, key: string): SortState =>
  !prev || prev.key !== key
    ? { key, dir: "asc" }
    : prev.dir === "asc"
      ? { key, dir: "desc" }
      : null;

function sortRows<T>(
  rows: T[],
  sort: SortState,
  of: ((r: T) => string | number) | undefined
): T[] {
  if (!sort || !of) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = of(a);
    const bv = of(b);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

/** The header's sort button — label and the asc/desc/unsorted glyph. */
function SortButton({
  label,
  sort,
  colKey,
  onSort,
}: {
  label: string;
  sort: SortState;
  colKey: string;
  onSort: (key: string) => void;
}) {
  const active = sort?.key === colKey;
  const Icon = !active ? ChevronsUpDown : sort?.dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      aria-label={`Sort by ${label}`}
      className={cn(
        "inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "text-foreground"
      )}
    >
      {label}
      <Icon className={cn("size-3.5", active ? "opacity-100" : "opacity-70")} />
    </button>
  );
}

/* WHAT A CELL PRINTS, as text — what the filter row's boxes match. */
function seriesColumnText(s: RecurringSeries, key: string, today: Date): string {
  switch (key) {
    case "order":
      return `${s.parent.orderNo} ${s.parent.audit[0] ? DATE_FMT.format(new Date(s.parent.audit[0].at)) : ""}`;
    case "customer":
      return `${s.parent.customer.title} ${s.parent.customer.description}`;
    case "shipTo":
      return s.parent.shipTo;
    case "schedule":
      return s.schedule.label;
    case "next":
      return s.nextKey ? DATE_FMT.format(new Date(`${s.nextKey}T00:00:00`)) : "";
    case "upcoming":
      return String(upcomingCount(s, today));
    case "vendor":
      return vendorName(s.parent.vendorId);
    case "status":
      return `${s.status} ${s.stalledReason ?? ""}`;
    default:
      return "";
  }
}

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
  /* THE NESTED TABLE SORTS TOO (Pavan, 2026-10-07). */
  const [sort, setSort] = React.useState<SortState>(null);
  const rows = React.useMemo(
    () =>
      sortRows(
        series.deliveries,
        sort,
        DELIVERY_COLUMNS.find((c) => c.key === sort?.key)?.sort
      ),
    [series.deliveries, sort]
  );
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
                  aria-sort={
                    sort?.key === c.key
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-muted-foreground",
                    c.align === "right" && "text-right",
                  )}
                >
                  <SortButton
                    label={c.label}
                    sort={sort}
                    colKey={c.key}
                    onSort={(k) => setSort((prev) => nextSort(prev, k))}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
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
            <Pill className="shrink-0">
              First delivery
            </Pill>
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
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{first}</span>
          {/* "+N" IS A PILL (Pavan, 2026-10-09) — the same overflow chip Sales shows. */}
          {/* THE CHIP OPENS THE LINES, on click (Pavan, 2026-10-14). */}
          {more > 0 && (
            <OverflowChip
              count={more}
              label={`Show all ${d.lines.length} lines`}
              card={{
                title: `All products (${d.lines.length})`,
                rows: d.lines.map((l) => ({
                  label: l.product,
                  sub: l.asset || undefined,
                  value: l.topOff ? "Top off" : `${(l.gal ?? 0).toLocaleString()} gal`,
                })),
              }}
            />
          )}
        </span>
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
  /* THE COLUMNS ARE THE READER'S (Pavan, 2026-10-07) — order, widths, sort
     and the filter row, as on Delivery Orders, kept by a saved view. */
  const [colOrder, setColOrder] = React.useState<string[]>(SERIES_KEYS);
  const [widths, setWidths] = React.useState<Record<string, number>>({});
  const [sort, setSort] = React.useState<SortState>(null);
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );
  const [exporting, setExporting] = React.useState(false);
  const cols = useTableColumns({
    keys: SERIES_KEYS,
    fixed: FIXED_KEYS,
    order: colOrder,
    onOrderChange: setColOrder,
    widths,
    onWidthsChange: setWidths,
  });
  const onSort = (key: string) => setSort((prev) => nextSort(prev, key));

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

  const narrow = React.useCallback((sel: ReadonlySet<string>) => {
    const cq = colQuery.trim().toLowerCase();
    const field = SERIES_SEARCH_FIELDS.find((f) => f.key === colScope);
    const byFacet = [...sel].reduce<Record<string, string[]>>((acc, id) => {
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
      if (
        !activeColFilters.every(([k, v]) =>
          seriesColumnText(s, k, today).toLowerCase().includes(v.trim().toLowerCase())
        )
      )
        return false;
      return Object.entries(byFacet).every(([k, wanted]) => {
        const facet = SERIES_FACETS.find((f) => f.key === k);
        return !facet || wanted.includes(facet.valueOf(s));
      });
    });
  }, [all, search, colScope, colQuery, line, business, ops, activeColFilters, today]);

  const rows = React.useMemo(
    () =>
      sortRows(
        narrow(applied),
        sort,
        SERIES_COLUMNS.find((c) => c.key === sort?.key)?.sort
      ),
    [narrow, applied, sort]
  );

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = React.useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );
  React.useEffect(() => {
    setPage(1);
  }, [search, applied, colQuery, colScope, line, business, ops, activeColFilters]);

  /** The columns actually drawn, in the reader's order — actions never hides. */
  const visibleCols = React.useMemo(
    () =>
      cols.arrange(
        SERIES_COLUMNS.filter((c) => c.key === "actions" || !hidden.has(c.key))
      ),
    [cols, hidden],
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
    search.trim().length > 0 ||
    applied.size > 0 ||
    colQuery.trim().length > 0 ||
    activeColFilters.length > 0;

  type ViewState = {
    search: string;
    applied: string[];
    hidden: string[];
    colScope: string;
    colQuery: string;
    /* Optional so a view saved before them still applies. */
    colOrder?: string[];
    widths?: Record<string, number>;
    sort?: SortState;
    colFilters?: Record<string, string>;
  };
  const savedViews = useSavedViews<ViewState>({
    current: {
      search,
      applied: [...applied],
      hidden: [...hidden],
      colScope,
      colQuery,
      colOrder,
      widths,
      sort,
      colFilters: Object.fromEntries(activeColFilters),
    },
    defaultState: {
      search: "",
      applied: [],
      hidden: [],
      colScope: SERIES_SEARCH_FIELDS[0].key,
      colQuery: "",
      colOrder: SERIES_KEYS,
      widths: {},
      sort: null,
      colFilters: {},
    },
    keyOf: (v) =>
      JSON.stringify({
        ...v,
        applied: [...v.applied].sort(),
        hidden: [...v.hidden].sort(),
        colOrder: v.colOrder ?? SERIES_KEYS,
        widths: v.widths ?? {},
        sort: v.sort ?? null,
        colFilters: Object.fromEntries(
          Object.entries(v.colFilters ?? {})
            .filter(([, x]) => x.trim() !== "")
            .sort(([a], [b]) => a.localeCompare(b))
        ),
      }),
    apply: (v) => {
      setSearch(v.search);
      setApplied(new Set(v.applied));
      setHidden(new Set(v.hidden));
      setColScope(v.colScope);
      setColQuery(v.colQuery);
      setColOrder(v.colOrder ?? SERIES_KEYS);
      setWidths(v.widths ?? {});
      setSort(v.sort ?? null);
      setColFilters(v.colFilters ?? {});
      setColFiltersOpen(Object.values(v.colFilters ?? {}).some((x) => x.trim()));
      setPage(1);
    },
    /* REMEMBERED ACROSS VISITS (Pavan, 2026-10-09). */
    storageKey: "3pl-recurring-orders",
  });

  const clearAll = () => {
    setSearch("");
    setApplied(new Set());
    setColQuery("");
    setColFilters({});
  };

  /* EXPORT ASKS FIRST (Pavan, 2026-10-07) — the Delivery Orders sheet, with
     every narrowing that shapes the file listed. */
  const exportFilters: ExportFilterRow[] = [
    {
      key: "business",
      label: "Business",
      values: business ? [{ value: business, onRemove: () => setBusiness(null) }] : [],
    },
    {
      key: "search",
      label: "Search",
      values: search.trim() ? [{ value: search.trim(), onRemove: () => setSearch("") }] : [],
    },
    {
      key: "colSearch",
      label: SERIES_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim() ? [{ value: colQuery.trim(), onRemove: () => setColQuery("") }] : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: SERIES_COLUMNS.find((c) => c.key === key)?.label ?? key,
      values: [
        {
          value: value.trim(),
          onRemove: () => setColFilters((prev) => ({ ...prev, [key]: "" })),
        },
      ],
    })),
    ...SERIES_FACETS.map((f) => {
      const mine = [...applied].filter((id) => id.startsWith(`${f.key}:`));
      const drop = (ids: string[]) =>
        setApplied((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({
          value: id.slice(f.key.length + 1),
          onRemove: () => drop([id]),
        })),
        onRemoveAll: () => drop(mine),
      };
    }),
  ];

  const exportCsv = () => {
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
    );
  };

  const cell = (s: RecurringSeries, key: string): React.ReactNode => {
    switch (key) {
      case "order":
        return (
          <div className="flex min-w-0 items-start gap-2">
            <Repeat className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm tabular-nums text-foreground">
                {s.parent.orderNo}
              </span>
              {/* WHEN IT WAS SET UP. In V2 that is the order's own creation,
                  because the order IS the rule — which is the model, said in
                  one line. */}
              <span className="truncate text-xs text-muted-foreground">
                {s.parent.audit[0]
                  ? DATE_FMT.format(new Date(s.parent.audit[0].at))
                  : "—"}
              </span>
            </div>
          </div>
        );
      case "customer":
        return (
          <TwoLineCell
            title={s.parent.customer.title}
            description={s.parent.customer.description}
          />
        );
      case "shipTo":
        return (
          <span className="truncate text-sm text-foreground">
            {s.parent.shipTo}
          </span>
        );
      case "schedule":
        /* THE SCHEDULE AS A SHAPE, the same cell V1 uses. */
        return <ScheduleCell schedule={s.schedule} />;
      case "next":
        return s.nextKey ? (
          <span className="text-sm tabular-nums text-foreground">
            {DATE_FMT.format(new Date(`${s.nextKey}T00:00:00`))}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "upcoming": {
        const ahead = upcomingCount(s, today);
        return ahead > 0 ? (
          <span className="text-sm tabular-nums text-foreground">{ahead}</span>
        ) : (
          /* A ZERO THAT HAS A REASON SAYS SO. An empty count on an Active
             series is the doc's commonest support call, and a bare 0 is what
             makes it one. */
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default text-sm tabular-nums text-muted-foreground underline decoration-dotted underline-offset-4">
                0
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {s.stalledReason ?? "Nothing scheduled in the next month"}
            </TooltipContent>
          </Tooltip>
        );
      }
      case "vendor":
        return (
          <span className="truncate text-sm text-foreground">
            {vendorName(s.parent.vendorId)}
          </span>
        );
      case "status":
        return (
          <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
            <StatusChip
              tone={SERIES_TONE[s.status]}
              variant="soft"
              className="self-start"
            >
              {s.status}
            </StatusChip>
            {/* ENDED AND EXPIRED SHARE A TONE AND MUST NOT SHARE A MEANING.
                The line under the word separates "somebody stopped this" from
                "the date arrived"; truncated, but the tooltip finishes it. */}
            {s.stalledReason && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default truncate text-xs text-muted-foreground">
                    {s.stalledReason}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{s.stalledReason}</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      case "actions":
        return (
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
              <DropdownMenuContent align="end" className="w-60">
                {/* ONLY THE ACTS THAT APPLY. The menu is short enough that
                    its shape is the answer. */}
                {s.status === "Active" || s.status === "Upcoming" ? (
                  <DropdownMenuItem onSelect={() => pauseNow(s)}>
                    Pause now
                  </DropdownMenuItem>
                ) : null}
                {s.status === "Paused" && (
                  <DropdownMenuItem onSelect={() => resume(s)}>
                    Resume
                  </DropdownMenuItem>
                )}
                {(s.status === "Active" ||
                  s.status === "Paused" ||
                  s.status === "Upcoming") && (
                  <>
                    <DropdownMenuItem onSelect={() => endToday(s)}>
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
                  <DropdownMenuItem onSelect={() => restart(s)}>
                    Restart series
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      default:
        return null;
    }
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
        onExport={() => setExporting(true)}
      />

      <div className="mt-4 shrink-0">
        {/* THE ACTION UNIT — the same one every list in this app carries, in the
            same order. Board, map and Group By are off: a series has no lanes,
            no pins, and grouping rows that already expand is two disclosure
            mechanics fighting for one triangle. */}
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
              countFor={(sel) => narrow(sel).length}
            />
          }
          quickFilters={
            /* OUTLINE + SPACING 0 — the DS's own joined segmented control. */
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
          columnOrder={colOrder}
          onReorderColumns={setColOrder}
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
          columnFiltersOpen={view === "table" && colFiltersOpen}
          onToggleColumnFilters={
            view === "table"
              ? () =>
                  setColFiltersOpen((open) => {
                    /* Closing the row puts the table back. */
                    if (open) setColFilters({});
                    return !open;
                  })
              : undefined
          }
          columnFilterCount={activeColFilters.length}
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
          {activeColFilters.map(([key, value]) => (
            <ColumnSearchChip
              key={key}
              searchFields={SERIES_COLUMNS.map((c) => ({ key: c.key, label: c.label }))}
              colScope={key}
              colQuery={value.trim()}
              onClear={() => setColFilters((prev) => ({ ...prev, [key]: "" }))}
            />
          ))}
        </FilterChips>
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        {/* THE ROW STAYS WHEN NOTHING MATCHES — swapping the table for an
            empty state would take away the boxes being typed in. */}
        {rows.length === 0 && !colFiltersOpen ? (
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
            {/* BORDER-SEPARATE so the header cells can stick and paint above
                the body — see `docs/ds/ui/2-rules.md` §10d. The row rule moves
                onto the cells. */}
            <Table
              style={{ tableLayout: "fixed" }}
              className="border-separate border-spacing-0"
            >
              <colgroup>
                <col style={{ width: "44px" }} />
                {visibleCols.map((c) => (
                  <col key={c.key} style={{ width: `${cols.widthOf(c)}px` }} />
                ))}
              </colgroup>
              <TableHeader className="bg-fp-table-header">
                <TableRow className="h-10 bg-fp-table-header hover:bg-transparent">
                  {/* THE EXPAND CELL IS THE FRAME, not a column — it never
                      moves, hides or sorts. */}
                  <TableHead className="sticky top-0 z-20 border-b border-fp-outline-1 bg-fp-table-header px-3" />
                  {visibleCols.map((c) => (
                    <TableColumnHeader
                      key={c.key}
                      cols={cols}
                      col={c}
                      aria-sort={
                        sort?.key === c.key
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className={cn(
                        "sticky top-0 z-20 whitespace-nowrap border-b border-fp-outline-1 bg-fp-table-header px-3 text-xs font-medium text-muted-foreground",
                        c.align === "right" && "text-right",
                        c.key === "actions" && "right-0 z-30"
                      )}
                    >
                      {c.label ? (
                        <SortButton
                          label={c.label}
                          sort={sort}
                          colKey={c.key}
                          onSort={onSort}
                        />
                      ) : null}
                    </TableColumnHeader>
                  ))}
                </TableRow>
                {colFiltersOpen && (
                  /* THE SECOND HEADER ROW — the same band ListTable draws. */
                  <TableRow className="h-11 hover:bg-transparent">
                    <TableHead className="sticky top-10 z-20 border-b border-fp-outline-1 bg-fp-surface-1b px-2" />
                    {visibleCols.map((c) => (
                      <TableHead
                        key={c.key}
                        className={cn(
                          "sticky top-10 z-20 border-b border-fp-outline-1 bg-fp-surface-1b px-2",
                          c.key === "actions" && "right-0 z-30"
                        )}
                      >
                        {c.label ? (
                          <Input
                            value={colFilters[c.key] ?? ""}
                            onChange={(e) =>
                              setColFilters((prev) => ({
                                ...prev,
                                [c.key]: e.target.value,
                              }))
                            }
                            placeholder={cols.widthOf(c) >= 96 ? "Filter…" : ""}
                            aria-label={`Filter by ${c.label}`}
                            className="h-7 rounded-md px-2.5 text-xs shadow-none"
                          />
                        ) : null}
                      </TableHead>
                    ))}
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {pageRows.map((s) => {
                  const open = expanded.has(s.id);
                  return (
                    <React.Fragment key={s.id}>
                      <TableRow
                        className="group/row h-14 cursor-pointer [&>td]:border-b [&>td]:border-fp-outline-1"
                        onClick={(e) => {
                          const t = e.target as HTMLElement | null;
                          if (
                            t?.closest("button,a,input,label,[role='checkbox'],[role='menuitem']")
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
                        {visibleCols.map((c) =>
                          c.key === "actions" ? (
                            <TableCell
                              key={c.key}
                              className="sticky right-0 z-10 bg-fp-surface-1b px-3 before:pointer-events-none before:absolute before:inset-0 group-hover/row:before:bg-fp-row-hover"
                            >
                              <span className="relative">{cell(s, c.key)}</span>
                            </TableCell>
                          ) : (
                            <TableCell
                              key={c.key}
                              className={cn("px-3", c.align === "right" && "text-right")}
                            >
                              {cell(s, c.key)}
                            </TableCell>
                          )
                        )}
                      </TableRow>

                      {open && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={visibleCols.length + 1}
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

      {/* THE PAGE POSITION, and beside it the horizon — true of the list
          rather than of any row. */}
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

      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Recurring Orders"
        noun="recurring orders"
        nounOne="recurring order"
        count={rows.length}
        filtersControl={
          <ListFilters
            facets={SERIES_FACETS.map((f) => ({
              key: f.key,
              label: f.label,
              options: f.options,
              searchable: f.searchable,
            }))}
            value={applied}
            onApply={setApplied}
            countFor={(sel) => narrow(sel).length}
            fullWidth
          />
        }
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          if (format === "csv") exportCsv();
          else
            toast.success(
              `Exporting ${rows.length} recurring ${rows.length === 1 ? "order" : "orders"} as .${format}`
            );
        }}
      />
    </div>
  );
}

/** Re-exported for the invariant note in the README. */
export type { BrokerStatus };
