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
- **App shell** — Tier-0 global top bar + tier-1 rail + optional tier-2 drawer + content layer; laid out as a `flex-col` (top bar on top) over a `flex` row (rail + padded region). Spacing laws: 8px gaps/outer margin, 16px content-body inset.
- **Global top bar** — full-width `bg-background border-b border-border` band (`h-12`); three equal flex thirds: **brand logo** left · **global search** centered (`Input` + `Search` icon + `⌘K` `Kbd`) · **notifications + account** right (`Bell` with an unread dot · `Avatar` + `DropdownMenu`).
- **Rail (tier-1)** — 52px `bg-rail`, hover-expands to a 256px overlay that **stays `bg-rail`** (the colour does not change on expand; 52px footprint reserved, no reflow). **Navigation only** — the brand lives in the top bar; a **module switcher** sits at the rail's top (opens in-place and pins the rail open).
- **Compact content header** — the breadcrumb path **is** the header (no `text-2xl` title, no bottom divider); the tab row / toolbar pull up to ~12px beneath (`-mt-3.5` against the 16px body inset); breadcrumb crumbs `gap-1` (4px apart).
- **Preset-view tabs** — a `line`-style tab bar at `text-xs`; the active tab's underline hugs the label; a `MoreHorizontal` menu (rename / delete / update) reveals on hover without extending the underline.
- **Data table** — `rounded-md` with an **outer stroke** `border border-border` (follows the `border` token → FP/Outline 1); header on `bg-fp-surface-1a`; horizontal row dividers only (no vertical gridlines); status cells use `status-*` by row meaning. **Sticky header:** the table's own bordered box owns *both* scroll axes (neutralize the shadcn `Table` wrapper's inner `overflow-x-auto` — `[&_[data-slot=table-container]]:overflow-visible` — or its unconstrained height breaks sticky), the `<thead>` is `sticky top-0 z-20` (put stickiness on `thead`, not the `th` cells — th-level sticky is unreliable with collapsed borders), and the header cells carry a **solid `bg-fp-surface-1a`** + bottom hairline so rows scroll *under* the titles, never through them.
- **Status chip** — one component, three treatments, via `StatusChip` (`ui/status-chip.tsx`): `dot` (token-coloured dot, neutral label — the quietest, for dense grids), `text` (dot **and** label share the tone via `bg-current`, no fill), `soft` (`bg-status-*/10` + tone text — the canonical treatment for a state that must be noticed, same recipe as the `destructive` Badge variant). The dot is `aria-hidden` (it repeats the label) and colour is never the only carrier of meaning. **Tones are visual channels, not statuses** — per colour governance a status carries no colour until a usage rule binds it, so the DS ships `success | processing | failed | info | neutral` and each application declares its own mapping (the table's lives in `statusTone()` in `tables-layout/data.ts`, from which the filled-Badge variant is *derived* so the two treatments cannot drift). **Contrast caveat (measured):** `dot` is safe on any surface (14.6 dark / 20.5 light) because its label stays `foreground`; `text` and `soft` fall below WCAG AA on **light** surfaces for the success and processing tones (text 3.30 / 3.19; soft 2.96 / 2.86; soft-failed 4.13) because the light `--status-*` values are too light to carry text on `#ffffff`. This is pre-existing, not new — the `destructive` Badge variant already ships the same recipe at 4.13 in light. The light `--status-success` / `--status-processing` values have since moved one step down their own ramp (green-600 -> green-700, amber-600 -> amber-700), which fixes `text` in light (3.30/3.19 -> 5.02/5.02). `soft` still lands at ~4.4 on light because a 10% tint of the label's own hue lifts the background faster than it darkens the text — large-text only until the tint stops being a straight alpha and becomes its own measured pair. Prefer `dot` or `text` on light surfaces. See `00-meta/token-provenance.md`.
- **Pastel code disc** — a 22px pastel circle carrying a 12px initial, for dense rows where a full pill will not fit: `Badge shape="disc"` supplies the geometry, `CodeDisc` (`ui/code-disc.tsx`) is the wrapper that makes the accessible label non-optional (`label` feeds both the tooltip and `aria-label`, and the span is `tabIndex=0` so the tooltip is keyboard-reachable). Hues are generic (`--pastel-blue`, `--pastel-amber`) — applications bind meaning. *(Both pastel pairs were chosen in the repo and measure AAA; extending the set is a one-line change per pair — measure the pair before adding it. See `00-meta/token-provenance.md`.)*
- **Bulk-attribute edit** — never a popover that commits on click. Three tiers by cardinality (scalar → single input; one-value-per-row → searchable select; a collection per row → multi-select), each opening a **dialog**, each taking the same two-step shape via `BulkEditDialog` (`components/bulk-edit/`): (1) picker, header leading with **scope + count**, primary gated until a value is picked; (2) per-row **before/after** preview, title becomes "View Summary", footer becomes `Go back` / `Confirm`; (3) commit → **toast**. Destructive replaces arm before they commit. **Why both steps earn their keep:** the operator must see the state that *already exists* on the target before piling onto it — `StandingItems` surfaces that standing state in step 1, `BeforeAfterTable` shows the delta in step 2. Collapsing to one step removes the only chance to notice you are about to replace something. `before` renders muted + `line-through` so a row reads as a replacement, with an em-dash fallback so "had nothing" and "had something" stay distinct. The dialog always reopens on step 1 — reopening mid-flow would offer a Confirm for a value the operator can no longer see. Body scrolls at `max-h-[55vh]`; header and footer stay put. **Inner panels use `bg-fp-surface-1b`, not `bg-fp-card-1`** — measured against the dialog's own `bg-background`, card-1 is only [6,3,6] away in light (near-invisible) while surface-1b is [16,16,20] light / [19,24,32] dark.
- **Faceted filter panel** — facet side-menu + options pane. **The search field is per-facet and opt-in** (`Facet.searchable`): a facet gets one when its option list *cannot be taken in at once*, and does not when the list is short enough to scan — on a two-option facet a search field can only ever filter to one of the two, and it pushes the options down for nothing. Use an **explicit flag, not a length threshold**: a threshold silently changes a facet's affordance as its options grow or shrink, so the same facet gains and loses a control without anyone deciding. When the field is absent the option list needs its own `pt-2`, or it starts flush against the panel edge; placeholder reads `Search {facet}…`, matching the DS's `Search…` convention. Switching facets clears the query — carrying it over lets a term typed on a searchable facet silently filter a facet with no field to clear it in.
- **Selection is a hue, hover is a grey.** They are different meanings and must never share a token: `--accent` means *the pointer is here*, `--selected` means *this is the one*. Before the split they both resolved to `--accent` on the toggle group, so a hovered segment and the selected one were pixel-identical — and the grey they shared measured 1.14:1 on the content layer, so neither read. Selection is a tint of a DIFFERENT colour, which the eye finds instantly at a luminance where it cannot find a tint of the same one. **Light takes the brand** (`#fee8d9` fill, `#a33f00` label — a darkened brand, because `#fa6400` on its own tint is only 2.56); **dark takes grey** (`--fp-card-1`, white label), because any orange dark enough to sit quietly on a near-black ground has gone brown by the time it gets there, and dark has far more room between `#11161d` and `#2a2f37` than light has between `#ffffff` and any grey. Bound by: `Toggle`/`ToggleGroup` `data-[state=on]`, `Tabs` active trigger and underline, `--sidebar-accent`, `--fp-row-selected`.
- **Table row states** — hover and selected are their own tokens, `--fp-row-hover` / `--fp-row-selected`, **not** `--accent`. A row state is a full-width wash *behind* content, so it must sit far quieter than a control fill: borrowing `--accent` gave light-mode rows a `[53,46,36]` step off `#ffffff` when selected and `[26,23,18]` on hover — a control-emphasis value doing a background's job. The tokens keep an ordered, subtle progression off the content layer — light `hover [11,10,7] -> selected [22,19,14]`, dark `[7,7,7] -> [15,15,15]` — with selected always the stronger of the two. Anything that mirrors a row wash (a sticky column overlay, an expanded-parent tint, the `tfoot` band) binds the same two tokens, or it drifts out of step with the row it belongs to.
- **Editable table cell** — the trigger fills the whole cell (`td` gets `p-0`, control `h-full w-full`); hover/open paint `bg-accent` across the entire cell, no inset outline; two-line cell = title over description.
- **Stacked delete-confirm** — the action cell becomes a **52×52** vertical split: ✕ cancel (top, `bg-fp-card-1`) over ✓ confirm (bottom, `bg-destructive text-white`), clipped `rounded-md`. *(Behaviour: `interactions/6-execute`.)*
- **Banners** — Callout (Type 1): full-width solid `bg-fp-banner-{status}`, white text, optional CTA/dismiss. Inline alert (Type 2): compact 32px bar on `bg-fp-card-1`, icon+text in `text-fp-banner-accent-{status}`.
- **Cards / KPI tiles** — `rounded-lg border border-fp-outline-1 bg-card p-4/5`; number `text-2xl/3xl font-semibold tabular-nums`; delta pill green (`bg-status-success/15 text-status-success`) / red (`bg-destructive/15 text-destructive`) with `ArrowUp`/`ArrowDown`.
- **Kanban** — fixed-width lanes (`w-[340px] bg-accent rounded-md`) with a 4px colored top strip (`bg-fp-lane-*`), header (title + count pill + `ArrowDownUp`), scrollable card stack; cards sit on `bg-fp-surface-1b`. *(The `--fp-lane` token is legacy — lanes now bind to `accent` / FP-Card-1.)*
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
  Explicit source roots (paths are relative to THIS file).

  Tailwind v4 otherwise auto-detects sources from the build's working directory.
  The Unified View prototype builds with Vite `root` set to its own folder
  (UNIFIED=1), which anchored detection there and silently dropped every utility
  used only under src/ — the rail lost `bg-rail` / `w-[52px]`, the content layer
  lost `bg-fp-surface-1b`, the brand tile lost `bg-brand`. Declaring the roots
  here makes the generated CSS identical no matter which entry is being built.
*/
@source "../src";
@source "../prototypes";

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

/* Module-switch progress — a thin bar that fills left→right on selection. */
@keyframes module-switch-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
.module-switch-progress {
  transform-origin: left center;
  animation: module-switch-progress 600ms ease-out forwards;
}

/* Completion celebration — a circled tick that pops in with a slight overshoot. */
@keyframes module-check-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.18);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.module-check-pop {
  animation: module-check-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
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
  --color-sidebar-accent-hover: var(--sidebar-accent-hover);
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
  --color-chip: var(--chip);
  --color-fp-lane: var(--fp-lane);
  --color-fp-board-lane: var(--fp-board-lane);
  --color-fp-table-header: var(--fp-table-header);
  --color-fp-row-hover: var(--fp-row-hover);
  --color-fp-row-selected: var(--fp-row-selected);
  --color-selected: var(--selected);
  --color-selected-foreground: var(--selected-foreground);
  --color-selected-border: var(--selected-border);
  --color-fp-surface-base: var(--fp-surface-base);
  --color-status-foreground: var(--status-foreground);
  --color-status-success: var(--status-success);
  --color-status-success-foreground: var(--status-success-foreground);
  --color-status-processing: var(--status-processing);
  --color-status-failed: var(--status-failed);
  --color-status-pink: var(--status-pink);
  --color-verified: var(--verified);
  --color-verified-foreground: var(--verified-foreground);
  --color-fp-banner-foreground: var(--fp-banner-foreground);
  --color-fp-banner-info: var(--fp-banner-info);
  --color-fp-banner-border-info: var(--fp-banner-border-info);
  --color-fp-banner-border-caution: var(--fp-banner-border-caution);
  --color-fp-banner-border-warning: var(--fp-banner-border-warning);
  --color-fp-banner-border-success: var(--fp-banner-border-success);
  --color-fp-banner-caution: var(--fp-banner-caution);
  --color-fp-banner-warning: var(--fp-banner-warning);
  --color-fp-banner-success: var(--fp-banner-success);
  --color-fp-banner-accent-info: var(--fp-banner-accent-info);
  --color-fp-banner-accent-caution: var(--fp-banner-accent-caution);
  --color-fp-banner-accent-warning: var(--fp-banner-accent-warning);
  --color-fp-banner-accent-success: var(--fp-banner-accent-success);
  --color-pastel-blue: var(--pastel-blue);
  --color-pastel-blue-foreground: var(--pastel-blue-foreground);
  --color-pastel-amber: var(--pastel-amber);
  --color-pastel-amber-foreground: var(--pastel-amber-foreground);
  --color-pastel-violet: var(--pastel-violet);
  --color-pastel-violet-foreground: var(--pastel-violet-foreground);
  --color-pastel-rose: var(--pastel-rose);
  --color-pastel-rose-foreground: var(--pastel-rose-foreground);
  --color-pastel-slate: var(--pastel-slate);
  --color-pastel-slate-foreground: var(--pastel-slate-foreground);
  --color-pastel-teal: var(--pastel-teal);
  --color-pastel-teal-foreground: var(--pastel-teal-foreground);
  --color-pastel-green: var(--pastel-green);
  --color-pastel-green-foreground: var(--pastel-green-foreground);
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
  /* Surface elevation (28679:1109 → drop-shadow/lg): the content layer lifts
     off the app background with a soft drop shadow (black 15%). */
  --shadow-fp-surface: 0 4px 4px 0 rgb(0 0 0 / 0.15);
  /* Overlay elevation — the tier ABOVE the content layer, for elements that
     float over their own content (the bulk-action bar; dialogs and popovers
     should follow).

     FULLY FIGMA-SOURCED. This is the FP DS 2026 library's `shadow/xl` effect
     style verbatim: `0 8px 10px -6px` + `0 20px 25px -5px`, black @10%, the same
     in both themes. (The library ships shadow/sm, /lg and /xl — there is no
     shadow/md, so any rule naming `--shadow-md` names a token this DS does not
     have.)

     WHY THERE ARE NO PER-THEME ALPHAS ANY MORE. An earlier revision escalated
     the dark alpha to 55% because 10% black over the bar's real backdrop
     (selected rows, `--accent` #2a2f37) separates by only [4,5,5]. That was
     fighting the medium: black on a dark surface has almost no range, so the
     shadow can never be the separator there.

     ON DARK, ELEVATION IS A LIGHTER RIM — NOT A DARKER SHADOW. Measured against
     `--accent`, per theme:
         rim --fp-outline-1   dark [12,13,14]   light [24,20,15]
         rim --fp-outline-2   dark [45,40,32]   light  [0,0,0]  <-- collided
         fill --fp-card-1     dark  [0,0,0]     light [31,27,22]
     So the rim token had to differ by theme — `--fp-outline-2` sat on top of
     `--accent` in light. Overlay-tier elements therefore carry
     `border-fp-outline-1 dark:border-fp-outline-2`, which gives BOTH themes a
     working rim, and the shadow returns to being ambient depth at Figma's 10%.

     SUPERSEDED, PARTLY: `--fp-outline-2` moved to #c4c4c9 to fix the hover
     inversion, so it no longer collides with `--accent` and light now has a
     working rim of its own. The `dark:` variant above is therefore no longer
     load-bearing — it is left in place because unpicking it touches every
     overlay-tier surface, which is a separate change with its own before/after.

     DS FOLLOW-UP (Figma): the library has no overlay-rim token. One variable
     would replace the `dark:` variant above. The shadow scale itself needs no
     change — it was correct for light all along. */
  --shadow-fp-overlay:
    0 8px 10px -6px rgb(0 0 0 / 0.1),
    0 20px 25px -5px rgb(0 0 0 / 0.1);
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

  /* ------------------------------------------------------------------
     LAYER 1 — PRIMITIVES. The only place a colour literal is written.
     One family per role, each with a light value here and a dark value in
     `.dark`. Change a colour HERE and every semantic token that aliases it
     moves with it, in both themes.

     This layer exists because it did not, and the cost was measurable: the
     light selection grey was spelled out five separate times, so changing it
     in one place left four behind and the same colour rendered in two shades
     at once. Figma has always had this structure (FP/Card 1, FP/Surface 1b,
     FP/Outline 1-2, and base/muted aliasing FP/Card 2) — the CSS had
     flattened it into a literal per semantic token and kept the mapping only
     in comments.
     ------------------------------------------------------------------ */
  --fp-ink-1: #030405; /* body text */
  --fp-ink-2: #090c0f; /* text on an emphasis fill */
  --fp-ink-3: #596475; /* secondary text */
  --fp-ink-inverse: #f0f2f5; /* text on the primary fill */
  /* THE GROUND IS A COOL GREY, not a warm one. #efefeb carried a yellow cast
     that fought the neutral greys everything on top of it is cut from — the
     content layer, the card steps and the strokes are all blue-leaning, so the
     one surface underneath them was the only warm thing on the page and it
     read as age rather than as paper. #f3f4f7 is the same lightness in the
     family the rest of the ladder already belongs to. */
  --fp-surface-base: #f3f4f7; /* the app ground */
  /* THE INNER PANEL IS A STEP, NOT MORE WHITE. It was #ffffff — identical to
     the content layer it sits on and to --card, which aliases it — so a card
     had nothing to separate by except its border, and the whole theme read as
     boxes drawn on paper. It is the same value as --fp-card-2 on purpose: the
     "inner panel" and "the quieter card step" are one surface with two names,
     and inventing a fourth near-white between them would only crowd a ladder
     that is already tight at the top. */
  --fp-surface-1a: #f4f5f8; /* inner panel — one step under the content layer */
  --fp-surface-1b: #ffffff; /* content layer */
  --fp-card-1: #e9ecf1; /* raised card / inset block */
  --fp-card-2: #f4f5f8; /* the quieter card step (Figma FP/Card 2) */
  --fp-card-3: #fafafa; /* the faintest step — a board lane's ground */
  /* SELECTION / control emphasis. Light value owned by the Figma sync on main
     (base/accent, base/sidebar-accent -> gray/200). That sync also split this
     family in two: it puts --accent/--sidebar-accent on gray/200 but
     --secondary/--muted on zinc/100, which one primitive cannot hold, hence
     --fp-emphasis-quiet below. In dark both still resolve here. */
  --fp-emphasis: #e5e7eb;
  /* SELECTION IS A HUE, NOT A GREY. --fp-emphasis on the content layer is
     1.14:1 — a tint the eye cannot find, which is why every selected row, tab,
     nav item and segment read as unselected. A tint of a DIFFERENT colour is
     found instantly at the same luminance.

     THE HUE IS THE BRAND. Every shade here is #fa6400 with the saturation
     taken out of it, so "this is the one" and "this is FleetPanda" are the
     same colour said at three volumes — which is what makes a product feel
     like one product rather than a component library.

     THE STRONG SHADE IS A DARKENED BRAND, not the brand itself: #fa6400 on its
     own tint measures 2.56, and this shade is the one that has to carry text. */
  --fp-selected: #fee8d9;        /* the brand at 15% over white — the fill */
  --fp-selected-strong: #a33f00; /* the brand darkened — text, icon, indicator */
  --fp-selected-border: #fdb98c; /* the brand at 45% — its rim */
  /* The quieter half of the emphasis split — base/secondary and base/muted,
     zinc/100. Exists only because light needs two values where dark needs one;
     in dark --secondary re-aliases --fp-emphasis and --muted --fp-card-2. */
  --fp-emphasis-quiet: #f4f4f5;
  /* Hover, one step under selection. NOT retuned by the Figma sync — nothing in
     the Figma collection covers it — but the sync moved --fp-emphasis to
     gray/200, which narrowed the gap between the two from [-12,-12,-12] to
     [-4,-6,-10]. Two things to note if this pair gets revisited: the step is now
     small enough to be easy to miss, and hover is DARKER than selection here,
     the opposite way round from --fp-row-hover/--fp-row-selected, which go
     [11,9,7] lighter. Both predate this merge; left as-is rather than inventing
     a value. */
  --fp-emphasis-hover: #eceef2;
  --fp-outline-1: #e2e5ea; /* quiet rim */
  /* STRONGER RIM — and it now actually is stronger.
     It was #ededed, which measured 1.17:1 on white against --fp-outline-1's
     1.26: the "stronger" rim was the WEAKER of the two, so every Kanban card
     (BoardView, KanbanBoard, BrokerBoard all pair `border-fp-outline-1` with
     `hover:border-fp-outline-2`) got LIGHTER on hover. The affordance ran
     backwards. At #c4c4c9 the step is 1.26 -> 1.74, +0.47 in the right
     direction.
     It carries the same value as --fp-stroke-field and stays a SEPARATE
     primitive, the same discipline --fp-lane / --fp-board-lane follow: this
     one is a rim (border, and a 1px connector fill in five places), that one
     is a field's only boundary. Two jobs, two tokens, so retuning one never
     drags the other. */
  --fp-outline-2: #c4c4c9;
  /* THE HAIRLINE FAMILY — THREE WEIGHTS, THREE JOBS.
       --fp-outline-1     #e2e5ea  1.26:1  a card's own rim
       --fp-stroke-hairline #d4d4d8  1.48:1  a structural divider
       --fp-stroke-field  #c4c4c9  1.74:1  a field's boundary, and the rim
                                           that has to beat a card's

     THE SPLIT IS BECAUSE A FIELD BORDER DOES MORE WORK THAN A DIVIDER. In
     light an Input is `bg-transparent` — only dark gets `dark:bg-input/30` —
     so the border is the ONLY thing that makes a field a field. A divider
     merely separates two things that exist anyway. One value cannot be right
     for both, and it was: the Figma sync put base/border and base/input on
     zinc/400 (#a1a1aa, 2.56:1), a mid grey five times the weight of the card
     rim, and a tab strip's rule read as a hard line rather than a separation.

     #c4c4c9 IS NOT ON THE TAILWIND RAMP, on purpose. The neutral ramps jump
     straight from ~1.48 at 300 to ~2.56 at 400, and the weight a field border
     wants is inside that gap. It keeps zinc's hue (B-R +5, against zinc/300's
     +4) so the three sit on one line rather than reading as three greys.

     MEASURED 3:1 IS NOT REACHABLE HERE. WCAG 1.4.11 asks 3:1 for a control's
     boundary; on white that first happens at #949494. Nothing on any neutral
     ramp meets it — zinc/400 did not either — so this was never an accessible
     vs not choice, only a weight one. Worth revisiting with a filled input,
     which is the fix that would actually close it. */
  --fp-stroke-hairline: #d4d4d8; /* structural divider — base/border, zinc/300 */
  --fp-stroke-field: #c4c4c9; /* field boundary — base/input, off-ramp by design */
  /* Destructive / failed. Light stays red-600 because --status-failed carries
     body-sized status text and measures 4.83 here. --destructive no longer
     aliases this in light: the Figma sync moved it to red/500 (#ef4444, 3.76),
     so the two are independent in light and rejoin in dark. */
  --fp-danger: #dc2626;

  /* ------------------------------------------------------------------
     LAYER 2 — SEMANTICS. No literals. Tokens whose primitive is the same in
     both themes are declared ONCE, here: `var()` resolves at use time, so
     redefining the primitive under `.dark` re-resolves them automatically and
     they never appear in the dark block at all.
     ------------------------------------------------------------------ */

  --foreground: var(--fp-ink-1);
  --card: var(--fp-surface-1a);
  --card-foreground: var(--fp-ink-1);
  --popover: var(--fp-surface-1b);
  --popover-foreground: var(--fp-ink-1);
  --primary-foreground: var(--fp-ink-inverse);
  --secondary-foreground: var(--fp-ink-2);
  --muted-foreground: var(--fp-ink-3);
  --accent: var(--fp-emphasis);
  --accent-foreground: var(--fp-ink-2);
  /* HOVER AND CHOSEN ARE DIFFERENT MEANINGS. They shared --accent, so a
     hovered segment and the selected one were pixel-identical. --accent stays
     the grey for "the pointer is here"; --selected is the blue for "this is
     the one". */
  --selected: var(--fp-selected);
  --selected-foreground: var(--fp-selected-strong);
  --selected-border: var(--fp-selected-border);

  --border: var(--fp-stroke-hairline);
  --input: var(--fp-stroke-field);
  --sidebar-foreground: var(--fp-ink-1);
  /* WHERE YOU ARE IS NOT WHAT YOU PICKED. The nav's current item and a ticked
     table row were sharing the selection family, so the rail, the drawer and
     every chosen row spoke with the same orange — and the loudest of the three
     was the one saying the least, since a rail item is simply reporting the
     page you are already looking at. Navigation state goes neutral: the
     emphasis fill one step under the sidebar's own hover, with body ink on it.
     `--selected` stays brand, and now means only "you chose this". */
  --sidebar-accent-foreground: var(--fp-ink-1);
  --sidebar-accent-hover: var(--fp-emphasis-hover);
  --rail: var(--fp-surface-base);
  --fp-row-selected: var(--fp-selected);
  --status-failed: var(--fp-danger);

  /* Light-only aliases — these map to a DIFFERENT primitive in dark. */
  --muted: var(--fp-emphasis-quiet);
  --secondary: var(--fp-emphasis-quiet);
  --sidebar-accent: var(--fp-emphasis);
  --fp-lane: var(--fp-card-2);
  /* A BOARD LANE IS NOT A ROW BAND, and it keeps its own token for that
     reason: `--fp-lane` is the fill behind a grouped table's header row, and
     dragging one to suit the other would move every group band in the app.

     THE VALUE MOVED DOWN A STEP, from --fp-card-3 to --fp-card-2. The
     reasoning for the lighter value was that a lane is a large area holding
     cards that carry their own border, so it could sit very light without
     losing them — true of the cards, and it missed the lane itself. At #fafafa
     on a #ffffff content layer the lane was a 5/255 step: the cards read
     perfectly and the COLUMN they sat in barely existed, so eight lanes read
     as one field of cards rather than as eight columns. At #f4f5f8 the step is
     11/255 against the layer and 11/255 against the cards inside it — the lane
     is legible as a container from across the room, and a white card on it is
     still the lightest thing in the lane, which is the order that matters. */
  --fp-board-lane: var(--fp-card-2);
  /* A TABLE HEADER NEEDS ITS OWN GROUND. In dark the panel fill already differs
     from the content layer, so the header reads; in light both are #ffffff and
     the header row had nothing but its hairline — a header that is only a line
     stops being a header the moment the first row has a line too.

     IT MOVED OFF THE FAINTEST STEP ONCE TABLES WENT FLUSH INSIDE A SECTION
     CARD. At --fp-card-3 (#fafafa light) it was 5/255 off the rows in light and
     in dark it resolved to the same value as the card's own title band — so a
     table sitting flush under that band had two header rows running together
     and neither of them read. --fp-card-1 is one clear step in both themes:
     distinct from the band above it, distinct from the rows below it, and
     still distinct from the row hover, which is what the faint value was
     originally protecting. */
  --fp-table-header: var(--fp-card-1);
  --fp-row-hover: var(--fp-card-2);
  /* THE APP GROUND IS THE RAIL'S OWN COLOUR, in light as it already is in dark.
     Set to #ffffff it was identical to --card, --popover and both content
     surfaces, so light had no ground/card step at all: the panel and the
     content card separated by border and shadow only, and the 52px rail — the
     one thing still painted --fp-surface-base — read as a stripe drawn ON the
     page rather than as the page showing through. Dark never had this problem
     (--background there has always been --fp-surface-base), so light was the
     odd one out. Now the ground is one tint, the rail disappears into it, and
     the drawer and the content layer are what float. */
  --background: var(--fp-surface-base);
  /* base/destructive -> red/500. 3.76:1 as text on white, under the 4.5 AA
     body threshold; accepted as a design decision. Not --fp-danger, which
     --status-failed keeps at 4.83. */
  --destructive: #ef4444;
  /* FOLDED INTO THE HAIRLINE FAMILY. It was a literal #abb3c2 (2.11:1) left
     over from what --fp-stroke-field used to be, which made the sidebar's own
     divider the DARKEST hairline in the app — heavier than every border it
     sat next to. A sidebar edge is a structural divider like any other, so it
     takes the divider weight and moves with it.
     Light only: dark keeps its own literal below, a translucent white over a
     tinted sidebar, which is a different mechanism and was never the problem. */
  --sidebar-border: var(--fp-stroke-hairline);

  /* No family — one consumer, or a pair no primitive describes. */
  --primary: #090c0f;
  --destructive-foreground: #ffffff; /* white in BOTH themes — the button's
     destructive variant points at this token, and on the red fill white
     measures 3.76 against #fef2f2's 3.44. Same rule as --status-foreground. */
  /* THE FOCUS RING IS A BRAND MOMENT. It was a neutral #727d8f, which on a
     theme made of greys was one more grey. Orange is unmistakable, appears
     only when someone is actually navigating, and is the one place the brand
     can be loud without competing with meaning. */
  --ring: var(--brand);
  /* Categorical chart palette. Declared ONCE and deliberately NOT overridden in
     `.dark`, the same rule the pastel pairs follow: a categorical series colour
     has to stay the same colour in both themes or the same series changes
     identity when you flip, which is exactly what a categorical scale must not
     do. Values are the 3PL branch's (2026-08-29), which postdates the token
     split and is the set actually rendering. */
  --chart-1: #fa6400;
  --chart-2: #3b82f6;
  --chart-3: #22c55e;
  --chart-4: #eab308;
  --chart-5: #8b5cf6;
  /* THE TIER-2 DRAWER SITS ABOVE THE GROUND, WITH THE WORK. It was zinc/50
     (#fafafa), a warm near-white left over from before the ground went cool.
     #fdfdfd is the neutral version of the same idea: a shade off the #ffffff
     content layer beside it and a clear step up from the #f3f4f7 ground both
     panels sit on, so the drawer and the work read as one raised pair with a
     gap between them rather than as a panel pushed behind the page. */
  --sidebar: #fdfdfd;
  /* THE SECTION MARK IS A QUIET TILE, not a second logo. Orange put the
     brand in two places at once — the product mark in the top bar and again
     24px below it in the drawer — and the drawer one was the louder of the
     two while naming only the section you happen to be in. The brand belongs
     to the product, not to "Orders". It takes a card step instead: visible as
     a mark, silent as a colour.

     ONE STEP LIGHTER THAN THE DRAWER IT SITS ON, which is the rule; the rung
     differs because the two ladders are not mirror images. In light the drawer
     is #e9ecf3, so --fp-card-1 (#e9ecf1) would be 2/255 away and gone — the
     mark takes --fp-card-2 (#f4f5f8), 11/255 up. In dark the drawer is #11161d
     and --fp-card-1 is 25/255 up, which is the clearer of the two there. */
  --sidebar-primary: var(--fp-card-2);
  --sidebar-primary-foreground: var(--fp-ink-1);
  --sidebar-ring: #6b7280; /* base/sidebar-ring -> gray/500 */
  --brand: #fa6400;
  --brand-foreground: #ffffff;
  /* PASTEL PAIRS — a light fill with a dark same-hue foreground, declared once
     and NOT overridden in `.dark`: a categorical hue that changed with the
     theme would change identity, which is what a categorical scale must not do.
     Every pair is measured against its own fill and lands in the same band as
     the first two: blue 7.65, amber 7.09, violet 7.50, rose 7.21, slate 7.93,
     teal 7.36, green 7.34. Five hues joined the two originals when a second
     module needed more than two order types to tell apart; the DS ships the
     hues and binds no meaning to them — that is the application's job. */
  --pastel-blue: #a8c9ef;
  --pastel-blue-foreground: #16324f;
  --pastel-amber: #f0c9a4;
  --pastel-amber-foreground: #5a3313;
  --pastel-violet: #c6b8f0;
  --pastel-violet-foreground: #33235c;
  --pastel-rose: #f2b5b5;
  --pastel-rose-foreground: #5c1f1f;
  --pastel-slate: #c9cfd8;
  --pastel-slate-foreground: #2b3542;
  --pastel-teal: #a3d9d4;
  --pastel-teal-foreground: #12403c;
  --pastel-green: #b7dfae;
  --pastel-green-foreground: #21451a;
  --verified-foreground: #ffffff;
  --fp-banner-foreground: #ffffff;
  --status-foreground: #ffffff;
  --drawer: #fafbf8;
  --chip: #efefeb;
  --status-success: #15803d;
  /* WHAT GOES ON A GREEN FILL, which is not what goes on a green DOT.
     `--status-success` is tuned for a mark on the page ground — dark in light,
     bright in dark — so a single foreground cannot serve both: white on the
     light green measures 4.9:1, white on the dark green 2.2:1. The pair flips
     with the theme instead, and the fill stays the same green either way. */
  --status-success-foreground: #ffffff;
  --status-processing: #b45309;
  --status-pink: #db2777;
  --verified: #2563eb;
  /* NO RIM IN LIGHT. The callout is a solid saturated fill here and a border
     on it would be a second edge on a shape that already has one. The token
     exists in both themes so the component does not have to ask which it is
     in — dark is where it carries a colour. */
  --fp-banner-border-info: transparent;
  --fp-banner-border-caution: transparent;
  --fp-banner-border-warning: transparent;
  --fp-banner-border-success: transparent;
  /* FOUR HUES, ONE STEP APART, AND INFO IS BLUE.
     Info was indigo (#3730a3 / #4338ca), which on the light ground read as
     purple — and purple is not a status anybody has been taught. Blue is, and
     the DS was already using it for `--verified` and `--chart-2`, so the
     family now says blue in the one theme where it has to be unmistakable.

     The set is one scale step apart by design: the FILL is the 800 of its hue
     (a solid bar, white text) and the ACCENT is the 700 (the same status said
     quietly — inline text, the soft banner's icon, and the 10%/30% wash and
     rim that soft derives from it). One step is enough to separate a fill from
     a mark on it and close enough that the two never read as two colours. */
  --fp-banner-info: #1e40af;
  --fp-banner-caution: #854d0e;
  --fp-banner-warning: #991b1b;
  --fp-banner-success: #166534;
  /* THE FOURTH ACCENT, which the family was missing. Caution, warning and
     success each had a text colour for the inline banner and info did not, so
     the one status with no way to say itself quietly had to shout in a solid
     fill.

     Success moved off lime (#4d7c0f) onto the green its own fill is cut from.
     Lime beside `--status-success` (#15803d) put two greens on one screen
     saying the same thing, and the one carrying LESS meaning was the brighter
     of the two. */
  --fp-banner-accent-info: #1d4ed8;
  --fp-banner-accent-caution: #b45309;
  --fp-banner-accent-warning: #b91c1c;
  --fp-banner-accent-success: #15803d;
}

