# View bar

`id: unit.view-bar` · `layer: unit` · `code: prototypes/unified-view/ListToolbar.tsx (useViewBar, ViewStatement, BoardWithBar, BAR_TOOL, Reveal, viewToolsInto), prototypes/unified-view/ListTable.tsx (topBar)` · `registry: fpds-view-bar`

## Purpose
A strip ON the view — above the table header or above the board's lanes — that says what is shown ("62 orders · Thu, Oct 22, 2026") and carries that view's own tools. It answers "how many records am I looking at, over what window, and how do I adjust this view?"

## Use when / Don't use when
- Use on every list with a table or a board (ui §10p — every list).
- Don't use on a map view — the map has no view tools and the bar is not rendered for it.
- Don't use for filters, search or the date — those are `unit.toolbar`.
- Don't use inside a side sheet table.

## Anatomy
Left → right, in one 44px row:
1. **Statement** (`ViewStatement`) — the count + noun in medium ink, then the rest in muted: table "62 orders · Thu, Oct 22, 2026"; board "62 orders across 9 of 9 lanes · …"; a dateless list "150 customers".
2. **View tools** (right, 4px apart):
   - Table: **Search by column** (`TextSearch`) · **Show/hide columns** (`Settings2`).
   - Board: **Card configuration** (`LayoutList`).
   Each is icon-only; its name slides out on hover/focus (`Reveal`).
3. **Show/hide columns menu** — header "Columns" + shown/total, a list of every column in table order (grip + checkbox; child entries indented), footer **Show all**.
4. **Card configuration menu** — header "Card fields" + shown/total, optional lane scope picker ("All lanes" or one lane), one switch per category with its fields as indented checkboxes while the category is on, footer **Show all**.

