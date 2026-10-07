import * as React from "react";
import { ACTOR } from "./activity";
import { DATE_FMT, FUEL_ORDERS, dateKeyOf, relativeLabel, startOfDay } from "./data";
import type { FuelOrder } from "./types";
import {
  FIRST_QUOTE_NO,
  SEED_QUOTES,
  diffQuote,
  type Quote,
} from "./quotes";

/*
  ONE OWNER FOR QUOTES, AND FOR THE ORDERS THEY MAKE (Pavan, 2026-10-07 —
  decision 1). A screen's own state is thrown away when the reader goes to
  another destination, so a quote accepted on Quotes could not reach Fuel
  Orders through either screen's state, and a quote list that reset on every
  visit would let the same quote be accepted twice. This module outlives both
  screens: Quotes reads and writes it, and Fuel Orders seeds its list from the
  orders in it.

  THE SETTER WRITES THE CHANGE LOG — the same rule as `useLoggedRows`: one
  wrapper round the only setter, so no path that edits a quote can forget to
  log it.
*/

let quotes: Quote[] = SEED_QUOTES;
let orders: FuelOrder[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The quotes, live. */
export function useQuotes(): Quote[] {
  return React.useSyncExternalStore(subscribe, () => quotes);
}

/** The fuel orders accepted quotes have made, newest first. */
export function quoteOrders(): FuelOrder[] {
  return orders;
}

export function setQuotes(fn: (prev: Quote[]) => Quote[]) {
  const prev = quotes;
  const next = fn(prev);
  const at = new Date().toISOString();
  quotes = next.map((q) => {
    const before = prev.find((x) => x.id === q.id);
    if (!before)
      return q.audit?.length
        ? q
        : { ...q, updatedAt: at, audit: [{ at, by: ACTOR, changes: ["Quote created"] }] };
    if (before === q) return q;
    const changes = diffQuote(before, q);
    return {
      ...q,
      updatedAt: at,
      audit: changes.length > 0 ? [...(q.audit ?? []), { at, by: ACTOR, changes }] : q.audit,
    };
  });
  emit();
}

export function updateQuote(id: string, patch: Partial<Quote>) {
  setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
}

/** A blank Draft, made the moment Create Quote is pressed. */
export function createQuote(): Quote {
  const n = Math.max(FIRST_QUOTE_NO - 1, ...quotes.map((q) => Number(q.quoteNo.slice(2)))) + 1;
  const quote: Quote = {
    id: `qt-new-${n}`,
    quoteNo: `Q-${n}`,
    customer: "",
    shipTo: "",
    email: "",
    validThrough: "",
    /* No market yet: a default nobody chose would price the quote from a
       place nobody picked. */
    market: "",
    lines: [{ name: "", gal: 0, base: null, baseSet: false }],
    margin: { value: 0, unit: "perGal" },
    fees: { value: 0, unit: "perGal" },
    tax: { value: 0, unit: "percent" },
    notes: "",
    stage: "Draft",
    updatedAt: new Date().toISOString(),
  };
  setQuotes((prev) => [quote, ...prev]);
  return quotes.find((q) => q.id === quote.id)!;
}

/** Drop a quote outright — only an untouched new draft, closed unfilled. */
export function discardQuote(id: string) {
  quotes = quotes.filter((q) => q.id !== id);
  emit();
}

/* ------------------------------------------------- the order it makes --- */

const nextOrderNo = () =>
  String(Math.max(...FUEL_ORDERS.map((r) => Number(r.orderNo)), ...orders.map((r) => Number(r.orderNo))) + 2);

/*
  AN ACCEPTED QUOTE IS A FUEL ORDER AT REQUESTED (Pavan, 2026-10-07 —
  decision 1), carrying the customer, the ship-to and every product line with
  its gallons. Nothing else is known yet: no driver, no plan, no tags. Its
  delivery date is the day it was accepted — a quote carries no delivery date.
*/
function orderFrom(q: Quote, when: Date): FuelOrder {
  const day = startOfDay(when);
  const products = q.lines.filter((l) => l.name && l.gal > 0).map((l) => ({ name: l.name, gal: l.gal }));
  const no = nextOrderNo();
  return {
    id: `fo-quote-${no}`,
    orderNo: no,
    type: { code: "D", label: "Delivery" },
    customer: { title: q.customer, description: q.shipTo },
    products,
    qtyGal: products.reduce((n, p) => n + p.gal, 0),
    date: {
      title: DATE_FMT.format(day),
      description: relativeLabel(
        Math.round((day.getTime() - startOfDay(new Date()).getTime()) / 86_400_000),
        day
      ),
    },
    dateKey: dateKeyOf(day),
    planned: null,
    tags: [],
    status: "Requested",
    urgent: false,
    driver: null,
    audit: [{ at: when.toISOString(), by: ACTOR, changes: [`Order created from quote ${q.quoteNo}`] }],
  };
}

/** Mark as accepted: the quote moves on and its order is made, in one step. */
export function acceptQuote(id: string): FuelOrder | null {
  const q = quotes.find((x) => x.id === id);
  if (!q || q.stage !== "Sent") return null;
  const order = orderFrom(q, new Date());
  orders = [order, ...orders];
  updateQuote(id, { stage: "Accepted", orderId: order.id, orderNo: order.orderNo });
  return order;
}

/* THE SEEDED ACCEPTED QUOTES HAVE THEIR ORDERS TOO, so the link on each one
   lands on a real row. Dated the day each was accepted. INVENTED. */
quotes = quotes.map((q) => {
  if (q.stage !== "Accepted") return q;
  const order = orderFrom(q, new Date(q.updatedAt));
  orders = [order, ...orders];
  return { ...q, orderId: order.id, orderNo: order.orderNo };
});
