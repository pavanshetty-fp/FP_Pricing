/*
  CHECK — one casing, one spelling.  UX-167 (Pavan, 2026-11-13: "fix the copy
  inconsistencies … go ahead with sentence case"). Eval segment `4-content`.

  WHAT IT ENFORCES, L1, on the words people see (a label, title, heading,
  CTA, placeholder or aria-label attribute; a `label:`/`title:` prop; a JSX
  text node):
    · SENTENCE CASE — no second word capitalised unless it is an acronym, a
      proper name kept on the list below, a month or day, or a stage named
      after "to" ("Move to Assigned");
    · ONE SPELLING per term — Ship-to (never Ship To / Ship-To / ShipTo),
      Top off (never Top-off), "(gal)" (never "(Gal)").
  Data (customer, product, people names) lives in data files and is not read.
*/

import { filesUnder, read, rel, finding, isComment } from "./lib.mjs";

export const name = "copy-case";
export const segment = "4-content";
export const rule = "docs/fpds/07-ux-rules.md UX-167 — sentence case, one spelling per term";

const SCAN = ["prototypes/unified-view", "prototypes/customer-portal"];
const SKIP = /(?:^|\/)(data|customers|assetOrders|directory|vendors|work|invoices|quotes|pocs|activity|salesActivity)\.ts$|RuleRecommendations/;
const PROTECT = ["Service Work", "Master Data", "Customer Portal", "Unified View", "FleetPanda", "Lovable", "Google Maps", "Partially Synced", "Bulk Lubricants", "Packaged Products", "Watch List"];
const KEEP = new Set("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Mon Tue Wed Thu Fri Sat Sun I".split(" "));
const STAGES = new Set("Orders Quoting Assigned Completed Review Verified Synced Canceled Draft Dispatched Delivered Scheduled Invoiced Open Accounting".split(" "));
/* A status shown on its own after a dash ("— Unassigned") is a value, not a label. */
const VALUES = new Set(["Unassigned"]);

const CTX = [
  /(?:label|title|editTitle|createTitle|createAction|ctaLabel|heading|placeholder|aria-label|searchPlaceholder)="([^"{}<>\n]+)"/g,
  /(?:label|title|heading|editTitle|createTitle|ctaLabel|createAction|placeholder):\s*"([^"{}<>\n]+)"/g,
  />\s*([A-Z][A-Za-z'’]+(?: [A-Za-z0-9'’()&/·.,-]+)+?)\s*</g,
];
const VARIANTS = [
  [/\bShip[ -]To\b|\bShipTo\b/, "write Ship-to"],
  [/\bTop-off\b/, "write Top off"],
  [/\(Gal\)/, "write (gal)"],
];

function titleWord(text) {
  let t = text;
  for (const p of PROTECT) t = t.split(p).join("§");
  if (/[.!?] [A-Z]/.test(t) || /\.$/.test(t)) return null;
  const words = t.split(/\s+|\/|·/).filter(Boolean);
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/^[^A-Za-z§]+|[^A-Za-z']+$/g, "");
    if (!w || w.includes("§") || KEEP.has(w) || w === w.toUpperCase() || /[A-Z]/.test(w.slice(1))) continue;
    if (VALUES.has(w)) continue;
    if (STAGES.has(w) && /\bto$/i.test(words.slice(0, i).join(" "))) continue;
    if (/^[A-Z][a-z]/.test(w)) return w;
  }
  return null;
}

export function check() {
  const out = [];
  for (const file of filesUnder(SCAN, [".tsx", ".ts"])) {
    if (SKIP.test(file) || file.endsWith(".d.ts")) continue;
    read(file).split("\n").forEach((line, i) => {
      if (isComment(line)) return;
      for (const rx of CTX) {
        for (const m of line.matchAll(rx)) {
          const text = m[1];
          if (text.includes("${")) continue;
          for (const [v, fix] of VARIANTS)
            if (v.test(text)) out.push(finding("L1", rel(file), i + 1, `"${text}" — ${fix}`, rule));
          const w = titleWord(text);
          if (w) out.push(finding("L1", rel(file), i + 1, `"${text}" — sentence case: "${w}" in lower case`, rule));
        }
      }
    });
  }
  return out;
}
