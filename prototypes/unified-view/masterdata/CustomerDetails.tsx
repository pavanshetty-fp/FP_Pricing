import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RailCard, RailRow } from "../SheetCards";
import { DASH, formatDate, money, oneLineAddress } from "../threepl/directoryCore";
import { vendorById } from "../threepl/vendors";
import { UsageBar } from "./assetParts";
import { riskOf, type MdCustomer } from "./customers";
import { wholeMoney } from "./sheetParts";

/*
  CUSTOMER DETAILS — A CARD PER SUBJECT, as Asset 360's (Pavan chose that
  shape, 2026-11-03): Credit and payment, Contact, Account, and the
  instructions when there are any — each with Edit, which opens the
  customer form (the 3PL Directory's, same data, same form) over the sheet.
*/

const Edit = ({ onEdit }: { onEdit: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon-sm" aria-label="Edit details" onClick={onEdit}>
        <Pencil />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Edit details</TooltipContent>
  </Tooltip>
);

/** A value too long for one line — the label over it. */
const Stacked = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1 px-4 py-2.5">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

export function CustomerCards({ c, onEdit }: { c: MdCustomer; onEdit: () => void }) {
  const limit = c.creditLimit;
  const used = limit ? Math.round((c.currentBalance / limit) * 100) : null;
  const overdue = c.aging.late30 + c.aging.late60 + c.aging.late60plus;
  return (
    <div className="flex flex-col gap-4">
      <RailCard title="Credit and payment" action={<Edit onEdit={onEdit} />}>
        {/* THE NUMBER PEOPLE ASK FOR — what is left — computed, never stored. */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          {limit === null ? (
            <>
              <span className="text-sm font-medium text-foreground">No credit limit</span>
              <span className="text-xs text-muted-foreground">{money(c.currentBalance)} owed</span>
            </>
          ) : (
            <>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums text-foreground">{wholeMoney(Math.max(limit - c.currentBalance, 0))}</span>
                <span className="text-xs text-muted-foreground">available</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <UsageBar pct={used ?? 0} />
                <span className="tabular-nums">
                  {money(c.currentBalance)} of {money(limit)} used
                </span>
              </span>
            </>
          )}
        </div>
        <dl className="flex flex-col border-b border-border py-1">
          <RailRow label="Overdue" value={overdue ? money(overdue) : DASH} />
          <RailRow label="Payment terms" value={c.paymentTerms} />
          <RailRow label="Average days to pay" value={c.avgDaysToPay ? `${c.avgDaysToPay} days` : DASH} />
          <RailRow label="Last credit review" value={formatDate(c.lastCreditReview)} />
          <Stacked label="Risk signal">{riskOf(c)}</Stacked>
        </dl>
        {/* HOW THE BALANCE AGES — past due counts from the terms. */}
        <dl className="flex flex-col py-1">
          <RailRow label="Not yet due" value={money(c.aging.current)} />
          <RailRow label="1–30 days past due" value={money(c.aging.late30)} />
          <RailRow label="31–60 days past due" value={money(c.aging.late60)} />
          <RailRow label="Over 60 days past due" value={money(c.aging.late60plus)} />
        </dl>
      </RailCard>

      <RailCard title="Contact" action={<Edit onEdit={onEdit} />}>
        <dl className="flex flex-col py-1">
          <RailRow label="Main contact" value={c.mainContactName ?? DASH} />
          <RailRow label="Role" value={c.mainContactRole ?? DASH} />
          <RailRow label="Phone" value={c.phone ?? DASH} />
          <Stacked label="Email">{c.email ?? DASH}</Stacked>
          <Stacked label="Billing email">{c.billingEmail ?? DASH}</Stacked>
          <Stacked label="Dispatch email">{c.dispatchEmail ?? DASH}</Stacked>
        </dl>
      </RailCard>

      <RailCard title="Account" action={<Edit onEdit={onEdit} />}>
        <dl className="flex flex-col py-1">
          <RailRow label="ERP ID" value={c.erpId} />
          <RailRow label="Accounting ID" value={c.accountingCustomerId ?? DASH} />
          <Stacked label="Billing address">{oneLineAddress(c) || DASH}</Stacked>
          <RailRow label="Tax exempt" value={c.taxExempt ? "Yes" : "No"} />
          <RailRow label="Portal access" value={c.portalAccessEnabled ? "On" : "Off"} />
          <RailRow label="Preferred vendor" value={vendorById(c.preferredVendorId)?.name ?? DASH} />
        </dl>
      </RailCard>

      {(c.customerInstruction || c.deliveryNotes) && (
        <RailCard title="Instructions" action={<Edit onEdit={onEdit} />}>
          <dl className="flex flex-col py-1">
            {c.customerInstruction && <Stacked label="Customer instruction">{c.customerInstruction}</Stacked>}
            {c.deliveryNotes && <Stacked label="Delivery notes">{c.deliveryNotes}</Stacked>}
          </dl>
        </RailCard>
      )}
    </div>
  );
}
