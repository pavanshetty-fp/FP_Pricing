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

## The switch points

They are not preferences. Each turns a whole step of the flow on or off, and
the board and the order sheet change with them.

1. **Native billing** — the invoice writes itself on approval, or somebody
   raises it by hand.
2. **Service cost feeds asset payback.**
3. **Manager approval required** — or work approves itself the moment it is
   recorded, and the Needs approval lane is never used.
4. **Return-visit behaviour** — spawn a linked return visit, or roll the same
   order forward to the next day.
5. **Price book** — a work type brings its usual parts and a suggested fee, as
   editable lines rather than silently.
6. **Portal intake** — customers raise jobs themselves.
7. **Service technician app** — assigned orders flow to the technician's field
   app for on-site completion, or they are handled by hand from the order
   sheet.
8. **Field quoting** *(nested under 7, and dead without it)* — the technician
   sends the customer a quote before starting, or there is no quote step at
   all.

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
- **"Create invoice" is not a separate screen.** It is what the order sheet's
  own act becomes when native billing is off. Another page would be another
  place to learn for an act that belongs to this record.
- **The technician's app is a separate product, shown from inside this one.**
  It was cut on 2026-09-18 on exactly that ground and restored on 2026-09-21,
  because "separate product" is the reason it has to be here rather than the
  reason it does not: whether the field app is in play decides what the
  DISPATCH screens are allowed to do. See below.

## The order sheet is two columns, like the 3PL one

One rule decides which side a card is on: **can you type into it?** The job's
parts go left, in the sequence you fill them. What the job HAS BECOME goes
right — Summary, Billing, Record — derived, read-only, true whether or not
anyone is looking. Once an editable number and a computed one share a column
they look identical and the reader stops knowing which is which.

It takes `xxwide`, the size that exists for exactly this shape. The rail costs
the tables 340px plus a gap, and at `wide` that came out of columns already at
their minimum.

