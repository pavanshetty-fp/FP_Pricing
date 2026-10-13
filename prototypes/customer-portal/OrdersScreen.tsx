import * as React from "react";
import { toast } from "sonner";
import { ClipboardList, SearchX } from "lucide-react";
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
import { FuelOrdersViewBar } from "../unified-view/FuelOrdersViewBar";
import {
  ListToolbar,
  ColumnSearchChip,
  FilterChips,
  type ListView,
} from "../unified-view/ListToolbar";
import { ListFilters, type ListFacet } from "../unified-view/ListFilters";
import { ExportSheet, type ExportFilterRow } from "../unified-view/ExportSheet";
import { ListTable, TwoLineCell } from "../unified-view/ListTable";
import { OrderMapView, type MapOrder } from "../unified-view/OrderMapView";
import { BrokerBoard, type BoardLane, type LaneColor } from "../unified-view/threepl/BrokerBoard";
import { DateRangeFilter, type DateRange } from "../unified-view/threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../unified-view/data";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { AssetsCell, DocumentsCell, FlagsCell, ProductsCell, QuantityCell } from "./cells";
import { useSavedViews } from "../unified-view/useSavedViews";
import { DATE_FMT } from "../unified-view/data";
import {
  DEFAULT_HIDDEN,
  FLAG_KINDS,
  PRODUCTS,
  LINE_SCOPES,
  TERMINAL,
  inLine,
  lineQty,
  tripProgress,
  type LineScope,
  type RequestStatus,
  REQUEST_COLUMNS,
  REQUEST_SEARCH_FIELDS,
  REQUEST_STATUSES,
  REQUEST_STATUS_TONE,
  SHIP_TOS,
  assetById,
  createRequest,
  lastProductFor,
  lowTanksWithoutOrder,
  matchesRequest,
  printKey,
  requestColumnText,
  sortRequests,
  updateRequest,
  useRequests,
  windowText,
  type OrderRequest,
  type RequestColumnKey,
  type RequestSort,
} from "./orders";
import { OrderRequestSheet } from "./OrderRequestSheet";
import { LowTankBanner, MapHoverCard, OverviewCards } from "./overview";
import { TodaySheet } from "./TodaySheet";

/**
 * ORDERS — the customer's order requests (Pavan, 2026-10-13). The Unified
 * View list: the view row with the CTA, the toolbar, the table, pagination.
 *
 * NOT DATE-SCOPED, as Quotes: a customer looks across all of their requests,
 * past and coming; the requested date is a column that sorts. One view — a
 * table — so no view switch.
 */
const TOGGLE_COLUMNS = REQUEST_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

interface ViewState {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
  colFilters: Record<string, string>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  facets: string[];
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    hidden: [...s.hidden].sort(),
    facets: [...s.facets].sort(),
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters)
        .filter(([, v]) => v.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  });

const DEFAULT_STATE: ViewState = {
  search: "",
  sortKey: null,
  sortDir: null,
  hidden: DEFAULT_HIDDEN,
  pageSize: 25,
  colScope: "requestNo",
  colQuery: "",
  colFilters: {},
  columnOrder: [],
  columnWidths: {},
  facets: [],
};

