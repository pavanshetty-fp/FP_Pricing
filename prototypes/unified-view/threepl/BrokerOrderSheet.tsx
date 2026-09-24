import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  CircleAlert,
  Layers,
  Copy,
  Download,
  History as HistoryIcon,
  DollarSign,
  FileText,
  Mail,
  Send,
  Info,
  Users,
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
import { BannerCallout } from "@/components/ui/banner";
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
import { InvitePartnerSheet } from "./InvitePartnerSheet";
import { VendorQuoteSheet } from "./VendorQuoteSheet";
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
} from "@/components/side-sheet/parts";
import { StageBar, type Stage } from "@/components/ui/stage-bar";
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
import { BLINK_MS, PendingStrip, attend, blinkGroup } from "../PendingStrip";
import { HangingAdd } from "../HangingAdd";
import { EditDrawer } from "./DirectoryRecordSheet";
import { BROKER_CUSTOMERS } from "./directory";
import { DATE_FMT, MONEY, RATE, dateKeyOf } from "../data";
import {
  VENDORS,
  vendorById,
  vendorByName,
  vendorBlockedReason,
  type BusinessLine,
} from "./vendors";
import {
  BROKER_STATUS_TONE,
  HUBS,
  JOB_TYPES,
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
  quoteFreight,
  quoteChargeTotal,
  quoteProductTotal,
  chargeLabel,
  defaultLineCharges,
  newLineCharge,
  LINE_CHARGE_KINDS,
  type LineChargeKind,
  quoteTotal,
  quoteLineTotal,
  quoteLineChargeRate,
  billableGal,
  customerTotal,
  customerLineTotal,
  customerChargeTotal,
  totalGal,
  type BrokerOrder,
  type JobType,
  type VendorQuote,
  type QuoteLine,
  ORDER_FEE_LABELS,
  ORDER_FEE_TYPES,
  orderFeesTotal,
  type OrderFee,
  type OrderFeeType,
  type BrokerOrderType,
  type BrokerStatus,
  type OrderLine,
  isDelivered,
} from "./orders";
import { kindTone } from "../statusKind";
import { TableRowRemove } from "@/components/form-layout/table-cells";

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
 *   Quoting         -> acknowledge on the vendor's behalf           -> Assigned
 *                   -> accept a submitted quote                    -> Assigned
 *                   -> cancel the invitation                       -> Draft
 *   Assigned        -> submit delivery details on vendor's behalf   -> Completed
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


/* ---------------------------------------------------------------------------
 * The order, once it is somebody's to run
 * ------------------------------------------------------------------------ */

/**
 * ONE FACT — a label over its value, never a field pretending to be one.
 *
 * NOT A DISABLED INPUT. A greyed-out control still looks like a control: it
 * invites a press, and the answer it gives is "no". A record that cannot be
 * changed should not be drawn as a form at all — it should be drawn as what
 * it is, which is a statement.
 */
