# Delivery orders

> **Load this when:** working on a fuel / delivery order (DO) anywhere — the 3PL Delivery Orders board or list, the order sheet (create or detail), order statuses, lanes, the pending strip, lines table (asset, product, qty, top off), delivery window, load orders on an order, BOL / tickets / attachments, urgent, signature, recurring orders and rules, recommendations, or how Sales / Customer Portal orders differ. Keywords: Draft, Quoting, Assigned, Completed, Review, Verified, Synced, Partially Synced, Blocked, Canceled, "Create Order", "Finalize vendor", "Create rule".
> **Not for:** finding and inviting vendors, quotes, pricing columns, vendor directory (→ `3pl-brokerage.md`); terminals, suppliers, loading accounts as such (→ `fuel-supply-and-sourcing.md`); trucks and drivers (→ `fleet-trucks-and-routes.md`); customers and ship-tos (→ `customers-and-sites.md`); tanks and monitors (→ `assets-tanks-and-leases.md`).
> **Sources:** `prototypes/unified-view/threepl/README.md` (esp. "The lane walk (2026-10-06)" and the dated notes at the end), `threepl/orders.ts`, `threepl/BrokerOrdersScreen.tsx` (`BOARD_LANES`), `threepl/recurring*.ts` headers, `docs/unified-view/3pl/creation.md`, `docs/order-sheet-v1-retired-2026-09-15.md`, `prototypes/unified-view/README.md` + `HANDOFF.md`, memory notes `project_3pl*`, `project_3pl_recurring`, `feedback_delivery_timeline`, `feedback_top_off_after_qty`, `feedback_multi_pick_rows`, `project_board_versions`, `project_customer_portal`. **Last updated:** 2026-11-06.

## In one paragraph

A delivery order is one planned fuel drop to one customer ship-to: which tanks (assets), which products, how much (or "top off"), on which date and inside which time window. In the 3PL (brokerage) module the tenant does not haul the fuel — it hands the order to an outside vendor (carrier), so the order's life is mostly about getting a vendor finalized, then the delivery done, then the numbers checked and synced to accounting. Status is a stored field that only changes through workflow acts (no status picker). The board shows lanes Orders → Assigned → Completed → Review → Verified → Synced, with Canceled and Blocked set apart. Recurring deliveries are made by rules that cut ordinary Draft orders ahead of time; three recurring models were built side by side, and only V1.1 (the lane-first "Create rule" programme) is being worked on.

## Glossary

| Term | Meaning |
|---|---|
| Delivery Order (DO) | A fuel/product order to one ship-to. Number prefix `D-`. |
| Asset Order | Moving a rental asset (was "Movement Order"). Prefix `M-`. One asset, no quantity, priced as Fee + Tax. Four routes. |
| Route | Asset order direction: Yard → Ship-to (Delivery), Ship-to → Yard (Pickup), Ship-to → Ship-to (Transfer), Yard → Yard (Relocate). |
| Order kind | List tab: All / Regular / Recurring / Movement. Not the same as Order type. |
| Order type | Field on the order: Core · Delivery · Emergency · Extraction (since 2026-10-29). Asset orders are always "Asset Movement". |
| Ship-to | The customer site the fuel goes to. One per order. |
| Line | One row of the order: asset + product + quantity or top-off. |
| Top off | Fill the tank instead of a stated quantity. A top-off line has no quantity — the two are mutually exclusive. |
| Delivery window | Start/end time on the planned date; may hold preferred times. |
| Load order | Optional: the tenant buys the product itself (loading account, terminal, supplier) and the vendor only hauls it. |
| Finalize vendor | The act of choosing the one vendor who will run the order. Leaves the vendor "Finalized". "Award" is retired. |
| Assigned | A vendor is finalized and holds the order. (Old name: "Accepted".) |
| Quoting | Status: at least one quote is in, nobody finalized yet. (Old name: "Assigned".) |
| Verified | Approved, waiting for accounting to pull it. (Old: "Accounting Sync Ready".) |
| Synced / Partially Synced | Accounting has it / the sync failed (an error, not progress). (Old: "Accounting Synced" / "Partial Accounting Synced".) |
| Review | Optional, reversible hold after delivery: "these numbers look off". |
| Blocked | Order held for a customer credit issue. |
| Pending strip | The line above the sheet footer naming, one at a time, what stops the next act. |
| Rule / programme | A recurring arrangement that cuts orders on its dates. "R-" (V1) or "P-" (V1.1) numbers. |
| Lead days | How far ahead a rule cuts orders. V1.1: 7 days (`LEAD_DAYS`). |

