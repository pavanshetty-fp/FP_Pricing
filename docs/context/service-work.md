# Service Work

> **Load this when:** service orders, work orders, technicians, the technician app, job day, site assessment, quote vs final bill, invoice, parts pending / rollover / linked order, price book, parts, agreements, maintenance plans, compliance certificates, performance, Service Settings, switch points, Deepika / Ricochet / Hutchins, the FP_Service-Work repo or syncing to it. **Not for:** fuel delivery orders (delivery-orders.md), 3PL broker orders (3pl-brokerage.md), Sales quotes and orders (sales.md), tanks and leased assets themselves (assets-tanks-and-leases.md), customer records and ship-tos (customers-and-sites.md).
> **Sources:** `docs/unified-view/service/PRD.md` (source of truth, as of 2026-09-25), `docs/unified-view/service/changes-2026-09-23.md`, `docs/unified-view/service/evals.md`, `docs/unified-view/service/BUNDLE-README.md`, `prototypes/unified-view/service/README.md`, `prototypes/unified-view/service/work.ts` (lifecycle comments), `../FP-DS-2026-service-work/README.md` and `CLAUDE.md`, memory `project_service_work.md` and `feedback_service_repos.md`. **Last updated:** 2026-11-06.

## In one paragraph

Service Work is the FleetPanda module for keeping customers' equipment working:
tanks, pumps, meters, dispensers and monitors at customer sites. A job (a
**service order**) is raised, scheduled, given to a technician, worked on site,
priced, approved, invoiced and handed to accounting. It has two sides that share
one list of orders: the **dispatcher's web app** (board, order sheet, reference
screens) and the **technician's phone app**. Each company switches whole steps
on or off in **Service Settings**. The first real customers (Ricochet and
Hutchins, via Deepika) have **no technician app**, so the dispatcher-records-
everything flow is the first cut; the phone app is an addition. The PRD is the
source of truth; a separate repo (FP_Service-Work) carries a Service-only copy
for Deepika and Yash.

## Glossary

| Term | Meaning |
|---|---|
| Service order (SO) | One job, usually on one or more assets at one customer site. Shown on the board and opened in the order sheet. "Work order" is used loosely for the same thing in older notes. |
| Lane | A place on the board — whose problem the job is now (Open, Assigned, Working/Job day, Completed, Synced, Cancelled). |
| Status | Why the job is in its lane. A lane can hold several statuses. |
| Dispatcher | Takes the call, creates, schedules and assigns the order. Without the tech app, records the whole job. |
| Salesperson | Raises jobs like a dispatcher; adds the site assessment when the technician rings it in. |
| Technician | Does the work on site; uses the phone app when the company has it. |
| Service manager | Approves finished work when approval is switched on. |
| Accounting | Outside the app; receives invoices on a batch sync and sets payment statuses. |
| Intake source | Where the job came from: customer call, sales rep, flagged inspection, portal request. |
| Priority | Normal, High, Urgent. Urgent is the only red badge. |
| Window | The scheduled time span (e.g. 9:00–12:00), set in 30-minute steps. Replaced a single scheduled time on 2026-09-23. |
| Work type | What kind of job is done on an asset. One asset row can carry several work types. |
| Price book | Per work type: standard labour hours, parts, fee, flat rate. Picking a work type pulls in its parts and fees. |
| Site assessment | What the technician found on site (rich text + photos). One per visit. |
| Quote | Sent before work: parts, fees and the labour **rate** only. Stored as a snapshot. |
| Final bill / invoice | After work: parts, actual labour and fees. |
| Visit | One trip to site (started, stopped, on site, technician). Labour is the sum of visits. |
| Parts pending | A job partly done because parts were missing; waiting for a return visit. |
| Rollover | Same order continues on another day for the missing parts. |
| Linked order | A new order raised for the owed parts, linked both ways to the original. |
| Job day | Name of the Working lane in the no-tech-app flow; assigned orders move there on their work date. |
| On-behalf acknowledgement | The dispatcher's confirmation that the technician shared everything and they are recording it for them. |
| Switch points | The Service Settings toggles that turn whole steps on or off. |
| Unified / Dispatch layer | The two setting presets: everything on / tech app, quoting, billing and price book off. |
| FP_Service-Work | The separate Service-only GitHub repo Deepika and Yash work in. |

## How it works

### Settings (switch points)

