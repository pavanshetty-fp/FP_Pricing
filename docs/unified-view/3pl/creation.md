# 3PL — creation: the components, and how each layer behaves

**This is the continuation document for Unified View.** Anything built or
changed in a 3PL creation flow is built against this file, and anything settled
in one is written back into it. Read `../map.md` first for what these documents
may and may not decide.

> **It is a MODULE document.** Most of what is here will turn out to be true in
> Service Work and in Fuel Orders too — that is expected, and it is still not a
> reason to write it in `docs/ds/`. **The second module to need a rule is the
> signal to promote it**, and until then a rule lives where it was earned. What
> `docs/ds/` owns is the component; what this file owns is **how 3PL assembles
> it to make a new record**.
>
> **When this file and the DS disagree, the DS wins and this file is wrong.**
> `evals-creation.md` exists to catch exactly that, and every assertion in it
> names the DS rule it is testing.

---

## 1. What "creation" covers here

Eight surfaces. They are the whole subject of this document, and every rule
below was taken off one of them.

| Surface | File | Shape |
|---|---|---|
| **Delivery order** | `BrokerOrderSheet.tsx` (draft mode) | `xxwide`, two columns, the big one |
| **Recurring rule (V1.1)** | `RecurringProgramCreate.tsx` | `xwide`, two **steps** |
| **Recurring rule (V1)** | `RecurringRuleSheet.tsx` | `xwide`, one step |
| **Invite a partner** | `InvitePartnerSheet.tsx` | `xxwide`, **level 2** |
| **A partner's quote** | `VendorQuoteSheet.tsx` | `wide`, **level 2** |
| **One delivery off a rule** | `RecurringDeliverySheet.tsx` | `wide`, **level 2** |
| **Asset movement** | `AssetMovementSheet.tsx` | `wide` |
| **A directory record** | `DirectoryRecordSheet.tsx` | `wide`, schema-driven |

**Creation is not a separate screen.** `mode="create"` on `RecordSheet` swaps
the title and the primary's label; everything else is the edit sheet. One
layout to learn, and no create form that can drift from the record it makes.

---

## 2. The seven layers

The rule for which layer a thing is at is **what it is allowed to decide**, not
how big it is. Every rule in sections 3 to 7 is filed against one of these.

| # | Layer | The thing | Owns |
|---|---|---|---|
| **L0** | **The sheet** | `RecordSheet` | width, depth in the stack, the header, the footer's three slots |
| **L1** | **The step** | a branch of the sheet body | which questions are askable yet, and the width they need |
| **L2** | **The group** | `SheetSection` (card) | one subject, its title band, whether it is optional |
| **L3** | **The band** | a row inside a group — a table, a picker, a note, an inset | its own 16px, and the rule on the side that meets a table |
| **L4** | **The field** | `SheetField` | the label, requiredness, the helper line |
| **L5** | **The control** | `Input`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `TokenMultiSelect` | one value |
| **L6** | **The cell** | a `<td>` in a group's table | one value **in a row that can be added and removed** |

**The layer decides where a change goes.** A behaviour that a second group would
want is not the group's — it belongs to L0 or to the DS. The defect this
taxonomy exists to catch is a rule written at L2 that every L2 then has to
remember: see the local `Card` in §8.

---

## 3. Spacing — by layer

**One scale, the 4px grid, expressed as Tailwind steps.** No creation surface
may introduce a gap that is not in this table.

