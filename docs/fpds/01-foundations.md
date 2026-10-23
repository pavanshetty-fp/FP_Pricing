# FPDS · 01 Foundations

`layer: foundation` · `code: src/index.css · src/components/theme/a11y.ts · prototypes/unified-view/statusKind.ts · src/components/ui/term-icons.tsx`

The values every atom, molecule and unit is built from. **Code is the source of
truth**: every value below is read from `src/index.css` (and `a11y.ts` for the
Accessibility panel). If this page and the CSS disagree, the CSS wins and this
page is wrong. Older docs (`docs/ds/ui/1-fundamentals.md`) still list some
pre-2026-10-21 dark values; the dark column here is the current one.

**How to use a token.** Always by its Tailwind utility (`bg-card`,
`text-muted-foreground`, `border-fp-outline-1`, `bg-fp-board-lane`). Never a hex,
never `rgb()`, never an arbitrary `[#…]` value. Opacity modifiers on a token are
fine (`bg-status-success/10`, `border-foreground/25`).

**Themes.** Light is `:root`; Dark is `<html class="dark">`. The Accessibility
panel then mixes each token toward two further points per theme — **WCAG**
(`.wcag:not(.dark)`, `.dark.wcag`) and **Maximum** (`.a11y-max:not(.dark)`,
`.dark.a11y-max`). Light / Dark is chosen in that panel (no header theme icon).

---

## 1. Color — two layers

**Layer 1 — primitives** (`--fp-ink-*`, `--fp-surface-*`, `--fp-card-*`,
`--fp-outline-*`, `--fp-stroke-*`, `--fp-emphasis*`, `--fp-selected*`,
`--fp-danger`, `--fp-shell-*`, `--fp-lane-*`). The only place a color literal is
written. **Layer 2 — semantics** (`--background`, `--card`, `--selected`,
`--border`, …) alias primitives and carry no literals of their own. Build with
Layer 2 wherever a semantic exists; reach for a primitive utility
(`bg-fp-card-1`, `border-fp-outline-2`) only where the DS itself does.

### 1.1 Surfaces and layers

| Utility | Token | Light | Dark | Means / use |
|---|---|---|---|---|
| `bg-background` · `bg-rail` · `bg-fp-surface-base` | `--background` → `--fp-surface-base` | `#efefeb` | `#07080a` | The app ground. Warm gray under cool paper in light — the temperature does the separating. The rail is the ground and disappears into it |
| `bg-fp-shell-ground` | `--fp-shell-ground` | `#f2f2f2` | `#07080a` | The ground the whole app sits on, top bar included (the top bar has no fill of its own) |
| `bg-fp-shell-panel` | `--fp-shell-panel` | `#fbfbfb` | `#23282f` | The navigation's box |
| `bg-fp-shell-selected` | `--fp-shell-selected` | `#f1f0ec` | `#2e343e` | The selected page in the nav |
| `bg-fp-surface-1b` | `--fp-surface-1b` | `#ffffff` | `#1d222a` | **The content layer**, and the fill inside every field (fields are white wells) |
| `bg-popover` | `--popover` → surface-1b | `#ffffff` | `#1d222a` | Anything that floats: menus, popovers, dialogs, sheets, toasts |
| `bg-card` · `bg-fp-surface-1a` | `--card` → `--fp-surface-1a` | `#f4f5f8` | `#272c35` | Card / inner panel — one step under the content layer |
| `bg-drawer` | `--drawer` | `#fafbf8` | `#272c35` | Tier-2 drawer (two-layer nav only) |
| `bg-sidebar` | `--sidebar` | `#fafbf8` | `#181c22` | Sidebar surface. Deliberately a quiet edge in light |
| `bg-fp-card-1` | `--fp-card-1` | `#e9ecf1` | `#2e343e` | Raised inner card, inset block, pressed tint |
| `bg-fp-card-2` (via `--muted` in dark) | `--fp-card-2` | `#f4f5f8` | `#23282f` | The quieter card step |
| `--fp-card-3` | `--fp-card-3` | `#fafafa` | `#21262d` | The faintest step |
| `bg-fp-board-lane` | `--fp-board-lane` | `#e9ecf1` (card-1) | `#07080a` (ground) | **Board lane ground — one token, every board.** Light darkened one step on 2026-10-22 for washed-out monitors; in dark the lane is a well, so cards sit lighter on it |
| `bg-fp-lane` | `--fp-lane` | `#f4f5f8` | `#2e343e` | Band behind a **grouped table's** header row. Not a board lane |
| `bg-fp-table-header` | `--fp-table-header` | `#fafafa` | `#23282f` | Every table header row; also the hanging add and the selected pagination page |
| `bg-fp-row-hover` | `--fp-row-hover` | `#f4f5f8` | `#252a32` | Table row hover. Differs from the header on purpose |
| `bg-fp-row-selected` | `--fp-row-selected` → `--selected` | `#fee8d9` | `#2e343e` | A ticked row |
| `.fp-sorted-cell` | mix of row hover 55% | — | — | Cells of the sorted column (half the row hover) |
| `bg-chip` | `--chip` | `#efefeb` | `#2e343e` | Chip fill, active view icon, sorted header (`th[aria-sort]`) |
| `bg-muted` | `--muted` | `#f4f4f5` | `#23282f` | Neutral pill tint, removable chips, the on state of segment controls |
| `bg-secondary` | `--secondary` | `#f4f4f5` | `#2e343e` | Secondary button fill |
| `bg-fp-field-fill` / `-hover` | `--fp-field-fill` | `#c4c4c9` @30% / 50% | `#474f5b` @30% / 50% | Dark-theme fill of fields and outline buttons (`dark:bg-fp-field-fill`) |
| `bg-fp-switch-track` | `--fp-switch-track` | `#c4c4c9` | `#474f5b` @80% | A switch's off track |

