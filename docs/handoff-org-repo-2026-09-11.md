# FP DS 2026 — change bulletin #3 for downstream repos

**Base repo:** `pavanshetty-fp/FP-DS-2026`, branch **`feat/3pl-module`**
**Range:** `fa572e0..1061f4c` — 2026-09-08 → 2026-09-11 · 42 commits
**Supersedes nothing.** Continues [`handoff-org-repo-2026-09.md`](handoff-org-repo-2026-09.md) (bulletin #2). Apply that first if you have not.
**Audience:** any repo that takes FP DS 2026 as its base.

> Work out where you actually are rather than trusting the label:
> ```bash
> git fetch fpds
> git diff <your-HEAD>..fpds/feat/3pl-module -- src/ docs/
> ```

Almost all of this is **light theme**, and most of it is one argument: light had
been flattened until it read as a wireframe. The fixes are token-level, so a
downstream repo gets them by taking `src/index.css` and four component files.

---

## 1 · The light theme stops being a wireframe

The diagnosis, measured on a real screen before anything moved: **10 of 48
filled elements carried any hue** — about a quarter of one percent of the
painted area — and three of the six surface tokens were byte-identical white.

### 1a · The app ground is the rail's colour again
```diff
- --background: var(--fp-surface-1b);   /* #ffffff */
+ --background: var(--fp-surface-base); /* #efefeb */
```
At `#ffffff` it was identical to `--card`, `--popover` and both content
surfaces, so light had **no ground/card step at all**: the drawer and the
content card separated by border and shadow alone, and the 52px rail — the one
thing still painted `--fp-surface-base` — read as a stripe drawn ON the page
rather than as the page showing through. Dark never had this problem;
`--background` there has always been `--fp-surface-base`. The two themes are
now built the same way.

**Blast radius:** anything on `bg-background` picks up the tint, including the
global top bar. That is intended — the top bar, the rail and the surround are
one ground, and the drawer and content layer float on it.

### 1b · Nothing in the shell casts a shadow
`shadow-fp-surface` came off the tier-2 drawer and the content layer. It existed
to lift them off a ground they were nearly the same colour as; now the ground is
tinted in both themes, each layer reads as a step up by value, and a shadow on
top of a real value step is a second answer to a question already answered. The
token survives for things that genuinely float **over** content — a hovered
card, a popover.

### 1c · The surface ladder re-opens, and fields get a fill
```diff
- --fp-surface-1a: #ffffff;   /* == the content layer it sits on */
+ --fp-surface-1a: #f4f5f8;   /* one step under it (shares --fp-card-2) */
```
`--card` aliases 1a, so every card moved with it. Deliberately the same value as
`--fp-card-2` rather than a fourth near-white: "inner panel" and "the quieter
card step" are one surface with two names, and the top of this ladder is already
tight.

**Fields changed twice and landed on filled white.** They were
`bg-transparent`, which meant each field took whatever was behind it — a tinted
box on a card, a white one on the content layer — and could only be found by its
border, which is why the field stroke kept being pushed darker and still
measured 1.74:1. Filling them `bg-fp-surface-1a` fixed the finding but made a
field and the read-out card beside it the same colour. They are
**`bg-fp-surface-1b` (white)** now: a white well inside the tinted card. Dark
keeps `dark:bg-input/30`, which it has carried all along.

Touches `input.tsx`, `textarea.tsx`, `select.tsx` (`selectTriggerClasses`, which
the combobox also wears).

### 1d · Selection is a hue, and hover is not
**The bug this started from:** on the segmented control both `hover:` and
`data-[state=on]:` resolved to `bg-accent` + `text-accent-foreground`.
Pixel-identical — and the fill they shared measured **1.14:1** on the content
layer, so neither read at all. That is not one component: `--accent` at 1.14:1
was what every selected row, tab, nav item and segment used.

New family, exposed as `--selected` / `--selected-foreground` /
`--selected-border`:

| | Fill | Label / indicator | Rim |
|---|---|---|---|
| Light | `#fee8d9` (brand at 15%) | `#a33f00` | `#fdb98c` |
| Dark | `#2a2f37` (`--fp-card-1`) | `#f0f2f5` | `#575757` |

**Light takes the brand; dark takes grey.** The eye finds a tint of a *different*
colour instantly at a luminance where it cannot find a tint of the same one — so
light, which has almost no room between `#ffffff` and any grey, needs the hue.
Dark does not: there is far more room between `#11161d` and `#2a2f37`. And any
orange dark enough to sit quietly on a near-black ground has gone brown by the
time it gets there.

Two traps worth naming, both hit during the change:
- The light label is a **darkened** brand, not the brand: `#fa6400` on its own
  tint measures 2.56. `#a33f00` gets 5.33 on the fill and 6.35 on white.
- The dark label must be `--fp-ink-1` (the body colour, white in that theme) and
  **not** `--fp-ink-inverse`, which is the ink for a *light* fill and comes out
  near-black.

`--accent` keeps its grey and its one job: *the pointer is here*.

**Bound by:** `toggle.tsx` (`data-[state=on]`, with `hover:` twins so hovering
the selected segment does not drop it back to grey), `tabs.tsx` (active trigger
and the underline), `--sidebar-accent`, `--fp-row-selected`.

### 1e · The brand appears more than twice
It was the logo and the unread dot. Now also:
- `--ring: var(--brand)` — the focus ring. Loud only while someone is
  navigating, and competing with no meaning.
- `--sidebar-primary: var(--brand)` in **both** themes — the section mark, the
  largest neutral shape in the shell. White on `#fa6400` is 3.05: under the text
  threshold, over the 3:1 for a graphic, and it only ever holds an icon.

The primary button stays near-black. An orange fill fails contrast with white
text and needs a darker brand value off the ramp — a separate decision.

### 1f · Two fixes that fell out of the above
- `dialog.tsx` was on `bg-background`, which had just become the tinted ground.
  It is on `bg-popover` with the other floating surfaces.
- The focus halo went **3px → 2px** (22 places, 19 files). Brand orange earns
  its loudness by being rare, not thick.

---

## 2 · New tokens and component variants

| Token | Light | Dark | Why it exists |
|---|---|---|---|
| `--selected` / `-foreground` / `-border` | see §1d | see §1d | hover and chosen are different meanings |
| `--status-success-foreground` | `#ffffff` | `#052e16` | the ink on a green **fill** is not the ink on a green **dot** — `--status-success` is tuned for a mark on the page ground, so white measures 4.9 on the light green and 2.2 on the dark |
| `--fp-banner-accent-info` | `#4338ca` | `#a5b4fc` | the fourth inline-banner accent. Caution, warning and success each had one; info did not, so the one status with no way to speak quietly had to shout in a solid fill |
| `--fp-banner-border-{info,caution,warning,success}` | `transparent` | `#6366f1` / `#eab308` / `#ef4444` / `#22c55e` | the callout's rim in dark — see §3 |

**`Button` gains a `success` variant** — the affirmative counterpart to
`destructive`, which the set was missing. `bg-status-success` +
`text-status-success-foreground`.

**`BannerInline` gains an optional `title`.** Without one it is the same 32px
line it always was; with one it grows, stops truncating, and drops the message
to muted — a state and its consequence read as a heading and a body rather than
two sentences of equal weight.

---

## 3 · Callout banners, dark theme (Figma `28161:114645`)

A saturated bar on a near-black ground is the brightest thing on the page
whatever it has to say. In dark the fill drops to the **950 of its own hue** and
the status moves to a **1px rim in the 500**:

| | Fill | Rim |
|---|---|---|
| info | `#1e1b4b` | `#6366f1` |
| caution | `#422006` | `#eab308` |
| warning | `#450a0a` | `#ef4444` |
| success | `#052e16` | `#22c55e` |

Text at `#f0f2f5` — the body colour, not pure white, which is what a near-black
fill wants. **Light is unchanged** (solid fill, white text). The rim token
exists in both themes and is `transparent` in light, and the border is *always*
drawn: a border that appears in one theme changes the box's height between them.

---

## 4 · Component geometry

- **Code disc** — 16 × 16 with a 9px letter → **22 × 22 with a 12px letter**.
  `16 × (12/9)` is 21.3, so 22 scales the circle by the same factor as the
  letter. `"EM"`, the widest code, is 18.1px at 12/600 and fills 82% of the
  circle against 85% before; at 20px it would have had under a pixel of air each
  side. `text-[9px]` also stops being an arbitrary value — `text-xs` is the
  token.
- **Section mark** (the tile beside the drawer's title) — 36px → **24px**, the
  line box of the 16px name it sits beside, with a 14px icon and an 8px radius.

---

## 5 · Interaction rules that changed

- **No explanatory microcopy in the UI.** No helper lines under fields, no
  em-dash clauses appended to option labels, no sub-labels under switches, no
  "for best results…" hints. Ship the label, the value and the control. Text
  that reports **state** or warns about **consequence** is not covered — that is
  information about what is happening or what an action will do.
- **"View details" came off board cards.** The card is the button; a strip
  naming that was a label for the thing the reader was already standing on, and
  it cost every card a rule and 25px.

---

## 6 · What is app-level, not DS

The 3PL prototype also gained: a service-line scope (Fuel / Lubricants /
Propane) on the orders view row, a map view beside table and board, an asset
picker with per-column filters, a three-state invoice row on Accepted cards, and
vendor pricing that follows whether a load order exists. None of that is in
`src/` — it is under `prototypes/unified-view/` and is reference, not library.

---

## 7 · Applying this

```bash
git fetch fpds
git checkout fpds/feat/3pl-module -- src/index.css
git checkout fpds/feat/3pl-module -- src/components/ui/toggle.tsx \
  src/components/ui/tabs.tsx src/components/ui/banner.tsx \
  src/components/ui/button.tsx src/components/ui/badge.tsx \
  src/components/ui/input.tsx src/components/ui/textarea.tsx \
  src/components/ui/select.tsx src/components/ui/dialog.tsx \
  src/components/ui/code-disc.tsx \
  src/components/app-shell/AppShell.tsx \
  src/components/navigation-drawer/NavigationDrawer.tsx
```
Then sweep your own code for:
1. `shadow-fp-surface` on shell chrome — remove it.
2. `bg-background` on anything that should be a floating surface — it is the
   tinted ground now; use `bg-popover`.
3. `bg-accent` used to mean *selected* — move it to `bg-selected`.
4. `ring-[3px]` — the DS is on `ring-2`.
5. `bg-transparent` on a field — the DS fills them.

**Verify:** in light, the rail should disappear into the ground; a card should
be visible without its border; a selected segment should be unmistakably
different from a hovered one; the focus ring should be orange.
