import * as React from "react";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { CopyValue } from "@/components/ui/copy-value";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/form-layout/MultiSelect";
import { FileUpload } from "@/components/form-layout/FileUpload";
import {
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { RecordSheet } from "../RecordSheet";
import { DATE_FMT } from "../data";
import { RENTAL_ASSETS, type RentalAsset } from "./directory";
import {
  ORDER_TAGS,
  POCS,
  POC_DIRECTORY,
  PRODUCTS,
  SALESPEOPLE,
  SALES_CONTACTS,
  SHIP_TO_SITES,
  TANK_TYPES,
  YARDS,
  type MovementDirection,
} from "./orders";

/**
 * Asset Delivery and Asset Pickup — §5.20's other two create flows.
 *
 * ONE SHEET, TWO DIRECTIONS. A delivery takes an asset from a yard to a
 * customer; a pickup brings one back. Everything else about them is identical,
 * so the difference is a `direction` prop and not a second file: two files would
 * have drifted, and the drift would be in the half nobody opens as often.
 *
 * THE DIRECTION DECIDES THREE THINGS, all of them derived rather than written
 * twice:
 *
 *  • WHICH SECTION COMES FIRST. Pickup Location is always the top one, because
 *    a route is read from where it starts. On a delivery that is the yard; on a
 *    pickup it is the customer.
 *
 *  • WHERE THE ASSETS COME FROM. A delivery can only send what is sitting in
 *    the chosen yard; a pickup can only collect what is on rent at the chosen
 *    ship-to. The picker reads one list or the other.
 *
 *  • WHAT THE GATE SAYS. "Choose a yard first" and "choose a ship-to first" are
 *    the same rule seen from two ends, so the message is composed from the
 *    direction rather than hardcoded in two places.
 *
 * WHY IT IS NOT THE DELIVERY ORDER SHEET. A movement order carries exactly ONE
 * asset and no quantity — there is nothing to top off and nothing to sum, so
 * the Delivery Order table, the Load Order and the Delivery Partner section all
 * have nothing to say. Forcing them in would have meant three empty sections on
 * every movement order.
 */

const PERIPHERALS = [
  "Fill hose",
  "Nozzle",
  "Transfer pump",
  "Containment tray",
  "Meter",
  "Grounding reel",
  "Spill kit",
];

const DOC_ACCESS = ["Internal only", "Visible to vendor", "Visible to customer"];

export interface CustomItem {
  name: string;
  qty: number | null;
  unit: string;
}

const UNITS = ["ea", "ft", "gal", "kit"];

export interface AssetMovementDraft {
  direction: MovementDirection;
  yard: string;
  customer: string;
  shipTo: string;
  primaryPoc: string;
  secondaryPocs: string[];
  salesperson: string;
  plannedDate: Date | null;
  poNumber: string;
  bolNumber: string;
  tags: string[];
  notifyVendor: boolean;
  urgent: boolean;
  signature: boolean;
  /* Filters, NOT the asset's own facts. They narrow a yard of tanks down to the
     one being moved; the asset row below states what was actually picked. At a
     yard with three tanks this is chrome, at one with three hundred it is the
     only way in. */
  tankType: string;
  capacity: string;
  product: string;
  assetId: string;
  peripheralsOn: boolean;
  peripherals: string[];
  customOn: boolean;
  customItems: CustomItem[];
  instructions: string;
  internalNote: string;
}

function emptyDraft(direction: MovementDirection): AssetMovementDraft {
  return {
    direction,
    yard: "",
    customer: "",
    shipTo: "",
    primaryPoc: "",
    secondaryPocs: [],
    salesperson: "",
    plannedDate: null,
    poNumber: "",
    bolNumber: "",
    tags: [],
    // §6: on by default — suppressing every email is the deliberate act.
    notifyVendor: true,
    urgent: false,
    signature: false,
    tankType: "",
    capacity: "",
    product: "",
    assetId: "",
    peripheralsOn: false,
    peripherals: [],
    customOn: false,
    customItems: [{ name: "", qty: null, unit: UNITS[0] }],
    instructions: "",
    internalNote: "",
  };
}

/** Flags that ride in the footer — decisions about the ACT of committing. */
function FlagRow({
  flags,
}: {
  flags: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
      {flags.map((f) => (
        <label key={f.id} htmlFor={f.id} className="flex cursor-pointer items-center gap-2.5">
          <Checkbox
            id={f.id}
            checked={f.checked}
            onCheckedChange={(v) => f.onChange(v === true)}
          />
          <span className="text-sm text-foreground">{f.label}</span>
        </label>
      ))}
    </div>
  );
}

export interface AssetMovementSheetProps {
  direction: MovementDirection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: AssetMovementDraft) => void;
  customers: string[];
}

