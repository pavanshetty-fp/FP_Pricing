import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordSheet } from "../RecordSheet";
import { RailCard, RailRow } from "../SheetCards";
import { kindTone } from "../statusKind";
import { FIGURE_STRIP, Figure } from "../masterdata/sheetParts";
import { attend } from "../PendingStrip";
import { fmtDateTime, fmtWhen, plural } from "./changeLog";
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
          <StatusChip tone={kindTone(ORDER_STATUS_KIND[o.status])} variant="soft">
            {o.status}
          </StatusChip>
        }
        headerSubtitle={
          <span className="text-sm text-muted-foreground">
            {[o.invoice ? `Invoice ${o.invoice}` : "Not invoiced", n.customer, n.shipto, n.product].join(" · ")}
          </span>
        }
        onSubmit={onClose}
      >
        <div className={FIGURE_STRIP}>
          <Figure label="Gallons delivered" value={o.gallons.toLocaleString()} note={`Delivered ${fmtWhen(o.deliveredAt)}`} />
          <Figure label="Price ($/gal)" value={money3(o.perGal)} note={`${o.rateType} · ${o.market}`} />
          <Figure label="Total" value={money2(o.total)} note={o.invoice ? `Invoice ${o.invoice}` : "Not invoiced"} />
          <Figure
            label="Changed after order"
            value={o.appliedAfterOrder.toLocaleString()}
            note={o.appliedAfterOrder ? "Applied to this order" : "None"}
            onOpen={o.appliedAfterOrder ? showLate : undefined}
            openLabel="View changes"
          />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
          <section id="trace-price" className="min-w-0 scroll-mt-4 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={HEAD}>Component</TableHead>
                  <TableHead className={HEAD}>Applied</TableHead>
                  <TableHead className={HEAD}>How it was calculated</TableHead>
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
                        <TableCell className="px-3 font-medium">{c.name}</TableCell>
                        <TableCell className="px-3 whitespace-normal text-muted-foreground">{c.how}</TableCell>
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
                              <span className="pl-6 text-xs text-muted-foreground tabular-nums">{fmtDateTime(h.at)}</span>
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-normal" colSpan={2}>
                              {h.what} <span className="text-muted-foreground">· {h.changeId}</span>
                            </TableCell>
                            <TableCell className="px-3 text-sm text-muted-foreground" colSpan={2}>
                              {h.by}
                            </TableCell>
                            <TableCell className="px-3">
                              <Pill kind={PHASE_KIND[h.phase]}>{PHASE_LABEL[h.phase]}</Pill>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
                {/* A TOTAL ROW DRAWS border-t ONLY (record sheet rule 26). */}
                <TableRow className="border-t border-border hover:bg-transparent">
                  <TableCell className="px-3 font-semibold" colSpan={3}>
                    Total
                  </TableCell>
                  <TableCell className="px-3 font-semibold tabular-nums">{money3(o.perGal)}</TableCell>
                  <TableCell className="px-3 font-semibold tabular-nums">{money2(o.total)}</TableCell>
                  <TableCell className="px-3 text-muted-foreground">{o.invoice ? `Matches ${o.invoice}` : "Not invoiced"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-0">
            <RailCard title="Details">
              <dl className="flex flex-col py-1">
                <RailRow label="Ordered" value={fmtDateTime(o.placedAt)} />
                <RailRow label="Delivered" value={fmtDateTime(o.deliveredAt)} />
                <RailRow label="Invoiced" value={o.invoicedAt ? fmtDateTime(o.invoicedAt) : "—"} />
                <RailRow label="Priced at" value="Delivery" />
                <RailRow label="Rate type" value={o.rateType} />
                <RailRow label="Market" value={o.market} />
                <RailRow label="Customer" value={n.customer} />
                <RailRow label="Ship-to" value={n.shipto} />
                <RailRow label="Product" value={n.product} />
              </dl>
            </RailCard>
          </div>
        </div>
      </RecordSheet>
      <ChangeSheet id={changeId} onClose={() => setChangeId(null)} onOpen={setChangeId} level={2} />
    </>
  );
}
