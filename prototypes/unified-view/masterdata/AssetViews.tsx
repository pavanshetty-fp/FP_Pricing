import * as React from "react";
import { FileText } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { BreakdownPopover } from "../BreakdownCard";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ColumnSearchChip, FilterChips, ListToolbar, ViewStatement, useViewBar, type ListView } from "../ListToolbar";
import { ListTable, TwoLineCell, type ListColumn, type ListSort } from "../ListTable";
import { BoardV2 } from "../threepl/BoardV2";
import type { BoardLane } from "../threepl/BrokerBoard";
import { ReadDrawer, ReadField } from "../threepl/DirectoryRecordSheet";
import { DASH, dateOffset, formatDate, money } from "../threepl/directoryCore";
import type { MdAsset } from "./assets";
import { Status, gal, stamp } from "./assetParts";
import { AssetJourney, journeyMilestones } from "./AssetJourney";
import { ActivityFeed, TypeTiles, type LogItem } from "./AssetActivity";
import { VersionSwitch, useVersion } from "./VersionSwitch";

/*
  ASSET 360 — THE THREE VIEWS (Pavan, 2026-11-02). The journey is a
  timeline, not a table (2026-11-03 — AssetJourney.tsx).

  Tabs on top are the VIEW: Asset movement orders · Asset journey · Asset
  activity log. Under them ONE search and ONE Filters for all three — a
  search typed on one tab holds on the next; a facet applies where it means
  something (Type is the activity log's; Status is every tab's).

  EACH VIEW IS THE FULL LIST UNIT, not a related-records table (Pavan,
  2026-11-02 — "the table unit itself needs to be a full unit … it can
  still have three rows of data only"): the list toolbar with Search by
  column and the column menu beside the switch, `ListTable` (every column
  sorts, moves and resizes; a row opens), the frame filling the height
  whatever the row count, and pagination at its foot. Movement orders also
  show as a board by status.
*/

