import * as React from "react";
import { CalendarOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, type ListView } from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ListTable, TwoLineCell } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import {
  DATE_FMT,
  dateKeyOf,
  formatFullDate,
  relativeLabel,
  startOfDay,
} from "../data";
import {
  BrokerBoard,
  type BoardCardUnit,
  type BoardLane,
} from "./BrokerBoard";
import { BrokerOrderSheet, type BrokerOrderDraft } from "./BrokerOrderSheet";
import {
  AssetMovementSheet,
  type AssetMovementDraft,
} from "./AssetMovementSheet";
import { VENDORS, vendorById, vendorName } from "./vendors";
import {
  BROKER_COLUMNS,
  BROKER_LANE_COLOR,
  BROKER_ORDERS,
  BROKER_SEARCH_FIELDS,
  BROKER_STATUSES,
  BROKER_STATUS_FILTERS,
  BROKER_STATUS_TONE,
  CREATED_BY,
  ORDER_TAGS,
  PRODUCTS,
  SALESPEOPLE,
  SHIP_TO_SITES,
  HUBS,
  ORDER_TYPE_FILTERS,
  siteAddress,
  isAllTopOff,
  matchesBrokerOrder,
  matchesBrokerOrderIn,
  sortBrokerOrders,
  timeToMinutes,
  totalGal,
  type BrokerColumnKey,
  type BrokerOrder,
  type BrokerSortState,
  type MovementDirection,
} from "./orders";
import { RENTAL_ASSETS } from "./directory";

/**
 * 3PL Order Dashboard — the broker's main screen.
 *
 * Same skeleton as the three Sales lists (preset-view row, action bar, body,
 * pagination) so the two modules read as one product, with three differences
 * that are the spec's, not preferences:
 *
 *  1. THE BOARD IS THE DEFAULT VIEW. §5.2 calls the dashboard "a Kanban-style
 *     board", with List as the alternate and the preferred default settable. Every
 *     Sales list opens as a table; this one opens as a board, because the thing a
 *     broker does all day is watch orders move between stages. The table is the
 *     alternate, not an afterthought — it has the full column set and pagination.
 *  2. THE ORDER-KIND TABS. All / Regular / Recurring / Movement (§5.2), present
 *     in both views. They sit BELOW the action bar per the content-layer law in
 *     `docs/content-layer.md` §4 ("accordions sit below the action bar and the
 *     tabs"), which fixes the vertical order as header -> action bar -> tabs.
 *  3. LANES ARE THE LIFECYCLE, and sorting by Status sorts by lifecycle position
 *     rather than A-Z — see `sortValue` in `orders.ts`.
 *
 * NOT BUILT, named rather than faked: the Create dropdown that splits into
 * Delivery Order / Asset Delivery / Asset Pickup (§5.20) — the CTA creates a
 * delivery order only, because a movement order's asset is fixed at creation and
 * that picker is a flow of its own; drag-and-drop between lanes (the DS Kanban
 * has none and a status change here is a workflow action with side effects, not
 * a drag); and the map view of nearby vendors (§5.5).
 */

/** Board cards show six fields — §5.2 says the set is user-customisable; this is
 *  the default. Six fills the DS card's 2-column grid exactly. */
/**
 * The card's units, in reading order.
 *
 * NO FIELD LABELS INSIDE A UNIT. The heading names the unit and the levels do
 * the rest: "Customer / Bray, Raymond and Marks" spends a whole line saying
 * what the reader already knows from where it sits. Three lines at three
 * weights carry account, site and address without one label between them.
 *
 * WHAT THE KIND CHANGES is the product unit and nothing else. A delivery lists
 * the tanks and what goes in each; a movement lists the one asset, its type and
 * its capacity — same three columns, so the eye lands in the same place.
 */
