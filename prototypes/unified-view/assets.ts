import { DATE_FMT, dateKeyOf, startOfDay } from "./data";
import { statusTones } from "./statusKind";

/*
  Assets — the fourth rail destination.

  Fields are the ones specified: Display Name with its Unique ID beneath, ERP ID,
  Hub, LOS, Product Compatibility, Size (total capacity), Tank Monitor (and its
  ID when there is one), Created On, Status.

  NOT DATE-SCOPED. `createdOn` is a record date, not an operational one — scoping
  the list to a single created-on day would show almost nothing — so the toolbar
  omits the date stepper, same as Customers.

  Created-on dates are stored as offsets BACK from today rather than fixed hexes,
  so every record still reads as having been created in the past whenever the
  prototype is run.

  INVENTED, and flagged: every value here. Display names, unique ids, ERP ids,
  hubs, monitor ids and capacities are generated to the shapes given (unique id =
  8 alphanumeric, ERP id = 16 digits, monitor id = 8 alphanumeric), not
  transcribed from the source app.
*/

/** Given vocabulary. */
export type AssetStatus = "Active" | "In Use" | "Inactive" | "Terminated";

/** Status -> StatusChip tone. Lives here, not beside the sheet, so both the
 *  sheet and the table read one mapping and AssetSheet exports components only. */
export const ASSET_STATUS_TONE = statusTones<AssetStatus>({
  /* In the fleet, or out on a job. Both simply true; neither asks anything. */
  Active: "info",
  "In Use": "info",
  Inactive: "neutral",
  /* An end, not a fault. */
  Terminated: "neutral",
});

export const ASSET_STATUSES: AssetStatus[] = [
  "Active",
  "In Use",
  "Inactive",
  "Terminated",
];

/** Wider than the customer list's — assets carry packaged goods too. */
export const ASSET_LOS = [
  "Transport",
  "Tank Wagon",
  "Propane",
  "Packaged Goods",
];

export const PRODUCT_COMPATIBILITY = [
  "Diesel",
  "Flex Fuel",
  "Gas",
  "Fuel Oil",
  "Petrol",
  "Propane",
  "Additives",
  "Lubes",
];

/** US cities, as specified. */
export const HUBS = [
  "Houston, TX",
  "Bakersfield, CA",
  "Tulsa, OK",
  "Toledo, OH",
  "Fargo, ND",
  "Savannah, GA",
];

export interface Asset {
  id: string;
  /** Alphabetical, numerical or alphanumeric — all three shapes appear below. */
  displayName: string;
  /** 8 alphanumeric characters. Rendered under the display name. */
  uniqueId: string;
  /** 16 digits. */
  erpId: string;
  hub: string;
  los: string;
  /** Products this asset can hold. The cell shows the first plus a `+N`. */
  products: string[];
  /** Total quantity capacity, in gallons. */
  capacityGal: number;
  tankMonitor: boolean;
  /** 8 alphanumeric characters. Empty when `tankMonitor` is false. */
  tankMonitorId: string;
  /** Date of record, formatted. */
  createdOn: string;
  createdOnKey: string;
  status: AssetStatus;
  note: string;
}

export type AssetColumnKey =
  | "asset"
  | "erpId"
  | "hub"
  | "los"
  | "products"
  | "capacity"
  | "monitor"
  | "createdOn"
  | "status"
  | "actions";

export interface AssetColumnDef {
  key: AssetColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "left" | "right";
}

export const ASSET_COLUMNS: AssetColumnDef[] = [
  { key: "asset", label: "Asset", width: 190, sortable: true },
  /* EVERY COLUMN SORTS (Pavan, 2026-10-07) — DS rule. */
  { key: "erpId", label: "ERP ID", width: 160, sortable: true },
  { key: "hub", label: "Hub", width: 130, sortable: true },
  { key: "los", label: "LOS", width: 150, sortable: true },
  { key: "products", label: "Product compatibility", width: 170, sortable: true },
  { key: "capacity", label: "Size (gal)", width: 100, sortable: true },
  { key: "monitor", label: "Tank monitor", width: 120, sortable: true },
  { key: "createdOn", label: "Created on", width: 120, sortable: true },
  { key: "status", label: "Status", width: 110, sortable: true },
  { key: "actions", label: "", width: 44 },
];

interface Seed {
  displayName: string;
  uniqueId: string;
  erpId: string;
  hub: string;
  los: string;
  products: string[];
  capacityGal: number;
  tankMonitor: boolean;
  tankMonitorId: string;
  /** Days back from today that this record was created. */
  createdDaysAgo: number;
  status: AssetStatus;
}