## How it works

### What an order holds

- Taken from FleetPanda's 3PL spec (3PL-102 doc, §5.3): customer + ship-to, planned date with a start/end window, PO number, order type, urgent flag, signature-on-delivery, hub, asset/product lines with per-line top-off, POC, delivery instructions.
- Added later: job type, second contact (a list), internal note, winter blend, partner-email switch, tags, BOL number (beside PO number), the ship-to's ERP ID shown at the head of the ship-to read-out.
- Planned delivery date defaults to **tomorrow**; calendar only.
- POC (2026-10-29): one optional picker of the ship-to's POCs ("No POC" allowed), Add POC creates one on the ship-to. Changing ship-to drops a POC who is not at the new one. Same unit on 3PL delivery and asset orders, Sales fuel and asset orders, and the Customer Portal (locked once sent).
- Customers and ship-tos are the same records as Dispatch (spec: synced almost in real time).
- The service line (Fuel / Lubricants / Propane) follows the product, always.

### Order types and kinds

- Kind tabs: All · Regular · Recurring · Movement (spec §5.2).
- Order type history: Core/Emergency/Delivery/Extraction/Pump Out/Transport → four "what is moved" types (2026-10-27) → **back to Core · Delivery · Emergency · Extraction** (2026-10-29, current).
- Create menu: **Delivery Order · Asset Order**. Asset Order asks for the route first (Delivery · Pickup · Transfer · Relocate), each opening its own from → to form.
- Asset order rules: the assets offered are always the origin's (what is in that yard, or on rent at that site); a route cannot end where it started; the order stores `from` and `to`, not a yard.

### Status vocabulary (locked 2026-09-16)

Rename map — be careful with find/replace:

| Old | Now |
|---|---|
| Assigned | **Quoting** |
| Accepted | **Assigned** |
| Accounting Sync Ready | **Verified** |
| Partial Accounting Synced | **Partially Synced** |
| Accounting Synced | **Synced** |

- Sales has its own, unrelated `Assigned` (driver assigned).
- Statuses in model order: Draft · Blocked · Quoting · Assigned · Completed · Review · Verified · Partially Synced · Synced · Canceled.
- "Delivered" statuses (the run has happened): Completed, Review, Verified, Partially Synced, Synced. `completedAt` is stamped the first time an order reaches one.
- Filter list is longer than the lanes: adds Overdue (a derived condition), "Created / Draft", Partially Synced, Canceled, Blocked.
- A status is its word — no dot beside it.

### Lifecycle — how an order moves (current, after the 2026-10-06 lane walk)

1. **Creating.** Nothing is saved until **Create Order**. Closing with anything typed asks "Discard this order?" (delivery and asset orders alike). Create needs **customer + ship-to and a product line** only. A created order has no Create button and autosaves from then on.
2. **Inviting vendors** (hand-off to `3pl-brokerage.md`). Invitations are sent from the order's Vendor unit. Since 2026-10-20 the Vendor section also shows on the create sheet, and picks/sends carry into the created order.
3. **Quotes arrive → Quoting.** Any quote — sent by the vendor or added on its behalf, even $0 — moves the order to Quoting ("Moved to Quoting" toast).
4. **Finalize vendor.** One vendor at a time; once one is finalized every other Finalize button goes. **Cancel finalization** is the way back (Quoting only).
5. **Move to Assigned.** Disabled until a vendor is finalized. "Acknowledge on their behalf" for one vendor does all three at once: finalize, add its quote, move to Assigned ("Added by dispatcher"). Acknowledging several only records acceptance. **Assigned always means a vendor is finalized** (enforced by `assertConsistent`). On Assigned the act is **Change vendor**.
6. **Delivery done → Completed.** "Review & mark completed" appears on Assigned once the window has passed. At Completed, delivered quantity becomes a field (Pricing "Delivered" row, pencil to adjust).
7. **After delivery.** Completed → (optional) **Review** → **Verified** (sync-ready queue) → **Synced**. Only accounting marks Synced. **Partially Synced** is an error carrying the back office's message; ways out: Retry sync (back to Verified) · Send to review · Mark synced.
8. **Exits.** **Canceled** — terminal; a canceled order is a snapshot of where it stopped. **Blocked** — credit hold (seed reasons: "Over credit limit", "Credit status unapproved"); the card shows the reason + Review.

