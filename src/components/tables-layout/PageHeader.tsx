import { Tabs } from "@/components/ui";

export interface PageHeaderProps {
  title?: string;
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const DEFAULT_TABS = ["Tab 1", "Tab 2", "Tab 3", "Tab 4", "Tab 5", "Tab 6", "Tab 7"];

/**
 * Figma "Pro Blocks / Page Header / 2." (id 27614:56578) + tab strip
 * (id 27667:16810). Breadcrumb is hidden in the source frame.
 */
export function PageHeader({
  title = "Sub Menu 2d",
  tabs = DEFAULT_TABS,
  activeTab = "Tab 1",
  onTabChange,
}: PageHeaderProps) {
  return (
    <header>
      {/* Title bar (48px) */}
      <div className="flex h-12 items-center px-4">
        <h1 className="text-2xl font-semibold leading-none">{title}</h1>
      </div>

      {/* Tab strip with full-width underline separator */}
      <div className="border-b border-border px-4">
        <Tabs tabs={tabs} value={activeTab} onValueChange={onTabChange} />
      </div>
    </header>
  );
}
