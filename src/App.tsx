import * as React from "react";
import {
  Boxes,
  GalleryVerticalEnd,
  LayoutDashboard,
  Table2,
  KanbanSquare,
  Settings,
  Tag,
  BadgeCheck,
  ArrowRight,
  SquareStack,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, BadgeNumber } from "@/components/ui";
import { Stack, SectionHeading, LabelValue } from "@/components/typography";
import { TablesLayout } from "@/components/tables-layout";
import { ModalsDemo } from "@/components/modals-demo";
import { NavRail, NavigationDrawer, PRICING_NAV } from "@/components/navigation-drawer";
import type { NavGroup } from "@/components/navigation-drawer";

/** Contextual sub-nav for the Tables screen — Figma "Main Menu 2" drawer. */
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

/** Resolve a nav item / sub-item label by key (searches children too). */
function navLabel(group: NavGroup, key: string): string {
  for (const item of group.items) {
    if (item.key === key) return item.label;
    for (const sub of item.children ?? []) if (sub.key === key) return sub.label;
  }
  return "";
}

interface Screen {
  label: string;
  icon: React.ReactNode;
  /** Tier-2 contextual sidebar; omit for main-nav-only screens. */
  sidebar?: NavGroup;
  defaultSub?: string;
  content: React.ReactNode;
}

const SCREENS: Record<string, Screen> = {
  dashboard: {
    label: "Dashboard",
    icon: <LayoutDashboard />,
    content: <EmptyScreen label="Dashboard" />,
  },
  pricing: {
    label: "Customer Pricing",
    icon: <GalleryVerticalEnd />,
    sidebar: PRICING_NAV,
    defaultSub: "pricing-setup",
    content: <PricingContent />,
  },
  tables: {
    label: "Tables",
    icon: <Table2 />,
    sidebar: TABLES_NAV,
    defaultSub: "sub-2d",
    content: <TablesLayout />,
  },
  badges: {
    label: "Badges",
    icon: <Tag />,
    content: <BadgesContent />,
  },
  modals: {
    label: "Modals",
    icon: <SquareStack />,
    content: <ModalsDemo />,
  },
  board: {
    label: "Board",
    icon: <KanbanSquare />,
    content: <EmptyScreen label="Board" />,
  },
  settings: {
    label: "Settings",
    icon: <Settings />,
    content: <EmptyScreen label="Settings" />,
  },
};

const ORDER = ["dashboard", "pricing", "tables", "badges", "modals", "board", "settings"];

// Tier-1 main navigation (the rail) — one item per screen.
const MAIN_NAV: NavGroup = {
  items: ORDER.map((key) => ({
    key,
    label: SCREENS[key].label,
    icon: SCREENS[key].icon,
  })),
};

export function App() {
  const [mainKey, setMainKey] = React.useState("tables");
  const [subKey, setSubKey] = React.useState(SCREENS.tables.defaultSub ?? "");

  const screen = SCREENS[mainKey];

  // Switching the main nav resets the sub-nav to that screen's default.
  const onMainNavigate = (key: string) => {
    setMainKey(key);
    setSubKey(SCREENS[key].defaultSub ?? "");
  };

  // Content-layer title: selected sub-nav item, or the screen name when there's no drawer.
  const title = screen.sidebar ? navLabel(screen.sidebar, subKey) : screen.label;

  return (
    <AppShell
      title={title}
      rail={
        <NavRail
          brand={{ name: "FleetPanda", icon: <Boxes />, iconClassName: "bg-brand" }}
          groups={[MAIN_NAV]}
          user={{ name: "Pavan S", email: "pavanshetty@fleetpanda.com", fallback: "PS" }}
          activeKey={mainKey}
          onNavigate={onMainNavigate}
        />
      }
      sidebar={
        screen.sidebar ? (
          <NavigationDrawer
            className="rounded-lg bg-sidebar"
            brand={{
              name: screen.label,
              icon: screen.icon,
              iconClassName: "bg-sidebar-primary",
            }}
            groups={[screen.sidebar]}
            user={{ name: "shadcn", email: "m@example.com", fallback: "SC" }}
            activeKey={subKey}
            onNavigate={setSubKey}
          />
        ) : undefined
      }
    >
      {screen.content}
    </AppShell>
  );
}

/** Content-layer demo exercising the vertical-rhythm helpers. */
function PricingContent() {
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

/** Badge playground — Figma "Badge" page (23:995). */
function BadgesContent() {
  return (
    <Stack space="section" className="overflow-auto">
      <p className="max-w-prose text-sm text-muted-foreground">
        Displays a badge or a component that looks like a badge.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Variants" />
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="verified">
            <BadgeCheck />
            Verified
          </Badge>
          <Badge variant="link">
            Link
            <ArrowRight />
          </Badge>
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Badge Number" />
        <div className="flex flex-wrap items-center gap-3">
          <BadgeNumber count={8} />
          <BadgeNumber count={60} variant="secondary" />
          <BadgeNumber count={3} variant="destructive" />
          <BadgeNumber count={12} variant="verified" />
          <BadgeNumber count={120} max={99} variant="outline" />
          <BadgeNumber count={500} max={20} />
        </div>
      </Stack>
    </Stack>
  );
}

function EmptyScreen({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {label} — coming soon
    </div>
  );
}
