import * as React from "react";
import { Wrench, SearchX, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeDisc } from "@/components/ui/code-disc";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout";
import { ListToolbar, FilterChips, type ListView } from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ListTable, type ListColumn, type ListSort } from "../ListTable";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { BrokerBoard, type BoardLane } from "../threepl/BrokerBoard";
import { DATE_FMT } from "../data";
import {
  JOB_TYPES,
  JOB_TYPE_CODE,
  PRIORITIES,
  TECHNICIANS,
  WORK_LANES,
  WORK_LANE_COLOR,
  WORK_ORDERS,
  WORK_STATUSES,
  WORK_STATUS_TONE,
  assertWorkConsistent,
  technicianById,
  type WorkOrder,
  type WorkStatus,
} from "./work";

/**
 * SERVICE WORK — the work-order dashboard.
 *
 * SAME SKELETON AS THE OTHER TWO MODULES, deliberately: preset-view row,
 * toolbar, board or table, pagination. A reader who has learnt the 3PL board
 * has learnt this one, and the differences below are the work's, not a
 * preference.
 *
 *  1. THE BOARD IS THE DEFAULT. What somebody does all day here is watch jobs
 *     move from reported to scheduled to done, which is what a board is for.
 *  2. THE LANES ARE THE LIFECYCLE, and On Hold sits behind a rule with
 *     Cancelled — neither is a step of the work.
 *  3. THE CARD IS ABOUT AN ASSET AT A SITE. 3PL's card leads with a quantity
 *     going somewhere; this one leads with the thing that is already there and
 *     what is wrong with it.
 *
 * NOT BUILT YET, named rather than faked: the work-order sheet (so a card
 * opens nothing), creating a job, and the technician's own schedule.
 */

/* --------------------------------------------------------------- columns */

type WorkColumnKey =
  | "order"
  | "type"
  | "customer"
  | "shipTo"
  | "asset"
  | "fault"
  | "date"
  | "window"
  | "technician"
  | "priority"
  | "status"
  | "raisedBy"
  | "hours"
  | "actions";

/* THE SAME COLUMN GRAMMAR AS THE ORDERS TABLES — number, type, who, where,
   what, when, who is doing it, state — so the three modules' tables read as
   one product. Every column sorts, for the reason `orders.ts` gives. */
const WORK_COLUMNS: ListColumn<WorkColumnKey>[] = [
  { key: "order", label: "Work Order #", width: 140, sortable: true },
  { key: "type", label: "Type", width: 70, sortable: true },
  { key: "customer", label: "Customer", width: 210, sortable: true },
  { key: "shipTo", label: "Site", width: 180, sortable: true },
  { key: "asset", label: "Asset", width: 190, sortable: true },
  { key: "fault", label: "Reported Fault", width: 260, sortable: true },
  { key: "date", label: "Scheduled Date", width: 160, sortable: true },
  { key: "window", label: "Window", width: 150, sortable: true },
  { key: "technician", label: "Technician", width: 170, sortable: true },
  { key: "priority", label: "Priority", width: 120, sortable: true },
  { key: "status", label: "Status", width: 150, sortable: true },
  /* ── Available, not shown by default. ── */
  { key: "raisedBy", label: "Raised By", width: 160, sortable: true },
  { key: "hours", label: "Hours", width: 100, sortable: true, align: "right" },
  { key: "actions", label: "", width: 44 },
];

/* A TABLE THAT OPENS WIDER THAN THE SCREEN teaches the reader to scroll before
   it teaches them anything else. The two that answer questions nobody asks
   first are off until asked for. */
const WORK_HIDDEN_BY_DEFAULT = new Set<WorkColumnKey>(["raisedBy", "hours"]);

const WORK_SEARCH_FIELDS = [
  { key: "customer", label: "Customer" },
  { key: "shipTo", label: "Site" },
  { key: "asset", label: "Asset" },
  { key: "fault", label: "Reported Fault" },
  { key: "technician", label: "Technician" },
  { key: "order", label: "Work Order #" },
];

/* ---------------------------------------------------------------- facets */

const WORK_FACETS = [
  { key: "status", label: "Status", options: [...WORK_STATUSES] },
  { key: "jobType", label: "Job Type", options: [...JOB_TYPES] },
  { key: "priority", label: "Priority", options: [...PRIORITIES] },
  {
    key: "technician",
    label: "Technician",
    options: TECHNICIANS.map((t) => t.name),
    searchable: true,
  },
  {
    key: "assetType",
    label: "Asset Type",
    options: Array.from(new Set(WORK_ORDERS.map((r) => r.assetType))).sort(),
  },
];

