# Apply the FleetPanda Design System (FP-DS-2026) to a prototype

**Purpose.** Feed this entire file to your AI coding tool (Claude, Cursor, v0, etc.)
as context *before* it builds. It contains the exact design tokens, the setup, and
the rules needed to make **any** new prototype — with its own screens, concepts,
and flows — adopt the FleetPanda look, behaviour, and structure at ~100% fidelity.

You bring the product ideas and flows; this system supplies the **visual language,
components, layout, and interaction rules**. Map your content into these — never
restyle away from them.

---

## 0. What this design system is
- A spinoff of **shadcn/ui (new-york style)** on **Tailwind CSS v4** + **React**.
- **Two modes only: `Light` and `FP`** (the FleetPanda brand look — a dark theme).
  There is no separate "dark"; **FP _is_ the dark theme**, applied via `.dark` on
  `<html>`. **FP is the default.**
- Brand accent is **orange `#fa6400`** (this is `--brand`, *not* `--primary`).
- The "FP-ness" of any screen = **these token values + these components + these
  rules**. shadcn primitives are standard; the tokens make them look FleetPanda.

---

## 1. The accuracy contract (non-negotiable rules)
Follow every one of these or fidelity drops:

1. **Use tokens, never raw hex.** Always `bg-background`, `text-foreground`,
   `bg-card`, `border-border`, `text-muted-foreground`, `bg-brand`,
   `bg-fp-surface-1b`, etc. Never `bg-[#111]` or inline hex. If a color you need
   isn't a token, add it to the token layer — don't hardcode.
2. **The primary CTA is the neutral `bg-primary`** — near-white in FP, near-black
   in Light. `--brand` (`#fa6400`, orange) is a *special accent*, used only where a
   brand emphasis is specifically called for; it is **not** the default CTA. (Don't
   confuse the tokens: `--brand` is the orange, `--primary` is the neutral.)
3. **Icons: Lucide only** (`lucide-react`). Never Tabler / Hugeicons / Phosphor /
   Remix / random SVGs.
4. **Two modes.** Ship both Light (`:root`) and FP (`.dark`); default to FP. A
   theme toggle flips `.dark` on `<html>` and persists to `localStorage`.
5. **Translate, don't trace.** If you're handed a light-mode mock (or a mock from
   another product), re-map every color to these tokens. Never copy a foreign
   palette or a literal white-card look.
6. **Semantic variants.** A component's variant is chosen by the *meaning of the
   data*, not hardcoded — a status badge's color follows the row status; a banner's
   status follows severity.
7. **Compose, don't reinvent.** Reach for the component set below before building a
   primitive from scratch. Reconcile *tokens* rather than duplicating components.
8. **Scale discipline.** Corners use the radius ramp, text uses the type scale,
   spacing uses the named steps — not arbitrary one-off values.

---

## 2. Setup (3 steps)

**Step 1 — stack.** Tailwind CSS v4 (`@import "tailwindcss"`), React, `lucide-react`,
`class-variance-authority`, `clsx` + `tailwind-merge` (the `cn()` helper). For the
components, install **shadcn/ui (new-york)** primitives as normal — the tokens
below restyle them into FP. Optional deps only when needed: `recharts` (charts),
`sonner` (toasts), `cmdk` (command), `input-otp`.

**Step 2 — drop in the tokens.** Replace your global stylesheet with the
`globals.css` in §3. This is the **single source of truth** — copy it verbatim.
It defines both modes and every FP token; shadcn's `dark:`/token utilities resolve
against it automatically.

**Step 3 — wire the theme.**
- Load the **Geist** font (the CSS imports it).
- Default the app to FP: `<html class="dark">`.
- Add a pre-paint script so a saved `light` choice applies before first paint:
  ```html
  <script>
    try { if (localStorage.getItem('fp-theme') === 'light') document.documentElement.classList.remove('dark'); } catch {}
  </script>
  ```
