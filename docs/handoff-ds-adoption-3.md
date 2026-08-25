# Handoff prompt — pagination rhythm and the light-mode colour pass

Paste everything below the line into a **fresh chat** rooted at the FP-DS-2026
repo. It is self-contained.

Scope: **pagination spacing and light-mode colour only.** Every item is a change
to how something looks. No data, no wiring.

Origin: all of it was proven in `prototypes/unified-view` on branch
`feat/unified-view-prototype`, across four list screens. Several items are
already committed there in `src/` — each task says which, so check before
redoing.

---

You are working in the **FleetPanda Design System (FP-DS-2026)** repo:
`git@github.com:pavanshetty-fp/FP-DS-2026.git`

Read `START-HERE.md` and `docs/apply-design-system.md` first. `git pull` before
you touch anything. Non-negotiables: **tokens, never raw hex**; **Lucide icons
only**; **both themes must work** (FP-dark is `.dark` and the default, Light is
`:root`); **one React app**, no new HTML entry points.

> **Visual values are decided in this repo.** No Figma round-trip — pick values
> from a scale the DS already uses (the next step on a ramp, an existing surface
> token), put them in the token layer, and measure. Never invent a one-off hex,
> never read colours off a screenshot.

> **Measure, don't look.** Every defect below was invisible in a screenshot and
> only showed up as an RGB delta or a computed value. And when you flip themes to
> check, **wait ~2s for `transition-colors` to settle before reading** —
> reading immediately returns mid-transition values, which produced four false
> readings during this work, two of which looked like real contrast failures.

Five tasks, independent, one commit each.

---

## Task 1 — the page owns the footer rhythm

**Status: committed on the branch.** Verify, don't redo.