export function OrdersScreen() {
  const rows = useRequests();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creatingId, setCreatingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<RequestSort | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<RequestColumnKey>>(() => new Set(DEFAULT_HIDDEN));
  const [colScope, setColScope] = React.useState("requestNo");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = React.useState(false);
  const [todayOpen, setTodayOpen] = React.useState(false);
  /* THE LINE SWITCH (3PL's, "All" first) and THE DATE RANGE — a request's
     record is a delivery day, so the list opens on today (2-layouts §4). */
  const [line, setLine] = React.useState<LineScope>("All");
  const today = startOfDay(new Date());
  const [range, setRange] = React.useState<DateRange>({ from: today, to: today });
  const fromKey = dateKeyOf(range.from);
  const toKey = dateKeyOf(range.to);
  /* THE MAP MOVES — the trucks' places are read from the clock. */
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (view !== "map") return;
    const t = window.setInterval(() => setNow(Date.now()), 3000);
    return () => window.clearInterval(t);
  }, [view]);
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
    colScope,
    colQuery,
    colFilters,
    columnOrder,
    columnWidths,
    facets: [...facetSel],
  };

  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as RequestColumnKey, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as RequestColumnKey[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setColFilters(s.colFilters);
    setColFiltersOpen(Object.values(s.colFilters).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder);
    setColumnWidths(s.columnWidths);
    setFacetSel(new Set(s.facets));
    setPage(1);
  };

  const savedViews = useSavedViews({
    current,
    defaultState: DEFAULT_STATE,
    keyOf,
    apply: applyState,
    storageKey: "portal-orders",
  });

  const startCreate = () => {
    /* CREATE, THEN AUTOSAVE: the Draft exists from this press on. */
    const r = createRequest();
    setCreatingId(r.id);
    setOpenId(r.id);
    setPage(1);
  };

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          inLine(r, line) &&
          /* A draft with no date yet is shown whatever the range. */
          (!r.date || (r.date >= fromKey && r.date <= toKey)) &&
          (!q || matchesRequest(r, q)) &&
          (!cq || requestColumnText(r, colScope as RequestColumnKey).toLowerCase().includes(cq)) &&
          activeColFilters.every(([key, value]) =>
            requestColumnText(r, key as RequestColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [rows, q, cq, colScope, activeColFilters, line, fromKey, toKey]
  );
  /* Facets AND across, OR within one. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const has = (facet: string) => [...sel].some((id) => id.startsWith(`${facet}:`));
      const pass = (facet: string, values: string[]) =>
        !has(facet) || values.some((v) => sel.has(`${facet}:${v}`));
      return searched.filter(
        (r) =>
          pass("status", [r.status]) &&
          pass("shipTo", [r.shipTo]) &&
          pass(
            "product",
            r.lines.map((l) => l.product)
          ) &&
          pass("repeats", [r.recurring ? "Recurring" : "One-time"]) &&
        pass(
            "flags",
            r.flags.map((f) => f.kind)
          )
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  const sorted = React.useMemo(() => sortRequests(filtered, sort), [filtered, sort]);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const facets: ListFacet[] = React.useMemo(
    () => [
      { key: "status", label: "Status", options: [...REQUEST_STATUSES] },
      { key: "flags", label: "Flags", options: [...FLAG_KINDS] },
      { key: "shipTo", label: "Ship-to", options: SHIP_TOS.map((s) => s.name) },
      { key: "product", label: "Product", options: PRODUCTS },
      { key: "repeats", label: "Repeats", options: ["One-time", "Recurring"] },
    ],
    []
  );

  const onSort = (key: RequestColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const renderCell = (r: OrderRequest, key: RequestColumnKey) => {
    const muted = <span className="text-sm text-muted-foreground">—</span>;
    switch (key) {
      case "requestNo":
        return <span className="text-sm font-medium text-foreground">{r.requestNo}</span>;
      case "shipTo":
        return r.shipTo ? <span className="truncate text-sm">{r.shipTo}</span> : muted;
      case "assets":
        return <AssetsCell r={r} />;
      case "products":
        return <ProductsCell r={r} />;
      case "quantity":
        return <QuantityCell r={r} />;
      case "flags":
        return <FlagsCell r={r} />;
      case "documents":
        return <DocumentsCell r={r} />;
      case "date":
        return r.date ? <TwoLineCell title={printKey(r.date)} description={windowText(r)} /> : muted;
      case "repeats":
        return r.recurring ? <span className="text-sm">{r.frequency}</span> : muted;
      case "po":
        return r.po ? <span className="text-sm">{r.po}</span> : muted;
      case "status":
        return (
          <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
            {r.status}
          </StatusChip>
        );
      case "updated": {
        const d = new Date(r.updatedAt);
        return (
          <TwoLineCell
            title={DATE_FMT.format(d)}
            description={d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          />
        );
      }
      default:
        return null;
    }
  };

  const nothing = sorted.length === 0 && !(view === "table" && colFiltersOpen);

  /* THE BOARD — one lane per status, in lifecycle order; the ends that are
     not steps of the work sit apart (2-layouts §6). Lane colour follows the
     status's kind. */
  const boardLanes = React.useMemo<BoardLane[]>(() => {
    const ENDS: RequestStatus[] = ["Quote declined", "Quote expired", "Rejected", "Cancelled"];
    const KIND_LANE: Record<string, LaneColor> = {
      neutral: "grey",
      processing: "yellow",
      info: "blue",
      success: "green",
      failed: "red",
    };
    const steps = REQUEST_STATUSES.filter((st) => !ENDS.includes(st));
    return [...steps, ...ENDS].map((st) => ({
      key: st,
      title: st,
      color: KIND_LANE[REQUEST_STATUS_TONE[st]] ?? "grey",
      apart: st === ENDS[0],
      emptyLabel: "No orders",
      cards: sorted
        .filter((r) => r.status === st)
        .map((r) => ({
          id: r.id,
          title: r.requestNo,
          badges: r.flags
            .filter((f) => f.level !== "info")
            .map((f) => ({ label: f.kind, tone: f.level === "critical" ? ("critical" as const) : ("caution" as const) })),
          units: [
            { kind: "stack" as const, key: "shipTo", heading: "Ship-to", lines: [{ text: r.shipTo || "—", level: 1 as const }] },
            {
              kind: "inline" as const,
              key: "schedule",
              heading: "Requested",
              parts: r.date ? [printKey(r.date), windowText(r)] : ["No date"],
            },
            {
              kind: "rows" as const,
              key: "lines",
              heading: "Tanks & products",
              rows: r.lines.map((l) => ({
                asset: `${assetById(l.assetId)?.name ?? "No tank"} · ${l.product || "—"}`,
                qty: lineQty(l),
              })),
            },
          ],
        })),
    }));
  }, [sorted]);

  /* THE MAP — the same narrowed list, each request a pin at its ship-to;
     trucks out for delivery move along their road (Pavan, 2026-10-13). */
  const mapOrders: MapOrder[] = sorted.map((r) => {
    const site = SHIP_TOS.find((x) => x.name === r.shipTo);
    return {
      id: r.id,
      orderNo: r.requestNo,
      site: r.shipTo,
      subtitle: r.date ? `${printKey(r.date)} · ${windowText(r)}` : "No date",
      status: r.status,
      tone: REQUEST_STATUS_TONE[r.status],
      coords: site ? { lat: site.lat, lng: site.lng } : undefined,
    };
  });
  const trucks = sorted
    .filter((r) => r.status === "Out for delivery" && r.trip)
    .map((r) => {
      const site = SHIP_TOS.find((x) => x.name === r.shipTo)!;
      const eta = new Date(r.trip!.eta);
      return {
        id: `truck-${r.id}`,
        orderId: r.id,
        label: `${r.trip!.truck} · ${r.requestNo} · ETA ${formatMinutes(eta.getHours() * 60 + eta.getMinutes())}`,
        from: { lat: TERMINAL.lat, lng: TERMINAL.lng },
        fromLabel: TERMINAL.name,
        to: { lat: site.lat, lng: site.lng },
        progress: tripProgress(r.trip!, now),
      };
    });
  const narrowed = q !== "" || cq !== "" || facetSel.size > 0;

  const dropFacets = (gone: string[]) => {
    const next = new Set(facetSel);
    for (const id of gone) next.delete(id);
    setFacetSel(next);
    setPage(1);
  };
  const exportFilters: ExportFilterRow[] = [
    {
      key: "search",
      label: "Search",
      values: search.trim()
        ? [{ value: search.trim(), onRemove: () => { setSearch(""); setPage(1); } }]
        : [],
    },
    {
      key: "colSearch",
      label: REQUEST_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: REQUEST_COLUMNS.find((c) => c.key === key)?.label ?? key,
      values: [
        {
          value: value.trim(),
          onRemove: () => {
            setColFilters((prev) => ({ ...prev, [key]: "" }));
            setPage(1);
          },
        },
      ],
    })),
    ...facets.map((f) => {
      const mine = [...facetSel].filter((id) => id.startsWith(`${f.key}:`));
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({
          value: id.slice(id.indexOf(":") + 1),
          onRemove: () => dropFacets([id]),
        })),
        onRemoveAll: () => dropFacets(mine),
      };
    }),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE OVERVIEW SITS ABOVE EVERYTHING (Pavan, 2026-10-13) — the
          view row, the banner and the tools come after it. */}
      <OverviewCards rows={rows} onDetails={() => setTodayOpen(true)} />
      <TodaySheet rows={rows} open={todayOpen} onOpenChange={setTodayOpen} />

      {/* AIR BETWEEN THE OVERVIEW AND THE CONTROLS (Pavan, 2026-10-13). */}
      <div className="mt-8 shrink-0">
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create Order"
        onCreateOrder={startCreate}
        onExport={() => setExporting(true)}
        segments={LINE_SCOPES.map((l) => ({ key: l, label: l }))}
        segmentValue={line}
        onSegmentChange={(v) => {
          setLine(v as LineScope);
          setPage(1);
        }}
      />
      </div>

      {/* THE CRITICAL BANNER — where a list's banner sits: under the view
          row, above the toolbar. */}
      <div className="mt-4 shrink-0 empty:hidden">
        <LowTankBanner
          tanks={lowTanksWithoutOrder(rows)}
          onOrder={(shipTo, assets) => {
            const r = createRequest();
            updateRequest(r.id, {
              shipTo,
              lines: assets.map((a) => ({
                assetId: a.id,
                product: lastProductFor(a.id, rows) ?? a.product,
                topOff: true,
                gal: 0,
              })),
            });
            setCreatingId(r.id);
            setOpenId(r.id);
            setPage(1);
          }}
        />
      </div>


      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search requests, ship-tos, tanks…"
          filters={
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
          searchFields={REQUEST_SEARCH_FIELDS}
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
          columnFiltersOpen={colFiltersOpen}
          onToggleColumnFilters={() =>
            setColFiltersOpen((open) => {
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
          boardView
          mapView
          showGroupBy={false}
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
          <ColumnSearchChip
            className={facetSel.size > 0 ? "" : undefined}
            searchFields={REQUEST_SEARCH_FIELDS}
            colScope={colScope}
            colQuery={colQuery}
            onClear={() => {
              setColQuery("");
              setPage(1);
            }}
          />
        </FilterChips>
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
          {nothing ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">{narrowed ? <SearchX /> : <ClipboardList />}</EmptyMedia>
                <EmptyTitle>{narrowed ? "No matching orders" : "No orders yet"}</EmptyTitle>
                {narrowed && (
                  <EmptyDescription>
                    {`${rows.length} orders in all. Clear the search or a filter to see them.`}
                  </EmptyDescription>
                )}
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (narrowed) {
                      setSearch("");
                      setColQuery("");
                      setFacetSel(new Set());
                    } else startCreate();
                    setPage(1);
                  }}
                >
                  {narrowed ? "Clear all" : "Create Order"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : view === "board" ? (
            <BrokerBoard lanes={boardLanes} onOpenCard={(id) => { setCreatingId(null); setOpenId(id); }} />
          ) : view === "map" ? (
            <OrderMapView
              orders={mapOrders}
              trucks={trucks}
              minPad={0.04}
              onOpenOrder={(id) => {
                setCreatingId(null);
                setOpenId(id);
              }}
              hoverCard={(pins) => (
                <MapHoverCard requests={pins.map((p) => rows.find((r) => r.id === p.id)!).filter(Boolean)} />
              )}
            />
          ) : (
            <ListTable
              rows={pageRows}
              columns={REQUEST_COLUMNS}
              hidden={hidden}
              sort={sort}
              onSort={onSort}
              rowId={(r) => r.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(r) => `Open request ${r.requestNo}`}
              onOpenRow={(r) => {
                setCreatingId(null);
                setOpenId(r.id);
              }}
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

      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Orders"
        noun="orders"
        nounOne="order"
        count={sorted.length}
        filtersControl={
          <ListFilters
            facets={facets}
            value={facetSel}
            countFor={(sel) => narrowFacets(sel).length}
            onApply={(sel) => {
              setFacetSel(sel);
              setPage(1);
            }}
            fullWidth
          />
        }
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? "order" : "orders"} as .${format}`);
        }}
      />

      <OrderRequestSheet
        request={rows.find((r) => r.id === openId) ?? null}
        open={openId !== null}
        creating={creatingId !== null && creatingId === openId}
        onOpenChange={(o) => {
          if (o) return;
          setOpenId(null);
          setCreatingId(null);
        }}
        onDuplicate={(id) => {
          /* The copy opens as a new order, in place of the one it came from. */
          setCreatingId(id);
          setOpenId(id);
          setPage(1);
        }}
      />

      {/* A BOARD AND A MAP ARE NOT PAGED — they get a total that says its
          scope (2-layouts §9). */}
      {view !== "table" ? (
        <p className="mt-4 shrink-0 text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "order" : "orders"}
        </p>
      ) : (
      <div className="mt-4 shrink-0">
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
      )}
    </div>
  );
}
