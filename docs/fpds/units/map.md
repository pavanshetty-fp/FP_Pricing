# Map

`id: unit.map` · `layer: unit` · `code: prototypes/unified-view/OrderMapView.tsx` · `registry: fpds-map`

## Purpose
Shows the list's orders as a list on the left and pins at their ship-to sites on the right, one selection across both. Answers "what else is going out near this one?" — a question no column can sort.

## Use when / Don't use when
- Use when the list's records are geographic (orders with a ship-to) and the toolbar offers `mapView`.
- Use in the Customer Portal with live trucks for orders out for delivery.
- Don't use when records have no place (Customers, Directory lists) — `mapView` stays off; no dead icon.
- Don't use for picking or placing one location on a record (ship-to / asset address) — that is the record sheet's own Leaflet map, not this unit.
- Don't use for workflow stage → `unit.board`; for columns → the list table.

## Anatomy
1. **Order list** (left, 340px column) — one row per order: order number + status pill · subtitle (whose order / date and window) · site line with a pin icon.
2. **Plot** (right, fills the rest) — the orders' own geography:
   - **Site pin** — one round pin per ship-to with the count of orders there; site name label under it, shown when lit.
   - **Pin hover card** (optional) — the orders at that site, primary details only.
   - **Roads** (when trucks are given) — dashed line from origin to site, the driven part solid.
   - **Origin mark** — small square at each place trucks left from, named.
   - **Truck** — round button with a truck icon riding its road, pulsing ring.
   - **Unmapped note** — bottom-right "N without a mapped site".

## Look
- Layout `flex gap-4`, full height. List `w-[340px] rounded-md border border-border`, rows `px-3 py-2.5 border-b border-border`; number `font-mono text-sm font-semibold`; status `StatusChip variant="soft"` (the pill, by kind; Sales may pass a chosen `color`); subtitle + site `text-xs text-muted-foreground`, `MapPin` size-3.
- Plot `rounded-md border border-border bg-fp-surface-1a`, no tiles.
- Pin fill by the first order's tone: success `bg-status-success` · processing (caution) `bg-fp-banner-accent-caution` · failed (critical) `bg-status-failed` · info `bg-fp-banner-accent-info` · neutral `bg-muted-foreground`. Size-5 (size-7 + scale-110 lit), `text-[10px] font-semibold` count in white, `ring-2 ring-fp-surface-1a`.
- Site label `text-[10px]`, lit: `bg-selected text-selected-foreground`.
- Road: dashed `stroke-muted-foreground/50`; driven part `stroke-fp-banner-accent-caution`. Truck size-7 `bg-fp-banner-accent-caution`, white icon, `shadow-md`, ping ring `/40` (`motion-safe` only), moves with a 1s linear transition. Origin mark size-3 `bg-foreground`.
- Hover card `w-80 p-0`, opens above the pin (open 80ms, close 120ms).

## States
- **Row default / hover** — hover `bg-accent`.
- **Lit (row or pin hovered)** — the row turns `bg-selected` with `text-selected-foreground` number; every row at that site lights; its pin grows and shows its site name.
- **Focus** — 2px `ring-ring/50` on rows, pins and trucks.
- **No mappable orders** — the plot frames the whole country (fallback bounds), no pins.
- **Some unmapped** — note "N without a mapped site".
- **Trucks moving** — CP re-reads positions every 3s while the map view is open.

## Interactions
| Trigger | Result |
|---|---|
| Hover a list row | Lights that row's site: the pin grows, shows its name; all rows at that site light. |
| Hover a pin | Lights the site's rows; with `hoverCard`, a card lists the orders there (CP: number, status, ship-to · date and window, lines, truck · driver · ETA). |
| Click a list row | Opens that order's sheet. |
| Click a pin | Opens the sheet of the first order at that site. |
| Click a truck | Opens the order it carries. |
| Tab to a row / pin / truck, Enter | Same as click. |
| Change search, filters, date range | List and pins redraw from the same narrowed set; the frame re-fits to the orders' spread. |

## Outcomes
- A record sheet opens (row, pin or truck).
- The reader sees which orders share a site and how they spread.
- Orders without a site are counted, never silently dropped.
- Empty narrowed set → the list's empty body replaces the view.

## Data contract
- `orders: MapOrder[]` — `id`, `orderNo`, `site` (a ship-to name; must match a known site or carry `coords`), `subtitle`, `status` (its word), `tone` (from the module's kind map), optional `color` (Sales chosen stage color), optional `coords {lat,lng}`.
- `onOpenOrder(id)` — reports which order to open.
- `hoverCard?(rows) → node` — optional; omitted, a pin has no hover card.
- `trucks?: MapTruck[]` — `id`, `orderId`, `label`, `from`, `to`, `progress` 0–1, optional `fromLabel`.
- `minPad` — least margin round the pins in degrees (default 1.2 for a region; CP uses 0.04 for one city).
- The map takes the whole sorted set, never one page.

## Rules
1. **One map for every orders screen, fed by `MapOrder`** — *forking per module would make the same screen behave differently depending on where you came in.* `(source: OrderMapView.tsx)`
2. **The map takes the sorted set, not the page** — *a page boundary is a table's property; half the day's work missing from a map is a map that lies.* `(source: BrokerOrdersScreen.tsx)`
3. **List and plot are one selection** — *hover one lights the other; click either opens the order.* `(source: OrderMapView.tsx)`
4. **Pins group by site** — *one dot per site hiding six orders hides what the map was opened to show.* `(source: OrderMapView.tsx)`
5. **The frame is the orders' own spread** — *a day's work in one valley should not be three pins in a corner of the country.* `(source: OrderMapView.tsx)`
6. **It draws the data's geography, not tiles** — *no network dependency or key in a file meant to open from disk; swap in tiles and pins don't move.* `(source: OrderMapView.tsx)`
7. **Pin color follows the status kind; info is blue like its chip** — *Scheduled and Dispatched had fallen through to gray.* `(source: OrderMapView.tsx, Pavan 2026-10-07)`
8. **A map view only where records are geographic; Map has no view tools** — *a control with nothing behind it is worse than none; a map has no columns to search or hide.* `(source: ui/2-rules.md §10p; ListToolbar mapView)`
9. **CP map: pin hover = primary details, press = sheet; trucks move from the clock** — *live tracking for the customer.* `(source: customer-portal README; memory 2026-10-13)`

## Do / Don't
- ✅ Pass every order a `tone` from the module's kind map.
- ✅ Count orders that cannot be placed.
- ✅ Keep search, filters and the date scope working on the map.
- ❌ Paginate or feed the map the current page.
- ❌ Build a module-specific map, or add Search-by-column / column tools to it.
- ❌ Animate the truck ping when reduced motion is set.

## Checks
- `status-kinds` (tones come from kinds), `tokens`, `parity-shell` (toolbar/view switch).
- By eye: hover links list ↔ pin, pin count, label on light, unmapped note, map icon only on geographic lists.

## Reference
- 3PL › Delivery Orders — Map view.
- Sales › Fuel Orders and Asset Orders — Map view (chosen stage colors).
- Customer Portal › Orders — Map view (hover cards, live trucks from the terminal).
