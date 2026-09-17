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
- **The date control asks for a day or a span.** `DateRangeFilter.tsx` opens on
  a Single date / Date range toggle. A single date has **no presets** — the
  calendar above already marks today, and Yesterday / Today / Tomorrow were
  three buttons for three clicks that saved nobody anything. A span gets Next 7
  / Next 30 / This month, and **Custom range**, which opens two typed date boxes
  seeded with the current window for dates read off an email rather than paged
  to in a calendar; it applies on a button, not per keystroke, and refuses a
  backwards range. The arrows still step by the length of the window you are on.
- **Pricing is one unit, full width, three columns.** It sits below the form and
  the rail rather than inside the form column — it needs the whole sheet, and the
  rail was taking 340 of it. The rail's three cards therefore end above it, so
  scrolling into the pricing scrolls them away: their job is to keep the totals
  in view while you fill the form, and once you are *in* the pricing the totals
  are in front of you at full size.
  - **Order details · Customer billing · Carrier cost**, left to right in the
    order the money goes, with a **rule between them** — three columns of rows
    that all look alike need saying apart, and the gutter is split either side
    of the line so it sits in the middle rather than hugging the column to its
    right. The rules are `lg` only: stacked, a vertical rule would point at
    nothing. Each column totals itself and the totals are pinned to one line by
    `mt-auto`, however uneven the rows above. Under all three, a strip of **four
    figures and nothing else** — Product · Customer billing · Carrier cost ·
    **Expected profit** — in the order of the columns above, the profit last
    because it is the only one that is no column's own. It was a banner with a
    sentence and a percentage in it; at that point the reader wants a row of
    numbers, not a paragraph. **Equal quarters, edge to edge**: they no longer
    try to sit UNDER the three columns, which are different widths, so four
    figures could only line up with them by being four different widths
    themselves — and the last one's figure is flush right, so the row spans the
    strip instead of trailing off before it does. **The profit is coloured by
    its sign** — green when there is one, red when the order costs money to
    run, neither at exactly zero — and the rail's Margin row, which is the same
    number, is coloured the same way.
  - **The product is stated once, in the first column** — product, requested
    gallons, and the rate, typed there. It is neither side's; the same gallons
    at the same rate whoever carries them, and stating it in both of the columns
    beside it is how two columns come to disagree.
  - **Customer billing is the editable one** — margin per gallon per line, and
    order-level charges (delivery fee first; more expected, which is why
    `CustomerCharges` is a record). Labels sit in a fixed 148px box so every
    field in the column starts on one edge; read-only rows skip the box, because
    they have no field to line up and a long working squeezed their label away.
  - **Carrier cost is read-only**, with the standing chip — Awarded / Not
    awarded / **Pending award** — *inside* the partner field, between the name
    and the chevron. The standing is a fact about *that partner*, not about
    carrier cost in general, so it lives in the box that names them and changes
    when the picker does. (`Combobox` gained a `trailing` slot for it; a single
    partner gets the same box without the control.) The total reads *Estimated*
    until one is awarded.
  - **Whoever holds the load order pays its fees and taxes.** With a load order
    the product is already the broker's, so the partner's product row goes and
    its fees and taxes move to the customer column marked *On the load order* —
    read-only there, and out of the partner's total so the same money is not
    claimed twice.
  - **The service charge survives a load order.** It used to be folded into the
    base price and struck with it; the broker owning the fuel does not stop the
    partner charging for wait time and tolls to haul it. `quoteTotal` now splits
    `quoteProductTotal` from `quoteServiceTotal` and only the product is
    conditional.
  - The rail's Summary shows the same three figures as the unit.
- **Two sections at the tail, side by side at 1:3.** **Upload Supporting
  Image** and **Notes** are separate units — a file and a note are different
  kinds of thing, one evidence and one instruction, and a single "Additional
  Details" over them named neither — but neither needs a row of its own. The
  upload takes the quarter because it is one target; the notes take the rest
  because they are the only thing here anyone writes more than a line into.
  Notes holds its two boxes side by side too: one is read by a driver at a gate
  and the other by nobody outside the building, and stacked they read as a first
  and second note rather than as two audiences. Both sit after the pricing, so
  the tail of the sheet stops pushing the money below the fold.
