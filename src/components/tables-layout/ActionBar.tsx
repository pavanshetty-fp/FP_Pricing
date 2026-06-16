import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterPanel } from "./FilterPanel";
import { GroupByMenu } from "./GroupByMenu";
import { SavedViewsMenu } from "./SavedViewsMenu";

export interface ActionBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onCreateTask?: () => void;
  /** Toggleable columns for the search's column-filters menu. */
  columns?: { key: string; label: string }[];
  /** Currently hidden column keys. */
  hiddenColumns?: Set<string>;
  /** Toggle a column's visibility. */
  onToggleColumn?: (key: string) => void;
}

/** Figma "Action bar" (id 27614:56583). Controls are 32px (size="sm"). */
export function ActionBar({
  searchValue = "",
  onSearchChange,
  onCreateTask,
  columns = [],
  hiddenColumns,
  onToggleColumn,
}: ActionBarProps) {
  return (
    <div className="flex h-8 items-center justify-between gap-2">
      {/* Left cluster */}
      <div className="flex items-center gap-3">
        {/* Search field with attached options button (InputGroup + ButtonGroup) */}
        <div className="flex w-[348px] items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              aria-label="Search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-8 rounded-r-none pl-8"
            />
          </div>
          {/* Column filters — show/hide table columns (Figma "Search bar with
              column filters"). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Column filters"
                className="-ml-px rounded-l-none"
              >
                <SlidersHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hiddenColumns?.has(c.key)}
                  onCheckedChange={() => onToggleColumn?.(c.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <FilterPanel />
        <GroupByMenu />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <SavedViewsMenu />
        <div className="h-8 w-px bg-border" aria-hidden />
        <Button size="sm" onClick={onCreateTask}>
          <Plus />
          Create Form
        </Button>
      </div>
    </div>
  );
}
