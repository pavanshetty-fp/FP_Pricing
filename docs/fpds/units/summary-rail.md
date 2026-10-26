# Summary rail & activity

`id: unit.summary-rail` · `layer: unit` · `code: prototypes/unified-view/SheetCards.tsx` · `registry: fpds-summary-rail`

## Purpose
The read-only right column of a record sheet: the **Summary card** shows what the form computes (totals, counts, the headline figure), the **Activity card** shows the record's history. It answers "what has this record become?" and "what happened to it, when, by whom?".

## Use when / Don't use when
- Use when a record sheet has a derived side — figures computed from what is typed, or a history.
- Use `RailCard` + `RailRow` for other read-only facts in the rail (e.g. Service Work "Record", "Payment", "Visits").
- Don't use while CREATING a record — create sheets have no rail (exception: the Customer Portal order sheet keeps its summary on the right while creating).
- Don't put editable values in the rail — they belong in the form (`unit.record-sheet`).
- Don't build a bespoke summary block or activity list — always these two cards.

## Anatomy
1. **Rail** — `aside`, 340px, sticky at the top of the sheet body, cards stacked 24px apart.
2. **SummaryCard** — tinted frame · title on the frame (e.g. "Quotation summary", "Quote summary", "Order summary", "Summary") · one inner card holding label · value rows (`RailRow` `line`), a dashed divider, then the headline figure last (`RailRow` `total`).
3. **RailRow** — label (`dt`) · value (`dd`); with a `breakdown`, the value is dotted-underlined and a tooltip on the left lists each contribution.
4. **RailCard** — bordered block with a header band (icon + title, optional action) and a flush body of rows.
5. **ActivityCard** — a `RailCard` titled "Activity" with the history icon; a timeline: mark (round icon) · what changed · "date, time · who"; a line joins the marks.

## Look
- SummaryCard frame: `rounded-xl p-1`, gradient from `--pastel-violet` and `--pastel-rose` into `--fp-surface-1a` (dark: the `-foreground` pastels); title `text-base font-semibold text-foreground`, `px-3 pt-2 pb-2.5`; inner card `rounded-lg border border-border bg-fp-surface-1b p-3`, `gap-3`.
- `fill` SummaryCard: grows to the column's height (`min-h-64 flex-1`), inner card scrolls; what should sit at the bottom takes `mt-auto`.
- Divider between line rows and total: `border-t border-dashed border-border`.
- RailRow `rail`: `px-4 py-2.5`, label `text-xs text-muted-foreground`, value `text-sm text-foreground`. `line`: `py-1`, label `text-sm text-foreground`, value `text-sm text-muted-foreground`. `total`: label `text-base font-medium`, value `text-base font-semibold`, wraps rather than cutting the label (figure drops under it). Values `tabular-nums`.
- Breakdown affordance: `underline decoration-dotted decoration-muted-foreground underline-offset-4`, `cursor-help`; tooltip `side="left"`, `max-w-xs`.
- RailCard: `rounded-lg border border-border`; header band `border-b border-border bg-fp-surface-1a px-4 py-2.5`, title `text-sm font-semibold text-muted-foreground`, icon 14px.
- Activity marks: 28px round (`size-7`), border + 10% fill by kind — money/quote and created: `status-success`; sent/invited/email: `fp-banner-accent-info`; cancel/remove/delete/block: `status-failed`; everything else: `border-border bg-card text-muted-foreground`. Connector `w-px bg-border`. Change `text-sm text-foreground`; stamp `text-xs text-muted-foreground`.

## States
- **summary, empty** — rows show "—"; a caller may put a one-line state note inside (3PL: no quotes yet).
- **summary, filled** — rows + total.
- **summary, fill** — stretches to the rail's height (Customer Portal order sheet, every state).
- **row with breakdown** — dotted underline; hover/focus shows the tooltip.
- **activity, empty** — "Nothing has changed yet."
- **activity, entries** — the six latest saves, most recent first, one line per change.

## Interactions
| Trigger | Result |
|---|---|
| Hover / focus a dotted-underlined figure | Tooltip to the left lists how the figure adds up (label · value per line) |
| Hover a figure with no breakdown | Nothing (no underline, no cursor change) |
| Scroll the form | Rail stays in place (sticky) |
| Sheet narrower than `lg` | Rail folds under the form, one column |
| Caller's tabs inside the summary (3PL quotes) | Figures switch to the chosen quote |
| Press a link value (e.g. Invoice number) | Opens that record (caller-supplied) |

