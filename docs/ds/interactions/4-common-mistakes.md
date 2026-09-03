# Interactions · Common mistakes (❌ / ✅)

Anti-patterns for behaviour & state, each pointing back to [`2-rules.md`](2-rules.md).

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
