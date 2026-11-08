# Dispatch and operations
> **Load this when:** the task touches the dispatcher's job, request types (future-dated, recurring, tank-monitor, same-day priority), planning horizon, the 95% utilization goal, Plan New Load (order board, assign truck, truck detail, fulfillment ledger), suggested routes, oversized or split orders, Live Dispatch (route tracking, status lanes, last-minute orders, delay / exception alerts), or the use-case / edge-case catalog. **Not for:** truck classes, compartments, HOS, the time / speed model or the Edit Routes editor (see `fleet-trucks-and-routes.md`); terminals, contracts, Best Buy and load-order sourcing (see `fuel-supply-and-sourcing.md`); ship-to and asset records (see `customers-and-sites.md`, `assets-tanks-and-leases.md`).
> **Sources:** `DS Claude 2026/docs/fleet-panda-context-README.md`, `fleet-panda-domain-model.md`, `dispatcher-entities.md`, `plan-load-rules.md` (§1–2, §6.5, R6–R9, §7–§11), `prototype-kickoff.md`, `use-cases-and-edge-cases.md`, `planning-updates-for-dispatch.md` §6–8; `DS Claude 2026/dispatch-handoff.md`. **Last updated:** 2026-11-06.

## In one paragraph
A **dispatcher** owns one or more hubs and everything in them: ship-tos, fleet and nearby terminals. Customers' requests arrive as future-dated, recurring, tank-monitor-triggered or same-day priority. The dispatcher plans **tomorrow and beyond, one day at a time**, by assigning orders to trucks, letting the system derive compartments and a route, and closing the day with a fulfillment ledger. The headline goal is **≥ 95% aggregate fleet utilization per day** (counting reload cycles) with the shortest profitable routes and no customer escalations. Once routes exist, **Live Dispatch** runs the day: tracks trucks, groups routes into yet-to-start / ongoing / completed, slots in urgent orders and flags delays.

## Glossary
| Term | Meaning |
|---|---|
| Tenant | The fuel distribution business using the platform; owns fleet, hubs, bulk plants, contracts; employs dispatchers and drivers. |
| Dispatcher | Main persona. Plans and supervises one or more hubs + hub regions. Persona in prototypes: Dana Mercer, Corpus Christi Depot. |
| Order request | A need acknowledged (product, quantity, ship-to); not yet planned. |
| Order | Planned and assigned to a truck. In the planner, one product line for one ship-to on one truck. |
| Scheduling window | Ship-to-level window when delivery must happen; 2–12 h; same every day. |
| Preferred window | Narrower preferred arrival inside (or outside) the scheduling window. |
| Utilization | Planned gallons ÷ effective fleet capacity for the day, fleet-wide. |
| Effective capacity | Physical capacity × load cycles (a truck doing 2 cycles counts 2×). |
| Partial delivery | Delivering less than requested to a ship-to. Avoid. |
| Split across ship-tos | One compartment serving several ship-tos in sequence. Normal. |
| Delivery units | Pre-chopping an oversized order into compartment-sized chunks (parked). |
| Order board | The day's list of ship-to orders; entry point of the planner. |
| Fulfillment ledger | End-of-plan coverage summary (gallons %, orders %, per-product %). |
| Sector | One of 6 equal wedges of a hub region; a planning lens, not a hard boundary. |
| On-call / priority stream | Same-day, out-of-the-ordinary requests injected around the plan; not part of the normal order book. |
| Premium | Urgency + value (often implicitly pays more); can outrank larger-volume work. |
| System 1 / System 2 | One truck per ship-to vs consolidated multi-stop routes (analysis baseline). |

## How it works

### The dispatcher's scope
- Handles one or several hubs; dispatch is distributed, no global scope by default.
- Takes customer requests, creates orders, sends trucks to terminals (load orders) and to ship-tos (delivery orders).
- Plans against availability of drivers, trucks / trailers and products (availability rules still TBD).
- Today, assignment is kept in Excel; intake is mostly by phone, some email.