| Layer | Gap / padding | Value | Why that number |
|---|---|---|---|
| **L0** body | between groups | `gap-10` **40px** | 2.5× the inner gap. This is the 40/16 pair and it is a rule, not a rhythm — anything between them makes a title equidistant from both and the boundary collapses |
| **L0** header | title row | `p-4`, `gap-2.5` title→chip | |
| **L0** footer | | `p-4`, `gap-3` between buttons | |
| **L0** footer banner | | `px-4 py-2.5` | shorter than the footer on purpose: it is a line, not a control |
| **L0** steps strip | | `px-4`, `py-2` inside | |
| **L1** | between a step's own top-of-body summary and the first group | `gap-10` | a step summary is a group's peer, not a header |
| **L2** card body | | `p-4`, `gap-4` | the form's unit |
| **L2** card header band | | `px-4 py-2.5` | |
| **L2** card | to the next card | inherited `gap-10` | never set per instance |
| **L3** inset | `SheetSectionInset` | `p-4`, `gap-4` | the padding a `flush` card gave up, handed back to one child |
| **L3** picker panel | | `mb-4` under it, rows `px-3 py-2.5` | |
| **L4** | label → control | `gap-1.5` **6px** | |
| **L4** | control → helper | `gap-1` **4px** | helper text is part of the control. At the field gap it floats between two controls and gets read as a label for the one below |
| **L4** | field → field in a grid | `gap-4` | `grid-cols-2 gap-4` is the creation default |
| **L5** | inside a control | `gap-2` / `gap-1.5` | |
| **L6** | cell inset | `px-3`, row `h-11` | a cell's inset matches the add row's, so the affordance lines up with the column above it |

**The two numbers to memorise are 40 and 16.** Everything else follows from
them.

### The one exception, and it is deliberate

`RecurringProgramCreate`'s target list sets `-m-4 mt-0` to cancel the card's
body padding, because each target row draws its own `p-4` and its own
`border-b`. **A list of rows inside a card is flush; a form inside a card is
padded.** Cancelling the padding with a negative margin is the symptom of a
card that should have been `flush` in the first place — see §8.

---

## 4. Colour — by layer

**The DS ships the hues. This document binds them.** Nothing in a creation flow
introduces a colour; it picks one off this table.

### Structure

| Job | Token | Layer |
|---|---|---|
| A card's own rim | `--fp-outline-1` — settled 2026-09-22 | L2 |
| A structural divider — a card's title band, a row rule, a table edge | `--border` | L2, L3, L6 |
| A field's boundary, and a rim that must beat a card's | `--input` / `--fp-outline-2` | L5 |
| A card's title band fill | `bg-fp-surface-1a` | L2 |
| A table header's ground, and a `tfoot` total | `bg-fp-table-header` | L6 |
| A quiet inset block — a "what happens on create" note | `bg-fp-card-1` | L3 |
| A step summary strip | `bg-fp-surface-1b` | L1 |
| Row hover / row selected | `--fp-row-hover` / `--fp-row-selected` | L6 |

**Never raise a stroke to make something read.** If a boundary is not reading,
the answer is spacing or a surface step. (`docs/ds/ui/2-rules.md` → Strokes.)

### Meaning

| Meaning | Token | Where it is allowed |
|---|---|---|
| Something is outstanding | `text-fp-banner-accent-caution` | **the pending strip only** |
| Everything is filled in | `text-fp-banner-accent-success` | the pending strip's clear state |
| A step is done | `bg-status-success` + `text-status-foreground` | the step strip's numeral |
| A collision worth catching | `text-status-failed` + `AlertTriangle` | inline, on the option that collides |
| A required field | `text-destructive` asterisk | L4 label only |
| The thing to press | `bg-primary` | **one per step**, and it is in the footer |

**Three rules about colour in a creation flow, and all three are about
restraint:**

1. **A field is never coloured for being empty.** An empty required field is
   reported by the pending strip, once, at L0 — not by a red rim on every one
   of them. A form that turns red while you fill it in is a form that tells you
   off for not having finished.
2. **Colour never carries a state on its own.** The clash badge has the word
   *Already on P-0043*; the step's tick has the numeral behind it; the pending
   strip has *Pending*. (`docs/ds/interactions/2-rules.md`.)
3. **A status is its word** — no dot beside a status label in any creation
   surface. (DS §11.)

---

## 5. Addition — the five shapes, and which one is right

The commonest thing a creation flow does, and the thing that had five
inconsistent answers before this list. **Pick by what is being added, never by
what is convenient at the call site.**

