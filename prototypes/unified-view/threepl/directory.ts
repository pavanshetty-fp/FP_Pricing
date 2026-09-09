/*
  The three Directory record types held here: Customers, Products, Rental
  Assets. Vendors live next door in `vendors.ts` because the order flow already
  owned that file before the Directory existed.

  PROVENANCE, unchanged from the first pass. The names that ORDERS reference are
  not invented — customers and ship-tos are the ones the Sales module and
  `orders.ts` already carry, and the first seven products are the exact
  `PRODUCTS` list an order's lines are drawn from. Inventing a second set would
  have made "Morris Group" mean two different accounts depending on the screen.

  WHAT CHANGED. Each record used to carry the six or seven fields the list
  columns needed. It now carries the full operational field set, because a
  directory record is opened to answer questions the list was never going to
  show: who do I call, where does it deliver, is the insurance current, which
  vendors can even fulfil this.

  CORE RECORDS vs GENERATED ONES. The hand-authored records at the top of each
  section are the ones the rest of the prototype points at, and their
  distinguishing facts — Morris Group being over its limit, Kerosene being
  discontinued — are written out by hand because those facts are load-bearing.
  Everything ELSE about them, and every record past them, comes from a seeded
  generator. That split is deliberate: the facts that matter are readable in
  the source, and the bulk that makes the list feel like a real directory is
  not thirty screens of literal.

  `name`, NOT `customerName` / `productName` / `assetName`. The spec names the
  display field once per entity; the four screens share one table, one detail
  layout and one form, all of which need to read "the name of this record"
  without knowing which entity it is. One key, four entities.
*/
import { CUSTOMERS as SALES_CUSTOMERS } from "../customers";
import { MOVEMENT_ASSET_NAMES, PRODUCTS, SHIP_TO_SITES } from "./orders";
import {
  ASSET_TAGS,
  CONTACT_ROLES,
  CUSTOMER_TAGS,
  PLACES,
  PRODUCT_TAGS,

  dateOffset,
  domainFor,
  emailFor,
  intBetween,

  maybe,
  personName,
  phoneNumber,
  pickFrom,
  rng,
  seedAttachments,
  seedAudit,
  shiftDays,
  someOf,
  streetAddress,
  TODAY,
  type Attachment,
  type AuditEvent,
  type DirectoryContact,
  type RecordStatus,
  type ShipToLocation,
} from "./directoryCore";

export { USD0 as USD } from "./directoryCore";

/* ═══════════════════════════════════════════════════════════════ customers ═ */

