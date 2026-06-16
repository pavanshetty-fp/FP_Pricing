import * as React from "react";
import {
  Boxes,
  GalleryVerticalEnd,
  LayoutDashboard,
  Table2,
  KanbanSquare,
  Settings,
  Component,
  ListCollapse,
  Tag,
  Inbox,
  TextCursorInput,
  MousePointerClick,
  CreditCard,
  Search,
  RectangleEllipsis,
  Rows3,
  Menu,
  Navigation,
  MessageSquare,
  LoaderCircle,
  CircleDot,
  ChevronsUpDown,
  Minus,
  PanelLeft,
  Loader,
  SlidersHorizontal,
  Bell,
  ToggleRight,
  AppWindow,
  Text,
  MessageCircle,
  SquareStack,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Stack, SectionHeading, LabelValue } from "@/components/typography";
import { TablesLayout } from "@/components/tables-layout";
import { ModalsDemo } from "@/components/modals-demo";
import { FieldsDemo } from "@/components/fields-demo";
import {
  AccordionDemo,
  BadgeDemo,
  EmptyDemo,
  HoverCardDemo,
  InformationCardDemo,
  InputGroupDemo,
  InputOTPDemo,
  ItemDemo,
  MenubarDemo,
  NavigationMenuDemo,
  PopoverDemo,
  ProgressDemo,
  RadioGroupDemo,
  SelectDemo,
  SeparatorDemo,
  SidebarDemo,
  SkeletonDemo,
  SliderDemo,
  SonnerDemo,
  SwitchDemo,
  TabsDemo,
  TextareaDemo,
  TooltipDemo,
} from "@/components/component-demos";
import { Toaster } from "@/components/ui/sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme";
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

/**
 * The ShadCN component demos, one per Figma component page. Listed in the
 * contextual drawer by their component-page name; the active drawer item
 * selects the content shown.
 */
const COMPONENT_PAGES: {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}[] = [
  { key: "accordion", label: "Accordion", icon: <ListCollapse />, content: <AccordionDemo /> },
  { key: "badge", label: "Badge", icon: <Tag />, content: <BadgeDemo /> },
  { key: "empty", label: "Empty", icon: <Inbox />, content: <EmptyDemo /> },
  { key: "field", label: "Field", icon: <TextCursorInput />, content: <FieldsDemo /> },
  {
    key: "hover-card",
    label: "Hover Card",
    icon: <MousePointerClick />,
    content: <HoverCardDemo />,
  },
  {
    key: "information-card",
    label: "Information Card",
    icon: <CreditCard />,
    content: <InformationCardDemo />,
  },
  {
    key: "input-group",
    label: "Input Group",
    icon: <Search />,
    content: <InputGroupDemo />,
  },
  {
    key: "input-otp",
    label: "Input OTP",
    icon: <RectangleEllipsis />,
    content: <InputOTPDemo />,
  },
  { key: "item", label: "Item", icon: <Rows3 />, content: <ItemDemo /> },
  { key: "menubar", label: "Menubar", icon: <Menu />, content: <MenubarDemo /> },
  {
    key: "navigation-menu",
    label: "Navigation Menu",
    icon: <Navigation />,
    content: <NavigationMenuDemo />,
  },
  { key: "popover", label: "Popover", icon: <MessageSquare />, content: <PopoverDemo /> },
  { key: "progress", label: "Progress", icon: <LoaderCircle />, content: <ProgressDemo /> },
  {
    key: "radio-group",
    label: "Radio Group",
    icon: <CircleDot />,
    content: <RadioGroupDemo />,
  },
  { key: "select", label: "Select", icon: <ChevronsUpDown />, content: <SelectDemo /> },
  { key: "separator", label: "Separator", icon: <Minus />, content: <SeparatorDemo /> },
  { key: "sidebar", label: "Sidebar", icon: <PanelLeft />, content: <SidebarDemo /> },
  { key: "skeleton", label: "Skeleton", icon: <Loader />, content: <SkeletonDemo /> },
  { key: "slider", label: "Slider", icon: <SlidersHorizontal />, content: <SliderDemo /> },
  { key: "sonner", label: "Sonner", icon: <Bell />, content: <SonnerDemo /> },
  { key: "switch", label: "Switch", icon: <ToggleRight />, content: <SwitchDemo /> },
  { key: "tabs", label: "Tabs", icon: <AppWindow />, content: <TabsDemo /> },
  { key: "textarea", label: "Textarea", icon: <Text />, content: <TextareaDemo /> },
  { key: "tooltip", label: "Tooltip", icon: <MessageCircle />, content: <TooltipDemo /> },
  { key: "modals", label: "Modals", icon: <SquareStack />, content: <ModalsDemo /> },
];