- A theme toggle button flips `document.documentElement.classList.toggle('dark')`
  and writes `localStorage.setItem('fp-theme', isDark ? 'dark' : 'light')`.

---

## 3. `globals.css` — the token source of truth (paste verbatim)

This is the exact stylesheet the FleetPanda DS ships. Every color, radius, type,
spacing, and shadow token lives here. Do not edit the values.

```css
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap");
@import "tailwindcss";
@import "tw-animate-css";

/*
  FleetPanda DS — spinoff of shadcn/ui (new-york-v4).
  Token NAMES are kept identical to canonical shadcn so unchanged components
  work verbatim; only the VALUES are FleetPanda's (dark-only theme), mapped
  from the Figma "FP DS 2026" variable collection. FP-only tokens (brand,
  drawer, surface scale, status) are added at the end.
*/

@custom-variant dark (&:is(.dark *));

/* Bulk-action bar entrance — a vertical translate (200ms), not opacity alone.
   Default state has no transform, so the docked position is correct without JS. */
@keyframes bulk-bar-in {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.bulk-bar-in {
  animation: bulk-bar-in 200ms ease-out;
}

@theme inline {
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;

  /*
    Radius scale — Style Guide "Radius" (21322:119). --radius 0.625rem (10px).
    Values: xs 2 · sm 6 · md 8 · lg 10 · xl 14 · 2xl 18 · 3xl 22 · 4xl 26.
    (sm/md/lg/xl already matched the guide; xs/2xl/3xl/4xl override Tailwind's
    defaults to stay on the FP linear ramp.)
  */
  --radius-xs: calc(var(--radius) - 8px); /* 2px */
  --radius-sm: calc(var(--radius) * 0.6); /* 6px */
  --radius-md: calc(var(--radius) * 0.8); /* 8px */
  --radius-lg: var(--radius); /* 10px */
  --radius-xl: calc(var(--radius) * 1.4); /* 14px */
  --radius-2xl: calc(var(--radius) + 8px); /* 18px */
  --radius-3xl: calc(var(--radius) + 12px); /* 22px */
  --radius-4xl: calc(var(--radius) + 16px); /* 26px */

  /*
    Custom Text Styles — Style Guide "Custom Text Styles" (21322:271). Display
    heading ramp (semibold by convention): text-heading-sm/md/lg/xl. The base
    text-xs…9xl ramp matches Tailwind's defaults, so it isn't redefined here.
  */
  --text-heading-sm: 1.5rem; /* 24px */
  --text-heading-sm--line-height: 1.3;
  --text-heading-md: 2.25rem; /* 36px */
  --text-heading-md--line-height: 1.2;
  --text-heading-lg: 3rem; /* 48px */
  --text-heading-lg--line-height: 1.1;
  --text-heading-xl: 3.75rem; /* 60px */
  --text-heading-xl--line-height: 1.05;

  /*
    Custom Spacing — Style Guide "Custom Spacing" (21330:26898). FP-named spacing
    usable on any spacing utility (p-*, gap-*, …), e.g. py-section-padding-y.
  */
  --spacing-container-padding-x: 1.5rem; /* 24px */
  --spacing-section-padding-y: 6rem; /* 96px */
  --spacing-section-title-gap-sm: 1rem; /* 16px */
  --spacing-section-title-gap-md: 1.25rem; /* 20px */
  --spacing-section-title-gap-lg: 1.25rem; /* 20px */
  --spacing-section-title-gap-xl: 1.5rem; /* 24px */

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* FleetPanda-only tokens */
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-drawer: var(--drawer);
  --color-rail: var(--rail);
  --color-fp-outline-1: var(--fp-outline-1);
  --color-fp-outline-2: var(--fp-outline-2);
  --color-fp-surface-1a: var(--fp-surface-1a);
  --color-fp-surface-1b: var(--fp-surface-1b);
  --color-fp-card-1: var(--fp-card-1);
  --color-fp-surface-base: var(--fp-surface-base);
  --color-status-success: var(--status-success);
  --color-status-processing: var(--status-processing);
  --color-status-failed: var(--status-failed);
  --color-status-pink: var(--status-pink);
  --color-verified: var(--verified);
  --color-fp-banner-info: var(--fp-banner-info);
  --color-fp-banner-caution: var(--fp-banner-caution);
  --color-fp-banner-warning: var(--fp-banner-warning);
  --color-fp-banner-success: var(--fp-banner-success);
  --color-fp-banner-accent-caution: var(--fp-banner-accent-caution);
  --color-fp-banner-accent-warning: var(--fp-banner-accent-warning);
  --color-fp-banner-accent-success: var(--fp-banner-accent-success);
  /* Kanban lane accents (27631:11154) — theme-independent palette used for the
     lane top-strip + count pill. Literal values (same in light/dark). */
  --color-fp-lane-grey: #64748b;
  --color-fp-lane-blue: #3b82f6;
  --color-fp-lane-yellow: #eab308;
  --color-fp-lane-green: #22c55e;
  --color-fp-lane-cyan: #06b6d4;
  --color-fp-lane-purple: #6366f1;
  --color-fp-lane-violet: #8b5cf6;
  --color-fp-lane-pink: #d946ef;
  --color-fp-lane-orange: #f59e0b;
  --color-fp-lane-red: #f43f5e;
  /* Chart palette (449:6176) — categorical series colors, theme-independent.
     chart-1 = brand. Used by Recharts cards on the Dashboard. */
  --color-chart-1: #fa6400;
  --color-chart-2: #3b82f6;
  --color-chart-3: #22c55e;
  --color-chart-4: #eab308;
  --color-chart-5: #8b5cf6;
  /* Surface elevation (28679:1109 → drop-shadow/lg): the content layer lifts
     off the app background with a soft drop shadow (black 15%). */
  --shadow-fp-surface: 0 4px 4px 0 rgb(0 0 0 / 0.15);
}

/*
  Light + dark themes. `:root` is LIGHT (Style Guide "Colors" Light column,
  21275:7). `<html class="dark">` flips to the FleetPanda DARK values below —
  the FP surfaces/values we mapped from the Figma variable collection. The
  shadcn `dark:` utilities still resolve against these same tokens.
  Constants (brand, brand-foreground) are declared once on :root and inherited
  by both themes.
*/
:root {
  --radius: 0.625rem;

  /* Light — shadcn token set, Style Guide Light column */
  --background: #efefeb; /* full app background / Surface Base (light) — 28681:807 */
  --foreground: #030405;
  --card: #ffffff;
  --card-foreground: #030405;
  --popover: #ffffff;
  --popover-foreground: #030405;
  --primary: #090c0f;
  --primary-foreground: #f0f2f5;
  --secondary: #cad1db;
  --secondary-foreground: #090c0f;
  --muted: #cad1db;
  --muted-foreground: #596475;
  --accent: #cad1db;
  --accent-foreground: #090c0f;
  --destructive: #dc2626;
  --destructive-foreground: #fef2f2;
  --border: #cdd4de; /* guide #abb3c2 lightened slightly for hairlines */
  --input: #abb3c2;
  --ring: #727d8f;

  --chart-1: #ea580c;
  --chart-2: #0d9488;
  --chart-3: #164e63;
  --chart-4: #fbbf24;
  --chart-5: #f59e0b;

  --sidebar: #fafbf8; /* Navigation Drawer Expanded (light) — 28679:1109 */
  --sidebar-foreground: #030405;
  --sidebar-primary: #090c0f;
  --sidebar-primary-foreground: #f0f2f5;
  --sidebar-accent: #cad1db;
  --sidebar-accent-foreground: #090c0f;
  --sidebar-border: #cdd4de;
  --sidebar-ring: #727d8f;

  /* FleetPanda-only — constants (theme-independent) */
  --brand: #fa6400; /* Primary (FP orange) */
  --brand-foreground: #ffffff;

  /* FleetPanda-only — LIGHT surface/chrome/status (derived to pair with above) */
  --drawer: #fafbf8; /* Navigation Drawer Expanded (light) — 28679:1109 */
  --rail: #efefeb; /* Navigation Menu Default / icon rail (light) — 28679:1109 */
  --fp-outline-1: #e2e5ea;
  --fp-outline-2: #cad1db;
  --fp-surface-1a: #ffffff;
  --fp-surface-1b: #ffffff; /* Content Layer (light) — pure white, 28679:1109 */
  --fp-card-1: #e9ecf1;
  --fp-surface-base: #efefeb; /* Surface Base (light) — matches full background, 28681:807 */
  --status-success: #16a34a;
  --status-processing: #d97706;
  --status-failed: #dc2626;
  --status-pink: #db2777;
  --verified: #2563eb;
  /* Banners (28149:1712) — Type 1 solid fills (white text) keep the saturated
     design hexes; Type 2 accents darkened so they read on a light card. */
  --fp-banner-info: #3730a3;
  --fp-banner-caution: #854d0e;
  --fp-banner-warning: #991b1b;
  --fp-banner-success: #166534;
  --fp-banner-accent-caution: #b45309;
  --fp-banner-accent-warning: #b91c1c;
  --fp-banner-accent-success: #4d7c0f;
}

/*
  FleetPanda DARK — the original FP values (mapped from the Figma variable
  collection). Applied when `<html>` carries `.dark`. Source variable per token.
*/
.dark {
  --background: #080808; /* base/background, FP/Surface Base */
  --foreground: #f0f2f5; /* base/foreground */
  --card: #11161d; /* FP/Surface 1a */
  --card-foreground: #f0f2f5;
  --popover: #1b2028; /* FP column → FP/Surface 1b */
  --popover-foreground: #f0f2f5; /* base/popover-foreground */
  --primary: #f8fafc; /* FP column → slate/50 (brand orange is --brand) */
  --primary-foreground: #090c0f; /* base/primary-foreground */
  --secondary: #2a2f37; /* FP column → FP/Card 1 */
  --secondary-foreground: #f0f2f5;
  --muted: #1b2028; /* FP column → FP/Card 2 (= #1b2028) */
  --muted-foreground: #9ca3af; /* base/muted-foreground */
  --accent: #2a2f37; /* FP column → FP/Card 1 (28679 variables) */
  --accent-foreground: #f0f2f5; /* base/accent-foreground */
  --destructive: #f87171; /* base/destructive */
  --destructive-foreground: #f0f2f5;
  --border: #575757; /* FP column → FP/Outline 2 */
  --input: #575757; /* FP column → FP/Outline 2 */
  --ring: #9ca3af;

  --chart-1: #fa6400;
  --chart-2: #abb3c2;
  --chart-3: #1d4ed8;
  --chart-4: #22c55e;
  --chart-5: #f87171;

  --sidebar: #11161d; /* base/sidebar */
  --sidebar-foreground: #f0f2f5; /* base/sidebar-foreground */
  --sidebar-primary: #1d4ed8; /* base/sidebar-primary */
  --sidebar-primary-foreground: #f0f2f5; /* base/sidebar-primary-foreground */
  --sidebar-accent: #363c45; /* base/sidebar-accent */
  --sidebar-accent-foreground: #f0f2f5; /* base/sidebar-accent-foreground */
  --sidebar-border: #ffffff1a; /* base/sidebar-border */
  --sidebar-ring: #575757;

  /* FleetPanda-only — dark surface/chrome/status */
  --drawer: #090c0f; /* Navigation Drawer Expanded bg */
  --rail: #080808; /* icon rail = Surface Base — distinct from --sidebar (R6) */
  --fp-outline-1: #363c45; /* FP/Outline 1 */
  --fp-outline-2: #575757; /* FP/Outline 2 */
  --fp-surface-1a: #11161d;
  --fp-surface-1b: #1b2028;
  --fp-card-1: #2a2f37; /* FP/Card 1 */
  --fp-surface-base: #080808;
  --status-success: #22c55e; /* confirmed via REST */
  --status-processing: #f59e0b; /* ASSUMPTION — not in Figma tokens */
  --status-failed: #f87171; /* = destructive */
  --status-pink: #ff8080; /* Status/Pink */
  --verified: #3b82f6; /* Badge "Verified" blue (DS 23:995) */
  /* Banners (28149:1712) — exact design values. Type 1 = solid fills (white
     text); Type 2 = light accents for icon+text on the Card-1 surface. */
  --fp-banner-info: #3730a3;
  --fp-banner-caution: #854d0e;
  --fp-banner-warning: #991b1b;
  --fp-banner-success: #166534;
  --fp-banner-accent-caution: #fcd34d;
  --fp-banner-accent-warning: #fca5a5;
  --fp-banner-accent-success: #bef264;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    margin: 0;
  }
}
```

