import { ColumnSearchTab } from "../ListTable";
import * as React from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Network,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollXBar } from "@/components/ui/scroll-x";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
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
  TableHead,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TableColumnHeader,
  TablePagination,
  useTableColumns,
} from "@/components/tables-layout";
import {
  ColumnSearchChip,
  FilterChips,
  ListToolbar,
  ViewStatement,
  useViewBar,
  type ListView,
} from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { useSavedViews } from "../useSavedViews";
import { downloadCsv } from "../csv";
import { ExportSheet, type ExportFilterRow } from "../ExportSheet";
import { DATE_FMT } from "../data";
import {
  LOADING_ACCOUNTS,
  suppliersOf,
  terminalsOf,
  SERVICE_LINES,
  LINE_BUSINESSES,
  businessesOf,
  lineOfProduct,
} from "./orders";
import { VENDORS } from "./vendors";
import { SERIES_STATUSES, type SeriesStatus } from "./recurring";
import { ScheduleCell } from "./ScheduleCell";
import {
  MONEY,
  RECURRING_PROGRAMS,
  liveTargets,
  matchesProgram,
  programMoney,
  programPartnerLabel,
  programVendors,
  usePrograms,
  waitingTargets,
  type RecurringProgram,
} from "./recurringPrograms";
import { RecurringProgramSheet } from "./RecurringProgramSheet";
import {
  RecurringProgramCreate,
  type ProgramDraft,
} from "./RecurringProgramCreate";
import { RuleRecommendations, recommendedVendors } from "./RuleRecommendations";
import { blankFrequency, toSchedule, type RuleFrequency } from "./RuleFrequency";
import { OverflowList } from "../ListTable";
import { dateKeyOf, startOfDay } from "../data";
import { statusTones } from "../statusKind";

/*
  RECURRING ORDERS — V1.1, the programme list.

  ONE ROW PER PROGRAMME, AND A PROGRAMME IS A BOOK OF LANES. V1's row is one
  standing arrangement for one site; this row is one partner running one
  product on one frequency across a handful of sites at once.

  THE ROW ANSWERS THE THREE QUESTIONS A BOOK RAISES and V1's row cannot:

    How big is it        how many sites, how many customers
    How much of it is on 8 of 12 lanes away, 4 still being priced
    What does it earn    the margin per run, across the live lanes only

  Everything else — which sites, what each one pays — is the sheet's grid,
  because a list cannot hold a table inside a cell without becoming one.

  FLAT, AND EVERY COLUMN SORTS (Pavan, 2026-10-01). The Programme / Partner /
  Coverage / Per run groups are gone — the reader orders the columns, not the
  author. The headings handed their meaning back to the labels: the per-run
  money reads "Estimated …" (Pavan, 2026-10-01): a rule only ever makes
  orders, and each order still goes through every lane, so the rule's money
  is an estimate, never a price.
  Customer and ship-to are not on the row at all: a programme has five of each
  and a cell that says "Cardinal Logistics +4" is a worse answer than a count.
*/

const DASH = "—";

const SERIES_TONE = statusTones<SeriesStatus>({
  /* Set up, not yet running. True, and asks nothing. */
  Upcoming: "info",
  /* Running. Asks nothing — a series being live is not an achievement. */
  Active: "info",
  /* Waiting on somebody to resume it. NOT red: pausing is a decision. */
  Paused: "caution",
  Canceled: "neutral",
  Ended: "neutral",
  Expired: "neutral",
});

interface Col {
  key: string;
  label: string;
  width: number;
  align?: "right";
  /** What it sorts BY. */
  sort: (p: RecurringProgram) => string | number;
}

const uniq = (xs: string[]) => [...new Set(xs)].join(" / ");

