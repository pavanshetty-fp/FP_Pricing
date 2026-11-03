/*
  GUARDS — checks born from the misses log (`docs/fpds/evals/misses.json`).

  Each one exists because Pavan had to point the same thing out by hand. The
  log names the check that guards a miss; this file is where those checks
  live, so a miss that has a check here should not come back silently.
  (Pavan, 2026-10-26: "this will become a part of eval to check that such
  incidents become fewer or become 0% at some point.")

  L1 only — each has exactly one right answer.
*/

import { filesUnder, read, rel, finding } from "./lib.mjs";

const SCAN = ["prototypes", "src"];
const tsx = () => filesUnder(SCAN, [".tsx"]);
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/* ── us-spelling (M-004) ─────────────────────────────────────────────────
   UK spellings in what a user reads: string literals and JSX text. Comments
   and identifiers are not UI. "grey" is excluded — it is a token/colour
   NAME in code, never shown as a word. */
const UK = /\b(colours?|programmes?|fulfilment|cancell(?:ed|ing)|catalogues?|licences?|behaviours?|centred|centre|organisation|favourite|analyse|labour)\b/i;
export const usSpelling = {
  name: "us-spelling",
  segment: "4-content",
  rule: "misses M-004 — US English in every string the user reads",
  check() {
    const out = [];
    for (const f of tsx()) {
      read(f).split("\n").forEach((l, i) => {
        const t = l.trim();
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*")) return;
        for (const m of l.matchAll(/"([^"\n]*)"|`([^`\n]*)`|>([^<>{}\n]+)</g)) {
          const seg = m[1] ?? m[2] ?? m[3] ?? "";
          const hit = seg.match(UK);
          if (hit) out.push(finding("L1", rel(f), i + 1, `UK spelling "${hit[1]}" in "${seg.trim().slice(0, 50)}"`, this.rule));
        }
      });
    }
    return out;
  },
};

/* ── th-align (M-005) ────────────────────────────────────────────────────
   A <th> with no alignment class is CENTRED by the browser — the "left-align
   every table" sweep removed text-right and left the Qty header centred.
   Every header says its alignment (DS: all left unless Pavan names one). */
export const thAlign = {
  name: "th-align",
  segment: "2-layouts",
  rule: "misses M-005 — every table header declares text-left (a bare <th> centres)",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      /* Class constants in this file that carry an alignment, e.g.
         `const TH = "px-3 py-2.5 text-left"`. */
      const aligned = new Set(
        [...src.matchAll(/const ([A-Z_][A-Z0-9_]*)\s*=\s*"[^"]*\btext-(?:left|right|center)\b[^"]*"/g)].map((m) => m[1])
      );
      for (const m of src.matchAll(/<th\b([^>]*)>/g)) {
        const attrs = m[1];
        if (/aria-hidden/.test(attrs)) continue;
        if (/text-(left|right|center)/.test(attrs)) continue;
        /* A shared constant that carries the alignment — {TH} or cn(TH, …). */
        const ident = attrs.match(/className=\{(?:cn\()?([A-Z_][A-Z0-9_]*)\b/);
        if (ident && aligned.has(ident[1])) continue;
        /* A mention in a comment is not a header. */
        const lineStart = src.lastIndexOf("\n", m.index) + 1;
        if (/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(src.slice(lineStart, m.index))) continue;
        out.push(finding("L1", rel(f), lineOf(src, m.index), `<th${attrs.slice(0, 60)}> has no alignment`, this.rule));
      }
    }
    return out;
  },
};

/* ── banner-position (M-001; flipped 2026-11-02) ──────────────────────────
   The list alert banner sits ABOVE the toolbar (search, Filters, chips) —
   every module. Under it, it cut across the line joining the table to its
   tools (Pavan, 2026-11-02). */
