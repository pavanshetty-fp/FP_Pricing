import * as React from "react";
import { toast } from "sonner";
import { FileText, MapPin, Receipt, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusChip } from "@/components/ui/status-chip";
import { SheetSection } from "@/components/side-sheet/parts";
import { RecordSheet } from "../RecordSheet";
import { ActivityCard, RailCard, RailRow, SheetRail, type TimelineEntry } from "../SheetCards";
import { kindTone } from "../statusKind";
import { fmtDateTime, plural, shiptoOf } from "./changeLog";
import { useChangeLog } from "./changeLogStore";
import { feesOnOrder, rateFor, setOrderFee, setOrderStatus, syncOwn, useFees, useHubMap, type Fee, type OrderFee } from "./fees";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ORDER_STATUS_KIND, buildOrders, money2, orderFactsOf, orderLabel, type FeeComponents, type OrderStatus, type PricedOrder } from "./orderTrace";

/*
  ORDER DETAILS, FOR THE FEE DEMO (Yash, 2026-11-24) — after the earlier
  mock's delivery order (Order-Pricing.html): the ticket, delivery and
  shipment cards, the assets, then Billing details — product-level charges,
  order-level charges (fees and taxes), Applicable items (the review fees,
  with Review & apply fees), and the grand total. History on the right.
*/

/** Orders priced with the fee engine — charged fees and applied review fees
 *  in the price; the rest wait on the order. */
export function useFeeOrders(): PricedOrder[] {
  const log = useChangeLog();
  syncOwn(log.rows);
  const store = useFees();
  const hub = useHubMap(log.rows, log.entityMap);
  const feesFor = React.useCallback<FeeComponents>(
    (id, row, facts) =>
      feesOnOrder(id, row, hub(row.shiptoId), facts, store)
        .filter((x) => (x.state === "charged" || x.state === "applied") && x.amount !== null)
        .map((x) => ({
          key: `fee-${x.fee.id}`,
          group: "Fee" as const,
          name: x.fee.name,
          how: x.why,
          perGal: (x.amount ?? 0) / Math.max(1, facts.deliveredGallons ?? facts.orderedGallons),
          amount: x.amount ?? 0,
          history: [],
        })),
    [store, hub]
  );
  const statusFor = React.useCallback((id: string) => store.orderStatus[id], [store.orderStatus]);
  return React.useMemo(
    () => buildOrders(log.changes, log.rows, log.entityMap, feesFor, statusFor),
    [log.changes, log.rows, log.entityMap, feesFor, statusFor]
  );
}

const TH = "px-3 py-2.5 text-left text-sm font-medium";
const THR = "px-3 py-2.5 text-right text-sm font-medium";

/** How many units a fee charges on this order, and at what rate. */
function qtyRate(f: Fee, o: PricedOrder, amount: number | null): { qty: string; rate: string } {
  const a = f.amount;
  const hours = Math.ceil(o.minutesOnSite / 60);
  const units = a.per === "gallon" ? o.gallons : a.per === "asset" ? o.assets : a.per === "hour" ? hours : a.per === "mile" ? o.miles : 1;
  const unit = a.per === "gallon" ? "gal" : a.per === "asset" ? "assets" : a.per === "hour" ? "hr" : a.per === "mile" ? "mi" : "nos";
  if (a.unit === "%") return { qty: "—", rate: `${a.rate}%` };
  const rate = a.kind === "flat" ? rateFor(a, o.vendor) : amount !== null && units ? amount / units : null;
  const fmt = (n: number) => (a.per === "gallon" ? `$${n.toFixed(4)}/gal` : money2(n));
  return { qty: `${units.toLocaleString()} ${unit}`, rate: rate === null ? "—" : fmt(rate) };
}