### Request types and demand signals
1. **Future-dated** — most common; tomorrow or later.
2. **Recurring** — standing orders on a cadence (weekly, bi-weekly, 4× a month, 4× in 3 weeks…); auto-generated. Recurring dominates real demand.
3. **Tank-monitor-triggered** — asset level crosses a threshold → auto order request.
4. **Urgent / priority** — same-day; disrupts a committed plan.
- Two signals: time-based (schedule) and consumption-based (monitor). For monitored assets, **whichever fires first** wins; an early monitor order can precede the recurring one.
- Industry delivery models: will-call, automatic keep-full (telemetry + degree-day / K-factor), scheduled, emergency 24/7.
- Customers sometimes pull a recurring delivery earlier when a tank empties early.

### Planning horizon
- Default: plan **tomorrow and beyond** (about a week ahead), one day at a time. Today is locked and executing.
- Today's plan is touched only when a priority order forces it.
- Any future day stays re-openable as more requests arrive (e.g. plan day +10, revise on day +9).
- Prototype demand: ~8% of a hub's ship-tos order on a given date, 1–2 products each, seeded by date. Corpus Christi day = 40 ship-tos / 56,100 gal.

### The goal: utilization + routing
- **≥ 95% aggregate fleet utilization per day.** Fleet-level, not per truck; counts multi-load cycles. Deploy the **minimum trucks** needed; over-deploying dilutes the metric.
- Load optimization and route optimization are coupled: a load choice can commit a reload that must survive the window and HOS.
- Three demand regimes (example fleet 40,000 gal):
  - **A** demand < capacity (25,000): pick the right subset of trucks / compartments.
  - **B** demand ≈ capacity (40,000): full fleet; match compartments to orders with minimal waste.
  - **C** demand > capacity (55,000): prioritize cycle 1 vs cycle 2 vs next day.
- Two objectives that conflict: tenant profitability (avoid under-use, excess miles, dry runs, misfills, misuse, "age") and zero escalations (serve every order in its window). The priority policy between them is still open (O1).
- Prototype shows per-truck utilization; the day-aggregate rollup is not built.

### Plan New Load — the demand-first manual flow (build target)
Flow: **Day setup → ① Order board → ② Assign orders → truck → ③ Truck detail → ④ Fulfillment ledger**, then loop to the next truck.
- **Day setup:** one day, default tomorrow, scoped to hub(s). **Day feasibility pre-check:** if demand exceeds fleet + drivers + distance, surface at-risk orders and prompt to move them to another date *before* building trips. No next-day spillover.
- **① Order board:** map on top, list below. Row = one ship-to order: customer · region · window · recurring badge · per-product gallon chips · total · status. Simple list, not a Gantt. Two streams: the planned / recurring book and a pinned on-call / priority queue. Coverage meter on top. Sort / group by region, window, customer. Map ↔ list selection sync.
- **② Assign:** a focus mode, not a new screen — map frames only the selected run, list narrows to the batch with its products, a **ranked truck picker** appears. Each assignment checks product carriable, capacity, window, shift + buffer, misfill (hard block).
- **Truck ranking:** (1) product fit; (2) capacity vs batch gallons, prefer one load; (3) least leftover; (4) region ownership + on shift. When no truck covers the batch, recommend a split.
- **Fulfillment preference:** (1) one truck completes a ship-to in one visit (reload for volume) → (2) one truck serves 3–4 ship-tos a shift → (3) several trucks, several ship-tos → (4) several trucks, same ship-to (fallback). Prefer reloads only when meaningful (on the way / cheaper); in manual mode offer the reload, don't force it.
- **③ Truck detail:** compartments are **derived** — roll the batch up by product, one product per compartment, span a second compartment if needed, respect retained fuel and restrictions. Feasible only if products ≤ compartments and gallons fit. Example: ULSD 2,700 · CLR 1,000 · Kerosene 1,400 → C1 2,700/3,000 · C2 1,000/1,500 · C3 1,400/2,000. Route is **unified**: Load vs Deliver stops in one list. Multiple load orders allowed (reloads).
- **④ Ledger:** coverage as gallons % (headline), orders %, per-product %; uncovered orders listed; routes + load orders + trucks; KPIs: miles, fleet fill %, trucks used. Persists across the session.
- Show-terminals toggle on the board map overlays load points within 75 mi of the hub.

