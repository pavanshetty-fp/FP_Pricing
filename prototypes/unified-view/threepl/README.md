# 3PL — the brokerage module

> **ONE NAME FOR THE ACT (Pavan, 2026-09-23): "Finalize vendor"** — the row
> button, the dialog's confirm, the pending strip, the toast. The state it
> leaves is **Finalized**. "Award" is retired from every label; older notes
> below that say "award" mean this act.

The **second module** of the Unified View. Sales was first; this is the same shell
and the same design system pointed at a different business.

**3PL is brokerage.** In Sales, FleetPanda's customer delivers the fuel itself. In
3PL the customer is a **broker**: it takes an order and dispatches it to an
**outside vendor** (a carrier), who acknowledges by email link or in the vendor
app and reports back when the delivery is done. Everything distinctive about this
module follows from that one fact — there is a party outside the building whose
acceptance the order is waiting on.

> **BUILDING OR CHANGING A CREATION FLOW? READ
> `docs/unified-view/3pl/creation.md` FIRST.** It is the module's rules
> document — every component a create sheet uses, filed by layer, with its
> spacing, colour, addition, subtraction and interaction, and it is the file a
> continuation session starts from. This README records **why 3PL decided
> things**; that one records **how 3PL builds them**. Anything settled in a
> creation flow is written back into it in the same commit.

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
  - **A green tick beside a column's name once EVERY field in it is filled.**
    Three columns of rows that look alike, and the question the reader carries
    down the unit is "which of these have I done". The totals answer it only by
    being read and compared. Not "the column totals something": a fee typed and
    a margin left at zero add up to a number, and a tick on that says the column
    has been dealt with when half of it has not been touched. Product details
    wants a rate on every line; Order details wants a **margin** on every line —
    and only the margin, because tax and fee are per product now and plenty of
    products carry neither, so a tick that waited for those would be a tick
    nobody ever saw; Vendor cost — which has no fields, being the partner's
    quote read back — wants a quote that prices the order as it now stands.
    **Zero reads as empty**, because it is what the field shows before anyone
    types; telling a deliberate zero from an untouched one needs a per-field
    record of who typed what, which the model does not carry.
  - **THE UNIT IS AT EVERY STAGE — EXCEPT AN UNQUOTED DRAFT** (Pavan,
    2026-09-22). A draft with nobody's price on it has nothing to compare: the
    vendor column would be a wall of empty cells beside a customer column
    somebody is invited to fill in, which is the one arrangement that makes the
    broker's own numbers look like the whole answer. **The first quote opens
    it**, and in a draft that is an act the broker takes — *Add their
    quotation* in a partner row's ··· menu, which is how a price given on a
    call gets written down. Past Draft the unit is always there: the order
    exists, and what it is worth is a question anyone can ask of it. Additional
    fees and the totals bar go with it, being the same block.
  - **THE PRODUCT IS THE ROW; THE TWO SIDES ARE THE COLUMNS** (Pavan,
    2026-09-22). Three columns — product, order, carrier — were three different
    lists, and because a product had four rows under the partner, three under
    the customer and one under itself, they fell out of step after the first
    product. The third column then held one row and two-thirds white space.

    It is now **PRODUCT · TYPE · VENDOR PRICING · CUSTOMER PRICING**. The
    charges — Price, then any number of Margins, Taxes and Fees, each per
    gallon of that product — are named **once, in the Type column**, and the
    two money columns hold nothing but money. They were printed twice, once down each side: the same
    four words answering a question neither column is. A row now reads across
    as ONE charge with two figures against it, which is the comparison the unit
    exists for. (It is also why the partner's `surcharge` was renamed
    `marginPerGal` — with one label serving both sides there cannot be two
    names for it.)
  - **THE CHARGES ARE A LIST, AND IT GROWS** (Pavan, 2026-09-22). It was three
    fields — margin, tax, fee, one of each — and one of each is not what an
    order looks like: a load can carry a state excise AND a county tax, a pump
    fee AND a hazmat fee, a margin split between the broker and the
    salesperson. `OrderLine.charges` is a list of `LineCharge`, and **Add
    charge** at the foot of each band appends one of the three kinds.
    - **The charge is the ORDER's; only the figures are each side's.** The row
      has to exist once, above both columns, or the unit could not be read
      across — so `LineCharge.perGal` is the broker's rate and the partner's is
      `QuoteLine.rates[charge.id]`, keyed by the same id. **Adding a row adds
      it to BOTH columns**, which is the point.
    - **Numbered, not named.** Two margins on a product are "Margin 1" and
      "Margin 2" by their order in the list. A typed name is one more thing to
      keep consistent across an order for no gain the figures do not already
      give — and two rows both reading "Margin" with different figures is a
      table nobody can check.
    - **PRICE IS NOT ONE OF THEM.** A product has one rate, and a second would
      be a second product — so its row cannot be removed and is not in the Add
      menu.
    - **A load order strikes the tax and the fee, not the margin.** The broker
      owning the fuel does not stop the partner charging to haul it.
  - **The product cell SPANS its band**, one cell as tall as the band has rows
    — the shape a table takes when a subject owns several rows, rather than a
    heading strip re-read on every row under it. Collapsed, it spans one.
  - **Every run-level charge takes a row of its own** in the "Whole order"
    band: freight, then ONE ROW PER ADDITIONAL FEE (Pavan, 2026-09-22). It was
    a single row reading "2 on this order" — a count where the reader wanted
    the two, what they are and what each comes to. The Type column already
    names a charge, so a fee's label is simply the name of its row, and a
    Discount shows its amount negative.
  - **The other side says NA, not nothing.** Freight is the partner's alone and
    the run's fees are the customer's, so each has no opposite number — and an
    empty cell reads as a figure nobody has filled in yet rather than one that
    cannot exist.
  - **Both Type columns fit their longest label.** A fee's label is a row name
    now, so the pricing matrix's Type column has to hold "After-hours
    delivery"; and in the Additional fees table Type sits at 40% against
    Label's rest, because the two questions are the same size and at 150px the
    select read as a fragment of the row rather than the first thing about it.
  - **Review flashes the WHOLE vendor column**, not its heading (Pavan,
    2026-09-22). A column of a grid is a stack of separate cells, and an
    outline round each of them is a ladder rather than a column — so every cell
    that belongs to it carries `data-blink` and they flash a FILL together.
    `blinkGroup` in `PendingStrip` is that; `blink` is still the outline, for
    something that really is one box. **One flash, not two**, everywhere: two
    is a thing asking to be watched, one is a thing pointing at itself and then
    getting out of the way — the reader is already looking, the scroll took
    them there. (`BLINK_MS` 1400 → 800.)
  - **Add charge is a CELL of the matrix, not a hanging add.** DS ui §10f puts
    a table's add on a tab off the card's bottom-left corner — but this card
    holds several products, and a corner tab could only add to one of them. It
    sits in the Type column at the foot of its own band, styled exactly like
    the cells around it (rule on top, no inset of its own; the button carries
    the padding), so `eval:boxed-tables` does not read it as the full-width add
    band the rule forbids. One control with three kinds behind it, because
    three separate adds would be three controls for one act.
  - **The rates are typed at CELL LEVEL** — nothing drawn until you reach for
    it, a fill on hover, the focus ring on the cell (Pavan, 2026-09-22). A
    bordered box inside a table cell is a box in a box: the cell already has
    edges, and eight of them down a column drew a second grid over the first.
    It is the same interaction the Additional fees table uses for its amounts,
    and a reader who has learnt it once should not meet a different one two
    sections up. The hit area runs to the cell's edge — the cell carries no
    horizontal padding of its own, the input takes the left inset and the
    amount takes the right — and the input carries **8px of its own on the
    right**, because the hover fill ended flush against the last digit and ran
    straight into the "× 1,550 gal" beside it.
  - **EVERY RATE ROW SHOWS ITS WORKING** — `$2.917 × 1,550 gal  $4,521.35`
    (Pavan, 2026-09-22). A rate in a box with an amount at the other end of the
    row is two numbers and no arithmetic: the reader had to remember how many
    gallons this product is, from a cell in another column, on every row. It is
    a NEW slot on `ChargeRow` (`per`) rather than the existing `qty` one,
    because `qty` sits BEFORE the field — that is for a row whose quantity is
    the thing being read, and here the rate is, with the gallons as the
    working. Freight has none: it is charged once for the run, not per gallon.
  - **BOTH SIDES ARE TYPED** (Pavan, 2026-09-22). Most of a quote is settled on
    the phone — the module already has a whole sheet for writing one down on a
    partner's behalf — and this unit is where a broker is actually sitting when
    the partner reads their numbers out. Read-only, the left column was a wall
    you had to leave the screen to change. Typing the first figure for a product
    the quote missed **creates that quote line**, rather than erroring. Freight
    is typed the same way.
  - **The first column is what is being priced** — the product in the
    foreground, **the asset under it, muted, because the asset is NOT
    mandatory** (a line can name a product and a quantity with no asset on our
    books), and **the quantity with them**: Requested, and Delivered at
    Completed. The quantity is ONE number, the same gallons both sides price
    on, so listed in each pricing column it was the same fact printed twice in
    a column of things that differ. Delivered is the band's one field —
    everything in both columns is that number times a rate. **The quantities
    sit at the FOOT of the cell** (`mt-auto`): under the product name they were
    the second thing read and then a drop of dead space beneath them; at the
    bottom they line up with the last rate row either side and the name has the
    top of the cell to itself.
  - **A chevron in the product cell shuts that product's two pricing cells.**
    An order with six products is six screens of figures and the broker pricing
    the sixth has finished with the first five. Keyed by asset (falling back to
    product), not by index — a line removed above would otherwise shut whichever
    product moved up into its place. Open is the default and is not remembered.
  - **A load order still strikes the partner's price, tax and fee.** Those
    three rows say why — *On the load order*, *Billed to the customer* — rather
    than offering a box to type a charge that cannot exist. Margin stays typed:
    the broker owning the fuel does not stop the partner charging to haul it.
  - **The partner picker sits at the head of the VENDOR PRICING column**
    (Pavan, 2026-09-22). It was right-aligned on the section's header band,
    where it read as a control over the whole unit; it governs ONE of the three
    columns — whose figures these are — so moving it into that column's heading
    says which side changes when you use it.
    - **Name and chevron, nothing else.** The standing — awarded, pending, not
      awarded — is said on the partner table above and in the rail's Partners
      list, and a third copy on a picker makes the picker look like a status
      field. It stays inside the MENU, where a reader is choosing between
      partners and it is what the choice is made on.
    - **One partner needs no picker** — a select of one is a question with its
      answer already in it — so it states the name.
    - With no quote the column says so ONCE under its heading, not in every
      product's cell.
  - **"Whole order" is the last band** — freight on the partner's side, the
    run's own fees on the customer's. Neither is about what is in the tank, so
    neither can sit in a product's band.
  - **The column totals are IN THE TABLE**, on a tinted row under the columns
    they total (Pavan, 2026-09-22): a column's total belongs at the bottom of
    that column, on the same grid as the figures above it.
  - **What is left at the foot of the sheet is the BAR, and only the bar** —
    vendor pricing, customer pricing, and the profit between them. That
    comparison is no column's own, which is why it is the one thing not in the
    table.
    - It sits **below Additional fees**, because the customer figure includes
      them and a total that stands above half of what it counts is a total the
      reader has to take on trust.
    - **Pricing, Additional fees and the bar are one `flex flex-col gap-10`.**
      That containing block is what SCOPES the stickiness: the bar pins from
      the moment Pricing arrives and releases at the end of the fees, where a
      child of the sheet body would hang over the whole sheet.
    - **Edge to edge and no shadow.** `-mx-4` cancels the sheet body's padding
      and `-bottom-4` pins it past the body's bottom padding — otherwise that
      16px is a gap for the next row of figures to show through. A top rule
      says it is pinned; a shadow under a full-bleed bar reads as a second
      edge. `bg-popover`, the sheet's own surface, because without a fill the
      content scrolls through it.
  - **The fixture runs to six products.** Every fifth order draws up to six
    lines instead of three, from the one site that has six assets standing on
    it — a fixture that never ran past three could not show what this table
    does at six.
  - **Whoever holds the load order pays its fees and taxes.** With a load order
    the product is already the broker's, so the partner's price row goes and its
    fee and tax on that product move to Order details as one row under it,
    marked *On the load order* — read-only there, and out of the partner's
    column so the same money is not claimed twice.
  - **The partner's charges are per product too.** They were one figure each
    for the whole quote, which meant a quote could not say that the tax on the
    dyed diesel is not the tax on the DEF beside it. They are `QuoteLine.rates`
    now, keyed by the order line's charge ids. **Freight stays order-level** and
    is the only carrier charge that does: it is the truck, not the cargo.
  - **The partner's own quote sheet lost its Margin/Fee/Tax columns.** With a
    variable number of charges per product, three fixed columns could hold the
    first of each and nothing after it — so that sheet prices the RATE and the
    freight, shows everything on top as one read-back **Adds/gal (C)** column,
    and its landing cost is `A×(B+C)`. The per-charge figures are typed where
    they are compared: the order sheet's Pricing unit.
  - **The service charge survives a load order.** It used to be folded into the
    base price and struck with it; the broker owning the fuel does not stop the
    partner charging for wait time and tolls to haul it. `quoteTotal` now splits
    `quoteProductTotal` from `quoteServiceTotal` and only the product is
    conditional.
  - **The totals strip STICKS to the foot of the screen while Pricing is on
    it** (Pavan, 2026-09-22). The unit is taller than the sheet on any order
    with more than one product, so the question it exists to answer — what is
    this order worth — was off the bottom of the screen for the whole time
    anyone was typing the numbers that change it. Pinned, the margin moves
    under your hands as you type it. It **leaves with its section**, not with
    the sheet: `sticky` releases at the section's own bottom edge, so scrolling
    past Pricing takes the strip with it rather than leaving a figure about
    Pricing hovering over the fees below. It carries a border and a shadow
    because it now floats over content. The section card is `overflow-visible`
    for it — an `overflow: hidden` ancestor is a scroll container that a
    `sticky` child sticks to, which is to say it never moves.
  - **THE UNIT IS THE SAME AT EVERY STAGE.** Quoting and Assigned render the
    identical component; the only thing a stage changes is that at **Completed**
    the gallons become a field. A partner PICKER instead of a plain box is
    about how many partners are quoting, not about the stage.
  - The rail's Summary shows the same three figures as the unit.
