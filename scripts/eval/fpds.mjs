/*
  FPDS CHECKS — the new design system's own evals (docs/fpds/evals/README.md).
  Five checks, each its own module export below, all run by `npm run eval`:

    fpds-cards     every spec card has the twelve sections, in order, and its
                   Checks name real evals
    fpds-register  every card's code exists, registry names are unique, every
                   `unit.` / `template.` the docs mention exists, and
                   register.json is current
    fpds-units     the units are used the way their cards say, in the code
                   (view bar on every list, no right alignment, one date picker,
                   no preset view tabs)
    fpds-rules     domain rules that have exactly one right answer (Customer
                   Portal: ORD numbers, no quotes, no request statuses)
    fpds-gaps      the golden prompts resolve to the expected template/units,
                   and the gap message appears for — and only for — real gaps
*/

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, filesUnder, read, rel, finding, isComment } from "./lib.mjs";
import { readCards, SECTIONS } from "../fpds/cards.mjs";
import { build, resolveCode } from "../fpds/build.mjs";
import { resolve } from "../fpds/resolve.mjs";

const EVAL_IDS = new Set([
  "tokens", "boxed-tables", "sheets", "microcopy", "status-kinds", "table-rows",
  "parity-lists", "parity-sheets", "parity-tables", "parity-shell", "field-reach",
  "fields-fill", "wcag-contrast", "fpds-cards", "fpds-register", "fpds-units",
  "fpds-rules", "fpds-gaps",
]);
const DOC = "docs/fpds/_spec-card-template.md";

