/*
  CHECK — a field reaches every screen of its record.  `5-data-and-state.md`
  §Field reach (Pavan, 2026-10-14).

  WHY A SCRIPT. On 2026-10-14 the asset gained RFID, ERP ID, unique ID,
  product categories and a tank monitor on its own sheet, and the ship-to's
  asset table — where assets are ALSO created — still made assets without
  them. Nobody chose that; the table was simply not looked at. "It should go
  without saying" is exactly the kind of rule that is forgotten, so it is
  counted instead.

  WHAT IT ENFORCES (L1). Every field of a record's type appears on every
  SURFACE registered for that record — a screen that creates, edits or lists
  it — unless the surface names the field in `skip` WITH A REASON. The skip
  list is the decision record: leaving a field off a screen is allowed, doing
  it silently is not.

  A NESTED surface (`only`) is a record shown inside another one — a
  ship-to's asset breakdown — and must carry just the listed fields.

  "Appears" = the field is read or written in that surface's code: `x.field`,
  `field:` or `"field"` on a line that is not a comment. A surface can be a
  REGION of a file (from one marker to the next) when one file holds several
  screens.

  ADDING DATA. A new field on a registered type makes this check fail on every
  surface that does not carry it yet — that is the point. A new record type,
  or a new screen of one, is added to RECORDS below.
*/

import { join } from "node:path";
import { ROOT, read, finding, isComment } from "./lib.mjs";

export const name = "field-reach";
export const segment = "5-data-and-state";
export const rule = "5-data-and-state.md §Field reach — a field reaches every screen of its record";

const PORTAL = "prototypes/customer-portal";

/** Fields no surface has to show — never inputs. */
const NEVER = {
  id: "an identifier, not data",
  audit: "shown through the activity log, not as a field",
};

const RECORDS = [
  {
    type: "Asset",
    source: `${PORTAL}/orders.ts`,
    skipAll: {
      product: "derived — the first of `products`",
      level: "a tank-monitor READING, not an input — shown through <TankLevel asset> (Pavan, 2026-10-17)",
      battery: "a tank-monitor READING, not an input — shown through <TankLevel asset> (Pavan, 2026-10-17)",
      dailyUse: "a tank-monitor READING — feeds days to empty and the suggested quantity (Pavan, 2026-10-17)",
    },
    surfaces: [
      { file: `${PORTAL}/AssetSheet.tsx`, what: "asset sheet — create and detail" },
      {
        file: `${PORTAL}/ShipToSheet.tsx`,
        from: "function AssetsTable(",
        to: "MAP EXISTING ASSETS",
        what: "ship-to step 2 — the asset table (creates assets too)",
        skip: {
          notes: "long text — on the asset's own sheet",
          status: "deactivating is on the asset's own sheet, where open orders are checked",
        },
      },
      {
        file: `${PORTAL}/SitesScreen.tsx`,
        from: "const ASSET_COLUMNS",
        to: "/* --------------------------------------------------------------- screen",
        alsoFrom: 'tab === "assets"',
        alsoTo: 'tab === "service"',
        what: "Sites & Assets — the Assets list",
        skip: { notes: "long text — on the asset's own sheet" },
      },
      /* A NESTED SURFACE — the asset as it appears INSIDE another record's
         screen. `only` = what that breakdown must carry (Pavan, 2026-10-14:
         a ship-to's assets show their products and capacity). */
      {
        file: `${PORTAL}/cells.tsx`,
        from: "export function ShipToAssetsCell(",
        to: "export function ShipToProductsCell(",
        what: "Ship-tos list — the Assets breakdown",
        only: ["name", "products", "capacity"],
      },
      {
        file: `${PORTAL}/cells.tsx`,
        from: "export function ShipToProductsCell(",
        to: "/** A list of values behind",
        what: "Ship-tos list — the Products breakdown",
        only: ["name", "products", "capacity"],
      },
    ],
  },
  {
    type: "Invoice",
    source: `${PORTAL}/invoices.ts`,
    skipAll: {},
    surfaces: [
      {
        file: `${PORTAL}/InvoiceSheet.tsx`,
        what: "invoice sheet",
        skip: { lines: "read through chargesOf() — each line is a Fuel row of Charges" },
      },
      {
        file: `${PORTAL}/InvoicesScreen.tsx`,
        what: "Invoices list",
        skip: {
          lines: "the charges are the invoice's own sheet",
          paidOn: "the status says it is paid; the date is on the sheet",
          dispute: "the status says Payment disputed; reason, notes and proof are on the sheet",
        },
      },
    ],
  },
  {
    type: "PortalUser",
    source: `${PORTAL}/users.ts`,
    skipAll: {},
    surfaces: [
      { file: `${PORTAL}/UserSheet.tsx`, what: "user sheet" },
      {
        file: `${PORTAL}/TeamScreen.tsx`,
        what: "Team & Access list",
        skip: {
          firstName: "shown joined with the last name, through fullName()",
          lastName: "shown joined with the first name, through fullName()",
          jobTitle: "on the user's sheet — the list leads with name and email",
          invitedAt: "on the sheet, beside the invitation status",
        },
      },
    ],
  },
  {
    type: "ShipTo",
    source: `${PORTAL}/orders.ts`,
    skipAll: {},
    surfaces: [
      { file: `${PORTAL}/ShipToSheet.tsx`, from: "export function ShipToSheet(", what: "ship-to sheet — create and detail" },
      {
        file: `${PORTAL}/SitesScreen.tsx`,
        from: "type SK =",
        to: "/* -------------------------------------------------------------- assets",
        alsoFrom: 'tab === "shipTos"',
        alsoTo: 'tab === "assets"',
        what: "Sites & Assets — the Ship-tos list",
      },
    ],
  },
];