| # | Shape | Use it for | Component |
|---|---|---|---|
| **A1** | **The hanging add** — a tab off the card's bottom-left, outside it, filled with the table's header tint, a `+` at rest | **a row on a table that fills the card** | `HangingAdd` + `SheetSection`'s `hanging` |
| **A2** | **A cell in the matrix** — a ghost button in its own grid cell, rule on top, no inset of its own | **a row on a table whose card holds SEVERAL tables** | plain `Button variant="ghost" size="sm"` |
| **A3** | **The section aside** — `Button variant="outline" size="sm"` on the card's title row | **an item that opens a PICKER rather than appending a blank** | `SheetSection`'s `action` |
| **A4** | **The dashed CTA box** — a bordered dashed row, the name on the left, `+ Add` on the right | **turning an OPTIONAL SECTION on** | inline |
| **A5** | **A footer band inside the card** — `border-t`, a ghost `+` | **a second sub-unit inside a flush band** (a second loading account) | inline |

### The rules that decide between them

- **A1 is the default, and §10f is why.** A full-width band inside a card draws
  a rule across the whole card to carry one small act, and reads as an empty
  extra row of the table.
- **A2 exists because A1 cannot aim.** A card holding one table per product has
  no single bottom-left corner to hang from — a hanging add there could only
  add to ONE of the products in it. The add becomes a cell of the matrix,
  styled like its siblings, and the button carries the padding. *(Settled
  2026-09-22 on the order's charge rows.)*
- **A3 when the thing added has to be CHOSEN.** A ship-to is picked from a
  gated list, not typed into a blank row, so the control opens a panel. A blank
  row that then demands a search is two acts wearing one button.
- **A4 only ever turns a whole section on**, and it is the one dashed box a
  creation flow may draw. **An empty TABLE is padded text, never a dashed box**
  (§10f) — the two look alike and mean opposite things: a dashed box is an
  invitation, an empty table is a report.
- **A5 renders only when there is something left to split.** Once every product
  has its own loading account there is no further split to make, and a dead
  button with no reason beside it is worse than no button.

### Adding through a gate

**When membership is decided by something already chosen, the picker enforces
it and nothing else does.** The add-ship-to panel reads the partner's own
service area and offers nothing outside it; the empty state says *"Nothing
matches inside this partner's area"*, which is a different sentence from
*"nothing matches"*.

**A collision is flagged, not blocked.** The system knows the fact; only the
broker knows whether it is a mistake. *(Recurring rule, 2026-10-01:)* a
collision is only a real one — same ship-to, a day both run, and the **same
asset** or an **overlapping window**. It is listed in a quiet Conflicts table
inside the ship-to's tab, two rows per clash with the colliding parts marked,
and resolved per row (skip those days on this rule, or stop the other rule on
those days at this ship-to only). See `threepl/README.md` → V1.1 → Changes.
The recurring rule's ship-tos are now **tabs** (customer → ship-to → window →
assets), not a picked list.

---

## 6. Subtraction — the four shapes

**The glyph says whether the click can be taken back.** This is the whole rule,
and the two icons look alike at 16px, which is why it needs writing down.

| # | Shape | Means | Confirms? |
|---|---|---|---|
| **S1** | **A minus**, muted, label slides out on hover/focus — `SheetSectionRemove` | an optional section goes back to its A4 box | **only when `hasContent`** |
| **S2** | **A bin** (`Trash2`), `variant="ghost" size="icon-sm"` at the row's end — `TableRowRemove` | a **row** goes | **yes — ✕ / ✓ in place** (2026-09-23) |
| **S3** | **An X on a token** | one value comes off a multi-select | no |
| **S4** | **Clearing a control** | a value is unset | no |

- **A bin only ever appears where a row really does go.** Put on an optional
  section it promises destruction that does not happen; put on a token it is a
  cannon at a fly.
