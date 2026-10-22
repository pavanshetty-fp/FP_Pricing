import * as React from "react";
import {
  SearchX, Search, TextSearch, Columns3, Table2, KanbanSquare,
  Plus, X, MoreHorizontal, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
} from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/tables-layout/DataTable";
import { TablePagination } from "@/components/tables-layout/TablePagination";
import { BulkActionBar } from "@/components/tables-layout/BulkActionBar";
import { FilterPanel } from "@/components/tables-layout/FilterPanel";
import { GroupByMenu } from "@/components/tables-layout/GroupByMenu";
import { SideSheet, type SideSheetVariant } from "@/components/side-sheet";
import { useAppNav } from "@/components/visual-references";
import { COLUMNS, SAMPLE_ROWS, sortRows } from "@/components/tables-layout/data";
import type { ColumnKey, SortState, TableRow } from "@/components/tables-layout/types";
import { BoardView } from "./BoardView";
import { matchesScoped, SEARCH_FIELDS, type PresetState, type PresetView } from "./helpers";

const TOGGLE_COLUMNS = COLUMNS.filter((c) => c.label).map((c) => ({ key: c.key as string, label: c.label }));

const DEFAULT_STATE: PresetState = {
  search: "", colScope: "status", colQuery: "", sort: null, hidden: [], view: "table", pageSize: 25,
};
const stateKey = (s: PresetState) => JSON.stringify({ ...s, hidden: [...s.hidden].sort() });
let presetSeq = 0;

