/*
  3PL vendors (delivery partners) — the carriers a broker dispatches to.

  PROVENANCE. The vendor ATTRIBUTES are the ones the source spec names as the
  filters on the vendor picker: Business Lines, Safety Score Range, Distance
  Range (`3PL - 102` §5 "Table View"), plus the per-vendor Email Status toggle
  from §6 "Vendors Page". The VALUES — company names, scores, distances — are
  invented; no vendor list was captured. Nothing here is presented as real.

  There is no Vendors SCREEN in this pass. This file exists because the order
  sheet's Delivery Partner section cannot offer partners without a list to offer,
  and inventing them inline would have buried the invention inside a component.
*/

/** The service lines a vendor runs. Filter facet on the picker. */
export const BUSINESS_LINES = [
  "Bulk Fuel",
  "Packaged Lubes",
  "DEF",
  "Asset Movement",
  "Emergency Response",
] as const;

export type BusinessLine = (typeof BUSINESS_LINES)[number];

export interface Vendor {
  id: string;
  name: string;
  /** City, ST — where the vendor is based. */
  base: string;
  businessLines: BusinessLine[];
  /** 0–100. The spec filters on a range, so it is a number, not a grade. */
  safetyScore: number;
  /** Miles from the ship-to. Derived per order in the real app; fixed here. */
  distanceMi: number;
  /** §6: emails can be disabled per vendor, individually or in bulk. */
  emailsEnabled: boolean;
  /** Has an account on the vendor app. Optional per the vendor flow — a vendor
   *  can acknowledge from the emailed public link with no login at all. */
  hasAccount: boolean;
  /* ── ELIGIBILITY. A vendor is offered for an order only if all of these hold.
     They are separate fields rather than one `eligible` flag because the picker
     has to say WHICH rule stopped a vendor: "not offered" is the answer people
     escalate, "compliance expired on 12 Aug" is the answer they act on. ──── */
  /** Deactivated vendors keep their history and take no new work. */
  active: boolean;
  /** States the vendor will run into. An order ships to exactly one. */
  serviceStates: string[];
  /** Insurance and authority, as `YYYY-MM-DD`. Past this, no new assignments. */
  complianceValidTo: string;
}

export const VENDORS: Vendor[] = [
  {
    id: "vd-1",
    name: "Redline Carriers",
    base: "Fresno, CA",
    businessLines: ["Bulk Fuel", "DEF"],
    safetyScore: 94,
    distanceMi: 12,
    emailsEnabled: true,
    hasAccount: true,
    active: true,
    serviceStates: ["California", "Arizona"],
    complianceValidTo: "2027-01-15",
  },
  {
    id: "vd-2",
    name: "Sierra Bulk Transport",
    base: "Bakersfield, CA",
    businessLines: ["Bulk Fuel", "Emergency Response"],
    safetyScore: 88,
    distanceMi: 24,
    emailsEnabled: true,
    hasAccount: true,
    active: false,
    serviceStates: ["California"],
    complianceValidTo: "2026-11-30",
  },
  {
    id: "vd-3",
    name: "Delta Fuel Logistics",
    base: "Stockton, CA",
    businessLines: ["Bulk Fuel", "Packaged Lubes"],
    safetyScore: 91,
    distanceMi: 31,
    emailsEnabled: true,
    hasAccount: false,
    active: true,
    serviceStates: ["California"],
    complianceValidTo: "2026-06-30",
  },
  {
    id: "vd-4",
    name: "Kern Valley Hauling",
    base: "Delano, CA",
    businessLines: ["Bulk Fuel", "Asset Movement"],
    safetyScore: 76,
    distanceMi: 41,
    emailsEnabled: false,
    hasAccount: true,
    active: true,
    serviceStates: ["California", "Oregon", "Nevada"],
    complianceValidTo: "2027-09-01",
  },
  {
    id: "vd-5",
    name: "Pacific Tank Movers",
    base: "Modesto, CA",
    businessLines: ["Asset Movement"],
    safetyScore: 82,
    distanceMi: 55,
    emailsEnabled: true,
    hasAccount: true,
    active: true,
    serviceStates: ["California", "Texas"],
    complianceValidTo: "2027-03-20",
  },
  {
    id: "vd-6",
    name: "Golden State Petro",
    base: "Sacramento, CA",
    businessLines: ["Bulk Fuel", "DEF", "Packaged Lubes"],
    safetyScore: 97,
    distanceMi: 68,
    emailsEnabled: true,
    hasAccount: true,
    active: true,
    serviceStates: ["California"],
    complianceValidTo: "2027-07-11",
  },
  {
    id: "vd-7",
    name: "Foothill Fuel Service",
    base: "Visalia, CA",
    businessLines: ["Bulk Fuel"],
    safetyScore: 69,
    distanceMi: 19,
    emailsEnabled: true,
    hasAccount: false,
    active: true,
    serviceStates: ["California", "Oregon"],
    complianceValidTo: "2027-02-28",
  },
  {
    id: "vd-8",
    name: "Central Coast Energy",
    base: "Salinas, CA",
    businessLines: ["Bulk Fuel", "Emergency Response"],
    safetyScore: 85,
    distanceMi: 77,
    emailsEnabled: true,
    hasAccount: true,
    active: true,
    serviceStates: ["California"],
    complianceValidTo: "2027-05-22",
  },
];

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
 * geography and capability are facts about the vendor.
 */
