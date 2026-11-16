import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { ListFilters, type ListFacet } from "../ListFilters";
import { ColumnSearchChip, FilterChips, ListToolbar, ViewStatement, useViewBar, type ListView } from "../ListToolbar";
import { ListTable, type ListColumn, type ListSort } from "../ListTable";
import { BoardV2 } from "../threepl/BoardV2";
import type { BoardCard, BoardLane } from "../threepl/BrokerBoard";
import { ReadDrawer, ReadField } from "../threepl/DirectoryRecordSheet";
import { DASH } from "../threepl/directoryCore";
import { Status } from "./assetParts";

/*
  A 360 SHEET'S VIEWS — the left half of Asset 360 and Customer 360
  (Pavan, 2026-11-02; shared 2026-11-03 so every Master Data record reads
  the same way).

  Tabs on top are the VIEW. Under them ONE search and ONE Filters for every
  tab — a search typed on one tab holds on the next; a facet applies where
  it means something (a tab lists the facets it has).

  EACH VIEW IS THE FULL LIST UNIT, not a related-records table (Pavan,
  2026-11-02 — "the table unit itself needs to be a full unit … it can
  still have three rows of data only"): the list toolbar with Search by
  column and the column menu beside the switch, `ListTable` (every column
  sorts, moves and resizes; a row opens), the frame filling the height
  whatever the row count, and pagination at its foot. A tab may also show
  as a board by status, or draw its own picture (the asset journey).
*/

/** One row of any view — what it prints per column, its status, its facets. */
export interface ViewRow {
  id: string;
  /** What each column PRINTS — searched, filtered by the header boxes, sorted. */
  text: Record<string, string>;
  /** A sort that is not the printed text — ISO dates, amounts. */
  sort?: Record<string, string | number>;
  status: string;
  /** Facet values other than status, by facet key (e.g. `type`). */
  values?: Record<string, string>;
}

export interface ViewFacet {
  key: string;
  label: string;
  /** The options' order, when it is not alphabetical. */
  order?: readonly string[];
}

export interface ViewTab {
  key: string;
  label: string;
  /** "movement orders" / "movement order" — the view statement and the drawer. */
  noun: string;
  one: string;
  columns: ListColumn<string>[];
  rows: ViewRow[];
  facets: ViewFacet[];
  /** A board by status, beside the table. */
  board?: { lanes: { key: string; color: BoardLane["color"] }[]; card: (r: ViewRow) => BoardCard };
  /** Draws the view instead of a table (no column tools, no pages). */
  custom?: (rows: ViewRow[]) => React.ReactNode;
  /** Over the table — e.g. the activity log's type tiles. */
  above?: (ctx: { all: ViewRow[]; picked: (facet: string) => string[]; toggle: (facet: string, value: string) => void }) => React.ReactNode;
  /** A cell the default (plain text, status pill) does not draw. */
  renderCell?: (r: ViewRow, key: string) => React.ReactNode | undefined;
  /** The drawer's value for a column, when not its printed text. */
  readValue?: (r: ViewRow, key: string) => React.ReactNode | undefined;
  nameOf?: (r: ViewRow) => string;
}

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
const freshTable = (tab: ViewTab): TableState => ({
  sort: null,
  hidden: new Set(),
  order: [],
  widths: {},
  colFilters: {},
  colFiltersOpen: false,
  colScope: tab.columns[0].key,
  colQuery: "",
  page: 1,
  pageSize: 25,
  view: "table",
});

const valueOf = (r: ViewRow, facet: string) => (facet === "status" ? r.status : r.values?.[facet] ?? "");

