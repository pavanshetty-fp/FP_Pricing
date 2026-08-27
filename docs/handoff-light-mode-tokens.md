# Light mode colour tokens — change bulletin for downstream repos

**Date:** 2026-08-27 · **Source of truth:** `FP-DS-2026`, `main` @ `e527a63`
**Scope:** light theme (`:root`) colour tokens only. **Dark / FP (`.dark`) is unchanged — do not touch it.**

The light column of the design system was re-authored in Figma
(`PxzKUl6emRr8QQ5Nb0vlwT`, collection **"3. Mode"**, mode **Light**) and synced
into the token layer verbatim. Of the 32 `base/*` semantic colours, **21 already
matched** the repo and were left alone; **11 changed**. Those 11 are below.

Two of the 11 carry accepted accessibility and hierarchy costs. They are
deliberate design decisions, not defects — they are called out in §3 so you do
not "fix" them on the way in, and so you can decide whether your product surface
can absorb them.

---

## 1 — The 11 changed values

Every new value is a named step on the Tailwind ramp (or plain white), so if your
repo never customised its light theme you may already be on some of these.

| Token | Was | Now | Figma variable → alias |
|---|---|---|---|
| `--background` | `#efefeb` | `#ffffff` | `base/background` → `colors/background-light` |
| `--secondary` | `#cad1db` | `#f4f4f5` | `base/secondary` → `zinc/100` |
| `--muted` | `#cad1db` | `#f4f4f5` | `base/muted` → `zinc/100` |
| `--accent` | `#cad1db` | `#e5e7eb` | `base/accent` → `gray/200` |
| `--destructive` | `#dc2626` | `#ef4444` | `base/destructive` → `red/500` |
| `--border` | `#cdd4de` | `#a1a1aa` | `base/border` → `zinc/400` |
| `--input` | `#abb3c2` | `#a1a1aa` | `base/input` → `zinc/400` |
| `--sidebar` | `#fafbf8` | `#fafafa` | `base/sidebar` → `zinc/50` |
| `--sidebar-accent` | `#cad1db` | `#e5e7eb` | `base/sidebar-accent` → `gray/200` |
| `--sidebar-border` | `#cdd4de` | `#abb3c2` | `base/sidebar-border` → `colors/sidebar-border-light` |
| `--sidebar-ring` | `#727d8f` | `#6b7280` | `base/sidebar-ring` → `gray/500` |

### Copy-paste — flat token layer

If your `:root` holds literals (the common shadcn shape), these are the eleven
lines to change and nothing else:

```css
:root {
  --background: #ffffff;      /* was #efefeb */
  --secondary: #f4f4f5;       /* was #cad1db — zinc/100 */
  --muted: #f4f4f5;           /* was #cad1db — zinc/100 */
  --accent: #e5e7eb;          /* was #cad1db — gray/200 */
  --destructive: #ef4444;     /* was #dc2626 — red/500 · see §3.1 */
  --border: #a1a1aa;          /* was #cdd4de — zinc/400 */
  --input: #a1a1aa;           /* was #abb3c2 — zinc/400 */
  --sidebar: #fafafa;         /* was #fafbf8 — zinc/50 */
  --sidebar-accent: #e5e7eb;  /* was #cad1db — gray/200 */
  --sidebar-border: #abb3c2;  /* was #cdd4de */
  --sidebar-ring: #6b7280;    /* was #727d8f — gray/500 */
}
```

### If your token layer is aliased rather than flat

`FP-DS-2026` itself splits primitives from semantics on
`feat/unified-view-prototype`. If you have the same shape, note that this sync
**forces one primitive to split**, because it puts `--accent`/`--sidebar-accent`
on `gray/200` but `--secondary`/`--muted` on `zinc/100`, and one primitive cannot
hold both:

```css
:root {
  --fp-emphasis: #e5e7eb;        /* accent, sidebar-accent */
  --fp-emphasis-quiet: #f4f4f5;  /* secondary, muted — NEW, light-only split */
}
```

`--background` also has to stop aliasing the app-ground primitive (that primitive
keeps `#efefeb` for the icon rail), and `--destructive` has to stop aliasing the
danger primitive (§3.1). Both re-join their original primitive in dark.

---

## 2 — Tokens that deliberately did **not** move

These sit next to the changed ones and look like oversights. They are not. If you
"align" them you will undo a measured decision:

| Token | Stays | Why |
|---|---|---|
| `--status-failed` | `#dc2626` | Carries body-sized status text, measures **4.83** on white. It used to track `--destructive`; it no longer does. |
| `--fp-surface-base` | `#efefeb` | Now the *only* name for the old tinted app ground. The icon rail still uses it. |
| `--fp-outline-2` | `#ededed` | Only on `feat/unified-view-prototype`. Never part of this sync. |

Everything else FP-specific — `--fp-*`, `--status-*`, `--pastel-*`, `--drawer`,
`--rail`, banner tokens — is **not** in the Figma collection and is untouched.

---

## 3 — The two accepted costs

Measure these against your own surfaces before you ship. Both were raised before
the change and accepted.

### 3.1 `--destructive` is below AA as body text on white

| | Ratio on `#ffffff` | AA body (4.5) |
|---|---|---|
| old `#dc2626` | **4.83** | pass |
| new `#ef4444` | **3.76** | **fail** |

