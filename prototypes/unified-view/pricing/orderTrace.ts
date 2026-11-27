import {
  DAY,
  IS_LIST,
  NOW,
  SETTING_LABEL,
  customerOf,
  productOf,
  shiptoOf,
  type ChangeRecord,
  type ConfigRow,
  type EntityMap,
  type ImpactLine,
  type Setting,
} from "./changeLog";
import type { StatusKind } from "../statusKind";
import { VENDORS as VENDOR_NAMES, type OrderFacts } from "./fees";

/*
  CHANGE LOG › ORDER PRICE TRACE — the data (Yash, 2026-11-16), after the
  "Order Price Trace" tab of pricing-change-log-prototype.html.

  An order is priced AT DELIVERY (assumed; to confirm with the PM). Its
  pricing is the ship-to's row as it stood then: each setting is taken back
  past every change made after delivery (the earliest such line's "before"),
  and an entity's value past every value edit made after it. Each component
  carries every change that touched it on this ship-to, tagged by when it
  landed against the order:
    before   — before the order was placed;
    applied  — after it was placed, by delivery: it priced this order;
    after    — after delivery: it did not.
  Delivered and invoiced orders only (open orders: to ask the PM).
*/

/** What an order's status asks of the reader (statusKind.ts): delivered is
 *  under way to billing; invoiced is done. */
export type OrderStatus = "Scheduled" | "Delivered" | "Invoiced";
/* SCHEDULED ORDERS (Yash, 2026-11-24) — fees show before delivery when they
   already apply on the planned facts; their amounts follow delivery. */
export const ORDER_STATUS_KIND: Record<OrderStatus, StatusKind> = { Scheduled: "neutral", Delivered: "info", Invoiced: "success" };

export type Phase = "before" | "applied" | "after";
export const PHASE_LABEL: Record<Phase, string> = {
  before: "Before order",
  applied: "After order placed · applied",
  after: "After delivery · not applied",
};

export interface TraceHistory {
  changeId: string;
  at: number;
  what: string;
  by: string;
  phase: Phase;
}

export interface TraceComponent {
  key: string;
  group: "Base price" | "Margin" | "Fee" | "Tax" | "Adder" | "Discount";
  name: string;
  how: string;
  perGal: number;
  amount: number;
  history: TraceHistory[];
}

