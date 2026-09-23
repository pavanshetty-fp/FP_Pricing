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
import { Combobox } from "@/components/ui/combobox";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import { formatFullDate } from "./data";
import {
  ASSET_ORDER_STATUSES,
  ASSET_TYPES,
  SALES_REPS,
  type AssetOrder,
  type AssetOrderStatus,
} from "./assetOrders";
import { ASSET_ORDER_STATUS_TONE } from "./assetOrders";
import { ActivitySection } from "./activity";

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
const STATUS_TONE = ASSET_ORDER_STATUS_TONE;

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
  const saveState = useDraftSaveState(draft, open);
  /* WHAT WENT OUT LAST. The row comes back changed by our own save, so
     without this the sheet would answer its own write with a rebuild. */
  const lastSaved = React.useRef<string | null>(null);

  /* Re-seed on every open, so a half-filled create draft never comes back and
     edits never leak between rows — keyed on the ORDER'S ID rather than the
     row, because the row is handed back changed by every autosave. */
  const orderId = order?.id ?? null;
  React.useEffect(() => {
    if (!open) return;
    const next = creating ? emptyDraft() : order ? draftFrom(order) : null;
    lastSaved.current = next ? JSON.stringify(next) : null;
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creating, orderId]);

  /* AUTOSAVED, DEBOUNCED — 600ms, the same everywhere. */
  React.useEffect(() => {
    if (creating || !order || !draft) return;
    const serialised = JSON.stringify(draft);
    if (serialised === lastSaved.current) return;
    const t = window.setTimeout(() => {
      lastSaved.current = serialised;
      onSave(order, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, order, creating, onSave]);

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
      /* IT AUTOSAVES, SO THERE IS NOTHING TO CANCEL AND NOTHING TO SAVE.
         Creating still takes an act. */
      showCancel={false}
      footerPrimary={creating ? undefined : null}
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip tone={STATUS_TONE[draft.status]} variant="soft">
            {draft.status}
          </StatusChip>
          {saveState !== "idle" && (
            <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
          )}
        </span>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
      }}
    >
      <SheetSection title="Order Details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer">
            <Combobox
              className="w-full"
              value={draft.customer}
              onValueChange={(v) => set("customer", v)}
              options={customers}
              placeholder="Select customer"
            />
          </SheetField>
          <SheetField label="Ship To">
            <Combobox
              className="w-full"
              value={draft.shipTo}
              onValueChange={(v) => set("shipTo", v)}
              options={shipTos}
              placeholder="Select ship-to"
            />
          </SheetField>
        </div>

        <SheetField label="Sales Rep">
          <Combobox
            className="w-full"
            value={draft.salesRep}
            onValueChange={(v) => set("salesRep", v)}
            options={SALES_REPS}
            placeholder="Select sales rep"
          />
        </SheetField>

        <SheetField
          label="Status"
        >
          <Combobox
            className="w-full"
            value={draft.status}
            onValueChange={(v) => set("status", v as AssetOrderStatus)}
            options={ASSET_ORDER_STATUSES}
            placeholder="Select status"
          />
        </SheetField>
      </SheetSection>

      <SheetSection title="Asset">
        <SheetField label="Asset Type">
          <Combobox
            className="w-full"
            value={draft.assetType}
            onValueChange={(v) => set("assetType", v)}
            options={ASSET_TYPES}
            placeholder="Select asset type"
          />
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

      <SheetSection title="Schedule">
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

      <SheetSection title="Reference">
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

      {order && <ActivitySection entries={order.audit} />}
    </RecordSheet>
  );
}
