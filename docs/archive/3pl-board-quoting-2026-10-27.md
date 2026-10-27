# 3PL board — Quoting, retired (2026-10-27)

On 2026-10-27 Pavan took quoting off the 3PL Delivery Orders board. The
dispatcher now enters every vendor's details on the vendor's behalf and moves
the order straight on: **Assigned** once a vendor is final, otherwise it stays
in **Orders** (unassigned). This page keeps the whole quoting concept so it can
come back exactly as it was.

## What is off the board now

- The **Quoting** lane. Orders with the Quoting status sit in the Orders lane.
- The **quotes unit** on a card (vendor, price, rank, ‹ 1/N › stepper).
- The quoting chips and footers: *N Quotations Received*, *Awaiting
  quotation — N invited · View sent invitations*, *N of M quotes in — review
  pricing · Review*, *Awaiting acknowledgment — N invited*, *N accepted — no
  quote taken yet*, *N selected, not sent*.
- Opening a card with quotes at the sheet's Pricing heading.

Still there: the Quoting **status** (table, filters, order sheet stage track),
quotes in the order sheet (vendor table, pricing), the *Added by dispatcher*
chip, and the `quotes` unit kind inside `BrokerBoard.tsx` (`CardQuotes`) —
unused by 3PL, ready to be fed again.

## How it worked

**Lanes.** Orders → Quoting → Assigned → Completed → Review → Verified →
Synced ┃ Canceled · Blocked. The Orders lane held Draft only.

**The Orders lane — three states, about the partner.**

| State | Chip | Footer |
|---|---|---|
| Nothing sent | — | *Vendor not selected* · **Select Vendor** (opens the vendor table) |
| Sent, nobody priced | — | *Awaiting quotation — N invited* · **View sent invitations** |
| At least one price in | *N Quotation(s) Received* (caution — the dispatcher's turn) | — |

Invited is a selection, sent is the act (`sentVendorIds`); `quotes` is the
answer. A Draft with none of the above showed a plain *Draft* chip.

**The Quoting lane.**
- No prices yet: the Vendor unit read *Awaiting acknowledgment — N invited*
  (or *N accepted — no quote taken yet*), no footer.
- Prices in: the Vendor unit became the **quotes unit**, and the footer read
  *N of M quotes in — review pricing* · **Review**. When the quotes unit was
  the card's last unit it closed the card and the footer went — the card
  itself opened the order at Pricing.

**The quotes unit (`kind: "quotes"`, `CardQuotes`).**
- Cheapest first — the order is the ranking. Each quote: vendor name, total
  (`quoteTotal(q, lines, !loadOrder)`), rank.
- While comparing (Draft or Quoting) the first two read *Best price* /
  *2nd best* under the vendor name; from Assigned on, no ranks.
- ‹ 1/N › stepper when there is more than one quote: 11px, 24px targets,
  chevrons disabled at the ends, clicks never open the card. Version 3 put it
  on the price's line at the card's right corner.
- Price `text-sm font-semibold tabular-nums` (the vendor name's size); an
  optional breakdown — price with a dotted underline opening a popover of
  Asset · Product · Quantity and total.
- The `partner.name` card field could hide the vendor name.
- Version 2 showed only the cheapest: vendor, amount, *· best of N*; the
  column foot summed the best quote per card (*Total amount*).

**Lane extras.** Quoting lane sort *Most invited first* (`invited-desc`);
the schedule fields off by default from Quoting on.

## Bring it back

The last commit with quoting on the board, all four board versions:

```bash
git show 60e2b71:prototypes/unified-view/threepl/BrokerOrdersScreen.tsx   # lanes, units, chips, footers
git show 60e2b71:prototypes/unified-view/threepl/BrokerBoard.tsx          # CardQuotes, the band rules
```

In `BrokerOrdersScreen.tsx`: put `{ key: "Quoting", statuses: ["Quoting"] }`
back after Orders in `BOARD_LANES` (Orders back to `["Draft"]`), restore the
`ranked` quotes branch of the Vendor unit in `laneCardUnits`, `draftStep` in
place of `needsVendor`, the Draft chip block in `laneCardBadges`, the
awaiting / Quoting branches in `laneCardAlert`, and the Pricing focus in
`openBoardCard`.
