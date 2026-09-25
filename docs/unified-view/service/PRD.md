# Service Work — product requirements

**As of 2026-09-25** · owner: Pavan Shetty (design) · domain input: Deepika ·
built in the Unified View prototype (`prototypes/unified-view/service/`).

Service Work is the FleetPanda module for **keeping customers' equipment
working**: tanks, pumps, meters, dispensers and monitors at customer sites.
A job is raised, scheduled, sent to a technician, worked on site, priced,
approved, invoiced and sent to accounting. The module has two sides: the
**dispatcher's web app** (board, order sheet and reference screens) and the
**technician's phone app**. Both work from one shared list of orders.

> **Read `../map.md` first.** This file says *what the module does and why*.
> *How it looks and behaves* is governed by the design system (`docs/ds/`),
> which always wins, and by the Unified View binding docs
> (`../1-components.md`, `../2-layouts.md`, `../3-interactions.md`). Service
> assertions are in `evals.md`, next to this file.

---

## 1. Who uses it

| Person | Where | What they do |
|---|---|---|
| **Dispatcher** | web: Service Orders board + order sheet | takes the call, creates the order, schedules it, assigns a technician, watches it run. With no technician app, runs the whole job |
| **Salesperson** | web, same as dispatcher | raises jobs, adds the site assessment when the technician rings it in |
| **Technician** | phone: Technician App | sees their jobs, arrives, starts work, writes the assessment, confirms parts, adds fees, sends the quote, pauses, completes, or reports missing parts |
| **Service manager** | web | approves finished work when approval is switched on |
| **Accounting** | outside the app | receives invoices on a batch sync |
| **Customer** | outside the app today | receives the quote and the final bill; approves the quote (offline today) |

---

## 2. Settings that change the product

Each company switches these in **Service Settings**. They change which steps
exist, so every flow below says what happens with each one on and off.

| Setting | On | Off |
|---|---|---|
| **Service technician app** | assigned orders go to the technician's phone | the dispatcher runs the job from the order sheet; Start work and Send quote are shown up front |
| **Field quoting** (only with the app) | the technician sends a quote before starting | no quote step on the phone |
| **Native billing** | the invoice writes itself when work is approved | someone presses "Generate invoice" |
| **Manager approval required** | finished work waits in *Needs approval* | it approves itself on completion |
| **Price book** | picking a work type brings its standard parts and fees | parts and fees are typed by hand |
| **Portal intake** | "Portal request" is offered as an intake source | every job is keyed in by staff |
| **Service cost feeds asset payback** | job cost rolls into the asset's return | not used |
| **When parts are missing** (three choices) | see §6.4 | — |

Two presets exist: **Unified** (everything on) and **Dispatch layer**
(technician app, quoting, billing and price book off).

---

## 3. The order and its stages

### 3.1 What an order holds

- **Customer and ship-to site.** Required, answered first. In the same card: **intake source** (customer call, sales rep, flagged inspection, portal) and **priority** (Normal, High, Urgent).
- **Schedule:** a date and a **window** (e.g. 9:00–12:00), set on a slider in 30-minute steps. Required.
- **Technician.** Optional; needed to move the order to Assigned. "No technician" empties it.
- **Work and assets.** A table: work type, asset, description. One row per asset; each can carry **several work types** as nested rows. **The asset is optional** ("NA (non-mandatory)"; "No asset" empties it).
- **Parts** (name, quantity, unit cost; later, how many were fitted) and **fees** (name, amount). Both can be picked from a list or typed.
- **Labour:** cost per hour, and hours worked. Hours come from the technician's clock, or the dispatcher types them; typed hours win.
- **Quote** (a snapshot of parts, fees and the labour rate), **site assessment** (rich text and photos), **invoice** state, **final bill** sent, links to a follow-up order, and an **activity log**.
- **No mileage.** Removed from the module on 2026-09-25.

### 3.2 Stages

Six board lanes. A lane can hold more than one status.

