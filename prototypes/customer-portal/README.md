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

Dashboard (landing) · Orders (with Order Requests · Recurring Orders hanging under it on tree bars,
as 3PL's Orders) · Invoices · Sites & Assets ·
Reports (empty on purpose) · Team & Access. **Orders** and **Sites & Assets** are built; the rest are empty on purpose — built page
by page. No account switcher (sales reps order from their own apps).
Notifications are the top bar's bell, not a page; events also arrive as
one-line toasts with View (`notifications.ts`, simulated).

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
  its filter. **Placed BELOW the toolbar, search and filter chips**, right above
  the list (Pavan, 2026-10-14) — unlike the Unified View rule (above the
  toolbar).
- **Overview** — ONE read-only card above everything, two tiles ruled apart
  (after Pavan's "New subscriptions" reference): Today's orders (8) and
  Gallons to be delivered today (27,800), each with its change on the same
  weekday last week and a 7-day trend line.
  One round ↗ icon opens **Today's deliveries** (orders split, delivery
  schedule with Now line and live trucks + ETA, gallons by product).

## Dashboard — decisions (Pavan, 2026-10-13)

- **Default range = last 8 FULL weeks** (Mon–Sun, ending last Sunday); 4 and
  12 weeks on a toggle. Every figure compares with the same number of weeks
  before.
- **Headlines:** On-time delivery · Fill rate · Tanks found empty · Time to
  confirm.
- **Run dry = a driver noted "Tank found empty"** — counted as TIMES, not
  days (how long it sat empty is unknown; a few minutes still counts). Goal 0;
  "N days since the last one".
- **Credit only for customers the tenant gives it to** (`CREDIT.enabled`);
  limit per week; used = invoiced, committed = accepted quotes and placed
  orders not yet invoiced.
- **Layout (round 3):** range row · Delivery performance (headlines ·
  Requests by week · Empty-tank reports by week) · **Needs your action** — a
  wide, lightly decorative banner, COLLAPSED by default; opened, every item
  is a tile titled with the ACTION required · Products & pricing (small
  "Saved vs market" part left, for the chosen product and weeks + all
  products; "Price vs market" right — ONE card, the two parts ruled apart
  (2026-10-14) with a tab per product — your price
  GREEN solid, market RED dashed (dash = the second cue the validator asks
  for: protan ΔE 7.2 in light) · Volume by product) · Asset health (Driver
  reports TABLE: asset, ship-to, issue, driver, date, order — no
  service-request action until that exists) · Billing & credit (Open
  invoices · Credit, its chart filling the card's height) · Schedule (Next 7
  days TABLE; a row opens the order). History, notes, invoices, credit are INVENTED
  (`dashboard.ts`).

- **Attention required cards (Pavan, 2026-10-15)** — company-card layout:
  violet icon tile · "REQ-1120: Credit on hold" · a ≤6-word line · the
  act as a pill on the right (Clear dues · Accept quote · Confirm site ·
  Reorder · Settle invoice · Reply); a rule; Ship-to · Asset · Product ·
  Total gallons; a lighter rule; Planned date with the countdown ("1 more
  day left", red ≤ 2 days) at the bottom right — a delivered order shows
  "Delivered" and no countdown.
- **Attention required (was "Needs your action") → an action sheet first (Pavan, 2026-10-15):** a
  tile opens a 600px sheet (`ActionSheet`, RecordSheet size `medium`) in
  the Request summary card's dress — what is needed and why, plus the
  facts for that action (credit hold: the overdue invoices and the
  balance; quote: the estimate; dispute: the invoice, reason and amount),
  then "The order" in short. One act: **View order details** → the full
  order sheet.
- **No explainer lines on the dashboard (Pavan, 2026-10-14):** a headline
  figure softens on hover (no underline) and opens its explanation on
  click; a
  chart's explainer is an ⓘ beside its title (`note` on Card). Credit's
  chart has no caption — a strong dashed **Credit limit** line says it;
  usage is on hover.

## Invoices (Pavan, 2026-10-14)

After the Lovable reference's invoice page
(unified-ui-revamped.lovable.app/customer-portal?sec=invoices), in our DS.

- **Overview** — one read-only card, four tiles: Outstanding · Overdue · Paid
  (last 90 days) · Terms (Net 15; credit limit where the tenant gives
  credit).
- **Alerts** — `AlertBanner` under the toolbar: overdue · payment disputed ·
  due this week; a title filters the list to that status, an item opens
  the invoice.
- **List** — Invoice · Issued · Due (with "N days overdue / In N days") ·
  Order · Ship-to (bill-to under it) · Amount · Status · **Download** (one
  icon, highlighted only under the pointer; never opens the row).
- **NO PAY.** The portal takes no payments yet; the STATUS says where an
  invoice stands: Received · Payment due · Overdue · Paid (awaiting the
  tenant's confirmation) · Payment confirmed · Payment disputed.
- **Sheet** — a row opens it: Summary (order, bill to, ship-to, issued,
  due, amount due / paid on) and Charges (fuel per product @ the customer's
  price, fees, tax, total); Download invoice in the header and the footer.
- **Payment disputed** adds three sections to the sheet (Pavan,
  2026-10-14): **Payment dispute** (raised by + when, invoiced, what the
  customer says, the difference in red, the reason) · **Notes** (both sides,
  oldest first, each with name, company pill and time; a box + Add note) ·
  **Documents** (the Orders documents table + Add document, for proof). The
  dispute banner's items show the reason.
- **One store** (`invoices.ts`, `chargesOf`) — the dashboard's Open invoices
  reads it too. Data INVENTED.

## Team & Access (Pavan, 2026-10-14)

From the FleetPanda portal's user record (structure only, invented people).

- **List** — Name (email under) · Role · Phone · Invite Status (Active /
  Pending) · Last Login (how long ago, the time under; "Never") ·
  Deactivated (the date, or —). Facets: role, invite status, account.
- **Invite user** = the create sheet: first / last name, email, phone, job
  title, role; the act is **Send invite** → the user exists at once,
  Pending.
- **A user's sheet** — details autosave (email fixed once invited); Access
  facts: invitation (+ when sent), last login, deactivated. ⋯ **Resend
  invite** (pending only) · **Deactivate / Reactivate** (not yourself).
- **Roles** Manager · Admin 1 · Admin 2 (Pavan, 2026-10-15, for now) — all
  three have FULL ACCESS until roles and responsibilities are worked out
  (later); only "manager" is in the real data.
- **No account switcher** (Pavan, 2026-10-14) — a user here belongs to this
  account, although real users can hold several.
- **Products stay mandatory** on assets (Pavan, 2026-10-14), although most
  real assets have none.

## Sites & Assets — decisions not to re-open (Pavan, 2026-10-13)

- **Breakdowns = the Unified View's (Pavan, 2026-10-14):** every "+N"
  chip (or the figure, where the cell is one — quantity, documents, flags)
  opens the shared `BreakdownCard` on click, above the cell — Orders and
  Sites & Assets alike. Ship-to Assets: a TABLE — Asset · Type · Products ·
  Capacity; Products: a TABLE grouped by product — Asset · Type ·
  Capacity under each (BreakdownCard `table`, 2026-10-14). **Capacity is always ONE asset's**; Orders keep Quantity. Seed:
  Tank A2 takes five products.
- **TWO STEPS, create and detail alike (Pavan, 2026-10-14)** — the DS
  `SheetSteps` strip under the header.
  - **Ship-to:** 1 Ship-to details (details · address + map · delivery) →
    2 Assets (the assets table — a new row is a new asset, mapped here; **Map
    existing assets** ticks assets at other ship-tos and MOVES them here, with
    their history; an "Asset locations" map to drag each pin).
  - The step-2 asset table carries EVERY asset field the asset sheet
    creates (unique ID, RFID, ERP ID, type, categories, products, size,
    monitor + ID, lat/lng, rented) and scrolls sideways — eval `field-reach`.
    The Ship-tos list gained Access notes + Geofence columns (hidden by
    default) for the same reason.
  - **Asset:** 1 Asset details (details · tank monitor · notes) → 2 Ship-to &
    location (ship-to picker with **+ New ship-to**, which opens the ship-to
    sheet over this one and comes back chosen; lat/lng + map).
  - Create: step 2 opens once step 1 is complete ("Next: …" raises the
    pending strip otherwise); Back on step 2; the create act is on step 2.
    Detail: both steps open, autosave, no footer.

- **The customer keeps ship-tos and assets — no tenant approval.** The
  tenant reads them to take orders, so the customer must keep them right.
- **Tabs** on the view row's switch: Ship-tos · Assets · Service requests
  (for now: no views or toolbar, only the tab switch, an illustration, "Coming soon" (large, system serif) and three "What to expect" cards — report an issue, follow it to the fix, driver reports ready to raise; leaks, damage, parts — built later). All lists use
  `PortalList` (the Unified View list as one piece).
- **Real-data alignment (Pavan, 2026-10-14)** — FleetPanda portal shapes
  pasted from the demo account; structure only, values invented. Asset
  types gain **Card lock pump** and **Equipment**; **size is optional for
  those two** (no tank — shown as "—" / "No tank"). Customer changes need
  **no supplier approval** (the real product has one — we keep ours). **No
  account switcher** for now, although real users can hold several
  accounts. Orders, dashboard and invoice data could not be pulled.
- **Street is optional once the map pin is placed** (Pavan, 2026-10-15) —
  city, state and ZIP stay required.
- **Ship-to, from the real record (2026-10-14):** "Access notes" is now
  **Delivery instructions** (the real field — gate codes, PPE, parking,
  photos); a **Default PO #** per ship-to fills an empty PO # on a new
  order; the Ship-tos list shows **Last delivery** and **Next delivery**
  (derived from the requests) and hides Default PO # until asked for.
- **Every asset has its own latitude/longitude** (where it stands inside the
  ship-to), a ship-to, type, product, size, Rented (checkbox; "Rented" pill
  in the list and header), and a tank monitor (checkbox + ID).
- **Asset fields (2026-10-13):** Display name · Unique ID · RFID code
  (optional) · ERP ID (optional) · Type · Size (required) · Compatible product
  categories (Gas · Additive · Aviation fuel · Propane · Lubricant) · Products (narrowed by the categories; the first is what an order
  line starts from) · Ownership (Owned / Rented — picked at create, read-only
  after) · Tank monitor + ID (monitor details and tank level: later) · Created by (name, date under it) · Last filled
  · Activity log. The Assets list carries the same set, column for column.
- **Asset sheet = the ship-to sheet's shape:** one column, no summary card,
  activity icon · ⋯ · ✕ in the header. Location = ship-to picker + lat/lng
  on the left, map on the right (ship-to pin, geofence, its other assets);
  press the map or drag the orange pin to place the asset.
- **Tank level only where a monitor is fitted**; otherwise "No monitor".
  Estimating from usage and history is for later.
- **An existing ship-to's sheet has no summary card** — one column; its
  history is the **activity icon** in the header (activity · ⋯ · ✕), which
  opens the ship-to's log (its changes, its assets', every request to it).
- **Ship-to sheet** holds its assets as an editable table (name, type,
  product, size, lat, lng, rented, **Activity log**). Create takes the act;
  edits autosave. **Rented is set when the asset is added** — a saved asset
  shows Rented / Owned read-only here. **Activity log** opens a level-2 sheet: the asset's record
  changes and every request that named it, newest first.
- **Address + map** (2026-10-13): fields left, a real map right (Leaflet +
  OpenStreetMap tiles + Nominatim search — no key, needs internet). Search
  inside the map or press it → orange pin → **Confirm location** fills the
  fields; typing the address moves the pin. **Geofence** = a switch on the
  right; on, a slider for the radius in MILES under it, drawn as a ring. Assets show as violet pins, draggable to set their
  lat/lng. No lat/lng inputs for the ship-to itself.
- **Deactivate** (⋯) is refused while orders are on their way. **Create
  order** (⋯) on a ship-to or asset opens Orders on a new draft for it (an
  asset's tank on a Top off line).
- One live list (`SHIP_TOS`, edited in place by `sites.ts`), so Orders and
  the map see new records at once; renaming a ship-to renames it on its
  requests.

## PRD cross-check decisions (Pavan, 2026-10-15)

- **Critical alerts** = "Attention required"; no separate widget.
- **Duplicate order** = reorder; nothing else.
- **Quote:** Accept quote + ⋯ (Request change · Decline quote), both ask for
  a note. Accept → Scheduled; Request change → In review; Decline → Quote
  declined. The quote's lines, fees, tax and total show in the action sheet
  and the order sheet (`requestActions.tsx`).
- **Action needed:** the customer sends what they can — a note and files; on
  a credit hold, the payment made OFFLINE (paid on, amount, reference,
  proof). No payment in the portal; the tenant releases the hold. Once sent:
  "Sent to Lone Star Fuels · waiting for their reply".
- **Partial delivery:** "Partly delivered" in the order sheet, the
  action sheet and the Orders banner, each with **Order the rest** — a new
  draft for the undelivered gallons.
- **Trip events** in the order sheet's rail: loaded (BOL), departed, ETA
  changed, arriving in 30 min, arrived, unloading, delivered.
- **Recurring Orders = the customer's rules** (Pavan, 2026-10-16 — "set it
  once"). One row per rule: name, ship-to, products, qty, schedule, next
  delivery, orders made, status (Active · Paused · Ended). Full list toolkit:
  saved views, line of service, **Create Rule**, **Recommendations** beside
  Filters ("Review and Create Rule" opens the rule form filled in), search,
  filters (status · ship-to), search by column, column settings, export.
- **The rule form** (one scroll, rings steps): name + one ship-to; frequency
  (the 3PL picker — days, dates, daily, custom cycle, end date); starts, ends
  after N deliveries, delivery window, the next 4 deliveries; tanks/products/
  qty (multi-pick assets); instructions; make each order N days before (3 · 5
  · 7 · 14); weekend or holiday (deliver anyway · skip · next working day);
  PO (one standing PO · each order asks); reminders.
- **The rule makes its orders** — each a **Draft** order request N days ahead,
  marked with a violet "R-xxxx" pill (Repeats column + order sheet header,
  where the Recurring checkbox is hidden). The customer sends it to the
  supplier from there; the supplier approves nothing about the rule. Editing
  a rule changes only orders not yet made; made orders are their own records.
- **The rule's page**: its settings, its orders (made, with links; upcoming,
  each skippable), history; ⋯ Edit · Pause / Resume · End. Tank monitors are
  out of scope until Pavan raises them.
- **Assets pick several at once** in the order form: tick, Apply — the first
  fills the row, each other gets its own row (the DS cell's `multiple`).
- **Invoice ↔ order** numbers are links both ways.
- **Statement** is a tab inside Invoices.
- **Service requests** stay coming soon.
- **Customer invoice dispute** (recommended flow): invoice ⋯ → Dispute
  invoice (a sheet over the invoice) — what is wrong (Price · Quantity · Fees
  or tax → credit note; Details → corrected invoice; Not delivered → cancel),
  the lines in question with what each should be, a required note, proof.
  Status **Invoice disputed** (invoice and order); the due date is paused,
  never "overdue"; one open dispute per invoice. The tenant answers Accepted
  / Partly accepted (credit note, its own Statement row, amount due less the
  credit) / Rejected (one more reply, then Close dispute). "Payment disputed"
  stays for the tenant's payment mismatch.
- **Products & pricing:** "All products" tab (spend vs the same gallons at
  market), saving shown with "vs. market price" and its % of the market cost beside it; averages just above the rule.
- **Attention required shine:** a red diagonal band sweeps left to right on
  the outline only, ~1.9 s, every 6 s.

## Open

- Should "summary card on the right while creating" apply to all modules?
- Customer dispute rules still open: time limit · whether the disputed amount stops counting toward credit · who may dispute · paid invoices · whole vs part due date paused (built: open invoices, all roles, whole due date paused).
- Duplicate-order warning on submit (PRD FR-23) not built.
- Overview compares with last week's full day; should be same time of day.

## Tank monitors & preferred windows (Pavan, 2026-10-17)

- **Monitors are set up outside the portal**; the portal only reads them.
  10 of 12 seeded assets carry one (a pump and a propane tank don't).
- **Level bands** (`levelBand`): ≤10 Urgent (red, blinking), <50 Low (red),
  <80 Moderate (yellow), ≥80 Sufficient (green). Battery under 20% is red.
- **The cell** (`TankLevel.tsx`): gauge · % · band pill · battery. On the
  Assets list, a ship-to's assets table, the order form's tanks table, and a
  new **Tank levels** card on the dashboard (emptiest first).
- **Order history:** each order line keeps the level when ordered (snapshot on
  submit, and on rule-made orders) and, once delivered, what it was refilled
  to. Shown on the order's tanks table ("Level ordered → refilled") and in an
  **Order history** section on the asset page (last 10).
- **Preferred windows** (`PreferredWindows.tsx`): none, one or several,
  half-hour steps, always inside the delivery window (trimmed when it
  shrinks). Set on an order, on a ship-to (new orders there start with it;
  Ship-tos list column) and on a recurring rule (its orders inherit them).
- "Nearly empty" banner now = the Urgent band (≤10%).

- **Level and battery are two columns** wherever tanks are listed (Assets
  list, ship-to assets, order form, dashboard, Orders' nested tanks).
- **Orders list rows expand** (DS expandable row, now an opt-in on the shared
  `ListTable` via `renderExpanded`): each order's tanks — product, qty, level
  ordered → refilled, tank level now, battery.
- **Recurring Orders columns are fixed to their longest content:** Rule 180 ·
  Products 150 · Qty 100 · Orders Made 120 · Status 100.
- **No band words** (Urgent / Low / Moderate / Sufficient) on any screen —
  the level is a gauge in the band's colour and the %.
- **What an order does to the tank** (`orders.ts` tank arithmetic, each asset
  has a monitor `dailyUse`): in the tank now = level% × capacity; days to
  empty = now ÷ daily use; left at delivery = now − daily use × days until
  delivery; **suggested = capacity − left at delivery** (full on the day,
  sum on hover, press to use); **on fulfilment = (left + ordered) ÷ capacity**.
- **Order form tanks:** Asset · Product · Qty · Top off · Current level · On
  fulfilment · Suggested · Days to empty (sent orders: on fulfilment =
  ordered → refilled %). **Orders' nested layer:** Asset · Product · Qty ·
  Current level · On fulfilment · Days to empty · Battery. Days to empty also
  on the Assets list and dashboard card; red when it runs out before delivery.
- **Two dates (Pavan, 2026-10-19):** the **request's own date** (the day it was
  sent to the tenant, `sentOn`) sits under its number in the Request # column;
  the **Planned date** (`date`) is when the customer wants it delivered —
  the column before Status, the order form's field, and what every tank sum
  counts to. "Requested date" is no longer used.

## Requests → orders (Pavan, 2026-10-19)

- **Orders page = a segment before the search: Orders · Order Requests**
  (Orders first). One menu item; the same height as search and filters.
- **A request (REQ-…)** is the customer's ask, one ship-to. Its statuses end
  at **Partly accepted** / **Accepted** (or Rejected / Cancelled). It keeps
  its quote and history; its Orders column and nested layer say where each
  tank went (order # + status, or Pending); its page lists its orders.
- **An order (ORD-…)** is the tenant's, built from one or more requests —
  a request's tanks may sit on one order or be split across several. The
  customer sees only their tanks. Statuses: Scheduled · Change requested ·
  Cancellation requested · Out for delivery · Partial · Delivered · Invoiced
  · Invoice disputed · Paid. Column "From Request" + page header links back.
  Trip, invoices, delivery papers, flags, late/partial/past-due banners live
  on orders; quotes, action needed, low tanks on requests.
- **Request change** (order ⋯, while Scheduled): what (planned date, window,
  quantity, tanks or products, cancel, other) + note → "Change requested"
  (or "Cancellation requested") until the tenant answers.
- One store, `kind: "order"`; `requestNo` carries either number. Seed split by
  `splitSeed` (one Partly accepted, some split per tank). Invoices bill orders
  (`orderNo`).
- **UPDATE (same day): one Orders list, no segment.** Rows = one per request
  per order it went on (`orderListRows`): a request not yet accepted is one
  row in its own status; an accepted one is a row per order (that order's
  status, date, papers; only this request's tanks); a partly accepted one's
  waiting tanks are one more row, In review, Orders = "Pending". Columns =
  the order-request columns (Orders shows the row's order #). **Group By**
  beside Filters: Request · Order number · Status · Ship-to. All alerts on
  the one list. A row opens its order (or its request); View quote opens the
  request. Requests: no "Sent" step (submitted → In review); lanes Accepted
  before Partly accepted; Action needed stays after In review.
- **Dashboard after the Anirudh review (2026-10-19):** Attention required =
  credit holds (one tile, a count, no balance) · quotes waiting · running late
  (planned date passed, not delivered) · no proof of delivery (no delivery
  ticket) — nothing else. Then Schedule (next 7 days, Request + Order),
  Tank levels, Spend (total + by week + by product, history only — no
  market comparison anywhere), Billing & credit. Delivery performance is
  the Reports page; Asset health removed.
