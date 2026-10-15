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

### Width — the content decides (Pavan, 2026-10-15)

Replaces the five fixed widths (510 · 560 · 864 · 1120 · fill) and the 756
creation floor. A sheet sized for more than it holds reads as empty.

| | Width | For |
|---|---|---|
| **Form** | `size="form"` **600** — the default | fields and text, no table. Creating and editing alike |
| **Fit** | `fit={{ tables, rail }}` — **the widest table's columns at a comfortable width** + 34 (body padding, the box's borders) + 364 if the 340px rail sits beside it; never under 600 | a sheet carrying TABLES |
| **Full** | `size="full"` — `100vw − 56px` | **no form uses it now** — every order sheet (3PL Delivery Order, Service Order, Sales Order / Quote, the portal's Order Request) FITS its tables plus its rail (Pavan, 2026-10-15). Only a sheet showing its step column fills |
| **Data** | `size="data"` — **1200** at least (with `fit`, the wider) — **fields three across** (`DATA_FIELDS`) | **a data-intensive record's detail** — many fields and several related-records tables: 3PL customer · vendor · product · rental asset; Sales customer · asset; the portal's asset · ship-to. Existing records only; creating one is a 600 form. Pavan, 2026-10-15: "cramped … more width so information can be easily consumed" |
| **Compact** | `size="compact"` 510 | CONTROLS rather than a form — a facet list |

**A comfortable column is one number per kind** (`CELL` in `RecordSheet`,
tightened 2026-10-15 — asset and product names are short, a quantity is six
digits): check 44 · flag (Top off) 72 · name (the row's own thing) 200 · pick
(a short list) 160 · number (qty, amount) 110 · date 140 · status 140 · text
240 · bin 52. **The table's own colgroup uses the same numbers**, fixed, with
the row's name taking what is left — a percentage column shrinks to nothing
once the sheet is only as wide as the table. The same column is the same width in every sheet. A table of two
columns makes a sheet as wide as those two columns need, not 864.

**The rail keeps its 340 + 24** — the sheet adds it; nothing in the rail
changes. **The form side is never narrower than a 600 form's** (566 inside
the padding): small tables beside a rail still leave the fields two across. **No minimum beyond 600, no maximum beyond the clamp.** A table too
wide to show whole (the portal ship-to's fifteen asset columns) shows its
first columns and **scrolls sideways**, the name pinned. **A record that
reads several tables** (the 3PL directory) is as wide as ITS widest — each
section names its columns (`RecordReadSection.columns`).

**A sheet over a sheet** (`level={2}`, rendered inside the sheet beneath)
is never wider than that sheet less 56px, so a strip of it always shows —
two sheets of the same content width would otherwise read as one sheet that
changed.

**Two panes side by side** — a form beside a map, an email beside its
preview — count as a table of two 420 columns (874). **A rail beside fields
with no table** counts the fields as two `text` columns.

**The question is still: what is in this STEP?** A stepped sheet passes the
tables of the step on show.

**Every width clamps to `100vw − 56px`** (112 at level 2). One number, every
sheet. **The step column still makes a sheet full** while it shows.

**Checked, not remembered.** `npm run eval` → `sheets`: a `RecordSheet` that
carries a table (a `<table`, `ProductTable`, `DocumentsTable`, `ListTable`)
but neither passes `fit` nor is one of the full forms.

### Navigation — one panel (Unified View, Pavan, 2026-10-06)

The Unified View's navigation is ONE left panel (`ModuleSidebar`), after the
Lovable "unified UI" reference's menu (structure only — colours and type are
the DS's sidebar tokens). Every module is a row (icon · name · chevron); the
module you are in is open, tinted `bg-sidebar-accent`, and under it are its
pages: loose pages first; **an area that has pages of its own stays a page, its
pages hanging under it on tree bars** (Pavan, 2026-10-15 — the portal's
Orders, then everywhere): a vertical bar down from the area's icon and a short
horizontal bar into each page; pressing the area opens its first page
(`ModuleSidebar` `nested`). No second drawer. **Colours are the shell set** (`--fp-shell-*`, 2026-10-06, after an
AirOps reference): ground #f2f2f2 (top bar included — the top bar has no fill
of its own), the panel #fbfbfb in a borderless rounded box 8px clear of the
edges, a selected page #f1f0ec with a green marker (#3a7760) on the guide
line (#e6e4e2); the open module takes weight, not a fill, and sits FIRST; the rest keep the
module order **3PL · Sales · Service Work · Pricing · Lease** (Pavan,
2026-10-09) —
no ring, dot, chevron or divider marks it (Pavan, 2026-10-07). **Switching modules starts with a
progress bar** (Pavan, 2026-10-08): a 2px bar in the BRAND colour (`bg-brand`, Pavan 2026-10-09)
fills the clicked row left to right (3s — a module takes 3–5s to load,
2026-10-09 — CSS keyframe), with the PAGE in its loading state meanwhile — the title,
view tabs, toolbar and table rows as shimmering skeletons in their own places
(`ModuleSkeleton`, Pavan 2026-10-10) — and with "Loading data for this module." in small muted
text right under it, flush left with the row, same group, no box; when it arrives the module switches and the three steps run. **The three steps, in
order** (Pavan, 2026-10-07): the open module FOLDS its pages (200ms), then the
rows MOVE — the chosen module glides to the top, the old one back to its place
(260ms, FLIP) — then the chosen module UNFOLDS (240ms). One curve,
`cubic-bezier(0.2,0,0,1)`; none with reduced motion. The panel
is 240px; **Collapse navigation** (a quiet grey mark in its top-right corner) folds it to a 56px icon rail —
the open module's pages as icons with hairlines between sections, then the
other modules — and the choice is remembered per browser.

**The two-layer rail + drawer is kept** (`NavRail` + `NavigationDrawer`,
`NAV_STYLE = "two-layer"` in `UnifiedView.tsx`). "Bring in the two-layer
navigation drawers" means switching that constant back.

### The stepped form — the default for every first-level form (Pavan, 2026-10-05)

Tried on Create Delivery Order, then made the default in every module (Sales,
3PL, Service). Lives in `RecordSheet` (`stepNav`, on unless `level={2}`) and
`components/side-sheet/form-steps.tsx`; a sheet that builds its own `Sheet`
uses `SteppedFormBody` directly (Sales `OrderSheet`).

- **Three columns: steps · form · cards.** A 224px step column on the left,
  the form as ONE long scroll in the middle, and the record's rail (Summary,
  Associated records, Activity) on the right where it has one. **The sheet
  fills (`100vw − 56px`) whenever the step column shows.**
- **Steps come from the page, not a list.** Every top-level `SheetSection` is
  a step named by its title; `FormStep label="…"` groups several sections under
  one name (Create Delivery Order: Order details · Contacts · Schedule ·
  Products · Vendor · Documents & notes). The column shows only with two or
  more steps, so a one-section sheet keeps its old shape.
- **The column follows the scroll** ("Step 3 of 6", a progress bar). The step
  list is quiet (2026-10-05): **13px**, a bare number **8px** from its name, no
  disc and no fill, flush with the column's left edge; the current step's number
  and name take the selection ink (`text-selected-foreground`, the brand in
  dark), the rest grey with lighter numbers. **Pressing a step scrolls to it**
  and marks it once with `.fp-attention-fill-subtle` — a 5% foreground wash,
  grey in both themes, never the ring tint.
- **The look inside a stepped form:** group headings lose their band —
  `text-base font-medium text-muted-foreground`; field sections become
  `plain`; a section that is a table becomes `outline` (plain heading over the
  table's own `--border` rim, hanging add intact). No step titles, no dividers:
  groups are separated by the 40px section gap alone.
- **Pending appears on press, not before (Pavan, 2026-10-05 — replaces the
  strip at the foot of the step column).** The primary is ALWAYS pressable;
  pressed with something mandatory missing, it does not act — it raises the
  pending bar, pinned under the FORM column (above the footer; on a sheet with
  a right rail it stops short of the rail, `footerBannerClassName`). Raised
  this way it wears the **DS soft caution banner** (`PendingStrip
  tone="caution"`, an opaque 10% `--fp-banner-accent-caution` wash and rim)
  because it is the answer to a refused press. It resets each time a record
  opens. Where a strip simply stands on a sheet (no step column), it stays
  grey.
- **The step column is OFF on the 3PL order sheets (Pavan, 2026-10-06)** —
  detail and create, delivery and asset. The stepped look stays; only the
  column goes (`stepColumn={false}` on `RecordSheet`). Its design and
  behaviour are archived in `archive/step-column.md`, with how to restore it.
- **Not stepped:** level-2 sheets (a sheet over a sheet), Export
  (`stepNav={false}`), pickers and read drawers (they reset
  `FormStepsContext` to false).
- **Nothing is kept before the create act (Pavan, 2026-10-06 — replaces "a
  create visit stays a create visit").** A new record is not autosaved and
  shows no save state; it reaches its list only when the primary (*Create
  Order*) is pressed, and the sheet then re-opens on it with its rail. Closing
  with anything typed asks **"Discard this order?"** — *Keep editing* /
  *Discard* — for every kind of order. Autosave is for records that exist.
- **The stage track animates when the stage changes** (`StageTrack`,
  2026-10-06): the travelled line runs on to the new stage, the stage left
  takes its tick, and the new pill fades and zooms in as the line arrives —
  under a second, never on first paint, off under `prefers-reduced-motion`.
- **The step column's progress bar can end in one quiet control**
  (`stepsAction` on `RecordSheet` → `SteppedFormBody` → `FormStepsNav`
  `headerAction`): a grey 24px ghost icon (`text-muted-foreground`, white on
  hover), centred on the bar. Used for the order form's settings gear.

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
| **H2** | `StageTrack` — dots on a line (replaced the chevron `StageBar` on order detail pages, 2026-10-05) | a statement about the RECORD, which you are watching rather than authoring |

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

## 6. The banner — two (Pavan, 2026-10-13, final)

| | Component | For |
|---|---|---|
| **B1** | **banner without interaction** — `BannerCallout` (solid · soft) and `BannerInline` | **saying one thing.** A message, at most one action or a ✕. Nothing in it narrows anything |
| **B2** | **banner with interaction** — `AlertBanner` (`src/components/ui/alert-banner.tsx`) | **alerts the reader acts on, possibly several kinds at once.** Every part below is part of it; none is optional decoration |

**The question: does pressing the banner do something to the page?** If yes,
it is B2 and it carries the whole anatomy — interactions/2-rules.md §7.

---

## Adding a variant

1. **Say which question it answers** that no existing variant does. A variant
   that answers the same question as another is a fork.
2. **Put it in the table above** with its count.
3. **Teach the census** in `scripts/eval/` to count it, or it will be wrong
   within a month.
