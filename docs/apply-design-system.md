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

*Folded in from `02-rules/interaction-and-behavior.md` — see the provenance note in `interactions/2-rules.md`.*

## 9. Visual restraint (color governance)

Promoted from the smoke-test feedback. The DS provides colored chips, badges,
ribbons and accents, but **color usage is governed, not free**.

- **Neutrals by default, everywhere.** Until a Layer 2 usage rule binds a
  color to a semantic role, every chip, badge, status, tag, and indicator
  renders neutral (surface = `--color-muted` / `--color-secondary`,
  foreground = `--color-foreground` or `--color-muted-foreground`).
- **Brand orange (`--color-brand` = #FA6400) is reserved for**: primary CTA
  fill, active-tab indicator, brand mark, and intentional brand-led moments
  (e.g. the FP logo tile). Not used for hover surfaces, selected-row tints,
  inline links, or generic interactive states.
- **Destructive color (`--color-destructive`) appears only on a destructive
  action's label text or icon glyph** — never as a button fill, never as a
  row tint. The Edit/Share/**Delete** row-action menu is the canonical
  example: only "Delete"'s label is red.
  - **Carve-out — the final confirm in a guarded destructive flow.** Where a
    destructive action has already been guarded (a second, armed press, or an
    `AlertDialog`), that last control MAY take the destructive fill: at that
    point the fill is the warning, and the user has passed a deliberate step to
    reach it. This is the only fill exception; menu rows and row actions keep
    label-only. *(Amended when this rule was folded into the repo — the shipped
    `BulkEditDialog` armed confirm relies on it.)*
- **Status semantics** (Success/Warning/Error etc.) exist as variants in the
  DS components, but render **neutral** in generated output until a usage
  rule defines which records get which color and why. This applies to:
  order statuses (Unassigned · Active · Blocked · Cancelled · etc.), tag
  chips (Gold/Silver/Platinum Customer, High/Less Priority, etc.), pricing
  flags (P/M), and severity banners (per §3 diagnostic disclosure — those
  WERE earned: warning/error/info already have a usage rule).
- **References do not inform color usage.** The reference screens are
  saturated with category-coded colors that have not been governed. Mining
  references for *structure* and *behavior* is encouraged; copying their
  color choices is not.
- When in doubt: **render neutral, flag a usage-rule gap.** Do not invent.


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
fine in one theme can composite to a literal `[0,0,0]` in the other — it runs in
both directions, and since the 2026-08-27 light sync the largest such family is
in Light, not FP-dark:

| Token | Collides with | Where |
|---|---|---|
| `--muted` | `--fp-surface-1b`, `--popover` | FP-dark, both `#1b2028` |
| `--popover` | `--fp-surface-1b` | both themes (`#1b2028` / `#ffffff`) |
| `--accent` | `--fp-card-1` | FP-dark, both `#2a2f37` |
| `--background` | `--card`, `--popover`, `--fp-surface-1a`, `--fp-surface-1b` | Light, all `#ffffff` — added by the 2026-08-27 Figma sync |
| ~~`--fp-outline-2`~~ | ~~`--accent`~~ | Light — **resolved** 2026-08-27, `--accent` moved to `#e5e7eb` |

This family has now caught nine token pairs, eight of them live: the same sync
that resolved `--fp-outline-2`/`--accent` opened four new ones by moving
`--background` onto white. Note that the colliding pair differs BY THEME —
`--accent`/`--fp-card-1` collide only in dark, the `--background` white family
only in light — so a single token chosen for one theme can silently fail in the
other. In light this now means a card separates from the app ground by border and
shadow alone; if you need the old tinted ground, name `--fp-surface-base`. Before shipping a fill:

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
6. **Do not borrow a control-emphasis token for a background wash.** `--accent`
   is sized to fill a button or a menu row; behind a full table row it reads as
   a block of colour. Measured, light rows on `--accent` sat `[53,46,36]` off
   `#ffffff` when selected. A wash needs its own token — see `--fp-row-hover`
   / `--fp-row-selected`. The tell is scale: the larger the painted area, the
   quieter the value has to be for the same perceived weight.


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
- **Status chip** — one component, three treatments, via `StatusChip` (`ui/status-chip.tsx`): `dot` (token-coloured dot, neutral label — the quietest, for dense grids), `text` (dot **and** label share the tone via `bg-current`, no fill), `soft` (`bg-status-*/10` + tone text — the canonical treatment for a state that must be noticed, same recipe as the `destructive` Badge variant). The dot is `aria-hidden` (it repeats the label) and colour is never the only carrier of meaning. **Tones are visual channels, not statuses** — per colour governance a status carries no colour until a usage rule binds it, so the DS ships `success | processing | failed | info | neutral` and each application declares its own mapping (the table's lives in `statusTone()` in `tables-layout/data.ts`, from which the filled-Badge variant is *derived* so the two treatments cannot drift). **Contrast caveat (measured):** `dot` is safe on any surface (14.6 dark / 20.5 light) because its label stays `foreground`; `text` and `soft` fall below WCAG AA on **light** surfaces for the success and processing tones (text 3.30 / 3.19; soft 2.96 / 2.86; soft-failed 4.13) because the light `--status-*` values are too light to carry text on `#ffffff`. This is pre-existing, not new — the `destructive` Badge variant already ships the same recipe at 4.13 in light. The light `--status-success` / `--status-processing` values have since moved one step down their own ramp (green-600 -> green-700, amber-600 -> amber-700), which fixes `text` in light (3.30/3.19 -> 5.02/5.02). `soft` still lands at ~4.4 on light because a 10% tint of the label's own hue lifts the background faster than it darkens the text — large-text only until the tint stops being a straight alpha and becomes its own measured pair. Prefer `dot` or `text` on light surfaces. See `00-meta/token-provenance.md`.
- **Pastel code disc** — a 16px pastel circle carrying an initial, for dense rows where a full pill will not fit: `Badge shape="disc"` supplies the geometry, `CodeDisc` (`ui/code-disc.tsx`) is the wrapper that makes the accessible label non-optional (`label` feeds both the tooltip and `aria-label`, and the span is `tabIndex=0` so the tooltip is keyboard-reachable). Hues are generic (`--pastel-blue`, `--pastel-amber`) — applications bind meaning. *(Both pastel pairs were chosen in the repo and measure AAA; extending the set is a one-line change per pair — measure the pair before adding it. See `00-meta/token-provenance.md`.)*
- **Bulk-attribute edit** — never a popover that commits on click. Three tiers by cardinality (scalar → single input; one-value-per-row → searchable select; a collection per row → multi-select), each opening a **dialog**, each taking the same two-step shape via `BulkEditDialog` (`components/bulk-edit/`): (1) picker, header leading with **scope + count**, primary gated until a value is picked; (2) per-row **before/after** preview, title becomes "View Summary", footer becomes `Go back` / `Confirm`; (3) commit → **toast**. Destructive replaces arm before they commit. **Why both steps earn their keep:** the operator must see the state that *already exists* on the target before piling onto it — `StandingItems` surfaces that standing state in step 1, `BeforeAfterTable` shows the delta in step 2. Collapsing to one step removes the only chance to notice you are about to replace something. `before` renders muted + `line-through` so a row reads as a replacement, with an em-dash fallback so "had nothing" and "had something" stay distinct. The dialog always reopens on step 1 — reopening mid-flow would offer a Confirm for a value the operator can no longer see. Body scrolls at `max-h-[55vh]`; header and footer stay put. **Inner panels use `bg-fp-surface-1b`, not `bg-fp-card-1`** — measured against the dialog's own `bg-background`, card-1 is only [6,3,6] away in light (near-invisible) while surface-1b is [16,16,20] light / [19,24,32] dark.
- **Faceted filter panel** — facet side-menu + options pane. **The search field is per-facet and opt-in** (`Facet.searchable`): a facet gets one when its option list *cannot be taken in at once*, and does not when the list is short enough to scan — on a two-option facet a search field can only ever filter to one of the two, and it pushes the options down for nothing. Use an **explicit flag, not a length threshold**: a threshold silently changes a facet's affordance as its options grow or shrink, so the same facet gains and loses a control without anyone deciding. When the field is absent the option list needs its own `pt-2`, or it starts flush against the panel edge; placeholder reads `Search {facet}…`, matching the DS's `Search…` convention. Switching facets clears the query — carrying it over lets a term typed on a searchable facet silently filter a facet with no field to clear it in.
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
- **Tier-2 drawer (optional):** contextual sub-nav for the active rail item, a
  `rounded-lg bg-sidebar shadow-fp-surface` panel (256px). It is where **section
  headings** and **collapsible sub-categories** live — `NavigationDrawer`
  renders a group's `label` as a heading and an item's `children` as a
  dropdown. Present it only when the active rail item genuinely has a second
  level; where it does not, omit it and let the content layer take the width.
- **Content layer:** fills the rest — `rounded-md bg-fp-surface-1b shadow-fp-surface`,
  **no outer border**. A compact header (L2), then a scrolling body.
- **Spacing laws:** **8px** gaps between rail ↔ drawer ↔ content + an **8px** outer
  margin (`p-2` + `gap-2`); **16px** inset inside the content-layer body.

## Side-sheet anatomy
- **Two widths, both capped.** `narrow` is the DS's 560px sheet — right for a form
  of stacked fields. `wide` is **864px**, for a sheet carrying TABLES: at 560 their
  columns have to be scrolled to be read. Both clamp to `100vw − 60px`, because
  60px-from-the-edge is the **most** a sheet may take, not the width it should be —
  a sheet that eats a wide monitor turns two-column pairs into a hunt across the
  screen and leaves nothing of the list it came from. `xwide` is **1120px**, for
  a step whose tables run past six columns.
- **Width is per STEP, not per sheet.** A sheet is only as wide as what is
  currently in it: a form of stacked fields must not inherit the width its
  pricing tables needed. `BulkEditDialog` already does this — `default` while
  you pick, `lg` for the summary — and a two-step sheet does the same. The
  symptom of getting it wrong is a heading that wraps onto a second line and
  stops sitting over the column it names, which reads as though the headers
  have slipped; a heading too long for its column is a column that is too
  narrow, so `TableRequiredLabel` never wraps and the fix belongs in the
  colgroup.
- **Section rhythm — 40 / 16.** Sections sit **40px** apart (the sheet body's own
  gap); a section's title sits **16px** from its content (`SheetSection`'s default).
  The outer gap being 2.5x the inner is what makes a heading read as belonging to
  the block beneath it. Measured alternatives: at **20** the title sits almost
  equidistant from the group above and below and stops binding to either; at **12**
  and **8** it welds to the first field and the whole section boundary rests on the
  40, leaving no room to tighten the outer gap later. Sections take the default —
  a per-instance gap is how a sheet drifts from the system.
  **The 16 is measured from the TITLE'S OWN LINE, not from a padded row around
  it** — which is why `SheetSection`'s heading row has no height of its own. It
  once had `min-h-7` (28px) around a 20px line, and `items-center` split the
  spare 8px evenly, so what anyone could see between the words and the content
  was **20px** — **22px** in a section whose heading also carried a 32px action.
  The rule said 16 and the screen said 20: the row was padding itself and calling
  it rhythm. An ACTION taller than the title hangs off the line instead of
  pushing the content down — its wrapper is fixed at the title's 20px and
  centres a taller child, which overflows the box without growing it. That holds
  for any control put there, so the 16 cannot drift again the next time a
  section gains an action. **Measure from the text, and measure it on screen.**
