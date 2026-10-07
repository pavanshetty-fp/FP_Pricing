import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarDays, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import { HangingAdd } from "./HangingAdd";
import { ProductTable } from "./ProductTable";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { formatFullDate, startOfDay, stageAfterDriver } from "./data";
import type { FuelOrder, FuelOrderStatus, OrderTypeCode } from "./types";
import { STATUS_TONE } from "./FuelOrdersTable";
import { ActivitySection } from "./activity";

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
const POC_OPTIONS = ["Site manager", "Dispatch desk", "Night supervisor"];

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
    poc: "",
    note: "",
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
  };
}

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

  // The stage the driver pick leaves — see `stageAfterDriver`.
  const status: FuelOrderStatus = stageAfterDriver(draft.status, Boolean(draft.driver));

  /* THE FOOTER'S PRIMARY IS THE NEXT STAGE. Requested moves on by picking a
     driver, and Delivered and Cancelled are done — none of the three has a
     press. */
  const nextStage: FuelOrderStatus | null =
    status === "Scheduled" ? "Dispatched" : status === "Dispatched" ? "Delivered" : null;
  const advance = (next: FuelOrderStatus) => {
    toast.success(`${order?.orderNo ?? "Order"} → ${next}`);
    set("status", next);
  };

  /* CANCEL ORDER — 3PL's: behind the ··· and a confirm (Pavan, 2026-10-07).
     Not on an order already Delivered or Cancelled. It goes through the same
     autosave as "Move to …", so the change log records it. */
  const cancellable = !creating && status !== "Delivered" && status !== "Cancelled";
  const cancelOrder = () => {
    toast.success(`${order?.orderNo ?? "Order"} cancelled`);
    set("status", "Cancelled");
  };

  return (
    <>
      <RecordSheet
        open={open}
        onOpenChange={requestClose}
        mode={creating ? "create" : "edit"}
        editTitle={`Order #: ${order?.orderNo ?? ""}`}
        createTitle="Create Order"
        createAction="Create Order"
        /* AUTOSAVED, so Cancel is a promise the sheet cannot keep. */
        showCancel={false}
        headerAside={
          <DraftStatusChip
            tone={STATUS_TONE[status]}
            label={status}
            /* Nothing is kept before Create Order, so nothing to report. */
            saveState={creating ? "idle" : saveState}
          />
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
        footerPrimary={
          creating ? (
            <Button
              onClick={() => {
                onCreate?.(draft);
                toast.success("Order created");
              }}
            >
              Create Order
            </Button>
          ) : nextStage ? (
            <Button onClick={() => advance(nextStage)}>Move to {nextStage}</Button>
          ) : null
        }
      >
        <SheetSection title="Order Details">
          {/* 12px from the label to the options (the DS field default is 6px),
              and the two options sit 24px apart instead of being stretched to
              half-width each by a 2-col grid. `mb-2` keeps the extra air below
              the borderless row before the bordered selects. */}
          <SheetField label="Order Type" className="gap-3">
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
              ).map(([code, label]) => (
                <div key={code} className="flex items-center gap-2">
                  <RadioGroupItem value={code} id={`type-${code}`} />
                  <Label htmlFor={`type-${code}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </SheetField>

          {/* Customer and Ship-To sit side by side. */}
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Customer">
              {/* Placeholders matter only in create mode — on an existing
                  order these always carry a value. Without them the two
                  triggers render completely blank while every other control
                  shows an empty state ("Not planned", "— Unassigned", "Add
                  tags"), so they read as broken. */}
              <Combobox
                className="w-full"
                value={draft.customer}
                onValueChange={(v) => set("customer", v)}
                options={customers}
                placeholder="Select customer"
                searchPlaceholder="Search customers…"
                emptyText="No customer found."
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

          <SheetField
            label="Driver Selection"
          >
            <Combobox
              className="w-full"
              value={draft.driver ?? "none"}
              onValueChange={(v) => set("driver", v === "none" ? null : v)}
              /* "Unassigned" is a real choice, not the absence of one, so it
                 is an option in the list rather than an empty field. */
              options={[
                { value: "none", label: "— Unassigned" },
                ...DRIVERS,
              ]}
              searchPlaceholder="Search drivers…"
              emptyText="No driver found."
            />
          </SheetField>

        </SheetSection>

        <SheetSection title="Schedule">
          {/* Plan Date and Plan Time side by side. */}
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Plan Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
                    <CalendarDays />
                    {draft.plannedDate
                      ? formatFullDate(draft.plannedDate)
                      : "Not planned"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={draft.plannedDate ?? undefined}
                    onSelect={(d) => d && set("plannedDate", d)}
                    defaultMonth={draft.plannedDate ?? undefined}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </SheetField>

            <SheetField label="Plan Time">
              <div className="relative">
                <Input
                  value={draft.plannedTime}
                  placeholder="e.g. 1:35 AM"
                  onChange={(e) => set("plannedTime", e.target.value)}
                  className="pr-9"
                />
                <Clock className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </SheetField>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Mark as Urgent</span>
            <Switch
              checked={draft.urgent}
              onCheckedChange={(v) => set("urgent", v)}
              aria-label="Mark as Urgent"
            />
          </div>
        </SheetSection>

        <SheetSection
          title="Product Details"
          flush
          /* THE ADD HANGS OFF THE CARD, not on a band inside it — DS ui
             §10f. It lives here rather than in `ProductTable` because the
             tab is outside the card and the table is inside it. */
          hanging={
            /* AN ADD WITH NOTHING LEFT TO ADD IS NOT RENDERED (§10f). It used
               to fall back to the first product, so the last press added a
               duplicate line. */
            unusedProduct !== undefined ? (
              <HangingAdd
                label="Add product"
                onClick={() => {
                  setFocusProduct(draft.products.length);
                  set("products", [...draft.products, { name: unusedProduct, gal: 0 }]);
                }}
              />
            ) : undefined
          }
        >
          <ProductTable
            lines={draft.products}
            options={productNames}
            focusRow={focusProduct}
            onChange={(next) => set("products", next)}
          />
        </SheetSection>

        <SheetSection title="Tags">
          <TokenMultiSelect
            options={TAG_OPTIONS}
            value={draft.tags}
            onChange={(next) => set("tags", next)}
            addLabel="Add tags"
            searchPlaceholder="Search tags..."
          />
        </SheetSection>

        <SheetSection title="Delivery Details">
          <SheetField label="Site">
            <Combobox
              className="w-full"
              value={draft.site}
              onValueChange={(v) => set("site", v)}
              options={shipTos}
              placeholder="Select site"
            />
          </SheetField>

          <SheetField label="PoC at Delivery">
            <Combobox
              className="w-full"
              value={draft.poc || "none"}
              onValueChange={(v) => set("poc", v === "none" ? "" : v)}
              options={[{ value: "none", label: "Not set" }, ...POC_OPTIONS]}
              placeholder="Select PoC"
              searchPlaceholder="Search contacts…"
              emptyText="No contact found."
            />
          </SheetField>

          <SheetField label="Note">
            <Textarea
              value={draft.note}
              placeholder="Gate codes, access notes, anything the driver needs…"
              onChange={(e) => set("note", e.target.value)}
              className="min-h-24"
            />
          </SheetField>
        </SheetSection>

        {!creating && order && <ActivitySection entries={order.audit} />}
      </RecordSheet>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {order?.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              It moves to Cancelled, keeping its history.
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
