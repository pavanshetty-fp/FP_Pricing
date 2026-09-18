import * as React from "react";
import { Plus, Send, Truck, X, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection, SheetSectionNote } from "@/components/side-sheet/parts";
import { RecordSheet } from "../RecordSheet";
import { useServiceSettings } from "./settings";
import {
  LABOR_RATE,
  MILEAGE_RATE,
  WORK_TYPES,
  feesTotal,
  money,
  partsTotal,
  quoteableTotal,
  technicianById,
  type FeeLine,
  type PartLine,
  type ServiceOrder,
} from "./work";

/**
 * THE TECHNICIAN'S APP, as the dispatcher sees it.
 *
 * WHY IT IS A SHEET AND NOT A SCREEN. It is somebody ELSE's view of this job —
 * the same relationship the vendor quote sheet has to a 3PL order — so it
 * opens over the record it belongs to and closes back onto it. Building it as
 * a page would have made the dispatcher navigate away from the order to watch
 * what is happening to the order.
 *
 * THREE STEPS, AND THE MIDDLE ONE IS A SETTING.
 *
 *   arrive → [quote → sent] → record
 *
 * Arrival is what starts the job: before it there is nothing to price and
 * nothing to log. The quote step exists only where field quoting is on, and
 * what it may contain is fixed — parts and fees, never labour or mileage,
 * because at the moment it is sent nobody knows either.
 *
 * FINISHING AND STALLING ARE THE SAME STEP, not two. The technician does not
 * know which one it will be until the work is in front of them, so the form is
 * the same either way and the choice is made at the foot of it.
 */

export interface TechnicianAppSheetProps {
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Arrival, recorded the moment it happens rather than on submit. */
  onArrive: (id: string) => void;
  onSendQuote: (id: string, quote: { parts: PartLine[]; fees: FeeLine[] }) => void;
  onApproveQuote: (id: string) => void;
  onComplete: (
    id: string,
    data: {
      parts: PartLine[];
      fees: FeeLine[];
      labor: number;
      mileage: number;
      signed: boolean;
    }
  ) => void;
  onPartsPending: (
    id: string,
    data: { labor: number; partNeeded: string }
  ) => void;
}

