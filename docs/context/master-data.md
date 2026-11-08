# Master Data

> **Load this when:** working on the Master Data module — its menu, any Directory page (Customers, Ship-tos, Assets, Products, Vendors, Terminals, Suppliers), All documents, the 360 record sheets, copying a page from the Lovable reference, or deciding where a record's data comes from. **Not for:** what an asset, lease or movement order *is* (assets-tanks-and-leases.md); customer and site facts (customers-and-sites.md); terminals, suppliers and loading accounts in supply terms (fuel-supply-and-sourcing.md); 3PL order workflow (3pl-brokerage.md); delivery orders (delivery-orders.md).
> **Sources:** `prototypes/unified-view/masterdata/README.md`; headers of `masterdata/assets.ts`, `customers.ts`, `terminals.ts`, `AssetSheet.tsx`, `AssetOrderForms.tsx`; `prototypes/unified-view/threepl/README.md` (Directory, change log 2026-11-02/03); memory notes `project_master_data.md`, `feedback_master_data_mirrors.md`. **Last updated:** 2026-11-06.

## In one paragraph

Master Data is a module of its own in the Unified View (added 2026-11-02). It
is the **home of every record** — customers, ship-tos, assets, products,
vendors, terminals, suppliers, documents — even when another module (3PL,
Service, Sales, Dispatch) already shows the same record. That repetition is
intended. Its menu and pages are copied from the **Lovable "unified UI"
reference**, but Lovable's data mismatches are fixed, not copied. Each page is
a list on the shared Directory template; the big records (Asset, Customer,
Ship-to) open a **360** full side sheet. Every figure is derived from one
source, so a number reads the same on every screen.

## Glossary

| Term | Meaning |
|---|---|
| Master Data | The module that holds every record in one place. |
| Directory | The menu group of record lists: Customers · Ship-tos · Assets · Products · Vendors · Terminals · Suppliers. |
| Documents | The menu group with one page: All documents. |
| Lovable reference | The "unified UI revamped" prototype on Lovable that Master Data is copied from (menu, columns, 360 layout, form fields). |
| Directory template | The shared list screen (from 3PL's Directory): search, filters, group by, columns, saved views, export, and the create button beside Export. |
| 360 | A full side sheet for one record: header, four figures, a docked work area of tabs on the left and detail cards on the right, Edit details opening the record's form over it. |
| Record sheet | The standard (non-360) sheet: form plus read sections. Used by Terminals and Suppliers. |
| One source each | Every fact is stored once; every other screen reads or counts it from there. |
| Mirror | The same record shown in Master Data and in another module — same data, same state. |
| Loading account | The record that ties a terminal to a supplier and the products drawn on it; the source for terminal/supplier counts. |

## How it works

### Purpose
- One place to find and edit any record the business holds.
- Mirrors other modules on purpose: 3PL movement orders, service orders,
  customers, vendors, products and more can live both in their module and in
  Master Data; more will be added over time.
- When building it, "this already exists in module X" is **not** a doubt or a
  conflict. Do reuse the same components and the same words for the same data.

### Menu
- **Directory:** Customers · Ship-tos · Assets · Products · Vendors · Terminals
  · Suppliers.
- **Documents:** All documents.
- The module opens on Assets.

### Page status (as of 2026-11-06)

| Page | Status | How it is built |
|---|---|---|
| Assets | Built | Directory list + Asset 360 |
| Customers | Built | Directory list + Customer 360 |
| Ship-tos | Built | Directory list + Ship-to 360 |
| Products | Built | 3PL Directory's Products list, reused |
| Vendors | Built | 3PL Directory's Vendors list, reused |
| Terminals | Built | Directory list + standard record sheet |
| Suppliers | Built | Directory list + standard record sheet |
| All documents | Not built | Shows "Not built yet" |

### Pages in brief (entity facts live in the entity docs)

**Assets** — columns: Asset · Ownership · Customer · Monitor · Deliveries ·
Contract · On rent · Status. Opens Asset 360. Details of assets, leases,
movement orders, journey and log: see assets-tanks-and-leases.md.

**Customers** — columns: Customer (name · ERP ID) · Primary POC · Region ·
Ship-to sites · Terms · Credit · Exposure (against the limit) · Open orders ·
YTD revenue.
- The record **is** the 3PL Directory customer, with the same form; Customer 360
  adds aging, average days to pay and last credit review.
- **Open orders and YTD revenue are counted from orders, never typed** (Lovable's
  form asked for them).
- Customer 360: figures (revenue, gross margin, gallons delivered, open
  orders), monthly trends (volume, margin), six tabs (orders across modules,
  products delivered, ship-to sites, assets on site, recurring schedules,
  leases and contracts), cards (Credit and payment, Contact, Account,
  Instructions).

**Ship-tos** — columns: Ship-to (`ST-1001…`, a block of a thousand per
customer) · Location (+ Default) · Customer · Address · Contact · Rental assets
· Customer-owned · Status. The two asset counts are counted from assets on the
site.
- Record: the Directory's ship-to fields (address, coordinates, default site,
  record status) plus customer, site contact and phone. One default site per
  customer.
- Ship-to 360: figures (deliveries, gallons, revenue, open orders), monthly
  trends (volume, spend), tabs (orders and deliveries, assets on site,
  invoices), rail (site map with radius and assets; details with a link that
  opens that Customer 360).
- Invoices: one per invoiced delivery, due on the customer's terms, past due
  only where the customer's aging says so; plus the site's assets' service
  invoices.

**Products and Vendors** — these **are** the 3PL Directory lists: same records,
same state. An edit in Master Data shows in 3PL and back. In Master Data a
vendor or product opens in Master Data; a 3PL customer or rental asset opens in
3PL. Products gained a shared "Stocked at" column, read from loading accounts.

