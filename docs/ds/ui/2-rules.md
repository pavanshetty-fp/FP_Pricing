# UI · Rules & behavior  *(canonical)*

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
- **Controls cast no shadow either (Pavan, 2026-10-14)** — inputs, search,
  textareas, select triggers, outline buttons, toggles and segment groups,
  checkboxes, radios, switches, tabs, slider handles, pagination. Their
  border is the edge.
  Shadows stay only on what floats: menus, popovers, hover cards, select
  lists, dialogs, sheets, toasts, and controls laid over a map.
- **The selected page in pagination wears the table header's fill**
  (`bg-fp-table-header`), so the footer and the header match.
- **Rows per page is quiet** (2026-10-14): white, 12px type, 58 × 28px,
  6px corners — every table, every module.
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
  order statuses (Unassigned · Active · Blocked · Canceled · etc.), tag
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

**So default to flat and equal, every column sorting.** V1.1's program
list was the one exception (terms, coverage, economics) until Pavan flattened
it too on 2026-10-01 — no table in the prototype is grouped now. Group only
if he asks.

**And when a group goes, its heading hands meaning back to the labels.**
*Vendor* and *Customer* under a "Pricing" heading became *Vendor Price* and
*Customer Price* the moment the heading went, because *Customer* already
named a different column.

## 10h. One view, no view switch

Added 2026-10-01 (Pavan). A list that only has a table (Recurring Orders, the
Service setup lists) shows **no Table-view icon** — a switch with one position
switches nothing. Search by column and Show/Hide columns stay, because they
belong to the table, not to the switch. The icons appear only when there is a
second view (board or map) to switch to.

## 10g. Search by column is a row of boxes under the header — every table

Added 2026-10-01 (Pavan). The default in every module; 3PL Delivery Orders is
the reference.

- **The toolbar's Search-by-column button toggles a filter row** directly under
  the column headers — one "Filter…" box per column. Never the old popover
  that searched one named column at a time.
- **Each box matches what its column prints**, ignoring case. Boxes are
  combined with AND.
- **The row only exists while it is open.** Closing it clears every box —
  a narrowing with nothing on screen is not allowed.
- **The row stays when nothing matches.** The table shows no rows rather than
  being swapped for an empty state, because the boxes are what the reader has
  to change to get the rows back.
- **Table view only.** A board or a map has no columns to type under.
- **Saved views remember the boxes**, and a view that has them opens with the
  row showing.
- The button shows how many boxes are filled.

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

### The cells — `TableCell*`, never a bare form control

Added 2026-09-23, after one sheet ended up holding two different table shapes.

**`TableCellInput` · `TableCellSelect` · `TableCellCombobox` ·
`TableCellMultiSelect`.** They are `absolute inset-0` and **fill** the cell
rather than sitting in it, and their `<td>` is `relative p-0`. That is the
whole idiom: **a cell is editable ground, not a box with a field parked inside
it.**

- **A `<Combobox>` dropped into a `<td>` brings its own border, its own radius
  and its own padding**, so the row reads as a form with columns rather than as
  a table. Beside a table that uses the cell controls, the two do not look like
  the same component — because they are not.
- **Without `relative` on the cell the control escapes the table altogether.**
  Measured, not theorised: a fault cell landed at the top of the sheet, over a
  section heading two cards above it.
- **A read-only cell is plain text with the cell's own inset** (`px-3`), not a
  disabled control.
- **A CELL WHOSE VALUE IS A PAIR IS THE ONE CASE THE `TableCell*` SET CANNOT
  HOLD.** A duration is two numbers — `1 h 30 m` — and a single full-bleed
  field cannot be two boxes. Such a cell keeps the table's inset and row
  height and puts the pair inside it, at `h-8`, with the units as muted text.
  **It is a gap, not an exception: the answer is a `TableCellDuration` in the
  DS**, and the same shape will come round again for a range and for a
  quantity-plus-unit. Found 2026-09-23, on the service visits table, by the
  check that enforces the rule.

### Rows — adding one, and taking one away

Added 2026-09-23, after an audit of all seventeen editable tables in Unified
View. The shape above was holding; the BEHAVIOUR had drifted, table by table.

- **A new row goes at the bottom**, every time. The add hangs below the last
  row, so the row it makes appears where the eye already is.
- **The cursor goes into the new row's first editable cell.** The add is
  followed by the answer, not by a hunt for the row it made. Found broken in
  all seventeen tables — after every add, focus stayed on the add button. The
  `TableCell*` controls take `autoFocus`; it acts on MOUNT only, so passing it
  to the row just added never re-focuses a row that was already there.
