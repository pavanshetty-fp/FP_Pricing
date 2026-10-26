# FPDS · 03 Molecules

Small combinations of atoms with one job each. Same spec-card sections as the
atoms, at `###` level. Token names are from [`01-foundations.md`](01-foundations.md);
atoms are referenced by id from [`02-atoms.md`](02-atoms.md).

---

# Finding and narrowing

## Search field

`id: molecule.search-field` · `layer: molecule` · `code: prototypes/unified-view/ListToolbar.tsx (search box)` · `registry: fpds-search-field`

### Purpose
Search every column of a list from the toolbar.

### Use when / Don't use when
- Use as the list toolbar's search — one per list, every list.
- Don't use to search one column (→ Search by column, the filter row under the header) or inside a picker (the Command input does that).

### Anatomy
`Search` glyph (left, inside) · `atom.input` (`type="search"`) · clear `X` button (right, only with a value).

### Look
**FIXED WIDTH 320px** container (`relative w-[320px]`). Input `h-8 pl-8` (+ `pr-8` with a value). Glyph `size-4 text-muted-foreground` at `left-2.5`. Clear: `size-3.5` `X` in a `rounded-sm p-0.5` button at `right-2`, `text-muted-foreground hover:text-foreground`.

### States
empty (placeholder, no ✕) · typing / has value (✕ shows) · focus (ring).

### Interactions
| Trigger | Result |
|---|---|
| Type | List narrows live, every column |
| Press ✕ | Value cleared, list restored, focus stays |
| Leave the list and return | Search is still there (lists remember) |

### Outcomes
A narrowed list; "N orders" in the view bar updates.

### Data contract
`searchValue`, `onSearchChange(v)`, `searchPlaceholder`. `aria-label="Search all columns"`; clear `aria-label="Clear search"`.

### Rules
1. **The list search is 320px on every list** — the one sanctioned `FIXED WIDTH`. `(DS ui §10e)`
2. **Search sits left, after quick filters, before Filters and Group By.** — *Pick the set, then find the row.*
3. **Lists remember search, filters, sort and view when you leave and return;** only Clear all removes filters. `(2026-10-09)`

### Do / Don't
- ✅ Placeholder names the record ("Search orders").
- ❌ A search that stretches to fill the toolbar.

### Checks
`fields-fill` (the `FIXED WIDTH` comment). By eye: ✕ only with a value.

### Reference
3PL › Delivery Orders toolbar; Sales › Orders toolbar.

---

## Filter chip

`id: molecule.filter-chip` · `layer: molecule` · `code: prototypes/unified-view/ListToolbar.tsx (FilterChips, ColumnSearchChip)` · `registry: fpds-filter-chip`

### Purpose
Show which filters are on, one removable pill per facet, under the toolbar.

### Use when / Don't use when
- Use whenever a list has applied filters or an active column search.
- Don't use a count badge on the Filters button instead ("Filters 7" is not an answer).

### Anatomy
Shelf (`data-filter-chips`) · scroller of chips · column-search chip (inside the scroller) · **Clear all** (after the last chip, outside the scroller). Chip: label (muted) · value (body ink) **or** count bubble · ✕.

### Look
Chip: `h-7 max-w-[260px] rounded-full bg-muted pl-3 pr-1 text-xs text-foreground gap-1`; label `text-muted-foreground`; count `rounded-full bg-background px-1.5 tabular-nums`; ✕ a 20px round button (`size-5`, `X size-3`, `hover:bg-foreground/10`). Column-search chip: same, with a `Search size-3` glyph and `Label: “query”`. Clear all: `text-sm text-muted-foreground hover:underline hover:text-foreground`. Shelf `mt-3 gap-2`, one line, scrolls rather than wraps. When the view's tools are routed under the view icons, the shelf rises into that row (`[data-routed] + [data-filter-chips]`).

### States
one value ("City: Bakersfield") · several values ("City 3" — hover card lists them, each with its own ✕) · hover card open.

### Interactions
| Trigger | Result |
|---|---|
| ✕ on a one-value chip | That filter is removed |
| ✕ on a grouped chip | Every value of that facet is removed |
| Hover a grouped chip | Card lists values (uppercase 10px facet heading), each removable |
| Clear all | All filters off |
| ✕ on column-search chip | Column search cleared |

### Outcomes
A wider list; the Filters panel's ticks match.

### Data contract
`FilterChips`: `facets {key,label}[]` (panel order), `selected` (`facetKey:option` ids), `onChange(next)`, `children` (the column-search chip). `ColumnSearchChip`: `searchFields`, `colScope`, `colQuery`, `onClear`.

