import { DATE_FMT, dateKeyOf, relativeLabel, startOfDay } from "./data";
import type { TwoLine } from "./types";

/*
  Asset Orders — the second rail destination.

  Columns are the five that were specified: Order #, Customer, Sales Rep,
  Delivery Date, Status. Everything structural is borrowed from Fuel Orders on
  purpose — same column-frame widths, same sort cycle, same date derivation off
  today — so the two lists read as one family rather than two designs.

  INVENTED, and flagged because it is not transcribed from the source app:
    • the status vocabulary below. The rulebook (§6) says records carry lifecycle
      states shown as a status value, but not which ones an asset order has, so
      this is a plausible four-state set, not a captured one.
    • the sales-rep names.
    • the order numbers, which continue a separate 61xxxxx series so they cannot
      be confused with fuel order numbers.
  Customer names ARE reused from the Fuel Orders dataset, so the same accounts
  appear across both lists.
*/

/** ASSUMPTION — a plausible lifecycle, not one captured from the source app. */
export type AssetOrderStatus = "Open" | "Scheduled" | "Delivered" | "Cancelled";

export const ASSET_ORDER_STATUSES: AssetOrderStatus[] = [
  "Open",
  "Scheduled",
  "Delivered",
  "Cancelled",
];

export interface AssetOrder {
  id: string;
  orderNo: string;
  /** Customer name over its ERP id, the same two-line cell Fuel Orders uses. */
  customer: TwoLine;
  salesRep: string;
  /** Delivery date, formatted, over its relative label. */
  date: TwoLine;
  /** `YYYY-MM-DD` — what the toolbar's date stepper matches. */
  dateKey: string;
  status: AssetOrderStatus;
  /** Sheet-only fields. Not columns; they exist so the sheet has a body. */
  assetType: string;
  quantity: number;
  serialNo: string;
  shipTo: string;
  poNumber: string;
  note: string;
}

export type AssetOrderColumnKey =
  | "order"
  | "customer"
  | "salesRep"
  | "date"
  | "status"
  | "actions";

export interface AssetOrderColumnDef {
  key: AssetOrderColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
}

