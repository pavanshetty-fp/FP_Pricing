import * as React from "react";
import { CalendarDays, Clock, Plus, Trash2, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { formatFullDate, totalGal } from "./data";
import type { FuelOrder, FuelOrderStatus, OrderTypeCode } from "./types";

/*
  Order side sheet.

  SPACING AND PADDING ARE THE DS'S, taken from side-sheet/SheetNarrow.tsx
  (Figma "Side Sheet" 27610:58293) rather than chosen here:
    • SheetContent      gap-0 p-4-less  (`gap-0 p-0`), width 560 = DS `narrow`
    • header            border-b, p-4, items-start justify-between gap-4
    • body              p-4, flex-col gap-7        ← 28px BETWEEN GROUPS
    • SheetSection      flex-col gap-3             ← 12px between fields
    • SheetField        flex-col gap-1.5           ← 6px label→control
    • two-up rows       grid grid-cols-2 gap-4
    • RadioGroup        gap-3
    • footer            border-t, p-4, items-center justify-end gap-3

  Edits are held in draft state so Cancel discards them; Save lifts the draft to
  the caller. Qty is never an input — it is the sum of the product lines, so it
  is shown derived rather than offered as a field that could contradict them.
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
  typeCode: OrderTypeCode;
  customer: string;
  shipTo: string;
  products: { name: string; gal: number }[];
  plannedDate: Date | null;
  plannedTime: string;
  status: FuelOrderStatus;
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
    status: order.status,
    driver: order.driver?.name ?? null,
    tags: [...order.tags],
    urgent: false,
    site: order.customer.description,
    poc: "",
    note: "",
  };
}

export interface OrderSheetProps {
  order: FuelOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: FuelOrder, draft: OrderDraft) => void;
  /** Option lists derived from the dataset, so pickers can't drift from rows. */
  customers: string[];
  shipTos: string[];
  productNames: string[];
}

export function OrderSheet({
  order,
  open,
  onOpenChange,
  onSave,
  customers,
  shipTos,
  productNames,
}: OrderSheetProps) {
  const [draft, setDraft] = React.useState<OrderDraft | null>(null);

  // Re-seed whenever a different order opens, so edits never leak between rows.
  React.useEffect(() => {
    setDraft(order ? draftFrom(order) : null);
  }, [order]);

  if (!order || !draft) return null;

  const set = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const setProduct = (i: number, patch: Partial<{ name: string; gal: number }>) =>
    set(
      "products",
      draft.products.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    );

  const addProduct = () => {
    const unused = productNames.find(
      (n) => !draft.products.some((p) => p.name === n)
    );
    set("products", [
      ...draft.products,
      { name: unused ?? productNames[0] ?? "", gal: 0 },
    ]);
  };

  const removeProduct = (i: number) =>
    set(
      "products",
      draft.products.filter((_, idx) => idx !== i)
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[560px] gap-0 p-0 sm:max-w-[560px]"
      >
        {/* Header — the order number and nothing else. */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <SheetTitle className="text-base">Order #: {order.orderNo}</SheetTitle>
          <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        {/* Body — gap-7 between groups, per the DS sheet. */}
        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-auto p-4">
          <SheetSection title="Order Details">
            <SheetField label="Order Type">
              <RadioGroup
                value={draft.typeCode}
                onValueChange={(v) => set("typeCode", v as OrderTypeCode)}
                className="grid-cols-2"
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
                <Select
                  value={draft.customer}
                  onValueChange={(v) => set("customer", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
                <Select
                  value={draft.shipTo}
                  onValueChange={(v) => set("shipTo", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
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

            <SheetField
              label="Driver Selection"
              description="Clearing the driver leaves the order unassigned."
            >
              <Select
                value={draft.driver ?? "none"}
                onValueChange={(v) => set("driver", v === "none" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned</SelectItem>
                  {DRIVERS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SheetField>

            <SheetField label="Status">
              <Select
                value={draft.status}
                onValueChange={(v) => set("status", v as FuelOrderStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <span className="text-sm font-medium">Mark as Urgent</span>
              <Switch
                checked={draft.urgent}
                onCheckedChange={(v) => set("urgent", v)}
                aria-label="Mark as Urgent"
              />
            </div>
          </SheetSection>

          <SheetSection title="Product Details">
            {draft.products.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                {/* Product left, gallons right. */}
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
                  <SheetField label={i === 0 ? "Product" : undefined}>
                    <Select
                      value={p.name}
                      onValueChange={(v) => setProduct(i, { name: v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productNames.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SheetField>

                  <SheetField label={i === 0 ? "Quantity (Gal)" : undefined}>
                    <div className="relative">
                      <Input
                        inputMode="numeric"
                        value={String(p.gal)}
                        onChange={(e) =>
                          setProduct(i, {
                            gal:
                              Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                          })
                        }
                        className="pr-10 tabular-nums"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                        gal
                      </span>
                    </div>
                  </SheetField>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${p.name || "product"}`}
                  disabled={draft.products.length === 1}
                  onClick={() => removeProduct(i)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addProduct}>
                <Plus />
                Add product
              </Button>
              {/* Derived — it must always equal the lines above. */}
              <span className="text-sm text-muted-foreground">
                Total{" "}
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {totalGal(draft.products).toLocaleString()}
                </span>{" "}
                gal
              </span>
            </div>
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
              <Select value={draft.site} onValueChange={(v) => set("site", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site" />
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

            <SheetField label="PoC at Delivery">
              <Select
                value={draft.poc || "none"}
                onValueChange={(v) => set("poc", v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select PoC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {POC_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onSave(order, draft);
              onOpenChange(false);
            }}
          >
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
