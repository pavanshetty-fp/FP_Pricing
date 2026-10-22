import { toast } from "sonner";
import { ArrowRight, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { RecordSheet } from "../unified-view/RecordSheet";
import { RailRow, SummaryCard } from "../unified-view/SheetCards";
import {
  REQUEST_STATUS_TONE,
  TENANT,
  printKey,
  quantityText,
  updateRequest,
  windowText,
  type OrderRequest,
} from "./orders";
import type { NeededAction } from "./DashboardScreen";

/*
  WHAT NEEDS THE CUSTOMER — FIRST, ON ITS OWN (Pavan, 2026-10-15; the kinds from the Anirudh review, 2026-10-17). A tile in the dashboard's
  "Attention required" opens THIS: a 600px sheet that says what is needed
  and why, with the facts for that action, and "View order details".

    late    the planned date it has passed; there is no ETA yet
    pod     delivered without a ticket — ask the tenant for it

  Credit holds are one tile of their own (a count, no balance): their orders
  open straight from it.
*/

const LEVEL_TEXT = { critical: "text-status-failed", warning: "text-status-processing", info: "text-foreground" };

export function ActionSheet({
  request,
  action,
  open,
  onOpenChange,
  onViewOrder,
}: {
  request: OrderRequest | null;
  action: NeededAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewOrder: (id: string) => void;
}) {
  if (!request || !action) return null;
  const r = request;
  const asked = (r.audit ?? []).some((e) => e.changes.includes("Proof of delivery requested"));

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
          <Button variant={action.kind === "pod" ? "outline" : "default"} onClick={() => onViewOrder(r.id)}>
            View order details
            <ArrowRight />
          </Button>
          {action.kind === "pod" && (
            <Button
              disabled={asked}
              onClick={() => {
                updateRequest(r.id, {}, "Proof of delivery requested");
                toast.success(`Proof of delivery requested for ${r.requestNo}`);
              }}
            >
              <FileQuestion />
              {asked ? "Requested" : "Request proof of delivery"}
            </Button>
          )}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryCard title="Attention required">
          <div className="flex flex-col gap-1.5">
            <p className={cn("text-base font-semibold", LEVEL_TEXT[action.level])}>{action.action}</p>
            <p className="text-sm text-foreground">{action.why}</p>
          </div>
        </SummaryCard>

        {/* THE ORDER, IN SHORT — what it is about; the rest is one press away. */}
        <SummaryCard title="The order">
          <dl className="flex flex-col">
            <RailRow variant="line" label="Ship-to" value={r.shipTo} />
            <RailRow variant="line" label="Planned date" value={r.date ? `${printKey(r.date)}, ${windowText(r)}` : "No date"} />
            <RailRow variant="line" label="Quantity" value={quantityText(r.lines) ? `${quantityText(r.lines)} gal` : "—"} />
            <RailRow variant="line" label="Supplier" value={TENANT} />
          </dl>
        </SummaryCard>
      </div>
    </RecordSheet>
  );
}
