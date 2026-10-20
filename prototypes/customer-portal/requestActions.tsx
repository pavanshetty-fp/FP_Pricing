import * as React from "react";
import { toast } from "sonner";
import { Check, MoreHorizontal, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetField } from "@/components/side-sheet/parts";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { RailRow } from "../unified-view/SheetCards";
import {
  PORTAL_ACTOR,
  TENANT,
  assetById,
  dateOfKey,
  estimate,
  orderTheRest,
  printKey,
  updateRequest,
  type OrderRequest,
} from "./orders";
import { FEES_PER_GAL, TAX_RATE } from "./invoices";

/*
  WHAT A CUSTOMER DOES WITH A REQUEST THAT WAITS ON THEM (Pavan,
  2026-10-15), shared by the dashboard's action sheet and the order sheet:

    a quote      read it; Accept — or, from ⋯, Decline or Request a change,
                 each with a note the supplier reads (PRD FR-21)
    action needed  send what is asked: a note and files; for a credit hold,
                 the payment made OFFLINE (date, amount, reference, proof) —
                 the portal takes no payment; the supplier releases the hold
                 (PRD FR-25)
    a partial    order the gallons that did not arrive (PRD FR-28)
    on its way   the trip, step by step (PRD FR-05)
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/* ------------------------------------------------------------ the quote --- */

/** The supplier's quote — each line at its quoted rate, fees, tax. INVENTED:
    the rate is the middle of the estimate. */
export function quoteOf(r: OrderRequest) {
  const est = estimate(r.lines);
  const lines = est.rows
    .filter((x) => x.low !== null && x.high !== null)
    .map((x) => ({ product: x.line.product, asset: assetById(x.line.assetId)?.name ?? "No tank", gal: x.line.gal, amount: (x.low! + x.high!) / 2 }));
  const gal = lines.reduce((t, l) => t + l.gal, 0);
  const fuel = lines.reduce((t, l) => t + l.amount, 0);
  const fees = gal * FEES_PER_GAL;
  const tax = (fuel + fees) * TAX_RATE;
  const valid = dateOfKey(r.date) ? new Date(dateOfKey(r.date)!.getTime() - 86_400_000) : null;
  return { lines, fuel, fees, tax, total: fuel + fees + tax, est, valid };
}

export function QuoteLines({ r }: { r: OrderRequest }) {
  const q = quoteOf(r);
  return (
    <dl className="flex flex-col">
      {q.lines.map((l, i) => (
        <RailRow key={i} variant="line" label={`${l.asset} · ${l.product} · ${l.gal.toLocaleString()} gal`} value={usd.format(l.amount)} />
      ))}
      <RailRow variant="line" label="Fees (delivery, environmental)" value={usd.format(q.fees)} />
      <RailRow variant="line" label={`Tax (${Math.round(TAX_RATE * 100)}%)`} value={usd.format(q.tax)} />
      <RailRow variant="total" label="Quoted total" value={usd.format(q.total)} />
      <p className="pt-1 text-xs text-muted-foreground">
        Estimate was {usd.format(q.est.low)} – {usd.format(q.est.high)} for fuel
        {q.valid ? ` · valid until ${printKey(`${q.valid.getFullYear()}-${String(q.valid.getMonth() + 1).padStart(2, "0")}-${String(q.valid.getDate()).padStart(2, "0")}`)}` : ""}
      </p>
    </dl>
  );
}

