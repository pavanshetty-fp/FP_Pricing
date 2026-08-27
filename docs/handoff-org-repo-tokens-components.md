# FP DS 2026 — change bulletin for downstream repos

**Base repo:** `pavanshetty-fp/FP-DS-2026` (branch `feat/unified-view-prototype`)
**Range:** `18a4a20..f18d030` — 2026-08-24 17:55 → 2026-08-25 17:35
**Audience:** any repo that takes FP DS 2026 as its base and needs to pull these changes forward.

FP DS 2026 is the base. Everything below lives in `src/` and is meant to travel.
`prototypes/unified-view/` is where patterns get proven, not where they live — anything
proven there must be promoted into `src/`, and anything changed in `src/` must be pulled
back into the prototype. **§7 lists where that loop is currently open.**

> **Before applying:** this assumes your base matches `src/index.css` as of `18a4a20`.
> If you forked earlier, widen the range — `git diff <your-base>..f18d030 -- src/` — rather
> than applying blind.

**At a glance**

| | |
|---|---|
| New colour tokens | 8 (+1 shadow token) |
| Changed token values | 6 — light only |
| Tokens removed or renamed | none |
| Components with colour changes | 18 |
| Components with layout/spacing changes | 7 |
| New components | 5 |
| Additive API changes | 7 |
| DS rules amended | 1 — **locked decision 8** |
| Proven but not yet promoted | 1 — see §7 |
| Default behaviour changed | 2 — `Button` outline fill (§2e), `TablePagination` band (§3a) |
| Token layer restructured | yes — two layers, see §1a |

---

## 1 — Token changes (`src/index.css`)

### 1a. The token layer is now two layers

**Apply this before the value changes below — it changes where a value lives, not what it is.**

`src/index.css` used to declare a colour literal for every semantic token, in both blocks. That
flattening had a measurable cost: the light selection grey was spelled out **five separate
times** (`--secondary`, `--muted`, `--accent`, `--sidebar-accent`, `--fp-outline-2`), so
changing it in one place left four behind and the same colour rendered in two shades at once.
Figma has always had the structure the CSS was missing — `FP/Card 1`, `FP/Surface 1b`,
`FP/Outline 1-2`, `base/muted` aliasing `FP/Card 2` — and the mapping survived only in comments.

**Layer 1 — primitives.** The only place a literal is written. 16 families, each with a light
value on `:root` and a dark value on `.dark`:

```
--fp-ink-1 / -2 / -3 / -inverse        text roles
--fp-surface-base / -1a / -1b          app ground, inner panel, content layer
--fp-card-1 / -2                       raised card, quieter card step
--fp-emphasis / --fp-emphasis-hover    SELECTION and its hover
--fp-outline-1 / -2                    quiet rim, stronger rim
--fp-stroke-hairline / --fp-stroke-field
--fp-danger
```

**Layer 2 — semantics.** No literals; every token aliases a primitive. Where the primitive is
the same in both themes the token is declared **once** on `:root` and never appears in `.dark`
at all — `var()` resolves at use time, so redefining the primitive under `.dark` re-resolves it
automatically:

```css
:root { --fp-emphasis: #ededed; --accent: var(--fp-emphasis); }
.dark { --fp-emphasis: #2a2f37; }            /* --accent follows, unstated */
```

A handful of tokens map to a *different* primitive per theme (`--muted` → emphasis in light,
card-2 in dark; `--sidebar-accent` → emphasis / outline-1; `--fp-lane` → card-2 / card-1) and
are declared in both blocks. Tokens with no family (charts, banners, statuses, `--chip`,
`--drawer`, `--ring`) keep their literals.

**This refactor is pixel-neutral.** All 67 tokens were resolved in both themes and diffed
against their pre-refactor values: **134/134 identical**. Literals dropped from 67 to 50 on
`:root` and 58 to 43 on `.dark`. Verified in the browser too — setting only `--fp-emphasis`
moves `--accent`, `--secondary`, `--muted` and `--sidebar-accent` together.

> `--fp-outline-2`'s light value currently equals `--fp-emphasis`, but they are deliberately
> separate families: that one is only ever a border (all 18 call sites are
> `border-fp-outline-2`) and it carries its own dark value. Retinting the emphasis grey does
> **not** move it. Tie them if that is what you want.



### 1b. New aliases — `@theme inline` block

Place with the other FleetPanda-only aliases, after `--color-fp-card-1`:

```css
  --color-sidebar-accent-hover: var(--sidebar-accent-hover);
  --color-chip: var(--chip);
  --color-fp-row-hover: var(--fp-row-hover);
  --color-fp-row-selected: var(--fp-row-selected);
  --color-pastel-blue: var(--pastel-blue);
  --color-pastel-blue-foreground: var(--pastel-blue-foreground);
  --color-pastel-amber: var(--pastel-amber);
  --color-pastel-amber-foreground: var(--pastel-amber-foreground);
```

