#!/usr/bin/env node
/*
  THE EVAL RUNNER.  `npm run eval`

  WHY THIS EXISTS. The five eval segments were written in September and never
  run once. The reason was not that nobody cared: it was that **nothing
  executed them**. Four of the five were prose checkboxes with no stated
  method, there was no command, nothing ran in CI, and a run left no trace —
  so a run could not be distinguished from a reading, and no two runs could
  be compared.

  WHAT IT FIXES, and the three are separate:
    · A COMMAND. Every countable assertion is a check module here.
    · A TRACE. Each run writes `docs/unified-view/evals/results/<date>.md`,
      with the commit it ran against.
    · A DELTA. The run prints what changed since the last results file, which
      is the only way a check answers "is this getting better".

  WHAT IT DOES NOT DO. It never fixes anything, and it holds only L1 rules —
  the ones with exactly one correct answer. **A script that reports L2 is a
  script one commit away from making a design decision**, so judgement lives
  in the segment documents and is answered by a person or an agent reading
  the code. `--full` prints the manual segments' checklist so a run knows
  what it did NOT cover.

  Usage:
    npm run eval              every check, and write the results file
    npm run eval -- --dry     print, write nothing
    npm run eval -- --census  the sheet-variant census as well
*/

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./eval/lib.mjs";
import * as boxedTables from "./eval/boxed-tables.mjs";
import * as tokens from "./eval/tokens.mjs";
import * as sheets from "./eval/sheets.mjs";

const CHECKS = [tokens, boxedTables, sheets];
const RESULTS = join(ROOT, "docs/unified-view/evals/results");

/** The segments that no script covers, so the report can say so out loud. */
const MANUAL = {
  "1-components": "type scale · icon sizes · colour MEANING",
  "2-layouts": "zone order · the rail's contents · widths on screen",
  "3-interactions": "hover/press/keyboard · focus · both themes · contrast",
  "4-content": "every label, and whether the screen explains itself",
  "5-data-and-state": "invariants · derived vs stored · whether it is true",
};

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const showCensus = args.includes("--census");

const sha = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  } catch {
    return "unknown";
  }
})();
const today = new Date().toISOString().slice(0, 10);

/* ───────────────────────────────────────────────────────────────── run ── */

const results = CHECKS.map((c) => ({ check: c, findings: c.check() }));
const all = results.flatMap((r) => r.findings);
const l1 = all.filter((f) => f.layer === "L1");

/* ────────────────────────────────────────────────────────────── report ── */

const lines = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};

say(`\nEVAL — ${today} at ${sha}\n`);

for (const { check, findings } of results) {
  const head = `  ${check.name.padEnd(14)} ${check.segment.padEnd(16)}`;
  if (findings.length === 0) {
    say(`${head} ✓ clean`);
    continue;
  }
  say(`${head} ✗ ${findings.length}`);
  for (const f of findings) {
    say(`      ${f.file}${f.line ? `:${f.line}` : ""}`);
    say(`        ${f.what}`);
    say(`        ${f.rule}`);
  }
}

if (showCensus) {
  say("\n  SHEET VARIANT CENSUS");
  const rows = sheets.census();
  for (const r of rows) {
    const on = Object.entries(r)
      .filter(([k, v]) => v === true && k !== "file")
      .map(([k]) => k);
    say(`      ${r.file.replace("prototypes/unified-view/", "")}`);
    say(`        ${r.size}${on.length ? ` · ${on.join(" · ")}` : ""}`);
  }
  const bySize = {};
  for (const r of rows) bySize[r.size] = (bySize[r.size] ?? 0) + 1;
  say(`      — ${rows.length} sheets: ${Object.entries(bySize).map(([k, v]) => `${v}×${k}`).join(" · ")}`);
}

/* ──────────────────────────────────────────────────────────────── delta ── */

let previous = null;
try {
  const prior = readdirSync(RESULTS).filter((f) => f.endsWith(".md")).sort();
  if (prior.length) {
    const body = readFileSync(join(RESULTS, prior[prior.length - 1]), "utf8");
    const m = body.match(/^<!-- count:(\d+) -->/m);
    if (m) previous = { file: prior[prior.length - 1], count: Number(m[1]) };
  }
} catch { /* no results yet — the first run is the baseline */ }

say("");
if (previous) {
  const delta = all.length - previous.count;
  say(
    `  ${all.length} scripted finding${all.length === 1 ? "" : "s"} · ` +
      `was ${previous.count} in ${previous.file} · ` +
      (delta === 0 ? "no change" : delta > 0 ? `+${delta}` : `${delta}`)
  );
} else {
  say(`  ${all.length} scripted finding${all.length === 1 ? "" : "s"} · first run, this is the baseline`);
}

say("\n  NOT COVERED BY ANY SCRIPT — read these against the segment files:");
for (const [seg, what] of Object.entries(MANUAL)) {
  say(`      ${seg.padEnd(18)} ${what}`);
}
say("");

/* ───────────────────────────────────────────────────────────────── save ── */

if (!dry) {
  mkdirSync(RESULTS, { recursive: true });
  const out = [
    `<!-- count:${all.length} -->`,
    `# Eval run — ${today}`,
    ``,
    `At \`${sha}\`. Scripted checks only; the manual segments are listed at the`,
    `foot and are not covered here.`,
    ``,
    "```",
    ...lines,
    "```",
    ``,
    `## Decisions`,
    ``,
    `> Every L2 finding ends in one: **fix the code**, **fix the document**, or`,
    `> **leave it and write down why**. A finding with no decision is a finding`,
    `> that will be found again next time.`,
    ``,
    `_(fill in on the run)_`,
    ``,
  ].join("\n");
  writeFileSync(join(RESULTS, `${today}.md`), out);
  console.log(`  written → docs/unified-view/evals/results/${today}.md\n`);
}

process.exit(l1.length > 0 ? 1 : 0);
