# Bulk rule: where a change applies (dev handoff, 2026-11-20)

**Scope:** one combination, Match = All (AND), no OR.

## The rule

Read top to bottom; the first row that fits decides where the change goes.

| If the combination has… | The change applies at | Example |
|---|---|---|
| **Ship-to** | **Ship-to configuration** of those ship-tos | Customer + Ship-to → those ship-tos |
| **Product** (or Product category), no Ship-to | **Ship-to configuration**, at each ship-to that carries the product. Customer configuration has no products. | Customer + Product → that customer's ship-tos that carry the product |
| **Customer**, no Ship-to, no Product | **Customer configuration** | Customer only, or Customer + Market → that customer's configuration |
| **None of the three** | **To confirm** (questions 1 and 2 below) | Region only; Region + Market |

Other conditions (Region, Market, Rate type, Pricing source, LOS, Business
line, Applied pricing, Configuration) only **narrow** the set; they don't
change the level. *Customer + Region* stays at customer, and *Region +
Product* goes to ship-to.

## Questions to confirm

**1. A single condition with no Customer, Ship-to or Product: where does it go?**

| Condition alone | Assumed | Confirm |
|---|---|---|
| Region | Customer configuration of every customer in the region | ? |
| Market | Customer configuration of every customer in the market | ? |
| Rate type | Customer configuration of every customer on that rate type | ? |
| Pricing source | Customer configuration of every first-party / 3PL customer | ? |
| LOS | Customer configuration of every customer with that LOS | ? |
| Business line | Customer configuration, if it is a customer setting; ship-to (like Product) if it comes from the product | ? |
| Applied pricing | It describes how a **ship-to** is priced, so *Ship-to* or *Hub* points at ship-tos, not customers | ? |
| Configuration (Configured / Unconfigured) | Customer configuration that is set up / not set up yet. Should *Unconfigured* create it? | ? |

**2. Several conditions together, still no Customer, Ship-to or Product: where do they go?**

Assumed: the same place as each one alone. They only narrow which
customers match.

| Example | Assumed | Confirm |
|---|---|---|
| Region + Market | Customer configuration of customers in that region **and** market | ? |
| Region + Rate type | Customer configuration of customers in the region on that rate type | ? |
| Market + LOS | Customer configuration of customers in the market with that LOS | ? |
| Region + Pricing source | Customer configuration of first-party / 3PL customers in the region | ? |
| Region + Configuration (Unconfigured) | Customers in the region with no customer configuration yet. Create it? | ? |
| Region + Business line | Follows the answer for Business line in 1: customer, or ship-to if it comes from the product | ? |
| Region + Applied pricing (Ship-to / Hub) | Follows the answer for Applied pricing in 1: likely the ship-tos in the region that price on their own / from a hub | ? |

**3. Applied pricing tag: decided, it changes.** When a bulk change writes
to a ship-to that inherits from the customer (Ship-to or Product in the
conditions), its Applied pricing changes from **Customer to Ship-to**. A
later change to the customer no longer reaches it. (PRD §6, 2026-11-16: bulk
is an *assignment*.) A change at customer configuration creates no overrides.

To make that visible (the PM's question):
- **Before the run, in the Impact card:** "62 of 184 ship-tos inherit from
  the customer. This rule gives them their own pricing." Hub-priced ship-tos
  get their own line. Each count opens the list of those ship-tos.
- **Review rerun / confirm:** the same line, before the button.
- **After the run:** the records list can be filtered on *Applied pricing:
  Customer → Ship-to*.
- **To leave inherited ship-tos alone:** add the condition *Applied pricing =
  Ship-to*.
- **Undo:** "Reset to customer pricing" on a ship-to (still open in the PRD).

Still to confirm: are inherited ship-tos **included by default and warned
about** (proposed), or **skipped by default**?

**4. Own-priced and hub ship-tos:** a change at customer configuration doesn't
reach them. Intended? And does a ship-to write take a hub ship-to off its hub?

**5. Base price at customer level:** customer configuration has no base
price. With no Ship-to or Product, should a base price change go down to every
product at the customers' ship-tos, or not be allowed?

## In the prototype (2026-11-20)

Built as above, with "None of the three" going to **customer configuration**
for now (Yash). A customer-level change reaches the inherited ship-tos; ship-tos
with their own or hub pricing are skipped. A ship-to-level change switches
inherited and hub ship-tos to Ship-to, and the Impact card warns before the
run: "Inherit from the customer · N of M ship-tos", "Priced from a hub · N of M".