**Terminals and Suppliers** — Lovable's columns on the Directory template with
the standard record sheet. A terminal's suppliers, a supplier's terminals, both
counts, a supplier's markets and lines of service are all **read from loading
accounts** (3PL load-order accounts plus Lovable's markets). Terminal sheet:
site map with the rack radius, products loaded, suppliers, accounts. Supplier
types: Major oil · Distributor · Trader · Retail partner.

### How a new page is built
- Same pattern every time: a config for the shared Directory list in
  `masterdata/`, plus a record layout (360 or the standard record sheet).
- Copy Lovable's menu, columns and fields — **but fix its data mismatches**
  rather than copying them, and note each fix.
- Where 3PL already has the list and record, **reuse it** (Products, Vendors,
  customer record and form, asset form) instead of building a second copy.
- Create/order forms use our form template with Lovable's fields, and our
  vocabulary where the two differ.
- Jumping between 360s (e.g. ship-to → customer) writes the opened record into
  the address bar.

### One-source data rules
- Tank fills and service orders come from the **assets**.
- Leases come from the **assets' leases**.
- Ship-tos and recurring schedules come from **customers.ts**.
- Orders across modules for a customer = deliveries into its tanks (from
  assets) + bulk deliveries to its sites + service orders (from assets).
- Counts on lists (open orders, YTD revenue, ship-to counts, asset counts per
  site, terminal/supplier counts) are **counted**, never typed.
- Pickers read records as currently edited (e.g. the asset form's Customer and
  Site pickers read the edited customers and ship-tos).
- Products and Vendors share state with 3PL — one record, two screens.
- Sample names are not invented where another module already has them; sample
  dates are offsets from the prototype's today.

### Lovable mismatches fixed so far
- **Assets:** list and record disagreed on level/capacity (TK-2201: 23% of
  1,000 gal in the list, 62% of 500 gal inside). The other asset fixes are
  listed in assets-tanks-and-leases.md.
- **Customers:** Meridian Oil carried Agriland's figures; list ship-to counts
  didn't match the sites; Agriland showed "No leases" with TK-2201 on lease; a
  service job listed as a product; 31–60 days not counted overdue on Net 15;
  regions disagreed with the assets' addresses.
- **Words mapped to ours:** Lovable credit "Watch" → **On hold**; "Net 7" →
  **Net 15** (our terms list has no Net 7); supplier types "distributor / NA /
  other" → Major oil · Distributor · Trader · Retail partner; movement verbs →
  3PL route words.
- **Terminals/Suppliers:** terminals listed four suppliers each while suppliers
  named nine terminals between them — now both read from loading accounts.

## Decisions already made

- **2026-11-02** — Master Data menu built after Lovable; only Assets worked on
  first, the rest "Not built yet". List on the 3PL Directory template; Asset
  360 a full side sheet in Lovable's layout. Lovable's data mismatches fixed,
  not copied.
- **2026-11-02** — Directory lists put "Add New …" on the view row beside
  Export (all lists).
- **2026-11-03** — Pushed Assets (main `40a18a9`, synced to FP_Service-Work
  `628fcd9`); Asset 360 final version pushed `efb1ab7`, not synced at that
  time.
- **2026-11-03** — Master Data holds every record; repetition with other
  modules is intended ("all data will be available in master data as and when
  I add it").
- **2026-11-03** — Build all Master Data pages from Lovable one by one.
  Customers, Ship-tos, Products, Vendors, Terminals, Suppliers built the same
  day; the two 360 sheet parts became shared (tabs/search/table/board/drawer;
  figures and docked work area).
- **2026-11-03** — Products and Vendors reuse the 3PL lists with shared state.

## Open questions / conflicts

- **README is stale at the top.** The Master Data README's opening and the 3PL
  README change log (2026-11-03) both say "only Assets is built"; later README
  sections and memory (2026-11-03) show six more pages built. Later wins: only
  All documents is unbuilt.
- **3PL Directory "no create CTA".** The 3PL README's Directory section says
  Directory lists have no create button (records onboarded elsewhere); the
  2026-11-02 change log moved "Add New …" beside Export on every list, and
  Master Data Assets has Add New Asset. Later wins: lists have the create
  button.
- **Push state.** Customers through Suppliers were pushed to main as
  `798c3ec` (2026-11-03); not synced to FP_Service-Work.
- **All documents** — next page to build; no design yet.

## Where it lives

- Module code: `prototypes/unified-view/masterdata/` — `README.md`; data
  `assets.ts`, `customers.ts`, `terminals.ts`, `story.ts`; screens
  `AssetsScreen.tsx`, `CustomersScreen.tsx`, `ShipTosScreen.tsx`,
  `FuelSourceScreens.tsx`; 360s `AssetSheet.tsx`, `CustomerSheet.tsx`,
  `ShipToSheet.tsx`; shared `RecordViews.tsx`, `sheetParts.tsx`
- Menu: `prototypes/unified-view/UnifiedView.tsx` (module `master-data`)
- Reused 3PL Directory: `prototypes/unified-view/threepl/` (see its README,
  "The Directory — one list, four screens")
- Lovable reference: https://unified-ui-revamped.lovable.app/rental-assets
- Sibling docs: assets-tanks-and-leases.md · customers-and-sites.md ·
  fuel-supply-and-sourcing.md · 3pl-brokerage.md · delivery-orders.md ·
  fleet-trucks-and-routes.md · dispatch-and-operations.md · customer-portal.md ·
  service-work.md · sales.md · product-overview.md
