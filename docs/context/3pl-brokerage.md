# 3PL brokerage

> **Load this when:** working on 3PL vendors/carriers, inviting vendors, quotes (compare, best price, finalize), assigning a vendor, vendor instruction, the 3PL Directory (Customers · Vendors · Products · Rental Assets), margin / vendor vs customer pricing, invoices on brokered orders, the 3PL dashboard, asset orders (Delivery · Pickup · Transfer · Relocate). Keywords: broker, carrier, partner, TLC, Finalize vendor, Acknowledge on their behalf, compliance, safety score, service area, preferred vendor. **Not for:** the delivery order lifecycle itself — statuses, lanes, board, order sheet layout, recurring rules (`delivery-orders.md`); customer and ship-to records in depth (`customers-and-sites.md`); tanks and rentals in depth (`assets-tanks-and-leases.md`); the Master Data module (`master-data.md`).
> **Sources:** `prototypes/unified-view/threepl/README.md`; `threepl/vendors.ts`, `directory.ts`, `directoryLinks.ts`, `VendorRecord.tsx`, `ProductRecord.tsx`, `CustomerRecord.tsx`, `DirectoryScreens.tsx`, `ThreePLDashboard.tsx` (comments); memory notes `project_3pl`, `project_3pl_next_session`, `project_3pl_guardrail_evals`; `docs/unified-view/evals/6-3pl-guardrails.md`. **Last updated:** 2026-11-06.

## In one paragraph

In First Party the tenant delivers fuel with its own trucks. In 3PL the tenant is a **broker**: it takes a customer's order and hands the delivery to an **outside vendor** (a carrier). The vendor is invited, sends a price (a quote), is chosen ("Finalize vendor"), acknowledges by an emailed link or in the vendor app, and reports back when the delivery is done. The broker earns the gap between what it bills the customer and what it pays the vendor — the **expected profit** (margin). Everything distinctive about the module follows from one fact: a party outside the building has to accept the order. The model was transcribed from FleetPanda's own written spec ("3PL-102" product doc, the "3PL Vendor Flow" doc, and the 3PL section of "FAQs - Customer Calls"); stages, field sets and numbering are quoted, while vendor names, scores, distances and quote figures are invented sample data.

## Glossary

| Term | Meaning |
|---|---|
| Broker / tenant | The FleetPanda customer using 3PL; dispatches orders to vendors. |
| Vendor / partner / carrier | The outside company that delivers. "Partner" and "vendor" are used interchangeably in the UI. |
| Vendor type | Carrier · Jobber · Owner-Operator · Terminal · Service Contractor (list is creatable). |
| Business line | A service line a vendor runs: Bulk Fuel · Packaged Lubes · DEF · Asset Movement · Emergency Response. |
| Invite | Send an order to a vendor (email and/or vendor app). "Invite and request quote" also asks for a price. |
| Quote | A vendor's price for an order, per product line plus freight and charges. |
| TLC | The vendor's total on the order (the quote's "landing cost": A×(B+C) on requested gallons, then freight, fees, taxes). |
| Best price | The cheapest quote — the lowest amount owed to a vendor; only shown with two or more quotes. |
| Finalize vendor | The act of choosing one vendor's quote. Leaves the vendor **Finalized**. "Award" is retired from every label. |
| Acknowledge on their behalf | The broker records a vendor's acceptance (e.g. after a call). For one vendor it also finalizes it. |
| Added by dispatcher | Label on a quote the broker typed in for the vendor. |
| Vendor instruction | Free text on a vendor record, shown to dispatch when that vendor is picked for an order. |
| Load order | The broker buying the fuel itself; changes who pays which taxes/fees (see Pricing). |
| Asset Order | A movement of one asset between two places (was "Movement Order"). Numbered `M-`; delivery orders `D-`. |
| Expected profit / margin | Customer pricing − vendor pricing on an order. |
| Directory | Customers · Vendors · Products · Rental Assets — one list shape, four screens. |

## How it works

### Vendors and their records