function Fact({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", wide && "col-span-2")}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

const NOT_SET = <span className="text-muted-foreground">Not set</span>;

/** Four across, because these are short answers and a column of them is a list. */
function FactGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">{children}</dl>;
}

/**
 * WHAT AN ORDER ACCRUES ON ITS WAY THROUGH — the paperwork, not the pictures.
 *
 * SEPARATE FROM "SUPPORTING IMAGE". A photo of a gauge is evidence somebody
 * took; an invoice, a BOL or a ticket is a DOCUMENT OF RECORD that accounting,
 * the customer or a dispute will ask for by name. Keeping them in one pile
 * means the one you need is found by scrolling rather than by kind.
 */
export type OrderDocumentKind = "Invoice" | "BOL" | "Ticket" | "Other";

export interface OrderDocument {
  id: string;
  kind: OrderDocumentKind;
  name: string;
  /** Formatted on arrival — these are read, never sorted on. */
  addedOn: string;
  addedBy: string;
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
   * The partners' prices. ON THE DRAFT because the pricing tables let them be
   * TYPED: a
   * partner that gave its price on the phone still has a price, and an order
   * that could only hold a quote the partner had entered itself would have
   * nowhere to put it.
   */
  quotes: VendorQuote[];
  /** Fees charged once for the run, belonging to no product — see `OrderFee`. */
  orderFees: OrderFee[];
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
  /** Never sent to the vendor or the customer. */
  internalNote: string;
  /** The whole load is a winter blend — one flag for the order, not per line. */
  winterAdditive: boolean;
  /** The accounting system's message, while the order is Partially Synced. */
  syncError?: string | null;
  /** Invoices, BOLs, tickets — see `OrderDocument`. */
  documents: OrderDocument[];
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

/**
 * THE PAPERWORK AN ORDER HAS BY THE TIME IT GETS HERE.
 *
 * SEEDED, NOT STORED. The prototype has no file store, so the documents are
 * derived from the order's own number — the same order shows the same papers
 * on every reload, which is what makes the unit readable rather than random.
 * What a real one needs is a `documents` array on the record.
 *
 * NOTHING BEFORE ASSIGNED. A ticket is written when a truck runs and an
 * invoice after it; an order still out for quotes has no paperwork, and an
 * empty unit that says so is more honest than three fabricated rows.
 */
function seedDocuments(o: BrokerOrder): OrderDocument[] {
  const n = Number(o.orderNo.replace(/\D/g, "")) || 0;
  const stage = isDelivered(o.status);
  if (o.status !== "Assigned" && !stage) return [];
  const docs: OrderDocument[] = [
    {
      id: `${o.id}-bol`,
      kind: "BOL",
      name: `BOL-${n}.pdf`,
      addedOn: o.date.title,
      addedBy: "Dana Whitfield",
    },
  ];
  if (stage) {
    docs.push({
      id: `${o.id}-ticket`,
      kind: "Ticket",
      name: `ticket-${n}.pdf`,
      addedOn: o.date.title,
      addedBy: "Driver app",
    });
    if (n % 2 === 0)
      docs.push({
        id: `${o.id}-inv`,
        kind: "Invoice",
        name: `invoice-${n}.pdf`,
        addedOn: o.date.title,
        addedBy: "Accounting",
      });
  }
  return docs;
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
    documents: seedDocuments(o),
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
    /* A STORED FIELD NOW, not derived from the status. A draft can have three
       of its five partners asked, and deriving it from "past Draft" forgot
       exactly that on close. */
    sentVendorIds: [...o.sentVendorIds],
    acceptedVendorIds: [...o.acceptedVendorIds],
    // Copied deeply — editing a quote line must not mutate the row behind it.
    quotes: o.quotes.map((q) => ({ ...q, lines: q.lines.map((l) => ({ ...l })) })),
    orderFees: o.orderFees.map((f) => ({ ...f })),
    quoteRequested: o.quoteRequested,
    /* READ OFF THE ORDER, NOT INVENTED. These five were hardcoded here and
       missing from `applyDraft`, so the sheet showed a default, took what was
       typed, and handed back the default again on the next open. */
    jobType: o.jobType,
    primaryPoc: o.primaryPoc,
    /* The sheet collects ONE second contact; the order stores a list, because
       the movement sheet collects several. The rest are kept, not shown. */
    secondaryPoc: o.secondaryPocs[0] ?? "",
    salesperson: o.salesperson,
    tags: [...o.tags],
    notifyVendor: o.notifyVendor,
    internalNote: o.internalNote,
    winterAdditive: o.winterAdditive,
    syncError: o.syncError ?? null,
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
    documents: [],
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
    lines: [
      {
        asset: "",
        product: PRODUCTS[0],
        gal: null,
        topOff: false,
        charges: defaultLineCharges(),
      },
    ],
    status: "Draft",
    vendorId: null,
    invitedVendorIds: [],
    sentVendorIds: [],
    acceptedVendorIds: [],
    quotes: [],
    orderFees: [],
    quoteRequested: false,
    jobType: "Brokerage",
    primaryPoc: "",
    secondaryPoc: "",
    salesperson: "",
    tags: [],
    /* OFF BY DEFAULT (Pavan, 2026-09-17). It was on, on the argument that
       suppressing every email should be the deliberate act. The other way
       round is the safer one: this switch mails people outside the building,
       and a draft being assembled should not be one stray click away from
       doing that. Sending is turned ON when you mean to send. */
    notifyVendor: false,
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
/** Totals use the one money helper; a per-gallon rate uses the rate one. */
const money = (n: number, dp?: number) => (dp === undefined ? MONEY(n) : RATE(n, dp));

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

/* THE SECTIONS THE PENDING STRIP AND THE CARD ACTIONS CAN SEND SOMEBODY TO.
   Named here rather than typed at each call site, so a section that is renamed
   cannot leave one of them pointing at nothing. */
const VENDOR_SECTION_ID = "broker-order-vendor-section";
const SECTION_BASICS = "broker-order-basics";
const SECTION_LINES = "broker-order-lines";
/** The Pricing section's anchor. Same job, for the stage after Quoting. */
const PRICING_SECTION_ID = "broker-order-pricing-section";
/** The vendor's own column inside Pricing — the second, narrower "this one". */
const VENDOR_COST_COLUMN_ID = "broker-order-vendor-cost-column";

/**
 * WHERE EACH STAGE'S WORK LIVES.
 *
 * The sheet is four screens long and only one part of it is live at a time:
 * in Quoting the work is the partner table, and the moment a partner is
 * awarded it is the pricing. A stage that moves and leaves the reader looking
 * at the same paragraph has told them something happened and not where.
 *
 * The stages with nothing waiting on them are absent on purpose — Draft is
 * filled from the top, and past Assigned the order is being read rather than
 * worked on.
 */
const STAGE_SECTION: Partial<Record<BrokerStatus, string>> = {
  Quoting: VENDOR_SECTION_ID,
  Assigned: PRICING_SECTION_ID,
};

/**
 * Scroll a section of the sheet into view once it exists.
 *
 * IT WAITS FOR THE SECTION TO ARRIVE. The sheet mounts into a portal and the
 * draft is built in an effect of its own, so on the commit this first runs
 * there may be nothing on screen to scroll to.
 *
 * THE TRAVEL IS THE POINT. Landing on a section with no move makes the sheet
 * look like it opens at a strange place, and the reader has to work out what
 * they are looking at and what is above it. Scrolling there says both: this is
 * an order, and the part that matters is here. The wait lets whatever the
 * sheet is doing of its own — opening, or redrawing a stage — finish first;
 * two animations at once read as one thing stuttering.
 */
function scrollToSection(id: string, settleMs: number): () => void {
  let tries = 0;
  let settle = 0;
  const timer = window.setInterval(() => {
    const el = document.getElementById(id);
    if (el) {
      window.clearInterval(timer);
      settle = window.setTimeout(() => {
        /* The SECTION, not the sheet's top, so the heading lands under the
           stage bar rather than behind it. */
        el.scrollIntoView({ block: "start", behavior: "smooth" });
      }, settleMs);
    } else if (tries++ > 40) {
      window.clearInterval(timer);
    }
  }, 25);
  return () => {
    window.clearInterval(timer);
    window.clearTimeout(settle);
  };
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
  /**
   * OPEN IT AT THE PART THE READER PRESSED. A card's "review pricing" names the
   * vendor table; landing at the top of a sheet that is four screens long and
   * leaving them to find it is answering a different request.
   */
  focus?: "vendor" | null;
}

/**
 * The three charges that ride on the order rather than on a gallon.
 *
 * A LIST, NOT THREE COPIES OF A ROW. They are typed the same way, totalled the
 * same way and explained by the same sentence — written out three times, the
 * next one added would have been three edits and the one after that four.
 */

/**
 * THE SAME BOX, FOR GALLONS.
 *
 * WHY IT EXISTS AT ALL. Up to Completed the quantity is what was ORDERED and
 * is settled in the Delivery Order table; at Completed it becomes what was
 * DELIVERED, which is a different number and arrives on the partner's ticket.
 * Everything downstream — the vendor's cost, the customer's bill, the margin —
 * is that number times a rate, so it is typed here, beside the rates it
 * multiplies, rather than sending the reader back up the sheet.
 */
function BoxGallons({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  "aria-label": string;
}) {
  const [typed, setTyped] = React.useState<string | null>(null);
  return (
    <label className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-input bg-transparent px-2 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={typed ?? String(value)}
        onChange={(e) => {
          setTyped(e.target.value);
          onChange(num(e.target.value));
        }}
        onBlur={() => setTyped(null)}
        className="w-auto min-w-8 bg-transparent text-right text-sm tabular-nums text-foreground outline-none field-sizing-content"
      />
      <span className="text-xs text-muted-foreground">gal</span>
    </label>
  );
}

/**
 * ONE ROW OF A PRICING COLUMN: what it is, how it was worked out, what it comes
 * to. The middle is either a typed field or the sum stated in words, and the
 * amount is always last — so the two columns' amounts line up down one edge
 * whether the row is editable or not.
 */
function ChargeRow({
  label,
  hint,
  qty,
  qtyNode,
  per,
  total,
  children,
}: {
  label: string;
  /** The working, when the row is read-only — "1,050 gal × $3.205 /gal". */
  hint?: string;
  /**
   * THE QUANTITY, AS A COLUMN OF ITS OWN. (Pavan, 2026-09-22.) It was a small
   * grey suffix crowded against the product name inside one fixed box, which
   * squeezed the name to "Unleaded 8…" and made the gallons look like a
   * footnote. It is not a footnote: the rate being typed beside it is a rate
   * PER one of these, so the two are read together and carry the same weight.
   */
  qty?: string;
  /** The same column, typed — what was actually delivered, at Completed. */
  qtyNode?: React.ReactNode;
  /**
   * WHAT THE TYPED RATE IS MULTIPLIED BY — "× 1,550 gal", set after the box
   * and before the amount (Pavan, 2026-09-22).
   *
   * A rate in a box with an amount at the other end of the row is two numbers
   * and no arithmetic: the reader has to remember how many gallons this
   * product is, from a cell in another column, on every row. Spelled out, the
   * row reads left to right as the sum it is.
   *
   * IT IS NOT `qty`. That column sits BEFORE the field, for a row whose
   * quantity is the thing being read; this sits after it, because here the
   * rate is what is being read and the gallons are the working.
   */
  per?: string;
  total: string;
  children?: React.ReactNode;
}) {
  return (
    /* A FIXED LABEL COLUMN, so every field in the column starts on one edge.
       Label and hint are different lengths on every row — "Margin · 1,050 gal ×"
       against "Delivery fee" — and left to themselves the boxes stepped in and
       out down the column, which is the one thing a column of fields must not
       do. The pair is boxed at a fixed width and the field begins after it.

       NO RULE UNDER THE LAST ROW. The column's total draws its own `border-t`
       directly beneath, so the two stacked into a double line at the foot of
       both columns — the one thing on this unit that was drawn twice. */
    <div className="flex items-center gap-2 border-b border-border py-2.5 last:border-b-0">
      {/* THE FIXED BOX IS ONLY FOR ROWS THAT HAVE A FIELD. Its whole job is to
          start every input on one edge, and a read-only row has no input to
          line up — boxed anyway, a long working ("1,050 gal × $3.205 /gal")
          squeezed the label next to it down to "P…". */}
      <span
        className={cn(
          "flex items-baseline gap-1.5",
          children
            ? qty || qtyNode
              ? "w-[124px] shrink-0"
              : "w-[148px] shrink-0"
            : "min-w-0"
        )}
      >
        <dt className="min-w-0 truncate text-sm text-foreground">{label}</dt>
        {hint && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {/* ITS OWN COLUMN, RIGHT-ALIGNED, so the gallons stack down one edge
          however long the names are — and the `×` stays muted beside it,
          because the sign is punctuation and the number is the fact. */}
      {(qty || qtyNode) && (
        <span className="flex shrink-0 items-center justify-end gap-1">
          {qtyNode ?? (
            <span className="w-[68px] text-right text-sm tabular-nums text-foreground">
              {qty}
            </span>
          )}
          <span className="text-xs text-muted-foreground">×</span>
        </span>
      )}
      {children}
      {per && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {per}
        </span>
      )}
      <dd className="ml-auto pl-2 text-sm tabular-nums text-foreground">
        {total}
      </dd>
    </div>
  );
}

/**
 * WHAT THE PARTNER CHARGES FOR THE RUN AND NOT FOR THE PRODUCT — freight, and
 * only freight. Its fees and taxes are charged on what is in the tank, so they
 * are per gallon and per product like everything else on this unit.
 */
/**
 * THE TYPE COLUMN'S CELL — the name of the charge this row is about.
 *
 * SAID ONCE, NOT ONCE PER SIDE (Pavan, 2026-09-22). Price, Margin, Tax and
 * Fees were printed down the partner's column and again down the customer's:
 * the same four words twice, answering a question neither column is. In a
 * column of their own the two money columns hold nothing but money, and a row
 * reads across as ONE charge with two figures against it — which is the
 * comparison the unit exists for.
 */
function PricingTypeCell({
  label,
  onRemove,
}: {
  label: string;
  /** Present on a charge the reader added or can take away. */
  onRemove?: () => void;
}) {
  return (
    <div className="group/row flex min-w-0 items-center gap-1 border-t border-border px-4 py-2.5 lg:border-l lg:px-4">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {label}
      </span>
      {/* QUIET UNTIL REACHED FOR. A bin on every charge row would be the first
          thing read down a column whose job is to name them. */}
      {onRemove && (
        <TableRowRemove layout="inline" aria-label={`Remove ${label}`} onRemove={onRemove} />
      )}
    </div>
  );
}

/**
 * THE RATE, TYPED AT CELL LEVEL — no box drawn round it (Pavan, 2026-09-22).
 *
 * WHY NOT `BoxMoney`. A bordered box inside a table cell is a box in a box:
 * the cell already has edges, and eight of them down a column drew a second
 * grid over the first. The Additional fees table types its amounts straight
 * into the cell — nothing drawn until you reach for it, a fill on hover and
 * the focus ring on the cell itself — and a reader who has learnt that
 * interaction once should not meet a different one two sections up.
 *
 * IT FILLS ITS SLOT TOP TO BOTTOM. `self-stretch` plus the cell's own left
 * inset means the hit area runs to the cell's edge, the way a table cell's
 * does, rather than being a small target floating inside it.
 *
 * WHAT WAS TYPED, UNTIL IT IS FINISHED BEING TYPED — the same buffer
 * `TableCellInput` keeps, and for the same reason: the value upstream is a
 * NUMBER, and a number cannot hold a half-written one. Typing "0.0" would come
 * back as "0" and no fractional rate could be entered at all.
 */
function PricingRateInput({
  value,
  onChange,
  dp = 3,
  padClass,
  autoFocus,
  "aria-label": ariaLabel,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  /** Decimal places the placeholder suggests — 3 for a per-gallon rate. */
  dp?: number;
  /** The cell's own left inset, so the hit area starts at the cell edge. */
  padClass?: string;
  /** Take focus on mount — the first rate of a charge row just added. */
  autoFocus?: boolean;
  "aria-label": string;
}) {
  const [typed, setTyped] = React.useState<string | null>(null);
  return (
    <label
      className={cn(
        /* `pr-2` SO THE FILL DOES NOT TOUCH THE FIGURE (Pavan, 2026-09-22).
           The hover fill ended flush against the last digit and ran straight
           into the "× 1,550 gal" beside it — a highlight with no air inside it
           reads as a box that has been cut off rather than as a field. */
        "flex w-[140px] shrink-0 cursor-text items-center justify-end gap-1 self-stretch py-2.5 pr-2 transition-colors",
        "hover:bg-accent focus-within:bg-fp-surface-1a focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring/50",
        padClass
      )}
    >
      <span className="shrink-0 text-sm text-muted-foreground">$</span>
      <input
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        value={typed ?? (value == null ? "" : String(value))}
        placeholder={(0).toFixed(dp)}
        onChange={(e) => {
          setTyped(e.target.value);
          onChange(num(e.target.value));
        }}
        onBlur={() => setTyped(null)}
        className="w-auto min-w-10 bg-transparent text-right text-sm tabular-nums text-foreground outline-none field-sizing-content placeholder:text-muted-foreground"
      />
    </label>
  );
}

/**
 * ONE SIDE'S FIGURE FOR ONE CHARGE: what is typed, what it is multiplied by,
 * and what it comes to — left to right, so the row reads as the sum it is.
 *
 * `note` REPLACES THE FIELD when the charge cannot exist on this side: with a
 * load order the partner has no price to charge and its tax and fee are billed
 * through, and a disabled box there would be a box for a number nobody can
 * enter. **NA** is the note for a charge the other side owns outright — the
 * run's own fees are the customer's, and an empty cell opposite them reads as
 * a figure that has not been filled in rather than one that cannot exist
 * (Pavan, 2026-09-22).
 *
 * THE CELL CARRIES NO HORIZONTAL PADDING of its own: the first child takes the
 * left inset so the input's hit area reaches the cell's edge, and the amount
 * takes the right one.
 */
function PricingCell({
  input,
  per,
  note,
  total,
  className,
  padL,
  padR,
  blinkGroupName,
}: {
  /** The typed rate, when this side has one to type. */
  input?: React.ReactNode;
  /** "× 1,550 gal" — the working between the rate and the amount. */
  per?: string;
  /** Said instead of a field, when there is nothing to type here. */
  note?: string;
  total: string;
  className?: string;
  padL: string;
  padR: string;
  /** Joins this cell to a column-wide flash — see `blinkGroup`. */
  blinkGroupName?: string;
}) {
  return (
    <div
      data-blink={blinkGroupName}
      className={cn(
        "flex min-w-0 items-stretch border-t border-border lg:border-l",
        className
      )}
    >
      {input}
      {!input && note && (
        <span
          className={cn(
            "flex items-center py-2.5 text-xs text-muted-foreground",
            padL
          )}
        >
          {note}
        </span>
      )}
      {input && note && (
        <span className="flex items-center pl-2 text-xs text-muted-foreground">
          {note}
        </span>
      )}
      {per && (
        <span className="flex shrink-0 items-center pl-2 text-xs tabular-nums text-muted-foreground">
          {per}
        </span>
      )}
      <span
        className={cn(
          "ml-auto flex items-center py-2.5 pl-2 text-sm tabular-nums text-foreground",
          padR
        )}
      >
        {total}
      </span>
    </div>
  );
}

/**
 * THE ORDER'S LIFECYCLE, WHICH IS NOW ALSO THE STATUS LIST.
 *
 * These were two vocabularies for one thing. The bar said Quoting where the
 * status field said Assigned, and Assigned where the field said Accepted — so
 * a row could read "Accepted" in the Status column under a bar that said
 * "Assigned", and both were right. The statuses have been renamed to what the
 * business calls the stages, and what is left of the difference is this list:
 * the order they happen in, and the two exits that are not stages at all.
 *
 * PARTIALLY SYNCED IS STILL NOT A STAGE. It is a status — the sync was tried
 * and failed — and it stands at the same place on the
 * bar as Synced, because a bar is about position and there is one position to
 * be in. `stageOf` is the whole of what is left between the two lists.
 *
 * CANCELLED AND BLOCKED ARE NOT HERE. Neither is a place the order passes
 * through — one is a way out of the lifecycle and the other a condition that
 * holds it wherever it already stands. The board's lanes are where those
 * belong; the chip beside the title says which, and the banner says why.
 */
const ORDER_STAGES: Stage[] = [
  { key: "Draft", label: "Draft" },
  { key: "Quoting", label: "Quoting" },
  { key: "Assigned", label: "Assigned" },
  { key: "Completed", label: "Completed" },
  { key: "Review", label: "Review" },
  { key: "Verified", label: "Verified" },
  { key: "Synced", label: "Synced" },
];

/** Which stage an order is standing at. One status is not one — see above. */
function stageOf(status: BrokerStatus): string {
  return status === "Partially Synced" ? "Synced" : status;
}

/* ══════════════════════════════════════════════════════════════════════════
   The rail, and the pending-steps FAB

   ONE RULE DECIDES WHICH SIDE A CARD IS ON: can you type into it? Everything
   the order is MADE of goes left, in the order you fill it in. Everything the
   order HAS BECOME goes right — derived, read-only, and true whether or not
   anyone is looking. That is why the rail cannot be edited and the left column
   has no summaries: a number you can change and a number that changes itself
   look identical once they are in the same column, and the reader stops
   knowing which is which.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * WHAT AN ACTIVITY ENTRY IS ABOUT, from what it says.
 *
 * The audit trail is one line of prose per change, which is the right thing to
 * store and the wrong thing to scan: six lines of identical grey text hide the
 * one that matters. A mark gives each entry a kind at a glance — money, a
 * message that left the building, something added, something that moved
 * backwards — and money and creation get a tint, because those are the two the
 * eye should catch on the way past.
 */
function auditMark(text: string): { icon: React.ReactNode; tone: string } {
  const t = text.toLowerCase();
  if (/\bquote|price|\$|margin|rate/.test(t))
    return {
      icon: <DollarSign />,
      tone: "border-status-success/30 bg-status-success/10 text-status-success",
    };
  if (/invit|sent|notif|email|acknowled/.test(t))
    return {
      icon: <Mail />,
      tone: "border-fp-banner-accent-info/30 bg-fp-banner-accent-info/10 text-fp-banner-accent-info",
    };
  if (/created/.test(t))
    return {
      icon: <Plus />,
      tone: "border-status-success/30 bg-status-success/10 text-status-success",
    };
  if (/cancel|remov|delet|block/.test(t))
    return {
      icon: <Ban />,
      tone: "border-status-failed/30 bg-status-failed/10 text-status-failed",
    };
  if (/load order|terminal|supplier/.test(t))
    return { icon: <Layers />, tone: "border-border bg-card text-muted-foreground" };
  if (/asset|product|gal/.test(t))
    return { icon: <Truck />, tone: "border-border bg-card text-muted-foreground" };
  return { icon: <Pencil />, tone: "border-border bg-card text-muted-foreground" };
}

/**
 * A label/value row in a rail card, and — where there is one — the ARITHMETIC
 * BEHIND THE FIGURE, on hover.
 *
 * A total in a summary is a claim, and the reader's next question is always
 * the same: made of what? Without it the answer is a table two sections away,
 * and comparing the two means holding one number in your head while you scroll
 * to the other. A tooltip puts the working where the claim is. It is NOT a
 * substitute for the tables — those are where the figures are TYPED — it is
 * the read-only account of how they add up.
 */
function RailRow({
  label,
  value,
  breakdown,
}: {
  label: string;
  value: React.ReactNode;
  /** One line per contribution. Rendered only when there is something to show. */
  breakdown?: { label: string; value: string }[];
}) {
  const row = (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 px-4 py-2.5",
        breakdown?.length && "cursor-help"
      )}
    >
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-sm tabular-nums text-foreground",
          /* THE DOTTED RULE IS THE WHOLE AFFORDANCE. A figure that explains
             itself has to say so without a second control beside it. */
          breakdown?.length &&
            "underline decoration-dotted decoration-muted-foreground underline-offset-4"
        )}
      >
        {value}
      </dd>
    </div>
  );
  if (!breakdown?.length) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <span className="flex flex-col gap-1">
          {breakdown.map((b) => (
            <span key={b.label} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate">{b.label}</span>
              <span className="shrink-0 tabular-nums">{b.value}</span>
            </span>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A rail card: the same bordered block `SheetSection` draws, with its own
 * header band and a flush body — the rail is nothing but read-outs, so every
 * card in it is a list running edge to edge.
 */
function RailCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-fp-surface-1a px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          {icon && <span className="[&_svg]:size-3.5">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * WHAT AN EMPTY SUMMARY SAYS DEPENDS ON THE STAGE, because "nothing here yet"
 * and "nothing here, and that is a problem" are different messages and the
 * order knows which one it is. A card that said "No data" at every stage would
 * be telling the reader to work out the stage themselves — which is the one
 * thing the sheet already knows.
 */
function summaryEmptyLine(status: BrokerStatus, invited: number): string {
  if (status === "Cancelled") return "Cancelled — nothing to price.";
  if (status === "Draft")
    return invited > 0
      ? "Invitations are out. Quotes appear here as partners respond."
      : "Invite a delivery partner to start collecting quotes.";
  if (status === "Blocked") return "Blocked on credit — no quotes can be collected.";
  if (status === "Quoting") return "Yet to receive a quote.";
  return "Yet to review a quote.";
}

/**
 * A PRICING COLUMN'S NAME, with a tick once the column has a figure in it.
 *
 * Three columns of rows that look alike, and the question the reader is
 * actually carrying down the unit is "which of these have I done". The totals
 * answer it, but only by being read and compared — $0.00 is both "nothing yet"
 * and "nothing, deliberately". A tick beside the name answers it at the top of
 * the column instead of the bottom.
 *
 * FILLED MEANS EVERY FIELD IN THE COLUMN IS. Not that it totals something: a
 * delivery fee typed and a margin left at zero add up to a number, and a tick
 * on that says the column has been dealt with when half of it has not been
 * touched.
 */
function PricingColumnHead({
  label,
  done,
}: {
  label: string;
  /** Omitted on a column that has nothing to fill in — Type names rows. */
  done?: boolean;
}) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {label}
      {done && (
        <Check
          className="size-3.5 shrink-0 text-status-success"
          aria-label="Filled in"
        />
      )}
    </p>
  );
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
  focus,
}: BrokerOrderSheetProps) {
  const [draft, setDraft] = React.useState<BrokerOrderDraft | null>(null);
  /** Ticked partner rows. UI state, not the order's — see `selectedRows`. */
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [customOpen, setCustomOpen] = React.useState(false);


  /** Declared above the early return, because a hook cannot be conditional. */
  const [shownQuoteId, setShownQuote] = React.useState<string | null>(null);
  /* THE QUOTE SHEET'S SUBJECT, and whether the reader is reading one or
     writing one. `review` is the partner's own quote; `draft` is the broker
     writing it down after a call, which is the only way a price gets in here
     without the partner's app. Up here with the other sheet state, because the
     component returns early below and a hook cannot sit past that. */
  /** The invite composer: whose, and whether it is a second attempt. */
  const [inviting, setInviting] = React.useState<{
    ids: string[];
    resend: boolean;
  } | null>(null);
  /** The partner a Finalize press is asking about, until it is confirmed. */
  const [finalizing, setFinalizing] = React.useState<string | null>(null);
  const [confirmChangeVendor, setConfirmChangeVendor] = React.useState(false);
  /** The fold over the partners not yet in the round. Shut until asked for. */
  const [showMorePartners, setShowMorePartners] = React.useState(false);
  /**
   * PRODUCTS SHUT IN THE PRICING UNIT, by asset (Pavan, 2026-09-22).
   *
   * An order with four products is four screens of figures, and the broker
   * pricing the fourth has finished with the first three. Keyed by ASSET and
   * not by index, because a line removed above would otherwise shut whichever
   * product moved up into its place.
   *
   * OPEN IS THE DEFAULT AND IT IS NOT REMEMBERED. Which products someone shut
   * while pricing one order says nothing about the next one, and an order that
   * opened with its figures hidden would be an order that looks unpriced.
   */
  const [collapsedProducts, setCollapsedProducts] = React.useState<Set<string>>(
    () => new Set()
  );
  const [quoteSheet, setQuoteSheet] = React.useState<{
    vendorId: string;
    mode: "review" | "draft";
  } | null>(null);
  const creating = mode === "create";

  /* OPEN AT THE VENDOR TABLE when that is what the reader pressed. A card's
     "review pricing" names the vendor table; landing at the top of a sheet
     four screens long and leaving them to find it answers a different
     request. 260ms lets the sheet's own opening finish first. */
  React.useEffect(() => {
    if (!open || focus !== "vendor") return;
    return scrollToSection(VENDOR_SECTION_ID, 260);
  }, [open, focus, order?.id]);

  /**
   * THE STAGE MOVES, AND THE SHEET FOLLOWS IT.
   *
   * Advancing a stage changes where the work is, and the reader is left
   * looking at whatever they were reading when they pressed. Sending the round
   * out puts the partner table in front of them; awarding one puts the pricing
   * there. The sheet says what happened AND where, in one move.
   *
   * ONLY ON A CHANGE, never on open. Opening an order is not a claim that
   * anything just happened, and a sheet that jumps every time it is opened
   * takes away the reader's own place in it. The first render records the
   * stage and scrolls nowhere.
   */
  const lastStage = React.useRef<BrokerStatus | null>(null);
  React.useEffect(() => {
    if (!open) {
      lastStage.current = null;
      return;
    }
    const stage = draft?.status;
    if (!stage) return;
    const before = lastStage.current;
    lastStage.current = stage;
    if (before === null || before === stage) return;
    const section = STAGE_SECTION[stage];
    if (!section) return;
    /* Longer than the sheet's own opening: the stage bar redraws and the
       footer's act swaps under the reader's cursor, and moving the page out
       from under both reads as a glitch. */
    return scrollToSection(section, 360);
  }, [open, draft?.status]);

  /**
   * BUILD THE DRAFT ONCE PER RECORD, NOT ONCE PER SAVE.
   *
   * It used to depend on the `order` OBJECT, so every autosave handed back a
   * new row, rebuilt the draft from it and cleared the ticked rows and the
   * open quote with it — the sheet resetting itself under the person typing.
   * Keyed on the id, it rebuilds when the sheet is pointed at a different
   * record and not otherwise.
   *
   * THE CREATE HANDOVER IS NOT A NEW RECORD. When the first keystroke commits
   * a draft, this effect sees the key change from "create" to the new id; the
   * draft in hand IS that order, so it is kept rather than reloaded.
   */
  const builtFor = React.useRef<string | null>(null);
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
    setSelected(new Set());
    setShownQuote(null);
  }, [open, creating, order?.id, order]);

  /**
   * THE DRAFT IS KEPT, NOT JUST ANNOUNCED.
   *
   * The header has said "Draft saving… / Draft saved" since the sheet was
   * built, and it was describing a hook that only WATCHES the draft — nothing
   * wrote it anywhere. Ticking Urgent, adding an asset, inviting a partner:
   * all of it was gone on close. This is the write that line was always
   * claiming.
   *
   * CREATING IS THE SAME LOOP, one step earlier. A new order has nothing to
   * save into, so the first change that makes the draft anything other than
   * the blank one creates the record — in Draft, on the board, where it can be
   * left and come back to. Everything after that is an ordinary save.
   *
   * It debounces, because the unit of a save is a pause in the work and not a
   * keystroke.
   */
  /* WHAT WAS LAST HANDED OVER. The save returns a rebuilt row, which arrives
     as a new `order` object and would start the next save — a write every
     600ms for as long as the sheet is open. Remembering the draft that went
     out is what stops the loop: nothing goes out twice. */
  const lastSaved = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open || !draft) return;
    const shape = JSON.stringify(draft);
    if (lastSaved.current === shape) return;
    const t = window.setTimeout(() => {
      lastSaved.current = shape;
      if (creating) {
        /* A SHEET OPENED AND CLOSED AGAIN IS NOT AN ORDER. The blank draft is
           deterministic, so anything that differs from it is something a
           person did. */
        if (JSON.stringify(draft) === JSON.stringify(emptyDraft())) return;
        onCreate?.(draft);
      } else if (order) {
        onSave(order, draft);
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, open, creating, order, onCreate, onSave]);

  /*
    ALL OF THE BELOW SIT ABOVE THE EARLY RETURN, because a hook cannot be
    conditional — the same reason `shownQuoteId` is already here.
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
  /** The salesperson's contact, open for editing. */
  const [editingSales, setEditingSales] = React.useState(false);
  const [salesEdit, setSalesEdit] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  /* THE ROW JUST ADDED, per table. Its first cell takes focus when it mounts —
     DS ui §10f — so the add is followed by the answer, not a hunt for the row.
     A charge is named by line and id, since the matrix holds every line's. */
  const [focusLine, setFocusLine] = React.useState<number | null>(null);
  const [focusFee, setFocusFee] = React.useState<number | null>(null);
  const [focusCharge, setFocusCharge] = React.useState<string | null>(null);
  /* THE VENDOR ROW CARRIES A COUNT, because its add may land on a blank row
     that is already mounted; the count goes in the key, which remounts it. */
  const [focusPartner, setFocusPartner] = React.useState<{
    row: number;
    n: number;
  } | null>(null);
  /** Set by an add from the charge menu, so the menu's close does not take focus back. */
  const chargeJustAdded = React.useRef(false);
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

  const addBlankLine = () => {
    setFocusLine(draft.lines.length);
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: [
              ...d.lines,
              {
                asset: "",
                product: PRODUCTS[0],
                gal: null,
                topOff: false,
                charges: defaultLineCharges(),
              },
            ],
          }
        : d
    );
  };

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
  /* AN EMPTY ROW IS THE UNIT'S RESTING STATE (Pavan, 2026-09-17). A table
     whose body says "No vendor yet" and a separate Add vendor button underneath
     are two ways of saying the same nothing, and the reader has to press one of
     them before the table will let them do the only thing it is for. The blank
     row IS the invitation to fill it in. */
  const partnerRows =
    draft.invitedVendorIds.length > 0 ? draft.invitedVendorIds : [""];
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
  /* ONE BLANK ROW AT A TIME. A second empty row asks the same question twice;
     if one is already waiting, the add goes to it instead. */
  const addPartnerRow = () => {
    const blank = partnerRows.indexOf("");
    setFocusPartner((f) => ({
      row: blank >= 0 ? blank : partnerRows.length,
      n: (f?.n ?? 0) + 1,
    }));
    if (blank >= 0) return;
    setDraft((d) =>
      d ? { ...d, invitedVendorIds: [...d.invitedVendorIds, ""] } : d
    );
  };

  /* SEVERAL AT ONCE, from one open of the list. Picking five partners was five
     rounds of "add a row, open it, choose, close"; the row's picker takes ticks
     and an Apply now, and the first choice lands in the row that was opened
     while the rest arrive as rows after it — so the order of the list is the
     order they were ticked in. */
  const applyPartnersAt = (i: number, ids: string[]) =>
    setDraft((d) => {
      if (!d || ids.length === 0) return d;
      const rows = d.invitedVendorIds.length > 0 ? [...d.invitedVendorIds] : [""];
      rows.splice(i, 1, ...ids);
      return { ...d, invitedVendorIds: rows, vendorId: null };
    });

  /** Every row's partner off the order, back to the one blank row. */
  const removeAllPartners = () =>
    setDraft((d) => {
      if (!d) return d;
      const gone = d.invitedVendorIds.filter(Boolean).length;
      if (gone === 0) return d;
      toast.success(
        gone === 1 ? "Vendor removed" : `${gone} vendors removed`,
        { description: "Nobody is invited to this order." }
      );
      return {
        ...d,
        invitedVendorIds: [],
        sentVendorIds: [],
        acceptedVendorIds: [],
        quotes: [],
        vendorId: null,
      };
    });

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
     — and it is what moves the order into the Assigned lane. The broker can do
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
        { description: "Moved to Assigned." }
      );
      return { ...d, acceptedVendorIds: next, status: "Assigned" };
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
      toast.success(`Order confirmed — ${vendorById(vendorId)?.name}`, {
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

  /* AWARDING THE ORDER TO ONE PARTNER, from that partner's own row.
     It sets who holds the order AND NOTHING ELSE. (Pavan, 2026-09-22 — it
     used to move the order to Assigned in the same press.) Awarding and
     moving the order on are two decisions: the first says whose price we are
     taking, the second says the job is theirs to run. Keeping them apart is
     what lets a broker award, look again, and award someone else — and it is
     why the footer's next act after an award is "Move to Assigned". */
  const awardFor = (vendorId: string) =>
    setDraft((d) => {
      if (!d) return d;
      if (d.vendorId === vendorId) return d;
      toast.success(`${vendorById(vendorId)?.name ?? "Vendor"} finalized as vendor`, {
        description: "Move the order to Assigned when you are ready.",
      });
      return {
        ...d,
        vendorId,
        acceptedVendorIds: d.acceptedVendorIds.includes(vendorId)
          ? d.acceptedVendorIds
          : [...d.acceptedVendorIds, vendorId],
      };
    });

  /* A QUOTE PRICES THE ORDER IT WAS SENT. Add an asset after the partners have
     replied and their figures are answers to a different question — the lines
     they priced are not the lines that will be delivered. The comparison is by
     asset, because that is what a quote line is keyed on: an order line with no
     line in the quote is a line nobody has been asked about.

     IT IS NOT AN ERROR STATE. Nothing is wrong with the quote; it is simply out
     of date, and the only thing that fixes it is the partner being told. */
  const quoteCoversOrder = (q: VendorQuote) =>
    !draft.lines.some(
      (l) => l.asset && !q.lines.some((ql) => ql.asset === l.asset)
    );
  const staleQuoteIds = quotes
    .filter((q) => !quoteCoversOrder(q))
    .map((q) => q.vendorId);
  const hasStaleQuotes = staleQuoteIds.length > 0;

  /* RESENDING IS A NOTIFICATION, NOT A STATE CHANGE. The invitation already
     went and was already accepted; what has changed is the order, so what goes
     out is the order again. The quote stays on the row until a new one
     replaces it — taking it away would leave the reader with no idea what the
     partner had said before the change. */
  /* RESEND OPENS THE EMAIL (Pavan, 2026-09-24) — the broker may change the
     wording or not, and sends from the sheet. It used to toast and send
     nothing. */
  const resendInvitation = (vendorId: string) => openInvite([vendorId], true);

  /* THE TERMINAL EXIT. Available from any live stage and from none of the dead
     ones — an order already cancelled or already through accounting has nothing
     left to cancel. It is confirmed because it cannot be walked back here. */
  const cancellable =
    draft.status !== "Cancelled" &&
    draft.status !== "Synced" &&
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
      /* SENDING NO LONGER MOVES THE ORDER (Pavan, 2026-09-17). It did, which
         made the first invitation both an act and a stage change — so a broker
         who sent to one carrier while still deciding on the rest had the order
         leave Draft underneath them. Sending is now the PRECONDITION and
         Proceed is the transition: one invitation out is what unlocks it. */
      toast.success(
        fresh.length === 1
          ? `${names[0]} invited`
          : `${fresh.length} partners invited`,
        /* THE SAME WORD THE FOOTER AND THE CARD USE. Acknowledgement is
           not a separate step any more — what is outstanding is the price. */
        { description: "Awaiting quotation." }
      );
      return { ...d, sentVendorIds: [...d.sentVendorIds, ...fresh] };
    });

  /* ACKNOWLEDGE AND ACCEPT IN ONE, for the partner whose price came off a call.
     It shows that partner's quote, because the numbers are the reason anyone
     does this. */
  /** Opens the sheet in draft, seeding an empty quote if there is none yet. */
  const openQuoteDraft = (vendorId: string) => {
    setDraft((d) => {
      if (!d || d.quotes.some((q) => q.vendorId === vendorId)) return d;
      return {
        ...d,
        /* A PARTNER HAS TO HAVE TAKEN THE ORDER TO PRICE IT, and writing the
           price down on its behalf is the broker saying it did. */
        acceptedVendorIds: d.acceptedVendorIds.includes(vendorId)
          ? d.acceptedVendorIds
          : [...d.acceptedVendorIds, vendorId],
        quotes: [
          ...d.quotes,
          {
            vendorId,
            lines: d.lines
              .filter((l) => l.asset)
              .map((l) => ({
                asset: l.asset,
                ratePerGal: 0,
                rates: {},
              })),
            freight: 0,
          },
        ],
      };
    });
    setQuoteSheet({ vendorId, mode: "draft" });
  };

  /**
   * A QUOTE ARRIVING IS WHAT MAKES IT QUOTING. (Pavan, 2026-09-22.) An order
   * with invitations out and no prices back is not in a quoting round yet —
   * it is awaiting one, which is what the footer says. The first price moves
   * the card on its own; nobody presses anything, because nobody did
   * anything. A later price into an already-quoting order changes nothing.
   */
  const putQuote = (next: VendorQuote) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            status: d.status === "Draft" ? "Quoting" : d.status,
            quotes: d.quotes.map((q) =>
              q.vendorId === next.vendorId ? next : q
            ),
          }
        : d
    );

  /** Accepting from the quote sheet is accepting the order — same act. */
  const acceptFromQuoteSheet = (vendorId: string) => {
    acceptFor(vendorId);
    setShownQuote(vendorId);
    setQuoteSheet(null);
  };

  /** Rejecting drops the partner's price and leaves them on the order. */
  const rejectQuote = (vendorId: string) => {
    setDraft((d) =>
      d ? { ...d, quotes: d.quotes.filter((q) => q.vendorId !== vendorId) } : d
    );
    setQuoteSheet(null);
    toast.success(`Quote rejected — ${vendorById(vendorId)?.name}`, {
      description: "They stay on the order and can send another.",
    });
  };
  /**
   * WHAT AN ORDER MUST HAVE BEFORE IT IS AN ORDER (Pavan, 2026-09-17).
   *
   * Three things, and they are the same three whether you read them as "what
   * Create Order is waiting on" or as "what moving to Quoting means": who it
   * is for and where it goes, what is being delivered, and a partner who has
   * been asked for a price. Anything else on this sheet can be filled in
   * afterwards.
   *
   * EACH ONE NAMES WHAT IS MISSING, not what it is about. "Vendors" tells a
   * reader the area; "send an invitation" tells them the act — and the third
   * step covers three of those, so it says whichever is outstanding.
   */
  const mandatorySteps: {
    key: string;
    label: string;
    done: boolean;
    /* WHERE THE STEP LIVES, so the strip can take the reader to it rather than
       naming a field and leaving them to find it. */
    target: string;
  }[] = [
    {
      key: "customer",
      label: !draft.customer
        ? "Choose a customer"
        : "Choose a ship-to site",
      done: Boolean(draft.customer.trim() && draft.shipTo.trim()),
      target: SECTION_BASICS,
    },
    {
      key: "lines",
      label:
        draft.lines.length === 0
          ? isMovement
            ? "Add the asset"
            : "Add a product line"
          : draft.lines.some((l) => !l.asset.trim())
            ? "Name the asset on every line"
            : "State a quantity, or mark the line a top-off",
      done:
        draft.lines.length > 0 &&
        draft.lines.every(
          (l) => l.asset.trim() !== "" && (l.topOff || (l.gal ?? 0) > 0)
        ),
      target: SECTION_LINES,
    },
    {
      key: "partners",
      label:
        invitedIds.length === 0
          ? "Add a delivery partner"
          : sentIds.length === 0
            ? "Send an invitation"
            : "Turn on Request a quote",
      done:
        invitedIds.length > 0 && sentIds.length > 0 && draft.quoteRequested,
      target: VENDOR_SECTION_ID,
    },
  ];
  const pendingSteps = mandatorySteps.filter((x) => !x.done);

  /**
   * DRAFT → QUOTING, AND IT IS A DECISION.
   *
   * Sending an invitation used to move the order on its own, which made one
   * act do two things: a broker who asked one carrier while still weighing the
   * rest found the order had left Draft. Proceed is the moment they say the
   * round is out — and it needs one invitation actually sent, because an order
   * in Quoting that nobody has been asked for is a lane telling a lie.
   */
  /**
   * CREATING IS NOT QUOTING. (Pavan, 2026-09-22.) An order with invitations
   * out and no prices back is not in a quoting round — it is awaiting one.
   * The card stays in Draft, saying "Awaiting quotation", and the FIRST PRICE
   * moves it (see `putQuote`). Nobody presses anything to make that happen,
   * because nobody here did anything: the partner did.
   *
   * WHAT THE PRESS DOES DO is commit the order and let it go out. It stays
   * an act — the invitations are already sent by the time it is pressed, and
   * a created order is the thing the rest of the flow hangs off.
   */
  const createOrder = () =>
    setDraft((d) => {
      if (!d || d.status !== "Draft") return d;
      toast.success(`${order?.orderNo ?? "Order"} created`, {
        description: "Awaiting quotation.",
      });
      return d;
    });

  const advance = (status: BrokerStatus) =>
    setDraft((d) => {
      if (!d) return d;
      toast.success(`${order?.orderNo ?? "Order"} → ${status}`);
      /* The accounting error belongs to the failed attempt; leaving the
         status clears it. */
      return { ...d, status, syncError: status === "Partially Synced" ? d.syncError : null };
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
  /**
   * WHAT AN INVITED PARTNER IS DOING, IN ONE WORD.
   *
   * "Invited" is what you have done to them; once the order is out for quotes
   * it is the wrong half of the story — the reader is not checking whether the
   * invitation was sent, they are waiting for a price. Past Draft, a row that
   * has been asked and has not answered says **Awaiting quote** (Pavan,
   * 2026-09-17).
   *
   * In DRAFT it stays "Invited": the round has not gone out, so nothing is
   * late and nothing is being waited on yet.
   */
  const invitedWord = draft.status === "Draft" ? "Invited" : "Awaiting quote";
  /* Invited = waiting on the partner. On a draft nothing has been sent, so
     it is not yet a state. */
  const invitedTone = kindTone(draft.status === "Draft" ? "neutral" : "caution");

  /* WHAT A SEND WOULD ACTUALLY DO. Ticked rows that have not been asked, or —
     with nothing ticked — every row that has not. A partner already invited is
     never re-sent by either. */
  const unsentIds = invitedIds.filter((id) => !sentIds.includes(id));
  const unsentTicked = selectedRows
    .map((i) => partnerRows[i])
    .filter((id) => id && !sentIds.includes(id));
  const sendable = unsentTicked.length > 0 ? unsentTicked : unsentIds;

  /* ───────────────────────────────────── the draft partner picker ───── */

  /**
   * THE PICKER IS NOT ONLY DRAFT'S. (Pavan, 2026-09-22.) A round that is out
   * and half-answered is exactly when a broker wants one more partner in it —
   * two prices back and both high is the moment to widen the net, and having
   * to leave the stage to do it is why people ring somebody instead. So the
   * whole-list table stays up through Quoting; what changes is the Action
   * column, which follows where each partner has got to.
   */
  const isDraft = draft.status === "Draft";
  const isPicking = isDraft || draft.status === "Quoting";
  /** Whether a price has come back from that partner. */
  const hasQuote = (vendorId: string) =>
    draft.quotes.some((q) => q.vendorId === vendorId);
  /**
   * THE ROWS: EVERY ELIGIBLE PARTNER, PLUS ANYONE ALREADY ON THE ORDER.
   *
   * Eligibility is checked against TODAY — compliance lapses, a partner is
   * deactivated — so a list of only the eligible would quietly drop a partner
   * who was invited last week, taking their quote off the screen with them.
   * The order is a record of what happened; somebody who was asked stays
   * visible whether or not they could be asked again now.
   */
  const pickerRows = [
    ...eligible,
    ...VENDORS.filter(
      (v) =>
        !eligible.some((e) => e.id === v.id) &&
        (draft.invitedVendorIds.includes(v.id) || hasQuote(v.id))
    ),
  ];
  /** Ticked partners, in the table's own order. */
  const draftPicked = pickerRows.filter((v) => selected.has(v.id));
  /** Partners already in the round — asked, or priced. */
  const inRound = pickerRows.filter((v) => sentIds.includes(v.id) || hasQuote(v.id));
  /** Everyone else who could still be brought in. */
  const available = pickerRows.filter((v) => !inRound.includes(v));
  /** What a bulk press would go to: ticked, minus anyone already asked. */
  const draftSendable = draftPicked
    .filter((v) => !sentIds.includes(v.id))
    .map((v) => v.id);

  /**
   * ONE ACT, NOT TWO. Inviting somebody and asking them for a price is a
   * single decision in Draft — nobody invites a partner and then decides
   * separately whether they want to know the cost. It puts them on the order,
   * marks the round as quoting, and sends; `sendInvitations` raises the toast
   * and keeps its own "already sent" guard.
   */
  /**
   * THE COMPOSER, NOT A CONFIRM. Inviting sends an email carrying the whole
   * order, so the broker reads it before it goes. `resend` only changes the
   * wording — the act is the same one.
   */
  const openInvite = (ids: string[], resend = false) =>
    setInviting({ ids: ids.filter(Boolean), resend });

  /** The order as the partner will read it — every line off the draft. */
  const inviteFacts = {
    orderNo: order?.orderNo ?? "New order",
    customer: draft.customer,
    shipTo: draft.shipTo,
    address: site
      ? `${site.street}, ${site.city}, ${site.state} ${site.zip}`
      : draft.shipTo,
    dateKey: draft.plannedDate ? dateKeyOf(draft.plannedDate) : "",
    window: { start: draft.windowStart, end: draft.windowEnd },
    lines: draft.lines,
  };

  /**
   * ON THE PARTNER'S BEHALF. Most of this is settled on the phone: the partner
   * says yes and gives a price, and the sheet is the record of it rather than
   * the place it happened. So an UNINVITED partner can still be acknowledged
   * and priced — putting them on the order is part of the same act, because a
   * price with nobody attached to it is not a quote.
   */
  const takeOnBehalf = (vendorId: string, thenQuote: boolean) => {
    setDraft((d) =>
      d && !d.invitedVendorIds.includes(vendorId)
        ? {
            ...d,
            invitedVendorIds: [...d.invitedVendorIds.filter(Boolean), vendorId],
          }
        : d
    );
    if (thenQuote) openQuoteDraft(vendorId);
    else acknowledgeFor([vendorId]);
  };

  /**
   * ONE ROW, USED BY BOTH GROUPS. In Quoting the table is split — the
   * partners in the round, then the rest behind a fold — and a row must
   * read identically in either, so there is one of it.
   */
  const partnerRow = (v: (typeof pickerRows)[number]) => {
      const ticked = selected.has(v.id);
      const asked = sentIds.includes(v.id);
      const quoted = hasQuote(v.id);
      return (
        <tr
          key={v.id}
          /* THE ROW IS THE TICK. A name, an address and a
             distance are all read together to make one
             decision, so the whole row is the target. */
          onClick={() =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(v.id)) next.delete(v.id);
              else next.add(v.id);
              return next;
            })
          }
          className={cn(
            "cursor-pointer border-b border-border last:border-0 hover:bg-fp-row-hover",
            ticked && "bg-fp-row-selected"
          )}
        >
          <td className="px-3 py-2.5">
            <Checkbox
              checked={ticked}
              aria-label={v.name}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(v.id)) next.delete(v.id);
                  else next.add(v.id);
                  return next;
                })
              }
            />
          </td>
          {/* A PARTNER'S NAME DOES NOT WRAP. It is the row's subject, and
              "Sierra / Bulk / Transport" over three lines makes a table of
              three partners as tall as a table of nine. The ADDRESS is the
              column that takes the slack — see the header. */}
          <td className="px-3 py-2.5 whitespace-nowrap text-foreground">
            {v.name}
          </td>
          <td className="px-3 py-2.5 text-muted-foreground">{v.base}</td>
          <td className="w-[84px] px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-muted-foreground">
            {v.distanceMi} mi
          </td>
          <td className="px-3 py-2">
            <div className="flex items-center justify-end gap-1.5">
              {quoted ? (
                <>
                {/* TWO ACTS ON A PRICED ROW, AND THEY ARE NOT THE SAME
                    ONE. (Pavan, 2026-09-22.) Reading a quote is not
                    choosing it: a broker looks at three and takes one,
                    so Review is quiet and repeatable — press it on each
                    in turn — and Finalize is the decision.

                    REVIEW IS A LINK (Pavan, 2026-09-22) — underlined text,
                    no box. It costs nothing and undoes nothing, and as a
                    second button beside the award it read as a second thing
                    to choose between. A link is a way through to something
                    already on this screen, which is exactly what it is. */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2 text-muted-foreground underline underline-offset-4 hover:bg-transparent hover:text-foreground"
                  /* REVIEW TAKES YOU TO THE PRICE, it does not open a second
                     sheet over the one you are reading. (Pavan, 2026-09-22.)
                     The figures are already on this screen — reviewing is
                     reading them against the customer's side, which is the
                     one thing a sheet stacked on top of them prevents.
                     `attend` scrolls the Pricing unit into view and blinks it
                     twice, because after a scroll the eye is on the movement
                     rather than on what moved. */
                  onClick={(e) => {
                    e.stopPropagation();
                    setShownQuote(v.id);
                    attend(PRICING_SECTION_ID);
                    /* THEN, AND ONLY THEN, THE COLUMN. Two statements rather
                       than one longer one: "here", and then "this part of
                       here". Started after the unit's own flash has finished
                       — overlapping them reads as the first still going,
                       which says nothing about the second. */
                    window.setTimeout(
                      () => blinkGroup(VENDOR_COST_COLUMN_ID),
                      320 + BLINK_MS
                    );
                  }}
                >
                  Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  /* GREEN, BUT OUTLINED (Pavan, 2026-09-22). Awarding is the
                     good outcome and the green says so, but three filled green
                     buttons down a table of partners read as the table's
                     purpose rather than as one choice among them — the row
                     shouted before the reader had compared anything. Outlined,
                     it is still the only coloured thing on the row and still
                     the only press that moves the order, and it fills on
                     hover, when it IS the one being chosen.

                     THE `dark:` HALF IS NOT BELT-AND-BRACES (Pavan,
                     2026-09-22 — "the hover state seems off"). The `outline`
                     variant carries `dark:hover:bg-input/50`, which is a
                     later-stacked variant of the same specificity and so BEAT
                     the plain `hover:bg-status-success`: in dark the fill
                     never went green at all. The text still switched to
                     `--status-success-foreground` — #052e16, a near-black
                     green — and landed on that grey-blue fill, which is how a
                     hover state came to be less readable than the resting one.
                     Naming the dark hover explicitly is what wins. */
                  className="border-status-success text-status-success hover:bg-status-success hover:text-status-success-foreground dark:hover:bg-status-success dark:hover:text-status-success-foreground"
                  disabled={draft.vendorId === v.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFinalizing(v.id);
                  }}
                >
                  {draft.vendorId === v.id ? "Finalized" : "Finalize vendor"}
                </Button>
                </>
              ) : asked ? (
                /* ASKED AND NOT ANSWERED. The state replaces the
                   act rather than sitting beside it greyed out;
                   asking again is in the menu, where a second
                   attempt belongs.

                   IN DRAFT NOTHING IS LATE — the round has not
                   gone out — so it says what was done. Once it
                   is out, the reader is waiting for a price and
                   the word says that instead. */
                <StatusChip tone={invitedTone} variant="soft">
                  {invitedWord}
                </StatusChip>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={draft.status === "Blocked"}
                  onClick={(e) => {
                    e.stopPropagation();
                    openInvite([v.id]);
                  }}
                >
                  Invite and request quote
                </Button>
              )}
              {/* THE OTHER WAY THIS HAPPENS. Most of it is
                  settled on the phone, so the menu carries what
                  the broker does on the partner's behalf —
                  before an invitation, or instead of one. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More actions for ${v.name}`}
                    className="text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {asked ? (
                    <DropdownMenuItem
                      onSelect={() => openInvite([v.id], true)}
                    >
                      <Send />
                      {quoted
                        ? "Ask for a revised quote"
                        : "Resend invite and request quote"}
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onSelect={() => takeOnBehalf(v.id, false)}
                      >
                        <Check />
                        Acknowledge on their behalf
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => takeOnBehalf(v.id, true)}
                      >
                        <FileText />
                        Add their quotation
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </td>
        </tr>
      );
  };

  const inviteAndQuote = (ids: string[]) => {
    const fresh = ids.filter(Boolean);
    if (fresh.length === 0) return;
    setDraft((d) =>
      d
        ? {
            ...d,
            invitedVendorIds: [
              ...new Set([...d.invitedVendorIds.filter(Boolean), ...fresh]),
            ],
            quoteRequested: true,
          }
        : d
    );
    sendInvitations(fresh);
    setSelected(new Set());
  };

  /* THE SPARE ACTS ON THE LIST — on the section's title bar, because a
     control that owns a whole section has no row to belong to. */
  const partnerMenu = invitedIds.length > 0 ? (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        /* GHOST, NOT OUTLINED. On the title bar it is one of
           the section's own controls, and a box around it
           made a spare act look like a primary. */
        variant="ghost"
        size="icon-sm"
        aria-label="More partner actions"
        className="text-muted-foreground"
      >
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuItem
        onSelect={() =>
          acknowledgeFor(
            selectedRows.length > 0
              ? selectedRows.map((i) => partnerRows[i])
              : invitedIds
          )
        }
      >
        <Check />
        {selectedRows.length === 1
          ? "Acknowledge for them"
          : selectedRows.length > 1
            ? `Acknowledge for ${selectedRows.length}`
            : "Acknowledge for them all"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={removeAllPartners}
      >
        <ThumbsDown />
        Remove all vendors
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
) : undefined;
  const headerChecked: boolean | "indeterminate" =
    invitedIds.length > 0 && selectedRows.length === invitedIds.length
      ? true
      : selectedRows.length > 0
        ? "indeterminate"
        : false;
  const selectAllPartners = (on: boolean) =>
    setSelected(on ? new Set(invitedIds) : new Set());
  /* `showQuoteCol` is gone. The cost column used to appear only while the
     order was in Quoting with a quote requested, so the table changed shape
     under the reader as partners replied. It is always a column now; the cell
     is an em-dash until the partner prices it. */

  /* Inviting stays available until somebody has ACCEPTED — that is the point
     at which the order has a partner and more invitations mean nothing. */
  /* AWARDED IS NOT CONFIRMED. Awarding is the broker choosing which partner
     takes the order — one click on that partner's row; confirming is settling
     it, which is the footer's act. They used to be the same click, so there
     was no state in which a choice had been made and could still be changed. */
  const awarded = Boolean(draft.vendorId);
  const confirmed =
    awarded && draft.status !== "Quoting" && draft.status !== "Assigned";

  /**
   * FROM ASSIGNED ON, THE ORDER IS A RECORD, NOT A FORM. (Pavan, 2026-09-22.)
   *
   * IT IS THE STAGE THAT DECIDES, NOT WHETHER `vendorId` HAPPENS TO BE SET.
   * Reaching Assigned means a partner has taken the job and is acting on what
   * was sent; changing any of it here would change a job already in somebody
   * else's hands without telling them. Keying this off the award instead left
   * every seeded Assigned order fully editable, because in this vocabulary
   * Assigned means accepted and the award may have been settled on a call.
   */
  const LOCKED_STAGES: BrokerStatus[] = [
    "Assigned",
    "Completed",
    "Review",
    "Verified",
    "Partially Synced",
    "Synced",
  ];
  const locked = LOCKED_STAGES.includes(draft.status);
  /**
   * AT COMPLETED THE QUANTITY IS A FACT ABOUT THE PAST. (Pavan, 2026-09-22.)
   * Until then it is what was ordered and belongs to the Delivery Order table;
   * once the truck has been it is what was DELIVERED, which comes off the
   * partner's ticket and is usually not the same number. Everything in this
   * unit is that number times a rate, so it is typed here.
   */
  /* REVIEW AND A FAILED SYNC ARE BOTH FOR FIXING THE NUMBERS (2026-09-24):
     a hold for "these look off", and an error to put right before a retry.
     Both would be useless if the numbers could not be corrected in them. */
  const deliveredEditable =
    draft.status === "Completed" ||
    draft.status === "Review" ||
    draft.status === "Partially Synced";
  /** The vendor unit settles at the same moment and for the same reason. */
  const vendorSettled = locked;
  /** Whoever is carrying it: the awarded partner, else the one who accepted. */
  const holdingVendorId = draft.vendorId ?? draft.acceptedVendorIds[0] ?? null;

  /* TYPING INTO AN EMPTY QUOTE CREATES IT. A partner that has accepted but not
     priced still has a row to fill in — the broker takes the price off a call
     and types it — so the first keystroke makes the quote and the line it lands
     on rather than requiring an "add quote" step first. */
  /* THE QUOTE IS THE PARTNER'S, AND IS EDITED IN ITS OWN SHEET. `blankQuote`,
     `setQuoteCharge` and `setQuoteLine` lived here to serve an editable Vendor
     Pricing table; that table is gone, and `VendorQuoteSheet` owns writing a
     quote now — one place a price can be typed, so two cannot disagree. */

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

  /* ── WHAT THE ORDER HAS BECOME, derived once for the rail and the FAB ──
     Both read the same numbers on purpose: a completion meter that disagreed
     with the card beside it would be worse than no meter at all. */

  /*
    THERE IS ALWAYS A NEXT ACT, AND THE FOOTER SHOULD NAME IT.

    The footer started out empty, because nothing had to be
    SAVED — but "nothing to save" is not "nothing to do", and a bar with no
    button reads as a screen that has finished with you. The order knows
    exactly what comes next at every stage; it was just never asked.

    ONE LADDER, IN THE ORDER THE WORK HAPPENS. The first rung that is not yet
    done is the act. Blocked does not change WHICH act is next — it changes
    whether it can be taken, so the button stays and goes disabled with the
    reason on it, the same call the spent Accept quote makes.
  */
  /**
   * AWAITING A PRICE IS NOT AN ACT. (Pavan, 2026-09-22.) Once the order is
   * created and the invitations are out, nobody here does anything next — the
   * partners do. The DS rule for a control with nothing to point at is to
   * hide it, not grey it out, so the footer keeps only the line saying what
   * is being waited for.
   */
  /**
   * WHEN THE JOB WAS DUE TO BE DONE — the planned date plus the end of the
   * delivery window. Until it passes there is nothing for the broker to mark
   * complete: the truck has not been yet. (Pavan, 2026-09-22.)
   */
  const plannedEnd = (() => {
    if (!draft.plannedDate) return null;
    const d = new Date(draft.plannedDate);
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(draft.windowEnd.trim());
    if (m) {
      const h = Number(m[1]) % 12 + (/pm/i.test(m[3]) ? 12 : 0);
      d.setHours(h, Number(m[2]), 0, 0);
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  })();
  const deliveryDue = plannedEnd !== null && plannedEnd.getTime() <= Date.now();

  /** Assigned, and the window has not passed — nothing to do but wait. */
  const awaitingCompletion = draft.status === "Assigned" && !deliveryDue;

  const awaitingQuotation =
    !creating &&
    draft.status === "Draft" &&
    sentIds.length > 0 &&
    draft.quotes.length === 0;

  const nextAct: {
    label: string;
    onSelect: () => void;
    why?: string;
    /** Disabled with no clause of its own — something else is saying why. */
    blocked?: boolean;
  } =
    /* THE WHOLE OF DRAFT IS ONE ACT: create the order. What is missing before
       it can be is the banner's business — it has room for three things and a
       way to step through them, which is why the ladder no longer opens with
       "Add an asset". A footer that renamed itself three times on the way
       through a form was a button the reader had to re-read at every step.

       SENDING IS THE TABLE'S ACT, NOT THE SHEET'S. It lives on the band that
       closes the vendor table, next to the rows it acts on; the footer carries
       the ORDER's act, and while the order is a draft that act is creating it.
       Two buttons of the same size for the two were competing for one press.

       ONE CTA THAT DOES NOT CHANGE ITS NAME UNDER THE READER. What is missing
       goes in the line beside it, never on it. */
    draft.status === "Draft"
      ? {
          /* THE BANNER CARRIES THE REASON NOW. It has room for the whole list
             and a way to step through it; the clause beside the button had
             room for one of the three and no way to say there were others. */
          label: "Create Order",
          onSelect: pendingSteps.length === 0 ? createOrder : () => {},
          blocked: pendingSteps.length > 0,
        }
        : /* ONCE A PARTNER HOLDS THE ORDER THE QUOTE RUNGS ARE SPENT. An
             accepted order was being offered "Request a quote" because the
             ladder asked about quoting before it asked whether the quoting was
             over. The lifecycle rungs below already handle it — this just lets
             them be reached. */
          draft.vendorId
          ? /* AWARDED, NOT YET SETTLED. The award named the partner; this
               settles what they charge and what the customer pays, which is
               what used to happen in the same click as the award. */
            draft.status === "Quoting"
            ? {
                /* THE LABEL IS THE ACT AND THE ACT IS THE STAGE. Awarding
                   said whose price we are taking; this says the job is
                   theirs to run. Two decisions, two presses. */
                label: "Move to Assigned",
                onSelect: () => advance("Assigned"),
              }
            : draft.status === "Assigned"
            ? {
                /* NOTHING TO MARK UNTIL THE TRUCK HAS BEEN. Before the
                   window closes the footer carries the wait instead (see
                   `awaitingCompletion`); after it, completing is a review
                   of what actually happened, not a rubber stamp. */
                label: "Review & mark completed",
                onSelect: () => {
                  const id = draft.vendorId!;
                  const next = draftAccepting(draft, id);
                  announceAccepted(draft, id);
                  setDraft(next);
                  if (order) onSave(order, next);
                },
              }
            : draft.status === "Completed" || draft.status === "Review"
            ? {
                label: "Move to Verified",
                onSelect: () => advance("Verified"),
              }
            : draft.status === "Partially Synced"
              ? {
                  /* BACK INTO THE QUEUE. The accounting system picks it up
                     again on its own schedule. */
                  label: "Retry sync",
                  onSelect: () => advance("Verified"),
                }
              : {
                  label: "Push to dispatch",
                  onSelect: () =>
                    toast.success("Pushed to dispatch", {
                      description: "The order is on the dispatch board.",
                    }),
                }
          : quotingPartners.length > 0 && !draft.quoteRequested
          ? {
              label: "Request a quote",
              onSelect: () => set("quoteRequested", true),
            }
          : quotes.length > 0 && !draft.vendorId
            ? {
                /* THE SAME BUTTON, WAITING FOR THE CHOICE. It used to accept
                   whichever quote the sheet happened to be showing, which made
                   the footer decide something the reader had not — with two
                   prices in, the footer picked one. The choice is a click on a
                   partner's own row now, and until it is made this names what
                   pressing it will do and says why it cannot yet. */
                label: "Move to Assigned",
                onSelect: () => {},
                why: "Finalize a vendor in the table above.",
              }
            : !draft.vendorId
              ? {
                  /* THE LABEL IS THE ACT, NEVER THE STATE. "Waiting on
                     partners" on a button asks the reader to press a fact.
                     The act is still requesting a quote; what has not
                     happened yet is somebody accepting the invitation, and
                     that belongs in the line beside the button, not on it. */
                  label: "Request a quote",
                  onSelect: () => set("quoteRequested", true),
                  /* WHAT IS ACTUALLY BEING WAITED FOR. (Pavan, 2026-09-22.)
                     "Waiting on a partner to acknowledge" describes a step
                     the broker no longer takes separately — inviting and
                     asking for a price are one act now — so the only thing
                     outstanding is the price. */
                  why: "Awaiting quotation.",
                }
              : draft.status === "Completed" || draft.status === "Review"
                ? {
                    label: "Move to Verified",
                    onSelect: () => advance("Verified"),
                  }
                : draft.status === "Partially Synced"
                  ? {
                      label: "Retry sync",
                      onSelect: () => advance("Verified"),
                    }
                  : {
                      label: "Push to dispatch",
                      onSelect: () =>
                        toast.success("Pushed to dispatch", {
                          description: "The order is on the dispatch board.",
                        }),
                    };
  /* ONLY THE ACCOUNTING SYSTEM MARKS AN ORDER SYNCED (Pavan, 2026-09-24).
     Verified is a queue it pulls from on its own schedule; the broker has no
     button to hurry it, so the footer carries the wait. */
  const awaitingAccounting = draft.status === "Verified";
  /* THE OTHER WAYS OUT, in the footer's ··· beside the primary — the same
     shape the Service sheet uses. Review is reversible both ways; a failed
     sync can be retried (the primary), sent to review, or marked synced once
     the issue is fixed outside. */
  const sheetActs: { label: string; onSelect: () => void }[] =
    creating
      ? []
      : draft.status === "Completed"
        ? [{ label: "Send to review", onSelect: () => advance("Review") }]
        : draft.status === "Review"
          ? [{ label: "Send back to Completed", onSelect: () => advance("Completed") }]
          : draft.status === "Partially Synced"
            ? [
                { label: "Send to review", onSelect: () => advance("Review") },
                { label: "Mark synced", onSelect: () => advance("Synced") },
              ]
            : [];
  const nextActBlocked =
    draft.status === "Blocked"
      ? "Blocked on credit"
      : draft.status === "Cancelled"
        ? "Order cancelled"
        : nextAct.why;
  /* Disabled either because something is SAID beside it, or because the banner
     above it is saying it instead. */
  const nextActOff = Boolean(nextActBlocked) || Boolean(nextAct.blocked);
  const shownCost = shownVendorId ? costOf(shownVendorId) : 0;
  /** The base on its own, so the table can show it whether or not it counts. */
  /** Freight + fees + taxes, which belong to no line. */
  const shownCharges = shownQuote ? quoteFreight(shownQuote) : 0;

  /* ── THE WORKING BEHIND EACH SUMMARY FIGURE ──
     One entry per line, plus the charges that belong to no line. Built from
     the same functions the two pricing tables use, so the tooltip and the
     table can never disagree — a breakdown that drifted from the table it
     explains would be worse than no breakdown. */
  const perLine = (f: (l: OrderLine) => number) =>
    draft.lines
      .filter((l) => f(l) !== 0)
      .map((l) => ({
        label: `${l.asset || "—"} · ${billableGal(l).toLocaleString()} gal`,
        value: money(f(l)),
      }));

  const vendorBreakdown = shownQuote
    ? [
        ...draft.lines
          .map((l) => {
            const ql = shownQuote.lines.find((x) => x.asset === l.asset);
            return ql
              ? {
                  label: `${l.asset || "—"} · ${billableGal(l).toLocaleString()} gal @ ${money(ql.ratePerGal + quoteLineChargeRate(ql, l))}`,
                  value: money(quoteLineTotal(ql, l)),
                }
              : null;
          })
          .filter((x): x is { label: string; value: string } => x !== null),
        { label: "Freight", value: money(shownCharges) },
      ]
    : [];
  const customerBreakdown = perLine(customerLineTotal);
  const marginBreakdown =
    shownQuote && shownVendorId
      ? [
          { label: "Customer pricing", value: money(revenue) },
          { label: "Vendor TLC", value: `− ${money(shownCost)}` },
        ]
      : [];

  /**
   * A COLUMN IS DONE WHEN EVERY FIELD IN IT IS, not when it totals something
   * (Pavan, 2026-09-17). A delivery fee typed and a margin left at zero add up
   * to a number, and a tick on that says the column has been dealt with when
   * half of it has not been touched.
   *
   * ZERO READS AS EMPTY. It is what the field shows before anyone types, so a
   * deliberate zero — no margin, free delivery — cannot be told from an
   * untouched one without a per-field record of who typed what. Named here
   * rather than buried: see the note in the README.
   *
   * CARRIER COST HAS NO FIELDS — it is the partner's quote, read back. It is
   * done when there IS one and it prices the order as it now stands.
   */
  const pricedLines = draft.lines.filter(
    (l) => l.asset.trim() !== "" || l.product.trim() !== ""
  );
  /* THE PRODUCT COLUMN IS DONE WHEN EVERY LINE NAMES A PRODUCT. The asset is
     not mandatory — a line can name a product and a quantity with no asset on
     our books — so it cannot be part of the test. */
  const productColumnDone =
    pricedLines.length > 0 && pricedLines.every((l) => l.product.trim() !== "");
  /* PRICE AND MARGIN ARE THE FIELDS THAT HAVE TO BE THERE. Tax and fee are per
     product, and plenty of products carry neither — a column that could only
     tick once every product had a fee on it would be a tick nobody ever saw.
     The run's own fees are optional for the same reason. */
  const customerBillingDone =
    pricedLines.length > 0 &&
    pricedLines.every(
      (l) =>
        (l.pricePerGal ?? 0) > 0 && customerChargeTotal(l, "Margin") > 0
    );
  const carrierCostDone = Boolean(shownQuote && quoteCoversOrder(shownQuote));

  const canSubmit =
    draft.customer.trim() !== "" &&
    draft.shipTo.trim() !== "" &&
    draft.plannedDate !== null;

  /*
    THE TWO PRICING TABLES, LIFTED OUT OF THE RENDER.

    They sit at the foot of the left column, a long way below the block that
    computes the figures they show. Defined next to that arithmetic, they can
    be read against it.
  */
  /* WHO PAYS THE LOAD'S FEES AND TAXES depends on who bought the product.
     With a load order it is already the broker's, so the partner only hauls it
     and those two are billed through to the customer; without one the partner
     sourced it and they are the partner's own. Stated once, here, so the two
     columns cannot both claim the same money. */
  const passThrough =
    hasLoadOrder && shownQuote
      ? quoteChargeTotal(shownQuote, draft.lines, "Fee") +
        quoteChargeTotal(shownQuote, draft.lines, "Tax")
      : 0;
  const carrierTotal = shownCost - passThrough;
  const runFees = orderFeesTotal(draft.orderFees);
  const billed = customerTotal(draft.lines, draft.orderFees, passThrough);
  const margin = billed - carrierTotal;


  /**
   * ONE FIGURE ON THE SHOWN PARTNER'S QUOTE.
   *
   * THE BROKER TYPES THE PARTNER'S SIDE TOO (Pavan, 2026-09-22). Most of a
   * quote is settled on the phone — the module already has a whole sheet for
   * writing one down on a partner's behalf — and the unit that puts the two
   * sides beside each other is the place a broker is actually sitting when the
   * partner reads their numbers out. Read-only, the left column was a wall you
   * had to leave the screen to change.
   *
   * IT CREATES THE LINE IF THERE IS NONE. A partner can quote an order and
   * miss a product off it; typing the first figure for that product is how it
   * gets a line, not an error.
   */
  const setQuoteLine = (asset: string, patch: Partial<QuoteLine>) =>
    setDraft((d) => {
      if (!d || !shownVendorId) return d;
      return {
        ...d,
        quotes: d.quotes.map((q) =>
          q.vendorId !== shownVendorId
            ? q
            : {
                ...q,
                lines: q.lines.some((x) => x.asset === asset)
                  ? q.lines.map((x) =>
                      x.asset === asset ? { ...x, ...patch } : x
                    )
                  : [
                      ...q.lines,
                      {
                        asset,
                        ratePerGal: 0,
                        rates: {},
                        ...patch,
                      },
                    ],
              }
        ),
      };
    });
  /**
   * THE CHARGES ON ONE PRODUCT — add, remove, and type either side's rate.
   *
   * THE CHARGE IS THE ORDER'S, THE RATES ARE EACH SIDE'S (Pavan, 2026-09-22).
   * A product can carry two margins, a state tax and a county one, a pump fee
   * and a hazmat fee — so the ROW is a record on the order line, and each side
   * holds a figure against it: the broker's on the charge, the partner's in
   * that quote line's `rates` map. Adding a row therefore adds it to BOTH
   * columns at once, which is the point of a unit that exists to be read
   * across.
   */
  const addCharge = (i: number, kind: LineChargeKind) => {
    const added = newLineCharge(kind, draft.lines[i].charges ?? []);
    chargeJustAdded.current = true;
    setFocusCharge(`${i}:${added.id}`);
    setLine(i, {
      charges: [...(draft.lines[i].charges ?? []), added],
    });
  };
  const removeCharge = (i: number, id: string) =>
    setLine(i, {
      charges: (draft.lines[i].charges ?? []).filter((c) => c.id !== id),
    });
  const setCharge = (i: number, id: string, perGal: number) =>
    setLine(i, {
      charges: (draft.lines[i].charges ?? []).map((c) =>
        c.id === id ? { ...c, perGal } : c
      ),
    });
  /** The partner's figure for one of those charges. */
  const setQuoteRate = (asset: string, id: string, v: number) =>
    setQuoteLine(asset, {
      rates: {
        ...(shownQuote?.lines.find((x) => x.asset === asset)?.rates ?? {}),
        [id]: v,
      },
    });

  /** The same, for a charge that belongs to the run rather than to a line. */
  const setQuoteCharge = (patch: Partial<VendorQuote>) =>
    setDraft((d) =>
      d && shownVendorId
        ? {
            ...d,
            quotes: d.quotes.map((q) =>
              q.vendorId === shownVendorId ? { ...q, ...patch } : q
            ),
          }
        : d
    );

  /* THE RUN'S OWN FEES — a list, so adding a second one is adding a row and
     not asking an engineer for a field. */
  const setFee = (i: number, patch: Partial<OrderFee>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            orderFees: d.orderFees.map((f, j) =>
              j === i ? { ...f, ...patch } : f
            ),
          }
        : d
    );
  const addFee = () => {
    setFocusFee(draft.orderFees.length);
    setDraft((d) =>
      d
        ? {
            ...d,
            /* A NEW ROW IS A FEE UNTIL IT SAYS OTHERWISE. Fee is what almost
               every one of these is, and a type select that opens empty is a
               question asked before the one that matters. */
            orderFees: [
              ...d.orderFees,
              { type: "Fee" as OrderFeeType, label: "", amount: 0 },
            ],
          }
        : d
    );
  };
  const removeFee = (i: number) =>
    setDraft((d) =>
      d ? { ...d, orderFees: d.orderFees.filter((_, j) => j !== i) } : d
    );

  /* THE PRICING CELLS' INSETS, named once. The first child of a cell takes the
     left one so the input's hit area reaches the cell's edge; the amount takes
     the right one. */
  const PRICE_PAD_L = "pl-4 lg:pl-6";
  const PRICE_PAD_R = "pr-4 lg:pr-6";

  /**
   * IS THERE ANYTHING TO PRICE YET? See the note at the render site: past
   * Draft, always; in a draft, only once a partner's price has been written
   * down.
   */
  const showPricing = draft.status !== "Draft" || draft.quotes.length > 0;

  const pricingSections = (
    /* ONE BLOCK, THREE PARTS. The 40px the sheet body puts between sections is
       reproduced inside, so nothing moves — but Pricing, Additional fees and
       the totals now share a containing block, which is what scopes the sticky
       foot to them. */
    <div className="flex shrink-0 flex-col gap-10">
    <SheetSection
      id={PRICING_SECTION_ID}
      title="Pricing"
      /* FLUSH, SO THE PRODUCT BANDS CAN RUN EDGE TO EDGE (Pavan, 2026-09-22).
         Each band is a card-like group — a tinted strip naming the product,
         the three levels under it — and a group that stops 16px short of the
         card it is in reads as a box inside a box. The columns bring their own
         insets instead. The card keeps its own `overflow-hidden`: nothing
         inside it sticks any more, so there is nothing for the clip to break. */
      flush
      note={
        <SheetSectionNote label="About pricing">
          Every product on the order gets a band, and the three columns under it
          are the three levels the same gallons are priced at — what the partner
          wants for it, what the customer is billed for it, and the product
          itself. Price, margin, tax and fee are all charged on what is in the
          tank, so they all hang off the product they are charged on. Fees that
          are about the run and not about a product are added underneath.
          <span className="mt-1.5 block">
            {hasLoadOrder
              ? "This order has a load order, so the product is the broker's: the partner charges freight and its service charge only, and its fees and taxes are billed through to the customer."
              : "With no load order the partner sources the product too, so its fees and taxes are its own."}
          </span>
        </SheetSectionNote>
      }
    >
      {/* THE ROW IS A CHARGE; THE COLUMNS ARE WHO IS CHARGING IT (Pavan,
          2026-09-22).

          THE LABEL IS A COLUMN, NOT A REPEAT. Price, Margin, Tax and Fees were
          printed twice on every band — once down the partner's side and once
          down the customer's — which is the same four words said twice to
          answer a question neither of them is. Lifted into a **Type** column
          they are said once, and the two money columns hold nothing but money:
          a row now reads across as one charge, the partner's figure and the
          broker's, which is the comparison the whole unit is for.

          THE PRODUCT SPANS ITS BAND. Four charges belong to one product, so
          the product cell is one cell four rows tall — the shape a table takes
          when a subject owns several rows, rather than a heading strip that
          has to be re-read on every row under it.

          A RULE BETWEEN THE COLUMNS, not a gap alone: four columns of figures
          need saying apart. Only where there ARE columns — below `lg` the
          whole thing stacks. */}
      <div className="grid grid-cols-1 items-stretch gap-y-8 lg:grid-cols-[minmax(0,0.75fr)_184px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-y-0">
        {/* ── THE COLUMN NAMES ───────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col px-4 pt-4 pb-3 lg:pr-6">
          <PricingColumnHead label="Product" done={productColumnDone} />
        </div>
        <div className="flex min-w-0 flex-col px-4 pt-4 pb-3 lg:border-l lg:border-border lg:px-4">
          <PricingColumnHead label="Type" />
        </div>
        {/* THE PARTNER PICKER BELONGS TO THIS COLUMN (Pavan, 2026-09-22). It
            was right-aligned on the section's header band, where it read as a
            control over the whole unit; it governs ONE of the three columns —
            whose figures these are — so it sits at the head of that column,
            and moving it says which side changes when you use it.

            NAME AND CHEVRON, NOTHING ELSE. The standing — awarded, pending,
            not awarded — is said on the partner table above and in the rail's
            Partners list; a third copy on a picker makes the picker look like
            a status field. */}
        <div
          id={VENDOR_COST_COLUMN_ID}
          data-blink={VENDOR_COST_COLUMN_ID}
          className="flex min-w-0 flex-col gap-2 px-4 pt-4 pb-3 lg:border-l lg:border-border lg:px-6"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <PricingColumnHead label="Vendor pricing" done={carrierCostDone} />
            {quotingPartners.length > 1 ? (
              <Combobox
                className="h-7 w-[188px] shrink-0"
                value={shownVendorId}
                onValueChange={setShownQuote}
                options={quotingPartners.map((vid) => ({
                  value: vid,
                  label: vendorById(vid)?.name ?? vid,
                  /* THE STANDING STAYS IN THE MENU. It is what the choice is
                     made on — which of them holds the order, which has priced
                     it — and a menu is where a reader is choosing. */
                  description:
                    draft.vendorId === vid
                      ? "Holds this order"
                      : draft.vendorId
                        ? "Not finalized"
                        : quoteOf(vid)
                          ? "Quotation shared"
                          : "No quotation",
                }))}
                searchPlaceholder="Search partners…"
              />
            ) : (
              /* ONE PARTNER NEEDS NO PICKER — a select of one is a question
                 with its answer already in it. */
              <span className="min-w-0 shrink truncate text-sm text-foreground">
                {vendorById(shownVendorId)?.name ?? "No partner yet"}
              </span>
            )}
          </div>
          {/* SAID ONCE, NOT ONCE PER PRODUCT. With no quote there is nothing
              to put in this column's cells at all, and the reason is a fact
              about the order rather than about each line on it. */}
          {!shownQuote && (
            <p className="text-sm text-muted-foreground">
              {summaryEmptyLine(draft.status, invitedIds.length)}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col px-4 pt-4 pb-3 lg:border-l lg:border-border lg:pr-4 lg:pl-6">
          <PricingColumnHead
            label="Customer pricing"
            done={customerBillingDone}
          />
        </div>

        {/* ── ONE BAND PER PRODUCT ───────────────────────────────────── */}
        {pricedLines.length === 0 && (
          <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground lg:col-span-4">
            No lines on this order yet.
          </p>
        )}
        {draft.lines.map((l, i) => {
          if (!l.asset && !l.product) return null;
          const g = billableGal(l);
          const ql = shownQuote?.lines.find((x) => x.asset === l.asset);
          const shut = collapsedProducts.has(l.asset || l.product);
          /** The working every rate in this band is multiplied by. */
          const perGal = `× ${g.toLocaleString()} gal`;
          /* WITH A LOAD ORDER the fuel is already the broker's, so the partner
             has no price to charge and its tax and fee are billed through to
             the customer. Those three cells say why instead of offering a box
             to type a charge that cannot exist. */
          const charges = l.charges ?? [];
          const rows: {
            key: string;
            /** The charge just added — its first rate takes focus. */
            focus?: boolean;
            label: string;
            /** Null on Price — a product has one rate and it cannot be removed. */
            onRemove?: () => void;
            vendorValue: number | undefined;
            vendorNote?: string;
            onVendor: (v: number) => void;
            customerValue: number | undefined;
            onCustomer: (v: number) => void;
          }[] = [
            {
              key: "price",
              label: "Price",
              vendorValue: ql?.ratePerGal,
              vendorNote: hasLoadOrder ? "On the load order" : undefined,
              onVendor: (v) => setQuoteLine(l.asset, { ratePerGal: v }),
              customerValue: l.pricePerGal,
              onCustomer: (v) => setLine(i, { pricePerGal: v }),
            },
            ...charges.map((c) => ({
              key: c.id,
              focus: focusCharge === `${i}:${c.id}`,
              label: chargeLabel(c, charges),
              onRemove: () => removeCharge(i, c.id),
              vendorValue: ql?.rates?.[c.id],
              /* A LOAD ORDER STRIKES THE TAX AND THE FEE, not the margin: the
                 broker owning the fuel does not stop the partner charging to
                 haul it. */
              vendorNote:
                hasLoadOrder && c.kind !== "Margin"
                  ? "Billed to the customer"
                  : undefined,
              onVendor: (v: number) => setQuoteRate(l.asset, c.id, v),
              customerValue: c.perGal,
              onCustomer: (v: number) => setCharge(i, c.id, v),
            })),
          ];
          return (
            <React.Fragment key={i}>
              {/* WHAT IS BEING PRICED, ONE CELL TALL ENOUGH FOR ITS CHARGES.
                  The asset is NOT mandatory — a line can name a product and a
                  quantity with no asset on our books — so it is the quiet half
                  and the product is the loud one. The chevron shuts the band;
                  an order with six products is six screens of figures and the
                  broker pricing the sixth has finished with the first five. */}
              <div
                className="flex min-w-0 flex-col border-t border-border px-4 py-3 lg:pr-6"
                style={
                  shut
                    ? undefined
                    : ({
                        gridRow: `span ${rows.length + 1}`,
                      } as React.CSSProperties)
                }
              >
                <button
                  type="button"
                  aria-expanded={!shut}
                  aria-label={`${shut ? "Show" : "Hide"} ${l.product || l.asset}`}
                  onClick={() =>
                    setCollapsedProducts((prev) => {
                      const key = l.asset || l.product;
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  className="flex min-w-0 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {l.product || "—"}
                    </span>
                    {l.asset && (
                      <span className="truncate text-xs text-muted-foreground">
                        {l.asset}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                      shut && "-rotate-90"
                    )}
                  />
                </button>
                {/* THE QUANTITY BELONGS WITH THE ASSET AND THE PRODUCT. It is
                    ONE number — the same gallons both sides price on — so
                    listed in each pricing column it was the same fact printed
                    twice. `mt-auto` puts it at the foot of the band, level
                    with the last charge either side.

                    DELIVERED ONLY ONCE IT HAS BEEN, and it is the one field:
                    everything in both money columns is this number times a
                    rate. */}
                {!shut && (
                  <dl className="mt-auto flex flex-col pt-3">
                    <ChargeRow
                      label="Requested"
                      total={
                        l.topOff
                          ? "Top-off"
                          : `${(l.gal ?? 0).toLocaleString()} gal`
                      }
                    />
                    {deliveredEditable && (
                      <ChargeRow
                        label="Delivered"
                        total={`${g.toLocaleString()} gal`}
                      >
                        <BoxGallons
                          value={g}
                          aria-label={`Gallons delivered for ${l.product}`}
                          onChange={(v) => setLine(i, { deliveredGal: v })}
                        />
                      </ChargeRow>
                    )}
                  </dl>
                )}
              </div>

              {!shut &&
                rows.map((r) => (
                  <React.Fragment key={r.label}>
                    <PricingTypeCell label={r.label} onRemove={r.onRemove} />
                    <PricingCell
                      blinkGroupName={VENDOR_COST_COLUMN_ID}
                      padL={PRICE_PAD_L}
                      padR={PRICE_PAD_R}
                      per={r.vendorNote ? undefined : perGal}
                      note={r.vendorNote}
                      total={money(
                        r.vendorNote ? 0 : g * (r.vendorValue ?? 0)
                      )}
                      input={
                        shownQuote && !r.vendorNote ? (
                          <PricingRateInput
                            value={r.vendorValue}
                            padClass={PRICE_PAD_L}
                            autoFocus={r.focus}
                            aria-label={`Partner ${r.label.toLowerCase()} per gallon for ${l.product}`}
                            onChange={r.onVendor}
                          />
                        ) : undefined
                      }
                    />
                    <PricingCell
                      padL={PRICE_PAD_L}
                      padR="pr-4"
                      per={perGal}
                      total={money(g * (r.customerValue ?? 0))}
                      input={
                        <PricingRateInput
                          value={r.customerValue}
                          padClass={PRICE_PAD_L}
                          /* The partner's cell comes first; this one only when
                             there is no partner rate to type. */
                          autoFocus={r.focus && !(shownQuote && !r.vendorNote)}
                          aria-label={`Customer ${r.label.toLowerCase()} per gallon for ${l.product}`}
                          onChange={r.onCustomer}
                        />
                      }
                    />
                  </React.Fragment>
                ))}

              {/* ADD ANOTHER CHARGE TO THIS PRODUCT (Pavan, 2026-09-22). A
                  load can carry two margins, a state tax and a county one, a
                  pump fee and a hazmat fee — so the charges are a list and this
                  is how it grows. It adds to BOTH columns, because a charge is
                  the order's and only the figures are each side's.

                  ONE CONTROL, THREE KINDS, in the column that names them. Three
                  separate adds would be three controls for one act. */}
              {!shut && (
                <>
                  {/* THE CELL IS STYLED LIKE ITS SIBLINGS — rule on top, no
                      inset of its own; the button carries the padding. This is
                      a cell of the matrix, not the full-width add band §10f
                      forbids: a hanging add on the card's corner could only
                      add to ONE of the products in it. */}
                  <div className="flex min-w-0 items-center border-t border-border lg:border-l">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="m-1.5 h-8 flex-1 justify-start gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-4 shrink-0" />
                          Add charge
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        /* An add hands focus to the new charge's rate; the
                           menu handing it back to this button would undo it. */
                        onCloseAutoFocus={(e) => {
                          if (chargeJustAdded.current) e.preventDefault();
                          chargeJustAdded.current = false;
                        }}
                      >
                        {LINE_CHARGE_KINDS.map((kind) => (
                          <DropdownMenuItem
                            key={kind}
                            onSelect={() => addCharge(i, kind)}
                          >
                            {kind}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="border-t border-border lg:border-l" />
                  <div className="border-t border-border lg:border-l" />
                </>
              )}
            </React.Fragment>
          );
        })}

        {/* ── WHAT BELONGS TO NO PRODUCT ─────────────────────────────── */}
        {/* Freight is the truck coming out and the run's fees are the job
            being awkward; neither is about what is in the tank, so neither can
            sit in a product's band — and neither has an opposite number, so
            each takes a row of its own with the other side left empty. */}
        {(shownQuote || draft.orderFees.length > 0) && (
          <>
            <div
              className="flex min-w-0 items-start border-t border-border px-4 py-3 lg:pr-6"
              style={{ gridRow: `span ${1 + draft.orderFees.length}` }}
            >
              <span className="text-sm font-medium text-foreground">
                Whole order
              </span>
            </div>

            <PricingTypeCell label="Freight" />
            <PricingCell
              blinkGroupName={VENDOR_COST_COLUMN_ID}
              padL={PRICE_PAD_L}
              padR={PRICE_PAD_R}
              total={money(shownQuote?.freight ?? 0)}
              input={
                shownQuote ? (
                  <PricingRateInput
                    value={shownQuote.freight}
                    dp={2}
                    padClass={PRICE_PAD_L}
                    aria-label="Partner freight for this order"
                    onChange={(v) => setQuoteCharge({ freight: v })}
                  />
                ) : undefined
              }
            />
            {/* FREIGHT IS THE PARTNER'S ALONE, so the customer's cell says NA
                rather than standing empty — an empty cell reads as a figure
                nobody has filled in yet. */}
            <PricingCell padL={PRICE_PAD_L} padR="pr-4" note="NA" total="" />

            {/* EVERY RUN FEE GETS ITS OWN ROW (Pavan, 2026-09-22). "2 on this
                order" was a count where the reader wanted the two: what they
                are and what each comes to. The Type column already names a
                charge, so a fee's label is simply the name of its row, and the
                partner has no opposite number for any of them. */}
            {draft.orderFees.map((f, k) => (
              <React.Fragment key={k}>
                <PricingTypeCell label={f.label || f.type} />
                <PricingCell
                  blinkGroupName={VENDOR_COST_COLUMN_ID}
                  padL={PRICE_PAD_L}
                  padR={PRICE_PAD_R}
                  note="NA"
                  total=""
                />
                <PricingCell
                  padL={PRICE_PAD_L}
                  padR="pr-4"
                  note={f.type === "Discount" ? "Discount" : undefined}
                  total={money(
                    f.type === "Discount" ? -(f.amount || 0) : f.amount || 0
                  )}
                />
              </React.Fragment>
            ))}
          </>
        )}

        {/* ── THE TOTALS, UNDER THE COLUMNS THEY TOTAL ───────────────── */}
        {/* In the table rather than in the bar at the foot of the sheet: a
            column's total belongs at the bottom of that column, on the same
            grid as the figures above it. The bar keeps the comparison. */}
        <div className="flex min-w-0 items-center border-y border-border bg-fp-surface-1a px-4 py-3 lg:pr-6">
          <span className="text-sm font-medium text-foreground">Total</span>
        </div>
        <div className="flex min-w-0 items-center border-y border-border bg-fp-surface-1a px-4 py-3 lg:border-l lg:border-border lg:px-4">
          <span className="text-sm text-muted-foreground">
            {shownQuote && draft.vendorId !== shownVendorId ? "Estimated" : ""}
          </span>
        </div>
        <div
          data-blink={VENDOR_COST_COLUMN_ID}
          className="flex items-baseline justify-end border-y border-border bg-fp-surface-1a px-4 py-3 lg:border-l lg:border-border lg:px-6"
        >
          <span className="text-base font-semibold tabular-nums text-foreground">
            {money(carrierTotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-end border-y border-border bg-fp-surface-1a px-4 py-3 lg:border-l lg:border-border lg:pr-4 lg:pl-6">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {money(billed)}
          </span>
        </div>
      </div>

    </SheetSection>

    {/* ── ADDITIONAL FEES ────────────────────────────────────────────────
        ITS OWN SECTION, BECAUSE IT IS ITS OWN LIST. Everything in Pricing is
        charged on what is in the tank and is therefore per gallon and per
        product. An after-hours callout, a split delivery, a wait — none of
        those care what the fuel is, and they are charged ONCE for the run.
        (Pavan, 2026-09-22.)

        FLUSH, WITH THE ADD HANGING OFF IT — DS ui §10f, the same unit as the
        Delivery Order table above. Inside the Pricing card it was a box in a
        box, and under the three totals its heading read as a charge belonging
        to the column above it.

        TYPE, LABEL, AMOUNT, ACT (Pavan, 2026-09-22 — from the product's own
        table). The TYPE is the handful of things a run-level line can be, and
        a Discount really does come off the bill. The LABEL is which one of
        them it is: offered from `ORDER_FEE_LABELS`, because "After hours",
        "after-hours" and "AH callout" are three fees to a report and one to a
        person — and still typeable, because no list foresees every customer's
        arrangement. The AMOUNT is a flat figure; there is no rate per gallon
        down here, which is the whole reason these are not upstairs. */}
    <SheetSection
      title="Additional fees"
      flush
      hanging={<HangingAdd label="Add fee" onClick={addFee} />}
      note={
        <SheetSectionNote label="What belongs here">
          A fee that is charged on the product — a pump fee on the diesel, a
          duty on the DEF — is per gallon and belongs on that product in
          Pricing. What is left is charged once for the run whatever is on the
          truck, and that is this list.
        </SheetSectionNote>
      }
    >
      <table className="w-full table-fixed border-collapse">
          {/* FOUR COLUMNS — type, label, amount, act. The type is the handful
              of things this line can BE and the label is which one of them it
              is; one column carrying both would have to list every fee crossed
              with every direction. */}
          {/* TYPE IS NEARLY AS WIDE AS LABEL (Pavan, 2026-09-22). At 150px it
              was a sliver beside a column running half the table, and a select
              in a sliver reads as a fragment of the row rather than as the
              first thing about it. The two questions are the same size; so are
              their columns. */}
          <colgroup>
            <col className="w-[40%]" />
            <col />
            <col className="w-[160px]" />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Type</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Label</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-right">
                <TableRequiredLabel>Amount</TableRequiredLabel>
              </th>
              {/* UNNAMED, LIKE EVERY OTHER ROW REMOVE — DS ui §10f. A named
                  column held its bin in view on every row, which made this the
                  one table whose delete shouted. */}
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {draft.orderFees.length === 0 && (
              <tr className="h-11">
                <td colSpan={4} className="px-3 text-sm text-muted-foreground">
                  No fees on this order beyond the products.
                </td>
              </tr>
            )}
            {draft.orderFees.map((f, i) => (
              <tr
                key={i}
                className="group/row h-11 border-b border-border last:border-b-0"
              >
                <td className="relative p-0">
                  <TableCellSelect
                    value={f.type}
                    options={[...ORDER_FEE_TYPES]}
                    aria-label={`Type for row ${i + 1}`}
                    onChange={(v) => setFee(i, { type: v as OrderFeeType })}
                  />
                </td>
                {/* PICK IT OR TYPE IT. The list is what the business already
                    charges; the field stays open because no list foresees
                    every customer's arrangement. */}
                <td className="relative p-0">
                  <TableCellCombobox
                    value={f.label}
                    options={ORDER_FEE_LABELS}
                    creatable
                    /* The same charge on two rows is one charge billed twice. */
                    taken={draft.orderFees.map((x) => x.label)}
                    placeholder="Enter label"
                    /* THE CURSOR GOES TO THE FIRST ANSWER, not the first
                       column — a new fee's type is already "Fee". */
                    autoFocus={i === focusFee}
                    aria-label={`Label for row ${i + 1}`}
                    onChange={(v) => setFee(i, { label: v })}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    value={f.amount ? String(f.amount) : ""}
                    placeholder="0.00"
                    numeric
                    prefix="$"
                    aria-label={`Amount for row ${i + 1}`}
                    onChange={(v) =>
                      setFee(i, {
                        amount: Number(v.replace(/[^0-9.]/g, "")) || 0,
                      })
                    }
                  />
                </td>
                <td className="relative p-0 text-center">
                  <TableRowRemove
                    aria-label={`Remove ${f.label || `fee ${i + 1}`}`}
                    onRemove={() => removeFee(i)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {/* THE TOTAL IS A ROW OF THE TABLE, on the same grid as the figures
              it sums — and only once there is something to add. */}
          {draft.orderFees.length > 0 && (
            <tfoot>
              <tr className="h-11 border-t border-border bg-fp-table-header">
                <td
                  colSpan={2}
                  className="px-3 text-right text-sm text-muted-foreground"
                >
                  Total
                </td>
                <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                  {money(runFees)}
                </td>
                <td aria-hidden />
              </tr>
            </tfoot>
          )}
        </table>
    </SheetSection>

    {/* ── THE BAR THE WHOLE UNIT EXISTS TO PRODUCE ──────────────────────
        ONLY THE BAR IS LEFT DOWN HERE (Pavan, 2026-09-22). What belongs to no
        product, and each column's own total, went back INTO the table, under
        the columns they are about — a column's total belongs at the bottom of
        that column, on the same grid as the figures above it. What is left is
        the comparison: cost against revenue against what is between them, and
        that is no column's own.

        IT SITS BELOW ADDITIONAL FEES, because the customer figure INCLUDES
        them and a total that stands above half of what it counts is a total
        the reader has to take on trust.

        IT IS SCOPED TO THE PRICING PAIR. Pricing, Additional fees and this are
        one `flex flex-col` — so the bar pins from the moment Pricing arrives
        and releases at the end of the fees, rather than hanging over the whole
        sheet the way a child of the body would.

        EDGE TO EDGE AND NO SHADOW. `-mx-4` cancels the sheet body's padding so
        the bar runs the full width of the sheet, and `-bottom-4` pins it past
        the body's bottom padding — otherwise that 16px is a gap for the next
        row of figures to show through. A top rule says it is pinned; a shadow
        under a full-bleed bar reads as a second edge.

        A SURFACE OF ITS OWN — `bg-fp-card-1`, the DS's raised/inset step
        (Pavan, 2026-09-22). It was `bg-popover`, which is the SHEET's own
        fill: opaque, so nothing scrolled through it, but identical to the
        ground behind it — so while it was pinned there was nothing to say it
        was pinned, and the top rule read as one more row rule in a sheet full
        of them. `--fp-card-1` steps AWAY from the content layer in both
        themes — lighter in dark, darker in light — so the bar reads as a
        layer over the form rather than as part of it.

        FIGURES ONLY. It was a banner with a sentence and a percentage in it,
        which is a paragraph where a reader wants a row of numbers. Equal
        thirds, with the profit's figure flush to the right edge so the row
        spans the bar instead of trailing off before it does. */}
    {shownQuote && (
      <div className="sticky -bottom-4 z-10 -mx-4 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border bg-fp-card-1 px-4 py-3 lg:grid-cols-3">
        {[
          { label: "Vendor pricing", value: carrierTotal },
          { label: "Customer pricing", value: billed },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-sm font-medium tabular-nums text-foreground">
              {money(f.value)}
            </span>
          </div>
        ))}
        <div className="flex flex-col gap-0.5 lg:items-end lg:text-right">
          <span className="text-xs text-muted-foreground">Expected profit</span>
          {/* THE SIGN IS THE COLOUR. This is the one figure on the bar that
              can be bad news, and "bad" here is not a shade of the same thing
              — a negative expected profit is the order costing money to run.
              Exactly zero takes neither, since it is neither. */}
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              margin < 0
                ? "text-destructive"
                : margin > 0
                  ? "text-status-success"
                  : "text-foreground"
            )}
          >
            {money(margin)}
          </span>
        </div>
      </div>
    )}
    </div>
  );

  return (
    <RecordSheet
      /* ONE WIDTH, BECAUSE THERE IS ONE PAGE. The rail costs the form 340px
         plus a gap, and the pricing tables at the foot of it run to eight
         columns — at anything narrower their headers wrap onto two lines and
         stop lining up with the figures under them. */
      size="xxwide"
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
          /* NOT GREEN. Green is a STATUS colour and this line is not reporting
             one — the stage bar two inches below already says Assigned, in the
             one place on the sheet built to say it. A second coloured claim
             about the same fact reads as a second fact. Muted, it is what it
             is: a name, on the bar, where the reader can see it from any part
             of the form. */
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 shrink-0" />
            <span className="truncate">
              {/* A COLON, NOT A DASH. The dash was joining two halves as
                  though they were an aside; this is a label and its value. */}
              {/* AWARDED, THEN CONFIRMED — the bar says which of the two
                  this order has reached, because between them the choice can
                  still be changed. */}
              {confirmed ? "Confirmed" : "Finalized"}:{" "}
              {vendorById(draft.vendorId)?.name} holds this order.
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
              {/* COPY IT, PRINT IT — what is left to do once the order itself
                  is settled. They were two outline buttons at the foot of the
                  form, which put them in the reading path of somebody filling
                  it in; neither is ever the next act, so neither belongs in the
                  flow OR in the footer. Behind the ··· they are where a reader
                  goes looking for a spare act on the record. */}
              <DropdownMenuItem
                onSelect={() =>
                  toast.success("Order duplicated", {
                    description: "A copy has been created as a Draft.",
                  })
                }
              >
                <Copy />
                Duplicate order
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  toast.success("Tickets downloading", {
                    description: `Delivery tickets for ${order.orderNo}.`,
                  })
                }
              >
                <Download />
                Download tickets
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
      /* NO ACTIVITY ICON, AND NO DRAWER BEHIND IT. Activity was a drawer
         because it is the longest block on the order and the one read least
         often, and at the foot of the body it pushed everything else behind a
         wall of "field changed" lines. The rail card answered that: the
         history is in the column that never leaves, beside the summary, where
         it is read without being opened. A button that opened a second copy of
         what is already on screen is a control whose only outcome is a copy. */
      onSubmit={() => {
        if (creating) onCreate?.(draft);
        else if (order) onSave(order, draft);
      }}
      /* THE SHEET SAVES ITSELF. The header already says "Draft saved" as you
         type, and a Save button beside a line claiming the work is already kept
         is the sheet arguing with itself — one of the two has to be wrong and
         the reader cannot tell which. What the footer carries instead is the
         one act that actually moves the order on from where it is. */
      /* THE STRIP IS FOR EVERY STAGE, not just Draft (Pavan, 2026-09-22 —
         "where did the pending bar go?").

         IT WAS SHOWING ONLY WHILE THE ORDER WAS A DRAFT, on the argument that
         past creation the mandatory list is spent. True of that list — but not
         of the strip, whose job is to say what is standing between the reader
         and the act in the footer. Past Draft that is the next act's own
         reason, and it was being said in grey text beside the button instead:
         the same sentence in a weaker place, with nothing to press.

         THE STRIP TAKES YOU THERE. Every reason past Draft is about the
         partner table — awarding one, or waiting on their price — so that is
         where its press goes. */
      footerBanner={
        draft.status === "Draft" ? (
          <PendingStrip
            pending={pendingSteps}
            clearLabel="All mandatory steps completed"
          />
        ) : nextActBlocked ? (
          <PendingStrip
            pending={[
              {
                key: "next",
                label: nextActBlocked,
                target: VENDOR_SECTION_ID,
              },
            ]}
          />
        ) : undefined
      }
      footerPrimary={
        awaitingQuotation ? (
          <span className="text-sm text-muted-foreground">
            Awaiting quotation
          </span>
        ) : awaitingCompletion ? (
          /* THE SAME SHAPE AS AWAITING QUOTATION, and for the same reason:
             the next thing that happens is a truck arriving, not a press. */
          <span className="text-sm text-muted-foreground">
            Awaiting completion
          </span>
        ) : awaitingAccounting ? (
          <span className="text-sm text-muted-foreground">
            Awaiting accounting
          </span>
        ) : (
        /* THE REASON IS NOT REPEATED HERE. It is on the strip above the
           footer, where it is a sentence you can press rather than a grey note
           you cannot. */
        <div className="flex items-center gap-2">
          {sheetActs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sheetActs.map((a) => (
                  <DropdownMenuItem key={a.label} onSelect={a.onSelect}>
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button disabled={nextActOff} onClick={nextAct.onSelect}>
            {nextAct.label}
          </Button>
        </div>
        )
      }
      /*
        THE STRIP SAYS WHERE THE ORDER IS, not which half of the form you are
        reading. "1 Order, 2 Quotes & pricing" was a table of contents in the
        one place on the sheet everybody looks first, and the fact it displaced
        — how far along is this — was only available by reading the chip beside
        the title and knowing the lifecycle by heart.

        IT DOES NOT NAVIGATE. One page means a stage has no screen of its own
        to open, and a bar that looked pressable and moved nothing would be
        worse than one that plainly does not.
      */
      steps={
        !creating ? (
          <StageBar
            className="-mx-4 px-4 py-2.5"
            stages={ORDER_STAGES}
            current={stageOf(draft.status)}
          />
        ) : undefined
      }
    >
        {/* ── TWO COLUMNS: WHAT YOU FILL IN, AND WHAT THAT MAKES ───────────
            One rule decides which side a card is on: can you type into it?
            The order's parts go left, in the sequence you fill them. What the
            order HAS BECOME goes right — derived, read-only, true whether or
            not anyone is looking. Once an editable number and a computed one
            share a column they look identical, and the reader stops knowing
            which is which. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-10">
      {/* §5.2 — a blocked order is blocked for a REASON, and the reason is what
          the broker has to act on. It leads the sheet rather than hiding in a
          field. `soft`/destructive treatment per the DS's noticing rule. */}
      {order?.blockedReason && (
        /* AN EVEN CHANNEL ROUND THE BANNER. The column's 40px rhythm below it
           and the body's own 16px above made it read as attached to the header
           and detached from the form it is about; the negative margin pulls the
           gap below back to the 16 above it. A WRAPPER WOULD NOT DO — it has to
           be a sibling of the sections to sit in their column at all, and a
           wrapper round the banner alone changes nothing about the gap after
           it. */
        <div className="-mb-6 flex items-start gap-2 rounded-md border border-status-failed/30 bg-status-failed/10 p-3">
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

      {/* A FAILED SYNC LEADS THE SHEET, like a credit hold: the accounting
          system's own message is the useful part and must not be buried. */}
      {draft.status === "Partially Synced" && (
        <div className="-mb-6 flex items-start gap-2 rounded-md border border-status-failed/30 bg-status-failed/10 p-3">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-failed" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              Accounting sync failed
            </span>
            <span className="text-sm text-muted-foreground">
              {draft.syncError ?? "No message returned."}
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
      {!locked && (
        <>
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

      <SheetSection id={SECTION_BASICS} title="Basic Details">
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
        </div>

        {/* A RULE BETWEEN THE TWO ROWS (Pavan, 2026-09-17), with 12px either
            side. They are different questions — WHEN this one goes out, then
            whether it goes out again — and four controls in one grid read as
            one block of four.

            IT SPLITS THE GRID RATHER THAN SITTING IN IT. A full-width row
            inside the grid cannot be 12 from both neighbours: the tracks are
            laid out on the 16px gap and a negative margin moves the rule
            within its track rather than moving the row after it, so it lands
            12 above and 20 below. Between two grids, in the section's flex
            column, the margin pulls both ways and 12/12 is what it is. */}
        <div className="-my-1 h-px bg-border" aria-hidden />

        <div className="grid grid-cols-9 gap-4">
          {/* A CHECKBOX, NOT A YES/NO LIST (Pavan, 2026-09-17). Opening a menu
              to choose between Yes and No is two gestures to say one thing, and
              the field had to carry a label as well as the word "No" to be read
              at all. Ticked or not is the whole question.

              THE LABEL IS THE CONTROL'S, so the field carries none — and no
              asterisk: a box that is off is answered, not empty. The 26px lifts
              it onto the line of the inputs beside it (label 20 + the field
              gap), so a row of controls still reads as one row. */}
          <SheetField className="col-span-4">
            <label className="mt-[26px] flex h-9 w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
              <Checkbox
                checked={draft.recurring}
                onCheckedChange={(v) => {
                  const on = v === true;
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
              />
              Recurring Order
            </label>
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
        </>
      )}

      {/* §5.20 — movement orders show Asset instead of the product sections, and
          the asset is FIXED once the order is created. Read-only is the honest
          rendering of a field that cannot be changed. */}
      {isMovement && order?.movement && (
        /* THE SAME ANCHOR AS THE LINES TABLE. A movement shows its one asset
           here instead of a Delivery Order table — same slot, same question,
           so a pending step that says "add the asset" lands in the right place
           whichever kind of order this is. */
        <SheetSection id={SECTION_LINES} title="Asset">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Direction">
              <Input value={order.movement.direction} disabled />
            </SheetField>
            <SheetField label="From">
              <Input value={order.movement.from} disabled />
            </SheetField>
            <SheetField label="To">
              <Input value={order.movement.to} disabled />
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
      {!locked && (
        <>
      {!isMovement && (
        <SheetSection
          id={SECTION_LINES}
          title="Delivery Order"
          flush
          /* THE ADD HANGS OFF THE CARD — DS ui §10f. It was the table's last
             band, sharing the strip with the winter flag; the band read as an
             empty extra row and the flag is not an act on the list. */
          hanging={
            <>
              <HangingAdd label="Add asset" onClick={addBlankLine} />
              {/* WINTER ADDITIVE IS A PROPERTY OF THE LOAD, not of a row —
                  every gallon on the truck is blended or none is — so it is
                  not in the table. It rides the hanging row's right end:
                  outside the card, nothing drawn around it, level with the
                  add rather than stacked under it. (Pavan, 2026-09-22.) */}
              <label
                htmlFor="winter-additive"
                className="flex cursor-pointer items-center gap-2.5 pr-1 text-sm text-foreground"
              >
                Mark as winter additive
                <Switch
                  id="winter-additive"
                  checked={draft.winterAdditive}
                  onCheckedChange={(c) => set("winterAdditive", c)}
                />
              </label>
            </>
          }
        >
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
                            autoFocus={i === focusLine && Boolean(draft.shipTo)}
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
                            /* With no ShipTo the asset cell is shut, so the
                               product is the first cell that can be filled. */
                            autoFocus={i === focusLine && !draft.shipTo}
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
                        <td className="relative p-0 text-center">
                          <TableRowRemove
                            aria-label={`Remove ${line.asset || `asset line ${i + 1}`}`}
                            disabled={draft.lines.length === 1}
                            onRemove={() => removeLine(i)}
                          />
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
        </>
      )}

      {/* ══ ONCE IT IS SOMEBODY'S TO RUN, IT IS A RECORD ══════════════════
          (Pavan, 2026-09-22.) From Assigned on, everything that made the
          order — what it is, who it is for, when, what is on the truck, who
          loads it — has been sent to a partner who is acting on it. Changing
          any of it here would change a job already in somebody else's hands
          without telling them.

          SO IT IS NOT A DISABLED FORM. A greyed-out field still looks like a
          control and still invites the press that says no; these are drawn as
          facts because that is what they are. Only Pricing stays editable —
          what the customer is billed is the broker's own business and is
          settled after the truck has been. */}
      {locked && (
        <>
          <SheetSection title="Order">
            <FactGrid>
              <Fact label="Job type">{draft.jobType}</Fact>
              <Fact label="Order type">{draft.orderType}</Fact>
              <Fact label="Customer">
                {draft.customer || NOT_SET}
                {draft.erpId && (
                  <span className="block text-xs text-muted-foreground">
                    {draft.erpId}
                  </span>
                )}
              </Fact>
              <Fact label="PO number">{draft.poNumber || NOT_SET}</Fact>
              <Fact label="Ship-to" wide>
                {draft.shipTo || NOT_SET}
                {site && (
                  <span className="block text-xs text-muted-foreground">
                    {site.street}, {site.city}, {site.state} {site.zip}
                  </span>
                )}
              </Fact>
              <Fact label="Hub">{draft.hub || NOT_SET}</Fact>
              <Fact label="Urgent">{draft.urgent ? "Yes" : "No"}</Fact>
              <Fact label="Tags" wide>
                {draft.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {draft.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  NOT_SET
                )}
              </Fact>
            </FactGrid>
          </SheetSection>

          <SheetSection title="Contacts">
            <FactGrid>
              <Fact label="Point of contact" wide>
                {draft.primaryPoc || NOT_SET}
                {poc && (
                  <span className="block text-xs text-muted-foreground">
                    {poc.phone} · {poc.email}
                  </span>
                )}
              </Fact>
              <Fact label="Second contact" wide>
                {draft.secondaryPoc ? (
                  <>
                    {draft.secondaryPoc}
                    {poc2 && (
                      <span className="block text-xs text-muted-foreground">
                        {poc2.phone} · {poc2.email}
                      </span>
                    )}
                  </>
                ) : (
                  NOT_SET
                )}
              </Fact>
              <Fact label="Salesperson">{draft.salesperson || NOT_SET}</Fact>
              <Fact label="Signature on delivery">
                {draft.signatureOnDelivery ? "Required" : "Not required"}
              </Fact>
            </FactGrid>
          </SheetSection>

          <SheetSection title="Schedule">
            <FactGrid>
              <Fact label="Planned delivery">
                {draft.plannedDate ? DATE_FMT.format(draft.plannedDate) : NOT_SET}
              </Fact>
              <Fact label="Delivery window">
                {draft.windowStart} – {draft.windowEnd}
              </Fact>
              <Fact label="Recurring">
                {draft.recurring ? draft.recurrenceFrequency || "Yes" : "No"}
              </Fact>
            </FactGrid>
          </SheetSection>

          {/* THE TABLE STAYS A TABLE. What was ordered is read down a column,
              and turning four lines into a paragraph of facts would be the
              one place this view made something harder to read. */}
          <SheetSection title="Delivery order" flush>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  {["Asset", "Product", "Quantity"].map((h, k) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2 text-left text-xs font-medium text-muted-foreground",
                        k === 2 && "text-right"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.lines.filter((l) => l.asset).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-4 text-center text-sm text-muted-foreground"
                    >
                      No lines on this order.
                    </td>
                  </tr>
                ) : (
                  draft.lines
                    .filter((l) => l.asset)
                    .map((l, i) => (
                      <tr
                        key={`${l.asset}-${i}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2.5 text-foreground">
                          {l.asset}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {l.product}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                          {l.topOff
                            ? "Top off"
                            : `${(l.gal ?? 0).toLocaleString()} gal`}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-fp-table-header">
                  <td
                    colSpan={2}
                    className="px-3 py-2.5 text-sm font-medium text-foreground"
                  >
                    Total
                    {draft.winterAdditive && (
                      <Badge variant="secondary" className="ml-2 font-normal">
                        Winter additive
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-foreground">
                    {totalGal(draft.lines).toLocaleString()} gal
                  </td>
                </tr>
              </tfoot>
            </table>
          </SheetSection>

          <SheetSection title="Load order" flush={Boolean(loadRows)}>
            {!loadRows ? (
              <p className="text-sm text-muted-foreground">
                No load order — the partner sources the product.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    {["Product", "Terminal", "Supplier", "Loading account"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loadRows.map((r) => (
                    <tr
                      key={r.product}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2.5 text-foreground">
                        {r.product}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.terminal || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.supplier || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.loadingAccount || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SheetSection>
        </>
      )}



      {/* ── The 3PL section. Everything above exists on a first-party order
             too; this is what makes the order brokered. ─────────────────── */}
      <SheetSection
        id={VENDOR_SECTION_ID}
        title="Vendor"
        flush
        action={vendorSettled ? undefined : partnerMenu}
        /* THE ADD HANGS OFF THE CARD — DS ui §10f. A BLOCK STOPS SENDING, NOT
           BUILDING THE LIST: lining up the partners you will ask is exactly
           the work worth doing while accounts clear the hold, so the block
           gates `sendInvitations` and not this. */
        /* NOTHING TO ADD IN DRAFT — every eligible partner is already on the
           table, so an "Add vendor" would be offering a row for somebody who
           is not eligible. Past Draft the list is the chosen few again and
           the add comes back. */
        hanging={
          !vendorSettled && !isPicking ? (
            <HangingAdd
              label="Add vendor"
              disabled={uninvited.length === 0}
              onClick={addPartnerRow}
            />
          ) : undefined
        }
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
        {!vendorSettled && (
          <>
            {/* WHAT CHANGED, ABOVE THE TABLE IT CHANGED. The quotes on the
                rows below were given for a shorter order, and nothing on a row
                can say why on its own — the reason is something that happened
                to the ORDER, three sections up. It sits directly under the
                section's name because that is the first thing read on the way
                into the table, and it is tinted because a line of text at the
                top of a card is otherwise read as a caption.

                Soft, not solid: nothing is wrong and nothing is blocked. The
                partners simply have to be told. */}
            {hasStaleQuotes && (
              /* FLUSH, LIKE THE TABLE UNDER IT. Inset and rounded, it was a
                 card inside a card — a second box with its own corners sitting
                 in a section that already has them, and 16px of nothing
                 holding it away from the edges its message is about. Square
                 and edge to edge it is a BAND of the unit: the section's own
                 border is its left and right, and its one remaining rule is
                 the boundary with the table's header. Same 16px inset as the
                 rows below, so the icon starts on the column the checkboxes
                 do. */
              <BannerCallout
                variant="soft"
                status="caution"
                title="New products added"
                className="rounded-none border-x-0 border-t-0 px-4 py-2.5"
              >
                Share the updated details with the partners so they can revise
                and resend their quotations.
              </BannerCallout>
            )}

{isPicking ? (
          <>
            {/* ───────────────────────────────────────────── DRAFT ─────── */}
            {/* EVERY ELIGIBLE PARTNER, AT ONCE. (Pavan, 2026-09-22.) Building
                the list a row at a time asked the reader to already know who
                they wanted — the picker only told them once they had opened
                it, one name at a time, and there was no way to compare two
                partners without adding both. The same shape the recurring
                rule's partner table uses, and for the same reason: this is the
                biggest decision on the form and the things that decide it are
                facts about each partner, side by side.

                FOUR COLUMNS AND NO MORE IN DRAFT. Nothing has been asked yet,
                so there is no price to show and no status to report — TLC and
                Status arrive with the quotes, in the stages after this one. */}
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-fp-table-header">
                    <th className="w-11 px-3 py-2.5">
                      <Checkbox
                        aria-label="Select every partner"
                        checked={
                          draftPicked.length === pickerRows.length &&
                          pickerRows.length > 0
                        }
                        onCheckedChange={(v) =>
                          setSelected(
                            v === true
                              ? new Set(pickerRows.map((x) => x.id))
                              : new Set()
                          )
                        }
                      />
                    </th>
                    {/* DISTANCE IS A NARROW COLUMN, NOT A WIDE ONE (Pavan,
                        2026-09-22). It held every pixel the table had left
                        over, so "12 mi" floated a third of the width away from
                        the address it belongs to and pressed against the acts
                        it has nothing to do with. Fixed at the width of the
                        figure; the ADDRESS takes the slack, being the only
                        column here whose content actually varies in length. */}
                    {["Partner", "Address", "Distance"].map((h, k) => (
                      <th
                        key={h}
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground",
                          k === 1 && "w-full",
                          k === 2 && "w-[84px] text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                    {/* THE ACTS GET THE ROOM THE DISTANCE GAVE BACK. Two
                        controls side by side on a priced row, and squeezed
                        they wrapped or truncated the only words on the row
                        that say what pressing them does. */}
                    <th className="w-[280px] px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(isDraft ? pickerRows : inRound).map(partnerRow)}
                </tbody>
                {/* ── THE FOLD ──────────────────────────────────────────── */}
                {/* TWO GROUPS ONCE THE ROUND IS OUT. (Pavan, 2026-09-22.) The
                    partners who are IN it — a price back or still to come —
                    are what the reader opened the order for. Everyone else is
                    a decision they have probably already made, so it folds
                    away and opens when widening the net is the actual job.

                    IN DRAFT THERE IS NO FOLD: nobody is in the round yet, so
                    every partner is equally the question. */}
                {!isDraft && available.length > 0 && (
                  <tbody>
                    <tr className="border-t border-border">
                      <td colSpan={5} className="p-0">
                        <button
                          type="button"
                          aria-expanded={showMorePartners}
                          onClick={() => setShowMorePartners((o) => !o)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-fp-row-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              showMorePartners && "rotate-180"
                            )}
                          />
                          Invite more partners
                          <span className="tabular-nums">
                            · {available.length}
                          </span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                )}
                {!isDraft && showMorePartners && (
                  <tbody>{available.map(partnerRow)}</tbody>
                )}
                <tbody className="hidden">
                </tbody>
              </table>
            </div>

            {/* THE BULK ACT, and only while something is ticked — the boxed
                table unit's acts band (DS ui §10f). One press for the whole
                selection, because inviting six partners one row at a time is
                six presses to make one decision. */}
            {draftSendable.length > 0 && (
              <div className="flex items-center justify-end border-t border-border px-3 py-2">
                <Button
                  size="sm"
                  disabled={draft.status === "Blocked"}
                  title={
                    draft.status === "Blocked"
                      ? "A blocked order cannot be sent to a vendor"
                      : undefined
                  }
                  onClick={() => openInvite(draftSendable)}
                >
                  Invite &amp; request quote
                  {draftSendable.length > 1 ? ` · ${draftSendable.length}` : ""}
                </Button>
              </div>
            )}
          </>
        ) : (
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
                    <col className="w-[150px]" />
                    {/* 132, not 148: the status lost its dot and the 14px it
                        stood in, and Products is the column that pays for
                        every fixed one beside it. */}
                    <col className="w-[132px]" />
                    <col className="w-[96px]" />
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
                      {/* TOTAL LANDING COST, ALWAYS A COLUMN — the reason the
                          reader is looking at this table at all. It is what
                          the partner would charge to land this order: the
                          quote's base plus freight, fees and taxes, the same
                          figure `Vendor Pricing` totals further down.

                          THE COLUMN IS THERE BEFORE THE NUMBER IS. It used to
                          appear only while the order was in Quoting and a quote
                          had been asked for, so the table changed shape under
                          the reader as partners replied. A column that is
                          always present says what this table is FOR, and an
                          em-dash says the partner has not priced it yet. */}
                      {/* LEFT, LIKE EVERY OTHER COLUMN HERE. A money column
                          usually right-aligns so the decimal points stack and
                          the figures can be scanned against each other — but
                          this table's other five columns are left-aligned text,
                          and one column setting its own rule broke the line the
                          eye follows down the table. It is a handful of rows,
                          not a ledger; reading WITH the row beats comparing
                          down it. */}
                      <th
                        className="px-3 py-2.5 text-left"
                        title="Total landing cost — what this partner would charge to land the order"
                      >
                        <TableRequiredLabel>TLC</TableRequiredLabel>
                      </th>
                      {/* STATUS, NOT "INVITE". The column started as one button
                          per row and grew a ladder behind it — invited,
                          accepted, priced — so it is a state the row reports,
                          and only the first rung is an action. Naming it for
                          the action described one quarter of what it shows.

                          INVITING IS STILL PER ROW. It was one button under the
                          table that sent to everybody at once, which is wrong
                          the moment two vendors are listed and only one is
                          ready — and it disappeared entirely once the order
                          left Draft, taking the ability to add a vendor later
                          with it. */}
                      <th className="px-3 py-2.5 text-left">
                        <TableRequiredLabel>Status</TableRequiredLabel>
                      </th>
                      {/* AWARD HAS NO HEADING. A column of buttons is named by
                          the buttons in it, and "Award" over Award is the word
                          twice. Status is a fact the row reports; this is the
                          one act the row offers, which is why it is beside it
                          rather than in it. */}
                      <th aria-hidden />
                      <th aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {partnerRows.length === 0 ? (
                      <tr className="h-11">
                        <td
                          colSpan={8}
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
                            key={`${id}-${i}${focusPartner?.row === i ? `-f${focusPartner.n}` : ""}`}
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
                                autoFocus={focusPartner?.row === i}
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
                                /* SEVERAL AT ONCE, BUT ONLY FROM A BLANK ROW.
                                   On an empty row "these five" is a sensible
                                   thing to say and it fills five rows. On a row
                                   that already names a partner the question is
                                   "which one instead", and a list that could
                                   answer it with three would be replacing one
                                   row with three under a reader who asked to
                                   change one. */
                                multiple={
                                  v
                                    ? undefined
                                    : {
                                        /* Looked up across every partner, not
                                           just the eligible ones: the list can
                                           only offer names it was given, and a
                                           lookup narrower than the list is how
                                           a pick silently resolves to nothing. */
                                        onApply: (names) =>
                                          applyPartnersAt(
                                            i,
                                            names
                                              .map((n) => vendorByName(n)?.id)
                                              .filter((x): x is string => Boolean(x))
                                          ),
                                      }
                                }
                              />
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {v?.base ?? "—"}
                            </td>
                            <td className="truncate px-3 text-sm text-muted-foreground">
                              {v ? v.businessLines.join(" · ") : "—"}
                            </td>
                            {/* THE COST ARRIVES LAST. A partner has to take the
                                order before it can price it, so until then the
                                cell is NA — not a dash, which reads as "none",
                                and not "$0.00", which reads as free. Disabled
                                text, because there is nothing here to act on
                                yet; the tooltip says what it is waiting for.

                                PRICED, IT IS A DOOR. The figure is one number
                                standing for a rate and a margin on every
                                line plus the charges on the run — enough to
                                compare partners on and not enough to accept
                                one on, so it is underlined and opens the
                                working. */}
                            <td className="px-3 text-left text-sm tabular-nums">
                              {quote ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuoteSheet({ vendorId: id, mode: "review" })
                                  }
                                  className="rounded-sm text-foreground underline decoration-border underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                  {money(quoteTotal(quote, draft.lines, chargesBase))}
                                </button>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-default text-muted-foreground/60">
                                      NA
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Awaiting quotation</TooltipContent>
                                </Tooltip>
                              )}
                            </td>
                            {/* FOUR RUNGS, and the row says which it is on: no
                                partner yet, not asked, asked, taken, priced.
                                Only the first rung is an action — the rest are
                                things the partner did, reported back.

                                THE TONES CLIMB. Invited is neutral because
                                nothing has happened yet — and past Draft it is
                                not "Invited" any more but "Awaiting quote",
                                which IS in flight; Accepted is in flight;
                                a shared quotation is the one state that hands
                                the reader something to act on. Three chips that
                                all read "in progress" ranked nothing. */}
                            <td className="px-3">
                              {!id ? (
                                <span className="text-sm text-muted-foreground">—</span>
                              ) : quote && !quoteCoversOrder(quote) ? (
                                /* THE ROW SAYS THE QUOTE IS BEHIND THE ORDER.
                                   "Quotation shared" is still true and is now
                                   the wrong thing to say: what the reader has
                                   to know is that it prices lines the order no
                                   longer only has. */
                                <StatusChip tone={kindTone("caution")} variant="text">
                                  Products updated
                                </StatusChip>
                              ) : quote ? (
                                <StatusChip tone={kindTone("caution")} variant="text">
                                  Quotation shared
                                </StatusChip>
                              ) : draft.acceptedVendorIds.includes(id) ? (
                                <StatusChip tone={kindTone("caution")} variant="text">
                                  Accepted
                                </StatusChip>
                              ) : sentIds.includes(id) ? (
                                <StatusChip tone={invitedTone} variant="text">
                                  {invitedWord}
                                </StatusChip>
                              ) : (
                                /* TWO WAYS TO ASK, AND THE SECOND IS NOT A
                                   SECOND BUTTON. Inviting is the common act
                                   and keeps the press; asking for a price with
                                   it is the same act with one more thing in
                                   the envelope, so it hangs off the same
                                   control. A plain Invite beside an Invite and
                                   request quote of equal weight would make the
                                   reader choose before they know they had a
                                   choice.

                                   The quote request is the ROUND's — there is
                                   no per-partner flag on the order — so this
                                   turns it on and sends in one press. */
                                <span className="inline-flex items-center">
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
                                    className="rounded-r-none border-r-0"
                                  >
                                    <Check /> Invite
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={draft.status === "Blocked"}
                                        aria-label={`More ways to invite ${v?.name ?? `row ${i + 1}`}`}
                                        className="rounded-l-none px-1"
                                      >
                                        <ChevronDown />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-60">
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          set("quoteRequested", true);
                                          sendInvitations([id]);
                                        }}
                                      >
                                        <Check />
                                        Invite and request quote
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </span>
                              )}
                            </td>
                            {/* AWARDING IS A PRICED PARTNER'S ROW ONLY. The
                                award is the broker taking one of the prices in
                                front of them; a partner that has not sent one
                                has nothing to be taken. The awarded row states
                                it instead of offering it, and every other
                                priced row keeps its button, so the choice can
                                be changed right up until it is confirmed. */}
                            <td className="px-3">
                              {id && quote && !quoteCoversOrder(quote) ? (
                                /* NOT AWARD. Awarding a price that does not
                                   cover the order is buying the wrong thing;
                                   the act here is telling the partner what
                                   changed so they can price it again. */
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled={draft.status === "Blocked"}
                                  onClick={() => resendInvitation(id)}
                                >
                                  Resend invite
                                </Button>
                              ) : id && quote ? (
                                draft.vendorId === id ? (
                                  <StatusChip tone={kindTone("success")} variant="soft">
                                    Finalized
                                  </StatusChip>
                                ) : (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={draft.status === "Blocked"}
                                    title={
                                      draft.status === "Blocked"
                                        ? "A blocked order cannot have a vendor finalized"
                                        : undefined
                                    }
                                    onClick={() => awardFor(id)}
                                  >
                                    {/* ONE NAME FOR THE ACT, everywhere it
                                        appears (Pavan, 2026-09-23). */}
                                    Finalize vendor
                                  </Button>
                                )
                              ) : null}
                            </td>
                            <td className="relative p-0 text-center">
                              <DropdownMenu>
                                {/* A BLANK ROW CAN GO TOO, once it is not the only
                                    row — otherwise an extra one is stuck there. */}
                                <DropdownMenuTrigger
                                  asChild
                                  disabled={!id && partnerRows.length === 1}
                                >
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
                                  {/* "ACCEPT AND DRAFT", because that is both
                                      halves of what it does: it says the
                                      partner took the order, and it opens the
                                      quote sheet for the broker to write the
                                      price the partner gave on a call. It used
                                      to say "acknowledge and accept quote" and
                                      then accept a quote that did not exist. */}
                                  {/* ONLY WHERE THERE IS NO QUOTE. Writing
                                      down a price the partner gave on a call
                                      is a real act — for a partner who has not
                                      sent one. On a row that has already
                                      shared a quotation it offered to accept
                                      and then draft a quote that exists, which
                                      is two words of nonsense over a menu item
                                      nobody could want. */}
                                  {id && !quote && (
                                    <>
                                      <DropdownMenuItem
                                        onSelect={() => openQuoteDraft(id)}
                                      >
                                        <Check />
                                        Accept and draft quote
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
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
              {/* THE BAND THAT CLOSES THE TABLE CARRIES THE SENDING.
                  (Pavan, 2026-09-17.) Inviting is what this table is FOR, so
                  the act belongs on the table rather than in the sheet's
                  footer three sections down — the footer's act is the ORDER's,
                  and the two were competing for the same press. Add vendor
                  keeps the left, where the rows it adds are; the send and its
                  spare acts take the right, next to the rows they act on.

                  SMALLER THAN THE FOOTER'S. It is one section's act, not the
                  sheet's, and at the same size the two read as equals. */}
              {/* THE ADD HANGS OFF THE CARD and the spare acts moved to the
                  section's title bar — DS ui §10f. What is left in the card is
                  the one act that SENDS, and the band only exists while there
                  is something to send; an empty strip with a rule across the
                  card was reading as one more row of the table. */}
              {sendable.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2">
                  {/* THE SPARE ACTS ON THE LIST, beside the act that uses it:
                      acknowledging on a partner's behalf and clearing the rows
                      are both things you do TO the rows. */}
                  {/* WHAT A PRESS WOULD ACTUALLY SEND TO: the ticked rows that
                      have not been asked, or every row that has not. Nothing
                      left to send and it goes, rather than sitting there spent. */}
                  {sendable.length > 0 && (
                    <Button
                      size="sm"
                      disabled={draft.status === "Blocked"}
                      title={
                        draft.status === "Blocked"
                          ? "A blocked order cannot be sent to a vendor"
                          : undefined
                      }
                      onClick={() => sendInvitations(sendable)}
                    >
                      {selectedRows.length === 1
                        ? "Send invitation"
                        : selectedRows.length > 1
                          ? "Send invitations to all"
                          : unsentIds.length === 1
                            ? "Send invitation"
                            : "Send invitations to all"}
                    </Button>
                  )}
                </div>
              </div>
              )}

            </div>
          </>
        )}

          </>
        )}

        {vendorSettled && holdingVendorId && (
          /* NOT A TABLE — the awarded-partner branch is a card and a field, so
             it takes the card's insets back. */
          <SheetSectionInset>
            <div className="flex items-start gap-2 rounded-md border border-fp-outline-1 p-3">
              <Check className="mt-0.5 size-4 shrink-0 text-status-success" />
              <div className="min-w-0 flex-1">
                <VendorRow id={holdingVendorId} />
              </div>
              {/* THE DEAL CAN FALL THROUGH (Pavan, 2026-09-24) — a finalized
                  vendor is changeable while the order is Assigned: back to
                  Quoting, where every quote is still on the table and more
                  partners can be invited. */}
              {draft.status === "Assigned" && (
                <Button size="xs" variant="outline" onClick={() => setConfirmChangeVendor(true)}>
                  Change vendor
                </Button>
              )}
            </div>
            {(() => {
              const q = quotes.find((x) => x.vendorId === holdingVendorId);
              if (!q) return null;
              return (
                <SheetField label="Vendor cost">
                  {/* ONE MONEY HELPER — DS ui §10g. It was a hand-rolled
                      `$` and a `toLocaleString`, which is how `$147` and
                      `$147.00` ended up on two screens. */}
                  <p className="text-sm tabular-nums text-foreground">
                    {money(quoteTotal(q, draft.lines, chargesBase))}{" "}
                    <span className="text-muted-foreground">
                      across {q.lines.length}{" "}
                      {q.lines.length === 1 ? "line" : "lines"}
                    </span>
                  </p>
                </SheetField>
              );
            })()}
            {/* THE STAGE CTAs LIVE IN THE FOOTER, on the next-act ladder.
                Repeating them here would be two places to move one order on. */}
            {draft.status === "Synced" && (
              <p className="text-xs text-muted-foreground">
                Synced. Every field is locked once an order reaches this stage.
              </p>
            )}
          </SheetSectionInset>
        )}
      </SheetSection>

      {/* THE TWO SETTINGS ARE NOT PART OF THE TABLE UNIT. (Pavan, 2026-09-22.)
          They were the card's last band, which made them read as a row of the
          table — two more things in the list of partners. They are about the
          INVITATION, not about any row, so they sit outside the card with
          nothing drawn around them.

          24px, NOT THE BODY'S 40. Close enough to still belong to the vendor
          unit, far enough not to be part of it. The body stacks at 40, so the
          row pulls itself up by 16; what comes after keeps the normal 40. */}
      {!vendorSettled && (
        <div className="-mt-4 flex shrink-0 flex-wrap items-center gap-x-10 gap-y-2">
          <label
            htmlFor="do-notify"
            className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground"
          >
            Send email notifications to vendor
            <Switch
              id="do-notify"
              checked={draft.notifyVendor}
              onCheckedChange={(v) => set("notifyVendor", v)}
            />
          </label>
          {/* ONLY WHILE IT IS STILL A CHOICE. Past Draft this stated what had
              been asked for weeks ago, where a control used to be. */}
          {draft.status === "Draft" && (
            <label
              htmlFor="quote"
              className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground"
            >
              Request a quote
              <Switch
                id="quote"
                checked={draft.quoteRequested}
                onCheckedChange={(v) => set("quoteRequested", v)}
              />
            </label>
          )}
        </div>
      )}

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

      {/* ── ONE PAGE ──
          THE SHEET USED TO BE SPLIT IN TWO, and the split was there to keep it
          readable. The rail is what made it unnecessary: everything the pricing
          step used to put in front of you — the totals, whose quote it is, what
          is left — now sits in a column that never leaves. What remains of that
          step is two tables you TYPE into, which is what the left column is
          for, so they go at the foot of it in the order the money moves: what
          the partner charges, then what the customer pays.

          FINAL CALCULATIONS DOES NOT COME WITH THEM. It was the summary of
          these two tables on a screen that had no other summary; here the
          Summary card IS that, three inches to the right and visible the whole
          time, with the working on hover. Two of them would be one figure in
          two places, and the first to drift would be the one nobody was
          looking at. */}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            {/* ── SUMMARY ──
                IT SHOWS ITS FIGURES WHETHER OR NOT ANYBODY HAS QUOTED. Three
                of the four are known from the moment the order has lines —
                what was asked for, what the customer pays, and therefore what
                is left — and hiding them behind "no quotes yet" made the card
                a sentence where a summary should be. Only the partner's number
                is genuinely unknown, so only that one reads as unknown.

                THE STAGE LINE STAYS, at the foot, as a caption rather than as
                the whole card: "yet to receive a quote" explains the em-dash
                above it instead of standing in for the figures. */}
            <RailCard title="Summary" icon={<Info />}>
              {/* FOUR FIGURES IN THE ORDER THE MONEY MOVES: what was asked
                  for, what the partner charges to move it, what the customer
                  pays, and what is left between the two. Each of the three
                  money rows carries its own working on hover — the tables are
                  where the numbers are typed, this is the account of how they
                  add up. */}
              <dl className="flex flex-col divide-y divide-border">
                <RailRow
                  label="Requested"
                  value={
                    isAllTopOff(draft.lines)
                      ? "Top-off"
                      : gal > 0
                        ? `${gal.toLocaleString()} gal`
                        : "—"
                  }
                  breakdown={draft.lines
                    .filter((l) => l.asset)
                    .map((l) => ({
                      label: `${l.asset} · ${l.product}`,
                      value: l.topOff
                        ? "Top-off"
                        : `${billableGal(l).toLocaleString()} gal`,
                    }))}
                />
                <RailRow
                  label={
                    shownVendorId
                      ? `Vendor quote — ${vendorById(shownVendorId)?.name ?? "partner"}`
                      : "Vendor quote"
                  }
                  /* THE SAME FIGURE THE PRICING UNIT SHOWS — what this
                     partner is actually owed, with anything billed through to
                     the customer taken out. The rail was quoting the whole
                     quote while the column beside it quoted the net, and two
                     numbers for one thing is how a reader stops trusting
                     either. */
                  value={shownQuote ? money(carrierTotal) : "—"}
                  breakdown={vendorBreakdown}
                />
                <RailRow
                  label="Customer pricing"
                  value={money(billed)}
                  breakdown={customerBreakdown}
                />
                <RailRow
                  label="Margin"
                  value={
                    /* THE SAME FIGURE AS THE STRIP'S, so the same colour — one
                       number that reads two ways in two places is worse than a
                       number with no colour at all. */
                    shownQuote ? (
                      <span
                        className={cn(
                          margin < 0
                            ? "text-destructive"
                            : margin > 0
                              ? "text-status-success"
                              : undefined
                        )}
                      >
                        {money(margin)}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                  breakdown={marginBreakdown}
                />
              </dl>
              {quotes.length === 0 && (
                <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  {summaryEmptyLine(draft.status, invitedIds.length)}
                </p>
              )}
            </RailCard>

            {/* ── ASSOCIATED RECORDS ──
                NO RULE BETWEEN EVERY ROW. Five hairlines made five unrelated
                things where there are two kinds of thing: the records the order
                POINTS AT — who it is for, where it goes, who to call — and the
                partners, which are a list and change as the order moves. The
                first three are label-over-value pairs with nothing between
                them but space; the partners get the one rule in the card,
                because that is the only boundary that means anything. */}
            <RailCard title="Associated records" icon={<Users />}>
              <dl className="flex flex-col gap-3 px-4 py-3">
                <div className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">Customer</dt>
                  <dd className="truncate text-sm text-foreground">
                    {draft.customer || "—"}
                    {draft.erpId && (
                      <span className="text-muted-foreground"> · {draft.erpId}</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">Ship-to</dt>
                  <dd className="truncate text-sm text-foreground">
                    {draft.shipTo || "—"}
                    {site && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {site.city}, {site.state}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">Primary POC</dt>
                  <dd className="truncate text-sm text-foreground">
                    {draft.primaryPoc || "—"}
                  </dd>
                  {/* THE POINT OF A CONTACT IS BEING CONTACTABLE. A name on its
                      own sends the reader back into the form to find the number
                      — which is the one thing this column exists to save. */}
                  {draft.primaryPoc && POC_DIRECTORY[draft.primaryPoc] && (
                    <dd className="truncate text-xs text-muted-foreground">
                      {POC_DIRECTORY[draft.primaryPoc].phone} ·{" "}
                      {POC_DIRECTORY[draft.primaryPoc].email}
                    </dd>
                  )}
                </div>
              </dl>
              <div className="border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Partners{invitedIds.length > 0 && ` · ${invitedIds.length}`}
                </p>
                {invitedIds.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    None invited yet.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {invitedIds.map((id) => (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="truncate text-sm text-foreground">
                          {vendorById(id)?.name ?? id}
                        </span>
                        <StatusChip
                          tone={
                            draft.vendorId === id
                              ? kindTone("success")
                              : quotes.some((q) => q.vendorId === id)
                                ? kindTone("caution")
                                : invitedTone
                          }
                          variant="soft"
                        >
                          {/* THE SAME FOUR WORDS THE VENDOR TABLE USES. The
                              rail said "Quoted" where the table says
                              "Quotation shared"; one fact, two vocabularies,
                              on one screen. */}
                          {draft.vendorId === id
                            ? "Holds order"
                            : quotes.some((q) => q.vendorId === id)
                              ? "Quotation shared"
                              : draft.acceptedVendorIds.includes(id)
                                ? "Accepted"
                                : invitedWord}
                        </StatusChip>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </RailCard>

            {/* ── ACTIVITY, LAST ──
                It is the longest block and the one read least often, which is
                exactly why it goes at the foot of the rail rather than behind
                the header icon: in a column that scrolls with the form, "last"
                costs nothing, and a drawer costs a click every time. */}
            <RailCard title="Activity" icon={<HistoryIcon />}>
              {!order || order.audit.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nothing has changed yet.
                </p>
              ) : (
                /* A TIMELINE, NOT A LIST OF RULED ROWS. Six entries separated
                   by hairlines is a table of one column; a line running down
                   the marks says the obvious thing about an audit trail —
                   these happened in an order, most recent first — without a
                   word of chrome.

                   WHAT CHANGED LEADS, WHO AND WHEN FOLLOWS. The reader is
                   looking for the event; the name and the timestamp are what
                   they check once they have found it. */
                <ol className="flex flex-col px-4 py-3">
                  {[...order.audit]
                    .reverse()
                    .slice(0, 6)
                    .flatMap((e, i) =>
                      e.changes.map((c, j) => ({ e, c, key: `${e.at}-${i}-${j}` }))
                    )
                    .map(({ e, c, key }, idx, all) => {
                      const mark = auditMark(c);
                      return (
                        <li key={key} className="relative flex gap-3 pb-4 last:pb-0">
                          {/* The connector stops at the last mark rather than
                              running off the end of the list. */}
                          {idx < all.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute top-7 bottom-0 left-[13px] w-px bg-border"
                            />
                          )}
                          <span
                            className={cn(
                              "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5",
                              mark.tone
                            )}
                          >
                            {mark.icon}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                            <span className="text-sm text-foreground">{c}</span>
                            <span className="text-xs text-muted-foreground">
                              {AUDIT_FMT.format(new Date(e.at))} · {e.by}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                </ol>
              )}
            </RailCard>
          </aside>
        </div>

      {/* ── PRICING, FULL WIDTH, UNDER BOTH COLUMNS ──────────────────────
          It is four columns of its own and the rail was taking 340 of them.
          Out here it has the whole sheet, and the rail's three cards end above
          it — so scrolling down to the pricing scrolls them away, which is the
          right trade: their job is to keep the totals in view while you fill
          the form, and once you are IN the pricing the totals are in front of
          you at full size.

          THE SAME UNIT AT EVERY STAGE — EXCEPT AN UNQUOTED DRAFT (Pavan,
          2026-09-22). A draft with nobody's price on it has nothing to compare:
          the vendor column would be a wall of empty cells beside a customer
          column somebody is invited to fill in, which is the one arrangement
          that makes the broker's own numbers look like the whole answer.

          THE FIRST QUOTE IS WHAT OPENS IT, and in a draft that is an act the
          broker takes: *Accept and draft quote* in a partner row's ··· menu,
          which is how a price given on a call gets written down. Past Draft
          the unit is always there — the order exists, and what it is worth is
          a question anyone can ask of it. */}
      {showPricing && pricingSections}

      {/* ── WHAT TRAVELS WITH THE ORDER ──────────────────────────────────
          Two sections, not one "Additional Details" holding both. A file and a
          note are different kinds of thing — one is evidence, the other is an
          instruction — and a single heading over them named neither.

          VISIBILITY IS GONE. It was a Public/Private radio governing the
          upload, and nothing in the product read it: every file on an order is
          the order's, and the one genuinely private thing here has its own
          field below and always has. A control that decides nothing is worse
          than no control, because somebody sets it and expects it to hold. */}
      {/* TWO ROWS, 1:3 THEN FULL WIDTH (Pavan, 2026-09-22 — the tail was
          "completely messed up").

          WHAT WENT WRONG. Three units were sharing one four-column row with
          spans of 1, 4 and 3. A span of four cannot fit beside a span of one,
          so Documents was pushed onto a row of its own and left three empty
          columns beside the upload; Notes then took three of the next four and
          stopped short of the right edge. Three units, three widths, none of
          them lining up with another.

          WHAT IT IS NOW. The upload and the documents are both about FILES, so
          they share the first row and read as a pair — the dropzone takes the
          quarter because it is one target, the documents take the rest because
          a table with four columns needs the width. Notes takes a full row of
          its own: it is the only thing here anyone writes more than a line
          into, and its two boxes want the room. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
      <SheetSection title="Upload Supporting Image" className="lg:col-span-1">
        {/* The DS control in its `field` variant — dropzone, note, and only the
            files actually added. The showcase variant's seeded chips and
            permanent "Uploading 2 of 3" block belong to the gallery. */}
        <FileUpload variant="field" label="Choose a file to upload" />
      </SheetSection>

      {/* ══ DOCUMENTS ════════════════════════════════════════════════════
          (Pavan, 2026-09-22.) The papers an order accrues — the BOL it moved
          on, the driver's ticket, the invoice that follows. Separate from the
          supporting image above it because the image is evidence somebody
          took and these are documents of record: accounting, the customer or
          a dispute asks for them BY KIND, and a single pile means the one you
          need is found by scrolling.

          A TABLE, AND THE KIND IS ITS FIRST COLUMN, for the same reason. */}
      <SheetSection
        title="Documents"
        className="lg:col-span-3"
        flush
        hanging={
          <HangingAdd
            label="Add document"
            onClick={() =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      documents: [
                        ...d.documents,
                        {
                          id: `doc-${Date.now()}`,
                          kind: "Other",
                          name: "New document.pdf",
                          addedOn: DATE_FMT.format(new Date()),
                          addedBy: "Dana Whitfield",
                        },
                      ],
                    }
                  : d
              )
            }
          />
        }
      >
        {/* ALWAYS A TABLE, never an empty-state panel standing in for one —
            the same rule the Delivery Order table above follows. An empty
            table with its columns showing says what a document on an order is
            made of; a paragraph in a padded card says only that there are
            none, and it makes the section change shape the moment one
            arrives. */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-fp-table-header">
                {["Kind", "Document", "Added", "By"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {draft.documents.length === 0 && (
                <tr className="h-11">
                  <td
                    colSpan={5}
                    className="px-3 text-sm text-muted-foreground"
                  >
                    Nothing yet. A BOL arrives when the order is assigned; the
                    ticket and the invoice follow the delivery.
                  </td>
                </tr>
              )}
              {draft.documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2.5">
                    <Badge variant="secondary" className="font-normal">
                      {doc.kind}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{doc.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {doc.addedOn}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {doc.addedBy}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Download ${doc.name}`}
                      className="text-muted-foreground"
                    >
                      <Download />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetSection>

      <SheetSection title="Notes" className="lg:col-span-4">
        {/* TWO BOXES, SIDE BY SIDE, because the separation is the whole point:
            one of these is read by a driver at a gate and the other by nobody
            outside the building. Stacked they read as a first and second note;
            beside each other they are plainly two audiences, and nobody writes
            a gate code where the vendor can see it. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SheetField label="Delivery Instructions">
            <Textarea
              value={draft.instructions}
              placeholder="Enter any delivery instructions here"
              onChange={(e) => set("instructions", e.target.value)}
              className="min-h-32"
            />
          </SheetField>
          <SheetField label="Internal Note">
            <Textarea
              value={draft.internalNote}
              placeholder="Add an internal note"
              onChange={(e) => set("internalNote", e.target.value)}
              className="min-h-32"
            />
          </SheetField>
        </div>
      </SheetSection>
      </div>

      {/* ONE PARTNER'S QUOTE, OVER THE ORDER. A second sheet rather than a
          section in this one: it belongs to a partner, not to the order, and
          there are as many of them as there are rows in the table.

          MOUNTED ONLY WHILE OPEN, so it re-reads the quote each time — the
          broker can draft, close, and reopen the same row. */}
      {/* THE INVITATION, AS THE PARTNER WILL READ IT. Mounted only while open
          so it seeds its own wording each time. */}
      {inviting && (
        <InvitePartnerSheet
          open
          onOpenChange={(o) => !o && setInviting(null)}
          resend={inviting.resend}
          targets={inviting.ids.map((id) => {
            const v = vendorById(id);
            return {
              id,
              name: v?.name ?? "Partner",
              email: `dispatch@${(v?.name ?? "partner").toLowerCase().replace(/[^a-z]+/g, "")}.com`,
            };
          })}
          facts={inviteFacts}
          onSend={(ids) => {
            if (inviting.resend) {
              /* A RESEND reaches the partner again but changes no row: they
                 are already invited. Said out loud, because nothing on the
                 table moves to show it happened. */
              setDraft((d) => (d ? { ...d, quoteRequested: true } : d));
              const names = ids.map((id) => vendorById(id)?.name ?? "partner");
              toast.success(
                names.length === 1 ? `Invitation resent to ${names[0]}` : `Invitation resent to ${names.length} partners`,
                { description: "Awaiting quotation." }
              );
            } else {
              inviteAndQuote(ids);
            }
            setInviting(null);
          }}
        />
      )}

      {quoteSheet && (
        <VendorQuoteSheet
          open
          onOpenChange={(o) => !o && setQuoteSheet(null)}
          vendorName={vendorById(quoteSheet.vendorId)?.name ?? "Partner"}
          mode={quoteSheet.mode}
          lines={draft.lines.filter((l) => l.asset)}
          quote={
            draft.quotes.find((q) => q.vendorId === quoteSheet.vendorId) ?? null
          }
          onQuoteChange={putQuote}
          chargesBase={chargesBase}
          notes={
            draft.quotes.find((q) => q.vendorId === quoteSheet.vendorId)?.note
          }
          onNotesChange={(v) => {
            const q = draft.quotes.find(
              (x) => x.vendorId === quoteSheet.vendorId
            );
            if (q) putQuote({ ...q, note: v });
          }}
          attachments={(
            draft.quotes.find((q) => q.vendorId === quoteSheet.vendorId)
              ?.attachments ?? []
          ).map((name) => ({ name }))}
          onAccept={() => acceptFromQuoteSheet(quoteSheet.vendorId)}
          onReject={() => rejectQuote(quoteSheet.vendorId)}
        />
      )}

      {/* FINALISING IS THE ONE PRESS THAT PICKS WHO GETS PAID, so it is
          confirmed against the figures rather than on trust. (Pavan,
          2026-09-22.) The broker has been comparing three prices; the dialog
          restates the one they landed on, in full, so the confirmation is a
          reading rather than a nod. */}
      <AlertDialog
        open={finalizing !== null}
        onOpenChange={(o) => !o && setFinalizing(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Finalize {vendorById(finalizing ?? "")?.name ?? "this partner"} as the vendor?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will hold the order. You can finalize somebody else until it
              moves to Assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {finalizing &&
            (() => {
              const q = quotes.find((x) => x.vendorId === finalizing);
              if (!q) return null;
              const total = quoteTotal(q, draft.lines, chargesBase);
              const rows: { label: string; value: number }[] = [
                { label: "Product", value: quoteProductTotal(q, draft.lines) },
                {
                  label: "Margin",
                  value: quoteChargeTotal(q, draft.lines, "Margin"),
                },
                {
                  label: "Fees",
                  value: quoteChargeTotal(q, draft.lines, "Fee"),
                },
                {
                  label: "Taxes",
                  value: quoteChargeTotal(q, draft.lines, "Tax"),
                },
                { label: "Freight", value: q.freight },
              ];
              return (
                /* T2 — ITS OWN BOX, ruled correct 2026-09-22: a dialog body is
                   not a card, and nothing else here draws an edge. */
                <div
                  data-table-variant="T2"
                  className="overflow-hidden rounded-md border border-fp-outline-1"
                >
                  <table className="w-full text-sm">
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.label}
                          className="border-b border-fp-outline-1"
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.label}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {money(r.value)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-fp-table-header">
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          Vendor cost
                        </td>
                        <td className="px-3 py-2.5 text-right text-base font-semibold tabular-nums text-foreground">
                          {money(total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}

          <AlertDialogFooter>
            <AlertDialogCancel>Keep comparing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-success text-status-success-foreground hover:bg-status-success/90"
              onClick={() => {
                if (finalizing) awardFor(finalizing);
                setFinalizing(null);
              }}
            >
              Finalize vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmChangeVendor} onOpenChange={setConfirmChangeVendor}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change vendor on {order?.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {vendorById(holdingVendorId ?? "")?.name ?? "The vendor"} no longer holds the order. It moves back to
              Quoting with every quote kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep vendor</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const was = vendorById(holdingVendorId ?? "")?.name ?? "Vendor";
                /* The holder leaves acceptedVendorIds too — otherwise it would
                   still read as the one holding the order. Its quote stays. */
                setDraft((d) =>
                  d
                    ? { ...d, vendorId: null, status: "Quoting", acceptedVendorIds: d.acceptedVendorIds.filter((id) => id !== holdingVendorId) }
                    : d
                );
                toast.success(`${was} released`, { description: "Back in Quoting — finalize another vendor or invite more." });
              }}
            >
              Change vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
