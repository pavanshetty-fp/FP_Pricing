import { DATE_FMT, MONEY, dateKeyOf, relativeLabel, startOfDay } from "../data";
import { CUSTOMERS } from "../customers";
import type { TwoLine } from "../types";
import { VENDORS } from "./vendors";
import { statusTones } from "../statusKind";

/*
  3PL (brokerage) orders — the broker's Order Dashboard dataset.

  PROVENANCE. Unlike the Sales screens, which were transcribed from screenshots,
  this module's MODEL is transcribed from FleetPanda's own product spec
  ("3PL (Third-Party Logistics)", the 3PL-102 doc). Everything structural below
  is quoted from it, not guessed:

    • The seven-stage lifecycle and its exact order (§5.2 "Order Stages"), with
      the core progression stated as
        Draft -> Quoting -> Assigned -> Completed -> Verified -> Synced
      with Review added 2026-09-24 between Completed and Verified, from the
      engine doc ("Recurring Orders - 3PL", After delivery).
      and BLOCKED positioned between Created and Assigned ("Order is blocked due
      to a customer credit issue").
    • The order-type filter tabs All / Regular / Recurring / Movement (§5.2
      "Order Type Filter Tabs"), which is why `kind` exists as a field separate
      from `orderType`.
    • Order numbering: Movement Orders carry an "M" prefix, standard delivery
      orders "D" (§5.20 "Order numbering").
    • The create-order field set, section by section (§5.3): customer + ship-to,
      planned date with a start/end time WINDOW, PO number, order type, urgent
      flag, signature-on-delivery, hub, asset/product lines with a per-line
      top-off toggle, primary POC, salesperson, delivery instructions.
    • Multiple vendors invited at once, first to accept wins (§5.5–5.7), which is
      why `invitedVendorIds` is a list and `vendorId` is the one that accepted.
    • Movement orders default to the Request-Quote pricing flow and take Fee +
      Tax rather than rate-per-gallon (§5.20).

  STATUS IS AN EXPLICIT FIELD, deliberately. The Fuel Orders screen derives its
  status from whether a driver is assigned, and `HANDOFF.md` open question 1
  records that this contradicted the source app. Here the spec states a lifecycle
  outright, so it is stored, not computed — and the invariants that tie it to the
  vendor fields are asserted in `assertConsistent` below rather than left to the
  seeds to get right by hand.

  INVENTED, and flagged: order numbers, the delivery windows, the gallon
  quantities, POC and salesperson names, hub names, delivery instructions, and
  the quote figures. Customer names and ship-tos are REUSED from the Sales
  `customers.ts` dataset, which is faithful rather than lazy — the spec says
  customer entities sync from Dispatch and are the same records ("customer-
  related entities are synced almost in real-time between Dispatch and 3PL").
*/

/** §5.2 Order Stages, in the spec's own order. Blocked sits after Draft. */
export type BrokerStatus =
  | "Draft"
  | "Blocked"
  | "Quoting"
  | "Assigned"
  | "Completed"
  /* THE OPTIONAL HOLD. "These numbers look off" — somebody is checking them
     before accounting sees them. Reversible both ways: back to Completed, or
     approved on to Verified. (Pavan, 2026-09-24, from the engine doc.) */
  | "Review"
  /* VERIFIED IS A QUEUE, NOT AN ACT. Approved, and waiting for the accounting
     system to pull it on its own schedule. Nobody here marks it synced — the
     accounting system reports back, and its answer sets the next status. */
  | "Verified"
  /* PARTIALLY SYNCED IS AN ERROR, NOT PROGRESS. The sync was tried and it
     failed; the accounting system's message is stored in `syncError`. Three
     ways out: retry (back to Verified), send to Review, or mark synced once
     the issue is fixed. It is a status but not a lane — it shares the Synced
     lane with a badge. (Pavan, 2026-09-24.) */
  | "Partially Synced"
  | "Synced"
  /* THE TERMINAL EXIT. Not a stage of the work — a way out of it — which is
     why it is last in the lane order rather than in sequence with the rest. */
  | "Canceled";

/**
 * PAST THE DELIVERY. The stages where the run has happened and the order is
 * being settled rather than arranged — which is the line the card's own
 * contents turn on: before it, a card is about a plan; after it, about a fact.
 */
export const DELIVERED_STATUSES: BrokerStatus[] = [
  "Completed",
  "Review",
  "Verified",
  "Partially Synced",
  "Synced",
];

export function isDelivered(s: BrokerStatus): boolean {
  return DELIVERED_STATUSES.includes(s);
}

/** Lane / tab order. The board renders lanes in exactly this sequence. */
export const BROKER_STATUSES: BrokerStatus[] = [
  "Draft",
  "Blocked",
  "Quoting",
  "Assigned",
  "Completed",
  "Review",
  "Verified",
  "Synced",
  "Canceled",
];

/** What the dashboard's filter tabs split on (§5.2). NOT the Order Type field. */
export type OrderKind = "Regular" | "Recurring" | "Movement";

export const ORDER_KINDS: OrderKind[] = ["Regular", "Recurring", "Movement"];

/**
 * The Order Type field from §5.3 Section 2 ("Classify the order (e.g.,
 * Emergency, Core)"). Movement orders are auto-set to "Asset Movement" and it is
 * the only type they can take (§5.20), which `assertConsistent` enforces.
 */
/* FOUR TYPES (Pavan, 2026-10-27) — what is being moved: fuel, lubricants,
   an asset, or anything else. Was Core / Emergency / Delivery / Extraction /
   Pump Out / Transport. */
/* BACK TO THE REFERENCE'S FOUR (Pavan, 2026-10-29) — Core · Delivery ·
   Emergency · Extraction, in that order. Fuel / Lubricants / Propane /
   Packaged Goods / Other (2026-10-27/29) are gone. Asset Movement stays as
   the type a movement order is given; it is never offered on a delivery. */
export type BrokerOrderType =
  | "Core"
  | "Delivery"
  | "Emergency"
  | "Extraction"
  | "Asset Movement";

/**
 * §5.20 — AN ASSET ORDER IS A ROUTE BETWEEN TWO PLACES, and there are only two
 * kinds of place: one of our yards, or a customer's site. Four routes exhaust
 * the combinations, and each has a name the trade already uses.
 *
 * NAMED BY THE VERB, LABELLED BY THE ROUTE. Stored as what happened —
 * "Transfer" — and offered as "Ship-to to Ship-to (Transfer)", because the
 * menu is where someone is deciding and the route is the thing they are
 * deciding between; afterwards the one word is enough.
 */
export type MovementDirection = "Delivery" | "Pickup" | "Transfer" | "Relocate";

/** Which kind of place an end of the route is. */
export type MovementEnd = "yard" | "site";

/**
 * THE ROUTE IS THE DEFINITION, not a label on it. Every difference between the
 * four — which section comes first, which assets can be moved, what the form
 * asks for at each end — is read off this table rather than written out four
 * times, so a fifth route would be one line here.
 */
export const MOVEMENT_ROUTE: Record<
  MovementDirection,
  { from: MovementEnd; to: MovementEnd }
> = {
  Delivery: { from: "yard", to: "site" },
  Pickup: { from: "site", to: "yard" },
  Transfer: { from: "site", to: "site" },
  Relocate: { from: "yard", to: "yard" },
};

/** What the Create menu offers: the route, with the verb in brackets. */
export const MOVEMENT_LABEL: Record<MovementDirection, string> = {
  Delivery: "Yard to Ship-to (Delivery)",
  Pickup: "Ship-to to Yard (Pickup)",
  Transfer: "Ship-to to Ship-to (Transfer)",
  Relocate: "Yard to Yard (Relocate)",
};

/** The one-line gloss under each, in the menu. */
export const MOVEMENT_DETAIL: Record<MovementDirection, string> = {
  Delivery: "Send an asset out to a customer site",
  Pickup: "Bring an asset back from a customer site",
  Transfer: "Move an asset straight from one customer site to another",
  Relocate: "Move an asset between our own yards",
};

export const MOVEMENT_DIRECTIONS: MovementDirection[] = [
  "Delivery",
  "Pickup",
  "Transfer",
  "Relocate",
];

/**
 * One asset/product line. `topOff` is the spec's per-line-item toggle: an asset
 * marked for top-off carries no requested volume, so `gal` is null and must
 * stay null — the two are mutually exclusive, not merely usually different.
 */
export interface OrderLine {
  asset: string;
  product: string;
  /** Requested quantity, in `unit` (gallons unless said), or `null` when
   *  the line is a top-off. */
  gal: number | null;
  /** WHAT THE QUANTITY COUNTS (Pavan, 2026-10-29) — `gal` when unset. Fuel
   *  is always gal; lubes and packaged products pick theirs in the cell. See
   *  `unitsFor`. */
  unit?: QtyUnit;
  /**
   * Fill this asset rather than deliver a stated quantity — the "Top off"
   * column in the Delivery Order table. It is the checkbox itself, not a mode
   * over a selection: one tick, one meaning, whatever else is on screen.
   */
  topOff: boolean;
  /** The asset belongs to the broker, not the customer — badged on the row. */
  rental?: boolean;
  /** A recurring rule's load order, per line (Pavan, 2026-10-16): which
   *  loading account and supplier this tank's product is loaded on. */
  loadingAccount?: string;
  supplier?: string;
  /**
   * What actually went in. Null until the delivery says — and EDITABLE while a
   * quote is being reviewed, because both sides of the margin are computed from
   * it and a broker pricing an order is pricing what they expect to deliver,
   * not what was asked for.
   */
  deliveredGal?: number | null;
  /**
   * THE BROKER'S OWN NUMBERS, per line — what the customer pays, and the margin
   * on top. They sit on the ORDER LINE and not on the quote because they are
   * the broker's, not the partner's: switching which partner takes the order
   * must not throw away the pricing worked out for the customer.
   */
  pricePerGal?: number;
  /**
   * EVERYTHING ELSE CHARGED ON THIS PRODUCT, AS A LIST (Pavan, 2026-09-22).
   *
   * It was three fields — margin, tax, fee — one of each. One of each is not
   * what an order looks like: a load can carry a state excise AND a county
   * tax, a pump fee AND a hazmat fee, a margin split between the broker and
   * the salesperson. Three fields could hold the first of each and nothing
   * after it.
   *
   * ALL OF THEM ARE PER GALLON and charged on what is in the tank — a gallon
   * of dyed diesel is taxed differently from a gallon of DEF. A fee that is
   * NOT about a product (an after-hours callout, a split delivery) is not one
   * of these: it is an `OrderFee`, charged once for the run.
   */
  charges: LineCharge[];
}

/**
 * ONE CHARGE ON ONE PRODUCT — the row it defines, and the BROKER's rate for it.
 *
 * THE ROW BELONGS TO THE ORDER, THE RATES TO EACH SIDE. The pricing unit lays
 * the partner's figure beside the broker's for the same charge, so the charge
 * itself has to exist once, above both: `perGal` here is what the customer is
 * billed, and the partner's figure for the same row is `QuoteLine.rates[id]`.
 * That is also why the id is stable — a quote points at it.
 *
 * WHICH ONE IT IS, WHEN THERE ARE SEVERAL, is not stored. Two margins on a
 * product are "Margin 1" and "Margin 2" by their order in the list; a typed
 * name is one more thing to keep consistent across an order for no gain the
 * figures do not already give.
 */
export interface LineCharge {
  /** Unique within its line. `QuoteLine.rates` is keyed by it. */
  id: string;
  kind: LineChargeKind;
  /** The BROKER's rate. The partner's is on the quote. */
  perGal?: number;
}

/**
 * The charges a product can carry more than one of. PRICE IS NOT ONE: a
 * product has one rate, and a second would be a second product.
 */
export const LINE_CHARGE_KINDS = ["Margin", "Tax", "Fee"] as const;
export type LineChargeKind = (typeof LINE_CHARGE_KINDS)[number];

/** A fresh charge, with an id nothing else on the line is using. */
export function newLineCharge(
  kind: LineChargeKind,
  taken: LineCharge[]
): LineCharge {
  const base = kind.toLowerCase();
  let n = 1;
  let id = base;
  while (taken.some((c) => c.id === id)) id = `${base}-${++n}`;
  return { id, kind };
}

/** The three a line starts with — one of each, which is the common case. */
export function defaultLineCharges(): LineCharge[] {
  return LINE_CHARGE_KINDS.map((kind) => ({ id: kind.toLowerCase(), kind }));
}

/**
 * WHAT A CHARGE IS CALLED ON THE ROW. Plain "Margin" when it is the only one
 * of its kind on the line; numbered when it is not, because two rows reading
 * "Margin" with different figures is a table that cannot be checked.
 */
export function chargeLabel(c: LineCharge, all: LineCharge[]): string {
  const sameKind = all.filter((x) => x.kind === c.kind);
  if (sameKind.length < 2) return c.kind;
  return `${c.kind} ${sameKind.indexOf(c) + 1}`;
}

/**
 * Loading accounts — the ONE table the Load Order's three selects read.
 *
 * A loading account is the real entity: it belongs to a terminal AND a
 * supplier, and it carries the products that can be drawn on it. Terminal and
 * Supplier are therefore not independent lists — they are the distinct values
 * of this table, narrowed by what has already been chosen. Three free-standing
 * vocabularies would let someone pick a terminal, a supplier and an account
 * that have nothing to do with each other.
 */
export interface LoadingAccount {
  name: string;
  /** The account's first terminal and supplier — what the delivery order
   *  sheet's per-product selects offer. */
  terminal: string;
  supplier: string;
  /** EVERY terminal and supplier the account can load from, when it has more
   *  than one (Pavan, 2026-09-25). Read through `terminalsOf`/`suppliersOf`.
   *  INVENTED — the extra names are sample data. */
  terminals?: string[];
  suppliers?: string[];
  /** What can be loaded on this account. A line's product must be in here. */
  products: string[];
}

/* LOADING ACCOUNTS ARE NUMBERS (Pavan, 2026-10-29) — an alphanumeric account
   number (terminal code + digits), never a name. */
