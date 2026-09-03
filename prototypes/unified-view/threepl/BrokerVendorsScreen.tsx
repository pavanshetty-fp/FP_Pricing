import * as React from "react";
import { SearchX, Shield, Truck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusChip } from "@/components/ui/status-chip";
import { GroupedListFooter, useGrouping } from "@/components/tables-layout";
import { FuelOrdersViewBar } from "../FuelOrdersViewBar";
import { ListToolbar, ColumnSearchChip, type ListView } from "../ListToolbar";
import { ListFilters } from "../ListFilters";
import { ListTable, OverflowList, TwoLineCell } from "../ListTable";
import { useSavedViews } from "../useSavedViews";
import { VENDOR_GROUP_DIMS } from "./vendorDims";
import {
  BUSINESS_LINES,
  DISTANCE_BANDS,
  SAFETY_BANDS,
  VENDORS,
  VENDOR_COLUMNS,
  VENDOR_SEARCH_FIELDS,
  distanceBand,
  matchesVendor,
  matchesVendorIn,
  safetyBand,
  sortVendors,
  type Vendor,
  type VendorColumnKey,
  type VendorSortState,
} from "./vendors";

/**
 * Vendors / Common Carriers — the delivery partners an order can be sent to.
 *
 * SAME SHELL as the other lists, and NOT DATE-SCOPED for the same reason
 * Customers is not: a carrier carries no date, so the toolbar's date stepper is
 * omitted rather than shown with nothing to scope.
 *
 * WHAT MAKES THIS LIST ITS OWN:
 *
 * • NOTHING SUMS. Safety score and distance belong to one vendor; a summed
 *   distance is meaningless and an average would be a different statistic
 *   sitting where a total goes. The list passes no `measureOf` and its group
 *   headers carry a count alone.
 *
 * • EMAILS ARE EDITED IN THE ROW. §6 makes the per-vendor email toggle the
 *   screen's one real action, and it is a single boolean — opening a sheet to
 *   flip one switch is a round trip for nothing. The switch lives in the cell.
 *
 * • THE FILTERS ARE THE ONES THE ORDER SHEET'S PICKER USES (§5.5): business
 *   lines, safety score RANGE, distance RANGE. Ranges rather than values,
 *   because nobody asks for "safety exactly 88" — and the same bands back the
 *   grouping, so filtering and grouping speak one vocabulary.
 */

