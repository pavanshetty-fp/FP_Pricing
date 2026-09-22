# Eval — layouts, placement and structure

Against `../2-layouts.md` and `docs/ds/ux/2-rules.md`.

## The page

- [ ] **L2** Every screen is inside `AppShell`, with one header stack.
- [ ] **L2** Zones appear in order: header → view bar → toolbar → chips → body
      → footer. A zone with nothing to say is absent, not a placeholder.
- [ ] **L2** The page title and the primary CTA are OUTSIDE the content
      container; everything acting on the data is INSIDE it.
- [ ] **L2** The content layer has no outer border, and floating chrome carries
      `shadow-fp-surface`.
- [ ] **L2** Exactly one primary action per view.

## Navigation

- [ ] **L2** The rail is flat — one item per top-level area, no section
      headings, no sub-categories.
- [ ] **L2** A rail item with no second level renders no drawer, and its
      content layer takes the full width.
- [ ] **L2** Profile and Settings are in the account menu, never in the rail.
- [ ] **L2** A module with no destinations shows the module empty state rather
      than invented ones.
- [ ] **L2** The peek is driven by a document `pointermove`, not by
      `mouseenter`/`mouseleave`. An event-driven version sticks open.
- [ ] **L2** A `pointerdown` outside both panels closes them at once.

## The toolbar

- [ ] **L2** Column search and show/hide columns render in TABLE view only.
- [ ] **L2** Card fields renders in BOARD view only.
- [ ] **L2** No control changes its subject to stay useful across views.
- [ ] **L2** Facets stage until Apply; within a facet OR, across facets AND.
- [ ] **L2** Everything currently narrowing the list is a chip on one shelf.
- [ ] **L2** Every list carries the same date control, and it opens on one day
      or on a week according to whether its record IS a day.

## Tables

- [ ] **L1** Every column has `sortable` unless it is the pinned actions
      column.
- [ ] **L2** A lifecycle or priority column sorts by position, not the
      alphabet.
- [ ] **L2** Columns move and resize; the pinned chevron does neither.
- [ ] **L2** The table fits the viewport at 1440 with its default columns; the
      rest are hidden by default and in the menu.
- [ ] **L2** The column grammar matches the other modules' order tables.
- [ ] **L2** Column filters are a row shown only when asked for.
- [ ] **L2** Selection exists only where there is a bulk act.
- [ ] **L1** No empty cell — a dash, or the word for the state.

## Tables inside a boxed unit

Against `docs/ds/ui/2-rules.md` §10f — **the boxed table unit**.

> **This segment is scripted.** `npm run eval:boxed-tables` scans every `.tsx`
> under `prototypes/unified-view` and `src/components` and reports each
> violation with its file, line and the rule it breaks. It exits non-zero, so
> it can sit in CI. Run it before reading the list below by hand; what the
> script covers, nobody has to.
>
> The assertions it holds: a table wrapped in its own bordered box · a
> `SheetSection` whose body is a table but is not `flush` · an Add on a
> full-width band inside the card · a hanging Add drawn with a border instead
> of a fill · a table's empty state drawn as a dashed box.

- [ ] **L1** No table draws its own border inside a card or a `SheetSection`.
      The box's edge is the table's edge, and the section is `flush`.
- [ ] **L1** An empty table in a boxed unit is padded text, not a dashed box.
- [ ] **L2** Everything in a flush section that is NOT the table carries its
      own 16px inset and a rule on the side that meets the table.
- [ ] **L2** Holds for static tables too — a read-only rate card breaks this
      as easily as an editable grid.
- [ ] **L1** No Add control is a full-width band inside the card. It hangs
      off the card's bottom-left corner, outside it, and the corner is
      squared.
- [ ] **L2** The hanging add is filled with the table's header tint, shows
      only a `+` at rest, and carries the full phrase as its `aria-label`.

## Editable tables in a sheet

- [ ] **L2** The total is a row of the table, not a caption under it.
- [ ] **L2** The Add row is the table's last band.
- [ ] **L2** No computed cell is an input.
- [ ] **L2** No column repeats what was typed in another.

## Boards

- [ ] **L2** Lanes are in lifecycle order.
- [ ] **L2** A lane that is not a step sits apart behind the rule; a lane that
      is a normal state of the work does not.
- [ ] **L2** No drag between lanes.
- [ ] **L2** A card is ruled units, three shapes only, no field labels inside a
      unit.
- [ ] **L1** A unit with no lines is filtered out before render.
- [ ] **L2** The card field menu has a lane scope above the ticks, and a lane
      is offered only the fields it can draw.
- [ ] **L2** Only a card with something outstanding carries an alert.
- [ ] **L2** The board shows a total, and the total states its window.

## The side sheet

- [ ] **L2** Width matches the shape: 560 stacked fields · 864 tables · 1120
      wide tables · `xxwide` fills for two columns. Per step, not per sheet.
- [ ] **L1** Every sheet and nested drawer clamps to `100vw − 56px` — one
      number, no 60s left anywhere.
- [ ] **L2** At 1900 the two-column step leaves exactly 56px and no strip of
      the list behind it; at 760 it folds to one column with no sideways
      scroll.
- [ ] **L2** In a two-column sheet, everything editable is left and everything
      derived is right.
- [ ] **L2** The rail is 340px, `sticky top-0`, and folds to one column below
      `lg`.
- [ ] **L2** The footer uses the three slots for their three jobs — banner =
      what the act waits on, aside = decisions at the moment of committing,
      primary = the next act.
- [ ] **L2** The primary is the next act, never Save or Update.
- [ ] **L2** A blocked primary is disabled with the reason on the press, not
      beside it.
- [ ] **L2** The banner's subject label is fixed; only the item changes.
- [ ] **L2** Every banner item has a target section, and pressing it scrolls
      there and blinks the outline once.
- [ ] **L1** Every section a banner item targets has the `id` it names. An
      item pointing at nothing fails silently.

## Pagination and totals

- [ ] **L2** A paged list has all three pagination slots.
- [ ] **L2** A board has a total instead, with its scope stated.
- [ ] **L2** Grouping suspends pagination.
- [ ] **L2** Export takes the narrowed set, not the page.

## Empty states

- [ ] **L2** Four distinct states exist and say different things: nothing in
      the window · nothing matches · nothing yet · module not built.
- [ ] **L1** No screen says only "No data".
