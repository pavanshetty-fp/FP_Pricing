# The variant catalogue

Added 2026-09-22. **Every element in this system has more than one form, and
the mistake is not picking the wrong one — it is not knowing there was a
choice.** A rule written as though a component had one shape is a rule that
gets broken the first time somebody meets the second shape, and then broken
again as a "fix".

So each element below lists **its variants, what distinguishes them, and the
one question that picks between them.** Where a variant exists only because
nobody chose, it says so.

> **This file is counted, not just written.** `npm run eval` prints a census —
> every sheet in the app against every option it takes, every table against
> whether it is in a unit — and a run says how the numbers moved since the last
> one. A catalogue nobody counts is a catalogue that is stale by the second
> screen.

---

## 1. The side sheet

### Width — five, and the choice is per STEP

| | Width | For | Count |
|---|---|---|---|
| **W1** | `compact` 510 | CONTROLS rather than a form — a facet list has a natural width and 560 left it swimming | 1 |
| **W2** | `narrow` 560 | a form of stacked fields. The DS's own sheet | 3 |
| **W3** | `wide` 864 | a sheet carrying TABLES — at 560 their columns must be scrolled to be read | 4 |
| **W4** | `xwide` 1120 | a step whose tables run past six columns | 2 |
| **W5** | `xxwide` fills | **one shape only: a step that is TWO COLUMNS** — tables left, fixed rail right | 4 |

**The question: what is in this STEP?** Not what is in the sheet. A form of
stacked fields does not inherit the width its pricing tables needed.

**W1–W4 are caps; W5 fills.** A cap protects a FORM — label-to-control pairs
stretched across a monitor. A two-column step has no such pairs: the left is
tables and the right is a fixed 340px rail, so every pixel the viewport has
belongs to the tables.

**All five clamp to `100vw − 56px`.** One number, every sheet.

