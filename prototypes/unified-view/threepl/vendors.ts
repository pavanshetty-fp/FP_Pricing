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
  },
];

export const vendorById = (id: string | null) =>
  id ? (VENDORS.find((v) => v.id === id) ?? null) : null;

export const vendorName = (id: string | null) => vendorById(id)?.name ?? "—";
