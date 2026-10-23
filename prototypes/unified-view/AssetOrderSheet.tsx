import * as React from "react";
import { Ban, CalendarDays, MoreHorizontal } from "lucide-react";
import { DatePanel, DatePopover } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { StatusChip } from "@/components/ui/status-chip";
import { CELL, DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import { PendingStrip } from "./PendingStrip";
import { formatFullDate } from "./data";
import {
  ASSET_TYPES,
  SALES_REPS,
  type AssetOrder,
  type AssetOrderStatus,
} from "./assetOrders";
import { ActivityCard, RailRow, SummaryCard } from "./SheetCards";
import { kindTone } from "./statusKind";
import {
  ConfiguredForm,
  extraFilled,
  isNative,
  missingRequired,
  type BuiltInField,
  type ExtraValues,
} from "./ConfiguredForm";
import {
  getSalesSettings,
  notify,
  ownerOnCreate,
  stageLabel,
  stageNeedsApproval,
  stageTone,
  stageColor,
  useSalesCurrentUser,
  useSalesSettings,
  type FormField,
} from "./salesSettings";

/**
 * Asset Order side sheet — the Fuel Orders order sheet's shape, with this
 * record's fields. Sections, spacing and the create/edit split all come from
 * `RecordSheet`, so the two sheets differ only in their bodies.
 *
 * ONE DIFFERENCE FROM THE ORDER SHEET, and it is a real one: status is an
 * EDITABLE FIELD here, not derived. A fuel order's status is a function of its
 * driver, so offering a control would only let the two disagree. An asset order
 * has no such dependency — nothing else on the record implies whether it is
 * Requested, Scheduled, Dispatched, Delivered or Canceled — so it needs an
 * explicit control.
 */
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
  /** Fields added in Sales Settings, by key (2026-10-07). */
  extra: ExtraValues;
  /** The stage a move is waiting on approval for. */
  approvalFor?: string;
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
    extra: { ...(o.extra ?? {}) },
    approvalFor: o.approvalFor,
  };
}

