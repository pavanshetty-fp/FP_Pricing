import * as React from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/*
  Editable "Input / Dropdown Tables Layout" + "Add more and hover and delete"
  (Figma 27593:15012 / 27592:33634). Fully editable cells: dropdown cells (two
  lines, open a combobox list) and free-text cells, with required-column markers
  (*), a row-hover delete control, and a "+ Add more" row affordance.
*/

interface TableCellValue {
  title: string;
  description: string;
}

interface EditableRow {
  id: string;
  peripheral: TableCellValue;
  serial: string;
  condition: TableCellValue;
  ownership: TableCellValue;
}

const PERIPHERAL_OPTIONS = ["Scanner", "Printer", "Sensor", "Router"];
const CONDITION_OPTIONS = ["New", "Refurbished", "Used", "Damaged"];
const OWNERSHIP_OPTIONS = ["Owned", "Leased", "Rented", "Third-party"];

const emptyCell = (): TableCellValue => ({
  title: "Table Cell Text",
  description: "Description Text",
});

const makeRow = (id: string): EditableRow => ({
  id,
  peripheral: emptyCell(),
  serial: "",
  condition: emptyCell(),
  ownership: emptyCell(),
});

/** A two-line cell that opens a combobox list and writes the choice back. */
function CellSelect({
  value,
  options,
  onChange,
}: {
  value: TableCellValue;
  options: string[];
  onChange: (v: TableCellValue) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-left outline-none transition-colors",
            "hover:border-fp-outline-2 hover:bg-fp-surface-1b",
            "focus-visible:ring-2 focus-visible:ring-ring/50",
            "data-[state=open]:border-fp-outline-2 data-[state=open]:bg-fp-card-1"
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm text-foreground">{value.title}</span>
            <span className="truncate text-xs text-muted-foreground">
              {value.description}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onSelect={() => onChange({ title: opt, description: value.description })}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RequiredLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

export function EditableTable() {
  const idRef = React.useRef(2);
  const [rows, setRows] = React.useState<EditableRow[]>([
    makeRow("er-1"),
    makeRow("er-2"),
  ]);

  const update = (id: string, patch: Partial<EditableRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, makeRow(`er-${++idRef.current}`)]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[22%]" />
            <col className="w-[26%]" />
            <col className="w-[26%]" />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-surface-1a">
              <th className="px-3 py-2.5 text-left">
                <RequiredLabel required>Peripheral</RequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <RequiredLabel>Input/Text</RequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <RequiredLabel>Condition</RequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <RequiredLabel required>Ownership Status</RequiredLabel>
              </th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group/row border-b border-border last:border-b-0"
              >
                <td className="px-2 py-1.5 align-middle">
                  <CellSelect
                    value={row.peripheral}
                    options={PERIPHERAL_OPTIONS}
                    onChange={(v) => update(row.id, { peripheral: v })}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <Input
                    value={row.serial}
                    onChange={(e) => update(row.id, { serial: e.target.value })}
                    placeholder="Enter Serial No."
                    className="h-9 border-transparent bg-transparent hover:border-input focus-visible:border-ring"
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <CellSelect
                    value={row.condition}
                    options={CONDITION_OPTIONS}
                    onChange={(v) => update(row.id, { condition: v })}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <CellSelect
                    value={row.ownership}
                    options={OWNERSHIP_OPTIONS}
                    onChange={(v) => update(row.id, { ownership: v })}
                  />
                </td>
                <td className="px-1 align-middle">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Delete row"
                    className="flex size-7 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none transition-[color,opacity,background-color] group-hover/row:opacity-100 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" className="mt-3" onClick={addRow}>
        <Plus />
        Add more
      </Button>
    </div>
  );
}
