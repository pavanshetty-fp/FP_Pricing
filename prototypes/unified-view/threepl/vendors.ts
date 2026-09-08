/*
  3PL vendors — the carriers a broker dispatches to.

  PROVENANCE. The vendor ATTRIBUTES the ORDER FLOW uses are the ones the source
  spec names as filters on the vendor picker: Business Lines, Safety Score
  Range, Distance Range (`3PL - 102` §5 "Table View"), plus the per-vendor Email
  Status toggle from §6 "Vendors Page". Everything past that is what a vendor
  RECORD needs to exist as a record — dispatch contacts, coverage, rate card,
  compliance documents, accounting details. The VALUES are invented; no vendor
  list was ever captured. Nothing here is presented as real.

  ELIGIBILITY IS THE POINT OF THIS FILE. Everything else on a vendor is
  reference; the coverage, capability, compliance and availability fields exist
  so that `vendorBlockedReason` can answer, in one sentence somebody can act on,
  why this carrier is not on the picker for this order.
*/
import {
  PLACES,
  STAFF,
  STATE_NAMES,
  VENDOR_TAGS,
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
} from "./directoryCore";

/** The service lines a vendor runs. Filter facet on the picker. */
export const BUSINESS_LINES = [
  "Bulk Fuel",
  "Packaged Lubes",
  "DEF",
  "Asset Movement",
  "Emergency Response",
] as const;

export type BusinessLine = (typeof BUSINESS_LINES)[number];

export const VENDOR_TYPES = [
  "Carrier", "Jobber", "Owner-Operator", "Terminal", "Service Contractor",
] as const;

export const SERVICE_AREA_TYPES = ["zip", "radius", "state", "custom"] as const;
export type ServiceAreaType = (typeof SERVICE_AREA_TYPES)[number];

