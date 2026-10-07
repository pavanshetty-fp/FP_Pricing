import type { ActivityEntry } from "./activity";

/**
 * Sales Console — Fuel Orders types.
 *
 * Structure and field names come from the FleetPanda Sales Console (the app
 * being recreated); every *visual* treatment comes from the DS.
 */
/**
 * THE ORDER'S STAGE (Pavan, 2026-10-07, taken from the Lovable Sales app):
 * Requested → Scheduled → Dispatched → Delivered, or Cancelled. Replaces the
 * old Assigned / Unassigned, which only said whether a driver was picked.
 */
export type FuelOrderStatus = "Requested" | "Scheduled" | "Dispatched" | "Delivered" | "Cancelled";

/** Order type. The list column renders the code; the label is the tooltip. */
export type OrderTypeCode = "D" | "E";

export interface OrderType {
  code: OrderTypeCode;
  label: "Delivery" | "Extraction";
}

/**
 * When the delivery is planned. Rendered as two lines — date over time — and no
 * longer a from/to range.
 */
export interface PlannedAt {
  /** Formatted date, e.g. "Aug 24, 2026". */
  date: string;
  /** Formatted 12-hour time, e.g. "1:35 AM". */
  time: string;
}

/**
 * One product line on an order, with its own gallons. The row's Qty (Gal) is the
 * sum, and hovering it reveals this breakdown when there is more than one line.
 */
export interface ProductQty {
  name: string;
  gal: number;
}

/** Two-line cell: primary over a muted secondary. */
export interface TwoLine {
  title: string;
  description: string;
}

/** Person cell — initials avatar + name. `null` renders "— Unassigned". */
export interface Person {
  name: string;
  /** Avatar fallback initials, e.g. "ST". */
  initials: string;
}

export interface FuelOrder {
  id: string;
  /** col "Order #" — order number and the type badge share one cell */
  orderNo: string;
  type: OrderType;
  /** col "Customer" — customer name over ship-to */
  customer: TwoLine;
  /** col "Product" — product lines; the cell truncates past `PRODUCTS_SHOWN` */
  products: ProductQty[];
  /** col "Qty (Gal)" — the sum of `products`, derived when rows are built */
  qtyGal: number;
  /** col "Date of Delivery" — delivery date over its relative form */
  date: TwoLine;
  /** `YYYY-MM-DD` of the delivery date — what the toolbar date filter matches. */
  dateKey: string;
  /** col "Planned Date & Time" — date over time, or `null` for an em-dash */
  planned: PlannedAt | null;
  /** col "Tags" — free-form labels; the cell truncates past what fits */
  tags: string[];
  /** col "Status" */
  status: FuelOrderStatus;
  /** col "Driver" — `null` renders "— Unassigned" */
  driver: Person | null;
  /** The sheet's "Mark as Urgent" — kept on the order since 2026-10-07. */
  urgent: boolean;
  /** The change log — see `activity.tsx`. Written by the screen's setter. */
  audit?: ActivityEntry[];
}

export type FuelOrderColumnKey =
  | "select"
  | "order"
  | "type"
  | "customer"
  | "products"
  | "qtyGal"
  | "date"
  | "planned"
  | "status"
  | "driver"
  | "tags"
  | "actions";

export interface FuelOrderColumnDef {
  key: FuelOrderColumnKey;
  label: string;
  /** px width — follows the DS column-frame vocabulary (select 40, actions 44). */
  width: number;
  sortable?: boolean;
  align?: "left" | "right";
}

export type SortDir = "asc" | "desc";

export interface SortState {
  key: FuelOrderColumnKey;
  dir: SortDir;
}

/**
 * The signed-in account. One shape for the top bar's avatar/menu and the
 * Profile page, so an edit on Profile is visible in the chrome immediately.
 * Structurally the DS's `TopBarUser`, restated here because the prototype owns
 * the state and the DS type is a prop contract, not a model.
 */
export interface AccountUser {
  name: string;
  email: string;
  /** Avatar fallback initials, e.g. "PS". */
  fallback: string;
  avatarSrc?: string;
}
