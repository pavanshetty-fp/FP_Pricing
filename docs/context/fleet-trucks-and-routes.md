# Fleet, trucks and routes
> **Load this when:** the task touches truck classes (bobtail, tank wagon, transport), compartments, trailers, meters, retained fuel, hubs / depots, hub regions, drivers, shifts, hours of service (HOS), the route-time / speed model, route feasibility checks, or the Edit Routes swim-lane editor. **Not for:** where fuel is bought or which terminal / contract to use (see `fuel-supply-and-sourcing.md`); the dispatcher's daily planning flow, request types, utilization goal, or live tracking (see `dispatch-and-operations.md`).
> **Sources:** `DS Claude 2026/docs/truck-types.md`, `hours-of-service.md`, `fleet-panda-domain-model.md`, `dispatcher-entities.md`, `plan-load-rules.md` (§5, R5, R8), `planning-updates-for-dispatch.md` §1–5, `edit-routes-spec.md`, `dispatch-handoff.md` §3, §7; shape of `fleet.json` and `live-routes.json`. **Last updated:** 2026-11-06.

## In one paragraph
A tenant's fleet is trucks (and attachable trailers) based at **hubs**. Each truck has a fixed set of **compartments** — one product per compartment — and a flow **meter** that sets how fast it dispenses. Trucks fall into two working classes: **tank wagons** (small, many metered drops, often loaded at the tenant's bulk plant) and **transports** (big, one or few large drops, loaded at terminals). A driver, truck, shift and hub are softly paired and all adjustable. A **route** runs hub → load point → deliveries (→ reload) → back to hub, and must fit the driver's shift and the federal **HOS** limits (11 h driving inside a 14 h on-duty window). Route time is built from road miles at a per-city, per-class truck speed plus fixed per-stop components.

## Glossary
| Term | Meaning |
|---|---|
| Hub / depot | Physical tenant site; where trucks start and end. May co-locate a bulk plant. A tenant has several. |
| Hub region | Invisible boundary around a hub that scopes a dispatcher's ship-tos. Hub ↔ hub region is a fixed 1:1 pair. |
| Truck class | Tank wagon or Transport; bobtail is a small tank-wagon subtype. |
| Bobtail | Small straight-truck tank wagon (2-axle, under ~3,500 gal). |
| Tank wagon | Straight truck for local multi-drop metered delivery. |
| Transport | Tractor + tank semi-trailer for bulk hauls; bottom-loaded at the terminal rack. |
| Trailer / pup | Attachable tank that adds capacity; same compartment structure as a truck. |
| Compartment | Fixed section of a tank with its own capacity; holds one product. |
| Retained fuel / heel (`base`) | Product left in a compartment from a prior run. |
| Misfill | Wrong product into a compartment or customer tank (e.g. dyed into clear). Hard-blocked. |
| LCR meter | On-truck flow meter; measures gallons dispensed per compartment; its gpm sets dispensing time. |
| Shift | Dispatcher-defined working window for a driver's day. |
| HOS | US DOT Hours of Service — the regulatory limits behind the shift. |
| ELD | Electronic logging device (driver log). |
| DVIR | Driver vehicle inspection report (pre- and post-trip). |
| Route | Ordered stops: hub start → load → deliver… → reload → hub return. |
| Reload | Mid-route return to a terminal / bulk plant to refill, then continue. |
| Dry run | Driving without product (non-revenue miles). Routes must avoid it. |
| Swim lanes / Edit Routes | Full-screen editor with one lane per route plus an Unassigned pool, for dragging orders between routes. |

## How it works

