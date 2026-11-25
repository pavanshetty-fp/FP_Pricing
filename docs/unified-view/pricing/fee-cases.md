# Fee flow — cases built, Add fee options, open questions

Branch `fee-rule-engine`, as built on 2026-11-25. Spec: `fee-rule-engine.md`.
Each case reads **Given / do → expect**. Use them to test the prototype and to
brief dev.

**Where things are**

- **Pricing setup › Fee:** the fee list and the fee sheet.
- **Ship-to configuration:** the Fee cell, which opens the fee side sheet.
- **Customer configuration:** the customer Fee cell.
- **Edit pricing (ship-to) / Customer pricing:** the Fee block.
- **Order well** (below Dashboard) and **Order trace:** Order details.
- **Hub-based pricing.**

---

## 1. The model in one line

Two layers:

- **Configuration** (Pricing setup › Fee) decides a fee's value, **scope** (who it reaches) and **application** (when and how it's charged).
- **Application** (customer / ship-to pricing) can only **Remove** a fee or **Put it back**.

Changes reach new and undelivered orders. Delivered orders keep what they had.

---

## 2. Fee list (Pricing setup › Fee)

| # | Case | Expect |
|---|---|---|
| L1 | Open Pricing setup › Fee | 18 seeded fees from the use-case sheet. Columns: Name · Application · Rate · Charge per · Scope · Ship-tos reached · Status |
| L2 | Read the Application column | Always applied, Review and apply or By rule |
| L3 | A fee with vendor rates (Customer delivery fee) | Rate reads "$X · N vendor rates" |
| L4 | Read the Scope column | Plain text, e.g. "All customers", or the customers / hubs / ship-tos picked |
| L5 | Read the Ship-tos reached column | Count of ship-tos the fee reaches today, after scope and removals |
| L6 | ⋯ › Edit | Opens the fee sheet |
| L7 | ⋯ › Duplicate | New fee with the same setup, opened for editing |
| L8 | ⋯ › Deactivate / Activate | Status flips. An inactive fee reaches no price and no order |
| L9 | Add fee | Opens an empty fee sheet. Simulator shows "Configure the fee to see its value" |

## 3. Fee sheet — details and application

| # | Case | Expect |
|---|---|---|
| F1 | Fill Name, Code, ERP ID, Description, Applicable type (Delivery / Extraction) | Saves as you type (no Save / Cancel). History logs the change |
| F2 | Application: pick **Always applied** | Charged on every order the scope reaches |
| F3 | Application: pick **Review and apply** | Offered on the order; a person applies it |
| F4 | Application: pick **By rule** | Rule condition table appears; charged only when the rule matches |
| F5 | Order of the options | Always applied · Review and apply · By rule (radio, no review switch) |
| F6 | Switch from By rule to Always | Rule section hides; the rule is kept if you switch back |

## 4. Fee sheet — rule (By rule)

| # | Case | Expect |
|---|---|---|
| R1 | Match: All / Any | All = every row must hold; Any = one row is enough |
| R2 | Time zone: Ship-to (default) / Tenant | Times are read in that zone |
| R3 | **Delivery day & time**: days + window, inside / outside (After-hours: outside 07:00–17:00) | Matches by delivery time |
| R4 | **Weekly period**: from day+time to day+time, may cross days (Weekend: Fri 17:00 – Mon 00:00) | One combined day+time picker per end |
| R5 | **Delivery date**: holidays, specific dates, yearly season (Winter peak: Dec 1 – Feb 28) | Matches by delivery date |
| R6 | **Lead time**: delivered within X h of creation / same day (Rush) | Matches from created → delivered |
| R7 | **Delivered quantity**: below / between (Small-delivery) | Decided **only on delivered gallons**, never planned |
| R8 | **Order type / Asset type / Number of assets** (Per-asset fueling, Pump-out) | Matches order details |
| R9 | Add / remove condition rows | Hanging Add; row remove; the new row's first field takes focus |
| R10 | Rule incomplete (a row with no condition) | Simulator shows the empty state until the rule is complete |

## 5. Fee sheet — scope

