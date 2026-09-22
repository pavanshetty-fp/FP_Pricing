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

- **A CARD'S RIM IS `--fp-outline-1`, AND THAT IS NOT NEGOTIABLE PER COMPONENT**
  (settled 2026-09-22). `SheetSection` drew `border-border` — the divider
  weight — round its outside for months, so a card sat heavier on the page than
  the lines inside it, and two components disagreed about what a card's edge
  is. In DARK the two tokens carry the same value (`#363c45`), which is exactly
  why it went unnoticed: it is a light-mode difference only.
  - **Open, and measured rather than guessed:** a card's title band still
    divides on `--border` (`#d4d4d8`), now heavier than the card's own rim
    (`#e2e5ea`). Defensible — a divider is structural and a rim is quiet — but
    nobody has ruled on it.
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

## 10c. Wherever data is a TABLE, the whole action unit ships with it

Added 2026-09-19, from the Recurring Orders screens. Revised the same day,
because the first version of this rule was written too small — see *How this
was got wrong*, below.

**A table is not a table plus optional chrome.** The unit below is what a list
IS in this app. A screen that ships a table without it has not saved anything;
it has made a second thing for people to learn.

### The unit, top to bottom

| Row | What it carries | Component |
| --- | --- | --- |
| **Scope shelf** | Preset/saved views · the line and the business inside it · Export · the create CTA | `FuelOrdersViewBar` + `useSavedViews` |
| **Toolbar** | Search · filters · the view switch · the column tools | `ListToolbar` |
| **Chips** | What is currently applied, said out loud | `FilterChips` |
| **The table** | | |
| **Footer** | The page position | `TablePagination` |

- **Scope is not a filter.** The line and the business say WHICH LIST; the
  filter panel narrows the list you are on. They look similar and sit near each
  other, and conflating them is how a reader ends up with a narrowing they
  cannot see. Default means *nothing applied*, and that has to include the
  scope shelf.
- **The CTA goes where creation actually happens**, which is not always this
  screen. A recurring order is created by ticking Recurring on a delivery
  order, so Recurring Orders' CTA navigates to that form rather than growing a
  second one. Two forms making one record is two forms that will drift.
- **Export means the rows you are looking at** — filtered, searched, sorted,
  all pages. One implementation (`csv.ts`), because the quoting is the same
  everywhere and a second copy is a second set of bugs.
- **The page position is not a count.** "24 rules" does not say which 24 and
  offers no way to the next page.
- **A control with nothing behind it is switched OFF by flag, never omitted by
  silence.** This is §10 at the toolbar's own level, and it is why `mapView`
  and `boardView` exist: a list of standing arrangements has no lanes and no
  pins, so it draws neither, and the omission is written down in the call.
- **A fact about the list that a count cannot carry sits beside the
  pagination** — "showing deliveries from today through one month out" is true
  of the list, not of any row.

### How this was got wrong

Worth keeping, because the failure repeats. Three screens shipped a table with
a search box and one filter button, then grew the rest of the unit one piece at
a time as each omission was pointed at.

The cause was not forgetting. It was **defining the unit from what had been
built rather than from the reference screen**. Delivery Orders has carried the
whole unit for weeks; nobody looked at it. Then the first version of this rule
wrote down that too-small definition as law, which would have propagated it.

**So: before shipping a list, open the closest existing list and match it row
for row.** The unit is the table above, not whatever the last screen happened
to need.

### Quick filters — when a split earns a control of its own

Added 2026-09-21. `ListToolbar` takes a `quickFilters` slot at the **head of
the left cluster — before the search box**, because it is the coarsest cut on
the row: it decides WHICH SET you are then searching and filtering inside.
Left to right then matches the order somebody actually narrows — pick the
book, then find the row.

A split belongs there only when all three are true:

- **It is exhaustive and short** — All plus two or three, no more.
- **A reader changes it several times a session.** Opening a panel, ticking a
  box and closing it again is the wrong amount of work for something flipped
  that often; anything flipped once a week stays a facet.
