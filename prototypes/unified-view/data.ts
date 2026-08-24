import type {
  FuelOrder,
  FuelOrderColumnDef,
  FuelOrderColumnKey,
  ProductQty,
  SortState,
} from "./types";

/*
  Column order + labels are the Sales Console's Fuel Orders list with this
  pass's feedback applied: Type is its own column again, Created is gone, Date is
  "Date of Delivery", and Window is "Scheduling Window" (a from/to range).

  Widths follow the DS column-frame vocabulary: select = 40, actions = 44, and
  body widths sized to their content.
*/
export const FUEL_ORDER_COLUMNS: FuelOrderColumnDef[] = [
  { key: "select", label: "", width: 40 },
  { key: "order", label: "Order #", width: 120, sortable: true },
  { key: "type", label: "Type", width: 70 },
  { key: "customer", label: "Customer", width: 200 },
  { key: "products", label: "Product", width: 190 },
  { key: "qtyGal", label: "Qty (Gal)", width: 105, sortable: true },
  { key: "date", label: "Date of Delivery", width: 140, sortable: true },
  { key: "planned", label: "Planned Date & Time", width: 150, sortable: true },
  { key: "status", label: "Status", width: 135, sortable: true },
  { key: "driver", label: "Driver", width: 140 },
  { key: "tags", label: "Tags", width: 200 },
  // Sticky: the row-open chevron stays reachable while the grid scrolls.
  { key: "actions", label: "", width: 52 },
];

/** Sum of a row's product lines — the Qty (Gal) value. */
export function totalGal(products: ProductQty[]): number {
  return products.reduce((n, p) => n + p.gal, 0);
}

/* -------------------------------------------------------------- dates ----- */