**Dark frame** (Accessibility, light theme, Contrast ≥ 80): `--fp-frame-ground #232327`, `--fp-frame-selected #2b2b31`, `--fp-frame-ink #ffffff`, `--fp-frame-ink-muted #d0d4d9`, `--fp-frame-rim #55555e`. Anything new that sits straight on the ground carries `data-fp-on-frame`.

### 1.2 Ink (text)

| Utility | Token | Light | Dark | Use |
|---|---|---|---|---|
| `text-foreground` | `--foreground` → `--fp-ink-1` | `#030405` | `#e8eaed` | Body text, values, the row's own thing |
| `text-secondary-foreground` · `text-accent-foreground` | `--fp-ink-2` | `#090c0f` | `#e8eaed` | Text on an emphasis fill |
| `text-muted-foreground` | `--fp-ink-3` | `#596475` | `#a0a7b0` | Labels, secondary values, placeholders, sub-lines, muted icons |
| `text-primary-foreground` | `--fp-ink-inverse` | `#f0f2f5` | `#0f1216` | Text on the primary fill |
| `text-brand` | `--fp-brand-ink` | `#fa6400` | `#fa6400` | Orange TEXT only — Contrast can darken it while the brand fill stays |

### 1.3 Strokes and outlines — three weights, three jobs

| Utility | Token | Light | Dark | Job |
|---|---|---|---|---|
| `border-fp-outline-1` | `--fp-outline-1` | `#e2e5ea` (1.26:1) | `#3d4550` | **A card's own rim.** Not negotiable per component |
| `border-border` (default `*` border) | `--border` → `--fp-stroke-hairline` | `#d4d4d8` (1.48:1) | `#343b45` | Structural divider: page header, tab strip, table edge and row rules, sidebar edge, separators |
| `border-input` | `--input` → `--fp-stroke-field` | `#c4c4c9` (1.74:1) | `#474f5b` | **A field's boundary** (inputs, selects, outline buttons, checkboxes, radios) |
| `border-fp-outline-2` | `--fp-outline-2` | `#c4c4c9` | `#555e6b` | The hover / active rim that must beat a card's rim |
| `border-sidebar-border` | `--sidebar-border` | hairline | `#ffffff` @7% (`#ffffff12`) | Sidebar edge |
| `--fp-shell-rim` · `--fp-shell-guide` | | `#e5e3e1` · `#e6e4e2` | `#555e6b` · `#555e6b` | Nav box rim · the guide line down a module's pages |
| `--fp-shell-marker` | | `#3a7760` | `#6fbf9f` | Green marker on the guide line beside the current page |

### 1.4 Brand = selection, focus

| Utility | Token | Light | Dark | Means |
|---|---|---|---|---|
| `bg-brand` · `text-brand-foreground` | `--brand` · `--brand-foreground` | `#fa6400` · `#ffffff` | same | The product mark, brand moments, the module-switch progress bar. **Not the CTA** |
| `bg-primary` · `text-primary-foreground` | `--primary` | `#090c0f` · `#f0f2f5` | `#f1f3f5` · `#0f1216` | **The default CTA** — neutral near-black / near-white |
| `ring-ring` · `border-ring` | `--ring` → `--brand` | `#fa6400` | `#fa6400` | Focus ring — always `focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50` |
| `bg-selected` | `--selected` → `--fp-selected` | `#fee8d9` (brand 15%) | `#2e343e` (gray) | **"You chose this."** Selected preset, ticked row, chosen item |
| `text-selected-foreground` | `--fp-selected-strong` | `#a33f00` | `#e8eaed` | Its label, icon, indicator (underline tabs) |
| `border-selected-border` | `--fp-selected-border` | `#fdb98c` | `#555e6b` | Its rim |
| `bg-accent` · `text-accent-foreground` | `--accent` → `--fp-emphasis` | `#e5e7eb` | `#2e343e` | **The gray hover — "the pointer is here."** Not the accent color |
| `bg-sidebar-accent` | | `#e5e7eb` | `#2e343e` | The nav's current module — neutral, not brand |