| # | Case | Expect |
|---|---|---|
| S1 | Default | All customers · All hubs · All ship-tos · All products |
| S2 | "All" means future ones too | A customer / hub / ship-to added later gets the fee |
| S3 | Customer scope row: Include / Exclude · Customer · Hubs · Ship-tos | Each list narrows to the pick on its left (ship-to belongs to one customer; hub can be shared by customers) |
| S4 | Product scope row: Include / Exclude · category / product | Narrows by product |
| S5 | Include and Exclude both reach the same price | **Exclude wins** |
| S6 | Change scope | Ship-tos reached updates; Reach card in the rail updates; new / undelivered orders follow |
| S7 | Applicable type | Delivery fees don't reach Extraction orders and the other way round |

## 6. Fee sheet — amount

| # | Case | Expect |
|---|---|---|
| A1 | Flat amount, charge per gallon / order / asset / hour / mile | Rate × the order's figure |
| A2 | Range amount by quantity / distance / time, with bands | The band the delivered figure falls in sets the rate |
| A3 | Type decimals (0.05) in a rate field | Keeps the "." while typing |
| A4 | **Vendor-specific rates** switch on | Vendor table appears: vendor + rate; vendors not listed use the default rate |
| A5 | Order from a vendor with its own rate | That vendor's rate is used (flat $ only today) |

## 7. Fee sheet — right column

| # | Case | Expect |
|---|---|---|
| C1 | Reach card | Application · Customers · Ship-tos (no prices row) |
| C1b | Any ship-to count ("N of M ship-tos") | Opens the list: Ship-to · Customer · Hub, search, Customer and Hub filters with chips; scrolls |
| C2 | **Simulator**, fee not configured | "Configure the fee to see its value" |
| C3 | Simulator, configured | Prefilled sample order. Shows the fee amount large, a status line, the order line with a pencil, then Product price / fee / Total |
| C4 | Simulator status lines | Charged on this order · Offered for review on the order · Worked out once delivered · Doesn't apply to this order |
| C5 | Simulator, a rule row doesn't hold | Listed under the order as text with "Not met", or "At delivery" when it can't be known yet |
| C6 | Pencil | Opens only the inputs this fee needs (e.g. delivered time for Weekend, gallons for Small-delivery). Calculate returns to the result |
| C7 | History | Every edit to the fee, with who and when |
| C8 | Edit fee from a pricing page | Opens in a **new tab**, full page, no slide. The new tab shares the same data |

## 8. Ship-to configuration — Fee cell and side sheet

| # | Case | Expect |
|---|---|---|
| P1 | Fee cell | Charged $/gal total; second line gives group counts ("6 applied · 3 to review · 6 by rule · 1 removed", empty groups left out; demo). Review and By rule fees are not in the total |
| P2 | Effective price | Includes the charged fees' $/gal |
| P3 | Hub column | Shows the ship-to's hub |
| P4 | Click the Fee cell | Side sheet: ship-to · product, with the Applied pricing tag |
| P5 | Groups | Always applied · Review and apply · By rule · Removed. Two versions on a switch: **Tabs** or **Filter** (segment control). Persisted per browser |
| P6 | Table columns | Fee · Rate · Reaches through (the scope combination that reached this price, e.g. "Customer: Acme · Hub: Creole") |
| P7 | ⋯ › Remove | Confirm: "Remove {fee} from {ship-to}?" + "{fee} won't be charged on {product} orders at {ship-to}. Orders not yet delivered lose the fee; delivered orders keep it. You can put it back any time." Buttons: Keep fee · Remove fee |
| P8 | After Remove | Fee moves to Removed; Fee cell total drops; undelivered orders drop it |
| P9 | ⋯ › Put back | Back in its group; charged again on new / undelivered orders |
| P10 | ⋯ › Edit fee | Opens the fee in a new tab |

## 9. Customer configuration and Customer pricing

| # | Case | Expect |
|---|---|---|
| U1 | Customer Fee cell | Fees reaching any of the customer's prices |
| U2 | Reaches column | "N of M ship-tos" (opens the list: Ship-to · Customer · Hub) + the scope line |
| U3 | Remove on the customer | Reaches every price that follows the customer (tag Customer or Hub). Copy: "…Ship-tos with their own pricing still pay it." |
| U4 | Ship-to on its own pricing (tag Ship-to) | Keeps a **snapshot** of the customer's removals from when it was overridden; later customer removals don't reach it |
| U5 | Reset pricing on that ship-to | Drops the ship-to's own removals; follows the customer again |
| U6 | Put back on the customer | Comes back on every price following the customer |

