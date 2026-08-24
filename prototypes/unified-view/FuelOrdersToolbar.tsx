import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { GroupByMenu } from "@/components/tables-layout/GroupByMenu";
import { DateFilter } from "./DateFilter";
import { FuelOrdersFilters } from "./FuelOrdersFilters";
import type { FuelOrderColumnKey } from "./types";

/**
 * Fuel Orders action bar — the DS "Action bar" unit (Figma 27614:56583).
 * Controls are 32px (`size="sm"`); the search field keeps the DS's 348px width
 * with the column-visibility button attached to its right edge.
 *
 * The source app's six filter pills collapse into `Filters`, so this screen has
 * a single toolbar row instead of two. The delivery-date stepper is the one
 * exception — it stays out in the toolbar, because every row on screen is scoped
 * by it and its value has to stay readable without opening a panel.
 */
export interface FuelOrdersToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  columns: { key: FuelOrderColumnKey; label: string }[];
  hiddenColumns: Set<FuelOrderColumnKey>;
  onToggleColumn: (key: FuelOrderColumnKey) => void;
  date: Date;
  onDateChange: (d: Date) => void;
  onCreateOrder?: () => void;
}

export function FuelOrdersToolbar({
  searchValue,
  onSearchChange,
  columns,
  hiddenColumns,
  onToggleColumn,
  date,
  onDateChange,
  onCreateOrder,
}: FuelOrdersToolbarProps) {
  return (
    <div className="flex h-8 items-center justify-between gap-2">
      {/* Left cluster */}
      <div className="flex items-center gap-3">
        <div className="flex w-[348px] items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search fuel orders, sites, drivers..."
              aria-label="Search fuel orders"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn("h-8 rounded-r-none pl-8")}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Columns"
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
                  checked={!hiddenColumns.has(c.key)}
                  onCheckedChange={() => onToggleColumn(c.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <FuelOrdersFilters />
        <GroupByMenu />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <DateFilter value={date} onChange={onDateChange} />
        <Button size="sm" onClick={onCreateOrder}>
          <Plus />
          Create Order
        </Button>
      </div>
    </div>
  );
}