const ALL_LOAD_PRODUCTS = ["Dyed Diesel", "Clear Diesel #2", "Unleaded 87", "Unleaded 91", "DEF Bulk", "Hydraulic Oil AW-46", "Engine Oil 15W-40", "Propane HD-5", "Propane Commercial"];

export const LOADING_ACCOUNTS: LoadingAccount[] = [
  {
    name: "GKM-50431",
    terminal: "Greensbro KM2",
    supplier: "Liberty P56",
    terminals: ["Greensbro KM2", "Lib Washington 124"],
    suppliers: ["Liberty P56", "Sunrise Energy"],
    products: ["Dyed Diesel", "Clear Diesel #2"],
  },
  {
    name: "GKM-50478",
    terminal: "Greensbro KM2",
    supplier: "Pioneer Distributing",
    products: ["Unleaded 87", "Unleaded 91"],
  },
  {
    name: "LP56-61209",
    terminal: "Liberty P56",
    supplier: "Liberty P56",
    products: ["Clear Diesel #2", "DEF Bulk"],
  },
  {
    name: "LW124-70316",
    terminal: "Lib Washington 124",
    supplier: "Sunrise Energy",
    suppliers: ["Sunrise Energy", "Liberty P56"],
    products: ["Dyed Diesel", "Unleaded 87", "DEF Bulk"],
  },
  {
    name: "KRT4-80122",
    terminal: "Kern River T4",
    supplier: "Pioneer Distributing",
    products: ["Hydraulic Oil AW-46", "Clear Diesel #2"],
  },
  {
    name: "KRT4-80167",
    terminal: "Kern River T4",
    supplier: "Sunrise Energy",
    terminals: ["Kern River T4", "Bakersfield Rack 2"],
    suppliers: ["Sunrise Energy", "Pioneer Distributing", "Valley Fuels"],
    products: ["Unleaded 87", "Unleaded 91", "Dyed Diesel"],
  },
  /* EVERY PRODUCT LOADS SOMEWHERE (Pavan, 2026-10-29) — lubes and propane had
     no account, so their Terminal said "No options". Each product now has at
     least three accounts across at least two terminals. INVENTED. */
  {
    name: "KRT4-80245",
    terminal: "Kern River T4",
    supplier: "Valley Fuels",
    products: ["Engine Oil 15W-40", "Hydraulic Oil AW-46"],
  },
  {
    name: "BR2-90311",
    terminal: "Bakersfield Rack 2",
    supplier: "Pioneer Distributing",
    products: ["Engine Oil 15W-40", "Hydraulic Oil AW-46", "Propane HD-5", "Propane Commercial"],
  },
  {
    name: "GKM-50590",
    terminal: "Greensbro KM2",
    supplier: "Sunrise Energy",
    products: ALL_LOAD_PRODUCTS,
  },
  {
    name: "LP56-61354",
    terminal: "Liberty P56",
    supplier: "Valley Fuels",
    products: ALL_LOAD_PRODUCTS,
  },
  {
    name: "LW124-70482",
    terminal: "Lib Washington 124",
    supplier: "Pioneer Distributing",
    products: ["Propane HD-5", "Propane Commercial", "Engine Oil 15W-40", "Unleaded 91"],
  },
];

const uniqueSorted = (xs: string[]) => [...new Set(xs)].sort();

/** Every terminal an account loads from. */
export const terminalsOf = (a: LoadingAccount) => a.terminals ?? [a.terminal];
/** Every supplier an account buys from. */
export const suppliersOf = (a: LoadingAccount) => a.suppliers ?? [a.supplier];

/** See the note at `loadOrder` in the seed. Null means no load order exists. */
function seedLoadOrder(
  i: number,
  lines: { product: string }[]
): BrokerOrder["loadOrder"] {
  if (i % 3 !== 1) return null;
  const products = [...new Set(lines.map((l) => l.product))];
  const account = LOADING_ACCOUNTS.find((a) =>
    products.every((p) => a.products.includes(p))
  );
  if (!account) return null;
  return products.map((product) => ({
    product,
    terminal: account.terminal,
    supplier: account.supplier,
    loadingAccount: account.name,
  }));
}

/**
 * The three selects, narrowed by EVERY product on the order at once.
 *
 * One account serves the whole order, so it must be able to carry all of them —
 * an account that covers two of three products would leave the third with
 * nowhere to load. When no account covers the set, every list comes back empty,
 * which is the honest answer: this combination cannot be loaded from one place.
 */
export const loadOptions = (
  products: string[],
  terminal?: string,
  supplier?: string
) => {
  const needed = [...new Set(products)];
  const covering = LOADING_ACCOUNTS.filter((a) =>
    needed.every((p) => a.products.includes(p))
  );
  const forTerminal = terminal
    ? covering.filter((a) => a.terminal === terminal)
    : covering;
  const forSupplier = supplier
    ? forTerminal.filter((a) => a.supplier === supplier)
    : forTerminal;
  return {
    terminals: uniqueSorted(covering.map((a) => a.terminal)),
    suppliers: uniqueSorted(forTerminal.map((a) => a.supplier)),
    accounts: uniqueSorted(forSupplier.map((a) => a.name)),
    /** No single account covers this product set. */
    impossible: needed.length > 0 && covering.length === 0,
  };
};


/** A vendor's submitted quote (§5.9 / §5.20). Shape follows the order's kind. */
/**
 * ONE LINE OF A PARTNER'S QUOTE — what they charge to move this product.
 *
 * It mirrors the order line it prices, because a quote that could not be laid
 * beside the order line by line could not be compared with the customer price
 * at all, which is the whole reason a broker reads one.
 */
export interface QuoteLine {
  /** Matches an `OrderLine.asset` on the same order. */
  asset: string;
  /** (B) What the vendor charges per gallon delivered. */
  ratePerGal: number;

  /**
   * THE PARTNER'S RATE FOR EACH OF THE LINE'S CHARGES, keyed by `LineCharge.id`.
   *
   * The CHARGE is defined on the order line, once, so the pricing unit can lay
   * the two sides against each other row for row; what is per-partner is only
   * the figure. A key with no charge behind it any more is simply not read —
   * removing a charge from the order does not have to reach into every quote.
   */
  rates: Record<string, number>;
}

export interface VendorQuote {
  vendorId: string;
  /** Per order line. Everything else about a quote is derived from these. */
  lines: QuoteLine[];
  /**
   * FREIGHT — the one carrier charge that belongs to no product. It is the
   * truck coming out, charged once for the run whoever supplies the fuel; the
   * partner's fees and taxes moved onto the LINES, because those are charged
   * on what is in the tank. See `quoteTotal`.
   */
  freight: number;
  /**
   * WHAT THE PARTNER SAID WITH THE PRICE, and what they sent with it.
   *
   * A quote is rarely only numbers: it expires, or it assumes a wait-time cap,
   * or it comes off a rate sheet that has to be read before anyone accepts it.
   * Both are the partner's, so both are read-only in the review sheet and typed
   * by the broker in the draft one.
   */
  note?: string;
  attachments?: string[];
  /** Entered by the dispatcher on the vendor's behalf (Pavan, 2026-10-06). */
  byDispatcher?: boolean;
}

/**
 * A FEE THAT IS NOT ABOUT A PRODUCT — charged once for the run, whatever is on
 * the truck.
 *
 * Most fees ARE about a product and are per gallon; they live on the order
 * line beside the margin. What is left is this: an after-hours callout, a
 * split delivery, a demurrage charge. They cannot be per gallon because they
 * are not about gallons, so the amount is a flat figure (Pavan, 2026-09-22).
 *
 * THE KIND IS PICKED, NOT TYPED. A free-text fee name is a fee nobody can
 * report on — "After hours", "after-hours", "AH callout" are three fees to a
 * spreadsheet and one to a person. `ORDER_FEE_KINDS` is the list.
 */
export interface OrderFee {
  /** Which way the money goes and what it is — see `ORDER_FEE_TYPES`. */
  type: OrderFeeType;
  /** WHICH fee this one is — picked from `ORDER_FEE_LABELS`, or typed. */
  label: string;
  amount: number;
}

/**
 * WHAT KIND OF LINE THIS IS, and it is not decoration: a Discount SUBTRACTS.
 *
 * Type and label are two different questions. The type is the handful of
 * things a run-level line can BE — money on, money off, duty — and the label
 * is which one of them it is. One select and one name, rather than one list
 * that has to carry both and grows a row every time either changes.
 */
export const ORDER_FEE_TYPES = ["Fee", "Discount", "Tax"] as const;
export type OrderFeeType = (typeof ORDER_FEE_TYPES)[number];

/**
 * THE LABELS A RUN-LEVEL LINE CAN CARRY. One vocabulary, so two orders with the
 * same charge on them say it the same way — "After hours", "after-hours" and
 * "AH callout" are three fees to a report and one to a person. The field is
 * still typeable, because the list cannot have foreseen every customer's
 * arrangement, but the list is what it offers first.
 *
 * Delivery fee is in here rather than a field of its own — it was the only
 * order-level fee the model had, which made every other one impossible to
 * record. It is a label like the rest.
 */
export const ORDER_FEE_LABELS: string[] = [
  "Delivery fee",
  "After-hours delivery",
  "Split delivery",
  "Wait time",
  "Demurrage",
  "Minimum load fee",
  "Environmental fee",
  "Hazmat handling",
  "Pump fee",
  "Re-delivery fee",
];

/** What the run's own lines come to — a Discount comes off, the rest go on. */
export function orderFeesTotal(fees: OrderFee[] | undefined): number {
  return (fees ?? []).reduce(
    (sum, f) => sum + (f.type === "Discount" ? -(f.amount || 0) : f.amount || 0),
    0
  );
}

/**
 * ONE SAVE, ONE ENTRY.
 *
 * The unit of the trail is the SESSION, not the keystroke: someone opens an
 * order, changes four things and presses Save, and what happened is one edit
 * with four parts. A row per field would bury the shape of the change under
 * its pieces, and the timestamp would be a lie in three of the four rows — the
 * time recorded is the time it was SAVED, because that is the moment anything
 * became true.
 */
export interface AuditEntry {
  /** ISO instant of the save. */
  at: string;
  /** Who saved it. */
  by: string;
  /** One line per thing that changed, already in words. */
  changes: string[];
}

/** See `BrokerOrder.invoiceState`. */
export type InvoiceState = "none" | "requested" | "received";

/* SEVEN LONG, NOT THREE. A day's worth of orders is every 24th row, and 24 is
   a multiple of 3 — a three-step cycle handed every card on the board the same
   state. Seven shares no factor with 24, so one day walks the whole cycle. */
const INVOICE_CYCLE: InvoiceState[] = [
  "none",
  "requested",
  "received",
  "requested",
  "received",
  "none",
  "received",
];

export interface BrokerOrder {
  id: string;
  /** "D-104882" or "M-104883" — the prefix is derived from `kind`, never typed. */
  orderNo: string;
  kind: OrderKind;
  orderType: BrokerOrderType;
  /** Customer name over its ERP id — the same two-line cell the Sales lists use. */
  customer: TwoLine;
  /** The delivery site. Always a `SHIP_TO_SITES` name — see the note there. */
  shipTo: string;
  /** Planned date, formatted, over its relative label. */
  date: TwoLine;
  /** `YYYY-MM-DD` — what the toolbar's date stepper matches. */
  dateKey: string;
  /** The §5.3 start/end delivery window, e.g. `{ start: "8:00 AM", end: "12:00 PM" }`. */
  window: { start: string; end: string };
  /** PREFERRED TIMES inside the window, minutes from midnight (Pavan,
      2026-10-20 — the shared delivery timeline). */
  preferred?: { start: number; end: number }[];
  lines: OrderLine[];
  status: BrokerStatus;
  /**
   * The partner whose QUOTE THE BROKER ACCEPTED — the one that holds the order.
   * Null until the broker picks, which is a separate act from a partner saying
   * yes: a partner accepting an invitation only earns the right to quote.
   */
  vendorId: string | null;
  /** Every vendor invited. More than one is normal. */
  invitedVendorIds: string[];
  /**
   * WHICH OF THEM THE INVITATION ACTUALLY WENT TO.
   *
   * Listing a partner and asking them are two acts, and a draft is exactly
   * where the gap between them lives: the broker lines up five carriers and
   * sends to three of them today. It used to be DERIVED — "an order past Draft
   * had its invitations sent" — which cannot describe that draft at all, so
   * closing the sheet forgot who had been asked.
   *
   * Always a subset of `invitedVendorIds`; `assertConsistent` says so.
   */
  sentVendorIds: string[];
  /**
   * Partners that ACCEPTED THE INVITATION. This is what moves an order out of
   * Quoting and into Assigned — the first of the two things a partner does.
   * The second is sharing a quote, which is `quotes` below.
   */
  acceptedVendorIds: string[];
  /** Which of the three lines this order runs on — see `SERVICE_LINES`. */
  serviceLine: ServiceLine;
  /**
   * Which business inside that line — see `LINE_BUSINESSES`. `null` on the
   * lines whose businesses have not been written down yet, which is honest
   * rather than provisional: there is no default to fall back to.
   */
  business: string | null;
  /** §5.9 — the broker asked for pricing instead of a plain acknowledgement. */
  quoteRequested: boolean;
  quotes: VendorQuote[];
  /** Fees charged once for the run, belonging to no product — see `OrderFee`. */
  orderFees: OrderFee[];
  /**
   * Where the vendor's BILL has got to. Three states, one at a time:
   *
   *   none      nobody has asked for it yet
   *   requested asked, and the ball is with the vendor
   *   received  it arrived, and somebody has to look at it
   *
   * Separate from `quotes`: a quote is what the job WILL cost and is agreed
   * before the work; an invoice is what it DID cost and arrives after. They
   * were being shown in the same footer, so one card offered "review the
   * pricing" and "ask for the bill" at the same time.
   */
  invoiceState: InvoiceState;
  /** When the invoice was asked for — the board card says how long ago
   *  (Pavan, 2026-10-28). Set with `invoiceState: "requested"`. */
  invoiceRequestedAt?: Date;
  urgent: boolean;
  signatureOnDelivery: boolean;
  poNumber: string;
  /** Bill of lading number (Pavan, 2026-10-29). Optional, typed. */
  bolNumber: string;
  zip: string;
  state: string;
  createdBy: string;
  /** Who drives it — set once a vendor holds the order (Pavan, 2026-10-27).
   *  A `DRIVERS` name. */
  driver?: string;
  tags: string[];
  /** Every save that changed something, newest last. */
  audit: AuditEntry[];
  /** Set only on a recurring order. `null` on every other kind. */
  recurrence: { fromDateKey: string; frequency: string } | null;
  /**
   * Where each PRODUCT on the order is drawn from. One row per distinct
   * product, because a product is what a terminal and an account are chosen
   * for — two assets carrying the same product load once, together.
   *
   * `null` while the load order has not been created: it is optional, and an
   * empty array would be indistinguishable from "created but not filled".
   */
  loadOrder:
    | {
        product: string;
        terminal: string;
        supplier: string;
        loadingAccount: string;
        /** Set aside on the order without being deleted from it. */
        excluded?: boolean;
      }[]
    | null;
  hub: string;
  /**
   * WHETHER THE HAUL IS BOUGHT IN OR RUN ON OUR OWN FLEET. The first thing
   * decided about an order, because it changes who fulfils it. Every seeded
   * order is Brokerage — all of them went out to a partner.
   */
  jobType: JobType;
  primaryPoc: string;
  /**
   * MORE PEOPLE TO CALL. A LIST, because the movement sheet already collects
   * several and the order sheet collects one — storing the singular would
   * throw away the second and third the moment a movement was created.
   * Empty when the primary is the only contact.
   */
  secondaryPocs: string[];
  salesperson: string;
  instructions: string;
  /** Never sent to the partner or the customer. `""` when nobody wrote one. */
  internalNote: string;
  /** The whole load is a winter blend — one flag for the order, not per line. */
  winterAdditive: boolean;
  /**
   * The per-order kill switch for partner email. OFF by default: this switch
   * mails people outside the building, so sending is the deliberate act.
   */
  notifyVendor: boolean;
  /**
   * WHEN THE DELIVERY ACTUALLY HAPPENED. ISO, `null` until it has.
   *
   * The board is scoped to the day an order was PLANNED for, and past the
   * delivery that is the wrong date to be reading: what a finished order is
   * asked is when it was done, not when it was meant to be. Stored rather than
   * dug out of the audit trail — a trail is a list of changes, and the one
   * that matters here has to survive being summarised.
   */
  completedAt: string | null;
  /** Only ever set on `Blocked` — the credit reason shown on the card. */
  blockedReason: string | null;
  /** Only ever set on `Partially Synced` — the accounting system's own error
   *  message, shown on the order. Cleared when the order leaves that status. */
  syncError?: string | null;
  /** Movement orders only. */
  movement: {
    direction: MovementDirection;
    /* THE TWO ENDS, AS THEY WILL BE READ. A single `yard` could describe the
       two routes that have one; a transfer has none and a relocate has two,
       so the field that survives all four is the route itself. */
    from: string;
    to: string;
    tankType: string;
    capacityGal: number;
  } | null;
}

