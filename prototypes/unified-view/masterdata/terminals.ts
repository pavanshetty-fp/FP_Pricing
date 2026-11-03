import { dateOffset, type AuditEvent, type RecordStatus } from "../threepl/directoryCore";
import { LOADING_ACCOUNTS, suppliersOf, terminalsOf, type LoadingAccount } from "../threepl/orders";

/*
  MASTER DATA · TERMINALS AND SUPPLIERS (Pavan, 2026-11-03 — from the
  Lovable reference's two pages).

  ONE TABLE TIES THEM: the loading account. An account belongs to a terminal
  and a supplier and carries the products that can be drawn on it — the 3PL
  load order's rule (orders.ts). So a terminal's suppliers, a supplier's
  terminals, both counts, a supplier's market and its lines of service, and
  where a product is stocked are all READ from the accounts, never typed —
  the reference let them disagree (terminals listed four suppliers each
  while the suppliers named nine terminals between them).

  The accounts are the 3PL load orders' (same names on both sides) plus the
  reference's Houston and other markets'. Terminals and suppliers are the
  reference's, plus the ones the 3PL accounts already load from.
*/

export interface MdTerminal {
  uid: string;
  name: string;
  market: string;
  erpId: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  /** The geofence a truck must be inside to count as at the rack, in metres. */
  radiusM: number;
  status: RecordStatus;
  notes: string | null;
  audit: AuditEvent[];
}

export const SUPPLIER_TYPES = ["Major oil", "Distributor", "Trader", "Retail partner"] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export interface MdSupplier {
  uid: string;
  name: string;
  type: SupplierType;
  erpId: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: RecordStatus;
  notes: string | null;
  audit: AuditEvent[];
}

const created = (key: string, days: number): AuditEvent[] => [
  { id: `au-${key}`, at: `${dateOffset(days)}T08:00:00Z`, by: "Dana Whitfield", action: "Created", changes: [] },
];

const T = (
  name: string,
  market: string,
  erpId: string,
  addressLine1: string,
  city: string,
  state: string,
  zip: string,
  latitude: number,
  longitude: number,
  radiusM = 200,
): MdTerminal => ({
  uid: `tm-${erpId}`,
  name,
  market,
  erpId,
  addressLine1,
  city,
  state,
  zip,
  latitude,
  longitude,
  radiusM,
  status: "active",
  notes: null,
  audit: created(erpId, -500),
});

export const MD_TERMINALS: MdTerminal[] = [
  T("BWC Terminal - Houston", "Houston", "T-001", "5445 West Loop South", "Houston", "TX", "77081", 29.7266, -95.4565, 1000),
  T("US Oil Terminal - Houston", "Houston", "T-002", "8400 Westheimer Rd", "Houston", "TX", "77063", 29.7371, -95.5154, 1000),
  T("Magellan Pipeline - Houston", "Houston", "T-003", "6800 W Sam Houston Pkwy S", "Houston", "TX", "77072", 29.6879, -95.5585, 1000),
  T("Exxon Terminal - Houston", "Houston", "T-004", "10707 North Fwy", "Houston", "TX", "77037", 29.9085, -95.4122, 1000),
  T("Enterprise Echo Terminal - Houston", "Houston", "T-005", "999 North Loop West", "Houston", "TX", "77008", 29.8104, -95.4165, 1000),
  T("Houston Ship Channel Terminal - Houston", "Houston", "TRM_010", "2000 Clinton Dr", "Galena Park", "TX", "77547", 29.7346, -95.2302),
  T("Baytown Rack Terminal - Houston", "Houston", "TRM_012", "10600 Eastex Fwy Rd", "Houston", "TX", "77093", 29.8601, -95.3259),
  T("Motiva Lake Charles Terminal - Lake Charles", "Lake Charles", "TRM_020", "2000 Hwy 87", "Westlake", "LA", "70669", 30.2557, -93.2816),
  T("Westlake Terminal - Lake Charles", "Lake Charles", "TRM_021", "1000 S Avery Blvd", "Westlake", "LA", "70669", 30.2391, -93.2504),
  T("Calcasieu Rack Terminal - Lake Charles", "Lake Charles", "TRM_022", "4500 Lake Charles Rd", "Lake Charles", "LA", "70607", 30.1784, -93.2066),
  T("San Jose Terminal - San Jose", "San Jose", "TRM_023", "2000 S Montgomery Expy", "San Jose", "CA", "95110", 37.3489, -121.9201),
  T("Bay Area Rack Terminal - San Jose", "San Jose", "TRM_024", "3100 N 3rd St", "San Jose", "CA", "95112", 37.3889, -121.9375),
  T("Phoenix Terminal - Phoenix", "Phoenix", "TRM_025", "4500 S 40th Ave", "Phoenix", "AZ", "85009", 33.4017, -112.1388),
  T("Tesoro Mesa Terminal - Phoenix", "Phoenix", "TRM_026", "1200 W Main St", "Mesa", "AZ", "85201", 33.4148, -111.8565),
  T("Magellan Atlanta Terminal - Atlanta", "Atlanta", "TRM_027", "2000 Fulton Rd SE", "Atlanta", "GA", "30316", 33.7325, -84.3502),
  T("Colonial Rack Terminal - Atlanta", "Atlanta", "TRM_028", "1500 Georgia Ave SE", "Atlanta", "GA", "30317", 33.7404, -84.3378),
  T("Magellan Pipeline - Midland", "West Texas / New Mexico", "TRM_029", "3000 W Interstate 20 Rd", "Midland", "TX", "79701", 31.9773, -102.1199),
  T("Crane Terminal - Midland", "West Texas / New Mexico", "TRM_030", "2200 N County Rd 1150", "Midland", "TX", "79706", 31.9432, -102.0423),
  /* The 3PL load orders' terminals — the same names the Load Order picks. */
  T("Greensbro KM2", "Greensboro", "TRM_040", "6907 W Market St", "Greensboro", "NC", "27409", 36.0617, -79.9123),
  T("Liberty P56", "Greensboro", "TRM_041", "4000 Burlington Rd", "Greensboro", "NC", "27405", 36.0951, -79.7224),
  T("Lib Washington 124", "Baltimore", "TRM_042", "1622 S Clinton St", "Baltimore", "MD", "21224", 39.2706, -76.5719),
  T("Kern River T4", "Bakersfield", "TRM_043", "2436 Buck Owens Blvd", "Bakersfield", "CA", "93308", 35.3891, -119.0438),
  T("Bakersfield Rack 2", "Bakersfield", "TRM_044", "6451 Rosedale Hwy", "Bakersfield", "CA", "93308", 35.3863, -119.0973),
];