- **The tail is TWO ROWS: 1:3, then full width** (fixed 2026-09-22).
  **Upload Supporting Image** and **Documents** share the first row — both are
  about files, so they read as a pair; the dropzone takes the quarter because
  it is one target, and the documents table takes the rest because four columns
  need the width. **Notes** takes a full row of its own: it is the only thing
  here anyone writes more than a line into. All three sit after the pricing, so
  the tail of the sheet stops pushing the money below the fold.
  - **What was wrong.** Three units shared one four-column row with spans of
    1, 4 and 3. A span of four cannot fit beside a span of one, so Documents
    was pushed onto a row of its own and left three empty columns beside the
    upload; Notes then took three of the next four and stopped short of the
    right edge. Three units, three widths, none lining up with another.
  - **And a DS bug under it.** `SheetSection` puts the caller's `className` on
    the CARD, but when something hangs off the card the outer element is the
    WRAPPER — so `lg:col-span-3` was landing inside a grid item that was still
    one column wide, and a section could be told to take three columns and
    silently take one. `className` now goes on whichever element is the outer
    one.
  - **Documents is ALWAYS a table**, never an empty-state panel standing in for
    one — the same rule the Delivery Order table follows. An empty table with
    its columns showing says what a document on an order is made of, and the
    section does not change shape the moment one arrives.
  - Notes holds its two boxes side by side: one is read by a driver at a gate
    and the other by nobody outside the building, and stacked they read as a
    first and second note rather than as two audiences.
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
  success — **words, with no dot beside them** (`docs/ds/ui/2-rules.md` §11).
  Past Draft the second rung reads **Awaiting quote** instead of Invited, in
  the tone to match: "Invited" is what you have DONE to them, and once the
  round is out the reader is not checking whether the invitation went, they are
  waiting for a price. In Draft it stays Invited — nothing is late yet. The
  rail's Partners list uses the same word, as it does for the rest of them. The rail's Partners list uses the same four words, plus **Holds
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
  into **Assigned** — and stops there. The finalized row says *Finalized*; every
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
- **Finalized is not confirmed, and the footer is the difference.** The footer's
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
| Recurring Orders | Built as a destination, in **two versions** behind a V1/V2 switch in the page header |

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
- **THE SHEET'S LAST FIVE ORPHANS NOW HAVE A HOME (2026-09-17).** Job type, the
  second contact, the internal note, the winter blend and the partner-email
  switch were collected by the sheet and modelled nowhere: every save threw the
  answer away and the next open read back the default. They are fields on
  `BrokerOrder` now, seeded, carried by `draftFrom` / `applyDraft` /
  `createOrder` / `createMovement`, and written into the audit trail. Two things
  came out of it:
  - **The second contact is a LIST on the order**, `secondaryPocs`. The order
    sheet collects one and the movement sheet collects several, so storing the
    singular would have thrown away the second and third the moment a movement
    was created. The order sheet edits the first and keeps the rest.
  - **`tags` was being dropped the other way** — `applyDraft` wrote them and
    `draftFrom` read back `[]`, so reopening an order emptied its own tag row.