## 10. Edit pricing — Fee block

| # | Case | Expect |
|---|---|---|
| E1 | Section order | Margin (+ Margins by hub) → Tax → Fee → Adders |
| E2 | Margin source | Renamed from "Margin and fee source"; fees no longer have a source choice |
| E3 | Margins by hub | Margin column only, right under the source |
| E4 | Fee block | Same groups and acts as the side sheet, in place |
| E5 | Rail | Always shows Tax and Fee |

## 11. Orders

| # | Case | Expect |
|---|---|---|
| O1 | Order well | 12 Scheduled · 12 Delivered · 12 Invoiced. Segments: All / Scheduled / Delivered / Invoiced. Filters: customer, product, fees to review, order type |
| O2 | Open an order | Order details: Ticket, Delivery, Shipment, Assets, Billing details, History |
| O3 | Status select in the header | Scheduled / Delivered / Invoiced; fees re-run when it changes |
| O4 | Always applied fee | On the order as a charge |
| O5 | Review and apply fee | Under Applicable items; **Review & apply fees** opens a dialog with checkboxes; applied ones move into charges |
| O6 | By rule, **before delivery** | Shows if it matches the **planned** facts (planned date / time); amount is worked out once delivered |
| O7 | By rule, **at delivery** | Re-runs on actuals: a fee that no longer matches drops, one that now matches is added |
| O8 | Quantity rule | Decided only on delivered gallons |
| O9 | Fee removed on the price | Undelivered orders drop it; delivered / invoiced keep it |
| O10 | Totals | Estimated total before delivery; Grand total after |
| O11 | Order trace › Order details | Same Order details sheet (level 2); Planned, Gallons ordered, Order type rows |

## 12. Hub-based pricing

| # | Case | Expect |
|---|---|---|
| H1 | List | Hub · Ship-tos (count, opens the list) · Rate type · Market · Product scope · Status; banner for unconfigured hubs |
| H2 | Hub sheet | Rate type, Market, Product scope table; saves as you edit; **Configure pricing** in the footer when unconfigured |
| H3 | Hub as fee scope | A hub can be picked in a fee's scope; that's its only role in fees |

## 13. Built but not finished (known gaps)

- **Activity feed:** still reads the old fee field, not the new removals and edits.
- **Hub pricing edits:** don't change the prices of ship-tos tagged Hub yet.
- **Conflicts:** "the bigger fee wins" is agreed, not built.
- **Vendor rates:** flat $ only, no range or %.
- **Fee groups:** both Tabs and Filter versions are still in; one has to go.

---

## 14. Adding a fee from a customer or ship-to (decided 2026-11-25: stays on the fee's scope)

**Decision (Yash, 2026-11-25):** adding stays on the fee's configuration. To give a customer or ship-to a fee, widen the fee's scope. The options below are kept for the record.

**Problem.** Pricing pages can only remove a fee. A user on a ship-to who wants
a fee that doesn't reach it has to leave, find the fee and widen its scope.
Customers will ask to add it where they are.

### Options

**A. Add widens the fee's scope.** Picking a fee on a ship-to adds an Include
row for that ship-to to the fee's scope.

| Pros | Cons |
|---|---|
| Scope stays the only source of truth | Can't say "this ship-to, propane only". Customer and product scope are separate tables, so the ship-to gets every product the fee covers |
| Nothing new to learn on the fee page | Exclude wins, so if the customer is excluded the Include does nothing unless we change that rule |
| | Scopes fill with one-off rows nobody remembers adding |
| | A pricing-page user edits a fee that may reach thousands of prices |

**B. "Added here", the mirror of Remove** (recommended). Store "also here" on
the price or customer, the way Remove stores "not here". The fee's scope is
untouched.

