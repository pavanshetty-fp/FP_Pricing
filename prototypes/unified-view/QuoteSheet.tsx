import * as React from "react";
import { toast } from "sonner";
import { CalendarDays, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import { TableCellInput } from "@/components/form-layout/table-cells";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import { ProductTable } from "./ProductTable";
import { HangingAdd } from "./HangingAdd";
import { PendingStrip, type PendingItem } from "./PendingStrip";
import { ActivitySection } from "./activity";
import { EmailChips } from "./threepl/InvitePartnerSheet";
import { CUSTOMERS } from "./customers";
import { MONEY, RATE, dateKeyOf, formatFullDate, startOfDay } from "./data";
import {
  ADJUST_UNITS,
  MARKETS,
  QUOTE_PRODUCTS,
  QUOTE_STATUS_TONE,
  dateOfKey,
  printKey,
  priceQuote,
  quoteStatus,
  reapplyRates,
  reprice,
  type Adjust,
  type AdjustUnit,
  type Quote,
  type QuoteLine,
} from "./quotes";
import { acceptQuote, discardQuote, updateQuote } from "./quoteStore";

/*
  THE QUOTE SHEET (Pavan, 2026-10-07). The record exists from the moment
  Create Quote is pressed, as a Draft, and every pause in the typing is kept —
  so there is no Save and no Cancel. The footer is the next act:

    Draft     Save as Draft (outline, closes) · Send quote
    Sent      Mark as accepted — which makes the fuel order
    Expired   nothing; moving the valid-through date on makes it Sent again
    Accepted  nothing; the order it made is in the summary

  TWO COLUMNS: what you fill in on the left, what that makes on the right
  (ux §Side-sheet anatomy).

  No helper text, hints or sub-labels anywhere (Pavan, 2026-10-07 — decision
  5): labels, values and controls only.
*/

/** The part of a quote the form edits. Stage, number and order are not typed. */
type QuoteDraft = Pick<
  Quote,
  | "customer"
  | "shipTo"
  | "email"
  | "validThrough"
  | "market"
  | "lines"
  | "margin"
  | "fees"
  | "tax"
  | "notes"
>;

const draftOf = (q: Quote): QuoteDraft => ({
  customer: q.customer,
  shipTo: q.shipTo,
  email: q.email,
  validThrough: q.validThrough,
  market: q.market,
  lines: q.lines,
  margin: q.margin,
  fees: q.fees,
  tax: q.tax,
  notes: q.notes,
});

const ACTIVE_CUSTOMERS = CUSTOMERS.filter((c) => c.status === "Active");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A number typed as text — the buffer `TableCellInput` keeps, for a plain input. */
function NumberInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  "aria-label": string;
}) {
  const [typed, setTyped] = React.useState<string | null>(null);
  return (
    <Input
      inputMode="decimal"
      aria-label={ariaLabel}
      value={typed ?? String(value)}
      onChange={(e) => {
        setTyped(e.target.value);
        onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0);
      }}
      onBlur={() => setTyped(null)}
      className="min-w-0 flex-1 text-right tabular-nums"
    />
  );
}

