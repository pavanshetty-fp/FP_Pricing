# Eval — interactions and behaviour

Against `../3-interactions.md` and `docs/ds/interactions/2-rules.md`.

## Editing

- [ ] **L2** Every side sheet with an editable field autosaves. No exceptions,
      creating or editing.
- [ ] **L2** Autosave is debounced and the debounce is the same everywhere.
- [ ] **L2** `DraftStatusChip` is present and shows nothing before the first
      keystroke.
- [ ] **L1** No autosaving sheet renders a Cancel, a Save or an Update.
- [ ] **L2** The draft is built once per record; the row returning from the
      sheet's own save does not rebuild the form.
- [ ] **L2** Every field a sheet collects exists on the record AND is carried
      by the draft builder, the save and the create. **Walk all four for every
      field** — a dropped field is invisible in review.
- [ ] **L2** A record is created by the first real change, not by a button at
      the end of a form.

## Feedback

- [ ] **L2** Every act that changes state raises a toast; typing does not.
- [ ] **L2** A toast says the act and its consequence.
- [ ] **L2** The audit trail records nothing while the record is in its first
      stage.
- [ ] **L2** A long free-text change is recorded as "changed", not quoted.

## Unavailable controls

- [ ] **L2** A disabled primary carries a tooltip with one imperative
      sentence.
- [ ] **L2** The tooltip trigger wraps the button, or it never opens.
- [ ] **L1** No permanent explanatory clause parked beside a primary.
- [ ] **L2** A control with nothing to point at is hidden, not disabled.

## Pressing

- [ ] **L2** A row and a card open the record.
- [ ] **L1** Every control inside a card stops propagation.
- [ ] **L2** An underline appears only where something is genuinely hidden.
- [ ] **L2** Nothing meaningful is revealed by hover alone.

## The stage machine

- [ ] **L2** No act does two things. Sending is not advancing.
- [ ] **L2** A rung's label is the act, never the precondition and never the
      state.
- [ ] **L2** A stage that waits on another system actually waits.
- [ ] **L2** Going backwards clears what the forward step stamped.
- [ ] **L2** The sheet follows a stage CHANGE, never an open.

## Lists

- [ ] **L1** Every narrowing resets the page to 1.
- [ ] **L2** A saved view captures the narrowing and the arrangement.
- [ ] **L2** A new record is revealed by widening the window, never by moving
      it.
- [ ] **L2** A record cannot slip out from behind its own open sheet.

## Keyboard and accessibility

- [ ] **L1** Every `role="button"` activates on Enter and Space.
- [ ] **L1** Every icon-only control has an `aria-label`.
- [ ] **L2** Focus is visible on everything that presses, and the ring leads
      somewhere.
- [ ] **L2** No scrollbar is visible, on either axis.
- [ ] **L2** Contrast ≥ AA in BOTH themes — check light, which is the one that
      gets forgotten. **Disabled controls are exempt** (WCAG 1.4.3 excludes
      inactive components), and this app dims them to 50%, which puts a dead
      primary around 3.5:1 in light by design. A disabled control still has to
      be legible — if it cannot be read at all, that is a finding.
- [ ] **L2** Colour is never the only carrier; the label always says the state.

## Settings that change the flow

- [ ] **L2** Every switch description says what happens in both positions.
- [ ] **L2** A nested switch goes off with its parent and shows disabled.
- [ ] **L2** A setting that removes a step removes its UI — no facet for a
      source nothing can arrive from.
