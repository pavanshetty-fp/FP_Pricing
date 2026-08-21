import { ChevronDown, ChevronsUpDown, CirclePlay } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { StatusBadge, StatusDot } from "./parts";
import type { DacColumnKey, DacRow } from "./data";

export type SortKey = "static" | "switch";
export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Sortable header cell — label + the sort affordance. */
function SortHead({
  label,
  active,
  onSort,
}: {
  label: string;
  active?: SortState["dir"];
  onSort: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSort}
      aria-label={`Sort by ${label}`}
      className="flex items-center gap-1 rounded-sm text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      {label}
      <ChevronsUpDown
        className={cn(
          "size-3 text-muted-foreground",
          active && "text-foreground"
        )}
      />
    </button>
  );
}

/**
 * The shared data region for both rebuilt screens. A bordered `rounded-md` box
 * that owns both scroll axes, with a sticky `thead` on a solid Surface-1a fill
 * so rows scroll under the titles (ui/6-execute "Data table").
 */
export function RebuildTable({
  rows,
  hidden,
  sort,
  onSort,
  selected,
  onSelect,
  onSelectAll,
  onToggleEnabled,
}: {
  rows: DacRow[];
  hidden: Set<DacColumnKey>;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onToggleEnabled: (id: string) => void;
}) {
  const shown = (key: DacColumnKey) => !hidden.has(key);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id));
  const dirFor = (key: SortKey) => (sort?.key === key ? sort.dir : undefined);

  return (
    <div
      className={cn(
        "mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-border",
        // The bordered box owns both scroll axes; neutralize the primitive's
        // inner overflow-x-auto or the sticky header breaks.
        "[&_[data-slot=table-container]]:overflow-visible"
      )}
    >
      <Table>
        <TableHeader className="sticky top-0 z-20 [&_th]:bg-fp-surface-1a [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
          <TableRow>
            <TableHead className="w-9 pl-3">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(c) => onSelectAll(c === true)}
                aria-label="Select all rows"
              />
            </TableHead>
            {shown("static") && (
              <TableHead className="w-[140px]">
                <SortHead
                  label="Static"
                  active={dirFor("static")}
                  onSort={() => onSort("static")}
                />
              </TableHead>
            )}
            {shown("dropdown") && <TableHead className="w-[180px]">Dropdown</TableHead>}
            {shown("descriptive") && (
              <TableHead className="w-[180px]">Descriptive Text</TableHead>
            )}
            {shown("badgeSolid") && <TableHead className="w-[120px]">Badge</TableHead>}
            {shown("badgeDot") && <TableHead className="w-[140px]">Badge</TableHead>}
            {shown("switch") && (
              <TableHead className="w-[110px]">
                <SortHead
                  label="Switch"
                  active={dirFor("switch")}
                  onSort={() => onSort("switch")}
                />
              </TableHead>
            )}
            {shown("button") && <TableHead className="w-[120px]">Button</TableHead>}
            {shown("action") && <TableHead className="w-[100px]">Dropdown</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isSelected = selected.has(row.id);
            return (
              <TableRow
                key={row.id}
                data-state={isSelected ? "selected" : undefined}
              >
                <TableCell className="pl-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(row.id)}
                    aria-label={`Select ${row.id}`}
                  />
                </TableCell>

                {shown("static") && (
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm">
                      <StatusDot status={row.status} />
                      {row.status}
                    </span>
                  </TableCell>
                )}

                {/* Editable-cell recipe: the trigger fills the whole cell and
                    hover paints bg-accent across it — no inset outline. */}
                {shown("dropdown") && (
                  <TableCell className="p-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-full w-full items-center justify-between gap-2 px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                        >
                          <span className="flex flex-col">
                            <span className="text-sm">{row.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.description}
                            </span>
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem>Option 1</DropdownMenuItem>
                        <DropdownMenuItem>Option 2</DropdownMenuItem>
                        <DropdownMenuItem>Option 3</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}

                {shown("descriptive") && (
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="text-sm">{row.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.description}
                      </span>
                    </span>
                  </TableCell>
                )}

                {shown("badgeSolid") && (
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                )}

                {shown("badgeDot") && (
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm">
                      <StatusDot status={row.status} />
                      {row.status}
                    </span>
                  </TableCell>
                )}

                {shown("switch") && (
                  <TableCell>
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={() => onToggleEnabled(row.id)}
                      aria-label="Toggle row"
                    />
                  </TableCell>
                )}

                {shown("button") && (
                  <TableCell>
                    <Button variant="secondary" size="sm">
                      Button
                    </Button>
                  </TableCell>
                )}

                {shown("action") && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Row actions"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <CirclePlay />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>Run</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