- No drag-and-drop between lanes: a stage change is a workflow act with side effects (vendor emails, accounting push), not a reorder.
- An order sheet has no status control; the sheet only offers the legal next act, and status follows.
- "Estimated" stays on the pricing Total row until Completed.

### Board lanes (code: `BOARD_LANES`, current)

| Lane | Holds | Waiting on |
|---|---|---|
| **Orders** | Draft + Quoting | a vendor to be finalized. Card's pending step: no invite sent → "Vendor not selected" + **Select vendor**; sent, no price → "Awaiting quotation — N invited" (grey wait, no button); priced, none finalized → "Quotation not finalized" + **Finalize vendor**. All open the sheet at the Vendor unit. |
| **Assigned** | Assigned | the delivery; the vendor and driver are named on the card. |
| **Completed** | Completed | invoice / checking ("Request invoice", "Invoice requested", "Review invoice"). |
| **Review** | Review | someone checking numbers before accounting. |
| **Verified** | Verified | accounting to pull it ("Awaiting accounting"). |
| **Synced** | Synced + Partially Synced | nothing; Partially Synced shows a red badge + sync error + Review. |
| ┃ **Canceled** | Canceled | — (set apart by a rule) |
| **Blocked** | Blocked | credit to clear (reason + Review on card). |

- 3PL opens on the Orders lane. A lane takes the colour of the status it ends on.
- Board design: one board (`BoardV2`, "V1") in every module since 2026-11-02; earlier versions archived (see `project_board_versions`).
- A new order defaults to tomorrow, so the board's date range **widens** to include it (never jumps).
- Card schedule = planned date + one time ("Nov 2, 2026 · 8:00 AM"); from Completed on, "Completed on" date + time. A recurring order's card shows its scheduled date; the cadence is on the Recurring pill's hover.
- Driver unit on cards once a vendor holds the order.

### The order sheet

- **Create and detail are one sheet** (`BrokerOrderSheet`); the create sheet is the reference every 3PL create surface is measured against.
- Detail: a stage track pinned at the top (first step reads "Orders"); a right rail with Quotation summary (or an **Invitations** card in the Orders lane until a quote arrives), Activity, Notes (Delivery Instructions + Internal Note), POC details.
- Advancing a stage scrolls the sheet to where that stage's work lives (Quoting → vendor table; Assigned → top). Never on open.
- **Mandatory / pending strip** (shared `PendingStrip`): above the footer, one item at a time with a counter; each item is worded as the act that clears it and pressing it scrolls to and blinks the section (customer → Basic Details, lines → Delivery Order, partners → Vendor). With nothing left it says "All mandatory steps completed". It shows at every stage, not only Draft — past Draft it carries the next act's reason (e.g. "Finalize a vendor in the table above").
- Assigned: Urgent and Signature locked. No load order → banner "Load order is being handled by the vendor." and no Load order unit.
- Completed onwards: the Vendor unit goes (Pricing names the vendor); footer offers **Attach supporting images** and **Attach documents**; **Additional Details** appears only once something is attached.
- Spare acts behind ···: Duplicate order, Download tickets, Cancel, Delete.
- A draft being filled writes no history; past Draft every change earns an audit line.

### Lines table (Delivery Order table)

- Row = asset + product + quantity or top-off. Asset is **not mandatory** (a line can name a product and quantity with no asset on file).
- **3PL DO column order (2026-10-26, 3PL only):** Asset · Product · Current level · Days to empty · On fulfillment · Qty · **Top off last**.
- **Every other module (2026-10-20 final):** … · Top off · **Qty last** (Customer Portal, Sales, Service, recurring rule forms).
- Top off: header select-all; a top-off line carries no quantity.
- Qty unit sits in the cell: Fuel = gal only; Bulk Lubricants = gal / mL / oz; Packaged Products = EA / LB / QT / Tube / gal / mL / oz. Totals print one figure per unit.
- Quantity is **capped at the tank's room** on the planned day (never past 100%); typing past it shows a note. Qty placeholder = suggested gallons from tank-monitor readings (invented data; ~90% of 3PL site tanks monitored).
- On fulfillment card: "The tank level post delivery will be X%, based on your daily usage", with a breakdown (Current level · Requested · Days to deliver · On fulfillment).
- **Asset picker:** tabs Fuel · Bulk Lubricants · Packaged Products; under Fuel, radios All · Tank Monitors · No Tank Monitors; "No monitor" pill only on unmonitored assets. Category comes from the asset's product line.
- **Multi-pick makes rows:** the asset picker takes several (checkbox + Apply); first pick fills the row, each other pick becomes a new row. Works from a filled row too (2026-10-26). Applies to every row-adding table in every module.
- Two lines may share an asset name (e.g. one tank, two products) — see open questions.

