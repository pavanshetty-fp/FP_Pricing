import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  BulkActionBar,
  GroupedListFooter,
  TablePagination,
  useGrouping,
  type BulkAction,
  type GroupDim,
} from "@/components/tables-layout";
import { toast } from "sonner";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ExportSheet, type ExportFilterRow } from "../ExportSheet";
import { ListTable } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import { packList, readUrl, unpackList, writeUrl } from "./directoryUrl";
import { downloadCsv } from "../csv";

/*
  The Directory's list shell — Customers, Vendors, Products, Rental Assets.

  ONE COMPONENT, FOUR SCREENS. The four share a shape exactly: a record list
  with no date scope, a facet panel, grouping, selection, pagination and a
  footer that counts. Four copies of that would have drifted within a release —
  and the drift would have been in the parts nobody looks at twice, like which
  screens suspend pagination while grouped.

  WHAT EACH SCREEN STILL OWNS is what is genuinely its own: its records, its
  columns and how their cells render, what it can be grouped and filtered by,
  what can be DONE to a selection of them, and whether anything about it SUMS.
  Everything below that line is the same everywhere, so it lives here.

  NOT DATE-SCOPED, deliberately. A carrier, an account, a product and a tank
  carry no date, so the toolbar's date stepper is omitted rather than shown with
  nothing to scope — the same call Sales' Customers screen makes.

  PAGINATION AND GROUPING ARE EXCLUSIVE. At 30 rows a page a group straddles
  the boundary and its header claims a count for records that are not on
  screen, so while grouped the list scrolls whole and reports its shape
  instead. That is `GroupedListFooter`'s entire reason for existing, and the
  two footers keep the same skeleton so the bottom of the screen does not jump.
*/

/** Mirrors `TablePagination`'s own default set — used only to validate a URL. */
const DS_PAGE_SIZES = [10, 25, 50, 100];

/*
  WHAT A CELL PRINTS, as text — what the header row's "Filter…" boxes match.

  The boxes promise to search the column you are looking at, so they have to
  match the words in it: "$12,400" not 12400, "Expiring" not a date, the
  status chip's label not its enum. The four screens only describe their cells
  as React, so the cell is rendered here, off screen, and its text read back —
  one definition of the column, not a second text-only copy of it to drift.
  Tooltip bodies are closed in a static render, so hover text does not match;
  that is the same line the eye draws.

  A cell that will not render outside the page falls back to the strings in
  its tree, which is most of them.
*/
function textOfNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOfNode).join(" ");
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    return ["title", "description", "label", "value", "children"]
      .map((k) => textOfNode(props[k] as React.ReactNode))
      .join(" ");
  }
  return "";
}

function cellText(node: React.ReactNode): string {
  let text: string;
  try {
    /* Spaces between tags, so a two-line cell reads "Acme Fuels 1042", not
       "Acme Fuels1042". */
    const html = renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>).replace(/></g, "> <");
    text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
  } catch {
    text = textOfNode(node);
  }
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Empty boxes are no filter — typing then clearing one is not a change. */
const liveColFilters = (f: Record<string, string> | undefined) =>
  Object.entries(f ?? {})
    .filter(([, v]) => v.trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b));

