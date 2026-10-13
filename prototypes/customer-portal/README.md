# Customer Portal — module notes

The CUSTOMER's side of the Customer Portal: a tenant's customers raise fuel
requests for their ship-tos (and the tanks and assets on them) and follow
them through to invoice. The tenant's side is a separate unit, not built yet.

- **PRD:** Claude Doc "Customer Portal — PRD v2 with User Flows"
  (https://claude.ai/artifact/UFvgn4mVAeLRaVniYAduwH).
- **Not part of the Unified View.** Same shell — it consumes `AppShell`,
  `TopBar`, `ModuleSidebar`, `RecordSheet`, `ListTable`, `ListToolbar`,
  `BrokerBoard`, `OrderMapView`, `DateRangeFilter` from `../unified-view` and
  the DS from `@/` — and ships as its own HTML.
- **Run / build:** `npm run dev:portal` (port 4310) · `npm run build:portal`
  → `dist-portal/index.html` → copied to `../FP-DS-2026-customer-portal.html`.
- **Everything in `orders.ts` is invented sample data** (account Cardinal
  Logistics, tenant Lone Star Fuels, ship-tos, tanks, requests, prices,
  last week's figures).

## Navigation (Pavan, 2026-10-13)

Dashboard (landing) · Orders · Invoices · Sites & Assets · Reports · Team &
Access. Only **Orders** is built; the rest are empty on purpose — built page
by page. No account switcher (sales reps order from their own apps).
Notifications are the top bar's bell, not a page.

## Orders — decisions not to re-open

- **Rows are order REQUESTS.** How the tenant splits or merges them into its
  own orders is the tenant unit's business and is not shown.
- **One ship-to per request**, any number of its tanks/assets, each with its
  own product and quantity.
- **No customer-side approval.** A user allowed to create an order sends it
  straight to the tenant.
- **Statuses** (PRD lifecycle, renamed): Draft · Created · In review · Action
  needed · Quote sent · Quote declined · Quote expired · Scheduled
  (Confirmed merged in) · Cancellation requested · Out for delivery · Partial
  delivery · Delivered · Invoiced · Invoice disputed · Paid · Rejected ·
  Cancelled. Kinds in `REQUEST_STATUS_TONE`.
- **Create sheet** = the Unified View record sheet: create, then autosave;
  footer Save as Draft · Submit request. Lines table = the **3PL Delivery
  Order's**: Top off · Asset · Product · Qty (gal). Picking a tank fills the
  product last ordered for it (else its own); editable. Recurring = checkbox
  with Frequency and End date.
- **Request summary card in the RIGHT column, while creating too** (a
  portal-only exception to "create sheets have no rail" — open question
  whether it becomes the rule everywhere). It carries the **estimated cost**
  (market price + pricing set by the tenant, a range per line) and says
  outright it is not the final price.
- **⋯ menu:** Duplicate order (not "Reorder") · Cancel order — now before
  Scheduled or outside the 24 h cut-off; "Request cancellation" inside it
  (reason required, fee may apply); blocked once out for delivery.
- **Documents** section open in every status; customer can add files.
- **List:** LOS switch All · Fuel · Lubricants · Propane (3PL's words);
  date range opens on today; table · board (lane per status, ends apart) ·
  map (pins per ship-to, live trucks from the terminal, hover = primary
  details, press = sheet). Flags column = plain text coloured red / amber /
  plain by level. Documents column = count + list on press. Tanks, Product
  and Quantity cells open the line breakdown on press, ordered per column.
- **Critical banner** (Sales' warning banner): tanks ≤ 20% with no live
  request; "Create order" makes a Top-off draft for that ship-to.
- **Overview** — ONE read-only card above everything, two tiles ruled apart
  (after Pavan's "New subscriptions" reference): Today's orders "3 of 8
  orders delivered" and Gallons delivered today "12,700 of 27,800 gal",
  each with its change on the same weekday last week and a 7-day trend line.
  One round ↗ icon opens **Today's deliveries** (orders split, delivery
  schedule with Now line and live trucks + ETA, gallons by product).

## Open

- Should "summary card on the right while creating" apply to all modules?
- Statements — a tab in Invoices?
- Duplicate-order warning on submit (PRD FR-23) not built.
- Overview compares with last week's full day; should be same time of day.