| Lane | Statuses | Meaning |
|---|---|---|
| **Open** | Drafted · Parts pending · Linked order | nobody is on it |
| **Assigned** | Assigned | someone is on it, not started |
| **Working** (called **Job day** with no technician app) | Yet to start · Ongoing · Awaiting approval · Needs approval | in the field or being recorded, or waiting on the customer or a manager |
| **Completed** | Completed · Completed — linked | the visit is over |
| **Synced** | Awaiting payment · Payment delayed · Unpaid · Payment received (also Yet to be reviewed · Reviewed) | accounting has it; payment status is set by accounting, never pressed in the app. Unpaid is the only red |
| **Cancelled** | Cancelled | set apart from the working lanes |

Badges are coloured by **what the reader should do** (DS ui §10b): amber means
waiting on somebody, blue means under way, green means done, grey means
neither. Nothing is red except the Urgent priority.

### 3.3 What moves an order (the footer's next act)

The order sheet's footer always offers **one next act**. Other legitimate acts
sit in a **···** menu beside it. A dead button says why when pressed.

| From | Next act | To |
|---|---|---|
| Drafted | **Move to Assigned** (needs customer, site, window, technician) · **Save as Draft** beside it | Assigned · stays Drafted |
| Parts pending / Linked order | **Assign a technician** | Assigned |
| Assigned (technician app on) | **Mark as completed** · ··· Start work, Send quote, Open technician app | Ongoing / Needs approval / Completed |
| Assigned (technician app off) | **Send quote to customer** + **Start work** beside it; after the quote, **Mark as completed** | as above |
| Ongoing | **Mark as completed** · "Some parts unavailable" | Needs approval or Completed; see §6.4 |
| Needs approval | **Approve** | Completed (invoice written if native billing is on) |
| Completed, no invoice | **Generate invoice** | Yet to be reviewed |
| Completed, invoiced | Mark synced to accounting | Reviewed |
| Recorded (any) | ··· **Send final bill to customer** | no change |
| Cancelled | **Reopen** | Drafted |

**Completing is gated:** work started, hours recorded, an hourly rate, a
technician.

---

## 4. Screens

### 4.1 Service Orders (the board)

- **Board or table**, over a date range, with saved views, search, and filters (status, work type, priority).
- Board cards show the customer, site, assets, schedule, technician and a badge. Open cards have **Assign**.
- Card fields can be turned on and off per lane.
- **New service order** opens the order sheet.

### 4.2 The order sheet

- A full-width side sheet (the DS rule for any creation). Two columns: the form on the left, a fixed **rail** on the right.
- **Autosaves.** No Save and no Cancel; the chip beside the title says "Draft saved".
- A new order is a real **Drafted** order from the first change.
- **Waterfall:** only *Customer details* (customer, ship-to, intake source, priority) shows until customer and ship-to are picked. Then Schedule, Technician, Asset details, Site assessment, Quote, Parts, Fees, and Labour and cost.
- **A new order starts empty:** no work type, no parts, no fees. Picking a work type brings its price-book **parts and fees** once, with no duplicates, and nothing is removed if the work type is dropped.
- **Send quote to customer** tick next to *Create new order*: one press does both.
- **Rail:** Summary (parts, labour, fees, running or invoice total, quoted amount), **Record** (raised by, intake, arrived, work recorded, signature, links; **hidden while the order is being written**), Assessment edit requests, Visits, Activity.
- **Site assessment** appears once work has started, or once the scheduled time has come. It's optional, and the dispatcher or a salesperson writes it.

### 4.3 Technician App (phone)

It sits on the rail only so it can be shown in the prototype. It's a separate
product a technician signs into. At the top of the prototype, "Signed in as"
switches which technician's phone you're looking at.