/** A blank asset order. `quantity: 0` because a number field has no empty state. */
function emptyDraft(): AssetOrderDraft {
  return {
    customer: "",
    erpId: "",
    shipTo: "",
    assetType: "",
    quantity: 0,
    serialNo: "",
    deliveryDate: null,
    status: "Requested",
    /* AUTO-ASSIGN OWNER — the signed-in user as Sales Rep (Sales Settings
       › Preferences, 2026-10-07). */
    salesRep: ownerOnCreate("asset"),
    poNumber: "",
    note: "",
    extra: {},
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
  /* SALES SETTINGS LAY THE SHEET OUT (Pavan, 2026-10-07 — "fix it all", C). */
  const settings = useSalesSettings();
  const formFields = settings.forms.asset;
  const me = useSalesCurrentUser();
  const [pendingShown, setPendingShown] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  /* CLOSING AN UNCREATED ORDER ASKS FIRST (G33, Pavan, 2026-10-07) — the
     fuel sheet's confirm; nothing is kept before Create Asset Order. */
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const saveState = useDraftSaveState(draft, open);
  /* WHAT WENT OUT LAST. The row comes back changed by our own save, so
     without this the sheet would answer its own write with a rebuild. */
  const lastSaved = React.useRef<string | null>(null);

  /* Re-seed on every open, so a half-filled create draft never comes back and
     edits never leak between rows — keyed on the ORDER'S ID rather than the
     row, because the row is handed back changed by every autosave. */
  const orderId = order?.id ?? null;
  /* CREATE, THEN AUTOSAVE — the fuel sheet's handover (Pavan, 2026-10-07).
     Create Asset Order points this sheet at the new row; the draft in hand
     IS that order, so it is kept rather than rebuilt. */
  const builtFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) {
      builtFor.current = null;
      return;
    }
    const key = creating ? "create" : orderId;
    const handover = builtFor.current === "create" && key !== null && key !== "create";
    builtFor.current = key;
    setPendingShown(false);
    if (handover) return;
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

  /* CANCEL ORDER — 3PL's: behind the ··· and a confirm (Pavan, 2026-10-07).
     Not on an order already Delivered or Canceled. It goes through the
     sheet's autosave, so the change log records it. */
  const cancellable =
    !creating && draft.status !== "Delivered" && draft.status !== "Canceled";
  const cancelOrder = () => {
    const quiet = getSalesSettings().notifications.find((n) => n.key === "canceled")?.inApp;
    if (!quiet) toast.success(`${order?.orderNo ?? "Order"} canceled`);
    setDraft((d) => (d ? { ...d, status: "Canceled", approvalFor: undefined } : d));
  };

  /* A STAGE THAT REQUIRES APPROVAL (Pavan, 2026-10-07). On an asset order
     the status is a field, so picking such a stage asks for the move rather
     than making it; the footer then approves it. On a new order there is no
     one to ask yet — it is created where it was set. */
  const pickStatus = (v: string) => {
    if (!creating && v !== draft.status && stageNeedsApproval(v, settings)) {
      set("approvalFor", v);
      const said = `${order?.orderNo ?? "Order"} · approval requested to move to ${stageLabel(v, settings)}`;
      if (settings.notifications.find((n) => n.key === "approval")?.inApp) notify("approval", said);
      else toast.success(said);
      return;
    }
    setDraft((d) => (d ? { ...d, status: v as AssetOrderStatus, approvalFor: undefined } : d));
  };

  const filled = (f: FormField): boolean => {
    if (!isNative(f, renderers)) return extraFilled(draft.extra[f.key]);
    switch (f.key) {
      case "customer":
        return Boolean(draft.customer);
      case "shipTo":
        return Boolean(draft.shipTo);
      case "salesRep":
        return Boolean(draft.salesRep);
      case "assetType":
        return Boolean(draft.assetType);
      case "quantity":
        return draft.quantity > 0;
      case "serialNo":
        return Boolean(draft.serialNo.trim());
      case "deliveryDate":
        return Boolean(draft.deliveryDate);
      case "poNumber":
        return Boolean(draft.poNumber.trim());
      case "note":
        return Boolean(draft.note.trim());
      default:
        return true;
    }
  };

  const reps = me && !SALES_REPS.includes(me) ? [me, ...SALES_REPS] : SALES_REPS;

  const renderers: Record<string, (f: FormField) => BuiltInField> = {
    customer: () => ({
      half: true,
      control: (
        <Combobox
          className="w-full"
          value={draft.customer}
          onValueChange={(v) => set("customer", v)}
          options={customers}
          placeholder="Select customer"
        />
      ),
    }),
    shipTo: () => ({
      half: true,
      control: (
        <Combobox
          className="w-full"
          value={draft.shipTo}
          onValueChange={(v) => set("shipTo", v)}
          options={shipTos}
          placeholder="Select ship-to"
        />
      ),
    }),
    salesRep: (f) => ({
      control: (
        <Combobox
          className="w-full"
          value={draft.salesRep}
          onValueChange={(v) => set("salesRep", v)}
          options={reps}
          placeholder="Select sales rep"
          clearLabel={f.required ? undefined : "No sales rep"}
        />
      ),
    }),
    status: () => ({
      control: (
        <Combobox
          className="w-full"
          value={draft.status}
          onValueChange={pickStatus}
          /* THE STAGES SALES SETTINGS KEEP, under their names. */
          options={settings.stages.map((r) => ({ value: r.id, label: stageLabel(r.id, settings) }))}
          placeholder="Select status"
        />
      ),
    }),
    assetType: () => ({
      control: (
        <Combobox
          className="w-full"
          value={draft.assetType}
          onValueChange={(v) => set("assetType", v)}
          options={ASSET_TYPES}
          placeholder="Select asset type"
        />
      ),
    }),
    quantity: () => ({
      half: true,
      control: (
        <Input
          inputMode="numeric"
          value={draft.quantity ? String(draft.quantity) : ""}
          placeholder="0"
          onChange={(e) => set("quantity", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
        />
      ),
    }),
    serialNo: () => ({
      half: true,
      control: (
        <Input
          value={draft.serialNo}
          placeholder="e.g. TK-1000-4471"
          onChange={(e) => set("serialNo", e.target.value)}
        />
      ),
    }),
    deliveryDate: () => ({
      control: (
        <DatePopover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarDays />
              {draft.deliveryDate ? formatFullDate(draft.deliveryDate) : "Not scheduled"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <DatePanel
              selected={draft.deliveryDate ?? undefined}
              onSelect={(d) => set("deliveryDate", d ?? null)}
            />
          </PopoverContent>
        </DatePopover>
      ),
    }),
    poNumber: () => ({
      control: (
        <Input
          value={draft.poNumber}
          placeholder="e.g. PO-88213"
          onChange={(e) => set("poNumber", e.target.value)}
        />
      ),
    }),
    note: () => ({
      control: (
        <Textarea
          value={draft.note}
          placeholder="Access notes, delivery instructions…"
          onChange={(e) => set("note", e.target.value)}
          className="min-h-24"
        />
      ),
    }),
  };

  const pending = creating ? missingRequired("asset", formFields, filled) : [];
  const label = (key: string, fallback: string) =>
    formFields.find((f) => f.key === key)?.label.trim() || fallback;
  const requestClose = (o: boolean) => {
    if (!o && creating && JSON.stringify(draft) !== JSON.stringify(emptyDraft())) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(o);
  };
  const awaiting = draft.approvalFor;

  return (
    <>
    <RecordSheet
      /* THE RAIL ONCE IT EXISTS (Pavan, 2026-10-07) — 3PL's BrokerOrderSheet:
         two columns fill the screen; while creating there is no rail. */
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): no table. Creating = fields
         only, so the form's 600. Once it exists the 340 rail sits beside the
         fields; the fields keep the form's two-across grid (two text widths)
         rather than being squeezed to fit 600. */
      {...(creating ? { size: "form" as const } : { fit: { tables: [[CELL.text, CELL.text]], rail: true } })}
      open={open}
      onOpenChange={requestClose}
      mode={mode}
      editTitle={`Order #: ${order?.orderNo ?? ""}`}
      createTitle="Create Asset Order"
      createAction="Create Asset Order"
      /* IT AUTOSAVES, SO THERE IS NOTHING TO CANCEL AND NOTHING TO SAVE.
         Creating still takes an act. */
      showCancel={false}
      /* CREATE KEEPS THE SHEET OPEN on the new order (Pavan, 2026-10-07).
         A DEAD PRIMARY SAYS WHY ON PRESS — the pending strip. */
      footerPrimary={
        creating ? (
          <Button
            onClick={() => {
              if (pending.length > 0) {
                setPendingShown(true);
                return;
              }
              onCreate?.(draft);
              toast.success("Order created");
            }}
          >
            Create Asset Order
          </Button>
        ) : awaiting ? (
          <Button
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, status: awaiting as AssetOrderStatus, approvalFor: undefined } : d
              )
            }
          >
            Approve &amp; move to {stageLabel(awaiting, settings)}
          </Button>
        ) : null
      }
      footerBanner={
        creating && pendingShown ? (
          <PendingStrip
            tone="caution"
            pending={pending}
            clearLabel="Everything this order needs is filled in"
          />
        ) : undefined
      }
      headerAside={
        <span className="flex items-center gap-2">
          <StatusChip
            tone={stageTone(draft.status, settings)}
            color={stageColor(draft.status, settings)}
            variant="soft"
          >
            {stageLabel(draft.status, settings)}
          </StatusChip>
          {awaiting && (
            <StatusChip tone={kindTone("caution")} variant="soft">
              Needs approval
            </StatusChip>
          )}
          {saveState !== "idle" && (
            <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
          )}
        </span>
      }
      headerMenu={
        cancellable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More order actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmCancel(true);
                }}
              >
                <Ban />
                Cancel order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      onSubmit={() => {}}
    >
      <div className={cn("grid items-start gap-6", !creating && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="flex min-w-0 flex-col gap-10">
          <ConfiguredForm
            kind="asset"
            renderers={renderers}
            extra={draft.extra}
            onExtraChange={(key, value) => set("extra", { ...draft.extra, [key]: value })}
          />
        </div>

        {/* WHAT THE ORDER HAS BECOME — read-only, sticky; no rail while
            creating (G29 · G30 · G31 · G32, Pavan, 2026-10-07). */}
        {!creating && order && (
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            <SummaryCard title="Order summary">
              <dl className="flex flex-col">
                <RailRow variant="line" label={label("assetType", "Asset type")} value={draft.assetType || "—"} />
                <RailRow variant="line" label={label("serialNo", "Serial no.")} value={draft.serialNo.trim() || "—"} />
                <RailRow
                  variant="line"
                  label={label("deliveryDate", "Delivery date")}
                  value={draft.deliveryDate ? formatFullDate(draft.deliveryDate) : "—"}
                />
              </dl>
              <div aria-hidden className="border-t border-dashed border-border" />
              <dl className="flex flex-col">
                <RailRow
                  variant="total"
                  label={`Total ${label("quantity", "Quantity").toLowerCase()}`}
                  value={draft.quantity.toLocaleString("en-US")}
                />
              </dl>
            </SummaryCard>
            <ActivityCard entries={order.audit} timeZone={settings.timeZone} />
          </aside>
        )}
      </div>
    </RecordSheet>

    <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {order?.orderNo}?</AlertDialogTitle>
          <AlertDialogDescription>
            It moves to Canceled, keeping its history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={cancelOrder}>
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this order?</AlertDialogTitle>
          <AlertDialogDescription>
            All the details you've added will be discarded.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => onOpenChange(false)}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