---

## 4. Token quick reference (hex, both modes)
For quick lookup or non-Tailwind contexts. Prefer the utility (middle column) in code.

| Token / utility | Light | FP (dark, default) | Use for |
|---|---|---|---|
| `bg-background` | `#efefeb` | `#080808` | Full app background / Surface Base |
| `text-foreground` | `#030405` | `#f0f2f5` | Primary text |
| `bg-card` | `#ffffff` | `#11161d` | Card / raised panel (= Surface 1a) |
| `bg-popover` | `#ffffff` | `#1b2028` | Menus, popovers, dropdowns |
| `bg-primary` | `#090c0f` | `#f8fafc` | Neutral primary — **the default CTA** (near-black Light / near-white FP) |
| `bg-brand` / `text-brand` | `#fa6400` | `#fa6400` | **Brand orange** — special accent, only when specified (NOT the default CTA) |
| `text-muted-foreground` | `#596475` | `#9ca3af` | Secondary/label text |
| `bg-accent` | `#cad1db` | `#2a2f37` | Hover fill / subtle emphasis |
| `bg-muted` | `#cad1db` | `#1b2028` | Muted surface |
| `bg-destructive` | `#dc2626` | `#f87171` | Danger / delete |
| `border-border` | `#cdd4de` | `#575757` | Default hairline border |
| `ring-ring` | `#727d8f` | `#9ca3af` | Focus ring |
| `bg-rail` | `#efefeb` | `#080808` | Tier-1 icon rail (flush w/ background) |
| `bg-drawer` / `bg-sidebar` | `#fafbf8` | `#090c0f` / `#11161d` | Tier-2 nav drawer |
| `bg-fp-surface-1a` | `#ffffff` | `#11161d` | Card surface |
| `bg-fp-surface-1b` | `#ffffff` | `#1b2028` | **Content layer** |
| `bg-fp-card-1` | `#e9ecf1` | `#2a2f37` | Elevated inner card (e.g. Kanban lane) |
| `border-fp-outline-1` | `#e2e5ea` | `#363c45` | Subtle divider/hairline |
| `border-fp-outline-2` | `#cad1db` | `#575757` | Stronger outline (e.g. table stroke) |
| `text-status-success` | `#16a34a` | `#22c55e` | Success / positive |
| `text-status-processing` | `#d97706` | `#f59e0b` | Processing / caution |
| `text-status-failed` | `#dc2626` | `#f87171` | Failed |
| `text-status-pink` | `#db2777` | `#ff8080` | Pink status |
| `text-verified` | `#2563eb` | `#3b82f6` | "Verified" blue |
| `shadow-fp-surface` | `0 4px 4px rgb(0 0 0 / .15)` | (same) | Surface elevation shadow |

