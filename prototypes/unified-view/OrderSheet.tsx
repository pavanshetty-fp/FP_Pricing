import * as React from "react";
import { CalendarDays, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SheetClose, SheetTitle } from "@/components/ui/sheet";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
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
import { formatFullDate, totalGal } from "./data";
import type { FuelOrder, FuelOrderStatus, OrderTypeCode } from "./types";

/*
  Order side sheet — every field the table shows, editable, plus the extras the
  source app's own detail sheet carried (Urgent, Site PoC, Delivery Notes,
  delivery-ticket PO fields).

  Shell geometry is the DS's: `Sheet` + `SheetContent side="right"` with
  `gap-0 p-0`, a `border-b` header, a scrolling body, and a pinned footer —
  the anatomy `side-sheet/SheetNarrow.tsx` uses, at the DS `narrow` width (560).
  Section and field wrappers are the DS's own `SheetSection` / `SheetField`.

  Edits are held in local draft state so Cancel can discard them; Save lifts the
  draft to the caller. Qty is never editable — it is the sum of the product
  lines, so it is shown derived rather than offered as a field that could
  disagree with them.
*/

const STATUS_TONE: Record<FuelOrderStatus, StatusTone> = {
  Assigned: "success",
  Unassigned: "processing",
};

/** Tags the picker offers. Sample set — the source app's control was empty. */
const TAG_OPTIONS = [
  "Keep Full",
  "Rush",
  "Night",
  "Weekend",
  "Split Load",
  "Hazmat",
  "After Hours",
];

const DRIVERS = ["Shriya", "Shriya Test 2", "Aakash"];

const TYPE_LABEL: Record<OrderTypeCode, "Delivery" | "Extraction"> = {
  D: "Delivery",
  E: "Extraction",
};

/** The editable shape. Mirrors FuelOrder minus derived/identity fields. */
export interface OrderDraft {
  typeCode: OrderTypeCode;
  customer: string;
  shipTo: string;
  products: { name: string; gal: number }[];
  deliveryDate: Date;
  plannedDate: Date | null;
  plannedTime: string;
  status: FuelOrderStatus;
  driver: string | null;
  tags: string[];
  urgent: boolean;
  sitePoc: string;
  notes: string;
  poType: string;
  poNumber: string;
}

function draftFrom(order: FuelOrder): OrderDraft {
  const [y, m, d] = order.dateKey.split("-").map(Number);
  const delivery = new Date(y, m - 1, d);
  return {
    typeCode: order.type.code,
    customer: order.customer.title,
    shipTo: order.customer.description,
    products: order.products.map((p) => ({ ...p })),
    deliveryDate: delivery,
    plannedDate: order.planned ? delivery : null,
    plannedTime: order.planned?.time ?? "",
    status: order.status,
    driver: order.driver?.name ?? null,
    tags: [...order.tags],
    urgent: false,
    sitePoc: "",
    notes: "",
    poType: "",
    poNumber: "",
  };
}

export interface OrderSheetProps {
  order: FuelOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: FuelOrder, draft: OrderDraft) => void;
}

