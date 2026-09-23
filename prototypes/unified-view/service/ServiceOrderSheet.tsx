import * as React from "react";
import {
  Plus,
  Trash2,
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
  TableCellInput,
  TableRequiredLabel,
} from "@/components/form-layout/table-cells";
import { TimeWindowSlider } from "@/components/form-layout/TimeWindowSlider";
import {
  SheetField,
  SheetSection,
  SheetSectionNote,
} from "@/components/side-sheet/parts";
import { RecordSheet, DraftStatusChip, useDraftSaveState } from "../RecordSheet";
import { PendingStrip } from "../PendingStrip";
import { DATE_FMT } from "../data";
import { RailCard, RailRow } from "./sheet-parts";
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
 * chrome of their own, and the Add row as the table's last band. Three stacked
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

function LabourFigure({
  startedAt,
  completedAt,
  override,
  effective,
  rate,
  locked,
  onOverride,
  onRate,
}: {
  startedAt: string | null;
  completedAt: string | null;
  override: number | null;
  /** The figure every total reads — the override, or the clock. */
  effective: number;
  /** What an hour costs on THIS job. */
  rate: number;
  locked?: boolean;
  onOverride: (v: number | null) => void;
  onRate: (v: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [h, setH] = React.useState("");
  const [m, setM] = React.useState("");
  const measured = computedLabor(startedAt, completedAt);
  const ran = Boolean(startedAt && completedAt);

  const commit = () => {
    const hh = Number(h) || 0;
    const mm = Number(m) || 0;
    onOverride(hh === 0 && mm === 0 && h === "" && m === "" ? null : joinHours(hh, mm));
    setEditing(false);
  };

  /* STOPPED, NOT JUST HANDLED. Enter in here means "I have finished typing
     this number"; left to bubble it reached the sheet and closed the whole
     thing, losing the order the reader was looking at. */
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Enter") commit();
      else setEditing(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <SheetField label="Labour">
        <div className="flex min-h-9 items-center gap-2">
          {editing ? (
            <>
              <Input
                autoFocus
                type="number"
                min={0}
                inputMode="numeric"
                value={h}
                placeholder={String(splitHours(measured).h)}
                onChange={(e) => setH(e.target.value)}
                onKeyDown={keys}
                className="w-16 tabular-nums"
                aria-label="Labour hours"
              />
              <span className="text-sm text-muted-foreground">h</span>
              <Input
                type="number"
                min={0}
                max={59}
                inputMode="numeric"
                value={m}
                placeholder={String(splitHours(measured).m)}
                onChange={(e) => setM(e.target.value)}
                onKeyDown={keys}
                className="w-16 tabular-nums"
                aria-label="Labour minutes"
              />
              <span className="text-sm text-muted-foreground">m</span>
              <Button variant="ghost" size="sm" onClick={commit}>
                Done
              </Button>
            </>
          ) : (
            <>
              <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                {ran || override !== null ? formatHours(effective) : "\u2014"}
              </span>
              {override !== null && ran && (
                /* THE MEASUREMENT, KEPT IN VIEW. Not a warning — a correction
                   is a normal thing to make — so it is muted text, not a
                   tone. */
                <span className="text-xs text-muted-foreground">
                  measured {formatHours(measured)}
                </span>
              )}
              {!ran && override === null && (
                <span className="text-xs text-muted-foreground">
                  Timed from the moment work starts.
                </span>
              )}
              {!locked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    const src = override ?? measured;
                    setH(override !== null || ran ? String(splitHours(src).h) : "");
                    setM(override !== null || ran ? String(splitHours(src).m) : "");
                    setEditing(true);
                  }}
                >
                  {override === null ? "Adjust" : "Change"}
                </Button>
              )}
              {override !== null && !locked && (
                <Button variant="ghost" size="sm" onClick={() => onOverride(null)}>
                  Use measured
                </Button>
              )}
            </>
          )}
        </div>
      </SheetField>

      {/* THE RATE IS PER ORDER, NOT PER COMPANY (Pavan, 2026-09-23). An
          after-hours callout, a contract customer and a warranty job are three
          different numbers, and one global rate meant the difference had to be
          smuggled in as a fee with a name that explained it. */}
      <SheetField label="Cost per hour">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            min={0}
            step={5}
            inputMode="decimal"
            value={rate === 0 ? "" : rate}
            placeholder="0"
            disabled={locked}
            onChange={(e) => onRate(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 tabular-nums"
            aria-label="Cost per hour"
          />
          <span className="ml-auto shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {money(effective * rate)}
          </span>
        </div>
      </SheetField>
    </div>
  );
}

function LineTable({
  rows,
  onChange,
  onAdd,
  onRemove,
  readOnly,
  withQty,
  nameLabel,
  namePlaceholder,
  addLabel,
  emptyLabel,
  total,
}: {
  rows: (PartLine | FeeLine)[];
  onChange: (i: number, patch: Record<string, unknown>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  readOnly: boolean;
  withQty?: boolean;
  nameLabel: string;
  namePlaceholder: string;
  addLabel: string;
  emptyLabel: string;
  total: number;
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
                <td className="p-0 text-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove row ${i + 1}`}
                    className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                    onClick={() => onRemove(i)}
                  >
                    <Trash2 />
                  </Button>
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
      {/* THE ADD ROW IS THE TABLE'S LAST BAND, not a chip on a corner — flush
          inside a card there is no corner to hang from. */}
      {!readOnly && (
        <div className="flex items-center border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={onAdd}
            className="-mx-1 flex h-8 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" /> {addLabel}
          </button>
        </div>
      )}
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
  onPartsPending?: (id: string, data: { labor: number; partNeeded: string }) => void;
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
  const [holdReason, setHoldReason] = React.useState("");
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
  const book = WORK_TYPES[draft.workType];
  const shipTos = shipTosFor(draft.customer);
  const assets = assetsFor(draft.shipTo);

  /* WHO MAY EDIT WHAT, BY STAGE. Intake is the dispatcher's until the job
     starts; the work is the technician's while it is running; past approval
     the record is what was billed and nothing on it moves. */
  const intakeLocked = draft.status !== "Open" && draft.status !== "Assigned";
  const workLocked = isRecorded(draft.status) || draft.status === "Cancelled";
  const billed = draft.status === "Approved" || draft.status === "Completed";

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
  const addLine = (field: "parts" | "fees" | "extraCharges") =>
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
    ...(draft.status === "Open"
      ? [
          {
            key: "tech",
            label: "Assign a technician",
            done: Boolean(draft.technicianId),
            target: SECTION_SCHEDULE,
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
    advance("Approved", {
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
    const startedAt = draft.startedAt ?? draft.arrivedAt ?? at;
    const patch = {
      arrivedAt: draft.arrivedAt ?? at,
      startedAt,
      completedAt: at,
      /* THE CLOCK WRITES THE HOURS, unless somebody has already disagreed
         with it. `labor` is the effective figure every total reads, so it is
         written here rather than derived at each call site — one number,
         decided at the one moment both ends of it are known. */
      labor: draft.laborOverride ?? computedLabor(startedAt, at),
      signed: true,
      partNeeded: null,
    };
    if (cfg.managerApproval) {
      advance("Needs approval", patch);
      toast.success(`${draft.orderNo} recorded — sent for approval`);
    } else {
      advance("Approved", {
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
        advance("In progress", { arrivedAt: nowIso(), startedAt: nowIso() });
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
        onSelect: () => advance("Open", { technicianId: null }),
      };
    if (draft.status === "Open")
      /* OPEN IS THIS MODULE'S DRAFT, so its act has the same name as the one
         3PL uses to get out of Draft: the job exists the moment it is reported,
         and this is where somebody says it is real work with a name against
         it. "Assign technician" named the field it needs rather than the thing
         it does — the technician is the precondition, the act is committing
         the order. */
      return {
        label: "Create Service Order",
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
          draft.status === "Parts-pending"
            ? "Resume and complete"
            : "Mark as completed",
        why: completionMissing.length > 0 ? completionMissing[0] : undefined,
        onSelect: completeNow,
      };
    }
    if (draft.status === "Needs approval")
      return { label: "Approve", onSelect: approveNow };
    if (draft.status === "Approved" && !draft.invoiceCreated)
      return {
        label: "Generate invoice",
        onSelect: () => {
          advance("Approved", { invoiceCreated: true, invoicedAt: nowIso() });
          toast.success(`${draft.orderNo} invoice generated`);
        },
      };
    if (draft.status === "Approved")
      return {
        label: "Mark synced to accounting",
        onSelect: () => advance("Completed", { synced: true }),
      };
    return {
      label: "Download invoice",
      onSelect: () => toast.success(`${draft.orderNo} invoice downloaded`),
    };
  })();

  /* THE REASON THE BUTTON IS DEAD SITS BESIDE IT, never on it. A label that
     states a condition asks the reader to press a fact. */
  const blockedWhy =
    draft.status === "Open" && !draft.technicianId
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
        ) : draft.status === "Parts-pending" ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Waiting on a part</span>
            <span className="text-muted-foreground">
              {draft.partNeeded}
              {draft.spawnedReturn
                ? ` · linked return visit ${draft.spawnedReturn} created`
                : " · rolled forward on this order"}
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
        draft.status === "In progress" && onPartsPending ? (
          <Popover open={holdOpen} onOpenChange={setHoldOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">Waiting on a part</Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <SheetField label="Part or reason" required>
                <Input
                  value={holdReason}
                  placeholder="e.g. 2-inch pump seal on order"
                  onChange={(e) => setHoldReason(e.target.value)}
                />
              </SheetField>
              <p className="mt-2 text-sm text-muted-foreground">
                {cfg.returnMode === "spawn"
                  ? "A linked return visit will be created, so the second trip is its own job with its own schedule."
                  : "This job stays open and rolls to tomorrow. No second order is created."}
              </p>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  disabled={!holdReason.trim()}
                  onClick={() => {
                    onPartsPending(draft.id, {
                      labor: draft.labor,
                      partNeeded: holdReason.trim(),
                    });
                    setHoldOpen(false);
                    setHoldReason("");
                  }}
                >
                  Save as parts-pending
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
      <SheetSection
        id={SECTION_ASSET}
        title="Asset"
        note={
          <SheetSectionNote label="Why it cascades">
            <p className="text-foreground">
              Customer, then site, then the asset standing at it.
            </p>
            <p className="mt-1.5 text-muted-foreground">
              A job is raised against a tank that is already out on rent, so the
              asset is chosen from the ones deployed at the chosen site rather
              than typed. A typed asset is a job nobody can trace back to a
              piece of equipment.
            </p>
          </SheetSectionNote>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Customer" required>
            <Combobox
              className="w-full"
              value={draft.customer}
              onValueChange={(v) =>
                setDraft((d) =>
                  d
                    ? { ...d, customer: v, shipTo: "", assetId: "", assetName: "", assetType: "" }
                    : d
                )
              }
              options={customers}
              placeholder="Select customer"
              searchPlaceholder="Search customers…"
              disabled={intakeLocked}
            />
          </SheetField>
          <SheetField label="Ship-to" required>
            <Combobox
              className="w-full"
              value={draft.shipTo}
              onValueChange={(v) =>
                setDraft((d) =>
                  d ? { ...d, shipTo: v, assetId: "", assetName: "", assetType: "" } : d
                )
              }
              options={shipTos}
              placeholder={draft.customer ? "Select ship-to" : "Select a customer first"}
              searchPlaceholder="Search sites…"
              disabled={intakeLocked || !draft.customer}
            />
          </SheetField>
          <SheetField label="Asset">
            <Combobox
              className="w-full"
              value={draft.assetName}
              onValueChange={(v) => {
                const a = assets.find((x) => x.name === v);
                setDraft((d) =>
                  d
                    ? { ...d, assetId: a?.id ?? "", assetName: v, assetType: a?.type ?? "" }
                    : d
                );
              }}
              options={assets.map((a) => a.name)}
              placeholder={draft.shipTo ? "Select asset" : "Select a ship-to first"}
              searchPlaceholder="Search assets…"
              disabled={intakeLocked || !draft.shipTo}
            />
          </SheetField>
          <SheetField label="Work type">
            <Combobox
              className="w-full"
              value={draft.workType}
              onValueChange={(v) =>
                setDraft((d) => {
                  if (!d) return d;
                  /* THE PRICE BOOK SEEDS, VISIBLY. Changing the work type
                     replaces the suggested lines only while nothing has been
                     recorded — past that they are what somebody actually
                     fitted, and a dropdown must not throw those away. */
                  if (!cfg.priceBook || isRecorded(d.status))
                    return { ...d, workType: v };
                  const b = WORK_TYPES[v];
                  return {
                    ...d,
                    workType: v,
                    parts: b.parts.map((p) => ({ ...p })),
                    fees: b.fees.map((f) => ({ ...f })),
                  };
                })
              }
              options={WORK_TYPE_NAMES}
              placeholder="Select work type"
              disabled={intakeLocked}
            />
          </SheetField>
        </div>
        <div className="mt-4">
          <SheetField label="Reported fault">
            <Input
              value={draft.fault}
              placeholder="What the customer described"
              onChange={(e) => set("fault", e.target.value)}
              disabled={intakeLocked}
            />
          </SheetField>
        </div>
        {cfg.priceBook && book && (
          <p className="mt-3 text-sm text-muted-foreground">
            From the price book —{" "}
            {book.parts.length
              ? book.parts.map((p) => `${p.name} (${money(p.cost)})`).join(", ")
              : "no default parts"}
            , {book.fees.map((f) => `${f.name} ${money(f.amount)}`).join(", ")}.
          </p>
        )}
      </SheetSection>

      {/* ──────────────────────────────────────────── schedule and who ───── */}
      <SheetSection id={SECTION_SCHEDULE} title="Schedule">
        {/* DATE AND TIME ARE ONE ANSWER, so they share a row; the technician
            is a different question and gets its own line under them. */}
        <div className="grid grid-cols-2 gap-4">
          {/* THE DS DATE CONTROL, not a native `datetime-local`. The browser's
              own field draws a calendar glyph this app cannot theme — in dark
              mode it renders as a pale box that belongs to no palette here —
              and it is the one field in the sheet that would not have matched
              the date on the 3PL order. */}
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
                    at.setHours(
                      Math.floor(scheduledMinutes / 60),
                      scheduledMinutes % 60,
                      0,
                      0
                    );
                    setDraft((x) =>
                      x
                        ? { ...x, scheduledAt: at.toISOString(), dateKey: keyOf(at) }
                        : x
                    );
                  }}
                />
                {/* LEAVING IT UNBOOKED IS AN ANSWER, so it is offered here
                    rather than only by clearing a text field nobody can clear. */}
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => set("scheduledAt", null)}
                  >
                    Dispatch at the yard team's discretion
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </SheetField>
          {/* A PICKER, NOT A SLIDER. An arrival is a time somebody is told, and
              a customer is told "half past twelve" — a handle on a 24-hour
              track asks them to aim at it. The window slider earns its track
              because a window is a span you size; one moment is a value you
              choose, and the list of them is short. */}
          {/* A WINDOW, NOT A MOMENT (Pavan, 2026-09-23) — the same control 3PL
              uses for a delivery window, and for the same reason. A site whose
              gate opens between 7 and 11 was being filed under a single 7:00 AM
              nobody could honour, and the four hours of slack lived in a
              dispatcher's head. Reused rather than rebuilt: two window
              controls in one app is how two windows come to behave
              differently. */}
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
        <div className="mt-4">
          <SheetField
            label="Technician"
            description="Leave unassigned to route to the yard team's queue"
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
        </div>
        {tech && (
          <p className="mt-3 text-sm text-muted-foreground">
            {tech.base} · {tech.skills.join(" · ")} · {tech.phone}
          </p>
        )}
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
          addLabel="Add part"
          emptyLabel="No parts on this job."
          total={partsSum}
          onChange={(i, p) => setLine("parts", i, p)}
          onAdd={() => addLine("parts")}
          onRemove={(i) => removeLine("parts", i)}
        />
      </SheetSection>

      <SheetSection
        title="Fees"
        flush
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
          addLabel="Add fee"
          emptyLabel="No fees on this job."
          total={feesSum}
          onChange={(i, p) => setLine("fees", i, p)}
          onAdd={() => addLine("fees")}
          onRemove={(i) => removeLine("fees", i)}
        />
      </SheetSection>

      {/* LABOUR AND COST (Pavan, 2026-09-23). It was "Labour and mileage" —
          a matched pair of sliders, because both were one number somebody
          entered. Neither is that any more: labour is the clock reading, and
          what it comes to depends on a rate that is this JOB's rather than the
          company's. Mileage stays, under them, because it is the third thing
          the visit cost and it has nowhere better to be. */}
      <SheetSection title="Labour and cost">
        <LabourFigure
          startedAt={draft.startedAt}
          completedAt={draft.completedAt}
          override={draft.laborOverride}
          effective={draft.labor}
          rate={draft.laborRate}
          locked={billed}
          onOverride={(v) => {
            /* ONE PRESS, TWO FIELDS. `labor` is what every total reads, so it
               follows the override immediately rather than waiting for the
               next completion — otherwise the figure on screen and the running
               total disagree until something else happens. */
            set("laborOverride", v);
            set("labor", v ?? computedLabor(draft.startedAt, draft.completedAt));
          }}
          onRate={(v) => set("laborRate", v)}
        />
        <SheetField
          label="Mileage"
          description={
            cfg.defaultMileage > 0 && draft.mileage === cfg.defaultMileage
              ? "The standard trip, from settings."
              : undefined
          }
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={draft.mileage === 0 ? "" : draft.mileage}
              placeholder="0"
              disabled={billed}
              onChange={(e) =>
                set("mileage", Math.max(0, Number(e.target.value) || 0))
              }
              className="w-28 tabular-nums"
              aria-label="Mileage in miles"
            />
            <span className="text-sm text-muted-foreground">mi</span>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {money(MILEAGE_RATE)}/mi · {money(mileageSum)}
            </span>
          </div>
        </SheetField>
      </SheetSection>

      {/* CHARGES ADDED WHEN THE INVOICE WAS RAISED — a return trip, a disposal
          fee, a correction. Kept apart from the fees set at intake because
          "what we agreed to charge" and "what we added afterwards" are
          different answers to a customer's question. */}
      {(draft.status === "Approved" || draft.status === "Completed") && (
        <SheetSection title="Additional charges" flush>
          <LineTable
            rows={draft.extraCharges}
            readOnly={draft.status === "Completed"}
            nameLabel="Charge"
            namePlaceholder="Charge name, e.g. Return trip"
            addLabel="Add charge"
            emptyLabel="No additional charges."
            total={extraSum}
            onChange={(i, p) => setLine("extraCharges", i, p)}
            onAdd={() => addLine("extraCharges")}
            onRemove={(i) => removeLine("extraCharges", i)}
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
              partNeeded: r.partNeeded ?? "",
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
            advance("Approved", {
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