function laneCardUnits(r: BrokerOrder): BoardCardUnit[] {
  const site = SHIP_TO_SITES.find((x) => x.name === r.shipTo);
  const vendor = r.vendorId ? vendorById(r.vendorId) : undefined;

  /* THE TOTAL EARNS ITS ROW or is not drawn. With one line the quantity IS the
     total; with every line a top-off there is nothing to add. It appears only
     once the per-row figures have stopped answering "how much is coming". */
  const numbered = r.lines.filter((l) => !l.topOff && l.gal != null);
  const showTotal = !r.movement && r.lines.length > 1 && numbered.length > 1;

  const productUnit: BoardCardUnit = r.movement
    ? (() => {
        const asset = RENTAL_ASSETS.find((a) => a.name === r.lines[0]?.asset);
        const cap = asset?.capacityGal ?? r.movement.capacityGal;
        return {
          kind: "rows",
          key: "product",
          heading: "Delivery Product Details",
          rows: [
            {
              asset: r.lines[0]?.asset || "Asset not chosen",
              /* A tank in transit is EMPTY, so this column carries its type
                 rather than a product it is not holding. */
              product: asset?.type ?? r.movement.tankType,
              qty: cap > 0 ? `${cap.toLocaleString()} gal` : "—",
              qtySoft: cap === 0,
              /* WHICH unit, under its name. The route left this row for the
                 card header: it describes the ORDER, not the tank. */
              assetId: asset?.serial,
            },
          ],
        };
      })()
    : {
        kind: "rows",
        key: "product",
        heading: "Delivery Product Details",
        rows: r.lines.map((l) => ({
          asset: l.asset || "No asset",
          product: l.product,
          qty: l.topOff ? "Top-off" : `${(l.gal ?? 0).toLocaleString()} gal`,
          qtySoft: l.topOff,
        })),
        total: showTotal ? `${totalGal(r.lines).toLocaleString()} gal` : undefined,
      };

  return [
    {
      kind: "stack",
      key: "customer",
      heading: "Customer Details",
      lines: [
        { text: r.customer.title, level: 1 },
        { text: r.shipTo, level: 2 },
        ...(site ? [{ text: siteAddress(site), level: 3 as const }] : []),
      ],
    },
    {
      kind: "inline",
      key: "schedule",
      heading: "Schedule",
      parts: [
        `${r.window.start} – ${r.window.end}`,
        /* A recurring order's cadence beats its date: the board is already
           scoped to one day, so the date says nothing the column has not. */
        r.recurrence ? r.recurrence.frequency : r.date.title,
      ],
    },
    productUnit,
    {
      kind: "stack",
      key: "partner",
      heading: "Delivery Partner",
      lines: vendor
        ? [
            { text: vendor.name, level: 1 },
            {
              text: `${vendor.base} · Safety ${vendor.safetyScore} · ${vendor.distanceMi} mi`,
              level: 3 as const,
            },
          ]
        : [
            {
              text:
                r.invitedVendorIds.length > 0 ? "Out for acknowledgement" : "Not assigned",
              level: 3 as const,
            },
          ],
    },
  ];
}

/**
 * The badges, STACKED. Priority and recurrence are independent facts, and the
 * old single slot made them compete — an urgent recurring order lost one of
 * them. Delivery vs Movement takes no badge at all: the order number's prefix
 * already carries it.
 *
 * A movement's DIRECTION is a badge, though. It is a two-state fact with two
 * fixed names, which is what a chip is for; as trailing words on the subtitle
 * it competed with the route for the same line and lost.
 */
function laneCardBadges(r: BrokerOrder): { label: string; tone?: "critical" | "neutral" }[] {
  const out: { label: string; tone?: "critical" | "neutral" }[] = [];
  if (r.urgent) out.push({ label: "Urgent", tone: "critical" });
  if (r.kind === "Recurring") out.push({ label: "Recurring" });
  if (r.movement) {
    out.push({
      label: r.movement.direction === "Asset Delivery" ? "Out to site" : "Back to yard",
    });
  }
  return out;
}

/**
 * Category, under the title — and for a movement, the ROUTE under that.
 *
 * Where the asset is coming from and going to is not a detail of a movement
 * order, it IS the order, so it sits in the header where the eye lands first
 * rather than hanging off the asset row.
 */
function laneCardSubtitle(r: BrokerOrder): string[] {
  if (!r.movement) return [r.orderType];
  return [
    r.orderType,
    r.movement.direction === "Asset Delivery"
      ? `${r.movement.yard} → ${r.shipTo}`
      : `${r.shipTo} → ${r.movement.yard}`,
  ];
}

/**
 * A card's footer alert, or nothing.
 *
 * Only stages with something OUTSTANDING get one. An alert on every card is not
 * an alert, it is a border — so Draft, Accepted, Completed and Synced carry none.
 */