export const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Local midnight — so date maths never crosses a day on a timezone offset. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `YYYY-MM-DD` in local time. The key the date filter compares on. */
export function dateKeyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Full label for the toolbar's date control, e.g. "Mon, Aug 24, 2026". */
export function formatFullDate(d: Date): string {
  return WEEKDAY_FMT.format(d);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** "Today" / "Yesterday" / "Tomorrow", else the weekday name. */
function relativeLabel(offset: number, d: Date): string {
  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  if (offset === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
}

/**
 * Seed rows — the orders visible in the Sales Console screenshots, transcribed
 * rather than invented, then cycled to the source list's 115-order total.
 *
 * SAMPLE DATA, three places only:
 *  • Per-product gallons. The source list showed one total per row, never a
 *    split, so the lines below are apportioned to sum to the observed total.
 *  • Two rows are typed Extraction. The captured screens were all Delivery, but
 *    the Type column now carries two values, so both need to appear.
 *  • Tags. The source app's tag control was empty in every capture, so these
 *    labels are invented placeholders for the truncation behaviour.
 *  • Two rows lost their driver. As transcribed they carried a driver AND the
 *    status "Unassigned" (source orders 4592861 and 4592860), which cannot hold
 *    once status is derived from driver presence. They are driverless here so
 *    the data satisfies the derivation. See the note on `status` below.
 *
 * The planned TIME per row is the single time the source list actually showed;
 * the planned DATE is derived from the row's day offset.
 *
 * Dates are stored as an offset from today rather than the literal "Aug 24,
 * 2026" strings that were captured. The captured meaning was "today and
 * yesterday", and encoding that relatively keeps the Today/Yesterday labels
 * honest — and gives the toolbar's date filter something to find on either side
 * of today.
 */
interface Seed
  extends Omit<
    FuelOrder,
    "id" | "orderNo" | "qtyGal" | "date" | "dateKey" | "planned" | "status"
  > {
  /** Days from today. 0 = today, -1 = yesterday. */
  dayOffset: number;
  /** Planned time; the planned DATE is derived from `dayOffset`. `null` = none. */
  plannedTime: string | null;
}

const SEED: Seed[] = [
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray, Raymond and Marks" },
    products: [{ name: "Gas Pr 1", gal: 2000 }],
    dayOffset: 0,
    plannedTime: "1:35 AM",
    tags: [],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray, Raymond and Marks" },
    products: [{ name: "Gas Pr 1", gal: 2000 }],
    dayOffset: 0,
    plannedTime: "12:11 AM",
    tags: ["Rush", "Night"],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "E", label: "Extraction" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray, Raymond and Marks" },
    products: [{ name: "Gas Pr 1", gal: 2000 }],
    dayOffset: 1,
    plannedTime: "12:11 AM",
    tags: ["Split Load"],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray, Raymond and Marks" },
    products: [
      { name: "123", gal: 200 },
      { name: "200* Diesel Onroad clear", gal: 300 },
    ],
    dayOffset: -1,
    plannedTime: "11:49 PM",
    tags: [],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Gonzalez, Palmer and Miller", description: "Gonzalez, Palmer and Miller" },
    products: [{ name: "123", gal: 300 }],
    dayOffset: -1,
    plannedTime: "11:46 PM",
    tags: ["Keep Full", "After Hours"],
    driver: null,
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Gonzalez, Palmer and Miller", description: "Gonzalez, Palmer and Miller" },
    products: [
      { name: "123", gal: 250 },
      { name: "CLR DSL", gal: 350 },
    ],
    dayOffset: 0,
    plannedTime: "11:44 PM",
    tags: ["Hazmat", "Rush", "Night"],
    driver: null,
  },
  {
    type: { code: "E", label: "Extraction" },
    customer: { title: "Gonzalez, Palmer and Miller", description: "Gonzalez, Palmer and Miller" },
    products: [
      { name: "123", gal: 250 },
      { name: "CLR DSL", gal: 350 },
    ],
    dayOffset: 2,
    plannedTime: "9:00 AM",
    tags: [],
    driver: null,
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Morris Group", description: "Morris Group - 505112" },
    products: [
      { name: "Test", gal: 100 },
      { name: "1652", gal: 92 },
      { name: "CTL1", gal: 100 },
    ],
    dayOffset: 0,
    plannedTime: null,
    tags: ["Weekend"],
    driver: { name: "Aakash", initials: "A" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Morris Group", description: "Morris Group - 505112" },
    products: [
      { name: "Test", gal: 100 },
      { name: "1652", gal: 92 },
      { name: "CTL1", gal: 100 },
    ],
    dayOffset: 1,
    plannedTime: "1:00 PM",
    tags: ["Split Load", "Keep Full", "Rush", "Night"],
    driver: { name: "Aakash", initials: "A" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Morris Group", description: "Morris Group - 505112" },
    products: [
      { name: "200* Diesel Onroad clear", gal: 1800 },
      { name: "Test", gal: 100 },
      { name: "1652", gal: 92 },
      { name: "CTL1", gal: 100 },
    ],
    dayOffset: 0,
    plannedTime: null,
    tags: ["Split Load", "Keep Full", "Rush", "Night"],
    driver: { name: "Aakash", initials: "A" },
  },
];

/** The source list's total. Order numbers count down from the newest, as there. */
const TOTAL = 115;
const NEWEST_ORDER_NO = 4592866;

export const FUEL_ORDERS: FuelOrder[] = (() => {
  const today = startOfDay(new Date());
  return Array.from({ length: TOTAL }, (_, i) => {
    const { dayOffset, plannedTime, ...seed } = SEED[i % SEED.length];
    const when = addDays(today, dayOffset);
    return {
      ...seed,
      id: `fo-${i + 1}`,
      orderNo: String(NEWEST_ORDER_NO - i * 2),
      qtyGal: totalGal(seed.products),
      date: {
        title: DATE_FMT.format(when),
        description: relativeLabel(dayOffset, when),
      },
      dateKey: dateKeyOf(when),
      planned: plannedTime
        ? { date: DATE_FMT.format(when), time: plannedTime }
        : null,
      // Derived, never seeded: an order is Assigned exactly when it has a
      // driver. Keeping it derived here means the table and the order sheet
      // cannot disagree about the same row.
      status: seed.driver ? "Assigned" : "Unassigned",
    };
  });
})();

/** Value a column sorts on. Columns without per-row scalar data are a no-op. */
function sortValue(row: FuelOrder, key: FuelOrderColumnKey): string | number {
  switch (key) {
    case "order":
      return Number(row.orderNo);
    case "qtyGal":
      return row.qtyGal;
    case "date":
      return row.dateKey;
    case "planned":
      // Rows with no planned time sort last in ascending order.
      return row.planned ? `${row.dateKey} ${row.planned.time}` : "\uffff";
    case "status":
      return row.status;
    default:
      return 0;
  }
}

export function sortFuelOrders(
  rows: FuelOrder[],
  sort: SortState | null
): FuelOrder[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

/**
 * Per-column search — the fields the toolbar's "Search by column" tool offers.
 * This is the screen's analogue of the DS's `data-action-control/helpers.ts`
 * SEARCH_FIELDS, which is bound to that demo's own row shape and so cannot be
 * pointed at a FuelOrder. Same contract: a label for the picker and a text
 * projection to match against.
 *
 * Deliberately omits `select` and `actions` (no text) and Qty — a numeric
 * substring match on gallons ("2,092" vs "2092") misleads more than it helps,
 * and the column sorts instead.
 */
export interface FuelOrderSearchField {
  key: string;
  label: string;
  text: (r: FuelOrder) => string;
}

export const FUEL_ORDER_SEARCH_FIELDS: FuelOrderSearchField[] = [
  { key: "order", label: "Order #", text: (r) => r.orderNo },
  { key: "type", label: "Type", text: (r) => r.type.label },
  {
    key: "customer",
    label: "Customer",
    text: (r) => `${r.customer.title} ${r.customer.description}`,
  },
  {
    key: "products",
    label: "Product",
    text: (r) => r.products.map((p) => p.name).join(" "),
  },
  { key: "date", label: "Date of Delivery", text: (r) => r.date.title },
  {
    key: "planned",
    label: "Planned Date & Time",
    text: (r) => (r.planned ? `${r.planned.date} ${r.planned.time}` : ""),
  },
  { key: "status", label: "Status", text: (r) => r.status },
  { key: "driver", label: "Driver", text: (r) => r.driver?.name ?? "Unassigned" },
  { key: "tags", label: "Tags", text: (r) => r.tags.join(" ") },
];

/** Match a row against a lowercased query inside ONE column. */
export function matchesFuelOrderIn(
  row: FuelOrder,
  q: string,
  scope: string
): boolean {
  if (!q) return true;
  const field = FUEL_ORDER_SEARCH_FIELDS.find((f) => f.key === scope);
  if (!field) return true;
  return field.text(row).toLowerCase().includes(q);
}

/** Free-text match across a row's text columns. */
export function matchesFuelOrder(row: FuelOrder, q: string): boolean {
  return [
    row.orderNo,
    row.type.label,
    row.customer.title,
    row.customer.description,
    row.products.map((p) => p.name).join(" "),
    row.date.title,
    row.planned ? `${row.planned.date} ${row.planned.time}` : "",
    row.tags.join(" "),
    row.status,
    row.driver?.name ?? "Unassigned",
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
