import * as React from "react";
import {
  Plus,
  Trash2,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar as CalendarIcon,
  Download,
  Receipt,
  History,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
  formatMinutes,
  parseMinutes,
} from "@/components/form-layout/TimeWindowSlider";
import {
  SheetField,
  SheetSection,
  SheetSectionNote,
} from "@/components/side-sheet/parts";
import { RecordSheet, DraftStatusChip, useDraftSaveState } from "../RecordSheet";
import { DATE_FMT } from "../data";
import { MeasureSlider, RailCard, RailRow } from "./sheet-parts";
import { useServiceSettings } from "./settings";
import { TIME_OPTIONS } from "../threepl/orders";
import {
  ACTIVE_TECHNICIANS,
  INTAKE_SOURCES,
  LABOR_RATE,
  MILEAGE_RATE,
  PORTAL_SOURCE,
  PRIORITIES,
  WORK_TYPES,
  WORK_TYPE_NAMES,
  WORK_STATUS_TONE,
  feesTotal,
  isRecorded,
  isWorkable,
  laborTotal,
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

/**
 * WHAT THE FOOTER'S ACT IS STILL WAITING ON, in the one place that does not
 * scroll away from the button it is about.
 *
 * SAME BANNER AS THE 3PL ORDER SHEET, for the same reason: the reason a
 * primary is dead belongs beside it, and beside it there is room for a clause
 * — not for a list. One step at a time, with a counter and a way to step
 * through them, so three missing fields cost one line rather than three.
 */
function MandatoryStepsBanner({
  pending,
}: {
  pending: { key: string; label: string }[];
}) {
  const [at, setAt] = React.useState(0);
  /* The list shortens as fields are filled, so the cursor has to be pulled
     back with it rather than pointing past the end. */
  const i = Math.min(at, Math.max(pending.length - 1, 0));
  React.useEffect(() => {
    if (at > pending.length - 1) setAt(Math.max(pending.length - 1, 0));
  }, [at, pending.length]);

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-fp-banner-accent-success">
        <CircleCheck className="size-4 shrink-0" />
        Everything this order needs is filled in
      </div>
    );
  }

  const step = pending[i];
  const chevron =
    "rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-sm text-fp-banner-accent-caution">
        <Info className="size-4 shrink-0" />
        <span className="truncate">{step.label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-muted-foreground">
        <button
          type="button"
          aria-label="Previous missing field"
          disabled={i === 0}
          onClick={() => setAt(i - 1)}
          className={chevron}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {i + 1} of {pending.length}
        <button
          type="button"
          aria-label="Next missing field"
          disabled={i >= pending.length - 1}
          onClick={() => setAt(i + 1)}
          className={chevron}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </span>
    </div>
  );
}

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
    { key: "customer", label: "Choose a customer", done: Boolean(draft.customer) },
    { key: "shipTo", label: "Choose a ship-to site", done: Boolean(draft.shipTo) },
    { key: "asset", label: "Choose the asset the job is on", done: Boolean(draft.assetId) },
    { key: "workType", label: "Choose a work type", done: Boolean(draft.workType) },
    ...(draft.status === "Open"
      ? [
          {
            key: "tech",
            label: "Assign a technician",
            done: Boolean(draft.technicianId),
          },
        ]
      : []),
  ];
  const pendingSteps = mandatory.filter((x) => !x.done);

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
    /* ARRIVAL IS ITS OWN ACT, because "somebody is on their way" and "somebody
       is on site" are the two facts the Assigned and In progress lanes exist
       to tell apart. The technician's own app is a separate product and does
       not live in this module — when it exists, this is the rung it will
       report into rather than replace. */
    if (draft.status === "Assigned")
      return {
        label: "Start work",
        onSelect: () => advance("In progress", { arrivedAt: nowIso() }),
      };
    if (isWorkable(draft.status)) {
      return {
        label: draft.status === "Parts-pending" ? "Resume and complete" : "Mark complete",
        onSelect: () => {
          const at = nowIso();
          const patch = {
            arrivedAt: draft.arrivedAt ?? at,
            completedAt: at,
            signed: true,
            partNeeded: null,
          };
          if (cfg.managerApproval) {
            advance("Needs approval", patch);
            toast.success(`${draft.orderNo} recorded — sent for approval`);
          } else {
            const billedAt = cfg.nativeBilling ? at : null;
            advance("Approved", {
              ...patch,
              invoiceCreated: cfg.nativeBilling,
              invoicedAt: billedAt,
            });
            toast.success(
              cfg.nativeBilling
                ? `${draft.orderNo} complete — invoice generated`
                : `${draft.orderNo} complete and approved`
            );
          }
        },

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
      : isWorkable(draft.status) && draft.status !== "Assigned" && draft.labor <= 0
        ? "Record the labour hours before proceeding."
        : nextAct.why;

  /* ─────────────────────────────────────────────── the money, worked out ── */

  const partsSum = partsTotal(draft.parts);
  const laborSum = laborTotal(draft.labor);
  const mileageSum = mileageTotal(draft.mileage);
  const feesSum = feesTotal(draft.fees);
  const extraSum = feesTotal(draft.extraCharges);
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
          <MandatoryStepsBanner pending={pendingSteps} />
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
          <MandatoryStepsBanner pending={pendingSteps} />
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
        ) : (
          <Button onClick={nextAct.onSelect}>{nextAct.label}</Button>
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
          <SheetField label="Asset" required>
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
          <SheetField label="Work type" required>
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
      <SheetSection title="Schedule">
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
          <SheetField label="Scheduled time">
            <Combobox
              className="w-full"
              value={draft.scheduledAt ? formatMinutes(scheduledMinutes) : ""}
              onValueChange={(v) => {
                const mins = parseMinutes(v);
                if (mins == null || !draft.scheduledAt) return;
                const at = new Date(draft.scheduledAt);
                at.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
                setDraft((x) =>
                  x ? { ...x, scheduledAt: at.toISOString(), dateKey: keyOf(at) } : x
                );
              }}
              options={TIME_OPTIONS}
              placeholder={draft.scheduledAt ? "Select time" : "No date set"}
              searchPlaceholder="Search times…"
              disabled={workLocked || !draft.scheduledAt}
            />
          </SheetField>
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

      <SheetSection
        title="Labour and mileage"
        note={
          <SheetSectionNote label="Why sliders">
            <p className="text-foreground">
              Both are one number, so both get one handle.
            </p>
            <p className="mt-1.5 text-muted-foreground">
              The same control the delivery window uses, minus the second
              handle — a window is a start and an end, four hours is not. The
              figure is printed beside the label rather than estimated from
              where the handle sits, and what it costs sits at the other edge,
              because that is the reason anybody moves it.
            </p>
          </SheetSectionNote>
        }
      >
        {/* SIDE BY SIDE, 24px APART. They are two halves of one answer — what
            the visit cost in time and in travel — and stacked they read as two
            unrelated questions with the parts table's rhythm between them.
            Every other pair of fields in this sheet is a two-column row; these
            are the same kind of pair. */}
        <div className="grid grid-cols-2 gap-6">
          <MeasureSlider
            label="Labour"
            value={draft.labor}
            onChange={(v) => set("labor", v)}
            max={12}
            step={0.25}
            format={(v) => `${v} h`}
            ticks={[0, 3, 6, 9, 12]}
            trailing={`${money(LABOR_RATE)}/h · ${money(laborSum)}`}
            aria-label="Labour hours"
          />
          <MeasureSlider
            label="Mileage"
            value={draft.mileage}
            onChange={(v) => set("mileage", v)}
            max={200}
            step={1}
            format={(v) => `${v} mi`}
            ticks={[0, 50, 100, 150, 200]}
            trailing={`${money(MILEAGE_RATE)}/mi · ${money(mileageSum)}`}
            aria-label="Mileage"
          />
        </div>
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
                label={`Labour — ${draft.labor} h`}
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

          <RailCard title="Billing" icon={<FileText />}>
            <div className="flex flex-col divide-y divide-border">
              <RailRow
                label="Invoice"
                value={
                  draft.invoiceCreated ? (
                    <StatusChip tone="success">Raised</StatusChip>
                  ) : billed ? (
                    <StatusChip tone="failed">Not generated</StatusChip>
                  ) : (
                    <span className="text-muted-foreground">
                      {cfg.nativeBilling ? "On approval" : "Raised by hand"}
                    </span>
                  )
                }
              />
              {draft.invoiceCreated && (
                <RailRow
                  label="Accounting"
                  value={
                    draft.synced ? (
                      <StatusChip tone="success">Synced</StatusChip>
                    ) : (
                      <StatusChip tone="processing">Next sync</StatusChip>
                    )
                  }
                />
              )}
              <RailRow
                label="Approval"
                value={
                  <span className="text-muted-foreground">
                    {cfg.managerApproval ? "Manager signs off" : "Automatic"}
                  </span>
                }
              />
              {cfg.roiFeed && (
                <RailRow
                  label="Asset payback"
                  value={
                    <span className="text-muted-foreground">Fed by this job</span>
                  }
                />
              )}
            </div>
            {draft.invoiceCreated && (
              <div className="border-t border-border p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => toast.success(`${draft.orderNo} invoice downloaded`)}
                >
                  <Download /> Download invoice
                </Button>
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
    </RecordSheet>
  );
}

