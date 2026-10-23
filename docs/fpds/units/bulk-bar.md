# Bulk bar & bulk edit

`id: unit.bulk-bar` · `layer: unit` · `code: prototypes/unified-view/FuelOrdersBulkBar.tsx, src/components/tables-layout/BulkActionBar.tsx, src/components/bulk-edit/BulkEditDialog.tsx, src/components/bulk-edit/parts.tsx, prototypes/unified-view/BulkEditDialog.tsx` · `registry: fpds-bulk-bar`

## Purpose
Acts on several ticked rows at once: change one field across them, or apply an action (archive, delete, export). Answers "do this to all of these — and show me what will change before it does."

## Use when / Don't use when
- Use when a list table has row checkboxes and rows are ticked.
- Use the field actions + `BulkEditDialog` when the edit changes a value per row (date, time, driver, products, tags).
- Use `BulkActionBar` with its own `actions` for a list whose verbs are its own (3PL Directory).
- Don't use on a board — row ticks live in the table (Sales › Orders shows the bar in the table view only).
- Don't use for a property of the whole round (e.g. "ask these for a price") — that is a switch over the round, not a selection.
- Don't build a second bar in place — pass `actions` to the one bar.

## Anatomy
**The bar** (floating, centred over the bottom of the list), left to right:
1. **Count chip** — "N Selected" with a clear ✕ inside.
2. **Field / verb actions** — icon + label each (Fuel orders: Products · Driver · Planned date · Planned time · Add tags).
3. **Hairline** — before the destructive zone.
4. **Delete** — icon-only trash, always behind a confirm.
(DS default set, when no `actions` are passed: Assign · Unassign · Unblock · Verify · Unverify, then Copy · Delete · ··· More with a searchable, grouped field menu — Assignments · Scheduling · Order Details.)

**The bulk edit dialog**, two steps:
1. **Pick** — title = the field; description = scope + count ("Assign driver to selected **25 orders**"); body = the picker; footer Cancel · Proceed and Confirm.
2. **View Summary** — description = what the commit does; body = per-row before/after table (or standing load + orders being added); footer Go back (left) · Confirm (right).

Parts: `BeforeAfterTable` (ID · Current {field} · New {field}), `StandingItems` (what the target already holds, collapsed), `RecordMiniTable` (Order No · Order Type · ShipTo/Terminal).

## Look
- Bar: `rounded-lg`, 1px `border-fp-outline-1` (dark `fp-outline-2`), fill `bg-fp-surface-1a` (dark `bg-fp-card-1`), `p-1.5`, `gap-1`, elevation `shadow-fp-overlay`; enters with `bulk-bar-in` (slides up 1rem, fades in, 200ms ease-out).
- Placement: absolutely positioned, centred, `bottom-5` (Sales) / `bottom-4` (Directory) over the list.
- Count chip: `rounded-md bg-primary text-primary-foreground text-sm font-medium`, ✕ 14px at `primary-foreground/80`.
- Actions: `Button variant="ghost" size="sm"`, icon + label, equal weight, no primary fills.
- Hairline: `h-5 w-px bg-border`, `mx-1`.
- Delete / destructive: `size="icon-sm"` ghost, `text-destructive`, hover `bg-destructive/10` — color on the glyph only, no fill.
- Dialog: `default` size on Pick, `lg` on Summary; body scrolls (`max-h-[55vh]`), header and footer stay.
- Before cell: `text-muted-foreground line-through`, empty → "—"; after cell `font-medium`.
- `StandingItems`: `rounded-md border bg-fp-surface-1b`, list capped `max-h-56` and scrolls within itself.

## States
- **hidden** — nothing ticked (count 0) → no bar.
- **shown** — slides in when the first row is ticked.
- **edit reach 0** — Sales mixes fuel and asset orders; if none of the ticked rows is a fuel order, only Delete is offered.
- **action disabled** — greyed with a reason in `title` (e.g. "You do not have permission to archive records").
- **dialog step Pick, nothing picked** — Proceed and Confirm disabled.
- **dialog step Summary** — before/after shown; for a `destructive` replace, Confirm first arms, then reads "Yes, replace N orders".
- **dialog reopened** — always starts on step 1.

