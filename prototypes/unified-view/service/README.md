# Service Work — the maintenance module

Created 2026-09-18.

## What this module is

Everything this business rents out — tanks, pumps, meters, the hoses and
nozzles hanging off them — needs looking after. It gets inspected on a cycle,
it breaks, it gets swapped, it gets taken away. That work is what this module
holds, and the thing it holds is a **work order**: one visit, to one asset, at
one site, on one day, by one technician.

## Three decisions taken when it was created

Pavan had no preference on any of the three, so they were taken here and are
written down rather than left to be re-derived.

**1. The asset is the subject.** 3PL's order is about a quantity going to a
place; this one is about a THING that is already there. The asset is what the
history hangs off — *this tank has been out three times this year* is the
question the module exists to answer — so an order that named a site and not an
asset would be a visit nobody could account for afterwards. The assets are the
ones in the existing Rental Assets directory, not a second copy of them.

**2. It is our own technicians, not partners.** 3PL already covers work put out
to third parties and priced. Here the question is who is free and when, not who
is cheapest, so there is no quoting and no partner table. *If service work ever
does go out to third parties, that is a change to make deliberately.*

**3. The board is the default, as in 3PL.** The work has a lifecycle and what
somebody does all day is watch it move. A calendar laid out by technician and
day is the other plausible answer and may still be the better one for the
scheduling half — but it is a component the DS does not have, and the board is
the shape this product already teaches.

## The lanes

`Reported · Scheduled · In Progress · Completed · Invoiced`, then behind a rule
`On Hold · Cancelled`.

- **Reported and Scheduled are two facts, not one.** A fault that has been
  raised and a fault with a technician and a date against it are different
  problems, and the gap between them is the backlog the board exists to show.
  The invariant is exact: Reported means nobody is assigned, and every stage
  after it means somebody is.
- **On Hold sits apart** for the same reason 3PL's Cancelled does — it is not a
  step of the work, it is a way of not doing it today. It is the only lane whose
  cards carry an alert, because it is the only one with a reason to give.

## What the card says

Customer → **Asset & Fault** → Scheduled → Technician. The fault sits second
because it is the only line on the card that is not a lookup: everything else
can be guessed from the columns, and the sentence somebody typed cannot.

Per-lane defaults, following the rule the 3PL board settled on:

- **Reported** drops the schedule — there is no date worth reading yet, and the
  technician unit saying "Nobody assigned" is the point of the lane.
- **Completed and Invoiced** replace the schedule with **Completed on** (date,
  time and hours on site). A finished job is asked when it RAN.

## The board opens on a week, not a day

3PL opens on one day because a delivery IS a day. A reported fault from Tuesday
is still a reported fault on Friday, so this board opens on today ±3 and the
question it answers is "what is outstanding".

## Not built, named rather than faked

- **The work-order sheet.** A card opens nothing yet — there is no detail view,
  no way to assign a technician, no way to close a job.
- **Creating a work order.** No CTA on the view bar.
- **The technician's own day** — their jobs in order, with travel between them.
  The Technicians list is a roster with an open-job count, not a schedule.
- **Recurring maintenance.** Inspections and preventive service are job TYPES
  here; nothing generates the next one when the last is done.

## Files

| File | What it is |
|---|---|
| `work.ts` | the model, the lifecycle, the fixture, the invariants |
| `ServiceWorkScreen.tsx` | the work-order board and table |
| `TechniciansScreen.tsx` | the roster |

Customers, ship-tos and assets are REUSED from the 3PL directory. The
technicians, the fault descriptions, the labour hours and the parts are
invented, and flagged as such in `work.ts`.
