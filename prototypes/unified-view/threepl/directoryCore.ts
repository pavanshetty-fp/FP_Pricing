/*
  Shared vocabulary for the four Directory record types.

  WHY A FOURTH FILE. Customers, vendors, products and assets are different
  records, but they are the same KIND of record: each one is owned by somebody,
  carries files, accrues an edit history, and is either live or archived. Those
  four facts have identical shape everywhere, so they are declared once here.
  What is genuinely per-entity — a credit limit, a rate card, a fill threshold —
  stays in the entity's own file.

  DETERMINISM IS THE POINT. Every generator below is seeded, so the list reads
  the same on every reload and a screenshot taken today still matches the build
  tomorrow. A directory that reshuffles itself is impossible to review.

  REALISTIC MEANS INCOMPLETE. Real operational directories are not uniformly
  filled — a record entered in a hurry has no zip and no secondary phone, and
  the screen has to survive that. The `maybe` helper below is how the seed
  produces holes on purpose rather than by accident, and `NA` / `DASH` are what
  the tables print where a hole shows through.
*/

import { MONEY } from "../data";

/* ─────────────────────────────────────────────────────── missing values ── */

/**
 * Two different absences, and they are NOT the same thing.
 *
 * `N/A` means the field does not apply to this record — a nozzle has no
 * capacity, an unapproved account has no limit. `-` means it applies and
 * nobody has filled it in. Collapsing them into one glyph loses the only
 * question worth asking of a blank cell: is somebody supposed to do something
 * about it?
 */
export const NA = "N/A";
export const DASH = "–";

/** A value the record does not have. Prints `-` and sorts last. */
export const blank = (v: string | null | undefined): string =>
  v === null || v === undefined || v === "" ? DASH : v;

/** A value the record cannot have. Prints `N/A`. */
export const notApplicable = (v: string | null | undefined): string =>
  v === null || v === undefined || v === "" ? NA : v;

/* ──────────────────────────────────────────────────────────────── random ── */

/**
 * Mulberry32. Small, fast, and — the only property that matters here —
 * reproducible from its seed across every machine that runs the prototype.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pickFrom = <T,>(r: () => number, xs: readonly T[]): T =>
  xs[Math.floor(r() * xs.length)] as T;

export const intBetween = (r: () => number, lo: number, hi: number): number =>
  lo + Math.floor(r() * (hi - lo + 1));

/** Some of a list, never none, never all — service states, tags, capabilities. */
export function someOf<T>(r: () => number, xs: readonly T[], max = 3): T[] {
  const n = intBetween(r, 1, Math.min(max, xs.length));
  const pool = [...xs];
  const out: T[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0] as T);
  }
  return out;
}

/**
 * A field that is present `p` of the time and null the rest.
 *
 * Used everywhere a real directory has holes. The probabilities below are not
 * uniform on purpose: a phone number is nearly always there, a tax ID often is
 * not, and a set of coordinates almost never is.
 */
export const maybe = <T,>(r: () => number, p: number, v: T): T | null =>
  r() < p ? v : null;

/* ───────────────────────────────────────────────────────────────── dates ── */

/** `YYYY-MM-DD`, the only date shape any of this data is stored in. */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Today, for a prototype whose seed data is written around a fixed present. */
export const TODAY = new Date("2026-09-07T00:00:00Z");

export function shiftDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const dateOffset = (days: number): string => isoDate(shiftDays(TODAY, days));

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** `Sep 7, 2026`, or `-` for a date the record does not carry. */
export const formatDate = (iso: string | null | undefined): string =>
  iso ? DATE_FMT.format(new Date(`${iso}T00:00:00Z`)) : DASH;

const STAMP_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

/** `Sep 7, 2026, 9:14 AM` — the audit trail's own format. */
export const formatStamp = (iso: string): string => STAMP_FMT.format(new Date(iso));

/** Days from today, negative for the past. Drives "expires in 12 days". */
export function daysFromToday(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(`${iso}T00:00:00Z`).getTime() - TODAY.getTime();
  return Math.round(ms / 86_400_000);
}

/* ────────────────────────────────────────────────────────────── currency ── */

/** Money in a table cell: `-` when absent, never `$0` standing in for unknown. */
export const money = (n: number | null | undefined): string =>
  n === null || n === undefined ? DASH : MONEY(n);

/* ───────────────────────────────────────────────────────── shared shapes ── */

/**
 * One entry in a record's edit history.
 *
 * Same shape as an order's `AuditEntry` and for the same reason: an audit line
 * that says only "updated" is a line nobody can act on, so `changes` carries
 * the fields with their old value beside the new one.
 */
export interface AuditEvent {
  id: string;
  /** Full ISO stamp — the moment the save landed, not when typing began. */
  at: string;
  /** Who saved it. A person, or the name of the integration that did. */
  by: string;
  /** `Created`, `Updated`, `Archived`, `Status changed`, `Document uploaded`. */
  action: string;
  /** Field-level detail. Empty for actions with nothing to diff. */
  changes: string[];
}

