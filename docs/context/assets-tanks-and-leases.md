# Assets, Tanks and Leases

> **Load this when:** working on rental assets, tanks, totes, trailers, tank monitors, tank levels, fuel deliveries into a tank, leases or contracts, committed volume, movement (asset) orders, the asset journey, the asset activity log, service orders / inspections / compliance / leak checks / peripherals / invoices on an asset, Asset 360, or 3PL Rental Assets. **Not for:** the Master Data module itself — its menu, pages and data rules (master-data.md); delivery-order lifecycles (delivery-orders.md); brokered 3PL order workflow (3pl-brokerage.md); service-work flows beyond what shows on an asset (service-work.md); customers and ship-to sites (customers-and-sites.md).
> **Sources:** `prototypes/unified-view/masterdata/README.md` and headers of `assets.ts`, `story.ts`, `AssetSheet.tsx`, `AssetJourney.tsx`, `AssetOrderForms.tsx`; `prototypes/unified-view/threepl/README.md` (asset parts); `docs/archive/asset-360-versions-2026-11-03.md`; memory notes `project_master_data.md`, `feedback_no_tank_monitor_rules.md`. **Last updated:** 2026-11-06.

## In one paragraph

FleetPanda rents fuel-storage assets (tanks, totes, trailers) to customers and
fills them. An asset is either a **rental** (ours, on rent to a customer under a
lease) or **customer owned** (theirs, but we still deliver into it and keep a
record). Each asset has a type, a condition, a status, a place (customer + site),
an optional **tank monitor** that reports the level, a run of **leases**, the
**fuel deliveries** that went into it, **movement orders** that carry it between
yards and sites, and a service side (service orders, maintenance plans,
compliance, leak checks, fitted parts, invoices). **Asset 360** is the one
screen that tells an asset's whole story: figures, details, movement orders, a
**journey** timeline and an **activity log**. Asset numbers (level, capacity,
deliveries, contract use) are always worked out from the record, never typed
twice.

## Glossary