/** Icon button in the compact toolbar, wrapped in a tooltip. */
function IconTool({
  label, active, onClick, children, ariaLabel,
}: {
  label: string; active?: boolean; onClick?: () => void; children: React.ReactNode; ariaLabel?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel ?? label}
          onClick={onClick}
          className={cn(active && "bg-accent text-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Data Action Control — OPTION 2. ClickUp-style interaction, FP-DS components:
 *   • Preset views as a tab bar (+ add / rename / delete).
 *   • A compact icon toolbar with tooltips: view mode · search · filter · group by,
 *     a divider, then the column tools (search-by-column · show/hide columns), and
 *     import/export.
 */
export function DataActionControlOpt2({ rows = SAMPLE_ROWS }: { rows?: TableRow[] }) {
  const goTo = useAppNav();
  const [search, setSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [colScope, setColScope] = React.useState("status");
  const [colQuery, setColQuery] = React.useState("");
  const [view, setView] = React.useState<"table" | "board">("table");
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [hidden, setHidden] = React.useState<Set<ColumnKey>>(new Set());
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sheet, setSheet] = React.useState<SideSheetVariant | null>(null);
  const [presets, setPresets] = React.useState<PresetView[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{ mode: "new" | "rename"; id?: string; name: string } | null>(null);

  /* ---- derived ---- */
  const gq = search.trim().toLowerCase();
  const cq = colQuery.trim().toLowerCase();
  const filtered = React.useMemo(
    () => rows.filter((r) => matchesScoped(r, gq, "all") && matchesScoped(r, cq, colScope)),
    [rows, gq, cq, colScope]
  );
  const sorted = React.useMemo(() => sortRows(filtered, sort), [filtered, sort]);
  const pageRows = React.useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);
  const isEmpty = sorted.length === 0;

  const current: PresetState = { search, colScope, colQuery, sort, hidden: [...hidden], view, pageSize };
  const activePreset = presets.find((p) => p.id === activeId) ?? null;
  const dirty = stateKey(current) !== stateKey(activePreset ? activePreset.state : DEFAULT_STATE);

  const applyState = (s: PresetState) => {
    setSearch(s.search); setColScope(s.colScope); setColQuery(s.colQuery);
    setSort(s.sort); setHidden(new Set(s.hidden)); setView(s.view); setPageSize(s.pageSize); setPage(1);
  };

  /* ---- handlers ---- */
  const onSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const onColQuery = (v: string) => { setColQuery(v); setPage(1); };
  const onSort = (key: ColumnKey) => {
    setSort((p) => (p?.key !== key ? { key, dir: "asc" } : p.dir === "asc" ? { key, dir: "desc" } : null));
    setPage(1);
  };
  const toggleColumn = (key: string) =>
    setHidden((prev) => { const n = new Set(prev); if (n.has(key as ColumnKey)) n.delete(key as ColumnKey); else n.add(key as ColumnKey); return n; });
  const showAllColumns = () => setHidden(new Set());
  const hideAllColumns = () => setHidden(new Set(TOGGLE_COLUMNS.map((c) => c.key as ColumnKey)));
  const toggleRow = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => { const n = new Set(prev); for (const r of pageRows) { if (checked) n.add(r.id); else n.delete(r.id); } return n; });
  const onPageSizeChange = (size: number) => { setPageSize(size); setPage(1); };

  /* ---- presets ---- */
  const applyPreset = (id: string) => { const p = presets.find((x) => x.id === id); if (p) { applyState(p.state); setActiveId(id); } };
  const resetToDefault = () => { applyState(DEFAULT_STATE); setActiveId(null); };
  const deletePreset = (id: string) => { setPresets((prev) => prev.filter((p) => p.id !== id)); if (activeId === id) setActiveId(null); };
  const updatePreset = (id: string) => setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, state: current } : p)));
  const submitDialog = () => {
    if (!dialog) return;
    const name = dialog.name.trim();
    if (!name) return;
    if (dialog.mode === "new") {
      const id = `preset-${++presetSeq}`;
      setPresets((prev) => [...prev, { id, name, state: current }]);
      setActiveId(id);
    } else if (dialog.id) {
      setPresets((prev) => prev.map((p) => (p.id === dialog.id ? { ...p, name } : p)));
    }
    setDialog(null);
  };

  const colLabel = SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "column";

  const tabCls = (isActive: boolean) =>
    cn(
      "px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
      isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* ===== Row 1 — preset view tabs (pulled up flush under the compact header) ===== */}
        <div className="-mx-4 -mt-3.5 flex items-center gap-1 border-b border-border px-3">
          {/* Default view */}
          <button
            type="button"
            onClick={resetToDefault}
            className={cn(tabCls(activeId === null), "border-b-2", activeId === null ? "border-foreground" : "border-transparent")}
          >
            Default
            {activeId === null && dirty && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" aria-label="unsaved" />}
          </button>
          {/* Saved presets */}
          {presets.map((p) => {
            const isActive = p.id === activeId;
            return (
              <div key={p.id} className="group/tab flex items-center pr-1">
                <button
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={cn(tabCls(isActive), "border-b-2", isActive ? "border-foreground" : "border-transparent")}
                >
                  {p.name}
                  {isActive && dirty && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" aria-label="unsaved" />}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${p.name} options`}
                      className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/tab:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {isActive && dirty && (
                      <DropdownMenuItem onClick={() => updatePreset(p.id)}><Check /> Update view</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setDialog({ mode: "rename", id: p.id, name: p.name })}>Rename</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => deletePreset(p.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
          {/* + View */}
          <button
            type="button"
            onClick={() => setDialog({ mode: "new", name: "" })}
            className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" /> View
          </button>
        </div>

        {/* ===== Row 2 — data ops (left) · count + column tools + import (right) ===== */}
        <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          {/* LEFT — search · filter · group by · view switch (+ active column-search chip) */}
          <div className="flex items-center gap-0.5">
            {searchOpen || search ? (
              <div className="relative w-[220px]">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => { if (!search) setSearchOpen(false); }}
                  placeholder="Search…"
                  aria-label="Search all columns"
                  className="h-8 pl-8 pr-8"
                />
                <button type="button" aria-label="Close search" onClick={() => { onSearchChange(""); setSearchOpen(false); }} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <IconTool label="Search" onClick={() => setSearchOpen(true)}><Search /></IconTool>
            )}
            <FilterPanel compact />
            <GroupByMenu compact />
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
            <IconTool label="Table view" active={view === "table"} onClick={() => setView("table")}><Table2 /></IconTool>
            <IconTool label="Board view" active={view === "board"} onClick={() => setView("board")}><KanbanSquare /></IconTool>
            {cq && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-fp-card-1 py-0.5 pl-2 pr-1 text-[11px] text-foreground">
                <Search className="size-3 text-muted-foreground" />
                {colLabel}: “{colQuery}”
                <button type="button" aria-label="Clear column search" onClick={() => onColQuery("")} className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>

          {/* RIGHT — search-by-column · show/hide columns · Create Form */}
          <div className="flex items-center gap-0.5">
            {/* Search by column */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Search by column" className={cn(cq && "text-foreground")}>
                      <TextSearch />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Search by column</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-64 space-y-2 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><TextSearch className="size-3.5" /> Search by column</div>
                <Select value={colScope} onValueChange={setColScope}>
                  <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Choose a column" /></SelectTrigger>
                  <SelectContent>
                    {SEARCH_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={colQuery} onChange={(e) => onColQuery(e.target.value)} placeholder={`Find in ${colLabel}…`} className={cn("h-8 pl-8", colQuery && "pr-8")} />
                  {colQuery && (
                    <button type="button" aria-label="Clear column search" onClick={() => onColQuery("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Show/Hide columns */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Show/Hide columns"><Columns3 /></Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Show/Hide columns</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-56 p-1">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Columns</span>
                  <span className="rounded bg-fp-card-1 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                    {TOGGLE_COLUMNS.filter((c) => !hidden.has(c.key as ColumnKey)).length}/{TOGGLE_COLUMNS.length}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {TOGGLE_COLUMNS.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent has-[:focus-visible]:bg-accent">
                      <Checkbox checked={!hidden.has(c.key as ColumnKey)} onCheckedChange={() => toggleColumn(c.key)} />
                      <span className="flex-1 truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
                <Separator className="my-1" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="flex-1" disabled={hidden.size === 0} onClick={showAllColumns}>Show all</Button>
                  <Button variant="ghost" size="sm" className="flex-1" disabled={hidden.size === TOGGLE_COLUMNS.length} onClick={hideAllColumns}>Hide all</Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button size="sm" onClick={() => goTo("form-layout")}>
              <Plus /> Create Form
            </Button>
          </div>
        </div>

        {/* ===== data region ===== */}
        <div className="relative mt-2 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {view === "board" ? (
              <BoardView rows={sorted} />
            ) : isEmpty ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
                  <EmptyTitle>No matching records</EmptyTitle>
                  <EmptyDescription>No records match the current search{cq ? ` in ${colLabel}` : ""}. Try a different term or clear the search.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={() => { onSearchChange(""); onColQuery(""); }}>Clear search</Button>
                </EmptyContent>
              </Empty>
            ) : (
              <DataTable
                rows={pageRows}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                sort={sort}
                onSort={onSort}
                onRowAction={(variant) => setSheet(variant)}
                hidden={hidden}
              />
            )}
          </div>

          {view === "table" && selectedIds.size > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
              <div className="pointer-events-auto">
                <BulkActionBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onDelete={() => setSelectedIds(new Set())} />
              </div>
            </div>
          )}
        </div>

        {view === "table" && !isEmpty && (
          /* `mt-4`, no `border-t` — matches DataActionControl 4d. */
          <div className="mt-4 shrink-0">
            <TablePagination page={page} pageSize={pageSize} total={sorted.length} onPageChange={setPage} onPageSizeChange={onPageSizeChange} />
          </div>
        )}

        {sheet && <SideSheet variant={sheet} open onOpenChange={(open) => !open && setSheet(null)} />}

        {/* name / rename dialog */}
        <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>{dialog?.mode === "rename" ? "Rename view" : "Save current view"}</DialogTitle></DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="opt2-view-name">View name</Label>
              <Input id="opt2-view-name" autoFocus value={dialog?.name ?? ""} onChange={(e) => setDialog((d) => (d ? { ...d, name: e.target.value } : d))} onKeyDown={(e) => e.key === "Enter" && submitDialog()} placeholder="e.g. Failed this week" />
              {dialog?.mode === "new" && <p className="text-xs text-muted-foreground">Captures the current search, filters, sort, visible columns, and view.</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={submitDialog} disabled={!dialog?.name.trim()}>{dialog?.mode === "rename" ? "Rename" : "Save view"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
