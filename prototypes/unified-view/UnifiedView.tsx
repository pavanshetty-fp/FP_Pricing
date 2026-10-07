import * as React from "react";
import {
  AgreementsScreen,
  ComplianceScreen,
  MaintenanceScreen,
  PartsScreen,
  PerformanceScreen,
  PriceBookScreen,
} from "./service/PlatformScreens";
import { useSavedViews } from "./useSavedViews";
import { ThreePLDashboard, type ThreePLDrill } from "./threepl/ThreePLDashboard";
import { SalesDashboard, type SalesDrill } from "./SalesDashboard";
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
  Clock,
  Handshake,
  FileSignature,
  DollarSign,
  Wrench,
  HardHat,
  Cog,
  Smartphone,
  BookOpen,
  Package,
  CalendarClock,
  ShieldCheck,
  Gauge,
  SlidersHorizontal,
  LayoutDashboard,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { NavGroup, NavItem } from "@/components/navigation-drawer";
import { TopBar } from "@/components/top-bar";
import { NavRail, NavigationDrawer } from "@/components/navigation-drawer";
import { ModuleSidebar } from "./ModuleSidebar";
import { ThemeToggle } from "@/components/theme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ServiceWorkScreen } from "./service/ServiceWorkScreen";
import { TechniciansScreen } from "./service/TechniciansScreen";
import { ServiceSettingsScreen } from "./service/ServiceSettingsScreen";
import { TechnicianMobile } from "./service/TechnicianMobile";
import { FuelOrdersBulkBar } from "./FuelOrdersBulkBar";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BannerCallout, bannerSoftAction } from "@/components/ui/banner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ColumnFilterChips,
  ColumnSearchChip,
  FuelOrdersToolbar,
  type FuelOrdersView,
} from "./FuelOrdersToolbar";
import { FuelOrdersTable, STATUS_TONE, fuelOrderColumnText } from "./FuelOrdersTable";
import { OrderMapView } from "./OrderMapView";
import { AssetOrdersScreen } from "./AssetOrdersScreen";
import { CustomersScreen } from "./CustomersScreen";
import { AssetsScreen } from "./AssetsScreen";
import {
  BrokerOrdersScreen,
  RecurringOrdersScreen,
  RecurringRulesScreen,
  RecurringProgramsScreen,
  BrokerVendorsScreen,
  BrokerCustomersScreen,
  BrokerProductsScreen,
  BrokerRentalAssetsScreen,
  useDirectoryData,
  type DirectoryNavigator,
} from "./threepl";
import { ProfileScreen } from "./ProfileScreen";
import { SettingsScreen } from "./SettingsScreen";
import { GlobalSearch } from "./GlobalSearch";
import { OrderSheet, type OrderDraft } from "./OrderSheet";
import {
  FuelOrdersViewBar,
  viewStateKey,
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
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { FUEL_ORDER_GROUP_DIMS } from "./groupDims";
import { useLoggedRows } from "./activity";
import { diffFuelOrder } from "./salesActivity";

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
  /* First, so it is where Sales opens (Pavan, 2026-10-05). */
  { key: "sales-dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
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
  /* THE MODULE'S OVERVIEW, FIRST (Pavan, 2026-10-05). The module OPENS on
     Orders for now (2026-10-06) — see `MODULE_LANDING`. */
  { key: "3pl-dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  { key: "3pl-orders", label: "Orders", icon: <ClipboardList /> },
  { key: "3pl-directory", label: "Directory", icon: <BookUser /> },
];

/**
 * SERVICE WORK — TIER 1. Two areas, and no second level: Work Orders is a
 * destination in its own right and so is the technician list, so the content
 * layer takes the full width in both (Sales works the same way).
 */
const SERVICE_NAV: NavItem[] = [
  { key: "service-work-orders", label: "Service Orders", icon: <Wrench /> },
  { key: "service-technicians", label: "Technicians", icon: <HardHat /> },
  /* A SEPARATE PRODUCT, REACHED FROM HERE ONLY BECAUSE THIS IS A PROTOTYPE
     (Pavan, 2026-09-23). The technician's app is a phone app a different
     person signs into; it is on the rail so it can be SHOWN, not because
     dispatch would ever open it. */
  { key: "service-tech-app", label: "Technician App", icon: <Smartphone /> },
  /* THE PLATFORM'S REFERENCE SCREENS (Pavan and Deepika, 2026-09-24), after
     Anirudh's unified design — what orders price from, the shelf, the plans
     customers are on, the recurring work and the certificates, and how the
     team is doing. */
  { key: "service-price-book", label: "Price Book", icon: <BookOpen /> },
  { key: "service-parts", label: "Parts", icon: <Package /> },
  { key: "service-agreements", label: "Agreements", icon: <FileSignature /> },
  { key: "service-maintenance", label: "Maintenance", icon: <CalendarClock /> },
  { key: "service-compliance", label: "Compliance", icon: <ShieldCheck /> },
  { key: "service-performance", label: "Performance", icon: <Gauge /> },
  /* THE MODULE'S OWN SWITCH POINTS, not the app's Settings page — that one
     will govern several modules and is held back pending it. These change what
     the flow IS, so they belong where the flow is. */
  { key: "service-settings", label: "Service Settings", icon: <SlidersHorizontal /> },
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
  /* TWO FLOWS, SIDE BY SIDE (Pavan, 2026-09-25) — the same orders, run with
     no technician app (the dispatcher records everything) or with one. Each
     entry fixes the technician-app setting for the board and sheet under it. */
  "service-work-orders": [
    {
      label: "Flows",
      items: [
        { key: "service-orders-dispatch", label: "No Technician App", icon: <ClipboardList /> },
        { key: "service-orders-app", label: "With Technician App", icon: <Smartphone /> },
      ],
    },
  ],
};

/**
 * WHICH NAVIGATION THE APP WEARS (Pavan, 2026-10-06).
 *
 *   "sidebar"    — one panel: every module a row, the open module's pages
 *                  grouped under it, collapsible to an icon rail
 *                  (`ModuleSidebar`, after the Lovable reference). CURRENT.
 *   "two-layer"  — the Tier-1 rail with the module switcher, plus the Tier-2
 *                  drawer for areas with sub-pages (`NavRail` +
 *                  `NavigationDrawer`). KEPT, untouched.
 *
 * "Bring in the two-layer navigation drawers" = set this to "two-layer".
 */
const NAV_STYLE: "sidebar" | "two-layer" = "sidebar";

/** First destination inside an area's drawer, for landing on arrival. */
const firstSubKey = (areaKey: string): string | null =>
  SUB_NAV[areaKey]?.flatMap((g) => g.items)[0]?.key ?? null;

/**
 * THE APP'S OWN MODULE LIST, not the DS's sample one.
 *
 * `ModuleSwitcher` used to read a module-level constant inside the DS, so the
 * only way to add a module this product has was to edit the design system's
 * data file — which would have put a FleetPanda module in the DS gallery's
 * demo. It takes a `modules` prop now (defaulting to the sample list, which is
 * all the gallery needs) and the application owns its own.
 */
const APP_MODULES = [
  { key: "sales", name: "Sales", icon: <Handshake /> },
  { key: "3pl", name: "3PL", icon: <Truck /> },
  /* NOT A WRENCH — the module switcher and the Service Orders rail item were
     both showing one, so the app said the same thing twice in two places a
     centimetre apart (Pavan, 2026-09-23). The module is the whole business of
     keeping equipment working; the rail item inside it is the orders. */
  { key: "service", name: "Service Work", icon: <Cog /> },
  { key: "lease", name: "Lease", icon: <FileSignature /> },
  { key: "pricing", name: "Pricing", icon: <DollarSign /> },
];

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
  service: SERVICE_NAV,
  lease: [],
  pricing: [],
};

/**
 * WHERE A MODULE OPENS, when it is not its first rail item. 3PL opens on
 * Orders for now (Pavan, 2026-10-06), with Dashboard still first in the rail.
 */
const MODULE_LANDING: Record<string, string> = { "3pl": "3pl-orders" };
const landingKey = (moduleKey: string): string =>
  MODULE_LANDING[moduleKey] ?? MODULE_NAV[moduleKey]?.[0]?.key ?? "";

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

const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  APP_MODULES.map((m) => [m.key, m.name])
);

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

