# Master Data

A module of its own (2026-11-02), after the Lovable "unified UI" reference's
Master Data menu: **Directory** — Customers, Ship-tos, Assets, Products,
Vendors, Terminals, Suppliers — and **Documents** — All documents.

Only **Assets** is built. The other pages show "Not built yet".

## Assets

- **List** — `DirectoryEntityScreen` (the 3PL Directory template): search,
  filters, group by, columns, saved views, export, Add New Asset beside Export.
  Columns copied from the reference: Asset · Ownership · Customer · Monitor ·
  Deliveries · Contract · On rent · Status.
- **Record — Asset 360** (`AssetSheet.tsx`) — a FULL side sheet in the
  reference's layout (Pavan, 2026-11-02): header with the asset, its pills and
  Movement order / Service order; four figures across (tank level, capacity
  and product, fuel deliveries, monitor); left, Asset details (read-only, with
  Edit details opening the asset form over the sheet — 3PL's sections:
  Identity · Capacity and product · Placement · Rental terms) on the RIGHT;
  on the LEFT three view tabs — Asset movement orders · Asset journey · Asset
  activity log — under ONE search + Filters bar (Type: Deliveries · Service ·
  Equipment · Billing · Movement · Lease · Asset; Status) that holds across
  tabs (`AssetViews.tsx`). The activity log carries every delivery, service
  order, maintenance, compliance and leak check, peripheral, invoice and lease
  up to the data's today. Movement orders also show as a board by status.
 Creating an asset still uses the standard form sheet.
- **Actions** — Movement order and Service order add a Draft/Open order to the
  record and its history; Link / Unlink monitor.

## Fixed against the reference

- One set of numbers: level, capacity, deliveries and contract use are worked
  out from the record, so the list and the record agree.
- A tank holds what its type says; picking a type fills an empty capacity.
- One Active lease at a time (earlier Ended, next Draft).
- No deliveries / contract volume on the transport trailer.
- Customer-owned assets have a record; CO-1210 has its own figures.

## Asset 360 (current, 2026-11-03)

