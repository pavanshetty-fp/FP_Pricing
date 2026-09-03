import * as React from "react";
import { CalendarDays, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { ProductTable } from "./ProductTable";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { formatFullDate } from "./data";
import type { FuelOrder, FuelOrderStatus, OrderTypeCode } from "./types";

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

  Edits are held in draft state so Cancel discards them; Save lifts the draft to
  the caller. Product lines live in ProductTable, which owns the derived total —
  the total is never an input, since it must always equal the lines above it.
*/

const DRIVERS = ["Shriya", "Shriya Test 2", "Aakash"];

const STATUS_TONE: Record<FuelOrderStatus, StatusTone> = {
  Assigned: "success",
  Unassigned: "processing",
};

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
  return {
    typeCode: order.type.code,
    customer: order.customer.title,
    shipTo: order.customer.description,
    products: order.products.map((p) => ({ ...p })),
    plannedDate: order.planned ? delivery : null,
    plannedTime: order.planned?.time ?? "",
    driver: order.driver?.name ?? null,
    tags: [...order.tags],
    urgent: false,
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
 * `products: []` is deliberate: ProductTable carries its own "Add" chip, so the
 * operator adds the first line rather than being handed a placeholder line to
 * correct. `urgent: false` is the only non-empty value, because a switch has no
 * empty state.
 */
function emptyDraft(): OrderDraft {
  return {
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
  /** Called instead of `onSave` in create mode — there is no order to fold into. */
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
  const creating = mode === "create";

  // Re-seed on every open, so edits never leak between rows — and so a
  // half-filled create draft is gone the next time Create Order is clicked.
  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
  }, [open, creating, order]);

  if (!draft || (!creating && !order)) return null;

  const set = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  // Derived, never stored: a driver means Assigned.
  const status: FuelOrderStatus = draft.driver ? "Assigned" : "Unassigned";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[560px] gap-0 p-0 sm:max-w-[560px]"
      >
        {/* Header — the order number when editing, "Create Order" when there is
            no order yet. The status chip rides along in both: it is DERIVED (an
            order is Assigned exactly when it has a driver, so a separate control
            would only be a way for the two to disagree), which means on a blank
            draft it correctly reads Unassigned and flips the moment a driver is
            picked. */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="text-base">
              {creating ? "Create Order" : `Order #: ${order!.orderNo}`}
            </SheetTitle>
            <StatusChip tone={STATUS_TONE[status]} variant="soft">
              {status}
            </StatusChip>
          </div>
          <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        {/* Body — gap-7 between groups, per the DS sheet. */}
        <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-auto p-4">
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
              description="Clearing the driver leaves the order unassigned."
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

          <SheetSection title="Product Details">
            <ProductTable
              lines={draft.products}
              options={productNames}
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
        </div>

        {/* Footer — DS sheet footer: border-t, p-4, right-aligned, gap-3. */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (creating) onCreate?.(draft);
              else onSave(order!, draft);
              onOpenChange(false);
            }}
          >
            {creating ? "Create Order" : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