const COLUMNS: Col[] = [
  {
    key: "programNo",
    label: "Program # / Created",
    width: 180,
    sort: (p) => p.programNo,
  },
  { key: "schedule", label: "Frequency", width: 220, sort: (p) => p.schedule.label },
  { key: "product", label: "Product", width: 150, sort: (p) => p.products.join(" + ") },
  { key: "status", label: "Status", width: 90, sort: (p) => p.status },
  { key: "vendor", label: "Partner", width: 160, sort: (p) => programPartnerLabel(p) },
  {
    key: "loadOrder",
    label: "Load Order",
    width: 110,
    sort: (p) => (p.loadOrder ? "Yes" : "No"),
  },
  {
    key: "terminal",
    label: "Terminal",
    width: 130,
    sort: (p) => (p.loadOrder ? uniq(p.loadRows.map((l) => l.terminal)) : ""),
  },
  {
    key: "account",
    label: "Loading Account",
    width: 160,
    sort: (p) => (p.loadOrder ? uniq(p.loadRows.map((l) => l.loadingAccount)) : ""),
  },
  {
    key: "sites",
    label: "Sites",
    width: 80,
    sort: (p) => p.targets.length,
  },
  {
    key: "customers",
    label: "Customers",
    width: 110,
    sort: (p) => new Set(p.targets.map((t) => t.customer.title)).size,
  },
  {
    key: "liveness",
    label: "Lanes Live",
    width: 160,
    sort: (p) => liveTargets(p).length,
  },
  /* NOT PRICED SORTS LAST going up — an unpriced programme is not the
     cheapest one. */
  {
    key: "cost",
    label: "Estimated Partner Price",
    width: 180,
    sort: (p) => programMoney(p).cost || Number.MAX_SAFE_INTEGER,
  },
  {
    key: "revenue",
    label: "Estimated Customer Price",
    width: 190,
    sort: (p) => programMoney(p).revenue || Number.MAX_SAFE_INTEGER,
  },
  {
    key: "margin",
    label: "Estimated Margin",
    width: 150,
    sort: (p) =>
      programMoney(p).revenue > 0 ? programMoney(p).margin : Number.MAX_SAFE_INTEGER,
  },
];

/**
 * WHAT EACH COLUMN PRINTS, as text — what its box in the filter row matches.
 * A box finds what the reader can SEE in that column, nothing else.
 */
function columnText(p: RecurringProgram, key: string): string {
  const money = programMoney(p);
  switch (key) {
    case "programNo":
      return `${p.programNo} ${DATE_FMT.format(new Date(p.createdAt))}`;
    case "schedule":
      return p.schedule.label;
    case "product":
      return p.products.join(" + ");
    case "status":
      return p.status;
    case "vendor":
      return programPartnerLabel(p);
    case "loadOrder":
      return p.loadOrder ? "Yes" : "No";
    case "terminal":
      return p.loadOrder ? uniq(p.loadRows.map((l) => l.terminal)) : "Partner supplies";
    case "account":
      return p.loadOrder ? uniq(p.loadRows.map((l) => l.loadingAccount)) : "";
    case "sites":
      return String(p.targets.length);
    case "customers":
      return String(new Set(p.targets.map((t) => t.customer.title)).size);
    case "liveness":
      return `${liveTargets(p).length} of ${p.targets.length}`;
    case "cost":
      return money.cost > 0 ? MONEY(money.cost) : "Not priced";
    case "revenue":
      return money.revenue > 0 ? MONEY(money.revenue) : "Not priced";
    case "margin":
      return money.revenue > 0 ? MONEY(money.margin) : "";
    default:
      return "";
  }
}

const ALL_COLS: Col[] = COLUMNS;
const COL_KEYS: string[] = COLUMNS.map((c) => c.key);

const PROGRAM_FACETS: {
  key: string;
  label: string;
  options: string[];
  valueOf: (p: RecurringProgram) => string;
  /** For a facet a row can hold more than one of — a programme's partners. */
  valuesOf?: (p: RecurringProgram) => string[];
  searchable?: boolean;
}[] = [
  /* LINE OF SERVICE AND BUSINESS ARE FILTERS (Pavan, 2026-10-21) — not a
     segment and preset tabs above the list. */
  {
    key: "serviceLine",
    label: "Line of Service",
    options: [...SERVICE_LINES],
    valueOf: (p) => p.serviceLine,
  },
  {
    key: "business",
    label: "Business",
    options: businessesOf("All"),
    valueOf: (p) => p.business ?? "",
  },
  {
    key: "status",
    label: "Status",
    options: SERIES_STATUSES,
    valueOf: (p) => p.status,
  },
  {
    key: "partner",
    label: "Partner",
    options: [...new Set(VENDORS.map((v) => v.name))].sort(),
    /* A PROGRAMME OUT TO THREE PARTNERS MATCHES ALL THREE. Filtering on a
       partner asks "is this one on it", not "is it the only one on it". */
    valueOf: (p) => programVendors(p)[0]?.name ?? "",
    valuesOf: (p) => programVendors(p).map((v) => v.name),
    searchable: true,
  },
  {
    key: "product",
    label: "Product",
    options: [
      ...new Set(RECURRING_PROGRAMS.flatMap((p) => p.products)),
    ].sort(),
    valueOf: (p) => p.products[0] ?? "",
  },
];

