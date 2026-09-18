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
A stack of surfaces that step in lightness. **Nothing in the shell casts a
shadow** — the ground is the tinted Surface Base in both themes, so each layer
already reads as a step up from it by value, and a shadow on top of a real value
step is a second answer to a question already answered. `shadow-fp-surface`
survives for things that genuinely float *over* content: a hovered card, a
popover.
- **Global top bar:** `bg-background` + a bottom `border-border` hairline — app
  chrome, full width above the rail + content. It shares the ground's colour.
- **Light:** ground `#efefeb` (WARM, under cool paper — the temperature does the separating) → drawer `#fafbf8` → content layer `#ffffff`, with
  cards and fields stepping *down* off the content layer at `#f4f5f8`. The rail is
  the ground's own colour and disappears into it.
- **FP:** ground/rail `#080808` → drawer `#11161d` → content `#1b2028`, inner
  `#2a2f37`.
- **A field is filled, not transparent.** Transparent meant a field took whatever
  was behind it and could only be found by its border; filled white it is the
  same object on a card as on the content layer.
- The rail hover-expands to a 256px overlay that **stays `bg-rail`** (the colour does
  not change on expand). `--drawer` (#292929) and `--fp-lane` are **legacy** — no
  longer bound to the main nav / Kanban lanes.
- The content layer has **no outer border and no shadow** — it separates by value.

## Token quick reference (hex, both modes)
| Utility | Light | FP (dark) | Use |
|---|---|---|---|
| `bg-background` | `#efefeb` | `#080808` | app ground / Surface Base / global top bar — the rail sits flush on it |
| `text-foreground` | `#030405` | `#f0f2f5` | primary text |
| `bg-card` | `#f4f5f8` | `#11161d` | card, inner panel and every field (= Surface 1a) |
| `bg-popover` | `#ffffff` | `#1b2028` | menus, popovers, dialogs, sheets — anything that floats over content |
| `bg-primary` | `#090c0f` | `#f8fafc` | **neutral primary — the default CTA** |
| `bg-brand`/`text-brand` | `#fa6400` | `#fa6400` | brand orange — the product mark, the focus ring, and light's selection hue |
| `text-muted-foreground` | `#596475` | `#9ca3af` | secondary / label |
| `bg-accent` | `#e5e7eb` | `#2a2f37` | hover fill — *the pointer is here* |
| `bg-selected` | `#fee8d9` | `#2a2f37` | **selection fill — *this is the one*.** Brand tint in light, grey in dark |
| `text-selected-foreground` | `#a33f00` | `#f0f2f5` | its label, icon and indicator |
| `border-selected-border` | `#fdb98c` | `#575757` | its rim, where one is drawn |
| `bg-destructive` | `#ef4444` | `#f87171` | danger / delete |
| `border-border` | `#d4d4d8` | `#363c45` | default hairline |
| `border-input` | `#c4c4c9` | `#363c45` | field boundary |
| `ring-ring` | `#fa6400` | `#fa6400` | focus ring — **brand orange**, 2px |
| `bg-rail` | `#efefeb` | `#080808` | tier-1 rail (merges into the ground) |
| `bg-sidebar` | `#fafbf8` | `#11161d` | tier-2 drawer + rail hover-overlay. A DELIBERATELY QUIET EDGE in light: it belongs to the content layer rather than standing off from it, and measures ~1.03:1 against the ground by design. A separating grey (`#e5e9f0`, 1.11:1 — dark's own middle rung) was tried and reads as a heavy slab beside white; light's ladder is compressed at the top and this one joins rather than steps |
| `bg-sidebar-primary` | `#f4f5f8` | `#2a2f37` | the 24px section mark — one card step AWAY from the drawer it sits on (down in light, up in dark), **not** the brand: orange put the product mark twice on one screen. Re-measure whenever `--sidebar` moves |
| `bg-sidebar-accent` | `#fee8d9` | `#2a2f37` | the drawer's active item (= `--selected`) |
| `bg-fp-surface-base` | `#efefeb` | `#080808` | the app ground, by its own name |
| `bg-fp-surface-1a` | `#f4f5f8` | `#11161d` | inner panel — one step under the content layer |
| `bg-fp-surface-1b` | `#ffffff` | `#1b2028` | **content layer** (and the fill inside a field) |
| `bg-fp-card-1` | `#e9ecf1` | `#2a2f37` | raised inner card / pressed tint |
| `border-fp-outline-1` | `#e2e5ea` | `#363c45` | a card's own rim |
| `border-fp-outline-2` | `#c4c4c9` | `#575757` | hover / active rim — **must stay darker than outline-1 in light** |
| `bg-fp-row-hover` | `#f4f5f8` | `#22272f` | table row hover |
| `bg-fp-row-selected` | `#fee8d9` | `#2a2f37` | table row selected (= `--selected`) |
| `bg-fp-board-lane` | `#f4f5f8` | `#2a2f37` | board lane ground — one token, every board |
| `bg-fp-table-header` | `#e9ecf1` | `#2a2f37` | table header row — one clear step from the rows AND from a section card's title band, which a table can now sit flush under |
| `text-status-success` | `#15803d` | `#22c55e` | success |
| `text-status-success-foreground` | `#ffffff` | `#052e16` | the ink on a green FILL — not the same as the ink on a green dot |
| `text-status-processing` | `#b45309` | `#f59e0b` | processing / caution |
| `text-status-failed` | `#dc2626` | `#f87171` | failed |
| `text-verified` | `#2563eb` | `#3b82f6` | verified blue |

### Banners
The callout is a solid fill with white text in **light**; in **dark** it drops to
the near-black 950 of its own hue and the status moves to a 1px rim. The rim
token exists in both themes and is `transparent` in light, so the box does not
change height between them. The inline banner carries no fill of its own — it
sits on `bg-fp-card-1` and says its status in the text colour.

| Status | Fill | Rim (dark only) | Inline accent |
|---|---|---|---|
| info | `#1e40af` / `#1e1b4b` | `#6366f1` | `#1d4ed8` / `#a5b4fc` |
| caution | `#854d0e` / `#422006` | `#eab308` | `#b45309` / `#fcd34d` |
| warning | `#991b1b` / `#450a0a` | `#ef4444` | `#b91c1c` / `#fca5a5` |
| success | `#166534` / `#052e16` | `#22c55e` | `#15803d` / `#bef264` |

In light the four fills are the **800** of their hue and the four accents the
**700** — one scale step apart, enough to separate a fill from a mark on it and
close enough that the two never read as two colours. Info is BLUE, not indigo:
indigo read as purple on the light ground, and purple is not a status anyone
has been taught.

The callout has a second variant. **`variant="soft"`** is the same anatomy at a
tenth of the fill — `accent/10` wash, `accent/30` rim, icon in the accent, one
line with everything centred on it — for a standing condition that sits above
the work all day instead of announcing itself once. Its wash and rim are alphas
of the SAME accent the inline banner uses, so the two cannot drift. Its action
is `bannerSoftAction` (exported from `ui/banner`): a raised tile, white in light
and near-black in dark, because an outline button vanishes into a wash.

**Theme-independent palettes** (same in both modes): chart series `chart-1..5`
(`#fa6400`/`#3b82f6`/`#22c55e`/`#eab308`/`#8b5cf6`); board lane accents
`bg-fp-lane-*`; the pastel pairs behind `CodeDisc`.

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

## Strokes
**Three weights, three jobs.** In light:

| token | light | on `#ffffff` | job |
|---|---|---|---|
| `--fp-outline-1` | `#e2e5ea` | 1.26:1 | a card's own rim |
| `--border` (`--fp-stroke-hairline`) | `#d4d4d8` zinc/300 | 1.48:1 | a structural divider — page header, tab strip, table edge and row rules, sidebar edge |
| `--input` (`--fp-stroke-field`) · `--fp-outline-2` | `#c4c4c9` | 1.74:1 | a field's boundary, and the rim that has to beat a card's (hover / active) |

- **A field border does more work than a divider**, which is why they are not one
  value. In light an `Input` is `bg-transparent` — only dark gets `dark:bg-input/30`
  — so the border is the *only* thing that makes a field a field; a divider merely
  separates two things that exist anyway.
- **The hover rim must be darker than the resting rim.** `--fp-outline-2` was
  `#ededed` (1.17:1) against `--fp-outline-1`'s 1.26 — the "stronger" rim was the
  weaker one, and every Kanban card got *lighter* on hover. Any future retune keeps
  `outline-2` below `outline-1` on the contrast column above.
- **`--fp-stroke-field` and `--fp-outline-2` share a value and stay separate
  tokens** — the same discipline `--fp-lane` / `--fp-board-lane` follow. One is a
  field's only boundary, the other is a rim; retuning one must never drag the other.
- **`#c4c4c9` is deliberately off the Tailwind ramp.** The neutral ramps jump from
  ~1.48 at 300 to ~2.56 at 400, and a field border wants the gap between them. It
  keeps zinc's hue (B−R +5 vs zinc/300's +4) so the three read as one family.
- **Never raise a stroke to make something read.** If a boundary is not reading, the
  answer is nearly always spacing or a surface step, not a darker line.
- **3:1 is not reachable on this ramp.** WCAG 1.4.11 asks 3:1 for a control's
  boundary; on white that first happens at `#949494`. No neutral ramp value meets it
  — zinc/400 did not either. Closing it properly means giving inputs a *fill*, not a
  darker border.

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
- The **content layer** is `rounded-md bg-fp-surface-1b` with **no outer border and
  no shadow** — the ground beneath it is the tinted Surface Base in both themes, so
  it separates by value.
- Cards use `bg-card` (Surface 1a), which is **one step under the content layer**,
  not equal to it. It carries a `border-fp-outline-1` hairline as well, but the
  hairline is no longer doing the separating on its own.
- **Fields are filled, not transparent**, and they are filled `bg-fp-surface-1b` —
  a white well inside the tinted card they sit in. Transparent meant a field took
  whatever was behind it and could only be found by its border, which is why the
  field stroke kept being pushed darker and still measured 1.74:1.
- Inner cards step up to `bg-fp-card-1`.
- **A board lane's ground is `bg-fp-board-lane`** — one token, every board (the DS
  Kanban and the 3PL brokerage board both take it, so they move together). It is
  *not* `bg-accent`: `--accent` is the control-emphasis family (the fill behind a
  selected menu item), and a lane that borrows it moves whenever selection is
  retuned. Light resolves to `--fp-card-2`; measured, that is an 11/255 step under
  the content layer and 11/255 above the white cards on it — the lane reads as a
  column, and a card is still the lightest thing in it.
