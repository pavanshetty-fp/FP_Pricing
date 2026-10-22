import * as React from "react";
import { toast } from "sonner";
import { SearchX, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
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
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "./ListToolbar";
import { ListFilters, type ListFacet } from "./ListFilters";
import { ExportSheet, type ExportFilterRow } from "./ExportSheet";
import { ListTable, OverflowList, TwoLineCell } from "./ListTable";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { CUSTOMER_GROUP_DIMS } from "./groupDims";
import { CustomerSheet, type CustomerDraft } from "./CustomerSheet";
import { useSavedViews } from "./useSavedViews";
import {
  CUSTOMERS,
  CUSTOMER_COLUMNS,
  CUSTOMER_SEARCH_FIELDS,
  LINES_OF_SERVICE,
  matchesCustomer,
  matchesCustomerIn,
  sortCustomers,
  type Customer,
  type CustomerColumnKey,
  type CustomerSortState,
} from "./customers";
import { ACTIVE_KIND, kindTone } from "./statusKind";

/**
 * Customers list — the same shell as the two order screens: preset-view row with
 * the CTA and Export, the action bar, the table, pagination.
 *
 * NOT DATE-SCOPED, and that is the one deliberate difference. A customer record
 * carries no date, so the toolbar's date stepper is omitted rather than shown
 * with nothing to scope. `ListToolbar` makes it optional for exactly this case.
 *
 * No bulk-action bar, for the same reason as Asset Orders: which fields a
 * customer needs edited in bulk was not specified.
 */
const TOGGLE_COLUMNS = CUSTOMER_COLUMNS.filter((c) => c.label).map((c) => ({
  key: c.key,
  label: c.label,
}));

interface ViewState {
  /** THE DISPLAY IT OPENS IN — table, board or map (Pavan, 2026-10-21). */
  mode?: ListView;
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
  /** The filter row's boxes, by column key. Optional so a view saved before
   *  the row still applies. */
  colFilters?: Record<string, string>;
  /* ORDER AND WIDTHS (Pavan, 2026-10-07) — what 3PL's views keep. Optional so
     a view saved before them still applies. */
  /** Column order as keys. Empty means "as declared". */
  columnOrder?: string[];
  /** Reader-set column widths in px, by key. Empty means "as declared". */
  columnWidths?: Record<string, number>;
  /* FACETS (Pavan, 2026-10-07). Optional so a view saved before them applies. */
  facets?: string[];
}

/* FILTERS APPLY (Pavan, 2026-10-07). The panel used to tick and do nothing;
   now it stages, applies and shows chips — 3PL's and Quotes'. */
const CUSTOMER_FACETS: ListFacet[] = [
  { key: "status", label: "Status", options: ["Active", "Inactive"] },
  { key: "los", label: "LOS", options: [...LINES_OF_SERVICE] },
];

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    mode: s.mode ?? "table",
    hidden: [...s.hidden].sort(),
    facets: [...(s.facets ?? [])].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters ?? {}).filter(([, v]) => v.trim() !== "").sort(([a], [b]) => a.localeCompare(b))
    ),
  });

/**
 * WHAT EACH COLUMN PRINTS, as text a header box can match — the same rule as
 * `brokerColumnText` in 3PL: a box under a header matches what is written
 * above the rows beneath it. Ship-tos match every one, not only the first the
 * cell shows — the rest are one hover away behind its `+N`.
 */
function customerColumnText(c: Customer, key: CustomerColumnKey): string {
  switch (key) {
    case "name":
      return `${c.name} ${c.erpId}`;
    case "shipTos":
      return c.shipTos.join(" ");
    case "los":
      return c.los.join(" ");
    case "status":
      return c.status;
    default:
      return "";
  }
}

