import * as React from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SheetField, SheetSection } from "@/components/side-sheet/parts";
import {
  TableCellInput,
  TableRequiredLabel,
  TableRowRemove,
} from "@/components/form-layout/table-cells";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DraftStatusChip, RecordSheet, useDraftSaveState } from "./RecordSheet";
import { ProductTable } from "./ProductTable";
import { HangingAdd } from "./HangingAdd";
import { PendingStrip, type PendingItem } from "./PendingStrip";
import { ActivityCard, RailRow, SummaryCard } from "./SheetCards";
import { EmailChips } from "./threepl/InvitePartnerSheet";
import { CUSTOMERS } from "./customers";
import { MONEY, RATE, dateKeyOf, formatFullDate, startOfDay } from "./data";
import {
  ADJUST_UNITS,
  MARKETS,
  QUOTE_PRODUCTS,
  QUOTE_STATUS_TONE,
  dateOfKey,
  newChargeId,
  printKey,
  priceQuote,
  quoteStatus,
  reapplyRates,
  reprice,
  type Adjust,
  type AdjustUnit,
  type Charge,
  type ChargeKind,
  type Quote,
  type QuoteLine,
} from "./quotes";
import { acceptQuote, discardQuote, updateQuote } from "./quoteStore";
import {
  ConfiguredForm,
  extraFilled,
  isNative,
  missingRequired,
  sectionId,
  type BuiltInField,
} from "./ConfiguredForm";
import { notify, useSalesSettings, type FormField } from "./salesSettings";

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
  | "taxes"
  | "notes"
  | "extra"
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
  taxes: q.taxes,
  notes: q.notes,
  /* Fields added in Sales Settings, by key (2026-10-07). */
  extra: q.extra ?? {},
});

const ACTIVE_CUSTOMERS = CUSTOMERS.filter((c) => c.status === "Active");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One row of the Pricing breakdown. */
interface PricingRow {
  key: string;
  /** What the row is called — and, for an added fee or tax, what it is named. */
  label: string;
  value: Adjust;
  onChange: (next: Adjust) => void;
  /** An added fee or tax: its name is typed in its cell. */
  onRename?: (name: string) => void;
  /** An added fee or tax: it can go. */
  onRemove?: () => void;
  /** "fee 2" — the subject of a blank row's remove. */
  blankName?: string;
  autoFocus?: boolean;
}

/**
 * THE PRICING BREAKDOWN IS A TABLE (Pavan, 2026-10-07): one row per charge,
 * every value cell editable, and the unit ($/gal · $ · %) chosen INSIDE that
 * cell rather than as a toggle beside a field. A set of like inputs in a form
 * defaults to the editable table (DS ui §10f).
 *
 * FEES AND TAXES CAN BE ADDED (Pavan, 2026-10-07). Margin is one row; the
 * first Fees and the first Tax are the defaults; every row added after them
 * has its name typed in its Charge cell and a remove that asks ✕ / ✓.
 */
