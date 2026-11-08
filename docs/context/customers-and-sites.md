# Customers and sites — the tenant's accounts and where they receive fuel

> **Load this when:** designing or checking anything about a customer account or a ship-to — customer list or sheet, contacts, credit (status, limit, balance, available, over limit, aging), payment terms, tax, portal access, customer instruction vs delivery notes, ship-to address/coordinates/default site/geofence, site map, Customer 360, Ship-to 360, the customer pickers on orders and assets. **Not for:** what the customer sees when they log in (`customer-portal.md`), orders themselves (`delivery-orders.md`), tanks and leases on a site (`assets-tanks-and-leases.md`), the Master Data module as a whole (`master-data.md`).
> **Sources:** `prototypes/unified-view/threepl/directory.ts`, `threepl/directoryCore.ts`, `threepl/CustomerRecord.tsx`, `threepl/SiteMiniMap.tsx`; `prototypes/unified-view/customers.ts`, `CustomerSheet.tsx`; `prototypes/unified-view/masterdata/README.md` (Customers, Ship-tos), `masterdata/customers.ts`; `prototypes/customer-portal/README.md` (Sites & Assets); memory `feedback_master_data_mirrors`, `feedback_audience_split`, `project_customer_portal`. **Last updated:** 2026-11-06.

## In one paragraph

A **customer** is the tenant's own account — the company that buys fuel or service from the tenant (a fuel distributor). It has one or more **ship-tos** (sites): the addresses where fuel is delivered, each with coordinates, possibly a geofence radius, and the tanks/assets standing on it. The full customer record lives in the 3PL **Directory** (`BrokerCustomer`) and is reused as-is by **Master Data**, which adds a 360 view (Customer 360, Ship-to 360). The Unified View's own **Customers** page is an older, slimmer record (name, ERP ID, ship-tos, line of service, status). Credit is the headline of a customer: limit, balance and the computed available credit; an account that is not Approved, or is over its limit, cannot place new orders. All sample data is invented, but customer and ship-to names are shared across modules so "Morris Group" means one account everywhere.

## Glossary

| Term | Meaning |
|---|---|
| Customer (account) | The tenant's buyer. Not the tenant itself, and not FleetPanda's customer. |
| ERP ID | The customer's ID in the tenant's ERP, shown under the name in lists (e.g. `CUST-4200`; test accounts `TMP-…`; the UV list shows `ERP 418223`). Required. |
| Accounting customer ID | A separate ID in the accounting system (sample values `NS-…`). Optional. |
| Record status | Whether the record is in use: active · inactive · archived (UV Customers: Active / Inactive switch). |
| Credit status | Whether finance lets orders through: **Approved · On hold · Unapproved**. A separate axis from record status. |
| Credit limit | Dollars the account may owe. Blank = **no limit set**, which is not the same as zero. |
| Current balance | Dollars owed now. |
| Available credit | Limit − balance, **computed, never stored**. N/A when no limit is set; negative when over limit. |
| Over limit | Balance > limit. Its own chip, separate from credit status. |
| Credit blocked | Not Approved, OR over limit — the two things that block an order. |
| Exposure | Master Data list column: the balance as a bar against the limit. |
| Aging | How the balance ages: current · 1–30 · 31–60 · 60+ days past due (Master Data). |
| Payment terms | Net 15 · Net 30 · Net 45 · Due on receipt · Prepaid (3PL list). |
| Customer instruction | Account-level text printed on the dispatch sheet — the driver reads it (gate codes, PPE, call-ahead). |
| Delivery notes | A separate free-text field on the account. |
| Internal notes | Never shown to the customer or the vendor. |
| Portal access | Switch on the customer: "Lets this account see its own orders" — i.e. the account can use the Customer Portal. |
| Ship-to / site / location | A delivery address of one customer. |
| Default site | The customer's default delivery ship-to. One per customer (the first one in the sample data). |
| Geocoded | Whether the ship-to has latitude/longitude. Without them a site cannot be routed. |
| Geofence / site radius | The ring around a ship-to that counts as "at the site". |
| ST-1001 | Master Data ship-to code, in a block of a thousand per customer. |
| LOS | Line of service. UV Customers: Transportation · Tank Wagon · Propane (an account can have several). |
| Customer 360 / Ship-to 360 | Master Data's full-record sheets: figures, trends, tabs of everything attached. |

