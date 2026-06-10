import * as React from "react";
import { PageHeader } from "./PageHeader";
import { ActionBar } from "./ActionBar";
import { DataTable } from "./DataTable";
import { BulkActionBar } from "./BulkActionBar";
import { TablePagination } from "./TablePagination";
import { SAMPLE_ROWS, sortRows } from "./data";
import type { ColumnKey, SortState, TableRow } from "./types";

export interface TablesLayoutProps {
  /** Defaults to the sample dataset that mirrors the Figma frame. */
  rows?: TableRow[];
}

/**
 * "Tables Layout" content — Figma frame 27614:56562. Renders inside the
 * AppShell content layer (rail, contextual sidebar, page title, 16px inset).
 * Owns the data view: sort + pagination + row selection + tab state.
 */
export function TablesLayout({ rows = SAMPLE_ROWS }: TablesLayoutProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Tab 1");
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // Sort the full dataset, then slice the current page.
  const sorted = React.useMemo(() => sortRows(rows, sort), [rows, sort]);
  const pageRows = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  // Sort cycles asc → desc → unsorted; changing sort/size returns to page 1.
  const onSort = (key: ColumnKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  };

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Select-all toggles the current page's rows.
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  return (
    // relative anchors the floating bulk-action bar
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PageHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4 shrink-0">
        <ActionBar searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        <DataTable
          rows={pageRows}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          sort={sort}
          onSort={onSort}
        />
      </div>

      <div className="shrink-0 border-t border-border">
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
        />
      </div>

      <BulkActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