Affects anything painting `--destructive` as text or as a soft tint: a
`destructive` Badge variant, `text-destructive` body copy, destructive-styled
form errors. It does **not** affect status text, because `--status-failed` stayed
at 4.83 (§2).

If your product has a legal or contractual AA commitment on error text, either
keep `--destructive` at `#dc2626` locally, or route error *text* through a
separate token and let `--destructive` be a fill-only colour.

### 3.2 Light no longer has a ground/card fill step

`--background` is now the same `#ffffff` as `--card`, `--popover` and both
content surfaces. Measured separation: **1.15:1 → 1.00:1**, i.e. none.

Two consequences:

1. **A card separates by border and shadow only.** If your cards relied on the
   tinted ground for their edge, they will look flat until the border carries it.
   The heavier `--border` (`zinc/400`) largely does this on its own.
2. **`bg-background` is invisible on a card, popover or the content layer** in
   light. This is a real class of silent bug — the fill composites to a zero
   pixel change and looks like a plausible flat panel in a screenshot.

Grep for it before you ship:

```bash
grep -rn "bg-background" src/ --include=*.tsx | grep -v "dark:"
```

Anything in that list sitting inside a card or popover needs `bg-muted`,
`bg-accent`, or an explicit surface token instead.

**A live example, still present in `FP-DS-2026` @ `e527a63`.**
`src/components/tables-layout/DataTable.tsx` uses `bg-background` twice to make a
region read as *recessed* inside the table — the sticky expanded-row cell (~L277)
and the expanded-row container (~L698). The table sits on the white content
layer, so in light that recess is now a zero-pixel change and those regions read
flat; in dark they are unaffected. If your repo inherited this component, or any
"recessed panel" built the same way, it needs the same treatment. Flagged rather
than silently changed, because whether the recess should come back as
`--muted`, as `--fp-surface-base`, or as a border is a design call.

---

## 4 — What to check in your own repo

Utilities whose rendered colour changes. This is where the visible diff will be:

| Utility | Token | Note |
|---|---|---|
| `bg-background` | `--background` | now white — see §3.2 |
| `bg-muted`, `bg-secondary` | `zinc/100` | lighter than before |
| `bg-accent`, `hover:bg-accent` | `gray/200` | slightly lighter, and a *neutral* grey |
| `border-border`, `border` | `zinc/400` | noticeably **darker/heavier** hairlines |
| `border-input` | `zinc/400` | field borders match hairlines now |
| `text-destructive`, `bg-destructive` | `red/500` | lighter red — §3.1 |
| sidebar utilities | `zinc/50`, `gray/200`, `gray/500` | |

**Temperature shift, worth knowing before review.** The old light values were
blue-tinted greys (`#cad1db`, `#abb3c2`, `#cdd4de`, `#727d8f`); the new ones are
neutral (`zinc`/`gray`). Light mode will read cooler-to-neutral rather than
blue. This is expected, not a regression.

**One inconsistency inside the Figma set**, carried through as-is: `accent` sits
on the **gray** ramp while `muted`/`secondary` sit on **zinc**. Two grey families
in one theme. Harmless in practice, but do not "correct" it unilaterally — it
matches the design source.

---

## 5 — Verification

Do not judge this from a screenshot. A zero-delta fill looks like a flat panel.
Paste this in the browser console with light mode active:

```js
(() => {
  const cs = getComputedStyle(document.documentElement);
  const t = n => cs.getPropertyValue('--' + n).trim().toLowerCase();
  const want = {
    background:'#ffffff', secondary:'#f4f4f5', muted:'#f4f4f5',
    accent:'#e5e7eb', destructive:'#ef4444', border:'#a1a1aa',
    input:'#a1a1aa', sidebar:'#fafafa', 'sidebar-accent':'#e5e7eb',
    'sidebar-border':'#abb3c2', 'sidebar-ring':'#6b7280',
  };
  const drift = Object.entries(want)
    .filter(([k, v]) => t(k) !== v)
    .map(([k, v]) => ({ token: '--' + k, want: v, got: t(k) }));
  return { applied: drift.length === 0, drift, statusFailedHeld: t('status-failed') === '#dc2626' };
})()
```

Expect `applied: true`, an empty `drift`, and `statusFailedHeld: true`.

If you flip themes programmatically to check, **wait for `transition-colors` to
settle (~1s) before reading computed styles** — reading in the same tick returns
mid-transition values and will report false drift.

Then confirm dark is untouched: switch to dark and check `--background` is still
`#080808`, `--accent` `#2a2f37`, `--destructive` `#f87171`.

---

## 6 — Provenance

| | |
|---|---|
| Sync commit | `e527a63` — `feat(tokens): sync the light column from Figma, verbatim` |
| Merge into prototype branch | `f443ba8` |
| Figma file | `PxzKUl6emRr8QQ5Nb0vlwT`, collection "3. Mode", mode Light |
| Register | `docs/ds/00-meta/token-provenance.md` §5 |
| Collision family | `docs/ds/ui/5-checks.md` — `--background` added, `--fp-outline-2`/`--accent` resolved |

Values are decided in `src/index.css`, not in Figma, as a rule. This sync is the
documented exception: the light column was re-authored in Figma and pulled across
on request.
