import * as React from "react";
import { toast } from "sonner";
import { CalendarOff, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { AlertBanner, type BannerAlert } from "@/components/ui/alert-banner";
import { dateWindowOf } from "@/components/ui/date-picker";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { HeadFold, displayViewsFor, topBannerClass, useHeadFold, useTopBanner } from "../HeadFold";
import { ListToolbar, ColumnSearchChip, FilterChips, type ListView, useViewBar, ViewStatement } from "../ListToolbar";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ExportSheet, type ExportFilterRow, type ExportSummary } from "../ExportSheet";
import { TERM_ICONS } from "@/components/ui/term-icons";
import { ListTable, TwoLineCell, type ListSort } from "../ListTable";
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
  SOURCE_LABEL,
  STATUS_LABEL,
  changeSummary,
  fmtWhen,
  isSameDay,
  plural,
  scopeOf,
  settingsOf,
  uniq,
  type ChangeRecord,
  type ChangeStatus,
} from "./changeLog";
import { retryChange, useChangeLog } from "./changeLogStore";
import {
  FEED_COLUMNS,
  FEED_GROUP_DIMS,
  STATUS_KIND,
  actionOf,
  customersOf,
  entitiesOf,
  productsOf,
  repricedOf,
  shiptosOf,
  type FeedColumnKey,
} from "./activityFeed";
import { ChangeDialogs, ChangeRowMenu, ChangeSheet, type ChangeAsk } from "./ChangeSheet";
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

const lastWeek = (): DateRange => ({ from: startOfDay(new Date(NOW - 6 * DAY)), to: startOfDay(new Date(NOW)) });
const inWindow = (t: number, r: DateRange) => t >= r.from.getTime() && t < r.to.getTime() + DAY;