- **An add with nothing left to add is not rendered** (see "When the add cannot
  aim"). The sales product table used to fall back to the first product, so the
  last press made a duplicate line.
- **A blank row is not added twice.** If the table already holds an unfilled
  row, the add takes the cursor to it. Two blank rows is a table asking the same
  question twice, and on the 3PL vendor table the second one could not be
  removed at all.
- **A row goes with a bin** (`Trash2`, `ghost`, `icon-sm`), quiet until the row
  is hovered or the bin is focused, in an **unnamed trailing column 52px
  wide**.
- **A row's delete asks first — the tick is the "are you sure?"** (Pavan,
  2026-09-23). The bin swaps, in place, for ✕ cancel over ✓ confirm filling
  the cell (Figma 28133:1526); the cursor lands on ✕, and Escape or clicking
  away takes it back. No dialog — the question is asked where the finger
  already is. **`TableRowRemove`** in `form-layout/table-cells.tsx` is the only
  way a row is removed; a bin that deletes on one click fails the eval.
- **The bin says what it removes.** `Remove {name}`, or `Remove {kind} N` while
  the row is blank — "Remove fee 2", never "Remove row 2". Eleven identical
  announcements down a table are eleven questions for a screen reader.
- **Whether the last row can go depends on whether the table may be empty.**
  A table the record cannot do without (products on an order, assets on a
  job) keeps no bin on its last row. A table that may be empty (fees, parts,
  charges) lets the last row go, and the empty table is padded text.
- **A hanging add's label is singular** — "Add product", "Add fee". Each press
  adds one row.

### Picking several makes rows

Pavan, 2026-10-15 — after the order form's asset cell made the customer open
the list once per tank.

- **IN ANY TABLE THAT ADDS ROWS, the picker that names the row takes
  several at once** (Pavan, 2026-10-16 — said three times; now absolute):
  an asset or tank, a peripheral, a partner, a product line, a loading
  account, a part, a fee, an event — whatever the table lists. Checkboxes,
  a footer with the count and **Apply**. The first pick
  fills the row it was opened from; **each other pick becomes its own row**,
  right under it, in the order picked. `multiple` on `TableCellSelect` /
  `TableCellCombobox` is the only way.
- **Only from a BLANK row.** On a row that already names one, the question is
  "which one instead" — a single pick that swaps it.
- **What is already on another row shows ticked and locked**, not hidden —
  the list keeps its length, and a reader looking for it finds it is there.
