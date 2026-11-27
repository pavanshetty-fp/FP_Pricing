import type { GroupDim } from "@/components/tables-layout";
import type { ListColumn } from "../ListTable";
import type { StatusKind } from "../statusKind";
import {
  SETTING_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  customerOf,
  fmtDate,
  productOf,
  recordAction,
  settingsOf,
  shiptoOf,
  uniq,
  type ChangeRecord,
  type ChangeStatus,
} from "./changeLog";

/*
  ACTIVITY FEED — every pricing change, newest first (Yash, 2026-11-16).
  The old prototype's Change history list, on the Unified View list: the
  columns, facets and Group by dimensions it had, in sentence case.
*/

/** What each change status asks of the reader (statusKind.ts). */
export const STATUS_KIND: Record<ChangeStatus, StatusKind> = {
  applied: "success",
  partlyFailed: "critical",
  scheduled: "info",
  canceled: "neutral",
  undone: "neutral",
};

export const actionOf = (c: ChangeRecord) => recordAction(c);
/* A customer's own pricing, set before any ship-to inherits it, has no lines
   — it still names its customer. */
export const customersOf = (c: ChangeRecord) => uniq([...c.lines.map((l) => l.customerId), ...(c.customerId ? [c.customerId] : [])].map((id) => customerOf(id).name));
export const shiptosOf = (c: ChangeRecord) => uniq(c.lines.map((l) => shiptoOf(l.shiptoId).name));
export const productsOf = (c: ChangeRecord) => uniq(c.lines.map((l) => productOf(l.productId).name));
export const entitiesOf = (c: ChangeRecord) => settingsOf(c).map((s) => SETTING_LABEL[s]);
export const repricedOf = (c: ChangeRecord) => c.orders.filter((o) => o.status === "repriced").length;

/* ASSIGNED OR INHERITED (Yash, 2026-11-18) — inherited is made on customer
   pricing and flows down to its ship-tos; everything else, setup included,
   is assigned. One reading for the column, its filter and the summary. */
export const assignmentOf = (c: ChangeRecord): "Assigned" | "Inherited" => (c.source === "customer" ? "Inherited" : "Assigned");

export type FeedColumnKey =
  | "when"
  | "id"
  | "entity"
  | "action"
  | "by"
  | "source"
  | "assignment"
  | "customers"
  | "shiptos"
  | "orders"
  | "change"
  | "status"
  | "actions";

/* A LOGBOOK, READ LEFT TO RIGHT (Yash, 2026-11-17): when, what changed, who
   made it and how, who it reached, then the change itself (which value, from
   what to what). One field per column, so each sorts and filters on its own;
   no row actions — people come here to read what happened. */
export const FEED_COLUMNS: ListColumn<FeedColumnKey>[] = [
  { key: "when", label: "Date & time", width: 220, sortable: true },
  /* NO CHANGE ID COLUMN (Yash, 2026-11-18) — the opened change carries it. */
  { key: "entity", label: "Artifact", width: 140, sortable: true },
  { key: "action", label: "Action", width: 120, sortable: true },
  /* ENTITY → ACTION → CHANGE, the order it is said in (Yash, 2026-11-17). */
  { key: "change", label: "Change", width: 360, sortable: true },
  { key: "by", label: "Change by", width: 150, sortable: true },
  { key: "source", label: "Change via", width: 200, sortable: true },
  /* ASSIGNED OR INHERITED, beside how it was made (Yash, 2026-11-18). */
  { key: "customers", label: "Customers", width: 250, sortable: true },
  { key: "shiptos", label: "Ship-tos", width: 110, sortable: true },
  { key: "orders", label: "Orders affected", width: 150, sortable: true },
  { key: "status", label: "Status", width: 120, sortable: true },
  /* The list's menu slot — empty here, so ListTable leaves it out. */
  { key: "actions", label: "", width: 44 },
];

/** Measure: rows the changes moved. */
export const FEED_GROUP_DIMS: GroupDim<ChangeRecord>[] = [
  { key: "day", label: "Day", valuesOf: (c) => [fmtDate(c.effectiveAt)] },
  { key: "action", label: "Action", hides: "action", valuesOf: (c) => [actionOf(c)] },
  { key: "entity", label: "Artifact", multi: true, valuesOf: entitiesOf },
  { key: "source", label: "Change via", hides: "source", valuesOf: (c) => [SOURCE_LABEL[c.source]] },
  {
    key: "status",
    label: "Status",
    hides: "status",
    order: Object.values(STATUS_LABEL),
    valuesOf: (c) => [STATUS_LABEL[c.status]],
  },
  { key: "by", label: "Change by", hides: "by", valuesOf: (c) => [c.by] },
  { key: "customer", label: "Customer", multi: true, valuesOf: customersOf },
  { key: "shipto", label: "Ship-to", multi: true, valuesOf: shiptosOf },
];

/**
 * THE FEED FILTERED TO ONE CUSTOMER OR SHIP-TO SPEAKS FOR IT (Yash,
 * 2026-11-18) — a bulk change that reached three customers counts, on that
 * customer's feed, only that customer's ship-tos, prices and orders.
 */
export type FeedScope = { customer?: string; shipto?: string } | null;

/** One customer or one ship-to picked in the filters, else none. */
export function scopeOf(sel: ReadonlySet<string>): FeedScope {
  const of = (k: string) => [...sel].filter((x) => x.startsWith(`${k}:`)).map((x) => x.slice(k.length + 1));
  const shiptos = of("shipto");
  const customers = of("customer");
  if (shiptos.length === 1) return { shipto: shiptos[0] };
  if (customers.length === 1) return { customer: customers[0] };
  return null;
}

/** The change, cut to the scope: its prices and orders there only. */
export function scopedChange(c: ChangeRecord, s: FeedScope): ChangeRecord {
  if (!s) return c;
  const keep = (customerId: string, shiptoId: string) =>
    s.shipto ? shiptoOf(shiptoId).name === s.shipto : customerOf(customerId).name === s.customer;
  return {
    ...c,
    lines: c.lines.filter((l) => keep(l.customerId, l.shiptoId)),
    orders: c.orders.filter((o) => keep(o.customerId, o.shiptoId)),
  };
}
