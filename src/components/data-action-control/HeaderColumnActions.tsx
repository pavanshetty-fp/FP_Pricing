import * as React from "react";
import { ArrowLeft, Search, Diff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SEARCH_FIELDS } from "./helpers";
import type { ColumnKey } from "@/components/tables-layout/types";

export interface HeaderColumnActionsProps {
  columns: { key: string; label: string }[];
  hidden: Set<ColumnKey>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  colScope: string;
  colQuery: string;
  onColScope: (s: string) => void;
  onColQuery: (q: string) => void;
}

/** A tool box: icon-only, expands to reveal its label while the box is hovered. */
const BOX =
  "flex h-8 items-center gap-1.5 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-2 text-muted-foreground shadow-fp-surface outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:text-foreground";
const LABEL =
  "max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200";

/**
 * Table-header actions (Unit 1) — progressive disclosure:
 *   rest → a faint `←` handle tucked at the header's right edge
 *   hover the header → the handle pushes out + brightens (nudge)
 *   hover the handle → it opens into two boxes: Search by Column · Show/Hide Columns
 *   hover a box → it expands to show its label
 * Opening is JS-controlled with a ~1s close delay, so the unit stays open while
 * you move between the two boxes. (Click opens each tool's popover.)
 */
export function HeaderColumnActions({
  columns,
  hidden,
  onToggle,
  onShowAll,
  onHideAll,
  colScope,
  colQuery,
  onColScope,
  onColQuery,
}: HeaderColumnActionsProps) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  const openNow = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setOpen(true);
  };
  const closeSoon = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 1000); // ~1s linger
  };
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const visibleCount = columns.filter((c) => !hidden.has(c.key as ColumnKey)).length;
  const allShown = visibleCount === columns.length;
  const colLabel = SEARCH_FIELDS.find((f) => f.key === colScope)?.label ?? "column";

  return (
    <div
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
      className={cn(
        "flex items-center gap-1 transition-all duration-200",
        // nudge: tucked + faint at rest, pushes out + brightens on header hover
        "translate-x-2 opacity-30 group-hover/table:translate-x-0 group-hover/table:opacity-100",
        open && "translate-x-0 opacity-100"
      )}
    >
      {/* Two tool boxes — revealed when open */}
      <div
        className={cn(
          "flex items-center gap-1 overflow-hidden transition-all duration-200",
          open ? "max-w-[460px] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {/* Search by Column */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Search by Column" className={cn("group/search", BOX, colQuery && "text-foreground")}>
              <Search className="size-4 shrink-0" />
              <span className={cn(LABEL, "group-hover/search:ml-0.5 group-hover/search:max-w-[150px] group-hover/search:opacity-100")}>
                Search by Column
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2 p-3" onOpenAutoFocus={openNow}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Search className="size-3.5" /> Search by Column
            </div>
            <Select value={colScope} onValueChange={onColScope}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Choose a column" />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={colQuery}
                onChange={(e) => onColQuery(e.target.value)}
                placeholder={`Find in ${colLabel}…`}
                className={cn("h-8 pl-8", colQuery && "pr-8")}
              />
              {colQuery && (
                <button
                  type="button"
                  aria-label="Clear column search"
                  onClick={() => onColQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Show/Hide Columns */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Show/Hide Columns" className={cn("group/cols", BOX)}>
              <Diff className="size-4 shrink-0" />
              <span className={cn(LABEL, "group-hover/cols:ml-0.5 group-hover/cols:max-w-[170px] group-hover/cols:opacity-100")}>
                Show/Hide Columns
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">Columns</span>
              <span className="rounded bg-fp-card-1 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {visibleCount}/{columns.length}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {columns.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent has-[:focus-visible]:bg-accent"
                >
                  <Checkbox checked={!hidden.has(c.key as ColumnKey)} onCheckedChange={() => onToggle(c.key)} />
                  <span className="flex-1 truncate">{c.label}</span>
                </label>
              ))}
            </div>
            <Separator className="my-1" />
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="flex-1" disabled={allShown} onClick={onShowAll}>Show all</Button>
              <Button variant="ghost" size="sm" className="flex-1" disabled={visibleCount === 0} onClick={onHideAll}>Hide all</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Collapsed handle — the `←` hint, hidden once open */}
      <div
        aria-hidden
        className={cn(
          "flex h-8 items-center justify-center rounded-md border border-fp-outline-1 bg-fp-surface-1a text-muted-foreground shadow-fp-surface transition-all duration-200 group-hover/table:text-foreground",
          open ? "w-0 overflow-hidden border-0 p-0 opacity-0" : "w-8 opacity-100"
        )}
      >
        <ArrowLeft className="size-4" />
      </div>
    </div>
  );
}
