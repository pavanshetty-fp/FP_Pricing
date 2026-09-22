import * as React from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Plus,
  Send,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useServiceSettings } from "./settings";
import {
  feesTotal,
  money,
  partsTotal,
  technicianById,
  type FeeLine,
  type PartLine,
  type Quote,
  type ServiceOrder,
} from "./work";

/*
  THE TECHNICIAN'S APP.

  A SEPARATE PRODUCT, SHOWN INSIDE THIS ONE. It was left out on 2026-09-18 on
  exactly that ground, and restored on 2026-09-21 — because "separate product"
  is the reason it has to be here, not the reason it does not. Whether the field
  app is in play decides what the DISPATCH screens are allowed to do: with it
  on, the order sheet cannot complete a job, because the person holding the job
  is standing in front of the asset. A module whose settings claim that and then
  show nothing of it is asking the reader to take it on trust.

  IT LOOKS LIKE A PHONE, DELIBERATELY. 400px, its own header, its own back
  affordance. The moment it stops looking like the rest of the app is the moment
  nobody mistakes it for something dispatch can do.

  THE FLOW, AND WHY EACH STEP EXISTS

    arrive      "on the way" and "on site" are the two facts the Assigned and
                In progress lanes exist to tell apart. Somebody has to say it.
    quote       parts + fees, priced before a spanner is lifted. Only with
                Field quoting on.
    quoteSent   the wait. Work does not start until the customer says yes, and
                a screen that skipped straight past it would be lying about a
                step that really does hold jobs up.
    work        log what was used, then one of two endings.

  THE QUOTE IS A SNAPSHOT TAKEN THE MOMENT IT IS SENT — parts and fees as they
  stood then. Labour and mileage cannot be on it: they are not known until the
  job has happened. That gap is the module's sharpest rule and this is where it
  is created, so it is enforced here rather than explained later.

  TWO ENDINGS, NOT ONE BUTTON WITH A CAVEAT. "Completed" needs the labour hours
  and a signature. "Parts pending" needs neither — it needs to know what is
  missing — and what it does next is the `returnMode` switch's business, which
  the panel states before it is pressed rather than after.
*/

/** A blank line, so the first row of an empty table is typeable. */
const BLANK_PART: PartLine = { name: "", qty: 1, cost: 0 };

export interface FieldSubmit {
  parts: PartLine[];
  fees: FeeLine[];
  labor: number;
  mileage: number;
  signed: boolean;
  /** True = the job is done. False = it stalled for a part. */
  completed: boolean;
  /** Only on a stall. */
  partNeeded?: string;
  /** Only where a quote was actually sent. */
  quote?: Quote | null;
}

type Step = "arrive" | "quote" | "quoteSent" | "work";

/* ---------------------------------------------------------------------------
 * The two editable tables — identical on the quote step and the work step,
 * because they are the same lines being edited twice at different moments.
 * ------------------------------------------------------------------------ */

