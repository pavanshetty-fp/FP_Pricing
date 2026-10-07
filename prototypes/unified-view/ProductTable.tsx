import type * as React from "react";
import {
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout/table-cells";
import { TableRowRemove } from "@/components/form-layout/table-cells";

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

/*
  THE CELLS ARE THE DS'S `TableCell*` SINCE 2026-09-23. This table had its own
  `CellSelect` (a menu with no search) and `CellNumber`, so the one sales table
  looked and behaved unlike every 3PL and service table beside it — and the
  boxed-table check could not see it, because it looked for the DS names.
*/

/**
 * A COLUMN AFTER THE GALLONS (Pavan, 2026-10-07) — for a quote, which prices
 * each line. The cell is the caller's; the table keeps the shell, the add, the
 * delete and the total row. An order passes none and is unchanged.
 */
export interface ProductTableColumn<L extends ProductLine> {
  key: string;
  label: string;
  /** A colgroup width class, e.g. `w-[18%]`. */
  width: string;
  cell: (line: L, i: number) => React.ReactNode;
  /** The column's figure in the Total row. */
  total?: React.ReactNode;
  required?: boolean;
}

export interface ProductTableProps<L extends ProductLine = ProductLine> {
  lines: L[];
  options: string[];
  onChange: (next: L[]) => void;
  /** The row just added — its first cell takes the cursor (DS ui §10f). */
  focusRow?: number;
  /** Priced columns after the gallons — see `ProductTableColumn`. */
  columns?: ProductTableColumn<L>[];
  /* THE TWO HEADINGS, AS SALES SETTINGS NAME THEM (Pavan, 2026-10-07) — the
     form's Product and Quantity rows, and the Preferences unit after the
     quantity. */
  productLabel?: string;
  qtyLabel?: string;
}

export function ProductTable<L extends ProductLine = ProductLine>({
  lines,
  options,
  onChange,
  focusRow,
  columns = [],
  productLabel = "Product",
  qtyLabel = "Quantity (Gal)",
}: ProductTableProps<L>) {
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
            {columns.length === 0 ? (
              <>
                <col className="w-[58%]" />
                <col className="w-[42%]" />
              </>
            ) : (
              <>
                <col className="w-[30%]" />
                <col className="w-[16%]" />
                {columns.map((c) => (
                  <col key={c.key} className={c.width} />
                ))}
              </>
            )}
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel required>{productLabel}</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-right">
                <TableRequiredLabel required>{qtyLabel}</TableRequiredLabel>
              </th>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-right">
                  <TableRequiredLabel required={c.required}>{c.label}</TableRequiredLabel>
                </th>
              ))}
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className="group/row h-11 border-b border-border last:border-b-0"
              >
                <td className="relative p-0">
                  <TableCellSelect
                    value={line.name}
                    options={options}
                    placeholder="Select product"
                    autoFocus={i === focusRow}
                    aria-label={`Product for row ${i + 1}`}
                    onChange={(v) => update(i, { name: v })}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    value={String(line.gal)}
                    numeric
                    placeholder="Enter gallons"
                    aria-label={`Gallons of ${line.name || `row ${i + 1}`}`}
                    onChange={(v) => update(i, { gal: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="relative p-0">
                    {c.cell(line, i)}
                  </td>
                ))}
                {/* THE CONFIRM IS THE DS's NOW — `TableRowRemove`, the same ✕ / ✓
                    every table asks with. An order needs a product line, so
                    the last row keeps no bin. */}
                <td className="relative p-0 text-center">
                  <TableRowRemove
                    aria-label={`Remove ${line.name || `product ${i + 1}`}`}
                    disabled={lines.length === 1}
                    onRemove={() => removeRow(i)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary row — inside the table so it reads as part of the ledger and
              stays aligned to the Quantity column. Derived from the rows above,
              so it can never disagree with them. */}
          <tfoot>
            <tr className="h-11 border-t border-border">
              <td className="px-3 text-right text-sm text-muted-foreground">
                Total
              </td>
              <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                {total.toLocaleString()}
              </td>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-3 text-right text-sm font-medium tabular-nums text-foreground"
                >
                  {c.total}
                </td>
              ))}
              <td aria-hidden />
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