### 1.5 Accent violet = highlight

| Utility | Token | Light & Dark | Use |
|---|---|---|---|
| `bg-accent-violet` · `text-accent-violet-foreground` | `--accent-violet` · `-foreground` | `#8b5cf6` · `#ffffff` | Picked days / dates / months in every frequency picker and every schedule shown in a list; the stepper's current step |
| `bg-accent-violet-soft` | | `#8b5cf6` @12% | Quiet wash; the `violet` pill |
| `text-accent-violet-ink` | | `#8b5cf6` 70% into `--foreground` | Readable violet text |
| `bg-accent-violet/6` + `text-accent-violet` | | | The `MetricIcon` tile |

`fp-lane-violet` and the `violet` pill map to this token. `fp-lane-purple` (`#6366f1`) is an indigo lane color, not the accent.

### 1.6 Status — kinds, tones, pills

A module declares **kinds**; `KIND_TONE` in `statusKind.ts` is the only place a kind meets a `StatusChip` tone. The pill draws the kind.

| Kind | Means | Tone | Pill classes | Light text | Dark text |
|---|---|---|---|---|---|
| `caution` | Waiting on somebody — pending, awaiting, Unassigned, Paused | `processing` | `bg-fp-banner-accent-caution/10 text-fp-banner-accent-caution` | `#b45309` | `#fcd34d` |
| `info` | Simply true, asks nothing — Assigned, Scheduled, Active | `info` | `bg-fp-banner-accent-info/10 text-fp-banner-accent-info` | `#1d4ed8` | `#a5b4fc` |
| `success` | Done — Completed, Delivered, Synced | `success` | `bg-status-success/10 text-status-success` | `#15803d` | `#22c55e` |
| `critical` | A warning — Blocked, Declined, Over limit | `failed` | `bg-status-failed/10 text-status-failed` | `#dc2626` | `#f87171` |
| `neutral` | Neither — Draft, Canceled, Ended, Inactive | `neutral` | `bg-muted text-muted-foreground` | `#596475` | `#a0a7b0` |

Active / inactive records: `ACTIVE_KIND(active)` → `info` / `neutral`.

Other status tokens: `--status-processing` `#b45309` / `#f59e0b`; `--status-pink` `#db2777` / `#ff8080`; `--verified` `#2563eb` / `#3b82f6` (white text on it); `--status-success-foreground` `#ffffff` / `#052e16` (ink on a green FILL); `--destructive` `#ef4444` / `#f87171` (white text on it in both).

**Banners** (`--fp-banner-*`):

| Status | Fill (light / dark) | Rim (dark only; light `transparent`) | Accent (light / dark) |
|---|---|---|---|
| info | `#1e40af` / `#1e1b4b` | `#6366f1` | `#1d4ed8` / `#a5b4fc` |
| caution | `#854d0e` / `#422006` | `#eab308` | `#b45309` / `#fcd34d` |
| warning | `#991b1b` / `#450a0a` | `#ef4444` | `#b91c1c` / `#fca5a5` |
| success | `#166534` / `#052e16` | `#22c55e` | `#15803d` / `#bef264` |

Banner text `--fp-banner-foreground`: `#ffffff` / `#e8eaed`.

**Trend** (`TrendChip`): `--fp-trend-up` `#3aac73` on `--fp-trend-up-bg` `#e7f6ef`; `--fp-trend-down` `#b74e6d` on `#fae7ec`. Dark: `#5cc994` on `#3aac73`@18%; `#e58aa3` on `#b74e6d`@22%.

### 1.7 Categorical palettes (same in both themes unless noted)

