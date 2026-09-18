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
      wide tables · 1440 two columns. Per step, not per sheet.
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
      there and blinks the outline twice.
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