- Full side sheet, no footer. Header: asset · type · customer · site, pills,
  **Create order** (menu: Movement order · Service order → create sheets at
  level 2, `AssetOrderForms.tsx`, the reference's fields on our form template;
  movement type uses 3PL's route words), ⋯ Archive.
- Four figures across; **Asset details** rail on the RIGHT (Edit details →
  the asset form at level 2, autosaves).
- LEFT: three view tabs — Asset movement orders · Asset journey · Asset
  activity log — under one search + Filters (Status everywhere, Type on the
  log). Each is the full list unit (`ListTable` + pagination, frame fills the
  height, Search by column + Columns, rows open a read drawer). Movement
  orders also show as a board by status.
- The activity log holds real past events only (deliveries, service orders,
  inspections, parts fitted, invoices, completed moves, leases, history).

## 2026-11-03

- **Asset journey is a timeline, not a table** (`AssetJourney.tsx`). Top: the
  lifeline — one bar from joining the fleet to the expected contract end,
  each placement a stretch (blue on lease, grey at a yard or site, yellow in
  the workshop; no outlines), the future a thin dashed line, TODAY in the accent violet — with "In
  the fleet since", "At its current place since", "Contract ends · in N
  days". Below: milestones oldest-first, dated left, the Activity card's
  marks and line; the current one is the highlighted card, what is expected
  (scheduled move, contract end, renewal) dashed under a "Today" divider;
  opens scrolled to today. Search and Status (Done · Current · Upcoming)
  still narrow it; no column tools, no pages.
- **Movement order window** uses the shared `DeliveryWindowTimeline` (window
  + preferred times), via a new `render` option on form fields
  (`FormFieldDef.render`, drawn full width by `DirectoryRecordSheet`).
- TK-2201's site is Event Depot — where its journey puts it today.
- **Chosen 2026-11-03:** activity log = type tiles over the table
  (`AssetActivity.tsx`), details = a card per subject (`AssetDetails.tsx`).
  The other versions are archived — `docs/archive/asset-360-versions-2026-11-03.md`
  (restore from commit 9dbd7cc).
- **Docking (2026-11-03):** the figures scroll away; the work area (tabs,
  search, tiles, table, rail cards) is one sheet-height tall and docks at the
  top — a wheel over it scrolls the sheet first, then the table / cards.

- **No repeated words** (Pavan, 2026-11-03). The journey and log wording
  lives in `story.ts` (plain data, no React) so the `repeated-copy` eval can
  read every line: a detail never restates its title or its own date, and
  two log rows never tell one event twice. A new lease on a placement says
  "Contract started"; lease milestones read Contract ended / Contract
  expected to end / Contract starts / Renewal would start, the ID only in
  the pill. Dropped: the audit rows that repeated an invoice or a completed
  move, and "Asset record created" under "Created".

## Customers (2026-11-03)

- **List** (`CustomersScreen.tsx`) — the reference's columns on the Directory
  template: Customer (name · ERP ID), Primary POC, Region, Ship-to sites,
  Terms, Credit, Exposure (bar against the limit), Open orders, YTD revenue.
  Open orders and YTD revenue are COUNTED from the orders, never typed (the
  reference's form asked for them).
- **Record = the 3PL Directory customer** (`BrokerCustomer`) and its form
  (`customerFormSections`) — same data, same form — plus aging, average days
  to pay and the last credit review (`customers.ts`).
- **Customer 360** (`CustomerSheet.tsx`) — Asset 360's sheet: header (status,
  credit, Over limit pills — the 3PL sheet's), four figures (revenue, gross
  margin, gallons delivered, open orders), two trends by month (volume,
  margin — the dashboards' bars), then the docked work area: six tabs left
  (orders across modules + board, products delivered, ship-to sites, assets
  on site, recurring schedules, leases and contracts), a card per subject
  right (Credit and payment, Contact, Account, Instructions), Edit details →
  the customer form at level 2.
- **One source each**: tank fills and service orders come from the assets,
  leases from the assets' leases, ship-tos and recurring schedules from
  `customers.ts`. The asset form's Customer and Site pickers read these.
- **Shared now**: `RecordViews.tsx` (tabs + one search/filters + full table
  unit + board + drawer) and `sheetParts.tsx` (figures, docking work area —
  a callback ref, since the sheet is a portal) serve both 360 sheets.
- Reference mismatches fixed: Meridian Oil had Agriland's figures; list
  ship-to counts vs the sites; "No leases" with TK-2201 on lease; a service
  job listed as a product; 31–60 days not counted overdue; regions vs the
  assets' addresses. Lovable's "Watch" credit → our **On hold**; "Net 7" →
  **Net 15** (our terms list has no Net 7).

## Ship-tos (2026-11-03)

- **List** (`ShipTosScreen.tsx`) — the reference's columns: Ship-to (ST-1001…,
  in a block of a thousand per customer), Location (+ Default pill),
  Customer, Address, Contact, Rental assets, Customer-owned, Status. The two
  asset counts are COUNTED from the assets on the site.
- **Record** — the Directory's `ShipToLocation` fields (address lines,
  coordinates, default site, record status) plus customer by name, site
  contact and phone (`customers.ts`). Form: Identity, Address (with
  latitude/longitude), Site contact.
- **Ship-to 360** (`ShipToSheet.tsx`) — the same sheet as the other 360s:
  four figures (deliveries, gallons, revenue, open orders), two trends
  (volume, spend by month), three tabs (orders and deliveries — Customer
  360's orders tab without the Site column — assets on site, invoices), and
  the rail: Location (the board card's `SiteMiniMap`: the site radius and
  its assets) and Details (customer → opens that Customer 360, contact,
  terms, assets placed).
- Invoices: one per invoiced delivery, due on the customer's terms, past due
  only where the customer's aging says so; plus the site's assets' service
  invoices.
- Customer 360 and the asset pickers read the ship-tos as edited
  (`currentShipTos`). A jump between 360s now writes the opened record into
  the address (DirectoryEntityScreen focus).

## Products, Vendors, Terminals, Suppliers (2026-11-03)

- **Products and Vendors ARE the 3PL Directory's lists** (`BrokerProductsScreen`,
  `BrokerVendorsScreen`) — same records, same state: an edit in Master Data
  shows in 3PL and back. Master Data passes its own `urlKey` and navigator (a
  vendor or product opens in Master Data; a 3PL customer or rental asset
  opens in 3PL). The reference's Products "Stocked at" is a new column on the
  shared list, read from the loading accounts (`terminalsStocking`).
- **Terminals and Suppliers** (`FuelSourceScreens.tsx`, data `terminals.ts`) —
  the reference's columns on the Directory template, with the standard
  record sheet (form + read sections). The LOADING ACCOUNT ties them: the
  3PL load orders' accounts plus the reference's markets'. A terminal's
  suppliers, a supplier's terminals, both counts, a supplier's markets and
  lines of service are read from the accounts (the reference's counts
  disagreed with each other). Terminal sheet: the site map with the rack
  radius (`SiteMiniMap` `minRadius`), products loaded, suppliers, accounts.
- Lovable supplier types "distributor / NA / other" → Major oil, Distributor,
  Trader, Retail partner.