A vendor record exists so the system can answer **"who can take this work, and if not, why not"**. Eligibility is the point; everything else is reference.

Record sections (form): Identity · Dispatch contacts · Address · Service coverage · Capabilities · Compliance and approval · Rates and terms. Read-only blocks under it: Standing · Coverage detail · Contacts · Rate card · Supported products · Assignments · Compliance documents · Attachments · Internal notes. Audit history is a drawer from the sheet header.

- **Identity:** name, legal business name, DBA, Vendor ID (ERP), vendor type, tax ID, **Active** switch ("Deactivated vendors keep their history and take no new work").
- **Contacts:** dispatch contact + phone + email (dispatch contact is required), main, accounting, escalation; per-vendor **Email invitations** switch (spec §6: emails can be disabled per vendor, individually or in bulk). `hasAccount` = has a vendor-app login; optional — a vendor can acknowledge from the emailed public link with no login.
- **Service area:** type is zip · radius · state · custom; states covered (full names; an order ships to exactly one), cities, ZIPs, max radius (mi). A vendor always covers its own home state — otherwise it is a data bug.
- **Capabilities:** business lines, supported products, supported order types, top-off capable, asset handling, after hours.
- **Supported products** are derived from business lines (Bulk Fuel → fuels; DEF → DEF; Packaged Lubes → lubricants + additives; Emergency Response → service items), and a vendor runs a **subset** (~60%) — "supports 6 of 17 fuels" is the fact the picker needs.
- **Compliance:** "Compliance valid to" date (insurance and authority), insurance expiry, license numbers, documents. **Compliance status is derived, never stored:** Expired (past date) · Expiring (under 60 days) · Valid; "Missing" also exists as a status. Shown in days ("84 days left"), not as a date. "Has overdue docs" filter = Expired or Expiring.
- **Approved for assignment** — a human decision, separate from whether paperwork is current.
- **Availability:** Available · Limited · Unavailable; blackout dates; **assignment priority** 1–5 ("1 is offered first").
- **Money:** rate card (tiers: base haul $/gal, volume 2,500 gal+, asset move flat fee, after-hours callout per hour; each with optional fuel surcharge and min gallons), minimum charge, payment terms (Net 15 · Net 30 · Net 45 · Quick pay 2/10), accounting vendor ID. The rate card is "what a quote is checked against".
- **Safety score:** 0–100 number (spec filters on a range). Filter bands: 90–100 · 80–89 · 70–79 · Below 70.
- **Distance:** miles from the ship-to — derived per order in the real app, fixed in the prototype. Bands: Under 25 mi · 25–50 mi · Over 50 mi.
- **Standing** is four separate chips — active, approved, paperwork current, available — never collapsed into one "eligible", because *which* one fails is the useful part.

**Why a vendor can't take an order** (`vendorBlockedReason`) returns a sentence, checked in the order it can be fixed: Deactivated → Not approved for assignment → Compliance expired {date} → Does not run {business line} → Does not serve {state} → Marked unavailable → Blacked out on {date}.

### Preferred vendors and regional preference

- **Customer → preferred vendor:** one optional `preferredVendorId` on the customer record ("Preferred vendor", links to the vendor).
- **Vendor → preferred customers:** `preferredCustomerIds` (about 30% of seed vendors have up to 4).
- **Product → default vendors:** each product lists vendors who can fulfill it, up to 2 marked Default.
- **Regional:** only exists as a vendor **tag** ("Regional", alongside Preferred, After Hours, Hazmat Certified, Long Haul). There is no regional-preference field or rule — see Open questions.

### The vendor list (Directory → Vendors)

Twelve columns, cut from twenty by one rule — a column stays only if it feeds "who can take this work": Vendor Name · Vendor ID · Assigned Orders · Dispatch (phone + email, two lines) · Business Lines · Address · Service Area · Supported Products · Status · Default Rate Card · Notes · actions. Compliance sits under the name. **Safety score and distance are filters, not columns** (distance means nothing without a ship-to). Assigned Orders = live orders the vendor is carrying. Nothing sums (no group totals). Every column sorts (2026-10-07). The Notes column opens "Dispatch notes": vendor instruction + internal notes.

