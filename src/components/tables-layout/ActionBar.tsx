import {
  Search,
  ArrowUpDown,
  ListFilter,
  Group,
  Columns3,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Button, Input } from "@/components/ui";

export interface ActionBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreateTask?: () => void;
}

/** Figma "Action bar" (id 27614:56583). */
export function ActionBar({
  searchValue = "",
  onSearchChange,
  onCreateTask,
}: ActionBarProps) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 px-4">
      {/* Left cluster */}
      <div className="flex items-center gap-3">
        {/* Search field with attached options button (InputGroup + ButtonGroup) */}
        <div className="flex w-[348px] items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              aria-label="Search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="rounded-r-none pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Sort options"
            className="-ml-px rounded-l-none"
          >
            <ArrowUpDown />
          </Button>
        </div>

        <Button variant="outline">
          <ListFilter />
          Filters
        </Button>
        <Button variant="outline">
          <Group />
          Group By
        </Button>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <Button variant="outline">
          <Columns3 />
          Views: Default View
          <ChevronDown />
        </Button>
        <div className="h-8 w-px bg-border" aria-hidden />
        <Button variant="primary" onClick={onCreateTask}>
          <Plus />
          Create Task
        </Button>
      </div>
    </div>
  );
}
