# Dashboard tiles & cards

`id: unit.dashboard` · `layer: unit` · `code: prototypes/unified-view/DashboardParts.tsx, src/components/ui/term-icons.tsx, src/components/ui/trend-chip.tsx, prototypes/unified-view/threepl/ThreePLDashboard.tsx, prototypes/unified-view/SalesDashboard.tsx, prototypes/customer-portal/DashboardScreen.tsx` · `registry: fpds-dashboard`

## Purpose
A module's overview: a few figures, charts and short tables that say how much work there is, where it sits and what needs somebody now. In the Unified View every figure is a way into the list it counts; in the Customer Portal it is a few things for the customer to glance at, with "Attention required" first.

## Use when / Don't use when
- Use when a module needs an overview page — 3PL and Sales (Unified View, built from `DashboardParts`) or the Customer Portal landing page.
- Use the figure-card style (figure · `TrendChip` · "vs …" line · `MetricIcon`) for any metric card that leads with a number, in any module.
- Don't use for a list's own filtering cards above a table — those are list overview cards, not a dashboard.
- Don't use for a banner that acts on a list — use `unit.alert-banner`. The dashboard's "Attention required" is a different pattern by design.
- Don't use for a report to generate and take away — Customer Portal "Delivery performance" is a report on the Reports page, not a dashboard card.
- Don't build a cross-module dashboard; Lease and Pricing have none.

## Anatomy
**Unified View (3PL, Sales) — `DashboardParts`, top to bottom:**
1. Scope row — line segment (`ToggleGroup`, `LINE_SCOPES`: All · Fuel · Lubricants · Propane) left, `DateRangeFilter` right (3PL).
2. `DASHBOARD_GROUND` — the gray ground that wraps every card.
3. Stat row — four `StatTile`s (label · figure · note), 2 across, 4 from `lg`.
4. `Panel`s in two-up rows — title + `aside` (muted count) header, then one of:
   - `BarColumns` — vertical bars, value above, label under, peak lit;
   - `BarList` — ranked rows (name, figure, share %, bar under the name);
   - `BarList share` — one segmented bar + a dot-and-name row per part;
   - a short DS `Table` (e.g. Partner spend, Needs attention with `StatusChip`).

**Customer Portal — `DashboardScreen`, top to bottom:**
1. "Attention required" — collapsed banner header (bell disc · title · count pill · chevron); opened, a grid of tiles: `CreditHoldTile` (one tile for all credit holds) and `ActionTile`s (icon tile · "<order no.>: Problem" · ≤6-word line · act pill · facts grid · planned date + countdown).
2. `Section` "Schedule for the next 7 days" — one card, four `ScheduleTile`s ruled apart (Deliveries · Products · Gallons · Ship-tos), each: title · figure + unit + `TrendChip` · "vs N the previous 7 days" · `MetricIcon` beside; round ↗ button in the card's corner.
3. `Section` "Tank monitor readings" — `TankHealthCard`.
4. `Section` "Spend" — range toggle (Last 4/8/12 weeks) in the section's `aside`; `SpendCard`, `SpendByProductCard`.
5. `Section` "Billing & credit" — `InvoicesCard`, `CreditCard` (only where the tenant gives credit).
6. Portal `Card` parts: title (+ ⓘ `note` explainer) · `aside` · body; `bare` = part of a shared card, set apart by a divider; `Legend` under charts; `QuietPattern` fills an empty stretch of a card.

## Look
- **UV ground and cards:** ground `DASHBOARD_GROUND` = `rounded-xl bg-fp-surface-1a p-3` (dark: `bg-fp-surface-1b`); cards `rounded-xl bg-fp-surface-1b shadow-xs` (dark: `bg-fp-surface-1a`), no rim. Gaps `gap-3`.
- **Panel:** header `px-5 pt-4`, title `text-base font-semibold`, aside `text-xs text-muted-foreground`; body `px-5 pt-4 pb-5`.
- **StatTile:** `p-5`, label `text-sm font-medium`, figure `text-3xl font-semibold tabular-nums`, note `text-xs text-muted-foreground`.
- **Charts color by job, from `--fp-viz-*`:** a count over stages/time = one series, slot `fp-viz-1`, the peak bar solid, the rest `fp-viz-1/15` (hover `/40`; dark `/25`, `/50`); a zero bar `bg-fp-outline-1` at 3px. A ranking = `fp-viz-1` throughout on a `fp-viz-1/12` track (dark `/20`). A share = `fp-viz-1…8` in fixed order, 2px gaps, rounded only at the two ends, a `size-2.5` dot beside each name. Bars: 4px rounded top, 2px gap, `max-w-11`, default height 140.
- **Portal cards:** `rounded-xl border border-border bg-fp-surface-1b`, `p-4`, `gap-4`; card title `text-sm font-semibold`; section title `text-base font-semibold`; sections `gap-3`, page `gap-4`.
- **Metric icon:** `MetricIcon` — 48px `rounded-lg` tile, `bg-accent-violet/6`, icon 28px, line 1.75, `text-accent-violet`. Icons from `TERM_ICONS`: deliveries `TruckIcon`, products `DropIcon`, gallons `DrumIcon`, ship-tos `PinIcon` (Lucide 24 grid, 22% soft fill, wavy level for liquids).
- **TrendChip:** `rounded-md`, `h-7 px-2 text-sm` (md) / `h-5 px-1.5 text-xs` (sm); good = `bg-fp-trend-up-bg text-fp-trend-up`, bad = `bg-fp-trend-down-bg text-fp-trend-down`, same = `bg-muted text-muted-foreground`; a small filled triangle ▲/▼.
- **Attention required:** `border-status-processing/20 bg-status-processing/5`, soft blurred `status-processing/10` glow top-right; tiles `rounded-xl border border-border bg-fp-surface-1b`, icon tile `size-10 rounded-lg` in the violet pill's colors (`pillColorClass("neutral","violet")`); countdown `text-status-failed` when ≤ 2 days, else `text-status-processing`.