const SEED: Seed[] = [
  {
    displayName: "Northgate Tank 4",
    uniqueId: "AX7K2M91",
    erpId: "4182230000114772",
    hub: "Houston, TX",
    los: "Tank Wagon",
    products: ["Diesel", "Flex Fuel", "Gas"],
    capacityGal: 10000,
    tankMonitor: true,
    tankMonitorId: "TM4K9P2Q",
    createdDaysAgo: 412,
    status: "In Use",
  },
  {
    displayName: "88412",
    uniqueId: "B3QW8XZ0",
    erpId: "5051120000238104",
    hub: "Bakersfield, CA",
    los: "Transport",
    products: ["Petrol", "Diesel"],
    capacityGal: 6500,
    tankMonitor: false,
    tankMonitorId: "",
    createdDaysAgo: 233,
    status: "Active",
  },
  {
    displayName: "Skyline Propane B",
    uniqueId: "C9RT4LM2",
    erpId: "3319040000771205",
    hub: "Tulsa, OK",
    los: "Propane",
    products: ["Propane"],
    capacityGal: 2500,
    tankMonitor: true,
    tankMonitorId: "TM7X1D4B",
    createdDaysAgo: 688,
    status: "Active",
  },
  {
    displayName: "PG-Crate-221",
    uniqueId: "D2YU6NK8",
    erpId: "2277400000903318",
    hub: "Toledo, OH",
    los: "Packaged Goods",
    products: ["Lubes", "Additives"],
    capacityGal: 400,
    tankMonitor: false,
    tankMonitorId: "",
    createdDaysAgo: 96,
    status: "Active",
  },
  {
    displayName: "Redline Hauler 12",
    uniqueId: "E5VB1PQ7",
    erpId: "6108820000145099",
    hub: "Fargo, ND",
    los: "Transport",
    products: ["Diesel", "Fuel Oil", "Flex Fuel", "Gas"],
    capacityGal: 9000,
    tankMonitor: true,
    tankMonitorId: "TM2C8V6N",
    createdDaysAgo: 1041,
    status: "Inactive",
  },
  {
    displayName: "Bay 7 Bulk",
    uniqueId: "F8ND3JR5",
    erpId: "8840010000462287",
    hub: "Savannah, GA",
    los: "Tank Wagon",
    products: ["Gas", "Petrol", "Additives"],
    capacityGal: 12000,
    tankMonitor: true,
    tankMonitorId: "TM5H0K3W",
    createdDaysAgo: 174,
    status: "In Use",
  },
  {
    displayName: "40219",
    uniqueId: "G1MZ7TF4",
    erpId: "9902330000517640",
    hub: "Houston, TX",
    los: "Propane",
    products: ["Propane", "Additives"],
    capacityGal: 1000,
    tankMonitor: false,
    tankMonitorId: "",
    createdDaysAgo: 1520,
    status: "Terminated",
  },
  {
    displayName: "Cedar Yard Lube Pod",
    uniqueId: "H6PX9WC3",
    erpId: "4182230000660471",
    hub: "Bakersfield, CA",
    los: "Packaged Goods",
    products: ["Lubes"],
    capacityGal: 500,
    tankMonitor: false,
    tankMonitorId: "",
    createdDaysAgo: 58,
    status: "Active",
  },
];

/**
 * 250 rows — ten pages at the default 25 per page.
 *
 * The count is deliberate: with only two pages `paginationRange` returns
 * [1, 2] and the DS pagination never shows its windowed form, so the ellipsis
 * and the jump-to-page popover behind it (Figma 27728:13260) could not be seen
 * at all. Ten pages exercises the whole control.
 */
const TOTAL = 250;

/**
 * Deterministic PRNG (mulberry32), fixed seed.
 *
 * NOT Math.random(). The rows have to be identical on every render, HMR update
 * and StrictMode double-invoke — a list that reshuffles itself when you page
 * through it reads as a bug, and no screenshot would ever match twice.
 */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Name pools, covering all three shapes: alphabetical, numeric, alphanumeric. */
const NAME_FIRST = [
  "Northgate", "Skyline", "Redline", "Cedar Yard", "Bay", "Harbor", "Ridgeline",
  "Junction", "Lakeside", "Ironwood", "Prairie", "Summit", "Foxglove", "Kestrel",
];
const NAME_LAST = [
  "Tank", "Bulk", "Hauler", "Pod", "Skid", "Trailer", "Depot Tank", "Cradle",
];
const CODE_PREFIX = ["PG-Crate", "TW-Unit", "PR-Cyl", "TR-Barrel", "LB-Tote"];

