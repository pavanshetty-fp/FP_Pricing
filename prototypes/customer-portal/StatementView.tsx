import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { DATE_FMT } from "../unified-view/data";
import { ACCOUNT, TENANT, printKey } from "./orders";
import { PRICES_AS_OF } from "./orders";
import { OPEN, amountDue, daysFrom, totalOf, type Invoice } from "./invoices";

/*
  STATEMENT & BALANCE (Pavan, 2026-10-15 — PRD FR-09, a tab inside
  Invoices): the account's ledger for the last 90 days — every invoice as a
  charge, every confirmed payment as a credit, the running balance — under
  four figures (opening, charges, payments, closing). Dated from the ERP;
  downloads as PDF or CSV. A payment the customer reported but the tenant
  has not confirmed is not on the statement yet.
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface Line {
  date: string;
  doc: string;
  what: string;
  charge: number;
  payment: number;
}

export function StatementView({
  invoices,
  segments,
  segmentValue,
  onSegmentChange,
}: {
  invoices: Invoice[];
  segments: { key: string; label: string }[];
  segmentValue: string;
  onSegmentChange: (k: string) => void;
}) {
  /* THE PERIOD — 90 days to today. */
  const inPeriod = (key: string) => daysFrom(key) >= -90 && daysFrom(key) <= 0;
  const lines: Line[] = [];
  for (const i of invoices) {
    if (inPeriod(i.issued))
      lines.push({ date: i.issued, doc: i.invoiceNo, what: `Invoice · ${i.orderNo} · ${i.shipTo}`, charge: totalOf(i), payment: 0 });
    if (i.status === "Payment confirmed" && i.paidOn && inPeriod(i.paidOn))
      lines.push({ date: i.paidOn, doc: i.invoiceNo, what: "Payment received", charge: 0, payment: totalOf(i) });
    /* A CREDIT NOTE FROM A DISPUTE IS ITS OWN ROW (Pavan, 2026-10-15). */
    const o = i.dispute?.outcome;
    if (o?.credit && o.creditNoteNo) {
      const k = o.at.slice(0, 10);
      if (inPeriod(k)) lines.push({ date: k, doc: o.creditNoteNo, what: `Credit note · ${i.invoiceNo} dispute`, charge: 0, payment: o.credit });
    }
  }
  lines.sort((a, b) => a.date.localeCompare(b.date) || b.charge - a.charge);
  const charges = lines.reduce((t, l) => t + l.charge, 0);
  const payments = lines.reduce((t, l) => t + l.payment, 0);
  /* THE CLOSING BALANCE IS WHAT IS STILL OPEN; the opening follows from it. */
  const closing = invoices.filter((i) => OPEN.includes(i.status) || i.status === "Paid").reduce((t, i) => t + amountDue(i), 0);
  /* ROUNDED TO THE CENT — no "-$0.00". */
  const opening = Math.round((closing - charges + payments) * 100) / 100 || 0;
  let running = opening;
  const rows = lines.map((l) => {
    running += l.charge - l.payment;
    return { ...l, balance: running };
  });

  const figures = [
    { label: "Opening balance", value: opening },
    { label: "Charges", value: charges },
    { label: "Payments", value: -payments },
    { label: "Closing balance", value: closing, strong: true },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE TAB SWITCH AND THE DOWNLOAD — the list's view-row place. */}
      <div className="flex h-12 shrink-0 items-end justify-between gap-3 border-b border-border">
        <p className="mb-2.5 text-xs text-muted-foreground">
          {ACCOUNT} · last 90 days · as of {DATE_FMT.format(PRICES_AS_OF)} from {TENANT}
        </p>
        <span className="mb-2.5 flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={segmentValue}
            onValueChange={(v) => v && onSegmentChange(v)}
            aria-label="Invoices or statement"
            className="h-7"
          >
            {segments.map((s) => (
              <ToggleGroupItem key={s.key} value={s.key} className="h-7 px-2.5 text-xs font-normal data-[state=on]:font-medium">
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="outline" size="sm" className="h-7" onClick={() => toast.success("Statement downloaded")}>
            <Download />
            Download
          </Button>
        </span>
      </div>

      <div className="mt-4 grid shrink-0 grid-cols-2 divide-border rounded-xl border border-border bg-fp-surface-1b sm:grid-cols-4 sm:divide-x">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col gap-1 px-4 py-3">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className={cn("tabular-nums text-foreground", f.strong ? "text-xl font-semibold" : "text-lg font-medium")}>
              {usd.format(f.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[130px]" />
            <col className="w-[120px]" />
            <col />
            <col className="w-[140px]" />
            <col className="w-[140px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-fp-table-header text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Document</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="px-3 py-2.5 text-right font-medium">Charges</th>
              <th className="px-3 py-2.5 text-right font-medium">Payments</th>
              <th className="px-4 py-2.5 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-11 border-b border-border text-muted-foreground">
              <td className="px-4" colSpan={5}>
                Opening balance
              </td>
              <td className="px-4 text-right tabular-nums">{usd.format(opening)}</td>
            </tr>
            {rows.map((l, k) => (
              <tr key={k} className="h-11 border-b border-border last:border-b-0">
                <td className="px-4 text-foreground">{printKey(l.date)}</td>
                <td className="px-3 tabular-nums text-foreground">{l.doc}</td>
                <td className="truncate px-3 text-muted-foreground">{l.what}</td>
                <td className="px-3 text-right tabular-nums text-foreground">{l.charge ? usd.format(l.charge) : "—"}</td>
                <td className="px-3 text-right tabular-nums text-foreground">{l.payment ? usd.format(l.payment) : "—"}</td>
                <td className="px-4 text-right font-medium tabular-nums text-foreground">{usd.format(l.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
