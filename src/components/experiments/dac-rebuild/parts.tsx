import * as React from "react";
import {
  Check,
  Columns3,
  Download,
  Group,
  KanbanSquare,
  ListFilter,
  Plus,
  Table2,
  TextSearch,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  DAC_COLUMNS,
  GROUP_BY_OPTIONS,
  SEARCH_SCOPES,
  STATUS_DOT,
  statusBadgeVariant,
  type DacColumnKey,
  type DacStatus,
  type GroupByKey,
  type SearchScope,
} from "./data";

const STATUSES: DacStatus[] = ["Success", "Processing", "Failed"];

/* ------------------------------------------------------------------ atoms -- */

/** Icon-only toolbar control: ghost icon button + tooltip + aria-label. */
export function IconTool({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            active && "bg-accent text-foreground"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Vertical hairline separating toolbar groups. */
export function ToolDivider() {
  return <Separator orientation="vertical" className="mx-1 !h-5" />;
}

/** Status dot — soft status token, sized to sit inline with the label. */
export function StatusDot({ status }: { status: DacStatus }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
    />
  );
}

/** Solid-reading status badge; variant follows the data's meaning. */
export function StatusBadge({ status }: { status: DacStatus }) {
  return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>;
}

/* ------------------------------------------------------- preset view tabs -- */

/**
 * Preset-view tab bar (ui/6-execute "Preset-view tabs"): `line` tabs at
 * text-xs whose active underline hugs the label, plus a "+ View" affordance.
 * `-mx-4` spans the content-layer width; `-mt-3.5` pulls it ~12px under the
 * compact header (L2).
 */
export function PresetTabs({
  views,
  active,
  onSelect,
  onAdd,
}: {
  views: string[];
  active: string;
  onSelect: (view: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="-mx-4 -mt-3.5 flex shrink-0 items-center gap-1 border-b border-border px-3">
      <Tabs value={active} onValueChange={onSelect}>
        <TabsList variant="line" className="h-8 p-0">
          {views.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              // inset-x-2 pulls the underline in by the trigger's padding so it
              // hugs the label rather than the whole hit area.
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
        onClick={onAdd}
        className="text-muted-foreground hover:text-foreground"
      >
        <Plus />
        View
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------ data ops ----- */

/** Faceted status filter. `compact` renders the icon-only trigger (Opt 2). */
export function FilterMenu({
  value,
  onChange,
  compact,
}: {
  value: Set<DacStatus>;
  onChange: (next: Set<DacStatus>) => void;
  compact?: boolean;
}) {
  const toggle = (status: DacStatus) => {
    const next = new Set(value);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    onChange(next);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Filters"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              value.size > 0 && "bg-accent text-foreground"
            )}
          >
            <ListFilter />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <ListFilter />
            Filters
            {value.size > 0 && (
              <span className="ml-0.5 text-xs text-muted-foreground tabular-nums">
                {value.size}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Static</p>
        <div className="flex flex-col gap-2">
          {STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <Checkbox
                id={`dac-rebuild-filter-${status}`}
                checked={value.has(status)}
                onCheckedChange={() => toggle(status)}
              />
              <Label
                htmlFor={`dac-rebuild-filter-${status}`}
                className="flex items-center gap-1.5 text-sm font-normal"
              >
                <StatusDot status={status} />
                {status}
              </Label>
            </div>
          ))}
        </div>
        {value.size > 0 && (
          <>
            <Separator className="my-3" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(new Set())}
            >
              Clear
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Group-by control. `compact` renders the icon-only trigger (Opt 2). */
export function GroupByMenu({
  value,
  onChange,
  compact,
}: {
  value: GroupByKey;
  onChange: (next: GroupByKey) => void;
  compact?: boolean;
}) {
  const activeLabel = GROUP_BY_OPTIONS.find((o) => o.key === value)?.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Group By"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              value !== "none" && "bg-accent text-foreground"
            )}
          >
            <Group />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Group />
            Group By
            {value !== "none" && (
              <span className="ml-0.5 text-xs text-muted-foreground">
                {activeLabel}
              </span>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Group rows by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as GroupByKey)}
        >
          {GROUP_BY_OPTIONS.map((o) => (
            <DropdownMenuRadioItem key={o.key} value={o.key}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Table ↔ board view switch. */
export function ViewSwitch({
  value,
  onChange,
}: {
  value: "table" | "board";
  onChange: (next: "table" | "board") => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as "table" | "board")}
      className="gap-0.5"
    >
      <ToggleGroupItem value="table" aria-label="Table view" className="size-8">
        <Table2 />
      </ToggleGroupItem>
      <ToggleGroupItem value="board" aria-label="Board view" className="size-8">
        <KanbanSquare />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Search scoped to one column. */
export function ColumnSearch({
  scope,
  onScopeChange,
  query,
  onQueryChange,
}: {
  scope: SearchScope;
  onScopeChange: (next: SearchScope) => void;
  query: string;
  onQueryChange: (next: string) => void;
}) {
  const scoped = scope !== "all" && query.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search by column"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            scoped && "bg-accent text-foreground"
          )}
        >
          <TextSearch />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Search in column
        </p>
        <div className="mb-3 flex flex-col gap-0.5">
          {SEARCH_SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onScopeChange(s.key)}
              className={cn(
                "flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                scope === s.key ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
              {scope === s.key && <Check className="size-4" />}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search…"
          aria-label="Column search term"
          className="h-8"
        />
      </PopoverContent>
    </Popover>
  );
}

/** Show / hide columns. */
export function ColumnVisibility({
  hidden,
  onToggle,
}: {
  hidden: Set<DacColumnKey>;
  onToggle: (key: DacColumnKey) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Show or hide columns"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            hidden.size > 0 && "bg-accent text-foreground"
          )}
        >
          <Columns3 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DAC_COLUMNS.map((c, i) => (
          <DropdownMenuCheckboxItem
            key={`${c.key}-${i}`}
            checked={!hidden.has(c.key)}
            onCheckedChange={() => onToggle(c.key)}
            onSelect={(e) => e.preventDefault()}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Import / export menu for the content-layer header's right slot. Exported so
 * the gallery can place it beside the theme toggle.
 */
export function ExportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Import or export"
          className="text-muted-foreground hover:text-foreground"
        >
          <Upload />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem>
          <Download />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Upload />
          Import CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