### Truck classes
| | Tank-wagon class | Transport class |
|---|---|---|
| Job | Local multi-drop | Bulk, one or few large drops |
| Tickets per load | Many small metered tickets | Usually one gross drop |
| Chassis | Straight truck | Tractor + tank semi (± pup / doubles) |
| Typical capacity | ~1,000–5,000 gal | ~7,500–11,500 gal (more with pup / doubles) |
| Compartments | 2–5 small | 3–5 larger |
| Usual load source | Tenant's bulk plant | Terminal / supplier rack |
| Delivery | Metered, pumped into tanks | Bottom-drop, larger volumes |
| Access | Tight sites, farms, yards | Highway, big sites, depots |
- The split is common, **not strict**: tank wagons sometimes load at terminals; transports sometimes serve big customers direct.
- Bobtail vs tank wagon rough line: 2-axle under 3,500 gal = bobtail; 3-axle 3,500 gal and up = tank wagon.
- Equipment catalog: bobtail ~2,000–4,500 gal; 3-axle tank wagon ~3,500–5,000; propane bobtail (MC 331 pressure tank, ~2,500–3,500, single product); transport ~7,500–9,000; truck-and-pup adds ~2,000–4,000; doubles / B-train ~10,000–14,000+ (more common in the Western US). Specialty (aviation, marine, DEF / lube package trucks) is out of core scope.
- Prototype class bands (planning-updates, later): **Bobtail under 3,500 · Tank wagon 3,500–7,999 · Transport 8,000–11,500 gal**.
- Tank specs: DOT 406 / MC 306 (non-pressure aluminum) is the standard for refined fuel trucks; MC 331 for propane; others are rare or out of scope.
- Platform takeaway: one `truckClass` attribute (Tank wagon | Transport), shown as a label / filter in truck selection.

### Capacity limits beyond volume
- **Weight caps the load.** Federal gross ~80,000 lb. Diesel ≈ 7.0 lb/gal, gasoline ≈ 6.0–6.2 lb/gal → a transport holding ~9,000 gal of gasoline may legally carry only ~7,500 gal of diesel. Capacity is product-dependent (not yet modeled).
- Ranges vary by state, axle count and tank build; treat numbers as planning ranges.

### Compartments
- A truck is a single tank or **2–6 compartments**; count and per-compartment capacity are fixed physical properties.
- Compartments may be unequal (e.g. 10,000 gal as 4×2,500 or 1,000 / 4,000 / 3,000 / 2,000).
- **One product per compartment.** Only exception: blend components may share one.
- A multi-compartment truck can carry several products in one trip.
- **Product compatibility:** some products must go in a specific compartment build (e.g. a fuel that needs a double-walled compartment, not single-walled).
- Baffles reduce surge inside a compartment; they are not separate products.
- **Retained fuel** is absorbed by same-product orders, never stacked: fill = orders' total, but never below the retained amount. Example: 1,600 retained kerosene + a 1,150 order → still 1,600; another order → 2,250 (not 3,850).
- Changing a compartment's product warns, lists the ship-tos filled from it, and clears retained fuel on confirm.
- Switch-loading / residue: a compartment that last held dyed or another product must be managed before clear product (contamination and tax risk) — reinforces the misfill guard.

### Trailers
- Same compartment structure as trucks; attach to a truck to raise total capacity.
- Day-of: trailer numbers must be updated in the ELD on every pick / drop / hook.

### Meters
- Each truck carries a meter with a label and gpm. Delivery time = gallons ÷ meter gpm; different meters make materially different route times.
- PRD ranges by class: bobtail ~150–250, tank wagon ~250–400, transport ~500–700 gpm. Later note: ~250–690, 4-inch high-flow ≈ 600.
- Loading uses the **load point's** rack rate (~600 gpm), not the truck meter.

### Hubs and hub regions
- Trucks are assigned to a hub by default but can be reshuffled; current assignment is the source of truth.
- A dispatcher runs a hub region from its paired hub; dispatch is scoped, never global by default.
- Region size varies by source: ~8 mi default (PRD), 11 mi (Corpus Christi data), 30 mi (wireframe and sector lens).
- Multi-hub: planning can span several hubs; each route starts and ends at its own hub. Never assume one origin.

