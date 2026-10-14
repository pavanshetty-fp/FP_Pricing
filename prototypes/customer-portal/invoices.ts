import * as React from "react";
import { startOfDay } from "../unified-view/data";
import { statusTones } from "../unified-view/statusKind";
import { ACCOUNT, CUSTOMER_DIFF, MARKET_PRICE, PORTAL_ACTOR, TENANT, dateOfKey, type RequestDoc } from "./orders";

/*
  INVOICES (Pavan, 2026-10-14) — after the Lovable reference's invoice page
  (https://unified-ui-revamped.lovable.app/customer-portal?sec=invoices),
  in our DS. ONE store: the Invoices page and the dashboard both read it, so
  their figures cannot disagree.

  NO PAYING IN THE PORTAL YET. The reference's "Pay" column is gone; where
  the invoice stands is its STATUS:

    Received           the tenant has sent it; not due for a while
    Payment due        due within 7 days
    Overdue            past its due date, unpaid
    Paid               the customer says it is paid; the tenant has not confirmed
    Payment confirmed  the tenant has the money
    Payment disputed   the payment does not match — the two sides disagree

  The last column is DOWNLOAD INVOICE — one icon.

  INVENTED. The newest invoices are the live requests' (REQ-1108…1111); the
  rest are older requests that are no longer on the Orders page.
*/