And at the end of the same block, the overlay elevation tier — the FP DS 2026 library's
`shadow/xl` effect style verbatim, black at 10%, identical in both themes:

```css
  --shadow-fp-overlay:
    0 8px 10px -6px rgb(0 0 0 / 0.1),
    0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### 1c. New values — `:root` (light)

```css
  /* Pastel accents. Declared on :root and deliberately NOT overridden in .dark —
     a pastel reads as a pastel in both themes. */
  --pastel-blue: #a8c9ef;
  --pastel-blue-foreground: #16324f;
  --pastel-amber: #f0c9a4;
  --pastel-amber-foreground: #5a3313;

  /* Chip fill. Its own token because the value light wants (#efefeb) is
     --background in light, and --background is #080808 in dark, which would
     render chips near-black. */
  --chip: #efefeb;

  /* THE LIGHT SELECTION GREY. Five tokens held one hex and all move together,
     so the segmented tabs, the active view-switch tool, menu emphasis, secondary
     buttons and nav selection stay one family. */
  --secondary: #ededed;
  --muted: #ededed;
  --accent: #ededed;
  --sidebar-accent: #ededed;
  --fp-outline-2: #ededed;

  /* Navigation selection and hover are two states, so they are two tokens. They
     used to share --sidebar-accent, which meant a hovered item and a selected
     one were the same pixel and hover gave no feedback on the item you were
     already on. */
  --sidebar-accent-hover: #e1e1e1;  /* new */

  /* Table row states. Rows previously borrowed --accent, a CONTROL-emphasis value
     far too heavy as a row wash on white — selected measured [53,46,36] off #ffffff.
     Now hover [11,10,7] -> selected [22,19,14]. */
  --fp-row-hover: #f4f5f8;
  --fp-row-selected: #e9ecf1;
```

### 1d. New values — `.dark` (FP)

Pastels are **not** repeated here; they inherit from `:root`.

```css
  --chip: #2a2f37;
  --sidebar-accent-hover: #363c45;  /* = --sidebar-accent; see §1d */
  --fp-row-hover: #22272f;
  --fp-row-selected: #2a2f37;
```

`#22272f` is the midpoint of the `surface-1b → card-1` step — precisely what `accent/50`
composited to over the content layer. **Dark renders identically to before; only light changes.**

### 1e. Changed values — `:root` only

| Token | Was | Now | As text on `#ffffff` |
|---|---|---|---|
| `--status-success` | `#16a34a` green-600 | `#15803d` green-700 | 3.30 **FAIL** → 5.02 pass |
| `--status-processing` | `#d97706` amber-600 | `#b45309` amber-700 | 3.19 **FAIL** → 5.02 pass |
| `--secondary` | `#cad1db` | `#ededed` | the light selection grey — see below |
| `--muted` | `#cad1db` | `#ededed` | ” |
| `--accent` | `#cad1db` | `#ededed` | ” |
| `--sidebar-accent` | `#cad1db` | `#ededed` | ” |
| `--fp-outline-2` | `#cad1db` | `#ededed` | ” — **but this one is a rim, see the warning** |

Both are painted as *text* by `StatusChip variant="text"` and `variant="soft"`, not only as a
dot, so the 4.5:1 threshold applies rather than the 3.0 graphics one. `--status-failed`
(4.83), `--status-pink` (4.60) and `--verified` (5.17) already cleared it and are unchanged —
which also keeps `--status-failed` aligned with `--destructive`. **No dark values changed**
(7.18 / 7.62, untouched).

**`#cad1db` is gone from the light theme.** Five tokens carried that one hex —
`--secondary`, `--muted`, `--accent`, `--sidebar-accent` and `--fp-outline-2` — so changing one
left the others behind and the selection grey appeared in two shades at once. All five are now
`#ededed`. Verified by sweeping the rendered DOM: **0 elements** paint the old hex as fill or
border; 55 paint the new one. **Dark is untouched** — those five hold four different values
there (`#2a2f37`, `#1b2028`, `#2a2f37`, `#363c45`, `#575757`) and none of them was the shared
light hex.

> **⚠ One of the five is a border, not a fill.** `--fp-outline-2` has 18 call sites and every
> one is `border-fp-outline-2` — the pagination active-page outline, Kanban lane rules, the
> sheet rules, the bulk bar's dark rim. Off the white content layer it now separates
> `[18,18,18]` where it separated `[53,46,36]`, so those hairlines are markedly quieter. It was
> carried along so no `#cad1db` is left anywhere; **reverting just that one to `#cad1db` is a
> single line** if the rims read too faint.