/** A note the supplier reads — asked for before Decline or Request change. */
function NoteDialog({
  open,
  title,
  description,
  action,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  title: string;
  description: string;
  action: string;
  onOpenChange: (o: boolean) => void;
  onSend: (note: string) => void;
}) {
  const [note, setNote] = React.useState("");
  React.useEffect(() => {
    if (!open) setNote("");
  }, [open]);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <SheetField label="Note" required>
          <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24" />
        </SheetField>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction disabled={!note.trim()} onClick={() => onSend(note.trim())}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Accept the quote — Decline and Request change behind ⋯, each with a note. */
export function QuoteActions({ r, onDone }: { r: OrderRequest; onDone?: () => void }) {
  const [asking, setAsking] = React.useState<null | "decline" | "change">(null);
  if (r.status !== "Quote received") return null;
  return (
    <span className="flex items-center gap-1">
      <Button
        onClick={() => {
          /* THE TENANT SCHEDULES IT NEXT — it becomes an order then. */
          updateRequest(r.id, { status: "Quote accepted" }, "Quote accepted");
          toast.success(`Quote accepted for ${r.requestNo}`);
          onDone?.();
        }}
      >
        <Check />
        Accept quote
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More quote actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setAsking("change")}>
            <Send />
            Request change
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAsking("decline")}>
            <X />
            Decline quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NoteDialog
        open={asking === "change"}
        onOpenChange={(o) => !o && setAsking(null)}
        title={`Request a change to ${r.requestNo}'s quote`}
        description={`Say what should change — ${TENANT} revises the quote and sends it again.`}
        action="Send request"
        onSend={(note) => {
          updateRequest(r.id, { status: "In review" }, `Change requested: ${note}`);
          toast.success(`Change requested for ${r.requestNo}`);
          setAsking(null);
          onDone?.();
        }}
      />
      <NoteDialog
        open={asking === "decline"}
        onOpenChange={(o) => !o && setAsking(null)}
        title={`Decline ${r.requestNo}'s quote?`}
        description={`The request will not be delivered. Tell ${TENANT} why.`}
        action="Decline quote"
        onSend={(note) => {
          updateRequest(r.id, { status: "Quote declined" }, `Quote declined: ${note}`);
          toast.success(`Quote declined for ${r.requestNo}`);
          setAsking(null);
          onDone?.();
        }}
      />
    </span>
  );
}

/* ------------------------------------------------------- action needed --- */

/** What the customer can send back — and, once sent, that it is with the supplier. */
export function ReplyPanel({ r, credit }: { r: OrderRequest; credit: boolean }) {
  const [note, setNote] = React.useState("");
  const [files, setFiles] = React.useState<string[]>([]);
  const [paidOn, setPaidOn] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reference, setReference] = React.useState("");
  const input = React.useRef<HTMLInputElement>(null);
  const sent = r.customerReply;

  if (sent)
    return (
      <div className="flex flex-col gap-1.5 rounded-lg bg-fp-table-header p-3 text-sm">
        <span className="font-medium text-foreground">Sent to {TENANT} · waiting for their reply</span>
        {sent.payment && (
          <span className="text-muted-foreground">
            Paid {printKey(sent.payment.paidOn)} · {sent.payment.amount} · ref {sent.payment.reference}
          </span>
        )}
        {sent.note && <span className="text-foreground">{sent.note}</span>}
        {sent.files.length > 0 && <span className="text-xs text-muted-foreground">{sent.files.join(", ")}</span>}
      </div>
    );

  const ready = credit ? paidOn && amount.trim() && reference.trim() : note.trim();
  return (
    <div className="flex flex-col gap-3">
      {credit && (
        <div className="grid grid-cols-3 gap-3">
          <SheetField label="Paid on" required>
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </SheetField>
          <SheetField label="Amount" required>
            <Input inputMode="decimal" placeholder="$0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </SheetField>
          <SheetField label="Reference no." required>
            <Input placeholder="e.g. ACH 88231" value={reference} onChange={(e) => setReference(e.target.value)} />
          </SheetField>
        </div>
      )}
      <SheetField label="Note" required={!credit}>
        <Textarea
          value={note}
          placeholder={credit ? "Anything the supplier should know" : `Answer ${TENANT}`}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-20"
        />
      </SheetField>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Paperclip />
            {credit ? "Attach proof" : "Attach files"}
          </Button>
          {files.length > 0 && <span className="truncate text-xs text-muted-foreground">{files.join(", ")}</span>}
          <input
            ref={input}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const f = [...(e.target.files ?? [])].map((x) => x.name);
              e.target.value = "";
              setFiles((p) => [...p, ...f]);
            }}
          />
        </span>
        <Button
          disabled={!ready}
          onClick={() => {
            updateRequest(
              r.id,
              {
                customerReply: {
                  at: new Date().toISOString(),
                  note: note.trim(),
                  files,
                  payment: credit ? { paidOn, amount: amount.trim(), reference: reference.trim() } : undefined,
                },
              },
              credit ? `Payment details sent · ref ${reference.trim()}` : "Reply sent"
            );
            toast.success(`Sent to ${TENANT}`);
          }}
        >
          <Send />
          Send to {TENANT}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- partial --- */

