# Unified View — layouts

Where things go. The DS's layout laws are in `docs/ds/ux/2-rules.md`; this file
records the arrangement **this application** settled on, and the rules for each
archetype in it.

---

## 1. The page, from the outside in

```
┌─ TopBar ─────────────────────────────────────────────────────┐  global
├──────┬───────────────────────────────────────────────────────┤
│ Rail │  ┌─ Page header ───────────────────────────────────┐  │  title + count
│ 52px │  ├─ Content layer (rounded, shadow, no outer border)┤  │
│      │  │   view bar                                       │  │
│      │  │   toolbar                                        │  │
│      │  │   filter chips                                   │  │
│      │  │   BODY — table · board · map                     │  │
│      │  │   total (board) or pagination (table)            │  │
│      │  └──────────────────────────────────────────────────┘  │
└──────┴───────────────────────────────────────────────────────┘
```

**The order is fixed**: header → view bar → toolbar → chips → body → footer. A
zone that has nothing to say is absent, never a placeholder.

**The title and the primary CTA live OUTSIDE the container; everything that
acts on the data lives INSIDE it.** (DS §10.)

---

## 2. Navigation — two tiers, and they are a parent and a child

**Tier 0** — the global top bar: brand, search, notifications, account. Profile
and Settings are account destinations, not workspace ones, so they are in the
account menu and never in the rail.

**Tier 1** — a 52px rail: the module switcher at the top, then one item per
top-level area of the active module. Flat. **Sub-categories are never section
headings in the rail.**

**Tier 2** — a contextual drawer for the active rail item, and only where that
item has a second level. An area with no second level renders no drawer and the
content layer takes the full width.

### The peek — locked 2026-09-15, after four iterations

- At rest only the 52px rail is visible; the drawer has **no footprint**.
- Hover the rail → the rail expands to 256 **and the drawer comes out with
  it**, rail drawn OVER drawer (z-30 over z-20).
- Cross onto the drawer's exposed right edge → the rail collapses to 52, the
  drawer stays whole.
- Leave both → 500ms → both away.
- **A press outside both panels closes them at once.** The 500ms clock is grace
  for a pointer that may come back; a `pointerdown` outside clears it.

> **Implementation note that matters:** the open/close is driven by a document
> `pointermove` asking what is under the pointer, NOT by `mouseenter` /
> `mouseleave`. Both panels move under a stationary cursor, and browsers fire no
> enter for an element that arrives under one. Event-driven versions stuck open
> and stuck shut.

**Rejected, do not re-propose:** turning off the rail's own hover-expand; an
invisible 24px channel as the drawer's handle; giving the drawer a 52px
collapsed resting state.

### Current map

| Module | Tier 1 | Tier 2 |
|---|---|---|
| Sales | Fuel Orders · Asset Orders · Customers · Assets | none |
| 3PL | Orders · Directory | Orders → Delivery Orders, Recurring Orders · Directory → Customers, Vendors, Products, Rental Assets |
| Service Work | Service Orders · Technicians · Service Settings | none |
| Lease, Pricing | none — an unbuilt module shows the module-level empty state rather than invented destinations |

---

## 3. The view bar

Presets · saved views · scope segments · export · the create CTA.

- **Presets sit FIRST, ruled off from Default and the saved views.** A saved
  view is something a reader MADE; a preset is something the business already
  IS. Presets carry no `⋯` menu, because there is nothing to rename about a
  fact.
- **Only one tab is ever underlined.** Picking a preset is picking Default AND
  that narrowing; picking one from inside a saved view drops that view.
- A brand dot on the active tab marks unsaved drift.
- **The create CTA becomes a MENU when Create means several different records.**
  Each option carries a detail line, because names alone do not separate them.
  A kind that comes in named variants becomes a **radio group under one entry**,
  not more sibling items — the variant is a property of the thing, not another
  kind of thing. Choosing a radio selects and acts in one click, and the
  selection is remembered.

---

## 4. The toolbar — a control belongs to the view it acts on

| Control | Table | Board | Map |
|---|---|---|---|
| Search (whole row) | ● | ● | ● |
| Filters (facet panel) | ● | ● | ● |
| Date scope | ● | ● | ● |
| View switch | ● | ● | ● |
| Search by column | ● | | |
| Show/hide columns | ● | | |
| **Card fields** | | ● | |
| Group by | ● | | |

**A control does not quietly change its subject to stay useful.** Show/hide
columns re-aiming itself at a card's units when the board is active is one icon
with two meanings. Hide it; give the other view its own control, named for its
own subject.

