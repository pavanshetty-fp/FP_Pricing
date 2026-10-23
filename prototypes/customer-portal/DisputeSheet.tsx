import * as React from "react";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { TableCellInput, TableRequiredLabel } from "@/components/form-layout/table-cells";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import { type PendingItem } from "../unified-view/PendingStrip";
import { TENANT } from "./orders";
import {
  DISPUTE_REASONS,
  aboutAmounts,
  asksFor,
  chargesOf,
  raiseDispute,
  type DisputeKind,
  type DisputedLine,
  type Invoice,
} from "./invoices";

/*
  DISPUTE AN INVOICE (Pavan, 2026-10-15 — the recommended flow). Opened over
  the invoice from its ⋯. What is wrong decides what the customer is asking
  for; the lines that are wrong are ticked and each given the amount it
  should be (the difference is what is in question); a note is required,
  proof optional. "Send dispute" puts the invoice — and its order — in
  "Invoice disputed". Details (PO, ship-to) asks for a corrected invoice, so
  no amounts; Not delivered asks for the whole invoice canceled.
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface Row extends DisputedLine {
  on: boolean;
}

export function DisputeSheet({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const c = chargesOf(invoice);
  const base = React.useMemo<Row[]>(
    () => [
      ...c.fuel.map((l) => ({ key: `fuel:${l.product}`, label: `Fuel · ${l.product}`, charged: l.amount, expected: l.amount, on: false })),
      { key: "fees", label: "Fees (delivery, environmental)", charged: c.fees, expected: c.fees, on: false },
      { key: "tax", label: "Tax (federal + state excise)", charged: c.tax, expected: c.tax, on: false },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoice.invoiceNo]
  );
  const [kind, setKind] = React.useState<DisputeKind | "">("");
  const [rows, setRows] = React.useState<Row[]>(base);
  const [note, setNote] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const input = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!open) return;
    setKind("");
    setRows(base);
    setNote("");
    setFiles([]);
  }, [open, base]);

  const amounts = kind !== "" && aboutAmounts(kind);
  const gone = kind === "Not delivered";
  const picked = gone ? rows.map((r) => ({ ...r, expected: 0 })) : rows.filter((r) => r.on);
  const diff = picked.reduce((t, r) => t + Math.max(0, r.charged - r.expected), 0);
  const set = (k: string, patch: Partial<Row>) => setRows((p) => p.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  const pending: PendingItem[] = [
    kind === "" && { key: "kind", label: "Say what is wrong", target: "dispute-what" },
    amounts && !gone && diff <= 0 && { key: "lines", label: "Tick a line and enter what it should be", target: "dispute-lines" },
    !note.trim() && { key: "note", label: "Add a note", target: "dispute-note" },
  ].filter(Boolean) as PendingItem[];

  return (
    <RecordSheet
      level={2}
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): lines = tick · item ·
         charged · should be. */
      fit={{ tables: [[CELL.check, CELL.name, CELL.number, CELL.number]] }}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle=""
      createTitle={`Dispute ${invoice.invoiceNo}`}
      createAction="Send dispute"
      showCancel={false}
      pending={pending}
      onSubmit={() => {
        if (kind === "") return;
        raiseDispute(invoice.invoiceNo, {
          kind,
          lines: picked.map((r) => ({ key: r.key, label: r.label, charged: r.charged, expected: r.expected })),
          note: note.trim(),
          files: files.map((f) => ({ name: f.name, type: f.type })),
        });
        toast.success(`Dispute sent to ${TENANT}`);
        onOpenChange(false);
      }}
    >
      <div className="flex min-w-0 flex-col gap-10">
        <SheetSection id="dispute-what" title="What is wrong">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Reason" required>
              <Combobox
                className="w-full"
                value={kind}
                onValueChange={(v) => setKind((v as DisputeKind) || "")}
                options={DISPUTE_REASONS.map((r) => r.kind)}
                placeholder="Select a reason"
                searchThreshold={99}
              />
            </SheetField>
            <SheetField label="You are asking for">
              <div className="flex min-h-9 items-center text-sm text-foreground">
                {kind ? asksFor(kind) : <span className="text-muted-foreground">—</span>}
              </div>
            </SheetField>
          </div>
        </SheetSection>

        {amounts && (
          <SheetSection id="dispute-lines" title="Lines in question" flush>
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[44px]" />
                <col />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th aria-hidden />
                  <th className="px-3 py-2.5 text-left">
                    <TableRequiredLabel>Item</TableRequiredLabel>
                  </th>
                  <th className="px-3 py-2.5">
                    <TableRequiredLabel>Charged</TableRequiredLabel>
                  </th>
                  <th className="px-3 py-2.5">
                    <TableRequiredLabel>Should be</TableRequiredLabel>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const on = gone || r.on;
                  return (
                    <tr key={r.key} className="h-11 border-b border-border">
                      <td className="px-3">
                        <Checkbox
                          checked={on}
                          disabled={gone}
                          aria-label={`Dispute ${r.label}`}
                          onCheckedChange={(v) => set(r.key, { on: v === true, expected: r.charged })}
                        />
                      </td>
                      <td className="truncate px-3 text-foreground">{r.label}</td>
                      <td className="px-3 tabular-nums text-foreground">{usd.format(r.charged)}</td>
                      <td className="relative p-0">
                        {gone ? (
                          <span className="flex h-full items-center px-3 tabular-nums text-foreground">{usd.format(0)}</span>
                        ) : (
                          <TableCellInput
                            value={on ? String(r.expected) : ""}
                            placeholder="—"
                            numeric
                            prefix="$"
                            disabled={!on}
                            aria-label={`What ${r.label} should be`}
                            onChange={(v) => set(r.key, { expected: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="h-12">
                  <td />
                  <td className="px-3 font-semibold text-foreground" colSpan={2}>
                    In question
                  </td>
                  <td className="px-3 font-semibold tabular-nums text-foreground">{usd.format(diff)}</td>
                </tr>
              </tbody>
            </table>
          </SheetSection>
        )}

        <SheetSection id="dispute-note" title="Note">
          <SheetField label="Note" required>
            <Textarea
              value={note}
              placeholder={`What ${TENANT} should know`}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-24"
            />
          </SheetField>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
              <Paperclip />
              Attach proof
            </Button>
            {files.length > 0 && (
              <span className="truncate text-xs text-muted-foreground">{files.map((f) => f.name).join(", ")}</span>
            )}
            <input
              ref={input}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const f = [...(e.target.files ?? [])];
                e.target.value = "";
                setFiles((p) => [...p, ...f]);
              }}
            />
          </div>
        </SheetSection>
      </div>
    </RecordSheet>
  );
}
