import * as React from "react";
import { SideNav } from "./SideNav";
import { PageHeader } from "./PageHeader";
import { ActionBar } from "./ActionBar";
import { DataTable } from "./DataTable";
import { BulkActionBar } from "./BulkActionBar";
import { Pagination } from "./Pagination";
import { SAMPLE_ROWS } from "./data";
import type { TableRow } from "./types";

export interface TablesLayoutProps {
  /** Defaults to the sample dataset that mirrors the Figma frame. */
  rows?: TableRow[];
  title?: string;
}

/**
 * Composed "Tables Layout" screen — Figma frame 27614:56562.
 * Owns row-selection state shared between the table and the bulk-action bar.
 */
export function TablesLayout({ rows = SAMPLE_ROWS, title }: TablesLayoutProps) {
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
    <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SideNav />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={title}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="mt-4 shrink-0">
          <ActionBar searchValue={search} onSearchChange={setSearch} />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto px-4">
          <DataTable
            rows={rows}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
          />
        </div>

        <div className="shrink-0 border-t border-border">
          <Pagination />
        </div>

        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
        />
      </main>
    </div>
  );
}
