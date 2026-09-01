import * as React from "react";
import {
  CalendarDays,
  Check,
  CircleAlert,
  Mail,
  Plus,
  Shield,
  ThumbsDown,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { RecordSheet } from "../RecordSheet";
import { formatFullDate } from "../data";
import { VENDORS, vendorById } from "./vendors";
import {
  BROKER_STATUS_TONE,
  HUBS,
  POCS,
  PRODUCTS,
  SALESPEOPLE,
  TIME_OPTIONS,
  isAllTopOff,
  quoteTotal,
  totalGal,
  type BrokerOrder,
  type BrokerOrderType,
  type BrokerStatus,
  type OrderLine,
} from "./orders";

/**
 * 3PL order side sheet — chrome and rhythm from `RecordSheet`, so it is the same
 * sheet as the three Sales ones and differs only in its body.
 *
 * ONE STRUCTURAL DIFFERENCE FROM EVERY SALES SHEET, and it is the point of the
 * module: STATUS IS NOT A FIELD. `AssetOrderSheet` gives status a Select because
 * an asset order's status is its own free-standing lifecycle. A 3PL order's is
 * not — the spec defines it as the RESULT of the brokerage workflow
 * (Draft -> invite -> vendor acknowledges -> vendor submits -> accounting), so
 * offering a status picker would let the status disagree with the vendor fields
 * beside it. Instead the Delivery Partner section below renders the actions that
 * are legal from the current stage, and the status follows from taking one. The
 * same reasoning the Fuel Orders sheet uses to NOT offer a status control,
 * arrived at from the opposite direction: there status is derived from a field,
 * here it is advanced by an action.
 *
 * The transitions offered are exactly the spec's (§5.6–5.11, §5.17):
 *   Draft/Blocked   -> invite one or more vendors                  -> Assigned
 *   Assigned        -> acknowledge on the vendor's behalf           -> Accepted
 *                   -> accept a submitted quote                    -> Accepted
 *                   -> cancel the invitation                       -> Draft
 *   Accepted        -> submit delivery details on vendor's behalf   -> Completed
 *   Completed       -> mark ready for accounting                    -> Sync Ready
 *   Sync Ready      -> sync to accounting                           -> Synced
 *
 * NOT BUILT, and named rather than quietly skipped: the Activity Log (§5.4), the
 * email PREVIEW before sending an invitation (§5.6), Internal Notes (§5.4), the
 * linked Load Order (§5.3 §6, feature-flagged), and the map view of nearby
 * vendors (§5.5) — a map is a whole component the DS does not have. The vendor
 * TABLE view of the picker, which the same section offers, is what is built.
 */

const ORDER_TYPES: BrokerOrderType[] = ["Core", "Emergency", "Asset Movement"];

export interface BrokerOrderDraft {
  customer: string;
  erpId: string;
  shipTo: string;
  plannedDate: Date | null;
  windowStart: string;
  windowEnd: string;
  poNumber: string;
  orderType: BrokerOrderType;
  hub: string;
  urgent: boolean;
  signatureOnDelivery: boolean;
  lines: OrderLine[];
  status: BrokerStatus;
  vendorId: string | null;
  invitedVendorIds: string[];
  quoteRequested: boolean;
  primaryPoc: string;
  salesperson: string;
  instructions: string;
}

function draftFrom(o: BrokerOrder): BrokerOrderDraft {
  const [y, m, d] = o.dateKey.split("-").map(Number);
  return {
    customer: o.customer.title,
    erpId: o.customer.description,
    shipTo: o.shipTo,
    plannedDate: new Date(y, m - 1, d),
    windowStart: o.window.start,
    windowEnd: o.window.end,
    poNumber: o.poNumber,
    orderType: o.orderType,
    hub: o.hub,
    urgent: o.urgent,
    signatureOnDelivery: o.signatureOnDelivery,
    // Copied, not shared — editing a line must not mutate the row behind the sheet.
    lines: o.lines.map((l) => ({ ...l })),
    status: o.status,
    vendorId: o.vendorId,
    invitedVendorIds: [...o.invitedVendorIds],
    quoteRequested: o.quoteRequested,
    primaryPoc: o.primaryPoc,
    salesperson: o.salesperson,
    instructions: o.instructions,
  };
}

/** A blank order. Starts in Draft with no partner — the only legal start state. */
function emptyDraft(): BrokerOrderDraft {
  return {
    customer: "",
    erpId: "",
    shipTo: "",
    plannedDate: null,
    windowStart: "8:00 AM",
    windowEnd: "12:00 PM",
    poNumber: "",
    orderType: "Core",
    hub: HUBS[0],
    urgent: false,
    signatureOnDelivery: false,
    lines: [{ asset: "", product: PRODUCTS[0], gal: null, topOff: false }],
    status: "Draft",
    vendorId: null,
    invitedVendorIds: [],
    quoteRequested: false,
    primaryPoc: "",
    salesperson: "",
    instructions: "",
  };
}

/** Compact vendor identity line — name, base, business lines, score, distance. */
function VendorRow({ id }: { id: string }) {
  const v = vendorById(id);
  if (!v) return null;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
        {!v.emailsEnabled && (
          // §6 Email Management: a vendor with emails off will never see an
          // invitation, so saying so at the point of inviting them is the whole
          // value of the flag.
          <Badge variant="destructive" className="shrink-0">
            Emails off
          </Badge>
        )}
        {!v.hasAccount && (
          <Badge variant="secondary" className="shrink-0">
            Link only
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span className="truncate">{v.base}</span>
        <span className="flex items-center gap-1 tabular-nums">
          <Shield className="size-3" /> {v.safetyScore}
        </span>
        <span className="tabular-nums">{v.distanceMi} mi</span>
        <span className="truncate">{v.businessLines.join(" · ")}</span>
      </div>
    </div>
  );
}

export interface BrokerOrderSheetProps {
  order: BrokerOrder | null;
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: BrokerOrder, draft: BrokerOrderDraft) => void;
  onCreate?: (draft: BrokerOrderDraft) => void;
  customers: string[];
  shipTos: string[];
}

export function BrokerOrderSheet({
  order,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
  customers,
  shipTos,
}: BrokerOrderSheetProps) {
  const [draft, setDraft] = React.useState<BrokerOrderDraft | null>(null);
  /** Vendors ticked in the picker but not yet invited. */
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const creating = mode === "create";

  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
    setPicked(new Set());
  }, [open, creating, order]);

  if (!draft || (!creating && !order)) return null;

  const set = <K extends keyof BrokerOrderDraft>(
    key: K,
    value: BrokerOrderDraft[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const setLine = (i: number, patch: Partial<OrderLine>) =>
    setDraft((d) =>
      d
        ? { ...d, lines: d.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }
        : d
    );

  const isMovement = order?.kind === "Movement";
  const gal = totalGal(draft.lines);
  const quotes = order?.quotes ?? [];

  /**
   * The picker offers only partners that run the line of business this order
   * needs — §5.5 makes Business Lines a filter on the vendor table for exactly
   * this reason. Offering the full list let a bulk fuel order be sent to a
   * carrier whose only line is Asset Movement.
   */
  const requiredLine = isMovement ? "Asset Movement" : "Bulk Fuel";
  const eligible = VENDORS.filter((v) =>
    v.businessLines.some((b) => b === requiredLine)
  );

  /* ── Workflow transitions. Each one moves the status AND the vendor fields
        together, so the pair cannot end up contradicting itself. ─────────── */
  const invite = () =>
    setDraft((d) =>
      d
        ? { ...d, status: "Assigned", invitedVendorIds: [...picked], vendorId: null }
        : d
    );
  const cancelInvites = () =>
    setDraft((d) =>
      d ? { ...d, status: "Draft", invitedVendorIds: [], vendorId: null } : d
    );
  const acceptFor = (vendorId: string) =>
    setDraft((d) => (d ? { ...d, status: "Accepted", vendorId } : d));
  const advance = (status: BrokerStatus) =>
    setDraft((d) => (d ? { ...d, status } : d));

  const preVendor = draft.status === "Draft" || draft.status === "Blocked";
  const canSubmit =
    draft.customer.trim() !== "" &&
    draft.shipTo.trim() !== "" &&
    draft.plannedDate !== null;

  return (
    <RecordSheet
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Order #: ${order?.orderNo ?? ""}`}
      createTitle="Create Delivery Order"
      createAction="Create Order"
      canSubmit={canSubmit}
      headerAside={
        <div className="flex items-center gap-2">
          <StatusChip tone={BROKER_STATUS_TONE[draft.status]} variant="soft">
            {draft.status}
          </StatusChip>
          {draft.urgent && <Badge variant="destructive">Urgent</Badge>}
        </div>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
        else if (order) onSave(order, draft);
      }}
    >
      {/* §5.2 — a blocked order is blocked for a REASON, and the reason is what
          the broker has to act on. It leads the sheet rather than hiding in a
          field. `soft`/destructive treatment per the DS's noticing rule. */}
      {order?.blockedReason && (
        <div className="flex items-start gap-2 rounded-md border border-status-failed/30 bg-status-failed/10 p-3">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-failed" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              Blocked on credit — {order.blockedReason}
            </span>
            <span className="text-xs text-muted-foreground">
              A blocked order cannot be sent to a vendor. Clear the credit hold in
              Settings, then invite a delivery partner.
            </span>
          </div>
        </div>
      )}

      <SheetSection className="gap-5" title="Customer">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer">
            <Select value={draft.customer} onValueChange={(v) => set("customer", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
          <SheetField label="Ship To">
            <Select value={draft.shipTo} onValueChange={(v) => set("shipTo", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ship-to" />
              </SelectTrigger>
              <SelectContent>
                {shipTos.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
        </div>
      </SheetSection>

      <SheetSection className="gap-5" title="Order Details">
        <SheetField label="Planned Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays />
                {draft.plannedDate ? formatFullDate(draft.plannedDate) : "Not scheduled"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={draft.plannedDate ?? undefined}
                onSelect={(d) => set("plannedDate", d ?? null)}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </SheetField>

        {/* §5.3 — a WINDOW, not a single planned time. This is the field that
            most distinguishes a brokered order from a first-party one: the
            broker commits a range and the vendor picks its moment inside it. */}
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Window Start">
            <Select
              value={draft.windowStart}
              onValueChange={(v) => set("windowStart", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
          <SheetField label="Window End">
            <Select value={draft.windowEnd} onValueChange={(v) => set("windowEnd", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Order Type">
            <Select
              value={draft.orderType}
              onValueChange={(v) => set("orderType", v as BrokerOrderType)}
            >
              {/* §5.20 — a movement order's type is auto-set to Asset Movement
                  and is the only type it can take, so the control is locked
                  rather than offering a change that isn't allowed. */}
              <SelectTrigger className="w-full" disabled={isMovement}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_TYPES.filter((t) =>
                  isMovement ? t === "Asset Movement" : t !== "Asset Movement"
                ).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
          <SheetField label="PO Number">
            <Input
              value={draft.poNumber}
              placeholder="e.g. PO-70213"
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </SheetField>
        </div>

        <SheetField label="Hub">
          <Select value={draft.hub} onValueChange={(v) => set("hub", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HUBS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SheetField>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="urgent" className="text-sm font-medium text-foreground">
            Mark as urgent
          </label>
          <Switch
            id="urgent"
            checked={draft.urgent}
            onCheckedChange={(v) => set("urgent", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="signature" className="text-sm font-medium text-foreground">
            Get signature on delivery
          </label>
          <Switch
            id="signature"
            checked={draft.signatureOnDelivery}
            onCheckedChange={(v) => set("signatureOnDelivery", v)}
          />
        </div>
      </SheetSection>

      {/* §5.20 — movement orders show Asset instead of the product sections, and
          the asset is FIXED once the order is created. Read-only is the honest
          rendering of a field that cannot be changed. */}
      {isMovement && order?.movement && (
        <SheetSection className="gap-5" title="Asset">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Direction">
              <Input value={order.movement.direction} readOnly />
            </SheetField>
            <SheetField label="Yard">
              <Input value={order.movement.yard} readOnly />
            </SheetField>
            <SheetField label="Tank Type">
              <Input value={order.movement.tankType} readOnly />
            </SheetField>
            <SheetField label="Capacity">
              <Input value={`${order.movement.capacityGal} gal`} readOnly />
            </SheetField>
          </div>
          <p className="text-xs text-muted-foreground">
            One asset per movement order, fixed after creation. Peripherals and
            custom items are not built in this pass.
          </p>
        </SheetSection>
      )}

      {!isMovement && (
        <SheetSection className="gap-5" title="Delivery Order">
          <div className="flex flex-col gap-3">
            {draft.lines.map((line, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-md border border-fp-outline-1 p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={line.asset}
                    placeholder="Asset, e.g. Tank 104"
                    aria-label={`Asset for line ${i + 1}`}
                    onChange={(e) => setLine(i, { asset: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={draft.lines.length === 1}
                    onClick={() =>
                      set(
                        "lines",
                        draft.lines.filter((_, k) => k !== i)
                      )
                    }
                  >
                    <X />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={line.product}
                    onValueChange={(v) => setLine(i, { product: v })}
                  >
                    <SelectTrigger className="w-full" aria-label={`Product for line ${i + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    inputMode="numeric"
                    // A top-off line carries no requested volume — the field is
                    // not merely empty, it is inapplicable, so it is disabled and
                    // the value forced to null rather than left as a stale number.
                    disabled={line.topOff}
                    value={line.gal !== null ? String(line.gal) : ""}
                    placeholder={line.topOff ? "Top-off" : "Gallons"}
                    aria-label={`Gallons for line ${i + 1}`}
                    onChange={(e) =>
                      setLine(i, {
                        gal: Number(e.target.value.replace(/[^0-9]/g, "")) || null,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor={`topoff-${i}`}
                    className="text-sm text-muted-foreground"
                  >
                    Top off
                  </label>
                  <Switch
                    id={`topoff-${i}`}
                    checked={line.topOff}
                    onCheckedChange={(v) =>
                      setLine(i, { topOff: v, gal: v ? null : (line.gal ?? 0) })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                set("lines", [
                  ...draft.lines,
                  { asset: "", product: PRODUCTS[0], gal: null, topOff: false },
                ])
              }
            >
              <Plus /> Add asset
            </Button>
            {/* Qty is never an input — it is the sum of the lines. Same rule the
                Fuel Orders sheet holds to. */}
            <span className="text-sm tabular-nums text-muted-foreground">
              Total{" "}
              <span className="font-medium text-foreground">
                {isAllTopOff(draft.lines) ? "Top-off" : `${gal.toLocaleString()} gal`}
              </span>
            </span>
          </div>
        </SheetSection>
      )}

      {/* ── The 3PL section. Everything above exists on a first-party order
             too; this is what makes the order brokered. ─────────────────── */}
      <SheetSection className="gap-5" title="Delivery Partner">
        {preVendor && (
          <>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="quote"
                className="flex flex-col gap-0.5 text-sm font-medium text-foreground"
              >
                Request a quote
                <span className="text-xs font-normal text-muted-foreground">
                  Invited partners submit pricing instead of a plain
                  acknowledgement.
                </span>
              </label>
              <Switch
                id="quote"
                checked={draft.quoteRequested}
                onCheckedChange={(v) => set("quoteRequested", v)}
              />
            </div>

            <SheetField
              label="Invite partners"
              description={`Showing partners that run ${requiredLine}. All invited partners are notified at the same time; whichever accepts first is assigned the order, and the rest are told it is no longer available.`}
            >
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border border-fp-outline-1 p-1">
                {eligible.map((v) => (
                  <label
                    key={v.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-sm p-2 transition-colors hover:bg-accent has-[:focus-visible]:bg-accent"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={picked.has(v.id)}
                      onCheckedChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(v.id)) next.delete(v.id);
                          else next.add(v.id);
                          return next;
                        })
                      }
                    />
                    <VendorRow id={v.id} />
                  </label>
                ))}
              </div>
            </SheetField>

            <Button
              // A blocked order cannot be dispatched at all (§5, Credit Limit
              // Management), so the action is unavailable rather than failing
              // after the click.
              disabled={picked.size === 0 || draft.status === "Blocked"}
              onClick={invite}
            >
              <Mail />
              {picked.size > 1
                ? `Invite ${picked.size} partners`
                : "Invite partner"}
            </Button>
          </>
        )}

        {draft.status === "Assigned" && (
          <>
            <p className="text-xs text-muted-foreground">
              Out for acknowledgement. Nobody has accepted yet.
            </p>
            <div className="flex flex-col gap-2">
              {draft.invitedVendorIds.map((id) => {
                const quote = quotes.find((q) => q.vendorId === id);
                return (
                  <div
                    key={id}
                    className="flex flex-col gap-2 rounded-md border border-fp-outline-1 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <VendorRow id={id} />
                    </div>
                    {draft.quoteRequested && (
                      <div className="flex items-center justify-between gap-3 border-t border-fp-outline-1 pt-2">
                        {quote ? (
                          <span className="text-xs tabular-nums text-foreground">
                            {quote.fee !== undefined ? (
                              <>
                                Fee ${quote.fee} + tax ${quote.tax} ={" "}
                                <span className="font-medium">
                                  ${quoteTotal(quote, gal).toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <>
                                ${quote.ratePerGal}/gal + ${quote.serviceCharge} ={" "}
                                <span className="font-medium">
                                  $
                                  {quoteTotal(quote, gal).toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No pricing submitted yet
                          </span>
                        )}
                        <Button
                          size="xs"
                          disabled={!quote}
                          onClick={() => acceptFor(id)}
                        >
                          <Check /> Accept quote
                        </Button>
                      </div>
                    )}
                    {!draft.quoteRequested && (
                      <div className="flex items-center justify-end gap-2 border-t border-fp-outline-1 pt-2">
                        <Button variant="outline" size="xs" onClick={() => acceptFor(id)}>
                          <Check /> Acknowledge for them
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={cancelInvites}>
              <ThumbsDown /> Cancel invitation
            </Button>
          </>
        )}

        {!preVendor && draft.status !== "Assigned" && draft.vendorId && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-fp-outline-1 p-3">
              <Check className="mt-0.5 size-4 shrink-0 text-status-success" />
              <VendorRow id={draft.vendorId} />
            </div>
            {(() => {
              const q = quotes.find((x) => x.vendorId === draft.vendorId);
              if (!q) return null;
              return (
                <SheetField label="Accepted pricing">
                  <p className="text-sm tabular-nums text-foreground">
                    {q.fee !== undefined
                      ? `Fee $${q.fee} + tax $${q.tax} = $${quoteTotal(q, gal).toLocaleString()}`
                      : `$${q.ratePerGal}/gal + $${q.serviceCharge} service = $${quoteTotal(
                          q,
                          gal
                        ).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  </p>
                </SheetField>
              );
            })()}
            {draft.status === "Accepted" && (
              <Button variant="outline" onClick={() => advance("Completed")}>
                Submit delivery details for them
              </Button>
            )}
            {draft.status === "Completed" && (
              <Button
                variant="outline"
                onClick={() => advance("Accounting Sync Ready")}
              >
                Mark ready for accounting
              </Button>
            )}
            {draft.status === "Accounting Sync Ready" && (
              <Button variant="outline" onClick={() => advance("Accounting Synced")}>
                Sync to accounting
              </Button>
            )}
            {draft.status === "Accounting Synced" && (
              <p className="text-xs text-muted-foreground">
                Synced. Every field is locked once an order reaches this stage.
              </p>
            )}
          </>
        )}
      </SheetSection>

      <SheetSection className="gap-5" title="Point of Contact">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Primary POC">
            <Select
              value={draft.primaryPoc}
              onValueChange={(v) => set("primaryPoc", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select POC" />
              </SelectTrigger>
              <SelectContent>
                {POCS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
          <SheetField label="Salesperson">
            <Select
              value={draft.salesperson}
              onValueChange={(v) => set("salesperson", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select salesperson" />
              </SelectTrigger>
              <SelectContent>
                {SALESPEOPLE.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
        </div>
      </SheetSection>

      <SheetSection className="gap-5" title="Additional Details">
        <SheetField label="Delivery Instructions">
          <Textarea
            value={draft.instructions}
            placeholder="Gate codes, access notes, what the vendor needs to know…"
            onChange={(e) => set("instructions", e.target.value)}
            className={cn("min-h-24")}
          />
        </SheetField>
      </SheetSection>
    </RecordSheet>
  );
}
