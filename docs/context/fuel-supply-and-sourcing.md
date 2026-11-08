# Fuel supply and sourcing
> **Load this when:** the task touches products, blends, terminals, rack markets, suppliers, brands, contracts, MTQ / pace, allocation, loading numbers or loading accounts, PPC cards, OPIS pricing, Best Buy, total landed cost, bulk plants, or load orders (where a truck pulls fuel from). **Not for:** trucks, compartments, drivers, shifts, HOS or travel time (see `fleet-trucks-and-routes.md`); how the dispatcher plans the day or tracks it live (see `dispatch-and-operations.md`); the 3PL broker flow itself (see `3pl-brokerage.md`).
> **Sources:** `DS Claude 2026/docs/fuel-supply-sourcing-model.md`, `fleet-panda-domain-model.md`, `plan-load-rules.md` (§5, R10, R11, §11 log), `dispatcher-entities.md`, `use-cases-and-edge-cases.md`, `planning-updates-for-dispatch.md` §3, `dispatch-handoff.md` §7d; `FP-DS-2026/prototypes/unified-view/threepl/orders.ts` (Loading accounts), `masterdata/terminals.ts` (header). **Last updated:** 2026-11-06.

## In one paragraph
A tenant (the fuel distributor) buys fuel and then delivers it. It buys from **suppliers** (jobbers who invoice it) for a **brand** (the refiner name on the price), priced off the **OPIS** index for a **rack market**, and physically lifts it at a **terminal** — or draws it from its own **bulk plant**. Buyers think **contract-first, not terminal-first**: the terminal is only where a contract gets lifted. Each day a pricing / buying person sets a **Best Buy** directive (preferred source per product, ranked R1/R2/R3) based on **total landed cost** and **contract pace**; the dispatcher mostly just picks the terminal and the loading number, and records a reason when they deviate. A **load order** is one pickup at one terminal (or bulk plant) for a route; it moves gallons into the contract's **Planned** and then **Lifted** balance.

## Glossary
| Term | Meaning |
|---|---|
| Product / fuel type | What is delivered: ULSD, dyed (red, off-road, tax-exempt) diesel, clear (on-road, taxed) diesel, petrol, kerosene, DEF, propane, lubes, aviation, marine. |
| Branded / unbranded | Every product can be listed either way. A blend can also be branded or unbranded. |
| Comparable product | A substitute: if A is unavailable, comparable B may be used; non-comparable C may not. |
| Blend | Two source products in a fixed ratio, e.g. E20 = 80% petrol + 20% ethanol. |
| Brand / refiner | The name on OPIS and the rack price (Valero, Shell, Phillips 66, Chevron). Not necessarily who invoices. |
| Commercial supplier / jobber | Who the tenant signs with and pays (e.g. Kendrick Oil). Holds the big credit line with the refiner and sub-contracts allocations. |
| Rack market | The OPIS **pricing location** ("Amarillo rack"). Contracts are written against it. One rack market has many terminals. |
| Terminal | The **physical** loading site ("Magellan Amarillo"). Belongs to one rack market. No appointments; card-in / card-out. |
| Loading rack | The physical loading bay inside a terminal. Not the same as a rack market. |
| PPC / credential | The driver's terminal access card or code. On swipe, the terminal resolves which account, product and contract the pull books against. An access key, not a contract or a price. |
| Contract | Brand × supplier × rack market × product + OPIS index + spread + allocation. Terminal-independent price. |
| Spread | The +/- cents per gallon over the OPIS index (supplier margin plus fixed costs). |
| Allocation | Gallons the company is supposed to lift on a contract, over 1 / 7 / 10 / 30-day and full-contract horizons. The ceiling. |
| MTQ (minimum take quantity) | The minimum that must be lifted out of the allocation; missing it costs a penalty. The floor. |
| Pace | On pace / behind (penalty risk) / ahead (contract may run out early). Calculated by the tenant. |
| Must lift | Tag the dispatcher sees on a loading number when the day's Plan is below MTQ. |
| Loading number | Dispatcher-assigned key for driver ↔ supplier validation (planning prototype). Supplier-scoped, contract-only. |
| Loading account | The 3PL / Master Data version: an alphanumeric account number that ties a terminal, a supplier and the products loadable on it. |
| Spot | Buying at today's market price with no contract. |
| Bulk plant | Tenant-owned storage of pre-bought fuel, with a recorded cost basis. Not every tenant has one. |
| Best Buy | Daily sourcing directive from pricing / the business owner: preferred source per product. |
| TLC (total landed cost) | Base price + freight (source to route). The common yardstick for contract, spot and bulk. |
| Load order | One pickup at one terminal or bulk plant, loading the route's products for that leg. A route may have several (reloads). |
| BOL (bill of lading) | Generated at every terminal load; exact product and gallons lifted. Reconciled by finance later. |
| OPIS / DTN | Daily wholesale price feeds. OPIS is in scope; a DTN parser is planned. |

