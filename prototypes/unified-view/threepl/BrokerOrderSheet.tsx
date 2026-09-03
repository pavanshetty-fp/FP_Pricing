import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CircleAlert,
  Layers,
  Mail,
  Pencil,
  Plus,
  Trash2,
  X,
  Shield,
  ThumbsDown,
  Truck,
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
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
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="flex-1" aria-label="Repeat unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    | { product: string; terminal?: string; supplier?: string; loadingAccount?: string }[]
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
    lines: o.lines.map((l) => ({ ...l, selected: l.topOff })),
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
  /** Vendors ticked in the picker but not yet invited. */
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  /**
   * "Top off selected" is a MODE, not a bulk action. While it is on, the
   * selected lines are filled and the rest still take a typed quantity — so
   * turning it on must not tick every box, and ticking a box while it is on
   * must take effect immediately.
   */
  const [topOffMode, setTopOffMode] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const creating = mode === "create";

  React.useEffect(() => {
    if (!open) return;
    setDraft(creating ? emptyDraft() : order ? draftFrom(order) : null);
    setPicked(new Set());
    // An order that already carries top-off lines opens in the mode, with those
    // lines selected — otherwise the switch would read "off" over filled rows.
    setTopOffMode(Boolean(order?.lines.some((l) => l.topOff)));
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

  /* A blank row is not an asset. The total, the top-off switch and the load
     order all key off lines that actually name one. */
  const namedLines = draft.lines.filter((l) => l.asset);
  const hasAssets = namedLines.length > 0;

  /** `topOff` is DERIVED: the mode, and this line selected. */
  const withTopOff = (lines: OrderLine[], mode: boolean) =>
    lines.map((l) => ({ ...l, topOff: mode && Boolean(l.selected) }));

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
              { asset: "", product: PRODUCTS[0], gal: null, topOff: false, selected: false },
            ],
          }
        : d
    );

  const removeLine = (i: number) =>
    setDraft((d) =>
      d ? { ...d, lines: d.lines.filter((_, k) => k !== i) } : d
    );

  /* The switch changes the MODE. It re-derives every line from what is already
     selected; it does not select anything on the reader's behalf. */
  const setTopOffModeAndLines = (on: boolean) => {
    setTopOffMode(on);
    setDraft((d) => (d ? { ...d, lines: withTopOff(d.lines, on) } : d));
  };

  /* Ticking a row changes the SELECTION, and — while the mode is on — that
     line's top-off with it, so the row reacts to its own checkbox. */
  const setSelected = (i: number, on: boolean) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            lines: d.lines.map((l, k) =>
              k === i ? { ...l, selected: on, topOff: topOffMode && on } : l
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
  /** Only what can still be added — an invited partner is not an option. */
  const uninvited = eligible.filter(
    (v) => !draft.invitedVendorIds.includes(v.id)
  );

  /* ── Workflow transitions. Each one moves the status AND the vendor fields
        together, so the pair cannot end up contradicting itself. ─────────── */
  /* MERGES. Inviting again adds to the list rather than replacing it, so a
     partner can be added after the first round went out — which is the whole
     point of being able to invite more later. New invitees are asked for a
     price by default. */
  const invite = (ids: string[]) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            status: "Assigned",
            invitedVendorIds: [...new Set([...d.invitedVendorIds, ...ids])],
            quoteVendorIds: [...new Set([...d.quoteVendorIds, ...ids])],
            vendorId: null,
          }
        : d
    );

  /** Withdrawing one invitation, not the whole round. */
  const uninvite = (id: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            invitedVendorIds: d.invitedVendorIds.filter((x) => x !== id),
            quoteVendorIds: d.quoteVendorIds.filter((x) => x !== id),
            status: d.invitedVendorIds.length <= 1 ? "Draft" : d.status,
          }
        : d
    );

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
  const cancelInvites = () =>
    setDraft((d) =>
      d ? { ...d, status: "Draft", invitedVendorIds: [], vendorId: null } : d
    );
  const acceptFor = (vendorId: string) =>
    setDraft((d) => (d ? { ...d, status: "Accepted", vendorId } : d));
  const advance = (status: BrokerStatus) =>
    setDraft((d) => (d ? { ...d, status } : d));

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

        {/* The ship-to's own facts, as a READ-OUT rather than fields. They are
            the consequence of the two selects above — never typed, never
            editable — so they are shown, not offered. One card keeps the
            coordinates and the address together, which is how anyone reads a
            location: three lines at most. */}
        <div className="rounded-md border border-fp-outline-1 bg-fp-surface-1a px-4 py-3">
          {site ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm tabular-nums text-foreground">
                {site.latLng}
              </span>
              <span className="text-sm text-muted-foreground">
                {site.street}
              </span>
              <span className="text-sm text-muted-foreground">
                {site.city}, {site.state} {site.zip}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Select a ShipTo to see its coordinates and address.
            </span>
          )}
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
        {/* One person per row: name and the two ways to reach them read as a
            single fact, so they sit side by side rather than wrapping over two
            rows with the contact detached from whose it is. */}
        <div className="grid grid-cols-3 gap-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Optional: an order can be raised before anyone owns it. */}
          <SheetField label="Sales Person">
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

        {/* Revealed by the flag above: a cadence with nothing recurring is a
            question about nothing. "Custom" opens its own dialog rather than
            growing five more fields nobody uses on the common cadences. */}
        {draft.recurring && (
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Frequency" required>
              <Select
                value={draft.recurrenceFrequency}
                onValueChange={(v) => {
                  set("recurrenceFrequency", v);
                  if (v === "Custom") setCustomOpen(true);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select frequency" />
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

        {/* Only the flag that CHANGES THIS SECTION stays here — recurring
            reveals the cadence below it. Urgent and signature-on-delivery are
            decisions about the delivery itself and ride in the footer, in view
            at the moment of committing. */}
        <FlagRow
          flags={[
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
                        recurrenceFrequency: v
                          ? (d.recurrenceFrequency || RECURRENCE_FREQUENCIES[0])
                          : d.recurrenceFrequency,
                      }
                    : d
                ),
            },
          ]}
        />

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
                  <col className="w-[86px]" />
                  <col className="w-[34%]" />
                  <col className="w-[30%]" />
                  <col />
                  <col className="w-[52px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-surface-1a">
                    {/* No label: it is a selection column, and what the
                        selection is FOR is stated by the switch below. */}
                    <th aria-hidden />
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
                        {/* SELECTION. What it does depends on the switch below
                            the table: while "Top off selected" is on, the
                            selected lines are filled and the rest keep taking a
                            number. */}
                        <td className="px-3">
                          <Checkbox
                            checked={Boolean(line.selected)}
                            onCheckedChange={(c) => setSelected(i, c === true)}
                            aria-label={`Select ${line.asset || `line ${i + 1}`}`}
                          />
                        </td>
                        <td className="relative p-0">
                          <TableCellCombobox
                            value={line.asset}
                            options={siteAssets.map((a) => a.name)}
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

          {/* Only once a line has an asset on it: a switch that acts on nothing
              is a control asking to be clicked to no effect. Qty itself is
              never an input — it is the sum. */}
          {hasAssets && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label
                htmlFor="topoff-selected"
                className="flex cursor-pointer items-center gap-2.5"
              >
                <Switch
                  id="topoff-selected"
                  checked={topOffMode}
                  onCheckedChange={setTopOffModeAndLines}
                />
                <span className="text-sm text-foreground">Top off selected</span>
              </label>
              <span className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium tabular-nums text-foreground">
                  {isAllTopOff(draft.lines) ? "Top-off" : `${gal.toLocaleString()} gal`}
                </span>
              </span>
            </div>
          )}
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
          action={
            loadRows && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set("loadRows", null)}
              >
                <Trash2 /> Remove
              </Button>
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
              <span className="text-sm text-muted-foreground">
                Not required. Create one to record where each product is loaded.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  set("loadRows", orderProducts.map((pr) => ({ product: pr })))
                }
              >
                <Plus /> Create
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[28%]" />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-fp-surface-1a">
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
                    return (
                      <tr
                        key={row.product}
                        className="h-11 border-b border-border last:border-b-0"
                      >
                        <td className="truncate px-3 text-sm text-foreground">
                          {row.product}
                        </td>
                        <td className="relative p-0">
                          <TableCellSelect
                            value={row.terminal ?? ""}
                            options={opts.terminals}
                            placeholder="Terminal"
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
      <SheetSection className="gap-5" title="Delivery Partner">
        {!accepted && (
          <>
            {/* The DS "add more" pattern: what has been chosen sits inline as
                removable chips, and the same control adds another. Inviting is
                not a one-shot round — a partner can be added after the first
                went out, which the old "pick then Invite" flow made impossible
                once the order left Draft. */}
            <SheetField
              label="Invite partners"
              description={`Showing partners that run ${requiredLine}. All invited partners are notified at the same time; whichever accepts first is assigned the order, and the rest are told it is no longer available.`}
            >
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-fp-outline-1 p-2">
                {draft.invitedVendorIds.map((id) => (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 rounded-md bg-muted py-1 pr-1 pl-2.5 text-sm text-foreground"
                  >
                    <Truck className="size-3.5 text-muted-foreground" />
                    {vendorById(id)?.name ?? id}
                    <button
                      type="button"
                      aria-label={`Cancel invitation to ${vendorById(id)?.name ?? id}`}
                      onClick={() => uninvite(id)}
                      className="rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}

                <Popover open={inviteOpen} onOpenChange={setInviteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      // A blocked order cannot be dispatched at all (§5, Credit
                      // Limit Management), so the action is unavailable rather
                      // than failing after the click.
                      disabled={draft.status === "Blocked"}
                      className={cn(draft.invitedVendorIds.length === 0 && "w-full")}
                    >
                      <Plus /> Invite partners
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-96 p-0">
                    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto p-1">
                      {uninvited.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Every eligible partner is already invited.
                        </p>
                      ) : (
                        uninvited.map((v) => (
                          <label
                            key={v.id}
                            className="flex cursor-pointer items-start gap-2.5 rounded-sm p-2 transition-colors hover:bg-accent"
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
                        ))
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-border p-2">
                      <Button
                        size="sm"
                        disabled={picked.size === 0}
                        onClick={() => {
                          invite([...picked]);
                          setPicked(new Set());
                          setInviteOpen(false);
                        }}
                      >
                        <Mail />
                        Invite{picked.size > 0 && ` ${picked.size}`}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </SheetField>

            {/* Same shape as "Top off selected": a MODE over a selection that
                defaults to everyone. Asking every invited partner for a price
                is the common case, so it costs no clicks; excluding one is a
                single uncheck. */}
            {draft.invitedVendorIds.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 rounded-md border border-fp-outline-1 p-1">
                  {draft.invitedVendorIds.map((id) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-sm p-2 transition-colors hover:bg-accent"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={draft.quoteVendorIds.includes(id)}
                        onCheckedChange={(c) => setQuoteFor(id, c === true)}
                        aria-label={`Request a quote from ${vendorById(id)?.name ?? id}`}
                      />
                      <VendorRow id={id} />
                    </label>
                  ))}
                </div>

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
              </div>
            )}
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