### The facet panel

Stages until Apply. **Within a facet, OR; across facets, AND** — because
picking two statuses means "either" and picking a status and a technician means
"both". What is on shows as chips on one shelf below the toolbar, together with
the column-search chip: they do the same thing to the list, and two rows of
chips would cost twice the height to say it less clearly.

### The date scope

Every list in this app is date-scoped, and the control is the same everywhere:
arrows to step, the date to open, presets behind the click.

- **A list whose record IS a day opens on one day** (deliveries).
- **A list whose records outlive a day opens on a week** — today ±3. A reported
  fault from Tuesday is still a fault on Friday.
- **A new record has to be where the reader is looking.** Creating one outside
  the current window WIDENS the window to take it in — never moves it, because
  jumping would take away whatever was being watched to make room for the thing
  just made. The same applies while a sheet is open, so a record cannot slip
  out from behind its own sheet when its date or its line changes.

---

## 5. The table

- **Every column sorts.** A header that sorts on one column and not the next
  teaches the reader to stop trying.
- **Sorting by a lifecycle or a priority sorts by POSITION, not the alphabet.**
  Urgent does not belong between two milder words.
- **Every table's columns move and resize.** Default, not a feature. The pinned
  open-chevron is the frame, not a column: it does not move and nothing can be
  dropped past it.
- **A table that opens wider than the screen teaches scrolling before it
  teaches anything else.** Columns that answer questions nobody asks first are
  hidden by default and are in the menu.
- **The column grammar is the same in every module**: number · type disc · who ·
  where · what · when · who is doing it · state · money. A reader who has
  learnt one orders table has learnt all of them.
- **Column filters are a ROW under the headers**, shown only when asked for,
  AND-ed together. 40px of empty inputs above every table is a permanent cost
  for an occasional question.
- **Selection is opt-in.** A list with nothing to do to a selection does not
  spend 44px on a checkbox column.
- **An empty value is a dash, never a blank cell** — and an unschedulable value
  says the word ("Not scheduled"), because that is a state, not an absence.

### Editable tables inside a sheet

The DS's editable-table idiom: fixed layout, a `--fp-table-header` band, cells
with no chrome of their own.

- **The total is a ROW of the table, not a caption under it.** A sum lives in
  the column it sums, on the same grid as the numbers above it.
- ~~**The Add row is the table's last band.**~~ **WRONG, AND IT WAS WRONG HERE
  FOR A MONTH. The add HANGS off the card's bottom-left corner** — `HangingAdd`
  through `SheetSection`'s `hanging` — see `docs/ds/ui/2-rules.md` §10f.
  Corrected 2026-09-23.
  - The parenthetical that justified it — "a flush table inside a card does not
    have a squared corner" — was the mistake. **The card squares its own
    corner** when something hangs off it; that is what `hanging` does.
  - **This line is why two tables in one sheet ended up with two different
    adds.** It contradicted the parent, the eval below asserted THIS version,
    and a check that enforces the wrong rule is worse than no check — it makes
    the wrong answer look reviewed. See §The cells, below.
- **THE CELLS ARE `TableCell*`, NEVER A BARE FORM CONTROL.** `TableCellInput`,
  `TableCellSelect`, `TableCellCombobox`, `TableCellMultiSelect` — they are
  `absolute inset-0` and FILL the cell rather than sitting in it, which is the
  whole idiom: **a cell is editable ground, not a box with a field parked
  inside it.** A `<Combobox>` dropped into a `<td>` brings its own border, its
  own radius and its own padding, so the row reads as a form pretending to be
  a table.
  - The cell must be `relative p-0` for them to fill it. Without the
    positioning the control escapes the table entirely — measured, 2026-09-23,
    when a fault cell landed at the top of the sheet.
- **A computed cell is never an input.** Quantity × unit is arithmetic, and a
  box for it is a box to get it wrong in.
- **A column that would repeat what was typed does not exist.** A line with no
  quantity has one money column, not two both called Amount.

---

## 6. The board

- **Lanes are the lifecycle, in order.** Sorting by status sorts by lane
  position.
- **A lane that is not a step of the work sits apart**, behind a 3px rule —
  Cancelled, Blocked. A lane that is a normal thing for work to be doing
  (waiting on a part) stays in sequence.
- **No drag between lanes.** A stage change here is a workflow act with side
  effects, not a reorder.
