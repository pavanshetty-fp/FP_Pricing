import * as React from "react";
import {
  Boxes,
  LayoutDashboard,
  Table2,
  KanbanSquare,
  Settings,
  Component,
  ListCollapse,
  FileText,
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
  LayoutPanelTop,
  PanelTop,
  ToggleLeft,
  SquareStack,
  Blocks,
  Megaphone,
  BookOpen,
  Layers,
  Split,
  TriangleAlert,
  ListChecks,
  RectangleHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Stack } from "@/components/typography";
import { TablesLayout } from "@/components/tables-layout";
import { FormLayout } from "@/components/form-layout";
import { KanbanBoard } from "@/components/kanban-board";
import { Dashboard } from "@/components/dashboard";
import { SurfacesReference } from "@/components/visual-references";
import {
  CommonMistakesReference,
  DecisionRulesReference,
} from "@/components/dos-and-donts";
import { ModalsDemo } from "@/components/modals-demo";
import { FieldsDemo } from "@/components/fields-demo";
import {
  AccordionDemo,
  BadgeDemo,
  ButtonDemo,
  BannersDemo,
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
import { usePreferences, type ActionBarComponent } from "@/components/preferences";
import { NavRail, NavigationDrawer } from "@/components/navigation-drawer";
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
  { key: "button", label: "Button", icon: <RectangleHorizontal />, content: <ButtonDemo /> },
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

/** FP custom (non-shadcn) components, surfaced under the "Custom components" menu. */
const CUSTOM_COMPONENT_PAGES: {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}[] = [
  { key: "banners", label: "Banners", icon: <Megaphone />, content: <BannersDemo /> },
];

const CUSTOM_COMPONENTS_NAV: NavGroup = {
  items: CUSTOM_COMPONENT_PAGES.map((p) => ({ key: p.key, label: p.label, icon: p.icon })),
};

/** Visual References — live showroom of DS foundations, patterns, and rules.
    Grows in batches; each entry is one reference screen in the tier-2 drawer. */
const VISUAL_REFERENCE_PAGES: {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}[] = [
  { key: "surfaces", label: "Surfaces & Elevation", icon: <Layers />, content: <SurfacesReference /> },
];

const VISUAL_REFERENCES_NAV: NavGroup = {
  items: VISUAL_REFERENCE_PAGES.map((p) => ({ key: p.key, label: p.label, icon: p.icon })),
};

/** Do's and Don'ts — the guidance layer: when to use what, and what to avoid. */
const DOS_DONTS_PAGES: {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}[] = [
  { key: "decision-rules", label: "Decision Rules", icon: <Split />, content: <DecisionRulesReference /> },
  { key: "common-mistakes", label: "Common Mistakes", icon: <TriangleAlert />, content: <CommonMistakesReference /> },
];

const DOS_DONTS_NAV: NavGroup = {
  items: DOS_DONTS_PAGES.map((p) => ({ key: p.key, label: p.label, icon: p.icon })),
};

/** Component Control sub-nav — toggles for content-layer + action-bar components. */
const COMPONENT_CONTROL_NAV: NavGroup = {
  items: [
    { key: "content-layer", label: "Content layer", icon: <LayoutPanelTop /> },
    { key: "action-bar", label: "Action bar", icon: <PanelTop /> },
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
  /** When set, content is chosen by the active sub-nav key (a drawer per page). */
  pages?: { key: string; label: string; content: React.ReactNode }[];
}

const SCREENS: Record<string, Screen> = {
  dashboard: {
    label: "Dashboard",
    icon: <LayoutDashboard />,
    content: <Dashboard />,
  },
  tables: {
    label: "Tables",
    icon: <Table2 />,
    sidebar: TABLES_NAV,
    defaultSub: "sub-2d",
    content: <TablesLayout />,
  },
  "form-layout": {
    label: "Form Layout",
    icon: <FileText />,
    content: <FormLayout />,
  },
  components: {
    label: "ShadCN components",
    icon: <Component />,
    sidebar: COMPONENTS_NAV,
    defaultSub: COMPONENT_PAGES[0].key,
    content: null,
    pages: COMPONENT_PAGES,
  },
  "custom-components": {
    label: "Custom components",
    icon: <Blocks />,
    sidebar: CUSTOM_COMPONENTS_NAV,
    defaultSub: CUSTOM_COMPONENT_PAGES[0].key,
    content: null,
    pages: CUSTOM_COMPONENT_PAGES,
  },
  accordion: {
    label: "Accordion",
    icon: <ListCollapse />,
    content: <AccordionDemo />,
  },
  "component-control": {
    label: "Component Control",
    icon: <ToggleLeft />,
    sidebar: COMPONENT_CONTROL_NAV,
    defaultSub: "content-layer",
    content: null,
  },
  board: {
    label: "Board",
    icon: <KanbanSquare />,
    content: <KanbanBoard />,
  },
  "visual-references": {
    label: "Visual References",
    icon: <BookOpen />,
    sidebar: VISUAL_REFERENCES_NAV,
    defaultSub: VISUAL_REFERENCE_PAGES[0].key,
    content: null,
    pages: VISUAL_REFERENCE_PAGES,
  },
  "dos-donts": {
    label: "Do's and Don'ts",
    icon: <ListChecks />,
    sidebar: DOS_DONTS_NAV,
    defaultSub: DOS_DONTS_PAGES[0].key,
    content: null,
    pages: DOS_DONTS_PAGES,
  },
  settings: {
    label: "Settings",
    icon: <Settings />,
    content: <EmptyScreen label="Settings" />,
  },
};

const ORDER = ["dashboard", "tables", "form-layout", "components", "custom-components", "accordion", "component-control", "board", "visual-references", "dos-donts", "settings"];

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

  // Breadcrumb visibility — a layout preference from the Settings page.
  const { showBreadcrumb } = usePreferences();

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
    mainKey === "component-control" ? (
      subKey === "action-bar" ? (
        <ActionBarControl />
      ) : (
        <ContentLayerControl />
      )
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
            className="rounded-lg bg-sidebar shadow-fp-surface"
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

/** A single labelled toggle row. */
function SettingRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

/** Component Control → Content layer — content-layer component toggles. */
function ContentLayerControl() {
  const { showBreadcrumb, setShowBreadcrumb } = usePreferences();
  return (
    <Stack space="section" className="max-w-2xl overflow-auto">
      <p className="text-sm text-muted-foreground">
        Control which content-layer components are shown.
      </p>
      <FieldSet>
        <FieldLegend>Content layer</FieldLegend>
        <SettingRow
          id="set-breadcrumb"
          label="Breadcrumbs"
          description="Show the navigation path below the page title."
          checked={showBreadcrumb}
          onChange={setShowBreadcrumb}
        />
      </FieldSet>
    </Stack>
  );
}

/** Settings → Action bar — show/hide individual action-bar components. */
const ACTION_BAR_SETTINGS: {
  key: ActionBarComponent;
  label: string;
  description: string;
}[] = [
  { key: "search", label: "Search", description: "The search input." },
  { key: "columnFilters", label: "Column filters", description: "The show/hide-columns button on the search bar." },
  { key: "filters", label: "Filters", description: "The faceted filters menu." },
  { key: "groupBy", label: "Group By", description: "The group-by menu." },
  { key: "savedViews", label: "Saved Views", description: "The views switcher." },
  { key: "cta", label: "Create CTA", description: "The primary create button." },
];

function ActionBarControl() {
  const { actionBar, setActionBarComponent } = usePreferences();
  return (
    <Stack space="section" className="max-w-2xl overflow-auto">
      <p className="text-sm text-muted-foreground">
        Choose which components appear in the table action bar.
      </p>
      <FieldSet>
        <FieldLegend>Action bar components</FieldLegend>
        {ACTION_BAR_SETTINGS.map((c) => (
          <SettingRow
            key={c.key}
            id={`set-ab-${c.key}`}
            label={c.label}
            description={c.description}
            checked={actionBar[c.key]}
            onChange={(v) => setActionBarComponent(c.key, v)}
          />
        ))}
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
