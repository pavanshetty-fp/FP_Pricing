# Pricing › Change log — demo script

**Link:** https://fp-mockups.vercel.app/change-history (gallery password) · **Length:** 15–20 min
**Audience:** PM, pricing leads, Pavan (design) · **Build:** v3, on the FPDS Unified View

Sample data runs relative to today, so dates move. Change and order numbers (CH-…, ORD-…) can shift
when the sample data changes, so pick live examples on the day using the cues below.

---

## 0. Before you start (2 min before)

- Open the link and sign in. It lands on **Pricing › Change log › Activity feed**.
- Use light mode, at 1280px wide or more.
- Close any sheet that's open. Leave the sidebar expanded.

## 1. The problem (1 min, no clicking)

> "Pricing changes all day: margins, fees, rate types and markets, made inline, in bulk, in Pricing setup
> or by import. Today nobody can answer three questions quickly:
> **What changed?** · **What changed for this customer?** · **Why did this order cost what it did?**
> Change log answers each one on its own page."

Point at the menu: **Change log** has three pages, one per question.

---

## 2. Activity feed: "what changed?" (5 min)

**What it is:** every pricing change, newest first, built as the standard FPDS list (the same as
Sales › Orders and 3PL Delivery Orders).

| Show | Say | Why it's built this way |
|---|---|---|
| The **banner** on top ("N prices failed to update"), with ‹ 1 of 3 › | "What needs you comes first: failed prices, scheduled changes that hit the same prices, and today's schedule." | FPDS alert banner: one place for attention, filters the list on press |
| Press **View details** | The list narrows to the partly failed change, and the button becomes *Clear filter* | The banner applies a real filter, shown as a chip |
| The **Change** column: "Fleet Contract Margin **+3** → $0.21/gal", then hover the **+3** | "Names, not counts. Hover lists the rest." | Same "+N" chip as Service Work orders |
| **Ship-tos affected** ("42 ship-tos · 120 prices · Gulf Coast Fleet") | "A *price* is one ship-to × one product. A bulk change moves many." | Explain this once; people will ask |
| **Filters** | Customer, Ship-to and Product come first, then Action, Entity, Made via, Status, Made by | Same filter order on every Pricing page |
| **Group by** → Customer, then the date window ‹ › | Grouping and a date range, like every list | List template; this is not the table-only standard list |
| Settings gear, column search on header hover, Export | "Same tools as every list in the product." | FPDS IX-93 / IX-94 |

**Open a change (row press).** Pick a **partly failed** change: the red pill, or the one the banner points to.

| Show | Say |
|---|---|
| Header: what moved, the status, Action, and "CH-… · Made via · who · when" | The change in one line |
| **Figures:** Customers · Ship-tos · Products · Prices changed · Orders | Press **Customers** to see the list with ship-tos per customer. "Prices changed" has failed count and average move. "Orders" shows repriced vs kept. |
| It opens on **Prices changed**, filtered to *Outcome: Failed*, with the reason under each | "It opens on what you came for." |
| Filters inside the sheet: Customer, Ship-to and Product first | Narrow within the change |
| Footer **Retry failed prices** → toast, the status flips to Applied | The next act is the primary button. A read-only change has no footer. |
| **⋯**: Undo (latest change only), Cancel schedule (scheduled), Export | Acts on the change live in ⋯ |
| Open a **scheduled** change → **Edit schedule** (DS date + time select) | Move a schedule without leaving the log |

> If asked "why no row menu in the list?": FPDS lists open the record on row press. Actions live
> on the record, not in a ··· per row.

---

## 3. Customer & ship-to: "what changed for this customer?" (5 min)

**What it is:** a dashboard scoped by customer and ship-to. It answers "why is this account's price
what it is?", for example when a customer calls.