Hosts: table → `ListTable topBar={bar.slot}` (inside the table frame, outside its scroll); board → `BoardWithBar barRef={bar.ref}` (the top strip INSIDE the board's box, like the table — 2026-10-25).

## Look
- Bar: `flex h-11 items-center justify-between gap-3 px-3`.
- In a table: the bar sits in the table's rounded frame, `border-b border-fp-outline-1 bg-fp-surface-1b`, above the sticky header.
- On a board: its own strip `rounded-md border border-border bg-fp-surface-1b`, 12px (`gap-3`) above the lanes.
- Statement: `text-sm text-muted-foreground truncate`; count part `font-medium text-foreground`, locale-formatted.
- Tool (`BAR_TOOL`): ghost `size="sm"` (32px), `px-2`, `text-xs font-normal text-muted-foreground`; **no fill and no outline in any state** (`hover:bg-transparent`, dark too); label gap animates `gap-0 → gap-1.5`, label width `max-w-0 → max-w-48`, opacity 0 → 1, 200ms. Tooltips are hidden in the bar (the label is the tooltip).
- Columns menu: `w-56 p-1`; count `rounded bg-fp-card-1 px-1.5 text-[11px] tabular-nums`; rows `py-1.5 text-sm`, hover `bg-accent`; grip `GripVertical size-3.5`, 20px column; child rows `pl-5 text-[13px] text-muted-foreground`; drop target tinted `bg-accent`, dragged row `opacity-40`.
- Card fields menu: `w-60 p-1`; categories are `Switch size="sm"`; fields are `Checkbox`, indented `pl-5 text-[13px]`.

## States
- **default** — icons only.
- **hover / focus-visible** — the tool's name slides out beside its icon, 12px muted gray (never black); still no fill.
- **on (stays revealed)** — Search by column while its row is open (`aria-pressed`); a tool while its menu is open (`aria-expanded`).
- **disabled** — *Show all* when nothing is hidden.
- **empty** — statement reads "0 orders …" when nothing matches (the bar stays; the table shows no rows while the column search row is open).

## Interactions
| Trigger | Result |
|---|---|
| Hover / focus a tool | Its name slides out. |
| Press **Search by column** | Opens the filter row under the table header (one "Filter…" box per column); the label stays out while open. |
| Press **Search by column** again | Closes the row and clears every box. |
| Press **Show/hide columns** | Opens the columns menu (aligned to the end). |
| Tick / untick a column | Shows / hides it in the table at once. |
| Drag a column's row by its grip, drop on another row | Moves the column to that place in the table. |
| ↑ / ↓ on a focused column row | Moves it one step. |
| Press **Show all** | Shows every hidden column. |
| Press **Card configuration** (board) | Opens the card fields menu. |
| Pick a lane in the scope picker | The ticks below now edit that lane's cards ("All lanes" = every lane). |
| Toggle a category switch | Shows / hides that block on the cards; its fields list appears/disappears. |
| Tick / untick a field | Shows / hides that line inside its block. |
| Change the list (search, filter, date, display) | The statement's count and window update. |

## Outcomes
- A statement that always matches what is on screen (filtered count, window, lanes with cards).
- The column search row open or closed (closing clears its boxes).
- Columns hidden, shown or reordered — the active view becomes dirty.
- Board cards showing more or fewer fields, per lane or for all lanes.
- Nothing hidden by *Hide all* — there is no Hide all.

## Data contract
- `const bar = useViewBar()` → `{into, ref, slot}`.
- Toolbar: `viewToolsInto={bar.into}` and `viewStatement={<ViewStatement count one many rest? />}`; the toolbar portals the table tools or board tools into the bar for `view === "table" | "board"`.
- Table: `ListTable topBar={bar.slot}`. Board: `<BoardWithBar barRef={bar.ref}>…lanes…</BoardWithBar>`.
- Table tools read toolbar props: `onToggleColumnFilters`, `columnFiltersOpen`, `columnFilterCount`, `columns` `{key,label,group?}`, `hiddenColumns`, `onToggleColumn`, `onShowAllColumns`, `columnOrder` + `onReorderColumns` (both → grips on).
- Board tool reads `cardFields` `{units, hidden, onToggle, onShowAll, scope?, scopes?, onScopeChange?}`.

## Rules
1. **Every list with a table or a board has a view bar; the view's tools live there, not under the view icons.** — *a control belongs to the view it acts on.* — `(source: ui §10p "THE VIEW BAR — every list", Pavan 2026-10-22, after a trial on 3PL › Delivery Orders)`
2. **The statement leads with the count, then the window**: "62 orders · Thu, Oct 22, 2026"; the board says "across N of M lanes" (it replaces the board's footer line); a dateless list is just "150 customers". — `(source: ui §10p)`
3. **Tools are icon-only; the name slides out on hover/focus and STAYS out while the tool is on; 12px muted gray, never black; no fill or outline, ever.** — `(source: ListToolbar.tsx BAR_TOOL, ui §10p)`
4. **Search by column and Show/hide columns sit 4px apart, like the view icons.** — `(source: ui §10p)`
5. **Column tools on the table only; Card configuration on the board only; nothing on the map.** — *one icon that changes its subject with the view is one icon nobody can read.* — `(source: ui §10)`
6. **Show all, and nothing facing it — no Hide all.** — *Hide all's only outcome is a screen with no data, one slip from the button people use.* — `(source: ListToolbar.tsx)`
7. **The columns menu follows the table's order and can reorder it.** — *the column you want is usually the one scrolled off the right edge.* — `(source: ListToolbar.tsx; parity G3)`
8. **Card fields: a switch per category, a tick per field, per lane or all lanes; no ordering.** — *the category is the decision; a card's order is its design.* — `(source: ListToolbar.tsx, Pavan 2026-09-23; ui §10)`
9. **Closing the column search row clears every box.** — *a narrowing with nothing on screen is not allowed.* — `(source: ui §10g)`
10. **On a board the view bar is the top strip of the board's own box** (`BoardWithBar`), a line under it — attached like the table's, never a separate box — `(source: Pavan 2026-10-25; misses M-011)`

## Do / Don't
- ✅ Wire all three: `useViewBar()`, `viewToolsInto` + `viewStatement`, `topBar` / `BoardWithBar`.
- ✅ Count the FILTERED rows in the statement.
- ❌ Give the tools a hover fill, an outline, or black text.
- ❌ Show tooltips on bar tools (the sliding name is the label).
- ❌ Hang the tools under the display icons with the routing line (pre-view-bar design).
- ❌ Add a Hide all.

## Checks
- `parity-lists` G2 (search by column is the filter row), G3 (column menu can reorder), G13 (card fields menu per lane / all).
- `fpds-units` — statement left, tools right, correct tools per view.
- `microcopy` — "Search by column", "Show/hide columns", "Card configuration", "Columns", "Card fields", "All lanes", "Show all".
- By eye: bar 44px; tools have no fill on hover; label stays while the row/menu is open; statement count equals the rows matched.

## Reference
- 3PL › Delivery Orders (table and board; the trial screen).
- Sales › Orders (table, board "across N of M lanes · window").
- Service Work › Service Orders (board), Customer Portal › Orders (table, board).
- Sales › Customers ("150 customers"-style, no date), Service Work › Parts and the other reference pages, Customer Portal › Invoices (via `unit.standard-list`).
