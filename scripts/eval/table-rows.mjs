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
    · no local `Cell*` control in the app — the cells are the DS `TableCell*`;
    · a row's remove asks first — it is `TableRowRemove` (✕ / ✓), never a
      bare bin `Button` labelled "Remove …" (Pavan, 2026-09-23);
    · EVERY picker in a table that adds rows takes `multiple` — several
      picks make several rows — or is marked ONE VALUE with why it is a value
      inside a row (Pavan, 2026-10-15; tightened 2026-10-16);
    · TOP OFF, THEN QTY — a Top off header that is not the one right before
      the Qty / Quantity header (§10i, Pavan, 2026-10-16; Qty last since
      2026-10-20).

  WHAT IT DOES NOT DO. Whether the RIGHT cell takes focus, whether a table may
  be emptied, and what a new row starts with are readings (L2), listed in the
  interactions segment.
*/

import { filesUnder, read, rel, finding, isComment } from "./lib.mjs";

export const name = "table-rows";
export const segment = "3-interactions";
export const rule = 'docs/ds/ui/2-rules.md §10f "Rows"';

const SCAN = ["prototypes/unified-view", "prototypes/customer-portal"];
const SKIP = /(TechnicianApp|TechnicianMobile)\.tsx$/;

export function check() {
  const out = [];
  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file) || /HangingAdd\.tsx$/.test(file)) continue;
    const src = read(file);
    const lines = src.split("\n");

    /* AN ADD THAT OPENS THE FILE PICKER makes no typed row — nothing to focus. */
    const addsRows = /<(?:HangingAdd|TableRowRemove)\b/.test(src);
    const firstAdd = lines.findIndex(
      (l) => /<HangingAdd\b/.test(l) && !isComment(l) && !/\.click\(\)/.test(l),
    );
    /* A SHARED TABLE takes the new row's index (`focusRow=`) and focuses it itself. */
    if (firstAdd >= 0 && !/autoFocus|focusRow=/.test(src)) {
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
      if (/aria-label=\{`Remove /.test(line) && /<Button\b/.test(lines.slice(Math.max(0, i - 4), i).join("\n"))) {
        out.push(finding("L1", rel(file), i + 1,
          "a row bin that removes on one click — use TableRowRemove, which asks ✕ / ✓", rule));
      }
      /* A PICKER IN A TABLE THAT ADDS ROWS — §"Picking several makes rows"
         (Pavan, 2026-10-16, after the third reminder). Every TableCellSelect /
         TableCellCombobox in a file whose tables add rows either takes
         `multiple` (several picks → several rows) or says, in a comment
         carrying "ONE VALUE", why it is a value INSIDE a row. Nothing
         recognised by its label any more — a new table cannot slip past. */
      if (addsRows && /<TableCell(?:Select|Combobox)\b/.test(line)) {
        let b = i;
        while (b < lines.length - 1 && b < i + 80 && !/^\s*\/>/.test(lines[b])) b++;
        const el = lines.slice(Math.max(0, i - 4), b + 1).join("\n");
        if (!/\bmultiple=/.test(el) && !/ONE VALUE/.test(el)) {
          out.push(finding("L1", rel(file), i + 1,
            "a picker in a table that adds rows takes one — pass `multiple`, or mark it ONE VALUE with why", rule));
        }
      }
      if (/^\s*(?:export )?function Cell(?:Select|Number|Input|Combobox|MultiSelect)\b/.test(line)) {
        out.push(finding("L1", rel(file), i + 1,
          "a local cell control — use the DS TableCell* component", rule));
      }
    });

    /* TOP OFF NEXT TO THE QUANTITY (§10i): within each <thead>, a Top off
       header must not come before the Qty one. */
    const heads = src.split(/<thead\b/).slice(1).map((h) => h.split(/<\/thead>/)[0]);
    let at = 0;
    for (const h of heads) {
      at = src.indexOf(h, at);
      /* The label, not a comment ("TOP OFF …") above its cell. */
      const top = h.search(/Top off/);
      const qty = h.search(/Qty|Quantity/);
      if (top < 0 || qty < 0) continue;
      /* TOP OFF FIRST, AND NO HEADER BETWEEN — Qty's own <th is the only one. */
      const between = top < qty ? (h.slice(top, qty).match(/<th\b/g)?.length ?? 0) : 0;
      if (top > qty || between > 1) {
        out.push(finding("L1", rel(file), src.slice(0, at + top).split("\n").length,
          "Top off must be the column right before Qty, and Qty last — select-all in its header, ticks right-aligned (§10i)",
          rule));
      }
    }
  }
  return out;
}
