import * as React from "react";
import {
  Calendar as CalendarIcon,
  MoreHorizontal,
  Receipt,
  History,
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
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TableCellCombobox,
  TableCellInput,
  TableCellSelect,
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
import { useServiceSettings } from "./settings";
import { TechnicianApp } from "./TechnicianApp";
import {
  ACTIVE_TECHNICIANS,
  INTAKE_SOURCES,
  MILEAGE_RATE,
  PORTAL_SOURCE,
  PRIORITIES,
  WORK_TYPES,
  WORK_TYPE_NAMES,
  WORK_STATUS_TONE,
  feesTotal,
  isRecorded,
  isWorkable,
  computedLabor,
  isUnassigned,
  syncVisits,
  type ServiceVisit,
  LANE_OF,
  syncPrimaryAsset,
  type ServiceAssetLine,
  fittedOf,
  shortfallLabel,
  formatHours,
  splitHours,
  joinHours,
  mileageTotal,
  money,
  orderTotal,
  partsTotal,
  technicianById,
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
const SECTION_INTAKE = "service-order-intake";
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

/**
 * LABOUR — ONE ROW PER VISIT, AND THE TOTAL UNDERNEATH.
 *
 * A PARTIAL JOB IS VISITED MORE THAN ONCE (Pavan, 2026-09-23). Two hours on
 * Tuesday and forty minutes on Thursday is not a two-hour-forty job that
 * began on Tuesday — it is two trips, and the customer is owed the sum of
 * them with the dates against it. A single pair of boxes could hold the sum
 * and nothing else, so the sum stopped being checkable the moment there was
 * more than one trip.
 *
 * THE CLOCK FILLS EACH ROW AND EACH ROW CAN BE TYPED OVER — in hours and
 * minutes, because "1 h 23" is what a technician says and 1.38 is a rounding
 * error waiting to reach the invoice. Overruling a row keeps that row's clock
 * reading beside it, so the correction stays reviewable and the OTHER trips
 * are untouched: the half hour that should not be billed happened on one of
 * them, and correcting the total would hide which.
 *
 * A RUNNING VISIT HAS NO STOP TIME and its duration counts up. It is the last
 * row and there is never more than one.
 */
function VisitRow({
  visit,
  index,
  locked,
  onChange,
  onRemove,
}: {
  visit: ServiceVisit;
  index: number;
  locked?: boolean;
  onChange: (patch: Partial<ServiceVisit>) => void;
  onRemove?: () => void;
}) {
  const running = visit.endedAt === null;
  const live = useElapsedHours(running ? visit.startedAt : null);
  const measured = running ? live : computedLabor(visit.startedAt, visit.endedAt);
  const hours = visit.override ?? measured;
  const shown = splitHours(hours);
  const [buf, setBuf] = React.useState<{ h: string; m: string } | null>(null);

  const commit = (h: string, m: string) => {
    setBuf({ h, m });
    onChange({
      override:
        h.trim() === "" && m.trim() === ""
          ? null
          : joinHours(Number(h) || 0, Number(m) || 0),
    });
  };

  const stamp = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <tr className="group/row h-11 border-b border-border last:border-b-0">
      <td className="px-3 text-sm tabular-nums text-foreground">
        {stamp(visit.startedAt)}
      </td>
      <td className="px-3 text-sm tabular-nums text-muted-foreground">
        {running ? "Running" : stamp(visit.endedAt!)}
      </td>
      <td className="relative p-0">
        <TableCellCombobox
          value={technicianById(visit.technicianId)?.name ?? ""}
          options={ACTIVE_TECHNICIANS.map((t) => t.name)}
          placeholder="Unrecorded"
          disabled={locked}
          aria-label={`Technician on visit ${index + 1}`}
          onChange={(v) =>
            onChange({
              technicianId:
                ACTIVE_TECHNICIANS.find((t) => t.name === v)?.id ?? null,
            })
          }
        />
      </td>
      <td className="px-3">
        <div className="flex items-center justify-end gap-1.5">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={buf ? buf.h : String(shown.h)}
            disabled={locked}
            onChange={(e) => commit(e.target.value, buf ? buf.m : String(shown.m))}
            onBlur={() => setBuf(null)}
            className="h-8 w-14 tabular-nums"
            aria-label={`Hours on visit ${index + 1}`}
          />
          <span className="text-xs text-muted-foreground">h</span>
          <Input
            type="number"
            min={0}
            max={59}
            inputMode="numeric"
            value={buf ? buf.m : String(shown.m)}
            disabled={locked}
            onChange={(e) => commit(buf ? buf.h : String(shown.h), e.target.value)}
            onBlur={() => setBuf(null)}
            className="h-8 w-14 tabular-nums"
            aria-label={`Minutes on visit ${index + 1}`}
          />
          <span className="text-xs text-muted-foreground">m</span>
        </div>
        {visit.override !== null && (
          /* THE ROW'S OWN CLOCK, KEPT IN VIEW. Not a warning — a correction is
             a normal thing to make. */
          <p className="pb-1 text-right text-xs text-muted-foreground">
            Clock said {formatHours(measured)} ·{" "}
            {!locked && (
              <button
                type="button"
                onClick={() => {
                  setBuf(null);
                  onChange({ override: null });
                }}
                className="rounded-sm underline decoration-current/40 underline-offset-4 outline-none transition-[text-decoration-color] hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                use it
              </button>
            )}
          </p>
        )}
      </td>
      <td className="relative p-0 text-center">
        {onRemove && !locked && !running && (
          <TableRowRemove
            aria-label={`Remove visit ${index + 1}`}
            onRemove={onRemove}
          />
        )}
      </td>
    </tr>
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
}: {
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
}) {
  const amountOf = (r: PartLine | FeeLine) =>
    "cost" in r ? (r as PartLine).cost * (r as PartLine).qty : (r as FeeLine).amount;

  return (
    <div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          {withQty && <col className="w-[84px]" />}
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
                colSpan={withQty ? (readOnly ? 4 : 5) : readOnly ? 2 : 3}
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
                  <TableCellInput
                    value={r.name}
                    placeholder={namePlaceholder}
                    autoFocus={i === focusRow}
                    aria-label={`${nameLabel} for row ${i + 1}`}
                    onChange={(v) => onChange(i, { name: v })}
                  />
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
        {rows.length > 0 && (
          <tfoot>
            <tr className="h-11 border-t border-border bg-fp-table-header">
              <td
                colSpan={withQty ? 3 : 1}
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
  /**
   * The job stopped for a part. It is the screen's act rather than the
   * sheet's, because one of its two outcomes creates a SECOND order — and a
   * sheet cannot add a row to the list it was opened from.
   */
  onPartsPending?: (
    id: string,
    data: { labor: number; parts: PartLine[]; note?: string }
  ) => void;
  customers: string[];
  /** Ship-tos for a chosen customer, and assets for a chosen ship-to. */
  shipTosFor: (customer: string) => string[];
  assetsFor: (shipTo: string) => { id: string; name: string; type: string }[];
  blankOrder: () => ServiceOrder;
}

export function ServiceOrderSheet({
  order,
  mode = "edit",
  open,
  onOpenChange,
  onSave,
  onCreate,
  onPartsPending,
  customers,
  shipTosFor,
  assetsFor,
  blankOrder,
}: ServiceOrderSheetProps) {
  const cfg = useServiceSettings();
  const creating = mode === "create";
  const [draft, setDraft] = React.useState<ServiceOrder | null>(null);
  const [fieldOpen, setFieldOpen] = React.useState(false);
  const [quoteOpen, setQuoteOpen] = React.useState(false);
  const [holdOpen, setHoldOpen] = React.useState(false);
  /* THE ROW JUST ADDED, so its first cell can take the cursor (DS ui §10f,
     "Rows"). Mount-only on the cell's side, so rows already there are never
     re-focused and this never needs clearing. */
  const [justAdded, setJustAdded] = React.useState<{ table: string; i: number } | null>(null);
  const isJustAdded = (table: string, i: number) =>
    justAdded?.table === table && justAdded.i === i;
  const lastSaved = React.useRef<string | null>(null);

  /* BUILD THE DRAFT ONCE PER RECORD, not once per save — the same rule the 3PL
     sheet follows, or the row coming back from the save rebuilds the form the
     reader is typing into. */
  React.useEffect(() => {
    if (!open) {
      setDraft(null);
      lastSaved.current = null;
      return;
    }
    if (creating) {
      setDraft(blankOrder());
      return;
    }
    if (!order) return;
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

  /* AUTOSAVED, DEBOUNCED — the DS rule for every side sheet with editable
     fields in it (`docs/ds/ux/2-rules.md`, Side-sheet anatomy). A reader who
     has to remember to press Save is a reader who loses work. */
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

  /* WHO MAY EDIT WHAT, BY STAGE. Intake is the dispatcher's until the job
     starts; the work is the technician's while it is running; past approval
     the record is what was billed and nothing on it moves. */
  const intakeLocked = !isUnassigned(draft.status) && draft.status !== "Assigned";
  const workLocked = isRecorded(draft.status) || draft.status === "Cancelled";
  /* PAST THE VISIT, THE RECORD IS WHAT WAS BILLED. Both the Completed lane
     and the Synced lane are past it. */
  const billed =
    LANE_OF[draft.status] === "Completed" || LANE_OF[draft.status] === "Synced";

  /* THE DISPATCHER SETS THE FEES AT INTAKE; the technician adds to them on
     site. Labour and mileage are not fees and never appear at intake — nobody
     knows them yet. */
  const setLine = (
    field: "parts" | "fees" | "extraCharges",
    i: number,
    patch: Record<string, unknown>
  ) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            [field]: (d[field] as (PartLine | FeeLine)[]).map((r, j) =>
              j === i ? { ...r, ...patch } : r
            ),
          }
        : d
    );
  const addLine = (field: "parts" | "fees" | "extraCharges") => {
    if (draft) setJustAdded({ table: field, i: (draft[field] as unknown[]).length });
    setDraft((d) =>
      d
        ? {
            ...d,
            [field]:
              field === "parts"
                ? [...d.parts, { name: "", qty: 1, cost: 0 }]
                : [...(d[field] as FeeLine[]), { name: "", amount: 0 }],
          }
        : d
    );
  };
  const removeLine = (field: "parts" | "fees" | "extraCharges", i: number) =>
    setDraft((d) =>
      d
        ? { ...d, [field]: (d[field] as unknown[]).filter((_, j) => j !== i) }
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
  const pendingSteps = isWorkable(draft.status)
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
      ...syncVisits({ visits }),
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
  const sheetActs: { label: string; onSelect: () => void }[] = [];
  if (draft.status === "Assigned")
    sheetActs.push({
      label: "Start work",
      /* BOTH TIMESTAMPS, because from dispatch these are one press. The
         technician's app tells arrival and starting apart — it has a quote
         and a wait between them — but somebody starting a job from this sheet
         is saying both at once, and a second button to separate them would be
         inventing a step nobody takes. */
      onSelect: () => {
        /* A PRESS OPENS A VISIT. `startedAt` is its mirror and is written by
           `syncVisits`, never by hand. */
        advance("Ongoing", {
          arrivedAt: draft.arrivedAt ?? nowIso(),
          ...syncVisits({
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
      },
    });
  if (!creating && draft.customer)
    sheetActs.push({ label: "Send quote to customer", onSelect: () => setQuoteOpen(true) });
  if (cfg.techApp && isWorkable(draft.status))
    sheetActs.push({
      label:
        draft.status === "Assigned"
          ? "Open technician app"
          : "Resume in technician app",
      onSelect: () => setFieldOpen(true),
    });

  const nextAct: { label: string; onSelect: () => void; why?: string } = (() => {
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
      return {
        label: creating ? "Create Service Order" : "Assign a technician",
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
      onSelect: () => toast.success(`${draft.orderNo} invoice downloaded`),
    };
  })();

  /* THE REASON THE BUTTON IS DEAD SITS BESIDE IT, never on it. A label that
     states a condition asks the reader to press a fact. */
  const blockedWhy =
    isUnassigned(draft.status) && !draft.technicianId
      ? "Choose a technician before proceeding."
      : /* COMPLETION IS GATED WHEREVER IT IS OFFERED (Pavan, 2026-09-23). It
           used to be exempt while the field app held the job, on the grounds
           that the hours were recorded there — but dispatch can complete a job
           now, so the gate has to be true on this screen too. */
        isWorkable(draft.status) && completionMissing.length > 0
        ? completionMissing[0]
        : nextAct.why;

  /* ─────────────────────────────────────────────── the money, worked out ── */

  const partsSum = partsTotal(draft.parts);
  const laborSum = draft.labor * draft.laborRate;
  const mileageSum = mileageTotal(draft.mileage);
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


  const quoteFirm = partsSum + feesSum;
  const quoteHours = draft.labor > 0 ? draft.labor : 1.5;
  const quoteMiles = draft.mileage > 0 ? draft.mileage : cfg.defaultMileage;
  const quoteEstimate = quoteHours * draft.laborRate + quoteMiles * MILEAGE_RATE;
  const total = orderTotal(draft);
  const quoteGap = draft.quote ? total - draft.quote.total : 0;

  const readyToCreate =
    Boolean(draft.customer) && Boolean(draft.shipTo) && Boolean(draft.assetId);

  const sources = [...INTAKE_SOURCES, ...(cfg.portalIntake ? [PORTAL_SOURCE] : [])];

  return (
    <RecordSheet
      /* THE SIZE THAT EXISTS FOR EXACTLY THIS SHAPE: tables on the left, a
         fixed rail on the right. The rail costs the tables 340px plus a gap,
         and at `wide` that came straight out of columns already at their
         minimum — a parts table whose Amount column wraps is a table nobody
         can add up by eye. */
      size="xxwide"
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Service order: ${draft.orderNo}`}
      createTitle="New service order"
      createAction="Create Service Order"
      canSubmit={readyToCreate}
      /* AUTOSAVED, so Cancel is a promise the sheet cannot keep. */
      /* AUTOSAVED, so Cancel is a promise the sheet cannot keep — it would
         claim to undo what has already been kept. Close is the honest exit. */
      showCancel={false}
      headerAside={
        creating ? undefined : (
          <span className="flex items-center gap-2">
            <StatusChip tone={WORK_STATUS_TONE[draft.status]}>{draft.status}</StatusChip>
            {draft.priority !== "Normal" && (
              <Badge variant={draft.priority === "Urgent" ? "destructive" : "secondary"}>
                {draft.priority}
              </Badge>
            )}
            {saveState !== "idle" && (
              <DraftStatusChip tone="neutral" label="Draft" saveState={saveState} />
            )}
          </span>
        )
      }
      headerSubtitle={
        creating ? undefined : `${draft.workType} · ${draft.assetName} · ${draft.shipTo}`
      }
      /* THE STRIP ABOVE THE FOOTER SAYS WHAT THE ACT IS WAITING ON. A stalled
         job's reason beats a list of missing fields: it is the thing that
         stopped the work, and the fields can wait behind it. */
      footerBanner={
        creating ? (
          <PendingStrip
            pending={pendingSteps}
            clearLabel="Everything this order needs is filled in"
          />
        ) : draft.status === "Parts pending" ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Waiting on a part</span>
            <span className="text-muted-foreground">
              {draft.partNeeded}
              {draft.spawnedReturn
                ? ` · linked return visit ${draft.spawnedReturn} created`
                : " · nobody is on it yet"}
            </span>
          </div>
        ) : (
          <PendingStrip
            pending={pendingSteps}
            clearLabel="Everything this order needs is filled in"
          />
        )
      }
      /* THE SECOND OUTCOME OF A VISIT, in the slot for decisions taken at the
         moment of committing. A technician does not know which of the two it
         will be until the work is in front of them, so both live at the foot
         of the same form — the primary is the one that finishes the job, and
         this is the one that admits it cannot be finished today. */
      footerAside={
        draft.status === "Ongoing" && onPartsPending ? (
          <Button variant="outline" onClick={() => setHoldOpen(true)}>
            Some parts unavailable
          </Button>
        ) : undefined
      }
      footerPrimary={
        creating ? undefined : blockedWhy ? (
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex" tabIndex={0} aria-describedby={undefined}>
                  <Button disabled onClick={nextAct.onSelect} className="pointer-events-none">
                    {nextAct.label}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{blockedWhy}</TooltipContent>
            </Tooltip>
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
                ··· is for acts on the RECORD — deleting it. These are acts on
                the WORK, which is what the footer is about. */}
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
            <Button onClick={nextAct.onSelect}>{nextAct.label}</Button>
          </div>
        )
      }
      onSubmit={() => {
        if (creating && onCreate) onCreate(draft);
      }}
    >
      {/* ── TWO COLUMNS: WHAT YOU FILL IN, AND WHAT THAT MAKES ───────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-10">
      {/* ───────────────────────────────────────────────────── intake ───── */}
      <SheetSection
        id={SECTION_INTAKE}
        title="Intake"
        note={
          <SheetSectionNote label="About intake">
            Where the job came from is the one fact about it nobody can work out
            afterwards, so it is asked for first and kept on the record.
            {!cfg.portalIntake && (
              <span className="mt-1.5 block">
                The customer portal is off, so intake is keyed here — from a
                call, a rep, or a flagged inspection.
              </span>
            )}
          </SheetSectionNote>
        }
      >
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </SheetSection>

      {/* ── SCHEDULE DETAILS ─────────────────────────────────────────────
          WHEN, AND NOTHING ELSE. The technician left this card on 2026-09-23:
          a date and a window are one answer about the JOB, and who goes is an
          answer about a PERSON — and the second one changes far more often
          than the first. */}
      <SheetSection id={SECTION_SCHEDULE} title="Schedule details">
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Scheduled date">
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
            label="Scheduling window"
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
        <SheetField
          label="Assigned to"
        >
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
            disabled={workLocked}
          />
        </SheetField>
        {tech && (
          <p className="text-sm text-muted-foreground">
            {tech.base} · {tech.skills.join(" · ")} · {tech.phone}
          </p>
        )}
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
          !intakeLocked ? (
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
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[26%]" />
            <col />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Asset</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Work type</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Reported fault</TableRequiredLabel>
              </th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {draft.assets.map((row, i) => (
              <tr
                key={i}
                className="group/row h-11 border-b border-border last:border-b-0"
              >
                {/* `relative p-0` ON EVERY CELL — the TableCell* controls are
                    `absolute inset-0` and FILL the cell rather than sitting in
                    it. That is the whole idiom: a cell is editable ground, not
                    a box with a field parked inside it. */}
                <td className="relative p-0">
                  <TableCellCombobox
                    value={row.assetName}
                    options={siteAssets.map((a) => a.name)}
                    taken={draft.assets
                      .filter((_, j) => j !== i)
                      .map((r) => r.assetName)}
                    placeholder={draft.shipTo ? "Select" : "Site first"}
                    disabled={intakeLocked || !draft.shipTo}
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
                  <TableCellSelect
                    value={row.workType}
                    options={WORK_TYPE_NAMES}
                    placeholder="Select"
                    disabled={intakeLocked}
                    aria-label={`Work type for row ${i + 1}`}
                    onChange={(v) => setAssetLine(i, { workType: v })}
                  />
                </td>
                <td className="relative p-0">
                  <TableCellInput
                    value={row.fault}
                    placeholder="What the customer described"
                    disabled={intakeLocked}
                    aria-label={`Reported fault for row ${i + 1}`}
                    onChange={(v) => setAssetLine(i, { fault: v })}
                  />
                </td>
                <td className="relative p-0 text-center">
                  {/* QUIET UNTIL THE ROW IS REACHED FOR, like every other row
                      delete in this app. A column of bins down a table reads
                      as the table's purpose. The last row keeps none — an
                      empty table has no way back but the add. */}
                  {draft.assets.length > 1 && !intakeLocked && (
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
            ))}
          </tbody>
        </table>
      </SheetSection>

      {/* ──────────────────────────────────────────── the quote, if sent ─── */}
      {draft.quote && (
        <SheetSection
          title="Quote"
          note={
            <SheetSectionNote label="Quote vs invoice">
              <p className="text-foreground">
                A quote is parts and the predefined fee, agreed on site before
                the work starts.
              </p>
              <p className="mt-1.5 text-muted-foreground">
                It cannot carry labour or mileage — at the moment it was sent
                nobody knew how long the job would take or how far the van went.
                Those land on the invoice, which is why the invoice can be
                larger than the quote and why both stay on the record.
              </p>
              <p className="mt-1.5 text-muted-foreground">
                Read-only here: a quote is sent from the technician's own app,
                on site, and this is the record of what was agreed.
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
            <div className="mt-2 border-t border-fp-outline-1 pt-2">
              <MoneyRow label="Quoted on site" value={money(draft.quote.total)} bold />
            </div>
          </div>
          {isRecorded(draft.status) && (
            <p className="mt-3 text-sm text-muted-foreground">
              {quoteGap > 0.005 ? (
                <>
                  The invoice is{" "}
                  <span className="font-medium text-foreground">{money(quoteGap)}</span>{" "}
                  more than the quote — actual labour, mileage and anything extra
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
          namePlaceholder="Part"
          emptyLabel="No parts on this job."
          total={partsSum}
          onChange={(i, p) => setLine("parts", i, p)}
          onRemove={(i) => removeLine("parts", i)}
            focusRow={justAdded?.table === "parts" ? justAdded.i : undefined}
        />
      </SheetSection>

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
          namePlaceholder="Fee name, e.g. Service call fee"
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
        <SheetSectionInset className="border-b border-border">
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
        </SheetSectionInset>

        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[20%]" />
            <col className="w-[24%]" />
            <col />
            <col className="w-[52px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Started</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Stopped</TableRequiredLabel>
              </th>
              {/* WHOSE TRIP IT WAS (Pavan, 2026-09-23). On a partial job the
                  second visit is often somebody else, and an order that
                  records two visits and one name is an order that cannot say
                  who did which half. */}
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Technician</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-right">
                <TableRequiredLabel>On site</TableRequiredLabel>
              </th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {draft.visits.length === 0 && (
              <tr className="h-11 border-b border-border last:border-b-0">
                <td colSpan={5} className="px-3 text-sm text-muted-foreground">
                  No visits yet.
                </td>
              </tr>
            )}
            {draft.visits.map((v, i) => (
              <VisitRow
                key={i}
                visit={v}
                index={i}
                locked={billed}
                onChange={(patch) =>
                  setDraft((x) =>
                    x
                      ? syncVisits({
                          ...x,
                          visits: x.visits.map((r, j) =>
                            j === i ? { ...r, ...patch } : r
                          ),
                        })
                      : x
                  )
                }
                onRemove={
                  draft.visits.length > 1
                    ? () =>
                        setDraft((x) =>
                          x
                            ? syncVisits({
                                ...x,
                                visits: x.visits.filter((_, j) => j !== i),
                              })
                            : x
                        )
                    : undefined
                }
              />
            ))}
          </tbody>
          {/* THE TOTAL IS A ROW OF THE TABLE, on the same grid as the figures
              it sums — and it carries the money, because that is the reason
              anybody adds the hours up. */}
          {draft.visits.length > 0 && (
            <tfoot>
              <tr className="h-11 border-t border-border bg-fp-table-header">
                <td colSpan={3} className="px-3 text-sm text-muted-foreground">
                  {draft.visits.length} visit{draft.visits.length === 1 ? "" : "s"}
                </td>
                <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
                  {formatHours(draft.labor)} · {money(draft.labor * draft.laborRate)}
                </td>
                <td aria-hidden />
              </tr>
            </tfoot>
          )}
        </table>
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
            draft.status !== "Completed" ? (
              <HangingAdd
                label="Add charge"
                onClick={() => addLine("extraCharges")}
              />
            ) : undefined
          }
        >
          <LineTable
            rows={draft.extraCharges}
            readOnly={draft.status === "Completed"}
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
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
          {/* THE ACCOUNT OF HOW IT ADDS UP, beside the tables it adds up. */}
          <RailCard title="Summary" icon={<Receipt />}>
            <div className="flex flex-col divide-y divide-border">
              <RailRow label="Parts" value={money(partsSum)} />
              <RailRow
                label={`Labour — ${formatHours(draft.labor)}`}
                value={money(laborSum)}
              />
              <RailRow
                label={`Mileage — ${draft.mileage} mi`}
                value={money(mileageSum)}
              />
              <RailRow label="Fees" value={money(feesSum)} />
              {extraSum > 0 && (
                <RailRow label="Additional charges" value={money(extraSum)} />
              )}
              <RailRow
                label={billed ? "Invoice total" : "Running total"}
                value={money(total)}
                bold
              />
            </div>
            {draft.quote && (
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Quoted on site</span>
                  <span className="text-sm tabular-nums text-foreground">
                    {money(draft.quote.total)}
                  </span>
                </div>
                {isRecorded(draft.status) && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {quoteGap > 0.005
                      ? `${money(quoteGap)} more than the quote — actual labour, mileage and anything extra the job needed.`
                      : "The job came in at the quoted figure."}
                  </p>
                )}
              </div>
            )}
          </RailCard>


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
              {draft.returnOf && (
                <RailRow label="Return visit for" value={draft.returnOf} />
              )}
              {draft.spawnedReturn && (
                <RailRow label="Return visit created" value={draft.spawnedReturn} />
              )}
            </div>
          </RailCard>
        </aside>
      </div>

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
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-md border border-fp-outline-1">
              <div className="border-b border-border bg-fp-surface-1a px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  Known now
                </span>
              </div>
              <QuoteRow label="Parts" value={partsSum} />
              <QuoteRow label="Fees" value={feesSum} />
              <QuoteRow label="Firm subtotal" value={quoteFirm} strong />
            </div>

            <div className="overflow-hidden rounded-md border border-fp-outline-1">
              <div className="border-b border-border bg-fp-surface-1a px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  Estimated — not known until the job has run
                </span>
              </div>
              <QuoteRow
                label={`Labour — ${formatHours(quoteHours)} at ${money(draft.laborRate)}/h`}
                value={quoteHours * draft.laborRate}
                approx
              />
              <QuoteRow
                label={`Mileage — ${quoteMiles} mi at ${money(MILEAGE_RATE)}/mi`}
                value={quoteMiles * MILEAGE_RATE}
                approx
              />
              <QuoteRow label="Estimated subtotal" value={quoteEstimate} approx strong />
            </div>

            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  Estimated total
                </span>
                {/* SAID ONCE, WHERE THE NUMBER IS. A caveat at the top of a
                    quote is read before the figure it is about and forgotten
                    by the time the reader reaches it. */}
                <span className="text-xs text-muted-foreground">
                  Approximate. The invoice will carry the hours and miles
                  actually used.
                </span>
              </div>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                ~{money(quoteFirm + quoteEstimate)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                set("quote", {
                  parts: draft.parts.map((x) => ({ ...x })),
                  fees: draft.fees.map((x) => ({ ...x })),
                  total: quoteFirm + quoteEstimate,
                  sentAt: nowIso(),
                  approvedAt: null,
                });
                setQuoteOpen(false);
                toast.success(`Quote sent to ${draft.customer}`);
              }}
            >
              Send quote
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
                {cfg.returnMode === "continue"
                  ? `stays on ${draft.orderNo}, which goes back to Open for somebody to take the next visit.`
                  : "becomes a new order of its own, and this one is complete."}
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
              {cfg.returnMode === "continue"
                ? "Back to Open"
                : "Complete and raise the rest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TechnicianApp
        order={draft}
        open={fieldOpen}
        onOpenChange={setFieldOpen}
        onSubmit={(r) => {
          const at = nowIso();
          if (!r.completed) {
            /* THE PARTS AND HOURS ARE KEPT EVEN THOUGH THE JOB IS NOT DONE.
               A technician who fitted two of three parts has spent them. */
            setDraft((d) =>
              d
                ? { ...d, parts: r.parts, fees: r.fees, labor: r.labor, quote: r.quote ?? d.quote }
                : d
            );
            onPartsPending?.(draft.id, {
              labor: r.labor,
              parts: r.parts,
            });
            onOpenChange(false);
            return;
          }

          const patch: Partial<ServiceOrder> = {
            parts: r.parts,
            fees: r.fees,
            labor: r.labor,
            mileage: r.mileage,
            quote: r.quote ?? draft.quote,
            arrivedAt: draft.arrivedAt ?? at,
            completedAt: at,
            signed: r.signed,
            partNeeded: null,
          };
          if (cfg.managerApproval) {
            advance("Needs approval", patch);
            toast.success(`${draft.orderNo} submitted from the field`, {
              description: "Waiting on a service manager.",
            });
          } else {
            advance("Completed", {
              ...patch,
              invoiceCreated: cfg.nativeBilling,
              invoicedAt: cfg.nativeBilling ? at : null,
            });
            toast.success(
              cfg.nativeBilling
                ? `${draft.orderNo} submitted — invoice generated`
                : `${draft.orderNo} submitted and approved`
            );
          }
        }}
      />
    </RecordSheet>
  );
}