Each company sets these in **Service Settings** (a rail item inside the module,
not the app-wide Settings page). They change which steps exist.

| Setting | On | Off |
|---|---|---|
| Service technician app | Assigned orders go to the technician's phone | Dispatcher runs the job from the order sheet |
| Field quoting (only with the app) | Technician sends a quote before starting | No quote step on the phone |
| Native billing | Invoice writes itself when work is approved | Someone presses **Generate invoice** |
| Manager approval required | Finished work waits in Needs approval | Approves itself on completion |
| Price book | A work type brings its standard parts and fees | Parts and fees typed by hand |
| Portal intake | "Portal request" offered as an intake source | Every job keyed in by staff |
| Service cost feeds asset payback | Job cost rolls into the asset's return | Not used |
| When parts are missing | Roll over · New linked order · Complete and queue | — |

Presets: **Unified** (all on) and **Dispatch layer** (tech app, quoting,
billing, price book off).

### What an order holds

- **Customer and ship-to** (required, asked first), with **intake source**,
  **priority** and an optional **point of contact** in the same card. Quote and
  invoice go to the point of contact.
- **Schedule:** date and window. Required to assign.
- **Technician:** optional; required to move to Assigned.
- **Work and assets** table: work type, asset, description. Asset is optional.
  One row per asset; several work types per asset as nested rows.
- **Parts** (name, qty, unit cost, later qty fitted) and **fees** (name, amount).
  Picked from a list or typed.
- **Labour:** cost per hour (per order) and hours. Hours come from the clock
  (visits) or are typed by the dispatcher; typed hours win.
- Quote snapshot, site assessment, invoice state, final bill sent, links to
  follow-up orders, activity log.
- **No mileage** anywhere (removed 2026-09-25).

Money: order total = parts + labour hours × rate + fees + additional charges.
Quote total = parts + fees (rate shown, hours unknown yet).

### Lanes and statuses (current, per PRD 2026-09-25 and `work.ts`)

| Lane | Statuses | Meaning |
|---|---|---|
| Open | Drafted · Parts pending · Linked order | Nobody is on it |
| Assigned | Assigned | Someone is on it, not started |
| Working (**Job day** without the app) | Yet to start · Ongoing · Awaiting approval · Needs approval | In the field / being recorded / waiting on customer or manager |
| Completed | Completed · Completed — linked | The visit is over |
| Synced | Awaiting payment · Payment delayed · Unpaid · Payment received (also Yet to be reviewed · Reviewed) | Accounting has it; payment status set by accounting only |
| Cancelled | Cancelled | Set apart from the working lanes |

Badges are coloured by what the reader should do: amber = waiting on someone,
blue = under way, green = done, grey = neither. Unpaid and Urgent are the only
red.

### What moves an order (footer's next act)

| From | Next act | To |
|---|---|---|
| Drafted | **Move to Assigned** (needs customer, ship-to, window, technician) · **Save as Draft** | Assigned / stays Drafted |
| Parts pending, Linked order | Assign a technician | Assigned |
| Assigned (app on) | Mark as completed · ··· Start work, Send quote, Open technician app | Ongoing / Needs approval / Completed |
| Assigned (app off) | Send quote to customer + Start work; after the quote, Mark as completed | as above |
| Ongoing | Mark as completed · "Some parts unavailable" | Needs approval or Completed |
| Needs approval | Approve | Completed (invoice written if native billing on) |
| Completed, no invoice | Generate invoice | Yet to be reviewed |
| Completed, invoiced | Mark synced to accounting | Reviewed |
| Recorded (any) | ··· Send final bill to customer | no change |
| Cancelled | Reopen | Drafted |

Completing needs: work started, hours recorded, an hourly rate, a technician.
**Cancel order** is in the ··· from Open through Job day (confirmed). **Discard
draft** deletes a draft (confirmed).

### The two flows

Service Orders has a drawer with **No Technician App** and **With Technician
App**. Same orders; each entry fixes the tech-app setting for its board and
sheet.

**Creating an order (both flows).** New service order → only Customer details
shows → pick customer and ship-to → the rest appears (schedule, technician,
assets, assessment, quote, parts, fees, labour). A new order starts **empty**;
each work type picked adds its price-book parts and fees once (no duplicates,
nothing removed if the work type is dropped). Optional tick **Send quote to
customer** sends the quote with the create. The order is a real Drafted order
from the first change and autosaves. Orders can also come from the phone (tech
pre-filled), **Maintenance → Raise visit** (Drafted, tomorrow at 9), or a
ticket raised on site (creates an Assigned order).

