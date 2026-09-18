import * as React from "react";
import { Plus, X, Wrench, FileCheck, Download, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
import {
  SheetField,
  SheetSection,
  SheetSectionNote,
} from "@/components/side-sheet/parts";
import { RecordSheet, DraftStatusChip, useDraftSaveState } from "../RecordSheet";
import { useServiceSettings } from "./settings";
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

const SECTION_MONEY_ID = "service-order-money";

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
 * A LIST OF TYPED LINES — parts, fees, extra charges.
 *
 * ONE COMPONENT, because all three are a name, a number and a way to take the
 * row away; written out three times they would have drifted, and the drift
 * would be in whichever one gets opened least.
 */
function LineRows({
  rows,
  onChange,
  onAdd,
  onRemove,
  readOnly,
  namePlaceholder,
  withQty,
  addLabel,
  emptyLabel,
}: {
  rows: (PartLine | FeeLine)[];
  onChange: (i: number, patch: Record<string, unknown>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  readOnly: boolean;
  namePlaceholder: string;
  withQty?: boolean;
  addLabel: string;
  emptyLabel: string;
}) {
  if (readOnly) {
    if (rows.length === 0)
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    return (
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <MoneyRow
            key={i}
            label={
              withQty && "qty" in r && r.qty > 1
                ? `${r.name || "—"} × ${r.qty}`
                : r.name || "—"
            }
            value={money(
              "cost" in r ? (r as PartLine).cost * (r as PartLine).qty : (r as FeeLine).amount
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            "grid items-center gap-2",
            withQty ? "grid-cols-[1fr_72px_110px_32px]" : "grid-cols-[1fr_110px_32px]"
          )}
        >
          <Input
            value={r.name}
            placeholder={namePlaceholder}
            onChange={(e) => onChange(i, { name: e.target.value })}
          />
          {withQty && (
            <Input
              type="number"
              className="text-center tabular-nums"
              value={(r as PartLine).qty}
              onChange={(e) => onChange(i, { qty: Number(e.target.value) })}
            />
          )}
          <Input
            type="number"
            className="tabular-nums"
            placeholder="$"
            value={"cost" in r ? (r as PartLine).cost : (r as FeeLine).amount}
            onChange={(e) =>
              onChange(i, { [withQty ? "cost" : "amount"]: Number(e.target.value) })
            }
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${r.name || "row"}`}
            onClick={() => onRemove(i)}
          >
            <X />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="-mx-1 flex h-8 w-fit items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Plus className="size-4" /> {addLabel}
      </button>
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
  /** Opens the technician's own app on this job. */
  onOpenTechApp?: (id: string) => void;
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
  onOpenTechApp,
  customers,
  shipTosFor,
  assetsFor,
  blankOrder,
}: ServiceOrderSheetProps) {
  const cfg = useServiceSettings();
  const creating = mode === "create";
  const [draft, setDraft] = React.useState<ServiceOrder | null>(null);
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
    if (lastSaved.current === JSON.stringify(order)) return;
    setDraft({ ...order });
    lastSaved.current = null;
  }, [open, creating, order, blankOrder]);

  const saveState = useDraftSaveState(draft, open && !creating);

  /* AUTOSAVE, DEBOUNCED — the sheet keeps what it says it keeps. */
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
      return {
        label: "Assign technician",
        onSelect: () => advance("Assigned"),
        why: draft.technicianId ? undefined : "Choose a technician above.",
      };
    if (isWorkable(draft.status)) {
      /* THE FIELD APP IS A SETTING, so the act is too. With it off, the same
         rung records the work here instead of sending it somewhere else. */
      if (cfg.serviceTechApp)
        return {
          label:
            draft.status === "Parts-pending"
              ? "Resume in technician app"
              : "Open technician app",
          onSelect: () => onOpenTechApp?.(draft.id),
        };
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
        why: draft.labor > 0 ? undefined : "Record the labour hours below.",
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
      ? "Choose a technician above."
      : isWorkable(draft.status) && !cfg.serviceTechApp && draft.labor <= 0
        ? "Record the labour hours below."
        : nextAct.why;

  const canAct = !blockedWhy;

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
      size="wide"
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      editTitle={`Service order: ${draft.orderNo}`}
      createTitle="New service order"
      createAction="Create and assign"
      canSubmit={readyToCreate}
      /* AUTOSAVED, so Cancel is a promise the sheet cannot keep. */
      showCancel={creating}
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
      footerBanner={
        draft.status === "Parts-pending" ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Waiting on a part</span>
            <span className="text-muted-foreground">
              {draft.partNeeded}
              {draft.spawnedReturn
                ? ` · linked return visit ${draft.spawnedReturn} created`
                : " · rolled forward on this order"}
            </span>
          </div>
        ) : undefined
      }
      footerPrimary={
        creating ? undefined : (
          <div className="flex items-center gap-3">
            {blockedWhy && (
              <span className="text-sm text-muted-foreground">{blockedWhy}</span>
            )}
            <Button disabled={!canAct} onClick={nextAct.onSelect}>
              {nextAct.label}
            </Button>
          </div>
        )
      }
      onSubmit={() => {
        if (creating && onCreate) onCreate(draft);
      }}
    >
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
        <div className="grid grid-cols-2 gap-4">
          <SheetField
            label="Scheduled date and time"
            description="Leave blank to dispatch at the yard team's discretion"
          >
            <Input
              type="datetime-local"
              value={draft.scheduledAt ? draft.scheduledAt.slice(0, 16) : ""}
              onChange={(e) =>
                setDraft((d) => {
                  if (!d) return d;
                  const v = e.target.value;
                  if (!v) return { ...d, scheduledAt: null };
                  const at = new Date(v);
                  const p = (n: number) => String(n).padStart(2, "0");
                  return {
                    ...d,
                    scheduledAt: at.toISOString(),
                    dateKey: `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`,
                  };
                })
              }
              disabled={workLocked}
            />
          </SheetField>
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
        id={SECTION_MONEY_ID}
        title="Work and billing"
        note={
          <SheetSectionNote label="How this is worked out">
            Parts at cost × quantity, labour at {money(LABOR_RATE)} an hour,
            mileage at {money(MILEAGE_RATE)} a mile, plus the fees. Fees are set
            by the dispatcher at intake and added to on site; labour and mileage
            only exist once the job has happened.
          </SheetSectionNote>
        }
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Parts</p>
            <LineRows
              rows={draft.parts}
              withQty
              readOnly={workLocked}
              namePlaceholder="Part"
              addLabel="Add part"
              emptyLabel="No parts on this job."
              onChange={(i, patch) => setLine("parts", i, patch)}
              onAdd={() => addLine("parts")}
              onRemove={(i) => removeLine("parts", i)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Fees</p>
            <LineRows
              rows={draft.fees}
              readOnly={billed}
              namePlaceholder="Fee name, e.g. Service call fee"
              addLabel="Add fee"
              emptyLabel="No fees on this job."
              onChange={(i, patch) => setLine("fees", i, patch)}
              onAdd={() => addLine("fees")}
              onRemove={(i) => removeLine("fees", i)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SheetField label="Labour (hours)">
              <Input
                type="number"
                className="tabular-nums"
                value={draft.labor}
                onChange={(e) => set("labor", Number(e.target.value))}
                disabled={workLocked}
              />
            </SheetField>
            <SheetField label="Mileage (miles)">
              <Input
                type="number"
                className="tabular-nums"
                value={draft.mileage}
                onChange={(e) => set("mileage", Number(e.target.value))}
                disabled={workLocked}
              />
            </SheetField>
          </div>

          {/* CHARGES ADDED WHEN THE INVOICE WAS RAISED — a return trip, a
              disposal fee, a correction. They are kept apart from the fees set
              at intake because "what we agreed to charge" and "what we added
              afterwards" are different answers to a customer's question. */}
          {(draft.status === "Approved" || draft.status === "Completed") && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Additional charges
              </p>
              <LineRows
                rows={draft.extraCharges}
                readOnly={draft.status === "Completed"}
                namePlaceholder="Charge name, e.g. Return trip"
                addLabel="Add charge"
                emptyLabel="No additional charges."
                onChange={(i, patch) => setLine("extraCharges", i, patch)}
                onAdd={() => addLine("extraCharges")}
                onRemove={(i) => removeLine("extraCharges", i)}
              />
            </div>
          )}

          <div className="rounded-lg border border-fp-outline-1 bg-fp-surface-1a p-4">
            <MoneyRow label="Parts" value={money(partsSum)} />
            <MoneyRow
              label={`Labour — ${draft.labor} h × ${money(LABOR_RATE)}`}
              value={money(laborSum)}
            />
            <MoneyRow
              label={`Mileage — ${draft.mileage} mi × ${money(MILEAGE_RATE)}`}
              value={money(mileageSum)}
            />
            <MoneyRow label="Fees" value={money(feesSum)} />
            {extraSum > 0 && (
              <MoneyRow label="Additional charges" value={money(extraSum)} />
            )}
            <div className="mt-2 border-t border-fp-outline-1 pt-2">
              <MoneyRow
                label={billed ? "Invoice total" : "Running total"}
                value={money(total)}
                bold
              />
            </div>
          </div>
        </div>
      </SheetSection>

      {/* ───────────────────────────────────────────────────── billing ───── */}
      <SheetSection
        title="Billing"
        note={
          <SheetSectionNote label="How billing runs here">
            <p className="text-foreground">
              {cfg.nativeBilling
                ? "Native billing is on: the invoice writes itself once the job is approved."
                : "Native billing is off: the costs are captured here, and somebody raises the invoice."}
            </p>
            <p className="mt-1.5 text-muted-foreground">
              Either way it reaches accounting on a batch sync afterwards, not
              in real time — which is the difference between Approved and
              Completed.
            </p>
          </SheetSectionNote>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Invoice</span>
            {draft.invoiceCreated ? (
              <StatusChip tone="success">Raised</StatusChip>
            ) : billed ? (
              <StatusChip tone="failed">Not generated</StatusChip>
            ) : (
              <span className="text-muted-foreground">
                {cfg.nativeBilling
                  ? "Generates itself on approval"
                  : "Raised by hand after approval"}
              </span>
            )}
          </div>
          {draft.invoiceCreated && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Accounting</span>
              {draft.synced ? (
                <StatusChip tone="success">Synced</StatusChip>
              ) : (
                <StatusChip tone="processing">Waiting on the next sync</StatusChip>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Approval</span>
            <span className="text-foreground">
              {cfg.managerApproval
                ? "A service manager signs the job off before it is billed"
                : "Approved automatically the moment the work is recorded"}
            </span>
          </div>
          {cfg.roiFeed && (
            <p className="text-sm text-muted-foreground">
              What this job costs feeds {draft.assetName}'s payback.
            </p>
          )}
          {draft.invoiceCreated && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(`${draft.orderNo} invoice downloaded`)}
              >
                <Download /> Download invoice
              </Button>
            </div>
          )}
        </div>
      </SheetSection>

      {/* ─────────────────────────────────────────────────── provenance ───── */}
      <SheetSection title="Record">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Raised by</p>
            <p className="text-foreground">{draft.raisedBy}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Arrived on site</p>
            <p className="text-foreground">
              {draft.arrivedAt
                ? new Date(draft.arrivedAt).toLocaleString()
                : "Not yet"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Work recorded</p>
            <p className="text-foreground">
              {draft.completedAt
                ? new Date(draft.completedAt).toLocaleString()
                : "Not yet"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer signature</p>
            <p className="text-foreground">{draft.signed ? "Captured" : "Not captured"}</p>
          </div>
          {draft.returnOf && (
            <div>
              <p className="text-muted-foreground">Return visit for</p>
              <p className="text-foreground">{draft.returnOf}</p>
            </div>
          )}
          {draft.spawnedReturn && (
            <div>
              <p className="text-muted-foreground">Return visit created</p>
              <p className="text-foreground">{draft.spawnedReturn}</p>
            </div>
          )}
        </div>
      </SheetSection>
    </RecordSheet>
  );
}

/** Icons kept in scope for the acts that use them. */
export const SHEET_ICONS = { Wrench, FileCheck, Send };