### Drivers and shifts
- Driver + truck + shift + hub are linked, all **soft** — a dispatcher can change any pairing.
- Several shifts a day; "ideally 8 hours", sometimes longer. Field research: real load-and-deliver days ≈ **5–6 h with ±1–2 h** buffer; real-world shifts 8–10 h (480–600 min).
- Prototype shifts: early 05:00–13:00, 06:00–14:00; late 07:00–15:00, 08:00–16:00. Reference shift = 480 min.
- Drivers often own a region and know its customers; they may load in another region but deliver in their own.

### Hours of service (US DOT)
- **14-hour on-duty window**, only after **10 consecutive hours off**. Wall-clock; breaks do not pause it.
- **11-hour driving cap** inside the 14 hours. The rest is on-duty non-driving: fueling, loading, unloading, inspections.
- **30-minute break** required within the first **8 hours of driving**. Plan one well-timed break, not several scattered ones.
- **70 hours in a rolling 7 days** (on-duty + driving + yard moves). 34-hour restart resets the week.
- **Split sleeper 7–3 or 8–2:** only allowed if unused driving hours remain from the previous day; otherwise a violation.
- Duty statuses: Driving, On duty (not driving), Off duty, Sleeper. Personal conveyance cannot advance a load. Yard moves use the 14 h window, not driving hours.
- Log hygiene: paper logbook as ELD backup; BOL numbers and trailer numbers into the ELD; remarks on every duty change; certify logs daily.
- Planner (built 2026-08-01, shift overlay): route time split into **Driving vs On-duty non-driving**; HOS block shows Driving / 11 h · 30-min break (auto when driving ≥ 8 h) · On-duty window / 14 h; an "HOS" chip on a breach and "+30m" when the break applies. Tabs = Overview · Driving · On duty · Off duty · Sleeper. Weekly total is a stub.
- Not yet HOS-split: the per-truck check at Assign and the Edit Routes checks.
- Day-of items (70 h week, split sleeper, ELD, DVIR, duty statuses) belong to live dispatch, not the planner.

### Route-time model (latest)
Route total = **Dispensing + Service + Buffer + Loading + Travel + Reload + Return**.
| Component | Rule |
|---|---|
| Dispensing | gallons ÷ truck meter gpm |
| Service (on site) | 20 min + 1.2 min × assets, per ship-to |
| Buffer (per ship-to, by volume) | under 500 gal → 5 min · 500–1,499 → 10 · 1,500–2,999 → 15 · 3,000+ → 20 |
| Loading (per pickup) | gallons ÷ 600 gpm + 25 min (card-in/out 5 + supplier 15 + in-terminal travel 5) |
| Travel | road miles ÷ city truck speed |
| Reload detour | out-and-back to the terminal (carries distance) |
| Return to hub | last stop → hub; always counts, even though the map line stays open |
- Ship-tos have 5–100 assets (skewed low), giving ~30–100 min on site (average ~63).
- The truck waits if it arrives before a window opens.
- Pre-truck estimates use a representative hub meter (labelled "est."); exact times are computed per truck at Assign.

### Speed model
- Distance: OSRM road distance per leg (straight-line fallback).
- Speed by hub city and class, mph wagon / transport: Houston 22/28 · Dallas 22/28 · Fort Worth 23/29 · San Antonio 24/30 · Austin 21/27 · El Paso 25/31 · Laredo 25/31 · Corpus Christi 27/33 · Beaumont 27/33 · Texas City 26/32 · Midland 29/36 · Odessa 29/36 · any other city 25/31.
- Planning uses the slower **tank-wagon** speed until a truck is assigned.

### Route feasibility — three checks
| Check | OK when | Example failures |
|---|---|---|
| Shift | route time + buffer ≤ shift length | "over by 1h 27m (~9h 27m / 8h)" |
| Window | shift covers the orders' window envelope and no out-of-order conflict (next stop's window closes before the previous one opens) | "shift doesn't cover the windows" · "N window conflicts in order" |
| Truck | fits one load and within capacity | "2 loads needed (1 reload)" · "exceeds truck capacity" |
- Route rules: load before the first delivery; move only while carrying product (no dry runs); reload at a load point when a compartment empties; return to hub.