const S = (name: string, type: SupplierType, erpId: string, contact: string, phone: string, email: string): MdSupplier => ({
  uid: `sp-${erpId}`,
  name,
  type,
  erpId,
  contact,
  phone,
  email,
  status: "active",
  notes: null,
  audit: created(erpId, -600),
});

export const MD_SUPPLIERS: MdSupplier[] = [
  S("ExxonMobil Fuels & Lubricants", "Major oil", "SUP_009", "Grace Holloway", "(713) 555-0140", "rack.sales@exxonmobil.example"),
  S("Motiva Enterprises", "Major oil", "SUP_010", "Luis Andrade", "(713) 555-0112", "supply@motiva.example"),
  S("Enterprise", "Distributor", "SUP_016", "Mara Quinn", "(713) 555-0176", "terminals@enterprise.example"),
  S("Enterprise-Sunoco", "Distributor", "SUP_017", "Owen Pratt", "(713) 555-0181", "orders@ent-sunoco.example"),
  S("Kroger-Exxon", "Retail partner", "SUP_018", "Hana Ito", "(713) 555-0129", "fuel@kroger-exxon.example"),
  S("BB Energy", "Trader", "SUP_019", "Felix Brandt", "(713) 555-0157", "desk@bbenergy.example"),
  S("Kroger-Hightower", "Retail partner", "SUP_020", "Rita Gomez", "(713) 555-0168", "fuel@kroger-hightower.example"),
  /* The 3PL load orders' suppliers. */
  S("Liberty P56", "Distributor", "SUP_030", "Calvin Moore", "(336) 555-0133", "orders@libertyp56.example"),
  S("Pioneer Distributing", "Distributor", "SUP_031", "Jen Alvarez", "(661) 555-0145", "dispatch@pioneerdist.example"),
  S("Sunrise Energy", "Trader", "SUP_032", "Ahmed Rahimi", "(336) 555-0190", "supply@sunrise.example"),
  S("Valley Fuels", "Distributor", "SUP_033", "Paula Ng", "(661) 555-0102", "orders@valleyfuels.example"),
];

/* ───────────────────────────────────────────────── loading accounts ── */

const FUEL = ["Dyed Diesel", "Clear Diesel #2", "Unleaded 87", "Unleaded 91"];
const A = (name: string, terminal: string, supplier: string, products: string[] = FUEL): LoadingAccount => ({ name, terminal, supplier, products });

