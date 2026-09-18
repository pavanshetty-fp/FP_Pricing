# Service Work — the service-order module

Rebuilt 2026-09-18 against the eight-stage flow, on the FP design system and
the structures the other two modules already established.

## What a service order is

One job on one deployed asset: somebody reports it, a dispatcher books it, a
technician does it, a manager signs it off, and it is billed. The asset is the
subject, because the history hangs off the asset — and the assets, customers
and sites are the ones already in the rental directory, not a second copy.

## The eight stages

| Stage | What it is waiting on |
|---|---|
| **Open** | nobody is on it |
| **Assigned** | a technician is, but they have not arrived |
| **In progress** | they have arrived and are working |
| **Parts-pending** | they stopped, and it is a part that stopped them |
| **Needs approval** | the work is recorded and a manager has not signed it |
| **Approved** | signed off; the invoice exists |
| **Completed** | the invoice reached accounting and the job is closed |
| **Cancelled** | it is not happening |

- **Open and Assigned are two facts, not one.** A job nobody is on and a job
  somebody is on but has not started are different problems, and the gap
  between them is the dispatcher's backlog. It is an invariant: Open means no
  technician, and every stage after it means one.
- **Approved and Completed are two facts too.** Approved says a human agreed
  the numbers; Completed says the money left the building. The module actually
  waits — an approved invoice reaches accounting on a batch sync, and the
  prototype delays it rather than jumping straight to Completed and making the
  distinction invisible.
- **Parts-pending sits IN SEQUENCE, not behind the rule.** Waiting on a part is
  a normal thing for a job to be doing, and it is the lane a dispatcher works
  from first thing. Only Cancelled is set apart.

## The money rule, which is the sharp edge of the whole module

**A quote is parts + the predefined fee**, sent and approved on site BEFORE the
work starts. It *cannot* contain labour or mileage — at the moment it is sent
nobody knows how long the job took or how far the van went.

**An invoice is raised after the job and may be bigger:** actual labour hours,
mileage, and any extra parts the technician turned out to need. The gap between
the two is not an error. It is the thing the customer has to be able to see, so
both figures stay on the order and the sheet states the difference in words.

A quote is stored as a **snapshot** — what the lines WERE when it was sent.
Recomputing it from today's lines would quietly rewrite what was agreed.

Parts at cost × quantity · labour at $95/h · mileage at $1.50/mi · fees.

## The eight switch points

They are not preferences. Each turns a whole step of the flow on or off, and
the board, the order sheet and the technician's app all change with them.

1. **Native billing** — the invoice writes itself on approval, or somebody
   raises it by hand.
2. **Service cost feeds asset payback.**
3. **Manager approval required** — or work approves itself on submit, and the
   Needs approval lane is never used.
4. **Return-visit behaviour** — spawn a linked return visit, or roll the same
   order forward to the next day.
5. **Price book** — a work type brings its usual parts and a suggested fee, as
   editable lines rather than silently.
6. **Service technician app** — assigned work goes to the field app, or
   dispatch records the finished work on the order itself.
7. **Field quoting** (nested under 6) — quote on site before starting.
8. **Portal intake** — customers raise jobs themselves.

**Two named profiles** sit at the ends of the range and are one click each:
*Unified* (everything on) and *Dispatch layer* (everything off).

They live on a rail item inside the module, NOT in the app's Settings page —
that one will govern several modules and is held back pending it.

## What was built with the established structures, not around them

- **The board** is the 3PL board component, with eight lanes, per-lane sorts
  and the same per-lane card-field menu.
- **The table** is `ListTable` with the same column grammar as the two orders
  tables — number, type, who, where, what, when, who is doing it, state, money.
- **The order sheet** is `RecordSheet`, with the footer's next-act ladder: the
  primary always names the ONE thing that moves the job on from here, and when
  it cannot be pressed the reason sits beside it rather than on it. The rung
  depends on the settings as much as on the stage.
- **The technician app is a sheet, not a page** — it is somebody else's view of
  this job, the same relationship the vendor quote sheet has to a 3PL order, so
  it opens over the record and closes back onto it. Narrow on purpose: it is a
  phone in a van.
- **"Complete manually" and "Create invoice" are not separate screens.** They
  are what the order sheet's own act becomes when the technician app is off and
  when native billing is off. Two more pages would be two more places to learn
  for two acts that belong to this record.

## Per-lane card defaults

- **Open** keeps the schedule and says "Nobody assigned" — that is the point of
  the lane. There is no money yet.
- **Needs approval, Approved, Completed** replace the schedule with **Recorded**
  (when it ran, and hours on site) and put the total on the technician unit. A
  finished job is asked when it RAN, not when it was booked.
- A lane is only offered the fields it can draw.

## Not built, named rather than faked

- **The customer's portal.** The switch controls whether "Portal request"
  exists as an intake source; there is no portal in this prototype.
- **Emailing a quote or an invoice to a customer.** Both are acts on the record
  here; nothing leaves the building.
- **The technician's own day** — their jobs in order, with travel between them.
  The Technicians list is a roster with an open-job count, not a schedule.
- **Recurring maintenance.** Nothing generates the next inspection.
- **Asset payback.** The switch says the cost feeds it; the screen that shows
  the payback is the rental module's, and is not built.

## Files

| File | What it is |
|---|---|
| `work.ts` | the model, the eight stages, the money rules, the fixture, the invariants |
| `settings.ts` | the eight switch points and the two profiles |
| `ServiceWorkScreen.tsx` | the board and the table |
| `ServiceOrderSheet.tsx` | the order, with the next-act ladder |
| `TechnicianAppSheet.tsx` | arrive → quote → record, as the technician sees it |
| `ServiceSettingsScreen.tsx` | the switch points |
| `TechniciansScreen.tsx` | the roster |

Customers, ship-tos and assets are REUSED from the rental directory. The
technicians, fault text, labour hours, parts and rates are invented and flagged
as such in `work.ts`.
