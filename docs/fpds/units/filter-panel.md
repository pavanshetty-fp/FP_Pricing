# Filter panel

`id: unit.filter-panel` · `layer: unit` · `code: prototypes/unified-view/ListFilters.tsx (ListFilters, ListFilterPanel), prototypes/unified-view/filterMemory.ts` · `registry: fpds-filter-panel`

## Purpose
The faceted filter behind the toolbar's **Filters** button: pick values in one or more categories, see how many rows they leave, then apply. It answers "show me only the rows with these values — and how many is that before I commit?"

## Use when / Don't use when
- Use when a list has category columns worth narrowing by (status, type, customer, line of service, business…). Every list's Filters button opens this panel.
- Use the same control with a full-width trigger (`fullWidth`) inside `unit.export-sheet` — it stages until Apply exactly as on the toolbar, and keeps no Recent history. (`ListFilterPanel`, the body alone, exists for a flat layout; no screen uses it today.)
- Don't use for free text (that is the toolbar search or the column search row in `unit.data-table`), for numbers, amounts or dates (date → `unit.date-picker`).
- Don't use for a split flipped many times a session that is exhaustive and short — that is a quick filter in `unit.toolbar` (ui §10c).

## Anatomy
1. **Trigger** — outline `Filters` button with `ListFilter` icon and an applied-count bubble.
2. **Popover** (600px wide), two panes:
   - **Facet menu** (left, 200px): *Recent history* row (`History` icon + count) when any exists, then one row per facet with its ticked count.
   - **Options pane** (right): per-facet **search** field (only facets marked `searchable`), optional **section headings** (uppercase, for a facet with `sections`), **checkbox options** (value, optional second line `description`), "No matches." when search finds nothing.
   - **Recent history pane** (when that row is chosen): one card per applied set — facet label + values per line, then "Just now" / "12 min ago" / "3 h ago".
3. **Footer** — left: live **"N results"**; right: **Clear All** (ghost) then **Apply Filters** (primary).

## Look
- Trigger: `variant="outline" size="sm"` (32px); count bubble `ml-1 rounded-full bg-accent px-1.5 text-xs tabular-nums`.
- Popover: `w-[600px] p-0 overflow-hidden`, panes fixed at 264px tall and scroll inside.
- Facet menu: `border-r border-border p-2 gap-1`; rows `h-8 rounded-md px-2 text-sm`; active row `bg-accent text-accent-foreground`; others `text-muted-foreground`, `hover:bg-accent/60 hover:text-foreground`; counts `text-xs tabular-nums text-muted-foreground`.
- Facet search: `h-8 pl-8` with `Search` glyph; placeholder "Search {facet}…".
- Section heading: `text-xs font-medium tracking-wide uppercase text-muted-foreground`.
- Option rows: `min-h-8 py-1 gap-2`; checkbox nudged `mt-0.5` to center on the first line; value `text-sm`; description `text-xs text-muted-foreground`.
- History cards: `rounded-md border px-3 py-2`; label `text-muted-foreground`, values `text-foreground`; chosen card `border-selected-border bg-selected`; hover `bg-fp-row-hover`.
- Footer: `h-16 border-t border-border px-4`; count `text-sm text-muted-foreground`, number `font-medium text-foreground`; buttons `size="sm"`, `gap-2`.

## States
- **default (closed)** — Filters button; count bubble only when something is applied.
- **open** — first facet selected; ticks start from what is applied (`value`).
- **staged** — ticks changed but not applied: facet-menu counts and the footer count move; the trigger's bubble does not.
- **focus** — `focus-visible:ring-2 ring-ring/50` on menu rows and history cards.
- **selected** — active facet row on `bg-accent`; a history card whose set equals the current ticks is `aria-pressed` on the selection fill.
- **empty** — facet search with no hits: "No matches."; no history: the Recent history row is absent; no `countFor`: footer left is blank.

## Interactions
| Trigger | Result |
|---|---|
| Press **Filters** | Opens the panel; ticks reset to what is applied; Recent history is read (last 24h). |
| Press a facet in the menu | Shows its options; clears the facet search. |
| Type in a facet's search | Filters its options by value AND description (a ship-to is found by its address). |
| Tick / untick an option | Updates the staged set, the facet's count in the menu and the live "N results"; the list does not change yet. |
| Press **Recent history** | Shows the last applied sets, newest first. |
| Press a history card | Puts that set's ticks back (staged); Apply applies it. |
| Press **Apply Filters** | Applies the staged set, records it in Recent history (same set again moves to the top), closes; page → 1; chips appear on `unit.chip-shelf`. |
| Press **Clear All** | Unticks everything AND applies the empty set at once (panel stays open). |
| Esc / click outside | Closes; staged ticks are discarded (next open starts from what is applied). |
| Remove a chip on the shelf, then reopen | The panel shows the chip's value unticked (it re-reads `value` on open). |