function facetValue(r: WorkOrder, key: string): string {
  switch (key) {
    case "status":
      return r.status;
    case "jobType":
      return r.jobType;
    case "priority":
      return r.priority;
    case "technician":
      return technicianById(r.technicianId)?.name ?? "";
    case "assetType":
      return r.assetType;
    default:
      return "";
  }
}

/* ------------------------------------------------------------ card units */

/**
 * WHAT A CARD SAYS, and in what order.
 *
 * WHO IT IS FOR, WHAT IS WRONG, WHEN, WHO IS GOING. The fault sits second
 * because it is the only line on the card that is not a lookup — everything
 * else can be guessed from the columns, and the sentence somebody typed cannot.
 */
function workCardUnits(r: WorkOrder, off: ReadonlySet<string>) {
  const tech = technicianById(r.technicianId);
  const units = [
    {
      kind: "stack" as const,
      key: "customer",
      heading: "Customer",
      lines: [
        ...(off.has("customer.account")
          ? []
          : [{ text: r.customer, level: 1 as const }]),
        ...(off.has("customer.site") ? [] : [{ text: r.shipTo, level: 2 as const }]),
        ...(off.has("customer.city") || !r.city
          ? []
          : [{ text: `${r.city}, ${r.state}`, level: 3 as const }]),
      ],
    },
    {
      kind: "stack" as const,
      key: "asset",
      heading: "Asset & Fault",
      lines: [
        ...(off.has("asset.name") ? [] : [{ text: r.assetName, level: 1 as const }]),
        ...(off.has("asset.type") ? [] : [{ text: r.assetType, level: 3 as const }]),
        ...(off.has("asset.fault") ? [] : [{ text: r.fault, level: 2 as const }]),
      ],
    },
    {
      kind: "inline" as const,
      key: "schedule",
      heading: "Scheduled",
      parts: [
        ...(off.has("schedule.window")
          ? []
          : [`${r.window.start} – ${r.window.end}`]),
        ...(off.has("schedule.date") ? [] : [dayLabel(r.dateKey)]),
      ],
    },
    {
      kind: "inline" as const,
      key: "completed",
      heading: "Completed on",
      parts: r.completedAt
        ? [
            completedLabel(r.completedAt),
            ...(r.hoursOnSite != null ? [`${r.hoursOnSite} h on site`] : []),
          ]
        : [],
    },
    {
      kind: "stack" as const,
      key: "technician",
      heading: "Technician",
      lines: tech
        ? [
            ...(off.has("technician.name")
              ? []
              : [{ text: tech.name, level: 1 as const }]),
            ...(off.has("technician.detail")
              ? []
              : [
                  {
                    text: `${tech.base} · ${tech.skills.join(" · ")}`,
                    level: 3 as const,
                  },
                ]),
          ]
        : [
            /* NOBODY ON IT IS THE POINT OF THE FIRST LANE, so the card says so
               rather than dropping the unit and leaving the reader to notice
               an absence. */
            { text: "Nobody assigned", level: 3 as const },
          ],
    },
  ];
  return units.filter((u) => {
    if (off.has(u.key)) return false;
    if (u.kind === "stack") return u.lines.length > 0;
    return u.parts.length > 0;
  });
}

const CARD_UNITS = [
  { key: "customer", label: "Customer" },
  { key: "customer.account", label: "Account", group: "customer" },
  { key: "customer.site", label: "Site", group: "customer" },
  { key: "customer.city", label: "City and state", group: "customer" },
  { key: "asset", label: "Asset & Fault" },
  { key: "asset.name", label: "Asset name", group: "asset" },
  { key: "asset.type", label: "Asset type", group: "asset" },
  { key: "asset.fault", label: "Reported fault", group: "asset" },
  { key: "schedule", label: "Scheduled" },
  { key: "schedule.window", label: "Window", group: "schedule" },
  { key: "schedule.date", label: "Date", group: "schedule" },
  { key: "completed", label: "Completed on" },
  { key: "technician", label: "Technician" },
  { key: "technician.name", label: "Name", group: "technician" },
  { key: "technician.detail", label: "Base · skills", group: "technician" },
];

/* THE DEFAULT SET PER LANE, following the same rule the 3PL board settled on:
   a card is not one design repeated seven times.

   - Reported has nobody on it and no date worth reading, so the technician
     unit is the one that matters and the schedule is noise.
   - Past the visit, "Completed on" replaces the schedule — a finished job is
     asked when it RAN, not when it was booked. */