**No technician app — dispatcher records everything (2026-09-25):**
1. **Move to Assigned** opens a mandatory **email to the technician** (To, Cc,
   subject, note; job details + a job report form attached). Sending it moves
   the order to Assigned.
2. The technician works offline and mails the report form back with photos.
3. On its work date the order moves into the **Job day** lane.
4. Dispatcher presses **Job completed** and ticks the on-behalf acknowledgement.
   Order is now being recorded (Ongoing).
5. **Record:** site assessment first (text + photos), then the work table
   (editable), parts, **parts not available**, fees, labour hours. With parts
   not available, the bottom bar offers **Create new order** or **Rollover**.
6. **Send invoice to customer** (or **Partial invoice & roll over**) opens the
   invoice summary: bill to, work done, charges, total, parts not included,
   attachments. Ticking *Customer approved — recording on their behalf* makes
   the act **Mark as completed**; otherwise it goes to **Awaiting approval**.
7. **Awaiting approval → Mark as completed**, with the approval trail attached.
   Create new order makes a linked order for the missing parts.
8. **Completed is read-only.** Accounting then sets payment status. A paid
   order shows a **Payment** card: invoice total, received, short/over, date,
   method, reference.

**With technician app:** the dispatcher assigns; the job appears on that
technician's phone. Every phone step writes to the same order (arrival, start,
assessment, quote, pauses, completion). The dispatcher sees Assigned → Ongoing
→ Needs approval / Completed and a running labour clock. A **Late** badge shows
on Assigned / Yet to start cards whose window has closed with nobody started —
only in this flow.

### Technician app (phone)

A separate product a technician signs into; it sits on the rail only so the
prototype can show it ("Signed in as" switches technician).
- **My jobs:** grouped by day; sort, filter, search, status tabs. New order
  from the field.
- **Inside a job:** Arrived at site → Start work (only one job in progress per
  technician) → Site assessment (editable until quote approved) → Jobs
  (dispatcher's plus any added; parts confirmed per job; dispatcher jobs only
  skipped with a reason, added jobs deletable) → Fees → Send quote, then Quote
  approved / rejected → Pause/Resume with a reason (paused time not billed) →
  Mark as complete ("Everything done" or "Partly done — parts missing").
- Running total fixed at the bottom; a strip names the next missing step.

### Quote, final bill, invoice

- **Quote** (before work): parts, fees, labour rate. Cannot be sent once work
  has started. Answers: **Approved** (after sending), **Approved on the
  customer's behalf** (said yes offline), **Rejected**. A rejected quote leaves
  the order where it is with a red "Quote rejected — needs revision" banner and
  **Send revised quote**.
- **Final bill** (after work): parts, actual labour, fees. Sent from ···.
- **Invoice** is written automatically (native billing) or by **Generate
  invoice**. **Download invoice** gives a one-page PDF matching the Summary.
- The gap between quote and invoice is expected, not an error.

### Parts missing on site

The technician or dispatcher records how many of each part were fitted. What is
owed follows the company setting:

| Choice | What happens |
|---|---|
| Roll over | Same order, rescheduled for tomorrow, still Assigned, Parts pending badge. In the no-app flow this shares a **partial invoice** (Send and roll over / Roll over without sending). |
| New linked order | This order is Completed — linked; a new Open order carries what is owed, linked both ways |
| Complete and queue | This order is Completed; a Parts pending order waits in the queue, unlinked |

### Approval, accounting, closing

Completion → **Needs approval** (if on) → **Approve** → Completed. Invoice
written automatically or by hand. Accounting sync marks it Synced (Yet to be
reviewed → Reviewed). Payment statuses (Awaiting payment, Payment received,
Payment delayed, Unpaid) come only from accounting, never a button in the app.
The phrase **"Completed means the invoice reached accounting"** comes from the
older eight-stage model (see conflicts); today Completed = the visit is over,
and the Synced lane = accounting has it.

### Reference screens

| Screen | State |
|---|---|
| Technicians | Fixed roster with live open-jobs count; no add/edit |
| Price Book | Per work type: labour hours, parts, fee, flat rate. Orders pull from it |
| Parts | Stock, reorder level, cost. Sample data; not linked to orders |
| Agreements | Plans and MSAs. Sample data |
| Maintenance | Recurring plans; **Raise visit** creates a real Drafted order |
| Compliance | Certificates and due dates. Sample data |
| Performance | Live figures from the orders |
| Service Settings | Live; the switch points above |