## Outcomes
- A list narrowed to rows matching every facet with ticks (AND across facets, OR within one), page 1.
- An emptied filter (Clear All) — every row back, chips gone.
- A history entry (localStorage, per list, 24h, at most 8, newest first, de-duplicated).
- A suggested view name available to `unit.view-row` (the applied ticks are registered with `setActiveFilters`).
- "0 results" shown before applying, when the ticks would leave nothing — the reader can change them before committing.
- Nothing, when closed without Apply.

## Data contract
- `facets: ListFacet[]` — `{key, label, options? | sections?, searchable?}`; an option is a string or `{value, description}`.
- `value?: ReadonlySet<string>` — applied ids as `facetKey:value` (the caller keeps the truth).
- `onApply?(selected)` — fires on Apply and on Clear All. Without it the panel narrows nothing (demo only — never ship that).
- `countFor?(selected) => number` — what Apply would show, computed with everything else on screen (search, column boxes, date).
- `historyKey?` — which list's history (defaults to the facet keys). `fullWidth` — trigger stretches (`h-8 w-full justify-start`); used in the Export sheet; no history is read or recorded, and it does not register for the suggested view name.
- `ListFilterPanel` (body only): `facets`, `checked`, `onToggle(id)`, `menuWidth`, `height?`, `history?`, `onPickHistory?`.

## Rules
1. **Nothing narrows until Apply.** — *the panel is a draft; a list that jumps on every tick is hard to reason about.* — `(source: ListFilters.tsx; interactions 2-rules §4)`
2. **The trigger's count is what is APPLIED, not what is ticked.** — *the button is read with the panel shut; a number that moved as you ticked would count a narrowing that hasn't happened.* — `(source: ListFilters.tsx)`
3. **Live "N results" on the footer's left; Clear All beside Apply on the right.** — *read the number before committing; Clear All is Apply's quieter sibling.* — `(source: docs/ds/interactions/2-rules.md §4, Pavan 2026-10-05)`
4. **Search is per facet, by an explicit `searchable` flag**, not a length threshold. — *a facet you can take in at a glance doesn't need a field; a flag can't silently appear or vanish as options change.* — `(source: ListFilters.tsx)`
5. **Recent history leads the menu — every set applied on that list in the last 24 hours, by category, newest first; absent when there is none.** A press puts the ticks back; Apply applies. — `(source: ui §10p "Filters remember", Pavan 2026-10-21)`
6. **Line of Service, Business (3PL) and Order Kind (Sales) are facets here**, not tabs or segments. — `(source: ui §10p)`
7. **One facet asking the same question at several grains uses sections** (ship-to name / ZIP / state). — *saves three rows of the menu; selections stay independent.* — `(source: ListFilters.tsx)`
8. **Applying a filter resets to page 1.** — *page 4 of a 2-page result looks empty.* — `(source: docs/unified-view/3-interactions.md §7)`
9. **Every applied filter is said out loud as a chip.** — *a quietly narrowed list is the most common way people conclude data is missing.* — `(source: interactions 2-rules §4c)`
10. **Standard-list facets come from the list's own category columns**: 2–12 shared values, not the first column, not numbers/amounts/dates. — `(source: ui §10p; ServiceListScreen.tsx)`

## Do / Don't
- ✅ Pass `value`, `onApply` and `countFor` on every list (`countFor` with the same narrowing the list applies).
- ✅ Mark long facets (customers, ship-tos, vendors) `searchable`.
- ✅ Give a ship-to option its address as `description`.
- ❌ Ship a Filters button without `onApply` (parity G6).
- ❌ Apply on tick in the toolbar popover.
- ❌ Add helper text or a toast to the panel.
- ❌ Put dates or amounts in as facets.

## Checks
- `parity-lists` G6 (a Filters panel applies — `value` + `onApply`), G7 (applied filters show as chips).
- `microcopy` — "Filters", "Recent history", "No matches.", "N results"/"1 result", "Clear All", "Apply Filters".
- `fpds-units` — two panes + footer in order.
- By eye: the trigger count does not move while ticking; the footer count does; reopening after removing a chip shows it unticked.

## Reference
- 3PL › Delivery Orders (Business, Line of Service facets; ship-to sections).
- Sales › Orders (Order Kind facet), Sales › Quotes, Customers, Assets.
- Service Work › Service Orders; Service Work › Parts / Price Book / Agreements / Maintenance / Compliance / Performance / Technicians (auto facets).
- Customer Portal › Orders, › Invoices, › Sites & Assets, › Team & Access.
- Inside any list's Export sheet (full-width trigger, no history).