## Outcomes
- A reader sees the computed figures and how each adds up without leaving the sheet.
- A reader sees who changed what and when (six latest saves).
- Nothing changes on the record — the rail is read-only.

## Data contract
- `SummaryCard { title, children, fill? }`.
- `RailRow { label, value, breakdown?: {label, value}[], variant?: "rail" | "line" | "total" }`.
- `RailCard { title, icon?, action?, children }`.
- `ActivityCard { entries?: { at (ISO), by, changes: string[] }[], timeZone? }` — stamps printed "Mon D, YYYY, h:mm"; `timeZone` from Sales Preferences.
- No callbacks; read-only.

## Rules
1. **One summary card, one activity card, in every module's record sheet** — never a bespoke version — *consistency is the default; Quote's price and activity were once rebuilt as new blocks* — `(source: docs/ds/ux/2-rules.md; Pavan 2026-10-07; feedback_shared_sheet_cards)`.
2. **Editable left, derived right** — *an editable number and a computed one in one column look identical* — `(source: ux/2-rules two-column sheet)`.
3. **The rail is sticky** — *it answers questions the reader has while looking at any part of the form* — `(source: ux/2-rules; unified-view/2-layouts §7)`.
4. **The headline figure is last, and a figure has a name** (Total, Estimated, Margin…) — `(source: ux/2-rules "A figure has a name")`.
5. **The dotted underline appears only where a breakdown exists** — *an affordance is a promise* — `(source: SheetCards RailRow; unified-view/3-interactions §4)`.
6. **A total never cuts its label** — the figure drops under it — `(source: SheetCards.tsx, Pavan 2026-10-20)`.
7. **Activity = meaningful events only, latest first; draft edits not logged; a note change is logged, not its text** — *an entry per pause buries the ones that matter* — `(source: feedback_ui_rules; 3-interactions §2)`.
8. **What changed leads, who and when follow** — *the reader is looking for the event* — `(source: SheetCards ActivityCard)`.
9. **No rail while creating** — `(source: feedback_ui_rules)`; the Customer Portal order sheet keeps its summary on the right while creating — `(source: project_customer_portal 2026-10-13)`.
10. **Customer Portal order summary fills the rail's full height in every state**; trip + activity keep their own height below — `(source: project_customer_portal 2026-10-20)`.
11. **One highlighted card per sheet** — the tinted SummaryCard goes to the single most important read-out (the order/quote summary, or what needs attention); every other rail card is a plain RailCard — `(source: UX-161, Pavan 2026-10-26; eval sheets)`
12. **RailCard headers are quiet** — no fill band; title 14px medium muted with its icon; a hairline under it — `(source: Pavan 2026-10-26)`
13. **Notes above Activity; Activity is the last card** — `(source: Pavan 2026-10-26)`
14. **The rail ends level with the form's last unit** — pinned, capped to the scroller, its foot aligned with the last unit on the left (the form's 40px foot room below both); what doesn't fit scrolls inside the rail — `(source: Pavan 2026-10-26)`

## Do / Don't
- ✅ Give every computed figure a `breakdown` when it is made of parts.
- ✅ Show the same figure the form shows — one number for one thing.
- ✅ Use `RailCard` for other read-only fact groups in the rail.
- ❌ A local summary box or a `RailCard` titled as a summary.
- ❌ An activity list drawn by hand.
- ❌ Inputs in the rail.
- ❌ A dotted underline on a plain figure.

## Checks
- `parity-sheets` — G29 summary must be `SummaryCard`, not a `RailCard`; G30 history must be `ActivityCard`.
- `tokens`, `wcag-contrast`.
- By eye: rail stays put while the form scrolls; total is last; tooltips line up with the form's tables.

## Reference
- 3PL › Delivery Orders — order sheet "Quotation summary" + Activity (`threepl/BrokerOrderSheet.tsx`) — the source shell.
- Sales › Quotes — "Quote summary" (`QuoteSheet.tsx`); Sales › Orders (`OrderSheet.tsx`).
- Service Work › Service Orders — "Summary", Payment, Record, Assessment, Visits, Activity (`service/ServiceOrderSheet.tsx`).
- Customer Portal › Orders — "Order summary" (`fill`), "Trip", Activity (`customer-portal/OrderRequestSheet.tsx`); dashboard action sheet (`customer-portal/ActionSheet.tsx`).