- **Helper text is 4px from its control**, not at the field gap — see
  `interactions/2-rules` §2b.
- **Removing an optional section is a MINUS, never a bin** (`SheetSectionRemove`).
  A bin says a record is about to be destroyed; turning an optional section off
  destroys nothing — it collapses back to the "Add …" box it came from and is one
  click to restore. The two glyphs look alike at 16px and mean opposite things
  about whether the click can be taken back, so the bin stays where a row really
  does go: the delete at the end of a table ROW. The control is muted until
  reached for, coming to full contrast and sliding its label out on hover or
  focus — a bare glyph beside a table of rows reads as though it might remove a
  row, and the label is what makes it safe.
- **Confirm only when there is something to lose.** `SheetSectionRemove` takes
  `hasContent`: with rows filled in, the click opens an AlertDialog — *"Remove
  peripherals? Everything added here will be erased. This cannot be undone."* —
  and on an untouched section it simply closes it. A dialog over an empty table
  teaches people to dismiss dialogs without reading them, which is the habit that
  makes the one that matters useless. The CALLER answers `hasContent`, because
  only it knows what "filled in" means for its own rows: a starter row of blanks
  is not content, and neither is a prefilled default (the Load Order's product,
  the custom item's unit) that nobody chose.
- **Footer flags.** A decision about the RECORD (recurring, and the cadence it
  reveals) stays in the section it changes. A decision about the ACT of submitting
  (urgent, get a signature) rides in the sticky footer, in view at the moment of
  committing however far the body has scrolled.
- **Derived values are READ-OUTS, not disabled fields.** Facts that arrive with a
  choice made above them — a ship-to's coordinates, a contact's phone and email —
  render as a bordered card beside or beneath their source, never as an input.
  A disabled input still looks like a field promising an edit, and its dimming
  makes the value the hardest text in the section to read. Give each value its own
  copy button where it is something people carry elsewhere (a number to a dialler,
  an address to a mail client) — one control over a pair hands over both.

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

## Action placement — amends the "CTA outside the data container" decision

The primary CTA and the export control sit at the **right end of the preset-view
row**, which is *inside* the data container. That contradicts the earlier locked
decision putting "title + primary CTA outside the data container", and the two
should not both stand.

**Resolution: the CTA is placed relative to the data it acts on, not relative to
the container boundary.** A "Create" that adds a row to *this* list belongs with
that list's own controls; hoisting it to the page header separates it from the
scope (preset view, line of service, date) that determines what it will create.
The container boundary was a proxy for "give the action prominence", and the
preset row gives it that without the separation.

The earlier decision still holds for **page-level** actions — ones that are not
scoped by anything inside the container.

Row composition, left to right:
`Default · <saved views> · + View … [scope] [primary CTA] [export]`

Three details in that row are load-bearing rather than decorative:

- **4px inset correction.** The row cancels the content layer's 16px inset with
  `-mx-4` and re-pads at `px-3` (12px) so its hairline spans the full panel.
  Without an extra `mr-1` on the **rightmost** item, that item sits 4px proud of
  every toolbar control below it. Measured with it: both right edges land on the
  same x. **If you reorder the trailing items, the `mr-1` moves to whichever is
  last.**
- **Sizes.** CTA `xs` (24px), export `icon-xs` (24px). That row carries text
  tabs, not controls; a 32px `sm` button sits heavy on it.
- **`self-end mb-2.5`.** The row is `items-center`, so the actions opt out of
  centring and measure from the bottom: 10px margin + the row's own 2px bottom
  padding puts them exactly 12px above the hairline.

### Every table's columns move and resize. This is the default, not a feature.

**Render `TableColumnHeader` instead of `<TableHead>`, and call
`useTableColumns` once.** That is the whole of it — the header carries the drag
props, the keyboard, the drop indicator, both hover marks, and the guard that
stops a resize press starting a column drag. The DS's own `DataTable` uses it,
so a table copied from the gallery has the behaviour before anyone thinks about
it.

```tsx
const cols = useTableColumns({
  keys: COLUMNS.map((c) => c.key),
  // Structure, not content: the select box and the pinned row-open cell.
  fixed: ["select", "actions"],
  // Optional — supply these to keep the arrangement in a saved view.
  order, onOrderChange, widths, onWidthsChange,
});
const visible = cols.arrange(COLUMNS.filter((c) => !hidden.has(c.key)));
…
<col style={{ width: `${cols.widthOf(col)}px` }} />
…
<TableColumnHeader cols={cols} col={col}>{col.label}</TableColumnHeader>
```

**There is no enable flag, and there should not be one.** A table that opts out
is a table whose columns the reader may not arrange, and nobody should be able to
reach that by leaving a prop off. If a particular column must not move — because
it is the frame rather than the content — name it in `fixed`.

**The order and the widths belong in the saved view**, alongside the filters: a
view that restored the narrowing but not the arrangement rebuilds half the thing.
Leave `order`/`widths` off and the table remembers them for the session only,
which is the right default for a list with no views.

**Column order is the reader's, not the schema's** (`useColumnOrder`). Which two
columns sit side by side is what makes a comparison possible at a glance, and the
right pair differs by who is looking — dispatch wants Driver beside Planned Date,
accounting wants Qty beside Status. Every column header drags, and ⌘/Ctrl + ← →
moves a focused one a step, because a header that only moves by mouse does not
move for everyone. **Columns also RESIZE** (`useColumnWidths`), and the two
gestures get different targets and different cursors, because both begin with a
pointer held on a header and a table that guessed would guess wrong in the way
that costs most — you meant to widen a column and reordered the table instead.

- **The divider resizes**, `col-resize`, the split every spreadsheet already
  taught. `ColumnResizeHandle` straddles the boundary and belongs to the column
  on its left; double-click restores the declared width, ← → nudge it 16px, and
  64px is the floor. While a divider is held, the reorder hook stands down. It
  draws `┆│┆` — **the boundary rule itself, with a short bar either side**. These
  headers carry no column rules otherwise, so the edge has to be drawn before it
  can be grabbed, and two bars alone read as the same six-dot mark the move grip
  uses; the rule between them is what makes the gesture legible as "this edge,
  left or right".
  **It lights with its HEADER, not with its own 12px zone**: hovering the Status
  cell shows the edge between Status and Customer and nothing else — the divider
  you are about to reach for is the one belonging to the column you are already
  on. Gated on the zone, the mark only appeared once the pointer had found a
  12px strip it had no reason to aim at; gated on nothing, all eleven dividers
  lit at once and the row read as a grid rather than as a control.
- **The header body moves**, `cursor-grab`, with `ColumnMoveGrip` fading in over
  the header's own 12px left padding — so the sign costs the label no room and
  nothing reflows. It is the sign, not the handle: the whole `<th>` is draggable.

Both marks come up together on the hovered header — one saying the column moves,
one showing the edge that resizes — and then the move grip **steps aside** as the
pointer reaches the divider: it is the handle's `peer`, and from there on the two
would be two answers to one press. Nothing is drawn on any other header. Always
on, they would be marks on every header at once, and a row of eleven reads as
decoration.

A resize watches for its release on the WINDOW as well as on the handle: a
pointer let go outside the window would otherwise strand the "resizing" flag and
silently refuse every column drag until reload — one control disabling another is
the worst kind of bug to find. Two things do NOT move: the leading select box and the
trailing row-open chevron are the FRAME a row is read inside, not content, and
the chevron is pinned to the right edge so it survives a sideways scroll —
neither is draggable and nothing can be dropped past them. The order belongs in
the saved view alongside the filters: a view that restored the narrowing but not
the arrangement rebuilds half the thing. A saved order that predates a new column
keeps the column, in its declared position — a stale view may cost you the
ordering, never the data.

**Scope controls lead the toolbar's right cluster**, so the row reads outward:
what *scopes* the view → how it is *presented* (view switch, column tools) → the
action that *adds* to it. A scope control placed between the icon tools and the
CTA splits the tools from a button they have nothing to do with.

*(DS FOLLOW-UP: the external `interaction-and-behavior.md` still carries the
superseded wording of locked decision 8 — that document is not in this repo and
must be amended to match.)*

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

**N1 — One level per tier. The rail is flat.** The Tier-1 rail carries one item
per top-level screen and nothing else: **no section headings, no nesting, no
sub-categories.** The moment a module needs a second level, that level goes in
the **Tier-2 drawer** — it does not become groups inside the rail. Two levels of
hierarchy in a 52px rail is the failure this rule exists to prevent, and it is
easy to reach for because the hover-expanded rail is also 256px wide and so
*looks* like somewhere headings could live. It isn't: the rail is `bg-rail`
(near-black, square, flush); the drawer is `bg-sidebar` (rounded, shadowed,
inset). If a design shows grouped items under a heading, it is describing the
drawer.

**N2 — A module's nav shape is re-derived, never inherited.** "This workspace
has no second nav level, so no drawer" is a statement about the destinations a
module has *today*. Adding a module, or sub-categories to an existing one,
invalidates it. Re-test the tier question whenever the destination list changes
rather than carrying the previous answer forward.

**N3 — Check the DS before extending a nav component.** `NavigationDrawer`
already does headings, collapsible children, and both the 52px and 256px states.
Adding one of those to `NavRail` duplicates a capability that exists and breaks
N1 at the same time.

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

*Folded in from `02-rules/interaction-and-behavior.md` — see the provenance note in `interactions/2-rules.md`.*

## 10. Page layout — title outside, container inside

Promoted from the smoke-test feedback (R1, R2, R3).

- **Every list/data page is laid out as: page header strip OUTSIDE the data
  container, content INSIDE one rounded bordered container.**
- The **page header strip** (above the container) carries:
  - left: page title (and optional breadcrumb)
  - right: the **single primary CTA for the page**, if any (e.g.
    `+ Create Order`, `+ Create Tax`) + utility icon buttons
- The **data container** (`--fp-surface-1b`, `rounded-md`, **no outer border** —
  it lifts on `--shadow-fp-surface`)
  holds, top-to-bottom:
  - section tabs (when present)
  - the standard toolbar (per §4)
  - the table body
  - the pagination row
- **SUPERSEDED — the primary CTA sits with the data it acts on.** This rule
  previously read "tables do not carry a redundant create CTA inside the
  toolbar; one primary CTA per page, at the page header." It is replaced by
  *Action placement* in `ux/2-rules.md`: a CTA scoped by something inside the
  container (preset view, line of service, date) belongs at the right end of
  the preset-view row, not hoisted to the page header where it is separated
  from the scope that determines what it creates. The page-header placement
  still holds for genuinely **page-level** actions. There is still exactly one
  primary CTA per view.
- **Pagination is mandatory** at the bottom of any paginated list, in three
  slots: `Showing N–N of N` (left) · page numbers `‹ 1 2 3 … N ›` (center) ·
  page-size selector `25 ▾` (right).
- Any editable region declares `mode` (static|dynamic) explicitly.
- Any aggregated value has an accessible breakdown affordance.
- Create/edit of non-trivial records uses a full-page form, not a modal.
- Every mutating action yields a toast + visible state propagation.
- Multi-select uses chips+checkbox picker; single-select uses Replace semantics.
- Lists expose: search, filters (with count badge), views, create CTA, pagination.
- Destructive or bulk-overwrite actions require an explicit confirmation step.
- Bulk multi-value edits offer an Add-vs-Replace choice.
- **State transitions are surface-agnostic** — board drag, detail dropdown,
  and bulk action share one state machine.
- **Detail / read views use Side Sheet or Modal**, never a full page.
- **Row action buttons that reflect a lifecycle state** must pair with a kebab
  that exposes the allowed transitions.
- **Outreach uses a message-composer dialog** with prefilled subject + body
  templated from the record.
- **Lists may expose an alternate-view toggle** (Board/Table, Table/Map);
  toolbar state is shared across views.
- **Bulk action bars use fast-path-inline + More-menu** structure when
  options exceed ~5; the More menu splits "Set or change" vs "Apply an
  action"; inapplicable options are visible-but-disabled.
- **Bulk mutations that change a computed value get a per-row before/after
  preview** before commit; pure replace-all may skip the preview.
- **Two-pane workspaces** declare per-pane drag/fullscreen/close controls.
- **Bulk-attribute editors pick a tier** by attribute cardinality (scalar /
  single-value-per-row / grouped multi-value); tier-3 dialogs always carry
  mode tabs + per-group scope label.
- **Diagnostic disclosure is non-blocking by default**: severity-coded banner
  with counts + Show Details expand-to-table; Confirm stays enabled. Block
  only for hard-safety / destructive cases.
- **Severity vocabulary is consistent**: amber=warning, red=error,
  yellow/neutral=info.
- **Color governance (§9)**: chips/badges/statuses render neutral until a
  Layer 2 usage rule binds a color to a meaning. Destructive color appears
  only on action labels, never as fills.
- **Brand orange is reserved** for primary CTA fills, active-tab indicator,
  and brand mark. Not used for hover, selected-row, or generic interactive
  states.
- **Page layout (§10)**: page title + single primary CTA live OUTSIDE the
  data container; tabs + toolbar + table + pagination live INSIDE one
  rounded bordered container.
- **Pagination is mandatory** at the bottom of any paginated list — three
  slots: showing-count · page numbers · page-size selector.
- **Rail and contextual sidebar use distinct surface tokens** (`--color-rail`
  vs `--color-sidebar`).
- **Bulk action bar** is a compact neutral floating pill — not a full
  toolbar. Equal-weight icon+label actions, no primary fills, destructive
  as small icon only.


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
- **Keep the Tier-1 rail flat** — one item per top-level screen. (N1)
- **Put sub-categories in the Tier-2 drawer**, as group labels or collapsible children. (N1)
- **Re-derive whether a module needs a drawer** whenever its destinations change. (N2)

## Don't
- **Don't ship a *page-owned* top-bar** that duplicates the global (Tier-0) chrome — the one global top bar (brand · search · account) is canonical; the content header is compact (breadcrumb-as-title, no divider). (L1/L2)
- **Don't use tabs to navigate** between different pages/objects — that's the rail's job. (L5)
- **Don't put section headings or nested groups in the rail** — the rail is one level; the drawer is the second. (N1)
- **Don't extend a nav component before checking the DS** — `NavigationDrawer` already does headings and dropdowns. (N3)
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

## Navigation
- **Rail depth (N1)** — ❌ section headings or grouped sub-categories inside the 52px Tier-1 rail · ✅ the rail stays flat, one item per top-level screen; groups and dropdowns go in the Tier-2 drawer.
- **Stale tier decision (N2)** — ❌ "this app has no drawer" carried forward after a module gained sub-categories · ✅ re-derive the tier question every time the destination list changes.
- **Duplicated nav capability (N3)** — ❌ teaching `NavRail` to render group labels · ✅ use `NavigationDrawer`, which already renders labels and collapsible children.
- **Reading a mock by width (N1)** — ❌ assuming a 256px grouped panel is the expanded rail · ✅ check the surface: rail = `bg-rail`, square, flush; drawer = `bg-sidebar`, rounded, shadowed.

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

# Interaction & behaviour — folded in from `02-rules/`

*Provenance: this ruleset previously lived at `02-rules/interaction-and-behavior.md`,
outside the repo, in two copies that had already drifted from each other. It was
the document handoffs cited as authoritative, which is why its stale rules kept
being carried forward — nobody edits an archived file. Folded in here so it is
versioned, regenerated into `apply-design-system.md`, and reviewed alongside the
code that implements it.*

*Corrections applied during the fold, each one deliberate rather than silent:*

1. *Bulk-action bar surface/radius/shadow — was `--color-popover` / `--color-card`,
   `--radius-md`, `--shadow-md`. `--popover` is byte-identical to
   `--fp-surface-1b` in both themes, and **FP DS 2026 has no `shadow/md` at
   all**. Now `--fp-card-1`, `rounded-lg`, `--shadow-fp-overlay`.*
2. *Data-container surface — was `--color-card`; the content layer is
   `--fp-surface-1b` with no outer border.*
3. *Primary-CTA placement — the "never inside the toolbar" rule is marked
   superseded and points at its replacement.*
4. *Destructive colour — a carve-out added for the final confirm in a guarded
   flow, which the shipped `BulkEditDialog` relies on.*

## 1. Editing model

- **One editable-table primitive**, distinguished by a `mode` prop:
  **static (read-only)** ↔ **dynamic (editable)**. Covers read-only and editable
  data tables, tier tables, and pickers. Cell editors: text,
  number(+unit), single-select, searchable-select, chip-multiselect.
- **Inline cell editing**: a cell expands in place (chevron) to its editor; edits
  save inline. Use for quick edits within a data table.
- **Full-page form** (not a modal) for create/edit of any non-trivial record.
  Header (title + context + close), stacked sections, **sticky footer** with the
  primary save ("Confirm and Save" / "Update and Save"). Modals are reserved for
  short, single-purpose tasks.

## 2. Selection & pickers (standardize ONE)

- Canonical picker: **empty-state CTA → search + option list → selected items
  become removable chips** ("N Added") → collapses to chips + "Add More".
- List presentation: standardize on **checkbox rows** for multi-select (chips
  above for what's chosen). (Flows showed both checkbox and per-row "+ Add";
  pick checkbox as the default.)
- **Cardinality is explicit in the affordance:** multi → "Add"; single → "Replace".
- **Type/mode toggle** (radio-card group) may **swap the form body**: e.g.
  scalar input ↔ tiered/ranged editable table.

### 2a. Dropdowns
- **Every list searches**, short ones included. A field that takes typing at nine
  options and ignores it at five is one you have to OPEN AND LOOK AT before you
  know how to use it, and the cost of guessing wrong — reaching for the keyboard
  and having nothing happen — is worse than the row of chrome a search box costs.
  `Combobox` (the DS's Popover + Command composition) is the control; a
  `searchThreshold` exists for the rare list where the box gives nothing back, and
  nothing sets it.
- **A searchable select WEARS THE SELECT'S TRIGGER.** A field that is a select in
  every way except that you can filter it must not announce itself as a different
  control; the difference belongs inside the list, where the search box is. Both
  read from one exported class string, so they cannot drift by a pixel.
- **A list drops BELOW the field**, left-aligned, 4px off — never over it. Radix's
  `item-aligned` default lays the list on top of the trigger and slides the
  selected row onto it: the field disappears at the moment of choosing. Every menu
  in this system opens below the control that opened it.
- **An option that reads as an absence is still an option.** "— Unassigned",
  "Not set", "No" are choices, and they live in the list rather than being
  represented by an empty field — an unanswered field and a deliberate "none" look
  identical and are not the same thing.
- **A value already used elsewhere in the same table is shown TICKED AND
  UNSELECTABLE, not hidden.** Removing it makes the list change length as the
  table fills, and someone hunting for a row they already added concludes it does
  not exist.

### 2b. Helper text
**Helper text sits 4px under the control it describes** — input, select,
dropzone, table, anything. It is part of that control, not the next thing down
the form: at a field gap it floats between two controls and gets read as a label
for the one below. Label→control keeps the field's own rhythm; control→helper is
4px, always.

## 3. Disclosure & feedback

- **Progressive disclosure**: start minimal (a selector or CTA); reveal detail on
  action. Don't render empty complex UI up front.
- **Save → toast → recompute → propagate.** On save: show a success toast,
  recompute derived values (effective price, sums, totals), and update related
  state. Observed propagations: scope badge **Customer → ShipTo**, pending
  **counter decrement**, **new row prepended** to its list (recency ordering).
- **Breakdown popover**: any aggregated/rolled-up value is clickable → a popover
  with its itemized breakdown. Covers calculation rollups (→ Grand Total),
  interval/tier tables, and **count → member list**.
- **The breakdown idiom extends to diagnostic disclosure**: a summary
  banner with severity-coded counts ("2 over capacity · 2 incompatible")
  expands via **Show Details** into a per-row issue table. Same shape, applied
  to validation problems rather than computed totals. Severity vocabulary:
  **amber = warning** (soft limit), **red = error** (hard mismatch),
  **yellow/neutral = info** (missing data). Diagnostics are **non-blocking**
  by default — Confirm stays enabled and the user proceeds on judgment;
  block only for hard-safety or destructive operations.

## 4. Tables (list & data)

- **Standard toolbar**: search · column filter · **Filters** (with active-count
  badge) · Group By · **saved Views** · primary **create CTA**. Views capture
  table state (filters/group/columns) under a name; the Views control splits
  **Preset** vs **Saved**, is searchable + reorderable, tracks an **Unsaved
  Changes** dirty state (Discard / Add New), and saving a view emits a toast.
- **Cell vocabulary**: value-only · **value+meta** ("$1.05 / 2 margins";
  "Volume Based / N intervals") · link (breakdown or navigate) · **count→popover**
  · status (Active/Inactive) · scope badge · trailing settings gear.
- **Row expansion / inline edit** via chevron.
- **Grouping**: a single-select Group By (e.g. Customer / Product / Index) turns
  the table into collapsible **group-header rows** with adaptive member-count
  summaries; expanding reveals the nested rows. The active dimension shows as a
  removable chip. Selection/inline-edit behave identically in grouped mode — the
  table is **one component with modes** (flat · grouped · selectable · editable),
  not separate components.
- **Bulk + context bar** (sticky bottom): select-all, count of filtered subset,
  clear-filters, bulk actions.
- **Faceted filtering**: a two-pane panel (facet list with per-facet counts +
  options) with Clear all / Apply. On apply → toast, a count badge on the Filters
  button, and an **applied-filter chip bar** (removable chips + "N More" overflow)
  below the toolbar. Hierarchical facets (e.g. Customer→ShipTos) use a **tree
  multi-select with tristate parent checkboxes**.
- **Empty-state rows**: NA cells + a per-row CTA (e.g. "Setup Pricing").
- **Pagination** footer.

### 4a. Totals and the add row — an editable table's two ends

**T1 — A total is a ROW of the table, never a caption under it.** Render it as a
`<tfoot>` row on the same grid as the body: the label right-aligned in the cells
before the measure, the sum in the measure's own column, action columns empty. A
total placed outside the table has to be aligned to that column by hand, drifts
the moment a column width changes, and reads as a note about the whole table
rather than the bottom of one column.

**T2 — The total appears only once a row carries real content.** A total over an
empty table says "0" about something that has not started. Where every row is
qualitative rather than numeric (all "top-off", all "TBD"), the total says that
word instead of a number, because there is nothing to add up.

**T3 — The measure excludes rows that state no value.** A row flagged as
"decided later" contributes nothing, even if it still carries a number typed
before the flag was set — that number is kept so unsetting the flag hands it
back, and must not leak into a sum nobody promised.

**T4 — "+ Add" stays ATTACHED TO THE TABLE'S SQUARED BOTTOM-LEFT CORNER, below
the total.** `rounded-b-md border border-t-0`, h-8, muted label, on the table's
own bottom edge. It is chrome hanging off the table, not a row of it: a row
would sit inside the total's grid and be counted by the eye as data. The order
down the table is therefore *rows → total → add*, and the total keeps its place
as the table's last line whatever gets added next.

**T5 — A column of checkboxes is NAMED.** If the tick does something specific
("Top off", "Include"), the header says so and the tick means that one thing.
An unlabelled selection column needs a control elsewhere to explain it, and then
the same tick means different things depending on that control's state.

### 3b. Explaining a section
A rule about how a section behaves goes **beside its heading, on demand** — an
info button opening a narrow popover — not as a paragraph under the section. A
paragraph is read once and then permanently in the way; the rule is needed at the
moment someone WONDERS, which is rarely the moment they first arrive. **On click,
not hover**: hover cannot be reached by touch, and a tooltip that appears while
you are aiming at something else is worse than no tooltip. Keep it to a few short
lines — an explanation set to the full width of a sheet becomes one line the eye
has to track back across.

Where a hovered icon is already the whole message (a copy glyph beside a value),
add **no tooltip at all**: a floating label repeating it covers the thing next to
it, which is often the next thing someone wanted.

## 4b. Bulk operations

- **ONE BAR, actions passed in.** What can be done to a selection is a property of
  the RECORDS, not of the bar — the same split the Group By menu makes for
  dimensions. `BulkActionBar` takes `actions` (and `noun`, so a confirm says "2
  partners" rather than "2 records"); the count chip, spacing, hairlines and
  confirm-on-destructive stay in the design system. A second bar built in place is
  how a selection stops feeling like a selection everywhere else.
- **A selection starts EMPTY and is transient.** Adding a row is not choosing one
  to act on: the tick says "do something to these now", so a row that arrives
  ticked has answered a question nobody asked and puts a bar on screen before
  there is anything to bulk. The selection belongs to the visit, not the record —
  it resets when the sheet or screen opens.
- **Don't make a selection carry a second meaning.** If a switch also reads the
  ticked rows ("ask these for a price"), two unrelated decisions share one control
  and the default for one becomes wrong for the other. A property of the whole
  round is a switch over the whole round.
- **Order on the page:** things always true of the set sit ABOVE the bar; the bar
  comes last because it appears and disappears, and anything below it jumps.
- **Row multi-select → sticky bulk-edit bar**: "N Selected" + per-attribute edit
  actions. Each action opens the **same editor primitive** used for single edits
  (searchable-select for single-value attributes; chip picker for multi-value).
- **Bar shape**: a small set of **fast-path actions inline** (the most-common
  operations for that record type) + a **`More ▾`** menu for the long tail.
  More is organised into two labelled groups: **"Set or change"** (attribute
  mutations, two-column layout for many attributes) and **"Apply an action"**
  (compound/state actions like Duplicate, Verify). Inapplicable options are
  **visible-but-disabled**, not hidden.
- A trailing **destructive (trash)** affordance + **dismiss (✕)** sit separate
  from the per-attribute mutations.
- **Three tiers of bulk-attribute editor** — pick by the attribute's cardinality:
  - *Tier 1 — scalar* (same value applies to all): single input dialog
    (e.g. Extend Planned Time). Optional two-step preview (see below).
  - *Tier 2 — single-value-per-row* (pick one value, applies to each row):
    searchable-select dialog (e.g. Driver, Truck).
  - *Tier 3 — multi-value-per-row* (each row carries a collection):
    a richer dialog with **mode tabs** (`Edit per <group>` vs `Replace all
    <attribute>`), **grouped sub-editors** (one mini-editor per existing
    value, scoped `N parents · N children`), and **inline diagnostic banners**
    (per §3) for per-row constraint problems.
- **Add vs Replace** is the underlying semantic for any non-scalar bulk edit
  — expressed as **radio cards** when each mode is light, or as **mode tabs**
  when each mode owns a non-trivial body. Same semantic, two layouts.
- **Destructive bulk replace requires confirmation** ("N … will be replaced by
  X" → Cancel / Confirm).
- **Bulk mutations that change a computed value across rows take a two-step
  shape**: (1) input dialog (header leads with scope + count), (2) **per-row
  before/after preview** with `Go back` / `Confirm`, (3) commit. Pure
  replace-all mutations (where a preview adds no information) stay
  single-step.
- **Apply → toast → recompute across every affected row.**
- One sticky-bottom bar component, two modes: **bulk-edit** (acting on a
  selection) and **context** (framing a filtered subset).
- **Visual treatment** (smoke-test corrected): the bar is a **compact
  neutral floating pill** — not a full-width toolbar.
  - Surface: `--fp-card-1`, 1px `--color-border`, `rounded-lg`,
    `--shadow-fp-overlay`. Centered horizontally above the pane
    footer, ~720px wide max (content-sized).
  - Left: a small **count chip** with an inline dismiss (`N Selected ✕`),
    visually a single token.
  - Actions: **icon + label, all equal visual weight**, neutral surface.
    No primary fills inside the bar. No ghost-vs-solid hierarchy. Apply
    spacing-2 between actions.
  - Destructive: a small icon glyph in `--color-destructive` — no fill, no
    tinted background.
  - `More ▾`: the same neutral icon+label as the others, last in the row.

## 5. Navigation & shell

- **Management hub**: back-nav header + **entity-type tabs**, each tab = a list +
  create/edit form for one reference entity.
- **Tabbed section pages** with right-aligned section links.
- App shell is always the **DS sidebar shell** (52px rail + 256px sidebar +
  content), never the legacy top-nav seen in the references.
- **Two-pane workspace** is a recognised page archetype for operations where
  two surfaces must be cross-referenced live (orders ↔ shift planner; pricing
  ↔ tank levels). Panes stack with a resizable divider and each carries its
  own drag-handle / fullscreen / close controls — independently dockable.

## 6. Status & lifecycle

- **Labelled toggle row** (label + helper + switch) controls active/inactive;
  reflected as a status value in lists. List fields are a **projection of form
  fields** (status toggle ↔ status column; picker count ↔ count cell).
- Records carry lifecycle states (e.g. shift **COMPLETED**) shown as a status
  control, sometimes with a dropdown to change state.

## 7. Banners & notes

- **Action/reminder banner**: pending-work summary + CTA ("49 pending · Show All").
- **Dismissible info note**: contextual, closeable.

## 8. Board / detail / outreach archetypes

### 8.1 Status Kanban board
- Lanes = states of one **status machine**; each lane has a colored header and
  a count badge.
- **Drag a card across lanes → transitions the record's status.** The same
  transition fires from anywhere else that can change status (see §8.5).
- Each lane can carry its own footer **`+ Create`** for in-place record
  creation in that initial state.
- **Card-level status decoration**: optional full-width ribbon at the bottom of
  a card for cross-cutting flags (Urgent, Overdue, At Risk).
- Page-level actions (e.g. Accounting Sync) live in the page header, not on
  cards or lanes.

### 8.2 Entity card
A reusable card molecule for a record summary:
header (id + small color-coded **stage badge**) → body of **label / value**
pairs → optional ribbon. The same card is used in Kanban lanes, related-record
sections, and search results.

### 8.3 Alternate-view toggle on a list
A segmented control next to the standard toolbar that flips the same dataset
between representations: **Board ⇄ Table**, **Table ⇄ Map**. The toolbar
(search, filters, views, date range) is shared across views; only the body
rendering changes. Group-by/saved-views still apply where they make sense for
the active view.

### 8.4 Record-detail overlay (read view with light inline edits)
Opens from a card or row click. **Default container = Side Sheet** for deep
detail next to the list, or **Modal** for peek. Structure:
- Header: title + record id + utility actions (Download, Share) + close.
- Collapsible **accordion sections** (Order Details · Delivery Partner · …).
- Inside a section, a **property grid** (§8.6) on top, **sub-entity tables**
  below, and a **document gallery** (§8.7) when relevant.

This is a **detail / read view**, distinct from the **full-page form** rule
for non-trivial create/edit (§1). Read-with-light-edit → overlay; substantive
create/edit → full page.

### 8.5 One state machine, many surfaces
A record's status transitions are defined once and exposed through *every*
surface that touches the record — board drag, status dropdown in the detail
overlay, bulk-edit on the list. Same allowed transitions, same side effects
(toast + propagation, §3). Surfaces never invent their own transitions.

### 8.6 Property grid with mixed-affordance rows
For detail views, use **one property-grid molecule** with row variants — *not*
seven separate field components:
- static value
- inline-edit (pencil) — opens a small inline editor on click
- link (opens a related view or external resource)
- dropdown (drives a state machine or enum)
- value-with-helper-note (small caption clarifies meaning/visibility)

Two-column layout on desktop; collapses to one column on narrow widths.

### 8.7 Attachment / document gallery
For records that carry files: thumbnail cards with name + kebab (preview,
download, rename, delete), an **Upload** affordance, and horizontal **carousel
arrows** for overflow. Same molecule for images, PDFs, contracts.

### 8.8 Row action with lifecycle state
A data-table row action can **double as a state indicator**: the button label
*is* the current state (`Invite` → `Invite Sent` → `Invite Re-sent`), and the
**kebab next to it exposes transitions** (Re-send · Acknowledge · Submit ·
Cancel). Generalizes far beyond invites — any per-row workflow with multiple
transitions follows this shape.

### 8.9 Message-composer dialog (outreach)
For sending a templated message about a record (invite a partner, escalate to
a customer, notify a driver):
- Fields: **To · Subject · Personal Message**, all required.
- Subject + Body are **prefilled from a template** that references the record
  (`"<Broker> | Delivery Order Request #<OrderNumber>"`).
- Sends to a real channel (email/SMS/in-app) — on success: toast +
  state-propagation on the originating row (§8.8).

Same composer shape applies regardless of the channel; the To field's input
type adapts (email vs phone vs user-picker).

---


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
- **Put a table's total in a `<tfoot>` row**, in the column it sums (T1).
- **Keep "+ Add" attached to the table's squared bottom-left corner**, below the
  total — rows → total → add (T4).
- **Name a checkbox column** when the tick does one specific thing (T5).
- **Set helper text 4px under its control** (§2b).
- **Make every dropdown searchable**, short lists included (§2a).
- **Drop a list below its field**, left-aligned (§2a).
- **Keep "none" as a real option** — "— Unassigned", "Not set" (§2a).
- **Show an already-used value ticked and unselectable**, not hidden (§2a).
- **Explain a section beside its heading, on click** (§3b).
- **Pass a list's own verbs into the DS bulk bar** (§4b).
- **Start a selection empty** — the bar arrives when someone means it (§4b).

## Don't
- **Don't fire a destructive action on one unguarded click.**
- **Don't ship a control with no visible focus state.**
- **Don't leave an action silent** (no loading / success / error).
- **Don't pass `var(--token)` to a Recharts `stroke`/`fill`** — it won't resolve.
- **Don't let a loading skeleton change the loaded shape** (layout jump).
- **Don't animate non-essential motion** without honoring `prefers-reduced-motion`.
- **Don't float a total outside the table** and align it to a column by hand (T1).
- **Don't show a total over an empty table** — "0" about work not started (T2).
- **Don't sum a row that states no value** just because a stale number sits behind
  its flag (T3).
- **Don't leave a checkbox column unlabelled** and explain it with a switch
  somewhere else (T5).
- **Don't set helper text at the field gap** — it reads as a label for the control
  below (§2b).
- **Don't lay a select's list over its own trigger** (§2a).
- **Don't gate search on a list's length** — the field then behaves differently
  depending on data you cannot see (§2a).
- **Don't build a second bulk bar** in place of passing actions to the DS one (§4b).
- **Don't tick rows on creation** (§4b).
- **Don't let one checkbox column mean two things** (§4b).
- **Don't override a section's gap per instance** — that is how a sheet drifts
  from the 40/16 rhythm (`ux/2-rules`).


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
- **Table total** — ❌ a total floated under the table and aligned to its column by hand (drifts the moment a width changes; reads as a caption) · ✅ a `<tfoot>` row on the table's own grid (T1).
- **Empty total** — ❌ "Total 0 gal" above an order with no lines · ✅ the total appears once a row carries real content (T2).
- **Stale measure** — ❌ summing the number still stored behind a "decided later" flag · ✅ the flag excludes the row; the number is kept only so unflagging hands it back (T3).
- **Add placement** — ❌ "+ Add" as a table row, sitting inside the total's grid and read as data · ✅ chrome attached to the squared bottom-left corner, below the total (T4).
- **Unlabelled checkbox column** — ❌ a tick whose meaning depends on a switch above the table · ✅ a named column, one tick one meaning (T5).
- **Helper text** — ❌ helper text a field-gap away, read as a label for the next control · ✅ 4px under the control it describes (§2b).
- **Select position** — ❌ Radix `item-aligned`, which lays the list over the trigger and slides the selected row onto it (the field vanishes as you choose) · ✅ `popper`, `align="start"`, 4px off (§2a).
- **Search threshold** — ❌ search appears only past N options, so the field behaves differently depending on data the reader cannot see · ✅ every list searches (§2a).
- **Two triggers** — ❌ a searchable select styled as a button beside plain selects · ✅ one shared trigger class; the difference lives inside the list (§2a).
- **"None" as emptiness** — ❌ an unset field standing in for a deliberate "no" · ✅ "— Unassigned" / "Not set" / "No" as real options (§2a).
- **Hidden used values** — ❌ removing an already-picked option from other rows' lists, so the list changes length as the table fills · ✅ ticked and unselectable (§2a).
- **Section paragraph** — ❌ a rule set as body copy under the section, read once then permanently in the way · ✅ an info button beside the heading, opening on click (§3b).
- **Redundant tooltip** — ❌ a tooltip on a hover-revealed copy glyph, covering the value next to it · ✅ the icon plus an `aria-label` (§3b).
- **Forked bulk bar** — ❌ a second bar built in the screen because its verbs differ · ✅ `BulkActionBar` with `actions` and `noun` (§4b).
- **Pre-ticked rows** — ❌ adding a row ticks it, so a bulk bar appears before anything is chosen · ✅ selections start empty and transient (§4b).
- **Double-duty selection** — ❌ the ticked rows are both the bulk target and the quote scope · ✅ a property of the whole set is a switch over the whole set (§4b).
- **Per-instance section gap** — ❌ `<SheetSection className="gap-5">` on every section of one sheet · ✅ take the 40/16 default (`ux/2-rules`).


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

# Token provenance — values decided in code, and what they derive from

**Figma sourcing is not a precondition.** Design values are decided here, in the
token layer. This file is a *provenance register*, not a request queue: it records
which values were chosen in the repo and what each one derives from, so a later
reader can tell a considered decision from a guess. Nothing on this list is
blocked, and nothing here should stop work.

What still holds, from the constitution: **tokens, never raw hex.** A value
belongs in `src/index.css`, defined for **both** themes — that rule is about
having one place to change it, and was never about Figma.

Preference order when a value is needed:

1. an existing token;
2. a step on a ramp the palette already sits on (the light status colours are
   Tailwind `*-600`, so `*-700` is on-ramp, not invention);
3. a value derived from two existing tokens — a composite, a midpoint;
4. a considered new value, with the reasoning written beside it.

Then **measure the result** rather than asserting it. Round-trip to Figma
(`PxzKUl6emRr8QQ5Nb0vlwT`) only when Pavan says it is required.

---

## 1. Overlay tier — rim and surface are `dark:` pairs

The bulk-action bar floats over its own content, and neither its rim nor its fill
can be one token, because the value wanted is "the top of the surface ladder" and
the two themes disagree about which token that is:

| | FP-dark | Light |
|---|---|---|
| rim | `--fp-outline-2` `[45,40,32]` | `--fp-outline-1` `[24,20,15]` |
| fill | `--fp-card-1` | `--fp-surface-1a` (`#ffffff`) |

`--fp-outline-2` is byte-identical to `--accent` in light, so the strongest dark
rim is the weakest possible light one. Hence
`border-fp-outline-1 dark:border-fp-outline-2` and
`bg-fp-surface-1a dark:bg-fp-card-1`.

**Derivation:** all four are existing tokens; only the pairing is new. A single
`--fp-surface-overlay` / `--fp-rim-overlay` pair would collapse both `dark:`
variants — worth doing whenever someone wants to, here or in Figma.

**Settled, not open: the shadow.** An earlier revision escalated the dark shadow
alpha to 55% because 10% black separates by only `[4,5,5]` on a dark surface.
That was the wrong fix — black on dark has almost no range, so a shadow can never
be the separator there. **On dark, elevation is a lighter rim; the shadow is
ambient depth.** With the rim carrying separation, `--shadow-fp-overlay` is the
library's `shadow/xl` geometry at 10% in both themes.

*(Aside: the library ships `shadow/sm`, `/lg`, `/xl` and no `shadow/md` — any rule
naming `--shadow-md` names a token this DS has never had.)*

---

## 2. Pastel hues — `--pastel-blue`, `--pastel-amber`

Chosen in a prototype and carried verbatim. Both pairs measure AAA against their
own foregrounds (7.65:1 and 7.09:1).

**Derivation:** picked by eye, then measured. Extending the set (green, rose, …)
is a one-line change per pair — match how these were built, a light tint with a
foreground dark enough to clear AA on it, and **measure the pair before adding
it** rather than eyeballing a hex.

---

## 3. Light status colours — `text` fixed, `soft` is large-text only

The light `--status-success` / `--status-processing` values moved one step down
their own ramp (green-600 → green-700, amber-600 → amber-700) because they failed
AA as *text*. Green and amber are far lighter than red/pink/blue at the same
step, which is why only those two needed it.

| treatment | FP-dark | Light |
|---|---|---|
| `text/success` | 7.18 | 3.30 → **5.02** ✓ |
| `text/processing` | 7.62 | 3.19 → **5.02** ✓ |
| `text/failed` | 5.91 | 4.83 ✓ |
| `soft/success` | 6.04 | 2.96 → 4.38 — large text only |
| `soft/processing` | 6.38 | 2.86 → 4.39 — large text only |
| `soft/failed` | 5.15 | 4.13 — large text only |

**Still open, and fixable here.** A 10% tint of the label's own hue lifts the
background faster than it darkens the text, so `soft` lands at ~4.4 rather than
4.5. Darkening the token further would fix the pill but make the dot and the
`text` label heavier than they should be. The real fix is for the tint to **stop
being a straight alpha of the label colour** — a fixed tint plus a foreground
measured against it, the way the pastel pairs are built. `soft/failed` is
unchanged at 4.13. It used to move together with `--destructive`; since the
2026-08-27 light sync (§5) that token is red/500 and `--status-failed` is not, so
the two are independent and the `destructive` Badge no longer shares this recipe
in light.

Until then: `dot` and `text` are safe on light; `soft` is large-text only.

---

## 4. Radius ramp has no 4px step

The ramp is `xs 2 · sm 6 · md 8 · lg 10 · xl 14`. A prototype wanted a raw
`rounded-[4px]` on the preset-row CTA; it uses `rounded-sm` (6px) instead, the
nearest on-scale step, because a raw literal in a base component propagates
downstream.

**Open question, not a blocker:** add a 4px step or confirm 4px is off-system.
Either can be decided here.

---

## 5. Light column synced from Figma — 2026-08-27

The one case the sourcing rule reserves for Figma: Pavan re-authored the Light
mode variables there and asked for them to come across. Source is
`PxzKUl6emRr8QQ5Nb0vlwT`, collection **"3. Mode"**, mode **Light**. Of the 32
`base/*` semantic colours, 21 already matched the repo; these 11 did not and were
taken **verbatim**, at Pavan's explicit direction, after the two consequences
below were measured and raised:

| token | was | now | Figma alias |
|---|---|---|---|
| `--background` | `#efefeb` | `#ffffff` | `colors/background-light` |
| `--secondary` | `#cad1db` | `#f4f4f5` | `zinc/100` |
| `--muted` | `#cad1db` | `#f4f4f5` | `zinc/100` |
| `--accent` | `#cad1db` | `#e5e7eb` | `gray/200` |
| `--destructive` | `#dc2626` | `#ef4444` | `red/500` |
| `--border` | `#cdd4de` | `#a1a1aa` | `zinc/400` |
| `--input` | `#abb3c2` | `#a1a1aa` | `zinc/400` |
| `--sidebar` | `#fafbf8` | `#fafafa` | `zinc/50` |
| `--sidebar-accent` | `#cad1db` | `#e5e7eb` | `gray/200` |
| `--sidebar-border` | `#cdd4de` | `#abb3c2` | `colors/sidebar-border-light` |
| `--sidebar-ring` | `#727d8f` | `#6b7280` | `gray/500` |

**Two known, accepted costs.** Both were measured before the change, not after,
and both are decisions rather than defects:

1. **`--destructive` is below AA as body text on white** — 3.76:1, where the old
   red-600 measured 4.83. `--status-failed` was deliberately *not* moved with it,
   so status text keeps 4.83; the `destructive` Badge and any `text-destructive`
   body copy carry the 3.76.
2. **Light hierarchy no longer has a ground/card fill step.** `--background` is
   now the same `#ffffff` as `--card`, `--popover`, `--fp-surface-1a` and
   `--fp-surface-1b` (1.00:1), so in light a card separates by border and shadow
   only, and `bg-background` on a card is invisible. This is a new entry in the
   fill-vs-surface collision family — see `ui/5-checks.md`.

`--fp-surface-base` keeps `#efefeb` and is now the only way to name the old
tinted ground. FP-only tokens (`--fp-*`, `--status-*`, `--pastel-*`, `--drawer`,
`--rail`, banners) are not in the Figma collection and were not touched.

**Also observed, not acted on.** All 11 Figma values resolve to stock Tailwind
primitives, and the set mixes two grey families — `accent` on `gray/200` while
`muted`/`secondary` sit on `zinc/100`. Worth a look next time the light palette
is opened.


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

