# 6 · 3PL guardrails — the parity eval

> **3PL is the reference (Pavan, 2026-10-07):** "whatever has been worked on in
> 3PL is the latest design guardrail". Every module's lists, sheets and tables
> should look and behave like 3PL's. This file turns that into a checklist.

**Sources:** `prototypes/unified-view/threepl/README.md` (lane walk, shell),
`docs/ds/ux/2-rules.md`, `docs/ds/ui/2-rules.md`, `docs/ds/ui/7-variants.md`,
`docs/unified-view/1-components.md` … `3-interactions.md`.
**Reference screens:** `threepl/BrokerOrdersScreen.tsx` (list) and
`threepl/BrokerOrderSheet.tsx` (record sheet). Other 3PL screens (Directory,
Recurring) are **audited too** — they are not the reference.

**How to read a row:** rule · where 3PL does it · layer · how it is checked.

- **L1** = one correct answer. Scripted in `scripts/eval/parity-*.mjs` (or an
  older check), runs with `npm run eval`. Fix it.
- **L2** = a judgement. Read the code against the rule and **surface** it. It
  ends in a decision: fix the code, fix the doc, or leave it and say why.

Each finding prints `file:line`, what is wrong, and the rule id (`G#`).

**Where 3PL does NOT lead.** A few rows below come from Sales (the 2026-10-07
work), not 3PL — the alert banner, the bulk bar on orders, checkbox tables in
settings. They are still guardrails; for those, the check is whether 3PL should
adopt them too.

---

## List screens

