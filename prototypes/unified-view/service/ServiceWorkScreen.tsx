import * as React from "react";
import { Wrench, SearchX, CalendarOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { discTonePill } from "@/components/ui/code-disc";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout";
import { ListToolbar, FilterChips, ColumnSearchChip, type ListView } from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ListTable, type ListColumn, type ListSort } from "../ListTable";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { AlertBanner, type BannerAlert } from "@/components/ui/alert-banner";
import { useSavedViews } from "../useSavedViews";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { BrokerBoard, type BoardLane } from "../threepl/BrokerBoard";
import { RENTAL_ASSETS } from "../threepl/directory";
import { DATE_FMT } from "../data";
import { ServiceOrderSheet, SECTION_TECH } from "./ServiceOrderSheet";
import { attend } from "../PendingStrip";
import { useServiceSettings } from "./settings";
import {
  INTAKE_SOURCES,
  PORTAL_SOURCE,
  PRIORITIES,
  SERVICE_ORDERS,
  TECHNICIANS,
  WORK_LANES,
  WORK_LANE_COLOR,
  WORK_STATUSES,
  WORK_STATUS_TONE,
  WORK_TYPE_CODE,
  WORK_TYPE_NAMES,
  assertServiceConsistent,
  isRecorded,
  money,
  orderTotal,
  technicianById,
  type ServiceOrder,
  type WorkStatus,
  isUnassigned,
  formatHours,
  WORK_STATUS_KIND,
  splitParts,
  blankServiceOrder,
  ticketFrom,
  shipTosOf,
  assetsAt,
  shipToPlace,
  type PartLine,
} from "./work";
import { resolveShortfall, useServiceOrders } from "./store";
import type { ReturnMode } from "./settings";
import { kindTone } from "../statusKind";

/**
 * SERVICE ORDERS — the dispatcher's board.
 *
 * SAME SKELETON AS THE OTHER TWO MODULES, deliberately: preset-view row,
 * toolbar, board or table, pagination. A reader who has learnt the 3PL board
 * has learnt this one. What differs is the work's, not a preference:
 *
 *  1. EIGHT LANES, because the job has eight states — and the gaps between
 *     them are the point. Open and Assigned are two facts (nobody on it vs
 *     nobody started); Approved and Completed are two more (a human agreed the
 *     numbers vs the money left the building).
 *  2. PARTS-PENDING IS IN SEQUENCE, not set apart. Waiting on a part is a
 *     normal thing for a job to be doing, and it is the lane a dispatcher
 *     works from first thing. Only Cancelled sits behind the rule.
 *  3. THE BOARD OPENS ON A WEEK. A delivery IS a day; a reported fault from
 *     Tuesday is still a fault on Friday.
 */

/* --------------------------------------------------------------- columns */

type Col =
  | "order"
  | "type"
  | "customer"
  | "shipTo"
  | "asset"
  | "fault"
  | "scheduled"
  | "technician"
  | "priority"
  | "status"
  | "total"
  | "source"
  | "raisedBy"
  | "labor"
  | "invoice"
  | "actions";

/* THE SAME COLUMN GRAMMAR AS THE ORDERS TABLES — number, type, who, where,
   what, when, who is doing it, state, money — so the three modules' tables
   read as one product. Every column sorts, for the reason `orders.ts` gives. */
