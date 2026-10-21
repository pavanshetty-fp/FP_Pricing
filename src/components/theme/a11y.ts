import * as React from "react";

/*
  THEME + ACCESSIBILITY SETTINGS (Pavan, 2026-10-21; DS ui §10n) — one store
  for the theme (light / dark) and the Accessibility panel's three sliders:

    text     0–100 → type 100%–130%, a little heavier as it grows —
             `--fp-text-scale`. ONLY THE TEXT GROWS (Pavan, 2026-10-21): a
             unit — the nav, a board lane, a sheet and its table columns —
             widens only when the bigger text would be cut inside it, and
             only as far as it takes (`fitUnits`)
    stroke   0–100 → every rim, divider, field border, lane and chart colour:
             the theme's own value at 0, its WCAG value (3:1+) at 50, the
             MAXIMUM (5:1+) at 100
    background 0–100 → the page, panels, cards and their steps, hover and
             selected fills — theme · WCAG · maximum
    ink      0–100 → secondary and coloured text (muted, status, brand,
             violet, trend, pills) — theme · WCAG (text AAA 7:1) · maximum
             (Pavan, 2026-10-21: Layers split into Background and Text)
    TEXT ON A COLOUR FILL is automatic while either is on: white or dark,
             whichever reads better on the fill as it now is
    screen   the display it's shown on — a laptop, a monitor, a large
             monitor, a TV or projector, or Auto (from this screen's size).
             It scales EVERYTHING — every component and view — by one zoom

  THE WCAG AND MAXIMUM POINTS ARE THE CSS's `.wcag` and `.a11y-max` blocks —
  the values `npm run eval` checks. To mix, all three are read off the page
  in one synchronous pass (the classes are on only while reading, so nothing
  paints), then each token is set inline as a color-mix between the two
  points either side of the slider.
*/

export type Theme = "light" | "dark";
export type ScreenSize = "auto" | "laptop" | "monitor" | "large" | "tv";
export interface A11y {
  text: number;
  stroke: number;
  background: number;
  ink: number;
  screen: ScreenSize;
}
export const A11Y_DEFAULT: A11y = { text: 0, stroke: 0, background: 0, ink: 0, screen: "laptop" };

/** Each screen's zoom — everything scales with it. */
export const SCREENS: { key: Exclude<ScreenSize, "auto">; label: string; max: string; zoom: number }[] = [
  { key: "laptop", label: "Laptop", max: "16″", zoom: 1 },
  { key: "monitor", label: "Monitor", max: "24″", zoom: 1.1 },
  { key: "large", label: "Large monitor", max: "34″", zoom: 1.25 },
  { key: "tv", label: "TV or projector", max: "TV", zoom: 1.5 },
];
/** AUTO — from this screen's width in points (a Mac's "looks like" size). */
export function autoScreen(): Exclude<ScreenSize, "auto"> {
  const w = typeof window === "undefined" ? 1440 : window.screen.width;
  return w <= 1800 ? "laptop" : w <= 2100 ? "monitor" : w <= 2800 ? "large" : "tv";
}
export const zoomOf = (s: ScreenSize) => SCREENS.find((x) => x.key === (s === "auto" ? autoScreen() : s))!.zoom;

const THEME_KEY = "fp-theme-choice";
const A11Y_KEY = "fp-a11y";