export function ActivityFeedScreen() {
  const log = useChangeLog();
  const ents = log.entityMap;
  const [openId, setOpenId] = React.useState<string | null>(null);
  /* An act asked for from a row's ⋯ — the same dialogs the sheet uses. */
  const [rowAsk, setRowAsk] = React.useState<{ id: string; ask: ChangeAsk } | null>(null);
  const [range, setRange] = React.useState<DateRange>(lastWeek);
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
  const [facetSel, setFacetSel] = React.useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  const [snoozedUntil, setSnoozedUntil] = React.useState(0);
  const [appliedAlert, setAppliedAlert] = React.useState<string | null>(null);
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
  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState, storageKey: "pricing-activity-feed" });

  /* WHAT EACH COLUMN PRINTS — search, the column boxes and the sort read it. */
  const columnText = React.useCallback(
    (c: ChangeRecord, key: FeedColumnKey): string => {
      switch (key) {
        case "change":
          return `${changeSummary(c, ents)} ${c.id}`;
        case "action":
          return actionOf(c);
        case "entity":
          return entitiesOf(c).join(", ");
        case "source":
          return SOURCE_LABEL[c.source];
        case "scope": {
          const cs = customersOf(c);
          return `${plural(shiptosOf(c).length, "ship-to")} ${plural(c.lines.length, "price")} ${cs.length === 1 ? cs[0] : plural(cs.length, "customer")}`;
        }
        case "orders":
          return repricedOf(c) ? repricedOf(c).toLocaleString() : "—";
        case "by":
          return c.by;
        case "when":
          return `${fmtWhen(c.effectiveAt)}${c.effectiveAt !== c.madeAt ? ` Made ${fmtWhen(c.madeAt)}` : ""}`;
        case "status":
          return STATUS_LABEL[c.status];
        default:
          return "";
      }
    },
    [ents]
  );
  const sortValue = (c: ChangeRecord, key: FeedColumnKey): string | number => {
    if (key === "when") return c.effectiveAt;
    if (key === "orders") return repricedOf(c);
    if (key === "scope") return shiptosOf(c).length;
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
      { key: "action", label: "Action", options: [...ACTIONS, "Undo"] },
      { key: "entity", label: "Entity", options: SETTINGS.map((s) => SETTING_LABEL[s]) },
      { key: "source", label: "Made via", options: Object.values(SOURCE_LABEL) },
      { key: "status", label: "Status", options: Object.values(STATUS_LABEL) },
      { key: "by", label: "Made by", options: opts("by") },
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
        (c, key) => {
          const cs = customersOf(c);
          switch (key) {
            case "change":
              return [changeSummary(c, ents), c.id];
            case "scope":
              return [plural(shiptosOf(c).length, "ship-to"), `${plural(c.lines.length, "price")} · ${cs.length === 1 ? cs[0] : plural(cs.length, "customer")}`];
            case "when":
              return [fmtWhen(c.effectiveAt), c.effectiveAt !== c.madeAt ? `Made ${fmtWhen(c.madeAt)}` : ""];
            default:
              return [columnText(c, key)];
          }
        },
        ["action", "status"]
      ),
    [log.changes, ents, columnText, textSize]
  );

  const renderCell = (c: ChangeRecord, key: FeedColumnKey) => {
    switch (key) {
      case "change":
        /* THE NAMES, WITH "+N" ON HOVER (Yash, 2026-11-16). */
        return (
          <div className="flex min-w-0 flex-col">
            <ChangeText c={c} ents={ents} className="flex min-w-0 items-center gap-1 text-sm text-foreground" />
            <span className="truncate text-xs text-muted-foreground">{c.id}</span>
          </div>
        );
      case "action":
        return <Pill>{actionOf(c)}</Pill>;
      case "entity":
        return entitiesOf(c).join(", ");
      case "source":
        return SOURCE_LABEL[c.source];
      case "scope": {
        const cs = customersOf(c);
        return (
          <TwoLineCell
            title={plural(shiptosOf(c).length, "ship-to")}
            description={`${plural(c.lines.length, "price")} · ${cs.length === 1 ? cs[0] : plural(cs.length, "customer")}`}
          />
        );
      }
      case "orders":
        return repricedOf(c) ? repricedOf(c).toLocaleString() : "—";
      case "by":
        return c.by;
      case "when":
        return c.effectiveAt !== c.madeAt ? (
          <TwoLineCell title={fmtWhen(c.effectiveAt)} description={`Made ${fmtWhen(c.madeAt)}`} />
        ) : (
          fmtWhen(c.effectiveAt)
        );
      case "status":
        return (
          <StatusChip tone={kindTone(STATUS_KIND[c.status])} variant="text">
            {STATUS_LABEL[c.status]}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  /* WHAT NEEDS ATTENTION — the old page's strip, as the alert banner: failed
     rows, scheduled changes that touch the same rows, and today's schedule.
     Each title applies its filter; its items open the change. */
  const alerts = React.useMemo<BannerAlert[]>(() => {
    const failed = log.changes.filter((c) => c.status === "partlyFailed");
    const scheduled = log.changes.filter((c) => c.status === "scheduled").sort((a, b) => a.effectiveAt - b.effectiveAt);
    const overlaps: [ChangeRecord, ChangeRecord, number][] = [];
    scheduled.forEach((a, i) =>
      scheduled.slice(i + 1).forEach((b) => {
        if (!settingsOf(a).some((s) => settingsOf(b).includes(s))) return;
        const mine = new Set(scopeOf(a));
        const shared = scopeOf(b).filter((id) => mine.has(id)).length;
        if (shared) overlaps.push([a, b, shared]);
      })
    );
    const today = scheduled.filter((c) => isSameDay(c.effectiveAt, NOW));
    const apply = (alertId: string, status: string) => () => {
      setFacetSel(new Set([`status:${status}`]));
      setAppliedAlert(alertId);
      setPage(1);
    };
    const view = (id: string) => (
      <Button variant="outline" size="sm" onClick={() => setOpenId(id)}>
        View
      </Button>
    );
    const list: (BannerAlert | false)[] = [
      failed.length > 0 && {
        id: "failed",
        status: "warning",
        tag: "Needs action",
        title: `${plural(
          failed.reduce((n, c) => n + c.lines.filter((l) => l.outcome === "failed").length, 0),
          "price"
        )} failed to update`,
        count: failed.length,
        onApply: apply("failed", STATUS_LABEL.partlyFailed),
        items: failed.map((c) => ({
          id: c.id,
          title: `${c.title} · ${c.id}`,
          detail: `${c.lines.filter((l) => l.outcome === "failed").length} of ${c.lines.length} rows failed · ran ${fmtWhen(c.effectiveAt)}`,
          onApply: () => setOpenId(c.id),
          action: (
            <span className="flex items-center gap-2">
              {view(c.id)}
              <Button variant="outline" size="sm" onClick={() => retryChange(c.id)}>
                Retry failed prices
              </Button>
            </span>
          ),
        })),
      },
      overlaps.length > 0 && {
        id: "overlap",
        status: "caution",
        tag: "Overlap",
        title: `${plural(overlaps.length * 2, "scheduled change")} change the same rows`,
        count: overlaps.length * 2,
        onApply: apply("overlap", STATUS_LABEL.scheduled),
        items: overlaps.flatMap(([a, b, shared]) =>
          [a, b].map((c, i) => ({
            id: `${c.id}-${i}`,
            title: `${c.title} · ${c.id}`,
            detail: `Runs ${fmtWhen(c.effectiveAt)} · ${shared} shared rows${i === 1 ? " · runs later, so it wins" : ""}`,
            onApply: () => setOpenId(c.id),
            action: view(c.id),
          }))
        ),
      },
      today.length > 0 && {
        id: "today",
        status: "info",
        tag: "Upcoming",
        title: `${plural(today.length, "scheduled change")} ${today.length === 1 ? "runs" : "run"} today`,
        count: today.length,
        onApply: apply("today", STATUS_LABEL.scheduled),
        items: today.map((c) => ({
          id: c.id,
          title: `${c.title} · ${c.id}`,
          detail: `Runs ${fmtWhen(c.effectiveAt)} · ${plural(c.lines.length, "price")}`,
          onApply: () => setOpenId(c.id),
          action: view(c.id),
        })),
      },
    ];
    return list.filter((a): a is BannerAlert => !!a && !dismissed.includes(a.id));
  }, [log.changes, dismissed]);
  const alertVisible = alerts.length > 0 && Date.now() >= snoozedUntil;
  useTopBanner(alertVisible);

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
        setAppliedAlert(null);
        setPage(1);
      }}
      fullWidth={fullWidth}
    />
  );

  const narrowed = q !== "" || cq !== "" || facetSel.size > 0 || activeColFilters.length > 0;
  const fold = useHeadFold();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {alertVisible && (
        <AlertBanner
          className={topBannerClass(fold.collapsed)}
          alerts={alerts}
          appliedId={appliedAlert}
          onClearApplied={() => {
            setFacetSel(new Set());
            setAppliedAlert(null);
            setPage(1);
          }}
          onSnooze={(_id, ms) => setSnoozedUntil(Date.now() + ms)}
          onDismiss={(id) => setDismissed((d) => [...d, id])}
        />
      )}
      <HeadFold collapsed={fold.collapsed}>
        <FuelOrdersViewBar
          {...savedViews}
          {...displayViewsFor({ board: false, map: false }, view, setView)}
          onExport={() => setExporting(true)}
        />
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
            setAppliedAlert(null);
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
                      setAppliedAlert(null);
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
              rowMenu={(c) => <ChangeRowMenu c={c} latest={log.latestId === c.id} onAsk={(ask) => setRowAsk({ id: c.id, ask })} />}
              columnOrder={columnOrder}
              onReorderColumns={setColumnOrder}
              columnWidths={columnWidths}
              onResizeColumns={setColumnWidths}
              openLabel={(c) => `Open change ${c.id}`}
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

      <ChangeSheet id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
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

