import * as React from "react";
import { toast } from "sonner";
import { ReceiptText, SearchX } from "lucide-react";
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
import { HeadFold, displayViewsFor, useHeadFold } from "./HeadFold";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "./ListToolbar";
import { ListFilters, type ListFacet } from "./ListFilters";
import { ExportSheet, type ExportFilterRow } from "./ExportSheet";
import { ListTable, OverflowList, TwoLineCell } from "./ListTable";
import { useSavedViews } from "./useSavedViews";
import { MONEY, RATE } from "./data";
import {
  MARKETS,
  QUOTE_COLUMNS,
  QUOTE_SEARCH_FIELDS,
  QUOTE_STATUSES,
  QUOTE_STATUS_TONE,
  matchesQuote,
  priceQuote,
  printKey,
  quoteColumnText,
  quoteStatus,
  sortQuotes,
  type Quote,
  type QuoteColumnKey,
  type QuoteSort,
} from "./quotes";
import { createQuote, reportExpired, useQuotes } from "./quoteStore";
import { dateIn, timeIn, useSalesSettings } from "./salesSettings";
import { QuoteSheet } from "./QuoteSheet";

/**
 * QUOTES — a Sales list (Pavan, 2026-10-07). The same shell as Customers and
 * Asset Orders: the view row with the CTA, the toolbar, the table, pagination.
 *
 * NOT DATE-SCOPED. A quote's dates (valid through, updated) are columns that
 * sort, not a day the list is about, so the toolbar carries no date control.
 * No board and no map: no lanes have been decided for a quote.
 */
