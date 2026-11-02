/*
  CHECK — tables match the 2026-10-07 table rules.
  `docs/ds/ux/2-rules.md` → "Tables — full width, checkboxes, delete on hover",
  `docs/unified-view/evals/6-3pl-guardrails.md` G39, G42, G43.
  Eval segment `6-3pl-guardrails`.

  WHY A SCRIPT. Sales Settings copied Service Settings' `max-w-4xl` and its
  switches, and Pavan had to ask "why was it built without using the full
  space?" (2026-10-07). Both are patterns a copy carries silently from one
  screen to the next; only a sweep catches them before they are copied again.

  WHAT IT ENFORCES, all L1:
    G39 a boolean inside a table is a Checkbox — no <Switch> between a
        <table>/<Table> and its close;
    G42 a draggable row has a handle (a Grip icon in the same file);
    G43 nothing that holds a table is capped — no `max-w-*` width cap on a
        layout container (div/section/main) in a file that renders a table.

  WHAT IT DOES NOT DO. Whether every cell is editable, whether delete is a
  hover column, whether a unit sits inside the cell — readings, L2. A settings
  page that is a list of switches rather than a table is also a reading (the
  rule says it should BE a Setting · Value table): that is reported L2 here so
  it is seen, never decided.
*/

import { filesUnder, read, rel, finding, stripComments } from "./lib.mjs";

export const name = "parity-tables";
export const segment = "6-3pl-guardrails";
export const rule = 'docs/ds/ux/2-rules.md → "Tables — full width, checkboxes, delete on hover"';

const SCAN = ["prototypes/unified-view"];
const SKIP = /\/(TechnicianApp|TechnicianMobile|TechnicianHome|TechnicianJob|ListToolbar)\.tsx$/;

/** A width cap — not `max-w-full`, `max-w-0`, or an arbitrary `[min(...)]` clamp. */
const CAP = /\bmax-w-(?:\d+|xs|sm|md|lg|xl|[2-7]xl|prose|screen-\w+)\b/;
/** Popovers, tooltips, dialogs and truncating cells cap themselves on purpose. */
const NOT_LAYOUT = /Tooltip|Popover|HoverCard|Dialog|DropdownMenu|truncate|TableCell|<span|<p\b|<button|Content\b/;

export function check() {
  const out = [];
  const add = (layer, file, line, what, id) =>
    out.push(finding(layer, rel(file), line, what, `${id} · ${rule}`));

  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file)) continue;
    const src = stripComments(read(file));
    const lines = src.split("\n");
    const hasTable = /<(?:table|Table|ListTable)\b/.test(src);

    /* ── G39 · no switch inside a table ──────────────────────────────── */
    let depth = 0;
    lines.forEach((line, i) => {
      depth += (line.match(/<(?:table|Table)\b/g) ?? []).length;
      if (depth > 0 && /<Switch\b/.test(line)) {
        add("L1", file, i + 1, "a switch inside a table — booleans in a table are checkboxes", "G39");
      }
      depth -= (line.match(/<\/(?:table|Table)>/g) ?? []).length;
      if (depth < 0) depth = 0;
    });

    /* ── G42 · a draggable row has a handle ──────────────────────────── */
    lines.forEach((line, i) => {
      if (/<(?:tr|TableRow)\b/.test(line) || /<(?:tr|TableRow)\b/.test(lines[i - 1] ?? "")) {
        if (/\bdraggable\b/.test(line) && !/Grip/.test(src)) {
          add("L1", file, i + 1, "a reorderable row with no handle — every reorderable row carries a grip", "G42");
        }
      }
    });

    /* ── G43 · a table is not capped ─────────────────────────────────── */
    if (hasTable) {
      lines.forEach((line, i) => {
        if (!CAP.test(line) || NOT_LAYOUT.test(line)) return;
        /* A floating panel's props run over several lines — `<HoverCardContent`
           a line or two above its className is still a panel, not layout. */
        if (NOT_LAYOUT.test(lines[i - 1] ?? "") || NOT_LAYOUT.test(lines[i - 2] ?? "")) return;
        if (!/<(?:div|section|main)\b|className=/.test(line)) return;
        add("L1", file, i + 1, `a width cap (${line.match(CAP)[0]}) on a container in a screen that holds a table — tables take the full width`, "G43");
      });
    }

    /* ── G39 (L2) · a settings list of switches ─────────────────────── */
    if (/Settings(?:Screen)?\.tsx$/.test(file)) {
      const switches = lines.filter((l) => /<Switch\b|<SwitchRow\b/.test(l)).length;
      if (switches >= 3) {
        const first = lines.findIndex((l) => /<Switch\b|<SwitchRow\b/.test(l));
        add("L2", file, first + 1,
          `a settings list of ${switches} switches — the rule makes a list of single settings a Setting · Value table with checkboxes; confirm before converting`,
          "G39");
      }
    }
  }
  return out;
}
