import { Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SheetSection } from "@/components/side-sheet/parts";
import { MONEY } from "../data";
import {
  TableCellInput,
  TableRequiredLabel,
} from "@/components/form-layout/table-cells";
import { FileUpload } from "@/components/form-layout/FileUpload";
import { CELL, RecordSheet } from "../RecordSheet";
import {
  billableGal,
  quoteLineTotal,
  quoteLineChargeRate,
  quoteTotal,
  type OrderLine,
  type QuoteLine,
  type VendorQuote,
} from "./orders";

/**
 * ONE PARTNER'S QUOTE, IN FULL — the working behind the TLC on its row.
 *
 * The vendor table gives every partner one number, which is the right amount to
 * compare on and not enough to decide on: a quote is a rate and a margin on
 * every line, plus the charges that ride on the run, plus whatever the partner
 * attached and said. That belongs somewhere you go to deliberately, not in a
 * column, so it is a second sheet over the order.
 *
 * TWO MODES, ONE LAYOUT.
 *
 * `review` is a quote the partner sent: every figure is theirs, so nothing is
 * editable and the decision is the only thing on offer — Accept or Reject.
 *
 * `draft` is the broker writing one down on the partner's behalf, which is what
 * happens when the price was agreed on a call. The same cells, editable. There
 * is no Reject: you cannot turn down a quote you are still typing.
 *
 * THE CELLS ARE THE ORDER SHEET'S CELLS. Same `TableCellInput`, same A / B / C
 * lettering, same `TLC = A×(B+C)` in the header — a reader who has seen Vendor
 * Pricing downstairs has already learnt this table. It prices on REQUESTED
 * gallons, where Vendor Pricing prices on delivered: at quote time nothing has
 * been delivered, and a quote against a number that does not exist yet would be
 * a quote about nothing.
 */

/**
 * WHAT RIDES ON THE RUN AND NOT ON THE PRODUCT — which is freight alone.
 *
 * Fees and taxes used to be here beside it, one figure each for the whole
 * quote. They are charged on what is in the tank, so they moved onto the lines
 * as (D) and (E) and a quote can now say that the tax on the dyed diesel is
 * not the tax on the DEF next to it. Freight stays: it is the truck, not the
 * cargo. (Pavan, 2026-09-22.)
 */
const ORDER_CHARGES = [
  { key: "freight", label: "Freight" },
] as const satisfies readonly {
  key: keyof Pick<VendorQuote, "freight">;
  label: string;
}[];

/** One helper, app-wide — `MONEY` in `../data`. */
const money = MONEY;