const COLUMNS: ListColumn<Col>[] = [
  { key: "order", label: "Service Order #", width: 150, sortable: true },
  { key: "type", label: "Type", width: 140, sortable: true },
  { key: "customer", label: "Customer", width: 200, sortable: true },
  { key: "shipTo", label: "Site", width: 180, sortable: true },
  { key: "asset", label: "Asset", width: 180, sortable: true },
  { key: "fault", label: "Description", width: 250, sortable: true },
  { key: "scheduled", label: "Scheduled", width: 175, sortable: true },
  { key: "technician", label: "Technician", width: 165, sortable: true },
  { key: "priority", label: "Priority", width: 110, sortable: true },
  { key: "status", label: "Status", width: 160, sortable: true },
  { key: "total", label: "Total", width: 120, sortable: true, align: "right" },
  /* ── Available, not shown by default. ── */
  { key: "source", label: "Intake Source", width: 165, sortable: true },
  { key: "raisedBy", label: "Raised By", width: 160, sortable: true },
  { key: "labor", label: "Labour", width: 110, sortable: true, align: "right" },
  { key: "invoice", label: "Invoice", width: 140, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/* A TABLE THAT OPENS WIDER THAN THE SCREEN teaches the reader to scroll before
   it teaches them anything else. The four that answer questions nobody asks
   first are off until asked for. */
const HIDDEN_BY_DEFAULT = new Set<Col>(["source", "raisedBy", "labor", "invoice"]);

const SEARCH_FIELDS = [
  { key: "customer", label: "Customer" },
  { key: "shipTo", label: "Site" },
  { key: "asset", label: "Asset" },
  { key: "fault", label: "Description" },
  { key: "technician", label: "Technician" },
  { key: "order", label: "Service Order #" },
];

/* ---------------------------------------------------------------- facets */

function buildFacets(portalOn: boolean) {
  return [
    { key: "status", label: "Status", options: [...WORK_STATUSES] },
    { key: "workType", label: "Work Type", options: [...WORK_TYPE_NAMES] },
    { key: "priority", label: "Priority", options: [...PRIORITIES] },
    {
      key: "technician",
      label: "Technician",
      options: TECHNICIANS.map((t) => t.name),
      searchable: true,
    },
    {
      key: "source",
      label: "Intake Source",
      /* THE PORTAL OPTION FOLLOWS THE SWITCH. Offering a filter for a source
         nothing can arrive from is a facet that can only ever return zero. */
      options: [...INTAKE_SOURCES, ...(portalOn ? [PORTAL_SOURCE] : [])],
    },
    { key: "invoice", label: "Invoice", options: ["Raised", "Not raised", "Synced"] },
  ];
}

function facetValue(r: ServiceOrder, key: string): string {
  switch (key) {
    case "status":
      return r.status;
    case "workType":
      return r.workType;
    case "priority":
      return r.priority;
    case "technician":
      return technicianById(r.technicianId)?.name ?? "";
    case "source":
      return r.source;
    case "invoice":
      return r.synced ? "Synced" : r.invoiceCreated ? "Raised" : "Not raised";
    default:
      return "";
  }
}

/* ------------------------------------------------------------ card units */

/**
 * WHAT A CARD SAYS, and in what order.
 *
 * WHO IT IS FOR, WHAT IS WRONG, WHEN, WHO IS GOING, WHAT IT COMES TO. The
 * fault sits second because it is the only line on the card that is not a
 * lookup: everything else can be guessed from the columns, and the sentence
 * somebody typed cannot.
 */
function cardUnits(r: ServiceOrder, off: ReadonlySet<string>) {
  const tech = technicianById(r.technicianId);
  const units = [
    {
      kind: "stack" as const,
      key: "customer",
      heading: "Customer",
      lines: [
        ...(off.has("customer.account") ? [] : [{ text: r.customer, level: 1 as const }]),
        ...(off.has("customer.site") ? [] : [{ text: r.shipTo, level: 2 as const }]),
        ...(off.has("customer.city") || !r.city
          ? []
          : [{ text: `${r.city}, ${r.state}`, level: 3 as const }]),
      ],
    },
    {
      kind: "stack" as const,
      key: "asset",
      heading: "Asset details",
      lines: [
        /* EACH LINE ONLY IF IT IS KNOWN. Asset and fault are optional at
           intake, and a heading over three blank lines is a card saying
           nothing at full height. */
        ...(off.has("asset.name") || !r.assetName ? [] : [{ text: r.assetName, level: 1 as const }]),
        ...(off.has("asset.type") || !r.assetType ? [] : [{ text: r.assetType, level: 3 as const }]),
        ...(off.has("asset.fault") || !r.fault ? [] : [{ text: r.fault, level: 2 as const }]),
      ],
    },
    {
      kind: "inline" as const,
      key: "schedule",
      heading: "Scheduled",
      parts: off.has("schedule")
        ? []
        : r.scheduledAt
          ? [
              ...(off.has("schedule.time") ? [] : [timeLabel(r.scheduledAt)]),
              ...(off.has("schedule.date") ? [] : [dayLabel(r.dateKey)]),
            ]
          : /* NOT SCHEDULED IS A STATE, not an absence — the intake form
               offers "dispatch when you can" and the board has to show it. */
            ["Not scheduled"],
    },
    {
      kind: "inline" as const,
      key: "completed",
      heading: "Recorded",
      parts: r.completedAt
        ? [
            completedLabel(r.completedAt),
            /* `formatHours`, NOT THE RAW NUMBER. Labour stopped rounding to
               quarter hours on 2026-09-23, so this printed
               "2.4166666666666665 h on site" — a figure that is more precise
               than anybody asked for and less readable than either. */
            ...(r.labor > 0 ? [`${formatHours(r.labor)} on site`] : []),
          ]
        : [],
    },
    {
      kind: "stack" as const,
      key: "technician",
      heading: "Technician",
      figure:
        off.has("technician.total") || !isRecorded(r.status)
          ? undefined
          : money(orderTotal(r)),
      /* EVERY TECHNICIAN WHO HAS BEEN ON IT (Pavan, 2026-09-23). A partial
         job's second trip is often somebody else, and a card naming only the
         current assignee credits one person with both halves — or, once the
         order has gone back to Open, nobody with either.

         THE ASSIGNEE COMES FIRST AND KEEPS ITS DETAIL LINE; anybody who has
         VISITED but is not on it now follows, named and nothing more, because
         what the reader wants from them is the name. */
      lines: (() => {
        const past = Array.from(
          new Set(
            r.visits
              .map((v) => v.technicianId)
              .filter((id): id is string => Boolean(id) && id !== r.technicianId)
          )
        )
          .map((id) => technicianById(id))
          .filter(Boolean);

        if (!tech && past.length === 0) {
          return [{ text: "No technician assigned", level: 3 as const }];
        }
        return [
          ...(tech && !off.has("technician.name")
            ? [{ text: tech.name, level: 1 as const }]
            : []),
          ...(tech && !off.has("technician.detail")
            ? [{ text: `${tech.base} · ${tech.skills.join(" · ")}`, level: 3 as const }]
            : []),
          ...past.map((t) => ({
            text: `${t!.name} — earlier visit`,
            level: 3 as const,
          })),
        ];
      })(),
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
  { key: "asset", label: "Asset details" },
  { key: "asset.name", label: "Asset name", group: "asset" },
  { key: "asset.type", label: "Asset type", group: "asset" },
  { key: "asset.fault", label: "Description", group: "asset" },
  { key: "schedule", label: "Scheduled" },
  { key: "schedule.time", label: "Time", group: "schedule" },
  { key: "schedule.date", label: "Date", group: "schedule" },
  { key: "completed", label: "Recorded" },
  { key: "technician", label: "Technician" },
  { key: "technician.name", label: "Name", group: "technician" },
  { key: "technician.detail", label: "Base · skills", group: "technician" },
  { key: "technician.total", label: "Total", group: "technician" },
];

/* THE DEFAULT SET PER LANE — the rule the 3PL board settled on: a card is not
   one design repeated eight times.

   - Open has nobody on it and often no date, so the schedule earns its place
     and the money does not exist yet.
   - Once the work is recorded, "Recorded" replaces the schedule: a finished
     job is asked when it RAN, not when it was booked. */
const SCHEDULE_FIELDS = ["schedule", "schedule.time", "schedule.date"];
const RECORDED_LANES = ["Needs approval", "Completed", "Completed"];
const LANE_FIELD_DEFAULTS: Record<string, string[]> = Object.fromEntries(
  RECORDED_LANES.map((k) => [k, SCHEDULE_FIELDS])
);

function fieldsForLane(laneKey: string | null) {
  if (!laneKey) return CARD_UNITS;
  /* A switch that would do nothing in this lane is worse than a shorter menu:
     nothing is recorded before the work happens, and there is no total. */
  return RECORDED_LANES.includes(laneKey)
    ? CARD_UNITS
    : CARD_UNITS.filter((u) => u.key !== "completed" && u.key !== "technician.total");
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
    const siblings = CARD_UNITS.filter((c) => c.group === entry.group).map((c) => c.key);
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
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
function timeLabel(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}
function completedLabel(iso: string): string {
  const at = new Date(iso);
  return `${DATE_FMT.format(at)} · ${TIME_FMT.format(at)}`;
}

/**
 * WHAT A COLUMN PRINTS, as text — what its filter box under the header
 * matches, because the reader types what they read (`brokerColumnText` is the
 * 3PL board's). Kept beside `renderCell` in meaning: change what a cell shows
 * and this follows.
 */
function serviceColumnText(r: ServiceOrder, key: Col): string {
  switch (key) {
    case "order":
      return r.orderNo;
    /* THE DISC AND ITS NAME — "R" is what shows, "Repair" is what it means. */
    case "type":
      return WORK_TYPE_CODE[r.workType]
        ? `${WORK_TYPE_CODE[r.workType].text} ${r.workType}`
        : "—";
    case "customer":
      return r.customer;
    case "shipTo":
      return r.shipTo;
    case "asset":
      return `${r.assetName} ${r.assetType}`;
    case "fault":
      return r.fault;
    case "scheduled":
      return r.scheduledAt
        ? `${dayLabel(r.dateKey)} · ${timeLabel(r.scheduledAt)}`
        : "Not scheduled";
    case "technician":
      return technicianById(r.technicianId)?.name ?? "Nobody assigned";
    case "priority":
      return r.priority;
    case "status":
      return r.status;
    case "total":
      return isRecorded(r.status) ? money(orderTotal(r)) : "—";
    case "source":
      return r.source;
    case "raisedBy":
      return r.raisedBy;
    case "labor":
      return r.labor > 0 ? formatHours(r.labor) : "—";
    case "invoice":
      return r.synced ? "Synced" : r.invoiceCreated ? "Raised" : "—";
    default:
      return "";
  }
}

/* ----------------------------------------------------------- saved views */

/** What a saved view captures — the same set as the 3PL board's. */
interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  pageSize: number;
  dateKey: string;
  dateKeyTo: string;
  colScope: string;
  colQuery: string;
  facets: string[];
  colFilters: Record<string, string>;
  cardOff: Record<string, string[]>;
  mode: ListView;
  laneSort: Record<string, string | undefined>;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    hidden: [...s.hidden].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters)
        .filter(([, v]) => v.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
    ),
    laneSort: Object.fromEntries(
      Object.entries(s.laneSort)
        .filter(([, v]) => v)
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  });

/** Card fields as plain sorted arrays, so a view can hold and compare them. */
const cardOffToArrays = (c: Record<string, Set<string>>) =>
  Object.fromEntries(
    Object.keys(c)
      .sort()
      .map((k) => [k, [...c[k]].sort()])
  );

/* ------------------------------------------------------------- the screen */

/**
 * `flow` FIXES THE TECHNICIAN-APP SETTING for this board and its sheet
 * (Pavan, 2026-09-25): "dispatch" is the no-technician-app flow, "app" the
 * one with it. Unset, the Service Settings switch decides.
 */
export function ServiceWorkScreen({ flow }: { flow?: "dispatch" | "app" } = {}) {
  const cfg0 = useServiceSettings();
  const cfg = React.useMemo(
    () => (flow ? { ...cfg0, techApp: flow === "app" } : cfg0),
    [cfg0, flow]
  );
  /* JOB DAY (Pavan, 2026-09-25): with no technician app, an assigned order
     moves into the Working lane — called Job day there — on its work date. */
  const todayKey = dateKeyOf(new Date());
  const jobDay = (r: ServiceOrder) =>
    flow === "dispatch" && r.status === "Assigned" && r.dateKey <= todayKey;
  const isLate = (r: ServiceOrder) => {
    if (flow === "dispatch" || r.startedAt || !r.scheduledAt) return false;
    if (r.status !== "Assigned" && r.status !== "Yet to start") return false;
    const end = new Date(r.scheduledAt);
    const endMin = r.windowEndMin ?? end.getHours() * 60 + end.getMinutes() + 180;
    end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
    return end.getTime() < Date.now();
  };
  /* THE SHARED ORDERS (Pavan, 2026-09-24) — the technician's phone reads and
     writes the same list, and the change log is written in the store. */
  const [rows, setShared] = useServiceOrders();
  const setRows = React.useCallback(
    (fn: (prev: ServiceOrder[]) => ServiceOrder[]) => setShared(fn),
    [setShared]
  );
  const [view, setView] = React.useState<ListView>("board");
  const [search, setSearch] = React.useState("");
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [sort, setSort] = React.useState<ListSort<Col> | null>(null);
  const [hidden, setHidden] = React.useState<Set<Col>>(new Set(HIDDEN_BY_DEFAULT));
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [cardOff, setCardOff] = React.useState<Record<string, Set<string>>>(initialCardOff);
  const [cardScope, setCardScope] = React.useState<string | null>(null);
  const [laneSort, setLaneSort] = React.useState<Record<string, string | undefined>>({});
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  /* THE BOARD OPENS ON A WEEK, not a day. A dispatcher's question is "what is
     outstanding", and the answer does not fall inside one shift. */
  const [range, setRange] = React.useState<DateRange>(() => {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - 3);
    const to = new Date(today);
    to.setDate(to.getDate() + 3);
    return { from, to };
  });

  /* SAVED VIEWS ARE REAL, as on the 3PL board (Pavan, 2026-10-07). The row
     was stubbed — "+ View" did nothing. A view keeps everything the screen
     was left showing, the same set 3PL keeps. */
  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    columnOrder,
    columnWidths,
    pageSize,
    dateKey: dateKeyOf(range.from),
    dateKeyTo: dateKeyOf(range.to),
    colScope,
    colQuery,
    facets: [...facetSel].sort(),
    colFilters,
    cardOff: cardOffToArrays(cardOff),
    mode: view,
    laneSort,
  };
  const defaultState: ViewState = React.useMemo(() => {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - 3);
    const to = new Date(today);
    to.setDate(to.getDate() + 3);
    return {
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [...HIDDEN_BY_DEFAULT],
      columnOrder: [],
      columnWidths: {},
      pageSize: 25,
      dateKey: dateKeyOf(from),
      dateKeyTo: dateKeyOf(to),
      colScope: "customer",
      colQuery: "",
      facets: [],
      colFilters: {},
      cardOff: cardOffToArrays(initialCardOff()),
      mode: "board",
      laneSort: {},
    };
  }, []);
  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as Col, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as Col[]));
    setColumnOrder(s.columnOrder);
    setColumnWidths(s.columnWidths);
    setPageSize(s.pageSize);
    setRange({ from: fromKey(s.dateKey), to: fromKey(s.dateKeyTo) });
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setFacetSel(new Set(s.facets));
    setColFilters(s.colFilters);
    setColFiltersOpen(Object.values(s.colFilters).some((v) => v.trim() !== ""));
    setCardOff(
      Object.fromEntries(Object.entries(s.cardOff).map(([k, v]) => [k, new Set(v)]))
    );
    setView(s.mode);
    setLaneSort(s.laneSort);
    setPage(1);
  };
  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: `service-orders-${flow ?? "all"}` });

  React.useEffect(() => {
    const problems = assertServiceConsistent(SERVICE_ORDERS);
    if (problems.length > 0) {
      console.error("[Service] seed invariants broken:\n" + problems.join("\n"));
    }
  }, []);

  /* AN INVOICE REACHES ACCOUNTING ON A BATCH SCHEDULE, not the instant it is
     raised. The gap is the whole reason Approved and Completed are two lanes,
     so the prototype has to actually wait rather than jumping straight to
     Completed and making the distinction invisible. */
  const syncing = React.useRef(new Set<string>());
  React.useEffect(() => {
    const timers: number[] = [];
    for (const r of rows) {
      if (r.status !== "Completed" || !r.invoiceCreated || r.synced) continue;
      if (syncing.current.has(r.id)) continue;
      syncing.current.add(r.id);
      timers.push(
        window.setTimeout(() => {
          setRows((prev) =>
            prev.map((x) =>
              x.id === r.id ? { ...x, synced: true, status: "Completed" } : x
            )
          );
          toast.success(`${r.orderNo} synced to accounting`);
        }, 4000)
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [rows]);

  const facets = React.useMemo(() => buildFacets(cfg.portalIntake), [cfg.portalIntake]);

  const onDate = React.useMemo(() => {
    const from = dateKeyOf(range.from);
    const to = dateKeyOf(range.to);
    return rows.filter((r) => r.dateKey >= from && r.dateKey <= to);
  }, [rows, range]);

  const searched = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && activeColFilters.length === 0) return onDate;
    return onDate.filter(
      (r) =>
        (!q ||
          [
            r.orderNo,
            r.customer,
            r.shipTo,
            r.assetName,
            r.assetType,
            r.fault,
            r.workType,
            technicianById(r.technicianId)?.name ?? "",
            r.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)) &&
        /* AND, as on the 3PL board — each box matches what its own column
           PRINTS (`serviceColumnText`). */
        activeColFilters.every(([key, value]) =>
          serviceColumnText(r, key as Col)
            .toLowerCase()
            .includes(value.trim().toLowerCase())
        )
    );
  }, [onDate, search, activeColFilters]);

  /* The facet step, for ANY facet set — the applied one feeds the list, and
     the panel's draft feeds its live "N results" before Apply. */
  const narrow = React.useCallback(
    (sel: ReadonlySet<string>): ServiceOrder[] => {
      if (sel.size === 0) return searched;
      /* WITHIN A FACET, OR; ACROSS FACETS, AND — the rule every list here
         follows, because two statuses means "either" and a status plus a
         technician means "both". */
      const byFacet = new Map<string, Set<string>>();
      for (const id of sel) {
        const [key, ...rest] = id.split(":");
        const set = byFacet.get(key) ?? new Set<string>();
        set.add(rest.join(":"));
        byFacet.set(key, set);
      }
      return searched.filter((r) =>
        [...byFacet].every(([key, opts]) => opts.has(facetValue(r, key)))
      );
    },
    [searched]
  );

  const filtered = React.useMemo(() => narrow(facetSel), [narrow, facetSel]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const value = (r: ServiceOrder): string | number => {
      switch (sort.key) {
        case "order":
          return r.orderNo;
        case "type":
          return r.workType;
        case "customer":
          return r.customer;
        case "shipTo":
          return r.shipTo;
        case "asset":
          return r.assetName;
        case "fault":
          return r.fault;
        /* AN UNSCHEDULED JOB SORTS LAST, not first. Empty string would put the
           jobs nobody has booked at the top of "earliest first", which is the
           opposite of what that sort is asked for. */
        case "scheduled":
          return r.scheduledAt ?? "9999";
        case "technician":
          return technicianById(r.technicianId)?.name ?? "";
        /* PRIORITY AND STATUS SORT BY POSITION, not by the alphabet — Urgent
           does not belong between two milder words. */
        case "priority":
          return PRIORITIES.indexOf(r.priority);
        case "status":
          return WORK_STATUSES.indexOf(r.status);
        case "total":
          return orderTotal(r);
        case "source":
          return r.source;
        case "raisedBy":
          return r.raisedBy;
        case "labor":
          return r.labor;
        case "invoice":
          return r.synced ? 2 : r.invoiceCreated ? 1 : 0;
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
        let cards = filtered.filter((r) =>
          lane.key === "Working"
            ? held.has(r.status) || jobDay(r)
            : lane.key === "Assigned"
              ? held.has(r.status) && !jobDay(r)
              : held.has(r.status)
        );
        const when = (r: ServiceOrder) => r.scheduledAt ?? "9999";

        /* WORKING IS TODAY'S WORK, SO IT SORTS BY WHAT IS NEXT (Pavan,
           2026-09-23). The other lanes are queues somebody works through; this
           one is a day somebody is living, and the question it answers is
           "what happens next", not "what arrived first". Today's jobs come
           first, soonest at the top; anything not today falls below them. */
        if (lane.key === "Working" && !laneSort[lane.key]) {
          const todayKey = dateKeyOf(new Date());
          cards = [...cards].sort((a, b) => {
            const at = a.dateKey === todayKey ? 0 : 1;
            const bt = b.dateKey === todayKey ? 0 : 1;
            return at !== bt ? at - bt : when(a).localeCompare(when(b));
          });
        }

        switch (laneSort[lane.key]) {
          case "soonest":
            cards = [...cards].sort((a, b) => when(a).localeCompare(when(b)));
            break;
          case "latest":
            cards = [...cards].sort((a, b) => when(b).localeCompare(when(a)));
            break;
          case "priority":
            cards = [...cards].sort(
              (a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority)
            );
            break;
          case "customer":
            cards = [...cards].sort((a, b) => a.customer.localeCompare(b.customer));
            break;
          /* LONGEST UNASSIGNED IS THE OLDEST BOOKING, which is the one that
             has been sitting in the lane the longest. */
          case "oldest":
            cards = [...cards].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
            break;
          case "value":
            cards = [...cards].sort((a, b) => orderTotal(b) - orderTotal(a));
            break;
          default:
            break;
        }
        const laneTitle = flow === "dispatch" && lane.key === "Working" ? "Job day" : lane.key;
        return {
          key: lane.key,
          title: laneTitle,
          color: WORK_LANE_COLOR[lane.statuses[lane.statuses.length - 1]],
          apart: lane.apart,
          emptyLabel: `Nothing ${laneTitle.toLowerCase()}`,
          cards: cards.map((r) => ({
            id: r.id,
            title: r.orderNo,
            /* THE STATUS IS ON THE CARD BECAUSE THE LANE NO LONGER SAYS IT.
               Five lanes hold twelve statuses, so the column answers "whose
               problem is this" and the chip answers "what exactly" — and
               without it a Parts-pending remainder and a brand-new job are
               two identical cards in one column. */
            badges: [
              { label: r.status, tone: WORK_STATUS_KIND[r.status] },
              /* A ROLLED-OVER ORDER IS NOT A NORMAL ASSIGNED ONE (Deepika,
                 2026-09-24) — it says Parts pending beside its status. */
              ...(r.partNeeded && (r.status === "Assigned" || r.status === "Ongoing")
                ? [{ label: "Parts pending", tone: WORK_STATUS_KIND["Parts pending"] }]
                : []),
              /* LATE (Pavan, 2026-09-25) — the window has closed and nobody
                 has started. Only with the technician app: without it,
                 nobody knows whether the job started late or early. */
              ...(isLate(r) ? [{ label: "Late", tone: "critical" as const }] : []),
              ...(r.priority === "Normal"
                ? []
                : [
                    {
                      label: r.priority,
                      tone: r.priority === "Urgent" ? ("critical" as const) : undefined,
                    },
                  ]),
            ],
            /* NO WORK TYPE, NO DISC. Work type left the mandatory set, so a
               job created from a phone call can have none — and a disc with
               nothing to stand for would be a guess. */
            code: WORK_TYPE_CODE[r.workType]
              ? {
                  text: WORK_TYPE_CODE[r.workType].text,
                  label: r.workType,
                  tone: WORK_TYPE_CODE[r.workType].tone,
                }
              : undefined,
            units: cardUnits(r, cardOff[lane.key] ?? EMPTY_SET),
            /* AN ALERT ONLY WHERE SOMETHING IS OUTSTANDING. An alert on every
               card is a border, so the three lanes with nothing waiting on
               anybody carry none. */
            /* NO ALERT ON A PARTS-PENDING CARD (Pavan, 2026-09-23). The badge
               already says Parts pending; which parts is on the order's own
               Parts table, not repeated on the board. "Invoice not raised" is
               amber — waiting on somebody, not a warning (DS §10b). */
            alert:
              r.status === "Needs approval"
                  ? {
                      status: "default" as const,
                      text: `${money(orderTotal(r))} — waiting on a manager`,
                      actionLabel: "Review",
                    }
                  : r.status === "Completed" && !r.invoiceCreated
                    ? {
                        status: "caution" as const,
                        text: "Invoice not raised",
                        actionLabel: "Review",
                      }
                    : r.status === "Completed"
                      ? { status: "default" as const, text: "Invoice on its way to accounting" }
                      : undefined,
            /* THE LANE'S ACT, ON THE CARD (Pavan, 2026-09-23). Open means
               nobody is on it, and the one thing that changes that is naming
               somebody — so every card in the lane carries it and no card
               outside the lane does. It opens the sheet at the technician
               card rather than assigning somebody blind: who goes is a
               judgement about skills and a yard, and a board card has room
               for neither. */
            footerAction: isUnassigned(r.status)
              ? {
                  label: "No technician assigned",
                  /* THE ICON CARRIES THE ACT AND THE WORD NAMES IT. "Assign"
                     beside a person is read before it is read — and the
                     footer's own line already says what is missing, so the
                     button repeating "a technician" was the same noun twice
                     in one strip. (Pavan, 2026-09-23.) */
                  actionLabel: (
                    <>
                      <UserPlus /> Assign
                    </>
                  ),
                  actionVariant: "outline" as const,
                  onAction: () => {
                    setOpenId(r.id);
                    window.setTimeout(() => attend(SECTION_TECH), 120);
                  },
                }
              : undefined,
          })),
        };
      }),
    [filtered, cardOff, laneSort]
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

  const laneSortOptions = React.useCallback(
    (laneKey: string) => [
      { key: "soonest", label: "Soonest first" },
      { key: "latest", label: "Latest first" },
      { key: "priority", label: "Most urgent first" },
      { key: "customer", label: "Customer A–Z" },
      ...(laneKey === "Open"
        ? [{ key: "oldest", label: "Longest unassigned" }]
        : []),
      ...(laneKey === "Needs approval" || laneKey === "Completed"
        ? [{ key: "value", label: "Largest first" }]
        : []),
    ],
    []
  );

  const rangeLabel =
    dateKeyOf(range.from) === dateKeyOf(range.to)
      ? DATE_FMT.format(range.from)
      : `${DATE_FMT.format(range.from)} – ${DATE_FMT.format(range.to)}`;

  /* ─────────────────────────────────────────── the cascading pickers ───── */

  const customers = React.useMemo(
    () =>
      Array.from(
        new Set(RENTAL_ASSETS.map((a) => a.customer).filter(Boolean) as string[])
      ).sort(),
    []
  );
  /* THE SHARED LIST — real sites first, then the dummy ones (work.ts). */
  const shipTosFor = React.useCallback((customer: string) => shipTosOf(customer), []);

  /* THE SHARED LIST — real assets first, then sample ones (work.ts). */
  const assetsFor = React.useCallback((shipTo: string) => assetsAt(shipTo), []);

  /** A blank order, with the price book's lines already in it if it is on. */
  const blankOrder = React.useCallback(
    (): ServiceOrder =>
      blankServiceOrder({
        priceBook: cfg.priceBook,
        raisedBy: "Dana Whitfield",
      }),
    [cfg.priceBook]
  );

  /* ───────────────────────────────────────────────────────── the acts ───── */

  const nextOrderNo = () =>
    `SO-${Math.max(...rows.map((r) => Number(r.orderNo.slice(3)) || 0)) + 3}`;

  const saveOrder = React.useCallback((order: ServiceOrder, next: ServiceOrder) => {
    setRows((prev) => prev.map((r) => (r.id === order.id ? next : r)));
  }, []);

  /**
   * `asDraft` — THE FIRST CHANGE ON A NEW ORDER SAVES IT AS A DRAFT (Pavan,
   * 2026-09-23). A dispatcher can start an order, leave it and come back; the
   * row exists from the first real keystroke, in Open as Drafted, and the
   * sheet stays open on it. It becomes Assigned only on "Create new order",
   * once every required detail is in. No toast: the header's "Draft saved"
   * is what reports a save.
   */
  const createOrder = (draft: ServiceOrder, asDraft = false) => {
    const no = nextOrderNo();
    const site = RENTAL_ASSETS.find((a) => a.id === draft.assetId);
    const created: ServiceOrder = {
      ...draft,
      id: `so-new-${no}`,
      orderNo: no,
      city: site?.city ?? shipToPlace(draft.shipTo).city,
      state: site?.state ?? shipToPlace(draft.shipTo).state,
      /* CREATING AND ASSIGNING ARE ONE ACT WHEN A TECHNICIAN IS NAMED, and two
         when one is not. The form's own button says "Create and assign", and
         leaving the technician blank is how a dispatcher says "the yard team
         will pick it up" — which is exactly what Open means. */
      status: (asDraft || !draft.technicianId ? "Drafted" : "Assigned") as WorkStatus,
    };
    setRows((prev) => [created, ...prev]);
    /* A NEW ORDER HAS TO BE WHERE THE READER IS LOOKING — the same rule the
       3PL board follows. The window widens to take it in rather than moving. */
    setRange((r) => {
      const day = startOfDay(fromKey(created.dateKey));
      if (day >= startOfDay(r.from) && day <= startOfDay(r.to)) return r;
      return {
        from: day < startOfDay(r.from) ? day : r.from,
        to: day > startOfDay(r.to) ? day : r.to,
      };
    });
    setCreating(false);
    setOpenId(created.id);
    if (asDraft) return;
    toast.success(
      created.status === "Assigned"
        ? `${no} created and assigned`
        : `${no} created — waiting for a technician`
    );
  };

  const _patch = (id: string, p: Partial<ServiceOrder>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  void _patch;





  /**
   * A VISIT THAT COULD NOT FIT EVERYTHING (Pavan, 2026-09-23).
   *
   * THE ORDER SPLITS IN TWO, ALONG THE PARTS. What went on stays here with
   * the labour it took and the miles it took to get here — that work happened
   * and somebody is owed for it. What did not go on becomes a debt, and the
   * setting decides what shape the debt takes:
   *
   *   `suborder`  a child of the same number — SO-1045-2. One fault, one
   *               reference, two visits.
   *   `neworder`  its own number, linked back, scheduled and invoiced as its
   *               own piece of work.
   *
   * THE FIRST ORDER KEEPS ITS FULL PART LIST, with the fitted quantities
   * recorded on it. Trimming it to what was fitted would erase the fact that
   * five were needed, which is the only evidence the second visit is a
   * continuation rather than a new problem.
   */
  /**
   * A VISIT THAT COULD NOT FIT EVERYTHING (Pavan, 2026-09-23).
   *
   * TEN PARTS NEEDED, FIVE ON THE VAN. The five go on and the work is
   * recorded either way; the setting decides whether the remaining five are
   * the SAME job or a NEW one.
   *
   *   `continue`  The same order, the same number, back to OPEN — because a
   *               second visit needs a technician and a date and nobody has
   *               picked either. Its part list keeps the fitted quantities,
   *               so the order carries its own progress and is not done until
   *               every line is full.
   *   `neworder`  This order is finished and says so; the remainder becomes
   *               an order of its own with its own number, linked back.
   */
  const onPartsPending = (
    id: string,
    data: { labor: number; parts: PartLine[]; note?: string; mode?: ReturnMode }
  ) => {
    /* NOTHING OWED IS NOT A STALL — the job is simply done. */
    if (splitParts(data.parts).owed.length === 0) return;
    /* ONE PLACE DECIDES WHAT "THE REST" BECOMES — `resolveShortfall`, shared
       with the phone. The technician may choose; the setting is the default. */
    let said = { title: "", description: "" };
    setRows((prev) => {
      const out = resolveShortfall(
        prev.map((r) => (r.id === id ? { ...r, labor: data.labor } : r)),
        id,
        { parts: data.parts, note: data.note, mode: data.mode ?? cfg.returnMode, nativeBilling: cfg.nativeBilling }
      );
      said = out;
      return out.rows;
    });
    if (said.title) toast.success(said.title, { description: said.description });
  };

  /* ──────────────────────────────────────────────────────── the table ───── */

  const renderCell = (r: ServiceOrder, key: Col): React.ReactNode => {
    switch (key) {
      case "order":
        return <span className="font-medium tabular-nums">{r.orderNo}</span>;
      case "type":
        if (!WORK_TYPE_CODE[r.workType])
          return <span className="text-muted-foreground">—</span>;
        /* THE SALES ORDERS PILL (Pavan, 2026-10-16). */
        return <Pill color={discTonePill(WORK_TYPE_CODE[r.workType].tone)}>{r.workType}</Pill>;
      case "customer":
        return r.customer;
      case "shipTo":
        return r.shipTo;
      case "asset":
        return (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-foreground">{r.assetName}</span>
            <span className="truncate text-xs text-muted-foreground">{r.assetType}</span>
          </span>
        );
      case "fault":
        return <span className="text-muted-foreground">{r.fault}</span>;
      case "scheduled":
        return r.scheduledAt ? (
          <span className="tabular-nums">
            {dayLabel(r.dateKey)} · {timeLabel(r.scheduledAt)}
          </span>
        ) : (
          <span className="text-muted-foreground">Not scheduled</span>
        );
      case "technician":
        return (
          technicianById(r.technicianId)?.name ?? (
            <span className="text-muted-foreground">Nobody assigned</span>
          )
        );
      case "priority":
        /* NORMAL IS THE ABSENCE OF A BADGE. A hundred rows all carrying a chip
           saying "normal" is a hundred chips saying nothing. */
        return r.priority === "Normal" ? (
          <span className="text-muted-foreground">Normal</span>
        ) : (
          <Pill kind={r.priority === "Urgent" ? "critical" : "neutral"}>
            {r.priority}
          </Pill>
        );
      case "status":
        return <StatusChip tone={WORK_STATUS_TONE[r.status]}>{r.status}</StatusChip>;
      case "total":
        return isRecorded(r.status) ? (
          <span className="tabular-nums">{money(orderTotal(r))}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "source":
        return r.source;
      case "raisedBy":
        return r.raisedBy;
      case "labor":
        return r.labor > 0 ? (
          <span className="tabular-nums">{formatHours(r.labor)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      case "invoice":
        return r.synced ? (
          <StatusChip tone={kindTone("success")}>Synced</StatusChip>
        ) : r.invoiceCreated ? (
          <StatusChip tone={kindTone("info")}>Raised</StatusChip>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      default:
        return null;
    }
  };

  const narrowed =
    search.trim().length > 0 || facetSel.size > 0 || activeColFilters.length > 0;

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
          <EmptyTitle>No service orders match</EmptyTitle>
          <EmptyDescription>
            {onDate.length} in this window, none of them past what you have
            narrowed to. Clear a filter to widen it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  /* THE ALERT BANNER (Pavan, 2026-10-20) — the DS banner with interaction,
     as on Sales Orders and the portal: each alert is a filter (View details,
     then Clear filter), counted in the dates on screen. Its filter is
     facets, so the alert is "on" while the list shows exactly that set. */
  const [alertsOff, setAlertsOff] = React.useState<ReadonlySet<string>>(new Set());
  const [snoozed, setSnoozed] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    const next = Object.values(snoozed).filter((t) => t > Date.now());
    if (!next.length) return;
    const t = window.setTimeout(() => setSnoozed((m) => ({ ...m })), Math.min(...next) - Date.now());
    return () => window.clearTimeout(t);
  }, [snoozed]);
  const openStatuses = WORK_LANES.find((l) => l.key === "Open")!.statuses;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const alertDefs = [
    {
      id: "urgent",
      status: "warning" as const,
      tag: "Needs action",
      rows: searched.filter((r) => r.priority === "Urgent" && isUnassigned(r.status)),
      title: (n: number) => `${plural(n, "urgent order has", "urgent orders have")} no technician`,
      sel: ["priority:Urgent", ...openStatuses.map((st) => `status:${st}`)],
    },
    {
      id: "approval",
      status: "caution" as const,
      tag: "Needs action",
      rows: searched.filter((r) => r.status === "Needs approval"),
      title: (n: number) => `${plural(n, "order needs", "orders need")} your approval`,
      sel: ["status:Needs approval"],
    },
    {
      id: "payment",
      status: "warning" as const,
      tag: "Overdue",
      rows: searched.filter((r) => r.status === "Payment delayed"),
      title: (n: number) => `${plural(n, "payment is", "payments are")} delayed`,
      sel: ["status:Payment delayed"],
    },
  ].filter((d) => d.rows.length > 0 && !alertsOff.has(d.id) && !((snoozed[d.id] ?? 0) > Date.now()));
  const alerts: BannerAlert[] = alertDefs.map((d) => ({
    id: d.id,
    status: d.status,
    tag: d.tag,
    title: d.title(d.rows.length),
    count: d.rows.length,
    onApply: () => {
      setFacetSel(new Set(d.sel));
      setPage(1);
    },
  }));
  const appliedAlert =
    alertDefs.find((d) => d.sel.length === facetSel.size && d.sel.every((k) => facetSel.has(k)))?.id ?? null;

  const openOrder = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="New service order"
        onCreateOrder={() => setCreating(true)}
      />

      {alerts.length > 0 && (
        <AlertBanner
          className="mt-4 shrink-0"
          alerts={alerts}
          appliedId={appliedAlert}
          onClearApplied={() => {
            setFacetSel(new Set());
            setPage(1);
          }}
          onSnooze={(id, ms) => setSnoozed((m) => ({ ...m, [id]: Date.now() + ms }))}
          onDismiss={(id) => setAlertsOff((o) => new Set(o).add(id))}
        />
      )}

      <div className={alerts.length > 0 ? "mt-3 shrink-0" : "mt-4 shrink-0"}>
        <ListToolbar
          boardView
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search service orders, sites, assets, technicians…"
          showGroupBy={false}
          filters={
            <ListFilters
              value={facetSel}
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
              facets={facets}
              countFor={(sel) => narrow(sel).length}
            />
          }
          columns={COLUMNS.filter((c) => c.label).map((c) => ({
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
          searchFields={SEARCH_FIELDS}
          colScope={colScope}
          onColScopeChange={setColScope}
          colQuery={colQuery}
          onColQueryChange={(v) => {
            setColQuery(v);
            setPage(1);
          }}
          /* THE ROW, NOT THE POPOVER. It only makes sense over a table, so the
             board keeps the button pointed at nothing rather than opening a
             row of boxes above cards that have no columns. */
          columnFiltersOpen={view === "table" && colFiltersOpen}
          onToggleColumnFilters={
            view !== "table"
              ? undefined
              : () =>
                  setColFiltersOpen((open) => {
                    /* CLOSING THE ROW PUTS THE TABLE BACK — a narrowing with
                       no box on screen saying so is one nobody can find. */
                    if (open) {
                      setColFilters({});
                      setPage(1);
                    }
                    return !open;
                  })
          }
          columnFilterCount={activeColFilters.length}
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
          facets={facets}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        >
          {/* One chip per header box that has something typed in it, on the
              same shelf as the facets — they narrow the same list. With no
              facet on, `FilterChips` renders these bare, so they bring their
              own row; with one, they join its scroller as they are. */}
          <div className={facetSel.size ? "contents" : "mt-3 flex items-center gap-2"}>
            {activeColFilters.map(([key, value]) => (
              <ColumnSearchChip
                key={key}
                className=""
                searchFields={COLUMNS}
                colScope={key}
                colQuery={value.trim()}
                onClear={() => {
                  setColFilters((prev) => ({ ...prev, [key]: "" }));
                  setPage(1);
                }}
              />
            ))}
          </div>
        </FilterChips>
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {/* THE ROW STAYS WHILE IT IS OPEN — an empty result is what the boxes
             did, and the boxes are how you undo it. */}
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            emptyBody
          ) : view === "board" ? (
            <BrokerBoard
              lanes={lanes}
              onOpenCard={setOpenId}
              /* FOUR WAYS TO ORDER A LANE, and the fourth belongs to the
                 lane: what is worth ordering Open by is which job has waited
                 longest with nobody on it, and that question does not exist
                 once somebody is assigned. */
              laneSortOptions={laneSortOptions}
              laneSort={laneSort}
              onLaneSortChange={(lane: string, key: string | null) =>
                setLaneSort((prev) => ({ ...prev, [lane]: key ?? undefined }))
              }
            />
          ) : (
            <ListTable
              rows={pageRows}
              columns={COLUMNS}
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
              openLabel={(r) => `Open service order ${r.orderNo}`}
              onOpenRow={(r) => setOpenId(r.id)}
              showColumnFilters={colFiltersOpen}
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {view !== "table" && sorted.length > 0 && (
        <div className="mt-4 flex shrink-0 items-baseline gap-2 text-sm">
          <span className="font-medium text-foreground">
            {sorted.length.toLocaleString()}{" "}
            {sorted.length === 1 ? "service order" : "service orders"}
          </span>
          <span className="text-muted-foreground">
            across {lanes.filter((l) => l.cards.length > 0).length} of {lanes.length}{" "}
            lanes · {rangeLabel}
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

      <ServiceOrderSheet
        flow={flow}
        onDiscard={(id) => {
          setRows((prev) => prev.filter((r) => r.id !== id));
          setOpenId(null);
          setCreating(false);
        }}
        order={openOrder}
        mode={creating ? "create" : "edit"}
        open={creating || openId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setOpenId(null);
        }}
        onSave={saveOrder}
        onOpenOrder={(no) => {
          const r = rows.find((x) => x.orderNo === no);
          if (r) {
            setCreating(false);
            setOpenId(r.id);
          }
        }}
        onCreate={createOrder}
        onCreateDraft={(d) => createOrder(d, true)}
        onCreateTicket={(from, req) => {
          /* A ticket from site joins the board without taking over the sheet
             the dispatcher is looking at. */
          const no = nextOrderNo();
          setRows((prev) => [ticketFrom(from, req, no, technicianById(from.technicianId)?.name ?? "Technician"), ...prev]);
          return no;
        }}
        onPartsPending={onPartsPending}
        customers={customers}
        shipTosFor={shipTosFor}
        assetsFor={assetsFor}
        blankOrder={blankOrder}
      />

    </div>
  );
}
