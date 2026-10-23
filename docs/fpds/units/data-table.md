# Data table

`id: unit.data-table` · `layer: unit` · `code: prototypes/unified-view/ListTable.tsx (ListTable, TwoLineCell, Hit, OverflowList), src/components/tables-layout/TableColumnHeader.tsx, useTableColumns.ts, useColumnOrder.ts, useColumnWidths.ts, GroupHeaderRow.tsx, src/index.css (th[aria-sort], .fp-sorted-cell), docs/ds/ui/column-widths.md` · `registry: fpds-data-table`

## Purpose
The list's table: every record a row, every column sortable, movable and resizable, the whole row opening the record. It answers "which records match, in what order — and let me open one."

## Use when / Don't use when
- Use for the table display of any list page (with `unit.view-bar` as its `topBar`).
- Use `alignTop` when rows grow tall with stacked child lines (Customer Portal › Orders: one line per tank).
- Use grouped rows (`nodes`) when the toolbar's Group by is on.
- Don't use for an editable table inside a sheet or form — that is the boxed table unit (ui §10f, `TableCell*`).
- Don't use for a list with no list chrome — a table page always comes with the whole unit (ui §10c); prefer `unit.standard-list`.

## Anatomy
1. **Frame** — rounded, bordered box; holds the view bar (`topBar`) above a scroll area.
2. **Header row** (sticky) — optional **select-all checkbox** cell (44px), then one `TableColumnHeader` per visible column: label as a sort button + sort icon; hover shows the move grip (left padding) and the resize edge (`┆│┆`, right boundary).
3. **Column search row** (second header row, only while open) — one "Filter…" box per column.
4. **Body rows** — optional **row checkbox** cell, then cells from `renderCell`. Cell vocabulary in this file: `TwoLineCell` (title over a muted line), `OverflowList` (first value + "+N" chip → BreakdownCard), `Hit` (matched text marked).
5. **Stacked child lines** (Customer Portal › Orders) — per-tank columns print one 24px line per tank inside the row; the order's own cells print once, top-aligned.
6. **Group header rows** (`GroupHeaderRow`) — chevron, dimension label, group label, count bubble, summed measure; nested one level.
7. **Nested layer** (`renderExpanded`, optional) — chevron leading the first cell opens a full-width white row with a 2px green rail. No list passes it today.
8. **Skeleton rows** while `loading`.

## Look
- Frame: `rounded-md border border-border`; table `table-layout: fixed`, width = sum of column widths (+44 with selection).
- Header: 40px (`h-10`), `sticky top-0`, `bg-fp-table-header`, `border-b border-fp-outline-1`, `px-3 text-xs font-medium text-muted-foreground`.
- Sort icon `size-3.5`: unsorted `ChevronsUpDown` at 50% opacity; sorted `ArrowUp` / `ArrowDown` full.
- **Sorted column in grays**: its `th[aria-sort]` on `--chip` with the label `--foreground` and semibold (600); its cells `.fp-sorted-cell` = `--fp-row-hover` at 55%. No brand, no underline.
- Column search row: 44px (`h-11`), `bg-fp-surface-1b` (quieter than the header), `px-2`; boxes `h-7 rounded-md px-2.5 text-xs shadow-none`; placeholder "Filter…" only when the column is ≥ 96px.
- Body rows: 56px (`h-14`), `px-3` cells; hover/focus `bg-fp-row-hover`; selected `bg-fp-row-selected` (via `data-state="selected"`); `alignTop` → `align-top py-3`.
- Checkbox column: fixed 44px, never moves, hides, resizes or sorts.
- Hit mark: `rounded-xs bg-brand/25 font-medium text-foreground`.
- TwoLineCell: title `text-sm text-foreground`, line two `text-xs text-muted-foreground`, both truncate.
- Group header: `bg-fp-lane`, 40px, label `text-sm font-medium`, dim label `text-xs text-muted-foreground`, count `rounded-full bg-muted px-1.5 text-[11px]`.
- Nested layer: `bg-fp-surface-1b`, rail `before:w-0.5 bg-status-success/70`; open parent keeps `bg-fp-row-hover`, no bottom border.
- Skeletons: DS `Skeleton` (shimmer), widths varied per cell (45–90%).
- **Everything left-aligned** — every header and cell, numbers and money included.

