import { dateOffset, type AuditEvent, type RecordStatus } from "../threepl/directoryCore";
import type { BrokerCustomer } from "../threepl/directory";
import { MD_ASSETS, gal, type MdAsset } from "./assets";

/*
  MASTER DATA · CUSTOMERS (Pavan, 2026-11-03 — "from the Lovable, let's
  start building all the master data one by one … customers").

  The record is the 3PL Directory's customer (`BrokerCustomer`) — same data,
  same form (`customerFormSections`) — with what Customer 360 adds: how the
  balance ages, how fast they pay, when credit was last reviewed.

  Everything ELSE a customer has is derived, one source each:
    · ship-to sites — this file;
    · orders across modules — deliveries into its tanks (from the assets),
      bulk deliveries to its sites (this file), service orders (from the
      assets);
    · assets on site and leases — from the assets;
    · recurring schedules — this file.

  THE REFERENCE'S MISMATCHES ARE FIXED, not copied: Meridian Oil carried
  Agriland's figures; the list's ship-to counts did not match the sites
  listed; Agriland showed "No leases on file" with TK-2201 on lease; a
  service job was listed as a product; 31–60 days was not counted overdue on
  Net 15; regions disagreed with the assets' addresses.
*/

export interface MdAging {
  /** Not yet due. */
  current: number;
  /** Past due by 1–30, 31–60 and more than 60 days. */
  late30: number;
  late60: number;
  late60plus: number;
}

export interface MdCustomer extends BrokerCustomer {
  uid: string;
  aging: MdAging;
  avgDaysToPay: number;
  lastCreditReview: string;
}

/** A ship-to — the Directory's `ShipToLocation` fields, with the customer
 *  by name (as the assets point at it), its site contact and its history. */
export interface MdShipTo {
  uid: string;
  /** ST-1001 — the code dispatch and the reference use. */
  id: string;
  customer: string;
  locationName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  /** The customer's default delivery site. One per customer. */
  isDefault: boolean;
  status: RecordStatus;
  contact: string | null;
  phone: string | null;
  notes: string | null;
  audit: AuditEvent[];
}

export type MdOrderType = "Delivery" | "Service";
export type MdModule = "3PL" | "First party" | "Service Work";
export type MdOrderStage = "Open" | "Assigned" | "Delivered" | "Completed" | "Invoiced";

export interface MdCustomerOrder {
  id: string;
  customer: string;
  type: MdOrderType;
  module: MdModule;
  date: string;
  site: string;
  /** The product delivered, or the service job. */
  item: string;
  /** Gallons, or units of a packaged product; null for a service. */
  qty: number | null;
  unit: "gal" | "drums" | null;
  /** A service order is about one asset. */
  asset: string | null;
  unitPrice: number | null;
  revenue: number | null;
  margin: number | null;
  stage: MdOrderStage;
  documents: { name: string; kind: string }[];
}

export interface MdRecurring {
  id: string;
  customer: string;
  site: string;
  product: string;
  qtyGal: number;
  cadence: string;
  next: string;
  status: "Active" | "Paused";
}

export interface MdCustomerLease {
  id: string;
  asset: string;
  product: string;
  from: string | null;
  to: string | null;
  committedGal: number | null;
  status: MdAsset["leases"][number]["status"];
}

/* ─────────────────────────────────────────────────────────── seed ── */

const created = (days: number): AuditEvent => ({
  id: `au-cc${days}`,
  at: `${dateOffset(days)}T08:00:00Z`,
  by: "Dana Whitfield",
  action: "Created",
  changes: [],
});

interface Seed {
  id: string;
  name: string;
  erpId: string;
  contact: [string, string, string, string];
  address: [string, string, string, string];
  creditStatus: BrokerCustomer["creditStatus"];
  creditLimit: number | null;
  terms: string;
  aging: MdAging;
  avgDaysToPay: number;
  reviewedDays: number;
  createdDays: number;
  instruction?: string;
  portal?: boolean;
}

