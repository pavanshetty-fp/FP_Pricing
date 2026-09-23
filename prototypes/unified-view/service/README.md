# Service Work — the service-order module


> **THE LIFECYCLE IS FIVE LANES AND TWELVE STATUSES (2026-09-23).** A LANE is
> a place in the work — whose problem is this now. A STATUS is why it is
> there.
>
> | Lane | Statuses |
> |---|---|
> | **Open** — nobody is on it | Drafted · Parts pending · Linked order |
> | **Assigned** — somebody is, but not today | Assigned |
> | **Working** — it is in the field | Yet to start · Ongoing · Needs approval |
> | **Completed** — the visit is over | Completed · Completed — linked |
> | **Synced** — the money has been checked | Yet to be reviewed · Reviewed |
>
> Cancelled sits apart, behind a rule. **The two Open statuses that are not
> "new" are the point**: a remainder from a partial visit and a spawned linked
> order are both work nobody is on, which is what Open means. Every Open card
> carries the lane's act — **Assign a technician** — which opens the sheet at
> the Technician card. **Working sorts by what is next**: today's jobs first,
> soonest at the top.


> **THE PARTIAL VISIT — TWO SCENARIOS (Pavan, 2026-09-23, revised).** Ten
> parts needed, five on the van. The five go on and the work is recorded
> either way; `returnMode` decides where the other five live.
>
> - **`continue` — the same order carries on.** Same number, back to **Open**,
>   technician and date cleared, because a second visit needs both and nobody
>   has picked either. Its part list keeps the fitted quantities, so the order
>   carries its own progress and is not done until every line is full. **No
>   second record.**
> - **`neworder` — this one is done; the rest is a new order.** The parts that
>   went on are complete and the order says so (`Completed — linked`). What is
>   owed becomes its own order with its own number, linked back.
>
> **`suborder` was wrong and is retired** — it made a child `SO-1048-2`, which
> split one fault into two records while pretending they were one, so the
> progress lived on neither. `rollforward` before it just moved the order to
> tomorrow and could not say that five of ten went on.
>
> **"Parts pending" is the one status that is both unassigned and already
> visited.** The invariants say so explicitly; it is the whole shape of a
> partial visit.

> **SUPERSEDED — the first pass at the partial visit (2026-09-23).** When a technician fits some of what a
> job needs and not all of it, the order splits along the PARTS. What went on
> stays with the labour and mileage it took; what did not becomes a debt, and
> `returnMode` decides its shape — a **sub-order under the same number**
> (`SO-1048-2`, one fault, one reference, two visits) or a **new order of its
> own**, linked back. `rollforward` was retired: it moved the whole order to
> the next day and could not say that three of five hoses went on.

> **CHANGE LIST OF 2026-09-23 — read
> `docs/unified-view/service/changes-2026-09-23.md` before touching this
> module.** Seventeen requested changes, analysed: two already built, five
> field-level, four that are one question about WHO, five that belong to the
> technician app as a separate mobile product, and one new surface on the
> asset. **Five decisions are open and three of them block work.**

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
rather than a caption under it, and the add HANGING off the card's corner (§10f;
corrected 2026-09-23 — it used to say "the table's last band", which contradicted
the DS). Three
stacked inputs in a row was a form pretending to be a table — the columns had
no headers, so a reader had to work out which box was the quantity and which
was the money, on every row.

A part's line total is computed, never typed: quantity × unit is arithmetic,
and a box for it is a box to get it wrong in. A **fee has one money column**,
because a fee's amount IS what was typed — two headers called Amount was the
part table's shape forced onto something that does not have it.

### Labour is a list of VISITS, and the total is their sum

**SUPERSEDES the single pair of boxes** (2026-09-23). Once `continue` keeps
one order across trips, "when did the work start" stops having one answer: two
hours on Tuesday and forty minutes on Thursday is not a two-hour-forty job
that began on Tuesday.

- **One row per visit — Started · Stopped · On site.** Each row's duration is
  its own clock and can be typed over in hours and minutes; overruling a row
  keeps that row's clock reading beside it and leaves the other trips alone.
  The half hour that should not be billed happened on ONE of them.
- **Each row names its technician**, because a partial job's second trip is
  often somebody else — an order that records two visits and one name cannot
  say who did which half. The board card lists them all: the assignee with its
  detail line, then anybody who VISITED but is not on it now, as
  "<name> — earlier visit".
- **The total is a `tfoot` row**, carrying the hours and the money, because
  that is why anybody adds them up.
- **A running visit has no stop time** and counts up. Only the last visit may
  be running, and an invariant says so.
- **`startedAt`, `completedAt` and `labor` are MIRRORS of the list**,
  maintained only by `syncVisits`. `completedAt` now means "when somebody last
  left site", not "is this done" — the status is the only thing that answers
  the second.
- **Labour rounds to the MINUTE, not the quarter hour.** It used to round to
  quarters because labour is billed in them; that died the moment the stamps
  sat next to the duration and a 55-minute visit read "1 h 0 m".

### Labour is typed in hours and minutes; the clock fills it in

**SUPERSEDES the single-handle sliders** (2026-09-23). Both were one number
somebody entered, and neither is that any more.

- **Labour is two boxes, `[h] [m]`, always present.** Start-to-finish fills
  them; typing over them is not a mode. It is the number most often corrected
  on the whole record, so the correction cannot live behind a press — and
  "1 h 23" is what a technician says, where 1.38 is a rounding error waiting
  to reach the invoice. When it has been overruled the card still says what
  the clock read, with one press back to it.
- **Cost per hour is beside it, and it is the ORDER's.** An after-hours
  callout, a contract customer and a warranty job are three different numbers.
- **Mileage has no field here at all.** It is not part of what labour costs,
  and a third box under a pair made the card a miscellany of numbers. It comes
  from the Standard trip setting and still shows in the Summary and on a
  quote.

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