### Rules
1. **One chip per facet, not per value; one value shows itself, several show a count.** — *The shelf should be as long as the questions asked.*
2. **Removable chips are pills with the ✕ inside.** `(DS ui §11b, 2026-10-09)`
3. **Clear all sits right after the last chip,** never pushed to the far end. `(2026-10-09)`
4. **One line, always** — it scrolls. — *Every pixel of it comes out of the data.*

### Do / Don't
- ✅ "Status: Assigned", "City 3".
- ❌ Three "City" chips; Clear all at the far right.

### Checks
`tokens`. By eye: chip shelf one line; Clear all adjacent.

### Reference
3PL › Delivery Orders (after applying Filters); Customer Portal › Orders.

---

## Icon tool

`id: molecule.icon-tool` · `layer: molecule` · `code: prototypes/unified-view/ListToolbar.tsx (IconTool, BAR_TOOL)` · `registry: fpds-icon-tool`

### Purpose
An icon-only toolbar control named by a tooltip — view switch and view tools.

### Use when / Don't use when
- Use for the display icons (Table · Board · Map) and the view's tools (Search by column, Show/hide columns, Card configuration).
- Don't use for a labeled action (→ `atom.button` with text).

### Anatomy
Ghost `icon-sm` button · Lucide icon · tooltip. In the view bar: icon + a name that slides out.

### Look
**Display icon:** `Button variant="ghost" size="icon-sm"` (32px); active `bg-chip text-foreground`; icons `Table2`, `KanbanSquare`, `Map`. **View-bar tool:** `h-8 px-2 text-xs font-normal text-muted-foreground`, no fill ever (not on hover, not when on); its name reveals over 200ms on hover, focus, `aria-pressed` or `aria-expanded` and stays out while the tool is on. Tools 4px apart like the view icons.

### States
rest · hover · focus · active view (`bg-chip`) · tool on (name stays out).

### Interactions
| Trigger | Result |
|---|---|
| Hover / focus | Tooltip (display icon) or name slides out (view-bar tool) |
| Click display icon | Switches table / board / map |
| Click Search by column | Opens / closes the filter row under the header |
| Click Show/hide columns | Opens the column menu |

### Outcomes
Another display, a column filter row, a column set, card fields.

### Data contract
`label` (tooltip + `aria-label`), `view`, `active`, `onClick`, `children` (icon).

### Rules
1. **One view → no view switch;** the board icon only where a board exists. `(DS ui §10h)`
2. **The active view's tools sit in the view bar** (table: Search by column, Show/hide columns; board: Card configuration; map: none). `(DS ui §10p, 2026-10-22)`
3. **Tool names are muted gray 12px, never black; no fill or outline.**
4. **Active display uses `bg-chip`, not `bg-accent`.**

### Do / Don't
- ✅ Tooltip "Search by column".
- ❌ A lone Table icon on a list with one view.

### Checks
By eye.

### Reference
3PL › Delivery Orders (view icons + view bar).

---

# Cells and chips

## Status pill

`id: molecule.status-pill` · `layer: molecule` · `code: src/components/ui/status-chip.tsx + prototypes/unified-view/statusKind.ts` · `registry: fpds-status-pill`

### Purpose
A record's status in a cell, header or card — the status word in its kind's color.

### Use when / Don't use when
- Use in every status column, every sheet header status, every board card.
- Don't use for a type or tag (→ `atom.pill` with `color`), or where every row has the same value (render nothing).

### Anatomy
The module's status → kind map · `statusTones()` · `StatusChip tone`.

### Look
`atom.pill` recipe in the kind's colors: caution amber, info blue, success green, critical red, neutral gray.

### States
One per kind.

### Interactions
| Trigger | Result |
|---|---|
| — | Display |

### Outcomes
—

### Data contract
A map `Record<Status, StatusKind>` in the module; `ORDER_TONE = statusTones(map)`; `<StatusChip tone={ORDER_TONE[s]}>{s}</StatusChip>`. Sales stages may carry a user `color`.

### Rules
1. **Kinds are about what the reader should do:** caution waits on somebody, info is simply true, success is done, critical is a warning, neutral is neither. `(DS ui §10b)`
2. **Canceled is neutral; Paused is caution; Skipped neutral; "Quotation received" caution; Maintenance OK neutral.**
3. **The application's docs keep ONE color-mapping table.** — *A hue cannot mean two things in two modules.*
4. **A badge of one meaning is a badge nobody needs.**

### Do / Don't
- ✅ Assigned = info in every module (3PL "Assigned" is the old "Accepted").
- ❌ Green "Active" customers.

### Checks
`status-kinds`.

### Reference
3PL › Delivery Orders (Status column); Service › Service Orders board.

---

## Two-line cell

`id: molecule.two-line-cell` · `layer: molecule` · `code: prototypes/unified-view/ListTable.tsx (TwoLineCell)` · `registry: fpds-two-line-cell`

### Purpose
A record's name with the one fact that tells it apart, in one cell.