function PartsEditor({
  parts,
  onChange,
}: {
  parts: PartLine[];
  onChange: (next: PartLine[]) => void;
}) {
  const set = (i: number, patch: Partial<PartLine>) =>
    onChange(parts.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Parts</p>
      {parts.map((p, i) => (
        <div
          key={i}
          className="mb-2 grid grid-cols-[1fr_52px_76px_28px] items-center gap-1.5"
        >
          <Input
            className="h-9"
            placeholder="Part"
            value={p.name}
            aria-label={`Part ${i + 1} name`}
            onChange={(e) => set(i, { name: e.target.value })}
          />
          <Input
            className="h-9 text-center tabular-nums"
            type="number"
            inputMode="numeric"
            value={p.qty}
            aria-label={`Part ${i + 1} quantity`}
            onChange={(e) => set(i, { qty: Number(e.target.value) })}
          />
          <Input
            className="h-9 text-right tabular-nums"
            type="number"
            inputMode="decimal"
            placeholder="$"
            value={p.cost}
            aria-label={`Part ${i + 1} unit cost`}
            onChange={(e) => set(i, { cost: Number(e.target.value) })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove part ${i + 1}`}
            /* THE LAST ROW CANNOT GO. An empty table with no row to type in is
               a dead end; the blank row IS the add affordance. */
            disabled={parts.length === 1}
            onClick={() => onChange(parts.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => onChange([...parts, { ...BLANK_PART }])}
      >
        <Plus />
        Add part
      </Button>
    </div>
  );
}

function FeesEditor({
  fees,
  onChange,
  empty,
}: {
  fees: FeeLine[];
  onChange: (next: FeeLine[]) => void;
  empty: string;
}) {
  const set = (i: number, patch: Partial<FeeLine>) =>
    onChange(fees.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Fees</p>
      {fees.length === 0 && (
        <p className="mb-2 text-xs text-muted-foreground">{empty}</p>
      )}
      {fees.map((f, i) => (
        <div
          key={i}
          className="mb-2 grid grid-cols-[1fr_76px_28px] items-center gap-1.5"
        >
          <Input
            className="h-9"
            placeholder="Fee"
            value={f.name}
            aria-label={`Fee ${i + 1} name`}
            onChange={(e) => set(i, { name: e.target.value })}
          />
          <Input
            className="h-9 text-right tabular-nums"
            type="number"
            inputMode="decimal"
            placeholder="$"
            value={f.amount}
            aria-label={`Fee ${i + 1} amount`}
            onChange={(e) => set(i, { amount: Number(e.target.value) })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove fee ${i + 1}`}
            onClick={() => onChange(fees.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => onChange([...fees, { name: "", amount: 0 }])}
      >
        <Plus />
        Add fee
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The app
 * ------------------------------------------------------------------------ */

export function TechnicianApp({
  order,
  open,
  onOpenChange,
  onSubmit,
}: {
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (result: FieldSubmit) => void;
}) {
  const cfg = useServiceSettings();

  const [step, setStep] = React.useState<Step>("arrive");
  const [parts, setParts] = React.useState<PartLine[]>([{ ...BLANK_PART }]);
  const [fees, setFees] = React.useState<FeeLine[]>([]);
  const [labor, setLabor] = React.useState(1);
  const [mileage, setMileage] = React.useState(0);
  const [signed, setSigned] = React.useState(false);
  const [ending, setEnding] = React.useState<"completed" | "pending">(
    "completed"
  );
  const [partNeeded, setPartNeeded] = React.useState("");
  const [quote, setQuote] = React.useState<Quote | null>(null);

  /* THE PANEL IS REBUILT PER JOB, NOT PER RENDER. It opens on the rung the
     order has already reached — a Parts-pending job the technician is coming
     back to does not ask them to arrive again, and one that was quoted before
     it stalled does not ask them to re-quote. */
  React.useEffect(() => {
    if (!open || !order) return;
    setParts(order.parts.length > 0 ? order.parts.map((p) => ({ ...p })) : [{ ...BLANK_PART }]);
    setFees(order.fees.map((f) => ({ ...f })));
    setLabor(order.labor > 0 ? order.labor : 1);
    setMileage(order.mileage);
    setSigned(false);
    setEnding("completed");
    setPartNeeded(order.partNeeded ?? "");
    setQuote(order.quote);
    setStep(
      order.status === "Parts-pending" || order.arrivedAt
        ? "work"
        : cfg.fieldQuote && !order.quote
          ? "arrive"
          : "arrive"
    );
  }, [open, order, cfg.fieldQuote]);

  if (!order) return null;

  const tech = technicianById(order.technicianId);
  const quoteTotal = partsTotal(parts) + feesTotal(fees);
  const canComplete = labor > 0 && signed;

  const sendQuote = () => {
    /* A SNAPSHOT, not a reference to the lines. What the customer agreed to is
       what was on the screen when it was sent; editing a part afterwards must
       not quietly rewrite what they said yes to. */
    setQuote({
      parts: parts.map((p) => ({ ...p })),
      fees: fees.map((f) => ({ ...f })),
      total: quoteTotal,
      sentAt: new Date().toISOString(),
      approvedAt: null,
    });
    setStep("quoteSent");
  };

  const submit = () => {
    if (ending === "completed") {
      onSubmit({
        parts,
        fees,
        labor,
        mileage,
        signed,
        completed: true,
        quote: cfg.fieldQuote ? quote : null,
      });
    } else {
      onSubmit({
        /* A STALLED JOB REPORTS WHAT IT USED, NOT WHAT IT WILL. Mileage and a
           signature belong to a visit that finished; carrying them here would
           bill for a job nobody has done. */
        parts,
        fees,
        labor,
        mileage: 0,
        signed: false,
        completed: false,
        partNeeded: partNeeded.trim(),
        quote: cfg.fieldQuote ? quote : null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        /* PHONE-WIDTH AND PHONE-SHAPED. The break from the app's own chrome is
           the point: this is somebody else's product, seen over the
           dispatcher's shoulder. */
        className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-[400px]"
      >
        <div className="border-b border-fp-outline-1 bg-fp-card-1 px-4 py-3.5">
          <DialogTitle className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Truck className="size-3.5" />
            Technician app · {tech?.name ?? "unassigned"}
          </DialogTitle>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {order.assetName} — {order.workType}
          </p>
          <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
            {order.customer} · {order.shipTo}
          </DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {order.city}, {order.state}
            </span>
            {order.scheduledAt && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(order.scheduledAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {order.orderNo}
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* ── Arrive ───────────────────────────────────────────────────── */}
          {step === "arrive" && (
            <>
              <p className="mb-1 text-sm font-medium text-foreground">
                {order.fault}
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Mark arrival to begin. Until then the job reads as on its way,
                not on site.
              </p>
              <Button
                className="w-full"
                onClick={() => setStep(cfg.fieldQuote ? "quote" : "work")}
              >
                <Truck />
                Arrived on site
              </Button>
            </>
          )}

          {/* ── Quote ────────────────────────────────────────────────────── */}
          {step === "quote" && (
            <>
              <p className="text-sm font-medium text-foreground">
                Quote for customer
              </p>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">
                Parts and fees the customer sees before work starts. Labour and
                mileage are not known yet — those land on the invoice
                afterwards.
              </p>

              <div className="flex flex-col gap-4">
                <PartsEditor parts={parts} onChange={setParts} />
                <FeesEditor
                  fees={fees}
                  onChange={setFees}
                  empty="None from dispatch — add one if this quote needs it."
                />
              </div>

              <div className="mt-4 flex items-center justify-between rounded-md bg-fp-card-1 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">
                  Quote total
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {money(quoteTotal)}
                </span>
              </div>

              <Button className="mt-4 w-full" onClick={sendQuote}>
                <Send />
                Send quote to customer
              </Button>
            </>
          )}

          {/* ── Waiting ──────────────────────────────────────────────────── */}
          {step === "quoteSent" && quote && (
            <>
              <p className="text-sm font-medium text-foreground">
                Waiting on customer
              </p>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">
                {money(quote.total)} sent. Work starts once the customer
                approves on site.
              </p>
              <div className="mb-4 rounded-md border border-fp-outline-1 p-3">
                {quote.parts
                  .filter((p) => p.name)
                  .map((p, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {p.name} × {p.qty}
                      </span>
                      <span className="tabular-nums text-foreground">
                        {money(p.cost * p.qty)}
                      </span>
                    </div>
                  ))}
                {quote.fees
                  .filter((f) => f.name)
                  .map((f, i) => (
                    <div
                      key={`f${i}`}
                      className="flex items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {f.name}
                      </span>
                      <span className="tabular-nums text-foreground">
                        {money(f.amount)}
                      </span>
                    </div>
                  ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setQuote((q) =>
                    q ? { ...q, approvedAt: new Date().toISOString() } : q
                  );
                  setStep("work");
                }}
              >
                <ClipboardCheck />
                Customer approved on site
              </Button>
              {/* THE CUSTOMER CAN SAY NO, and a screen with only a yes is a
                  screen that has never met one. It returns to the quote rather
                  than ending the job — a rejected price is renegotiated on the
                  doorstep, not cancelled from it. */}
              <Button
                variant="ghost"
                className="mt-1 w-full"
                onClick={() => setStep("quote")}
              >
                Customer wants it changed
              </Button>
            </>
          )}

          {/* ── Work ─────────────────────────────────────────────────────── */}
          {step === "work" && (
            <>
              <p className="text-sm font-medium text-foreground">Record work</p>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">
                Log what the job used as you go, then choose how it ends.
              </p>

              {quote && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-fp-card-1 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Quoted {money(quote.total)}
                  </span>
                  {/* THE GAP IS SHOWN WHILE IT IS STILL BEING CREATED. Naming
                      it here is what stops it being a surprise on the invoice;
                      it is not an error, and the panel does not treat it as
                      one. */}
                  <span className="tabular-nums text-foreground">
                    Now {money(partsTotal(parts) + feesTotal(fees))}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <PartsEditor parts={parts} onChange={setParts} />
                <FeesEditor
                  fees={fees}
                  onChange={setFees}
                  empty="None yet — add one if this job needed it (after-hours, disposal)."
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="field-labor"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    {ending === "completed"
                      ? "Labour (hours)"
                      : "Diagnostic hours so far"}
                  </label>
                  <Input
                    id="field-labor"
                    className="h-9 tabular-nums"
                    type="number"
                    inputMode="decimal"
                    value={labor}
                    onChange={(e) => setLabor(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label
                    htmlFor="field-mileage"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Mileage (mi)
                  </label>
                  <Input
                    id="field-mileage"
                    className="h-9 tabular-nums"
                    type="number"
                    inputMode="decimal"
                    disabled={ending === "pending"}
                    value={ending === "pending" ? 0 : mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* TWO ENDINGS, CHOSEN BEFORE THE BUTTON. What the submit does is
                  different enough that one button with a caveat under it would
                  be the wrong shape — and the choice changes which fields
                  above it still apply. */}
              <div className="mt-4 flex gap-1 rounded-md bg-fp-card-1 p-1">
                {(
                  [
                    ["completed", "Completed"],
                    ["pending", "Parts pending"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEnding(k)}
                    className={cn(
                      "flex-1 rounded-sm px-2.5 py-1.5 text-xs transition-colors",
                      ending === k
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {ending === "completed" ? (
                <>
                  <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                    <Checkbox
                      checked={signed}
                      onCheckedChange={(v) => setSigned(v === true)}
                    />
                    Customer signature captured
                  </label>
                  <Button
                    className="mt-4 w-full"
                    disabled={!canComplete}
                    onClick={submit}
                  >
                    <CheckCircle2 />
                    Complete and submit
                  </Button>
                  {/* THE REASON THE BUTTON IS DEAD SITS BESIDE IT, never on
                      it — the module's rule, and the field app is not exempt. */}
                  {!canComplete && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {labor <= 0
                        ? "Record the labour hours before submitting."
                        : "Capture the customer's signature before submitting."}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-4">
                    <label
                      htmlFor="field-part"
                      className="mb-1.5 block text-xs font-medium text-muted-foreground"
                    >
                      What is missing
                    </label>
                    <Input
                      id="field-part"
                      className="h-9"
                      placeholder="e.g. 2-inch pump seal on order"
                      value={partNeeded}
                      onChange={(e) => setPartNeeded(e.target.value)}
                    />
                  </div>

                  {/* WHAT HAPPENS NEXT, SAID BEFORE THE PRESS. It is the
                      `returnMode` switch's business, and a technician who
                      finds out afterwards which of the two it was has been
                      told too late. */}
                  <p className="mt-3 rounded-md bg-fp-card-1 px-3 py-2.5 text-xs text-muted-foreground">
                    On submit:{" "}
                    {cfg.returnMode === "spawn" ? (
                      <>
                        this order goes <strong>Parts-pending</strong> and a
                        linked return visit is created.
                      </>
                    ) : (
                      <>
                        this order <strong>stays open</strong> and rolls to the
                        next day. No new order.
                      </>
                    )}
                  </p>

                  <Button
                    className="mt-4 w-full"
                    disabled={labor <= 0 || partNeeded.trim() === ""}
                    onClick={submit}
                  >
                    Submit — parts pending
                  </Button>
                  {(labor <= 0 || partNeeded.trim() === "") && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {labor <= 0
                        ? "Record the hours spent before submitting."
                        : "Say what is missing before submitting."}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* THE WAY OUT IS NOT A CANCEL. Closing the panel is walking away from
            the job, not discarding it — the order is exactly where it was. */}
        <div className="shrink-0 border-t border-fp-outline-1 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              toast.info(`${order.orderNo} left as it was`);
            }}
          >
            Leave the app
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
