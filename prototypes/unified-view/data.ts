import type {
  CoreFuelStage,
  FuelOrder,
  FuelOrderStatus,
  ProductQty,
} from "./types";

/** Sum of a row's product lines — the Qty (Gal) value. */
export function totalGal(products: ProductQty[]): number {
  return products.reduce((n, p) => n + p.gal, 0);
}

/* -------------------------------------------------------------- money ----- */

/**
 * MONEY, AND THERE IS ONLY ONE. Always two places — `$4.30`, and `$4.00`
 * rather than `$4`. A column where some figures carry cents and others do not
 * cannot be scanned down, and the same total read `$147` on one screen and
 * `$147.00` on another depending on which of eight local formatters the file
 * happened to define. Eight became this on 2026-09-22.
 *
 * Intl, not a template literal, so a negative is `-$4,183.50` and not
 * `$-4,183.50`.
 */
const MONEY_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const MONEY = (n: number): string => MONEY_FMT.format(n);

/**
 * A PER-UNIT RATE IS NOT A TOTAL. $0.245 a gallon is three real places, and
 * rounding it to $0.25 changes the arithmetic on the invoice — so rates get
 * their own helper rather than a `dp` argument on the money one, which is how
 * a total ends up rendered to four places by accident.
 */
export const RATE = (n: number, dp = 3): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);

/* -------------------------------------------------------------- dates ----- */

/**
 * A BILLING PERIOD IS A MONTH, not a day — "Sep 2026". Beside `DATE_FMT`
 * because a formatter defined inline in the one screen that needs it is the
 * ninth money helper waiting to happen.
 */
