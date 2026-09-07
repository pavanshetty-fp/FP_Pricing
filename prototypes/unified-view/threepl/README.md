# 3PL — the brokerage module

The **second module** of the Unified View. Sales was first; this is the same shell
and the same design system pointed at a different business.

**3PL is brokerage.** In Sales, FleetPanda's customer delivers the fuel itself. In
3PL the customer is a **broker**: it takes an order and dispatches it to an
**outside vendor** (a carrier), who acknowledges by email link or in the vendor
app and reports back when the delivery is done. Everything distinctive about this
module follows from that one fact — there is a party outside the building whose
acceptance the order is waiting on.

---

## Where the model comes from

This is the first part of the prototype whose model is **transcribed from a
written spec** rather than from screenshots: FleetPanda's own `3PL
(Third-Party Logistics)` product doc (the "3PL-102" doc), cross-checked against
the `3PL Vendor Flow` doc and the 3PL section of `FAQs - Customer Calls`.

That matters for how much of this you can trust. The Sales screens were
transcribed from captures, so their *columns* are real but their *lifecycles* had
to be guessed — `HANDOFF.md` open questions 1 and the `assetOrders.ts` header
both record where. Here the lifecycle, the field set, the tab set and the
numbering convention are all quoted, with the section numbers cited inline in
`orders.ts`.

| Quoted from the spec | Invented here |
|---|---|
| the seven order stages and their order (§5.2) | order numbers |
| Blocked sitting between Created and Assigned, on a credit hold | delivery windows, gallon quantities |
| the All / Regular / Recurring / Movement tabs (§5.2) | POC, salesperson, hub names |
| `D-` vs `M-` order numbering (§5.20) | delivery instructions |
| the create-order field set, section by section (§5.3) | vendor names, safety scores, distances |
| multiple vendors invited at once, first to accept wins (§5.5–5.7) | quote figures |
| movement orders quoting Fee + Tax, not rate/gal (§5.20) | |
| Business Lines / Safety Score / Distance as vendor filters (§5.5) | |

Customer names and ship-tos are **reused** from the Sales `customers.ts`. That is
faithful, not lazy: the spec says customer entities sync from Dispatch and are the
same records — *"customer-related entities are synced almost in real-time between
Dispatch and 3PL"*.

---

## What is built

**Orders** — the broker's Order Dashboard, and the only 3PL screen in this pass.

- **Kanban board, as the default view.** Seven lanes, one per stage, in lifecycle
  order. This is the one list in the whole prototype that does not open as a
  table: §5.2 calls the dashboard "a Kanban-style board" with List as the
  alternate, because what a broker does all day is watch orders move between
  stages. The table is a full peer — every column, sortable, paginated.
- **Order-kind tabs** — All / Regular / Recurring / Movement, with live counts,
  in both views. They sit *below* the action bar, per the content-layer law in
  `docs/content-layer.md` §4.
- **The order sheet, with the vendor workflow.** Customer, order details
  (including the start/end delivery **window**, which is the field that most
  distinguishes a brokered order from a first-party one), asset/product lines
  with the per-line top-off toggle, POC, instructions — and the **Delivery
  Partner** section that drives the lifecycle.
- **Movement orders** render an **Asset** section instead of product lines, with
  the asset read-only (fixed at creation, per §5.20) and pricing as Fee + Tax.

The rail's other three destinations — Vendors, Customers, Assets — show the
honest not-built state, naming what exists instead. That is the same shape the
Sales rail had while only Fuel Orders was built.

### Status is advanced, not chosen

The most important design decision here, and it cuts against both Sales sheets:

- `AssetOrderSheet` gives status a **Select**, because an asset order's status is
  its own free-standing lifecycle.
- `OrderSheet` (fuel) offers **no status control**, because status is *derived*
  from whether a driver is assigned.
- `BrokerOrderSheet` offers **no status control either** — but for the opposite
  reason: a 3PL order's status is the **result of the brokerage workflow**. The
  Delivery Partner section renders only the transitions that are legal from the
  current stage, and the status follows from taking one:

```
Draft / Blocked  --invite one or more partners-->  Assigned
Assigned         --acknowledge on their behalf-->  Accepted
                 --accept a submitted quote----->  Accepted
                 --cancel the invitation-------->  Draft
