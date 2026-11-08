# Customer Portal — the one module the tenant's customers use

> **Load this when:** working on the Customer Portal (CP) — its dashboard, Orders (ORD-…), order statuses, Recurring Orders rules, tank levels and days to empty as the customer sees them, Sites & Assets, the locations map, Invoices and Statement, Team & Access, notifications; or deciding whether a CP pattern should spread to a tenant module. **Not for:** the tenant's view of a customer, credit and ship-to records (`customers-and-sites.md`), tenant-side delivery orders (`delivery-orders.md`), tanks and monitors in general (`assets-tanks-and-leases.md`), 3PL (`3pl-brokerage.md`).
> **Sources:** `prototypes/customer-portal/README.md`, `prototypes/customer-portal/OPEN-QUESTIONS.md`; memory `project_customer_portal` (entries to 2026-10-26), `feedback_audience_split`. **Last updated:** 2026-11-06.

## In one paragraph

The Customer Portal is where a tenant's **customer** (e.g. a fleet operator buying diesel) logs in to order fuel for their own ship-tos and tanks, follow each order to delivery and invoice, keep their sites and assets up to date, and manage their team. It is the **only customer-facing module** — every other module is used by the tenant. It is a separate app, not part of the Unified View, but built on the same shell and design system. Only the customer side is designed; the tenant side of the portal (request queue, entitlements, branding) is a later unit. Since **2026-10-21** the model is simple: the customer creates an order (ORD-…), the tenant takes every order (no quotes, no approval), and it moves **Draft → Unassigned → Scheduled** (driver assigned) → out for delivery → delivered → invoiced → paid. All data in the prototype is invented (sample account Cardinal Logistics, sample tenant Lone Star Fuels).

## Glossary

| Term | Meaning |
|---|---|
| Customer (in CP) | The logged-in company. Its users order for their own account only. |
| Tenant / supplier | The fuel distributor serving the customer (sample: Lone Star Fuels). |
| Order (ORD-…) | What the customer creates, with a planned date. Since 2026-10-21 it IS the order the tenant works — no separate request number. |
| Planned date | The day the customer wants delivery. Every tank sum counts to it. |
| Unassigned | Sent to the tenant, no driver yet. |
| Scheduled | A driver is assigned. |
| Awaiting confirmation / Awaiting cancellation | A pill on an Unassigned/Scheduled order carrying a change or cancellation request; not a status. |
| Credit hold | A flag on an order; the customer replies with an offline payment. |
| Top off | Fill a tank to full. Never pre-ticked. |
| On fulfillment | The tank's level after this delivery, capped at 100%. |
| Days to empty | Gallons in the tank now ÷ daily use. |
| Recurring rule (R-xxxx) | "Set it once": a rule that makes Draft orders for one ship-to on a schedule. |
| Run dry / Tank found empty | A driver noted the tank was empty on arrival; counted as times, not days. |
| Preferred times | Half-hour slots inside the delivery window that the customer prefers. |
| Statement | A tab inside Invoices. |

## How it works

### Who uses it

- The tenant's customers: their managers and buyers. Users are invited (Team & Access) and belong to one account. No account switcher — sales reps order from their own apps.
- The tenant turns access on per customer (the **Portal access** switch on the customer record; see `customers-and-sites.md`).
- Roles: **Manager · Admin 1 · Admin 2**, all with full access until roles and responsibilities are worked out.

### Menu

Dashboard (landing) · Orders (Recurring Orders hangs under it) · Invoices (Statement tab) · Sites & Assets · Reports (empty on purpose) · Team & Access. Notifications are the top bar's bell plus one-line toasts with View — not a page.

### Orders — the current model (2026-10-21, refined 2026-10-22 and 2026-10-26)

