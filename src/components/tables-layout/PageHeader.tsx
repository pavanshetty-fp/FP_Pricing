import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PageHeaderProps {
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const DEFAULT_TABS = ["Tab 1", "Tab 2", "Tab 3", "Tab 4", "Tab 5", "Tab 6", "Tab 7"];

/**
 * Tab strip (Figma id 27667:16810), shadcn Tabs `line` variant. The page title
 * now lives in the AppShell content-layer header; this renders the tabs only.
 * `-mx-4` lets the underline separator span the full content-layer width; `-mt-2.5`
 * pulls it flush beneath the compact (ClickUp-style) header.
 */
export function PageHeader({
  tabs = DEFAULT_TABS,
  activeTab = "Tab 1",
  onTabChange,
}: PageHeaderProps) {
  return (
    <div className="-mx-4 -mt-2.5 border-b border-border px-2">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
