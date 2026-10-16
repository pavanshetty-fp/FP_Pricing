import * as React from "react";
import { toast } from "sonner";
import { Ban, CalendarDays, Copy, Info, MoreHorizontal, Send } from "lucide-react";
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
import { TimeWindowSlider } from "@/components/form-layout/TimeWindowSlider";
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
import { OrderRestButton, QuoteActions, QuoteLines, ReplyPanel, TripTimeline } from "./requestActions";
import { DATE_FMT, MONEY, RATE, dateKeyOf, formatFullDate, startOfDay } from "../unified-view/data";
import {
  FREQUENCIES,
  PRICES_AS_OF,
  PRODUCTS,
  REQUEST_STATUS_TONE,
  SHIP_TOS,
  TENANT,
  allRequests,
  assetById,
  blankLine,
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
  | "po"
  | "instructions"
  | "recurring"
  | "frequency"
  | "endDate"
>;

const draftOf = (r: OrderRequest): Draft => ({
  shipTo: r.shipTo,
  lines: r.lines,
  date: r.date,
  windowStart: r.windowStart,
  windowEnd: r.windowEnd,
  po: r.po,
  instructions: r.instructions,
  recurring: r.recurring,
  frequency: r.frequency,
  endDate: r.endDate,
});

const SECTION_DELIVERY = "portal-request-delivery";
const SECTION_LINES = "portal-request-lines";

function DateButton({
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
function LinesTable({
  lines,
  shipTo,
  focusRow,
  onChange,
}: {
  lines: RequestLine[];
  shipTo: string;
  focusRow?: number;
  onChange: (next: RequestLine[]) => void;
}) {
  const assets = SHIP_TOS.find((s) => s.name === shipTo)?.assets ?? [];
  const update = (i: number, patch: Partial<RequestLine>) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = quantityOf(lines);
  const started = lines.some((l) => l.topOff || l.gal > 0);
  return (
    <table className="w-full table-fixed border-collapse">
      {/* NARROW BY DESIGN (Pavan, 2026-10-15) — as the Delivery Order. */}
      <colgroup>
        <col className="w-[72px]" />
        <col />
        <col />
        <col className="w-[110px]" />
        <col className="w-[52px]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>Top off</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>Asset</TableRequiredLabel>
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
        {lines.map((l, i) => {
          const asset = assets.find((a) => a.id === l.assetId);
          const name = asset?.name || `line ${i + 1}`;
          return (
            <tr key={i} className="group/row h-11 border-b border-border last:border-b-0">
              <td className="px-3">
                <Checkbox
                  checked={l.topOff}
                  onCheckedChange={(c) => update(i, { topOff: c === true })}
                  aria-label={`Top off ${name}`}
                />
              </td>
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
              <td className="relative p-0">
                <TableCellInput
                  value={l.topOff ? "" : l.gal ? String(l.gal) : ""}
                  placeholder={l.topOff ? "Top-off" : "0"}
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
            <td colSpan={3} className="px-3 text-right text-sm text-muted-foreground">
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
const range = (low: number, high: number) => `${MONEY(low)} – ${MONEY(high)}`;

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

function RequestSummary({ lines, invoiceNo }: { lines: RequestLine[]; invoiceNo?: string }) {
  const est = estimate(lines);
  const qty = quantityOf(lines);
  return (
    <SummaryCard title="Request summary">
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
                    range(r.low, r.high)
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
                    value: `${RATE(r.rateLow)} – ${RATE(r.rateHigh)}/gal`,
                  },
                ]}
              />
            ))}
          </dl>
          <div aria-hidden className="border-t border-dashed border-border" />
        </>
      )}
      <dl className="flex flex-col">
        <RailRow
          variant="line"
          label="Total gallons"
          value={qty.gal > 0 ? qty.gal.toLocaleString() : "—"}
        />
        {qty.topOff > 0 && <RailRow variant="line" label="Top off" value={qty.topOff} />}
        <RailRow
          variant="total"
          label="Estimated cost"
          value={est.high > 0 ? range(est.low, est.high) : "—"}
        />
      </dl>
      {/* SAID OUTRIGHT (Pavan, 2026-10-13): an estimate, not the final price. */}
      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          Estimated from the market price and pricing set by {TENANT} as of{" "}
          {AS_OF_FMT.format(PRICES_AS_OF)}. This is not the final price; {TENANT} confirms it in
          the quote.
        </span>
      </p>
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
  const [cancelOpen, setCancelOpen] = React.useState(false);
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

  const pending: PendingItem[] = [
    !draft.shipTo && { key: "shipTo", label: "Choose a ship-to", target: SECTION_DELIVERY },
    !draft.date && { key: "date", label: "Choose a requested date", target: SECTION_DELIVERY },
    draft.date &&
      draft.date < dateKeyOf(today) && {
        key: "datePast",
        label: "Move the requested date to today or later",
        target: SECTION_DELIVERY,
      },
    draft.recurring &&
      !draft.frequency && { key: "freq", label: "Choose a frequency", target: SECTION_DELIVERY },
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
    updateRequest(request.id, { ...draft, status: "Created" }, "Request submitted");
    toast.success(`${request.requestNo} submitted`);
    onOpenChange(false);
  };

  /* WHAT WAITS ON THE CUSTOMER — the quote's answer is the footer's act. */
  const footerPrimary = locked ? (request.status === "Quote sent" ? <QuoteActions r={request} /> : null) : (
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
          [CELL.flag, CELL.name, CELL.name, CELL.number, CELL.bin],
          [CELL.name, CELL.date, CELL.pick, CELL.bin],
        ],
        rail: true,
      }}
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : close())}
      mode={creating ? "create" : "edit"}
      editTitle={`Request #: ${request.requestNo}`}
      createTitle="Create Order"
      createAction="Submit request"
      showCancel={false}
      headerAside={
        <DraftStatusChip
          tone={REQUEST_STATUS_TONE[request.status]}
          label={request.status}
          saveState={saveState}
        />
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
                Duplicate order
              </DropdownMenuItem>
              {rule !== "none" && (
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
        {/* WHAT THE REQUEST WAITS ON — first, above the order (Pavan, 2026-10-15). */}
        {!creating && request.status === "Quote sent" && (
          <SheetSection title={`Quote from ${TENANT}`}>
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
            <div className="grid grid-cols-2 gap-4">
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
              <SheetField label="Requested date" required>
                <DateButton
                  label="Requested date"
                  value={draft.date}
                  onChange={(k) => set("date", k)}
                  placeholder="Select date"
                  from={today}
                />
              </SheetField>
              <TimeWindowSlider
                label="Delivery window"
                required
                start={draft.windowStart}
                end={draft.windowEnd}
                onChange={(a, b) => setDraft((d) => ({ ...d, windowStart: a, windowEnd: b }))}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-4">
              <SheetField>
                <label className="flex h-9 w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
                  <Checkbox
                    checked={draft.recurring}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setDraft((d) => ({
                        ...d,
                        recurring: on,
                        frequency: on ? d.frequency || FREQUENCIES[2] : d.frequency,
                      }));
                    }}
                  />
                  Recurring order
                </label>
              </SheetField>
              {draft.recurring && (
                <SheetField label="Frequency" required>
                  <Combobox
                    className="w-full"
                    value={draft.frequency}
                    onValueChange={(v) => set("frequency", v)}
                    options={FREQUENCIES}
                    placeholder="Select frequency"
                  />
                </SheetField>
              )}
              {draft.recurring && (
                <SheetField label="End date" className="col-start-2">
                  <DateButton
                    label="End date"
                    value={draft.endDate}
                    onChange={(k) => set("endDate", k)}
                    placeholder="No end date"
                    from={dateOfKey(draft.date) ?? today}
                  />
                </SheetField>
              )}
            </div>
          </SheetSection>

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
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
          <RequestSummary lines={draft.lines} invoiceNo={request.invoiceNo} />
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
