# FP DS 2026 — change bulletin #4 for downstream repos

**Base repo:** `pavanshetty-fp/FP-DS-2026`, branch **`feat/3pl-module`**
**Range:** `1061f4c..55d9a1f` — 2026-09-11, later the same day · 30 commits
**Supersedes nothing.** Continues [`handoff-org-repo-2026-09-11.md`](handoff-org-repo-2026-09-11.md) (bulletin #3). Apply that first if you have not.
**Audience:** any repo that takes FP DS 2026 as its base.

> Work out where you actually are rather than trusting the label:
> ```bash
> git fetch fpds
> git diff <your-HEAD>..fpds/feat/3pl-module -- src/ docs/
> ```

Bulletin #3 rebuilt the light theme's surfaces. This one is what came out of
USING them: a scrollbar rule, a card variant for side-sheet sections, four
component behaviours, one new component, and a short list of token corrections
— several of which are collisions bulletin #3 created and did not notice.

**Two fixes here are bugs, not taste.** §4a (a decimal could not be typed into
any pricing cell) and §1c (the table header was invisible in dark) both ship
wrong behaviour, not just wrong looks. Take those even if you take nothing else.

---

## 1 · Tokens

### 1a · Scrollbars are gone, everywhere, on both axes

```diff
  * {
-   scrollbar-width: thin;
-   scrollbar-color: var(--border) transparent;
+   scrollbar-width: none;
  }
+ *::-webkit-scrollbar { width: 0; height: 0; }
```

**Why this is layout and not decoration.** `thin` reserved **11px inside the
padding box of every scroller**. A board lane padded 12px each side showed 12
on the left and 1 on the right the moment its cards overflowed — and only in
the lanes that happened to be scrolling, so the same lane changed shape with
how many cards were in it.

**There is no 1px scrollbar to ask for.** Browsers give three widths —
`auto` (15px), `thin` (11px), `none` (0) — and the `::-webkit-scrollbar`
width is **ignored outright the moment `scrollbar-width` is authored**, which
is why the carefully drawn 4px hairline in the old rule was never the thing on
screen. `none` is the only value that leaves a padded box symmetrical.

An opt-in class (`.fp-scrollbar`) existed briefly for horizontal strips and
was removed: one visible scrollbar teaches the reader that the ABSENCE of one
means "this does not scroll", which is false everywhere else.

### 1b · The light banner family is blue, and one step apart

```diff
- --fp-banner-info:          #3730a3;   /* indigo — read as purple */
+ --fp-banner-info:          #1e40af;   /* blue-800 */
- --fp-banner-accent-info:   #4338ca;
+ --fp-banner-accent-info:   #1d4ed8;   /* blue-700 */
- --fp-banner-accent-success: #4d7c0f;  /* lime, beside a green fill */
+ --fp-banner-accent-success: #15803d;  /* the green its own fill is cut from */
```

The light set now follows one rule: **the FILL is the 800 of its hue, the
ACCENT is the 700.** Dark is unchanged (still indigo) — only light was
reported as reading purple.

### 1c · `--fp-table-header` — a real bug in dark

```diff
- --fp-table-header: var(--fp-card-3);    /* light: #fafafa */
- --fp-table-header: var(--fp-surface-1a);/* dark:  #11161d */
+ --fp-table-header: var(--fp-card-1);    /* both: #e9ecf1 / #2a2f37 */
```

In dark it resolved to **the same value as a section card's title band**, so a
table sitting under one had two header rows of one colour running together and
neither read as a header. In light it was 5/255 off the rows. `--fp-card-1` is
one clear step in both themes, and still distinct from the row hover, which is
what the faint value was protecting.

### 1d · Navigation state is neutral; selection stays brand

```diff
- --sidebar-primary:            var(--brand);              /* orange */
- --sidebar-primary-foreground: #ffffff;
+ --sidebar-primary:            var(--fp-card-2);          /* light */
+ --sidebar-primary:            var(--fp-card-1);          /* dark  */
+ --sidebar-primary-foreground: var(--fp-ink-1);

- --sidebar-accent:            var(--fp-selected);         /* light: brand wash */
+ --sidebar-accent:            var(--fp-emphasis);         /* light only */
- --sidebar-accent-foreground: var(--fp-selected-strong);
+ --sidebar-accent-foreground: var(--fp-ink-1);
```

**Where you are is not what you picked.** The rail's current module, the
drawer's current item and every ticked table row were drawing from one
selection family, so three different claims spoke with one orange — and the
loudest was the one saying the least, since a rail item only reports the page
already on screen. `--selected` is untouched and now means only "you chose
this". **Dark's `--sidebar-accent` is unchanged** (it declares its own).

The section mark also stops being a second brand mark: orange put the product
mark in the top bar and again 24px below it in the drawer.

### 1e · `--sidebar` (light): `#fafafa` → `#fafbf8`

3/255, and the only reason to mention it is what it cost to learn: the drawer
and the section mark on it are a PAIR. Move `--sidebar` and re-measure
`--sidebar-primary`, or the mark vanishes. It happened three times.

**A cool grey that separates properly (`#e5e9f0`, 1.11:1 off the ground —
matching dark's own middle rung) was tried and rejected:** it reads as a heavy
slab beside the white content layer. Light's ladder is compressed at the top,
and the drawer is meant to BELONG to the content layer rather than stand off
from it. Do not "fix" the low contrast here from the numbers alone.

### 1f · `--fp-surface-base` (light) — no net change

It went `#efefeb` → `#f3f4f7` → back to `#efefeb` inside this range. If you
are diffing commit by commit you will see it move; the endpoint is bulletin
#3's value. **The reasoning is worth keeping:** the ground is WARM and
everything on it is cool, deliberately. A ground cut from the same cool family
as the content layer, the card steps and the strokes sits at the same
temperature as the work and the shell flattens. Temperature does the separating
that 12/255 of lightness cannot.

---

## 2 · New component — `ui/stage-bar.tsx`

`StageBar` — a record's lifecycle as one line of chevrons. Three tones
(behind / here / ahead) and a fourth only for a terminal exit (`ended`).

**It is not a stepper, and the difference is the point.** A stepper is a form
split into parts you move between, and its parts are numbered because you take
them in order; a stage bar is a statement about the record, which takes the
stages while you watch. The chevron is what makes that legible — equal boxes
read as tabs, and the notch turns the row into a direction. Drawn with
`clip-path` + a negative margin rather than borders or pseudo-elements, so a
segment stays one element that can be a button and take a focus ring.

It scrolls rather than shrinks, with no visible bar: a stage cut to four
characters is worse than one you scroll to, and a chevron clipped mid-word says
"there is more".

```tsx
<StageBar stages={STAGES} current={key} onSelect={optional} />
```

---

## 3 · `side-sheet/parts.tsx` — a section is a card

`SheetSection` gains two props, and **`variant` defaults to `card`**, so
existing call sites change appearance without being touched.

| prop | default | what it does |
|---|---|---|
| `variant` | `"card"` | bordered block, title in a tinted header band. `"plain"` is the old heading-over-fields form |
| `flush` | `false` | card variant only: drops the body padding so one child runs edge to edge under the band |

**Why the card is the default.** A sheet is a stack of questions about
different things, and gaps alone were carrying the whole job of saying where one
subject ended and the next began. At 40px they did it only while nothing in a
section grew; a section holding a table or a five-row picker swallowed the
boundary entirely. A border says it at any length.

**`flush` is for a section that IS a table.** A table already draws a border,
a header band and a rule between every row; inside a padded card it ran a second
outline a hair inside the first. Flush, the card's border IS the table's border.

> **`shrink-0` is load-bearing on the card.** The sheet body is a flex column,
> and `overflow-hidden` switches a flex item's automatic minimum size from its
> content to zero — without it the whole card collapses to its 2px of border.

New export **`SheetSectionInset`** gives the 16px back to one child of a
`flush` section (a banner above the table, a switch below), individually rather
than as a blanket. Put the `border-t`/`border-b` at the call site: only it
knows which side of the table the inset is on.

---

## 4 · Component behaviour

### 4a · `form-layout/table-cells.tsx` — **a decimal could not be typed. Take this one.**

`TableCellInput` is controlled by a NUMBER upstream, and a number cannot hold
a half-written one. Typing `1.4` sent `"1."` to the parent, which parsed it
to `1` and handed back `"1"` — the decimal point was swallowed on the
keystroke that made it. **Every rate in the app was an integer, and `1.4`
silently became `14`.** Not merely rejected: tenfold wrong.

The cell now keeps the literal keystrokes while it has focus and drops them on
blur, so the parent still receives every character and stays the source of
truth; it just stops answering mid-word.

Also new: **`prefix`** (e.g. `"$"`), pinned to the cell's LEFT edge with the
figure still right-aligned — how a ledger prints money. `suffix` (`gal`)
is unchanged.

### 4b · `ui/banner.tsx`

- `BannerCallout` gains **`variant="soft"`** — a 10% wash of the status accent
  with a 30% rim, for a standing condition that sits above the work all day
  rather than announcing itself once. Its wash and rim are alphas of the SAME
  accent the inline banner uses, so the two cannot drift.
- `BannerCallout` gains `title`, `count`, and `action` + `onDismiss`
  now co-exist.
- Exported **`bannerSoftAction`** — the fill for a button ON a soft banner: the
  content layer in light (white), the app ground in dark (near-black). An
  outline button vanishes into a wash.
- `BannerInline` gains **`split`** — title and message at opposite ends of ONE
  32px line. A state and its consequence are not a heading and a body when the
  consequence is seven words. Leave it off where the message can run on.

### 4c · `form-layout/FileUpload.tsx` — dropzone is transparent at rest

It was `--fp-surface-1a`. An empty dropzone is already a 96px hole; filling it
made that hole the largest painted shape on the page for the field least often
used. Transparent also means it inherits whatever it is dropped into rather
than pinning one surface value. **The drag state keeps a fill** (now
`--accent`) — that is the one moment the weight is information.

### 4d · `navigation-drawer/NavigationDrawer.tsx`

The brand tile pairs with `--sidebar-primary-foreground` instead of
hard-coding `text-brand-foreground`, and both call sites stopped passing the
default back in as `iconClassName`.

---

## 5 · What is app-level, not DS

Everything in `prototypes/unified-view/` — it does not travel. Named here only
so you can tell it apart when reading the log: the 3PL order sheet's two-column
pricing step and its sticky totals rail, the stage-bar wiring, the Fuel Orders
map view and unassigned-orders alert, and a `xxwide` (1440px) sheet size that
exists for exactly one shape — a step that is two columns.

---

## 6 · Applying this

```bash
git fetch fpds
git diff <your-HEAD>..fpds/feat/3pl-module -- src/ docs/
```

Files that matter: `src/index.css`, `src/components/ui/banner.tsx`,
`src/components/ui/stage-bar.tsx` (new), `src/components/side-sheet/parts.tsx`,
`src/components/form-layout/table-cells.tsx`,
`src/components/form-layout/FileUpload.tsx`,
`src/components/navigation-drawer/NavigationDrawer.tsx`.

**Take §4a and §1c even if you take nothing else** — they are wrong behaviour,
not a different opinion about how things should look.

Rules that changed live in `docs/ds/ux/2-rules.md` (side-sheet anatomy, the
stage bar, the no-scrollbar rule) and `docs/ds/ui/1-fundamentals.md` (the
token tables). Regenerate the bundle after any edit:

```bash
bash docs/ds/build-bundle.sh
```
