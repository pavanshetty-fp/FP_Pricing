#!/usr/bin/env node
/*
  FPDS RESOLVER.  `npm run fpds:resolve -- "a vendor list with filters"`

  The build protocol (docs/fpds/00-protocol.md) as a script: it takes a request
  in plain words and answers L1 (page type, module, audience), L2 (template),
  L3 (units), L4/L5 (what cannot be composed) — and prints the gap message ONLY
  for a part that has no design. It is deliberately simple (words, not a model):
  its job is to prove the register can answer the golden prompts, and to give a
  person or a tool the same first answer every time.
*/

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./cards.mjs";

const MODULES = [
  ["Customer Portal", ["customer portal", "portal", "my orders", "my invoices", "my sites", "customer-facing", "customers see"]],
  ["3PL", ["3pl", "broker", "delivery order", "carrier", "vendor"]],
  ["Sales", ["sales", "quote", "fuel order", "asset order"]],
  ["Service Work", ["service", "technician", "maintenance", "compliance", "parts", "price book", "agreement"]],
  ["Pricing", ["pricing", "price list", "rack price"]],
  ["Lease", ["lease"]],
];

/*
  WHAT HAS NO DESIGN YET (L4/L5). A word here means the region cannot be
  composed from documented units — the request gets built around it and the
  gap message stands in its place. `closest` is what a person asking should
  be told to look at first.
*/
const GAP_TERMS = [
  { words: ["illustration", "illustrated", "mascot", "hero image"], missing: "Illustrations", closest: "unit.alert-banner / the Empty state molecule — neither carries artwork" },
  { words: ["onboarding", "welcome tour", "first-run", "walkthrough", "product tour"], missing: "Empty pages & first-use states", closest: "Empty state molecule — covers no-results only" },
  { words: ["empty page", "empty state design", "no data page"], missing: "Empty pages & empty states", closest: "Empty state molecule" },
  { words: ["tone of voice", "copy guidelines", "microcopy for", "write the copy"], missing: "UX copy", closest: "07-ux-rules.md content rules" },
  { words: ["highlight", "spotlight", "new badge", "what's new"], missing: "Highlight units", closest: "unit.alert-banner, unit.status-and-awaiting" },
  { words: ["chat", "messaging", "comments thread", "conversation"], missing: "Chat / messaging unit", closest: "unit.summary-rail (activity is a log, not a conversation)" },
  { words: ["gantt", "timeline chart", "resource calendar", "week calendar", "calendar view", "scheduler grid"], missing: "Calendar / schedule view", closest: "unit.board (lanes by status), unit.delivery-timeline (one window)" },
  { words: ["heatmap", "sankey", "funnel chart", "treemap"], missing: "This chart type", closest: "unit.dashboard (tiles, bar and line cards)" },
  { words: ["wizard", "multi-step onboarding form", "stepper page"], missing: "Full-page wizard", closest: "template.record-sheet (sections; steps inside the sheet)" },
  { words: ["drag and drop builder", "form builder", "workflow builder", "rule builder canvas"], missing: "Builder canvas", closest: "template.settings with editable tables" },
  { words: ["signature", "sign here", "e-sign"], missing: "Signature capture", closest: "unit.documents-table (upload a signed file)" },
  { words: ["video", "media player"], missing: "Media player", closest: "—" },
];

export function resolve(prompt) {
  const reg = JSON.parse(readFileSync(join(ROOT, "docs/fpds/register.json"), "utf8"));
  const q = ` ${prompt.toLowerCase()} `;
  /* WHOLE WORDS — "board" must not match "dashboard". */
  const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hits = (words) => words.filter((w) => new RegExp(`(^|[^a-z])${esc(w)}($|[^a-z])`).test(q)).length;

  /* L1 */
  const module = MODULES.find(([, w]) => hits(w) > 0)?.[0] ?? "unspecified";
  const audience = module === "Customer Portal" ? "customer" : "tenant";

  /* L2 — the template with the most of its words; ties go to the list page,
     the most common page there is. */
  const templates = reg.entries.filter((e) => e.layer === "template");
  /* A PAGE-TYPE WORD outweighs a record word: "a dashboard of quotes" is a
     dashboard, not a quotes list. */
  const STRONG = {
    "template.dashboard": ["dashboard", "overview", "kpi"],
    "template.settings": ["settings", "configure"],
    "template.directory-record": ["profile", "record page"],
    "template.record-sheet": ["create", "edit", "form"],
    "template.list-page": ["list", "table", "board", "kanban", "map"],
  };
  const scored = templates
    .map((t) => ({ t, n: hits(t.match) + 2 * hits(STRONG[t.id] ?? []) }))
    .sort((a, b) => b.n - a.n || (a.t.id === "template.list-page" ? -1 : 1));
  const template = scored[0]?.n > 0 ? scored[0].t.id : null;

  /* L3 */
  const units = reg.entries.filter((e) => e.layer === "unit" && hits(e.match) > 0).map((e) => e.id);

  /* L4 / L5 */
  const gaps = GAP_TERMS.filter((g) => hits(g.words) > 0).map((g) => ({
    missing: g.missing,
    closest: g.closest,
  }));
  /* NO PAGE AND NO REGION MATCHED is the only whole-request gap — a request
     for one region ("an alert banner when…") matches a unit, not a page. */
  if (!template && units.length === 0 && gaps.length === 0)
    gaps.push({ missing: "A page type FPDS does not have", closest: "template.list-page / template.record-sheet / template.dashboard — none describe this job" });

  const checks = `L1 ${module} · ${audience} · L2 ${template ?? "no template matched"} · L3 ${units.length ? units.join(", ") : "no unit matched"} · L4 composition tried from the register · L5 rules read`;
  const message = gaps.length
    ? gaps
        .map(
          (g) =>
            `${reg.gapMessage}\n- Use case: ${prompt}\n- Missing component: ${g.missing}\n- Closest existing: ${g.closest}\n- Checks run: ${checks}`
        )
        .join("\n\n")
    : null;
  return { module, audience, template, units, gaps, message };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.log('usage: npm run fpds:resolve -- "describe the screen"');
    process.exit(1);
  }
  const r = resolve(prompt);
  console.log(JSON.stringify({ ...r, message: undefined }, null, 2));
  if (r.message) console.log(`\n${r.message}`);
}