const SEEDS: Seed[] = [
  {
    id: "cu-meridian",
    name: "Meridian Oil",
    erpId: "C-10031",
    contact: ["Rhea Collins", "Fuel Buyer", "(515) 555-0147", "rhea.collins@meridianoil.com"],
    address: ["2200 E Euclid Ave", "Des Moines", "IA", "50317"],
    creditStatus: "Approved",
    creditLimit: 200_000,
    terms: "Net 15",
    aging: { current: 47_600, late30: 6_600, late60: 0, late60plus: 0 },
    avgDaysToPay: 14,
    reviewedDays: -64,
    createdDays: -980,
    portal: true,
  },
  {
    id: "cu-agriland",
    name: "Agriland FS",
    erpId: "C-10044",
    contact: ["Dana Fields", "Operations Manager", "(515) 555-0182", "dana.fields@agrilandfs.com"],
    address: ["1420 N 10th St", "Winterset", "IA", "50273"],
    creditStatus: "Approved",
    creditLimit: 250_000,
    terms: "Net 15",
    aging: { current: 55_200, late30: 9_000, late60: 4_200, late60plus: 0 },
    avgDaysToPay: 17,
    reviewedDays: -51,
    createdDays: -1300,
    instruction: "Call the yard 30 minutes out; gate code at the office.",
    portal: true,
  },
  {
    id: "cu-sp",
    name: "SP Energy",
    erpId: "C-10057",
    contact: ["Marco Ruiz", "Site Manager", "(214) 555-0119", "marco.ruiz@spenergy.com"],
    address: ["4120 Commerce St", "Dallas", "TX", "75226"],
    creditStatus: "Approved",
    creditLimit: 120_000,
    terms: "Net 30",
    aging: { current: 31_900, late30: 0, late60: 0, late60plus: 0 },
    avgDaysToPay: 26,
    reviewedDays: -88,
    createdDays: -720,
  },
  {
    id: "cu-samira",
    name: "Samira Test",
    erpId: "C-10063",
    contact: ["Samira Khan", "Owner", "(718) 555-0164", "samira@samiratest.com"],
    address: ["88-14 Sutphin Blvd", "Jamaica", "NY", "11435"],
    creditStatus: "Unapproved",
    creditLimit: null,
    terms: "Prepaid",
    aging: { current: 0, late30: 0, late60: 0, late60plus: 0 },
    avgDaysToPay: 0,
    reviewedDays: -30,
    createdDays: -140,
  },
  {
    id: "cu-custtest",
    name: "Customer Test",
    erpId: "C-10071",
    contact: ["Ana Bell", "Accounts Payable", "(714) 555-0133", "ana.bell@customertest.com"],
    address: ["12872 Main St", "Garden Grove", "CA", "92840"],
    creditStatus: "On hold",
    creditLimit: 150_000,
    terms: "Net 30",
    aging: { current: 96_400, late30: 41_200, late60: 22_800, late60plus: 12_400 },
    avgDaysToPay: 44,
    reviewedDays: -12,
    createdDays: -610,
  },
  {
    id: "cu-hartest",
    name: "Hartest123",
    erpId: "C-10078",
    contact: ["Ken Hart", "Owner", "(860) 555-0108", "ken@hartest123.com"],
    address: ["77 Mill Rd", "Hartford", "CT", "06106"],
    creditStatus: "On hold",
    creditLimit: 10_000,
    terms: "Net 15",
    aging: { current: 2_900, late30: 2_400, late60: 1_500, late60plus: 0 },
    avgDaysToPay: 21,
    reviewedDays: -20,
    createdDays: -560,
  },
  {
    id: "cu-blueridge",
    name: "Blue Ridge Fleet",
    erpId: "C-10082",
    contact: ["Toni Vega", "Fleet Manager", "(828) 555-0151", "toni.vega@blueridgefleet.com"],
    address: ["9 Riverside Dr", "Asheville", "NC", "28801"],
    creditStatus: "Approved",
    creditLimit: 90_000,
    terms: "Net 30",
    aging: { current: 38_100, late30: 4_500, late60: 0, late60plus: 0 },
    avgDaysToPay: 24,
    reviewedDays: -102,
    createdDays: -830,
    portal: true,
  },
];

