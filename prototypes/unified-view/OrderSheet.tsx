import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarDays, Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePanel, DatePopover } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Switch } from "@/components/ui/switch";
import { StatusChip } from "@/components/ui/status-chip";
import { Textarea } from "@/components/ui/textarea";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { CELL, DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import { HangingAdd } from "./HangingAdd";
import { ProductTable } from "./ProductTable";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { PendingStrip, type PendingItem } from "./PendingStrip";
import { formatFullDate, startOfDay } from "./data";
import type { FuelOrder, FuelOrderStatus, OrderTypeCode } from "./types";
import { ActivityCard, RailRow, SummaryCard, SheetRail } from "./SheetCards";
import { PocCard, PocUnit } from "./PocDetails";
import { SheetSection } from "@/components/side-sheet/parts";
import { kindTone } from "./statusKind";
import {
  ConfiguredForm,
  extraFilled,
  isNative,
  missingRequired,
  sectionId,
  type BuiltInField,
  type ExtraValues,
} from "./ConfiguredForm";
import {
  UNIT_SHORT,
  driverStage,
  getSalesSettings,
  liveStage,
  nextStage,
  notify,
  ownerOnCreate,
  quoteAllows,
  stageBeforeScheduled,
  stageLabel,
  stageNeedsApproval,
  stageTone,
  stageColor,
  useSalesSettings,
  type FormField,
} from "./salesSettings";

/*
  Order side sheet.

  SPACING AND PADDING ARE THE DS'S, taken from side-sheet/SheetNarrow.tsx
  (Figma "Side Sheet" 27610:58293) rather than chosen here:
    • SheetContent      gap-0 p-4-less  (`gap-0 p-0`), width 560 = DS `narrow`
    • header            border-b, p-4, items-start justify-between gap-4
    • body              p-4, flex-col gap-10       ← 40px BETWEEN GROUPS *
    • SheetSection      flex-col gap-5             ← 20px between fields  *
    • SheetField        flex-col gap-1.5           ← 6px label→control
    • two-up rows       grid grid-cols-2 gap-4
    • RadioGroup        gap-3
    • footer            border-t, p-4, items-center justify-end gap-3

  * DELIBERATE OVERRIDE of the DS's gap-7 / gap-3. This sheet carries far more
    fields than the DS reference, and at the DS rhythm the groups stopped
    reading as groups. The ratio is kept at roughly 1:2 so the hierarchy is
    unchanged — only the scale moved. Everything else above is the DS's.

  CREATE, THEN AUTOSAVE — 3PL's order sheet (Pavan, 2026-10-07). Nothing is
  kept until Create Order; from then on every edit is kept 600ms after it
  settles, the header says so, and there is no Cancel or Confirm. The footer
  carries the next stage instead. Product lines live in ProductTable, which
  owns the derived total — the total is never an input, since it must always
  equal the lines above it.
*/

const DRIVERS = ["Shriya", "Shriya Test 2", "Aakash"];


/** Sample option sets — the source app never exposed these lists. */
const TAG_OPTIONS = [
  "Keep Full",
  "Rush",
  "Night",
  "Weekend",
  "Split Load",
  "Hazmat",
  "After Hours",
];

export interface OrderDraft {
  /** The stage before the driver rule — see `stageAfterDriver`. */
  status: FuelOrderStatus;
  typeCode: OrderTypeCode;
  customer: string;
  shipTo: string;
  products: { name: string; gal: number }[];
  plannedDate: Date | null;
  plannedTime: string;
  driver: string | null;
  tags: string[];
  urgent: boolean;
  site: string;
  poc: string;
  note: string;
  /** Fields added in Sales Settings, by key (2026-10-07). */
  extra: ExtraValues;
  /** The stage a move is waiting on approval for. */
  approvalFor?: string;
}

function draftFrom(order: FuelOrder): OrderDraft {
  const [y, m, d] = order.dateKey.split("-").map(Number);
  const delivery = new Date(y, m - 1, d);
  /* THE PLANNED DAY IS ITS OWN (2026-10-07). It was read off the delivery
     date, so once every edit saves, opening an order a bulk edit had moved
     would have quietly moved it back. */
  const planned = order.planned ? new Date(order.planned.date) : null;
  return {
    status: order.status,
    typeCode: order.type.code,
    customer: order.customer.title,
    shipTo: order.customer.description,
    products: order.products.map((p) => ({ ...p })),
    plannedDate: planned
      ? Number.isNaN(planned.getTime())
        ? delivery
        : startOfDay(planned)
      : null,
    plannedTime: order.planned?.time ?? "",
    driver: order.driver?.name ?? null,
    tags: [...order.tags],
    urgent: order.urgent,
    site: order.customer.description,
    poc: order.poc ?? "",
    note: "",
    extra: { ...(order.extra ?? {}) },
    approvalFor: order.approvalFor,
  };
}

/**
 * A blank order. `Create Order` opens the SAME sheet as editing — same sections,
 * same order, same spacing — with nothing filled in, so there is one layout to
 * learn instead of a separate create form that drifts from the edit one.
 *
 * `products: []` is deliberate: the section carries a hanging "Add" tab, so the
 * operator adds the first line rather than being handed a placeholder line to
 * correct. `urgent: false` is the only non-empty value, because a switch has no
 * empty state.
 */
function emptyDraft(): OrderDraft {
  return {
    status: "Requested",
    typeCode: "D",
    customer: "",
    shipTo: "",
    products: [],
    plannedDate: null,
    plannedTime: "",
    driver: null,
    tags: [],
    urgent: false,
    site: "",
    poc: "",
    note: "",
    /* AUTO-ASSIGN OWNER — the signed-in user in a Sales rep field, where the
       form has one (Sales Settings › Preferences, 2026-10-07). */
    extra: ownerOnCreate("fuel") ? { salesRep: ownerOnCreate("fuel") } : {},
  };
}

/** The notification a move into this stage raises. */
const EVENT_OF: Record<string, string> = {
  Dispatched: "dispatched",
  Delivered: "delivered",
  Canceled: "canceled",
};
/** Would that notification show? Then it is the move's toast, not a second one. */
const notifies = (stage: string) =>
  Boolean(getSalesSettings().notifications.find((n) => n.key === EVENT_OF[stage])?.inApp);

export interface OrderSheetProps {
  /** The order being edited. `null` in create mode. */
  order: FuelOrder | null;
  /** `create` opens the sheet blank; `edit` seeds it from `order`. */
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: FuelOrder, draft: OrderDraft) => void;
  /** Create Order. The caller makes the row and points the sheet at it. */
  onCreate?: (draft: OrderDraft) => void;
  /** Option lists derived from the dataset, so pickers can't drift from rows. */
  customers: string[];
  shipTos: string[];
  productNames: string[];
}

