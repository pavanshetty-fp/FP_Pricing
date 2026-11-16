# Pricing — PRD

Owner: (colleague) · Reviewer: Pavan · Repo: FP_Pricing

## 1. Problem
_To be written._

## 2. Users
_To be written._

## 3. Scope
_To be written._

## 4. Screens
_To be written._

## 5. Flows
_To be written._

## 6. Decisions
_Record each decision with its date and who made it._

- 2026-11-16 · Yash — Work happens on the local branch `bulk+audit-log-stream`; nothing is pushed until Yash says so.
- 2026-11-16 · Yash — The Pricing menu follows the live Pricing app: Dashboard · Pricing configuration (Customer, Ship-to) · Pricing setup (Margin, Fee, Tax, Rate type, Market, Adders, Driver rate, Driver demurrage, Freight) · Today's pricing · Change log · Hub-based pricing · Order pricing insights · Price notices.
- 2026-11-16 · Yash — Change history (now Change log) is its own page in the menu, directly under Today's pricing.
- 2026-11-16 · Yash — Pages are built one at a time, on request; every menu entry shows "Not built yet" until then.
- 2026-11-16 · Yash — Change history is renamed **Change log**, with three pages: Activity feed · Customer & ship-to · Order price trace. ("Customer & Ship-to" was asked for; UX-167 spells the term lower case mid-label, so it reads "Customer & ship-to".)
- 2026-11-16 · Yash — **Activity feed** is the old prototype's Change history: every pricing change, newest first. Built as the List page (like Customers, plus a date window), not the standard list, because it keeps the period and Group by. Columns, facets and Group by dimensions are the old page's. The date window defaults to the last 7 days; scheduled changes show whatever the window.
- 2026-11-16 · Yash — The needs-attention strip is the alert banner: rows that failed, scheduled changes on the same rows, changes scheduled today. Each title filters the list to that status. The old stat strip is not carried over (the Pricing Dashboard is its place).
- 2026-11-16 · Yash — A row opens the change on the 360 layout (Master Data › Ship-to 360): figures on top, tabs Ship-tos affected · Edits (when more than one) · Orders, a Details card on the right. Lists have no row menu, so the old row actions live on the sheet: Retry failed rows and Edit schedule are the footer's next act; Undo (latest change only), Cancel schedule and Export are in ⋯. Read-only otherwise, so no footer.
- 2026-11-16 · Yash — Edit schedule moves the day and time only. Changing what a scheduled change does waits for the Review changes flow.
- 2026-11-16 · Yash — The change log is one shared store (`pricing/changeLogStore.ts`) so the other Change log pages and the bulk edit read and write the same records. The prototype's clock is 10:40 AM today.
- 2026-11-16 · Yash — Pricing opens on Change log › Activity feed while it is being built (Dashboard stays first in the menu).
- 2026-11-16 · Yash — A change with failed rows opens on them: Ship-tos affected filtered to Outcome: Failed (the chip clears it), failed rows first, the reason under "Failed". Outcome sits after Product.
- 2026-11-16 · Yash — Export changes carries the Overview (ship-tos, customers, products) and the changes by status, as Sales › Orders does.
- Open — Freight has four pages in the live app (Customer Freight, Contract Freight Rate, Standard Freight Rate, Origin Group). The shared sidebar nests two levels, so Freight is one entry for now.

## 7. Working agreements (fixed — see `CLAUDE.md`)
- Every FPDS and Unified View rule applies; rules are not changed on this branch.
- Reuse the shared list, record sheet, right column and Activity card.
- Build only what is asked; no explanatory text on screen; sentence case.
- Side sheets autosave; tokens only.
- Check in the browser and run `npm run eval` and `npm run check:rules` before handing back.