| Family | Values | Use |
|---|---|---|
| Lane accents `bg-fp-lane-*` | gray `#64748b` · blue `#3b82f6` · yellow `#eab308` · green `#22c55e` · cyan `#06b6d4` · purple `#6366f1` · violet = `--accent-violet` · pink `#d946ef` · orange `#f59e0b` · red `#f43f5e` | Board lane top strip + count pill; chosen-color pills (`PillColor`); file-type tags; level gauge |
| Pastel pairs `bg-pastel-*` / `-foreground` | blue `#a8c9ef`/`#16324f` · amber `#f0c9a4`/`#5a3313` · violet `#c6b8f0`/`#33235c` · rose `#f2b5b5`/`#5c1f1f` · slate `#c9cfd8`/`#2b3542` · teal `#a3d9d4`/`#12403c` · green `#b7dfae`/`#21451a` | `CodeDisc` only. The DS ships hues; the application binds meaning |
| Dashboard viz `bg-fp-viz-1…8` | light: blue `#2a78d6` · orange `#eb6834` · aqua `#1baf7a` · yellow `#eda100` · magenta `#e87ba4` · green `#008300` · violet `#4a3aa7` · red `#e34948`. Dark: `#3987e5` · `#d95926` · `#199e70` · `#c98500` · `#d55181` · `#008300` · `#9085e9` · `#e66767` | Charts. Fixed order, slot 1 first, never cycled; a 9th series folds into "Other" |
| `--chart-1…5` | `#fa6400` `#3b82f6` `#22c55e` `#eab308` `#8b5cf6` | Legacy. No chart uses it now |

### 1.8 Accessibility levels (WCAG and Maximum)

The panel's **Stroke contrast** and **Contrast** sliders each run (text follows Contrast — no Text color slider since 2026-10-24) Default (0) → WCAG (50, unlabelled middle) → Maximum (100). `a11y.ts` mixes each token between the two points either side. WCAG = text AAA 7:1 on every surface, controls / graphics / every rim and divider AA 3:1+, surfaces a full step apart. Maximum = rims 5:1+, text still 7:1 on the darker surfaces; in light, **whites stay white and grays go dark**.

| Token | WCAG light | WCAG dark | Max light | Max dark |
|---|---|---|---|---|
| `--fp-ink-1` / `-2` | = theme | = theme | `#000000` | `#ffffff` |
| `--fp-ink-3` | `#3a424e` | `#cfd3d8` | `#08090a` | `#e6e8eb` |
| `--fp-surface-base` | `#e4e4dd` | `#040506` | `#9a9a9a` | `#000000` |
| `--fp-shell-ground` | `#e6e6e1` | = base | `#9a9a9a` | = base |
| `--fp-shell-selected` | `#dedcd6` | = card-1 | `#9a9aa0` | = card-1 |
| `--fp-surface-1a` | `#eef0f4` | `#30363f` | `#c0c4ca` | `#3b434e` |
| `--fp-card-1` | `#e2e6ed` | `#373e48` | `#adb2b9` | `#424b57` |
| `--fp-card-2` | `#eef0f4` | `#2b3038` | `#c0c4ca` | `#333b45` |
| `--fp-card-3` | `#f3f4f7` | `#282d34` | `#cfd2d6` | `#2f363f` |
| `--fp-emphasis` (`--accent`) | `#dfe2e8` | `#373e48` | `#b2b7bd` | `#424b57` |
| `--fp-emphasis-hover` | `#e6e9ef` | `#404853` | `#bbbfc5` | `#4d5764` |
| `--fp-table-header` | `#e9ecf1` | = card-2 | `#b7bcc2` | = card-2 |
| `--fp-board-lane` | `#e9ecf1` | = base | `#adb2b9` | = base |
| `--fp-row-hover` | `#e6e9ef` | `#2d333b` | `#cbcfd4` | `#363e48` |
| `--fp-outline-1` · `--fp-stroke-hairline` | `#7c7c86` | `#7d899c` | `#2a2a30` | `#a3aebe` |
| `--fp-stroke-field` · `--fp-outline-2` | `#5f5f69` | `#9aa5b6` | `#121216` | `#b9c3d2` |
| `--fp-selected-border` | `#d35400` | `#636f80` | `#7a3100` | `#8b96a8` |
| `--fp-selected-strong` | `#873400` | = theme | `#301200` | = theme |
| `--ring` | `#853500` | = brand | `#2f1300` | = brand |
| `--fp-brand-ink` | `#853500` | `#ffc7a2` | `#2f1300` | `#ffe2cf` |
| `--status-success` | `#0e5328` | `#7be8a3` | `#020b05` | `#bdf4d1` |
| `--status-processing` | `#763606` | `#f9cc7d` | `#100701` | `#fce5bd` |
| `--fp-danger` (`--status-failed`) | `#8c1515` | `#fcc5c5` | `#160303` | `#fee1e1` |
| `--verified` | `#103ea6` | `#bcd4fc` | `#061841` | `#dde9fe` |
| `--accent-violet` | `#4f0de6` | `#dacbfc` | `#1e0557` | `#ece5fd` |
| `--fp-banner-accent-info` | `#173ca8` | `#b4c0fd` | `#091741` | `#c8d1fe` |
| `--fp-banner-accent-caution` | `#763606` | = theme | `#100701` | = theme |
| `--fp-trend-up` / `-down` | `#1f5c3e` / `#81344b` | `#88d9b1` / `#eeb1c2` | `#0a1e15` / `#2d121a` | `#a8e3c6` / `#f3c8d4` |