export function OrderDetailsSheet({ order: o, onClose, level }: { order: PricedOrder | null; onClose: () => void; level?: 1 | 2 }) {
  const log = useChangeLog();
  const store = useFees();
  const hub = useHubMap(log.rows, log.entityMap);
  const [reviewing, setReviewing] = React.useState(false);
  if (!o) return null;
  const row = log.rows.find((r) => r.id === o.rowId);
  const n = orderLabel(o);
  const scheduled = o.status === "Scheduled";
  const fees = row ? feesOnOrder(o.id, row, hub(row.shiptoId), orderFactsOf(o), store) : [];
  const billed = fees.filter((x) => x.state === "charged" || x.state === "applied" || x.state === "pending");
  const toReview = fees.filter((x) => x.state === "offered");
  const sum = (keep: (g: string) => boolean) => o.components.filter((c) => keep(c.group)).reduce((t, c) => t + c.amount, 0);
  const productTotal = sum((g) => g !== "Fee" && g !== "Tax");
  const taxes = o.components.filter((c) => c.group === "Tax");
  const orderLevel = billed.reduce((t, x) => t + (x.amount ?? 0), 0) + taxes.reduce((t, c) => t + c.amount, 0);
  const apply = (xs: OrderFee[]) => {
    xs.forEach((x) => setOrderFee(o.id, x.fee.id, true));
    toast.success(xs.length === 1 ? `${xs[0].fee.name} applied` : `${plural(xs.length, "fee")} applied`);
  };
  /* THE ASSETS FILLED — one row per asset, the gallons shared out. */
  const assets = o.assets
    ? Array.from({ length: o.assets }, (_, i) => ({ name: `${o.assetTypes[0] ?? "Asset"} ${i + 1}`, gal: Math.round(o.gallons / o.assets) }))
    : [{ name: "Tank 1", gal: o.gallons }];
  const history: TimelineEntry[] = [
    { at: new Date(o.placedAt).toISOString(), by: "Dispatch", changes: ["Order placed"] },
    ...(!scheduled ? [{ at: new Date(o.deliveredAt).toISOString(), by: "Driver", changes: ["Delivered"] }] : []),
    ...Object.values(store.audit)
      .flat()
      .filter((a) => a.change.includes(o.id))
      .map((a) => ({ at: new Date(a.at).toISOString(), by: a.by, changes: [a.change.replace(` on order ${o.id}`, "").replace(` · order ${o.id}`, "").replace(` order ${o.id}`, "")] })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <RecordSheet
      size="full"
      level={level}
      open
      onOpenChange={(v) => !v && onClose()}
      mode="edit"
      editTitle={`Delivery order ${o.id}`}
      createTitle=""
      createAction=""
      showCancel={false}
      stepNav={false}
      noFooter
      headerAside={
        /* STATUS BY HAND, FOR THE DEMO (Yash, 2026-11-24) — move the order
           along and watch its fees change. */
        <Select value={o.status} onValueChange={(v) => setOrderStatus(o.id, v as OrderStatus)}>
          <SelectTrigger size="sm" className="h-7 w-auto gap-1.5 border-0 bg-transparent px-0 shadow-none" aria-label="Order status">
            <StatusChip tone={kindTone(ORDER_STATUS_KIND[o.status])} variant="soft">
              {o.status}
            </StatusChip>
          </SelectTrigger>
          <SelectContent>
            {(["Scheduled", "Delivered", "Invoiced"] as OrderStatus[]).map((st) => (
              <SelectItem key={st} value={st}>
                {st}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {n.customer} | {n.shipto}
        </span>
      }
      onSubmit={onClose}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]">
        <div className="flex min-w-0 flex-col gap-10">
          <div className="grid gap-4 md:grid-cols-3">
            <RailCard title="Delivery ticket" icon={<FileText />}>
              <dl className="flex flex-col py-1">
                <RailRow label="Order no." value={o.id} />
                <RailRow label="Invoice" value={o.invoice ?? "—"} />
                <RailRow label="Vendor" value={o.vendor ?? "First party"} />
                <RailRow label="Order type" value={o.orderType} />
              </dl>
            </RailCard>
            <RailCard title="Delivery details" icon={<Truck />}>
              <dl className="flex flex-col py-1">
                <RailRow label="Hub" value={row ? hub(row.shiptoId) : "—"} />
                <RailRow label="Ordered" value={fmtDateTime(o.placedAt)} />
                <RailRow label={scheduled ? "Planned" : "Delivered"} value={fmtDateTime(o.deliveredAt)} />
                <RailRow label="Time on site" value={scheduled ? "—" : `${o.minutesOnSite} min`} />
              </dl>
            </RailCard>
            <RailCard title="Shipment details" icon={<MapPin />}>
              <dl className="flex flex-col py-1">
                <RailRow label="Ship-to" value={shiptoOf(o.shiptoId).address.split(", ").slice(-2).join(", ")} />
                <RailRow label="Distance" value={`${o.miles} mi`} />
                <RailRow label="Rate type" value={o.rateType} />
                <RailRow label="Market" value={o.market} />
              </dl>
            </RailCard>
          </div>

          <SheetSection title="Assets" flush>
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th className={TH}>Asset</th>
                  <th className={TH}>Product</th>
                  <th className={TH}>Status</th>
                  <th className={THR}>Ordered (gal)</th>
                  <th className={THR}>Delivered (gal)</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.name} className="h-11 border-b border-border last:border-b-0">
                    <td className="px-3">{a.name}</td>
                    <td className="px-3">{n.product}</td>
                    <td className="px-3">{scheduled ? "Scheduled" : "Completed"}</td>
                    <td className="px-3 text-right tabular-nums">{a.gal.toLocaleString()}</td>
                    <td className="px-3 text-right tabular-nums">{scheduled ? "—" : a.gal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SheetSection>

          <SheetSection title="Billing details" flush>
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 180 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-fp-table-header">
                  <th className={TH}>Charge</th>
                  <th className={TH}>Quantity</th>
                  <th className={TH}>Rate</th>
                  <th className={THR}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-11 border-b border-border bg-muted/40">
                  <td colSpan={3} className="px-3 font-medium">
                    Product level charges
                  </td>
                  <td className="px-3 text-right font-medium tabular-nums">{money2(productTotal)}</td>
                </tr>
                <tr className="h-11 border-b border-border">
                  <td className="px-3">{n.product}</td>
                  <td className="px-3 tabular-nums">{o.gallons.toLocaleString()} gal</td>
                  <td className="px-3 tabular-nums">${(productTotal / o.gallons).toFixed(4)}/gal</td>
                  <td className="px-3 text-right tabular-nums">{money2(productTotal)}</td>
                </tr>
                <tr className="h-11 border-b border-border bg-muted/40">
                  <td colSpan={3} className="px-3 font-medium">
                    Order level charges <span className="font-normal text-muted-foreground">· Fees & order tax</span>
                  </td>
                  <td className="px-3 text-right font-medium tabular-nums">{money2(orderLevel)}</td>
                </tr>
                {billed.map((x) => {
                  const qr = qtyRate(x.fee, o, x.amount);
                  return (
                    <tr key={x.fee.id} className="h-12 border-b border-border">
                      <td className="px-3 py-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">Fee · {x.fee.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{x.state === "applied" ? "Applied on review" : x.why}</span>
                          </span>
                          {x.state === "applied" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Take ${x.fee.name} off`}
                              title="Take off"
                              onClick={() => {
                                setOrderFee(o.id, x.fee.id, false);
                                toast.success(`${x.fee.name} taken off`);
                              }}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </span>
                      </td>
                      <td className="px-3 tabular-nums">{qr.qty}</td>
                      <td className="px-3 tabular-nums">{qr.rate}</td>
                      <td className="px-3 text-right tabular-nums">{x.amount === null ? <span className="text-muted-foreground">On delivery</span> : money2(x.amount)}</td>
                    </tr>
                  );
                })}
                {taxes.map((c) => (
                  <tr key={c.key} className="h-12 border-b border-border">
                    <td className="px-3">Tax · {c.name}</td>
                    <td className="px-3 tabular-nums">{o.gallons.toLocaleString()} gal</td>
                    <td className="px-3 tabular-nums">${c.perGal.toFixed(4)}/gal</td>
                    <td className="px-3 text-right tabular-nums">{money2(c.amount)}</td>
                  </tr>
                ))}
                <tr className="h-11 border-b border-border bg-muted/40">
                  <td colSpan={4} className="px-3 font-medium">
                    Applicable items
                  </td>
                </tr>
                <tr className="h-14 border-b border-border">
                  <td className="px-3">Fees</td>
                  <td colSpan={2} className="px-3 text-muted-foreground">
                    {toReview.length ? plural(toReview.length, "applicable fee") : "No fees to review"}
                  </td>
                  <td className="px-3 text-right">
                    {toReview.length === 1 ? (
                      <Button size="sm" variant="outline" onClick={() => apply(toReview)}>
                        Apply
                      </Button>
                    ) : toReview.length > 1 ? (
                      <Button size="sm" variant="outline" onClick={() => setReviewing(true)}>
                        Review & apply fees
                      </Button>
                    ) : null}
                  </td>
                </tr>
                <tr className="h-12">
                  <td colSpan={3} className="px-3 text-base font-semibold">
                    {scheduled ? "Estimated total" : "Grand total"}
                  </td>
                  <td className="px-3 text-right text-base font-semibold tabular-nums">{money2(productTotal + orderLevel)}</td>
                </tr>
              </tbody>
            </table>
          </SheetSection>
        </div>

        <SheetRail>
          <RailCard title="Billing" icon={<Receipt />}>
            <dl className="flex flex-col py-1">
              <RailRow label="Product" value={money2(productTotal)} />
              <RailRow label="Fees & taxes" value={money2(orderLevel)} />
              <RailRow label="To review" value={plural(toReview.length, "fee")} />
            </dl>
          </RailCard>
          <ActivityCard title="History" entries={history} />
        </SheetRail>
      </div>
      <ApplyFeesDialog open={reviewing} fees={toReview} order={o} onClose={() => setReviewing(false)} onApply={apply} />
    </RecordSheet>
  );
}

/** APPLY FEES (the earlier mock's dialog) — every offered fee, ticked; the
 *  total follows the ticks; Apply selected adds them to the order. */
function ApplyFeesDialog({
  open,
  fees,
  order: o,
  onClose,
  onApply,
}: {
  open: boolean;
  fees: OrderFee[];
  order: PricedOrder;
  onClose: () => void;
  onApply: (xs: OrderFee[]) => void;
}) {
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    if (open) setPicked(new Set(fees.map((x) => x.fee.id)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = fees.filter((x) => picked.has(x.fee.id));
  const total = chosen.reduce((t, x) => t + (x.amount ?? 0), 0);
  const pending = chosen.some((x) => x.amount === null);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply fees</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col divide-y divide-border">
          {fees.map((x) => (
            <li key={x.fee.id} className="flex items-center gap-3 py-3">
              <Checkbox
                id={`apply-${o.id}-${x.fee.id}`}
                checked={picked.has(x.fee.id)}
                onCheckedChange={(v) =>
                  setPicked((s) => {
                    const n = new Set(s);
                    if (v) n.add(x.fee.id);
                    else n.delete(x.fee.id);
                    return n;
                  })
                }
              />
              <label htmlFor={`apply-${o.id}-${x.fee.id}`} className="flex-1 text-sm">
                {x.fee.name}
              </label>
              <span className="text-sm tabular-nums">{x.amount === null ? "On delivery" : money2(x.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
          <span>Total ({chosen.length} selected)</span>
          <span className="tabular-nums">
            {money2(total)}
            {pending && " + on delivery"}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!chosen.length}
            onClick={() => {
              onApply(chosen);
              onClose();
            }}
          >
            Apply selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