function readColFilters(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (e): e is [string, string] => typeof e[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

export interface DirectoryFacet<Row> {
  key: string;
  label: string;
  options: string[];
  /** The value a row presents to this facet. Must match an option exactly. */
  valueOf: (row: Row) => string | string[];
  searchable?: boolean;
}

export interface DirectoryColumn<K extends string> {
  key: K;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "right" | "center";
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
  /** Row click opens the record. */
  onOpenRow?: (row: Row) => void;
  openLabel: (row: Row) => string;
  /** Header CTA. Omitted, no button is drawn — no dead controls. */
  onCreate?: () => void;
  createLabel?: string;
  /** One CSV row per record, in the order the columns are declared. */
  exportRow?: (row: Row) => Record<string, string | number>;
  /** What can be done to a selection. Omitted, the checkbox column is absent. */
  bulkActions?: (selected: Row[], clear: () => void) => BulkAction[];
  /** Namespaces this list's URL params so four screens can share one address. */
  urlKey: string;
  /**
   * THE LIST'S TOTAL GOES TO THE PAGE HEADER, not under the footer.
   *
   * It is a fact about the whole list — "these 150 accounts are owed
   * $9.7m" — and the footer is where the page position lives. Sat down
   * there it read as a property of page 1 of 5, and it was the last thing on
   * a screen somebody has to scroll to reach. Beside the title it is the
   * first, which is where a headline number belongs.
   */
  onTotalChange?: (label: string | null) => void;
  /** Whether the reader may create, edit or archive here. */
  canWrite?: boolean;
  /**
   * An alternative rendering of the SAME filtered, searched, sorted rows — the
   * vendor map. It replaces the table only, so the toolbar, the facets and the
   * chips keep working and the two views can never disagree about what is on
   * screen.
   */
  renderMap?: (rows: Row[]) => React.ReactNode;
}

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
  filters: string[];
  /** The header row's boxes, by column key. Optional so a view saved before
   *  them still applies. */
  colFilters?: Record<string, string>;
  /* A SAVED VIEW KEEPS THE COLUMNS' ORDER AND WIDTHS (Pavan, 2026-10-07), as
     Delivery Orders does. Optional so an older view still applies. */
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    mode: s.mode ?? "table",
    hidden: [...s.hidden].sort(),
    filters: [...s.filters].sort(),
    colFilters: Object.fromEntries(liveColFilters(s.colFilters)),
    columnOrder: s.columnOrder ?? [],
    columnWidths: s.columnWidths ?? {},
  });

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
  onCreate,
  createLabel,
  exportRow,
  bulkActions,
  urlKey,
  canWrite = true,
  onTotalChange,
  renderMap,
}: DirectoryListProps<Row, K>) {
  const toggleColumns = React.useMemo(
    () => columns.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label })),
    [columns]
  );
  const firstScope = searchFields[0]?.key ?? "";

  /* ── initial state, from the URL if it carries any ────────────────────── */
  const boot = React.useMemo(() => {
    const u = readUrl();
    /* Params belong to whichever entity the address names. Landing on Vendors
       with the Customers list's page number would be worse than ignoring it. */
    return u.entity === urlKey ? u : {};
  }, [urlKey]);

  const [search, setSearch] = React.useState(boot.q ?? "");
  const [sort, setSort] = React.useState<{ key: K; dir: "asc" | "desc" } | null>(
    boot.sortBy ? { key: boot.sortBy as K, dir: boot.sortDir === "desc" ? "desc" : "asc" } : null
  );
  const [page, setPage] = React.useState(Number(boot.page) > 0 ? Number(boot.page) : 1);
  /* THE DS'S PAGINATION, unchanged. `TablePagination` ships its own page-size
     set and its own footer copy, and both are already documented; a second set
     of sizes here would make this list the one screen that counts differently
     from every other. The URL may name a size, but only one the DS offers. */
  const [pageSize, setPageSize] = React.useState(() =>
    DS_PAGE_SIZES.includes(Number(boot.pageSize)) ? Number(boot.pageSize) : 25
  );
  const [hidden, setHidden] = React.useState<Set<K>>(new Set(unpackList(boot.cols) as K[]));
  const [colScope, setColScope] = React.useState(boot.colScope ?? firstScope);
  const [colQuery, setColQuery] = React.useState(boot.colQuery ?? "");
  const [view, setView] = React.useState<ListView>("table");
  /** Applied facet ids, `facetKey:option`. Empty = everything. */
  const [applied, setApplied] = React.useState<string[]>(unpackList(boot.filters));
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  /** One box per column, under the headers — see `ListTableProps.columnFilters`. */
  const [colFilters, setColFilters] = React.useState<Record<string, string>>(() =>
    readColFilters(boot.colFilters)
  );
  /* The row opens when the address arrives with something typed in it. */
  const [colFiltersOpen, setColFiltersOpen] = React.useState(
    () => liveColFilters(readColFilters(boot.colFilters)).length > 0
  );
  const activeColFilters = React.useMemo(() => liveColFilters(colFilters), [colFilters]);
  /* Columns move and resize, lifted so a view keeps them (Pavan, 2026-10-07). */
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [exporting, setExporting] = React.useState(false);

  /*
    THE LOADING STATE IS REAL, not a toggle in a demo.

    Changing the page, the page size or the sort is the moment a real list goes
    back to the server, and the skeleton is what the reader sees while it does.
    Showing it for one frame on those three transitions is the honest amount:
    long enough that the state exists and is designed, short enough that it is
    never in the way.
  */
  const [loading, setLoading] = React.useState(false);
  const settle = React.useRef<number | undefined>(undefined);
  const reload = React.useCallback(() => {
    setLoading(true);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => setLoading(false), 260);
  }, []);
  React.useEffect(() => () => window.clearTimeout(settle.current), []);

  const current: ViewState = {

    mode: view,
    search,
    sortKey: sort?.key ?? null,
    sortDir: sort?.dir ?? null,
    hidden: [...hidden],
    pageSize,
    colScope,
    colQuery,
    filters: applied,
    colFilters,
    columnOrder,
    columnWidths,
  };
  const defaultState: ViewState = React.useMemo(
    () => ({
    mode: "table",
      search: "",
      sortKey: null,
      sortDir: null,
      hidden: [],
      pageSize: 25,
      colScope: firstScope,
      colQuery: "",
      filters: [],
      colFilters: {},
      columnOrder: [],
      columnWidths: {},
    }),
    [firstScope]
  );
  const applyState = (s: ViewState) => {
    setView(s.mode ?? "table");
    setSearch(s.search);
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as K, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as K[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setApplied(s.filters);
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    /* The row opens when the view has something typed in it. */
    setColFiltersOpen(liveColFilters(filters).length > 0);
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setPage(1);
    reload();
  };
  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: `3pl-directory-${nounPlural}` });

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();

  /* Rendered once per row and column, then kept until the row itself changes
     — an edit replaces the row object, so the cache cannot go stale. */
  const textCache = React.useMemo(
    () => new WeakMap<object, Map<string, string>>(),
    [renderCell]
  );
  const textOf = React.useCallback(
    (row: Row, key: K) => {
      const obj = row as unknown as object;
      let byKey = textCache.get(obj);
      if (!byKey) textCache.set(obj, (byKey = new Map()));
      let t = byKey.get(key);
      if (t === undefined) byKey.set(key, (t = cellText(renderCell(row, key))));
      return t;
    },
    [textCache, renderCell]
  );

  /* The whole narrowing for any facet set, so the filter panel can count a
     selection that is ticked but not yet applied with the very same rules. */
  const narrow = React.useCallback((ids: Iterable<string>) => {
    const picked = [...ids];
    const scoped = searchFields.find((f) => f.key === colScope);
    /* Options picked WITHIN one facet are OR; the facets are AND. That is the
       reading everyone already has of a filter panel, and a facet with nothing
       picked narrows nothing rather than narrowing to nothing. */
    const picks = facets
      .map((f) => ({
        f,
        chosen: picked
          .filter((id) => id.startsWith(`${f.key}:`))
          .map((id) => id.slice(f.key.length + 1)),
      }))
      .filter((p) => p.chosen.length > 0);

    return rows.filter((r) => {
      if (q && !matches(r, q)) return false;
      if (cq && scoped && !scoped.text(r).toLowerCase().includes(cq)) return false;
      /* AND, because that is what typing in two boxes looks like it should
         do. Each box matches the text its own column PRINTS — see `cellText`. */
      if (
        !activeColFilters.every(([key, value]) =>
          textOf(r, key as K).includes(value.trim().toLowerCase())
        )
      )
        return false;
      return picks.every(({ f, chosen }) => {
        const v = f.valueOf(r);
        return Array.isArray(v) ? v.some((x) => chosen.includes(x)) : chosen.includes(v);
      });
    });
  }, [rows, q, cq, colScope, facets, searchFields, matches, activeColFilters, textOf]);

  const filtered = React.useMemo(() => narrow(applied), [narrow, applied]);

  /* THE VIEW BAR — the table's and the board's tools render into it. */
  const bar = useViewBar();
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

  /* The URL trails the state rather than driving it: one writer, no loop. */
  React.useEffect(() => {
    writeUrl({
      entity: urlKey,
      q: search || null,
      page: page > 1 ? page : null,
      pageSize: pageSize === 25 ? null : pageSize,
      sortBy: sort?.key ?? null,
      sortDir: sort?.dir ?? null,
      cols: packList([...hidden]) || null,
      colScope: colQuery ? colScope : null,
      colQuery: colQuery || null,
      filters: packList(applied) || null,
      colFilters: activeColFilters.length
        ? JSON.stringify(Object.fromEntries(activeColFilters))
        : null,
      group: packList(g.groupBy) || null,
    });
  }, [urlKey, search, page, pageSize, sort, hidden, colScope, colQuery, applied, activeColFilters, g.groupBy]);

  /* The header's number follows the FILTERED list, so narrowing the list
     narrows the total with it — a total that ignored the filters would be a
     different number from the rows underneath it. */
  React.useEffect(() => {
    if (!onTotalChange) return undefined;
    onTotalChange(
      measureOf === undefined
        ? null
        : formatTotal
          ? formatTotal(g.total ?? 0)
          : `${(g.total ?? 0).toLocaleString()}${measureUnit ? ` ${measureUnit}` : ""}`
    );
    return () => onTotalChange(null);
  }, [onTotalChange, measureOf, formatTotal, measureUnit, g.total]);

  /* A page that no longer exists — the last row on it was filtered away. */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onSort = (key: K) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
    reload();
  };

  const plural = nounPlural ?? `${noun}s`;
  const count = sorted.length;

  /* SELECTION IS SCOPED TO WHAT IS ON SCREEN. "Select all" on a filtered list
     of 3,000 that silently picks up rows nobody has seen is how people delete
     the wrong thing; the header checkbox takes the visible page and no more. */
  const pageIds = g.visibleRows.map(rowId);
  const selectedRows = sorted.filter((r) => selected.has(rowId(r)));
  const clearSelection = () => setSelected(new Set());
  const actions = bulkActions?.(selectedRows, clearSelection) ?? [];

  const appliedSet = React.useMemo(() => new Set(applied), [applied]);
  /** Anything typed — the search, the column search, or a header box. */
  const typed = Boolean(q || cq || activeColFilters.length > 0);
  const typedText = (search || colQuery).trim() || activeColFilters[0]?.[1].trim() || "";

  /* EXPORT ASKS FIRST (Pavan, 2026-10-07) — the same sheet as Delivery
     Orders, listing every narrowing that shapes the file. */
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
      label: searchFields.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim()
        ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }]
        : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: columns.find((c) => c.key === key)?.label ?? key,
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
      const mine = applied.filter((id) => id.startsWith(`${f.key}:`));
      const drop = (ids: string[]) => {
        setApplied((prev) => prev.filter((id) => !ids.includes(id)));
        setPage(1);
      };
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({
          value: id.slice(f.key.length + 1),
          onRemove: () => drop([id]),
        })),
        onRemoveAll: () => drop(mine),
      };
    }),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE ADD BUTTON SITS ON THE VIEW ROW, beside Export, as on every
          list (Pavan, 2026-11-02 — it was at the end of the search row). */}
      <FuelOrdersViewBar
        {...savedViews}
        onExport={exportRow ? () => setExporting(true) : undefined}
        onCreateOrder={onCreate}
        ctaLabel={createLabel ?? `Add New ${noun[0].toUpperCase()}${noun.slice(1)}`}
        ctaDisabledReason={canWrite ? undefined : `You do not have permission to add a ${noun}`}
      />

      <div className="mt-4 flex shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <ListToolbar
            viewToolsInto={bar.into}
            viewStatement={<ViewStatement count={sorted.length} one={noun} many={plural} />}
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
                    searchable: f.searchable,
                  }))}
                  value={appliedSet}
                  countFor={(sel) => narrow(sel).length}
                  onApply={(ids) => {
                    setApplied([...ids]);
                    setPage(1);
                    reload();
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
            /* THE ROW, NOT THE POPOVER. It only makes sense over a table, so
               the map keeps the button pointed at nothing rather than opening
               a row of boxes above pins that have no columns. */
            columnFiltersOpen={view === "table" && colFiltersOpen}
            onToggleColumnFilters={
              view === "table"
                ? () =>
                    setColFiltersOpen((open) => {
                      /* CLOSING THE ROW PUTS THE LIST BACK. Leaving what was
                         typed applying after the boxes have gone would be a
                         narrowing with nothing on screen saying so. */
                      if (open) {
                        setColFilters({});
                        setPage(1);
                      }
                      return !open;
                    })
                : undefined
            }
            columnFilterCount={activeColFilters.length}
            view={view}
            onViewChange={setView}
            mapView={Boolean(renderMap)}
          />
        </div>

      </div>

      {/* ACTIVE FILTERS, SAID OUT LOUD, on the same shelf as the column
          search. The facet panel remembers what was picked, but it is closed —
          and a list that is quietly narrowed is the single most common way
          people conclude their data is missing. Shared with the orders board,
          because a chip row that behaved differently on two lists would be two
          things to learn for one idea. */}
      <FilterChips
        facets={facets}
        selected={appliedSet}
        onChange={(next) => {
          setApplied([...next]);
          setPage(1);
          reload();
        }}
      >
        <ColumnSearchChip
          className=""
          searchFields={searchFields}
          colScope={colScope}
          colQuery={colQuery}
          onClear={() => {
            setColQuery("");
            setPage(1);
          }}
        />
        {/* One chip per header box that has something typed in it — the same
            chip as the column search, because it is the same question. */}
        {activeColFilters.map(([key, value]) => (
          <ColumnSearchChip
            key={key}
            className=""
            searchFields={columns.map((c) => ({ key: c.key, label: c.label }))}
            colScope={key}
            colQuery={value.trim()}
            onClear={() => {
              setColFilters((prev) => ({ ...prev, [key]: "" }));
              setPage(1);
            }}
          />
        ))}
      </FilterChips>

      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full min-h-0">
          {renderMap && view === "map" ? (
            /* THE MAP TAKES THE SORTED ROWS, not the page. A map paginated to
               25 pins is a map of a page, which is not a thing anybody wants —
               and the footer switches to a plain count to match. */
            <div data-view-in="" className="h-full">{renderMap(sorted)}</div>
          ) : count === 0 && !loading && !colFiltersOpen ? (
            /* NOT WHILE THE ROW IS OPEN: the boxes live in the table's header,
               so swapping the table for an empty state would take away the box
               being typed in at the moment it matched nothing. */
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {typed || applied.length > 0 ? <SearchX /> : emptyIcon}
                </EmptyMedia>
                {/* THREE EMPTY STATES, NOT ONE. Nothing here yet, nothing
                    matches what you typed, and nothing matches the filters are
                    three different situations with three different next
                    actions, and one shared sentence would fit none of them. */}
                <EmptyTitle>
                  {typed
                    ? `No ${plural} match your search`
                    : applied.length > 0
                      ? `No ${plural} match these filters`
                      : `No ${plural} yet`}
                </EmptyTitle>
                <EmptyDescription>
                  {typed
                    ? `Nothing found for “${typedText}”. Check the spelling, or search a different column.`
                    : applied.length > 0
                      ? "Try removing a filter — the chips above show what is applied."
                      : `Add your first ${noun} to get started.`}
                </EmptyDescription>
              </EmptyHeader>
              {applied.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setApplied([])}>
                  Clear all filters
                </Button>
              )}
              {applied.length === 0 && !typed && onCreate && canWrite && (
                <Button size="sm" onClick={onCreate}>
                  <Plus />
                  {createLabel ?? `Add New ${noun[0].toUpperCase()}${noun.slice(1)}`}
                </Button>
              )}
            </Empty>
          ) : (
            <ListTable
              topBar={bar.slot}
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
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={openLabel}
              onOpenRow={onOpenRow}
              showColumnFilters={colFiltersOpen}
              columnFilters={colFilters}
              onColumnFilterChange={(key, value) => {
                setColFilters((prev) => ({ ...prev, [key]: value }));
                setPage(1);
              }}
              loading={loading}
              skeletonRows={Math.min(pageSize, 12)}
              selectedIds={bulkActions ? selected : undefined}
              onToggleRow={
                bulkActions
                  ? (id) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                  : undefined
              }
              onToggleAll={
                bulkActions
                  ? (next) =>
                      setSelected((prev) => {
                        const out = new Set(prev);
                        pageIds.forEach((id) => (next ? out.add(id) : out.delete(id)));
                        return out;
                      })
                  : undefined
              }
            />
          )}
        </div>

        {selected.size > 0 && actions.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <div className="pointer-events-auto">
              <BulkActionBar
                count={selected.size}
                noun={noun}
                actions={actions}
                tools={false}
                onClear={clearSelection}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouped, the footer reports the shape of the list; flat, it reports
          the page position — the one number a paged list owes the reader. */}
      <div className="mt-4 shrink-0">
        {renderMap && view === "map" ? (
          <div className="text-sm tabular-nums text-muted-foreground">
            {count} {count === 1 ? noun : plural} on the map
          </div>
        ) : g.grouped ? (
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
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={count}
            onPageChange={(p) => {
              setPage(p);
              reload();
            }}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
              reload();
            }}
          />
        )}
      </div>

      {exportRow && (
        <ExportSheet
          open={exporting}
          onOpenChange={setExporting}
          title={`Export ${plural[0].toUpperCase()}${plural.slice(1)}`}
          noun={plural}
          nounOne={noun}
          count={count}
          filtersControl={
            facets.length > 0 ? (
              <ListFilters
                facets={facets.map((f) => ({
                  key: f.key,
                  label: f.label,
                  options: f.options,
                  searchable: f.searchable,
                }))}
                value={appliedSet}
                countFor={(sel) => narrow(sel).length}
                onApply={(ids) => {
                  setApplied([...ids]);
                  setPage(1);
                }}
                fullWidth
              />
            ) : undefined
          }
          filters={exportFilters}
          onExport={(format) => {
            setExporting(false);
            if (format === "csv") {
              downloadCsv(`${urlKey}-${new Date().toISOString().slice(0, 10)}`,
                sorted.map(exportRow));
              toast.success(`Exported ${count.toLocaleString()} ${count === 1 ? noun : plural}`);
            } else {
              toast.success(
                `Exporting ${count.toLocaleString()} ${count === 1 ? noun : plural} as .${format}`
              );
            }
          }}
        />
      )}
    </div>
  );
}
