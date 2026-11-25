import * as React from "react";
import { toast } from "sonner";
import { CalendarOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { HeadFold, displayViewsFor, useHeadFold } from "../HeadFold";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ExportSheet, type ExportFilterRow, type ExportSummary } from "../ExportSheet";
import { TERM_ICONS } from "@/components/ui/term-icons";
import { ListTable, type ListSort } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import { KIND_TONE, kindTone } from "../statusKind";
import { DateRangeFilter, type DateRange } from "../threepl/DateRangeFilter";
import { dateKeyOf, startOfDay } from "../data";
import {
  ACTIONS,
  DAY,
  NOW,
  SETTINGS,
  SETTING_LABEL,
  editAction,
  editSummary,
  SOURCE_LABEL,
  STATUS_LABEL,
  changeSummary,
  fmtWhen,
  customerOf,
  plural,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ChangeStatus,
} from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { OtherCustomers, ShiptoCount } from "./customerShiptoParts";
import { peekTrail } from "./pricingNav";
import {
  FEED_COLUMNS,
  FEED_GROUP_DIMS,
  STATUS_KIND,
  actionOf,
  assignmentOf,
  customersOf,
  repricedOf,
  scopeOf,
  scopedChange,
  entitiesOf,
  productsOf,
  shiptosOf,
  type FeedColumnKey,
} from "./activityFeed";
import { ChangeDialogs, ChangeSheet, InfoFigure, type ChangeAsk } from "./ChangeSheet";
import { FIGURE_STRIP } from "../masterdata/sheetParts";

/** Where a change came from, as the Contributors figure counts it. */
const CHANNEL: Record<ChangeRecord["source"], string> = {
  shiptoInline: "UI",
  shiptoBulk: "UI",
  customer: "UI",
  setup: "UI",
  import: "Bulk upload",
};
import { fitColumns } from "./fitColumns";
import { ChangeText } from "./ChangeText";

/*
  CHANGE LOG › ACTIVITY FEED (Yash, 2026-11-16) — the old Pricing prototype's
  Change history page on the Unified View list. Laid out as Customers (the
  table-only list with Group by), plus the date window Sales › Orders has, so
  it is the List page template, not the standard list (which has neither).

  THE WINDOW: changes that took effect in it. A SCHEDULED change shows whatever
  the window, as it did in the old page — it is the one kind that has not
  happened yet and must not drop out of sight.

  No create CTA: a change is made where pricing is edited, never here. A row
  opens the change; what can be done to it is on its sheet.
*/

const TOGGLE_COLUMNS = FEED_COLUMNS.filter((c) => c.label).map((c) => ({ key: c.key, label: c.label }));

/** Values per facet — what Filters and the chips read. */
const FACET_VALUES: Record<string, (c: ChangeRecord) => string[]> = {
  action: (c) => [actionOf(c)],
  entity: entitiesOf,
  source: (c) => [SOURCE_LABEL[c.source]],
  assignment: (c) => [assignmentOf(c)],
  status: (c) => [STATUS_LABEL[c.status]],
  by: (c) => [c.by],
  customer: customersOf,
  shipto: shiptosOf,
  product: productsOf,
};

interface ViewState {
  mode?: ListView;
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc" | null;
  hidden: string[];
  pageSize: number;
  colScope: string;
  colQuery: string;
  colFilters?: Record<string, string>;
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  facets?: string[];
}

