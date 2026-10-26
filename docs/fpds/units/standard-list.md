# Standard list

`id: unit.standard-list` · `layer: unit` · `code: prototypes/unified-view/StandardList.tsx (StandardList; re-exported as PortalList in prototypes/customer-portal/PortalList.tsx), prototypes/unified-view/service/ServiceListScreen.tsx (ServiceListScreen, printedText)` · `registry: fpds-standard-list`

## Purpose
A template-level composition written as a unit card — the whole list page in one piece, built from `unit.view-row`, `unit.toolbar`, `unit.filter-panel`, `unit.chip-shelf`, `unit.view-bar`, `unit.data-table`, `unit.export-sheet` and `unit.pagination`. Every table page, assembled the same way: the view row, the toolbar, the chip shelf, the view bar on the table, pagination, and an export that asks first. A screen hands it rows, columns, what each column prints, its facets and what Create and opening a row do. It answers "show me this kind of record as a list I can search, filter, sort, save and export" — identically on every page.

## Use when / Don't use when
- Use for any page whose content is one table of one kind of record with no board or map: Customer Portal lists, Service Work reference pages.
- Use `ServiceListScreen` (a thin wrapper) for a reference page whose filters should come from its own columns automatically.
- Don't use when the list needs a board, a map, a date window, Group by or bulk selection — those lists compose the units directly (3PL › Delivery Orders, Sales › Orders, Service Work › Service Orders, Customer Portal › Orders).
- Don't use inside a side sheet or for an editable table (boxed table unit, ui §10f).

## Anatomy
Top to bottom, with its fixed vertical rhythm:
1. *(optional)* **Above** — overview cards (`above`), 32px (`mb-8`) above the view row.
2. **View row** (`unit.view-row`) — All · saved views · + View · [segment] · [Create CTA] · Export.
3. **Toolbar shelf** (`mt-4`) — `unit.toolbar`: search · Filters [· afterFilters]; no Group by, no date, no display switch (one view). Then `unit.chip-shelf` with the column-search chip inside it.
4. *(optional)* **Banner** (`mt-4`) — the alert banner, under the toolbar shelf, right above the table.
5. **Table area** (`mt-4`, fills the height) — `unit.data-table` with `unit.view-bar` as its top bar ("62 invoices"; Search by column · Show/hide columns). OR the **empty state** in its place.
6. **Pagination** (`mt-4`) — `unit.pagination`, 25 rows a page by default.
7. **Export sheet** — `unit.export-sheet`, titled "Export {Noun}".

## Look
Inherits every unit's look. Its own values:
- Page column: `flex min-h-0 flex-1 flex-col`; spacing 16px (`mt-4`) between view row → toolbar shelf → [banner] → table → pagination; 32px under `above`.
- Empty state: DS `Empty` filling the table area — icon tile (`EmptyMedia variant="icon"`), title, optional description, one outline `size="sm"` button.

## States
- **default** — All, first page of 25, unsorted, every non-default-hidden column shown.
- **narrowed** — search, column search, column boxes or facets on; chips show; statement count drops.
- **sorted** — by a column's `sortValue` (numbers, lifecycle position) or its printed text, case-insensitive.
- **empty — none yet** — no rows at all: the page's own icon, "No {noun} yet", and the CTA (when the list has one).
- **empty — nothing matches** — rows exist but the narrowing leaves none: `SearchX` icon, "No matching {noun}", "{N} {noun} in all. Clear the search or a filter to see them.", button "Clear all".
- **empty with column boxes open** — the table stays (header + boxes, no rows) instead of the empty state.
- **dirty** — any change from the active view; update icon / dot on the view row.

## Interactions
| Trigger | Result |
|---|---|
| Type in search | Rows whose printed text in any labeled column contains it; page 1. |
| Filters → Apply | Facets AND across, OR within one; page 1; chips appear. |
| Search by column → type in a box | That column's printed text must contain it; AND across boxes; page 1. |
| Close the column search row | Clears every box. |
| Sort a header | asc → desc → unsorted; page 1. |
| Hide / show / reorder / resize columns | Applied at once; view becomes dirty. |
| Click a row / Enter | `onOpen(row)` — the record's sheet (no-op when the list opens nothing yet). |
| Press Create | `onCreate()`. |
| Press Export → Export | Toast "Exporting {N} {noun} as .{format}" (one line), sheet closes. |
| Press "Clear all" in the empty state | Clears search, column search, column boxes and facets; page 1. |
| Press the CTA in the "none yet" state | `onCreate()`. |
| Banner title press (via `applyFacets`) | Sets the facet filter from outside; page 1. |
| Save / switch / update a view | Restores display, search, sort, hidden columns, page size, column search and boxes (row reopens if any box has text), column order and widths, facets. |
| Leave and come back | Same state (per `storageKey`, this session). |