const TOGGLE_COLUMNS = QUOTE_COLUMNS.filter((c) => c.label).map((c) => ({
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
  colFilters: Record<string, string>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  facets: string[];
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    mode: s.mode ?? "table",
    hidden: [...s.hidden].sort(),
    facets: [...s.facets].sort(),
    /* Empty boxes are no filter — typing then clearing one is not a change. */
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters)
        .filter(([, v]) => v.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  });

const DEFAULT_STATE: ViewState = {
  mode: "table",
  search: "",
  sortKey: null,
  sortDir: null,
  hidden: [],
  pageSize: 25,
  colScope: "customer",
  colQuery: "",
  colFilters: {},
  columnOrder: [],
  columnWidths: {},
  facets: [],
};

/* WHICH CREATE PRESS HAS BEEN ANSWERED. Outside the component on purpose:
   the screen remounts on every visit, and a nonce answered again on the way
   back would make a second blank quote. */
let answeredCreate: number | null = null;

export function QuotesScreen({
  focus,
  create,
  onOpenOrder,
}: {
  focus?: { id: string; n: number } | null;
  /** Create Quote pressed elsewhere (Orders' Create menu) — a nonce, so twice still opens. */
  create?: number | null;
  onOpenOrder: (orderId: string) => void;
}) {
  const rows = useQuotes();
  const { timeZone } = useSalesSettings();
  /* QUOTE EXPIRED — an in-app notification, once per quote (2026-10-07). */
  React.useEffect(() => {
    reportExpired(rows.filter((q) => quoteStatus(q) === "Expired"));
  }, [rows]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creatingId, setCreatingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<QuoteSort | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<QuoteColumnKey>>(new Set());
  const [colScope, setColScope] = React.useState("customer");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
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

  const applyState = (s: ViewState) => {

    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as QuoteColumnKey, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as QuoteColumnKey[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setColFilters(s.colFilters);
    /* The row opens when the view has something typed in it. */
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
    storageKey: "sales-quotes",
  });

  const startCreate = React.useCallback(() => {
    /* CREATE, THEN AUTOSAVE: the Draft exists from this press on. */
    const q = createQuote();
    setCreatingId(q.id);
    setOpenId(q.id);
    setPage(1);
  }, []);

  // A global-search hit lands here: open that quote's sheet on arrival.
  React.useEffect(() => {
    if (!focus) return;
    setCreatingId(null);
    setOpenId(focus.id);
  }, [focus]);

  React.useEffect(() => {
    if (!create || create === answeredCreate) return;
    answeredCreate = create;
    startCreate();
  }, [create, startCreate]);

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (!q || matchesQuote(r, q)) &&
          (!cq || quoteColumnText(r, colScope as QuoteColumnKey).toLowerCase().includes(cq)) &&
          /* AND-ed, and each box matches the text its own column PRINTS. */
          activeColFilters.every(([key, value]) =>
            quoteColumnText(r, key as QuoteColumnKey)
              .toLowerCase()
              .includes(value.trim().toLowerCase())
          )
      ),
    [rows, q, cq, colScope, activeColFilters]
  );
  /* Facets AND across, OR within one — Asset Orders' rule. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const pass = (facet: string, value: string) =>
        ![...sel].some((id) => id.startsWith(`${facet}:`)) || sel.has(`${facet}:${value}`);
      return searched.filter(
        (r) =>
          pass("status", quoteStatus(r)) && pass("customer", r.customer) && pass("market", r.market)
      );
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
  const sorted = React.useMemo(() => sortQuotes(filtered, sort), [filtered, sort]);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const facets: ListFacet[] = React.useMemo(
    () => [
      { key: "status", label: "Status", options: [...QUOTE_STATUSES] },
      {
        key: "customer",
        label: "Customer",
        options: Array.from(new Set(rows.map((r) => r.customer).filter(Boolean))),
        searchable: true,
      },
      { key: "market", label: "Market", options: MARKETS },
    ],
    [rows]
  );

  const onSort = (key: QuoteColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const renderCell = (r: Quote, key: QuoteColumnKey) => {
    const p = priceQuote(r);
    const muted = <span className="text-sm text-muted-foreground">—</span>;
    const num = (s: string) => <span className="text-sm tabular-nums text-foreground">{s}</span>;
    switch (key) {
      case "quoteNo":
        return <span className="text-sm font-medium text-foreground">{r.quoteNo}</span>;
      case "customer":
        return r.customer ? <span className="truncate text-sm">{r.customer}</span> : muted;
      case "shipTo":
        return r.shipTo ? <span className="truncate text-sm">{r.shipTo}</span> : muted;
      case "products":
        return <OverflowList values={r.lines.map((l) => l.name).filter(Boolean)} label="products" />;
      case "gallons":
        return p.gallons > 0 ? num(p.gallons.toLocaleString()) : muted;
      case "market":
        return r.market ? <span className="text-sm">{r.market}</span> : muted;
      case "net":
        return p.gallons > 0 ? num(RATE(p.net)) : muted;
      case "total":
        return p.gallons > 0 ? num(MONEY(p.total)) : muted;
      case "email":
        return r.email ? <span className="truncate text-sm">{r.email}</span> : muted;
      case "validThrough":
        return r.validThrough ? <span className="text-sm">{printKey(r.validThrough)}</span> : muted;
      case "status": {
        const s = quoteStatus(r);
        return (
          <StatusChip tone={QUOTE_STATUS_TONE[s]} variant="text">
            {s}
          </StatusChip>
        );
      }
      case "updated": {
        const d = new Date(r.updatedAt);
        return (
          /* IN THE SALES TIME ZONE (Preferences, 2026-10-07). */
          <TwoLineCell title={dateIn(d, timeZone)} description={timeIn(d, timeZone)} />
        );
      }
      default:
        return null;
    }
  };

  const nothing = sorted.length === 0 && !colFiltersOpen;

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
      label: QUOTE_SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: QUOTE_COLUMNS.find((c) => c.key === key)?.label ?? key,
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

  const fold = useHeadFold();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HeadFold collapsed={fold.collapsed}>
      <FuelOrdersViewBar
        {...savedViews}
        {...displayViewsFor({ board: false, map: false }, view, setView)}
        ctaLabel="Create quote"
        onCreateOrder={startCreate}
        onExport={() => setExporting(true)}
      />
      </HeadFold>

      <div className={fold.gap}>
        <ListToolbar
          viewSwitch={false}
          headCollapse={fold.headCollapse}
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one="quote" many="quotes" />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search quotes, customers, ship-tos…"
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
          searchFields={QUOTE_SEARCH_FIELDS}
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
          settings
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
          /* No grouping was asked for here (2026-10-07); a Group By that
             groups nothing is a dead control. */
          showGroupBy={false}
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
            /* ALONE ON THE SHELF it keeps its own top margin (Pavan, 2026-10-07). */
            className={facetSel.size > 0 ? "" : undefined}
            searchFields={QUOTE_SEARCH_FIELDS}
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
                <EmptyMedia variant="icon">{q ? <SearchX /> : <ReceiptText />}</EmptyMedia>
                <EmptyTitle>{q ? "No matching quotes" : "No quotes"}</EmptyTitle>
                {q && <EmptyDescription>{`No quotes match “${search.trim()}”.`}</EmptyDescription>}
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (q) setSearch("");
                    else startCreate();
                    setPage(1);
                  }}
                >
                  {q ? "Clear search" : "Create Quote"}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ListTable
              topBar={bar.slot}
              rows={pageRows}
              columns={QUOTE_COLUMNS}
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
              openLabel={(r) => `Open quote ${r.quoteNo}`}
              onOpenRow={(r) => {
                setCreatingId(null);
                setOpenId(r.id);
              }}
              showColumnFilters={colFiltersOpen}
              onToggleColumnFilters={() =>
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
        title="Export quotes"
        noun="quotes"
        nounOne="quote"
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
          toast.success(`Exporting ${sorted.length} ${sorted.length === 1 ? "quote" : "quotes"} as .${format}`);
        }}
      />

      <QuoteSheet
        quote={rows.find((r) => r.id === openId) ?? null}
        open={openId !== null}
        creating={creatingId !== null && creatingId === openId}
        onOpenChange={(o) => {
          if (o) return;
          setOpenId(null);
          setCreatingId(null);
        }}
        onOpenOrder={onOpenOrder}
      />

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
    </div>
  );
}
