import * as React from "react";
import { Pill } from "@/components/ui/pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Breakdown content — what a "+N" chip or a total opens.
 *
 * The anatomy is the DS's own, copied from `InvoiceCard` (Figma "Invoice"
 * 27599:62303) — the only hover-card content pattern in the DS, and the one the
 * DS DataTable puts in its Amount column:
 *
 *   flex w-full flex-col gap-4
 *     h4  text-base font-semibold          ← title, foreground (not a muted label)
 *     border-t border-dashed border-border  ← rule under the title
 *     flex flex-col gap-1                   ← detail rows
 *       flex items-center justify-between text-sm text-muted-foreground
 *       …value spans carry tabular-nums
 *     border-t border-dashed border-border  ← rule before the total
 *     flex items-center justify-between text-base font-semibold  ← total
 *
 * The container keeps `HoverCardContent`'s default `p-4`; width is the only
 * override, which is the one the DS itself makes (`w-[380px]` for the Invoice
 * card). Rows with no `value` render as a plain list (the products case).
 */
export interface BreakdownRow {
  label: string;
  /** Omit for a label-only list. */
  value?: string;
  /**
   * A second line under the label — what the row carries (Pavan, 2026-10-14:
   * an asset's products under its name, its capacity as the value).
   */
  sub?: string;
}

/**
 * A GROUPED TABLE instead of rows (Pavan, 2026-10-14 — a ship-to's products,
 * each with its assets, their type and capacity). Same card: title, dashed
 * rule, the card's own type sizes; a header row, then a band per group.
 */
export interface BreakdownTable {
  columns: { label: string; align?: "left" | "right" }[];
  groups: { label: string; rows: string[][] }[];
}

export interface BreakdownCardProps {
  title: string;
  rows: BreakdownRow[];
  table?: BreakdownTable;
  /** Renders the dashed rule + bold total row. Omit to end after the rows. */
  total?: { label: string; value: string };
}

export function BreakdownCard({ title, rows, table, total }: BreakdownCardProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <h4 className="text-base font-semibold">{title}</h4>
      <div className="border-t border-dashed border-border" />

      {table && (
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              {table.columns.map((c) => (
                <th key={c.label} className={cn("pb-1.5 font-medium", c.align === "right" ? "text-right" : "text-left")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          {table.groups.map((g) => (
            <tbody key={g.label}>
              {/* THE GROUP — its name on a quiet band across the table; an
                  unnamed group (a plain table) has no band. */}
              {g.label && <tr>
                <td colSpan={table.columns.length} className="pt-2">
                  <span className="block rounded-sm bg-fp-table-header px-2 py-1 text-xs font-semibold text-foreground">
                    {g.label}
                  </span>
                </td>
              </tr>}
              {g.rows.map((r, i) => (
                <tr key={i} className="text-muted-foreground">
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      /* THE NAME TRUNCATES; the rest wrap, so a list of
                         products is read whole. */
                      className={cn(
                        "py-1 pr-2 align-top",
                        j === 0 ? "truncate pl-2 text-foreground" : "break-words",
                        table.columns[j]?.align === "right" && "text-right tabular-nums"
                      )}
                      title={cell}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}

      <div className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className={cn(
              "flex justify-between gap-6 text-sm text-muted-foreground",
              row.sub ? "items-baseline py-0.5" : "items-center"
            )}
          >
            {row.sub ? (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-foreground">{row.label}</span>
                <span className="text-xs">{row.sub}</span>
              </span>
            ) : (
              <span className="min-w-0 truncate">{row.label}</span>
            )}
            {row.value && (
              <span className="shrink-0 tabular-nums">{row.value}</span>
            )}
          </div>
        ))}
      </div>

      {total && (
        <>
          <div className="border-t border-dashed border-border" />
          <div className="flex items-center justify-between gap-6 text-base font-semibold">
            <span>{total.label}</span>
            <span className="tabular-nums">{total.value}</span>
          </div>
        </>
      )}
    </div>
  );
}

/*
  ONE WAY TO OPEN A BREAKDOWN, EVERYWHERE (Pavan, 2026-10-14). A "+N" chip —
  or, where the whole cell IS the figure (a quantity), the figure — opens the
  card ON CLICK, above the cell. Not hover: touch cannot hover, and a card
  that appears under a passing pointer is one nobody asked for. The press
  stays in the cell: a row that opens its record on click must not open it
  as well.
*/
export function BreakdownPopover({
  trigger,
  label,
  card,
  width = 280,
  align = "start",
  className,
}: {
  /** The pressable face — a chip, or the figure. */
  trigger: React.ReactNode;
  /** What the press does, for a screen reader. */
  label: string;
  card: BreakdownCardProps;
  width?: number;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            className
          )}
        >
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="top"
        style={{ width }}
        className="max-h-96 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <BreakdownCard {...card} />
      </PopoverContent>
    </Popover>
  );
}

/** The "+N" chip that opens a breakdown. */
export function OverflowChip({
  count,
  label,
  card,
  width,
}: {
  count: number;
  label: string;
  card: BreakdownCardProps;
  width?: number;
}) {
  return (
    <BreakdownPopover
      label={label}
      card={card}
      width={width}
      trigger={<Pill className="cursor-pointer tabular-nums">+{count}</Pill>}
    />
  );
}