**Theme-independent palettes** (identical in both modes):
- **Chart series:** `chart-1` `#fa6400` (brand) · `chart-2` `#3b82f6` · `chart-3` `#22c55e` · `chart-4` `#eab308` · `chart-5` `#8b5cf6` (utilities: `fill-chart-1`, `stroke-chart-2`, `bg-chart-3`…).
- **Kanban lane accents** (`bg-fp-lane-*`): grey `#64748b`, blue `#3b82f6`, yellow `#eab308`, green `#22c55e`, cyan `#06b6d4`, purple `#6366f1`, violet `#8b5cf6`, pink `#d946ef`, orange `#f59e0b`, red `#f43f5e`.
- **Banner (callout) fills** `bg-fp-banner-{info|caution|warning|success}`: `#3730a3` / `#854d0e` / `#991b1b` / `#166534` (white text). **Inline-alert accents** `text-fp-banner-accent-{caution|warning|success}`: light on FP (`#fcd34d`/`#fca5a5`/`#bef264`), darkened on light (`#b45309`/`#b91c1c`/`#4d7c0f`).

---

## 5. Surface & elevation system
The FP look is a **stack of surfaces** that step in lightness and lift with shadows.

**Light mode** (warm neutrals): background `#efefeb` → drawer `#fafbf8` → content layer `#ffffff`. The **rail is flush** with the background; the **drawer and content layer float** above it with `shadow-fp-surface`.

