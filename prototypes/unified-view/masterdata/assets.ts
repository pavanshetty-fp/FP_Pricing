import { dateOffset, type AuditEvent, type RecordStatus } from "../threepl/directoryCore";

/*
  MASTER DATA · ASSETS (Pavan, 2026-11-02, after the Lovable "unified UI"
  reference's Master Data → Assets and its Asset 360 page).

  The seven assets are the reference's. What the reference got wrong is fixed
  here rather than copied:
    · the list and the record read ONE set of numbers — a tank's level,
      capacity and deliveries are worked out from the record, never typed
      twice (TK-2201 said 23% of 1,000 gal in the list, 62% of 500 gal inside);
    · a tank holds what its type says (a 500 gal skid tank is 500 gal);
    · one lease is Active at a time — the earlier one Ended, the next a Draft;
    · a trailer with no deliveries shows none, and has no contract volume;
    · customer-owned assets have a record too, and CO-1210 has its own figures.

  Dates are offsets from the prototype's today, so "this month" stays true.
*/

export const MD_OWNERSHIP = ["Rental", "Customer owned"] as const;
export type MdOwnership = (typeof MD_OWNERSHIP)[number];

export const MD_CONDITIONS = ["New", "Refurbished", "Used"] as const;
export type MdCondition = (typeof MD_CONDITIONS)[number];

export const MD_ASSET_STATUSES = ["On rent", "Available", "Service due", "On site"] as const;
export type MdAssetStatus = (typeof MD_ASSET_STATUSES)[number];

export const MD_ASSET_TYPES = [
  "275 gal tote",
  "500 gal skid tank",
  "1,000 gal tank",
  "2,000 gal fuel tank",
  "Transport trailer",
] as const;

export const MD_PRODUCTS = ["Dyed Diesel", "Clear Diesel", "Unleaded 87", "DEF", "Heating Oil"] as const;

export const MD_SITES = [
  "Winterset Depot",
  "Adel Yard",
  "Bear Mountain",
  "sp ship to 1",
  "hartest2",
  "Asheville Terminal",
  "Irving Hub",
] as const;

export const MD_CUSTOMERS = [
  "Agriland FS",
  "Blue Ridge Fleet",
  "Customer Test",
  "Hartest123",
  "SP Energy",
] as const;

export const MD_CARRIERS = ["Acorn Petroleum", "Ridgeline Haulers", "Prairie Fuel Co."] as const;

export const MONITOR_STATES = ["Linked", "Not linked", "No monitor"] as const;
export type MonitorState = (typeof MONITOR_STATES)[number];

export interface MdMonitor {
  id: string;
  model: string;
  linked: boolean;
  /** Gallons in the tank at the last ping. */
  levelGal: number | null;
  lastPing: string | null;
}

export interface MdLease {
  id: string;
  status: "Draft" | "Signed" | "Active" | "Ended";
  from: string | null;
  to: string | null;
  /** Gallons the lease commits the customer to, and how many have gone in. */
  committedGal: number | null;
}

export interface MdDelivery {
  id: string;
  date: string;
  product: string;
  gal: number;
  carrier: string;
  amount: number;
  pod: "Attached" | "Not attached";
}

export interface MdMovement {
  id: string;
  source: "Dispatch" | "Customer request" | "Lease";
  from: string;
  to: string;
  scheduled: string;
  status: "Draft" | "Scheduled" | "In transit" | "Completed";
  documents: "Attached" | "Pending";
}

export interface MdPlacement {
  location: string;
  from: string;
  to: string | null;
  lease: string | null;
  order: string | null;
  note: string;
}

export interface MdServiceOrder {
  id: string;
  job: string;
  technician: string;
  scheduled: string;
  amount: number | null;
  stage: "Open" | "Assigned" | "Completed" | "Invoiced";
  documents: "Attached" | "Pending" | "Not attached";
}

export interface MdAgreement {
  id: string;
  plan: "Basic" | "Plus" | "Premium";
  visitsUsed: number;
  visitsTotal: number;
  renews: string;
  autoRenew: boolean;
}

export interface MdMaintenance {
  plan: string;
  cadence: string;
  last: string | null;
  next: string;
  autoGenerate: boolean;
}

export interface MdCompliance {
  requirement: string;
  authority: string;
  last: string | null;
  due: string;
  status: "Current" | "Due soon" | "Overdue";
}

export interface MdLeakCheck {
  id: string;
  date: string;
  technician: string;
  method: string;
  pressure: string;
  result: "Pass" | "Fail";
}

export interface MdPeripheral {
  id: string;
  type: "Pump" | "Nozzle" | "Hose" | "Meter" | "Filter";
  model: string;
  serial: string;
  installed: string;
  warrantyEnds: string;
  status: "Active" | "Expiring" | "Expired";
}