/** Rims, dividers, field borders, lanes, chart series — the Stroke slider. */
const STROKE = [
  "--fp-stroke-field",
  "--fp-outline-1",
  "--fp-outline-2",
  "--fp-stroke-hairline",
  "--fp-shell-rim",
  "--fp-shell-guide",
  "--fp-selected-border",
  "--fp-shell-marker",
  "--sidebar-border",
  "--ring",
  ...["grey", "blue", "yellow", "green", "cyan", "purple", "pink", "orange", "red"].map((l) => `--fp-lane-${l}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--fp-viz-${n}`),
];
/** Secondary and coloured text — the Text slider. */
const INK = [
  "--fp-ink-3",
  "--fp-danger",
  "--destructive",
  "--status-success",
  "--status-processing",
  "--status-pink",
  "--verified",
  "--fp-selected-strong",
  "--fp-trend-up",
  "--fp-trend-down",
  "--fp-banner-accent-info",
  "--fp-banner-accent-caution",
  "--fp-banner-accent-warning",
  "--fp-banner-accent-success",
  "--accent-violet",
  /* ORANGE TEXT — not --brand, which is the logo's and the brand buttons' fill. */
  "--fp-brand-ink",
  /* MAIN TEXT — pure black (white in dark) at the far end. */
  "--fp-ink-1",
  "--fp-ink-2",
];
/** The page, panels, cards, their steps, hover and selected fills — the Background slider. */
const BACKGROUND = [
  "--fp-surface-base",
  "--fp-surface-1a",
  "--fp-card-1",
  "--fp-card-2",
  "--fp-card-3",
  "--fp-shell-ground",
  "--fp-shell-selected",
  "--fp-emphasis",
  "--fp-emphasis-hover",
  "--fp-emphasis-quiet",
  "--fp-table-header",
  "--fp-board-lane",
  "--fp-row-hover",
  "--fp-banner-caution",
];
/** TEXT ON A FILL — chosen, never blended: white or dark, whichever reads
    better on the fill as the sliders left it. [text token, its fill]. */
const ON_FILL: [string, string][] = [
  ["--primary-foreground", "--primary"],
  ["--brand-foreground", "--brand"],
  ["--accent-violet-foreground", "--accent-violet"],
  ["--verified-foreground", "--verified"],
  ["--status-success-foreground", "--status-success"],
  ["--status-foreground", "--status-success"],
  ["--destructive-foreground", "--destructive"],
];
const LIGHT_INK = "white";
const DARK_INK = "black";

function read<T>(key: string, fallback: T, parse: (v: string) => T | null): T {
  try {
    const v = localStorage.getItem(key);
    return (v ? parse(v) : null) ?? fallback;
  } catch {
    return fallback;
  }
}

/* THE OLD WCAG MODES BECOME THE PANEL AT FULL (2026-10-21). */
const legacy = read<string | null>(THEME_KEY, null, (v) => v);
let theme: Theme = legacy === "dark" || legacy === "wcag-dark" ? "dark" : "light";
let a11y: A11y =
  legacy === "wcag-light" || legacy === "wcag-dark"
    ? { ...A11Y_DEFAULT, text: 30, stroke: 50, background: 50, ink: 50 }
    : read<A11y>(A11Y_KEY, A11Y_DEFAULT, (v) => {
        const o = JSON.parse(v) as Partial<A11y>;
        const n = (x: unknown, d: number) => (Number.isFinite(Number(x)) && x !== null && x !== undefined ? Number(x) : d);
        return {
          text: n(o.text, 0),
          stroke: n(o.stroke, 0),
          /* THE OLD Layers SLIDER BECOMES BOTH. */
          background: n(o.background, n((o as { layers?: number }).layers, 0)),
          ink: n(o.ink, n((o as { layers?: number }).layers, 0)),
          screen: (["auto", "laptop", "monitor", "large", "tv"] as const).includes(o.screen as ScreenSize) ? (o.screen as ScreenSize) : "laptop",
        };
      });

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(A11Y_KEY, JSON.stringify(a11y));
  } catch {
    // Storage blocked — the settings still hold for this visit.
  }
};

/** Puts the settings on <html>. */
export function applySettings() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const style = root.style;
  root.classList.toggle("dark", theme === "dark");
  root.classList.remove("wcag", "a11y-max");
  root.classList.remove("a11y-ink", "a11y-frame");

  /* TYPE — 100%–130%; the units around it are fitted after. */
  const scale = 1 + (a11y.text / 100) * 0.3;
  style.setProperty("--fp-text-scale", String(scale));
  root.classList.toggle("a11y-text", a11y.text > 0);
  fitUnits();

  /* THE SCREEN — one zoom for the whole page. */
  const zoom = zoomOf(a11y.screen);
  if (zoom === 1) style.removeProperty("zoom");
  else style.setProperty("zoom", String(zoom));
  root.classList.toggle("a11y-zoom", zoom !== 1);
  style.setProperty("--fp-zoom", String(zoom));

  style.removeProperty("filter");

  /* COLOURS — read both ends in one pass, then mix. */
  const all = [...STROKE, ...INK, ...BACKGROUND, ...ON_FILL.map(([t]) => t)];
  all.forEach((t) => style.removeProperty(t));
  if (a11y.stroke !== 0 || a11y.background !== 0 || a11y.ink !== 0) mixContrast(root, all);
  if (a11y.background !== 0 || a11y.ink !== 0) textOnFills(root);
  /* THE DARK FRAME — Component background 80%+ in the light theme: the shell
     ground and the selected nav item jump to near black, white text on them
     (Pavan, 2026-10-21 — no grey between ~#5a and #95 reads at 7:1 either
     way, so it jumps rather than fades). */
  const frame = theme === "light" && a11y.background >= 80;
  root.classList.toggle("a11y-frame", frame);
  if (frame) {
    style.setProperty("--fp-shell-ground", "var(--fp-frame-ground)");
    style.setProperty("--fp-shell-selected", "var(--fp-frame-selected)");
  }
}