Lane accents move too (WCAG light: yellow `#a67f06`, green `#1a9848`, cyan `#0592aa`, pink `#c026d3`, orange `#b97708`, red `#e11d48`; Maximum light: gray `#515e71`, blue `#0a55d0`, yellow `#755a04`, green `#126c33`, cyan `#036778`, purple `#3f42ee`, pink `#9c1fac`, orange `#825406`, red `#b7183b`). **Text on a color fill** (`ON_FILL`) is chosen, never blended: white or dark, whichever reads better (WCAG dark sets these to `#0f1216`). **The brand fill never moves** — only `--fp-brand-ink` and `--ring` do.

### Rules — color

1. **Tokens only; a new color joins the token layer** with a light value, a dark value, WCAG light + dark values, a pair in `scripts/eval/wcag-contrast.mjs`, and a place in `a11y.ts` (STROKE, BACKGROUND, INK or ON_FILL). — *A color outside the layer cannot follow the theme or the Accessibility panel, and earlier AI work hallucinated values read off screenshots.* (constitution; DS ui §10n)
2. **The default CTA is `bg-primary`, never `bg-brand`.** — *Orange is the product's mark; as a CTA it would compete with meaning on every screen.* (constitution §2)
3. **Brand says "you chose this"; violet highlights; gray `--accent` says "the pointer is here".** The three never trade jobs. — *Hover and chosen shared one gray once and a hovered segment looked selected. Purple had been used ad hoc in two hues; Pavan wanted one accent.* (DS ui §10c, 2026-10-16)
4. **Dark selects in gray, light in brand tint.** Use `bg-selected` and let the theme decide. — *An orange dark enough to sit on near-black has gone brown, which the product does not own.*
5. **Navigation state is neutral** (`bg-sidebar-accent`, `bg-fp-shell-selected`), never brand. — *The page you are on is a report, not a choice; the loudest color was saying the least.*
6. **A status is coloured by its KIND, declared as kinds, never tones.** — *"Assigned" came out green, amber and blue in three modules when authors picked swatches.* (DS ui §10b, 2026-09-23)
7. **Red only for a warning.** Types, categories, plain lanes and Canceled are never red. — *A lane of red badges is the loudest thing on the board saying the least.* (2026-10-16)
8. **Being active is `info`, not `success`.** — *Nothing has been achieved by a customer existing; green is kept for done.*
9. **A card's rim is `border-fp-outline-1`; a divider is `border-border`; a field is `border-input`; hover rims go to `border-fp-outline-2`.** The hover rim must stay darker than the resting rim. — *A "stronger" rim that measured weaker made every Kanban card get lighter on hover.*
10. **Never fill with a stroke token.** Fields in dark use `dark:bg-fp-field-fill`; a switch's off track `bg-fp-switch-track`. — *Stroke contrast must move strokes only.* (2026-10-21)
11. **Never raise a stroke to make something read** — fix spacing or the surface step. — *A darker line is the wrong answer to a layout problem.*
12. **Board lanes use `bg-fp-board-lane`, grouped-table bands `bg-fp-lane`.** Two tokens even when equal. — *Retuning one must never drag the other.*
13. **Categorical hues are the same in both themes.** — *A series that changes color with the theme changes identity.*
14. **Orange TEXT uses `text-brand` (→ `--fp-brand-ink`); the brand fill is never moved by an accessibility setting.** — *Text color once recoloured the logo.* (2026-10-21)

---

## 2. Type

**Font:** Geist (variable, 100–900 loaded), `font-sans`. Weights used: 400 regular, 500 `font-medium`, 600 `font-semibold`, 700 only in the file-type tag. **All numbers that compare** (`tabular-nums`): counts, money, dates in tables, percentages.

