import * as React from "react";
import { Network, SearchX, Archive } from "lucide-react";
import { toast } from "sonner";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TablePagination } from "@/components/tables-layout";
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
import { DATE_FMT } from "../data";
import {
  LINE_BUSINESSES,
  SERVICE_LINES,
  type ServiceLine,
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
import { toSchedule } from "./RuleFrequency";
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

  THE COLUMN GROUPS ARE V1'S, minus the ones that stopped being single values.
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
  Cancelled: "neutral",
  Ended: "neutral",
  Expired: "neutral",
});

interface Col {
  key: string;
  label: string;
  width: number;
  align?: "right";
}

const GROUPS: { label: string; cols: Col[] }[] = [
  {
    label: "Programme",
    cols: [
      { key: "programNo", label: "Programme # / Created", width: 170 },
      { key: "schedule", label: "Frequency", width: 190 },
      { key: "product", label: "Product", width: 170 },
      { key: "status", label: "Status", width: 170 },
    ],
  },
  {
    label: "Partner",
    cols: [
      { key: "vendor", label: "Partner", width: 190 },
      { key: "loadOrder", label: "Load Order", width: 110 },
      { key: "terminal", label: "Terminal", width: 160 },
      { key: "account", label: "Loading Account", width: 170 },
    ],
  },
  {
    label: "Coverage",
    cols: [
      { key: "sites", label: "Sites", width: 110, align: "right" },
      { key: "customers", label: "Customers", width: 110, align: "right" },
      { key: "liveness", label: "Lanes Live", width: 150 },
    ],
  },
  {
    label: "Per run",
    cols: [
      { key: "cost", label: "Partner", width: 120, align: "right" },
      { key: "revenue", label: "Customer", width: 120, align: "right" },
      { key: "margin", label: "Margin", width: 120, align: "right" },
    ],
  },
];

const ALL_COLS = GROUPS.flatMap((g) => g.cols);

