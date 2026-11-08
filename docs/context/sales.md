# Sales

> **Load this when:** Sales module, fuel orders or asset orders in Sales, the Sales Orders list/board/map, Line of Service switch, quotes (create, price, send, accept, expire), price list / market / margin / fees / taxes per gallon, Sales dashboard, Sales Settings (forms, workflow stages, SLA, approval, notifications, preferences), order-type and status pill colours, Lovable comparison / gaps. **Not for:** 3PL broker orders and the BrokerBoard's own rules (3pl-brokerage.md), dispatching drivers and trucks (dispatch-and-operations.md, fleet-trucks-and-routes.md), customer records and ship-tos (customers-and-sites.md), customer-facing ordering (customer-portal.md), equipment service jobs (service-work.md), leased assets (assets-tanks-and-leases.md).
> **Sources:** `prototypes/unified-view/SalesOrdersScreen.tsx`, `QuotesScreen.tsx`, `QuoteSheet.tsx`, `OrderSheet.tsx`, `SalesDashboard.tsx`, `SalesSettingsScreen.tsx`, `salesOrders.ts`, `quotes.ts`, `salesSettings.ts`, `assetOrders.ts`, `data.ts`, `UnifiedView.tsx` (header and block comments); `prototypes/unified-view/README.md`; memory `project_sales_lovable_gaps.md`. **Last updated:** 2026-11-06.

## In one paragraph

Sales is the tenant-facing module where a fuel distributor's sales and order
desk takes orders and prices fuel for customers. It holds two kinds of order —
**fuel orders** (Delivery or Extraction of a product in gallons to a ship-to)
and **asset orders** (equipment such as tanks going to a customer) — on one
**Orders** page, plus **Quotes** (a per-gallon price offered to a customer that
becomes a fuel order when accepted), a one-day **Dashboard**, Customers, Assets
and **Sales Settings**. Every Sales order moves through five stages taken from
the Lovable reference: Requested → Scheduled → Dispatched → Delivered, with
Canceled apart. Picking a driver schedules a fuel order. The prototype was
built to reach parity with Lovable and with 3PL's patterns on 2026-10-07.

## Glossary

| Term | Meaning |
|---|---|
| Fuel order | An order for fuel products (gallons) to a customer's ship-to. Types: **Delivery** or **Extraction**. Has a driver, plan date/time, products, tags, urgent flag. |
| Asset order | An order for equipment (asset type, quantity, serial no) to a customer, with a sales rep, delivery date and PO number. Separate 61xxxxx number series. |
| Line of Service | The switch on the Orders view bar: **All · Fuel Orders · Asset Orders** (All is default). |
| Stage / status | Where an order is in its lifecycle. Five core stages; more can be added in Sales Settings. |
| Requested | Waiting on a dispatcher to schedule it (amber / caution). |
| Scheduled | Has a driver and a plan (info; pill colour set to yellow). |
| Dispatched | Out of the yard (info; pill colour set to blue). |
| Delivered | Done (success / green). |
| Canceled | Not happening (neutral grey, never red). Set apart on the board. |
| Urgent | A flag on a fuel order. Drives the "urgent orders overdue for dispatch" banner. |
| SLA | Hours an order may sit in a stage before it is **Over SLA**. Set per stage. |
| Approval step | A stage can require approval: "Request approval" → "Approve & move". |
| Quote | A price offer for fuel at one ship-to. Draft → Sent → Accepted; Expired is derived. |
| Market | The pricing region a quote is priced in (Houston, Dallas–Fort Worth, San Antonio — invented). |
| Base rate | List $/gal for a product in a market at the line's gallon tier, from the (invented) price list. |
| Margin / Fees / Tax | Quote-level charges added to the base rate, each entered as $/gal, $ total or %. |
| Net $/gal | A line's or quote's all-in price per gallon. |
| Valid through | The date a sent quote stays open; after it, the quote reads Expired. |
| Lovable | The reference app (unified-ui-revamped.lovable.app) the Sales module was compared against. |
| Order type tag | The Type pill: Delivery (cyan), Extraction (orange), Asset Order (violet) by default. |