const balanceOf = (g: MdAging) => g.current + g.late30 + g.late60 + g.late60plus;

export const MD_CUSTOMER_RECORDS: MdCustomer[] = SEEDS.map((s) => {
  const [mainContactName, mainContactRole, phone, email] = s.contact;
  const [addressLine1, city, state, zip] = s.address;
  const domain = email.split("@")[1];
  return {
    uid: s.id,
    id: s.id,
    name: s.name,
    erpId: s.erpId,
    status: "active",
    phone,
    secondaryPhone: null,
    email,
    billingEmail: `ap@${domain}`,
    dispatchEmail: `dispatch@${domain}`,
    mainContactName,
    mainContactRole,
    addressLine1,
    addressLine2: null,
    city,
    state,
    zip,
    country: "USA",
    creditStatus: s.creditStatus,
    creditLimit: s.creditLimit,
    currentBalance: balanceOf(s.aging),
    paymentTerms: s.terms,
    taxId: null,
    taxExempt: false,
    currency: "USD",
    accountingCustomerId: s.erpId.replace("C-", "AC-"),
    customerInstruction: s.instruction ?? null,
    deliveryNotes: null,
    defaultShipToId: null,
    preferredVendorId: null,
    portalAccessEnabled: s.portal ?? false,
    tags: [],
    notes: null,
    attachments: [],
    contacts: [],
    audit: [created(s.createdDays)],
    createdAt: `${dateOffset(s.createdDays)}T08:00:00Z`,
    updatedAt: `${dateOffset(s.reviewedDays)}T08:00:00Z`,
    aging: s.aging,
    avgDaysToPay: s.avgDaysToPay,
    lastCreditReview: dateOffset(s.reviewedDays),
  };
});

/** Names, for the pickers that point at a customer (the asset form). */
export const MD_CUSTOMER_NAMES = MD_CUSTOMER_RECORDS.map((c) => c.name);

/* ──────────────────────────────────────────────────────── ship-tos ── */

/* The customer's ship-to codes run in blocks of a thousand, as the reference's. */
const BLOCK: Record<string, number> = { "Agriland FS": 1000, "SP Energy": 2000, "Samira Test": 3000, "Customer Test": 4000, "Hartest123": 5000, "Blue Ridge Fleet": 6000, "Meridian Oil": 7000 };
const seen: Record<string, number> = {};

function site(
  customer: string,
  locationName: string,
  addressLine1: string,
  city: string,
  state: string,
  zip: string,
  latitude: number,
  longitude: number,
  contact: string,
  phone: string,
  status: RecordStatus = "active",
): MdShipTo {
  const n = (seen[customer] = (seen[customer] ?? 0) + 1);
  const id = `ST-${BLOCK[customer] + n}`;
  return {
    uid: `st-${id}`,
    id,
    customer,
    locationName,
    addressLine1,
    addressLine2: null,
    city,
    state,
    zip,
    country: "USA",
    latitude,
    longitude,
    /* THE FIRST SITE IS THE DEFAULT — one per customer. */
    isDefault: n === 1,
    status,
    contact,
    phone,
    notes: null,
    audit: [{ id: `au-${id}`, at: `${dateOffset(-400 + n * 20)}T08:00:00Z`, by: "Dana Whitfield", action: "Created", changes: [] }],
  };
}