export const bannerPosition = {
  name: "banner-position",
  segment: "2-layouts",
  rule: "Pavan 2026-11-02 — AlertBanner comes before the ListToolbar (search, filters), after the view tabs",
  check() {
    const out = [];
    for (const f of filesUnder(["prototypes"], [".tsx"])) {
      const src = read(f);
      const bar = src.indexOf("<ListToolbar");
      if (bar < 0) continue;
      const banner = src.search(/<AlertBanner\b|\{banner &&/);
      if (banner < 0) continue;
      if (banner > bar) out.push(finding("L1", rel(f), lineOf(src, banner), "alert banner is under the toolbar", this.rule));
    }
    return out;
  },
};

/* ── multipick-any-row (M-015) ───────────────────────────────────────────
   A row-adding picker offers several at once from ANY row — blank or filled
   (the row's own value opens ticked). `multiple={x ? undefined : …}` turns
   it off on filled rows. */
export const multipickAnyRow = {
  name: "multipick-any-row",
  segment: "3-interactions",
  rule: "misses M-015 — a row picker's `multiple` is never conditional on the row being empty",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      for (const m of src.matchAll(/multiple=\{\s*([^{}]{0,80}?)\?\s*undefined/g)) {
        out.push(finding("L1", rel(f), lineOf(src, m.index), `multi-pick switched off when \`${m[1].trim()}\` is set`, this.rule));
      }
    }
    return out;
  },
};

/* ── css-tokens (M-009) ──────────────────────────────────────────────────
   Every `-fp-` colour class used in the code resolves to a `--color-fp-…`
   in src/index.css. A stylesheet that lost a block (1,100 lines, 2026-10-25)
   shows up here as classes pointing at nothing. */