- **A NEW ORDER LANDS WHERE THE READER IS LOOKING (2026-09-17).** The board is
  scoped to a date range and one service line, and a new order defaults to
  TOMORROW — so the commonest act on this screen was creating an order and
  watching it not appear. The window is WIDENED to take the new date in, never
  moved: jumping to the new order's day would take away whatever was being
  watched to make room for the thing just made. The same applies while a sheet
  is open, so an order cannot slip out from behind its own sheet when its
  product or its date changes.
- **The service line follows the product, always.** It was set once at creation
  and never again, so a draft that started on the default fuel and ended up a
  lubricants order stayed on the Fuel board with lubricants written on its own
  sheet. Moving line takes the business with it — a business belongs to one
  line, so the old one cannot survive the move.
- **A draft being filled in writes no history.** The audit trail is what
  happened to a live order; on a draft nobody has sent anywhere, every field is
  being typed for the first time. Past Draft, every save that changed something
  earns its line. The acts announce themselves either way.

### The stage moves, and the sheet follows it

Decided 2026-09-17. The sheet is four screens long and only one part of it is
live at a time. In **Quoting** the work is the partner table; the moment a
partner is **Finalized** it is the pricing. A stage that moves and leaves the
reader looking at the same paragraph has told them something happened and not
where — so advancing a stage scrolls the sheet to the section that stage's work
lives in.

- `STAGE_SECTION` maps only the two stages that have something waiting on them.
  Draft is filled from the top, and past Assigned the order is being read rather
  than worked on, so both are absent on purpose.
- **Only on a CHANGE, never on open.** Opening an order is not a claim that
  anything just happened, and a sheet that jumps every time it is opened takes
  away the reader's own place in it. The first render records the stage and
  scrolls nowhere. The one exception is the board card's *review pricing*, which
  is the reader asking for the partner table by name — that is the existing
  `focus` prop and it is unchanged.
- The wait before the scroll is longer than the sheet's own opening (360ms vs
  260ms): the stage bar redraws and the footer's act swaps under the cursor, and
  moving the page out from under both reads as a glitch.

### The price is the biggest thing on a card, and the product list hides behind it

Decided 2026-09-17, from a marked-up board screenshot.

- **The quoted figure is `text-lg`.** It was `text-[13px]` — the same size as an
  asset name, on a card whose whole reason for being opened is the money. The
  nearest step on the scale is 18px, ~138% of what it was.
- **Past Quoting the product list stops being a question.** While the order is
  out for pricing, the tanks and the gallons are what the quotes are read
  AGAINST, so the unit stays on the face of the card. The moment one partner
  holds it the comparison is over and the list has become the thing the figure
  is FOR — so it folds behind the figure. An Assigned card is five units, not
  six.
- **The fold is what gives the price its underline.** Dotted, so it does not
  read as a link to somewhere else, and it appears ONLY where something is
  actually hidden: on a Quoting card the unit is still on the face, so the
  figure is plain text and presses nothing. The underline is a promise there is
  more, and it is never made falsely.
- **It is a press, not a hover.** A hover card on a board of forty cards fires
  on the way past; the reader asks for this one.
- Two conditions hold the fold back: a product unit the reader has switched off
  is not offered behind the price either, and an Assigned order whose partner
  has not priced keeps its unit — there would be no figure to fold it behind.

### The first lane is called Orders, and its cards say what they are waiting on

Decided 2026-09-22. The lane holds two states, not one: an order still being
typed, and one whose invitations have gone out and whose partners have not
priced it. **Draft** named half of what was in it, and the card's badge had to
contradict the heading to say so.

- **The lane is "Orders".** The STATUS is still `Draft` — nothing in the model
  changed — and the stage bar in the sheet still reads Draft. **This is a
  vocabulary split and it is deliberate**, which is the one thing the
  2026-09-16 rename set out to remove; see *Open questions*.
- **THREE STATES, AND THEY ARE ABOUT THE PARTNER** (Pavan, 2026-09-22). The
  reader of this lane is not waiting on the form, they are waiting on a price:

  | badge | means | tone |
  | --- | --- | --- |
  | **Draft** | nothing has been sent | neutral |
  | **Awaiting Quotation** | sent, and nobody has priced it | **caution** |
  | **N Quotations Received** | at least one price is in | **success** |

  It used to be Draft or Ready, which was about whether the form was filled in.
  - **The COUNT is on the badge.** On an order out to five partners, one price
    back and four back are different situations, and the lane should not make
    you open the order to find out which.
  - **Both tones take the DS's soft recipe** — a `/10` tint of the tone's own
    hue with the tone's text, the same one `StatusChip`'s `soft` variant uses.
    A lane of eight cards should read as a lane, not as a set of traffic
    lights. `BoardCardBadge.tone` gained `caution` and `success` for it.
  - **A Draft can hold a quote** because the broker writes one down —
    *Add their quotation* in a partner row's menu, for a price given on a call.
    That is also what unlocks the pricing unit on a draft.
- **`sentVendorIds`, not `invitedVendorIds`.** Invited is the broker's
  shortlist; sent is the act. The Vendor line on the card was reading "Out for
  acknowledgement" off the shortlist, so a card could say it was waiting on
  partners who had never been written to, directly under a badge saying Draft.
  A shortlist that has not gone out now says **"N selected, not sent"**.
- **The `ready-first` sort stays.** "Ready to send first" is about whether the
  order is complete, which is a different question from whether it was sent,
  and it is the right one to sort a lane of unsent drafts by.

### A card is not one design repeated eight times

Decided 2026-09-17. What a card should say changes as the order moves, so the
field set moves with it and the reader can move it further.

**The default set per lane.**

- **Draft** keeps everything, including the Schedule — a draft is a plan, and
  when it is meant to run is half of it.
- **From Quoting on, the Schedule goes.** The board is already scoped to a day
  and the window is on the order; what the reader is doing in these lanes is
  comparing partners and prices, and a delivery window sitting between the
  customer and the quotes is a line they read past every time. What is left is
  the number, the type, the customer, what is being delivered, who is carrying
  it and how many quotes are in.
