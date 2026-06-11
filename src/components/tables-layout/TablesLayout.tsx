import * as React from "react";
import { PageHeader } from "./PageHeader";
import { ActionBar } from "./ActionBar";
import { DataTable } from "./DataTable";
import { BulkActionBar } from "./BulkActionBar";
import { TablePagination } from "./TablePagination";
import { FormLayout } from "@/components/form-layout";
import { SideSheet, type SideSheetVariant } from "@/components/side-sheet";
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
  const [formOpen, setFormOpen] = React.useState(false);
  const [sheet, setSheet] = React.useState<SideSheetVariant | null>(null);

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

  // The "Create Form" CTA swaps the table view for the Form Layout screen.
  if (formOpen) {
    return <FormLayout onClose={() => setFormOpen(false)} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4 shrink-0">
        <ActionBar
          searchValue={search}
          onSearchChange={setSearch}
          onCreateTask={() => setFormOpen(true)}
        />
      </div>

      {/* Table region — `relative` anchors the floating bulk-action bar so it
          sits 20px above the pagination unit, centred to the content. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <div className="h-full overflow-auto">
          <DataTable
            rows={pageRows}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            sort={sort}
            onSort={onSort}
            onRowAction={(variant) => setSheet(variant)}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <div className="pointer-events-auto">
              <BulkActionBar
                count={selectedIds.size}
                onClear={() => setSelectedIds(new Set())}
                onDelete={() => setSelectedIds(new Set())}
              />
            </div>
          </div>
        )}
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

      {sheet && (
        <SideSheet
          variant={sheet}
          open
          onOpenChange={(open) => !open && setSheet(null)}
        />
      )}
    </div>
  );
}