### Use when / Don't use when
- Use for a customer + location, an order + product, a rule + schedule summary.
- Don't use to stack two unrelated values (give each its column).

### Anatomy
Title line · description line. Matched search text is marked in both.

### Look
`flex flex-col min-w-0`; title `truncate text-sm text-foreground`; description `truncate text-xs text-muted-foreground`. Left-aligned.

### States
default · search hit (matched run marked).

### Interactions
| Trigger | Result |
|---|---|
| Row click / Enter | Opens the record (the row, not the cell) |

### Outcomes
—

### Data contract
`title`, `description`, `q` (column filter text).

### Rules
1. **Everything left-aligned.** `(DS ui §10p, 2026-10-22)`
2. **Rows open on click / Enter; no row chevron.** `(2026-10-19)`

### Do / Don't
- ✅ "Acme Fuels / Bakersfield, CA".
- ❌ A second line that repeats the first.

### Checks
By eye: both lines truncate.

### Reference
Sales › Orders; Customers; 3PL › Recurring Orders.

---

## Overflow chip

`id: molecule.overflow-chip` · `layer: molecule` · `code: prototypes/unified-view/BreakdownCard.tsx (OverflowChip) · ListTable.tsx (OverflowList)` · `registry: fpds-overflow-chip`

### Purpose
Shows the first value and a "+N" pill that opens the rest.

### Use when / Don't use when
- Use when a cell holds a list (products, ship-tos, assets).
- Don't use a hover list or a tooltip for the rest.

### Anatomy
First value (plain `text-sm`, truncates) · "+N" `atom.pill` (`tabular-nums`) as a button · `molecule.breakdown-popover`.

### Look
`flex items-center gap-1.5`; empty → "—" muted. Card width 280 (360 when rows carry a sub-line or figure). Title "All {label} ({count})".

### States
none · one value (no chip) · overflow (chip) · open.

### Interactions
| Trigger | Result |
|---|---|
| Click "+N" | Breakdown card opens above the cell |
| Click inside | Stays in the cell — the row does not open |
| Esc / outside | Closes |

### Outcomes
The full list read in place.

### Data contract
`values: string[]`, `label` (plural noun), `rows?: BreakdownRow[]`.

### Rules
1. **"+N" opens the shared BreakdownCard on CLICK, everywhere.** — *Touch cannot hover; a card under a passing pointer is one nobody asked for.* `(2026-10-14)`
2. **Modules reuse this; never a local variant.** — *The portal's "+N" drifted into five idioms.* `(feedback_uv_source_of_truth)`

### Do / Don't
- ✅ `<OverflowList values={products} label="products" />`.
- ❌ A `HoverCard` list on "+2".

### Checks
By eye.

### Reference
Customers (Ship-tos); Quotes (Products); 3PL › Directory.

---

## Breakdown popover

`id: molecule.breakdown-popover` · `layer: molecule` · `code: prototypes/unified-view/BreakdownCard.tsx (BreakdownPopover, BreakdownCard)` · `registry: fpds-breakdown-popover`

### Purpose
What a "+N" chip or a total is made of.

### Use when / Don't use when
- Use behind any "+N" or figure that sums things (quantity, amount, level on fulfillment).
- Don't use as a general popover form.

### Anatomy
Title · dashed rule · rows (label, optional sub-line, optional value) **or** a grouped table · dashed rule + total (optional) · warnings (optional).

### Look
Popover `side="top"`, width 280 default, `max-h-96 overflow-auto`, `p-4`. Title `text-base font-semibold`; rules `border-t border-dashed border-border`; rows `text-sm text-muted-foreground`, label in `text-foreground` when it has a sub-line (`text-xs`); values `tabular-nums`; total `text-base font-semibold`. Group band `rounded-sm bg-fp-table-header px-2 py-1 text-xs font-semibold`. Warnings `text-sm text-status-failed` with `TriangleAlert size-4`.

### States
closed · open.

### Interactions
| Trigger | Result |
|---|---|
| Click trigger | Opens above; click does not reach the row |
| Esc / outside | Closes |

### Outcomes
—

### Data contract
`trigger`, `label` (screen reader), `card {title, rows, table?, total?, warnings?}`, `width`, `align`.

### Rules
1. **Warnings say what will go wrong, in red, after the total.** `(2026-10-20)`
2. **Where the whole cell is the figure, the figure is the trigger.**

### Do / Don't
- ✅ "Qty" figure opens its per-tank breakdown.
- ❌ A second card style for the same job.

### Checks
By eye.

### Reference
Customer Portal › Orders (level on fulfillment); Sales › Quotes (products).

---

## Trend chip

`id: molecule.trend-chip` · `layer: molecule` · `code: src/components/ui/trend-chip.tsx` · `registry: fpds-trend-chip`