export function RecordViews({
  resetKey,
  tabs,
  searchPlaceholder,
  historyKey,
  onTabChange,
  initialPicked,
}: {
  /** Facets ticked when the record opens, as `facet:value` ids — a change
   *  opened with failed rows starts on them (Pricing, 2026-11-16). */
  initialPicked?: readonly string[];
  /** Told which tab is showing — the sheet lays itself out per tab. */
  onTabChange?: (key: string) => void;
  /** The record — a different one starts the views afresh. */
  resetKey: string;
  tabs: ViewTab[];
  searchPlaceholder: string;
  historyKey: string;
}) {
  const fresh = React.useCallback(() => Object.fromEntries(tabs.map((t) => [t.key, freshTable(t)])) as Record<string, TableState>, [tabs]);
  const [tabKey, setTabKey] = React.useState(tabs[0].key);
  const [search, setSearch] = React.useState("");
  const [picked, setPicked] = React.useState<ReadonlySet<string>>(() => new Set(initialPicked));
  const [tables, setTables] = React.useState(fresh);
  const [open, setOpen] = React.useState<ViewRow | null>(null);
  React.useEffect(() => {
    setTabKey(tabs[0].key);
    setSearch("");
    setPicked(new Set(initialPicked));
    setTables(fresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new record resets
  }, [resetKey]);

  const def = tabs.find((t) => t.key === tabKey) ?? tabs[0];
  React.useEffect(() => onTabChange?.(def.key), [def.key, onTabChange]);
  const t = tables[def.key] ?? freshTable(def);
  const patch = (next: Partial<TableState>) => setTables((prev) => ({ ...prev, [def.key]: { ...(prev[def.key] ?? freshTable(def)), ...next } }));

  /* SEARCH AND FACETS, SHARED. A facet narrows only the views it belongs to. */
  const q = search.trim().toLowerCase();
  const narrow = (d: ViewTab, sel: ReadonlySet<string> = picked) =>
    d.rows.filter((r) => {
      if (q && !Object.values(r.text).some((v) => v.toLowerCase().includes(q))) return false;
      for (const f of d.facets) {
        const mine = [...sel].filter((id) => id.startsWith(`${f.key}:`)).map((id) => id.slice(f.key.length + 1));
        if (mine.length && !mine.includes(valueOf(r, f.key))) return false;
      }
      return true;
    });

  const facets: ListFacet[] = def.facets.map((f) => {
    const present = new Set(def.rows.map((r) => valueOf(r, f.key)).filter(Boolean));
    return {
      key: f.key,
      label: f.label,
      options: f.order ? f.order.filter((x) => present.has(x)) : [...present].sort(),
      searchable: f.key === "status",
    };
  });
  /* The chips show this view's facets; another view's ticks wait for it. */
  const ofThis = (id: string) => def.facets.some((f) => id.startsWith(`${f.key}:`));
  const mineSel = new Set([...picked].filter(ofThis));
  const setMine = (next: ReadonlySet<string>) => setPicked(new Set([...[...picked].filter((id) => !ofThis(id)), ...next]));

  const cq = t.colQuery.trim().toLowerCase();
  const boxes = Object.entries(t.colFilters).filter(([, v]) => v.trim() !== "");
  const rows = narrow(def).filter(
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
  const custom = Boolean(def.custom);
  const view: ListView = custom ? "list" : def.board ? t.view : "table";
  const nameOf = (r: ViewRow) => def.nameOf?.(r) ?? r.text.id ?? r.id;

  const renderCell = (r: ViewRow, key: string): React.ReactNode => {
    const own = def.renderCell?.(r, key);
    if (own !== undefined) return own;
    if (key === "status") return <Status value={r.status} />;
    const v = r.text[key];
    return v === DASH || v === undefined || v === "" ? (
      <span className="text-sm text-muted-foreground">{DASH}</span>
    ) : (
      <span className="truncate text-sm text-foreground">{v}</span>
    );
  };

  const lanes: BoardLane[] = (def.board?.lanes ?? []).map((l) => ({
    key: l.key,
    title: l.key,
    color: l.color,
    noTotal: true,
    cards: sorted.filter((r) => r.status === l.key).map(def.board!.card),
  }));

  const toggleColumns = def.columns.map((c) => ({ key: c.key, label: c.label }));
  /* The view bar — off app-wide (tools beside the switch), wired like every list. */
  const bar = useViewBar();
  const toggle = (facet: string, value: string) => {
    const id = `${facet}:${value}`;
    const next = new Set(mineSel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setMine(next);
    patch({ page: 1 });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* THE VIEW — the tabs. */}
      <Tabs value={def.key} onValueChange={setTabKey} className="shrink-0">
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-9 w-max justify-start">
            {tabs.map((k) => (
              <TabsTrigger
                key={k.key}
                value={k.key}
                /* BLACK, NOT THE SELECTION ORANGE — as the 3PL quote tabs. */
                className="flex-none gap-1.5 px-2 after:bg-foreground group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground"
              >
                {k.label}
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
          searchPlaceholder={searchPlaceholder}
          filters={
            <ListFilters
              facets={facets}
              value={mineSel}
              countFor={(sel) => narrow(def, new Set([...[...picked].filter((id) => !ofThis(id)), ...sel])).length}
              onApply={(sel) => {
                setMine(sel);
                patch({ page: 1 });
              }}
              historyKey={historyKey}
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
          settings
          columnFilterCount={boxes.length}
          view={view}
          onViewChange={(v) => patch({ view: v })}
          boardView={Boolean(def.board)}
          showGroupBy={false}
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

      {def.above && (
        <div className="mt-4">
          {def.above({
            all: def.rows,
            picked: (facet) => [...mineSel].filter((id) => id.startsWith(`${facet}:`)).map((id) => id.slice(facet.length + 1)),
            toggle,
          })}
        </div>
      )}

      {/* THE FRAME FILLS THE HEIGHT — three rows or three hundred. */}
      <div className="relative mt-4 min-h-48 flex-1">
        {def.custom ? (
          def.custom(sorted)
        ) : view === "board" ? (
          <div data-view-box="" className="h-full overflow-auto">
            <BoardV2 lanes={lanes} lanesInView={4} onOpenCard={(id) => setOpen(sorted.find((r) => r.id === id) ?? null)} />
          </div>
        ) : (
          <ListTable
            key={def.key}
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
            onToggleColumnFilters={() =>
              patch(t.colFiltersOpen ? { colFiltersOpen: false, colFilters: {}, page: 1 } : { colFiltersOpen: true })
            }
            columnFilters={t.colFilters}
            onColumnFilterChange={(key, value) => patch({ colFilters: { ...t.colFilters, [key]: value }, page: 1 })}
          />
        )}
      </div>

      {!custom && (
        <div className="mt-4 shrink-0">
          <TablePagination
            page={t.page}
            pageSize={t.pageSize}
            total={sorted.length}
            onPageChange={(page) => patch({ page })}
            onPageSizeChange={(pageSize) => patch({ pageSize, page: 1 })}
          />
        </div>
      )}

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
                value={def.readValue?.(open, c.key) ?? (c.key === "status" ? <Status value={open.status} /> : open.text[c.key])}
              />
            ))}
          </dl>
        )}
      </ReadDrawer>
    </div>
  );
}
