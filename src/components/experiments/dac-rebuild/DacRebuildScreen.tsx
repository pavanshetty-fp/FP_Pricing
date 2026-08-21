import * as React from "react";
import { KanbanSquare, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  ColumnSearch,
  ColumnVisibility,
  FilterMenu,
  GroupByMenu,
  IconTool,
  PresetTabs,
  ToolDivider,
  ViewSwitch,
} from "./parts";
import { RebuildTable, type SortKey, type SortState } from "./RebuildTable";
import {
  PAGE_SIZES,
  SAMPLE_ROWS,
  type DacColumnKey,
  type DacStatus,
  type GroupByKey,
  type SearchScope,
} from "./data";

/** Status sort order — the pipeline's own order, not alphabetical. */
const STATUS_ORDER: Record<DacStatus, number> = {
  Success: 0,
  Processing: 1,
  Failed: 2,
};

/** Footer row: count (left) · pages (centre) · page size (right). */
function TableFooter({
  first,
  last,
  total,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: {
  first: number;
  last: number;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  // Leading page numbers, an ellipsis, then the last page.
  const lead = Array.from({ length: Math.min(5, pageCount) }, (_, i) => i + 1);
  return (
    <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        Showing {total === 0 ? 0 : first.toLocaleString()}
        {total === 0 ? "" : `-${last.toLocaleString()}`} of{" "}
        {total.toLocaleString()}
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={page === 1}
              className={cn(page === 1 && "pointer-events-none opacity-50")}
              onClick={(e) => {
                e.preventDefault();
                onPage(Math.max(1, page - 1));
              }}
            />
          </PaginationItem>
          {lead.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPage(p);
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          {pageCount > 6 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          {pageCount > 5 && (
            <PaginationItem>
              <PaginationLink
                href="#"
                isActive={pageCount === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPage(pageCount);
                }}
              >
                {pageCount}
              </PaginationLink>
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={page === pageCount}
              className={cn(
                page === pageCount && "pointer-events-none opacity-50"
              )}
              onClick={(e) => {
                e.preventDefault();
                onPage(Math.min(pageCount, page + 1));
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="flex justify-end">
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSize(Number(v))}
        >
          <SelectTrigger size="sm" className="w-[70px]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Board view placeholder — keeps the view switch honest (no dead controls, L5). */
function BoardView() {
  return (
    <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-md border border-border">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KanbanSquare />
          </EmptyMedia>
          <EmptyTitle>Board view</EmptyTitle>
          <EmptyDescription>
            The same records grouped into lanes. Switch back to the table to see
            the full column set.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

/**
 * Data Action Control — from-scratch rebuild (experiment).
 *
 * One content body shared by both screens; `variant` swaps only the toolbar:
 *   • `opt1` — labelled left controls (search field · Filters · Group By).
 *   • `opt2` — icon-only left cluster with the view switch inline.
 *
 * Zone order follows L4 (header → toolbar → data region) and the toolbar follows
 * L3 (data ops left, view switches + the single primary action right).
 */
export function DacRebuildScreen({ variant }: { variant: "opt1" | "opt2" }) {
  const compact = variant === "opt2";

  const [views, setViews] = React.useState(["Default"]);
  const [activeView, setActiveView] = React.useState("Default");

  const [search, setSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<Set<DacStatus>>(new Set());
  const [groupBy, setGroupBy] = React.useState<GroupByKey>("none");
  const [view, setView] = React.useState<"table" | "board">("table");
  const [colScope, setColScope] = React.useState<SearchScope>("all");
  const [colQuery, setColQuery] = React.useState("");
  const [hidden, setHidden] = React.useState<Set<DacColumnKey>>(new Set());
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [enabledOverride, setEnabledOverride] = React.useState<Record<string, boolean>>({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const rows = React.useMemo(
    () =>
      SAMPLE_ROWS.map((r) =>
        r.id in enabledOverride ? { ...r, enabled: enabledOverride[r.id] } : r
      ),
    [enabledOverride]
  );

  /* ---- filter: global search, column-scoped search, status facets ---- */
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const cq = colQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      if (q) {
        const hay = `${r.status} ${r.title} ${r.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (cq) {
        const scoped =
          colScope === "static"
            ? r.status
            : colScope === "descriptive"
              ? `${r.title} ${r.description}`
              : `${r.status} ${r.title} ${r.description}`;
        if (!scoped.toLowerCase().includes(cq)) return false;
      }
      return true;
    });
  }, [rows, search, colQuery, colScope, statusFilter]);

  /* ---- sort: explicit sort wins; Group By otherwise clusters by its key ---- */
  const sorted = React.useMemo(() => {
    const out = [...filtered];
    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      out.sort((a, b) =>
        sort.key === "static"
          ? (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir
          : (Number(a.enabled) - Number(b.enabled)) * dir
      );
    } else if (groupBy === "status") {
      out.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    }
    return out;
  }, [filtered, sort, groupBy]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = React.useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
    );

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllOnPage = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  const toggleColumn = (key: DacColumnKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const addView = () => {
    const name = `View ${views.length}`;
    setViews((v) => [...v, name]);
    setActiveView(name);
  };

  /* ---- the search field, shared shape; Opt 2 reveals it from an icon ---- */
  const searchField = (
    <div className={cn("relative", compact ? "w-[220px]" : "w-[320px]")}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus={compact}
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        onBlur={() => {
          if (compact && !search) setSearchOpen(false);
        }}
        placeholder="Search…"
        aria-label="Search all columns"
        className={cn("h-8 pl-8", search && "pr-8")}
      />
      {search && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setSearch("");
            if (compact) setSearchOpen(false);
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );

  const columnTools = (
    <>
      <ColumnSearch
        scope={colScope}
        onScopeChange={setColScope}
        query={colQuery}
        onQueryChange={(v) => {
          setColQuery(v);
          setPage(1);
        }}
      />
      <ColumnVisibility hidden={hidden} onToggle={toggleColumn} />
    </>
  );

  const createCta = (
    <Button size="sm">
      <Plus />
      Create Form
    </Button>
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Zone 1 — preset-view tabs, flush under the compact header. */}
        <PresetTabs
          views={views}
          active={activeView}
          onSelect={setActiveView}
          onAdd={addView}
        />

        {/* Zone 2 — toolbar: data ops left, view + column tools + CTA right (L3). */}
        {compact ? (
          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              {searchOpen || search ? (
                searchField
              ) : (
                <IconTool label="Search" onClick={() => setSearchOpen(true)}>
                  <Search />
                </IconTool>
              )}
              <FilterMenu
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                compact
              />
              <GroupByMenu value={groupBy} onChange={setGroupBy} compact />
              <ToolDivider />
              <ViewSwitch value={view} onChange={setView} />
            </div>
            <div className="flex items-center gap-1">
              {columnTools}
              {createCta}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {searchField}
              <FilterMenu
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              />
              <GroupByMenu value={groupBy} onChange={setGroupBy} />
            </div>
            <div className="flex items-center gap-1">
              <ViewSwitch value={view} onChange={setView} />
              <ToolDivider />
              {columnTools}
              <ToolDivider />
              {createCta}
            </div>
          </div>
        )}

        {/* Zone 3 — the data region. */}
        {view === "table" ? (
          <RebuildTable
            rows={pageRows}
            hidden={hidden}
            sort={sort}
            onSort={onSort}
            selected={selected}
            onSelect={toggleSelected}
            onSelectAll={selectAllOnPage}
            onToggleEnabled={(id) =>
              setEnabledOverride((prev) => ({
                ...prev,
                [id]: !(rows.find((r) => r.id === id)?.enabled ?? false),
              }))
            }
          />
        ) : (
          <BoardView />
        )}

        <TableFooter
          first={(safePage - 1) * pageSize + 1}
          last={Math.min(safePage * pageSize, total)}
          total={total}
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

export function DacRebuildOpt1() {
  return <DacRebuildScreen variant="opt1" />;
}

export function DacRebuildOpt2() {
  return <DacRebuildScreen variant="opt2" />;
}