## Outcomes
- A searched, filtered, sorted, paged list; matching text marked in cells.
- Saved views per list; state remembered for the session.
- A record's sheet or create flow opening.
- An export toast; nothing exported at 0 rows.
- One of two empty states, each with its one next action.
- `onFacetsChange(ids)` reported on every facet change (a banner knows its filter is on).

## Data contract
- Rows & columns: `rows`, `columns` (must include the `actions` key, which is dropped), `defaultHidden?`, `rowId`, `renderCell`, `text(row, key)` (what a column PRINTS — searched, boxed, sorted), `sortValue?(row, key)`.
- Facets: `facets`, `facetValues(row, facetKey)` (several for a many-valued field).
- Words: `noun` (plural), `nounOne`, `searchPlaceholder`, `ctaLabel?` + `onCreate?` (omit both for a list the user doesn't create in, e.g. Invoices), `openLabel(row)`, `emptyIcon`.
- Persistence: `storageKey` (one per list).
- Slots: `above?`, `banner?`, `afterFilters?`; `segments?` / `segmentValue?` / `onSegmentChange?`.
- Outside control: `applyFacets?` `{ids, n}` (n changes per press), `onFacetsChange?(ids)`. `onOpen?(row)`.
- **ServiceListScreen**: `rows`, `columns`, `rowId`, `renderCell`, `sortValue`, `searchPlaceholder`, `noun`, `icon`, `above?`, `valuesOf?(row, key)` (several values in one cell, e.g. skills). It derives `text` from what `renderCell` prints (`printedText`), `nounOne` from `noun`, `storageKey` `service-{noun}`, `openLabel` "Open {id}", and the facets (Rules 3).

## Rules
1. **Every table page is the standard list**: the view row (All, saved views, Export), search + Filters, the chip shelf, the view bar, the table, pagination. — *one list in this app, not a second thing to learn.* — `(source: ui §10p "Every table page is the standard list", Pavan 2026-10-22; ui §10c)`
2. **Take the composition, not just the components** — the `mt-4` shelf for toolbar + chips, `mt-4` for the table and for pagination. — *bare parts sat flush and read as a crowded band.* — `(source: ui §10c "The composition is part of the component")`
3. **Reference-page filters come from their own category columns**: 2–12 distinct values shared by several rows; not the first column (the record's name/number); not numbers, amounts or dates. — *no page is left without a filter; numbers and dates are what search and the column boxes are for.* — `(source: ui §10p; ServiceListScreen.tsx, 2026-10-22)`
4. **A column box and search match what the cell PRINTS**, not the sort value. — *a date sorts by 2026-09-24 and reads "Sep 24, 2026"; the reader types what they read.* — `(source: ServiceListScreen.tsx printedText)`
5. **One view, so no view switch; no Group by.** — `(source: ui §10h; StandardList.tsx)`
6. **Two empty states with different next actions**: none yet → the CTA; nothing matches → Clear all, with how many exist in all. — *one shared sentence fits neither situation.* — `(source: interactions 2-rules §4c; StandardList.tsx)`
7. **Every change to the narrowing resets to page 1.** — `(source: docs/unified-view/3-interactions.md §7)`
8. **No CTA where the user doesn't create** (Customer Portal › Invoices). — `(source: StandardList.tsx; ui §10c)`
9. **A saved view stores the display it opens in** (`mode`), with everything else. — `(source: ui §10p)`
10. **Banner under the toolbar shelf, right above the table — every module** (Pavan, 2026-10-25).

## Do / Don't
- ✅ Hand it `text` that returns exactly what the cell shows.
- ✅ Give each list its own `storageKey`.
- ✅ Use `ServiceListScreen` for Service reference pages so facets stay automatic.
- ❌ Rebuild a table page from parts when it is table-only — drift starts there.
- ❌ Add a board, map or Group by to it — compose the units directly instead.
- ❌ Facets on the first column, on amounts or on dates.

## Checks
- `parity-lists` G1–G8, G19 (StandardList satisfies them once for every page that uses it).
- `fields-fill` / `tokens` on any `above` content.
- `fpds-units` — the seven parts in order with `mt-4` rhythm.
- By eye: open a reference page beside 3PL › Delivery Orders — same rows, same order, same spacing.

## Reference
- Customer Portal › Invoices (segment Invoices · Statement, no CTA), › Sites & Assets (Ship-tos "Create Ship-to", Assets "Create Asset"), › Team & Access ("Invite user"), › Recurring Orders ("Create Rule", Recommendations in `afterFilters`).
- Service Work › Price Book (jobs), › Parts, › Agreements, › Maintenance (plans), › Compliance (items), › Performance, › Technicians — via `ServiceListScreen`.
