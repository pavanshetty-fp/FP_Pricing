import * as React from "react";
import {
  Fuel,
  ClipboardList,
  Users,
  Database,
  SearchX,
  CalendarOff,
  Construction,
  Truck,
  LayoutGrid,
  ListChecks,
  BookUser,
  Repeat,
  Contact,
  Droplet,
  Caravan,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { NavGroup, NavItem } from "@/components/navigation-drawer";
import { TopBar } from "@/components/top-bar";
import { NavRail, NavigationDrawer } from "@/components/navigation-drawer";
import { ThemeToggle } from "@/components/theme";
import { FuelOrdersBulkBar } from "./FuelOrdersBulkBar";
import { TablePagination } from "@/components/tables-layout/TablePagination";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ColumnSearchChip,
  FuelOrdersToolbar,
  type FuelOrdersView,
} from "./FuelOrdersToolbar";
import { FuelOrdersTable } from "./FuelOrdersTable";
import { AssetOrdersScreen } from "./AssetOrdersScreen";
import { CustomersScreen } from "./CustomersScreen";
import { AssetsScreen } from "./AssetsScreen";
import { BrokerOrdersScreen } from "./threepl";
import { ProfileScreen } from "./ProfileScreen";
import { SettingsScreen } from "./SettingsScreen";
import { GlobalSearch } from "./GlobalSearch";
import { OrderSheet, type OrderDraft } from "./OrderSheet";
import {
  FuelOrdersViewBar,
  viewStateKey,
  type SavedView,
  type ViewState,
} from "./FuelOrdersViewBar";
import {
  DATE_FMT,
  FUEL_ORDERS,
  FUEL_ORDER_COLUMNS,
  dateKeyOf,
  formatFullDate,
  matchesFuelOrder,
  matchesFuelOrderIn,
  relativeLabel,
  splitGallons,
  sortFuelOrders,
  startOfDay,
} from "./data";
import type {
  AccountUser,
  FuelOrder,
  FuelOrderColumnKey,
  SortState,
} from "./types";
import { useGrouping } from "./useGrouping";
import { FUEL_ORDER_GROUP_DIMS } from "./groupDims";
import { GroupedListFooter } from "./GroupedListFooter";

/*
  Unified View — the FleetPanda Sales Console recreated on FP-DS.

  A standalone prototype: it ships as its own HTML and is NOT a section of the
  FP DS 2026 gallery. It consumes the design system (components from
  `@/components/*`, tokens from `@/index.css`) but owns its own shell and entry
  point, so app-level decisions here never leak into the DS showcase.

  Shell: Tier-0 top bar (brand · global search · notifications · account — the
  account menu is where Profile lives, so Profile is not a rail destination) ·
  Tier-1 52px rail carrying the module switcher + the four workspace
  destinations · NO Tier-2 sidebar, because this workspace has no second nav
  level — so the content layer takes the full remaining width.
*/

/** Shared with the order sheet — one list, so bulk and single edits agree. */
const DRIVER_OPTIONS = ["Shriya", "Shriya Test 2", "Aakash"];
const TAG_OPTIONS = [
  "Keep Full",
  "Rush",
  "Night",
  "Weekend",
  "Split Load",
  "Hazmat",
  "After Hours",
];

/*
  MODULE-SCOPED NAVIGATION.

  The module switcher used to be decorative: picking 3PL relabelled the tile at
  the top of the rail and changed nothing else. It is real now — a module owns a
  DESTINATION LIST, and switching module swaps the whole list along with the
  screen underneath.

  DESTINATION KEYS ARE GLOBALLY UNIQUE, deliberately: `3pl-customers` rather than
  a second `customers`. Both modules have a Customers destination, and with a
  shared key a stale `navKey` surviving a module switch would resolve to the
  other module's screen — the rail showing 3PL while the content layer showed
  Sales. Unique keys make that state unrepresentable rather than merely unlikely.
*/
const SALES_NAV: NavItem[] = [
  { key: "fuel-orders", label: "Fuel Orders", icon: <Fuel /> },
  { key: "asset-orders", label: "Asset Orders", icon: <ClipboardList /> },
  { key: "customers", label: "Customers", icon: <Users /> },
  { key: "assets", label: "Assets", icon: <Database /> },
];

