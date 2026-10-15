import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { RecordSheet } from "../unified-view/RecordSheet";
import { RailRow, SummaryCard } from "../unified-view/SheetCards";
import { OrderRestButton, QuoteActions, QuoteLines, ReplyPanel } from "./requestActions";
import {
  REQUEST_STATUS_TONE,
  TENANT,
  estimate,
  printKey,
  quantityText,
  windowText,
  type OrderRequest,
} from "./orders";
import { INVOICES, daysFrom, totalOf } from "./invoices";
import type { NeededAction } from "./DashboardScreen";

/*
  WHAT NEEDS THE CUSTOMER — FIRST, ON ITS OWN (Pavan, 2026-10-15). A tile in
  the dashboard's "Attention required" opens THIS, not the order: a 600px
  sheet that says what is needed and why, in the Request summary card's
  dress, with the facts that matter to that action. One act: "View order
  details" hands on to the order sheet.

    credit   the overdue invoices behind the hold, and their total
    quote    the estimate for what was quoted
    dispute  the invoice in dispute, its amount and reason
    partial  what was asked for
    late     the window, and the driver's ETA in the reason
    answer   the question is in the reason
*/

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const LEVEL_TEXT = { critical: "text-status-failed", warning: "text-status-processing", info: "text-foreground" };

export function ActionSheet({
  request,
  action,
  open,
  onOpenChange,
  onViewOrder,
  onCreated,
}: {
  request: OrderRequest | null;
  action: NeededAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewOrder: (id: string) => void;
  /** "Order the rest" made a new draft — open it. */
  onCreated: (id: string) => void;
}) {
  if (!request || !action) return null;
  const r = request;
  const est = estimate(r.lines);
  const overdue = INVOICES.filter((i) => i.status === "Overdue");
  const disputed = INVOICES.find((i) => i.requestNo === r.requestNo);

  return (
    <RecordSheet
      size="form"
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={r.requestNo}
      createTitle=""
      createAction=""
      showCancel={false}
      onSubmit={() => {}}
      headerAside={
        <StatusChip tone={REQUEST_STATUS_TONE[r.status]} variant="text">
          {r.status}
        </StatusChip>
      }
      footerPrimary={
        <span className="flex items-center gap-3">
          <Button variant={r.status === "Quote sent" || r.undeliveredGal ? "outline" : "default"} onClick={() => onViewOrder(r.id)}>
            View order details
            <ArrowRight />
          </Button>
          <QuoteActions r={r} />
          <OrderRestButton r={r} onCreated={onCreated} />
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {/* THE ACTION — the Request summary card's treatment. */}
        <SummaryCard title="Attention required">
          <div className="flex flex-col gap-1.5">
            <p className={cn("text-base font-semibold", LEVEL_TEXT[action.level])}>{action.action}</p>
            <p className="text-sm text-foreground">{action.why}</p>
          </div>

          {action.kind === "credit" && overdue.length > 0 && (
            <dl className="flex flex-col border-t border-border pt-2">
              {overdue.map((i) => (
                <RailRow
                  key={i.invoiceNo}
                  variant="line"
                  label={`${i.invoiceNo} · ${-daysFrom(i.due)} days overdue`}
                  value={usd.format(totalOf(i))}
                />
              ))}
              <RailRow
                variant="total"
                label="Overdue balance"
                value={usd.format(overdue.reduce((t, i) => t + totalOf(i), 0))}
              />
            </dl>
          )}

          {action.kind === "quote" && est.high > 0 && (
            <div className="border-t border-border pt-2">
              <QuoteLines r={r} />
            </div>
          )}

          {action.kind === "partial" && r.undeliveredGal && (
            <dl className="flex flex-col border-t border-border pt-2">
              <RailRow variant="total" label="Not delivered" value={`${r.undeliveredGal.toLocaleString()} gal`} />
            </dl>
          )}

          {action.kind === "dispute" && disputed && (
            <dl className="flex flex-col border-t border-border pt-2">
              <RailRow variant="line" label="Invoice" value={disputed.invoiceNo} />
              {disputed.dispute && <RailRow variant="line" label="Reason" value={disputed.dispute.reason} />}
              <RailRow variant="total" label="Invoiced" value={usd.format(totalOf(disputed))} />
            </dl>
          )}
        </SummaryCard>

        {/* WHAT THE CUSTOMER CAN SEND BACK — no payment here; they pay
            offline and say so, and the supplier releases the hold. */}
        {(action.kind === "credit" || action.kind === "answer") && r.status === "Action needed" && (
          <SummaryCard title={`Reply to ${TENANT}`}>
            <ReplyPanel r={r} credit={action.kind === "credit"} />
          </SummaryCard>
        )}

        {/* THE ORDER, IN SHORT — what it is about; the rest is one press away. */}
        <SummaryCard title="The order">
          <dl className="flex flex-col">
            <RailRow variant="line" label="Ship-to" value={r.shipTo} />
            <RailRow variant="line" label="Requested" value={r.date ? `${printKey(r.date)}, ${windowText(r)}` : "No date"} />
            <RailRow variant="line" label="Quantity" value={quantityText(r.lines) ? `${quantityText(r.lines)} gal` : "—"} />
            <RailRow variant="line" label="Supplier" value={TENANT} />
          </dl>
        </SummaryCard>
      </div>
    </RecordSheet>
  );
}
