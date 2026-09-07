import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
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
  TableCellCombobox,
  TableCellInput,
  TableCellMultiSelect,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import {
  SheetField,
  SheetSection,
  SheetSectionRemove,
} from "@/components/side-sheet/parts";
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
  YARDS,
  YARD_SITES,
  siteAddress,
  type MovementDirection,
} from "./orders";

/**
 * Asset Delivery and Asset Pickup — §5.20's other two create flows.
 *
 * ONE SHEET, TWO DIRECTIONS. A delivery takes an asset from a yard to a
 * customer; a pickup brings one back. Everything else about them is identical,
 * so the difference is a field on the draft and not a second file: two files
 * would have drifted, and the drift would be in the half nobody opens as often.
 *
 * THE DIRECTION IS SETTLED BEFORE THE SHEET OPENS. Both were once sibling items
 * on the Create menu, where a one-word difference between two opposite things
 * was the whole distinction; they are now a radio under one "Movement Order"
 * entry, which reads as two variants of one thing and shows which way you are
 * going before you commit to a form.
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
  "Lockbox",
  "Sight gauge",
];

/** A peripheral is a rented thing in its own right, so it carries the same
 *  facts an asset does: which one, its serial, what state it left in, and who
 *  owns it. Those four are the columns. */
const CONDITIONS = ["Fresh", "Old"];
const OWNERSHIP = ["Leased", "Purchased"];

export interface PeripheralRow {
  name: string;
  serial: string;
  condition: string;
  ownership: string;
}

const blankPeripheral = (): PeripheralRow => ({
  name: "",
  serial: "",
  condition: "",
  ownership: "",
});

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
  /* ONE ASSET, stated as a table row. Its type and capacity are the asset's own
     facts and arrive with it; the products are what it is to carry, which is a
     decision and so the only editable cell beside the asset itself. */
  assetId: string;
  products: string[];
  peripheralsOn: boolean;
  peripherals: PeripheralRow[];
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
    assetId: "",
    products: [],
    peripheralsOn: false,
    peripherals: [blankPeripheral()],
    customOn: false,
    customItems: [{ name: "", qty: null, unit: UNITS[0] }],
    instructions: "",
    internalNote: "",
  };
}

/**
 * ONE ROUTE, DRAWN AS ONE. The two location sections are a from and a to, and
 * as two headings 40px apart they read as two unrelated questions — which is
 * how someone fills in a yard and a ship-to that make no journey.
 *
 * A dot on the first heading, a line down the margin, an arrowhead on the
 * second. The sections indent by 28px to give the rail its own column rather
 * than having it hang in the sheet's padding.
 *
 * THE LINE'S LENGTH IS STATIC, not measured: it starts on the first heading's
 * line (10px into the section, half of the 20px line box) and has to reach the
 * arrowhead on the second heading's line — its own section's remaining height,
 * plus the body's 40px section gap, plus that same 10px, less the 6px the
 * arrowhead occupies. `-bottom-[44px]` is that sum, and it holds because both
 * numbers it depends on are DS rules rather than this sheet's choices.
 */