- **A board lane is not a row band.** `--fp-lane` is the fill behind a *grouped
  table's* header row; `--fp-board-lane` is the fill behind a *board column*. They
  stay two tokens even when they resolve to the same value, so retuning one never
  drags the other.
- **A table header needs its own ground in light** (`bg-fp-table-header`). Dark
  gets it from the panel fill; in light the layer and the header are both `#ffffff`
  and a header that is only a hairline stops being a header the moment the first
  row has one too.
- **Nothing in the shell casts a shadow** — not the rail, not the drawer, not the
  content layer. `shadow-fp-surface` is for things that genuinely float *over*
  content: a hovered card, a popover.
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

## 10. Lists — a control belongs to the view it acts on

Added 2026-09-16, from the 3PL orders toolbar. Enforced in `ListToolbar`, so
every screen that uses it inherits the rule rather than restating it.

- **Search by column and Show/Hide columns render only in TABLE view.** Both
  name something the reader can see — a header to type under, a column to take
  away. A board shows cards and a map shows pins; neither has a column on
  screen, so the controls were pointing at nothing.
- **A control does not quietly change its subject to stay useful.** The orders
  board had Show/Hide columns re-aiming itself at the *card's units* when the
  board was active: one icon, two meanings, and no way to tell from the icon
  which one was live. Hide the control instead. If the other view needs the
  same kind of choice, it gets its own control, named for its own subject.