const PROGRAM_SEARCH_FIELDS: {
  key: string;
  label: string;
  text: (p: RecurringProgram) => string;
}[] = [
  { key: "programNo", label: "Program #", text: (p) => p.programNo },
  {
    key: "vendor",
    label: "Partner",
    text: (p) => programVendors(p).map((v) => v.name).join(" "),
  },
  { key: "product", label: "Product", text: (p) => p.products.join(" ") },
  {
    key: "terminal",
    label: "Terminal",
    text: (p) => p.loadRows.map((l) => l.terminal).join(" "),
  },
  {
    key: "site",
    label: "Ship-to",
    text: (p) => p.targets.map((t) => t.shipTo).join(" "),
  },
  {
    key: "customer",
    label: "Customer",
    text: (p) => p.targets.map((t) => t.customer.title).join(" "),
  },
];

/**
 * A RULE, BACK INTO THE FORM'S SHAPE. Rules made in the form keep the form's
 * own frequency; the seeded ones are rebuilt from their schedule.
 */
function draftOf(p: RecurringProgram): ProgramDraft {
  const days = p.schedule.days;
  return {
    name: p.programNo,
    jobType: p.jobType,
    vendorIds: p.vendorIds,
    products: p.products,
    winterProducts: p.winterProducts,
    frequency: p.frequency ?? {
      ...blankFrequency(),
      dayMode: days.length === 7 ? "daily" : "specific",
      days,
      repeat: /month/i.test(p.schedule.cadence) ? "monthly" : "weekly",
      endKey: p.endKey,
    },
    loadOrder: p.loadOrder,
    loadRows: p.loadRows.map((l) => ({ loadingAccount: l.loadingAccount })),
    startKey: p.startKey,
    signatureOnDelivery: p.signatureOnDelivery,
    targets: p.targets,
  };
}