const SCHEDULE_FIELDS = ["schedule", "schedule.window", "schedule.date"];
const LANE_FIELD_DEFAULTS: Record<string, string[]> = {
  Reported: SCHEDULE_FIELDS,
  Completed: SCHEDULE_FIELDS,
  Invoiced: SCHEDULE_FIELDS,
};

const DONE_LANES = new Set(["Completed", "Invoiced"]);

function fieldsForLane(laneKey: string | null) {
  if (!laneKey) return CARD_UNITS;
  /* "Completed on" is a switch that would do nothing in the lanes where the
     visit has not happened, and a menu whose ticks do not describe the card is
     worse than a shorter menu. */
  return DONE_LANES.has(laneKey)
    ? CARD_UNITS
    : CARD_UNITS.filter((u) => u.key !== "completed");
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function initialCardOff(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const lane of WORK_LANES)
    out[lane.key] = new Set(LANE_FIELD_DEFAULTS[lane.key] ?? []);
  return out;
}

function toggleField(
  current: ReadonlySet<string>,
  key: string,
  turningOff: boolean
): Set<string> {
  const next = new Set(current);
  const kids = CARD_UNITS.filter((c) => c.group === key).map((c) => c.key);
  const entry = CARD_UNITS.find((c) => c.key === key);
  if (!turningOff) {
    next.delete(key);
    for (const c of kids) next.delete(c);
    if (entry?.group) next.delete(entry.group);
    return next;
  }
  next.add(key);
  for (const c of kids) next.add(c);
  if (entry?.group) {
    const siblings = CARD_UNITS.filter((c) => c.group === entry.group).map(
      (c) => c.key
    );
    if (siblings.every((sib) => next.has(sib))) next.add(entry.group);
  }
  return next;
}

/* ----------------------------------------------------------------- dates */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKeyOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayLabel(key: string): string {
  return DATE_FMT.format(fromKey(key));
}

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function completedLabel(iso: string): string {
  const at = new Date(iso);
  return `${DATE_FMT.format(at)} · ${TIME_FMT.format(at)}`;
}

/* ------------------------------------------------------------- the screen */

/** Emergency is the only priority that changes what somebody does next. */
function priorityBadge(r: WorkOrder) {
  if (r.priority === "Routine") return null;
  return {
    label: r.priority,
    tone: r.priority === "Emergency" ? ("critical" as const) : undefined,
  };
}

