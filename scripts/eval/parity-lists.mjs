/*
  CHECK — list screens match 3PL.  `docs/unified-view/evals/6-3pl-guardrails.md`
  G1–G20 (list screens). Eval segment `6-3pl-guardrails`.

  WHY A SCRIPT. 3PL's Delivery Orders is the reference list (Pavan,
  2026-10-07: "whatever has been worked on in 3PL is the latest design
  guardrail"). Every list is built from the same three parts — the view bar
  (`FuelOrdersViewBar`), the toolbar (`ListToolbar`) and the table
  (`ListTable`) — and almost every drift between modules is a PROP LEFT OFF one
  of them: the part supports the behaviour, the screen never switched it on.
  That is countable, so it is counted here.

  WHAT IT ENFORCES, all L1 — each has one correct answer:
    G1  the saved-views row is real, not stubbed with no-op handlers;
    G2  search by column is the filter row (toolbar toggle + table row);
    G3  the column menu can reorder (columnOrder + onReorderColumns);
    G4  the table's columns reorder AND resize;
    G5  every column in a ListColumn set sorts;
    G6  a Filters panel applies (value + onApply) — otherwise it filters nothing;
    G7  applied filters show as chips (FilterChips) on the screen;
    G8  Group By is either fed dimensions or switched off — never a dead menu;
    G11 the view switch offers a board only where a board is rendered;
    G12 the board is BrokerBoard with lane sort;
    G13 the board's card fields menu is there and speaks per lane / all;
    G19 a paged table has the pagination footer.

  WHAT IT DOES NOT DO. Whether a list SHOULD have a board, a map, a date
  range, a line-of-service switch, Export, a create menu, an alert banner or a
  bulk bar is a reading of the data (L2) — those are written up in the parity
  results file, never decided here.
*/

import { filesUnder, read, rel, finding, stripComments, openTags, lineAt } from "./lib.mjs";

export const name = "parity-lists";
export const segment = "6-3pl-guardrails";
export const rule = "docs/unified-view/evals/6-3pl-guardrails.md — list screens";

const SCAN = ["prototypes/unified-view"];
const SKIP = /\/(TechnicianApp|TechnicianMobile|TechnicianHome|TechnicianJob|ListToolbar|ListTable|FuelOrdersViewBar|ListFilters)\.tsx$/;

/** Column keys that are the row's FRAME, not content — they never sort. */
const FRAME = /^(?:actions|select|open|chevron|menu|remove|handle|drag)$/;

