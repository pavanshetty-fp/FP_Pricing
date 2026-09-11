import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CircleAlert,
  Layers,
  Copy,
  Download,
  History as HistoryIcon,
  Ban,
  MoreHorizontal,
  Truck,
  Pencil,
  Plus,
  Trash2,
  Shield,
  ThumbsDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BannerInline } from "@/components/ui/banner";
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
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
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
  SheetField,
  SheetSection,
  SheetSectionInset,
  SheetSectionNote,
  SheetSectionRemove,
  SheetSteps,
} from "@/components/side-sheet/parts";
import { BulkActionBar } from "@/components/tables-layout";
import { FileUpload } from "@/components/form-layout/FileUpload";
import {
  TimeWindowSlider,
  formatMinutes,
  parseWindow,
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
} from "@/components/form-layout";
import { MultiSelect } from "@/components/form-layout/MultiSelect";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "../RecordSheet";
import { EditDrawer, ReadDrawer } from "./DirectoryRecordSheet";
import { BROKER_CUSTOMERS } from "./directory";
import { DATE_FMT } from "../data";
import {
  VENDORS,
  vendorById,
  vendorBlockedReason,
  type BusinessLine,
} from "./vendors";
import {
  BROKER_STATUS_TONE,
  HUBS,
  LISTING_TYPES,
  ORDER_TAGS,
  POCS,
  POC_DIRECTORY,
  PRODUCTS,
  RECURRENCE_FREQUENCIES,
  SALESPEOPLE,
  SALES_CONTACTS,
  SHIP_TO_SITES,
  loadOptions,
  isAllTopOff,
  quoteBaseTotal,
  quoteOrderCharges,
  quoteTotal,
  quoteLineTotal,
  billableGal,
  customerTotal,
  customerLineTotal,
  totalGal,
  type BrokerOrder,
  type VendorQuote,
  type QuoteLine,
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
          <SheetField label="Repeat on">
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

/* JOB TYPE, NOT SERVICE LINE. It was called `serviceLine` while its label on
   screen said "Job Type", and the name is needed for the real thing: Fuel,
   Lubricants and Propane are the service lines this business runs, and they
   live on `BrokerOrder.serviceLine` in orders.ts. This pair answers a different
   question — whether the broker buys the haul in or runs it. */
export const JOB_TYPES = ["Brokerage", "Transportation"] as const;
export type JobType = (typeof JOB_TYPES)[number];

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
  /**
   * Vendors ON THE TABLE — candidates. Adding a row is not asking anybody.
   */
  invitedVendorIds: string[];
  /**
   * Vendors the invitation has actually GONE to. Separate from the rows above
   * because per-row inviting made the difference real: a table can hold three
   * candidates with one asked, and a single list cannot say that.
   */
  sentVendorIds: string[];
  /** Partners that accepted the invitation — see `BrokerOrder`. */
  acceptedVendorIds: string[];
  /**
   * The partners' prices. ON THE DRAFT because step 2 lets them be TYPED: a
   * partner that gave its price on the phone still has a price, and an order
   * that could only hold a quote the partner had entered itself would have
   * nowhere to put it.
   */
  quotes: VendorQuote[];
  quoteRequested: boolean;
  /**
   * Which INVITED partners are being asked for a price. Selection, not the
   * mode — `quoteRequested` is the mode. Every partner is added here when
   * invited, so the common case ("price from everyone") needs no clicks.
   */

  /**
   * BROKERAGE OR TRANSPORTATION — the service being sold, and the first thing
   * decided about an order because it changes who fulfils it. Brokerage puts
   * the load out to a vendor; transportation moves it on our own fleet.
   */
  jobType: JobType;
  primaryPoc: string;
  /** A second person to call. Optional — most orders have one. */
  secondaryPoc: string;
  salesperson: string;
  tags: string[];
  /** §6's per-order kill switch for vendor email. */
  notifyVendor: boolean;
  /** Who may read the attachments and notes on this order. */
  visibility: "Public" | "Private";
  /** Never sent to the vendor or the customer. */
  internalNote: string;
  /** The whole load is a winter blend — one flag for the order, not per line. */
  winterAdditive: boolean;
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
    /* An order that already left Draft had its invitations sent — that is what
       leaving Draft meant. */
    sentVendorIds: o.status === "Draft" ? [] : [...o.invitedVendorIds],
    acceptedVendorIds: [...o.acceptedVendorIds],
    // Copied deeply — editing a quote line must not mutate the row behind it.
    quotes: o.quotes.map((q) => ({ ...q, lines: q.lines.map((l) => ({ ...l })) })),
    quoteRequested: o.quoteRequested,
    /* An existing order predates the split, so it reads as Brokerage — every
       one of them went out to a vendor. */
    jobType: "Brokerage",
    primaryPoc: o.primaryPoc,
    secondaryPoc: "",
    salesperson: o.salesperson,
    tags: [],
    notifyVendor: true,
    visibility: "Public",
    internalNote: "",
    winterAdditive: false,
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
/**
 * TOMORROW, NOT BLANK.
 *
 * Almost every order booked today is for tomorrow, and a required date field
 * that starts empty makes the common case cost a click and the calendar. A
 * filled default is still a default — it can be changed — and it is honest,
 * because it is the answer the form would have got anyway.
 */
function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function emptyDraft(): BrokerOrderDraft {
  return {
    customer: "",
    erpId: "",
    shipTo: "",
    plannedDate: tomorrow(),
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
    sentVendorIds: [],
    acceptedVendorIds: [],
    quotes: [],
    quoteRequested: false,
    jobType: "Brokerage",
    primaryPoc: "",
    secondaryPoc: "",
    salesperson: "",
    tags: [],
    /* ON by default — suppressing every email is the deliberate act, so it is
       the one that costs a click. Same rule the movement sheet follows. */
    notifyVendor: true,
    visibility: "Public",
    internalNote: "",
    winterAdditive: false,
    instructions: "",
  };
}

/**
 * The pencil on an option row. Small, ghost, and hidden until the row is
 * hovered or focused — editing a record is the rare act in a picker and
 * choosing one is the common one, so it must not compete with the name.
 */
function OptionEditButton({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-6"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit();
      }}
    >
      <Pencil className="size-3.5" />
    </Button>
  );
}

/** The trail's clock: the day and the minute, which is the grain anyone asks
 *  a history in. Seconds would be precision nobody uses. */
const AUDIT_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Currency, one way. Three decimals only where a per-gallon rate needs them. */
const money = (n: number, dp = 2) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

/** A typed figure, tolerant of what people actually type into a money cell. */
const num = (v: string) => Number(v.replace(/[^0-9.]/g, "")) || 0;

