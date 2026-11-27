# Fees in bulk — Customer / Ship-to pages and Bulk rules (discussion)

Phase 2 of the fee rule engine. Nothing here is built. Written 2026-11-25 to
plan the work. Cases built so far: `fee-cases.md`.

---

## 1. Where we start

**The fee model (agreed)**

- **The fee's scope decides who gets it.** Scope is set on the fee in Pricing setup › Fee, and covers customers / hubs / ship-tos and products.
- **Adding a fee** to a customer or ship-to is done by widening that scope (decided 2026-11-25).
- **Pricing pages can only Remove or Put back.**
  - A removal on a customer reaches every price following that customer.
  - A removal on a ship-to reaches that ship-to only, and **doesn't change its Applied pricing**.

**What exists today that collides with it**

- **Bulk rules** can still change **Fees: Add / Replace with / Remove** on configurations. They write the fee into the customer or ship-to's own fee list, which is the old model. A bulk "Add fee" today does what we just decided only scope should do.
- **Bulk rules land by hierarchy.** A combination with a ship-to or product writes to the ship-to, and turns an inherited ship-to into one with its own pricing. Any other combination writes to the customer, and skips ship-tos with their own or hub pricing. That's right for margins and taxes. For fees it would override pricing just to remove one fee.
- **The Customer and Ship-to lists have no multi-select or bulk bar.** A row only opens its pricing sheet.

So there are two bulk places to decide for fees:

| | Bulk bar (Customer / Ship-to lists) | Bulk rule (Pricing configuration › Bulk rules) |
|---|---|---|
| Who | Rows you tick | Records matching conditions (Region, Market, Customer, Ship-to, Product…) |
| When | Now | Now or scheduled; can run again |
| Kept | History on each record | A rule with runs, records updated, rerun / retry |
| Good for | "These 12 ship-tos shouldn't pay the Hazmat fee" | "Every Louisiana customer: remove Winter peak from Dec 1" |

---

## 2. What each fee action means in bulk

| Action | Fits the model? | Where it writes | Proposal |
|---|---|---|---|
| **Remove fee** | ✅ Same as a single Remove, many at once | Removals: customer rows → customer; ship-to rows → that ship-to × product | Keep, in both places |
| **Put back fee** | ✅ | Clears those removals | Keep, in both places |
| **Add fee** | ⚠️ Only through scope | The fee's scope (Include rows) | Bulk bar: **Add to fee scope**. Bulk rule: see §4 |
| **Replace all fees with** | ❌ Rewrites many fees' scopes at once | — | Drop for fees |
| **Change a fee's rate** | ❌ The rate belongs to the fee | — | Not in bulk; edit the fee |

---

## 3. Bulk bar on the Customer and Ship-to lists

### 3.1 The flow

1. Tick rows (checkbox column, select all on the page / all matching).
2. The bulk bar shows the count and its acts. For fees: **Remove fee · Put back fee · Add to fee scope**.
3. Pick the fee(s), then a preview with counts, then confirm.
4. Each record's History logs it, and the fee's History logs one line ("Removed from 12 ship-tos").

### 3.2 Mixed selections

The selected rows won't all be in the same state for a fee. The preview says
what happens to each group before anything changes.

| Remove Hazmat fee from 40 selected | Count | What happens |
|---|---|---|
| Fee reaches them | 32 | Removed |
| Already removed | 3 | Nothing |
| Fee doesn't reach them (out of scope) | 5 | Nothing, listed with why |

**Add to fee scope**, on 40 selected ship-tos:

| Group | Count | What happens |
|---|---|---|
| Not in scope | 20 | Added to the fee's scope (an Include row each, or one row per customer) |
| Already reached | 15 | Nothing |
| Removed on the pricing page | 3 | **Put back** instead (scope already covers them) |
| Product outside the fee's products | 2 | Not added: the fee doesn't cover that product |

### 3.3 Options for "Add to fee scope"

**A. Write the rows into the fee's scope directly.**

| Pros | Cons |
|---|---|
| One step; scope stays the only source of truth | A list-page user edits a fee that may reach thousands of prices |
| Easy to undo from the fee's scope | Scope can fill with one-off rows |

**B. Open the fee in a new tab with the scope rows pre-filled, not saved.**

| Pros | Cons |
|---|---|
| The whole fee in view; a deliberate change | One more step; leaves the list |
| Works with fee permissions as they are | Fee sheets autosave, so "not saved yet" needs a pending state |