export const COMPLIANCE_STATUSES = ["Valid", "Expiring", "Expired", "Missing"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const AVAILABILITY_STATUSES = ["Available", "Limited", "Unavailable"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** One tier of a vendor's rate card. What a quote is checked against. */
export interface RateCardLine {
  id: string;
  label: string;
  /** Dollars per gallon, or a flat fee where `unit` says so. */
  rate: number;
  unit: "per gal" | "flat" | "per mile" | "per hour";
  /** Only over this many gallons. Null for the base tier. */
  minGallons: number | null;
  fuelSurcharge: number | null;
}

export interface Vendor {
  id: string;
  name: string;
  erpVendorId: string | null;
  legalBusinessName: string | null;
  dbaName: string | null;
  taxId: string | null;
  status: RecordStatus;
  vendorType: string;

  /* ── people ── */
  mainContactName: string | null;
  dispatchContactName: string | null;
  accountingContactName: string | null;
  escalationContactName: string | null;
  phone: string | null;
  dispatchPhone: string | null;
  email: string | null;
  dispatchEmail: string | null;
  accountingEmail: string | null;
  contacts: DirectoryContact[];

  /* ── where they are ── */
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  /** `City, ST` — kept because the order sheet prints it inline. */
  base: string;

  /* ── where they go ── */
  serviceAreaType: ServiceAreaType;
  /** Full state names. An order ships to exactly one. */
  serviceStates: string[];
  coveredCities: string[];
  coveredZips: string[];
  maxRadiusMiles: number | null;

  /* ── what they can do ── */
  businessLines: BusinessLine[];
  supportedProductIds: string[];
  supportedOrderTypes: string[];
  topOffCapable: boolean;
  assetHandlingCapable: boolean;
  afterHoursCapable: boolean;

  /* ── whether they may ── */
  complianceStatus: ComplianceStatus;
  /** Insurance and authority, as `YYYY-MM-DD`. Past this, no new assignments. */
  complianceValidTo: string;
  insuranceExpiry: string | null;
  licenseNumbers: string[];
  documents: Attachment[];
  /** A human decision, separate from whether the paperwork is current. */
  approvedForAssignment: boolean;
  /** Deactivated vendors keep their history and take no new work. */
  active: boolean;

  /* ── money ── */
  defaultRateCardId: string | null;
  rateCard: RateCardLine[];
  minimumCharge: number | null;
  paymentTerms: string;
  accountingVendorId: string | null;

  /* ── when ── */
  availabilityStatus: AvailabilityStatus;
  blackoutDates: string[];
  assignmentPriority: number;
  preferredCustomerIds: string[];

  /* ── operational reference ── */
  /** 0–100. The spec filters on a range, so it is a number, not a grade. */
  safetyScore: number;
  /** Miles from the ship-to. Derived per order in the real app; fixed here. */
  distanceMi: number;
  /** §6: emails can be disabled per vendor, individually or in bulk. */
  emailsEnabled: boolean;
  /** Has an account on the vendor app. Optional per the vendor flow — a vendor
   *  can acknowledge from the emailed public link with no login at all. */
  hasAccount: boolean;
  vendorInstruction: string | null;

  /* ── record ── */
  tags: string[];
  notes: string | null;
  attachments: Attachment[];
  audit: AuditEvent[];
  createdAt: string;
  updatedAt: string;
}

/* The eight the order flow points at, with the facts that are load-bearing
   there — Sierra is deactivated, Delta's compliance lapses in June. */
interface VendorSeed {
  name: string;
  base: string;
  businessLines: BusinessLine[];
  safetyScore: number;
  distanceMi: number;
  emailsEnabled: boolean;
  hasAccount: boolean;
  active: boolean;
  serviceStates: string[];
  complianceValidTo: string;
}

const CORE_VENDORS: VendorSeed[] = [
  { name: "Redline Carriers", base: "Fresno, CA", businessLines: ["Bulk Fuel", "DEF"], safetyScore: 94, distanceMi: 12, emailsEnabled: true, hasAccount: true, active: true, serviceStates: ["California", "Arizona"], complianceValidTo: "2027-01-15" },
  { name: "Sierra Bulk Transport", base: "Bakersfield, CA", businessLines: ["Bulk Fuel", "Emergency Response"], safetyScore: 88, distanceMi: 24, emailsEnabled: true, hasAccount: true, active: false, serviceStates: ["California"], complianceValidTo: "2026-11-30" },
  { name: "Delta Fuel Logistics", base: "Stockton, CA", businessLines: ["Bulk Fuel", "Packaged Lubes"], safetyScore: 91, distanceMi: 31, emailsEnabled: true, hasAccount: false, active: true, serviceStates: ["California"], complianceValidTo: "2026-06-30" },
  { name: "Kern Valley Hauling", base: "Delano, CA", businessLines: ["Bulk Fuel", "Asset Movement"], safetyScore: 76, distanceMi: 41, emailsEnabled: false, hasAccount: true, active: true, serviceStates: ["California", "Oregon", "Nevada"], complianceValidTo: "2027-09-01" },
  { name: "Pacific Tank Movers", base: "Modesto, CA", businessLines: ["Asset Movement"], safetyScore: 82, distanceMi: 55, emailsEnabled: true, hasAccount: true, active: true, serviceStates: ["California", "Texas"], complianceValidTo: "2027-03-20" },
  { name: "Golden State Petro", base: "Sacramento, CA", businessLines: ["Bulk Fuel", "DEF", "Packaged Lubes"], safetyScore: 97, distanceMi: 68, emailsEnabled: true, hasAccount: true, active: true, serviceStates: ["California"], complianceValidTo: "2027-07-11" },
  { name: "Foothill Fuel Service", base: "Visalia, CA", businessLines: ["Bulk Fuel"], safetyScore: 69, distanceMi: 19, emailsEnabled: true, hasAccount: false, active: true, serviceStates: ["California", "Oregon"], complianceValidTo: "2027-02-28" },
  { name: "Central Coast Energy", base: "Salinas, CA", businessLines: ["Bulk Fuel", "Emergency Response"], safetyScore: 85, distanceMi: 77, emailsEnabled: true, hasAccount: true, active: true, serviceStates: ["California"], complianceValidTo: "2027-05-22" },
];

const VENDOR_HEADS = [
  "Redline", "Sierra", "Delta", "Kern Valley", "Pacific", "Golden State",
  "Foothill", "Central Coast", "Ironwood", "Blue Mesa", "Cascade", "Rimrock",
  "Saguaro", "High Desert", "Copper Ridge", "Frontier", "Trailhead", "Stonegate",
  "Windward", "Silverline", "Cornerstone", "Basin", "Overland", "Ridgeline",
  "Northstar", "Sunfield", "Talon", "Junction", "Cypress", "Beacon",
] as const;

const VENDOR_TAILS = [
  "Carriers", "Bulk Transport", "Fuel Logistics", "Hauling", "Tank Movers",
  "Petro", "Fuel Service", "Energy", "Transport", "Distribution", "Tanklines",
  "Freight", "Petroleum", "Fuels", "Dispatch",
] as const;

const VENDOR_INSTRUCTIONS = [
  "Send the BOL within 2 hours of delivery or the invoice is held.",
  "Dispatch answers the shared line, not the mobile, before 6am.",
  "Confirm every load by email — they do not use the portal.",
  "Ask for the same driver on the university sites; he is badged.",
  "Quote includes the fuel surcharge. Do not add it twice.",
] as const;

function makeVendor(spec: VendorSeed & { seed: number; id: string; index: number }): Vendor {
  const r = rng(spec.seed);
  const [city, st] = spec.base.split(", ");
  const place = PLACES.find((p) => p.city === city) ?? pickFrom(r, PLACES);
  const domain = domainFor(spec.name);
  const dispatchName = personName(r);
  const mainName = personName(r);
  const accountingName = personName(r);

  const daysToCompliance = Math.round(
    (new Date(`${spec.complianceValidTo}T00:00:00Z`).getTime() - TODAY.getTime()) / 86_400_000
  );
  /* COMPLIANCE STATUS IS DERIVED, never stored independently. A vendor whose
     certificate expired last month and whose status still says Valid is the
     exact failure this directory exists to prevent. */
  const complianceStatus: ComplianceStatus =
    daysToCompliance < 0 ? "Expired" : daysToCompliance < 60 ? "Expiring" : "Valid";

  const tiers: RateCardLine[] = [
    { id: `${spec.id}-rc-1`, label: "Base haul", rate: Number((0.18 + r() * 0.22).toFixed(3)), unit: "per gal", minGallons: null, fuelSurcharge: Number((0.02 + r() * 0.05).toFixed(3)) },
    { id: `${spec.id}-rc-2`, label: "Volume 2,500 gal+", rate: Number((0.12 + r() * 0.14).toFixed(3)), unit: "per gal", minGallons: 2500, fuelSurcharge: Number((0.02 + r() * 0.04).toFixed(3)) },
  ];
  if (spec.businessLines.includes("Asset Movement")) {
    tiers.push({ id: `${spec.id}-rc-3`, label: "Asset move", rate: intBetween(r, 180, 480), unit: "flat", minGallons: null, fuelSurcharge: null });
  }
  if (spec.businessLines.includes("Emergency Response")) {
    tiers.push({ id: `${spec.id}-rc-4`, label: "After-hours callout", rate: intBetween(r, 110, 260), unit: "per hour", minGallons: null, fuelSurcharge: null });
  }

  const contactRows: DirectoryContact[] = [
    { id: `${spec.id}-ct-1`, name: dispatchName, role: "Dispatch", phone: phoneNumber(r), email: emailFor(dispatchName, domain), isPrimary: true, notes: maybe(r, 0.25, "Best reached on the dispatch line before 5am.") },
    { id: `${spec.id}-ct-2`, name: mainName, role: "Account Manager", phone: maybe(r, 0.8, phoneNumber(r)), email: maybe(r, 0.85, emailFor(mainName, domain)), isPrimary: false, notes: null },
    { id: `${spec.id}-ct-3`, name: accountingName, role: "Accounts Receivable", phone: maybe(r, 0.5, phoneNumber(r)), email: maybe(r, 0.9, `ar@${domain}`), isPrimary: false, notes: null },
  ].slice(0, intBetween(r, 1, 3));

  const createdAt = new Date(shiftDays(TODAY, -intBetween(r, 120, 1700)).setUTCHours(11)).toISOString();
  const updatedAt = new Date(shiftDays(TODAY, -intBetween(r, 0, 70)).setUTCHours(16)).toISOString();

  const v: Vendor = {
    id: spec.id,
    name: spec.name,
    erpVendorId: maybe(r, 0.8, `VEND-${3000 + spec.index}`),
    legalBusinessName: maybe(r, 0.7, `${spec.name} LLC`),
    dbaName: maybe(r, 0.25, spec.name.split(" ")[0]),
    taxId: maybe(r, 0.6, `${intBetween(r, 10, 99)}-${intBetween(r, 1000000, 9999999)}`),
    status: spec.active ? "active" : "inactive",
    vendorType: pickFrom(r, VENDOR_TYPES),

    mainContactName: mainName,
    dispatchContactName: dispatchName,
    accountingContactName: maybe(r, 0.7, accountingName),
    escalationContactName: maybe(r, 0.4, personName(r)),
    phone: phoneNumber(r),
    dispatchPhone: phoneNumber(r),
    email: maybe(r, 0.85, `info@${domain}`),
    dispatchEmail: `dispatch@${domain}`,
    accountingEmail: maybe(r, 0.75, `ap@${domain}`),
    contacts: contactRows,

    addressLine1: streetAddress(r),
    addressLine2: maybe(r, 0.15, `Dock ${intBetween(r, 1, 24)}`),
    city,
    state: st,
    zip: place.zip,
    country: "USA",
    base: spec.base,

    serviceAreaType: pickFrom(r, SERVICE_AREA_TYPES),
    serviceStates: spec.serviceStates,
    coveredCities: someOf(r, PLACES.filter((p) => spec.serviceStates.includes(STATE_NAMES[p.state] ?? "")).map((p) => p.city), 5),
    coveredZips: r() < 0.3 ? someOf(r, PLACES.map((p) => p.zip), 4) : [],
    maxRadiusMiles: maybe(r, 0.5, intBetween(r, 3, 30) * 25),

    businessLines: spec.businessLines,
    supportedProductIds: [],
    supportedOrderTypes: someOf(r, ["Delivery", "Core", "Emergency", "Transport", "Asset Movement", "Pump Out"] as const, 4),
    topOffCapable: r() < 0.62,
    assetHandlingCapable: spec.businessLines.includes("Asset Movement") || r() < 0.2,
    afterHoursCapable: spec.businessLines.includes("Emergency Response") || r() < 0.35,

    complianceStatus,
    complianceValidTo: spec.complianceValidTo,
    insuranceExpiry: maybe(r, 0.9, spec.complianceValidTo),
    licenseNumbers: someOf(r, [`MC-${intBetween(r, 100000, 999999)}`, `DOT-${intBetween(r, 1000000, 3999999)}`, `HM-${intBetween(r, 10000, 99999)}`], 2),
    documents: seedAttachments(r, [
      "Certificate of Insurance.pdf", "W-9.pdf", "Operating Authority.pdf",
      "Hazmat Endorsement.pdf", "Signed Carrier Agreement.pdf", "Safety Rating Letter.pdf",
    ], 4),
    approvedForAssignment: spec.active && r() < 0.88,
    active: spec.active,

    defaultRateCardId: tiers[0]?.id ?? null,
    rateCard: tiers,
    minimumCharge: maybe(r, 0.65, intBetween(r, 3, 20) * 25),
    paymentTerms: pickFrom(r, ["Net 15", "Net 30", "Net 45", "Quick pay 2/10"] as const),
    accountingVendorId: maybe(r, 0.7, `NS-V-${intBetween(r, 1000, 9999)}`),

    availabilityStatus: spec.active
      ? pickFrom(r, ["Available", "Available", "Available", "Limited", "Unavailable"] as const)
      : "Unavailable",
    /* Blackouts are the reason an eligible vendor is still not offered on a
       given date, so a slice of the list has to actually have some. */
    blackoutDates: r() < 0.28
      ? Array.from({ length: intBetween(r, 1, 4) }, () => dateOffset(intBetween(r, -10, 120)))
      : [],
    assignmentPriority: intBetween(r, 1, 5),
    preferredCustomerIds: [],

    safetyScore: spec.safetyScore,
    distanceMi: spec.distanceMi,
    emailsEnabled: spec.emailsEnabled,
    hasAccount: spec.hasAccount,
    vendorInstruction: maybe(r, 0.45, pickFrom(r, VENDOR_INSTRUCTIONS)),

    tags: r() < 0.65 ? someOf(r, VENDOR_TAGS, 3) : [],
    notes: maybe(r, 0.3, "Reliable on short notice. Rates reviewed each January."),
    attachments: seedAttachments(r, ["Rate Card 2026.xlsx", "Coverage Map.png", "Meeting Notes.pdf"], 2),
    audit: [],
    createdAt,
    updatedAt,
  };

  v.audit = seedAudit(r, {
    createdAt,
    updatedAt,
    noun: "Vendor",
    fields: [
      "Compliance status", "Insurance expiry", "Rate card", "Service states",
      "Dispatch email", "Assignment approval", "Availability", "Business lines",
    ],
  });
  return v;
}

function buildVendors(): Vendor[] {
  const out: Vendor[] = CORE_VENDORS.map((v, i) =>
    makeVendor({ ...v, seed: 11_000 + i, id: `vd-${i + 1}`, index: i })
  );

  let i = 0;
  while (out.length < 80) {
    const r = rng(12_000 + i);
    const name = `${pickFrom(r, VENDOR_HEADS)} ${pickFrom(r, VENDOR_TAILS)}`;
    if (!out.some((v) => v.name === name)) {
      const place = pickFrom(r, PLACES);
      const states = someOf(
        r,
        Object.values(STATE_NAMES),
        3
      );
      /* The vendor's own state is always covered — a carrier that does not
         serve the state it is based in is a data bug, not a business case. */
      const home = STATE_NAMES[place.state];
      if (home && !states.includes(home)) states.unshift(home);

      out.push(
        makeVendor({
          seed: 12_000 + i,
          id: `vd-${out.length + 1}`,
          index: out.length,
          name,
          base: `${place.city}, ${place.state}`,
          businessLines: someOf(r, BUSINESS_LINES, 3),
          safetyScore: intBetween(r, 58, 99),
          distanceMi: intBetween(r, 4, 180),
          emailsEnabled: r() < 0.85,
          hasAccount: r() < 0.6,
          active: r() < 0.88,
          serviceStates: states,
          /* A quarter of the list is out of date on purpose: "has overdue
             docs" is a filter, and a filter with no matches is untestable. */
          complianceValidTo: dateOffset(r() < 0.25 ? -intBetween(r, 5, 400) : intBetween(r, 20, 900)),
        })
      );
    }
    i += 1;
    if (i > 600) break;
  }
  return out;
}

export const VENDORS: Vendor[] = buildVendors();

export const vendorById = (id: string | null) =>
  id ? (VENDORS.find((v) => v.id === id) ?? null) : null;

export const vendorName = (id: string | null) => vendorById(id)?.name ?? "—";

/**
 * WHY A VENDOR CANNOT TAKE THIS ORDER — the reason, or null when it can.
 *
 * A REASON, NOT A BOOLEAN. "Not offered" is the answer people escalate;
 * "compliance expired 30 Jun 2026" is the answer they act on, and it is the
 * same sentence whether it is read by the person picking or by the person they
 * ring afterwards. The rules are checked in the order they can be fixed in:
 * a deactivated vendor is somebody's decision, an expired document is a task,
 * geography and capability are facts about the vendor, and a blackout is a
 * fact about the DAY rather than about the vendor at all.
 */
export function vendorBlockedReason(
  v: Vendor,
  order: { businessLine: BusinessLine; state: string; on: Date }
): string | null {
  if (!v.active) return "Deactivated";
  if (!v.approvedForAssignment) return "Not approved for assignment";
  const [y, m, d] = v.complianceValidTo.split("-").map(Number);
  if (new Date(y, m - 1, d) < order.on) {
    return `Compliance expired ${v.complianceValidTo}`;
  }
  if (!v.businessLines.some((b) => b === order.businessLine)) {
    return `Does not run ${order.businessLine}`;
  }
  if (!v.serviceStates.includes(order.state)) {
    return `Does not serve ${order.state}`;
  }
  if (v.availabilityStatus === "Unavailable") return "Marked unavailable";
  const iso = order.on.toISOString().slice(0, 10);
  if (v.blackoutDates.includes(iso)) return `Blacked out on ${iso}`;
  return null;
}

/** Docs that have lapsed, or lapse inside 60 days — the "overdue docs" filter. */
export const hasOverdueDocs = (v: Vendor): boolean =>
  v.complianceStatus === "Expired" || v.complianceStatus === "Expiring";

/* ────────────────────────────────────────────────────────────── list view ──
   NOTHING HERE SUMS. A vendor has a safety score and a distance, and both are
   properties of one vendor rather than quantities that add up — an average
   safety score across a group would be a different statistic wearing the same
   place as a total, and a summed distance is meaningless. So the list passes no
   `measureOf`, and its group headers carry a count alone. */

export type VendorColumnKey =
  | "name"
  | "dispatch"
  | "lines"
  | "erpId"
  | "address"
  | "serviceArea"
  | "products"
  | "status"
  | "rateCard"
  | "assigned"
  | "instruction"
  | "actions";

export interface VendorColumnDef {
  key: VendorColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "right";
}

/*
  TWELVE COLUMNS, DOWN FROM TWENTY — and the cut is by a rule, not by taste.

  A VENDOR LIST EXISTS TO ANSWER ONE QUESTION: who can take this work. So a
  column earns its place if it feeds that answer. The eligibility inputs are
  active status, compliance, business lines, service area, supported products —
  those stay. Everything else was reference, and reference belongs in the
  record, which is one click away and has room for it.

  WHAT LEFT THE TABLE, and why:
    · Safety Score, Distance  — ranking inputs at ASSIGNMENT time, not
      directory-browsing facts. Distance especially: it is miles from a
      SHIP-TO, and a directory has no ship-to, so the number here is a
      placeholder pretending to be a measurement. Both remain FILTERS — a
      facet does not need a column to work.
    · Emails on/off, Vendor App  — per-vendor comms config. Real, rarely
      looked at, and never the reason somebody opens this list.
    · City, State  — folded into Address, as on Customers.
    · Compliance  — folded under the vendor's name, where the name is.
    · Dispatch Phone + Email  — one column, two lines.
*/
export const VENDOR_COLUMNS: VendorColumnDef[] = [
  { key: "name", label: "Vendor Name", width: 250, sortable: true },
  { key: "dispatch", label: "Dispatch", width: 240 },
  { key: "lines", label: "Business Lines", width: 230 },
  { key: "erpId", label: "Vendor ID", width: 130, sortable: true },
  { key: "address", label: "Address", width: 250, sortable: true },
  { key: "serviceArea", label: "Service Area", width: 200 },
  { key: "products", label: "Supported Products", width: 230 },
  { key: "status", label: "Status", width: 120, sortable: true },
  { key: "rateCard", label: "Default Rate Card", width: 180 },
  { key: "assigned", label: "Assigned Orders", width: 150, sortable: true, align: "right" },
  { key: "instruction", label: "Notes", width: 64 },
  { key: "actions", label: "", width: 44 },
];

export const VENDOR_SEARCH_FIELDS = [
  { key: "name", label: "Vendor", text: (v: Vendor) => `${v.name} ${v.legalBusinessName ?? ""}` },
  { key: "contact", label: "Contact", text: (v: Vendor) => `${v.dispatchContactName ?? ""} ${v.mainContactName ?? ""} ${v.dispatchEmail ?? ""} ${v.dispatchPhone ?? ""}` },
  { key: "city", label: "City", text: (v: Vendor) => v.city ?? "" },
  { key: "state", label: "State", text: (v: Vendor) => `${v.state ?? ""} ${v.serviceStates.join(" ")}` },
  { key: "lines", label: "Business Lines", text: (v: Vendor) => v.businessLines.join(" ") },
];

/** Free-text across everything a vendor is findable by. */
export function matchesVendor(v: Vendor, q: string): boolean {
  return `${v.name} ${v.base} ${v.businessLines.join(" ")} ${v.dispatchContactName ?? ""} ${v.dispatchEmail ?? ""} ${v.serviceStates.join(" ")} ${v.erpVendorId ?? ""}`
    .toLowerCase()
    .includes(q);
}

export function matchesVendorIn(v: Vendor, q: string, scope: string): boolean {
  const f = VENDOR_SEARCH_FIELDS.find((x) => x.key === scope);
  return f ? f.text(v).toLowerCase().includes(q) : true;
}

export interface VendorSortState {
  key: VendorColumnKey;
  dir: "asc" | "desc";
}

export function sortVendors(rows: Vendor[], sort: VendorSortState | null): Vendor[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  const of = (v: Vendor): string | number => {
    switch (sort.key) {
      case "name": return v.name;
      case "erpId": return v.erpVendorId ?? "";
      /* Sorting by address means sorting by PLACE, not by house number — the
         same call the Customers list makes on its merged column. */
      case "address": return `${v.city ?? ""} ${v.state ?? ""}`.trim();
      case "status": return v.active ? 1 : 0;
      case "assigned": return assignedOrderCount(v.id);
      default: return v.name;
    }
  };
  return [...rows].sort((a, b) => {
    const x = of(a);
    const y = of(b);
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}

/**
 * How many live orders this vendor is carrying.
 *
 * Injected rather than imported: `orders.ts` already imports from here for the
 * picker, and reaching back the other way would close a cycle. The Directory
 * screen sets it once on mount from the order list it can see.
 */
let assignedCounts: Record<string, number> = {};
export const setAssignedOrderCounts = (counts: Record<string, number>) => {
  assignedCounts = counts;
};
export const assignedOrderCount = (vendorId: string): number => assignedCounts[vendorId] ?? 0;

/** The state used by the safety filter — a RANGE, per §5.5. */
export const SAFETY_BANDS = ["90–100", "80–89", "70–79", "Below 70"] as const;

export function safetyBand(score: number): string {
  if (score >= 90) return "90–100";
  if (score >= 80) return "80–89";
  if (score >= 70) return "70–79";
  return "Below 70";
}

/** Distance is filtered by range too — the bands a dispatcher actually asks in. */
export const DISTANCE_BANDS = ["Under 25 mi", "25–50 mi", "Over 50 mi"] as const;

export function distanceBand(mi: number): string {
  if (mi < 25) return "Under 25 mi";
  if (mi <= 50) return "25–50 mi";
  return "Over 50 mi";
}

/** Staff who own vendor relationships — used by the detail page's owner line. */
export const VENDOR_OWNERS = STAFF;