## How it works

### Products and blends
- Product mix per customer is usually low: one product, sometimes 2–3, rarely 4–5.
- Clear vs dyed diesel matters for tax and compliance; delivering dyed into a taxable use is a violation.
- Blend fulfillment, three ways (all exist): pre-mixed by the supplier; components loaded in the same compartment; components in separate compartments, mixed on site.
- Later source (2026-07-08, R10.10): **blends are made at the terminal**, so a load-order line can itself be a blend.
- OPIS product types: ULSD, Red Dye Distillate, Heating Oil, Winter Distillate, Biodiesel (B0 / B5 / B10 / B20); No. 1 and No. 2 distillates.

### Terminals, rack markets and suppliers
- Terminals exist nationwide (~400 US racks); rack price resets around 6 pm daily, OPIS-benchmarked.
- One rack market → many terminals. One contract → usable at many terminals → one terminal loading account per terminal.
- One credential (PPC) ↔ many terminal loading accounts (many-to-many). One PPC can work at several terminals in the same rack.
- Card-in / card-out records driver, terminal, supplier and timestamps; the supplier validates the lift against the contract.
- A supplier is usually present at many terminals. A terminal can hold several contracts for the same product, from the same or different suppliers.
- Back-up suppliers: a tenant usually keeps **up to 3 backups** besides the primary; normally at the same terminal, rarely at a different one.
- Master Data (2026-11-03): a terminal has a **market**, an address, coordinates and a **geofence radius** (metres) a truck must be inside to count as at the rack. Supplier types: Major oil, Distributor, Trader, Retail partner.
- Master Data rule: a terminal's suppliers, a supplier's terminals, the counts, a supplier's market and where a product is stocked are all **read from the loading accounts, never typed**.

### Contracts and pricing
- Contract price = **OPIS index (location × brand × product × basis) + spread**. Example: Amarillo / Valero / ULSD daily average 2.50 + 0.03 = 2.53.
- Price is the same at every terminal under that contract.
- OPIS rows carry no commercial supplier: location × brand × product × timing → price.
- Pricing basis options: daily average, low, high. Rate types in the import: Default (the likely load price per supplier-terminal), Rack low, Rack high, Rack average.
- Industry norm: ratable monthly volumes often 85–115%; allocation can be cut in shortages; consignment means the supplier keeps title until dispensed.
- A tenant may hold several contracts for the same product with different suppliers, so MTQ tracking and Best Buy are **per contract**, not per product.

### Allocation, MTQ and balances (decided 2026-07-21)
- Allocation is **company-level and shared** by all dispatchers; they draw one pool down together, tracked per loading number.
- The dispatcher works to **today's** (1-day) allocation only; the buyer watches all horizons.
- MTQ sits inside the allocation (e.g. allocation 100k → MTQ ~80–85k).
- Balances per loading number for the day:
  - **Planned** = gallons of load orders created (not yet completed).
  - **Lifted** = load orders completed.
  - **Available = Allocation − Planned − Lifted** (mock: 10,000 − 5,000 − 1,000 = 4,000).
