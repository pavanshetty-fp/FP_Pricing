# Broker order sheet — V1, retired 2026-09-15

V1 was the original 3PL order sheet. From the day V2 started it lived beside V2
in the same build, reachable from a `V1 / V2` toggle next to the order number in
the sheet header, with the choice kept in `localStorage` under
`fp-order-sheet-version`.

It came out on **2026-09-15**, once V2 had been reviewed and settled. Last
commit that still contains it: **`c954205`** on `feat/3pl-module`
(`git show c954205:prototypes/unified-view/threepl/BrokerOrderSheet.tsx`).

---

## Why it was kept alongside V2 in the first place

V2 was a redesign of a sheet that had not been designed yet. Two ways to do that
and both were worse:

- **On a branch** — then one of the two versions is always the one nobody can
  open, and comparing them means checking out the other branch and rebuilding.
- **In place** — then the version that WORKS stops existing the moment the first
  change lands, and there is nothing to compare against.

So the two shared one file and one build. Nothing was forked: V1 and V2 ran the
same lines until a piece of the sheet was deliberately branched on `version`.
That is what kept the diff readable and kept V1 working without being maintained
twice. A reviewer could open an order, flip, compare, flip back.

## Why it came out

- **V2 was settled.** The toggle was always described in the code as a review
  control that would come out when V2 landed. It landed.
- **Two versions is two behaviours to reason about.** Every `v2 &&` in the file
  was a fork a reader had to hold in their head, and every new section had to be
  designed twice or explicitly excluded.
- **The toggle was visible to everyone, not just reviewers.** It sat on the same
  shelf as the status chip — the shelf that never scrolls away — and once there
  is only one right answer, a control offering the wrong one is a trap.

---

## What V1 was

### Two steps, not one page

V1 split the sheet in half:

- **Step 1 — the order.** One column. Job type, basic details, POC, schedule,
  assets and products, partners.
- **Step 2 — quotes and pricing.** Two columns: the Vendor Pricing and Customer
  Pricing tables on the left, a sticky **Final Calculations** rail (320px) on the
  right.

Step 2 existed only once a partner had acknowledged — either the partner accepted
the invitation, or the broker recorded that they had ("acknowledge and accept
quote", for a price that came off a call). Before that there was one screen.

An order at status `Accepted` **opened on step 2**, on the argument that a price
to agree is the only reason anyone opens one.

### The stage bar was the navigation

There was no separate step switcher. The stage bar doubled as it: clicking a
stage took you to the screen where its work was done — the order itself up to
the acceptance, the pricing step from there on. It was clickable only once there
was a pricing step to reach.

The sheet width followed the step: `wide` (1200px) on step 1, `xxwide` (1440px)
on step 2, because step 2's widest table is eight columns and its headers wrapped
at the narrower size.

### Final Calculations

The rail on step 2, and the block V2 does not have. Per delivery line it showed
what was LEFT — customer price minus vendor cost — plus a row for the order-level
charges that belong to no line (freight, fees, taxes, shown negative), then three
totals on a shaded band: Vendor TLC, Customer pricing, and Margin. The margin was
the only figure in the sheet allowed a colour, red when negative.

Underneath it, in an inset, sat the lifecycle moves available once a partner held
the order: *Move to Accounting Sync Ready*, and then *Mark accounting synced* /
*Mark partially synced*.

### The footer

Step 2's primary was **Accept quote** — disabled once the shown partner already
held the order, rather than absent, so the footer never read as a step that
forgot its button. Step 1 had **Save Changes**.

### Push to dispatch

V1 carried a *Push to dispatch* button in the row of three acts at the foot of
the form (dispatch, duplicate, download). V2 dropped it because the footer's CTA
ladder already ends on that act and a button appearing twice on one screen makes
the reader wonder which is the real one.

---

## What V2 does instead

| V1 | V2 |
| --- | --- |
| Two steps | One page, always `xxwide` |
| Stage bar navigates between steps | Stage bar is display-only |
| Final Calculations rail on step 2 | Summary card in the persistent right rail, with the working on hover |
| Lifecycle moves inside Final Calculations | Pending-steps panel in the rail |
| Save Changes / Accept quote in the footer | Autosaves; footer carries the single next act |
| Pricing tables on their own step | Pricing tables at the foot of the left column, after the form |
| Push to dispatch in the acts row | Only in the footer's next-act ladder |

The one thing V1 had that V2 deliberately does not is **Final Calculations**.
It was the summary of the two pricing tables on a screen that had no other
summary. In V2 the Summary card IS that, three inches to the right and visible
the whole time. Two of them would be one figure in two places, and the first to
drift would be the one nobody was looking at.