- **One ship-to per order**, any number of its tanks/assets, each line with its own product and quantity. Lines table: Top off · Asset · Product · Qty (gal), plus tank columns (current level, on fulfillment, days to empty).
- **No quotes.** Price is agreed in the separate Pricing flow, per product per period. The order's summary card shows an **estimated cost** (market price + the tenant's pricing, a range per line) and says outright it is not the final price.
- **No approval anywhere.** No customer-side approval chain: a user who may create an order sends it straight to the tenant. No accept/decline/review on the tenant side either — the tenant takes every order.
- **Statuses:** Draft → Unassigned → Scheduled → Out for delivery · Partial delivery · Delivered · Invoiced · Paid · Cancelled.
- **Change / cancellation requests** are not statuses or board lanes. The order keeps Unassigned or Scheduled and carries the request; it shows "Awaiting confirmation" / "Awaiting cancellation" (what, note, when) in the table, on the board card and as a section in the sheet. Request change covers planned date, window, quantity, tanks or products, cancel, other — with a note.
- **Cancel** (from the PRD): before Scheduled or outside the 24 h cut-off it cancels; inside the cut-off it becomes a cancellation request (reason required, a fee may apply); blocked once out for delivery.
- **Credit hold:** a flag on the order with a reply panel. The customer cannot pay in the portal; they report a payment made **offline** (paid on, amount, reference, proof) and the tenant releases the hold. "Action needed" as a status was removed on 2026-10-21.
- **Partial delivery:** "Order the rest" makes a new draft for the undelivered gallons.
- **Duplicate order** (not "Reorder") copies an order into a new draft.
- **Documents** section is open in every status; the customer can add files.
- **Trip events** on the order: loaded (BOL), departed, ETA changed, arriving in 30 min, arrived, unloading, delivered.
- **Two dates:** the day the order was sent sits under its number; the Planned date is its own column.
- **List:** line of service switch All · Fuel · Lubricants · Propane; date range opening on today; table · board (a lane per status) · **map** (a pin per ship-to, live trucks; hover = primary details, press = the order). Rows expand to show each tank's product, qty, level ordered → refilled, level now, battery. Flags column = text by severity. Alerts above the list (tanks nearly empty with Create order, past-due invoices, partial deliveries, at risk of late).
- **Overview card:** Today's orders and Gallons to be delivered today, each against the same weekday last week with a 7-day trend; each opens Today's deliveries (orders split, delivery schedule with live trucks + ETA, gallons by product).

### What an order does to a tank

