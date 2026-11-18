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
- 2026-11-16 · Yash — FP_Pricing always opens on Pricing › Activity feed: the address (Master Data's `?entity=`) is ignored and cleared on load.
- 2026-11-16 · Yash — Every Pricing table sizes its columns from the widest rendered cell (UX-45, `pricing/fitColumns.ts`), so no value runs over the next column.
- 2026-11-16 · Yash — A change's figures are Ship-tos (customers), Rows (failed, products), Orders repriced, Orders kept their price. Each is a button that opens the rows it counts below (stat tile rule); hover shows "View ship-tos / rows / orders ›" in the banner's dotted-underline voice. Customers are named in Details.
- 2026-11-16 · Yash — Edit schedule's time is the DS select on a half-hour grid (the delivery window's), clock icon leading, not the browser's time input.
- 2026-11-16 · Yash — **Customer & ship-to** (from `pricing-change-log-prototype.html`, tab "Customer & ShipTo"): the change history of one customer, or a few of its ship-tos, over a period — who changed what, where, and how the price moved. Laid out on the 360 layout: pickers (customer, ship-tos cascading from it, period) on top, the figure strip (changes · assignment / inherited, changed by, last change), then the work area — tabs as full lists (Timeline · Where changes happened · Who made the changes · Then vs now) with cards on the right.
- 2026-11-16 · Yash — Insights go in a summary card on the right (the 3PL Quotation / Order summary shell), as a highlight; no AI badge. Together with them, "Worth a review" (edited repeatedly, fees removed, changed outside the UI), each with its reason and items.
- 2026-11-16 · Yash — Assignment vs inherited: Ship-to pricing (inline, bulk) and imports are assignment; Pricing setup and Customer pricing edits are inherited.
- 2026-11-16 · Yash — "Then vs now" is on the page: each ship-to × product's price at the start of the period vs today, biggest moves first, with why it moved.
- 2026-11-16 · Yash — Customer & ship-to, built: Filters (Customer, Ship-to cascading from it) and the date window (default last 3 months) on top; opens on the busiest customer; with none chosen, "Choose a customer". Figures: Changes (assignment · inherited), Ship-tos changed, Changed by, Last change — each opens its rows. Tabs: Timeline (one row per change; "N of M ship-tos" when it covers several; a row opens the change) · Where changes happened (per ship-to; one ship-to → What changed, per entity; a ship-to row narrows the page to it) · Who made the changes · Then vs now. Insights summary card on the right: Edited repeatedly · Fees removed · Changed outside the pricing screens.
- 2026-11-16 · Yash — Customer & ship-to, second try as a **dashboard** (routed): no pickers on top — it opens on every customer; pressing a customer in "Where changes happened" narrows the page to it, then a ship-to; the scope shows as chips. Stat tiles (Changes · Ship-tos changed · Changed by · Last change), the Insights card three across, Where and Who as ranked bars, and Timeline · Then vs now as full lists in one panel. Every number opens what it counts. The 360 version is kept unrouted in `CustomerShipto360.tsx` to compare.
- 2026-11-16 · Yash — Insights are short: three figures (Edited 3+ times · Fees removed · Outside pricing screens), each a count of changes with one fact under it; pressing one opens the Timeline filtered to those changes.
- 2026-11-16 · Yash — Customer & ship-to dashboard, round 2: Customer and Ship-to pickers on the scope row ("All customers" / "All ship-tos" by default; a Where bar sets them). Timeline and Then vs now are short tables on the card, as Sales › Dashboard (ten rows); the card's ↗ opens the full list in a sheet (search, Filters, pages) — the Customer Portal Schedule card pattern. Insights, people and entities open that sheet already filtered.
- 2026-11-16 · Yash — The date window sits level with the page title, through AppShell's `headerAction` slot (`headerSlot.tsx`). FPDS puts a dashboard's date on its scope row — **to raise with Pavan**.
- 2026-11-16 · Yash — A change reads by name: a margin made from a typed value is "$0.21/gal"; several replaced values read "Fleet Contract Margin +3 more → $0.21/gal" (was "4 values → $0.21").
- 2026-11-16 · Yash — Customer & ship-to dashboard, round 3: Customer and Ship-to are multi-select pickers (DS multi-select list) on the right with the date window; "All …" stands alone; ship-tos follow the customers picked. One Timeline on the page — no sheets: Changes scrolls to it; Ship-tos changed → Where; Changed by → Who; an insight, person or entity → the Timeline with that filter as a chip. The section scrolls into view and blinks once (`attend`). Last change still opens the change. Timeline and Then vs now are the Sales dashboard table under search + Filters, with pages. Where and Who show the top 5.
- 2026-11-16 · Yash — Customer & ship-to, round 4: the scope is the Filters panel (Customer, Ship-to — cascading) beside the date, with Activity feed's chip shelf under the title ("Customer 2 ×"); the multi-select pickers are gone. Timeline and Then vs now carry search and Filters on the right of the card title. Where and Who show the top 5 with "View N others" to grow the card ("Show top 5" folds it); every percentage is a share of the whole (BarList `total`, shared, opt-in).
- 2026-11-16 · Yash — On Customer & ship-to, the Timeline and Then vs now filters drop Customer and Ship-to — those are the page's own scope, set once at the top.
- 2026-11-16 · Yash — Sample data has seven people making changes (adds Deepika Jain, Ankit Rao).
- 2026-11-16 · Yash — Every Pricing filter starts Customer · Ship-to · Product (searchable).
- 2026-11-16 · Yash — In a change, rows that already show everything (Ship-tos affected, Orders, Edits) open nothing — no read drawer repeating them.
- 2026-11-16 · Yash — A list of names in a change shows the first and a "+N" pill; hover or press lists them all (Service Work's overflow chip).
- 2026-11-16 · Yash — Sample data: frac pads are named by lease ("Hayes Unit 2H"), and every ship-to name is unique.
- 2026-11-16 · Yash — Delivered Price Impact (the prototype's Phase 2 tab) is out.
- 2026-11-16 · Yash — **Order price trace** (from the prototype's "Order Price Trace" tab): a List page of priced orders — search, Filters (Customer · Ship-to · Product first, Status, Changed after order, Rate type, Market), Group by (customer, ship-to, product, delivery day, status), the delivery-date window, saved views, Export — so one customer's or ship-to's orders are a filter away. Banner: orders priced with a change made after the order was placed. A row opens the trace in a record sheet: figures (gallons, $/gal, total, changed after order), one row per component (applied · how it was calculated · $/gal · amount) with its change history one layer down, the total, and Details on the right. A history row opens the change over the trace.
- 2026-11-16 · Yash — Each change in an order's history is tagged against the order: Before order · After order placed · applied · After delivery · not applied (prototype: "After invoice").
- 2026-11-16 · Yash — Base price history follows the prototype: rate type and market changes only, not daily rack moves.
- 2026-11-16 · Yash — The trace table has fixed columns, so opening a component's history never moves a column; "How it was calculated" takes the room left.
- 2026-11-16 · Yash — Right-column cards follow the record sheets: every card titled with its icon; the record's own facts read label · value on one line (Record, Pricing); the records it belongs to are "Associated records", label above, a muted detail after "·" (3PL's order sheet). The change sheet's Details became Record + Associated records too.
- 2026-11-16 · Yash — The trace table is five columns: what was applied and how it was calculated share one, the name over its working; a change's stamp in the history is one line ("Nov 10, 2:15 PM").
- 2026-11-16 · Yash — A change's figures say what they count: Customers · Ship-tos · Products (each lists its names in the "+N" card on a press) · Prices changed (one price = a ship-to × product; failed, average move) · Orders (repriced · kept). "Rows" is gone from every screen — it is "prices"; the change's first tab is "Prices changed". Associated records left the change sheet (the figures name everything).
- 2026-11-16 · Yash — The trace's figures take the price apart: Total (gallons · $/gal) · Base price · Margin (with adders and discount; share of the price) · Fees & taxes (share of the price); each opens its rows in the table. "Changed after order" is no longer a figure (zero on most orders): it is a caution pill beside the status, only when it happened, and opens those rows.
- 2026-11-16 · Yash — In the trace, Associated records (customer, ship-to, product) is the first card; the header keeps only the invoice.
- 2026-11-16 · Yash — Sample data: seven bulk changes in ten span three to six customers; the story changes reach a region's accounts (Louisiana, Texas, Gulf Coast). Single-row edits and customer pricing stay on one account, as they are.
- 2026-11-16 · Yash — Demo: v3 published to https://fp-mockups.vercel.app/change-history (the fp-mockups site, `Pricing/site`, gallery password; v1, v2 kept). Script in `DEMO.md`.
- 2026-11-16 · Yash — The collapsed sidebar rail scrolls instead of squeezing its icons (shared `ModuleSidebar`, `shrink-0`).
- 2026-11-16 · Yash — Activity feed rows carry a ⋯ at the row's end (UX-46), shown on hover and focus (IX-3): Retry failed prices · Edit schedule · Cancel schedule · Undo change (latest only) · Export — the change sheet's acts, asking the same questions (shared `ChangeDialogs`). Shared `ListTable` takes an opt-in `rowMenu`.
- 2026-11-16 · Yash — Insights are read-only, in the prototype's words: Changed most (N times · the entity — more than anything else here) · Fees removed (mostly by … — check these were intended) · Outside the UI (import or system sync). The Timeline's insight filters are gone. The order trace's figures are read-only too.
- 2026-11-16 · Yash — **Then vs now removed** from Customer & ship-to (dashboard and the kept 360 version) and from the demo script; supersedes the earlier Then vs now decisions above.
- 2026-11-16 · Yash — Information page view stays FPDS's default (side sheet, IX-92). For demos, Full page is chosen once in the list's Settings gear → Information page view (remembered per browser) — step 0 of `DEMO.md`.
- 2026-11-17 · Yash — **Pricing configuration › Ship-to and Customer built** from v2 (`reference/change-history-v2.html`). Ship-to: one row per ship-to × product, the production table's columns (Ship-to, Customer, Fee, Product, Category, Market, Rate type, Base price, Margin, Tax, Adders, Effective price, Last delivery, Hub, State, County, Applied pricing); v2's Last change column dropped to match. Customer: v2's columns less Last change. First party only — the Mode switch (first / third party) comes later.
- 2026-11-17 · Yash — Per-gallon: "($/gal)" in the headers instead of the production note "All values are calculated on a per-gallon basis" (FPDS UX-96: no "Note: …").
- 2026-11-17 · Yash — Cells are read-only for now; a row opens its pricing sheet. Inline cell edits and bulk (Review changes) come with bulk, later. Pricing setup not built.
- 2026-11-17 · Yash — The pricing sheet (configure and edit) autosaves (UV interactions §1): an unconfigured record keeps its picks as a draft and the footer's **Configure pricing** sets it up ("Configured" change); a configured record has no footer, and every save of one open sheet is ONE change in the Change log (Made via Ship-to pricing · Inline, or Customer pricing). Right column: Price summary and Activity; the History icon (and the row ⋯) opens the record's log history, whose rows open the change.
- 2026-11-17 · Yash — **Customer & ship-to, round 5 (team feedback).** Scope is two pickers outside the cards (Customer, Ship-to; search, multi-select), no Filters panel. Insights come in three versions on a switch (Compact with View all → side sheet · Descriptive lines that grow the card · Grouped by Needs a look / Activity / Patterns), ten insights, read-only — the PMs pick one. Where and Who drill inside their own card (customers → ship-tos → named items; people → customers → ship-tos) with a breadcrumb back; a press never changes the scope or the Timeline. The Timeline is a timeline (days, time, change, how it was made, who, "N ship-tos" listing them), no row opens, "Show more" instead of pages.
- 2026-11-18 · Yash — Activity feed: an **Assignment** column (Assigned · Inherited) after Made via, with its filter and Group by. Inherited = made on Customer pricing and flowing down; everything else, Pricing setup included, is Assigned — the same reading as the feed's summary (one helper, `assignmentOf`).
- Open (Yash) — Customer & ship-to still counts Pricing setup changes as inherited (`customerShipto.ts`, the 2026-11-16 decision above); the Activity feed counts them as assigned. Pick one.
- Open (PM) — Which Insights version to keep.
- Open (Yash) — v2's "Reset to customer pricing" on a ship-to's pricing is not built yet.
- Open (PM) — Which orders: delivered and invoiced only for now; open orders ("will price as") to ask the PM.
- Open (PM) — Pricing moment: assumed at delivery; to confirm with the PM.
- Open (PM) — Actions: trace only for now. Later phase: fold in the live app's Order Pricing Insights actions (Completed orders · Unpriced products · Configuration gaps; Fix missing fees, Configure missing products, Holiday & weekend fees).
- Open — Freight has four pages in the live app (Customer Freight, Contract Freight Rate, Standard Freight Rate, Origin Group). The shared sidebar nests two levels, so Freight is one entry for now.

## 7. Working agreements (fixed — see `CLAUDE.md`)
- Every FPDS and Unified View rule applies; rules are not changed on this branch.
- Reuse the shared list, record sheet, right column and Activity card.
- Build only what is asked; no explanatory text on screen; sentence case.
- Side sheets autosave; tokens only.
- Check in the browser and run `npm run eval` and `npm run check:rules` before handing back.
