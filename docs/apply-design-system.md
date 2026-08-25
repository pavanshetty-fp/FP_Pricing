# Apply the FleetPanda Design System (FP-DS-2026) to a prototype

> **Auto-generated bundle** — do not hand-edit. Concatenation of the
> `docs/ds/` module set, produced by `docs/ds/build-bundle.sh`. Edit the
> modules and regenerate. Feed this whole file to your AI tool before it builds.


---

# FP-DS-2026 — constitution (non-negotiable)

The locked rules. Everything else elaborates these; don't violate them without an
explicit, deliberate decision. Full detail lives in the category `2-rules.md` files.

## What this system is
- A spinoff of **shadcn/ui (new-york)** on **Tailwind v4 + React**.
- **Two modes only: Light (`:root`) and FP (`.dark`, the default).** FP *is* the
  dark theme — there is no separate "dark." A toggle flips `.dark` on `<html>` and
  persists to `localStorage('fp-theme')`.
- Purpose: a library of **generic layout templates + behavioural rules** to
  constrain AI-prompted designs — **not a real app**. Build reusable, generically
  labelled templates; document rules; don't build domain features.

## The accuracy contract
1. **Tokens, never raw hex.** If a color isn't a token, add it to the token layer.
2. **Primary CTA is the neutral `bg-primary`** (near-white FP / near-black Light).
   `--brand` (`#fa6400`, orange) is a *special accent*, only when specified — **not**
   the default CTA.
3. **Icons: Lucide only** (`lucide-react`). Never Tabler / Hugeicons / Phosphor / Remix.
4. **Two modes**, FP default; toggle persists.
5. **Translate, don't trace.** Re-map a foreign/light mock to FP tokens; never copy a
   literal palette.
6. **Semantic variants.** A component's variant follows the *meaning of the data*.
7. **Compose, don't reinvent.** Reach for the existing component set; reconcile
   tokens rather than duplicating components.
8. **Scale discipline.** Radius ramp, type scale, named spacing — no one-off values.

## Locked structure
- **Shell:** tier-1 icon rail (Surface Base, flush) + contextual tier-2 drawer +
  one content layer (Surface-1b, rounded, `shadow-fp-surface`, **no outer border**).
- **Layout laws L1–L5** → `ux/2-rules`. **Hierarchy laws H1–H4** → `ux/2-rules`.
- **Color governance** → `ui/2-rules`: drive off tokens; `--brand` is the orange,
  not `--primary`; status by soft tint, not saturated fill.

See `map.md` for where each area is documented in full.


---

# Adopting FP-DS in a new prototype — setup

Three steps to make a new prototype adopt the FleetPanda look at high fidelity.

## Step 1 — stack
Tailwind CSS v4 (`@import "tailwindcss"`), React, `lucide-react`,
`class-variance-authority`, `clsx` + `tailwind-merge` (the `cn()` helper). Install
**shadcn/ui (new-york)** primitives as normal — the tokens restyle them into FP.
Optional deps only when needed: `recharts` (charts), `sonner` (toasts), `cmdk`
(command), `input-otp`.

## Step 2 — drop in the tokens
Replace your global stylesheet with the **verbatim token stylesheet** — the single
source of truth that defines both modes and every FP token. It lives in
[`ui/6-execute.md`](../ui/6-execute.md) (and in the repo as `src/index.css`). Copy
it as-is; shadcn's token utilities resolve against it automatically.

## Step 3 — wire the theme
- Load the **Geist** font (the CSS imports it).
- Default the app to FP: `<html class="dark">`.
- Add a pre-paint script so a saved `light` choice applies before first paint:
  ```html
  <script>
    try { if (localStorage.getItem('fp-theme') === 'light') document.documentElement.classList.remove('dark'); } catch {}
  </script>
  ```
- A theme toggle flips `document.documentElement.classList.toggle('dark')` and
  writes `localStorage.setItem('fp-theme', isDark ? 'dark' : 'light')`.

Then compose screens from the component set ([`ui/6-execute.md`](../ui/6-execute.md))
following the `ux/`, `ui/`, and `interactions/` rules. Run
[`conformance.md`](conformance.md) before finishing.


---

# UI · Fundamentals & principles

*The visual surface: tokens, color, type, surfaces — "how it looks."* The mental
model behind the UI rules ([`2-rules.md`](2-rules.md)).