export interface Attachment {
  id: string;
  name: string;
  /** `pdf`, `png`, `xlsx`, `csv` — drives the icon, nothing else. */
  kind: string;
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
  /** Certificates expire; a spec sheet does not. Null where the idea is moot. */
  expiresOn: string | null;
}

/** A person attached to a record — customer POC, vendor dispatcher. */
export interface DirectoryContact {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  /** The one who gets called first. Exactly one per record, or none. */
  isPrimary: boolean;
  notes: string | null;
}

/** A delivery site belonging to a customer. */
export interface ShipToLocation {
  id: string;
  customerId: string;
  locationName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  status: "active" | "inactive" | "archived";
  notes: string | null;
}

/** The lifecycle every directory record shares. */
export const RECORD_STATUSES = ["active", "inactive", "archived"] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/* ─────────────────────────────────────────────────────────────── people ── */

export const STAFF = [
  "Dana Whitfield",
  "Marcus Reyes",
  "Priya Raman",
  "Tom Alvarez",
  "Colleen Marsh",
  "Anita Kaur",
  "Devin Brooks",
  "Sofia Marchetti",
] as const;

/** Integrations edit records too, and the trail should say so. */
export const ACTORS = [...STAFF, "NetSuite Sync", "Customer Portal"] as const;

const FIRST = [
  "Ray", "Colleen", "Marisol", "Dwight", "Anita", "Tom", "Priya", "Devin",
  "Sofia", "Marcus", "Hector", "Lena", "Owen", "Bianca", "Curtis", "Nadia",
  "Grant", "Yolanda", "Pete", "Imani", "Roy", "Denise", "Sam", "Tessa",
] as const;

const LAST = [
  "Obuya", "Marsh", "Vega", "Feeney", "Kaur", "Alvarez", "Raman", "Brooks",
  "Marchetti", "Reyes", "Delgado", "Whitfield", "Nakamura", "Osei", "Boone",
  "Halvorsen", "Kirby", "Santos", "Prasad", "Lindqvist", "Ferrell", "Doyle",
] as const;

export const personName = (r: () => number): string =>
  `${pickFrom(r, FIRST)} ${pickFrom(r, LAST)}`;

/**
 * The roles a contact usually has — a SUGGESTION, not a law.
 *
 * A directory that forces every contact into seven roles gets "Other" in the
 * role field and the real answer in a note, where nothing can filter on it.
 * So the field offers these and takes anything: the list keeps the common
 * cases consistent and the rest stay findable.
 */
export const CONTACT_ROLES = [
  "Site Foreman",
  "Fleet Manager",
  "Operations Manager",
  "Accounts Payable",
  "Facilities Lead",
  "Yard Supervisor",
  "Dispatcher",
  "Owner",
  "Safety Officer",
  "Procurement",
] as const;

/** `+1-559-555-0142`. The 555 block, because these are not real numbers. */
export function phoneNumber(r: () => number): string {
  const area = pickFrom(r, ["559", "661", "916", "209", "713", "816", "415", "480", "503", "702"] as const);
  return `+1-${area}-555-${String(intBetween(r, 100, 199)).padStart(4, "0")}`;
}

export const emailFor = (name: string, domain: string): string =>
  `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${domain}`;

export const domainFor = (company: string): string =>
  `${company
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .join("")
    .slice(0, 14) || "example"}.com`;

/* ────────────────────────────────────────────────────────────── geography ── */

/**
 * Real cities with their real states and a plausible zip. The prototype's
 * geography has to be coherent because vendor eligibility is decided on it —
 * a vendor covering California and a ship-to in Fresno must actually agree.
 */
export const PLACES = [
  { city: "Fresno", state: "CA", zip: "93725", lat: 36.6954, lng: -119.7562 },
  { city: "Bakersfield", state: "CA", zip: "93307", lat: 35.3821, lng: -119.0876 },
  { city: "Modesto", state: "CA", zip: "95354", lat: 37.5138, lng: -120.8541 },
  { city: "Sacramento", state: "CA", zip: "95814", lat: 38.6013, lng: -121.4821 },
  { city: "Stockton", state: "CA", zip: "95206", lat: 37.9577, lng: -121.2908 },
  { city: "Bloomington", state: "CA", zip: "92316", lat: 34.0703, lng: -117.3959 },
  { city: "Houston", state: "TX", zip: "77029", lat: 29.7844, lng: -95.2311 },
  { city: "Dallas", state: "TX", zip: "75212", lat: 32.7767, lng: -96.8320 },
  { city: "San Antonio", state: "TX", zip: "78219", lat: 29.4241, lng: -98.4936 },
  { city: "Phoenix", state: "AZ", zip: "85009", lat: 33.4484, lng: -112.0740 },
  { city: "Tucson", state: "AZ", zip: "85714", lat: 32.2226, lng: -110.9747 },
  { city: "Las Vegas", state: "NV", zip: "89115", lat: 36.1699, lng: -115.1398 },
  { city: "Reno", state: "NV", zip: "89502", lat: 39.5296, lng: -119.8138 },
  { city: "Portland", state: "OR", zip: "97218", lat: 45.5152, lng: -122.6784 },
  { city: "Eugene", state: "OR", zip: "97402", lat: 44.0521, lng: -123.0868 },
  { city: "Kent", state: "WA", zip: "98032", lat: 47.3809, lng: -122.2348 },
  { city: "Spokane", state: "WA", zip: "99202", lat: 47.6588, lng: -117.4260 },
  { city: "Denver", state: "CO", zip: "80216", lat: 39.7392, lng: -104.9903 },
  { city: "Salt Lake City", state: "UT", zip: "84104", lat: 40.7608, lng: -111.8910 },
  { city: "Albuquerque", state: "NM", zip: "87105", lat: 35.0844, lng: -106.6504 },
] as const;