export const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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
export function relativeLabel(offset: number, d: Date): string {
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
    "id" | "orderNo" | "qtyGal" | "date" | "dateKey" | "planned" | "status" | "urgent"
  > {
  /** Days from today. 0 = today, -1 = yesterday. */
  dayOffset: number;
  /** Planned time; the planned DATE is derived from `dayOffset`. `null` = none. */
  plannedTime: string | null;
}

const SEED: Seed[] = [
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray North Yard" },
    products: [{ name: "Gas Pr 1", gal: 2000 }],
    dayOffset: 0,
    plannedTime: "1:35 AM",
    tags: [],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray Depot 2" },
    products: [{ name: "Gas Pr 1", gal: 2000 }],
    dayOffset: 0,
    plannedTime: "12:11 AM",
    tags: ["Rush", "Night"],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "E", label: "Extraction" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray North Yard" },
    products: [{ name: "Gas Pr 1", gal: 2000 }],
    dayOffset: 1,
    plannedTime: "12:11 AM",
    tags: ["Split Load"],
    driver: { name: "Shriya", initials: "S" },
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Bray, Raymond and Marks", description: "Bray Depot 2" },
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
    customer: { title: "Gonzalez, Palmer and Miller", description: "GPM Southside" },
    products: [{ name: "123", gal: 300 }],
    dayOffset: -1,
    plannedTime: "11:46 PM",
    tags: ["Keep Full", "After Hours"],
    driver: null,
  },
  {
    type: { code: "D", label: "Delivery" },
    customer: { title: "Gonzalez, Palmer and Miller", description: "GPM Southside" },
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
    customer: { title: "Gonzalez, Palmer and Miller", description: "GPM Southside" },
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
    customer: { title: "Morris Group", description: "Morris Yard 4" },
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
    customer: { title: "Morris Group", description: "Morris Yard 4" },
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
    customer: { title: "Morris Group", description: "Morris Yard 4" },
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

/** Every stage, in the order an order moves through them. */
export const FUEL_ORDER_STAGES: CoreFuelStage[] = [
  "Requested",
  "Scheduled",
  "Dispatched",
  "Delivered",
  "Cancelled",
];

/**
 * THE STAGE A DRIVER CHANGE LEAVES (2026-10-07). An order cannot be scheduled
 * without a driver, so picking one on a Requested order schedules it and
 * clearing it from a Scheduled one sends it back. Once it is on the road, done
 * or cancelled, the driver no longer moves the stage.
 */
export function stageAfterDriver(
  status: FuelOrderStatus,
  hasDriver: boolean,
  /* THE STAGE BEFORE SCHEDULED, and whether the pick may schedule at all
     (Pavan, 2026-10-07). Sales Settings can put a stage in front of
     Scheduled, make Scheduled wait for an approval, or hold it for an
     accepted quote — `driverStage` in salesSettings.ts passes all three. */
  before: FuelOrderStatus = "Requested",
  maySchedule = true
): FuelOrderStatus {
  if (status === before && hasDriver && maySchedule) return "Scheduled";
  if (status === "Scheduled" && !hasDriver) return before;
  return status;
}

/**
 * SAMPLE STAGES — INVENTED. The source list only knew Assigned / Unassigned.
 * No driver = Requested. With a driver: past days are Delivered (a few
 * Cancelled), today spreads over Scheduled, Dispatched and Delivered, and
 * later days are Scheduled.
 */
function seedStage(i: number, dayOffset: number, hasDriver: boolean): FuelOrderStatus {
  if (!hasDriver) return i % 11 === 5 ? "Cancelled" : "Requested";
  if (dayOffset < 0) return i % 7 === 3 ? "Cancelled" : "Delivered";
  if (dayOffset > 0) return "Scheduled";
  return (["Scheduled", "Dispatched", "Delivered"] as const)[i % 3];
}

/**
 * SAMPLE URGENCY — INVENTED (2026-10-07). The source list never showed the
 * flag, so every seventh order carries it: two of today's land early-morning
 * and still undispatched, so the overdue banner has something to count.
 */
const seedUrgent = (i: number) => i % 7 === 0;

/**
 * SAMPLE TIME IN STAGE — INVENTED (Pavan, 2026-10-07). How many hours ago
 * each order entered its stage, so the SLA flag has something to find: a few
 * Requested past a day, one Scheduled past two, some Dispatched past eight.
 */
function seedStageSince(i: number, stage: FuelOrderStatus): string {
  const hours =
    stage === "Requested"
      ? [2, 6, 30, 10, 14][i % 5]
      : stage === "Scheduled"
        ? [5, 20, 52, 12, 30, 8][i % 6]
        : stage === "Dispatched"
          ? [1, 3, 10, 4][i % 4]
          : 24;
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

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
      status: seedStage(i, dayOffset, Boolean(seed.driver)),
      stageSince: seedStageSince(i, seedStage(i, dayOffset, Boolean(seed.driver))),
      urgent: seedUrgent(i),
    };
  });
})();

/**
 * WHEN THE ORDER IS PLANNED, AS A MOMENT (2026-10-07). The row keeps it as two
 * printed strings; the overdue banner, the planned sort and the board's time
 * sorts all need one instant to compare. `null` when there is no plan or the
 * typed time does not read as one.
 */
export function plannedAt(row: FuelOrder): Date | null {
  if (!row.planned) return null;
  const day = new Date(row.planned.date);
  const t = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(row.planned.time.trim());
  if (Number.isNaN(day.getTime()) || !t) return null;
  const hour = (Number(t[1]) % 12) + (t[3].toUpperCase() === "PM" ? 12 : 0);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Number(t[2]));
}

/**
 * Split an order's total gallons across N products.
 *
 * A bulk product change REPLACES an order's lines, and Qty (Gal) is the sum of
 * those lines — so the split has to preserve the order's own total exactly or
 * the bulk edit silently invents or destroys volume. Divides evenly and puts the
 * remainder on the FIRST line, so `sum(splitGallons(t, n)) === t` for every t
 * and n.
 *
 * ASSUMPTION, and the reason it is visible in the preview: an even split is a
 * guess. The source app has no bulk multi-product edit to copy, and nothing on
 * the order says how volume should divide between products. The confirm step
 * prints the resulting gallons per line so the operator sees the guess before
 * committing it rather than discovering it afterwards.
 */
export function splitGallons(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const out = Array.from({ length: n }, () => base);
  out[0] += total - base * n;
  return out;
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