export function vendorBlockedReason(
  v: Vendor,
  order: { businessLine: BusinessLine; state: string; on: Date }
): string | null {
  if (!v.active) return "Deactivated";
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
  return null;
}

/* ────────────────────────────────────────────────────────────── list view ──
   What the Vendors screen needs on top of the records themselves.

   NOTHING HERE SUMS. A vendor has a safety score and a distance, and both are
   properties of one vendor rather than quantities that add up — an average
   safety score across a group would be a different statistic wearing the same
   place as a total, and a summed distance is meaningless. So the list passes no
   `measureOf`, and its group headers carry a count alone. */

export type VendorColumnKey =
  | "name"
  | "lines"
  | "safety"
  | "distance"
  | "emails"
  | "account"
  | "actions";

export interface VendorColumnDef {
  key: VendorColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "right";
}

export const VENDOR_COLUMNS: VendorColumnDef[] = [
  { key: "name", label: "Vendor", width: 280, sortable: true },
  { key: "lines", label: "Business Lines", width: 250 },
  { key: "safety", label: "Safety Score", width: 160, sortable: true, align: "right" },
  { key: "distance", label: "Distance", width: 140, sortable: true, align: "right" },
  { key: "emails", label: "Emails", width: 140, sortable: true },
  { key: "account", label: "Vendor App", width: 172, sortable: true },
  { key: "actions", label: "", width: 44 },
];

export const VENDOR_SEARCH_FIELDS = [
  { key: "name", label: "Vendor", text: (v: Vendor) => `${v.name} ${v.base}` },
  { key: "lines", label: "Business Lines", text: (v: Vendor) => v.businessLines.join(" ") },
  { key: "base", label: "Base", text: (v: Vendor) => v.base },
];

/** Free-text across everything a vendor is findable by. */
export function matchesVendor(v: Vendor, q: string): boolean {
  return `${v.name} ${v.base} ${v.businessLines.join(" ")}`.toLowerCase().includes(q);
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
      case "name":
        return v.name;
      case "safety":
        return v.safetyScore;
      case "distance":
        return v.distanceMi;
      case "emails":
        return v.emailsEnabled ? 1 : 0;
      case "account":
        return v.hasAccount ? 1 : 0;
      default:
        return v.name;
    }
  };
  return [...rows].sort((a, b) => {
    const x = of(a);
    const y = of(b);
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}

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