### Inviting vendors to an order

- The **Vendor** unit on the order is a table: Vendor · Address · Products · TLC · Status · an unheaded Finalize column. At rest it is one empty row (that row *is* the invitation to fill it).
- The row picker is multi-select with **Apply**: the first pick fills the row, the rest arrive as new rows (only on a blank row).
- The picker filters on **Business lines, Safety score range, Distance range** (spec §5.5). A map of nearby vendors is in the spec but not built.
- Two settings in the unit: **Send email notifications** (OFF by default — it mails people outside the building) and **Request a quote** (applies to the whole round, not per vendor).
- **Invite** has a caret: **Invite and request quote**. The footer sends to ticked unsent rows, or all unsent rows: *Send invitation* / *Send invitations to all*. Spare acts behind ⋯: *Acknowledge for them*, *Remove all vendors*.
- Several vendors can be invited at once (spec §5.5–5.7: first to accept wins).
- **Status ladder per vendor:** Invite (button) → **Invited** (in Draft) / **Awaiting quote** (after the round is out) → **Accepted** → **Quotation shared**; rail adds **Holds order** for the chosen one.
- **Resend invite** opens the email sheet (one column: Recipients → Message → Attached).
- Since 2026-10-20 the Vendor section is on the **create** sheet too: picking and inviting is a creation step, carried into the created order.
- Before a quote arrives, the rail shows an **Invitations** card ("No invitations" / each vendor "Awaiting response").

### Quotes