function mixContrast(root: HTMLElement, all: string[]) {
  const style = root.style;
  const cs = getComputedStyle(root);
  const from = Object.fromEntries(all.map((t) => [t, cs.getPropertyValue(t).trim()]));
  root.classList.add("wcag");
  const cs2 = getComputedStyle(root);
  const to = Object.fromEntries(all.map((t) => [t, cs2.getPropertyValue(t).trim()]));
  root.classList.add("a11y-max");
  const cs3 = getComputedStyle(root);
  const max = Object.fromEntries(all.map((t) => [t, cs3.getPropertyValue(t).trim()]));
  root.classList.remove("wcag", "a11y-max");
  /* 0 → the theme · 50 → WCAG · 100 → maximum. */
  const blend = (a: string, b: string, pct: number) =>
    pct <= 0 || a === b ? a : pct >= 100 ? b : `color-mix(in oklab, ${b} ${pct}%, ${a})`;
  const mix = (t: string, v: number) => {
    if (!from[t] || !to[t] || v === 0) return;
    const value = v <= 50 ? blend(from[t], to[t], v * 2) : blend(to[t], max[t] || to[t], (v - 50) * 2);
    if (value !== from[t]) style.setProperty(t, value);
  };
  STROKE.forEach((t) => mix(t, a11y.stroke));
  /* TEXT NEVER SITS BELOW ITS GROUND — past the middle, Component background
     darkens the greys, so Text colour rises with it (it can go further, not
     less). */
  const ink = Math.max(a11y.ink, a11y.background);
  INK.forEach((t) => mix(t, ink));
  /* Faded labels come up to full past the middle (CSS `.a11y-ink`). */
  root.classList.toggle("a11y-ink", ink >= 50);
  BACKGROUND.forEach((t) => mix(t, a11y.background));
}

/* A COLOUR AS IT NOW RENDERS — a probe swatch read back as rgb(). */
function rgbOf(value: string): [number, number, number] | null {
  const el = document.createElement("span");
  el.style.color = value;
  el.style.display = "none";
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  /* A color-mix comes back in the space it was mixed in — oklab here. */
  const ok = /oklab\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/.exec(c);
  if (ok) {
    const [L, A, B] = [Number(ok[1]), Number(ok[2]), Number(ok[3])];
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    const enc = (x: number) => {
      const v = Math.min(1, Math.max(0, x));
      return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    };
    return [enc(lin[0]), enc(lin[1]), enc(lin[2])];
  }
  /* …or as color(srgb r g b) in 0–1; plain colours as rgb(). */
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(c);
  if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])];
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c);
  return m ? [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255] : null;
}
const luminance = ([r, g, b]: [number, number, number]) => {
  const l = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
};
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** WHITE OR DARK on each fill, whichever reads better (Pavan, 2026-10-21). */
function textOnFills(root: HTMLElement) {
  const cs = getComputedStyle(root);
  const white = 1;
  const dark = luminance(rgbOf(DARK_INK)!);
  for (const [fg, fill] of ON_FILL) {
    const v = cs.getPropertyValue(fill).trim();
    const c = v && rgbOf(v);
    if (!c) continue;
    const l = luminance(c);
    root.style.setProperty(fg, contrast(white, l) >= contrast(dark, l) ? LIGHT_INK : DARK_INK);
  }
}

