<!-- THE SPEC CARD — every atom, molecule, unit and template uses these headings,
     in this order. A heading with nothing to say keeps "—" under it; none is
     dropped (the completeness check counts them). -->

# <Screen name>

`id: <layer>.<kebab-name>` · `layer: atom | molecule | unit | template` · `code: <repo path(s)>` · `registry: fpds-<kebab-name>`

## Purpose
What it is for, in one or two sentences. What question it answers for the user.

## Use when / Don't use when
- Use when …
- Don't use when … (name the unit to use instead)

## Anatomy
Its parts, in screen order, each one line. Name sub-parts exactly as the code does.

## Look
Tokens, sizes, spacing, type, radius, colors — token names only, never raw values
(except where the DS itself fixes a px size, e.g. "a 44px checkbox column").

## States
default · hover · focus · active/pressed · open · selected · disabled · loading · empty · error —
what each looks like. Only the states it has.

## Interactions
| Trigger | Result |
|---|---|
| … | … |

## Outcomes
Everything that can come out of using it (a narrowed list, a saved view, a toast, a
sheet opening, nothing because …).

## Data contract
The props/inputs it needs and what it reports back (callbacks). Keep to the meaning,
not the full TypeScript.

## Rules
Numbered. Each rule: **the rule** — *why* (the reasoning, from Pavan's decisions) —
`(source: doc §/memory/date)`.

## Do / Don't
- ✅ …
- ❌ …

## Checks
Which eval(s) enforce this (ids from `docs/fpds/evals/README.md`), and what a
reviewer looks at by eye.

## Reference
Real screens that use it (module › page), so a builder can copy the look exactly.