## Two modes only
**Light (`:root`) and FP (`.dark`, the default).** FP *is* the dark theme — there is
no separate "dark." A toggle flips `.dark` on `<html>` and persists to
`localStorage('fp-theme')`. Token **names** match canonical shadcn so components
work verbatim; only the **values** are FleetPanda's. `@theme inline` maps
`--color-x: var(--x)` per theme (it does *not* emit `:root` custom properties — you
can't read tokens off `:root` via `getComputedStyle`).

## Everything is a token
`--brand #fa6400` is the orange (NOT `--primary`). Token families: base shadcn set,
plus FP-only deltas — `--rail`, `--drawer`, `--fp-surface-1a/1b`, `--fp-card-1`,
`--fp-lane`, `--fp-outline-1/2`, `--fp-surface-base`, `--status-*`, `--verified`,
`--fp-banner-*`, `--color-chart-1..5`, `--fp-lane-*`. Scales: radius `sm 6 · md 8 ·
lg 10 · xl 14` (anchored to `--radius`), heading styles `text-heading-sm..xl`
(24/36/48/60), named spacing. Font: **Geist** (400/500/600). Numbers `tabular-nums`.

## Surface & elevation stack
A stack of surfaces that step in lightness and lift with shadow.
- **Global top bar:** `bg-background` + a bottom `border-border` hairline — app
  chrome, full width above the rail + content.
- **Light:** background `#efefeb` → sidebar `#fafbf8` → content layer `#ffffff`. Rail
  is **flush**; drawer + content **float** with `shadow-fp-surface`.
- **FP:** background/rail `#080808` → sidebar `#11161d` → content `#1b2028`, cards
  `#11161d`, inner `#2a2f37`.
- The rail hover-expands to a 256px overlay that **stays `bg-rail`** (the colour does
  not change on expand). `--drawer` (#292929) and `--fp-lane` are **legacy** — no
  longer bound to the main nav / Kanban lanes.
- The content layer has **no outer border** — it lifts with shadow.

## Token quick reference (hex, both modes)
| Utility | Light | FP | Use |
|---|---|---|---|
| `bg-background` | `#efefeb` | `#080808` | app bg / Surface Base / global top bar |
| `text-foreground` | `#030405` | `#f0f2f5` | primary text |
| `bg-card` | `#ffffff` | `#11161d` | card (Surface 1a) |
| `bg-popover` | `#ffffff` | `#1b2028` | menus/popovers |
| `bg-primary` | `#090c0f` | `#f8fafc` | **neutral primary — the default CTA** |
| `bg-brand`/`text-brand` | `#fa6400` | `#fa6400` | brand orange — accent only |
| `text-muted-foreground` | `#596475` | `#9ca3af` | secondary/label |
| `bg-accent` | `#cad1db` | `#2a2f37` | hover fill |
| `bg-destructive` | `#dc2626` | `#f87171` | danger/delete |
| `border-border` | `#cdd4de` | `#363c45` | default hairline |
| `ring-ring` | `#727d8f` | `#9ca3af` | focus ring |
| `bg-rail` | `#efefeb` | `#080808` | tier-1 rail |
| `bg-sidebar` | `#fafbf8` | `#11161d` | tier-2 drawer + rail hover-overlay (base/sidebar) |
| `bg-drawer` | `#fafbf8` | `#292929` | legacy (FP/Drawer) — not currently bound |
| `bg-fp-surface-1a` | `#ffffff` | `#11161d` | card surface |
| `bg-fp-surface-1b` | `#ffffff` | `#1b2028` | **content layer** |
| `bg-fp-card-1` | `#e9ecf1` | `#2a2f37` | inner card / pressed tint |
| `bg-accent` (Kanban lane) | `#cad1db` | `#2a2f37` | Kanban lane track (lanes bind here now) |
| `bg-fp-lane` | `#f4f5f8` | `#2a2f37` | legacy — superseded by `bg-accent` for lanes |
| `border-fp-outline-1` | `#e2e5ea` | `#363c45` | subtle divider |
| `border-fp-outline-2` | `#cad1db` | `#575757` | stronger outline (available; table stroke now uses `border`) |
| `text-status-success` | `#16a34a` | `#22c55e` | success |
| `text-status-processing` | `#d97706` | `#f59e0b` | processing/caution |
| `text-status-failed` | `#dc2626` | `#f87171` | failed |
| `text-verified` | `#2563eb` | `#3b82f6` | verified blue |
| `shadow-fp-surface` | `0 4px 4px rgb(0 0 0 / .15)` | (same) | surface lift |

**Theme-independent palettes** (same in both modes): chart series `chart-1..5`
(`#fa6400`/`#3b82f6`/`#22c55e`/`#eab308`/`#8b5cf6`); Kanban lane accents
`bg-fp-lane-*`; banner fills `bg-fp-banner-*` + inline accents
`text-fp-banner-accent-*`.

The full verbatim stylesheet is in [`6-execute.md`](6-execute.md).


---

# UI · Rules & behaviour  *(canonical)*

The normative rules for the visual surface. **Single source** — Do's/Don'ts, Common
mistakes, and Checks derive from these.

## Token discipline
- **Use tokens, never raw hex.** `bg-background`, `text-foreground`, `bg-card`,
  `bg-brand`, `bg-fp-surface-1b`, etc. If a color you need isn't a token, **add it
  to the token layer** — don't hardcode.
- **Scale discipline.** Corners from the radius ramp (`sm 6 · md 8 · lg 10 · xl 14`;
  buttons/inputs → `md`, cards → `lg`), text from the type scale, spacing from the
  named steps. No one-off values.

## Color governance
- **`--brand` (`#fa6400`, orange) is the accent, not `--primary`.** Don't confuse
  the tokens.
- **The primary CTA is the neutral `bg-primary text-primary-foreground`** (near-white
  FP / near-black Light). `bg-brand` is a *special accent*, used only where a brand
  emphasis is specifically called for — never the default CTA. (Brand-as-CTA isn't a
  rule yet; revisit once enough patterns exist.) *(Emphasis-budget — one primary per
  view — is canonical in `ux/2-rules` H3.)*
- **Status is shown by soft tint**, not a saturated block: `bg-status-*/10
  text-status-*` (a highlighted "best" cell follows the same rule).
- **Semantic variants.** A component's variant follows the *meaning of the data*,
  never a hardcoded literal — e.g. `statusBadgeVariant(status)` maps Success→verified,
  Processing→secondary, Failed→destructive. Derive the variant from the value.
- **Add a status color** by joining the family: `--status-<name>` in `:root` *and*
  `.dark`, a `--color-status-<name>` mapping in `@theme inline`, a soft-tint badge
  variant, applied by data meaning.

## Icons
- **Lucide only** (`lucide-react`). Never Tabler / Hugeicons / Phosphor / Remix / emoji
  / one-off SVGs. When a glyph isn't in the Lucide bank, inline an SVG with
  `currentColor` — don't pull another set.

## Surfaces & elevation
- The **content layer** is `rounded-md bg-fp-surface-1b shadow-fp-surface` with **no
  outer border** — it lifts with shadow.
- Cards use `bg-card` (Surface 1a) + a `border-fp-outline-1` hairline to separate on
  the content layer.
- Inner cards step up to `bg-fp-card-1`; the Kanban lane track is `bg-accent` (the `--fp-lane` token is legacy).
- Apply `shadow-fp-surface` to floating chrome (drawer, content layer); the rail gets
  no shadow.
- **Elevation steps once per level** (`surface-1b → card → fp-card-1`) — *canonical in
  `ux/2-rules` H2, since it's a composition rule; the surface tokens live here.*

## Theming
- **Two modes**, FP default. Ship both Light (`:root`) and FP (`.dark`); the toggle
  flips `.dark` and persists to `fp-theme`. Translate a foreign/light mock to these
  tokens — never copy a literal palette (translate, don't trace).


---

# UI · Do's & don'ts

Quick pointers into [`2-rules.md`](2-rules.md). One line each.

## Do
- **Drive every color/radius/spacing from tokens.**
- **Use the neutral `bg-primary` for the primary CTA** (near-white FP / near-black Light).
- **Show status by soft tint** (`bg-status-*/10 text-status-*`).
- **Pick component variants by the data's meaning** (semantic).
- **Use Lucide icons only.**
- **Lift the content layer with `shadow-fp-surface`, no border.**
- **Land radii on the ramp** — buttons/inputs `md`, cards `lg`.

## Don't
- **Don't hardcode hex** (`bg-[#fa6400]`) — use `bg-brand`.
- **Don't use `bg-brand` as the default CTA** — it's a special accent.
- **Don't use a saturated status fill** where a soft tint belongs.
- **Don't put an outer border on the content layer.**
- **Don't use arbitrary radii** (`rounded-[5px]`).
- **Don't add Tabler/Hugeicons/Phosphor/Remix/emoji.**
- **Don't trace a light/foreign mock** — re-map to FP tokens.


---

# UI · Common mistakes (❌ / ✅)

Anti-patterns for the visual surface, each pointing back to [`2-rules.md`](2-rules.md).
(The in-app **Do's and Don'ts → Common Mistakes** page renders these as visual pairs.)

- **Brand color** — ❌ `bg-[#fa6400]` · ✅ `bg-brand`. Hardcoded hex breaks theming (Light/FP) and drifts from the palette.
- **Primary CTA** — ❌ `bg-brand` as the default primary button · ✅ `bg-primary text-primary-foreground`. `bg-brand` (orange) is a special accent, only when specified.
- **Status color** — ❌ a saturated `bg-status-success` block (incl. a highlighted "best" cell) · ✅ the soft tint `bg-status-success/10 text-status-success`.
- **Content layer** — ❌ an outer `border` · ✅ no border + `shadow-fp-surface` to lift it.
- **Radius** — ❌ `rounded-[5px]` · ✅ the scale: `rounded-md` (buttons/inputs), `rounded-lg` (cards).
- **Icons** — ❌ Tabler / Hugeicons / Phosphor / Remix / emoji · ✅ `lucide-react` only.
- **Light mock** — ❌ copy the white cards / a foreign palette · ✅ re-map every color to FP tokens (dark-primary). Translate, don't trace.


---

# UI · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Every color is a token (no raw hex / no foreign palette).
- [ ] The primary CTA is the neutral `bg-primary`; `bg-brand` appears only as a deliberate accent.
- [ ] Status shown by soft tint (`status-*/10`), not saturated fills.
- [ ] Component variants follow the data's meaning (semantic).
- [ ] All icons are Lucide.
- [ ] Both Light and FP render; FP is default; toggle persists to `fp-theme`.
- [ ] Surfaces layer correctly (background → sidebar → content; global top bar on `bg-background`) with `shadow-fp-surface` on floating chrome; content layer has no outer border.
- [ ] Radii / type / spacing come from the scale, not one-off values.
- [ ] Text contrast ≥ WCAG AA in both modes.

## Fill-vs-surface check (run before shipping any new fill)

A fill is only a fill if it differs from what is behind it. Several DS tokens are
**byte-identical to a surface token in at least one theme**, so a fill that looks
fine in Light can composite to a literal `[0,0,0]` in FP-dark:

| Token | Collides with | Where |
|---|---|---|
| `--muted` | `--fp-surface-1b`, `--popover` | FP-dark, both `#1b2028` |
| `--popover` | `--fp-surface-1b` | both themes (`#1b2028` / `#ffffff`) |
| `--accent` | `--fp-card-1` | FP-dark, both `#2a2f37` |

This family has now caused four separate defects. Before shipping a fill:

1. Identify the **actual** surface behind the element — not the one you assume.
   For an overlay, that is whatever it floats over (for the bulk bar, selected
   rows, not the content layer).
2. Read both computed values and confirm the RGB delta is non-zero. **Do not
   judge from a screenshot** — a `[0,0,0]` delta looks like a plausible flat
   panel.
3. Check **both** themes. Every defect in this family was invisible in exactly
   one of them.
4. When flipping themes to measure, **wait for `transition-colors` to settle**
   before reading, or you will capture mid-transition values.
5. If no fill can separate (the overlay case), the shadow must carry it — use
   `--shadow-fp-overlay`, and verify the separation rather than assuming it.


---

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
- **Status chip** — one component, three treatments, via `StatusChip` (`ui/status-chip.tsx`): `dot` (token-coloured dot, neutral label — the quietest, for dense grids), `text` (dot **and** label share the tone via `bg-current`, no fill), `soft` (`bg-status-*/10` + tone text — the canonical treatment for a state that must be noticed, same recipe as the `destructive` Badge variant). The dot is `aria-hidden` (it repeats the label) and colour is never the only carrier of meaning. **Tones are visual channels, not statuses** — per colour governance a status carries no colour until a usage rule binds it, so the DS ships `success | processing | failed | info | neutral` and each application declares its own mapping (the table's lives in `statusTone()` in `tables-layout/data.ts`, from which the filled-Badge variant is *derived* so the two treatments cannot drift). **Contrast caveat (measured):** `dot` is safe on any surface (14.6 dark / 20.5 light) because its label stays `foreground`; `text` and `soft` fall below WCAG AA on **light** surfaces for the success and processing tones (text 3.30 / 3.19; soft 2.96 / 2.86; soft-failed 4.13) because the light `--status-*` values are too light to carry text on `#ffffff`. This is pre-existing, not new — the `destructive` Badge variant already ships the same recipe at 4.13 in light. Prefer `dot` in Light until darker light-mode status values are decided in Figma; do not invent them.
- **Pastel code disc** — a 16px pastel circle carrying an initial, for dense rows where a full pill will not fit: `Badge shape="disc"` supplies the geometry, `CodeDisc` (`ui/code-disc.tsx`) is the wrapper that makes the accessible label non-optional (`label` feeds both the tooltip and `aria-label`, and the span is `tabIndex=0` so the tooltip is keyboard-reachable). Hues are generic (`--pastel-blue`, `--pastel-amber`) — applications bind meaning. *(KNOWN GAP: the pastels are not Figma-sourced; see `index.css`.)*
- **Bulk-attribute edit** — never a popover that commits on click. Three tiers by cardinality (scalar → single input; one-value-per-row → searchable select; a collection per row → multi-select), each opening a **dialog**, each taking the same two-step shape via `BulkEditDialog` (`components/bulk-edit/`): (1) picker, header leading with **scope + count**, primary gated until a value is picked; (2) per-row **before/after** preview, title becomes "View Summary", footer becomes `Go back` / `Confirm`; (3) commit → **toast**. Destructive replaces arm before they commit. **Why both steps earn their keep:** the operator must see the state that *already exists* on the target before piling onto it — `StandingItems` surfaces that standing state in step 1, `BeforeAfterTable` shows the delta in step 2. Collapsing to one step removes the only chance to notice you are about to replace something. `before` renders muted + `line-through` so a row reads as a replacement, with an em-dash fallback so "had nothing" and "had something" stay distinct. The dialog always reopens on step 1 — reopening mid-flow would offer a Confirm for a value the operator can no longer see. Body scrolls at `max-h-[55vh]`; header and footer stay put. **Inner panels use `bg-fp-surface-1b`, not `bg-fp-card-1`** — measured against the dialog's own `bg-background`, card-1 is only [6,3,6] away in light (near-invisible) while surface-1b is [16,16,20] light / [19,24,32] dark.
- **Faceted filter panel** — facet side-menu + options pane. **The search field is per-facet and opt-in** (`Facet.searchable`): a facet gets one when its option list *cannot be taken in at once*, and does not when the list is short enough to scan — on a two-option facet a search field can only ever filter to one of the two, and it pushes the options down for nothing. Use an **explicit flag, not a length threshold**: a threshold silently changes a facet's affordance as its options grow or shrink, so the same facet gains and loses a control without anyone deciding. When the field is absent the option list needs its own `pt-2`, or it starts flush against the panel edge; placeholder reads `Search {facet}…`, matching the DS's `Search…` convention. Switching facets clears the query — carrying it over lets a term typed on a searchable facet silently filter a facet with no field to clear it in.
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
  --border: #363c45; /* FP column → FP/Outline 1 (updated) */
  --input: #363c45; /* FP column → FP/Outline 1 (updated) */
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
  --drawer: #292929; /* FP/Drawer (updated) */
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
    /* Subtle, low-contrast scrollbars — thin line, transparent track (Firefox). */
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
    margin: 0;
  }
  /* WebKit/Blink: a thin, rounded thumb on a transparent track; firms up on hover. */
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track,
  *::-webkit-scrollbar-corner { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background-color: var(--border);
    border-radius: 9999px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  *::-webkit-scrollbar-thumb:hover { background-color: var(--fp-outline-2); }
}
```


---

# UX · Fundamentals & principles

*Structure, flow, information, spatial grouping — "where things go / how they're
organized."* The mental model behind the UX rules ([`2-rules.md`](2-rules.md)).

## The core idea
Great structure means the reader can tell **what belongs with what** and **what
matters most** *without reading*. Layout carries meaning before a single word does.

## Principles

- **Everything lives in one frame.** Every screen is the AppShell — a single
  global top bar (Tier-0) + rail + optional drawer + content layer — so structure
  is consistent across the app. No full-bleed pages, no page-owned top chrome. (→ L1)

- **Compact header, in a fixed order.** A screen's chrome reads top-down in a
  predictable sequence (global top bar → breadcrumb-as-title → tabs → toolbar), so
  users learn it once. The content header is compact — the breadcrumb is the title,
  no divider. (→ L2/L4)

- **Each unit answers a distinct question.** Breadcrumb = *where am I?* · Tabs =
  *which slice?* · Toolbar = *act on this?* Include a unit only when its question
  is real for the screen. (→ L5)

- **Compose in levels.** UI nests as Page → Region → Group → Compound-row → Atom.
  Each level has one job; nothing floats between levels. Declaring a thing's level
  fixes how it looks and sits. (→ H1)

- **Proximity is meaning.** Related units sit closer than unrelated ones; the gap
  *inside* a group must be smaller than the gap *between* groups, or grouping
  inverts. Separation (space > divider > box) is a ladder — pick the lightest that
  reads.

- **Emphasis is a budget** *(canonical home for this cross-cutting principle)*. One
  primary thing per view — one primary group, one primary action. Emphasis is
  spent, not sprinkled; when everything is emphasized, nothing is. (→ H3)

- **Density via slots.** A dense row is a fixed set of ordered slots. Extra data
  extends a slot; it never drops an unaligned element into the row. (→ H4)

- **Match chrome to complexity.** A three-row list doesn't need breadcrumb + seven
  tabs + a full toolbar. Structure scales down with the content.

See [`4-common-mistakes.md`](4-common-mistakes.md) for the grouping-failure catalog
these principles guard against.


---

# UX · Rules & behaviour  *(canonical)*

The normative rules for structure, flow, and grouping. **Single source** — the
Do's/Don'ts, Common mistakes, and Checks in this folder derive from these.

## Shell & spacing
- **Tier-0 global top bar:** a full-width app-chrome band across the very top,
  above the rail + content (`bg-background`, bottom `border-border`, ~48px). Carries
  the **brand logo** (left), **global search** (⌘K, centered), and **notifications
  + account menu** (right). Exactly one, app-level (see L1).
- **Tier-1 rail:** 52px icon rail (`bg-rail`), flush with the background, hover-
  expands to a 256px overlay that **stays `bg-rail`** (colour unchanged on expand).
  One item per top-level screen. **Navigation only** — the brand logo lives in the
  top bar; a **module switcher** sits at the top of the rail.
- **Tier-2 drawer (optional):** contextual sub-nav, a `rounded-lg bg-sidebar
  shadow-fp-surface` panel (256px).
- **Content layer:** fills the rest — `rounded-md bg-fp-surface-1b shadow-fp-surface`,
  **no outer border**. A compact header (L2), then a scrolling body.
- **Spacing laws:** **8px** gaps between rail ↔ drawer ↔ content + an **8px** outer
  margin (`p-2` + `gap-2`); **16px** inset inside the content-layer body.

## Layout laws

**L1 — Everything lives in the AppShell.** Every app screen is the global top bar
(Tier-0) + rail + optional drawer + one content layer. The **global top bar is
app-level chrome** — exactly one, full-width (brand · global search · account).
Beyond that one bar: no *page-owned* top chrome and no *per-screen* second
top-bar. (A lone standalone view may omit the shell but still uses the
surfaces/tokens.) *(Supersedes the archived L1 — see bottom.)*

**L2 — Compact content header (default).** The content-layer header is compact
(ClickUp-style): the **breadcrumb path doubles as the title** — no separate big
title line, and **no bottom divider**. The tab row and the search/filter/action
toolbar sit **~12px** directly beneath. Global chrome belongs to the Tier-0 bar
(L1) — never add a per-screen full-width top-bar. *(Supersedes the archived L2 —
see bottom.)*

**L3 — Toolbar: filters left, actions right.** Filters are a left-aligned group of
identically-styled controls; view switches and the **one** primary action are
right-aligned. A toolbar carries a single primary action.

**L4 — Zone order inside the content body.** `header → toolbar → summary/insight
band → data region` — always that order, consistent gap between zones, tighter
(16px) inset within each.

**L5 — Header units, include by relevance.** The three units are *optional*, each
answering a distinct question — include one only when that question is real:
- **Breadcrumb** (*where am I?*) — only when nested ≥2 levels; every crumb a
  navigable ancestor; last crumb static.
- **Tabs** (*which slice?*) — only when ≥2 mutually-exclusive facets of the *same*
  dataset exist (switching filters the view, not the destination). Different pages
  are **navigation**, not tabs. One facet → drop the tab row.
- **Toolbar** (*act on this?*) — only when the dataset needs search / filter /
  action.

  The title is always present; dropped units keep the fixed order. Never ship a
  placeholder unit (one-level breadcrumb, lone tab, dead-control toolbar).

## Molecule-hierarchy laws

**H1 — Five levels, one job each.** Page (shell) · Region (`bg-fp-surface-1b`) ·
Group (`bg-card`, radius lg) · Compound-row (a fixed set of ordered slots) · Atom
(token-driven control). A component declares its level; that fixes its surface
token, radius, and padding. Nothing floats between levels.

**H2 — Elevation steps once per level.** Nesting moves up exactly one surface
(`surface-1b → card → fp-card-1`). Never stack two fills of the same weight — a
same-fill-on-same-fill element flattens the hierarchy and vanishes. *(Surface
tokens: see `ui/2-rules`.)*

**H3 — Emphasis budget.** One primary action per view; status by **soft tint**, not
saturated fill; brand orange reserved for a deliberate accent. *(This is the
canonical home; the CTA-neutral facet is stated in `ui/2-rules`.)*

**H4 — Density via fixed slots.** A data-dense row is an ordered slot set (identity
· data grid · viz · action). Extra data extends a slot; it never adds an unaligned
element.

## Content-layer anatomy
- **Header band (compact, default):** the **breadcrumb path is the header** — it
  doubles as the title (no separate `text-2xl` title line) and there is **no bottom
  divider**; the tab row / toolbar sit ~12px beneath. Crumbs sit ~4px apart.
- **Breadcrumb source rule:** the trail reflects the real nav ancestry (rail screen
  → drawer sub-menu → current), not an invented path.
- **Stacking order inside the body:** action bar → tabs → accordions → content
  (a concrete instance of L4).
- **Responsive width** follows drawer presence (content reflows when the drawer is
  absent).

## Navigation — two tiers (+ global top bar)
Tier-0 **global top bar** = app chrome (brand · global search · account), spanning
full width above everything. Rail = tier-1 main nav (one item per screen); drawer =
tier-2 contextual sub-nav for the active screen. Content title = the breadcrumb path
(compact header). Tabs are **not** navigation (see L5).

## Archived rules *(superseded — kept for reference, not enforced)*
Superseded **2026-08-18**, when the Tier-0 global top bar and the compact content
header became canonical. Retained for context, not enforced.
- **L1 (archived):** *Every app screen is rail + optional drawer + one content
  layer. No full-bleed pages, no page-owned top chrome.* — superseded: the app now
  has exactly one canonical global top bar (Tier-0).
- **L2 (archived):** *One header stack, fixed order. The header carries title →
  breadcrumb; a tab row and the toolbar sit directly beneath. Collapse multiple
  source top-bars into this single stack — never a second full-width top-bar.* —
  superseded by the compact header (breadcrumb-as-title, no divider) + the Tier-0
  bar. (The "no per-screen duplicate top-bar" intent is retained in the new L1.)


---

# UX · Do's & don'ts

Quick pointers into [`2-rules.md`](2-rules.md). One line each.

## Do
- **Put every screen in the AppShell** with one header stack. (L1/L2)
- **Include a header unit only when its question is real** — breadcrumb when nested, tabs for real facets, toolbar when the data needs it. (L5)
- **Keep the fixed zone order** — header → toolbar → summary → data — even when a unit is dropped. (L4)
- **Filters left, one primary action right** in the toolbar. (L3)
- **Compose in levels** (Page → Region → Group → Compound-row → Atom); step elevation once. (H1/H2)
- **Build dense rows as fixed ordered slots.** (H4)

## Don't
- **Don't ship a *page-owned* top-bar** that duplicates the global (Tier-0) chrome — the one global top bar (brand · search · account) is canonical; the content header is compact (breadcrumb-as-title, no divider). (L1/L2)
- **Don't use tabs to navigate** between different pages/objects — that's the rail's job. (L5)
- **Don't render a lone tab, a one-level breadcrumb, or a dead-control toolbar** — no placeholder units. (L5)
- **Don't reorder the header stack.** (L2/L4)
- **Don't emphasize more than one group/action.** (H3)
- **Don't cram unaligned elements into a row.** (H4)


---

# UX · Common mistakes (❌ / ✅)

Anti-patterns for structure & grouping, each pointing back to a rule in
[`2-rules.md`](2-rules.md). (The in-app **Do's and Don'ts → Common Mistakes** page
renders these as visual pairs.)

## Shell & header
- **Page frame (L1/L2)** — ❌ a *page-owned* top-bar duplicating the global chrome · ✅ the AppShell: one Tier-0 global top bar (brand · search · account) + a compact content header (breadcrumb-as-title, no divider) → tabs → toolbar.
- **Header stack (L5)** — ❌ breadcrumb + tabs + a heavy toolbar on a three-row list · ✅ each unit earns its place; a simple screen is just title + a minimal toolbar.
- **Breadcrumb (L5)** — ❌ a one-item crumb on a top-level screen, or crumbs that don't navigate · ✅ show only ≥2 levels deep, every crumb navigable, last crumb static.
- **Tabs (L5)** — ❌ tabs used to jump between different pages, or a lone single tab · ✅ tabs = facets of one dataset; one facet → no tab row.
- **Toolbar (L5)** — ❌ search + filters + group-by on a trivial list, or two filled CTAs · ✅ only supported controls, filters left, one neutral primary right.

## Hierarchy
- **Elevation (H2)** — ❌ same-weight fill nested on the same fill · ✅ step up one surface (`surface-1b → card → fp-card-1`).
- **Emphasis budget (H3)** — ❌ several groups/CTAs all emphasized · ✅ one primary per view; the rest quiet.
- **Dense row (H4)** — ❌ unaligned elements crammed into a row · ✅ a fixed set of ordered slots (identity · data grid · viz · action).

## Grouping *(reserved — pending)*
The 12-theme **grouping-failure catalog** (proximity/spacing, containment,
separation method, hierarchy, semantic grouping, action grouping, toolbar
composition, row/cell, labels, state, responsive, cross-zone) is being pruned. Once
finalized, its surviving scenarios land here as ❌/✅ pairs with their derived rules
in [`2-rules.md`](2-rules.md).


---

# UX · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Screen is in the AppShell: one global top bar (Tier-0) + a compact content header (breadcrumb-as-title, no divider); no page-owned/duplicate top-bar. (L1/L2)
- [ ] Content zones in order: header → toolbar → summary → data. (L4)
- [ ] Header units earn their place — breadcrumb only if nested, tabs only for real facets, toolbar only if the data needs it; no placeholder units. (L5)
- [ ] Tabs are facets of one dataset, not navigation between pages. (L5)
- [ ] Composition nests in levels; elevation steps once per level. (H1/H2)
- [ ] One primary group / one primary action per view. (H3)
- [ ] Dense rows are fixed ordered slots, not crammed elements. (H4)
- [ ] Related units grouped by proximity; intra-group gap < inter-group gap.


---

# UX · Execute

How to build the structure the UX rules describe. Code idioms for the shell + zones.

## AppShell skeleton
```tsx
// 8px gaps + 8px outer margin (spacing law). Rail flush, drawer + content float.
<div className="flex h-screen gap-2 p-2 bg-background">
  <nav className="w-13 shrink-0 bg-rail" />                        {/* 52px rail */}
  <aside className="w-64 shrink-0 rounded-lg bg-sidebar shadow-fp-surface" /> {/* drawer */}
  <main className="flex-1 min-w-0 rounded-md bg-fp-surface-1b shadow-fp-surface
                   overflow-hidden flex flex-col">                 {/* content layer — no border */}
    {/* header stack + zones */}
  </main>
</div>
```
The repo's implementation is `src/components/app-shell/` + `navigation-drawer/`;
the nav registry is `App.tsx` (`SCREENS` + `ORDER`).

## Header stack (L2) — compact, fixed order
The Tier-0 global top bar (brand · global search · account) sits above the whole
shell. The **content-layer header is compact**: the breadcrumb IS the title (no
`text-2xl` title line, no bottom divider); tabs/toolbar pull up ~12px beneath.
```tsx
<div className="px-4 py-1">                       {/* compact header — no divider */}
  <Breadcrumb />                                  {/* the breadcrumb doubles as the title */}
</div>
{facets && <Tabs className="-mt-3.5" />}          {/* pulled up ~12px; only for real facets */}
{/* then the toolbar zone below */}
```

## Toolbar (L3) — filters left, one primary right
```tsx
<div className="flex items-center gap-2 p-4">
  <div className="flex items-center gap-2">{/* search · filters · group-by */}</div>
  <div className="flex-1" />
  {/* view switches */} <Button>Publish</Button>   {/* neutral bg-primary, single primary */}
</div>
```

## Zone order (L4)
Stack, in order, with a consistent gap between and 16px inset within:
`header → toolbar → summary/insight band → data region`.

## Five levels (H1) — pick the level, its container follows
| Level | Container |
|---|---|
| Region | `bg-fp-surface-1b` (the content layer) |
| Group | `bg-card` + `border-fp-outline-1`, radius `lg` |
| Compound-row | a fixed grid of ordered slots |
| Atom | a token-driven control |

Step elevation once (H2): `surface-1b → card → fp-card-1`. Never nest same-weight fills.

## Compound row (H4) — fixed slots
```tsx
// each row uses the SAME column template so slots align down the table
<div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
  {/* identity · data grid · viz · action */}
</div>
```

Reference implementations: `tables-layout/`, `form-layout/`, `kanban-board/`,
`dashboard/`.


---

# Interactions · Fundamentals & principles

*Behaviour, state, feedback, motion, accessibility — "how it behaves."* The mental
model behind the interaction rules ([`2-rules.md`](2-rules.md)).

## Principles

- **Feedback for every action.** Every action has a visible response — loading,
  empty, success, and error states all exist. Nothing happens silently.

- **Guard the irreversible.** Destructive actions are reversible or confirmed
  before they fire (the 52px inline confirm, or an `AlertDialog`).

- **State is designed, not incidental.** A component is designed for all its states
  — resting, hover, focus, active, disabled, loading, empty. The loading skeleton
  holds the loaded shape so layout doesn't jump.

- **Interaction is always visible.** What's interactive looks interactive; focus is
  always shown (a visible ring); hover is a subtle, consistent cue.

- **Accessible by default.** Keyboard-operable, visible focus, `aria-label` on
  icon-only controls, contrast ≥ AA, motion that respects `prefers-reduced-motion`.
  Accessibility isn't a pass at the end — it's the resting behaviour.

- **Motion is functional, not decorative.** Movement clarifies a change (a bar
  docking, a panel entering); it's brief and purposeful. Static template charts
  render without a mount animation.

See [`4-common-mistakes.md`](4-common-mistakes.md) for the failures these guard against.


---

# Interactions · Rules & behaviour  *(canonical)*

The normative rules for behaviour, state, feedback, and accessibility. **Single
source** — Do's/Don'ts, Common mistakes, and Checks derive from these.

## Feedback & state
- **Feedback for every action** — loading, empty, success, error states exist. Use
  `sonner` toasts for confirmations, inline `field` errors for validation.
- **State completeness** — design resting / hover / focus / active / disabled /
  loading / empty. A loading skeleton preserves the loaded group's shape.

## Destructive actions
- **Reversible or guarded** — use the 52px stacked confirm (in a table action cell)
  or an `AlertDialog`. Never fire a destructive action on a single unguarded click.

## Focus
- **Every interactive element shows a visible ring:** `focus-visible:ring-2
  focus-visible:ring-ring/50` (add `ring-inset` inside table cells).

## Hover
- **Subtle:** `hover:bg-accent`. For table cells, hover paints the **full cell**
  (`bg-accent` across the whole `td`, no inset outline).

## Accessibility
- **Keyboard-operable** — every control reachable and operable by keyboard.
- **`aria-label` on icon-only buttons.**
- **Contrast ≥ WCAG AA** in both Light and FP.
- **Respect `prefers-reduced-motion`** — gate non-essential motion.

## Charts (Recharts)
- **`var(--token)` does NOT resolve in SVG presentation attributes** — resolve
  tokens to hex at runtime (`getComputedStyle` on an in-tree element, re-read on
  theme change via a `MutationObserver` on `documentElement.class`), or use the
  theme-independent `chart-1..5` hexes.
- **Disable the mount animation** (`isAnimationActive={false}`) — Recharts' reveal
  is rAF-driven and stalls headless; static template charts should render fully.
- Convention: `--brand`/`chart-1` primary series, `--fp-outline-1` gridlines,
  `--muted-foreground` axis ticks.

Build recipes for all of the above: [`6-execute.md`](6-execute.md).


---

# Interactions · Do's & don'ts

Quick pointers into [`2-rules.md`](2-rules.md). One line each.

## Do
- **Give every action visible feedback** (toast / inline error / state change).
- **Guard destructive actions** (52px confirm or `AlertDialog`).
- **Show a visible focus ring** on every interactive element.
- **Keep hover subtle** — `bg-accent`, full-cell for table cells.
- **Give icon-only buttons an `aria-label`.**
- **Design every state** — resting / hover / focus / active / disabled / loading / empty.
- **Disable chart mount animation** and resolve tokens to hex for Recharts.

## Don't
- **Don't fire a destructive action on one unguarded click.**
- **Don't ship a control with no visible focus state.**
- **Don't leave an action silent** (no loading / success / error).
- **Don't pass `var(--token)` to a Recharts `stroke`/`fill`** — it won't resolve.
- **Don't let a loading skeleton change the loaded shape** (layout jump).
- **Don't animate non-essential motion** without honoring `prefers-reduced-motion`.


---

# Interactions · Common mistakes (❌ / ✅)

Anti-patterns for behaviour & state, each pointing back to [`2-rules.md`](2-rules.md).

- **Focus** — ❌ a control with no visible focus state · ✅ `focus-visible:ring-2 focus-visible:ring-ring/50` (`ring-inset` in cells).
- **Destructive** — ❌ delete fires on a single unguarded click · ✅ the 52px confirm or an `AlertDialog`.
- **Silent action** — ❌ an action with no loading/success/error feedback · ✅ a `sonner` toast or inline `field` error.
- **Recharts color** — ❌ `stroke="var(--brand)"` (renders invisible — `var()` doesn't resolve in SVG attributes) · ✅ resolve to hex at runtime, or use the `chart-1..5` hexes.
- **Chart mount** — ❌ default animation (stalls headless, shows a sliver) · ✅ `isAnimationActive={false}`.
- **Skeleton** — ❌ a loading shape that differs from the loaded shape (layout jumps) · ✅ a skeleton that holds the loaded group's shape.
- **Icon buttons** — ❌ an icon-only button with no label · ✅ `aria-label`.


---

# Interactions · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Feedback for every action (loading / empty / success / error).
- [ ] Destructive actions guarded (52px confirm or `AlertDialog`).
- [ ] Visible focus rings on every interactive element.
- [ ] Keyboard-operable throughout.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Text contrast ≥ WCAG AA in both modes.
- [ ] Reduced motion respected; charts render without mount animation.
- [ ] Loading skeletons hold the loaded shape (no layout jump).


---

# Interactions · Execute

Build recipes for the interaction rules.

## Focus & hover
```tsx
// visible focus ring on any interactive element (ring-inset inside table cells)
className="outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
// subtle hover; table cells paint the full cell
className="hover:bg-accent"
```

## Guarded destructive — the 52px stacked confirm
In a table action cell, a trash click swaps the cell for a 52×52 vertical split:
✕ cancel (top, `bg-fp-card-1`) over ✓ confirm (bottom, `bg-destructive text-white`),
clipped `rounded-md`. For page-level destructive actions use `AlertDialog` instead.

## Feedback
- Confirmations → `sonner` toasts. (Sonner's clone reads theme via `next-themes`;
  instead observe the `.dark` class the `ThemeToggle` flips — no `next-themes`.)
- Validation → inline `field` errors (`data-invalid` state on the field).
- Provide loading / empty states (`skeleton`, `empty`) that hold the loaded shape.

## Charts (Recharts)
```tsx
// var(--token) does NOT resolve in SVG attributes — resolve to hex at runtime,
// theme-aware, re-reading on theme change; disable the mount animation.
const el = useRef<HTMLDivElement>(null);
const [colors, setColors] = useState<string[]>([]);
useEffect(() => {
  const read = () => setColors(
    ["--color-chart-1","--color-chart-2","--color-chart-3","--color-chart-4","--color-chart-5"]
      .map(v => getComputedStyle(el.current!).getPropertyValue(v).trim())
  );
  read();
  const mo = new MutationObserver(read);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}, []);
// <Area ... isAnimationActive={false} stroke={colors[0]} />
```
Convention: `chart-1`/`--brand` primary series, `--fp-outline-1` gridlines,
`--muted-foreground` axis ticks. Reference: `dashboard/`.

## Editable-cell hover behaviour
The trigger fills the whole cell (`td` gets `p-0`, control `h-full w-full`);
hover/open paint `bg-accent` across the entire cell, no inset outline. (Visual spec:
`ui/6-execute`.) Reference: `tables-layout/`, `form-layout/`.

## Headless-preview gotchas (when verifying)
- Radix triggers need `pointerdown → pointerup → click` (synthetic `.click()` won't open them).
- `requestAnimationFrame` is paused in the backgrounded tab — prefer a CSS keyframe whose default state is the resting position.
- Controlled inputs: set value via the native setter, then dispatch `input`.
- Reads right after a click see pre-render state; re-read after React flushes.

(Full verify loop: [`../00-meta/workflow.md`](../00-meta/workflow.md).)


---

# Conformance checklist — the ship-gate

Self-check before shipping. This rolls up each category's `5-checks.md`; see those
for the rule each check derives from. (This is also the rubric the
`fp-ds-heuristics-eval` skill scores against.)

## UI
- [ ] Every color is a token (no raw hex / no foreign palette).
- [ ] The primary CTA is the neutral `bg-primary`; `bg-brand` (orange) appears only as a deliberate accent, never as the default CTA.
- [ ] All icons are Lucide.
- [ ] Both Light and FP render; FP is default; toggle persists to `fp-theme`.
- [ ] Surfaces layer correctly (background → drawer → content) with `shadow-fp-surface` on floating chrome; content layer has no outer border.
- [ ] Status shown by soft tint (`status-*/10`), not saturated fills.
- [ ] Component variants follow data meaning (semantic).
- [ ] Radii / type / spacing come from the scale, not one-off values.
- [ ] Text contrast ≥ WCAG AA in both modes.

## UX
- [ ] Elevation steps once per level; no same-weight fill nested on itself.
- [ ] Screen is in the AppShell with one header stack; content zones in order (header → toolbar → summary → data).
- [ ] Header units earn their place: breadcrumb only if nested, tabs only for real facets, toolbar only if the data needs it — no placeholder units.
- [ ] Dense rows are fixed ordered slots, not crammed elements.
- [ ] One primary group / one primary action per view.

## Interactions
- [ ] Feedback for every action (loading / empty / success / error).
- [ ] Destructive actions guarded (52px confirm or `AlertDialog`).
- [ ] Visible focus rings; keyboard-operable; icon-only buttons have `aria-label`.
- [ ] Reduced motion respected; charts render without mount animation.


---

# Prompt preamble

Copy-paste this to your AI coding tool before it builds. Hand it alongside the
token stylesheet from [`ui/6-execute.md`](../ui/6-execute.md) (or the generated
`apply-design-system.md` bundle).

> Build using the FleetPanda Design System (FP-DS-2026). Use Tailwind v4 +
> shadcn/ui (new-york) + Lucide icons. Paste the provided `globals.css` as the
> global stylesheet and drive **all** color/radius/spacing from its tokens — never
> hardcode hex. Default to the FP (dark) theme with a Light toggle on `.dark`.
> Compose screens from the listed components and follow the surface/elevation,
> layout, and interaction rules. The primary CTA is the neutral `bg-primary`, not
> the brand orange. Put every screen in the AppShell with one header stack, and
> include header units (breadcrumb / tabs / toolbar) only when relevant. My
> prototype's screens and flows differ from the reference — adapt my content into
> this system; do not restyle away from it. Run the conformance checklist before
> finishing.

