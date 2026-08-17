# UI · Execute

The building blocks and visual recipes — plus the verbatim token stylesheet.

## Primitives inventory (don't rebuild these)
Install shadcn/ui (new-york); the tokens restyle them into FP. Available:

`button` (default/secondary/outline/ghost/destructive/link; sizes sm/default/lg/icon),
`button-group`, `input`, `textarea`, `label`, `field`, `checkbox` (Minus for
indeterminate), `switch`, `radio-group`, `slider`, `select`, `combobox`
(Popover+Command), `popover`, `hover-card`, `dropdown-menu`, `context-menu`,
`dialog`, `alert-dialog`, `sheet`, `command` (⌘K), `alert`, `accordion`,
`collapsible`, `tabs`, `table`, `pagination`, `badge` (+`BadgeNumber`), `avatar`,
`progress`, `spinner`, `separator`, `scroll-area`, `skeleton`, `toggle`/`toggle-group`,
`aspect-ratio`, `resizable`, `carousel`, `calendar` (react-day-picker), `date-picker`,
`tooltip`, `kbd`, `empty`, `input-group`, `input-otp`, `item`, `menubar`,
`navigation-menu`, `sidebar`, `sonner`.

Extra deps beyond the base stack: `input-otp`, `sonner`, `recharts`,
`react-day-picker@^9`, `embla-carousel-react`, `react-resizable-panels@4` (v4 API:
`orientation` + Group/Panel/Separator). **Confirm before adding a runtime dep.**

## Typography rhythm helpers
`Stack` (section/title/heading/body/pair spacing), `Eyebrow`, `SectionHeading`,
`LabelValue` (`components/typography`). Use these for vertical rhythm rather than
ad-hoc margins. Rhythm: 96px between sections, 24px eyebrow→title, 16px title→body,
12px within a group.

## FP-composed patterns (rebuild from primitives + tokens)
- **Data table** — `rounded-md` with an **outer stroke** `border border-fp-outline-2`; header on `bg-fp-surface-1a`; horizontal row dividers only (no vertical gridlines); status cells use `status-*` by row meaning. **Sticky header:** the table's own bordered box owns *both* scroll axes (neutralize the shadcn `Table` wrapper's inner `overflow-x-auto` — `[&_[data-slot=table-container]]:overflow-visible` — or its unconstrained height breaks sticky), the `<thead>` is `sticky top-0 z-20` (put stickiness on `thead`, not the `th` cells — th-level sticky is unreliable with collapsed borders), and the header cells carry a **solid `bg-fp-surface-1a`** + bottom hairline so rows scroll *under* the titles, never through them.
- **Editable table cell** — the trigger fills the whole cell (`td` gets `p-0`, control `h-full w-full`); hover/open paint `bg-accent` across the entire cell, no inset outline; two-line cell = title over description.
- **Stacked delete-confirm** — the action cell becomes a **52×52** vertical split: ✕ cancel (top, `bg-fp-card-1`) over ✓ confirm (bottom, `bg-destructive text-white`), clipped `rounded-md`. *(Behaviour: `interactions/6-execute`.)*
- **Banners** — Callout (Type 1): full-width solid `bg-fp-banner-{status}`, white text, optional CTA/dismiss. Inline alert (Type 2): compact 32px bar on `bg-fp-card-1`, icon+text in `text-fp-banner-accent-{status}`.
- **Cards / KPI tiles** — `rounded-lg border border-fp-outline-1 bg-card p-4/5`; number `text-2xl/3xl font-semibold tabular-nums`; delta pill green (`bg-status-success/15 text-status-success`) / red (`bg-destructive/15 text-destructive`) with `ArrowUp`/`ArrowDown`.
- **Kanban** — fixed-width lanes (`w-[340px] bg-fp-lane rounded-md`) with a 4px colored top strip (`bg-fp-lane-*`), header (title + count pill + `ArrowDownUp`), scrollable card stack. `bg-fp-lane` is a hair lighter than `bg-fp-card-1` in light mode so white cards read on top.
- **Charts** — Recharts; setup + gotchas in `interactions/6-execute`.

Reference implementations: `tables-layout/`, `form-layout/`, `side-sheet/`,
`modals-demo/`, `info-cards/`, `fields-demo/`, `kanban-board/`, `dashboard/`,
`component-demos/` (a `<Name>Demo.tsx` per primitive).

## Token stylesheet (`globals.css`) — paste verbatim
This is the single source of truth (both modes, every token). Reproduced from the
repo's `src/index.css`.
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
  --color-fp-lane: var(--fp-lane);
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
  --fp-lane: #f4f5f8; /* Kanban lane track (light) — subtle tint, lighter than card-1 so white cards read on top */
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
  --fp-lane: #2a2f37; /* Kanban lane track (FP) — unchanged from card-1 */
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
