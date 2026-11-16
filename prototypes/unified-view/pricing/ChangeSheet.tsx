import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarClock, Download, MoreHorizontal, RotateCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { DateField } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordSheet } from "../RecordSheet";
import { RailCard, RailRow } from "../SheetCards";
import { kindTone } from "../statusKind";
import { RecordViews, type ViewRow, type ViewTab } from "../masterdata/RecordViews";
import { FIGURE_STRIP, Figure, WORK_AREA, useDockedWorkArea } from "../masterdata/sheetParts";
import {
  SETTING_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  changeSummary,
  customerOf,
  editAction,
  editSummary,
  fmtDate,
  fmtDateTime,
  fmtWhen,
  lineAction,
  money,
  plural,
  productOf,
  shiptoOf,
  uniq,
  type ChangeRecord,
} from "./changeLog";
import { cancelChange, rescheduleChange, retryChange, undoChange, useChangeLog } from "./changeLogStore";
import { STATUS_KIND, actionOf } from "./activityFeed";

/*
  A CHANGE, OPENED (Yash, 2026-11-16) — the Change history sheet of the old
  Pricing prototype on the 360 layout (Master Data › Ship-to 360): the figures
  across the top, then the work area — the change's lists as tabs on the
  left (Ship-tos affected · Edits · Orders), the details card on the right.

  Read-only, so NO FOOTER (record sheet rule 28) — except where the change has
  a next act: a partly failed change retries its failed rows, a scheduled one
  is rescheduled. Acts ON the change sit in the ⋯ menu: Undo (the latest
  change only), Cancel schedule, Export. Lists open nothing per row, so these
  replace the old row menu.
*/

const LINE_OUTCOME = { changed: "Changed", failed: "Failed", pending: "Pending" } as const;
const OUTCOME_KIND = { Changed: "success", Failed: "critical", Pending: "info" } as const;
const ORDER_KIND = { Repriced: "success", "Kept price": "neutral" } as const;

const cents = (n: number) => (n === 0 ? "—" : `${n > 0 ? "+" : "−"}$${Math.abs(n).toFixed(4)}`);