export function check() {
  const out = [];
  const add = (file, line, what, id) =>
    out.push(finding("L1", rel(file), line, what, `${id} · ${rule}`));

  for (const file of filesUnder(SCAN, [".tsx"])) {
    if (SKIP.test(file)) continue;
    const src = stripComments(read(file));

    /* ── G1 · saved views are real ───────────────────────────────────── */
    for (const t of openTags(src, "FuelOrdersViewBar")) {
      const p = t.props;
      if (!p.has("...") && /^\{\s*\[\s*\]\s*\}$/.test(String(p.get("views") ?? ""))
        && /\(\)\s*=>\s*\{\s*\}/.test(String(p.get("onCreate") ?? ""))) {
        add(file, t.line, "saved-views row is stubbed (views={[]}, no-op onCreate) — wire useSavedViews so + View works", "G1");
      }
    }

    /* ── G2–G8, G11, G13 · the toolbar ───────────────────────────────── */
    const toolbars = openTags(src, "ListToolbar");
    for (const t of toolbars) {
      const p = t.props;
      if (!p.has("onToggleColumnFilters")) {
        add(file, t.line, "toolbar has no column filter row (onToggleColumnFilters) — search by column is the row of boxes under the header", "G2");
      }
      if (!(p.has("columnOrder") && p.has("onReorderColumns"))) {
        add(file, t.line, `column menu cannot reorder (${p.has("columnOrder") ? "onReorderColumns" : "columnOrder + onReorderColumns"} missing)`, "G3");
      }
      const groupOff = String(p.get("showGroupBy") ?? "") === "{false}";
      if (!groupOff && !p.has("groupBy")) {
        add(file, t.line, "Group By is shown but given no dimensions — a menu that groups nothing; pass groupBy or showGroupBy={false}", "G8");
      }
      if (p.has("boardView") && String(p.get("boardView")) !== "{false}" && !/<(BrokerBoard|BoardV2)\b/.test(src)) {
        add(file, t.line, "view switch offers a board but the screen renders no board (BrokerBoard or BoardV2)", "G11");
      }
      if (p.has("boardView") && /<BrokerBoard\b/.test(src)) {
        if (!p.has("cardFields")) {
          add(file, t.line, "board has no Card fields menu (cardFields)", "G13");
        } else if (!/scopes\s*:/.test(String(p.get("cardFields")))) {
          add(file, t.line, "Card fields menu speaks for every lane at once — give it scopes (per lane · All lanes)", "G13");
        }
      }
    }

    /* ── G6 · a Filters panel applies ────────────────────────────────── */
    const filterPanels = openTags(src, "ListFilters");
    for (const t of filterPanels) {
      if (!t.props.has("onApply") || !t.props.has("value")) {
        add(file, t.line, "Filters panel has no value/onApply — ticking a facet filters nothing", "G6");
      }
    }

    /* ── G7 · applied filters show as chips ──────────────────────────── */
    const applied = filterPanels.find((t) => t.props.has("onApply"));
    if (toolbars.length && applied && !/<FilterChips\b/.test(src)) {
      add(file, applied.line, "filters apply but nothing on screen says so — add the FilterChips shelf under the toolbar", "G7");
    }

    /* ── G4, G2, G19 · the table ─────────────────────────────────────── */
    const tables = openTags(src, "ListTable");
    for (const t of tables) {
      const p = t.props;
      const miss = ["onReorderColumns", "onResizeColumns"].filter((k) => !p.has(k));
      if (miss.length) {
        add(file, t.line, `column ${miss.map((k) => (k === "onReorderColumns" ? "order" : "widths")).join(" and ")} not lifted (${miss.join(", ")}) — the header moves them for the session only, so a saved view cannot keep them and the column menu cannot follow`, "G4");
      }
      if (!p.has("showColumnFilters") || !p.has("onColumnFilterChange")) {
        add(file, t.line, "table has no column filter row (showColumnFilters + onColumnFilterChange)", "G2");
      }
    }
    /* A LIST BUILT ON ITS OWN <Table> instead of ListTable must still carry
       the header that moves and resizes (`TableColumnHeader`). */
    if (toolbars.length && !tables.length && /<(?:Table|table)\b/.test(src)
      && !/TableColumnHeader|useTableColumns/.test(src)) {
      const at = src.search(/<(?:Table|table)\b/);
      add(file, lineAt(src, at), "a list table built by hand with no TableColumnHeader — its columns neither move nor resize", "G4");
    }
    if (tables.length && !/<TablePagination\b/.test(src)) {
      add(file, tables[0].line, "a paged list with no pagination footer (TablePagination)", "G19");
    }

    /* ── G12 · board lane sort ───────────────────────────────────────── */
    for (const t of openTags(src, "BrokerBoard")) {
      if (!t.props.has("laneSortOptions")) {
        add(file, t.line, "board lanes cannot be sorted (laneSortOptions)", "G12");
      }
    }

  }

  /* ── G5 · every column sorts ───────────────────────────────────────── 
     A column SET is any `…COLUMNS = [` array whose entries carry a `key` and
     a `width` — the shape of a table's colgroup, wherever it is declared (the
     sets live in .ts data files as often as in screens). A column sorts when
     it says `sortable: true` or carries its own `sort:` function. */
  for (const file of filesUnder(SCAN, [".ts", ".tsx"])) {
    if (SKIP.test(file)) continue;
    const src = stripComments(read(file));
    const colSet = /\b([A-Z][A-Z_]*COLUMNS)\b[^=\n]*=\s*\[/g;
    let m;
    while ((m = colSet.exec(src)) !== null) {
      let depth = 0;
      let i = m.index + m[0].length - 1;
      const start = i;
      const entries = [];
      let entryStart = -1;
      for (; i < src.length; i += 1) {
        const c = src[i];
        if (c === "[" || c === "(") depth += 1;
        else if (c === "]" || c === ")") { depth -= 1; if (depth === 0) break; }
        else if (c === "{") { if (depth === 1) entryStart = i; depth += 1; }
        else if (c === "}") { depth -= 1; if (depth === 1 && entryStart >= 0) { entries.push([entryStart, src.slice(entryStart, i + 1)]); entryStart = -1; } }
      }
      for (const [at, obj] of entries) {
        const key = obj.match(/\bkey:\s*"([^"]+)"/)?.[1];
        if (!key || !/\bwidth:/.test(obj)) continue;
        if (FRAME.test(key) || /\blabel:\s*""/.test(obj)) continue;
        if (!/sortable:\s*true|\bsort:\s*\(/.test(obj)) {
          add(file, lineAt(src, at), `column "${key}" in ${m[1]} does not sort`, "G5");
        }
      }
    }
  }
  return out;
}