### Purpose
The one up / down marker for a change against a period.

### Use when / Don't use when
- Use after the figure on every figure card, with "vs N the previous …" under it.
- Don't use arrows in circles, orange, `destructive` red or trend lines on figure cards.

### Anatomy
Soft chip · small filled triangle (▲/▼, none for same) · change text.

### Look
`rounded-md font-medium tabular-nums gap-1`; `md` `h-7 px-2 text-sm`, `sm` `h-5 px-1.5 text-xs`. Good: `bg-fp-trend-up-bg text-fp-trend-up`; bad: `bg-fp-trend-down-bg text-fp-trend-down`; same: `bg-muted text-muted-foreground` ("Same"). Triangle: 5px sides, 6px tall, `currentColor`.

### States
up-good · up-bad · down-good · down-bad · same.

### Interactions
| Trigger | Result |
|---|---|
| — | Display |

### Outcomes
—

### Data contract
`dir` (`up | down | same`), `good` (default `dir === "up"`), `size`, `children`.

### Rules
1. **Triangle shows direction; color shows good or bad** — late orders down is green (`good`). `(DS ui §10k, 2026-10-20)`
2. **Red is always `--fp-trend-down`.**

### Do / Don't
- ✅ `<TrendChip dir="down" good>12%</TrendChip>` for late orders.
- ❌ A `TrendingUp` icon in an orange circle.

### Checks
`tokens`.

### Reference
Customer Portal › Dashboard; Orders overview.

---

## Copy value

`id: molecule.copy-value` · `layer: molecule` · `code: src/components/ui/copy-value.tsx` · `registry: fpds-copy-value`

### Purpose
A read-only value with its own copy button.

### Use when / Don't use when
- Use for contact facts someone pastes elsewhere: phone, email, IDs.
- Don't use a disabled input for read-only values; don't put one copy button over two values.

### Anatomy
Value text · 24px copy button (reserved space, appears on hover / focus).

### Look
Value `truncate text-sm text-foreground` (`tabular-nums` optional). Button `size-6 rounded-sm text-muted-foreground`, hidden (`opacity-0`) until row hover or focus; `hover:bg-accent`; glyph `Copy` / `Check` 14px; copied → `text-status-success`. No gap — the button's box is the space. No tooltip.

### States
empty (placeholder "—", not copyable) · rest · hover (button shows) · copied (tick, 1.4s).

### Interactions
| Trigger | Result |
|---|---|
| Hover / focus | Copy button appears |
| Click copy | Value on the clipboard; tick for 1.4s |

### Outcomes
Clipboard holds the value.

### Data contract
`value`, `label` ("POC email" → `aria-label="Copy POC email"`), `placeholder`, `tabular`.

### Rules
1. **One copy button per value.** — *A pair copied together has to be edited after.*
2. **Confirm in place; no toast.**
3. **No tooltip** — it would cover the next value.

### Do / Don't
- ✅ Phone and email each with their own copy.
- ❌ A disabled `Input` showing a phone number.

### Checks
By eye.

### Reference
3PL › Directory record (vendor / customer contacts); 3PL › Delivery Order sheet.

---

# Inputs

## Combobox

`id: molecule.combobox` · `layer: molecule` · `code: src/components/ui/combobox.tsx` · `registry: fpds-combobox`

### Purpose
A select you can type into — the default picker for any list of records.

### Use when / Don't use when
- Use for customers, ship-tos, products, vendors, technicians — any list that can grow; with `allowCreate` for open sets (roles, tags).
- Don't use for several values in one field (→ `molecule.token-multi-select`) or inside an editable table (→ `TableCellCombobox`, with `multiple` when it adds rows).

### Anatomy
Trigger (same as Select: value, optional `trailing`, `ChevronDown`) · popover list: search box · create row (optional) · clear row (optional, first) · options (check · label · optional description · optional row action).

### Look
Trigger = `selectTriggerClasses` (`h-9`, `sm` `h-8`). List width = trigger (`min-w-[12rem]`), `p-0`. Option description `text-xs text-muted-foreground`; clear label muted; row action hidden until hover / keyboard focus.

### States
closed · open · filtering · no matches ("No matches.") · create offered · selected (check) · disabled option · placeholder ("Select").

### Interactions
| Trigger | Result |
|---|---|
| Click trigger | Opens list with search focused |
| Type | Filters (label and description) |
| Enter / click option | Picks, closes, clears the query |
| Pick clear row | Value becomes "" |
| Pick "Create “…”" | `onCreate` then picks it |
| Click a row action | Runs it; does not pick |
| Esc | Closes |

### Outcomes
One value (possibly new).

### Data contract
`value`, `onValueChange`, `options` (`string` or `{value,label,description,disabled}`), `placeholder`, `searchPlaceholder` ("Search…"), `emptyText`, `allowCreate`, `onCreate`, `clearLabel`, `optionAction`, `trailing`, `size`, `className` (width).