| # | Rule | Where 3PL does it | Layer | How it is checked |
|---|---|---|---|---|
| G1 | **Saved views row**: Default · saved views · **+ View**, real (not stubbed). | `BrokerOrdersScreen.tsx:1158` (`useSavedViews`), `:2186` (`FuelOrdersViewBar`) | L1 stub · L2 missing | `parity-lists`: a view bar with `views={[]}` and a no-op `onCreate`. A list with no view bar at all is L2. |
| G2 | **Search + search by column** — the column filter row under the header, not a popover. | `BrokerOrdersScreen.tsx:2354` (toggle), `:2462` (row) | L1 | `parity-lists`: `ListToolbar` without `onToggleColumnFilters`; `ListTable` without `showColumnFilters` + `onColumnFilterChange`. |
| G3 | **Column menu shows/hides AND reorders.** | `BrokerOrdersScreen.tsx:2283-2288` | L1 | `parity-lists`: `ListToolbar` without `columnOrder` + `onReorderColumns`. |
| G4 | **Columns move and resize**, and the arrangement is lifted so a saved view keeps it. | `BrokerOrdersScreen.tsx:2457-2459` | L1 | `parity-lists`: `ListTable` without `onReorderColumns` / `onResizeColumns`; a hand-built list `<Table>` with no `TableColumnHeader`. |
| G5 | **Every column sorts.** | `threepl/orders.ts:1011` (`BROKER_COLUMNS`, every entry `sortable: true`) | L1 | `parity-lists`: every `…COLUMNS = [` set whose entries have `key` + `width`; each needs `sortable: true` or a `sort:` fn. Frame columns (`actions`, empty label) skipped. |
| G6 | **Filters panel applies** — staged ticks, **Apply**, live count. | `BrokerOrdersScreen.tsx:2268` (`ListFilters` with `value` + `onApply` + `countFor`) | L1 | `parity-lists`: `ListFilters` without `value` or `onApply` (it filters nothing). |
| G7 | **Applied filters show as chips** under the toolbar (facets + column search on one shelf). | `BrokerOrdersScreen.tsx:2390` (`FilterChips` + `ColumnSearchChip`) | L1 | `parity-lists`: a screen whose filters apply but has no `FilterChips`. |
| G8 | **Group By works or is off** — never a menu that groups nothing. Off on the board. | Reference: `CustomersScreen` / `DirectoryList.tsx:519` (`groupBy` dims). **3PL Orders breaks this** (`:2253`). | L1 | `parity-lists`: `ListToolbar` with Group By on (default) but no `groupBy`. |
| G9 | **Date range control** (`DateRangeFilter`: single day or span, presets, custom range) on date-scoped lists. | `BrokerOrdersScreen.tsx:2376` | L2 | Read: is the list date-scoped? If so, does it use `dateControl={<DateRangeFilter…>}` (not the old single-day `dateScope`)? |
| G10 | **Export asks first** — `ExportSheet` with the same date + filters controls; exports the whole narrowed set. | `BrokerOrdersScreen.tsx:2249`, `:2476` | L2 | Read: does the list export, and through `ExportSheet` (not a bare toast)? |
| G11 | **View switch only where another view exists** — board icon only with a board; no lone Table icon. | `ListToolbar` `boardView` / `mapView` (default off); `BrokerOrdersScreen.tsx:2253` | L1 | `parity-lists`: `boardView` on a screen with no `BrokerBoard`. |
| G12 | **The board is `BrokerBoard`** with **lane sort** per lane. | `BrokerOrdersScreen.tsx:903` (`laneSortOptions`), `:2424` | L1 | `parity-lists`: `BrokerBoard` without `laneSortOptions`. |
| G13 | **Card fields menu**, scoped per lane or All lanes. | `BrokerOrdersScreen.tsx:734` (`fieldsForLane`), `:2301` (`cardFields` with `scopes`) | L1 | `parity-lists`: board without `cardFields`, or `cardFields` without `scopes`. |
| G14 | **Map view where records have a place** (map takes the sorted set, not the page). | `BrokerOrdersScreen.tsx:2435` (`OrderMapView`) | L2 | Read: do the records have a site? |
| G15 | **Line-of-service segmented control** on the right of the view bar (All first). | `BrokerOrdersScreen.tsx:2199` (`segments`) | L2 | Read: does the module have more than one line? |
| G16 | **Create menu** when one list creates several kinds; a picked route opens its own form. | `BrokerOrdersScreen.tsx:2230` (`createMenu`), `:2547` (route dialog) | L2 | Read: does the list create more than one kind? |
| G17 | **Alert banner** for what needs action now, with **Show**, **Snooze** and **✕ dismiss**. *(Sales origin.)* | Sales: `SalesOrdersScreen.tsx:708-725`, `:1408`, `:1443`. **3PL has none.** | L2 | Read: is there a time-critical condition on this list? |
| G18 | **Bulk bar** when rows can be selected. *(Sales origin on orders.)* | Sales: `SalesOrdersScreen.tsx:1552`; 3PL: `DirectoryList.tsx:725` (`bulkActions`). **3PL Orders has no selection.** | L2 | Read: selection without a bulk bar, or a list that should allow bulk acts. |
| G19 | **Pagination footer** under the table; the **board gets a total** ("N orders across x of y lanes · range") instead. | `BrokerOrdersScreen.tsx:2600` (total), `:2615` (`TablePagination`) | L1 pagination · L2 board total | `parity-lists`: a `ListTable` with no `TablePagination`. Board total: read. |
| G20 | **Empty state: the cause decides the words**, with one way out (Clear search / Go to today). | `BrokerOrdersScreen.tsx:2154` | L2 | Read. |

## Record sheets

