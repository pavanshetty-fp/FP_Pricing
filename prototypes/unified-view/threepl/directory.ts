/*
  The three remaining Directory lists: Customers, Products, Rental Assets.

  PROVENANCE. The NAMES are not invented — customers and ship-tos are the ones
  the Sales module and `orders.ts` already carry, and products are the exact
  `PRODUCTS` list an order's lines are drawn from. Inventing a second set would
  have made "Morris Group" mean two different accounts depending on the screen.

  What IS invented is the per-record detail no existing file carries: credit
  limits and balances, product grades, asset serials and rental rates. Values
  are plausible for a fuel brokerage — nothing here is presented as real.

  WHY CREDIT LIVES ON THE CUSTOMER. `orders.ts` already blocks orders with
  "Over credit limit" and "Credit status unapproved" but stores only the reason
  string on the order. The customer is where that reason comes FROM, so the
  fields that produce it belong here — and the two blocked orders in the seed
  data resolve against these two accounts.
*/
import { CUSTOMERS as SALES_CUSTOMERS } from "../customers";
import { PRODUCTS, SHIP_TO_SITES } from "./orders";

/* ───────────────────────────────────────────────────────────── customers ── */

export const CREDIT_STATUSES = ["Approved", "On hold", "Unapproved"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export interface BrokerCustomer {
  id: string;
  name: string;
  erpId: string;
  /** Sites this account receives at — the same names the order sheet offers. */
  shipTos: string[];
  creditStatus: CreditStatus;
  /** Dollars. `null` where no limit has been set — not the same as zero. */
  creditLimit: number | null;
  /** Dollars currently owed. Over the limit is what blocks an order. */
  balance: number;
  terms: string;
  poc: string;
  pocPhone: string;
}

/** Deterministic, so the list reads the same on every reload. */
const CREDIT_BY_NAME: Record<
  string,
  { creditStatus: CreditStatus; creditLimit: number | null; balance: number }
> = {
  "Bray, Raymond and Marks": { creditStatus: "Approved", creditLimit: 250_000, balance: 88_400 },
  // Over its limit — the seed order D-104725 is blocked on exactly this.
  "Morris Group": { creditStatus: "Approved", creditLimit: 120_000, balance: 141_250 },
  "Gonzalez, Palmer and Miller": { creditStatus: "Approved", creditLimit: 400_000, balance: 96_010 },
  // Never approved — the other blocked seed order, for a different reason.
  "Halvorsen Fuel Co.": { creditStatus: "Unapproved", creditLimit: null, balance: 12_900 },
  "Cardinal Logistics": { creditStatus: "Approved", creditLimit: 180_000, balance: 43_775 },
  "Westbrook Agriculture": { creditStatus: "On hold", creditLimit: 90_000, balance: 71_300 },
  "Ironline Transit": { creditStatus: "Approved", creditLimit: 60_000, balance: 8_120 },
};

const POC_BY_NAME: Record<string, [string, string]> = {
  "Bray, Raymond and Marks": ["Ray Obuya", "+1-713-555-0164"],
  "Morris Group": ["Colleen Marsh", "+1-816-555-0142"],
  "Gonzalez, Palmer and Miller": ["Marisol Vega", "+1-415-555-0142"],
  "Halvorsen Fuel Co.": ["Dwight Feeney", "+1-661-555-0188"],
  "Cardinal Logistics": ["Anita Kaur", "+1-916-555-0119"],
  "Westbrook Agriculture": ["Tom Alvarez", "+1-559-555-0173"],
  "Ironline Transit": ["Priya Raman", "+1-209-555-0155"],
};

export const BROKER_CUSTOMERS: BrokerCustomer[] = SALES_CUSTOMERS.map((c) => {
  const credit = CREDIT_BY_NAME[c.name] ?? {
    creditStatus: "Approved" as CreditStatus,
    creditLimit: 100_000,
    balance: 25_000,
  };
  const [poc, pocPhone] = POC_BY_NAME[c.name] ?? ["—", "—"];
  return {
    id: `bc-${c.id}`,
    name: c.name,
    erpId: c.erpId,
    /* The sites `orders.ts` actually delivers to, plus any the Sales record
       lists — one account's ship-tos, not two overlapping sets. */
    shipTos: [
      ...new Set([
        ...SHIP_TO_SITES.filter((s) => c.shipTos.includes(s.name)).map((s) => s.name),
        ...c.shipTos,
      ]),
    ],
    ...credit,
    terms: c.billingTerms,
    poc,
    pocPhone,
  };
});

/** Over the limit, or never approved — the two things that block an order. */
export function creditBlocked(c: BrokerCustomer): boolean {
  return (
    c.creditStatus !== "Approved" ||
    (c.creditLimit !== null && c.balance > c.creditLimit)
  );
}

/** What is left to draw on. `null` where no limit is set. */
export function creditAvailable(c: BrokerCustomer): number | null {
  return c.creditLimit === null ? null : c.creditLimit - c.balance;
}

export const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/* ────────────────────────────────────────────────────────────── products ── */

export const PRODUCT_CATEGORIES = ["Fuel", "DEF", "Lubricant"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface BrokerProduct {
  id: string;
  /** Exactly the names an order's lines carry — one vocabulary, not two. */
  name: string;
  category: ProductCategory;
  /** How it is measured. Everything here is gallons; the field is not. */
  unit: string;
  /** Tax treatment, which is the whole reason dyed and clear are separate. */
  taxable: boolean;
  /** Hazard class as it appears on the BOL. */
  hazmat: string | null;
  /** Reference price per unit — what a quote is compared against. */
  refPrice: number;
  active: boolean;
}

export const BROKER_PRODUCTS: BrokerProduct[] = [
  {
    id: "pr-1",
    name: "Dyed Diesel",
    category: "Fuel",
    unit: "gal",
    // Dyed is off-road: the dye IS the tax exemption.
    taxable: false,
    hazmat: "Class 3 · UN1202",
    refPrice: 3.42,
    active: true,
  },
  {
    id: "pr-2",
    name: "Clear Diesel #2",
    category: "Fuel",
    unit: "gal",
    taxable: true,
    hazmat: "Class 3 · UN1202",
    refPrice: 3.98,
    active: true,
  },
  {
    id: "pr-3",
    name: "Unleaded 87",
    category: "Fuel",
    unit: "gal",
    taxable: true,
    hazmat: "Class 3 · UN1203",
    refPrice: 3.61,
    active: true,
  },
  {
    id: "pr-4",
    name: "Unleaded 91",
    category: "Fuel",
    unit: "gal",
    taxable: true,
    hazmat: "Class 3 · UN1203",
    refPrice: 4.05,
    active: true,
  },
  {
    id: "pr-5",
    name: "DEF Bulk",
    category: "DEF",
    unit: "gal",
    taxable: true,
    // Urea solution — not a hazmat, which is why the column is nullable.
    hazmat: null,
    refPrice: 2.15,
    active: true,
  },
  {
    id: "pr-6",
    name: "Hydraulic Oil AW-46",
    category: "Lubricant",
    unit: "gal",
    taxable: true,
    hazmat: null,
    refPrice: 11.4,
    active: true,
  },
  /* Carried but no longer sold. It is on the list because old orders still
     reference it — deactivating is not deleting. */
  {
    id: "pr-7",
    name: "Kerosene K-1",
    category: "Fuel",
    unit: "gal",
    taxable: true,
    hazmat: "Class 3 · UN1223",
    refPrice: 4.62,
    active: false,
  },
];

/** Guards the invention above: every product an order can carry is on the list. */
export function assertProductsCoverOrders(): void {
  const listed = new Set(BROKER_PRODUCTS.map((p) => p.name));
  for (const name of PRODUCTS) {
    if (!listed.has(name)) {
      throw new Error(`Product "${name}" is orderable but missing from the Products list`);
    }
  }
}

/* ────────────────────────────────────────────────────── rental assets ── */

export const RENTAL_STATUSES = ["On rent", "Available", "In maintenance"] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];

export const RENTAL_TYPES = ["Bulk Tank", "Lube Skid", "DEF Tote", "Pump Cart"] as const;
export type RentalType = (typeof RENTAL_TYPES)[number];

export interface RentalAsset {
  id: string;
  /** The name that appears on an order line, where it is on rent. */
  name: string;
  serial: string;
  type: RentalType;
  capacityGal: number;
  status: RentalStatus;
  /** Null when Available or in maintenance — nobody is being billed. */
  customer: string | null;
  /** The ship-to it sits at. Null for anything back at the yard. */
  shipTo: string | null;
  /** Dollars per month. What the rental is worth while it is out. */
  monthlyRate: number;
  /** ISO date the current rental began. Null when not on rent. */
  onRentSince: string | null;
}

/* The four assets flagged `rental: true` in `SHIP_TO_SITES` are on rent HERE,
   at the same sites and to the same accounts — an asset cannot be out at a
   customer on one screen and sitting in the yard on another. */
export const RENTAL_ASSETS: RentalAsset[] = [
  {
    id: "ra-1",
    name: "180 asset",
    serial: "FP-TK-0180",
    type: "Bulk Tank",
    capacityGal: 1000,
    status: "On rent",
    customer: "Bray, Raymond and Marks",
    shipTo: "Bray North Yard",
    monthlyRate: 285,
    onRentSince: "2026-02-14",
  },
  {
    id: "ra-2",
    name: "Asset 1",
    serial: "FP-TK-0201",
    type: "Bulk Tank",
    capacityGal: 500,
    status: "On rent",
    customer: "Bray, Raymond and Marks",
    shipTo: "Bray Depot 2",
    monthlyRate: 190,
    onRentSince: "2025-11-02",
  },
  {
    id: "ra-3",
    name: "Lube Skid",
    serial: "FP-LS-0044",
    type: "Lube Skid",
    capacityGal: 120,
    status: "On rent",
    customer: "Morris Group",
    shipTo: "Morris Yard 4",
    monthlyRate: 240,
    onRentSince: "2026-06-30",
  },
  {
    id: "ra-4",
    name: "DEF Tote 2",
    serial: "FP-DT-0102",
    type: "DEF Tote",
    capacityGal: 330,
    status: "On rent",
    customer: "Gonzalez, Palmer and Miller",
    shipTo: "GPM Southside",
    monthlyRate: 95,
    onRentSince: "2026-04-18",
  },
  {
    id: "ra-5",
    name: "Main Skid",
    serial: "FP-LS-0051",
    type: "Lube Skid",
    capacityGal: 120,
    status: "On rent",
    customer: "Halvorsen Fuel Co.",
    shipTo: "Halvorsen Main",
    monthlyRate: 240,
    onRentSince: "2026-01-09",
  },
  {
    id: "ra-6",
    name: "Yard Tank 7",
    serial: "FP-TK-0207",
    type: "Bulk Tank",
    capacityGal: 1000,
    status: "Available",
    customer: null,
    shipTo: null,
    monthlyRate: 285,
    onRentSince: null,
  },
  {
    id: "ra-7",
    name: "Yard Tank 8",
    serial: "FP-TK-0208",
    type: "Bulk Tank",
    capacityGal: 2000,
    status: "Available",
    customer: null,
    shipTo: null,
    monthlyRate: 410,
    onRentSince: null,
  },
  {
    id: "ra-8",
    name: "DEF Tote 5",
    serial: "FP-DT-0105",
    type: "DEF Tote",
    capacityGal: 330,
    status: "In maintenance",
    customer: null,
    shipTo: null,
    monthlyRate: 95,
    onRentSince: null,
  },
  {
    id: "ra-9",
    name: "Pump Cart 3",
    serial: "FP-PC-0033",
    type: "Pump Cart",
    capacityGal: 0,
    status: "Available",
    customer: null,
    shipTo: null,
    monthlyRate: 60,
    onRentSince: null,
  },
  {
    id: "ra-10",
    name: "Lube Skid 9",
    serial: "FP-LS-0059",
    type: "Lube Skid",
    capacityGal: 120,
    status: "In maintenance",
    customer: null,
    shipTo: null,
    monthlyRate: 240,
    onRentSince: null,
  },
];

/** Only an asset that is out earns anything — the list's one honest total. */
export function monthlyRevenue(rows: RentalAsset[]): number {
  return rows.reduce((n, a) => n + (a.status === "On rent" ? a.monthlyRate : 0), 0);
}