### Mismatch rules (O14, resolved 2026-06-30)
- Incompatible product → compartment: **hard block** at the compartment.
- Truck full mid-batch: add a reload so the same truck continues (e.g. 10 selected, 7 fit, reload, last 3); if the reload won't fit the shift, push the rest to another truck or reschedule; or remove ship-tos.
- Product not carriable: assign to a truck that carries it; if none, reschedule.
- Ship-to needs more than one load: prefer one truck + reloads; multiple trucks only when no truck has enough compartments.
- Partial fit: assign what fits; remainder reloads or returns to the pool.
- Splits are auto-suggested; split by product (or quantity for big 1–2-product orders).

### Oversized orders and the solver (direction, not built)
- Simplification (2026-07-06): assume a ship-to's quantity ≤ truck capacity. The live case is **compartment depletion along the route → reload**.
- No enforced cheapest-first pattern; dispatcher picks any truck, ship-to, sequence; the system flags and suggests (R9.2 supersedes the old ranked order: bigger compartment → reload → two trucks → split days).
- When automated (top tier): sequential-with-feedback backbone + **ALNS** for hard clusters; always overridable and explainable. Exact MILP won't scale at 25–100 trucks.

### Assisted features in the planner
- **Suggested routes:** shown when the active truck has products and no stops yet. Up to 3: **Best value** (gallons/mile), **Window-first**, **Shortest**. Each obeys product match, capacity, reloads, windows (widened to 4–6 h), shift + 30-min buffer, no dry runs, return to hub. Add commits the whole route.
- **Per-pin chooser** (specified): a pin in 2+ suggested routes shows a count badge; double-click opens a chooser; always adds a whole route, never a single stop.
- **Sector lens:** hub circle (30 mi default, adjustable) cut into 6 equal sectors with per-sector demand by product, and a scheduling-window slider in 2-hour bands. A ship-to is "in" a band if its window overlaps it. Sectors give focus and seed clusters; trucks may cross them.

### Modes and tiers
- Governing principle (agreed 2026-06-30): **one flow, manual → autonomous continuum**. Same plan object, same atomic actions, mixed initiative, always overridable and explainable.
- Mode 1 Assisted (today) vs Mode 2 Autonomous (whole-fleet plan; to define).
- Provisional tiers: T1 Planner (manual + constraint safety), T2 Co-pilot (suggestions, partial-fill and terminal economics, recurring autofill), T3 Auto-pilot (fleet-wide auto-plan, region ownership, review-and-approve, exceptions).

### Field research (Sharan, 2026-06-30)
- Drivers own regions and customers; cross-region delivery is unusual.
- Typical **3–4 deliveries per shift**, fewer when spread out.
- Single truck per ship-to is the norm; low product mix; repeat orders dominate.
- Urgent work is opportunistic: no standby drivers; staggered starts; give it to a just-starting driver who knows the site.
- Priority is ranked; higher-value customers can beat bigger volumes (golf over construction).
- Load efficiency over radius: load about 3,500 to deliver 3,000; avoid return fuel.
- Adoption depends on simple, guided UI.

### System 1 vs System 2 (Corpus Christi day, 2026-06-30)
- 40 ship-tos / 56,100 gal, 5 trucks / 37,000 gal. Consolidated routes vs one-truck-per-order: loads 40 → 10 (−75%), miles 401 → 176 (−56%), dry-run miles −69%, driver-hours −37%, shifts 5 → 3, average fill 19% → 76%, 4.0 stops per load, all 40 orders served.

### Live Dispatch (day-of)
- Opened after routes are created. Scope of the brief: Corpus Christi Depot, 2026-09-07, two shift waves, 10 routes.
- **Clock is prototype-owned:** data carries planned times; a scrubber (05:00–20:00) with play drives status and truck positions.
- Status: **Yet to start** (before planned start) · **Ongoing** · **Completed** (after hub return). Matches planner hub progress: Yet to start 0% · In progress ~20% · Midway ~55% · Completed 100%.
- Truck position: interpolate along the active leg; park at a stop while servicing.
- Four capabilities: (1) live map tracking, (2) status lanes with route cards (driver · truck · class · % done · ETA · next stop · exception badge), (3) add last-minute / priority orders — insert into a live route by remaining capacity + shift, or spin a short new route, (4) delay and exception alerts.
- Exceptions: **Running late** (projected finish after shift end), **Missed / at-risk window**, **Reload due / low fuel**, **Idle** (dwell longer than expected). Amber = warning, red = hard miss. The planner's three feasibility checks double as live flags.
- Top stat band example: Trucks out · On time · Late · Completed.
- Live ETAs **must** use the planner's time model or planned and live drift.
- Drill-in: hub → load (terminal · supplier · basis · TLC) → deliveries (window · gal · products) → reload → hub, planned vs live.
- Day-of HOS work (duty statuses, 70 h week, split sleeper, ELD entries, DVIR) is a live-dispatch concern.