### Rules
1. **Every list searches** (`searchThreshold` 1). — *A field that changes behavior at nine options must be looked at before use.*
2. **Optional pickers offer their empty choice first** ("No technician"); required ones don't. `(DS ux §Forms, 2026-09-25)`
3. **It wears the Select's trigger exactly.**
4. **Sample lists never come up empty** — 3–10 options. `(feedback_ui_rules)`
5. **Edit-the-option is a row action, never a menu item in the list.**

### Do / Don't
- ✅ `<Combobox clearLabel="No technician" … />`.
- ❌ An "Edit customer" option inside the customer list.

### Checks
`fields-fill`. By eye: trigger matches Select.

### Reference
Sales › Quote sheet (Customer); Customer / Asset sheets.

---

## Token multi-select

`id: molecule.token-multi-select` · `layer: molecule` · `code: prototypes/unified-view/TokenMultiSelect.tsx` · `registry: fpds-token-multi-select`

### Purpose
Several values for one field, shown as chips, added from a searchable list.

### Use when / Don't use when
- Use for tags, products on a bulk edit, products on a recurring program — values that live in ONE field.
- Don't use when each pick should become its own table row (→ `TableCellSelect multiple`, see "Picking several makes rows").

### Anatomy
Box (button) · chips (initial badge · name · optional highlight word · ✕) · "+ Add …" · popover: search · options (initial badge, check when chosen).

### Look
Box `min-h-11 w-full rounded-md border border-input px-2 py-2 gap-2`, hover `border-fp-outline-2`, open `border-ring`. `flush`: no border / radius, `px-4` (16px inset), hover `bg-fp-surface-1a`. Chip `rounded-md border border-border bg-fp-surface-1b py-1 pl-1.5 pr-1 text-sm`; initial badge 16px `bg-accent text-[9px] font-semibold uppercase`; ✕ `size-3.5` muted. Highlighted chip `border-fp-banner-accent-info` + word `bg-fp-banner-accent-info/10 text-xs`. Add `text-sm text-muted-foreground` with `Plus`.

### States
empty (Add centred) · has chips · open · highlighted chips · flashing (`fp-attention-info`, once).

### Interactions
| Trigger | Result |
|---|---|
| Click box | List opens, stays open while picking |
| Pick option | Toggles it in / out |
| ✕ on chip | Removes it |
| Click chip (with `onChipClick`) | Runs it (e.g. marks winter blend) instead of opening |

### Outcomes
A string array.

### Data contract
`options`, `value`, `onChange`, `addLabel`, `searchPlaceholder`, `flush`, `highlighted`, `highlightLabel`, `onChipClick`, `flashKey`.

### Rules
1. **Flush is the box, not the content** — chips keep the 16px inset. `(2026-09-25)`
2. **Chips that just became clickable blink blue once.** `(2026-10-01)`
3. **Several values in one cell stay one cell; several rows are rows.** `(feedback_multi_pick_rows)`

### Do / Don't
- ✅ Tags on a record.
- ❌ Tanks on an order as tokens (they are rows).

### Checks
`table-rows`.

### Reference
Fuel Orders › bulk bar; 3PL › Recurring program create.

---

## Date field

`id: molecule.date-field` · `layer: molecule` · `code: src/components/ui/date-picker.tsx (DateField, DateKeyField)` · `registry: fpds-date-field`

### Purpose
A form field that holds one date, opening the shared picker.

### Use when / Don't use when
- Use for every single date in a form (planned date, end date). `DateKeyField` when the value is stored as `YYYY-MM-DD` with an optional `min`.
- Don't use for a list's date range (→ `DateRangeFilter` / `DateRangePopover`) or a hand-built Popover + Calendar.

### Anatomy
Trigger (outline button: `Calendar` icon · formatted date or placeholder) · popover: presets rail (Today, Tomorrow, Yesterday, In 7 days) · one month · footer (typed date MM/DD/YYYY · Reset · Apply).

### Look
Trigger `Button variant="outline"`, `w-full justify-start font-normal`, placeholder muted ("Select date"); date as "Oct 23, 2026". Panel: presets `w-44 border-r border-border`, items `h-7 rounded-md px-2.5 text-sm`, hover `bg-fp-row-hover`, chosen `bg-selected text-selected-foreground font-medium`; footer `border-t border-border px-4 py-2.5`, typed box `h-8 w-32 tabular-nums`, Apply `size="sm"`. Popover width capped `calc(var(--fp-vw) - 2rem)`.

### States
empty · set · open · draft changed · day disabled (before `min`).

### Interactions
| Trigger | Result |
|---|---|
| Click trigger | Picker opens on the current value |
| Preset / day / typed date | Changes the draft only |
| Apply | Sets the value, closes |
| Reset | Draft back to the opening value |
| Esc / outside | Closes, no change |