> **⚠ `--accent` drives hover as well as selection.** 48 call sites are `hover:bg-accent`
> against 37 selection fills, so hover and selection are now the same pixel — the exact
> condition that made nav hover useless before `--sidebar-accent-hover` split them. The
> matching fix is an `--accent-hover: #e1e1e1` pair mirroring §1d's sidebar split. **Not done
> here** — it is a 48-site sweep and several of those hovers carry `/50` alphas that dark
> depends on, so it needs its own pass.

**`--sidebar-accent` is a specified value, not a derived one.** Navigation selection is
`#ededed` and hover is `#e1e1e1`, both given. Hover is **darker** than selected on purpose:
hover is transient feedback and has to register on top of a selected row, so hovering the
current item deepens it rather than doing nothing. Deltas — selected sits `[13,14,11]` off the
drawer (`#fafbf8`), hover a further `[12,12,12]` under selected.

**Dark keeps one value for both states** (`#363c45`), which is what it already rendered:
`#ededed` / `#e1e1e1` are light-mode values and would be near-white blocks on the `#11161d`
drawer. *DS follow-up: dark deserves its own two-step pair the way light now has one.*

**Known residual:** `StatusChip variant="soft"` on light went 2.96 → **4.38** and 2.86 → **4.39**
— still short of AA, and it cannot be fixed by darkening. A 10% tint of the label's own hue
lifts the background faster than it darkens the text, so the recipe tops out below 4.5.
Reaching AA means the tint stops being a straight alpha and gets **its own token pair** — a
fixed tint plus a foreground measured against it, the way the pastel pairs are built.
`dot` and `text` are both safe. Not yet done in the base.

### 1f. Build config — required, not cosmetic

Add immediately after the `@import` lines (adjust paths to your CSS entry):

```css
@source "../src";
@source "../prototypes";
```

Tailwind v4 auto-detects sources from the build's working directory. Any build that sets Vite
`root` to a subfolder anchors detection there and silently drops every utility used only under
`src/` — `bg-rail`, `bg-fp-surface-1b` and `bg-brand` all vanished from the generated CSS.
**Symptom to watch for:** generated CSS collapsing from ~146 kB to ~20 kB. That is always this.

---

## 2 — Colour changes in components

### 2a. The `bg-muted` sweep — mechanical, dark-mode fix

In the FP dark theme `--muted` is `#1b2028`, byte-identical to `--fp-surface-1b` (the content
layer) and to `--popover`. Any `bg-muted` fill sitting on the content layer or inside a
popover, dropdown or side sheet composited to a **zero pixel change** and was invisible.
`--accent` (`#2a2f37` dark) is distinct. In light, `--muted` and `--accent` are both `#cad1db`,
so **light rendering is pixel-identical before and after**.

| File | Change |
|---|---|
| `ui/avatar.tsx` | `bg-muted` → `bg-accent` — 2 occurrences (`AvatarFallback`, avatar-group item) |
| `ui/button-group.tsx` | `ButtonGroupText`: `bg-muted` → `bg-accent` |
| `ui/empty.tsx` | `icon` variant: `bg-muted` → `bg-accent` |
| `ui/item.tsx` | `muted: "bg-muted/50"` → `"bg-accent/50"`; `icon` variant `bg-muted` → `bg-accent` |
| `ui/kbd.tsx` | `bg-muted` → `bg-accent` |
| `ui/slider.tsx` | track: `bg-muted` → `bg-accent` |
| `ui/tabs.tsx` | `default: "bg-muted"` → `"bg-accent"` |
| `ui/toggle.tsx` | `hover:bg-muted` → `hover:bg-accent/50` — note the `/50`; full accent was too heavy for a hover |
| `form-layout/MultiSelect.tsx` | count bubble: `bg-muted` → `bg-accent` |

**Do not re-point `--muted` itself.** The duplication originates in the Figma library —
`FP/Card 2` and `FP/Surface 1b` both hold `#1b2028`, and `base/muted` aliases Card 2 while
`base/popover` aliases Surface 1b (file `PxzKUl6emRr8QQ5Nb0vlwT`). Changing the token needs
that decided in Figma first.

### 2b. `ui/table.tsx` — row states move to the new tokens

```diff
  // TableFooter
- "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
+ "border-t bg-fp-row-hover font-medium [&>tr]:last:border-b-0",

  // TableRow
- "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
+ "border-b transition-colors hover:bg-fp-row-hover has-aria-expanded:bg-fp-row-hover data-[state=selected]:bg-fp-row-selected",
```

Depends on §1b/§1c. Apply the tokens first.

### 2c. `ui/badge.tsx` — chip fill, pastel variants, shape axis

