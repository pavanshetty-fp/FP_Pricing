import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Repeat,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TableColumnHeader,
  TablePagination,
  useTableColumns,
} from "@/components/tables-layout";
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
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DATE_FMT, MONEY, dateKeyOf, startOfDay } from "../data";
import { VENDORS } from "./vendors";
import { SERIES_STATUSES, type SeriesStatus } from "./recurring";
import { LINE_BUSINESSES, SERVICE_LINES, type ServiceLine } from "./orders";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  RECURRING_RULES,
  matchesRule,
  ruleGallons,
  ruleUpcoming,
  type RecurringRule,
} from "./recurringRules";
import { RecurringRuleSheet } from "./RecurringRuleSheet";
import { ScheduleCell } from "./ScheduleCell";

/*
  RECURRING ORDERS — V1, the rule-based list.

  ONE ROW PER RULE, AND A RULE IS NOT AN ORDER. There is no order number in the
  identity column and no parent to expand: the row IS the standing arrangement,
  and its deliveries live in the sheet's calendar rather than nested under it.
  That is the whole difference from V2, and it is why this list can carry the
  commercial terms — partner, load-order responsibility, both sides of the
  price — where V2's row had to spend its width on an order's own fields.

  SEVENTEEN COLUMNS, FLAT AND ALL EQUAL. They were grouped under Rule /
  Customer details / Delivery details / Vendor details / Pricing, which read
  well and cost the reader everything else: a column could only move inside
  its own group, the header was two rows tall on every screen, and the groups
  asserted a relationship the reader is not obliged to accept. Flat, every
  column sorts, resizes and goes anywhere — which is what `useTableColumns`
  gives for free, and could not while the header had two tiers.

  THE TABLE IS WIDE AND SCROLLS SIDEWAYS. That is the honest consequence of
  putting the terms on the row; the answer is the column menu and the reader's
  own ordering, not a second header row.

  THE LOAD-ORDER COLUMNS ARE EMPTY FOR HALF THE ROWS on purpose. Terminal,
  supplier and loading account only mean something when we buy the product; on
  a partner-supplied rule there is no value to show, and inventing one would be
  worse than the em-dash.
*/



const DASH = "—";

const SERIES_TONE: Record<
  SeriesStatus,
  "success" | "processing" | "failed" | "neutral"
> = {
  Upcoming: "processing",
  Active: "success",
  Paused: "failed",
  Cancelled: "neutral",
  Ended: "neutral",
  Expired: "neutral",
};

interface Col {
  key: string;
  label: string;
  width: number;
  align?: "right";
  /** What it sorts BY. Omit and the column does not sort. */
  sort?: (r: RecurringRule) => string | number;
}

/**
 * THE COLUMNS, FLAT.
 *
 * They were grouped under Rule / Customer details / Delivery details / Vendor
 * details / Pricing, which read well on a 2,400px table and cost the reader
 * everything else: a column could only move inside its own group, the header
 * was two rows tall on every screen, and the groups claimed a relationship
 * between columns that the reader is not obliged to accept. Flat, every column
 * is a peer — it sorts, it resizes, and it goes anywhere.
 *
 * WIDTHS STILL MATCH `BROKER_COLUMNS` wherever the same fact appears on the
 * orders table. Losing the groups does not licence losing that.
 */
