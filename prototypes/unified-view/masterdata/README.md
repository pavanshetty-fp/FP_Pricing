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
  the workshop), the future outlined, TODAY in the accent violet — with "In
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
