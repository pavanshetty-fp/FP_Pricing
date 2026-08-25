import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { RecordSheet } from "./RecordSheet";
import { formatFullDate } from "./data";
import {
  ASSET_ORDER_STATUSES,
  ASSET_TYPES,
  SALES_REPS,
  type AssetOrder,
  type AssetOrderStatus,
} from "./assetOrders";

/**
 * Asset Order side sheet — the Fuel Orders order sheet's shape, with this
 * record's fields. Sections, spacing and the create/edit split all come from
 * `RecordSheet`, so the two sheets differ only in their bodies.
 *
 * ONE DIFFERENCE FROM THE ORDER SHEET, and it is a real one: status is an
 * EDITABLE FIELD here, not derived. A fuel order's status is a function of its
 * driver, so offering a control would only let the two disagree. An asset order
 * has no such dependency — nothing else on the record implies whether it is
 * Open, Scheduled, Delivered or Cancelled — so it needs an explicit control.
 */
const STATUS_TONE: Record<AssetOrderStatus, StatusTone> = {
  Open: "neutral",
  Scheduled: "processing",
  Delivered: "success",
  Cancelled: "failed",
};

export interface AssetOrderDraft {
  customer: string;
  erpId: string;
  shipTo: string;
  salesRep: string;
  assetType: string;
  quantity: number;
  serialNo: string;
  deliveryDate: Date | null;
  status: AssetOrderStatus;
  poNumber: string;
  note: string;
}

function draftFrom(o: AssetOrder): AssetOrderDraft {
  const [y, m, d] = o.dateKey.split("-").map(Number);
  return {
    customer: o.customer.title,
    erpId: o.customer.description,
    shipTo: o.shipTo,
    salesRep: o.salesRep,
    assetType: o.assetType,
    quantity: o.quantity,
    serialNo: o.serialNo,
    deliveryDate: new Date(y, m - 1, d),
    status: o.status,
    poNumber: o.poNumber,
    note: o.note,
  };
}

/** A blank asset order. `quantity: 0` because a number field has no empty state. */
function emptyDraft(): AssetOrderDraft {
  return {
    customer: "",
    erpId: "",
    shipTo: "",
    salesRep: "",
    assetType: "",
    quantity: 0,
    serialNo: "",
    deliveryDate: null,
    status: "Open",
    poNumber: "",
    note: "",
  };
}

export interface AssetOrderSheetProps {
  order: AssetOrder | null;
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: AssetOrder, draft: AssetOrderDraft) => void;
  onCreate?: (draft: AssetOrderDraft) => void;
  customers: string[];
  shipTos: string[];
}

export function AssetOrderSheet({
  order,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
  customers,
  shipTos,
}: AssetOrderSheetProps) {
  const [draft, setDraft] = React.useState<AssetOrderDraft | null>(null);
  const creating = mode === "create";

  // Re-seed on every open, so a half-filled create draft never comes back and
  // edits never leak between rows.
  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
  }, [open, creating, order]);

  if (!draft || (!creating && !order)) return null;

  const set = <K extends keyof AssetOrderDraft>(
    key: K,
    value: AssetOrderDraft[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <RecordSheet
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Order #: ${order?.orderNo ?? ""}`}
      createTitle="Create Asset Order"
      createAction="Create Asset Order"
      headerAside={
        <StatusChip tone={STATUS_TONE[draft.status]} variant="soft">
          {draft.status}
        </StatusChip>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
        else if (order) onSave(order, draft);
      }}
    >
      <SheetSection className="gap-5" title="Order Details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer">
            <Select
              value={draft.customer}
              onValueChange={(v) => set("customer", v)}
            >
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

        <SheetField label="Sales Rep">
          <Select value={draft.salesRep} onValueChange={(v) => set("salesRep", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sales rep" />
            </SelectTrigger>
            <SelectContent>
              {SALES_REPS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SheetField>

        <SheetField
          label="Status"
          description="An asset order's status is its own lifecycle — nothing else on the record implies it."
        >
          <Select
            value={draft.status}
            onValueChange={(v) => set("status", v as AssetOrderStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SheetField>
      </SheetSection>

      <SheetSection className="gap-5" title="Asset">
        <SheetField label="Asset Type">
          <Select
            value={draft.assetType}
            onValueChange={(v) => set("assetType", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SheetField>

        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Quantity">
            <Input
              inputMode="numeric"
              value={draft.quantity ? String(draft.quantity) : ""}
              placeholder="0"
              onChange={(e) =>
                set("quantity", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
              }
            />
          </SheetField>
          <SheetField label="Serial No">
            <Input
              value={draft.serialNo}
              placeholder="e.g. TK-1000-4471"
              onChange={(e) => set("serialNo", e.target.value)}
            />
          </SheetField>
        </div>
      </SheetSection>

      <SheetSection className="gap-5" title="Schedule">
        <SheetField label="Delivery Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays />
                {draft.deliveryDate
                  ? formatFullDate(draft.deliveryDate)
                  : "Not scheduled"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={draft.deliveryDate ?? undefined}
                onSelect={(d) => set("deliveryDate", d ?? null)}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </SheetField>
      </SheetSection>

      <SheetSection className="gap-5" title="Reference">
        <SheetField label="PO Number">
          <Input
            value={draft.poNumber}
            placeholder="e.g. PO-88213"
            onChange={(e) => set("poNumber", e.target.value)}
          />
        </SheetField>
        <SheetField label="Note">
          <Textarea
            value={draft.note}
            placeholder="Access notes, delivery instructions…"
            onChange={(e) => set("note", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
      </SheetSection>
    </RecordSheet>
  );
}