## How it works

### Three customer records, one set of names

| Where | Record | What it carries |
|---|---|---|
| Unified View → Customers (rail) | `Customer` in `customers.ts` | Name, ERP ID, ship-tos (free-text list), LOS, status (Active/Inactive); sheet-only billing terms, one contact (name, email, phone), a note. Columns: Customer · Ship-Tos (first + `+N`) · LOS · Status. Every column sorts. |
| 3PL → Directory → Customers | `BrokerCustomer` in `threepl/directory.ts` | The full operational record (below). Built FROM the UV/Sales customers, so the same accounts and ship-to names appear, plus extra generated accounts. |
| Master Data → Customers | `MdCustomer` in `masterdata/customers.ts` | **The 3PL record itself** — same data, same form — plus aging, average days to pay and last credit review. |

Master Data repeating 3PL's customers is intended, not a duplicate to resolve. An edit in one shows in the other for shared Directory lists.

### The full customer record (3PL Directory = Master Data)

Form sections, in order:

- **Identity** — Customer name · ERP ID · Record status · Accounting customer ID.
- **Contact** — Main contact · Role (common roles listed, any other text allowed) · Phone · Secondary phone · Email · Billing email · Dispatch email.
- **Billing address** — lines 1–2, city, state, ZIP, country (USA default).
- **Financial** — Credit status · Credit limit (hidden while Unapproved; blank = no limit; cannot be negative) · Current balance (required) · Payment terms (required) · Tax ID · Tax exempt (switch). Currency is also stored.
- **Operations** — Preferred vendor (3PL) · Portal access · Customer instruction · Delivery notes · Internal notes.
- Also on the record: tags (e.g. Key Account, Tax Exempt, Portal User, Watch List), attachments (sample: W-9, Credit Application, Tax Exemption Certificate), contacts, audit trail, created/updated.

**Contacts:** a list of people (name, role, phone, email, notes). Exactly one is primary — "the one who gets called first" — or none. Sample roles: Site Foreman, Fleet Manager, Operations Manager, Accounts Payable, Facilities Lead, Yard Supervisor, Dispatcher, Owner.

**Read sections under the form** (3PL customer sheet): Credit position · Contacts · Ship-to Locations (with a Geocoded column) · Orders · Rental Assets on its sites · Attachments · Internal notes. Things the account is attached to are read as tables, not edited here.

### Credit — the rules

- Credit status and record status are two different axes. An active account can be Unapproved (new, no credit check); an archived one can have been Approved for years.
- **Blocked = not Approved, or balance over limit.** The credit section then says "This account cannot place new orders"; otherwise "Clear to order".
- An Approved account can still be blocked by being over its limit — that is why **Over limit** is its own chip beside the credit-status chip.
- Header chips: record status, credit status (Approved = success, On hold = caution, Unapproved = critical), Over limit when it applies.
- Available credit is computed from limit − balance every time; shown red when negative.
- Sample book is weighted mostly Approved, so the 3PL board's Blocked lane and the credit filter stay meaningful.
- Master Data adds **aging** (current, 1–30, 31–60, 60+ days past due), **average days to pay**, **last credit review**. 31–60 days past due counts as overdue on Net 15.
- Lovable reference's "Watch" credit status became **On hold**; its "Net 7" became **Net 15** (no Net 7 in our list).

### Customer instruction vs other notes