/** Sum of the requested gallons. Top-off lines contribute nothing — they have no
 *  requested volume, and counting them as 0 is the honest arithmetic. */
export function totalGal(lines: OrderLine[]): number {
  /* A topped-off line contributes NO stated gallons — how much goes in is
     decided at the tank. It may still carry the number someone typed before
     ticking the box, which is kept so unticking hands it back; summing that
     would put gallons into a total nobody promised. */
  return lines.reduce((sum, l) => sum + (l.topOff || (l.unit ?? "gal") !== "gal" ? 0 : (l.gal ?? 0)), 0);
}

/* QUANTITY UNITS BY KIND OF ASSET (Pavan, 2026-10-29). Fuel only ever in
   gallons; bulk lubricants gal / mL / oz; packaged products add each, pounds,
   quarts and tubes. */
export const QTY_UNITS = ["gal", "EA", "LB", "QT", "Tube", "mL", "oz"] as const;
export type QtyUnit = (typeof QTY_UNITS)[number];
export type AssetCategory = "Fuel" | "Bulk Lubricants" | "Packaged Products";
/** WHICH TAB AN ASSET SITS UNDER — by what it holds. A lube asset that is a
 *  drum, tote, jug, pail or case is packaged; any other lube asset is bulk;
 *  everything else (fuel, DEF, propane) is Fuel. */
export const categoryOfAsset = (name: string, product: string | undefined): AssetCategory => {
  if ((product ? lineOfProduct(product) : "Fuel") !== "Lubricants") return "Fuel";
  return /drum|tote|jug|pail|case/i.test(name) ? "Packaged Products" : "Bulk Lubricants";
};
export const unitsFor = (c: AssetCategory): readonly QtyUnit[] =>
  c === "Fuel"
    ? ["gal"]
    : c === "Bulk Lubricants"
      ? ["gal", "mL", "oz"]
      : ["EA", "LB", "QT", "Tube", "gal", "mL", "oz"];

/** True when every line is a top-off, so the Qty cell reads "Top-off", not "0". */
export function isAllTopOff(lines: OrderLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.topOff);
}

/**
 * IS THIS DRAFT READY TO SEND? Everything the order needs before anyone can be
 * asked to take it: who it is for, where it goes, when, what is on it, and at
 * least one partner to ask. A draft that is ready and a draft that is half
 * typed look identical in a lane of eight, which is the whole reason the card
 * says which it is.
 */
export function isOrderReady(r: BrokerOrder): boolean {
  return (
    r.customer.title.trim() !== "" &&
    r.shipTo.trim() !== "" &&
    r.dateKey !== "" &&
    r.lines.length > 0 &&
    r.lines.every((l) => l.asset.trim() !== "") &&
    r.invitedVendorIds.filter(Boolean).length > 0
  );
}

/**
 * WHAT IS WORTH WRITING DOWN — the diff that becomes one audit entry.
 *
 * NOT EVERY SAVE (Pavan, 2026-09-23, the approved list). The log records what
 * changes the order's STAGE, WHO holds it, WHEN it runs and WHAT IT COSTS —
 * with the old value and the new, because "Status: Quoting → Assigned"
 * answers the question the trail is opened for. PO number, contacts, sales
 * person, job type, tags, instructions, notes, the winter-additive and
 * partner-email flags are edits, not events, and are left out.
 */
export function diffOrder(a: BrokerOrder, b: BrokerOrder): string[] {
  const out: string[] = [];
  const say = (label: string, from: unknown, to: unknown) => {
    if (String(from ?? "") === String(to ?? "")) return;
    out.push(`${label}: ${from || "—"} → ${to || "—"}`);
  };
  /* STAGE — and why, when the stage is Blocked. */
  if (a.status !== b.status)
    out.push(
      `Status: ${a.status} → ${b.status}${
        b.status === "Blocked" && b.blockedReason
          ? ` · ${b.blockedReason}`
          : b.status === "Partially Synced" && b.syncError
            ? ` · ${b.syncError}`
            : ""
      }`
    );
  /* WHEN. */
  say("Planned date", a.date.title, b.date.title);
  say(
    "Delivery window",
    `${a.window.start}–${a.window.end}`,
    `${b.window.start}–${b.window.end}`
  );
  say("Urgent", a.urgent ? "yes" : "no", b.urgent ? "yes" : "no");

  /* WHO — asked, answered, holding the order. */
  const names = (ids: string[]) =>
    ids.filter(Boolean).map((id) => VENDORS.find((v) => v.id === id)?.name ?? id);
  say("Vendors invited", names(a.invitedVendorIds).join(", "), names(b.invitedVendorIds).join(", "));
  say("Acknowledged", names(a.acceptedVendorIds).join(", "), names(b.acceptedVendorIds).join(", "));
  say(
    "Vendor finalized",
    names(a.vendorId ? [a.vendorId] : []).join(""),
    names(b.vendorId ? [b.vendorId] : []).join("")
  );

  /* WHAT — the products and gallons, but only once a price is on them: a
     change after the quotes are in is what makes those quotes stale. */
  if (a.quotes.length > 0) {
    const shape = (r: BrokerOrder) =>
      r.lines
        .map((l) => `${l.asset || "?"} ${l.product} ${l.topOff ? "top-off" : `${l.gal ?? 0} gal`}`)
        .join(" · ");
    say("Products", shape(a), shape(b));
  }
  const delivered = (r: BrokerOrder) =>
    r.lines.every((l) => l.deliveredGal == null)
      ? ""
      : r.lines.map((l) => `${l.asset || "?"} ${l.deliveredGal ?? 0} gal`).join(" · ");
  say("Delivered", delivered(a), delivered(b));

  /* WHAT IT COSTS — a quote received or rewritten, and the broker's price. */
  const priced = (r: BrokerOrder) =>
    r.quotes
      .map((q) => `${VENDORS.find((v) => v.id === q.vendorId)?.name ?? q.vendorId} ${money2(quoteTotal(q, r.lines))}`)
      .join(" · ");
  say("Vendor pricing", priced(a), priced(b));
  if (customerTotal(a.lines) > 0 || customerTotal(b.lines) > 0)
    say("Customer pricing", money2(customerTotal(a.lines)), money2(customerTotal(b.lines)));
  return out;
}

/** One helper, app-wide — `MONEY` in `../data`. */
const money2 = MONEY;

/** Gallons a line is priced on — what was delivered if known, else requested. */
export function billableGal(l: OrderLine): number {
  return l.deliveredGal ?? l.gal ?? 0;
}

/**
 * TOTAL LANDING COST for one line — D x (B + C), the vendor's rate and its
 * margin over the gallons actually moved. "Landing" because it is what the
 * product costs the broker once it is on the ground: the whole point of the
 * column is that a low rate with a high margin is not a cheap quote.
 */
export function quoteLineTotal(q: QuoteLine, l: OrderLine): number {
  return billableGal(l) * (q.ratePerGal + quoteLineChargeRate(q, l));
}

/** What the partner adds per gallon on this line — every charge it carries. */
export function quoteLineChargeRate(q: QuoteLine, l: OrderLine): number {
  return (l.charges ?? []).reduce((sum, c) => sum + (q.rates?.[c.id] ?? 0), 0);
}

/**
 * THE BASE PRICE — the product itself, at the partner's rate plus margin.
 *
 * It is only the partner's to charge when the partner is the one supplying the
 * product. See `quoteTotal`.
 */
export function quoteBaseTotal(q: VendorQuote, lines: OrderLine[]): number {
  return q.lines.reduce((sum, ql) => {
    const l = lines.find((x) => x.asset === ql.asset);
    return sum + (l ? quoteLineTotal(ql, l) : 0);
  }, 0);
}

/** (B) alone — the product at the partner's rate, without their per-gallon add-on. */
export function quoteProductTotal(q: VendorQuote, lines: OrderLine[]): number {
  return q.lines.reduce((sum, ql) => {
    const l = lines.find((x) => x.asset === ql.asset);
    return sum + (l ? billableGal(l) * ql.ratePerGal : 0);
  }, 0);
}

/**
 * ONE KIND OF CHARGE, ACROSS THE WHOLE QUOTE — every Margin the partner
 * charges, or every Tax, or every Fee. A product can carry more than one of
 * each, so this sums the kind rather than reading a single field.
 *
 * A PARTNER'S MARGIN IS ALWAYS THEIRS TO CHARGE, whoever bought the fuel: the
 * broker owning the product does not stop the partner charging for wait time
 * and tolls to haul it. It is the PRICE a load order strikes, not this.
 */
export function quoteChargeTotal(
  q: VendorQuote,
  lines: OrderLine[],
  kind: LineChargeKind
): number {
  return q.lines.reduce((sum, ql) => {
    const l = lines.find((x) => x.asset === ql.asset);
    if (!l) return sum;
    const rate = (l.charges ?? [])
      .filter((c) => c.kind === kind)
      .reduce((r, c) => r + (ql.rates?.[c.id] ?? 0), 0);
    return sum + billableGal(l) * rate;
  }, 0);
}

/** Everything the partner adds on top of the product, over the whole quote. */
export function quoteChargesTotal(q: VendorQuote, lines: OrderLine[]): number {
  return q.lines.reduce((sum, ql) => {
    const l = lines.find((x) => x.asset === ql.asset);
    return sum + (l ? billableGal(l) * quoteLineChargeRate(ql, l) : 0);
  }, 0);
}

/** Freight — charged on every order, whoever brings the fuel. */
export function quoteFreight(q: VendorQuote): number {
  return q.freight;
}

/**
 * What the partner charges for the whole order — and it depends on WHO BOUGHT
 * THE FUEL.
 *
 * A LOAD ORDER IS THE BROKER BUYING THE PRODUCT. When one exists, the partner
 * is hauling fuel that is already yours: there is no base price to charge, and
 * the quote is freight, fees and taxes alone. With no load order the partner
 * sources the product as well, so the base price — product plus their margin —
 * is theirs to charge on top.
 *
 * `chargesBase` is that fact, passed in rather than guessed: the quote does not
 * know whether the order it belongs to has a load order.
 */
export function quoteTotal(
  q: VendorQuote,
  lines: OrderLine[],
  chargesBase = true
): number {
  return (
    (chargesBase ? quoteProductTotal(q, lines) : 0) +
    quoteChargesTotal(q, lines) +
    quoteFreight(q)
  );
}

/**
 * One line's revenue — the gallons times everything charged on that product:
 * its price, the margin on it, and the tax and fee it carries.
 */
export function customerLineChargeRate(l: OrderLine): number {
  return (l.charges ?? []).reduce((sum, c) => sum + (c.perGal ?? 0), 0);
}

/** One kind of charge on one line, over the gallons it is priced on. */
export function customerChargeTotal(
  l: OrderLine,
  kind: LineChargeKind
): number {
  return (
    billableGal(l) *
    (l.charges ?? [])
      .filter((c) => c.kind === kind)
      .reduce((sum, c) => sum + (c.perGal ?? 0), 0)
  );
}

export function customerLineTotal(l: OrderLine): number {
  return (
    billableGal(l) *
    ((l.pricePerGal ?? 0) + customerLineChargeRate(l))
  );
}