1. **`secondary` variant re-points to the chip token**, in both the `variant` map and
   `BadgeNumber`: `bg-secondary text-secondary-foreground hover:bg-secondary/80` →
   `bg-chip text-secondary-foreground hover:bg-chip/80`.
   `--secondary` (`#cad1db` light) read as a solid block rather than a chip on the white
   content layer. It is the fill behind every LOS tag, every `+N` overflow badge and every
   segment badge in the command palette. Measured after: chip sits `[22,19,14]` off white
   with its label at **16.56:1**.
   **`--secondary` itself is unchanged** — it also fills `Button variant="secondary"`, which
   needs the weight.
2. **Two new variants:** `pastel-blue` and `pastel-amber`, each
   `bg-pastel-* text-pastel-*-foreground hover:bg-pastel-*/90`.
3. **A new `shape` axis, independent of colour:** `pill` (default, unchanged) and `disc` —
   `size-4 justify-center rounded-full p-0 text-[9px] font-semibold`. Existing call sites
   need no change.

### 2d. `tables-layout/BulkActionBar.tsx` — overlay tier

```diff
- className="bulk-bar-in … border-border bg-popover p-1.5 shadow-lg"
+ className="bulk-bar-in … border-fp-outline-1 bg-fp-surface-1a p-1.5 shadow-fp-overlay
+            dark:border-fp-outline-2 dark:bg-fp-card-1"
```

**The `dark:` pair is load-bearing, not redundancy.** On a dark surface black at any alpha has
almost no range, so a shadow can never be the separator — elevation there is a *lighter rim*.
Measured against `--accent`:

| Rim token | Dark | Light |
|---|---|---|
| `--fp-outline-1` | [12,13,14] weak | [24,20,15] works |
| `--fp-outline-2` | [45,40,32] works | [0,0,0] **collides** |

Each theme needs the other's token. Same reasoning for the fill: light takes white
(`--fp-surface-1a`), which separates `[53,46,36]` from the selected rows the bar actually sits
on; dark takes `--fp-card-1`. Any other overlay-tier element — dialogs, popovers — should
adopt the same recipe.

### 2e. `ui/button.tsx` — the `outline` variant stops using `bg-background`

**This replaces the call-site fix an earlier revision of this document described.** If you
already applied `className="border-input bg-transparent"` to `GroupByMenu`, `ScopeStepper` or
your filter triggers, remove it — the variant now does it, and the duplication will only rot.

```diff
  outline:
-   "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground
-    dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
+   "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground
+    dark:bg-input/30 dark:hover:bg-input/50",
```

**The defect.** `--background` is the **app** background (`#efefeb` light). That is right only
when the button sits *on* it — and wrong on the white content layer, where every toolbar and
every table row puts outline buttons. Swept one gallery route in light mode: **51 controls**
filled `#efefeb` on a `#ffffff` layer. Not an edge case — the `Filters` trigger, and a
`Button` + `Open` pair in all 25 visible rows.

**Why the variant and not the call sites.** `bg-transparent` is neutral-or-better everywhere,
which is what makes this safe to change centrally rather than patch:

| Where the button sits | `bg-background` renders | `bg-transparent` renders | |
|---|---|---|---|
| the app background | `#efefeb` | `#efefeb` | identical — no change |
| the white content layer | `#efefeb` | **`#ffffff`** | the fix |
| a card (`--fp-card-1`) | `#efefeb` | `#e9ecf1` | inherits the card instead of fighting it |
| inside a dialog (`bg-background`) | `#efefeb` | `#efefeb` | identical — no change |

There is no surface where the old value was right and the new one is wrong. Four call sites
had already accumulated patches for this; the row-level sweep showed the count was really 51
and climbing.

