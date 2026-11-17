import * as React from "react";
import { ChevronRight, History, Tag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordSheet } from "../RecordSheet";
import { RailCard, RailRow } from "../SheetCards";
import { kindTone } from "../statusKind";
import { FIGURE_STRIP, Figure } from "../masterdata/sheetParts";
import { attend } from "../PendingStrip";
import { fmtDateTime, plural, productOf, shiptoOf } from "./changeLog";
import { ChangeSheet } from "./ChangeSheet";
import { ORDER_STATUS_KIND, PHASE_LABEL, money2, money3, orderLabel, type Phase, type PricedOrder } from "./orderTrace";

/*
  AN ORDER'S PRICE, TRACED (Yash, 2026-11-16) — the prototype's trace on the
  record sheet: the figures across the top; the price, one row per component
  (what was applied, how it was calculated, $/gal, amount) with its history
  one layer down (UX-54: the chevron leads the first cell); the total; and on
  the right the order's facts and the invoice. A change in the history opens
  over the trace. Read-only — no footer (rule 28).

  The phase of a change against this order: before it was placed; after it
  was placed and by delivery — it priced this order (caution, the one to
  look at); after delivery — it did not.
*/

const PHASE_KIND: Record<Phase, "neutral" | "caution"> = { before: "neutral", applied: "caution", after: "neutral" };
const HEAD = "px-3 text-xs";
/** A change's stamp in the narrow first column — "Nov 10, 2:15 PM", one line. */
const fmtStamp = (t: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(t);

/** A record this one belongs to — label above, a muted detail after "·". */
export function Linked({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm text-foreground">
        {value}
        {detail && <span className="text-muted-foreground"> · {detail}</span>}
      </dd>
    </div>
  );
}

export function OrderTraceSheet({ order: o, onClose }: { order: PricedOrder | null; onClose: () => void }) {
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [changeId, setChangeId] = React.useState<string | null>(null);
  React.useEffect(() => setOpen(new Set()), [o?.id]);
  if (!o) return null;
  const n = orderLabel(o);
  const toggle = (k: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  /* "Changed after order" opens every component a late change reached, then
     brings the price into view and blinks it. */
  /* $/gal by component group, and its share of the price. */
  const part = (g: string) => o.components.filter((c) => c.group === g).reduce((t, c) => t + c.perGal, 0);
  const pct = (v: number) => `${Math.round((v / o.perGal) * 100)}%`;
  const showLate = () => {
    setOpen(new Set(o.components.filter((c) => c.history.some((h) => h.phase === "applied")).map((c) => c.key)));
    attend("trace-price");
  };

  return (
    <>
      <RecordSheet
        size="full"
        open
        onOpenChange={(v) => !v && onClose()}
        mode="edit"
        editTitle={`Order ${o.id}`}
        createTitle=""
        createAction=""
        showCancel={false}
        stepNav={false}
        noFooter
        headerAside={
          <span className="flex items-center gap-1.5">
            <StatusChip tone={kindTone(ORDER_STATUS_KIND[o.status])} variant="soft">
              {o.status}
            </StatusChip>
            {/* A LATE CHANGE IS A FLAG, NOT A FIGURE (Yash, 2026-11-16): most
                orders have none, so a "0" figure spent a slot on nothing. It
                shows only when it happened; pressing it opens those rows. */}
            {o.appliedAfterOrder > 0 && (
              <button type="button" onClick={showLate} className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <Pill kind="caution">{plural(o.appliedAfterOrder, "change")} after order</Pill>
              </button>
            )}
          </span>
        }
        headerSubtitle={<span className="text-sm text-muted-foreground">{o.invoice ? `Invoice ${o.invoice}` : "Not invoiced"}</span>}
        onSubmit={onClose}
      >
        {/* WHAT MADE THE PRICE (Yash, 2026-11-16) — the total, then the price
            per gallon taken apart: the market's base, the margin on top, the
            fees and taxes. Read-only (Yash, 2026-11-16). */}
        <div className={FIGURE_STRIP}>
          <Figure label="Total" value={money2(o.total)} note={`${o.gallons.toLocaleString()} gal · ${money3(o.perGal)}/gal`} />
          <Figure
            label="Base price ($/gal)"
            value={money3(part("Base price"))}
            note={`${o.rateType} · ${o.market}`}
          />
          <Figure
            label="Margin ($/gal)"
            value={money3(part("Margin") + part("Adder") + part("Discount"))}
            note={`${pct(part("Margin") + part("Adder") + part("Discount"))} of the price`}
          />
          <Figure
            label="Fees & taxes ($/gal)"
            value={money3(part("Fee") + part("Tax"))}
            note={`${pct(part("Fee") + part("Tax"))} of the price`}
          />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
          <section id="trace-price" className="min-w-0 scroll-mt-4 overflow-hidden rounded-lg border border-border">
            {/* FIXED COLUMNS (Yash, 2026-11-16) — the widths are set once, so
                opening a component's history never moves a column. What was
                applied and how it was calculated share one column, the name
                over its working (the list's two-line cell), so the working
                gets the width instead of a narrow column of its own. */}
            <Table className="table-fixed">
              <colgroup>
                <col style={{ width: 132 }} />
                <col />
                <col style={{ width: 96 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 216 }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={HEAD}>Component</TableHead>
                  <TableHead className={HEAD}>Applied · how it was calculated</TableHead>
                  <TableHead className={HEAD}>$/gal</TableHead>
                  <TableHead className={HEAD}>Amount</TableHead>
                  <TableHead className={HEAD}>History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.components.map((c) => {
                  const isOpen = open.has(c.key);
                  const late = c.history.some((h) => h.phase === "applied");
                  return (
                    <React.Fragment key={c.key}>
                      <TableRow
                        className={cn(c.history.length ? "cursor-pointer" : "hover:bg-transparent")}
                        data-expanded={isOpen || undefined}
                        onClick={c.history.length ? () => toggle(c.key) : undefined}
                      >
                        <TableCell className={cn("px-3", isOpen && "relative before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-status-success/70")}>
                          <span className="flex items-center gap-1.5">
                            {c.history.length > 0 ? (
                              <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                            ) : (
                              <span className="size-4 shrink-0" />
                            )}
                            <span className="text-muted-foreground">{c.group}</span>
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 whitespace-normal">
                          <span className="flex min-w-0 flex-col">
                            <span className="font-medium text-foreground">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.how}</span>
                          </span>
                        </TableCell>
                        <TableCell className="px-3 tabular-nums">{money3(c.perGal)}</TableCell>
                        <TableCell className="px-3 tabular-nums">{money2(c.amount)}</TableCell>
                        <TableCell className="px-3">
                          {c.history.length ? (
                            <span className="flex items-center gap-1.5">
                              {plural(c.history.length, "change")}
                              {late && <Pill kind="caution">After order</Pill>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No changes</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen &&
                        c.history.map((h) => (
                          <TableRow key={`${c.key}-${h.changeId}-${h.at}`} className="cursor-pointer" onClick={() => setChangeId(h.changeId)}>
                            <TableCell className="relative px-3 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-status-success/70">
                              <span className="block pl-6 text-xs text-muted-foreground tabular-nums">{fmtStamp(h.at)}</span>
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-normal">
                              {h.what}
                            </TableCell>
                            <TableCell className="px-3 text-sm text-muted-foreground" colSpan={2}>
                              {h.by}
                            </TableCell>
                            <TableCell className="px-3">
                              <Pill kind={PHASE_KIND[h.phase]} className="max-w-full">{PHASE_LABEL[h.phase]}</Pill>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
                {/* A TOTAL ROW DRAWS border-t ONLY (record sheet rule 26). */}
                <TableRow className="border-t border-border hover:bg-transparent">
                  <TableCell className="px-3 font-semibold" colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className="px-3 font-semibold tabular-nums">{money3(o.perGal)}</TableCell>
                  <TableCell className="px-3 font-semibold tabular-nums">{money2(o.total)}</TableCell>
                  <TableCell className="px-3 text-muted-foreground">{o.invoice ? `Matches ${o.invoice}` : "Not invoiced"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          {/* THE RIGHT COLUMN, AS EVERY RECORD SHEET HAS IT (Yash, 2026-11-16):
              a card per subject, each titled with its icon. The order's own
              facts read label · value on one line; the records it belongs to
              are Associated records, label above, a detail after "·" (3PL's
              order sheet). */}
          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">
            {/* WHO AND WHAT FIRST (Yash, 2026-11-16) — the customer, ship-to
                and product lead; the header keeps only the invoice. */}
            <RailCard title="Associated records" icon={<Users />}>
              <dl className="flex flex-col gap-3 px-4 py-3">
                <Linked label="Customer" value={n.customer} />
                <Linked label="Ship-to" value={n.shipto} detail={shiptoOf(o.shiptoId).address.split(", ").slice(-2).join(", ")} />
                <Linked label="Product" value={n.product} detail={productOf(o.productId).code} />
              </dl>
            </RailCard>
            <RailCard title="Record" icon={<History />}>
              <dl className="flex flex-col py-1">
                <RailRow label="Ordered" value={fmtDateTime(o.placedAt)} />
                <RailRow label="Delivered" value={fmtDateTime(o.deliveredAt)} />
                <RailRow label="Invoiced" value={o.invoicedAt ? fmtDateTime(o.invoicedAt) : "—"} />
                <RailRow label="Priced at" value="Delivery" />
              </dl>
            </RailCard>
            <RailCard title="Pricing" icon={<Tag />}>
              <dl className="flex flex-col py-1">
                <RailRow label="Rate type" value={o.rateType} />
                <RailRow label="Market" value={o.market} />
                <RailRow label="Gallons" value={o.gallons.toLocaleString()} />
              </dl>
            </RailCard>
          </div>
        </div>
      </RecordSheet>
      <ChangeSheet id={changeId} onClose={() => setChangeId(null)} onOpen={setChangeId} level={2} />
    </>
  );
}