/** What the customer pays for the whole order. */
export function customerTotal(
  lines: OrderLine[],
  fees?: OrderFee[],
  /**
   * The partner's fees and taxes, when they are the customer's to pay.
   *
   * WHOEVER HOLDS THE LOAD ORDER PAYS THEM. With a load order the product is
   * already the broker's and the partner only hauls it, so the fees and taxes
   * on the load are billed through to the customer rather than sitting in the
   * partner's total. The split is stated in one place — here — so the two
   * columns of the pricing unit cannot both claim the same money.
   */
  passedThrough = 0
): number {
  return (
    lines.reduce((sum, l) => sum + customerLineTotal(l), 0) +
    orderFeesTotal(fees) +
    passedThrough
  );
}

export type BrokerColumnKey =
  | "order"
  | "type"
  | "customer"
  | "shipTo"
  | "date"
  | "window"
  | "products"
  | "qty"
  | "vendor"
  | "status"
  | "createdBy"
  | "driver"
  /* OFF BY DEFAULT. Eleven columns is what fits and what most people want; the
     rest are real fields that some readers need and most do not, so they wait
     in the column menu rather than in the table. A list that shipped every
     field it HAS would be a list nobody could read. */
  | "business"
  | "orderType"
  | "poNumber"
  | "bolNumber"
  | "hub"
  | "salesperson"
  | "tags"
  | "actions";

export interface BrokerColumnDef {
  key: BrokerColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "left" | "right";
}

/** Widths follow the DS column-frame vocabulary; actions = 44 as everywhere. */
export const BROKER_COLUMNS: BrokerColumnDef[] = [
  /* TYPE IS ITS OWN COLUMN, and it matches Sales exactly — same header, same
     70px, same position after the number, same disc. A reader who has learnt
     one orders table has learnt both; a type folded into the number column
     here and standing alone there means the same fact lives in two places
     depending on which module you opened, which is the one thing repeated
     table patterns must not do. */
  /* EVERY COLUMN SORTS. Half of them did, and which half was not a rule
     anybody could state — it was whichever ones somebody had needed so far.
     A header that sorts on one column and not the next teaches the reader to
     stop trying, and the ones left out were the text columns, which are
     exactly where "show me these together" is asked most. See `sortValue` for
     what each one sorts BY, which is the part that is worth deciding. */
  { key: "order", label: "Order #", width: 100, sortable: true },
  { key: "type", label: "Type", width: 150, sortable: true },
  { key: "customer", label: "Customer", width: 250, sortable: true },
  { key: "shipTo", label: "Ship To", width: 170, sortable: true },
  { key: "date", label: "Planned Date", width: 120, sortable: true },
  { key: "window", label: "Delivery Window", width: 160, sortable: true },
  { key: "products", label: "Products", width: 170, sortable: true },
  { key: "qty", label: "Qty (Gal)", width: 100, sortable: true },
  { key: "vendor", label: "Vendor", width: 200, sortable: true },
  { key: "driver", label: "Driver", width: 160, sortable: true },
  { key: "status", label: "Status", width: 140, sortable: true },
  /* CREATED BY LIVES ON THE ORDER (Pavan, 2026-10-27) — off the table. */
  /* ── Available, not shown. See `BROKER_HIDDEN_BY_DEFAULT`. ── */
  { key: "business", label: "Business", width: 140, sortable: true },
  { key: "orderType", label: "Order Type", width: 140, sortable: true },
  { key: "poNumber", label: "PO Number", width: 140, sortable: true },
  { key: "bolNumber", label: "BOL Number", width: 140, sortable: true },
  { key: "hub", label: "Hub", width: 160, sortable: true },
  { key: "salesperson", label: "Sales Person", width: 170, sortable: true },
  { key: "tags", label: "Tags", width: 160, sortable: true },
  { key: "actions", label: "", width: 44 },
];

/** The columns the table opens without. Everything else is on. */
export const BROKER_HIDDEN_BY_DEFAULT: BrokerColumnKey[] = [
  "business",
  "orderType",
  "poNumber",
  "bolNumber",
  "hub",
  "salesperson",
  "tags",
];

export const HUBS = ["Fresno Hub", "Bakersfield Hub", "Sacramento Hub"];

export const POCS = [
  "Marisol Vega",
  "Dwight Feeney",
  "Anita Kaur",
  "Ray Obuya",
  "Colleen Marsh",
];

/* POC_DIRECTORY, SHIP_TO_POCS and pocsAt moved to ../pocs (Pavan,
   2026-10-29: the POC card is in every module's order sheet). */
export { POC_DIRECTORY, SHIP_TO_POCS, pocsAt } from "../pocs";

/** Same rule as the POC directory — a salesperson's number follows the person. */
export const SALES_CONTACTS: Record<string, string> = {
  "Dana Whitfield": "+1-415-555-0210",
  "Marcus Reed": "+1-661-555-0233",
  "Priya Raman": "+1-916-555-0247",
  "Tom Alvarez": "+1-713-555-0269",
};

/**
 * Listing Type — the reference calls this field Listing Type on the order sheet
 * and shows "Core" in it, which is the same vocabulary the Order Type field
 * carries. Treated as ONE field under the reference's label rather than
 * duplicated, since two required selects offering the same values would be a
 * bug waiting to be reported.
 */
export const LISTING_TYPES: BrokerOrderType[] = [
  "Core",
  "Delivery",
  "Emergency",
  "Extraction",
];

/**
 * Recurrence cadences. The first five are phrased against the order's own date
 * — "Monthly On First Thursday" says what will happen, where a bare "Monthly"
 * leaves the reader to work out which day. "Custom" opens the rule builder.
 */
export const RECURRENCE_FREQUENCIES = [
  "Daily",
  "Weekly On Thursday",
  "Monthly On First Thursday",
  "Annually On September 3",
  "Every Weekday (Monday To Friday)",
  "Custom",
];

export const SALESPEOPLE = [
  "Dana Whitfield",
  "Marcus Reed",
  "Priya Raman",
  "Tom Alvarez",
];

/**
 * The broker's own yards — where a movement order starts or ends.
 *
 * A ROW, NOT A NAME. The sheet shows a yard's address the moment one is chosen,
 * the same way it shows a ship-to's, and a list of three strings could not
 * answer that. `YARDS` is derived from this so the two can never disagree.
 *
 * INVENTED, like `SHIP_TO_SITES` — real yards were never captured. Each sits in
 * the town it is named for, so a route reads as a route.
 */
export const YARD_SITES = [
  {
    name: "Fresno Yard",
    street: "3140 S East Ave",
    city: "Fresno",
    state: "California",
    zip: "93725",
    latLng: "36.69540, -119.75620",
  },
  {
    name: "Turlock Yard",
    street: "901 N Golden State Blvd",
    city: "Turlock",
    state: "California",
    zip: "95380",
    latLng: "37.51380, -120.85410",
  },
  {
    name: "Kern Yard",
    street: "6215 Rosedale Hwy",
    city: "Bakersfield",
    state: "California",
    zip: "93308",
    latLng: "35.38210, -119.08760",
  },
];

export const YARDS = YARD_SITES.map((y) => y.name);

/**
 * Statuses the FILTER offers, which is a longer list than the board's lanes.
 *
 * `BROKER_STATUSES` above is the LIFECYCLE — the lanes the board renders, in
 * order. Overdue, Canceled and Partially Synced are filterable states
 * that are not lanes: Overdue is a derived condition rather than a stage,
 * Canceled is a terminal exit, and Partially Synced sits between two
 * lanes. Keeping the two lists apart means adding a filter option never
 * silently adds a board lane.
 */
export const BROKER_STATUS_FILTERS = [
  "Overdue",
  "Created / Draft",
  "Quoting",
  "Assigned",
  "Completed",
  "Review",
  "Verified",
  "Partially Synced",
  "Synced",
  "Canceled",
  "Blocked",
];

/* Ship-to geography. INVENTED — real addresses were never captured, so these
   are plausible sites across several US states, which is what the ship-to
   facets need to be judged on at all. */
/** `8:00 AM – 12:00 PM` — the single value the Delivery Window select shows. */
export const formatWindow = (w: { start: string; end: string }) =>
  `${w.start} – ${w.end}`;

/**
 * The delivery sites. THE single source for a ship-to on a broker order: the
 * name the order stores, the address the filter and the sheet show, and the
 * coordinates the sheet displays all come from one row here.
 *
 * INVENTED — real sites were never captured. Spread across six states so the
 * ship-to facets have something to be judged on.
 */
const LISTED_SITES = [
  {
    name: "Bray North Yard",
    street: "4820 N Golden State Blvd",
    city: "Fresno",
    state: "California",
    zip: "93706",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34007",
    latLng: "36.81120, -119.83450",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "180 asset", product: "Dyed Diesel", rental: true }, { name: "181 asset", product: "Clear Diesel #2", rental: false }, { name: "Asset 1", product: "Unleaded 87", rental: true }, { name: "VEND TANK", product: "Dyed Diesel", rental: false }, { name: "Lube Skid 2", product: "Engine Oil 15W-40", rental: true }, { name: "LP Tank 500", product: "Propane HD-5", rental: true }],
  },
  {
    name: "Bray Depot 2",
    street: "1177 Weedpatch Hwy",
    city: "Bakersfield",
    state: "California",
    zip: "93307",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34014",
    latLng: "35.34210, -118.94860",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Asset 1", product: "Clear Diesel #2", rental: true }, { name: "Asset 2", product: "Unleaded 91", rental: false }, { name: "Yard Tank 4", product: "DEF Bulk", rental: false }, { name: "Lube Drum Rack", product: "Hydraulic Oil AW-46", rental: false }, { name: "LP Tank 1000", product: "Propane Commercial", rental: true }],
  },
  {
    name: "Morris Yard 4",
    street: "930 Richards Blvd",
    city: "Sacramento",
    state: "California",
    zip: "95815",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34021",
    latLng: "38.60130, -121.48210",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Tank 104", product: "Dyed Diesel", rental: false }, { name: "Tank 105", product: "Clear Diesel #2", rental: false }, { name: "Lube Skid", product: "Hydraulic Oil AW-46", rental: true }, { name: "LP Tank 250", product: "Propane HD-5", rental: true }],
  },
  {
    name: "GPM Southside",
    street: "12600 Federal Rd",
    city: "Houston",
    state: "Texas",
    zip: "77029",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34028",
    latLng: "29.78440, -95.23110",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Southside A", product: "Unleaded 87", rental: false }, { name: "Southside B", product: "Unleaded 91", rental: false }, { name: "DEF Tote 2", product: "DEF Bulk", rental: true }],
  },
  {
    name: "Halvorsen Main",
    street: "6215 S Union Ave",
    city: "Tulsa",
    state: "Oklahoma",
    zip: "74107",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34035",
    latLng: "36.08320, -96.00410",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Main Bulk", product: "Clear Diesel #2", rental: false }, { name: "Main Skid", product: "Dyed Diesel", rental: true }],
  },
  {
    name: "Cardinal Hub A",
    street: "2401 Front St",
    city: "Toledo",
    state: "Ohio",
    zip: "43605",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34042",
    latLng: "41.64470, -83.51190",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Hub Tank 1", product: "Dyed Diesel", rental: false }, { name: "Hub Tank 2", product: "Unleaded 87", rental: false }, { name: "Rental Skid 9", product: "Clear Diesel #2", rental: true }],
  },
  {
    name: "Westbrook Farm 1",
    street: "3810 40th St S",
    city: "Fargo",
    state: "North Dakota",
    zip: "58102",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34049",
    latLng: "46.83190, -96.85640",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Farm Tank", product: "Dyed Diesel", rental: false }, { name: "Farm DEF", product: "DEF Bulk", rental: false }],
  },
  {
    name: "Ironline Depot",
    street: "1720 Dean Forest Rd",
    city: "Savannah",
    state: "Georgia",
    zip: "31408",
    /** The ship-to's own ERP ID (Pavan, 2026-10-29). INVENTED. */
    erpId: "ST-34056",
    latLng: "32.10650, -81.19980",
    /* The assets standing AT this site. The order sheet lists these to be
       ticked; it never asks anyone to type an asset name. */
    assets: [{ name: "Depot Bulk", product: "Clear Diesel #2", rental: false }, { name: "Depot Lube", product: "Hydraulic Oil AW-46", rental: true }, { name: "Depot 87", product: "Unleaded 87", rental: false }],
  },
];

/** One asset standing at a site. `monitor` pins whether it reports a level;
 *  unset, the seeded draw in `siteTank` decides. */
export interface SiteAsset {
  name: string;
  product: string;
  rental: boolean;
  monitor?: boolean;
}

/* A FULL RANGE AT EVERY SITE (Pavan, 2026-10-29) — every tab of the asset
   picker (Fuel with and without a tank monitor, Bulk Lubricants, Packaged
   Products) has at least three assets at every ship-to. INVENTED; the
   products rotate by site so no two sites read alike. */
const FUEL_ROTATION = ["Dyed Diesel", "Clear Diesel #2", "Unleaded 87", "Unleaded 91", "DEF Bulk"];
const LUBE_ROTATION = ["Hydraulic Oil AW-46", "Engine Oil 15W-40"];
const fullRange = (i: number): SiteAsset[] => {
  const fuel = (k: number) => FUEL_ROTATION[(i + k) % FUEL_ROTATION.length];
  const lube = (k: number) => LUBE_ROTATION[(i + k) % LUBE_ROTATION.length];
  return [
    ...[1, 2, 3].map((n) => ({ name: `Bulk Tank ${n}`, product: fuel(n), rental: (i + n) % 3 === 0, monitor: true })),
    ...[1, 2, 3].map((n) => ({ name: `Day Tank ${n}`, product: fuel(n + 2), rental: (i + n) % 4 === 0, monitor: false })),
    ...[1, 2, 3].map((n) => ({ name: `Lube Bulk ${n}`, product: lube(n), rental: (i + n) % 3 === 1 })),
    { name: "Drum Rack 1", product: lube(0), rental: false },
    { name: "Pail Shelf 1", product: lube(1), rental: false },
    { name: "Case Cage 1", product: lube(0), rental: i % 2 === 0 },
  ];
};

export const SHIP_TO_SITES = LISTED_SITES.map((s, i) => ({
  ...s,
  assets: [...(s.assets as SiteAsset[]), ...fullRange(i)],
}));

