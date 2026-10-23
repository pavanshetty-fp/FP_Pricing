# Interactions · Common mistakes (❌ / ✅)

Anti-patterns for behavior & state, each pointing back to [`2-rules.md`](2-rules.md).

- **Focus** — ❌ a control with no visible focus state · ✅ `focus-visible:ring-2 focus-visible:ring-ring/50` (`ring-inset` in cells).
- **Destructive** — ❌ delete fires on a single unguarded click · ✅ the 52px confirm or an `AlertDialog`.
- **Silent action** — ❌ an action with no loading/success/error feedback · ✅ a `sonner` toast or inline `field` error.
- **Recharts color** — ❌ `stroke="var(--brand)"` (renders invisible — `var()` doesn't resolve in SVG attributes) · ✅ resolve to hex at runtime, or use the `chart-1..5` hexes.
- **Chart mount** — ❌ default animation (stalls headless, shows a sliver) · ✅ `isAnimationActive={false}`.
- **Skeleton** — ❌ a loading shape that differs from the loaded shape (layout jumps) · ✅ a skeleton that holds the loaded group's shape.
- **Icon buttons** — ❌ an icon-only button with no label · ✅ `aria-label`.
- **Table total** — ❌ a total floated under the table and aligned to its column by hand (drifts the moment a width changes; reads as a caption) · ✅ a `<tfoot>` row on the table's own grid (T1).
- **Empty total** — ❌ "Total 0 gal" above an order with no lines · ✅ the total appears once a row carries real content (T2).
- **Stale measure** — ❌ summing the number still stored behind a "decided later" flag · ✅ the flag excludes the row; the number is kept only so unflagging hands it back (T3).
- **Add placement** — ❌ "+ Add" as a table row, sitting inside the total's grid and read as data · ✅ chrome attached to the squared bottom-left corner, below the total (T4).
- **Unlabelled checkbox column** — ❌ a tick whose meaning depends on a switch above the table · ✅ a named column, one tick one meaning (T5).
- **Helper text** — ❌ helper text a field-gap away, read as a label for the next control · ✅ 4px under the control it describes (§2b).
- **Select position** — ❌ Radix `item-aligned`, which lays the list over the trigger and slides the selected row onto it (the field vanishes as you choose) · ✅ `popper`, `align="start"`, 4px off (§2a).
- **Search threshold** — ❌ search appears only past N options, so the field behaves differently depending on data the reader cannot see · ✅ every list searches (§2a).
- **Two triggers** — ❌ a searchable select styled as a button beside plain selects · ✅ one shared trigger class; the difference lives inside the list (§2a).
- **"None" as emptiness** — ❌ an unset field standing in for a deliberate "no" · ✅ "— Unassigned" / "Not set" / "No" as real options (§2a).
- **Hidden used values** — ❌ removing an already-picked option from other rows' lists, so the list changes length as the table fills · ✅ ticked and unselectable (§2a).
- **Section paragraph** — ❌ a rule set as body copy under the section, read once then permanently in the way · ✅ an info button beside the heading, opening on click (§3b).
- **Redundant tooltip** — ❌ a tooltip on a hover-revealed copy glyph, covering the value next to it · ✅ the icon plus an `aria-label` (§3b).
- **Forked bulk bar** — ❌ a second bar built in the screen because its verbs differ · ✅ `BulkActionBar` with `actions` and `noun` (§4b).
- **Pre-ticked rows** — ❌ adding a row ticks it, so a bulk bar appears before anything is chosen · ✅ selections start empty and transient (§4b).
- **Double-duty selection** — ❌ the ticked rows are both the bulk target and the quote scope · ✅ a property of the whole set is a switch over the whole set (§4b).
- **Per-instance section gap** — ❌ `<SheetSection className="gap-5">` on every section of one sheet · ✅ take the 40/16 default (`ux/2-rules`).
- **A silently draggable header** — ❌ columns move but nothing on screen says so · ✅ `ColumnMoveGrip` in the header, `ColumnResizeHandle` on the divider, each revealed on hover (`ux/2-rules`).
- **A white-on-white header** — ❌ `bg-fp-surface-1a` on a `thead`, which is the content layer's own color in light · ✅ `bg-fp-table-header` (`ux/2-rules`).
- **A bare `<TableHead>`** — ❌ a new table whose columns cannot be moved or resized, indistinguishable from one that must not be · ✅ `TableColumnHeader` + `useTableColumns` (`ux/2-rules`).
- **Every divider lit at once** — ❌ hovering the header row draws eleven resize marks, so the row reads as a grid · ✅ each mark lights with its own header (`ux/2-rules`).
- **Two marks at once** — ❌ the move grip and the resize handle both showing on one hovered header · ✅ the grip is the handle's peer and steps aside on the divider (`ux/2-rules`).
- **One target, two gestures** — ❌ the divider both resizes and reorders, so a widen becomes a reorder · ✅ divider resizes (`col-resize`), header moves (`grab`) (`ux/2-rules`).
- **A frozen column order** — ❌ the schema's order is the reader's, so comparing two columns means hiding the six between them · ✅ `useColumnOrder` on the headers, order saved with the view (`ux/2-rules`).
- **Confirming nothing** — ❌ "are you sure?" over a section whose table is still a row of blanks · ✅ `hasContent` decides whether the dialog appears (`ux/2-rules`).
- **A bin on a section heading** — ❌ `<Trash2>` to turn an optional section off, next to the bins that delete table rows · ✅ `SheetSectionRemove`, a minus (`ux/2-rules`).
- **A padded heading row** — ❌ a `min-h` on the section title so a 16px gap renders as 20, and 22 once the heading carries a button · ✅ the row is the title's own line and a taller action hangs off it (`ux/2-rules`).

## Dead controls and boards *(added 2026-09-18)*
- **Dead primary (§7b)** — ❌ a clause standing permanently beside it · ✅ disabled, with the reason on the press; the sheet is quiet the rest of the time.
- **Tooltip that never opens (§7b)** — ❌ hanging it off the disabled button itself · ✅ a wrapper takes the pointer events, or the feedback is silently deleted.
- **Card alerts (§8.1b)** — ❌ every card carrying one · ✅ only the cards with something outstanding.
- **Empty unit (§8.1b)** — ❌ a heading on a rule with nothing under it, reading as a failure to load · ✅ the unit is removed when its lines are.
- **One card design for every lane (§8.1b)** — ❌ the same fields in the first lane and the last · ✅ a default set per lane, and a menu that says which lane it is editing.
