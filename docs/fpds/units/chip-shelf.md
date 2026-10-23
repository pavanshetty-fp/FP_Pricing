# Chip shelf

`id: unit.chip-shelf` · `layer: unit` · `code: prototypes/unified-view/ListToolbar.tsx (FilterChips, ColumnSearchChip), src/index.css ([data-routed] + [data-filter-chips])` · `registry: fpds-chip-shelf`

## Purpose
The one-line strip under the toolbar that says out loud which filters are on, and takes them off. It answers "why is this list shorter than I expect, and how do I undo it?"

## Use when / Don't use when
- Use on every list that has a Filters panel — directly after `unit.toolbar`, inside the same `mt-4` shelf.
- Use `ColumnSearchChip` as a child when the list still has the one-column search (popover form) — it joins the same shelf.
- Don't use for the column search row's boxes — those are visible in the table itself (`unit.data-table`).
- Don't use in the Export sheet — that sheet lists narrowings as rows of chips per category (`unit.export-sheet`).
- Don't use for form token chips — same pill recipe, different unit.

## Anatomy
1. **Scroller** — one line of chips, `overflow-x-auto`, as wide as its chips.
2. **Facet chip** — one per facet, in the panel's facet order:
   - one value: `Label: ` (muted) + value (ink) + ✕;
   - several values: `Label ` (muted) + count bubble + ✕; hover opens a **hover card** listing each value with its own ✕ (heading = facet label, uppercase).
3. **Column search chip** (`ColumnSearchChip`, optional child) — `Search` glyph + `Column: "query"` + ✕.
4. **Clear all** — text button right after the last chip, outside the scroller.

## Look
- Shelf: `mt-3 flex items-center gap-2` (12px under the toolbar); chips `gap-2`.
- Chip = the removable pill: `h-7` (28px), `rounded-full`, `bg-muted`, `pl-3 pr-1`, `text-xs` regular, `text-foreground`; label part `text-muted-foreground`; `max-w-[260px]`, truncates.
- Count bubble: `rounded-full bg-background px-1.5 tabular-nums`.
- ✕: 20px round button (`size-5`), icon `size-3`, `text-muted-foreground`, `hover:bg-foreground/10 hover:text-foreground`, focus ring.
- Hover card: `min-w-[180px] max-w-[280px] p-1.5`; heading `text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground`; rows `text-xs`, `hover:bg-accent/60`.
- Clear all: `text-sm text-muted-foreground`, `hover:text-foreground hover:underline underline-offset-2`.
- Routed layout (only when the toolbar hangs view tools under its icons, `data-routed`): the shelf rises into that row (`margin-top: -1.75rem`) and stops short of the right cluster (`padding-right: var(--fp-routed-w)`). Every list now uses the view bar, so this rule is dormant.

## States
- **empty** — no filter and no column search: nothing renders (no reserved height).
- **default** — chips + Clear all.
- **hover** — multi-value chip opens its hover card (120ms open/close delay); ✕ darkens.
- **focus** — ring on each ✕ and on Clear all.
- **overflow** — chips past the row's width scroll sideways; Clear all stays put.

## Interactions
| Trigger | Result |
|---|---|
| Press ✕ on a one-value chip | Removes that value; list re-narrows; page → 1. |
| Press ✕ on a multi-value chip | Removes all values of that facet. |
| Hover a multi-value chip | Hover card lists its values. |
| Press ✕ on a value in the hover card | Removes only that value; the chip's count drops (becomes a one-value chip at 1). |
| Press ✕ on the column search chip | Clears the column search. |
| Press **Clear all** | Removes every facet filter (not the search box). |
| Scroll the shelf sideways | Reveals chips past the edge. |
| Reopen the Filters panel after removing a chip | The panel shows it unticked. |

## Outcomes
- A wider list, page 1, with the chip gone.
- A facet reduced to fewer values.
- No filters at all (Clear all) — the shelf disappears.
- The active view becomes dirty (update icon / dot in `unit.view-row`), because filters are part of its state.

## Data contract
- `FilterChips`: `facets` `{key, label}[]` (panel order), `selected` (applied `facetKey:value` ids), `onChange(next)`, `className?`, `children?` (e.g. `ColumnSearchChip`).
- Ids split on the FIRST colon only (a ship-to value may hold one); ids for an undeclared facet keep their raw key and go last.
- `ColumnSearchChip`: `searchFields`, `colScope`, `colQuery`, `onClear()`, `className` (default `mt-3`; pass `""` when it joins a shelf that already has chips).

## Rules
1. **One chip per facet, not per value.** — *the shelf grows with the questions asked, not the ticks; six cities can't bury the one status filter.* — `(source: ListToolbar.tsx FilterChips)`
2. **One value shows itself; several show a count, and the hover card shows which — each with its own ✕.** — *the usual reason to look is to take ONE thing off.* — `(source: ListToolbar.tsx)`
3. **One line, always — it scrolls rather than wraps.** — *every pixel of this strip comes out of the data.* — `(source: ListToolbar.tsx)`
4. **Removable chips are pills**: 28px, fully round, `text-xs` on `bg-muted`, label muted, value in ink, ✕ inside as a 20px round button. — `(source: ui §11b, Pavan 2026-10-09)`
5. **Clear all sits right after the last chip**, `text-sm` muted, underline on hover — never pushed to the far end; pinned outside the scroller. — *the way out of a narrowing must not be somewhere you scroll to.* — `(source: ui §11b; ListToolbar.tsx, Pavan 2026-10-09)`
6. **Chips follow the panel's facet order.** — *the shelf and the menu read the same way round.* — `(source: ListToolbar.tsx)`
7. **A narrowing that is on is visible as a chip, and the chip removes it.** — `(source: docs/unified-view/3-interactions.md §7)`

## Do / Don't
- ✅ Place it in the same shelf as the toolbar: `<div className="mt-4 shrink-0"><ListToolbar/><FilterChips/></div>`.
- ✅ Pass the same `facets` the Filters panel uses.
- ❌ One chip per value, or a wrapping second line.
- ❌ Push Clear all to the far right, or put it inside the scroller.
- ❌ Bordered or square chips; a ✕ outside the pill.

## Checks
- `parity-lists` G7 — applied filters show as `FilterChips` on the screen.
- `tokens` — no raw colors on chips.
- `fpds-units` — chip anatomy and Clear all position.
- By eye: chips 28px pills; Clear all directly after the last chip; nothing renders when nothing is applied.

## Reference
- 3PL › Delivery Orders, 3PL › Recurring Orders, 3PL › Directory.
- Sales › Orders, Sales › Quotes, Sales › Customers, Sales › Assets.
- Service Work › Service Orders and every Service Work reference page.
- Customer Portal › Orders, › Invoices, › Sites & Assets, › Team & Access.