- **Confirm only when there is something to lose.** The caller answers
  `hasContent`, because only it knows what "filled in" means for its own rows —
  a starter row of blanks is not content, and neither is a prefilled default
  nobody chose. A dialog over an empty table teaches people to dismiss dialogs
  without reading them, which is the habit that makes the one that matters
  useless.
- **Adding and removing rows follows DS §10f "Rows"** — new row at the bottom,
  the cursor in its first cell, one blank row at a time, the 52px unnamed bin
  column, and the delete asks ✕ / ✓ before the row goes. Written 2026-09-23
  from this module's tables.
- **Every row delete carries the subject in its `aria-label`** — `Remove
  {shipTo}`, not "Remove". A list of eleven identical bins is eleven identical
  announcements otherwise.
- **Removing the last row does not remove the section.** The section collapses
  only through S1, deliberately. Otherwise an accidental double-delete throws
  away the section's other answers along with the row.

---

## 7. Interaction and state — by layer

### L0 — the sheet

- **Before Create, nothing is saved (2026-10-06).** Create Delivery Order and
  Asset Order show no save state and keep nothing until *Create Order*;
  closing with anything typed asks "Discard this order?". Once created, the
  order autosaves as below.
- **It autosaves, and it says so.** `useDraftSaveState` + `DraftStatusChip`
  beside the title: nothing before the first keystroke, *Draft saving…* while a
  change settles, *Draft saved* once it has. **A Draft says it once** — the
  chip gives way to plain text rather than showing a status dot, the word
  "Draft", a separator and the word "Saved" for one fact.
- **There is no Cancel on a sheet that autosaves.** Close is the honest exit.
  `RecurringProgramCreate` passes `showCancel={false}`; a create sheet that
  still shows Cancel is a bug, not a preference.
- **The footer's primary is the next act, and there is one.** *Create rule*,
  *Next — ship-tos and assets*. Never *Save*, never *Update*.
- **A dead primary says why in the strip above it, not in a tooltip and not in
  a clause beside it.** `PendingStrip` in `footerBanner`: one item at a time,
  a counter, chevrons. The word **Pending** does not move; stepping swaps only
  the item, and every label is the INSTRUCTION — *"Choose at least one
  partner"*, not *"Partner"*.
- **Pressing a pending item takes you there.** It scrolls the section into
  view — a hand-run rAF loop, because the sheet's focus trap cancels
  `behavior: "smooth"` — and then blinks. **Nothing takes focus**, because the
  trap restores the scroll of whatever it considers focused and fights the
  travel.
- **Depth is `level`.** A sheet opened over another takes the 56px gap twice.
  The invitation and a partner's quote are both level 2 over the order; a
  second sheet at the same inset covers the first exactly and reads as the same
  sheet having changed its contents.

### L1 — the step

- **A step is numbered and you take it in order.** That is what separates it
  from a stage bar, which is a statement about the record that the reader does
  not author. Creation gets steps; a live order gets stages.
- **A later step is unreachable, not empty.** Step 2 of the recurring rule is
  disabled until step 1 is answered, because the partner decides which sites
  exist and the product decides which tanks matter — there is genuinely nothing
  to show. A step that renders an empty list instead is lying about why.
- **A done step shows a tick in place of its numeral**, in the success channel.
- **Width is per step, not per sheet.** A form of stacked fields does not
  inherit the width its pricing tables needed.
- **A later step restates what the earlier one settled, and offers *Change*.**
  One line: partner · product · frequency, with a ghost *Change* on the right
  that returns to step 1. Paging back to check an answer is how people lose
  their place.

### L2 — the group

- **A group is a card by default**, `variant="plain"` is the exception.
- **A group that IS a table is `flush`**, and only then. The three-branch case
  is the one to copy: `flush={Boolean(loadRows) && hasAssets}` — flush for the
  table, padded for the CTA panel and for the empty state, because both of
  those are their own boxes and would sit on the card's edge.
- **A group carries the `id` a pending item targets**, and on a card with
  something hanging, the **wrapper** owns the id.
- **A group never explains itself in prose.** The "why does this behave this
  way" text goes in `SheetSectionNote` — a popover on click, not on hover, and
  deliberately narrow.