/** Order the gallons a partial delivery left; the new draft opens. */
export function OrderRestButton({ r, onCreated, variant = "default" }: { r: OrderRequest; onCreated: (id: string) => void; variant?: "default" | "outline" }) {
  if (!r.undeliveredGal) return null;
  return (
    <Button
      variant={variant}
      onClick={() => {
        const n = orderTheRest(r.id);
        if (n) onCreated(n.id);
      }}
    >
      Order the rest · {r.undeliveredGal.toLocaleString()} gal
    </Button>
  );
}

/* ---------------------------------------------------------------- trip --- */

/*
  THE TRIP, STEP BY STEP (PRD FR-05) — loaded (the BOL), departed, the ETA
  changed and why, arriving in 30 minutes, arrived, unloading, delivered.
  Out for delivery: the steps so far, the rest to come. Delivered: all of
  them, from the window. Times INVENTED around the trip and the window.
*/
export function tripSteps(r: OrderRequest) {
  const day = dateOfKey(r.date);
  const dep = r.trip ? Date.parse(r.trip.departedAt) : day ? day.getTime() + (r.windowStart - 45) * 60_000 : null;
  const eta = r.trip ? Date.parse(r.trip.eta) : dep ? dep + 75 * 60_000 : null;
  if (!dep || !eta) return [];
  const late = r.flags.find((f) => f.kind === "At risk of being late");
  const steps = [
    { at: dep - 30 * 60_000, what: `Loaded · BOL B-${4400 + Number(r.requestNo.slice(-2))}` },
    { at: dep, what: `Departed${r.trip ? ` · ${r.trip.truck}` : ""}` },
    ...(late ? [{ at: dep + 15 * 60_000, what: `ETA changed · ${late.detail}` }] : []),
    { at: eta - 30 * 60_000, what: "Arriving in 30 minutes" },
    { at: eta, what: "Arrived on site" },
    { at: eta + 5 * 60_000, what: "Unloading" },
    { at: eta + 40 * 60_000, what: r.status === "Partial delivery" ? "Partly delivered" : "Delivered · ticket ready" },
  ];
  const now = Date.now();
  const delivered = r.status !== "Out for delivery";
  return steps.map((s) => ({ ...s, done: delivered || s.at <= now }));
}

const hm = (t: number) => {
  const d = new Date(t);
  return formatMinutes(d.getHours() * 60 + d.getMinutes());
};

export function TripTimeline({ r }: { r: OrderRequest }) {
  const steps = tripSteps(r);
  if (steps.length === 0) return null;
  const nextAt = steps.findIndex((s) => !s.done);
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
          {/* THE STEPPER'S COLOURS (Pavan, 2026-10-19): done green and the
              line green up to the step in progress; that step violet (the
              accent); the rest grey. */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn("absolute top-3 bottom-0 left-[5px] w-0.5 -translate-x-[0.5px]", s.done ? "bg-status-success" : "bg-border")}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "relative mt-1 size-[11px] shrink-0 rounded-full border-2",
              s.done
                ? "border-status-success bg-status-success"
                : i === nextAt
                  ? "border-accent-violet bg-fp-surface-1b"
                  : "border-border bg-fp-surface-1b"
            )}
          />
          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span
              className={cn(
                "text-sm",
                s.done ? "text-foreground" : i === nextAt ? "font-medium text-accent-violet-ink" : "text-muted-foreground"
              )}
            >
              {s.what}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{s.done ? hm(s.at) : `~${hm(s.at)}`}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export const replyActor = PORTAL_ACTOR;
