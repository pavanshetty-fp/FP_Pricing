import * as React from "react";
import {
  Boxes,
  GalleryVerticalEnd,
  LayoutDashboard,
  Table2,
  FileText,
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

// Tier-1 (rail) nav — FleetPanda primary
const RAIL_NAV: NavGroup = {
  items: [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    { key: "tables", label: "Tables", icon: <Table2 /> },
    { key: "forms", label: "Forms", icon: <FileText /> },
    { key: "board", label: "Board", icon: <KanbanSquare /> },
    { key: "settings", label: "Settings", icon: <Settings /> },
  ],
};

export function App() {
  const [demo, setDemo] = React.useState<Demo>("nav");

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
            title="Pricing Setup"
            rail={
              <NavRail
                brand={{ name: "FleetPanda", icon: <Boxes />, iconClassName: "bg-brand" }}
                groups={[RAIL_NAV]}
                user={{ name: "Pavan S", email: "pavanshetty@fleetpanda.com", fallback: "PS" }}
                activeKey="tables"
              />
            }
            sidebar={
              <NavigationDrawer
                className="rounded-lg bg-sidebar"
                brand={{
                  name: "Customer Pricing",
                  icon: <GalleryVerticalEnd />,
                  iconClassName: "bg-sidebar-primary",
                }}
                groups={[PRICING_NAV]}
                user={{ name: "shadcn", email: "m@example.com", fallback: "SC" }}
                activeKey="pricing-setup"
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
