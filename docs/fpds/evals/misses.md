# Misses log

<!-- GENERATED from misses.json by `npm run misses` — edit the JSON, not this page. -->

Every time Pavan has to point out something that should already have been right — or Claude breaks something — it is logged here, with why it happened and what guards it. `npm run eval` reads the log, prints the trend, and lists every guard still to build. **The goal: the weekly count falls to 0.**

## How Claude uses this log

1. **The moment a miss is pointed out** (or found), add an entry to `misses.json` — next id, date, what, where, who found it, the pattern, why it happened on my side, and the check that guards it (`built`, `proposed`, `manual` or `process`).
2. **Build the guard when it can be scripted** (`scripts/eval/guards.mjs`) and flip its status to `built`. A proposed guard shows up as an open finding in every eval run until it exists.
3. **Before reporting any visual change, read the patterns below** and check the ones that apply — every stage, blank and filled rows, both themes, the edges.
4. Run `npm run misses` to regenerate this page, then `npm run eval`.

## Trend

| Week of | Misses |
|---|---|
| 2026-10-18 | 9 |
| 2026-10-25 | 28 |
| 2026-11-01 | 7 |
| 2026-11-08 | 3 |

**47 misses** · found by Pavan 37 · by Claude 10 · guarded by a script 19 · guard proposed 0 · needs eyes 23 · process rule 5

## Patterns

| Pattern | What it means | Count |
|---|---|---|
| `partial-unify` | Unified some parts of a unit (position, colour) but not all (anatomy, spacing) | 11 |
| `edges` | Didn't look at the edges — last rows, card rims, repeated values, empty states | 9 |
| `generic-over-existing` | Reached for a generic component instead of the closest pattern already in the app | 8 |
| `one-case` | Verified one case only (one row, one order, one stage, one theme) | 7 |
| `stale-rule` | A written rule or old note won over Pavan's newer instruction | 4 |
| `unsafe-edit` | A scripted edit or tool run that damaged files | 3 |
| `by-block` | Applied to the code block being edited, not to everything the user sees on that screen/stage | 2 |
| `unchecked-output` | A sweep or generated output assumed correct without checking the result | 2 |
| `no-guard` | No guard against an impossible value or state | 1 |

## The log

