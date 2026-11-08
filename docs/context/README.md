# Context layer — load only what the task needs

Everything known about FleetPanda and this workspace, split by subject. **Read this
page first, then open only the docs your task names** — usually one or two. Each doc
starts with a "Load this when / Not for" line so you can confirm the pick.

Last updated: 2026-11-06 · Owner: Pavan Shetty

## Pick by task

| If the task is about… | Load |
|---|---|
| Anything, starting cold | `product-overview.md` (+ `working-agreements.md` once per session) |
| Fuel products, terminals, suppliers, loading accounts, rack prices, Best-Buy sourcing, supply contracts, load orders | `fuel-supply-and-sourcing.md` |
| Trucks, compartments, trailers, hubs, drivers, shifts, hours of service, routes, travel time, editing routes | `fleet-trucks-and-routes.md` |
| The dispatcher's day: requests, load planning, utilization, live tracking, delays, exceptions, priority orders | `dispatch-and-operations.md` |
| A delivery order: statuses, lanes, the order sheet, windows, lines and top-off, documents, recurring orders | `delivery-orders.md` |
| Brokering to outside carriers: vendors, invitations, quotes, assigning, the 3PL Directory, 3PL dashboard | `3pl-brokerage.md` |
| Customers, contacts, credit and terms, ship-tos and sites, Customer 360, Ship-to 360 | `customers-and-sites.md` |
| What the tenant's customers see — the Customer Portal | `customer-portal.md` |
| Tanks and rental assets, tank monitors, leases, movement orders, asset journey, Asset 360 | `assets-tanks-and-leases.md` |
| Service orders, technicians, price book, parts, agreements, maintenance, compliance | `service-work.md` |
| Quotes and sales orders, the Sales module | `sales.md` |
| The Master Data module: its menu, the mirror rule, which pages are built and how | `master-data.md` |
| Any screen, component, token, layout, motion or UI rule | `design-system.md` (a router into `docs/fpds/`) |
| How to reply, what not to build, "push it", "sync it", the misses log | `working-agreements.md` |

Common pairs: a 3PL order screen → `delivery-orders.md` + `3pl-brokerage.md`;
load planning → `dispatch-and-operations.md` + `fleet-trucks-and-routes.md` + `fuel-supply-and-sourcing.md`;
a Master Data page → `master-data.md` + the entity's doc; any UI build → add `design-system.md`.

## How these docs are kept

- **Each fact lives in one doc**; others link to it. Business facts here, design rules in `docs/fpds/`.
- **Every doc has the same shape:** In one paragraph · Glossary · How it works · Decisions already made · Open questions / conflicts · Where it lives.
- **The code and the module READMEs stay the source of truth.** These docs summarize them and name their sources; when one disagrees with the code or a newer instruction from Pavan, the newer wins — fix the doc.
- **Update on "push it"** when a session changed a domain fact (a status, a rule, a decision, an open question answered). Bump "Last updated" on the doc you touched.
- New subject that fits nowhere → a new doc in this folder with the same shape, and a row in the table above.