### Delivery window and preferred time

- Every window field in every module uses the shared **delivery timeline**: window range on a track, preferred-time bars (drag / type / no overlap / "+" to add). Decided 2026-10-20 ("all modules and service work").
- Exceptions: Sales has no window; the technician mobile app keeps the old slider.
- The window is what most distinguishes a brokered order from a first-party one (README).

### Load order on an order

- Optional, per product, behind an Add action; rows can be set aside without deleting.
- With a load order the product is the tenant's: the vendor's price, tax and fee on that product are struck (shown as "On the load order" / "Billed to the customer"); the vendor's **margin and service charge survive** (they still haul it).
- Loading accounts are alphanumeric (e.g. GKM-50431); every product loads at ≥2 terminals on ≥3 accounts (sample data). Sourcing detail → `fuel-supply-and-sourcing.md`.

### Documents and attachments

- BOL number is a field on the order (create sheet, searchable, hidden table column).
- After Completed: attach supporting images and documents; document types **BOL · Ticket · Invoice · Other**. No seeded BOL/ticket.
- Documents are always a table (even empty). Old Public/Private visibility was removed — every file on an order is the order's.
- **POD:** not modelled in 3PL. In the Customer Portal, POD is an open question for the team and "no POD" is on the attention list (Anirudh review, 2026-10-17).
- Invoices are handled offline (out of scope inside 3PL), though cards show Request / Requested / Review invoice.

### Urgent and signature

- Urgent: order flag, shown in the sheet header (Order # · Urgent · save state). A red badge on the card **until delivered**; after that it is dropped (nobody can hurry a finished job). Locked from Assigned.
- Signature on delivery: order flag; locked from Assigned. On a recurring rule it is a property of every delivery (bottom bar), not a rule question.

### Recurring orders

**On the order sheet:** a Recurring section ("Add Recurring Order" → shared frequency picker; minus removes) on every order that can repeat. Service orders don't repeat. "Create Order" on the Recurring screen goes to the Delivery Orders create sheet (V1/V2).

**Three models, built side by side:**

| | V1 — the rule | V1.1 — lane-first programme | V2 — parent/child |
|---|---|---|---|
| Status | Archived (behind "Archive") | **The one being worked on** (Pavan, 2026-09-23) | Archived; this is how the product works today (engineering doc 2026-09-18) |
| Schedule lives on | A rule (`R-…`), not an order | A programme (`P-…`), partner first | The first order (`D-…`) |
| Deliveries | All generated; calendar a year deep with "Not created yet" dates | Cut as Draft orders, today + 7 days | Children of the parent; rolling one month; parent's own date skipped |
| Change partner/products | Versions the rule (not modelled) | Edit allowed only while it has made no order | Clones a replacement recurring order |

**Shared rules (engine doc, Aayush, 2026-09-18 — the behavior to match):** a generated order is a full, independent order · changes flow downward only · **nothing generates until a vendor is locked** · schedule edits move orders · series statuses Upcoming · Active · Paused · Canceled · Ended · Expired. A silent series must say why. First-party rules (no partner needed) generate from their start date (V1/V2 quick filter: All · First party · Third party).

**V1.1 — the programme:**
- Partner first: only ship-tos in the partner's service area are offered. One rule, one partner. Target = a ship-to (one order per rule · ship-to · date; tanks are lines inside it).
- Cuts real Draft orders with the Recurring badge into the Orders lane, from today to `LEAD_DAYS` = 7 ahead; never for past dates; never twice for the same rule · ship-to · date, so broker edits stand.
- Four decisions (2026-09-21): sites added by hand · **frequency is constitutive** (a different day = a different rule) · an edit never rewrites delivered work (show impact, confirm, apply forward) · a rule can be partly live — **the partner quotes the lane** (priced 8 of 12 → 8 run, 4 wait).
- A lane that falls out of the partner's area is greyed: "Out of area" beats a stale "Accepted".
- Create rule = one scrolling form, three sections: **1 Rule and frequency** (name, job type, frequency) · **2 Partners and products** (partners, products, winter blend per product, optional "+ Create load order" by loading account) · **3 Ship-tos and assets** (one tab per customer + ship-to; each tab has a delivery window and the lines table Asset · Product · [Loading account · Supplier] · Top off · Qty). "Create rule" is live when nothing is pending.
- Frequency: **Days** (weekday badges, Daily, Repeat weekly/monthly/yearly, Custom cycle of 2–4 weeks with a day row per week) or **Date** (days 1–31, repeat every 1/2/3/6 months). End date optional; no end is the default.
- **Clashes:** another rule at the same ship-to clashes on a day both run **only** if it fills the same asset or its window overlaps (same product into a different tank is not a clash). 16-week look-ahead, shown as a Conflicts table. Resolve: don't run this rule on those days (this ship-to only), or stop the other rule on those days (that customer + ship-to only). Skips are honored by the generator — this bends "frequency is constitutive" (Pavan's call).
- **Recommendations** (2026-10-07): rule-level, from the last 6 months of orders (sample data until history exists). Each = product + frequency + every ship-to it fits, grouped by customer, with vendors (fewest partners reaching every ship-to), suppliers and load order. "Review and Create Rule" fills step 1 and one step-3 tab per ship-to. In the form, Apply fills only the frequency. Never "or" in a recommendation — an or is a separate rule.
- List money columns are "Estimated" (Partner Price · Customer Price · Margin) — a rule only makes orders, which still go through every lane.