export function CustomersScreen({ focus }: { focus?: { id: string; n: number } | null } = {}) {
  const [rows, setRows] = React.useState<Customer[]>(CUSTOMERS);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<CustomerSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<CustomerColumnKey>>(new Set());
  const [colScope, setColScope] = React.useState("name");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /* Empty = the table's declared order; the table fills in anything a saved
     order does not mention, so a stale view never costs a column. */
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  /* EXPORT ASKS FIRST (G10, Pavan, 2026-10-07) — 3PL's ExportSheet. */
  const [exporting, setExporting] = React.useState(false);
  const activeColFilters = React.useMemo(
    () => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""),
    [colFilters]
  );

  const current: ViewState = {

    mode: view,
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
  const defaultState: ViewState = React.useMemo(
    () => ({
    mode: "table",
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      colScope: "name",
      colQuery: "",
      colFilters: {},
      columnOrder: [],
      columnWidths: {},
      facets: [],
    }),
    []
  );

  const applyState = (s: ViewState) => {

    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(
      s.sortKey && s.sortDir
        ? { key: s.sortKey as CustomerColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as CustomerColumnKey[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setFacetSel(new Set(s.facets ?? []));
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: "sales-customers" });

  // A global-search hit lands here: open that customer's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      rows.filter(
        (c) =>
          (!q || matchesCustomer(c, q)) &&
          (!cq || matchesCustomerIn(c, cq, colScope)) &&
          /* AND-ed, and each box matches the text its own column PRINTS —
             see `customerColumnText`. */
          activeColFilters.every(([key, value]) =>
            customerColumnText(c, key as CustomerColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [rows, q, cq, colScope, activeColFilters]
  );
  /* Facets AND across, OR within one. A customer with several lines passes
     LOS when any of its lines is ticked. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const on = (facet: string) => [...sel].some((id) => id.startsWith(`${facet}:`));
      return searched.filter(
        (c) =>
          (!on("status") || sel.has(`status:${c.status}`)) &&
          (!on("los") || c.los.some((l) => sel.has(`los:${l}`)))
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
  const sorted = React.useMemo(() => sortCustomers(filtered, sort), [filtered, sort]);
  /* Grouping. The hook owns the dimension stack and the collapsed set, and
     suspends pagination while grouped — a group cannot straddle a page
     boundary and still have an honest header. */
  const g = useGrouping<(typeof sorted)[number], CustomerColumnKey>({
    dimensions: CUSTOMER_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r) => r.id, []),
    measureOf: React.useCallback((r: (typeof sorted)[number]) => r.shipTos.length, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  const onSort = (key: CustomerColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const saveCustomer = (customer: Customer, draft: CustomerDraft) =>
    setRows((prev) =>
      prev.map((c) => (c.id !== customer.id ? c : { ...c, ...draft }))
    );

  const createCustomer = (draft: CustomerDraft) => {
    setRows((prev) => [
      { id: `cu-new-${prev.length + 1}`, ...draft },
      ...prev,
    ]);
    setPage(1);
  };

  const renderCell = (c: Customer, key: CustomerColumnKey) => {
    switch (key) {
      case "name":
        return <TwoLineCell title={c.name} description={c.erpId} />;
      case "shipTos":
        return <OverflowList values={c.shipTos} label="ship-tos" />;
      case "los":
        // Every line of service is shown — an account carries at most three, so
        // there is nothing to truncate behind a +N here.
        return (
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {c.los.map((l) => (
              <Pill key={l}>
                {l}
              </Pill>
            ))}
          </div>
        );
      case "status":
        return (
          <StatusChip
            tone={kindTone(ACTIVE_KIND(c.status === "Active"))}
            variant="text"
          >
            {c.status}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  /* EVERY NARROWING THAT IS ON, for the export sheet to list — each drops
     what the shelf's own chip drops (3PL's, 2026-10-07). */
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
      label: CUSTOMER_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: CUSTOMER_COLUMNS.find((c) => c.key === key)?.label ?? key,
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
    ...CUSTOMER_FACETS.map((f) => {
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
      <FuelOrdersViewBar
        {...savedViews}
        ctaLabel="Create New Customer"
        onCreateOrder={() => setCreating(true)}
        onExport={() => setExporting(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one="customer" many="customers" />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search customers, ERP IDs, ship-tos…"
          filters={
            <ListFilters
              facets={CUSTOMER_FACETS}
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
          searchFields={CUSTOMER_SEARCH_FIELDS}
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
        />
        {/* ONE SHELF for the facets and the column search — 3PL's. */}
        <FilterChips
          facets={CUSTOMER_FACETS}
          selected={facetSel}
          onChange={(next) => {
            setFacetSel(next);
            setPage(1);
          }}
        >
          <ColumnSearchChip
            /* ALONE ON THE SHELF it keeps its own top margin (Pavan, 2026-10-07). */
            className={facetSel.size > 0 ? "" : undefined}
            searchFields={CUSTOMER_SEARCH_FIELDS}
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
                <EmptyMedia variant="icon">{q ? <SearchX /> : <Users />}</EmptyMedia>
                <EmptyTitle>
                  {q ? "No matching customers" : "No customers yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No customers match “${search.trim()}”.`
                    : "Create the first customer to get started."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (q) setSearch("");
                    else setCreating(true);
                    setPage(1);
                  }}
                >
                  {q ? "Clear search" : "Create New Customer"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ListTable
              topBar={bar.slot}
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="account"
              groupUnit="ship-tos"
              columns={CUSTOMER_COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(c) => c.id}
              renderCell={renderCell}
              actionsKey="actions"
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(c) => `Open customer ${c.name}`}
              onOpenRow={(c) => setOpenId(c.id)}
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

      {/* EXPORT ASKS BEFORE IT ACTS (G10, Pavan, 2026-10-07). What leaves is
          the whole narrowed set, not the page. */}
      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export Customers"
        noun="customers"
        nounOne="customer"
        count={sorted.length}
        filtersControl={
          <ListFilters
            facets={CUSTOMER_FACETS}
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
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? "customer" : "customers"} as .${format}`);
        }}
      />

      <CustomerSheet
        customer={rows.find((c) => c.id === openId) ?? null}
        mode={creating ? "create" : "edit"}
        open={creating || openId !== null}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setOpenId(null);
        }}
        onSave={saveCustomer}
        onCreate={createCustomer}
      />

      <div className={cn("mt-4 shrink-0", view === "board" && "hidden")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="account"
            total={g.total}
            unit="ship-tos"
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
