/*
  CHECK — adding and removing a table's rows.  `docs/ds/ui/2-rules.md` §10f
  "Rows". Eval segment `3-interactions.md`.

  WHY A SCRIPT. An audit of seventeen editable tables on 2026-09-23 found that
  NONE moved the cursor into the row it had just added, that six different
  remove labels announced "Remove row 3" to a screen reader, and that the one
  sales table had quietly forked its own cell controls. Each looked fine on
  its own screen; only scanning all of them at once shows the drift.

  WHAT IT ENFORCES, all L1:
    · a file that adds rows (`HangingAdd`) passes `autoFocus` to something —
      the add is followed by the answer, not by a hunt for the row;
    · a row's remove names its subject — never "Remove row N" / "line N";
    · no local `Cell*` control in the app — the cells are the DS `TableCell*`.

  WHAT IT DOES NOT DO. Whether the RIGHT cell takes focus, whether a table may
  be emptied, and what a new row starts with are readings (L2), listed in the
  interactions segment.
*/

import { filesUnder, read, rel, finding, isComment } from "./lib.mjs";

export const name = "table-rows";
export const segment = "3-interactions";
export const rule = 'docs/ds/ui/2-rules.md §10f "Rows"';

const SCAN = ["prototypes/unified-view"];
const SKIP = /(TechnicianApp|TechnicianMobile)\.tsx$/;

export function check() {
  const out = [];
  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file) || /HangingAdd\.tsx$/.test(file)) continue;
    const src = read(file);
    const lines = src.split("\n");

    const firstAdd = lines.findIndex((l) => /<HangingAdd\b/.test(l) && !isComment(l));
    if (firstAdd >= 0 && !/autoFocus/.test(src)) {
      out.push(
        finding("L1", rel(file), firstAdd + 1,
          "rows are added here but nothing takes focus — pass autoFocus to the new row's first cell",
          rule),
      );
    }

    lines.forEach((line, i) => {
      if (isComment(line)) return;
      if (/aria-label=\{?[`"]Remove (?:row|line) /.test(line)) {
        out.push(finding("L1", rel(file), i + 1,
          'a remove with no subject — "Remove {name}", or "Remove {kind} N" while blank', rule));
      }
      if (/^\s*(?:export )?function Cell(?:Select|Number|Input|Combobox|MultiSelect)\b/.test(line)) {
        out.push(finding("L1", rel(file), i + 1,
          "a local cell control — use the DS TableCell* component", rule));
      }
    });
  }
  return out;
}
