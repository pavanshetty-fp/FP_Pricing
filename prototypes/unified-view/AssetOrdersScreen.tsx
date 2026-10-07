import * as React from "react";
import { CalendarOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { FuelOrdersViewBar } from "./FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView } from "./ListToolbar";
import { ListFilters, type ListFacet } from "./ListFilters";
import { DateRangeFilter, type DateRange } from "./threepl/DateRangeFilter";
import { ListTable, TwoLineCell } from "./ListTable";
import {
  BrokerBoard,
  type BoardCardUnit,
  type BoardLane,
  type LaneColor,
} from "./threepl/BrokerBoard";
import { OrderMapView } from "./OrderMapView";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { ASSET_ORDER_GROUP_DIMS } from "./groupDims";
import { AssetOrderSheet, type AssetOrderDraft } from "./AssetOrderSheet";
import { useSavedViews } from "./useSavedViews";
import { DATE_FMT, dateKeyOf, formatFullDate, relativeLabel, startOfDay } from "./data";
import {
  ASSET_ORDERS,
  ASSET_ORDER_COLUMNS,
  ASSET_ORDER_SEARCH_FIELDS,
  ASSET_ORDER_STATUSES,
  ASSET_TYPES,
  SALES_REPS,
  matchesAssetOrder,
  matchesAssetOrderIn,
  sortAssetOrders,
  type AssetOrder,
  type AssetOrderColumnKey,
  type AssetOrderStatus,
  type AssetSortState,
  ASSET_ORDER_STATUS_TONE,
} from "./assetOrders";
import { useLoggedRows } from "./activity";
import { diffAssetOrder } from "./salesActivity";

/**
 * Asset Orders list — the same shell as Fuel Orders: preset-view row with the
 * CTA and Export, the action bar, the table, pagination.
 *
 * DATE-SCOPED, like Fuel Orders: every row carries a delivery date, so the
 * toolbar carries Fuel Orders' date RANGE (Pavan, 2026-10-07). It opens on
 * tomorrow — a one-day range.
 *
 * NO BULK-ACTION BAR, and no row checkboxes with it. Fuel Orders' bar exists
 * because a dispatcher edits five specific fields across many orders; which
 * fields an asset order needs edited in bulk was not specified, and inventing a
 * verb set is exactly the kind of guess worth not making. The column set, the
 * sheet and everything else is here — say the word and the bar is a small
 * addition on top of the same `BulkEditDialog` the fuel screen already uses.
 */
const STATUS_TONE = ASSET_ORDER_STATUS_TONE;

const TOGGLE_COLUMNS = ASSET_ORDER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  /** The range's first day. A view saved before ranges has only this. */
  dateKey: string;
  /** The range's last day (Pavan, 2026-10-07). Optional so a view saved with
   *  one date opens as a one-day range. */
  dateKeyTo?: string;
  /** The filter panel's ticks, as `facetKey:option` ids (Pavan, 2026-10-07).
   *  Optional so a view saved before the panel worked still applies. */
  facets?: string[];
  colScope: string;
  colQuery: string;
  /** The filter row's boxes, by column key. Optional so a view saved before
   *  the row still applies. */
  colFilters?: Record<string, string>;
  /* ORDER, WIDTHS AND THE BOARD (Pavan, 2026-10-07) — what 3PL's views keep.
     Optional so a view saved before them still applies. */
  /** Column order as keys. Empty means "as declared". */
  columnOrder?: string[];
  /** Reader-set column widths in px, by key. Empty means "as declared". */
  columnWidths?: Record<string, number>;
  /** Card fields switched off, per lane, as sorted keys. */
  cardOff?: Record<string, string[]>;
  /** Table, board or map. */
  mode?: ListView;
  /** Each lane's own sort. */
  laneSort?: Record<string, string | undefined>;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    hidden: [...s.hidden].sort(),
    /* One date is a one-day range, and no ticks is no ticks. */
    dateKeyTo: s.dateKeyTo ?? s.dateKey,
    facets: [...(s.facets ?? [])].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters ?? {}).filter(([, v]) => v.trim() !== "").sort(([a], [b]) => a.localeCompare(b))
    ),
    laneSort: Object.fromEntries(
      Object.entries(s.laneSort ?? {}).filter(([, v]) => v).sort(([a], [b]) => a.localeCompare(b))
    ),
  });

