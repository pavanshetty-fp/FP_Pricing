import * as React from "react";
import {
  ClipboardList,
  CornerDownRight,
  Clock,
  Calendar as CalendarIcon,
  MoreHorizontal,
  History,
  Ban,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pill } from "@/components/ui/pill";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusChip } from "@/components/ui/status-chip";
import {
  TableCellCombobox,
  TableCellInput,
  TableCellMultiSelect,
  TableRequiredLabel,
} from "@/components/form-layout/table-cells";
import { TimeWindowSlider } from "@/components/form-layout/TimeWindowSlider";
import { HangingAdd } from "../HangingAdd";
import {
  SheetField,
  SheetSectionInset,
  SheetSection,
  SheetSectionNote,
} from "@/components/side-sheet/parts";
import { RecordSheet, DraftStatusChip, useDraftSaveState } from "../RecordSheet";
import { PendingStrip } from "../PendingStrip";
import { DATE_FMT } from "../data";
import { RailCard, RailRow, useElapsedHours } from "./sheet-parts";
import { ActivityCard, RailRow as SummaryRow, SummaryCard } from "../SheetCards";
import { useServiceSettings, type ReturnMode } from "./settings";
import { INVENTORY } from "./catalog";

/** THE PARTS TO PICK FROM (2026-09-24) — the shelf, with each part's cost. */
const PART_OPTIONS = INVENTORY.map((p) => ({ name: p.part, amount: p.cost }));
import { TechnicianApp } from "./TechnicianApp";
import { RichText } from "./TechnicianJob";
import {
  CompleteDialog,
  InvoiceSummarySheet,
  OnBehalfDialog,
  PaymentDetails,
  TechnicianEmailSheet,
} from "./DispatchFlow";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImagePlus, Wallet, CircleAlert } from "lucide-react";
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
import { downloadInvoice } from "./invoicePdf";
import { Checkbox } from "@/components/ui/checkbox";
import {
  visitHours,
  FEE_BOOK,
  workTypesOf,
  jobsOf,
  ACTIVE_TECHNICIANS,
  INTAKE_SOURCES,
  PORTAL_SOURCE,
  PRIORITIES,
  WORK_TYPES,
  WORK_TYPE_NAMES,
  WORK_STATUS_TONE,
  feesTotal,
  isRecorded,
  isWorkable,
  isUnassigned,
  syncVisits,
  LANE_OF,
  syncPrimaryAsset,
  type ServiceAssetLine,
  fittedOf,
  shortfallLabel,
  formatHours,
  money,
  orderTotal,
  partsTotal,
  technicianById,
  contactsFor,
  type FeeLine,
  type PartLine,
  type ServiceOrder,
  type WorkStatus,
} from "./work";
import { TableRowRemove } from "@/components/form-layout/table-cells";

/**
 * THE SERVICE ORDER SHEET.
 *
 * Same shape as the 3PL order sheet, because it is the same kind of object: a
 * record with a stage, a set of facts, a table of money, and one act at the
 * foot that moves it on. The differences below are the work's, not a
 * preference.
 *
 * ONE SHEET FOR EVERY STAGE. What changes between Open and Completed is which
 * sections can be edited and what the footer's act is — not which screen you
 * are on. A separate "complete manually" page and a separate "create invoice"
 * page would be two more places to learn for two acts that belong to this
 * record.
 *
 * THE FOOTER IS A LADDER. Whatever the stage, the primary names the ONE thing
 * that moves the job forward from here, and when it cannot be pressed the
 * reason sits beside it rather than on it. The rung depends on the module's
 * settings as much as on the stage: with the technician app off there is no
 * "Open technician app", and with native billing on there is no "Generate
 * invoice" because the invoice wrote itself.
 */