**The defect.** `tables-layout/TablePagination` hard-codes `h-[72px]` on its
footer band. The controls inside are 36px, so the band adds 18px of its own air
above and below them. On a screen whose vertical rhythm is set by the page, that
fights the page: measured, the pagination sat 34px off the panel bottom (18 from
the band + 16 from the content layer's `p-4`) while pressed **flush** against
the table — 0px gap.

**The fix.** `TablePagination` takes an optional `className`. The 72px default is
unchanged for every existing caller. Screens that own their own rhythm pass
`h-9`, so the band is exactly its content and the page's padding does the
spacing. Across all four list screens:

| | before | after |
|---|---|---|
| footer band height | 72px | **36px** |
| table height | 589px | **609px** |
| table → pagination | 0px | **16px** |
| pagination → panel bottom | 16px | 16px |

The 16px above comes from `mt-4` on the footer wrapper; the 16px below was
already the content layer's `p-4`.

**What to decide:** whether `h-9` should become the default and the 72px band the
opt-in. Every screen built here wants the tight one. If the 72px band only exists
because it was measured off a Figma frame that had the padding baked in, the
default is backwards.

---

## Task 2 — the windowed pagination was never visible

**No code change. This is a documentation and demo task.**

`TablePagination` is correct and complete: 72px band, three zones (range left,
windowed controls centre, rows-per-page right), active page on the FP/Outline-2
treatment, and an **ellipsis that is a jump-to-page popover** (Figma
27728:13260). All of it measured right.

But it was reported as "not per the design system", because the demo data gave it
two pages. With two pages `paginationRange` returns `[1, 2]` — no window, no
ellipsis, and therefore no jump-to-page. The control was rendering its degenerate
case and nobody could see the real one.

**Do this:** make sure the DS gallery's pagination example has **enough rows for
at least 8–10 pages**. A component whose whole point is windowing cannot be
demoed below its window size. Measured with ten pages:

```
page 1   Previous · 1 2 3 4 5 · … · 10 · Next
page 5   Previous · 1 · … · 4 5 6 · … · 10 · Next     (both ellipses)
```

If the gallery generates demo rows, use a **deterministic PRNG with a fixed
seed**, not `Math.random`. Rows must be identical across every render, HMR update
and StrictMode double-invoke — a list that reshuffles while you page through it
reads as a bug, and no screenshot matches twice.

---

## Task 3 — light-mode status values that failed AA

**Status: committed on the branch.** Verify, don't redo.

Every light token that carries text was measured against the three surfaces it
can land on (`#ffffff` content layer, `#efefeb` app background, `#e9ecf1` card).
Two failed AA outright:

| token | light | on white | verdict |
|---|---|---|---|
| `--status-success` | `#16a34a` | **3.30** | FAIL |
| `--status-processing` | `#d97706` | **3.19** | FAIL |
| `--status-failed` | `#dc2626` | 4.83 | ok |
| `--status-pink` | `#db2777` | 4.60 | ok |
| `--verified` | `#2563eb` | 5.17 | ok |
| `--muted-foreground` | `#596475` | 5.99 | ok |

The palette is the Tailwind ramp — dark takes the 500 step, light the 600. **The
rule is not "always 600" but "the lightest step that clears 4.5:1 as text on the
content layer."** Green and amber are far lighter than red/pink/blue at the same
step, so only those two moved: `green-600 → green-700` (`#15803d`),
`amber-600 → amber-700` (`#b45309`). Measured after: both **5.02**. Dark
untouched at 7.18 / 7.62.

The other three are left alone, which also keeps `--status-failed` aligned with
`--destructive`.

**Still short, and it cannot be fixed by darkening:** `StatusChip variant="soft"`
on light went 2.96 → **4.38** and 2.86 → **4.39**. A 10% tint of the label's own
hue lifts the background faster than it darkens the text, so the recipe tops out
below 4.5. Reaching AA means the tint stops being a straight alpha of the label
colour and gets **its own token pair** — a fixed tint plus a foreground measured
against it, the way the pastel pairs are built. `dot` and `text` are both safe.

---

## Task 4 — chips are too heavy in light

**The defect.** `Badge variant="secondary"` fills with `--secondary`, which is
`#cad1db` in light — a mid grey that reads as a solid block on the white content
layer rather than a chip. It is the fill behind every LOS tag, every `+N`
overflow badge and every segment badge in the command palette.

**The fix.** The chip variant fills with `--fp-card-1` instead: `#e9ecf1` light,
`#2a2f37` dark. Dark is **byte-identical** to `--secondary` there, so this
lightens light mode and changes dark not at all. Measured: the chip now sits
`[22,19,14]` off white with its label at **16.56:1**.

```
badge.tsx   secondary:  bg-secondary  ->  bg-fp-card-1
                        (both the `variant` and the BadgeNumber variant)
```

**Do NOT change `--secondary` itself.** It also fills `Button variant="secondary"`,
which needs the weight — lightening the token would flatten those buttons. Only
the chip variant moves.

**Same treatment for small active controls.** A view-switch tool marked active
with `bg-accent` (`#cad1db` light) is carrying the control-emphasis token at full
strength inside a 32px button. It uses `bg-fp-card-1` too — again identical in
dark.

**What to decide:** whether this wants a named `--chip` token rather than reaching
for `--fp-card-1`, which is a *surface* token being used for a *component* fill.
The values would be the same; the semantics would be clearer. Worth deciding
before it spreads.

---

## Task 5 — outline buttons on the content layer

**The defect.** The `outline` button variant is
`border bg-background … dark:border-input dark:bg-input/30`. In light,
`--background` is `#efefeb` — the **app** background. That is correct when the
button sits on the app background, and wrong on the white content layer, where
every table toolbar puts it: measured, `Filters` and `Group By` rendered at
`#efefeb` while the search input beside them was `rgba(0,0,0,0)`. Filled grey
buttons next to a transparent field.

There is a second inconsistency in the same variant: light borders with
`--border` (`#cdd4de`) while dark borders with `--input` (`#363c45`). So the light
button also read a shade lighter than the field beside it.

**The fix, applied at the call sites** (`GroupByMenu` and the filter triggers):
`className="border-input bg-transparent"`. Measured after, light: all three
fills `rgba(0,0,0,0)`, all three borders `rgb(171,179,194)`. Dark is unchanged —
`dark:bg-input/30` outranks the class, so the button keeps the same subtle fill
the input has and the two still match.

**What to decide, and this is the real question:** whether the `outline` variant
itself should stop using `bg-background`. Every toolbar in the DS puts outline
buttons on the content layer, so the call-site fix will need repeating forever.
Either the variant becomes transparent (and callers that genuinely sit on the app
background opt into a fill), or there is a second variant for content-layer
toolbars. Also worth settling `--border` vs `--input` for the stroke so light and
dark stop disagreeing.

---

## A pattern worth a lint rule

This branch has now hit the same class of bug **five** times: a token whose value
is byte-identical to the surface it is painted on, or a surface token used where a
semantic one belongs.

```
--muted     == --fp-surface-1b   row hover and selection invisible in dark
--popover   == --fp-surface-1b   the bulk bar's fill vanished
bg-muted    on the content layer  composited to zero
--accent    == --fp-card-1        bulk bar vs selected row, delta [0,0,0]
--secondary == --accent (light)   chips indistinguishable from control emphasis
```

Every one was invisible in a screenshot. A check that fails when a component's
fill resolves to the same value as its computed backdrop would have caught all
five. Worth building before a sixth.

---

## Constraints and verification (all tasks)

- `npx tsc -b --noEmit` and `npx eslint .` must pass. 12 pre-existing
  `react-refresh` warnings are the expected baseline — do not add a 13th.
- **Both themes**, measured, after the transition settles.
- Gallery CSS should stay around **146 kB**. If it collapses to ~20 kB, the
  `@source "../src"` / `@source "../prototypes"` lines in `src/index.css` have
  been dropped — that is always the cause.
- Commit per task, and state in the message **what was measured**.

### Two JSX traps that cost real time here

- **`asChild` slots onto exactly ONE child.** A `{/* comment */}` or raw `//`
  text inside `<PopoverTrigger asChild>` / `<DropdownMenuTrigger asChild>` counts
  as a second child and throws *"Primitive.button failed to slot onto its
  children"* — which blanks the page, not just the component.
- **Inside a ternary branch use `/* … */`, not `{/* … */}`.** That slot is an
  expression, so a JSX comment plus an element is two things where one is
  allowed, and it fails to parse.
- And in `src/index.css`: a Tailwind class containing `*/` (e.g.
  `bg-status-*/10`) **closes a CSS comment early** and spills prose into the
  stylesheet. PostCSS reports it far from the real line.