- **The other view usually does need it, so give it its own.** The orders board
  has **Card fields** (`ListToolbarProps.cardFields`) — same slot, own icon, own
  heading, board only. Two controls each with one subject, never one control
  with two. A card's units nest one level, because a card is a heading with
  lines under it rather than a flat row, and they carry no ordering: the order
  is the card's design.
- **The same test for anything else in a list's toolbar.** Group By already
  follows it — off on the board, because a board is already grouped, by lane
  (`ListToolbarProps.showGroupBy`). Ask what the control acts on; if the current
  view does not show that thing, the control is not offered.
- **Not a disabled state.** A control that is on screen and does nothing teaches
  people to stop reaching for it. It goes away and comes back with its view.

### Presets before views, in the view bar

Added 2026-09-16. Enforced in `FuelOrdersViewBar`, shared by every list that has
saved views.

- **Business presets come first, then a rule, then Default and the saved views.**
  They are two kinds of thing in one row: a preset is *which business this is* —
  a fact about the work, true before anyone opened the screen — and a view is a
  narrowing somebody **made** and can rename, update or delete. Ordering the
  facts first and ruling them off says which half of the row you are in.
- **Default keeps the underline at rest**, and sits immediately after the rule.
- **A preset and a saved view are mutually exclusive.** Only one tab in the row
  is ever underlined, so picking a business drops the active view and applying a
  view drops the business. A saved view does not capture the business — there is
  no field for it in the captured state — so the two cannot both be true and
  only one can be shown.

---

## 10b. The DS ships hues; the application binds meaning

Added 2026-09-18. The DS already says a chip renders neutral until a usage rule
binds a colour to a meaning (§9). This is the other half of it: **where that
binding is written down.**

- **Every application keeps ONE colour-mapping table**, in its own docs, listing
  each hue against the single thing it means there. Lane fills, code-disc tones,
  status-chip channels, pastel badges — all of it, in one place, so a hue cannot
  come to mean two things in two modules of the same product.
- **A mapping is a decision, not an inheritance.** `--fp-lane-green` is a green,
  not a "done" green; if two modules both need a terminal lane they should agree
  because the table says so, not because both authors reached for the same
  swatch.
- **Four tone channels, and a lifecycle longer than four shares them.** That is
  allowed and is not a defect — the label always says which stage it is, so
  colour is never the only carrier. What is NOT allowed is two stages sharing a
  channel when one of them is the exception: the failure channel belongs to the
  one state where something has gone wrong.
- **A count of one meaning is a badge nobody needs.** "Normal" priority, a
  status that repeats its own lane heading, a placing on a board of one — if
  every row carries the same chip, the chip says nothing. Render the absence.

## 11. A status is its word

Added 2026-09-17, from the 3PL vendor table. Enforced in `StatusChip`.

- **No dot beside a status label.** `text` (now the default) colours the label
  itself and `soft` tints the whole pill, so in both the dot repeated a tone the
  chip was already carrying and spent 12px of a control whose whole job is to be
  small. The word is the status; the colour is a second channel on the same
  word, not a third element beside it.
- **The dot is asked for by name, never arrived at.** `variant="dot"` still
  exists, for the one case where the dot IS the tone — a dense grid where the
  label stays neutral and a column of coloured words would shout. It is opt-in:
  nothing renders a dot unless a call site names that variant.