const num = (v: string) => {
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** A stand-in for what the partner attached. Read-only in `review`. */
export interface QuoteAttachment {
  name: string;
}

export function VendorQuoteSheet({
  open,
  onOpenChange,
  vendorName,
  mode,
  lines,
  quote,
  onQuoteChange,
  /**
   * Whether the partner is supplying the product as well as hauling it — the
   * order sheet's `chargesBase`. With a load order the product is already the
   * broker's, so the base price is struck and only the run's charges stand.
   */
  chargesBase = true,
  notes,
  onNotesChange,
  attachments = [],
  onAccept,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
  mode: "review" | "draft";
  lines: OrderLine[];
  quote: VendorQuote | null;
  onQuoteChange?: (next: VendorQuote) => void;
  chargesBase?: boolean;
  notes?: string;
  onNotesChange?: (v: string) => void;
  attachments?: QuoteAttachment[];
  onAccept: () => void;
  onReject?: () => void;
}) {
  const editable = mode === "draft";

  /** Every line the order has, with the partner's price on it where there is one. */
  const priced = lines.map((l) => ({
    line: l,
    ql: quote?.lines.find((x) => x.asset === l.asset) ?? null,
  }));

  const total = quote ? quoteTotal(quote, lines, chargesBase) : 0;

  const putLine = (asset: string, patch: Partial<QuoteLine>) => {
    if (!quote || !onQuoteChange) return;
    const has = quote.lines.some((x) => x.asset === asset);
    onQuoteChange({
      ...quote,
      lines: has
        ? quote.lines.map((x) => (x.asset === asset ? { ...x, ...patch } : x))
        : [...quote.lines, { asset, ratePerGal: 0, rates: {}, ...patch }],
    });
  };

  const putCharge = (key: (typeof ORDER_CHARGES)[number]["key"], v: number) => {
    if (!quote || !onQuoteChange) return;
    onQuoteChange({ ...quote, [key]: v });
  };

  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): pricing table = asset name,
         product pick, four figures (req. gal, rate, adds, TLC). */
      fit={{ tables: [[CELL.name, CELL.pick, CELL.number, CELL.number, CELL.number, CELL.number]] }}
      /* OVER THE ORDER SHEET — see `level` on `RecordSheet`. */
      level={2}
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      editTitle={`${vendorName} · Pricing`}
      createTitle={`${vendorName} · Pricing`}
      createAction="Accept"
      showCancel={false}
      footerAside={
        <span className="text-sm text-foreground">
          <span className="text-muted-foreground">Total landing cost</span>{" "}
          <span className="font-medium tabular-nums">{money(total)}</span>
        </span>
      }
      /* REJECT IS ONLY A REVIEW'S BUSINESS. You cannot turn down a quote you
         are still typing, so `draft` gets Accept alone. */
      /* THE TWO ANSWERS, COLOURED AS ANSWERS.
         
         This pair is the one place in the product where a decision is the whole
         of the screen — the sheet exists to be said yes or no to — so the two
         buttons carry the outcome rather than the usual primary/secondary
         weight. Accept fills green; Reject stays outlined and takes the
         destructive colour on its label and rim only, which is the DS's rule
         for a destructive act (`docs/ds/ui/2-rules.md` §9).
         
         IT USES THE STATUS TOKEN, not a raw green: `--status-success` with its
         own foreground. NOTE FOR THE DS — §9 reserves fills for brand and gives
         status colours no usage rule, so this is the first fill outside that.
         The rule needs amending or this pair needs a token of its own. */
      footerPrimary={
        <div className="flex items-center gap-3">
          {mode === "review" && onReject && (
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={onReject}
            >
              <X /> Reject
            </Button>
          )}
          <Button
            className="bg-status-success text-status-success-foreground hover:bg-status-success/90"
            onClick={onAccept}
          >
            <Check /> Accept
          </Button>
        </div>
      }
      onSubmit={onAccept}
    >
      <SheetSection title="Pricing" flush>
        <table className="w-full table-fixed border-collapse">
          {/* EIGHT COLUMNS, NOT SIX. The partner's fee and tax are per gallon
              and per product now, so they are cells on the row like the rate
              and the margin beside them — and the four narrow money columns
              are all one width, because they hold the same kind of figure. */}
          <colgroup>
            <col />
            <col className="w-[22%]" />
            <col className="w-[112px]" />
            <col className="w-[128px]" />
            <col className="w-[128px]" />
            <col className="w-[144px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-fp-table-header">
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Asset name</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Product</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Req. gal (A)</TableRequiredLabel>
              </th>
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Rate/gal (B)</TableRequiredLabel>
              </th>
              {/* ONE COLUMN FOR EVERYTHING ON TOP OF THE RATE, and it is read
                  back rather than typed (Pavan, 2026-09-22). A product can
                  carry several margins, several taxes and several fees now, so
                  three fixed columns could hold the first of each and nothing
                  after it. They are typed where they are compared — the order
                  sheet's Pricing unit, which lays the partner's figure beside
                  the broker's row for row. */}
              <th className="px-3 py-2.5 text-left">
                <TableRequiredLabel>Adds/gal (C)</TableRequiredLabel>
              </th>
              <th
                className="px-3 py-2.5 text-left"
                title="Total landing cost — requested gallons x (rate + everything added)"
              >
                <TableRequiredLabel>TLC A×(B+C)</TableRequiredLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {priced.map(({ line, ql }, i) => (
              <tr key={i} className="h-12 border-b border-border">
                <td className="truncate px-3 text-sm text-foreground">
                  {line.asset || "—"}
                </td>
                <td className="truncate px-3 text-sm text-muted-foreground">
                  {line.product}
                </td>
                <td className="px-3 text-sm tabular-nums text-muted-foreground">
                  {line.topOff ? "Top off" : billableGal(line).toLocaleString()}
                </td>
                {editable ? (
                  <>
                    <td className="relative p-0">
                      <TableCellInput
                        value={ql ? String(ql.ratePerGal) : ""}
                        placeholder="0.000"
                        numeric
                        prefix="$"
                        aria-label={`Rate per gallon for line ${i + 1}`}
                        onChange={(v) =>
                          putLine(line.asset, { ratePerGal: num(v) })
                        }
                      />
                    </td>
                    <td className="px-3 text-sm tabular-nums text-muted-foreground">
                      {ql
                        ? `$${quoteLineChargeRate(ql, line).toFixed(4)}`
                        : "—"}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 text-sm tabular-nums text-muted-foreground">
                      {ql ? `$${ql.ratePerGal.toFixed(4)}` : "—"}
                    </td>
                    <td className="px-3 text-sm tabular-nums text-muted-foreground">
                      {ql
                        ? `$${quoteLineChargeRate(ql, line).toFixed(4)}`
                        : "—"}
                    </td>
                  </>
                )}
                <td className="px-3 text-sm font-medium tabular-nums text-foreground">
                  {ql ? money(quoteLineTotal(ql, line)) : money(0)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* WHAT RIDES ON THE RUN, THEN THE TOTAL.

              NO BASE-PRICE ROW. It was the sum of the TLC column directly
              above it — the same figure twice, one line apart, with the second
              one named something the first is not called. The lines add up in
              plain sight; a subtotal of three rows you can already see is a row
              that only makes the reader check the addition. */}
          <tfoot>
            {ORDER_CHARGES.map((c) => (
              <tr key={c.key} className="h-11 border-b border-border">
                <td colSpan={5} className="px-3 text-sm text-muted-foreground">
                  {c.label}
                </td>
                {editable ? (
                  <td className="relative p-0">
                    <TableCellInput
                      value={quote ? String(quote[c.key]) : ""}
                      placeholder="0"
                      numeric
                      prefix="$"
                      aria-label={c.label}
                      onChange={(v) => putCharge(c.key, num(v))}
                    />
                  </td>
                ) : (
                  <td className="px-3 text-sm tabular-nums text-muted-foreground">
                    {money(quote ? quote[c.key] : 0)}
                  </td>
                )}
              </tr>
            ))}
            <tr className="h-12">
              <td colSpan={5} className="px-3 text-sm font-medium text-foreground">
                Total landing cost
              </td>
              <td className="px-3 text-sm font-semibold tabular-nums text-foreground">
                {money(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </SheetSection>

      {/* WHAT THEY SENT WITH IT. A quote arrives with a rate sheet or a signed
          agreement behind it as often as not, and the broker accepting the
          price is the person who has to have read them.

          NOTHING EXTRA IS ONE FACT, NOT TWO. Most quotes are numbers alone, and
          two headed sections each reporting their own absence took a third of
          the sheet to say the partner sent nothing else. One line says it. The
          sections come back the moment either has something in it, and in
          `draft` they are always there — they are fields to fill. */}
      {!editable && attachments.length === 0 && !notes?.trim() ? (
        <p className="text-sm text-muted-foreground">
          Vendor has not added additional supporting docs or notes.
        </p>
      ) : (
        /* ONE GROUP, NOT TWO. A rate sheet and the sentence explaining it are
           the same thing — everything the partner sent WITH the price — and
           two headed cards said that twice, at the cost of a second heading
           and 40px of gap between two halves of one thought. */
        <SheetSection title="Supporting documents and notes">
          {editable ? (
            <FileUpload variant="field" label="Attach a document" note="" />
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents attached
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-3">
              {attachments.map((a) => (
                <li
                  key={a.name}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm text-foreground">
                    {a.name}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {editable ? (
            <Textarea
              value={notes ?? ""}
              onChange={(e) => onNotesChange?.(e.target.value)}
              placeholder="Anything the price depends on — a wait-time cap, a fuel index, a date it expires."
              className="min-h-24"
            />
          ) : notes?.trim() ? (
            <p className="text-sm text-foreground">{notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No note</p>
          )}
        </SheetSection>
      )}
    </RecordSheet>
  );
}