- Selecting a source does not reserve gallons; **confirming** the load order moves them into Planned. Completion moves Planned → Lifted.
- Over-allocation: when Plan exceeds Allocation → warn → "request more allocation for today" → buyer notified. Approve = allocation raised. Reject = that loading number is disabled and ranks shift up (R2 → R1).
- The dispatcher sees the **must lift** tag, not the MTQ horizon numbers.

### Loading numbers (planning prototype, 2026-07-21)
- One loading number = exactly one supplier; **never shared across suppliers**.
- Covers one or many of that supplier's contracts (and 1+ terminals / products). A supplier's contracts may share one number or use different ones.
- Contract-only: spot lifts have none. Bulk plant: to be decided.
- The buyer ranks loading numbers as lift preferences R1 / R2 / R3 (e.g. "Exxon 1234"). Dispatcher defaults to R1.

### Loading accounts (3PL and Master Data, 2026-09-25 → 2026-10-29)
- A loading account is **the one table** behind the load order's three selects: Terminal, Supplier, Loading account.
- It belongs to a terminal **and** a supplier and lists the products loadable on it. A line's product must be on the account.
- Terminal and Supplier are not free lists; they are the distinct values of this table, narrowed by what is already chosen.
- An account can list more than one terminal and more than one supplier (sample data marked invented).
- **One account serves the whole order**, so it must carry every product on it. If no account covers the set, all three lists come back empty ("cannot be loaded from one place").
- Account names are numbers: terminal code + digits (2026-10-29), never a name.
- Every product loads somewhere: each has at least three accounts across at least two terminals (sample data rule, 2026-10-29).
- Shape note: each load-order line = product · terminal · supplier · loading account · optional "excluded" flag. No load order = null (the partner supplies the product).

### Best Buy and source choice
- Best Buy is upstream of dispatch and not automated. It names, per product, a preferred source among **contract / spot / bulk plant**, as up to 3 ranked choices.
- All three are compared on **TLC = base + freight**; freight is always included, so a far terminal with cheap spot can lose to a nearer source.
- **MTQ applies to contracts only.** A contract behind pace can be preferred even when it is not cheapest; this "why" must be explainable.
- Live-route data rule: preferred = the contract when its MTQ is behind / at-risk, else the cheapest landed. MTQ states in that data: on-pace, behind, at-risk (must lift), ahead.
- Information to surface for the decision: today's market price per product; pace and remaining obligation per contract; bulk-plant inventory and cost basis.
- Source preference ladder (R10.6): (1) one terminal, one supplier fills the whole load → (2) different suppliers, same terminal → (3) different terminals → (4) per-product split across sources. Split only when availability forces it.
- The dispatcher's act is picking **where** to load. They may pick a terminal with no contract when spot there is cheaper net of freight.
- Override (R10.13): the dispatcher may fall back to R2 / R3, or pick an unranked contract, supplier or spot — always **with a reason**. Two flows, both to be designed: buyer approval required, or dispatcher-is-buyer (no approval).
- Show **all** contract sources, not just the top 3; the rest list unranked below (R10.11).

### The load-order sourcing unit (planning prototype)
- Option 1: terminal-first source cards. Option 2: one table per product, rows = ranked R1 / R2 / R3 then unranked. **Only one ships.** Option 2 became the default view (2026-07-21).
- Option 2 columns: Supplier / Terminal (ranked) · Type (contract + ID, or spot) · Allocation · Planned · Available · Lifted · TLC.
- Tabs below the ranked rows: Contracts · Spots · Bulk plants. Spots show TLC only. Bulk plants show available, lifted and TLC, no allocation / planned.
- Known trade-offs: long tables for multi-product loads; "one terminal fills the whole load" is harder to see; terminal off-route freight is not shown beside TLC.

### Bulk plants
- Tenant-owned large tanks; fuel bought at a good rack moment and stored for savings.
- Inventory carries a cost basis so it compares fairly to spot and contract.
- Often co-located with a hub. Usually replenished by transports and drawn by tank wagons (see `fleet-trucks-and-routes.md`).
- A load order, or one product within it, can load at the bulk plant as a first-class source (R10.7).