### L4 / L5 — the field and its control

- **Required is marked on the label, and nowhere else.**
- **The control follows the shape of the answer**, and this is a fixed mapping:
  two answers → `RadioGroup`; a short closed list → `Select`; a long list →
  `Combobox` with search; many of one kind → `TokenMultiSelect`; a flag →
  `Checkbox`; a flag about the ACT of submitting → `Checkbox` in `footerAside`.
- **A derived value is a read-out, not a disabled field.** A disabled input
  still looks like a field promising an edit, and its dimming makes the value
  the hardest text in the section to read.
- **A price that does not exist is not zero.** An unpriced line renders the
  dash, never `0.00`. Zero is what a field shows before anyone types, and
  telling a deliberate zero from an untouched one needs a per-field record of
  who typed what, which the model does not carry.

### L6 — the cell

- **A change in a cell is written on blur or on select, never on a per-cell
  save.** The sheet's autosave is the only save.
- **Adding a charge adds it to BOTH columns.** The charge belongs to the order;
  only the figures are each side's. See `../../../prototypes/unified-view/threepl/README.md`.
- **A table with a sticky header sets `border-separate border-spacing-0`** and
  sticks on its cells (DS §10d).

---

## 8. The reference surface, and the gap to it

**THE DELIVERY ORDER CREATE SHEET IS THE REFERENCE** (Pavan, 2026-09-22).
`BrokerOrderSheet.tsx` in draft mode is what a 3PL create sheet looks like;
every other create surface in the module is measured against it, and where they
differ the other one is wrong unless it can say why.

That makes `RecurringProgramCreate.tsx` — the newest surface and the only one
that does not use `SheetSection` at all — the open piece of work. Below is the
gap, item by item.

### The gap

| # | The reference does | `RecurringProgramCreate` does | The change |
|---|---|---|---|
| **1** | `SheetSection` — `rounded-lg`, `border-fp-outline-1`, a **tinted** title band `bg-fp-surface-1a px-4 py-2.5`, body `p-4 gap-4` | a local `Card` — `rounded-md`, **no tint on the band at all**, band `px-4 py-3`, body `p-4` with no gap | **delete the local `Card`**, use `SheetSection` |
| **2** | `SheetField` — label, `gap-1.5`, `required` asterisk, description as `<p class="text-xs text-muted-foreground">` at `gap-1` | a local `Field` — right gap, **no `required`**, hint as a bare `<span>` | **delete the local `Field`**, use `SheetField` |
| **3** | required marked with the destructive asterisk on 34 fields | **zero required markers on the whole form**, though six answers are mandatory | mark them |
| **4** | tables are `flush` inside the card, and the add is `HangingAdd` on `hanging` | each table draws **its own rim inside a padded card**, and adds are ghost buttons on a `border-t` band | flush + `HangingAdd`; the per-account add becomes an **A2 matrix cell** |
| **5** | every pending item carries a `target`, every target names a section `id` | **0 targets and 0 ids** — the strip names six outstanding things and can reach none of them | give each section an `id` and each pending item its `target` |
| **6** | *(n/a — one page, no steps)* | a **hand-rolled** step strip: bespoke pills, bespoke numerals, bespoke disabled state | use `SheetSteps`, which is the DS control and is currently used **nowhere** |
| **7** | `footerAside` is `FlagRow` | an inline `<label>` wrapping a `Checkbox` | use `FlagRow` — and **promote it**, it is already defined twice (`BrokerOrderSheet`, `AssetMovementSheet`) |
| **8** | an empty state is the DS `Empty` / `EmptyHeader` / `EmptyMedia` | a dashed box, `px-4 py-8 text-center` | `Empty`, or padded text — §10f forbids the dashed box round a table |
| **9** | a list of rows in a card sits in a `flush` section | `-m-4 mt-0` cancels the card's own padding by hand | `flush` |
| **10** | radius `rounded-lg` on every card | `rounded-md` | follows from #1 |