- **The general form of the rule: nothing is added to a status that the status
  was not asked for.** Same test as §10 — a control or an ornament that repeats
  what is already on screen is not neutral, it costs room and reading. If a
  status needs more emphasis, change the treatment it is rendered in rather than
  hanging something off it.


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
- **Give a board lane `bg-fp-board-lane`** — the one token every board shares.
- **Give a table header `bg-fp-table-header`** so it survives light mode.
- **Pick the stroke by its job** — card rim `--fp-outline-1`, divider `--border`,
  field boundary and hover rim `--input` / `--fp-outline-2`.
- **Keep the hover rim darker than the resting rim.**

## Don't
- **Don't hardcode hex** (`bg-[#fa6400]`) — use `bg-brand`.
- **Don't use `bg-brand` as the default CTA** — it's a special accent.
- **Don't use a saturated status fill** where a soft tint belongs.
- **Don't put an outer border on the content layer.**
- **Don't use arbitrary radii** (`rounded-[5px]`).
- **Don't add Tabler/Hugeicons/Phosphor/Remix/emoji.**
- **Don't trace a light/foreign mock** — re-map to FP tokens.
- **Don't paint a board lane with `bg-accent`** — that is control emphasis, not a
  surface, and the lane will move the next time selection is retuned.
- **Don't point a board lane at `--fp-lane`** — that is the grouped-table band;
  moving it drags every group header in the app.
- **Don't darken the hairline to make a boundary read** — reach for spacing or a
  surface step first. A divider is a separation, not a rule.
- **Don't give a field the divider's weight** — in light the border is the only
  thing that makes a field a field.


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
- [ ] Surfaces layer correctly (ground → drawer → content, with cards and fields a step *under* the content layer; global top bar on `bg-background`). Nothing in the shell casts a shadow; the content layer has no outer border.
- [ ] Hover and selected use different tokens — `--accent` for *the pointer is here*, `--selected` for *this is the one*. They must never resolve to the same fill.
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
| ~~`--background`~~ | ~~`--card`, `--popover`, `--fp-surface-1a`, `--fp-surface-1b`~~ | Light — **resolved 2026-09-11**: `--background` went back to the tinted Surface Base (`#efefeb`), and `--fp-surface-1a` (and so `--card`) moved to the inner-panel step `#f4f5f8`. Only `--popover`/`--fp-surface-1b` are still white together, which is correct — a popover IS the content layer, lifted. |
| `--accent` | `--selected` | **FP-dark, both `#2a2f37`.** Deliberate: dark selects in grey, and the grey it selects in is the raised-surface step. They differ by what carries them — a hover is transient, a selection persists and takes `--selected-foreground` as well — but a fill that has to read as *chosen* against a *hovered* neighbour cannot rely on the fill alone in this theme. |
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
  /* THE GROUND IS WARM, AND EVERYTHING ON IT IS COOL. That is a deliberate
     pairing, not a mismatch: the content layer, the card steps and the strokes
     are all blue-leaning, so a ground from the same family sat at the same
     temperature as the work and the page had one note. #efefeb is a warm grey
     underneath cool paper — the ground reads as a surface the work is LAID ON
     rather than as more of the work.

     It was tried the other way (#f3f4f7, the cool version of the same
     lightness) and the whole shell flattened. The temperature is doing the
     separating that the 12/255 of lightness cannot, which is also why the
     tier-2 drawer beside it can be a near-white and still read as its own
     panel. */
  --fp-surface-base: #efefeb; /* the app ground */
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
  /* THE TIER-2 DRAWER SITS ABOVE THE GROUND, WITH THE WORK — a shade off the
     #ffffff content layer beside it and up from the #efefeb ground both panels
     sit on, so the drawer and the work read as one raised pair with a gap
     between them rather than as a panel pushed behind the page.

     IT IS A DELIBERATELY QUIET EDGE, and measuring it as a contrast problem
     gets the wrong answer. Three surfaces meet here and two are fixed 12/255
     apart, so anything that fits between them measures ~1.04:1 against the
     content layer — which is exactly the point: the drawer is meant to belong
     to the content layer, not to stand off from it. A grey that separates
     properly (#e5e9f0, 1.11:1 off the ground, matching dark's own middle rung)
     was tried and reads as a heavy slab beside white; light's ladder is
     compressed at the top and the honest response is to let this join rather
     than to force a step.

     It is the same value `--drawer` carries, and not aliased to it: in DARK
     the two part company (#11161d against #292929), so one following the other
     would be true in exactly half the app. */
  --sidebar: #fafbf8;
  /* THE SECTION MARK IS A QUIET TILE, not a second logo. Orange put the
     brand in two places at once — the product mark in the top bar and again
     24px below it in the drawer — and the drawer one was the louder of the
     two while naming only the section you happen to be in. The brand belongs
     to the product, not to "Orders". It takes a card step instead: visible as
     a mark, silent as a colour.

     ONE STEP AWAY FROM THE DRAWER, whichever way that falls. The distance is
     the rule, not the direction — and not the rung either, because the two
     ladders are not mirror images. On this near-white drawer light goes DOWN a
     card step (--fp-card-2, #f4f5f8); dark goes UP one (--fp-card-1, #2a2f37,
     over its near-black drawer). It has moved with `--sidebar` every time
     `--sidebar` moved; this is the pair to re-measure whenever it does. */
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
  /* The rung differs again now that light's drawer is a grey: light's mark is
     the content layer, dark's is the raised card above its near-black drawer. */
  --sidebar-primary: var(--fp-card-1);
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
- **A SIDE SHEET WITH EDITABLE FIELDS AUTOSAVES. Always, and whether it is
  creating or editing.** This is the default, not a choice per sheet. A reader
  who has to remember to press Save is a reader who loses work, and a record
  that is half-filled is still worth keeping — a service call somebody started
  typing and abandoned is a service call, and the next person can finish it.
  Three consequences, and all three are part of the rule:
  - **Say it out loud.** `useDraftSaveState` + `DraftStatusChip` beside the
    title: `saving` while a change settles, `saved` once it has, nothing at all
    before the first keystroke. A sheet that keeps a draft silently is one
    people behave as though it does not — they finish fields they meant to
    return to, and they hesitate to close. The feedback IS the feature.
  - **Cancel comes off.** "Cancel" promises to undo, and a sheet that has
    already kept everything typed cannot keep that promise. Close is the honest
    exit.
  - **There is no Save button, and no `Update`.** The footer's primary is the
    NEXT ACT on the record — the one thing that moves it on from where it is.
    A primary that says "Update" on a sheet that has already updated is a
    button for a job that is done.
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
- **`xxwide` is 1440px, and it exists for exactly one shape: a step that is TWO
  COLUMNS** — what you fill in on the left, what that makes on the right. A
  sheet does not get this size for being long; it gets it for being split. The
  rail costs the left column 340px plus a 24px gap, and at `xwide` that comes
  straight out of table columns already at their minimum.
