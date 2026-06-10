import * as React from "react";
import { GalleryVerticalEnd, LayoutDashboard, Table2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  NavigationDrawer,
  type NavGroup,
} from "@/components/navigation-drawer";
import { SideNav } from "./SideNav";
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
  /** Content-layer title. Defaults to the selected sub-nav item. */
  title?: string;
}

/**
 * Contextual sub-nav drawer (tier-2) for the Tables Layout frame — Figma
 * "Sidebar 07." (Main Menu 2 → Sub Menu 1 · Sub Menu 2 → 2a/2b/2c/2d).
 */
const TABLES_NAV: NavGroup = {
  items: [
    { key: "sub-1", label: "Sub Menu 1", icon: <LayoutDashboard /> },
    {
      key: "sub-2",
      label: "Sub Menu 2",
      icon: <Table2 />,
      children: [
        { key: "sub-2a", label: "Sub Menu 2a" },
        { key: "sub-2b", label: "Sub Menu 2b" },
        { key: "sub-2c", label: "Sub Menu 2c" },
        { key: "sub-2d", label: "Sub Menu 2d" },
      ],
    },
  ],
};

function navLabel(group: NavGroup, key: string): string {
  for (const item of group.items) {
    if (item.key === key) return item.label;
    for (const sub of item.children ?? []) if (sub.key === key) return sub.label;
  }
  return "";
}

/**
 * Composed "Tables Layout" screen — Figma frame 27614:56562. Full three-column
 * shell: icon rail (tier-1) + "Main Menu 2" contextual sidebar (tier-2) + the
 * data-table content layer. Owns row-selection + the sub-nav selection.
 */
export function TablesLayout({ rows = SAMPLE_ROWS, title }: TablesLayoutProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Tab 1");
  const [subKey, setSubKey] = React.useState("sub-2d");

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
    <AppShell
      rail={<SideNav />}
      sidebar={
        <NavigationDrawer
          className="rounded-lg bg-sidebar"
          brand={{
            name: "Main Menu 2",
            icon: <GalleryVerticalEnd />,
            iconClassName: "bg-sidebar-primary",
          }}
          groups={[TABLES_NAV]}
          user={{ name: "Pavan S", email: "pavanshetty@fleetpanda.com", fallback: "PS" }}
          activeKey={subKey}
          onNavigate={setSubKey}
        />
      }
      title={title ?? navLabel(TABLES_NAV, subKey)}
    >
      {/* relative anchors the floating bulk-action bar; AppShell owns the 16px inset */}
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
    </AppShell>
  );
}