/* LOADING ACCOUNTS ARE NUMBERS — terminal code + digits (Pavan, 2026-10-29). */
const MORE_ACCOUNTS: LoadingAccount[] = [
  A("T001-41102", "BWC Terminal - Houston", "Kroger-Exxon"),
  A("T002-41215", "US Oil Terminal - Houston", "Motiva Enterprises"),
  A("T003-41320", "Magellan Pipeline - Houston", "Enterprise-Sunoco"),
  A("T003-41348", "Magellan Pipeline - Houston", "Kroger-Hightower"),
  A("T004-41407", "Exxon Terminal - Houston", "ExxonMobil Fuels & Lubricants", [...FUEL, "Hydraulic Oil AW-46", "Engine Oil 15W-40"]),
  A("T004-41433", "Exxon Terminal - Houston", "Kroger-Exxon"),
  A("T005-41518", "Enterprise Echo Terminal - Houston", "Enterprise"),
  A("T005-41562", "Enterprise Echo Terminal - Houston", "Enterprise-Sunoco", [...FUEL, "Propane HD-5"]),
  A("TRM010-50110", "Houston Ship Channel Terminal - Houston", "ExxonMobil Fuels & Lubricants"),
  A("TRM010-50137", "Houston Ship Channel Terminal - Houston", "BB Energy", ["Dyed Diesel", "Clear Diesel #2"]),
  A("TRM012-50241", "Baytown Rack Terminal - Houston", "Kroger-Hightower", ["Unleaded 87", "Unleaded 91"]),
  A("TRM012-50268", "Baytown Rack Terminal - Houston", "BB Energy"),
  A("TRM020-52011", "Motiva Lake Charles Terminal - Lake Charles", "Motiva Enterprises"),
  A("TRM021-52107", "Westlake Terminal - Lake Charles", "ExxonMobil Fuels & Lubricants", ["Dyed Diesel", "Clear Diesel #2", "DEF Bulk"]),
  A("TRM022-52204", "Calcasieu Rack Terminal - Lake Charles", "BB Energy", ["Dyed Diesel", "Unleaded 87"]),
  A("TRM023-53019", "San Jose Terminal - San Jose", "Valley Fuels"),
  A("TRM024-53122", "Bay Area Rack Terminal - San Jose", "Valley Fuels", [...FUEL, "DEF Bulk"]),
  A("TRM025-54030", "Phoenix Terminal - Phoenix", "Sunrise Energy"),
  A("TRM026-54118", "Tesoro Mesa Terminal - Phoenix", "Valley Fuels", ["Unleaded 87", "Unleaded 91"]),
  A("TRM027-55026", "Magellan Atlanta Terminal - Atlanta", "Pioneer Distributing"),
  A("TRM028-55131", "Colonial Rack Terminal - Atlanta", "Pioneer Distributing", ["Clear Diesel #2", "Unleaded 87", "Propane Commercial"]),
  A("TRM029-56012", "Magellan Pipeline - Midland", "ExxonMobil Fuels & Lubricants", ["Dyed Diesel", "Clear Diesel #2"]),
  A("TRM030-56140", "Crane Terminal - Midland", "Enterprise", ["Dyed Diesel", "Propane HD-5"]),
];

export const MD_LOADING_ACCOUNTS: LoadingAccount[] = [...LOADING_ACCOUNTS, ...MORE_ACCOUNTS];

const uniq = (xs: string[]) => [...new Set(xs)].sort();

export const accountsAtTerminal = (t: string) => MD_LOADING_ACCOUNTS.filter((a) => terminalsOf(a).includes(t));
export const accountsOfSupplier = (s: string) => MD_LOADING_ACCOUNTS.filter((a) => suppliersOf(a).includes(s));
export const suppliersAt = (t: string) => uniq(accountsAtTerminal(t).flatMap(suppliersOf));
export const terminalsOfSupplier = (s: string) => uniq(accountsOfSupplier(s).flatMap(terminalsOf));
export const productsAtTerminal = (t: string) => uniq(accountsAtTerminal(t).flatMap((a) => a.products));
export const productsOfSupplier = (s: string) => uniq(accountsOfSupplier(s).flatMap((a) => a.products));

/** Where a product can be loaded — the reference's "Stocked at". */
export const terminalsStocking = (product: string) => uniq(MD_LOADING_ACCOUNTS.filter((a) => a.products.includes(product)).flatMap(terminalsOf));

/** A supplier's markets — where its terminals are. */
export const marketsOfSupplier = (s: string, terminals: MdTerminal[] = MD_TERMINALS) =>
  uniq(terminalsOfSupplier(s).map((t) => terminals.find((x) => x.name === t)?.market ?? "").filter(Boolean));

/* What a product IS, for a supplier's lines of service. */
const LINE: Record<string, string> = {
  "DEF Bulk": "DEF",
  "Hydraulic Oil AW-46": "Lubricants",
  "Engine Oil 15W-40": "Lubricants",
  "Propane HD-5": "Propane",
  "Propane Commercial": "Propane",
};
export const linesOfSupplier = (s: string) => uniq(productsOfSupplier(s).map((p) => LINE[p] ?? "Fuel"));

export const terminalAddress = (t: MdTerminal) => `${t.addressLine1}, ${t.city}, ${t.state} ${t.zip}`;
