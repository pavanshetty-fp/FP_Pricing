#!/usr/bin/env node
/*
  FPDS BUILD.  `npm run fpds:build`

  From the spec cards in `docs/fpds/` it writes, in one pass, so they can never
  disagree:

    docs/fpds/register.json   what exists — every card, its code, its "use when",
                              the words a request is matched on, the gap message
    public/r/*.json           the INSTALLABLE REGISTRY (shadcn format): one item
                              per card with code, every local file it imports
                              and the npm packages it needs, plus `fpds-theme`
    docs/fpds/FPDS.md         the whole design system as ONE file to install
    docs/fpds/install/*       the short rules file each tool reads (Cursor,
                              Lovable, Claude, any agent) — all point at FPDS.md
*/

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { DOCS, ROOT, readCards } from "./cards.mjs";

export const OWNER = "pavanshetty@fleetpanda.com";
export const GAP_MESSAGE =
  "This unit needs a tweak in design/new design. Please contact the owner to get a design for this gap, pavanshetty@fleetpanda.com.";
/* Where the registry is served from — GitHub Pages of this repo. */
export const REGISTRY_URL = "https://pavanshetty-rgb.github.io/FP-DS-2026/r";

/*
  THE WORDS A REQUEST IS MATCHED ON (protocol L1–L3). Templates are matched on
  the page type; units on the region. Kept here, next to the register they
  feed, so a new card that needs matching gets its words in the same commit.
*/
export const MATCH = {
  "template.list-page": ["list", "table", "index", "browse", "all orders", "orders page", "records", "directory", "kanban", "board", "pipeline", "lanes", "map view", "invoices", "customers", "vendors", "parts", "technicians", "agreements", "quotes", "assets", "users"],
  "template.record-sheet": ["create", "new", "add", "edit", "form", "detail", "details", "sheet", "order sheet", "update", "request"],
  "template.directory-record": ["profile", "master data", "customer record", "vendor record", "product record", "asset record"],
  "template.dashboard": ["dashboard", "overview", "kpi", "metrics", "summary", "today", "analytics home"],
  "template.settings": ["settings", "configuration", "configure", "preferences for the module", "setup"],
  "template.app-frame": ["navigation", "sidebar", "shell", "layout", "top bar", "header"],
  "unit.view-row": ["saved view", "views", "tabs", "export", "create button"],
  "unit.toolbar": ["search", "filters", "group by", "display switch", "toolbar"],
  "unit.filter-panel": ["filter", "filters", "facets", "recent history"],
  "unit.chip-shelf": ["chips", "applied filters"],
  "unit.view-bar": ["count", "column settings", "show hide columns", "search by column", "card configuration"],
  "unit.data-table": ["table", "columns", "sort", "rows"],
  "unit.pagination": ["pagination", "pages", "rows per page"],
  "unit.export-sheet": ["export", "download csv"],
  "unit.date-picker": ["date", "date range", "calendar", "planned date", "due date"],
  "unit.standard-list": ["simple list", "reference list", "catalog", "price book"],
  "unit.board": ["board", "kanban", "lanes", "pipeline", "swimlane"],
  "unit.map": ["map", "location", "trucks", "pins", "route"],
  "unit.record-sheet": ["sheet", "form", "create", "edit", "detail"],
  "unit.summary-rail": ["summary", "activity", "history", "audit log"],
  "unit.lines-table": ["line items", "products", "tanks", "quantity", "top off", "order lines"],
  "unit.documents-table": ["documents", "attachments", "files", "upload"],
  "unit.delivery-timeline": ["delivery window", "time window", "preferred time"],
  "unit.recurring-section": ["recurring", "repeat", "frequency", "schedule rule"],
  "unit.alert-banner": ["alert", "banner", "warning", "attention"],
  "unit.bulk-bar": ["bulk", "select many", "mass edit"],
  "unit.dashboard": ["tiles", "stat", "kpi", "chart", "metric"],
  "unit.app-shell": ["navigation", "sidebar", "accessibility", "global search", "top bar"],
  "unit.status-and-awaiting": ["status", "pill", "awaiting", "confirmation", "late"],
};

const NPM = /^(?:@[^/]+\/)?[^./@][^/]*/;
const KNOWN_NPM = new Set(["radix-ui", "lucide-react", "sonner", "react-day-picker", "class-variance-authority", "clsx", "tailwind-merge", "cmdk", "recharts", "leaflet", "input-otp", "embla-carousel-react", "react-resizable-panels", "tw-animate-css"]);

