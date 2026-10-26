# Toolbar

`id: unit.toolbar` · `layer: unit` · `code: prototypes/unified-view/ListToolbar.tsx (ListToolbar, IconTool), src/components/tables-layout/GroupByMenu.tsx, prototypes/unified-view/DateFilter.tsx, prototypes/unified-view/threepl/DateRangeFilter.tsx` · `registry: fpds-toolbar`

## Purpose
The list's control row (Pavan's original "Control unit"): narrow the list on the left (search, Filters, Group by), scope and present it on the right (date, display switch). It answers "how do I find the rows I want, and how do I want to see them?"

## Use when / Don't use when
- Use when a page shows a list — always directly under `unit.view-row`, inside one `mt-4` shelf together with `unit.chip-shelf`.
- Use the date control only on a list whose rows sit on a date (3PL › Delivery Orders, Sales › Orders, Service Work › Service Orders, Customer Portal › Orders). Omit it on lists with no date (Customers, Parts…).
- Use the display switch only when a second display (board or map) exists.
- Don't use for the view's own tools (Search by column, Show/hide columns, Card configuration) — they live in `unit.view-bar`.
- Don't use inside a side sheet — a sheet's tables use the boxed table unit (ui §10f).

## Anatomy
LEFT cluster (`gap-3`), in this order:
1. *(optional)* **Quick filters** (`quickFilters`) — a joined segmented control, before search.
2. **Search** — 320px field, leading `Search` glyph, trailing clear `X` while it has text; `aria-label` "Search all columns".
3. **Filters** — the `unit.filter-panel` trigger (outline button, `ListFilter` icon, applied count bubble).
4. *(optional)* **After filters** slot (`afterFilters`) — e.g. Recommendations.
5. **Group by** — `GroupByMenu`, only when the screen passes real dimensions and the view is not a board.

RIGHT cluster (`gap-1`):
6. **Date control** — `dateControl` (3PL-style `DateRangeFilter`: ‹ range ›) or `dateScope` (`DateFilter`: ‹ one day ›); then a 12px spacer.
7. **Display switch** — `IconTool`s: `Table2` "Table view", `KanbanSquare` "Board view", `Map` "Map view" — only those the list has.
8. *(legacy, only when no view bar is given)* the active view's tools routed under its icon by an L-shaped line; for a one-view list, the table tools inline in the row.

## Look
- Row: `flex flex-wrap items-start justify-between gap-3` — **top-aligned**, so the search row stays level with the view icons.
- Every control is 32px (`h-8` / `size="sm"` / `icon-sm`); quick filters match (`h-8`).
- Search: fixed `w-[320px]`, `pl-8`, glyph `size-4 text-muted-foreground`; clear `X size-3.5`.
- Filters button: `variant="outline" size="sm"`; count bubble `rounded-full bg-accent px-1.5 text-xs tabular-nums`.
- Display icons: `variant="ghost" size="icon-sm"` with tooltip; active icon on the chip fill (`bg-chip text-foreground`) — `--chip`, not `--accent`.
- Space between date and display switch: 12px spacer + the row's 4px gaps = 20px — space, not a rule.
- Date stepper: arrows `variant="outline" size="icon-sm"`, label `variant="outline" size="sm"`.
- Routed tools (legacy): line `h-4 w-3 rounded-bl-md border-b border-l border-muted-foreground/40` dropping from the active icon's center.

## States
- **default** — empty search, Filters with no count, active display icon on chip fill.
- **hover / focus** — DS button states; tooltips on display icons; `focus-visible:ring-2 ring-ring/50` on the clear button.
- **active** — search has text → clear `X` appears; Filters shows the applied count; Group by shows its active stack (from `GroupByMenu`).
- **selected** — the current display icon.
- **disabled** — date stepper arrows are disabled while the window is "All dates".
- **hidden (not disabled)** — Group by on a board; display switch on a one-view list; date control on a dateless list.

## Interactions
| Trigger | Result |
|---|---|
| Type in search | Narrows rows whose printed columns contain the text (case-insensitive); page resets to 1; matches are marked in cells (`Hit`). |
| Press search's `X` | Clears the search. |
| Press a quick-filter segment | Switches the set being searched/filtered inside. |
| Press **Filters** | Opens `unit.filter-panel`. |
| Press **Group by** → pick a dimension | Groups rows into headed sections (ordered stack, max 2 levels); pagination gives way to `GroupedListFooter`. |
| Press ‹ / › on the date stepper | Moves the window back/forward by its own length (a day steps a day, a week a week). |
| Press the date label | Opens `unit.date-picker` (range form for `DateRangeFilter`, one-date form for `DateFilter`). |
| Press **Table view / Board view / Map view** | Switches the display; the view bar's tools change with it (column tools on table, Card configuration on board, none on map); Group by hides on board. |

