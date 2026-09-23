# Eval — what the screens say


> **METHOD TAGS.** Every assertion below carries one, because an assertion with
> no stated method is one each run measures differently and no two runs agree
> on. `npm run eval` executes the `[script]` ones and writes a results file;
> the rest are read by a person or an agent, against this file.
>
> `[script]` a check in `scripts/eval/` · `[grep]` a one-line search, written
> out · `[structural]` a search plus a look at the context · `[read]` an agent
> reads the file against the doc · `[browser]` the running app.

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
- [ ] **L1** Money is formatted by ONE helper — `MONEY` — always two places,
      right-aligned, tabular. No second `Intl.NumberFormat` with a currency,
      no `` `$${n}` ``.
- [ ] **L2** A per-unit rate uses the rate helper, not money with a `dp`.

## Empty and error text

- [ ] **L2** Every empty state names its cause and offers the way out.
- [ ] **L2** No state says only what cannot be done without saying what can.
- [ ] **L2** An unknown value says the word for it, not a blank.

## Explanations

- [ ] **L2** Every section note explains WHY the section is shaped as it is,
      not what the fields are called.
- [ ] **L2** No note repeats its own heading.

## The microcopy rule — added 2026-09-23

Its own section because it was broken three times after being said twice.

- [ ] **L1** `[script]` No `description=` on a `SheetField` and no muted
      paragraph under a control that EXPLAINS THE CONTROL. Helper text is for
      a state — missing, wrong, disagreeing, or a value the reader did not put
      there — never for a guide. — *ux §"HELPER TEXT IS NOT A DEFAULT"*
- [ ] **L2** `[read]` Every remaining line of helper text names something true
      of THIS record at THIS moment, and disappears when it stops being true.
- [ ] **L2** `[read]` Anything that teaches a control lives behind
      `SheetSectionNote`, not on the screen. A settings page is exempt:
      explaining the option IS its content.
- [ ] **L1** `[read]` Every figure standing alone at a card's edge has a
      label. — *ux §"A FIGURE HAS A NAME"*

## From Unified View — added 2026-09-22

- [ ] **L1** `[script]` No footer primary reads *Save*, *Save Changes* or
      *Update*. It names the act. — *ux §"THE PRIMARY IS A LADDER"*
- [ ] **L1** `[read]` Every pending item is an INSTRUCTION — "Choose a
      customer", not "Customer". — *ux §"WHAT THE RECORD IS MISSING"*
- [ ] **L2** `[read]` A gated picker's empty state names the gate: "Nothing
      matches inside this partner's area", not "No results".
- [ ] **L2** `[read]` No explanatory paragraph on screen. The label and the
      control ship; the explanation goes behind `SheetSectionNote`.
- [ ] **L2** `[read]` A status is its word, and no word appears twice for one
      fact — a Draft says "Draft saved", not a chip plus a note plus a dot.
