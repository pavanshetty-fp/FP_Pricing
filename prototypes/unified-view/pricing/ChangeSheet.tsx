import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarClock, ChevronRight, Clock, Download, MoreHorizontal, RotateCw, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import type { SheetPresentation } from "../sheetPresentation";
import { fitColumns } from "./fitColumns";
import { kindTone } from "../statusKind";
import { RecordViews, type ViewRow, type ViewTab } from "../masterdata/RecordViews";
import { AffectedSheet, type AffectedKind } from "./customerShiptoParts";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  FIELD_LABEL,
  NOT_SET,
  IS_LIST,
  type ChangeRecord,
  type Edit,
  type EntityMap,
  type ImpactLine,
} from "./changeLog";
import { cancelChange, rescheduleChange, retryChange, undoChange, useChangeLog } from "./changeLogStore";
import { STATUS_KIND, actionOf, scopedChange, type FeedScope } from "./activityFeed";

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

const cents = (n: number) => (n === 0 ? "—" : `${n > 0 ? "+" : "−"}$${Math.abs(n).toFixed(4)}`);

export function ChangeSheet({
  id,
  onClose,
  onOpen,
  level = 1,
  scope = null,
  presentation,
}: {
  /** "full" to open as a full page whatever the app-wide setting. */
  presentation?: SheetPresentation;
  id: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  /** 2 when opened over another sheet — an order's trace (record sheet rule 11). */
  level?: 1 | 2;
  /** Opened from a feed filtered to one customer or ship-to: the change as
   *  it reached them only (Yash, 2026-11-18). */
  scope?: FeedScope;
}) {
  const log = useChangeLog();
  const whole = log.changes.find((x) => x.id === id) ?? null;
  const c = React.useMemo(() => {
    if (!whole || !scope) return whole;
    const cut = scopedChange(whole, scope);
    const edits = cut.edits.filter((e) => cut.lines.some((l) => l.setting === e.setting));
    return { ...cut, edits: edits.length ? edits : cut.edits };
  }, [whole, scope]);
  const [ask, setAsk] = React.useState<ChangeAsk | null>(null);
  if (!c) return null;
  return (
    <>
      <ChangeSheetBody
        c={c}
        latest={log.latestId === c.id}
        summary={changeSummary(c, log.entityMap)}
        editLines={c.edits.map((e) => editSummary(e, c.lines, log.entityMap))}
        ents={log.entityMap}
        onClose={onClose}
        onOpen={onOpen}
        onAsk={setAsk}
        level={level}
        presentation={presentation}
      />
      <ChangeDialogs change={whole} ask={ask} onClose={() => setAsk(null)} onUndone={onOpen} />
    </>
  );
}

export type ChangeAsk = "undo" | "cancel" | "reschedule";

/**
 * THE ACTS ON A CHANGE THAT ASK FIRST — Undo, Cancel schedule, Edit schedule —
 * shared by the change's sheet (⋯ and footer) and its row ⋯ in Activity feed,
 * so both ask the same question the same way.
 */