**Recommendation: A, with the preview above and an Undo on the toast.** Ship-to
rows add **ship-to** Include rows; customer rows add **customer** Include rows.
Products stay as the fee's product scope, so a ship-to × product selection
can't add one product only (the preview says so).

### 3.4 Customer list vs Ship-to list

| | Customer list | Ship-to list |
|---|---|---|
| Remove / Put back | On the customer, so every price following it | On that ship-to × product |
| Ship-tos on their own pricing | Keep their own setup (same as single Remove) | n/a |
| Add to fee scope | Customer Include row | Ship-to Include row |

---

## 4. Bulk rules and fees

The question: what is a fee change inside a bulk rule, now that scope is the
"who" for fees?

**Option 1 — Fees leave Bulk rules.** The fee's scope already is a
standing rule (live, reaches future records). Bulk rules keep rate type, base,
margin, tax, adders.

| Pros | Cons |
|---|---|
| One place for fees; no two engines deciding reach | No scheduled or condition-based removal ("from Dec 1, Louisiana doesn't pay X") |
| Simplest to explain | Teams used to doing fees in bulk rules lose it |

**Option 2 — Bulk rules do Remove / Put back only** (recommended). A rule's
fee change writes removals (or clears them) on the records it matches, as the
bulk bar does. Add / Replace go away for fees.

| Pros | Cons |
|---|---|
| Keeps scheduling, rerun, retry, records updated for fees | Removals are a snapshot: a customer that joins Louisiana later isn't removed until the rule runs again |
| Doesn't override pricing (unlike margins); no "Pricing overridden" for fees | Fee rows behave differently from other settings in the same rule |
| Same words as the pricing pages | |

**Option 3 — Bulk rules also add to scope.** "Add fee" writes Include rows into
the fee's scope for the matched records.

| Pros | Cons |
|---|---|
| Everything fees can do, in one rule | Region / Market aren't scope targets. The rule would expand them into customers (a snapshot), or scope gains Region and Market (live) |
| | Two places write scope; harder to see why a fee reaches someone |

### 4.1 How a fee change lands in a rule (Option 2)

| Combination | Fee removal written on |
|---|---|
| Customer / Region / Market / Rate type… (no ship-to, no product) | The customer, so every price following it |
| A ship-to, or a product | That ship-to × product. **Applied pricing doesn't change** |
| Customer-level, ship-to on its own pricing | Skipped: "Has its own ship-to pricing" (as today) |
| Fee doesn't reach the record | Skipped: "Fee doesn't reach this price" |
| Already removed | Unchanged |

Impact card and records updated read as today, with the fee as its own block
("Fees · Remove · Winter peak surcharge").

---

## 5. Proposed order of work

1. **Bulk bar on Ship-to and Customer lists:** select, bulk bar, Remove fee / Put back fee with the mixed-selection preview.
2. **Add to fee scope** from the bulk bar (§3.3 A).
3. **Bulk rules:** the fee change becomes Remove / Put back (Option 2). Add / Replace go. Skip reasons for fees. Seeds that "Add" fees change to Remove.
4. **Bulk bar for other settings** (margin, tax, adders, rate type): reuse the Bulk rule sheet pre-filled with the selection, or a light dialog (question 6).

---

## 6. Questions to clarify

1. Bulk rules and fees: Option 1 (out), 2 (Remove / Put back only) or 3 (also add to scope)?
2. Add to fee scope from the bulk bar: write directly with Undo (A), or open the fee pre-filled (B)?
3. Who may change a fee's scope from a list page: anyone who edits pricing, or only those who edit fees?
4. A ship-to × product selection where the fee covers other products too: add the ship-to anyway (it gets all the fee's products), or refuse?
5. Should Region and Market become **fee scope targets**, so "all Louisiana customers" stays live?
6. Bulk bar for margins / taxes / adders: open the Bulk rule sheet pre-filled (one engine, kept as a rule run) or a quick dialog (lighter, no rule)?
7. Should a bulk bar action be saved as a one-off rule in Bulk rules (for its records-updated list and retry), or only in History?
8. Select all: this page, or every row matching the filters (could be thousands)?
9. Customer-level bulk remove: should ship-tos on their own pricing be offered too ("also remove on 4 ship-tos with their own pricing")?
10. Existing rules that "Add" fees: convert to scope rows once, or leave them as they ran?
