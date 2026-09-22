/*
  CHECK — the boxed table unit.  `docs/ds/ui/2-rules.md` §10f

  WHY A SCRIPT AND NOT A CHECKLIST LINE. This shape was got wrong in nine
  places across four sheets before anybody noticed, and each one looked fine
  on its own screen. What catches it is scanning all of them at once.

  Moved into `scripts/eval/` on 2026-09-22 when the runner arrived; the
  behaviour is unchanged and `npm run eval:boxed-tables` still works.
*/

import { join } from "node:path";
import { ROOT, files, read, rel, finding } from "./lib.mjs";

export const name = "boxed-tables";
export const segment = "2-layouts";
export const rule = "docs/ds/ui/2-rules.md §10f · docs/ds/ui/7-variants.md";

const SCAN = ["prototypes/unified-view", "src/components"];

/** The component this line sits in — from its `function` to the next one. */
const enclosing = (lines, i) => {
  let start = 0;
  for (let j = i; j >= 0; j -= 1) {
    if (/^(?:export )?function \w+/.test(lines[j])) { start = j; break; }
  }
  let end = lines.length;
  for (let j = i + 1; j < lines.length; j += 1) {
    if (/^(?:export )?function \w+/.test(lines[j])) { end = j; break; }
  }
  return lines.slice(start, end).join("\n");
};

/** A className string on or just above this line, if there is one. */
const nearbyClass = (lines, i, back = 6) => {
  for (let j = i; j >= Math.max(0, i - back); j -= 1) {
    const m = lines[j].match(/className=(?:"([^"]*)"|\{cn\(([^)]*)\))/);
    if (m) return m[1] ?? m[2] ?? "";
  }
  return "";
};

/** A border on every side — the wrapper's own rim, not a single divider. */
const isRim = (cls) =>
  /\bborder\b(?!-[trblxy]\b)(?!-\d)(?!-collapse)/.test(cls) &&
  !/\bborder-(?:t|b|l|r|x|y)\b/.test(cls);

export function check() {
  const out = [];
  const report = (file, line, what, layer = "L1") =>
    out.push(finding(layer, rel(file), line, what, rule));

  for (const file of SCAN.flatMap((d) => files(join(ROOT, d)))) {
    const src = read(file);
    const lines = src.split("\n");

    lines.forEach((line, i) => {
      const n = i + 1;

      /* 1. A TABLE INSIDE A RIM. The box's edge is the table's edge.
            Look from the line ABOVE: the table's own className is not the
            wrapper's, and reading it instead was how this check came up empty
            against a wrapper that plainly had a rim. */
      if (line.includes("<table")) {
        const cls = nearbyClass(lines, i - 1);
        if (isRim(cls) && /rounded/.test(cls)) {
          /* L2, NOT L1 — AND THE DEMOTION IS THE POINT (2026-09-22). A table
             in its own box is a legitimate variant: `7-variants.md` T2, a
             table that IS its own unit with nothing around it. What §10f
             forbids is a T2 nested INSIDE a card — a box in a box — and
             whether that is what this is cannot be decided from the table's
             own wrapper. Reporting it L1 asked a script to make a design
             decision, and two of the first three it found were correct code.
             So it surfaces every one and a person says which variant it is;
             the verdicts live in the catalogue. */
          report(file, n,
            "table in its own box — declare the variant (T2 unit, or a box in a box?)",
            "L2");
        }
      }

      /* 2. A FULL-WIDTH ADD BAND. The add hangs off the card instead.
            READ THE STRIP, THEN LOOK FOR THE ADD INSIDE IT — not the other way
            round. Starting from the "Add …" line and searching back found the
            BUTTON's own className every time and never the strip's, which is
            how a live violation sat here unreported. */
      const cls = (line.match(/className="([^"]*)"/) ?? [])[1] ?? "";
      if (/\bborder-t\b/.test(cls) && (/\bw-full\b/.test(cls) || /\bpx-\d/.test(cls))) {
        const inside = lines.slice(i, i + 22).join("\n");
        if (/>\s*Add [a-z]|\bAdd [a-z][a-z ]*<\/|\/>\s*Add [a-z]/.test(inside)) {
          report(file, n, "Add control on a full-width band inside the card");
        }
      }

      /* 3. AN OUTLINED ADD. It takes the table's header tint instead. */
      if (/rounded-b(?:r)?-md/.test(line) && /border-[rb]\b/.test(line) && /Add|add/.test(src.slice(src.indexOf(line), src.indexOf(line) + 400))) {
        report(file, n, "hanging add drawn with a border rather than a fill");
      }

      /* 4. A TABLE'S EMPTY STATE DRAWN AS A DASHED BOX. Padded text instead.
            Only inside a component that actually renders a table — a dashed box
            around a LIST is a different thing and not this rule's business. */
      if (/border-dashed/.test(line) && /px-4 py-6/.test(line)) {
        if (/<table\b/.test(enclosing(lines, i))) {
          report(file, n, "a table's empty state drawn as a dashed box inside the card");
        }
      }
    });

    /* 5. A SECTION WHOSE BODY IS A TABLE BUT IS NOT FLUSH. */
    const sectionOpens = [...src.matchAll(/<SheetSection\b([\s\S]{0,400}?)>/g)];
    for (const m of sectionOpens) {
      if (/\bflush\b/.test(m[1])) continue;
      /* STOP AT THIS SECTION'S OWN END. A fixed lookahead ran past the close
         and found the NEXT section's table, reporting a section that holds no
         table at all — which is how a check loses the reader's trust faster
         than missing something does. */
      let after = src.slice(m.index + m[0].length, m.index + m[0].length + 4000);
      const ownEnd = after.search(/<\/SheetSection>|<SheetSection\b/);
      if (ownEnd !== -1) after = after.slice(0, ownEnd);
      if (/<table\b|<SheetTable\b|<AttachmentTable\b/.test(after)) {
        report(file, src.slice(0, m.index).split("\n").length,
          "SheetSection holds a table but is not `flush`");
      }
    }
  }
  return out;
}