- **Any quote — even $0 — moves the order out of Orders** (see `delivery-orders.md` for the lane).
- A vendor sends a quote, or the broker writes one down: **Add their quotation** / **Accept and draft quote** (only where no quote exists yet).
- The quote sheet (opened from the TLC figure) has two modes: **review** (the vendor's own, read-only, **Reject** or **Accept**) and **draft** (broker typing; no Reject). Below the table: "Supporting documents and notes" from the vendor.
- **Stale quote:** if an order line is added that a quote doesn't cover, that row shows **Products updated** and its Finalize becomes **Resend invite**; the old quote stays on the row as a record. Resending is a notification, not a state change.
- **Comparing:** Quotation summary has a tab per quote received. **Pricing → Compare** (two or more quotes) adds one Vendor pricing column per quote; the chosen one is editable and outlined, others read-only with "+ $x vs best". Since 2026-10-25 the quoting vendors are tabs under the Vendor pricing heading that swap its figures; Finalize vendor takes the one on show.
- **Placing:** "Best price" (green) for the cheapest, neutral for the rest — first as a chip on board cards (2nd best, 3rd best…), and in the sheet as a solid green diamond beside the vendor name (2026-10-05). Board cards no longer show quotes (2026-10-27) — see conflicts.
- Partners · n in the rail lists only vendors who have **not** quoted ("Awaiting quotation").

### Assigning a vendor

- **Finalize vendor**: one at a time; once one is finalized, every other Finalize button goes. **Cancel finalization** (next to the green *Finalized* chip, or the vendor row menu) is the way back — only while Quoting.
- **Finalize and Confirm are two acts.** The order moves to **Assigned** via **Move to Assigned**, disabled until a vendor is finalized. **Assigned always means a vendor is finalized** (enforced by the seed's consistency check).
- **Acknowledge on their behalf** for one vendor = finalize it, add its quote (marked "Added by dispatcher"), move to Assigned. For several vendors it only records acceptance.
- On Assigned, **Change vendor** stays available (red outline).
- Once a vendor holds the order, the card shows the **Driver** (name, truck, phone).
- If the vendor handles the load order, the order shows a banner "Load order is being handled by the vendor." and no Load order unit.
- No drag-and-drop between lanes: a stage change means real side effects (emails to vendors, accounting push), not a reorder.

### Vendor instruction

A free-text field on the vendor record ("Vendor instruction"), shown to dispatch when that vendor is picked. Examples in seed: "Send the BOL within 2 hours of delivery or the invoice is held", "Quote includes the fuel surcharge. Do not add it twice." ~45% of seed vendors have one. Separate from **Internal notes** and from the customer's own **customer instruction** (printed on the dispatch sheet).

### Pricing and margin on a brokered order

- Pricing is one full-width unit: **Product · Type · Vendor pricing · Customer pricing**. Each row is one charge with the two sides' figures.
- Charges per product, per gallon: **Price** (one per product, cannot be removed), then any number of **Margins, Taxes, Fees** — numbered ("Margin 1", "Margin 2"), not named. Adding a charge adds it to both columns.
- **Whole order** band (last): freight on the vendor side (the only order-level vendor charge — "it is the truck, not the cargo"), additional fees on the customer side, one row per fee; a discount shows negative.
- **Load order rule:** whoever holds the load order pays its fees and taxes. With a load order the vendor's price row goes and its fee/tax move to the broker side, marked *On the load order*. The margin and the vendor's service charge (wait time, tolls) survive.
- **Totals bar** (pinned at the foot while Pricing is on screen): Vendor pricing · Customer pricing · **Expected profit**. Profit is green when positive, red when negative, neither at zero; the rail's Margin row matches.
- The unit is hidden on an unquoted draft; the first quote opens it. "Estimated" stays on the Total row until Completed; at Completed, delivered gallons can be adjusted (pencil on the Delivered row).
- Movement (asset) orders price as **Fee + Tax**, not rate per gallon.

### Invoices and billing

- 3PL invoicing is **offline** — invoices inside 3PL are out of scope (Pavan).
- Yet board cards carry an invoice step: **Request invoice** CTA, then a grey **Invoice requested** box with how long ago; also **Review invoice** (2026-11-02). Whether to remove this row is open.
- After delivery the order goes to accounting (Review → Verified → Synced; only accounting marks Synced; Partially Synced is an error) — lifecycle detail in `delivery-orders.md`.
- Vendor side: payment terms + accounting vendor ID on the vendor record. Customer side: credit limit, current balance, payment terms on the customer record. **Over the credit limit blocks an order** (seed: Morris Group $21,250 over; Halvorsen Fuel Co. never credit-approved — the two Blocked orders).
- Products carry tax code, revenue account, COGS account; "a taxable product with no code is the one combination that produces a wrong invoice".

### The 3PL Directory — one list, four screens

- **Customers, Vendors, Products, Rental Assets** share one list shape (`DirectoryList`): facet panel, grouping, footer count, **no date scope** (these records carry no date). Each screen supplies only its records, columns, facets and measure.
- Volume on purpose: 150 customers, 80 vendors, 60 products, 120 assets. Records are incomplete on purpose: `-` = not filled, `N/A` = does not apply; never blank.
- A record opens as a **side sheet that is the form**; related records sit below in the same scroll.
- **What sums:** Customers = outstanding balance; Rental Assets = monthly revenue, on-rent only; Vendors and Products = nothing.
- **Never stored, always derived:** a customer's available credit, a product's customer and vendor reach, an asset's conflicts.
- Customers and ship-tos are the **same records as Sales/Dispatch** (spec: synced almost in real time). Products are the same list order lines draw from.
- **Products** are "a set of rules": unit of measure, decimal places, min/max/default quantity, top-off supported, quantity override, base price, taxable + tax code, accounts, available to all customers, geography restrictions, hazmat class, hazard flags; reach blocks "Vendors who can fulfill this" and "Eligible accounts".
- **Rental assets** — booking blocked when: already on rent to a different account (no double-booking; overlapping dates), under maintenance / out of service, archived, compliance expired, or the customer isn't active. Warnings: on rent with no customer ("nobody is being billed for it") or no ship-to ("location unknown").
- Every record can also live in **Master Data** (built 2026-11-03; repetition is intended) — see `master-data.md`.

### Asset orders — a route between two places

Renamed 2026-09-17 from "Movement Order". Two kinds of place (our yard, a customer's ship-to) give four routes:

| Route | Stored as |
|---|---|
| Yard to Ship-to | Delivery |
| Ship-to to Yard | Pickup |
| Ship-to to Ship-to | Transfer |
| Yard to Yard | Relocate |

- Stored by the verb, offered by the route ("Ship-to to Ship-to (Transfer)"). The order stores **from** and **to**.
- Assets offered are always the **origin's** (what's in that yard, or on rent at that site). A route cannot end where it started.
- **One asset, no quantity**; the asset is fixed at creation (spec §5.20). Customer notes follow the customer end (destination when both are sites).
- Create menu: Delivery Order · Asset Order → four boxes (Delivery · Pickup · Transfer · Relocate), each opens its form. Order type "Asset Movement" is never offered on a delivery order.
- Vendors need the **Asset Movement** business line / asset handling; rental assets can have an assigned servicing vendor.

### The 3PL dashboard

Built 2026-10-05. Reads the same orders as the board (seed + what recurring rules cut), same line and date range; default range is today + 6 days. Every figure drills to the filtered order list or opens the order.

- **Tiles:** Live orders · Estimated partner cost · Estimated margin · Needs action.
- **Live** = everything except Synced and Canceled. **Needs action** = Draft · Blocked · Review · Partially Synced.
- Partner cost = the held vendor's quote total; margin = customer total − partner cost, on priced live orders only.
- **Panels:** Orders by lane · Orders by delivery date · Order types · Top customers (estimated customer price) · Partner spend · Needs attention.
- Dashboard is first in the nav; the module **opens on Orders** (2026-10-06).

### Lines of business on 3PL

View tabs by business: Fuel → Transport · Tank Wagon; Lubricants → Packaged Goods · Lubes; Propane → none declared.

## Decisions already made

| Date | Decision | Who |
|---|---|---|
| 2026-09-16 | Status vocabulary locked (old Assigned → Quoting, old Accepted → Assigned, etc.). | Pavan |
| 2026-09-17 | Movement Order → **Asset Orders**, four routes. Vendor unit rests as one empty row. | Pavan |
| 2026-09-22 | Pricing = product rows, vendor/customer columns; charges are a growing list; pricing hidden on unquoted drafts; totals bar sticks. | Pavan |
| 2026-09-22 | Distance narrow, address takes the slack; Review is a link; Finalize vendor is a green outline. | Pavan |
| 2026-09-23 | One name for the act: **Finalize vendor**; "Award" retired. | Pavan |
| 2026-10-05 | Quotes compared via tabs + Compare mode; best price = green diamond. Dashboard built. | Pavan |
| 2026-10-06 | Lane walk: any quote → Quoting; acknowledge-for-one = finalize + Assigned; one finalize at a time; Cancel finalization in Quoting only; Change vendor on Assigned; Move to Assigned disabled until finalized; module opens on Orders. | Pavan |
| 2026-10-07 | 3PL is the design guardrail for every module (G1–G52). Every vendor column sorts. | Pavan |
| 2026-10-20 | Vendor section shows on the **create** sheet (reverses 2026-10-06). | Pavan |
| 2026-10-25 | Vendor pricing: quoting vendors as tabs under the column heading. | Pavan |
| 2026-10-27 | No quoting on the board: no Quoting lane, no quote chips/footers (archived). | Pavan |
| 2026-10-29 | Orders-lane pending step by vendor state: *Vendor not selected* + Select Vendor · *Awaiting quotation — N invited* · *Quotation not finalized* + Finalize Vendor. Summary card in the rail is final. | Pavan |
| 2026-11-02 | Directory lists get an "Add New …" button beside Export. | Pavan |
| Standing | Out of scope: recording delivered gallons (another flow), invoices inside 3PL, telling losing vendors, unblock / un-cancel. | Pavan |

## Open questions / conflicts

**Open questions — do not silently decide these:**
- **Two lines share an asset name** ("180 asset · Dyed Diesel" and "180 asset · Clear Diesel #2"): a quote can't tell them apart; typing one rate writes both. Fix = key quote lines on line position; touches model, seed, both pricing tables. Ask first.
- **Three stages share one amber chip** (Quoting, Assigned, Verified): add a fifth DS tone, or accept the label distinguishes.
- **Date stepper scopes the board to one day**; the spec describes a Today button and date filters — a stage board spanning days may be truer.
- **Vendor rejection not modelled.** Spec: a single invited vendor declining returns the order to Draft; one of several declining leaves it in the waiting stage. Called "the next real gap".
- **Recurring default carrier** (spec §5.16) undecided.
- Not built: Activity Log, email preview before invite, Internal Notes on orders, map of nearby vendors.
- Quote goes stale only when a **line** is added, not on a quantity change — intended?
- 13 seed Quoting orders break an invariant (vocabulary question).
- `Propane HD-5` missing from Products; the vendor `business` rule is unknown (Propane has none).
- No validation or failure paths anywhere (every toast is success).
- Remove the board's invoice-request row? Recommended yes (invoices are offline) — not answered.
- UX list offered 2026-10-06, not picked: $0 quote looks real · undo on lane moves · one place to finalize · unhappy paths (decline/bounce/expire) · Assigned lateness flag · quick vendor picker from card.
- Lovable gaps untouched: quote deadline + nudge non-responder · carrier stats in vendor table · "last paid on this lane" + margin vs last rate · assign at contract rate at create · fuel surcharge, detention/accessorials · payment terms + order owner.
- Directory: contacts/ship-tos read-only; attachments don't upload; no role model (`canWrite` always true).
- **Regional preferences** exist only as a "Regional" vendor tag — no field or rule.

**Conflicts between sources (later date wins):**
- Vendor on the create sheet: README lane walk 2026-10-06 says hidden until created; memory 2026-10-20 says shown. → shown.
- Dashboard as landing page (code comment 2026-10-05) vs module opens on Orders (2026-10-06, guardrail G52). → Orders.
- Directory "no create CTA, no bulk bar" (README Directory section) vs "Add New …" beside Export (2026-11-02) and DirectoryList bulk actions (G18). → has both.
- Board "Best price" chip and quote stepper (README, Sept) vs no quoting on the board (2026-10-27). But 2026-10-29 still has a *Quotation not finalized* step and memory lists a Quoting lane — check `delivery-orders.md` before assuming a lane exists.
- Older README text: "Confirmed" footer moves to Completed, and an "Award moves to Assigned" transition diagram in the old vocabulary. Superseded by Finalize → Move to Assigned (2026-10-06).
- Invoices "offline / out of scope" (memory) vs Request invoice / Review invoice CTAs on cards (2026-11-02).

## Where it lives

- `prototypes/unified-view/threepl/README.md` — why 3PL decided things (lane walk 2026-10-06 supersedes earlier sections).
- `docs/unified-view/3pl/creation.md` — how 3PL builds create sheets (read before changing a creation flow).
- `threepl/vendors.ts` (vendor model, eligibility, list columns) · `directory.ts` (customers, products, rental assets, asset conflicts) · `directoryLinks.ts` (preferred vendor, supported products, product reach) · `VendorRecord.tsx` · `ProductRecord.tsx` · `CustomerRecord.tsx` · `AssetRecord.tsx` · `DirectoryScreens.tsx` · `DirectoryList.tsx`.
- `threepl/orders.ts` (model, invariants, `MOVEMENT_ROUTE`) · `BrokerOrderSheet.tsx` (vendor workflow, pricing) · `BrokerOrdersScreen.tsx` · `ThreePLDashboard.tsx`.
- `docs/unified-view/evals/6-3pl-guardrails.md` — G1–G52; `npm run eval`.
- Sibling docs: `delivery-orders.md` · `fuel-supply-and-sourcing.md` · `fleet-trucks-and-routes.md` · `dispatch-and-operations.md` · `customers-and-sites.md` · `assets-tanks-and-leases.md` · `service-work.md` · `sales.md` · `master-data.md` · `product-overview.md`.
