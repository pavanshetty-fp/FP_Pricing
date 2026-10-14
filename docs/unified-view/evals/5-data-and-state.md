# Eval — is the screen telling the truth


> **METHOD TAGS.** Every assertion below carries one, because an assertion with
> no stated method is one each run measures differently and no two runs agree
> on. `npm run eval` executes the `[script]` ones and writes a results file;
> the rest are read by a person or an agent, against this file.
>
> `[script]` a check in `scripts/eval/` · `[grep]` a one-line search, written
> out · `[structural]` a search plus a look at the context · `[read]` an agent
> reads the file against the doc · `[browser]` the running app.

The other segment nobody lists. A screen can follow every layout rule and still
lie about the record behind it.

## Invariants

- [ ] **L2** Every module's fixture passes its own `assertConsistent`, and the
      console is clean at boot.
- [ ] **L2** Every rule a screen relies on is stated as an invariant, not
      assumed. If a lane means "nobody is assigned", that is a check, not a
      convention.
- [ ] **L2** A failing invariant is a decision: the seed is wrong, or the rule
      is. Neither is fixed silently.

## Derived vs stored

- [ ] **L2** Nothing derived from a status that a record can legitimately
      contradict. (A "sent" flag derived from "past the first stage" cannot
      describe three of five partners asked.)
- [ ] **L2** A snapshot stays a snapshot — a quote is what the lines WERE, never
      recomputed from what they are now.
- [ ] **L2** Every computed figure has one implementation. Two figures for one
      quantity is how a card comes to disagree with the record it stands for.

## Fixtures

- [ ] **L2** Every state the UI distinguishes exists in the fixture. A state
      nobody can reach is a state nobody has reviewed.
- [ ] **L2** Every lane holds something on most days, given the date scope.
- [ ] **L2** Invented data is flagged as invented, at the top of the fixture.
- [ ] **L2** Reused data is genuinely reused, not a second copy of the same
      records under another name.
- [ ] **L2** A seeded value drawn from a random stream is drawn unconditionally
      — a short-circuit shifts every value after it and reshuffles the fixture.

## Field reach (Pavan, 2026-10-14)

New data reaches every screen of its record — it should go without saying,
so it is counted.

- [ ] **L1** `[script]` `field-reach` — every field of a registered record
      type appears on every screen that CREATES, EDITS or LISTS that record
      (a sheet, an inline create table, a list), unless that screen skips the
      field **with a written reason** in `scripts/eval/field-reach.mjs`. The
      skip list is the decision record.
- [ ] **L2** `[read]` A field that only appears as a READ (e.g. used to filter
      options) passes the script but is not shown. When a field is added,
      open each registered screen and confirm it can be seen and, where the
      screen makes the record, set.
- [ ] **L2** `[read]` A new screen of a registered record, or a new record
      type, is added to the registry in the same change — an unregistered
      screen is not checked.

- [ ] **L1** `[script]` NESTED too — a record shown inside another's screen
      (a ship-to's Assets / Products breakdowns) carries the fields
      its registry entry lists in `only` (asset name, products, capacity).

Registered today: **Asset** (asset sheet · ship-to step 2 table · Assets
list · the Ship-tos list's two breakdowns) and **ShipTo** (ship-to sheet ·
Ship-tos list), Customer Portal.

## Consistency across modules

- [ ] **L2** The same kind of table has the same columns, order and widths in
      every module.
- [ ] **L2** The same kind of card leads with the same unit.
- [ ] **L2** A behaviour settled in one module and wanted in a second is
      promoted to the DS, not copied.

## The documents themselves

- [ ] **L2** Every rule in `../1-components.md`, `../2-layouts.md` and
      `../3-interactions.md` is true of the code today.
- [ ] **L2** Every binding in the code appears in the colour-mapping table.
- [ ] **L2** Nothing on screen is undocumented. **Walk one screen end to end
      and find the thing no document mentions** — that is the check this file
      exists for.

## From Unified View — added 2026-09-22

- [ ] **L2** `[read]` A charge is the ORDER's and only the figures are each
      side's — `LineCharge.perGal` and `QuoteLine.rates[charge.id]`, keyed by
      the same id. Adding a row adds it to both columns.
- [ ] **L2** `[read]` A price that does not exist renders the dash, never
      `0.00`. Zero is what a field shows before anyone types.
- [ ] **L2** `[browser]` The console is clean at boot. **Today it is not** —
      15 seed orders break the Assigned invariant and `Propane HD-5` is
      orderable but missing from Products. Both are open decisions, not bugs
      to fix quietly.
- [ ] **L2** `[read]` A quote stays a snapshot of what the lines WERE, never
      recomputed from what they are now.
- [ ] **L2** `[read]` Every state the UI distinguishes exists in the fixture,
      including the ones a new version added — a draft lane, a partly-live
      rule, a target that has stopped being serviceable.