/**
 * 3PL — TIER 1. The rail carries the module's top-level areas and nothing else:
 * one item per top-level screen, per the shell rule. Sub-categories are NOT
 * sections in the rail — they belong to the Tier-2 drawer below.
 */
const THREE_PL_NAV: NavItem[] = [
  { key: "3pl-orders", label: "Orders", icon: <ClipboardList /> },
  { key: "3pl-directory", label: "Directory", icon: <BookUser /> },
];

/**
 * TIER 2 — the contextual sub-nav for the active rail item, keyed by that
 * item. Only areas with a second nav level appear here; a rail item with no
 * entry is a destination in its own right and the content layer takes the full
 * width (Sales works exactly that way).
 *
 * The drawer renders the group label as its heading, and `children` on any item
 * becomes a collapsible dropdown — both already in the DS component, which is
 * why nothing here needed a new one.
 */
const SUB_NAV: Record<string, NavGroup[]> = {
  "3pl-orders": [
    {
      label: "Order Types",
      items: [
        { key: "3pl-delivery-orders", label: "Delivery Orders", icon: <ListChecks /> },
        { key: "3pl-recurring-orders", label: "Recurring Orders", icon: <Repeat /> },
      ],
    },
  ],
  "3pl-directory": [
    {
      /* No group label: the drawer's own header already says Directory, and a
         heading repeating it is the same dead-width problem a grouped column
         has. Orders keeps its label because "Order Types" says something the
         header does not. */
      items: [
        { key: "3pl-customers", label: "Customers", icon: <Contact /> },
        { key: "3pl-vendors", label: "Vendors", icon: <Truck /> },
        { key: "3pl-products", label: "Products", icon: <Droplet /> },
        { key: "3pl-rental-assets", label: "Rental Assets", icon: <Caravan /> },
      ],
    },
  ],
};

/** First destination inside an area's drawer, for landing on arrival. */
const firstSubKey = (areaKey: string): string | null =>
  SUB_NAV[areaKey]?.flatMap((g) => g.items)[0]?.key ?? null;

/**
 * Lease and Pricing get NO destinations rather than invented ones. The module
 * switcher offers four modules because the DS component does; two of them have
 * had no information architecture specified, and guessing their rail would put
 * fake navigation on screen — the same rule that kept the reference's module
 * taxonomy out of global search. An empty list renders the module-level empty
 * state below.
 */
const MODULE_NAV: Record<string, NavItem[]> = {
  sales: SALES_NAV,
  "3pl": THREE_PL_NAV,
  lease: [],
  pricing: [],
};

/**
 * Where a fresh visit lands.
 *
 * This is NOT arbitrary and it is NOT "sales because sales was first". The
 * prototype ships as a single self-contained HTML that people open by
 * double-clicking, and the module switcher is a 32px tile inside a 52px
 * collapsed rail whose menu you have to know to open. Landing on Sales meant a
 * freshly shared build was pixel-identical to the previous one, so the new
 * module read as "you sent me the wrong file" — which is exactly what happened.
 *
 * So: land on the NEWEST BUILT MODULE, and update this when the next one lands.
 * It is a named constant with this comment attached rather than an inline
 * string, so the next pass changes it deliberately instead of inheriting it.
 */
const LANDING_MODULE = "3pl";

/** Persisted so a reader who switches away is not sent back on every reload.
 *  Same `fp-` convention as `fp-theme` and `fp-breadcrumb`. */
const MODULE_STORAGE_KEY = "fp-module";

function readStoredModule(): string {
  // Guarded like the rest of the app's persistence: a file:// open with storage
  // blocked must fall through to the default rather than throw on first render.
  try {
    if (typeof localStorage === "undefined") return LANDING_MODULE;
    const saved = localStorage.getItem(MODULE_STORAGE_KEY);
    // A stored key from a build where that module existed must not strand the
    // rail with no destinations.
    return saved && MODULE_NAV[saved] ? saved : LANDING_MODULE;
  } catch {
    return LANDING_MODULE;
  }
}