- **It divides the list into different jobs**, not different values. First
  party and third party operations are two books with two people worrying
  about them; a product is a value you look up.

**It matches the row it sits in — `h-8`**, the same as the search field and
the Filters button. A control a pixel off on a row of three reads as a
mistake, and nobody can say why.

**It is `variant="outline"` with the default `spacing={0}`** — the DS's own
joined segmented control, which draws the box round the set and the hairlines
between the segments. Without them the three read as three buttons that happen
to sit together rather than as one choice with three answers, and nothing on
screen says only one of them can be true.

### The composition is part of the component

The same failure recurred one step down. The scope shelf was added to both
screens and read as a crowded band, because the component went in without the
layout around it: the reference wraps the toolbar and the chips in one
`mt-4 shrink-0` shelf, and the table gets its own `mt-4` below that. Dropped in
bare, the view bar and the toolbar sat flush.

**A list's vertical rhythm is fixed, and it is part of the unit:**

```
<FuelOrdersViewBar … />              ← the scope shelf, flush to the header
<div className="mt-4 shrink-0">      ← ONE shelf for the toolbar + the chips
  <ListToolbar … />
  <FilterChips …>…</FilterChips>
</div>
<div className="relative mt-4 min-h-0 flex-1">  ← the table
<div className="mt-4 shrink-0">      ← the page position
```

Copying a control without the box it lives in is the same mistake as copying
half the controls. Take the composition, not the component.

## 10e. Group a table's columns only when the groups outlive the reader

Added 2026-09-21, from removing the groups on Recurring Orders V1 the week
after adding them.

A two-tier header reads beautifully and takes three things away:

- **A column can only move inside its group.** The reader who wants two
  columns side by side cannot have them if the groups disagree.
- **The header costs two rows on every screen**, forever, for a label that is
  read once.
- **It asserts a relationship** — that Terminal belongs with Partner and not
  with Product — which is the author's model, not necessarily the reader's.

`useTableColumns` and `TableColumnHeader` — order, widths, the resize guard,
the sort glyph, all of it — are unusable grouped, because the hook knows
nothing about groups. Everything has to be rebuilt by hand and constrained.

**So group only where the groups are the point** (V1.1's programme list is
one partner's terms, coverage and economics — three genuinely separate
questions about one row). Everywhere else, flat and equal.

**And when a group goes, its heading hands meaning back to the labels.**
*Vendor* and *Customer* under a "Pricing" heading became *Vendor Price* and
*Customer Price* the moment the heading went, because *Customer* already
named a different column.

## 10f. THE BOXED TABLE UNIT

> **READ `7-variants.md` §3 FIRST.** There are three table forms — in a unit,
> its own unit, and the list — and this rule is about the first. A table that
> IS its own box is not breaking it; a table that draws its own box INSIDE a
> card is. Stating this as one rule was the error, and the check that enforced
> it flagged two correct components on its first run.

Added 2026-09-21, settled 2026-09-22 on the Vendor table. **One shape, every
time a table sits inside a box** — a card, a `SheetSection`, a panel. Editable
or read-only, one row or forty.

### The shape, top to bottom

1. **The box's header band** — the section's title on its tinted strip. This
   is the unit's name.
2. **The table, flush.** No border, no radius, no inset of its own. Its edges
   ARE the box's edges, and its column-header row sits directly under the
   title band.
3. **The hanging add**, when the table can grow — a tab below the box's
   bottom-left corner, OUTSIDE it, with that corner squared so the two join.
4. **An acts band**, when there is an act on the whole list (Send, Export) —
   inside the box, right-aligned, with a top rule, and rendered **only when it
   has something in it**.
5. **A flag about the whole table rides the hanging row's right end** — level
   with the add, outside the card, nothing drawn around it. Winter additive on
   the Delivery Order table is the case: it is a property of the LOAD, not of
   a row, so it cannot sit in the table, and stacked below the add it read as
   a third thing rather than as part of the unit. (Added 2026-09-22.)
