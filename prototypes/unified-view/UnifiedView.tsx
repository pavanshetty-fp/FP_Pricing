import * as React from "react";
import {
  Fuel,
  ClipboardList,
  Users,
  Database,
  Upload,
  SearchX,
  CalendarOff,
  Construction,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TopBar } from "@/components/top-bar";
import { NavRail } from "@/components/navigation-drawer";
import { ThemeToggle } from "@/components/theme";
import { FuelOrdersBulkBar } from "./FuelOrdersBulkBar";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FuelOrdersToolbar } from "./FuelOrdersToolbar";
import { FuelOrdersTable } from "./FuelOrdersTable";
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
  sortFuelOrders,
  startOfDay,
} from "./data";
import type { FuelOrder, FuelOrderColumnKey, SortState } from "./types";

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

const NAV_ITEMS = [
  { key: "fuel-orders", label: "Fuel Orders", icon: <Fuel /> },
  { key: "asset-orders", label: "Asset Orders", icon: <ClipboardList /> },
  { key: "customers", label: "Customers", icon: <Users /> },
  { key: "assets", label: "Assets", icon: <Database /> },
];

/** Columns the column-visibility menu can toggle (everything with a label). */
const TOGGLE_COLUMNS = FUEL_ORDER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

/** Fuel Orders list — toolbar + table + pagination, inside the content layer. */
function FuelOrdersScreen() {
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
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hiddenColumns, setHiddenColumns] = React.useState<
    Set<FuelOrderColumnKey>
  >(new Set());
  const [date, setDate] = React.useState(() => startOfDay(new Date()));
  const [views, setViews] = React.useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null);
  const viewSeq = React.useRef(0);

  // A view captures the state a user would otherwise have to rebuild by hand.
  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hiddenColumns],
    pageSize,
    dateKey: dateKeyOf(date),
  };

  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      dateKey: dateKeyOf(startOfDay(new Date())),
    }),
    []
  );

  const activeView = views.find((v) => v.id === activeViewId) ?? null;
  const dirty =
    viewStateKey(current) !==
    viewStateKey(activeView ? activeView.state : defaultState);

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

  const query = search.trim().toLowerCase();
  // Date scopes the list first — every row on screen belongs to the selected
  // delivery date — then the search narrows within it.
  const dateKey = dateKeyOf(date);
  const onDate = React.useMemo(
    () => rows.filter((r) => r.dateKey === dateKey),
    [rows, dateKey]
  );
  const filtered = React.useMemo(
    () => (query ? onDate.filter((r) => matchesFuelOrder(r, query)) : onDate),
    [onDate, query]
  );
  const sorted = React.useMemo(() => sortFuelOrders(filtered, sort), [filtered, sort]);
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

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
    setProduct: (product: string) =>
      // Collapses each order onto one line, keeping ITS OWN total — a bulk
      // product change shouldn't silently rewrite quantities too.
      applyToSelected((r) => ({ ...r, products: [{ name: product, gal: r.qtyGal }] })),
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
          date={date}
          onDateChange={(d) => {
            setDate(d);
            setPage(1);
          }}
        />
      </div>

      {/* Table region — `relative` anchors the floating bulk-action bar. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 ? (
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
              selectedIds={selectedIds}
              onToggleRow={toggleRow}
              onToggleAll={toggleAll}
              sort={sort}
              onSort={onSort}
              hidden={hiddenColumns}
              onOpenOrder={(row) => setOpenOrderId(row.id)}
            />
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <div className="pointer-events-auto">
              <FuelOrdersBulkBar
                count={selectedIds.size}
                onClear={() => setSelectedIds(new Set())}
                onSetProduct={bulk.setProduct}
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
        open={openOrderId !== null}
        onOpenChange={(o) => !o && setOpenOrderId(null)}
        onSave={saveOrder}
        customers={customers}
        shipTos={shipTos}
        productNames={productNames}
      />

      <div className="shrink-0 border-t border-border">
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
      </div>
    </div>
  );
}

/** Placeholder for the rail destinations this pass hasn't built. */
function NotBuiltYet({ label }: { label: string }) {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Construction />
        </EmptyMedia>
        <EmptyTitle>{label}</EmptyTitle>
        <EmptyDescription>
          Not built yet — Fuel Orders is the screen in this pass.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function UnifiedView() {
  const [navKey, setNavKey] = React.useState("fuel-orders");
  const active = NAV_ITEMS.find((i) => i.key === navKey) ?? NAV_ITEMS[0];

  return (
    <TooltipProvider>
      <AppShell
        title={active.label}
        /* The preset-view row owns the only hairline under the header. */
        headerDivider={false}
        topBar={
          <TopBar
            user={{
              name: "Pavan Shetty",
              email: "pavanshetty@fleetpanda.com",
              fallback: "PS",
            }}
            unread={3}
          />
        }
        rail={
          <NavRail
            groups={[{ items: NAV_ITEMS }]}
            activeKey={navKey}
            onNavigate={setNavKey}
          />
        }
        /* No Tier-2 sidebar — the content layer takes the full width. */
        headerAction={
          <>
            <ThemeToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Export">
                  <Upload />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
          </>
        }
      >
        {navKey === "fuel-orders" ? (
          <FuelOrdersScreen />
        ) : (
          <NotBuiltYet label={active.label} />
        )}
      </AppShell>
    </TooltipProvider>
  );
}