const COLUMNS: Col[] = [
  {
    key: "ruleNo",
    label: "Rule # / Created",
    width: 150,
    sort: (r) => r.ruleNo,
  },
  { key: "schedule", label: "Schedule", width: 190, sort: (r) => r.schedule.label },
  {
    key: "next",
    label: "Next Delivery",
    /* A NULL NEXT DATE SORTS LAST, not first. A rule with nothing coming is
       not the most imminent thing on the list. */
    width: 150,
    sort: (r) => r.nextKey ?? "9999",
  },
  { key: "status", label: "Status", width: 190, sort: (r) => r.status },
  { key: "customer", label: "Customer", width: 230, sort: (r) => r.customer.title },
  { key: "shipTo", label: "Ship To", width: 190, sort: (r) => r.shipTo },
  {
    key: "assets",
    label: "Assets",
    width: 170,
    sort: (r) => r.assets[0] ?? "",
  },
  {
    key: "products",
    label: "Products",
    width: 230,
    sort: (r) => r.lines[0]?.product ?? "",
  },
  {
    key: "qty",
    label: "Qty (Gal)",
    width: 110,
    align: "right",
    sort: (r) => ruleGallons(r),
  },
  {
    key: "vendor",
    label: "Partner",
    width: 190,
    sort: (r) => VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
  },
  { key: "poc", label: "POC", width: 170, sort: (r) => r.vendorPoc ?? "" },
  {
    key: "loadOrder",
    label: "Load Order",
    width: 110,
    sort: (r) => (r.loadOrder?.length ? "Yes" : "No"),
  },
  {
    key: "terminal",
    label: "Terminal",
    width: 160,
    sort: (r) => r.loadOrder?.[0]?.terminal ?? "",
  },
  {
    key: "supplier",
    label: "Supplier",
    width: 160,
    sort: (r) => r.loadOrder?.[0]?.supplier ?? "",
  },
  {
    key: "account",
    label: "Loading Account",
    width: 170,
    sort: (r) => r.loadOrder?.[0]?.loadingAccount ?? "",
  },
  {
    key: "vendorPrice",
    /* THE PRICING PAIR HAS TO NAME ITSELF NOW. Under a "Pricing" heading
       "Vendor" and "Customer" were unambiguous; flat, "Customer" already
       means the customer's NAME three columns to the left. A group heading
       that was carrying meaning has to hand it back to the labels. */
    label: "Vendor Price",
    width: 130,
    align: "right",
    /* NOT PRICED SORTS LAST on a money column, for the same reason a missing
       date does: an absent number is not the smallest one. */
    sort: (r) => r.vendorPrice ?? Number.MAX_SAFE_INTEGER,
  },
  {
    key: "customerPrice",
    label: "Customer Price",
    width: 140,
    align: "right",
    sort: (r) => r.customerPrice ?? Number.MAX_SAFE_INTEGER,
  },
];

const ALL_COLS: Col[] = COLUMNS;
const COL_KEYS: string[] = COLUMNS.map((c) => c.key);

/**
 * WHAT THE LIST CAN BE NARROWED BY. Three, and each one is a question somebody
 * actually walks up to this screen with: which of these are running, who hauls
 * them, and how often. Every other column is findable through the column
 * search rather than through a facet — a panel with fifteen sections is a
 * panel nobody opens twice.
 */
const RULE_FACETS: {
  key: string;
  label: string;
  options: string[];
  valueOf: (r: RecurringRule) => string;
  searchable?: boolean;
}[] = [
  {
    key: "status",
    label: "Status",
    options: SERIES_STATUSES,
    valueOf: (r) => r.status,
  },
  {
    key: "partner",
    label: "Partner",
    options: [...new Set(VENDORS.map((v) => v.name))].sort(),
    valueOf: (r) => VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
    searchable: true,
  },
  {
    key: "frequency",
    label: "Frequency",
    options: [...new Set(RECURRING_RULES.map((r) => r.schedule.label))].sort(),
    valueOf: (r) => r.schedule.label,
  },
];

/**
 * THE ONE SPLIT WORTH A CONTROL RATHER THAN A FACET.
 *
 * Who runs the work is the question a reader flips between several times a
 * session — the brokerage book and the own-fleet book are two different jobs
 * with two different people worrying about them. A facet you open, tick and
 * close is the wrong amount of work for something changed that often.
 *
 * THREE SEGMENTS, EXHAUSTIVE AND SHORT, which is the bar for putting a split
 * here at all. Everything else stays in the panel.
 */
const OPERATIONS = [
  { key: "all", label: "All" },
  { key: "first", label: "First party operations" },
  { key: "third", label: "Third party operations" },
] as const;

type Operations = (typeof OPERATIONS)[number]["key"];

/** The columns the column-search row can ask a question OF. */
const RULE_SEARCH_FIELDS: {
  key: string;
  label: string;
  text: (r: RecurringRule) => string;
}[] = [
  { key: "ruleNo", label: "Rule #", text: (r) => r.ruleNo },
  {
    key: "customer",
    label: "Customer",
    text: (r) => `${r.customer.title} ${r.customer.description}`,
  },
  { key: "shipTo", label: "Ship To", text: (r) => r.shipTo },
  { key: "schedule", label: "Schedule", text: (r) => r.schedule.label },
  {
    key: "products",
    label: "Products",
    text: (r) => r.lines.map((l) => l.product).join(" "),
  },
  {
    key: "vendor",
    label: "Partner",
    text: (r) => VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
  },
  { key: "poc", label: "POC", text: (r) => r.vendorPoc ?? "" },
];