### Use cases and edge cases (summary)
- Use-case groups: intake, customer / site, fleet / driver, product / compartment, supply, planning (M → A → X), routing, field execution, monitoring, pricing / billing, KPIs. Most are not built.
- Key edge cases: demand > fleet; add-on after planning; order bigger than any truck; cancel after loading; no truck carries the product; truck / driver out of service; retained fuel is the wrong product; misfill (must hard-guard); nearest terminal not cheapest; supplier shortage; terminal down mid-route; overlapping windows; idle-wait for a late window; reload pushes past shift; road-infeasible straight line; runout before delivery; site access blocked; contaminated tank; meter short; driver deviates; auto-plan distrusted, silently undoing edits, or dropping orders (must surface, never drop silently); HOS hit mid-route; hazmat restrictions; dyed fuel to taxable use; stale telemetry.

## Decisions already made
- 2026-06-29: per-pin chooser always adds the whole route; no single-stop option.
- 2026-06-30: demand-first spine, manual-first; route and load unified; compartments derived; time controls are attributes, not sliders; order board + ledger added; ledger locked; O14 resolved; no next-day spillover.
- 2026-06-30: readiness / supply panel → v3; auto-plan UI after manual; explainability with automation tier.
- 2026-07-06: 95% is fleet / day aggregate; R9 simplified (qty ≤ truck); dispatcher picks freely; sector lens is a build target; real ship-to and terminal data kept.
- Live Dispatch scope (handoff): clock in the prototype; four capabilities; standalone HTML served locally (map tiles blocked in Artifacts).

## Open questions / conflicts
- **O1 / O2** priority policy: is fulfillment a hard goal? How to rank when demand > capacity, and what to do with the remainder?
- Which **levers** dispatchers use for a same-day priority order (add a stop, pull a truck back, spare truck) and in what order.
- **O3** define losses: misfill, misuse, age (+ confirm dry run).
- **O4 / O5** autonomy: auto-commit or reviewable proposal; toggle or "Auto-plan the day" action.
- **O6** success metrics. **O7** driver ↔ region model. **O10** recurring model. **O11** request capture. **O12** guidance for less technical users.
- **O15** window philosophy: exploit wide windows, or serve them early to bank slack?
- **O18** order request → order lifecycle.
- **Conflict — next day:** the domain model allows "next day" (regime C, split-across-days) but the planner rule (2026-06-30) is **no next-day spillover**; at-risk orders are moved before planning. Later rule wins in the planner.
- **Conflict — oversized orders:** cost-ordered patterns (domain model) vs free dispatcher choice (R9.2, 2026-07-06). Later wins.
- Field research suggests 3–4 stops per shift; suggested routes can pack 10+ (calibration open).
- Feasibility known only after assign — "validate after assign" leaning, not settled.

## Where it lives
- DS Claude 2026: `index_v2.html` → `shipto_map.html` (Plan New Load), `live_dispatch.html` (Live Dispatch), `edit-routes.html`, `index.html` (V1, never touched), `live-routes.json` (10 seeded routes), `data.json` (4,241 ship-tos + 40 terminals), `gen_requests.py`, `gen_routes.py`; `docs/plan-load-rules.md` (PRD), `docs/use-cases-and-edge-cases.md`, `dispatch-handoff.md`.
- Sibling docs: `fleet-trucks-and-routes.md` (time model, HOS, feasibility checks, Edit Routes), `fuel-supply-and-sourcing.md` (load orders, Best Buy), `delivery-orders.md`, `customers-and-sites.md` (windows, assets), `assets-tanks-and-leases.md` (tank monitors), `3pl-brokerage.md`, `service-work.md`, `sales.md`, `master-data.md`, `product-overview.md`.