const keyOf = (s: ViewState) =>
  JSON.stringify({
    ...s,
    mode: s.mode ?? "table",
    hidden: [...s.hidden].sort(),
    facets: [...(s.facets ?? [])].sort(),
    colFilters: Object.fromEntries(
      Object.entries(s.colFilters ?? {})
        .filter(([, v]) => v.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
    ),
  });

const inWindow = (t: number, r: DateRange) => t >= r.from.getTime() && t < r.to.getTime() + DAY;

export function ActivityFeedScreen() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* An act asked for from a row's ⋯ — the same dialogs the sheet uses. */
  const [rowAsk, setRowAsk] = React.useState<{ id: string; ask: ChangeAsk } | null>(null);
  /* OPENED FROM A RECORD'S VIEW ALL — filtered to it (pricingNav.ts; Yash,
     2026-11-17). */
  const trail = React.useRef(peekTrail()).current;
  /* ALL DATES BY DEFAULT (Yash, 2026-11-17) — a logbook opens on everything;
     a range or a single day is picked from the date control. */
  /* LAST 30 DAYS BY DEFAULT (Yash, 2026-11-18) — the summary above the
     list reads a month; "All dates" is one pick away. */
  const last30 = (): DateRange => ({ from: startOfDay(new Date(NOW - 29 * DAY)), to: startOfDay(new Date(NOW)) });
  const [range, setRange] = React.useState<DateRange>(last30);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<ListSort<FeedColumnKey> | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<FeedColumnKey>>(new Set());
  const [colScope, setColScope] = React.useState("change");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [colFiltersOpen, setColFiltersOpen] = React.useState(false);
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(() => new Set(trail ? [trail.facet] : []));
  /* ONE CUSTOMER OR SHIP-TO PICKED — counts speak for it only. */
  const scope = React.useMemo(() => scopeOf(facetSel), [facetSel]);
  const [peek, setPeek] = React.useState<{ id: string; customer: string } | null>(null);

  const [exporting, setExporting] = React.useState(false);
  const activeColFilters = React.useMemo(() => Object.entries(colFilters).filter(([, v]) => v.trim() !== ""), [colFilters]);

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
      colScope: "change",
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
    setSort(s.sortKey && s.sortDir ? { key: s.sortKey as FeedColumnKey, dir: s.sortDir } : null);
    setHidden(new Set(s.hidden as FeedColumnKey[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    const filters = s.colFilters ?? {};
    setColFilters(filters);
    setColFiltersOpen(Object.values(filters).some((v) => v.trim() !== ""));
    setColumnOrder(s.columnOrder ?? []);
    setColumnWidths(s.columnWidths ?? {});
    setFacetSel(new Set(s.facets ?? []));
    setPage(1);
  };
  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: "pricing-activity-feed", restore: !trail });

  /* WHAT EACH COLUMN PRINTS — search, the column boxes and the sort read it. */
  const columnText = React.useCallback(
    (c: ChangeRecord, key: FeedColumnKey): string => {
      switch (key) {
        case "when":
          return fmtWhen(c.effectiveAt);
        case "id":
          return c.id;
        case "entity":
          return entitiesOf(c).join(", ");
        case "action":
          return actionOf(c);
        case "by":
          return c.by;
        case "source":
          return SOURCE_LABEL[c.source];
        case "assignment":
          return assignmentOf(c);
        case "customers": {
          const cs = customersOf(c);
          if (scope) {
            const mine = customersOf(scopedChange(c, scope))[0] ?? scope.customer ?? cs[0] ?? "—";
            const others = cs.filter((n) => n !== mine).length;
            return others ? `${mine} +${plural(others, "customer")}` : mine;
          }
          return cs.length === 1 ? cs[0] : cs.length ? plural(cs.length, "customer") : "—";
        }
        case "shiptos": {
          const n = shiptosOf(scopedChange(c, scope)).length;
          return n ? n.toLocaleString() : "—";
        }
        case "orders": {
          const n = repricedOf(scopedChange(c, scope));
          return n ? n.toLocaleString() : "—";
        }
        case "change":
          return changeSummary(c, ents);
        case "status":
          return STATUS_LABEL[c.status];
        default:
          return "";
      }
    },
    [ents, scope]
  );
  const sortValue = (c: ChangeRecord, key: FeedColumnKey): string | number => {
    if (key === "when") return c.effectiveAt;
    if (key === "id") return Number(c.id.replace(/\D/g, ""));
    if (key === "orders") return repricedOf(scopedChange(c, scope));
    if (key === "shiptos") return shiptosOf(scopedChange(c, scope)).length;
    return columnText(c, key).toLowerCase();
  };

  /* THE FACETS — the old page's eight. */
  const facets = React.useMemo<ListFacet[]>(() => {
    const opts = (k: string) => uniq(log.changes.flatMap(FACET_VALUES[k])).sort();
    return [
      /* CUSTOMER · SHIP-TO · PRODUCT FIRST in every Pricing filter (Yash, 2026-11-16). */
      { key: "customer", label: "Customer", options: opts("customer"), searchable: true },
      { key: "shipto", label: "Ship-to", options: opts("shipto"), searchable: true },
      { key: "product", label: "Product", options: opts("product"), searchable: true },
      { key: "action", label: "Action", options: ACTIONS },
      { key: "entity", label: "Artifact", options: SETTINGS.map((s) => SETTING_LABEL[s]) },
      { key: "source", label: "Change via", options: Object.values(SOURCE_LABEL) },
      { key: "status", label: "Status", options: Object.values(STATUS_LABEL) },
      { key: "by", label: "Change by", options: opts("by") },
    ];
  }, [log.changes]);

  const windowed = React.useMemo(
    () => log.changes.filter((c) => c.status === "scheduled" || inWindow(c.effectiveAt, range)),
    [log.changes, range]
  );
  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const searched = React.useMemo(
    () =>
      windowed.filter(
        (c) =>
          (!q || TOGGLE_COLUMNS.some((col) => columnText(c, col.key).toLowerCase().includes(q))) &&
          (!cq || columnText(c, colScope as FeedColumnKey).toLowerCase().includes(cq)) &&
          activeColFilters.every(([key, value]) =>
            columnText(c, key as FeedColumnKey).toLowerCase().includes(value.trim().toLowerCase())
          )
      ),
    [windowed, q, cq, colScope, activeColFilters, columnText]
  );
  /* Facets AND across, OR within one. */
  const narrowFacets = React.useCallback(
    (sel: ReadonlySet<string>) => {
      if (sel.size === 0) return searched;
      const byFacet = new Map<string, string[]>();
      for (const id of sel) {
        const i = id.indexOf(":");
        const k = id.slice(0, i);
        byFacet.set(k, [...(byFacet.get(k) ?? []), id.slice(i + 1)]);
      }
      return searched.filter((c) => [...byFacet].every(([k, vs]) => FACET_VALUES[k](c).some((v) => vs.includes(v))));
    },
    [searched]
  );
  const filtered = React.useMemo(() => narrowFacets(facetSel), [narrowFacets, facetSel]);
  const sorted = React.useMemo(() => {
    if (!sort) return [...filtered].sort((a, b) => b.effectiveAt - a.effectiveAt);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [filtered, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const bar = useViewBar();
  const g = useGrouping<ChangeRecord, FeedColumnKey>({
    dimensions: FEED_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((r: ChangeRecord) => r.id, []),
    measureOf: React.useCallback((r: ChangeRecord) => r.lines.length, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  const onSort = (key: FeedColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  /* WIDTHS FROM WHAT EACH COLUMN PRINTS (UX-45) — every change, so the
     columns hold still while the list narrows. */
  const textSize = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).fontSize;
  const columns = React.useMemo(
    () =>
      fitColumns(
        FEED_COLUMNS,
        log.changes,
        (c, key) => [columnText(c, key)],
        ["action", "status"]
      ).map((col) =>
        /* THE CHANGE COLUMN STOPS AT 280 (Yash, 2026-11-17: "too much") — a
           longer change cuts off with "…"; the full text is on hover and in
           the opened change. */
        col.key === "change" ? { ...col, width: Math.min(col.width ?? 280, 280) } : col
      ),
    [log.changes, ents, columnText, textSize]
  );

  const renderCell = (c: ChangeRecord, key: FeedColumnKey) => {
    switch (key) {
      case "action":
        return <Pill>{actionOf(c)}</Pill>;
      case "customers": {
        const cs = customersOf(c);
        /* ON ONE CUSTOMER'S FEED: that customer, then "(2 other customers)"
           — pressed, the others, each with its Activity (Yash, 2026-11-18). */
        if (scope) {
          const mine = customersOf(scopedChange(c, scope))[0] ?? scope.customer ?? cs[0] ?? "—";
          const others = cs.filter((n) => n !== mine);
          return (
            /* "+2 CUSTOMERS" ON THE LINE BELOW (Yash, 2026-11-18). */
            <span className="flex min-w-0 flex-col items-start text-sm">
              <Clip text={mine} />
              {others.length > 0 && (
                <OtherCustomers
                  rows={others.map((name) => ({
                    name,
                    shiptos: uniq(c.lines.filter((l) => customerOf(l.customerId).name === name).map((l) => l.shiptoId)).length,
                  }))}
                  onActivity={(name) => setPeek({ id: c.id, customer: name })}
                />
              )}
            </span>
          );
        }
        if (cs.length !== 1 || !c.lines.length) return cs.length > 1 ? <AffectedCount c={c} kind="customers" label={plural(cs.length, "customer")} /> : <Clip text={columnText(c, key)} />;
        return <Clip text={cs[0]} />;
      }
      case "shiptos": {
        const sc = scopedChange(c, scope);
        return sc.lines.length ? <AffectedCount c={sc} kind="shiptos" label={shiptosOf(sc).length.toLocaleString()} /> : "—";
      }
      case "change":
        /* THE NAMES, WITH "+N" ON HOVER (Yash, 2026-11-16). */
        /* SEVERAL EDITS GO TO A SECOND LINE (Yash, 2026-11-17) — two on the
           first, the rest under them, each line cut off at the column. */
        if (c.edits.length > 1 && !c.undoOf && !c.resets && !c.configures) {
          const each = c.edits.map((e) => `${SETTING_LABEL[e.setting]} ${editAction(e).toLowerCase()}: ${editSummary(e, c.lines, ents)}`);
          return (
            <span className="flex min-w-0 flex-col text-sm text-foreground" title={columnText(c, key)}>
              <span className="truncate">{each.slice(0, 2).join(" · ")}</span>
              <span className="truncate">{each.slice(2).join(" · ")}</span>
            </span>
          );
        }
        return (
          <span className="block min-w-0" title={columnText(c, key)}>
            <ChangeText plain c={c} ents={ents} className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-sm text-foreground [&>span]:shrink-0 [&>span:last-child]:min-w-0 [&>span:last-child]:shrink [&>span:last-child]:truncate" />
          </span>
        );
      case "status":
        return (
          <StatusChip tone={kindTone(STATUS_KIND[c.status])} variant="text">
            {STATUS_LABEL[c.status]}
          </StatusChip>
        );
      default:
        return columnText(c, key);
    }
  };

  /* NO ATTENTION BANNER (Yash, 2026-11-17) — every change applies on the
     spot and succeeds for now, so there is nothing scheduled or failed to
     flag. */

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
      values: search.trim() ? [{ value: search.trim(), onRemove: () => { setSearch(""); setPage(1); } }] : [],
    },
    {
      key: "colSearch",
      label: TOGGLE_COLUMNS.find((f) => f.key === colScope)?.label ?? "Column",
      values: colQuery.trim() ? [{ value: colQuery.trim(), onRemove: () => { setColQuery(""); setPage(1); } }] : [],
    },
    ...activeColFilters.map(([key, value]) => ({
      key: `col:${key}`,
      label: FEED_COLUMNS.find((c) => c.key === key)?.label ?? key,
      values: [{ value: value.trim(), onRemove: () => { setColFilters((prev) => ({ ...prev, [key]: "" })); setPage(1); } }],
    })),
    ...facets.map((f) => {
      const mine = [...facetSel].filter((id) => id.startsWith(`${f.key}:`));
      return {
        key: f.key,
        label: f.label,
        values: mine.map((id) => ({ value: id.slice(id.indexOf(":") + 1), onRemove: () => dropFacets([id]) })),
        onRemoveAll: () => dropFacets(mine),
      };
    }),
  ];

  /* THE EXPORT SUMMARY — as Sales › Orders and 3PL Delivery Orders: the
     file's reach, then its changes by status. */
  const exportSummary = React.useMemo((): ExportSummary => {
    const lines = sorted.flatMap((c) => c.lines);
    return {
      tilesTitle: "Overview",
      tiles: [
        { label: "Ship-tos", value: uniq(lines.map((l) => l.shiptoId)).length.toLocaleString(), icon: TERM_ICONS.shipTos },
        { label: "Customers", value: uniq(lines.map((l) => l.customerId)).length.toLocaleString(), icon: TERM_ICONS.customers },
        { label: "Products", value: uniq(lines.map((l) => l.productId)).length.toLocaleString(), icon: TERM_ICONS.products },
      ],
      breakdown: {
        title: "By status",
        parts: (Object.keys(STATUS_LABEL) as ChangeStatus[])
          .map((st) => ({ label: STATUS_LABEL[st], count: sorted.filter((c) => c.status === st).length, tone: KIND_TONE[STATUS_KIND[st]] }))
          .filter((p) => p.count > 0),
      },
    };
  }, [sorted]);

  /* THE PICKER'S "All dates" AND LIVE COUNT — read off every change's day. */
  const dateWindow = React.useMemo(
    () => dateWindowOf(log.changes.map((c) => dateKeyOf(new Date(c.effectiveAt)))),
    [log.changes]
  );
  const setWindow = (next: DateRange) => {
    setRange(next);
    setPage(1);
  };
  const dateControl = (
    <DateRangeFilter {...dateWindow} noun="changes" value={range} onChange={setWindow} />
  );
  const filtersControl = (fullWidth?: boolean) => (
    <ListFilters
      facets={facets}
      value={facetSel}
      countFor={(sel) => narrowFacets(sel).length}
      onApply={(sel) => {
        setFacetSel(sel);
        setPage(1);
      }}
      fullWidth={fullWidth}
    />
  );

  const narrowed = q !== "" || cq !== "" || facetSel.size > 0 || activeColFilters.length > 0;

  /* THE PERIOD AT A GLANCE (Yash, 2026-11-18) — four figures over what the
     list shows (dates and filters), each defined behind its ⓘ. */
  const summary = React.useMemo(() => {
    const cut = filtered.map((c) => scopedChange(c, scope));
    /* ASSIGNED OR INHERITED (Yash, 2026-11-18) — inherited is made on
       customer pricing and flows down; everything else, setup included,
       is assigned. */
    const inheritedEvents = filtered.filter((c) => assignmentOf(c) === "Inherited").length;
    const impacts = cut.reduce((n, c) => n + shiptosOf(c).length, 0);
    const inherited = cut.filter((c) => assignmentOf(c) === "Inherited").reduce((n, c) => n + shiptosOf(c).length, 0);
    const touched = uniq(cut.flatMap((c) => c.lines.map((l) => l.shiptoId))).length;
    const inScope = (customerId: string, shiptoId: string) =>
      !scope || (scope.shipto ? shiptoOf(shiptoId).name === scope.shipto : customerOf(customerId).name === scope.customer);
    const configured = uniq(log.rows.filter((r) => r.configured && inScope(r.customerId, r.shiptoId)).map((r) => r.shiptoId)).length;
    const channels = uniq(filtered.map((c) => CHANNEL[c.source]));
    return { events: filtered.length, inheritedEvents, impacts, inherited, touched, configured, channels };
  }, [filtered, scope, log.rows]);
  const fold = useHeadFold();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HeadFold collapsed={fold.collapsed}>
        <FuelOrdersViewBar
          {...savedViews}
          {...displayViewsFor({ board: false, map: false }, view, setView)}
          onExport={() => setExporting(true)}
        />
        <div className={cn(FIGURE_STRIP, "mt-4")}>
          <InfoFigure
            label="Change events"
            info={<p>The number of changes made during this period. A bulk update counts as one change event.</p>}
            value={summary.events.toLocaleString()}
            note={`${(summary.events - summary.inheritedEvents).toLocaleString()} direct · ${summary.inheritedEvents.toLocaleString()} inherited`}
          />
          <InfoFigure
            label="Ship-to impacts"
            info={
              <p>
                The total number of ship-to-level changes applied during this period. One change can affect multiple ship-tos, including
                through inheritance.
              </p>
            }
            value={summary.impacts.toLocaleString()}
            note={`${summary.inherited.toLocaleString()} inherited`}
          />
          <InfoFigure
            label="Ship-tos touched"
            info={<p>The number of unique ship-tos affected during this period, regardless of how many changes each received.</p>}
            value={summary.touched.toLocaleString()}
            note={`of ${summary.configured.toLocaleString()} configured`}
          />
          <InfoFigure
            label="Contributors"
            info={<p>The sources that made changes during this period, such as the UI, API, bulk upload, or system.</p>}
            value={summary.channels.length.toLocaleString()}
            note={summary.channels.join(" · ") || "—"}
          />
        </div>
      </HeadFold>

      <div className={fold.gap}>
        <ListToolbar
          viewSwitch={false}
          headCollapse={fold.headCollapse}
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one="change" many="changes" />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search changes, customers, ship-tos…"
          filters={filtersControl()}
          dateControl={dateControl}
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
          searchFields={TOGGLE_COLUMNS}
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
          columnFiltersOpen={view === "table" && colFiltersOpen}
          settings
          columnFilterCount={activeColFilters.length}
          view={view}
          onViewChange={setView}
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
            searchFields={TOGGLE_COLUMNS}
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
          {sorted.length === 0 && !(view === "table" && colFiltersOpen) ? (
            /* THE EMPTY STATE SAYS ITS CAUSE (UX-34): nothing matches the
               narrowing, or nothing in this date window. */
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">{narrowed ? <SearchX /> : <CalendarOff />}</EmptyMedia>
                <EmptyTitle>{narrowed ? "No matching changes" : "No changes in these dates"}</EmptyTitle>
                <EmptyDescription>
                  {narrowed
                    ? `${plural(windowed.length, "change")} in these dates. Clear the search or a filter to see them.`
                    : `${plural(log.changes.length, "change")} in all.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (narrowed) {
                      setSearch("");
                      setColQuery("");
                      setColFilters({});
                      setFacetSel(new Set());
                    } else if (dateWindow.all) setRange(dateWindow.all);
                    setPage(1);
                  }}
                >
                  {narrowed ? "Clear all" : "Show all dates"}
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
              groupNoun="change"
              groupUnit="prices"
              columns={columns}
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
              openLabel={(c) => `Open change made ${fmtWhen(c.effectiveAt)}`}
              onOpenRow={(c) => setOpenId(c.id)}
              showColumnFilters={colFiltersOpen}
              onToggleColumnFilters={() =>
                setColFiltersOpen((open) => {
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

      <ExportSheet
        open={exporting}
        onOpenChange={setExporting}
        title="Export changes"
        noun="changes"
        nounOne="change"
        count={sorted.length}
        range={{ value: range, onChange: setWindow, ...dateWindow }}
        filtersControl={filtersControl(true)}
        summary={exportSummary}
        filters={exportFilters}
        onExport={(format) => {
          setExporting(false);
          toast.success(`Exporting ${plural(sorted.length, "change")} as .${format}`);
        }}
      />

      <ChangeSheet id={openId} scope={scope} onClose={() => setOpenId(null)} onOpen={setOpenId} />
      {/* AN OTHER CUSTOMER'S VIEW ACTIVITY — the change as it reached that
          customer, as a full page; closing it is back on this feed (Yash,
          2026-11-18). */}
      {peek && (
        <ChangeSheet id={peek.id} scope={{ customer: peek.customer }} presentation="full" onClose={() => setPeek(null)} onOpen={() => {}} />
      )}

      <ChangeDialogs
        change={log.changes.find((x) => x.id === rowAsk?.id) ?? null}
        ask={rowAsk?.ask ?? null}
        onClose={() => setRowAsk(null)}
        onUndone={setOpenId}
      />

      <div className={cn("mt-4 shrink-0")}>
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="change"
            total={g.total}
            unit="prices"
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


/** Fixed-width names cut off with "…" (UX-45). */
function Clip({ text }: { text: string }) {
  return (
    <span className="block min-w-0 truncate" title={text}>
      {text}
    </span>
  );
}

/** A count of who a change reached; it opens them on a side sheet. */
function AffectedCount({ c, kind, label }: { c: ChangeRecord; kind: "customers" | "shiptos"; label: string }) {
  return (
    <ShiptoCount
      inCell
      kind={kind}
      lines={c.lines}
      label={label}
      title={kind === "customers" ? "Customers affected" : "Ship-tos affected"}
      subtitle={c.title}
    />
  );
}