/** Every asset name known across sites — what the Add Asset combobox offers. */
export const ALL_ASSET_NAMES = [
  ...new Set(SHIP_TO_SITES.flatMap((s) => s.assets.map((a) => a.name))),
].sort();

/** `4820 N Golden State Blvd, Fresno, CA 93706` — the line shown under a site.
 *  Takes the address fields alone, so a yard and a ship-to print identically. */
export const siteAddress = (s: {
  street: string;
  city: string;
  state: string;
  zip: string;
}) => `${s.street}, ${s.city}, ${STATE_ABBR[s.state] ?? s.state} ${s.zip}`;

const STATE_ABBR: Record<string, string> = {
  California: "CA",
  Texas: "TX",
  Oklahoma: "OK",
  Ohio: "OH",
  "North Dakota": "ND",
  Georgia: "GA",
};

/**
 * What the "Order Types" facet offers. It is deliberately a MIXED predicate,
 * because the reference panel is: Urgent is a flag, Movement is the order kind,
 * and the other four are the Order Type field. One question a broker asks
 * ("what kind of work is this?"), so one facet — rather than three facets that
 * each answer a third of it.
 */
export const ORDER_TYPE_FILTERS = [
  "Urgent Orders",
  "Recurring",
  "Movement",
  "Core",
  "Delivery",
  "Emergency",
  "Extraction",
];

/* WHAT THE ACCOUNTING SYSTEM SAYS WHEN A SYNC FAILS. INVENTED — plausible
   back-office rejections, so a Partially Synced order has a real reason to
   show. The message is the useful part of that status. */
export const SYNC_ERRORS = [
  "Customer account not found in accounting — create or map the customer first.",
  "Item \"Dyed Diesel\" has no income account mapped.",
  "Invoice date falls in a closed accounting period.",
  "Tax code \"TX-FUEL-06\" is inactive in accounting.",
];

export const CREATED_BY = [
  "Dana Whitfield",
  "Marcus Reed",
  "Alicia Bray",
  "System — Recurring",
];

/* THE VENDORS' DRIVERS (Pavan, 2026-10-27) — on the card, the table and
   the order. INVENTED. A photo, email and shift since 2026-11-02 (the board
   card's driver line and its hover); the photos are stock placeholders, and
   the initials stand in when one cannot load. */
export const DRIVERS: {
  name: string;
  phone: string;
  truck: string;
  email: string;
  shift: string;
  photo: string;
}[] = [
  { name: "Luis Ortega", phone: "+1-559-555-0131", truck: "Truck 214", email: "luis.ortega@fleetmail.test", shift: "Morning · 5:00 AM – 1:00 PM", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Kendra Mills", phone: "+1-661-555-0157", truck: "Truck 108", email: "kendra.mills@fleetmail.test", shift: "Day · 8:00 AM – 4:00 PM", photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Omar Haddad", phone: "+1-916-555-0176", truck: "Truck 322", email: "omar.haddad@fleetmail.test", shift: "Evening · 2:00 PM – 10:00 PM", photo: "https://randomuser.me/api/portraits/men/75.jpg" },
  { name: "Jess Carver", phone: "+1-559-555-0192", truck: "Truck 047", email: "jess.carver@fleetmail.test", shift: "Day · 8:00 AM – 4:00 PM", photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  { name: "Ben Tran", phone: "+1-713-555-0115", truck: "Truck 509", email: "ben.tran@fleetmail.test", shift: "Night · 10:00 PM – 6:00 AM", photo: "https://randomuser.me/api/portraits/men/46.jpg" },
];

export const ORDER_TAGS = [
  "Keep Full",
  "Rush",
  "Night",
  "Weekend",
  "Split Load",
  "Hazmat",
  "After Hours",
];

/**
 * The yard-side assets a movement order can carry.
 *
 * NAMES, not records — the records live in `directory.ts` (`RENTAL_ASSETS`),
 * which reads this file and so cannot be read back from it. `assertMovementAssetsExist`
 * over there fails the build if the two ever disagree, which is what keeps a
 * movement order's asset the same object the Rental Assets screen lists rather
 * than a string that merely looks like one.
 */
export const MOVEMENT_ASSET_NAMES = [
  "Yard Tank 7",
  "Yard Tank 8",
  "DEF Tote 5",
  "Pump Cart 3",
  "Lube Skid 9",
];

export const TANK_TYPES = [
  "Single-wall skid tank",
  "Double-wall skid tank",
  "Vertical bulk tank",
  "Poly DEF tote",
];

export const PRODUCTS = [
  "Dyed Diesel",
  "Clear Diesel #2",
  "Unleaded 87",
  "Unleaded 91",
  "DEF Bulk",
  "Hydraulic Oil AW-46",
  "Engine Oil 15W-40",
  "Propane HD-5",
  "Propane Commercial",
];

/**
 * THE THREE LINES THIS BUSINESS RUNS. Not a filter of one list — three kinds of
 * work that happen to share a screen. A propane run and a lube drop are
 * different trucks, different certificates and different customers, so which
 * line you are looking at is decided before anything else on the page applies.
 */
export const SERVICE_LINES = ["Fuel", "Lubricants", "Propane"] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];

/**
 * JOB TYPE, NOT SERVICE LINE. The pair answers a different question from
 * `ServiceLine`: whether the broker buys the haul in or runs it on our own
 * fleet. It lived in the sheet while the order it describes had no field for
 * it, so every save threw the answer away; the model owns it now.
 */
export const JOB_TYPES = ["Brokerage", "Transportation"] as const;
export type JobType = (typeof JOB_TYPES)[number];

/**
 * THE BUSINESSES INSIDE A LINE.
 *
 * A line of service is not one business. Fuel runs two: TRANSPORT — a full
 * trailer from a terminal into somebody's bulk storage — and TANK WAGON, the
 * bobtail drops that fill the tanks at a site. Different trucks, different
 * loads, different people scheduling them; the only thing they share is the
 * product in the tank. A broker works one of them at a time, so it is a
 * standing narrowing of the list rather than a filter to be re-applied, which
 * is why these ride on the preset-view row beside Default.
 *
 * LUBRICANTS RUNS TWO AS WELL (Pavan, 2026-09-17): PACKAGED GOODS — drums,
 * pails and cases, sold and delivered as units — and LUBES, the bulk oil that
 * goes into a tank the way fuel does. The same split Fuel has, for the same
 * reason: different trucks, different loads, different people scheduling
 * them.
 *
 * Propane's are still not written down. An empty list is the honest way to
 * say so: the row shows Default alone rather than inventing names nobody
 * asked for.
 */
export const LINE_BUSINESSES: Record<ServiceLine, string[]> = {
  Fuel: ["Transport", "Tank Wagon"],
  Lubricants: ["Packaged Goods", "Lubes"],
  Propane: [],
};

/**
 * THE LINE SWITCH'S CHOICES — "All" first, and the default (Pavan,
 * 2026-10-05). A scope, not a line: an order always has one line, a screen
 * can look at every line at once.
 */
export const LINE_SCOPES = ["All", ...SERVICE_LINES] as const;
export type LineScope = (typeof LINE_SCOPES)[number];
/** Does an order on `line` fall inside `scope`? */
export function inLineScope(scope: LineScope, line: ServiceLine): boolean {
  return scope === "All" || scope === line;
}
/** The business tabs a scope offers — under "All", every line's, in order. */
export function businessesOf(scope: LineScope): string[] {
  return scope === "All" ? SERVICE_LINES.flatMap((l) => LINE_BUSINESSES[l]) : LINE_BUSINESSES[scope];
}

/**
 * WHICH OF THEM AN ORDER IS — a stored field, like `serviceLine` and for the
 * same reason.
 *
 * It was briefly derived from the gallons, on the argument that a trailer load
 * is a transport and a bobtail drop is a tank wagon. That is true of the real
 * world and false of this one: the fixture's quantities top out around 3,000,
 * so every threshold either put two orders in Transport or most of them there,
 * and the tab would have been teaching a rule the data does not follow. A
 * business is a fact about how the job was sold, not an arithmetic result.
 */
export function businessOf(r: BrokerOrder): string | null {
  return r.business;
}

/** One product, one line. DEF rides with fuel: it is sold on the same run. */
const LINE_OF: Record<string, ServiceLine> = {
  "Dyed Diesel": "Fuel",
  "Clear Diesel #2": "Fuel",
  "Unleaded 87": "Fuel",
  "Unleaded 91": "Fuel",
  "DEF Bulk": "Fuel",
  "Hydraulic Oil AW-46": "Lubricants",
  "Engine Oil 15W-40": "Lubricants",
  "Propane HD-5": "Propane",
  "Propane Commercial": "Propane",
};

export const lineOfProduct = (product: string): ServiceLine =>
  LINE_OF[product] ?? "Fuel";

/** Everything a line can carry, for a movement order that names no site asset. */
const LINE_PRODUCTS: Record<ServiceLine, string[]> = {
  Fuel: PRODUCTS.filter((p) => LINE_OF[p] === "Fuel"),
  Lubricants: PRODUCTS.filter((p) => LINE_OF[p] === "Lubricants"),
  Propane: PRODUCTS.filter((p) => LINE_OF[p] === "Propane"),
};

/** Weighted the way the business is: fuel is most of it. See the seed. */
const LINE_CYCLE: ServiceLine[] = [
  "Fuel",
  "Fuel",
  "Lubricants",
  "Fuel",
  "Propane",
  "Fuel",
  "Lubricants",
];

export const WINDOWS: { start: string; end: string }[] = [
  { start: "6:00 AM", end: "10:00 AM" },
  { start: "8:00 AM", end: "12:00 PM" },
  { start: "10:00 AM", end: "2:00 PM" },
  { start: "12:00 PM", end: "4:00 PM" },
  { start: "2:00 PM", end: "6:00 PM" },
  { start: "6:00 PM", end: "10:00 PM" },
];

const CREDIT_REASONS = [
  "Over credit limit",
  "Credit status unapproved",
  "42 days overdue",
];

const INSTRUCTIONS = [
  "Gate code 4417. Tanks are behind the shop, back in from the north side.",
  "Call the POC 30 minutes out. No entry before 7am.",
  "Fill both saddle tanks. Do not top the day tank.",
  "",
];

/* NEVER LEAVES THE BUILDING. Mostly empty, because most orders have nothing
   anyone needed to say twice. */
const INTERNAL_NOTES = [
  "Customer disputed the last delivery fee. Confirm the rate before invoicing.",
  "Site contact changes at the end of the month — check before the next run.",
  "",
  "",
  "",
  "",
];

/*
  Seed expansion.

  The board has SEVEN lanes, and a lane with one card in it teaches nothing about
  how the board behaves — so the generator distributes across all seven and puts
  a deliberate majority on TODAY, which is where the date stepper opens. Dates
  are offsets from today, computed at module load, so the relative labels
  (Today / Tomorrow / Yesterday) stay correct on whatever day this is opened.
*/

/** Deterministic pseudo-random, so the dataset is identical on every reload. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Which vendor fields a status implies. Encoded once so a seed cannot produce an
 * order that is `Assigned` with nobody holding it, or `Draft` with three invites
 * out — the exact class of contradiction `HANDOFF.md` open question 1 is about.
 */
function vendorStateFor(
  i: number,
  status: BrokerStatus,
  kind: OrderKind,
  pick: () => number
): {
  vendorId: string | null;
  invitedVendorIds: string[];
  acceptedVendorIds: string[];
} {
  if (status === "Draft" || status === "Blocked") {
    /* A DRAFT MAY ALREADY HAVE ITS PARTNERS PICKED. Sending is an explicit act,
       so "chosen but not sent" is a real state — and once the shortlist has
       gone out the card stops saying Draft and says Awaiting Quotation. A
       fixture that never produced a shortlist would leave half of that badge
       unreachable; see `sentVendorIds` below for which of them were sent. */
    const ready = pick() < 0.45;
    if (!ready) return { vendorId: null, invitedVendorIds: [], acceptedVendorIds: [] };
    const needsLine = kind === "Movement" ? "Asset Movement" : "Bulk Fuel";
    const picks = VENDORS.filter((v) =>
      v.businessLines.some((b) => b === needsLine)
    ).map((v) => v.id);
    const one = picks[Math.floor(pick() * picks.length)];
    const extra = picks.filter((id) => id !== one).slice(0, pick() < 0.35 ? 1 : 0);
    return {
      vendorId: null,
      invitedVendorIds: [one, ...extra],
      acceptedVendorIds: [],
    };
  }
  // THE POOL IS FILTERED BY BUSINESS LINE. The spec makes Business Lines a
  // filter on the vendor picker (§5.5 "Table View") precisely because a carrier
  // that only moves tanks cannot haul 2,200 gallons of diesel. Drawing from the
  // whole vendor list produced exactly that: a bulk fuel order out for
  // acknowledgement to Pacific Tank Movers, whose only line is Asset Movement.
  const needs = kind === "Movement" ? "Asset Movement" : "Bulk Fuel";
  const pool = VENDORS.filter((v) =>
    v.businessLines.some((b) => b === needs)
  ).map((v) => v.id);
  const first = pool[Math.floor(pick() * pool.length)];
  if (status === "Quoting") {
    /* OUT FOR ACKNOWLEDGEMENT, and nobody has been AWARDED yet — that is what
       Quoting means. Sometimes one invite, sometimes several; both are normal,
       and the difference is what the rejection rule turns on. */
    const extra = pool.filter((id) => id !== first);
    const n = pick() < 0.45 ? 1 + Math.floor(pick() * 2) : 0;
    /* AT LEAST TWO ON EVERY OTHER ORDER. Both draws above are still taken, so
       the stream is unchanged — this only raises the floor, and it is what
       gives the pricing unit's partner picker two quotes to sit between. A
       broker comparing prices is the whole of this stage; one invitee on most
       of them made that impossible to see. */
    const invited = [first, ...extra.slice(0, Math.max(n, i % 2 === 0 ? 1 : 0))];
    /* SOME OF THEM HAVE ALREADY ANSWERED. Quoting used to seed no acceptances
       at all, and a quote can only follow one — so the stage whose entire job
       is comparing prices could never show a price. Every other order accepts
       its first invitee, which puts both halves of the stage on the board: the
       ones still waiting and the ones with a number to compare.

       BY INDEX, NOT BY `pick()`. Every draw taken from the generator shifts
       every value after it, so seeding this from the random stream would have
       reshuffled the whole fixture — different vendors, different quotes,
       different lanes. Same reason `invoiceState` cycles. */
    /* SOMETIMES TWO HAVE ANSWERED, so the pricing unit's partner picker has
       something to pick between — comparing quotes is the whole of what this
       stage is for, and with one quote everywhere the control was a select of
       one on every order. */
    const answered = i % 2 === 0 ? invited.slice(0, 2) : [];
    return {
      vendorId: null,
      invitedVendorIds: invited,
      acceptedVendorIds: answered,
    };
  }
  const alsoInvited = pool.filter((id) => id !== first).slice(0, pick() < 0.4 ? 1 : 0);
  const invited = [first, ...alsoInvited];
  if (status === "Assigned") {
    /* ACCEPTED IS THE PARTNER'S ACT, NOT THE BROKER'S. At least one partner has
       said yes; whether the broker has taken anyone's quote is the next
       question, and on roughly half of these it has not been answered yet —
       which is the state step 2 of the sheet exists for. */
    const accepted =
      invited.length > 1 && pick() < 0.4 ? invited : [first];
    /* ASSIGNED MEANS A VENDOR IS ASSIGNED (Pavan, 2026-10-06) — the order
       only gets here once one is finalized. The draw is still taken so the
       rest of the fixture is unchanged. */
    pick();
    return {
      vendorId: first,
      invitedVendorIds: invited,
      acceptedVendorIds: accepted,
    };
  }
  // Completed and everything downstream: the broker has taken a quote, and the
  // partner holding the order is one that accepted the invitation.
  return {
    vendorId: first,
    invitedVendorIds: invited,
    acceptedVendorIds: [first],
  };
}

