/*
  CHECK — the side sheet's variants.  `docs/ds/ui/7-variants.md`,
  `docs/ds/ux/2-rules.md` → Side-sheet anatomy.  Eval segment `2-layouts.md`.

  TWO JOBS, AND THE SECOND ONE IS THE POINT.

  1. It enforces the three sheet rules that have exactly one correct answer.
  2. It prints a CENSUS — every sheet in the app against every option it takes.
     A catalogue of variants that nobody counts is a catalogue that goes stale
     the first time somebody adds a sixth width. The census is how the
     variants document stays true, and how a run measures CHANGE: the numbers
     move, and the run before it said what they were.
*/

import { filesUnder, read, rel, finding } from "./lib.mjs";

export const name = "sheets";
export const segment = "2-layouts";
export const rule = "docs/ds/ui/7-variants.md — the side sheet";

const SCAN = ["prototypes/unified-view", "prototypes/customer-portal"];
const SIZES = ["compact", "form", "data", "full"];

/** The options a sheet may take, and how to spot each one. */
const OPTIONS = {
  size: /<RecordSheet[\s\S]{0,2000}?\bsize="([a-z]+)"/,
  /* `fit=`, or `fit:` inside a spread of props that change by step. */
  fit: /<RecordSheet[\s\S]{0,3000}?\bfit[=:]/,
  /* A TABLE INSIDE THE SHEET — from the sheet's own tag on. */
  table: /<RecordSheet[\s\S]*?<(?:table|ProductTable|DocumentsTable|ListTable|LoadOrderTable)\b/,
  level2: /^\s*level=\{2\}/m,
  steps: /^\s*steps=/m,
  rail: /lg:grid-cols-\[minmax\(0,1fr\)_340px\]/,
  footerBanner: /^\s*footerBanner=/m,
  footerAside: /^\s*footerAside=/m,
  footerPrimary: /^\s*footerPrimary=/m,
  headerSubtitle: /^\s*headerSubtitle=/m,
  headerMenu: /^\s*headerMenu=/m,
  autosaves: /useDraftSaveState\s*\(/,
  noCancel: /^\s*showCancel=\{false\}/m,
};

export function census() {
  const rows = [];
  for (const file of filesUnder(SCAN, [".tsx"])) {
    const src = read(file);
    if (!/<RecordSheet\b/.test(src)) continue;
    const row = { file: rel(file) };
    for (const [key, re] of Object.entries(OPTIONS)) {
      const m = src.match(re);
      /* A BUTTON'S size="sm" further down is not the sheet's width. */
      row[key] = key === "size" ? (m && !["sm", "lg", "icon", "xs"].includes(m[1]) ? m[1] : "form (default)") : Boolean(m);
    }
    rows.push(row);
  }
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}

export function check() {
  const out = [];

  for (const row of census()) {
    /* AUTOSAVE AND CANCEL CANNOT BOTH BE TRUE. "Cancel" promises to undo, and
       a sheet that has already kept everything typed cannot keep that
       promise. One correct answer, written in the DS. */
    if (row.autosaves && !row.noCancel) {
      out.push(finding("L1", row.file, null,
        "sheet autosaves but still shows Cancel",
        'ux §Side-sheet anatomy — "Cancel comes off"'));
    }

    /* A TABLE WITH NO `fit` (Pavan, 2026-10-15) — a sheet carrying tables is
       as wide as its widest table's columns; only the intense forms fill. */
    if (row.table && !row.fit && row.size !== "full") {
      out.push(finding("L1", row.file, null,
        "sheet carries a table but takes a fixed width — pass `fit` from its columns (CELL)",
        "DS ui/7-variants §1 — the width follows the content"));
    }

    /* A WIDTH OFF THE SET. Three names, and a fourth is a decision nobody took
       in the open. */
    const size = row.size.replace(" (default)", "");
    if (!SIZES.includes(size)) {
      out.push(finding("L1", row.file, null,
        `sheet width "${row.size}" is not one of ${SIZES.join(" · ")}`,
        "ux §Side-sheet anatomy — width is per step, off the named set"));
    }
  }

  /* A FOOTER PRIMARY THAT SAYS SAVE. The primary is the next act on the
     record; a sheet that has already saved is a button for a job that is
     done. Read from the RecordSheet props only — a `Save` elsewhere on a
     screen is a different control and not this rule's business. */
  for (const file of filesUnder(SCAN, [".tsx"])) {
    const src = read(file);
    if (!/<RecordSheet\b/.test(src)) continue;
    const props = src.slice(src.indexOf("<RecordSheet"));
    for (const m of props.matchAll(
      /\b(?:createAction|editAction)=\{?"((?:Save|Update)[^"]*)"/g
    )) {
      out.push(finding("L1", rel(file),
        props.slice(0, m.index).split("\n").length,
        `footer primary reads "${m[1]}"`,
        'ux §"THE PRIMARY IS A LADDER, NOT A SAVE"'));
    }
  }

  /* ONE HIGHLIGHTED CARD PER SHEET (Pavan, 2026-10-26). The tinted
     SummaryCard marks the ONE thing most worth seeing — the order summary,
     what needs attention. A second one beside it splits the eye; every
     other card is a plain RailCard. Two in a file means two can show. */
  for (const file of filesUnder(SCAN, [".tsx"])) {
    const src = read(file);
    const hits = [...src.matchAll(/<SummaryCard\b/g)];
    if (hits.length > 1) {
      out.push(finding("L1", rel(file),
        src.slice(0, hits[1].index).split("\n").length,
        `${hits.length} highlighted SummaryCards in one sheet — keep the most important, make the rest RailCards`,
        "ux UX-161 — one highlighted card per sheet"));
    }
  }

  return out;
}