/**
 * WHAT EACH COLUMN PRINTS, as text a header box can match — the same rule as
 * `brokerColumnText` in 3PL: a box under a header matches what is written
 * above the rows beneath it, never a field the cell does not show.
 */
function assetOrderColumnText(r: AssetOrder, key: AssetOrderColumnKey): string {
  switch (key) {
    case "order":
      return r.orderNo;
    case "customer":
      return `${r.customer.title} ${r.customer.description ?? ""}`;
    case "salesRep":
      return r.salesRep;
    case "date":
      return `${r.date.title} ${r.date.description ?? ""}`;
    case "status":
      return r.status;
    default:
      return "";
  }
}

/* ---- the board (Pavan, 2026-10-07) — the 3PL board, reused -------------- */

/** One lane per stage, left to right as an order moves; Cancelled set apart. */
const LANE_COLOR: Record<AssetOrderStatus, LaneColor> = {
  Requested: "yellow",
  Scheduled: "blue",
  Dispatched: "cyan",
  Delivered: "green",
  Cancelled: "grey",
};

/** What a card can show — the board's own column menu. See 3PL `CARD_UNITS`. */
const CARD_UNITS: { key: string; label: string; group?: string }[] = [
  { key: "customer", label: "Customer Details" },
  { key: "customer.account", label: "Account", group: "customer" },
  { key: "customer.site", label: "Ship-to site", group: "customer" },
  { key: "schedule", label: "Delivery Date" },
  { key: "asset", label: "Asset Details" },
  { key: "asset.qty", label: "Quantity", group: "asset" },
  { key: "asset.serial", label: "Serial #", group: "asset" },
  { key: "salesRep", label: "Sales Rep" },
];

/** One shared empty set, so a lane with nothing hidden does not allocate. */
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/** Which lanes one press in the menu writes to. */
const lanesInScope = (scope: string | null): string[] =>
  scope ? [scope] : [...ASSET_ORDER_STATUSES];

/** One field on or off in one lane's set — 3PL's parent/child rule. */
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

function initialCardOff(): Record<string, Set<string>> {
  return Object.fromEntries(ASSET_ORDER_STATUSES.map((s) => [s, new Set<string>()]));
}

/** Card fields as plain sorted arrays, so a view can hold and compare them. */
const cardOffToArrays = (c: Record<string, Set<string>>) =>
  Object.fromEntries(
    Object.keys(c)
      .sort()
      .map((k) => [k, [...c[k]].sort()])
  );

function laneCardUnits(r: AssetOrder, off: ReadonlySet<string>): BoardCardUnit[] {
  const units: BoardCardUnit[] = [
    {
      kind: "stack",
      key: "customer",
      heading: "Customer Details",
      lines: [
        ...(off.has("customer.account") ? [] : [{ text: r.customer.title, level: 1 as const }]),
        ...(off.has("customer.site") ? [] : [{ text: r.shipTo, level: 2 as const }]),
      ],
    },
    { kind: "inline", key: "schedule", heading: "Delivery Date", parts: [r.date.title] },
    {
      kind: "rows",
      key: "asset",
      heading: "Asset Details",
      /* THE ASSET TYPE IS THE ROW, so it is not a switch — as on 3PL. */
      rows: [
        {
          asset: r.assetType,
          qty: off.has("asset.qty") ? "" : `${r.quantity} ${r.quantity === 1 ? "unit" : "units"}`,
          assetId: off.has("asset.serial") ? undefined : r.serialNo,
        },
      ],
    },
    {
      kind: "stack",
      key: "salesRep",
      heading: "Sales Rep",
      lines: [{ text: r.salesRep, level: 2 as const }],
    },
  ];
  /* A HEADING WITH NOTHING UNDER IT IS NOT A UNIT. */
  return units.filter((u) => {
    if (off.has(u.key)) return false;
    if (u.kind === "stack") return u.lines.length > 0;
    return true;
  });
}

