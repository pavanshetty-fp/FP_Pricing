# Product overview — FleetPanda and this workspace

> **Load this when:** starting any task cold; you need to know what FleetPanda is, which modules exist, who uses which, where a module's work lives, or which doc to read next. **Not for:** the detail of any one module — follow the links.
> **Sources:** `START-HERE.md`; `prototypes/unified-view/UnifiedView.tsx` (module list, nav); `DS Claude 2026/docs/fleet-panda-context-README.md`; memory notes `project_fp_ds_foundation`, `feedback_audience_split`, `feedback_master_data_mirrors`, `project_backlog`. **Last updated:** 2026-11-06.

## In one paragraph

FleetPanda is a US fuel-delivery logistics platform. Its customers ("tenants") are fuel distributors who take fuel requests from their own customers across many delivery sites, source fuel at terminals or their own bulk plants, load it into compartmented trucks, and deliver it inside each site's window — or broker the delivery to an outside carrier (3PL). Around that sit sales, service work on equipment, rental assets and tanks, leases and pricing. Pavan is the designer; this workspace is the FleetPanda Design System (FP-DS-2026) plus React prototypes that prove each module's screens on it.

## Glossary — terms that cross modules

| Term | Meaning |
|---|---|
| Tenant | The FleetPanda customer company (a fuel distributor) — the people using every module except the Customer Portal. |
| Customer | The tenant's own account that buys fuel/service. Has ship-tos. See `customers-and-sites.md`. |
| Ship-to (site) | A delivery location of a customer — address, coordinates, a geofence radius, its tanks. |
| First Party (FP) | The tenant delivers with its own trucks and drivers. |
| 3PL | The tenant brokers the delivery to an outside vendor carrier. See `3pl-brokerage.md`. |
| Delivery order | A request to deliver products to a ship-to in a window. See `delivery-orders.md`. |
| Terminal / supplier / loading account | Where fuel is picked up, who sells it, and the account that ties the two. See `fuel-supply-and-sourcing.md`. |
| Asset | A tank, tote, skid or trailer — rental or customer-owned. See `assets-tanks-and-leases.md`. |
| Master Data | The module that holds every record; mirrors other modules on purpose. See `master-data.md`. |
| Lovable reference | `unified-ui-revamped.lovable.app` — the product team's reference prototype. Copy its content, but on our design system, and fix its data mismatches. |

## The modules

| Module | Audience | State in the prototype | Context doc |
|---|---|---|---|
| First Party | Tenant | Fuel orders (Unified View "Fuel Orders") | `delivery-orders.md`, `dispatch-and-operations.md` |
| 3PL | Tenant | Dashboard, Delivery Orders, Recurring Orders, Directory | `3pl-brokerage.md`, `delivery-orders.md` |
| Sales | Tenant | Dashboard, Quotes, Sales Orders, Settings | `sales.md` |
| Service Work | Tenant | Service orders, technicians, technician app, price book, parts, agreements, maintenance, compliance, performance | `service-work.md` |
| Master Data | Tenant | Directory (Customers, Ship-tos, Assets, Products, Vendors, Terminals, Suppliers) built; All documents not built | `master-data.md` |
| Customer Portal | **The tenant's customers** — the ONLY customer-facing module | Separate build | `customer-portal.md` |
| Lease, Pricing | Tenant | No destinations on purpose (none invented) | — |
| Dispatch / load planning | Tenant (dispatcher) | Separate HTML prototypes in `DS Claude 2026/` | `dispatch-and-operations.md`, `fleet-trucks-and-routes.md` |

## Rules that apply across modules

- **Audience split** — only the Customer Portal faces the tenant's customers. A feature built for the portal does not spread to tenant modules unless Pavan asks.
- **Master Data mirrors** — any record in another module can also live in Master Data; showing it in both places is intended, not a conflict. Same component and words for the same data.
- **One source per fact** — a count, a status or a total shown in two places is computed from one record, never typed twice.
- **The Unified View is the source of truth** for designs; other modules and repos reuse its units.

## Where things live

| Path | What |
|---|---|
| `FP-DS-2026/` | The repo (`github.com/pavanshetty-fp/FP-DS-2026`, branch `main`). |
| `FP-DS-2026/src/` | Design-system components and tokens. |
| `FP-DS-2026/prototypes/unified-view/` | The Unified View app — Sales, 3PL (`threepl/`), Service (`service/`), Master Data (`masterdata/`). Each module has a README. |
| `FP-DS-2026/prototypes/customer-portal/` | The Customer Portal. |
| `FP-DS-2026/docs/fpds/`, `docs/ds/` | The design system docs — see `design-system.md`. |
| `FP-DS-2026/docs/context/` | This context layer. |
| `FP_Service-Work` (separate repo) | Service Work handed off on its own; synced from the `service-work-handoff` branch. |
| `DS Claude 2026/` | Dispatch, load-planning and live-route prototypes plus the domain model docs (`docs/`). |
| `*.html` beside the repo | Single-file builds shared with the team (unified view, customer portal, design reference). |

## Open (long-standing)

- Settings page held back — it would govern several modules.
- Backlog parked 2026-10-23: Undo, Android-style accessible sizing, empty / error / offline states.