| # | Rule | Where 3PL does it | Layer | How it is checked |
|---|---|---|---|---|
| G21 | **Every record sheet is `RecordSheet`** — no hand-built `SheetContent` for a record. | `BrokerOrderSheet.tsx:4252` | L2 (L1 for its footer, G23) | Read every raw `<SheetContent>`; pickers (`AssetMovementSheet.tsx:363`) and Recommendations are allowed. |
| G22 | **Create, then autosave** — the **draft chip** beside the title from the first keystroke on an existing record. | `BrokerOrderSheet.tsx:1708` (`useDraftSaveState`), `:4362` (`DraftStatusChip`) | L1 chip · L2 autosave | `parity-sheets`: a sheet that calls `useDraftSaveState` but never shows `DraftStatusChip`. |
| G23 | **No Save / Update / Cancel** in a sheet footer. Close is the exit. The one exception: **Save as Draft** on a record that is still a draft. | `BrokerOrderSheet.tsx:4273` (`showCancel={false}`) | L1 | `parity-sheets`: `RecordSheet` without `showCancel={false}`; a footer `<Button>` reading Save / Save Changes / Update / Cancel outside a dialog. |
| G24 | **Footer primary = the next act** ("Move to Assigned", "Create Order"), never "Confirm". | `BrokerOrderSheet.tsx:4495` | L2 (L1 for "Save…", older `sheets` check) | `sheets`: `createAction`/`editAction` starting Save/Update. Wording: read. |
| G25 | **A dead primary says why on press** — stays pressable, the pending strip names the gap and pressing scrolls to it. | `BrokerOrderSheet.tsx:4477` (`PendingStrip`), `:4495` | L1 | `parity-sheets`: a first-level `RecordSheet` with `canSubmit` and no `footerPrimary` (the default primary is `disabled` and cannot say why). |
| G26 | **⋯ header menu** for acts ON the record (Cancel order, Delete) — not in the footer. | `BrokerOrderSheet.tsx:4376` | L2 | Read: does the record have a cancel/delete act, and is it in `headerMenu`? |
| G27 | **No step column.** | `RecordSheet.tsx:374` (`stepColumn = false`); README "Shell…" (2026-10-06) | L1 | `parity-sheets`: `stepColumn` passed true. |
| G28 | **Creation floor 756px for the whole create visit**, even after it flips to edit. Export and a partner's quote opt out. | `RecordSheet.tsx:387-392` | L1 | `parity-sheets`: a sheet titled Create/New/Add with `fill={false}`. |
| G29 | **Summary = `SheetCards` `SummaryCard`** (the Quotation summary shell). | `BrokerOrderSheet.tsx:6571` | L1 | `parity-sheets`: a `RailCard` titled "…Summary…". |
| G30 | **Activity = `SheetCards` `ActivityCard`** (timeline: mark, what changed, who · when). | `BrokerOrderSheet.tsx:6780` | L1 | `parity-sheets`: `<ActivitySection>` or a `RailCard` titled "Activity". |
| G31 | **A rail for existing records** (340px, sticky, read-only: summary, related, activity, notes). | `BrokerOrderSheet.tsx:4574` | L2 | Read: does an existing record with a lifecycle have the rail? |
| G32 | **No rail while creating.** | `BrokerOrderSheet.tsx:4574` (grid only once it exists) | L2 | Read: is the rail grid conditional on not creating? |
| G33 | **Closing an unsaved create asks "Discard this …?"** | `BrokerOrderSheet.tsx:7289`, `AssetMovementSheet.tsx:1766` | L2 | Read: create sheets that hold typed data until Create. |
| G34 | **Stage track + sheet follows the stage** (pending strip for every stage). | `BrokerOrderSheet.tsx:4585` (`StageTrack`) | L2 | Read: lifecycle records only. |

## Tables