export function ChangeDialogs({
  change: c,
  ask,
  onClose,
  onUndone,
}: {
  change: ChangeRecord | null;
  ask: ChangeAsk | null;
  onClose: () => void;
  /** The undo is a new change — open it. */
  onUndone?: (id: string) => void;
}) {
  if (!c) return null;
  const setAsk = (v: null) => v === null && onClose();
  const onOpen = (id: string) => onUndone?.(id);
  return (
    <>
      <AlertDialog open={ask === "undo"} onOpenChange={(o) => !o && setAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this change?</AlertDialogTitle>
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
            <AlertDialogTitle>Cancel this schedule?</AlertDialogTitle>
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

/**
 * A CHANGE'S ⋯ ON ITS ROW (Yash, 2026-11-16) — the acts its sheet offers, so
 * they can be done from the list: Retry failed prices, Edit / Cancel schedule,
 * Undo (the latest change only), Export. Row actions show on hover and focus
 * (IX-3).
 */
export function ChangeRowMenu({ c, latest, onAsk }: { c: ChangeRecord; latest: boolean; onAsk: (a: ChangeAsk) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Change actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {c.status === "partlyFailed" && (
          <DropdownMenuItem onSelect={() => retryChange(c.id)}>
            <RotateCw />
            Retry failed prices
          </DropdownMenuItem>
        )}
        {c.status === "scheduled" && (
          <>
            <DropdownMenuItem onSelect={() => onAsk("reschedule")}>
              <CalendarClock />
              Edit schedule
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAsk("cancel")}>
              <Ban />
              Cancel schedule
            </DropdownMenuItem>
          </>
        )}
        {latest && (
          <DropdownMenuItem onSelect={() => onAsk("undo")}>
            <Undo2 />
            Undo change
          </DropdownMenuItem>
        )}
        {(latest || c.status === "scheduled" || c.status === "partlyFailed") && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={() => toast.success(`Exporting ${plural(c.lines.length, "price")} as .csv`)}>
          <Download />
          Export
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChangeSheetBody({
  c,
  summary,
  editLines,
  ents,
  onClose,
  onAsk,
  level,
  presentation,
}: {
  level: 1 | 2;
  presentation?: SheetPresentation;
  c: ChangeRecord;
  latest: boolean;
  summary: string;
  editLines: string[];
  ents: EntityMap;
  onClose: () => void;
  onOpen: (id: string) => void;
  onAsk: (a: "undo" | "cancel" | "reschedule") => void;
}) {
  const work = useDockedWorkArea();
  const shiptos = uniq(c.lines.map((l) => l.shiptoId));
  /* A customer's own pricing, set up before any ship-to inherits it, has no
     lines — it still names its customer (Yash, 2026-11-17). */
  const customers = uniq([...c.lines.map((l) => l.customerId), ...(c.customerId ? [c.customerId] : [])]);
  const products = uniq(c.lines.map((l) => l.productId));
  const failed = c.lines.filter((l) => l.outcome === "failed").length;
  const repriced = c.orders.filter((o) => o.status === "repriced");
  /* A SETUP RECORD'S OWN FIELDS — renamed, hubs moved… — move no price. */
  const noPrice = c.edits.length > 0 && c.edits.every((e) => !!e.field);
  const action = actionOf(c);

  const tabs = React.useMemo<ViewTab[]>(() => {
    const t: ViewTab[] = [
      {
        key: "lines",
        /* EACH ROW IS ONE PRICE — a ship-to × product — so the tab says so
           (Yash, 2026-11-16: "rows" meant nothing to a reader). */
        /* A PRICE IS ONE PRODUCT AT ONE SHIP-TO — said in the name (Yash,
           2026-11-17: "Ship-to × product" needed explaining out loud). */
        /* SHIP-TO × PRODUCT PRICES (Yash, 2026-11-18) — what one row is. */
        label: "Ship-to × product prices",
        noun: "ship-to × product prices",
        one: "ship-to × product price",
        /* PRODUCT, SHIP-TO, CUSTOMER — the price is the product's, at a
           ship-to, of a customer (Yash, 2026-11-17). Old and New, as the
           orders say "new price" and "kept old price"; the old one muted. */
        columns: [
          /* THE CHANGE ON THE FIRST SCREEN (Yash, 2026-11-17) — Customer
             moves to the end, so no one scrolls sideways to read it. */
          /* SHIP-TO, ITS CUSTOMER, THEN PRODUCT (Yash, 2026-11-18). */
          { key: "shipto", label: "Ship-to", width: 170, sortable: true },
          { key: "customer", label: "Customer", width: 250, sortable: true },
          { key: "product", label: "Product", width: 170, sortable: true },
          { key: "setting", label: "Artifact", width: 110, sortable: true },
          { key: "action", label: "Action", width: 130, sortable: true },
          /* THE CHANGE, AS THE FEED SAYS IT (Yash, 2026-11-17) — not the
             whole list before and after; what came off muted. */
          { key: "change", label: "Change", width: 280, sortable: true },
        ],
        /* NO OUTCOME COLUMN (Yash, 2026-11-17) — every change applies and
           succeeds for now, so it only ever said "Changed". */
        rows: c.lines.map(
          (l, i): ViewRow => ({
            id: `${l.rowId}-${l.setting}-${i}`,
            text: {
              customer: customerOf(l.customerId).name,
              shipto: shiptoOf(l.shiptoId).name,
              address: shiptoOf(l.shiptoId).address,
              product: productOf(l.productId).name,
              setting: SETTING_LABEL[l.setting],
              action: c.configures ? "Configured" : lineAction(l),
              change: lineParts(l, ents).map((p) => p.t).join(" "),
              delta: cents(l.delta),
              error: l.error ?? "",
            },
            sort: { delta: l.delta },
            status: LINE_OUTCOME[l.outcome],
            values: { customer: customerOf(l.customerId).name, shipto: shiptoOf(l.shiptoId).name, product: productOf(l.productId).name, outcome: LINE_OUTCOME[l.outcome], setting: SETTING_LABEL[l.setting], action: c.configures ? "Configured" : lineAction(l) },
          })
        ),
        nameOf: (r) => `${r.text.shipto} · ${r.text.product}`,
        /* THE ROW SHOWS ALL IT HOLDS — no drawer to repeat it. */
        noOpen: true,
        /* CUSTOMER · SHIP-TO · PRODUCT FIRST in every Pricing filter (Yash,
           2026-11-16), searchable — the questions asked first. */
        facets: [
          { key: "product", label: "Product", searchable: true },
          { key: "shipto", label: "Ship-to", searchable: true },
          { key: "customer", label: "Customer", searchable: true },
          { key: "setting", label: "Artifact" },
          { key: "action", label: "Action" },
        ],
        renderCell: (r, key) =>
          key === "shipto" ? (
            <ShiptoCell name={r.text.shipto} address={r.text.address} />
          ) : key === "customer" ? (
            <Truncated text={r.text[key]} />
          ) : key === "change" ? (
            <LineChange l={c.lines[Number(r.id.split("-").pop())]} ents={ents} />
          ) : key === "action" ? (
            <Pill>{r.text.action}</Pill>
          ) : undefined,
      },
    ];
    t.push({
      key: "orders",
      label: "Orders affected",
      noun: "orders",
      one: "order",
      columns: [
        /* ONLY ORDERS THAT TOOK THE NEW PRICE (Yash, 2026-11-18) — so no
           Status or Why kept. Ship-to, then product. */
        { key: "id", label: "Order", width: 120, sortable: true },
        { key: "shipto", label: "Ship-to", width: 170, sortable: true },
        { key: "customer", label: "Customer", width: 250, sortable: true },
        { key: "product", label: "Product", width: 170, sortable: true },
        { key: "delivery", label: "Delivery", width: 130, sortable: true },
        { key: "gallons", label: "Gallons", width: 110, sortable: true },
        { key: "before", label: "Old price ($/gal)", width: 170, sortable: true },
        { key: "after", label: "New price ($/gal)", width: 160, sortable: true },
      ],
      rows: repriced.map(
        (o): ViewRow => ({
          id: o.id,
          text: {
            id: o.id,
            customer: customerOf(o.customerId).name,
            shipto: shiptoOf(o.shiptoId).name,
            address: shiptoOf(o.shiptoId).address,
            product: productOf(o.productId).name,
            delivery: fmtDate(o.delivery),
            gallons: o.gallons.toLocaleString(),
            before: money(o.before),
            after: money(o.status === "kept" ? o.before : o.after),
            reason: o.reason ?? "—",
          },
          sort: { delivery: o.delivery, gallons: o.gallons, before: o.before, after: o.after },
          status: o.status === "repriced" ? "New price" : "Kept old price",
          values: { customer: customerOf(o.customerId).name, shipto: shiptoOf(o.shiptoId).name, product: productOf(o.productId).name, reason: o.reason ?? "—" },
        })
      ),
      facets: [
        { key: "shipto", label: "Ship-to", searchable: true },
        { key: "product", label: "Product", searchable: true },
        { key: "customer", label: "Customer", searchable: true },
      ],
      noOpen: true,
      renderCell: (r, key) =>
        key === "shipto" ? (
          <ShiptoCell name={r.text.shipto} address={r.text.address} />
        ) : key === "customer" ? (
          <Truncated text={r.text[key]} />
        ) : key === "before" ? (
          <Old text={r.text.before} />
        ) : undefined,
    });
    /* WIDTHS FROM WHAT EACH COLUMN PRINTS (UX-45) — a long product or
       margin name no longer runs over the next column. */
    return t.map((tab) => ({
      ...tab,
      columns: fitColumns(
        tab.columns,
        tab.rows,
        (r, key) => (key === "status" ? [r.status, r.text.error ?? ""] : key === "shipto" ? [r.text.shipto, r.text.address] : [r.text[key] ?? ""]),
        ["status", "action"]
      ).map((col) => (col.key === "change" ? { ...col, width: Math.min(col.width ?? 300, 300) } : col)),
    }));
  }, [c, editLines, ents]);
  /* A FIGURE OPENS THE ROWS IT COUNTS — the orders figures narrow Orders. */
  const [apply, setApply] = React.useState<{ tab: string; picked: string[]; n: number } | null>(null);
  const openOrders = (status: string | null) => setApply({ tab: "orders", picked: status ? [`status:${status}`] : [], n: Date.now() });
  /* WHO IT REACHED, ON A SIDE SHEET — each ship-to with its customer and
     products (Yash, 2026-11-17), not a dropdown list. */
  const [affected, setAffected] = React.useState<AffectedKind | null>(null);
  const openRows = (picked: string[]) => setApply({ tab: "lines", picked, n: Date.now() });

  /* THE TITLE SAYS WHAT HAPPENED, VERB AND ALL (Yash, 2026-11-17): "Tax
     added: LUST Fee · Fees deleted: Delivery Fee", not the names alone. */
  const headline =
    c.undoOf || c.resets || c.configures
      ? summary
      : c.edits.map((e, i) => `${SETTING_LABEL[e.setting]} ${editAction(e).toLowerCase()}: ${editLines[i]}`).join(" · ");
  const exportChange = () => toast.success(`Exporting ${plural(c.lines.length, "price")} as .csv`);

  return (
    <RecordSheet
      size="full"
      level={level}
      presentation={presentation}
      open
      onOpenChange={(o) => !o && onClose()}
      mode="edit"
      /* NO CHANGE ID ON SCREEN (Yash, 2026-11-18) — the title is when it
         was made; who and how sit under it; what changed is listed below. */
      editTitle={fmtDateTime(c.madeAt)}
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
          {[SOURCE_LABEL[c.source], c.by].join(" · ")}
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
            {/* A LOGBOOK ENTRY IS READ, NOT ACTED ON (Yash, 2026-11-17) — no
                Undo; Export is all that is left. */}
            <DropdownMenuItem onSelect={exportChange}>
              <Download />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      onSubmit={() => {}}
    >
      {/* WHAT CHANGED, THEN ITS IMPACT (Yash, 2026-11-17) — every change
          lists its edits the same way, one or many: Entity, Action, what
          changed (old muted, new plain), and how many product prices it
          moved. Pressing one shows those prices. */}
      <section className="flex shrink-0 flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">What changed</h3>
        {/* A HEADER ROW, and each row's records a link to them (Yash, 2026-11-25). */}
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          <div className={cn(WC_GRID, "bg-fp-table-header py-2 text-sm font-medium text-muted-foreground")}>
            <span>Artifact</span>
            <span>Action</span>
            <span>Change</span>
            <span className="text-right">Records affected</span>
          </div>
          {c.edits.length && !c.undoOf && !c.resets ? (
            c.edits.map((e, i) => {
              const n = c.lines.filter((l) => l.setting === e.setting).length;
              return (
                <div key={i} className={cn(WC_GRID, "py-2.5 text-sm")}>
                  <span className="text-foreground">{SETTING_LABEL[e.setting]}</span>
                  <span>
                    <Pill>{editAction(e)}</Pill>
                  </span>
                  <EditChange e={e} lines={c.lines} ents={ents} />
                  <span className="text-right">
                    {n > 0 ? (
                      <button
                        type="button"
                        onClick={() => openRows([`setting:${SETTING_LABEL[e.setting]}`])}
                        className="rounded-sm text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {plural(n, "record")}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
              );
            })
          ) : (
            <div className={cn(WC_GRID, "py-2.5 text-sm")}>
              <span className="text-foreground">Pricing</span>
              <span>
                <Pill>{action}</Pill>
              </span>
              <span className="truncate text-foreground">{summary}</span>
              <span className="text-right">
                {c.lines.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openRows([])}
                    className="rounded-sm text-foreground underline decoration-current/50 decoration-dotted underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {plural(c.lines.length, "record")}
                  </button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
          )}
        </div>
      </section>
      <section className="flex shrink-0 flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">Impact</h3>
      {/* FOUR FIGURES (Yash, 2026-11-18): who — customers and their
          ship-tos — then what moved — the ship-to × product prices and the
          orders that took the new price. No products figure. */}
      <div className={FIGURE_STRIP}>
        <Figure
          label="Customers"
          value={customers.length.toLocaleString()}
          note={customers.length === 0 ? "—" : customers.length === 1 ? customerOf(customers[0]).name : `${customerOf(customers[0]).name} +${customers.length - 1}`}
          onOpen={c.lines.length ? () => setAffected("customers") : undefined}
          openLabel="View list"
        />
        <Figure
          label="Ship-tos"
          value={shiptos.length.toLocaleString()}
          note={shiptos.length === 0 ? "—" : shiptos.length === 1 ? shiptoOf(shiptos[0]).name : `${shiptoOf(shiptos[0]).name} +${shiptos.length - 1}`}
          onOpen={c.lines.length ? () => setAffected("shiptos") : undefined}
          openLabel="View list"
        />
        {/* WHAT THEY MEAN, BEHIND AN ⓘ (UX-96). */}
        <InfoFigure
          label="Ship-to × product prices"
          info={
            <>
              <p>One product's price at one ship-to.</p>
              {noPrice ? (
                <p>
                  {plural(c.lines.length, "price")} use it: {plural(products.length, "product")} across {plural(shiptos.length, "ship-to")}. None
                  changed price.
                </p>
              ) : (
                <p>
                  This change moved {plural(c.lines.length, "price")}: {plural(products.length, "product")} across{" "}
                  {plural(shiptos.length, "ship-to")}.
                </p>
              )}
            </>
          }
          value={c.lines.length.toLocaleString()}
          note={noPrice ? "Price unchanged" : `Changed at ${plural(shiptos.length, "ship-to")}`}
          onOpen={() => openRows([])}
          openLabel="View prices"
        />
        <InfoFigure
          label="Orders affected"
          info={
            noPrice ? (
              <p>Open orders for these ship-tos and products. They show the new name; their price does not change.</p>
            ) : (
              <p>Open orders for these ship-tos and products that now use the new price.</p>
            )
          }
          value={repriced.length.toLocaleString()}
          note={`At ${plural(uniq(repriced.map((o) => o.shiptoId)).length, "ship-to")}`}
          onOpen={repriced.length ? () => openOrders(null) : undefined}
          openLabel="View orders"
        />
      </div>

      </section>

      {/* NO RECORD SUMMARY (Yash, 2026-11-17) — the header already says who,
          how and when; the table takes the width. */}
      <div ref={work} className={WORK_AREA.replace("lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]", "")}>
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
      </div>
      {affected && (
        <AffectedSheet
          level={2}
          kind={affected}
          title={affected === "customers" ? "Customers affected" : "Ship-tos affected"}
          subtitle={headline}
          items={shiptos.map((id) => ({ customerId: shiptoOf(id).customerId, shiptoId: id }))}
          onClose={() => setAffected(null)}
        />
      )}
    </RecordSheet>
  );
}

/** A ship-to, its address under it — always, never a column of its own
 *  (Yash, 2026-11-17). */
function ShiptoCell({ name, address }: { name: string; address: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate" title={name}>
        {name}
      </span>
      <span className="truncate text-xs text-muted-foreground" title={address}>
        {address}
      </span>
    </span>
  );
}

type LinePart = { t: string; old?: boolean };
/** What one product price's change was: an edited value old → new, what came
 *  off (muted) and what went on, with each one's $/gal. */
function lineParts(l: ImpactLine, ents: EntityMap): LinePart[] {
  /* A setup record's own field: old → new; its price is unchanged. */
  if (l.field === "desc") return [{ t: "Description updated" }];
  if (l.field) {
    const lead = l.field === "name" || l.field === "active" ? [] : [{ t: `${FIELD_LABEL[l.field]}:` }];
    return [...lead, { t: l.before || NOT_SET, old: true }, { t: "→", old: true }, { t: l.after || NOT_SET }];
  }
  const nm = (id: string) => ents.get(id)?.name ?? id;
  const val = (id: string) => {
    const v = ents.get(id)?.value;
    return typeof v === "number" && !ents.get(id)?.dynamic ? `${nm(id)} ${money(v)}` : nm(id);
  };
  if (l.beforeIds.length === 1 && l.afterIds.length === 1 && l.beforeIds[0] === l.afterIds[0] && l.before.includes(" · ")) {
    const [n, was] = l.before.split(" · ");
    return [{ t: `${n}:` }, { t: was, old: true }, { t: "→", old: true }, { t: l.after.split(" · ")[1] ?? l.after }];
  }
  const blank = (t: string) => (!t || t === "None" ? NOT_SET : t);
  if (!IS_LIST[l.setting]) return [{ t: blank(l.before), old: true }, { t: "→", old: true }, { t: blank(l.after) }];
  const added = l.afterIds.filter((id) => !l.beforeIds.includes(id));
  const removed = l.beforeIds.filter((id) => !l.afterIds.includes(id));
  /* Assigned: the names; unassigned: the names, muted; both: before → after. */
  if (added.length && removed.length) return [{ t: removed.map(val).join(", "), old: true }, { t: "→", old: true }, { t: added.map(val).join(", ") }];
  if (removed.length) return [{ t: removed.map(val).join(", "), old: true }];
  if (added.length) return [{ t: added.map(val).join(", ") }];
  return [{ t: blank(l.after) }];
}

function LineChange({ l, ents }: { l: ImpactLine | undefined; ents: EntityMap }) {
  if (!l) return null;
  const parts = lineParts(l, ents);
  return (
    <span className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap" title={parts.map((p) => p.t).join(" ")}>
      {parts.map((p, i) => (
        <span key={i} className={cn("min-w-0 truncate", p.old ? "text-muted-foreground" : "text-foreground", i < parts.length - 1 && "shrink-0")}>
          {p.t}
        </span>
      ))}
    </span>
  );
}

/** The old value, muted, so the new one reads as the current. */
function Old({ text }: { text: string }) {
  return (
    <span className="block min-w-0 truncate text-muted-foreground" title={text}>
      {text}
    </span>
  );
}

/** One edit's change: what came off muted, what went on plain; an added
 *  setting shows its value too (Yash, 2026-11-17). */
/** What changed's columns: Artifact · Action · Change · Records affected. */
const WC_GRID = "grid grid-cols-[140px_110px_minmax(0,1fr)_auto] items-center gap-4 px-4";

function EditChange({ e, lines, ents }: { e: Edit; lines: ImpactLine[]; ents: EntityMap }) {
  const name = (id: string) => {
    const ent = ents.get(id);
    return ent ? (ent.dynamic ? `${ent.name}/gal` : ent.name) : id;
  };
  const withValue = (id: string) => {
    const v = ents.get(id)?.value;
    return typeof v === "number" && !ents.get(id)?.dynamic ? `${name(id)} ${money(v)}` : name(id);
  };
  const mine = lines.filter((l) => l.setting === e.setting);
  const off = uniq(mine.flatMap((l) => l.beforeIds.filter((id) => !l.afterIds.includes(id))));
  const Arrow = () => <span className="text-muted-foreground">→</span>;
  const row = (children: React.ReactNode) => <span className="flex min-w-0 items-center gap-1.5 truncate">{children}</span>;
  if (e.field)
    return row(
      <>
        <span className="shrink-0 text-foreground">{e.field === "name" ? "Name:" : `${name(e.entityIds[0])} · ${FIELD_LABEL[e.field]}:`}</span>
        <span className="truncate text-muted-foreground">{e.from || NOT_SET}</span>
        <Arrow />
        <span className="truncate text-foreground">{e.to || NOT_SET}</span>
      </>
    );
  if (e.operation === "add" || e.operation === "create" || e.configure) return row(<span className="truncate text-foreground">{e.entityIds.map(withValue).join(", ")}</span>);
  if (e.operation === "remove") return row(<span className="truncate text-muted-foreground">{e.entityIds.map(withValue).join(", ")}</span>);
  if (e.operation === "edit") {
    const was = mine.find((l) => l.beforeIds.includes(e.entityIds[0]))?.before.split(" · ")[1];
    return row(
      <>
        <span className="shrink-0 text-foreground">{name(e.entityIds[0])}:</span>
        <span className="shrink-0 text-muted-foreground">{was ?? NOT_SET}</span>
        <Arrow />
        <span className="shrink-0 text-foreground">{money(e.amount ?? 0)}</span>
      </>
    );
  }
  /* REPLACED: BEFORE → AFTER, "Not set" when there was none (Yash, 2026-11-25). */
  const show = IS_LIST[e.setting] ? withValue : name;
  return row(
    <>
      <span className="truncate text-muted-foreground">{off.length ? off.map(show).join(", ") : NOT_SET}</span>
      <Arrow />
      <span className="truncate text-foreground">{e.entityIds.map(show).join(", ")}</span>
    </>
  );
}

/** A figure with an ⓘ beside its label that opens what it means on click
 *  (UX-96). Built here, not in the shared Figure: the figure is a button,
 *  so the ⓘ sits over it rather than inside it. */
export function InfoFigure({
  label,
  info,
  value,
  note,
  onOpen,
  openLabel,
}: {
  label: string;
  info: React.ReactNode;
  value: string;
  note: string;
  onOpen?: () => void;
  openLabel?: string;
}) {
  return (
    <div className="group/fig @container relative flex min-w-0 flex-col gap-1 p-4">
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${label}: ${openLabel}`}
          className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        />
      )}
      <span className="pointer-events-none relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{label}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`What ${label.toLowerCase()} means`}
                className="pointer-events-auto rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Info className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-80 flex-col gap-2 text-sm text-muted-foreground">
              {info}
            </PopoverContent>
          </Popover>
        </span>
        {onOpen && (
          <span className="absolute right-0 top-0 hidden items-center gap-0.5 text-xs font-medium text-foreground @min-[15rem]:group-hover/fig:flex @min-[15rem]:group-has-[:focus-visible]/fig:flex">
            <span className="underline decoration-current/50 decoration-dotted underline-offset-4">{openLabel}</span>
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </span>
      <span className="pointer-events-none relative truncate text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="pointer-events-none relative truncate text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

/** Customer and Ship-to are fixed widths (UX-45); a longer name truncates. */
function Truncated({ text }: { text: string }) {
  return (
    <span className="block min-w-0 truncate" title={text}>
      {text}
    </span>
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
          <DialogTitle>Edit schedule</DialogTitle>
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