### How order flows differ by module

| | 3PL (brokerage) | Sales / first party | Customer Portal |
|---|---|---|---|
| Who delivers | Outside vendor | The tenant's own fleet | Tenant (customer raises the order) |
| Status | Stored, moved by workflow acts | **Derived from driver**: driver ⇒ Assigned (open question: contradicts the source app) | Draft → Unassigned (sent, no driver) → Scheduled (driver assigned) → Out for delivery · Partial delivery · Delivered · Invoiced · Paid · Cancelled |
| Quotes / vendors | Yes (see `3pl-brokerage.md`) | Sales has its own Quotes screen | No quotes; pricing agreed separately; tenant takes every order |
| Numbering | `D-` / `M-` | — | `ORD-…` (the customer's order IS the tenant's order, 2026-10-21) |
| Window | Shared delivery timeline | No window | Shared delivery timeline |
| Lines order | … Qty · Top off last | … Top off · Qty last | … Top off · Qty last; Top off never pre-ticked; starting Qty = room left |
| Recurring | Rules (V1.1) | Recurring section on order | Checkbox/section in the create form (3PL pattern) |

- CP change/cancellation requests are not statuses — the order keeps Unassigned/Scheduled with an "Awaiting confirmation / cancellation" pill (2026-10-22). Linking CP orders to 3PL DOs is not done (ask).
- Only the Customer Portal is customer-facing; 3PL, Sales, Service are tenant-facing.

## Decisions already made