## Outcomes
- A narrowed list (search), with page reset to 1 and matched text marked.
- An open filter panel or date picker.
- A grouped table with group headers and the grouped footer.
- A different date window — the list, the view statement and counts follow.
- A different display (table / board / map).
- Nothing changes on a dateless list (no date control) or a one-view list (no switch) — those controls are not drawn.

## Data contract
- Search: `searchValue`, `onSearchChange`, `searchPlaceholder` (names what is searched — "Search orders, customers, partners…").
- `filters` — the screen's `ListFilters` node. `quickFilters?`, `afterFilters?`.
- `groupBy?` `{dimensions, value, onChange}`; `showGroupBy` (false on board).
- `view`, `onViewChange`; `boardView` (default false), `mapView` (default false).
- `dateControl?` (node; wins) or `dateScope?` `{date, onDateChange}`.
- Column/card tool props (`columns`, `hiddenColumns`, `onToggleColumn`, `onShowAllColumns`, `columnOrder`, `onReorderColumns`, `searchFields`, `colScope`, `colQuery`, `columnFiltersOpen`, `onToggleColumnFilters`, `columnFilterCount`, `cardFields`) are passed here but render in `unit.view-bar` when `viewToolsInto` + `viewStatement` are given.

## Rules
1. **Left narrows, right scopes and presents.** Quick filters lead the left, before search — *they decide WHICH SET you then search inside.* — `(source: ui §10c "Quick filters", 2026-09-21)`
2. **Search is the DS's 320px on every list.** — *it is not a row of fields; the same width everywhere.* — `(source: ListToolbar.tsx)`
3. **Group by only when the screen hands it real dimensions; off on the board.** — *a board is already grouped by lane; a menu with nothing behind it is a dead control.* — `(source: ui §10; parity G8, Pavan 2026-10-07)`
4. **One view, no view switch.** A table-only list shows no Table icon. — *a switch with one position switches nothing.* — `(source: ui §10h, 2026-10-01)`
5. **Board and map are switched on by flag, never offered by default.** — *a dead third option teaches people to ignore the switch.* — `(source: ui §10c; ListToolbar `mapView`/`boardView`)`
6. **Display icons are `Table2`, `KanbanSquare`, `Map`, the active one on the chip fill.** — *the pre-round design, restored 2026-10-22; the next design comes from Pavan.* — `(source: ui §10p; memory project_feedback_round_2026_10_21 point 4)`
7. **Top-aligned row.** — *the search row stays level with the view icons when tools hang beneath.* — `(source: ui §10p)`
8. **The date control is a stepper whose arrows move by the window's length.** — *stepping never silently changes how much you are looking at.* — `(source: DateRangeFilter.tsx)`
9. **20px of space, not a rule, between the date and the display switch.** — `(source: ListToolbar.tsx, Pavan 2026-10-05)`
10. **A control the current view can't act on is hidden, not disabled.** — *a control on screen that does nothing teaches people to stop reaching for it.* — `(source: ui §10)`
11. **One gap, 12px, between every control group** — search ↔ Filters ↔ Group by, and date ↔ view switch — `(source: Pavan 2026-10-25; misses M-012)`
12. **The view switch is one bordered segmented control** — list · kanban (two upright columns side by side, a gap between) · map icons; the selected segment a grey fill — `(source: Pavan 2026-10-23)`
13. **Export is an outlined square as tall as the Create CTA** (24 × 24, the icon centred, the CTA's corner radius) — `(source: Pavan 2026-10-26)`

## Do / Don't
- ✅ Wrap toolbar + chip shelf in one `mt-4 shrink-0` shelf (ui §10c composition).
- ✅ Pass `viewToolsInto` + `viewStatement` so the column tools sit in the view bar.
- ❌ Show a lone Table icon on a table-only list.
- ❌ Leave Group by on with the demo dimensions (it groups nothing).
- ❌ Put Search by column / Show-hide columns on a board or map.
- ❌ Add a divider line between the date and the display switch.

## Checks
- `parity-lists` G2 (search by column is the filter row), G6 (Filters applies), G8 (Group by fed or off), G11 (board only where rendered).
- `fpds-units` — left/right order as in Anatomy.
- By eye: all controls 32px on one baseline; search 320px; active display icon on chip fill; nothing hanging under the icons when a view bar is used.

## Reference
- 3PL › Delivery Orders (table · board, range date stepper, Group by) — the reference list.
- Sales › Orders (table · board · map, range date stepper).
- Service Work › Service Orders (board, range date).
- Customer Portal › Orders (table · board · map, Group by).
- 3PL › Recurring Orders, Customer Portal › Recurring Orders (Recommendations in `afterFilters`).
- Sales › Customers / › Assets (table only, no date); 3PL › Directory (no date; Vendors adds a map).
