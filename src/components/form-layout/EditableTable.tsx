import * as React from "react";
import { ChevronDown, Plus, Trash2, X, Check } from "lucide-react";
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
  // Row id whose delete is awaiting inline confirmation (✕ / red ✓).
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  // Add chip: icon-only until hovered/focused, then the label slides out.
  const [addExpanded, setAddExpanded] = React.useState(false);

  const update = (id: string, patch: Partial<EditableRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, makeRow(`er-${++idRef.current}`)]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div>
      {/* Bottom-left corner squared so the Add chip connects as an extension. */}
      <div className="overflow-hidden rounded-md rounded-bl-none border border-border">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[22%]" />
            <col className="w-[26%]" />
            <col className="w-[26%]" />
            <col className="w-[76px]" />
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
                {/* Last column — delete with inline confirm (Figma 28133:1526):
                    default → hover reveals trash → click reveals ✕ / red ✓. */}
                <td className="px-1 align-middle">
                  {confirmId === row.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        aria-label="Cancel delete"
                        className="flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeRow(row.id);
                          setConfirmId(null);
                        }}
                        aria-label="Confirm delete"
                        className="flex size-7 items-center justify-center rounded-sm bg-destructive text-white outline-none transition-colors hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(row.id)}
                      aria-label="Delete row"
                      className="ml-auto flex size-7 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none transition-[color,opacity,background-color] group-hover/row:opacity-100 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add a full row — a Surface-Base chip that connects to the table's
          bottom-left as an extension (squared top corners), sitting 1px below
          the table stroke. Icon-only until hover/focus, then "Add row" slides
          out. Hover is JS-driven so it's reliable inside the flex button. */}
      <Button
        variant="ghost"
        size="sm"
        onClick={addRow}
        onMouseEnter={() => setAddExpanded(true)}
        onMouseLeave={() => setAddExpanded(false)}
        onFocus={() => setAddExpanded(true)}
        onBlur={() => setAddExpanded(false)}
        className="mt-px h-7 gap-0 rounded-t-none rounded-b-md bg-background px-2 text-foreground hover:bg-background/80"
      >
        <Plus className="size-4 shrink-0" />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-[max-width,opacity,padding] duration-200",
            addExpanded ? "max-w-[90px] pl-1.5 opacity-100" : "max-w-0 opacity-0"
          )}
        >
          Add row
        </span>
      </Button>
    </div>
  );
}