| Field | Level | Who reads it |
|---|---|---|
| Customer instruction | Account | Printed on the dispatch sheet; the driver. The reference shows it as a list column. |
| Delivery notes | Account | Free text, no further rule given. |
| Internal notes | Account | Tenant staff only; never the customer or vendor. |
| Ship-to notes | Ship-to | Site tips (e.g. "Tank is behind the shop"). |
| Delivery instructions | Ship-to, Customer Portal | Gate codes, PPE, parking, photos — the real product's field name. |

### Ship-tos (sites)

- **Fields** (Directory `ShipToLocation`): location name · address lines 1–2 · city · state · ZIP · country · latitude · longitude · default site (yes/no) · status (active/inactive/archived) · notes. Each belongs to exactly one customer.
- Master Data adds: **ST-code**, customer by name, **site contact** and **phone**, audit history. Its form: Identity · Address (with latitude/longitude) · Site contact.
- **Coordinates are often missing** in real directories (they come from a geocode nobody has run). The customer sheet shows a Geocoded column because an un-geocoded site cannot be routed.
- **Default site:** one per customer; the customer record points at it (`defaultShipToId`).
- Ship-tos are derived per customer, so the customer's site list and the ship-to list never drift.
- In the UV Customers sheet, ship-tos are free-text chips (add/remove) — not a pick from a fixed list.

### Geofence and site map

- **Site map** (`SiteMiniMap`, used on order hover cards and in Ship-to 360): the ship-to at the centre, its assets as dots inside the radius.
- Radius there = the farthest asset plus a margin (30 m), never under 100 m — "the portal's geofence recipe". Terminals use the same map with their rack radius.
- In the Customer Portal, the customer sets a ship-to's geofence with a switch and a radius in **miles** (0.05–5), drawn as a ring; assets are pins with their own latitude/longitude inside the site.

### Master Data — Customers list and Customer 360

- **List columns:** Customer (name · ERP ID) · Primary POC · Region · Ship-to sites · Terms · Credit · Exposure (bar vs limit) · Open orders · YTD revenue. Open orders and YTD revenue are **counted from orders, never typed** (the reference form asked for them).
- **Customer 360** header: status, credit and Over limit chips. Four figures: revenue · gross margin · gallons delivered · open orders. Two monthly trends: volume, margin.
- **Six tabs:** orders across modules (with a board) · products delivered · ship-to sites · assets on site · recurring schedules · leases and contracts.
- **Side cards:** Credit and payment · Contact · Account · Instructions. Edit details opens the customer form on top.
- **Orders across modules** are derived: deliveries into its tanks and service orders (from the assets), bulk deliveries to its sites, each tagged by module — 3PL · First party · Service Work — with stages Open · Assigned · Delivered · Completed · Invoiced.
- One source each: ship-tos and recurring schedules from `masterdata/customers.ts`; assets, tank fills, service orders and leases from the assets.

### Master Data — Ship-tos list and Ship-to 360

- **List columns:** Ship-to (ST-code) · Location (+ Default pill) · Customer · Address · Contact · Rental assets · Customer-owned · Status. Both asset counts are counted from the assets on the site.
- **Ship-to 360:** four figures (deliveries, gallons, revenue, open orders); two trends (volume, spend by month); three tabs (orders and deliveries, assets on site, invoices); rail with **Location** (site map with radius and assets) and **Details** (customer → opens Customer 360, contact, terms, assets placed).
- **Invoices on a site:** one per invoiced delivery, due on the customer's terms, past due only where the customer's aging says so; plus service invoices for the site's assets.
- Customer 360 and the asset form's Customer and Site pickers read ship-tos as edited.

### How customers differ between modules

- **Tenant modules** (UV/First Party, Sales, 3PL, Master Data) show the tenant's view of the account: credit, terms, tax, internal notes, preferred vendor.
- **Customer Portal** is the customer's own view of themselves; it keeps its own ship-to and asset fields (Delivery instructions, Default PO #, preferred delivery times, geofence in miles) — see `customer-portal.md`. Portal features do not spread to tenant modules unless Pavan says so.
- Customer names used in orders (`orders.ts`, Sales) are the real seed names; Directory records are built from them so links resolve to one account.