**FP mode** (dark): background/rail `#080808` → drawer `#090c0f` → content layer Surface-1b `#1b2028`, cards Surface-1a `#11161d`, inner cards `#2a2f37`.

Rules:
- The **content layer** is a `rounded-md bg-fp-surface-1b shadow-fp-surface` panel with **no outer border**.
- Cards use `bg-card` (= Surface 1a) with a `border-fp-outline-1` hairline — this is how they separate on the (white/1b) content layer.
- Elevated inner cards (a card inside a card, e.g. a Kanban lane) step up to `bg-fp-card-1`.
- Apply `shadow-fp-surface` to floating chrome (drawer, content layer). The rail gets **no shadow**.

---

## 6. Layout & shell (adapt to your screens)
If your prototype is an app with navigation, use this shell; if it's a single view,
you can skip the shell and still use the surfaces/cards/tokens.

- **Tier-1 rail:** 52px icon rail (`bg-rail`) that hover-expands to a 256px overlay
  (`bg-drawer`). One item per top-level screen; works on every screen.
- **Tier-2 drawer (optional):** contextual sub-nav for the active screen, rendered
  as a `rounded-lg bg-sidebar shadow-fp-surface` panel (256px).
- **Content layer:** fills the remaining space; `rounded-md bg-fp-surface-1b
  shadow-fp-surface`, no outer border. Holds a fixed **header** (page title
  `text-2xl font-semibold`, optional breadcrumb directly under the title text,
  a bottom `border-fp-outline-1` divider) then a scrolling body.