| Utility | Size / line | Use |
|---|---|---|
| `text-[7px]` | 7px | File-type tag letters only |
| `text-[9px]` · `text-[10px]` · `text-[11px]` | 9 · 10 · 11px | Token initial badge · filter hover-card heading (uppercase, `tracking-[0.12em]`) · time-scale ticks |
| `text-xs` | 12 / 16 | Pills and chips, sub-lines, captions, tooltip, table nested headers, view-bar tool names |
| `text-sm` | 14 / 20 | **The UI default**: buttons, menu items, table cells, labels, field text on desktop (`md:text-sm`) |
| `text-base` | 16 / 24 | Field text below `md`; card / breakdown titles; group headings in stepped forms |
| `text-lg` | 18 / 28 | Dialog title, empty-state title |
| `text-3xl` | 30 / 36 | Stat tile figure (`font-semibold tabular-nums`) |
| `text-heading-sm` · `-md` · `-lg` · `-xl` | 24/1.3 · 36/1.2 · 48/1.1 · 60/1.05 | Display headings (semibold) |

**Text size (Accessibility):** `.a11y-text` scales `--text-xs/sm/base/lg` by `--fp-text-scale` (1–1.3) and adds weight `(scale − 1) × 250`; the fixed 7/9/10/11/13px sizes scale too; text in table cells, board lanes, sheets and the nav wraps instead of truncating (buttons stay one line); boxes keep their width.

### Rules — type

1. **Sizes from the scale only.** — *Scale discipline is a constitution rule.*
2. **Pills, chips and sub-lines are `text-xs` regular; cells and controls `text-sm`.** — *One recipe makes a status read the same in a cell, a sheet header and on a card.*
3. **Numbers are `tabular-nums`.** — *Digits line up and the eye reads magnitude.*
4. **Fields capitalise the first letter by default** (`autoCapitalize="sentences"`), except email, URL, password, number, tel. — *The value stored is the value seen.*
5. **Text grows; boxes don't.** No width follows Text size (`--fp-scale`, `--fp-nav-k`, `--fp-lane-k` stay 1); text wraps and heights grow. Bigger boxes = Display size. — *"Only the text size should increase without the card size increasing."* (2026-10-23)

---

## 3. Spacing

Tailwind's 4px step (`--spacing: 0.25rem`). FP-named spacing works on any spacing utility:

| Token | Value | Use |
|---|---|---|
| `container-padding-x` | 24px | Page side padding |
| `section-padding-y` | 96px | Marketing-scale section padding (showcase) |
| `section-title-gap-sm` / `-md` / `-lg` / `-xl` | 16 / 20 / 20 / 24px | Title → content gap |

Fixed spacings the screens rely on:

| Where | Value |
|---|---|
| Between fields in one row | **24px** (`gap-6`); 16px only in a dense table-like grid |
| Content inset inside a flush box | **16px** |
| Between groups in a stepped form | 40px |
| Toolbar left cluster / right cluster | `gap-3` / `gap-1` |
| Chips on a shelf | `gap-2`; inside a pill `px-3` |
| Sheet gap from window edge | 56px (112px for a sheet over a sheet) |

### Rules — spacing

1. **A row of fields fills its row** — `1fr` / `flex-1` shares, 24px apart, last field ending at the container padding. No fixed px container around fields unless commented `FIXED WIDTH` (dates, times, the 320px list search). — *A fixed 340px column left a third of a grown sheet empty.* (DS ui §10e, 2026-10-16)
2. **Flush means the box meets the edge; content keeps a 16px inset.** — *A chip touching the edge reads as cut off.* (2026-09-25)
3. **Tables fill the full content width**; never a `max-w` cap. — *"Why was it built without using the full space?"* (2026-10-07)

---

## 4. Radius

`--radius: 0.625rem` (10px). Ramp:

| Utility | px | Use |
|---|---|---|
| `rounded-xs` | 2 | Dialog close focus box |
| `rounded-sm` | 6 | Menu / select items, kbd, small icon buttons in chips |
| `rounded-md` | 8 | **Buttons, inputs, selects, popovers, menus, tooltips, toggles, content layer** |
| `rounded-lg` | 10 | **Cards, dialogs, alert dialogs, tab list, metric tile, attention outline** |
| `rounded-xl` | 14 | Dashboard cards and their ground |
| `rounded-2xl` · `3xl` · `4xl` | 18 · 22 · 26 | On the ramp; rarely used |
| `rounded-full` | — | Pills, chips, avatars, switches, radios, discs, progress, slider |
| `rounded-[4px]` | 4 | Checkbox only (DS code) |

### Rules — radius

1. **Controls `rounded-md`, cards `rounded-lg`, pills `rounded-full`.** — *Scale discipline.*
2. **A hanging add is square on top, rounded below** (`rounded-t-none rounded-b-md`). — *Its top edge is the card's bottom edge; a radius there notches.*

---

## 5. Stroke widths