## How it works

### Navigation

Sales rail: **Dashboard · Orders · Quotes · Customers · Assets · Sales Settings**.
The module **opens on Orders** (like 3PL); Dashboard stays first in the menu.

### Orders (one page, two kinds)

- Fuel Orders and Asset Orders were two pages; since 2026-10-07 they are one,
  built like 3PL's Delivery Orders. Each row keeps its own record, sheet and
  change log.
- **Views:** table, board and map. Date range control; saved views; search by
  column; filters with chips; bulk bar (fuel rows only; Delete applies to all).
- **Default date:** today for All and Fuel; **tomorrow** for Asset (only on an
  untouched Default view).
- **One column set** covering both kinds ("—" where a kind has no value). The
  customer cell's second line is the ship-to for both. Every column sorts.
- **Create Order** is a menu: Create Fuel Order · Create Asset Order · Create Quote.
- **Banner:** "N urgent orders overdue for dispatch" — fuel orders marked
  urgent, in a stage before Dispatched, whose planned time has passed.
- **Board:** the 3PL BrokerBoard; one lane per stage, Canceled set apart.
  Cards: order no + type, customer, schedule, products, driver. Lane sorts and
  card fields per lane or for all.
- **Order sheet:** create, then autosave. Nothing is kept until **Create
  Order**; after that every edit saves. The footer carries the next stage
  ("Move to <next stage>"). **Cancel order** sits in the ··· menu. Product
  lines live in a table; the total is computed, never typed.

### Stage rules (fuel orders)

- Core stages: **Requested · Scheduled · Dispatched · Delivered · Canceled**.
  Asset orders use the same five ("Open" was renamed Requested).
- **Driver drives scheduling:** picking a driver on the stage before Scheduled
  moves the order to Scheduled; clearing the driver on a Scheduled order sends
  it back. Later stages ignore the driver.
- The driver pick only schedules if Scheduled needs no approval **and** the
  quote rule is met (see Preferences); otherwise the driver is kept and the
  move waits for its act.
- From Delivered or Canceled there is no next stage.
- A stage removed in Settings sends its orders back to the first stage.
- An added stage takes the colour kind of the core stage before it.
- Moving into a stage can raise a notification (per Settings).

### Quotes

- A list page (same shell as Customers): view row with CTA, toolbar, table,
  pagination. **Not date-scoped** and **no board or map** (no quote lanes
  decided).
- **Lifecycle:** Draft → Sent → Accepted. **Expired** is not stored: it is a
  Sent quote whose valid-through date has passed. Moving the date forward makes
  it Sent again. Tones: Draft grey, Sent amber, Accepted green, Expired grey.
- **Sheet:** the quote exists as a Draft from the moment Create Quote is
  pressed and autosaves. Footer by stage:
  - Draft: Save as Draft (closes) · **Send quote**
  - Sent: **Mark as accepted** — creates the fuel order
  - Expired: nothing
  - Accepted: nothing (locked); the order it made shows in the summary
- **Send quote is a step**: an email preview (to, subject, body) that can be
  edited; pressing Send moves the quote to Sent.
- **Accepted → a fuel order at Requested** (shared quote store).
- **Fields:** customer, ship-to, customer email, valid through, market,
  products (multi-product lines with gallons), pricing table, customer notes.
- **Pricing (quote-level, applied to every line):**
  - $/gal = same amount on every gallon; $ total = spread over all gallons;
  - % margin = % of base; % fee = % of base + margin; % tax = % of base +
    margin + all fees (tax is on the selling price).
  - Several fees add; several taxes add — never one on top of another.
  - Each line gets its own net $/gal; quote total = sum of lines; net
    effective $/gal = total ÷ total gallons.
- Pricing breakdown is an editable table: Margin row, default **Fees** and
  **Tax** rows (fixed names, cannot be removed), plus added fees/taxes (named,
  removable) via "Add charge".