Customers, ship-tos and assets are reused from the rental directory, not a
second copy. Technicians, fault text, parts and rates are invented.

## Decisions already made

- **2026-09-18** Module rebuilt on the 3PL board, `ListTable` and `RecordSheet` patterns. The asset is the subject; history hangs off it.
- **2026-09-21** Technician app restored as a separate product shown from inside the prototype.
- **2026-09-23** Lanes restructured: statuses grouped into lanes (lane = whose problem; status = why). Cancelled set apart.
- **2026-09-23** Asset and work type not mandatory. Scheduled time became a **window**, reusing the 3PL window control.
- **2026-09-23** Billing rail card removed (D1). Labour **computed from the clock with a typed override** (D2). Labour is a list of visits; each visit names its technician; rounds to the minute.
- **2026-09-23** The field-app lock is dropped (D3, "cheap version"): the tech app is a convenience, not a gate — dispatch can start, quote and complete. No role model.
- **2026-09-23** Tech app built first, mobile rules harvested into the DS afterwards (D5).
- **2026-09-23** Partial visit: `suborder` (SO-1048-2 child) and the old `rollforward` retired.
- **2026-09-24/25** Deepika's three calls (items 1–42), all built or ruled on. Reference screens added after Anirudh's unified design.
- **2026-09-25** Mileage removed everywhere.
- **2026-09-25** A new order starts empty; the price book adds parts **and** fees per work type.
- **2026-09-25** Technician optional: Save as Draft / Move to Assigned. Mandatory to assign: customer, ship-to, window, technician.
- **2026-09-25** Customer and ship-to first; intake source and priority in the same card; point of contact optional.
- **2026-09-25** Two flows under Service Orders (drawer). No-app flow as in §5.8 of the PRD: mandatory technician email, Job day lane, on-behalf acknowledgement, assessment leads, invoice summary with approve-on-behalf, Awaiting approval → Mark as completed, Completed read-only.
- **2026-09-25** Quote answers: Approved / Approved on the customer's behalf / Rejected — **never call it "skip"**. Rejected keeps the order open with a revision banner. Quote kept in the no-app flow.
- **2026-09-25** Rollover shares a partial invoice.
- **2026-09-25** Payment statuses come from accounting only.
- **2026-09-25** Cancel from Open through Job day; Discard draft for drafts. Late badge only with the tech app. Download invoice = real PDF.
- **2026-09-25** Dispatcher jobs are skipped with a reason, never deleted; pause needs a reason and is not billed; one site assessment per visit.
- **2026-09-25** Activity log records meaningful events only (who, when, how much, what stage); draft edits not logged.

## Open questions / conflicts

**Still open (PRD §8 audit, 2026-09-25; memory 2026-09-28):**
- Board card **Review** does nothing; **Assign** only opens the sheet.
- With-app flow: *Yet to be reviewed* has no way to Reviewed; a manual "Mark synced to accounting" button exists, but 3PL's rule is only accounting marks synced — ask whether the 3PL rule applies.
- *Completed — linked* cannot raise an invoice. A phone-finished job with approval off raises no invoice; a partly done job skips approval.
- Phone and sheet overwrite each other (last save wins). A cancelled or reassigned order stays live on the phone. One-job-in-progress is enforced on the phone only.
- Closing a new order within ~600ms of the first change loses it.
- No invoice list; "Send final bill" and "Generate invoice" are two acts for one thing; no correction after invoicing; Reviewed cannot be reopened.
- Every error state unhandled (sync/save failed, offline, edited by someone else, technician unavailable, part out of stock, window passed, etc.).
- Creation gaps: no site instructions field, no double-booking / duplicate-job warning, portal intake is only a label, order numbers counted differently in two places.
- Owner questions: a customer-approval step on the quote · dispatcher photos on the assessment · should the phone open as the order's technician (today signed in as Rosa) · accounting sync following the 3PL rule.
- From the 2026-09-23 change list: #12 sales edit access, D4 (where approval sits if "Completed" is a button), #16b editable auto invoice, #17 service history on the asset.
- Not built: customer portal intake, emailing quotes/invoices for real, the technician's day/route, recurring maintenance auto-generation, asset payback screen. Reference screens (Parts, Agreements, Compliance) are static sample data.

