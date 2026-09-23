# Conformance checklist — the ship-gate

Self-check before shipping. This rolls up each category's `5-checks.md`; see those
for the rule each check derives from. (This is also the rubric the
`fp-ds-heuristics-eval` skill scores against.)

## UI
- [ ] Every color is a token (no raw hex / no foreign palette).
- [ ] The primary CTA is the neutral `bg-primary`; `bg-brand` (orange) appears only as a deliberate accent, never as the default CTA.
- [ ] All icons are Lucide.
- [ ] Both Light and FP render; FP is default; toggle persists to `fp-theme`.
- [ ] Surfaces layer correctly (background → drawer → content) with `shadow-fp-surface` on floating chrome; content layer has no outer border.
- [ ] Status shown by soft tint (`status-*/10`), not saturated fills.
- [ ] Component variants follow data meaning (semantic).
- [ ] Radii / type / spacing come from the scale, not one-off values.
- [ ] Text contrast ≥ WCAG AA in both modes.
- [ ] Every hue in use is in the application's colour-mapping table, meaning one thing across the product.

## UX
- [ ] Elevation steps once per level; no same-weight fill nested on itself.
- [ ] Screen is in the AppShell with one header stack; content zones in order (header → toolbar → summary → data).
- [ ] Header units earn their place: breadcrumb only if nested, tabs only for real facets, toolbar only if the data needs it — no placeholder units.
- [ ] Dense rows are fixed ordered slots, not crammed elements.
- [ ] One primary group / one primary action per view.
- [ ] Every side sheet with an editable field autosaves, shows the draft chip, and carries no Save / Update / Cancel.
- [ ] A sheet's footer primary is the next act on the record, labelled as an act.
- [ ] A two-column sheet keeps editable left, derived right, rail sticky; width is per step.
- [ ] What the primary is waiting on is in the strip above the footer, one item at a time, and each item reaches its section.

## Interactions
- [ ] Feedback for every action (loading / empty / success / error).
- [ ] Destructive actions guarded (52px confirm or `AlertDialog`).
- [ ] Visible focus rings; keyboard-operable; icon-only buttons have `aria-label`.
- [ ] Reduced motion respected; charts render without mount animation.
- [ ] A disabled control says why on the press, never in a clause beside it.
- [ ] No board card drags between lanes; card units disappear with their lines; only outstanding cards carry an alert.

## When two rules disagree — the 2026-09-23 lesson

**One sheet ended up holding two different tables.** One had the hanging add
and boxed controls in its cells; the other had a full-width add band and
borderless cells. Both were built by somebody reading the documents.

### What actually went wrong

1. **THE CHILD CONTRADICTED THE PARENT, IN WRITING.** `docs/ds/ui/2-rules.md`
   §10f says the add hangs off the card's corner. `docs/unified-view/
   2-layouts.md` said *"the Add row is the table's last band"* — and gave a
   reason that sounded right: a flush table inside a card has no squared corner
   to hang from. It does; `hanging` squares it.
2. **THE EVAL ASSERTED THE CHILD'S VERSION.** `evals/2-layouts.md` carried
   *"The Add row is the table's last band"* as a check. **A check that enforces
   the wrong rule is worse than no check**, because it makes the wrong answer
   look reviewed.
3. **NO RULE COVERED THE INSIDE OF A CELL.** §10f governed the box — rims,
   radii, the add, the empty state — and said nothing about what goes in a
   `<td>`. So a bare `Combobox` in a cell broke no written rule.
4. **THE SCRIPT MISSED THE BAND BECAUSE THE LABEL WAS A VARIABLE.** It matched
   `>Add part<` and not `{addLabel}`. **A check that only catches literals is a
   check you escape by extracting a prop.**

### The rules that came out of it

- **A CHILD DOCUMENT MAY NOT RESTATE A PARENT RULE — ONLY POINT AT IT.** A
  restatement is a copy, and a copy is a thing that can drift while looking
  authoritative. Where the child needs to say something, it says the BINDING
  and links the rule.
- **EVERY CHILD ASSERTION CITES THE DS RULE IT TESTS** (already the rule for
  module evals since 2026-09-22; this is why it matters). **An assertion with
  no citation is one nobody can check against the parent** — and the one that
  caused this had none.
- **WHEN A DOC AND A SOURCE COMMENT DISAGREE, BOTH ARE SUSPECT.** The comment
  in `LineTable` argued its own case in detail and was wrong; detail is not
  evidence.
- **A CHECK MATCHES SHAPE, NOT SPELLING.** Structure — an icon, a handler, a
  class — survives refactoring; a literal string does not.
- **THE CONTRADICTION WAS FINDABLE IN ONE GREP.** `grep -rn "last band" docs/`
  would have shown both documents disagreeing at any point in that month.
  **Before writing a rule, grep for its subject across `docs/` — if two files
  already say something, one of them is wrong.**