| Pros | Cons |
|---|---|
| Symmetric: Remove / Put back already exists, Add / Undo add fits the same idea | Two places decide reach: scope + additions / removals |
| Works per ship-to × product | Additions are invisible on the fee unless we show them |
| Gets past an exclusion without changing the rule | One more state to explain in History and Activity |
| Bulk (phase 2) can write the same additions | |

**C. Add sends you to the fee with the scope pre-filled.**

| Pros | Cons |
|---|---|
| One source of truth; you see the whole fee before saving | It's the "go over there" we want to avoid |
| No new state | Same per-product and exclusion problems as A |

**D. Ask each time: "Just here" (B) or "Everywhere for this customer / ship-to" (A).**

| Pros | Cons |
|---|---|
| Flexible | A decision most users can't make well, every time |
| | Carries the cons of both A and B |

### Recommendation: B, with two guard rails

1. **Show additions on the fee.** Reach card: "742 prices · 3 added on pricing
   pages", with the list one click away. A "Move into scope" act can come later.
2. **An added fee keeps its own application.** An added By rule fee charges
   only when its rule matches. An added Review and apply fee is still offered
   for review. Add changes *where*, never *how*.

### How B would work

- **Add fee** on the ship-to fee sheet and the Edit pricing Fee block opens a
  searchable picker. It lists active fees not reaching this price, with rate
  and application. Removed fees aren't listed; they have Put back.
- Confirm: "Add Hazmat fee to Propane HD-5 at Creole Batch Plant? It's charged
  on orders here from now on; the fee's scope doesn't change. You can undo it
  any time."
- The fee shows in its normal group with an **Added here** tag. ⋯ offers
  Undo add · Edit fee.
- **On a customer:** reaches every price following the customer. Ship-tos on
  their own pricing keep their own setup (same as Remove).
- Logged in the fee's History, the price's History and, later, the Activity
  feed.

### Edge cases

| Case | Proposed behaviour |
|---|---|
| Added on the customer, removed on one of its ship-tos | Ship-to wins (more specific) |
| Fee's scope later widens to cover an added price | The addition is redundant: drop it automatically or flag it on the fee |
| Fee deactivated | Stops everywhere, additions included |
| Ship-to overridden after a customer addition | Keeps a snapshot, as with removals |
| Reset pricing on a ship-to | Drops its own additions too |
| Undelivered orders when a fee is added | Pick it up; delivered orders don't |
| Product not in the fee's product scope | Allowed. The addition is per price, so product scope doesn't block it |

This reverses the earlier decision "no hand-adding outside scope". It needs
agreement before it's built.

---

## 15. Questions to clarify

**Add fee (§14)**

1. ~~Go with B ("Added here")?~~ Decided: adding stays on the fee's scope.
2. Who can add a fee outside its scope? It affects billing, so should it be
   limited to some roles or need approval?
3. When the scope later covers an added price, drop the addition silently or
   flag it on the fee?
4. Should an addition get past an Exclude row in the scope?
5. Do we need "Move into scope" on the fee in v1, or later?

**Application and rules**

6. Bring back **By rule + review** (e.g. Rush offered only when it matches)?
   Today it's three options with no review switch.
7. Conflicts: "bigger fee wins". Between which fees? Same code, same
   category, or any two fees doing the same job (Weekend vs Holiday)?
8. A rule fee that matched before delivery but not at delivery is dropped.
   Should the order show that it was dropped, and why?

**Amounts**

9. Vendor rates for range and % fees, or flat $ only?
10. What does "%" of total include: product only, or product + other fees?

**Hub**

11. Should Hub pricing edits change the prices of ship-tos tagged Hub, and be
    logged in Activity?
12. Can a fee be removed at hub level, or only customer / ship-to? (Today
    only customer / ship-to.)

**Screens**

13. Fee groups: keep **Tabs** or **Filter**?
14. Fee cell: show the group counts (e.g. "2 applied · 1 to review") instead of "N fees"?
15. "New customers, hubs and ship-tos get this fee": show as a visible line or
    an ⓘ (UX-96)? This one is for Pavan.

**Orders**

16. Can a person remove an Always applied fee on a single order, or only on
    the price?
17. Invoiced orders: frozen for every fee change, including Put back?