export function RecurringProgramsScreen({
  onOpenArchive,
}: {
  /** The old versions (V1, V2), kept for reference — see the footer. */
  onOpenArchive?: () => void;
} = {}) {
  /* THE SHARED LIST — Delivery Orders cuts its recurring orders from it. */
  const [programs, setPrograms] = usePrograms();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  /** A rule started from a recommendation — see `RuleRecommendations`. */
  const [seed, setSeed] = React.useState<{
    frequency: RuleFrequency;
    products: string[];
    vendorIds: string[];
    loadOrder: boolean;
    loadingAccounts: string[];
    targets: { customer: { title: string; description: string }; shipTo: string }[];
  } | null>(null);
  /* THE RULE BEING EDITED in the create form — only one that has made no
     order yet (see the sheet's Edit rule). */
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [applied, setApplied] = React.useState<ReadonlySet<string>>(new Set());
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set());
  const [view, setView] = React.useState<ListView>("table");
  const [colScope, setColScope] = React.useState(PROGRAM_SEARCH_FIELDS[0].key);
  const [colQuery, setColQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  /* THE COLUMNS ARE THE READER'S — order, widths and the sort, the same
     `useTableColumns` call every flat table here makes. */
  /* SEARCH BY COLUMN IS A ROW OF BOXES UNDER THE HEADER — the Delivery
     Orders behaviour, and the rule for every table (`2-rules.md` §10g). */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );
  const [colOrder, setColOrder] = React.useState<string[]>(COL_KEYS);
  const [widths, setWidths] = React.useState<Record<string, number>>({});
  const [exporting, setExporting] = React.useState(false);
  const [sort, setSort] = React.useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const cols = useTableColumns({
    keys: COL_KEYS,
    order: colOrder,
    onOrderChange: setColOrder,
    widths,
    onWidthsChange: setWidths,
  });
  /* ASC → DESC → UNSORTED, the three-press cycle every table uses. */
  const onSort = (key: string) =>
    setSort((prev) =>
      !prev || prev.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
    );

  const savedViews = useSavedViews<{
    search: string;
    applied: string[];
    hidden: string[];
    colScope: string;
    colQuery: string;
    colFilters: Record<string, string>;
    colOrder: string[];
    widths: Record<string, number>;
    sort: { key: string; dir: "asc" | "desc" } | null;
  }>({
    current: {
      search,
      applied: [...applied],
      hidden: [...hidden],
      colScope,
      colQuery,
      colFilters: Object.fromEntries(activeColFilters),
      colOrder,
      widths,
      sort,
    },
    defaultState: {
      search: "",
      applied: [],
      hidden: [],
      colScope: PROGRAM_SEARCH_FIELDS[0].key,
      colQuery: "",
      colFilters: {},
      colOrder: COL_KEYS,
      widths: {},
      sort: null,
    },
    keyOf: (v) =>
      JSON.stringify({
        ...v,
        applied: [...v.applied].sort(),
        hidden: [...v.hidden].sort(),
        colFilters: Object.fromEntries(
          Object.entries(v.colFilters ?? {})
            .filter(([, x]) => x.trim() !== "")
            .sort(([a], [b]) => a.localeCompare(b))
        ),
      }),
    apply: (v) => {
      setSearch(v.search);
      setColFilters(v.colFilters ?? {});
      /* A view that narrows by column opens on its boxes — a narrowing with
         nothing on screen saying so is the one thing the row exists to avoid. */
      setColFiltersOpen(Object.values(v.colFilters ?? {}).some((x) => x.trim()));
      setApplied(new Set(v.applied));
      setHidden(new Set(v.hidden));
      setColScope(v.colScope);
      setColQuery(v.colQuery);
      setColOrder(v.colOrder ?? COL_KEYS);
      setWidths(v.widths ?? {});
      setSort(v.sort ?? null);
      setPage(1);
    },
    /* REMEMBERED ACROSS VISITS (Pavan, 2026-10-09). */
    storageKey: "3pl-recurring-programs",
  });

  /* THE NARROWING, FOR ANY SET OF FACET TICKS — the list uses the applied
     set; the filter panel asks it of the ticks it holds, to count them. */
  const narrow = React.useCallback((facetSel: ReadonlySet<string>) => {
    const cq = colQuery.trim().toLowerCase();
    const field = PROGRAM_SEARCH_FIELDS.find((f) => f.key === colScope);
    const byFacet = [...facetSel].reduce<Record<string, string[]>>((acc, id) => {
      const at = id.indexOf(":");
      (acc[id.slice(0, at)] ??= []).push(id.slice(at + 1));
      return acc;
    }, {});
    return programs.filter((p) => {
      if (!matchesProgram(p, search)) return false;
      if (cq && field && !field.text(p).toLowerCase().includes(cq)) return false;
      /* AND, because that is what typing in two boxes looks like it does. */
      if (
        !activeColFilters.every(([k, v]) =>
          columnText(p, k).toLowerCase().includes(v.trim().toLowerCase())
        )
      )
        return false;
      return Object.entries(byFacet).every(([k, wanted]) => {
        const facet = PROGRAM_FACETS.find((f) => f.key === k);
        if (!facet) return true;
        const mine = facet.valuesOf?.(p) ?? [facet.valueOf(p)];
        return mine.some((x) => wanted.includes(x));
      });
    });
  }, [programs, search, colScope, colQuery, activeColFilters]);

  const rows = React.useMemo(() => {
    const kept = narrow(applied);
    /* SORTING IS THE LAST STEP. Unsorted returns the list's own order. */
    const col = sort && COLUMNS.find((c) => c.key === sort.key);
    if (!sort || !col) return kept;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...kept].sort((a, b) => {
      const av = col.sort(a);
      const bv = col.sort(b);
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [narrow, applied, sort]);

  /* THE VIEW BAR — the table's tools render into it. */
  const bar = useViewBar();
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  React.useEffect(() => {
    setPage(1);
  }, [search, applied, colQuery, colScope, activeColFilters]);

  const openProgram = programs.find((p) => p.id === openId) ?? null;
  const editing = programs.find((p) => p.id === editingId) ?? null;
  const editingDraft = React.useMemo<ProgramDraft | null>(
    () => (editing ? draftOf(editing) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId]
  );
  const filtered =
    search.trim().length > 0 ||
    applied.size > 0 ||
    colQuery.trim().length > 0 ||
    activeColFilters.length > 0;
  const clearAll = () => {
    setSearch("");
    setApplied(new Set());
    setColQuery("");
    setColFilters({});
  };

  const visibleCols = React.useMemo(
    () => cols.arrange(COLUMNS.filter((c) => !hidden.has(c.key))),
    [cols, hidden]
  );

  /* EXPORT ASKS FIRST (Pavan, 2026-10-07) — the Delivery Orders sheet, with
     every narrowing that shapes the file listed. */
  const exportFilters: ExportFilterRow[] = [
    {
      key: "search",
      label: "Search",
      values: search.trim() ? [{ value: search.trim(), onRemove: () => setSearch("") }] : [],
    },
    {
      key: "colSearch",
      label: PROGRAM_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim() ? [{ value: colQuery.trim(), onRemove: () => setColQuery("") }] : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: COLUMNS.find((c) => c.key === key)?.label ?? key,
      values: [
        {
          value: value.trim(),
          onRemove: () => setColFilters((prev) => ({ ...prev, [key]: "" })),
        },
      ],
    })),
    ...PROGRAM_FACETS.map((f) => {
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
      `recurring-programs-${new Date().toISOString().slice(0, 10)}`,
      rows.flatMap((p) =>
        /* ONE CSV ROW PER LANE, not per programme. A spreadsheet of
           programmes with a "12 sites" cell is a spreadsheet nobody can
           pivot; the lane is the unit anybody exporting this wants. */
        p.targets.map((t) => ({
          "Program #": p.programNo,
          Partner: programVendors(p).map((v) => v.name).join(" / "),
          Product: p.products.join(" + "),
          Frequency: p.schedule.label,
          Customer: t.customer.title,
          "Ship to": t.shipTo,
          City: t.city,
          State: t.state,
          Window: `${t.window.start} – ${t.window.end}`,
          Lane: t.state_,
          Serviceable: t.serviceable ? "Yes" : "No",
          "Partner price": t.vendorPrice ?? "",
          "Customer price": t.customerPrice ?? "",
        }))
      )
    );
    toast.success(
      `Exported ${rows.reduce((s, p) => s + p.targets.length, 0)} lanes`
    );
  };

  const cell = (p: RecurringProgram, key: string): React.ReactNode => {
    const live = liveTargets(p);
    const waiting = waitingTargets(p);
    const money = programMoney(p);

    switch (key) {
      case "programNo":
        return (
          <div className="flex min-w-0 items-start gap-2">
            <Network className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm tabular-nums text-foreground">
                {p.programNo}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {DATE_FMT.format(new Date(p.createdAt))}
              </span>
            </div>
          </div>
        );
      case "schedule":
        return <ScheduleCell schedule={p.schedule} roomy />;
      case "product":
        /* SEVERAL PRODUCTS: the first, and +N for the rest on hover — the
           idiom every list here uses. */
        return <OverflowList values={p.products} label="products" />;
      case "status":
        return (
          <StatusChip tone={SERIES_TONE[p.status]} variant="soft">
            {p.status}
          </StatusChip>
        );
      case "vendor":
        return (
          <span className="truncate text-sm text-foreground">
            {programPartnerLabel(p)}
          </span>
        );
      case "loadOrder":
        return (
          <span
            className={cn(
              "text-sm",
              p.loadOrder ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {p.loadOrder ? "Yes" : "No"}
          </span>
        );
      case "terminal":
        return p.loadOrder ? (
          <span className="truncate text-sm text-foreground">
            {[...new Set(p.loadRows.map((l) => l.terminal))].join(" / ")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/70">
            Partner supplies
          </span>
        );
      case "account":
        return p.loadOrder ? (
          <span className="truncate text-sm text-foreground">
            {[...new Set(p.loadRows.map((l) => l.loadingAccount))].join(" / ")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/70">{DASH}</span>
        );
      case "sites":
        return (
          <span className="text-sm tabular-nums text-foreground">
            {p.targets.length}
          </span>
        );
      case "customers":
        return (
          <span className="text-sm tabular-nums text-foreground">
            {new Set(p.targets.map((t) => t.customer.title)).size}
          </span>
        );
      case "liveness":
        /* HOW MUCH OF THE BOOK IS ACTUALLY RUNNING. A programme is rarely all
           on or all off, and a bare count of sites hides the difference
           between twelve delivering and twelve waiting to be priced. */
        return (
          <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
            <span className="text-sm tabular-nums text-foreground">
              {live.length} of {p.targets.length}
            </span>
            {waiting.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default truncate text-xs text-muted-foreground">
                    {waiting.length} waiting on the partner
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {waiting
                    .map((t) => `${t.shipTo} — ${t.serviceable ? t.state_ : "out of area"}`)
                    .join(" · ")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      case "cost":
        return money.cost > 0 ? (
          <span className="text-sm tabular-nums text-foreground">
            {MONEY(money.cost)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not priced</span>
        );
      case "revenue":
        return money.revenue > 0 ? (
          <span className="text-sm tabular-nums text-foreground">
            {MONEY(money.revenue)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not priced</span>
        );
      case "margin":
        return money.revenue > 0 ? (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              money.margin < 0 ? "text-status-failed" : "text-foreground"
            )}
          >
            {MONEY(money.margin)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{DASH}</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        /* CREATE RULE, NOT CREATE ORDER — and it opens HERE rather than
           sending the reader to the delivery-order form. V1 and V2 make a
           recurring order by ticking a box on an order, so their CTA goes
           there; a programme is its own record with its own two-step form,
           so it has its own act. */
        ctaLabel="Create Rule"
        onCreateOrder={() => {
          setSeed(null);
          setCreating(true);
        }}
        onExport={() => setExporting(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={total} one="program" many="programs" />}
          /* RECOMMENDATIONS ON THE LIST TOO (Pavan, 2026-10-06) — a rule's
             frequency and the ship-tos it fits, across customers; Review and
             Create Rule opens the form with both filled in. Next to the Filters button. */
          afterFilters={
            <RuleRecommendations
              buttonVariant="outline"
              applyLabel="Review and Create Rule"
              onApply={(r) => {
                setSeed({
                  frequency: r.frequency,
                  products: [r.product],
                  vendorIds: recommendedVendors(r).map((v) => v.id),
                  loadOrder: r.loadOrder,
                  loadingAccounts: r.loadingAccounts,
                  targets: r.targets.map((t) => ({
                    customer: { title: t.customer.name, description: t.customer.erpId },
                    shipTo: t.shipTo,
                  })),
                });
                setCreating(true);
              }}
            />
          }
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search programs, partners, products, sites…"
          filters={
            <ListFilters
              facets={PROGRAM_FACETS.map((f) => ({
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
          showGroupBy={false}
          boardView={false}
          columns={ALL_COLS.map((c) => ({ key: c.key, label: c.label }))}
          /* The column menu reorders too (Pavan, 2026-10-07). */
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
          searchFields={PROGRAM_SEARCH_FIELDS.map((f) => ({
            key: f.key,
            label: f.label,
          }))}
          colScope={colScope}
          onColScopeChange={setColScope}
          colQuery={colQuery}
          onColQueryChange={setColQuery}
          columnFiltersOpen={view === "table" && colFiltersOpen}
          settings
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
        />

        <FilterChips
          facets={PROGRAM_FACETS.map((f) => ({ key: f.key, label: f.label }))}
          selected={applied}
          onChange={setApplied}
        >
          <ColumnSearchChip
            searchFields={PROGRAM_SEARCH_FIELDS.map((f) => ({
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
        {/* THE ROW STAYS WHEN NOTHING MATCHES. Swapping the table for an
            empty state would take away the very boxes the reader has to
            change to get the rows back. */}
        {rows.length === 0 && !colFiltersOpen ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {filtered ? <SearchX /> : <Network />}
              </EmptyMedia>
              <EmptyTitle>
                {filtered ? "No programs match" : "No programs yet"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Nothing found. Check the spelling, or clear the filters above."
                  : "A program starts with a partner — pick one, and the sites they can reach become the book you build from."}
              </EmptyDescription>
            </EmptyHeader>
            {filtered && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear search and filters
              </Button>
            )}
          </Empty>
        ) : (
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
            {bar.slot && <div className="shrink-0 border-b border-fp-outline-1 bg-fp-surface-1b">{bar.slot}</div>}
            <div className="group/frame relative flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
            {/* Separated borders — see `docs/ds/ui/2-rules.md` §10d. */}
            <Table
              style={{ tableLayout: "fixed" }}
              className="border-separate border-spacing-0"
            >
              <colgroup>
                {visibleCols.map((c) => (
                  <col key={c.key} style={{ width: `${cols.widthOf(c)}px` }} />
                ))}
              </colgroup>
              <TableHeader className="bg-fp-table-header">
                <TableRow className="h-10 bg-fp-table-header hover:bg-transparent">
                  {visibleCols.map((c) => {
                    const active = sort?.key === c.key;
                    const SortIcon = !active
                      ? ChevronsUpDown
                      : sort?.dir === "asc"
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <TableColumnHeader
                        key={c.key}
                        cols={cols}
                        col={c}
                        aria-sort={
                          active
                            ? sort?.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={cn(
                          "sticky top-0 z-20 whitespace-nowrap border-b border-fp-outline-1 bg-fp-table-header px-3 text-xs font-medium text-muted-foreground",
                          c.align === "right" && "text-right"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSort(c.key)}
                          aria-label={`Sort by ${c.label}`}
                          className={cn(
                            "inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                            active && "text-foreground"
                          )}
                        >
                          {c.label}
                          <SortIcon
                            className={cn(
                              "size-3.5",
                              active ? "opacity-100" : "opacity-70"
                            )}
                          />
                        </button>
                      </TableColumnHeader>
                    );
                  })}
                </TableRow>
                {colFiltersOpen && (
                  /* THE SECOND HEADER ROW — the same band ListTable draws. */
                  <TableRow className="h-11 hover:bg-transparent">
                    {visibleCols.map((c) => (
                      <TableHead
                        key={c.key}
                        className="sticky top-10 z-20 border-b border-fp-outline-1 bg-fp-surface-1b px-2"
                      >
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
                      </TableHead>
                    ))}
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {pageRows.map((p) => (
                  <TableRow
                    key={p.id}
                    className="group/row h-16 cursor-pointer [&>td]:border-b [&>td]:border-fp-outline-1"
                    onClick={(e) => {
                      const t = e.target as HTMLElement | null;
                      if (t?.closest("button,a,input,label")) return;
                      if (window.getSelection()?.toString()) return;
                      setOpenId(p.id);
                    }}
                  >
                    {visibleCols.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn("px-3", c.align === "right" && "text-right")}
                      >
                        {cell(p, c.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
              {view === "table" && <ScrollXBar />}
              {view === "table" && (
                <ColumnSearchTab
                  open={colFiltersOpen}
                  onToggle={() =>
                  setColFiltersOpen((open) => {
                    /* CLOSING THE ROW PUTS THE TABLE BACK — boxes that are
                       gone must not go on narrowing. */
                    if (open) setColFilters({});
                    return !open;
                  })}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pill className="tabular-nums">
            {rows.reduce((s, p) => s + liveTargets(p).length, 0)} live lanes
          </Pill>
          across {rows.length} {rows.length === 1 ? "program" : "programs"}
          {/* THE ARCHIVE IS TUCKED AWAY ON PURPOSE (Pavan, 2026-09-23). V1
              and V2 are kept to refer back to until they are kept or deleted
              for good — so the way in is the quietest thing on the screen,
              not a place in the navigation. */}
          {onOpenArchive && (
            <button
              type="button"
              onClick={onOpenArchive}
              className="ml-2 flex items-center gap-1 rounded-sm text-xs text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Archive className="size-3" />
              Archive
            </button>
          )}
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
        title="Export Programs"
        noun="programs"
        nounOne="program"
        count={rows.length}
        filtersControl={
          <ListFilters
            facets={PROGRAM_FACETS.map((f) => ({
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
              `Exporting ${rows.length} ${rows.length === 1 ? "program" : "programs"} as .${format}`
            );
        }}
      />

      <RecurringProgramCreate
        open={creating || editing !== null}
        onOpenChange={(v) => {
          if (v) return;
          setCreating(false);
          setEditingId(null);
          setSeed(null);
        }}
        /* A rule never clashes with itself. */
        all={editing ? programs.filter((p) => p.id !== editing.id) : programs}
        initial={editingDraft}
        seed={editing ? null : seed}
        onCreate={(d: ProgramDraft) => {
          const schedule = toSchedule(d.frequency);
          const partners = d.vendorIds
            .map((id) => VENDORS.find((v) => v.id === id)?.name)
            .filter(Boolean);
          const next: RecurringProgram = {
            id: `prog-new-${Date.now()}`,
            programNo: d.name.trim() || `P-${2140 + programs.length * 7}`,
            createdAt: new Date().toISOString(),
            vendorIds: d.vendorIds,
            jobType: d.jobType,
            loadOrder: d.loadOrder,
            /* A row per account; the stored rule keeps the account's
               products that are on the rule, and all its terminals and
               suppliers. */
            loadRows: d.loadOrder
              ? d.loadRows.flatMap((r) => {
                  const a = LOADING_ACCOUNTS.find((x) => x.name === r.loadingAccount);
                  return a
                    ? [
                        {
                          products: a.products.filter((p) => d.products.includes(p)),
                          terminal: terminalsOf(a).join(" / "),
                          supplier: suppliersOf(a).join(" / "),
                          loadingAccount: a.name,
                        },
                      ]
                    : [];
                })
              : [],
            products: d.products,
            winterProducts: d.winterProducts,
            /* Under "All" the program takes its first product's line. */
            serviceLine: lineOfProduct(d.products[0] ?? ""),
            business: LINE_BUSINESSES[lineOfProduct(d.products[0] ?? "")][0] ?? null,
            orderType: "Core",
            signatureOnDelivery: d.signatureOnDelivery,
            schedule,
            frequency: d.frequency,
            startKey: d.startKey,
            endKey: d.frequency.endKey,
            tags: [],
            internalNote: "",
            /* EVERY LANE STARTS AS A DRAFT. Creating the rule does not start
               a truck — the partner has to price and accept each lane, and
               the sheet lists them all under Waiting until they do. */
            targets: d.targets,
            status:
              d.startKey > dateKeyOf(startOfDay(new Date()))
                ? "Upcoming"
                : "Active",
          };
          /* "STOP THE OTHER RULE HERE" — written onto those rules' ship-tos
             now that this rule exists. They keep running everywhere else. */
          const asks = d.targets.flatMap((t) =>
            (t.othersSkip ?? []).map((o) => ({ ...o, shipTo: t.shipTo }))
          );
          next.targets = next.targets.map((t) => ({ ...t, othersSkip: undefined }));
          if (asks.length)
            setPrograms((prev) =>
              prev.map((p) => {
                const mine = asks.filter((a) => a.programId === p.id);
                if (!mine.length) return p;
                return {
                  ...p,
                  targets: p.targets.map((t) => {
                    const a = mine.find((x) => x.shipTo === t.shipTo);
                    if (!a) return t;
                    return {
                      ...t,
                      skip: {
                        weekdays: [...new Set([...(t.skip?.weekdays ?? []), ...a.weekdays])],
                        monthDays: [...new Set([...(t.skip?.monthDays ?? []), ...a.monthDays])],
                      },
                    };
                  }),
                };
              })
            );
          if (editing) {
            /* SAVING REPLACES THE RULE IN PLACE — same record, same row. */
            const saved: RecurringProgram = {
              ...next,
              id: editing.id,
              createdAt: editing.createdAt,
              serviceLine: editing.serviceLine,
              business: editing.business,
              orderType: editing.orderType,
              tags: editing.tags,
              internalNote: editing.internalNote,
            };
            setPrograms((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
            setEditingId(null);
            setOpenId(saved.id);
            toast.success(`${saved.programNo} saved`);
            return;
          }
          setPrograms((prev) => [next, ...prev]);
          setOpenId(next.id);
          toast.success(`${next.programNo} created`, {
            description: `${d.targets.length} draft ${d.targets.length === 1 ? "lane" : "lanes"} waiting on ${partners.join(", ") || "the partner"} to price.`,
          });
        }}
      />

      <RecurringProgramSheet
        program={openProgram}
        all={programs}
        open={openProgram !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
        onChange={(next) =>
          setPrograms((prev) => prev.map((p) => (p.id === next.id ? next : p)))
        }
        onEdit={(p) => {
          setOpenId(null);
          setEditingId(p.id);
        }}
      />
    </div>
  );
}