- **Visibility is gone.** It was a Public/Private radio governing the upload and
  nothing in the product read it: every file on an order is the order's, and the
  one genuinely private thing here has its own field and always had. A control
  that decides nothing is worse than no control, because somebody sets it and
  expects it to hold.
- **Duplicate order and Download tickets live behind the ···.** They were two
  outline buttons at the foot of the form, in the reading path of somebody
  filling it in. Neither is ever the next act, so neither belongs in the flow or
  in the footer — behind the menu is where a reader looks for a spare act on the
  record, beside Cancel and Delete.
- **The Vendor table reports a status and a cost.** Columns are Vendor · Address
  · Products · **TLC** · **Status** · the unheaded Award column. The cost column is always there — it says
  what the table is for — and reads **NA**, disabled, with an *Awaiting
  quotation* tooltip until the partner prices the order. Status is a four-rung
  ladder, and only the first rung is an action: `Invite` (button) → **Invited**
  → **Accepted** → **Quotation shared**, tones climbing neutral → processing →
  success — **words, with no dot beside them** (`docs/ds/ui/2-rules.md` §11). The rail's Partners list uses the same four words, plus **Holds
  order** once one is awarded.
- **The vendor unit rests as one empty row.** Decided 2026-09-17. "No vendor
  yet" in the body with an Add vendor button under it were two ways of saying
  the same nothing, and the reader had to press one before the table would let
  them do the only thing it is for. The blank row IS the invitation to fill it.
  The footer's old *Invite a partner* rung went with it — it would have added a
  second empty row — and reads *Send invitations*, disabled, *"add a partner in
  the table above"*, until one is named.
- **Several partners from one open of the list.** The row's picker takes ticks
  and an **Apply** (`TableCellSelect.multiple`, a DS addition): the first
  choice lands in the row that was opened and the rest arrive as rows after it.
  Only on a BLANK row — on a row that already names a partner the question is
  "which one instead", and answering it with three would replace one row with
  three under a reader who asked to change one.
- **The table's closing band carries the SENDING.** Add vendor on the left,
  where the rows it adds are; on the right the **···** of spare acts and a
  **smaller** Send invitations to all. Inviting is what this table is for, so
  the act belongs on the table — and at the footer's size the two were
  competing for one press. What the button would send to is the ticked unsent
  rows, or every unsent row when nothing is ticked; it goes when there is
  nothing left to send rather than sitting there spent.
- **The two settings are a row of their own, inside the unit.** *Send email
  notifications* and *Request a quote*, side by side directly under Add vendor.
  They belong to the vendor unit because they are about the invitation and the
  unit is where the invitation is made; a section of their own put a card
  between the table and the pricing for two toggles, and on the send band they
  read as part of pressing send. Side by side rather than stacked — there is a
  screen's worth of horizontal room and they are two of the same kind of thing,
  not a list.
- **What the order must have before it is an order, in a strip above the
  footer.** Three mandatory steps, and they are the same three whether you read
  them as "what Create Order is waiting on" or as "what moving to Quoting
  means": customer and ship-to · product (or asset) details · a partner added,
  invited and asked for a price. The strip names one at a time with chevrons
  and *1 of 3* — a disabled primary has room beside it for one clause, so with
  three things missing it named one and implied nothing about the others. Each
  step is worded as the ACT that clears it, not the area it belongs to, and the
  third says whichever of its three parts is outstanding. With nothing left it
  stays and says **All mandatory steps completed** — a banner that vanished at
  that moment would take the only confirmation with it. `RecordSheet` gained
  `footerBanner` for the slot, fixed above the footer and outside the scroll.