- Base rate is filled from the price list for product × market × gallon tier
  and refills when any of those change — unless typed; **Reapply rate** undoes
  a typed rate.
- Quote events (fee/tax added, removed, renamed etc.) go in the activity log.

### Dashboard

- **One day at a time** (because a dispatcher works a day). Fuel orders only.
- Asks: how much is going out and how much has a driver · driver load
  (gallons per driver) · orders by planned time (before 6a, 6a–12p, 12p–6p,
  after 6p, not planned) · delivery vs extraction · product demand · top
  customers by gallons · rush and unassigned (what is still waiting).
- Every press opens Orders on the Fuel Orders line for that day, narrowed.

### Sales Settings

Last rail item. Every change kept as made (no Save); persisted in the browser.
Tabs:
- **Form customization** — Fuel / Asset / Quote forms. Field order, sections,
  labels, Visible, **Required (blocks Create)**; locked core fields (customer,
  ship-to, product, quantity, etc.); add Custom field or from Lovable's full
  Field library. Limit **15 fields in use** per form.
- **Workflow** — the stages: rename, add (between Requested and Delivered),
  reorder (core five keep their order), approval per stage, SLA hours (none on
  Delivered/Canceled), colour per stage ("Default" = kind colour). Plus an
  **Order types** table (Type · Colour).
- **Notifications** — events × In-app / Email / SMS. Events: order created,
  urgent order created, scheduled order without driver, approval requested,
  dispatched, delivered, canceled, over SLA, daily digest, quote sent / accepted
  / expired. In-app fires a toast + bell dot; email/SMS are stored, not sent.
- **Preferences** — time zone (US zones; default America/Chicago), unit label
  (Gallons / Litres / Drums — a label, not a conversion), **auto-assign owner
  on create** (signed-in user into a Sales rep field), **require accepted quote**
  before a fuel order can be scheduled.
- Default SLAs (invented): Requested 24h, Scheduled 48h, Dispatched 8h.

### Customers and Assets

Lists with reorder/resize and sort on every column. **No board** — they have no
workflow.

## Decisions already made

- **2026-10-05** Sales Dashboard built; one day at a time. Dashboard first in the menu.
- **2026-10-06/07** Sales **opens on Orders**, like 3PL; Dashboard stays first in the menu.
- **2026-10-07** Lane/status decision **resolved**: Pavan chose Lovable's five stages (Requested · Scheduled · Dispatched · Delivered · Canceled) for fuel and asset orders, replacing Assigned/Unassigned derived from the driver. Built (commit 9b978c4).
- **2026-10-07** Driver pick moves Requested → Scheduled; clearing it moves back; later stages ignore the driver.
- **2026-10-07** Board = 3PL BrokerBoard, one lane per stage, Canceled apart; lane sort + card fields; date range; urgent-overdue banner (urgent seeded every 7th order); every column sorts; order sheet = create-then-autosave with "Move to <next stage>".
- **2026-10-07** Quotes built: Draft → Send quote (email step) → Sent → Mark as accepted → Requested fuel order; Expired derived; multi-product lines; margin/fees/tax at quote level; invented price list; accepted quotes locked; no helper text on the sheet.
- **2026-10-07** Cancel order (··· menu, both sheets); blue map pins for info stages; filters really filter (Category dropped — no data); Asset Orders date defaults to tomorrow.
- **2026-10-07** Orders merged into one page (pushed 7e9795a): Line of Service switch, Create Order menu, one column set, asset rows marked as Asset Order.
- **2026-10-07** Quote sheet v2: pricing as editable table with unit inside the cell; "Add charge" → Fee / Tax; shared Summary and Activity cards; customer notes a plain field.
- **2026-10-07** Sales Settings built, then v2: forms drive the real sheets, Required blocks create, 15-field limit, stage rename/add, approval step, Over SLA badge, notifications fire toasts, preferences (unit label, auto-owner, require accepted quote), settings persist.
- **2026-10-09** Pills on the Sales Orders table: Type as full-word pill with a chosen colour (Delivery cyan, Extraction orange, Asset Order violet); Status Scheduled **yellow**, Dispatched **blue** (Pavan), others keep their kind colour. Colours editable in Settings → Workflow.
- **2026-10-29** "PoC at Delivery" left the form — POC details is its own card.