- 2026-09-15 — Order sheet V1 (two steps, Final Calculations rail, Accept quote, Push to dispatch) retired; V2 one page, autosave, single next act in the footer. (Pavan)
- 2026-09-16 — Status vocabulary renamed (table above). (Pavan)
- 2026-09-17 — Asset orders = four routes; urgent drops after delivery; "Completed on" is its own card field. (Pavan)
- 2026-09-21 — V1.1 programme added beside V1/V2; four decisions. (Pavan)
- 2026-09-22 — First lane named "Orders" (status stays Draft); pending strip at every stage. (Pavan)
- 2026-09-23 — The act is "Finalize vendor"; "Award" retired. Recurring work on V1.1 only. (Pavan)
- 2026-09-24 — Review lane (optional hold), Verified = queue, only accounting marks Synced, Partially Synced = error. (Pavan, from Aayush's engine doc)
- 2026-09-24 — A rule cuts real Draft orders per hit date, 7 days ahead. (Pavan)
- 2026-10-01 — Clash = same asset or overlapping window only; per-ship-to skips allowed. (Pavan)
- 2026-10-06 — Lane walk: nothing saved before Create Order; create needs customer + ship-to + a line; any quote → Quoting; acknowledge-on-behalf → Assigned; Assigned requires a finalized vendor. (Pavan)
- 2026-10-07 — Recommendations are rule-level. (Pavan)
- 2026-10-15/16 — Multi-pick makes rows, in every row-adding table. (Pavan, said three times)
- 2026-10-20 — Shared delivery timeline + recurring section in all modules; Top off · Qty last in every module; Vendor section shown on the create sheet. (Pavan)
- 2026-10-26 — 3PL DO only: Top off last; quantity capped at tank room. (Pavan)
- 2026-10-27 — No Quoting lane on the board: Quoting orders sit in Orders until a vendor is final. (Pavan)
- 2026-10-29 — Order types back to Core · Delivery · Emergency · Extraction. (Pavan)
- 2026-11-02 — One board (`BoardV2`) in every module. (Pavan)
- Out of scope (Pavan): recording delivered gallons as its own flow, invoices inside 3PL, telling losing vendors, unblock / un-cancel.

## Open questions / conflicts

- **Create gate conflict.** Memory "settled" (Sept) says Create Order needs a partner invited and asked; the 2026-10-06 lane walk says customer + ship-to + a line only, Vendor hidden until created; 2026-10-20 puts the Vendor section back on the create sheet. Latest: vendor section visible at create, but whether it is *required* is not stated.
- **Old transition table is stale.** README's diagram ("Draft --invite--> Assigned", "Assigned --submit--> Completed") uses pre-rename words; and the 2026-09-17 "Confirmed moves to Completed" footer is superseded by the lane walk (Move to Assigned; Review & mark completed).
- **Lane list conflict.** Memory and older README list a Quoting lane and "Cancelled"; code (2026-10-27) has no Quoting lane and spells the status "Canceled". Code wins.
- **Top off position** differs: 3PL DO = Top off last; all other modules = Qty last (deliberate 2026-10-26 exception).
- **Recurring horizon** differs: V2 rolling month, V1.1 7 days, Customer Portal ~30 days system lead (CP lead days removed).
- **V1.1 job type "Transportation"** removes the partner and offers every ship-to, yet README also says every programme is third party.
- Two lines can share an asset name and a quote can't tell them apart (fix: key quote lines on line position). Ask before doing.
- Vendor rejection not modelled (spec: a single invited vendor declining returns the order to Draft).
- Quote goes stale only when a line is added, not on a qty change — confirm.
- 13 seed Quoting orders break an invariant (vocabulary question).
- No validation or failure paths anywhere (every toast is success).
- Lanes not walked in detail: Review · Verified · Synced · Partially Synced · Blocked · Canceled.
- Remove the invoice row ("Request invoice" / "Invoice requested") from cards? Recommended yes — invoices are offline.
- Assigned lateness flag, undo on lane moves, duplicate order, unhappy paths (decline / bounce / expire) — offered, not picked.
- V1.1 open: an order created but not yet run when a rule is edited · a target that stops being serviceable · 29–31 in short months · recurrence default carrier (spec §5.16).
- Three stages share one amber chip tone (Quoting, Assigned, Verified).
- Board scoped to one day vs the spec's Today button + date filters.
- Sales status derived from driver contradicts the source app (HANDOFF Q1).

## Where it lives

- Model + invariants: `prototypes/unified-view/threepl/orders.ts` (`BrokerStatus`, `assertConsistent`, `OrderLine`).
- Board, lanes, list: `threepl/BrokerOrdersScreen.tsx` (`BOARD_LANES`), `threepl/BoardV2.tsx`, `threepl/BrokerBoard.tsx`.
- Order sheet: `threepl/BrokerOrderSheet.tsx`; asset orders `threepl/AssetMovementSheet.tsx`; shared `prototypes/unified-view/PendingStrip.tsx`, `PocDetails`, delivery timeline (`DeliveryWindowTimeline`), `RecurringOrderSection`.
- Recurring: V1.1 `threepl/recurringPrograms.ts`, `recurringOrders.ts`, `RecurringPrograms*.tsx`, `RecurringProgramCreate.tsx`, `RuleFrequency.tsx`; V1 `recurringRules.ts`; V2 `recurring.ts`.
- Decisions: `threepl/README.md`; creation rules `docs/unified-view/3pl/creation.md` + `evals-creation.md`; retired sheet `docs/order-sheet-v1-retired-2026-09-15.md`; archives `docs/archive/board-versions-*.md`, `docs/archive/3pl-board-quoting-2026-10-27.md`.
- Sibling docs: `3pl-brokerage.md` (vendors, invites, quotes, pricing), `fuel-supply-and-sourcing.md`, `fleet-trucks-and-routes.md`, `dispatch-and-operations.md`, `customers-and-sites.md`, `assets-tanks-and-leases.md`, `service-work.md`, `sales.md`, `master-data.md`, `product-overview.md`.