function PricingTable({ rows, disabled }: { rows: PricingRow[]; disabled?: boolean }) {
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[40%]" />
        <col />
        <col className="w-[52px]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border bg-fp-table-header">
          <th className="px-3 py-2.5 text-left">
            <TableRequiredLabel>Charge</TableRequiredLabel>
          </th>
          <th className="px-3 py-2.5 text-right">
            <TableRequiredLabel>Value</TableRequiredLabel>
          </th>
          {/* UNNAMED, like every row remove — DS ui §10f. */}
          <th aria-hidden />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const unit = ADJUST_UNITS.find((u) => u.value === r.value.unit)!;
          const name = r.label || r.blankName || "";
          return (
            <tr key={r.key} className="group/row h-11 border-b border-border last:border-b-0">
              {r.onRename ? (
                <td className="relative p-0">
                  <TableCellInput
                    value={r.label}
                    placeholder="Enter name"
                    disabled={disabled}
                    autoFocus={r.autoFocus}
                    aria-label={`Name of ${name}`}
                    onChange={r.onRename}
                  />
                </td>
              ) : (
                <td className="px-3 text-sm text-foreground">{r.label}</td>
              )}
              <td className="relative p-0">
                <div className="flex h-11 items-stretch">
                  <div className="relative min-w-0 flex-1">
                    <TableCellInput
                      numeric
                      disabled={disabled}
                      aria-label={name}
                      value={String(r.value.value)}
                      onChange={(v) => {
                        const n = Number(v);
                        r.onChange({ ...r.value, value: Number.isFinite(n) ? n : 0 });
                      }}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={disabled}>
                      <button
                        type="button"
                        aria-label={`${name} unit`}
                        className="flex w-[72px] shrink-0 items-center justify-end gap-1 px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {unit.label}
                        <ChevronDown className="size-4 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-24">
                      <DropdownMenuRadioGroup
                        value={r.value.unit}
                        onValueChange={(u) => r.onChange({ ...r.value, unit: u as AdjustUnit })}
                      >
                        {ADJUST_UNITS.map((u) => (
                          <DropdownMenuRadioItem key={u.value} value={u.value}>
                            {u.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
              <td className="relative p-0 text-center">
                {r.onRemove && (
                  <TableRowRemove
                    aria-label={`Remove ${name}`}
                    disabled={disabled}
                    onRemove={r.onRemove}
                  />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
  /** The fee or tax just added — its name cell takes the cursor. */
  const [focusCharge, setFocusCharge] = React.useState<string | undefined>();
  /** The kind picked in the Add charge menu, added once the menu has closed. */
  const pickedCharge = React.useRef<ChargeKind | null>(null);
  const [pendingShown, setPendingShown] = React.useState(false);
  const [emailOpen, setEmailOpen] = React.useState(false);
  /* SALES SETTINGS LAY THE LEFT COLUMN OUT (Pavan, 2026-10-07 — "fix it
     all", C): order, sections, labels, hidden and required fields. */
  const settings = useSalesSettings();
  const formFields = settings.forms.quote;

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
  /* THE PRIMARY UNIT, as the quantity heading prints it (2026-10-07). */
  const unitHead = { Gallons: "Gal", Litres: "L", Drums: "Drums" }[settings.unit];


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

  /* FEES AND TAXES ARE LISTS (Pavan, 2026-10-07). The first of each is the
     default — named, and not removable; every one added after it is. */
  const listKey = (kind: ChargeKind) => (kind === "fee" ? "fees" : "taxes");
  const addCharge = (kind: ChargeKind) => {
    const id = newChargeId(kind);
    setFocusCharge(id);
    const key = listKey(kind);
    set(key, [...draft[key], { id, name: "", value: 0, unit: kind === "fee" ? "perGal" : "percent" }]);
  };
  const chargeRows = (kind: ChargeKind): PricingRow[] => {
    const key = listKey(kind);
    const list = draft[key];
    const patch = (id: string, p: Partial<Charge>) =>
      set(key, list.map((c) => (c.id === id ? { ...c, ...p } : c)));
    return list.map((c, i) => ({
      key: c.id,
      label: c.name,
      value: c,
      onChange: (v: Adjust) => patch(c.id, v),
      ...(i > 0 && {
        onRename: (name: string) => patch(c.id, { name }),
        onRemove: () => set(key, list.filter((x) => x.id !== c.id)),
        blankName: `${kind} ${i + 1}`,
        autoFocus: c.id === focusCharge,
      }),
    }));
  };
  /** A fee or tax as the summary names it — a blank added one by its kind. */
  const partsOf = (list: Charge[], parts: number[], fallback: string) =>
    list.length > 1
      ? list.map((c, i) => ({ label: c.name || fallback, value: RATE(parts[i] ?? 0) }))
      : undefined;

  /* ---- the quote's own fields, as Sales Settings place them ---------- */

  const renderers: Record<string, (f: FormField) => BuiltInField> = {
    customer: () => ({
      half: true,
      control: (
        <Combobox
          className="w-full"
          value={draft.customer}
          onValueChange={pickCustomer}
          options={ACTIVE_CUSTOMERS.map((c) => c.name)}
          placeholder="Select customer"
          searchPlaceholder="Search customers…"
          emptyText="No customer found."
        />
      ),
    }),
    shipTo: () => ({
      half: true,
      /* THE GATE LIVES IN THE PICKER (ux §Side-sheet anatomy): only the
         chosen customer's ship-tos, and with none chosen it says why it is
         empty. */
      control: (
        <Combobox
          className="w-full"
          value={draft.shipTo}
          onValueChange={(v) => set("shipTo", v)}
          options={shipTos}
          placeholder={customer ? "Select ship-to" : "Choose a customer first"}
          emptyText="No ship-to found."
        />
      ),
    }),
    email: () => ({
      half: true,
      control: (
        <Input
          type="email"
          value={draft.email}
          placeholder="name@company.com"
          onChange={(e) => set("email", e.target.value)}
        />
      ),
    }),
    validThrough: () => ({
      half: true,
      control: (
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
      ),
    }),
    market: () => ({
      half: true,
      control: (
        <Combobox
          className="w-full"
          value={draft.market}
          onValueChange={(m) =>
            setDraft((d) => (d ? { ...d, market: m, lines: reprice(d.lines, m) } : d))
          }
          options={MARKETS}
          placeholder="Select market"
        />
      ),
    }),
    products: () => ({
      table: {
        action:
          /* Only when a rate was typed over the list's — otherwise every
             line is already on it. */
          anyOverride && !locked ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => set("lines", reapplyRates(draft.lines, draft.market))}
            >
              Reapply rate
            </Button>
          ) : undefined,
        hanging:
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
          ) : undefined,
        node: (
          <ProductTable<QuoteLine>
            lines={draft.lines}
            options={QUOTE_PRODUCTS}
            focusRow={focusProduct}
            onChange={setLines}
            qtyLabel={`Quantity (${unitHead})`}
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
        ),
      },
    }),
    pricing: () => ({
      table: {
        hanging:
          /* ONE ADD, TWO KINDS OF ROW (Pavan, 2026-10-07). A table has one
             hanging add; a choice of Fee or Tax is a menu off it, never a
             second tab beside it. */
          locked ? undefined : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <HangingAdd label="Add charge" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-28"
                /* THE ROW IS ADDED ONCE THE MENU HAS CLOSED, so its name
                   cell can take the cursor — an open menu holds focus, and
                   handing it back would land on the add. */
                onCloseAutoFocus={(e) => {
                  const kind = pickedCharge.current;
                  if (!kind) return;
                  e.preventDefault();
                  pickedCharge.current = null;
                  addCharge(kind);
                }}
              >
                <DropdownMenuItem onSelect={() => (pickedCharge.current = "fee")}>
                  Fee
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => (pickedCharge.current = "tax")}>
                  Tax
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        node: (
          <PricingTable
            disabled={locked}
            rows={[
              {
                key: "margin",
                label: "Margin",
                value: draft.margin,
                onChange: (v) => set("margin", v),
              },
              ...chargeRows("fee"),
              ...chargeRows("tax"),
            ]}
          />
        ),
      },
    }),
    /* THE NOTES ARE THEIR OWN UNIT, IN THE SAME GROUP (Pavan, 2026-10-07 —
       ux §Record sheets): under the table's box, not inside it. */
    notes: () => ({
      control: (
        <Textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-24"
        />
      ),
    }),
  };

  /* WHERE EACH FIELD SITS NOW — the strip sends the reader to its section. */
  const secOf = (key: string) =>
    sectionId("quote", formFields.find((f) => f.key === key)?.section ?? "");
  const pending: PendingItem[] = [
    !draft.customer && { key: "customer", label: "Choose a customer", target: secOf("customer") },
    !draft.shipTo && { key: "shipTo", label: "Choose a ship-to", target: secOf("shipTo") },
    !EMAIL_RE.test(draft.email.trim()) && {
      key: "email",
      label: "Enter the customer's email",
      target: secOf("email"),
    },
    !draft.validThrough && {
      key: "valid",
      label: "Choose a valid-through date",
      target: secOf("validThrough"),
    },
    draft.validThrough &&
      draft.validThrough < dateKeyOf(today) && {
        key: "validPast",
        label: "Move the valid-through date to today or later",
        target: secOf("validThrough"),
      },
    !draft.market && { key: "market", label: "Choose a market", target: secOf("market") },
    draft.lines.some((l) => !l.name) && {
      key: "product",
      label: "Choose a product",
      target: secOf("products"),
    },
    draft.lines.some((l) => l.gal <= 0) && {
      key: "gal",
      label: "Enter gallons",
      target: secOf("products"),
    },
    draft.market &&
      draft.lines.some((l) => l.name && l.base === null) && {
        key: "base",
        label: "Enter a base rate",
        target: secOf("products"),
      },
    /* AND EVERY OTHER FIELD SALES SETTINGS MARK REQUIRED — the locked ones
       are asked above, in the quote's own words. */
    ...missingRequired(
      "quote",
      formFields.filter((f) => !f.locked),
      (f) => (isNative(f, renderers) ? Boolean(draft.notes.trim()) : extraFilled(draft.extra?.[f.key]))
    ),
  ].filter(Boolean) as PendingItem[];

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
          /* acceptQuote raises the Quote accepted notification; this is the
             plain confirmation for when that row is off (2026-10-07). */
          if (order && !settings.notifications.find((n) => n.key === "quoteAccepted")?.inApp)
            toast.success(`${quote.quoteNo} accepted · Order ${order.orderNo} created`);
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
            <ConfiguredForm
              kind="quote"
              renderers={renderers}
              extra={draft.extra ?? {}}
              onExtraChange={(key, value) => set("extra", { ...(draft.extra ?? {}), [key]: value })}
            />
          </fieldset>

          {/* WHAT THE FORM MAKES — read-only, and it stays put while the form
              scrolls (ux §Side-sheet anatomy, the two-column sheet). */}
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            {/* THE SHARED SUMMARY CARD (Pavan, 2026-10-07 — ux §Record
                sheets): the 3PL Quotation summary's shell. A fee or tax row
                made of several shows its parts on hover. */}
            <SummaryCard title="Quote summary">
              <dl className="flex flex-col">
                <RailRow variant="line" label="Base rate" value={RATE(price.base)} />
                <RailRow variant="line" label="Margin" value={RATE(price.margin)} />
                <RailRow
                  variant="line"
                  label="Fees"
                  value={RATE(price.fees)}
                  breakdown={partsOf(draft.fees, price.feeParts, "Fee")}
                />
                <RailRow
                  variant="line"
                  label="Tax"
                  value={RATE(price.tax)}
                  breakdown={partsOf(draft.taxes, price.taxParts, "Tax")}
                />
              </dl>
              <div aria-hidden className="border-t border-dashed border-border" />
              <dl className="flex flex-col">
                <RailRow
                  variant="line"
                  label="Net effective price per gallon"
                  value={RATE(price.net)}
                />
                <RailRow variant="total" label="Quote total" value={MONEY(price.total)} />
              </dl>
              {quote.orderId && quote.orderNo && (
                <>
                  <div aria-hidden className="border-t border-border" />
                  <dl className="flex flex-col">
                    <RailRow
                      variant="line"
                      label="Fuel order"
                      value={
                        <Button
                          variant="link"
                          className="h-auto p-0 tabular-nums"
                          onClick={() => onOpenOrder(quote.orderId!)}
                        >
                          {quote.orderNo}
                        </Button>
                      }
                    />
                  </dl>
                </>
              )}
            </SummaryCard>
            {/* THE SHARED ACTIVITY CARD (Pavan, 2026-10-07). */}
            <ActivityCard entries={quote.audit} timeZone={settings.timeZone} />
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
          /* QUOTE SENT — the in-app notification when its row says so;
             otherwise the plain confirmation (2026-10-07). */
          if (settings.notifications.find((n) => n.key === "quoteSent")?.inApp)
            notify("quoteSent", `${quote.quoteNo} sent to ${draft.email}`);
          else toast.success(`${quote.quoteNo} sent to ${draft.email}`);
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