const TOGGLE_COLUMNS = VENDOR_COLUMNS.filter((c) => c.label).map((c) => ({
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

export function BrokerVendorsScreen() {
  const [rows, setRows] = React.useState<Vendor[]>(VENDORS);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<VendorSortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [hidden, setHidden] = React.useState<Set<VendorColumnKey>>(new Set());
  const [colScope, setColScope] = React.useState("name");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<ListView>("table");
  /** Applied facet ids, `facetKey:option`. Empty = everything. */
  const [facets, setFacets] = React.useState<string[]>([]);

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
        ? { key: s.sortKey as VendorColumnKey, dir: s.sortDir }
        : null
    );
    setHidden(new Set(s.hidden as VendorColumnKey[]));
    setPageSize(s.pageSize);
    setColScope(s.colScope);
    setColQuery(s.colQuery);
    setPage(1);
  };

  const savedViews = useSavedViews({ current, defaultState, keyOf, apply: applyState });

  const q = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();

  /* A facet with nothing picked narrows nothing; picked options within one
     facet are OR, and the facets are AND — the reading everyone expects of a
     filter panel. */
  const picked = (key: string) =>
    facets.filter((f) => f.startsWith(`${key}:`)).map((f) => f.slice(key.length + 1));

  const filtered = React.useMemo(() => {
    const lines = picked("lines");
    const safety = picked("safety");
    const distance = picked("distance");
    return rows.filter(
      (v) =>
        (!q || matchesVendor(v, q)) &&
        (!cq || matchesVendorIn(v, cq, colScope)) &&
        (lines.length === 0 || v.businessLines.some((l) => lines.includes(l))) &&
        (safety.length === 0 || safety.includes(safetyBand(v.safetyScore))) &&
        (distance.length === 0 || distance.includes(distanceBand(v.distanceMi)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, cq, colScope, facets]);

  const sorted = React.useMemo(() => sortVendors(filtered, sort), [filtered, sort]);

  /* No `measureOf` — see the note at the top. The hook still owns the dimension
     stack, the collapsed set and the suspended pagination. */
  const g = useGrouping<Vendor, VendorColumnKey>({
    dimensions: VENDOR_GROUP_DIMS,
    rows: sorted,
    rowId: React.useCallback((v: Vendor) => v.id, []),
    hiddenColumns: hidden,
    page,
    pageSize,
  });

  const onSort = (key: VendorColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const setEmails = (id: string, on: boolean) =>
    setRows((prev) =>
      prev.map((v) => (v.id === id ? { ...v, emailsEnabled: on } : v))
    );

  const renderCell = (v: Vendor, key: VendorColumnKey) => {
    switch (key) {
      case "name":
        return <TwoLineCell title={v.name} description={v.base} />;
      case "lines":
        return <OverflowList values={v.businessLines} label="business lines" />;
      case "safety":
        /* The shield is the same glyph the order sheet's partner table uses,
           so a score means the same thing in both places. */
        return (
          <span className="flex items-center justify-end gap-1.5 tabular-nums">
            <Shield className="size-3.5 text-muted-foreground" />
            {v.safetyScore}
          </span>
        );
      case "distance":
        return <span className="tabular-nums">{v.distanceMi} mi</span>;
      case "emails":
        /* EDITED IN PLACE. One boolean is not worth a sheet, and the row is
           where someone is already looking when they decide. */
        return (
          <Switch
            checked={v.emailsEnabled}
            onCheckedChange={(on) => setEmails(v.id, on)}
            aria-label={`Email ${v.name}`}
          />
        );
      case "account":
        /* A vendor without an account still works — they acknowledge from the
           emailed link — so this is a fact, not a fault. Neutral, not a warning. */
        return (
          <StatusChip tone={v.hasAccount ? "success" : "neutral"} variant="text">
            {v.hasAccount ? "Has account" : "Link only"}
          </StatusChip>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No CTA. A carrier is onboarded through a contract, not created from a
          list — the spec gives no create flow, so the bar does not invent one. */}
      <FuelOrdersViewBar {...savedViews} />

      <div className="mt-4 shrink-0">
        <ListToolbar
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search vendors, cities, business lines…"
          filters={
            <ListFilters
              facets={[
                { key: "lines", label: "Business Lines", options: [...BUSINESS_LINES] },
                { key: "safety", label: "Safety Score", options: [...SAFETY_BANDS] },
                { key: "distance", label: "Distance", options: [...DISTANCE_BANDS] },
              ]}
              onApply={(ids) => {
                setFacets([...ids]);
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
          searchFields={VENDOR_SEARCH_FIELDS}
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
          searchFields={VENDOR_SEARCH_FIELDS}
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
                <EmptyMedia variant="icon">
                  {q || facets.length > 0 ? <SearchX /> : <Truck />}
                </EmptyMedia>
                <EmptyTitle>No matching vendors</EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `No vendors match “${search.trim()}”.`
                    : "No vendor matches the filters applied."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ListTable
              rows={g.visibleRows}
              nodes={g.grouped ? g.groups.nodes : undefined}
              collapsedGroups={g.collapsed}
              onToggleGroupCollapse={g.toggleGroupCollapse}
              groupNoun="vendor"
              columns={VENDOR_COLUMNS}
              hidden={g.effectiveHidden}
              sort={sort}
              onSort={onSort}
              rowId={(v) => v.id}
              renderCell={renderCell}
              actionsKey="actions"
              openLabel={(v) => `Open vendor ${v.name}`}
            />
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0">
        {g.grouped ? (
          <GroupedListFooter
            groupCount={g.groups.groupCount}
            rowCount={g.groups.rowCount}
            noun="vendor"
            overCounts={g.groups.overCounts}
            allCollapsed={g.allCollapsed}
            onExpandAll={g.expandAll}
            onCollapseAll={g.collapseAll}
          />
        ) : (
          <div className="text-sm text-muted-foreground tabular-nums">
            {sorted.length} {sorted.length === 1 ? "vendor" : "vendors"}
          </div>
        )}
      </div>
    </div>
  );
}
