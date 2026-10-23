import * as React from "react";
import { toast } from "sonner";
import { Download, Flag, MoreHorizontal } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { kindTone } from "../unified-view/statusKind";
import { DisputeSheet } from "./DisputeSheet";

const DISPUTES_ON = false;
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { cn } from "@/lib/utils";
import { CELL, RecordSheet } from "../unified-view/RecordSheet";
import { HangingAdd } from "../unified-view/HangingAdd";
import { DocumentsTable } from "../unified-view/DocumentsTable";
import { documentRows } from "./OrderRequestSheet";
import { ACCOUNT, printKey } from "./orders";
import {
  FEES_PER_GAL,
  INVOICE_STATUS_TONE,
  ISSUER,
  SETTLED,
  TAX_RATE,
  addDisputeDocuments,
  addDisputeNote,
  amountDue,
  asksFor,
  canReply,
  chargesOf,
  closeDispute,
  daysFrom,
  disputeOpen,
  inQuestion,
  type Dispute,
  type Invoice,
} from "./invoices";

/*
  THE INVOICE SHEET (Pavan, 2026-10-14) — the reference's invoice panel in
  our record sheet, read-only: what it is for (order, bill to, ship-to,
  dates, status), then the charges line by line to the total. No payment
  form — the portal does not take payments yet; Download invoice is the act.
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const rate = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 3, maximumFractionDigits: 4 });

const WHEN = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/*
  THE DISPUTE (Pavan, 2026-10-14) — what is disputed and why, the notes both
  sides have added (newest last, as a conversation reads), a box to add one,
  and the documents offered as proof with Add document — the Orders
  documents table, so the same data wears the same control.
*/
function DisputeSections({ invoice, dispute, total }: { invoice: Invoice; dispute: Dispute; total: number }) {
  const [draft, setDraft] = React.useState("");
  const fileInput = React.useRef<HTMLInputElement>(null);
  const diff = dispute.claimed !== null ? total - dispute.claimed : null;
  return (
    <>
      {dispute.kind ? (
        /* THE CUSTOMER'S DISPUTE (Pavan, 2026-10-15) — what is wrong, what
           they asked for, the lines in question, and the tenant's answer. */
        <SheetSection title="Invoice dispute">
          <div className="grid grid-cols-4 gap-4">
            <Fact label="Raised by">
              <span>{dispute.raisedBy}</span>
              <span className="text-xs text-muted-foreground">{WHEN.format(new Date(dispute.raisedAt))}</span>
            </Fact>
            <Fact label="What is wrong">{dispute.kind}</Fact>
            <Fact label="Asking for">{asksFor(dispute.kind)}</Fact>
            <Fact label="In question">
              <span className="font-semibold tabular-nums">{usd.format(inQuestion(invoice))}</span>
            </Fact>
          </div>
          {dispute.lines && dispute.lines.length > 0 && (
            <dl className="flex flex-col rounded-lg border border-border">
              {dispute.lines.map((l) => (
                <div key={l.key} className="flex h-10 items-center justify-between gap-4 border-b border-border px-3 text-sm last:border-b-0">
                  <dt className="truncate text-foreground">{l.label}</dt>
                  <dd className="shrink-0 tabular-nums text-muted-foreground">
                    {usd.format(l.charged)} → <span className="text-foreground">{usd.format(l.expected)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {dispute.outcome && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-fp-table-header p-3 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <StatusChip
                  tone={kindTone(dispute.outcome.result === "Rejected" ? "neutral" : "success")}
                  variant="soft"
                >
                  {dispute.outcome.result}
                </StatusChip>
                <span className="text-xs text-muted-foreground">
                  {dispute.outcome.by} · {WHEN.format(new Date(dispute.outcome.at))}
                </span>
              </span>
              <span className="text-foreground">{dispute.outcome.note}</span>
              {dispute.outcome.credit !== undefined && (
                <span className="tabular-nums text-foreground">
                  Credit note {dispute.outcome.creditNoteNo} · {usd.format(dispute.outcome.credit)}
                </span>
              )}
              {dispute.closedAt ? (
                <span className="text-xs text-muted-foreground">Closed {WHEN.format(new Date(dispute.closedAt))}</span>
              ) : (
                <span className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      closeDispute(invoice.invoiceNo);
                      toast.success(`Dispute on ${invoice.invoiceNo} closed`);
                    }}
                  >
                    Close dispute
                  </Button>
                </span>
              )}
            </div>
          )}
        </SheetSection>
      ) : (
        <SheetSection title="Payment dispute">
          <div className="grid grid-cols-4 gap-4">
            <Fact label="Raised by">
              <span>{dispute.raisedBy}</span>
              <span className="text-xs text-muted-foreground">{WHEN.format(new Date(dispute.raisedAt))}</span>
            </Fact>
            <Fact label="Invoiced">
              <span className="tabular-nums">{usd.format(total)}</span>
            </Fact>
            <Fact label="You say">
              <span className="tabular-nums">{dispute.claimed !== null ? usd.format(dispute.claimed) : "—"}</span>
            </Fact>
            <Fact label="Difference">
              <span className="font-semibold tabular-nums text-status-failed">{diff !== null ? usd.format(diff) : "—"}</span>
            </Fact>
          </div>
          <SheetField label="Reason">
            <p className="text-sm text-foreground">{dispute.reason}</p>
          </SheetField>
        </SheetSection>
      )}

      <SheetSection title="Notes">
        <ol className="flex flex-col gap-4">
          {dispute.notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  n.side === "customer" ? "bg-muted text-foreground" : "bg-brand/10 text-brand"
                )}
              >
                {n.by
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-medium text-foreground">{n.by}</span>
                  <Pill>{n.side === "customer" ? ACCOUNT : ISSUER}</Pill>
                  <span className="text-xs text-muted-foreground">{WHEN.format(new Date(n.at))}</span>
                </p>
                <p className="text-sm whitespace-pre-line text-foreground">{n.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {/* A REJECTED DISPUTE TAKES ONE MORE REPLY; a closed one none. */}
        {canReply(dispute) && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Textarea
            aria-label="Add a note"
            placeholder={`Add a note for ${ISSUER}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-20"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                addDisputeNote(invoice.invoiceNo, draft.trim());
                setDraft("");
              }}
            >
              {dispute.outcome?.result === "Rejected" ? "Send reply" : "Add note"}
            </Button>
          </div>
        </div>
        )}
      </SheetSection>

      <SheetSection
        title="Documents"
        flush
        hanging={<HangingAdd label="Add document" onClick={() => fileInput.current?.click()} />}
      >
        <DocumentsTable
          rows={documentRows(dispute.documents)}
          onAdd={() => fileInput.current?.click()}
          onDownload={(d) => toast.success(`${d.name} downloaded`)}
        />
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length === 0) return;
            addDisputeDocuments(invoice.invoiceNo, files);
            toast.success(files.length === 1 ? `${files[0].name} added` : `${files.length} documents added`);
          }}
        />
      </SheetSection>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <SheetField label={label}>
      <div className="flex min-h-9 flex-col justify-center text-sm text-foreground">{children}</div>
    </SheetField>
  );
}

const settled_ = (i: Invoice) => SETTLED.includes(i.status);

export function InvoiceSheet({
  invoice,
  open,
  onOpenChange,
  onDownload,
  orderLink,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (inv: Invoice) => void;
  /** The order number as a link, when it can open (PRD FR-10). */
  orderLink?: (orderNo: string) => React.ReactNode;
}) {
  const [disputing, setDisputing] = React.useState(false);
  if (!invoice) return null;
  const c = chargesOf(invoice);
  /* ONE OPEN DISPUTE PER INVOICE; a settled invoice is not disputed here. */
  /* DISPUTES ARE HIDDEN FOR NOW (Pavan, 2026-10-20 — not in the product
     yet, per the Anirudh review). The flow stays built: DISPUTES_ON brings it
     back. */
  const canDispute = DISPUTES_ON && !settled_(invoice) && !disputeOpen(invoice) && invoice.status !== "Payment disputed";
  const d = daysFrom(invoice.due);
  const settled = SETTLED.includes(invoice.status);
  return (
    <>
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): charges = item name, basis
         ("gal @ rate", text), amount; dispute documents = document name, added
         date, by (pick), menu. Charges is the widest. */
      fit={{
        tables: [
          [CELL.name, CELL.text, CELL.number],
          ...(invoice.dispute ? [[CELL.name, CELL.date, CELL.pick, CELL.bin]] : []),
        ],
      }}
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={invoice.invoiceNo}
      createTitle=""
      createAction=""
      showCancel={false}
      onSubmit={() => {}}
      headerAside={
        <StatusChip tone={INVOICE_STATUS_TONE[invoice.status]} variant="text">
          {invoice.status}
        </StatusChip>
      }
      headerMenu={
        canDispute ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More invoice actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setDisputing(true)}>
                <Flag />
                Dispute invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      headerActions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Download invoice" onClick={() => onDownload(invoice)}>
              <Download />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download invoice</TooltipContent>
        </Tooltip>
      }
      footerPrimary={
        <Button onClick={() => onDownload(invoice)}>
          <Download />
          Download invoice
        </Button>
      }
    >
      <div className="flex min-w-0 flex-col gap-10">
        <SheetSection title="Summary">
          <div className="grid grid-cols-3 gap-4">
            <Fact label="Order">{orderLink ? orderLink(invoice.orderNo) : invoice.orderNo}</Fact>
            <Fact label="Bill to">{invoice.billTo}</Fact>
            <Fact label="Ship-to">{invoice.shipTo}</Fact>
            <Fact label="Issued">
              <span>{printKey(invoice.issued)}</span>
              <span className="text-xs text-muted-foreground">by {ISSUER}</span>
            </Fact>
            <Fact label="Due">
              <span>{printKey(invoice.due)}</span>
              {invoice.status === "Invoice disputed" ? (
                <span className="text-xs text-muted-foreground">Paused · disputed</span>
              ) : !settled && (
                <span className={cn("text-xs", d < 0 ? "text-status-failed" : "text-muted-foreground")}>
                  {d < 0 ? `${-d} ${d === -1 ? "day" : "days"} overdue` : d === 0 ? "Due today" : `In ${d} ${d === 1 ? "day" : "days"}`}
                </span>
              )}
            </Fact>
            {/* THE STATUS IS IN THE HEADER — this slot says what it means. */}
            {settled ? (
              <Fact label="Paid on">{invoice.paidOn ? printKey(invoice.paidOn) : "—"}</Fact>
            ) : (
              <Fact label="Amount due">
                <span className="font-semibold tabular-nums">{usd.format(amountDue(invoice))}</span>
                {invoice.dispute?.outcome?.credit !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    after credit note {invoice.dispute.outcome.creditNoteNo}
                  </span>
                )}
              </Fact>
            )}
          </div>
        </SheetSection>

        {invoice.dispute && <DisputeSections invoice={invoice} dispute={invoice.dispute} total={c.total} />}

        <SheetSection title="Charges" flush>
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col />
              <col className="w-[40%]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-fp-table-header text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-3 py-2.5 font-medium">Basis</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {c.fuel.map((l) => (
                <tr key={l.product} className="h-11 border-b border-border">
                  <td className="px-4 text-foreground">Fuel · {l.product}</td>
                  <td className="px-3 tabular-nums text-muted-foreground">
                    {l.gal.toLocaleString()} gal @ {rate.format(l.rate)}
                  </td>
                  <td className="px-4 tabular-nums text-foreground">{usd.format(l.amount)}</td>
                </tr>
              ))}
              <tr className="h-11 border-b border-border">
                <td className="px-4 text-foreground">Fees (delivery, environmental)</td>
                <td className="px-3 tabular-nums text-muted-foreground">
                  {c.gal.toLocaleString()} gal @ {rate.format(FEES_PER_GAL)}
                </td>
                <td className="px-4 tabular-nums text-foreground">{usd.format(c.fees)}</td>
              </tr>
              <tr className="h-11 border-b border-border">
                <td className="px-4 text-foreground">Tax (federal + state excise)</td>
                <td className="px-3 tabular-nums text-muted-foreground">{Math.round(TAX_RATE * 100)}%</td>
                <td className="px-4 tabular-nums text-foreground">{usd.format(c.tax)}</td>
              </tr>
              <tr className="h-12">
                <td className="px-4 font-semibold text-foreground" colSpan={2}>
                  {settled ? "Total paid" : "Total due"}
                </td>
                <td className="px-4 font-semibold tabular-nums text-foreground">{usd.format(c.total)}</td>
              </tr>
            </tbody>
          </table>
        </SheetSection>
      </div>
      {/* INSIDE THE SHEET, so it knows the width beneath it (a strip shows). */}
      <DisputeSheet invoice={invoice} open={disputing} onOpenChange={setDisputing} />
    </RecordSheet>
    </>
  );
}
