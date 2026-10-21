import { cn } from "@/lib/utils";
import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarDays, Copy, Info, MoreHorizontal, Pencil, Send } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  TableCellInput,
  TableCellSelect,
  TableRequiredLabel,
  TableRowRemove,
} from "@/components/form-layout/table-cells";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CELL, DraftStatusChip, RecordSheet, useDraftSaveState } from "../unified-view/RecordSheet";
import { DocumentsTable, type DocumentRow } from "../unified-view/DocumentsTable";
import { RecordLink, usePortalNav } from "./nav";
import { INVOICES } from "./invoices";
import { HangingAdd } from "../unified-view/HangingAdd";
import { PendingStrip, type PendingItem } from "../unified-view/PendingStrip";
import { ActivityCard, RailRow, SummaryCard } from "../unified-view/SheetCards";
import { NumberLink, RulePill } from "./cells";
import { AfterDelivery, DaysToEmpty, FulfilmentHead, FulfilmentPct, LevelReading } from "./TankLevel";
import { DeliveryWindowTimeline } from "../unified-view/DeliveryWindowTimeline";
import { RecurringOrderSection } from "../unified-view/RecurringOrderSection";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrderRestButton, QuoteActions, QuoteLines, ReplyPanel, TripTimeline } from "./requestActions";
import { DATE_FMT, MONEY, RATE, dateKeyOf, formatFullDate, startOfDay } from "../unified-view/data";
import {
  PRICES_AS_OF,
  PRODUCTS,
  REQUEST_STATUS_TONE,
  SHIP_TOS,
  TENANT,
  allRequests,
  assetById,
  printKey,
  blankLine,
  clampPreferred,
  CHANGE_KINDS,
  isOrder,
  ordersOfRequest,
  requestChange,
  daysUntil,
  suggestedGal,
  scheduleSummary,
  cancelRule,
  dateOfKey,
  discardRequest,
  duplicateRequest,
  estimate,
  lastProductFor,
  quantityOf,
  updateRequest,
  PORTAL_ACTOR,
  type OrderRequest,
  type RequestDoc,
  type RequestLine,
} from "./orders";

/*
  THE ORDER REQUEST SHEET (Pavan, 2026-10-13) — the Unified View's record
  sheet, in the customer portal. Create, then autosave: the Draft exists from
  the press of Create Order, there is no Save and no Cancel, and the footer is
  the next act — Save as Draft · Submit request.

  ONE SHIP-TO PER REQUEST (Pavan, 2026-10-13), any number of its tanks and
  assets, each with its own product and quantity — so the lines are an
  editable table — the 3PL Delivery Order's, with its Top off checkbox.

  Recurring is part of creating an order (Pavan, 2026-10-13): a checkbox,
  with its frequency and end date revealed beside it — the 3PL order's way.

  Once submitted the request is the tenant's to move on, so the form locks.
*/

type Draft = Pick<
  OrderRequest,
  | "shipTo"
  | "lines"
  | "date"
  | "windowStart"
  | "windowEnd"
  | "preferred"
  | "po"
  | "instructions"
  | "recurring"
  | "frequency"
  | "schedule"
  | "endDate"
>;

const draftOf = (r: OrderRequest): Draft => ({
  shipTo: r.shipTo,
  lines: r.lines,
  date: r.date,
  windowStart: r.windowStart,
  windowEnd: r.windowEnd,
  preferred: r.preferred,
  po: r.po,
  instructions: r.instructions,
  recurring: r.recurring,
  frequency: r.frequency,
  schedule: r.schedule,
  endDate: r.endDate,
});

const SECTION_DELIVERY = "portal-request-delivery";
const SECTION_LINES = "portal-request-lines";