/** The field names of `export interface <type> { … }` in `source`. */
function fieldsOf(type, source) {
  const text = read(join(ROOT, source));
  const start = text.indexOf(`export interface ${type} {`);
  if (start < 0) return null;
  const body = text.slice(start, text.indexOf("\n}", start));
  return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]);
}

/** The surface's code: the whole file, or its region(s). */
function regionOf(s) {
  const text = read(join(ROOT, s.file));
  const cut = (a, b) => {
    if (!a) return text;
    const i = text.indexOf(a);
    if (i < 0) return "";
    const j = b ? text.indexOf(b, i + a.length) : -1;
    return text.slice(i, j < 0 ? undefined : j);
  };
  return [cut(s.from, s.to), s.alsoFrom ? cut(s.alsoFrom, s.alsoTo) : ""]
    .join("\n")
    .split("\n")
    .filter((l) => !isComment(l))
    .join("\n");
}

const reaches = (code, f) =>
  new RegExp(`(?:\\.${f}\\b|\\b${f}\\s*:|["'\`]${f}["'\`])`).test(code);

export function check() {
  const out = [];
  for (const r of RECORDS) {
    const fields = fieldsOf(r.type, r.source);
    if (!fields) {
      out.push(finding("L1", r.source, 0, `interface ${r.type} not found — the registry is stale`, rule));
      continue;
    }
    for (const s of r.surfaces) {
      const code = regionOf(s);
      if (!code.trim()) {
        out.push(finding("L1", s.file, 0, `${s.what}: its region markers are gone — the registry is stale`, rule));
        continue;
      }
      for (const f of s.only ?? fields) {
        if (!s.only && !fields.includes(f)) continue;
        if (s.only && !fields.includes(f)) {
          out.push(finding("L1", s.file, 0, `${s.what}: ${r.type}.${f} no longer exists — the registry is stale`, rule));
          continue;
        }
        if (NEVER[f] || r.skipAll[f] || s.skip?.[f]) continue;
        if (!reaches(code, f))
          out.push(
            finding(
              "L1",
              s.file,
              0,
              `${r.type}.${f} is missing from ${s.what} — add it, or skip it there with a reason`,
              rule
            )
          );
      }
    }
  }
  return out;
}
