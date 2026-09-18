# Interactions · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Feedback for every action (loading / empty / success / error).
- [ ] Destructive actions guarded (52px confirm or `AlertDialog`).
- [ ] Visible focus rings on every interactive element.
- [ ] Keyboard-operable throughout.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Text contrast ≥ WCAG AA in both modes.
- [ ] Reduced motion respected; charts render without mount animation.
- [ ] Loading skeletons hold the loaded shape (no layout jump).
- [ ] A disabled control carries a tooltip with one imperative sentence, and the trigger wraps it so it actually opens. (§7b)
- [ ] A control with nothing to point at is hidden, not disabled. (§7b)
- [ ] No board card drags between lanes; a stage change is the record's own act. (§8.1b)
- [ ] A lane that is not a step of the work sits apart behind the rule. (§8.1b)
- [ ] A card unit with no lines is removed, heading and all. (§8.1b)
- [ ] The card-field menu scopes to a lane, and a lane is offered only the fields it can draw. (§8.1b)
- [ ] Only a card with something outstanding carries an alert. (§8.1b)
- [ ] The board shows a total with its scope stated, not pagination. (§8.1b)