## States
- **default** — figures and charts for the current scope/range.
- **hover** — StatTile `shadow-sm`; bar tint deepens; BarList row `bg-accent/50`; share segment `opacity-80`; portal headline figure softens to `opacity-60` (no underline); action tile rim `fp-outline-2`. Every chart mark has a tooltip (label · detail).
- **focus** — `ring-2 ring-ring/50` on every pressable tile, bar, row.
- **disabled** — a tile/bar/row with nothing to open (`onOpen` absent, or a count of 0) is a disabled button: no hover, no press.
- **empty** — `BarList` with no data: "Nothing in this range."; Partner spend: "No partner holds an order in this range."; Needs attention: "Nothing waiting on anybody."; Schedule sheet: "No deliveries planned."; "Attention required" with nothing in it is not rendered.
- **collapsed / open** — "Attention required" is collapsed by default (header + count); while collapsed a red band shine sweeps its outline (`OutlineShine`, still for reduced motion); open shows the tiles.
- **no change** — `TrendChip dir="same"` gray "Same"; portal `Change` shows "No change".

## Interactions
| Trigger | Result |
|---|---|
| Press a UV `StatTile` (e.g. 3PL Live orders, Needs action) | Opens Delivery Orders narrowed to exactly those rows (line, date range, status facets) |
| Press a bar in "Orders by lane" | Opens Delivery Orders filtered to that status |
| Press a bar in "Orders by delivery date" | Opens Delivery Orders on that one day (one-day range) |
| Press an Order types segment/row | Opens the list with that Order Types facet (only where the type is a facet) |
| Press a Top customers row / Partner spend row | Opens the list filtered by that customer / vendor |
| Press a Needs attention row | Board loads that order's day, then the order's sheet opens |
| Hover any bar, segment or row | Tooltip: name · detail (e.g. "3 orders · $9,323") |
| Change the line segment or date range (3PL) | Every figure recomputes for that scope; drills carry it |
| Press "Attention required" header (Portal) | Toggles open/closed; shine stops while open |
| Press an `ActionTile` | Opens the 600px `ActionSheet` (what is needed, why, facts) → "View order details" → order sheet |
| Press an order number in `CreditHoldTile` | Opens that order's sheet |
| Press a portal headline figure | Popover with its explanation ("Compared with the N weeks before") |
| Press ⓘ beside a portal card title | Opens the card's explainer |
| Press the ↗ corner button on the Schedule card | Opens a `RecordSheet` "Next 7 days" with the schedule table; a row closes it and opens the order |
| Change "Last 4/8/12 weeks" on Spend | Spend cards rescope; the range label beside it updates |
| Tank health "Create order" | Creates a draft order for that ship-to and tank (product = last ordered), opens it in create mode |

## Outcomes
- A list opened already narrowed to the rows a figure counts (UV).
- An order sheet, an action sheet or the "Next 7 days" sheet opening (Portal).
- A new draft order from a tank card (Portal).
- A popover/tooltip explaining a figure.
- Nothing, when a tile or bar has no count (disabled).
- An empty message in a card when its range holds nothing; no "Attention required" banner when nothing needs action.

## Data contract
- `StatTile { label, value, note?, onOpen? }` — `onOpen` absent → not pressable.
- `BarDatum { key, label, value, detail?, onOpen? }`; `BarColumns { data, height? }`; `BarList { data, format?, share? }` (share keeps ≤ 8 parts).
- `Panel { title, aside?, className?, children }`.
- `ThreePLDashboard { onDrill(ThreePLDrill{ line, range, facets }), onOpenOrder(id) }`; Sales: `onDrill(SalesDrill)` (its day as a one-day range + column boxes).
- `MetricIcon { icon }` with `TERM_ICONS.deliveries | products | gallons | shipTos`.
- `TrendChip { dir: up|down|same, good? (defaults to up = good), size?: sm|md, children }`.
- Portal reads the order store (`useRequests`) and `dashboard.ts` weekly history; reports nothing back except opening sheets.