/* An asset's site is a ship-to of its customer, at the asset's address. */
export const MD_SHIP_TOS: MdShipTo[] = [
  site("Meridian Oil", "Des Moines Terminal", "2200 E Euclid Ave", "Des Moines", "IA", "50317", 41.6278, -93.5738, "Rhea Collins", "(515) 555-0147"),
  site("Meridian Oil", "Ankeny Yard", "1510 SW Ordnance Rd", "Ankeny", "IA", "50023", 41.7082, -93.6186, "Jon Pike", "(515) 555-0163"),
  site("Meridian Oil", "Altoona Depot", "300 8th St SW", "Altoona", "IA", "50009", 41.6383, -93.4715, "Jon Pike", "(515) 555-0163"),
  site("Agriland FS", "Winterset Depot", "1420 N 10th St", "Winterset", "IA", "50273", 41.3478, -94.0136, "Dana Fields", "(515) 555-0182"),
  site("Agriland FS", "Adel Yard", "210 Nile Kinnick Dr", "Adel", "IA", "50003", 41.6147, -94.0174, "Luke Jensen", "(515) 555-0126"),
  site("Agriland FS", "Event Depot", "55 Fairground Rd", "Winterset", "IA", "50273", 41.3301, -94.0262, "Dana Fields", "(515) 555-0182"),
  site("SP Energy", "sp ship to 1", "4120 Commerce St", "Dallas", "TX", "75226", 32.7831, -96.7745, "Marco Ruiz", "(214) 555-0119"),
  site("SP Energy", "sp ship to 2", "2711 Irving Blvd", "Dallas", "TX", "75207", 32.8013, -96.8429, "Marco Ruiz", "(214) 555-0119"),
  site("SP Energy", "Grand Prairie Yard", "1802 W Pioneer Pkwy", "Grand Prairie", "TX", "75051", 32.7086, -97.0258, "Lena Ortiz", "(972) 555-0140"),
  site("Samira Test", "Terminal 4 Departures", "JFK Terminal 4", "Jamaica", "NY", "11430", 40.6441, -73.7822, "Samira Khan", "(718) 555-0164"),
  site("Samira Test", "JFK Cargo Yard", "North Boundary Rd", "Jamaica", "NY", "11430", 40.6604, -73.79, "Neville Rodriguez", "(718) 555-0191"),
  site("Customer Test", "Bear Mountain", "88 Ridge Rd", "Bear Mountain", "NY", "10911", 41.3112, -74.0068, "Ana Bell", "(714) 555-0133"),
  site("Customer Test", "Bear Mountain north pad", "90 Ridge Rd", "Bear Mountain", "NY", "10911", 41.3149, -74.0071, "Ana Bell", "(714) 555-0133"),
  site("Customer Test", "Garden Grove Yard", "12872 Main St", "Garden Grove", "CA", "92840", 33.7743, -117.937, "Victor Lam", "(714) 555-0175"),
  site("Customer Test", "Anaheim Depot", "1600 S Lewis St", "Anaheim", "CA", "92805", 33.8124, -117.8971, "Victor Lam", "(714) 555-0175"),
  site("Hartest123", "hartest2", "77 Mill Rd", "Hartford", "CT", "06106", 41.7509, -72.6953, "Ken Hart", "(860) 555-0108"),
  site("Blue Ridge Fleet", "Asheville Terminal", "9 Riverside Dr", "Asheville", "NC", "28801", 35.5951, -82.5671, "Toni Vega", "(828) 555-0151"),
  site("Blue Ridge Fleet", "Hendersonville Yard", "410 Duncan Hill Rd", "Hendersonville", "NC", "28792", 35.328, -82.4574, "Cal Reese", "(828) 555-0177"),
  site("Blue Ridge Fleet", "Black Mountain Depot", "120 Montreat Rd", "Black Mountain", "NC", "28711", 35.6237, -82.3196, "Cal Reese", "(828) 555-0177"),
  site("Blue Ridge Fleet", "Weaverville Lot", "25 N Main St", "Weaverville", "NC", "28787", 35.6973, -82.5607, "Toni Vega", "(828) 555-0151", "inactive"),
];

/** One line — "1420 N 10th St, Winterset, IA 50273". */
export const siteAddress = (s: MdShipTo) => [s.addressLine1, s.addressLine2, s.city, `${s.state} ${s.zip}`].filter(Boolean).join(", ");