- **Spacing laws:** **8px** gaps between rail ↔ drawer ↔ content and an **8px**
  outer margin (`p-2` + `gap-2`); **16px** inset inside the content-layer body.
- **Stacking order inside a content body:** action bar → tabs → accordions → content.

---

## 7. Components (use these; map your UI onto them)
Install shadcn/ui (new-york) for the base primitives — with the tokens above they
render as FP. Available primitives (don't rebuild these):

`button` (variants: default / secondary / outline / ghost / destructive / link; sizes sm/default/lg/icon), `button-group`, `input`, `textarea`, `label`, `field` (label+control+description/error, `data-invalid` state), `checkbox` (Minus for indeterminate), `switch`, `radio-group`, `slider`, `select`, `combobox` (Popover+Command), `popover`, `hover-card`, `dropdown-menu`, `context-menu`, `dialog`, `alert-dialog`, `sheet` (side sheet), `command` (⌘K), `alert`, `accordion`, `collapsible`, `tabs`, `table`, `pagination`, `badge` (+ `BadgeNumber`), `avatar`, `progress`, `spinner`, `separator`, `scroll-area`, `skeleton`, `toggle`/`toggle-group`, `aspect-ratio`, `resizable`, `carousel`, `calendar` (react-day-picker), `date-picker` (Popover+Calendar), `tooltip`, `kbd`, `empty`, `input-group`, `input-otp`, `item`, `menubar`, `navigation-menu`, `sidebar`, `sonner` (toasts).

**Button hierarchy:** one primary action per view — the primary CTA is the
neutral `bg-primary text-primary-foreground` (near-white in FP, near-black in
Light). `bg-brand` (orange) is reserved for where a brand emphasis is
specifically called for. Everything else is `secondary` / `outline` / `ghost`.

**FP-composed patterns** (rebuild these from the primitives + tokens as needed):
- **Data table** — `rounded-md` with an **outer stroke** `border border-fp-outline-2`; header row on `bg-fp-surface-1a`; horizontal row dividers only (no vertical gridlines); status cells use the `status-*` tokens by row meaning.
- **Editable table cell (dropdown/input)** — the trigger **fills the whole cell** (`td` gets `p-0`, control gets `h-full w-full`); hover/open paint **`bg-accent` across the entire cell, no inset outline**; two-line cell = title (`text-foreground`) over description (`text-muted-foreground`).
- **Stacked delete-confirm** — after a trash click, the same action cell becomes a **52×52** vertical split: ✕ cancel (top, `bg-fp-card-1`) over ✓ confirm (bottom, `bg-destructive text-white`), clipped `rounded-md`.
- **Banners** (two types): **Callout** = full-width solid `bg-fp-banner-{status}` bar, white text, optional CTA or dismiss ✕; **Inline alert** = compact 32px bar on `bg-fp-card-1` where the icon+text take `text-fp-banner-accent-{status}`.
- **Cards / KPI tiles** — `rounded-lg border border-fp-outline-1 bg-card p-4/5`; number `text-2xl/3xl font-semibold tabular-nums`; delta pill green (`bg-status-success/15 text-status-success`) / red (`bg-destructive/15 text-destructive`) with an `ArrowUp`/`ArrowDown`.
- **Charts** — Recharts; see §8.
- **Kanban** — fixed-width lanes (`w-[340px] bg-fp-card-1 rounded-md`) with a 4px colored top strip (`bg-fp-lane-*`), header (title + count pill + `ArrowDownUp`), and a scrollable card stack.

---

## 8. Interaction & behaviour rules
- **Feedback for every action** — loading, empty, success, error states exist;
  use `sonner` toasts for confirmations, inline `field` errors for validation.
- **Reversible/guarded destructive actions** — the 52px confirm, or `AlertDialog`.
- **Focus** — every interactive element shows a visible ring:
  `focus-visible:ring-2 focus-visible:ring-ring/50` (add `ring-inset` inside cells).
- **Hover** — subtle: `hover:bg-accent` (full-cell for table cells).
- **Charts (Recharts) — two gotchas that are easy to miss:**
  1. `var(--token)` does **not** resolve inside SVG presentation attributes.
     Read the token to a hex at runtime (`getComputedStyle` on an in-tree element,
     re-read on theme change) and pass that to `stroke`/`fill`; or use the
     theme-independent `chart-1..5` hexes for series colors.
  2. Set **`isAnimationActive={false}`** on series so they render immediately.
     Convention: `--brand`/`chart-1` primary series, `--fp-outline-1` gridlines,
     `--muted-foreground` axis ticks.

---

## 9. Typography & spacing rhythm
- Font: **Geist**. Weights used: 400 / 500 / 600.
- Display headings: `text-heading-sm|md|lg|xl` (24 / 36 / 48 / 60px, semibold).
- Body: Tailwind's default `text-xs…` ramp. Labels/secondary in `text-muted-foreground`.
- Numbers: `tabular-nums`.
- Radius: `rounded-sm 6 · md 8 · lg 10 · xl 14` (buttons/inputs/cards land on md–lg).
- Vertical rhythm between stacked blocks: 96px between sections, 24px eyebrow→title,
  16px title→body, 12px within a group (use `gap-*` / the `--spacing-section-*` tokens).

---

## 10. Decision rules (when to use what)
- **Sheet vs Dialog** — Sheet = edge-anchored panel for a focused sub-task or record detail that keeps page context (forms, detail views, asset pickers; can be wide). Dialog = centered modal for a short, self-contained decision or message (confirm, quick create, alert; blocks until resolved).
- **Toast (Sonner) vs Banner** — Toast = transient, dismissible feedback about an action just taken (auto-dismisses; not tied to a region). Banner = persistent, section-level message about state (a filter is active, a warning applies here; stays until resolved/dismissed).
- **Banner Callout vs Inline alert** — Callout (Type 1) = prominent solid-fill bar with an optional CTA or dismiss. Inline alert (Type 2) = compact 32px bar on the card surface, status shown by icon + text color.
- **Card vs inner card** — `bg-card` = a panel directly on the content layer (separates via a `border-fp-outline-1` hairline). `bg-fp-card-1` = a card nested inside another card/lane (steps up one elevation).
- **Select vs Dropdown menu** — Select = pick one value to set a field (returns a value; forms). Dropdown menu = trigger a set of actions/toggles (row actions, column filters; items *do* things).

## 11. Common mistakes (❌ wrong / ✅ right)
- **Brand color** — ❌ `bg-[#fa6400]` · ✅ `bg-brand`. Hardcoded hex breaks theming (Light/FP) and drifts from the palette.
- **Accent / CTA** — ❌ `bg-primary` as the primary button (it's the neutral) · ✅ `bg-brand text-brand-foreground`. `--brand` is the orange; `--primary` is near-white in FP.
- **Icons** — ❌ Tabler / Hugeicons / Phosphor / Remix / emoji · ✅ `lucide-react` only.
- **Content layer** — ❌ an outer `border` · ✅ no border + `shadow-fp-surface` to lift it.
- **Radius** — ❌ `rounded-[5px]` · ✅ the scale: `rounded-md` (buttons/inputs), `rounded-lg` (cards).
- **Light mock** — ❌ copy the white cards / a foreign palette · ✅ re-map every color to FP tokens (dark-primary). Translate, don't trace.

## 12. Conformance checklist (self-check before shipping)
- [ ] Every color is a token (no raw hex / no foreign palette).
- [ ] `--brand` orange is the accent/primary CTA; `--primary` is not misused as brand.
- [ ] All icons are Lucide.
- [ ] Both Light and FP render; FP is default; toggle persists to `fp-theme`.
- [ ] Surfaces layer correctly (background → drawer → content) with `shadow-fp-surface`
      on floating chrome; content layer has no outer border.
- [ ] Component variants follow data meaning (semantic).
- [ ] One primary action per view; consistent button hierarchy.
- [ ] Visible focus rings; keyboard-operable; icon-only buttons have `aria-label`.
- [ ] Text contrast ≥ WCAG AA in both modes.
- [ ] Radii/type/spacing come from the scale, not one-off values.

---

## 13. Prompt preamble (copy-paste to your tool)
> Build using the FleetPanda Design System defined in this file. Use Tailwind v4 +
> shadcn/ui (new-york) + Lucide icons. Paste the provided `globals.css` as the
> global stylesheet and drive **all** color/radius/spacing from its tokens — never
> hardcode hex. Default to the FP (dark) theme with a Light toggle on `.dark`.
> Compose screens from the listed components and follow the surface/elevation,
> layout, and interaction rules. My prototype's screens and flows differ from the
> reference — adapt my content into this system; do not restyle away from it. Run
> the §10 conformance checklist before finishing.