export function ServiceWorkScreen() {
  const [rows] = React.useState<WorkOrder[]>(WORK_ORDERS);
  const [view, setView] = React.useState<ListView>("board");
  const [search, setSearch] = React.useState("");
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [sort, setSort] = React.useState<ListSort<WorkColumnKey> | null>(null);
  const [hidden, setHidden] = React.useState<Set<WorkColumnKey>>(
    new Set(WORK_HIDDEN_BY_DEFAULT)
  );
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [cardOff, setCardOff] = React.useState<Record<string, Set<string>>>(
    initialCardOff
  );
  const [cardScope, setCardScope] = React.useState<string | null>(null);
  const [laneSort, setLaneSort] = React.useState<Record<string, string | undefined>>({});

  /* THE BOARD OPENS ON A WEEK, not a day. A dispatcher's question is "what is
     outstanding", and the answer does not fall inside one shift — a reported
     fault from Tuesday is still a reported fault on Friday. 3PL opens on one
     day because a delivery IS a day; this one is not. */
  const [range, setRange] = React.useState<DateRange>(() => {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - 3);
    const to = new Date(today);
    to.setDate(to.getDate() + 3);
    return { from, to };
  });

  /* The fixture's contract, shouted about once rather than silently wrong. */
  React.useEffect(() => {
    const problems = assertWorkConsistent(WORK_ORDERS);
    if (problems.length > 0) {
      console.error("[Service Work] seed invariants broken:\n" + problems.join("\n"));
    }
  }, []);

  const onDate = React.useMemo(() => {
    const from = dateKeyOf(range.from);
    const to = dateKeyOf(range.to);
    return rows.filter((r) => r.dateKey >= from && r.dateKey <= to);
  }, [rows, range]);

  const searched = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return onDate;
    return onDate.filter((r) =>
      [
        r.orderNo,
        r.customer,
        r.shipTo,
        r.assetName,
        r.assetType,
        r.fault,
        technicianById(r.technicianId)?.name ?? "",
        r.status,
        r.jobType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [onDate, search]);

  const filtered = React.useMemo(() => {
    if (facetSel.size === 0) return searched;
    /* WITHIN A FACET, OR; ACROSS FACETS, AND — the same rule every other list
       in this prototype follows, because picking two statuses means "either"
       and picking a status and a technician means "both". */
    const byFacet = new Map<string, Set<string>>();
    for (const id of facetSel) {
      const [key, ...rest] = id.split(":");
      const set = byFacet.get(key) ?? new Set<string>();
      set.add(rest.join(":"));
      byFacet.set(key, set);
    }
    return searched.filter((r) =>
      [...byFacet].every(([key, opts]) => opts.has(facetValue(r, key)))
    );
  }, [searched, facetSel]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const value = (r: WorkOrder): string | number => {
      switch (sort.key) {
        case "order":
          return r.orderNo;
        case "type":
          return r.jobType;
        case "customer":
          return r.customer;
        case "shipTo":
          return r.shipTo;
        case "asset":
          return r.assetName;
        case "fault":
          return r.fault;
        case "date":
          return r.dateKey;
        case "window":
          return r.window.start;
        case "technician":
          return technicianById(r.technicianId)?.name ?? "";
        /* SORTING BY PRIORITY SORTS BY URGENCY, not by the alphabet, which
           would put Emergency between two milder words. Same rule the 3PL
           status column follows. */
        case "priority":
          return PRIORITIES.indexOf(r.priority);
        case "status":
          return WORK_STATUSES.indexOf(r.status);
        case "raisedBy":
          return r.raisedBy;
        case "hours":
          return r.hoursOnSite ?? -1;
        default:
          return "";
      }
    };
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  const lanes: BoardLane[] = React.useMemo(
    () =>
      WORK_LANES.map((lane) => {
        const held = new Set<WorkStatus>(lane.statuses);
        const cards = filtered.filter((r) => held.has(r.status));
        return {
          key: lane.key,
          title: lane.key,
          color: WORK_LANE_COLOR[lane.statuses[lane.statuses.length - 1]],
          apart: lane.apart,
          emptyLabel: `Nothing ${lane.key.toLowerCase()}`,
          cards: cards.map((r) => {
            const badge = priorityBadge(r);
            return {
              id: r.id,
              title: r.orderNo,
              badges: badge ? [badge] : [],
              code: {
                text: JOB_TYPE_CODE[r.jobType].text,
                label: r.jobType,
                tone: JOB_TYPE_CODE[r.jobType].tone,
              },
              units: workCardUnits(r, cardOff[lane.key] ?? EMPTY_SET),
              /* THE ONE THING THAT STOPS THE WORK, said on the card that is
                 stopped. Every other lane's cards carry no alert, because an
                 alert on every card is a border. */
              alert:
                r.status === "On Hold" && r.holdReason
                  ? { status: "warning" as const, text: r.holdReason }
                  : undefined,
            };
          }),
        };
      }),
    [filtered, cardOff]
  );

  const scopedHidden = React.useMemo<ReadonlySet<string>>(() => {
    if (cardScope) return cardOff[cardScope] ?? EMPTY_SET;
    const out = new Set<string>();
    for (const u of CARD_UNITS) {
      if (WORK_LANES.some((l) => (cardOff[l.key] ?? EMPTY_SET).has(u.key)))
        out.add(u.key);
    }
    return out;
  }, [cardOff, cardScope]);

  const lanesInScope = (scope: string | null) =>
    scope ? [scope] : WORK_LANES.map((l) => l.key);

  const rangeLabel =
    dateKeyOf(range.from) === dateKeyOf(range.to)
      ? DATE_FMT.format(range.from)
      : `${DATE_FMT.format(range.from)} – ${DATE_FMT.format(range.to)}`;

  const renderCell = (r: WorkOrder, key: WorkColumnKey): React.ReactNode => {
    switch (key) {
      case "order":
        return <span className="font-medium tabular-nums">{r.orderNo}</span>;
      case "type":
        return (
          <CodeDisc
            code={JOB_TYPE_CODE[r.jobType].text}
            label={r.jobType}
            tone={JOB_TYPE_CODE[r.jobType].tone}
          />
        );
      case "customer":
        return r.customer;
      case "shipTo":
        return r.shipTo;
      case "asset":
        return (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-foreground">{r.assetName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {r.assetType}
            </span>
          </span>
        );
      case "fault":
        return <span className="text-muted-foreground">{r.fault}</span>;
      case "date":
        return <span className="tabular-nums">{dayLabel(r.dateKey)}</span>;
      case "window":
        return (
          <span className="tabular-nums text-muted-foreground">
            {r.window.start} – {r.window.end}
          </span>
        );
      case "technician":
        return (
          technicianById(r.technicianId)?.name ?? (
            <span className="text-muted-foreground">Nobody assigned</span>
          )
        );
      case "priority":
        /* ROUTINE IS THE ABSENCE OF A BADGE. Ninety cards all carrying a chip
           saying "normal" is ninety chips saying nothing. */
        return r.priority === "Routine" ? (
          <span className="text-muted-foreground">Routine</span>
        ) : (
          <Badge variant={r.priority === "Emergency" ? "destructive" : "secondary"}>
            {r.priority}
          </Badge>
        );
      case "status":
        return <StatusChip tone={WORK_STATUS_TONE[r.status]}>{r.status}</StatusChip>;
      case "raisedBy":
        return r.raisedBy;
      case "hours":
        return r.hoursOnSite == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="tabular-nums">{r.hoursOnSite}</span>
        );
      default:
        return null;
    }
  };

  const narrowed =
    search.trim().length > 0 || facetSel.size > 0 || colQuery.trim().length > 0;

  const emptyBody =
    onDate.length === 0 ? (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarOff />
          </EmptyMedia>
          <EmptyTitle>No work in this window</EmptyTitle>
          <EmptyDescription>
            Nothing is booked between {rangeLabel}. Step the dates to find the
            jobs on either side of it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    ) : (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">{narrowed ? <SearchX /> : <Wrench />}</EmptyMedia>
          <EmptyTitle>No work orders match</EmptyTitle>
          <EmptyDescription>
            {onDate.length} in this window, none of them past what you have
            narrowed to. Clear a filter to widen it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FuelOrdersViewBar
        views={[]}
        activeId={null}
        dirty={false}
        onApply={() => {}}
        onResetToDefault={() => {}}
        onCreate={() => {}}
        onRename={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search work orders, sites, assets, technicians…"
          showGroupBy={false}
          filters={
            <ListFilters
              value={facetSel}
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
              facets={WORK_FACETS}
            />
          }
          columns={WORK_COLUMNS.filter((c) => c.label).map((c) => ({
            key: c.key,
            label: c.label,
          }))}
          hiddenColumns={hidden}
          columnOrder={columnOrder}
          onReorderColumns={setColumnOrder}
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          cardFields={{
            units: fieldsForLane(cardScope),
            hidden: scopedHidden,
            scope: cardScope,
            scopes: WORK_LANES.map((l) => ({ key: l.key, label: l.key })),
            onScopeChange: setCardScope,
            onShowAll: () =>
              setCardOff((prev) => {
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope)) next[lane] = new Set();
                return next;
              }),
            onToggle: (k) =>
              setCardOff((prev) => {
                const turningOff = !scopedHidden.has(k);
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope)) {
                  next[lane] = toggleField(prev[lane] ?? EMPTY_SET, k, turningOff);
                }
                return next;
              }),
          }}
          searchFields={WORK_SEARCH_FIELDS}
          colScope={colScope}
          onColScopeChange={setColScope}
          colQuery={colQuery}
          onColQueryChange={(v) => {
            setColQuery(v);
            setPage(1);
          }}
          view={view}
          onViewChange={setView}
          dateControl={
            <DateRangeFilter
              value={range}
              onChange={(next) => {
                setRange(next);
                setPage(1);
              }}
            />
          }
        />
        <FilterChips
          facets={WORK_FACETS}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        />
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 ? (
            emptyBody
          ) : view === "board" ? (
            <BrokerBoard
              lanes={lanes}
              laneSort={laneSort}
              onLaneSortChange={(lane: string, key: string | null) =>
                setLaneSort((prev) => ({ ...prev, [lane]: key ?? undefined }))
              }
            />
          ) : (
            <ListTable
              rows={pageRows}
              columns={WORK_COLUMNS}
              hidden={hidden}
              sort={sort}
              onSort={(key) =>
                setSort((prev) => {
                  if (prev?.key !== key) return { key, dir: "asc" };
                  if (prev.dir === "asc") return { key, dir: "desc" };
                  return null;
                })
              }
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open work order ${r.orderNo}`}
            />
          )}
        </div>
      </div>

      {/* The board is not paged, so it gets a total instead — and the total
          states its scope, because a number with no window is one nobody can
          check. */}
      {view !== "table" && sorted.length > 0 && (
        <div className="mt-4 flex shrink-0 items-baseline gap-2 text-sm">
          <span className="font-medium text-foreground">
            {sorted.length.toLocaleString()}{" "}
            {sorted.length === 1 ? "work order" : "work orders"}
          </span>
          <span className="text-muted-foreground">
            across {lanes.filter((l) => l.cards.length > 0).length} of{" "}
            {lanes.length} lanes · {rangeLabel}
          </span>
        </div>
      )}

      <div className={cn("mt-4 shrink-0", view !== "table" && "hidden")}>
        <TablePagination
          className="h-9"
          page={page}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