/** A code path from an id line, made repo-relative and checked to exist. */
export function resolveCode(paths) {
  const out = [];
  let lastDir = "";
  for (const p of paths) {
    let full = join(ROOT, p);
    if (!existsSync(full) && lastDir) full = join(lastDir, p);
    if (existsSync(full)) {
      out.push(relative(ROOT, full));
      lastDir = dirname(full);
    } else out.push(null);
  }
  return out;
}

/** Every local file an entry file imports, transitively, plus its npm packages. */
function importGraph(entries) {
  const seen = new Set();
  const npm = new Set();
  const stack = entries.map((e) => join(ROOT, e));
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    if (!/\.(tsx?|css)$/.test(file)) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g)) {
      const spec = m[1] ?? m[2];
      let target = null;
      if (spec.startsWith("@/")) target = join(ROOT, "src", spec.slice(2));
      else if (spec.startsWith(".")) target = resolve(dirname(file), spec);
      else {
        const pkg = spec.match(NPM)?.[0];
        if (pkg && KNOWN_NPM.has(pkg)) npm.add(pkg);
        continue;
      }
      for (const cand of [target, `${target}.tsx`, `${target}.ts`, join(target, "index.ts"), join(target, "index.tsx")]) {
        if (existsSync(cand) && statSync(cand).isFile()) {
          stack.push(cand);
          break;
        }
      }
    }
  }
  return { files: [...seen].map((f) => relative(ROOT, f)).sort(), npm: [...npm].sort() };
}

/** Where a repo file lands in the consumer's project. */
const targetOf = (p) => (p.startsWith("src/") ? p : `src/fpds/${p.replace(/^prototypes\//, "")}`);

const firstLines = (s = "", n = 3) =>
  s
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && l !== "—")
    .slice(0, n);