const FIRST_ORDER_NO = 104_620;

export const BROKER_ORDERS: BrokerOrder[] = (() => {
  const pick = rng(20260901);
  const today = startOfDay(new Date());
  const rows: BrokerOrder[] = [];

  // Day offsets: today is over-weighted so the board opens full.
  const OFFSETS = [0, 0, 0, 0, 0, 0, 1, 1, -1, 2, -2, 3];

  const TOTAL = 108;
  for (let i = 0; i < TOTAL; i++) {
    const status = BROKER_STATUSES[i % BROKER_STATUSES.length];
    const kind: OrderKind =
      i % 11 === 0 ? "Movement" : i % 4 === 0 ? "Recurring" : "Regular";
    const cust = CUSTOMERS[i % CUSTOMERS.length];
    /* ONE ship-to concept. `SHIP_TO_SITES` is the list — the site carries the
       name, the street, the city/state/ZIP and the coordinates together, so a
       ship-to can never be a name in one place and an address in another. The
       customer's own `shipTos` array is not used here for that reason. */
    const site = SHIP_TO_SITES[i % SHIP_TO_SITES.length];
    const shipTo = site.name;
    const offset = OFFSETS[i % OFFSETS.length];
    const when = new Date(today);
    when.setDate(when.getDate() + offset);

    const isMovement = kind === "Movement";
    /* An order's lines are the SITE'S assets, picked from its list — never
       invented tank names. That is what the sheet does, so the seed has to do
       it too or an existing order shows rows the site does not have and the
       Rental badge never appears on one. */
    /* AN ORDER BELONGS TO ONE LINE. A propane run and a lube drop are different
       trucks with different certificates — an order that mixed them would be a
       row no dispatcher could act on. The line is chosen first and the assets
       are drawn from the ones that serve it; where the site cannot serve that
       line at all, it keeps what the site does have and the order's line is
       read back off the products it actually got.

       Chosen by INDEX on a seven-long cycle, not from the random stream: a draw
       taken here would shift every value after it and reshuffle the fixture,
       and seven shares no factor with the 24-row day so one day walks the whole
       cycle rather than landing on the same line every time. */
    const wanted = LINE_CYCLE[i % LINE_CYCLE.length];
    const inLine = site.assets.filter((a) => lineOfProduct(a.product) === wanted);
    /* The fallback narrows too. Falling back to the site's whole list let one
       order draw a lube skid and a diesel tank together — a row no dispatcher
       could act on, and the invariant this block exists to hold. */
    const fallbackLine = lineOfProduct(
      site.assets[i % site.assets.length].product
    );
    const pool =
      inLine.length > 0
        ? inLine
        : site.assets.filter((a) => lineOfProduct(a.product) === fallbackLine);
    /* UP TO SIX PRODUCTS ON EVERY FIFTH ORDER (Pavan, 2026-09-22 — "add at
       least 1-6 products as different examples"). The pricing unit is a table
       of products now, and a fixture that never ran past three could not show
       what it does at six. ONE DRAW EITHER WAY, so the random stream is not
       lengthened; only what this one is multiplied by changes. Bray North Yard
       is the only site with six assets standing on it, so that is where a
       six-line order can actually land. */
    const nLines = isMovement
      ? 1
      : Math.min(pool.length, 1 + Math.floor(pick() * (i % 5 === 0 ? 6 : 3)));
    const lines: OrderLine[] = Array.from({ length: nLines }, (_, k) => {
      // Top-off lines exist on ~1 in 6 fuel lines and never on movement orders,
      // which carry an asset rather than a requested volume.
      const topOff = !isMovement && pick() < 0.17;
      const asset = pool[(i + k) % pool.length];
      return {
        asset: isMovement
          ? MOVEMENT_ASSET_NAMES[(i + k) % MOVEMENT_ASSET_NAMES.length]
          : asset.name,
        product: isMovement
          ? LINE_PRODUCTS[wanted][(i + k) % LINE_PRODUCTS[wanted].length]
          : asset.product,
        gal: topOff ? null : 150 + Math.floor(pick() * 34) * 50,
        topOff,
        rental: isMovement ? false : asset.rental,
        /* DELIVERED IS KNOWN ONLY ONCE IT HAS BEEN. Filled in below for the
           stages downstream of the delivery; null while the order is still
           being priced, where the broker may type an expected figure. */
        deliveredGal: null,
        /* The broker's own numbers, unset until someone prices the order.
           ONE OF EACH CHARGE TO BEGIN WITH — the common case, and the reader
           adds a second margin or a county tax when the load wants one. */
        pricePerGal: undefined,
        charges: defaultLineCharges(),
      };
    });

    /* Past the delivery, the gallons are a fact and the pricing is settled —
       an order in Verified with no numbers on it could not have
       been invoiced. */
    if (status === "Completed" || status.startsWith("Accounting")) {
      for (const l of lines) {
        l.deliveredGal = l.gal == null ? 50 + Math.floor(pick() * 20) * 25 : l.gal;
        l.pricePerGal = Number((3.1 + pick() * 0.8).toFixed(3));
        const margin = Number((0.18 + pick() * 0.34).toFixed(3));
        /* DERIVED, NOT DRAWN. Every `pick()` shifts every value after it, so a
           new field seeded from the random stream would have reshuffled the
           whole fixture — different vendors, different quotes, different
           lanes. Both come off figures already settled above. */
        const rate: Record<string, number> = {
          margin,
          tax: Number((l.pricePerGal * 0.06).toFixed(3)),
          fee: Number((margin * 0.12).toFixed(3)),
        };
        l.charges = l.charges.map((c) => ({ ...c, perGal: rate[c.id] ?? 0 }));
      }
    }

    /* THE STAGES PAST COMPLETED, which the branch above stopped reaching when
       the statuses were renamed (it still asks for "Accounting…"). Verified
       and Synced orders shipped with no delivered gallons and no price — an
       invoice with nothing on it. Fixed 2026-09-23 BY INDEX, not by moving
       them into the branch above: that branch draws from `pick()`, and the
       extra draws would have reshuffled the whole fixture. */
    if (status === "Review" || status === "Verified" || status === "Partially Synced" || status === "Synced") {
      lines.forEach((l, k) => {
        l.deliveredGal = l.gal ?? 50 + ((i + k) % 20) * 25;
        l.pricePerGal = Number((3.1 + ((i + k) % 9) * 0.09).toFixed(3));
        const margin = Number((0.18 + ((i + k) % 7) * 0.05).toFixed(3));
        const rate: Record<string, number> = {
          margin,
          tax: Number((l.pricePerGal * 0.06).toFixed(3)),
          fee: Number((margin * 0.12).toFixed(3)),
        };
        l.charges = l.charges.map((c) => ({ ...c, perGal: rate[c.id] ?? 0 }));
      });
    }

    const { vendorId, invitedVendorIds, acceptedVendorIds } = vendorStateFor(
      i,
      status,
      kind,
      pick
    );
    /* Movement orders always run the quote flow (§5.20); fuel orders sometimes
       — and an order sitting in the Quoting stage always has, because that is
       what the stage is.

       THE DRAW IS TAKEN EITHER WAY. `||` short-circuits, so reading the stage
       first would have skipped the `pick()` on those orders and shifted every
       value after it. */
    const quoteDraw = pick() < 0.25;
    const quoteRequested = isMovement || status === "Quoting" || quoteDraw;
    const gal = totalGal(lines);
    /* A QUOTE FOLLOWS AN ACCEPTANCE — a partner cannot price an order it has
       not agreed to take, so only `acceptedVendorIds` can appear here. Not all
       of them have got round to it: an accepted order with no quote yet is the
       first of the two notifications, and one with a quote is the second. */
    const quotes: VendorQuote[] =
      quoteRequested && acceptedVendorIds.length > 0
        ? acceptedVendorIds
            /* THE FIRST TWO ALWAYS PRICE IT, so an order with two partners on
               it has two quotes to compare. The draw is still taken for every
               index past the first, so the random stream — and the rest of the
               fixture — is unchanged. */
            .filter((_, k) => (k === 0 ? true : pick() < 0.6 || k === 1))
            .filter(() => (status === "Assigned" ? pick() < 0.7 : true))
            .map((vid) => {
              const quoteLines = lines.map((l) => ({
                asset: l.asset,
                ratePerGal: Number((2.85 + pick() * 0.9).toFixed(3)),
                /* KEYED BY THE LINE'S OWN CHARGES, so the partner's column can
                   be laid against the broker's row for row. */
                rates: {
                  margin: Number((0.08 + pick() * 0.22).toFixed(3)),
                } as Record<string, number>,
              }));
              /* The truck coming out — charged once, so it does not scale with
                 gallons. The partner's fee and tax do, and are on the lines. */
              const freight = Math.round(180 + pick() * 320);
              /* THE TWO DRAWS THAT USED TO BE `fees` AND `taxes` ARE STILL
                 TAKEN, IN THE SAME PLACE. Those were one figure each for the
                 whole run; they are now per gallon and per product. Dropping
                 the draws would have shifted every value after them and
                 reshuffled the whole fixture — different vendors, different
                 quotes, different lanes — so they are kept and spent on the
                 rate the lines carry instead. */
              const feeRate = Number((0.012 + pick() * 0.03).toFixed(3));
              const taxRate = Number((0.02 + pick() * 0.06).toFixed(3));
              for (const ql of quoteLines) {
                ql.rates.fee = feeRate;
                ql.rates.tax = taxRate;
              }
              return {
              vendorId: vid,
              lines: quoteLines,
              freight,
              /* BY INDEX, so the two states — a quote with a covering note and
                 one without — are both on the board without taking a draw. */
              note:
                i % 3 === 0
                  ? "Rate holds for 48 hours. Two hours' wait included; anything beyond is billed at the detention rate on our rate sheet."
                  : undefined,
              attachments:
                i % 3 === 0
                  ? ["Rate sheet.pdf", "Fuel supply agreement.pdf"]
                  : undefined,
              };
            })
        : [];

    /* AN ASSIGNED ORDER WAS FINALIZED ON A QUOTE (Pavan, 2026-10-06), so the
       finalized vendor always has one. Derived, not drawn — see below. */
    if (status === "Assigned" && vendorId && !quotes.some((q) => q.vendorId === vendorId)) {
      quotes.unshift({
        vendorId,
        lines: lines.map((l, k) => ({
          asset: l.asset,
          ratePerGal: Number((2.95 + ((i + k) % 7) * 0.08).toFixed(3)),
          rates: {
            margin: Number((0.12 + ((i + k) % 5) * 0.02).toFixed(3)),
          },
        })),
        freight: 210 + (i % 9) * 25,
      });
    }

    /* A DRAFT WITH A PRICE ALREADY WRITTEN DOWN (2026-09-22). In a draft the
       broker writes a partner's quote down themselves — "Add their quotation"
       in the row's menu, for a price given on a call — and that is the state
       the Orders lane badges as *N Quotations Received*. A fixture that never
       produced one would leave that badge, and the pricing unit it unlocks,
       unreachable without typing.

       BY INDEX AND DERIVED, NOT DRAWN. No `pick()` here: a draw would shift
       every value after it and reshuffle the whole board. */
    if (status === "Draft" && invitedVendorIds.length > 0 && i % 5 === 0) {
      quotes.push({
        vendorId: invitedVendorIds[0],
        lines: lines.map((l, k) => ({
          asset: l.asset,
          ratePerGal: Number((2.9 + ((i + k) % 7) * 0.09).toFixed(3)),
          rates: {
            margin: Number((0.1 + ((i + k) % 5) * 0.02).toFixed(3)),
            tax: Number((0.03 + ((i + k) % 3) * 0.01).toFixed(3)),
            fee: Number((0.02 + ((i + k) % 4) * 0.005).toFixed(3)),
          },
        })),
        freight: 180 + (i % 9) * 30,
      });
    }

    /* A PRICED QUOTE MEANS A PRICED ORDER (Pavan, 2026-09-23). An order with a
       partner's price on it but none of the broker's showed the customer
       paying only the order fees — D-104970 read $145 against an $8,815 quote,
       a −$8,670 "expected profit" no broker would ever be looking at. Once a
       quote is in, the broker has priced their side too: the dearest quote's
       rate plus a markup, so the comparison is always against a sale.

       DERIVED, NOT DRAWN — no `pick()`, for the same reason as above. */
    if (quotes.length > 0) {
      lines.forEach((l, k) => {
        if (l.pricePerGal !== undefined) return;
        const dearest = Math.max(...quotes.map((q) => q.lines[k]?.ratePerGal ?? 0));
        l.pricePerGal = Number((dearest + 0.35 + ((i + k) % 4) * 0.05).toFixed(3));
        const margin = Number((0.22 + ((i + k) % 5) * 0.03).toFixed(3));
        const rate: Record<string, number> = {
          margin,
          tax: Number((l.pricePerGal * 0.06).toFixed(3)),
          fee: Number((margin * 0.12).toFixed(3)),
        };
        l.charges = l.charges.map((c) => ({ ...c, perGal: rate[c.id] ?? 0 }));
      });

      /* AND THE SALE COVERS THE DEAREST QUOTE, whatever stage the order is
         in. A per-gallon markup cannot promise that on its own: freight is
         charged once, so on a small load it outweighs any markup, and the
         settled prices drawn for finished orders were never compared with the
         quotes at all. Top the price up to 10% over the dearest quote, spread
         across the gallons. Derived — still no `pick()`. */
      const worst = Math.max(...quotes.map((q) => quoteTotal(q, lines)));
      const sale = lines.reduce((sum, l) => sum + customerLineTotal(l), 0);
      const gallons = lines.reduce((sum, l) => sum + billableGal(l), 0);
      if (gallons > 0 && sale < worst * 1.1) {
        const lift = (worst * 1.1 - sale) / gallons;
        for (const l of lines) {
          l.pricePerGal = Number(((l.pricePerGal ?? 0) + lift).toFixed(3));
        }
      }
    }

    /* SEEDED SO ALL THREE SHOW, and BY INDEX rather than by `pick()`. Every
       draw taken from the generator shifts every value after it, so seeding a
       new field from the random stream would have quietly reshuffled the whole
       fixture — different vendors, different quotes, different lanes. The
       cycle costs nothing and guarantees the three states are all on the
       board.

       An invoice can only be chased once a partner is on the order, so orders
       without a vendor stay at `none`: there is nobody to ask. */
    const invoiceState: InvoiceState = vendorId
      ? INVOICE_CYCLE[i % INVOICE_CYCLE.length]
      : "none";

    rows.push({
      id: `bo-${i}`,
      orderNo: `${isMovement ? "M" : "D"}-${FIRST_ORDER_NO + i * 7}`,
      kind,
      orderType: isMovement
        ? "Asset Movement"
        : pick() < 0.14
          ? "Emergency"
          : pick() < 0.3
            ? "Delivery"
            : pick() < 0.42
              ? "Extraction"
              : "Core",
      customer: { title: cust.name, description: cust.erpId },
      shipTo,
      date: { title: DATE_FMT.format(when), description: relativeLabel(offset, when) },
      dateKey: dateKeyOf(when),
      window: WINDOWS[i % WINDOWS.length],
      lines,
      status,
      vendorId,
      invitedVendorIds,
      /* A SEEDED ORDER PAST DRAFT HAS BEEN ASKED — that is what leaving Draft
         meant before the field existed.

         A SEEDED DRAFT GOES BOTH WAYS (2026-09-22), because the Orders lane
         now holds two states and the card's badge is what tells them apart:
         nothing sent is a Draft, something sent is Awaiting Quotation. Every
         other Draft with a shortlist has sent it — BY INDEX, so no draw is
         taken from the generator and the rest of the fixture is unchanged. */
      /* NOT A MULTIPLE OF FOUR. The board buckets by date off the same index,
         and every Draft landing on one day turned out to share `i % 4` — so a
         quarter-split put the whole lane on one side of it. */
      sentVendorIds:
        status === "Draft" && i % 3 === 2 ? [] : [...invitedVendorIds],
      acceptedVendorIds,
      quoteRequested,
      quotes,
      /* SEEDED BY INDEX, so all three states — no run fee, one, and two — are
         on the board without taking a draw from the generator. */
      orderFees:
        i % 3 === 0
          ? [{ type: "Fee" as const, label: "Delivery fee", amount: 125 }]
          : i % 3 === 1
            ? []
            : [
                {
                  type: "Fee" as const,
                  label: "After-hours delivery",
                  amount: 85,
                },
                { type: "Fee" as const, label: "Wait time", amount: 60 },
              ],
      invoiceState,
      /* BY INDEX — 3 to 70 hours back, so the card reads hours and days. */
      ...(invoiceState === "requested"
        ? { invoiceRequestedAt: new Date(Date.now() - (3 + ((i * 17) % 68)) * 3_600_000) }
        : {}),
      serviceLine: lines.length > 0 ? lineOfProduct(lines[0].product) : wanted,
      /* BY INDEX, NOT FROM THE RANDOM STREAM — a draw here would shift every
         value after it and reshuffle the whole fixture. Two in five are
         transports, which is roughly the mix and enough of both to see each
         tab do something. */
      business: (() => {
        const options = LINE_BUSINESSES[
          lines.length > 0 ? lineOfProduct(lines[0].product) : wanted
        ];
        return options.length === 0 ? null : options[i % 5 < 2 ? 0 : 1];
      })(),
      urgent: pick() < 0.14,
      signatureOnDelivery: pick() < 0.4,
      poNumber: pick() < 0.7 ? `PO-${70_000 + i * 13}` : "",
      /* No draw — the rest of the fixture stays as it was. */
      bolNumber: i % 3 === 0 ? "" : `BOL-${52_000 + i * 11}`,
      zip: site.zip,
      state: site.state,
      createdBy:
        kind === "Recurring"
          ? "System — Recurring"
          : CREATED_BY[i % (CREATED_BY.length - 1)],
      tags: pick() < 0.45 ? [ORDER_TAGS[i % ORDER_TAGS.length]] : [],
      /* THE TRAIL STARTS AT CREATION. An empty history on a record that
         plainly exists is a history nobody trusts afterwards. */
      audit: [
        {
          at: new Date(when.getTime() - 86_400_000).toISOString(),
          by:
            kind === "Recurring"
              ? "System — Recurring"
              : CREATED_BY[i % (CREATED_BY.length - 1)],
          changes: ["Order created"],
        },
      ],
      /*
        BOTH FLOWS ON THE BOARD. An order either has a load order — the broker
        bought the fuel, and the partner only hauls it — or it does not, and
        the partner supplies the product as well. Every seeded order was the
        second kind, so the first was unreachable without building one by hand,
        and the pricing rule that turns on it could not be seen at all.

        Every third priced order gets one, BY INDEX rather than from the random
        stream: a draw taken here would shift every value after it and reshuffle
        the whole fixture. It is only filled where one loading account covers
        every product on the order, because that is the rule the form enforces —
        seeding a combination the form would refuse is seeding a lie.
      */
      loadOrder: seedLoadOrder(i, lines),
      recurrence:
        kind === "Recurring"
          ? {
              fromDateKey: dateKeyOf(when),
              /* CYCLED ON THE RECURRING ORDINAL, NOT THE GLOBAL INDEX.
                 Recurring orders are every fourth row, so `i % 6` only ever
                 landed on three of the six frequencies — Daily, Every weekday
                 and Monthly — and the other three were unreachable in the
                 fixture. A UI that distinguishes six schedule shapes needs all
                 six to exist or half of it cannot be seen to work. */
              frequency:
                RECURRENCE_FREQUENCIES[
                  Math.floor(i / 4) % RECURRENCE_FREQUENCIES.length
                ],
            }
          : null,
      /* WHEN IT ACTUALLY RAN. Inside the delivery window it was planned for
         and a few minutes off the hour, because a finished order whose
         completion time is exactly its window's start reads as a default
         rather than as a record. Null before the delivery. */
      completedAt: isDelivered(status)
        ? (() => {
            const at = new Date(when);
            at.setHours(
              timeToMinutes(WINDOWS[i % WINDOWS.length].start) / 60 + 1,
              (i * 7) % 60,
              0,
              0
            );
            return at.toISOString();
          })()
        : null,
      hub: HUBS[i % HUBS.length],
      /*
        NEARLY EVERY SEEDED ORDER IS BROKERAGE, and the exceptions are narrow
        on purpose. The transportation path — our own fleet, no vendor table —
        is not built in the ORDER SHEET, so seeding one there would be seeding
        a screen that does not exist.

        But the recurring lists now split first-party from third-party
        operations, and a segment that is always empty teaches nothing. So a
        third of the RECURRING orders that no partner holds are ours to run:
        coherent, because an own-fleet job has no partner BECAUSE we run it,
        and confined to rows the unbuilt sheet path is not reached from.
      */
      jobType:
        kind === "Recurring" && vendorId === null && i % 3 === 0
          ? "Transportation"
          : "Brokerage",
      primaryPoc: POCS[i % POCS.length],
      /* Every fifth order names a second person, and never the same one as the
         primary — a fallback contact that is the contact is not a fallback. */
      secondaryPocs: i % 5 === 0 ? [POCS[(i + 2) % POCS.length]] : [],
      salesperson: SALESPEOPLE[i % SALESPEOPLE.length],
      instructions: INSTRUCTIONS[i % INSTRUCTIONS.length],
      internalNote: INTERNAL_NOTES[i % INTERNAL_NOTES.length],
      /* A WINTER BLEND IS A FUEL THING. Lubricants and propane have no
         additive, so flagging one would read as a spec nobody can supply. */
      winterAdditive: lineOfProduct(lines[0]?.product ?? "") === "Fuel" && i % 7 === 0,
      /* Off on every seed, as it is on every new order. */
      notifyVendor: false,
      blockedReason:
        status === "Blocked" ? CREDIT_REASONS[i % CREDIT_REASONS.length] : null,
      movement: isMovement
        ? (() => {
            /* ALL FOUR ROUTES IN THE FIXTURE. Deliveries are the common case
               and stay the common case; the other three are seeded on strides
               that do not divide each other, so every one of them lands
               somewhere in the set instead of the board only ever showing the
               route that happens to be first. */
            const direction: MovementDirection =
              i % 22 === 0
                ? "Pickup"
                : i % 17 === 0
                  ? "Transfer"
                  : i % 13 === 0
                    ? "Relocate"
                    : "Delivery";
            const route = MOVEMENT_ROUTE[direction];
            const endName = (end: MovementEnd, k: number) =>
              end === "yard"
                ? YARDS[k % YARDS.length]
                : SHIP_TO_SITES[k % SHIP_TO_SITES.length].name;
            return {
            direction,
            from: endName(route.from, i),
            /* A ROUTE CANNOT END WHERE IT STARTED, and the two same-kind
               routes are the ones where it could. */
            to: endName(route.to, route.from === route.to ? i + 1 : i),
            tankType: TANK_TYPES[i % TANK_TYPES.length],
            capacityGal: [250, 500, 1000, 2000][i % 4],
            };
          })()
        : null,
    });
    void gal;
  }

  /* EVERY STATE THE UI DISTINGUISHES MUST EXIST IN THE FIXTURE, or nobody can
     see whether it works. Urgent (14%) and Recurring (25%) are drawn
     independently, so the both-at-once card — the one the card's stacked badges
     exist for — was absent by chance. Every third recurring order is forced
     urgent so the case lands on most days: the board is scoped to ONE date, so
     a single forced row would only be visible on the day it happens to fall. */
  rows
    .filter((r) => r.kind === "Recurring")
    .forEach((r, k) => {
      if (k % 3 === 0) r.urgent = true;
    });

  /* REVIEW IS NOT IN THE ROTATION EITHER — adding it there would reshuffle
     the whole fixture — so every third Completed order is sent to review
     here instead. */
  rows
    .filter((r) => r.status === "Completed")
    .forEach((r, k) => {
      if (k % 3 !== 1) return;
      r.status = "Review";
      r.audit = [
        ...r.audit,
        {
          at: new Date(Date.now() - 2_700_000).toISOString(),
          by: CREATED_BY[k % CREATED_BY.length],
          changes: ["Status: Completed → Review"],
        },
      ];
    });

  /* SO DOES PARTIALLY SYNCED, and for the same reason: it is not in the status
     rotation the generator walks, so without this the badge that distinguishes
     it inside the Synced lane would never appear on the board. Every third
     order that reached accounting stops half way — which is roughly how often
     it happens, and often enough to land on most days. */
  rows
    .filter((r) => r.status === "Synced")
    .forEach((r, k) => {
      if (k % 3 !== 1) return;
      r.status = "Partially Synced";
      r.syncError = SYNC_ERRORS[k % SYNC_ERRORS.length];
      r.audit = [
        ...r.audit,
        {
          at: new Date(Date.now() - 1_800_000).toISOString(),
          by: CREATED_BY[k % CREATED_BY.length],
          changes: ["Status: Synced → Partially Synced"],
        },
      ];
    });

  /* CANCELLED HAS TO EXIST TO BE SEEN. It is a terminal exit rather than a
     stage, so it is not in the status rotation the generator walks — without
     this the lane would ship permanently empty, which teaches nothing about
     how it behaves. Every eleventh order, from the ones that had not yet
     reached accounting. */
  rows.forEach((r, k) => {
    if (k % 11 !== 4) return;
    /* Past Completed the order has reached accounting and cannot be
       canceled. (Was `startsWith("Accounting")`, a name retired in the
       status rename, so Verified and Synced orders were being canceled.) */
    if (isDelivered(r.status)) return;
    r.status = "Canceled";
    r.blockedReason = null;
    r.audit = [
      ...r.audit,
      {
        at: new Date(Date.now() - 3_600_000).toISOString(),
        by: CREATED_BY[k % CREATED_BY.length],
        changes: ["Status: Quoting → Canceled", "Canceled by customer"],
      },
    ];
  });

  /* A DRIVER ONCE A VENDOR HOLDS IT (Pavan, 2026-10-27) — by index, no draw. */
  rows.forEach((r, k) => {
    if (r.vendorId && isDriven(r.status)) r.driver = DRIVERS[k % DRIVERS.length].name;
  });

  return rows;
})();