export const CREDIT_STATUSES = ["Approved", "On hold", "Unapproved"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Due on receipt", "Prepaid"] as const;

/**
 * APPROVAL AND STATUS ARE TWO AXES, not one.
 *
 * `status` is whether the record is in use at all; `creditStatus` is whether
 * finance will let an order through. An active account can be unapproved
 * (new, no credit check yet) and an archived one can have been approved for
 * years. The reference screen shows both, and collapsing them would have made
 * "Unapproved" mean two different things.
 */
export interface BrokerCustomer {
  id: string;
  name: string;
  erpId: string;
  status: RecordStatus;

  /* ── contact ── */
  phone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  billingEmail: string | null;
  dispatchEmail: string | null;
  mainContactName: string | null;
  mainContactRole: string | null;

  /* ── address ── */
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;

  /* ── financial ── */
  creditStatus: CreditStatus;
  /** Dollars. `null` where no limit has been set — not the same as zero. */
  creditLimit: number | null;
  /** Dollars currently owed. Over the limit is what blocks an order. */
  currentBalance: number;
  paymentTerms: string;
  taxId: string | null;
  taxExempt: boolean;
  currency: string;
  accountingCustomerId: string | null;

  /* ── operations ── */
  /** Printed on the dispatch sheet. The reference table shows it as a column. */
  customerInstruction: string | null;
  deliveryNotes: string | null;
  defaultShipToId: string | null;
  preferredVendorId: string | null;
  portalAccessEnabled: boolean;

  /* ── record ── */
  tags: string[];
  notes: string | null;
  attachments: Attachment[];
  contacts: DirectoryContact[];
  audit: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

/** Sites this account receives at. Derived, so the two never drift. */
export function shipTosOf(c: BrokerCustomer): ShipToLocation[] {
  return SHIP_TO_LOCATIONS.filter((s) => s.customerId === c.id);
}

/** Names only — what the order sheet's picker offers. */
export const shipToNames = (c: BrokerCustomer): string[] =>
  shipTosOf(c).map((s) => s.locationName);

/* The facts that are load-bearing elsewhere, written out. Two of these
   accounts are why seed orders D-104725 and its sibling sit in Blocked. */
const CREDIT_BY_NAME: Record<
  string,
  { creditStatus: CreditStatus; creditLimit: number | null; currentBalance: number }
> = {
  "Bray, Raymond and Marks": { creditStatus: "Approved", creditLimit: 250_000, currentBalance: 88_400 },
  "Morris Group": { creditStatus: "Approved", creditLimit: 120_000, currentBalance: 141_250 },
  "Gonzalez, Palmer and Miller": { creditStatus: "Approved", creditLimit: 400_000, currentBalance: 96_010 },
  "Halvorsen Fuel Co.": { creditStatus: "Unapproved", creditLimit: null, currentBalance: 12_900 },
  "Cardinal Logistics": { creditStatus: "Approved", creditLimit: 180_000, currentBalance: 43_775 },
  "Westbrook Agriculture": { creditStatus: "On hold", creditLimit: 90_000, currentBalance: 71_300 },
  "Ironline Transit": { creditStatus: "Approved", creditLimit: 60_000, currentBalance: 8_120 },
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

/**
 * The account names the reference screen actually shows.
 *
 * They are a real operational directory's real contents: a dozen genuine
 * companies mixed with test records somebody made during onboarding and never
 * cleaned up. Both belong in the seed — the second kind is exactly what the
 * "archived" filter and the incomplete-record display are FOR, and a directory
 * seeded only with tidy names would never exercise either.
 */
const REFERENCE_CUSTOMERS = [
  "Reza - QA",
  "QA-cp-sam",
  "QA CP",
  "Induja_Customer",
  "Prime fuel",
  "Role customer",
  "Sanity Test Customer Portal",
  "CFG Industries",
  "C.F. McDonald Electric, Inc",
  "Burnside Services, Inc",
  "Blue Team Restoration",
  "Belfor 1105",
  "Belfor - Dallas 1036",
] as const;

/** Company-name parts, by the industries a fuel brokerage actually serves. */
const COMPANY_HEADS = [
  "Ironline", "Westbrook", "Cardinal", "Halvorsen", "Redwood", "Sierra",
  "Granite", "Coastal", "Meridian", "Harbor", "Summit", "Pioneer", "Cascade",
  "Anchor", "Foothill", "Delta", "Copperline", "Northgate", "Silverpeak",
  "Brookfield", "Kingsley", "Vanguard", "Ridgeway", "Stonebridge", "Fairmont",
  "Lakeside", "Highpoint", "Crestwood", "Ambervale", "Traverse",
] as const;

const COMPANY_TAILS = [
  "Construction", "Restoration", "Logistics", "Agriculture", "Transit",
  "Industries", "Materials", "Contractors", "Aggregates", "Services, Inc",
  "Freight", "Mechanical", "Paving", "Earthworks", "Utilities", "Group",
  "Energy", "Equipment Rental", "Site Services", "Facilities",
] as const;

const INSTITUTIONS = [
  "Valley State University", "Cascade Community College", "Northgate Unified School District",
  "Mercy Regional Medical Center", "Port of Redwood Authority", "Tri-County Transit Authority",
  "Fresno Municipal Yard", "Sierra Water District",
] as const;

const CUSTOMER_INSTRUCTIONS = [
  "Call the POC 30 minutes out. No entry before 7am.",
  "Gate code 4417. Park at the north bay, not the office.",
  "Driver must sign in at the guard shack with photo ID.",
  "Fuel the generators first, then the yard tank.",
  "No deliveries Fridays after 2pm — site closes early.",
  "Hard hat and vest required past the gate.",
  "Use the rear entrance on Foundry Ave; the main gate is too tight for a tanker.",
  "Ring the site foreman on arrival. Do not block the loading dock.",
] as const;

let customerSeq = 0;
const nextCustomerId = () => `bc-${(customerSeq += 1)}`;

/**
 * Fills every field a customer has from the handful that were specified.
 *
 * One function rather than a literal per record: the seed's job is to be
 * PLAUSIBLE and COMPLETE, and the only parts worth reading in source are the
 * parts that differ. Everything derived here is deterministic in `seed`.
 */
function makeCustomer(spec: {
  seed: number;
  id: string;
  name: string;
  erpId: string;
  status?: RecordStatus;
  creditStatus?: CreditStatus;
  creditLimit?: number | null;
  currentBalance?: number;
  paymentTerms?: string;
  poc?: [string, string];
  /** Test-looking records are deliberately threadbare. */
  sparse?: boolean;
}): BrokerCustomer {
  const r = rng(spec.seed);
  const place = pickFrom(r, PLACES);
  const sparse = spec.sparse ?? false;
  const domain = domainFor(spec.name);
  const contactName = spec.poc?.[0] ?? personName(r);
  const createdAt = new Date(
    shiftDays(TODAY, -intBetween(r, 60, 1500)).setUTCHours(intBetween(r, 8, 17), intBetween(r, 0, 59))
  ).toISOString();
  const updatedAt = new Date(
    shiftDays(TODAY, -intBetween(r, 0, 55)).setUTCHours(intBetween(r, 8, 17), intBetween(r, 0, 59))
  ).toISOString();

  /* WEIGHTED, not uniform. A real receivables book is overwhelmingly
     approved — a directory where a third of the accounts are on hold would
     make the Blocked lane meaningless and the credit filter useless. */
  const creditStatus =
    spec.creditStatus ??
    pickFrom(r, [
      "Approved", "Approved", "Approved", "Approved", "Approved", "Approved",
      "Approved", "On hold", "Unapproved",
    ] as const);
  const limit =
    spec.creditLimit !== undefined
      ? spec.creditLimit
      : creditStatus === "Unapproved"
        ? maybe(r, 0.2, intBetween(r, 2, 40) * 5_000)
        : intBetween(r, 2, 80) * 5_000;

  return {
    id: spec.id,
    name: spec.name,
    erpId: spec.erpId,
    status: spec.status ?? (r() < 0.08 ? "inactive" : "active"),

    phone: sparse ? maybe(r, 0.4, phoneNumber(r)) : spec.poc?.[1] ?? phoneNumber(r),
    secondaryPhone: maybe(r, sparse ? 0.1 : 0.35, phoneNumber(r)),
    email: sparse ? maybe(r, 0.3, emailFor(contactName, domain)) : emailFor(contactName, domain),
    billingEmail: maybe(r, sparse ? 0.15 : 0.75, `ap@${domain}`),
    dispatchEmail: maybe(r, sparse ? 0.15 : 0.6, `dispatch@${domain}`),
    mainContactName: sparse ? maybe(r, 0.35, contactName) : contactName,
    mainContactRole: maybe(r, sparse ? 0.2 : 0.8, pickFrom(r, CONTACT_ROLES)),

    addressLine1: sparse ? maybe(r, 0.4, streetAddress(r)) : streetAddress(r),
    addressLine2: maybe(r, 0.18, `Suite ${intBetween(r, 100, 890)}`),
    city: sparse ? maybe(r, 0.5, place.city) : place.city,
    state: sparse ? maybe(r, 0.5, place.state) : place.state,
    zip: sparse ? maybe(r, 0.35, place.zip) : place.zip,
    country: "USA",

    creditStatus,
    creditLimit: limit,
    currentBalance: spec.currentBalance ?? intBetween(r, 0, 260) * 500,
    paymentTerms: spec.paymentTerms ?? pickFrom(r, PAYMENT_TERMS),
    taxId: maybe(r, sparse ? 0.1 : 0.55, `${intBetween(r, 10, 99)}-${intBetween(r, 1000000, 9999999)}`),
    taxExempt: r() < 0.18,
    currency: "USD",
    accountingCustomerId: maybe(r, sparse ? 0.1 : 0.7, `NS-${intBetween(r, 10_000, 99_999)}`),

    customerInstruction: maybe(r, sparse ? 0.1 : 0.55, pickFrom(r, CUSTOMER_INSTRUCTIONS)),
    deliveryNotes: maybe(r, 0.3, pickFrom(r, [
      "Tanker access is tight after 3pm — school traffic.",
      "Two tanks on site; the south one is DEF only.",
      "Spill kit is in the shed by the scale house.",
    ] as const)),
    defaultShipToId: null,
    preferredVendorId: null,
    portalAccessEnabled: r() < 0.42,

    tags: r() < 0.7 ? someOf(r, CUSTOMER_TAGS, 3) : [],
    notes: maybe(r, 0.25, "Reviewed at the quarterly account meeting. No open disputes."),
    attachments: seedAttachments(r, [
      "W-9.pdf", "Credit Application.pdf", "Tax Exemption Certificate.pdf",
      "Master Service Agreement.pdf", "Site Map.png", "Rate Sheet 2026.xlsx",
    ], sparse ? 1 : 3),
    contacts: [],
    audit: [],
    createdAt,
    updatedAt,
  };
}

/**
 * Contacts, ship-tos and the audit trail are attached AFTER the record exists,
 * because each of them needs the record's own id to point back at.
 */
function attachCustomerChildren(c: BrokerCustomer, seed: number): void {
  const r = rng(seed + 7717);
  const domain = domainFor(c.name);

  const n = intBetween(r, c.mainContactName ? 1 : 0, 4);
  c.contacts = Array.from({ length: n }, (_, i) => {
    const nm = i === 0 && c.mainContactName ? c.mainContactName : personName(r);
    return {
      id: `${c.id}-ct-${i + 1}`,
      name: nm,
      role: i === 0 && c.mainContactRole ? c.mainContactRole : pickFrom(r, CONTACT_ROLES),
      phone: maybe(r, 0.85, phoneNumber(r)),
      email: maybe(r, 0.8, emailFor(nm, domain)),
      isPrimary: i === 0,
      notes: maybe(r, 0.2, "Prefers a text over a call."),
    };
  });

  c.audit = seedAudit(r, {
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    noun: "Customer",
    fields: [
      "Credit limit", "Payment terms", "Customer instruction", "Primary contact",
      "Billing email", "Portal access", "Approval status", "Ship-to location",
    ],
  });
}

/* ── ship-to child records ─────────────────────────────────────────────── */

export const SHIP_TO_LOCATIONS: ShipToLocation[] = [];

function makeShipTos(c: BrokerCustomer, seed: number, known: string[]): void {
  const r = rng(seed + 313);
  /* The sites `orders.ts` actually delivers to come first and keep their real
     names; anything past them is generated so bigger accounts look bigger. */
  const extra = known.length > 0 ? intBetween(r, 0, 2) : intBetween(r, 0, 3);
  const names = [
    ...known,
    ...Array.from({ length: extra }, () =>
      `${c.name.split(/[\s,]+/)[0]} ${pickFrom(r, ["Yard", "Depot", "Plant", "Terminal", "Site", "Shop"] as const)} ${intBetween(r, 1, 9)}`
    ),
  ];

  names.forEach((locationName, i) => {
    const place = pickFrom(r, PLACES);
    SHIP_TO_LOCATIONS.push({
      id: `${c.id}-st-${i + 1}`,
      customerId: c.id,
      locationName,
      addressLine1: streetAddress(r),
      addressLine2: maybe(r, 0.15, `Bldg ${pickFrom(r, ["A", "B", "C", "D"] as const)}`),
      city: place.city,
      state: place.state,
      zip: place.zip,
      country: "USA",
      /* Coordinates are the field a real directory most often lacks — they
         arrive from a geocode nobody has run yet. */
      latitude: maybe(r, 0.45, Number((place.lat + (r() - 0.5) * 0.08).toFixed(5))),
      longitude: maybe(r, 0.45, Number((place.lng + (r() - 0.5) * 0.08).toFixed(5))),
      isDefault: i === 0,
      status: r() < 0.9 ? "active" : "inactive",
      notes: maybe(r, 0.25, pickFrom(r, [
        "Tank is behind the shop, not visible from the road.",
        "Fill point is on the driver's side of the trailer.",
        "Call ahead — the gate is locked outside shift hours.",
      ] as const)),
    });
  });

  const first = SHIP_TO_LOCATIONS.find((s) => s.customerId === c.id);
  c.defaultShipToId = first?.id ?? null;
}

/* ── the composed list ─────────────────────────────────────────────────── */

function buildCustomers(): BrokerCustomer[] {
  const out: BrokerCustomer[] = [];

  /* 1. THE ACCOUNTS ORDERS POINT AT. Same names, same ids as before, so every
        order in the seed still resolves to a real customer record. */
  SALES_CUSTOMERS.forEach((c, i) => {
    const credit = CREDIT_BY_NAME[c.name];
    const rec = makeCustomer({
      seed: 1000 + i,
      id: `bc-${c.id}`,
      name: c.name,
      erpId: c.erpId,
      status: "active",
      creditStatus: credit?.creditStatus,
      creditLimit: credit?.creditLimit,
      currentBalance: credit?.currentBalance,
      paymentTerms: c.billingTerms,
      poc: POC_BY_NAME[c.name],
    });
    makeShipTos(rec, 1000 + i, [
      ...new Set([
        ...SHIP_TO_SITES.filter((s) => c.shipTos.includes(s.name)).map((s) => s.name),
        ...c.shipTos,
      ]),
    ]);
    attachCustomerChildren(rec, 1000 + i);
    out.push(rec);
  });

  /* 2. THE NAMES THE REFERENCE SCREEN SHOWS, test records included. */
  REFERENCE_CUSTOMERS.forEach((name, i) => {
    const looksLikeATest = /qa|test|sanity|role customer|induja/i.test(name);
    const rec = makeCustomer({
      seed: 2000 + i,
      id: nextCustomerId(),
      name,
      erpId: looksLikeATest ? `TMP-${1000 + i}` : `CUST-${4200 + i}`,
      status: looksLikeATest && i % 3 === 0 ? "inactive" : "active",
      creditStatus: looksLikeATest ? "Unapproved" : undefined,
      sparse: looksLikeATest,
    });
    makeShipTos(rec, 2000 + i, []);
    attachCustomerChildren(rec, 2000 + i);
    out.push(rec);
  });

  /* 3. VOLUME. Enough that pagination, filtering and grouping have something
        to do — a directory of twelve proves none of them work. */
  const target = 150;
  let i = 0;
  while (out.length < target) {
    const seed = 3000 + i;
    const r = rng(seed);
    const name =
      r() < 0.12
        ? INSTITUTIONS[i % INSTITUTIONS.length]
        : `${pickFrom(r, COMPANY_HEADS)} ${pickFrom(r, COMPANY_TAILS)}`;
    /* A directory accumulates duplicates and near-duplicates; a suffix keeps
       them distinguishable without pretending the collision never happens. */
    const unique = out.some((c) => c.name === name) ? `${name} ${intBetween(r, 100, 9999)}` : name;
    const rec = makeCustomer({
      seed,
      id: nextCustomerId(),
      name: unique,
      erpId: `CUST-${5000 + i}`,
      sparse: r() < 0.14,
    });
    makeShipTos(rec, seed, []);
    attachCustomerChildren(rec, seed);
    out.push(rec);
    i += 1;
  }

  return out;
}

export const BROKER_CUSTOMERS: BrokerCustomer[] = buildCustomers();

/** Over the limit, or never approved — the two things that block an order. */
export function creditBlocked(c: BrokerCustomer): boolean {
  return (
    c.creditStatus !== "Approved" ||
    (c.creditLimit !== null && c.currentBalance > c.creditLimit)
  );
}

/** What is left to draw on. `null` where no limit is set. */
export function creditAvailable(c: BrokerCustomer): number | null {
  return c.creditLimit === null ? null : c.creditLimit - c.currentBalance;
}

/* ═══════════════════════════════════════════════════════════════ products ═ */

export const PRODUCT_CATEGORIES = ["Fuel", "DEF", "Lubricant", "Additive", "Service"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const UNITS_OF_MEASURE = ["gal", "lit", "case", "drum", "each"] as const;

export interface BrokerProduct {
  id: string;
  /** Exactly the names an order's lines carry — one vocabulary, not two. */
  name: string;
  productCode: string;
  erpItemId: string | null;
  category: ProductCategory;
  description: string | null;
  status: RecordStatus;

  /* ── quantity ── */
  /** How it is measured. `gal` here; the field is not gallons-only. */
  unit: string;
  quantityPrecision: number;
  minimumQuantity: number | null;
  maximumQuantity: number | null;
  defaultQuantity: number | null;
  /**
   * TOP-OFF IS A PRODUCT CAPABILITY, not an order-time whim. An order line can
   * only offer the top-off toggle when the product it names supports it, which
   * is why this is a boolean HERE and not only on the line.
   */
  topOffSupported: boolean;
  quantityOverrideAllowed: boolean;

  /* ── money ── */
  basePrice: number | null;
  currency: string;
  taxCode: string | null;
  taxable: boolean;
  revenueAccount: string | null;
  cogsAccount: string | null;
  inventoryClassification: string | null;

  /* ── availability ── */
  availableToAllCustomers: boolean;
  allowedCustomerIds: string[];
  blockedCustomerIds: string[];
  availableVendorIds: string[];
  defaultVendorIds: string[];
  geographyRestrictions: string[];

  /* ── safety ── */
  /** Hazard class as it appears on the BOL. */
  hazmat: string | null;
  hazardFlags: string[];
  sdsAttachments: Attachment[];

  /* ── record ── */
  tags: string[];
  notes: string | null;
  attachments: Attachment[];
  audit: AuditEvent[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** The seven the order sheet draws from, plus the reference screen's names. */
interface ProductSeed {
  name: string;
  category: ProductCategory;
  unit: string;
  taxable: boolean;
  hazmat: string | null;
  basePrice: number;
  active: boolean;
  topOff?: boolean;
}

const CORE_PRODUCTS: ProductSeed[] = [
  // Dyed is off-road: the dye IS the tax exemption.
  { name: "Dyed Diesel", category: "Fuel", unit: "gal", taxable: false, hazmat: "Class 3 · UN1202", basePrice: 3.42, active: true, topOff: true },
  { name: "Clear Diesel #2", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1202", basePrice: 3.98, active: true, topOff: true },
  { name: "Unleaded 87", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1203", basePrice: 3.61, active: true, topOff: true },
  { name: "Unleaded 91", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1203", basePrice: 4.05, active: true, topOff: false },
  // Urea solution — not a hazmat, which is why the column is nullable.
  { name: "DEF Bulk", category: "DEF", unit: "gal", taxable: true, hazmat: null, basePrice: 2.15, active: true, topOff: true },
  { name: "Hydraulic Oil AW-46", category: "Lubricant", unit: "gal", taxable: true, hazmat: null, basePrice: 11.4, active: true, topOff: false },
  /* Carried but no longer sold. It is on the list because old orders still
     reference it — deactivating is not deleting. */
  { name: "Kerosene K-1", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1223", basePrice: 4.62, active: false, topOff: false },

  /* The names the reference screen shows. `lit` appears exactly once, because
     the unit column exists to prove the field is not hard-coded to gallons. */
  { name: "Regular Diesel", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1202", basePrice: 3.79, active: true, topOff: true },
  { name: "DEF", category: "DEF", unit: "lit", taxable: true, hazmat: null, basePrice: 0.62, active: true, topOff: true },
  { name: "OS LUBE", category: "Lubricant", unit: "drum", taxable: true, hazmat: null, basePrice: 428, active: true, topOff: false },
  { name: "Gasoline 87 E10", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1203", basePrice: 3.55, active: true, topOff: true },
  { name: "Gasoline 91 Premium", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1203", basePrice: 4.12, active: true, topOff: false },
  { name: "Gasoline 87 Non-Ethanol", category: "Fuel", unit: "gal", taxable: true, hazmat: "Class 3 · UN1203", basePrice: 4.34, active: true, topOff: false },
];

const PRODUCT_FAMILIES = [
  { head: "Hydraulic Oil", grades: ["AW-32", "AW-68", "ISO 46", "ISO 100", "ISO 150"], cat: "Lubricant" as const, unit: "gal", price: [9, 16] },
  { head: "Engine Oil", grades: ["15W-40", "5W-30", "10W-30", "0W-20", "SAE 30"], cat: "Lubricant" as const, unit: "drum", price: [340, 620] },
  { head: "Gear Oil", grades: ["80W-90", "85W-140", "75W-90"], cat: "Lubricant" as const, unit: "drum", price: [380, 540] },
  { head: "Coolant", grades: ["ELC 50/50", "Green 50/50", "Concentrate", "Heavy Duty"], cat: "Additive" as const, unit: "case", price: [72, 140] },
  { head: "Diesel Additive", grades: ["Winter", "Cetane Boost", "Anti-Gel", "Biocide"], cat: "Additive" as const, unit: "case", price: [58, 130] },
  { head: "DEF", grades: ["Tote 275", "Drum 55", "Jug 2.5", "Bulk Rack"], cat: "DEF" as const, unit: "each", price: [18, 480] },
  { head: "Grease", grades: ["EP-2 Lithium", "Moly EP-2", "Marine", "High Temp"], cat: "Lubricant" as const, unit: "case", price: [88, 165] },
  { head: "Marine Diesel", grades: ["ULSD", "Dyed", "Low Sulphur"], cat: "Fuel" as const, unit: "gal", price: [3.6, 4.4] },
  { head: "Tank Cleaning", grades: ["Standard", "Confined Space", "Emergency"], cat: "Service" as const, unit: "each", price: [450, 1400] },
  { head: "Fuel Polishing", grades: ["Per Tank", "Per Hour", "Mobile Rig"], cat: "Service" as const, unit: "each", price: [180, 900] },
  { head: "Transmission Fluid", grades: ["TO-4 30", "Dexron VI", "Synthetic"], cat: "Lubricant" as const, unit: "drum", price: [310, 590] },
  { head: "Propane", grades: ["Bulk", "Cylinder 100 lb", "Forklift Cylinder"], cat: "Fuel" as const, unit: "gal", price: [2.1, 3.4] },
  { head: "Heating Oil", grades: ["No. 2", "Blend B5"], cat: "Fuel" as const, unit: "gal", price: [3.2, 4.1] },
  { head: "Solvent", grades: ["Parts Wash", "Degreaser Concentrate"], cat: "Additive" as const, unit: "drum", price: [210, 420] },
  { head: "Tank Inspection", grades: ["Annual", "Leak Test", "Recertification"], cat: "Service" as const, unit: "each", price: [220, 980] },
];

function makeProduct(spec: ProductSeed & { seed: number; id: string; order: number }): BrokerProduct {
  const r = rng(spec.seed);
  const createdAt = new Date(shiftDays(TODAY, -intBetween(r, 90, 1800)).setUTCHours(10)).toISOString();
  const updatedAt = new Date(shiftDays(TODAY, -intBetween(r, 0, 80)).setUTCHours(14)).toISOString();
  const isService = spec.category === "Service";
  const mapped = r() < 0.72;

  return {
    id: spec.id,
    name: spec.name,
    productCode: `${spec.category.slice(0, 2).toUpperCase()}-${String(spec.order).padStart(4, "0")}`,
    erpItemId: maybe(r, 0.7, `ITEM-${intBetween(r, 1000, 9999)}`),
    category: spec.category,
    description: maybe(r, 0.6, `${spec.name} — supplied bulk or packaged depending on site access.`),
    status: spec.active ? (r() < 0.06 ? "inactive" : "active") : "inactive",

    unit: spec.unit,
    quantityPrecision: spec.unit === "gal" || spec.unit === "lit" ? 0 : 2,
    minimumQuantity: isService ? null : intBetween(r, 1, 10) * 25,
    maximumQuantity: maybe(r, 0.5, intBetween(r, 4, 40) * 500),
    defaultQuantity: maybe(r, 0.55, intBetween(r, 1, 20) * 100),
    topOffSupported: spec.topOff ?? (!isService && r() < 0.45),
    quantityOverrideAllowed: !isService && r() < 0.8,

    basePrice: spec.basePrice,
    currency: "USD",
    /* TAX MAPPED / UNMAPPED is a filter on the list, so the seed has to
       produce both — an always-mapped catalogue makes the filter dead. */
    taxCode: spec.taxable ? maybe(r, 0.8, pickFrom(r, ["TX-FUEL", "TX-STD", "TX-EXEMPT", "TX-SVC"] as const)) : "TX-EXEMPT",
    taxable: spec.taxable,
    revenueAccount: mapped ? `4${intBetween(r, 100, 199)} · Product Revenue` : null,
    cogsAccount: mapped ? `5${intBetween(r, 100, 199)} · Cost of Goods` : null,
    inventoryClassification: maybe(r, 0.6, pickFrom(r, ["Bulk Fuel", "Packaged Lube", "Chemical", "Non-Inventory"] as const)),

    availableToAllCustomers: r() < 0.75,
    allowedCustomerIds: [],
    blockedCustomerIds: [],
    availableVendorIds: [],
    defaultVendorIds: [],
    geographyRestrictions: r() < 0.15 ? someOf(r, ["CA", "TX", "AZ", "NV", "OR"] as const, 2) : [],

    hazmat: spec.hazmat,
    hazardFlags: spec.hazmat ? someOf(r, ["Flammable", "Combustible", "Keep from open flame"] as const, 2) : [],
    sdsAttachments: spec.hazmat
      ? seedAttachments(r, [`SDS ${spec.name}.pdf`, "Emergency Response Guide.pdf"], 2)
      : [],

    tags: r() < 0.6 ? someOf(r, PRODUCT_TAGS, 2) : [],
    notes: maybe(r, 0.2, "Priced off the weekly rack; review every Monday."),
    attachments: seedAttachments(r, ["Spec Sheet.pdf", "Rack Pricing.xlsx", "Label.png"], 2),
    audit: [],
    displayOrder: spec.order,
    createdAt,
    updatedAt,
  };
}

function buildProducts(): BrokerProduct[] {
  const out: BrokerProduct[] = [];

  CORE_PRODUCTS.forEach((p, i) => {
    out.push(makeProduct({ ...p, seed: 4000 + i, id: `pr-${i + 1}`, order: i + 1 }));
  });

  let i = 0;
  while (out.length < 60) {
    const fam = PRODUCT_FAMILIES[i % PRODUCT_FAMILIES.length];
    const grade = fam.grades[Math.floor(i / PRODUCT_FAMILIES.length) % fam.grades.length];
    const r = rng(5000 + i);
    const name = `${fam.head} ${grade}`;
    if (!out.some((p) => p.name === name)) {
      out.push(
        makeProduct({
          seed: 5000 + i,
          id: `pr-${out.length + 1}`,
          order: out.length + 1,
          name,
          category: fam.cat,
          unit: fam.unit,
          taxable: r() < 0.85,
          /* Not every fuel is a Class 3 liquid. Propane is a flammable GAS —
             Class 2.1, UN1978 — and calling it diesel on the placard is the
             kind of seed-data shortcut that teaches a screen the wrong shape. */
          hazmat:
            fam.cat !== "Fuel"
              ? null
              : fam.head === "Propane"
                ? "Class 2.1 · UN1978"
                : "Class 3 · UN1202",
          basePrice: Number((fam.price[0] + r() * (fam.price[1] - fam.price[0])).toFixed(2)),
          active: r() < 0.88,
        })
      );
    }
    i += 1;
    if (i > 400) break;
  }

  /* Availability lists point at real ids, so the detail screen's "12 customers"
     is a number somebody can click through rather than a decoration. */
  out.forEach((p, idx) => {
    const r = rng(6000 + idx);
    if (!p.availableToAllCustomers) {
      p.allowedCustomerIds = someOf(r, BROKER_CUSTOMERS.map((c) => c.id), 14);
    }
    if (r() < 0.2) {
      p.blockedCustomerIds = someOf(r, BROKER_CUSTOMERS.map((c) => c.id), 3);
    }
    p.audit = seedAudit(r, {
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      noun: "Product",
      fields: ["Base price", "Tax code", "Unit of measure", "Top-off support", "Status", "Revenue account"],
    });
  });

  return out;
}

export const BROKER_PRODUCTS: BrokerProduct[] = buildProducts();

/** Guards the invention above: every product an order can carry is on the list. */
export function assertProductsCoverOrders(): void {
  const listed = new Set(BROKER_PRODUCTS.map((p) => p.name));
  for (const name of PRODUCTS) {
    if (!listed.has(name)) {
      throw new Error(`Product "${name}" is orderable but missing from the Products list`);
    }
  }
}

/* ── hazard classification ─────────────────────────────────────────────────
   WHAT A UN NUMBER MEANS, spelled out.

   `hazmat` is stored as the string that goes on the placard — "Class 3 ·
   UN1202" — because that is the form a driver and a BOL both want. It is
   useless to everyone else: nobody reading a product list knows UN1202 from
   UN1203, and the two travel under different rules.

   SEVERITY IS THE DOT'S OWN SCALE, not one invented here. Within a hazard
   class the Packing Group grades the danger — I greatest, II medium, III
   minor — and a flammable GAS outranks any of them because it needs no heat
   at all to be in its dangerous state. Three levels, and this catalogue
   exercises all three: propane, petrol, diesel.
────────────────────────────────────────────────────────────────────────── */

export interface HazardClassification {
  /** `3`, `2.1` — the DOT hazard class as it is written. */
  classNumber: string;
  /** What the class means in words. */
  className: string;
  unNumber: string;
  /** The substance the UN number actually names. */
  substance: string;
  /** DOT packing group. Null for gases, which are not assigned one. */
  packingGroup: "I" | "II" | "III" | null;
  /** 3 is the most dangerous. Drives the icon's colour, nothing else. */
  severity: 1 | 2 | 3;
  /** One line on why it is graded there — the icon's tooltip. */
  note: string;
}

const UN_NUMBERS: Record<string, HazardClassification> = {
  UN1978: {
    classNumber: "2.1",
    className: "Flammable gas",
    unNumber: "UN1978",
    substance: "Propane",
    packingGroup: null,
    severity: 3,
    note: "Flammable gas — already a vapour, ignites with no heating at all.",
  },
  UN1203: {
    classNumber: "3",
    className: "Flammable liquid",
    unNumber: "UN1203",
    substance: "Gasoline",
    packingGroup: "II",
    severity: 2,
    note: "Packing Group II — flash point far below ambient, so its vapour is flammable at any working temperature.",
  },
  UN1202: {
    classNumber: "3",
    className: "Flammable liquid",
    unNumber: "UN1202",
    substance: "Diesel / gas oil",
    packingGroup: "III",
    severity: 1,
    note: "Packing Group III — combustible rather than readily ignitable; needs heating before it will light.",
  },
  UN1223: {
    classNumber: "3",
    className: "Flammable liquid",
    unNumber: "UN1223",
    substance: "Kerosene",
    packingGroup: "III",
    severity: 1,
    note: "Packing Group III — combustible rather than readily ignitable; needs heating before it will light.",
  },
};

/** The classification behind a product's placard string, or null if unregulated. */
export function classificationOf(p: BrokerProduct): HazardClassification | null {
  if (!p.hazmat) return null;
  const un = p.hazmat.match(/UN\d+/)?.[0];
  return (un && UN_NUMBERS[un]) || null;
}

/** How many accounts may buy it — the list column, computed not stored. */
export function customerReach(p: BrokerProduct): number {
  if (p.availableToAllCustomers) return BROKER_CUSTOMERS.length - p.blockedCustomerIds.length;
  return p.allowedCustomerIds.length;
}

/* ══════════════════════════════════════════════════════════ rental assets ═ */

export const RENTAL_STATUSES = ["On rent", "Available", "In maintenance", "Retired"] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];

export const RENTAL_TYPES = [
  "Bulk Tank", "Lube Skid", "DEF Tote", "Pump Cart", "Skid Tank",
  "Nozzle Assembly", "Dispensing Unit", "Trailer",
] as const;
export type RentalType = (typeof RENTAL_TYPES)[number];

/**
 * How the tank itself is BUILT — not what kind of asset it is.
 *
 * `assetType` says "Bulk Tank" or "DEF Tote": what the thing is for. Tank type
 * says whether it is single-walled, double-walled, fire-guarded, a cube, and
 * so on: what it is made of and therefore where it is allowed to stand and
 * what it may hold. Two different questions that were being answered by one
 * field, which is why the filter offered categories nobody files a tank under.
 *
 * An asset that holds no fuel — a pump cart, a nozzle assembly — has no tank
 * type, and says so.
 */
export const TANK_TYPES = [
  "Fire Guard",
  "Single Wall",
  "Double Wall",
  "Overhead",
  "Trans Cube",
  "Fuel Cube",
  "Standard",
  "Round",
] as const;
export type TankType = (typeof TANK_TYPES)[number];

export const OWNERSHIP_TYPES = ["owned", "leased", "customer_owned", "vendor_owned"] as const;
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];

export const MAINTENANCE_STATUSES = ["OK", "Service due", "Overdue", "Out of service"] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export interface RentalAsset {
  id: string;
  /** The name that appears on an order line, where it is on rent. */
  name: string;
  assetType: RentalType;
  /** How the tank is built. Null on anything that is not a tank. */
  tankType: TankType | null;
  serialNumber: string | null;
  qrCode: string | null;
  externalAssetId: string | null;
  ownershipType: OwnershipType;
  status: RecordStatus;

  /* ── placement ── */
  customerId: string | null;
  /** Denormalised for the table; `customerId` is the truth. */
  customer: string | null;
  shipToId: string | null;
  shipTo: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  installedDate: string | null;
  removalDate: string | null;

  /* ── rental ── */
  availabilityStatus: RentalStatus;
  rentalStartDate: string | null;
  rentalEndDate: string | null;
  contractId: string | null;
  billingFrequency: string;
  /** Dollars per billing period. What the rental is worth while it is out. */
  rentalRate: number;
  depositAmount: number | null;
  autoRenew: boolean;

  /* ── what it holds ── */
  associatedProductId: string | null;
  capacityGal: number;
  unit: string;
  fillThreshold: number | null;
  reorderPoint: number | null;
  topOffRelevant: boolean;

  /* ── service ── */
  assignedVendorId: string | null;
  lastServiceDate: string | null;
  nextServiceDue: string | null;
  maintenanceStatus: MaintenanceStatus;
  complianceStatus: "Valid" | "Expiring" | "Expired" | "Not required";

  /* ── record ── */
  assetPhoto: string | null;
  documents: Attachment[];
  inspectionFiles: Attachment[];
  installationRecords: Attachment[];
  tags: string[];
  notes: string | null;
  audit: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

interface AssetSeed {
  name: string;
  serial: string;
  type: RentalType;
  capacityGal: number;
  availability: RentalStatus;
  customer: string | null;
  shipTo: string | null;
  rate: number;
  since: string | null;
}

/* The five assets flagged `rental: true` in `SHIP_TO_SITES` are on rent HERE,
   at the same sites and to the same accounts — an asset cannot be out at a
   customer on one screen and sitting in the yard on another. */
const CORE_ASSETS: AssetSeed[] = [
  { name: "180 asset", serial: "FP-TK-0180", type: "Bulk Tank", capacityGal: 1000, availability: "On rent", customer: "Bray, Raymond and Marks", shipTo: "Bray North Yard", rate: 285, since: "2026-02-14" },
  { name: "Asset 1", serial: "FP-TK-0201", type: "Bulk Tank", capacityGal: 500, availability: "On rent", customer: "Bray, Raymond and Marks", shipTo: "Bray Depot 2", rate: 190, since: "2025-11-02" },
  { name: "Lube Skid", serial: "FP-LS-0044", type: "Lube Skid", capacityGal: 120, availability: "On rent", customer: "Morris Group", shipTo: "Morris Yard 4", rate: 240, since: "2026-06-30" },
  { name: "DEF Tote 2", serial: "FP-DT-0102", type: "DEF Tote", capacityGal: 330, availability: "On rent", customer: "Gonzalez, Palmer and Miller", shipTo: "GPM Southside", rate: 95, since: "2026-04-18" },
  { name: "Main Skid", serial: "FP-LS-0051", type: "Lube Skid", capacityGal: 120, availability: "On rent", customer: "Halvorsen Fuel Co.", shipTo: "Halvorsen Main", rate: 240, since: "2026-01-09" },
  { name: "Yard Tank 7", serial: "FP-TK-0207", type: "Bulk Tank", capacityGal: 1000, availability: "Available", customer: null, shipTo: null, rate: 285, since: null },
  { name: "Yard Tank 8", serial: "FP-TK-0208", type: "Bulk Tank", capacityGal: 2000, availability: "Available", customer: null, shipTo: null, rate: 410, since: null },
  { name: "DEF Tote 5", serial: "FP-DT-0105", type: "DEF Tote", capacityGal: 330, availability: "In maintenance", customer: null, shipTo: null, rate: 95, since: null },
  { name: "Pump Cart 3", serial: "FP-PC-0033", type: "Pump Cart", capacityGal: 0, availability: "Available", customer: null, shipTo: null, rate: 60, since: null },
  { name: "Lube Skid 9", serial: "FP-LS-0059", type: "Lube Skid", capacityGal: 120, availability: "In maintenance", customer: null, shipTo: null, rate: 240, since: null },
];

const TYPE_PREFIX: Record<RentalType, string> = {
  "Bulk Tank": "TK",
  "Lube Skid": "LS",
  "DEF Tote": "DT",
  "Pump Cart": "PC",
  "Skid Tank": "SK",
  "Nozzle Assembly": "NZ",
  "Dispensing Unit": "DU",
  Trailer: "TR",
};

/** Capacity by type. A nozzle holds nothing, and the screen must not print 0 gal. */
const TYPE_CAPACITY: Record<RentalType, number[]> = {
  "Bulk Tank": [500, 1000, 2000, 4000],
  "Lube Skid": [120, 240],
  "DEF Tote": [275, 330],
  "Pump Cart": [0],
  "Skid Tank": [500, 1000, 1500],
  "Nozzle Assembly": [0],
  "Dispensing Unit": [0],
  Trailer: [3000, 5000],
};

/**
 * Not every build fits every asset. An "Overhead" DEF tote and a "Trans Cube"
 * bulk tank are not things that exist, and seeding them would have put values
 * in the filter that no yard could ever match.
 */
const TYPE_TANK_TYPES: Record<RentalType, readonly TankType[]> = {
  "Bulk Tank": ["Fire Guard", "Single Wall", "Double Wall", "Overhead", "Standard", "Round"],
  "Lube Skid": ["Single Wall", "Double Wall", "Standard"],
  "DEF Tote": ["Trans Cube", "Fuel Cube", "Standard"],
  "Pump Cart": [],
  "Skid Tank": ["Fire Guard", "Single Wall", "Double Wall", "Standard", "Round"],
  "Nozzle Assembly": [],
  "Dispensing Unit": [],
  Trailer: ["Single Wall", "Double Wall", "Standard"],
};

function makeAsset(spec: AssetSeed & { seed: number; id: string }): RentalAsset {
  const r = rng(spec.seed);
  const onRent = spec.availability === "On rent";
  const cust = spec.customer ? BROKER_CUSTOMERS.find((c) => c.name === spec.customer) ?? null : null;
  const site = spec.shipTo
    ? SHIP_TO_LOCATIONS.find((s) => s.locationName === spec.shipTo && (!cust || s.customerId === cust.id)) ?? null
    : null;
  const place = pickFrom(r, PLACES);

  const nextService = dateOffset(intBetween(r, -90, 260));
  const dueInDays = Math.round(
    (new Date(`${nextService}T00:00:00Z`).getTime() - TODAY.getTime()) / 86_400_000
  );
  const maintenance: MaintenanceStatus =
    spec.availability === "In maintenance"
      ? "Out of service"
      : dueInDays < 0
        ? "Overdue"
        : dueInDays < 30
          ? "Service due"
          : "OK";

  const holdsFuel = spec.capacityGal > 0;

  return {
    id: spec.id,
    name: spec.name,
    assetType: spec.type,
    tankType: holdsFuel
      ? pickFrom(r, TYPE_TANK_TYPES[spec.type] as unknown as TankType[])
      : null,
    serialNumber: maybe(r, 0.95, spec.serial),
    qrCode: maybe(r, 0.55, `QR-${spec.serial.replace(/-/g, "")}`),
    externalAssetId: maybe(r, 0.4, `EXT-${intBetween(r, 10_000, 99_999)}`),
    ownershipType: pickFrom(r, OWNERSHIP_TYPES),
    status: spec.availability === "Retired" ? "archived" : "active",

    customerId: cust?.id ?? null,
    customer: spec.customer,
    shipToId: site?.id ?? null,
    shipTo: spec.shipTo,
    addressLine1: site?.addressLine1 ?? (onRent ? streetAddress(r) : null),
    addressLine2: site?.addressLine2 ?? null,
    city: site?.city ?? (onRent ? place.city : "Fresno"),
    state: site?.state ?? (onRent ? place.state : "CA"),
    zip: site?.zip ?? (onRent ? place.zip : "93725"),
    country: "USA",
    latitude: site?.latitude ?? null,
    longitude: site?.longitude ?? null,
    installedDate: spec.since,
    removalDate: null,

    availabilityStatus: spec.availability,
    rentalStartDate: spec.since,
    /* Rentals that END SOON are a filter on the list, so a third of the on-rent
       fleet is given an end date inside the next 45 days. */
    rentalEndDate: onRent ? (r() < 0.34 ? dateOffset(intBetween(r, 3, 45)) : maybe(r, 0.5, dateOffset(intBetween(r, 60, 400)))) : null,
    contractId: onRent ? maybe(r, 0.75, `RC-${intBetween(r, 1000, 9999)}`) : null,
    billingFrequency: pickFrom(r, ["Monthly", "Quarterly", "Annual"] as const),
    rentalRate: spec.rate,
    depositAmount: maybe(r, 0.45, intBetween(r, 1, 10) * 100),
    autoRenew: onRent && r() < 0.55,

    associatedProductId: holdsFuel ? pickFrom(r, BROKER_PRODUCTS.slice(0, 12)).id : null,
    capacityGal: spec.capacityGal,
    unit: "gal",
    fillThreshold: holdsFuel ? Math.round(spec.capacityGal * 0.25) : null,
    reorderPoint: holdsFuel ? Math.round(spec.capacityGal * 0.15) : null,
    topOffRelevant: holdsFuel && r() < 0.7,

    assignedVendorId: null,
    lastServiceDate: maybe(r, 0.8, dateOffset(-intBetween(r, 20, 400))),
    nextServiceDue: nextService,
    maintenanceStatus: maintenance,
    complianceStatus: pickFrom(r, ["Valid", "Valid", "Valid", "Expiring", "Expired", "Not required"] as const),

    assetPhoto: maybe(r, 0.3, `${spec.serial}.jpg`),
    documents: seedAttachments(r, ["Rental Agreement.pdf", "Tank Permit.pdf", "Delivery Receipt.pdf"], 2),
    inspectionFiles: seedAttachments(r, ["Annual Inspection.pdf", "Leak Test Certificate.pdf"], 2),
    installationRecords: seedAttachments(r, ["Installation Record.pdf", "Site Photo.png"], 2),
    tags: r() < 0.6 ? someOf(r, ASSET_TAGS, 2) : [],
    notes: maybe(r, 0.25, "Fill point faces the fence line; leave 12 ft clearance."),
    audit: [],
    createdAt: new Date(shiftDays(TODAY, -intBetween(r, 120, 1600)).setUTCHours(9)).toISOString(),
    updatedAt: new Date(shiftDays(TODAY, -intBetween(r, 0, 60)).setUTCHours(15)).toISOString(),
  };
}

function buildAssets(): RentalAsset[] {
  const out: RentalAsset[] = [];

  CORE_ASSETS.forEach((a, i) => {
    out.push(makeAsset({ ...a, seed: 7000 + i, id: `ra-${i + 1}` }));
  });

  const onRentCustomers = BROKER_CUSTOMERS.filter((c) => c.status === "active");

  let i = 0;
  while (out.length < 120) {
    const r = rng(8000 + i);
    const type = pickFrom(r, RENTAL_TYPES);
    const capacity = pickFrom(r, TYPE_CAPACITY[type]);
    const availability = pickFrom(r, [
      "On rent", "On rent", "On rent", "Available", "Available", "In maintenance", "Retired",
    ] as const);
    const onRent = availability === "On rent";
    const cust = onRent ? pickFrom(r, onRentCustomers) : null;
    const sites = cust ? SHIP_TO_LOCATIONS.filter((s) => s.customerId === cust.id) : [];
    const site = sites.length > 0 ? pickFrom(r, sites) : null;
    const serial = `FP-${TYPE_PREFIX[type]}-${String(1000 + i).padStart(4, "0")}`;

    out.push(
      makeAsset({
        seed: 8000 + i,
        id: `ra-${out.length + 1}`,
        name: `${type} ${intBetween(r, 10, 990)}`,
        serial,
        type,
        capacityGal: capacity,
        availability,
        customer: cust?.name ?? null,
        shipTo: site?.locationName ?? null,
        rate: capacity > 0 ? Math.round((60 + capacity * 0.16) / 5) * 5 : intBetween(r, 8, 22) * 5,
        since: onRent ? dateOffset(-intBetween(r, 20, 900)) : null,
      })
    );
    i += 1;
  }

  out.forEach((a, idx) => {
    const r = rng(9000 + idx);
    a.audit = seedAudit(r, {
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      noun: "Asset",
      fields: ["Availability", "Customer assignment", "Rental rate", "Next service due", "Maintenance status", "Ship-to"],
    });
  });

  return out;
}

export const RENTAL_ASSETS: RentalAsset[] = buildAssets();

/** Only an asset that is out earns anything — the list's one honest total. */
export function monthlyRevenue(rows: RentalAsset[]): number {
  return rows.reduce((n, a) => n + (a.availabilityStatus === "On rent" ? a.rentalRate : 0), 0);
}

/** Guards the split above: every asset a movement can carry is a real record. */
export function assertMovementAssetsExist(): void {
  const listed = new Set(RENTAL_ASSETS.map((a) => a.name));
  for (const name of MOVEMENT_ASSET_NAMES) {
    if (!listed.has(name)) {
      throw new Error(
        `Asset "${name}" can be moved but is missing from the Rental Assets list`
      );
    }
  }
}

/* ── conflict rules ────────────────────────────────────────────────────── */

/**
 * WHY THESE ARE FUNCTIONS AND NOT FLAGS.
 *
 * A conflict is a relationship between an asset, a date range and everything
 * else already booked against it — it is never a property of the asset alone.
 * Storing `hasConflict: true` would go stale the moment anything moved, so the
 * screen asks at the moment it needs to know.
 */
export interface AssignmentAttempt {
  assetId: string;
  customerId: string;
  from: string;
  to: string | null;
}

export function assetConflicts(attempt: AssignmentAttempt): string[] {
  const asset = RENTAL_ASSETS.find((a) => a.id === attempt.assetId);
  const out: string[] = [];
  if (!asset) return ["Asset not found"];

  const sameCustomer = asset.customerId === attempt.customerId;

  if (asset.availabilityStatus === "On rent" && !sameCustomer) {
    out.push(`Already on rent to ${asset.customer ?? "another account"} — double-booking is not allowed`);

    /* ONLY FOR A DIFFERENT ACCOUNT. Checked against the same customer this
       asset is already out to, every existing rental "overlaps itself" and
       the panel cries wolf on every record — which is how a warning stops
       being read. An overlap is only a conflict when two different bookings
       want the same weeks. */
    if (asset.rentalStartDate) {
      const endsAfterStart = !asset.rentalEndDate || attempt.from <= asset.rentalEndDate;
      const startsBeforeEnd = !attempt.to || attempt.to >= asset.rentalStartDate;
      if (endsAfterStart && startsBeforeEnd) {
        out.push(
          `Overlaps the current rental (${asset.rentalStartDate} – ${asset.rentalEndDate ?? "open ended"})`
        );
      }
    }
  }

  if (asset.availabilityStatus === "In maintenance" || asset.maintenanceStatus === "Out of service") {
    out.push("Asset is under maintenance and cannot be dispatched");
  }
  if (asset.status === "archived") {
    out.push("Asset is archived");
  }
  if (asset.complianceStatus === "Expired") {
    out.push("Compliance documentation has expired");
  }

  const customer = BROKER_CUSTOMERS.find((c) => c.id === attempt.customerId);
  if (!customer) out.push("Customer not found");
  else if (customer.status !== "active") {
    out.push(`${customer.name} is ${customer.status} and cannot take new assignments`);
  }

  return out;
}

/**
 * WHAT IS WRONG WITH THIS ASSET AS IT STANDS — a different question from
 * `assetConflicts`, which answers "may I book it".
 *
 * The record page asks THIS one, because the asset already has a customer and
 * simulating a booking against the account it is already out to reports the
 * asset's own rental as a clash with itself. What the page actually wants is
 * everything that would stop this asset being serviced or moved today.
 */
export function assetDispatchWarnings(a: RentalAsset): string[] {
  const out: string[] = [];

  if (a.maintenanceStatus === "Out of service") {
    out.push("Under maintenance — cannot be dispatched or moved");
  } else if (a.maintenanceStatus === "Overdue") {
    out.push(`Service overdue since ${a.nextServiceDue ?? "an unrecorded date"}`);
  }
  if (a.complianceStatus === "Expired") {
    out.push("Compliance documentation has expired");
  }
  if (a.status === "archived") {
    out.push("Archived — it is not offered on new orders");
  }
  /* ON RENT TO NOBODY is the state in which a tank goes missing: it is out
     there, and nobody is being billed for it. */
  if (a.availabilityStatus === "On rent" && !a.customerId) {
    out.push("On rent with no customer assigned — nobody is being billed for it");
  }
  if (a.availabilityStatus === "On rent" && !a.shipTo) {
    out.push("On rent with no ship-to recorded — its location is unknown");
  }
  const customer = a.customerId ? BROKER_CUSTOMERS.find((c) => c.id === a.customerId) : null;
  if (customer && customer.status !== "active") {
    out.push(`${customer.name} is ${customer.status} — this placement needs review`);
  }
  if (a.rentalEndDate && a.availabilityStatus === "On rent") {
    const left = Math.round(
      (new Date(`${a.rentalEndDate}T00:00:00Z`).getTime() - TODAY.getTime()) / 86_400_000
    );
    if (left < 0 && !a.autoRenew) {
      out.push(`Rental ended ${Math.abs(left)} days ago and has not been closed out`);
    }
  }
  return out;
}

/** Rentals inside the next `days` — the "ending soon" filter and its badge. */
export function endingSoon(a: RentalAsset, days = 30): boolean {
  if (!a.rentalEndDate) return false;
  const left = Math.round(
    (new Date(`${a.rentalEndDate}T00:00:00Z`).getTime() - TODAY.getTime()) / 86_400_000
  );
  return left >= 0 && left <= days;
}