| Width | Where |
|---|---|
| 1px | Every border: fields, cards, dividers, popovers, dialogs |
| 2px ring | Focus: `focus-visible:ring-2 focus-visible:ring-ring/50` + `border-ring` |
| 2px outline, offset 2 | `.fp-attention` (offset 1 for `.fp-attention-info`) |
| 2px (`h-0.5`) | Stage-track line, nested-row green rail (`status-success/70`), tab underline, module-switch progress bar |
| 2px border | Current-stage pill in `StageTrack` track / compact |
| 5px border | `StageTrack` rings (current = violet, upcoming = `fp-outline-2`) |
| 1.5px / 2px | `OutlineShine` ring default / on banner CTAs |
| Icon line 2 / 1.75 | Lucide default / `MetricIcon` |

---

## 6. Elevation

| Utility | Value | Use |
|---|---|---|
| none | — | **The shell** (rail, nav, top bar, content layer) and **every control** (inputs, buttons, toggles, tabs, checkboxes, switches, slider handles, pagination) |
| `shadow-xs` | Tailwind | Dashboard cards |
| `shadow-md` | Tailwind | Menus, popovers, select lists, hover cards |
| `shadow-lg` | Tailwind | Dialogs, alert dialogs, sheets |
| `shadow-fp-surface` | `0 4px 4px 0 rgb(0 0 0 / 0.15)` | Something that genuinely floats over content (a hovered card) |
| `shadow-fp-overlay` | `0 8px 10px -6px` + `0 20px 25px -5px`, black 10% | The tier above content — the bulk-action bar. Pair with `border-fp-outline-1 dark:border-fp-outline-2` |
| Scrim | `bg-black/50` | Behind dialogs and sheets |

### Rules — elevation

1. **Nothing in the shell casts a shadow; layers separate by value.** — *A shadow on top of a real value step is a second answer to a question already answered.*
2. **Controls cast no shadow — their border is the edge.** (2026-10-14)
3. **Elevation steps once per level**: `fp-surface-1b → card → fp-card-1`.
4. **On dark, elevation is a lighter rim, not a darker shadow.** — *Black on a dark surface has almost no range.*

---

## 7. Motion

| Motion | Class / where | Duration · easing | Reduced motion |
|---|---|---|---|
| Skeleton shimmer — a light sweeping left → right | `.fp-shimmer` (Skeleton) | 1.4s ease-in-out, infinite | Off |
| Urgent blink — tank ≤ 10% | `.fp-urgent-blink` | 1.4s, opacity 1 → .35, infinite | Steady |
| Attention ring — "it is THIS one" | `.fp-attention` | 600ms, **once** | Ring held steady 1.2s |
| Attention, info blue — chips just became clickable | `.fp-attention-info` | 600ms, once | Held 1.2s |
| Attention fill — a grid column | `.fp-attention-fill` | 600ms, once (ring 16%) | Held 1.2s |
| Attention fill, subtle — landing on a form section | `.fp-attention-fill-subtle` | 800ms, once (foreground 5%) | Off |
| Outline shine — a band sweeping the outline | `OutlineShine` | 1.9s lap every 6s, first after 1.2s, `cubic-bezier(0.45,0,0.55,1)`, band skewed −24° | Still |
| Pill sweep — the shine through a pill's face | `OutlineShine fill` (AlertBanner pills, collapsed only) | same | Still |
| Module-switch progress | `.fp-nav-progress` | 3000ms linear | — |
| Nav fold → move → unfold | ModuleSidebar | 200 → 260 → 240ms, `cubic-bezier(0.2,0,0,1)` | None |
| Bulk-action bar in | `.bulk-bar-in` | 200ms ease-out, translateY 1rem | — |
| Overlays in / out | `animate-in fade-in-0 zoom-in-95` + side slide | Dialog 200ms; sheet open 500 / close 300ms | — |
| Stage change | `StageTrack` | line 500ms ease-out; pill fades + zooms in after 300ms; held 900ms | `motion-reduce:` none |
| Name slide-out (view-bar tools, hanging add) | width / opacity | 200ms | — |
| Copy confirm | `CopyValue` | tick shows 1.4s | — |
| Check pop | `.module-check-pop` | 320ms `cubic-bezier(0.34,1.56,0.64,1)` | — |

### Rules — motion

1. **Every looping or attention motion has a reduced-motion form** that keeps the point (a held ring) or stops. — *Somebody who asked for less motion still has to be told which section they were sent to.*
2. **Attention blinks once, never twice.** — *Two flashes is a thing asking to be watched; one points and gets out of the way.* (2026-09-22)
3. **A skeleton shimmers; it never pulses.** (2026-10-10)
4. **In an AlertBanner every pill sweeps (while collapsed) and every CTA shines; screens never add it.** (DS ui §10l, 2026-10-20)
5. **Never animate on first paint** of a record (StageTrack). — *Opening a record is not a stage changing.*