export function OrderSheet({
  order,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
  customers,
  shipTos,
  productNames,
}: OrderSheetProps) {
  const [draft, setDraft] = React.useState<OrderDraft | null>(null);
  /* The product line just added — its first cell takes the cursor. */
  const [focusProduct, setFocusProduct] = React.useState<number | undefined>();
  const creating = mode === "create";
  /* SALES SETTINGS LAY THE SHEET OUT (Pavan, 2026-10-07 — "fix it all", C):
     which fields, in what order and sections, under what labels, which are
     required. A hidden field keeps its value; it is only not asked. */
  const settings = useSalesSettings();
  const formFields = settings.forms.fuel;
  /* WHAT THE NEXT ACT IS WAITING ON — raised by pressing it (the quote
     sheet's PendingStrip rule: a dead primary says why on press). */
  const [pendingShown, setPendingShown] = React.useState(false);
  const [quoteBlocked, setQuoteBlocked] = React.useState(false);

  /* BUILT ONCE PER RECORD, NOT ONCE PER SAVE — 3PL's `builtFor`. Every
     autosave hands back a new row; rebuilding from it would move the caret
     and lose what was typed since. The create handover (the key going from
     "create" to the new id) keeps the draft in hand, because it IS that
     order. */
  const builtFor = React.useRef<string | null>(null);
  /* WHAT WAS LAST HANDED OVER, so the row coming back does not start the
     next save. */
  const lastSaved = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) {
      builtFor.current = null;
      return;
    }
    const key = creating ? "create" : (order?.id ?? null);
    if (builtFor.current === key) return;
    const handover = builtFor.current === "create" && key !== null;
    builtFor.current = key;
    setPendingShown(false);
    setQuoteBlocked(false);
    if (handover) return;
    const built = creating ? emptyDraft() : order ? draftFrom(order) : null;
    /* Opening a record is not a change to it. */
    lastSaved.current = built ? JSON.stringify(built) : null;
    setDraft(built);
  }, [open, creating, order]);

  /* AUTOSAVE, DEBOUNCED — the unit of a save is a pause in the work, not a
     keystroke, so the change log gets a line per pause rather than per key.
     Nothing is kept before Create Order (3PL, 2026-10-06). */
  React.useEffect(() => {
    if (!open || !draft || creating || !order) return;
    const shape = JSON.stringify(draft);
    if (lastSaved.current === shape) return;
    const t = window.setTimeout(() => {
      lastSaved.current = shape;
      onSave(order, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, open, creating, order, onSave]);

  const saveState = useDraftSaveState(draft, open);

  /* CLOSING AN UNCREATED ORDER ASKS FIRST — it is about to be thrown away. */
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const requestClose = (o: boolean) => {
    if (
      !o &&
      creating &&
      draft &&
      JSON.stringify(draft) !== JSON.stringify(emptyDraft())
    ) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(o);
  };

  if (!draft || (!creating && !order)) return null;

  const set = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const unusedProduct = productNames.find(
    (o) => !draft.products.some((l) => l.name === o)
  );

  const fromQuote = order?.fromQuote;
  // The stage the driver pick leaves — see `driverStage`.
  const status: FuelOrderStatus = driverStage(
    { status: liveStage(draft.status, settings), fromQuote },
    Boolean(draft.driver),
    settings
  );

  /* THE FOOTER'S PRIMARY IS THE NEXT STAGE, in the order Sales Settings
     keeps (Pavan, 2026-10-07). The stage right before Scheduled moves on by
     picking a driver; Delivered and Canceled are done. */
  const target = creating ? null : nextStage(status, settings);
  const toScheduled = target === "Scheduled";
  const needsDriver = toScheduled && !draft.driver;
  const quoteOk = quoteAllows({ fromQuote }, settings);
  const approval = target ? stageNeedsApproval(target, settings) : false;
  /* A MOVE ASKED FOR — to the next stage, or to Canceled. */
  const awaiting = draft.approvalFor;

  const advance = (next: FuelOrderStatus) => {
    if (!notifies(next)) toast.success(`${order?.orderNo ?? "Order"} → ${stageLabel(next, settings)}`);
    setDraft((d) => (d ? { ...d, status: next, approvalFor: undefined } : d));
  };

  /* A STAGE THAT REQUIRES APPROVAL IS TWO PRESSES (Pavan, 2026-10-07): the
     move is asked for, the order says so, and the same button then approves
     it and moves it. No approver, roles or queue exist in the prototype —
     the second press stands for the approver's. */
  const requestApproval = (next: string) => {
    set("approvalFor", next);
    const said = `${order?.orderNo ?? "Order"} · approval requested to move to ${stageLabel(next, settings)}`;
    /* The Approval requested notification when its row is routed in-app;
       otherwise the plain confirmation. */
    if (settings.notifications.find((n) => n.key === "approval")?.inApp) notify("approval", said);
    else toast.success(said);
  };

  /* CANCEL ORDER — 3PL's: behind the ··· and a confirm (Pavan, 2026-10-07).
     Not on an order already Delivered or Canceled. It goes through the same
     autosave as "Move to …", so the change log records it. */
  const cancellable = !creating && status !== "Delivered" && status !== "Canceled";
  const cancelOrder = () => {
    /* CANCELLED CAN ASK FOR APPROVAL TOO (Sales Settings › Workflow). */
    if (stageNeedsApproval("Canceled", settings)) {
      requestApproval("Canceled");
      return;
    }
    if (!notifies("Canceled")) toast.success(`${order?.orderNo ?? "Order"} canceled`);
    setDraft((d) => (d ? { ...d, status: "Canceled", approvalFor: undefined } : d));
  };

  /* ---- what each field is filled by ---------------------------------- */

  const filled = (f: FormField): boolean => {
    if (!isNative(f, renderers)) return extraFilled(draft.extra[f.key]);
    switch (f.key) {
      case "customer":
        return Boolean(draft.customer);
      case "shipTo":
        return Boolean(draft.shipTo);
      case "driver":
        return Boolean(draft.driver);
      case "planDate":
        return Boolean(draft.plannedDate);
      case "planTime":
        return Boolean(draft.plannedTime.trim());
      case "product":
        return draft.products.length > 0 && draft.products.every((l) => l.name);
      case "quantity":
        return draft.products.length > 0 && draft.products.every((l) => l.gal > 0);
      case "tags":
        return draft.tags.length > 0;
      case "site":
        return Boolean(draft.site);
      case "note":
        return Boolean(draft.note.trim());
      default:
        return true;
    }
  };

  const label = (key: string, fallback: string) =>
    formFields.find((f) => f.key === key)?.label.trim() || fallback;
  const unit = UNIT_SHORT[settings.unit];

  /* ---- the sheet's own fields, as Sales Settings place them ---------- */

  const renderers: Record<string, (f: FormField) => BuiltInField> = {
    orderType: () => ({
      /* 12px from the label to the options; the two sit 24px apart. */
      className: "gap-3",
      control: (
        <RadioGroup
          value={draft.typeCode}
          onValueChange={(v) => set("typeCode", v as OrderTypeCode)}
          className="flex gap-6"
        >
          {(
            [
              ["D", "Delivery"],
              ["E", "Extraction"],
            ] as const
          ).map(([code, text]) => (
            <div key={code} className="flex items-center gap-2">
              <RadioGroupItem value={code} id={`type-${code}`} />
              <Label htmlFor={`type-${code}`} className="font-normal">
                {text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      ),
    }),
    customer: () => ({
      half: true,
      control: (
        <Combobox
          className="w-full"
          value={draft.customer}
          onValueChange={(v) => set("customer", v)}
          options={customers}
          placeholder="Select customer"
          searchPlaceholder="Search customers…"
          emptyText="No customer found."
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
    driver: (f) => ({
      control: (
        <Combobox
          className="w-full"
          value={draft.driver ?? (f.required ? "" : "none")}
          placeholder="Select driver"
          onValueChange={(v) => {
            const driver = v === "none" ? null : v;
            /* THE PICK THAT WOULD SCHEDULE, AND MAY NOT, SAYS WHY (Pavan,
               2026-10-07): the driver is kept, the order stays where it is,
               and the strip names the accepted quote it is waiting on. */
            if (driver && status === stageBeforeScheduled(settings) && !quoteOk) {
              setQuoteBlocked(true);
              setPendingShown(true);
            }
            set("driver", driver);
          }}
          /* "Unassigned" is a real choice, not the absence of one. A
             REQUIRED FIELD GETS NO EMPTY CHOICE (ux §Forms). */
          options={[
            ...(f.required ? [] : [{ value: "none", label: "— Unassigned" }]),
            ...DRIVERS,
          ]}
          searchPlaceholder="Search drivers…"
          emptyText="No driver found."
        />
      ),
    }),
    planDate: () => ({
      half: true,
      control: (
        <DatePopover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              <CalendarDays />
              {draft.plannedDate ? formatFullDate(draft.plannedDate) : "Not planned"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <DatePanel
              selected={draft.plannedDate ?? undefined}
              onSelect={(d) => d && set("plannedDate", d)}
            />
          </PopoverContent>
        </DatePopover>
      ),
    }),
    planTime: () => ({
      half: true,
      control: (
        <div className="relative">
          <Input
            value={draft.plannedTime}
            placeholder="e.g. 1:35 AM"
            onChange={(e) => set("plannedTime", e.target.value)}
            className="pr-9"
          />
          <Clock className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      ),
    }),
    urgent: () => ({
      bare: (text) => (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{text}</span>
          <Switch
            checked={draft.urgent}
            onCheckedChange={(v) => set("urgent", v)}
            aria-label={text}
          />
        </div>
      ),
    }),
    product: () => productTable,
    quantity: () => productTable,
    tags: () => ({
      control: (
        <TokenMultiSelect
          options={TAG_OPTIONS}
          value={draft.tags}
          onChange={(next) => set("tags", next)}
          addLabel="Add tags"
          searchPlaceholder="Search tags..."
        />
      ),
    }),
    site: () => ({
      control: (
        <Combobox
          className="w-full"
          value={draft.site}
          onValueChange={(v) => set("site", v)}
          options={shipTos}
          placeholder="Select site"
        />
      ),
    }),
    note: () => ({
      control: (
        <Textarea
          value={draft.note}
          placeholder="Gate codes, access notes, anything the driver needs…"
          onChange={(e) => set("note", e.target.value)}
          className="min-h-24"
        />
      ),
    }),
  };

  /* THE PRODUCT TABLE IS TWO ROWS OF THE FORM — its two columns — and is
     drawn where the first of them sits. The add hangs off the card (ui
     §10f); with nothing left to add it is not rendered. */
  const productTable: BuiltInField = {
    table: {
      hanging:
        unusedProduct !== undefined ? (
          <HangingAdd
            label="Add product"
            onClick={() => {
              setFocusProduct(draft.products.length);
              set("products", [...draft.products, { name: unusedProduct, gal: 0 }]);
            }}
          />
        ) : undefined,
      node: (
        <ProductTable
          lines={draft.products}
          options={productNames}
          focusRow={focusProduct}
          onChange={(next) => set("products", next)}
          productLabel={label("product", "Product")}
          qtyLabel={`${label("quantity", "Quantity")} (${unit.charAt(0).toUpperCase()}${unit.slice(1)})`}
        />
      ),
    },
  };

  /* ---- the next act ---------------------------------------------------- */

  const pending: PendingItem[] = creating
    ? missingRequired("fuel", formFields, filled)
    : quoteBlocked && toScheduled && !quoteOk
      ? [
          {
            key: "quote",
            label: `${stageLabel("Scheduled", settings)} needs an accepted quote`,
            target: sectionId("fuel", formFields.find((f) => f.key === "driver")?.section ?? ""),
          },
        ]
      : [];

  const commit = () => {
    if (pending.length > 0) {
      setPendingShown(true);
      return;
    }
    onCreate?.(draft);
    toast.success("Order created");
  };

  let footerPrimary: React.ReactNode = null;
  if (creating) footerPrimary = <Button onClick={commit}>Create order</Button>;
  else if (awaiting && awaiting !== status) {
    /* THE SECOND PRESS — it stands for the approver's. */
    footerPrimary = (
      <Button onClick={() => advance(awaiting)}>
        Approve &amp; move to {stageLabel(awaiting, settings)}
      </Button>
    );
  } else if (target && !needsDriver) {
    const name = stageLabel(target, settings);
    footerPrimary =
      toScheduled && !quoteOk ? (
        /* PRESSABLE, AND PRESSING SAYS WHY — the quote rule. */
        <Button
          onClick={() => {
            setQuoteBlocked(true);
            setPendingShown(true);
          }}
        >
          Move to {name}
        </Button>
      ) : approval ? (
        <Button onClick={() => requestApproval(target)}>Request approval</Button>
      ) : (
        <Button onClick={() => advance(target)}>Move to {name}</Button>
      );
  }

  return (
    <>
      <RecordSheet
        /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15 — like the Delivery
           Order): products = product · qty · bin; the rail once it exists. */
        fit={{ tables: [[CELL.name, CELL.number, CELL.bin]], rail: !creating }}
        open={open}
        onOpenChange={requestClose}
        mode={creating ? "create" : "edit"}
        editTitle={`Order #: ${order?.orderNo ?? ""}`}
        createTitle="Create order"
        createAction="Create order"
        /* AUTOSAVED, so Cancel is a promise the sheet cannot keep. */
        showCancel={false}
        headerAside={
          <span className="flex items-center gap-2">
            <DraftStatusChip
              tone={stageTone(status, settings)}
              color={stageColor(status, settings)}
              label={stageLabel(status, settings)}
              /* Nothing is kept before Create Order, so nothing to report. */
              saveState={creating ? "idle" : saveState}
            />
            {awaiting && (
              <StatusChip tone={kindTone("caution")} variant="soft">
                Needs approval
              </StatusChip>
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
        footerBanner={
          pendingShown && (creating || pending.length > 0) ? (
            <PendingStrip
              tone="caution"
              pending={pending}
              clearLabel="Everything this order needs is filled in"
            />
          ) : undefined
        }
        onSubmit={() => {}}
        footerPrimary={footerPrimary}
      >
        <div className={cn("grid items-start gap-6", !creating && "lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]")}>
          <div className="flex min-w-0 flex-col gap-10">
            <ConfiguredForm
              kind="fuel"
              renderers={renderers}
              together={[["product", "quantity"]]}
              extra={draft.extra}
              onExtraChange={(key, value) => set("extra", { ...draft.extra, [key]: value })}
            />
            {/* POC DETAILS — the shared unit (Pavan, 2026-10-29); a rail card
                once the order exists. */}
            {creating && (
              <SheetSection title="POC details">
                <PocUnit shipTo={draft.shipTo} value={draft.poc} onChange={(v) => set("poc", v)} />
              </SheetSection>
            )}
          </div>

          {/* WHAT THE ORDER HAS BECOME — read-only, sticky; no rail while
              creating (G29 · G30 · G31 · G32, Pavan, 2026-10-07). */}
          {!creating && order && (
            <SheetRail>
              <SummaryCard title="Order summary">
                <dl className="flex flex-col">
                  {draft.products.length === 0 ? (
                    <RailRow variant="line" label={label("product", "Product")} value="—" />
                  ) : (
                    draft.products.map((l, i) => (
                      <RailRow
                        key={`${l.name}-${i}`}
                        variant="line"
                        label={l.name || "—"}
                        value={`${l.gal.toLocaleString("en-US")} ${unit}`}
                      />
                    ))
                  )}
                </dl>
                <div aria-hidden className="border-t border-dashed border-border" />
                <dl className="flex flex-col">
                  {fromQuote && <RailRow variant="line" label="Quote" value={fromQuote} />}
                  <RailRow
                    variant="total"
                    label={`Total ${label("quantity", "Quantity").toLowerCase()}`}
                    value={`${draft.products.reduce((n, l) => n + l.gal, 0).toLocaleString("en-US")} ${unit}`}
                  />
                </dl>
              </SummaryCard>
              <PocCard shipTo={draft.shipTo} value={draft.poc} onChange={(v) => set("poc", v)} />
              <ActivityCard entries={order.audit} timeZone={settings.timeZone} />
            </SheetRail>
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
            <AlertDialogAction
              variant="destructive"
              onClick={() => onOpenChange(false)}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
