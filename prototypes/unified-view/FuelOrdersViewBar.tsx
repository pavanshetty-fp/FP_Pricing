import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Preset-view row — saved-view tabs with one hairline under the strip.
 *
 * The strip is the DS's `PresetTabs` (experiments/dac-rebuild/parts.tsx): shadcn
 * Tabs `line` variant, h-8, the `after:inset-x-2` underline inset, and the
 * `-mx-4` full-bleed border.
 */
export interface FuelOrdersViewBarProps {
  views: string[];
  activeView: string;
  onSelectView: (view: string) => void;
  onAddView: () => void;
}

export function FuelOrdersViewBar({
  views,
  activeView,
  onSelectView,
  onAddView,
}: FuelOrdersViewBarProps) {
  return (
    // -mx-4 -mt-4 cancels the content layer's 16px inset so the hairline spans
    // the full panel width, as it does on the DS screen.
    <div className="-mx-4 -mt-4 flex shrink-0 items-center gap-1 border-b border-border px-3">
      <Tabs value={activeView} onValueChange={onSelectView}>
        <TabsList variant="line" className="h-8 p-0">
          {views.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              className="px-2 text-xs after:inset-x-2"
            >
              {view}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="ghost"
        size="xs"
        onClick={onAddView}
        className="text-muted-foreground hover:text-foreground"
      >
        <Plus />
        View
      </Button>
    </div>
  );
}