/** The shared view state plus the filter row's boxes, by column key. Optional
 *  so a view saved before the row still applies. */
type FuelViewState = ViewState & { colFilters?: Record<string, string> };

const fuelViewStateKey = (s: FuelViewState) =>
  JSON.stringify([
    viewStateKey(s),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    Object.entries(s.colFilters ?? {})
      .filter(([, v]) => v.trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
  ]);

/** Columns the column-visibility menu can toggle (everything with a label). */
const TOGGLE_COLUMNS = FUEL_ORDER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/**
 * How long "remind me later" puts the alert away for.
 *
 * Hours, not a date picker: the question a dispatcher is answering is "when do
 * I next want to look at this", and the honest answers are all inside one
 * shift. "Tomorrow" is the one that leaves the shift, so it is last and it is
 * the same clock time rather than a fixed hour — snoozing at 6am and snoozing
 * at 6pm are different asks.
 */
const HOUR_MS = 60 * 60 * 1000;
const SNOOZE_OPTIONS: { label: string; ms: number }[] = [
  { label: "1 hour", ms: HOUR_MS },
  { label: "2 hours", ms: 2 * HOUR_MS },
  { label: "4 hours", ms: 4 * HOUR_MS },
  { label: "8 hours", ms: 8 * HOUR_MS },
  { label: "Tomorrow, same time", ms: 24 * HOUR_MS },
];

/** Fuel Orders list — toolbar + table + pagination, inside the content layer. */
function FuelOrdersScreen({
  focus,
  drill = null,
}: {
  focus?: { id: string; n: number } | null;
  /** Arrived from the Sales dashboard — open on that day, narrowed by these
   *  column boxes. A nonce so the same press twice still lands. */
  drill?: (SalesDrill & { n: number }) | null;
}) {
  /* THE SETTER WRITES THE CHANGE LOG (sales, 2026-09-23) — see activity.tsx. */
  const [rows, setRows] = useLoggedRows(FUEL_ORDERS, diffFuelOrder);
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
  /* Empty = the table's declared order. The table fills in anything a saved
     order does not mention, so a stale view never costs a column. */
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [date, setDate] = React.useState(() => startOfDay(new Date()));
  // Search-by-column and the view switch — both part of the DS toolbar unit.
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<FuelOrdersView>("table");
  /** One box per column, under the headers — see `FuelOrdersTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );
  React.useEffect(() => {
    if (!drill) return;
    setDate(startOfDay(drill.date));
    setSearch("");
    setColQuery("");
    setView("table");
    setColFilters(drill.colFilters);
    setColFiltersOpen(Object.keys(drill.colFilters).length > 0);
    setPage(1);
  }, [drill]);

  const defaultState: FuelViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      columnOrder: [],
      columnWidths: {},
      pageSize: 25,
      dateKey: dateKeyOf(startOfDay(new Date())),
      colScope: "customer",
      colQuery: "",
      groupBy: [],
      colFilters: {},
    }),
    []
  );

  const applyState = (st: FuelViewState) => {
    setSearch(st.search);
    setSort(
      st.sortKey && st.sortDir
        ? { key: st.sortKey as FuelOrderColumnKey, dir: st.sortDir }
        : null
    );
    setHiddenColumns(new Set(st.hidden as FuelOrderColumnKey[]));
    setColumnOrder(st.columnOrder ?? []);
    setColumnWidths(st.columnWidths ?? {});
    setPageSize(st.pageSize);
    const [y, m, d] = st.dateKey.split("-").map(Number);
    setDate(new Date(y, m - 1, d));
    setColScope(st.colScope);
    setColQuery(st.colQuery);
    const filters = st.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    g.setGrouping(st.groupBy ?? []);
    setPage(1);
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
          (!cq || matchesFuelOrderIn(r, cq, colScope)) &&
          /* AND-ed, and each box matches the text its own column PRINTS —
             see `fuelOrderColumnText`. */
          activeColFilters.every(([key, value]) =>
            fuelOrderColumnText(r, key as FuelOrderColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [onDate, query, cq, colScope, activeColFilters]
  );
  const sorted = React.useMemo(() => sortFuelOrders(filtered, sort), [filtered, sort]);

  /*
    THE ONE THING ON THIS PAGE THAT CANNOT WAIT. An order planned for the day
    with nobody on it is not a row to notice among fifty-six others — it is the
    reason somebody opened the screen. The banner is derived, never seeded: it
    counts what is actually there on the chosen date, so it cannot go on saying
    two after a driver is put on one of them, and it is absent on a day that has
    none.

    NOT A FACET. The filter panel answers "show me the unassigned ones" when you
    already suspect there are some; this answers "there are some" when you do
    not.
  */
  const unassigned = React.useMemo(
    () => onDate.filter((r) => r.status === "Unassigned"),
    [onDate]
  );
  /*
    TWO WAYS TO PUT IT AWAY, AND THEY ARE NOT THE SAME PROMISE. The ✕ says "I
    have seen this" — gone for this date, full stop. Snooze says "not now",
    which is only honest if it actually comes back, so it is a deadline rather
    than a flag: the banner is hidden while the clock has not reached it and a
    timer brings it back at the minute it does. Both reset on a date change,
    because the next day is a different set of orders making a different claim.
  */
  const [alertDismissed, setAlertDismissed] = React.useState(false);
  const [snoozedUntil, setSnoozedUntil] = React.useState<number | null>(null);
  React.useEffect(() => {
    setAlertDismissed(false);
    setSnoozedUntil(null);
  }, [dateKey]);
  React.useEffect(() => {
    if (snoozedUntil == null) return;
    const ms = snoozedUntil - Date.now();
    if (ms <= 0) {
      setSnoozedUntil(null);
      return;
    }
    const t = window.setTimeout(() => setSnoozedUntil(null), ms);
    return () => window.clearTimeout(t);
  }, [snoozedUntil]);
  const alertVisible =
    unassigned.length > 0 && !alertDismissed && snoozedUntil == null;

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
  const current: FuelViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hiddenColumns],
    columnOrder,
    columnWidths,
    pageSize,
    dateKey: dateKeyOf(date),
    colScope,
    colQuery,
    groupBy: g.groupBy,
    colFilters,
  };

  /* THE SHARED SAVED-VIEWS HOOK (2026-09-24) — this screen had its own copy,
     so it missed the rule every other list follows: a view keeps its unsaved
     changes when you leave it, and pressing the tab you are on reverts it. */
  const savedViews = useSavedViews({
    current,
    defaultState,
    keyOf: fuelViewStateKey,
    apply: applyState,
  });


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
        {...savedViews}
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
          /* THE ROW, NOT THE POPOVER — the 3PL behaviour. Table view only:
             board and map have no columns to type under. */
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
          /* Same switch as 3PL, same order: table, board, map. */
          mapView
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
        <ColumnFilterChips
          columns={TOGGLE_COLUMNS}
          filters={activeColFilters}
          onClear={(key) => {
            setColFilters((prev) => ({ ...prev, [key]: "" }));
            setPage(1);
          }}
        />
      </div>

      {alertVisible && (
        <BannerCallout
          status="info"
          variant="soft"
          className="mt-3 shrink-0"
          title={`${unassigned.length} ${unassigned.length === 1 ? "order" : "orders"} waiting on a driver`}
          action={
            <>
              {/* SHOW ORDERS IS THE FILTER, not a jump to the first one. The
                  alert names a SET, so the action has to leave the reader
                  looking at that set — the banner IS a quick filter. */}
              <Button
                variant="outline"
                size="sm"
                className={bannerSoftAction}
                onClick={() => {
                  setColScope("status");
                  setColQuery("Unassigned");
                  setPage(1);
                }}
              >
                Show orders
              </Button>
              {/* SNOOZE IS A CHOICE OF DEADLINE, not a second dismiss. The
                  useful question is "how long", and a menu is the cheapest
                  place to ask it — one click to open, one to answer. */}
              <DropdownMenu>
                {/* TOOLTIP OUTSIDE, MENU TRIGGER INSIDE. Both claim the
                    button through `asChild`, and only this order composes:
                    the tooltip's props land on the menu trigger, which is
                    itself `asChild` and forwards both sets to the Button.
                    Inverted, the menu trigger's props land on `<Tooltip>` —
                    a provider, not a DOM node — and are silently dropped. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remind me later"
                      >
                        <Clock />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Remind me later</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  {SNOOZE_OPTIONS.map((o) => (
                    <DropdownMenuItem
                      key={o.label}
                      onSelect={() => setSnoozedUntil(Date.now() + o.ms)}
                    >
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
          onDismiss={() => setAlertDismissed(true)}
        />
      )}

      {/* Table region — `relative` anchors the floating bulk-action bar. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {view === "map" ? (
            /* THE MAP READS THE SAME LIST THE TABLE DOES — `sorted`, so the
               date, the search and every filter apply to it. A map that quietly
               showed everything would be answering a different question from
               the one the toolbar above it says is being asked. */
            <OrderMapView
              orders={sorted.map((r) => ({
                id: r.id,
                orderNo: r.orderNo,
                site: r.customer.description,
                subtitle: r.customer.title,
                status: r.status,
                tone: STATUS_TONE[r.status],
              }))}
              onOpenOrder={setOpenOrderId}
            />
          ) : view === "board" ? (
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
          ) : /* THE ROW STAYS WHILE IT IS OPEN — an empty result would
                 otherwise take the boxes being typed in away with the table. */
            sorted.length === 0 && !colFiltersOpen ? (
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
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              onOpenOrder={(row) => setOpenOrderId(row.id)}
              showColumnFilters={colFiltersOpen}
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
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
      <div className={cn("mt-4 shrink-0", view !== "table" && "hidden")}>
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

/**
 * DEEP LINKS INTO THE DIRECTORY.
 *
 * The four Directory lists put their state in the address bar, and a URL that
 * restores the filters but drops the SCREEN is a link nobody can share — it
 * lands on Orders with a query string that means nothing there. So the shell
 * reads `entity` on boot and starts where the address says.
 *
 * Read once, at startup only. After that the screens own the URL and reading
 * it again would fight them.
 */
const ENTITY_DESTINATION: Record<string, string> = {
  customers: "3pl-customers",
  vendors: "3pl-vendors",
  products: "3pl-products",
  assets: "3pl-rental-assets",
};

function readEntityBoot(): { module: string; nav: string; sub: string; record: string | null } | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const dest = ENTITY_DESTINATION[p.get("entity") ?? ""];
  if (!dest) return null;
  return { module: "3pl", nav: "3pl-directory", sub: dest, record: p.get("record") };
}

/**
 * `only` LOCKS THE APP TO ONE MODULE (Pavan, 2026-09-25) — the standalone
 * Service Work build (`service.html`, `npm run build:service`). The switcher
 * lists just that module, and the stored module is ignored.
 */
export function UnifiedView({ only }: { only?: string } = {}) {
  const boot = React.useRef(only ? null : readEntityBoot()).current;
  const startModule = React.useRef(only ?? boot?.module ?? readStoredModule()).current;
  const [moduleKey, setModuleKey] = React.useState(startModule);
  /* Two nav levels, two pieces of state. `navKey` is the RAIL selection
     (Tier-1); `subKey` is the DRAWER selection (Tier-2) and is null for a rail
     item that has no second level — which is every Sales destination. The
     screen on show is `subKey ?? navKey`. */
  /*
    WHICH RECURRING ORDERS SCREEN IS SHOWING.

    Two versions of the same destination are built side by side so the
    difference between them can be SEEN rather than argued about:

      V1  the schedule is a RULE that is not an order, and every delivery —
          the first one included — is generated by it.
      V2  the recurring order IS an order: it carries the schedule and it is
          also delivery one, and everything after it is a child of it. This is
          the model the product has today.

    IT LIVES HERE, NOT IN THE SCREEN, because the switch is rendered in the
    PAGE HEADER beside the title. A comparison between two whole screens is a
    fact about which screen you are looking at, and the header is where the
    app says that.

    V1.1 IS THE ONE UNDER DESIGN (Pavan, 2026-09-23) — the rule-based
    direction — so it is what the screen opens on. V1 and V2 are kept, but
    under ARCHIVE: reachable for reference, and out of the way of the version
    being worked on. Recurring Orders is V1.1 with no label — it is simply
    what the screen is. V1 and V2 are TUCKED AWAY (Pavan, 2026-09-23): a
    faint "Archive" link in the screen's footer opens them, with a V1 | V2
    switch and a way back by the title. Not in the navigation — they are
    kept to refer to until they are kept or deleted for good.
  */
const [archiveVersion, setArchiveVersion] = React.useState<"v1" | "v2">("v1");
  const [recurringArchive, setRecurringArchive] = React.useState(false);

  /* CREATE ON RECURRING ORDERS SENDS YOU TO DELIVERY ORDERS, because that is
     where a recurring order is actually made: tick Recurring on the order and
     give it a frequency. A second create form on the recurring screen would be
     a second way to make one record, and the two would drift. A nonce rather
     than a flag — see `startCreate`. */
  const [startCreate, setStartCreate] = React.useState<number | null>(null);
  /* A DASHBOARD PRESS — which list, narrowed how. A nonce so the same press
     twice still lands. */
  const [drill3pl, setDrill3pl] = React.useState<(ThreePLDrill & { n: number }) | null>(null);
  const [drillSales, setDrillSales] = React.useState<(SalesDrill & { n: number }) | null>(null);
  /** Where the Create CTA was pressed, so closing the form can go back. */
  const [returnTo, setReturnTo] = React.useState<string | null>(null);

  const [navKey, setNavKey] = React.useState(
    () => boot?.nav ?? landingKey(startModule)
  );
  const [subKey, setSubKey] = React.useState<string | null>(
    () => boot?.sub ?? firstSubKey(landingKey(startModule))
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
  /* Leaving Recurring closes its archive, so coming back opens the live screen. */
  React.useEffect(() => {
    if (screenKey !== "3pl-recurring-orders") setRecurringArchive(false);
  }, [screenKey]);

  /**
   * Switching module lands on that module's FIRST destination. Keeping the old
   * `navKey` would leave the rail with nothing selected, because destination keys
   * are unique per module — there is no equivalent destination to carry over.
   */
  const switchModule = (key: string) => {
    /* A LOCKED BUILD STAYS IN ITS MODULE. */
    if (only && key !== only) return;
    setModuleKey(key);
    goToArea(landingKey(key));
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

  /*
    THE DIRECTORY'S RECORDS, held here rather than inside the four screens.

    An edit made on Vendors has to be visible from a Product's "who can fulfil
    this" list, and a record page has to be able to open a record belonging to
    another entity. Both need one owner above all four screens, and this is the
    only component that sits there.
  */
  const directory = useDirectoryData();
  /** The record another entity's page asked us to open, and where it lives. */
  const [dirFocus, setDirFocus] = React.useState<{ nav: string; id: string } | null>(
    boot?.record ? { nav: boot.sub, id: boot.record } : null
  );
  const openInDirectory = React.useCallback(
    (nav: string, id: string) => {
      setNavKey("3pl-directory");
      setSubKey(nav);
      setDirFocus({ nav, id });
    },
    []
  );
  const directoryNav: DirectoryNavigator = React.useMemo(
    () => ({
      openCustomer: (id) => openInDirectory("3pl-customers", id),
      openVendor: (id) => openInDirectory("3pl-vendors", id),
      openProduct: (id) => openInDirectory("3pl-products", id),
      openAsset: (id) => openInDirectory("3pl-rental-assets", id),
    }),
    [openInDirectory]
  );
  /*
    THE DIRECTORY LIST'S TOTAL, IN THE PAGE HEADER.

    It is a fact about the whole list — "these 150 accounts owe $9.7m" — and
    under the footer it read as a property of page 1 of 5, at the very bottom
    of a screen somebody has to scroll to reach. Beside the title it is the
    first thing on the page, which is where a headline number belongs. It
    follows the FILTERED list, so narrowing the rows narrows the number with
    them.
  */
  const [listTotal, setListTotal] = React.useState<string | null>(null);
  const dirProps = (nav: string) => ({
    data: directory,
    navigate: directoryNav,
    focusId: dirFocus?.nav === nav ? dirFocus.id : null,
    onFocusHandled: () => setDirFocus(null),
    onTotalChange: setListTotal,
  });

  /** A search hit is a (module, destination, record) address. */
  const goTo = (m: string, nav: string, recordId: string | null) => {
    /* A search hit in another module goes nowhere in a locked build. */
    if (only && m !== only) return;
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

  const goCreateOrder = () => {
    /* THE DESTINATION IS THE DRAWER'S, NOT THE RAIL'S. `navKey` names the rail
       item — "3pl-orders" — and `subKey` names the screen inside it. Setting
       the rail key to a drawer key left both wrong: no sub selected, so the
       header fell back to the area's own name and the screen switch matched
       nothing. */
    setReturnTo(subKey);
    setNavKey("3pl-orders");
    setSubKey("3pl-delivery-orders");
    setStartCreate(Date.now());
  };

  const screen = (() => {
    if (navKey === "profile") return <ProfileScreen user={user} onSave={setUser} />;
    if (navKey === "settings") return <SettingsScreen />;
    if (navItems.length === 0) {
      return <ModuleNotBuilt label={`${MODULE_LABEL[moduleKey] ?? moduleKey} module`} />;
    }
    switch (screenKey) {
      case "sales-dashboard":
        return (
          <SalesDashboard
            onDrill={(d) => {
              goToArea("fuel-orders");
              setDrillSales({ ...d, n: Date.now() });
            }}
            onOpenOrder={(id, date) => {
              goToArea("fuel-orders");
              setDrillSales({ date, colFilters: {}, n: Date.now() });
              setFocus({ id, n: Date.now() });
            }}
          />
        );
      case "fuel-orders":
        return <FuelOrdersScreen focus={focus} drill={drillSales} />;
      case "asset-orders":
        return <AssetOrdersScreen focus={focus} />;
      case "customers":
        return <CustomersScreen focus={focus} />;
      case "assets":
        return <AssetsScreen focus={focus} />;
      case "3pl-dashboard":
        return (
          <ThreePLDashboard
            onDrill={(d) => {
              setNavKey("3pl-orders");
              setSubKey("3pl-delivery-orders");
              setDrill3pl({ ...d, n: Date.now() });
            }}
            onOpenOrder={(id) => {
              setNavKey("3pl-orders");
              setSubKey("3pl-delivery-orders");
              setFocus({ id, n: Date.now() });
            }}
          />
        );
      case "3pl-delivery-orders":
        return (
          <BrokerOrdersScreen
            focus={focus}
            drill={drill3pl}
            startCreate={startCreate}
            onCreateClose={() => {
              if (!returnTo) return;
              setSubKey(returnTo);
              setReturnTo(null);
              setStartCreate(null);
            }}
          />
        );
      case "service-work-orders":
      case "service-orders-dispatch":
        return <ServiceWorkScreen key="dispatch" flow="dispatch" />;
      case "service-orders-app":
        return <ServiceWorkScreen key="app" flow="app" />;
      case "service-technicians":
        return <TechniciansScreen />;
      case "service-tech-app":
        return <TechnicianMobile />;
      case "service-settings":
        return <ServiceSettingsScreen />;
      case "service-price-book":
        return <PriceBookScreen />;
      case "service-parts":
        return <PartsScreen />;
      case "service-agreements":
        return <AgreementsScreen />;
      case "service-maintenance":
        return <MaintenanceScreen />;
      case "service-compliance":
        return <ComplianceScreen />;
      case "service-performance":
        return <PerformanceScreen />;
      case "3pl-vendors":
        return <BrokerVendorsScreen {...dirProps("3pl-vendors")} />;
      case "3pl-customers":
        return <BrokerCustomersScreen {...dirProps("3pl-customers")} />;
      /* V2 — THE PARENT/CHILD MODEL, one of two versions built side by side.
         The recurring order IS an order: it carries the schedule and it is
         also delivery one, and everything after it is a child of it. V1 (the
         schedule as a RULE that is not an order) is not built yet. */
      case "3pl-recurring-orders":
        if (!recurringArchive)
          return <RecurringProgramsScreen onOpenArchive={() => setRecurringArchive(true)} />;
        return archiveVersion === "v1" ? (
          <RecurringRulesScreen onCreateRule={goCreateOrder} />
        ) : (
          <RecurringOrdersScreen onCreateRule={goCreateOrder} />
        );
      case "3pl-products":
        return <BrokerProductsScreen {...dirProps("3pl-products")} />;
      case "3pl-rental-assets":
        return <BrokerRentalAssetsScreen {...dirProps("3pl-rental-assets")} />;
      default:
        return <NotBuiltYet label={active?.label ?? "Screen"} detail="Not built yet." />;
    }
  })();

  return (
    <TooltipProvider>
      <AppShell
        title={
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-xl font-semibold leading-none text-foreground">
              {accountTitle ?? activeSub?.label ?? active?.label ?? MODULE_LABEL[moduleKey] ?? "FleetPanda"}
            </h1>
            {listTotal && (
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {listTotal}
              </span>
            )}
            {/* THE VERSION SWITCH SITS WITH THE TITLE, and only on the one
                screen that has two versions. It is not a filter and not a
                view of the same data — it changes what the screen IS, so it
                belongs to the screen's name rather than to its toolbar. */}
            {screenKey === "3pl-recurring-orders" && recurringArchive && (
              <span className="flex shrink-0 items-center gap-2 self-center">
                <span className="text-sm text-muted-foreground">Archive</span>
                <ToggleGroup
                type="single"
                size="sm"
                value={archiveVersion}
                onValueChange={(v) => v && setArchiveVersion(v as "v1" | "v2")}
              >
                <ToggleGroupItem value="v1" aria-label="Version 1 — rule based, one site">
                  V1
                </ToggleGroupItem>
                <ToggleGroupItem value="v2" aria-label="Version 2 — parent and child orders">
                  V2
                </ToggleGroupItem>
              </ToggleGroup>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setRecurringArchive(false)}
                >
                  Close archive
                </Button>
              </span>
            )}
          </div>
        }
        /* The preset-view row owns the only hairline under the header. */
        headerDivider={false}
        /* THE SHELL GROUND (Pavan, 2026-10-06, after the AirOps reference) —
           everything but the content layer, the top bar included. */
        className="bg-fp-shell-ground"
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
          NAV_STYLE === "sidebar" ? (
            <ModuleSidebar
              modules={only ? APP_MODULES.filter((m) => m.key === only) : APP_MODULES}
              moduleNav={MODULE_NAV}
              subNav={SUB_NAV}
              activeModule={moduleKey}
              activeArea={accountTitle ? "" : navKey}
              activeSub={subKey}
              onModuleChange={switchModule}
              onNavigate={(area, sub) => {
                setNavKey(area);
                setSubKey(sub ?? firstSubKey(area));
              }}
            />
          ) : (
          <NavRail
            groups={[{ items: navItems }]}
            activeKey={active?.key}
            onNavigate={goToArea}
            activeModule={moduleKey}
            onModuleChange={switchModule}
            modules={only ? APP_MODULES.filter((m) => m.key === only) : APP_MODULES}
          />
          )
        }
        /* TIER 2 — rendered only where the active rail item declares a second
           nav level. Sales has none, so its content layer still takes the full
           width; 3PL's areas each have one. The panel classes are the shell
           rule's, verbatim, and are the same ones the DS gallery uses. */
        /* AND IT COMES OUT WITH THE RAIL. Every screen in this app is a table
           or a board, which is to say every screen wants the width — and the
           drawer's job is done the moment you have picked the list you are
           working in. See `sidebarPeek`. */
        sidebarPeek={NAV_STYLE === "two-layer"}
        sidebar={
          NAV_STYLE === "two-layer" && subGroups && active ? (
            <NavigationDrawer
              className="rounded-lg bg-sidebar"
              brand={{
                name: active.label,
                icon: active.icon,
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