/** One label / figure line inside the money card. */
function MoneyRow({
  label,
  value,
  bold,
  muted,
}: {
  label: React.ReactNode;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className={cn(muted ? "text-muted-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums whitespace-nowrap",
          bold ? "font-semibold text-foreground" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* THE SECTIONS THE STRIP CAN SEND SOMEBODY TO. Named here rather than typed
   at each call site, so a section that is renamed cannot leave the strip
   pointing at nothing. */
const SECTION_ASSET = "service-order-asset";
/** The assets table, and the technician — both their own cards since 2026-09-23. */
const SECTION_ASSETS = "service-order-assets";
/** EXPORTED, because the board's Assign CTA scrolls the sheet to it. */
export const SECTION_TECH = "service-order-technician";

/** A fresh, empty row for the assets table. */
const blankAssetLine = (): ServiceAssetLine => ({
  assetId: "",
  assetName: "",
  assetType: "",
  workType: "",
  fault: "",
});
const SECTION_SCHEDULE = "service-order-schedule";

const STAMP_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** "Sep 18, 2026 · 9:07 AM" — the app's date format, not the locale default. */
function stampLabel(iso: string): string {
  const at = new Date(iso);
  return `${DATE_FMT.format(at)} · ${STAMP_TIME.format(at)}`;
}

/**
 * PARTS AND FEES, AS THE EDITABLE TABLE EVERY OTHER SHEET USES.
 *
 * The DS's editable-table idiom, the same one the 3PL order sheet's lines
 * table is built from: fixed layout, a Surface-1a header band, cells with no
 * chrome of their own, and the add HANGING off the card's corner. Three stacked
 * inputs in a row was a form pretending to be a table — the columns had no
 * headers, so a reader had to work out which box was the quantity and which
 * was the money, on every row.
 *
 * ONE COMPONENT FOR BOTH, because a part and a fee are the same shape once the
 * quantity column is optional: a name, a number, and a way to take the row
 * away. Written out twice they would have drifted.
 */
/**
 * LABOUR — WHAT THE CLOCK SAID, AND WHAT IS BEING BILLED.
 *
 * COMPUTED WITH AN OVERRIDE (Pavan, 2026-09-23). The hours are start-of-work
 * to completion, which is a fact nobody has to remember to type. But a clock
 * cannot know about the half hour spent moving a truck that should not be
 * billed, so somebody has to be able to disagree with it — and **a computed
 * figure nobody can correct is one people work around by not starting the job
 * in the app at all.**
 *
 * A READ-OUT, NOT A DISABLED FIELD. The DS rule, and it matters most here: a
 * greyed input still looks like a field promising an edit, and its dimming
 * makes the number the hardest thing in the section to read. So the measured
 * figure is text, and the edit is a control of its own that says what it does.
 *
 * WHEN IT IS OVERRULED, BOTH ARE SHOWN. The measurement does not disappear
 * behind the correction — keeping it is what makes the correction reviewable,
 * and "1.5 h, measured 2.25 h" is a sentence somebody can question. Clearing
 * goes back to the clock rather than to zero, because zero is not what
 * "never mind" means.
 *
 * BEFORE THE JOB HAS RUN there is nothing to measure and nothing to correct,
 * so it says so rather than showing 0 h — zero hours is a claim about a visit
 * that has not happened.
 */
/**
 * LABOUR — HOURS AND MINUTES, AND WHAT AN HOUR COSTS.
 *
 * COMPUTED WITH AN OVERRIDE (Pavan, 2026-09-23). The time is start-of-work to
 * completion, which is a fact nobody has to remember to type. But a clock
 * cannot know about the half hour spent moving a truck that should not be
 * billed, so somebody has to be able to disagree with it — and **a computed
 * figure nobody can correct is one people work around by not starting the job
 * in the app at all.**
 *
 * HOURS AND MINUTES, NOT DECIMAL HOURS. `2.25` is how the money is worked
 * out; `2 h 15 m` is how long the job took. Nobody comes off a job saying
 * "that was one point seven five hours", and asking them to convert is asking
 * them to make a rounding error on the invoice. So the READ-OUT and the two
 * inputs are both in h/m, and the decimal stays where it belongs — inside
 * `laborTotal`.
 *
 * A READ-OUT, NOT A DISABLED FIELD. The DS rule, and it matters most here: a
 * greyed input still looks like a field promising an edit, and its dimming
 * makes the value the hardest thing in the section to read.
 *
 * WHEN IT IS OVERRULED, BOTH ARE SHOWN. The measurement does not disappear
 * behind the correction — keeping it is what makes the correction reviewable.
 * Clearing goes back to the clock rather than to zero, because zero is not
 * what "never mind" means.
 */
/** One line of the quote. `approx` marks the half nobody can promise yet. */
function QuoteRow({
  label,
  value,
  approx,
  strong,
}: {
  label: string;
  value: number;
  approx?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
      <span
        className={cn(
          "text-sm",
          strong ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 text-sm tabular-nums",
          strong ? "font-medium text-foreground" : "text-foreground"
        )}
      >
        {/* THE TILDE IS THE WHOLE CAVEAT, on the figure itself. A footnote
            somewhere else is read once and not carried down the column. */}
        {approx ? "~" : ""}
        {money(value)}
      </span>
    </div>
  );
}


/** Another order's number as a link — opens it. */
function OrderLink({ no, onOpen }: { no: string; onOpen?: (no: string) => void }) {
  return onOpen ? (
    <button
      type="button"
      onClick={() => onOpen(no)}
      className="rounded-sm text-foreground underline decoration-current/40 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {no}
    </button>
  ) : (
    <span>{no}</span>
  );
}

function LineTable({
  rows,
  onChange,
  onRemove,
  readOnly,
  withQty,
  nameLabel,
  namePlaceholder,
  emptyLabel,
  total,
  focusRow,
  showFitted,
  nameOptions,
  noTotal,
}: {
  /** No total row — a list that is not billed (parts not available). */
  noTotal?: boolean;
  /**
   * A LIST TO PICK THE NAME FROM, or type one (Pavan, 2026-09-24) — the
   * standard fees. Picking a listed name brings its amount; it stays editable.
   */
  nameOptions?: { name: string; amount: number }[];
  rows: (PartLine | FeeLine)[];
  onChange: (i: number, patch: Record<string, unknown>) => void;
  onRemove: (i: number) => void;
  readOnly: boolean;
  withQty?: boolean;
  nameLabel: string;
  namePlaceholder: string;
  emptyLabel: string;
  total: number;
  /** The row just added — its first cell takes the cursor. */
  focusRow?: number;
  /**
   * WHAT HAS ALREADY GONE ON, per part (Pavan, 2026-09-23). Once the job has
   * been visited, the list is what was asked for and "Fitted" is how much of
   * it was delivered — so the next technician sees what is still owed
   * against the same lines the first one raised.
   */
  showFitted?: boolean;
}) {
  const amountOf = (r: PartLine | FeeLine) =>
    "cost" in r ? (r as PartLine).cost * (r as PartLine).qty : (r as FeeLine).amount;

  return (
    <div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          {withQty && <col className="w-[84px]" />}
          {showFitted && <col className="w-[84px]" />}
          <col className="w-[120px]" />
          {/* NO SECOND MONEY COLUMN ON A FEE. Quantity times unit is
              arithmetic worth showing; a fee's amount IS what was typed, and a
              column repeating it was two headers called Amount. */}
          {withQty && <col className="w-[110px]" />}
          {!readOnly && <col className="w-[52px]" />}
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-fp-table-header">
            <th className="px-3 py-2.5 text-left">
              <TableRequiredLabel>{nameLabel}</TableRequiredLabel>
            </th>
            {withQty && (
              <th className="px-3 py-2.5 text-right">
                <TableRequiredLabel>Qty</TableRequiredLabel>
              </th>
            )}
            {showFitted && (
              <th className="px-3 py-2.5 text-right">
                <TableRequiredLabel>Fitted</TableRequiredLabel>
              </th>
            )}
            <th className="px-3 py-2.5 text-right">
              <TableRequiredLabel>{withQty ? "Unit" : "Amount"}</TableRequiredLabel>
            </th>
            {withQty && (
              <th className="px-3 py-2.5 text-right">
                <TableRequiredLabel>Amount</TableRequiredLabel>
              </th>
            )}
            {!readOnly && <th aria-hidden />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="h-11 border-b border-border last:border-b-0">
              <td
                colSpan={(withQty ? (readOnly ? 4 : 5) : readOnly ? 2 : 3) + (showFitted ? 1 : 0)}
                className="px-3 text-sm text-muted-foreground"
              >
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
              <td className="relative p-0">
                {readOnly ? (
                  <span className="block truncate px-3 text-sm text-foreground">
                    {r.name || "—"}
                  </span>
                ) : (
                  nameOptions ? (
                    <TableCellCombobox
                      value={r.name}
                      options={nameOptions.map((f) => f.name)}
                      creatable
                      createLabel={`Add as ${nameLabel.toLowerCase()}`}
                      placeholder={namePlaceholder}
                      autoFocus={i === focusRow}
                      aria-label={`${nameLabel} for row ${i + 1}`}
                      onChange={(v) => {
                        /* A LISTED NAME BRINGS ITS PRICE — a part's unit cost, a
                           fee's amount. Either stays editable. */
                        const listed = nameOptions.find((f) => f.name === v);
                        onChange(
                          i,
                          !listed ? { name: v } : "cost" in r ? { name: v, cost: listed.amount } : { name: v, amount: listed.amount }
                        );
                      }}
                    />
                  ) : (
                    <TableCellInput
                      value={r.name}
                      placeholder={namePlaceholder}
                      autoFocus={i === focusRow}
                      aria-label={`${nameLabel} for row ${i + 1}`}
                      onChange={(v) => onChange(i, { name: v })}
                    />
                  )
                )}
              </td>
              {withQty && (
                <td className="relative p-0">
                  {readOnly ? (
                    <span className="block px-3 text-right text-sm tabular-nums text-foreground">
                      {(r as PartLine).qty}
                    </span>
                  ) : (
                    <TableCellInput
                      value={String((r as PartLine).qty)}
                      numeric
                      aria-label={`Quantity for row ${i + 1}`}
                      onChange={(v) =>
                        onChange(i, { qty: Number(v.replace(/[^0-9]/g, "")) || 0 })
                      }
                    />
                  )}
                </td>
              )}
              {showFitted && (
                <td className="px-3 text-right text-sm tabular-nums text-foreground">
                  {fittedOf(r as PartLine)}
                </td>
              )}
              <td className="relative p-0">
                {readOnly ? (
                  <span className="block px-3 text-right text-sm tabular-nums text-foreground">
                    {money("cost" in r ? (r as PartLine).cost : (r as FeeLine).amount)}
                  </span>
                ) : (
                  <TableCellInput
                    value={String("cost" in r ? (r as PartLine).cost : (r as FeeLine).amount)}
                    numeric
                    prefix="$"
                    aria-label={`${withQty ? "Unit cost" : "Amount"} for row ${i + 1}`}
                    onChange={(v) =>
                      onChange(i, {
                        [withQty ? "cost" : "amount"]:
                          Number(v.replace(/[^0-9.]/g, "")) || 0,
                      })
                    }
                  />
                )}
              </td>
              {/* THE LINE'S OWN TOTAL, computed — never typed. Quantity times
                  unit is arithmetic, and a box to type it into is a box to get
                  it wrong in. */}
              {withQty && (
                <td className="px-3 text-right text-sm tabular-nums text-foreground">
                  {money(amountOf(r))}
                </td>
              )}
              {!readOnly && (
                <td className="relative p-0 text-center">
                  <TableRowRemove
                    aria-label={`Remove ${r.name || `${nameLabel.toLowerCase()} ${i + 1}`}`}
                    onRemove={() => onRemove(i)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {/* THE TOTAL IS A ROW OF THE TABLE, not a caption under it — a sum
            lives in the column it sums, on the same grid as the numbers above
            it. Only once there is something to add up. */}
        {rows.length > 0 && !noTotal && (
          <tfoot>
            <tr className="h-11 border-t border-border">
              <td
                colSpan={(withQty ? 3 : 1) + (showFitted ? 1 : 0)}
                className="px-3 text-right text-sm text-muted-foreground"
              >
                Total
              </td>
              <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                {money(total)}
              </td>
              {!readOnly && <td aria-hidden />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export interface ServiceOrderSheetProps {
  order: ServiceOrder | null;
  mode?: "edit" | "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: ServiceOrder, next: ServiceOrder) => void;
  onCreate?: (draft: ServiceOrder) => void;
  /** The first real change on a new order — saves it as a Drafted row. */
  onCreateDraft?: (draft: ServiceOrder) => void;
  /** A ticket raised on site from the technician app — returns its number. */
  onCreateTicket?: (from: ServiceOrder, req: { assets: ServiceOrder["assets"]; fees: FeeLine[] }) => string;
  /**
   * The job stopped for a part. It is the screen's act rather than the
   * sheet's, because one of its two outcomes creates a SECOND order — and a
   * sheet cannot add a row to the list it was opened from.
   */
  onPartsPending?: (
    id: string,
    data: { labor: number; parts: PartLine[]; note?: string; mode?: ReturnMode }
  ) => void;
  customers: string[];
  /** Ship-tos for a chosen customer, and assets for a chosen ship-to. */
  shipTosFor: (customer: string) => string[];
  assetsFor: (shipTo: string) => { id: string; name: string; type: string }[];
  blankOrder: () => ServiceOrder;
  /** Open another order by its number — the related order's link. */
  onOpenOrder?: (orderNo: string) => void;
  /** "dispatch" = no technician app; "app" = with one. Fixes the setting. */
  flow?: "dispatch" | "app";
  /** Throw a draft away — the row goes. */
  onDiscard?: (id: string) => void;
}

export function ServiceOrderSheet({
  order,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
  onCreateDraft,
  onCreateTicket,
  onPartsPending,
  onOpenOrder,
  customers,
  shipTosFor,
  assetsFor,
  blankOrder,
  flow,
  onDiscard,
}: ServiceOrderSheetProps) {
  const cfg0 = useServiceSettings();
  const cfg = flow ? { ...cfg0, techApp: flow === "app" } : cfg0;
  /* THE NO-TECHNICIAN-APP FLOW (Pavan, 2026-09-25) — see DispatchFlow.tsx. */
  const dispatch = flow === "dispatch";
  const [techEmailOpen, setTechEmailOpen] = React.useState(false);
  const [onBehalfOpen, setOnBehalfOpen] = React.useState(false);
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  /* A rolled-over job's partial invoice (Pavan, 2026-09-25). */
  const [partialOpen, setPartialOpen] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const creating = mode === "create";
  const [draft, setDraft] = React.useState<ServiceOrder | null>(null);
  const [fieldOpen, setFieldOpen] = React.useState(false);
  const [quoteOpen, setQuoteOpen] = React.useState(false);
  const [holdOpen, setHoldOpen] = React.useState(false);
  /* THE FINAL BILL, after the work (Deepika, 2026-09-25). */
  const [billOpen, setBillOpen] = React.useState(false);
  /* SEND THE QUOTE WITH CREATE (Pavan, 2026-09-25) — a tick beside Create
     new order, so one press does both. */
  const [quoteOnCreate, setQuoteOnCreate] = React.useState(false);
  /* OPENED AS A NEW ORDER THIS TIME (Pavan, 2026-09-25). The sheet switches
     to edit mode once the draft is saved, so `creating` alone cannot say it;
     this holds for the whole visit and clears on close. While it is true the
     Record card is not shown — nobody has "raised" an order that is still
     being written, and its facts only mean something when it is revisited. */
  const [openedNew, setOpenedNew] = React.useState(false);
  React.useEffect(() => {
    if (!open) setOpenedNew(false);
    else if (creating) setOpenedNew(true);
  }, [open, creating]);
  /* BEING CREATED FOR THE WHOLE VISIT — the 756 creation sheet with no rail
     (Pavan, 2026-10-05), even after the first keystroke saves the draft. A
     Drafted order opened from the list gets the full sheet. */
  const newVisit = creating || openedNew;
  /* THE ROW JUST ADDED, so its first cell can take the cursor (DS ui §10f,
     "Rows"). Mount-only on the cell's side, so rows already there are never
     re-focused and this never needs clearing. */
  const [justAdded, setJustAdded] = React.useState<{ table: string; i: number } | null>(null);
  const isJustAdded = (table: string, i: number) =>
    justAdded?.table === table && justAdded.i === i;
  const lastSaved = React.useRef<string | null>(null);
  /* THE UNTOUCHED NEW FORM, so the first REAL change can be told apart from
     the form arriving; and whether that change has just been turned into a
     row, so the row coming back does not rebuild the form mid-keystroke. */
  const blankSerial = React.useRef<string | null>(null);
  const promoting = React.useRef(false);

  /* BUILD THE DRAFT ONCE PER RECORD, not once per save — the same rule the 3PL
     sheet follows, or the row coming back from the save rebuilds the form the
     reader is typing into. */
  React.useEffect(() => {
    if (!open) {
      setDraft(null);
      lastSaved.current = null;
      blankSerial.current = null;
      promoting.current = false;
      return;
    }
    if (creating) {
      const blank = blankOrder();
      blankSerial.current = JSON.stringify(blank);
      setDraft(blank);
      return;
    }
    if (!order) return;
    /* THE DRAFT JUST BECAME A ROW. Keep everything typed; take only what the
       screen gave it — its id, its number, its status and its log. */
    if (promoting.current) {
      promoting.current = false;
      setDraft((d) =>
        d ? { ...d, id: order.id, orderNo: order.orderNo, status: order.status, audit: order.audit } : { ...order }
      );
      return;
    }
    /* THE ROW COMING BACK FROM OUR OWN SAVE MUST NOT REBUILD THE FORM. It is
       the same object the reader is typing into; rebuilding it would move the
       caret and lose anything typed in the meantime. */
    if (lastSaved.current === JSON.stringify(order)) return;
    setDraft({ ...order });
    lastSaved.current = null;
  }, [open, creating, order, blankOrder]);

  const saveState = useDraftSaveState(draft, open && !creating);

  /* A JOB IS RUNNING BETWEEN THE TWO TIMESTAMPS, and only then. `startedAt`
     without `completedAt` is the one state where the elapsed figure is a
     moving number rather than a recorded one.

     IT IS READ HERE, ABOVE THE `if (!draft) return null`, because a hook
     cannot be called conditionally — placed beside the other derived values
     further down it sat after that early return and changed the hook order
     between a closed sheet and an open one. */
  const running = Boolean(draft?.startedAt) && !draft?.completedAt;
  const elapsed = useElapsedHours(running ? (draft?.startedAt ?? null) : null);

  /* THE ASSESSMENT IS HIGHLIGHTED ONCE when it first appears empty. */
  const [flashAssess, setFlashAssess] = React.useState(false);
  const assessShown =
    Boolean(draft) && (flow === "dispatch" ? Boolean(draft?.onBehalfAt) : Boolean(draft?.startedAt));
  const assessEmpty = !draft?.siteAssessment?.html;
  React.useEffect(() => {
    if (!assessShown || !assessEmpty) return;
    setFlashAssess(true);
    const t = window.setTimeout(() => setFlashAssess(false), 1600);
    return () => window.clearTimeout(t);
    // Once per appearance — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessShown]);

  /* AUTOSAVED, DEBOUNCED — the DS rule for every side sheet with editable
     fields in it (`docs/ds/ux/2-rules.md`, Side-sheet anatomy). A reader who
     has to remember to press Save is a reader who loses work. */
  /* A NEW ORDER IS SAVED AS A DRAFT ON ITS FIRST REAL CHANGE (Pavan,
     2026-09-23) — same debounce as every other save. */
  React.useEffect(() => {
    if (!creating || !onCreateDraft || !draft || promoting.current) return;
    if (JSON.stringify(draft) === blankSerial.current) return;
    const t = window.setTimeout(() => {
      promoting.current = true;
      onCreateDraft(draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, creating, onCreateDraft]);

  React.useEffect(() => {
    if (creating || !order || !draft) return;
    const serialised = JSON.stringify(draft);
    if (serialised === JSON.stringify(order)) return;
    const t = window.setTimeout(() => {
      lastSaved.current = serialised;
      onSave(order, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, order, creating, onSave]);

  /* PENDING SHOWS ON PRESS (Pavan, 2026-10-05). The primary is always
     pressable; pressed with something still missing, it raises the pending
     bar at the foot of the form instead of acting. Reset each time the sheet
     opens on a record. */
  const [pendingShown, setPendingShown] = React.useState(false);
  React.useEffect(() => {
    setPendingShown(false);
  }, [open, order?.id]);

  if (!draft) return null;

  const set = <K extends keyof ServiceOrder>(key: K, value: ServiceOrder[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const tech = technicianById(draft.technicianId);
  /* Minutes past midnight, which is the unit the DS's time slider speaks. */
  const scheduledMinutes = draft.scheduledAt
    ? new Date(draft.scheduledAt).getHours() * 60 +
      new Date(draft.scheduledAt).getMinutes()
    : 9 * 60;
  const keyOf = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  /* THE PRICE BOOK STILL SEEDS THE PARTS AND FEES; its explanatory line left
     the Asset card on 2026-09-23. The card is a table of assets, and a
     sentence about what one of them happens to cost is not a row of it. */
  const book = WORK_TYPES[draft.workType];
  void book;
  const shipTos = shipTosFor(draft.customer);
  const siteAssets = assetsFor(draft.shipTo);

  /* ── the asset rows ─────────────────────────────────────────────────────
     ONE WRITER, so the mirrored `assetId`/`workType`/`fault` on the order
     cannot drift from `assets[0]`. Every edit in the table goes through
     here. */
  const setAssetLine = (i: number, patch: Partial<ServiceAssetLine>) =>
    setDraft((x) =>
      x
        ? syncPrimaryAsset({
            ...x,
            assets: x.assets.map((r, j) => (j === i ? { ...r, ...patch } : r)),
          })
        : x
    );

  /* THE PRICE BOOK FOLLOWS THE WORK TYPE (Deepika and Pavan, 2026-09-25). A
     work type picked on a row brings the parts AND fees its price-book entry
     lists, once; a work type with no entry brings nothing. Lines already on
     the order are not doubled, and nothing is taken away when a work type is
     dropped — the list may have been edited since. */
  const addBookLines = (types: string[]) => {
    if (!cfg.priceBook) return;
    setDraft((x) => {
      if (!x) return x;
      const parts: PartLine[] = [];
      const fees: FeeLine[] = [];
      for (const w of types) {
        for (const p of WORK_TYPES[w]?.parts ?? [])
          if (!x.parts.some((q) => q.name === p.name) && !parts.some((q) => q.name === p.name))
            parts.push({ ...p });
        for (const f of WORK_TYPES[w]?.fees ?? [])
          if (!x.fees.some((q) => q.name === f.name) && !fees.some((q) => q.name === f.name))
            fees.push({ ...f });
      }
      return parts.length + fees.length > 0
        ? { ...x, parts: [...x.parts, ...parts], fees: [...x.fees, ...fees] }
        : x;
    });
  };

  /* WHO MAY EDIT WHAT, BY STAGE. Intake is the dispatcher's until the job
     starts; the work is the technician's while it is running; past approval
     the record is what was billed and nothing on it moves. */
  const intakeLocked = !isUnassigned(draft.status) && draft.status !== "Assigned";
  /* NO-APP FLOW: the dispatcher is recording the job once "Job completed"
     is confirmed; once the job is marked completed nothing moves. */
  const recording = dispatch && Boolean(draft.onBehalfAt) && draft.status === "Ongoing";
  const dispatchDone =
    dispatch &&
    (LANE_OF[draft.status] === "Completed" ||
      LANE_OF[draft.status] === "Synced" ||
      draft.status === "Cancelled");
  const workLocked = dispatch
    ? dispatchDone
    : isRecorded(draft.status) || draft.status === "Cancelled";
  /** The work table: editable at intake, and again while recording. */
  const assetsLocked = dispatch ? dispatchDone || (!recording && intakeLocked) : intakeLocked;
  /* PAST THE VISIT, THE RECORD IS WHAT WAS BILLED. Both the Completed lane
     and the Synced lane are past it. */
  const billed =
    LANE_OF[draft.status] === "Completed" || LANE_OF[draft.status] === "Synced";

  /* THE DISPATCHER SETS THE FEES AT INTAKE; the technician adds to them on
     site. Labour and mileage are not fees and never appear at intake — nobody
     knows them yet. */
  const setLine = (
    field: "parts" | "fees" | "extraCharges" | "unavailableParts",
    i: number,
    patch: Record<string, unknown>
  ) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            [field]: ((d[field] ?? []) as (PartLine | FeeLine)[]).map((r, j) =>
              j === i ? { ...r, ...patch } : r
            ),
          }
        : d
    );
  const addLine = (field: "parts" | "fees" | "extraCharges" | "unavailableParts") => {
    if (draft) setJustAdded({ table: field, i: ((draft[field] ?? []) as unknown[]).length });
    setDraft((d) =>
      d
        ? {
            ...d,
            [field]:
              field === "parts" || field === "unavailableParts"
                ? [...((d[field] ?? []) as PartLine[]), { name: "", qty: 1, cost: 0 }]
                : [...(d[field] as FeeLine[]), { name: "", amount: 0 }],
          }
        : d
    );
  };
  const removeLine = (field: "parts" | "fees" | "extraCharges" | "unavailableParts", i: number) =>
    setDraft((d) =>
      d
        ? { ...d, [field]: ((d[field] ?? []) as unknown[]).filter((_, j) => j !== i) }
        : d
    );

  const advance = (status: WorkStatus, patch: Partial<ServiceOrder> = {}) =>
    setDraft((d) => (d ? { ...d, ...patch, status } : d));

  /**
   * WHAT THIS ORDER STILL NEEDS.
   *
   * The starred fields, plus the technician — which is not starred because it
   * is optional on a job that is going into the yard team's queue, and
   * mandatory only for the act that takes the order out of Open. Each label is
   * the INSTRUCTION, not the field name: "Choose a customer" tells somebody
   * what to do, "Customer" tells them what they are looking at.
   */
  const mandatory = [
    {
      key: "customer",
      label: "Choose a customer",
      done: Boolean(draft.customer),
      target: SECTION_ASSET,
    },
    {
      key: "shipTo",
      label: "Choose a ship-to site",
      done: Boolean(draft.shipTo),
      target: SECTION_ASSET,
    },
    /* THE SCHEDULING WINDOW IS MANDATORY (Deepika and Pavan, 2026-09-24):
       customer, ship-to, window and technician are the whole required set. */
    {
      key: "window",
      label: "Set the scheduling window",
      done: Boolean(draft.scheduledAt) && draft.windowEndMin != null,
      target: SECTION_SCHEDULE,
    },
    /* ASSET AND WORK TYPE LEFT THIS LIST ON 2026-09-23, because they left the
       mandatory set. A job can exist knowing only the customer and the fault,
       which is what a phone call actually gives you — and a strip that keeps
       asking for them would be asking for something the form no longer
       requires. */
    ...(isUnassigned(draft.status)
      ? [
          {
            key: "tech",
            label: "Assign a technician",
            done: Boolean(draft.technicianId),
            /* ITS OWN CARD SINCE 2026-09-23, so the strip can land on the
               question rather than on the two dates above it. */
            target: SECTION_TECH,
          },
        ]
      : []),
  ];
  /**
   * WHAT STILL STOPS THIS JOB BEING CALLED DONE (Pavan, 2026-09-23).
   *
   * COMPLETION IS THE PRESS THAT TURNS WORK INTO MONEY, so it is the one act
   * on this sheet worth gating. Each line is an INSTRUCTION rather than a
   * field name, and the order is the order somebody would fix them in.
   *
   * THE RATE IS ON THE LIST because labour without a rate is hours nobody can
   * invoice, and it is the field most likely to be left at whatever the last
   * job used.
   */
  const completionMissing = [
    !draft.startedAt && "Start the work before completing it.",
    draft.labor <= 0 && "Record how long the job took.",
    draft.laborRate <= 0 && "Set what an hour costs on this job.",
    !draft.technicianId && "Say who did the work.",
  ].filter(Boolean) as string[];

  /* NO TECHNICIAN APP, SO DISPATCH RUNS THE JOB (Deepika and Pavan,
     2026-09-25). The acts come out of the ··· and up front: Send quote is the
     primary and Start work sits beside it; once the quote is out, the primary
     becomes Mark as completed. With the app on they stay in the ···, because
     the technician is the one running the job. */
  const upfront = !cfg.techApp && !dispatch;
  const preStart =
    (draft.status === "Assigned" || draft.status === "Yet to start") && !draft.startedAt;
  /** The primary is the quote, not completion. */
  const quoteFirst = upfront && preStart && !draft.quote;

  /**
   * THE STRIP SAYS WHAT THE PRIMARY IS WAITING ON — whatever the primary
   * currently is (DS: the footer's three slots).
   *
   * IT WAS SAYING "EVERYTHING IS FILLED IN" BESIDE A DEAD BUTTON. Once
   * dispatch could complete a job, the primary on a workable order became
   * *Mark as completed* with its own requirements, and the strip was still
   * reporting on the CREATION set — so the one place that exists to explain a
   * disabled primary was cheerfully reporting all clear. The strip follows
   * the act, not the form.
   */
  const pendingSteps = quoteFirst || (dispatch && !isUnassigned(draft.status))
    ? []
    : isWorkable(draft.status)
    ? completionMissing.map((label, i) => ({
        key: `done-${i}`,
        label,
        target: SECTION_SCHEDULE,
      }))
    : mandatory.filter((x) => !x.done);

  /* ────────────────────────────────────────── the footer's ladder ───── */

  const nowIso = () => new Date().toISOString();

  /** Approval and billing in one act, because settings decide both. */
  const approveNow = () => {
    const at = nowIso();
    advance("Completed", {
      invoiceCreated: cfg.nativeBilling,
      invoicedAt: cfg.nativeBilling ? at : null,
    });
    toast.success(
      cfg.nativeBilling
        ? `${draft.orderNo} approved — invoice generated`
        : `${draft.orderNo} approved`,
      {
        description: cfg.nativeBilling
          ? "It will reach accounting on the next sync."
          : "Costs are captured. Generate the invoice when you are ready.",
      }
    );
  };


  /**
   * RECORDING THE WORK — from the sheet, and from the technician's app, which
   * is why it is a function and not an inline handler.
   */
  const completeNow = () => {
    const at = nowIso();
    /* CLOSING THE OPEN VISIT IS WHAT FINISHES THE JOB. If somebody completes
       an order that was never started — a job done off the app and typed up
       afterwards — a visit is opened and closed in the same breath, because a
       job with hours and no trip is a record nobody can audit. */
    const visits =
      draft.visits.length > 0 &&
      draft.visits[draft.visits.length - 1].endedAt === null
        ? draft.visits.map((v, i) =>
            i === draft.visits.length - 1 ? { ...v, endedAt: at } : v
          )
        : [
            ...draft.visits,
            {
              startedAt: draft.startedAt ?? draft.arrivedAt ?? at,
              endedAt: at,
              technicianId: draft.technicianId,
              override: null,
            },
          ];
    const patch = {
      arrivedAt: draft.arrivedAt ?? at,
      ...syncVisits({ visits, laborOverride: draft.laborOverride }),
      signed: true,
      partNeeded: null,
    };
    if (cfg.managerApproval) {
      advance("Needs approval", patch);
      toast.success(`${draft.orderNo} recorded — sent for approval`);
    } else {
      advance("Completed", {
        ...patch,
        invoiceCreated: cfg.nativeBilling,
        invoicedAt: cfg.nativeBilling ? at : null,
      });
      toast.success(
        cfg.nativeBilling
          ? `${draft.orderNo} complete — invoice generated`
          : `${draft.orderNo} complete and approved`
      );
    }
  };

  /**
   * EVERYTHING ELSE A DISPATCHER CAN DO AT THIS STAGE — the footer's ···.
   *
   * NOT THE NEXT ACT, AND NOT NOTHING. Starting the work, handing it to the
   * technician's app and pricing it for the customer are all real acts a
   * dispatcher takes; none of them is the ONE thing that moves the record on,
   * which is what the primary is for. A button each would turn the footer
   * into a toolbar and make the primary just another control on it.
   */
  /** From dispatch, arrival and start are one press — see the ··· note. */
  const startWork = () => {
    /* A PRESS OPENS A VISIT. `startedAt` is its mirror and is written by
       `syncVisits`, never by hand. */
    advance("Ongoing", {
      arrivedAt: draft.arrivedAt ?? nowIso(),
      ...syncVisits({
        laborOverride: draft.laborOverride,
        visits: [
          ...draft.visits,
          {
            startedAt: nowIso(),
            endedAt: null,
            technicianId: draft.technicianId,
            override: null,
          },
        ],
      }),
    });
    toast.success(`${draft.orderNo} — work started`);
  };

  /* THE QUOTE IS BEFORE THE WORK (Deepika, 2026-09-25) — once work has
     started there is nothing to quote; what is left is the final bill. */
  const canQuote =
    !creating &&
    Boolean(draft.customer) &&
    !draft.startedAt &&
    !isRecorded(draft.status) &&
    draft.status !== "Awaiting approval" &&
    !draft.quote?.approvedAt;

  const sheetActs: { label: string; onSelect: () => void }[] = [];
  if (preStart && !upfront && !dispatch) sheetActs.push({ label: "Start work", onSelect: startWork });
  /* A DRAFT SENDS ITS QUOTE WITH THE TICK BESIDE CREATE, not from here. */
  if (canQuote && !quoteFirst && draft.status !== "Drafted")
    sheetActs.push({
      label: draft.quote?.rejectedAt
        ? "Send revised quote"
        : draft.quote
          ? "Resend quote to customer"
          : "Send quote to customer",
      onSelect: () => setQuoteOpen(true),
    });
  if (cfg.techApp && isWorkable(draft.status))
    sheetActs.push({
      label:
        draft.status === "Assigned"
          ? "Open technician app"
          : "Resume in technician app",
      onSelect: () => setFieldOpen(true),
    });
  /* CANCEL, IN THE ··· (Pavan, 2026-09-25) — from Open (unassigned, drafts
     included) through Job day, confirmed. Recorded work cannot be cancelled.
     IN THE HEADER'S ···, as on 3PL (Pavan, 2026-10-07) — an act on the
     record, not on the work. */
  const cancellable =
    !creating &&
    !!order &&
    (isUnassigned(draft.status) ||
      ["Assigned", "Yet to start", "Ongoing", "Awaiting approval"].includes(draft.status));
  /* THE INVOICE THE CUSTOMER HAS, as a file (Pavan, 2026-09-25). */
  if (dispatch && draft.status === "Awaiting approval")
    sheetActs.push({ label: "Download invoice", onSelect: () => downloadInvoice(draft) });
  /* DISCARD A DRAFT (2026-09-25) — autosave keeps every draft otherwise.
     Header ···, beside Cancel order (Pavan, 2026-10-07). */
  const discardable = draft.status === "Drafted" && !!order && !!onDiscard;

  /* THE FINAL BILL, once the work is recorded — the full amount, labour
     included (Deepika, 2026-09-25). */
  if (!creating && isRecorded(draft.status) && !dispatch)
    sheetActs.push({
      label: draft.finalBillSentAt ? "Resend final bill to customer" : "Send final bill to customer",
      onSelect: () => setBillOpen(true),
    });

  /* SAVE AS DRAFT (Pavan, 2026-09-25) — the secondary beside Move to
     Assigned. The sheet autosaves anyway; this is the explicit way out that
     says the order is parked, not lost. */
  const isDraft = creating || draft.status === "Drafted";
  const saveAsDraft = () => {
    if (order) onSave(order, draft);
    else if (creating && onCreateDraft && JSON.stringify(draft) !== blankSerial.current)
      onCreateDraft(draft);
    if (order || JSON.stringify(draft) !== blankSerial.current)
      toast.success(`${order?.orderNo ?? "Order"} saved as a draft`);
    onOpenChange(false);
  };

  /* ── THE NO-APP LADDER'S ACTS ─────────────────────────────────────────── */
  const unavailable = (draft.unavailableParts ?? []).filter((p) => p.name.trim());
  const shortfallChoice = draft.shortfallChoice ?? "neworder";
  /** Everything needed, owed marked as not fitted — what `resolveShortfall` reads. */
  const withOwed = () => [
    ...draft.parts.map((p) => ({ ...p, fittedQty: p.qty })),
    ...unavailable.map((p) => ({ ...p, fittedQty: 0 })),
  ];
  /** Sending the email is what moves the order to Assigned. */
  const sendToTechnician = () => {
    const next = {
      ...draft,
      status: "Assigned" as WorkStatus,
      techEmailedAt: nowIso(),
      ...(quoteOnCreate ? { quote: buildQuote(draft) } : {}),
    };
    if (order) onSave(order, next);
    toast.success(`${draft.orderNo} assigned — details emailed to ${technicianById(draft.technicianId)?.name ?? "the technician"}`);
    onOpenChange(false);
  };
  /** Completed — and the follow-up order, when parts were missing. */
  const completeDispatch = () => {
    const at = nowIso();
    const done = {
      ...draft,
      status: "Completed" as WorkStatus,
      completedAt: at,
      invoiceCreated: true,
      invoicedAt: draft.invoicedAt ?? at,
    };
    if (unavailable.length > 0 && order) {
      onSave(order, done);
      onPartsPending?.(draft.id, { labor: draft.labor, parts: withOwed(), mode: "neworder" });
      onOpenChange(false);
      return;
    }
    setDraft(done);
    toast.success(`${draft.orderNo} completed`);
  };
  const rollOver = (partialSent = false) => {
    if (!order) return;
    const parts = withOwed();
    onSave(order, {
      ...draft,
      parts,
      unavailableParts: [],
      onBehalfAt: null,
      partialInvoiceSentAt: partialSent ? nowIso() : draft.partialInvoiceSentAt ?? null,
    });
    onPartsPending?.(draft.id, { labor: draft.labor, parts, mode: "rollover" });
    onOpenChange(false);
  };

  const nextAct: { label: string; onSelect: () => void; why?: string } = (() => {
    /* THE NO-TECHNICIAN-APP LADDER (Pavan, 2026-09-25). */
    if (dispatch && draft.status === "Drafted")
      return {
        label: "Move to Assigned",
        why: mandatory.find((x) => !x.done)?.label,
        onSelect: () => setTechEmailOpen(true),
      };
    if (dispatch && (draft.status === "Assigned" || draft.status === "Yet to start"))
      return { label: "Job completed", onSelect: () => setOnBehalfOpen(true) };
    if (dispatch && draft.status === "Ongoing")
      return unavailable.length > 0 && shortfallChoice === "rollover"
        ? /* A ROLLED-OVER JOB CAN SHARE A PARTIAL INVOICE (Pavan, 2026-09-25)
             for the work done so far; the rest follows the next visit. */
          { label: "Partial invoice & roll over", onSelect: () => setPartialOpen(true) }
        : { label: "Send invoice to customer", onSelect: () => setInvoiceOpen(true) };
    if (dispatch && draft.status === "Awaiting approval")
      return { label: "Mark as completed", onSelect: () => setCompleteOpen(true) };
    if (dispatch && dispatchDone && draft.status !== "Cancelled")
      return {
        label: "Download invoice",
        onSelect: () => downloadInvoice(draft),
      };
    if (draft.status === "Cancelled")
      return {
        label: "Reopen",
        onSelect: () => advance("Drafted", { technicianId: null }),
      };
    if (isUnassigned(draft.status))
      /* OPEN IS THIS MODULE'S DRAFT, so its act has the same name as the one
         3PL uses to get out of Draft: the job exists the moment it is reported,
         and this is where somebody says it is real work with a name against
         it. "Assign technician" named the field it needs rather than the thing
         it does — the technician is the precondition, the act is committing
         the order. */
      /* THE LANE'S WHOLE MEANING IS "NOBODY IS ON IT", so the act that
         leaves it is putting somebody on it (Pavan, 2026-09-23). It used to
         say "Create Service Order", which named the record rather than the
         act — and on a Parts-pending remainder or a linked order the record
         already exists, so creating it again is a sentence that does not
         parse. */
      /* A DRAFT IS COMMITTED BY "CREATE NEW ORDER" (Pavan, 2026-09-23): dead
         until every required detail is in, and the press moves it to
         Assigned. Saved at once rather than on the debounce, because the
         sheet closes on it. A Parts-pending remainder or a linked order
         already exists, so for those the act is still naming somebody. */
      return draft.status === "Drafted"
        ? {
            label: "Move to Assigned",
            why: mandatory.find((x) => !x.done)?.label,
            onSelect: () => {
              const next = {
                ...draft,
                status: "Assigned" as WorkStatus,
                ...(quoteOnCreate ? { quote: buildQuote(draft) } : {}),
              };
              if (order) onSave(order, next);
              toast.success(
                quoteOnCreate
                  ? `${draft.orderNo} created — quote sent to ${draft.customer}`
                  : `${draft.orderNo} created and assigned`
              );
              onOpenChange(false);
            },
          }
        : {
            label: "Assign a technician",
            why: draft.technicianId ? undefined : "Choose a technician first.",
            onSelect: () => advance("Assigned"),
          };
    /* THE FIELD APP IS WHERE THE TECHNICIAN WORKS. IT IS NOT THE ONLY PLACE
       THE WORK CAN BE RECORDED (Pavan, 2026-09-23).

       This REVERSES the 2026-09-21 rule, which made the sheet hand the job
       over and stop. The reasoning then was that the person holding the job is
       standing in front of the asset — true, and beside the point: a
       technician rings in, a job is done off the app, a customer wants a price
       before anyone travels. Dispatch has always been able to do these things
       on the phone; the sheet was the only thing pretending otherwise.

       So the sheet keeps the whole ladder and the technician's app becomes a
       convenience rather than a gate. "Open technician app" moves to the ···,
       where it belongs: a thing you can do, not the thing to do. */
    if (quoteFirst)
      return { label: "Send quote to customer", onSelect: () => setQuoteOpen(true) };
    if (draft.status === "Assigned")
      return {
        /* MARK AS COMPLETED, NOT "START WORK" — starting is in the ···, where
           it is one press among several, because by the time a job is Assigned
           the interesting question is whether it is finished. */
        label: "Mark as completed",
        why: completionMissing.length > 0 ? completionMissing[0] : undefined,
        onSelect: completeNow,
      };
    if (isWorkable(draft.status)) {
      return {
        label:
          draft.status === "Parts pending"
            ? "Resume and complete"
            : "Mark as completed",
        why: completionMissing.length > 0 ? completionMissing[0] : undefined,
        onSelect: completeNow,
      };
    }
    if (draft.status === "Needs approval")
      return { label: "Approve", onSelect: approveNow };
    if (draft.status === "Completed" && !draft.invoiceCreated)
      return {
        label: "Generate invoice",
        onSelect: () => {
          advance("Yet to be reviewed", { invoiceCreated: true, invoicedAt: nowIso() });
          toast.success(`${draft.orderNo} invoice generated`);
        },
      };
    if (draft.status === "Completed")
      return {
        label: "Mark synced to accounting",
        onSelect: () => advance("Reviewed", { synced: true }),
      };
    return {
      label: "Download invoice",
      onSelect: () => downloadInvoice(draft),
    };
  })();

  /* THE REASON THE BUTTON IS DEAD SITS BESIDE IT, never on it. A label that
     states a condition asks the reader to press a fact. */
  const blockedWhy =
    draft.status === "Drafted"
      ? nextAct.why
      : isUnassigned(draft.status) && !draft.technicianId
      ? "Choose a technician before proceeding."
      : /* COMPLETION IS GATED WHEREVER IT IS OFFERED (Pavan, 2026-09-23). It
           used to be exempt while the field app held the job, on the grounds
           that the hours were recorded there — but dispatch can complete a job
           now, so the gate has to be true on this screen too. */
        isWorkable(draft.status) && !quoteFirst && !dispatch && completionMissing.length > 0
        ? completionMissing[0]
        : nextAct.why;

  /* ─────────────────────────────────────────────── the money, worked out ── */

  const partsSum = partsTotal(draft.parts);
  const laborSum = draft.labor * draft.laborRate;
  const feesSum = feesTotal(draft.fees);
  const extraSum = feesTotal(draft.extraCharges);

  /* ── WHAT A QUOTE SAYS, AND HOW MUCH OF IT IS A GUESS ──────────────────
     FIRM is what is already priced: the parts and the fees off the book.
     ESTIMATED is what the visit will add — and the estimate has to come from
     somewhere a customer could be told, so it is whatever has been recorded
     already, or the house assumptions when nothing has. */
  /* THE DEBT AS A SENTENCE, recomputed as the technician types — it is both
     the gate on the button and the thing the panel above it says. */
  const heldShortfall = shortfallLabel(draft.parts);


  /* THE QUOTE IS THE FIXED PART (Deepika, 2026-09-25): parts, fees and the
     labour RATE. Hours and miles are not known before the work and land on
     the final bill. */
  const quoteFirm = partsSum + feesSum;
  const buildQuote = (d: ServiceOrder) => ({
    parts: d.parts.map((x) => ({ ...x })),
    fees: d.fees.map((x) => ({ ...x })),
    total: partsTotal(d.parts) + feesTotal(d.fees),
    laborRate: d.laborRate,
    sentAt: nowIso(),
    approvedAt: null,
  });
  /** The clock's figure, before anybody typed over it. */
  const measuredLabor = syncVisits({ visits: draft.visits }).labor;
  const setLaborTyped = (hours: number | null) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            laborOverride: hours,
            labor: hours ?? syncVisits({ visits: d.visits }).labor,
          }
        : d
    );
  const laborH = Math.floor(draft.labor);
  const laborM = Math.round((draft.labor - laborH) * 60);
  const total = orderTotal(draft);
  const quoteGap = draft.quote ? total - draft.quote.total : 0;

  /* CUSTOMER DETAILS AND A TECHNICIAN — NOTHING ELSE (Pavan, 2026-09-23).
     It used to demand an asset, which had already left the mandatory set
     that morning, and never asked for the technician the strip below was
     asking for — so the button and the strip disagreed about what was
     missing. It is now exactly the strip's list: customer, ship-to (both in
     the Customer card), technician. Asset, work type, fault and the rest can
     be filled in later. */
  const readyToCreate = mandatory.every((x) => x.done);

  const sources = [...INTAKE_SOURCES, ...(cfg.portalIntake ? [PORTAL_SOURCE] : [])];

  /* THE SITE ASSESSMENT — rich text, plus the technician's photos uploaded
     by whoever records it (Pavan and Deepika, 2026-09-25). */
  const assessLocked = dispatch ? dispatchDone : billed;
  const setAssessment = (patch: Partial<NonNullable<ServiceOrder["siteAssessment"]>>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            siteAssessment: { html: "", photos: [], submittedAt: null, ...d.siteAssessment, ...patch },
          }
        : d
    );
  const photos = draft.siteAssessment?.photos ?? [];
  const assessmentSection = (
    <SheetSection
      title="Site assessment"
      /* HIGHLIGHTED ONCE when it first appears, empty — it is the first
         thing to add (Pavan, 2026-09-25). */
      className={cn(
        "transition-shadow duration-700",
        flashAssess && "ring-2 ring-primary/60"
      )}
    >
      <RichText
        key={draft.id}
        desktop
        disabled={assessLocked}
        initial={draft.siteAssessment?.html ?? ""}
        placeholder="What was found on site"
        onChange={(html) => setAssessment({ html })}
      />
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((src, i) => (
          <span key={`${src}-${i}`} className="group/ph relative">
            <img src={src} alt={`Site photo ${i + 1}`} className="size-16 rounded-md border border-fp-outline-1 object-cover" />
            {!assessLocked && (
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setAssessment({ photos: photos.filter((_, j) => j !== i) })}
                className="absolute -top-1.5 -right-1.5 hidden size-5 items-center justify-center rounded-full border border-border bg-card text-xs text-muted-foreground group-hover/ph:flex hover:text-destructive"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!assessLocked && (
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground hover:bg-accent">
            <ImagePlus className="size-4" />
            Upload photos
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length)
                  setAssessment({ photos: [...photos, ...files.map((f) => URL.createObjectURL(f))] });
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </SheetSection>
  );

  return (
    <RecordSheet
      /* THE SIZE THAT EXISTS FOR EXACTLY THIS SHAPE: tables on the left, a
         fixed rail on the right. The rail costs the tables 340px plus a gap,
         and at `wide` that came straight out of columns already at their
         minimum — a parts table whose Amount column wraps is a table nobody
         can add up by eye. */
      /* TWO COLUMNS ONLY ONCE IT EXISTS — while it is being created there is
         no rail, so it takes the creation floor (756) instead of filling. */
      size={newVisit ? "narrow" : "xxwide"}
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Service order: ${draft.orderNo}`}
      createTitle="New service order"
      createAction="Create new order"
      canSubmit={readyToCreate}
      /* AUTOSAVED, so Cancel is a promise the sheet cannot keep. */
      /* AUTOSAVED, so Cancel is a promise the sheet cannot keep — it would
         claim to undo what has already been kept. Close is the honest exit. */
      showCancel={false}
      headerAside={
        creating ? undefined : (
          <span className="flex items-center gap-2">
            <StatusChip tone={WORK_STATUS_TONE[draft.status]}>{draft.status}</StatusChip>
            {/* ROLLED OVER FOR PARTS (Deepika, 2026-09-24) — not a normal
                Assigned order, and the header says so. */}
            {draft.partNeeded && (draft.status === "Assigned" || draft.status === "Ongoing") && (
              <StatusChip tone={WORK_STATUS_TONE["Parts pending"]}>Parts pending</StatusChip>
            )}
            {draft.priority !== "Normal" && (
              <Pill kind={draft.priority === "Urgent" ? "critical" : "neutral"}>
                {draft.priority}
              </Pill>
            )}
            {saveState !== "idle" && (
              <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
            )}
          </span>
        )
      }
      /* ACTS ON THE RECORD, as on 3PL (Pavan, 2026-10-07): cancelling and
         discarding end the order, so they sit behind the header's ···, not
         beside the footer's next act. */
      headerMenu={
        cancellable || discardable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More order actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
              {discardable && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmDiscard(true);
                  }}
                >
                  <Trash2 />
                  Discard draft
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      headerSubtitle={
        creating
          ? undefined
          : /* Only what is known — work type and asset can be blank now. */
            [draft.workType, draft.assetName, draft.shipTo].filter(Boolean).join(" · ")
      }
      /* THE STRIP ABOVE THE FOOTER SAYS WHAT THE ACT IS WAITING ON. A
         Parts-pending job no longer gets its own "Waiting on a part" line here
         (Pavan, 2026-09-23): the status says it, and the Parts table's Fitted
         column says which. */
      footerBanner={
        pendingShown && (
        <PendingStrip
            tone="caution"
          pending={pendingSteps}
          clearLabel={
            draft.status === "Drafted"
              ? "All details are collected. Move to Assigned."
              : "Everything this order needs is filled in"
          }
        />
        )
      }
      /* THE SECOND OUTCOME OF A VISIT, in the slot for decisions taken at the
         moment of committing. A technician does not know which of the two it
         will be until the work is in front of them, so both live at the foot
         of the same form — the primary is the one that finishes the job, and
         this is the one that admits it cannot be finished today. */
      footerAside={
        draft.status === "Drafted" && draft.customer ? (
          /* ONE PRESS, BOTH ACTS (Pavan, 2026-09-25): ticked, Create new
             order also sends the quote. */
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
            <Checkbox
              checked={quoteOnCreate}
              onCheckedChange={(v) => setQuoteOnCreate(v === true)}
            />
            Send quote to customer
          </label>
        ) : recording && unavailable.length > 0 ? (
          /* PARTS NOT AVAILABLE — WHAT HAPPENS TO THEM (Pavan, 2026-09-25),
             in the bottom bar beside the act it changes. */
          <RadioGroup
            value={shortfallChoice}
            onValueChange={(v) => set("shortfallChoice", v as "neworder" | "rollover")}
            className="flex items-center gap-5"
            aria-label="Parts not available"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value="neworder" /> Create new order
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value="rollover" /> Rollover
            </label>
          </RadioGroup>
        ) : draft.status === "Ongoing" && onPartsPending && !dispatch ? (
          <Button variant="outline" onClick={() => setHoldOpen(true)}>
            Some parts unavailable
          </Button>
        ) : undefined
      }
      footerPrimary={
        blockedWhy ? (
          /* THE REASON IS ON THE BUTTON, NOT BESIDE IT.
             A clause standing permanently next to the primary is a sentence
             the reader has to read on every visit to the sheet, including the
             ones where nothing is wrong — and at the foot of a long form it
             read as part of the button's label. It belongs to the press: the
             button is dead, pressing it says why, and the sheet is quiet the
             rest of the time.

             THE WRAPPER IS WHAT MAKES A DISABLED BUTTON HOVERABLE. A disabled
             control fires no pointer events of its own, so the tooltip would
             never open on the one state it exists for. */
          <div className="flex items-center gap-2">
            {/* THE MENU STAYS WHEN THE PRIMARY IS DEAD — and it matters most
                then, because the act that UNBLOCKS the primary is usually in
                it. A footer that empties out when the button greys leaves the
                reader with nothing to press and no way forward. */}
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
            {upfront && preStart && (
              <Button variant="outline" onClick={startWork}>
                Start work
              </Button>
            )}
            {isDraft && (
              <Button variant="outline" onClick={saveAsDraft}>
                Save as Draft
              </Button>
            )}
            {/* PRESSABLE, AND PRESSING SAYS WHAT IS MISSING — it raises the
                pending bar rather than acting (2026-10-05). */}
            <Button onClick={() => setPendingShown(true)}>{nextAct.label}</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* THE ··· BESIDE THE PRIMARY (Pavan, 2026-09-23).

                THE PRIMARY IS STILL ONE THING — the next act, and only the
                next act. What goes here is everything ELSE a dispatcher can
                legitimately do at this stage: start the work, hand it to the
                technician's app, price it for the customer. They are real
                acts, they are not the next one, and a second button for each
                would make the footer a toolbar.

                IT SITS LEFT OF THE PRIMARY, not in the header. The header's
                ··· is for acts on the RECORD — cancelling or discarding it
                (2026-10-07). These are acts on the WORK, which is what the
                footer is about. */}
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
            {upfront && preStart && (
              <Button variant="outline" onClick={startWork}>
                Start work
              </Button>
            )}
            {isDraft && (
              <Button variant="outline" onClick={saveAsDraft}>
                Save as Draft
              </Button>
            )}
            <Button onClick={nextAct.onSelect}>{nextAct.label}</Button>
          </div>
        )
      }
      onSubmit={() => {
        if (creating && onCreate) onCreate(draft);
      }}
    >
      {/* ── TWO COLUMNS: WHAT YOU FILL IN, AND WHAT THAT MAKES ───────────── */}
      <div className={cn("grid items-start gap-6", !newVisit && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="flex min-w-0 flex-col gap-10">
      {/* NO-APP FLOW: THE ASSESSMENT IS THE FIRST THING RECORDED (Pavan,
          2026-09-25), so it leads the form once "Job completed" is confirmed. */}
      {/* A REJECTED QUOTE IS FLAGGED, NOT CANCELLED (Pavan and Deepika,
          2026-09-25): revise the work or prices, then send a revised quote. */}
      {draft.quote?.rejectedAt && !draft.quote.approvedAt && (
        <div className="-mb-6 flex items-center gap-2 rounded-md border border-status-failed/30 bg-status-failed/10 p-3">
          <CircleAlert className="size-4 shrink-0 text-status-failed" />
          <span className="flex-1 text-sm font-medium text-foreground">Quote rejected — needs revision</span>
          {canQuote && (
            <Button size="sm" variant="outline" onClick={() => setQuoteOpen(true)}>
              Send revised quote
            </Button>
          )}
        </div>
      )}

      {/* WITH THE APP, AFTER START WORK — also at the top (Deepika and
          Pavan, 2026-09-25); never before, so Assigned and Working differ. */}
      {!creating && (dispatch ? Boolean(draft.onBehalfAt) : Boolean(draft.startedAt)) && assessmentSection}

      {/* ──────────────────────────────────── customer, site and asset ───── */}
      {/* ── CUSTOMER DETAILS ────────────────────────────────────────────
          SPLIT FROM THE ASSETS (Pavan, 2026-09-23). One card asked two
          questions that scale differently: WHO and WHERE is answered once,
          and WHAT IS BROKEN is answered as many times as there are assets on
          the site. A card that holds both grows one of them and not the
          other, and the growing half ends up wearing the fixed half's
          layout. */}
      <SheetSection
        id={SECTION_ASSET}
        title="Customer details"
        note={
          <SheetSectionNote label="Why it cascades">
            <p className="text-foreground">Customer, then site.</p>
            <p className="mt-1.5 text-muted-foreground">
              The site decides which assets can be on the job at all, which is
              why it is answered before them and in its own card.
            </p>
          </SheetSectionNote>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer" required>
            <Combobox
              className="w-full"
              value={draft.customer}
              onValueChange={(v) => {
                /* THE SITE AND THE ASSETS FALL WITH THE CUSTOMER. A ship-to
                   belonging to the old customer is worse than an empty one. */
                setDraft((x) =>
                  x
                    ? syncPrimaryAsset({
                        ...x,
                        customer: v,
                        shipTo: "",
                        poc: null,
                        assets: [blankAssetLine()],
                      })
                    : x
                );
              }}
              options={customers}
              placeholder="Choose a customer"
              searchPlaceholder="Search customers…"
              disabled={intakeLocked}
            />
          </SheetField>
          <SheetField label="Ship-to" required>
            <Combobox
              className="w-full"
              value={draft.shipTo}
              onValueChange={(v) =>
                setDraft((x) =>
                  x
                    ? syncPrimaryAsset({
                        ...x,
                        shipTo: v,
                        assets: [blankAssetLine()],
                      })
                    : x
                )
              }
              options={shipTos}
              placeholder={draft.customer ? "Choose a site" : "Choose a customer first"}
              searchPlaceholder="Search sites…"
              disabled={intakeLocked || !draft.customer}
            />
          </SheetField>
          {/* THE CUSTOMER'S POINT OF CONTACT (Deepika, 2026-09-25) — the quote
              and the invoice go to them. */}
          <SheetField label="Point of contact">
            <Combobox
              className="w-full"
              value={draft.poc?.name ?? ""}
              onValueChange={(v) =>
                set("poc", contactsFor(draft.customer).find((c) => c.name === v) ?? null)
              }
              options={contactsFor(draft.customer).map((c) => ({ value: c.name, description: c.email }))}
              placeholder={draft.customer ? "Choose a contact" : "Choose a customer first"}
              searchPlaceholder="Search contacts…"
              clearLabel="No contact"
              disabled={intakeLocked || !draft.customer}
            />
          </SheetField>
          {/* INTAKE JOINED THIS CARD (Pavan, 2026-09-25) — one unit for who,
              where, how it came in and how urgent. */}
          <SheetField label="Intake source" required>
            <Combobox
              className="w-full"
              value={draft.source}
              onValueChange={(v) => set("source", v as ServiceOrder["source"])}
              options={sources}
              placeholder="Select source"
              disabled={intakeLocked}
            />
          </SheetField>
          <SheetField label="Priority" required>
            <Combobox
              className="w-full"
              value={draft.priority}
              onValueChange={(v) => set("priority", v as ServiceOrder["priority"])}
              options={[...PRIORITIES]}
              placeholder="Select priority"
              disabled={intakeLocked}
            />
          </SheetField>
        </div>
      </SheetSection>

      {/* THE WATERFALL (Deepika, 2026-09-25): customer and ship-to first; the
          rest of the form arrives once both are answered, because almost
          everything below depends on the site. */}
      {draft.customer && draft.shipTo && (
        <>

      {/* ── SCHEDULE DETAILS ─────────────────────────────────────────────
          WHEN, AND NOTHING ELSE. The technician left this card on 2026-09-23:
          a date and a window are one answer about the JOB, and who goes is an
          answer about a PERSON — and the second one changes far more often
          than the first. */}
      <SheetSection id={SECTION_SCHEDULE} title="Schedule details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Scheduled date" required>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal"
                  disabled={workLocked}
                >
                  <CalendarIcon />
                  {draft.scheduledAt
                    ? DATE_FMT.format(new Date(draft.scheduledAt))
                    : "Dispatch when you can"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={draft.scheduledAt ? new Date(draft.scheduledAt) : undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    const at = new Date(d);
                    const prev = draft.scheduledAt ? new Date(draft.scheduledAt) : null;
                    at.setHours(prev?.getHours() ?? 9, prev?.getMinutes() ?? 0, 0, 0);
                    setDraft((x) =>
                      x ? { ...x, scheduledAt: at.toISOString(), dateKey: keyOf(at) } : x
                    );
                  }}
                />
              </PopoverContent>
            </Popover>
          </SheetField>
          {/* A WINDOW, NOT A MOMENT — the same control 3PL uses for a delivery
              window, and for the same reason. */}
          <TimeWindowSlider
            required
            label="Scheduling window"
            disabled={workLocked}
            start={scheduledMinutes}
            end={draft.windowEndMin ?? scheduledMinutes + 180}
            aria-label="Scheduling window"
            onChange={(startMin, endMin) => {
              if (!draft.scheduledAt) return;
              const at = new Date(draft.scheduledAt);
              at.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
              setDraft((x) =>
                x
                  ? {
                      ...x,
                      scheduledAt: at.toISOString(),
                      dateKey: keyOf(at),
                      windowEndMin: endMin,
                    }
                  : x
              );
            }}
          />
        </div>
      </SheetSection>

      {/* ── TECHNICIAN — ITS OWN UNIT (Pavan, 2026-09-23) ────────────────
          NOT MERGED WITH ANYTHING. Assigning somebody is the act this screen
          is most often reopened to do, and it was the last line of a card
          about dates — reachable only by reading past two questions that were
          already answered. Its own card gives it a heading you can aim at,
          which is also what lets the pending strip send you here. */}
      <SheetSection id={SECTION_TECH} title="Technician">
        {/* NOT MANDATORY (Pavan, 2026-09-25): an order can be saved as a
            draft with nobody on it; only Move to Assigned needs a name. */}
        <SheetField label="Assigned to">
          <Combobox
            className="w-full"
            value={tech?.name ?? ""}
            onValueChange={(v) =>
              set(
                "technicianId",
                ACTIVE_TECHNICIANS.find((t) => t.name === v)?.id ?? null
              )
            }
            options={ACTIVE_TECHNICIANS.map((t) => t.name)}
            placeholder="Unassigned"
            searchPlaceholder="Search technicians…"
            clearLabel="No technician"
            disabled={workLocked}
          />
        </SheetField>
        {/* NO LINE UNDER THE PICKER (Pavan, 2026-09-25) — the skills and
            phone were added without being asked for. */}
      </SheetSection>

      {/* ── ASSET DETAILS — A TABLE, BECAUSE A VISIT COVERS SEVERAL ──────
          One truck goes to one site and works on three skids. As a single
          asset that was three orders, three call-out fees and three invoices
          for one trip. The site is the constant and the assets are the
          variable.

          WORK TYPE AND FAULT ARE COLUMNS, not fields above the table: they
          belong to the ASSET, not to the visit. A hose swap on one skid and a
          meter recalibration on the next are the same trip and different
          jobs. */}
      <SheetSection
        id={SECTION_ASSETS}
        title="Asset details"
        flush
        hanging={
          !assetsLocked ? (
            <HangingAdd
              label="Add asset"
              onClick={() => {
                setJustAdded({ table: "assets", i: draft.assets.length });
                setDraft((x) =>
                  x
                    ? syncPrimaryAsset({
                        ...x,
                        assets: [...x.assets, blankAssetLine()],
                      })
                    : x
                );
              }}
            />
          ) : undefined
        }
      >
        {/* WORK TYPE FIRST, ASSET SECOND (Pavan and Deepika, 2026-09-25) —
            the asset is optional, so it no longer leads the row. EVERY work-type
            cell, sub-rows included, is the same checkbox list: ticking more
            from any row of an asset's group adds more sub-rows to that group. */}
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[30%]" />
            <col />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Work type</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Asset</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                {/* DESCRIPTION, NOT "REPORTED FAULT" (Deepika, 2026-09-24) —
                    often it is not a fault. Optional. */}
                <TableRequiredLabel>Description</TableRequiredLabel>
              </th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {draft.assets.map((row, i) => {
              /* ONE WRITER FOR THE GROUP'S WORK TYPES, used by every row of it.
                 The first type is the row's own; each after it is a sub-row.
                 Descriptions already typed follow their work type. */
              const setGroupTypes = (v: string[]) => {
                const all = jobsOf(row);
                const kept = all.filter((j) => j.workType && v.includes(j.workType));
                const added = v
                  .filter((w) => !all.some((j) => j.workType === w))
                  .map((w) => ({ workType: w, fault: "" }));
                const list = [...kept, ...added];
                /* A description typed before any work type stays on the row. */
                if (list[0] && !all[0].workType) list[0] = { ...list[0], fault: list[0].fault || all[0].fault };
                setAssetLine(i, {
                  workType: list[0]?.workType ?? "",
                  fault: list[0]?.fault ?? row.fault,
                  subJobs: list.slice(1),
                });
                addBookLines(added.map((a) => a.workType));
              };
              return (
              <React.Fragment key={i}>
              <tr className="group/row h-11 border-b border-border last:border-b-0">
                {/* `relative p-0` ON EVERY CELL — the TableCell* controls are
                    `absolute inset-0` and FILL the cell rather than sitting in
                    it. That is the whole idiom: a cell is editable ground, not
                    a box with a field parked inside it. */}
                <td className="relative p-0">
                  <TableCellMultiSelect
                    values={workTypesOf(row)}
                    summary={row.workType || undefined}
                    options={WORK_TYPE_NAMES}
                    placeholder="NA (non-mandatory)"
                    unitLabel="work type"
                    disabled={assetsLocked}
                    aria-label={`Work types for row ${i + 1}`}
                    onChange={setGroupTypes}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellCombobox
                    value={row.assetName}
                    options={siteAssets.map((a) => a.name)}
                    taken={draft.assets
                      .filter((_, j) => j !== i)
                      .map((r) => r.assetName)}
                    /* SAYS IT IS OPTIONAL (Pavan, 2026-09-25) — "Select" read
                       as a field that had to be filled. */
                    placeholder={draft.shipTo ? "NA (non-mandatory)" : "Site first"}
                    /* AN OPTIONAL PICK CAN BE UNDONE (DS ux §Forms). */
                    clearLabel="No asset"
                    disabled={assetsLocked || !draft.shipTo}
                    autoFocus={isJustAdded("assets", i)}
                    aria-label={`Asset for row ${i + 1}`}
                    onChange={(v) => {
                      const a = siteAssets.find((x) => x.name === v);
                      setAssetLine(i, {
                        assetId: a?.id ?? "",
                        assetName: v,
                        assetType: a?.type ?? "",
                      });
                    }}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    value={row.fault}
                    placeholder="Optional"
                    disabled={assetsLocked}
                    aria-label={`Description for row ${i + 1}`}
                    onChange={(v) => setAssetLine(i, { fault: v })}
                  />
                </td>
                <td className="relative p-0 text-center">
                  {/* QUIET UNTIL THE ROW IS REACHED FOR, like every other row
                      delete in this app. The last row keeps none — an empty
                      table has no way back but the add. */}
                  {draft.assets.length > 1 && !assetsLocked && (
                    <TableRowRemove
                      aria-label={`Remove ${row.assetName || `asset ${i + 1}`}`}
                      onRemove={() =>
                        setDraft((x) =>
                          x
                            ? syncPrimaryAsset({
                                ...x,
                                assets: x.assets.filter((_, j) => j !== i),
                              })
                            : x
                        )
                      }
                    />
                  )}
                </td>
              </tr>
              {/* THE SUB-ROWS — more work on the same asset, nested under it. */}
              {(row.subJobs ?? []).map((sj, k) => {
                const setSub = (patch: Partial<{ workType: string; fault: string }>) =>
                  setAssetLine(i, {
                    subJobs: (row.subJobs ?? []).map((x, j) => (j === k ? { ...x, ...patch } : x)),
                  });
                return (
                  <tr key={`sub-${k}`} className="group/row h-11 border-b border-border bg-fp-card-1/40 last:border-b-0">
                    <td className="relative p-0">
                      <TableCellMultiSelect
                        values={workTypesOf(row)}
                        summary={sj.workType || undefined}
                        options={WORK_TYPE_NAMES}
                        placeholder="NA (non-mandatory)"
                        unitLabel="work type"
                        disabled={assetsLocked}
                        aria-label={`Work types for row ${i + 1}, line ${k + 2}`}
                        onChange={setGroupTypes}
                      />
                    </td>
                    <td className="relative p-0">
                      {/* SAME ASSET AS THE ROW ABOVE. */}
                      <span className="flex h-11 items-center pl-6 text-muted-foreground">
                        <CornerDownRight className="size-4 shrink-0" aria-hidden />
                      </span>
                    </td>
                    <td className="relative p-0">
                      <TableCellInput
                        value={sj.fault}
                        placeholder="Optional"
                        disabled={assetsLocked}
                        aria-label={`Description ${k + 2} for row ${i + 1}`}
                        onChange={(v) => setSub({ fault: v })}
                      />
                    </td>
                    <td className="relative p-0 text-center">
                      {!assetsLocked && (
                        <TableRowRemove
                          aria-label={`Remove ${sj.workType || "work type"} from ${row.assetName || `asset ${i + 1}`}`}
                          onRemove={() =>
                            setAssetLine(i, { subJobs: (row.subJobs ?? []).filter((_, j) => j !== k) })
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </SheetSection>

      {/* THE SITE ASSESSMENT, with the technician's app: once work has
          started or the scheduled time has come. With no app it leads the
          form instead — see `assessmentSection` above Customer details. */}
      {/* (With the app, the assessment now also leads the form — after Start
          work — see above Customer details.) */}

      {/* ──────────────────────────────────────────── the quote, if sent ─── */}
      {draft.quote && (
        <SheetSection
          title="Quote"
          note={
            <SheetSectionNote label="Quote vs invoice">
              <p className="text-foreground">
                A quote is the fixed part — parts, fees and the labour rate —
                agreed before the work starts.
              </p>
              <p className="mt-1.5 text-muted-foreground">
                The hours are not known yet. They land on the final
                bill, which is why it can be larger than the quote and why both
                stay on the record.
              </p>
            </SheetSectionNote>
          }
        >
          <div className="flex flex-col">
            {draft.quote.parts.map((p, i) => (
              <MoneyRow
                key={`qp-${i}`}
                label={p.qty > 1 ? `${p.name} × ${p.qty}` : p.name}
                value={money(p.cost * p.qty)}
              />
            ))}
            {draft.quote.fees.map((f, i) => (
              <MoneyRow key={`qf-${i}`} label={f.name} value={money(f.amount)} />
            ))}
            {draft.quote.laborRate != null && (
              <MoneyRow label="Labour" value={`${money(draft.quote.laborRate)} / hour`} />
            )}
            <div className="mt-2 border-t border-fp-outline-1 pt-2">
              <MoneyRow label="Quoted" value={money(draft.quote.total)} bold />
            </div>
          </div>
          {/* THE CUSTOMER'S ANSWER (Pavan and Deepika, 2026-09-25): approved
              after it was sent, approved on their behalf (offline), or
              rejected — which keeps the order open for a revised quote. */}
          {draft.quote.approvedAt ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {draft.quote.approvedBy === "on-behalf"
                ? "Approved on the customer's behalf"
                : "Approved by the customer"}
            </p>
          ) : !draft.quote.rejectedAt && !workLocked ? (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  set("quote", { ...draft.quote!, rejectedAt: nowIso() });
                  toast("Quote rejected — needs revision");
                }}
              >
                Customer rejected
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  set("quote", { ...draft.quote!, approvedAt: nowIso(), approvedBy: "customer" });
                  toast.success("Quote approved");
                }}
              >
                Customer approved
              </Button>
            </div>
          ) : null}
          {isRecorded(draft.status) && (
            <p className="mt-3 text-sm text-muted-foreground">
              {quoteGap > 0.005 ? (
                <>
                  The invoice is{" "}
                  <span className="font-medium text-foreground">{money(quoteGap)}</span>{" "}
                  more than the quote — actual labour and anything extra
                  the job turned out to need.
                </>
              ) : (
                <>The job came in at the quoted figure.</>
              )}
            </p>
          )}
        </SheetSection>
      )}

      {/* ─────────────────────────────────────────── what was done, and cost */}
      <SheetSection
        title="Parts"
        flush
        hanging={
          !workLocked ? (
            <HangingAdd label="Add part" onClick={() => addLine("parts")} />
          ) : undefined
        }
        note={
          <SheetSectionNote label="About parts">
            Quantity times unit cost. The line's own total is arithmetic and is
            never typed — a box for it is a box to get it wrong in.
          </SheetSectionNote>
        }
      >
        <LineTable
          rows={draft.parts}
          withQty
          readOnly={workLocked}
          nameLabel="Part"
          nameOptions={PART_OPTIONS}
          namePlaceholder="Pick or type a part"
          emptyLabel="No parts on this job."
          total={partsSum}
          onChange={(i, p) => setLine("parts", i, p)}
          onRemove={(i) => removeLine("parts", i)}
            focusRow={justAdded?.table === "parts" ? justAdded.i : undefined}
          showFitted={draft.visits.some((v) => v.endedAt)}
        />
      </SheetSection>

      {/* PARTS THE JOB NEEDED THAT WERE NOT THERE (Pavan, 2026-09-25). Not
          billed here; what happens to them is chosen in the bottom bar —
          a new linked order, or roll this one over. */}
      {dispatch && (recording || unavailable.length > 0) && (
        <SheetSection
          title="Parts not available"
          flush
          hanging={
            recording ? (
              <HangingAdd label="Add part" onClick={() => addLine("unavailableParts")} />
            ) : undefined
          }
        >
          <LineTable
            rows={draft.unavailableParts ?? []}
            withQty
            noTotal
            readOnly={!recording}
            nameLabel="Part"
            nameOptions={PART_OPTIONS}
            namePlaceholder="Pick or type a part"
            emptyLabel="Nothing missing."
            total={0}
            onChange={(i, p) => setLine("unavailableParts", i, p)}
            onRemove={(i) => removeLine("unavailableParts", i)}
            focusRow={justAdded?.table === "unavailableParts" ? justAdded.i : undefined}
          />
        </SheetSection>
      )}

      <SheetSection
        title="Fees"
        flush
        hanging={
          !billed ? (
            <HangingAdd label="Add fee" onClick={() => addLine("fees")} />
          ) : undefined
        }
        note={
          <SheetSectionNote label="Who sets a fee">
            The dispatcher sets these at intake — a service call, a trip, an
            after-hours callout — and the technician adds to them on site.
            Labour and mileage are not fees; they are measured, and they only
            exist once the job has happened.
          </SheetSectionNote>
        }
      >
        <LineTable
          rows={draft.fees}
          readOnly={billed}
          nameLabel="Fee"
          nameOptions={FEE_BOOK}
          namePlaceholder="Pick or type a fee"
          emptyLabel="No fees on this job."
          total={feesSum}
          onChange={(i, p) => setLine("fees", i, p)}
          onRemove={(i) => removeLine("fees", i)}
            focusRow={justAdded?.table === "fees" ? justAdded.i : undefined}
        />
      </SheetSection>

      {/* LABOUR AND COST (Pavan, 2026-09-23). It was "Labour and mileage" —
          a matched pair of sliders, because both were one number somebody
          entered. Neither is that any more: labour is a time somebody types or
          the clock supplies, and what it comes to depends on a rate that is
          this JOB's rather than the company's.

          MILEAGE LEFT THE CARD the same day. It is not part of what labour
          costs, and a third field under a pair made the card read as a
          miscellany of numbers rather than one answer. It still exists on the
          record, still comes from the Standard trip setting, and still shows
          in the Summary and on a quote — there is simply no longer a box for
          it here. */}
      <SheetSection
        title="Labour and cost"
        flush
        /* THE CLOCK, WHILE IT IS RUNNING (Pavan, 2026-09-23). The technician
           presses Start labour in their app and the dispatcher watches it
           here — which is the only way, short of ringing them, to know a job
           is actually under way rather than merely assigned.

           IT SITS ON THE TITLE ROW because it is about the whole card and not
           about either field in it, and because that row is visible from
           further up the sheet than the boxes are.

           MUTED, NOT A STATUS COLOUR. The header chip two inches above
           already says In progress; a second coloured claim about the same
           fact reads as a second fact. The word carries it. */
        action={
          running ? (
            <span className="flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground">Running</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatHours(elapsed)}
              </span>
            </span>
          ) : undefined
        }
      >
        {/* THE RATE SITS ABOVE THE TRIPS, because it is the parameter the
            column below is multiplied by — read it first and the totals need
            no explaining. It brings its own inset and puts the rule on the
            boundary where it meets the table, which is what a flush card asks
            of anything that is not the table. */}
        {/* RATE AND HOURS, ONE ROW (Deepika and Pavan, 2026-09-25). The
            dispatcher can type the hours — the phone's clock is the default,
            not the only source. Mileage is gone from the module (Pavan,
            2026-09-25). */}
        <SheetSectionInset className="border-b border-border">
          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Cost per hour">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  inputMode="decimal"
                  value={draft.laborRate === 0 ? "" : draft.laborRate}
                  placeholder="0"
                  disabled={billed}
                  onChange={(e) =>
                    set("laborRate", Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-24 tabular-nums"
                  aria-label="Cost per hour"
                />
              </div>
            </SheetField>
            <SheetField label="Hours worked">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.labor === 0 && draft.laborOverride == null ? "" : laborH}
                  placeholder="0"
                  disabled={billed}
                  onChange={(e) => {
                    const h = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value) || 0));
                    setLaborTyped(h == null && laborM === 0 ? null : (h ?? 0) + laborM / 60);
                  }}
                  className="w-16 tabular-nums"
                  aria-label="Hours worked"
                />
                <span className="text-sm text-muted-foreground">h</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  inputMode="numeric"
                  value={draft.labor === 0 && draft.laborOverride == null ? "" : laborM}
                  placeholder="0"
                  disabled={billed}
                  onChange={(e) => {
                    const m = e.target.value === "" ? null : Math.min(59, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                    setLaborTyped(m == null && laborH === 0 ? null : laborH + (m ?? 0) / 60);
                  }}
                  className="w-16 tabular-nums"
                  aria-label="Minutes worked"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </SheetField>
          </div>
        </SheetSectionInset>

        {/* WHAT THEY COME TO. "0 visits" is gone (2026-09-25); when typed hours
            disagree with the clock, the clock's figure is shown beside them. */}
        <SheetSectionInset>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">
                Labour
                {draft.laborOverride != null && measuredLabor > 0 && Math.abs(measuredLabor - draft.labor) > 0.01
                  ? ` · measured ${formatHours(measuredLabor)}`
                  : ""}
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {formatHours(draft.labor)} · {money(laborSum)}
              </span>
            </div>
          </div>
        </SheetSectionInset>
      </SheetSection>

      {/* CHARGES ADDED WHEN THE INVOICE WAS RAISED — a return trip, a disposal
          fee, a correction. Kept apart from the fees set at intake because
          "what we agreed to charge" and "what we added afterwards" are
          different answers to a customer's question. */}
      {billed && (
        <SheetSection
          title="Additional charges"
          flush
          hanging={
            draft.status !== "Completed" && !dispatch ? (
              <HangingAdd
                label="Add charge"
                onClick={() => addLine("extraCharges")}
              />
            ) : undefined
          }
        >
          <LineTable
            rows={draft.extraCharges}
            readOnly={draft.status === "Completed" || dispatch}
            nameLabel="Charge"
            namePlaceholder="Charge name, e.g. Return trip"
              emptyLabel="No additional charges."
            total={extraSum}
            onChange={(i, p) => setLine("extraCharges", i, p)}
              onRemove={(i) => removeLine("extraCharges", i)}
            focusRow={justAdded?.table === "extraCharges" ? justAdded.i : undefined}
          />
        </SheetSection>
      )}

        </>
      )}
        </div>

        {/* ── THE RAIL: WHAT THE ORDER HAS BECOME ──────────────────────────
            One rule decides which side a card is on: can you type into it? The
            job's parts go left, in the sequence you fill them; what the job
            has become goes right — derived, read-only, true whether or not
            anyone is looking. Once an editable number and a computed one share
            a column they look identical, and the reader stops knowing which is
            which. Same rail, same width, same cards as the 3PL order sheet.

            AND IT STAYS PUT. The rail is the running account of the job — what
            it comes to, whether it is billed, when it was worked — and those
            are the questions a reader has while they are looking at ANY part of
            the form. Scrolled away with the sections it describes, the total
            was only visible next to the tables that produce it, which is the
            one place it is least needed. `sticky top-0`, the same as the 3PL
            sheet's rail. */}
        {/* NO RAIL WHILE IT IS BEING CREATED (Pavan, 2026-10-05) —
            Summary, Associated records and Activity describe an order that
            exists; on a new one they are empty boxes beside the form. */}
        {!newVisit && (
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
          {/* THE SHARED SUMMARY CARD (Pavan, 2026-10-07 — ux §Record sheets):
              the 3PL Quotation summary's shell, the headline figure last. */}
          <SummaryCard title="Summary">
            <dl className="flex flex-col">
              <SummaryRow variant="line" label="Parts" value={money(partsSum)} />
              <SummaryRow
                variant="line"
                label={`Labour — ${formatHours(draft.labor)}`}
                value={money(laborSum)}
              />
              <SummaryRow variant="line" label="Fees" value={money(feesSum)} />
              {extraSum > 0 && (
                <SummaryRow variant="line" label="Additional charges" value={money(extraSum)} />
              )}
              {draft.quote && (
                <SummaryRow variant="line" label="Quoted" value={money(draft.quote.total)} />
              )}
              {/* THE GAP AS A FIGURE, not a sentence (Pavan, 2026-10-07). */}
              {draft.quote && isRecorded(draft.status) && quoteGap > 0.005 && (
                <SummaryRow variant="line" label="Over the quote" value={money(quoteGap)} />
              )}
            </dl>
            <div aria-hidden className="border-t border-dashed border-border" />
            <dl className="flex flex-col">
              <SummaryRow
                variant="total"
                label={billed ? "Invoice total" : "Running total"}
                value={money(total)}
              />
            </dl>
          </SummaryCard>


          {/* WHAT ACCOUNTING SAYS WAS PAID, against the invoice (Pavan,
              2026-09-25). */}
          {draft.payment && (
            <RailCard title="Payment" icon={<Wallet />}>
              <PaymentDetails order={draft} invoiced={total} />
            </RailCard>
          )}

          {!openedNew && (
          <RailCard title="Record" icon={<History />}>
            <div className="flex flex-col divide-y divide-border">
              <RailRow label="Raised by" value={draft.raisedBy} />
              <RailRow label="Intake" value={draft.source} />
              <RailRow
                label="Arrived on site"
                value={
                  draft.arrivedAt
                    ? stampLabel(draft.arrivedAt)
                    : <span className="text-muted-foreground">Not yet</span>
                }
              />
              <RailRow
                label="Work recorded"
                value={
                  draft.completedAt
                    ? stampLabel(draft.completedAt)
                    : <span className="text-muted-foreground">Not yet</span>
                }
              />
              <RailRow
                label="Signature"
                value={
                  draft.signed ? (
                    "Captured"
                  ) : (
                    <span className="text-muted-foreground">Not captured</span>
                  )
                }
              />
              {/* A LINK, NOT A COPY (Deepika, 2026-09-24): the related order
                  opens on a press; its details stay on it. */}
              {draft.returnOf && (
                <RailRow label="Continues" value={<OrderLink no={draft.returnOf} onOpen={onOpenOrder} />} />
              )}
              {draft.spawnedReturn && (
                <RailRow label="Continued in" value={<OrderLink no={draft.spawnedReturn} onOpen={onOpenOrder} />} />
              )}
            </div>
          </RailCard>
          )}

          {/* THE TECHNICIAN'S ASSESSMENT, and the permission it may ask for
              (Pavan, 2026-09-24) — once the quote is approved an edit needs
              the dispatcher's yes, given here. */}
          {/* THE ASSESSMENT TEXT MOVED INTO THE FORM (2026-09-25); the rail
              keeps only the technician's request to edit it. */}
          {draft.siteAssessment && (draft.siteAssessment.editRequestedAt || draft.siteAssessment.editAllowed) && (
            <RailCard title="Assessment" icon={<ClipboardList />}>
              <div className="flex flex-col gap-3 px-4 py-3">
                {draft.siteAssessment.editRequestedAt && !draft.siteAssessment.editAllowed && (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-fp-banner-accent-caution/10 px-3 py-2">
                    <span className="text-sm text-foreground">
                      {technicianById(draft.technicianId)?.name ?? "The technician"} asked to edit
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setDraft((d) =>
                          d && d.siteAssessment ? { ...d, siteAssessment: { ...d.siteAssessment, editAllowed: true } } : d
                        );
                        toast.success("Edit allowed", { description: "The technician can change the assessment once." });
                      }}
                    >
                      Allow edit
                    </Button>
                  </div>
                )}
                {draft.siteAssessment.editAllowed && (
                  <span className="text-xs text-muted-foreground">Edit allowed · waiting on the technician</span>
                )}
              </div>
            </RailCard>
          )}

          {draft.visits.length > 0 && (
            <RailCard title="Visits" icon={<Clock />}>
              <div className="flex flex-col divide-y divide-border">
                {draft.visits.map((v, i) => (
                  <RailRow
                    key={i}
                    label={
                      <span className="flex flex-col">
                        <span className="text-foreground">{technicianById(v.technicianId)?.name ?? "—"}</span>
                        <span className="text-xs">{stampLabel(v.startedAt)}</span>
                      </span>
                    }
                    value={v.endedAt ? formatHours(visitHours(v)) : "Running"}
                  />
                ))}
              </div>
            </RailCard>
          )}

          {/* THE SHARED ACTIVITY CARD (Pavan, 2026-10-07). THE LIVE ROW, not
              the sheet's draft: the log is written by the screen on save. */}
          {!creating && order && <ActivityCard entries={order.audit} />}
        </aside>

        )}      </div>

      {/* THE FIELD APP, OVER THE SHEET. It opens from the handover act and the
          sheet stays behind it, because the dispatcher watching a job go out is
          not leaving the order — they are looking at what the technician sees.
          Everything it submits comes back through the same two paths the sheet
          already has: a completion advances the ladder, and a stall is the
          SCREEN's act because one of its outcomes creates a second order. */}
      {/* THE QUOTE THE DISPATCHER SENDS (Pavan, 2026-09-23).

          IT USED TO BE THE FIELD'S ALONE, on the reasoning that a price can
          only be given once somebody has seen the thing. Often true, and not
          always: a customer rings and wants a number before anyone travels,
          and a known work type on a known asset has a price in the book. So
          dispatch can send one too.

          THE HONEST PART IS THE APPROXIMATION. Parts and fees are known now;
          labour and mileage are not, and a quote that quietly omits them
          reads as the whole price and turns into an argument at the invoice.
          So they are ON the quote, marked as estimates, with what they are
          estimated FROM — and the total says which half is firm. */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quote {draft.customer}</DialogTitle>
            <DialogDescription>
              {draft.orderNo} · {draft.workType || "Service"}
              {draft.assetName ? ` · ${draft.assetName}` : ""}
              {draft.poc ? ` · to ${draft.poc.name} (${draft.poc.email})` : ""}
            </DialogDescription>
          </DialogHeader>

          {/* THE FIXED PART ONLY (Deepika, 2026-09-25): parts, fees and what an
              hour of labour costs. The hours themselves land on the final bill. */}
          <div className="overflow-hidden rounded-md border border-fp-outline-1">
            {draft.parts.map((p, i) => (
              <QuoteRow
                key={`qp-${i}`}
                label={p.qty > 1 ? `${p.name || "Part"} × ${p.qty}` : p.name || "Part"}
                value={p.cost * p.qty}
              />
            ))}
            {draft.fees.map((f, i) => (
              <QuoteRow key={`qf-${i}`} label={f.name || "Fee"} value={f.amount} />
            ))}
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0">
              <span className="text-sm text-muted-foreground">Labour</span>
              <span className="shrink-0 text-sm tabular-nums text-foreground">
                {money(draft.laborRate)} / hour
              </span>
            </div>
            <QuoteRow label="Quote total" value={quoteFirm} strong />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>
              Close
            </Button>
            {/* THE CUSTOMER SAID YES OFFLINE — approve on their behalf, nothing
                sent (Pavan, 2026-09-25). */}
            <Button
              variant="outline"
              onClick={() => {
                set("quote", { ...buildQuote(draft), approvedAt: nowIso(), approvedBy: "on-behalf" });
                setQuoteOpen(false);
                toast.success("Quote approved on the customer's behalf");
              }}
            >
              Approve on customer's behalf
            </Button>
            <Button
              onClick={() => {
                set("quote", buildQuote(draft));
                setQuoteOpen(false);
                toast.success(`Quote sent to ${draft.poc?.name ?? draft.customer}`);
              }}
            >
              Send quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* THE FINAL BILL (Deepika, 2026-09-25) — after the work, the whole
          amount: parts, the labour actually worked and fees. */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Final bill for {draft.customer}</DialogTitle>
            <DialogDescription>
              {draft.orderNo} · {draft.workType || "Service"}
              {draft.assetName ? ` · ${draft.assetName}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-md border border-fp-outline-1">
            <QuoteRow label="Parts" value={partsSum} />
            <QuoteRow
              label={`Labour — ${formatHours(draft.labor)} at ${money(draft.laborRate)}/h`}
              value={laborSum}
            />
            <QuoteRow label="Fees" value={feesSum} />
            {extraSum > 0 && <QuoteRow label="Additional charges" value={extraSum} />}
            <QuoteRow label="Total" value={total} strong />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                set("finalBillSentAt", nowIso());
                setBillOpen(false);
                toast.success(`Final bill sent to ${draft.customer}`);
              }}
            >
              Send final bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WHAT WENT ON, AND WHAT IS STILL OWED (Pavan, 2026-09-23).

          IT WAS A REASON BOX — one line of free text saying what was missing.
          That could not describe the case it exists for: a job needing five
          hoses and finding three. The work done, the money owed and the second
          visit's shopping list all depend on the QUANTITIES, and prose cannot
          carry them to the follow-up order.

          SO THE QUESTION IS ASKED PER LINE, and it starts at "all of them" —
          the normal answer — so a technician who fitted everything but one
          washer changes one number rather than confirming the rest. */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What went on today?</DialogTitle>
            <DialogDescription>
              Everything left over moves to a follow-up. The work already done
              stays on {draft.orderNo}.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-md border border-fp-outline-1">
            <div className="flex items-baseline gap-3 border-b border-border bg-fp-surface-1a px-3 py-2">
              <span className="flex-1 text-xs font-medium text-foreground">Part</span>
              <span className="w-20 text-right text-xs font-medium text-foreground">Fitted</span>
              <span className="w-16 text-right text-xs font-medium text-foreground">Needed</span>
            </div>
            {draft.parts.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No parts on this job.
              </p>
            ) : (
              draft.parts.map((pt, i) => (
                <div
                  key={`${pt.name}-${i}`}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <span className="flex-1 text-sm text-foreground">{pt.name}</span>
                  <Input
                    type="number"
                    min={0}
                    max={pt.qty}
                    inputMode="numeric"
                    value={fittedOf(pt)}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(pt.qty, Number(e.target.value) || 0));
                      set(
                        "parts",
                        draft.parts.map((x, j) =>
                          j === i ? { ...x, fittedQty: v } : x
                        )
                      );
                    }}
                    className="w-20 tabular-nums"
                    aria-label={`Fitted quantity for ${pt.name}`}
                  />
                  <span className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                    {pt.qty}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* WHAT THE PRESS WILL DO, BEFORE THE PRESS. Two very different
              things happen behind one button depending on a setting, and a
              technician who finds out afterwards has been told too late. */}
          <div className="rounded-md bg-fp-card-1 px-3 py-2.5 text-xs text-muted-foreground">
            {heldShortfall ? (
              <>
                <span className="text-foreground">{heldShortfall}</span>{" "}
                {cfg.returnMode === "rollover"
                  ? `stays on ${draft.orderNo}, which rolls over to tomorrow with the same technician.`
                  : cfg.returnMode === "neworder"
                    ? "becomes a new Open order, linked back, and this one is complete."
                    : "waits in the queue as a Parts pending order, and this one is complete."}
              </>
            ) : (
              "Everything the job needed went on. Nothing to carry over."
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!heldShortfall}
              onClick={() => {
                onPartsPending?.(draft.id, {
                  labor: draft.labor,
                  parts: draft.parts,
                });
                setHoldOpen(false);
              }}
            >
              {cfg.returnMode === "rollover"
                ? "Roll over to tomorrow"
                : cfg.returnMode === "neworder"
                  ? "Complete and create linked order"
                  : "Complete and queue the rest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dispatch && (
        <>
          <TechnicianEmailSheet
            order={draft}
            open={techEmailOpen}
            onOpenChange={setTechEmailOpen}
            onSend={sendToTechnician}
          />
          <OnBehalfDialog
            open={onBehalfOpen}
            onOpenChange={setOnBehalfOpen}
            onConfirm={() => {
              advance("Ongoing", { onBehalfAt: nowIso(), arrivedAt: draft.arrivedAt ?? nowIso() });
              toast.success(`${draft.orderNo} — recording the job`);
            }}
          />
          <InvoiceSummarySheet
            order={draft}
            open={invoiceOpen}
            onOpenChange={setInvoiceOpen}
            onChange={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
            onSend={() => {
              advance("Awaiting approval", { invoiceSentAt: nowIso() });
              toast.success(`Invoice sent to ${draft.customer}`);
            }}
            onApproved={completeDispatch}
          />
          <InvoiceSummarySheet
            partial
            order={draft}
            open={partialOpen}
            onOpenChange={setPartialOpen}
            onChange={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
            onSend={() => {
              toast.success(`Partial invoice sent to ${draft.poc?.name ?? draft.customer}`);
              rollOver(true);
            }}
            onApproved={() => rollOver(false)}
          />
          <CompleteDialog
            order={draft}
            open={completeOpen}
            onOpenChange={setCompleteOpen}
            onChange={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
            onConfirm={completeDispatch}
          />
        </>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {draft.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the working lanes. It can be reopened later as a draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                advance("Cancelled");
                toast.success(`${draft.orderNo} cancelled`);
              }}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard {draft.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>The draft is deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDiscard?.(draft.id);
                onOpenChange(false);
                toast.success(`${draft.orderNo} discarded`);
              }}
            >
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TechnicianApp
        order={draft}
        open={fieldOpen}
        onOpenChange={setFieldOpen}
        onCreateTicket={onCreateTicket ? (req) => onCreateTicket(draft, req) : undefined}
        /* EVERY STEP ON THE PHONE LANDS ON THE ORDER, and the sheet's autosave
           carries it to the list like any other edit. */
        onPatch={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
        onSplit={(req) => {
          /* THE VISIT CLOSES FIRST, saved at once — the split below builds on
             the saved row, and a visit left open would keep the clock running
             on an order nobody is working. */
          const at = nowIso();
          if (order)
            onSave(order, {
              ...draft,
              ...syncVisits({
                laborOverride: draft.laborOverride,
                visits: draft.visits.map((v, i) =>
                  i === draft.visits.length - 1 && v.endedAt === null ? { ...v, endedAt: at } : v
                ),
              }),
            });
          onPartsPending?.(draft.id, {
            labor: draft.labor,
            parts: req.parts,
            note: req.note ?? undefined,
            mode: req.mode,
          });
          setFieldOpen(false);
        }}
      />
    </RecordSheet>
  );
}

