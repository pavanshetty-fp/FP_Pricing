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
- **Light:** ground `#f3f4f7` → drawer `#e5e9f0` (a step DOWN — see below) → content layer `#ffffff`, with
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
| `bg-background` | `#f3f4f7` | `#080808` | app ground / Surface Base / global top bar — the rail sits flush on it |
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
| `bg-rail` | `#f3f4f7` | `#080808` | tier-1 rail (merges into the ground) |
| `bg-sidebar` | `#e5e9f0` | `#11161d` | tier-2 drawer + rail hover-overlay. THE THIRD VALUE where three surfaces meet: the rail/ground (`#f3f4f7`) and the content layer (`#ffffff`) are fixed and only 12/255 apart, so a near-white drawer measured 1.03:1 against the ground and had no edge. Dark's drawer is the middle rung at 1.10/1.11:1; light reaches the same separation by going DOWN — 1.11:1 from the ground, 1.22:1 from the layer |
| `bg-sidebar-primary` | `#ffffff` | `#2a2f37` | the 24px section mark — one step AWAY from the drawer it sits on, and now UP in both themes (1.22:1 light, 1.35:1 dark), **not** the brand: orange put the product mark twice on one screen. Re-measure whenever `--sidebar` moves |
| `bg-sidebar-accent` | `#fee8d9` | `#2a2f37` | the drawer's active item (= `--selected`) |
| `bg-fp-surface-base` | `#f3f4f7` | `#080808` | the app ground, by its own name |
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