- **THE TWO-COLUMN SHEET, AND THE ONE RULE THAT DECIDES A CARD'S SIDE: can you
  type into it?** Editable sections go left, in the sequence you fill them.
  What the record HAS BECOME goes right — derived, read-only, true whether or
  not anyone is looking. Once an editable number and a computed one share a
  column they look identical and the reader stops knowing which is which.
  - The rail is `<aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">`
    inside `grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]`.
  - **It stays put while the form scrolls.** The rail answers questions the
    reader has while looking at ANY part of the form; scrolled away with the
    sections it describes, a total is only visible next to the tables that
    produce it, which is where it is least needed.
  - It folds to one column below `lg`, where a 340px rail beside a form is two
    columns of nothing.
- **THE FOOTER HAS THREE SLOTS, and each answers a different question.**
  - `footerBanner` — a fixed strip spanning the sheet, directly above the
    footer: **what the primary is waiting on.** The reason a button is dead
    belongs beside it, and beside it there is room for a clause, not a list.
  - `footerAside` — decisions taken at the moment of committing (flags, the
    second outcome of the same act). They stay in view however far the body has
    scrolled.
  - `footerPrimary` — **the next act, and only ever one.**
- **THE PRIMARY IS A LADDER, NOT A SAVE.** Whatever the stage, it names the ONE
  thing that moves the record on from where it is, and it changes as the record
  does. Two consequences:
  - **The label is the ACT, never the state.** "Waiting on partners" on a
    button asks the reader to press a fact. What has not happened yet goes in
    the banner or the tooltip; the button says what pressing it does.
  - **A rung that cannot be taken is disabled, and says why on the press** —
    see the interactions rules on the disabled primary. A clause standing
    permanently beside the button is a sentence read on every visit, including
    the ones where nothing is wrong.
- **WHAT THE RECORD IS MISSING GETS A STRIP, NOT A LIST.** `MandatoryStepsBanner`
  in `footerBanner`: one outstanding item at a time, with a counter and chevrons
  to step through them, so three missing fields cost one line rather than three.
  Each label is the INSTRUCTION — "Choose a customer", not "Customer" — because
  the reader is being told what to do, not what they are looking at. When
  nothing is outstanding it says so, in the success channel, rather than
  disappearing: an empty strip and a satisfied one are different states.
  An exception that STOPS the work (a hold, a credit block) takes the strip
  instead — it is the thing the reader has to act on, and the fields wait
  behind it.
- **The strip under the header is a STAGE BAR, not a stepper.** `StageBar` —
  one line of chevrons, three tones (behind / here / ahead) and a fourth only
  for a terminal exit. A stepper is a form split into parts you move between; a
  stage bar is a statement about the record that the reader does not author.
  Steps are numbered because you take them in order; stages are not, because the
  record takes them and you are watching. The one place everybody looks first
  must carry the fact everybody opens the record to learn — how far along is
  this — and not a table of contents. It scrolls rather than shrinks: a stage
  cut to four characters is worse than one you scroll to, and a chevron clipped
  mid-word says "there is more" without a scrollbar — which is the app-wide
  rule: **no scroller anywhere shows a bar, on either axis.** A single visible
  one teaches the reader that the absence of a bar means "this does not
  scroll". It may also be the navigation, where a stage has a screen its work
  is done on.