export interface PricedOrder {
  id: string;
  invoice: string | null;
  rowId: string;
  customerId: string;
  shiptoId: string;
  productId: string;
  placedAt: number;
  deliveredAt: number;
  invoicedAt: number | null;
  status: OrderStatus;
  /** Ordered gallons until delivered; delivered gallons after. */
  gallons: number;
  /** The facts fees read — order type, assets, distance, time on site. */
  orderType: "Delivery" | "Extraction";
  assetTypes: string[];
  assets: number;
  miles: number;
  minutesOnSite: number;
  /** The 3PL vendor carrying it; null for first party. */
  vendor: string | null;
  rateType: string;
  market: string;
  components: TraceComponent[];
  total: number;
  perGal: number;
  /** Changes that landed between placing and delivery — they priced it. */
  appliedAfterOrder: number;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

const tookEffect = (c: ChangeRecord) => c.status === "applied" || c.status === "partlyFailed" || c.status === "undone";
const isValueEdit = (l: ImpactLine) => l.beforeIds[0] === l.afterIds[0] && l.before.includes(" · ");
const LIST_KEY = { margin: "margins", fee: "fees", tax: "taxes", adder: "adders" } as const;
const GROUP: Record<Setting, TraceComponent["group"]> = {
  margin: "Margin",
  fee: "Fee",
  tax: "Tax",
  adder: "Adder",
  rateType: "Base price",
  market: "Base price",
};
const sign = (n: number) => (n < 0 ? "−" : "");
const money3 = (n: number) => `${sign(n)}$${Math.abs(n).toFixed(3)}`;
const money2 = (n: number) => `${sign(n)}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (t: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(t);

/** A fee line on an order, as the trace prices it. */
export type FeeComponents = (orderId: string, row: ConfigRow, facts: OrderFacts) => TraceComponent[];

const ASSETS = ["Truck", "Trailer", "Generator", "Excavator", "Light tower", "Tank"];

export function buildOrders(
  changes: ChangeRecord[],
  rows: ConfigRow[],
  ents: EntityMap,
  feesFor?: FeeComponents,
  /** A status set by hand for the demo (Order well), by order id. */
  statusFor?: (id: string) => OrderStatus | undefined
): PricedOrder[] {
  /* Every line that took effect, by row — the row's history. */
  const byRow = new Map<string, { c: ChangeRecord; l: ImpactLine }[]>();
  changes.filter(tookEffect).forEach((c) =>
    c.lines.filter((l) => l.outcome === "changed").forEach((l) => byRow.set(l.rowId, [...(byRow.get(l.rowId) ?? []), { c, l }]))
  );
  /* Value edits by entity — an entity's value back in time. */
  const edits = new Map<string, { c: ChangeRecord; l: ImpactLine }[]>();
  byRow.forEach((list) =>
    list.filter((x) => isValueEdit(x.l)).forEach((x) => {
      const id = x.l.beforeIds[0];
      if (!(edits.get(id) ?? []).some((y) => y.c.id === x.c.id)) edits.set(id, [...(edits.get(id) ?? []), x]);
    })
  );
  const valueAt = (id: string, t: number) => {
    const later = (edits.get(id) ?? []).filter((x) => x.c.effectiveAt > t).sort((a, b) => a.c.effectiveAt - b.c.effectiveAt)[0];
    if (later) return Number(later.l.before.split(" · $")[1]) || 0;
    return ents.get(id)?.value ?? 0;
  };

  const orders: PricedOrder[] = [];
  let n = 0;
  for (const row of rows) {
    if (!row.configured) continue;
    const delivered = hash(`o${row.id}`) <= 0.09;
    /* A FEW ORDERS STILL TO DELIVER, later today — one placed this morning
       (inside 4 hours of delivery), one for the evening. */
    const scheduled = hash(`sc${row.id}`) <= 0.03;
    if (!delivered && !scheduled) continue;
    const count = scheduled && !delivered ? 1 : hash(`k${row.id}`) > 0.6 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const seed = `${row.id}-${k}`;
      /* THE ID FIRST — a status set by hand (Order well) is kept by id. */
      n++;
      const id = `ORD-${70000 + Math.floor(hash(`id${seed}`) * 9000) + n}`;
      const forced = statusFor?.(id);
      const wasScheduled = !delivered;
      const isScheduled = forced ? forced === "Scheduled" : wasScheduled;
      const daysAgo = wasScheduled ? 0 : 1 + Math.floor(hash(`d${seed}`) * 75);
      const evening = hash(`ev${seed}`) > 0.5;
      const deliveredAt = wasScheduled
        ? at(0, evening ? 18 : 13, evening ? 30 : 0)
        : at(daysAgo, 7 + Math.floor(hash(`h${seed}`) * 12), Math.floor(hash(`m${seed}`) * 60));
      const placedAt = wasScheduled
        ? at(evening ? 1 : 0, evening ? 15 : 9, 30)
        : at(daysAgo + 1 + Math.floor(hash(`p${seed}`) * 3), 8 + Math.floor(hash(`ph${seed}`) * 3), Math.floor(hash(`pm${seed}`) * 60));
      const seededInvoice = !wasScheduled && daysAgo >= 10 ? at(daysAgo - 1, 6, 0) : null;
      const invoicedAt =
        forced === "Invoiced" ? (seededInvoice ?? deliveredAt + 3 * 3_600_000) : forced === "Delivered" || forced === "Scheduled" ? null : seededInvoice;
      /* Small drops now and then, so the quantity fees show. */
      const gallons = hash(`sm${seed}`) > 0.85 ? 50 + Math.round(hash(`sg${seed}`) * 4) * 50 : Math.round((300 + hash(`g${seed}`) * 5200) / 50) * 50;
      const orderType: PricedOrder["orderType"] = hash(`ot${seed}`) > 0.9 ? "Extraction" : "Delivery";
      const assets = hash(`as${seed}`) > 0.6 ? 1 + Math.floor(hash(`an${seed}`) * 6) : 0;
      const assetTypes = assets ? [ASSETS[Math.floor(hash(`at${seed}`) * ASSETS.length)]] : [];
      const miles = Math.round(5 + hash(`mi${seed}`) * 130);
      const minutesOnSite = Math.round(20 + hash(`ms${seed}`) * 110);
      const vendor = hash(`vn${seed}`) > 0.6 ? VENDOR_NAMES[Math.floor(hash(`vi${seed}`) * VENDOR_NAMES.length)] : null;
      const history = (byRow.get(row.id) ?? []).sort((a, b) => b.c.effectiveAt - a.c.effectiveAt);
      const phase = (t: number): Phase => (t < placedAt ? "before" : t <= deliveredAt ? "applied" : "after");

      /* THE ROW AS IT STOOD AT DELIVERY. */
      const idsAt = (s: Setting): string[] => {
        const later = history
          .filter((x) => x.l.setting === s && x.c.effectiveAt > deliveredAt && !isValueEdit(x.l))
          .sort((a, b) => a.c.effectiveAt - b.c.effectiveAt)[0];
        if (later) return later.l.beforeIds;
        if (IS_LIST[s]) return row[LIST_KEY[s as keyof typeof LIST_KEY]];
        return [s === "rateType" ? row.rateType : row.market].filter(Boolean);
      };
      const histOf = (s: Setting, id?: string): TraceHistory[] =>
        history
          .filter((x) => x.l.setting === s && (!id || x.l.beforeIds.includes(id) || x.l.afterIds.includes(id)))
          .map((x) => ({
            changeId: x.c.id,
            at: x.c.effectiveAt,
            by: x.c.by,
            phase: phase(x.c.effectiveAt),
            what: isValueEdit(x.l)
              ? `Rate ${x.l.before.split(" · ")[1]} → ${x.l.after.split(" · ")[1]}`
              : `${SETTING_LABEL[s]} on this ship-to: ${x.l.before || "None"} → ${x.l.after || "None"}`,
          }));

      const rateType = ents.get(idsAt("rateType")[0])?.name ?? "—";
      const market = ents.get(idsAt("market")[0])?.name ?? "—";
      /* The market's rack price that morning — today's base, moved a little by the day. */
      const basePerGal = Math.round((row.base + (hash(`b${row.market}${daysAgo}`) - 0.5) * 0.12) * 1000) / 1000;
      const effective = at(daysAgo, 6, 0);
      const components: TraceComponent[] = [
        {
          key: "base",
          group: "Base price",
          name: `${rateType} · ${market}`,
          how: `Price effective ${fmtShort(effective)} · ${money3(basePerGal)} × ${gallons.toLocaleString()} gal`,
          perGal: basePerGal,
          amount: basePerGal * gallons,
          history: [...histOf("rateType"), ...histOf("market")].sort((a, b) => b.at - a.at),
        },
      ];
      /* FEES FROM THE FEE RULE ENGINE when it is given (Yash, 2026-11-24). */
      (feesFor ? (["margin", "adder", "tax"] as Setting[]) : (["margin", "fee", "adder", "tax"] as Setting[])).forEach((s) =>
        idsAt(s).forEach((id) => {
          const v = valueAt(id, deliveredAt);
          components.push({
            key: `${s}-${id}`,
            group: GROUP[s],
            name: ents.get(id)?.name ?? id,
            how: `Fixed ${money3(v)} / gal × ${gallons.toLocaleString()} gal`,
            perGal: v,
            amount: v * gallons,
            history: histOf(s, id),
          });
        })
      );
      if (row.discount) {
        components.push({
          key: "discount",
          group: "Discount",
          name: "Customer discount",
          how: `−${money3(row.discount)} / gal × ${gallons.toLocaleString()} gal`,
          perGal: -row.discount,
          amount: -row.discount * gallons,
          history: [],
        });
      }
      if (feesFor) {
        const productTotal = components.filter((c) => c.group === "Base price" || c.group === "Margin").reduce((t, c) => t + c.amount, 0);
        components.push(
          ...feesFor(id, row, {
            orderType,
            createdAt: placedAt,
            plannedAt: deliveredAt,
            deliveredAt: isScheduled ? null : deliveredAt,
            orderedGallons: gallons,
            deliveredGallons: isScheduled ? null : gallons,
            assetTypes,
            assets,
            miles,
            minutesOnSite: isScheduled ? null : minutesOnSite,
            productTotal,
            vendor,
          })
        );
      }
      const total = components.reduce((t, c) => t + c.amount, 0);
      orders.push({
        id,
        invoice: invoicedAt ? `INV-${24000 + n}` : null,
        rowId: row.id,
        customerId: row.customerId,
        shiptoId: row.shiptoId,
        productId: row.productId,
        placedAt,
        deliveredAt,
        invoicedAt,
        status: isScheduled ? "Scheduled" : invoicedAt ? "Invoiced" : "Delivered",
        gallons,
        orderType,
        assetTypes,
        assets,
        miles,
        minutesOnSite,
        vendor,
        rateType,
        market,
        components,
        total,
        perGal: total / gallons,
        appliedAfterOrder: new Set(components.flatMap((c) => c.history.filter((h) => h.phase === "applied").map((h) => h.changeId))).size,
      });
    }
  }
  return orders.sort((a, b) => b.deliveredAt - a.deliveredAt);
}

/** The facts fees read on an order. */
export function orderFactsOf(o: PricedOrder): OrderFacts {
  const productTotal = o.components.filter((c) => c.group === "Base price" || c.group === "Margin").reduce((t, c) => t + c.amount, 0);
  const scheduled = o.status === "Scheduled";
  return {
    orderType: o.orderType,
    createdAt: o.placedAt,
    plannedAt: o.deliveredAt,
    deliveredAt: scheduled ? null : o.deliveredAt,
    orderedGallons: o.gallons,
    deliveredGallons: scheduled ? null : o.gallons,
    assetTypes: o.assetTypes,
    assets: o.assets,
    miles: o.miles,
    minutesOnSite: scheduled ? null : o.minutesOnSite,
    productTotal,
    vendor: o.vendor,
  };
}

export const orderLabel = (o: PricedOrder) => ({
  customer: customerOf(o.customerId).name,
  shipto: shiptoOf(o.shiptoId).name,
  product: productOf(o.productId).name,
});
export { money2, money3 };
