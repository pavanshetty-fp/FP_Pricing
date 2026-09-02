import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CircleAlert,
  Layers,
  RefreshCw,
  Mail,
  Plus,
  Shield,
  ThumbsDown,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip } from "@/components/ui/status-chip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { FileUpload } from "@/components/form-layout/FileUpload";
import { TableCellInput } from "@/components/form-layout";
import { RecordSheet } from "../RecordSheet";
import { DATE_FMT } from "../data";
import { VENDORS, vendorById } from "./vendors";
import {
  ALL_ASSET_NAMES,
  BROKER_STATUS_TONE,
  HUBS,
  LISTING_TYPES,
  POCS,
  POC_DIRECTORY,
  PRODUCTS,
  RECURRENCE_FREQUENCIES,
  SALESPEOPLE,
  SALES_CONTACTS,
  SHIP_TO_SITES,
  loadOptions,
  WINDOWS,
  formatWindow,
  isAllTopOff,
  quoteTotal,
  totalGal,
  type BrokerOrder,
  type BrokerOrderType,
  type BrokerStatus,
  type OrderLine,
} from "./orders";

/**
 * 3PL order side sheet — chrome and rhythm from `RecordSheet`, so it is the same
 * sheet as the three Sales ones and differs only in its body.
 *
 * ONE STRUCTURAL DIFFERENCE FROM EVERY SALES SHEET, and it is the point of the
 * module: STATUS IS NOT A FIELD. `AssetOrderSheet` gives status a Select because
 * an asset order's status is its own free-standing lifecycle. A 3PL order's is
 * not — the spec defines it as the RESULT of the brokerage workflow
 * (Draft -> invite -> vendor acknowledges -> vendor submits -> accounting), so
 * offering a status picker would let the status disagree with the vendor fields
 * beside it. Instead the Delivery Partner section below renders the actions that
 * are legal from the current stage, and the status follows from taking one. The
 * same reasoning the Fuel Orders sheet uses to NOT offer a status control,
 * arrived at from the opposite direction: there status is derived from a field,
 * here it is advanced by an action.
 *
 * The transitions offered are exactly the spec's (§5.6–5.11, §5.17):
 *   Draft/Blocked   -> invite one or more vendors                  -> Assigned
 *   Assigned        -> acknowledge on the vendor's behalf           -> Accepted
 *                   -> accept a submitted quote                    -> Accepted
 *                   -> cancel the invitation                       -> Draft
 *   Accepted        -> submit delivery details on vendor's behalf   -> Completed
 *   Completed       -> mark ready for accounting                    -> Sync Ready
 *   Sync Ready      -> sync to accounting                           -> Synced
 *
 * NOT BUILT, and named rather than quietly skipped: the Activity Log (§5.4), the
 * email PREVIEW before sending an invitation (§5.6), Internal Notes (§5.4), the
 * linked Load Order (§5.3 §6, feature-flagged), and the map view of nearby
 * vendors (§5.5) — a map is a whole component the DS does not have. The vendor
 * TABLE view of the picker, which the same section offers, is what is built.
 */

/**
 * The three order flags, in one horizontal row.
 *
 * CHECKBOXES, not switches, and side by side rather than stacked. Stacked
 * toggles put the control at the far right of a WIDE sheet — a label and its
 * control most of a metre apart, which is a row you have to track across with
 * a finger. A checkbox sits against its own label, so the pair reads as one
 * thing at any sheet width.
 *
 * Three independent properties of one order, so three checkboxes rather than a
 * radio group.
 */
