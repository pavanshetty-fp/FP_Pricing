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
- 2026-11-16 · Yash — The Pricing menu follows the live Pricing app: Dashboard · Pricing configuration (Customer, Ship-to) · Pricing setup (Margin, Fee, Tax, Rate type, Market, Adders, Driver rate, Driver demurrage, Freight) · Today's pricing · Change history · Hub-based pricing · Order pricing insights · Price notices.
- 2026-11-16 · Yash — Change history is its own page in the menu, directly under Today's pricing.
- 2026-11-16 · Yash — Pages are built one at a time, on request; every menu entry shows "Not built yet" until then.
- Open — Freight has four pages in the live app (Customer Freight, Contract Freight Rate, Standard Freight Rate, Origin Group). The shared sidebar nests two levels, so Freight is one entry for now.

## 7. Working agreements (fixed — see `CLAUDE.md`)
- Every FPDS and Unified View rule applies; rules are not changed on this branch.
- Reuse the shared list, record sheet, right column and Activity card.
- Build only what is asked; no explanatory text on screen; sentence case.
- Side sheets autosave; tokens only.
- Check in the browser and run `npm run eval` and `npm run check:rules` before handing back.