function vendorName(id: string | null): string | null {
  if (!id) return null;
  return VENDORS.find((v) => v.id === id)?.name ?? null;
}

/**
 * A load-order field, which is a LIST per product rather than one value. The
 * first is shown and the rest are counted, which is the same call the orders
 * table's Products cell makes — a cell that stacked four terminals would set
 * the row height for every row in the table.
 */
function LoadField({ values, empty }: { values: string[]; empty: string }) {
  const unique = [...new Set(values)];
  if (unique.length === 0)
    return <span className="text-sm text-muted-foreground/70">{empty}</span>;
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="truncate text-sm text-foreground">{unique[0]}</span>
      {unique.length > 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 cursor-default text-xs text-muted-foreground">
              +{unique.length - 1}
            </span>
          </TooltipTrigger>
          <TooltipContent>{unique.slice(1).join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

export function RecurringRulesScreen({
  onCreateRule,
}: {
  /**
   * THE CTA GOES WHERE CREATION ACTUALLY HAPPENS. A rule is not created on
   * this screen — it is created by ticking Recurring on a delivery order and
   * giving it a frequency, which is the flow that already exists. A second
   * create form here would be a second way to make the same record, and the
   * two would drift.
   */
  onCreateRule?: () => void;
} = {}) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const todayKey = dateKeyOf(today);

  const [search, setSearch] = React.useState("");
  const [applied, setApplied] = React.useState<ReadonlySet<string>>(new Set());
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set());
  const [view, setView] = React.useState<ListView>("table");
  const [colScope, setColScope] = React.useState(RULE_SEARCH_FIELDS[0].key);
  const [colQuery, setColQuery] = React.useState("");
  const [ops, setOps] = React.useState<Operations>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  /* THE SCOPE SHELF — the line, and the business inside it. Not a filter: a
     filter narrows the list you are looking at, and this says WHICH LIST. It
     is the same pair the orders board carries, in the same place. */
  const [line, setLine] = React.useState<ServiceLine>("Fuel");
  const [business, setBusiness] = React.useState<string | null>(null);
  /* THE RULES LIVE IN STATE, not straight off the fixture, because a delivery
     edited in the sheet has to survive closing it. The seed is the starting
     point and nothing writes back to it. */
  const [rules, setRules] = React.useState<RecurringRule[]>(RECURRING_RULES);
  const [openId, setOpenId] = React.useState<string | null>(null);

  /* ── THE COLUMNS ARE THE READER'S ──────────────────────────────────────
     `useTableColumns` is the DS's one call for all three behaviours — order,
     widths, and the guard that stops a resize press starting a drag. It was
     unusable while the header had two tiers, because a grouped column could
     only move inside its group and the hook knows nothing about groups.
     Flat, it is exactly the right thing and there is nothing to wire. */
  const [colOrder, setColOrder] = React.useState<string[]>(COL_KEYS);
  const [widths, setWidths] = React.useState<Record<string, number>>({});
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

  /* ASC → DESC → UNSORTED, the same three-press cycle every other table here
     uses. The third press matters: a reader who sorted by accident needs the
     way back to the list's own order. */
  const onSort = (key: string) =>
    setSort((prev) =>
      !prev || prev.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
    );

  const visibleCols = React.useMemo(
    () => cols.arrange(COLUMNS.filter((c) => !hidden.has(c.key))),
    [cols, hidden]
  );

  /* SAVED VIEWS remember everything the reader arranged and nothing the app
     decided — the narrowing, the sort, the column order, widths and what is
     hidden. Not the scope shelf: Default means "nothing applied". */
  type ViewState = {
    search: string;
    applied: string[];
    hidden: string[];
    colScope: string;
    colQuery: string;
    colOrder: string[];
    widths: Record<string, number>;
    sort: { key: string; dir: "asc" | "desc" } | null;
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
    },
    defaultState: {
      search: "",
      applied: [],
      hidden: [],
      colScope: RULE_SEARCH_FIELDS[0].key,
      colQuery: "",
      colOrder: COL_KEYS,
      widths: {},
      sort: null,
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
      setColOrder(v.colOrder);
      setWidths(v.widths);
      setSort(v.sort);
      setPage(1);
    },
  });

  /* THREE NARROWINGS, AND-ED. Free text across the whole record, the facet
     panel, and a question asked OF one column — they answer different
     questions and a reader uses them together, so none of them replaces
     another. */
  const rows = React.useMemo(() => {
    const cq = colQuery.trim().toLowerCase();
    const field = RULE_SEARCH_FIELDS.find((f) => f.key === colScope);
    const byFacet = [...applied].reduce<Record<string, string[]>>((acc, id) => {
      const at = id.indexOf(":");
      const k = id.slice(0, at);
      (acc[k] ??= []).push(id.slice(at + 1));
      return acc;
    }, {});
    const kept = rules.filter((r) => {
      /* THE SCOPE COMES FIRST, because it is not a narrowing of the list — it
         IS the list. A rule on another line is not a hidden row, it is a row
         that belongs to a different screenful. */
      if (r.serviceLine !== line) return false;
      if (business !== null && r.business !== business) return false;
      if (ops === "first" && r.jobType !== "Transportation") return false;
      if (ops === "third" && r.jobType !== "Brokerage") return false;
      if (!matchesRule(r, search)) return false;
      if (cq && field && !field.text(r).toLowerCase().includes(cq))
        return false;
      /* WITHIN a facet the options are OR-ed — picking two partners means
         either — and BETWEEN facets they are AND-ed, which is what ticking
         boxes in two different sections looks like it should do. */
      return Object.entries(byFacet).every(([k, wanted]) => {
        const facet = RULE_FACETS.find((f) => f.key === k);
        return !facet || wanted.includes(facet.valueOf(r));
      });
    });

    /* SORTING IS THE LAST STEP, over what survived the narrowing — sorting
       first and filtering after would do the same work and throw most of it
       away. Unsorted returns the fixture's own order, which is what the third
       press of a header goes back to. */
    const col = sort && COLUMNS.find((c) => c.key === sort.key);
    if (!sort || !col?.sort) return kept;
    const dir = sort.dir === "asc" ? 1 : -1;
    const of = col.sort;
    return [...kept].sort((a, b) => {
      const av = of(a);
      const bv = of(b);
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rules, search, applied, colScope, colQuery, line, business, ops, sort]);

  /* PAGINATION IS OVER THE NARROWED LIST, and the page resets whenever the
     narrowing changes — page 4 of a list that just became one page long is a
     screen that reads as empty. */
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

  /* READ THE OPEN RULE OUT OF STATE EVERY RENDER. Holding the rule object
     itself would leave the sheet showing the version it was opened with, so
     an edit made inside it would not appear on the calendar behind it. */
  const openRule = rules.find((r) => r.id === openId) ?? null;

  const filtered =
    search.trim().length > 0 || applied.size > 0 || colQuery.trim().length > 0;

  const clearAll = () => {
    setSearch("");
    setApplied(new Set());
    setColQuery("");
  };

  const cell = (r: RecurringRule, key: string): React.ReactNode => {
    switch (key) {
      case "ruleNo":
        return (
          <div className="flex min-w-0 items-start gap-2">
            <Repeat className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm tabular-nums text-foreground">
                {r.ruleNo}
              </span>
              {/* WHEN IT WAS SET UP, under the number it belongs to. A rule
                  made in March to start in September is a booked arrangement;
                  one made today to start today is somebody reacting. */}
              <span className="truncate text-xs text-muted-foreground">
                {DATE_FMT.format(new Date(r.createdAt))}
              </span>
            </div>
          </div>
        );
      case "schedule":
        return <ScheduleCell schedule={r.schedule} />;
      case "next": {
        const ahead = ruleUpcoming(r, todayKey);
        return r.nextKey ? (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm tabular-nums text-foreground">
              {DATE_FMT.format(new Date(`${r.nextKey}T00:00:00`))}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {ahead} cut so far
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{DASH}</span>
        );
      }
      case "status":
        return (
          <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
            <StatusChip
              tone={SERIES_TONE[r.status]}
              variant="soft"
              className="self-start"
            >
              {r.status}
            </StatusChip>
            {r.stalledReason && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default truncate text-xs text-muted-foreground">
                    {r.stalledReason}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{r.stalledReason}</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      case "customer":
        return (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm text-foreground">
              {r.customer.title}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {r.customer.description}
            </span>
          </div>
        );
      case "shipTo":
        return (
          <span className="truncate text-sm text-foreground">{r.shipTo}</span>
        );
      case "assets":
        /* NOT MANDATORY. "Any" is the rule's real answer; an em-dash would
           read as a field somebody forgot. */
        return r.assets.length > 0 ? (
          <LoadField values={r.assets} empty="Any" />
        ) : (
          <span className="text-sm text-muted-foreground">Any</span>
        );
      case "products":
        return (
          <LoadField values={r.lines.map((l) => l.product)} empty={DASH} />
        );
      case "qty": {
        const gal = ruleGallons(r);
        return gal > 0 ? (
          <span className="text-sm tabular-nums text-foreground">
            {gal.toLocaleString()}
          </span>
        ) : (
          <Badge variant="secondary">Top off</Badge>
        );
      }
      case "vendor": {
        const name = vendorName(r.vendorId);
        return name ? (
          <span className="truncate text-sm text-foreground">{name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Not assigned</span>
        );
      }
      case "poc":
        return r.vendorPoc ? (
          <span className="truncate text-sm text-foreground">
            {r.vendorPoc}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/70">{DASH}</span>
        );
      case "loadOrder":
        /* THE ANSWER IS WHO BUYS THE PRODUCT, so the word is Yes or No and the
           three columns after it are the detail of a Yes. */
        return (
          <span
            className={cn(
              "text-sm",
              r.loadOrder?.length ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {r.loadOrder?.length ? "Yes" : "No"}
          </span>
        );
      case "terminal":
        return (
          <LoadField
            values={r.loadOrder?.map((l) => l.terminal) ?? []}
            empty="Partner supplies"
          />
        );
      case "supplier":
        return (
          <LoadField
            values={r.loadOrder?.map((l) => l.supplier) ?? []}
            empty={DASH}
          />
        );
      case "account":
        return (
          <LoadField
            values={r.loadOrder?.map((l) => l.loadingAccount) ?? []}
            empty={DASH}
          />
        );
      case "vendorPrice":
        return r.vendorPrice !== null ? (
          <span className="text-sm tabular-nums text-foreground">
            {MONEY(r.vendorPrice)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not priced</span>
        );
      case "customerPrice":
        return r.customerPrice !== null ? (
          <span className="text-sm tabular-nums text-foreground">
            {MONEY(r.customerPrice)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not priced</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE SCOPE SHELF — preset views, the line and the business inside it,
          Export and the CTA. It is the top half of the action unit and it is
          the SAME BAR the orders board carries, because a reader who has
          learnt one list has learnt this one. See `docs/ds/ui/2-rules.md`
          §10c. */}
      <FuelOrdersViewBar
        {...savedViews}
        /* DEFAULT MEANS NOTHING IS APPLIED, and that has to include the
           business — `useSavedViews` knows nothing about the shelf above it. */
        onResetToDefault={() => {
          setBusiness(null);
          savedViews.onResetToDefault();
        }}
        segments={SERVICE_LINES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(l) => {
          setLine(l as ServiceLine);
          /* THE BUSINESS BELONGS TO THE LINE. Tank Wagon is a fuel word, and
             carrying it to Propane would underline a tab that narrows by
             something that line has never heard of. */
          setBusiness(null);
          setPage(1);
        }}
        presets={LINE_BUSINESSES[line].map((b) => ({ key: b, label: b }))}
        presetKey={business}
        onPresetChange={(b) => {
          setBusiness((prev) => (prev === b ? null : b));
          setPage(1);
        }}
        ctaLabel="Create Order"
        onCreateOrder={onCreateRule}
        onExport={() => {
          downloadCsv(
            `recurring-rules-${new Date().toISOString().slice(0, 10)}`,
            rows.map((r) => ({
              "Rule #": r.ruleNo,
              Schedule: r.schedule.label,
              Status: r.status,
              "Next delivery": r.nextKey ?? "",
              Customer: r.customer.title,
              "Ship to": r.shipTo,
              Assets: r.assets.join(" / ") || "Any",
              Products: r.lines.map((l) => l.product).join(" / "),
              "Qty (gal)": ruleGallons(r),
              Partner: vendorName(r.vendorId) ?? "",
              POC: r.vendorPoc ?? "",
              "Load order": r.loadOrder?.length ? "Yes" : "No",
              Terminal: r.loadOrder?.map((l) => l.terminal).join(" / ") ?? "",
              Supplier: r.loadOrder?.map((l) => l.supplier).join(" / ") ?? "",
              "Loading account":
                r.loadOrder?.map((l) => l.loadingAccount).join(" / ") ?? "",
              "Vendor price": r.vendorPrice ?? "",
              "Customer price": r.customerPrice ?? "",
            })),
          );
          toast.success(
            `Exported ${rows.length} ${rows.length === 1 ? "rule" : "rules"}`,
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
        {/* THE ACTION UNIT. Every list in this app carries it, and it carries the
          same controls in the same order — search, filters, the view switch,
          the column tools. A list that grew its own two-control bar was a list
          people had to learn separately for no reason.

          NO BOARD, NO MAP, NO GROUP BY. Standing arrangements have no lanes to
          sit in and no pins to drop, and row grouping would fight the column
          groups this table already has for the word "group". Each is switched
            off at the toolbar rather than drawn dead. */}
        <ListToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search rules, customers, sites, partners…"
          filters={
            <ListFilters
              facets={RULE_FACETS.map((f) => ({
                key: f.key,
                label: f.label,
                options: f.options,
                searchable: f.searchable,
              }))}
              value={applied}
              onApply={setApplied}
            />
          }
          /* THE SEGMENTS SIT WITH SEARCH AND FILTERS, because they narrow the
             list — which is what everything on that side of the toolbar does.
             `h-8` matches the search field and the Filters button exactly; a
             control a pixel off on a row of three reads as a mistake. */
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
          columns={ALL_COLS.map((c) => ({ key: c.key, label: c.label }))}
          columnOrder={colOrder}
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
          searchFields={RULE_SEARCH_FIELDS.map((f) => ({
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

        {/* NARROWED IS SAID OUT LOUD. The facet panel remembers what was picked
            and then closes, and a list quietly narrowed is the commonest way
            somebody concludes their data has gone missing. */}
        <FilterChips
          facets={RULE_FACETS.map((f) => ({ key: f.key, label: f.label }))}
          selected={applied}
          onChange={setApplied}
        >
          <ColumnSearchChip
            searchFields={RULE_SEARCH_FIELDS.map((f) => ({
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
                {filtered ? "No rules match" : "No recurring rules yet"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Nothing found. Check the spelling, or clear the filters above."
                  : "Tick Recurring on a delivery order and give it a frequency — the rule appears here."}
              </EmptyDescription>
            </EmptyHeader>
            {filtered && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear search and filters
              </Button>
            )}
          </Empty>
        ) : (
          <div className="h-full overflow-auto rounded-md border border-border [&_[data-slot=table-container]]:overflow-visible">
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
                {visibleCols.map((c) => (
                  <col key={c.key} style={{ width: `${cols.widthOf(c)}px` }} />
                ))}
              </colgroup>
              {/* THE CELLS STICK, NOT THE HEADER — a collapsed-border table
                  ignores z-index on `<thead>`, so the table separates its
                  borders and each header cell sticks on its own. See
                  `docs/ds/ui/2-rules.md` §10d. */}
              <TableHeader className="bg-fp-table-header">
                <TableRow className="h-10 bg-fp-table-header hover:bg-transparent">
                  {visibleCols.map((c) => {
                    const active = sort?.key === c.key;
                    const SortIcon = !active
                      ? ChevronsUpDown
                      : sort?.dir === "asc"
                        ? ChevronUp
                        : ChevronDown;
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
                        {/* EVERY COLUMN SORTS, which is a rule rather than a
                            taste: a header that sorts on one column and not
                            the next teaches the reader to stop trying, and
                            the ones left out are always the text columns —
                            exactly where "show me these together" is asked
                            most. */}
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
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow
                    key={r.id}
                    /* THE ROW RULE LIVES ON THE CELLS, because a border on a
                       `<tr>` does not paint once the table's borders are
                       separated. */
                    className="group/row h-14 cursor-pointer [&>td]:border-b [&>td]:border-fp-outline-1"
                    onClick={(e) => {
                      const t = e.target as HTMLElement | null;
                      if (t?.closest("button,a,input,label,[role='checkbox']"))
                        return;
                      if (window.getSelection()?.toString()) return;
                      setOpenId(r.id);
                    }}
                  >
                    {visibleCols.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn("px-3", c.align === "right" && "text-right")}
                      >
                        {cell(r, c.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* THE PAGE POSITION IS THE FOOTER'S JOB, and it is the one number a
          paged list owes the reader: which of how many, and how to get to the
          next. It is the same control every other list in the app ends with. */}
      <div className="mt-4 shrink-0">
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

      <RecurringRuleSheet
        rule={openRule}
        open={openRule !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
        onChange={(next) =>
          setRules((prev) => prev.map((r) => (r.id === next.id ? next : r)))
        }
      />
    </div>
  );
}
