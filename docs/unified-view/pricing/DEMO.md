# Pricing › Change log — demo script

**Link:** https://fp-mockups.vercel.app/change-history (gallery password) · **Length:** 15–20 min
**Audience:** PM, pricing leads, Pavan (design) · **Build:** v3, on the FPDS Unified View

Sample data runs relative to today, so dates move. Change and order numbers (CH-…, ORD-…) can shift
when the sample data changes, so pick live examples on the day using the cues below.

---

## 0. Before you start (2 min before)

- Open the link and sign in. It lands on **Pricing › Change log › Activity feed**.
- Use light mode, at 1280px wide or more.
- **Open records as full pages:** on Activity feed press the **Settings gear** → **Information page view** →
  **Full page**. Your browser remembers it, and every change and order trace then opens full page.
  (FPDS's default is a side sheet; the choice is per browser, IX-92.)
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
| Hover a row and its **⋯** appears at the end. Open it on a scheduled change: **Edit schedule · Cancel schedule · Export**. On a partly failed one: **Retry failed prices**. On the latest change: **Undo change**. | "Everything you can do to a change, without opening it." Edit schedule opens straight from the row. | Row actions at the row's end (UX-46), shown on hover and on keyboard focus (IX-3) |

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

> The same acts are in two places: the row's ⋯ and the change's own ⋯ and footer. They ask the same
> questions ("Undo CH-…?", "Cancel CH-…?") either way.

---

## 3. Customer & ship-to: "what changed for this customer?" (5 min)

**What it is:** a dashboard scoped by customer and ship-to. It answers "why is this account's price
what it is?", for example when a customer calls.

| Show | Say | Why |
|---|---|---|
| Top right: **Customer** and **Ship-to** pickers (search, several at a time) and the date window | "Pick the scope once; everything below follows." Ship-tos follow the customers picked. Nothing else on the page changes them. | *Date beside the title is outside FPDS; flagged for Pavan.* |
| Pick 2 customers in the Customer picker | The picker reads "2 customers"; every card follows | |
| **Stat tiles:** Changes (assignment · inherited) · Ship-tos changed · Changed by · Last change | Each one jumps to its section and blinks it once | Dashboard rule: every number opens what it counts |
| **Assignment vs inherited** | "Assignment = changed on the ship-to itself (inline, bulk, import). Inherited = a shared entity or the customer's pricing changed." | PRD §6 |
| **Insights**: the switch on the card, **Compact · Descriptive · Grouped** | Show all three and ask the PMs which to keep. Compact: three figures, **View all 10** opens a side sheet. Descriptive: a sentence per insight, **View all 10** grows the card. Grouped: all ten in Needs a look · Activity · Patterns. | Read-only in every version; the switch is for this review only |
| **Where changes happened**: press a customer (the chevron says it opens) → its ship-tos → one ship-to's fees, taxes, margins | "It drills inside the card. The pickers at the top don't move." Walk back with the breadcrumb or ‹ | In-card drill (team feedback, 2026-11-17) |
| **Who made the changes**: press a person → the customers they changed → that customer's ship-tos | Same in-card drill and breadcrumb | |
| **Timeline**: days down the page; each change with its time, what changed, **how it was made** (Manual, Bulk, Pricing setup, Import), who, and **N ship-tos** | Press "N ship-tos" to list them by customer, with a search. "Show more" adds the next 20, so the run of changes stays in order. | What happened and when; no row opens |

---

## 4. Order price trace: "why did this order cost this?" (5 min)

**What it is:** every delivered and invoiced order, and how its price was built. It's for disputes.

| Show | Say | Why |
|---|---|---|
| The list: search, Filters (Customer · Ship-to · Product first), Group by, delivery dates | "Find any customer's orders at any ship-to." | List page, same as Activity feed |
| Banner "N orders priced with a change made after the order was placed" → View details | The orders worth checking | |
| Open one with **"1 change after order"** | | |
| Header: status plus a caution pill "1 change after order" (only when it happened) | Press it: those rows open and blink | A flag, not a figure (zero on most orders) |
| **Figures**, read only: Total · Base price · Margin · Fees & taxes (with % of price) | "The price taken apart." | |
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
| Why does the date sit by the title on Customer & ship-to? | Our ask. FPDS puts it on the scope row; raised with Pavan. |
| Can I press an insight to see those changes? | Not now. Insights are read-only; use the Timeline's search and Filters. |
| Why can't I open a change from the Timeline? | It shows what happened and when. Activity feed opens any change. |
| What counts as "Outside the UI"? | Changes that came in by import or system sync. Bulk edits made on the Ship-to pricing screen are in the UI. |

## Open for the PM (from PRD §6)

1. Which orders the trace covers: delivered and invoiced only, or open orders too ("will price as")?
2. Pricing moment: at delivery, or at order time for some tenants?
3. When the trace takes on the Insights actions (phase 2).
4. Freight's four pages in the menu (the sidebar nests two levels).

## Not in this build

Bulk edit / Review changes (Edit schedule moves day and time only), Delivered price impact (prototype
Phase 2), the Pricing dashboard and the other Pricing pages ("Not built yet").