/** Margin, fees or tax — an amount and what it is in. */
function AdjustField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Adjust;
  onChange: (next: Adjust) => void;
}) {
  return (
    <SheetField label={label}>
      <div className="flex items-center gap-2">
        <NumberInput
          aria-label={label}
          value={value.value}
          onChange={(n) => onChange({ ...value, value: n })}
        />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={value.unit}
          /* Radix sends "" when the chosen one is pressed again; a unit is never empty. */
          onValueChange={(u) => u && onChange({ ...value, unit: u as AdjustUnit })}
          aria-label={`${label} unit`}
        >
          {ADJUST_UNITS.map((u) => (
            <ToggleGroupItem key={u.value} value={u.value} className="px-2.5 text-xs">
              {u.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </SheetField>
  );
}

/** One row of the build-up: a label in the muted channel, the figure in the foreground. */
function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn("text-sm", strong ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "text-sm tabular-nums text-foreground",
          strong && "font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export interface QuoteSheetProps {
  quote: Quote | null;
  open: boolean;
  /** Opened by Create Quote — the title says so, and closing it untouched drops it. */
  creating: boolean;
  onOpenChange: (open: boolean) => void;
  /** The fuel order an accepted quote made. */
  onOpenOrder: (orderId: string) => void;
}

export function QuoteSheet({ quote, open, creating, onOpenChange, onOpenOrder }: QuoteSheetProps) {
  /* THE DRAFT CARRIES THE ID IT WAS BUILT FOR, so the sheet reopened on
     another quote never shows — or counts as an edit — the last one's. */
  const [held, setHeld] = React.useState<{ id: string; d: QuoteDraft } | null>(null);
  const draft = held && quote && held.id === quote.id ? held.d : null;
  const setDraft = (fn: (d: QuoteDraft | null) => QuoteDraft | null) =>
    setHeld((h) => {
      const d = h ? fn(h.d) : null;
      return h && d ? { id: h.id, d } : h;
    });
  const [focusProduct, setFocusProduct] = React.useState<number | undefined>();
  const [pendingShown, setPendingShown] = React.useState(false);
  const [emailOpen, setEmailOpen] = React.useState(false);

  /* BUILT ONCE PER RECORD, NOT ONCE PER SAVE — the order sheet's `builtFor`:
     every autosave hands back a new quote, and rebuilding from it would move
     the caret and lose what was typed since. */
  const builtFor = React.useRef<string | null>(null);
  const lastSaved = React.useRef<string | null>(null);
  /** The blank a Create Quote opened on — closing still equal to it keeps nothing. */
  const blank = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open || !quote) {
      builtFor.current = null;
      return;
    }
    if (builtFor.current === quote.id) return;
    builtFor.current = quote.id;
    const built = draftOf(quote);
    lastSaved.current = JSON.stringify(built);
    blank.current = creating ? lastSaved.current : null;
    setPendingShown(false);
    setHeld({ id: quote.id, d: built });
  }, [open, quote, creating]);

  /* AUTOSAVE, DEBOUNCED — a save per pause in the work, not per keystroke. */
  React.useEffect(() => {
    if (!open || !draft || !quote) return;
    const shape = JSON.stringify(draft);
    if (lastSaved.current === shape) return;
    const t = window.setTimeout(() => {
      lastSaved.current = shape;
      updateQuote(quote.id, draft);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, open, quote]);

  const saveState = useDraftSaveState(draft, open);

  /** Write whatever the debounce has not yet. */
  const flush = () => {
    if (!draft || !quote) return;
    const shape = JSON.stringify(draft);
    if (lastSaved.current === shape) return;
    lastSaved.current = shape;
    updateQuote(quote.id, draft);
  };

  const close = () => {
    if (quote && draft && blank.current !== null && JSON.stringify(draft) === blank.current) {
      /* NOTHING WAS TYPED, so there is nothing to keep — an empty draft left
         in the list would be a record of a button press. */
      discardQuote(quote.id);
    } else {
      flush();
    }
    onOpenChange(false);
  };

  if (!draft || !quote) return null;

  const set = <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const status = quoteStatus({ ...quote, validThrough: draft.validThrough });
  /* ACCEPTED IS FINAL. It has become an order; a quote edited after that
     would no longer say what the customer agreed to. */
  const locked = quote.stage === "Accepted";
  const price = priceQuote(draft);
  const customer = CUSTOMERS.find((c) => c.name === draft.customer);
  const shipTos = customer?.shipTos ?? [];
  const unusedProduct = QUOTE_PRODUCTS.find((p) => !draft.lines.some((l) => l.name === p));
  const anyOverride = draft.lines.some((l) => l.baseSet);
  const today = startOfDay(new Date());

  const pending: PendingItem[] = [
    !draft.customer && { key: "customer", label: "Choose a customer", target: "quote-customer" },
    !draft.shipTo && { key: "shipTo", label: "Choose a ship-to", target: "quote-customer" },
    !EMAIL_RE.test(draft.email.trim()) && {
      key: "email",
      label: "Enter the customer's email",
      target: "quote-customer",
    },
    !draft.validThrough && {
      key: "valid",
      label: "Choose a valid-through date",
      target: "quote-customer",
    },
    draft.validThrough &&
      draft.validThrough < dateKeyOf(today) && {
        key: "validPast",
        label: "Move the valid-through date to today or later",
        target: "quote-customer",
      },
    !draft.market && { key: "market", label: "Choose a market", target: "quote-products" },
    draft.lines.some((l) => !l.name) && {
      key: "product",
      label: "Choose a product",
      target: "quote-products",
    },
    draft.lines.some((l) => l.gal <= 0) && {
      key: "gal",
      label: "Enter gallons",
      target: "quote-products",
    },
    draft.market &&
      draft.lines.some((l) => l.name && l.base === null) && {
        key: "base",
        label: "Enter a base rate",
        target: "quote-products",
      },
  ].filter(Boolean) as PendingItem[];

  const pickCustomer = (name: string) => {
    const next = CUSTOMERS.find((c) => c.name === name);
    const prevEmail = customer?.contactEmail ?? "";
    setDraft((d) =>
      d
        ? {
            ...d,
            customer: name,
            /* A SHIP-TO BELONGS TO ITS CUSTOMER — one that is not the new
               customer's goes, and a customer with one ship-to has it. */
            shipTo: next?.shipTos.includes(d.shipTo)
              ? d.shipTo
              : next?.shipTos.length === 1
                ? next.shipTos[0]
                : "",
            /* The account's contact, unless somebody typed another address. */
            email: !d.email || d.email === prevEmail ? (next?.contactEmail ?? "") : d.email,
          }
        : d
    );
  };

  const setLines = (lines: QuoteLine[]) => set("lines", reprice(lines, draft.market));

  const footerPrimary =
    quote.stage === "Draft" ? (
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => {
            flush();
            toast.success(`${quote.quoteNo} saved as a draft`);
            onOpenChange(false);
          }}
        >
          Save as Draft
        </Button>
        <Button
          onClick={() => {
            /* PRESSABLE, AND PRESSING SAYS WHAT IS MISSING — it raises the
               pending strip rather than acting (the service sheet's rule). */
            if (pending.length > 0) setPendingShown(true);
            else {
              flush();
              setEmailOpen(true);
            }
          }}
        >
          <Send />
          Send quote
        </Button>
      </div>
    ) : status === "Sent" ? (
      <Button
        onClick={() => {
          flush();
          const order = acceptQuote(quote.id);
          if (order) toast.success(`${quote.quoteNo} accepted · Order ${order.orderNo} created`);
        }}
      >
        Mark as accepted
      </Button>
    ) : null;

  return (
    <>
      <RecordSheet
        size="xxwide"
        open={open}
        onOpenChange={(o) => (o ? onOpenChange(o) : close())}
        mode={creating ? "create" : "edit"}
        editTitle={`Quote #: ${quote.quoteNo}`}
        createTitle="Create Quote"
        createAction="Send quote"
        /* AUTOSAVED, so Cancel is a promise the sheet cannot keep. */
        showCancel={false}
        /* THE STEPPED LOOK, WITHOUT THE STEP COLUMN — as the 3PL order sheet
           (archived 2026-10-06). */
        stepColumn={false}
        headerAside={
          <DraftStatusChip tone={QUOTE_STATUS_TONE[status]} label={status} saveState={saveState} />
        }
        footerBanner={
          quote.stage === "Draft" && pendingShown ? (
            <PendingStrip
              tone="caution"
              pending={pending}
              clearLabel="Everything this quote needs is filled in"
            />
          ) : undefined
        }
        onSubmit={() => {}}
        footerPrimary={footerPrimary}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-10">
            <SheetSection title="Customer & delivery" id="quote-customer">
              <div className="grid gap-4 md:grid-cols-2">
                <SheetField label="Customer" required>
                  <Combobox
                    className="w-full"
                    value={draft.customer}
                    onValueChange={pickCustomer}
                    options={ACTIVE_CUSTOMERS.map((c) => c.name)}
                    placeholder="Select customer"
                    searchPlaceholder="Search customers…"
                    emptyText="No customer found."
                  />
                </SheetField>
                <SheetField label="Ship-to" required>
                  {/* THE GATE LIVES IN THE PICKER (ux §Side-sheet anatomy):
                      only the chosen customer's ship-tos, and with none
                      chosen it says why it is empty. */}
                  <Combobox
                    className="w-full"
                    value={draft.shipTo}
                    onValueChange={(v) => set("shipTo", v)}
                    options={shipTos}
                    placeholder={customer ? "Select ship-to" : "Choose a customer first"}
                    emptyText="No ship-to found."
                  />
                </SheetField>
                <SheetField label="Customer email" required>
                  <Input
                    type="email"
                    value={draft.email}
                    placeholder="name@company.com"
                    onChange={(e) => set("email", e.target.value)}
                  />
                </SheetField>
                <SheetField label="Valid through" required>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarDays />
                        {draft.validThrough ? (
                          formatFullDate(dateOfKey(draft.validThrough)!)
                        ) : (
                          <span className="text-muted-foreground">Select date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateOfKey(draft.validThrough) ?? undefined}
                        onSelect={(d) => d && set("validThrough", dateKeyOf(d))}
                        defaultMonth={dateOfKey(draft.validThrough) ?? today}
                        disabled={{ before: today }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </SheetField>
              </div>
            </SheetSection>

            <SheetSection
              title="Product & market"
              id="quote-products"
              flush
              action={
                /* Only when a rate was typed over the list's — otherwise
                   every line is already on it. */
                anyOverride && !locked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => set("lines", reapplyRates(draft.lines, draft.market))}
                  >
                    Reapply rate
                  </Button>
                ) : undefined
              }
              hanging={
                unusedProduct !== undefined && !locked ? (
                  <HangingAdd
                    label="Add product"
                    onClick={() => {
                      setFocusProduct(draft.lines.length);
                      setLines([
                        ...draft.lines,
                        { name: unusedProduct, gal: 0, base: null, baseSet: false },
                      ]);
                    }}
                  />
                ) : undefined
              }
            >
              <div className="border-b border-border p-4">
                <SheetField label="Market" required className="md:max-w-[calc(50%-8px)]">
                  <Combobox
                    className="w-full"
                    value={draft.market}
                    onValueChange={(m) =>
                      setDraft((d) => (d ? { ...d, market: m, lines: reprice(d.lines, m) } : d))
                    }
                    options={MARKETS}
                    placeholder="Select market"
                  />
                </SheetField>
              </div>
              <ProductTable<QuoteLine>
                lines={draft.lines}
                options={QUOTE_PRODUCTS}
                focusRow={focusProduct}
                onChange={setLines}
                columns={[
                  {
                    key: "base",
                    label: "Base $/gal",
                    width: "w-[18%]",
                    required: true,
                    cell: (l, i) => (
                      <TableCellInput
                        value={l.base === null ? "" : l.base.toFixed(3)}
                        numeric
                        prefix="$"
                        placeholder="—"
                        aria-label={`Base rate of ${l.name || `row ${i + 1}`}`}
                        onChange={(v) => {
                          const n = Number(v.replace(/[^0-9.]/g, ""));
                          /* Typed, it is this line's rate until Reapply;
                             emptied, the line goes back to the list's. */
                          setLines(
                            draft.lines.map((x, j) =>
                              j !== i
                                ? x
                                : v.trim() === ""
                                  ? { ...x, baseSet: false }
                                  : { ...x, baseSet: true, base: Number.isFinite(n) ? n : 0 }
                            )
                          );
                        }}
                      />
                    ),
                  },
                  {
                    key: "net",
                    label: "Net $/gal",
                    width: "w-[16%]",
                    cell: (_, i) => (
                      <div className="flex h-11 items-center justify-end px-3 text-sm tabular-nums text-foreground">
                        {price.lines[i] ? RATE(price.lines[i]!.net) : "—"}
                      </div>
                    ),
                    total: price.gallons > 0 ? RATE(price.net) : "—",
                  },
                  {
                    key: "total",
                    label: "Line total",
                    width: "w-[20%]",
                    cell: (_, i) => (
                      <div className="flex h-11 items-center justify-end px-3 text-sm tabular-nums text-foreground">
                        {price.lines[i] ? MONEY(price.lines[i]!.total) : "—"}
                      </div>
                    ),
                    total: MONEY(price.total),
                  },
                ]}
              />
            </SheetSection>

            <SheetSection title="Pricing breakdown" id="quote-pricing">
              <div className="grid gap-4 md:grid-cols-3">
                <AdjustField label="Margin" value={draft.margin} onChange={(v) => set("margin", v)} />
                <AdjustField label="Fees" value={draft.fees} onChange={(v) => set("fees", v)} />
                <AdjustField label="Tax" value={draft.tax} onChange={(v) => set("tax", v)} />
              </div>
              <SheetField label="Customer notes">
                <Textarea
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="min-h-24"
                />
              </SheetField>
            </SheetSection>
          </fieldset>

          {/* WHAT THE FORM MAKES — read-only, and it stays put while the form
              scrolls (ux §Side-sheet anatomy, the two-column sheet). */}
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            <SheetSection title="Net effective price">
              <div className="flex flex-col gap-2">
                <SummaryRow label="Base rate" value={RATE(price.base)} />
                <SummaryRow label="Margin" value={RATE(price.margin)} />
                <SummaryRow label="Fees" value={RATE(price.fees)} />
                <SummaryRow label="Tax" value={RATE(price.tax)} />
                <div className="my-1 border-t border-dashed border-border" />
                <SummaryRow label="Net effective price per gallon" value={RATE(price.net)} strong />
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Quote total</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {MONEY(price.total)}
                </span>
              </div>
              {quote.orderId && quote.orderNo && (
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Fuel order</span>
                  <Button
                    variant="link"
                    className="h-auto p-0 tabular-nums"
                    onClick={() => onOpenOrder(quote.orderId!)}
                  >
                    {quote.orderNo}
                  </Button>
                </div>
              )}
            </SheetSection>
            <ActivitySection entries={quote.audit} />
          </aside>
        </div>
      </RecordSheet>

      <QuoteEmailSheet
        quote={quote}
        draft={draft}
        open={emailOpen}
        onOpenChange={setEmailOpen}
        onSend={() => {
          updateQuote(quote.id, { ...draft, stage: "Sent" });
          lastSaved.current = JSON.stringify(draft);
          toast.success(`${quote.quoteNo} sent to ${draft.email}`);
        }}
      />
    </>
  );
}

/*
  SEND QUOTE IS A STEP, NOT A BUTTON THAT FIRES (Pavan, 2026-10-07 — decision
  4). The email the customer will get, built from the quote: who it goes to,
  the subject, the body. It can be changed here; the quote is not. The last
  press is Send, which is what moves the quote to Sent.
*/
function QuoteEmailSheet({
  quote,
  draft,
  open,
  onOpenChange,
  onSend,
}: {
  quote: Quote;
  draft: QuoteDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
}) {
  const [to, setTo] = React.useState<string[]>([]);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  /* SEEDED ONCE PER OPEN — the partner invitation's rule. */
  React.useEffect(() => {
    if (!open) return;
    const price = priceQuote(draft);
    const contact = CUSTOMERS.find((c) => c.name === draft.customer)?.contactName.split(" ")[0];
    setTo(draft.email ? [draft.email.trim()] : []);
    setSubject(`Fuel quote ${quote.quoteNo} · ${draft.shipTo}`);
    setBody(
      [
        `Hi ${contact ?? "there"},`,
        "",
        `Here is our quote ${quote.quoteNo} for delivery to ${draft.shipTo} (${draft.market}).`,
        "",
        ...draft.lines.map((l, i) => {
          const p = price.lines[i];
          return `${l.name} — ${l.gal.toLocaleString()} gal at ${p ? RATE(p.net) : "—"}/gal = ${p ? MONEY(p.total) : "—"}`;
        }),
        "",
        `Net effective price: ${RATE(price.net)}/gal`,
        `Quote total: ${MONEY(price.total)}`,
        `Valid through ${printKey(draft.validThrough)}.`,
        ...(draft.notes.trim() ? ["", draft.notes.trim()] : []),
        "",
        "Dana Whitfield",
      ].join("\n")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const nothingToSend = to.length === 0 || subject.trim() === "";

  return (
    <RecordSheet
      level={2}
      size="wide"
      fill={false}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle=""
      createTitle={`Send quote ${quote.quoteNo}`}
      createAction="Send"
      showCancel={false}
      canSubmit={!nothingToSend}
      onSubmit={onSend}
      footerPrimary={
        <Button
          disabled={nothingToSend}
          onClick={() => {
            onSend();
            onOpenChange(false);
          }}
        >
          <Send />
          Send
        </Button>
      }
    >
      <SheetSection title="Email">
        <SheetField label="To">
          <EmailChips id="quote-to" value={to} onChange={setTo} placeholder="name@company.com" />
        </SheetField>
        <SheetField label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </SheetField>
        <SheetField label="Message">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-80 font-normal"
          />
        </SheetField>
      </SheetSection>
    </RecordSheet>
  );
}