export const INVOICE_STATUSES = [
  "Received",
  "Payment due",
  "Overdue",
  "Paid",
  "Payment confirmed",
  "Payment disputed",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_TONE = statusTones<InvoiceStatus>({
  Received: "info",
  /* The customer's move. */
  "Payment due": "caution",
  Overdue: "critical",
  /* Waiting on the tenant to confirm. */
  Paid: "info",
  "Payment confirmed": "success",
  "Payment disputed": "critical",
});

/** Still the customer's to pay (or to settle). */
export const OPEN: InvoiceStatus[] = ["Received", "Payment due", "Overdue", "Payment disputed"];
export const SETTLED: InvoiceStatus[] = ["Paid", "Payment confirmed"];

/** The customer's payment terms — days from issue to due. */
export const TERMS_DAYS = 15;
export const TERMS = `Net ${TERMS_DAYS}`;

export interface InvoiceLine {
  product: string;
  gal: number;
}

/*
  A PAYMENT DISPUTE (Pavan, 2026-10-14) — what is disputed and why, the
  notes both sides add, and the documents offered as proof (a delivery
  ticket, a meter reading, a remittance). Notes and documents are added by
  either side; the customer adds theirs from the invoice sheet.
*/
export interface DisputeNote {
  id: string;
  by: string;
  /** Which side wrote it. */
  side: "customer" | "tenant";
  at: string;
  text: string;
}
export interface Dispute {
  reason: string;
  /** What the customer says is the right amount, $. */
  claimed: number | null;
  raisedBy: string;
  raisedAt: string;
  notes: DisputeNote[];
  documents: RequestDoc[];
}

export interface Invoice {
  invoiceNo: string;
  requestNo: string;
  shipTo: string;
  billTo: string;
  /** `YYYY-MM-DD`. */
  issued: string;
  due: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  /** When it was paid — Paid and Payment confirmed only. */
  paidOn?: string;
  /** Payment disputed only. */
  dispute?: Dispute;
}

/* ------------------------------------------------------------ figures --- */

/** Delivery and environmental fees, $/gal. INVENTED. */
export const FEES_PER_GAL = 0.1026;
/** Federal + state excise, on fuel and fees. INVENTED. */
export const TAX_RATE = 0.07;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What each invoice charges — the one implementation every figure reads. */
export function chargesOf(inv: Invoice) {
  const fuel = inv.lines.map((l) => {
    const rate = (MARKET_PRICE[l.product] ?? 0) + (CUSTOMER_DIFF[l.product] ?? 0);
    return { ...l, rate, amount: round2(rate * l.gal) };
  });
  const gal = inv.lines.reduce((t, l) => t + l.gal, 0);
  const fuelTotal = fuel.reduce((t, l) => t + l.amount, 0);
  const fees = round2(gal * FEES_PER_GAL);
  const tax = round2((fuelTotal + fees) * TAX_RATE);
  return { fuel, gal, fees, tax, total: round2(fuelTotal + fees + tax) };
}
export const totalOf = (inv: Invoice) => chargesOf(inv).total;

const dayKey = (offset: number) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** Days from today to a date key — negative is past. */
export const daysFrom = (key: string) => {
  const d = dateOfKey(key);
  return d ? Math.round((d.getTime() - startOfDay(new Date()).getTime()) / 86_400_000) : 0;
};

type Seed = [no: number, req: number, shipTo: string, issuedAgo: number, status: InvoiceStatus, lines: InvoiceLine[], paidAgo?: number];
const SEED: Seed[] = [
  [5415, 1108, "Cardinal Hub A", 14, "Paid", [{ product: "Diesel", gal: 4800 }], 1],
  [5414, 1109, "Cardinal Hub B", 17, "Payment disputed", [{ product: "Diesel", gal: 7000 }]],
  [5413, 1110, "Cardinal Hub A", 12, "Payment due", [{ product: "Diesel", gal: 3900 }]],
  [5412, 1111, "Cardinal Overflow", 21, "Overdue", [{ product: "Dyed Diesel", gal: 1150 }, { product: "Diesel", gal: 45 }]],
  [5391, 1094, "Cardinal Hub A", 10, "Payment due", [{ product: "Diesel", gal: 4100 }, { product: "DEF", gal: 280 }]],
  [5385, 1089, "Cardinal Hub B", 3, "Received", [{ product: "Unleaded 87", gal: 2900 }]],
  [5376, 1083, "Cardinal Hub A", 1, "Received", [{ product: "Jet A", gal: 2200 }, { product: "Avgas 100LL", gal: 600 }]],
  [5360, 1071, "Cardinal Overflow", 49, "Overdue", [{ product: "Propane", gal: 2600 }]],
  [5340, 1060, "Cardinal Hub A", 40, "Payment confirmed", [{ product: "Diesel", gal: 5200 }], 27],
  [5322, 1052, "Cardinal Hub B", 55, "Payment confirmed", [{ product: "Diesel", gal: 6100 }, { product: "Unleaded 87", gal: 1500 }], 41],
  [5301, 1044, "Cardinal Overflow", 70, "Payment confirmed", [{ product: "Dyed Diesel", gal: 3300 }], 57],
  [5288, 1037, "Cardinal Hub A", 84, "Payment confirmed", [{ product: "Diesel", gal: 4600 }], 70],
];

export const INVOICES: Invoice[] = SEED.map(([no, req, shipTo, ago, status, lines, paidAgo]) => ({
  invoiceNo: `INV-${no}`,
  requestNo: `REQ-${req}`,
  shipTo,
  billTo: ACCOUNT,
  issued: dayKey(-ago),
  due: dayKey(-ago + TERMS_DAYS),
  status,
  lines,
  paidOn: paidAgo !== undefined ? dayKey(-paidAgo) : undefined,
}));

/* THE SEEDED DISPUTE — INV-5414. INVENTED. */
{
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const inv = INVOICES.find((i) => i.invoiceNo === "INV-5414");
  if (inv) {
    const charged = totalOf(inv);
    inv.dispute = {
      reason: "Billed for 7,000 gal; the delivery ticket shows 6,400 gal delivered.",
      claimed: Math.round((charged * 6400) / 7000 * 100) / 100,
      raisedBy: PORTAL_ACTOR,
      raisedAt: hoursAgo(70),
      notes: [
        {
          id: "dn-1",
          by: PORTAL_ACTOR,
          side: "customer",
          at: hoursAgo(70),
          text: "Delivery ticket T-4414 shows 6,400 gal into Tank B1. We were billed for 7,000 gal. Ticket attached.",
        },
        {
          id: "dn-2",
          by: "Maria Chen",
          side: "tenant",
          at: hoursAgo(46),
          text: "Checking against Truck 22's meter reading for that drop. The due date is paused while we look.",
        },
        {
          id: "dn-3",
          by: "Maria Chen",
          side: "tenant",
          at: hoursAgo(20),
          text: "Meter reading attached — it shows 6,980 gal dispensed. Could you check the tank's gauge reading before and after?",
        },
      ],
      documents: [
        { id: "dd-1", name: "Delivery ticket T-4414.pdf", kind: "Delivery ticket", by: PORTAL_ACTOR, at: hoursAgo(70) },
        { id: "dd-2", name: "Meter reading Truck 22.jpg", kind: "Photo", by: TENANT, at: hoursAgo(20) },
      ],
    };
  }
}

/* ------------------------------------------------------------- store --- */

/* ONE LIVE LIST — notes and documents added on the sheet show at once. */
let snapshot: Invoice[] = [...INVOICES];
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = [...INVOICES];
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useInvoices(): Invoice[] {
  return React.useSyncExternalStore(subscribe, () => snapshot);
}

const patchDispute = (no: string, fn: (d: Dispute) => Dispute) => {
  const i = INVOICES.findIndex((x) => x.invoiceNo === no);
  const d = INVOICES[i]?.dispute;
  if (i < 0 || !d) return;
  INVOICES[i] = { ...INVOICES[i], dispute: fn(d) };
  emit();
};

/** The customer adds a note to a dispute. */
export function addDisputeNote(no: string, text: string) {
  patchDispute(no, (d) => ({
    ...d,
    notes: [
      ...d.notes,
      { id: `dn-${Date.now()}`, by: PORTAL_ACTOR, side: "customer", at: new Date().toISOString(), text },
    ],
  }));
}

/** The customer adds proof to a dispute. */
export function addDisputeDocuments(no: string, files: { name: string; type: string }[]) {
  const at = new Date().toISOString();
  patchDispute(no, (d) => ({
    ...d,
    documents: [
      ...d.documents,
      ...files.map((f, k) => ({
        id: `dd-${Date.now()}-${k}`,
        name: f.name,
        kind: (f.type.startsWith("image/") ? "Photo" : "Other") as RequestDoc["kind"],
        by: PORTAL_ACTOR,
        at,
      })),
    ],
  }));
}

/** The overview's four figures. */
export function invoiceSummary(list: Invoice[] = INVOICES) {
  const sum = (xs: Invoice[]) => xs.reduce((t, i) => t + totalOf(i), 0);
  const open = list.filter((i) => OPEN.includes(i.status));
  const overdue = list.filter((i) => i.status === "Overdue");
  const paid90 = list.filter((i) => SETTLED.includes(i.status) && i.paidOn && daysFrom(i.paidOn) >= -90);
  return {
    outstanding: sum(open),
    openCount: open.length,
    overdue: sum(overdue),
    overdueCount: overdue.length,
    paid90: sum(paid90),
    paid90Count: paid90.length,
  };
}

/** Who sent it — the tenant. */
export const ISSUER = TENANT;
