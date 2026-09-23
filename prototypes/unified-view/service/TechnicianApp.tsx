import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ServiceOrder } from "./work";
import { TechnicianJob, type SplitRequest, type TicketRequest } from "./TechnicianJob";

/**
 * THE TECHNICIAN'S APP, OVER THE DISPATCH SHEET — the SAME flow the phone runs
 * (Technician App in the rail), not a second one (Pavan, 2026-09-24). Order
 * details → Arrived at location → Start work → assessment → quote and
 * acknowledgement → complete, fully or partly.
 *
 * It used to be its own older panel, so the two technician apps disagreed:
 * the phone had been rebuilt and this one still showed the old steps.
 */
export function TechnicianApp({
  order,
  open,
  onOpenChange,
  onPatch,
  onSplit,
  onCreateTicket,
}: {
  onCreateTicket?: (req: TicketRequest) => string;
  order: ServiceOrder | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPatch: (patch: Partial<ServiceOrder>) => void;
  onSplit: (req: SplitRequest) => void;
}) {
  if (!order) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[844px] max-h-[90vh] w-[390px] gap-0 overflow-hidden rounded-[2.25rem] border-[10px] border-fp-outline-2 bg-fp-surface-1b p-0 sm:max-w-[390px]"
      >
        <DialogTitle className="sr-only">Technician app · {order.orderNo}</DialogTitle>
        <DialogDescription className="sr-only">
          {order.customer} · {order.shipTo}
        </DialogDescription>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <TechnicianJob
            key={order.id}
            job={order}
            onBack={() => onOpenChange(false)}
            onPatch={onPatch}
            onSplit={onSplit}
            onCreateTicket={onCreateTicket}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