- **The ladder no longer opens with "Add an asset".** The whole of Draft is one
  act — create the order — and a footer that renamed itself three times on the
  way through a form was a button the reader had to re-read at every step.
- **Two ways to ask, and the second is not a second button.** The row's Invite
  carries a caret with **Invite and request quote** — the same act with one more
  thing in the envelope. Two buttons of equal weight would make the reader
  choose before they knew they had a choice. The quote request is the round's
  (there is no per-partner flag), so it turns that on and sends in one press.
- **Send email notifications is OFF by default.** It was on, on the argument
  that suppressing every email should be the deliberate act. The other way
  round is safer: the switch mails people outside the building, and a draft
  being assembled should not be one stray click from doing that.
- **The footer speaks for the selection, and the floating bulk bar is gone.**
  It sat in the middle of the section carrying the acts for the ticked rows,
  three inches above a footer whose whole job is the next act — two places to
  press for one decision. Ticking rows now changes what the footer sends to and
  what it says: *Send invitation* for one, *Send invitations to all* for more,
  *Send invitations* for none. Beside it, a small grey **···** holds the two
  spare acts on the list — *Acknowledge for them* (the ticked rows, or all of
  them) and *Remove all vendors*.
- **Award is the row's one act, in a column with no heading.** Beside Status,
  on every row that has priced the order: Status is a fact the row reports,
  Award is the act it offers, and a heading over a column of buttons would be
  the word twice. Awarding sets who holds the order and moves a Quoting order
  into **Assigned** — and stops there. The awarded row says *Awarded*; every
  other priced row keeps its button, so the choice can be changed right up
  until it is confirmed.
- **A quote goes stale when the order grows.** A quote prices the lines it was
  sent; add an asset afterwards and its figure answers a different question.
  Any order line with no line in a partner's quote (matched on the asset, which
  is what a quote line is keyed on) puts that row on **Products updated** and
  swaps its Award for **Resend invite** — awarding a price that does not cover
  the order is buying the wrong thing. The quote itself stays on the row, since
  taking it away would leave no record of what the partner had said. A soft
  caution banner under the section's name carries the reason, because nothing
  on a row can explain something that happened to the ORDER three sections up.
  It is **flush** — square, edge to edge, one rule against the table's header —
  because inset and rounded it was a card inside a card, held 16px away from
  the edges its message is about. Resending is a notification, not a state
  change.
- **"Accept and draft quote" only where there is no quote.** Writing down a
  price given on a call is a real act for a partner who has not sent one; on a
  row that has already shared a quotation it offered to draft a quote that
  exists.
- **Awarded is not confirmed, and the footer is the difference.** The footer's
  act reads **Confirmed** and is disabled — with *Award a partner in the table
  above* beside it — until one row is awarded. Pressing it settles the pricing
  and moves the order to Completed, which is what the old **Accept quote** did
  in the same click as the award. Splitting them is what creates a state where
  a choice has been made and can still be taken back; it also stops the footer
  deciding for the reader, which is what accepting "whichever quote the sheet
  is showing" did the moment two partners had priced.
- **The vendor table stays until the order is confirmed.** It used to disappear
  the instant `vendorId` was set, which under the split would hide the table on
  the click that awards.
- **Review on the board card opens the sheet and SCROLLS to the vendor table**
  (`focus="vendor"`, `SheetSection id`). A footer action that names the pricing
  and then lands four screens above it is answering a different request — but
  arriving already at the table is not the answer either: the sheet then looks
  like it opened somewhere strange, with no way to tell what sits above. It
  opens at the top, waits out its own opening, and travels down. The travel is
  what says *this is the order, and the part you asked for is here*.
- **The TLC opens the quote.** Priced, the figure is underlined and opens
  `VendorQuoteSheet` — a second sheet over the order, because a quote belongs to
  a partner and there are as many as there are rows. It carries the working: a
  rate and a surcharge on every line, `TLC = A×(B+C)` on **requested** gallons
  (nothing is delivered yet), then freight / fees / taxes, then the total. No
  base-price subtotal: it was the sum of the column directly above it, under a
  different name. Below the table, one group — **Supporting documents and
  notes** — for everything the partner sent with the price; when they sent
  nothing, one line says so instead of two empty cards.
