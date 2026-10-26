/*
  GUARDS — checks born from the misses log (`docs/fpds/evals/misses.json`).

  Each one exists because Pavan had to point the same thing out by hand. The
  log names the check that guards a miss; this file is where those checks
  live, so a miss that has a check here should not come back silently.
  (Pavan, 2026-10-26: "this will become a part of eval to check that such
  incidents become fewer or become 0% at some point.")

  L1 only — each has exactly one right answer.
*/

import { filesUnder, read, rel, finding } from "./lib.mjs";

const SCAN = ["prototypes", "src"];
const tsx = () => filesUnder(SCAN, [".tsx"]);
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/* ── us-spelling (M-004) ─────────────────────────────────────────────────
   UK spellings in what a user reads: string literals and JSX text. Comments
   and identifiers are not UI. "grey" is excluded — it is a token/colour
   NAME in code, never shown as a word. */
const UK = /\b(colours?|programmes?|fulfilment|cancell(?:ed|ing)|catalogues?|licences?|behaviours?|centred|centre|organisation|favourite|analyse|labour)\b/i;
export const usSpelling = {
  name: "us-spelling",
  segment: "4-content",
  rule: "misses M-004 — US English in every string the user reads",
  check() {
    const out = [];
    for (const f of tsx()) {
      read(f).split("\n").forEach((l, i) => {
        const t = l.trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*")) return;
        for (const m of l.matchAll(/"([^"\n]*)"|`([^`\n]*)`|>([^<>{}\n]+)</g)) {
          const seg = m[1] ?? m[2] ?? m[3] ?? "";
          const hit = seg.match(UK);
          if (hit) out.push(finding("L1", rel(f), i + 1, `UK spelling "${hit[1]}" in "${seg.trim().slice(0, 50)}"`, this.rule));
        }
      });
    }
    return out;
  },
};

/* ── th-align (M-005) ────────────────────────────────────────────────────
   A <th> with no alignment class is CENTRED by the browser — the "left-align
   every table" sweep removed text-right and left the Qty header centred.
   Every header says its alignment (DS: all left unless Pavan names one). */
export const thAlign = {
  name: "th-align",
  segment: "2-layouts",
  rule: "misses M-005 — every table header declares text-left (a bare <th> centres)",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      /* Class constants in this file that carry an alignment, e.g.
         `const TH = "px-3 py-2.5 text-left"`. */
      const aligned = new Set(
        [...src.matchAll(/const ([A-Z_][A-Z0-9_]*)\s*=\s*"[^"]*\btext-(?:left|right|center)\b[^"]*"/g)].map((m) => m[1])
      );
      for (const m of src.matchAll(/<th\b([^>]*)>/g)) {
        const attrs = m[1];
        if (/aria-hidden/.test(attrs)) continue;
        if (/text-(left|right|center)/.test(attrs)) continue;
        /* A shared constant that carries the alignment — {TH} or cn(TH, …). */
        const ident = attrs.match(/className=\{(?:cn\()?([A-Z_][A-Z0-9_]*)\b/);
        if (ident && aligned.has(ident[1])) continue;
        /* A mention in a comment is not a header. */
        const lineStart = src.lastIndexOf("\n", m.index) + 1;
        if (/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(src.slice(lineStart, m.index))) continue;
        out.push(finding("L1", rel(f), lineOf(src, m.index), `<th${attrs.slice(0, 60)}> has no alignment`, this.rule));
      }
    }
    return out;
  },
};

/* ── banner-position (M-001) ─────────────────────────────────────────────
   The list alert banner sits UNDER the toolbar (search, Filters, chips),
   right above the table or board — every module. */
export const bannerPosition = {
  name: "banner-position",
  segment: "2-layouts",
  rule: "misses M-001 — AlertBanner comes after the ListToolbar shelf, before the list",
  check() {
    const out = [];
    for (const f of filesUnder(["prototypes"], [".tsx"])) {
      const src = read(f);
      const bar = src.indexOf("<ListToolbar");
      if (bar < 0) continue;
      const banner = src.search(/<AlertBanner\b|\{banner &&/);
      if (banner < 0) continue;
      if (banner < bar) out.push(finding("L1", rel(f), lineOf(src, banner), "alert banner is above the toolbar", this.rule));
    }
    return out;
  },
};

/* ── multipick-any-row (M-015) ───────────────────────────────────────────
   A row-adding picker offers several at once from ANY row — blank or filled
   (the row's own value opens ticked). `multiple={x ? undefined : …}` turns
   it off on filled rows. */
export const multipickAnyRow = {
  name: "multipick-any-row",
  segment: "3-interactions",
  rule: "misses M-015 — a row picker's `multiple` is never conditional on the row being empty",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      for (const m of src.matchAll(/multiple=\{\s*([^{}]{0,80}?)\?\s*undefined/g)) {
        out.push(finding("L1", rel(f), lineOf(src, m.index), `multi-pick switched off when \`${m[1].trim()}\` is set`, this.rule));
      }
    }
    return out;
  },
};

/* ── css-tokens (M-009) ──────────────────────────────────────────────────
   Every `-fp-` colour class used in the code resolves to a `--color-fp-…`
   in src/index.css. A stylesheet that lost a block (1,100 lines, 2026-10-25)
   shows up here as classes pointing at nothing. */
export const cssTokens = {
  name: "css-tokens",
  segment: "1-components",
  rule: "misses M-009 — every fp colour class has its --color token in src/index.css",
  check() {
    const css = read(filesUnder(["src"], [".css"]).find((f) => f.endsWith("index.css")));
    const defined = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const out = [];
    const seen = new Set();
    for (const f of tsx()) {
      const src = read(f);
      for (const m of src.matchAll(/\b(?:bg|text|border(?:-[trblxy])?|ring|fill|stroke|divide|outline|decoration|from|to|via|placeholder|caret|accent)-(fp-[a-z0-9-]+?)(?:\/\d+)?(?=[\s"'`\]])/g)) {
        const tok = m[1];
        if (defined.has(tok) || seen.has(tok)) continue;
        seen.add(tok);
        out.push(finding("L1", rel(f), lineOf(src, m.index), `class uses ${tok}, which src/index.css does not define`, this.rule));
      }
    }
    return out;
  },
};

/* ── double-stroke (M-017) ───────────────────────────────────────────────
   `border-y` on a row inside a bordered card stacks on the card's rim at the
   bottom edge. A row draws the rule ABOVE it; the card closes itself. */
export const doubleStroke = {
  name: "double-stroke",
  segment: "1-components",
  rule: "misses M-017 — rows use border-t (or last:border-b-0), never border-y",
  check() {
    const out = [];
    for (const f of filesUnder(["prototypes"], [".tsx"])) {
      read(f).split("\n").forEach((l, i) => {
        if (/\bborder-y\b/.test(l)) out.push(finding("L1", rel(f), i + 1, "border-y on a row", this.rule));
      });
    }
    return out;
  },
};

export const ALL = [usSpelling, thAlign, bannerPosition, multipickAnyRow, cssTokens, doubleStroke];
