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
| 2026-10-25 | 15 |

**24 misses** · found by Pavan 18 · by Claude 6 · guarded by a script 13 · guard proposed 0 · needs eyes 7 · process rule 4

## Patterns

| Pattern | What it means | Count |
|---|---|---|
| `partial-unify` | Unified some parts of a unit (position, colour) but not all (anatomy, spacing) | 5 |
| `edges` | Didn't look at the edges — last rows, card rims, repeated values, empty states | 4 |
| `one-case` | Verified one case only (one row, one order, one stage, one theme) | 3 |
| `unsafe-edit` | A scripted edit or tool run that damaged files | 3 |
| `stale-rule` | A written rule or old note won over Pavan's newer instruction | 2 |
| `by-block` | Applied to the code block being edited, not to everything the user sees on that screen/stage | 2 |
| `unchecked-output` | A sweep or generated output assumed correct without checking the result | 2 |
| `generic-over-existing` | Reached for a generic component instead of the closest pattern already in the app | 2 |
| `no-guard` | No guard against an impossible value or state | 1 |

## The log

| # | Date | What was missed | Where | Found by | Pattern | Why (my side) | Guard |
|---|---|---|---|---|---|---|---|
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

