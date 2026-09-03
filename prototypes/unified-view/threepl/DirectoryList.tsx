import * as React from "react";
import { SearchX } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  GroupedListFooter,
  useGrouping,
  type GroupDim,
} from "@/components/tables-layout";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, type ListView } from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ListTable } from "../ListTable";
import { useSavedViews } from "../useSavedViews";

/*
  The Directory's list shell — Vendors, Customers, Products, Rental Assets.

  ONE COMPONENT, FOUR SCREENS. The four share a shape exactly: a record list
  with no date scope, no create CTA, no bulk bar, a facet panel, grouping, and a
  footer that counts. Four copies of that would have drifted within a release —
  and the drift would have been in the parts nobody looks at twice, like which
  screens suspend pagination while grouped.

  WHAT EACH SCREEN STILL OWNS is what is genuinely its own: its records, its
  columns and how their cells render, what it can be grouped and filtered by,
  and whether anything about it SUMS. Everything below that line is the same
  everywhere, so it lives here.

  NOT DATE-SCOPED, deliberately. A carrier, an account, a product and a tank
  carry no date, so the toolbar's date stepper is omitted rather than shown with
  nothing to scope — the same call Sales' Customers screen makes.
*/

export interface DirectoryFacet<Row> {
  key: string;
  label: string;
  options: string[];
  /** The value a row presents to this facet. Must match an option exactly. */
  valueOf: (row: Row) => string | string[];
}

export interface DirectoryColumn<K extends string> {
  key: K;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "right";
}

export interface DirectoryListProps<Row, K extends string> {
  rows: Row[];
  columns: DirectoryColumn<K>[];
  rowId: (row: Row) => string;
  renderCell: (row: Row, key: K) => React.ReactNode;
  /** Free-text across everything the record is findable by. */
  matches: (row: Row, q: string) => boolean;
  searchFields: { key: string; label: string; text: (row: Row) => string }[];
  searchPlaceholder: string;
  sortRows: (rows: Row[], sort: { key: K; dir: "asc" | "desc" } | null) => Row[];
  dimensions: GroupDim<Row>[];
  facets?: DirectoryFacet<Row>[];
  /** What one record is called — "vendor", "account", "product", "asset". */
  noun: string;
  /** Plural of `noun` where it is not just `+s`. */
  nounPlural?: string;
  /** The column that sums to something true. OMIT where none does. */
  measureOf?: (row: Row) => number;
  /** Unit for that measure. */
  measureUnit?: string;
  /** Formats the footer's total — for currency, where a unit suffix is wrong. */
  formatTotal?: (total: number) => string;
  emptyIcon: React.ReactNode;
  /** Row click opens something. Omit on a list with no record view yet — the
   *  chevron still renders, so the row's shape does not change between lists. */
  onOpenRow?: (row: Row) => void;
  openLabel: (row: Row) => string;
}

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

export function DirectoryList<Row, K extends string>({
  rows,
  columns,
  rowId,
  renderCell,
  matches,
  searchFields,
  searchPlaceholder,
  sortRows,
  dimensions,
  facets = [],
  noun,
  nounPlural,
  measureOf,
  measureUnit,
  formatTotal,
  emptyIcon,
  onOpenRow,
  openLabel,
}: DirectoryListProps<Row, K>) {
  const toggleColumns = React.useMemo(
    () => columns.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label })),
    [columns]
  );
  const firstScope = searchFields[0]?.key ?? "";

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<{ key: K; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<K>>(new Set());
  const [colScope, setColScope] = React.useState(firstScope);
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /** Applied facet ids, `facetKey:option`. Empty = everything. */
  const [applied, setApplied] = React.useState<string[]>([]);

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
      colScope: firstScope,
      colQuery: "",
    }),
    [firstScope]
  );
  const applyState = (s: ViewState) => {
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as K, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as K[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setPage(1);
  };
  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    const scoped = searchFields.find((f) => f.key === colScope);
    /* Options picked WITHIN one facet are OR; the facets are AND. That is the
       reading everyone already has of a filter panel, and a facet with nothing
       picked narrows nothing rather than narrowing to nothing. */
    const picks = facets
      .map((f) => ({
        f,
        chosen: applied
          .filter((id) => id.startsWith(`${f.key}:`))
          .map((id) => id.slice(f.key.length + 1)),
      }))
      .filter((p) => p.chosen.length > 0);

    return rows.filter((r) => {
      if (q && !matches(r, q)) return false;
      if (cq && scoped && !scoped.text(r).toLowerCase().includes(cq)) return false;
      return picks.every(({ f, chosen }) => {
        const v = f.valueOf(r);
        return Array.isArray(v) ? v.some((x) => chosen.includes(x)) : chosen.includes(v);
      });
    });
  }, [rows, q, cq, colScope, applied, facets, searchFields, matches]);

  const sorted = React.useMemo(() => sortRows(filtered, sort), [filtered, sort, sortRows]);

  const g = useGrouping<Row, K>({
    dimensions,
    rows: sorted,
    rowId,
    measureOf,
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  const onSort = (key: K) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const plural = nounPlural ?? `${noun}s`;
  const count = sorted.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No CTA: a Directory record is onboarded elsewhere — a carrier through a
          contract, an account from Dispatch, a product from the price book. The
          view bar renders its button only when a handler is passed. */}
      <FuelOrdersViewBar {...savedViews} />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder={searchPlaceholder}
          filters={
            facets.length > 0 ? (
              <ListFilters
                facets={facets.map((f) => ({
                  key: f.key,
                  label: f.label,
                  options: f.options,
                }))}
                onApply={(ids) => {
                  setApplied([...ids]);
                  setPage(1);
                }}
              />
            ) : undefined
          }
          groupBy={{
            dimensions: g.menuDimensions,
            value: g.groupBy,
            onChange: (next) => {
              g.setGrouping(next);
              setPage(1);
            },
          }}
          columns={toggleColumns}
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
          onHideAllColumns={() => setHidden(new Set(toggleColumns.map((c) => c.key)))}
          searchFields={searchFields}
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
          searchFields={searchFields}
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
          {count === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {q || applied.length > 0 ? <SearchX /> : emptyIcon}
                </EmptyMedia>
                <EmptyTitle>No matching {plural}</EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No ${plural} match “${search.trim()}”.`
                    : `No ${noun} matches the filters applied.`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ListTable
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun={noun}
              groupUnit={measureUnit}
              columns={columns}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={rowId}
              renderCell={renderCell}
              actionsKey={"actions" as K}
              openLabel={openLabel}
              onOpenRow={onOpenRow}
            />
          )}
        </div>
      </div>

      {/* Grouped, the footer reports the shape of the list; flat, it reports
          the one number a record list has — how many there are. */}
      <div className="mt-4 shrink-0">
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun={noun}
            total={g.total}
            unit={measureUnit}
            overCounts={g.groups.overCounts}
            allCollapsed={g.allCollapsed}
            onExpandAll={g.expandAll}
            onCollapseAll={g.collapseAll}
          />
        ) : (
          <div className="text-sm tabular-nums text-muted-foreground">
            {count} {count === 1 ? noun : plural}
            {measureOf !== undefined &&
              ` · ${
                formatTotal
                  ? formatTotal(g.total ?? 0)
                  : `${(g.total ?? 0).toLocaleString()}${measureUnit ? ` ${measureUnit}` : ""}`
              }`}
          </div>
        )}
      </div>
    </div>
  );
}
