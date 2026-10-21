/*
  WCAG CONTRAST (Pavan, 2026-10-21; DS ui §10n) — Light, Dark, and the WCAG
  end of the Accessibility panel's sliders in each, measured from
  `src/index.css` itself.

    text        AA 4.5:1 · AAA 7:1   (WCAG 1.4.3 / 1.4.6)
    controls,   AA 3:1               (WCAG 1.4.11) — field and card rims,
    graphics                          focus ring, selection rim, lanes, charts

  THE WCAG ENDS MUST PASS: text at AAA, controls at AA. Light and Dark are
  reported, not enforced — `npm run wcag` prints all four.

  The tokens are resolved the way the browser does: `:root`, then `.dark`,
  then the WCAG block on top. A value made with color-mix() is left out (it
  needs the page to resolve), except a pill's tint, which is worked out here:
  the pill's colour at 10% over the surface.
*/

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, finding, filesUnder, read } from "./lib.mjs";

export const name = "wcag-contrast";
export const segment = "1-components";
export const rule = 'docs/ds/ui/2-rules.md §10n "WCAG modes"';

const CSS = join(ROOT, "src/index.css");

function blocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = {};
  const re = /(^|\n)([^{}\n]+?)\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const sel = m[2].trim();
    const vars = out[sel] ?? {};
    for (const d of m[3].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out[sel] = vars;
  }
  return out;
}

const MODES = {
  light: [":root"],
  dark: [":root", ".dark"],
  "wcag-light": [":root", ".wcag:not(.dark)"],
  "wcag-dark": [":root", ".dark", ".dark.wcag"],
  /* THE SLIDERS' FAR END, past WCAG — held to the same bars. */
  "max-light": [":root", ".wcag:not(.dark)", ".a11y-max:not(.dark)"],
  "max-dark": [":root", ".dark", ".dark.wcag", ".dark.a11y-max"],
};

function tokensFor(b, mode) {
  return Object.assign({}, ...MODES[mode].map((s) => b[s] ?? {}));
}