**The rail stays put while the form scrolls** (`sticky top-0`, the same as the
3PL sheet's). It is the running account of the job — what it comes to, whether
it is billed, when it was worked — and those are the questions a reader has
while looking at ANY part of the form. Scrolled away with the sections it
describes, the total was only visible next to the tables that produce it, which
is the one place it is least needed.

### Parts and fees are the DS's editable table

The same idiom the 3PL lines table is built from: fixed layout, a Surface-1a
header band, cells with no chrome of their own, the total as a ROW of the table
rather than a caption under it, and the Add row as the table's last band. Three
stacked inputs in a row was a form pretending to be a table — the columns had
no headers, so a reader had to work out which box was the quantity and which
was the money, on every row.

A part's line total is computed, never typed: quantity × unit is arithmetic,
and a box for it is a box to get it wrong in. A **fee has one money column**,
because a fee's amount IS what was typed — two headers called Amount was the
part table's shape forced onto something that does not have it.

### Labour and mileage are single-handle sliders; the arrival time is a picker

The same control as the delivery window, minus the second handle. A window is
two facts, a start and an end; four hours is one and sixteen miles is one.

**An arrival is not a measure, so it is not a slider.** A customer is told
"half past twelve", and a handle on a 24-hour track asks somebody to aim at it.
The window slider earns its track because a window is a span you SIZE; one
moment is a value you CHOOSE, and the list of them is short. Scheduled date and
scheduled time share a row — they are one answer — and the technician gets its
own line under them, because it is a different question.

The fixture's times sit on the picker's half-hour grid: a stored value the
picker cannot represent shows in the field and vanishes the moment anybody
opens it.

The figure is PRINTED beside the label rather than estimated from where the
handle sits, and **what it costs sits at the other edge** — the rate and the
money — because that is the reason anybody moves it.

**They sit side by side, 24px apart.** They are two halves of one answer — what
the visit cost in time and in travel — and stacked they read as two unrelated
questions with the parts table's rhythm between them. Every other pair of
fields in this sheet is a two-column row; these are the same kind of pair. The
technician's app keeps them stacked: at 560px two scales side by side is two
scales nobody can read.

The technician's app uses the same control for the same two numbers. Two
screens must not ask for the same number two ways.

### The date is the DS date control, not a native `datetime-local`

The browser's own field draws a calendar glyph this app cannot theme; in dark
mode it rendered as a pale box belonging to no palette here, and it was the one
field in the sheet that did not match the date on a 3PL order. Leaving a job
unscheduled is an answer, so it is offered inside the picker rather than only
by clearing a field nobody can clear.

### The sheet autosaves, because every side sheet does

`docs/ds/ux/2-rules.md`, Side-sheet anatomy: **a side sheet with editable
fields autosaves, always, whether it is creating or editing.** Debounced 600ms,
with the `DraftStatusChip` beside the title saying so, no Cancel — "Cancel"
promises to undo and a sheet that has already kept everything cannot keep that
promise — and **no Save and no Update**. The footer's primary is the NEXT ACT on
the record; a primary that says "Update" on a sheet that has already updated is
a button for a job that is done.

### The strip above the footer says what the act is waiting on

The 3PL sheet's mandatory-steps banner, verbatim: one missing field at a time,
with a counter and a way to step through them, so three missing fields cost one
line rather than three. Each label is the INSTRUCTION — "Choose a customer",
not "Customer" — because the reader is being told what to do, not what they are
looking at. A stalled job's reason beats the list: it is the thing that stopped
the work, and the fields can wait behind it.

### Open is this module's Draft, so its act is called Create Service Order

The job exists the moment it is reported; the footer's act is where somebody
says it is real work with a name against it. That is the same act 3PL's
**Create Order** performs on a draft, so it carries the same words. "Assign
technician" named the FIELD it needs rather than the thing it does — the
technician is the precondition, the act is committing the order — and the
create form uses the same words, because one act should not have two names
depending on whether the record already existed.

### The blocked reason is on the button, not beside it

A clause standing permanently next to the primary is a sentence the reader has
to read on every visit, including the ones where nothing is wrong — and at the
foot of a long form it read as part of the button's label. It belongs to the
press: the button is dead, pressing it says why, and the sheet is quiet the
rest of the time. (A disabled control fires no pointer events, so the tooltip
hangs off a wrapper — otherwise it would never open on the one state it exists
for.)

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
- **The technician's mobile app**, which is its own product.
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
| `sheet-parts.tsx` | the single-handle slider and the rail card |
| `ServiceSettingsScreen.tsx` | the switch points |
| `TechniciansScreen.tsx` | the roster |

Customers, ship-tos and assets are REUSED from the rental directory. The
technicians, fault text, labour hours, parts and rates are invented and flagged
as such in `work.ts`.

## The technician's app

Added 2026-09-21, from the Service Work Orders artifact. `TechnicianApp.tsx`.

**With the switch on, dispatch hands the job over and stops.** The order
sheet's act on an Assigned, In progress or Parts-pending job becomes *Open
technician app* / *Resume in technician app*, and the arrival, quote and
completion rungs are gone from the sheet — because the person holding the job
is standing in front of the asset. With the switch off the old ladder is the
whole flow and dispatch records the work by hand, which is what *Service
technician app: off* means.

**It opens over the sheet, at phone width, with its own header.** The break
from the app's own chrome is the point: this is somebody else's product, seen
over the dispatcher's shoulder, and the moment it stops looking like the rest
of the app is the moment nobody mistakes it for something dispatch can do.

### The flow, and why each step exists

| Step | Why it is its own step |
| --- | --- |
| **Arrive** | "On the way" and "on site" are the two facts the Assigned and In progress lanes exist to tell apart. Somebody has to say it. |
| **Quote** | Parts + fees, priced before a spanner is lifted. Only with Field quoting on. |
| **Waiting** | Work does not start until the customer says yes. A screen that skipped it would be lying about a step that really does hold jobs up — and it offers *Customer wants it changed*, because a screen with only a yes has never met a customer. |
| **Work** | Log what was used, then one of two endings. |

**The quote is a snapshot taken the moment it is sent** — parts and fees as
they stood then. Labour and mileage cannot be on it: they are not known until
the job has happened. That gap is the module's sharpest rule and this is where
it gets created, so it is enforced here rather than explained later. On the
work step the panel shows *Quoted X · Now Y* side by side — naming the gap
while it is still being made is what stops it being a surprise on the invoice.

**Two endings, not one button with a caveat.** *Completed* needs the labour
hours and a signature. *Parts pending* needs neither — it needs to know what is
missing — and it states what the `returnMode` switch will do with it BEFORE the
press, because a technician who finds out afterwards has been told too late.

**Leaving is not cancelling.** Closing the panel walks away from the job; the
order is exactly where it was.

### What it does not do

No offline state, no photos, no route or day list, no push. It is the one flow
that changes what dispatch sees, not the technician's whole product.