const COMPONENTS_NAV: NavGroup = {
  items: COMPONENT_PAGES.map((p) => ({ key: p.key, label: p.label, icon: p.icon })),
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
  /** When set, content is chosen by the active sub-nav key (a drawer per page). */
  pages?: { key: string; label: string; content: React.ReactNode }[];
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
  components: {
    label: "ShadCN components",
    icon: <Component />,
    sidebar: COMPONENTS_NAV,
    defaultSub: COMPONENT_PAGES[0].key,
    content: null,
    pages: COMPONENT_PAGES,
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

const ORDER = ["dashboard", "pricing", "tables", "components", "board", "settings"];

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

  // Breadcrumb visibility — a layout preference toggled from the Settings page,
  // persisted to localStorage (default on). See docs/content-layer.md.
  const [showBreadcrumb, setShowBreadcrumb] = React.useState(
    () =>
      typeof localStorage === "undefined" ||
      localStorage.getItem("fp-breadcrumb") !== "off"
  );
  React.useEffect(() => {
    localStorage.setItem("fp-breadcrumb", showBreadcrumb ? "on" : "off");
  }, [showBreadcrumb]);

  const screen = SCREENS[mainKey];

  // Switching the main nav resets the sub-nav to that screen's default.
  const onMainNavigate = (key: string) => {
    setMainKey(key);
    setSubKey(SCREENS[key].defaultSub ?? "");
  };

  // Content-layer title: selected sub-nav item, or the screen name when there's no drawer.
  const title = screen.sidebar ? navLabel(screen.sidebar, subKey) : screen.label;

  // When a screen defines per-page content, the active drawer key selects it.
  // Settings renders live content wired to app preferences.
  const content =
    mainKey === "settings" ? (
      <SettingsContent
        showBreadcrumb={showBreadcrumb}
        onShowBreadcrumbChange={setShowBreadcrumb}
      />
    ) : screen.pages ? (
      screen.pages.find((p) => p.key === subKey)?.content ??
      screen.pages[0].content
    ) : (
      screen.content
    );

  // Breadcrumb = Home › rail item › (drawer group) › drawer item. Only shown on
  // multi-level paths (i.e. screens that have a contextual drawer). The last
  // crumb is the current page; ancestors navigate. (docs/content-layer.md)
  const crumbs: { label: string; onClick?: () => void }[] = screen.sidebar
    ? [
        { label: "Home", onClick: () => onMainNavigate("dashboard") },
        { label: screen.label, onClick: () => setSubKey(screen.defaultSub ?? "") },
      ]
    : [];
  if (screen.sidebar) {
    for (const item of screen.sidebar.items) {
      if (item.key === subKey) {
        crumbs.push({ label: item.label });
        break;
      }
      const child = item.children?.find((c) => c.key === subKey);
      if (child) {
        crumbs.push({
          label: item.label,
          onClick: () => setSubKey(item.children![0].key),
        });
        crumbs.push({ label: child.label });
        break;
      }
    }
  }
  const breadcrumb = screen.sidebar && showBreadcrumb ? (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={c.label + i}>
              <BreadcrumbItem>
                {isLast || !c.onClick ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={c.onClick}>
                      {c.label}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  ) : undefined;

  return (
    <>
    <AppShell
      title={title}
      breadcrumb={breadcrumb}
      headerAction={<ThemeToggle />}
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
      {content}
    </AppShell>
    <Toaster position="bottom-right" />
    </>
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

/** Settings screen — app preferences. Currently the content-layer toggles. */
function SettingsContent({
  showBreadcrumb,
  onShowBreadcrumbChange,
}: {
  showBreadcrumb: boolean;
  onShowBreadcrumbChange: (v: boolean) => void;
}) {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto">
      <p className="text-sm text-muted-foreground">
        Manage how the workspace looks and behaves.
      </p>
      <FieldSet>
        <FieldLegend>Layout</FieldLegend>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="set-breadcrumb">Breadcrumbs</FieldLabel>
            <FieldDescription>
              Show the navigation path below the page header.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="set-breadcrumb"
            checked={showBreadcrumb}
            onCheckedChange={onShowBreadcrumbChange}
          />
        </Field>
      </FieldSet>
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
