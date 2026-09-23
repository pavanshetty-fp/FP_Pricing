/*
  CHECK — helper text is not a guide.  `docs/ds/ux/2-rules.md` →
  "HELPER TEXT IS NOT A DEFAULT".  Eval segment `4-content.md`.

  WHY THIS ONE IS A SCRIPT. It was said twice and broken three times. A rule
  that depends on remembering it at the moment you are adding a field is a
  rule that loses to the moment you are adding a field — one helpful line at a
  time, each of them defensible on its own, until the screen is a paragraph.

  WHAT IT CANNOT DO, AND WHY IT IS L2. Whether a line EXPLAINS a control or
  REPORTS a state is a reading, not a pattern: "Clock said 2 h 15" is a fact
  about this record and "type it here" is a lesson about the field, and no
  regex tells them apart. So the check surfaces every piece of static helper
  text and a person says which kind it is. **A script that guessed would
  either delete honest state or bless instructions.**

  IT ONLY EVER FLAGS A LITERAL. A `description={...}` holding an expression is
  almost always conditional — a state — and those are the ones that are
  usually right.
*/

import { filesUnder, read, rel, finding } from "./lib.mjs";

export const name = "microcopy";
export const segment = "4-content";
export const rule = 'docs/ds/ux/2-rules.md → "HELPER TEXT IS NOT A DEFAULT"';

const SCAN = ["prototypes/unified-view"];

/**
 * A SETTINGS SCREEN IS THE EXCEPTION THAT PROVES THE RULE. There, explaining
 * what an option does IS the content rather than a gloss on it — a switch
 * with no description is a switch nobody can set.
 */
const EXEMPT = /Settings(?:Screen)?\.tsx$/;

/**
 * Phrasings that are unmistakably INSTRUCTION and never state.
 *
 * NARROWED HARD ON ITS FIRST RUN (2026-09-23). The first list caught
 * "Enter a valid email address" — which is VALIDATION, explicitly sanctioned
 * — and "Choose a yard first", which is a gated control reporting WHY it is
 * closed. Both are states. A check that flags the rule's own exceptions is a
 * check people learn to scroll past, and this one was written precisely
 * because the rule had already been ignored three times.
 *
 * So: no placeholders, no validation, and only phrases that address the
 * READER about the CONTROL.
 */
const TEACHING =
  /\b(?:leave (?:it |this )?(?:blank|empty|unassigned)|type it here|you can (?:add|use|set|leave)|use this (?:to|field)|this (?:field|box) (?:is|lets|allows))\b/i;

export function check() {
  const out = [];

  for (const file of filesUnder(SCAN, [".tsx"])) {
    const f = rel(file);
    if (EXEMPT.test(f)) continue;

    read(file).split("\n").forEach((line, i) => {
      const n = i + 1;

      /* A LITERAL `description=` ON A FIELD. The prop exists for a state; a
         hard-coded string in it is almost always a lesson about the control,
         because a state would have had to be computed. */
      const desc = line.match(/\bdescription="([^"]{12,})"/);
      if (desc) {
        out.push(finding("L2", f, n,
          `helper text on a field — state or guide? "${desc[1].slice(0, 56)}…"`,
          rule));
      }

      /* A PHRASE THAT TEACHES. Anywhere — a description, a placeholder, a
         muted paragraph. */
      /* A PLACEHOLDER IS NOT HELPER TEXT. It lives inside the control, it is
         gone the moment there is a value, and where it names a gate — "Choose
         a site first" — it is reporting a state rather than teaching one. */
      const teach = line.match(/"([^"]{10,})"/);
      if (
        teach &&
        TEACHING.test(teach[1]) &&
        !/aria-label|className|placeholder=/.test(line)
      ) {
        out.push(finding("L2", f, n,
          `copy that teaches the control — "${teach[1].slice(0, 56)}…"`,
          rule));
      }
    });
  }
  return out;
}