| Show | Say | Why |
|---|---|---|
| Top right: **Filters** (Customer, Ship-to) and the date window, level with the title | "Pick the scope once; everything below follows." Ship-tos follow the customers picked. | Activity feed's Filters and chip shelf. *Date beside the title is outside FPDS; flagged for Pavan.* |
| Pick 2 customers → chip "Customer 2 ×" | Scope shows as a chip | |
| **Stat tiles:** Changes (assignment · inherited) · Ship-tos changed · Changed by · Last change | Each one jumps to its section and blinks it once | Dashboard rule: every number opens what it counts |
| **Assignment vs inherited** | "Assignment = changed on the ship-to itself (inline, bulk, import). Inherited = a shared entity or the customer's pricing changed." | PRD §6 |
| **Insights** card: Edited 3+ times · Fees removed · Outside pricing screens | Press one: the Timeline scrolls in already filtered | Highlight card (Quotation/Order summary shell) |
| **Where changes happened** (customers → ship-tos → entities), top 5 + **View N others** | Press a customer to drill in | Percentages are shares of the whole |
| **Who made the changes**, top 5 + View others | Press a person: Timeline filtered to them | |
| **Timeline** (search and Filters on the card's right) → press a row | Opens the same change sheet as Activity feed | One timeline on the page; no duplicate sheet |
| **Then vs now** | Each ship-to × product: price at the start of the period vs now, and what moved it | From the prototype; configured price, not daily rack moves |

---

## 4. Order price trace: "why did this order cost this?" (5 min)

**What it is:** every delivered and invoiced order, and how its price was built. It's for disputes.

| Show | Say | Why |
|---|---|---|
| The list: search, Filters (Customer · Ship-to · Product first), Group by, delivery dates | "Find any customer's orders at any ship-to." | List page, same as Activity feed |
| Banner "N orders priced with a change made after the order was placed" → View details | The orders worth checking | |
| Open one with **"1 change after order"** | | |
| Header: status plus a caution pill "1 change after order" (only when it happened) | Press it: those rows open and blink | A flag, not a figure (zero on most orders) |
| **Figures:** Total · Base price · Margin · Fees & taxes (with % of price) | "The price taken apart." Each opens its rows. | |
| **Table:** one row per component, the name over "how it was calculated", $/gal, amount | Total row "Matches INV-…" | |
| Expand a component's **history** (chevron) | Each change tagged **Before order** / **After order placed · applied** / **After delivery · not applied** | The heart of a dispute |
| Press a history row | The change opens over the trace | |
| Right column: **Associated records** · Record · Pricing | Customer and account, ship-to and city, product and code; ordered, delivered, invoiced | Record-sheet rail pattern |

---

## 5. Close (1 min)

> "Three questions, three pages, one log underneath. An undo or retry in Activity feed shows up in
> Customer & ship-to and in the order traces straight away."

Then ask for the **PM decisions** below.

---

## Questions you'll likely get

| Question | Answer |
|---|---|
| What's a "price"? Why 31 prices but 34 orders? | One ship-to × one product. A change moves prices; orders are the open orders on those prices. A ship-to can have several orders, so the counts differ. |
| Why does a change sometimes show one customer? | An inline edit on one ship-to, or a change to one customer's own pricing, can only touch that account. Bulk and Pricing-setup changes span many. |
| Assignment vs inherited? | Ship-to's own pricing (inline, bulk, import) vs shared entities and customer pricing (Pricing setup, Customer pricing). |
| When is an order priced? | Assumed at delivery. **To confirm with the PM.** |
| Open orders in the trace? | Not yet: delivered and invoiced only. **To ask the PM.** |
| Can I fix pricing from the trace? | Not in this phase; trace only. Order Pricing Insights' actions (fix missing fees, configure products) are a later phase. |
| Then vs now, rack moves? | Configured price only (base + margin + fees + taxes). Daily rack moves aren't in the log. |
| Why does the date sit by the title on Customer & ship-to? | Our ask. FPDS puts it on the scope row; raised with Pavan. |

## Open for the PM (from PRD §6)

1. Which orders the trace covers: delivered and invoiced only, or open orders too ("will price as")?
2. Pricing moment: at delivery, or at order time for some tenants?
3. When the trace takes on the Insights actions (phase 2).
4. Freight's four pages in the menu (the sidebar nests two levels).

## Not in this build

Bulk edit / Review changes (Edit schedule moves day and time only), Delivered price impact (prototype
Phase 2), the Pricing dashboard and the other Pricing pages ("Not built yet").