| # | Rule | Where 3PL does it | Layer | How it is checked |
|---|---|---|---|---|
| G35 | **Boxed table unit** — T1 flush in a card, T2 its own box (§10f). | `BrokerOrderSheet.tsx:7188` (`data-table-variant="T2"`) | L1 | `boxed-tables` (existing). |
| G36 | **Hanging add**; the new row takes the cursor. | `BrokerOrderSheet.tsx:4051`, `:5192`; `autoFocus` `:1076` | L1 | `table-rows` (existing). |
| G37 | **Remove = `TableRowRemove` ✕/✓**, named for its subject. | `BrokerOrderSheet.tsx:1046` | L1 | `table-rows` (existing). |
| G38 | **Delete is its own last column, shown on row hover/focus.** | `TableRowRemove` hover reveal (`src/components/form-layout/table-cells.tsx:657`); Sales Settings `REMOVE_TD` `SalesSettingsScreen.tsx:86` | L2 | Read. |
| G39 | **Booleans in a table are checkboxes**, never switches. A settings list is a Setting · Value table. | `threepl/LoadOrderTable.tsx:77`; Sales Settings `:432` | L1 in a table · L2 for a switch list | `parity-tables`: `<Switch>` inside `<table>/<Table>`; a Settings file with 3+ switches surfaces L2. |
| G40 | **Every cell editable in place** (types and fixed choices as in-cell dropdowns). | `BrokerOrderSheet.tsx` pricing matrix; Sales Settings | L2 | Read. |
| G41 | **Units inside the cell** ($/gal · $ · %, gal) — never a toggle or a second field. | `AssetMovementSheet.tsx:441`, `RecurringProgramCreate.tsx:355`; Sales `QuoteSheet` pricing | L2 | Read. |
| G42 | **Every reorderable row has a handle.** | Sales Settings `:451` (3PL has no reorderable rows) | L1 | `parity-tables`: a draggable `tr`/`TableRow` in a file with no Grip. |
| G43 | **Tables take the full width** — no `max-w-*` cap on a page/section that holds a table. | `BrokerOrdersScreen.tsx` (no cap) | L1 | `parity-tables`: a width cap on a layout container in a file that renders a table. |
| G44 | **Same kind of table = same columns, order and widths** within a module. | `orders.ts:1011` comment (Type column matches Sales) | L2 | Read across a module's tables. |

## Forms

| # | Rule | Where 3PL does it | Layer | How it is checked |
|---|---|---|---|---|
| G45 | **Like inputs are a table** by default (lines, charges, rates, assets, contacts). | `BrokerOrderSheet.tsx` charges matrix | L2 | Read. |
| G46 | **Optional pickers offer the empty choice first** ("No asset"); required ones don't. | ux §Forms; best example `service/ServiceOrderSheet.tsx:1932` (3PL pickers mostly required) | L2 | Read each optional `Combobox` for `clearLabel`. |
| G47 | **No helper text / sub-labels**; explanations live behind ⓘ. | ux "HELPER TEXT IS NOT A DEFAULT" | L2 | `microcopy` (existing, L2). |

## Status, feedback

| # | Rule | Where 3PL does it | Layer | How it is checked |
|---|---|---|---|---|
| G48 | **Status chips by KIND** via `statusTones` / `kindTone`. | `threepl/orders.ts:2570` (`BROKER_STATUS_TONE`) | L1 | `status-kinds` (existing). |
| G49 | **A toast's second line only warns of a consequence** (Pavan, 2026-10-07): "Paused R-1042 / 4 unfinished orders cancelled." No second line that repeats a name or number, or restates the obvious. | BrokerOrderSheet cancel/confirm/reject toasts; RecurringOrdersScreen pause/resume/end/cancel | L1 for the two never-consequence shapes; L2 for the rest | `parity-shell`: flags a second line that is a bare value or stock filler. |

## Dashboards, navigation

| # | Rule | Where 3PL does it | Layer | How it is checked |
|---|---|---|---|---|
| G50 | **Dashboards are built from `DashboardParts`** (ground, Panel, StatTile, BarColumns, BarList). | `ThreePLDashboard.tsx:212` | L1 | `parity-shell`: a `*Dashboard.tsx` that does not import `DashboardParts`. |
| G51 | **Every dashboard figure drills to the filtered list** (or opens the record). | `ThreePLDashboard.tsx:108` (`drill`), `:216-235` | L2 | Read. |
| G52 | **Dashboard first in the rail; the module opens on Orders.** | `UnifiedView.tsx:134` (`THREE_PL_NAV`), `:276` (`MODULE_LANDING`) | L1 | `parity-shell`: a module with a Dashboard not first, or not opening on its Orders page. |

---

## Running it

```bash
npm run eval          # all checks, parity included
```

The parity checks are `parity-lists`, `parity-sheets`, `parity-tables`,
`parity-shell`. Results for 2026-10-07: `results/3pl-parity-2026-10-07.md`.
