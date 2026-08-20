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