- **A section is a CARD.** `SheetSection` draws a bordered block with its title
  in a tinted header band, and that is the default — `variant="plain"` (heading
  over fields, no box) is the exception, for a sheet that is one continuous list
  rather than a set of groups. A sheet is a stack of questions about different
  things, and gaps alone were carrying the whole job of saying where one subject
  ended and the next began: at 40px they did it only while nothing in a section
  grew, and a section holding a table or a five-row picker swallowed the
  boundary. The border says it at any length. The title moves into the band
  because a heading inside a bordered block that shares the block's fill reads
  as the first row of content rather than as the name of what follows.
  **`shrink-0` is load-bearing on the card** — the sheet body is a flex column
  and `overflow-hidden` switches a flex item's automatic minimum size from its
  content to zero, so without it the whole card collapses to its 2px of border.
- **Section rhythm — 40 / 16.** Sections sit **40px** apart (the sheet body's own
  gap); on the `plain` variant a section's title sits **16px** from its content.
  The card variant needs neither number — the band's own edge is the separation
  — but the 40 between cards is unchanged.
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
- **A table header has its own ground** — `bg-fp-table-header`, never
  `bg-fp-surface-1a`. In dark the inner panel already differs from the content
  layer so the header read; in light both are `#ffffff` and the header row had
  nothing but its hairline, and a header that is only a line stops being a header
  the moment the first row has a line too. The token is the faintest step the DS
  owns (`--fp-card-3`, #fafafa in light) and it sits ABOVE the row hover
  (`--fp-card-2`, #f4f5f8), so hovering a row still darkens against the header
  rather than matching it. Totals rows in a `tfoot` take the same fill: they are
  the header's counterpart at the other end.
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
- **A DIRECTORY RECORD IS A SIDE SHEET, AND THE SHEET IS THE FORM.** `RecordSheet`
  is the container; `mode` decides whether the header reads Edit or Create; the
  body carries the fields; the footer carries Cancel + Save Changes. There is **no
  separate read-only detail page with an editor beside it** — that is two patterns
  doing one job, and both of them take the list off screen, which is the thing a
  sheet exists to prevent.
  - Size by CONTENT, not by record: `narrow` (560) for stacked fields, `wide` (864)
    when the sheet carries tables — at 560 a table has to be scrolled sideways, and
    a table you scroll to read is one you cannot compare rows in. `xwide` (1120) per
    *step*, not per sheet.
  - **Related records live in the same scroll**, as `SheetSection`s under the
    editable ones. Section rhythm is **40 / 16**, measured from the title's own line.
  - **Things that OPEN rather than change** — a history, a preview — go in the
    sheet's `headerActions` slot, left of Close, so they neither scroll away nor
    get mistaken for part of the form.
- **Full-page form** (not a modal) remains right for a *flow* rather than a record —
  something with steps, or with no list behind it to return to. Modals stay reserved
  for short, single-purpose tasks.
- **Form validation contract** (identical everywhere): nothing is red until the
  field has been left; after a failed submit everything validates live; a failed
  submit **keeps every character** and focuses the first problem; cancelling with
  changes confirms, cancelling without them does not. Mark **both** required and
  optional — marking one makes the reader infer the other, and on a long form the
  inference is wrong often enough to matter.
- **A FIELD STARTS WITH A CAPITAL, and nothing lies about the value to get it.**
  Three layers, each doing the part it can honestly do:
  - `Input` and `Textarea` set **`autoCapitalize="sentences"`** by default. It
    changes what a soft keyboard offers, so what is stored is what the reader
    saw. `email`, `url`, `password`, `tel`, `number` and any numeric `inputMode`
    get `none` — those are case-carrying or have no letters.
  - The **form normalises the first character on BLUR**, never while typing: a
    field that rewrites itself mid-keystroke is a field people fight. Typed text
    only (`text`, `tel`, `textarea`); never email, url, number, money or date;
    never a chosen value.
  - **Only the first character, once.** `text-transform: capitalize` uppercases
    every word — it turns "Bray, Raymond and Marks" into "…And Marks" and a
    street into title case.
- **A raw enum is not a label.** A stored `active` shows as `Active`; the value
  stays lowercase. Capitalise it where it is rendered, not in the data — and
  never with a CSS transform on a list of values that already carry their own
  case ("Net 30").
- **A set that is known but not closed gets a creatable combobox** (`allowCreate`),
  not a locked select and not a bare text input. A locked list sends the real answer
  into a notes field where nothing can filter it; a text input gives ten spellings
  of the same thing.
- **A toggle is a statement and an answer, not a field with a control under it.**
  Label left on the labels' own edge, switch hard right against the container edge,
  helper text under the label. Full width. Stacked like an input it leaves a 20px
  control alone on a line with a hole beside it.

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

### 4c. Pagination, columns and the list's own numbers
- **`TablePagination` ships its own page sizes and its own footer copy. Use them.**
  Overriding either makes one screen count differently from every other, and the
  reader has to re-learn the footer per list.
- **Pagination and grouping are exclusive.** While grouped, the list scrolls whole
  and `GroupedListFooter` reports its *shape* — at 25 rows a page a group straddles
  the boundary and its header claims a count for rows that are not on screen. Both
  footers keep the same left/centre/right skeleton so the bottom of the screen does
  not jump when grouping turns on.
- **Every column moves and resizes** — drag the header to reorder, drag the divider
  to resize, double-click to reset, arrows to nudge. Both marks appear on hover of
  *that* column only, and the two gestures are mutually exclusive.
- **A list total belongs beside the page title, not under the footer.** It is a fact
  about the whole list; under the footer it reads as a property of the current page
  and sits at the bottom of a screen somebody has to scroll to reach. It follows the
  *filtered* rows.
- **Active filters are said out loud** as chips with a Clear all, above the table.
  The facet panel remembers what was picked but it is closed, and a quietly narrowed
  list is the most common way people conclude their data is missing.
- **Three empty states, not one**: nothing here yet / nothing matches your search /
  nothing matches these filters. Three different situations, three different next
  actions, and one shared sentence fits none of them.
- **Loading is skeleton rows, never a spinner** — a list that collapses to a spinner
  loses its own height and the page jumps when the rows land.
- **Two kinds of missing value, and both are printed.** `–` means the field applies
  and nobody filled it in; `N/A` means it does not apply. A cell that goes blank
  makes an incomplete record look finished.

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

## 7b. A dead control says why on the press

Added 2026-09-18, from the service order sheet.

- **The reason belongs to the press, not to the layout.** A clause standing
  permanently beside a disabled primary is a sentence the reader reads on every
  visit, including the ones where nothing is wrong — and at the foot of a long
  form it reads as part of the button's label.
- **So: disable the control, and hang a `Tooltip` off it carrying the reason.**
  One sentence, in the imperative — "Choose a technician before proceeding."
- **A disabled control fires no pointer events**, so the trigger has to be a
  wrapper (`<span tabIndex={0}>` with the button `pointer-events-none` inside),
  or the tooltip never opens on the one state it exists for. This is a
  mechanism, not a preference: getting it wrong silently deletes the feedback.
- **The banner and the tooltip are not the same thing.** The banner lists what
  the record is missing and can be stepped through; the tooltip is the one
  sentence about the press that just happened.

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

### 8.1b The board as built — amends 8.1

From the 3PL and Service Work boards. Where this contradicts 8.1, this wins.

- **NO DRAG BETWEEN LANES.** A stage change here is a workflow act with side
  effects — mail leaves the building, an accounting push happens — not a
  reorder. Dragging a card into the next lane would have to mean "do that on
  somebody's behalf", which is a decision, not a gesture. Stages change from
  the record's own next-act control.
- **A LANE THAT IS NOT A STEP SITS APART**, behind a 3px rule, not in sequence
  and not in a tinted tray: Cancelled, Blocked. A lane that is a normal thing
  for work to be doing — waiting on a part — stays in sequence.
- **A CARD IS RULED UNITS**, not a property grid. Each unit is one heading and
  one shape, divided from the next by a rule, and three shapes cover every
  unit: `stack` (lines at three levels), `inline` (short values, hairline
  split), `rows` (a small table). Inside a unit there are NO field labels —
  the heading names the unit and weight carries the rest.
- **A HEADING WITH NOTHING UNDER IT IS NOT A UNIT.** Switching off every line
  inside one must remove the heading too, or it reads as a failure to load.
- **THE CARD'S FIELD SET IS PER LANE.** A card is not one design repeated eight
  times: what a card in the first lane should say is not what one in the last
  should. The Card fields menu carries a scope control ABOVE the ticks it
  governs — "All lanes" or one lane — because it changes what every tick under
  it means. On All lanes a field reads as ON only when it is on in every lane,
  and one press makes it the same everywhere. **A lane is only offered the
  fields it can draw**: a switch that does nothing is worse than a shorter menu.
- **AN ALERT ON EVERY CARD IS A BORDER.** Only a card with something
  outstanding gets one.
- **LANE SORT IS PER LANE, AND ONE OPTION MAY BELONG TO THE LANE.** What is
  worth ordering the first lane by is not what is worth ordering the last by.
- **THE BOARD IS NOT PAGED**, so it gets a total instead of pagination — and
  the total states its scope, because a number with no window is one nobody can
  check.

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

**SUPERSEDED IN PART (§1).** The old split — read-with-light-edit → overlay,
substantive create/edit → full page — was tried on the Directory and reverted. A
directory record is substantive *and* belongs in the sheet: the sheet IS the form,
and a full page for it meant a second pattern for one job with the list gone from
behind it. Keep the full page for a **flow** (steps, or nothing to return to), not
for a record. §1 is canonical; this section's structure notes still apply.

**Audit history is a drawer, not a section.** It is the longest block on a record
and the one read least often; at the foot of the body it pushes everything the
sheet was opened FOR behind a wall of "field changed" lines. Icon in the header,
420px drawer stacked over the record, no footer — reading a history is not editing
anything.

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
- **Open a directory record in a side sheet, and let the sheet be the form** (§1).
- **Size a sheet by its content** — `wide` the moment it carries a table (§1).
- **Put a toggle's label left and its switch hard right**, helper under the label (§1).
- **Use a creatable combobox for a set that is known but not closed** (§1).
- **Let a field start with a capital** — `autoCapitalize` plus a first-character
  fix on blur (§1).
- **Render a stored enum in sentence case**, leaving the value alone (§1).
- **Keep `TablePagination`'s own page sizes and footer copy** (§4c).
- **Put a list's total beside the page title**, following the filtered rows (§4c).
- **Show active filters as chips with a Clear all** (§4c).
- **Write three empty states** — nothing yet / no search match / no filter match (§4c).
- **Load a list with skeleton rows**, never a spinner (§4c).
- **Print both `–` and `N/A`** — a blank cell hides an unfinished record (§4c).
- **Put the audit history behind a header icon**, in its own drawer (§8.4).
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
- **Don't hand-roll a `<TableHead>`.** `TableColumnHeader` + `useTableColumns`
  is how a table gets moving and resizing columns, and it is the default —
  a table without them is a table whose columns the reader may not arrange
  (`ux/2-rules`).
- **Don't make hiding a column the only way to move one.** Headers drag, and
  ⌘/Ctrl + ← → moves a focused one (`ux/2-rules`).
- **Don't hang two gestures off one target.** The divider resizes; the header
  moves. Different cursors, so the pointer says which before the press
  (`ux/2-rules`).
- **Don't confirm an empty removal.** Ask before erasing filled rows; close an
  untouched section without a dialog (`ux/2-rules`).
- **Don't put a bin on a section heading.** Turning an optional section off is a
  minus — nothing is destroyed and one click brings it back (`ux/2-rules`).
- **Don't give a section heading a minimum height.** The 16 is measured from the
  title's own line; a padded row renders it as 20, and 22 once the heading
  carries an action (`ux/2-rules`).
- **Don't build a full-page detail with a separate editor beside it** — one sheet
  does both, and a page takes the list off screen (§1).
- **Don't override a table's page sizes or footer copy** — one list that counts
  differently is one list everybody has to re-read (§4c).
- **Don't paginate a grouped list** — a group straddling the boundary claims a
  count for rows that are not on screen (§4c).
- **Don't leave a filtered list unlabelled** — a quietly narrowed list reads as
  missing data (§4c).
- **Don't stack a toggle like an input** — it leaves a lone 20px control with a
  hole beside it (§1).
- **Don't capitalise an email, a URL or a password** — they carry case, and a
  silent edit there is a bounced invoice or a failed login (§1).
- **Don't use `text-transform: capitalize` on typed text** — it title-cases every
  word, not the first one (§1).
- **Don't rewrite a field while somebody is typing in it** — normalise on blur (§1).
- **Don't put the audit history at the foot of a record body** — it buries
  everything the record was opened for (§8.4).


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
- **A silently draggable header** — ❌ columns move but nothing on screen says so · ✅ `ColumnMoveGrip` in the header, `ColumnResizeHandle` on the divider, each revealed on hover (`ux/2-rules`).
- **A white-on-white header** — ❌ `bg-fp-surface-1a` on a `thead`, which is the content layer's own colour in light · ✅ `bg-fp-table-header` (`ux/2-rules`).
- **A bare `<TableHead>`** — ❌ a new table whose columns cannot be moved or resized, indistinguishable from one that must not be · ✅ `TableColumnHeader` + `useTableColumns` (`ux/2-rules`).
- **Every divider lit at once** — ❌ hovering the header row draws eleven resize marks, so the row reads as a grid · ✅ each mark lights with its own header (`ux/2-rules`).
- **Two marks at once** — ❌ the move grip and the resize handle both showing on one hovered header · ✅ the grip is the handle's peer and steps aside on the divider (`ux/2-rules`).
- **One target, two gestures** — ❌ the divider both resizes and reorders, so a widen becomes a reorder · ✅ divider resizes (`col-resize`), header moves (`grab`) (`ux/2-rules`).
- **A frozen column order** — ❌ the schema's order is the reader's, so comparing two columns means hiding the six between them · ✅ `useColumnOrder` on the headers, order saved with the view (`ux/2-rules`).
- **Confirming nothing** — ❌ "are you sure?" over a section whose table is still a row of blanks · ✅ `hasContent` decides whether the dialog appears (`ux/2-rules`).
- **A bin on a section heading** — ❌ `<Trash2>` to turn an optional section off, next to the bins that delete table rows · ✅ `SheetSectionRemove`, a minus (`ux/2-rules`).
- **A padded heading row** — ❌ a `min-h` on the section title so a 16px gap renders as 20, and 22 once the heading carries a button · ✅ the row is the title's own line and a taller action hangs off it (`ux/2-rules`).


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

> **Correction, later than this sync — `--border` / `--input` are now `#d4d4d8` (zinc/300).**
> The sync's zinc/400 (`#a1a1aa`) is a mid grey rather than a hairline: measured against
> the `#ffffff` content layer it is **2.56:1**, roughly 5× the weight of `--fp-outline-1`,
> and one value was carrying both the structural divider and the field border. Dividers
> read as hard rules. zinc/300 measures **1.48:1**. The rows below record what the sync
> did; the primitives in `index.css` are the current truth.

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