| Term | Meaning |
|---|---|
| Asset | A rented or customer-owned storage unit we deliver into. Asset ID like `TK-2201` (tank), `TT-` (tote), `TR-` (trailer), `CO-` (customer owned). The record also has an internal key that stays put if the ID is retyped. |
| Asset type | 275 gal tote · 500 gal skid tank · 1,000 gal tank · 2,000 gal fuel tank · Transport trailer. |
| Ownership | **Rental** or **Customer owned**. Customer-owned assets have no monthly rate and no lease. |
| Condition | New · Refurbished · Used. |
| Status | **On rent** (rental, at a customer under a lease) · **Available** (in our yard) · **Service due** · **On site** (customer-owned, at the customer's site). |
| Product | What the tank holds: Dyed Diesel, Clear Diesel, Unleaded 87, DEF, Heating Oil. |
| Capacity | Gallons the tank holds; set by its type. |
| Rate | Monthly rental rate. Empty for customer-owned. |
| Tank monitor | A sensor on the tank (e.g. model "FP Sense 2", ID `MON-…`). Monitor state: **Linked · Not linked · No monitor**. Reports gallons in the tank and a **last ping** time. |
| Level | Gallons at last ping ÷ capacity, as a whole %. Shown only when a monitor is linked. |
| Fuel delivery | A fill into the asset (`DL-…`): date, product, gallons, carrier, amount, proof of delivery (Attached / Not attached). |
| Lease / contract | `LA-…`: status **Draft · Signed · Active · Ended**, from/to dates, optional **committed volume** (gallons the customer agrees to take). |
| Contract use | Gallons delivered since the Active lease began, against its committed volume. |
| Movement order (asset order) | `AMO-…` in Asset 360 — moves one asset from one place to another. Status **Draft · Scheduled · In transit · Completed**; documents **Attached / Pending**; source Dispatch · Customer request · Lease. |
| Route (movement type) | 3PL's words: Delivery (yard → ship-to) · Pickup (ship-to → yard) · Transfer (ship-to → ship-to) · Relocate (yard → yard). |
| Placement | One stretch of the asset's life at one place (yard, workshop, or on lease at a site), with dates and the lease/order behind it. |
| Journey | The asset's placements and milestones as a timeline. |
| Activity log | Every real past event on the asset, newest first. |
| Service order | `SO-…`: job, technician, scheduled time, amount, stage **Open · Assigned · Completed · Invoiced**, documents. |
| Service agreement | `SA-…`: plan Basic / Plus / Premium, visits used of total, renewal date, auto-renew. |
| Maintenance plan | A repeating job (filter change, annual leak check, pump inspection, gauge calibration…) with cadence, last and next date, and whether it auto-generates a service order. |
| Compliance item | A requirement (tank tightness test, spill kit inspection, secondary containment) with authority (State EPA / State DEC / OSHA), last and due date, status **Current · Due soon · Overdue**. |
| Leak check | `LC-…`: date, technician, method (pressure decay, vacuum), pressure, result **Pass / Fail**. |
| Peripheral | A part fitted to the asset — Pump · Nozzle · Hose · Meter · Filter — with model, serial, install date, warranty end, status **Active · Expiring · Expired**. |
| Invoice (on an asset) | `INV-…` raised from a service order: issued, due, total, status **Draft · Sent · Paid · Overdue**. |
| Asset 360 | The full record sheet for one asset (in Master Data). |
| Rental Assets (3PL) | The 3PL Directory list of rental assets. |

## How it works

### The asset record
- Identity: Asset ID, type, ownership, condition, status, record status
  (active/archived).
- Placement: customer, site, address, placed-on date, on-rent-since date.
- Rental terms: monthly rate (rentals only).
- Capacity and product: capacity in gallons, product held.
- Plus: monitor, leases, deliveries, movement orders, placements (journey),
  service orders, service agreement, maintenance plans, compliance items, leak
  checks, peripherals, invoices, and an audit history.
- The asset form (3PL's) has four sections: Identity · Capacity and product ·
  Placement · Rental terms.
- The form's Customer and Site pickers read the customers and ship-tos as
  currently edited.

### Numbers are derived, never typed
- **Level %** = monitor gallons ÷ capacity, only when the monitor is linked;
  otherwise there is no level.
- **Deliveries** figures (last delivery, count and gallons this month, total
  gallons) are counted from the delivery records.
- **Contract use** = gallons delivered since the Active lease's start, against
  its committed gallons. No committed volume → no contract use.
- So the list and Asset 360 always show the same numbers.

### Business rules on assets
- A tank holds what its type says (a 500 gal skid tank is 500 gal); picking a
  type fills an empty capacity.
- **One Active lease at a time.** Typical run: earlier lease Ended, current one
  Active, next one Draft (a renewal not yet signed). A Signed lease is one that
  starts in the future.
- A transport trailer has no deliveries and no contract volume.
- Customer-owned assets have a full record and their own figures, but no rate
  and no leases.
- Every fuel delivery is also an event in the asset's history — one source.
- A movement order carries exactly **one asset and no quantity** (so it is not a
  delivery order with lines).

### Tank monitors
- An asset may have no monitor, a monitor not linked, or a linked monitor.
- Actions on Asset 360: **Link / Unlink monitor**.
- A linked monitor gives the level and the last ping time; the level shows as a
  figure and a gauge.
- In 3PL delivery orders, the asset picker's Fuel tab can be narrowed to
  **All · Tank Monitors · No Tank Monitors**; every ship-to's sample data has
  both monitored and unmonitored tanks.
- **Rule:** do not propose, ask about or list any tank-monitor-triggered rule or
  order ("order when below X%", level-triggered recurring rules) until Pavan
  raises it himself. Existing monitor fields stay as they are.

### Deliveries into tanks
- A delivery belongs to the asset it filled; it feeds the deliveries figure,
  contract use and the activity log ("Fuel delivered").
- Proof of delivery is tracked per delivery (Attached / Not attached).
- Customer 360 and Ship-to 360 read tank fills from the assets (see
  master-data.md for the one-source rule).

### Movement orders (asset orders)
- Created from Asset 360 → **Create order → Movement order**. Form fields
  (Lovable's, on our form template): Asset (filled in) · From location · To
  location · Movement type (route) · Scheduled date · delivery window ·
  Fulfillment (First party / 3PL) · Notes · Linked asset order (or
  "Independent").
- The window uses the shared delivery-window timeline (window + preferred
  times).
- A new movement order starts as **Draft** and appears on the record and its
  history.
- Asset 360 shows movement orders as a table and as a board by status.
- Only **Completed** moves enter the activity log ("Moved", from → to);
  Scheduled or Draft moves in the future appear on the journey as upcoming
  milestones ("Move to …").
- In 3PL the same idea is **Asset Orders** (renamed from "Movement Order",
  2026-09-17): four routes, the order stores *from* and *to*; the assets offered
  are always the origin's (what is in that yard, or on rent at that site); a
  route cannot end where it started; customer notes follow the customer end;
  the asset is fixed at creation; pricing is Fee + Tax, not per gallon; status is
  a free-standing lifecycle set by a select. 3PL's Create Order offers Delivery
  Order · Asset Order (then pick one of the four routes).

### Service side of an asset
- **Service order** from Asset 360 → Create order → Service order. Fields
  include Service fulfillment (First party / Carrier), Asset, Customer, Service
  site, Ownership, technician. A new one starts **Open**.
- Service orders run Open → Assigned → Completed → Invoiced; a completed job can
  be signed off from the field app.
- **Maintenance plans** can auto-generate service orders on their cadence.
- **Service agreement** limits visits per period and may auto-renew.
- **Compliance**, **leak checks**, **peripherals** and **invoices** are tracked
  per asset (see Glossary for their states).

### The asset journey
- **Lifeline:** one bar from joining the fleet to the expected contract end.
  Each placement is a stretch sized by its length (on lease · at a yard or site
  · in the workshop); the future is a dashed line; today is marked. Above it:
  "In the fleet since", "At its current place since", "Contract ends · in N
  days".
- **Milestones:** oldest first, dated. Done = solid; the current placement is
  the highlighted card; expected events (scheduled move, contract end, renewal)
  sit under a "Today" divider. Opens scrolled to today. Narrowed by search and
  Status (Done · Current · Upcoming).
- Milestone wording: first placement "Received into the fleet at" (rental) or
  "Registered at" (customer owned); then "In the workshop at" / "Placed at" /
  "Moved to". Lease milestones: **Contract started · Contract ended · Contract
  expected to end · Contract starts** (Signed) **· Renewal would start**
  (Draft). The lease ID appears only in the pill.

### The activity log
- Holds **real past events only**, up to the data's today — nothing planned.
- Types: **Deliveries · Service · Equipment · Billing · Movement · Lease ·
  Asset**. Sources: deliveries, service orders, compliance checks, leak checks,
  parts fitted, invoices, completed moves, leases that started, and record
  history (created, edits).
- **No repeated words:** a detail never restates its title or date; two rows
  never tell one event twice (audit rows duplicating an invoice or completed
  move were dropped).
- Layout chosen: a tile per type with its count and key figure (a tile is a
  quick filter), the full table below.

### Asset 360 (what is on it)
- Full side sheet over the asset list, no footer.
- Header: asset · type · customer · site, pills, **Create order** (Movement
  order · Service order), ⋯ Archive.
- Four figures: tank level · capacity and product · fuel deliveries · monitor.
- Left: three tabs — **Asset movement orders · Asset journey · Asset activity
  log** — under one search + Filters bar (Status everywhere; Type on the log)
  that holds across tabs. Rows open a read drawer.
- Right: asset details as a card per subject — **Placement · Contract** (active
  lease, ends in N days, volume used) **· Tank and monitor** (level first) —
  each with Edit details → the asset form over the sheet (autosaves).
- Creating a new asset uses the standard form sheet.

### 3PL Rental Assets
- One of the four 3PL Directory lists (with Customers, Vendors, Products); same
  list shape, no date scope.
- Its group total is **monthly revenue, on-rent assets only** — capacity is not
  summed, because tanks don't pool into one tank.
- Sample data: 120 assets; serials and rental rates invented; the four assets
  flagged rental in the ship-to data are on rent to the same accounts at the
  same sites, so an asset is never at a customer on one screen and in the yard
  on another.
- In Master Data, a 3PL rental asset link opens in 3PL.

## Decisions already made

- **2026-09-17** — "Movement Order" renamed **Asset Orders** in 3PL; two
  directions widened to four routes (Delivery · Pickup · Transfer · Relocate).
- **2026-10-16 / 2026-10-17** — No tank-monitor-triggered rules or orders until
  Pavan raises it. On 2026-10-17 tank-monitor logic and a level gauge went on the
  review checklist (most tanks have a monitor); level-triggered auto rules still
  only when asked.
- **2026-10-29** — 3PL asset picker: Fuel tab narrowed by radios All · Tank
  Monitors · No Tank Monitors.
- **2026-11-02** — Asset 360 is a full side sheet in the Lovable layout; Create
  order offers Movement order and Service order; Asset 360's movement type uses
  3PL's route words, not Lovable's verbs.
- **2026-11-02** — Fixed against Lovable: one set of numbers; capacity follows
  type; one Active lease at a time; no deliveries/contract volume on the
  trailer; customer-owned assets have a record (CO-1210 its own figures).
- **2026-11-03** — Journey is a timeline (lifeline + milestones), not a table.
- **2026-11-03** — Activity log = type tiles over the table (V3); details = a
  card per subject (V3). V1/V2 archived (`docs/archive/asset-360-versions-2026-11-03.md`, commit `9dbd7cc`).
- **2026-11-03** — Movement order window uses the shared delivery-window
  timeline.
- **2026-11-03** — No repeated words in journey/log; wording lives in
  `story.ts` and is checked by the `repeated-copy` eval.
- **2026-11-03** — TK-2201's site is Event Depot, where its journey puts it
  today.

## Open questions / conflicts

- **Two movement-order vocabularies.** Asset 360 statuses are Draft ·
  Scheduled · In transit · Completed; 3PL asset orders have their own lifecycle
  (status chosen by a select). Sources don't say whether these are meant to be
  the same list.
- **3PL Create menu.** One 3PL README section says Create = Delivery Order /
  Asset Delivery / Asset Pickup; a later one says Create Order = Delivery Order
  · Asset Order → four route boxes. The later (four routes) is current.
- **Asset 360 header actions.** README's first Assets section lists separate
  Movement order / Service order buttons; the 2026-11-03 section has one
  **Create order** menu. Later wins: Create order menu.
- **Details position.** The README's first Assets section is self-contradictory
  ("left, Asset details … on the RIGHT"); the 2026-11-03 section and the
  `AssetSheet.tsx` header settle it: tabs left, details rail right.
- Tank-monitor-driven ordering is deliberately not open — do not raise it.

## Where it lives

- Data and rules: `prototypes/unified-view/masterdata/assets.ts`
- Journey and log wording: `prototypes/unified-view/masterdata/story.ts`
- Asset 360: `AssetSheet.tsx`, `AssetViews.tsx`, `AssetJourney.tsx`,
  `AssetActivity.tsx`, `AssetDetails.tsx`, `AssetOrderForms.tsx`,
  `AssetsScreen.tsx` (all in `prototypes/unified-view/masterdata/`)
- 3PL rental assets and asset orders: `prototypes/unified-view/threepl/README.md`
  (Directory, "An asset order is a route between two places")
- Archived Asset 360 versions: `docs/archive/asset-360-versions-2026-11-03.md`
- Sibling docs: master-data.md · delivery-orders.md · 3pl-brokerage.md ·
  fuel-supply-and-sourcing.md · fleet-trucks-and-routes.md ·
  dispatch-and-operations.md · customers-and-sites.md · customer-portal.md ·
  service-work.md · sales.md · product-overview.md
