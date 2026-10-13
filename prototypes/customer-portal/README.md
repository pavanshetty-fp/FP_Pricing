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
Access. **Orders** and **Sites & Assets** are built; the rest are empty on purpose — built page
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
- **Alerts** = the DS banner with interaction (`AlertBanner`), six kinds:
  empty tanks (each with Create order), action needed, invoices past due,
  partial deliveries, quotes to accept, at risk of late. Each title applies
  its filter.
- **Overview** — ONE read-only card above everything, two tiles ruled apart
  (after Pavan's "New subscriptions" reference): Today's orders (8) and
  Gallons to be delivered today (27,800), each with its change on the same
  weekday last week and a 7-day trend line.
  One round ↗ icon opens **Today's deliveries** (orders split, delivery
  schedule with Now line and live trucks + ETA, gallons by product).

## Sites & Assets — decisions not to re-open (Pavan, 2026-10-13)

- **The customer keeps ship-tos and assets — no tenant approval.** The
  tenant reads them to take orders, so the customer must keep them right.
- **Tabs** on the view row's switch: Ship-tos · Assets · Service requests
  (placeholder: leaks, damage, parts — built later). All lists use
  `PortalList` (the Unified View list as one piece).
- **Every asset has its own latitude/longitude** (where it stands inside the
  ship-to), a ship-to, type, product, size, Rented (checkbox; "Rented" pill
  in the list and header), and a tank monitor (checkbox + ID).
- **Tank level only where a monitor is fitted**; otherwise "No monitor".
  Estimating from usage and history is for later.
- **Ship-to sheet** holds its assets as an editable table (name, type,
  product, size, lat, lng, rented). Create takes the act; edits autosave.
- **Deactivate** (⋯) is refused while orders are on their way. **Create
  order** (⋯) on a ship-to or asset opens Orders on a new draft for it (an
  asset's tank on a Top off line).
- One live list (`SHIP_TOS`, edited in place by `sites.ts`), so Orders and
  the map see new records at once; renaming a ship-to renames it on its
  requests.

## Open

- Should "summary card on the right while creating" apply to all modules?
- Statements — a tab in Invoices?
- Duplicate-order warning on submit (PRD FR-23) not built.
- Overview compares with last week's full day; should be same time of day.