- **A card is ruled units**: one heading, one shape, a rule to the next. Three
  shapes — `stack`, `inline`, `rows`. No field labels inside a unit.
- **A heading with nothing under it is not a unit.**
- **The card's field set is PER LANE**, with a scope control above the ticks it
  governs. A lane is only offered the fields it can draw.
- **An alert on every card is a border.** Only a card with something
  outstanding gets one.
- **Lane sort is per lane**, and a lane may have an option of its own.
- **The board is not paged**, so it gets a total — and the total states its
  scope.

### What a card leads with, by stage

Before the work: who it is for, what is being asked, when, who is taking it.
After the work: **"Completed on" replaces the schedule** — a finished record is
asked when it RAN, not when it was booked — and the figure it came to joins the
unit that names who did it. The two are separate fields, not one renamed, so a
job that ran a day late can show both.

---

## 7. The side sheet

Two columns at `xxwide` when the record has both halves; one column otherwise.

```
┌ header: title · status · draft chip · close ─────────────────┐
├ stage bar ───────────────────────────────────────────────────┤
│ ┌── form (fills) ───────────────┐  ┌── rail 340px, sticky ─┐ │
│ │ section (card)                │  │ Summary               │ │
│ │ section (card, flush = table) │  │ Billing               │ │
│ │ …                             │  │ Record                │ │
│ └───────────────────────────────┘  └───────────────────────┘ │
├ footerBanner — what the act is waiting on ───────────────────┤
│ footerAside            ·            footerPrimary = next act │
└──────────────────────────────────────────────────────────────┘
```

**One rule decides a card's side: can you type into it?** What you fill in goes
left, in the sequence you fill it. What the record HAS BECOME goes right —
derived, read-only, true whether or not anyone is looking.

**The rail stays put while the form scrolls.** It answers questions the reader
has while looking at any part of the form.

**Widths:** `narrow` 560 (stacked fields) · `wide` 864 (tables) · `xwide` 1120
(tables past six columns) · `xxwide` fills to `100vw − 56px` (two columns). **Per step, not per
sheet.** **A creation sheet fills to `100vw − 56px` whatever its size** (Pavan,
2026-09-25) — the caps are for opening an existing record.

**A SHEET OVER A SHEET TAKES THE GAP TWICE** — `level={2}`, so `100vw − 112px`
(Pavan, 2026-09-22). The 56px is what tells a reader a sheet is over
something; a second sheet at the same inset covers the first exactly and reads
as the SAME sheet having changed its contents. The extra 56 leaves a strip of
the sheet underneath showing, which says "there is one of these behind this
one" in the only language the stack has. The invitation and a partner's quote
both sit at level 2, over the order.

---

## 8. The action unit — one primary, and it is the next act

- **One primary per view.** The page's is in the view bar; a sheet's is in its
  footer.
- **A sheet's primary is a LADDER**: whatever the stage, it names the one thing
  that moves the record on. It changes as the record does.
- **The label is the act, never the state.**
- **A rung that cannot be taken is disabled and says why on the press** — a
  tooltip, one sentence, imperative. Not a clause parked beside the button.
- **What the record is missing goes in the banner**, one item at a time with a
  counter, under a fixed "Pending" label. An exception that stops the work
  takes the banner instead.
- **The banner's item is pressable and takes you to the section**, which then
  blinks its outline once. Implementation note that matters: the sheet's focus
  trap cancels `behavior: "smooth"` and restores the scroll of whatever it
  considers focused, so the travel is a rAF loop on the scrollport and nothing
  takes focus.
- **A secondary outcome of the same act lives in `footerAside`** — the press
  that admits the job cannot be finished today.

---

## 9. Pagination and totals

- **Pagination is mandatory on a paged list**, in three slots: showing-count ·
  page numbers · page-size.
- **A board gets a total instead**, and the total states its window: a number
  with no scope is one nobody can check.
- **A grouped list suspends pagination.** Groups that split across pages are
  groups that lie about their counts.
- **What leaves in an export is the narrowed set, not the page.** A page
  boundary is a property of a table and has no business deciding what ends up
  in a file.

---

## 10. Empty states — the cause decides the words

Four, and they are not interchangeable:

| Cause | Says |
|---|---|
| nothing in this date window | the window, and to step it |
| nothing matches the narrowing | how many are in the window, and to clear a filter |
| nothing at all yet | what this list is for, and the way to make one |
| the module has no screens | that its navigation is not specified, and where to go instead |

A single "No data" makes the reader work out which of the four they are in —
which is the one thing the screen already knows.