export const cssTokens = {
  name: "css-tokens",
  segment: "1-components",
  rule: "misses M-009 — every fp colour class has its --color token in src/index.css",
  check() {
    const css = read(filesUnder(["src"], [".css"]).find((f) => f.endsWith("index.css")));
    const defined = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    /* Classes written out in the stylesheet itself (e.g. .bg-fp-highlight). */
    const classes = new Set([...css.matchAll(/\.(?:bg|text|border)-(fp-[a-z0-9-]+)\s*\{/g)].map((m) => m[1]));
    const out = [];
    const seen = new Set();
    for (const f of tsx()) {
      const src = read(f);
      for (const m of src.matchAll(/\b(?:bg|text|border(?:-[trblxy])?|ring|fill|stroke|divide|outline|decoration|from|to|via|placeholder|caret|accent)-(fp-[a-z0-9-]+?)(?:\/\d+)?(?=[\s"'`\]])/g)) {
        const tok = m[1];
        if (defined.has(tok) || classes.has(tok) || seen.has(tok)) continue;
        seen.add(tok);
        out.push(finding("L1", rel(f), lineOf(src, m.index), `class uses ${tok}, which src/index.css does not define`, this.rule));
      }
    }
    return out;
  },
};

/* ── double-stroke (M-017) ───────────────────────────────────────────────
   `border-y` on a row inside a bordered card stacks on the card's rim at the
   bottom edge. A row draws the rule ABOVE it; the card closes itself. */
export const doubleStroke = {
  name: "double-stroke",
  segment: "1-components",
  rule: "misses M-017 — rows use border-t (or last:border-b-0), never border-y",
  check() {
    const out = [];
    for (const f of filesUnder(["prototypes"], [".tsx"])) {
      read(f).split("\n").forEach((l, i) => {
        if (/\bborder-y\b/.test(l)) out.push(finding("L1", rel(f), i + 1, "border-y on a row", this.rule));
      });
    }
    return out;
  },
};

export const ALL = [usSpelling, thAlign, bannerPosition, multipickAnyRow, cssTokens, doubleStroke];

/* ── alpha-fill (M-002) ──────────────────────────────────────────────────
   Banner, board lanes and board cards fill SOLID — a colour mixed into the
   surface — never an opacity wash (`bg-x/10`). Hover/focus states may. */
const SOLID_FILL = ["src/components/ui/alert-banner.tsx", "prototypes/unified-view/threepl/BrokerBoard.tsx"];
export const alphaFill = {
  name: "alpha-fill",
  segment: "1-components",
  rule: "misses M-002 — banner and board fills are solid mixes, never bg-…/NN washes",
  check() {
    const out = [];
    for (const f of filesUnder(["src", "prototypes"], [".tsx"]).filter((x) => SOLID_FILL.some((s) => x.endsWith(s)))) {
      const src = read(f);
      for (const m of src.matchAll(/(?<![:\w-])bg-[a-z0-9-]+\/\d+/g))
        out.push(finding("L1", rel(f), lineOf(src, m.index), `opacity fill ${m[0]}`, this.rule));
    }
    return out;
  },
};

/* ── banner-anatomy (M-003) ──────────────────────────────────────────────
   Every alert on a list wears one anatomy: count in the tag + "View
   details" that filters (`onApply`). An alert literal with a tag and no
   onApply is the odd one out — unless the file maps its alert definitions
   through one place that adds onApply to all of them. */
export const bannerAnatomy = {
  name: "banner-anatomy",
  segment: "2-layouts",
  rule: "misses M-003 — every list alert has onApply (View details), like the rest",
  check() {
    const out = [];
    for (const f of filesUnder(["prototypes"], [".tsx"])) {
      const src = read(f);
      if (!src.includes("<AlertBanner")) continue;
      const mapped = /tag:\s*\w+\.tag,[\s\S]{0,400}?onApply:/.test(src);
      const tags = [...src.matchAll(/\n\s*tag: "/g)].map((m) => m.index);
      tags.forEach((t, k) => {
        const seg = src.slice(t, tags[k + 1] ?? t + 3000);
        if (!/onApply:/.test(seg) && !mapped) out.push(finding("L1", rel(f), lineOf(src, t) + 1, "alert without View details (onApply)", this.rule));
      });
    }
    return out;
  },
};

/* ── registry-links (M-008) ──────────────────────────────────────────────
   Install links are offered only once they can work: the registry URL's
   owner is this repo's owner — or the install files say the package is not
   published yet. */
import { execSync } from "node:child_process";
export const registryLinks = {
  name: "registry-links",
  segment: "fpds",
  rule: "misses M-008 — install links point at a real registry, or say it is pending",
  check() {
    const build = read(filesUnder(["scripts/fpds"], [".mjs"]).find((f) => f.endsWith("build.mjs")));
    const url = build.match(/REGISTRY_URL = "https:\/\/([^.]+)\.github\.io/)?.[1];
    let owner = "";
    try {
      owner = execSync("git remote get-url origin", { cwd: new URL("../..", import.meta.url) }).toString().match(/github\.com[:/]([^/]+)\//)?.[1] ?? "";
    } catch { /* no remote */ }
    const pending = /until\s+it\s+is\s+published/.test(build);
    if (url && owner && url !== owner && !pending)
      return [finding("L1", "scripts/fpds/build.mjs", null, `registry URL owner "${url}" is not the repo owner "${owner}" and nothing says it is pending`, this.rule)];
    return [];
  },
};

/* ── toolbar-gaps (M-012) ────────────────────────────────────────────────
   The toolbar's groups sit 12px apart — no wider spacer between the date
   and the view switch. */
export const toolbarGaps = {
  name: "toolbar-gaps",
  segment: "2-layouts",
  rule: "misses M-012 — one 12px gap between toolbar groups",
  check() {
    const f = filesUnder(["prototypes"], [".tsx"]).find((x) => x.endsWith("unified-view/ListToolbar.tsx"));
    const src = read(f);
    const out = [];
    for (const m of src.matchAll(/<div className="w-(\d+) shrink-0" aria-hidden \/>/g))
      if (Number(m[1]) > 1) out.push(finding("L1", rel(f), lineOf(src, m.index), `spacer w-${m[1]} widens a toolbar gap past 12px`, this.rule));
    return out;
  },
};

/* ── unique-options (M-016) ──────────────────────────────────────────────
   A site's asset list names each asset once — a picker can't tell two of
   the same name apart. */
export const uniqueOptions = {
  name: "unique-options",
  segment: "5-data-and-state",
  rule: "misses M-016 — asset names are unique within a site",
  check() {
    const out = [];
    for (const f of filesUnder(["prototypes"], [".ts"])) {
      const src = read(f);
      for (const m of src.matchAll(/assets:\s*\[([\s\S]*?)\]/g)) {
        const names = [...m[1].matchAll(/name:\s*"([^"]+)"/g)].map((x) => x[1]);
        const dup = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
        if (dup.length) out.push(finding("L1", rel(f), lineOf(src, m.index), `duplicate asset name ${dup.join(", ")}`, this.rule));
      }
    }
    return out;
  },
};

/* ── read-head (M-020) ───────────────────────────────────────────────────
   On a read stage every unit heading speaks in the read voice: in the 3PL
   order sheet, every SheetSection inside the locked block uses READ_HEAD,
   and so does Vendor when locked. */
export const readHead = {
  name: "read-head",
  segment: "1-components",
  rule: "misses M-020 — read-stage unit headings use READ_HEAD",
  check() {
    const f = filesUnder(["prototypes"], [".tsx"]).find((x) => x.endsWith("threepl/BrokerOrderSheet.tsx"));
    const src = read(f);
    const out = [];
    const start = src.indexOf("{locked && (\n        <div");
    if (start < 0) return [finding("L1", rel(f), null, "locked read block not found", this.rule)];
    const end = src.indexOf("\n      )}", start);
    const block = src.slice(start, end);
    for (const m of block.matchAll(/<SheetSection\b([^>]*)>/g))
      if (!/headingClassName=\{READ_HEAD\}/.test(m[1])) out.push(finding("L1", rel(f), lineOf(src, start + m.index), "read unit heading without READ_HEAD", this.rule));
    if (!/title="Vendor"[\s\S]{0,200}headingClassName=\{locked \? READ_HEAD/.test(src))
      out.push(finding("L1", rel(f), null, "Vendor heading doesn't switch to READ_HEAD when locked", this.rule));
    return out;
  },
};

/* ── one-font ─────────────────────────────────────────────────────────────
   Geist is the only typeface (Pavan, 2026-10-27): weights and sizes carry the
   hierarchy. No mono or serif utility, no inline font family, and every
   font-family in the stylesheet resolves to Geist. */
export const oneFont = {
  name: "one-font",
  segment: "1-components",
  rule: "Geist only — no second typeface anywhere",
  check() {
    const out = [];
    for (const f of tsx())
      read(f).split("\n").forEach((l, i) => {
        const hit = l.match(/\bfont-(mono|serif)\b|fontFamily\s*:/);
        if (hit) out.push(finding("L1", rel(f), i + 1, `second typeface: ${hit[0]}`, this.rule));
      });
    const css = filesUnder(["src"], [".css"]);
    for (const f of css)
      read(f).split("\n").forEach((l, i) => {
        const m = l.match(/(?:^|[;{\s])(--font-(?:sans|mono|serif)|font-family)\s*:\s*([^;]+)/);
        if (m && !/Geist|var\(--font-sans\)|inherit/.test(m[2])) out.push(finding("L1", rel(f), i + 1, `font not Geist: ${m[2].trim()}`, this.rule));
      });
    return out;
  },
};

/* ── no-empty-options (M-030) ─────────────────────────────────────────────
   EVERY PICKER ON A CREATE FORM HAS SOMETHING IN IT (Pavan, 2026-10-29: "add
   data for everything … nothing should be blank … I don't have to tell this
   again and again"). Loads the 3PL sample data itself and checks:
   - every exported option list has at least 3 entries (JOB_TYPES excepted);
   - every product loads somewhere: ≥2 terminals, ≥3 loading accounts, and
     every terminal → supplier → account step offers at least one;
   - loading accounts are alphanumeric numbers, never names;
   - every ship-to has ≥3 assets on every asset-picker tab (Fuel with and
     without a monitor, Bulk Lubricants, Packaged Products). */
const TWO_IS_FINE = new Set(["JOB_TYPES"]);
export const noEmptyOptions = {
  name: "no-empty-options",
  segment: "4-content",
  rule: "misses M-030 — every create-form picker has ≥3 things to pick, at every step",
  async check() {
    const { createJiti } = await import("jiti");
    const path = await import("node:path");
    const root = process.cwd();
    const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") }, jsx: true });
    const dir = "prototypes/unified-view/threepl";
    const load = (f) => jiti.import(path.join(root, dir, f));
    const out = [];
    for (const f of ["orders.ts", "vendors.ts", "directory.ts", "recurringPrograms.ts", "recurringRules.ts"]) {
      const m = await load(f);
      for (const [k, v] of Object.entries(m))
        if (Array.isArray(v) && v.length < 3 && !TWO_IS_FINE.has(k))
          out.push(finding("L1", `${dir}/${f}`, null, `${k} offers only ${v.length}`, this.rule));
    }
    const o = await load("orders.ts");
    const { siteTank } = await load("tankMonitors.ts");
    for (const p of o.PRODUCTS) {
      const all = o.loadOptions([p]);
      if (all.terminals.length < 2 || all.accounts.length < 3)
        out.push(finding("L1", `${dir}/orders.ts`, null, `${p}: ${all.terminals.length} terminals, ${all.accounts.length} loading accounts`, this.rule));
      for (const t of all.terminals) {
        const byT = o.loadOptions([p], t);
        if (!byT.suppliers.length) out.push(finding("L1", `${dir}/orders.ts`, null, `${p} at ${t}: no supplier`, this.rule));
        for (const s of byT.suppliers)
          if (!o.loadOptions([p], t, s).accounts.length)
            out.push(finding("L1", `${dir}/orders.ts`, null, `${p} at ${t} from ${s}: no loading account`, this.rule));
      }
    }
    for (const a of o.LOADING_ACCOUNTS)
      if (!/^[A-Z0-9]+-\d{3,}$/.test(a.name))
        out.push(finding("L1", `${dir}/orders.ts`, null, `loading account "${a.name}" is not an alphanumeric number`, this.rule));
    for (const site of o.SHIP_TO_SITES) {
      const n = { "Fuel · monitor": 0, "Fuel · no monitor": 0, "Bulk Lubricants": 0, "Packaged Products": 0 };
      for (const a of site.assets) {
        const c = o.categoryOfAsset(a.name, a.product);
        if (c === "Fuel") n[siteTank(site.name, a.name, a.product, a.rental, a.monitor).monitor ? "Fuel · monitor" : "Fuel · no monitor"]++;
        else n[c]++;
      }
      for (const [tab, k] of Object.entries(n))
        if (k < 3) out.push(finding("L1", `${dir}/orders.ts`, null, `${site.name}: ${tab} has ${k} assets`, this.rule));
    }
    return out;
  },
};

ALL.push(alphaFill, bannerAnatomy, registryLinks, toolbarGaps, uniqueOptions, readHead, oneFont, noEmptyOptions);

/* ── filterable-table-unit (M-039) ───────────────────────────────────────
   A view people search and filter is a LIST, so its table is the list's
   full unit (`ListTable`: sorts, moves, resizes, column search, row opens)
   — never the small related-records `SheetTable`. Asset 360's three views
   were built on SheetTable under a filter bar. */
export const filterableTableUnit = {
  name: "filterable-table-unit",
  segment: "2-layouts",
  rule: "misses M-039 — a searched/filtered view uses ListTable, not SheetTable",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      if (!/<SheetTable\b/.test(src)) continue;
      if (!/<(ListFilters|ListToolbar)\b/.test(src)) continue;
      const i = src.search(/<SheetTable\b/);
      out.push(finding("L1", rel(f), lineOf(src, i), "SheetTable under a search/filter bar — use ListTable (the full list unit)", this.rule));
    }
    return out;
  },
};

/* ── full-table-unit (M-040) ─────────────────────────────────────────────
   The table unit is whole whatever the row count: its frame fills the
   height (a flex-1 container) and pagination sits at its foot. Three rows
   of data still show the full unit (Pavan, 2026-11-02). */
export const fullTableUnit = {
  name: "full-table-unit",
  segment: "2-layouts",
  rule: "misses M-040 — every ListTable is the full unit: frame fills the height, pagination at its foot",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      const i = src.search(/<ListTable\b/);
      if (i < 0) continue;
      if (!/<TablePagination\b/.test(src))
        out.push(finding("L1", rel(f), lineOf(src, i), "ListTable without TablePagination at its foot", this.rule));
      if (!/\bflex-1\b/.test(src))
        out.push(finding("L1", rel(f), lineOf(src, i), "ListTable's frame does not fill the height (no flex-1 container)", this.rule));
    }
    return out;
  },
};

/* ── read-sheet-footer (M-041) ───────────────────────────────────────────
   A sheet with nothing to commit — its submit only closes it — has no
   footer at all: no rule, no Confirm (Pavan, 2026-11-02, Asset 360). */
export const readSheetFooter = {
  name: "read-sheet-footer",
  segment: "2-layouts",
  rule: "misses M-041 — a sheet whose submit only closes it passes noFooter",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      for (const m of src.matchAll(/<RecordSheet\b[\s\S]*?\n\s*>/g)) {
        const tag = m[0];
        if (!/onSubmit=\{(onClose|\(\) => onOpenChange\(false\))\}/.test(tag)) continue;
        if (/\bnoFooter\b/.test(tag)) continue;
        out.push(finding("L1", rel(f), lineOf(src, m.index), "read-only sheet keeps its footer and Confirm — pass noFooter", this.rule));
      }
    }
    return out;
  },
};

/* ── documents-as-status (M-042) ─────────────────────────────────────────
   A documents cell is the documents unit (file icon + "1 document", the
   breakdown on click) — never a status pill saying Attached / Pending. */
export const documentsAsStatus = {
  name: "documents-as-status",
  segment: "1-components",
  rule: "misses M-042 — documents are drawn as the documents cell, not a status pill",
  check() {
    const out = [];
    for (const f of tsx()) {
      const src = read(f);
      for (const m of src.matchAll(/<(Status|StatusChip)\b[^>]*\b[a-z]+\.documents\b/g))
        out.push(finding("L1", rel(f), lineOf(src, m.index), "documents shown as a status pill", this.rule));
    }
    return out;
  },
};

ALL.push(filterableTableUnit, fullTableUnit, readSheetFooter, documentsAsStatus);

/* ── repeated-copy (M-044) ───────────────────────────────────────────────
   A line never says the same thing twice. Reads the Master Data asset story
   as the user sees it (journey milestones, activity log events — built in
   masterdata/story.ts from the asset records) and flags:
     · a detail that repeats a word of its own title ("Received into the
       fleet at Irving Hub · New unit received"),
     · a detail that repeats the row's own date ("here since Jun 21" on the
       Jun 21 milestone),
     · two log events on one day about the same record in other words
       ("Invoice INV-7741 raised" and "INV-7741 · SO-4399").
   Names (capitalised words inside a phrase, words with digits) are not compared — two depots
   are not a repeat. A repeat Pavan has approved goes in APPROVED_REPEATS as
   "title | detail" and is skipped (Pavan, 2026-11-03). */
const APPROVED_REPEATS = new Set([]);
const STOP = new Set("the and for from into with until since days far still this that here would been have has".split(" "));
const words = (s) =>
  new Set(
    s
      .split(/\s*(?:·|→|—|,)\s*/)
      .flatMap((seg) => seg.split(/\s+/).filter((w, i) => (i === 0 || !/^[A-Z]/.test(w)) && !/\d/.test(w)))
      .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map((w) => w.slice(0, 4)),
  );
const shared = (a, b) => [...words(a)].filter((w) => words(b).has(w));
const recordIds = (s) => new Set(s.match(/\b[A-Z]{2,3}-\d+\b/g) ?? []);

let storyCache;
async function loadStory() {
  if (storyCache) return storyCache;
  const { buildSync } = await import("esbuild");
  const { ROOT } = await import("./lib.mjs");
  const out = buildSync({
    stdin: {
      contents: `export { MD_ASSETS } from "./prototypes/unified-view/masterdata/assets";
        export { activityEvents, journeyMilestones } from "./prototypes/unified-view/masterdata/story";
        export { formatDate } from "./prototypes/unified-view/threepl/directoryCore";`,
      resolveDir: ROOT,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });
  const module = { exports: {} };
  new Function("module", "exports", out.outputFiles[0].text)(module, module.exports);
  return (storyCache = module.exports);
}
const STORY = "prototypes/unified-view/masterdata/story.ts";

export const repeatedCopy = {
  name: "repeated-copy",
  segment: "4-content",
  rule: "misses M-044 — a line never repeats its own title, its own date, or another event in other words",
  async check() {
    const out = [];
    const { MD_ASSETS, activityEvents, journeyMilestones, formatDate } = await loadStory();
    const flag = (title, detail, why) => {
      if (APPROVED_REPEATS.has(`${title} | ${detail}`)) return;
      out.push(finding("L1", STORY, 1, `${why}: "${title}" · "${detail}"`, this.rule));
    };
    for (const a of MD_ASSETS) {
      for (const m of journeyMilestones(a)) {
        const hit = shared(m.title, m.detail);
        if (hit.length) flag(m.title, m.detail, `${a.id} journey detail repeats its title (${hit.join(", ")}…)`);
        if (m.detail.includes(formatDate(m.date))) flag(m.title, m.detail, `${a.id} journey detail repeats its own date`);
      }
      const events = activityEvents(a);
      for (const e of events) {
        const hit = shared(e.event, e.detail);
        if (hit.length) flag(e.event, e.detail, `${a.id} log detail repeats its event (${hit.join(", ")}…)`);
      }
      events.forEach((x, i) =>
        events.slice(i + 1).forEach((y) => {
          if (x.at.slice(0, 10) !== y.at.slice(0, 10)) return;
          const ids = [...recordIds(`${x.event} ${x.detail}`)].filter((id) => recordIds(`${y.event} ${y.detail}`).has(id));
          if (ids.length >= 2 || (ids.length === 1 && shared(x.event, y.event).length))
            flag(x.event, y.event, `${a.id} two log events say the same thing on ${x.at.slice(0, 10)}`);
        }),
      );
    }
    return out;
  },
};

ALL.push(repeatedCopy);