export function DateButton({
  value,
  onChange,
  placeholder,
  from,
  label,
}: {
  value: string;
  onChange: (key: string) => void;
  placeholder: string;
  from: Date;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const d = dateOfKey(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal" aria-label={label}>
          <CalendarDays />
          {d ? formatFullDate(d) : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={d ?? undefined}
          onSelect={(next) => {
            if (!next) return;
            onChange(dateKeyOf(next));
            setOpen(false);
          }}
          defaultMonth={d ?? from}
          disabled={{ before: from }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The tanks and assets of the request — THE 3PL DELIVERY ORDER'S LINE TABLE
 * (BrokerOrderSheet), column for column: Top off · Asset · Product · Qty (gal).
 * Top off is a named checkbox column (interactions T5): ticked, the tank is
 * filled and the quantity cell shuts; the typed number is kept for unticking
 * and never counted (T3). Asset is optional, as on 3PL.
 */
export function LinesTable({
  lines,
  shipTo,
  focusRow,
  onChange,
  live = true,
  deliveryKey = "",
  request,
}: {
  lines: RequestLine[];
  shipTo: string;
  focusRow?: number;
  onChange: (next: RequestLine[]) => void;
  /** The tanks as they are now (a draft, a rule); false once the order is
      sent — then each line shows its level when ordered and after. */
  live?: boolean;
  /** The delivery date — what the suggestion and "on fulfilment" look ahead to. */
  deliveryKey?: string;
  /** The sent order — its status says whether "on fulfilment" is done or expected. */
  request?: OrderRequest;
}) {
  const days = daysUntil(deliveryKey);
  const assets = SHIP_TOS.find((s) => s.name === shipTo)?.assets ?? [];
  const update = (i: number, patch: Partial<RequestLine>) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = quantityOf(lines);
  const started = lines.some((l) => l.topOff || l.gal > 0);
  const allTop = lines.length > 0 && lines.every((l) => l.topOff);
  const someTop = lines.some((l) => l.topOff);
  return (
    /* NEVER SQUEEZED — on a narrow screen the table scrolls sideways rather
       than closing the asset and product cells. */
    <div className="overflow-x-auto">
    <table className={cn("w-full table-fixed border-collapse", live ? "min-w-[calc(888px*var(--fp-scale))]" : "min-w-[calc(772px*var(--fp-scale))]")}>
      {/* NARROW BY DESIGN (Pavan, 2026-10-15) — as the Delivery Order.
          WHAT THE ORDER DOES TO THE TANK FIRST (Pavan, 2026-10-17): its level
          now, the % on fulfilment, and while ordering days to empty (the
          suggested quantity is the Qty cell's placeholder, 2026-10-20). THEN TOP OFF, AND THE QUANTITY LAST (Pavan,
          2026-10-20) — the figure the readings lead to, at the row's end. */}
      <colgroup>
        <col className="w-[calc(154px*var(--fp-scale))]" />
        <col className="w-[calc(146px*var(--fp-scale))]" />
        <col className="w-[calc(112px*var(--fp-scale))]" />
        <col className="w-[calc(124px*var(--fp-scale))]" />
        {live && <col className="w-[calc(108px*var(--fp-scale))]" />}
        <col className="w-[calc(96px*var(--fp-scale))]" />
        <col className="w-[calc(104px*var(--fp-scale))]" />
        <col className="w-[calc(44px*var(--fp-scale))]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>Asset</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel required>Product</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>Current level</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>
              <FulfilmentHead />
            </TableRequiredLabel>
          </th>
          {live && (
            <th className="px-3 py-2.5 text-left">
              <TableRequiredLabel>Days to empty</TableRequiredLabel>
            </th>
          )}
          {/* TOP OFF, THEN ITS SELECT-ALL; every row's tick sits under this one. */}
          <th className="px-3 py-2.5">
            <span className="flex items-center justify-between gap-2">
              <TableRequiredLabel>Top off</TableRequiredLabel>
              <Checkbox
                checked={allTop ? true : someTop ? "indeterminate" : false}
                aria-label="Top off every line"
                onCheckedChange={(c) => onChange(lines.map((l) => ({ ...l, topOff: c === true })))}
              />
            </span>
          </th>
          <th className="px-3 py-2.5 text-right">
            <TableRequiredLabel>Qty (gal)</TableRequiredLabel>
          </th>
          <th aria-hidden />
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const asset = assets.find((a) => a.id === l.assetId);
          const name = asset?.name || `line ${i + 1}`;
          return (
            <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
              <td className="relative p-0">
                <TableCellSelect
                  value={asset?.name ?? ""}
                  /* ONE ASSET, ONE LINE — those already on the request are
                     not offered again. */
                  options={
                    /* A filled row offers only what is free; a blank row's
                       multi-pick lists all, those on other rows ticked. */
                    l.assetId
                      ? assets.filter((a) => a.id === l.assetId || !lines.some((x) => x.assetId === a.id)).map((a) => a.name)
                      : assets.map((a) => a.name)
                  }
                  placeholder={shipTo ? "Select asset" : "Select a ship-to first"}
                  disabled={!shipTo}
                  autoFocus={i === focusRow && Boolean(shipTo)}
                  aria-label={`Asset for line ${i + 1}`}
                  onChange={(v) => {
                    const a = assets.find((x) => x.name === v);
                    if (a) update(i, { assetId: a.id, product: lastProductFor(a.id, allRequests()) ?? a.product });
                  }}
                  /* SEVERAL AT ONCE, FROM A BLANK ROW (Pavan, 2026-10-15; DS
                     ui §10f) — tick, Apply: the first fills this row, each
                     other gets its own. A filled row swaps its one asset. */
                  multiple={l.assetId ? undefined : {
                    taken: lines.map((x) => assets.find((a) => a.id === x.assetId)?.name ?? "").filter(Boolean),
                    onApply: (names) => {
                      /* THE PRODUCT LAST ORDERED FOR IT, else its own
                         (Pavan, 2026-10-13) — the customer can change it. */
                      const lineOf = (n: string): Partial<RequestLine> | null => {
                        const a = assets.find((x) => x.name === n);
                        return a ? { assetId: a.id, product: lastProductFor(a.id, allRequests()) ?? a.product } : null;
                      };
                      const [first, ...rest] = names.map(lineOf).filter(Boolean) as Partial<RequestLine>[];
                      if (!first) return;
                      const next = lines.map((x, j) => (j === i ? { ...x, ...first } : x));
                      next.splice(i + 1, 0, ...rest.map((p) => ({ ...blankLine(), ...p })));
                      onChange(next);
                    },
                  }}
                />
              </td>
              <td className="relative p-0">
                {/* ONE VALUE — the product going into this line's asset, not a row of its own (DS ui §10f). */}
                <TableCellSelect
                  value={l.product}
                  options={PRODUCTS}
                  placeholder="Select product"
                  autoFocus={i === focusRow && !shipTo}
                  aria-label={`Product for ${name}`}
                  onChange={(v) => update(i, { product: v })}
                />
              </td>
              <td className="px-3">
                {l.assetId ? <LevelReading asset={asset} /> : <span className="text-sm text-muted-foreground">—</span>}
              </td>
              <td className="px-3">{live || !request ? <AfterDelivery line={l} days={days} dateKey={deliveryKey} /> : <FulfilmentPct line={l} r={request} />}</td>
              {live && (
                <td className="px-3">
                  <DaysToEmpty asset={asset} days={days} />
                </td>
              )}
              <td className="px-3">
                <span className="flex justify-end">
                  <Checkbox
                    checked={l.topOff}
                    onCheckedChange={(c) => update(i, { topOff: c === true })}
                    aria-label={`Top off ${name}`}
                  />
                </span>
              </td>
              <td className="relative p-0">
                <TableCellInput
                  value={l.topOff ? "" : l.gal ? String(l.gal) : ""}
                  placeholder={l.topOff ? "Top-off" : "0"}
                  /* THE SUGGESTION IS THE PLACEHOLDER (Pavan, 2026-10-20) —
                     the tank full on the planned day; → takes it. */
                  suggestion={live && !l.topOff && asset?.monitor && asset.capacity ? String(suggestedGal(asset, days)) : undefined}
                  disabled={l.topOff}
                  numeric
                  suffix="gal"
                  aria-label={`Gallons for ${name}`}
                  onChange={(v) => update(i, { gal: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                />
              </td>
              <td className="relative p-0 text-center">
                {/* A request needs a line, so the last row keeps no bin. */}
                <TableRowRemove
                  aria-label={`Remove ${asset?.name || `line ${i + 1}`}`}
                  disabled={lines.length === 1}
                  onRemove={() => onChange(lines.filter((_, j) => j !== i))}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
      {/* T2 — only once a row carries a value; all top off says the word. */}
      {started && (
        <tfoot>
          <tr className="h-11 border-t border-border">
            <td colSpan={live ? 6 : 5} className="px-3 text-right text-sm text-muted-foreground">
              Total
            </td>
            <td className="px-3 text-right text-sm font-medium tabular-nums text-foreground">
              {total.gal > 0 ? `${total.gal.toLocaleString()} gal` : "Top off"}
            </td>
            <td aria-hidden />
          </tr>
        </tfoot>
      )}
    </table>
    </div>
  );
}

/** The portal's files as the shared documents table's rows. */
export const documentRows = (docs: RequestDoc[]): DocumentRow[] =>
  docs.map((d) => ({ id: d.id, kind: d.kind, name: d.name, added: DATE_FMT.format(new Date(d.at)), by: d.by }));

const AS_OF_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
/* ONE FIGURE, NOT A RANGE (Pavan, 2026-10-20) — the median of the
   estimate's low and high. */
const median = (low: number, high: number) => MONEY((low + high) / 2);

/**
 * THE REQUEST SUMMARY — the shared summary card (ux §Record sheets), with the
 * ESTIMATED COST before and after submitting (Pavan, 2026-10-13). Each line's
 * basis — market price and the customer's pricing — opens on hover. The note
 * says plainly that it is an estimate and not the final price.
 */
/* THE INVOICE, AS A LINK — it opens on the Invoices page (PRD FR-10). */
function InvoiceLink({ no }: { no: string }) {
  const nav = usePortalNav();
  return INVOICES.some((i) => i.invoiceNo === no) ? <RecordLink label={no} onOpen={() => nav.openInvoice(no)} /> : <>{no}</>;
}

function RequestSummary({ lines, invoiceNo, fill }: { lines: RequestLine[]; invoiceNo?: string; fill?: boolean }) {
  const est = estimate(lines);
  const qty = quantityOf(lines);
  return (
    <SummaryCard title="Request summary" fill={fill}>
      {est.rows.length > 0 && (
        <>
          <dl className="flex flex-col">
            {est.rows.map((r, i) => (
              <RailRow
                key={i}
                variant="line"
                label={`${assetById(r.line.assetId)?.name ?? "Tank or asset"} · ${r.line.product}`}
                value={
                  r.low !== null && r.high !== null ? (
                    median(r.low, r.high)
                  ) : (
                    <span className="text-muted-foreground">
                      {r.line.topOff ? "Priced on delivery" : "—"}
                    </span>
                  )
                }
                breakdown={[
                  { label: "Market price", value: `${RATE(r.market)}/gal` },
                  {
                    label: `${TENANT} pricing`,
                    value: `${r.diff < 0 ? "−" : "+"}${RATE(Math.abs(r.diff))}/gal`,
                  },
                  {
                    label: "Estimated rate",
                    value: `${RATE((r.rateLow + r.rateHigh) / 2)}/gal`,
                  },
                ]}
              />
            ))}
          </dl>
          <div aria-hidden className="border-t border-dashed border-border" />
        </>
      )}
      {/* THE TOTALS AT THE CARD'S FOOT when it fills the rail (Pavan,
          2026-10-20); the lines above them. */}
      <dl className={cn("flex flex-col", fill && "mt-auto")}>
        <RailRow
          variant="line"
          label="Total gallons"
          value={qty.gal > 0 ? qty.gal.toLocaleString() : "—"}
        />
        {qty.topOff > 0 && <RailRow variant="line" label="Top off" value={qty.topOff} />}
        <RailRow
          variant="total"
          label={
            /* AN ESTIMATE, NOT THE FINAL PRICE (Pavan, 2026-10-13) — said on
               hover of the info icon beside the label (2026-10-16). */
            <span className="inline-flex items-center gap-1.5">
              Estimated cost
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="How the cost is estimated"
                    className="inline-flex rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Estimated from the market price and pricing set by {TENANT} as of{" "}
                  {AS_OF_FMT.format(PRICES_AS_OF)}. This is not the final price; {TENANT} confirms it in the quote.
                </TooltipContent>
              </Tooltip>
            </span>
          }
          value={est.high > 0 ? median(est.low, est.high) : "—"}
        />
      </dl>
      {/* INVOICES SHOW ON THE REQUEST TOO (Pavan, 2026-10-13). */}
      {invoiceNo && (
        <>
          <div aria-hidden className="border-t border-border" />
          <dl className="flex flex-col">
            <RailRow variant="line" label="Invoice" value={<InvoiceLink no={invoiceNo} />} />
          </dl>
        </>
      )}
    </SummaryCard>
  );
}

export function OrderRequestSheet({
  request,
  open,
  creating,
  onOpenChange,
  onDuplicate,
}: {
  /** The new Draft a Duplicate made — the screen opens it. */
  onDuplicate: (id: string) => void;
  request: OrderRequest | null;
  open: boolean;
  /** Opened by Create Order — no rail, and closing it untouched drops it. */
  creating: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  /* THE DRAFT CARRIES THE ID IT WAS BUILT FOR — the quote sheet's rule. */
  const [held, setHeld] = React.useState<{ id: string; d: Draft } | null>(null);
  const draft = held && request && held.id === request.id ? held.d : null;
  const setDraft = (fn: (d: Draft) => Draft) =>
    setHeld((h) => (h ? { id: h.id, d: fn(h.d) } : h));
  const [focusRow, setFocusRow] = React.useState<number | undefined>();
  const [pendingShown, setPendingShown] = React.useState(false);
  const nav = usePortalNav();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [changeOpen, setChangeOpen] = React.useState(false);
  const [changeWhat, setChangeWhat] = React.useState("");
  const [changeNote, setChangeNote] = React.useState("");
  const [cancelReason, setCancelReason] = React.useState("");
  const fileInput = React.useRef<HTMLInputElement>(null);

  const builtFor = React.useRef<string | null>(null);
  const lastSaved = React.useRef<string | null>(null);
  const blank = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open || !request) {
      builtFor.current = null;
      return;
    }
    if (builtFor.current === request.id) return;
    builtFor.current = request.id;
    const built = draftOf(request);
    lastSaved.current = JSON.stringify(built);
    /* Only a truly blank draft is dropped untouched — a duplicate is kept. */
    blank.current = creating && !request.shipTo ? lastSaved.current : null;
    setPendingShown(false);
    setFocusRow(undefined);
    setHeld({ id: request.id, d: built });
  }, [open, request, creating]);

  /* AUTOSAVE, DEBOUNCED — a save per pause in the work. */
  React.useEffect(() => {
    if (!open || !draft || !request) return;
    const shape = JSON.stringify(draft);
    if (lastSaved.current === shape) return;
    const t = window.setTimeout(() => {
      lastSaved.current = shape;
      updateRequest(request.id, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, open, request]);

  const saveState = useDraftSaveState(draft, open);

  const flush = () => {
    if (!draft || !request) return;
    const shape = JSON.stringify(draft);
    if (lastSaved.current === shape) return;
    lastSaved.current = shape;
    updateRequest(request.id, draft);
  };

  const close = () => {
    if (request && draft && blank.current !== null && JSON.stringify(draft) === blank.current) {
      /* NOTHING WAS TYPED — an empty draft would be a record of a press. */
      discardRequest(request.id);
    } else {
      flush();
    }
    onOpenChange(false);
  };

  if (!draft || !request) return null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const locked = request.status !== "Draft";
  const today = startOfDay(new Date());
  const shipTo = SHIP_TOS.find((s) => s.name === draft.shipTo);
  const unusedAsset = shipTo?.assets.find((a) => !draft.lines.some((l) => l.assetId === a.id));
  const rule = cancelRule(request);
  /* AN ORDER OR A REQUEST (Pavan, 2026-10-19) — the same page, its links
     and its acts differ. */
  const order = isOrder(request);
  const linked = order ? [] : ordersOfRequest(request, allRequests());

  const pending: PendingItem[] = [
    !draft.shipTo && { key: "shipTo", label: "Choose a ship-to", target: SECTION_DELIVERY },
    !draft.date && { key: "date", label: "Choose a planned date", target: SECTION_DELIVERY },
    draft.date &&
      draft.date < dateKeyOf(today) && {
        key: "datePast",
        label: "Move the planned date to today or later",
        target: SECTION_DELIVERY,
      },
    draft.recurring &&
      !draft.frequency && { key: "freq", label: "Pick the days", target: SECTION_DELIVERY },
    draft.lines.some((l) => !l.product) && {
      key: "product",
      label: "Choose a product",
      target: SECTION_LINES,
    },
    draft.lines.some((l) => !l.topOff && l.gal <= 0) && {
      key: "gal",
      label: "Enter gallons",
      target: SECTION_LINES,
    },
  ].filter(Boolean) as PendingItem[];

  const submit = () => {
    if (pending.length > 0) {
      /* PRESSABLE, AND PRESSING SAYS WHAT IS MISSING. */
      setPendingShown(true);
      return;
    }
    lastSaved.current = JSON.stringify(draft);
    /* THE LEVEL WHEN ORDERED — each monitored tank's reading, kept on its line. */
    const lines = draft.lines.map((l) => {
      const a = assetById(l.assetId);
      return a?.monitor ? { ...l, levelAtOrder: a.level } : l;
    });
    updateRequest(request.id, { ...draft, lines, status: "In review" }, "Request submitted");
    toast.success(`${request.requestNo} submitted`);
    onOpenChange(false);
  };

  /* WHAT WAITS ON THE CUSTOMER — the quote's answer is the footer's act. */
  const footerPrimary = locked ? (request.status === "Quote received" ? <QuoteActions r={request} /> : null) : (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={() => {
          flush();
          toast.success(`${request.requestNo} saved as a draft`);
          onOpenChange(false);
        }}
      >
        Save as Draft
      </Button>
      <Button onClick={submit}>
        <Send />
        Submit request
      </Button>
    </div>
  );

  return (
    <>
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15 — like the Delivery
         Order): tanks & assets = Top off · asset · product · qty · bin;
         documents = document · added · by · bin. The summary rail beside. */
      fit={{
        tables: [
          [CELL.pick, CELL.pick, CELL.number, CELL.number, CELL.number, CELL.topOff, CELL.number, CELL.bin],
          [CELL.name, CELL.date, CELL.pick, CELL.bin],
        ],
        rail: true,
      }}
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : close())}
      mode={creating ? "create" : "edit"}
      editTitle={`${order ? "Order" : "Request"} #: ${request.requestNo}`}
      createTitle="Create Order"
      createAction="Submit request"
      showCancel={false}
      headerAside={
        <span className="flex items-center gap-2">
          <DraftStatusChip tone={REQUEST_STATUS_TONE[request.status]} label={request.status} saveState={saveState} />
          {request.ruleNo && <RulePill ruleNo={request.ruleNo} />}
          {order && (request.fromRequests ?? []).length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              From
              {request.fromRequests!.map((n) => (
                <NumberLink key={n} no={n} onOpen={nav.openOrder} />
              ))}
            </span>
          )}
        </span>
      }
      headerMenu={
        creating ? undefined : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More order actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={() => {
                  flush();
                  const copy = duplicateRequest(request.id);
                  if (copy) onDuplicate(copy.id);
                }}
              >
                <Copy />
                {order ? "Order again" : "Duplicate request"}
              </DropdownMenuItem>
              {/* AN ACCEPTED ORDER IS CHANGED BY ASKING (Pavan, 2026-10-19). */}
              {order && request.status === "Scheduled" && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setChangeWhat("");
                    setChangeNote("");
                    setChangeOpen(true);
                  }}
                >
                  <Pencil />
                  Request change
                </DropdownMenuItem>
              )}
              {!order && rule !== "none" && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    /* TOO LATE TO CANCEL HERE — said on the press. */
                    if (rule === "blocked") {
                      toast(`${request.requestNo} is out for delivery; contact ${TENANT} to stop it`);
                      return;
                    }
                    setCancelReason("");
                    setCancelOpen(true);
                  }}
                >
                  <Ban />
                  {rule === "request" ? "Request cancellation" : "Cancel order"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
      footerBanner={
        !locked && pendingShown ? (
          <PendingStrip
            tone="caution"
            pending={pending}
            clearLabel="Everything this request needs is filled in"
          />
        ) : undefined
      }
      onSubmit={submit}
      footerPrimary={footerPrimary}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-10">
        {/* WHERE THE REQUEST WENT (Pavan, 2026-10-19) — its orders, each
            with its tanks and status; tanks still waiting say so. */}
        {!order && (linked.length > 0 || request.status === "Partly accepted") && (
          <SheetSection title="Orders" flush>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  {["Order #", "Tanks", "Planned date", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linked.map((o) => (
                  <tr key={o.id} className="h-12 border-b border-border last:border-b-0">
                    <td className="whitespace-nowrap px-3">
                      <NumberLink no={o.requestNo} onOpen={nav.openOrder} />
                    </td>
                    <td className="px-3 text-foreground">
                      {o.lines.map((l) => `${assetById(l.assetId)?.name ?? "No tank"} · ${l.product}`).join(", ")}
                    </td>
                    <td className="whitespace-nowrap px-3 text-foreground">{o.date ? printKey(o.date) : "—"}</td>
                    <td className="whitespace-nowrap px-3">
                      <StatusChip tone={REQUEST_STATUS_TONE[o.status]} variant="soft">
                        {o.status}
                      </StatusChip>
                    </td>
                  </tr>
                ))}
                {request.lines
                  .filter((l) => !l.orderNo && request.status === "Partly accepted")
                  .map((l, i) => (
                    <tr key={`p-${i}`} className="h-12 border-b border-border last:border-b-0">
                      <td className="whitespace-nowrap px-3 text-muted-foreground">Pending</td>
                      <td className="px-3 text-foreground">
                        {assetById(l.assetId)?.name ?? "No tank"} · {l.product}
                      </td>
                      <td className="whitespace-nowrap px-3 text-muted-foreground">—</td>
                      <td className="whitespace-nowrap px-3 text-muted-foreground">Not on an order yet</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </SheetSection>
        )}
        {order && request.changeRequest && (
          <SheetSection title="Change requested">
            <p className="text-sm text-foreground">
              {request.changeRequest.what}
              {request.changeRequest.note ? ` — ${request.changeRequest.note}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Sent to {TENANT} {DATE_FMT.format(new Date(request.changeRequest.at))}
            </p>
          </SheetSection>
        )}
        {/* WHAT THE REQUEST WAITS ON — first, above the order (Pavan, 2026-10-15). */}
        {/* THE QUOTE STAYS READABLE once accepted (Pavan, 2026-10-19 — "View
            quote" on an accepted request). */}
        {!creating &&
          (request.status === "Quote received" ||
            ((request.status === "Accepted" || request.status === "Partly accepted") &&
              request.documents.some((d) => d.kind === "Quote"))) && (
          <SheetSection id="request-quote" title={`Quote from ${TENANT}`}>
            <QuoteLines r={request} />
          </SheetSection>
        )}
        {!creating && request.status === "Action needed" && (
          <SheetSection title="Action needed">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground">
                {request.flags.find((f) => f.kind === "Credit hold")?.detail ??
                  `${TENANT} needs more from you before it can schedule.`}
              </p>
              <ReplyPanel r={request} credit={request.flags.some((f) => f.kind === "Credit hold")} />
            </div>
          </SheetSection>
        )}
        {!creating && request.undeliveredGal ? (
          <SheetSection title="Partly delivered">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-foreground">
                {request.undeliveredGal.toLocaleString()} gal did not arrive
                {request.flags.find((f) => f.kind === "Driver note") ? ` · ${request.flags.find((f) => f.kind === "Driver note")!.detail}` : ""}
              </p>
              <OrderRestButton r={request} variant="outline" onCreated={onDuplicate} />
            </div>
          </SheetSection>
        ) : null}
        <fieldset disabled={locked} className="flex min-w-0 flex-col gap-10">
          <SheetSection id={SECTION_DELIVERY} title="Delivery">
            {/* SHIP-TO, PO # AND PLANNED DATE ON ONE LINE; the day's window
                and preferred times under them, full width (Pavan, 2026-10-20). */}
            <div className="grid grid-cols-3 gap-4">
              <SheetField label="Ship-to" required>
                <Combobox
                  className="w-full"
                  value={draft.shipTo}
                  onValueChange={(v) =>
                    setDraft((d) => {
                      const next = SHIP_TOS.find((s) => s.name === v);
                      /* A TANK BELONGS TO ITS SHIP-TO — lines for another
                         one's tanks are emptied, not carried over. */
                      const kept = d.lines.filter((l) =>
                        next?.assets.some((a) => a.id === l.assetId)
                      );
                      /* THE SHIP-TO'S DEFAULT PO fills an empty PO #. */
                      return {
                        ...d,
                        shipTo: v,
                        po: d.po.trim() ? d.po : (next?.poNumber ?? ""),
                        lines: kept.length ? kept : [blankLine()],
                        /* THE SHIP-TO'S PREFERRED WINDOWS start an order that has none. */
                        preferred: d.preferred.length
                          ? d.preferred
                          : clampPreferred(next?.preferred ?? [], d.windowStart, d.windowEnd),
                      };
                    })
                  }
                  options={SHIP_TOS.map((s) => s.name)}
                  placeholder="Select ship-to"
                  searchPlaceholder="Search ship-tos…"
                  emptyText="No ship-to found."
                />
              </SheetField>
              <SheetField label="PO #">
                <Input
                  value={draft.po}
                  placeholder="Enter PO number"
                  onChange={(e) => set("po", e.target.value)}
                />
              </SheetField>
              <SheetField label="Planned date" required>
                <DateButton
                  label="Planned date"
                  value={draft.date}
                  onChange={(k) => set("date", k)}
                  placeholder="Select date"
                  from={today}
                />
              </SheetField>
            </div>
            <DeliveryWindowTimeline
              required
              start={draft.windowStart}
              end={draft.windowEnd}
              onWindowChange={(a, b) =>
                setDraft((d) => ({ ...d, windowStart: a, windowEnd: b, preferred: clampPreferred(d.preferred, a, b) }))
              }
              preferred={draft.preferred}
              onPreferredChange={(p) => set("preferred", p)}
              disabled={locked}
            />
          </SheetSection>

          {/* RECURRING ORDER — the shared section (as the 3PL Load Order). */}
          {/* MADE BY A RULE — the rule owns the repeating; the header pill says which. */}
          {/* …and an ORDER repeats only through its request. */}
          {!request.ruleNo && !order && (
            <RecurringOrderSection
              on={draft.recurring}
              schedule={draft.schedule}
              plannedDay={dateOfKey(draft.date)?.getDay()}
              locked={locked}
              onChange={(f) =>
                setDraft((d) => ({ ...d, recurring: true, schedule: f, frequency: scheduleSummary(f), endDate: f.endKey ?? "" }))
              }
              onRemove={() => setDraft((d) => ({ ...d, recurring: false, frequency: "", endDate: "" }))}
            />
          )}

          <SheetSection
            id={SECTION_LINES}
            title="Tanks & assets"
            flush
            hanging={
              unusedAsset && !locked ? (
                <HangingAdd
                  label="Add tank or asset"
                  onClick={() => {
                    setFocusRow(draft.lines.length);
                    set("lines", [...draft.lines, blankLine()]);
                  }}
                />
              ) : undefined
            }
          >
            <LinesTable
              lines={draft.lines}
              shipTo={draft.shipTo}
              focusRow={focusRow}
              onChange={(lines) => set("lines", lines)}
              live={request.status === "Draft"}
              deliveryKey={draft.date}
              request={request}
            />
          </SheetSection>

          <SheetSection title="Instructions">
            <Textarea
              aria-label="Instructions"
              value={draft.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              className="min-h-24"
            />
          </SheetSection>
        </fieldset>

        {/* DOCUMENTS — open in every status, outside the lock: the customer
            can add one at any point (Pavan, 2026-10-13). */}
        <SheetSection
          title="Documents"
          flush
          hanging={
            <HangingAdd label="Add document" onClick={() => fileInput.current?.click()} />
          }
        >
          <DocumentsTable
            rows={documentRows(request.documents)}
            onAdd={() => fileInput.current?.click()}
            onDownload={(d) => toast.success(`${d.name} downloaded`)}
          />
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              if (files.length === 0) return;
              const at = new Date().toISOString();
              updateRequest(
                request.id,
                {
                  documents: [
                    ...request.documents,
                    ...files.map((f, k) => ({
                      id: `doc-${Date.now()}-${k}`,
                      name: f.name,
                      kind: (f.type.startsWith("image/") ? "Photo" : "Other") as RequestDoc["kind"],
                      by: PORTAL_ACTOR,
                      at,
                    })),
                  ],
                },
                files.length === 1 ? `Document added · ${files[0].name}` : `${files.length} documents added`
              );
            }}
          />
        </SheetSection>
        </div>

        {/* THE RIGHT COLUMN — the summary card, while creating too (Pavan,
            2026-10-13: the estimate sits beside the form, not in it); the
            activity card once the request exists. */}
        {/* THE SUMMARY TAKES THE RAIL'S FULL HEIGHT (Pavan, 2026-10-20) — the
            sheet's scroll area less its padding; the trip and activity cards
            keep their own height below it, the summary takes the rest. */}
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0 lg:h-[calc(var(--fp-vh)-10.25rem)]">
          <RequestSummary lines={draft.lines} invoiceNo={request.invoiceNo} fill />
          {!creating && ["Out for delivery", "Partial delivery", "Delivered", "Invoiced", "Paid"].includes(request.status) && (
            <SummaryCard title="Trip">
              <TripTimeline r={request} />
            </SummaryCard>
          )}
          {!creating && <ActivityCard entries={request.audit} />}
        </aside>
      </div>
    </RecordSheet>

    {/* CANCEL ASKS FIRST — the Sales order's dialog. Inside the cut-off it
        is a request the supplier answers, and says a fee may apply. */}
    {/* REQUEST A CHANGE TO AN ACCEPTED ORDER (Pavan, 2026-10-19) — what, and
        a note; it goes to the tenant, who decides. */}
    <AlertDialog open={changeOpen} onOpenChange={setChangeOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request a change to {request.requestNo}</AlertDialogTitle>
          <AlertDialogDescription>{TENANT} decides; the order stays as it is until they do.</AlertDialogDescription>
        </AlertDialogHeader>
        <SheetField label="What to change" required>
          <Combobox
            className="w-full"
            value={changeWhat}
            onValueChange={setChangeWhat}
            options={CHANGE_KINDS}
            placeholder="Select"
            searchThreshold={99}
          />
        </SheetField>
        <SheetField label="Note" required>
          <Textarea aria-label="Note" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} className="min-h-20" />
        </SheetField>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            disabled={!changeWhat || !changeNote.trim()}
            onClick={() => {
              requestChange(request.id, changeWhat, changeNote.trim());
              toast.success(`Change requested for ${request.requestNo}`);
            }}
          >
            Send to {TENANT}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {rule === "request"
              ? `Request cancellation of ${request.requestNo}?`
              : `Cancel ${request.requestNo}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {rule === "request"
              ? `It is inside the cut-off, so ${TENANT} decides, and a cancellation fee may apply.`
              : "It moves to Cancelled, keeping its history."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <SheetField label="Reason" required={rule === "request"}>
          <Textarea
            aria-label="Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-20"
          />
        </SheetField>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={rule === "request" && !cancelReason.trim()}
            onClick={() => {
              const reason = cancelReason.trim();
              const asked = rule === "request";
              updateRequest(
                request.id,
                { status: asked ? "Cancellation requested" : "Cancelled" },
                `${asked ? "Cancellation requested" : "Cancelled"}${reason ? ` · ${reason}` : ""}`
              );
              toast.success(
                asked
                  ? `Cancellation requested for ${request.requestNo}`
                  : `${request.requestNo} cancelled`
              );
            }}
          >
            {rule === "request" ? "Request cancellation" : "Cancel order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