export type Place = (typeof PLACES)[number];

/** Full state names, because vendor coverage is stored spelled out. */
export const STATE_NAMES: Record<string, string> = {
  CA: "California",
  TX: "Texas",
  AZ: "Arizona",
  NV: "Nevada",
  OR: "Oregon",
  WA: "Washington",
  CO: "Colorado",
  UT: "Utah",
  NM: "New Mexico",
};

const STREETS = [
  "Industrial Way", "Commerce Dr", "Terminal Rd", "Depot St", "Airport Blvd",
  "Freight Ln", "Foundry Ave", "Cannery Row", "Distribution Ct", "Pipeline Rd",
  "Harbor Pkwy", "Kingsburg Ave", "Old Mill Rd", "Tank Farm Rd", "Rail Yard Dr",
] as const;

export function streetAddress(r: () => number): string {
  return `${intBetween(r, 100, 9899)} ${pickFrom(r, STREETS)}`;
}

/** `4820 Industrial Way, Fresno, CA 93725` — one line, for a table cell. */
export function oneLineAddress(a: {
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}): string {
  const head = [a.addressLine1, a.city].filter(Boolean).join(", ");
  const tail = [a.state, a.zip].filter(Boolean).join(" ");
  const all = [head, tail].filter(Boolean).join(", ");
  return all || DASH;
}

/* ───────────────────────────────────────────────────────────────── tags ── */

export const CUSTOMER_TAGS = [
  "Key Account", "Net 30", "Tax Exempt", "Portal User", "Seasonal",
  "Construction", "Municipal", "Agriculture", "Restoration", "Watch List",
] as const;

export const VENDOR_TAGS = [
  "Preferred", "After Hours", "Hazmat Certified", "Long Haul", "Regional",
  "Backup Only", "New Partner", "High Volume",
] as const;

export const PRODUCT_TAGS = [
  "Bulk", "Packaged", "Winter Blend", "Hazmat", "Top Seller", "Special Order",
] as const;

export const ASSET_TAGS = [
  "Double Wall", "DOT Rated", "Leased Unit", "Telemetry", "Winterised", "Loaner",
] as const;

/* ────────────────────────────────────────────────────────────── audit log ── */

/**
 * A believable history for a record that has been around a while.
 *
 * Built backwards from `updatedAt`: the most recent entry is the last edit,
 * and the first is always the creation. Every seed record therefore has a
 * trail that ENDS where its `updatedAt` says it should — the audit tab and the
 * summary card cannot disagree.
 */
export function seedAudit(
  r: () => number,
  opts: { createdAt: string; updatedAt: string; noun: string; fields: string[] }
): AuditEvent[] {
  const out: AuditEvent[] = [];
  const n = intBetween(r, 1, 5);
  let cursor = new Date(opts.updatedAt).getTime();

  for (let i = 0; i < n; i += 1) {
    const fields = someOf(r, opts.fields, 3);
    out.push({
      id: `au-${Math.floor(r() * 1e9).toString(36)}`,
      at: new Date(cursor).toISOString(),
      by: pickFrom(r, ACTORS),
      action: i === 0 ? "Updated" : pickFrom(r, ["Updated", "Status changed", "Document uploaded"] as const),
      changes: fields.map((f) => `${f} changed`),
    });
    cursor -= intBetween(r, 2, 60) * 86_400_000;
    if (cursor <= new Date(opts.createdAt).getTime()) break;
  }

  out.push({
    id: `au-${Math.floor(r() * 1e9).toString(36)}`,
    at: new Date(opts.createdAt).toISOString(),
    by: pickFrom(r, STAFF),
    action: "Created",
    changes: [`${opts.noun} record created`],
  });

  return out;
}

/** Files a record of this kind would plausibly be carrying. */
export function seedAttachments(
  r: () => number,
  names: readonly string[],
  max = 3
): Attachment[] {
  const n = intBetween(r, 0, max);
  const chosen = n === 0 ? [] : someOf(r, names, n);
  return chosen.map((name, i) => ({
    id: `at-${Math.floor(r() * 1e9).toString(36)}-${i}`,
    name,
    kind: name.endsWith(".xlsx") ? "xlsx" : name.endsWith(".png") ? "png" : "pdf",
    sizeKb: intBetween(r, 40, 4800),
    uploadedAt: dateOffset(-intBetween(r, 10, 700)),
    uploadedBy: pickFrom(r, STAFF),
    expiresOn: /certificate|insurance|w-9|permit|inspection/i.test(name)
      ? dateOffset(intBetween(r, -120, 500))
      : null,
  }));
}