export const ASSETS: Asset[] = (() => {
  const today = startOfDay(new Date());
  const rand = rng(20260825);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const alnum = (n: number) =>
    Array.from({ length: n }, () => ALNUM[Math.floor(rand() * ALNUM.length)]).join("");

  const usedIds = new Set<string>();
  const uniqueAlnum = () => {
    let v = alnum(8);
    while (usedIds.has(v)) v = alnum(8);
    usedIds.add(v);
    return v;
  };

  const rows: Asset[] = [];

  // The eight curated seeds keep their exact values, so the recognisable rows
  // stay put and the shapes above are anchored to real examples.
  SEED.forEach((seed, i) => {
    const { createdDaysAgo, ...rest } = seed;
    const created = new Date(today);
    created.setDate(created.getDate() - createdDaysAgo);
    usedIds.add(seed.uniqueId);
    rows.push({
      ...rest,
      id: `as-${i + 1}`,
      createdOn: DATE_FMT.format(created),
      createdOnKey: dateKeyOf(created),
      note: "",
    });
  });

  // The rest are generated to the same shapes.
  for (let i = SEED.length; i < TOTAL; i++) {
    const shape = rand();
    const displayName =
      shape < 0.6
        ? `${pick(NAME_FIRST)} ${pick(NAME_LAST)} ${int(1, 48)}`   // alphabetical
        : shape < 0.8
          ? String(int(10000, 99999))                              // numeric
          : `${pick(CODE_PREFIX)}-${int(100, 999)}`;               // alphanumeric

    const monitored = rand() < 0.55;
    const products = (() => {
      const n = int(1, 4);
      const pool = [...PRODUCT_COMPATIBILITY];
      const out: string[] = [];
      for (let k = 0; k < n && pool.length; k++) {
        out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      }
      return out;
    })();

    const created = new Date(today);
    created.setDate(created.getDate() - int(20, 1800));

    rows.push({
      id: `as-${i + 1}`,
      displayName,
      uniqueId: uniqueAlnum(),
      erpId: String(int(1000, 9999)) + String(int(100000000000, 999999999999)),
      hub: pick(HUBS),
      los: pick(ASSET_LOS),
      products,
      capacityGal: pick([250, 400, 500, 1000, 2000, 2500, 4000, 6500, 9000, 10000, 12000]),
      tankMonitor: monitored,
      tankMonitorId: monitored ? `TM${alnum(6)}` : "",
      createdOn: DATE_FMT.format(created),
      createdOnKey: dateKeyOf(created),
      status: pick<AssetStatus>([
        "Active", "Active", "Active", "In Use", "In Use", "Inactive", "Terminated",
      ]),
      note: "",
    });
  }

  return rows;
})();

/* ---- sorting / searching ---- */

export type AssetSortDir = "asc" | "desc";
export interface AssetTableSortState {
  key: AssetColumnKey;
  dir: AssetSortDir;
}

function sortValue(a: Asset, key: AssetColumnKey): string | number {
  switch (key) {
    case "asset":
      return a.displayName.toLowerCase();
    case "erpId":
      return a.erpId;
    case "hub":
      return a.hub.toLowerCase();
    case "los":
      return a.los.toLowerCase();
    case "products":
      return a.products.length;
    case "capacity":
      return a.capacityGal;
    case "monitor":
      return a.tankMonitor ? 1 : 0;
    case "createdOn":
      return a.createdOnKey;
    case "status":
      return a.status;
    default:
      return "";
  }
}

export function sortAssets(
  rows: Asset[],
  sort: AssetTableSortState | null
): Asset[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

export function matchesAsset(a: Asset, q: string): boolean {
  return [
    a.displayName,
    a.uniqueId,
    a.erpId,
    a.hub,
    a.los,
    a.products.join(" "),
    a.tankMonitor ? `yes ${a.tankMonitorId}` : "no",
    a.createdOn,
    a.status,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const ASSET_SEARCH_FIELDS = [
  {
    key: "asset",
    label: "Asset",
    text: (a: Asset) => `${a.displayName} ${a.uniqueId}`,
  },
  { key: "erpId", label: "ERP ID", text: (a: Asset) => a.erpId },
  { key: "hub", label: "Hub", text: (a: Asset) => a.hub },
  { key: "los", label: "LOS", text: (a: Asset) => a.los },
  {
    key: "products",
    label: "Product compatibility",
    text: (a: Asset) => a.products.join(" "),
  },
  {
    key: "monitor",
    label: "Tank monitor",
    text: (a: Asset) => (a.tankMonitor ? `Yes ${a.tankMonitorId}` : "No"),
  },
  { key: "createdOn", label: "Created on", text: (a: Asset) => a.createdOn },
  { key: "status", label: "Status", text: (a: Asset) => a.status },
];

export function matchesAssetIn(a: Asset, q: string, scope: string): boolean {
  if (!q) return true;
  const f = ASSET_SEARCH_FIELDS.find((x) => x.key === scope);
  return f ? f.text(a).toLowerCase().includes(q) : true;
}