function laneCardAlert(r: BrokerOrder): BoardLane["cards"][number]["alert"] {
  if (r.status === "Blocked") {
    return {
      status: "warning",
      text: r.blockedReason ?? "Credit hold",
      actionLabel: "Review",
    };
  }
  if (r.status === "Assigned") {
    const n = r.invitedVendorIds.length;
    return {
      status: "caution",
      text: r.quoteRequested
        ? `Awaiting pricing — ${n} invited`
        : `Awaiting acknowledgement — ${n} invited`,
    };
  }
  if (r.status === "Accounting Sync Ready") {
    return { status: "default", text: "Ready to export" };
  }
  return undefined;
}

const TOGGLE_COLUMNS = BROKER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/** What a saved view captures. `kind` is here because the tab IS part of the
 *  view a broker builds — a view that forgot it was the Movement tab would
 *  restore the wrong list. */
interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  dateKey: string;
  colScope: string;
  colQuery: string;
  /** Selected filter facets, as `facetKey:option`. Was `kind` when the order
   *  kinds were a tab row; a view still captures the same narrowing, plus every
   *  other facet it now sits beside. */
  facets: string[];
}

const keyOf = (s: ViewState) =>
  JSON.stringify({ ...s, hidden: [...s.hidden].sort() });

export function BrokerOrdersScreen({
  focus,
}: { focus?: { id: string; n: number } | null } = {}) {
  const [rows, setRows] = React.useState<BrokerOrder[]>(BROKER_ORDERS);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  /* §5.20 — Create means three DIFFERENT records, so the choice is made before
     a form opens rather than by a Type field inside one. `null` is "no movement
     sheet open"; the value is which direction it runs. */
  const [movement, setMovement] = React.useState<MovementDirection | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<BrokerSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<BrokerColumnKey>>(new Set());
  const [date, setDate] = React.useState(() => startOfDay(new Date()));
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  // Board-first, per §5.2. This is the one list in the prototype that does not
  // open as a table.
  const [view, setView] = React.useState<ListView>("board");
  /* The filter panel's selection, as `facetKey:option` ids. This is what the
     order-kind tab row turned into — plus every other facet, which used to be
     decorative. */
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [laneSort, setLaneSort] = React.useState<
    Record<string, "asc" | "desc" | undefined>
  >({});

  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    dateKey: dateKeyOf(date),
    colScope,
    colQuery,
    facets: [...facetSel].sort(),
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      dateKey: dateKeyOf(startOfDay(new Date())),
      colScope: "customer",
      colQuery: "",
      facets: [],
    }),
    []
  );

  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(
      s.sortKey && s.sortDir
        ? { key: s.sortKey as BrokerColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as BrokerColumnKey[]));
    setPageSize(s.pageSize);
    const [y, m, d] = s.dateKey.split("-").map(Number);
    setDate(new Date(y, m - 1, d));
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setFacetSel(new Set(s.facets ?? []));
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  // A global-search hit lands here: open that order's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();

  const onDate = React.useMemo(
    () => rows.filter((r) => r.dateKey === dateKeyOf(date)),
    [rows, date]
  );
  /** Tab counts are computed BEFORE the kind filter, so each tab can show how
   *  many rows it holds rather than only the active one being non-zero. */
  const searched = React.useMemo(
    () =>
      onDate.filter(
        (r) =>
          (!q || matchesBrokerOrder(r, q)) &&
          (!cq || matchesBrokerOrderIn(r, cq, colScope))
      ),
    [onDate, q, cq, colScope]
  );

  /*
    Facet application. Every facet is AND-ed with the others and OR-ed within
    itself, which is what a checkbox list means.

    Three Status options — Overdue, Cancelled, Partial Accounting Synced — are
    filterable states the seed data has no rows for, so selecting one correctly
    empties the list rather than being quietly ignored. "Created / Draft" is the
    filter's label for the `Draft` lane.
  */
  const filtered = React.useMemo(() => {
    if (facetSel.size === 0) return searched;
    const on = (facet: string, value: string) => facetSel.has(`${facet}:${value}`);
    const picked = (facet: string) =>
      [...facetSel].some((id) => id.startsWith(`${facet}:`));
    const pass = (facet: string, values: string[]) =>
      !picked(facet) || values.some((v) => on(facet, v));

    return searched.filter((r) =>
      [
        /* Order Types is a MIXED facet, matching the reference: Urgent is a
           flag, Movement is the order kind, the rest are the Order Type field.
           A row therefore matches on every one of those it satisfies, and an
           Asset Movement order answers to "Movement" rather than to a type
           nobody picked from the list. */
        pass("orderTypes", [
          ...(r.urgent ? ["Urgent Orders"] : []),
          r.orderType === "Asset Movement" ? "Movement" : r.orderType,
        ]),
        pass("status", [r.status === "Draft" ? "Created / Draft" : r.status]),
        pass("customer", [r.customer.title]),
        pass("shipToAddress", [r.shipTo, r.zip, r.state]),
        pass("product", r.lines.map((l) => l.product)),
        pass("vendor", [
          ...(r.vendorId ? [vendorName(r.vendorId)] : []),
          ...r.invitedVendorIds.map(vendorName),
        ]),
        pass("salesperson", [r.salesperson]),
        pass("createdBy", [r.createdBy]),
        pass("tags", r.tags),
      ].every(Boolean)
    );
  }, [searched, facetSel]);
  const sorted = React.useMemo(() => sortBrokerOrders(filtered, sort), [filtered, sort]);
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  /** Lanes, in lifecycle order. Lane sort is by window start, which is the only
   *  ordering a dispatcher asks a lane for. */
  const lanes: BoardLane[] = React.useMemo(
    () =>
      BROKER_STATUSES.map((status) => {
        const dir = laneSort[status];
        let cards = filtered.filter((r) => r.status === status);
        if (dir) {
          cards = [...cards].sort((a, b) => {
            const d = timeToMinutes(a.window.start) - timeToMinutes(b.window.start);
            return dir === "asc" ? d : -d;
          });
        }
        return {
          key: status,
          title: status,
          color: BROKER_LANE_COLOR[status],
          emptyLabel: `No orders in ${status.toLowerCase()}`,
          cards: cards.map((r) => ({
            id: r.id,
            title: r.orderNo,
            badges: laneCardBadges(r),
            subtitle: laneCardSubtitle(r),
            units: laneCardUnits(r),
            alert: laneCardAlert(r),
            detailLabel: "View details",
          })),
        };
      }),
    [filtered, laneSort]
  );

  const onSort = (key: BrokerColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const toggleLaneSort = (laneKey: string) =>
    setLaneSort((prev) => ({
      ...prev,
      // asc -> desc -> off, the same three-step cycle the table headers use.
      [laneKey]:
        prev[laneKey] === "asc" ? "desc" : prev[laneKey] === "desc" ? undefined : "asc",
    }));

  const customers = React.useMemo(
    () => Array.from(new Set(BROKER_ORDERS.map((r) => r.customer.title))),
    []
  );
  /* Every site, not only the ones an order already uses — a new order must be
     able to reach a site nobody has ordered to yet. */
  const shipTos = React.useMemo(() => SHIP_TO_SITES.map((x) => x.name), []);

  const saveOrder = (order: BrokerOrder, draft: BrokerOrderDraft) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== order.id
          ? r
          : {
              ...r,
              customer: { title: draft.customer, description: draft.erpId },
              shipTo: draft.shipTo,
              window: { start: draft.windowStart, end: draft.windowEnd },
              poNumber: draft.poNumber,
              orderType: draft.orderType,
              hub: draft.hub,
              urgent: draft.urgent,
              signatureOnDelivery: draft.signatureOnDelivery,
              lines: draft.lines,
              status: draft.status,
              vendorId: draft.vendorId,
              invitedVendorIds: draft.invitedVendorIds,
              quoteRequested: draft.quoteRequested,
              primaryPoc: draft.primaryPoc,
              salesperson: draft.salesperson,
              instructions: draft.instructions,
              // Leaving Blocked clears the reason, so the two can never disagree
              // — the same invariant `assertConsistent` checks on the seeds.
              blockedReason: draft.status === "Blocked" ? r.blockedReason : null,
              ...(draft.plannedDate
                ? {
                    date: {
                      title: DATE_FMT.format(draft.plannedDate),
                      description: relativeLabel(
                        Math.round(
                          (draft.plannedDate.getTime() -
                            startOfDay(new Date()).getTime()) /
                            86_400_000
                        ),
                        draft.plannedDate
                      ),
                    },
                    dateKey: dateKeyOf(draft.plannedDate),
                  }
                : {}),
            }
      )
    );

  /** New orders continue the D- series in steps of 7, as the seeds do. */
  const createOrder = (draft: BrokerOrderDraft) => {
    const when = draft.plannedDate ?? date;
    const chosenSite = SHIP_TO_SITES.find((x) => x.name === draft.shipTo);
    const nextNo =
      Math.max(...rows.map((r) => Number(r.orderNo.slice(2)))) + 7;
    const offset = Math.round(
      (when.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
    );
    setRows((prev) => [
      {
        id: `bo-new-${nextNo}`,
        /* The prefix follows the KIND, and the kind now follows the sheet's
           recurring checkbox — a recurring order created here has to read as
           one everywhere, or the badge and the filter disagree. */
        orderNo: `D-${nextNo}`,
        kind: draft.recurring ? "Recurring" : "Regular",
        orderType: draft.orderType === "Asset Movement" ? "Core" : draft.orderType,
        customer: { title: draft.customer, description: draft.erpId },
        shipTo: draft.shipTo,
        date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
        dateKey: dateKeyOf(when),
        window: { start: draft.windowStart, end: draft.windowEnd },
        lines: draft.lines,
        status: draft.status,
        vendorId: draft.vendorId,
        invitedVendorIds: draft.invitedVendorIds,
        quoteRequested: draft.quoteRequested,
        quotes: [],
        urgent: draft.urgent,
        signatureOnDelivery: draft.signatureOnDelivery,
        poNumber: draft.poNumber,
        /* The create sheet has no geography fields, so a new order takes the
           first site rather than leaving the ship-to facets blank for it. */
        /* The site carries its own geography, so a new order reads it from the
           chosen ship-to rather than being handed a default that disagrees. */
        zip: chosenSite?.zip ?? SHIP_TO_SITES[0].zip,
        state: chosenSite?.state ?? SHIP_TO_SITES[0].state,
        createdBy: "Dana Whitfield",
        tags: [],
        /* Only rows that were actually completed survive — a half-filled load
           row would read as a loading plan that does not exist. */
        loadOrder:
          draft.loadRows
            ?.filter((r) => r.terminal && r.supplier && r.loadingAccount)
            .map((r) => ({
              product: r.product,
              terminal: r.terminal!,
              supplier: r.supplier!,
              loadingAccount: r.loadingAccount!,
            })) ?? null,
        recurrence: draft.recurring
          ? {
              fromDateKey: dateKeyOf(draft.recurrenceFrom ?? when),
              frequency: draft.recurrenceFrequency,
            }
          : null,
        hub: draft.hub,
        primaryPoc: draft.primaryPoc,
        salesperson: draft.salesperson,
        instructions: draft.instructions,
        blockedReason: null,
        movement: null,
      },
      ...prev,
    ]);
    setPage(1);
  };

  /* A MOVEMENT ORDER IS A DIFFERENT RECORD, not a delivery with a flag: it
     carries exactly one asset, no quantity, and an M prefix that `orders.ts`
     asserts on. `assertConsistent` fails the build if any of that drifts. */
  const createMovement = (draft: AssetMovementDraft) => {
    const when = draft.plannedDate ?? date;
    const chosenSite = SHIP_TO_SITES.find((x) => x.name === draft.shipTo);
    const nextNo = Math.max(...rows.map((r) => Number(r.orderNo.slice(2)))) + 7;
    const offset = Math.round(
      (when.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
    );
    const asset = RENTAL_ASSETS.find((a) => a.id === draft.assetId);
    setRows((prev) => [
      {
        id: `bo-mv-${nextNo}`,
        orderNo: `M-${nextNo}`,
        kind: "Movement",
        orderType: "Asset Movement",
        customer: { title: draft.customer, description: "" },
        shipTo: draft.shipTo,
        date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
        dateKey: dateKeyOf(when),
        window: { start: "8:00 AM", end: "12:00 PM" },
        /* Exactly one line, no gallons — there is nothing to deliver, only
           something to move. */
        lines: [
          {
            asset: asset?.name ?? "",
            product: draft.product || (asset ? "—" : ""),
            gal: null,
            topOff: false,
            rental: true,
          },
        ],
        status: "Draft",
        vendorId: null,
        invitedVendorIds: [],
        quoteRequested: false,
        quotes: [],
        urgent: draft.urgent,
        signatureOnDelivery: draft.signature,
        poNumber: draft.poNumber,
        zip: chosenSite?.zip ?? SHIP_TO_SITES[0].zip,
        state: chosenSite?.state ?? SHIP_TO_SITES[0].state,
        createdBy: "Dana Whitfield",
        tags: draft.tags,
        loadOrder: null,
        recurrence: null,
        hub: HUBS[0],
        primaryPoc: draft.primaryPoc,
        salesperson: draft.salesperson,
        instructions: draft.instructions,
        blockedReason: null,
        movement: {
          direction: draft.direction,
          yard: draft.yard,
          tankType: asset?.type ?? draft.tankType,
          capacityGal: asset?.capacityGal ?? (Number(draft.capacity) || 0),
        },
      },
      ...prev,
    ]);
    setPage(1);
  };

  const renderCell = (row: BrokerOrder, key: BrokerColumnKey) => {
    switch (key) {
      case "order":
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm tabular-nums text-foreground">
              {row.orderNo}
            </span>
            {row.urgent && (
              <Badge variant="destructive" className="shrink-0">
                !
              </Badge>
            )}
          </div>
        );
      case "customer":
        return <TwoLineCell {...row.customer} />;
      case "shipTo":
        return <span className="truncate text-sm text-foreground">{row.shipTo}</span>;
      case "date":
        return <TwoLineCell {...row.date} />;
      case "window":
        return (
          <span className="truncate text-sm text-foreground">
            {row.window.start} – {row.window.end}
          </span>
        );
      case "qty":
        return (
          <span className="text-sm tabular-nums text-foreground">
            {isAllTopOff(row.lines) ? "Top-off" : totalGal(row.lines).toLocaleString()}
          </span>
        );
      case "vendor":
        // Three genuinely different states, and collapsing them would hide the
        // one a broker acts on: nobody invited, invited but unaccepted, accepted.
        return row.vendorId ? (
          <span className="truncate text-sm text-foreground">
            {vendorName(row.vendorId)}
          </span>
        ) : row.invitedVendorIds.length > 0 ? (
          <span className="truncate text-sm text-muted-foreground">
            {row.invitedVendorIds.length} invited
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "status":
        return (
          <StatusChip tone={BROKER_STATUS_TONE[row.status]} variant="text">
            {row.status}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  const emptyBody = (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">{q ? <SearchX /> : <CalendarOff />}</EmptyMedia>
        <EmptyTitle>{q ? "No matching orders" : "Nothing planned"}</EmptyTitle>
        <EmptyDescription>
          {q
            ? `No 3PL orders on ${formatFullDate(date)} match “${search.trim()}”.`
            : `No 3PL orders are planned for ${formatFullDate(date)}.`}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (q) setSearch("");
            else setDate(startOfDay(new Date()));
            setPage(1);
          }}
        >
          {q ? "Clear search" : "Go to today"}
        </Button>
      </EmptyContent>
    </Empty>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create Order"
        /* The three take DIFFERENT forms — a delivery has lines and a partner,
           a movement has one asset and a yard — so the choice comes before the
           form, not as a Type field inside it. Each carries a detail line:
           "Asset Delivery" and "Asset Pickup" are one word apart and opposite. */
        createMenu={[
          {
            key: "delivery-order",
            label: "Delivery Order",
            detail: "Standard fuel delivery to a customer site",
          },
          {
            key: "asset-delivery",
            label: "Asset Delivery",
            detail: "Move a tank or asset to a customer site",
          },
          {
            key: "asset-pickup",
            label: "Asset Pickup",
            detail: "Retrieve a tank or asset from a customer site",
          },
        ]}
        onCreateSelect={(key) => {
          if (key === "delivery-order") setCreating(true);
          else if (key === "asset-delivery") setMovement("Asset Delivery");
          else setMovement("Asset Pickup");
        }}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search orders, customers, partners…"
          filters={
            <ListFilters
              onApply={(sel) => {
                setFacetSel(sel);
                setPage(1);
              }}
              /* Status first — it is the question asked most, and the old
                 order-kind facet that used to sit here is gone: its three
                 values were not order types. "Order Types" below now carries
                 the real ones. */
              facets={[
                {
                  key: "status",
                  label: "Status",
                  // The filter's status list is longer than the board's lanes —
                  // see BROKER_STATUS_FILTERS for why the two are kept apart.
                  options: [...BROKER_STATUS_FILTERS],
                },
                {
                  key: "customer",
                  label: "Customer",
                  options: customers,
                  searchable: true,
                },
                {
                  key: "shipToAddress",
                  label: "Ship-To Address",
                  /* One facet, three questions. Ship-to name, ZIP and state are
                     the same address asked at three grains, so they share a
                     pane instead of eating three rows of the facet menu. Each
                     site carries its full address, because two sites can share
                     a name and only the street tells them apart. */
                  sections: [
                    {
                      title: "Ship-To Name",
                      options: SHIP_TO_SITES.map((x) => ({
                        value: x.name,
                        description: siteAddress(x),
                      })),
                    },
                    {
                      title: "Zip Code",
                      options: [...new Set(SHIP_TO_SITES.map((x) => x.zip))],
                    },
                    {
                      title: "State",
                      options: [...new Set(SHIP_TO_SITES.map((x) => x.state))],
                    },
                  ],
                  searchable: true,
                },
                {
                  key: "orderTypes",
                  label: "Order Types",
                  options: [...ORDER_TYPE_FILTERS],
                },
                {
                  key: "product",
                  label: "Product",
                  options: [...PRODUCTS],
                  searchable: true,
                },
                {
                  key: "vendor",
                  label: "Vendors / Common Carriers",
                  options: VENDORS.map((v) => v.name),
                  searchable: true,
                },
                {
                  key: "salesperson",
                  label: "Sales Person",
                  options: [...SALESPEOPLE],
                },
                { key: "createdBy", label: "Created By", options: [...CREATED_BY] },
                { key: "tags", label: "Tags", options: [...ORDER_TAGS] },
              ]}
            />
          }
          columns={TOGGLE_COLUMNS}
          hiddenColumns={hidden}
          onToggleColumn={(k) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          onShowAllColumns={() => setHidden(new Set())}
          onHideAllColumns={() => setHidden(new Set(TOGGLE_COLUMNS.map((c) => c.key)))}
          searchFields={BROKER_SEARCH_FIELDS}
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
          view={view}
          onViewChange={setView}
          dateScope={{
            date,
            onDateChange: (d) => {
              setDate(d);
              setPage(1);
            },
          }}
        />
        <ColumnSearchChip
          searchFields={BROKER_SEARCH_FIELDS}
          colScope={colScope}
          colQuery={colQuery}
          onClear={() => {
            setColQuery("");
            setPage(1);
          }}
        />
      </div>

      {/* The order-kind tab row used to sit here. It is gone: All / Regular /
          Recurring / Movement is one question about the data, which is what a
          FILTER FACET is — and the same three values now live under "Order
          Types" in the filter panel. Keeping both would have been two controls
          answering one question, in two places, that could disagree. */}

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 ? (
            emptyBody
          ) : view === "board" ? (
            <BrokerBoard
              lanes={lanes}
              onOpenCard={setOpenId}
              laneSort={laneSort}
              onToggleLaneSort={toggleLaneSort}
            />
          ) : (
            <ListTable
              rows={pageRows}
              columns={BROKER_COLUMNS}
              hidden={hidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              openLabel={(r) => `Open order ${r.orderNo}`}
              onOpenRow={(r) => setOpenId(r.id)}
            />
          )}
        </div>
      </div>

      <BrokerOrderSheet
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

      {/* ONE SHEET, TWO DIRECTIONS — see `AssetMovementSheet`. Mounted only
          while open so it starts from a clean draft each time. */}
      {movement && (
        <AssetMovementSheet
          direction={movement}
          open
          onOpenChange={(o) => !o && setMovement(null)}
          onCreate={(draft) => {
            createMovement(draft);
            setMovement(null);
          }}
          customers={customers}
        />
      )}

      {/* The board is not a paged list, so a "Showing 1–25 of 54" footer under it
          would be describing something that isn't on screen. */}
      <div className={cn("mt-4 shrink-0", view === "board" && "hidden")}>
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
