import * as React from "react";
import {
  ChevronsUpDown,
  ChevronDown,
  CirclePlay,
  Bold,
  Italic,
  Underline,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COLUMNS } from "./data";
import type { RowStatus, TableRow as TableRowData } from "./types";

const STATUS_DOT: Record<RowStatus, string> = {
  Success: "bg-status-success",
  Processing: "bg-status-processing",
  Failed: "bg-status-failed",
};

function StatusText({ status }: { status: RowStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </span>
  );
}

function TwoLine({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col">
      <span className="truncate text-sm text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{description}</span>
    </div>
  );
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export interface DataTableProps {
  rows: TableRowData[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
}

export function DataTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
}: DataTableProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id));
  const headerState = allSelected ? true : someSelected ? "indeterminate" : false;

  return (
    <div className="overflow-x-auto">
      <Table style={{ tableLayout: "fixed" }}>
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="h-10">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "px-3 text-xs font-medium text-muted-foreground",
                  col.align === "right" && "text-right"
                )}
              >
                {col.key === "select" ? (
                  <Checkbox
                    checked={headerState}
                    onCheckedChange={(c) => onToggleAll(c === true)}
                    aria-label="Select all rows"
                  />
                ) : col.label ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      col.align === "right" && "flex-row-reverse"
                    )}
                  >
                    {col.label}
                    {col.sortable && (
                      <ChevronsUpDown className="size-3.5 opacity-70" />
                    )}
                  </span>
                ) : null}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onToggle={() => onToggleRow(row.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Row({
  row,
  selected,
  onToggle,
}: {
  row: TableRowData;
  selected: boolean;
  onToggle: () => void;
}) {
  const [switchOn, setSwitchOn] = React.useState(row.switchOn);
  const [toggle, setToggle] = React.useState(row.toggle);

  return (
    <TableRow data-state={selected ? "selected" : undefined} className="h-14">
      {/* select */}
      <TableCell className="px-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${row.id}`}
        />
      </TableCell>
      {/* Static */}
      <TableCell className="px-3">
        <StatusText status={row.status} />
      </TableCell>
      {/* Dropdown (two-line + chevron) */}
      <TableCell className="px-3">
        <div className="flex items-center justify-between gap-2">
          <TwoLine title={row.dropdown.title} description={row.dropdown.description} />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </TableCell>
      {/* Descriptive Text */}
      <TableCell className="px-3">
        <TwoLine
          title={row.descriptive.title}
          description={row.descriptive.description}
        />
      </TableCell>
      {/* Badge */}
      <TableCell className="px-3">
        <Badge variant="outline">{row.badge}</Badge>
      </TableCell>
      {/* Badge w/ avatar + status */}
      <TableCell className="px-3">
        <span className="inline-flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarFallback className="text-[10px]">U</AvatarFallback>
          </Avatar>
          <StatusText status={row.statusBadge} />
        </span>
      </TableCell>
      {/* Switch */}
      <TableCell className="px-3">
        <Switch
          checked={switchOn}
          onCheckedChange={setSwitchOn}
          aria-label="Toggle row"
        />
      </TableCell>
      {/* Button */}
      <TableCell className="px-3">
        <Button variant="outline" size="xs">
          Button
        </Button>
      </TableCell>
      {/* Icon dropdown */}
      <TableCell className="px-3">
        <Button variant="outline" size="icon-sm" aria-label="Open">
          <CirclePlay />
        </Button>
      </TableCell>
      {/* Progress */}
      <TableCell className="px-3">
        <Progress value={row.progress} className="h-1.5 w-24" />
      </TableCell>
      {/* Image */}
      <TableCell className="px-3">
        <div className="size-8 rounded-md border border-border bg-foreground/90" />
      </TableCell>
      {/* Toggle Group */}
      <TableCell className="px-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={toggle}
          onValueChange={(v) => v && setToggle(v)}
        >
          <ToggleGroupItem value="bold" aria-label="Bold" className="px-2">
            <Bold className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic" className="px-2">
            <Italic className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline" className="px-2">
            <Underline className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </TableCell>
      {/* Amount */}
      <TableCell className="px-3 text-right text-sm tabular-nums">
        {currency.format(row.amount)}
      </TableCell>
      {/* Actions */}
      <TableCell className="px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Row actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
