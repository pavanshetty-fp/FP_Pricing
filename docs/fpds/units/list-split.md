# List view

`id: unit.list-split` · `layer: unit` · `code: prototypes/unified-view/ListSplitView.tsx` · `registry: fpds-list-split`

## Purpose
Shows a board's records as a slim list on the left and the picked record's own sheet docked on the right, so a reader can read the same section across many records without opening and closing each one. After Dynamics 365's List view.

## Use when / Don't use when
- Use when the list has a board (`boardView`) and its records open a `RecordSheet` — 3PL Delivery Orders (V3), Sales Orders, Service Work.
- Don't use in the Customer Portal — customer-facing; CP features do not auto-spread.
- Don't use for lists without a sheet to dock, or without status steps → the table.

## Anatomy
1. **Left pane** (320px, `BoardWithBar` box with the view bar on top):
   - **Status pills** — one row, scrolled sideways: All, then every status step in board order, each with its count.
   - **Rows** (`BoardRowList`) — order number + status chip · ship-to (pin) · planned date and window · what goes (truck; wrench in Service) · the pending step.
2. **Detail** (fills the rest) — the record's own sheet inside `DockedSheet`: same header, body and footer, no overlay, no close.

## Look
- Pills: `Pill` shape; rest = `bg-transparent text-muted-foreground ring-1 ring-inset ring-fp-outline-1`; picked = the neutral pill (`bg-muted`) `font-medium text-foreground`; a 0-count step `opacity-40`.
- Rows `px-3 py-2.5 border-b border-fp-outline-1`; number `text-sm font-semibold`; ship-to and what-goes `text-sm font-normal`; date `text-xs text-muted-foreground`; icons size-3.5 `text-muted-foreground`; pending step `text-xs` in its alert accent.
- Picked row `bg-fp-table-header` (the lightest grey); hover `bg-fp-row-hover`. No brand or status colour on selection.
- Docked sheet `rounded-lg border border-border bg-popover`, `gap-3` from the pane.

## States
- **Row default / hover / picked / focus** — as Look; focus 2px `ring-ring/50` inset.
- **Pill picked / at rest / empty (0, disabled)**.
- **Nothing picked yet** — the first row of the shown set.
- **Picked row filtered out** — the first row of the new set.

## Interactions
| Trigger | Result |
|---|---|
| Click a row | Its record fills the detail; the detail keeps its scroll position (same section). |
| ↑ / ↓ in the list | Previous / next row, picked and focused. |
| Click a pill | Only that status's rows; the view bar's count follows. One at a time; All is the way back. |
| Click a pending step that names a section (3PL "Vendor not selected") | Picks the row and scrolls the docked form to that section (`attend`). |
| Edit in the detail | The sheet's own autosave. |

## Outcomes
- The detail shows the picked record; edits save as they do in the sheet.
- A narrowed list by status; the view bar says how many.

## Data contract
- `items: ListSplitItem[]` — `card` (the board card), `status` (pill key), `label`, `tone`, optional `when` / `what` overrides.
- `steps {key,label}[]` — the pills after All, board order.
- `status` / `onStatusChange` — the picked pill (null = All).
- `selectedId` / `onSelect`.
- `onPending?(card)` → a handler when that card's pending step has a section.
- `renderDetail(id)` — the record's sheet, rendered docked.

## Rules
1. **One unit for every board module** — *the same view must behave the same wherever you come in.* `(source: Pavan 2026-10-29)`
2. **Rows, not cards; no CTAs in the rows** — *the list is for picking; the pending step is a link, not a button.* `(source: Pavan 2026-10-29)`
3. **Selection is greyscale and light** — *the brand tint and `bg-muted` read too heavy beside a form (M-034).* `(source: Pavan 2026-10-29)`
4. **Pills are neutral, one row, one at a time** — *fewer colours; All is the way back.* `(source: Pavan 2026-10-29)`
5. **The detail keeps its scroll across picks** — *the reader stays on the section they were comparing.* `(source: Dynamics 365 List view; Pavan 2026-10-29)`
6. **Second in the display switch: Table · List · Board · Map.** `(source: Pavan 2026-10-29)`

## Do / Don't
- ✅ Feed it the board's own cards so rows say what cards say.
- ✅ Dock the module's real sheet — never a copy.
- ❌ Put Select Vendor or other buttons in a row.
- ❌ Colour the pills or the picked row by status or brand.

## Checks
- `tokens`, `parity-shell` (view switch), `fpds-register`.
- By eye: pick → same section; pills scroll; picked row light grey; pending link scrolls.

## Reference
- 3PL › Delivery Orders (board V3) — List view.
- Sales › Orders — List view.
- Service Work › Service Orders — List view.
