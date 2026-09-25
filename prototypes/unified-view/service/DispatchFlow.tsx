import * as React from "react";
import { FileText, Image as ImageIcon, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { TableCellInput, TableRequiredLabel } from "@/components/form-layout/table-cells";
import { RecordSheet } from "../RecordSheet";
import { EmailChips } from "../threepl/InvitePartnerSheet";
import { DATE_FMT } from "../data";
import {
  feesTotal,
  formatHours,
  jobsOf,
  money,
  partsTotal,
  technicianById,
  technicianEmail,
  type ServiceOrder,
} from "./work";

/*
  THE NO-TECHNICIAN-APP FLOW (Pavan, 2026-09-25).

  With no app on the technician's phone, everything reaches the order through
  the dispatcher. The pieces of that flow live here:

    1. The EMAIL to the technician — the job details and a report form, sent
       as the order moves to Assigned. Mandatory, and shaped like 3PL's partner
       invitation: the sheet IS the email.
    2. The JOB REPORT FORM the technician fills in and mails back.
    3. The ACKNOWLEDGEMENT the dispatcher gives before recording the job on
       the technician's behalf ("Job completed").
    4. The INVOICE SUMMARY — what the customer pays — sent to the customer, or
       marked approved on their behalf.
    5. MARK AS COMPLETED once the customer approves offline, with the trail
       (emails, screenshots, documents) attached.
    6. The PAYMENT card accounting's answer fills in.
*/

type Attachment = NonNullable<ServiceOrder["attachments"]>[number];

const whenOf = (o: ServiceOrder) => {
  if (!o.scheduledAt) return "Not scheduled";
  const d = new Date(o.scheduledAt);
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  const start = d.getHours() * 60 + d.getMinutes();
  return `${DATE_FMT.format(d)}, ${fmt(start)} – ${fmt(o.windowEndMin ?? start + 180)}`;
};

/* ───────────────────────────────────────────── attachments (the trail) ── */

/**
 * ATTACHMENTS, KEPT ON THE ORDER. Emails, screenshots and documents that show
 * what the technician or the customer said offline. The files themselves stay
 * on this device in the prototype; the order keeps their names and when they
 * were added, which is what the trail needs.
 */
export function AttachmentList({
  items,
  stage,
  onChange,
  readOnly,
}: {
  items: Attachment[];
  stage: string;
  onChange?: (next: Attachment[]) => void;
  readOnly?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-fp-outline-1">
          {items.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              {a.kind === "image" ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{a.stage}</span>
              {!readOnly && onChange && (
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && onChange && (
        <>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => ref.current?.click()}>
            <Paperclip />
            Add attachment
          </Button>
          <input
            ref={ref}
            type="file"
            multiple
            hidden
            accept="image/*,.pdf,.doc,.docx,.eml,.msg"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length)
                onChange([
                  ...items,
                  ...files.map((f) => ({
                    name: f.name,
                    kind: (f.type.startsWith("image/") ? "image" : "document") as Attachment["kind"],
                    addedAt: new Date().toISOString(),
                    stage,
                  })),
                ]);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────── 2. the job report form ───────── */

/** A boxed form table — header band, rows of DS cells. */
function FormTable({
  heads,
  widths = [],
  children,
}: {
  heads: string[];
  /** Column widths by position; undefined = shares what is left. */
  widths?: (string | undefined)[];
  children: React.ReactNode;
}) {
  return (
    /* T2 — the form has no card round each table, so the table is its own box. */
    <div data-table-variant="T2" className="overflow-hidden rounded-md border border-fp-outline-1">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {heads.map((h, i) => (
            <col key={h} className={widths[i]} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            {heads.map((h) => (
              <th key={h} className="px-3 py-2 text-left">
                <TableRequiredLabel>{h}</TableRequiredLabel>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A fillable cell — the DS table cell, holding its own text. */
function FormCell({ label, placeholder }: { label: string; placeholder?: string }) {
  const [v, setV] = React.useState("");
  return (
    <td className="relative p-0">
      <TableCellInput value={v} onChange={setV} placeholder={placeholder ?? ""} aria-label={label} />
    </td>
  );
}

/** One labelled line of the form. */
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * THE JOB REPORT FORM — attached to the email, filled in by the technician
 * and mailed back. It asks for exactly what the dispatcher will enter after
 * "Job completed": the assessment, the work as done, the parts used, the
 * parts that were needed but not there, the time on site, photos.
 */
export function JobReportForm({
  order,
  open,
  onOpenChange,
}: {
  order: ServiceOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tech = technicianById(order.technicianId);
  const work = order.assets.flatMap((a) =>
    jobsOf(a).map((j) => ({ asset: a.assetName, ...j }))
  ).filter((j) => j.workType);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Job report form · {order.orderNo}</DialogTitle>
          <DialogDescription>
            Attached to the technician's email. Filled in on site and mailed back.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 rounded-md border border-fp-outline-1 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <FormRow label="Order">{order.orderNo}</FormRow>
            <FormRow label="Technician">{tech?.name ?? "—"}</FormRow>
            <FormRow label="Customer">{order.customer || "—"}</FormRow>
            <FormRow label="Site">{order.shipTo || "—"}</FormRow>
            <FormRow label="Scheduled">{whenOf(order)}</FormRow>
          </div>

          <FormRow label="Site assessment — what you found">
            <Textarea placeholder="Write what you found on site" className="min-h-24" />
          </FormRow>

          {/* THE FORM'S TABLES ARE DS TABLES (T2 — their own rim, since the
              form has no card round each one): header band, cells that fill. */}
          <FormRow label="Work">
            <FormTable heads={["Work type", "Asset", "Done as planned?", "Changes"]}>
              {[...work, { asset: "", workType: "", fault: "" }, { asset: "", workType: "", fault: "" }].map((w, i) => (
                <tr key={i} className="h-10 border-b border-border last:border-b-0">
                  {w.workType ? <td className="px-3 text-sm text-foreground">{w.workType}</td> : <FormCell label={`Added work ${i + 1}`} placeholder="Added work" />}
                  {w.workType ? <td className="px-3 text-sm text-muted-foreground">{w.asset || "—"}</td> : <FormCell label={`Asset ${i + 1}`} />}
                  <td className="px-3">
                    <span className="flex gap-3 text-sm">
                      <label className="flex items-center gap-1.5"><Checkbox /> Yes</label>
                      <label className="flex items-center gap-1.5"><Checkbox /> No</label>
                    </span>
                  </td>
                  <FormCell label={`Changes ${i + 1}`} />
                </tr>
              ))}
            </FormTable>
          </FormRow>

          <FormRow label="Parts used">
            <FormTable heads={["Part", "Planned", "Used"]} widths={[undefined, "w-24", "w-24"]}>
              {[...order.parts, { name: "", qty: 0, cost: 0 }, { name: "", qty: 0, cost: 0 }].map((p, i) => (
                <tr key={i} className="h-10 border-b border-border last:border-b-0">
                  {p.name ? <td className="px-3 text-sm text-foreground">{p.name}</td> : <FormCell label={`Added part ${i + 1}`} placeholder="Added part" />}
                  <td className="px-3 text-sm tabular-nums text-muted-foreground">{p.name ? p.qty : "—"}</td>
                  <FormCell label={`Used ${i + 1}`} />
                </tr>
              ))}
            </FormTable>
          </FormRow>

          <FormRow label="Parts needed but not available">
            <FormTable heads={["Part", "Qty"]} widths={[undefined, "w-24"]}>
              {[0, 1, 2].map((i) => (
                <tr key={i} className="h-10 border-b border-border last:border-b-0">
                  <FormCell label={`Missing part ${i + 1}`} placeholder="Part" />
                  <FormCell label={`Missing quantity ${i + 1}`} />
                </tr>
              ))}
            </FormTable>
          </FormRow>

          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Arrived on site"><Input placeholder="Time" /></FormRow>
            <FormRow label="Left site"><Input placeholder="Time" /></FormRow>
          </div>

          <FormRow label="Photos">
            <span className="text-sm text-muted-foreground">Attach them to your reply email.</span>
          </FormRow>

          <FormRow label="Notes for the dispatcher">
            <Textarea className="min-h-20" />
          </FormRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => toast.success(`${order.orderNo}-job-report.pdf downloaded`)}>
            Download form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────── 1. the email to the technician ───────── */

export function TechnicianEmailSheet({
  order,
  open,
  onOpenChange,
  onSend,
}: {
  order: ServiceOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Sending is what moves the order to Assigned. */
  onSend: () => void;
}) {
  const tech = technicianById(order.technicianId);
  const [to, setTo] = React.useState<string[]>([]);
  const [cc, setCc] = React.useState<string[]>([]);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);

  /* SEEDED ONCE PER OPEN — the same rule as the partner invitation. */
  React.useEffect(() => {
    if (!open) return;
    setTo(tech ? [technicianEmail(tech)] : []);
    setCc([]);
    setSubject(`${order.orderNo} · ${order.shipTo} · ${whenOf(order)}`);
    setMessage(
      `You are booked for ${order.orderNo} at ${order.shipTo}. The job details are attached, with a report form. Please fill the form in on site and reply with it, and any photos, when the job is done.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);

  const nothingToSend = to.length === 0 || subject.trim() === "";
  const work = order.assets.flatMap((a) => jobsOf(a).map((j) => ({ asset: a.assetName, ...j }))).filter((j) => j.workType);

  return (
    <RecordSheet
      size="xxwide"
      level={2}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle=""
      createTitle={`Email ${tech?.name ?? "the technician"}`}
      createAction="Send and move to Assigned"
      showCancel={false}
      canSubmit={!nothingToSend}
      onSubmit={onSend}
      footerPrimary={
        <Button
          disabled={nothingToSend}
          onClick={() => {
            onSend();
            onOpenChange(false);
          }}
        >
          <Send />
          Send and move to Assigned
        </Button>
      }
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 min-w-0 flex-col gap-10">
          <SheetSection title="Recipients">
            <SheetField label="To">
              <EmailChips id="tech-to" value={to} onChange={setTo} placeholder="name@company.com" />
            </SheetField>
            <SheetField label="Cc">
              <EmailChips id="tech-cc" value={cc} onChange={setCc} placeholder="Optional" />
            </SheetField>
          </SheetSection>
          <SheetSection
            title="Message"
            className="flex min-h-0 flex-1 flex-col"
            bodyClassName="min-h-0 flex-1"
          >
            <SheetField label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </SheetField>
            <SheetField
              label="Your note"
              className="min-h-0 flex-1 [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1"
            >
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[200px] flex-1 resize-none [field-sizing:fixed]"
              />
            </SheetField>
          </SheetSection>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <SheetSection
            title="Attached"
            className="flex min-h-0 flex-1 flex-col"
            bodyClassName="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="flex items-start gap-3 rounded-md border border-fp-outline-1 bg-fp-card-1 p-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {order.orderNo}-job-details.pdf
                </span>
                <span className="text-xs text-muted-foreground">
                  {order.customer} · {order.shipTo} · {whenOf(order)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {work.length === 0
                    ? "No work types on the order"
                    : work.map((w) => (w.asset ? `${w.workType} · ${w.asset}` : w.workType)).join("; ")}
                  {order.parts.length > 0 ? ` — ${order.parts.length} part${order.parts.length === 1 ? "" : "s"}` : ""}
                </span>
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-fp-outline-1 bg-fp-card-1 p-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {order.orderNo}-job-report.pdf
                </span>
                <span className="text-xs text-muted-foreground">
                  Assessment · work done · parts used · parts not available · time on site
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                Preview
              </Button>
            </div>
          </SheetSection>
        </div>
      </div>
      <JobReportForm order={order} open={formOpen} onOpenChange={setFormOpen} />
    </RecordSheet>
  );
}

/* ─────────────────────────────── 3. recording on the technician's behalf ── */

export function OnBehalfDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const [ack, setAck] = React.useState(false);
  React.useEffect(() => {
    if (open) setAck(false);
  }, [open]);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record the job</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
              <span>
                I acknowledge the technician has shared all the relevant information with me,
                and I'm adding this information on the technician's behalf.
              </span>
            </label>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={!ack} onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ───────────────────────────────────────── 4. the invoice summary ──────── */

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: React.ReactNode;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-2.5 text-sm last:border-b-0">
      <span className={strong ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={cn("tabular-nums", strong ? "font-semibold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

export function InvoiceSummarySheet({
  order,
  open,
  onOpenChange,
  onChange,
  onSend,
  onApproved,
  partial = false,
}: {
  /**
   * A ROLLED-OVER JOB'S PARTIAL INVOICE (Pavan, 2026-09-25): what was done
   * this visit, the parts still owed listed and not charged. Its acts are
   * "Send and roll over" and "Roll over without sending".
   */
  partial?: boolean;
  order: ServiceOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Attachments added here land on the order. */
  onChange: (patch: Partial<ServiceOrder>) => void;
  /** Sent to the customer → Awaiting approval. */
  onSend: () => void;
  /** Approved on the customer's behalf → Completed. */
  onApproved: () => void;
}) {
  const [approved, setApproved] = React.useState(false);
  React.useEffect(() => {
    if (open) setApproved(false);
  }, [open]);
  const tech = technicianById(order.technicianId);
  const parts = partsTotal(order.parts);
  const labour = order.labor * order.laborRate;
  const fees = feesTotal(order.fees);
  const extra = feesTotal(order.extraCharges);
  const total = parts + labour + fees + extra;
  const work = order.assets.flatMap((a) => jobsOf(a).map((j) => ({ asset: a.assetName, ...j }))).filter((j) => j.workType);
  const owed = (order.unavailableParts ?? []).filter((p) => p.name);

  return (
    <RecordSheet
      size="wide"
      level={2}
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      fill={false}
      editTitle={`${partial ? "Partial invoice" : "Invoice"} · ${order.orderNo}`}
      createTitle=""
      createAction=""
      onSubmit={() => {}}
      showCancel={false}
      footerAside={
        partial ? undefined : (
          /* APPROVED ON THE CUSTOMER'S BEHALF (Pavan, 2026-09-25) — ticked, the
             act is Mark as completed; unticked, it is sending the invoice. */
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
            <Checkbox checked={approved} onCheckedChange={(v) => setApproved(v === true)} />
            Customer approved — recording on their behalf
          </label>
        )
      }
      footerPrimary={
        partial ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onApproved();
                onOpenChange(false);
              }}
            >
              Roll over without sending
            </Button>
            <Button
              onClick={() => {
                onSend();
                onOpenChange(false);
              }}
            >
              <Send />
              Send and roll over
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              if (approved) onApproved();
              else onSend();
              onOpenChange(false);
            }}
          >
            {approved ? "Mark as completed" : (
              <>
                <Send />
                Send invoice to customer
              </>
            )}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-10">
        <SheetSection title="Bill to">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <FormRow label="Customer">{order.customer}</FormRow>
            {order.poc && (
              <FormRow label="Point of contact">
                {order.poc.name} · {order.poc.email}
              </FormRow>
            )}
            <FormRow label="Site">{order.shipTo}</FormRow>
            <FormRow label="Job date">{whenOf(order)}</FormRow>
            <FormRow label="Technician">{tech?.name ?? "—"}</FormRow>
          </div>
        </SheetSection>

        <SheetSection title="Work done">
          {work.length === 0 ? (
            <span className="text-sm text-muted-foreground">No work types recorded.</span>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {work.map((w, i) => (
                <li key={i}>
                  {w.workType}
                  {w.asset ? <span className="text-muted-foreground"> · {w.asset}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </SheetSection>

        <SheetSection title="Charges" flush>
          {order.parts.map((p, i) => (
            <SummaryRow key={`p-${i}`} label={p.qty > 1 ? `${p.name} × ${p.qty}` : p.name || "Part"} value={money(p.cost * p.qty)} />
          ))}
          <SummaryRow label={`Labour — ${formatHours(order.labor)} at ${money(order.laborRate)}/h`} value={money(labour)} />
          {order.fees.map((f, i) => (
            <SummaryRow key={`f-${i}`} label={f.name || "Fee"} value={money(f.amount)} />
          ))}
          {order.extraCharges.map((f, i) => (
            <SummaryRow key={`x-${i}`} label={f.name || "Charge"} value={money(f.amount)} />
          ))}
          <SummaryRow label="Total to pay" value={money(total)} strong />
        </SheetSection>

        {owed.length > 0 && (
          <SheetSection title={partial ? "Still to come — next visit" : "Not included — parts not available"}>
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {owed.map((p, i) => (
                <li key={i}>
                  {p.qty > 1 ? `${p.name} × ${p.qty}` : p.name}
                </li>
              ))}
            </ul>
            <span className="text-sm text-muted-foreground">
              {partial
                ? "The order rolls over to tomorrow for these; they are not charged here."
                : "A new linked order is created for these when this one is completed."}
            </span>
          </SheetSection>
        )}

        <SheetSection title="Attachments">
          <AttachmentList
            items={order.attachments ?? []}
            stage="Invoice"
            onChange={(next) => onChange({ attachments: next })}
          />
        </SheetSection>
      </div>
    </RecordSheet>
  );
}

/* ───────────────────────────── 5. mark as completed (customer approved) ── */

export function CompleteDialog({
  order,
  open,
  onOpenChange,
  onChange,
  onConfirm,
}: {
  order: ServiceOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChange: (patch: Partial<ServiceOrder>) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark {order.orderNo} as completed</DialogTitle>
          <DialogDescription>
            The customer approved the invoice. Once completed, the order can't be edited.
          </DialogDescription>
        </DialogHeader>
        <SheetField label="Approval trail">
          <AttachmentList
            items={order.attachments ?? []}
            stage="Approval"
            onChange={(next) => onChange({ attachments: next })}
          />
        </SheetField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Mark as completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────── 6. the payment card ──── */

/** What accounting reported, read against what was invoiced. */
export function PaymentDetails({ order, invoiced }: { order: ServiceOrder; invoiced: number }) {
  const p = order.payment;
  if (!p) return null;
  const gap = Math.round((invoiced - p.amount) * 100) / 100;
  return (
    <div className="flex flex-col divide-y divide-border">
      <SummaryRow label="Invoice total" value={money(invoiced)} />
      <SummaryRow label="Received" value={money(p.amount)} />
      <SummaryRow
        label={gap > 0 ? "Short by" : gap < 0 ? "Over by" : "Difference"}
        value={money(Math.abs(gap))}
        strong={gap !== 0}
      />
      <SummaryRow label="Paid on" value={DATE_FMT.format(new Date(p.paidAt))} />
      <SummaryRow label="Method" value={p.method} />
      <SummaryRow label="Reference" value={p.reference} />
    </div>
  );
}
