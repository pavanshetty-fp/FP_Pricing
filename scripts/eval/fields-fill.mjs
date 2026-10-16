/*
  CHECK — a row of fields fills its row.  `docs/ds/ui/2-rules.md` §"A row of
  fields fills its row". Eval segment `2-layouts.md`.

  WHY A SCRIPT (Pavan, 2026-10-16). The recurring rule's Repeat / Times a day
  sat in a fixed 340px column; when the sheet grew, the column did not, and a
  third of the card stood empty beside two narrow selects. Nobody chose that
  — a pixel width was set once and outlived the layout around it. Only a
  scan finds these: each looks right at the width it was made at.

  WHAT IT ENFORCES (L1). A container given a FIXED PIXEL WIDTH
  (`w-[NNNpx]`) that holds FIELDS — a labelled field (`<Row label=`,
  `<Field label=`, `<SheetField`) or a select / combobox / input — must say
  why in a comment carrying `FIXED WIDTH` within the lines just above. A
  field row is a grid or flex of `fr` / `flex-1` parts that share the row.

  WHAT IT DOES NOT DO. Whether the gap between fields is comfortable, and
  whether a fixed control (a date, a time) is the right size, are readings
  (L2), listed in the layouts segment.
*/

import { filesUnder, read, rel, finding, isComment } from "./lib.mjs";

export const name = "fields-fill";
export const segment = "2-layouts";
export const rule = 'docs/ds/ui/2-rules.md §"A row of fields fills its row"';

const SCAN = ["prototypes/unified-view", "prototypes/customer-portal"];
const SKIP = /(TechnicianApp|TechnicianMobile|TechnicianHome|TechnicianJob)\.tsx$/;
const FIELD = /<(?:Row|Field)\s+label=|<SheetField\b|<Select\b|<Combobox\b|<Input\b|<DateButton\b/;

export function check() {
  const out = [];
  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file)) continue;
    const lines = read(file).split("\n");
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      /* A CONTAINER (div/section) with a fixed pixel width. */
      if (!/<(?:div|section)\b[^>]*className=[^>]*\bw-\[\d+px\]/.test(line)) return;
      const body = lines.slice(i + 1, i + 14).join("\n");
      if (!FIELD.test(body)) return;
      const above = lines.slice(Math.max(0, i - 5), i + 1).join("\n");
      if (/FIXED WIDTH/.test(above)) return;
      out.push(finding("L1", rel(file), i + 1,
        "a fixed-width container holds fields — let the row's fields share it (fr / flex-1), or say FIXED WIDTH and why",
        rule));
    });
  }
  return out;
}
