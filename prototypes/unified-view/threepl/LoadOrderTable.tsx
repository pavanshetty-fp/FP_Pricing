import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCellSelect, TableRequiredLabel } from "@/components/form-layout";
import { loadOptions } from "./orders";

/** One product on the load order, and where it loads from. */
export interface LoadOrderRow {
  product: string;
  terminal?: string;
  supplier?: string;
  loadingAccount?: string;
  /**
   * Set aside, not deleted. The product is still on the order, so a deleted
   * row would come back blank on the next render.
   */
  excluded?: boolean;
}

/**
 * THE LOAD ORDER TABLE — one row per product, then Terminal, Supplier and
 * Loading Account, each narrowed by the one before it.
 *
 * The delivery order's load order, drawn per product. The Create recurring
 * rule sheet draws its load order BY ACCOUNT instead (Pavan, 2026-09-25) —
 * an account carries several products — so it has its own table. Flush (T1):
 * the card it sits in draws the rim.
 */
export function LoadOrderTable({
  rows,
  onChange,
}: {
  rows: LoadOrderRow[];
  onChange: (product: string, patch: Partial<LoadOrderRow>) => void;
}) {
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[44px]" />
        <col className="w-[26%]" />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          {/* No label: what the tick means is stated by the rows it dims, and
              a header for it would name the exception. */}
          <th aria-hidden />
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>Product</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel required>Terminal</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel required>Supplier</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel required>Loading Account</TableRequiredLabel>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          /* Narrowed by THIS product, then by what is chosen to its left. */
          const opts = loadOptions([row.product], row.terminal, row.supplier);
          const on = !row.excluded;
          return (
            <tr
              key={row.product}
              className="h-11 border-b border-border last:border-b-0"
            >
              {/* SET ASIDE, NOT DELETED. Unticking dims the row and disables
                  its cells, keeping whatever was chosen for the moment someone
                  ticks it again. */}
              <td className="px-3">
                <Checkbox
                  checked={on}
                  onCheckedChange={(c) =>
                    onChange(row.product, { excluded: c !== true })
                  }
                  aria-label={`Include ${row.product} in the load order`}
                />
              </td>
              <td
                className={cn(
                  "truncate px-3 text-sm",
                  on ? "text-foreground" : "text-muted-foreground line-through"
                )}
              >
                {row.product}
              </td>
              <td className="relative p-0">
                <TableCellSelect
                  value={row.terminal ?? ""}
                  options={opts.terminals}
                  placeholder="Terminal"
                  disabled={!on}
                  aria-label={`Terminal for ${row.product}`}
                  onChange={(v) =>
                    onChange(row.product, {
                      terminal: v,
                      supplier: undefined,
                      loadingAccount: undefined,
                    })
                  }
                />
              </td>
              <td className="relative p-0">
                <TableCellSelect
                  value={row.supplier ?? ""}
                  options={opts.suppliers}
                  placeholder="Supplier"
                  disabled={!on}
                  aria-label={`Supplier for ${row.product}`}
                  onChange={(v) =>
                    onChange(row.product, {
                      supplier: v,
                      loadingAccount: undefined,
                    })
                  }
                />
              </td>
              <td className="relative p-0">
                <TableCellSelect
                  value={row.loadingAccount ?? ""}
                  options={opts.accounts}
                  placeholder="Account"
                  disabled={!on}
                  aria-label={`Loading account for ${row.product}`}
                  onChange={(v) => onChange(row.product, { loadingAccount: v })}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
