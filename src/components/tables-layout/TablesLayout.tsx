import * as React from "react";
import { PageHeader } from "./PageHeader";
import { ActionBar } from "./ActionBar";
import { DataTable } from "./DataTable";
import { BulkActionBar } from "./BulkActionBar";
import { TablePagination } from "./TablePagination";
import { SAMPLE_ROWS } from "./data";
import type { TableRow } from "./types";

export interface TablesLayoutProps {
  /** Defaults to the sample dataset that mirrors the Figma frame. */
  rows?: TableRow[];
}

/**
 * "Tables Layout" content — Figma frame 27614:56562. Renders inside the
 * AppShell content layer, which supplies the rail, the contextual sidebar,
 * the page title, and the 16px inset. Owns row-selection + tab state only.
 */
export function TablesLayout({ rows = SAMPLE_ROWS }: TablesLayoutProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Tab 1");

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(rows.map((r) => r.id)) : new Set());

  return (
    // relative anchors the floating bulk-action bar
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PageHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4 shrink-0">
        <ActionBar searchValue={search} onSearchChange={setSearch} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        <DataTable
          rows={rows}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      </div>

      <div className="shrink-0 border-t border-border">
        <TablePagination />
      </div>

      <BulkActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