export function TechnicianAppSheet({
  order,
  open,
  onOpenChange,
  onArrive,
  onSendQuote,
  onApproveQuote,
  onComplete,
  onPartsPending,
}: TechnicianAppSheetProps) {
  const cfg = useServiceSettings();
  const [parts, setParts] = React.useState<PartLine[]>([]);
  const [fees, setFees] = React.useState<FeeLine[]>([]);
  const [labor, setLabor] = React.useState(1);
  const [mileage, setMileage] = React.useState(0);
  const [signed, setSigned] = React.useState(false);
  const [partNeeded, setPartNeeded] = React.useState("");
  const [outcome, setOutcome] = React.useState<"done" | "pending">("done");

  /* THE FORM STARTS FROM WHAT THE ORDER ALREADY HAS — the price book's parts
     and the dispatcher's fees — because a technician arriving at a job should
     be correcting a list, not typing one. */
  React.useEffect(() => {
    if (!open || !order) return;
    const book = WORK_TYPES[order.workType];
    setParts(
      order.parts.length
        ? order.parts.map((p) => ({ ...p }))
        : cfg.priceBook
          ? book.parts.map((p) => ({ ...p }))
          : [{ name: "", qty: 1, cost: 0 }]
    );
    setFees(order.fees.map((f) => ({ ...f })));
    setLabor(order.labor > 0 ? order.labor : 1);
    setMileage(order.mileage);
    setSigned(false);
    setPartNeeded(order.partNeeded ?? "");
    setOutcome("done");
  }, [open, order, cfg.priceBook]);

  if (!order) return null;

  const tech = technicianById(order.technicianId);

  /* WHERE THE JOB IS, WORKED OUT FROM THE RECORD rather than held in a second
     piece of state. A step the sheet remembers separately is a step that can
     disagree with the order behind it the moment anything else touches it. */
  const step: "arrive" | "quote" | "sent" | "record" = !order.arrivedAt
    ? "arrive"
    : cfg.fieldQuote && !order.quote
      ? "quote"
      : cfg.fieldQuote && order.quote && !order.quote.approvedAt
        ? "sent"
        : "record";

  const setPart = (i: number, patch: Partial<PartLine>) =>
    setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setFee = (i: number, patch: Partial<FeeLine>) =>
    setFees((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const quoteNow = quoteableTotal(parts, fees);
  const runningTotal =
    partsTotal(parts) + feesTotal(fees) + labor * LABOR_RATE + mileage * MILEAGE_RATE;

  const partsEditor = (
    <div className="flex flex-col gap-2">
      {parts.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_64px_100px_32px] items-center gap-2">
          <Input
            value={p.name}
            placeholder="Part"
            onChange={(e) => setPart(i, { name: e.target.value })}
          />
          <Input
            type="number"
            className="text-center tabular-nums"
            value={p.qty}
            onChange={(e) => setPart(i, { qty: Number(e.target.value) })}
          />
          <Input
            type="number"
            className="tabular-nums"
            placeholder="$"
            value={p.cost}
            onChange={(e) => setPart(i, { cost: Number(e.target.value) })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${p.name || "part"}`}
            onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setParts((ps) => [...ps, { name: "", qty: 1, cost: 0 }])}
        className="-mx-1 flex h-8 w-fit items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Plus className="size-4" /> Add part
      </button>
    </div>
  );

  const feesEditor = (
    <div className="flex flex-col gap-2">
      {fees.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing from dispatch — add one if this job needs it.
        </p>
      )}
      {fees.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_100px_32px] items-center gap-2">
          <Input
            value={f.name}
            placeholder="Fee name"
            onChange={(e) => setFee(i, { name: e.target.value })}
          />
          <Input
            type="number"
            className="tabular-nums"
            placeholder="$"
            value={f.amount}
            onChange={(e) => setFee(i, { amount: Number(e.target.value) })}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${f.name || "fee"}`}
            onClick={() => setFees((fs) => fs.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setFees((fs) => [...fs, { name: "", amount: 0 }])}
        className="-mx-1 flex h-8 w-fit items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Plus className="size-4" /> Add fee
      </button>
    </div>
  );

  /* THE ONE ACT AT THE FOOT, per step — the same ladder the order sheet uses,
     seen from the other side. */
  const primary = (() => {
    if (step === "arrive")
      return (
        <Button onClick={() => onArrive(order.id)}>
          <Truck /> Arrived on site
        </Button>
      );
    if (step === "quote")
      return (
        <Button
          disabled={quoteNow <= 0}
          onClick={() => {
            onSendQuote(order.id, { parts, fees });
            toast.success(`Quote sent — ${money(quoteNow)}`, {
              description: "Work starts once the customer approves on site.",
            });
          }}
        >
          <Send /> Send quote to customer
        </Button>
      );
    if (step === "sent")
      return (
        <Button onClick={() => onApproveQuote(order.id)}>
          <FileCheck /> Customer approved on site
        </Button>
      );
    if (outcome === "pending")
      return (
        <Button
          disabled={!partNeeded.trim() || labor <= 0}
          onClick={() => {
            onPartsPending(order.id, { labor, partNeeded: partNeeded.trim() });
            onOpenChange(false);
          }}
        >
          Submit — parts pending
        </Button>
      );
    return (
      <Button
        disabled={labor <= 0 || !signed}
        onClick={() => {
          onComplete(order.id, { parts, fees, labor, mileage, signed });
          onOpenChange(false);
        }}
      >
        Complete and submit
      </Button>
    );
  })();

  const blockedWhy =
    step === "record" && outcome === "done" && (labor <= 0 || !signed)
      ? "Labour hours and a customer signature are required."
      : step === "record" && outcome === "pending" && !partNeeded.trim()
        ? "Say what the job is waiting on."
        : step === "quote" && quoteNow <= 0
          ? "A quote of nothing is not a quote."
          : undefined;

  return (
    <RecordSheet
      /* NARROW ON PURPOSE. This is a phone in a van; a 1,120px form is a lie
         about where the work happens, and the dispatcher watching it should
         see the shape the technician sees. */
      size="narrow"
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle="Technician app"
      createTitle="Technician app"
      createAction="Submit"
      showCancel={false}
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip tone="processing">{tech?.name ?? "Unassigned"}</StatusChip>
        </span>
      }
      headerSubtitle={`${order.orderNo} · ${order.workType} · ${order.assetName}`}
      footerPrimary={
        <div className="flex items-center gap-3">
          {blockedWhy && (
            <span className="text-sm text-muted-foreground">{blockedWhy}</span>
          )}
          {primary}
        </div>
      }
      onSubmit={() => {}}
    >
      <SheetSection title="The job">
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium text-foreground">{order.assetName}</p>
          <p className="text-muted-foreground">
            {order.customer} · {order.shipTo}
          </p>
          <p className="text-muted-foreground">{order.fault}</p>
          {order.scheduledAt && (
            <p className="tabular-nums text-muted-foreground">
              {new Date(order.scheduledAt).toLocaleString()}
            </p>
          )}
        </div>
      </SheetSection>

      {step === "arrive" && (
        <SheetSection title="Arrival">
          <p className="text-sm text-muted-foreground">
            Mark arrival to begin. Nothing can be priced or logged before it —
            the job has not started.
          </p>
        </SheetSection>
      )}

      {step === "quote" && (
        <SheetSection
          title="Quote for the customer"
          note={
            <SheetSectionNote label="What a quote may contain">
              <p className="text-foreground">Parts and fees. Nothing else.</p>
              <p className="mt-1.5 text-muted-foreground">
                Labour and mileage are not known yet — they are settled on the
                invoice once the job is done, which is why the invoice can come
                to more than this figure.
              </p>
            </SheetSectionNote>
          }
        >
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Parts</p>
              {partsEditor}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Fees</p>
              {feesEditor}
            </div>
            <div className="flex items-baseline justify-between rounded-lg border border-fp-outline-1 bg-fp-surface-1a px-4 py-3">
              <span className="text-sm text-muted-foreground">Quote total</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {money(quoteNow)}
              </span>
            </div>
          </div>
        </SheetSection>
      )}

      {step === "sent" && order.quote && (
        <SheetSection title="Waiting on the customer">
          <p className="text-sm text-muted-foreground">
            A quote of{" "}
            <span className="font-medium text-foreground">
              {money(order.quote.total)}
            </span>{" "}
            has been sent. The work starts once the customer approves it on site.
          </p>
        </SheetSection>
      )}

      {step === "record" && (
        <SheetSection
          title="Record the work"
          note={
            <SheetSectionNote label="Finishing or stalling">
              Both outcomes are this one form. A technician does not know which
              it will be until the work is in front of them, so the choice is
              made at the foot of it rather than by picking a screen first.
            </SheetSectionNote>
          }
        >
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Parts</p>
              {partsEditor}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Fees</p>
              {feesEditor}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SheetField
                label={
                  outcome === "done" ? "Labour (hours)" : "Diagnostic labour so far"
                }
                required
              >
                <Input
                  type="number"
                  className="tabular-nums"
                  value={labor}
                  onChange={(e) => setLabor(Number(e.target.value))}
                />
              </SheetField>
              <SheetField label="Mileage (miles)">
                <Input
                  type="number"
                  className="tabular-nums"
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  disabled={outcome === "pending"}
                />
              </SheetField>
            </div>

            {/* THE OUTCOME, AS TWO WORDS RATHER THAN TWO BUTTONS. Which one is
                chosen changes the rest of the form, so it has to be visible
                before the foot of it. */}
            <div className="flex rounded-md bg-fp-card-1 p-1">
              {(
                [
                  ["done", "Completed"],
                  ["pending", "Parts pending"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutcome(key)}
                  className={cn(
                    "flex-1 rounded-sm px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                    outcome === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {outcome === "done" ? (
              <>
                <Label className="flex items-center gap-2.5">
                  <Checkbox
                    checked={signed}
                    onCheckedChange={(v) => setSigned(v === true)}
                  />
                  Customer signature captured
                </Label>
                <div className="flex items-baseline justify-between rounded-lg border border-fp-outline-1 bg-fp-surface-1a px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Invoice total, as it stands
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {money(runningTotal)}
                  </span>
                </div>
                {order.quote && runningTotal - order.quote.total > 0.005 && (
                  <p className="text-sm text-muted-foreground">
                    {money(runningTotal - order.quote.total)} more than the quote —
                    labour, mileage and anything extra this job needed.
                  </p>
                )}
              </>
            ) : (
              <>
                <SheetField label="Part or reason" required>
                  <Input
                    value={partNeeded}
                    placeholder="e.g. 2-inch pump seal on order"
                    onChange={(e) => setPartNeeded(e.target.value)}
                  />
                </SheetField>
                <p className="rounded-lg border border-fp-outline-1 bg-fp-surface-1a px-4 py-3 text-sm text-muted-foreground">
                  {cfg.returnMode === "spawn" ? (
                    <>
                      On submit this job goes{" "}
                      <span className="font-medium text-foreground">Parts-pending</span>{" "}
                      and a linked return visit is created, so the second trip is
                      its own job with its own schedule.
                    </>
                  ) : (
                    <>
                      On submit this job{" "}
                      <span className="font-medium text-foreground">stays open</span>{" "}
                      and rolls to tomorrow. No second order is created.
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        </SheetSection>
      )}
    </RecordSheet>
  );
}
