import * as React from "react";
import { ChevronDown, Plus, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
            // Fills the whole cell (no inset, no outline) — the hover/open
            // background covers the entire td, per the design. The cell sits on
            // Surface-1b, so the hover lift uses --accent to stay visible.
            "flex h-full w-full items-center justify-between gap-2 px-3 py-2.5 text-left outline-none transition-colors",
            "hover:bg-accent",
            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
            "data-[state=open]:bg-accent"
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

/**
 * A free-text cell that fills the whole td (no inner input box). Mirrors
 * CellSelect: borderless, full-cell hover lift, and inset focus ring while
 * typing. Carries the full set of input states:
 *  - default / filled → text-foreground (placeholder muted when empty)
 *  - hover            → bg-accent (same lift as the dropdown cells)
 *  - typing / focus   → inset ring + Surface-1a wash
 *  - disabled         → muted + not-allowed cursor
 */
function CellInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    // Absolutely fills the cell (the parent td is `relative`). A table cell
    // gives no definite height for `h-full` to resolve against, so `inset-0`
    // is what makes the hover/focus surface span the entire td.
    <label
      className={cn(
        "absolute inset-0 flex cursor-text items-stretch transition-colors",
        "hover:bg-accent",
        "focus-within:bg-fp-surface-1a focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "h-full w-full min-w-0 bg-transparent px-3 text-sm text-foreground outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed"
        )}
      />
    </label>
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
        <table className="w-full table-fixed border-collapse">
          {/* Last column is pinned to exactly 52px (the delete/confirm control).
              The four data columns keep their 26/22/26/26 proportions; in a
              fixed layout the browser reserves the 52px and scales the
              percentages to the remaining width. */}
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[22%]" />
            <col className="w-[26%]" />
            <col className="w-[26%]" />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
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
                <td className="p-0 align-middle">
                  <CellSelect
                    value={row.peripheral}
                    options={PERIPHERAL_OPTIONS}
                    onChange={(v) => update(row.id, { peripheral: v })}
                  />
                </td>
                <td className="relative p-0 align-middle">
                  <CellInput
                    value={row.serial}
                    onChange={(v) => update(row.id, { serial: v })}
                    placeholder="Enter Serial No."
                  />
                </td>
                <td className="p-0 align-middle">
                  <CellSelect
                    value={row.condition}
                    options={CONDITION_OPTIONS}
                    onChange={(v) => update(row.id, { condition: v })}
                  />
                </td>
                <td className="p-0 align-middle">
                  <CellSelect
                    value={row.ownership}
                    options={OWNERSHIP_OPTIONS}
                    onChange={(v) => update(row.id, { ownership: v })}
                  />
                </td>
                {/* Last column — delete with inline confirm (Figma 28133:1526):
                    default → hover reveals trash → click swaps the same cell
                    space for a 52×52 vertical split: ✕ cancel (top, dark) over
                    ✓ confirm (bottom, red). */}
                <td className="p-0 align-middle">
                  {confirmId === row.id ? (
                    <div className="flex size-[52px] flex-col overflow-hidden rounded-md">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        aria-label="Cancel delete"
                        className="flex flex-1 items-center justify-center bg-fp-card-1 text-foreground outline-none transition-colors hover:bg-accent focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
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
                        className="flex flex-1 items-center justify-center bg-destructive text-white outline-none transition-colors hover:bg-destructive/90 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(row.id)}
                      aria-label="Delete row"
                      className="mx-auto flex size-7 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none transition-[color,opacity,background-color] group-hover/row:opacity-100 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
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
