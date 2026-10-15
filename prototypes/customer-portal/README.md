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
- **Roles** Manager · Buyer · Viewer — only "manager" is in the real data;
  Buyer and Viewer are INVENTED until the real list is known.
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

## Open

- Should "summary card on the right while creating" apply to all modules?
- Statements — a tab in Invoices?
- Duplicate-order warning on submit (PRD FR-23) not built.
- Overview compares with last week's full day; should be same time of day.