### Outcomes
One date (or key).

### Data contract
`DateField`: `value: Date | null`, `onChange(Date | null)`, `placeholder`, `dayDisabled`, `disabled`, `align`, `children` (own trigger). `DateKeyField`: `value: string`, `onChange(key)`, `min`.

### Rules
1. **One date picker for every screen that picks a date.** `(DS ui §10p, 2026-10-21)`
2. **Nothing changes until Apply.**
3. **A date is a natural-size control** — a `FIXED WIDTH` is allowed beside fields that fill. `(DS ui §10e)`

### Do / Don't
- ✅ `<DateKeyField value={start} min={today} … />`.
- ❌ `<input type="date">` or Popover + Calendar in a sheet.

### Checks
`fields-fill`. By eye: Apply / Reset present.

### Reference
3PL › Recurring delivery sheet; 3PL › Create recurring rule (start / end dates); Customer Portal › request actions.

---

## Time-window slider

`id: molecule.time-window-slider` · `layer: molecule` · `code: src/components/form-layout/TimeWindowSlider.tsx` · `registry: fpds-time-window-slider`

### Purpose
A time range on a drawn day, in 30-minute steps.

### Use when / Don't use when
- Use only where it stands today: the technician phone app (Service › TechnicianHome). Its formatters (`formatMinutes`, `formatWindow`, `formatSpan`) are shared.
- **Don't use for a new delivery or scheduling window** — every window in every module is `DeliveryWindowTimeline` (preferred-time bars, hanging +). `(DS ui §10m, 2026-10-20)`

### Anatomy
Label line: label (+ required ✱) · window "8:00 AM – 12:00 PM" · span note ("4 hr window" / "All day", right). Control zone (36px): two-thumb `atom.slider` · scale (12a 6a 12p 6p 12a).

### Look
Label `text-sm font-medium`; window `text-sm tabular-nums`; span `text-xs text-muted-foreground`, truncates first. Zone `h-9`; ticks `text-[11px] text-muted-foreground`, end labels pinned to the edges.

### States
default · dragging · disabled.

### Interactions
| Trigger | Result |
|---|---|
| Drag a thumb | Window changes in 30-min steps; never shorter than `minSpan` (60) |
| Arrow keys | Step 30 min |

### Outcomes
`[start, end]` in minutes from midnight.

### Data contract
`start`, `end`, `onChange(start, end)`, `minSpan`, `label`, `required`, `disabled`.

### Rules
1. **The window is printed and never truncates;** the span note gives way. `(2026-10-15)`
2. **One field, one height** — label and value share a line so the row lines up.

### Do / Don't
- ✅ Technician app.
- ❌ A new 3PL or Portal window field.

### Checks
By eye.

### Reference
Service › Technician app (home).

---

## Hanging add

`id: molecule.hanging-add` · `layer: molecule` · `code: prototypes/unified-view/HangingAdd.tsx` · `registry: fpds-hanging-add`

### Purpose
The add for a table that can grow — a tab off the card's bottom-left corner.

### Use when / Don't use when
- Use under every boxed table that adds rows (products, vendors, fees, preferred times).
- Don't use a full-width "add row" band inside the card; don't render it on a fixed table.

### Anatomy
Plus · label that slides out on hover / focus. May be a menu trigger (Fee or Tax).

### Look
`h-8 rounded-t-none rounded-b-md bg-fp-table-header px-2.5 text-sm font-medium text-foreground`, hover `bg-accent`; label reveals to `max-w-[140px]` with `pl-1.5` over 200ms.

### States
rest (plus only) · hover / focus (label out) · disabled.

### Interactions
| Trigger | Result |
|---|---|
| Hover / focus | Label slides out |
| Click | Adds a row and puts the cursor in it (or opens the choice menu) |

### Outcomes
A new blank row with focus.