const EVENT_TYPES = ["Deliveries", "Service", "Equipment", "Billing", "Movement", "Lease", "Asset"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const TABS = ["Asset movement orders", "Asset journey", "Asset activity log"] as const;
type Tab = (typeof TABS)[number];

/** One row of any view — what it prints per column, its status, its type. */
interface ViewRow {
  id: string;
  /** What each column PRINTS — searched, filtered by the header boxes, sorted. */
  text: Record<string, string>;
  /** A sort that is not the printed text — ISO dates. */
  sort?: Record<string, string>;
  status: string;
  type?: EventType;
  /** Movement orders: whether its paper is in. */
  documents?: "Attached" | "Pending";
}


/* ─────────────────────────────────────────────────────────── rows ── */

function movementRows(a: MdAsset): ViewRow[] {
  return a.movements.map((m) => ({
    id: m.id,
    text: { id: m.id, source: m.source, from: m.from, to: m.to, scheduled: formatDate(m.scheduled), status: m.status, documents: m.documents === "Attached" ? "1 document" : DASH },
    sort: { scheduled: m.scheduled },
    status: m.status,
    type: "Movement",
    documents: m.documents,
  }));
}

/** The journey's milestones as rows — so the shared search and Status filter
 *  narrow the timeline exactly as they narrow a table. */
function journeyRows(a: MdAsset): ViewRow[] {
  return journeyMilestones(a).map((m) => ({
    id: m.id,
    text: { date: formatDate(m.date), title: m.title, detail: m.detail, refs: m.refs.join(" "), status: m.state },
    status: m.state,
  }));
}

/**
 * What has happened to the asset, newest first — its history and the real
 * records behind it (deliveries, service orders, inspections, parts fitted,
 * invoices, completed moves, leases). Nothing planned, nothing made up: a
 * row is an event that took place on or before the data's today.
 */
function activityRows(a: MdAsset): ViewRow[] {
  const out: { at: string; type: EventType; source: string; event: string; detail: string; status: string; id: string }[] = [];
  const typeOf = (action: string): EventType =>
    /Fuel delivered/.test(action) ? "Deliveries"
      : /Invoice/.test(action) ? "Billing"
        : /^SO-|overdue/i.test(action) ? "Service"
          : /^AMO-|Movement/.test(action) ? "Movement"
            : /^LA-/.test(action) ? "Lease"
              : /Monitor/.test(action) ? "Equipment"
                : "Asset";
  const day = (iso: string) => `${iso.slice(0, 10)}T08:00:00Z`;
  a.audit.forEach((e) => {
    const type = typeOf(e.action);
    out.push({ id: e.id, at: e.at, type, source: e.by, event: e.action, detail: e.changes.join(" · ") || DASH, status: type === "Deliveries" ? "Delivered" : "Done" });
  });
  a.serviceOrders.forEach((o) =>
    out.push({ id: `so-${o.id}`, at: o.scheduled, type: "Service", source: o.technician, event: `${o.id} · ${o.job}`, detail: o.amount === null ? DASH : money(o.amount), status: o.stage }),
  );
  a.compliance.forEach((c) => {
    if (c.last) out.push({ id: `cp-${c.requirement}`, at: day(c.last), type: "Service", source: c.authority, event: c.requirement, detail: `Next due ${formatDate(c.due)}`, status: c.status });
  });
  a.leakChecks.forEach((l) =>
    out.push({ id: `lc-${l.id}`, at: day(l.date), type: "Service", source: l.technician, event: `${l.id} · Leak check`, detail: `${l.method} · ${l.pressure}`, status: l.result }),
  );
  a.peripherals.forEach((p) =>
    out.push({ id: `pr-${p.id}`, at: day(p.installed), type: "Equipment", source: p.model, event: `${p.type} fitted`, detail: `${p.serial} · warranty to ${formatDate(p.warrantyEnds)}`, status: p.status }),
  );
  a.invoices.forEach((i) =>
    out.push({ id: `in-${i.id}`, at: day(i.issued), type: "Billing", source: "Billing", event: `${i.id} · ${i.serviceOrder}`, detail: `${money(i.total)} · due ${formatDate(i.due)}`, status: i.status }),
  );
  a.movements.forEach((m) => {
    if (m.status === "Completed")
      out.push({ id: `mv-${m.id}`, at: day(m.scheduled), type: "Movement", source: m.source, event: `${m.id} · Moved`, detail: `${m.from} → ${m.to}`, status: m.status });
  });
  a.leases.forEach((l) => {
    if (l.from && l.status !== "Draft")
      out.push({ id: `ls-${l.id}`, at: day(l.from), type: "Lease", source: a.customer ?? DASH, event: `${l.id} · Lease started`, detail: l.committedGal ? `${gal(l.committedGal)} committed` : DASH, status: l.status });
  });
  const today = `${dateOffset(0)}T23:59:59Z`;
  const audit = new Set(a.audit.map((e) => e.id));
  return out
    .filter((r) => audit.has(r.id) || r.at <= today)
    .sort((x, y) => y.at.localeCompare(x.at))
    .map((r) => ({
      id: r.id,
      text: { when: stamp(r.at), type: r.type, source: r.source, event: `${r.event} ${r.detail}`, eventTitle: r.event, detail: r.detail, status: r.status },
      sort: { when: r.at },
      status: r.status,
      type: r.type,
    }));
}

/* ─────────────────────────────────────────────────────────── views ── */

interface TabDef {
  noun: string;
  one: string;
  columns: ListColumn<string>[];
  rows: ViewRow[];
  facets: string[];
}

const COLS: Record<Tab, ListColumn<string>[]> = {
  "Asset movement orders": [
    { key: "id", label: "Movement order", width: 140, sortable: true },
    { key: "source", label: "Source", width: 150, sortable: true },
    { key: "from", label: "From", width: 150, sortable: true },
    { key: "to", label: "To", width: 150, sortable: true },
    { key: "scheduled", label: "Scheduled", width: 120, sortable: true },
    { key: "status", label: "Status", width: 120, sortable: true },
    { key: "documents", label: "Documents", width: 130, sortable: true },
  ],
  /* The timeline draws these; they name what search and Filters read. */
  "Asset journey": [
    { key: "date", label: "Date", width: 130, sortable: true },
    { key: "title", label: "Milestone", width: 260, sortable: true },
    { key: "detail", label: "Detail", width: 220, sortable: true },
    { key: "refs", label: "Records", width: 160, sortable: true },
    { key: "status", label: "Status", width: 110, sortable: true },
  ],
  "Asset activity log": [
    { key: "when", label: "When", width: 200, sortable: true },
    { key: "type", label: "Type", width: 130, sortable: true },
    { key: "source", label: "Source", width: 180, sortable: true },
    { key: "event", label: "Event", width: 300, sortable: true },
    { key: "status", label: "Status", width: 130, sortable: true },
  ],
};

const MOVE_LANES: { key: string; color: BoardLane["color"] }[] = [
  { key: "Draft", color: "grey" },
  { key: "Scheduled", color: "yellow" },
  { key: "In transit", color: "blue" },
  { key: "Completed", color: "green" },
];

/** Per-tab table state — each view keeps its own sort, columns and page. */
interface TableState {
  sort: ListSort<string> | null;
  hidden: Set<string>;
  order: string[];
  widths: Record<string, number>;
  colFilters: Record<string, string>;
  colFiltersOpen: boolean;
  colScope: string;
  colQuery: string;
  page: number;
  pageSize: number;
  view: ListView;
}
const freshTable = (tab: Tab): TableState => ({
  sort: null,
  hidden: new Set(),
  order: [],
  widths: {},
  colFilters: {},
  colFiltersOpen: false,
  colScope: COLS[tab][0].key,
  colQuery: "",
  page: 1,
  pageSize: 25,
  view: "table",
});
const freshTables = () =>
  Object.fromEntries(TABS.map((t) => [t, freshTable(t)])) as Record<Tab, TableState>;

export function AssetViews({ asset: a }: { asset: MdAsset }) {
  const [tab, setTab] = React.useState<Tab>("Asset movement orders");
  const [search, setSearch] = React.useState("");
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(new Set());
  const [tables, setTables] = React.useState(freshTables);
  const [open, setOpen] = React.useState<ViewRow | null>(null);
  React.useEffect(() => {
    setTab("Asset movement orders");
    setSearch("");
    setPicked(new Set());
    setTables(freshTables());
  }, [a.uid]);

  const t = tables[tab];
  const patch = (next: Partial<TableState>) => setTables((prev) => ({ ...prev, [tab]: { ...prev[tab], ...next } }));

  const defs: Record<Tab, TabDef> = {
    "Asset movement orders": { noun: "movement orders", one: "movement order", columns: COLS["Asset movement orders"], rows: movementRows(a), facets: ["status"] },
    "Asset journey": { noun: "placements", one: "placement", columns: COLS["Asset journey"], rows: journeyRows(a), facets: ["status"] },
    "Asset activity log": { noun: "events", one: "event", columns: COLS["Asset activity log"], rows: activityRows(a), facets: ["type", "status"] },
  };

  /* SEARCH AND FACETS, SHARED. A facet narrows only the views it belongs to. */
  const q = search.trim().toLowerCase();
  const narrow = (tabKey: Tab, sel: ReadonlySet<string> = picked) => {
    const d = defs[tabKey];
    return d.rows.filter((r) => {
      if (q && !Object.values(r.text).some((v) => v.toLowerCase().includes(q))) return false;
      for (const f of d.facets) {
        const mine = [...sel].filter((id) => id.startsWith(`${f}:`)).map((id) => id.slice(f.length + 1));
        if (mine.length && !mine.includes(f === "type" ? r.type ?? "" : r.status)) return false;
      }
      return true;
    });
  };

  const def = defs[tab];
  const facets: ListFacet[] = def.facets.map((f) =>
    f === "type"
      ? { key: "type", label: "Type", options: EVENT_TYPES.filter((x) => def.rows.some((r) => r.type === x)) }
      : { key: "status", label: "Status", options: [...new Set(def.rows.map((r) => r.status))].sort(), searchable: true },
  );
  /* The chips show this view's facets; another view's ticks wait for it. */
  const ofThis = (id: string) => def.facets.some((f) => id.startsWith(`${f}:`));
  const mineSel = new Set([...picked].filter(ofThis));
  const setMine = (next: ReadonlySet<string>) => setPicked(new Set([...[...picked].filter((id) => !ofThis(id)), ...next]));

  const cq = t.colQuery.trim().toLowerCase();
  const boxes = Object.entries(t.colFilters).filter(([, v]) => v.trim() !== "");
  const rows = narrow(tab).filter(
    (r) =>
      (!cq || (r.text[t.colScope] ?? "").toLowerCase().includes(cq)) &&
      boxes.every(([k, v]) => (r.text[k] ?? "").toLowerCase().includes(v.trim().toLowerCase())),
  );
  const sorted = t.sort
    ? [...rows].sort((x, y) => {
        const key = t.sort!.key;
        const a1 = x.sort?.[key] ?? x.text[key]?.toLowerCase() ?? "";
        const b1 = y.sort?.[key] ?? y.text[key]?.toLowerCase() ?? "";
        return (a1 < b1 ? -1 : a1 > b1 ? 1 : 0) * (t.sort!.dir === "asc" ? 1 : -1);
      })
    : rows;
  const pageRows = sorted.slice((t.page - 1) * t.pageSize, t.page * t.pageSize);
  const boardable = tab === "Asset movement orders";
  /* THE JOURNEY IS A TIMELINE, not a table (Pavan, 2026-11-03) — so it has
     no column tools and no pages; search and Filters still narrow it. */
  const journey = tab === "Asset journey";
  /* THE LOG IN THREE VERSIONS, to choose from (Pavan, 2026-11-03). */
  const [logV, setLogV] = useVersion("fp-md-asset-log-v");
  const isLog = tab === "Asset activity log";
  const feed = isLog && logV === "2";
  const tiles = isLog && logV === "3";
  const view: ListView = journey || feed ? "list" : boardable ? t.view : "table";
  const toItem = (r: ViewRow): LogItem => ({
    id: r.id,
    at: r.sort?.when ?? "",
    type: r.type ?? "Asset",
    source: r.text.source,
    title: r.text.eventTitle,
    detail: r.text.detail,
    status: r.status,
  });
  const nameOf = (r: ViewRow) => r.text.id ?? r.text.eventTitle ?? r.text.location ?? r.id;

  const renderCell = (r: ViewRow, key: string): React.ReactNode => {
    if (key === "status") return <Status value={r.status} />;
    if (key === "type") return <Pill>{r.text.type}</Pill>;
    if (key === "event") return <TwoLineCell title={r.text.eventTitle} description={r.text.detail} />;
    if (key === "documents")
      return r.documents === "Attached" ? (
        <BreakdownPopover
          className="flex items-center gap-1.5 rounded-md"
          label={`Show documents of ${r.id}`}
          width={320}
          trigger={
            <>
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-foreground">1 document</span>
            </>
          }
          card={{ title: "Documents (1)", rows: [{ label: `${r.id} bill of lading.pdf`, sub: `Bill of lading · ${r.text.source}` }] }}
        />
      ) : (
        <span className="text-sm text-muted-foreground">{DASH}</span>
      );
    const v = r.text[key];
    return v === DASH || v === undefined ? (
      <span className="text-sm text-muted-foreground">{DASH}</span>
    ) : (
      <span className="truncate text-sm text-foreground">{v}</span>
    );
  };

  const lanes: BoardLane[] = MOVE_LANES.map((l) => ({
    key: l.key,
    title: l.key,
    color: l.color,
    noTotal: true,
    cards: sorted
      .filter((r) => r.status === l.key)
      .map((r) => ({
        id: r.id,
        title: r.id,
        badges: [{ label: r.text.source, tone: "neutral" as const }],
        units: [
          { kind: "stack" as const, key: "route", heading: "Route", lines: [{ text: r.text.from, level: 1 as const }, { text: `to ${r.text.to}`, level: 2 as const }] },
          { kind: "inline" as const, key: "when", heading: "Schedule", parts: [], planned: { date: r.text.scheduled } },
          { kind: "rows" as const, key: "asset", heading: "Asset", rows: [{ asset: a.id, product: a.type }] },
        ],
      })),
  }));

  const toggleColumns = def.columns.map((c) => ({ key: c.key, label: c.label }));
  /* The view bar — off app-wide (tools beside the switch), wired like every list. */
  const bar = useViewBar();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* THE VIEW — three tabs. */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="shrink-0">
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-9 w-max justify-start">
            {TABS.map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                /* BLACK, NOT THE SELECTION ORANGE — as the 3PL quote tabs. */
                className="flex-none gap-1.5 px-2 after:bg-foreground group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground"
              >
                {k}
                <span className="text-xs tabular-nums text-muted-foreground">{narrow(k).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* THE LIST TOOLBAR — one search and Filters for every view. */}
      <div className="mt-4 shrink-0">
        <ListToolbar
          viewToolsInto={bar.into}
          viewStatement={<ViewStatement count={sorted.length} one={def.one} many={def.noun} />}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            patch({ page: 1 });
          }}
          searchPlaceholder="Search this asset"
          filters={
            <ListFilters
              facets={facets}
              value={mineSel}
              countFor={(sel) => narrow(tab, new Set([...[...picked].filter((id) => !ofThis(id)), ...sel])).length}
              onApply={(sel) => {
                setMine(sel);
                patch({ page: 1 });
              }}
              historyKey="md-asset-360"
            />
          }
          columns={toggleColumns}
          hiddenColumns={t.hidden}
          columnOrder={t.order}
          onReorderColumns={(order) => patch({ order })}
          onToggleColumn={(k) => {
            const hidden = new Set(t.hidden);
            if (hidden.has(k)) hidden.delete(k);
            else hidden.add(k);
            patch({ hidden });
          }}
          onShowAllColumns={() => patch({ hidden: new Set() })}
          searchFields={toggleColumns}
          colScope={t.colScope}
          onColScopeChange={(colScope) => patch({ colScope, page: 1 })}
          colQuery={t.colQuery}
          onColQueryChange={(colQuery) => patch({ colQuery, page: 1 })}
          columnFiltersOpen={t.colFiltersOpen}
          onToggleColumnFilters={() =>
            patch(t.colFiltersOpen ? { colFiltersOpen: false, colFilters: {}, page: 1 } : { colFiltersOpen: true })
          }
          columnFilterCount={boxes.length}
          view={view}
          onViewChange={(v) => patch({ view: v })}
          boardView={boardable}
          showGroupBy={false}
          afterFilters={isLog ? <VersionSwitch label="Log" value={logV} onChange={setLogV} /> : undefined}
        />
        <FilterChips facets={facets} selected={mineSel} onChange={setMine}>
          <ColumnSearchChip
            searchFields={toggleColumns}
            colScope={t.colScope}
            colQuery={t.colQuery}
            onClear={() => patch({ colQuery: "" })}
          />
        </FilterChips>
      </div>

      {tiles && (
        <div className="mt-4">
          <TypeTiles
            asset={a}
            items={defs["Asset activity log"].rows.map(toItem)}
            picked={[...mineSel].filter((id) => id.startsWith("type:")).map((id) => id.slice(5))}
            onPick={(type) => {
              const id = `type:${type}`;
              const next = new Set(mineSel);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setMine(next);
              patch({ page: 1 });
            }}
          />
        </div>
      )}

      {/* THE FRAME FILLS THE HEIGHT — three rows or three hundred. */}
      <div className="relative mt-4 min-h-[420px] flex-1">
        {feed ? (
          <ActivityFeed items={sorted.map(toItem)} />
        ) : journey ? (
          <AssetJourney
            asset={a}
            milestones={journeyMilestones(a).filter((m) => sorted.some((r) => r.id === m.id))}
          />
        ) : view === "board" ? (
          <div data-view-box="" className="h-full overflow-auto">
            <BoardV2 lanes={lanes} lanesInView={4} onOpenCard={(id) => setOpen(sorted.find((r) => r.id === id) ?? null)} />
          </div>
        ) : (
          <ListTable
            key={tab}
            topBar={bar.slot}
            rows={pageRows}
            columns={def.columns}
            hidden={t.hidden}
            sort={t.sort}
            onSort={(key) =>
              patch({
                page: 1,
                sort: t.sort?.key !== key ? { key, dir: "asc" } : t.sort.dir === "asc" ? { key, dir: "desc" } : null,
              })
            }
            rowId={(r) => r.id}
            renderCell={renderCell}
            actionsKey="actions"
            columnOrder={t.order}
            onReorderColumns={(order) => patch({ order })}
            columnWidths={t.widths}
            onResizeColumns={(widths) => patch({ widths })}
            openLabel={(r) => `Open ${def.one} ${nameOf(r)}`}
            onOpenRow={setOpen}
            showColumnFilters={t.colFiltersOpen}
            columnFilters={t.colFilters}
            onColumnFilterChange={(key, value) => patch({ colFilters: { ...t.colFilters, [key]: value }, page: 1 })}
          />
        )}
      </div>

      {!journey && !feed && <div className="mt-4 shrink-0">
        <TablePagination
          page={t.page}
          pageSize={t.pageSize}
          total={sorted.length}
          onPageChange={(page) => patch({ page })}
          onPageSizeChange={(pageSize) => patch({ pageSize, page: 1 })}
        />
      </div>}

      {/* A ROW OPENS — what it says, in full. */}
      <ReadDrawer
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open ? nameOf(open) : ""}
        subtitle={def.one[0].toUpperCase() + def.one.slice(1)}
      >
        {open && (
          <dl className="flex flex-col gap-4">
            {def.columns.map((c) => (
              <ReadField
                key={c.key}
                label={c.label}
                value={
                  c.key === "status"
                    ? <Status value={open.status} />
                    : c.key === "event"
                      ? `${open.text.eventTitle} · ${open.text.detail}`
                      : open.text[c.key]
                }
              />
            ))}
          </dl>
        )}
      </ReadDrawer>
    </div>
  );
}