- **Past the delivery, "Completed on" takes its place** — the date AND the
  time, with the cadence beside it on a recurring order. A finished order is
  asked when it RAN, not when it was meant to. It is a FIELD OF ITS OWN rather
  than the Schedule wearing a second name: on a run that went out a day late,
  both being readable at once is the whole point, and a reader who wants that
  turns Schedule back on.
- **The awarded partner's price joins the Vendor unit** once one holds the
  order. Same size and same edge as a quote's figure, because it is the same
  fact one stage on; a finished card that names who ran the job and not what it
  came to is half an answer.
- **Urgent stops being a badge once the order is delivered.** It is about
  getting the job done, so past the delivery it is a red chip asking for a
  hurry nobody can supply, competing with the chips that still matter.
  Recurring stays — it says what KIND of order this is, and a finished one
  still is one.

**`completedAt` is a stored field**, not something dug out of the audit trail.
A trail is a list of changes and the one that matters here has to survive being
summarised. It is stamped once, the first time the order reaches a delivered
stage, and cleared if the order goes backwards out of them.

### The Card fields menu speaks for one lane at a time

- **A scope control sits at the top of the menu**, above the ticks it governs,
  because it changes what every one of them means. "All lanes" or one lane.
- **On one lane, a tick is that lane's.** Turning the Schedule back on in
  Quoting leaves every other lane alone.
- **On All lanes, one press means one outcome.** The field ends up the same
  everywhere — toggling each lane against its own state would leave it on in
  some and off in others, which is the one result the scope exists to avoid. A
  field reads as ON there only when it is on in EVERY lane.
- **A lane is only offered the fields it can draw.** "Completed on" and the
  partner's price are not in Quoting's list, because a switch that does nothing
  is worse than a shorter menu. The full list is there under All lanes, which
  is a setting about the board rather than about one card.

### An asset order is a route between two places

Renamed and widened 2026-09-17. "Movement Order" is **Asset Orders**, and the
two directions are **four routes**.

There are only two kinds of place an asset can be — one of our yards, or a
customer's site — and four routes exhaust the combinations:

| Route | Stored as |
|---|---|
| Yard to Ship-to (Delivery) | `Delivery` |
| Ship-to to Yard (Pickup) | `Pickup` |
| Ship-to to Ship-to (Transfer) | `Transfer` |
| Yard to Yard (Relocate) | `Relocate` |

- **Named by the verb, labelled by the route.** Stored as what happened —
  "Transfer" — and offered as "Ship-to to Ship-to (Transfer)", because the menu
  is where someone is deciding and the route is what they are deciding between.
  "Delivery" and "Pickup" are one word apart and opposite; "Transfer" and
  "Relocate" say nothing at all on their own about which two places are
  involved.
- **`MOVEMENT_ROUTE` is the definition, not a label on it.** Which section
  comes first, which assets can be moved, what each end of the form asks for —
  all of it is read off that table rather than written out four times, so a
  fifth route would be one line.
- **The order stores the route, not a yard.** `movement.yard` could describe
  the two routes that have one; a transfer has none and a relocate has two. It
  is `from` and `to` now, and the card reads them straight instead of
  reconstructing the route from a direction.
- **The sheet is a from and a to**, each rendering the yard block or the
  customer block by what kind of place that end is. The assets offered are
  always the ORIGIN's — what is sitting in that yard, or what is on rent at
  that site — which is one rule that happens to answer all four.
- **A route cannot end where it started.** On the two same-kind routes the far
  end's list drops whatever this end has taken.
- **The customer notes follow the customer end**, preferring the destination
  when both ends are customer sites. A relocate has no customer at either end.

### The partner table: the figure is narrow, the acts are roomy

Settled 2026-09-22 on the Vendor table.

- **Distance is a narrow column.** It held every pixel the table had left over,
  so "12 mi" floated a third of the width from the address it belongs to and
  pressed against acts it has nothing to do with. Fixed at the width of the
  figure; **the Address takes the slack**, being the only column here whose
  content actually varies in length. The **Partner name does not wrap** —
  "Sierra / Bulk / Transport" over three lines makes a table of three partners
  as tall as a table of nine.
- **Review is a link** — underlined text, no box. It costs nothing and undoes
  nothing, and as a second button beside the award it read as a second thing to
  choose between. A link is a way through to something already on this screen,
  which is exactly what it is: Review scrolls to the Pricing unit and blinks
  the partner's column.
- **Finalize vendor is a green OUTLINE.** Awarding is the good outcome and the
  green says so, but three filled green buttons down a table of partners read
  as the table's purpose rather than as one choice among them — the row shouted
  before the reader had compared anything. Outlined it is still the only
  coloured thing on the row and still the only press that moves the order, and
  it **fills on hover**, when it is the one being chosen.

### The quote's placing is a chip

"Best price" was loose text under the carrier's name, where it read as a second
line of the name. It is a badge: green for the cheapest, because that is the
only placing anyone acts on, and neutral for the rest so a board of chips does
not turn into a ranking nobody asked to see.

### The pending strip is for every stage

Changed 2026-09-22 (Pavan — "where did the pending bar go?"). It was shown only
while the order was a **Draft**, on the argument that past creation the
mandatory list is spent. True of that list — but not of the strip, whose job is
to say what stands between the reader and the act in the footer.

Past Draft that is the next act's own reason — *"Finalize a vendor in the table
above."* — and it was being said in **grey text beside the button** instead:
the same sentence in a weaker place, with nothing to press. Every reason past
Draft is about the partner table, so that is where the strip's press goes, and
the grey note is gone: saying it twice is the thing the strip exists to stop.

### The mandatory strip names its subject and takes you there

Brought over from the service order sheet 2026-09-18, and the component is now
shared (`prototypes/unified-view/PendingStrip.tsx`) rather than living twice.

- **"Pending" does not move.** It is the strip's subject; stepping swaps only
  the item.
- **The item is pressable.** It scrolls to the section it is about and blinks
  its outline twice — a strip that names a missing field and cannot reach it is
  a label for a hunt.
- Each step carries its target: the customer step goes to Basic Details, the
  lines step to Delivery Order, the partners step to Vendor. **A movement's
  Asset section carries the same anchor as the lines table** — same slot, same
  question, so "add the asset" lands in the right place whichever kind of order
  it is.

### The order sheet as a stepped form (2026-10-05)

Create and detail both use the stepped form (DS ui §1). Create groups its
sections under six `FormStep`s. Detail: the `StageTrack` is pinned at the top
of the form column; no status chip beside the order number. The rail's first
card is **Quotation summary** — a soft violet→rose wash on the shell (no
outline; deep pastel shades in dark), an inner card that reads like a bill
(Requested · Vendor quote · Customer pricing, a dashed rule, **Margin** as the
total), and **the partners last, below the margin**. Partner chips —
Awaiting quote, Quotation shared, Accepted — are **grey everywhere** (summary
and vendor table); only "Products updated" (a warning) and "Holds order"
(green) keep colour. Save as Draft sits left of the commit act while creating.

### Detail page, after the quote and after the job (2026-10-06)

- **Best is a green "Best" chip** (the diamond is gone): beside "Vendor quote"
  in the summary, beside the partner's name in Compare's column heads and in
  the Vendor table, where the best quote's row also comes FIRST. In the Vendor
  table the partner column takes the slack and the address keeps its own width
  on one line (the post-quote table: vendor 32%, address 14%).
- **Compare's chosen column** is one 2px green frame laid over the whole
  column (`data-sel-rim`, placed from the chosen head) — drawn per cell it was
  crossed by the row rules; the pinned totals bar sits above it. **Finalize
  vendor** is a green-outlined button in the chosen column's Total cell, only
  there, opening the existing confirmation.