/* THE SHIP-TOS AS THEY ARE NOW — the list edits them; Customer 360 and the
   pickers read them from here. */
let shipToStore: MdShipTo[] = MD_SHIP_TOS;
export const currentShipTos = () => shipToStore;
export const keepShipTos = (next: MdShipTo[]) => {
  shipToStore = next;
};

/** Where an asset can be — every ship-to, and our own hubs. */
export const MD_PLACES = [...MD_SHIP_TOS.map((s) => s.locationName), "Irving Hub", "Fort Worth Yard"];

/* ────────────────────────────────────────────────────────── orders ── */

const PRICE: Record<string, number> = { "Dyed Diesel": 3.4, "Clear Diesel": 3.98, "Unleaded 87": 3.61, DEF: 2.15, "Propane HD-5": 2.48, "Hydraulic Oil AW-46": 428 };
const MARGIN = 0.138;
const SERVICE_MARGIN = 0.34;
const cents = (n: number) => Math.round(n * 100) / 100;

/** A small, fixed stream of numbers — the same orders on every load. */
function stream(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

interface Plan {
  customer: string;
  /** Bulk deliveries to these sites (not the ones an asset sits on). */
  sites: string[];
  product: string;
  every: number;
  gal: [number, number];
  module: MdModule;
  /** A packaged product now and then. */
  lube?: boolean;
  propane?: boolean;
}

const PLANS: Plan[] = [
  { customer: "Meridian Oil", sites: ["Des Moines Terminal", "Ankeny Yard", "Altoona Depot"], product: "Clear Diesel", every: 6, gal: [3_200, 7_400], module: "3PL", lube: true },
  { customer: "Agriland FS", sites: ["Winterset Depot", "Event Depot"], product: "Dyed Diesel", every: 4, gal: [3_600, 8_100], module: "3PL", lube: true, propane: true },
  { customer: "SP Energy", sites: ["sp ship to 2", "Grand Prairie Yard"], product: "Clear Diesel", every: 8, gal: [2_400, 5_200], module: "First party" },
  { customer: "Samira Test", sites: ["Terminal 4 Departures", "JFK Cargo Yard"], product: "Unleaded 87", every: 21, gal: [900, 1_600], module: "First party" },
  { customer: "Customer Test", sites: ["Garden Grove Yard", "Anaheim Depot"], product: "Clear Diesel", every: 5, gal: [4_000, 8_800], module: "3PL", lube: true },
  { customer: "Hartest123", sites: ["hartest2"], product: "Dyed Diesel", every: 24, gal: [700, 1_400], module: "First party" },
  { customer: "Blue Ridge Fleet", sites: ["Asheville Terminal", "Hendersonville Yard", "Black Mountain Depot"], product: "Clear Diesel", every: 9, gal: [2_200, 4_900], module: "3PL" },
];

const docsFor = (id: string, stage: MdOrderStage, type: MdOrderType): MdCustomerOrder["documents"] =>
  type === "Service"
    ? []
    : stage === "Delivered" || stage === "Invoiced"
      ? [
          { name: `${id} proof of delivery.pdf`, kind: "Proof of delivery" },
          { name: `${id} bill of lading.pdf`, kind: "Bill of lading" },
        ]
      : [];

/** `rate` — this order's margin, around the blended rate (rack prices move). */
function delivery(o: Omit<MdCustomerOrder, "type" | "unitPrice" | "revenue" | "margin" | "documents" | "asset">, rate: number): MdCustomerOrder {
  const unitPrice = PRICE[o.item] ?? 3.4;
  const revenue = cents((o.qty ?? 0) * unitPrice);
  return { ...o, type: "Delivery", asset: null, unitPrice, revenue, margin: cents(revenue * rate), documents: docsFor(o.id, o.stage, "Delivery") };
}

function planOrders(p: Plan, idx: number): MdCustomerOrder[] {
  const rnd = stream(idx * 7919 + 17);
  const out: MdCustomerOrder[] = [];
  let n = 0;
  for (let d = -170; d <= 10; d += p.every) {
    const s = p.sites[n % p.sites.length];
    const day = d + Math.floor(rnd() * 2);
    const stage: MdOrderStage = day > 0 ? "Assigned" : day > -14 ? "Delivered" : "Invoiced";
    const id = String(2_026_500 + idx * 120 + n);
    const lube = p.lube && n % 5 === 4;
    const propane = p.propane && n % 9 === 7;
    out.push(
      delivery({
        id,
        customer: p.customer,
        module: p.module,
        date: dateOffset(day),
        site: s,
        item: lube ? "Hydraulic Oil AW-46" : propane ? "Propane HD-5" : p.product,
        qty: lube ? 4 + Math.floor(rnd() * 8) : Math.round((p.gal[0] + rnd() * (p.gal[1] - p.gal[0])) / 10) * 10,
        unit: lube ? "drums" : "gal",
        stage,
      }, MARGIN - 0.03 + rnd() * 0.06),
    );
    n += 1;
  }
  return out;
}

/** Fills into the customer's tanks — the asset's deliveries, as orders. */
function tankOrders(a: MdAsset): MdCustomerOrder[] {
  if (!a.customer) return [];
  return a.deliveries.map((d) => {
    const stage: MdOrderStage = d.date > dateOffset(-14) ? "Delivered" : "Invoiced";
    return {
      id: d.id,
      customer: a.customer!,
      type: "Delivery",
      module: "3PL",
      date: d.date,
      site: a.site,
      item: d.product,
      qty: d.gal,
      unit: "gal",
      asset: a.id,
      unitPrice: cents(d.amount / d.gal),
      revenue: d.amount,
      margin: cents(d.amount * MARGIN),
      stage,
      documents: d.pod === "Attached" ? docsFor(d.id, stage, "Delivery").slice(0, 1) : [],
    };
  });
}

function serviceOrders(a: MdAsset): MdCustomerOrder[] {
  if (!a.customer) return [];
  return a.serviceOrders.map((o) => ({
    id: o.id,
    customer: a.customer!,
    type: "Service",
    module: "Service Work",
    date: o.scheduled.slice(0, 10),
    site: a.site,
    item: o.job,
    qty: null,
    unit: null,
    asset: a.id,
    unitPrice: null,
    revenue: o.amount,
    margin: o.amount === null ? null : cents(o.amount * SERVICE_MARGIN),
    stage: o.stage,
    documents: o.documents === "Attached" ? [{ name: `${o.id} completion report.pdf`, kind: "Completion report" }] : [],
  }));
}

/** Every order of a customer, across modules, newest first. */
export function ordersOf(c: MdCustomer, assets: MdAsset[] = MD_ASSETS): MdCustomerOrder[] {
  const idx = PLANS.findIndex((p) => p.customer === c.name);
  const mine = assets.filter((a) => a.customer === c.name);
  return [...(idx >= 0 ? planOrders(PLANS[idx], idx) : []), ...mine.flatMap(tankOrders), ...mine.flatMap(serviceOrders)].sort((x, y) =>
    y.date.localeCompare(x.date),
  );
}

const OPEN: MdOrderStage[] = ["Open", "Assigned"];
export const isOpen = (o: MdCustomerOrder) => OPEN.includes(o.stage);

/* ─────────────────────────────────────────── the other related lists ── */

export const shipTosOf = (c: MdCustomer) => currentShipTos().filter((s) => s.customer === c.name && s.status !== "archived");
export const assetsOf = (c: MdCustomer, assets: MdAsset[] = MD_ASSETS) => assets.filter((a) => a.customer === c.name);

export function leasesOf(c: MdCustomer, assets: MdAsset[] = MD_ASSETS): MdCustomerLease[] {
  return assetsOf(c, assets)
    .flatMap((a) => a.leases.map((l) => ({ id: l.id, asset: a.id, product: a.product ?? a.type, from: l.from, to: l.to, committedGal: l.committedGal, status: l.status })))
    .sort((x, y) => (y.from ?? "").localeCompare(x.from ?? ""));
}

export const MD_RECURRING: MdRecurring[] = [
  { id: "RC-1032", customer: "Meridian Oil", site: "Des Moines Terminal", product: "Clear Diesel", qtyGal: 6_500, cadence: "Weekly on Monday", next: dateOffset(4), status: "Active" },
  { id: "RC-1041", customer: "Agriland FS", site: "Winterset Depot", product: "Dyed Diesel", qtyGal: 7_800, cadence: "Weekly on Thursday", next: dateOffset(3), status: "Active" },
  { id: "RC-1044", customer: "Agriland FS", site: "Event Depot", product: "Dyed Diesel", qtyGal: 4_200, cadence: "Every 2 weeks on Tuesday", next: dateOffset(9), status: "Paused" },
  { id: "RC-1050", customer: "SP Energy", site: "sp ship to 2", product: "Clear Diesel", qtyGal: 3_800, cadence: "Every 2 weeks on Friday", next: dateOffset(6), status: "Active" },
  { id: "RC-1063", customer: "Customer Test", site: "Garden Grove Yard", product: "Clear Diesel", qtyGal: 8_000, cadence: "Weekly on Wednesday", next: dateOffset(2), status: "Paused" },
  { id: "RC-1066", customer: "Customer Test", site: "Anaheim Depot", product: "Clear Diesel", qtyGal: 5_600, cadence: "Weekly on Friday", next: dateOffset(4), status: "Active" },
  { id: "RC-1072", customer: "Blue Ridge Fleet", site: "Asheville Terminal", product: "Clear Diesel", qtyGal: 3_400, cadence: "Monthly on the 1st", next: dateOffset(25), status: "Active" },
];
export const recurringOf = (c: MdCustomer) => MD_RECURRING.filter((r) => r.customer === c.name);

/* ───────────────────────────────────────────────────────── figures ── */

export interface ProductLine {
  product: string;
  orders: number;
  qty: number;
  unit: "gal" | "drums";
  revenue: number;
  last: string;
}

/** What it has been delivered — done deliveries only (a service job is not
 *  a product, and an assigned order has not been delivered yet). */
export function productsOf(orders: MdCustomerOrder[]): ProductLine[] {
  const by = new Map<string, ProductLine>();
  for (const o of orders) {
    if (o.type !== "Delivery" || o.qty === null || o.unit === null || isOpen(o)) continue;
    const cur = by.get(o.item) ?? { product: o.item, orders: 0, qty: 0, unit: o.unit, revenue: 0, last: o.date };
    cur.orders += 1;
    cur.qty += o.qty;
    cur.revenue = cents(cur.revenue + (o.revenue ?? 0));
    if (o.date > cur.last) cur.last = o.date;
    by.set(o.item, cur);
  }
  return [...by.values()].sort((x, y) => y.revenue - x.revenue);
}

const past = (o: MdCustomerOrder) => !isOpen(o);

export function figuresOf(c: MdCustomer, orders: MdCustomerOrder[]) {
  const done = orders.filter(past);
  const revenue = done.reduce((s, o) => s + (o.revenue ?? 0), 0);
  const margin = done.reduce((s, o) => s + (o.margin ?? 0), 0);
  const galOrders = done.filter((o) => o.unit === "gal");
  const open = orders.filter(isOpen).sort((x, y) => x.date.localeCompare(y.date));
  const year = dateOffset(0).slice(0, 4);
  return {
    revenue,
    orders: done.length,
    margin,
    marginPct: revenue ? (margin / revenue) * 100 : 0,
    gallons: galOrders.reduce((s, o) => s + (o.qty ?? 0), 0),
    deliveries: galOrders.length,
    open: open.length,
    nextOpen: open[0]?.date ?? null,
    ytd: done.filter((o) => o.date.startsWith(year)).reduce((s, o) => s + (o.revenue ?? 0), 0),
    available: c.creditLimit === null ? null : c.creditLimit - c.currentBalance,
    overdue: c.aging.late30 + c.aging.late60 + c.aging.late60plus,
  };
}

/** The last six months, oldest first — gallons and margin. */
export function monthsOf(orders: MdCustomerOrder[]) {
  const today = dateOffset(0);
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
    const key = d.toISOString().slice(0, 7);
    const these = orders.filter((o) => o.date.startsWith(key) && past(o));
    const revenue = these.reduce((s, o) => s + (o.revenue ?? 0), 0);
    const margin = these.reduce((s, o) => s + (o.margin ?? 0), 0);
    return {
      key,
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      gallons: these.filter((o) => o.unit === "gal").reduce((s, o) => s + (o.qty ?? 0), 0),
      orders: these.length,
      marginPct: revenue ? (margin / revenue) * 100 : 0,
      margin,
    };
  });
}