### What is NOT a gap, and must not be "fixed"

- **`xwide` and one column.** The reference is `xxwide` with a sticky rail
  because it has a derived side — totals that the form produces. A recurring
  rule has no such side at step 1, and `xxwide` would be a rail of nothing.
  **Width is per step**, and this step's shape is genuinely different.
- **Two steps.** The reference is one page because its questions are all
  askable at once. Here the partner decides which sites exist, so step 2 cannot
  be answered until step 1 is. The steps are correct; only their *control* is
  wrong (#6).
- **The lane grid.** The per-target editor is this surface's own idea and there
  is nothing in the reference to align it to.

### Order to do it in

1. **#1 and #2 first** — everything else is easier once the surface is made of
   the same parts. They are also the two that make it *look* like the rest of
   3PL.
2. **#5** — the pending strip currently promises navigation it does not have,
   which is the most visible broken thing on the screen.
3. **#4, #8, #9** — the table shapes, which is also what clears the surface's
   `eval:boxed-tables` finding.
4. **#6 and #7** — the two DS controls that exist and are going unused.

---

## 8b. Other drift, still open

1. ~~**A card's rim is two tokens.**~~ **Settled 2026-09-22: it is
   `--fp-outline-1`.** `SheetSection` drew `border-border`, the divider weight,
   round its outside. In dark the two tokens carry the same value, so the fix
   was a light-mode correction only.
   - **Follow-on, unsettled:** the card's title band still divides on
     `border-border` (`#d4d4d8`), which is now **heavier than the card's own
     rim** (`#e2e5ea`). Measured, not guessed. It may be right — a divider is
     structural and a rim is quiet — but nobody has ruled on it, and the local
     `Card` used `--fp-outline-1` for both.
2. **`npm run eval:boxed-tables` reports `RecurringProgramCreate.tsx:292`** —
   the tank table inside a padded target row. Covered by gap #4 above.
3. ~~**The DS names the strip `MandatoryStepsBanner`.**~~ *Fixed 2026-09-22.*

### Fixed on the first pass, because each had exactly one correct answer

- **`RecurringDeliverySheet` opened over the rule sheet at level 1**, covering
  it exactly, so it read as the same sheet having changed its contents. Now
  `level={2}`.
- **`DirectoryRecordSheet` autosaved AND showed Cancel** — a button promising
  to undo what had already been kept. Now `showCancel={false}`.
- **`PendingStrip`'s own comment said the blink fires twice.** It fires once.
- **The DS's `6-execute.md` still put a table header on `bg-fp-surface-1a`**
  and still said to stick the `<thead>` rather than its cells — both
  contradicted by newer rules in the same doc set.

---

## 9. What went UP into the DS from this work

Recorded here so the promotion is traceable, not so the rule is duplicated.
**None of the below is a 3PL rule any more.**

- The boxed table unit (§10f) and the hanging add — `docs/ds/ui/2-rules.md`.
- A sheet over a sheet takes the gap twice — `docs/ds/ux/2-rules.md`.
- Create and edit are one sheet — `docs/ds/ux/2-rules.md`.
- An add that cannot aim becomes a cell of the matrix — `docs/ds/ui/2-rules.md`
  §10f.
- Membership gates live in the picker, and a collision is flagged not blocked —
  `docs/ds/ux/2-rules.md`.
- Blinking a unit that is not one box — `docs/ds/interactions/2-rules.md`.

---

## 10. Using this file

**Building something new in 3PL creation:** read §2 to place it, §3–§4 for the
values, §5–§6 for how it grows and shrinks. If the thing you need is not here,
it is a decision — take it, build it, and **write it back into this file in the
same commit.**

**Reviewing:** `evals-creation.md`, which is this file turned into assertions,
each one naming the DS rule behind it.

**Extending to another module:** copy nothing. A Service Work creation flow
gets `docs/unified-view/service/creation.md`, and anything both files would say
identically is promoted to `docs/ds/` and pointed at from both.