### Edit Routes (swim-lane editor)
- Opened from the edit icon beside the Routes stat; only when routes exist. Changes apply live; no cancel, only Undo.
- Lanes: **Unassigned** first (cards grouped by nearest route, with a thin left stroke in that route's color), then one lane per route (header · mini-map · order cards · footer).
- Drag an order card between lanes; dropping on Unassigned removes it from a route. A route emptied of orders is deleted.
- While dragging over a route, a **reconnection preview** draws the cheapest insertion (two dotted legs) on the reference map and the lane mini-map.
- Floating, draggable reference map (open by default): unassigned pins only; source and target routes appear during a drag. Card ↔ pin hover cross-highlight.
- Fixed filter sidebar (applies to pins and the Unassigned lane): products, scheduling window, order type (All / Recurring / Non-recurring), sectors + sector radius, search, clear all.
- Footer: driver · truck · capacity, the three checks as green / red segments, then **Undo last change** (only in the lane that just broke) and **Configure loads & sourcing**, which opens the route detail and returns to Edit Routes on Apply.
- Live-dispatch reuse: same model for in-flight routes, but limit drops by **remaining** capacity and shift time, and never move stops already completed.

## Decisions already made
- 2026-07-01: per-truck meter in fleet data; loading uses the rack rate; return-to-hub counts; two-phase estimate (est. → exact at Assign).
- 2026-07-04: two-factor time model (on-site per ship-to + travel); assets are a first-class ship-to attribute.
- 2026-06-30: shift is a read-only truck attribute, not a slider.
- 2026-07-25: HOS rules captured; 2026-08-01: shift overlay made HOS-aware.
- Later (planning-updates pack): flat speed replaced by city + class speed; per-stop volume buffer replaces the flat 30-min buffer in the breakdown; dispensing and service split.

## Open questions / conflicts
- **Speed:** 45 mph (R5.1) → 35 mph (R8.5) → city + class speed (latest). Use the latest.
- **Buffer:** flat 30 min after the shift (R5.3, R8.1) vs per-ship-to volume tiers (latest). The Shift check still reads "route time + buffer".
- **Class bands:** truck-types doc (tank wagon ~1,000–5,000; transport ~7,500–11,500) vs prototype bands (tank wagon 3,500–7,999; transport 8,000–11,500). Prototype bands are later.
- **Compartment count:** 2–6 (domain model) vs 2–5 per class (truck-types).
- **Meter gpm ranges** differ between PRD and later notes.
- **Shift length:** 8 h reference vs field 5–6 h ±1–2 h vs HOS 11 / 14 h (O8 open).
- Not yet modeled: product-weight capacity, compartment-material compatibility, 10 h-off precondition, pre-trip inspection time, truck / driver availability (out of service, PTO, maintenance), staggered start times.
- Does the platform also plan transport runs and bulk-plant replenishment, or tank-wagon only (O13)? Prototype is tank-wagon only.

## Where it lives
- DS Claude 2026: `fleet.json` (products 12 · trucks 100 · trailers 50 · hubs 8; each truck: id, type, compartments [capacity], totalCapacity, driver, shift, group, meter {label, gpm}; hub: name, city, state, lat, lng, regionMi); `live-routes.json` (meta, hub, products, terminals, 10 routes; stop types hub-start / load / deliver / reload / hub-return); `gen_fleet.py`, `gen_routes.py`; `index_v2.html` → `shipto_map.html`; `edit-routes.html`; `docs/edit-routes-spec.md`, `docs/hours-of-service.md`, `docs/truck-types.md`.
- Sibling docs: `fuel-supply-and-sourcing.md` (load points, terminals, contracts), `dispatch-and-operations.md` (planning flow, live dispatch, exceptions), `delivery-orders.md`, `customers-and-sites.md` (ship-tos, windows, assets), `assets-tanks-and-leases.md`, `master-data.md`, `product-overview.md`.