- **A new row starts like the row it came from** — the same defaults, its own
  facts filled from the pick (an asset's product).
- **Where several values belong IN ONE CELL** — work types, product
  categories, tags — the cell stays one cell (`TableCellMultiSelect`). Rows
  are made only when each pick is a row of its own.
- **The checkbox is the DS checkbox, its tick in `primary-foreground`.** A
  list row mutes bare icons; the tick names its color so it never goes gray
  on the filled box.

- **Every other picker in such a table is a value INSIDE a row** (a line's
  product, its loading account, a condition, a unit) and says so in a
  comment carrying `ONE VALUE` and why. There is no third kind.

**Checked, not remembered.** `npm run eval` → `table-rows`: a file that adds
rows and focuses nothing, a remove with no subject, a remove that does not
ask, a local cell control, and **any picker in a row-adding table with
neither `multiple` nor a `ONE VALUE` note** — whatever its label.

### There is no "last band" alternative to the hanging add

**The add hangs. Always.** A rule in Unified View's own layouts document said
the opposite — *"the Add row is the table's last band … a flush table inside a
card does not have a squared corner"* — and its eval asserted that version, so
for a month the app had both shapes and the check blessed the wrong one.

**The parenthetical was the error: the card squares its own corner.** That is
precisely what `SheetSection`'s `hanging` does.

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

## 10e. A row of fields fills its row (Pavan, 2026-10-16)

**Fields that sit side by side SHARE the width they are in.** A row of two
selects is a two-column grid of `1fr` (or two `flex-1`); a column of fields
beside something else takes `flex-1` of what is left. Never a fixed pixel
width on a container that holds fields — the sheet grows, the fixed column
does not, and two narrow fields sit beside empty space (the recurring rule's
Repeat / Times a day, 2026-10-16).

- **Equal shares** unless a field's content says otherwise; **24px** between
  fields in one row (16px only in a dense table-like grid).
- **The row ends where its container ends** — the last field's right edge is
  the container's right padding.
- **A fixed width is allowed only for a control with a natural size** — a
  date, a time, a search box the DS sizes — and it says so in a comment
  carrying `FIXED WIDTH` and why.
- **When a sheet's width changes, every row in it is re-read** at the new
  width before the change is done.

**Checked, not remembered.** `npm run eval` → `fields-fill`: a container with
a fixed pixel width that holds fields and no `FIXED WIDTH` note.

## 10i. Top off, then the quantity LAST (Pavan, 2026-10-16; order 2026-10-20)

**Qty is the last column of a lines table, and Top off sits just before
it** — it replaces the number, so the two are never apart, and the figure
the row leads to ends the row. Every table with a Top off column, every
module (3PL Delivery Order, Create recurring rule, recurring delivery;
Customer Portal order create + detail and its recurring rule):
Asset · Product · (anything else — readings, accounts) · Top off · Qty · bin.

- **Header:** the label "Top off", then its **select-all checkbox** at the
  right edge (`justify-between`) — ticked when every line tops off,
  indeterminate when some do.
- **Rows:** each tick **right-aligned** (`justify-end`) under the select-all.
- **Width:** `CELL.topOff` (104) in the sheet's `fit`; the total row's label
  spans every column before Qty, the total sits under Qty.
- Ticking a row shuts its Qty cell ("Top-off"); the typed number is kept for
  unticking.

**Checked, not remembered.** `npm run eval` → `table-rows`: a Top off header
that is not the one right before the table's Qty header.

## 10j. Nested layers — the expandable row (Pavan, 2026-10-17)

A row that holds a child dataset (an order's tanks, a series' deliveries)
opens it **one layer down**, in the DS treatment (`tables-layout/DataTable`;
`ListTable`'s `renderExpanded`):

- **The chevron leads the first cell** — a small muted `ChevronRight` that
  turns down when open. Never a column of its own.
- **The open parent** keeps the row-hover tint and **drops its bottom
  divider** Every cell of it wears the tint — a pinned (sticky)
  cell such as the row's open chevron included, so nothing at the row's end
  sits as a white box (Pavan, 2026-10-19).
- **The layer is WHITE** — the content layer (`bg-fp-surface-1b`), end to end
  across the row, its inner table pinned to the visible width (sticky left)
  so its columns don't scroll away with a wide parent.
- **One green rail** — 2px, `status-success/70` — on the open parent's first
  cell and down the layer's left edge. Both are drawn the SAME way (a
  `before:` strip at `left-0`), never one as a border and one as a strip: a
  border in a collapsed table sits half outside the cell and the two lines
  step by 1px.
- **Inside:** muted `text-xs` headers, `px-4 py-3.5` cells, rows split by
  `border-border/60`; the row's own thing in foreground, secondary values
  muted.

**Stacked lines instead of a nested layer (Pavan, 2026-10-21).** Where a record's
children are few and short (a Portal order's tanks), they are not nested: each child
is a line INSIDE the record's row, and the child columns (tank, product, quantity,
level, on fulfilment, days to empty, battery) line up line for line; the record's
own cells show once, at the TOP of the row, level with the first child line
(ListTable `alignTop`). Chosen over one band per child.

## 10k. Metric icons — one icon per term, one style (Pavan, 2026-10-20)

**Use them on metric / figure cards and dashboard units** — wherever a card
leads with a number (deliveries, products, gallons, ship-tos and the like).
The set lives in `src/components/ui/term-icons.tsx`; the DS showcase page is
**Metric Icons**.

**The set** — `TERM_ICONS`, one icon per term, the same in every module:

| Term | Icon | Drawn as |
|---|---|---|
| Deliveries | `TruckIcon` | Lucide truck, soft fill |
| Products | `DropIcon` | a drop holding fluid to ~60%, wavy level |
| Gallons | `DrumIcon` | a metal fuel drum (oval lid, straight sides, rounded base) ~70% full, wavy level |
| Ship-tos | `PinIcon` | Lucide map pin, soft fill |

**The style** — every icon, and any new one added to the set:
- Lucide's **24 grid**, round caps and joins, `currentColor`.
- A **soft fill of its own color** (22%) inside the outline.
- Anything that holds liquid fills **only to its level**, and the level is a
  **wave**, not a straight line — so it reads as liquid. Nothing else inside
  the shape (no ribs, no hatching).
- Wherever the app names one of these terms — a figure, a menu item, a
  heading, an activity entry — it draws that icon and no other.

**On a metric card** — `<MetricIcon icon={TERM_ICONS.gallons} />`:
- a **48px `rounded-lg` tile** in the accent at **6%** (`bg-accent-violet/6`),
  the icon **28px**, **1.75** line, `text-accent-violet`;
- it sits **beside the figure, centred on the figure-and-change unit** (the
  number, its change chip and the "vs …" line), not in the title row;
- the card's own design (title, figure, chip) is unchanged — the icon is
  added, not a new card.

**A change against a period** — the chip after the figure:
`bg-fp-trend-up-bg` / `text-fp-trend-up` (#3aac73 on #e7f6ef) with a small
filled ▲ when up, `bg-fp-trend-down-bg` / `text-fp-trend-down` (#b74e6d on
#fae7ec) with ▼ when down, `bg-muted` gray "Same" — and "vs N the previous …"
under it. The same green for a positive change everywhere in the app.

**ONE marker, everywhere (Pavan, 2026-10-20)** — `<TrendChip>` in
`src/components/ui/trend-chip.tsx`. Every figure card in every module uses
it: no arrows in circles, no orange, no `destructive` red for a fall. Red is
always `--fp-trend-down`. `good` sets the color when down is good news (late
orders down → green ▼). **No trend lines on figure cards** — the term's
`MetricIcon` sits there instead (Orders overview, 2026-10-20).

## 10l. Alert banner motion — every pill sweeps, every CTA shines (Pavan, 2026-10-20)

In the DS `AlertBanner` (Sales Orders, Service Work, Portal Orders and
Invoices — one component, so one behavior):
- **Every pill sweeps** — the tag pill ("Needs action", "Overdue", "At risk")
  and the count pill — whatever its kind: a bar in a deeper shade of the
  pill's own color (red, orange, blue, green) moves through the fill. **Only
  while the banner is collapsed**; opened, the list is the attention.
- **Every CTA the banner carries shines** — the banner's own action and each
  item's action ("Create Order Request", "Order the rest") get the white
  `OutlineShine` on their outline (2px ring centred on the 1px border, 50%
  band). The banner adds it; screens don't.
- The ghost "View details" / "Clear filter" has no outline, so no shine.
- The dashboard's **Attention required** tiles are a different pattern by
  design (red outline shine on the banner) — not an `AlertBanner`.

## 10m. Delivery window & preferred time; Recurring order (Pavan, 2026-10-20)

**One timeline for every window** — `DeliveryWindowTimeline`
(`prototypes/unified-view/DeliveryWindowTimeline.tsx`). The label sits outside;
inside an input-style outlined box: the window on a full-day track (hours every
3), each preferred time a light-blue bar under it (drag to move, drag an end to
size, ✕ to remove, press its time to type start and end to the minute). Bars
never overlap; with no free half hour, + says "Delete or adjust the current
preferred time to add a new one." The add is the table's hanging +.
Used on: 3PL Delivery Order and Create recurring rule (per ship-to), Service
Work service order (scheduling window), Portal order, ship-to and recurring
rule.

**Recurring order is an optional section, as Load Order** —
`RecurringOrderSection`: a dashed "Add Recurring Order" row, then the
recurring rule's own frequency unit (`RuleFrequencyPicker`) in a box; the
section's minus removes it. Used on: 3PL Delivery Order, Portal order.
Service orders don't repeat (Agreements / Maintenance do), Sales orders have
no window.

## 10n. Accessibility panel — text size and contrast (Pavan, 2026-10-21)

**There is no header theme icon any more** (2026-10-21) — Light / Dark is
the first control of the Accessibility panel. Everything lives in the
**Accessibility** item at the foot of the main navigation (every module —
`ModuleSidebar`). Its panel opens beside the nav, changes the page live, and
is saved:

In this order (Pavan, 2026-10-21): Theme on top; Text size; Stroke contrast and Contrast (Text color removed, 2026-10-24); a divider; Display size. Text size and Display size are STEPS like Android's "Display size and text" (Pavan, 2026-10-23): − · a track with a dot per step · +. No preview card — the page itself is the preview.
Reset is the header's icon alone.

| Control | Range | Moves |
|---|---|---|
| Theme | Light · Dark | the same switch as the header's |
| Text size | 6 steps, 100% – 130% | **the text only** — type ramp and weights. No box widens (nav, lanes, cards, sheets, table columns keep their width); text wraps onto the next line and the card or row grows taller — except record numbers and dates, which stay on one line and widen their table column just enough (2026-10-23) |
| Stroke contrast | Default → Maximum | rims, dividers, field borders, focus/selection rims, lanes, charts — toward black. **Strokes only**: a field's fill (`--fp-field-fill`, `-hover`) and a switch's off-track (`--fp-switch-track`) used to borrow the field-border color (`dark:bg-input/30`) and now have their own fixed tokens — never fill with a stroke token |
| Contrast | Default → Maximum | **whites stay white, grays go darker** toward dark gray — white cards on a dark lane; the last layer (behind everything) becomes a **plain darker gray**, not a deeper beige; the **selected nav item** goes much darker; text on those grays goes near black to keep 7:1. **At 80% and up (light theme) the frame jumps dark** — the shell ground behind everything and the selected/hovered nav item go near black and what sits straight on them (the FleetPanda name, the top bar's icons, the selected item's label) turns white. It jumps, not fades: no gray between ~#5a and #95 reads at 7:1 with black or white. Mark anything new that sits on the ground with `data-fp-on-frame` |
| Display size | 5 steps: 50 · 75 · **100** · 125 · 150%, 100% in the middle; no Auto (2026-10-23) | everything, by one zoom |
| Text on a color fill | automatic | white or dark, whichever reads better. On the fixed brand orange it's held to AA (identity) |

The WCAG point sits at each contrast slider's middle (not labeled); Maximum
is its far end.

**Maximum** (the far end, past WCAG — `.a11y-max` blocks) darkens every rim
and divider to 5:1+ in light (brightens in dark), deepens the surface steps,
and pushes text further while keeping it at 7:1 on the darker surfaces.

**Always reachable, always resettable (Pavan, 2026-10-21).** The panel is
pinned beside the nav at the window's foot (not a measured popover, which a
zoomed page misplaces) and never wider or taller than the window. **Reset to
default** sits at its top; the same reset is **⌘⌥0** (Ctrl+Alt+0) anywhere,
and `?a11y=reset` in the address. When a Display size leaves the window
narrower than the app's 1280px layout, the **page scrolls sideways** (with a
visible bar) instead of clipping — every control stays reachable.

**The WCAG point** is the `.wcag:not(.dark)` / `.dark.wcag` blocks in
`src/index.css`: text **AAA 7:1** on every surface, controls and graphics
**AA 3:1**, every rim and divider **3:1+**, surfaces a full step apart (so
cards hold up mirrored or projected). Each value is the nearest color of
the **same hue** that clears the bar. `src/components/theme/a11y.ts` mixes
each token between the two points either side of the slider; text on a fill
switches at a quarter rather than blending.

**Checked, not remembered.** `npm run eval` → `wcag-contrast` measures every
pairing the screens actually use — each class string that sets a background
and a text color together, with their opacities (68 today) — plus a hand
list for rims, dividers, lanes and charts, and fails any WCAG or Maximum pair
under its bar; `npm run wcag` prints Light, Dark, WCAG and
Maximum for each theme.

**Anything sized to the window** uses `var(--fp-vw)` / `var(--fp-vh)`, never
`100vw` / `100vh` / `h-screen` — a zoomed page multiplies viewport units too.

**A new fixed width that holds text** is written `w-[calc(Npx*var(--fp-scale))]`
(inside a sheet), or uses `--fp-nav-k` / `--fp-lane-k`; a new kind of unit is
added to `UNITS` in `a11y.ts` so it's fitted too.
**A new color token** gets its WCAG light and dark values, a pair in
`scripts/eval/wcag-contrast.mjs`, and a place in `a11y.ts`'s Stroke, Background or
Text list (or `ON_FILL` if it's text on a fill).

**The nav item's icon** is `AccessibilityIcon` (`src/components/theme`) — a dot with
five widening rays fanning right, filled in the text color (Pavan, 2026-10-22).

## 10o. Dark theme layers — separated by default (Pavan, 2026-10-21)

The default Dark ladder was a few RGB steps apart (a board card on its lane:
1.08:1, no card rim), so layers ran together. It's now spaced so each layer
reads on its own, and the Accessibility sliders only go up from here:

| Layer | Was | Now |
|---|---|---|
| Ground / board lane (`--fp-surface-base`) | #0f1216 | #07080a |
| Content layer, cards, sheets (`--fp-surface-1b`) | #161a20 | #1d222a |
| Inset panel (`--fp-surface-1a`, drawer) | #20252c | #272c35 |
| Raised (`--fp-card-1`, emphasis, chip) | #282d35 | #2e343e |
| Quiet step (`--fp-card-2`, table header, nav panel) | #1b1f25 | #23282f |
| Card rim (`--fp-outline-1`) | transparent | #3d4550 |
| Divider (`--fp-stroke-hairline`) | #242930 | #343b45 |
| Field border (`--fp-stroke-field`) | #30363f | #474f5b |
| Hover rim (`--fp-outline-2`) | #3a414b | #555e6b |
| Muted text (`--fp-ink-3`) | #8f96a0 | #a0a7b0 |

Card on lane 1.08 → 1.25:1, rim on lane none → 2.1:1, field border 1.3 →
1.7:1. Light is unchanged.

## 10p. Views, sorting, display icons, the date picker (Pavan, 2026-10-21)

**Views.** No preset view tabs (Transport, Tank Wagon, Lubes…) and no line-of-service
segment in any module — Line of Service, Business (3PL) and Order Kind (Sales) are
filters in the Filters panel. The first tab is **All** (never "Default"). A saved
view stores its filters **and** its display (table / board / map) and opens in it.

**Filters remember; views name themselves** (Pavan, 2026-10-21). The Filters panel
leads with **Recent history** — every set applied on that list in the last 24 hours, by
category, newest first; a press puts the ticks back, Apply applies. It is absent when
there is none. **Save view** suggests a name from the filters on (placeholder; → or Tab
takes it to type on; Save with the box empty saves it): the business (or the line of
service when no business), then the other facets in panel order, at most three parts
joined " · " — "Transport · Priya Raman". A saved view with changes shows an **update
icon** beside its name — the two-arrow refresh glyph (`RefreshCw`), gray; tooltip
"Update changes". Logic: `filterMemory.ts`.

**Sorted column, in grays.** Any `th` with `aria-sort` sits a shade darker
(`--chip`) with a semibold, full-ink label (rule in `index.css`). The icon is an
arrow (`ArrowUp` / `ArrowDown`), not a chevron; unsorted columns keep a faint
`ChevronsUpDown`. ListTable gives the sorted column's cells a very light gray
(`.fp-sorted-cell`, half the row hover). No brand color, no underline.

**Column widths come from the content, and the table always fills** (Pavan,
2026-10-21/22). A column starts at its widest RENDERED cell — text, "+N" chips, pills,
day grids — plus padding, never narrower than its header + sort arrow, rounded up to
10px. NO EMPTY SPACE ON THE RIGHT, EVER: when the table is narrower than its frame, the
spare width goes to the columns that hold the most, each in proportion to how far it is
wider than 120px — an icon (Notes), a count or a code stays put; a name, an address, a
contact takes the room (ListTable does this for every list). Wider than the frame, the
table scrolls. Customer starts at 250, Ship-to / Ship-Tos 170; rule tables give Schedule
and the column before it +20. Hand-tuned widths per module come from Pavan. Numbers:
`docs/ds/ui/column-widths.md`.

**Every table page is the standard list** (Pavan, 2026-10-22) — `StandardList`
(`prototypes/unified-view/StandardList.tsx`): the view row (All, saved views, Export),
search + Filters, the chip shelf, the view bar, the table, pagination. The Customer
Portal's lists and Service Work's reference pages (Technicians, Price Book, Parts,
Agreements, Maintenance, Compliance, Performance) use it; their Filters come from their
own category columns (2–12 shared values, not the first column, not numbers/dates).

**Everything is left-aligned** (Pavan, 2026-10-22) — every column, header and cell,
numbers and money included, in every table (lists, nested and sheet tables, dashboard
tables, statements). Only action buttons sit at a row's end.

**Display icons and their tools** (Pavan, 2026-10-22): `Table2`, `KanbanSquare`,
`Map`, the active one on the chip fill. The ACTIVE view's own tools sit in a row just
BELOW the three icons, joined to the active icon by a routing line (drops from under
the icon, turns right into the tools): Table — Search by column, Show/Hide columns;
Board — Card fields; Map — none. A one-view list keeps its tools in the row. The
toolbar is top-aligned so the search row stays level with the icons. Filter chips share the
tools' row — they rise into it beside the routed tools rather than starting below
them (`[data-routed] + [data-filter-chips]` in index.css). **THE VIEW BAR — every list** (Pavan, 2026-10-22,
after a trial on 3PL Delivery Orders): the view's tools sit in a bar ON the view —
above the table header (`ListTable topBar`, or the hand-built recurring tables' frame),
or above the lanes (`BoardWithBar`). LEFT: a statement — "62 orders · Thu, Oct 22,
2026" (table), "62 orders across 9 of 9 lanes · …" (board, replacing the footer line),
"150 customers" where a list has no date. RIGHT: the view's tools — Search by
column, Show/hide columns 4px apart like the view icons (table); Card configuration (board) — each ICON ONLY,
its name sliding out on hover or focus and STAYING out while the tool is on (column
search open, its menu open), 12px in the muted gray (never black), no fill or outline.
Wiring: `useViewBar()`, `ListToolbar viewToolsInto + viewStatement`, `ViewStatement`.

**One date picker** — `src/components/ui/date-picker.tsx`, used by every screen that
picks a date (filters and form fields, every module):

- Left rail of presets: All dates (when the list passes `all`), Today, Yesterday,
  This week, Last week, Last 7 days, Last 30 days, Next 7 days, Month to date,
  Last month, This quarter, Custom range. The preset the draft is on is selected.
- Two months; range ends filled, days between tinted. One click + Apply = one day.
- Footer: typed start → end (MM/DD/YYYY), live "N orders match" (`count`), Reset, Apply.
  Nothing changes until Apply.
- `select="single"` for a field that holds one date: day presets (Today, Tomorrow,
  Yesterday, In 7 days), one month, one typed date.
- Parts: `DateRangeFilter` (toolbar stepper, prototypes), `DateRangePopover`,
  `DateField` / `DateKeyField` (form fields), `DatePopover` + `DatePanel` (drop-in for
  a Popover + single Calendar), `dateWindowOf(keys)` → `all` + `count` for a list.
- Not used: the technician phone app keeps its full-width calendar (no room for a rail).

## 10c. The accent — violet (Pavan, 2026-10-16)

**The system has ONE accent: violet `#8b5cf6`** — tokens `accent-violet`,
`accent-violet-foreground` (white), `accent-violet-soft` (12% wash),
`accent-violet-ink` (readable text). It is the second color after the brand,
and the two never trade jobs:

- **The brand (orange) says "you chose this"** — selection (`--selected`),
  focus, the product mark, the current step of a record.
- **The accent (violet) HIGHLIGHTS** — it marks what the reader should notice:
  - **a schedule's days and dates**: every frequency picker marks a picked
    day, date or month with the solid accent and white text, AND every
    schedule shown in a list (`ScheduleCell`, the recurring orders and rules
    tables, the portal's Recurring Orders) lights its days the same way — the
    form and the list say it identically;
  - recommendations (the 3PL rule recommendations' border and counts);
  - what needs the customer (the portal's Attention required tiles, via the
    `violet` pill).
- **One violet.** `fp-lane-violet` and the `violet` pill map to the accent;
  never a second violet hex. `fp-lane-purple` (#6366f1) is an indigo LANE
  color, not the accent.
- **`--accent` is not the accent.** It is shadcn's name for the gray hover and
  keeps that job.

## 10b. The DS ships hues; the application binds meaning

Added 2026-09-18. The DS already says a chip renders neutral until a usage rule
binds a color to a meaning (§9). This is the other half of it: **where that
binding is written down.**

- **Every application keeps ONE color-mapping table**, in its own docs, listing
  each hue against the single thing it means there. Lane fills, code-disc tones,
  status-chip channels, pastel badges — all of it, in one place, so a hue cannot
  come to mean two things in two modules of the same product.
- **A mapping is a decision, not an inheritance.** `--fp-lane-green` is a green,
  not a "done" green; if two modules both need a terminal lane they should agree
  because the table says so, not because both authors reached for the same
  swatch.
- **Four tone channels, and a lifecycle longer than four shares them.** That is
  allowed and is not a defect — the label always says which stage it is, so
  color is never the only carrier. What is NOT allowed is two stages sharing a
  channel when one of them is the exception: the failure channel belongs to the
  one state where something has gone wrong.
- **A count of one meaning is a badge nobody needs.** "Normal" priority, a
  status that repeats its own lane heading, a placing on a board of one — if
  every row carries the same chip, the chip says nothing. Render the absence.

### A status is coloured by its KIND — what the reader should do about it

Added 2026-09-23, from the service board; applies to every module of every
application — sales, 3PL, service and whatever is added next. Confirmed by
Pavan on screen before it was written down.

**Five kinds. They are about what the reader has to do, not about where the
status sits in its lifecycle.**

| Kind | Means | Drawn in | Examples |
|---|---|---|---|
| `caution` | **waiting on somebody** — pending, awaiting, not yet looked at | amber | Parts pending · Needs approval · Quoting · Unassigned · Paused |
| `info` | **simply true, asks nothing** — somebody is on it, it is under way, it exists | blue | Assigned · Ongoing · Scheduled · Active |
| `success` | **done** — the thing it was for has happened | green | Completed · Delivered · Synced · Finalized |
| `critical` | **a warning**, or a state important enough to change a plan | red | Blocked · Declined · Compliance expired · Over limit |
| `neutral` | **neither** — a record that exists and is not yet a state; an end that is not an outcome | gray | Draft · Canceled · Ended · Inactive |

- **A column is a place, not a state.** Every badge gray made the lane the only
  thing carrying meaning, and in one lane a job waiting on parts and a
  brand-new job looked identical. A dispatcher scans a board for the amber ones.
- **Being active is `info`, not `success`.** Nothing has been achieved by a
  customer existing. Green is kept for a thing that is DONE, so that it means
  something when it appears.
- **Canceled is not red.** It is a terminal non-event, not a problem to solve,
  and a lane of red badges would be the loudest thing on the board saying the
  least. Red stays for the state that genuinely goes wrong — and a lifecycle
  with no such state has no red, which is correct rather than an oversight.
- **A decision is not a fault.** Paused and Skipped were red; somebody chose
  them. Paused is `caution` (it waits on somebody to resume), Skipped is
  `neutral`.
- **A price in is not a thing done.** "Quotation received" is `caution`: it is
  now the dispatcher's turn to award. `success` is Finalized.
- **The normal state says nothing.** Maintenance "OK" is `neutral`; the
  exceptions carry the color.

**An application declares KINDS, never tones.** `StatusChip`'s tones are the
DS's channels and their names are hues in disguise (`processing` is amber). A
map written in them is a map written in colors — which is how "Assigned" came
to be green in one module, amber in another and blue in a third, each author
reaching for a swatch. The DS's `StatusChip` ships `info` (blue, on
`--fp-banner-accent-info`) as its fifth channel for this rule.

**Checked, not remembered.** In Unified View, `prototypes/unified-view/statusKind.ts`
holds the kind → tone map and nothing else names a tone; `npm run eval` fails a
chip or a map that does (`scripts/eval/status-kinds.mjs`). Which kind a given
status is stays a reading — the binding table in the application's own docs.

## 11. A status is its word

Added 2026-09-17, from the 3PL vendor table. Enforced in `StatusChip`.

- **No dot beside a status label.** `text` (the default) and `soft` both draw
  the pill since 2026-10-09 (§11b), so in both the dot repeated a tone the
  chip was already carrying and spent 12px of a control whose whole job is to be
  small. The word is the status; the color is a second channel on the same
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

## 11b. Chips and badges are pills

Added 2026-10-09, from the Sales Orders table. Approved by Pavan on screen
before it was written down. The component is `Pill` (`ui/pill.tsx`).

- **Every chip and badge is a pill** — a status, a tag, a flag (Urgent, Over
  SLA, Needs approval), a placing ("Best price"), a "+N" overflow. One recipe:
  fully rounded, 28px tall (`h-7`), 12px side padding, 12px regular text, no
  border, a faint tint of the hue behind text in that hue.
- **A status column shows the pill, never coloured text alone.** `StatusChip`
  draws the pill for `text` and `soft` alike, so a status reads the same in a
  table cell, a sheet header and on a board card. `variant="dot"` is unchanged
  and stays opt-in.
- **Color is by KIND** (§10b) — `neutral`, `info`, `caution`, `success`,
  `critical` — so the same kind is the same color in every module. **The one
  exception is a color the user chooses**: where a module lets the user pick a
  color (Sales stages and order types, in Sales Settings), `color` takes the
  DS lane palette over the kind, and that choice is kept wherever the value
  shows.
- **Not pills:** a counter inside a button or a nav item (`BadgeNumber`), a
  code disc (`CodeDisc` — a type's initial, not a chip).
- **Removable chips are pills too** (Pavan, 2026-10-09): applied-filter chips,
  the column-search chip, the Export sheet's narrowing chips and form token
  chips take the pill recipe — 28px, fully round, `text-xs` regular on the
  neutral tint (`bg-muted`), label muted and value in body ink — with the ✕
  INSIDE the pill as a 20px round button (`hover:bg-foreground/10`). A count
  in a grouped filter chip is a small `bg-background` bubble. **Clear all sits right
  after the last chip**, `text-sm` muted with an underline on hover — never
  pushed to the far end of the row.

### Red is only for a warning (Pavan, 2026-10-16)

Red — a pill, a disc, a lane strip, a word — means **something is wrong or
about to be** (Urgent, Late, Overdue, Unpaid, Blocked, Over SLA). A TYPE, a
category, a lane that is just a place, Canceled: never red. A categorical
color that would land on red takes another hue (the rose type disc's pill is
pink; Service's Pump replace is green; Service's Canceled lane is gray).

### A table's Type column is a pill (Pavan, 2026-10-16)

Every list's **Type** column shows the type's FULL WORD in a pill of its
color — the Sales orders table's treatment — in 3PL Delivery Orders, Service
Work and wherever else a table lists a type. The round code disc (D, EM, M…)
stays only on BOARD CARDS, where space is a letter; its hue carries over to the
pill (`discTonePill`), so a type is the same color on the card and in the row.

## 11c. Skeletons shimmer (Pavan, 2026-10-10)

A loading block is the DS `Skeleton`: the `bg-accent` block with a light
sweeping left to right across it (`.fp-shimmer`, 1.4s, off with reduced
motion) — never a pulse. A loading PAGE is its parts as skeletons in their own
places (title, tabs, toolbar, table header and rows), so it arrives in the
shape it is about to take.

## 11d. The quiet pattern (Pavan, 2026-10-15)

**One decorative pattern, everywhere** — `QuietPattern`
(`src/components/ui/quiet-pattern.tsx`), for an empty stretch of a card
(first used under the portal dashboard's "Saved vs market" figures).

- **What it is:** a square grid of quarter discs (each cell's circle
  centred on one of its corners), grouped 2 × 2 so they meet as half discs,
  full circles and loose quarters; no empty cells. Seeded — the same every
  time.
- **Color:** two very light grays only — the foreground at 5% and 3%.
  Never a hue.
- **Size:** one scale (2.7). Do not resize it per card.
- **Placement:** the last child of the card's flex column, `flex-1`; it
  fades in from the top — clear in the top eighth, full only at the bottom. Whole tiles start at the **bottom-left**; the top
  and right may cut. Bleed it to the card's edges (`-mx-4 -mb-4` in a 16px
  card) so it meets the bottom, the left and any divider on the right, and
  round the corner it sits in with the card.
- **In a form — only when the form is short** (Pavan, 2026-10-16): when what
  a sheet holds takes **half the visible height or less**, the pattern fills
  the rest, to the body's left, right and bottom edges. Taller than that,
  no pattern and no space kept for it. `RecordSheet` does this itself
  (measured live — a form that grows past half loses it); never place it in
  a sheet by hand.
- **Decoration only** — `aria-hidden`, no pointer events, never behind text.