- **My jobs:** every job assigned to them, grouped by day. Sort by execution, priority or created. Filter by date, customer or site. Search. Status tabs.
- **New order** from the field, with the technician defaulted to themselves.
- **Inside a job**, in order:
  1. **Arrived at site.**
  2. **Start work** (only one job can be in progress).
  3. **Site assessment** (rich text, photos; editable until the quote is approved, after that it needs the dispatcher's permission).
  4. **Jobs:** the dispatcher's plus any added on site. Parts are confirmed per job. Dispatcher jobs can only be *skipped with a reason*; added jobs can be deleted.
  5. **Fees.**
  6. **Send quote to customer**, then *Quote approved* or *Quote rejected*.
  7. **Pause / Resume** with a reason (break, waiting on customer, fetching a part). Paused time isn't billed.
  8. **Mark as complete**, then "Everything done" or "Partly done — parts missing".
- A running total stays fixed at the bottom. A pending strip names the next missing step.

### 4.4 Reference screens

| Screen | State |
|---|---|
| **Technicians** | fixed roster with a live open-jobs count; no add or edit |
| **Price Book** | per work type: labour hours, parts, fee, flat rate. Orders pull from it |
| **Parts** | stock, reorder level, cost. Sample data; not linked to orders |
| **Agreements** | plans and MSAs. Sample data |
| **Maintenance** | recurring plans; **Raise visit** creates a real order |
| **Compliance** | certificates and due dates. Sample data |
| **Performance** | live figures from the orders |
| **Service Settings** | live; §2 |

---

## 5. Flows

### 5.1 Creating an order (dispatcher)

1. Press **New service order**. Only Customer details shows.
2. Pick the customer, then the site. The rest of the form appears.
3. Intake source and priority (same card), scheduled date and window, technician (optional).
4. Asset rows are optional. For each work type picked, its standard parts and fees arrive.
5. Optionally tick **Send quote to customer**.
6. Press **Move to Assigned** (the quote is sent too if ticked), or **Save as Draft** to park it — a draft needs no technician.

Abandoned drafts stay in the Open lane (no discard yet; §8).

### 5.1a The two flows

Service Orders has a drawer with two entries — **No Technician App** and
**With Technician App**. Same orders; each entry fixes the technician-app
setting for the board and sheet under it. The first cut for Ricochet and
Hutchins is the no-app flow (§5.8).

### 5.2 Creating from elsewhere

- **Technician's phone:** New order, technician pre-filled, same required set.
- **Maintenance → Raise visit:** a Drafted order, booked for tomorrow at 9.
- **Ticket on site:** raised from inside a job; creates an Assigned order.

### 5.3 Running a job with the technician app

The dispatcher assigns the order and it appears on that technician's phone.
Every phone step writes to the same order the board shows: arrival, start,
assessment, quote, pauses, completion. The dispatcher watches the status move
Assigned → Ongoing → Needs approval / Completed, and sees the running labour
clock on the sheet.

### 5.4 Running a job without the technician app

The footer shows **Send quote to customer** (primary) and **Start work**. After
the quote, the primary becomes **Mark as completed**. Start work opens the
**site assessment**. The dispatcher types the hours.

### 5.8 No technician app — the dispatcher records everything (2026-09-25)

1. **Create and assign.** Save as Draft, or **Move to Assigned**, which opens
   the **email to the technician** (shaped like 3PL's partner invitation: To,
   Cc, subject, note; attached: the job details and a **job report form**).
   Sending it is what moves the order to Assigned — the email is mandatory.
2. **The technician works offline.** They assess the site, compare it with the
   dispatcher's plan, note parts used and parts not available, and mail the
   report form back with photos.
3. **Job day.** On its work date an assigned order moves into the Job day lane.
4. **Job completed.** The dispatcher presses it and confirms: *"I acknowledge
   the technician has shared all the relevant information with me, and I'm
   adding this information on the technician's behalf."* The order is now
   being recorded (Ongoing).
5. **Record.** Site assessment first (text and photo upload), then the work
   table (work types can be changed, added, removed), parts, **parts not
   available**, fees, and labour hours. With parts not available, the bottom
   bar offers **Create new order** or **Rollover**.
6. **Send invoice to customer** (or **Partial invoice & roll over** if Rollover
   is chosen — see §6) opens the **invoice summary**: bill to, work done, charges, total,
   parts not included, attachments. Tick *Customer approved — recording on
   their behalf* to make the act **Mark as completed**; otherwise **Send
   invoice to customer** → Awaiting approval.
7. **Awaiting approval → Mark as completed**, with the approval trail attached
   (emails, screenshots, documents). With Create new order, a linked order is
   made for the missing parts.
8. **Completed is read-only.** Accounting then sets payment: Awaiting payment,
   Payment received, Payment delayed, Unpaid. A paid order shows a **Payment**
   card: invoice total, received, short/over by, date, method, reference.

### 5.5 Quote, then final bill

- **Quote**, before work: the fixed part only — parts, fees, and the labour
  **rate**. It can't be sent once work has started.
- **Final bill**, after work is recorded: the whole amount — parts, actual
  labour and fees. Sent from the ··· menu.

### 5.6 Parts missing on site

The technician (or dispatcher) sets how many of each part were fitted. What's
owed is handled one of three ways, set in Service Settings:

| Choice | What happens |
|---|---|
| **Roll over** | the same order, rescheduled for tomorrow, still Assigned, with a Parts pending badge |
| **New linked order** | this order is Completed — linked; a new Open order carries what's owed, linked both ways |
| **Complete and queue** | this order is Completed; a Parts pending order waits in the queue, with no link |

### 5.7 Approval, invoice, accounting, closing

Completion goes to **Needs approval** (if approval is on), then **Approve**,
then Completed. The invoice is written automatically with native billing, or
by **Generate invoice**. Accounting sync marks it Synced / Reviewed. **Reviewed
is the end** of the order.

---

## 6. Decisions already made (don't re-open)

- **Side sheets autosave.** No Save, Update or Cancel (DS ux, Side-sheet anatomy).
- **Creation sheets fill the screen** less the 56px gap (DS ui/7-variants §1).
- **The footer's primary is the next act**, never "Save". Other acts go in ···. A dead button says why on the press.
- **The technician app is a convenience, not a gate.** Dispatch can start, quote and complete (2026-09-23).
- **Customer and ship-to first** (waterfall); **intake source and priority sit in the same Customer details card**. **Asset optional.**
- **Asset table: work type first, asset second.** Several work types per asset as nested rows; **every work-type cell, sub-rows included, is the same checkbox list**, and ticking more from any row adds to that asset's group.
- **Optional pickers can be emptied again:** "No asset", "No technician" (DS ux §Forms).
- **Technician is not mandatory.** A draft's footer: **Save as Draft** (outline, left) and **Move to Assigned** (primary, right). Move to Assigned needs customer, ship-to, window and technician.
- **Typed fee or part names** show the typed text on the left and "Add as fee" / "Add as part" on the right.
- **A new order starts empty.** The price book adds parts **and** fees per work type.
- **Mandatory to move to Assigned:** customer, ship-to, window, technician. A draft can be saved with any of them missing.
- **Labour** in hours and minutes. The dispatcher can type it. The rate is per order.
- **Mileage removed** (2026-09-25).
- **Quote = fixed costs + labour rate.** The final bill carries the actual labour.
- **One site assessment per visit**, rich text and photos, the first step on the phone.
- **Dispatcher jobs are skipped with a reason, never deleted.** Technician-added jobs can be deleted.
- **Pause/resume with a reason.** Paused time isn't billed.
- **Parts-pending: three outcomes** (§5.6).
- **Status badges coloured by kind** (DS ui §10b).
- **Activity log:** only meaningful events — who, when, how much, what stage. Draft edits aren't logged.
- **No technician detail line under the picker**, no Record card while writing a new order.
- **Two flows under Service Orders** (drawer): No Technician App · With Technician App.
- **No-app flow (§5.8):** the technician email is mandatory to assign; Job day lane; "Job completed" asks the on-behalf acknowledgement; assessment leads the form; parts not available + Create new order / Rollover in the bottom bar; invoice summary with approve-on-behalf; Awaiting approval → Mark as completed with attachments; completed is read-only.
- **Payment statuses come from accounting**, never pressed in the app.
- **Quote answers:** Approved (after it was sent) · **Approved on the customer's behalf** (they said yes offline, nothing sent) · Rejected. Never "skip". A **rejected** quote is not cancelled: the order stays where it is with a red *Quote rejected — needs revision* banner and **Send revised quote**. Same on the phone ("Customer approved on site", "Send revised quote").
- **Quote is kept in the no-app flow** (tick on a draft; ··· once assigned).
- **Rollover shares a partial invoice:** with parts not available and Rollover chosen, the act is *Partial invoice & roll over* → the partial invoice (work done, owed parts not charged) → **Send and roll over** or **Roll over without sending**.
- **Point of contact** on the order (customer card, optional, "No contact" empties it); the quote and invoice go to them.
- **Cancel order** sits in the footer ··· from Assigned through Job day (confirmed); **Discard draft** in the ··· of a draft (confirmed, deletes it).
- **Late badge** on a card whose window has closed with nobody started — **technician-app flow only**; without the app nobody knows if it was late or early.
- **Download invoice** downloads a real one-page PDF (`service/invoicePdf.ts`), also from the ··· while awaiting approval.

---

## 7. Working agreements (how this project is built)

These are the owner's standing rules. They apply to every change, in every
module.

1. **Don't add anything that wasn't asked for.** No extra lines, hints, badges or read-outs. Propose it instead.
2. **No explanatory microcopy on screen.** Ship the label, the value and the control. State and consequence text is allowed; explanations of labels are not.
3. **Code is the source of truth for visual values.** Tokens only, never raw hex. Derive from existing scales, never invent.
4. **Same kind of table = same columns, order and widths** within a module. Don't raise cross-module differences.
5. **Flush means the box meets the edge.** Content inside keeps a 16px inset.
6. **Table rows:** a new row takes the cursor. The bin asks ✕/✓. The last row rule applies (DS ui §10f "Rows").
7. **Plain language** in any gap or question put to the owner. No field names.
8. **Replies:** short, in three sections — Done · Pending · Doubts.
9. **Show screens in the browser**, not as screenshot files.
10. Retired designs get a dated doc, not just a deletion.

---

## 8. Known gaps (audit, 2026-09-25)

Worked through one at a time. Broken loops first.

**Broken loops**
- ~~No cancel or discard~~ — cancel (Assigned → Job day) and discard draft added 2026-09-25. Cancel from Open is still not offered.
- *Yet to be reviewed* has no way forward to Reviewed.
- *Completed — linked* can't raise an invoice.
- Board card buttons: *Review* does nothing; *Assign* only opens the sheet.
- Accounting sync: the automatic sync marks synced but leaves the card in Completed, and sometimes never runs. There's also a manual "Mark synced to accounting" button (3PL's rule is that only accounting marks synced).
- A job finished on the phone with approval off raises no invoice. A partly done job skips approval.
- Closing a new order within half a second of the first change loses it.

