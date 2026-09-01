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
3. **Create is a plain button, not the three-way dropdown** (§5.20: Delivery
   Order / Asset Delivery / Asset Pickup). The CTA creates a delivery order only.
   A movement order's asset is fixed at creation, so its create flow is a form of
   its own rather than a variant of this one.
4. **No drag-and-drop between lanes.** The DS Kanban has none, and a stage change
   here is a workflow action with side effects (emails to vendors, an accounting
   push) rather than a reorder. Dragging a card from Assigned to Accepted would
   have to mean "acknowledge on the vendor's behalf" — a real decision, not a
   gesture. Left out deliberately.
5. **Recurring orders have no recurrence UI.** `kind: "Recurring"` is a tab filter
   and a card badge; the recurring *rule* (§5.16 — frequency, end date, the
   default carrier for the whole recurrence) is not built.
6. **Not built and named in the sheet header:** the Activity Log (§5.4), the email
   preview before an invitation is sent (§5.6), Internal Notes (§5.4), the linked
   Load Order (§5.3 §6, feature-flagged), and the **map view** of nearby vendors
   (§5.5) — a map is a component the DS does not have. The vendor **table** view
   of the picker is what is built.
7. **Vendor rejection is not modelled.** The spec's rule is specific — a single
   invited vendor declining returns the order to Draft, one of several declining
   leaves it Assigned — and `cancelInvites()` covers the broker-side half only.
   There is no "this vendor declined" state on an invite.

---

## Files

| File | What it is |
|---|---|
| `orders.ts` | the model, the seed generator, the invariants, and the app's status→tone / status→lane mappings |
| `vendors.ts` | the carriers, with the attributes the spec filters them on |
| `BrokerOrdersScreen.tsx` | the dashboard — view bar, action bar, tabs, board/table, pagination |
| `BrokerBoard.tsx` | **forked** from the DS `KanbanBoard`; see its header |
| `BrokerOrderSheet.tsx` | the order sheet and the vendor workflow |