const PROGRAM_FACETS: {
  key: string;
  label: string;
  options: string[];
  valueOf: (p: RecurringProgram) => string;
  /** For a facet a row can hold more than one of — a programme's partners. */
  valuesOf?: (p: RecurringProgram) => string[];
  searchable?: boolean;
}[] = [
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
  { key: "programNo", label: "Programme #", text: (p) => p.programNo },
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
  const [search, setSearch] = React.useState("");
  const [applied, setApplied] = React.useState<ReadonlySet<string>>(new Set());
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set());
  const [view, setView] = React.useState<ListView>("table");
  const [colScope, setColScope] = React.useState(PROGRAM_SEARCH_FIELDS[0].key);
  const [colQuery, setColQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [line, setLine] = React.useState<ServiceLine>("Fuel");
  const [business, setBusiness] = React.useState<string | null>(null);

  const savedViews = useSavedViews<{
    search: string;
    applied: string[];
    hidden: string[];
    colScope: string;
    colQuery: string;
  }>({
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
      colScope: PROGRAM_SEARCH_FIELDS[0].key,
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

  const rows = React.useMemo(() => {
    const cq = colQuery.trim().toLowerCase();
    const field = PROGRAM_SEARCH_FIELDS.find((f) => f.key === colScope);
    const byFacet = [...applied].reduce<Record<string, string[]>>((acc, id) => {
      const at = id.indexOf(":");
      (acc[id.slice(0, at)] ??= []).push(id.slice(at + 1));
      return acc;
    }, {});
    return programs.filter((p) => {
      if (p.serviceLine !== line) return false;
      if (business !== null && p.business !== business) return false;
      if (!matchesProgram(p, search)) return false;
      if (cq && field && !field.text(p).toLowerCase().includes(cq)) return false;
      return Object.entries(byFacet).every(([k, wanted]) => {
        const facet = PROGRAM_FACETS.find((f) => f.key === k);
        if (!facet) return true;
        const mine = facet.valuesOf?.(p) ?? [facet.valueOf(p)];
        return mine.some((x) => wanted.includes(x));
      });
    });
  }, [programs, search, applied, colScope, colQuery, line, business]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  React.useEffect(() => {
    setPage(1);
  }, [search, applied, colQuery, colScope, line, business]);

  const openProgram = programs.find((p) => p.id === openId) ?? null;
  const filtered =
    search.trim().length > 0 || applied.size > 0 || colQuery.trim().length > 0;
  const clearAll = () => {
    setSearch("");
    setApplied(new Set());
    setColQuery("");
  };

  const visibleGroups = GROUPS.map((g) => ({
    label: g.label,
    cols: g.cols.filter((c) => !hidden.has(c.key)),
  })).filter((g) => g.cols.length > 0);
  const flatCols = visibleGroups.flatMap((g) => g.cols);

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
        return <ScheduleCell schedule={p.schedule} />;
      case "product":
        return (
          <span className="truncate text-sm text-foreground">
            {p.products.join(" + ")}
          </span>
        );
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
        onResetToDefault={() => {
          setBusiness(null);
          savedViews.onResetToDefault();
        }}
        segments={SERVICE_LINES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(l) => {
          setLine(l as ServiceLine);
          setBusiness(null);
          setPage(1);
        }}
        presets={LINE_BUSINESSES[line].map((b) => ({ key: b, label: b }))}
        presetKey={business}
        onPresetChange={(b) => {
          setBusiness((prev) => (prev === b ? null : b));
          setPage(1);
        }}
        /* CREATE RULE, NOT CREATE ORDER — and it opens HERE rather than
           sending the reader to the delivery-order form. V1 and V2 make a
           recurring order by ticking a box on an order, so their CTA goes
           there; a programme is its own record with its own two-step form,
           so it has its own act. */
        ctaLabel="Create Rule"
        onCreateOrder={() => setCreating(true)}
        onExport={() => {
          downloadCsv(
            `recurring-programmes-${new Date().toISOString().slice(0, 10)}`,
            rows.flatMap((p) =>
              /* ONE CSV ROW PER LANE, not per programme. A spreadsheet of
                 programmes with a "12 sites" cell is a spreadsheet nobody can
                 pivot; the lane is the unit anybody exporting this wants. */
              p.targets.map((t) => ({
                "Programme #": p.programNo,
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
            `Exported ${rows.reduce((s, p) => s + p.targets.length, 0)} lanes`,
            { description: "One row per lane, across the programmes shown." }
          );
        }}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search programmes, partners, products, sites…"
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
            />
          }
          showGroupBy={false}
          boardView={false}
          columns={ALL_COLS.map((c) => ({ key: c.key, label: c.label }))}
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
        {rows.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {filtered ? <SearchX /> : <Network />}
              </EmptyMedia>
              <EmptyTitle>
                {filtered ? "No programmes match" : "No programmes yet"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Nothing found. Check the spelling, or clear the filters above."
                  : "A programme starts with a partner — pick one, and the sites they can reach become the book you build from."}
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
            {/* Separated borders — see `docs/ds/ui/2-rules.md` §10d. */}
            <Table
              style={{ tableLayout: "fixed" }}
              className="border-separate border-spacing-0"
            >
              <colgroup>
                {flatCols.map((c) => (
                  <col key={c.key} style={{ width: `${c.width}px` }} />
                ))}
              </colgroup>
              <TableHeader className="bg-fp-table-header">
                <TableRow className="h-10 bg-fp-table-header hover:bg-transparent">
                  {visibleGroups.map((g, gi) => (
                    <TableHead
                      key={g.label}
                      colSpan={g.cols.length}
                      className={cn(
                        "sticky top-0 z-20 whitespace-nowrap border-b border-fp-outline-1 bg-fp-table-header px-3 text-xs font-semibold text-foreground",
                        gi > 0 && "border-l border-fp-outline-1"
                      )}
                    >
                      {g.label}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className="h-10 bg-fp-table-header hover:bg-transparent">
                  {visibleGroups.map((g, gi) =>
                    g.cols.map((c, ci) => (
                      <TableHead
                        key={c.key}
                        className={cn(
                          "sticky top-10 z-20 whitespace-nowrap border-b border-fp-outline-1 bg-fp-table-header px-3 text-xs font-medium text-muted-foreground",
                          c.align === "right" && "text-right",
                          gi > 0 && ci === 0 && "border-l border-fp-outline-1"
                        )}
                      >
                        {c.label}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((p) => (
                  <TableRow
                    key={p.id}
                    className="group/row h-14 cursor-pointer [&>td]:border-b [&>td]:border-fp-outline-1"
                    onClick={(e) => {
                      const t = e.target as HTMLElement | null;
                      if (t?.closest("button,a,input,label")) return;
                      if (window.getSelection()?.toString()) return;
                      setOpenId(p.id);
                    }}
                  >
                    {visibleGroups.map((g, gi) =>
                      g.cols.map((c, ci) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            "px-3",
                            c.align === "right" && "text-right",
                            gi > 0 && ci === 0 && "border-l border-fp-outline-1"
                          )}
                        >
                          {cell(p, c.key)}
                        </TableCell>
                      ))
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="tabular-nums">
            {rows.reduce((s, p) => s + liveTargets(p).length, 0)} live lanes
          </Badge>
          across {rows.length} {rows.length === 1 ? "programme" : "programmes"}
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

      <RecurringProgramCreate
        open={creating}
        onOpenChange={setCreating}
        all={programs}
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
            loadRows: d.loadRows,
            products: d.products,
            winterProducts: d.winterProducts,
            serviceLine: line,
            business: business,
            orderType: "Core",
            signatureOnDelivery: d.signatureOnDelivery,
            schedule,
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
      />
    </div>
  );
}