6. **Anything else is outside the box entirely**, with 24px to it — settings
   that are about the ORDER rather than about this table, a note. See the
   Vendor unit's two toggles, which are about the invitation.

### Why each part

- **A table set inside a padded card is a box in a box.** The card draws a
  rim, a tinted band and a rounded corner; the table draws its own a few
  pixels inside. Two lines say one thing, and the gap between them belongs to
  neither.
- **The add hangs rather than banding.** A full-width strip draws a rule
  across the whole card to carry one small act, and what it reads as is an
  empty extra row of the table.
- **The add is filled, not outlined** — the table's own header tint, so it
  continues the table. An outline is a second box under a card that already
  has one, which is the nesting this rule exists to remove.
- **A plus, and the words on hover or keyboard focus.** The row it adds is one
  of many. The `aria-label` is always the full phrase — the collapsed state is
  a visual economy, never a nameless control.
- **Square on top, rounded below**, or a radius shows a notch where the card
  ends.

### When the add cannot aim — it becomes a cell

**A card holding SEVERAL tables has no single bottom-left corner to hang
from.** The order's pricing unit is one band per product; a hanging add on that
card's corner could only ever add to one of them, and which one would be a
guess the reader has to make.

**So the add becomes a CELL OF THE MATRIX** — in the column that names the
thing being added, styled exactly like its siblings: a rule on top, no inset of
its own, and the button carrying the padding. It is not the full-width band
this rule forbids; it is one cell of a grid that happens to hold a control
instead of a value. (Added 2026-09-22, on the charge rows.)

**One control, not one per kind.** Three kinds of charge get one *Add charge*
with a menu, because three separate adds would be three controls for one act.

**An add with nothing left to add is not rendered.** Once every product has its
own loading account there is no further split to make, and a dead button with
no reason beside it is worse than no button.

### What the table does NOT give up

Its row rules, its header fill and its `tfoot` total stay. Those separate rows
from each other, which is a different job from separating the table from its
container.

### The parts that are not the table

Anything inside a flush box that is not the table brings its own 16px inset,
and the boundary where it meets the table carries the rule (`border-t` /
`border-b`). The rule belongs to the boundary, and only the call site knows
which side it is on.

**An empty table is padded text, not a dashed box.** A dashed rectangle inside
the card is the same nesting again.

### Where the flags live

On the components, not on every call site — `SheetSection`'s `flush` and
`hanging`, and a table that declares it fills its section. A rule nobody has
to remember is a rule that holds.

### Checked, not remembered

`npm run eval:boxed-tables` scans the source for every violation of the above
and exits non-zero. Run it with the layouts eval; it is the countable half of
that segment.

## 10d. A sticky table header needs separated borders

Added 2026-09-21, from the Recurring Orders tables. Cost an hour; worth the
paragraph.

Tailwind's preflight sets `border-collapse: collapse` on every table. In that
mode Chrome does two things that make a sticky header impossible to get right:

- it **ignores z-index on the table, the `<thead>` and the rows**, so a
  `sticky z-20` header holds its position but paints UNDERNEATH the body — it
  hit-tests on top and renders beneath, and a scrolled row can be read straight
  through it;
- it **refuses `position: sticky` on a cell**, so moving the stickiness to the
  `<th>` to get the z-index back means the header stops sticking at all.

Collapsed, a table can hold its header still or paint it above the body, never
both.

**So a table with a sticky header sets `border-separate border-spacing-0`, and
the header sticks on its CELLS** — `sticky top-0` on the first header row, and
`top-<height of that row>` on a second tier. The cost is that a border on a
`<tr>` stops painting, so the row rule moves onto the cells
(`[&>td]:border-b`), which is where the header's borders already were.

**A two-tier header also needs the line between the tiers.** Without it the
group words and the column words read as one crowded block instead of a heading
over its columns.

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
