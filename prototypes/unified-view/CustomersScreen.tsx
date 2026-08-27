import * as React from "react";
import { SearchX, Users } from "lucide-react";
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
import { FuelOrdersViewBar } from "./FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, type ListView } from "./ListToolbar";
import { ListFilters } from "./ListFilters";
import { ListTable, OverflowList, TwoLineCell } from "./ListTable";
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
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({ ...s, hidden: [...s.hidden].sort() });

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

  const current: ViewState = {
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    colScope,
    colQuery,
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      colScope: "name",
      colQuery: "",
    }),
    []
  );

  const applyState = (s: ViewState) => {
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
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  // A global-search hit lands here: open that customer's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreating(false);
    setOpenId(focus.id);
  }, [focus]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      rows.filter(
        (c) =>
          (!q || matchesCustomer(c, q)) &&
          (!cq || matchesCustomerIn(c, cq, colScope))
      ),
    [rows, q, cq, colScope]
  );
  const sorted = React.useMemo(() => sortCustomers(filtered, sort), [filtered, sort]);
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

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
              <Badge key={l} variant="secondary">
                {l}
              </Badge>
            ))}
          </div>
        );
      case "status":
        return (
          <StatusChip
            tone={c.status === "Active" ? "success" : "neutral"}
            variant="text"
          >
            {c.status}
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
        ctaLabel="Create New Customer"
        onCreateOrder={() => setCreating(true)}
      />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search customers, ERP IDs, ship-tos…"
          filters={
            <ListFilters
              facets={[
                { key: "status", label: "Status", options: ["Active", "Inactive"] },
                { key: "los", label: "LOS", options: [...LINES_OF_SERVICE] },
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
          view={view}
          onViewChange={setView}
        />
        <ColumnSearchChip
          searchFields={CUSTOMER_SEARCH_FIELDS}
          colScope={colScope}
          colQuery={colQuery}
          onClear={() => {
            setColQuery("");
            setPage(1);
          }}
        />
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {sorted.length === 0 ? (
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
              rows={pageRows}
              columns={CUSTOMER_COLUMNS}
              hidden={hidden}
              sort={sort}
              onSort={onSort}
              rowId={(c) => c.id}
              renderCell={renderCell}
              actionsKey="actions"
              openLabel={(c) => `Open customer ${c.name}`}
              onOpenRow={(c) => setOpenId(c.id)}
            />
          )}
        </div>
      </div>

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