export interface MdInvoice {
  id: string;
  serviceOrder: string;
  issued: string;
  due: string;
  total: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

export interface MdAsset {
  /** The record's own key — stays put when the Asset ID is retyped. */
  uid: string;
  /** The Asset ID people read and type — "TK-2201". */
  id: string;
  type: string;
  ownership: MdOwnership;
  condition: MdCondition;
  status: MdAssetStatus;
  recordStatus: RecordStatus;
  customer: string | null;
  site: string;
  address: string;
  placedOn: string | null;
  onRentSince: string | null;
  /** Monthly rental rate; null for a customer-owned asset. */
  rate: number | null;
  product: string | null;
  capacityGal: number;
  monitor: MdMonitor | null;
  leases: MdLease[];
  deliveries: MdDelivery[];
  movements: MdMovement[];
  journey: MdPlacement[];
  serviceOrders: MdServiceOrder[];
  agreement: MdAgreement | null;
  maintenance: MdMaintenance[];
  compliance: MdCompliance[];
  leakChecks: MdLeakCheck[];
  peripherals: MdPeripheral[];
  invoices: MdInvoice[];
  audit: AuditEvent[];
}

/* ─────────────────────────────────────────────────────────── derived ── */

export const monitorState = (a: MdAsset): MonitorState =>
  !a.monitor ? "No monitor" : a.monitor.linked ? "Linked" : "Not linked";

/** Level as a whole %, or null where nothing reads it. */
export function levelPct(a: MdAsset): number | null {
  const g = a.monitor?.linked ? a.monitor.levelGal : null;
  if (g === null || g === undefined || a.capacityGal <= 0) return null;
  return Math.round((g / a.capacityGal) * 100);
}

export const activeLease = (a: MdAsset): MdLease | null =>
  a.leases.find((l) => l.status === "Active") ?? null;

/** Gallons delivered since the active lease began — what its volume is measured in. */
export function contractUse(a: MdAsset): { lease: MdLease; used: number; committed: number } | null {
  const lease = activeLease(a);
  if (!lease?.committedGal) return null;
  const used = a.deliveries
    .filter((d) => !lease.from || d.date >= lease.from)
    .reduce((s, d) => s + d.gal, 0);
  return { lease, used, committed: lease.committedGal };
}

const monthOf = (iso: string) => iso.slice(0, 7);
export const THIS_MONTH = monthOf(dateOffset(0));

export function deliveryStats(a: MdAsset) {
  const sorted = [...a.deliveries].sort((x, y) => y.date.localeCompare(x.date));
  const month = sorted.filter((d) => monthOf(d.date) === THIS_MONTH);
  return {
    last: sorted[0] ?? null,
    monthCount: month.length,
    monthGal: month.reduce((s, d) => s + d.gal, 0),
    totalGal: sorted.reduce((s, d) => s + d.gal, 0),
  };
}

/* ─────────────────────────────────────────────────────────── seed ── */

const at = (days: number, time = "09:00") => `${dateOffset(days)}T${time}:00Z`;

const dl = (
  id: string,
  days: number,
  product: string,
  gal: number,
  carrier: string = MD_CARRIERS[0],
  pod: MdDelivery["pod"] = "Attached",
): MdDelivery => ({ id, date: dateOffset(days), product, gal, carrier, amount: Math.round(gal * 3.4), pod });

const created = (days: number): AuditEvent => ({
  id: `au-c${days}`,
  at: at(days, "08:00"),
  by: "Dana Whitfield",
  action: "Created",
  changes: ["Asset record created"],
});

/** Every delivery is an event on the asset's history too — one source. */
const deliveryEvents = (ds: MdDelivery[]): AuditEvent[] =>
  ds.map((d) => ({
    id: `au-${d.id}`,
    at: `${d.date}T10:00:00Z`,
    by: d.carrier,
    action: `Fuel delivered · ${d.id}`,
    changes: [`${d.gal.toLocaleString()} gal ${d.product} · $${d.amount.toLocaleString()}`],
  }));

const withEvents = (a: Omit<MdAsset, "audit" | "uid">, extra: AuditEvent[], createdDays: number): MdAsset => ({
  ...a,
  uid: a.id,
  audit: [...deliveryEvents(a.deliveries), ...extra, created(createdDays)].sort((x, y) =>
    y.at.localeCompare(x.at),
  ),
});

const TK2201_DELIVERIES = [
  dl("DL-9921", -3, "Dyed Diesel", 157),
  dl("DL-9870", -6, "Dyed Diesel", 269),
  dl("DL-9812", -20, "Dyed Diesel", 390),
  dl("DL-9704", -35, "Dyed Diesel", 440, MD_CARRIERS[0], "Not attached"),
];

const TK2201: MdAsset = withEvents(
  {
    id: "TK-2201",
    type: "500 gal skid tank",
    ownership: "Rental",
    condition: "New",
    status: "On rent",
    recordStatus: "active",
    customer: "Agriland FS",
    site: "Winterset Depot",
    address: "1420 Depot Rd, Winterset, IA 50273",
    placedOn: dateOffset(-187),
    onRentSince: dateOffset(-187),
    rate: 120,
    product: "Dyed Diesel",
    capacityGal: 500,
    monitor: { id: "MON-8891", model: "FP Sense 2", linked: true, levelGal: 310, lastPing: at(-1, "06:40") },
    leases: [
      { id: "LA-5005", status: "Ended", from: dateOffset(-187), to: dateOffset(-79), committedGal: 8000 },
      { id: "LA-5006", status: "Active", from: dateOffset(-78), to: dateOffset(287), committedGal: 2000 },
      { id: "LA-5012", status: "Draft", from: dateOffset(288), to: null, committedGal: 2000 },
    ],
    deliveries: TK2201_DELIVERIES,
    movements: [
      { id: "AMO-3104", source: "Lease", from: "Irving Hub", to: "Winterset Depot", scheduled: dateOffset(-188), status: "Completed", documents: "Attached" },
      { id: "AMO-3311", source: "Customer request", from: "Winterset Depot", to: "Event Depot", scheduled: dateOffset(-79), status: "Completed", documents: "Attached" },
      { id: "AMO-3420", source: "Dispatch", from: "Event Depot", to: "Winterset Depot", scheduled: dateOffset(9), status: "Scheduled", documents: "Pending" },
    ],
    journey: [
      { location: "Irving Hub — yard", from: dateOffset(-240), to: dateOffset(-188), lease: null, order: null, note: "New unit received" },
      { location: "Winterset Depot — Agriland FS", from: dateOffset(-187), to: dateOffset(-79), lease: "LA-5005", order: "AMO-3104", note: "Placed under lease" },
      { location: "Event Depot — Agriland FS", from: dateOffset(-78), to: null, lease: "LA-5006", order: "AMO-3311", note: "Relocated" },
    ],
    serviceOrders: [
      { id: "SO-4410", job: "Annual leak check", technician: "Ravi Menon", scheduled: `${dateOffset(7)}T08:00:00Z`, amount: null, stage: "Assigned", documents: "Pending" },
      { id: "SO-4399", job: "Filter change", technician: "Ravi Menon", scheduled: `${dateOffset(-34)}T10:00:00Z`, amount: 140, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4288", job: "Pump inspection", technician: "Ben Ortiz", scheduled: `${dateOffset(-120)}T13:30:00Z`, amount: 95, stage: "Completed", documents: "Attached" },
    ],
    agreement: { id: "SA-1180", plan: "Plus", visitsUsed: 2, visitsTotal: 4, renews: dateOffset(178), autoRenew: true },
    maintenance: [
      { plan: "Filter change", cadence: "Every 6 months", last: dateOffset(-34), next: dateOffset(150), autoGenerate: true },
      { plan: "Annual leak check", cadence: "Every 12 months", last: dateOffset(-358), next: dateOffset(7), autoGenerate: true },
      { plan: "Pump inspection", cadence: "Every 6 months", last: dateOffset(-120), next: dateOffset(62), autoGenerate: false },
    ],
    compliance: [
      { requirement: "Tank tightness test", authority: "State EPA", last: dateOffset(-358), due: dateOffset(7), status: "Due soon" },
      { requirement: "Spill kit inspection", authority: "OSHA", last: dateOffset(-60), due: dateOffset(120), status: "Current" },
      { requirement: "Secondary containment", authority: "State EPA", last: dateOffset(-187), due: dateOffset(178), status: "Current" },
    ],
    leakChecks: [
      { id: "LC-441", date: dateOffset(-358), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-402", date: dateOffset(-720), technician: "Ben Ortiz", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "GPI M-3120", serial: "GP3120-4417", installed: dateOffset(-187), warrantyEnds: dateOffset(543), status: "Active" },
      { id: "pr-2", type: "Nozzle", model: "OPW 7H", serial: "OPW7H-2291", installed: dateOffset(-187), warrantyEnds: dateOffset(23), status: "Expiring" },
      { id: "pr-3", type: "Hose", model: "20 ft fuel hose", serial: "HS-7741", installed: dateOffset(-187), warrantyEnds: dateOffset(178), status: "Active" },
    ],
    invoices: [
      { id: "INV-7741", serviceOrder: "SO-4399", issued: dateOffset(-33), due: dateOffset(-3), total: 151.55, status: "Overdue" },
      { id: "INV-7610", serviceOrder: "SO-4288", issued: dateOffset(-118), due: dateOffset(-88), total: 102.6, status: "Paid" },
    ],
  },
  [
    { id: "au-so4399-i", at: at(-33, "09:20"), by: "Billing", action: "SO-4399 · Invoice INV-7741 raised", changes: ["$151.55"] },
    { id: "au-so4399-c", at: at(-34, "10:48"), by: "Ravi Menon (field app)", action: "SO-4399 · Job completed", changes: ["Signed by M. Reyes"] },
    { id: "au-so4399-a", at: at(-37, "09:00"), by: "Dispatch", action: "SO-4399 · Technician assigned", changes: ["Ravi Menon"] },
    { id: "au-so4410-a", at: at(-2, "15:10"), by: "Dispatch", action: "SO-4410 · Technician assigned", changes: ["Ravi Menon"] },
    { id: "au-so4410-c", at: at(-2, "14:40"), by: "Dispatch", action: "SO-4410 · Service order created", changes: [] },
  ],
  -240,
);

const TK2208: MdAsset = withEvents(
  {
    id: "TK-2208",
    type: "1,000 gal tank",
    ownership: "Rental",
    condition: "Refurbished",
    status: "On rent",
    recordStatus: "active",
    customer: "Customer Test",
    site: "Bear Mountain",
    address: "88 Ridge Rd, Bear Mountain, NY 10911",
    placedOn: dateOffset(-228),
    onRentSince: dateOffset(-228),
    rate: 180,
    product: "Clear Diesel",
    capacityGal: 1000,
    monitor: { id: "MON-8902", model: "FP Sense 2", linked: true, levelGal: 300, lastPing: at(0, "05:15") },
    leases: [
      { id: "LA-5009", status: "Active", from: dateOffset(-228), to: dateOffset(137), committedGal: null },
      { id: "LA-4980", status: "Ended", from: dateOffset(-600), to: dateOffset(-229), committedGal: null },
      { id: "LA-5015", status: "Draft", from: dateOffset(138), to: null, committedGal: null },
    ],
    deliveries: [
      dl("DL-9925", -3, "Clear Diesel", 206, MD_CARRIERS[1]),
      dl("DL-9901", -4, "Clear Diesel", 340, MD_CARRIERS[1]),
      dl("DL-9884", -5, "Clear Diesel", 310, MD_CARRIERS[1]),
      dl("DL-9860", -6, "Clear Diesel", 360, MD_CARRIERS[1], "Not attached"),
      dl("DL-9790", -21, "Clear Diesel", 410, MD_CARRIERS[1]),
    ],
    movements: [
      { id: "AMO-3122", source: "Lease", from: "Irving Hub", to: "Bear Mountain", scheduled: dateOffset(-229), status: "Completed", documents: "Attached" },
      { id: "AMO-3407", source: "Dispatch", from: "Bear Mountain", to: "Irving Hub", scheduled: dateOffset(138), status: "Draft", documents: "Pending" },
      { id: "AMO-3398", source: "Customer request", from: "Bear Mountain", to: "Bear Mountain — north pad", scheduled: dateOffset(-12), status: "Completed", documents: "Attached" },
    ],
    journey: [
      { location: "Irving Hub — yard", from: dateOffset(-400), to: dateOffset(-229), lease: null, order: null, note: "Refurbished and returned to stock" },
      { location: "Bear Mountain — Customer Test", from: dateOffset(-228), to: dateOffset(-13), lease: "LA-5009", order: "AMO-3122", note: "Placed under lease" },
      { location: "Bear Mountain north pad — Customer Test", from: dateOffset(-12), to: null, lease: "LA-5009", order: "AMO-3398", note: "Moved on site" },
    ],
    serviceOrders: [
      { id: "SO-4415", job: "Gauge calibration", technician: "Ben Ortiz", scheduled: `${dateOffset(4)}T09:30:00Z`, amount: null, stage: "Assigned", documents: "Pending" },
      { id: "SO-4350", job: "Filter change", technician: "Ravi Menon", scheduled: `${dateOffset(-70)}T11:00:00Z`, amount: 140, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4301", job: "Valve replacement", technician: "Ben Ortiz", scheduled: `${dateOffset(-140)}T08:00:00Z`, amount: 310, stage: "Invoiced", documents: "Attached" },
    ],
    agreement: { id: "SA-1192", plan: "Basic", visitsUsed: 1, visitsTotal: 2, renews: dateOffset(137), autoRenew: false },
    maintenance: [
      { plan: "Filter change", cadence: "Every 6 months", last: dateOffset(-70), next: dateOffset(112), autoGenerate: true },
      { plan: "Gauge calibration", cadence: "Every 12 months", last: dateOffset(-361), next: dateOffset(4), autoGenerate: true },
      { plan: "Valve inspection", cadence: "Every 12 months", last: dateOffset(-140), next: dateOffset(225), autoGenerate: false },
    ],
    compliance: [
      { requirement: "Tank tightness test", authority: "State DEC", last: dateOffset(-200), due: dateOffset(165), status: "Current" },
      { requirement: "Spill kit inspection", authority: "OSHA", last: dateOffset(-380), due: dateOffset(-15), status: "Overdue" },
      { requirement: "Secondary containment", authority: "State DEC", last: dateOffset(-228), due: dateOffset(137), status: "Current" },
    ],
    leakChecks: [
      { id: "LC-452", date: dateOffset(-200), technician: "Ben Ortiz", method: "Vacuum", pressure: "4 psi", result: "Pass" },
      { id: "LC-418", date: dateOffset(-560), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Fail" },
      { id: "LC-419", date: dateOffset(-545), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "Fill-Rite FR700", serial: "FR700-1180", installed: dateOffset(-228), warrantyEnds: dateOffset(137), status: "Active" },
      { id: "pr-2", type: "Meter", model: "Fill-Rite 900CD", serial: "900CD-5521", installed: dateOffset(-228), warrantyEnds: dateOffset(-5), status: "Expired" },
      { id: "pr-3", type: "Filter", model: "Cim-Tek 70063", serial: "CT-70063-88", installed: dateOffset(-70), warrantyEnds: dateOffset(295), status: "Active" },
    ],
    invoices: [
      { id: "INV-7705", serviceOrder: "SO-4350", issued: dateOffset(-69), due: dateOffset(-39), total: 151.55, status: "Paid" },
      { id: "INV-7652", serviceOrder: "SO-4301", issued: dateOffset(-139), due: dateOffset(-109), total: 335.4, status: "Paid" },
    ],
  },
  [
    { id: "au-so4415", at: at(-1, "11:05"), by: "Dispatch", action: "SO-4415 · Technician assigned", changes: ["Ben Ortiz"] },
    { id: "au-mv3398", at: at(-12, "14:00"), by: "Dispatch", action: "AMO-3398 · Movement completed", changes: ["Bear Mountain → north pad"] },
  ],
  -400,
);

const TT0413: MdAsset = withEvents(
  {
    id: "TT-0413",
    type: "275 gal tote",
    ownership: "Rental",
    condition: "Used",
    status: "On rent",
    recordStatus: "active",
    customer: "SP Energy",
    site: "sp ship to 1",
    address: "4120 Commerce St, Dallas, TX 75226",
    placedOn: dateOffset(-88),
    onRentSince: dateOffset(-88),
    rate: 45,
    product: "DEF",
    capacityGal: 275,
    monitor: null,
    leases: [
      { id: "LA-5011", status: "Active", from: dateOffset(-88), to: dateOffset(277), committedGal: 1200 },
      { id: "LA-4991", status: "Ended", from: dateOffset(-460), to: dateOffset(-89), committedGal: 900 },
      { id: "LA-5018", status: "Draft", from: dateOffset(278), to: null, committedGal: 1200 },
    ],
    deliveries: [
      dl("DL-9918", -5, "DEF", 120, MD_CARRIERS[2]),
      dl("DL-9895", -6, "DEF", 135, MD_CARRIERS[2]),
      dl("DL-9840", -12, "DEF", 110, MD_CARRIERS[2], "Not attached"),
      dl("DL-9781", -24, "DEF", 140, MD_CARRIERS[2]),
      dl("DL-9702", -40, "DEF", 130, MD_CARRIERS[2]),
    ],
    movements: [
      { id: "AMO-3260", source: "Lease", from: "Irving Hub", to: "sp ship to 1", scheduled: dateOffset(-89), status: "Completed", documents: "Attached" },
      { id: "AMO-2990", source: "Lease", from: "Irving Hub", to: "sp ship to 1", scheduled: dateOffset(-461), status: "Completed", documents: "Attached" },
      { id: "AMO-3121", source: "Dispatch", from: "sp ship to 1", to: "Irving Hub", scheduled: dateOffset(-90), status: "Completed", documents: "Attached" },
    ],
    journey: [
      { location: "sp ship to 1 — SP Energy", from: dateOffset(-460), to: dateOffset(-90), lease: "LA-4991", order: "AMO-2990", note: "Placed under lease" },
      { location: "Irving Hub — yard", from: dateOffset(-90), to: dateOffset(-89), lease: null, order: "AMO-3121", note: "Cleaned between leases" },
      { location: "sp ship to 1 — SP Energy", from: dateOffset(-88), to: null, lease: "LA-5011", order: "AMO-3260", note: "Placed under lease" },
    ],
    serviceOrders: [
      { id: "SO-4380", job: "Seal replacement", technician: "Ana Cruz", scheduled: `${dateOffset(-50)}T09:00:00Z`, amount: 85, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4422", job: "Visual inspection", technician: "Ana Cruz", scheduled: `${dateOffset(12)}T10:00:00Z`, amount: null, stage: "Open", documents: "Not attached" },
      { id: "SO-4210", job: "Valve check", technician: "Ben Ortiz", scheduled: `${dateOffset(-200)}T10:00:00Z`, amount: 60, stage: "Invoiced", documents: "Attached" },
    ],
    agreement: { id: "SA-1201", plan: "Basic", visitsUsed: 1, visitsTotal: 2, renews: dateOffset(277), autoRenew: true },
    maintenance: [
      { plan: "Visual inspection", cadence: "Every 3 months", last: dateOffset(-80), next: dateOffset(12), autoGenerate: true },
      { plan: "Seal replacement", cadence: "Every 12 months", last: dateOffset(-50), next: dateOffset(315), autoGenerate: false },
      { plan: "Valve check", cadence: "Every 6 months", last: dateOffset(-200), next: dateOffset(-18), autoGenerate: true },
    ],
    compliance: [
      { requirement: "DOT tote recertification", authority: "US DOT", last: dateOffset(-700), due: dateOffset(395), status: "Current" },
      { requirement: "Spill kit inspection", authority: "OSHA", last: dateOffset(-88), due: dateOffset(277), status: "Current" },
      { requirement: "Label check", authority: "OSHA", last: dateOffset(-88), due: dateOffset(10), status: "Due soon" },
    ],
    leakChecks: [
      { id: "LC-460", date: dateOffset(-89), technician: "Ana Cruz", method: "Visual", pressure: "—", result: "Pass" },
      { id: "LC-391", date: dateOffset(-461), technician: "Ben Ortiz", method: "Visual", pressure: "—", result: "Pass" },
      { id: "LC-350", date: dateOffset(-700), technician: "Ben Ortiz", method: "Hydrostatic", pressure: "3 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "Piusi Suzzarablue", serial: "PS-22019", installed: dateOffset(-88), warrantyEnds: dateOffset(642), status: "Active" },
      { id: "pr-2", type: "Nozzle", model: "Piusi DEF auto", serial: "PDN-7781", installed: dateOffset(-88), warrantyEnds: dateOffset(277), status: "Active" },
      { id: "pr-3", type: "Hose", model: "12 ft DEF hose", serial: "HS-3390", installed: dateOffset(-88), warrantyEnds: dateOffset(15), status: "Expiring" },
    ],
    invoices: [
      { id: "INV-7690", serviceOrder: "SO-4380", issued: dateOffset(-49), due: dateOffset(-19), total: 92.1, status: "Paid" },
      { id: "INV-7522", serviceOrder: "SO-4210", issued: dateOffset(-199), due: dateOffset(-169), total: 64.95, status: "Paid" },
    ],
  },
  [{ id: "au-so4422", at: at(-1, "16:20"), by: "Dispatch", action: "SO-4422 · Service order created", changes: [] }],
  -700,
);

const TR7702: MdAsset = withEvents(
  {
    id: "TR-7702",
    type: "Transport trailer",
    ownership: "Rental",
    condition: "Refurbished",
    status: "Available",
    recordStatus: "active",
    customer: null,
    site: "Irving Hub",
    address: "3300 Belt Line Rd, Irving, TX 75062",
    placedOn: null,
    onRentSince: null,
    rate: null,
    product: null,
    capacityGal: 9000,
    monitor: { id: "MON-8600", model: "FP Sense 2", linked: false, levelGal: null, lastPing: null },
    leases: [
      { id: "LA-5007", status: "Signed", from: dateOffset(14), to: dateOffset(379), committedGal: null },
      { id: "LA-4870", status: "Ended", from: dateOffset(-500), to: dateOffset(-160), committedGal: null },
      { id: "LA-4702", status: "Ended", from: dateOffset(-900), to: dateOffset(-520), committedGal: null },
    ],
    deliveries: [],
    movements: [
      { id: "AMO-3430", source: "Lease", from: "Irving Hub", to: "Fort Worth Yard", scheduled: dateOffset(14), status: "Scheduled", documents: "Pending" },
      { id: "AMO-3015", source: "Dispatch", from: "Fort Worth Yard", to: "Irving Hub", scheduled: dateOffset(-160), status: "Completed", documents: "Attached" },
      { id: "AMO-2870", source: "Lease", from: "Irving Hub", to: "Fort Worth Yard", scheduled: dateOffset(-500), status: "Completed", documents: "Attached" },
    ],
    journey: [
      { location: "Fort Worth Yard — Lone Star Transport", from: dateOffset(-500), to: dateOffset(-160), lease: "LA-4870", order: "AMO-2870", note: "Placed under lease" },
      { location: "Irving Hub — workshop", from: dateOffset(-159), to: dateOffset(-40), lease: null, order: "AMO-3015", note: "Refurbished" },
      { location: "Irving Hub — yard", from: dateOffset(-39), to: null, lease: null, order: null, note: "Available at hub" },
    ],
    serviceOrders: [
      { id: "SO-4396", job: "Brake and light inspection", technician: "Ben Ortiz", scheduled: `${dateOffset(-40)}T08:00:00Z`, amount: 540, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4290", job: "Refurbishment", technician: "Ben Ortiz", scheduled: `${dateOffset(-150)}T08:00:00Z`, amount: 4200, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4428", job: "Pre-lease inspection", technician: "Ana Cruz", scheduled: `${dateOffset(10)}T08:00:00Z`, amount: null, stage: "Open", documents: "Not attached" },
    ],
    agreement: null,
    maintenance: [
      { plan: "Brake and light inspection", cadence: "Every 6 months", last: dateOffset(-40), next: dateOffset(142), autoGenerate: true },
      { plan: "Tire check", cadence: "Every 3 months", last: dateOffset(-40), next: dateOffset(51), autoGenerate: true },
      { plan: "Pre-lease inspection", cadence: "Before each lease", last: dateOffset(-500), next: dateOffset(10), autoGenerate: false },
    ],
    compliance: [
      { requirement: "DOT annual inspection", authority: "US DOT", last: dateOffset(-40), due: dateOffset(325), status: "Current" },
      { requirement: "Cargo tank test (V)", authority: "US DOT", last: dateOffset(-40), due: dateOffset(325), status: "Current" },
      { requirement: "Cargo tank test (K)", authority: "US DOT", last: dateOffset(-372), due: dateOffset(-7), status: "Overdue" },
    ],
    leakChecks: [
      { id: "LC-458", date: dateOffset(-40), technician: "Ben Ortiz", method: "Pressure decay", pressure: "3 psi", result: "Pass" },
      { id: "LC-371", date: dateOffset(-372), technician: "Ben Ortiz", method: "Pressure decay", pressure: "3 psi", result: "Pass" },
      { id: "LC-310", date: dateOffset(-737), technician: "Ravi Menon", method: "Pressure decay", pressure: "3 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "Blackmer TXD3", serial: "TXD3-0091", installed: dateOffset(-150), warrantyEnds: dateOffset(580), status: "Active" },
      { id: "pr-2", type: "Meter", model: "LC M-10", serial: "LCM10-4412", installed: dateOffset(-150), warrantyEnds: dateOffset(215), status: "Active" },
      { id: "pr-3", type: "Hose", model: "3 in. transfer hose", serial: "HS-9020", installed: dateOffset(-150), warrantyEnds: dateOffset(20), status: "Expiring" },
    ],
    invoices: [
      { id: "INV-7702", serviceOrder: "SO-4396", issued: dateOffset(-39), due: dateOffset(-9), total: 562.9, status: "Paid" },
      { id: "INV-7590", serviceOrder: "SO-4290", issued: dateOffset(-149), due: dateOffset(-119), total: 4378.5, status: "Paid" },
    ],
  },
  [
    { id: "au-so4396-p", at: at(-30, "10:00"), by: "Billing", action: "SO-4396 · Invoice INV-7702 paid", changes: ["$562.90"] },
    { id: "au-so4396-c", at: at(-40, "11:40"), by: "Ben Ortiz (field app)", action: "SO-4396 · Job completed", changes: ["Signed by K. Dunn"] },
    { id: "au-la5007", at: at(-4, "13:00"), by: "Dana Whitfield", action: "LA-5007 · Lease signed", changes: ["Starts in 14 days"] },
  ],
  -900,
);

const TK2214: MdAsset = withEvents(
  {
    id: "TK-2214",
    type: "500 gal skid tank",
    ownership: "Rental",
    condition: "Used",
    status: "Service due",
    recordStatus: "active",
    customer: "Hartest123",
    site: "hartest2",
    address: "77 Mill Rd, Hartford, CT 06106",
    placedOn: dateOffset(-128),
    onRentSince: dateOffset(-128),
    rate: 120,
    product: "Unleaded 87",
    capacityGal: 500,
    monitor: { id: "MON-8911", model: "FP Sense 2", linked: true, levelGal: 135, lastPing: at(0, "04:50") },
    leases: [
      { id: "LA-5010", status: "Active", from: dateOffset(-128), to: dateOffset(237), committedGal: null },
      { id: "LA-4950", status: "Ended", from: dateOffset(-520), to: dateOffset(-129), committedGal: null },
      { id: "LA-5020", status: "Draft", from: dateOffset(238), to: null, committedGal: null },
    ],
    deliveries: [
      dl("DL-9930", -1, "Unleaded 87", 185),
      dl("DL-9811", -12, "Unleaded 87", 260),
      dl("DL-9755", -30, "Unleaded 87", 240),
    ],
    movements: [
      { id: "AMO-3215", source: "Lease", from: "Irving Hub", to: "hartest2", scheduled: dateOffset(-129), status: "Completed", documents: "Attached" },
      { id: "AMO-3440", source: "Dispatch", from: "hartest2", to: "Irving Hub", scheduled: dateOffset(5), status: "Draft", documents: "Pending" },
      { id: "AMO-2950", source: "Lease", from: "Irving Hub", to: "hartest2", scheduled: dateOffset(-521), status: "Completed", documents: "Attached" },
    ],
    journey: [
      { location: "hartest2 — Hartest123", from: dateOffset(-520), to: dateOffset(-130), lease: "LA-4950", order: "AMO-2950", note: "Placed under lease" },
      { location: "Irving Hub — yard", from: dateOffset(-130), to: dateOffset(-129), lease: null, order: null, note: "Swapped between leases" },
      { location: "hartest2 — Hartest123", from: dateOffset(-128), to: null, lease: "LA-5010", order: "AMO-3215", note: "Placed under lease" },
    ],
    serviceOrders: [
      { id: "SO-4431", job: "Filter change", technician: "Ravi Menon", scheduled: `${dateOffset(2)}T09:00:00Z`, amount: null, stage: "Open", documents: "Not attached" },
      { id: "SO-4344", job: "Gauge repair", technician: "Ana Cruz", scheduled: `${dateOffset(-75)}T14:00:00Z`, amount: 175, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4270", job: "Annual leak check", technician: "Ravi Menon", scheduled: `${dateOffset(-128)}T09:00:00Z`, amount: 110, stage: "Invoiced", documents: "Attached" },
    ],
    agreement: { id: "SA-1199", plan: "Premium", visitsUsed: 3, visitsTotal: 6, renews: dateOffset(237), autoRenew: true },
    maintenance: [
      { plan: "Filter change", cadence: "Every 6 months", last: dateOffset(-190), next: dateOffset(-8), autoGenerate: true },
      { plan: "Annual leak check", cadence: "Every 12 months", last: dateOffset(-128), next: dateOffset(237), autoGenerate: true },
      { plan: "Gauge check", cadence: "Every 6 months", last: dateOffset(-75), next: dateOffset(107), autoGenerate: false },
    ],
    compliance: [
      { requirement: "Tank tightness test", authority: "State DEEP", last: dateOffset(-128), due: dateOffset(237), status: "Current" },
      { requirement: "Spill kit inspection", authority: "OSHA", last: dateOffset(-128), due: dateOffset(237), status: "Current" },
      { requirement: "Vapor recovery check", authority: "State DEEP", last: dateOffset(-350), due: dateOffset(15), status: "Due soon" },
    ],
    leakChecks: [
      { id: "LC-449", date: dateOffset(-128), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-400", date: dateOffset(-493), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-362", date: dateOffset(-858), technician: "Ben Ortiz", method: "Vacuum", pressure: "4 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "GPI M-3120", serial: "GP3120-4502", installed: dateOffset(-128), warrantyEnds: dateOffset(602), status: "Active" },
      { id: "pr-2", type: "Filter", model: "Cim-Tek 70020", serial: "CT-70020-14", installed: dateOffset(-190), warrantyEnds: dateOffset(-8), status: "Expired" },
      { id: "pr-3", type: "Nozzle", model: "OPW 11B", serial: "OPW11B-6630", installed: dateOffset(-128), warrantyEnds: dateOffset(237), status: "Active" },
    ],
    invoices: [
      { id: "INV-7681", serviceOrder: "SO-4344", issued: dateOffset(-74), due: dateOffset(-44), total: 189.65, status: "Paid" },
      { id: "INV-7633", serviceOrder: "SO-4270", issued: dateOffset(-127), due: dateOffset(-97), total: 119.2, status: "Paid" },
    ],
  },
  [{ id: "au-svcdue", at: at(-8, "00:05"), by: "Maintenance plan", action: "Filter change overdue", changes: ["Status → Service due"] }],
  -858,
);

const CO1102: MdAsset = withEvents(
  {
    id: "CO-1102",
    type: "2,000 gal fuel tank",
    ownership: "Customer owned",
    condition: "Used",
    status: "On site",
    recordStatus: "active",
    customer: "Agriland FS",
    site: "Adel Yard",
    address: "210 Nile Kinnick Dr, Adel, IA 50003",
    placedOn: dateOffset(-1200),
    onRentSince: null,
    rate: null,
    product: "Dyed Diesel",
    capacityGal: 2000,
    monitor: { id: "MON-8720", model: "FP Sense 2", linked: true, levelGal: 1740, lastPing: at(0, "06:10") },
    leases: [],
    deliveries: [
      dl("DL-9922", -3, "Dyed Diesel", 409),
      dl("DL-9888", -5, "Dyed Diesel", 452),
      dl("DL-9861", -6, "Dyed Diesel", 432),
      dl("DL-9803", -22, "Dyed Diesel", 520),
    ],
    movements: [],
    journey: [{ location: "Adel Yard — Agriland FS", from: dateOffset(-1200), to: null, lease: null, order: null, note: "Customer's own tank, registered for deliveries" }],
    serviceOrders: [
      { id: "SO-4360", job: "Annual leak check", technician: "Ravi Menon", scheduled: `${dateOffset(-60)}T09:00:00Z`, amount: 110, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4433", job: "Gauge calibration", technician: "Ana Cruz", scheduled: `${dateOffset(20)}T10:00:00Z`, amount: null, stage: "Open", documents: "Not attached" },
      { id: "SO-4190", job: "Pump repair", technician: "Ben Ortiz", scheduled: `${dateOffset(-240)}T13:00:00Z`, amount: 260, stage: "Invoiced", documents: "Attached" },
    ],
    agreement: null,
    maintenance: [
      { plan: "Annual leak check", cadence: "Every 12 months", last: dateOffset(-60), next: dateOffset(305), autoGenerate: true },
      { plan: "Gauge calibration", cadence: "Every 12 months", last: dateOffset(-345), next: dateOffset(20), autoGenerate: true },
      { plan: "Pump inspection", cadence: "Every 6 months", last: dateOffset(-240), next: dateOffset(-58), autoGenerate: false },
    ],
    compliance: [
      { requirement: "Tank tightness test", authority: "State EPA", last: dateOffset(-60), due: dateOffset(305), status: "Current" },
      { requirement: "Secondary containment", authority: "State EPA", last: dateOffset(-400), due: dateOffset(-35), status: "Overdue" },
      { requirement: "Spill kit inspection", authority: "OSHA", last: dateOffset(-60), due: dateOffset(305), status: "Current" },
    ],
    leakChecks: [
      { id: "LC-455", date: dateOffset(-60), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-408", date: dateOffset(-425), technician: "Ravi Menon", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-366", date: dateOffset(-790), technician: "Ben Ortiz", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "Fill-Rite FR4210", serial: "FR4210-0332", installed: dateOffset(-240), warrantyEnds: dateOffset(490), status: "Active" },
      { id: "pr-2", type: "Meter", model: "Fill-Rite 807C", serial: "807C-1914", installed: dateOffset(-1200), warrantyEnds: dateOffset(-470), status: "Expired" },
      { id: "pr-3", type: "Hose", model: "25 ft fuel hose", serial: "HS-8812", installed: dateOffset(-240), warrantyEnds: dateOffset(125), status: "Active" },
    ],
    invoices: [
      { id: "INV-7699", serviceOrder: "SO-4360", issued: dateOffset(-59), due: dateOffset(-29), total: 119.2, status: "Paid" },
      { id: "INV-7480", serviceOrder: "SO-4190", issued: dateOffset(-239), due: dateOffset(-209), total: 281.8, status: "Paid" },
    ],
  },
  [],
  -1200,
);

const CO1210: MdAsset = withEvents(
  {
    id: "CO-1210",
    type: "1,000 gal tank",
    ownership: "Customer owned",
    condition: "Used",
    status: "On site",
    recordStatus: "active",
    customer: "Blue Ridge Fleet",
    site: "Asheville Terminal",
    address: "9 Riverside Dr, Asheville, NC 28801",
    placedOn: dateOffset(-800),
    onRentSince: null,
    rate: null,
    product: "Clear Diesel",
    capacityGal: 1000,
    monitor: { id: "MON-8755", model: "FP Sense 1", linked: true, levelGal: 640, lastPing: at(-1, "22:30") },
    leases: [],
    deliveries: [
      dl("DL-9919", -4, "Clear Diesel", 380, MD_CARRIERS[1]),
      dl("DL-9877", -6, "Clear Diesel", 295, MD_CARRIERS[1]),
      dl("DL-9806", -18, "Clear Diesel", 410, MD_CARRIERS[1]),
    ],
    movements: [],
    journey: [{ location: "Asheville Terminal — Blue Ridge Fleet", from: dateOffset(-800), to: null, lease: null, order: null, note: "Customer's own tank, registered for deliveries" }],
    serviceOrders: [
      { id: "SO-4372", job: "Filter change", technician: "Ana Cruz", scheduled: `${dateOffset(-55)}T09:00:00Z`, amount: 140, stage: "Invoiced", documents: "Attached" },
      { id: "SO-4425", job: "Annual leak check", technician: "Ana Cruz", scheduled: `${dateOffset(16)}T09:00:00Z`, amount: null, stage: "Assigned", documents: "Pending" },
      { id: "SO-4225", job: "Vent replacement", technician: "Ben Ortiz", scheduled: `${dateOffset(-190)}T11:00:00Z`, amount: 120, stage: "Invoiced", documents: "Attached" },
    ],
    agreement: { id: "SA-1172", plan: "Basic", visitsUsed: 1, visitsTotal: 2, renews: dateOffset(95), autoRenew: false },
    maintenance: [
      { plan: "Filter change", cadence: "Every 6 months", last: dateOffset(-55), next: dateOffset(127), autoGenerate: true },
      { plan: "Annual leak check", cadence: "Every 12 months", last: dateOffset(-349), next: dateOffset(16), autoGenerate: true },
      { plan: "Vent inspection", cadence: "Every 12 months", last: dateOffset(-190), next: dateOffset(175), autoGenerate: false },
    ],
    compliance: [
      { requirement: "Tank tightness test", authority: "NC DEQ", last: dateOffset(-349), due: dateOffset(16), status: "Due soon" },
      { requirement: "Spill kit inspection", authority: "OSHA", last: dateOffset(-55), due: dateOffset(310), status: "Current" },
      { requirement: "Secondary containment", authority: "NC DEQ", last: dateOffset(-190), due: dateOffset(175), status: "Current" },
    ],
    leakChecks: [
      { id: "LC-437", date: dateOffset(-349), technician: "Ana Cruz", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-390", date: dateOffset(-714), technician: "Ben Ortiz", method: "Pressure decay", pressure: "5 psi", result: "Pass" },
      { id: "LC-344", date: dateOffset(-1080), technician: "Ben Ortiz", method: "Vacuum", pressure: "4 psi", result: "Pass" },
    ],
    peripherals: [
      { id: "pr-1", type: "Pump", model: "GPI M-180", serial: "GPM180-2271", installed: dateOffset(-800), warrantyEnds: dateOffset(-70), status: "Expired" },
      { id: "pr-2", type: "Filter", model: "Cim-Tek 70063", serial: "CT-70063-41", installed: dateOffset(-55), warrantyEnds: dateOffset(310), status: "Active" },
      { id: "pr-3", type: "Nozzle", model: "OPW 7H", serial: "OPW7H-3108", installed: dateOffset(-190), warrantyEnds: dateOffset(25), status: "Expiring" },
    ],
    invoices: [
      { id: "INV-7695", serviceOrder: "SO-4372", issued: dateOffset(-54), due: dateOffset(-24), total: 151.55, status: "Paid" },
      { id: "INV-7540", serviceOrder: "SO-4225", issued: dateOffset(-189), due: dateOffset(-159), total: 129.9, status: "Paid" },
    ],
  },
  [],
  -800,
);

export const MD_ASSETS: MdAsset[] = [TK2201, TK2208, TT0413, TR7702, TK2214, CO1102, CO1210];