## Interactions
| Trigger | Result |
|---|---|
| Tick a row checkbox (table view) | Bar slides in with "1 Selected" |
| Tick more / header select-all | Count updates |
| Press ✕ in the count chip | Selection clears; bar disappears |
| Press a field action (Products, Driver, Planned date, Planned time, Add tags) | `BulkEditDialog` opens on Pick, scoped "… selected N orders" |
| Pick a value | Proceed and Confirm enables |
| Press Cancel / close the dialog | Dialog closes; pending value discarded; nothing changed |
| Press Proceed and Confirm | Step 2 "View Summary" with per-row before/after (Driver: that driver's standing load on the same day + orders being added) |
| Press Go back | Back to Pick with the value kept |
| Press Confirm | Commits to every selected row; toast "Updated N orders"; dialog closes; columns recompute |
| Driver: pick "— Unassigned" | Summary says the orders return to Unassigned; Confirm clears the driver |
| Products: pick several | Each order's lines are replaced; that order's own total gallons split across them, so Qty is unchanged |
| Add tags | Tags are added to what each order carries; nothing removed (after = union) |
| Press Delete (trash) | Confirm dialog "Delete N orders?" — "This will affect N orders and cannot be undone." Cancel / Delete |
| Confirm Delete | Rows removed |
| Directory: press a destructive verb (Archive) | Same confirm, titled "{Verb} for N {noun}s?" |
| Directory: press Export selection / Add "Watch List" tag / Deactivate / Enable TopOff / Mark under maintenance | Applied to all ticked records; toast; selection clears |
| DS default bar: press ··· More | Searchable two-column field menu opens above the bar |

## Outcomes
- A field changed on every selected row, with a success toast and recomputed columns (Qty, status).
- Orders returned to Unassigned (driver cleared).
- Rows deleted or records archived/restored after a confirm.
- An export toast ("N customers exported").
- Nothing, on Cancel / closing / Go back then close.
- No bar on Sales › Orders board or map views.

## Data contract
- `FuelOrdersBulkBar`: `count`, `editCount?` (how many the field edits reach; 0 → Delete only), `onClear`, `onSetProducts(string[])`, `onSetDriver(string | null)`, `onSetPlannedDate(Date)`, `onSetPlannedTime(string)`, `onAddTags(string[])`, `onDelete`, `productOptions`, `driverOptions`, `tagOptions`, `selectedOrders`, `unselectedOrders` (for standing load).
- `BulkActionBar`: `count`, `onClear?`, `actions?: BulkAction[]` (`key`, `label`, `icon`, `disabled?`, `title?` reason, `destructive?`, `onSelect`), `tools?` (Copy/Delete/More zone; off when `actions` given), `noun?` for confirm copy.
- `BulkEditDialog`: `open`, `onOpenChange`, `title`, `scopeVerb` (composed "{scopeVerb} selected {N items}"), `count`, `itemNoun?`, `canProceed`, `children` (picker), `summary`, `summaryDescription`, `onConfirm`, `toastMessage?` (string or `false`), `destructive?`.

## Rules
1. **One bar, actions passed in** — *what can be done to a selection belongs to the records, not the bar; a second bar built in place breaks the feel of selection everywhere* — `(source: interactions §4b)`
2. **A selection starts empty and is transient** — *a row that arrives ticked answers a question nobody asked and puts a bar on screen too early; selection belongs to the visit* — `(source: interactions §4b)`
3. **Don't make a selection carry a second meaning** — *two decisions sharing one control make one default wrong* — `(source: interactions §4b)`
4. **Bar comes last on the page** — *it appears and disappears; anything below it would jump* — `(source: interactions §4b)`
5. **Compact neutral floating pill, not a toolbar; actions icon + label, equal weight, no primary fills; destructive = small red glyph** — `(source: interactions §4b; ux/2-rules)`
6. **Labels are mandatory on field actions** — *these are never icon-only* — `(source: FuelOrdersBulkBar.tsx; BulkActionBar.tsx)`
7. **Delete always confirms** ("Delete N orders?") — *irreversible across many rows* — `(source: BulkActionBar.tsx; ux/2-rules)`
8. **Pick the editor tier by cardinality** — scalar (date, time) · one value per row (driver) · collection per row (products, tags) — `(source: interactions §4b)`
9. **Two steps when a mutation changes values per row: Pick (scope + count) → per-row before/after → Confirm** — *the operator must see what already exists before replacing it; collapsing to one step removes the only chance to notice* — `(source: BulkEditDialog.tsx; interactions §4b)`
10. **The dialog always reopens on step 1** — *reopening mid-flow would show Confirm for a value no longer visible* — `(source: BulkEditDialog.tsx)`
11. **Width per step: `default` while picking, `lg` for the summary** — `(source: ux/2-rules Side-sheet, width per step)`
12. **Apply → toast → recompute across every affected row**; toast is one line — `(source: interactions §4b; memory feedback_toasts)`
13. **A dead action says why** — disabled with the reason as its title — `(source: BulkActionBar.tsx; interactions §7b)`
14. **Driver load is scoped to the selection's delivery date(s)** — *the load on the day you assign is the number that decides* — `(source: FuelOrdersBulkBar.tsx)`

## Do / Don't
- ✅ Show the bar only when rows are ticked, in the table view.
- ✅ Pass a list's own verbs via `actions` and a `noun` for the confirm copy.
- ✅ Show "Current / New" per row before committing a replace.
- ✅ Strike through the old value; show "—" when there was none.
- ❌ Pre-tick rows on arrival.
- ❌ Commit a field edit on the first click from a popover.
- ❌ Fill actions with brand/primary colors or tint the delete background.
- ❌ Hide inapplicable actions — show them disabled with the reason.

## Checks
- Eval: `tokens`, `microcopy` (toast and confirm wording), `parity-shell` (toasts one line).
- By eye: bar centred and floating with rim + overlay shadow; count chip primary; hairline before Delete; dialog header leads with scope + count; summary shows before/after; toast after Confirm.

## Reference
- Sales › Orders (table view) — `FuelOrdersBulkBar`: Products · Driver · Planned date · Planned time · Add tags · Delete.
- 3PL › Directory › Customers · Vendors · Products · Rental Assets — `BulkActionBar` with list verbs (Export selection, Add "Watch List" tag, Deactivate/Reactivate, Enable TopOff, Mark under maintenance, Archive/Restore).