| # | Date | What was missed | Where | Found by | Pattern | Why (my side) | Guard |
|---|---|---|---|---|---|---|---|
| M-047 | 2026-11-10 | Top of Create Order and the ends of the views row's rule cut off on 3PL Delivery Orders | 3PL Delivery Orders › views row (after the collapse-header fold) | Pavan | `edges` | Wrapped the views bar in an overflow-hidden box for the fold without noticing the bar bleeds 16px past the body inset (-mx-4 -mt-4); verified the fold opened and closed, not that the open state still matched the page before. | `clip-check` · process |
| M-046 | 2026-11-10 | List Settings sheet: no line under the tabs, and 40px between the tabs and their content | 3PL Delivery Orders › Settings sheet | Pavan | `generic-over-existing` | Built the tabs from the bare TabsList instead of copying the tabbed view already in the system (Master Data 360: tabs on a border-b row, content mt-4), and placed tabs and content as two sheet-body children so the 40px section gap fell between them. | `review` · manual |
| M-045 | 2026-11-10 | Dark theme swimlanes invisible — the darker lane colour landed on the board's own ground (#1e222a on #1d222a); the lane hover (#232831) then darkened it back onto the board | Every board (BoardV2) and the list view's lane, dark theme | Pavan | `one-case` | Derived the new lane colour from two tokens and checked dark only against the cards, not against the board ground it sits on; reported dark as fine. | `review` · manual |
| M-044 | 2026-11-03 | Asset journey said the same thing twice ("Received into the fleet at Irving Hub · New unit received"), and the lifeline bars had outlines | Master Data › Assets › Asset 360 › Asset journey | Pavan | `generic-over-existing` | Printed the data's note next to a title built from the same fact, without reading the line as a whole; the log also added audit rows for invoices and moves that already had their own rows. | `repeated-copy` · built |
| M-043 | 2026-11-02 | Asset 360 tables: a Status filter on a value with no column (journey), a blank Status on half the log, a Type filter emptying tabs it does not apply to, and a second date-time format | Master Data › Assets › Asset 360 | Claude | `partial-unify` | Built the global filter and the log from the data, not from what each table shows; did not copy the board card's date-time format. | `manual` · manual |
| M-042 | 2026-11-02 | Documents drawn as an Attached/Pending status pill instead of the documents cell | Master Data › Assets › Asset 360 movement orders | Claude | `generic-over-existing` | Copied the reference's wording instead of the documents unit the app already has (icon + count + breakdown). | `documents-as-status` · built |
| M-041 | 2026-11-02 | Read-only Asset 360 sheet kept the footer rule and a Confirm button with nothing to confirm | Master Data › Assets › Asset 360 | Pavan | `stale-rule` | RecordSheet always drew its footer; the sheet's submit only closed it. | `read-sheet-footer` · built |
| M-040 | 2026-11-02 | Table unit shrank to its three rows — the frame must stay full height with pagination at its foot | Master Data › Assets › Asset 360 | Pavan | `edges` | Sized the table to its rows; the full-unit rule (frame fills, pagination below) was only true of list pages, not written for tables inside sheets. | `full-table-unit` · built |
| M-039 | 2026-11-02 | Asset 360's three views used the small SheetTable under a search/filter bar — no sorting, moving, resizing, column search, row open; rows capped at 25 | Master Data › Assets › Asset 360 | Claude | `generic-over-existing` | Reached for the record sheet's related-records table instead of the list's full table unit, though the views had become filterable lists. | `filterable-table-unit` · built |
| M-038 | 2026-11-02 | Archiving board V2 brought the view bar back; the tools-beside-the-switch layout had been decided | Every list with a table or board (3PL first) | Pavan | `stale-rule` | Treated the tools-beside layout as part of the archived V2 trial instead of a separate decision; the decision was never written down as a rule, so the default (bar) came back. | `view-tools-beside` · manual |
| M-037 | 2026-10-29 | List view kept the Pricing totals bar while the rail's summary card was already on screen | 3PL List view (docked order sheet) | Pavan | `one-case` | The bar was tuned for the slide-in sheet only; docking changed what is on screen and the bar was not re-checked against the 'never both summaries' rule. | `one-summary-on-screen` · manual |
| M-036 | 2026-10-29 | Quoting orders with quotes in said "Vendor not selected"; the step depends on invites sent / quotes in | 3PL board cards + List view rows (Orders lane) | Pavan | `one-case` | One label for every vendor-less order; only the Draft-with-no-invites case was ever looked at. | `pending-step-per-state` · manual |
| M-035 | 2026-10-29 | List view drew the order type as a word pill; the board card shows the coloured initial (CodeDisc) | List view rows (3PL, Sales, Service) | Pavan | `generic-over-existing` | Took the table's Type pill instead of the card the rows were built from; the rows are the card's content, so its parts come with them. | `one-fact-one-form` · manual |
| M-034 | 2026-10-29 | List view picked row used the brand-orange selection tint; the board's cards never use it | 3PL V3 → List view → left pane | Pavan | `generic-over-existing` | Reached for --fp-row-selected (a ticked table row) instead of the card's own states; a picked card is the card pressed, not a ticked row. | `picked-card-uses-card-states` · manual |
| M-033 | 2026-10-29 | Said every dropdown had the tick column; Customer/ShipTo/Order Type/POC (Combobox) still had the tick on the left | Order sheet → every Combobox | Claude | `partial-unify` | Changed CommandItem and the table pickers, then claimed Combobox matched without opening one — it draws its own rows. | `tick-column-every-picker` · manual |
| M-032 | 2026-10-29 | Preferred-time labels stayed stuck to the thicker bar | Order sheet → Delivery window & preferred time | Pavan | `partial-unify` | Thickened the bar and moved the read-only label's offset, but not the pressable label (the one every editable sheet shows); never measured the gap after. | `preferred-label-gap` · manual |
| M-031 | 2026-10-29 | Asked to move the Tags tick next to the text; changed the fee Type ("tax") picker instead | 3PL order sheet → Basic Details → Tags | Pavan | `one-case` | Read "tag" as "tax" and never found a tax picker with a tick to confirm the guess; fixed only the table picker, not the shared dropdown row (CommandItem) every picker uses. | `tick-after-name` · manual |
| M-030 | 2026-10-29 | Load Order Terminal said "No options" for lubes and propane — sample data ran out again | 3PL order sheet → Load Order | Pavan | `edges` | Seeded loading accounts for fuel only; never checked every product (or every picker) had something to pick. Second time in a day after the empty asset tabs. | `no-empty-options` · built |
| M-029 | 2026-10-29 | Tabbed asset dropdown resized and jumped when switching tabs | 3PL order sheet → Delivery Order → Asset picker | Pavan | `edges` | Added tabs without fixing the popover height; a list that grows and shrinks per tab moves the dropdown (and can flip it). | `tabbed-dropdown-fixed-height` · manual |
| M-028 | 2026-10-28 | V1/V1.1 vendor kept the building icon after the handshake change | 3PL board, Versions 1 and 1.1 | Pavan | `partial-unify` | Swapped the vendor icon to a handshake on V2–V4 only; the V1 label helper kept the old icon. | `vendor-icon-every-version` · manual |
| M-027 | 2026-10-28 | Fill contrast slider skipped board fills: lane titles, count bubbles, code discs, dark buttons/fields | Accessibility panel → every board and toolbar | Pavan | `partial-unify` | New fill tokens (lane soft/vivid titles, lane count, pastels, field fill) were added without WCAG/max values or a place in a11y.ts BACKGROUND; never swept the page for fills that stay put at 100%. | `fill-contrast-sweep` · manual |
| M-026 | 2026-10-28 | V4 Completed date styled unlike the Orders schedule line, truncated; Assigned had no date | 3PL board, Version 4 | Pavan | `partial-unify` | Restyled the schedule unit only, not the Completed on unit that plays the same role in later lanes; never checked every lane for a date. | `card-date-every-lane` · manual |
| M-025 | 2026-10-27 | "Pending: Vendor not selected" truncated on the narrower cards | 3PL board, Orders lane | Pavan | `edges` | Narrowed the lanes to 340px without re-checking the longest footer text on every lane. | `card-footer-fit` · manual |
| M-024 | 2026-10-26 | Stray draft autosaved while testing the CP create form | CP Orders | Claude | `unsafe-edit` | Opened a create form to inspect it; autosave made a draft. | `test-hygiene` · process |
| M-023 | 2026-10-26 | Read-only card headers too loud | All rail cards | Pavan | `partial-unify` | Visual weight never compared against the one card that should lead. | `rail-weight` · manual |
| M-022 | 2026-10-26 | Vendor picker built as segmented tabs, not the saved-views tabs | 3PL pricing | Pavan | `generic-over-existing` | Picked a generic component over the closest existing pattern. | `closest-pattern` · process |
| M-021 | 2026-10-26 | Gap between Load order and Pricing — three rounds | 3PL order sheet | Pavan | `one-case` | The gap comes from the rail's height, which changes by stage; tested one stage each time, and the first fix changed something not asked for. | `rail-form-align` · manual |
| M-020 | 2026-10-26 | Read-view heading applied to some units only (Vendor stayed 16px) | 3PL order sheet, Assigned | Pavan | `by-block` | Changed headings inside the read-only block; Vendor lives outside it. | `read-head` · built |
| M-019 | 2026-10-26 | Two highlighted cards on one sheet | CP order sheet, CP action sheet | Pavan | `generic-over-existing` | No rule existed; the highlighted card was reused for any rail card. | `sheets` · built |
| M-018 | 2026-10-26 | "Delivered" shown twice (input + its own figure) | 3PL pricing | Pavan | `edges` | Older pattern never read critically while working on the same unit. | `repeated-value` · manual |
| M-017 | 2026-10-26 | Pricing Total row drew a double stroke | 3PL pricing card | Pavan | `edges` | border-y on the last row stacked on the card rim; never inspected the bottom edge. | `double-stroke` · built |
| M-016 | 2026-10-26 | Duplicate asset names in the picker | Sample data, Bray North Yard | Claude | `edges` | Data issue surfaced only when the list was filtered. | `unique-options` · built |
| M-015 | 2026-10-26 | Multi-select of assets lost on filled rows | 3PL DO asset picker (and 6 other row pickers) | Pavan | `one-case` | The multi-pick rule was applied only to blank rows; my test used a blank row. | `multipick-any-row` · built |
| M-014 | 2026-10-26 | Qty column cramped, 'gal' suffix floating mid-cell | 3PL DO lines table | Pavan | `edges` | Adding the readings columns didn't trigger a re-check of widths. | `column-widths` · manual |
| M-013 | 2026-10-26 | On fulfillment could show 1052% | 3PL + CP lines tables | Pavan | `no-guard` | The 2026-10-22 'not capped' decision was built without asking whether an impossible order should be enterable. | `capGal` · process |
| M-012 | 2026-10-25 | Toolbar spacing 20px between date and view switch vs 12px elsewhere | Every list toolbar | Pavan | `partial-unify` | Never measured the toolbar's gaps as one set. | `toolbar-gaps` · built |
| M-011 | 2026-10-25 | Board view bar detached while the table's was attached | Every board | Pavan | `partial-unify` | Never compared the two units of one family side by side. | `view-bar-attached` · manual |
| M-010 | 2026-10-25 | Whole board file reformatted by Prettier | BrokerBoard.tsx | Claude | `unsafe-edit` | Ran a formatter the repo doesn't use. | `no-formatter` · process |
| M-009 | 2026-10-25 | 1,100 lines of src/index.css deleted by a cleanup script | src/index.css | Claude | `unsafe-edit` | A re.S pattern ending in .* ran to the end of the file; the dev server kept old CSS so the preview looked fine; no git diff --stat. | `css-tokens` · built |
| M-008 | 2026-10-24 | Registry committed (22 MB) with install links that never worked | public/r, docs/fpds/README.md | Claude | `unchecked-output` | Generated install URLs without checking the real remote or whether the repo is public. | `registry-links` · built |
| M-007 | 2026-10-23 | Stage-track jump failed on saved orders | 3PL order sheet | Claude | `one-case` | Wired only the create view's section names; saved orders name them differently. Caught in verification. | `stage-jump` · manual |
| M-006 | 2026-10-23 | Text size widened boxes | Accessibility panel | Pavan | `stale-rule` | Kept the earlier 'widen only if cut' behaviour instead of confirming 'only the text grows'. | `a11y-text-only` · manual |
| M-005 | 2026-10-26 | Left-align sweep left the Qty and Top off headers centred | 3PL DO lines table + 36 headers elsewhere | Pavan | `by-block` | Removed text-right but added no text-left; a bare <th> centres. Checked cells, not headers. | `th-align` · built |
| M-004 | 2026-10-26 | US English sweep missed "fulfilment" | 3PL + CP order sheets, docs | Pavan | `unchecked-output` | The replace list matched `fulfil` with word boundaries, not `fulfilment`; the result was never grepped for leftovers. | `us-spelling` · built |
| M-003 | 2026-10-26 | "Needs action" alert had a different structure from the other alerts | CP Orders banner | Pavan | `partial-unify` | Unified the banner's position and colour, not each alert's anatomy. | `banner-anatomy` · built |
| M-002 | 2026-10-25 | Banner and its pills used opacity fills; banner too blue | AlertBanner | Pavan | `partial-unify` | Reused the soft /10 alpha recipe without checking it against his solid-fill rule from the board lanes. | `alpha-fill` · built |
| M-001 | 2026-10-25 | Alert banner placed above the toolbar in every module | All lists | Pavan | `stale-rule` | Asked to match 3PL, I followed the 2026-10-11 written rule (above the toolbar) instead of the screen he pointed to. | `banner-position` · built |

## Guard statuses

- **built** — A script in `npm run eval` guards it — the id is a check name
- **proposed** — A script could guard it; not built yet (shows as open in the eval)
- **manual** — Needs eyes — the Level 5 rubric / screenshots
- **process** — Not a product defect; guarded by a working rule in memory