## Decisions already made

- **2026-10-07** — UV Customers: every column sorts (ship-tos by count); status edited as a labelled switch, not a picker.
- **2026-10-14** — Portal ship-to (from the real record): "Access notes" renamed **Delivery instructions**; **Default PO #** per ship-to; customer changes to sites need no tenant approval in our design.
- **2026-10-15** — Portal: street optional once the map pin is placed; city, state, ZIP stay required.
- **2026-11-03** — Master Data Customers = the 3PL Directory customer, same data and form, plus aging, average days to pay, last credit review.
- **2026-11-03** — Open orders and YTD revenue are counted, never typed. Ship-to asset counts are counted from assets.
- **2026-11-03** — Lovable "Watch" → On hold; "Net 7" → Net 15. Reference data mismatches are fixed, not copied (wrong figures on Meridian Oil, ship-to counts, leases, a service job listed as a product, 31–60 days not overdue, regions vs asset addresses).
- **2026-11-03** — Master Data repeats records from other modules on purpose; never raise it as a doubt.
- **Standing (code)** — credit status and record status are separate; available credit is computed; Over limit is its own chip; credit limit hidden for Unapproved accounts; blank limit ≠ zero; one primary contact at most; one default site per customer.

## Open questions / conflicts

- **Geofence units and source differ.** Portal: customer-set radius in miles (0.05–5). Site map: radius derived from the farthest asset + 30 m, min 100 m, in metres. The real ship-to record has no geofence field (2026-10-14). Which one is the product's?
- **Notes overlap.** Account-level Customer instruction + Delivery notes, ship-to notes, and the portal's ship-to Delivery instructions all hold driver-facing text. Which one prints on the dispatch sheet when more than one is filled is not stated.
- **Line of service words differ.** UV Customers: Transportation · Tank Wagon · Propane. 3PL and Portal LOS switch: All · Fuel · Lubricants · Propane.
- **Payment terms lists differ.** 3PL: Net 15/30/45, Due on receipt, Prepaid. UV Customers: Net 15/30/45, Prepaid (no Due on receipt).
- **Contact model differs.** UV Customers: one contact on the record. 3PL/Master Data: main contact + contacts list with one primary. Master Data ship-tos add a site contact; the 3PL ship-to has none; the real portal ship-to has no contact or hours.
- **Credit detail from the real system:** the portal team says only a yes/no credit hold comes through today; whether limit and balance will ever arrive is open (portal OPEN-QUESTIONS, 2026-10-20). Tenant modules assume full limit/balance.
- **Stale line in Master Data README:** its intro still says "Only Assets is built"; the Customers and Ship-tos sections (2026-11-03, later) say they are built. Later wins.
- **Approval of customer edits:** the real product has supplier approval on customer-side changes; our portal deliberately has none (2026-10-14).

## Where it lives

- Full customer record and ship-tos: `prototypes/unified-view/threepl/directory.ts`, `threepl/directoryCore.ts` (ShipToLocation, contacts, roles, tags), `threepl/CustomerRecord.tsx` (form + read sections).
- UV Customers page: `prototypes/unified-view/customers.ts`, `CustomerSheet.tsx`.
- Master Data: `prototypes/unified-view/masterdata/README.md`, `customers.ts`, `CustomersScreen.tsx`, `CustomerSheet.tsx` (Customer 360), `ShipTosScreen.tsx`, `ShipToSheet.tsx` (Ship-to 360), `RecordViews.tsx`, `sheetParts.tsx`.
- Site map: `prototypes/unified-view/threepl/SiteMiniMap.tsx`.
- Sibling docs: `product-overview.md` · `delivery-orders.md` · `3pl-brokerage.md` · `fuel-supply-and-sourcing.md` · `fleet-trucks-and-routes.md` · `dispatch-and-operations.md` · `customer-portal.md` · `assets-tanks-and-leases.md` · `service-work.md` · `sales.md` · `master-data.md`.