/** Statuses where the vendor has put a driver on the order. */
export function isDriven(s: BrokerStatus): boolean {
  return s === "Assigned" || isDelivered(s);
}

/*
  Invariants. Asserted rather than trusted, because every one of them is a rule
  the SPEC states and a seed could silently break.
*/
export function assertConsistent(rows: BrokerOrder[]): string[] {
  const problems: string[] = [];
  for (const r of rows) {
    /* A CANCELLED ORDER IS A SNAPSHOT of whatever it was when it stopped, so
       the stage rules below do not apply to it — they describe work in
       progress, and there is none. */
    if (r.status === "Canceled") continue;
    if (r.kind === "Movement") {
      if (!r.orderNo.startsWith("M-")) problems.push(`${r.orderNo}: movement order without an M prefix`);
      if (r.orderType !== "Asset Movement") problems.push(`${r.orderNo}: movement order typed ${r.orderType}`);
      if (!r.movement) problems.push(`${r.orderNo}: movement order with no movement detail`);
      if (r.lines.length !== 1) problems.push(`${r.orderNo}: movement orders carry exactly one asset`);
    } else if (!r.orderNo.startsWith("D-")) {
      problems.push(`${r.orderNo}: delivery order without a D prefix`);
    }
    const preVendor = r.status === "Draft" || r.status === "Blocked";
    /* A DRAFT MAY HAVE PARTNERS PICKED — sending is a separate act — but
       nobody can have accepted an invitation that has not gone out, and the
       order cannot have a partner holding it. */
    if (preVendor && (r.vendorId || r.acceptedVendorIds.length)) {
      problems.push(`${r.orderNo}: ${r.status} cannot have an accepted partner`);
    }
    /* QUOTING IS THE ROUND ITSELF (rewritten 2026-09-23). This rule predates
       the status rename and the finalize step: it still said Quoting meant
       "nobody has accepted", when Quoting is exactly where partners accept,
       price the order and one of them is finalized — a partner may hold the
       order before it moves to Assigned. What stays true: a round has to
       have somebody in it. */
    if (r.status === "Quoting" && r.invitedVendorIds.length === 0) {
      problems.push(`${r.orderNo}: Quoting with nobody invited`);
    }
    if (!preVendor && r.status !== "Quoting" && r.acceptedVendorIds.length === 0) {
      problems.push(`${r.orderNo}: ${r.status} with nobody having accepted`);
    }
    if (!preVendor && r.status !== "Quoting" && !r.vendorId) {
      problems.push(`${r.orderNo}: ${r.status} with no partner holding the order`);
    }
    for (const id of r.acceptedVendorIds) {
      if (!r.invitedVendorIds.includes(id)) {
        problems.push(`${r.orderNo}: a vendor accepted an invitation never sent`);
      }
    }
    if (r.vendorId && !r.acceptedVendorIds.includes(r.vendorId)) {
      problems.push(`${r.orderNo}: the order's partner never accepted the invitation`);
    }
    /* A QUOTE FOLLOWS AN ACCEPTANCE. A partner cannot price an order it has not
       agreed to take. */
    for (const q of r.quotes) {
      /* EXCEPT IN A DRAFT, where the broker writes down a price a partner
         gave on the phone — "Add their quotation" — before anything is sent. */
      if (r.status !== "Draft" && !r.acceptedVendorIds.includes(q.vendorId)) {
        problems.push(`${r.orderNo}: a quote from a partner that never accepted`);
      }
      for (const ql of q.lines) {
        if (!r.lines.some((l) => l.asset === ql.asset)) {
          problems.push(`${r.orderNo}: a quote line for an asset not on the order`);
        }
      }
    }
    // A partner has to actually run the line of business the order needs.
    const needs = r.kind === "Movement" ? "Asset Movement" : "Bulk Fuel";
    for (const id of r.invitedVendorIds) {
      const v = VENDORS.find((x) => x.id === id);
      if (v && !v.businessLines.some((b) => b === needs)) {
        problems.push(`${r.orderNo}: ${v.name} does not run ${needs}`);
      }
    }
    if ((r.status === "Blocked") !== (r.blockedReason !== null)) {
      problems.push(`${r.orderNo}: blocked reason and status disagree`);
    }
    if ((r.status === "Partially Synced") !== Boolean(r.syncError)) {
      problems.push(`${r.orderNo}: sync error and status disagree`);
    }
    /* A FALLBACK CONTACT THAT IS THE CONTACT IS NOT A FALLBACK, and a blank
       row in the list is not a person — both come from a form that lets you
       add a row before choosing who goes in it. */
    if (r.secondaryPocs.includes(r.primaryPoc)) {
      problems.push(`${r.orderNo}: the primary POC is also listed as a second contact`);
    }
    if (r.secondaryPocs.some((p) => p === "")) {
      problems.push(`${r.orderNo}: an empty second contact`);
    }
    /* A COMPLETION TIME IS THE RECORD OF A RUN THAT HAPPENED. An order still
       being arranged cannot have one, and one past the delivery cannot be
       missing it — the card in those lanes is built around it. */
    if (isDelivered(r.status) !== (r.completedAt !== null)) {
      problems.push(`${r.orderNo}: ${r.status} and its completion time disagree`);
    }
    /* A WINTER BLEND IS A FUEL THING — lubricants and propane have no
       additive, so the flag would describe a spec nobody can supply. */
    if (r.winterAdditive && r.serviceLine !== "Fuel") {
      problems.push(`${r.orderNo}: winter additive on a ${r.serviceLine} order`);
    }
    for (const l of r.lines) {
      if (l.topOff && l.gal !== null) {
        problems.push(`${r.orderNo}: a top-off line cannot also request gallons`);
      }
      if (!l.topOff && l.gal === null) {
        problems.push(`${r.orderNo}: a non-top-off line needs gallons`);
      }
    }
  }
  return problems;
}