Accepted         --submit details for them------>  Completed
Completed        --mark ready for accounting---->  Accounting Sync Ready
Sync Ready       --sync to accounting----------->  Accounting Synced
```

A status picker would let the status disagree with the vendor fields beside it.
Every transition moves the stage **and** the vendor fields together, and
`assertConsistent()` in `orders.ts` encodes the invariants that tie them —
`Accepted` with nobody assigned, `Draft` with three invites out, an accepting
vendor that was never invited, a top-off line that also requests gallons, and a
partner that does not run the line of business the order needs. It returns 0
problems across all 108 seeds; run it if you touch the generator.

---

## Two DS findings this screen surfaced

Both were **pre-existing bugs in `kanban-board/KanbanBoard.tsx`** that its own
demo cannot show, because that demo has four lanes holding one to three cards.

1. **Cards collapse instead of the lane scrolling.** The DS card is a shrinkable
   flex child of the lane's `overflow-y-auto` stack, so once a lane holds more
   cards than fit, every card compresses — and the card's own `overflow-hidden`
   then hides the evidence. **Measured:** 8 cards in a 373px lane gave a **34.4px
   card box around 188px of content**, with the lane's `scrollHeight` equal to its
   `clientHeight`, so nothing scrolled and nothing hinted anything was missing.
   Fixed here with `shrink-0`; fix it in the DS too.

2. **The lane count pill is unreadable.** The DS fills it with the lane colour and
   sets the label `text-white`. **Measured at 11px**, identical in both themes
   (the `--fp-lane-*` values do not change with the theme):

   | lane | ratio | | lane | ratio |
   |---|---|---|---|---|
   | yellow | **1.92** | | rose | **3.67** |
   | green | **2.28** | | blue | **3.68** |
   | cyan | **2.43** | | indigo | **4.47** |
   | | | | slate | 4.76 ✓ |

   Five of the seven lanes used here fail WCAG AA, and the DS demo already ships
   the yellow one. This file gives the pill the neutral `bg-fp-card-1` count-pill
   recipe the system already uses in `ListToolbar` and `ColumnSearchChip`, rather
   than inventing a colour — the lane's identity still reads from its 4px top
   strip, which is where the lane colour is load-bearing. The DS needs either a
   neutral pill or a measured on-colour foreground per lane; `text-white` for all
   ten cannot work.

`BrokerBoard.tsx` is the **fifth documented fork** in this prototype, for the same
reason as the other four: `KanbanBoard` takes **no props at all** — its lanes,
lane colours, card fields and even the card title (`"Card Title"`) are
module-level constants. Its header lists all eight things to parameterise or fix.
When they land, delete the fork; do not maintain it in parallel.

### Verified in both themes

Status chips pass AA everywhere: **light 4.83–5.99**, **dark 5.91–7.62**. That
also retires `HANDOFF.md` open question 7 — the light `--status-*` step-down
landed, and `variant="text"` now measures 5.02 in light where it used to be 3.19.

Card alert accents: **light 5.02–20.52**, **dark 8.62–14.58**.

---

## Screens

| Screen | State |
| --- | --- |
| Delivery Orders | Built — list, board, and the order sheet |
| Vendors / Common Carriers | Built |
| Customers | Built |
| Products | Built |
| Rental Assets | Built |
| Recurring Orders | Not built (open question 5: tab or destination) |

### The Directory — one list, four screens
Vendors, Customers, Products and Rental Assets share a shape exactly: a record
list with **no date scope**, **no create CTA**, **no bulk bar**, a facet panel,
grouping, and a footer that counts. `DirectoryList` is that shape; each screen
supplies only what is genuinely its own — its records, its columns and how their
cells render, what it can be grouped and filtered by, and whether anything about
it SUMS.

Four copies would have drifted within a release, and the drift would have been
in the parts nobody looks at twice — like which of them suspends pagination
while grouped.

**No date scope** is deliberate: a carrier, an account, a product and a tank
carry no date, so the toolbar's date stepper is omitted rather than shown with
nothing to scope. **No create CTA** because a Directory record is onboarded
elsewhere — a carrier through a contract, an account from Dispatch, a product
from the price book — so `FuelOrdersViewBar` now renders its button only when a
handler is passed.

#### What sums, and what does not
The measure is the sharpest question each list asks, and three of the four
answer "nothing":

| List | Measure | Why |
| --- | --- | --- |
| Customers | Outstanding balance | Dollars owed add up. A summed credit *limit* would not — limits are not a pool. |
| Rental Assets | Monthly revenue, **on-rent only** | Capacity is the obvious pick and is wrong: a group's tanks do not pool into one tank. What a group is worth is what its rented assets bill. |
| Vendors | none | A summed distance is meaningless; an averaged safety score is a different statistic sitting where a total goes. |
| Products | none | A reference price is per gallon. Adding seven of them produces a number with no referent. |

This is what made the DS's `measureOf` optional: it had been required, so a list
with nothing to add up had to pass a fake one, and every group header printed a
`0` that reads as "none" rather than "not applicable".

#### Where the data comes from
Names are **not invented**: customers and ship-tos are the ones the Sales module
and `orders.ts` already carry, and products are exactly the `PRODUCTS` list an
order's lines are drawn from — `assertProductsCoverOrders()` fails the build if
that drifts. Inventing a second set would have made "Morris Group" mean two
different accounts depending on the screen.

What IS invented is the per-record detail no existing file carried: credit
limits and balances, product grades and hazmat classes, asset serials and rental
rates. Two of those are load-bearing — the seed data's two **Blocked** orders
resolve against real states here: Morris Group is $21,250 over its limit, and
Halvorsen Fuel Co. was never credit-approved. The four assets flagged
`rental: true` in `SHIP_TO_SITES` are on rent to the same accounts at the same
sites, so an asset cannot be out at a customer on one screen and in the yard on
another.

## Open questions — do not silently decide these

1. **Three stages share one chip colour.** The DS ships four `StatusTone`
   channels and this lifecycle has seven stages, so Assigned, Accepted and
   Accounting Sync Ready all render `processing`/amber. That is defensible — all
   three are "in flight", and the DS's rule is that colour is never the only
   carrier of meaning — but on the table three identical amber chips in one column
   do less work than they could. Either the DS gains a fifth channel or 3PL
   accepts that the label does the distinguishing.
2. **The date stepper scopes the board to one day.** Every list in this prototype
   is date-scoped, and 3PL inherits it. But the spec describes a *Today button*
   and date *filters*, not a single-day stepper — a broker chasing an unaccepted
   order does not care which day it was planned for. A stage-scoped board that
   spans days may be the truer reading. Flagging rather than changing, because it
   would make 3PL the one list that behaves differently.
3. ~~**Create is a plain button, not the three-way dropdown**~~ **Built.** The CTA
   is a menu — Delivery Order / Asset Delivery / Asset Pickup (§5.20) — because
   the three take DIFFERENT forms, so the choice comes before the form rather
   than as a Type field inside it. Each option carries a detail line: "Asset
   Delivery" and "Asset Pickup" are one word apart and opposite.

   `AssetMovementSheet` is ONE sheet with a `direction`, not two files. The
   direction derives three things rather than each being written twice: which
   location section comes first (a route is read from where it starts), where
   the assets come from (a delivery sends what is in the yard, a pickup collects
   what is on rent at the ship-to), and what the gate says. It is not the
   Delivery Order sheet because a movement carries exactly ONE asset and no
   quantity — the lines table, the Load Order and the Delivery Partner section
   would all be empty on every one.
4. **No drag-and-drop between lanes.** The DS Kanban has none, and a stage change
   here is a workflow action with side effects (emails to vendors, an accounting
   push) rather than a reorder. Dragging a card from Assigned to Accepted would
   have to mean "acknowledge on the vendor's behalf" — a real decision, not a
   gesture. Left out deliberately.
5. ~~**Recurring orders have no recurrence UI.**~~ **Built.** The order sheet
   carries a Recurring Order field (Yes/No) beside the delivery window, revealing
   a Frequency list whose "Custom" opens a rule builder — repeat every N units, a
   row of weekday toggles, ends never/on/after N — that returns a SENTENCE, which
   is the only form anyone checks a schedule in. Still open: the recurrence's
   **default carrier** (§5.16), and whether Recurring Orders is a destination of
   its own rather than a tab.
6. **Not built and named in the sheet header:** the Activity Log (§5.4), the email
   preview before an invitation is sent (§5.6), Internal Notes (§5.4), and the
   **map view** of nearby vendors (§5.5) — a map is a component the DS does not
   have. The vendor **table** view of the picker is what is built. *(The linked
   Load Order IS now built: an optional per-product table behind an Add CTA, with
   rows that can be set aside without being deleted.)*
7. **Vendor rejection is not modelled.** The spec's rule is specific — a single
   invited vendor declining returns the order to Draft, one of several declining
   leaves it Assigned — and withdrawing an invitation covers the broker-side half
   only. There is no "this vendor declined" state on an invite. **This is the next
   real gap in the order flow**, because it is the only path that changes status
   without the broker acting.

---

## Files

| File | What it is |
|---|---|
| `orders.ts` | the model, the seed generator, the invariants, and the app's status→tone / status→lane mappings |
| `vendors.ts` | the carriers, with the attributes the spec filters them on |
| `BrokerOrdersScreen.tsx` | the dashboard — view bar, action bar, tabs, board/table, pagination |
| `BrokerBoard.tsx` | **forked** from the DS `KanbanBoard`; see its header |
| `BrokerOrderSheet.tsx` | the order sheet and the vendor workflow |
| `directoryCore.ts` | the vocabulary the four record types share — audit events, attachments, contacts, ship-tos, the seeded generators, and the two kinds of missing value |
| `directory.ts` | Customers, Products and Rental Assets: the full field sets, the hand-written core records, the generators that take them to volume, and the asset conflict rules |
| `directoryLinks.ts` | the cross-references between the four entities, made in one place because the import graph will not carry them |
| `directoryDims.ts` | columns, search, sort and grouping for those three lists |
| `directoryUrl.ts` | the list's state in the address bar |
| `DirectoryList.tsx` | the list shell — search, facets, chips, grouping, selection, bulk bar, pagination, export |
| `DirectoryEntityScreen.tsx` | the list, and the sheet over it |
| `DirectoryRecordSheet.tsx` | the record sheet, and the read-only blocks it renders below the form |
| `directoryFormTypes.ts` | the field/section vocabulary and the validation contract |
| `CustomerRecord.tsx` · `VendorRecord.tsx` · `ProductRecord.tsx` · `AssetRecord.tsx` | what each entity's form asks and what its sheet shows below it |
| `DirectoryScreens.tsx` | the four configs — columns, cells, facets, exports, bulk verbs — and the four screens |

---

## The Directory

Four entities, one set of screens.

**Volume is deliberate.** 150 customers, 80 vendors, 60 products, 120 assets.
Pagination, grouping, filtering and the "no results" state are all untestable on
a list of eight, and every one of them shipped broken somewhere because it was
only ever seen with a handful of rows.

**Records are incomplete on purpose.** A real directory has accounts entered in
a hurry with no ZIP and no tax ID, and test records somebody made during
onboarding and never cleaned up — both are in the seed. The screens print `-`
for a field nobody has filled and `N/A` for one that does not apply, and never
suppress either: a cell that goes blank makes an incomplete record look
finished.

**A record is a SIDE SHEET, and the sheet IS the form.** That is the DS's own
interaction for a record — `RecordSheet`, as `CustomerSheet` uses it: `mode`
decides whether the header reads Edit or Create, the body carries the fields,
the footer carries Save Changes. An earlier pass built a full-page detail with
a separate editor; that was a second pattern doing one job, and it took the
list off screen. It is gone. The sheet runs at `wide`, because these records
carry tables and the DS's own note on `narrow` says a table at 560 has to be
scrolled sideways to be read.

**Related records live in the same scroll**, as `SheetSection`s under the
editable ones — a vendor's rate card, an account's ship-tos, an asset's billing
history. Section rhythm is the DS's 40 / 16 throughout.

**Audit history is a drawer, not a section.** It is the longest block on a
record and the one people read least often; at the bottom of the body it pushed
everything anyone opens the sheet FOR behind a wall of "field changed" lines. It
gets an icon in the sheet header, which also makes it reachable without
scrolling.

**A toggle is a statement and an answer**, not a field with a control under it.
Label left on the labels' own edge, switch hard right, helper text under the
label. Stacked like an input it left a 20px control alone on a line with a hole
beside it. Same row `CustomerSheet` already used for Active.

**Pagination is the DS's, untouched.** `TablePagination` ships its own page-size
set and its own footer copy; a second set of sizes here would make the Directory
the one place that counts differently from every other list.

**The list's total sits beside the page title**, not under the footer. It is a
fact about the whole list, and down there it read as a property of page 1 of 5,
at the bottom of a screen somebody has to scroll to reach. It follows the
filtered rows, so narrowing the list narrows the number with it.

**Three derived facts are never stored:** a customer's available credit, a
product's customer and vendor reach, and an asset's conflicts. Each of them
would be wrong the first time anything else was edited.

### Still open

- **Contacts and ship-tos are read-only.** They render, and the record page
  counts them, but there is no add/edit/archive for a child row yet — the form
  handles the parent record only.
- **Attachments do not upload.** The list, the expiry colouring and the download
  affordance are real; the file picker is not wired.
- **Roles and permissions.** `canWrite` is threaded through the list, the record
  page and the bulk bar, and is hard-coded true. There is no role model behind
  it yet.