- **The Pricing header rides along**: scrolled into the table, its column heads
  follow the reader and stop at its foot (a transform, `--head-shift`, because
  the clipped card and Compare's sideways scroller would capture a sticky head).
- **Once a vendor is finalized, choosing is over** (`choosing`): no summary tabs,
  no "Awaiting quotation" list, no Compare, no partner picker, no Best — the
  sheet shows only the chosen vendor until it is changed.
- **Summary rows**: Products ("2 products") · Total gallons · Vendor quote ·
  Customer pricing, then Margin.
- **Assigned onwards**, Order · Contacts · Schedule facts sit in outlined boxes
  like the Delivery and Load order tables.
- **Completed onwards** (`pastCompletion`): the Vendor unit goes (Pricing holds
  the vendor); the footer swaps Urgent / Signature for **Attach supporting
  images** and **Attach documents**, each opening `AttachSheet` (level 2;
  documents take a type — BOL · Ticket · Invoice · Other); and **Additional
  Details** appears — closed by default, no box — listing the images as tiles
  and the documents table. `FileUpload` gained `onFilesChange` and `accept`.
- **Notes is a rail card below Activity** from Draft on (Delivery Instructions +
  Internal Note), the one card in the rail that is typed into; while creating
  there is no rail, so Notes is the form's last step. The pinned rail is capped
  at the form's height and scrolls itself, with 40px at its foot.
- **Header**: Order # · Urgent · save state, the save state always last.

### The lane walk (2026-10-06) — supersedes anything above that disagrees

**Creating.** Nothing is saved until **Create Order** (no "Draft saved", no
Save as Draft); closing with anything typed asks *Discard this order?* —
delivery and asset orders alike. Create needs customer + ship-to and a
product line only; the **Vendor** step is hidden until the order exists, and
inviting happens on the created order. A created order has no Create button.

**Lanes move on quotes.** Any quote — sent by the vendor or added on its
behalf, even at $0 — moves Orders → **Quoting**, with a "Moved to Quoting"
toast. **Acknowledge on their behalf** (one vendor) = finalize that vendor,
add its quote (`VendorQuote.byDispatcher`), move to **Assigned**; the card and
the Vendor unit say **"Added by dispatcher"**. Acknowledging several only
records acceptance. **Assigned means a vendor is finalized** — the fixture
gives every Assigned order a finalized vendor and its quote (derived, no
draws), and `assertConsistent` now requires it.

**Finalize.** One vendor at a time: once finalized, every other Finalize
button goes. **Cancel finalization** (pricing Total cell, next to a green
*Finalized* chip, and the vendor row's menu) is the way back — Quoting only;
Assigned keeps **Change vendor**, now a red outline + red text. **Compare
works after finalizing.** **"Estimated"** stays on the Total row until
Completed.

**Orders-lane cards.** The footer carries the pending step:
*Vendor not selected* + **Select Vendor** (no "Pending:", text 4px from the icon — 2026-10-27), or *Awaiting quotation —
N invited* + **View sent invitations** (both open the order at the vendor
table). No Draft chip, no Awaiting Quotation chip, no Vendor line when the
footer says it. A shortlist is not kept: vendors picked but never sent come
back unselected.

**Delivery Details unit (2026-10-27).** One line — *N assets · N products ·
N gal* ("+ top-off" when some lines are top-offs) — under ONE dotted
underline; hover it for a hover card of ONE FIXED HEIGHT: the Asset ·
Product · Quantity table on the left and a small map on the right, the
same height. Every row shows, total included — 2 rows tall at least (one
row leaves space), 4.5 at most, then the table scrolls. Map 120 wide, 144
past 3 assets. In dark the card is white like the tooltip (`.fp-surface-light`). The map has NO site pin — just the ship-to
radius (dashed violet circle) and EVERY asset at the site: the order's in
violet, the rest dimmed grey (hover a dot for name and lat/lng).
No map on the card itself. Movements keep
their one asset row. Field switches: Products, Quantity (Total is gone).

**Board versions (2026-10-27, trial — 3PL Delivery Orders only).** A
*Version 1 · 2 · 3* switch above the board, kept per browser
(`fp-3pl-board-version`). **1** = the V4 board. **2** = after HubSpot's deal
board (`BoardV2.tsx`): grey trays with gaps, bold stage name + count, white
rimmed cards, the number in link blue, values with no labels, chips wrapping
under the number, CTAs full width, "Total amount" at each column foot, 7.5
lanes in view. **3** = Version 1 compact (`BrokerBoard compact`): no unit
headings, two text sizes (13px subject / 12px rest, weight for hierarchy),
prices 13px bold under the vendor, Version 1's gutters and gaps, 6.5 lanes in
view. Versions 2 and 3 show the ship-to as its name + an info icon whose hover
card holds the address and customer.

**Card footers and bands (2026-10-27).** Quoting with nothing priced:
*Awaiting acknowledgment — N invited* under the Vendor heading, no footer.
The quote band is grey — the Recurring pill's `--muted`, both themes — tucked
4px inside the card, text on the 12px line, the ‹ 1/N › stepper bottom right.
A wait with nothing to press (*Awaiting accounting*) sits in the same grey
(`--fp-wait-box` = `--muted`), tucked 4px in, text left-aligned. Lane titles are vivid fills, white text.

**Order detail.**
- Stage track's first step reads **Orders** (the lane's name).
- **Invitations** card replaces Quotation summary in the Orders lane until a
  quote arrives: no invites → a 120px envelope, "No invitations",
  "Invitations not sent to any vendors."; sent → each vendor "Awaiting
  response".
- The right rail scrolls on its own (callback-ref cap + wheel containment).
- **POC details is off everywhere** unless turned on from the **gear** at the
  end of the step column's progress bar → *Configure order form*: Additional
  Steps (POC details) then Apply to (This order · All orders), shared by
  delivery and asset orders (`orderFormFields.tsx`; session-only). Off hides
  the step, the read-only section and the rail's Primary POC.
- No info icons on **Pricing** or **Vendor**.
- Assigned: Urgent / Signature locked; **Review & mark completed** once the
  window has passed. No load order → a top banner **"Load order is being
  handled by the vendor."** and no Load order unit.
- Completed: **Additional Details** only once something is attached (no seeded
  BOL/ticket).

**Board.** Assigned cards: no quote footer, no "Best price" (ranks only in
Orders/Quoting), Delivery Product Details shown (no folding behind the price).
3PL opens on **Orders** (`MODULE_LANDING`), Dashboard stays first in the rail.

**Recurring rule.** Days | Date switch is black and white. **Custom cycle**
(Repeat → Custom cycle): 2–4 weeks, Week 1 starts, a day row per week (empty =
no delivery), next-4-weeks preview; lists draw W1/W2 rows. **Recommendations**
in the Frequency unit's heading opens a sheet of suggestions (sample data)
with what each is based on; **Apply** fills the picker. Its icon is the AI mark: a filled
sparkle with two small ones, in a violet gradient (`--color-fp-lane-violet` →
`--fp-viz-7`), after Pavan's "AI Insights" reference.

### Shell, navigation and create menu (2026-10-06, last)

- **Navigation is one boxed panel** (`ModuleSidebar`, after the Lovable menu
  + AirOps colours): modules as rows, the open module's pages under it with a
  guide line, the current page a soft fill (`--fp-shell-selected`) with a
  green marker on the line (`--fp-shell-marker`); the open module takes weight
  only. The box is `--fp-shell-panel` (#fbfbfb), no rim, 8px clear of the
  edges; the collapse mark is a quiet grey 16px icon in its top-right corner
  (the expand mark in the rail matches). The app ground — top bar included —
  is `--fp-shell-ground` (#f2f2f2). The top bar has no fill of its own; the
  global search field has no rim. Two-layer rail + drawer kept behind
  `NAV_STYLE`.
- **Create Order = Delivery Order · Asset Order.** Asset Order opens a modal
  of four compact boxes (no icons, no outer box): Delivery · Pickup ·
  Transfer · Relocate, each with its from → to and one line; a box opens that
  route's form.
- **No step column on the 3PL order sheets** (detail and create, delivery and
  asset) — archived in `docs/ds/ui/archive/step-column.md`. The order-form
  gear moved to the sheet header.
- **The stage track waits for the scroll** on Move to Assigned, then animates.

### Summary option 2, and moving to Assigned (2026-10-06, later)

- **D-104634 carries an Option 1 / Option 2 switch** (header, black and white;
  that order only, while it is being tried). Option 1 = the Quotation summary
  card in the rail. **Option 2** = the summary as a banner pinned to the foot
  of the form: edge to edge across the centre column, the rail's violet wash,
  a white band above it holding the vendor tabs (switchable while choosing).
  When Pricing + Additional fees scroll into view it **morphs into Pricing's
  totals bar** (~300ms): the band folds, title and product facts close up, the
  wash fades, and it widens to the full sheet showing Vendor pricing ·
  Customer pricing · Expected profit. Pricing's own bar stands down in this
  mode. Undecided which option stays.
- **Move to Assigned is disabled until a vendor is finalized** (only that
  label; Request a quote stays pressable). Pressing it scrolls the sheet to
  the top (`STAGE_SECTION.Assigned = "top"`).
- **The stage track animates a stage change** (`StageTrack`, DS): the line
  runs on (500ms), the stage left takes its tick, the new pill fades/zooms in
  after 300ms. Never on open; off under reduced motion.
- **On Move to Assigned the track waits for the scroll**: it keeps showing
  Quoting while the sheet travels to the top, and animates once the page has
  stopped (watched frame by frame).

### Quotes, compared (2026-10-05)

- **Quotation summary takes a TAB per quote received** (DS `Tabs`, line
  variant, the active name and underline black). The figures are the chosen
  tab's. **Best price is a solid green diamond** beside the partner's name
  (no facet lines, `text-status-success`), here and on Compare's headers — the
  lowest amount the partner is owed (`carrierTotalOf`), only with two or more.
- **Partners · n lists only who has NOT quoted**, each "Awaiting quotation"
  (grey); the group goes when everyone has.
- **Pricing → Compare** (switch on the section's header line, two or more
  quotes): the SAME table grows one Vendor pricing column per quote, each money
  column at least 320px, scrolling sideways when they no longer fit. The chosen
  partner's column is editable and outlined — a 2px success rim down the whole
  column (inset shadows per cell) and a green tick on its head; the others are
  read-only and show "+ $x vs best" under their totals. Clicking a head chooses
  that partner, and the summary tab follows. The Pricing total row has no fill.
- **Recurring Frequency is quieter**: running days a soft grey square
  (`bg-foreground/10`), the rest a faint letter with no square.

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
   carries a Recurring Order **checkbox** beside the delivery window (a Yes/No
   list until 2026-09-17: opening a menu to choose between two words is two
   gestures to say one thing, and the field needed a label as well as the word
   "No" to be read at all), revealing
   a Frequency list whose "Custom" opens a rule builder — repeat every N units, a
   row of weekday toggles, ends never/on/after N — that returns a SENTENCE, which
   is the only form anyone checks a schedule in. Still open: the recurrence's
   **default carrier** (§5.16).

   **Answered 2026-09-19 — it is BOTH, and they are not duplicates.** The
   kind-tab on Delivery Orders answers "which of today's orders are recurring",
   which is a question about ORDERS. The drawer destination answers "what
   standing arrangements do we have", which is a question about SCHEDULES. See
   §Recurring Orders below.
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

## Recurring Orders — the destination (V2, parent/child)

Three versions of this screen are built deliberately. The switch sits beside
the page title, because it changes what the screen IS rather than filtering
what is on it. **V1.1 sits beside the other two and replaces neither**
(Pavan, 2026-09-21).

| | V1 — the rule | V2 — parent/child |
| --- | --- | --- |
| The schedule lives on | A rule that is not an order | The first delivery order |
| Delivery one | Generated like every other | Is the recurring order itself |
| The row's identity | `R-4800` — a rule number | `D-104648` — an order number |
| What the row carries | The commercial terms: partner, load-order responsibility, both sides of the price | The parent order's own fields |
| Deliveries | A calendar in the sheet, a year deep | Nested rows under the parent, a month deep |
| A date nobody has cut an order for | **Shown, greyed, "Not created yet"** | Does not exist anywhere |
| Changing partner or products | Versions the rule *(not modelled yet)* | Clones a replacement recurring order |

**Creation is the same act in both.** Tick Recurring on a delivery order and
give it a frequency. V1 calls what that produces a rule; V2 calls it the first
order. Nothing about the create flow changes.

Source: the "Recurring Orders - 3PL" engineering doc (2026-09-18), which
describes V2 — the model the product has today. Everything structural in
`recurring.ts` is transcribed from it rather than guessed.

### V1 — the rule (`recurringRules.ts`, `RecurringRulesScreen.tsx`, `RecurringRuleSheet.tsx`)

**One row per rule, and a rule is not an order.** No order number in the
identity column and no parent to expand. The row carries the standing
arrangement's terms in **five column groups** — Rule · Customer details ·
Delivery details · Vendor details · Pricing — because the row answers five
separate questions and a flat run of fifteen headers makes the reader work that
out for themselves. The table is 2,400px and scrolls sideways; the group header
is what makes that navigable, because you scroll to a GROUP rather than counting
along a row of equal headers.

**The columns are flat, and every one is a peer.** They were grouped under
Rule / Customer details / Delivery details / Vendor details / Pricing, with
the groups themselves reorderable and columns locked inside them. It read
well and cost the reader everything else: a column could only move within its
group, the header was two rows tall on every screen, and the groups asserted a
relationship nobody is obliged to accept. **Removed 2026-09-21.**

Flat, every column **sorts, resizes and goes anywhere** — which is just
`useTableColumns` plus `TableColumnHeader`, the DS's own composition. None of
it could be used while the header had two tiers, because that hook knows
nothing about groups. Sorting is asc → desc → unsorted; the third press
matters, because somebody who sorted by accident needs the way back.

**Losing a group means its heading has to hand meaning back to the labels.**
The pricing pair was *Vendor* and *Customer* under a "Pricing" heading;
flat, *Customer* already means the customer's name three columns left, so they
are now **Vendor Price** and **Customer Price**.

**The Schedule column is a shape, not a sentence** (`ScheduleCell.tsx`, shared
by both versions). Seven letters, Sunday-first to match the rule sheet's
calendar, with the live days lit and the dead ones faint — a reader scanning
twenty rules is comparing, and seven dots compare instantly where "Monthly On
First Thursday" has to be read. **The letters say which days, the line under
them says how often**, because neither carries the other: the same lit Thursday
is *every week*, *every 2 weeks*, or *first week of every month*, and that is
the whole difference between three schedules.

A pattern that is not a weekday habit gets **one word instead** — *Daily* would
light all seven, which nobody needs to read, and a yearly date lights none,
which says nothing. An unlit day still occupies its slot: dropping it would
make the row a different width per rule and destroy the comparison it exists
for.

**Created sits under the rule number**, because when a rule was set up is a
different question from when it starts — one made in March to begin in
September is a booked arrangement; one made today to begin today is somebody
reacting.

**Quick filters — All · First party operations · Third party operations.** An
outlined segmented control at the HEAD of the toolbar row, before search, on
V1 and V2 — it is the coarsest cut, and it decides which set the search and
the filters then work inside. Who runs the work is the one
split a reader flips between several times a session — the brokerage book and
the own-fleet book are two different jobs — and a facet you open, tick and
close is the wrong amount of work for that. Everything else stays in the
panel. See `docs/ds/ui/2-rules.md` §10c.

**First party means no partner is needed.** We are the haulier, so the thing
that gates a brokerage rule — somebody accepting the lane — does not apply,
and the rule generates from its start date. Not on V1.1: a programme is
partner-first by construction, so every one of them is third party and the
split would be a control with one answer.

**Assets are not mandatory**, so an empty list renders as *Any — decided per
delivery* rather than an em-dash. An em-dash reads as a field somebody forgot.

**Load-order responsibility is the question "who buys the product".** Yes, and
Terminal / Supplier / Loading Account carry the answer. No, and those three
columns are genuinely empty — the first says *Partner supplies* and the rest are
em-dashes, because inventing a value would be worse.

**A price that does not exist is not zero.** A rule whose lines carry no rate
reads *Not priced* on both sides. $0 is the one wrong answer that looks like a
real one, and a delivery fee alone (`$125` against a 1,450-gallon drop) is worse
still, because it invites the reader to believe it.

#### The sheet — the calendar is the first card

A rule is a claim about DATES, and every question anyone brings to one is a date
question. Four states, and **the fourth is the whole argument for V1**:

| State | Meaning |
| --- | --- |
| Delivered | It ran. Carries its order number and where the money got to |
| Order created | An order exists and the work is ahead of us |
| **Not created yet** | **The rule wants this date and nobody has cut an order for it** |
| Skipped | The rule wanted it; something stopped it |

Only a rule can draw the third. In parent/child a date with no order behind it
does not exist anywhere — the calendar would simply stop a month out, and
"does this run through December" would have no answer but arithmetic. The
boundary is visible on screen: orders through the generation horizon, then grey
cells to the end of the year.

**Tweaked is a label, not a state.** A delivery can be created *and* edited, or
delivered *and* edited, so it is a badge on the cell with the detail on hover —
not a fifth colour. The label is **derived**, not typed: it is a comparison
between the delivery and the rule that made it, so a quantity edited and then
edited back stops being tweaked on its own.

#### The delivery sheet — a second sheet, stacked

A day with a delivery is a control; an empty one is not. Pressing it opens that
one delivery **over** the rule sheet rather than replacing it, because the
calendar is the context for everything about to change — closing it puts the
reader back on the month they were reading.

**What is editable there is what belongs to one day**: the date, the
quantities, a note, and whether it happens at all. Customer, partner, load
order and frequency are shown and read-only, with *Change these on R-4800*
where the answer is. A field that silently changed the whole arrangement from
inside one Tuesday is the worst thing the screen could do.

**Moving a date carries the doc's own warning**, at the edit rather than after
it: a hand-moved date is not part of the schedule, so the next time the rule is
edited, an order sitting on a date the rule does not produce is treated as
unwanted and removed. A move onto an occupied date is refused — two deliveries
on one day is the duplicate the generator exists to prevent.

**Three doors are closed, for three different reasons.** A delivered order is
history (completed work is never re-dated). A date with no order has nothing to
edit *yet*, but can still be taken out of the schedule. A past date cannot be
moved to, because an order dated last Tuesday reads to a partner as a missed
delivery.

**Skipping one date is not cancelling the rule**, and the sentence says so —
reaching for the wrong control is the commonest way people break a series.

Then the cards the table's groups map onto: Customer details · Delivery details
· Vendor details · Pricing · Deliveries. **No Save, no Cancel** — side sheets
autosave. The footer carries the schedule as a sentence, which is the only form
anyone checks a schedule in.

### V2 — parent/child (`recurring.ts`, `RecurringOrdersScreen.tsx`)

**What the screen is.** One row per recurring order, expanding onto the orders
it has made and will make. The row is the parent order — number, customer,
ship-to, partner — because in V2 that is literally what a series is. The
deliveries appear in the DS's nested sub-table treatment: full-bleed inside the
parent's row, recessed a surface step, left accent, muted headers.

**The first row inside the sub-table is the parent itself**, badged *First
delivery*. That is the model, not a rendering accident, and hiding it would hide
the one thing V1 exists to fix.

### Three calls worth keeping

1. **A silent series says why it is silent.** The doc's "when nothing gets
   created" table is logged and never shown — a series reading *Active* over an
   empty delivery list with no reason is the feature's most expensive screen.
   The reason appears three times: under the series status, in the sub-table's
   header, and on the Upcoming count when it is zero.
2. **Ended and Expired share a tone and must not share a meaning.** The DS ships
   four status tones and there are six series words, so three of them read
   neutral. The separator is the line under the word — who stopped it, or which
   date arrived — never a fifth colour. DS rule §11: a status is its word.
3. **The horizon is stated once, in the footer.** A broker who sets up a weekly
   order and counts four deliveries has to know that is the window, not the life
   of the schedule. It is a fact about the list, so it sits with the list's
   count rather than on every row.

### The action unit — on both versions, matching Delivery Orders row for row

Scope shelf (preset views · Transport/Tank Wagon · Fuel/Lubricants/Propane ·
Export · Create Order), then the toolbar (search · filters · view switch ·
column tools), then the applied chips, the table, and the page position. See
`docs/ds/ui/2-rules.md` §10c — this pair is the reason that rule exists, and the
reason it was rewritten once.

**Scope is not a filter.** The line and the business say WHICH LIST; the filter
panel narrows the list you are on. Default clears both.

**Create Order navigates to Delivery Orders and opens its create sheet.** A rule
is made by ticking Recurring on an order and giving it a frequency — that flow
already exists, and a second create form here would be a second way to make one
record.

**Board, map and Group By are switched off at the toolbar, not drawn dead.** A
standing arrangement has no lane to sit in and no pin to drop; row grouping
would fight the column groups V1 already has for the word "group", and on V2 it
would be a second disclosure mechanic competing with the row's own. `boardView`
was added to `ListToolbar` for this, mirroring the `mapView` flag already there.

### Not built here

**Saved views.** Both screens keep their column order, widths and filters for
the session only. **Pause dates** (a window with an end) and **Delete rule** are
absent because both need a date picker and a confirm this screen does not have
yet; *Pause now*, *Resume*, *End recurrence today*, *Cancel series* and *Restart
series* all work.

## V1.1 — the lane-first programme

`recurringPrograms.ts` · `RecurringProgramsScreen.tsx` ·
`RecurringProgramSheet.tsx`. Added 2026-09-21.

**The inversion is the whole idea.** V1 is customer-first: pick the customer,
then find somebody to haul it. V1.1 is **partner-first** — pick the partner,
and the only customers and ship-tos on offer are the ones they can reach. You
are filling a haulier's capacity across a region, not servicing one account.
That is a different act, which is why it is its own version and not a switch.

### The three things that break, and what happens to each

| | |
| --- | --- |
| **The partner's service area** | Fixed by making the partner the **gate**. An unreachable site is never offered, so a programme cannot be built that the partner cannot run. |
| **Where product is lifted from** | Left free. A broker knows their own geography; a picker fighting them would be worse than the risk. |
| **Price** | Does not fan out at all. That is what the second layer is for. |

### Two layers

**The programme** holds what is true of every delivery it will ever make:
partner · terminal, supplier, loading account · product · **frequency** ·
order type · load-order responsibility · winter additive and signature ·
start and end · tags.

**A row per target** holds what moves: customer · ship-to · tanks and
quantities · window · contacts · instructions · PO · **partner price for that
lane** · **customer price** · lane state.

**Both prices on the row means the row carries the margin**, and the grid
totals it. A programme is a **margin table for a whole book of work** — this
is the thing V1.1 shows that neither of the others can.

### The four decisions

1. **New sites are added by hand.** No automatic membership; a rule only ever
   covers what somebody picked.
2. **Frequency is constitutive.** A site that wants a different day is not on
   this programme — it belongs to another. No per-site override — **except a
   skip that resolves a clash** (Pavan, 2026-10-01): a ship-to can sit out
   the days another rule already covers there; see *Conflicts* below. Two
   things follow: a programme **describes itself** (partner · product ·
   frequency, readable from the title), and one ship-to on two programmes for
   the same product becomes a **collision worth catching at the moment
   somebody adds it**, which the add dialog does.
3. **An edit never rewrites what has happened.** Show what it hits, confirm,
   apply forward. *(The middle case — an order already handed to the partner
   but not yet run — is deliberately not decided yet.)*
4. **A programme can be partly live.** Priced 8 of 12 → the 8 run, the 4 wait,
   and the sheet shows both under their own headings. **Acceptance is a
   matrix, not an event** — and that settles the question the engineering doc
   left open: *the partner quotes the LANE.*

### Two details worth keeping

**A target is a ship-to, not an asset.** A truck filling three tanks at one
site is one order. So the unit is the site, tanks are lines inside it, and the
grid stays two-dimensional.

**Coverage is not static.** A partner's area changes after the programme is
built, and a lane can stop being reachable. That row is greyed, pinned with a
marker, and **"Out of area" beats a stale "Accepted"** on the chip — a row
still claiming a lane is away under a Waiting heading is a row arguing with
itself.

### Creating one — two steps, and the order is the design

`RecurringProgramCreate.tsx`. The CTA on V1.1 is **Create Rule**, and it opens
here rather than sending anyone to the delivery-order form: V1 and V2 make a
recurring order by ticking a box on an order, but a programme is its own
record.

**Step 1 — the rule.** Rule name · job type · **Frequency**, then the partner,
the products, and where it loads. Every control on it is one the app already
has, which was the point of the pass on 2026-09-21:

| | |
| --- | --- |
| **Job type** | A radio, like the order sheet's. Two answers, readable without opening anything. |
| **Partner** | A **table** — name, base, what they cover, **sites in range**, safety. A list of names in a select asks somebody to already know who covers Texas. |
| **Products** | The **token control** the order sheet uses for tags. A rule can carry several, so a select cannot say it. |
| **Winter blend** | **Mapped per product**, not per rule. One rule can carry diesel and unleaded and only one takes an additive; an order-level tick would additive both. |
| **Where it loads** | A **table, one row per product** — an account carries some products and not others, so two products can need two accounts. |
| **Pending** | The `PendingStrip` in `footerBanner`, where every other flow puts it: above the footer, outside the scroll, visible whenever the act is. |
| **Signature** | The bottom bar. It is a property of every delivery, not a question about the rule, and a card for one checkbox was a heading doing no work. |

**No start date and no preview on the Frequency card.** The badges *are* the
preview — a second copy of the same seven letters was the screen reading
itself back — and when a rule begins is not part of how often it happens. **Step 2 — ship-tos and assets.** Add sites
from the reachable list, and per site tick the tanks that take the product
and set a quantity or a top-off.

**Those first three come first because each changes what the rest asks.** The
**rule name** defaults to its own code so the field is never empty and never
blocking. The **job type** decides whether there is a partner at all — on
*Transportation* the partner card is gone and every ship-to is on offer,
because reaching a site is our problem rather than a constraint. The
**frequency** is the thing that cannot be changed for one site afterwards.

#### How often — `RuleFrequency.tsx`

Two questions, kept apart:

- **Which days** — seven badges, the same seven the list shows, under a choice
  of *Daily* (lights all seven) or *Specific days*. Switching to Daily and back
  **restores what you had**; leaving all seven lit under "specific days" is an
  answer that reads as daily and costs six clicks to undo.
- **How it repeats** — Weekly · Monthly · Yearly, each with its own follow-up
  rather than one list of twenty phrases. Weekly asks how many drops a day and
  gives each its own time. Monthly asks first week / those days every week /
  same date. Yearly asks first month / specific months, with month chips.
- **Ends** — *no end date* is the default and it is **stated**, not implied by
  an empty field. A standing arrangement runs until somebody stops it.

A live `ScheduleCell` beside the start date shows what the picker adds up to,
**in the cell the list will show it in** — a schedule read back in the shape
it will be read in later is one somebody can check.

`toSchedule()` is the only seam: every shape comes out as the same `Schedule`
the list cell, the calendar and the generator already take.

**Step 2 is unreachable until step 1 is done, and that is not a formality.**
The partner decides which sites exist at all and the product decides which
tanks at those sites matter, so step 2 is genuinely unanswerable first. Asking
for customers first — the way every other create form here does — would mean
offering a list and then taking half of it away.

**Changing the partner or the product empties the sites.** A site picked under
one partner's area may be outside the next one's, and the tanks that matter
change with the product. Keeping them silently would build a rule the partner
cannot run.

*Step 2 as rebuilt on 2026-10-01 — see "Changes, 2026-10-01" below.*

**On create every lane is a draft.** Creating the rule does not start a truck;
the sheet says so above the button, and the new programme opens with all its
lanes under Waiting.

### Changes, 2026-10-01 (Pavan)

**The list.** Flat columns, no groups; every column sorts, reorders and
resizes. Money reads **Estimated Partner Price · Estimated Customer Price ·
Estimated Margin** — a rule only ever makes orders, and each order still goes
through every lane. Several products show as the first plus **+N**. The
Frequency column is wider, its badges larger and rows 64px. Search by column
is the filter row (DS §10g); no Table icon (DS §10h).

**Edit a rule** while it has made no order (no live lane): **Edit rule** in
the sheet reopens the create form filled in; Save replaces it in place.

**Frequency has two tabs.** **Days** — the badges, Daily, Repeat
weekly/monthly/yearly; Monthly asks **which weeks** as checkboxes in a
dropdown (Every week · First–Fourth week, several allowed; Every week stands
alone and covers the partial fifth) with "of the month" said once. **Date** —
the month's dates as a full-width wrapping strip (weekday letter over each
number, past dates off, ‹ › for months), several picked; Repeat under it
(every 1/2/3/6 months, or does not repeat). "Same date every month" is gone.

**Products.** Turning on *Mark as winter blend* blinks the chips' outline once
in blue and shows "Click on all products that you want to be considered as
winter blends." **Loading account is optional.**

**Step 2 — one tab per customer and ship-to.** A tab starts blank: Customer →
Ship-to (that customer's reachable sites; one tab per ship-to) → **Delivery
Window** (the order sheet's slider) → the Delivery Order table (Top off ·
Asset · Product [the rule's products] · Qty) with **Add asset** hanging off it.
"+" adds the next tab; the bin removes one.

**Conflicts.** Another rule at the same ship-to clashes, on a day both run,
only when it fills the **same asset** or its **window overlaps** — the same
product into a different tank is not a clash. 16 weeks are checked. An
overlap is said under the window as it is set, and every clash is listed in a
quiet **Conflicts** table: two rows per clash (the other rule, then *This
rule*) — Rule [hover = its frequency] · Frequency (S M T W T F S as letters,
clashing days yellow and underlined) · Assets · Products · Window — with an
**eye** on each clashing cell naming the kind (frequency / asset / scheduling
window). **Resolve** offers *Don't run this rule on those days* (this ship-to
only) or *Stop the other rule on those days* (that customer and ship-to only,
the rule keeps running elsewhere; written when this rule is created). Skips
are honoured by the order generator (`targetSkips`).

**Board cards (2026-10-05):** a recurring order's Schedule shows its
**scheduled date**, not the cadence — the order is one dated delivery; the
card field is "Scheduled date".

### Not built here

No calendar (the next-run dates are a strip, not a grid) · no per-lane sheet ·
no editing the common terms in place · lane acceptance cannot be driven from
the screen.

### Recommendations, rule-level (Pavan, 2026-10-07)

A recommendation is a **rule**, not a customer: frequency + every ship-to it
fits, across customers or several of one. Card (sheet 560px): frequency with
**Review and Create Rule** · a soft info banner ("94% on Tuesday and Friday",
then deliveries and gal a drop — never "or": an or is a separate rule) ·
Vendors · Suppliers · Load order · a table Customer · Ship-to · Products ·
Total gal. Same split as the form: common details = step 1, per ship-to =
step 2. Review and Create Rule fills step 1 (frequency, product, vendors —
computed so every ship-to is reachable — load order and its loading account)
and step 2 (one tab per ship-to). A form opened from a recommendation shows no
Recommendations button. History is INVENTED.