**Creation:** no site contact or instructions field · no double-booking or
capacity warning · no duplicate-job warning · portal intake is only a label ·
order numbers counted differently in two places.

**Phone ↔ dispatcher:** the technician approves the quote for the customer ·
the signature is marked captured with no capture step · edits on either side
can overwrite the other · a cancelled or reassigned order stays live on the
phone · "one job in progress" is enforced on the phone only · the quote doesn't
wait for the assessment · "Mark as complete" writes nothing until the final
press · no call or navigate on the phone · photos are lost on reload.

**Invoices and closing:** no invoice list (a PDF now downloads) · "Send final
bill" and "Generate invoice" are two acts for one thing · no payment status ·
no correction after invoicing · Reviewed can't be reopened.

**Error states (none handled):** sync failed · save failed or phone offline ·
edited by someone else · cancelled or reassigned mid-job · technician
unavailable · customer rejects the quote (dispatcher side) · completing with
nothing recorded · window passed with nobody on it · part out of stock.

**Open questions for the owner:** a customer-approval step on the quote ·
dispatcher photos on the assessment · the phone opening as the order's
technician · accounting sync following the 3PL rule.

---

## 9. Where it lives (for builders)

| Concern | File |
|---|---|
| Orders, statuses, lanes, totals, price book data | `prototypes/unified-view/service/work.ts` |
| Shared order list (board + phone), parts-pending outcomes | `service/store.ts` |
| Board and table | `service/ServiceWorkScreen.tsx` |
| Order sheet | `service/ServiceOrderSheet.tsx` |
| Technician app | `service/TechnicianMobile.tsx`, `TechnicianHome.tsx`, `TechnicianJob.tsx` |
| Settings | `service/settings.ts`, `ServiceSettingsScreen.tsx` |
| Reference screens | `service/PlatformScreens.tsx`, `catalog.ts`, `TechniciansScreen.tsx` |
| Standalone build | `prototypes/unified-view/service.html` → `npm run build:service` → `dist-service/service.html` |
| Assertions for this module | `docs/unified-view/service/evals.md` |
| History of decisions | `docs/unified-view/service/changes-2026-09-23.md` |