**A CREATION SHEET IS AT LEAST 756px (Pavan, 2026-10-05 — replaces the
2026-09-25 rule that it filled the screen).** Creating a rule, an order, a
customer, anything: the sheet keeps its own size but never drops below 756,
still clamped to `100vw − 56px` (112 at level 2). A create sheet has **no
right rail** (Summary · Associated records · Activity), so a two-column sheet
takes the 756 floor while it is being created and becomes two columns once the
record exists. In code: `RecordSheet`'s `fill` (defaults to `mode ===
"create"`) now sets the floor; an export or a partner's quote passes
`fill={false}`.

### Depth — two

| | | For |
|---|---|---|
| **D1** | `level={1}` (default) | a sheet over the page |
| **D2** | `level={2}` — the gap twice, `100vw − 112px` | a sheet over ANOTHER SHEET |

**The question: is there a sheet underneath this one?** If yes it is D2, with
no exceptions. The 56px is what tells a reader a sheet is over something; a
second sheet at the same inset covers the first exactly and reads as the same
sheet having changed its contents. The extra 56 leaves a strip of the one
beneath showing, which is the only language the stack has.

### Body — two

| | | For |
|---|---|---|
| **B1** | one column | everything the sheet asks is a question |
| **B2** | two columns + sticky rail | the record has a DERIVED side — what the answers have made |

**The question: can you type into it?** Editable left, in the order you fill
them; derived right, read-only, true whether or not anyone is looking. Once an
editable number and a computed one share a column they look identical. B2 folds
to B1 below `lg`, where a 340px rail beside a form is two columns of nothing.

### The strip under the header — two, and they are not interchangeable

| | | For |
|---|---|---|
| **H1** | `SheetSteps` — numbered | a FORM split into parts you move between, in order |
| **H2** | `StageBar` — chevrons, not numbered | a statement about the RECORD, which you are watching rather than authoring |

**The question: who is doing the moving?** Steps are numbered because you take
them; stages are not, because the record takes them. A create sheet gets H1. A
live record gets H2. A sheet showing both is describing two things and should
say which one the strip is about.

### The footer — three slots, each answering a different question

| | | Question it answers |
|---|---|---|
| **F1** | `footerBanner` | **what is the primary waiting on** |
| **F2** | `footerAside` | what is being decided AT the moment of committing |
| **F3** | `footerPrimary` | what is the next act — and only ever one |

**F1 is required whenever the primary can be disabled.** A dead button with no
reason beside it is the commonest broken thing in a form.

---

## 2. The section

| | | For |
|---|---|---|
| **S1** | `variant="card"` (default) | a sheet that is a stack of questions about different things |
| **S2** | `variant="plain"` | a sheet that is one continuous list rather than a set of groups |
| **S3** | `flush` | the section's body IS a table |
| **S4** | `hanging` | a table that can grow — the add tab off the bottom-left corner |
| **S5** | optional — collapses to an "Add …" box | a section that may legitimately not apply |

**The question for S1/S2: is this sheet a set of subjects, or one list?** Gaps
alone carried the boundary until a section held a table and swallowed it; the
border says it at any length.

**S3 and S4 compose**, and S3 is decided per BRANCH, not per section: flush for
the table, padded for the CTA panel and for the empty state, both of which are
their own boxes and would sit on the card's edge.

---

## 3. The table — the one with a "within a unit" and a "without"

**This is the distinction §10f is about, and stating it as one rule was the
error.** There are three table forms and only one pairing of them is wrong.

| | Form | Draws | Where |
|---|---|---|---|
| **T1** | **in a unit** | NO rim, no radius, no inset. Its edges ARE the card's | a section's body, `flush` |
| **T2** | **its own unit** | its own rim and radius; it IS the box | standing alone — a dialog's figures, a component that ships as a boxed table |
| **T3** | **the list** | the page's own table — `DataTable`, toolbar, pagination, the full action unit | a screen, not a sheet |

**The question: is there already a box around it?**

- A box around it → **T1**, always. Two rims a few pixels apart say one thing
  twice and the gap between them belongs to neither.
- No box around it → **T2**, and it draws its own. A table with no edge and
  nothing to borrow one from is a table that has come apart.
- It owns the screen → **T3**.

**The violation is T2 INSIDE a card.** Not "a table with a rim" — that is T2
doing its job. This is why the check reports these at **L2 and asks which
variant it is**, rather than calling every rim a bug: on its first run, two of
the three it found were correct code.

**Census, 2026-09-22: 25 T1, 3 T2.** The three T2s, and the ruling on each:

| Where | Verdict |
|---|---|
| `EditableTable.tsx:177` | **T2, correct.** The component IS the unit — a boxed table with the hanging add, which is the shape §10f describes |
| `BrokerOrderSheet.tsx:6570` | **T2, correct.** The award dialog's figures. A dialog body is not a card, and nothing else there draws an edge |
| `RecurringProgramCreate.tsx:292` | **A box in a box.** It sits inside a padded target row inside a `Card`. Fix: T1 — covered by `creation.md` §8 gap #4 |

### What every form keeps

Row rules, header fill (`bg-fp-table-header`), and the `tfoot` total. Those
separate rows FROM EACH OTHER, which is a different job from separating the
table from its container.

### Sub-variants, orthogonal to T1/T2/T3

- **editable / read-only.** A read-only rate card breaks the boxing rule as
  easily as an editable grid — it is not an "editable table rule".
- **can grow / fixed.** Growing gets the hanging add (S4). Fixed gets nothing;
  an add with nothing to add is not rendered.
- **single / matrix.** A card holding ONE table hangs its add off the corner. A
  card holding one table per product has no single corner to aim at, so the add
  becomes a cell of the matrix.
- **sticky header / not.** Sticky requires `border-separate border-spacing-0`
  and stickiness on the CELLS — see §10d.

---

## 4. The add — five, in `docs/unified-view/3pl/creation.md` §5

Catalogued at the module level for now, because only one module has needed all
five. **The second module to need them promotes the list here.** The question
that picks between them: *what is being added, and does it have to be chosen?*

---

## 5. The empty state — three

| | | For |
|---|---|---|
| **E1** | padded text | **an empty TABLE.** A report: there is nothing here |
| **E2** | a dashed CTA box | **an optional SECTION that is off.** An invitation: there could be something here |
| **E3** | the `Empty` component — icon, heading, description | a whole region with nothing in it, where the reader needs telling why |

**The question: is this an invitation or a report?** E1 and E2 look alike and
mean opposite things, which is exactly why a dashed box round an empty table is
forbidden — it invites a click that does nothing.

---

## Adding a variant

1. **Say which question it answers** that no existing variant does. A variant
   that answers the same question as another is a fork.
2. **Put it in the table above** with its count.
3. **Teach the census** in `scripts/eval/` to count it, or it will be wrong
   within a month.