### Data contract
`label` (the table's own noun — "Add products"), `onClick`, `disabled`, trigger passthrough.

### Rules
1. **Filled with the header tint, square on top.** — *It continues the table; an outline would be a second box.* `(2026-09-22)`
2. **The row picker of a row-adding table takes several (`multiple`, Apply → one row each).** Said three times. `(feedback_multi_pick_rows)`
3. **No table shows an empty message instead of rows** — editable tables show one blank row. `(2026-10-14)`

### Do / Don't
- ✅ `<HangingAdd label="Add products" />` under the Products card.
- ❌ A dashed "+ Add product" box inside the card.

### Checks
`table-rows`.

### Reference
3PL › Delivery Order (Products, Vendor); Sales › Quote sheet (Fees / Tax).

---

# Progress and readings

## Stage track

`id: molecule.stage-track` · `layer: molecule` · `code: src/components/ui/stage-track.tsx · src/components/ui/steps.tsx` · `registry: fpds-stage-track`

### Purpose
Where a record is in its lifecycle, or which step of a form you are on — one look for both.

### Use when / Don't use when
- Use `StageTrack` for a record's stages on its detail; `Steps` / `SheetSteps` for a stepped create form (passes `onStageClick`).
- Don't use tabs for steps; don't show off-line states (Canceled, Blocked) as a position — nothing is current then.

### Anatomy
`rings` (default): equal columns, each a 24px ring + name under it; a 2px line between first and last center, green up to the current. `track`: dots on a line with the current stage as a named pill. `compact`: steps 48px apart.

### Look
Rings: done `bg-status-success text-status-success-foreground` + `Check` 14px, name `text-status-success`; current `border-[5px] border-accent-violet bg-fp-surface-1b`, name `font-medium text-accent-violet-ink`; upcoming `border-[5px] border-fp-outline-2`, name muted. Line `h-0.5 bg-border`, done part `bg-status-success`. Names `text-sm`. Track pill `h-8 rounded-full border-2 px-3.5 text-sm font-semibold`, tone accent (violet wash 12%), brand (10%) or neutral.

### States
done · current · upcoming · disabled (`opacity-50`, reason on hover) · no current.

### Interactions
| Trigger | Result |
|---|---|
| Click a step (forms) | Moves to that step |
| Hover a disabled step | Shows why |
| Stage changes | Line runs on (500ms), left stage takes its tick, pill zooms in; never on first paint |

### Outcomes
Orientation; in forms, a step change.

### Data contract
`StageTrack`: `stages {key,label}[]`, `current`, `onStageClick?`, `disabledReason?(key)`, `tone` (`accent` default), `variant` (`rings` default), `compact`. `Steps`: `steps {value,label,disabledReason?}[]`, `value`, `onValueChange`.

### Rules
1. **Steppers are rings everywhere** — create forms and record tracks. `(2026-10-16)`
2. **Done is green; in progress is violet.** `(2026-10-19)`
3. **A step that can't open says why.** — *A control that refuses a click without saying why gets clicked again.*
4. **No rule under the track; the strip's ground is the sheet's own `bg-popover`.**

### Do / Don't
- ✅ `<Steps steps={…} value={step} onValueChange={…} />`.
- ❌ Numbered tabs.

### Checks
By eye.

### Reference
3PL › Delivery Order (stage track); 3PL › Create recurring rule (steps); Customer Portal › asset / ship-to create.

---

## Level gauge

`id: molecule.level-gauge` · `layer: molecule` · `code: prototypes/customer-portal/TankLevel.tsx (LevelGauge, LevelReading, BatteryReading, DaysToEmpty)` · `registry: fpds-level-gauge`

### Purpose
A tank's level, its monitor's battery and its days to empty — each in its own cell.

### Use when / Don't use when
- Use in asset / tank columns where a monitor reports levels.
- Don't add band words ("Low"); don't propose level-triggered rules (Pavan raises those).

### Anatomy
**Level:** gauge (bar) + "62%". **Battery:** Lucide battery glyph + "%". **Days to empty:** "N days" / "Empty". No monitor → "No monitor" (level) or "—".

### Look
Gauge `h-2 w-14 rounded-full bg-muted`, fill min 3%: ≤ 10 `bg-fp-lane-red` + `.fp-urgent-blink`; < 50 `bg-fp-lane-red`; < 80 `bg-fp-lane-yellow`; ≥ 80 `bg-fp-lane-green`. Value `text-sm tabular-nums`. Battery text by the same bands (`text-status-failed`; yellow / green mixed 60–65% into `--foreground`); glyph: < 10 `BatteryWarning`, < 20 `BatteryLow`, ≥ 80 `BatteryFull`, ≥ 40 `BatteryMedium`, else `Battery`. Days `text-sm tabular-nums`, `text-status-failed` when it runs out before delivery.

### States
no monitor · sufficient · moderate · low · urgent (blinking; steady with reduced motion).

### Interactions
| Trigger | Result |
|---|---|
| Hover battery | Title "Monitor battery N%" |

### Outcomes
—

### Data contract
`LevelGauge pct`; `LevelReading asset`; `BatteryReading pct`; `DaysToEmpty asset days` (days until delivery).

### Rules
1. **Level is shown by color only, no band words.** `(2026-10-17)`
2. **Separate cells, separate columns** (level, battery, days to empty, suggested, on fulfillment).
3. **Urgent blinks and keeps blinking** — the tank is still nearly empty.

### Do / Don't
- ✅ Gauge + % in one cell, battery in its own.
- ❌ "Low (32%)".

### Checks
`tokens`.

### Reference
Customer Portal › Orders (stacked tank lines); Customer Portal › Order request sheet.

---

## Stat tile

`id: molecule.stat-tile` · `layer: molecule` · `code: prototypes/unified-view/DashboardParts.tsx (StatTile)` · `registry: fpds-stat-tile`

### Purpose
A headline number on a module dashboard that opens the rows it counts.

### Use when / Don't use when
- Use for headline counts on the 3PL and Sales dashboards.
- Don't use for a figure with a period change and term icon (→ figure card with `atom.metric-icon` + `molecule.trend-chip`).

### Anatomy
Label · value · optional note. The whole tile is a button.

### Look
Card `rounded-xl bg-fp-surface-1b shadow-xs p-5 gap-2` (dark `bg-fp-surface-1a`) on the dashboard ground (`rounded-xl bg-fp-surface-1a p-3`, dark `bg-fp-surface-1b`). Label `text-sm font-medium`; value `text-3xl font-semibold tabular-nums`; note `text-xs text-muted-foreground`. Hover `shadow-sm`.

### States
rest · hover · focus · disabled (no `onOpen`).

### Interactions
| Trigger | Result |
|---|---|
| Click / Enter | Opens the list narrowed to exactly those rows |

### Outcomes
A filtered list.

### Data contract
`label`, `value` (formatted string), `note?`, `onOpen?`.

### Rules
1. **Everything on a dashboard is a way into a list** — never a figure the reader can't go and check. `(2026-10-05)`
2. **A dashboard drill wins over the list's remembered filters.**

### Do / Don't
- ✅ "Unassigned 14" → Delivery Orders filtered to Unassigned.
- ❌ A number that opens nothing.

### Checks
By eye.

### Reference
3PL › Dashboard; Sales › Dashboard.

---

# Feedback

## Toast

`id: molecule.toast` · `layer: molecule` · `code: src/components/ui/sonner.tsx` · `registry: fpds-toast`

### Purpose
Confirms an act that leaves the screen, in one line.

### Use when / Don't use when
- Use after create, export, status change, cancel.
- Don't use for an in-place copy (`molecule.copy-value` ticks), autosave, or a validation error (pending bar).

### Anatomy
Type icon · title · optional second line.

### Look
Mounted once, `position="bottom-right"`. Surface `--popover`, text `--popover-foreground`, border `--border`, radius `--radius`. Icons 16px: `CircleCheck`, `Info`, `TriangleAlert`, `OctagonX`, spinning `Loader2`. Follows `.dark`.

### States
success · info · warning · error · loading.

### Interactions
| Trigger | Result |
|---|---|
| Appears | Auto-dismisses |
| Hover | Holds |

### Outcomes
—

### Data contract
`toast.success(title, { description? })`.

### Rules
1. **One line. A second line only to warn of a consequence.** Never repeat a name / number on screen or restate the obvious. `(feedback_toasts, 2026-10-07)`

### Do / Don't
- ✅ `toast.success("Order created")`; "Paused R-1042" / "4 unfinished orders canceled."
- ❌ "Exported 80 vendors" / "The filtered list was exported."

### Checks
`microcopy`; G49 in `scripts/eval/parity-shell.mjs`.

### Reference
3PL › Delivery Order (create); every list Export.

---

## Empty state

`id: molecule.empty-state` · `layer: molecule` · `code: src/components/ui/empty.tsx` · `registry: fpds-empty-state`

### Purpose
Tells the reader why a whole region has nothing in it (variant E3).

### Use when / Don't use when
- Use when a whole list / region is empty and needs a reason (no results for the filters, nothing yet).
- Don't use for an empty table inside a form (→ one blank row, or padded text E1); never a dashed box round an empty table (E2 is only an optional section that is off).

### Anatomy
`Empty` · `EmptyHeader` (`EmptyMedia variant="icon"` · `EmptyTitle` · `EmptyDescription`) · `EmptyContent` (actions).

### Look
Centred `flex-col gap-6 p-6 md:p-12 text-center`, no rim. Media 40px `rounded-lg bg-accent`, icon 24px. Title `text-lg font-medium tracking-tight`; description `text-sm/relaxed text-muted-foreground`, max `sm`.

### States
no records · no matches.

### Interactions
| Trigger | Result |
|---|---|
| Action (e.g. Clear all) | Resolves the emptiness |

### Outcomes
—

### Data contract
Composition of the parts.

### Rules
1. **A report is not an invitation.** E1 padded text = nothing here; E2 dashed box = an optional section you can switch on; E3 = this. `(DS ui/7-variants §5)`
2. **Description reports state, not a lesson.** `(feedback_no_unrequested_ui)`

### Do / Don't
- ✅ "No orders match these filters" + Clear all.
- ❌ A dashed CTA box around an empty table.

### Checks
`microcopy`.

### Reference
Standard list (no results); Sales › Orders; Customers.