### Load orders and reconciliation
- Each load order = one pickup at one terminal, loading all the route's products for that leg.
- The first stop of every planned route is a terminal pickup (load order at position 0).
- After the terminal is picked, the system resolves the PPC(s) and carded driver(s) for that terminal loading account.
- On BOL ingest, walk **PPC → terminal account → contract → OPIS index** to reconcile the lift.
- Planning-to-live data carries per product per load: source, supplier, landed, TLC, MTQ.

### OPIS import (specified, not built)
- Import all suppliers / terminals, or a saved selection. Shows previous import dates.
- Produces two files: a **Standard** CSV (everything needed for loading) and a **Normalised** file feeding a "Today's Pricing" module.
- Auto-sync on every OPIS drop (~4× a day) or 1–3× at chosen times; feature-flagged, with manual import.
- Each price row: Move, Pre Move, date / time; per supplier-terminal combination.

## Decisions already made
- 2026-07-06: product, contract, Best Buy and blend work parked behind routing — later reopened.
- 2026-07-08 (R10): Best Buy is a pricing-department directive; dispatcher picks the terminal; override needs a reason tied to the **preferred** choice, not the cheapest.
- 2026-07-21: contract-first model; brand ≠ supplier; rack market ≠ terminal ≠ loading rack.
- 2026-07-21 (Arnav call): allocation is shared, not per dispatcher; dispatcher **does** see "must lift"; ranked rows are loading numbers; two override flows to be designed and shown to the customer.
- 2026-07-21: Option 2 per-product table is the default view; bulk plants surfaced via the source-type tabs.
- 2026-09-25 / 2026-10-29 (Pavan): loading accounts can span several terminals and suppliers; account names are numbers; every product loads from at least three accounts.
- 2026-11-03 (Pavan): Master Data terminals and suppliers derive their relationships from loading accounts.

## Open questions / conflicts
- **MTQ meaning.** 2026-06-24 entities doc: minimum per pickup. Domain model: minimum per period. 2026-07-21 PRD: minimum within the allocation. Latest (07-21) wins.
- **Contract scope.** Domain model: supplier-wide, liftable anywhere that supplier is. Supply model (2026-07-21): written against a **rack market**. Latest wins.
- **Who sets Best Buy.** Domain model: business owner. PRD: pricing department / buyer. Treated as the same upstream role; confirm.
- **Loading number vs loading account.** PRD: a loading number never spans suppliers. 3PL / Master Data: one account may list several suppliers. Later code (2026-10-29) allows it, but its multi-supplier rows are marked invented. Needs a decision.
- **Available formula.** Arnav also said "allocated − planned"; correct only if Planned includes Lifted. Confirm before build.
- **Bulk plant loading number** and bulk sourcing detail: TBD (R10.12 deferred, then partly surfaced in tabs the same day).
- **Blend ratio:** product-defined only, or customer-custom? Which of the three fulfillment modes to model first (O16).
- **Spot validation** at the terminal: how a no-contract lift is validated and paid (O17).
- How the pricing directive is authored or ingested (O9 remainder).
- "OPIS NYH BARGE DELIVERED SPOT (SRI)" rate type: unknown in source.
- Product-weight capacity (diesel is heavier) affects how much can be sourced per load; see `fleet-trucks-and-routes.md`.
- All MTQ, pace, inventory and supplier prices in the prototypes are **stubbed**.

## Where it lives
- Planning prototype (DS Claude 2026): `index_v2.html` → built `shipto_map.html` (load-order sheet, Option 1 / 2 toggle); `live-routes.json` (per-load sourcing fields); `data.json` (40 real Texas-area terminals).
- FP-DS-2026: `prototypes/unified-view/threepl/orders.ts` (loading accounts, load-order selects), `threepl/LoadOrderTable.tsx`, `masterdata/terminals.ts` and `masterdata/FuelSourceScreens.tsx` (terminals and suppliers pages).
- Sibling docs: `fleet-trucks-and-routes.md` (truck classes, compartments, travel time), `dispatch-and-operations.md` (Plan New Load, live dispatch), `3pl-brokerage.md` (broker load orders), `master-data.md` (terminal / supplier records), `delivery-orders.md`, `customers-and-sites.md`, `product-overview.md`.