## States
- **default** — rows sorted as given, no sort active.
- **hover** — row tint; on the hovered header only: move grip + its resize edge.
- **focus** — a row is focusable (`tabIndex 0`), ring inset `ring-ring/50` + tint.
- **sorted** — header greyed with arrow; column cells light gray.
- **selected** — row tint; header checkbox `indeterminate` when some, checked when all on the page.
- **filtering** — column search row open; boxes with text narrow rows.
- **grouped** — group headers, collapsible; pagination replaced by the grouped footer.
- **expanded** — nested layer open under its parent.
- **loading** — skeleton rows (default 10), never a spinner.
- **empty** — no rows: with the column search row open the table stays (header + boxes, no rows); otherwise the page shows its empty state (see `unit.standard-list`).

## Interactions
| Trigger | Result |
|---|---|
| Click a header label | Sort asc → desc → unsorted (cycle); page → 1. |
| Drag a header body | Reorders columns (drop indicator); checkbox column is fixed. |
| ⌘/Ctrl + ← / → on a focused header | Moves the column one step. |
| Drag a header's right edge | Resizes the column (floor 64px). |
| Double-click the edge | Restores the declared width. |
| ← / → on a focused edge | Nudges the width by 16px. |
| Type in a column's "Filter…" box | Narrows to rows whose printed value in that column contains the text (AND across boxes); page → 1; match marked. |
| Click anywhere on a row | Opens the record (its side sheet). Clicks on a button, link, input, label, checkbox or `[data-no-row-open]` don't; nor does a text selection. |
| Enter / Space on a focused row | Opens the record. |
| Tick a row checkbox | Adds/removes it from the selection (bulk bar appears on screens that have one). |
| Tick the header checkbox | Selects / clears all rows on this page. |
| Click a "+N" chip | Opens the BreakdownCard listing all values. |
| Click a group header | Collapses / expands that group. |
| Click a row's expand chevron (nested layer) | Opens / closes its layer. |
| Frame resizes | Columns re-fill the width (see Rules 2). |

## Outcomes
- A re-ordered list (sorted), a narrowed list (column boxes), page 1.
- A record's sheet opening.
- A rearranged / resized table — saved into the active view (it becomes dirty) or kept for the session.
- A selection for bulk actions.
- Grouped sections with counts and totals; collapsed groups.
- Zero rows with the boxes still showing, so the reader can change them.
- Nothing when a click lands on an inner control or ends a text selection.

## Data contract
- Required: `rows`, `columns` (`{key, label, width, sortable?}`), `sort` + `onSort(key)`, `rowId`, `renderCell(row, key)`, `openLabel(row)` ("Open order 4592866"), `actionsKey` (the legacy chevron column key — it is dropped).
- Opening: `onOpenRow?(row)` — omit for rows that open nothing.
- Arrangement: `hidden?`, `columnOrder?` + `onReorderColumns?`, `columnWidths?` + `onResizeColumns?` (supply to keep them in a saved view; omit and the table remembers for the session).
- Selection (opt-in): `selectedIds`, `onToggleRow(id)`, `onToggleAll(next)`.
- Column search: `showColumnFilters`, `columnFilters`, `onColumnFilterChange(key, value)`.
- Grouping: `nodes?` (from `groupRows`), `collapsedGroups`, `onToggleGroupCollapse`, `groupNoun`, `groupUnit`.
- Other: `topBar?`, `alignTop?`, `loading?`, `skeletonRows?`, `renderExpanded?` + `expandLabel?`.
- `width` per column = the widest rendered cell (see Rules 1); the `align` field exists on `ListColumn` but is not rendered — leave it off.