/**
 * THE WAYS A LANE CAN BE ORDERED — 3PL's, less the time sorts: the board is
 * one day and an asset order carries no window, so every card would tie.
 */
const LANE_SORTS: Record<
  string,
  { label: string; compare: (a: AssetOrder, b: AssetOrder) => number }
> = {
  "qty-desc": { label: "Quantity — largest first", compare: (a, b) => b.quantity - a.quantity },
  "qty-asc": { label: "Quantity — smallest first", compare: (a, b) => a.quantity - b.quantity },
  "customer-asc": {
    label: "Customer — A to Z",
    compare: (a, b) => a.customer.title.localeCompare(b.customer.title),
  },
  "order-desc": {
    label: "Order # — newest first",
    compare: (a, b) => Number(b.orderNo) - Number(a.orderNo),
  },
};

const laneSortOptions = () =>
  Object.entries(LANE_SORTS).map(([key, o]) => ({ key, label: o.label }));

/** Tomorrow, as a one-day range — the list's opening window (Pavan, 2026-10-07). */
function tomorrowRange(): DateRange {
  const day = startOfDay(new Date());
  day.setDate(day.getDate() + 1);
  return { from: day, to: day };
}

export function AssetOrdersScreen({ focus }: { focus?: { id: string; n: number } | null } = {}) {
  /* THE SETTER WRITES THE CHANGE LOG (sales, 2026-09-23) — see activity.tsx. */
  const [rows, setRows] = useLoggedRows<AssetOrder>(ASSET_ORDERS, diffAssetOrder);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<AssetSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<AssetOrderColumnKey>>(new Set());
  /* A RANGE, OPENING ON TOMORROW (Pavan, 2026-10-07) — Fuel Orders' control. */
  const [range, setRange] = React.useState<DateRange>(tomorrowRange);
  /* The filter panel's applied ticks, as `facetKey:option` ids — 3PL's. */
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /* Empty = the table's declared order; the table fills in anything a saved
     order does not mention, so a stale view never costs a column. */
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  /* A SET PER LANE, and a scope for the menu — 3PL's card fields. */
  const [cardOff, setCardOff] = React.useState<Record<string, Set<string>>>(initialCardOff);
  /** `null` = the menu is speaking for every lane at once. */
  const [cardScope, setCardScope] = React.useState<string | null>(null);
  const [laneSort, setLaneSort] = React.useState<Record<string, string | undefined>>({});
  /* On All lanes a field reads as hidden unless it is showing in every lane. */
  const scopedHidden = React.useMemo<ReadonlySet<string>>(() => {
    if (cardScope) return cardOff[cardScope] ?? EMPTY_SET;
    const out = new Set<string>();
    for (const u of CARD_UNITS) {
      if (ASSET_ORDER_STATUSES.some((l) => (cardOff[l] ?? EMPTY_SET).has(u.key)))
        out.add(u.key);
    }
    return out;
  }, [cardOff, cardScope]);
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );

  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    dateKey: dateKeyOf(range.from),
    dateKeyTo: dateKeyOf(range.to),
    facets: [...facetSel].sort(),
    colScope,
    colQuery,
    colFilters,
    columnOrder,
    columnWidths,
    cardOff: cardOffToArrays(cardOff),
    mode: view,
    laneSort,
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      dateKey: dateKeyOf(tomorrowRange().from),
      dateKeyTo: dateKeyOf(tomorrowRange().to),
      facets: [],
      colScope: "customer",
      colQuery: "",
      colFilters: {},
      columnOrder: [],
      columnWidths: {},
      cardOff: cardOffToArrays(initialCardOff()),
      mode: "table",
      laneSort: {},
    }),
    []
  );

  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(
      s.sortKey && s.sortDir
        ? { key: s.sortKey as AssetOrderColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as AssetOrderColumnKey[]));
    setPageSize(s.pageSize);
    const [y, m, d] = s.dateKey.split("-").map(Number);
    /* A view saved before ranges has one date; one date is a range. */
    const [ty, tm, td] = (s.dateKeyTo ?? s.dateKey).split("-").map(Number);
    setRange({ from: new Date(y, m - 1, d), to: new Date(ty, tm - 1, td) });
    setFacetSel(new Set(s.facets ?? []));
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setCardOff(
      s.cardOff
        ? Object.fromEntries(Object.entries(s.cardOff).map(([k, v]) => [k, new Set(v)]))
        : initialCardOff()
    );
    setView(s.mode ?? "table");
    setLaneSort(s.laneSort ?? {});
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  // A global-search hit lands here: open that asset order's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const fromKey = dateKeyOf(range.from);
  const toKey = dateKeyOf(range.to);
  const onDate = React.useMemo(
    () => rows.filter((r) => r.dateKey >= fromKey && r.dateKey <= toKey),
    [rows, fromKey, toKey]
  );
  /* THE WINDOW, IN WORDS — one day reads as a date, a range as a range. */
  const rangeLabel =
    fromKey === toKey
      ? formatFullDate(range.from)
      : `${formatFullDate(range.from)} – ${formatFullDate(range.to)}`;
  const searched = React.useMemo(
    () =>
      onDate.filter(
        (r) =>
          (!q || matchesAssetOrder(r, q)) &&
          (!cq || matchesAssetOrderIn(r, cq, colScope)) &&
          /* AND-ed, and each box matches the text its own column PRINTS —
             see `assetOrderColumnText`. */
          activeColFilters.every(([key, value]) =>
            assetOrderColumnText(r, key as AssetOrderColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [onDate, q, cq, colScope, activeColFilters]
  );
  /* THE FACET NARROWING, FOR ANY SET OF TICKS — 3PL's. The list uses the
     applied set; the panel asks it of its own ticks, to count them. AND across
     facets, OR within one. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const pass = (facet: string, value: string) =>
        ![...sel].some((id) => id.startsWith(`${facet}:`)) ||
        sel.has(`${facet}:${value}`);
      return searched.filter(
        (r) =>
          pass("status", r.status) &&
          pass("customer", r.customer.title) &&
          pass("shipTo", r.shipTo) &&
          pass("assetType", r.assetType) &&
          pass("salesRep", r.salesRep)
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  const sorted = React.useMemo(() => sortAssetOrders(filtered, sort), [filtered, sort]);
  /* Grouping. The hook owns the dimension stack and the collapsed set, and
     suspends pagination while grouped — a group cannot straddle a page
     boundary and still have an honest header. */
  const g = useGrouping<(typeof sorted)[number], AssetOrderColumnKey>({
    dimensions: ASSET_ORDER_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r) => r.id, []),
    measureOf: React.useCallback((r: (typeof sorted)[number]) => r.quantity, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  /* THE BOARD TAKES THE SORTED SET, NOT THE PAGE — a page boundary is a
     property of a table. */
  const lanes: BoardLane[] = React.useMemo(
    () =>
      ASSET_ORDER_STATUSES.map((stage) => {
        let cards = sorted.filter((r) => r.status === stage);
        const cmp = LANE_SORTS[laneSort[stage] ?? ""]?.compare;
        if (cmp) cards = [...cards].sort(cmp);
        return {
          key: stage,
          title: stage,
          color: LANE_COLOR[stage],
          apart: stage === "Cancelled",
          emptyLabel: `No orders in ${stage.toLowerCase()}`,
          cards: cards.map((r) => ({
            id: r.id,
            title: r.orderNo,
            units: laneCardUnits(r, cardOff[stage] ?? EMPTY_SET),
          })),
        };
      }),
    [sorted, laneSort, cardOff]
  );

  const onSort = (key: AssetOrderColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const customers = React.useMemo(
    () => Array.from(new Set(ASSET_ORDERS.map((r) => r.customer.title))),
    []
  );
  const shipTos = React.useMemo(
    () => Array.from(new Set(ASSET_ORDERS.map((r) => r.shipTo))),
    []
  );
  /* WHAT THE RECORD HAS, as facets (Pavan, 2026-10-07). */
  const facets: ListFacet[] = React.useMemo(
    () => [
      { key: "status", label: "Status", options: [...ASSET_ORDER_STATUSES] },
      { key: "customer", label: "Customer", options: customers, searchable: true },
      { key: "shipTo", label: "Ship-To", options: shipTos, searchable: true },
      { key: "assetType", label: "Asset Type", options: ASSET_TYPES, searchable: true },
      { key: "salesRep", label: "Sales Rep", options: SALES_REPS },
    ],
    [customers, shipTos]
  );

  const saveOrder = (order: AssetOrder, draft: AssetOrderDraft) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== order.id
          ? r
          : {
              ...r,
              customer: { title: draft.customer, description: draft.erpId },
              shipTo: draft.shipTo,
              salesRep: draft.salesRep,
              assetType: draft.assetType,
              quantity: draft.quantity,
              serialNo: draft.serialNo,
              status: draft.status,
              poNumber: draft.poNumber,
              note: draft.note,
              ...(draft.deliveryDate
                ? {
                    date: {
                      title: DATE_FMT.format(draft.deliveryDate),
                      description: relativeLabel(
                        Math.round(
                          (draft.deliveryDate.getTime() -
                            startOfDay(new Date()).getTime()) /
                            86_400_000
                        ),
                        draft.deliveryDate
                      ),
                    },
                    dateKey: dateKeyOf(draft.deliveryDate),
                  }
                : {}),
            }
      )
    );

  /** Order numbers continue the 61xxxxx series in steps of 3, as the seeds do. */
  const createOrder = (draft: AssetOrderDraft) => {
    const when = draft.deliveryDate ?? range.from;
    const nextNo = Math.max(...rows.map((r) => Number(r.orderNo))) + 3;
    const offset = Math.round(
      (when.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
    );
    setRows((prev) => [
      {
        id: `ao-new-${nextNo}`,
        orderNo: String(nextNo),
        customer: { title: draft.customer, description: draft.erpId },
        salesRep: draft.salesRep,
        date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
        dateKey: dateKeyOf(when),
        status: draft.status,
        assetType: draft.assetType,
        quantity: draft.quantity,
        serialNo: draft.serialNo,
        shipTo: draft.shipTo,
        poNumber: draft.poNumber,
        note: draft.note,
      },
      ...prev,
    ]);
    setPage(1);
  };

  const renderCell = (row: AssetOrder, key: AssetOrderColumnKey) => {
    switch (key) {
      case "order":
        return (
          <span className="truncate text-sm tabular-nums text-foreground">
            {row.orderNo}
          </span>
        );
      case "customer":
        return <TwoLineCell {...row.customer} />;
      case "salesRep":
        return <span className="truncate text-sm text-foreground">{row.salesRep}</span>;
      case "date":
        return <TwoLineCell {...row.date} />;
      case "status":
        return (
          <StatusChip tone={STATUS_TONE[row.status]} variant="text">
            {row.status}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create Asset Order"
        onCreateOrder={() => setCreating(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search asset orders, customers, reps…"
          boardView
          mapView
          /* Not on the board, which is already grouped — by lane. */
          showGroupBy={view !== "board"}
          filters={
            /* WIRED (Pavan, 2026-10-07) — it narrowed nothing. 3PL's
               panel: staged ticks, a live count, Apply. */
            <ListFilters
              facets={facets}
              value={facetSel}
              countFor={(sel) => narrowFacets(sel).length}
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
            />
          }
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
          columns={TOGGLE_COLUMNS}
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
          /* WHAT IS ON THE CARD, PER LANE — 3PL's control. Board only. */
          cardFields={{
            units: CARD_UNITS,
            hidden: scopedHidden,
            scope: cardScope,
            scopes: ASSET_ORDER_STATUSES.map((l) => ({ key: l, label: l })),
            onScopeChange: setCardScope,
            onShowAll: () =>
              setCardOff((prev) => {
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope)) next[lane] = new Set();
                return next;
              }),
            onToggle: (k) =>
              setCardOff((prev) => {
                /* One press means the same thing in every lane in scope. */
                const turningOff = !scopedHidden.has(k);
                const next = { ...prev };
                for (const lane of lanesInScope(cardScope))
                  next[lane] = toggleField(prev[lane] ?? EMPTY_SET, k, turningOff);
                return next;
              }),
          }}
          searchFields={ASSET_ORDER_SEARCH_FIELDS}
          colScope={colScope}
          onColScopeChange={(v) => {
            setColScope(v);
            setPage(1);
          }}
          colQuery={colQuery}
          onColQueryChange={(v) => {
            setColQuery(v);
            setPage(1);
          }}
          /* THE ROW, NOT THE POPOVER — the 3PL behaviour. Table view only. */
          columnFiltersOpen={view === "table" && colFiltersOpen}
          onToggleColumnFilters={
            view !== "table"
              ? undefined
              : () =>
                  setColFiltersOpen((open) => {
                    /* Closing the row clears it: a narrowing with no boxes on
                       screen would be one nobody could see. */
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
        {/* ONE SHELF for the facets and the column search — 3PL's. */}
        <FilterChips
          facets={facets}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        >
          <ColumnSearchChip
            className=""
            searchFields={ASSET_ORDER_SEARCH_FIELDS}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => {
              setColQuery("");
              setPage(1);
            }}
          />
        </FilterChips>
        {/* One chip per header box that has something typed in it. */}
        {activeColFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeColFilters.map(([key, value]) => (
              <ColumnSearchChip
                key={key}
                className=""
                searchFields={TOGGLE_COLUMNS}
                colScope={key}
                colQuery={value.trim()}
                onClear={() => {
                  setColFilters((prev) => ({ ...prev, [key]: "" }));
                  setPage(1);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {/* THE ROW STAYS WHILE IT IS OPEN. An empty result swaps the table
              for the empty state, which would take the boxes with it — the
              reader would lose the thing they were typing in. */}
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {q ? <SearchX /> : <CalendarOff />}
                </EmptyMedia>
                <EmptyTitle>
                  {q ? "No matching asset orders" : "Nothing scheduled"}
                </EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No asset orders in ${rangeLabel} match “${search.trim()}”.`
                    : `No asset orders are scheduled for ${rangeLabel}.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (q) setSearch("");
                    else {
                      const today = startOfDay(new Date());
                      setRange({ from: today, to: today });
                    }
                    setPage(1);
                  }}
                >
                  {q ? "Clear search" : "Go to today"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : view === "board" ? (
            <BrokerBoard
              lanes={lanes}
              onOpenCard={setOpenId}
              laneSortOptions={laneSortOptions}
              laneSort={laneSort}
              onLaneSortChange={(lane, option) =>
                setLaneSort((prev) => ({ ...prev, [lane]: option ?? undefined }))
              }
            />
          ) : view === "map" ? (
            /* THE MAP TAKES THE SORTED SET, NOT THE PAGE. The ship-to is the
               site; one with no `SHIP_TO_SITES` row is counted as unmapped. */
            <OrderMapView
              orders={sorted.map((r) => ({
                id: r.id,
                orderNo: r.orderNo,
                site: r.shipTo,
                subtitle: r.customer.title,
                status: r.status,
                tone: STATUS_TONE[r.status],
              }))}
              onOpenOrder={setOpenId}
            />
          ) : (
            <ListTable
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="order"
              groupUnit="units"
              columns={ASSET_ORDER_COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open order ${r.orderNo}`}
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

      <AssetOrderSheet
        order={rows.find((r) => r.id === openId) ?? null}
        mode={creating ? "create" : "edit"}
        open={creating || openId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setOpenId(null);
        }}
        onSave={saveOrder}
        onCreate={createOrder}
        customers={customers}
        shipTos={shipTos}
      />

      <div className={cn("mt-4 shrink-0", view !== "table" && "hidden")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="order"
            total={g.total}
            unit="units"
            overCounts={g.groups.overCounts}
            allCollapsed={g.allCollapsed}
            onExpandAll={g.expandAll}
            onCollapseAll={g.collapseAll}
          />
        ) : (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