**Conflicts between sources (later date wins):**
- **"Completed means the invoice reached accounting."** The module README and `work.ts` header (2026-09-18 eight-stage model: Open, Assigned, In progress, Parts-pending, Needs approval, Approved, Completed, Cancelled) define Completed that way. The PRD (2026-09-25) and the current `WORK_LANES` say Completed = the visit is over, and the **Synced** lane = accounting has it; the code invariant now ties "synced" to **Reviewed**, though its message still uses the old wording. **PRD wins.**
- **Number of lanes.** README (2026-09-23) says five lanes and twelve statuses; PRD (2026-09-25) and code have six lanes (Cancelled apart) and seventeen statuses, adding Awaiting approval and the four payment statuses. **PRD wins.**
- **Partial-visit names.** README uses `continue` / `neworder` (back to Open, tech and date cleared). PRD uses Roll over (rescheduled tomorrow, still Assigned) / New linked order / Complete and queue. **PRD wins.**
- **Mileage.** README and the 2026-09-23 change list describe mileage on quotes, invoices and a default-mileage setting. Removed 2026-09-25. **PRD wins.**
- **Field-app lock.** README says with the app on, dispatch "hands the job over and stops". Reversed 2026-09-23 (D3); the change list's own header still calls D3 open. **Lock is dropped.**
- **Quote "Skip".** The change list (#8) asked for a Skip button; the PRD (2026-09-25) rules "never call it skip" — use Approved on the customer's behalf.
- **Spelling.** Code uses "Canceled"; the PRD writes "Cancelled". Same status.

## Where it lives

| What | Where |
|---|---|
| Product truth (decisions §6, working agreements §7, gaps §8) | `docs/unified-view/service/PRD.md` |
| Assertions S1–S9 | `docs/unified-view/service/evals.md` |
| Decision history | `docs/unified-view/service/changes-2026-09-23.md` |
| Module design notes (partly superseded) | `prototypes/unified-view/service/README.md` |
| Orders, statuses, lanes, totals, price book | `prototypes/unified-view/service/work.ts` |
| Shared order list, parts-pending outcomes | `service/store.ts` |
| Board and table | `service/ServiceWorkScreen.tsx` |
| Order sheet; no-app flow | `service/ServiceOrderSheet.tsx`, `service/DispatchFlow.tsx` |
| Technician app | `service/TechnicianMobile.tsx`, `TechnicianHome.tsx`, `TechnicianJob.tsx` |
| Settings | `service/settings.ts`, `ServiceSettingsScreen.tsx` |
| Reference screens | `service/PlatformScreens.tsx`, `catalog.ts`, `TechniciansScreen.tsx` |
| Invoice PDF | `service/invoicePdf.ts` |
| Standalone build | `npm run build:service` → `dist-service/service.html` (locked to Service Work) |
| Handoff bundle | `bash scripts/bundle-service.sh` → `../FP-DS-2026-service-work/` + `.zip` |

**The two repos.**
- **FP-DS-2026** (`main`) — Pavan's main work; Service Work lives in the Unified View here. Nothing from the other repo may affect it.
- **FP_Service-Work** (github.com/pavanshetty-fp/FP_Service-Work) — Service-only copy for Deepika and Yash (since 2026-09-25). Locally: remote `service`, branch `service-work-handoff`. Design-system and Unified View rules are **locked** there (tweaks only; PRD §6 may change, §7 may not), enforced by a hook and `npm run check:rules` against `rules.lock.json`.
- **When to sync:** only on Pavan's yes. After Service-touching work lands on main, ask "Push these to FP_Service-Work too?". On yes: merge main into `service-work-handoff`, re-seal the rules lock, push to `service/main`, rebuild the Service HTML and bundle. Customer Portal work never triggers the question. Never pull their work into main without his say-so. Shared components are the conflict risk. Last recorded sync: 2026-11-03 (main 40a18a9 → FP_Service-Work 628fcd9).
- Authority order: `docs/ds/` > `docs/unified-view/` > `service/PRD.md`.

**Sibling docs:** delivery-orders.md · 3pl-brokerage.md · fuel-supply-and-sourcing.md · fleet-trucks-and-routes.md · dispatch-and-operations.md · customers-and-sites.md · customer-portal.md · assets-tanks-and-leases.md · sales.md · master-data.md · product-overview.md