export type BrokerSortDir = "asc" | "desc";
export interface BrokerSortState {
  key: BrokerColumnKey;
  dir: BrokerSortDir;
}

function sortValue(r: BrokerOrder, key: BrokerColumnKey): string | number {
  switch (key) {
    case "order":
      // Numeric part only, so D- and M- series interleave by number rather than
      // the prefix sorting every movement order to one end.
      return Number(r.orderNo.slice(2));
    case "customer":
      return r.customer.title.toLowerCase();
    case "shipTo":
      return r.shipTo.toLowerCase();
    case "date":
      return r.dateKey;
    case "window":
      return r.window.start;
    case "qty":
      return totalGal(r.lines);
    case "vendor":
      return (VENDORS.find((v) => v.id === r.vendorId)?.name ?? "").toLowerCase();
    case "status":
      // Lifecycle order, not alphabetical — sorting by status means "how far
      // along is this", and A-Z would put Synced before Draft.
      return BROKER_STATUSES.indexOf(r.status);
    case "type":
      // The disc's letter is a shorthand for the order type, so sort by the
      // thing it is short FOR rather than by the letter.
      return r.orderType.toLowerCase();
    case "products":
      // The first product is what the cell shows; the "+2" is a count of what
      // it could not. Sorting by what is written is the only honest option.
      return (r.lines[0]?.product ?? "").toLowerCase();
    case "createdBy":
      return r.createdBy.toLowerCase();
    case "driver":
      return (r.driver ?? "").toLowerCase();
    case "business":
      return businessOf(r) ?? "";
    case "orderType":
      return r.orderType.toLowerCase();
    case "poNumber":
      // BLANKS LAST, both ways round. A PO number is a thing an order either
      // has or has not, and sorting the empty ones to the top on one press
      // buries every row that answers the question.
      return r.poNumber ? r.poNumber.toLowerCase() : "\uffff";
    case "bolNumber":
      return r.bolNumber ? r.bolNumber.toLowerCase() : "\uffff";
    case "hub":
      return r.hub.toLowerCase();
    case "salesperson":
      return r.salesperson.toLowerCase();
    case "tags":
      return r.tags.length ? r.tags.join(", ").toLowerCase() : "\uffff";
    default:
      return "";
  }
}

export function sortBrokerOrders(
  rows: BrokerOrder[],
  sort: BrokerSortState | null
): BrokerOrder[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

export function matchesBrokerOrder(r: BrokerOrder, q: string): boolean {
  return [
    r.orderNo,
    r.customer.title,
    r.customer.description,
    r.shipTo,
    r.date.title,
    r.status,
    r.kind,
    r.orderType,
    r.poNumber,
    r.bolNumber,
    r.hub,
    r.primaryPoc,
    r.salesperson,
    VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
    ...r.lines.map((l) => `${l.asset} ${l.product}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const BROKER_SEARCH_FIELDS = [
  { key: "order", label: "Order #", text: (r: BrokerOrder) => r.orderNo },
  { key: "type", label: "Type", text: (r: BrokerOrder) => r.orderType },
  {
    key: "customer",
    label: "Customer",
    text: (r: BrokerOrder) => `${r.customer.title} ${r.customer.description}`,
  },
  { key: "shipTo", label: "Ship To", text: (r: BrokerOrder) => r.shipTo },
  { key: "date", label: "Planned Date", text: (r: BrokerOrder) => r.date.title },
  {
    key: "vendor",
    label: "Vendor",
    text: (r: BrokerOrder) => VENDORS.find((v) => v.id === r.vendorId)?.name ?? "",
  },
  { key: "status", label: "Status", text: (r: BrokerOrder) => r.status },
  { key: "poNumber", label: "PO Number", text: (r: BrokerOrder) => r.poNumber },
  { key: "bolNumber", label: "BOL Number", text: (r: BrokerOrder) => r.bolNumber },
];

/**
 * THE TEXT A COLUMN SHOWS, for the filter box that sits under it.
 *
 * `BROKER_SEARCH_FIELDS` is a different list on purpose: it is what the global
 * search looks INTO, which includes things no column draws. A box under a
 * header has to match what is written above the rows beneath it — filtering
 * "Vendor" on a name the Vendor cell does not print would hide rows for a
 * reason nobody could see.
 */
export function brokerColumnText(r: BrokerOrder, key: BrokerColumnKey): string {
  switch (key) {
    case "order":
      return r.orderNo;
    case "type":
      return r.orderType;
    case "customer":
      return `${r.customer.title} ${r.customer.description}`;
    case "shipTo":
      return r.shipTo;
    case "date":
      return `${r.date.title} ${r.date.description ?? ""}`;
    case "window":
      return `${r.window.start} ${r.window.end}`;
    case "products":
      return r.lines.map((l) => l.product).join(" ");
    case "qty": {
      const g = totalGal(r.lines);
      return isAllTopOff(r.lines) ? "Top-off" : g ? g.toLocaleString() : "";
    }
    case "vendor":
      return (
        VENDORS.find((v) => v.id === r.vendorId)?.name ??
        (r.invitedVendorIds.length ? `${r.invitedVendorIds.length} invited` : "")
      );
    case "status":
      return r.status;
    case "createdBy":
      return r.createdBy;
    case "driver":
      return r.driver ?? "";
    case "business":
      return r.business ?? "";
    case "orderType":
      return r.orderType;
    case "poNumber":
      return r.poNumber;
    case "bolNumber":
      return r.bolNumber;
    case "hub":
      return r.hub;
    case "salesperson":
      return r.salesperson;
    case "tags":
      return r.tags.join(" ");
    default:
      return "";
  }
}

export function matchesBrokerOrderIn(
  r: BrokerOrder,
  q: string,
  scope: string
): boolean {
  if (!q) return true;
  const f = BROKER_SEARCH_FIELDS.find((x) => x.key === scope);
  return f ? f.text(r).toLowerCase().includes(q) : true;
}

/*
  ── The app's own status mappings ──────────────────────────────────────────────
  Per the DS's colour governance a status carries no colour until a usage rule
  binds it: the DS ships visual CHANNELS (`StatusTone`) and lane FILLS
  (`--fp-lane-*`), and each application declares its own mapping. This is 3PL's,
  declared once here so the board, the table and the sheet cannot drift — exactly
  how `statusTone()` in `tables-layout/data.ts` does it for the DS's own table.
*/

/** Lane fills, following the lifecycle: neutral -> in-flight -> done, with the
 *  credit hold as the one red. */
export const BROKER_LANE_COLOR: Record<BrokerStatus, LaneColorName> = {
  Draft: "grey",
  Blocked: "red",
  Quoting: "blue",
  Assigned: "cyan",
  Completed: "green",
  Review: "orange",
  Verified: "yellow",
  "Partially Synced": "yellow",
  Synced: "purple",
  Canceled: "grey",
};

/** The DS lane palette's key names. Kept as a local type so this data module
 *  does not import from a component. */
type LaneColorName =
  | "grey"
  | "blue"
  | "yellow"
  | "green"
  | "cyan"
  | "purple"
  | "violet"
  | "pink"
  | "orange"
  | "red";

/**
 * Chip tones. The DS ships four channels and this lifecycle has seven stages, so
 * three of them share `processing` — which is correct rather than a compromise:
 * Quoting, Assigned and Verified are all "in flight", and the DS's rule is that
 * colour is never the only carrier of meaning. The label spells the stage out in
 * every case.
 */
export const BROKER_STATUS_TONE = statusTones<BrokerStatus>({
  /* A record that exists, not yet a state. */
  Draft: "neutral",
  /* Something has gone wrong and the plan has to change. */
  Blocked: "critical",
  /* Waiting on partners to quote, then on the dispatcher to award. */
  Quoting: "caution",
  /* A partner is on it. True, and asks nothing. */
  Assigned: "info",
  Completed: "success",
  /* Somebody is checking the numbers — waiting on a person. */
  Review: "caution",
  /* A human has agreed the numbers — the part that needed a person is done. */
  Verified: "success",
  /* The sync was tried and failed. A problem to fix, not a step forward. */
  "Partially Synced": "critical",
  Synced: "success",
  Canceled: "neutral",
});

/** Half-hour grid for the §5.3 start/end window selects. */
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hour12}:${m === 0 ? "00" : "30"} ${h < 12 ? "AM" : "PM"}`);
    }
  }
  return out;
})();

/**
 * "6:00 AM" -> 360. The delivery window is stored as the formatted strings the
 * UI shows, so anything that ORDERS by time has to parse them — sorting the
 * strings puts "10:00 AM" before "6:00 AM".
 */
export function timeToMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}