export const cards = {
  name: "fpds-cards",
  segment: "fpds",
  rule: DOC,
  check() {
    const out = [];
    for (const c of readCards()) {
      const want = SECTIONS.join(" | ");
      const have = c.sections.join(" | ");
      if (have !== want) {
        const missing = SECTIONS.filter((s) => !c.sections.includes(s));
        out.push(
          finding("L1", c.file, c.line, `${c.id}: sections ${missing.length ? `missing ${missing.join(", ")}` : "out of order"}`, DOC)
        );
      }
      const checks = c.text["Checks"] ?? "";
      for (const id of checks.match(/`([a-z0-9-]+)`/g) ?? []) {
        const bare = id.replace(/`/g, "");
        /* Only what looks like an eval id is held to the list — code names in
           backticks (`fit`, `multiple`) are just code. */
        if (/^(fpds|parity)-/.test(bare) && !EVAL_IDS.has(bare))
          out.push(finding("L1", c.file, c.line, `${c.id}: Checks names "${bare}", which is not an eval id`, "docs/fpds/evals/README.md"));
      }
    }
    return out;
  },
};

export const register = {
  name: "fpds-register",
  segment: "fpds",
  rule: "docs/fpds/register.json",
  check() {
    const out = [];
    const all = readCards();
    const ids = new Set(all.map((c) => c.id));
    const names = new Map();
    for (const c of all) {
      resolveCode(c.code).forEach((p, i) => {
        if (!p) out.push(finding("L1", c.file, c.line, `${c.id}: code path "${c.code[i]}" does not exist`, "docs/fpds/register.json"));
      });
      if (names.has(c.registry))
        out.push(finding("L1", c.file, c.line, `${c.id}: registry name "${c.registry}" is also ${names.get(c.registry)}`, "docs/fpds/register.json"));
      names.set(c.registry, c.id);
    }
    /* Every unit/template the docs name must exist. */
    for (const file of filesUnder(["docs/fpds"], [".md"])) {
      if (/FPDS\.md$|_spec-card-template/.test(file)) continue;
      read(file)
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(/`((?:unit|template|atom|molecule)\.[a-z0-9-]+)`/g))
            if (!ids.has(m[1])) out.push(finding("L1", rel(file), i + 1, `mentions ${m[1]}, which has no card`, "docs/fpds/register.json"));
        });
    }
    /* register.json is what the cards say today. */
    const path = join(ROOT, "docs/fpds/register.json");
    if (!existsSync(path)) out.push(finding("L1", "docs/fpds/register.json", 0, "missing — run npm run fpds:build", "docs/fpds/register.json"));
    else {
      const onDisk = JSON.parse(readFileSync(path, "utf8")).entries.map((e) => e.id).sort().join(",");
      const now = build({ write: false }).register.entries.map((e) => e.id).sort().join(",");
      if (onDisk !== now) out.push(finding("L1", "docs/fpds/register.json", 0, "out of date with the cards — run npm run fpds:build", "docs/fpds/register.json"));
    }
    return out;
  },
};

const SCAN = ["prototypes/unified-view", "prototypes/customer-portal"];
const VIEW_BAR = "docs/ds/ui/2-rules.md §10p (view bar)";

export const units = {
  name: "fpds-units",
  segment: "fpds",
  rule: "docs/fpds/units/",
  check() {
    const out = [];
    for (const file of filesUnder(SCAN, [".tsx", ".ts"])) {
      const src = read(file);
      const lines = src.split("\n");
      const r = rel(file);
      /* THE VIEW BAR ON EVERY LIST. */
      if (/<ListToolbar\b/.test(src) && !/viewToolsInto=/.test(src))
        out.push(finding("L1", r, lines.findIndex((l) => /<ListToolbar\b/.test(l)) + 1, "a list toolbar without viewToolsInto — the view's tools belong in the view bar", VIEW_BAR));
      if (/<ListTable\b/.test(src) && !/topBar=/.test(src) && !/ListTable\.tsx$/.test(file))
        out.push(finding("L1", r, lines.findIndex((l) => /<ListTable\b/.test(l)) + 1, "a list table without topBar — the view bar sits on the table", VIEW_BAR));
      lines.forEach((line, i) => {
        if (isComment(line)) return;
        /* EVERYTHING LEFT-ALIGNED. */
        if (/\balign:\s*"(right|center)"/.test(line))
          out.push(finding("L1", r, i + 1, "a right/centre-aligned column — every column is left-aligned", "docs/ds/ui/2-rules.md §10p (left-aligned)"));
        /* ONE DATE PICKER. */
        if (/<Calendar\b/.test(line) && !/TechnicianHome|TechnicianJob/.test(file))
          out.push(finding("L1", r, i + 1, "a raw Calendar — dates use the shared date picker", "docs/fpds/units/date-picker.md"));
        if (/type="date"/.test(line))
          out.push(finding("L1", r, i + 1, 'a native type="date" input — use DateField / DateKeyField', "docs/fpds/units/date-picker.md"));
        /* NO PRESET VIEW TABS. */
        if (/<FuelOrdersViewBar\b/.test(line) || /^\s+presets=\{/.test(line)) {
          if (/^\s+presets=\{/.test(line))
            out.push(finding("L1", r, i + 1, "preset view tabs — views are the user's; All comes first", "docs/fpds/units/view-row.md"));
        }
      });
    }
    return out;
  },
};

export const rules = {
  name: "fpds-rules",
  segment: "fpds",
  rule: "docs/fpds/07-ux-rules.md",
  check() {
    const out = [];
    const orders = join(ROOT, "prototypes/customer-portal/orders.ts");
    if (existsSync(orders)) {
      const src = read(orders);
      const statuses = src.match(/export const REQUEST_STATUSES = \[([\s\S]*?)\] as const/)?.[1] ?? "";
      for (const bad of ["Quote", "In review", "Accepted", "Rejected", "Change requested", "Cancellation requested", "Invoice disputed", "Action needed"])
        if (statuses.includes(`"${bad}`))
          out.push(finding("L1", rel(orders), 0, `Customer Portal status "${bad}…" — orders are Unassigned → Scheduled, asks are pills`, "docs/fpds/07-ux-rules.md (Orders domain)"));
    }
    for (const file of filesUnder(["prototypes/customer-portal"], [".tsx", ".ts"])) {
      read(file)
        .split("\n")
        .forEach((line, i) => {
          if (isComment(line)) return;
          if (/"Request #"|`REQ-/.test(line))
            out.push(finding("L1", rel(file), i + 1, "a request number — the order number (ORD-…) is the only number", "docs/fpds/07-ux-rules.md (Orders domain)"));
        });
    }
    const viewRow = join(ROOT, "prototypes/unified-view/FuelOrdersViewBar.tsx");
    if (existsSync(viewRow) && />\s*Default\s*</.test(read(viewRow)))
      out.push(finding("L1", "prototypes/unified-view/FuelOrdersViewBar.tsx", 0, 'a "Default" tab — it is "All"', "docs/fpds/units/view-row.md"));
    return out;
  },
};

export const gaps = {
  name: "fpds-gaps",
  segment: "fpds",
  rule: "docs/fpds/evals/golden-prompts.json",
  check() {
    const out = [];
    const path = join(ROOT, "docs/fpds/evals/golden-prompts.json");
    if (!existsSync(join(ROOT, "docs/fpds/register.json"))) return out;
    const { prompts } = JSON.parse(readFileSync(path, "utf8"));
    for (const { prompt, expect } of prompts) {
      const r = resolve(prompt);
      const bad = [];
      if (expect.template && r.template !== expect.template) bad.push(`template ${r.template} ≠ ${expect.template}`);
      for (const u of expect.units ?? []) if (!r.units.includes(u)) bad.push(`missing ${u}`);
      if (expect.audience && r.audience !== expect.audience) bad.push(`audience ${r.audience} ≠ ${expect.audience}`);
      if (expect.gap !== Boolean(r.message)) bad.push(expect.gap ? "no gap message for a real gap" : "a gap message where FPDS has a design");
      for (const m of expect.missing ?? []) if (!r.gaps.some((g) => g.missing === m)) bad.push(`gap "${m}" not named`);
      if (bad.length) out.push(finding("L1", "docs/fpds/evals/golden-prompts.json", 0, `"${prompt}": ${bad.join("; ")}`, "docs/fpds/00-protocol.md"));
    }
    return out;
  },
};

export const ALL = [cards, register, units, rules, gaps];
