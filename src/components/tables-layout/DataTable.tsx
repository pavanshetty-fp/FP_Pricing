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
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  Progress,
  Switch,
  ToggleGroup,
} from "@/components/ui";
import { COLUMNS } from "./data";
import type { RowStatus, TableRow } from "./types";

const STATUS_DOT: Record<RowStatus, string> = {
  Success: "bg-status-success",
  Processing: "bg-status-processing",
  Failed: "bg-status-failed",
};

const TOGGLE_ITEMS = [
  { value: "bold", label: "Bold", icon: <Bold /> },
  { value: "italic", label: "Italic", icon: <Italic /> },
  { value: "underline", label: "Underline", icon: <Underline /> },
];

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
  rows: TableRow[];
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
      <table className="w-full border-collapse text-left" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} style={{ width: `${c.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="h-10 border-b border-border">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-3 text-xs font-medium text-muted-foreground",
                  col.align === "right" && "text-right"
                )}
              >
                {col.key === "select" ? (
                  <Checkbox
                    checked={headerState}
                    onCheckedChange={onToggleAll}
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onToggle={() => onToggleRow(row.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  selected,
  onToggle,
}: {
  row: TableRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const [switchOn, setSwitchOn] = React.useState(row.switchOn);
  const [toggle, setToggle] = React.useState(row.toggle);

  return (
    <tr
      data-selected={selected}
      className="h-14 border-b border-border transition-colors hover:bg-muted/40 data-[selected=true]:bg-muted/60"
    >
      {/* select */}
      <td className="px-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${row.id}`}
        />
      </td>
      {/* Static */}
      <td className="px-3">
        <StatusText status={row.status} />
      </td>
      {/* Dropdown (two-line + chevron) */}
      <td className="px-3">
        <div className="flex items-center justify-between gap-2">
          <TwoLine title={row.dropdown.title} description={row.dropdown.description} />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </td>
      {/* Descriptive Text */}
      <td className="px-3">
        <TwoLine
          title={row.descriptive.title}
          description={row.descriptive.description}
        />
      </td>
      {/* Badge */}
      <td className="px-3">
        <Badge variant="outline">{row.badge}</Badge>
      </td>
      {/* Badge w/ avatar + status */}
      <td className="px-3">
        <span className="inline-flex items-center gap-2">
          <Avatar fallback="U" />
          <StatusText status={row.statusBadge} />
        </span>
      </td>
      {/* Switch */}
      <td className="px-3">
        <Switch
          checked={switchOn}
          onCheckedChange={setSwitchOn}
          aria-label="Toggle row"
        />
      </td>
      {/* Button */}
      <td className="px-3">
        <Button variant="outline" size="xs">
          Button
        </Button>
      </td>
      {/* Icon dropdown */}
      <td className="px-3">
        <Button variant="outline" size="icon-sm" aria-label="Open">
          <CirclePlay />
        </Button>
      </td>
      {/* Progress */}
      <td className="px-3">
        <Progress value={row.progress} className="w-24" />
      </td>
      {/* Image */}
      <td className="px-3">
        <div className="size-8 rounded-md border border-border bg-foreground/90" />
      </td>
      {/* Toggle Group */}
      <td className="px-3">
        <ToggleGroup items={TOGGLE_ITEMS} value={toggle} onValueChange={setToggle} />
      </td>
      {/* Amount */}
      <td className="px-3 text-right text-sm tabular-nums">
        {currency.format(row.amount)}
      </td>
      {/* Actions */}
      <td className="px-3">
        <DropdownMenu
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Row actions">
              <MoreHorizontal />
            </Button>
          }
          items={[
            { label: "Edit", icon: <Pencil /> },
            { label: "Share", icon: <Share2 /> },
            { label: "Delete", icon: <Trash2 />, destructive: true },
          ]}
        />
      </td>
    </tr>
  );
}
