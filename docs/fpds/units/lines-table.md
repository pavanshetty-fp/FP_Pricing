# Lines table

`id: unit.lines-table` · `layer: unit` · `code: prototypes/unified-view/threepl/BrokerOrderSheet.tsx (Delivery Order table), prototypes/customer-portal/OrderRequestSheet.tsx (LinesTable), prototypes/unified-view/ProductTable.tsx (Sales), src/components/form-layout/table-cells.tsx, prototypes/unified-view/HangingAdd.tsx, prototypes/customer-portal/TankLevel.tsx` · `registry: fpds-lines-table`

## Purpose
The order's lines as an editable table: which tank or asset gets which product, and how much. It answers "what is going onto this truck, into which tank" — one row per asset, every cell typed into in place.

## Use when / Don't use when
- Use when a record holds a repeated line of asset · product · quantity — a fuel order, a recurring rule's ship-to, a portal order. Repeated inputs are a table by default; never a stack of fields.
- Use the Sales variant (`ProductTable`: Product · Quantity, plus priced columns for a quote) where the line has no asset.
- Don't use for documents — use `unit.documents-table`.
- Don't use for a one-off value (one product, one quantity) — that is a field row in the record sheet (`unit.record-sheet`).
- Don't use for several values that belong in ONE cell (work types, categories) — that is `TableCellMultiSelect` inside a row, not rows.

## Anatomy
1. **Section header band** — the `SheetSection` title ("Delivery Order" in 3PL, "Tanks & assets" in the portal); the section is `flush`, so the table's edges are the card's edges.
2. **Header row** — Asset · Product * · Current level · On fulfillment (with an ⓘ breakdown popover, `FulfilmentHead`) · Days to empty (while ordering only) · **Top off** + select-all checkbox · **Qty (gal)** · unnamed bin column.
3. **Rows** — `TableCellSelect`/`TableCellCombobox` (asset, multi-pick from a blank row) · `TableCellSelect` (product, ONE VALUE) · `LevelReading` (gauge + %) · `AfterDelivery` / `FulfilmentPct` · `DaysToEmpty` · Top off checkbox (right-aligned) · `TableCellInput` (numeric, suffix "gal", suggestion placeholder) · `TableRowRemove`.
4. **Total row** (`tfoot`) — "Total" label spanning every column before Qty; the sum under Qty, or "Top-off"/"Top off" when every line tops off.
5. **Hanging add** — `HangingAdd` "Add asset" (3PL) / "Add tank or asset" (portal) off the card's squared bottom-left corner.
6. **Hanging-row flag** (3PL only) — "Mark as winter additive" + switch, at the right end of the hanging row, outside the card.
- Sales variant: Product · Quantity (Gal) · caller's priced columns · bin; Total row under Quantity.

## Look
- Header: `bg-fp-table-header`, `px-3 py-2.5`, label `text-sm font-medium`; required mark = `text-destructive` " *" (`TableRequiredLabel`).
- Rows `h-11`, `border-b border-border`, last row no rule; `group/row` for the bin's hover reveal.
- Editable cell = `td relative p-0`; the control is `absolute inset-0`, `px-3`, hover `bg-accent`, focus `bg-fp-surface-1a` + inset `ring-ring/50`. Read-only cells are plain text with `px-3`; empty readings show "—" in `text-muted-foreground`.
- Qty: `tabular-nums`, unit "gal" as `text-xs text-muted-foreground` suffix inside the cell.
- Column widths are fixed px scaled by `var(--fp-scale)` and match the sheet's `fit`: `CELL.pick` 160 (asset, product), `CELL.number` 110 (readings, qty), `CELL.topOff` 104, `CELL.bin` 52 (portal colgroup 44). Too narrow → the table scrolls sideways (portal `overflow-x-auto` with a min width), never squeezes.
- Hanging add: `h-8`, `rounded-t-none rounded-b-md`, `bg-fp-table-header`, plus icon, label slides out on hover/focus.
- Total row: `h-11 border-t border-border`, label `text-sm text-muted-foreground`, figure `text-sm font-medium tabular-nums text-foreground`.
- Everything left-aligned — headers and cells, numbers included; only the row's action sits at the end.

## States
- **default** — one row always; a blank row shows placeholders "Select asset", "Select product", "0".
- **no ship-to yet** — asset cell disabled, placeholder "Select a ship-to first" (3PL "Select a ShipTo first"); product becomes the first focusable cell.
- **hover** — cell lifts to `bg-accent`; the bin fades in on row hover.
- **focus** — cell washes to `bg-fp-surface-1a` with an inset ring.
- **top off ticked** — Qty cell disabled (`opacity-50`), placeholder "Top-off"; typed number kept for unticking.
- **select-all** — checked when every line tops off, indeterminate when some do.
- **suggestion** — empty Qty shows the suggested gallons as placeholder (monitored tank, while ordering).
- **delete armed** — bin swaps for ✕ (keep) over ✓ (confirm, `bg-destructive`), cursor on ✕.
- **last row** — bin disabled/hidden (an order needs a line).
- **sent / locked** — portal: Days to empty column drops, On fulfillment shows the delivered %; the fieldset is disabled.
- **no total** — `tfoot` hidden until a row carries a value.
- **multi-pick list** — checkboxes, items on other rows ticked and locked, footer "N selected" + Apply (disabled at 0).

