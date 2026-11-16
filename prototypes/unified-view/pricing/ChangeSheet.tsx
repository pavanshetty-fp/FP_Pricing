import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarClock, Clock, Download, History, MoreHorizontal, RotateCw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { fitColumns } from "./fitColumns";
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

export function ChangeSheet({
  id,
  onClose,
  onOpen,
  level = 1,
}: {
  id: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  /** 2 when opened over another sheet — an order's trace (record sheet rule 11). */
  level?: 1 | 2;
}) {
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
        level={level}
      />
      <AlertDialog open={ask === "undo"} onOpenChange={(o) => !o && setAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo {c.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {plural(c.lines.filter((l) => l.outcome === "changed").length, "price")} go back to their earlier values. The undo is
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
  level,
}: {
  level: 1 | 2;
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
  /* HOW FAR THE PRICES MOVED, on average — only where a value moved (a rate
     type or market change names, it does not price). */
  const moved = c.lines.filter((l) => l.delta !== 0);
  const avg = moved.length ? moved.reduce((t, l) => t + l.delta, 0) / moved.length : 0;
  const avgMove = moved.length ? `avg ${avg > 0 ? "+" : "−"}$${Math.abs(avg).toFixed(4)}/gal` : "";
  const action = actionOf(c);

  const tabs = React.useMemo<ViewTab[]>(() => {
    const t: ViewTab[] = [
      {
        key: "lines",
        /* EACH ROW IS ONE PRICE — a ship-to × product — so the tab says so
           (Yash, 2026-11-16: "rows" meant nothing to a reader). */
        label: ahead ? "Prices that change" : "Prices changed",
        noun: "prices",
        one: "price",
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
            values: { customer: customerOf(l.customerId).name, shipto: shiptoOf(l.shiptoId).name, product: productOf(l.productId).name, outcome: LINE_OUTCOME[l.outcome], setting: SETTING_LABEL[l.setting], action: lineAction(l) },
          })
        ),
        nameOf: (r) => `${r.text.shipto} · ${r.text.product}`,
        /* THE ROW SHOWS ALL IT HOLDS — no drawer to repeat it. */
        noOpen: true,
        /* CUSTOMER · SHIP-TO · PRODUCT FIRST in every Pricing filter (Yash,
           2026-11-16), searchable — the questions asked first. */
        facets: [
          { key: "customer", label: "Customer", searchable: true },
          { key: "shipto", label: "Ship-to", searchable: true },
          { key: "product", label: "Product", searchable: true },
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
          { key: "rows", label: "Prices", width: 100, sortable: true },
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
        noOpen: true,
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
          values: { customer: customerOf(o.customerId).name, shipto: shiptoOf(o.shiptoId).name, product: productOf(o.productId).name, reason: o.reason ?? "—" },
        })
      ),
      facets: [
        { key: "customer", label: "Customer", searchable: true },
        { key: "shipto", label: "Ship-to", searchable: true },
        { key: "product", label: "Product", searchable: true },
        { key: "status", label: "Status" },
        { key: "reason", label: "Why kept" },
      ],
      noOpen: true,
      renderCell: (r, key) =>
        key === "status" ? (
          <StatusChip tone={kindTone(ORDER_KIND[r.status as keyof typeof ORDER_KIND] ?? "neutral")} variant="text">
            {r.status}
          </StatusChip>
        ) : undefined,
    });
    /* WIDTHS FROM WHAT EACH COLUMN PRINTS (UX-45) — a long product or
       margin name no longer runs over the next column. */
    return t.map((tab) => ({
      ...tab,
      columns: fitColumns(
        tab.columns,
        tab.rows,
        (r, key) => (key === "status" ? [r.status, r.text.error ?? ""] : [r.text[key] ?? ""]),
        ["status", "action"]
      ),
    }));
  }, [c, editLines]);
  /* A FIGURE OPENS THE ROWS IT COUNTS — the orders figures narrow Orders. */
  const [apply, setApply] = React.useState<{ tab: string; picked: string[]; n: number } | null>(null);
  const openOrders = (status: string | null) => setApply({ tab: "orders", picked: status ? [`status:${status}`] : [], n: Date.now() });
  const openRows = (picked: string[]) => setApply({ tab: "lines", picked, n: Date.now() });

  const exportChange = () => toast.success(`Exporting ${plural(c.lines.length, "price")} of ${c.id} as .csv`);

  return (
    <RecordSheet
      size="full"
      level={level}
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
            Retry failed prices
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
      {/* THE FIGURES, EACH SAYING WHAT IT COUNTS (Yash, 2026-11-16): who and
          where — customers, ship-tos, products, each listed by name on a
          press — then what moved — the prices (ship-to × product) and the
          orders — each opening its tab below. */}
      <div className={FIGURE_STRIP.replace("lg:grid-cols-4", "lg:grid-cols-5")}>
        <Figure
          label="Customers"
          value={customers.length.toLocaleString()}
          note={customers.length === 1 ? customerOf(customers[0]).name : `${customerOf(customers[0]).name} +${customers.length - 1}`}
          list={{
            title: plural(customers.length, "customer"),
            rows: customers.map((id) => ({ label: customerOf(id).name, value: plural(uniq(c.lines.filter((l) => l.customerId === id).map((l) => l.shiptoId)).length, "ship-to") })),
          }}
          openLabel="View list"
        />
        <Figure
          label="Ship-tos"
          value={shiptos.length.toLocaleString()}
          note={shiptos.length === 1 ? shiptoOf(shiptos[0]).name : `${shiptoOf(shiptos[0]).name} +${shiptos.length - 1}`}
          list={{
            title: plural(shiptos.length, "ship-to"),
            rows: shiptos.map((id) => ({ label: shiptoOf(id).name, sub: customerOf(shiptoOf(id).customerId).name })),
          }}
          openLabel="View list"
        />
        <Figure
          label="Products"
          value={products.length.toLocaleString()}
          note={products.length === 1 ? productOf(products[0]).name : `${productOf(products[0]).name} +${products.length - 1}`}
          list={{
            title: plural(products.length, "product"),
            rows: products.map((id) => ({ label: productOf(id).name, value: plural(uniq(c.lines.filter((l) => l.productId === id).map((l) => l.shiptoId)).length, "ship-to") })),
          }}
          openLabel="View list"
        />
        <Figure
          label={ahead ? "Prices that change" : "Prices changed"}
          value={c.lines.length.toLocaleString()}
          note={[failed ? `${failed.toLocaleString()} failed` : "", avgMove].filter(Boolean).join(" · ") || "Ship-to × product"}
          onOpen={() => openRows(failed ? ["outcome:Failed"] : [])}
          openLabel={failed ? "View failed" : "View prices"}
        />
        <Figure
          label={ahead ? "Open orders" : "Orders"}
          value={c.orders.length.toLocaleString()}
          note={`${repriced.length.toLocaleString()} ${ahead ? "reprice" : "repriced"} · ${kept.length.toLocaleString()} ${ahead ? "keep" : "kept"} price`}
          onOpen={c.orders.length ? () => openOrders(null) : undefined}
          openLabel="View orders"
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
          apply={apply}
        />
        <div className="flex min-h-0 flex-col gap-6 overflow-auto">
          <RailCard title="Record" icon={<History />}>
            <dl className="flex flex-col py-1">
              <RailRow label="Change" value={c.id} />
              <RailRow label="Action" value={action} />
              <RailRow label="Entity" value={uniq(c.edits.map((e) => SETTING_LABEL[e.setting])).join(", ")} />
              <RailRow label="Prices changed" value={failed ? `${c.lines.length.toLocaleString()} · ${failed.toLocaleString()} failed` : c.lines.length.toLocaleString()} />
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
              {c.noChange > 0 && <RailRow label="Prices already set" value={c.noChange.toLocaleString()} />}
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

const timeLabel = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
/** Every half hour, plus the change's own time when it is off the grid. */
function timeOptions(current: string) {
  const grid: string[] = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) grid.push(`${String(h).padStart(2, "0")}:${m ? "30" : "00"}`);
  if (!grid.includes(current)) grid.push(current);
  return grid.sort().map((value) => ({ value, label: timeLabel(value) }));
}

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
            {/* THE DELIVERY WINDOW'S HALF-HOUR GRID (threepl TIME_OPTIONS) in the
                DS select — not the browser's own time picker. The clock leads,
                as the calendar does in the date field. */}
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="reschedule-time" className="w-full">
                <Clock />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timeOptions(time).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