function RouteStep({
  step,
  children,
}: {
  step: "from" | "to";
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-7">
      {step === "from" ? (
        <>
          <span
            aria-hidden
            className="absolute top-1 left-0 size-3 rounded-full border-2 border-fp-outline-2"
          />
          <span
            aria-hidden
            className="absolute top-2.5 -bottom-[44px] left-[5.5px] w-px bg-fp-outline-2"
          />
        </>
      ) : (
        <ChevronDown
          aria-hidden
          className="absolute top-1 left-0 size-3 text-fp-outline-2"
          strokeWidth={3}
        />
      )}
      {children}
    </div>
  );
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
  const yard = YARD_SITES.find((y) => y.name === draft.yard);
  const poc = POC_DIRECTORY[draft.primaryPoc];
  const shipTos = SHIP_TO_SITES.map((s) => s.name);

  /* WHERE THE ASSETS COME FROM is the direction's doing. A delivery sends what
     is in the yard; a pickup collects what is out at the ship-to. Neither list
     is filtered by hand at the call site — the same expression answers both. */
  const sourceChosen = isDelivery ? Boolean(draft.yard) : Boolean(draft.shipTo);
  const pool: RentalAsset[] = !sourceChosen
    ? []
    : isDelivery
      ? RENTAL_ASSETS.filter((a) => a.availabilityStatus === "Available")
      : RENTAL_ASSETS.filter((a) => a.shipTo === draft.shipTo);

  const available = pool;
  const asset = RENTAL_ASSETS.find((a) => a.id === draft.assetId);

  const gate = isDelivery
    ? "Choose a yard first — the assets offered are the ones sitting in it."
    : "Choose a ship-to first — the assets offered are the ones on rent there.";

  const setPeripheral = (i: number, patch: Partial<PeripheralRow>) =>
    setDraft((d) => ({
      ...d,
      peripherals: d.peripherals.map((p, k) => (k === i ? { ...p, ...patch } : p)),
    }));

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
      {/* THE SAME GRID AS THE CUSTOMER BLOCK. A yard and a customer are the two
          ends of one journey and are asked for in the same way, so a select
          that is a third as wide as the one it pairs with reads as a lesser
          question. Its address sits BESIDE it rather than under, because there
          is only one select on this row and the second column was empty. */}
      <div className="grid grid-cols-2 items-end gap-4">
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
        {/* Derived from the select, so a read-out — the same card the ship-to
            gets, because it answers the same question about the other end. */}
        <div className="flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
          {/* ADDRESS ONLY — no coordinates. The ship-to card carries them
              because a customer site is somewhere a driver has to be told how
              to find; a yard is the broker's own, and at half the width the
              pair truncated the address, which is the half that answers
              "where". */}
          {yard ? (
            <span className="truncate text-sm text-foreground">
              {siteAddress(yard)}
            </span>
          ) : (
            <span className="truncate text-sm text-muted-foreground">
              Select a Yard to see its coordinates and address.
            </span>
          )}
        </div>
      </div>
    </SheetSection>
  );

  const customerBlock = (
    <SheetSection
      key="customer"
      title={isDelivery ? "Drop-off Location" : "Pickup Location"}
    >
      {/* THE CARD IS THE ROW'S THIRD UNIT, not a note under it. Customer, Ship
          To and the address they resolve to are three parts of one answer, so
          the gap below the selects is the same 16px as the gap between them —
          at 4px the card welded to the row above and read as its helper text. */}
      <div className="flex flex-col gap-4">
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
      editTitle="Movement Order"
      createTitle="Movement Order"
      createAction="Create Order"
      /* THE CHIP CARRIES THE DIRECTION, not the type — the title already says
         "Movement Order", and the direction is the one thing settled in the
         menu that the form itself never states. Without it the only evidence of
         which way this order runs is which end happens to ask for a yard.
         Violet either way: on the board, both are an M. */
      headerAside={<Badge variant="pastel-violet">{direction}</Badge>}
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
      <RouteStep key="from" step="from">
        {isDelivery ? yardBlock : customerBlock}
      </RouteStep>
      <RouteStep key="to" step="to">
        {isDelivery ? customerBlock : yardBlock}
      </RouteStep>

      <SheetSection
        title="POC Details"
        /* ADDING A PERSON ACTS ON THE SECTION, not on a field, so it sits on
           the heading row. As a field it also broke the row: the picker's empty
           box is taller than a select, which stretched the row and left the
           Sales Person read-out floating below the control it belongs to. Two
           rows of the same 1 + 2 shape now, the same pair the Delivery Order
           sheet uses. */
        action={
          <MultiSelect
            options={POCS.filter((p) => p !== draft.primaryPoc)}
            value={draft.secondaryPocs}
            onChange={(v) => set("secondaryPocs", v)}
            addLabel="Add POC"
            searchPlaceholder="Search contacts…"
            emptyText="No contact found."
            /* Sized to its content and framed like the other heading actions —
               a full-width bordered box in a heading row reads as a field that
               has lost its label. */
            className="min-h-8 w-auto justify-end border-transparent px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          />
        }
      >
        <div className="grid grid-cols-3 items-end gap-4">
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
          <div className="col-span-2 flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {poc ? (
              <>
                <CopyValue value={poc.phone} label="POC contact" tabular />
                <span aria-hidden className="mr-6 text-fp-outline-1">
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

        <div className="grid grid-cols-3 items-end gap-4">
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
          {/* SAME SHAPE AND SAME GRID as the POC row above — two read-out cards
              that differ in width read as two different kinds of card. */}
          <div className="col-span-2 flex h-9 items-center overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
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
        {/* THREE REFERENCE NUMBERS AND A DATE, one row. With the type gone to
            the header there is room for BOL beside the PO it sits next to on
            every paper version of this order. */}
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
          <SheetField label="Customer PO Number">
            <Input
              value={draft.poNumber}
              placeholder="Enter Customer PO Number"
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </SheetField>
          <SheetField label="BOL Number">
            <Input
              value={draft.bolNumber}
              placeholder="Enter BOL Number"
              onChange={(e) => set("bolNumber", e.target.value)}
            />
          </SheetField>
        </div>

        {/* TAGS GET THEIR OWN LINE. Every other control in this section is a
            single value in a fixed box; tags are a growing list, so sharing a
            row meant the row's height was decided by how many tags were on the
            order and the field beside it moved every time one was added. */}
        <SheetField label="Tags">
          <MultiSelect
            options={[...ORDER_TAGS]}
            value={draft.tags}
            onChange={(v) => set("tags", v)}
            addLabel="Add tags"
            searchPlaceholder="Search tags…"
            emptyText="No tag found."
          />
        </SheetField>

        {/* §6's per-order kill switch. ON by default — suppressing every email
            is the deliberate act, so it is the one that costs a click. */}
        {/* EVEN ON BOTH SIDES. This is not a field, it is a decision about the
            order as a whole, so it stands clear of the fields above it by the
            same 40px the next section stands clear of it. */}
        <label
          htmlFor="mv-notify"
          className="mt-6 flex cursor-pointer items-center justify-between gap-4"
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

      {/* THREE TABLES, NOT THREE SHAPES. The asset, its peripherals and any
          custom items are all "things going on this order", and the Delivery
          Order sheet already answers that with one idiom: fixed layout, a
          Surface-1a header naming every column, cells with no chrome of their
          own, and an Add chip on the squared bottom-left corner. Reading three
          different layouts for three lists of things was the cost of not using
          it here. */}
      <SheetSection title="Asset Details">
        {/* ONE ROW, AND NO ADD CHIP. §5.20: a movement order carries exactly
            one asset — `assertConsistent` enforces it — so the affordance that
            would add a second is the one thing this table must not have.

            THE ASSET IS THE ONLY THING PICKED. Type and capacity are the
            asset's own facts and arrive with it, the same way the Delivery
            Order's product arrives with its tank; product is what the tank is
            to carry, which is a decision, so it stays editable. */}
        {/* HELPER TEXT IS PART OF THE CONTROL, 4px under it — the DS rule the
            fields follow, applied to a table. At the section gap it floated
            between the table and the next section and got read as a heading
            for the wrong one. */}
        <div className="flex flex-col gap-1">
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col />
              <col className="w-[26%]" />
              <col className="w-[120px]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-fp-table-header">
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel required>Asset</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel>Tank Type</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <TableRequiredLabel>Capacity</TableRequiredLabel>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <TableRequiredLabel>Product</TableRequiredLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-11">
                <td className="relative p-0">
                  <TableCellCombobox
                    value={asset?.name ?? ""}
                    options={available.map((a) => a.name)}
                    disabled={!sourceChosen}
                    placeholder={sourceChosen ? "Select asset" : "Not available yet"}
                    aria-label="Asset"
                    onChange={(name) => {
                      const picked = available.find((a) => a.name === name);
                      set("assetId", picked?.id ?? "");
                    }}
                  />
                </td>
                {/* DERIVED, so text — a disabled control here would be a box
                    inviting a click that does nothing. */}
                <td className="px-3 text-sm text-muted-foreground">
                  {asset ? asset.assetType : "—"}
                </td>
                <td className="px-3 text-right text-sm tabular-nums text-muted-foreground">
                  {asset && asset.capacityGal > 0
                    ? `${asset.capacityGal.toLocaleString()} gal`
                    : "—"}
                </td>
                <td className="relative p-0">
                  <TableCellMultiSelect
                    values={draft.products}
                    options={[...PRODUCTS]}
                    unitLabel="product"
                    placeholder="Select product"
                    aria-label="Products for this asset"
                    onChange={(v) => set("products", v)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* RED ONLY WHEN IT BLOCKS. Until a yard is chosen this line is the
            reason the row above cannot be filled, which is a different kind of
            sentence from "3 assets in Fresno Yard" — and if both were red the
            colour would stop meaning anything. */}
        <p
          className={cn(
            "text-xs",
            sourceChosen ? "text-muted-foreground" : "text-destructive"
          )}
        >
          {sourceChosen
            ? `${available.length} ${available.length === 1 ? "asset" : "assets"} ${
                isDelivery ? `in ${draft.yard}` : `on rent at ${draft.shipTo}`
              }. Search by name or serial.`
            : gate}
        </p>
        </div>

        {asset && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-fp-outline-1 bg-fp-surface-1a px-4 py-2.5 text-sm">
            <span className="text-foreground">{asset.serialNumber ?? "—"}</span>
            <span aria-hidden className="text-fp-outline-1">
              |
            </span>
            <span className="text-muted-foreground">
              {asset.customer ? `On rent to ${asset.customer}` : "In the yard"}
            </span>
          </div>
        )}
      </SheetSection>

      {/* Two OPTIONAL manifests, each hidden until asked for — the same rule
          the Load Order follows. A list nobody fills is a section people learn
          to scroll past. The switch rides the SECTION HEADING now that each is
          a section of its own, which is also what stops it being mistaken for
          a row of the table beneath it. */}
      <SheetSection
        title="Add Peripheral"
        /* QUIET UNTIL REACHED FOR — the same removal affordance the Load Order
           carries, and for the same reason: emptying an optional list is
           destructive, so it does not compete with the table, and it keeps its
           label because "Remove" beside a table of rows reads as though it
           might remove a row. */
        action={
          draft.peripheralsOn && (
            <SheetSectionRemove
              label="Remove peripherals"
              /* A row counts as filled the moment ANY of its four cells has a
                 value. The blank starter row the table opens with is not
                 content — asking about it would be asking about nothing. */
              hasContent={draft.peripherals.some(
                (x) => x.name || x.serial || x.condition || x.ownership
              )}
              onClick={() => {
                set("peripheralsOn", false);
                set("peripherals", [blankPeripheral()]);
              }}
            />
          )
        }
      >
        {draft.peripheralsOn ? (
          <div>
            <div className="overflow-hidden rounded-md rounded-bl-none border border-border">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col />
                  <col className="w-[26%]" />
                  <col className="w-[20%]" />
                  <col className="w-[22%]" />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Peripheral</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Serial no.</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Condition</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Ownership status</TableRequiredLabel>
                    </th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {draft.peripherals.map((p, i) => (
                    <tr
                      key={i}
                      className="group/row h-11 border-b border-border last:border-b-0"
                    >
                      <td className="relative p-0">
                        <TableCellCombobox
                          value={p.name}
                          options={PERIPHERALS}
                          /* One peripheral, one row — the same rule the
                             Delivery Order's asset column follows. */
                          taken={draft.peripherals.map((x) => x.name)}
                          creatable
                          placeholder="Select"
                          aria-label={`Peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { name: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellInput
                          value={p.serial}
                          placeholder="Enter serial no."
                          aria-label={`Serial number for peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { serial: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellSelect
                          value={p.condition}
                          options={CONDITIONS}
                          placeholder="Select"
                          aria-label={`Condition of peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { condition: v })}
                        />
                      </td>
                      <td className="relative p-0">
                        <TableCellSelect
                          value={p.ownership}
                          options={OWNERSHIP}
                          placeholder="Select"
                          aria-label={`Ownership status of peripheral ${i + 1}`}
                          onChange={(v) => setPeripheral(i, { ownership: v })}
                        />
                      </td>
                      <td className="p-0 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove peripheral ${i + 1}`}
                          disabled={draft.peripherals.length === 1}
                          className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              peripherals: d.peripherals.filter((_, k) => k !== i),
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
                  peripherals: [...d.peripherals, blankPeripheral()],
                }))
              }
              className="flex h-8 items-center gap-1.5 rounded-b-md border border-t-0 border-border px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" /> Add peripheral
            </button>
          </div>
        ) : (
          /* THE EMPTY STATE IS THE TABLE'S OWN BOX, dashed, with the CTA inside
             it — the Load Order's shape. A switch floating on the heading said
             the section could be turned on but not what turning it on would
             give you; a box the size of the table, naming the thing it will
             hold, does both. */
          <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-foreground">Add Peripheral</span>
              <span className="text-xs text-muted-foreground">
                List peripherals to include with the asset's movement order.
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => set("peripheralsOn", true)}
            >
              <Plus /> Add
            </Button>
          </div>
        )}
      </SheetSection>

      <SheetSection
        title="Custom Items"
        action={
          draft.customOn && (
            <SheetSectionRemove
              label="Remove custom items"
              /* The unit is prefilled with the first option, so it says nothing
                 about whether anyone has been here — only a name or a quantity
                 does. */
              hasContent={draft.customItems.some((x) => x.name || x.qty != null)}
              onClick={() => {
                set("customOn", false);
                set("customItems", [{ name: "", qty: null, unit: UNITS[0] }]);
              }}
            />
          )
        }
      >
        {draft.customOn ? (
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
                  <tr className="border-b border-border bg-fp-table-header">
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Item</TableRequiredLabel>
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
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-foreground">Add Custom Items</span>
              <span className="text-xs text-muted-foreground">
                Anything to include with the asset's Lease Equipment Order.
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={() => set("customOn", true)}>
              <Plus /> Add
            </Button>
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
