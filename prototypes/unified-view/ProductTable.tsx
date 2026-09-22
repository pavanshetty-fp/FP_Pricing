import * as React from "react";
import { Check, ChevronDown, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Product lines as an editable table.
 *
 * This is the DS's `form-layout/EditableTable` — "Input / Dropdown Tables
 * Layout" + "Add more and hover and delete" (Figma 27593:15012 / 27592:33634),
 * with the delete confirm from 28133:1526. Shell, cell behaviour, add chip and
 * delete interaction are copied class-for-class:
 *
 *   • shell        rounded-md with a SQUARED bottom-left, so the add chip reads
 *                  as an extension of the table rather than a loose button
 *   • header       bg-fp-surface-1a, px-3 py-2.5, required columns marked *
 *   • cells        p-0 td; the control fills the whole cell so hover paints edge
 *                  to edge (`hover:bg-accent` — the cell sits on Surface-1b, so
 *                  accent is what stays visible), focus ring inset
 *   • delete       hidden until row hover, then a trash icon; clicking swaps the
 *                  same cell for a vertical split — ✕ cancel over ✓ confirm on
 *                  destructive. Deleting a row is never one careless click.
 *   • add row      ghost chip pinned to the table's bottom-left, 1px below the
 *                  stroke, icon-only until hover/focus when the label slides out
 *
 * DS FOLLOW-UP: `EditableTable` is not exported from `form-layout/index.ts` and
 * takes no props — its columns, options and rows are hardcoded — so it cannot be
 * pointed at another dataset. Parameterise it (columns + rows + change handlers)
 * and delete this file.
 *
 * TWO DELIBERATE DEVIATIONS, both noted so they are not mistaken for drift:
 *   1. Cells are ONE line. The DS reference renders a title over a description
 *      ("Table Cell Text / Description Text"); a product has only a name, and a
 *      second line would be filler. Row height therefore tracks a single line,
 *      and the delete confirm sizes to the row rather than the DS's fixed 52px.
 *   2. The last remaining row cannot be deleted. An order with no product lines
 *      has no meaning; the DS table has no such constraint because its rows are
 *      optional.
 */

export interface ProductLine {
  name: string;
  gal: number;
}

/** Full-cell dropdown. One line; otherwise the DS CellSelect verbatim. */
function CellSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-full w-full items-center justify-between gap-2 px-3 py-2.5 text-left outline-none transition-colors",
            "hover:bg-accent",
            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
            "data-[state=open]:bg-accent"
          )}
        >
          <span className="min-w-0 truncate text-sm text-foreground">
            {value || "Select product"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {options.map((opt) => (
          <DropdownMenuItem key={opt} onSelect={() => onChange(opt)}>
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Full-cell text input — the DS CellInput, restricted to digits. */
function CellNumber({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <label
      className={cn(
        "absolute inset-0 flex cursor-text items-stretch transition-colors",
        "hover:bg-accent",
        "focus-within:bg-fp-surface-1a focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring/50"
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) =>
          onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
        }
        placeholder={placeholder}
        className="h-full w-full min-w-0 bg-transparent px-3 text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

function RequiredLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

export interface ProductTableProps {
  lines: ProductLine[];
  options: string[];
  onChange: (next: ProductLine[]) => void;
}

export function ProductTable({ lines, options, onChange }: ProductTableProps) {
  // Row index awaiting inline delete confirmation (✕ / red ✓).
  const [confirmIndex, setConfirmIndex] = React.useState<number | null>(null);
  const update = (i: number, patch: Partial<ProductLine>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const removeRow = (i: number) =>
    onChange(lines.filter((_, idx) => idx !== i));

  const total = lines.reduce((n, l) => n + l.gal, 0);

  return (
    <div>
      {/* NO BORDER AND NO RADIUS OF ITS OWN — the card supplies both. The
          section is `flush`, so the table's edges are the card's edges
          (DS ui §10f). */}
      <div className="overflow-hidden">
        <table className="w-full table-fixed border-collapse">
          {/* Delete column pinned; the two data columns scale to the rest. */}
          <colgroup>
            <col className="w-[58%]" />
            <col className="w-[42%]" />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <RequiredLabel required>Product</RequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <RequiredLabel required>Quantity (Gal)</RequiredLabel>
              </th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className="group/row border-b border-border last:border-b-0"
              >
                <td className="p-0 align-middle">
                  <CellSelect
                    value={line.name}
                    options={options}
                    onChange={(v) => update(i, { name: v })}
                  />
                </td>
                <td className="relative p-0 align-middle">
                  <CellNumber
                    value={line.gal}
                    onChange={(v) => update(i, { gal: v })}
                    placeholder="Enter gallons"
                  />
                </td>
                {/* Delete — hover reveals the trash, click swaps in ✕ / ✓. */}
                <td className="p-0 align-middle">
                  {confirmIndex === i ? (
                    <div className="flex h-full w-[52px] flex-col overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setConfirmIndex(null)}
                        aria-label="Cancel delete"
                        className="flex flex-1 items-center justify-center bg-fp-card-1 text-foreground outline-none transition-colors hover:bg-accent focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                      >
                        <X className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeRow(i);
                          setConfirmIndex(null);
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
                      onClick={() => setConfirmIndex(i)}
                      aria-label={`Delete ${line.name || "product"}`}
                      // An order needs at least one product line, so the last
                      // row keeps no delete affordance.
                      disabled={lines.length === 1}
                      className="mx-auto flex size-7 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none transition-[color,opacity,background-color] group-hover/row:opacity-100 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-0"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary row — inside the table so it reads as part of the ledger and
              stays aligned to the Quantity column. Derived from the rows above,
              so it can never disagree with them. */}
          <tfoot>
            <tr className="border-t border-border bg-fp-table-header">
              <td className="px-3 py-2.5 text-sm font-medium text-foreground">
                Total
              </td>
              <td className="px-3 py-2.5 text-sm font-semibold tabular-nums text-foreground">
                {total.toLocaleString()}
              </td>
              <td aria-hidden />
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
