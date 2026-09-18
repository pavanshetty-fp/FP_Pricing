# Eval — what the screens say

The segment nobody lists and everybody breaks. Against
`docs/ds/ux/2-rules.md` and the standing rule that **the UI ships the label and
the control; explanations live behind an info affordance, not on screen.**

## Labels

- [ ] **L2** No explanatory microcopy sitting permanently under a field. If it
      needs explaining, it goes in the section's note.
- [ ] **L2** Every button label is a verb phrase naming what pressing it does.
- [ ] **L2** No button label states a condition or a state.
- [ ] **L2** A required marker means the form actually refuses without it.
- [ ] **L2** A banner item is an instruction ("Choose a customer"), not a field
      name ("Customer").

## Vocabulary

- [ ] **L2** One word per concept across the whole app. A stage, a status and a
      lane are not three names for one thing.
- [ ] **L2** The vocabulary on screen matches the vocabulary in the model. A
      status renamed in the UI and not in the code is a bug waiting for the
      next person.
- [ ] **L2** Two records of the same kind in two modules use the same noun for
      the same field.
- [ ] **L2** Dates read in the app's format everywhere — never a raw
      `toLocaleString()`.
- [ ] **L2** Money is formatted by one helper, to two places, right-aligned,
      tabular.

## Empty and error text

- [ ] **L2** Every empty state names its cause and offers the way out.
- [ ] **L2** No state says only what cannot be done without saying what can.
- [ ] **L2** An unknown value says the word for it, not a blank.

## Explanations

- [ ] **L2** Every section note explains WHY the section is shaped as it is,
      not what the fields are called.
- [ ] **L2** No note repeats its own heading.
