# Pagination

`id: unit.pagination` · `layer: unit` · `code: src/components/tables-layout/TablePagination.tsx (TablePagination, JumpToPage), src/components/tables-layout/data.ts (paginationRange), src/components/tables-layout/GroupedListFooter.tsx` · `registry: fpds-pagination`

## Purpose
The footer under a list's table: where you are in the list, a way to the other pages, and how many rows a page holds. While the table is grouped, the grouped footer stands in and reports the list's shape instead. It answers "which slice am I seeing, and how do I see the rest?"

## Use when / Don't use when
- Use `TablePagination` under every paged list table, in its own `mt-4 shrink-0` block.
- Use `GroupedListFooter` instead while Group by is on (the list scrolls whole).
- Don't use under a board or map display.
- Don't use for an editable table inside a sheet (those show all rows).
- Don't replace it with a count ("24 rules") — a count is not a page position.

## Anatomy
**TablePagination** — three zones:
1. **Range** (left) — "Showing 1-25 of 62".
2. **Pages** (center) — Previous · windowed page numbers (first, current ±1, last) · `…` · Next. Each `…` is a **Jump to page** trigger: popover with heading "Jump to page" and a numeric "Page #" field.
3. **Rows per page** (right) — select: 10 · 25 · 50 · 100.

**GroupedListFooter** — same left/right skeleton:
1. **Shape** (left) — "4 groups · 62 orders" (+ " · 12,400 gal" when the list sums a measure); when a record can sit in several groups, a `Layers` note: "orders appear in every group they match, so the group counts add up to more than 62".
2. **Expand all / Collapse all** (right) — ghost button with `ChevronsUpDown` / `ChevronsDownUp`.

## Look
- Band: `h-9` (36px, exactly its controls), `flex items-center justify-between text-sm text-muted-foreground`; the page owns the spacing (`mt-4` above, the content layer's 16px below).
- Range text: `shrink-0 whitespace-nowrap`, numbers locale-formatted.
- Page links: DS `PaginationLink` (36px); **current page** `border-fp-outline-2 bg-fp-table-header` (the table header's color); Previous/Next at 50% opacity and not clickable at the ends.
- `…`: 36px (`size-9`) `rounded-md text-muted-foreground`, `MoreHorizontal size-4`.
- Jump popover: `rounded-lg bg-fp-surface-1b p-1`; heading `text-xs font-medium text-primary`; field `h-8 w-20 rounded-md border-fp-outline-2 bg-fp-surface-1a`.
- Rows per page: quiet select — 28px tall (`h-7`), 58px wide, `rounded-sm` (6px), `border-fp-outline-2 bg-fp-surface-1b`, `text-xs`, chevron `size-3.5`.
- No shadows on any control.
- Grouped footer: `text-sm text-muted-foreground`, counts `tabular-nums`; note `text-xs` with `Layers size-3.5`; button `variant="ghost" size="sm"`.

## States
- **default** — page 1 of N; Previous disabled.
- **hover / focus** — DS link states; `…` goes to `text-foreground`; ring on focus.
- **active** — current page outlined on the header fill.
- **disabled** — Previous on page 1, Next on the last page.
- **open** — Jump to page popover with the field focused.
- **empty** — 0 rows: "Showing 0-0 of 0", one page.
- **grouped** — the grouped footer replaces pagination; button reads "Collapse all" until every group is collapsed, then "Expand all".

## Interactions
| Trigger | Result |
|---|---|
| Press a page number | Goes to that page. |
| Press Previous / Next | One page back / forward (no-op at the ends). |
| Press `…` | Opens Jump to page with the field focused. |
| Type digits + Enter in "Page #" | Jumps to that page and closes, if it is between 1 and the last page; otherwise nothing happens. Non-digits are ignored as typed. |
| Pick a rows-per-page value | Changes page size; the list returns to page 1. |
| Apply a filter / search / sort elsewhere | The screen resets to page 1; the range text follows. |
| Grouped: press Collapse all / Expand all | Collapses or expands every group. |

## Outcomes
- A different page of rows; the range text updates.
- A different page size (saved in the active view's state where the view captures `pageSize`), back on page 1.
- Nothing, for an out-of-range jump.
- Grouped: all groups collapsed or expanded; an honest note when group counts over-add.

## Data contract
- `TablePagination`: `page` (1-based), `pageSize`, `total` (filtered row count, all pages), `onPageChange(page)`, `onPageSizeChange(size)`, `pageSizeOptions?` (default `[10, 25, 50, 100]`), `className?` (band height override — `h-[72px]` restores the old Figma band; nothing wants it).
- Window: `paginationRange(current, total, siblings = 1)` → page numbers and `"ellipsis"` slots.
- `GroupedListFooter`: `groupCount`, `rowCount`, `noun`, `total?`, `unit?`, `overCounts`, `allCollapsed`, `onExpandAll()`, `onCollapseAll()`.

## Rules
1. **Use `TablePagination`'s own page sizes and copy.** — *overriding either makes one screen count differently and the reader re-learns the footer per list.* — `(source: docs/ds/interactions/2-rules.md §4c)`
2. **Pagination and grouping are exclusive; while grouped the list scrolls whole and `GroupedListFooter` reports its shape.** — *at 25 a page a group straddles the boundary and its header claims rows not on screen.* — `(source: interactions §4c; GroupedListFooter.tsx)`
3. **Both footers keep the same left/center/right skeleton.** — *the bottom of the screen doesn't jump when grouping turns on.* — `(source: GroupedListFooter.tsx)`
4. **The band is exactly its controls (`h-9`); the page sets the gaps (`mt-4`).** — *a 72px band doubled the gap below and pressed the footer flush to the table.* — `(source: TablePagination.tsx)`
5. **The current page wears the table header's fill.** — `(source: TablePagination.tsx, Pavan 2026-10-14)`
6. **Rows per page is quiet: white, 12px type, 58×28, 6px corners.** — `(source: TablePagination.tsx, Pavan 2026-10-14, tried on Customer Portal › Orders then everywhere)`
7. **Jump to page lives behind the ellipsis** — no separate go-to field on the bar. — *progressive disclosure.* — `(source: TablePagination.tsx, Figma 27728:13260)`
8. **Applying a filter resets to page 1.** — `(source: docs/unified-view/3-interactions.md §7)`
9. **A fact about the whole list that a count can't carry sits beside the pagination.** — `(source: ui §10c)`

## Do / Don't
- ✅ Pass the FILTERED total.
- ✅ Swap to `GroupedListFooter` whenever the table is grouped.
- ❌ Custom page sizes or "Page 1 of 3" copy.
- ❌ Paginate a grouped table.
- ❌ Put shadows on the page links or select.

## Checks
- `parity-lists` G19 — a paged table has the pagination footer.
- `fpds-units` — three zones in order; grouped footer when grouped.
- By eye: 16px between table and footer; current page on the header fill; rows-per-page 58×28.

## Reference
- Every list: 3PL › Delivery Orders, Sales › Orders, Sales › Quotes, Service Work › Parts, Customer Portal › Orders, › Invoices.
- Grouped footer: 3PL › Delivery Orders, 3PL › Directory, Sales › Orders, Sales › Customers, Sales › Assets, Customer Portal › Orders — each with Group by on.