/*
  FleetPanda DARK — the original FP values (mapped from the Figma variable
  collection). Applied when `<html>` carries `.dark`. Source variable per token.
*/
.dark {
  /* LAYER 1 — the same primitives, dark values. */
  --fp-ink-1: #f0f2f5; /* body text */
  --fp-ink-2: #f0f2f5; /* text on an emphasis fill */
  --fp-ink-3: #9ca3af; /* secondary text */
  --fp-ink-inverse: #090c0f; /* text on the primary fill */
  --fp-surface-base: #080808; /* the app ground */
  --fp-surface-1a: #11161d; /* inner panel */
  /* DARK SELECTS IN GREY. Light gets the brand, dark does not: any orange dark
     enough to sit quietly on a near-black ground has gone brown by the time it
     gets there, and brown is not a colour this product owns. On a dark theme a
     grey step is already unmistakable — there is far more room between #11161d
     and #2a2f37 than there is between #ffffff and any grey — so the hue that
     light needs to be findable at all, dark does not need.

     The fill is --fp-card-1, the step this theme already uses for a raised
     surface, and the label is the BODY colour (--fp-ink-1, white here) rather
     than --fp-ink-inverse, which is the ink for a light fill and would come out
     near-black. */
  --fp-selected: var(--fp-card-1);
  --fp-selected-strong: var(--fp-ink-1);
  --fp-selected-border: var(--fp-outline-2);
  --fp-surface-1b: #1b2028; /* content layer */
  --fp-card-1: #2a2f37; /* raised card / inset block */
  --fp-card-2: #1b2028; /* the quieter card step (Figma FP/Card 2) */
  --fp-emphasis: #2a2f37; /* SELECTION / control emphasis */
  --fp-emphasis-hover: #363c45; /* hover, one step under selection */
  --fp-outline-1: #363c45; /* quiet rim */
  --fp-outline-2: #575757; /* stronger rim */
  --fp-stroke-hairline: #363c45; /* global hairline */
  --fp-stroke-field: #363c45; /* field border */
  /* Nothing consumes the quiet half in dark — --secondary re-aliases
     --fp-emphasis and --muted --fp-card-2 — but LAYER 1 requires every
     primitive to carry a dark value, so it tracks the family it split from
     rather than leaving a light literal visible in this scope. */
  --fp-emphasis-quiet: var(--fp-emphasis);
  --fp-danger: #f87171; /* destructive / failed */

  /* LAYER 2 — only the tokens whose primitive DIFFERS from light.
     Everything else inherits its alias from `:root` and re-resolves here. */
  --muted: var(--fp-card-2);
  --sidebar-accent: var(--fp-selected);
  --fp-lane: var(--fp-card-1);
  /* Dark keeps the lane exactly where `--accent` had it — only LIGHT was too
     heavy, so only light moves. */
  --fp-board-lane: var(--fp-card-1);
  /* Dark tracks light onto --fp-card-1. It used to be --fp-surface-1a, which
     is the same value the section card's title band takes — two bands of one
     colour stacked, with the table's header invisible under the card's. */
  --fp-table-header: var(--fp-card-1);
  /* Re-joined here. Light had to break these three out of the shared block —
     --background because base/background went white, --secondary because the
     emphasis family split, --destructive because it left --fp-danger — but dark
     keeps every one of them on its original primitive, so dark is unchanged by
     the sync. Verified: zero drift across the FP column. */
  --background: var(--fp-surface-base);
  --secondary: var(--fp-emphasis);
  --destructive: var(--fp-danger);

  /* No family. */
  --primary: #f8fafc;
  --destructive-foreground: #ffffff;
  --ring: var(--brand);
  --sidebar: #11161d;
  /* Same pair as light: the mark is the raised-card step with body ink on it,
     so it keeps one relationship to its surface rather than one colour. */
  --sidebar-primary: var(--fp-card-1);
  --sidebar-primary-foreground: var(--fp-ink-1);
  --sidebar-border: #ffffff1a;
  --sidebar-ring: #575757;
  --drawer: #292929;
  --chip: #2a2f37;
  --fp-row-hover: #22272f;
  --status-success: #22c55e;
  --status-success-foreground: #052e16;
  --status-processing: #f59e0b;
  --status-pink: #ff8080;
  --verified: #3b82f6;
  /* THE CALLOUT IS A TINTED PANEL IN DARK, NOT A SATURATED BAR — Figma
     28161:114645. On a dark ground a solid indigo-800 bar was the brightest
     thing on the page whatever it had to say, so the fill drops to the 950 of
     its hue and the status moves to a 1px rim in the 500. Same three jobs, an
     order of magnitude less shouting. Light is unchanged. */
  --fp-banner-info: #1e1b4b;
  --fp-banner-caution: #422006;
  --fp-banner-warning: #450a0a;
  --fp-banner-success: #052e16;
  --fp-banner-border-info: #6366f1;
  --fp-banner-border-caution: #eab308;
  --fp-banner-border-warning: #ef4444;
  --fp-banner-border-success: #22c55e;
  /* The panel's own text, which on a near-black fill is the body colour rather
     than pure white. */
  --fp-banner-foreground: #f0f2f5;
  --fp-banner-accent-info: #a5b4fc;
  --fp-banner-accent-caution: #fcd34d;
  --fp-banner-accent-warning: #fca5a5;
  --fp-banner-accent-success: #bef264;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
    /*
      NO SCROLLBAR GUTTER, ANYWHERE, BY DEFAULT.

      A scrollbar is not decoration — it is LAYOUT. `scrollbar-width: thin`
      reserved 11px inside the padding box of every scroller in the app, which
      meant a board lane with 12px of padding showed 12px on the left and 1px
      on the right the moment its cards overflowed. The padding was never
      wrong; the gutter was eating half of it, and only on the side that
      happened to be scrolling.

      Browsers give three widths and no more — `auto` (15px), `thin` (11px)
      and `none` (0). There is no 1px scrollbar to ask for: the `::-webkit-`
      width is ignored outright once `scrollbar-width` is authored, and
      unauthored it reserves the platform default. So `none` is the only value
      that leaves a padded box symmetrical, and the clipped edge of the
      content is what says there is more of it.

      NO EXCEPTIONS. There was one — an opt-in class for the board's lane
      strip, on the argument that a lane ending flush at the viewport looks
      like the last lane. It was a bar in an app that had decided against bars,
      and the inconsistency was more confusing than the overflow ever was: one
      strip with a visible scrollbar teaches the reader that the absence of one
      elsewhere means "this does not scroll", which is false.
    */
    scrollbar-width: none;
  }
  *::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    margin: 0;
  }

}
```
