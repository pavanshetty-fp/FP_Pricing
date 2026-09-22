/*
  CHECK — token discipline.  `docs/ds/ui/2-rules.md` → Token discipline,
  Strokes, Icons.  Eval segment `1-components.md`.

  THESE WERE ALREADY WRITTEN AS GREPS in the eval document and never run,
  which is the whole reason the segments sat untouched: a command a person has
  to remember to type is a command nobody types.

  A CHECK IS ONLY WORTH RUNNING IF ITS OUTPUT IS ALL REAL. The first run
  reported 87 things and about half of them were correct behaviour — a hex
  quoted inside a comment, a file whose entire job is to SHOW the
  anti-pattern, a chart that has to be handed a colour string because Recharts
  cannot take a class. A reader who has to mentally discard half a report
  stops reading the report. So:

    · block comments are tracked properly, across lines, not guessed at
      per line;
    · every exemption is NAMED, WITH ITS REASON, in `ALLOWED` below — a
      visible list somebody can argue with, never a silent skip.
*/

import { filesUnder, read, rel, finding } from "./lib.mjs";

export const name = "tokens";
export const segment = "1-components";
export const rule = "docs/ds/ui/2-rules.md → Token discipline";

const SCAN = ["prototypes/unified-view", "src/components", "src/lib"];
const EXTS = [".tsx", ".ts"];

/**
 * THE EXEMPTIONS, EACH WITH THE REASON IT IS ONE.
 *
 * A path appears here only when the rule genuinely does not apply to it —
 * never because the finding was tedious to fix. Anything that is merely
 * *unfixed* belongs in the report, where it can be argued about.
 */
const ALLOWED = [
  {
    match: /src\/components\/dos-and-donts\//,
    kinds: ["hex", "radius", "spacing", "palette"],
    why: "its job is to SHOW the anti-pattern beside the correct version",
  },
  {
    match: /src\/components\/(dashboard|info-cards)\//,
    kinds: ["hex"],
    why: "Recharts takes a colour string, not a class — the chart token bridge is a known gap, tracked in the charts rules",
  },
  {
    match: /src\/components\/ui\//,
    kinds: ["radius", "spacing"],
    why: "vendored shadcn primitives; their arbitrary values are upstream's and are retuned by replacing the primitive, not by editing it",
  },
];

const exempt = (file, kind) =>
  ALLOWED.find((a) => a.match.test(file) && a.kinds.includes(kind));

/** Tailwind's own ramps. A colour class naming one of these is off the system. */
const PALETTES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/**
 * Strip comments, keeping line numbers.
 *
 * PER-LINE GUESSING WAS NOT ENOUGH. This repo documents its rules in the
 * source beside the code they govern, so a forbidden value appears inside a
 * paragraph of prose whose line happens to start with a word — which a
 * `^\s*\*` test reads as code. Tracking the block state is the only way to
 * tell the two apart.
 */
function codeLines(src) {
  const out = [];
  let inBlock = false;
  for (const raw of src.split("\n")) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) { out.push(""); continue; }
      line = line.slice(end + 2);
      inBlock = false;
    }
    /* Opening a block on this line: keep what precedes it. */
    const open = line.indexOf("/*");
    if (open !== -1) {
      const close = line.indexOf("*/", open + 2);
      if (close === -1) { out.push(line.slice(0, open)); inBlock = true; continue; }
      line = line.slice(0, open) + line.slice(close + 2);
    }
    const slash = line.indexOf("//");
    if (slash !== -1) line = line.slice(0, slash);
    out.push(line);
  }
  return out;
}

export function check() {
  const out = [];

  for (const file of filesUnder(SCAN, EXTS)) {
    const f = rel(file);
    /* `index.css` defines the tokens, so it is the one place a raw value is
       the correct answer. */
    if (f.endsWith("index.css")) continue;

    const add = (kind, n, what, why) => {
      if (exempt(f, kind)) return;
      out.push(finding("L1", f, n, what, why));
    };

    codeLines(read(file)).forEach((line, i) => {
      const n = i + 1;

      for (const m of line.matchAll(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g)) {
        add("hex", n, `raw hex ${m[0]}`,
          "ui §Token discipline — every colour is a token");
      }

      for (const m of line.matchAll(/\b(?:rgba?|hsla?)\(\s*\d/g)) {
        add("hex", n, `colour literal ${m[0].trim()}…`,
          "ui §Token discipline — every colour is a token");
      }

      for (const m of line.matchAll(
        new RegExp(`\\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:${PALETTES})-\\d{2,3}\\b`, "g")
      )) {
        add("palette", n, `Tailwind palette class ${m[0]}`,
          "ui §Token discipline — no default palette");
      }

      /* AN ARBITRARY SPACING OR RADIUS VALUE. The scale is the 4px grid and
         the radii are the five named steps.

         WIDTHS AND HEIGHTS ARE NOT IN THIS RULE. A 340px rail and a 130px
         column are measured decisions with reasons written beside them, and
         there is no scale for them to be on. */
      for (const m of line.matchAll(/\b(?:gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|space-x|space-y)-\[[^\]]+\]/g)) {
        add("spacing", n, `arbitrary spacing ${m[0]}`,
          "ui §Token discipline — spacing is the 4px scale");
      }
      for (const m of line.matchAll(/\brounded(?:-[trbl]{1,2})?-\[[^\]]+\]/g)) {
        add("radius", n, `arbitrary radius ${m[0]}`,
          "ui §Token discipline — radii are the named steps");
      }

      const imp = line.match(/from\s+"(@tabler\/[^"]*|react-icons[^"]*|@heroicons\/[^"]*|phosphor[^"]*)"/);
      if (imp) {
        add("icons", n, `icon set ${imp[1]}`, "ui §Icons — Lucide only");
      }

      /* `console.error` is how the fixtures report a broken invariant and is
         deliberate — see `orders.ts`. */
      if (/\bconsole\.(log|debug|table)\s*\(/.test(line)) {
        add("console", n, "console.log left behind",
          "eval 1-components — no debug output in a reviewed screen");
      }
    });
  }
  return out;
}

/** The exemptions, for the report — a skip nobody can see is a skip nobody audits. */
export const exemptions = ALLOWED;