export function ChangeSheet({ id, onClose, onOpen }: { id: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const log = useChangeLog();
  const c = log.changes.find((x) => x.id === id) ?? null;
  const [ask, setAsk] = React.useState<"undo" | "cancel" | "reschedule" | null>(null);
  if (!c) return null;
  return (
    <>
      <ChangeSheetBody
        c={c}
        latest={log.latestId === c.id}
        summary={changeSummary(c, log.entityMap)}
        editLines={c.edits.map((e) => editSummary(e, c.lines, log.entityMap))}
        onClose={onClose}
        onOpen={onOpen}
        onAsk={setAsk}
      />
      <AlertDialog open={ask === "undo"} onOpenChange={(o) => !o && setAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo {c.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {plural(c.lines.filter((l) => l.outcome === "changed").length, "row")} go back to their earlier values. The undo is
              logged as a new change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const uid = undoChange(c.id);
                if (uid) onOpen(uid);
              }}
            >
              Undo change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={ask === "cancel"} onOpenChange={(o) => !o && setAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {c.id}?</AlertDialogTitle>
            <AlertDialogDescription>It won't run {fmtWhen(c.effectiveAt)}. It stays in the log as canceled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep schedule</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => cancelChange(c.id)}>
              Cancel schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RescheduleDialog change={ask === "reschedule" ? c : null} onClose={() => setAsk(null)} />
    </>
  );
}

function ChangeSheetBody({
  c,
  latest,
  summary,
  editLines,
  onClose,
  onOpen,
  onAsk,
}: {
  c: ChangeRecord;
  latest: boolean;
  summary: string;
  editLines: string[];
  onClose: () => void;
  onOpen: (id: string) => void;
  onAsk: (a: "undo" | "cancel" | "reschedule") => void;
}) {
  const work = useDockedWorkArea();
  const shiptos = uniq(c.lines.map((l) => l.shiptoId));
  const customers = uniq(c.lines.map((l) => l.customerId));
  const products = uniq(c.lines.map((l) => l.productId));
  const failed = c.lines.filter((l) => l.outcome === "failed").length;
  const repriced = c.orders.filter((o) => o.status === "repriced");
  const kept = c.orders.filter((o) => o.status === "kept");
  const ahead = c.status === "scheduled" || c.status === "canceled";
  const action = actionOf(c);

  const tabs = React.useMemo<ViewTab[]>(() => {
    const t: ViewTab[] = [
      {
        key: "lines",
        label: "Ship-tos affected",
        noun: "rows",
        one: "row",
        columns: [
          { key: "customer", label: "Customer", width: 200, sortable: true },
          { key: "shipto", label: "Ship-to", width: 200, sortable: true },
          { key: "product", label: "Product", width: 170, sortable: true },
          { key: "status", label: "Outcome", width: 200, sortable: true },
          { key: "setting", label: "Entity", width: 110, sortable: true },
          { key: "action", label: "Action", width: 130, sortable: true },
          { key: "before", label: "Before", width: 220, sortable: true },
          { key: "after", label: "After", width: 220, sortable: true },
          { key: "delta", label: "Price change ($/gal)", width: 170, sortable: true },
        ],
        /* FAILED ROWS FIRST — they are what the reader came for. */
        rows: [...c.lines]
          .sort((a, b) => Number(b.outcome === "failed") - Number(a.outcome === "failed"))
          .map(
          (l, i): ViewRow => ({
            id: `${l.rowId}-${l.setting}-${i}`,
            text: {
              customer: customerOf(l.customerId).name,
              shipto: shiptoOf(l.shiptoId).name,
              product: productOf(l.productId).name,
              setting: SETTING_LABEL[l.setting],
              action: lineAction(l),
              before: l.before || "—",
              after: l.after || "—",
              delta: cents(l.delta),
              error: l.error ?? "",
            },
            sort: { delta: l.delta },
            status: LINE_OUTCOME[l.outcome],
            values: { outcome: LINE_OUTCOME[l.outcome], setting: SETTING_LABEL[l.setting], action: lineAction(l) },
          })
        ),
        facets: [
          /* ITS OWN KEY, not "status" — facets are shared across the tabs, and
             Orders has a Status of its own. */
          { key: "outcome", label: "Outcome" },
          { key: "setting", label: "Entity" },
          { key: "action", label: "Action" },
        ],
        renderCell: (r, key) =>
          key === "status" ? (
            /* THE REASON UNDER A FAILURE, as the old impact table had it. */
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <StatusChip tone={kindTone(OUTCOME_KIND[r.status as keyof typeof OUTCOME_KIND] ?? "neutral")} variant="text">
                {r.status}
              </StatusChip>
              {r.text.error && <span className="truncate text-xs text-muted-foreground">{r.text.error}</span>}
            </span>
          ) : key === "action" ? (
            <Pill>{r.text.action}</Pill>
          ) : undefined,
      },
    ];
    if (c.edits.length > 1)
      t.push({
        key: "edits",
        label: "Edits",
        noun: "edits",
        one: "edit",
        columns: [
          { key: "setting", label: "Entity", width: 140, sortable: true },
          { key: "action", label: "Action", width: 140, sortable: true },
          { key: "value", label: "Change", width: 360, sortable: true },
          { key: "rows", label: "Rows", width: 100, sortable: true },
        ],
        rows: c.edits.map(
          (e, i): ViewRow => ({
            id: `edit-${i}`,
            text: {
              setting: SETTING_LABEL[e.setting],
              action: editAction(e),
              value: editLines[i],
              rows: c.lines.filter((l) => l.setting === e.setting).length.toLocaleString(),
            },
            sort: { rows: c.lines.filter((l) => l.setting === e.setting).length },
            status: editAction(e),
            values: { setting: SETTING_LABEL[e.setting] },
          })
        ),
        facets: [{ key: "setting", label: "Entity" }],
        renderCell: (r, key) => (key === "action" ? <Pill>{r.text.action}</Pill> : undefined),
      });
    t.push({
      key: "orders",
      label: "Orders",
      noun: "orders",
      one: "order",
      columns: [
        { key: "id", label: "Order", width: 120, sortable: true },
        { key: "customer", label: "Customer", width: 200, sortable: true },
        { key: "shipto", label: "Ship-to", width: 200, sortable: true },
        { key: "product", label: "Product", width: 170, sortable: true },
        { key: "delivery", label: "Delivery", width: 130, sortable: true },
        { key: "gallons", label: "Gallons", width: 110, sortable: true },
        { key: "before", label: "Price before ($/gal)", width: 170, sortable: true },
        { key: "after", label: "Price after ($/gal)", width: 160, sortable: true },
        { key: "status", label: "Status", width: 120, sortable: true },
        { key: "reason", label: "Why kept", width: 130, sortable: true },
      ],
      rows: c.orders.map(
        (o): ViewRow => ({
          id: o.id,
          text: {
            id: o.id,
            customer: customerOf(o.customerId).name,
            shipto: shiptoOf(o.shiptoId).name,
            product: productOf(o.productId).name,
            delivery: fmtDate(o.delivery),
            gallons: o.gallons.toLocaleString(),
            before: money(o.before),
            after: money(o.status === "kept" ? o.before : o.after),
            reason: o.reason ?? "—",
          },
          sort: { delivery: o.delivery, gallons: o.gallons, before: o.before, after: o.after },
          status: o.status === "repriced" ? "Repriced" : "Kept price",
          values: { reason: o.reason ?? "—" },
        })
      ),
      facets: [
        { key: "status", label: "Status" },
        { key: "reason", label: "Why kept" },
      ],
      renderCell: (r, key) =>
        key === "status" ? (
          <StatusChip tone={kindTone(ORDER_KIND[r.status as keyof typeof ORDER_KIND] ?? "neutral")} variant="text">
            {r.status}
          </StatusChip>
        ) : undefined,
    });
    return t;
  }, [c, editLines]);

  const exportChange = () => toast.success(`Exporting ${plural(c.lines.length, "row")} of ${c.id} as .csv`);

  return (
    <RecordSheet
      size="full"
      open
      onOpenChange={(o) => !o && onClose()}
      mode="edit"
      editTitle={summary}
      createTitle=""
      createAction=""
      showCancel={false}
      stepNav={false}
      noFooter={c.status !== "partlyFailed" && c.status !== "scheduled"}
      footerPrimary={
        c.status === "partlyFailed" ? (
          <Button onClick={() => retryChange(c.id)}>
            <RotateCw />
            Retry failed rows
          </Button>
        ) : c.status === "scheduled" ? (
          <Button onClick={() => onAsk("reschedule")}>
            <CalendarClock />
            Edit schedule
          </Button>
        ) : undefined
      }
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {[c.id, SOURCE_LABEL[c.source], c.by, fmtDateTime(c.madeAt)].join(" · ")}
        </span>
      }
      headerAside={
        <span className="flex items-center gap-1.5">
          <StatusChip tone={kindTone(STATUS_KIND[c.status])} variant="soft">
            {STATUS_LABEL[c.status]}
          </StatusChip>
          <Pill>{action}</Pill>
        </span>
      }
      headerMenu={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More change actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {latest && (
              <DropdownMenuItem onSelect={() => onAsk("undo")}>
                <Undo2 />
                Undo change
              </DropdownMenuItem>
            )}
            {c.status === "scheduled" && (
              <DropdownMenuItem onSelect={() => onAsk("cancel")}>
                <Ban />
                Cancel schedule
              </DropdownMenuItem>
            )}
            {(latest || c.status === "scheduled") && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={exportChange}>
              <Download />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      onSubmit={() => {}}
    >
      <div className={FIGURE_STRIP}>
        <Figure label="Ship-tos" value={shiptos.length.toLocaleString()} note={plural(customers.length, "customer")} />
        <Figure
          label="Rows"
          value={c.lines.length.toLocaleString()}
          note={failed ? `${failed.toLocaleString()} failed` : plural(products.length, "product")}
        />
        <Figure
          label={ahead ? "Open orders that reprice" : "Orders repriced"}
          value={repriced.length.toLocaleString()}
          note={plural(repriced.reduce((t, o) => t + o.gallons, 0), "gal", "gal")}
        />
        <Figure
          label={ahead ? "Orders that keep their price" : "Orders that kept their price"}
          value={kept.length.toLocaleString()}
          note={plural(kept.reduce((t, o) => t + o.gallons, 0), "gal", "gal")}
        />
      </div>

      <div ref={work} className={WORK_AREA}>
        <RecordViews
          resetKey={c.id}
          tabs={tabs}
          searchPlaceholder="Search this change"
          historyKey="pricing-change"
          /* A CHANGE WITH FAILED ROWS OPENS ON THEM (Yash, 2026-11-16) — the
             Outcome filter is on; its chip clears it to see every row. */
          initialPicked={failed ? ["outcome:Failed"] : undefined}
        />
        <div className="flex min-h-0 flex-col gap-3 overflow-auto">
          <RailCard title="Details">
            <dl className="flex flex-col py-1">
              <RailRow label="Change" value={c.id} />
              <RailRow label="Action" value={action} />
              <RailRow label="Entity" value={uniq(c.edits.map((e) => SETTING_LABEL[e.setting])).join(", ")} />
              <RailRow label="Made via" value={SOURCE_LABEL[c.source]} />
              <RailRow label="Made by" value={c.by} />
              <RailRow label="Made on" value={fmtDateTime(c.madeAt)} />
              {c.effectiveAt !== c.madeAt && (
                <RailRow
                  label={c.status === "scheduled" ? "Runs" : c.status === "canceled" ? "Was to run" : "Ran"}
                  value={fmtWhen(c.effectiveAt)}
                />
              )}
              {c.editedAt && <RailRow label="Schedule edited" value={fmtWhen(c.editedAt)} />}
              {c.retriedAt && <RailRow label="Failed rows retried" value={fmtWhen(c.retriedAt)} />}
              {c.undoOf && <RailRow label="Undoes" value={<ChangeLink id={c.undoOf} onOpen={onOpen} />} />}
              {c.undoneBy && <RailRow label="Undone by" value={<ChangeLink id={c.undoneBy} onOpen={onOpen} />} />}
              {c.noChange > 0 && <RailRow label="Rows already set" value={c.noChange.toLocaleString()} />}
            </dl>
          </RailCard>
        </div>
      </div>
    </RecordSheet>
  );
}

function ChangeLink({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="text-sm text-foreground underline-offset-4 hover:underline" onClick={() => onOpen(id)}>
      {id}
    </button>
  );
}

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Move a scheduled change: a day and a time. */
function RescheduleDialog({ change, onClose }: { change: ChangeRecord | null; onClose: () => void }) {
  const [day, setDay] = React.useState<Date | null>(null);
  const [time, setTime] = React.useState("06:00");
  React.useEffect(() => {
    if (!change) return;
    setDay(new Date(change.effectiveAt));
    setTime(hhmm(change.effectiveAt));
  }, [change]);
  const when = (() => {
    if (!day || !/^\d\d:\d\d$/.test(time)) return null;
    const d = new Date(day);
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  })();
  return (
    <Dialog open={!!change} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit schedule · {change?.id}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-6">
          <Field>
            <FieldLabel>Runs on</FieldLabel>
            <DateField value={day} onChange={setDay} />
          </Field>
          <Field>
            <FieldLabel htmlFor="reschedule-time">Time</FieldLabel>
            <Input id="reschedule-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!change || when === null) return;
              rescheduleChange(change.id, when);
              onClose();
            }}
          >
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

