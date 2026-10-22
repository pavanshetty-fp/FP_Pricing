import { Table2, KanbanSquare } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type DataView = "table" | "board";

export interface ViewSwitcherProps {
  view: DataView;
  onViewChange: (v: DataView) => void;
}

/**
 * View switcher (Unit 2) — Table ↔ Board today; more views (List, Gallery,
 * Calendar, Timeline) slot in here as they become relevant. A segmented toggle
 * keeps the choice always visible with one option active.
 */
export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => v && onViewChange(v as DataView)}
      variant="outline"
      size="sm"
      className="h-8"
    >
      <ToggleGroupItem value="table" aria-label="Table view" className="gap-1.5 px-2.5">
        <Table2 className="size-4" />
        Table
      </ToggleGroupItem>
      <ToggleGroupItem value="board" aria-label="Board view" className="gap-1.5 px-2.5">
        <KanbanSquare className="size-4" />
        Board
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