- **Two modes, one layout.** `review` is the partner's own quote: read-only,
  **Reject** or **Accept**. `draft` is the broker writing one down after a call
  — the row menu's **Accept and draft quote** — where every cell is a
  `TableCellInput` and there is no Reject, because you cannot turn down a quote
  you are still typing. Accepting from either awards the order, the same act the
  row menu used to perform blind. **Accept fills green and Reject is outlined
  in the destructive colour** — this pair is the one place where the decision is
  the whole of the screen, so the buttons carry the outcome rather than the
  usual primary/secondary weight. The green fill is the first outside
  `docs/ds/ui/2-rules.md` §9's brand-only rule; the rule needs amending or the
  pair needs a token.
- **The view bar puts the businesses first.** On Fuel `Transport · Tank Wagon │
  Default · <saved views> · + View`; on Lubricants `Packaged Goods · Lubes │ …`.
  Propane has none declared yet, so its row is Default alone. Facts about the
  work sit on one side of a rule, things a reader made on the other. Default still holds the underline at rest, and a
  business and a saved view are mutually exclusive: exactly one tab is ever
  underlined, and picking either drops the other. See `docs/ds/ui/2-rules.md` §10.
- **The column tools are the table's tools.** Search by column and Show/Hide
  columns render only in table view — a board shows cards and a map shows pins,
  and neither has a column to type under or take away. The board's Show/Hide
  used to re-aim itself at the card's units, which was one icon with two
  meanings; it is gone. The rule lives in `ListToolbar`, so every screen
  inherits it — `docs/ds/ui/2-rules.md` §10.
- **The card carries the quotes, not a count of acceptances.** While no partner
  holds the order, the card's Vendor unit shows what has been *priced*: the
  carrier on the left with its placing under it — **Best price**, then *2nd
  best*, *3rd best* — and the **TLC on the right**, cheapest first. More than
  one quote gets a pair of very small chevrons and an `n/m` on the heading line
  to step through them; the card still opens on click, so the stepper stops the
  event. The figure is `quoteTotal` with the order's own load-order rule, which
  is the same arithmetic the sheet's Carrier cost column does — two sums for one
  quote is how a card comes to disagree with the order it stands for. The
  footer follows: once anything is priced it reads *2 of 3 quotes in — review
  pricing* instead of *Awaiting acknowledgement*, and its **Review** opens the
  order (it carried no handler at all before). With nothing priced the unit
  falls back to where the invitations have got to, and once a partner holds the
  order it is that partner's name and detail as before.
- **The board has its own control: Card fields.** Same slot the column tools
  vacate, its own icon, its own heading, shown only on the board. It is not a
  flat list, because a card is not a row: `CARD_UNITS` nests one level, so
  *Customer Details* is a heading with Account, Ship-to site and Address under
  it and a reader who wants the account but not the street can say so. A parent
  carries its children both ways; the last child going off takes its heading;
  a heading left with nothing under it is not drawn. There is **no ordering**
  here — a card's units read in the order the work happens, which is the card's
  design rather than a preference.
- **Export states what it is about to export.** The toolbar's Export opens a side
  sheet (`ExportSheet.tsx`) carrying the narrowing itself, not a summary of it.
  It uses **the screen's own two controls**, each stretched across a row of its
  own under a plain heading: the date stepper — arrows to step, the date to open
  the picker — and the `Filters` button with its count, staging until Apply
  exactly as it does on the toolbar. One interaction to learn, not three.
  48px below them is the part the sheet adds: **every applied narrowing as a
  removable chip**, because the facet panel shows one facet at a time and cannot
  answer "what am I exporting" on its own — and the answer includes narrowings
  that are not facets at all, the search and the column boxes. The sheet is
  **510 wide**, short of the DS narrow's 560: it holds controls, not a
  two-column form. The footer carries the count on the left, and the **file
  format** (`.csv` by default, `.pdf`, `.doc`) 12px off Export on the right —
  the format is part of the act, not a fact about the list. **No Cancel**: this
  sheet commits nothing on its way through, because the narrowings it edits are
  the list's own and are already applied behind it, which is also why the count
  in the footer is the count on the board.
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
Quoting          --acknowledge on their behalf-->  Assigned
                 --accept a submitted quote----->  Assigned
                 --cancel the invitation-------->  Draft