## Interactions
| Trigger | Result |
|---|---|
| Press the hanging add | A blank row is added at the bottom; its first editable cell takes the cursor |
| Open asset cell on a BLANK row | List with checkboxes; assets on other rows show ticked + locked; footer "N selected" · Apply |
| Tick several, press Apply | First pick fills this row; each other pick becomes its own row right under it, in pick order, each with the asset's product filled |
| Open asset cell on a FILLED row | Single pick that swaps this row's asset; list closes on choice |
| Pick an asset | Product fills from the asset (portal: the product last ordered for it, else its own; 3PL: the asset's product and rental flag) |
| Type a new asset name (3PL combobox) | Offered as its own option (`creatable`) |
| Pick a product | Writes that row's product only |
| Tick a row's Top off | Qty cell shuts and reads "Top-off"; total excludes it |
| Untick Top off | Qty cell reopens with the number typed before |
| Tick header select-all | Every line tops off; untick clears all |
| → (ArrowRight) in an empty Qty with a suggestion | The suggested gallons are taken as the value |
| Type in Qty | Digits only kept; total updates |
| Hover row | Bin appears in the trailing column |
| Press bin | Bin swaps to ✕ / ✓ in place, focus on ✕ |
| Press ✓ | Row removed |
| Press ✕, Escape, or focus leaves | Pair closes, row kept |
| Hover ⓘ on "On fulfillment" | Popover explains the reading |

## Outcomes
- Lines added one per asset (several at once from one Apply).
- A line swapped to another asset; a product changed.
- A line set to top off (no number counted) or a quantity typed / taken from the suggestion.
- A line removed after ✓; nothing removed after ✕/Escape.
- Total updated, or reads "Top-off" when every line tops off; no total while nothing is filled.
- Nothing added when the add has nothing left to add (portal: the add is not rendered once every asset of the ship-to has a line).
- Autosaved into the record (the sheet has no Save).

## Data contract
- In: `lines` (each: asset id/name, product, gallons, topOff), the ship-to (its assets), `focusRow` (the row just added), `onChange(nextLines)`; portal also `live` (draft vs sent), `deliveryKey` (planned date, for suggestion / on-fulfillment / days to empty), `request` (sent order).
- Assets carry monitor readings (level, capacity, daily use) when monitored.
- Out: `onChange` with the full next list for every edit, multi-pick apply, top-off toggle and removal.
- Sales `ProductTable`: `lines {name, gal}`, `options`, `onChange`, `focusRow`, `columns` (key, label, width, cell, total, required), `productLabel`, `qtyLabel`.

## Rules
1. **Repeated inputs are an editable table, every cell editable in place** — *Pavan had to ask for a table where three fields were built; consistency is the default* — `(source: ux/2-rules "Forms — like inputs are a table by default"; memory feedback_table_by_default 2026-10-07)`
2. **Same data, same control: a fuel line is the 3PL Delivery Order's line table, Top off checkbox included** — *the portal shipped a "Gal / Fill to full" menu where every module has Top off* — `(source: ux/2-rules "Same data, same control" 2026-10-13)`
3. **Top off sits just before Qty; Qty is the last column; select-all in the Top off header, row ticks right-aligned** — *Top off replaces the number, so the two are never apart, and the figure the row leads to ends the row; Pavan had to ask twice* — `(source: ui §10i; memory feedback_top_off_after_qty 2026-10-20 final)`
4. **The picker that names the row takes several (checkbox + Apply); first pick fills the row, each other its own row; only from a blank row; picks on other rows show ticked + locked** — *the customer had to open the list once per tank; said three times* — `(source: ui §10f "Picking several makes rows"; memory feedback_multi_pick_rows 2026-10-15/16)`
5. **Every other picker in the row is marked ONE VALUE** — *there is no third kind; the eval checks it* — `(source: ui §10f)`
6. **Top off is a named checkbox column, not a unit menu; the typed number is kept but never counted** — *a unit is not a yes/no; a choice that replaces the number is a checkbox* — `(source: ux/2-rules "A unit is not a yes/no"; interactions §4a T3, T5)`
7. **Cells are `TableCell*` filling the `td` (`relative p-0`); never a bordered control inside a cell** — *a control in a cell is a box in a box, and without `relative` it escapes the table* — `(source: ui §10f "The cells")`
8. **The add hangs off the card's squared bottom-left corner, filled with the header tint, plus with words on hover/focus** — *a band reads as an empty extra row; an outline is a second box* — `(source: ui §10f; HangingAdd.tsx)`
9. **New row at the bottom; the cursor goes into its first editable cell; a blank row is never added twice** — *the add should be followed by the answer, not a hunt* — `(source: ui §10f "Rows")`
10. **Delete asks in place (✕ over ✓) via `TableRowRemove`; the bin names its subject; the last line keeps no bin** — *nothing goes on one careless click; an order with no line has no meaning* — `(source: ui §10f "Rows"; memory 2026-09-23)`
11. **The total is a `tfoot` row, shown only once a row carries a value; all top-off says the word** — *a total outside drifts; "0 gal" about nothing says something false* — `(source: interactions §4a T1–T2)`
12. **A property of the whole load (winter additive) rides the hanging row's right end, outside the card** — *it is not a property of a row* — `(source: ui §10f shape item 5)`
13. **The suggestion is the Qty placeholder; → takes it; Qty starts empty; Top off never pre-ticked** — *no separate Suggested column (Pavan, 2026-10-20)* — `(source: memory project_customer_portal 2026-10-20)`
14. **Column widths are `CELL` px, matched by the sheet's `fit`; everything left-aligned** — *the sheet is only as wide as its tables; right-aligned Qty misaligned with its header* — `(source: memory feedback_ui_rules sheet width; ui §10p 2026-10-22)`
15. **One row is always there; never an empty message instead of rows** — `(source: ux/2-rules "Tables — one row is always there" 2026-10-14)`
16. **Tank lines read: Asset · Product · Current level · Days to empty · On fulfillment · Qty · Top off LAST** — the level the quantity lands at sits beside it; Top off's select-all and every row tick share one right edge; the header carries `data-top-off-last` (3PL DO, CP order, 3PL recurring). Other line tables keep Top off · Qty last — `(source: Pavan 2026-10-26)`
17. **Every header declares `text-left`** — a bare `<th>` centres — `(source: misses M-005; eval th-align)`
18. **Every column its own width; the table scrolls sideways rather than squeezing; no unit suffix in the Qty cell** (the header says "(gal)") — `(source: Pavan 2026-10-26)`
19. **The row delete is a sticky layer at the right edge** — `sticky right-0 z-10 border-l bg-popover`, header cell `bg-fp-table-header`, no heading; the bin shows on row hover; the columns scroll behind it — `(source: Pavan 2026-10-26)`
20. **A monitored tank never takes more than its room on the planned day** — the Qty cell holds the figure to the max AS it is typed and a tooltip says why ("<asset> has room for only N gal on the planned day — more would overfill it."); On fulfillment never exceeds 100% — `(source: Pavan 2026-10-26; misses M-013)`
21. **The On fulfillment card answers first** — "The tank level post delivery will be X%, based on your daily usage." — then **Show breakdown** opens Current level · Requested · Days to deliver (sub: per-day usage · level on the day of delivery) · On fulfillment total; no formula — `(source: Pavan 2026-10-26)`
22. **The asset picker marks the exception and sorts first** — a "No monitor" pill only on assets without a tank monitor; tabs **All · Tank monitor · No tank monitor** above the list (saved-views underline tabs); the list names each asset once — `(source: Pavan 2026-10-26)`
23. **Multi-pick from ANY row** — the row's own value opens ticked; kept, the row stays and each other pick adds a row under it; unticked, the first pick takes the row — `(source: Pavan 2026-10-26; misses M-015; eval multipick-any-row)`

## Do / Don't
- ✅ Asset · Product · (readings) · Top off · Qty · bin, in that order, in every module.
- ✅ `multiple` on the asset picker from a blank row; `ONE VALUE` comment on the product picker.
- ✅ Hanging "Add asset" with a singular label; cursor into the new row.
- ✅ Unit "gal" inside the Qty cell as a suffix.
- ❌ A "Gal / Fill to full" menu, a Suggested column, or Top off after Qty.
- ❌ A bordered Select/Combobox dropped into a `td`.
- ❌ A full-width "Add" band inside the card, or an empty-state panel instead of a blank row.
- ❌ A bin that deletes on one click, or right-aligned number columns.

## Checks
- `table-rows` — row pickers without `multiple`/`ONE VALUE`, adds that focus nothing, removes that don't ask or have no subject, Top off not right before Qty.
- `boxed-tables` — table drawing its own box inside a card, add band instead of hanging add.
- `sheets` — a sheet with a table and no `fit`.
- `parity-sheets`, `field-reach` — the same line fields on every create/edit screen of the record.
- By eye: Qty is last, select-all sits at the Top off header's right, ticks line up under it, total sits under Qty, hanging add joins the card corner.

## Reference
- 3PL › Delivery Orders › Delivery Order sheet — "Delivery Order" section.
- 3PL › Recurring Orders › Create rule — ship-to tab's asset table.
- Customer Portal › Orders › order sheet — "Tanks & assets"; Customer Portal › Recurring Orders › rule sheet.
- Sales › Orders and Sales › Quotes sheets — product table (`ProductTable`, Quote adds priced columns).

> **Sticky delete layer (Pavan, 2026-10-26):** in every editable sheet table the row-remove column is pinned to the right edge (`sticky right-0 z-10 border-l bg-popover`, header `bg-fp-table-header`, no heading); the other columns scroll sideways behind it. The bin still shows on row hover.