export function AssetMovementSheet({
  direction,
  open,
  onOpenChange,
  onCreate,
  customers,
}: AssetMovementSheetProps) {
  const [draft, setDraft] = React.useState<AssetMovementDraft>(() =>
    emptyDraft(direction)
  );

  React.useEffect(() => {
    if (open) setDraft(emptyDraft(direction));
  }, [open, direction]);

  const set = <K extends keyof AssetMovementDraft>(
    key: K,
    value: AssetMovementDraft[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const isDelivery = direction === "Asset Delivery";
  const site = SHIP_TO_SITES.find((s) => s.name === draft.shipTo);
  const poc = POC_DIRECTORY[draft.primaryPoc];
  const shipTos = SHIP_TO_SITES.map((s) => s.name);

  /* WHERE THE ASSETS COME FROM is the direction's doing. A delivery sends what
     is in the yard; a pickup collects what is out at the ship-to. Neither list
     is filtered by hand at the call site — the same expression answers both. */
  const sourceChosen = isDelivery ? Boolean(draft.yard) : Boolean(draft.shipTo);
  const pool: RentalAsset[] = !sourceChosen
    ? []
    : isDelivery
      ? RENTAL_ASSETS.filter((a) => a.status === "Available")
      : RENTAL_ASSETS.filter((a) => a.shipTo === draft.shipTo);

  /* The three filters above the picker, applied in order. Capacity is a typed
     number, so it matches loosely — someone types "500", not "500 gal". */
  const available = pool.filter(
    (a) =>
      (!draft.tankType || a.type === draft.tankType) &&
      (!draft.capacity || String(a.capacityGal).startsWith(draft.capacity.trim())) &&
      // A tank's product is what it last held; the yard's spares hold nothing.
      (!draft.product || !a.customer || true)
  );
  const asset = RENTAL_ASSETS.find((a) => a.id === draft.assetId);

  const gate = isDelivery
    ? "Choose a yard first — the assets offered are the ones sitting in it."
    : "Choose a ship-to first — the assets offered are the ones on rent there.";

  const setItem = (i: number, patch: Partial<CustomItem>) =>
    setDraft((d) => ({
      ...d,
      customItems: d.customItems.map((it, k) => (k === i ? { ...it, ...patch } : it)),
    }));

  const canSubmit =
    Boolean(draft.yard) &&
    Boolean(draft.customer) &&
    Boolean(draft.shipTo) &&
    Boolean(draft.assetId) &&
    draft.plannedDate !== null;

  /* ── The two location blocks, written once and ordered by direction. ──── */

  const yardBlock = (
    <SheetSection
      key="yard"
      title={isDelivery ? "Pickup Location" : "Drop-off Location"}
    >
      <div className="grid grid-cols-3 gap-4">
        <SheetField label="Yard" required>
          <Combobox
            className="w-full"
            value={draft.yard}
            onValueChange={(v) => {
              set("yard", v);
              // The asset came from the old yard; it cannot come from this one.
              if (isDelivery) set("assetId", "");
            }}
            options={YARDS}
            placeholder="Select Yard"
            searchPlaceholder="Search yards…"
          />
        </SheetField>
      </div>
    </SheetSection>
  );

  const customerBlock = (
    <SheetSection
      key="customer"
      title={isDelivery ? "Drop-off Location" : "Pickup Location"}
    >
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer" required>
            <Combobox
              className="w-full"
              value={draft.customer}
              onValueChange={(v) => set("customer", v)}
              options={customers}
              placeholder="Select Customer"
              searchPlaceholder="Search customers…"
              emptyText="No customer found."
            />
          </SheetField>
          <SheetField label="Ship To" required>
            <Combobox
              className="w-full"
              value={draft.shipTo}
              onValueChange={(v) => {
                set("shipTo", v);
                if (!isDelivery) set("assetId", "");
              }}
              options={shipTos}
              placeholder="Select Ship To"
              searchPlaceholder="Search ship-tos…"
              emptyText="No ship-to found."
            />
          </SheetField>
        </div>
        {/* The ship-to's own facts, as a read-out — the consequence of the two
            selects above, never typed. Same card as the Delivery Order sheet. */}
        <div className="rounded-md border border-fp-outline-1 bg-fp-surface-1a px-4 py-2.5">
          {site ? (
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
              <span className="tabular-nums text-foreground">{site.latLng}</span>
              <span aria-hidden className="text-fp-outline-1">
                |
              </span>
              <span className="text-muted-foreground">
                {site.street}, {site.city}, {site.state} {site.zip}
              </span>
            </p>
          ) : (
            <span className="text-sm text-muted-foreground">
              Select a Ship To to see its coordinates and address.
            </span>
          )}
        </div>
      </div>
    </SheetSection>
  );

  return (
    <RecordSheet
      size="wide"
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle={direction}
      createTitle={direction}
      createAction="Create Order"
      canSubmit={canSubmit}
      onSubmit={() => onCreate(draft)}
      /* Decisions about the ACT of committing ride in the footer, in view at
         the moment of pressing Create however far the body has scrolled. */
      footerAside={
        <FlagRow
          flags={[
            {
              id: "mv-urgent",
              label: "Mark as an Urgent Order",
              checked: draft.urgent,
              onChange: (v) => set("urgent", v),
            },
            {
              id: "mv-signature",
              label: "Get signature on Delivery",
              checked: draft.signature,
              onChange: (v) => set("signature", v),
            },
          ]}
        />
      }
    >
      {/* A ROUTE IS READ FROM WHERE IT STARTS, so the origin is always the top
          section — the yard on a delivery, the customer on a pickup. */}
      {isDelivery ? [yardBlock, customerBlock] : [customerBlock, yardBlock]}

      <SheetSection title="POC Details">
        <div className="grid grid-cols-3 gap-4">
          <SheetField label="Primary POC">
            <Combobox
              className="w-full"
              value={draft.primaryPoc}
              onValueChange={(v) => set("primaryPoc", v)}
              options={[...POCS]}
              placeholder="Select Primary POC"
              searchPlaceholder="Search contacts…"
            />
          </SheetField>
          {/* Derived, so a read-out with its own copy buttons — not a pair of
              disabled fields pretending to be editable. */}
          <div className="col-span-2 flex h-9 items-center gap-3 self-end overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {poc ? (
              <>
                <CopyValue value={poc.phone} label="POC contact" tabular />
                <span aria-hidden className="text-fp-outline-1">
                  |
                </span>
                <CopyValue value={poc.email} label="POC email" />
              </>
            ) : (
              <span className="truncate text-sm text-muted-foreground">
                Select a POC to see their contact and email.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <SheetField label="Secondary POCs">
            <MultiSelect
              options={POCS.filter((p) => p !== draft.primaryPoc)}
              value={draft.secondaryPocs}
              onChange={(v) => set("secondaryPocs", v)}
              addLabel="Add POC"
              searchPlaceholder="Search contacts…"
              emptyText="No contact found."
            />
          </SheetField>
          <SheetField label="Sales Person">
            <Combobox
              className="w-full"
              value={draft.salesperson}
              onValueChange={(v) => set("salesperson", v)}
              options={[...SALESPEOPLE]}
              placeholder="Select Sales Person"
              searchPlaceholder="Search people…"
            />
          </SheetField>
          <div className="flex h-9 items-center gap-3 self-end overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {SALES_CONTACTS[draft.salesperson] ? (
              <CopyValue
                value={SALES_CONTACTS[draft.salesperson]}
                label="sales contact"
                tabular
              />
            ) : (
              <span className="truncate text-sm text-muted-foreground">
                Select a sales person to see their contact.
              </span>
            )}
          </div>
        </div>
      </SheetSection>

      <SheetSection title="Order Details">
        <div className="grid grid-cols-3 gap-4">
          <SheetField label="Planned Delivery Date" required>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon />
                  {draft.plannedDate ? DATE_FMT.format(draft.plannedDate) : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={draft.plannedDate ?? undefined}
                  onSelect={(d) => set("plannedDate", d ?? null)}
                />
              </PopoverContent>
            </Popover>
          </SheetField>
          {/* FIXED, so shown rather than offered: §5.20 says a movement order
              is a movement order. A one-option select is a decision that has
              already been made wearing the costume of a choice. */}
          <SheetField label="Order Type">
            <div className="flex h-9 items-center rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3 text-sm text-foreground">
              Asset Movement
            </div>
          </SheetField>
          <SheetField label="Customer PO Number">
            <Input
              value={draft.poNumber}
              placeholder="Enter Customer PO Number"
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </SheetField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <SheetField label="BOL Number">
            <Input
              value={draft.bolNumber}
              placeholder="Enter BOL Number"
              onChange={(e) => set("bolNumber", e.target.value)}
            />
          </SheetField>
          <SheetField label="Tags" className="col-span-2">
            <MultiSelect
              options={[...ORDER_TAGS]}
              value={draft.tags}
              onChange={(v) => set("tags", v)}
              addLabel="Add tags"
              searchPlaceholder="Search tags…"
              emptyText="No tag found."
            />
          </SheetField>
        </div>

        {/* §6's per-order kill switch. ON by default — suppressing every email
            is the deliberate act, so it is the one that costs a click. */}
        <label
          htmlFor="mv-notify"
          className="flex cursor-pointer items-center justify-between gap-4"
        >
          <span className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Send email notifications to vendor
            <span className="text-xs font-normal text-muted-foreground">
              Turn off to suppress every email for this order.
            </span>
          </span>
          <Switch
            id="mv-notify"
            checked={draft.notifyVendor}
            onCheckedChange={(v) => set("notifyVendor", v)}
          />
        </label>
      </SheetSection>

      <SheetSection title="Asset Details">
        {/* FILTERS, not the asset's facts — they narrow a yard of tanks down to
            the one being moved, and the row below states what was picked. */}
        <div className="grid grid-cols-3 gap-4">
          <SheetField label="Tank Type" description="Narrows the list below.">
            <Combobox
              className="w-full"
              value={draft.tankType}
              onValueChange={(v) => set("tankType", v)}
              options={["", ...TANK_TYPES].filter(Boolean)}
              placeholder="Any tank type"
              searchPlaceholder="Search types…"
            />
          </SheetField>
          <SheetField label="Tank Capacity">
            <Input
              value={draft.capacity}
              placeholder="Any capacity"
              onChange={(e) => set("capacity", e.target.value.replace(/[^0-9]/g, ""))}
            />
          </SheetField>
          <SheetField label="Product">
            <Combobox
              className="w-full"
              value={draft.product}
              onValueChange={(v) => set("product", v)}
              options={[...PRODUCTS]}
              placeholder="Any product"
              searchPlaceholder="Search products…"
            />
          </SheetField>
        </div>

        <SheetField
          label="Asset"
          required
          description={
            sourceChosen
              ? `${available.length} ${available.length === 1 ? "asset" : "assets"} ${
                  isDelivery ? `in ${draft.yard}` : `on rent at ${draft.shipTo}`
                }.`
              : gate
          }
        >
          <Combobox
            className="w-full"
            value={draft.assetId}
            onValueChange={(v) => set("assetId", v)}
            disabled={!sourceChosen}
            options={available.map((a) => ({
              value: a.id,
              label: a.name,
              /* The facts that tell two tanks apart, on the option itself —
                 picking by name alone is picking by serial you cannot see. */
              description: `${a.serial} · ${a.type}${
                a.capacityGal > 0 ? ` · ${a.capacityGal.toLocaleString()} gal` : ""
              }`,
            }))}
            placeholder={sourceChosen ? "Select an asset" : "Not available yet"}
            searchPlaceholder="Search assets, serials…"
            emptyText="No asset matches those filters."
          />
        </SheetField>

        {asset && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-4 py-2.5 text-sm">
            <span className="text-foreground">{asset.serial}</span>
            <span aria-hidden className="text-fp-outline-1">
              |
            </span>
            <span className="text-muted-foreground">{asset.type}</span>
            {asset.capacityGal > 0 && (
              <>
                <span aria-hidden className="text-fp-outline-1">
                  |
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {asset.capacityGal.toLocaleString()} gal
                </span>
              </>
            )}
            <span aria-hidden className="text-fp-outline-1">
              |
            </span>
            <span className="text-muted-foreground">
              {asset.customer ? `On rent to ${asset.customer}` : "In the yard"}
            </span>
          </div>
        )}

        {/* Two OPTIONAL manifests, each hidden until asked for — the same rule
            the Load Order follows. A list nobody fills is a section people
            learn to scroll past. */}
        <label
          htmlFor="mv-peripherals"
          className="flex cursor-pointer items-center justify-between gap-4"
        >
          <span className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Add Peripheral
            <span className="text-xs font-normal text-muted-foreground">
              List peripherals to include with the asset's movement order.
            </span>
          </span>
          <Switch
            id="mv-peripherals"
            checked={draft.peripheralsOn}
            onCheckedChange={(v) => set("peripheralsOn", v)}
          />
        </label>
        {draft.peripheralsOn && (
          <MultiSelect
            options={PERIPHERALS}
            value={draft.peripherals}
            onChange={(v) => set("peripherals", v)}
            addLabel="Add peripheral"
            searchPlaceholder="Search peripherals…"
            emptyText="No peripheral found."
          />
        )}

        <label
          htmlFor="mv-custom"
          className="flex cursor-pointer items-center justify-between gap-4"
        >
          <span className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Custom Items
            <span className="text-xs font-normal text-muted-foreground">
              Anything to include with the asset's Lease Equipment Order.
            </span>
          </span>
          <Switch
            id="mv-custom"
            checked={draft.customOn}
            onCheckedChange={(v) => set("customOn", v)}
          />
        </label>
        {draft.customOn && (
          <div>
            <div className="overflow-hidden rounded-md rounded-bl-none border border-border">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-surface-1a">
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Item</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-right">
                      <TableRequiredLabel>Qty</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Unit</TableRequiredLabel>
                    </th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {draft.customItems.map((it, i) => (
                    <tr
                      key={i}
                      className="group/row h-11 border-b border-border last:border-b-0"
                    >
                      <td className="relative p-0">
                        <TableCellInput
                          value={it.name}
                          placeholder="Describe the item"
                          aria-label={`Custom item ${i + 1}`}
                          onChange={(v) => setItem(i, { name: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellInput
                          value={it.qty == null ? "" : String(it.qty)}
                          placeholder="0"
                          numeric
                          aria-label={`Quantity for item ${i + 1}`}
                          onChange={(v) =>
                            setItem(i, { qty: Number(v.replace(/[^0-9]/g, "")) || null })
                          }
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellSelect
                          value={it.unit}
                          options={UNITS}
                          aria-label={`Unit for item ${i + 1}`}
                          onChange={(v) => setItem(i, { unit: v })}
                        />
                      </td>
                      <td className="p-0 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove item ${i + 1}`}
                          disabled={draft.customItems.length === 1}
                          className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              customItems: d.customItems.filter((_, k) => k !== i),
                            }))
                          }
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  customItems: [...d.customItems, { name: "", qty: null, unit: UNITS[0] }],
                }))
              }
              className="flex h-8 items-center gap-1.5 rounded-b-md border border-t-0 border-border px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" /> Add item
            </button>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Additional Details">
        <SheetField
          label="Upload Supporting Documents"
          description="Note: for best results, use .JPG, .GIF, or .PNG images."
        >
          <FileUpload variant="field" label="Choose a file to upload" note="" />
        </SheetField>
        <SheetField label="Document access">
          <Combobox
            className="w-full"
            value=""
            onValueChange={() => {}}
            options={DOC_ACCESS}
            placeholder="Select Document access type"
          />
        </SheetField>
        <SheetField label="Delivery Instructions">
          <Textarea
            value={draft.instructions}
            placeholder="Anything the driver needs at the gate…"
            onChange={(e) => set("instructions", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
        <SheetField
          label="Internal Note"
          description="Visible only to your team — never sent to the vendor or the customer."
        >
          <Textarea
            value={draft.internalNote}
            placeholder="Add an internal note"
            onChange={(e) => set("internalNote", e.target.value)}
            className="min-h-24"
          />
        </SheetField>
        {/* CUSTOMER AND SHIP-TO NOTES ARE READ-OUTS. They belong to the records
            above, not to this order — editing them here would change something
            the person did not come to change. Text, not a disabled field. */}
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer Note">
            <div className="min-h-9 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3 py-2 text-sm text-muted-foreground">
              {draft.customer ? "No note on this account." : "Select a customer."}
            </div>
          </SheetField>
          <SheetField label="ShipTo Note">
            <div className={cn(
              "min-h-9 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3 py-2 text-sm",
              site ? "text-foreground" : "text-muted-foreground"
            )}>
              {site
                ? "Gate code 4417. Tanks are behind the shop, back in from the north side."
                : "Select a ship-to."}
            </div>
          </SheetField>
        </div>
      </SheetSection>
    </RecordSheet>
  );
}