/** Widths follow the DS column-frame vocabulary; actions = 44 as elsewhere. */
export const ASSET_ORDER_COLUMNS: AssetOrderColumnDef[] = [
  { key: "order", label: "Order #", width: 140, sortable: true },
  { key: "customer", label: "Customer", width: 260 },
  { key: "salesRep", label: "Sales Rep", width: 200 },
  { key: "date", label: "Delivery Date", width: 180, sortable: true },
  { key: "status", label: "Status", width: 160, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export const SALES_REPS = [
  "Dana Whitfield",
  "Marcus Reed",
  "Priya Raman",
  "Tom Alvarez",
];

export const ASSET_TYPES = [
  "Tank — 500 gal",
  "Tank — 1000 gal",
  "Pump assembly",
  "Meter",
  "Hose reel",
];

const NEWEST_ASSET_ORDER_NO = 6104420;
const TOTAL = 46;

interface Seed {
  customer: TwoLine;
  salesRep: string;
  dayOffset: number;
  status: AssetOrderStatus;
  assetType: string;
  quantity: number;
  serialNo: string;
  shipTo: string;
  poNumber: string;
}

const SEED: Seed[] = [
  {
    customer: { title: "Bray, Raymond and Marks", description: "ERP 418223" },
    salesRep: "Dana Whitfield",
    dayOffset: 0,
    status: "Scheduled",
    assetType: "Tank — 1000 gal",
    quantity: 2,
    serialNo: "TK-1000-4471",
    shipTo: "Bray, Raymond and Marks",
    poNumber: "PO-88213",
  },
  {
    customer: { title: "Morris Group", description: "ERP 505112" },
    salesRep: "Marcus Reed",
    dayOffset: 0,
    status: "Open",
    assetType: "Pump assembly",
    quantity: 1,
    serialNo: "PA-2210",
    shipTo: "Morris Group - 505112",
    poNumber: "PO-88240",
  },
  {
    customer: { title: "Gonzalez, Palmer and Miller", description: "ERP 331904" },
    salesRep: "Priya Raman",
    dayOffset: 1,
    status: "Scheduled",
    assetType: "Tank — 500 gal",
    quantity: 4,
    serialNo: "TK-500-9033",
    shipTo: "Gonzalez, Palmer and Miller",
    poNumber: "PO-88255",
  },
  {
    customer: { title: "Morris Group", description: "ERP 505112" },
    salesRep: "Tom Alvarez",
    dayOffset: -1,
    status: "Delivered",
    assetType: "Meter",
    quantity: 6,
    serialNo: "MT-7781",
    shipTo: "Morris Group - 505112",
    poNumber: "PO-88190",
  },
  {
    customer: { title: "Bray, Raymond and Marks", description: "ERP 418223" },
    salesRep: "Dana Whitfield",
    dayOffset: 0,
    status: "Delivered",
    assetType: "Hose reel",
    quantity: 3,
    serialNo: "HR-1140",
    shipTo: "Bray, Raymond and Marks",
    poNumber: "PO-88201",
  },
  {
    customer: { title: "Gonzalez, Palmer and Miller", description: "ERP 331904" },
    salesRep: "Marcus Reed",
    dayOffset: 2,
    status: "Cancelled",
    assetType: "Tank — 1000 gal",
    quantity: 1,
    serialNo: "TK-1000-4502",
    shipTo: "Gonzalez, Palmer and Miller",
    poNumber: "PO-88262",
  },
  {
    customer: { title: "Morris Group", description: "ERP 505112" },
    salesRep: "Priya Raman",
    dayOffset: 0,
    status: "Open",
    assetType: "Tank — 500 gal",
    quantity: 2,
    serialNo: "TK-500-9077",
    shipTo: "Morris Group - 505112",
    poNumber: "PO-88271",
  },
];

export const ASSET_ORDERS: AssetOrder[] = (() => {
  const today = startOfDay(new Date());
  return Array.from({ length: TOTAL }, (_, i) => {
    const { dayOffset, ...seed } = SEED[i % SEED.length];
    const when = new Date(today);
    when.setDate(when.getDate() + dayOffset);
    return {
      ...seed,
      id: `ao-${i + 1}`,
      orderNo: String(NEWEST_ASSET_ORDER_NO - i * 3),
      date: {
        title: DATE_FMT.format(when),
        description: relativeLabel(dayOffset, when),
      },
      dateKey: dateKeyOf(when),
      note: "",
    };
  });
})();

/* ---- sorting / searching, same contracts as the Fuel Orders helpers ---- */

export type AssetSortDir = "asc" | "desc";
export interface AssetSortState {
  key: AssetOrderColumnKey;
  dir: AssetSortDir;
}

function sortValue(r: AssetOrder, key: AssetOrderColumnKey): string | number {
  switch (key) {
    case "order":
      return Number(r.orderNo);
    case "customer":
      return r.customer.title.toLowerCase();
    case "salesRep":
      return r.salesRep.toLowerCase();
    case "date":
      return r.dateKey;
    case "status":
      return r.status;
    default:
      return "";
  }
}

export function sortAssetOrders(
  rows: AssetOrder[],
  sort: AssetSortState | null
): AssetOrder[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

export function matchesAssetOrder(row: AssetOrder, q: string): boolean {
  return [
    row.orderNo,
    row.customer.title,
    row.customer.description,
    row.salesRep,
    row.date.title,
    row.status,
    row.assetType,
    row.serialNo,
    row.poNumber,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const ASSET_ORDER_SEARCH_FIELDS = [
  { key: "order", label: "Order #", text: (r: AssetOrder) => r.orderNo },
  {
    key: "customer",
    label: "Customer",
    text: (r: AssetOrder) => `${r.customer.title} ${r.customer.description}`,
  },
  { key: "salesRep", label: "Sales Rep", text: (r: AssetOrder) => r.salesRep },
  { key: "date", label: "Delivery Date", text: (r: AssetOrder) => r.date.title },
  { key: "status", label: "Status", text: (r: AssetOrder) => r.status },
];

export function matchesAssetOrderIn(
  row: AssetOrder,
  q: string,
  scope: string
): boolean {
  if (!q) return true;
  const f = ASSET_ORDER_SEARCH_FIELDS.find((x) => x.key === scope);
  return f ? f.text(row).toLowerCase().includes(q) : true;
}