---

## 8. Screen sizes and zoom

| Token / setting | Value | Meaning |
|---|---|---|
| Display size (Accessibility) | ×0.5 · ×0.75 · **×1** · ×1.25 · ×1.5 (100% in the middle) | One CSS zoom on `<html>`; sets `--fp-zoom` |
| `--fp-vw` · `--fp-vh` | `100vw / zoom` · `100dvh / zoom` | **Anything sized to the window** |
| `html.a11y-zoom body` | `min-width: 1280px` | The app's narrowest layout; a zoomed page scrolls sideways (visible 12px bar) instead of clipping |
| `--fp-text-scale` | 1 – 1.3 | Text size |
| `--fp-scale` | 1+ | Fixed widths inside sheets and their table columns |
| `--fp-nav-k` · `--fp-nav-width` | 1+ · `15rem × k` (240px) | The one-panel nav; collapsed rail 56px |
| `--fp-lane-k` · `--fp-board-lane-width` · `--fp-board-column-width` | 1+ · `400px × k` · `320px × k` | Board lanes |

### Rules — screen

1. **Never `100vw`, `100vh` or `h-screen`;** use `var(--fp-vw)` / `var(--fp-vh)`. — *A zoomed page multiplies viewport units too.*
2. **A new kind of fixed-width unit is added to `UNITS` in `a11y.ts`** so it is fitted when text grows.
3. **No scrollbars by default** (`scrollbar-width: none` on `*`) — the clipped edge says there is more. — *A gutter ate half a lane's padding on one side.*

---

## 9. Icons

- **Lucide only** (`lucide-react`). Size via `size-*`: **16px (`size-4`) default** in buttons, menus, select; `size-3` in xs buttons and chip ✕; `size-3.5` in copy / clear; `size-6` in empty media; `size-7` in `MetricIcon`. Line 2 (Lucide default).
- Icons inside a control inherit color; a bare icon in a field or menu row is `text-muted-foreground` unless it names its own color.
- **Fixed glyphs:** search `Search`; column search `TextSearch`; clear `X`; add `Plus`; sort `ArrowUp` / `ArrowDown`, unsorted `ChevronsUpDown`; display `Table2` · `KanbanSquare` · `Map`; update view `RefreshCw`; select / combobox `ChevronDown`; date `Calendar`; warning `TriangleAlert`; battery `Battery*`; Accessibility `AccessibilityIcon` (`src/components/theme`).
- **Term icons** (`src/components/ui/term-icons.tsx`, `TERM_ICONS`): deliveries `TruckIcon`, products `DropIcon` (~60% wavy fluid), gallons `DrumIcon` (fuel drum ~70% wavy fluid), ship-tos `PinIcon`. Style: Lucide 24 grid, round caps / joins, `currentColor`, soft fill of its own color at 22%, liquids fill to a **wave**.

### Rules — icons

1. **Lucide only; never Tabler, Hugeicons, Phosphor, Remix, emoji or one-off SVG.** A missing glyph is an inline SVG in `currentColor`. (constitution §3)
2. **One icon per term, every module.** Wherever the app names deliveries, products, gallons or ship-tos it draws that icon and no other. (DS ui §10k, 2026-10-20)
3. **A new term icon follows the term-icon style** and is added to `TERM_ICONS`.

---

## Never

- ❌ A raw hex, `rgb()`, `hsl()` or arbitrary color (`bg-[#…]`, `text-[#…]`) in a component. Eval `tokens`.
- ❌ `bg-brand` as the default CTA, or orange on hover, selected rows, links or nav state.
- ❌ A second violet, or using `--accent` (gray hover) to mean the accent.
- ❌ A status map written in tones or hues (`processing`, `amber`) instead of kinds. Eval `status-kinds`.
- ❌ Red for a type, category, plain lane or Canceled.
- ❌ A radius off the ramp (`rounded-[5px]`, `rounded-[12px]`); a type size off the scale.
- ❌ A shadow on the shell or on a control; `shadow-md` invented as a token (there is no `--shadow-md` token).
- ❌ A fill made from a stroke token (`bg-input/30`, `bg-border` as a surface).
- ❌ `100vw` / `100vh` / `h-screen`; a fixed px container around fields without `FIXED WIDTH`. Eval `fields-fill`.
- ❌ A visible scrollbar.
- ❌ An icon from any set other than Lucide; a different icon for a term in `TERM_ICONS`.
- ❌ A new color token without WCAG light/dark values and an `a11y.ts` slot. Eval `wcag-contrast`.
- ❌ An animation without a reduced-motion form; an attention blink that repeats.
- ❌ Values read off a screenshot or Figma when the code has them.
