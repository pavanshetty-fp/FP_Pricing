import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Two-step bulk-edit dialog for Fuel Orders.
 *
 * This is the DS's own prescribed shape, not a new invention. `02-rules/
 * interaction-and-behavior.md` §4b (locked decision 11) says bulk-attribute
 * editors come in three tiers by cardinality, each opening a DIALOG — and that
 *
 *   "Bulk mutations that change a computed value across rows take a two-step
 *    shape: (1) input dialog (header leads with scope + count), (2) per-row
 *    before/after preview with `Go back` / `Confirm`, (3) commit."
 *
 * plus "Destructive bulk replace requires confirmation" and "Add vs Replace is
 * the underlying semantic for any non-scalar bulk edit". The five field actions
 * used to be one-shot popovers that committed on click, which met none of that.
 *
 * WHY BOTH STEPS EARN THEIR KEEP: the operator needs to see the state that
 * ALREADY exists before piling onto it — a driver is typically mid-round with
 * orders already assigned, and an order already carries product lines whose sum
 * IS the Qty column. Step 1 surfaces that standing state; step 2 shows the
 * delta it is about to become.
 *
 * TWO DEVIATIONS FROM THE DS DIALOG, both structural rather than visual:
 *
 * 1. WIDTH. `DialogContent` is `sm:max-w-lg`. A per-row before/after table
 *    needs more, so the summary step widens to `sm:max-w-2xl`. Nothing else is
 *    restyled — surface, radius, border, padding and scrim are the DS's.
 *
 * 2. FOOTER ALIGNMENT. `DialogFooter` is `sm:justify-end`. The summary step
 *    puts `Go back` hard left and `Confirm` right, because the DS rule names
 *    those two buttons as a back/forward pair rather than a cancel/confirm
 *    pair. Step 1 keeps the DS's right-aligned default.
 *
 * Inner panels use `bg-fp-surface-1b`, NOT `bg-fp-card-1`: measured against the
 * dialog's own `bg-background`, card-1 is [6,3,10] away in light (#e9ecf1 on
 * #efefeb — near-invisible) while surface-1b is [16,16,20] light and [19,24,32]
 * dark. Same class of collision as the bulk bar's fill; checked before picking.
 *
 * DS FOLLOW-UP: none of this is Fuel-Orders-specific — the shell, the mini
 * order table and the before/after table are the generic Tier 1-3 primitives
 * §4b describes. They belong in the DS next to `tables-layout/BulkActionBar`,
 * which is also why this file avoids importing anything from this screen beyond
 * the `FuelOrder` type. Fifth component here written for want of a DS one — see
 * TokenMultiSelect, ProductTable, FuelOrdersBulkBar, BreakdownCard.
 */

/** Order identity as every summary table renders it. */
export interface OrderRef {
  orderNo: string;
  typeLabel: string;
  shipTo: string;
}

/** Order No / Order Type / ShipTo — the plain identity table. */
export function OrderMiniTable({ orders }: { orders: OrderRef[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Order No</TableHead>
            <TableHead>Order Type</TableHead>
            <TableHead>ShipTo/Terminal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.orderNo}>
              <TableCell className="font-medium tabular-nums">
                {o.orderNo}
              </TableCell>
              <TableCell>{o.typeLabel}</TableCell>
              <TableCell className="text-muted-foreground">{o.shipTo}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Per-row before/after — the step-2 preview §4b asks for. `before` renders
 * muted with a line through it so the row reads as a replacement, not an
 * addition; an empty `before` falls back to an em-dash so "had nothing" and
 * "had something" are visually distinct.
 */
export function BeforeAfterTable({
  rows,
  valueHeader,
}: {
  rows: { orderNo: string; before: string; after: string }[];
  valueHeader: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Order No</TableHead>
            <TableHead>Current {valueHeader}</TableHead>
            <TableHead>New {valueHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.orderNo}>
              <TableCell className="font-medium tabular-nums">
                {r.orderNo}
              </TableCell>
              <TableCell className="text-muted-foreground line-through">
                {r.before || "—"}
              </TableCell>
              <TableCell className="font-medium">{r.after || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * A driver's standing load, collapsed by default. This is the "surface what
 * already exists" half of the flow: the count is always visible, the orders
 * behind it are one click away.
 */
export function StandingLoad({
  name,
  orders,
}: {
  name: string;
  orders: OrderRef[];
}) {
  const [open, setOpen] = React.useState(false);
  const n = orders.length;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border border-border bg-fp-surface-1b"
    >
      <CollapsibleTrigger
        disabled={n === 0}
        className="flex w-full items-center justify-between gap-2 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default"
      >
        <span className="text-sm font-medium">{name}</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {n === 0
            ? "No orders assigned"
            : `${n} ${n === 1 ? "order" : "orders"} already assigned`}
          {n > 0 && (
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
            />
          )}
        </span>
      </CollapsibleTrigger>
      {n > 0 && (
        <CollapsibleContent className="px-3 pb-3">
          {/* Bounded on purpose. A driver mid-round can already hold 20+ orders,
              and letting that list run full height pushed "Orders being added" —
              the half the operator is actually deciding on — several screens
              down the dialog's own scroll. It scrolls within itself instead. */}
          <div className="max-h-56 overflow-y-auto">
            <OrderMiniTable orders={orders} />
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Attribute being edited, e.g. "Driver". Becomes the step-1 title. */
  title: string;
  /**
   * Verb phrase for the scope line, WITHOUT a trailing "selected" — the line is
   * composed as `{scopeVerb} selected {N orders}`, so "Assign driver to" reads
   * "Assign driver to selected 25 orders".
   */
  scopeVerb: string;
  count: number;
  /** Step 1 is only completable once the picker has a value. */
  canProceed: boolean;
  /** Step 1 body — the picker. */
  children: React.ReactNode;
  /** Step 2 body — what already exists, and what changes. */
  summary: React.ReactNode;
  /** One line under the "View Summary" title describing the commit. */
  summaryDescription: string;
  /** Commit. The dialog closes itself afterwards. */
  onConfirm: () => void;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  title,
  scopeVerb,
  count,
  canProceed,
  children,
  summary,
  summaryDescription,
  onConfirm,
}: BulkEditDialogProps) {
  const [step, setStep] = React.useState<"pick" | "summary">("pick");

  // Always reopen on step 1 — a dialog that reopens mid-flow would commit a
  // value the operator can no longer see.
  React.useEffect(() => {
    if (!open) setStep("pick");
  }, [open]);

  const orders = `${count} ${count === 1 ? "order" : "orders"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(step === "summary" && "sm:max-w-2xl")}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{step === "pick" ? title : "View Summary"}</DialogTitle>
          <DialogDescription>
            {step === "pick" ? (
              <>
                {scopeVerb} selected <span className="font-medium text-foreground">{orders}</span>
              </>
            ) : (
              summaryDescription
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Body scrolls; the header and footer stay put however many rows the
            selection carries. */}
        <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">
          {step === "pick" ? children : summary}
        </div>

        {step === "pick" ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canProceed} onClick={() => setStep("summary")}>
              Proceed and Confirm
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setStep("pick")}>
              Go back
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