- Tank level shows only where a **tank monitor** is fitted ("No monitor" otherwise). Monitors are set up **outside** the portal; the portal only reads them.
- In the tank now = level % × capacity. Days to empty = now ÷ daily use. Left at delivery = now − daily use × days until the planned date.
- **Suggested quantity** = capacity − left at delivery. Shown as the Qty placeholder; the customer takes it with one press. Qty starts empty.
- **On fulfillment** = (left + ordered) ÷ capacity, **never above 100%**. Where a monitor and capacity exist, quantity is held to the tank's room on the planned day; typing more shows "has room for only N gal on the planned day". On fulfillment shows "—" until a planned date is picked.
- Warnings left: tank empty before delivery; under 25% after delivery.
- Each order line keeps the level when ordered and, once delivered, what it was refilled to (order sheet and the asset's Order history).
- Bands exist (≤10 urgent, <50 low, <80 moderate, ≥80 fine) but **no band words** appear on screen — only the gauge color and %. Battery is its own column; under 20% is red.
- Same capping rule applies to the 3PL lines table (2026-10-26).

### Recurring Orders — the customer's rules

- One row per rule: name, ship-to, products, qty, schedule, next delivery, orders made, status (Active · Paused · Ended). Create Rule; Recommendations beside Filters open a pre-filled rule.
- Rule form: name + one ship-to; frequency (the 3PL picker — days, dates, daily, custom cycle, end date); starts, ends after N deliveries; delivery window and preferred times; tanks/products/qty (pick several assets at once); instructions; weekend or holiday (deliver anyway · skip · next working day); PO (one standing PO · each order asks); reminders.
- The rule **makes Draft orders** ahead of time, each marked with its R-xxxx pill; the customer sends each one. The tenant approves nothing about the rule. Editing a rule changes only orders not yet made.
- Rule page: settings, orders made and upcoming (each skippable), history; Edit · Pause / Resume · End.
- On the order sheet, Recurring is its own optional section ("Add Recurring Order") using the same frequency picker.

### Dashboard (after the 2026-10-19 review)

- **Attention required** — credit holds (one tile, a count, no balance) · running late (planned date passed, not delivered) · no proof of delivery (no delivery ticket). Each tile opens an action sheet, then the order.
- **Schedule, next 7 days:** deliveries, products, gallons, ship-tos, each vs the previous 7 days.
- **Tank levels:** level bands, days to empty (1 · 2 · 3 days, "N will run dry before their next delivery"), monitor battery (below 40 · 20 · 10 · 5%). Each count opens a filtered table; each row can create a top-off order.
- **Spend:** total, by week, by product (Compare · Totals · By days). History only — **no market comparison anywhere**.
- **Billing & credit:** open invoices; credit only for customers the tenant gives credit to.
- Delivery performance (on-time, fill rate, tanks found empty, time to confirm) moved to Reports; Asset health removed.

### Sites & Assets

- Tabs: Ship-tos · Assets · Service requests ("Coming soon").
- **The customer keeps ship-tos and assets directly — no tenant approval.** The tenant reads them to take orders, so the customer must keep them right.
- Ship-to sheet, two steps: 1 details (address + map, delivery) → 2 its assets (add new, or **Map existing assets**, which moves assets here with their history).
- Ship-to fields CP adds: Delivery instructions, Default PO # (fills an empty PO # on new orders), preferred times (new orders start with them), geofence switch + radius, Last / Next delivery (derived). Street is optional once the map pin is placed.
- Asset fields: display name · unique ID · RFID (opt.) · ERP ID (opt.) · type (incl. Card lock pump, Equipment — size optional for those two) · size · compatible product categories · products (mandatory, at least one) · Owned/Rented (set at create, read-only after) · tank monitor + ID · latitude/longitude inside the site · created by · last filled · activity log.
- Capacity is always ONE asset's; never summed per ship-to or product.
- Deactivating a ship-to is refused while orders are on their way. Create order from a ship-to or asset opens a new draft for it.

### Invoices and Statement

- Overview: Outstanding · Overdue · Paid (last 90 days) · Terms (and credit limit where the tenant gives credit).
- **No payments in the portal.** Invoice statuses: Received · Payment due · Overdue · Paid (awaiting the tenant's confirmation) · Payment confirmed · Payment disputed (the tenant's payment mismatch).
- Invoice sheet: summary (order, bill-to, ship-to, issued, due, amount) and charges (fuel per product at the customer's price, fees, tax, total); Download. Invoice ↔ order numbers link both ways.
- Statement is a tab inside Invoices.
- Customer-raised invoice disputes were designed (2026-10-15) and are now **hidden** (switched off since 2026-10-22).

### Team & Access

- List: name (email under) · role · phone · invite status (Active / Pending) · last login · deactivated.
- Invite user → the user exists at once as Pending. Resend invite (pending only); Deactivate / Reactivate (not yourself). Email is fixed once invited.

### What stays in the portal (audience split)

Customer-specific behavior stays in CP unless Pavan says to bring it to a tenant module, decided per module. Examples: the customer's tank-level views and order suggestions, preferred times, the estimated-cost note, rule-made drafts sent to the supplier, offline-payment replies to a credit hold, customer edits without approval. Shared visual patterns (steppers, pills, Top off, the capped quantity) are not covered by this split.

## Decisions already made

- **2026-10-13** — Separate module, same shell; customer side first; no account switcher; notifications = bell + toasts; Duplicate order not "Reorder"; estimated cost in the summary card, never called final.
- **2026-10-13** — Dashboard default range = last 8 full weeks (4/12 on a toggle), compared with the period before. Run dry counted as times.
- **2026-10-14** — No tenant approval of customer site/asset edits (the real product has one; we keep ours). Products stay mandatory on assets. Invoices: no pay.
- **2026-10-15** — Roles Manager · Admin 1 · Admin 2, all full access (replaced the earlier Manager/Buyer/Viewer). Statement = tab in Invoices. Credit hold = offline payment reported, tenant releases.
- **2026-10-16** — Recurring Orders = the customer's rules; rules make drafts; the tenant approves nothing.
- **2026-10-17** — Tank monitors in scope, read-only; preferred times inside the delivery window.
- **2026-10-19** — Dashboard: Attention required trimmed; no market comparison; Delivery performance → Reports.
- **2026-10-20** — Top off never pre-ticked on any new order.
- **2026-10-21** — No request numbers; ORD-… is the one order. No quotes (Pricing flow). No accept/decline. Statuses Draft → Unassigned → Scheduled → … "Action needed" removed.
- **2026-10-22** — Change/Cancellation requested are flags, not statuses or lanes. "Invoice disputed" removed; disputes hidden.
- **2026-10-26** — On fulfillment capped at 100%; quantity held to the tank's room (CP and 3PL).

## Open questions / conflicts

- **README is behind the 2026-10-21 model.** It still describes order requests (REQ-…), quotes (Quote sent / declined / expired, Accept quote), Action needed, Partly accepted, a Request ↔ Order split, "Change requested" statuses, "Order Requests" in the menu and "quotes waiting" on the dashboard. Memory (2026-10-21/22) is later and wins: none of these exist now.
- **Invoice disputed:** README (2026-10-15) has it on invoice and order; removed 2026-10-22. "Payment disputed" is still listed as an invoice status.
- **Dashboard credit:** 2026-10-13 had a weekly limit, used vs committed; 2026-10-19 says one count of holds, no balance. The team also says only a yes/no hold comes through today.
- **Recurring lead time:** the rule form offers 3 · 5 · 7 · 14 days ahead; the 2026-10-17 review says the system makes orders ~30 days ahead and the field should go (to-do, not done).
- **Tenant setting for "no approval":** OPEN-QUESTIONS (2026-10-20) still asks whether skipping approval is a tenant setting or per customer; the 2026-10-21 model says the tenant takes every order.
- **Real users hold several accounts**, but the portal has no account switcher "for now".
- **Team questions still open (2026-10-20):** monitor setup visible to customers or not; source of daily usage; new/stale monitor readings; battery steps and who replaces them; whether bands are per monitor or tenant-set; change-request response time; running-late ETA from dispatch; what counts as proof of delivery; partial deliveries and actual delivery date in tank sums; dashboard cards per role.
- **Built-not-decided:** summary card on the right while creating (CP-only so far — rule everywhere?); duplicate-order warning on submit (PRD FR-23) not built; overview compares last week's full day, should be same time of day.
- **To-dos:** ship-to and asset as full pages; tank-monitor data pass against real data.

## Where it lives

- Code: `prototypes/customer-portal/` — `OrdersScreen.tsx`, `OrderRequestSheet.tsx`, `orders.ts` (store + tank arithmetic), `RecurringScreen.tsx`, `RuleSheet.tsx`, `portalRules.ts`, `DashboardScreen.tsx`, `dashboard.ts`, `TankHealth.tsx`, `TankLevel.tsx`, `SitesScreen.tsx`, `ShipToSheet.tsx`, `AssetSheet.tsx`, `sites.ts`, `InvoicesScreen.tsx`, `InvoiceSheet.tsx`, `StatementView.tsx`, `invoices.ts`, `TeamScreen.tsx`, `UserSheet.tsx`, `users.ts`, `notifications.ts`.
- Notes: `prototypes/customer-portal/README.md`, `OPEN-QUESTIONS.md`, `REVIEW-2026-10-17.md`.
- PRD: Claude Doc "Customer Portal — PRD v2 with User Flows" (https://claude.ai/artifact/UFvgn4mVAeLRaVniYAduwH).
- Run: `npm run dev:portal` (port 4310); build `npm run build:portal` → `../FP-DS-2026-customer-portal.html`.
- Sibling docs: `product-overview.md` · `customers-and-sites.md` · `delivery-orders.md` · `3pl-brokerage.md` · `fuel-supply-and-sourcing.md` · `fleet-trucks-and-routes.md` · `dispatch-and-operations.md` · `assets-tanks-and-leases.md` · `service-work.md` · `sales.md` · `master-data.md`.
