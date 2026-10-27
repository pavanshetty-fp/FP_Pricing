# Board

`id: unit.board` · `layer: unit` · `code: prototypes/unified-view/threepl/BrokerBoard.tsx, prototypes/unified-view/ListToolbar.tsx (BoardWithBar, cardFields)` · `registry: fpds-board`

## Purpose
Shows a list's records as cards in lanes, one lane per stage of the record's lifecycle, read left to right. Answers "where is every order in the work, and which ones need me?"

## Use when / Don't use when
- Use when the records move through a status workflow (orders, service work) and the list offers a board view (`ListToolbar boardView`).
- Use when a stage's cards need to say different things per stage (card fields are per lane).
- Don't use when the list has no workflow — Customers, Assets, Directory lists, standing arrangements (no lanes to put them in) → use the list table.
- Don't use when the question is geographic ("what else goes out near this one") → use `unit.map`.
- Don't use for a one-view list: no view switch, no board icon (ui §10h).

## Anatomy
1. **View bar** (`BoardWithBar`) — the top strip of the board's own box, a line under it, the lanes below in the same box — attached like the table's bar (2026-10-25). Left: the statement ("62 orders across 9 of 9 lanes · …"). Right: the board's own tool, **Card fields**.
2. **Lane row** — lanes side by side, scrolling sideways.
3. **Apart line** — the first lane that is not a step of the work (Canceled, Blocked) has a 3px left line instead of the 1px one.
4. **Lane** — a column of the board's box: header (title as a pill in the lane colour · count pill · lane sort icon) with a line under it → scrollable card stack, or the empty label. No colour strip (2026-10-25).
5. **Card** (the whole card is the button):
   - Head: order number (mono) + type `CodeDisc` beside it · badges (pills) at the right · optional subtitle lines (e.g. a movement's route).
   - **Units**, grouped by spacing, no rules between them (2026-10-25): a 10px uppercase heading + one shape — `stack` (lines at three levels, optional figure at the right), `inline` (short values split by a hairline), `rows` (asset · product · qty, optional dashed-rule Total), `quotes` — a light green band tucked 4px inside the card on every side (`-mx-2 rounded-sm bg-fp-quote-band px-2 py-1`, card `pb-1` when it is last), text on the card's 12px line, heading inside, vendor + price, "Best price"/"2nd best" as text, ‹ 1/N › stepper at the bottom right, under the price (24px targets); price may open a breakdown popover. As the last unit it closes the card, and the card drops its "N of N quotes — review pricing" alert.
   - **Alert strip** (optional) — info icon + text in the alert color, optional outline action at the right.
   - **Footer action** (optional) — one state label at the left (with a tick when waiting), the act that moves it on at the right.
6. **Lane sort menu** — "Sort <lane> by", radio list: "Lane order" first, then the lane's own option, then the common options.
7. **Card fields menu** (toolbar, board only) — scope select (All lanes / one lane) above the ticks, ticks per unit with child lines nested, "Show all", counter "shown/total".

## Look
- Board: the lanes edge to edge inside `BoardWithBar`'s box, horizontal scroll. Lanes `border-l border-border first:border-l-0`; apart lane `border-l-3 border-fp-outline-2`.
- Box + view bar: `rounded-md border border-border bg-fp-surface-1b`; the bar is its top strip with `border-b border-fp-outline-1`.
- Lane: width `--fp-board-lane-width` (340px × `--fp-lane-k`, Accessibility › Component size), square, `bg-fp-surface-1b`. Title pill `rounded-full px-2.5 py-0.5` in `bg-fp-lane-<color>-vivid text-fp-lane-<color>-vivid-ink` (2026-10-27, after a ClickUp board: a saturated fill, white text — dark on yellow — the same in both themes, white at AA; deeper at the WCAG end for AAA; gray, blue, yellow, green, cyan, purple, violet, pink, orange, red).
- Lane header `border-b border-border px-5 py-3`; title `text-sm font-semibold`; count pill `bg-fp-lane-count` (#dde1e7 light / #3d4550 dark — a step off the lane, 2026-10-27), `text-[11px] font-medium`, neutral ink (never lane-coloured with white text). Sort icon `ArrowDownUp` size-4, `text-muted-foreground`, `text-foreground` when a sort is chosen.
- Card stack `gap-3 px-5 py-4` (20px either side of the cards), `overflow-y-auto`; cards `shrink-0`.
- Card: `rounded-md border border-fp-outline-1 bg-fp-surface-1b`; `pb-3`; head `px-3 pt-3`, number `font-mono text-sm font-semibold`; badges = DS `Pill` (h-7). Units `px-3 pt-4 gap-1.5` — 12px inset, 16px between units, 6px inside; unit heading `text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground`.
- Stack levels: 1 `text-sm font-semibold text-foreground` · 2 `text-[13px] font-medium text-muted-foreground` · 3 `text-xs text-muted-foreground`. Figures / quote price `text-lg font-semibold tabular-nums` (the largest thing on the card). Inline hairline `h-3.5 w-px bg-fp-outline-2`. Rows grid `1fr · 1.05fr · auto`, asset id `font-mono text-[11px]`, Top-off qty soft (`font-medium text-muted-foreground`).
- Alert strip: `px-3 pt-4 text-xs`; text color `text-fp-banner-accent-caution` / `-warning` / `-success` or `text-foreground` (default); action `Button outline xs`.
- Footer: `border-t border-fp-outline-1 px-3.5 py-2.5`, label `text-xs`; act `Button` variant `success` (filled) or `outline`, size `xs`.

## States
- **Card default** — outline-1 rim on surface-1b.
- **Card hover** — rim `fp-outline-2` + `shadow-fp-surface`.
- **Card focus** — `border-ring` + 2px `ring-ring/50`.
- **Card active/pressed** — rim outline-2, fill `bg-fp-card-1`.
- **Lane empty** — the stack is replaced by `emptyLabel` in `text-xs text-muted-foreground` ("No orders in quoting"; default "Nothing here").
- **Lane sort chosen** — icon in body ink; aria-label names the chosen sort.
- **Quote stepper** — chevrons disabled (30% opacity) at the first / last quote.
- **Footer waiting** — muted label with a tick, no button.
- **Long lane** — cards keep full height, the lane scrolls (cards never compress).

## Interactions
| Trigger | Result |
|---|---|
| Click a card, or Enter / Space on a focused card | Opens the record's sheet (`onOpenCard(id)`). |
| Click the alert strip's action (e.g. "Select Vendor", "Review", "View") | Runs that action only — the card does not also open (CP opens the order). Clicking a card that carries quotes opens the 3PL sheet at the Pricing heading. |
| Click the footer act (e.g. "Request invoice") | Runs the act; the card does not open. Lane does not change for invoice acts. |
| Click ‹ / › on a quotes unit | Steps to the previous / next quote (cheapest first); the card does not open. |
| Click a quote price with a breakdown (dotted underline) | Popover "Delivery Details" with the Asset · Product · Quantity table and total; the card does not open. |
| Hover the Delivery Details line ("3 assets · 3 products · 2,600 gal", one dotted underline) | Hover card: Asset · Product · Quantity table on the left (every row shows, total included — at least 2 rows tall, at most 4.5, then it scrolls; white in dark, like the tooltip), ship-to map on the right at the same height — radius as a dashed circle, no site pin, every asset at the site inside it (the order's highlighted, the rest dimmed); hover a dot for its name and lat/lng. No map on the card. |
| Click the lane's sort icon | Menu "Sort <lane> by" with "Lane order" + options. |
| Pick a sort option | That lane reorders by it; only that lane. "Lane order" restores the lane's own order. |
| Card fields → scope select | Switches what the ticks govern: All lanes or one lane. |
| Card fields → tick a unit heading | Shows/hides the unit with all its lines, in the scoped lanes. |
| Card fields → untick the last line of a unit | The heading goes too (a heading with nothing under it is not a unit). |
| Card fields → Show all | Every unit on in the scoped lanes; disabled when nothing is hidden. |
| Drag a card | Nothing — there is no drag between lanes. |
| Switch to table / map, then back | Board returns with its lane sorts and card fields (part of the saved view). |

## Outcomes
- A record sheet opens (card click, or alert/footer act that opens it).
- A lane is reordered, by a named sort, kept in the saved view.
- Card fields changed per lane or for all lanes, kept in the saved view.
- An act runs from the card footer (the record's own state moves on, e.g. invoice requested; the lane stays).
- Empty lane shows its empty label; the lane still stands.
- No records at all → the list's empty body replaces the board (the board is not drawn).
- The board is not paged; the view bar states the total and its scope instead.

## Data contract
- `lanes: BoardLane[]` — each `key`, `title`, `color` (lane palette name), `cards`, optional `emptyLabel`, optional `apart` (its left line is 3px).
- `BoardCard` — `id`, `title` (record number), optional `code` (`text`, `label`, `tone` for the CodeDisc), `badges[]` (`label`, `tone`: critical · neutral · caution · success · info), `subtitle[]`, `units[]` (stack / inline / rows / quotes), optional `alert` (`status`: default · caution · warning · success, `text`, `actionLabel`, `onAction`), optional `footerAction` (`label`, `actionLabel`, `actionVariant` success | outline, `onAction`, `waiting`).
- `onOpenCard(id)` — reports the opened card.
- `laneSortOptions(laneKey) → {key,label}[]`, `laneSort` (chosen per lane), `onLaneSortChange(laneKey, option | null)`.
- Card fields (`ListToolbar cardFields`): `units`, `hidden`, `scope`, `scopes`, `onScopeChange`, `onToggle(key)`, `onShowAll()`.
- `BoardWithBar barRef` — the toolbar renders the statement and tools into the bar.

## Rules
1. **Lanes are the lifecycle, in order** — *sorting by status sorts by lane position; a board read left to right claims each lane follows the one before.* `(source: docs/unified-view/2-layouts.md §6)`
2. **A lane that is not a step sits apart, behind a 3px line** (Canceled, Blocked) — *a gap alone reads as a mistake; the rule tells the reader the lanes after it are somewhere else, not the end of the line.* `(source: interactions/2-rules.md §8.1b; BrokerBoard.tsx)`
3. **No drag between lanes** — *a stage change is a workflow act with side effects (mail leaves, accounting push), not a reorder; stages change from the record's next-act control.* `(source: interactions/2-rules.md §8.1b)`
4. **A card is units grouped by spacing, no rules, no field labels inside** — *the heading names the unit and weight carries the rest; spacing groups without drawing lines (2026-10-25).* `(source: interactions/2-rules.md §8.1b)`
5. **A heading with nothing under it is not a unit** — *it reads as a failure to load.* `(source: interactions/2-rules.md §8.1b)`
6. **Card fields are per lane, scope control above the ticks** — *what a first-lane card should say is not what a last-lane card should; on All lanes a field is ON only when on in every lane.* `(source: interactions/2-rules.md §8.1b)`
7. **An alert only on a card with something outstanding** — *an alert on every card is a border.* `(source: 2-layouts §6)`
8. **Lane sort is per lane, named, and one option may belong to the lane** — *which end of a queue you work from has a reason; the reason is the label. "Lane order" is a choice, not the absence of one.* `(source: BrokerBoard.tsx; interactions §8.1b)`
9. **The whole card is the button; no "View details" row** — *a strip naming that is a label for what the reader already stands on.* `(source: BrokerBoard.tsx)`
10. **Every control on a card stops the click** — *otherwise stepping a quote or pressing an act also opens the order.* `(source: BrokerBoard.tsx)`
11. **Count pill is neutral, the lane's color lives in the title pill's vivid fill** — *white text holds AA because the vivid fills are deepened for it; the count stays neutral so the lane reads one colour.* `(source: BrokerBoard.tsx DS follow-up 8)`
12. **Cards never shrink; the lane scrolls** — *a compressed card clips its content silently.* `(source: BrokerBoard.tsx DS follow-up 7)`
13. **Lane color = the status it ends on, by the binding table** (gray starts, red stops, green finishes, purple hands off) — *a hue must not mean two things in two modules.* `(source: docs/unified-view/1-components.md §5 Lane fills)`
14. **Type is a code disc on board cards only** (tables use a pill with the full word) — *on a card space is a letter.* `(source: ui/2-rules.md §11b)`
15. **Badges are pills coloured by kind; render the absence** — *a chip every card carries says nothing (no "Normal" priority, no status repeating the lane).* `(source: ui/2-rules.md §10b, §11b)`
16. **Footer act is filled (`success`)** — *an outline read as one more thing to look at, not the thing to press.* `(source: BrokerBoard.tsx)`
17. **Board view bar is the top strip of the board's box, statement left, Card fields right** — *every list with a table or board has one; the statement replaces the footer total.* `(source: ui/2-rules.md §10p, 2026-10-22)`
18. **Lane ground one step darker (`--fp-card-1`)** — *on older laptops the lighter lane washed into the white layer.* `(source: src/index.css; memory 2026-10-22 darker board lanes)`

## Do / Don't
- ✅ Reuse `BrokerBoard` + `BoardWithBar` for every board (3PL, Sales, Service, Customer Portal).
- ✅ Give each lane an `emptyLabel` naming the lane ("No orders in quoting").
- ✅ Put the quote price / figure at the card's right edge in `text-lg`.
- ✅ Offer each lane only the card fields it can draw.
- ❌ Drag-and-drop between lanes, or a per-lane "+ Create" footer.
- ❌ A lane-coloured count pill with white text.
- ❌ An alert or badge on every card; a status badge that repeats the lane title.
- ❌ Red for a lane that is just a place (Canceled is gray).
- ❌ Paginating the board.
- ❌ Reusing the table's Show/Hide columns icon for card fields.

## Checks
- `parity-shell` and `parity-sheets` (3PL guardrails on the list and the sheet the card opens); `status-kinds` (badge kinds); `wcag-contrast` (lane strip, count pill, ground); `tokens`.
- By eye: lanes in lifecycle order, 3px apart line before Canceled/Blocked, card focus ring and Enter opening, card controls not opening the card, lanes scroll with full-height cards, card fields scope above ticks, view bar statement.

## Reference
- 3PL › Delivery Orders board (Orders · Quoting · Assigned · Completed · Review · Verified · Synced ┃ Canceled · Blocked).
- Sales › Fuel Orders and Asset Orders board.
- Service Work › Service Orders board.
- Customer Portal › Orders board (lane per status, Canceled apart; Awaiting pill + caution strip with "View").


> Earlier board designs (V1–V3) are archived in `docs/archive/board-versions-2026-10-25.md`.