function resolve(t, v, depth = 0) {
  if (!v || depth > 12) return null;
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref) return resolve(t, t[ref[1]], depth + 1);
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`.toLowerCase();
  /* A TINT MADE WITH color-mix(… N%, transparent) — kept with its alpha, laid
     over the surface where it's used. */
  const mx = /^color-mix\(in oklab,\s*(#[0-9a-f]{6})\s+(\d+)%,\s*transparent\)$/i.exec(v);
  if (mx) return mx[1].toLowerCase() + Math.round(Number(mx[2]) * 2.55).toString(16).padStart(2, "0");
  return null;
}
const solid = (h, ground) => (h.length === 9 ? over(h.slice(0, 7), ground, parseInt(h.slice(7), 16) / 255) : h);

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const [r, g, b] = rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const over = (fg, bg, a) =>
  "#" +
  rgb(fg)
    .map((c, i) => Math.round((c * a + rgb(bg)[i] * (1 - a)) * 255).toString(16).padStart(2, "0"))
    .join("");

const SURFACES = ["--fp-surface-1b", "--fp-surface-base", "--fp-surface-1a", "--fp-card-1", "--fp-table-header", "--muted", "--sidebar", "--drawer"];
const FIELD_GROUNDS = ["--fp-surface-1b", "--fp-surface-1a", "--fp-surface-base"];

/** [what, fg token, bg tokens, kind] — kind "text" | "pill" (text on its own 10% tint) | "ui". */
const PAIRS = [
  ["Body text", "--foreground", SURFACES, "text"],
  ["Muted text, placeholders", "--muted-foreground", SURFACES, "text"],
  ["Error / failed text", "--status-failed", SURFACES, "text"],
  ["Success text", "--status-success", SURFACES, "text"],
  ["Processing text", "--status-processing", SURFACES, "text"],
  ["Accent violet text", "--accent-violet", ["--fp-surface-1b", "--fp-surface-1a"], "text"],
  ["Selected text", "--selected-foreground", ["--selected"], "text"],
  ["Primary button text", "--primary-foreground", ["--primary"], "text"],
  ["Brand fill text", "--brand-foreground", ["--brand"], "text"],
  ["Violet fill text", "--accent-violet-foreground", ["--accent-violet"], "text"],
  ["Verified fill text", "--verified-foreground", ["--verified"], "text"],
  ["Trend up chip", "--fp-trend-up", ["--fp-trend-up-bg"], "text"],
  ["Trend down chip", "--fp-trend-down", ["--fp-trend-down-bg"], "text"],
  ["Info pill", "--fp-banner-accent-info", ["--fp-surface-1b"], "pill"],
  ["Caution pill", "--fp-banner-accent-caution", ["--fp-surface-1b"], "pill"],
  ["Critical pill", "--status-failed", ["--fp-surface-1b"], "pill"],
  ["Success pill", "--fp-banner-accent-success", ["--fp-surface-1b"], "pill"],
  ["Field border", "--input", FIELD_GROUNDS, "ui"],
  /* THE DARK FRAME (Component background 80%+) — the same in every mode. */
  ["Text on the dark frame", "--fp-frame-ink", ["--fp-frame-ground", "--fp-frame-selected"], "text"],
  ["Muted text on the dark frame", "--fp-frame-ink-muted", ["--fp-frame-ground"], "text"],
  ["Selected nav item on its panel", "--fp-frame-selected", ["--fp-shell-panel"], "ui"],
  /* SEPARATION (Pavan, 2026-10-21) — a card's rim and a divider must be seen
     on a mirrored screen too. */
  ["Card rim", "--fp-outline-1", SURFACES, "ui"],
  ["Divider", "--border", SURFACES, "ui"],
  ["Strong rim (hover, cards)", "--fp-outline-2", FIELD_GROUNDS, "ui"],
  ["Focus ring", "--ring", FIELD_GROUNDS, "ui"],
  ["Selection rim", "--selected-border", ["--fp-surface-1b"], "ui"],
  ...["grey", "blue", "yellow", "green", "cyan", "purple", "pink", "orange", "red"].map((l) => [
    `Lane ${l}`,
    `--fp-lane-${l}`,
    ["--fp-surface-1b", "--fp-board-lane"],
    "ui",
  ]),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`Chart series ${n}`, `--fp-viz-${n}`, ["--fp-surface-1b"], "ui"]),
];

/*
  THE PAIRINGS THE SCREENS ACTUALLY USE (Pavan, 2026-10-21) — every class
  string in src/ and prototypes/ that sets a background colour and a text
  colour together, with their opacities. A new pairing is checked the day it
  is written, not when someone remembers to add it here. (Text inherited from
  a parent isn't seen — the hand list above covers the common ones.)
*/
function usedPairs(css) {
  const ti = css.slice(css.indexOf("@theme inline"));
  const known = new Set([...ti.slice(0, ti.indexOf("\n}")).matchAll(/--color-([\w-]+)\s*:/g)].map((m) => m[1]));
  const out = new Map();
  for (const f of filesUnder(["src", "prototypes"], [".tsx"])) {
    for (const m of read(f).matchAll(/["'`]([^"'`\n]*\b(?:bg|text)-[^"'`\n]*)["'`]/g)) {
      const cls = m[1].split(/\s+/).filter((c) => !c.includes(":"));
      const pick = (pre) =>
        cls
          .map((c) => new RegExp(`^${pre}-([a-z0-9-]+?)(?:/(\\d+))?$`).exec(c))
          .filter((x) => x && known.has(x[1]));
      for (const b of pick("bg"))
        for (const t of pick("text")) {
          const key = `${t[1]}${t[2] ? "/" + t[2] : ""} on ${b[1]}${b[2] ? "/" + b[2] : ""}`;
          out.set(key, { fg: t[1], fga: t[2] ? Number(t[2]) / 100 : 1, bg: b[1], bga: b[2] ? Number(b[2]) / 100 : 1 });
        }
    }
  }
  return [...out].map(([what, p]) => ({ what, ...p }));
}

export function measure() {
  const css = readFileSync(CSS, "utf8");
  const b = blocks(css);
  const ti = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const inline = Object.fromEntries(
    [...ti.slice(ti.indexOf("@theme inline")).matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
  const used = usedPairs(css);
  const rows = [];
  for (const mode of Object.keys(MODES)) {
    const t = tokensFor(b, mode);
    for (const [what, fgT, bgTs, kind] of PAIRS) {
      /* The dark frame is a light-theme state only. */
      if (mode.includes("dark") && /dark frame|Selected nav item on its panel/.test(what)) continue;
      const fg = resolve(t, t[fgT]);
      if (!fg) continue;
      let worst = Infinity;
      let on = "";
      for (const bgT of bgTs) {
        let bg = resolve(t, t[bgT]);
        if (!bg) continue;
        bg = solid(bg, resolve(t, t["--fp-surface-1b"]));
        if (kind === "pill") bg = over(fg, bg, 0.1);
        const r = ratio(fg, bg);
        if (r < worst) [worst, on] = [r, bgT];
      }
      if (worst === Infinity) continue;
      const need = kind === "ui" ? 3 : fgT === "--brand-foreground" ? 4.5 : 7;
      rows.push({ mode, what, fg: fgT, on, ratio: worst, kind, aa: worst >= (kind === "ui" ? 3 : 4.5), aaa: worst >= need });
    }
    /* THE USED PAIRINGS — each over the content layer, at its opacities. */
    const ground = resolve(t, t["--fp-surface-1b"]);
    for (const p of used) {
      let bg = resolve(t, inline[`--color-${p.bg}`] ?? t[`--${p.bg}`]);
      /* ORANGE TEXT is its own colour (`.text-brand` → --fp-brand-ink). */
      let fg = resolve(t, p.fg === "brand" ? t["--fp-brand-ink"] : (inline[`--color-${p.fg}`] ?? t[`--${p.fg}`]));
      if (!bg || !fg || !ground) continue;
      bg = solid(bg, ground);
      if (p.bga < 1) bg = over(bg, ground, p.bga);
      fg = solid(fg, bg);
      if (p.fga < 1) fg = over(fg, bg, p.fga);
      const r = ratio(fg, bg);
      /* THE BRAND FILL (logo, brand buttons) keeps its orange in every mode —
         identity — so text on it is held to AA, not AAA. */
      const need = p.bg === "brand" && p.bga === 1 ? 4.5 : 7;
      rows.push({ mode, what: `Used: ${p.what}`, fg: `text-${p.fg}`, on: `bg-${p.bg}`, ratio: r, kind: "text", aa: r >= 4.5, aaa: r >= need, used: true });
    }
  }
  return rows;
}

export function check() {
  return measure()
    .filter((r) => (r.mode.startsWith("wcag") || r.mode.startsWith("max")) && !r.aaa)
    .map((r) =>
      finding(
        "L1",
        "src/index.css",
        0,
        `${r.mode}: ${r.what} (${r.fg} on ${r.on}) is ${r.ratio.toFixed(2)}:1 — needs ${r.kind === "ui" ? "3:1 (AA)" : "7:1 (AAA)"}`,
        rule
      )
    );
}

/* `node scripts/eval/wcag-contrast.mjs` — the four modes side by side. */
if (process.argv[1] && process.argv[1].endsWith("wcag-contrast.mjs")) {
  const rows = measure();
  for (const mode of Object.keys(MODES)) {
    const m = rows.filter((r) => r.mode === mode);
    const aa = m.filter((r) => r.aa).length;
    const aaa = m.filter((r) => r.aaa).length;
    console.log(`\n${mode.padEnd(11)}  AA ${aa}/${m.length}  ·  AAA (text 7:1, controls 3:1) ${aaa}/${m.length}`);
    for (const r of m.filter((x) => !x.aaa))
      console.log(`  ${r.aa ? "AA only " : "fails AA"}  ${r.ratio.toFixed(2).padStart(5)}:1  ${r.what}  (${r.fg} on ${r.on})`);
  }
}