/** Compact vendor identity line — name, base, business lines, score, distance. */
function VendorRow({ id }: { id: string }) {
  const v = vendorById(id);
  if (!v) return null;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{v.name}</span>
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

/**
 * The three charges that ride on the order rather than on a gallon.
 *
 * A LIST, NOT THREE COPIES OF A ROW. They are typed the same way, totalled the
 * same way and explained by the same sentence — written out three times, the
 * next one added would have been three edits and the one after that four.
 */
const ORDER_CHARGES = [
  { key: "freight", label: "Freight" },
  { key: "fees", label: "Fees" },
  { key: "taxes", label: "Taxes" },
] as const satisfies readonly { key: keyof Pick<VendorQuote, "freight" | "fees" | "taxes">; label: string }[];

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
  /** Ticked partner rows. UI state, not the order's — see `selectedRows`. */
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [customOpen, setCustomOpen] = React.useState(false);
  /* ── STEP 2 ──────────────────────────────────────────────────────────────
     It exists once a partner has ACCEPTED AND PRICED. Accepting the invitation
     is the first notification and only moves the order into this lane; the
     quote is the second, and it is the one there is something to do about.
     Declared here, above the early return, because a hook cannot be. */
  const [step, setStep] = React.useState<"order" | "pricing">("order");
  const [shownQuoteId, setShownQuote] = React.useState<string | null>(null);
  const creating = mode === "create";

  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
    setSelected(new Set());
    /* AN ACCEPTED ORDER OPENS ON STEP 2. It is the only reason to open one: the
       order itself was settled before it was ever sent out, and what is waiting
       in that lane is a price to agree. Every other stage opens on the order. */
    setStep(order?.status === "Accepted" ? "pricing" : "order");
    setShownQuote(null);
  }, [open, creating, order]);

  /*
    ALL OF THE BELOW SIT ABOVE THE EARLY RETURN, because a hook cannot be
    conditional — the same reason `step` and `shownQuoteId` are already here.
    They read `draft` defensively rather than assuming it exists.
  */
  /** The linked record open for editing, or none. */
  const [editing, setEditing] = React.useState<{
    kind: "customer" | "shipTo";
    name: string;
  } | null>(null);
  /** Which POC's contact details are open for editing, or none. */
  const [editingPoc, setEditingPoc] = React.useState<"primary" | "secondary" | null>(null);
  /** The order's history, in the header's drawer. */
  const [activityOpen, setActivityOpen] = React.useState(false);
  /** The salesperson's contact, open for editing. */
  const [editingSales, setEditingSales] = React.useState(false);
  const [salesEdit, setSalesEdit] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  /* AUTOSAVE FEEDBACK. A draft order is kept as it is typed; the header says
     so, because an autosave nobody is told about is one nobody relies on. */
  const saveState = useDraftSaveState(draft, open);
  /*
    POC EDITS ARE HELD HERE, not written straight into the directory as you
    type. The drawer has a Save, so the value has to be somewhere while it is
    unsaved — and a half-typed phone number must not already be the customer's
    number everywhere else in the app.
  */
  const [pocEdit, setPocEdit] = React.useState({ phone: "", email: "" });
  const [recordEdit, setRecordEdit] = React.useState({ a: "", b: "", c: "", d: "" });
  const editingPocName =
    editingPoc === "primary"
      ? draft?.primaryPoc ?? ""
      : editingPoc === "secondary"
        ? draft?.secondaryPoc ?? ""
        : "";
  /* A second POC cannot be the first one. Offering the same person twice is a
     choice nobody wants and a support ticket somebody eventually files. */
  /* The window is STORED as the two labels an order carries, and edited as
     minutes. Parsing here keeps the stored shape unchanged — the board, the
     table and the card all read `window.start` / `window.end` as text. */
  const windowMinutes = React.useMemo<[number, number]>(() => {
    const parsed = parseWindow(`${draft?.windowStart ?? ""} – ${draft?.windowEnd ?? ""}`);
    return parsed ?? [8 * 60, 12 * 60];
  }, [draft?.windowStart, draft?.windowEnd]);

  const secondPocChoices = React.useMemo(
    () => POCS.filter((p) => p !== draft?.primaryPoc),
    [draft?.primaryPoc]
  );

  /* Load each drawer's own draft when it opens, not on every render. */
  React.useEffect(() => {
    if (!editingPoc) return;
    const p = POC_DIRECTORY[editingPocName];
    setPocEdit({ phone: p?.phone ?? "", email: p?.email ?? "" });
  }, [editingPoc, editingPocName]);

  React.useEffect(() => {
    if (!editingSales) return;
    setSalesEdit(SALES_CONTACTS[draft?.salesperson ?? ""] ?? "");
  }, [editingSales, draft?.salesperson]);

  React.useEffect(() => {
    if (!editing) return;
    if (editing.kind === "customer") {
      const c = BROKER_CUSTOMERS.find((x) => x.name === editing.name);
      setRecordEdit({
        a: c?.phone ?? "",
        b: c?.email ?? "",
        c: c?.billingEmail ?? "",
        d: c?.customerInstruction ?? "",
      });
    } else {
      const st = SHIP_TO_SITES.find((x) => x.name === editing.name);
      setRecordEdit({
        a: st?.street ?? "",
        b: st?.city ?? "",
        c: st?.state ?? "",
        d: st?.zip ?? "",
      });
    }
  }, [editing]);

  if (!draft || (!creating && !order)) return null;

  /* Read-only companions to the two people/place selects. Derived, never
     stored on the draft — a copy would be a second source of truth. */
  const site = SHIP_TO_SITES.find((x) => x.name === draft.shipTo);
  const poc = POC_DIRECTORY[draft.primaryPoc];
  const poc2 = POC_DIRECTORY[draft.secondaryPoc];

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
  const quotes = draft.quotes;

  /**
   * The picker offers only partners that run the line of business this order
   * needs — §5.5 makes Business Lines a filter on the vendor table for exactly
   * this reason. Offering the full list let a bulk fuel order be sent to a
   * carrier whose only line is Asset Movement.
   */
  const requiredLine = isMovement ? "Asset Movement" : "Bulk Fuel";
  /* ELIGIBILITY IS A RULE, NOT A LIST. Active, compliant on the delivery date,
     running the right line of business, and serving the state it ships to —
     `vendorBlockedReason` owns all four and returns the reason, so the picker
     can say WHY somebody is missing instead of simply not offering them. */
  const orderContext = {
    businessLine: requiredLine as BusinessLine,
    state: site?.state ?? "",
    on: draft.plannedDate ?? new Date(),
  };
  const blockedReasonFor = (v: (typeof VENDORS)[number]) =>
    vendorBlockedReason(v, orderContext);
  const eligible = VENDORS.filter((v) => blockedReasonFor(v) === null);
  const ineligible = VENDORS.filter((v) => blockedReasonFor(v) !== null);
  /* THE PARTNER TABLE'S ROWS. `invitedVendorIds` doubles as the row list, with
     `""` standing for a row that exists but has not been filled in yet — the
     same shape the Delivery Order uses for a blank asset line. It keeps "what
     is on the table" and "who is invited" as one list rather than two that can
     disagree. */
  const partnerRows = draft.invitedVendorIds;
  const invitedIds = partnerRows.filter(Boolean);
  /** Rows the invitation has actually gone to. */
  const sentIds = draft.sentVendorIds;
  /** Only what can still be added — an invited vendor is not an option. */
  const uninvited = eligible.filter((v) => !invitedIds.includes(v.id));
  /* WHY THE LIST IS SHORT. A picker that quietly omits half the vendors is one
     people work around by ringing somebody; listed with their reason, the
     omission is an answer. */
  const ineligibleNote =
    ineligible.length > 0
      ? `${ineligible.length} vendor${ineligible.length === 1 ? "" : "s"} not offered: ` +
        ineligible
          .slice(0, 4)
          .map((v) => `${v.name} (${blockedReasonFor(v)})`)
          .join("; ") +
        (ineligible.length > 4 ? "…" : "")
      : null;

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
      const next = [...d.invitedVendorIds];
      next[i] = id;
      /* ADDING A PARTNER IS NOT SENDING. Filling the row used to flip the
         order to Assigned on the spot, which meant an order went out the
         moment a name was picked — there was no draft to finish and no moment
         to change your mind. Sending is its own act; see the CTA below. */
      return { ...d, invitedVendorIds: next, vendorId: null };
    });

  /** Withdrawing invitations, by row, not the whole round. */
  const removePartnerRows = (rows: number[]) => {
    setSelected(new Set());
    setDraft((d) => {
      if (!d) return d;
      const drop = new Set(rows);
      const gone = new Set(rows.map((i) => d.invitedVendorIds[i]));
      const next = d.invitedVendorIds.filter((_, i) => !drop.has(i));
      return {
        ...d,
        invitedVendorIds: next,
        acceptedVendorIds: d.acceptedVendorIds.filter((id) => !gone.has(id)),
        quotes: d.quotes.filter((q) => !gone.has(q.vendorId)),
        vendorId: gone.has(d.vendorId ?? "") ? null : d.vendorId,
      };
    });
  };

  /* TWO ACTS, AND THEY ARE NOT THE SAME ONE.

     ACKNOWLEDGE is the partner's: they have agreed to take the order if it is
     theirs. Several partners can do it — that is the point of inviting several
     — and it is what moves the order into the Accepted lane. The broker can do
     it FOR them, because most of this is settled on the phone and the sheet is
     a record of what happened, not the place it happens.

     ACCEPT A QUOTE is the broker's: it names the one partner that holds the
     order. Exactly one, and the rest do not go away — see `heldIds`. */
  const acknowledgeFor = (ids: string[]) =>
    setDraft((d) => {
      if (!d) return d;
      const real = ids.filter(Boolean);
      if (real.length === 0) return d;
      const next = [...d.acceptedVendorIds];
      for (const id of real) if (!next.includes(id)) next.push(id);
      toast.success(
        real.length === 1
          ? `${vendorById(real[0])?.name ?? "Vendor"} acknowledged`
          : `${real.length} vendors acknowledged`,
        { description: "Moved to Accepted." }
      );
      return { ...d, acceptedVendorIds: next, status: "Accepted" };
    });

  /* COMPLETED IS THE COMMERCIAL END, NOT THE PHYSICAL ONE. Taking a price
     settles what the partner charges and what the customer pays; there is
     nothing left to agree, so the order is done as a piece of paperwork
     whatever the truck is doing. */
  /* THE DRAFT AS IT STANDS ONCE `vendorId` HOLDS THE ORDER — pure, because the
     footer's Accept has to SAVE the result in the same click and `setDraft`
     has not run by then. One definition, so the button and the state agree. */
  const draftAccepting = (
    d: BrokerOrderDraft,
    vendorId: string
  ): BrokerOrderDraft => ({
    ...d,
    status: "Completed",
    vendorId,
    acceptedVendorIds: d.acceptedVendorIds.includes(vendorId)
      ? d.acceptedVendorIds
      : [...d.acceptedVendorIds, vendorId],
  });

  const announceAccepted = (d: BrokerOrderDraft, vendorId: string) => {
    if (d.status !== "Completed") {
      toast.success(`Quote accepted — ${vendorById(vendorId)?.name}`, {
        description: "Pricing is settled. Moved to Completed.",
      });
    }
  };

  const acceptFor = (vendorId: string) =>
    setDraft((d) => {
      if (!d) return d;
      announceAccepted(d, vendorId);
      return draftAccepting(d, vendorId);
    });

  /* THE TERMINAL EXIT. Available from any live stage and from none of the dead
     ones — an order already cancelled or already through accounting has nothing
     left to cancel. It is confirmed because it cannot be walked back here. */
  const cancellable =
    draft.status !== "Cancelled" &&
    draft.status !== "Accounting Synced" &&
    !creating;
  const cancelOrder = () =>
    setDraft((d) => {
      if (!d) return d;
      toast.success(`${order?.orderNo ?? "Order"} cancelled`, {
        description: "It leaves the working lanes. Save to keep the change.",
      });
      return { ...d, status: "Cancelled" };
    });

  /** Draft -> Assigned. The moment the invitations actually go out. */
  /**
   * Ask these vendors to take the order.
   *
   * PER ROW NOW, not one button for the table. The old control sent to
   * everybody at once and vanished the moment the order left Draft, so a
   * vendor added later could never be asked. Sending to the FIRST one is what
   * moves the order out of Draft; sending to a second changes nothing but that
   * vendor's own state.
   */
  const sendInvitations = (ids: string[]) =>
    setDraft((d) => {
      if (!d) return d;
      const fresh = ids.filter((id) => id && !d.sentVendorIds.includes(id));
      if (fresh.length === 0) return d;
      const names = fresh.map((id) => vendorById(id)?.name ?? "vendor");
      /* SAY IT OUT LOUD. Sending is the first act on this order that reaches
         somebody outside the building; a status chip quietly changing three
         sections up is not an acknowledgement that it happened. */
      toast.success(
        fresh.length === 1
          ? `Invitation sent to ${names[0]}`
          : `Invitation sent to ${fresh.length} vendors`,
        { description: "Waiting on acknowledgement." }
      );
      return {
        ...d,
        sentVendorIds: [...d.sentVendorIds, ...fresh],
        status: d.status === "Draft" ? "Assigned" : d.status,
      };
    });

  /* ACKNOWLEDGE AND ACCEPT IN ONE, for the partner whose price came off a call.
     It also opens step 2, because the numbers are the reason anyone does this
     and step 1 has nowhere to put them. */
  const acknowledgeAndAccept = (vendorId: string) => {
    acceptFor(vendorId);
    setShownQuote(vendorId);
    setStep("pricing");
  };
  const advance = (status: BrokerStatus) =>
    setDraft((d) => {
      if (!d) return d;
      toast.success(`${order?.orderNo ?? "Order"} → ${status}`);
      return { ...d, status };
    });

  /* THE TABLE'S SELECTION IS TRANSIENT, and starts empty. Adding a partner is
     not choosing one to act on: the tick is how you say "do something to these
     now", and a row that arrives already ticked has answered a question nobody
     asked — and puts a bulk bar on screen before there is anything to bulk.

     It is no longer the same set as the quote. Asking for pricing is a property
     of the whole round (see the switch below), so binding it to a selection
     made two unrelated decisions share one control. */
  const selectedRows = partnerRows
    .map((id, i) => (id && selected.has(id) ? i : -1))
    .filter((i) => i !== -1);
  const headerChecked: boolean | "indeterminate" =
    invitedIds.length > 0 && selectedRows.length === invitedIds.length
      ? true
      : selectedRows.length > 0
        ? "indeterminate"
        : false;
  const selectAllPartners = (on: boolean) =>
    setSelected(on ? new Set(invitedIds) : new Set());
  /** Pricing only exists once it has been asked for and sent out. */
  const showQuoteCol = draft.quoteRequested && draft.status === "Assigned";

  /* Inviting stays available until somebody has ACCEPTED — that is the point
     at which the order has a partner and more invitations mean nothing. */
  const accepted = Boolean(draft.vendorId);

  /* TYPING INTO AN EMPTY QUOTE CREATES IT. A partner that has accepted but not
     priced still has a row to fill in — the broker takes the price off a call
     and types it — so the first keystroke makes the quote and the line it lands
     on rather than requiring an "add quote" step first. */
  /** A quote that exists but says nothing yet — every figure zero, not absent,
   *  so a typed freight does not have to invent the rest of the shape. */
  const blankQuote = (vendorId: string): VendorQuote => ({
    vendorId,
    lines: [],
    freight: 0,
    fees: 0,
    taxes: 0,
  });

  /** Freight, fees and taxes — one set per quote, not per line. */
  const setQuoteCharge = (
    vendorId: string,
    patch: Partial<Pick<VendorQuote, "freight" | "fees" | "taxes">>
  ) =>
    setDraft((d) => {
      if (!d) return d;
      const has = d.quotes.some((q) => q.vendorId === vendorId);
      const quotes = has ? d.quotes : [...d.quotes, blankQuote(vendorId)];
      return {
        ...d,
        quotes: quotes.map((q) =>
          q.vendorId === vendorId ? { ...q, ...patch } : q
        ),
      };
    });

  const setQuoteLine = (vendorId: string, asset: string, patch: Partial<QuoteLine>) =>
    setDraft((d) => {
      if (!d) return d;
      const blank = (a: string): QuoteLine => ({
        asset: a,
        ratePerGal: 0,
        surcharge: 0,
      });
      const has = d.quotes.some((q) => q.vendorId === vendorId);
      const quotes = has
        ? d.quotes
        : [...d.quotes, blankQuote(vendorId)];
      return {
        ...d,
        quotes: quotes.map((q) =>
          q.vendorId !== vendorId
            ? q
            : {
                ...q,
                lines: q.lines.some((l) => l.asset === asset)
                  ? q.lines.map((l) => (l.asset === asset ? { ...l, ...patch } : l))
                  : [...q.lines, { ...blank(asset), ...patch }],
              }
        ),
      };
    });

  /* EVERY PARTNER THAT ACCEPTED gets a row, priced or not — the table is the
     list of who could take this order, and a partner missing from it because it
     has not sent numbers yet is a partner you cannot enter numbers for. */
  const quotingPartners = draft.acceptedVendorIds;
  /* WHICH PARTNER'S SHEET IS OPEN. Defaults to the one that HOLDS the order,
     else the first that accepted — not the cheapest, because ranking them for
     the reader is deciding for them. */
  const shownVendorId =
    (shownQuoteId && quotingPartners.includes(shownQuoteId) ? shownQuoteId : null) ??
    (draft.vendorId && quotingPartners.includes(draft.vendorId)
      ? draft.vendorId
      : null) ??
    quotingPartners[0] ??
    null;
  const shownQuote = quotes.find((q) => q.vendorId === shownVendorId);
  const quoteOf = (vendorId: string) => quotes.find((q) => q.vendorId === vendorId);
  /*
    WHO BOUGHT THE FUEL. A load order is the broker buying the product; without
    one, the partner sources it as well. That single fact decides whether the
    base price — product plus the partner's margin — is theirs to charge, and
    it is the difference between the two flows this sheet has to serve.

    A load order whose every row has been set aside is not a load order: the
    broker has bought nothing, so the partner is back to supplying it.
  */
  const hasLoadOrder = Boolean(
    draft.loadRows && draft.loadRows.some((r) => !r.excluded)
  );
  /** The partner charges the base price only when the product is theirs. */
  const chargesBase = !hasLoadOrder;

  const costOf = (vendorId: string) => {
    const q = quoteOf(vendorId);
    return q ? quoteTotal(q, draft.lines, chargesBase) : 0;
  };
  const revenue = customerTotal(draft.lines);
  const shownCost = shownVendorId ? costOf(shownVendorId) : 0;
  /** The base on its own, so the table can show it whether or not it counts. */
  const shownBase = shownQuote ? quoteBaseTotal(shownQuote, draft.lines) : 0;
  /** Freight + fees + taxes, which belong to no line. */
  const shownCharges = shownQuote ? quoteOrderCharges(shownQuote) : 0;
  const shownMargin = revenue - shownCost;
  const canSubmit =
    draft.customer.trim() !== "" &&
    draft.shipTo.trim() !== "" &&
    draft.plannedDate !== null;

  return (
    <RecordSheet
      /* WIDTH FOLLOWS THE STEP, not the sheet. Step 1's widest table is five
         columns and reads well at 864; step 2's is eight, and at 864 its
         headers wrapped onto two lines and stopped lining up with the figures
         under them. A sheet is only as wide as what is currently in it. */
      size={step === "pricing" ? "xxwide" : "wide"}
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Order #: ${order?.orderNo ?? ""}`}
      createTitle="Create Delivery Order"
      createAction="Create Order"
      canSubmit={canSubmit}
      /* AUTOSAVED, so Cancel is a promise the sheet cannot keep — it would
         claim to undo what has already been kept. Close is the honest exit. */
      showCancel={false}
      /* Decisions about the delivery itself, taken at the moment of committing
         — so they stay in view however far the body has scrolled. */
      footerAside={
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
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
        </div>
      }
      headerSubtitle={
        /* WHO HOLDS THIS ORDER, on the sticky bar. Only once one does: before
           that it is a question, and a header is no place for those. */
        draft.vendorId ? (
          <span className="flex items-center gap-1.5 text-xs text-status-success">
            <Check className="size-3.5 shrink-0" />
            <span className="truncate">
              Quote accepted — {vendorById(draft.vendorId)?.name} holds this order.
            </span>
          </span>
        ) : undefined
      }
      headerAside={
        <div className="flex items-center gap-2">
          {/* ONE CHIP. "Draft" and "Saved" were two elements saying one thing
              between them — what state this order is in. */}
          <DraftStatusChip
            tone={BROKER_STATUS_TONE[draft.status]}
            label={draft.status}
            saveState={saveState}
          />
          {draft.urgent && <Badge variant="destructive">Urgent</Badge>}
        </div>
      }
      /* ACTS ON THE ORDER, not part of filling it in. Deleting is the only one
         of those, and it is destructive, so it is behind a menu AND a confirm
         rather than sitting one mis-click from Close. */
      headerMenu={
        !creating && order ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More order actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {/* CANCELLING AND DELETING ARE THE TWO WAYS AN ORDER ENDS, so
                  they sit together — and together is the only place the
                  difference between them is legible. "Cancel order" spent its
                  life in the footer three inches from a Close X, where it read
                  as "cancel out of this sheet"; here it reads as what it is,
                  next to the harder version of itself. */}
              {cancellable && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmCancel(true);
                  }}
                >
                  <Ban />
                  Cancel order
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 />
                Delete order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      /* ACTIVITY IS A DRAWER, not a section — the same call the Directory
         records make, and for the same reason: it is the longest block on the
         order and the one read least often, and at the foot of the body it
         pushed the vendor table and the additional details behind a wall of
         "field changed" lines. The icon also makes it reachable without
         scrolling, which on a two-step sheet matters more, not less. */
      headerActions={
        order && order.audit.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Activity (${order.audit.length} ${order.audit.length === 1 ? "entry" : "entries"})`}
                onClick={() => setActivityOpen(true)}
              >
                <HistoryIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Activity · {order.audit.length}{" "}
              {order.audit.length === 1 ? "entry" : "entries"}
            </TooltipContent>
          </Tooltip>
        ) : undefined
      }
      onSubmit={() => {
        if (creating) onCreate?.(draft);
        else if (order) onSave(order, draft);
      }}
      /*
        THE MAIN THING TO DO ON STEP 2 IS ACCEPT A PRICE, NOT SAVE A FORM.

        Save Changes is the right primary while the order is being written; on
        the pricing step the work ends in one decision, and leaving a generic
        Save in the footer put the sheet's loudest button on the least
        interesting act available. The Accept moves out of the rail and into
        the slot that means "the main thing here" — and it COMMITS: it takes
        the price and saves the order in the same click, which is what Save
        was doing and why two buttons were never needed.

        `null` once the shown partner already holds the order: there is nothing
        left to commit from this step, and a disabled Save would be a button
        explaining itself. The lifecycle moves stay in the rail, where the
        numbers they follow from are.
      */
      footerPrimary={
        step !== "pricing" ? undefined : shownVendorId &&
          draft.vendorId !== shownVendorId ? (
          <>
            {draft.vendorId && (
              <span className="max-w-[320px] text-xs text-muted-foreground">
                {vendorById(draft.vendorId)?.name} goes on hold rather than
                being cancelled.
              </span>
            )}
            <Button
              onClick={() => {
                const next = draftAccepting(draft, shownVendorId);
                announceAccepted(draft, shownVendorId);
                setDraft(next);
                if (order) onSave(order, next);
                onOpenChange(false);
              }}
            >
              <Check /> Accept quote
            </Button>
          </>
        ) : (
          /* SPENT, NOT ABSENT. Once this partner holds the order there is
             nothing to accept — but an empty footer reads as a step that
             forgot its button, and the reader has to work out whether they
             missed it. Disabled says the same thing in the same place: this is
             the act, and it is already done. */
          <Button disabled>
            <Check /> Accept quote
          </Button>
        )
      }
      /* THE STRIP EXISTS ONCE A PARTNER HAS ACKNOWLEDGED, whoever did the
         acknowledging. Two ways in, and they are the same state: the partner
         accepted the invitation, or the broker recorded that they had —
         "acknowledge and accept quote", for the price that came off a call.
         Pricing is work the broker can do either way, so gating the step on the
         partner's numbers arriving would make the sheet refuse to hold a price
         it is perfectly able to take. Before anyone acknowledges there is
         nothing to price against, so there is one step and no strip. */
      steps={
        quotingPartners.length > 0 ? (
          <SheetSteps
            value={step}
            onValueChange={(v: string) => setStep(v as "order" | "pricing")}
            steps={[
              { value: "order", label: "Order" },
              { value: "pricing", label: "Quotes & pricing" },
            ]}
          />
        ) : undefined
      }
    >
      {step === "order" ? (
        <>
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

      {/*
        JOB TYPE IS ITS OWN UNIT, ABOVE EVERYTHING.

        Brokerage puts the load out to a vendor; transportation runs it on our
        own fleet. It is not a basic DETAIL of the order — it decides what kind
        of order this is, and therefore who fulfils it, so it is answered
        before the form asking about the order begins. Under a "Basic Details"
        heading it read as the first field of a list rather than as the
        question the list depends on.

        A RADIO because there are two of them and the answer should be readable
        without opening anything.
      */}
      <SheetSection title="Job Type">
        <RadioGroup
          className="flex gap-6"
          value={draft.jobType}
          onValueChange={(v) => set("jobType", v as JobType)}
        >
          {JOB_TYPES.map((sl) => (
            <label
              key={sl}
              htmlFor={`svc-${sl}`}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <RadioGroupItem id={`svc-${sl}`} value={sl} />
              {sl}
            </label>
          ))}
        </RadioGroup>
      </SheetSection>

      <SheetSection title="Basic Details">
        {/* The selects and the facts they produce are ONE unit, so they sit
            4px apart while the section's own rhythm stays 20px. A full field
            gap between them would read as the next question rather than the
            answer to the last one. */}
        <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-4">
          {/*
            THE EDIT LIVES ON THE OPTION ROW, revealed on hover.

            A record chosen here might be wrong — a stale address, a contact who
            left — and the person who notices is the one raising the order.
            Sending them to the Directory and back loses the draft.

            ON THE ROW, not beside the field: the affordance appears where the
            reader is already looking, on the record they are considering, and
            it can only ever mean THAT one. A ··· outside the box asked "edit
            which?" and answered "whichever is currently chosen", which is a
            different and worse question. The row's own click still selects —
            the pencil stops the event before Command sees it.
          */}
          <SheetField label="Customer" required>
            <Combobox
              className="w-full"
              value={draft.customer}
              onValueChange={(v) => set("customer", v)}
              options={customers}
              placeholder="Select customer"
              searchPlaceholder="Search customers…"
              emptyText="No customer found."
              optionAction={(name) => (
                <OptionEditButton
                  label={`Edit ${name}`}
                  onEdit={() => setEditing({ kind: "customer", name })}
                />
              )}
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
              optionAction={(name) => (
                <OptionEditButton
                  label={`Edit ${name}`}
                  onEdit={() => setEditing({ kind: "shipTo", name })}
                />
              )}
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
          <SheetField label="Order Type" required>
            <Combobox
              className="w-full"
              value={draft.orderType}
              onValueChange={(v) => set("orderType", v as BrokerOrderType)}
              disabled={isMovement}
              options={[...LISTING_TYPES]}
              placeholder="Select order type"
              searchPlaceholder="Search types…"
            />
          </SheetField>
        </div>

        {/* TAGS GET THEIR OWN LINE — the same call the movement sheet makes.
            Every other control here holds a single value in a fixed box; tags
            are a growing list, so sharing a row would let the number of tags
            decide the height of the field beside them. */}
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
      </SheetSection>

      {/* The people on the order, together. POC and salesperson were split
          across two places; they answer the same question — who to call. */}
      <SheetSection title="POC Details">
        {/* One person per row: name and the two ways to reach them read as a
            single fact, so they sit side by side rather than wrapping over two
            rows with the contact detached from whose it is.

            FOUR TO FIVE, not one to two. The read-out card took two thirds of
            every row it appeared in, and it is the half of the row nobody
            types into — a phone number needs the width it needs, while a name,
            a date or a picker was being squeezed to fit around it. The card
            gives back a fifth of its width and the control takes it. The same
            split is used by the three rows that pair a control with a card and
            by the schedule row below, so the left edges of the form's controls
            line up all the way down. */}
        <div className="grid grid-cols-9 gap-4">
          <SheetField
            label={
              <span className="flex w-full items-center justify-between gap-2">
                <span>
                  POC Name<span className="text-destructive"> *</span>
                </span>
                {/* ADD A SECOND, on the row it belongs to. A site often has two
                    numbers — the foreman and the office — and the second only
                    exists on some orders, so it is a CTA rather than a field
                    sitting empty on every one of them. */}
                {draft.secondaryPoc === "" && (
                  <button
                    type="button"
                    className="text-xs font-normal text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => set("secondaryPoc", secondPocChoices[0] ?? "")}
                  >
                    + Secondary POC
                  </button>
                )}
              </span>
            }
            className="col-span-4"
          >
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
          <div className="group/card col-span-5 flex h-9 items-center self-end overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {poc ? (
              <>
                <CopyValue value={poc.phone} label="POC contact" tabular />
                <span aria-hidden className="mr-6 text-fp-outline-1">
                  |
                </span>
                <CopyValue value={poc.email} label="POC email" />
                {/* ON HOVER, like the copy buttons beside it. A card that is a
                    READ-OUT should look like one at rest; a pencil sitting on
                    it permanently makes it read as a field, which is exactly
                    what it is not. Keyboard focus reveals it too, so it is not
                    mouse-only. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100"
                      aria-label={`Edit ${draft.primaryPoc} contact details`}
                      onClick={() => setEditingPoc("primary")}
                    >
                      <Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit contact details</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a POC to see their contact and email.
              </span>
            )}
          </div>
        </div>

        {/* The second person, once asked for. Same row shape as the first, so
            two POCs read as two of the same thing rather than as a field and
            an afterthought. */}
        {draft.secondaryPoc !== "" && (
          <div className="grid grid-cols-9 gap-4">
            <SheetField
              label={
                <span className="flex w-full items-center justify-between gap-2">
                  <span>Secondary POC</span>
                  <button
                    type="button"
                    className="text-xs font-normal text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-destructive hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => set("secondaryPoc", "")}
                  >
                    Remove
                  </button>
                </span>
              }
              className="col-span-4"
            >
              <Combobox
                className="w-full"
                value={draft.secondaryPoc}
                onValueChange={(v) => set("secondaryPoc", v)}
                options={secondPocChoices}
                placeholder="Select POC Name"
                searchPlaceholder="Search contacts…"
                emptyText="No contact found."
              />
            </SheetField>
            <div className="group/card col-span-5 flex h-9 items-center self-end overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
              {poc2 ? (
                <>
                  <CopyValue value={poc2.phone} label="Secondary POC contact" tabular />
                  <span aria-hidden className="mr-6 text-fp-outline-1">
                    |
                  </span>
                  <CopyValue value={poc2.email} label="Secondary POC email" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100"
                        aria-label={`Edit ${draft.secondaryPoc} contact details`}
                        onClick={() => setEditingPoc("secondary")}
                      >
                        <Pencil />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit contact details</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Select a POC to see their contact and email.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-9 gap-4">
          {/* Optional: an order can be raised before anyone owns it. */}
          <SheetField label="Sales Person" className="col-span-4">
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
          <div className="group/card col-span-5 flex h-9 items-center self-end overflow-hidden rounded-md border border-fp-outline-1 bg-fp-surface-1a px-3">
            {SALES_CONTACTS[draft.salesperson] ? (
              <>
                <CopyValue
                  value={SALES_CONTACTS[draft.salesperson]}
                  label="sales contact"
                  tabular
                />
                {/* SAME CARD, SAME AFFORDANCE. A salesperson's number goes
                    stale exactly as often as a POC's, and a card that is
                    editable in one place and not the other is a rule nobody
                    can learn. */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100"
                      aria-label={`Edit ${draft.salesperson} contact details`}
                      onClick={() => setEditingSales(true)}
                    >
                      <Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit contact details</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a sales person to see their contact.
              </span>
            )}
          </div>
        </div>
      </SheetSection>

      <SheetSection title="Schedule Details">
        <div className="grid grid-cols-9 gap-4">
          <SheetField label="Planned Delivery Date" required className="col-span-4">
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
          {/* A WINDOW IS TWO TIMES, NOT A CATEGORY. The six fixed options
              could not say "7 to 11", or "all day", or a two-hour slot — a
              customer who could take one was filed under the nearest option
              and the difference lived in somebody's head. */}
          <TimeWindowSlider
            className="col-span-5"
            label="Delivery Window"
            required
            start={windowMinutes[0]}
            end={windowMinutes[1]}
            onChange={(a, b) => {
              set("windowStart", formatMinutes(a));
              set("windowEnd", formatMinutes(b));
            }}
            aria-label="Delivery window"
          />

          {/* A FIELD, not a checkbox. Recurring is a property of the order that
              belongs in the row that describes its schedule, and it gates the
              cadence below — a checkbox floating under the row read as an
              afterthought and gave the reveal nothing to hang off. Answering
              "No" is a real answer, which is why it is an option rather than an
              unticked box: an empty checkbox and a deliberate "not recurring"
              look identical and are not the same thing. */}
          <SheetField label="Recurring Order" required className="col-span-4">
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

          {/* Revealed by the field beside it, IN THE ROW IT ANSWERS. A cadence
              with nothing recurring is a question about nothing, so it appears
              only on "Yes" — and when it appears it takes the empty half of the
              row rather than pushing a new one below, which read as a separate
              question and left a hole beside "Recurring Order".
              "Custom" opens its own dialog rather than growing five more fields
              nobody uses on the common cadences. */}
          {draft.recurring && (
            <SheetField label="Frequency" required className="col-span-5">
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
          )}

          {/* Under Frequency, in Frequency's own column — it is what that
              choice resolved to, not a new question. */}
          {draft.recurring &&
            draft.recurrenceFrequency === "Custom" &&
            draft.customRecurrence && (
              <SheetField label="Custom rule" className="col-span-5 col-start-5">
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

      </SheetSection>

      {/* §5.20 — movement orders show Asset instead of the product sections, and
          the asset is FIXED once the order is created. Read-only is the honest
          rendering of a field that cannot be changed. */}
      {isMovement && order?.movement && (
        <SheetSection title="Asset">
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
        </SheetSection>
      )}

      {/* FLUSH — the one section on trial with it. This section IS its table,
          and inside a padded card the table's own border ran 16px inside the
          card's, two lines doing one job. See `flush` on `SheetSection`. */}
      {!isMovement && (
        <SheetSection title="Delivery Order" flush>
          {/* ALWAYS A TABLE, never an empty-state panel standing in for one. An
              empty table with its columns showing tells you what an order line
              is made of and is ready to be typed into; a panel saying "select a
              customer first" tells you only what you cannot do yet.

              DS editable-table idiom (form-layout/table-cells): fixed layout,
              Surface-1a header, cells with no chrome of their own, and the Add
              chip attached to the squared bottom-left corner. */}
          <div>
            {/* NO BORDER AND NO RADIUS OF ITS OWN — the card supplies both, and
                its `overflow-hidden` clips these corners for us. */}
            <div>
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[92px]" />
                  <col className="w-[34%]" />
                  <col className="w-[30%]" />
                  <col />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    {/* THE COLUMN IS NAMED, so the tick means one thing on its
                        own. Unlabelled, it needed a switch below the table to
                        say what it was for, and the same tick then meant
                        different things depending on that switch. */}
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Top off</TableRequiredLabel>
                    </th>
                    {/* NOT REQUIRED. A line can name a product and a quantity
                        with no asset — bulk into a tank that is not on our
                        books, or a drop the driver identifies on arrival. The
                        asterisk was refusing orders the business takes. */}
                    <th className="px-3 py-2.5 text-left">
                      <TableRequiredLabel>Asset</TableRequiredLabel>
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
                        {/* THE RENTAL BADGE BELONGS TO THE ASSET. It says the
                            TANK is ours on hire, not that the fuel is — sat on
                            the product cell it read as a rental product, which
                            is not a thing. */}
                        <td className="relative p-0">
                          {asset?.rental && (
                            <span className="pointer-events-none absolute top-1/2 right-8 -translate-y-1/2 z-10">
                              <Badge variant="secondary">Rental</Badge>
                            </span>
                          )}
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
                    <tr className="h-11 border-t border-border bg-fp-table-header">
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
            {/* THE ADD ROW IS NOW A STRIP, not a chip hanging off a corner.
                The DS "+ Add more" attaches to the table's squared bottom-left
                — which only exists while the table has a corner of its own.
                Flush against the card there is no corner to hang from, so the
                affordance becomes the last band of the table: its own rule
                above it, the same insets as a cell, and still at the END of the
                rows because that is where the next row goes.

                THE ADD AND THE ORDER-WIDE FLAG SHARE THE LINE, at opposite ends.
                Winter additive is a property of the LOAD, not of a row — every
                gallon on the truck is blended or none is — so it cannot live in
                the table, and a section of its own for one checkbox would be a
                heading with nothing under it. */}
            <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={addBlankLine}
                className="-mx-1 flex h-8 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Plus className="size-4" /> Add asset
              </button>
              <label
                htmlFor="winter-additive"
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  id="winter-additive"
                  checked={draft.winterAdditive}
                  onCheckedChange={(c) => set("winterAdditive", c === true)}
                />
                Mark as winter additive
              </label>
            </div>
          </div>

        </SheetSection>
      )}

      {/* Load Order is OPTIONAL, so it is not on screen until it is asked for.
          An empty required-looking table on every order is a section people
          learn to scroll past; a CTA states that the step exists and is a
          choice. Same table idiom as the Delivery Order above it. */}
      {!isMovement && (
        <SheetSection
          title="Load Order"
          /* FLUSH ONLY WHEN IT IS THE TABLE. The other two branches are a CTA
             panel and an empty state, both of which are their own padded box
             and would sit on the card's edge without the body's insets. */
          flush={Boolean(loadRows) && hasAssets}
          /* The DS control — see `SheetSectionRemove` for why it is a minus
             and not a bin. */
          action={
            loadRows && (
              <SheetSectionRemove
                label="Remove Load Order"
                /* The rows arrive prefilled with the order's products, so the
                   product alone is not evidence anyone has been here — a
                   terminal, an account or a quantity is. */
                hasContent={loadRows.some(
                  (r) => r.terminal || r.supplier || r.loadingAccount || r.excluded
                )}
                onClick={() => set("loadRows", null)}
              />
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
            <div>
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[44px]" />
                  <col className="w-[26%]" />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
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
        title="Vendor"
        flush
        note={
          <SheetSectionNote label="How inviting vendors works">
            <p className="text-foreground">
              Showing vendors that are active, compliant on the delivery date,
              run {requiredLine}, and serve {site?.state ?? "the ship-to state"}.
            </p>
            <p className="mt-1.5 text-muted-foreground">
              Everyone invited is notified at the same time.
            </p>
            {ineligibleNote && (
              <p className="mt-1.5 text-muted-foreground">{ineligibleNote}</p>
            )}
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
              <div>
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[44px]" />
                    <col className="w-[25%]" />
                    <col className="w-[18%]" />
                    <col />
                    <col className="w-[132px]" />
                    {showQuoteCol && <col className="w-[124px]" />}
                    <col className="w-[52px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-fp-table-header">
                      <th className="px-3 py-2.5">
                        <Checkbox
                          checked={headerChecked}
                          onCheckedChange={(c) => selectAllPartners(c === true)}
                          aria-label="Select all vendors"
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Vendor</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Address</TableRequiredLabel>
                      </th>
                      {/* SAFETY AND DISTANCE ARE GONE. They rank vendors when
                          you are choosing between several; by the time a row
                          exists the choice is made, and a score sitting beside
                          a decision already taken is decoration. Both are still
                          on the vendor record and still filters in the
                          Directory. */}
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Products</TableRequiredLabel>
                      </th>
                      {/* INVITING IS PER ROW. It was one button under the table
                          that sent to everybody at once, which is wrong the
                          moment two vendors are listed and only one is ready —
                          and it disappeared entirely once the order left Draft,
                          taking the ability to add a vendor later with it. */}
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Invite</TableRequiredLabel>
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
                          No vendor yet.
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
                                checked={Boolean(id) && selected.has(id)}
                                disabled={!id}
                                onCheckedChange={(c) =>
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (c === true) next.add(id);
                                    else next.delete(id);
                                    return next;
                                  })
                                }
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
                                placeholder="Add vendor"
                                disabled={draft.status === "Blocked"}
                                aria-label={`Vendor for row ${i + 1}`}
                                /* NO REACHABILITY TAG. "Emails off" and "Link
                                   only" described how the invitation would
                                   travel, which is the vendor record's business
                                   and not this order's — and on the row they
                                   read as a warning about the partner. The
                                   fields are still on the vendor; nothing on
                                   this table speaks for them. */
                                onChange={(name) => {
                                  const picked = eligible.find((x) => x.name === name);
                                  if (picked) setPartnerAt(i, picked.id);
                                }}
                              />
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {v?.base ?? "—"}
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {v ? v.businessLines.join(" · ") : "—"}
                            </td>
                            {/* THREE STATES, and the row says which: not asked
                                yet, asked, or already back with an answer. */}
                            <td className="px-3">
                              {!id ? (
                                <span className="text-sm text-muted-foreground">—</span>
                              ) : draft.acceptedVendorIds.includes(id) ? (
                                <StatusChip tone="success" variant="text">
                                  Accepted
                                </StatusChip>
                              ) : sentIds.includes(id) ? (
                                <StatusChip tone="processing" variant="text">
                                  Invited
                                </StatusChip>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled={draft.status === "Blocked"}
                                  title={
                                    draft.status === "Blocked"
                                      ? "A blocked order cannot be sent to a vendor"
                                      : undefined
                                  }
                                  onClick={() => sendInvitations([id])}
                                >
                                  <Check /> Invite
                                </Button>
                              )}
                            </td>
                            {showQuoteCol && (
                              <td className="px-3 text-right text-sm tabular-nums">
                                {quote ? (
                                  <span className="text-foreground">
                                    ${quoteTotal(quote, draft.lines, chargesBase).toLocaleString(undefined, {
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
                                <DropdownMenuContent align="end" className="w-72">
                                  {/* ONE ITEM, NOT TWO. Doing this on a partner's
                                      behalf is one act with one reason: the
                                      price was agreed on a call and someone is
                                      writing it down. It opens step 2, which is
                                      where the numbers go. */}
                                  <DropdownMenuItem
                                    onSelect={() => acknowledgeAndAccept(id)}
                                  >
                                    <Check />
                                    Acknowledge and accept quote
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {/* NOT "CANCEL INVITATION". Before it is sent
                                      there is nothing to cancel, and after it is
                                      sent this is still a removal — one label
                                      that is true at both moments. */}
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => removePartnerRows([i])}
                                  >
                                    <ThumbsDown />
                                    Remove vendor
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
              {/* The last band of the table, where the next row goes — the
                  squared-corner chip needs a corner, and flush there is none. */}
              <div className="border-t border-border px-3 py-2">
                <button
                  type="button"
                  disabled={draft.status === "Blocked" || uninvited.length === 0}
                  onClick={addPartnerRow}
                  className="-mx-1 flex h-8 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Plus className="size-4" /> Add vendor
                </button>
              </div>
            </div>

            {/* §6's per-order kill switch, the same one the movement sheet
                carries and the one this sheet was missing. ON by default —
                suppressing every email is the deliberate act, so it is the one
                that costs a click. It is not a field in the list, so it takes
                the card's insets back and the rule that closes the table. */}
            <label
              htmlFor="do-notify"
              className="flex cursor-pointer items-center justify-between gap-4 border-t border-border p-4"
            >
              <span className="text-sm font-medium text-foreground">
                Send email notifications to vendor
              </span>
              <Switch
                id="do-notify"
                checked={draft.notifyVendor}
                onCheckedChange={(v) => set("notifyVendor", v)}
              />
            </label>

            {/* BULK. The same checked rows the quote switch reads — one
                selection, not a second one that can disagree with it. Only one
                partner can take the order, so acknowledging is a one-row
                action; cancelling is not. */}
            {/* A PROPERTY OF THE ROUND, not of a selection. Everyone invited is
                asked, or nobody is — binding it to the ticked rows made two
                unrelated decisions share one control, and left the switch
                describing a selection that now starts empty. It sits directly
                under the table it applies to, above anything that acts on a
                selection. */}

            {/* IT IS ASKED ONCE, BEFORE ANYONE IS ASKED ANYTHING. What was
                requested of the partners is a fact about the round the moment
                it goes out; a switch afterwards offers to change a question
                that has already been put — and turning it off would not take
                the quotes back. Editable while the order is a Draft, stated
                from then on. */}
            {/* ONLY WHILE IT IS STILL A CHOICE. Past Draft this said what had
                been asked for weeks ago — a sentence nobody could act on, in
                the place a control used to be. What was requested is in the
                activity trail, where the rest of the order's history is. */}
            {invitedIds.length > 0 && draft.status === "Draft" && (
                <label
                  htmlFor="quote"
                  className="flex cursor-pointer items-center justify-between gap-4 border-t border-border p-4"
                >
                  <span className="flex flex-col gap-1 text-sm font-medium text-foreground">
                    Request a quote
                    <span className="text-xs font-normal text-muted-foreground">
                      Every invited partner submits pricing instead of a plain
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

            {/* THE DS BAR, not a second one. It comes LAST in the section
                because it is about the rows someone has just ticked — it
                appears and disappears, and anything below it would jump. Above
                it sit the things that are always true of the round. What can be done to a selection is
                a property of the records, so the verbs are passed in; the count
                chip, the spacing, the hairlines and confirm-on-destructive all
                come from the design system, which is what makes a selection in
                this sheet feel like a selection anywhere else. The Copy /
                Delete / More zone is off: this list's actions are fixed. */}
            <div className="flex justify-center p-4 pt-0">
              <BulkActionBar
                count={selectedRows.length}
                noun="vendor"
                onClear={() => selectAllPartners(false)}
                actions={[
                  {
                    /* AS MANY AS ARE TICKED. Acknowledging is the partner's
                       act, and several partners saying yes is the normal
                       outcome of inviting several — it was only ever the
                       BROKER'S choice of whose price to take that had to be
                       one, and that is a different control in step 2. */
                    key: "ack",
                    label: "Acknowledge for them",
                    icon: <Check />,
                    onSelect: () => {
                      acknowledgeFor(selectedRows.map((i) => partnerRows[i]));
                      selectAllPartners(false);
                    },
                  },
                  {
                    key: "remove",
                    label: "Remove vendor",
                    icon: <ThumbsDown />,
                    destructive: true,
                    onSelect: () => removePartnerRows(selectedRows),
                  },
                ]}
              />
            </div>

          </>
        )}

        {draft.vendorId && draft.status !== "Assigned" && (
          /* NOT A TABLE — the accepted-partner branch is a card and a field, so
             it takes the card's insets back. */
          <SheetSectionInset>
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
                    $
                    {quoteTotal(q, draft.lines, chargesBase).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-muted-foreground">
                      across {q.lines.length}{" "}
                      {q.lines.length === 1 ? "line" : "lines"}
                    </span>
                  </p>
                </SheetField>
              );
            })()}
            {/* THE STAGE CTAs LIVE IN STEP 2, under the acceptance that earns
                them — see "Final Calculations". Repeating them here would be
                two places to move one order on. */}
            {draft.status === "Accounting Synced" && (
              <p className="text-xs text-muted-foreground">
                Synced. Every field is locked once an order reaches this stage.
              </p>
            )}
          </SheetSectionInset>
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

      {/* LAST IN THE SHEET, and it belongs here: everything above is what the
          order IS, and this is what is attached to it. Nothing after it. */}
      <SheetSection title="Additional Details">
        {/*
          WHO MAY SEE WHAT IS ATTACHED HERE. Public travels with the order —
          the vendor and the customer see it. Private stays inside the
          building. It leads the section because it governs everything under
          it, and a file uploaded before the choice is made is a file uploaded
          under an assumption.
        */}
        <SheetField label="Visibility" required>
          <RadioGroup
            className="flex gap-6"
            value={draft.visibility}
            onValueChange={(v) => set("visibility", v as "Public" | "Private")}
          >
            {(["Public", "Private"] as const).map((v) => (
              <label
                key={v}
                htmlFor={`vis-${v}`}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <RadioGroupItem id={`vis-${v}`} value={v} />
                {v}
              </label>
            ))}
          </RadioGroup>
        </SheetField>
        <SheetField label="Upload Supporting Image">
          {/* The DS control in its `field` variant — dropzone, note, and only
              the files actually added. The showcase variant's seeded chips and
              permanent "Uploading 2 of 3" block belong to the gallery. */}
          <FileUpload
            variant="field"
            label="Choose a file to upload"
          />
        </SheetField>
        <SheetField label="Delivery Instructions">
          <Textarea
            value={draft.instructions}
            placeholder="Enter any delivery instructions here"
            onChange={(e) => set("instructions", e.target.value)}
          />
        </SheetField>
        {/* SEPARATE FROM THE INSTRUCTIONS ABOVE, and the description is the
            whole reason it is its own field: one of these is read by a driver
            at a gate, the other by nobody outside the building. A single
            "Notes" box would have people writing gate codes where the vendor
            can read them, or holding back things the driver needed. */}
        <SheetField
          label="Internal Note"
        >
          <Textarea
            value={draft.internalNote}
            placeholder="Add an internal note"
            onChange={(e) => set("internalNote", e.target.value)}
          />
        </SheetField>
      </SheetSection>
        </>
      ) : (
        <>
        {/* ── STEP 2 IS TWO COLUMNS ─────────────────────────────────────────
            THE TOTALS HAVE TO STAY VISIBLE WHILE THE NUMBERS THAT FEED THEM
            ARE BEING TYPED. Stacked, Final Calculations sat below two tables
            that can each run to a dozen rows, so setting a customer price
            meant typing, scrolling, reading the margin, scrolling back, and
            holding the figure in your head across the trip. It is the one
            block on this step that is READ rather than filled in, and the one
            the decision turns on.

            THE RAIL IS FIXED-WIDTH AND THE MAIN COLUMN TAKES THE REST, so the
            pricing tables keep the width they need; the step is on the widest
            sheet size for the same reason. It drops back to one column under
            1024px, where a 320px rail would leave the tables scrolling
            sideways to save a scroll downwards. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-10">
            {/* ── STEP 2 ────────────────────────────────────────────────────────
                Three things, in the order each feeds the next: read what the
                vendor charges, set what the customer pays, then decide whether
                the difference is worth taking.

                NO SUMMARY TABLE ON TOP. It listed the partners with their totals
                and their margins — every figure of which the two tables below it
                already carry, and the totals row of Final Calculations carries
                again. WHICH vendor you are reading is the only thing it did that
                nothing else does, and that is a choice, not a table: it sits on
                the Vendor Pricing heading, which is the section it changes. */}
            {shownVendorId && (
              <SheetSection
                title="Vendor Pricing"
                flush
                /* WHOSE PRICE THIS IS. One partner needs no control — a select of
                   one is a question with an answer already in it — so it states
                   the name and whether they hold the order. More than one and it
                   becomes a picker, because the table below can only show one. */
                /* IT SAYS WHAT THE LIST IS. A bare dropdown of company names on a
                   heading row is a question nobody asked: these are the delivery
                   partners that said yes to this order, and the control picks
                   whose price the table below shows. Unlabelled, the only way to
                   find that out was to open it. */
                action={
                  quotingPartners.length > 1 ? (
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Quote from
                      </span>
                    <Combobox
                      className="h-8 w-64"
                      value={shownVendorId}
                      onValueChange={setShownQuote}
                      options={quotingPartners.map((vid) => ({
                        value: vid,
                        label: vendorById(vid)?.name ?? vid,
                        description:
                          draft.vendorId === vid
                            ? "Holds this order"
                            : draft.vendorId
                              ? "On hold"
                              : quoteOf(vid)
                                ? "Priced"
                                : "Not priced",
                      }))}
                      searchPlaceholder="Search vendors…"
                    />
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Quote from{" "}
                      <span className="text-foreground">
                        {vendorById(shownVendorId)?.name}
                      </span>
                      {draft.vendorId === shownVendorId && " · holds this order"}
                    </span>
                  )
                }
                note={
                  <SheetSectionNote label="About vendor pricing">
                    What {vendorById(shownVendorId)?.name ?? "the partner"} charges
                    to move this order. TLC is the total landing cost — delivered
                    gallons times rate plus surcharge — because a low rate with a
                    high surcharge is not a cheap quote.
                    <span className="mt-1.5 block">
                      Typed here as well as received: a partner that gave its price
                      on a call still has a price. Delivered gallons are the
                      exception — typed once, in Customer Pricing below.
                    </span>
                  </SheetSectionNote>
                }
              >
                {/*
                  THE RULE, ON THE SECTION IT CHANGES.

                  An order has two shapes and they price differently, so a table
                  of rates means one thing on a Tuesday and another on a Wednesday
                  unless it says which it is. It is stated here rather than in the
                  section note because it is not background: it decides whether
                  the subtotal below counts.

                  THE INLINE BANNER, NOT THE CALLOUT. A solid indigo bar with
                  white text is the DS's loudest voice, and this is a standing
                  condition of the order rather than something that has gone
                  wrong: it was pulling the eye away from the figures it exists to
                  explain. On the card surface with the status carried by the text
                  colour, it is read once and then sits still.
                */}
                <SheetSectionInset>
                  <BannerInline
                    status="info"
                    title={hasLoadOrder ? "Load Order Created" : "No Load Order"}
                  >
                    {hasLoadOrder
                      ? "The vendor charges freight, fees and taxes only — the base price is yours."
                      : "The charges will be set by the vendor."}
                  </BannerInline>
                </SheetSectionInset>

                <div className="fp-scrollbar overflow-x-auto border-t border-border">
                  <table className="w-full min-w-[980px] table-fixed border-collapse">
                    <colgroup>
                      <col />
                      <col className="w-[22%]" />
                      <col className="w-[112px]" />
                      <col className="w-[132px]" />
                      <col className="w-[124px]" />
                      <col className="w-[128px]" />
                      <col className="w-[140px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-fp-table-header">
                        <th className="px-3 py-2.5 text-left">
                          <TableRequiredLabel>Asset name</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-left">
                          <TableRequiredLabel>Product</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-right">
                          <TableRequiredLabel>Req. gal (A)</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-right">
                          <TableRequiredLabel>Delivered gal (D)</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-right">
                          <TableRequiredLabel>Rate/gal (B)</TableRequiredLabel>
                        </th>
                        <th className="px-3 py-2.5 text-right">
                          <TableRequiredLabel>Surcharge (C)</TableRequiredLabel>
                        </th>
                        <th
                          className="px-3 py-2.5 text-right"
                          title="Total landing cost — delivered gallons x (rate + surcharge)"
                        >
                          <TableRequiredLabel>TLC D×(B+C)</TableRequiredLabel>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lines.map((l, i) => {
                        const ql = shownQuote?.lines.find((x) => x.asset === l.asset);
                        const put = (patch: Partial<QuoteLine>) =>
                          setQuoteLine(shownVendorId, l.asset, patch);
                        return (
                          <tr
                            key={i}
                            className="h-12 border-b border-border last:border-b-0"
                          >
                            <td className="truncate px-3 text-sm text-foreground">
                              {l.asset || "—"}
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {l.product}
                            </td>
                            <td className="px-3 text-right text-sm tabular-nums text-muted-foreground">
                              {l.topOff ? "Top-off" : (l.gal ?? 0).toLocaleString()}
                            </td>
                            {/* READ-ONLY HERE. The same figure is typed in the
                                customer table below — one editable place, so the
                                two tables cannot come to disagree about how much
                                went in. Until it is typed the requested figure is
                                what the TLC uses, so that is what this cell shows,
                                dimmed, because it is an assumption. */}
                            <td
                              className={cn(
                                "px-3 text-right text-sm tabular-nums",
                                l.deliveredGal == null
                                  ? "text-muted-foreground/60"
                                  : "text-muted-foreground"
                              )}
                              title={
                                l.deliveredGal == null
                                  ? "Not delivered yet — priced on the requested quantity"
                                  : undefined
                              }
                            >
                              {billableGal(l).toLocaleString()}
                            </td>
                            <td className="relative p-0">
                              <TableCellInput
                                value={ql ? String(ql.ratePerGal) : ""}
                                placeholder="0.000"
                                numeric
                                prefix="$"
                                aria-label={`Vendor rate per gallon for line ${i + 1}`}
                                onChange={(v) => put({ ratePerGal: num(v) })}
                              />
                            </td>
                            <td className="relative p-0">
                              <TableCellInput
                                value={ql ? String(ql.surcharge) : ""}
                                placeholder="0.000"
                                numeric
                                prefix="$"
                                aria-label={`Vendor surcharge for line ${i + 1}`}
                                onChange={(v) => put({ surcharge: num(v) })}
                              />
                            </td>
                            <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                              {ql ? money(quoteLineTotal(ql, l)) : money(0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/*
                      THE BASE, THEN WHAT IS ADDED TO IT, THEN THE TOTAL.

                      Freight, fees and taxes are charged once for the run, not
                      per gallon, so they cannot be columns — a per-line freight
                      would have to be divided by somebody and the division would
                      be invented. They are rows under the table, which is also
                      where the reader is already looking for a total.
                    */}
                    <tfoot>
                      <tr className="h-11 border-t border-border">
                        {/* LEFT, NOT RIGHT. The table is 980px wide and scrolls;
                            a label right-aligned against its figure means both
                            are off-screen together, and the reader scrolls to
                            find out what the number is called. */}
                        <td
                          colSpan={6}
                          className="px-3 text-sm text-muted-foreground"
                        >
                          Base price — product + margin
                        </td>
                        <td
                          className={cn(
                            "px-3 text-right text-sm tabular-nums",
                            /* STATED, NOT HIDDEN. The figure is what the partner
                               would have charged; striking it says the quote was
                               read and the base was set aside, where an absent
                               row would look like nobody priced it. */
                            chargesBase
                              ? "font-medium text-foreground"
                              : "text-muted-foreground/60 line-through"
                          )}
                          title={
                            chargesBase
                              ? undefined
                              : "Not charged — the load order makes the product yours"
                          }
                        >
                          {money(shownBase)}
                        </td>
                      </tr>
                      {ORDER_CHARGES.map((c) => (
                        <tr key={c.key} className="h-11 border-t border-border">
                          <td
                            colSpan={6}
                            className="px-3 text-sm text-muted-foreground"
                          >
                            {c.label}
                          </td>
                          <td className="relative p-0">
                            <TableCellInput
                              value={
                                shownQuote ? String(shownQuote[c.key] ?? 0) : ""
                              }
                              placeholder="0"
                              numeric
                              prefix="$"
                              aria-label={`${c.label} charged by the partner`}
                              onChange={(v) =>
                                setQuoteCharge(shownVendorId, { [c.key]: num(v) })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="h-11 border-t border-border bg-fp-table-header">
                        <td
                          colSpan={6}
                          className="px-3 text-sm text-muted-foreground"
                        >
                          Vendor total
                        </td>
                        <td className="px-3 text-right text-sm font-semibold tabular-nums text-foreground">
                          {money(shownCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </SheetSection>
            )}

            <SheetSection
              title="Customer Pricing"
              flush
              note={
                <SheetSectionNote label="About customer pricing">
                  What the customer is charged, per line. Delivered gallons are
                  typed once here and read by the partner's table above. Margin is
                  per gallon, on top of your price — the line total is A × (B + C).
                </SheetSectionNote>
              }
            >
              <div className="fp-scrollbar overflow-x-auto">
                <table className="w-full min-w-[980px] table-fixed border-collapse">
                  <colgroup>
                    <col />
                    <col className="w-[22%]" />
                    <col className="w-[124px]" />
                    <col className="w-[132px]" />
                    <col className="w-[124px]" />
                    <col className="w-[124px]" />
                    <col className="w-[140px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-fp-table-header">
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Asset name</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Product</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <TableRequiredLabel>Requested gal</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <TableRequiredLabel>Delivered gal (A)</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <TableRequiredLabel>Price/gal (B)</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <TableRequiredLabel>Margin (C)</TableRequiredLabel>
                      </th>
                      <th className="px-3 py-2.5 text-right">
                        <TableRequiredLabel>Total A×(B+C)</TableRequiredLabel>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.lines.map((l, i) => (
                      <tr key={i} className="h-12 border-b border-border last:border-b-0">
                        <td className="truncate px-3 text-sm text-foreground">
                          {l.asset || "—"}
                        </td>
                        <td className="truncate px-3 text-sm text-muted-foreground">
                          {l.product}
                        </td>
                        <td className="px-3 text-right text-sm tabular-nums text-muted-foreground">
                          {l.topOff ? "Top-off" : (l.gal ?? 0).toLocaleString()}
                        </td>
                        <td className="relative p-0">
                          <TableCellInput
                            value={l.deliveredGal == null ? "" : String(l.deliveredGal)}
                            placeholder={l.topOff ? "0" : String(l.gal ?? 0)}
                            numeric
                            suffix="gal"
                            aria-label={`Delivered gallons for line ${i + 1}`}
                            onChange={(v) =>
                              setLine(i, {
                                deliveredGal: v.trim() === "" ? null : num(v),
                              })
                            }
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellInput
                            value={l.pricePerGal == null ? "" : String(l.pricePerGal)}
                            placeholder="0.00"
                            numeric
                            prefix="$"
                            aria-label={`Price per gallon for line ${i + 1}`}
                            onChange={(v) => setLine(i, { pricePerGal: num(v) })}
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellInput
                            value={l.marginPerGal == null ? "" : String(l.marginPerGal)}
                            placeholder="0.00"
                            numeric
                            prefix="$"
                            aria-label={`Margin per gallon for line ${i + 1}`}
                            onChange={(v) => setLine(i, { marginPerGal: num(v) })}
                          />
                        </td>
                        <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                          {money(customerLineTotal(l))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="h-11 border-t border-border bg-fp-table-header">
                      <td colSpan={6} className="px-3 text-right text-sm text-muted-foreground">
                        Products-level subtotal
                      </td>
                      <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                        {money(revenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SheetSection>
          </div>

          {/* THE DECISION, and it reads as one: the two totals and what is left
              between them, then the button. Accepting is not reversible from
              here, so the number it turns on is stated beside it rather than
              two sections up — and now beside it wherever the tables have been
              scrolled to, because `top-0` sticks it to the sheet body, which is
              the scroll container. */}
          <aside className="min-w-0 lg:sticky lg:top-0">
            {shownVendorId && (
              <SheetSection
                title="Final Calculations"
                flush
                note={
                  <SheetSectionNote label="About final calculations">
                    Line by line: what the partner charges to move it, what the
                    customer pays, and what is left. Both figures come from the
                    two tables beside it — this is where they meet.
                  </SheetSectionNote>
                }
              >
                {/* PER LINE, BECAUSE THE MARGIN IS NOT EVENLY SPREAD. One thin
                    product inside a healthy order is invisible in a single
                    total, and it is the line you would have repriced if you
                    had seen it.

                    A LIST, NOT THE FIVE-COLUMN TABLE IT WAS. In a 320px rail
                    five columns is four too many — and three of them were
                    repeats: the vendor's figure per line is the Vendor Pricing
                    table's own column and the customer's is Customer Pricing's,
                    both of them a few inches to the left and both of them
                    editable there, which this never was. What only this block
                    says is what is LEFT on each line, and the three totals it
                    adds up to. That is what it says now. */}
                <dl className="flex flex-col divide-y divide-border">
                  {draft.lines.map((l, i) => {
                    const ql = shownQuote?.lines.find((x) => x.asset === l.asset);
                    const cost = ql ? quoteLineTotal(ql, l) : 0;
                    const sell = customerLineTotal(l);
                    return (
                      <div
                        key={i}
                        className="flex items-baseline justify-between gap-3 px-3 py-2.5"
                      >
                        <dt className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-foreground">
                            {l.asset || "—"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {l.product} · {billableGal(l).toLocaleString()} gal
                          </span>
                        </dt>
                        <dd
                          className={cn(
                            "shrink-0 text-sm font-medium tabular-nums",
                            sell - cost < 0 ? "text-destructive" : "text-foreground"
                          )}
                        >
                          {money(sell - cost)}
                        </dd>
                      </div>
                    );
                  })}
                  {/* THE CHARGES THAT BELONG TO NO LINE. Without a row of their
                      own the column stopped adding up to its own total —
                      freight is charged once for the run, so there is no line
                      to put it on and no honest way to spread it. */}
                  <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                    <dt className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-foreground">
                        Order-level charges
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Freight, fees and taxes
                      </span>
                    </dt>
                    {/* `-0` IS NOT A NUMBER ANYBODY WROTE. Negating a zero
                        gives one, and `Intl` prints it as "$-0.00" — which in a
                        column of money reads as a figure someone entered. */}
                    <dd className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {money(shownCharges === 0 ? 0 : -shownCharges)}
                    </dd>
                  </div>
                  {/* THE THREE TOTALS, on the band the table's tfoot used to
                      wear, so the rail still ends where the reading ends. */}
                  <div className="flex flex-col gap-1.5 bg-fp-table-header px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">Vendor TLC</dt>
                      <dd className="text-sm tabular-nums text-foreground">
                        {money(shownCost)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">
                        Customer pricing
                      </dt>
                      <dd className="text-sm tabular-nums text-foreground">
                        {money(revenue)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                      <dt className="text-xs text-muted-foreground">
                        Margin — {vendorById(shownVendorId)?.name ?? "partner"}
                      </dt>
                      {/* THE NUMBER THE DECISION TURNS ON, and the only figure
                          in this sheet allowed a colour: a margin that has gone
                          negative is the one thing here that must not be read
                          past. */}
                      <dd
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          shownMargin < 0 ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {money(shownMargin)}
                      </dd>
                    </div>
                  </div>
                </dl>
                {/* NO "THIS ORDER LOSES MONEY" LINE. The margin cell in the row
                    above is already red and already the only figure in this
                    sheet allowed a colour — a sentence under the list restated
                    it in words and made the one warning look like two.

                    Everything from here is not the list, so it takes the card's
                    insets back and the rule that separates it from the totals
                    band above. */}
                {(!shownQuote || draft.vendorId === shownVendorId) && (
                  <SheetSectionInset className="border-t border-border">
                    {!shownQuote && (
                      <p className="text-xs text-muted-foreground">
                        This partner has not priced the order.
                      </p>
                    )}
                {draft.vendorId === shownVendorId ? (
                  /* THE NEXT MOVE BELONGS HERE. Accepting used to leave you in
                     step 2 with the next CTA back in step 1's partner section —
                     an order that had just been agreed looked finished, and the
                     thing that carried it forward was on another screen.

                     THE ACCEPTANCE ITSELF IS IN THE HEADER, not here: who holds
                     the order is a fact about the order, true on every step, and
                     at the foot of a long one it was only visible where nobody
                     was looking. What is left here is what accepting made
                     possible. */
                  <div className="flex flex-col gap-3">
                    {draft.status === "Completed" && (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => advance("Accounting Sync Ready")}
                        >
                          Move to Accounting Sync Ready
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Hands the finished pricing to accounting.
                        </span>
                      </div>
                    )}
                    {/* TWO OUTCOMES AND A THIRD THAT IS DOING NOTHING. Some of an
                        order can reach the ledger and some can be rejected, so
                        "synced" is not the only way out of this stage — and a
                        stage whose only button is the happy path is one people
                        press to get rid of. Leaving it alone is the third, and it
                        needs no button. */}
                    {(draft.status === "Accounting Sync Ready" ||
                      draft.status === "Partial Accounting Synced") && (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => advance("Accounting Synced")}
                        >
                          Mark accounting synced
                        </Button>
                        {draft.status !== "Partial Accounting Synced" && (
                          <Button
                            variant="outline"
                            onClick={() => advance("Partial Accounting Synced")}
                          >
                            Mark partially synced
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {draft.status === "Partial Accounting Synced"
                            ? "Part of this order is still to reach accounting."
                            : "Or leave it here until accounting has taken it."}
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
                  </SheetSectionInset>
                )}
              </SheetSection>
            )}
          </aside>
        </div>
        </>
      )}
      {/*
        THREE ACTS ON A SAVED ORDER, side by side at the end of the form.

        They were behind a "More actions" menu in the sticky footer, which put
        them beside Save Changes — three things you do to an order sharing a
        bar with the one thing you do to the FORM. Out here they are what they
        are: the next steps once the order itself is settled, in the order
        somebody takes them — dispatch it, copy it, print it.

        Not in the footer, because the footer is for committing the sheet.
      */}
      {!creating && order && (
        <div className="flex flex-wrap items-center gap-3 border-t border-fp-outline-1 pt-6">
          <Button
            variant="outline"
            disabled={draft.status === "Draft" || draft.status === "Blocked"}
            title={
              draft.status === "Draft"
                ? "Send the order to a vendor first"
                : draft.status === "Blocked"
                  ? "A blocked order cannot be dispatched"
                  : undefined
            }
            onClick={() =>
              toast.success("Pushed to dispatch", {
                description: `${order.orderNo} is on the dispatch board.`,
              })
            }
          >
            <Truck />
            Push to dispatch
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Order duplicated", {
                description: "A copy has been created as a Draft.",
              })
            }
          >
            <Copy />
            Duplicate order
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Tickets downloading", {
                description: `Delivery tickets for ${order.orderNo}.`,
              })
            }
          >
            <Download />
            Download tickets
          </Button>
        </div>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {order?.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the working lanes and moves to Cancelled, keeping its
              history. Any vendor already invited is told it has gone.
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

      {/* DELETING IS NOT CANCELLING, and the copy has to say which. Cancel
          leaves the order in the Cancelled lane with its history; delete takes
          it away, and there is nothing to look at afterwards. */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {order?.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              The order and its history are removed for good. If you only want it
              out of the working lanes, cancel it instead — a cancelled order keeps
              its trail and can still be read.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                toast.success("Order deleted", { description: order?.orderNo });
                onOpenChange(false);
              }}
            >
              Delete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {order && order.audit.length > 0 && (
        <ReadDrawer
          open={activityOpen}
          onOpenChange={setActivityOpen}
          title="Activity"
          subtitle={`${order.orderNo} · ${order.audit.length} ${order.audit.length === 1 ? "entry" : "entries"}`}
        >
          <ol className="flex flex-col gap-4">
            {[...order.audit].reverse().map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="flex flex-col gap-1 border-l-2 border-fp-outline-1 pl-3"
              >
                <span className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="font-medium text-foreground">{e.by}</span>
                  <span className="text-muted-foreground">
                    {AUDIT_FMT.format(new Date(e.at))}
                  </span>
                </span>
                {/* ONE LINE PER THING THAT CHANGED, old value and new. "Status
                    changed" only proves somebody was here. */}
                {e.changes.map((c) => (
                  <span key={c} className="text-sm text-foreground">
                    {c}
                  </span>
                ))}
              </li>
            ))}
          </ol>
        </ReadDrawer>
      )}

      {/* ── linked-record editing ─────────────────────────────────────────
          Both drawers stack a layer above the order sheet, so the draft behind
          them is never unmounted — the whole point is that noticing a wrong
          number should not cost somebody the order they were raising. */}
      <EditDrawer
        open={editingPoc !== null}
        onOpenChange={(o) => !o && setEditingPoc(null)}
        title="Edit contact details"
        subtitle={editingPocName}
        canSave={pocEdit.phone.trim() !== "" && pocEdit.email.includes("@")}
        onSave={() => {
          /* Written to the directory, because these belong to the PERSON: the
             next order that names them should show the corrected number. */
          POC_DIRECTORY[editingPocName] = { phone: pocEdit.phone, email: pocEdit.email };
          toast.success("Contact details saved", { description: editingPocName });
        }}
      >
        <SheetField label="Phone" required>
          <Input
            type="tel"
            value={pocEdit.phone}
            onChange={(e) => setPocEdit((p) => ({ ...p, phone: e.target.value }))}
          />
        </SheetField>
        <SheetField
          label="Email"
          required
        >
          <Input
            type="email"
            value={pocEdit.email}
            onChange={(e) => setPocEdit((p) => ({ ...p, email: e.target.value }))}
          />
        </SheetField>
        <p className="text-xs text-muted-foreground">
          This is {editingPocName}&apos;s own record. Changing it here changes it on
          every order that names them.
        </p>
      </EditDrawer>

      <EditDrawer
        open={editingSales}
        onOpenChange={setEditingSales}
        title="Edit contact details"
        subtitle={draft.salesperson}
        canSave={salesEdit.trim() !== ""}
        onSave={() => {
          SALES_CONTACTS[draft.salesperson] = salesEdit;
          toast.success("Contact details saved", { description: draft.salesperson });
        }}
      >
        <SheetField label="Phone" required>
          <Input
            type="tel"
            value={salesEdit}
            onChange={(e) => setSalesEdit(e.target.value)}
          />
        </SheetField>
        <p className="text-xs text-muted-foreground">
          This is {draft.salesperson}&apos;s own record. Changing it here changes it
          on every order they own.
        </p>
      </EditDrawer>

      <EditDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.kind === "shipTo" ? "Edit ship-to details" : "Edit customer details"}
        subtitle={editing?.name}
        onSave={() => {
          if (!editing) return;
          if (editing.kind === "customer") {
            const c = BROKER_CUSTOMERS.find((x) => x.name === editing.name);
            if (c) {
              c.phone = recordEdit.a || null;
              c.email = recordEdit.b || null;
              c.billingEmail = recordEdit.c || null;
              c.customerInstruction = recordEdit.d || null;
            }
          } else {
            const st = SHIP_TO_SITES.find((x) => x.name === editing.name);
            if (st) {
              st.street = recordEdit.a;
              st.city = recordEdit.b;
              st.state = recordEdit.c;
              st.zip = recordEdit.d;
            }
          }
          toast.success(
            editing.kind === "shipTo" ? "Ship-to saved" : "Customer saved",
            { description: editing.name }
          );
        }}
      >
        {editing?.kind === "customer" ? (
          <>
            <SheetField label="Phone">
              <Input
                type="tel"
                value={recordEdit.a}
                onChange={(e) => setRecordEdit((r) => ({ ...r, a: e.target.value }))}
              />
            </SheetField>
            <SheetField label="Email">
              <Input
                type="email"
                value={recordEdit.b}
                onChange={(e) => setRecordEdit((r) => ({ ...r, b: e.target.value }))}
              />
            </SheetField>
            <SheetField label="Billing email">
              <Input
                type="email"
                value={recordEdit.c}
                onChange={(e) => setRecordEdit((r) => ({ ...r, c: e.target.value }))}
              />
            </SheetField>
            <SheetField
              label="Customer instruction"
            >
              <Textarea
                value={recordEdit.d}
                onChange={(e) => setRecordEdit((r) => ({ ...r, d: e.target.value }))}
              />
            </SheetField>
          </>
        ) : (
          <>
            <SheetField label="Street">
              <Input
                value={recordEdit.a}
                onChange={(e) => setRecordEdit((r) => ({ ...r, a: e.target.value }))}
              />
            </SheetField>
            <div className="grid grid-cols-3 gap-3">
              <SheetField label="City">
                <Input
                  value={recordEdit.b}
                  onChange={(e) => setRecordEdit((r) => ({ ...r, b: e.target.value }))}
                />
              </SheetField>
              <SheetField label="State">
                <Input
                  value={recordEdit.c}
                  onChange={(e) => setRecordEdit((r) => ({ ...r, c: e.target.value }))}
                />
              </SheetField>
              <SheetField label="Zip">
                <Input
                  value={recordEdit.d}
                  onChange={(e) => setRecordEdit((r) => ({ ...r, d: e.target.value }))}
                />
              </SheetField>
            </div>
            <p className="text-xs text-muted-foreground">
              This site belongs to the customer record. Changing it here changes it
              on every order that delivers to it.
            </p>
          </>
        )}
      </EditDrawer>
    </RecordSheet>
  );
}