/** What credit says about the account, in a few words. */
export function riskOf(c: MdCustomer): string {
  if (c.creditLimit !== null && c.currentBalance > c.creditLimit) return "Over its credit limit";
  if (c.aging.late60plus > 0) return "Balance over 60 days past due";
  if (c.creditStatus === "On hold") return "On hold — orders need approval";
  if (c.creditStatus === "Unapproved") return c.paymentTerms === "Prepaid" ? "Pays before delivery" : "No credit approved";
  return "Within approved policy";
}

export const regionOf = (c: BrokerCustomer) => [c.city, c.state].filter(Boolean).join(", ");
export { gal };

/* ──────────────────────────────────────────────────────── ship-to 360 ── */

export interface MdSiteInvoice {
  id: string;
  order: string;
  item: string;
  issued: string;
  due: string;
  total: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

const TERM_DAYS: Record<string, number> = { "Net 15": 15, "Net 30": 30, "Net 45": 45, "Due on receipt": 0, Prepaid: 0 };
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** The orders delivered or serviced at one ship-to. */
export const ordersAt = (s: MdShipTo, c: MdCustomer | undefined, assets: MdAsset[] = MD_ASSETS) =>
  c ? ordersOf(c, assets).filter((o) => o.site === s.locationName) : [];

/** What has been billed for one ship-to — an invoice per invoiced delivery
 *  (due on the customer's terms) and the service invoices of its assets. */
export function invoicesAt(s: MdShipTo, c: MdCustomer | undefined, orders: MdCustomerOrder[], assets: MdAsset[] = MD_ASSETS): MdSiteInvoice[] {
  const today = dateOffset(0);
  const late = c ? c.aging.late30 + c.aging.late60 + c.aging.late60plus > 0 : false;
  const days = TERM_DAYS[c?.paymentTerms ?? "Net 30"] ?? 30;
  const delivered: MdSiteInvoice[] = orders
    .filter((o) => o.type === "Delivery" && o.stage === "Invoiced")
    .map((o) => {
      const issued = addDays(o.date, 1);
      const due = addDays(issued, days);
      /* PAST DUE ONLY WHERE THE CUSTOMER'S AGING SAYS SO — the two agree. */
      const status = due >= today ? "Sent" : late && due > dateOffset(-60) ? "Overdue" : "Paid";
      return { id: `INV-${o.id.replace(/\D/g, "").slice(-5)}`, order: o.id, item: o.item, issued, due, total: o.revenue ?? 0, status };
    });
  const service = assets
    .filter((a) => a.site === s.locationName)
    .flatMap((a) =>
      a.invoices.map((i) => ({
        id: i.id,
        order: i.serviceOrder,
        item: a.serviceOrders.find((o) => o.id === i.serviceOrder)?.job ?? "Service",
        issued: i.issued,
        due: i.due,
        total: i.total,
        status: i.status,
      })),
    );
  return [...delivered, ...service].sort((x, y) => y.issued.localeCompare(x.issued));
}
