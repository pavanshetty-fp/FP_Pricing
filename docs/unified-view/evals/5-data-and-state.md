# Eval — is the screen telling the truth

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