## Open questions / conflicts

**Gaps vs Lovable (2026-10-07 list) — status today:**
- Built: lifecycle stages, board, date range, Export, quotes, Sales settings, filters, asset-order lifecycle.
- Not built / not asked (no sign of them in the code as of 2026-11-06): **status tabs with counts** on the orders list; Fulfilment (FP/3PL), Window and Created columns; Customers credit / exposure / open orders / YTD revenue; Save draft on the fuel order create.
- Lovable's switcher-icons picker skipped on purpose. Lovable's sales order opening its 3PL page is their bug, not copied.
- Lovable colours stages differently (Requested grey, Dispatched amber) — asked; Pavan set Scheduled yellow, Dispatched blue.

**Still open:**
- Should an Expired quote offer **Resend**?
- Asset Orders "Go to today" vs the tomorrow default.
- Not wired: time zone on typed dates; real email/SMS sends; unit conversion (unit is only a label); global search doesn't pick up stage renames.
- Pill style trial (2026-10-09) is Sales-only; whether it moves into the DS and replaces chips everywhere is Pavan's call.
- Price list, markets, SLAs, notification defaults, sample stages and sales reps are **invented**; no Pricing-module work behind the price list.

**Conflicts between sources (later date wins):**
- **"Blocked lane/status decision."** The memory index still says the Sales board is blocked on it; the gap note shows Pavan chose the five stages on 2026-10-07 and they are built. **Resolved — not blocked.**
- **Destinations.** `prototypes/unified-view/README.md` lists Fuel Orders and Asset Orders as separate destinations; merged into one Orders page on 2026-10-07. **Merged wins.**
- **Landing page.** A 2026-10-05 code comment says Dashboard is first "so it is where Sales opens"; since 2026-10-07 Sales opens on Orders (`MODULE_LANDING`). **Orders wins.**
- **Spelling.** Memory writes "Cancelled"; code and screens use **Canceled**.
- **Quote footer.** Memory lists "Save as Draft + Send quote" as one of five proposed clashes awaiting go; the quote sheet code (same day) shows it built.

## Where it lives

| What | File (under `prototypes/unified-view/`) |
|---|---|
| Orders page (list, board, map, banner, bulk) | `SalesOrdersScreen.tsx` |
| Orders model (two kinds, columns, sort, group, default dates) | `salesOrders.ts` |
| Fuel order sheet | `OrderSheet.tsx` |
| Fuel stages, driver → stage rule | `data.ts` (`FUEL_ORDER_STAGES`, `stageAfterDriver`) |
| Asset orders | `assetOrders.ts` |
| Quotes list / sheet / model and pricing | `QuotesScreen.tsx`, `QuoteSheet.tsx`, `quotes.ts`, `quoteStore.ts` |
| Dashboard | `SalesDashboard.tsx` |
| Settings page / store and stage lookups | `SalesSettingsScreen.tsx`, `salesSettings.ts`, `ConfiguredForm.tsx` |
| Shared summary and activity cards | `SheetCards.tsx` |
| Pills | `Pill.tsx` |
| Nav and landing | `UnifiedView.tsx` (`SALES_NAV`, `MODULE_LANDING`) |
| Lovable reference | https://unified-ui-revamped.lovable.app/sales?module=sales&tab=fuel |

**Sibling docs:** delivery-orders.md · 3pl-brokerage.md · fuel-supply-and-sourcing.md · fleet-trucks-and-routes.md · dispatch-and-operations.md · customers-and-sites.md · customer-portal.md · assets-tanks-and-leases.md · service-work.md · master-data.md · product-overview.md
