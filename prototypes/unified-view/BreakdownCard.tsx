/**
 * Hover-card breakdown content.
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
}

export interface BreakdownCardProps {
  title: string;
  rows: BreakdownRow[];
  /** Renders the dashed rule + bold total row. Omit to end after the rows. */
  total?: { label: string; value: string };
}

export function BreakdownCard({ title, rows, total }: BreakdownCardProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <h4 className="text-base font-semibold">{title}</h4>
      <div className="border-t border-dashed border-border" />

      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-6 text-sm text-muted-foreground"
          >
            <span className="min-w-0 truncate">{row.label}</span>
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