const MODULE_LABEL: Record<string, string> = {
  sales: "Sales",
  "3pl": "3PL",
  lease: "Lease",
  pricing: "Pricing",
};

/**
 * Account destinations — full pages, reached only from the top bar's account
 * menu. Kept out of NAV_ITEMS so the rail never renders them: Profile is not a
 * workspace destination, and while one is open no rail item is current, which
 * is the honest state (`activeKey` simply matches nothing).
 */
const ACCOUNT_PAGES: Record<string, string> = {
  profile: "Profile",
  settings: "Settings",
};

/** Columns the column-visibility menu can toggle (everything with a label). */
const TOGGLE_COLUMNS = FUEL_ORDER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/** Fuel Orders list — toolbar + table + pagination, inside the content layer. */
function FuelOrdersScreen({ focus }: { focus?: { id: string; n: number } | null }) {
  const [rows, setRows] = React.useState(FUEL_ORDERS);
  // Picker options come from the data, so the sheet can't offer a value the
  // table has never seen.
  const uniq = (xs: string[]) => Array.from(new Set(xs));
  const customers = React.useMemo(
    () => uniq(FUEL_ORDERS.map((r) => r.customer.title)),
    []
  );
  const shipTos = React.useMemo(
    () => uniq(FUEL_ORDERS.map((r) => r.customer.description)),
    []
  );
  const productNames = React.useMemo(
    () => uniq(FUEL_ORDERS.flatMap((r) => r.products.map((p) => p.name))),
    []
  );
  const [openOrderId, setOpenOrderId] = React.useState<string | null>(null);
  // Create Order reuses the order sheet, opened blank. Separate from
  // openOrderId because there is no row to point at yet.
  const [creating, setCreating] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hiddenColumns, setHiddenColumns] = React.useState<
    Set<FuelOrderColumnKey>
  >(new Set());
  const [date, setDate] = React.useState(() => startOfDay(new Date()));
  // Search-by-column and the view switch — both part of the DS toolbar unit.
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<FuelOrdersView>("table");
  const [views, setViews] = React.useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null);
  const viewSeq = React.useRef(0);

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
      groupBy: [],
    }),
    []
  );

  const activeView = views.find((v) => v.id === activeViewId) ?? null;
  const applyState = (st: ViewState) => {
    setSearch(st.search);
    setSort(
      st.sortKey && st.sortDir
        ? { key: st.sortKey as FuelOrderColumnKey, dir: st.sortDir }
        : null
    );
    setHiddenColumns(new Set(st.hidden as FuelOrderColumnKey[]));
    setPageSize(st.pageSize);
    const [y, m, d] = st.dateKey.split("-").map(Number);
    setDate(new Date(y, m - 1, d));
    setColScope(st.colScope);
    setColQuery(st.colQuery);
    g.setGrouping(st.groupBy ?? []);
    setPage(1);
  };

  const applyView = (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    applyState(v.state);
    setActiveViewId(id);
  };
  const resetToDefault = () => {
    applyState(defaultState);
    setActiveViewId(null);
  };
  const createView = (name: string) => {
    const id = `view-${++viewSeq.current}`;
    setViews((prev) => [...prev, { id, name, state: current }]);
    setActiveViewId(id);
  };
  const renameView = (id: string, name: string) =>
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
  const updateView = (id: string) =>
    setViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, state: current } : v))
    );
  const deleteView = (id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId(null);
  };

  const toggleColumn = (key: FuelOrderColumnKey) =>
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A global-search hit lands here: open that order's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenOrderId(focus.id);
  }, [focus]);

  const query = search.trim().toLowerCase();
  // Date scopes the list first — every row on screen belongs to the selected
  // delivery date — then the search narrows within it.
  const dateKey = dateKeyOf(date);
  const onDate = React.useMemo(
    () => rows.filter((r) => r.dateKey === dateKey),
    [rows, dateKey]
  );
  // Global search and column search BOTH apply, per the DS unit — the toolbar
  // input narrows across every column, the popover narrows within one.
  const cq = colQuery.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      onDate.filter(
        (r) =>
          (!query || matchesFuelOrder(r, query)) &&
          (!cq || matchesFuelOrderIn(r, cq, colScope))
      ),
    [onDate, query, cq, colScope]
  );
  const sorted = React.useMemo(() => sortFuelOrders(filtered, sort), [filtered, sort]);

  /* Grouping — the same hook the other three lists use, so all four behave
     identically. It suspends pagination while grouped, because a group that
     straddles a page boundary cannot have an honest header. */
  const g = useGrouping<FuelOrder, FuelOrderColumnKey>({
    dimensions: FUEL_ORDER_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r: FuelOrder) => r.id, []),
    // Qty (Gal) is the only column on this list that sums to something true.
    measureOf: React.useCallback((r: FuelOrder) => r.qtyGal, []),
    hiddenColumns,
    page,
    pageSize,
  });
  const pageRows = g.visibleRows;

  /* A view captures the state a user would otherwise have to rebuild by
     hand. Declared after the grouping hook because it reads from it. */
  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hiddenColumns],
    pageSize,
    dateKey: dateKeyOf(date),
    colScope,
    colQuery,
    groupBy: g.groupBy,
  };

  const dirty =
    viewStateKey(current) !==
    viewStateKey(activeView ? activeView.state : defaultState);


  // Sort cycles asc → desc → unsorted; changing sort/size returns to page 1.
  const onSort = (key: FuelOrderColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  /**
   * The two sides the bulk dialogs preview against. Derived from the FULL row
   * list, not the visible page: the selection survives paging, so a preview
   * built from the page would silently under-report what is about to change.
   */
  const selectedOrders = React.useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );
  const unselectedOrders = React.useMemo(
    () => rows.filter((r) => !selectedIds.has(r.id)),
    [rows, selectedIds]
  );

  /** Apply a change to every selected order. */
  const applyToSelected = (fn: (r: FuelOrder) => FuelOrder) =>
    setRows((prev) => prev.map((r) => (selectedIds.has(r.id) ? fn(r) : r)));

  const bulk = {
    setProducts: (names: string[]) =>
      // Replaces each order's lines, keeping ITS OWN total — a bulk product
      // change shouldn't silently rewrite quantities too. With several products
      // the total splits across them (see splitGallons), so the sum, and so the
      // Qty column, is unchanged either way.
      applyToSelected((r) => {
        const split = splitGallons(r.qtyGal, names.length);
        return { ...r, products: names.map((name, i) => ({ name, gal: split[i] })) };
      }),
    setDriver: (driver: string | null) =>
      applyToSelected((r) => ({
        ...r,
        driver: driver
          ? {
              name: driver,
              initials: driver
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
            }
          : null,
        // Status follows the driver everywhere, bulk edits included.
        status: driver ? "Assigned" : "Unassigned",
      })),
    setPlannedDate: (d: Date) =>
      applyToSelected((r) => ({
        ...r,
        planned: { date: DATE_FMT.format(d), time: r.planned?.time ?? "12:00 PM" },
      })),
    setPlannedTime: (time: string) =>
      applyToSelected((r) => ({
        ...r,
        planned: { date: r.planned?.date ?? r.date.title, time },
      })),
    addTags: (tags: string[]) =>
      // Adds to what each order already carries rather than replacing.
      applyToSelected((r) => ({
        ...r,
        tags: Array.from(new Set([...r.tags, ...tags])),
      })),
    remove: () => {
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    },
  };

  /**
   * Commit a blank-sheet draft as a new row.
   *
   * Two values the sheet cannot supply, both DERIVED from what is already on
   * screen rather than invented:
   *   • the order number continues the existing sequence — the seeds run in
   *     steps of 2 down from the newest, so a new one is the highest + 2;
   *   • the delivery date is the date the toolbar is currently scoped to, which
   *     is the only date whose rows are visible, so the new order appears
   *     instead of landing on a day the operator is not looking at.
   * Status stays derived from the driver, as everywhere else.
   */
  const createOrder = (draft: OrderDraft) => {
    const nextNo =
      Math.max(...rows.map((r) => Number(r.orderNo))) + 2;
    const newRow: FuelOrder = {
      id: `fo-new-${nextNo}`,
      orderNo: String(nextNo),
      type: {
        code: draft.typeCode,
        label: draft.typeCode === "D" ? "Delivery" : "Extraction",
      },
      customer: { title: draft.customer, description: draft.shipTo },
      products: draft.products,
      qtyGal: draft.products.reduce((n, p) => n + p.gal, 0),
      // Same relative labelling the seeds use, so a new order on a day other
      // than today does not claim to be "Today".
      date: {
        // DATE_FMT, not formatFullDate: the seeds render "Aug 25, 2026" while
        // formatFullDate prepends the weekday ("Tue, Aug 25, 2026"), which made
        // a created row the only one in the column formatted differently.
        title: DATE_FMT.format(date),
        description: relativeLabel(
          Math.round(
            (date.getTime() - startOfDay(new Date()).getTime()) / 86_400_000
          ),
          date
        ),
      },
      dateKey: dateKeyOf(date),
      planned: draft.plannedDate
        ? {
            date: DATE_FMT.format(draft.plannedDate),
            time: draft.plannedTime || "12:00 PM",
          }
        : null,
      tags: draft.tags,
      status: draft.driver ? "Assigned" : "Unassigned",
      driver: draft.driver
        ? {
            name: draft.driver,
            initials: draft.driver
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          }
        : null,
    };
    setRows((prev) => [newRow, ...prev]);
    setPage(1);
  };

  /** Fold a sheet draft back onto its row. */
  const saveOrder = (order: FuelOrder, draft: OrderDraft) => {
    const plannedDate = draft.plannedDate;
    setRows((prev) =>
      prev.map((r) =>
        r.id !== order.id
          ? r
          : {
              ...r,
              type: {
                code: draft.typeCode,
                label: draft.typeCode === "D" ? "Delivery" : "Extraction",
              },
              customer: { title: draft.customer, description: draft.shipTo },
              products: draft.products,
              qtyGal: draft.products.reduce((n, p) => n + p.gal, 0),
              // Date of Delivery was dropped from the sheet, so the row keeps
              // its own; only the planned date/time is editable here.
              planned:
                plannedDate && draft.plannedTime.trim()
                  ? {
                      date: DATE_FMT.format(plannedDate),
                      time: draft.plannedTime.trim(),
                    }
                  : null,
              // Status follows the driver; the sheet has no status field.
              status: draft.driver ? "Assigned" : "Unassigned",
              driver: draft.driver
                ? {
                    name: draft.driver,
                    initials: draft.driver
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase(),
                  }
                : null,
              tags: draft.tags,
            }
      )
    );
  };

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  /* A group's checkbox owns the group's WHOLE membership, collapsed rows
     included — otherwise it would quietly mean "the rows you can see". */
  const toggleGroup = (rowIds: string[], checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of rowIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FuelOrdersViewBar
        views={views}
        activeId={activeViewId}
        dirty={dirty}
        onApply={applyView}
        onResetToDefault={resetToDefault}
        onCreate={createView}
        onRename={renameView}
        onUpdate={updateView}
        onDelete={deleteView}
        onCreateOrder={() => setCreating(true)}
      />

      <div className="mt-4 shrink-0">
        <FuelOrdersToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          columns={TOGGLE_COLUMNS}
          hiddenColumns={hiddenColumns}
          onToggleColumn={toggleColumn}
          onShowAllColumns={() => setHiddenColumns(new Set())}
          onHideAllColumns={() =>
            setHiddenColumns(new Set(TOGGLE_COLUMNS.map((c) => c.key)))
          }
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
          date={date}
          onDateChange={(d) => {
            setDate(d);
            setPage(1);
          }}
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
        />
        <ColumnSearchChip
          colScope={colScope}
          colQuery={colQuery}
          onClear={() => {
            setColQuery("");
            setPage(1);
          }}
        />
      </div>

      {/* Table region — `relative` anchors the floating bulk-action bar. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {view === "board" ? (
            /* The DS toolbar unit ships a Table/Board switch, so the control is
               here. The board itself is NOT built for this screen: the DS's
               `data-action-control/BoardView` is bound to that demo's row shape,
               and a real Fuel Orders board needs a lane dimension decided
               (status? driver? delivery date?) rather than guessed. Same honest
               empty state the rail uses for the unbuilt modules. */
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Construction />
                </EmptyMedia>
                <EmptyTitle>Board view</EmptyTitle>
                <EmptyDescription>
                  Not built yet — the lane dimension for Fuel Orders hasn't been
                  decided. The table is the built view.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("table")}
                >
                  Back to table
                </Button>
              </EmptyContent>
            </Empty>
          ) : sorted.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {query ? <SearchX /> : <CalendarOff />}
                </EmptyMedia>
                <EmptyTitle>
                  {query ? "No matching orders" : "Nothing scheduled"}
                </EmptyTitle>
                <EmptyDescription>
                  {query
                    ? `No fuel orders on ${formatFullDate(date)} match “${search.trim()}”.`
                    : `No fuel orders are scheduled for ${formatFullDate(date)}.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {query ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    Clear search
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDate(startOfDay(new Date()));
                      setPage(1);
                    }}
                  >
                    Go to today
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <FuelOrdersTable
              rows={pageRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              onToggleGroup={toggleGroup}
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onToggleAll={toggleAll}
              sort={sort}
              onSort={onSort}
              hidden={g.effectiveHidden}
              onOpenOrder={(row) => setOpenOrderId(row.id)}
            />
          )}
        </div>

        {view === "table" && selectedIds.size > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <div className="pointer-events-auto">
              <FuelOrdersBulkBar
                count={selectedIds.size}
                onClear={() => setSelectedIds(new Set())}
                onSetProducts={bulk.setProducts}
                onSetDriver={bulk.setDriver}
                onSetPlannedDate={bulk.setPlannedDate}
                onSetPlannedTime={bulk.setPlannedTime}
                onAddTags={bulk.addTags}
                onDelete={bulk.remove}
                productOptions={productNames}
                driverOptions={DRIVER_OPTIONS}
                tagOptions={TAG_OPTIONS}
                selectedOrders={selectedOrders}
                unselectedOrders={unselectedOrders}
              />
            </div>
          </div>
        )}
      </div>

      <OrderSheet
        order={rows.find((r) => r.id === openOrderId) ?? null}
        mode={creating ? "create" : "edit"}
        open={creating || openOrderId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setOpenOrderId(null);
        }}
        onSave={saveOrder}
        onCreate={createOrder}
        customers={customers}
        shipTos={shipTos}
        productNames={productNames}
      />

      {/* Pagination belongs to the paged table. The board view has no paged
          list, so a "Showing 1-25 of 57" footer under it would be describing
          something that isn't on screen. */}
      {/* No top hairline: the table's own last-row rule already closes the list,
          so a second line here read as a stray divider. */}
      <div className={cn("mt-4 shrink-0", view === "board" && "hidden")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="order"
            total={g.total}
            unit="gal"
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

/**
 * Placeholder for destinations and modules this pass hasn't built.
 *
 * It names WHAT is built instead, because "not built yet" on its own leaves a
 * reader unable to tell an unfinished screen from a broken one.
 */
function NotBuiltYet({ label, detail }: { label: string; detail: string }) {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Construction />
        </EmptyMedia>
        <EmptyTitle>{label}</EmptyTitle>
        <EmptyDescription>{detail}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** A module with no destinations at all — no rail, so no screen either. */
function ModuleNotBuilt({ label }: { label: string }) {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LayoutGrid />
        </EmptyMedia>
        <EmptyTitle>{label}</EmptyTitle>
        <EmptyDescription>
          This module has no screens yet. Its navigation hasn't been specified, and
          guessing at it would put destinations here that don't exist. Switch to
          Sales or 3PL from the module switcher at the top of the rail.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function UnifiedView() {
  const [moduleKey, setModuleKey] = React.useState(readStoredModule);
  /* Two nav levels, two pieces of state. `navKey` is the RAIL selection
     (Tier-1); `subKey` is the DRAWER selection (Tier-2) and is null for a rail
     item that has no second level — which is every Sales destination. The
     screen on show is `subKey ?? navKey`. */
  const [navKey, setNavKey] = React.useState(
    () => MODULE_NAV[readStoredModule()]?.[0]?.key ?? ""
  );
  const [subKey, setSubKey] = React.useState<string | null>(() =>
    firstSubKey(MODULE_NAV[readStoredModule()]?.[0]?.key ?? "")
  );

  /** Selecting a rail item lands on the first destination inside its drawer. */
  const goToArea = (key: string) => {
    setNavKey(key);
    setSubKey(firstSubKey(key));
  };
  const [searchOpen, setSearchOpen] = React.useState(false);
  /* The signed-in account lives here, above both the top bar and the Profile
     page, so editing it on Profile updates the chrome without a round trip. */
  const [user, setUser] = React.useState<AccountUser>({
    name: "Pavan Shetty",
    email: "pavanshetty@fleetpanda.com",
    fallback: "PS",
  });
  /**
   * The record a global-search hit asked for. Passed to the destination screen
   * as `focus`, which opens that record's sheet on arrival. Keyed by an
   * incrementing nonce so choosing the SAME record twice still re-opens it —
   * without it the prop would not change and nothing would happen.
   */
  const [focus, setFocus] = React.useState<{ id: string; n: number } | null>(null);

  /* Account pages are module-independent: they answer before the module
     nav is consulted, and while one is open no rail item is current. */
  const accountTitle = ACCOUNT_PAGES[navKey];
  const navItems = MODULE_NAV[moduleKey] ?? [];
  const active = navItems.find((i) => i.key === navKey) ?? navItems[0] ?? null;
  /* Tier-2 exists only where the active area declares one. Where it does not,
     no drawer is rendered and the content layer takes the full width. */
  const subGroups = accountTitle ? undefined : SUB_NAV[navKey];
  const subItems = subGroups?.flatMap((g) => g.items) ?? [];
  const activeSub = subItems.find((i) => i.key === subKey) ?? null;
  /** The screen is the drawer's selection when there is one, else the rail's. */
  const screenKey = subKey ?? navKey;

  /**
   * Switching module lands on that module's FIRST destination. Keeping the old
   * `navKey` would leave the rail with nothing selected, because destination keys
   * are unique per module — there is no equivalent destination to carry over.
   */
  const switchModule = (key: string) => {
    setModuleKey(key);
    goToArea(MODULE_NAV[key]?.[0]?.key ?? "");
    try {
      localStorage.setItem(MODULE_STORAGE_KEY, key);
    } catch {
      // Storage blocked (private window, file:// in some browsers). The switch
      // still works for this session; only the memory of it is lost.
    }
    // A record focused in the module being left must not re-open in the one
    // being entered.
    setFocus(null);
  };

  /** A search hit is a (module, destination, record) address. */
  const goTo = (m: string, nav: string, recordId: string | null) => {
    setModuleKey(m);
    /* A search hit names a DESTINATION, which may live one level down. Resolve
       it to its rail item so the rail and the drawer agree about where we are. */
    const owner = Object.keys(SUB_NAV).find((areaKey) =>
      SUB_NAV[areaKey].some((g) => g.items.some((i) => i.key === nav))
    );
    if (owner) {
      setNavKey(owner);
      setSubKey(nav);
    } else {
      goToArea(nav);
    }
    try {
      localStorage.setItem(MODULE_STORAGE_KEY, m);
    } catch {
      /* see switchModule */
    }
    setFocus(recordId ? { id: recordId, n: Date.now() } : null);
  };

  const screen = (() => {
    if (navKey === "profile") return <ProfileScreen user={user} onSave={setUser} />;
    if (navKey === "settings") return <SettingsScreen />;
    if (navItems.length === 0) {
      return <ModuleNotBuilt label={`${MODULE_LABEL[moduleKey] ?? moduleKey} module`} />;
    }
    switch (screenKey) {
      case "fuel-orders":
        return <FuelOrdersScreen focus={focus} />;
      case "asset-orders":
        return <AssetOrdersScreen focus={focus} />;
      case "customers":
        return <CustomersScreen focus={focus} />;
      case "assets":
        return <AssetsScreen focus={focus} />;
      case "3pl-delivery-orders":
        return <BrokerOrdersScreen focus={focus} />;
      case "3pl-vendors":
        return (
          <NotBuiltYet
            label="Vendors"
            detail="Not built yet. The vendor list, invitations and the per-vendor email toggle are specified but unbuilt — Orders is the screen in this pass. Delivery partners are pickable inside an order's sheet."
          />
        );
      case "3pl-customers":
        return (
          <NotBuiltYet
            label="Customers"
            detail="Not built yet. 3PL customers sync from Dispatch, so this list would show the same accounts as the Sales module's Customers screen, plus the credit fields the credit-hold rule reads."
          />
        );
      case "3pl-recurring-orders":
        return (
          <NotBuiltYet
            label="Recurring Orders"
            detail="Not built yet. Recurring orders are currently a TAB on Delivery Orders rather than a destination — see the open question in the 3PL README before building this as a separate list."
          />
        );
      case "3pl-products":
        return (
          <NotBuiltYet
            label="Products"
            detail="Not built yet. The fuel and lubricant products an order's lines are drawn from — the Sales module already carries the product names, so this list would be their record view."
          />
        );
      case "3pl-rental-assets":
        return (
          <NotBuiltYet
            label="Rental Assets"
            detail="Not built yet. The organisation's rentable assets, as listed under the 3PL Settings — Delivery Orders is the screen in this pass."
          />
        );
      default:
        return <NotBuiltYet label={active?.label ?? "Screen"} detail="Not built yet." />;
    }
  })();

  return (
    <TooltipProvider>
      <AppShell
        title={accountTitle ?? activeSub?.label ?? active?.label ?? MODULE_LABEL[moduleKey] ?? "FleetPanda"}
        /* The preset-view row owns the only hairline under the header. */
        headerDivider={false}
        topBar={
          <TopBar
            user={user}
            unread={3}
            searchPlaceholder="Search everything"
            onSearchActivate={() => setSearchOpen(true)}
            onProfile={() => setNavKey("profile")}
            onSettings={() => setNavKey("settings")}
          />
        }
        rail={
          <NavRail
            groups={[{ items: navItems }]}
            activeKey={active?.key}
            onNavigate={goToArea}
            activeModule={moduleKey}
            onModuleChange={switchModule}
          />
        }
        /* TIER 2 — rendered only where the active rail item declares a second
           nav level. Sales has none, so its content layer still takes the full
           width; 3PL's areas each have one. The panel classes are the shell
           rule's, verbatim, and are the same ones the DS gallery uses. */
        sidebar={
          subGroups && active ? (
            <NavigationDrawer
              className="rounded-lg bg-sidebar shadow-fp-surface"
              brand={{
                name: active.label,
                icon: active.icon,
                iconClassName: "bg-sidebar-primary",
              }}
              groups={subGroups}
              activeKey={subKey ?? undefined}
              onNavigate={setSubKey}
            />
          ) : undefined
        }
        /* Export moved onto the preset-view row next to Create Order, so the
           page header carries only the theme toggle. */
        headerAction={<ThemeToggle />}
      >
        {screen}
        <GlobalSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onNavigate={goTo}
        />
      </AppShell>
    </TooltipProvider>
  );
}