## Rules
1. **A column starts at its widest RENDERED cell** — text, "+N" chips, pills, day grids — plus padding, never narrower than header + sort arrow, rounded up to 10px. Customer starts at 250, Ship-to / Ship-Tos 170; rule tables give Schedule and the column before it +20. — `(source: ui §10p; docs/ds/ui/column-widths.md; memory feedback_column_widths)`
2. **No empty space on the right, ever.** Spare width goes to columns in proportion to how far each is wider than 120px (icons, counts, codes stay put; names, addresses, contacts grow); rounding leftovers go to the widest; wider than the frame → scroll. No filler column. — `(source: ListTable.tsx, Pavan 2026-10-22; ui §10p)`
3. **Everything is left-aligned** — headers and cells, numbers and money too, in every table. Only row action buttons sit at the end. — *right-aligned Qty sat misaligned with its header.* — `(source: ui §10p, Pavan 2026-10-22)`
4. **The sorted column is shown in grays with an arrow** (`ArrowUp`/`ArrowDown`); unsorted columns keep a faint `ChevronsUpDown`. No brand color. — `(source: ui §10p; index.css, Pavan 2026-10-21)`
5. **Every column sorts, asc → desc → unsorted.** — `(source: docs/unified-view/3-interactions.md §7; parity G5)`
6. **Every column moves and resizes — no enable flag.** The divider resizes (`col-resize`), the header body moves (`cursor-grab`); marks show only on the hovered header. — `(source: docs/ds/ux/2-rules.md "Every table's columns move and resize"; parity G4)`
7. **The whole row opens the record; no chevron column.** — *clicking the row is what everybody tries first.* — `(source: ux 2-rules, Pavan 2026-10-19)`
8. **Search by column is a row of boxes under the header**: AND-ed, cleared on close, stays when nothing matches, table only, kept by saved views. — `(source: ui §10g)`
9. **Selection is opt-in** — no handlers, no 44px checkbox column. — *a column that leads nowhere costs width.* — `(source: ListTable.tsx)`
10. **Rows that grow tall read from the top** (`alignTop`): stacked child lines, one per tank, line up across columns; no nested layer. — `(source: customer-portal/OrdersScreen.tsx, Pavan 2026-10-21)`
11. **Loading is skeleton rows, never a spinner.** — *a list that collapses loses its height and the page jumps.* — `(source: interactions 2-rules §4c; ui §11c)`
12. **Status and Type columns are pills; "+N" opens the BreakdownCard on click.** — `(source: ui §11b; memory feedback_uv_source_of_truth)`
13. **A missing value prints `–` (applies, not filled) or `N/A` (does not apply)** — never a blank cell. — `(source: interactions 2-rules §4c)`
14. **Flat headers — no two-tier column groups** unless Pavan asks. — `(source: ui §10e)`
15. **Full content width, never capped.** — `(source: docs/ds/ux/2-rules.md "Tables — full width…"; parity-tables G43)`

## Do / Don't
- ✅ Measure real rendered cells when adding a column; set `width` from that.
- ✅ Pass `columnOrder`/`columnWidths` handlers when the list has saved views.
- ✅ Use `TwoLineCell` for a record number over its date; `OverflowList` for many values.
- ❌ `align: "right"` or centred numbers.
- ❌ A trailing chevron column or a "View" button to open rows.
- ❌ A filler column to soak up width; a `max-w-*` on the table's container.
- ❌ Brand color or underline on the sorted header.
- ❌ A spinner while loading; an empty message instead of the column search row.

## Checks
- `parity-lists` G2, G4, G5; `parity-tables` G39 (booleans are checkboxes), G43 (no width cap).
- `table-rows` (for editable variants), `tokens` (no raw colors).
- `fpds-units` — header, column search row, body anatomy.
- By eye: no gap on the right at any window width; all columns left-aligned; sorted column gray with arrow; a click anywhere on a row opens it.

## Reference
- 3PL › Delivery Orders (reference table; grouped), 3PL › Directory (loading skeletons, selection).
- Sales › Orders (selection, grouped), Sales › Customers, Sales › Assets.
- Customer Portal › Orders (stacked tank lines, `alignTop`, grouped).
- Service Work › Parts, Price Book, Technicians (via `unit.standard-list`).
