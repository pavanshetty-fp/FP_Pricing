/*
  THE MISSES LOG, AS AN EVAL (Pavan, 2026-10-26).

  `docs/fpds/evals/misses.json` holds every miss — something Pavan had to
  point out, or something Claude broke. This module:
    · checks the log is well-formed (ids, patterns, check statuses, dates);
    · holds every "built" guard to a real check name in `npm run eval`;
    · reports each guard still "proposed" as an open finding — the work that
      would stop that miss coming back;
    · keeps `misses.md` in step with the JSON;
    · and prints the trend (`summary()`): misses per week, how many a script
      guards, the patterns that repeat. The goal is a weekly count of 0.
*/

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, finding } from "./lib.mjs";

const LOG = "docs/fpds/evals/misses.json";
const PAGE = "docs/fpds/evals/misses.md";

let CHECK_NAMES = new Set();
/** The runner hands over every check name, so "built" can be held to it. */
export const setCheckNames = (names) => (CHECK_NAMES = new Set(names));

export const load = () => JSON.parse(readFileSync(join(ROOT, LOG), "utf8"));

/** Monday of a date's week, as YYYY-MM-DD. */
const weekOf = (d) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
};

export function render(log = load()) {
  const by = (k) => log.misses.reduce((m, e) => ((m[e[k]] = (m[e[k]] ?? 0) + 1), m), {});
  const st = log.misses.reduce((m, e) => ((m[e.check.status] = (m[e.check.status] ?? 0) + 1), m), {});
  const weeks = log.misses.reduce((m, e) => ((m[weekOf(e.date)] = (m[weekOf(e.date)] ?? 0) + 1), m), {});
  const L = [];
  L.push("# Misses log");
  L.push("");
  L.push("<!-- GENERATED from misses.json by `npm run misses` — edit the JSON, not this page. -->");
  L.push("");
  L.push("Every time Pavan has to point out something that should already have been right — or Claude breaks something — it is logged here, with why it happened and what guards it. `npm run eval` reads the log, prints the trend, and lists every guard still to build. **The goal: the weekly count falls to 0.**");
  L.push("");
  L.push("## How Claude uses this log");
  L.push("");
  L.push("1. **The moment a miss is pointed out** (or found), add an entry to `misses.json` — next id, date, what, where, who found it, the pattern, why it happened on my side, and the check that guards it (`built`, `proposed`, `manual` or `process`).");
  L.push("2. **Build the guard when it can be scripted** (`scripts/eval/guards.mjs`) and flip its status to `built`. A proposed guard shows up as an open finding in every eval run until it exists.");
  L.push("3. **Before reporting any visual change, read the patterns below** and check the ones that apply — every stage, blank and filled rows, both themes, the edges.");
  L.push("4. Run `npm run misses` to regenerate this page, then `npm run eval`.");
  L.push("");
  L.push("## Trend");
  L.push("");
  L.push("| Week of | Misses |");
  L.push("|---|---|");
  for (const w of Object.keys(weeks).sort()) L.push(`| ${w} | ${weeks[w]} |`);
  L.push("");
  L.push(`**${log.misses.length} misses** · found by Pavan ${by("foundBy").pavan ?? 0} · by Claude ${by("foundBy").claude ?? 0} · guarded by a script ${st.built ?? 0} · guard proposed ${st.proposed ?? 0} · needs eyes ${st.manual ?? 0} · process rule ${st.process ?? 0}`);
  L.push("");
  L.push("## Patterns");
  L.push("");
  L.push("| Pattern | What it means | Count |");
  L.push("|---|---|---|");
  const pc = by("pattern");
  for (const [k, v] of Object.entries(log.patterns).sort((a, b) => (pc[b[0]] ?? 0) - (pc[a[0]] ?? 0)))
    L.push(`| \`${k}\` | ${v} | ${pc[k] ?? 0} |`);
  L.push("");
  L.push("## The log");
  L.push("");
  L.push("| # | Date | What was missed | Where | Found by | Pattern | Why (my side) | Guard |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const e of [...log.misses].reverse())
    L.push(`| ${e.id} | ${e.date} | ${e.title} | ${e.where} | ${e.foundBy === "pavan" ? "Pavan" : "Claude"} | \`${e.pattern}\` | ${e.why} | \`${e.check.id}\` · ${e.check.status} |`);
  L.push("");
  L.push("## Guard statuses");
  L.push("");
  for (const [k, v] of Object.entries(log.checkStatus)) L.push(`- **${k}** — ${v}`);
  L.push("");
  return L.join("\n");
}

export const name = "misses";
export const segment = "fpds";
export const rule = `${LOG} — the misses log`;

export function check() {
  const out = [];
  if (!existsSync(join(ROOT, LOG))) return [finding("L1", LOG, null, "misses log missing", rule)];
  const log = load();
  const ids = new Set();
  const STATUS = Object.keys(log.checkStatus);
  for (const e of log.misses) {
    const where = `${e.id ?? "?"}`;
    for (const k of ["id", "date", "title", "where", "foundBy", "pattern", "why"])
      if (!e[k]) out.push(finding("L1", LOG, null, `${where}: missing "${k}"`, rule));
    if (ids.has(e.id)) out.push(finding("L1", LOG, null, `${where}: duplicate id`, rule));
    ids.add(e.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? "")) out.push(finding("L1", LOG, null, `${where}: date must be YYYY-MM-DD`, rule));
    if (!["pavan", "claude"].includes(e.foundBy)) out.push(finding("L1", LOG, null, `${where}: foundBy must be pavan or claude`, rule));
    if (!log.patterns[e.pattern]) out.push(finding("L1", LOG, null, `${where}: unknown pattern "${e.pattern}"`, rule));
    if (!e.check || !STATUS.includes(e.check.status)) out.push(finding("L1", LOG, null, `${where}: check status must be one of ${STATUS.join(", ")}`, rule));
    else if (e.check.status === "built" && CHECK_NAMES.size && !CHECK_NAMES.has(e.check.id))
      out.push(finding("L1", LOG, null, `${where}: guard "${e.check.id}" is marked built but no eval check has that name`, rule));
  }
  /* EVERY PROPOSED GUARD IS OPEN WORK — one finding per guard, naming the
     misses it would have caught. */
  const proposed = {};
  for (const e of log.misses) if (e.check?.status === "proposed") (proposed[e.check.id] ??= []).push(e.id);
  for (const [id, ms] of Object.entries(proposed))
    out.push(finding("L1", LOG, null, `guard "${id}" not built yet — would catch ${ms.join(", ")}`, rule));
  /* THE PAGE FOLLOWS THE JSON. */
  const page = existsSync(join(ROOT, PAGE)) ? readFileSync(join(ROOT, PAGE), "utf8") : "";
  if (page.trim() !== render(log).trim()) out.push(finding("L1", PAGE, null, "misses.md is out of date — run `npm run misses`", rule));
  return out;
}

/** The trend lines the runner prints after the findings. */
export function summary() {
  const log = load();
  const today = new Date();
  const ago = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const last7 = log.misses.filter((e) => e.date >= ago(7));
  const prev7 = log.misses.filter((e) => e.date >= ago(14) && e.date < ago(7));
  const built = log.misses.filter((e) => e.check?.status === "built").length;
  const pc = log.misses.reduce((m, e) => ((m[e.pattern] = (m[e.pattern] ?? 0) + 1), m), {});
  const top = Object.entries(pc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(" · ");
  return [
    `  MISSES LOG — ${log.misses.length} logged · last 7 days ${last7.length} (week before ${prev7.length}) · goal 0`,
    `      guarded by a script ${built}/${log.misses.length} (${Math.round((built / Math.max(1, log.misses.length)) * 100)}%) · repeating: ${top}`,
  ];
}