function FlagRow({
  flags,
}: {
  flags: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
      {flags.map((f) => (
        <label
          key={f.id}
          htmlFor={f.id}
          className="flex cursor-pointer items-center gap-2.5"
        >
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

/**
 * Add Asset — type a name OR pick a known one, in the same control.
 *
 * A plain "Custom asset 3" row named nothing real; a pure dropdown could not
 * reach an asset the site's list has not caught up with. So it is a combobox:
 * the list filters as you type, and whatever you typed stays available as its
 * own option, so a genuinely new name is one Enter away and never a
 * second-class path.
 */
function AddAssetPopover({
  known,
  onAdd,
}: {
  known: string[];
  onAdd: (name: string, product: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [product, setProduct] = React.useState(PRODUCTS[0]);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, product);
    setQuery("");
    setOpen(false);
  };

  const typedIsNew =
    query.trim().length > 0 &&
    !known.some((k) => k.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus /> Add Asset
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Type or pick an asset name…"
          />
          <CommandList>
            {typedIsNew && (
              <CommandGroup heading="New asset">
                <CommandItem value={query} onSelect={() => add(query)}>
                  <Plus />
                  Use “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Known assets">
              {known
                .filter((k) =>
                  k.toLowerCase().includes(query.trim().toLowerCase())
                )
                .map((k) => (
                  <CommandItem key={k} value={k} onSelect={() => add(k)}>
                    <Truck />
                    {k}
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandEmpty>Type a name to add it.</CommandEmpty>
          </CommandList>
        </Command>
        {/* The product is part of the line, so it is chosen here rather than
            left for someone to fix in the row afterwards. */}
        <div className="border-t border-border p-2">
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="w-full" aria-label="Product">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTS.map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A line and an asset are the same thing when name and product match. */
const assetKey = (x: { asset?: string; name?: string; product: string }) =>
  `${x.asset ?? x.name}|${x.product}`;

export interface BrokerOrderDraft {
  customer: string;
  erpId: string;
  shipTo: string;
  plannedDate: Date | null;
  windowStart: string;
  windowEnd: string;
  poNumber: string;
  orderType: BrokerOrderType;
  hub: string;
  urgent: boolean;
  signatureOnDelivery: boolean;
  lines: OrderLine[];
  status: BrokerStatus;
  vendorId: string | null;
  invitedVendorIds: string[];
  quoteRequested: boolean;
  primaryPoc: string;
  salesperson: string;
  instructions: string;
  recurring: boolean;
  recurrenceFrom: Date | null;
  recurrenceFrequency: string;
  /** ONE load order for the whole order — see the Load Order section. */
  loadTerminal?: string;
  loadSupplier?: string;
  loadAccount?: string;
}

function draftFrom(o: BrokerOrder): BrokerOrderDraft {
  const [y, m, d] = o.dateKey.split("-").map(Number);
  return {
    customer: o.customer.title,
    erpId: o.customer.description,
    shipTo: o.shipTo,
    plannedDate: new Date(y, m - 1, d),
    windowStart: o.window.start,
    windowEnd: o.window.end,
    poNumber: o.poNumber,
    orderType: o.orderType,
    hub: o.hub,
    urgent: o.urgent,
    signatureOnDelivery: o.signatureOnDelivery,
    // Copied, not shared — editing a line must not mutate the row behind the sheet.
    lines: o.lines.map((l) => ({ ...l })),
    status: o.status,
    vendorId: o.vendorId,
    invitedVendorIds: [...o.invitedVendorIds],
    quoteRequested: o.quoteRequested,
    primaryPoc: o.primaryPoc,
    salesperson: o.salesperson,
    instructions: o.instructions,
    recurring: o.kind === "Recurring",
    recurrenceFrom: o.recurrence
      ? (() => {
          const [ry, rm, rd] = o.recurrence.fromDateKey.split("-").map(Number);
          return new Date(ry, rm - 1, rd);
        })()
      : null,
    recurrenceFrequency: o.recurrence?.frequency ?? RECURRENCE_FREQUENCIES[0],
    loadTerminal: o.loadOrder?.terminal,
    loadSupplier: o.loadOrder?.supplier,
    loadAccount: o.loadOrder?.loadingAccount,
  };
}

/** A blank order. Starts in Draft with no partner — the only legal start state. */
function emptyDraft(): BrokerOrderDraft {
  return {
    customer: "",
    erpId: "",
    shipTo: "",
    plannedDate: null,
    windowStart: "8:00 AM",
    windowEnd: "12:00 PM",
    poNumber: "",
    orderType: "Core",
    recurring: false,
    recurrenceFrom: null,
    recurrenceFrequency: RECURRENCE_FREQUENCIES[0],
    hub: HUBS[0],
    urgent: false,
    signatureOnDelivery: false,
    lines: [{ asset: "", product: PRODUCTS[0], gal: null, topOff: false }],
    status: "Draft",
    vendorId: null,
    invitedVendorIds: [],
    quoteRequested: false,
    primaryPoc: "",
    salesperson: "",
    instructions: "",
  };
}

/** Compact vendor identity line — name, base, business lines, score, distance. */
function VendorRow({ id }: { id: string }) {
  const v = vendorById(id);
  if (!v) return null;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
        {!v.emailsEnabled && (
          // §6 Email Management: a vendor with emails off will never see an
          // invitation, so saying so at the point of inviting them is the whole
          // value of the flag.
          <Badge variant="destructive" className="shrink-0">
            Emails off
          </Badge>
        )}
        {!v.hasAccount && (
          <Badge variant="secondary" className="shrink-0">
            Link only
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span className="truncate">{v.base}</span>
        <span className="flex items-center gap-1 tabular-nums">
          <Shield className="size-3" /> {v.safetyScore}
        </span>
        <span className="tabular-nums">{v.distanceMi} mi</span>
        <span className="truncate">{v.businessLines.join(" · ")}</span>
      </div>
    </div>
  );
}

export interface BrokerOrderSheetProps {
  order: BrokerOrder | null;
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: BrokerOrder, draft: BrokerOrderDraft) => void;
  onCreate?: (draft: BrokerOrderDraft) => void;
  customers: string[];
  shipTos: string[];
}

export function BrokerOrderSheet({
  order,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
  customers,
  shipTos,
}: BrokerOrderSheetProps) {
  const [draft, setDraft] = React.useState<BrokerOrderDraft | null>(null);
  /** Vendors ticked in the picker but not yet invited. */
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const creating = mode === "create";

  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
    setPicked(new Set());
  }, [open, creating, order]);

  if (!draft || (!creating && !order)) return null;

  /* Read-only companions to the two people/place selects. Derived, never
     stored on the draft — a copy would be a second source of truth. */
  const site = SHIP_TO_SITES.find((x) => x.name === draft.shipTo);
  const poc = POC_DIRECTORY[draft.primaryPoc];

  const set = <K extends keyof BrokerOrderDraft>(
    key: K,
    value: BrokerOrderDraft[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  /* The assets this site has, plus anything added by hand on this order — a
     custom line is still an asset, it just is not on the site's list yet. */
  /* Plain computation, NOT useMemo: this sits after the sheet's early return,
     where a hook would be called conditionally. The lists are a handful of
     items, so memoising would buy nothing even if it were legal here. */
  const siteAssets = (() => {
    const listed = site?.assets ?? [];
    const extra = draft.lines
      .filter((l) => !listed.some((a) => assetKey(a) === assetKey(l)))
      .map((l) => ({ name: l.asset, product: l.product, rental: l.rental ?? false }));
    return [...listed, ...extra];
  })();

  /* One account serves the whole order, so the options are narrowed by every
     product on it at once. */
  const orderProducts = [...new Set(draft.lines.map((l) => l.product))];
  const load = loadOptions(orderProducts, draft.loadTerminal, draft.loadSupplier);

  const pickedCount = draft.lines.length;
  const allPicked = siteAssets.length > 0 && pickedCount === siteAssets.length;
  const somePicked = pickedCount > 0 && !allPicked;
  const allTopOff = pickedCount > 0 && draft.lines.every((l) => l.topOff);

  const lineFor = (a: { name: string; product: string; rental: boolean }): OrderLine => ({
    asset: a.name,
    product: a.product,
    gal: null,
    topOff: allTopOff,
    rental: a.rental,
  });

  const pickAsset = (
    a: { name: string; product: string; rental: boolean },
    on: boolean
  ) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: on
              ? [...d.lines, lineFor(a)]
              : d.lines.filter((l) => assetKey(l) !== assetKey(a)),
          }
        : d
    );

  const pickAll = (on: boolean) =>
    setDraft((d) => (d ? { ...d, lines: on ? siteAssets.map(lineFor) : [] } : d));

  /* Top Off applies to the ORDERED lines only — it is a property of what is
     being delivered, not of the site's inventory. Turning it on clears the
     quantities it would contradict. */
  const setAllTopOff = (on: boolean) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: d.lines.map((l) => ({ ...l, topOff: on, gal: on ? null : l.gal })),
          }
        : d
    );

  const setGal = (a: { name: string; product: string }, gal: number | null) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: d.lines.map((l) =>
              assetKey(l) === assetKey(a) ? { ...l, gal } : l
            ),
          }
        : d
    );

  /* An asset the site's list does not carry yet — named, never blank, because
     an anonymous row is a row nobody can act on. */
  const addAsset = (name: string, product: string) =>
    setDraft((d) =>
      d && !d.lines.some((l) => assetKey(l) === `${name}|${product}`)
        ? {
            ...d,
            lines: [...d.lines, { asset: name, product, gal: null, topOff: false }],
          }
        : d
    );

  /* Refresh drops any line the site's list no longer carries — which means it
     DELETES WORK. It asks first, and only when there is something to lose:
     confirming a no-op teaches people to dismiss the dialog without reading. */
  const strayLines = draft.lines.filter(
    (l) => !(site?.assets ?? []).some((a) => assetKey(a) === assetKey(l))
  );

  const refreshAssets = () =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: d.lines.filter((l) =>
              (site?.assets ?? []).some((a) => assetKey(a) === assetKey(l))
            ),
          }
        : d
    );


  const isMovement = order?.kind === "Movement";
  const gal = totalGal(draft.lines);
  const quotes = order?.quotes ?? [];

  /**
   * The picker offers only partners that run the line of business this order
   * needs — §5.5 makes Business Lines a filter on the vendor table for exactly
   * this reason. Offering the full list let a bulk fuel order be sent to a
   * carrier whose only line is Asset Movement.
   */
  const requiredLine = isMovement ? "Asset Movement" : "Bulk Fuel";
  const eligible = VENDORS.filter((v) =>
    v.businessLines.some((b) => b === requiredLine)
  );

  /* ── Workflow transitions. Each one moves the status AND the vendor fields
        together, so the pair cannot end up contradicting itself. ─────────── */
  const invite = () =>
    setDraft((d) =>
      d
        ? { ...d, status: "Assigned", invitedVendorIds: [...picked], vendorId: null }
        : d
    );
  const cancelInvites = () =>
    setDraft((d) =>
      d ? { ...d, status: "Draft", invitedVendorIds: [], vendorId: null } : d
    );
  const acceptFor = (vendorId: string) =>
    setDraft((d) => (d ? { ...d, status: "Accepted", vendorId } : d));
  const advance = (status: BrokerStatus) =>
    setDraft((d) => (d ? { ...d, status } : d));

  const preVendor = draft.status === "Draft" || draft.status === "Blocked";
  const canSubmit =
    draft.customer.trim() !== "" &&
    draft.shipTo.trim() !== "" &&
    draft.plannedDate !== null;

  return (
    <RecordSheet
      /* Two tables live in this sheet; 560px cannot hold five columns. */
      size="wide"
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Order #: ${order?.orderNo ?? ""}`}
      createTitle="Create Delivery Order"
      createAction="Create Order"
      canSubmit={canSubmit}
      headerAside={
        <div className="flex items-center gap-2">
          <StatusChip tone={BROKER_STATUS_TONE[draft.status]} variant="soft">
            {draft.status}
          </StatusChip>
          {draft.urgent && <Badge variant="destructive">Urgent</Badge>}
        </div>
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
        else if (order) onSave(order, draft);
      }}
    >
      {/* §5.2 — a blocked order is blocked for a REASON, and the reason is what
          the broker has to act on. It leads the sheet rather than hiding in a
          field. `soft`/destructive treatment per the DS's noticing rule. */}
      {order?.blockedReason && (
        <div className="flex items-start gap-2 rounded-md border border-status-failed/30 bg-status-failed/10 p-3">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-failed" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              Blocked on credit — {order.blockedReason}
            </span>
            <span className="text-xs text-muted-foreground">
              A blocked order cannot be sent to a vendor. Clear the credit hold in
              Settings, then invite a delivery partner.
            </span>
          </div>
        </div>
      )}

      <SheetSection className="gap-5" title="Basic Details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer" required>
            <Select value={draft.customer} onValueChange={(v) => set("customer", v)}>
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
          <SheetField label="ShipTo" required>
            <Select value={draft.shipTo} onValueChange={(v) => set("shipTo", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ShipTo" />
              </SelectTrigger>
              <SelectContent>
                {shipTos.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Derived from the ship-to, so it is READ-ONLY. An editable copy of a
              site's coordinates is a second source of truth for the same fact. */}
          <SheetField label="Latitude / Longitude">
            <Input value={site?.latLng ?? "NA"} readOnly />
          </SheetField>
          <SheetField label="PO number">
            <Input
              value={draft.poNumber}
              placeholder="Enter PO Number"
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </SheetField>
          {/* The reference's name for the order-type field. One field, one
              label — not a second select offering the same values. */}
          <SheetField label="Listing Type" required>
            <Select
              value={draft.orderType}
              onValueChange={(v) => set("orderType", v as BrokerOrderType)}
              disabled={isMovement}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Listing Type" />
              </SelectTrigger>
              <SelectContent>
                {LISTING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
        </div>
      </SheetSection>

      {/* The people on the order, together. POC and salesperson were split
          across two places; they answer the same question — who to call. */}
      <SheetSection className="gap-5" title="POC Details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="POC Name" required>
            <Select
              value={draft.primaryPoc}
              onValueChange={(v) => set("primaryPoc", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select POC Name" />
              </SelectTrigger>
              <SelectContent>
                {POCS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
          <SheetField label="POC Contact">
            <Input value={poc?.phone ?? "—"} readOnly />
          </SheetField>
          <SheetField label="POC Email">
            <Input value={poc?.email ?? "—"} readOnly />
          </SheetField>
          <SheetField label="Sales Person" required>
            <Select
              value={draft.salesperson}
              onValueChange={(v) => set("salesperson", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Sales Person" />
              </SelectTrigger>
              <SelectContent>
                {SALESPEOPLE.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
          <SheetField label="Sales Contact">
            <Input value={SALES_CONTACTS[draft.salesperson] ?? "—"} readOnly />
          </SheetField>
        </div>
      </SheetSection>

      <SheetSection className="gap-5" title="Schedule Details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Planned Delivery Date" required>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon />
                  {draft.plannedDate
                    ? DATE_FMT.format(draft.plannedDate)
                    : "Select date"}
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

          {/* ONE control, not a start and an end. The window is picked from the
              set the operation actually runs, so a start without a matching end
              — or a backwards pair — is unrepresentable rather than merely
              discouraged. The stored shape stays {start, end}. */}
          <SheetField label="Delivery Window" required>
            <Select
              value={`${draft.windowStart}|${draft.windowEnd}`}
              onValueChange={(v) => {
                const [start, end] = v.split("|");
                set("windowStart", start);
                set("windowEnd", end);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Delivery Window" />
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((w) => (
                  <SelectItem key={`${w.start}|${w.end}`} value={`${w.start}|${w.end}`}>
                    {formatWindow(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SheetField>
        </div>

        <FlagRow
          flags={[
            {
              id: "urgent",
              label: "Mark as an Urgent Order",
              checked: draft.urgent,
              onChange: (v) => set("urgent", v),
            },
            {
              id: "signature",
              label: "Get signature on Delivery",
              checked: draft.signatureOnDelivery,
              onChange: (v) => set("signatureOnDelivery", v),
            },
            {
              id: "recurring",
              label: "Mark as Recurring Order",
              checked: draft.recurring,
              onChange: (v) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        recurring: v,
                        // Seed the cadence from the delivery date, which is the
                        // answer in almost every case; clear it when switched
                        // off so a stale schedule cannot survive.
                        recurrenceFrom: v
                          ? (d.recurrenceFrom ?? d.plannedDate)
                          : null,
                      }
                    : d
                ),
            },
          ]}
        />

        {/* Revealed by the checkbox, because a cadence with nothing recurring is
            a question about nothing. */}
        {draft.recurring && (
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Recurrence from Date" required>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
                    <CalendarIcon />
                    {draft.recurrenceFrom
                      ? DATE_FMT.format(draft.recurrenceFrom)
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={draft.recurrenceFrom ?? undefined}
                    onSelect={(d) => set("recurrenceFrom", d ?? null)}
                  />
                </PopoverContent>
              </Popover>
            </SheetField>
            <SheetField label="Frequency" required>
              <Select
                value={draft.recurrenceFrequency}
                onValueChange={(v) => set("recurrenceFrequency", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SheetField>
          </div>
        )}

      </SheetSection>

      {/* §5.20 — movement orders show Asset instead of the product sections, and
          the asset is FIXED once the order is created. Read-only is the honest
          rendering of a field that cannot be changed. */}
      {isMovement && order?.movement && (
        <SheetSection className="gap-5" title="Asset">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Direction">
              <Input value={order.movement.direction} readOnly />
            </SheetField>
            <SheetField label="Yard">
              <Input value={order.movement.yard} readOnly />
            </SheetField>
            <SheetField label="Tank Type">
              <Input value={order.movement.tankType} readOnly />
            </SheetField>
            <SheetField label="Capacity">
              <Input value={`${order.movement.capacityGal} gal`} readOnly />
            </SheetField>
          </div>
          <p className="text-xs text-muted-foreground">
            One asset per movement order, fixed after creation. Peripherals and
            custom items are not built in this pass.
          </p>
        </SheetSection>
      )}

      {!isMovement && (
        <SheetSection
          className="gap-5"
          title="Delivery Order"
          action={
            <div className="flex items-center gap-1">
              <AddAssetPopover known={ALL_ASSET_NAMES} onAdd={addAsset} />
              {/* Icon only — the label is a tooltip and an aria-label, so the
                  action keeps its name for a screen reader and for anyone who
                  hovers, without a second word-pair competing with Add Asset. */}
              {strayLines.length === 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Refresh assets"
                      onClick={refreshAssets}
                    >
                      <RefreshCw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh assets</TooltipContent>
                </Tooltip>
              ) : (
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Refresh assets"
                        >
                          <RefreshCw />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Refresh assets</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove {strayLines.length}{" "}
                        {strayLines.length === 1 ? "line" : "lines"} from this
                        order?
                      </AlertDialogTitle>
                      {/* Names them. "Some lines will be removed" makes the
                          reader guess which, and guessing is how people lose
                          the one they cared about. */}
                      <AlertDialogDescription>
                        Refreshing re-reads the assets at {draft.shipTo}. These
                        are not on its list and will be dropped:{" "}
                        {strayLines.map((l) => l.asset).join(", ")}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={refreshAssets}>
                        Refresh anyway
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          }
        >
          {/* The assets are the SITE'S. Without a site there is nothing to
              list, and asking someone to type an asset name — which is what
              this section used to do — invents inventory that does not exist. */}
          {!draft.shipTo ? (
            <Empty className="rounded-md border border-fp-outline-1 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Truck />
                </EmptyMedia>
                <EmptyDescription>
                  Please select a customer and ShipTo to view available assets.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-hidden rounded-md border border-fp-outline-1">
              <Table>
                <TableHeader>
                  <TableRow className="h-10 hover:bg-transparent">
                    <TableHead className="w-10 px-3">
                      <Checkbox
                        checked={allPicked ? true : somePicked ? "indeterminate" : false}
                        onCheckedChange={(c) => pickAll(c === true)}
                        aria-label="Select all assets"
                      />
                    </TableHead>
                    {/* One toggle for the whole order, not one per row: "fill
                        every tank" is a single decision a dispatcher makes, and
                        it only applies to the lines actually ordered. */}
                    <TableHead className="px-0">
                      <label
                        htmlFor="topoff-all"
                        className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground"
                      >
                        Top Off
                        <Switch
                          id="topoff-all"
                          checked={allTopOff}
                          onCheckedChange={setAllTopOff}
                        />
                      </label>
                    </TableHead>
                    <TableHead className="px-3 text-right text-xs font-medium text-muted-foreground">
                      Order
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteAssets.map((a) => {
                    const key = assetKey(a);
                    const line = draft.lines.find((l) => assetKey(l) === key);
                    const on = Boolean(line);
                    return (
                      <TableRow key={key} className="h-12 hover:bg-transparent">
                        <TableCell className="px-3">
                          <Checkbox
                            checked={on}
                            onCheckedChange={(c) => pickAsset(a, c === true)}
                            aria-label={`${a.name} – ${a.product}`}
                          />
                        </TableCell>
                        <TableCell className="px-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <Truck className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm text-foreground">
                              {a.name} – {a.product}
                            </span>
                            {/* Neutral, per the DS's colour governance: nothing
                                binds a meaning to a hue here yet. */}
                            {a.rental && (
                              <Badge variant="secondary" className="shrink-0">
                                Rental Asset
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {/* Same borderless cell as the Load Order's selects:
                            the table draws the grid, so a bordered input inside
                            a bordered cell is the second border. */}
                        <TableCell className="relative w-40 p-0">
                          <TableCellInput
                            value={
                              line?.topOff
                                ? ""
                                : line?.gal != null
                                  ? String(line.gal)
                                  : ""
                            }
                            placeholder={line?.topOff ? "Top-off" : "0"}
                            disabled={!on || Boolean(line?.topOff)}
                            numeric
                            suffix="gal"
                            aria-label={`Gallons for ${a.name}`}
                            onChange={(v) =>
                              setGal(a, Number(v.replace(/[^0-9]/g, "")) || null)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Qty is never an input — it is the sum of the ordered lines. Same
              rule the Fuel Orders sheet holds to. */}
          {draft.lines.length > 0 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums text-foreground">
                {isAllTopOff(draft.lines) ? "Top-off" : `${gal.toLocaleString()} gal`}
              </span>
            </div>
          )}
        </SheetSection>
      )}

      {/* Load Order — where the WHOLE order is drawn from. ONE account, not one
          per line: a truck loads once, so a line-by-line account described a
          dispatch that does not happen. The product/quantity list is not
          repeated here either; the Delivery Order above already is it. */}
      {!isMovement && (
        <SheetSection className="gap-5" title="Load Order">
          {draft.lines.length === 0 ? (
            <Empty className="rounded-md border border-fp-outline-1 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Layers />
                </EmptyMedia>
                <EmptyDescription>
                  Please fill delivery requirements to add load order details.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : load.impossible ? (
            /* Not a dead set of empty dropdowns — say WHY there is nothing to
               pick, and name the products that cannot share an account. */
            <Empty className="rounded-md border border-fp-outline-1 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleAlert />
                </EmptyMedia>
                <EmptyTitle>No account covers this order</EmptyTitle>
                <EmptyDescription>
                  One account loads the whole order, and none carries all of{" "}
                  {orderProducts.join(", ")}. Split the order, or drop a product.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <SheetField label="Terminal" required>
                <Select
                  value={draft.loadTerminal ?? ""}
                  onValueChange={(v) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            loadTerminal: v,
                            /* Clears what sits below it: a supplier the new
                               terminal does not serve is a combination that
                               cannot be loaded. */
                            loadSupplier: undefined,
                            loadAccount: undefined,
                          }
                        : d
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Terminal" />
                  </SelectTrigger>
                  <SelectContent>
                    {load.terminals.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SheetField>
              <SheetField label="Supplier" required>
                <Select
                  value={draft.loadSupplier ?? ""}
                  onValueChange={(v) =>
                    setDraft((d) =>
                      d ? { ...d, loadSupplier: v, loadAccount: undefined } : d
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {load.suppliers.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SheetField>
              <SheetField label="Loading Account" required>
                <Select
                  value={draft.loadAccount ?? ""}
                  onValueChange={(v) => set("loadAccount", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {load.accounts.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SheetField>
            </div>
          )}
        </SheetSection>
      )}

      {/* ── The 3PL section. Everything above exists on a first-party order
             too; this is what makes the order brokered. ─────────────────── */}
      <SheetSection className="gap-5" title="Delivery Partner">
        {preVendor && (
          <>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="quote"
                className="flex flex-col gap-0.5 text-sm font-medium text-foreground"
              >
                Request a quote
                <span className="text-xs font-normal text-muted-foreground">
                  Invited partners submit pricing instead of a plain
                  acknowledgement.
                </span>
              </label>
              <Switch
                id="quote"
                checked={draft.quoteRequested}
                onCheckedChange={(v) => set("quoteRequested", v)}
              />
            </div>

            {/* The action sits ON the label row, not under the list: it acts on
                the whole picker, so it belongs to the picker's heading rather
                than trailing 300px of scrollable list. Ghost, because the
                sheet's one filled button is Save. */}
            <SheetField
              label={
                <span className="flex items-center justify-between gap-4">
                  Invite partners
                  <Button
                    variant="ghost"
                    size="sm"
                    // A blocked order cannot be dispatched at all (§5, Credit
                    // Limit Management), so the action is unavailable rather
                    // than failing after the click.
                    disabled={picked.size === 0 || draft.status === "Blocked"}
                    onClick={invite}
                  >
                    <Mail />
                    Invite
                    {picked.size > 1 && ` ${picked.size}`}
                  </Button>
                </span>
              }
              description={`Showing partners that run ${requiredLine}. All invited partners are notified at the same time; whichever accepts first is assigned the order, and the rest are told it is no longer available.`}
            >
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border border-fp-outline-1 p-1">
                {eligible.map((v) => (
                  <label
                    key={v.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-sm p-2 transition-colors hover:bg-accent has-[:focus-visible]:bg-accent"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={picked.has(v.id)}
                      onCheckedChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(v.id)) next.delete(v.id);
                          else next.add(v.id);
                          return next;
                        })
                      }
                    />
                    <VendorRow id={v.id} />
                  </label>
                ))}
              </div>
            </SheetField>

          </>
        )}

        {draft.status === "Assigned" && (
          <>
            <p className="text-xs text-muted-foreground">
              Out for acknowledgement. Nobody has accepted yet.
            </p>
            <div className="flex flex-col gap-2">
              {draft.invitedVendorIds.map((id) => {
                const quote = quotes.find((q) => q.vendorId === id);
                return (
                  <div
                    key={id}
                    className="flex flex-col gap-2 rounded-md border border-fp-outline-1 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <VendorRow id={id} />
                    </div>
                    {draft.quoteRequested && (
                      <div className="flex items-center justify-between gap-3 border-t border-fp-outline-1 pt-2">
                        {quote ? (
                          <span className="text-xs tabular-nums text-foreground">
                            {quote.fee !== undefined ? (
                              <>
                                Fee ${quote.fee} + tax ${quote.tax} ={" "}
                                <span className="font-medium">
                                  ${quoteTotal(quote, gal).toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <>
                                ${quote.ratePerGal}/gal + ${quote.serviceCharge} ={" "}
                                <span className="font-medium">
                                  $
                                  {quoteTotal(quote, gal).toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No pricing submitted yet
                          </span>
                        )}
                        <Button
                          size="xs"
                          disabled={!quote}
                          onClick={() => acceptFor(id)}
                        >
                          <Check /> Accept quote
                        </Button>
                      </div>
                    )}
                    {!draft.quoteRequested && (
                      <div className="flex items-center justify-end gap-2 border-t border-fp-outline-1 pt-2">
                        <Button variant="outline" size="xs" onClick={() => acceptFor(id)}>
                          <Check /> Acknowledge for them
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={cancelInvites}>
              <ThumbsDown /> Cancel invitation
            </Button>
          </>
        )}

        {!preVendor && draft.status !== "Assigned" && draft.vendorId && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-fp-outline-1 p-3">
              <Check className="mt-0.5 size-4 shrink-0 text-status-success" />
              <VendorRow id={draft.vendorId} />
            </div>
            {(() => {
              const q = quotes.find((x) => x.vendorId === draft.vendorId);
              if (!q) return null;
              return (
                <SheetField label="Accepted pricing">
                  <p className="text-sm tabular-nums text-foreground">
                    {q.fee !== undefined
                      ? `Fee $${q.fee} + tax $${q.tax} = $${quoteTotal(q, gal).toLocaleString()}`
                      : `$${q.ratePerGal}/gal + $${q.serviceCharge} service = $${quoteTotal(
                          q,
                          gal
                        ).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  </p>
                </SheetField>
              );
            })()}
            {draft.status === "Accepted" && (
              <Button variant="outline" onClick={() => advance("Completed")}>
                Submit delivery details for them
              </Button>
            )}
            {draft.status === "Completed" && (
              <Button
                variant="outline"
                onClick={() => advance("Accounting Sync Ready")}
              >
                Mark ready for accounting
              </Button>
            )}
            {draft.status === "Accounting Sync Ready" && (
              <Button variant="outline" onClick={() => advance("Accounting Synced")}>
                Sync to accounting
              </Button>
            )}
            {draft.status === "Accounting Synced" && (
              <p className="text-xs text-muted-foreground">
                Synced. Every field is locked once an order reaches this stage.
              </p>
            )}
          </>
        )}
      </SheetSection>

      <SheetSection className="gap-5" title="Additional Details">
        <SheetField label="Upload Supporting Image">
          {/* The DS control in its `field` variant — dropzone, note, and only
              the files actually added. The showcase variant's seeded chips and
              permanent "Uploading 2 of 3" block belong to the gallery. */}
          <FileUpload
            variant="field"
            label="Choose a file to upload"
            note="Note: for best results, use .JPG, .GIF, or .PNG images."
          />
        </SheetField>
        <SheetField label="Delivery Instructions">
          <Textarea
            value={draft.instructions}
            placeholder="Enter any delivery instructions here"
            onChange={(e) => set("instructions", e.target.value)}
          />
        </SheetField>
      </SheetSection>
    </RecordSheet>
  );
}
