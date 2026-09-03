import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CircleAlert,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Shield,
  ThumbsDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { CopyValue } from "@/components/ui/copy-value";
import { StatusChip } from "@/components/ui/status-chip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  SheetField,
  SheetSection,
  SheetSectionNote,
} from "@/components/side-sheet/parts";
import { BulkActionBar } from "@/components/tables-layout";
import { FileUpload } from "@/components/form-layout/FileUpload";
import {
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import { RecordSheet } from "../RecordSheet";
import { DATE_FMT } from "../data";
import { VENDORS, vendorById } from "./vendors";
import {
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

const REPEAT_UNITS = ["Days", "Weeks", "Months", "Years"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Custom Recurrence — the rule builder behind the "Custom" frequency.
 *
 * It is a DIALOG rather than five more fields in the sheet: every common
 * cadence is one pick from the list, and only the uncommon one needs an
 * interval, a set of days and an end condition. Putting those in the form
 * would tax every order with the rarest case.
 *
 * It returns a SENTENCE, not a structure — the sheet shows the rule back in
 * words, which is the only form anyone checks a schedule in.
 */
function CustomRecurrenceDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (summary: string) => void;
}) {
  const [every, setEvery] = React.useState(1);
  const [unit, setUnit] = React.useState(REPEAT_UNITS[2]);
  const [days, setDays] = React.useState<Set<string>>(new Set(["Th"]));
  const [ends, setEnds] = React.useState<"never" | "on" | "after">("never");
  const [endsOn, setEndsOn] = React.useState<Date | null>(null);
  const [occurrences, setOccurrences] = React.useState(5);

  const summary = () => {
    const dayPart = days.size > 0 ? ` on ${[...days].join(", ")}` : "";
    const endPart =
      ends === "on" && endsOn
        ? `, until ${DATE_FMT.format(endsOn)}`
        : ends === "after"
          ? `, ${occurrences} times`
          : "";
    return `Every ${every} ${unit.toLowerCase()}${dayPart}${endPart}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Custom recurrence</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <SheetField label="Repeat every" required>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={every}
                aria-label="Repeat interval"
                className="w-24 tabular-nums"
                onChange={(e) => setEvery(Math.max(1, Number(e.target.value) || 1))}
              />
              <Combobox
                className="flex-1"
                value={unit}
                onValueChange={setUnit}
                options={[...REPEAT_UNITS]}
                aria-label="Repeat unit"
              />
            </div>
          </SheetField>

          {/* Seven toggles, not a multi-select: the whole week fits on one row,
              so the options are cheaper to show than to hide behind a list. */}
          <SheetField label="Repeat on" description="Click a day to select or deselect it.">
            <div className="flex gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = days.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDays((prev) => {
                        const next = new Set(prev);
                        if (next.has(d)) next.delete(d);
                        else next.add(d);
                        return next;
                      })
                    }
                    className={cn(
                      "size-9 rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </SheetField>

          <SheetField label="Ends" required>
            <RadioGroup
              value={ends}
              onValueChange={(v) => setEnds(v as typeof ends)}
              className="gap-3"
            >
              <label htmlFor="ends-never" className="flex cursor-pointer items-center gap-2.5">
                <RadioGroupItem id="ends-never" value="never" />
                <span className="text-sm">Never</span>
              </label>
              <label htmlFor="ends-on" className="flex cursor-pointer items-center gap-2.5">
                <RadioGroupItem id="ends-on" value="on" />
                <span className="text-sm">On</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ends !== "on"}
                      className="ml-1 font-normal"
                    >
                      <CalendarIcon />
                      {endsOn ? DATE_FMT.format(endsOn) : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endsOn ?? undefined}
                      onSelect={(d) => setEndsOn(d ?? null)}
                    />
                  </PopoverContent>
                </Popover>
              </label>
              <label htmlFor="ends-after" className="flex cursor-pointer items-center gap-2.5">
                <RadioGroupItem id="ends-after" value="after" />
                <span className="text-sm">After</span>
                <Input
                  type="number"
                  min={1}
                  value={occurrences}
                  disabled={ends !== "after"}
                  aria-label="Occurrences"
                  className="ml-1 h-8 w-24 tabular-nums"
                  onChange={(e) =>
                    setOccurrences(Math.max(1, Number(e.target.value) || 1))
                  }
                />
                <span className="text-sm text-muted-foreground">occurrences</span>
              </label>
            </RadioGroup>
          </SheetField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(summary());
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  /**
   * Which INVITED partners are being asked for a price. Selection, not the
   * mode — `quoteRequested` is the mode. Every partner is added here when
   * invited, so the common case ("price from everyone") needs no clicks.
   */
  quoteVendorIds: string[];
  primaryPoc: string;
  salesperson: string;
  instructions: string;
  recurring: boolean;
  recurrenceFrom: Date | null;
  recurrenceFrequency: string;
  /** A human summary of the custom rule, e.g. "Every 3 months on Thu, ends after 5". */
  customRecurrence?: string;
  /**
   * The load order, once created. `null` means "not created" — it is optional,
   * so its absence has to be distinguishable from an empty one.
   */
  loadRows:
    | {
        product: string;
        terminal?: string;
        supplier?: string;
        loadingAccount?: string;
        /**
         * Set aside, not deleted. The row's product is still on the order, so
         * deleting it would only make it reappear blank on the next render;
         * excluded keeps what was already chosen and leaves the way back open.
         */
        excluded?: boolean;
      }[]
    | null;
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
    quoteVendorIds: [...o.invitedVendorIds],
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
    loadRows: o.loadOrder ? o.loadOrder.map((r) => ({ ...r })) : null,
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
    loadRows: null,
    hub: HUBS[0],
    urgent: false,
    signatureOnDelivery: false,
    lines: [{ asset: "", product: PRODUCTS[0], gal: null, topOff: false }],
    status: "Draft",
    vendorId: null,
    invitedVendorIds: [],
    quoteRequested: false,
    quoteVendorIds: [],
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
  const [customOpen, setCustomOpen] = React.useState(false);
  const creating = mode === "create";

  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
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

  /* The assets this site has, plus anything already on the order that its list
     does not carry — a line added by hand is still an asset to offer. */
  /* One row per distinct product actually on the order. Two assets carrying
     the same product load once, together. */
  const orderProducts = [...new Set(draft.lines.filter((l) => l.asset).map((l) => l.product))];

  /* Rows follow the products: created rows for products still on the order,
     plus a blank row for any product added since. A product dropped from the
     delivery order takes its load row with it — a loading account for a
     product nobody ordered answers no question. */
  const loadRows = draft.loadRows
    ? orderProducts.map(
        (pr) =>
          draft.loadRows?.find((r) => r.product === pr) ?? { product: pr }
      )
    : null;

  const setLoadRow = (product: string, patch: Partial<NonNullable<typeof loadRows>[number]>) =>
    setDraft((d) =>
      d && d.loadRows
        ? {
            ...d,
            loadRows: (d.loadRows.some((r) => r.product === product)
              ? d.loadRows
              : [...d.loadRows, { product }]
            ).map((r) => (r.product === product ? { ...r, ...patch } : r)),
          }
        : d
    );

  const siteAssets = (() => {
    const listed = site?.assets ?? [];
    const extra = draft.lines
      .filter((l) => l.asset && !listed.some((a) => a.name === l.asset))
      .map((l) => ({ name: l.asset, product: l.product, rental: l.rental ?? false }));
    return [...listed, ...extra];
  })();

  /* A blank row is not an asset. The total and the load order both key off
     lines that actually name one. */
  const namedLines = draft.lines.filter((l) => l.asset);
  const hasAssets = namedLines.length > 0;

  const setLine = (i: number, patch: Partial<OrderLine>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: d.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)),
          }
        : d
    );

  const addBlankLine = () =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: [
              ...d.lines,
              { asset: "", product: PRODUCTS[0], gal: null, topOff: false },
            ],
          }
        : d
    );

  const removeLine = (i: number) =>
    setDraft((d) =>
      d ? { ...d, lines: d.lines.filter((_, k) => k !== i) } : d
    );

  /* TOP OFF IS THE CHECKBOX, not a mode over a selection. A switch above the
     table meant the same tick could mean two different things depending on
     something else's state; as a column it means one thing, always: fill this
     asset, so its quantity is not a number anyone types. */
  const setTopOff = (i: number, on: boolean) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            /* The typed number is KEPT while the box is ticked, so unticking
               hands it back rather than making someone retype what a misclick
               threw away. `totalGal` ignores it, so it cannot leak into the
               sum. */
            lines: d.lines.map((l, k) => (k === i ? { ...l, topOff: on } : l)),
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
  /* THE PARTNER TABLE'S ROWS. `invitedVendorIds` doubles as the row list, with
     `""` standing for a row that exists but has not been filled in yet — the
     same shape the Delivery Order uses for a blank asset line. It keeps "what
     is on the table" and "who is invited" as one list rather than two that can
     disagree. */
  const partnerRows = draft.invitedVendorIds;
  const invitedIds = partnerRows.filter(Boolean);
  /** Only what can still be added — an invited partner is not an option. */
  const uninvited = eligible.filter((v) => !invitedIds.includes(v.id));

  /* ── Workflow transitions. Each one moves the status AND the vendor fields
        together, so the pair cannot end up contradicting itself. ─────────── */
  /** A blank row, ready for its first cell to be filled. */
  const addPartnerRow = () =>
    setDraft((d) =>
      d ? { ...d, invitedVendorIds: [...d.invitedVendorIds, ""] } : d
    );

  /* Naming the partner in a row is the whole of adding it: every other column
     is that partner's own record, so it follows rather than being typed. */
  const setPartnerAt = (i: number, id: string) =>
    setDraft((d) => {
      if (!d) return d;
      const prev = d.invitedVendorIds[i];
      const next = [...d.invitedVendorIds];
      next[i] = id;
      return {
        ...d,
        invitedVendorIds: next,
        // Selected by default — the common case is asking everyone.
        quoteVendorIds: [
          ...new Set([...d.quoteVendorIds.filter((x) => x !== prev), id]),
        ],
        status: next.some(Boolean) ? "Assigned" : "Draft",
        vendorId: null,
      };
    });

  /** Withdrawing invitations, by row, not the whole round. */
  const removePartnerRows = (rows: number[]) =>
    setDraft((d) => {
      if (!d) return d;
      const drop = new Set(rows);
      const gone = new Set(rows.map((i) => d.invitedVendorIds[i]));
      const next = d.invitedVendorIds.filter((_, i) => !drop.has(i));
      return {
        ...d,
        invitedVendorIds: next,
        quoteVendorIds: d.quoteVendorIds.filter((x) => !gone.has(x)),
        status: next.some(Boolean) ? d.status : "Draft",
        vendorId: gone.has(d.vendorId ?? "") ? null : d.vendorId,
      };
    });

  const setQuoteFor = (id: string, on: boolean) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            quoteVendorIds: on
              ? [...new Set([...d.quoteVendorIds, id])]
              : d.quoteVendorIds.filter((x) => x !== id),
          }
        : d
    );
  const acceptFor = (vendorId: string) =>
    setDraft((d) => (d ? { ...d, status: "Accepted", vendorId } : d));
  const advance = (status: BrokerStatus) =>
    setDraft((d) => (d ? { ...d, status } : d));

  /* THE TABLE'S SELECTION. One set, read by two things: the quote switch (a
     mode over it, exactly like "Top off selected") and the bulk actions. A
     second, transient selection alongside it would let the two disagree about
     what "these partners" means. */
  const selectedRows = partnerRows
    .map((id, i) => (id && draft.quoteVendorIds.includes(id) ? i : -1))
    .filter((i) => i !== -1);
  const headerChecked: boolean | "indeterminate" =
    invitedIds.length > 0 && selectedRows.length === invitedIds.length
      ? true
      : selectedRows.length > 0
        ? "indeterminate"
        : false;
  const selectAllPartners = (on: boolean) =>
    setDraft((d) => (d ? { ...d, quoteVendorIds: on ? [...invitedIds] : [] } : d));
  /** Pricing only exists once it has been asked for and sent out. */
  const showQuoteCol = draft.quoteRequested && draft.status === "Assigned";

  /* Inviting stays available until somebody has ACCEPTED — that is the point
     at which the order has a partner and more invitations mean nothing. */
  const accepted = Boolean(draft.vendorId);
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
      /* Decisions about the delivery itself, taken at the moment of committing
         — so they stay in view however far the body has scrolled. */
      footerAside={
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
          ]}
        />
      }
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
        {/* The selects and the facts they produce are ONE unit, so they sit
            4px apart while the section's own rhythm stays 20px. A full field
            gap between them would read as the next question rather than the
            answer to the last one. */}
        <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer" required>
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
          <SheetField label="ShipTo" required>
            {/* A customer can have anywhere from ten to a hundred ship-tos, so
                this is the field that most needs typing rather than scrolling. */}
            <Combobox
              className="w-full"
              value={draft.shipTo}
              onValueChange={(v) => set("shipTo", v)}
              options={shipTos}
              placeholder="Select ShipTo"
              searchPlaceholder="Search ship-tos…"
              emptyText="No ship-to found."
            />
          </SheetField>
        </div>

        {/* The ship-to's own facts, as a READ-OUT rather than fields. They are
            the consequence of the two selects above — never typed, never
            editable — so they are shown, not offered.

            ONE LINE, because the sheet is wide enough to hold it and a location
            is read as a single string. Stacked, the three fragments looked like
            three separate values; inline, with the coordinates set off by a
            divider, it reads as one place. It wraps rather than truncates on a
            narrow sheet — an address with its tail cut off is worse than an
            address on two lines. */}
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
              Select a ShipTo to see its coordinates and address.
            </span>
          )}
        </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SheetField label="PO number">
            <Input
              value={draft.poNumber}
              placeholder="Enter PO Number"
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </SheetField>
          {/* Admin-configured in the product — the values below are the ones
              the reference shows; the final list is still to come. */}
          <SheetField label="Listing Type" required>
            <Combobox
              className="w-full"
              value={draft.orderType}
              onValueChange={(v) => set("orderType", v as BrokerOrderType)}
              disabled={isMovement}
              options={[...LISTING_TYPES]}
              placeholder="Select Listing Type"
              searchPlaceholder="Search types…"
            />
          </SheetField>
        </div>
      </SheetSection>

      {/* The people on the order, together. POC and salesperson were split
          across two places; they answer the same question — who to call. */}
      <SheetSection className="gap-5" title="POC Details">
        {/* One person per row: name and the two ways to reach them read as a
            single fact, so they sit side by side rather than wrapping over two
            rows with the contact detached from whose it is. */}
        <div className="grid grid-cols-3 gap-4">
          <SheetField label="POC Name" required>
            <Combobox
              className="w-full"
              value={draft.primaryPoc}
              onValueChange={(v) => set("primaryPoc", v)}
              options={[...POCS]}
              placeholder="Select POC Name"
              searchPlaceholder="Search contacts…"
              emptyText="No contact found."
            />
          </SheetField>
          {/* NOT FIELDS. The contact and the email are the chosen person's own
              record arriving with them — the same relationship the ship-to card
              above has to Customer and ShipTo, so it gets the same treatment: a
              read-out card, not two disabled inputs pretending to be editable.
              It sits BESIDE the name rather than under it, because it is that
              name's answer, and each value carries its own copy button — a
              number goes to a dialler, an address goes to a mail client, and one
              control over the pair would hand over both. */}
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
              <span className="text-sm text-muted-foreground">
                Select a POC to see their contact and email.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Optional: an order can be raised before anyone owns it. */}
          <SheetField label="Sales Person">
            <Combobox
              className="w-full"
              value={draft.salesperson}
              onValueChange={(v) => set("salesperson", v)}
              options={[...SALESPEOPLE]}
              placeholder="Select Sales Person"
              searchPlaceholder="Search people…"
              emptyText="No one found."
            />
          </SheetField>
          {/* Same shape, and the SAME GRID as the POC row above — a field that
              asks for the same kind of thing should be the same size, and two
              read-out cards side by side that differ in width read as two
              different kinds of card. */}
          <div className="col-span-2 flex h-9 items-center gap-3 self-end overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {SALES_CONTACTS[draft.salesperson] ? (
              <CopyValue
                value={SALES_CONTACTS[draft.salesperson]}
                label="sales contact"
                tabular
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a sales person to see their contact.
              </span>
            )}
          </div>
        </div>
      </SheetSection>

      <SheetSection className="gap-5" title="Schedule Details">
        <div className="grid grid-cols-3 gap-4">
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
            <Combobox
              value={`${draft.windowStart}|${draft.windowEnd}`}
              onValueChange={(v) => {
                const [start, end] = v.split("|");
                set("windowStart", start);
                set("windowEnd", end);
              }}
              className="w-full"
              options={WINDOWS.map((w) => ({
                value: `${w.start}|${w.end}`,
                label: formatWindow(w),
              }))}
              placeholder="Select Delivery Window"
              searchPlaceholder="Search windows…"
            />
          </SheetField>

          {/* A FIELD, not a checkbox. Recurring is a property of the order that
              belongs in the row that describes its schedule, and it gates the
              cadence below — a checkbox floating under the row read as an
              afterthought and gave the reveal nothing to hang off. Answering
              "No" is a real answer, which is why it is an option rather than an
              unticked box: an empty checkbox and a deliberate "not recurring"
              look identical and are not the same thing. */}
          <SheetField label="Recurring Order" required>
            <Combobox
              className="w-full"
              value={draft.recurring ? "Yes" : "No"}
              onValueChange={(v) => {
                const on = v === "Yes";
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        recurring: on,
                        recurrenceFrequency: on
                          ? d.recurrenceFrequency || RECURRENCE_FREQUENCIES[0]
                          : d.recurrenceFrequency,
                      }
                    : d
                );
              }}
              options={["No", "Yes"]}
              /* The one place the search box is suppressed: a binary is not a
                 list to be searched, and "Search…" over "No / Yes" is a control
                 asking you to narrow two things down to one. */
              searchThreshold={3}
            />
          </SheetField>
        </div>

        {/* Revealed by the field above: a cadence with nothing recurring is a
            question about nothing. "Custom" opens its own dialog rather than
            growing five more fields nobody uses on the common cadences. */}
        {draft.recurring && (
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Frequency" required>
              <Combobox
                className="w-full"
                value={draft.recurrenceFrequency}
                onValueChange={(v) => {
                  set("recurrenceFrequency", v);
                  if (v === "Custom") setCustomOpen(true);
                }}
                options={[...RECURRENCE_FREQUENCIES]}
                placeholder="Select frequency"
                searchPlaceholder="Search cadences…"
              />
            </SheetField>
            {draft.recurrenceFrequency === "Custom" && draft.customRecurrence && (
              <SheetField label="Custom rule">
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                  onClick={() => setCustomOpen(true)}
                >
                  {draft.customRecurrence}
                  <Pencil className="size-4 text-muted-foreground" />
                </Button>
              </SheetField>
            )}
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
              <Input value={order.movement.direction} disabled />
            </SheetField>
            <SheetField label="Yard">
              <Input value={order.movement.yard} disabled />
            </SheetField>
            <SheetField label="Tank Type">
              <Input value={order.movement.tankType} disabled />
            </SheetField>
            <SheetField label="Capacity">
              <Input value={`${order.movement.capacityGal} gal`} disabled />
            </SheetField>
          </div>
          <p className="text-xs text-muted-foreground">
            One asset per movement order, fixed after creation. Peripherals and
            custom items are not built in this pass.
          </p>
        </SheetSection>
      )}

      {!isMovement && (
        <SheetSection className="gap-5" title="Delivery Order">
          {/* ALWAYS A TABLE, never an empty-state panel standing in for one. An
              empty table with its columns showing tells you what an order line
              is made of and is ready to be typed into; a panel saying "select a
              customer first" tells you only what you cannot do yet.

              DS editable-table idiom (form-layout/table-cells): fixed layout,
              Surface-1a header, cells with no chrome of their own, and the Add
              chip attached to the squared bottom-left corner. */}
          <div>
            <div className="overflow-hidden rounded-md rounded-bl-none border border-border">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[92px]" />
                  <col className="w-[34%]" />
                  <col className="w-[30%]" />
                  <col />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-surface-1a">
                    {/* THE COLUMN IS NAMED, so the tick means one thing on its
                        own. Unlabelled, it needed a switch below the table to
                        say what it was for, and the same tick then meant
                        different things depending on that switch. */}
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Top off</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Asset</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Product</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-right">
                      <TableRequiredLabel>Qty (gal)</TableRequiredLabel>
                    </th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((line, i) => {
                    const asset = siteAssets.find((a) => a.name === line.asset);
                    return (
                      <tr
                        key={i}
                        className="group/row h-11 border-b border-border last:border-b-0"
                      >
                        {/* Checked = fill it. Unchecked = type a number. One
                            control, so a row cannot claim both at once. */}
                        <td className="px-3">
                          <Checkbox
                            checked={Boolean(line.topOff)}
                            onCheckedChange={(c) => setTopOff(i, c === true)}
                            aria-label={`Top off ${line.asset || `line ${i + 1}`}`}
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellCombobox
                            value={line.asset}
                            options={siteAssets.map((a) => a.name)}
                            /* An asset already on another line cannot be added
                               twice — one asset, one quantity. */
                            taken={draft.lines.map((l) => l.asset)}
                            placeholder={
                              draft.shipTo ? "Select asset" : "Select a ShipTo first"
                            }
                            disabled={!draft.shipTo}
                            creatable
                            aria-label={`Asset for line ${i + 1}`}
                            /* Picking a known asset fills its product and its
                               rental flag — they are facts about the asset, not
                               a second thing to type. */
                            onChange={(name) => {
                              const known = siteAssets.find((a) => a.name === name);
                              setLine(i, {
                                asset: name,
                                product: known?.product ?? line.product,
                                rental: known?.rental ?? false,
                              });
                            }}
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellSelect
                            value={line.product}
                            options={[...PRODUCTS]}
                            placeholder="Select product"
                            aria-label={`Product for line ${i + 1}`}
                            onChange={(v) => setLine(i, { product: v })}
                          />
                          {asset?.rental && (
                            <span className="pointer-events-none absolute top-1/2 right-8 -translate-y-1/2">
                              <Badge variant="secondary">Rental</Badge>
                            </span>
                          )}
                        </td>
                        <td className="relative p-0">
                          <TableCellInput
                            value={
                              line.topOff ? "" : line.gal != null ? String(line.gal) : ""
                            }
                            placeholder={line.topOff ? "Top-off" : "0"}
                            disabled={line.topOff}
                            numeric
                            suffix="gal"
                            aria-label={`Gallons for line ${i + 1}`}
                            onChange={(v) =>
                              setLine(i, {
                                gal: Number(v.replace(/[^0-9]/g, "")) || null,
                              })
                            }
                          />
                        </td>
                        <td className="p-0 text-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove line ${i + 1}`}
                            disabled={draft.lines.length === 1}
                            className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                            onClick={() => removeLine(i)}
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* THE TOTAL IS A ROW OF THE TABLE, not a caption under it. A
                    sum lives in the column it sums, on the same grid as the
                    numbers above it — outside the table it had to be aligned by
                    hand and still read as a note about the whole thing.

                    Only once a line names an asset: a total over nothing is a
                    row that says "0 gal" about an order that has not started.
                    "Top-off" when every line is filled, because there is no
                    number to add up. */}
                {hasAssets && (
                  <tfoot>
                    <tr className="h-11 border-t border-border bg-fp-surface-1a">
                      <td
                        colSpan={3}
                        className="px-3 text-right text-sm text-muted-foreground"
                      >
                        Total
                      </td>
                      <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                        {isAllTopOff(draft.lines)
                          ? "Top-off"
                          : `${gal.toLocaleString()} gal`}
                      </td>
                      <td aria-hidden />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {/* Attached to the table's squared corner — the DS "+ Add more"
                affordance. It belongs at the END of the rows, because that is
                where the next row goes. */}
            <button
              type="button"
              onClick={addBlankLine}
              className="flex h-8 items-center gap-1.5 rounded-b-md border border-t-0 border-border px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" /> Add asset
            </button>
          </div>

        </SheetSection>
      )}

      {/* Load Order is OPTIONAL, so it is not on screen until it is asked for.
          An empty required-looking table on every order is a section people
          learn to scroll past; a CTA states that the step exists and is a
          choice. Same table idiom as the Delivery Order above it. */}
      {!isMovement && (
        <SheetSection
          className="gap-5"
          title="Load Order"
          /* QUIET UNTIL REACHED FOR. Removing the whole load order is a
             destructive action on a section that is optional in the first
             place, so it does not compete with the table for attention: a
             muted icon that comes up to full contrast and slides its label out
             on hover. The label is what makes it safe — "Remove" alone, beside
             a table of rows, reads as though it might remove a row. */
          action={
            loadRows && (
              <button
                type="button"
                onClick={() => set("loadRows", null)}
                className="group/rm flex h-8 items-center gap-1.5 rounded-md px-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-4 shrink-0" />
                <span className="max-w-0 overflow-hidden text-sm whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200 group-hover/rm:max-w-40 group-hover/rm:opacity-100 group-focus-visible/rm:max-w-40 group-focus-visible/rm:opacity-100">
                  Remove Load Order
                </span>
              </button>
            )
          }
        >
          {!hasAssets ? (
            <Empty className="rounded-md border border-fp-outline-1 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Layers />
                </EmptyMedia>
                <EmptyDescription>
                  Add an asset to the delivery order first — a load order is
                  drawn up per product.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : !loadRows ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-fp-outline-1 px-4 py-3">
              <span className="text-sm text-foreground">Add Load Order</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  set("loadRows", orderProducts.map((pr) => ({ product: pr })))
                }
              >
                <Plus /> Add
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[44px]" />
                  <col className="w-[26%]" />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-surface-1a">
                    {/* No label: what the tick means is stated by the rows it
                        dims, and a header for it would name the exception. */}
                    <th aria-hidden />
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Product</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Terminal</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Supplier</TableRequiredLabel>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel required>Loading Account</TableRequiredLabel>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadRows.map((row) => {
                    /* Narrowed by THIS product, then by what is chosen above. */
                    const opts = loadOptions(
                      [row.product],
                      row.terminal,
                      row.supplier
                    );
                    const on = !row.excluded;
                    return (
                      <tr
                        key={row.product}
                        className="h-11 border-b border-border last:border-b-0"
                      >
                        {/* SET ASIDE, NOT DELETED. The product is still on the
                            delivery order, so a deleted row would come back
                            blank on the next render. Unticking dims the row and
                            disables its cells, keeping whatever was already
                            chosen for the moment someone ticks it again. */}
                        <td className="px-3">
                          <Checkbox
                            checked={on}
                            onCheckedChange={(c) =>
                              setLoadRow(row.product, { excluded: c !== true })
                            }
                            aria-label={`Include ${row.product} in the load order`}
                          />
                        </td>
                        <td
                          className={cn(
                            "truncate px-3 text-sm",
                            on ? "text-foreground" : "text-muted-foreground line-through"
                          )}
                        >
                          {row.product}
                        </td>
                        <td className="relative p-0">
                          <TableCellSelect
                            value={row.terminal ?? ""}
                            options={opts.terminals}
                            placeholder="Terminal"
                            disabled={!on}
                            aria-label={`Terminal for ${row.product}`}
                            onChange={(v) =>
                              setLoadRow(row.product, {
                                terminal: v,
                                supplier: undefined,
                                loadingAccount: undefined,
                              })
                            }
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellSelect
                            value={row.supplier ?? ""}
                            options={opts.suppliers}
                            placeholder="Supplier"
                            disabled={!on}
                            aria-label={`Supplier for ${row.product}`}
                            onChange={(v) =>
                              setLoadRow(row.product, {
                                supplier: v,
                                loadingAccount: undefined,
                              })
                            }
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellSelect
                            value={row.loadingAccount ?? ""}
                            options={opts.accounts}
                            placeholder="Account"
                            disabled={!on}
                            aria-label={`Loading account for ${row.product}`}
                            onChange={(v) =>
                              setLoadRow(row.product, { loadingAccount: v })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SheetSection>
      )}

      {/* ── The 3PL section. Everything above exists on a first-party order
             too; this is what makes the order brokered. ─────────────────── */}
      <SheetSection
        className="gap-5"
        title="Delivery Partner"
        note={
          <SheetSectionNote label="How inviting partners works">
            <p className="text-foreground">
              Showing partners that run {requiredLine}.
            </p>
            <p className="mt-1.5 text-muted-foreground">
              Everyone invited is notified at the same time.
            </p>
            <p className="mt-1.5 text-muted-foreground">
              Whoever accepts first takes the order; the rest are told it has
              gone.
            </p>
          </SheetSectionNote>
        }
      >
        {!accepted && (
          <>
            {/* A TABLE, not a list of cards. A delivery partner is compared
                against the others on the same handful of attributes — where
                they are, how safe, how far, what they run — and comparing is
                what a table is for. Cards made every attribute a different
                shape on every row.

                Same DS editable-table idiom as the two tables above: the FIRST
                cell is the only one anyone fills; the rest are that partner's
                own record and arrive with them. */}
            <div>
              <div className="overflow-hidden rounded-md rounded-bl-none border border-border">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[44px]" />
                    <col className="w-[25%]" />
                    <col className="w-[15%]" />
                    <col className="w-[148px]" />
                    <col />
                    {showQuoteCol && <col className="w-[124px]" />}
                    <col className="w-[52px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-fp-surface-1a">
                      <th className="px-3 py-2.5">
                        <Checkbox
                          checked={headerChecked}
                          onCheckedChange={(c) => selectAllPartners(c === true)}
                          aria-label="Select all delivery partners"
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Delivery Partner</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Address</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Safety · Distance</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Products</TableRequiredLabel>
                      </th>
                      {showQuoteCol && (
                        <th className="px-3 py-2.5 text-right">
                          <TableRequiredLabel>Quote</TableRequiredLabel>
                        </th>
                      )}
                      <th aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {partnerRows.length === 0 ? (
                      <tr className="h-11">
                        <td
                          colSpan={showQuoteCol ? 7 : 6}
                          className="px-3 text-sm text-muted-foreground"
                        >
                          No delivery partner yet.
                        </td>
                      </tr>
                    ) : (
                      partnerRows.map((id, i) => {
                        const v = id ? vendorById(id) : undefined;
                        const quote = quotes.find((q) => q.vendorId === id);
                        return (
                          <tr
                            key={`${id}-${i}`}
                            className="group/row h-11 border-b border-border last:border-b-0"
                          >
                            <td className="px-3">
                              <Checkbox
                                checked={Boolean(id) && draft.quoteVendorIds.includes(id)}
                                disabled={!id}
                                onCheckedChange={(c) => setQuoteFor(id, c === true)}
                                aria-label={`Select ${v?.name ?? `row ${i + 1}`}`}
                              />
                            </td>
                            <td className="relative p-0">
                              <TableCellSelect
                                value={v?.name ?? ""}
                                /* The row's own partner stays in its list, so
                                   the cell can show what it holds. */
                                options={[
                                  ...(v ? [v.name] : []),
                                  ...uninvited.map((x) => x.name),
                                ]}
                                placeholder="Add partner"
                                disabled={draft.status === "Blocked"}
                                aria-label={`Delivery partner for row ${i + 1}`}
                                onChange={(name) => {
                                  const picked = eligible.find((x) => x.name === name);
                                  if (picked) setPartnerAt(i, picked.id);
                                }}
                              />
                              {v && (!v.emailsEnabled || !v.hasAccount) && (
                                <span className="pointer-events-none absolute top-1/2 right-8 -translate-y-1/2">
                                  {/* §6 Email Management: a partner with emails
                                      off will never see the invitation, which is
                                      the one thing worth knowing at the moment of
                                      inviting them. */}
                                  <Badge
                                    variant={v.emailsEnabled ? "secondary" : "destructive"}
                                  >
                                    {v.emailsEnabled ? "Link only" : "Emails off"}
                                  </Badge>
                                </span>
                              )}
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {v?.base ?? "—"}
                            </td>
                            <td className="px-3 text-sm text-muted-foreground">
                              {v ? (
                                <span className="flex items-center gap-1.5 tabular-nums">
                                  <Shield className="size-3.5 shrink-0" />
                                  {v.safetyScore}
                                  <span className="text-fp-outline-1">·</span>
                                  {v.distanceMi} mi
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {v ? v.businessLines.join(" · ") : "—"}
                            </td>
                            {showQuoteCol && (
                              <td className="px-3 text-right text-sm tabular-nums">
                                {quote ? (
                                  <span className="text-foreground">
                                    ${quoteTotal(quote, gal).toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Pending</span>
                                )}
                              </td>
                            )}
                            <td className="p-0 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild disabled={!id}>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Actions for ${v?.name ?? `row ${i + 1}`}`}
                                    className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60">
                                  <DropdownMenuItem
                                    disabled={draft.quoteRequested && !quote}
                                    onSelect={() => acceptFor(id)}
                                  >
                                    <Check />
                                    {draft.quoteRequested
                                      ? "Accept quote"
                                      : "Acknowledge for them"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => removePartnerRows([i])}
                                  >
                                    <ThumbsDown />
                                    Cancel invitation
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Attached to the squared corner, where the next row goes. */}
              <button
                type="button"
                disabled={draft.status === "Blocked" || uninvited.length === 0}
                onClick={addPartnerRow}
                className="flex h-8 items-center gap-1.5 rounded-b-md border border-t-0 border-border px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <Plus className="size-4" /> Add partner
              </button>
            </div>

            {/* BULK. The same checked rows the quote switch reads — one
                selection, not a second one that can disagree with it. Only one
                partner can take the order, so acknowledging is a one-row
                action; cancelling is not. */}
            {/* THE DS BAR, not a second one. What can be done to a selection is
                a property of the records, so the verbs are passed in; the count
                chip, the spacing, the hairlines and confirm-on-destructive all
                come from the design system, which is what makes a selection in
                this sheet feel like a selection anywhere else. The Copy /
                Delete / More zone is off: this list's actions are fixed. */}
            <div className="flex justify-center">
              <BulkActionBar
                count={selectedRows.length}
                noun="partner"
                onClear={() => selectAllPartners(false)}
                actions={[
                  {
                    key: "ack",
                    label: "Acknowledge for them",
                    icon: <Check />,
                    disabled: selectedRows.length !== 1,
                    title:
                      selectedRows.length !== 1
                        ? "Only one partner can take the order."
                        : undefined,
                    onSelect: () => {
                      const id = partnerRows[selectedRows[0]];
                      if (id) acceptFor(id);
                    },
                  },
                  {
                    key: "cancel",
                    label: "Cancel invitation",
                    icon: <ThumbsDown />,
                    destructive: true,
                    onSelect: () => removePartnerRows(selectedRows),
                  },
                ]}
              />
            </div>

            {/* Same shape as "Top off selected": a MODE over the selection,
                which starts as everyone. Asking every invited partner for a
                price is the common case, so it costs no clicks; excluding one
                is a single uncheck. */}
            {invitedIds.length > 0 && (
              <label
                htmlFor="quote"
                className="flex cursor-pointer items-center justify-between gap-4"
              >
                <span className="flex flex-col gap-0.5 text-sm font-medium text-foreground">
                  Request a quote
                  <span className="text-xs font-normal text-muted-foreground">
                    The selected partners submit pricing instead of a plain
                    acknowledgement.
                  </span>
                </span>
                <Switch
                  id="quote"
                  checked={draft.quoteRequested}
                  onCheckedChange={(v) => set("quoteRequested", v)}
                />
              </label>
            )}
          </>
        )}

        {draft.vendorId && draft.status !== "Assigned" && (
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

      <CustomRecurrenceDialog
        open={customOpen}
        onOpenChange={(o) => {
          setCustomOpen(o);
          // Backing out of the builder must not leave "Custom" selected with no
          // rule behind it — fall back to the first plain cadence.
          if (!o && !draft.customRecurrence) {
            set("recurrenceFrequency", RECURRENCE_FREQUENCIES[0]);
          }
        }}
        onSave={(summary) => set("customRecurrence", summary)}
      />

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