## Rules
1. **Everything on a UV dashboard is a way into a list** — every tile, bar and row opens its list narrowed to exactly what it counts — *so the dashboard never states a figure the reader cannot go and check* — `(source: DashboardParts.tsx header; docs/unified-view/2-layouts.md "Module dashboards", Pavan 2026-10-05)`.
2. **One dashboard vocabulary** — a module dashboard is built from `DashboardParts` (Panel · StatTile · BarColumns · BarList · DASHBOARD_GROUND) — *3PL and Sales must read as one product* — `(source: parity-shell G50)`.
3. **White cards on a gray ground, swapped in dark** — *after the reference dashboard; the cards must still sit above their ground in dark* — `(source: 2-layouts.md, 2026-10-05)`.
4. **Color by the job it does** — count = one series with the peak lit; share = palette in fixed order with a dot beside each name; ranking = one series — *the eye finds the busiest bar first, and color is never alone* — `(source: DashboardParts.tsx; 2-layouts.md)`.
5. **Dashboard is first in the rail, but the module opens on Orders** — `MODULE_LANDING` 3PL → Orders, Sales → Orders — `(source: parity-shell G52; UnifiedView.tsx)`. The Customer Portal opens on its Dashboard — `(source: memory project_customer_portal)`.
6. **One icon per term, one style** — `MetricIcon` + `TERM_ICONS` beside the figure, centred on the figure-and-change unit, not in the title row — *the word and its picture stay one thing in every module* — `(source: docs/ds/ui/2-rules.md §10k, Pavan 2026-10-20)`.
7. **One up/down marker: `TrendChip`** — no arrows in circles, no orange, no `destructive` red; down is always `--fp-trend-down`; `good` makes a wanted fall green — `(source: ui §10k; memory feedback_metric_icons)`.
8. **No trend lines on figure cards** — the term's `MetricIcon` sits there instead — `(source: ui §10k, 2026-10-20)`.
9. **No explainer lines on the portal dashboard** — a headline figure softens on hover and explains on click; a chart's explainer is an ⓘ beside its title — *Pavan, 2026-10-14* — `(source: customer-portal README)`.
10. **"Attention required" first, collapsed by default, only real kinds** — credit holds (one tile, a count, no balance), running late, no proof of delivery — *Anirudh review: what needs the customer comes first* — `(source: DashboardScreen.tsx; customer-portal README 2026-10-19)`.
11. **An action tile's title is the action/problem, led by the order number; a delivered order has no countdown** — `(source: DashboardScreen.tsx, Pavan 2026-10-15)`.
12. **Side-by-side cards are the same height; charts fill** — `(source: memory project_customer_portal "Alignment rule", 2026-10-14)`.
13. **Empty card space uses `QuietPattern` only** — never a new pattern per card — `(source: ui §11d)`.
14. **Credit only where the tenant gives it** — `(source: customer-portal README; DashboardScreen.tsx)`.

## Do / Don't
- ✅ Give every UV tile/bar/row an `onOpen` that drills into the list with the same scope.
- ✅ Use `TERM_ICONS` for deliveries, products, gallons, ship-tos — same icon in every module.
- ✅ Put the range control on the section it scopes (portal Spend).
- ❌ Don't color a count chart by category, or use hues for identity without a label/dot.
- ❌ Don't add delta chips where there is no prior-period data (UV dashboards have none).
- ❌ Don't draw a new violet, a new trend color, or a sparkline on a figure card.
- ❌ Don't turn "Attention required" into an `AlertBanner`.

## Checks
- `parity-shell` — G50 (built from DashboardParts), G52 (Dashboard first in the rail, module opens on Orders).
- `tokens` — no raw hex; `wcag-contrast` — trend, viz and status pairs.
- `fpds-cards`, `fpds-units` — this card's format.
- By eye: every pressable figure opens a correctly narrowed list; peak bar lit; side-by-side cards equal height; `MetricIcon` centred on figure + chip + "vs" line; shine runs only while collapsed.

## Reference
- 3PL › Dashboard (`ThreePLDashboard`) — stat row, Orders by lane / by delivery date, Order types (share), Top customers, Partner spend, Needs attention.
- Sales › Dashboard (`SalesDashboard`).
- Customer Portal › Dashboard (`DashboardScreen`) — Attention required, Schedule for the next 7 days (metric tiles), Tank monitor readings, Spend, Billing & credit.
- DS showcase › Metric Icons.

> **Figure tiles (Pavan, 2026-10-26):** the metric icon LEADS the tile (MetricIcon `size="lg"`, 64px) with the title, figure and comparison as one block beside it, and EVERY tile carries its own open arrow (outline, round) at the right that opens its own sheet or list. Unified View tiles without a term icon keep the arrow (the tile is the button).