export function OrderSheet({
  order,
  open,
  onOpenChange,
  onSave,
}: OrderSheetProps) {
  const [draft, setDraft] = React.useState<OrderDraft | null>(null);

  // Re-seed whenever a different order is opened, so edits never leak between
  // rows and Cancel always restores the row's own values.
  React.useEffect(() => {
    setDraft(order ? draftFrom(order) : null);
  }, [order]);

  if (!order || !draft) return null;

  const set = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const toggleTag = (tag: string) =>
    set(
      "tags",
      draft.tags.includes(tag)
        ? draft.tags.filter((t) => t !== tag)
        : [...draft.tags, tag]
    );

  const setProductGal = (name: string, gal: number) =>
    set(
      "products",
      draft.products.map((p) => (p.name === name ? { ...p, gal } : p))
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 p-0 w-[560px] sm:max-w-[560px]"
      >
        {/* Header — identity is read-only; type and status are edited below. */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex flex-col gap-2">
            <SheetTitle className="text-base">
              Order #: {order.orderNo}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[draft.typeCode]}</Badge>
              <StatusChip tone={STATUS_TONE[draft.status]} variant="soft">
                {draft.status}
              </StatusChip>
            </div>
          </div>
          <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-auto p-4">
          <SheetSection title="Order">
            <SheetField label="Type">
              <Select
                value={draft.typeCode}
                onValueChange={(v) => set("typeCode", v as OrderTypeCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D">Delivery</SelectItem>
                  <SelectItem value="E">Extraction</SelectItem>
                </SelectContent>
              </Select>
            </SheetField>

            <SheetField label="Customer">
              <Input
                value={draft.customer}
                onChange={(e) => set("customer", e.target.value)}
              />
            </SheetField>

            <SheetField label="Ship-To">
              <Input
                value={draft.shipTo}
                onChange={(e) => set("shipTo", e.target.value)}
              />
            </SheetField>

            <SheetField label="Status">
              <Select
                value={draft.status}
                onValueChange={(v) => set("status", v as FuelOrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </SheetField>

            <SheetField
              label="Driver"
              description="Clearing the driver leaves the order unassigned."
            >
              <Select
                value={draft.driver ?? "none"}
                onValueChange={(v) => set("driver", v === "none" ? null : v)}
              >
                <SelectTrigger>
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
          </SheetSection>

          <SheetSection title="Schedule">
            <SheetField label="Date of Delivery">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start font-normal">
                    <CalendarDays />
                    {formatFullDate(draft.deliveryDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={draft.deliveryDate}
                    onSelect={(d) => d && set("deliveryDate", d)}
                    defaultMonth={draft.deliveryDate}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </SheetField>

            <SheetField label="Planned Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start font-normal">
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
                    defaultMonth={draft.plannedDate ?? draft.deliveryDate}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </SheetField>

            <SheetField
              label="Planned Time"
              description="Leave both planned fields empty for an unscheduled order."
            >
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

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <span className="text-sm font-medium">Urgent</span>
              <Switch
                checked={draft.urgent}
                onCheckedChange={(v) => set("urgent", v)}
                aria-label="Urgent"
              />
            </div>
          </SheetSection>

          <SheetSection title="Products">
            {draft.products.map((p) => (
              <SheetField key={p.name} label={p.name}>
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    value={String(p.gal)}
                    onChange={(e) =>
                      setProductGal(
                        p.name,
                        Number(e.target.value.replace(/[^0-9]/g, "")) || 0
                      )
                    }
                    className="pr-10 tabular-nums"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                    gal
                  </span>
                </div>
              </SheetField>
            ))}
            {/* Derived, never edited — it must always equal the lines above. */}
            <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
              <span className="text-sm text-muted-foreground">Qty (Gal)</span>
              <span className="text-base font-semibold tabular-nums">
                {totalGal(draft.products).toLocaleString()}
              </span>
            </div>
          </SheetSection>

          <SheetSection title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((t) => {
                const on = draft.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    aria-pressed={on}
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Badge
                      variant={on ? "default" : "outline"}
                      className="cursor-pointer"
                    >
                      {t}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </SheetSection>

          <SheetSection title="Delivery">
            <SheetField label="Site PoC">
              <Input
                value={draft.sitePoc}
                placeholder="Select site POC…"
                onChange={(e) => set("sitePoc", e.target.value)}
              />
            </SheetField>
            <SheetField label="Delivery Notes">
              <Textarea
                value={draft.notes}
                placeholder="Gate codes, access notes, site POC if missing…"
                onChange={(e) => set("notes", e.target.value)}
                className="min-h-24"
              />
            </SheetField>
          </SheetSection>

          <SheetSection title="Delivery ticket">
            <SheetField label="PO Type">
              <Select
                value={draft.poType || "none"}
                onValueChange={(v) => set("poType", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select PO Type</SelectItem>
                  <SelectItem value="Blanket">Blanket</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </SheetField>
            <SheetField label="PO #">
              <Input
                value={draft.poNumber}
                placeholder="Optional"
                onChange={(e) => set("poNumber", e.target.value)}
              />
            </SheetField>
          </SheetSection>
        </div>

        {/* Footer — pinned, matching the source app's Cancel / Save pair. */}
        <div className="flex shrink-0 items-center gap-3 border-t border-border p-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
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