export function build({ write = true } = {}) {
  const cards = readCards();
  const register = {
    name: "FPDS — FleetPanda Design System",
    owner: OWNER,
    gapMessage: GAP_MESSAGE,
    protocol: "docs/fpds/00-protocol.md",
    registryUrl: REGISTRY_URL,
    generated: new Date().toISOString().slice(0, 10),
    entries: cards.map((c) => {
      const use = c.text["Use when / Don't use when"] ?? "";
      return {
        id: c.id,
        title: c.title,
        layer: c.layer,
        doc: `${c.file}:${c.line}`,
        code: resolveCode(c.code).filter(Boolean),
        registry: c.registry,
        install: `npx shadcn@latest add ${REGISTRY_URL}/${c.registry}.json`,
        purpose: firstLines(c.text["Purpose"], 2).join(" "),
        useWhen: firstLines(use.split(/\n(?=[-*]\s*Don)/)[0], 4),
        dontUseWhen: firstLines((use.match(/[-*]\s*Don[\s\S]*/) ?? [""])[0], 4),
        match: MATCH[c.id] ?? [],
      };
    }),
  };
  if (!write) return { cards, register };

  writeFileSync(join(DOCS, "register.json"), JSON.stringify(register, null, 2) + "\n");

  /* THE REGISTRY — one item per card with code, plus the theme. */
  const outDir = join(ROOT, "public/r");
  mkdirSync(outDir, { recursive: true });
  const items = [];
  const theme = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "fpds-theme",
    type: "registry:file",
    title: "FPDS theme — tokens, light/dark, accessibility levels",
    description: "src/index.css of the FleetPanda DS. Import it once at the app root.",
    dependencies: ["tw-animate-css"],
    files: [{ path: "src/index.css", type: "registry:file", target: "src/fpds/theme.css", content: readFileSync(join(ROOT, "src/index.css"), "utf8") }],
  };
  writeFileSync(join(outDir, "fpds-theme.json"), JSON.stringify(theme));
  items.push({ name: theme.name, type: theme.type, title: theme.title, description: theme.description });
  for (const e of register.entries) {
    const code = e.code.filter((p) => /\.(tsx?)$/.test(p));
    if (code.length === 0) continue;
    const { files, npm } = importGraph(code);
    const item = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: e.registry,
      type: "registry:block",
      title: `${e.title} (${e.layer})`,
      description: `${e.purpose} — spec: ${e.doc}. Needs fpds-theme.`,
      dependencies: npm,
      registryDependencies: [`${REGISTRY_URL}/fpds-theme.json`],
      files: files.map((p) => ({ path: p, type: "registry:file", target: targetOf(p), content: readFileSync(join(ROOT, p), "utf8") })),
    };
    writeFileSync(join(outDir, `${e.registry}.json`), JSON.stringify(item));
    items.push({ name: item.name, type: item.type, title: item.title, description: item.description });
  }
  writeFileSync(
    join(outDir, "registry.json"),
    JSON.stringify({ $schema: "https://ui.shadcn.com/schema/registry.json", name: "fpds", homepage: REGISTRY_URL.replace(/\/r$/, ""), items }, null, 2) + "\n"
  );

  /* ONE FILE TO INSTALL — the docs in reading order. */
  const order = ["README.md", "00-protocol.md", "01-foundations.md", "02-atoms.md", "03-molecules.md"];
  const unitFiles = existsSync(join(DOCS, "units")) ? readdirSync(join(DOCS, "units")).filter((f) => f.endsWith(".md")).sort().map((f) => `units/${f}`) : [];
  const rest = ["05-templates.md", "06-pages.md", "07-ux-rules.md", "08-interaction-rules.md", "09-later.md", "10-archive.md", "evals/README.md"];
  const parts = [...order, ...unitFiles, ...rest]
    .filter((f) => existsSync(join(DOCS, f)))
    .map((f) => `\n\n<!-- ===== docs/fpds/${f} ===== -->\n\n` + readFileSync(join(DOCS, f), "utf8"));
  writeFileSync(
    join(DOCS, "FPDS.md"),
    `# FPDS — the whole design system in one file\n\nGenerated by \`npm run fpds:build\` on ${register.generated}. Do not edit; edit the source files.\n` +
      parts.join("") +
      `\n\n<!-- ===== register (ids) ===== -->\n\n## Register\n\n| id | layer | install |\n|---|---|---|\n` +
      register.entries.map((e) => `| \`${e.id}\` | ${e.layer} | \`${e.install}\` |`).join("\n") +
      "\n"
  );

  /* THE SHORT RULES FILE EACH TOOL READS. */
  const instDir = join(DOCS, "install");
  mkdirSync(instDir, { recursive: true });
  const rules = `You build UI for FleetPanda with FPDS, the FleetPanda Design System.

1. Read docs/fpds/FPDS.md before building anything. It is binding.
2. Follow the build protocol (FPDS.md › "the build protocol"): classify the request
   (L1), match a template (L2), match every region to a unit (L3), compose only from
   documented options (L4), check the UX and interaction rules (L5).
3. Use the real code, never re-create it. The org-level package is being set up; until
   it is published, copy each unit from the code path named on its card (FPDS.md › the
   unit's id line) and the theme from src/index.css. Once published:
   npx shadcn@latest add ${REGISTRY_URL}/fpds-theme.json  (once), then the unit you need.
4. Tokens only: no raw colours, sizes, radii or shadows. Solid fills, never opacity washes.
   US English in everything a user reads.
5. If a region fails all five checks, build everything else and put this message in its
   place, with the use case, the missing component, the closest existing unit and the
   checks you ran:
   "${GAP_MESSAGE}"
6. Not designed yet (always the message): new UX copy, new empty pages/states, new
   highlight units, illustrations.
7. Reuse the closest pattern already in the product before any generic component.
8. Look before you report (UX-164): check every stage the screen appears in, a blank
   and a filled row, light and dark, and the edges (last rows, card rims, repeated
   values). Read the patterns in docs/fpds/evals/misses.md.
`;
  writeFileSync(join(instDir, "AGENTS.md"), `# FPDS — rules for any coding agent\n\n${rules}`);
  writeFileSync(join(instDir, "CLAUDE.md"), `# FPDS — rules for Claude\n\n${rules}`);
  writeFileSync(join(instDir, "lovable-knowledge.md"), `# FPDS — paste into Lovable › Project knowledge\n\n${rules}`);
  writeFileSync(join(instDir, "fpds.mdc"), `---\ndescription: FleetPanda Design System — binding for all UI work\nglobs: ["**/*.tsx", "**/*.ts", "**/*.css"]\nalwaysApply: true\n---\n\n${rules}`);
  return { cards, register, items };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { register, items } = build();
  console.log(`FPDS: ${register.entries.length} cards → register.json · ${items.length} registry items → public/r · FPDS.md · install/`);
}