export function setTheme(t: Theme) {
  theme = t;
  save();
  applySettings();
  emit();
}
/** BACK TO DEFAULT — every accessibility setting; the theme stays. */
export function resetA11y() {
  a11y = { ...A11Y_DEFAULT };
  save();
  applySettings();
  emit();
}
export const isDefaultA11y = (a: A11y) =>
  (Object.keys(A11Y_DEFAULT) as (keyof A11y)[]).every((k) => a[k] === A11Y_DEFAULT[k]);
/** The way back when the panel can't be reached: ⌘⌥0 (Ctrl+Alt+0). */
export const RESET_SHORTCUT = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘⌥0" : "Ctrl+Alt+0";

export function setA11y(patch: Partial<A11y>) {
  a11y = { ...a11y, ...patch };
  save();
  applySettings();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useTheme = () => React.useSyncExternalStore(subscribe, () => theme, () => theme);
export const useA11y = () => React.useSyncExternalStore(subscribe, () => a11y, () => a11y);

/*
  FIT THE UNITS TO THE TEXT — each kind of unit widens only if the bigger
  text is cut inside it. What's already cut at 100% (a long address, by
  design) doesn't count: the page is read once at 100% and once at the
  chosen size, in one synchronous pass, so nothing paints in between. A unit
  then grows in steps until nothing new is cut, never past the text's own
  scale.
*/
const UNITS = [
  { k: "--fp-nav-k", sel: 'nav[aria-label="Primary"]' },
  { k: "--fp-lane-k", sel: '[data-fp-unit="lane"]' },
  { k: "--fp-scale", sel: '[role="dialog"]:not([data-fp-panel])' },
];
const CUTTABLE = ".truncate, th, label, button";
const cut = (el: Element) => el.scrollWidth > el.clientWidth + 1;

function fitUnits() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const style = root.style;
  const scale = 1 + (a11y.text / 100) * 0.3;
  UNITS.forEach((u) => style.setProperty(u.k, "1"));
  if (scale === 1) return;
  const inUnit = (sel: string) => [...document.querySelectorAll(sel)].flatMap((u) => [...u.querySelectorAll(CUTTABLE)]);
  /* AT 100% — what's cut by design. */
  root.classList.remove("a11y-text");
  style.setProperty("--fp-text-scale", "1");
  const baseline = new Set(UNITS.flatMap((u) => inUnit(u.sel).filter(cut)));
  root.classList.add("a11y-text");
  style.setProperty("--fp-text-scale", String(scale));
  for (const u of UNITS) {
    /* THE SMALLEST WIDTH THAT CUTS THE LEAST — a unit that can't grow (a
       full-width sheet) would only squeeze its other columns, so it stays. */
    const broken = () => inUnit(u.sel).filter((el) => !baseline.has(el) && cut(el)).length;
    let best = { k: 1, n: broken() };
    for (let k = 1.02; best.n > 0 && k <= scale + 0.001; k = Math.round((k + 0.02) * 100) / 100) {
      style.setProperty(u.k, String(k));
      const n = broken();
      if (n < best.n) best = { k, n };
    }
    style.setProperty(u.k, String(best.k));
  }
}

/* REFIT WHEN THE PAGE CHANGES — a sheet opens, a page loads. */
let refit = 0;
if (typeof window !== "undefined") {
  new MutationObserver(() => {
    if (a11y.text === 0) return;
    window.clearTimeout(refit);
    refit = window.setTimeout(fitUnits, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });
}

/* ON LOAD — once the stylesheet is in, so both ends can be read. */
if (typeof window !== "undefined") {
  if (document.readyState === "complete") applySettings();
  else window.addEventListener("load", applySettings, { once: true });
  applySettings();
  /* THE ESCAPE HATCHES (Pavan, 2026-10-21) — a shortcut, and `?a11y=reset`
     in the address, put every accessibility setting back to default. */
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === "Digit0") {
      e.preventDefault();
      resetA11y();
    }
  });
  if (new URLSearchParams(window.location.search).get("a11y") === "reset") resetA11y();
  /* AUTO FOLLOWS THE WINDOW onto another screen. */
  window.addEventListener("resize", () => a11y.screen === "auto" && applySettings());
}
