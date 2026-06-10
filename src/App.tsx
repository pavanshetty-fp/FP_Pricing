import * as React from "react";
import {
  Boxes,
  GalleryVerticalEnd,
  LayoutDashboard,
  Table2,
  KanbanSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { Stack, SectionHeading, LabelValue } from "@/components/typography";
import { TablesLayout } from "@/components/tables-layout";
import { NavRail, NavigationDrawer, PRICING_NAV } from "@/components/navigation-drawer";
import type { NavGroup } from "@/components/navigation-drawer";

type Demo = "nav" | "tables";

const DEMOS: { key: Demo; label: string }[] = [
  { key: "nav", label: "Navigation (two-tier)" },
  { key: "tables", label: "Tables Layout" },
];

// Tier-1 (rail) = main nav. The selected item's label titles the tier-2 sidebar.
const RAIL_NAV: NavGroup = {
  items: [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { key: "pricing", label: "Customer Pricing", icon: <GalleryVerticalEnd /> },
    { key: "orders", label: "Orders", icon: <Table2 /> },
    { key: "board", label: "Board", icon: <KanbanSquare /> },
    { key: "settings", label: "Settings", icon: <Settings /> },
  ],
};

/** Resolve a nav item / sub-item label by key (searches children too). */
function navLabel(group: NavGroup, key: string): string {
  for (const item of group.items) {
    if (item.key === key) return item.label;
    for (const sub of item.children ?? []) if (sub.key === key) return sub.label;
  }
  return "";
}

export function App() {
  const [demo, setDemo] = React.useState<Demo>("nav");
  // tier-1 main-nav selection → titles the sidebar; tier-2 sub-nav selection → titles the content layer
  const [mainKey, setMainKey] = React.useState("pricing");
  const [subKey, setSubKey] = React.useState("pricing-setup");

  const activeMain = RAIL_NAV.items.find((i) => i.key === mainKey) ?? RAIL_NAV.items[0];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Demo switcher (not part of the DS) */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {DEMOS.map((d) => (
          <Button
            key={d.key}
            variant={demo === d.key ? "default" : "outline"}
            size="sm"
            onClick={() => setDemo(d.key)}
          >
            {d.label}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {demo === "tables" ? (
          <TablesLayout />
        ) : (
          <AppShell
            // content-layer header = selected sub-nav item (tier-2)
            title={navLabel(PRICING_NAV, subKey)}
            rail={
              <NavRail
                brand={{ name: "FleetPanda", icon: <Boxes />, iconClassName: "bg-brand" }}
                groups={[RAIL_NAV]}
                user={{ name: "Pavan S", email: "pavanshetty@fleetpanda.com", fallback: "PS" }}
                activeKey={mainKey}
                onNavigate={setMainKey}
              />
            }
            sidebar={
              <NavigationDrawer
                className="rounded-lg bg-sidebar"
                // sidebar header = selected main-nav item (tier-1)
                brand={{
                  name: activeMain.label,
                  icon: activeMain.icon,
                  iconClassName: "bg-sidebar-primary",
                }}
                groups={[PRICING_NAV]}
                user={{ name: "shadcn", email: "m@example.com", fallback: "SC" }}
                activeKey={subKey}
                onNavigate={setSubKey}
              />
            }
          >
            <PricingSetupContent />
          </AppShell>
        )}
      </div>
    </div>
  );
}

/** Content-layer demo exercising the vertical-rhythm helpers. */
function PricingSetupContent() {
  return (
    <Stack space="section" className="overflow-auto">
      <p className="max-w-prose text-sm text-muted-foreground">
        Configure base price index, margins, taxes, fees and discounts per ShipTo × Product.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Shipment Overview" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <LabelValue label="Order ID" value="#SHP-20481" />
          <LabelValue label="Origin" value="Chicago, IL" />
          <LabelValue label="Destination" value="Atlanta, GA" />
          <LabelValue label="Carrier" value="XPO Logistics" />
          <LabelValue label="ETA" value="Jun 3, 2025" />
          <LabelValue label="Status" value="In Transit" />
        </div>
      </Stack>
    </Stack>
  );
}