Assigned         --submit details for them------>  Completed
Completed        --mark ready for accounting---->  Verified
Verified         --sync to accounting----------->  Synced
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

### A draft is a real order from the first thing typed into it

Decided 2026-09-17, with Pavan: *"in the draft they are adding all the required
details, but it is created when vendors are added and invitations are sent —
that is when it will move to Quoting. Till then, everything is in draft mode."*

- **There is no Create button, because there is no commit at the end.** The
  first change that makes the draft anything other than the blank one creates
  the record, in the Draft lane, and the sheet hands itself over to it — same
  sheet, same scroll, now with a number and a stage bar. The old footer had a
  Create button nobody could reach (the next-act ladder replaced it), so a new
  Delivery Order could not be saved at all.
- **Sending is the precondition; Proceed is the transition.** Sending an
  invitation used to move the order to Quoting by itself, which made one act do
  two things — a broker who asked one carrier while still weighing the rest
  found the order had left Draft underneath them. The footer's **Create Order**
  is the moment they say the round is out, and it needs **one invitation
  actually sent**: an order in Quoting that nobody has been asked for is a lane
  telling a lie. (Revised with Pavan the same day, after the first reading.)
- **`sentVendorIds` is a stored field.** It was derived — "an order past Draft
  had its invitations sent" — which cannot describe the draft that now matters:
  five carriers listed, three of them asked. Deriving it forgot exactly that on
  close. `assertConsistent` keeps it a subset of the invited.
- **More partners can join a round that is already out.** Ticking a row that
  has not been asked puts *Send invitation* back in the footer at any stage, so
  a broker chasing a quote on Thursday can add two more carriers without the
  order going backwards. Rows already sent are never re-sent.
- **The sheet now keeps what it says it keeps.** "Draft saving… / Draft saved"
  described a hook that only WATCHED the draft; nothing wrote it anywhere, so
  ticking Urgent or adding an asset was gone on close. Every change is
  debounced 600ms and saved, and the draft it last handed over is remembered so
  the rebuilt row coming back does not start the next save.
- **`applyDraft` carries the whole sheet now.** It was keeping the customer and
  the lines and dropping the acceptances, the quotes, the delivery fee, the
  recurrence, the load order and the tags — the entire right-hand half of the
  work.
- **A draft being filled in writes no history.** The audit trail is what
  happened to a live order; on a draft nobody has sent anywhere, every field is
  being typed for the first time. Past Draft, every save that changed something
  earns its line. The acts announce themselves either way.

## Open questions — do not silently decide these

**Two order lines can share an asset name, and a quote cannot tell them apart.**
`QuoteLine.asset` matches `OrderLine.asset`, so on an order with two lines
against the same tank — "180 asset · Dyed Diesel" and "180 asset · Clear Diesel
#2" — typing a rate on one writes it to both. It is visible in the new quote
sheet and was already true of Vendor Pricing. The fix is to key quote lines on
the order line's position rather than its asset name, which touches the model,
the seed and both pricing tables. Not done; ask before it is.

1. **Three stages share one chip colour.** The DS ships four `StatusTone`
   channels and this lifecycle has seven stages, so Quoting, Assigned and
   Verified all render `processing`/amber. That is defensible — all
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
| — | the sheet's retired V1 layout is written up in [`docs/order-sheet-v1-retired-2026-09-15.md`](../../../docs/order-sheet-v1-retired-2026-09-15.md) |
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
