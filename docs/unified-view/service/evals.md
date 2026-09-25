# Eval — Service Work

`PRD.md` turned into assertions. Run it with the segment evals in
`../evals/`; `../evals/0-how-to-run.md` says what the two layers mean
(**L1** = one correct answer, fix it · **L2** = a judgement or a stale doc,
report it, don't change it).

> **Every assertion names the rule it tests.** *ds* cites `docs/ds/`, which is
> the authority. *uv* cites the Unified View binding docs. *prd* cites a
> Service decision in `PRD.md` §6. When a row fails against *prd* but the owner
> changed their mind, fix the PRD, not the screen.

**Scope**

| Surface | File |
|---|---|
| Order sheet | `service/ServiceOrderSheet.tsx` |
| Board / table | `service/ServiceWorkScreen.tsx` |
| Shared list, parts-pending outcomes | `service/store.ts` |
| Data, statuses, totals | `service/work.ts` |
| Technician app | `service/TechnicianMobile.tsx`, `TechnicianHome.tsx`, `TechnicianJob.tsx` |
| Settings | `service/settings.ts`, `ServiceSettingsScreen.tsx` |

---

## S1 — the order sheet as a sheet

- [ ] **L1** Renders through `RecordSheet`; no hand-rolled `SheetContent`. — *ds ux §Side-sheet anatomy*
- [ ] **L1** Autosaves and says so (`useDraftSaveState` + `DraftStatusChip`); `showCancel={false}`; no footer primary reads Save / Update. — *ds ux §Side-sheet anatomy*
- [ ] **L1** Opened to create, it fills to `100vw − 56px` (not a cap). — *ds ui/7-variants §1 "A creation sheet fills"*
- [ ] **L1** Two columns with a sticky 340px rail. — *uv 2-layouts, side sheet*
- [ ] **L2** Every section on screen traces to a request. No helper lines, sub-labels or read-outs nobody asked for. — *prd §7.1, §7.2*

## S2 — creating an order

- [ ] **L1** A new order starts with no work type, no parts and no fees. — *prd §6*
- [ ] **L1** Only *Customer details* renders until customer and ship-to are both set. — *prd §6 waterfall*
- [ ] **L1** The empty asset cell reads "NA (non-mandatory)" (after a site is chosen). — *prd §6*
- [ ] **L1** Picking a work type adds its price-book parts **and** fees once; nothing is doubled; nothing is removed when the work type is dropped. — *prd §4.2*
- [ ] **L1** *Move to Assigned* is gated on exactly customer, ship-to, window and technician; the pending strip names the first missing one. *Save as Draft* (outline, left of it) is always available on a draft. — *prd §6; ds ux §Forms*
- [ ] **L1** Intake source and priority are in the Customer details card; there is no separate Intake card. — *prd §6*
- [ ] **L1** Asset table columns: work type, asset, description; every work-type cell (sub-rows too) is the checkbox multi-select. — *prd §6*
- [ ] **L1** Asset and technician pickers offer "No asset" / "No technician" first. — *ds ux §Forms*
- [ ] **L1** A typed fee or part name shows the text left and "Add as fee" / "Add as part" right. — *prd §6*
- [ ] **L1** The "Send quote to customer" tick shows only on a Drafted order; ticked, Create writes the quote too. — *prd §4.2*
- [ ] **L1** The Record card doesn't render while an order is being written; it does when the order is reopened. — *prd §6*
- [ ] **L1** No line of technician detail under the technician picker. — *prd §6*
- [ ] **L1** The first change saves a Drafted order; edits to a draft aren't logged. — *uv activity-log rule*

## S3 — stages and the footer

- [ ] **L1** The footer has one primary, the next act; other acts sit in ··· to its left; a dead primary explains on the press. — *ds ux next-act ladder*
- [ ] **L1** Completing is gated on: work started · hours recorded · a rate · a technician. — *prd §3.3*
- [ ] **L1** Technician app **off**: an Assigned order shows *Start work* and *Send quote to customer* up front; after a quote, the primary is *Mark as completed*. App **on**: both sit in ···. — *prd §5.4*
- [ ] **L1** No quote can be sent once work has started. — *prd §5.5*
- [ ] **L1** Once work is recorded, ··· offers *Send final bill to customer*. — *prd §5.5*
- [ ] **L1** Status badges use the kind map, never a DS tone named directly. — *ds ui §10b; `npm run eval` → status-kinds*
- [ ] **L2** Every status has a way in and a way out (see PRD §8 broken loops). — *prd §3.3*

## S4 — money

- [ ] **L1** No mileage anywhere: not stored, not totalled, not on screen, not in settings. — *prd §6*
- [ ] **L1** Order total = parts + labour × rate + fees + additional charges. — *prd §3.1*
- [ ] **L1** The quote holds parts, fees and the labour **rate** only; its total is parts + fees. — *prd §5.5*
- [ ] **L1** Typed hours survive new visits and completion (`syncVisits` receives `laborOverride`). — *prd §6*
- [ ] **L1** Labour reads in hours and minutes, never decimals. — *prd §6*

## S5 — tables

- [ ] **L1** Asset, parts and fees tables are flush (T1) with the add hanging off the card. — *ds ui §10f; ui/7-variants T1*
- [ ] **L1** A new row takes the cursor; the bin asks ✕/✓; the last asset row has no bin. — *ds ui §10f "Rows"; `npm run eval` → table-rows*
- [ ] **L1** Parts and fees names are pick-or-type; a typed name shows as "Use …". — *prd §3.1*

## S6 — technician app

- [ ] **L1** Every phone write goes through the shared list, logged under the technician's name. — *prd §5.3*
- [ ] **L1** Only one job can be Ongoing per technician on the phone. — *prd §4.3*
- [ ] **L1** Dispatcher jobs are skipped with a reason, never deleted; added jobs can be deleted. — *prd §6*
- [ ] **L1** Pause asks a reason; paused time isn't billed. — *prd §6*
- [ ] **L1** Parts missing offers the three outcomes of §5.6, using the company setting as the default. — *prd §5.6*
- [ ] **L2** Anything the phone keeps only on the device, which the dispatcher can't see, is listed in PRD §8. — *prd §8*

## S8 — no technician app flow

- [ ] **L1** Service Orders has a drawer: No Technician App · With Technician App; each fixes the technician-app setting for its board and sheet. — *prd §5.1a*
- [ ] **L1** No-app: Move to Assigned opens the technician email; only sending it moves the order to Assigned. — *prd §5.8*
- [ ] **L1** No-app: the Working lane reads "Job day" and holds assigned orders whose date has come. — *prd §5.8*
- [ ] **L1** "Job completed" asks the on-behalf acknowledgement before recording starts; Confirm stays disabled until it is ticked. — *prd §5.8*
- [ ] **L1** While recording, Site assessment (with photo upload) is the first section; the work table is editable. — *prd §5.8*
- [ ] **L1** Parts not available shows Create new order / Rollover in the bottom bar; Rollover makes the act "Roll over to tomorrow". — *prd §5.8*
- [ ] **L1** The invoice summary's primary is "Send invoice to customer" (→ Awaiting approval), or "Mark as completed" when approve-on-behalf is ticked. — *prd §5.8*
- [ ] **L1** A completed no-app order has no editable control; a paid one shows the Payment card against the invoice total. — *prd §5.8*
- [ ] **L1** Payment statuses have no button anywhere in the app. — *prd §6*

## S9 — quote answers, cancel, invoice

- [ ] **L1** The quote dialog offers *Approve on customer's behalf* beside *Send quote*; a sent quote offers *Customer approved* / *Customer rejected*; no control says "skip". — *prd §6*
- [ ] **L1** A rejected quote leaves the status unchanged, shows the red "Quote rejected — needs revision" banner and *Send revised quote*. — *prd §6*
- [ ] **L1** Rollover with parts not available leads to the partial invoice with *Send and roll over* / *Roll over without sending*. — *prd §6*
- [ ] **L1** *Cancel order* is in the footer ··· for Assigned, Yet to start, Ongoing, Awaiting approval, behind a confirm; *Discard draft* for a Drafted order. — *prd §6*
- [ ] **L1** *Late* appears only in the technician-app flow, only on Assigned/Yet to start orders past their window with no start. — *prd §6*
- [ ] **L1** *Download invoice* saves a PDF whose totals equal the sheet's Summary. — *prd §6*
- [ ] **L1** Point of contact sits in the customer card, is optional, and offers "No contact". — *prd §6; ds ux §Forms*

## S7 — standalone build

- [ ] **L1** `npm run build:service` produces `dist-service/service.html`, locked to Service Work: the module switcher lists only Service Work, and global search can't leave it. — *prd §9*