**The stroke moves to `--input` in both themes.** The variant already bordered with `--input`
in dark; light was the odd one out at `--border` (`#cdd4de` against the field's `#abb3c2`), so
an outline button read a shade lighter than the input beside it in every toolbar.

Measured on the gallery, light — before → after:

| | fill | stroke |
|---|---|---|
| outline buttons | `rgb(239,239,235)` | `rgb(205,212,222)` |
| **after** | `rgba(0,0,0,0)` → **`#ffffff`** | `rgb(171,179,194)` |
| search field beside them | `rgba(0,0,0,0)` | `rgb(171,179,194)` |

Offenders on that route: **51 → 0.** Dark re-measured after the transition settled: fill
`input/30`, stroke `rgb(54,60,69)` `#363c45` — unchanged, and identical to the field.

**This settles the open DS decision** the earlier revision recorded. `--border` vs `--input`
for the stroke is settled too: `--input`, both themes.

### 2f. `tables-layout/DataTable.tsx` + `tables-layout/data.ts` — status vocabulary

`DataTable` drops its local `STATUS_DOT` map and `StatusText` component and renders
`<StatusChip>` instead. `data.ts` gains the exported binding:

```ts
export function statusTone(status: RowStatus): StatusTone  // Success→success, etc.
```

and `statusBadgeVariant` is rewritten to derive from `statusTone`, so the filled-badge
treatment cannot drift from the chip treatment. **This is the reference implementation of the
DS's colour governance** — the DS ships tone channels, the application binds meaning. Copy the
pattern, not the map.

### 2g. Navigation hover moves off the selection token

`--sidebar-accent` was painting **both** selection and hover, so the two states were the same
pixel. Splitting the token means every hover call site has to move to the new one — 15
references across four files:

| File | Change |
|---|---|
| `ui/sidebar.tsx` | 10 refs — `hover:`, `active:` (pressed), `data-[state=open]:hover:`, and the `outline` menu-button's `hover:shadow-[0_0_0_1px_var(--sidebar-accent)]` |
| `navigation-drawer/NavigationDrawer.tsx` | 2 refs |
| `navigation-drawer/ModuleSwitcher.tsx` | 1 ref |
| `component-demos/SidebarDemo.tsx` | 2 refs |

Mechanically: `hover:bg-sidebar-accent` → `hover:bg-sidebar-accent-hover`, and the same for
`active:` and `data-[state=open]:hover:`.

**The `/60` alpha hovers collapse to the solid token.** `NavigationDrawer` and `ModuleSwitcher`
used `hover:bg-sidebar-accent/60`; the spec is `#e1e1e1`, not a tint of it, so they now use the
hover token at full strength.

**`active:` (the pressed pseudo-class) moves to the hover token too.** It is transient
interaction feedback, so grouping it with hover keeps press from *lightening* the control.

Selection-state sites are deliberately left on `--sidebar-accent`: `data-[active=true]:`,
`ModuleSwitcher`'s icon tiles, and `NavigationDrawer`'s three active branches.

---

## 3 — Layout and spacing changes

### 3a. `tables-layout/TablePagination.tsx` — the page owns the footer rhythm

**This replaces the "additive `className`" change an earlier revision described.** The default
moved; if you already passed `className="h-9"` at call sites, remove it.

```diff
- "flex h-[72px] items-center justify-between text-sm text-muted-foreground",
+ "flex h-9 items-center justify-between text-sm text-muted-foreground",
```

**The defect.** The controls inside are 36px, so a 72px band adds 18px of its own air above and
below them. On a screen whose vertical rhythm is set by the page, that fights the page:
measured, the footer sat 34px off the panel bottom (18 from the band + 16 from the content
layer's padding) while pressed **flush** against the table — a 0px gap above and a doubled one
below. The 72px frame almost certainly had the page padding baked into it, which is why the
default was backwards.

**The call-site recipe**, now applied to all three DS call sites (`TablesLayout`,
`DataActionControl`, `DataActionControlOpt2`) and the four prototype list screens:

```jsx
<div className="mt-4 shrink-0">
  <TablePagination … />
</div>
```

`className="h-[72px]"` restores the old band if a screen genuinely wants it to own the rhythm.

**The `border-t` divider is dropped** from `TablesLayout` and `DataActionControlOpt2`. The
table's own row rules already close the list, so a full-strength divider on top of them reads
as a stray line — and with `mt-4` it would float 16px clear of the table, attached to nothing.
`DataActionControl` had already removed it for that reason.

Measured on the gallery, before → after:

| | before | after |
|---|---|---|
| footer band height | 72px | **36px** |
| table viewport → footer | 0px | **16px** |
| footer → panel bottom | 16px | 16px |
| divider above footer | 1px `--border` | none |

**One regression this exposed, fixed in the same pass.** The range label
(`Showing 1–25 of 1,000`) had no wrap guard. At a narrow viewport it broke across three lines
(60px) and the 72px band simply had room for it; in a band that is exactly its content it
overflowed by 24px. It now carries `shrink-0 whitespace-nowrap` — correct at any band height,
since that label should never break mid-phrase. Re-measured at 874px and 768px wide: label
20px, band 36px, no overflow, no horizontal page scroll.

### 3b. `data-action-control/DataActionControl.tsx` — preset-row action cluster

The primary CTA and the export control move to the **right end of the preset-view row**, and
the horizontal rule that used to separate the row is dropped. Row composition, left to right:

```
Default · <saved views> · + View … [scope] [primary CTA] [export]
```

Three details in that row are load-bearing rather than decorative:

- **4px inset correction.** The row cancels the content layer's 16px inset with `-mx-4` and
  re-pads at `px-3` (12px) so its hairline spans the full panel. Without an extra `mr-1` on the
  **rightmost** item, that item sits 4px proud of every toolbar control below it. Measured with
  it: both right edges land on the same x. **If you reorder the trailing items, the `mr-1`
  moves to whichever is last.**
- **Sizes.** CTA `xs` (24px), export `icon-xs` (24px). That row carries text tabs, not
  controls; a 32px `sm` button sits heavy on it.
- **`self-end mb-2.5`.** The row is `items-center`, so the actions opt out of centring and
  measure from the bottom: 10px margin + the row's own 2px bottom padding puts them exactly
  12px above the hairline.

**Scope controls lead the toolbar's right cluster**, so the row reads outward: what *scopes*
the view → how it is *presented* (view switch, column tools) → the action that *adds* to it.
A scope control placed between the icon tools and the CTA splits the tools from a button they
have nothing to do with.

Note: `DataActionControlOpt2.tsx` was **not** given the same treatment and still carries the
old arrangement.

### 3c. `data-action-control/ScopeStepper.tsx` — three outlined boxes

Renders `‹ label ›` as three separately-outlined boxes, not a borderless icon-text-icon run:
the label is a value you are stepping *through*, so it reads as a field with a control either
side. The label box borrows `buttonVariants({ outline, sm })` rather than re-declaring
border/fill classes, so the three cannot drift apart across themes — the outline variant swaps
`border`/`bg` between light and dark and all three inherit that swap together. It is
`pointer-events-none` because it is a readout, not a button.

The three boxes render `#ffffff` on the content layer in light because the `outline` variant
itself is transparent (§2e). This component carried a call-site correction for that; it was
removed when the variant was fixed.

### 3d. `ui/dialog.tsx` — size and footer alignment

`DialogContent` gains `size?: "default" | "lg"` — `sm:max-w-lg` / `sm:max-w-2xl`.
`DialogFooter` gains `align?: "end" | "between"`. Both default to the previous behaviour.

---

## 4 — New components

| Path | Export | What it is |
|---|---|---|
| `ui/status-chip.tsx` | `StatusChip` | One vocabulary for three status treatments. `tone`: `success \| processing \| failed \| neutral`. `variant`: `dot` (neutral dot + plain label, for many-row lists) `\| text` (dot and label both take the tone colour) `\| soft` (tinted `/10` pill). **Ships no status→tone map** — the application declares its own; reference: `statusTone` in `tables-layout/data.ts`. Consumes `--status-*`. |
| `ui/code-disc.tsx` | `CodeDisc` | A 16px pastel disc carrying one or two characters. `label` is **required** — used as both tooltip and `aria-label`, so the letter is never the sole carrier of meaning. Built on `Badge shape="disc"`; prefer it over the raw shape. |
| `ui/multi-select-list.tsx` | `MultiSelectList` | Multi-select as checkbox rows, not check marks. `options`, `value`, `onChange`, `placeholder`, `empty`, `searchable`. **`searchable` is an explicit opt-in, not a length threshold** — a list gets a filter field when it cannot be taken in at once. |
| `bulk-edit/` | `BulkEditDialog`, `BeforeAfterTable`, `RecordMiniTable`, `StandingItems` | Two-step bulk-attribute dialog (choose → confirm). `title`, `scopeVerb`, `count`, `itemNoun`, `canProceed`, `summary`, `summaryDescription`, `onConfirm`. The scope line composes as `{scopeVerb} selected {N items}`. |
| `data-action-control/ScopeStepper.tsx` | `ScopeStepper` | See §3c. Fills `DataActionControl`'s `scopeControl` slot. |

Demos ship alongside: `component-demos/StatusChipDemo.tsx`, `component-demos/BulkEditDemo.tsx`.
All new exports are wired through `ui/index.ts` and the sibling barrels.

---

## 5 — Additive API changes

Every one is backward-compatible; existing call sites compile untouched.

| File | Addition |
|---|---|
| `ui/dialog.tsx` | `DialogContent` → `size?`; `DialogFooter` → `align?` (see §3d) |
| `ui/command.tsx` | `CommandShortcut` → `variant?: "meta" \| "keycap"`; `tracking-widest` now applies only to `keycap` |
| `tables-layout/FilterPanel.tsx` | `Option` → exported `FilterOption`; new exported `Facet` type with `searchable?`. Facets pass in via `facets?: Facet[]` instead of being hard-coded, and the search field is opt-in per facet |
| `tables-layout/TablePagination.tsx` | `className?` (see §3a) |
| `data-action-control/DataActionControl.tsx` | `scopeControl?: React.ReactNode`, `exportAction?: React.ReactNode` |
| `data-action-control/ImportExport.tsx` | `compactSize?: "icon-xs" \| "icon-sm"` |
| `top-bar/TopBar.tsx` | `onSearchActivate?`, `searchPlaceholder?` |

---

## 6 — DS rule amended: locked decision 8

Recorded in `docs/ds/ux/2-rules.md` and `docs/apply-design-system.md`. **Downstream repos
carrying their own copy of the DS rules must amend it too.**

Locked decision 8 previously read: *"title + primary CTA OUTSIDE the data container; tabs +
toolbar + table + pagination INSIDE one rounded bordered container."* §3b contradicts the
first half.

**Resolution: the CTA is placed relative to the data it acts on, not relative to the container
boundary.** A "Create" that adds a row to *this* list belongs with that list's own controls;
hoisting it to the page header separates it from the scope (preset view, line of service,
date) that determines what it will create. The container boundary was a proxy for "give the
action prominence", and the preset row gives it that without the separation.

The earlier decision still holds for **page-level** actions — ones not scoped by anything
inside the container.

> **Carry-forward:** an external `interaction-and-behavior.md` still carries the superseded
> wording. It is not in this repo and must be amended separately.

---

## 7 — Proven in the prototype, NOT yet in the base

These are real divergences, not oversights in this document. A repo pulling from FP DS 2026
today gets the DS side, not the prototype side. Closing them is DS work.

**7.1 — Active small-tool treatment.** The prototype's `ListToolbar.tsx` marks an active
32px icon tool with `bg-chip`; the DS's `DataActionControl.tsx:65` and
`DataActionControlOpt2.tsx:58` still use `bg-accent`, which at `#cad1db` carries the
control-emphasis token at full strength inside a 32px button on white. Dark is identical
either way — both tokens are `#2a2f37` there — so this is a light-mode-only fix.

*(Two earlier gaps are closed. The outline-button fix reaching only some call sites: §2e moved
it into the variant. The pagination rhythm reaching only the prototype: §3a moved it into the
default. Both followed the same route — when a call-site patch reaches a third site, the
default is what is wrong.)*

**Not a gap:** the DS gallery's `SAMPLE_ROWS` is already 1000 rows, so the windowed pagination
demos its real case (both ellipses, jump-to-page popover) rather than the two-page degenerate
one. If you build your own gallery, give it **8–10 pages minimum** and generate rows from a
**deterministic PRNG with a fixed seed**, never `Math.random` — a list that reshuffles across
HMR and StrictMode double-invokes reads as a bug and no screenshot matches twice.

---

## 8 — Verification after applying

1. **Dark mode, tables** — row hover and selected must both be visible against the content
   layer. Before the fix they were not.
2. **Light mode, status** — `StatusChip variant="text"` labels on white must measure ≥ 4.5:1
   for success and processing. `variant="soft"` will measure ~4.4 — that is the known residual
   in §1d, not a regression.
3. **Light mode, bulk-action bar** — white fill, visible rim, sitting over selected rows.
4. **Light mode, every outline button** — run this in the console on a table route. It must
   return `0`; any offender is a control still filled with the app background on the content
   layer, which means §2e did not land:
   ```js
   [...document.querySelectorAll('button')].filter(el => {
     if (getComputedStyle(el).backgroundColor !== 'rgb(239, 239, 235)') return false;
     let p = el.parentElement, bg;
     while (p && ((bg = getComputedStyle(p).backgroundColor) === 'rgba(0, 0, 0, 0)')) p = p.parentElement;
     return bg === 'rgb(255, 255, 255)';
   }).length
   ```
   Spot-check that `Filters`, `Group By`, the scope stepper and a table-row button all measure
   fill `rgba(0,0,0,0)` / stroke `rgb(171,179,194)`, identical to the search field. Dark must
   stay `input/30` + `rgb(54,60,69)`.
5. **Table footer rhythm** — the band must measure **36px** with a **16px** gap above it and
   **16px** below, and no divider between table and footer. Then narrow the viewport to ~768px
   and confirm the `Showing …` label stays on one line (20px) and the band does not overflow.
6. **No `#cad1db` anywhere in light.** Sweep the rendered DOM — this must return `0`:
   ```js
   [...document.querySelectorAll('*')].filter(el => { const cs = getComputedStyle(el);
     return cs.backgroundColor === 'rgb(202, 209, 219)' || cs.borderColor === 'rgb(202, 209, 219)'; }).length
   ```
   Spot-check the segmented view tabs, the active view-switch tool and the selected nav item —
   all three must be `rgb(237, 237, 237)`.
7. **Navigation states** — in light, a selected nav item must measure `rgb(237, 237, 237)` and
   a hovered one `rgb(225, 225, 225)`; hovering the *selected* item must deepen it to the hover
   value. Dark must stay `rgb(54, 60, 69)` for both. Also confirm the utility actually
   generated — Tailwind v4 nests utilities in `@layer`, so a naive `styleSheets` scan reports a
   false negative; recurse into `cssRules`, or just grep the built CSS for
   `hover\:bg-sidebar-accent-hover`.
8. **Both modes** — `grep -rn "bg-muted" src/components` should return only
   `bg-muted-foreground` (a text colour, unaffected), the `FoundationsReference` swatch page,
   and `ModalsDemo` — dialog content fills with `bg-background` (`#080808` dark), against which
   `bg-muted` is genuinely visible. **Do not sweep those.**
9. **Token resolution** — after applying §1a, resolve every token in both themes and diff
   against the pre-refactor values. It must be 134/134 identical; the refactor moves where a
   value lives, never what it is. Then confirm the payoff: setting only `--fp-emphasis` must
   move `--accent`, `--secondary`, `--muted` and `--sidebar-accent` together.
10. **Build** — confirm `bg-rail`, `bg-fp-surface-1b` and `bg-brand` survive into the generated
   CSS for every entry point. Generated CSS collapsing to ~20 kB means §1e was dropped.
11. **Typecheck and lint** — `npx tsc -b --noEmit` and `npx eslint .` must pass.
12. **When measuring across themes, wait ~2s for `transition-colors` to settle before reading.**
   Reading immediately returns mid-transition values — this produced four false readings during
   this work, two of which looked like real contrast failures.

### Keeping the prototype in step

`prototypes/unified-view/DateFilter.tsx` is the prototype's own stepper (it adds a calendar
popover the DS component does not have), and `ListFilters.tsx` / `FuelOrdersFilters.tsx` are
its filter triggers. All three had carried the call-site patch; all three had it removed when
§2e moved the fix into the variant. The four list screens also carried `className="h-9"` on
their pagination; that came out when §3a made it the default.

**When a DS control changes, check the prototype for a richer fork of it, and when a DS default
changes, check the prototype for a now-redundant override** — this loop is what §7 exists to
track.

### Regenerating the shareable preview

Two portable single-file builds live at the workspace root. Regenerate **both** — they are
separate bundles and a token change lands in each:

```
npm run build:single   && cp dist-single/index.html  ../FP-DS-2026-preview.html
npm run build:unified  && cp dist-unified/index.html ../FP-DS-2026-unified-view.html
```

`FP-DS-2026-preview.html` is the DS gallery (~144 kB inlined CSS);
`FP-DS-2026-unified-view.html` is the Unified View prototype (~139 kB). If either collapses to
~20 kB the `@source` lines in §1f were dropped.

### The structural fix for all of it

§1a is the answer to the whole class. Five of the six bugs below are "a value written in more
than one place, or written where a semantic name belonged". A primitive layer makes the first
impossible and names the second. The lint rule is still worth building for what remains —
a fill resolving to the same value as its computed backdrop — but the duplication half is now
structural rather than a matter of vigilance.

### A pattern worth a lint rule

This work hit the same class of bug **six** times — a token whose value is byte-identical to
the surface it is painted on, or a surface token used where a semantic one belongs:

```
--muted     == --fp-surface-1b    row hover and selection invisible in dark
--popover   == --fp-surface-1b    the bulk bar's fill vanished
bg-muted    on the content layer  composited to zero
--accent    == --fp-card-1        bulk bar vs selected row, delta [0,0,0]
--secondary == --accent (light)   chips indistinguishable from control emphasis
bg-background on the content layer  51 outline buttons filled with the APP background
```

Every one was invisible in a screenshot and only showed up as an RGB delta. A check that fails
when a component's fill resolves to the same value as its computed backdrop would have caught
all six. The sixth is the strongest argument yet: it was found by sweeping computed styles
across a whole route, not by looking, and it had been patched at four call sites before anyone
noticed the real count was 51.

### Two JSX traps that cost real time here

- **`asChild` slots onto exactly ONE child.** A `{/* comment */}` inside
  `<PopoverTrigger asChild>` / `<DropdownMenuTrigger asChild>` counts as a second child and
  throws *"Primitive.button failed to slot onto its children"* — which blanks the page, not
  just the component.
- **Inside a ternary or `&&` branch use `/* … */`, not `{/* … */}`.** That slot is an
  expression, so a JSX comment plus an element is two things where one is allowed. Hit again
  while adding an explanatory comment above the footer wrapper in `DataActionControlOpt2`;
  `tsc` reports it as an unclosed JSX tag several lines away.
- **In `src/index.css`, a Tailwind class containing `*/`** (e.g. `bg-status-*/10`) **closes a
  CSS comment early** and spills prose into the stylesheet. PostCSS reports it far from the
  real line.
