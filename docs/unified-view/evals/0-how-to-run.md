# Unified View evals — how they run

One file per segment. Each is a list of **assertions**, not prose: something a
person or an agent can answer yes or no against the code.

## The two layers

**Layer 1 — fix.** Repair anything with exactly one correct answer, then
re-run. These are the mechanical checks: a raw hex that has an exact token, a
spacing value off the scale that has an exact step, a missing `aria-label`, an
icon from outside Lucide, a `console.log` left behind.

> **Layer 1 never makes a design decision.** If a fix requires choosing between
> two defensible answers — which token, which layout, which label — it is not
> Layer 1. Auto-fixing a layout from a document is how a document quietly
> rewrites a screen.

**Layer 2 — surface.** Everything else, reported and not changed:

- a rule the code breaks where the fix is a judgement call;
- a rule the code breaks *deliberately*, which means the DOCUMENT is out of
  date and has to be corrected instead;
- something on screen that no document covers at all.

The third is the failure mode a doc set is most prone to and least likely to
notice, so it is a first-class result, not an afterthought.

## Running them

```bash
npm run eval
```

**That command is the whole answer to why these sat unrun from the day they
were written until 2026-09-22.** It was not that nobody cared. It was that
**nothing executed them**: four of the five segments were prose checkboxes with
no stated method, there was no command, nothing ran in CI, and a run left no
trace — so a run could not be told apart from a reading, and no two runs could
be compared. Three things were missing and they are three separate things.

| Missing | Now |
|---|---|
| a command | `npm run eval` — every scripted check, exits non-zero on L1 |
| a method per assertion | a **method tag** on every line: `[script]` `[grep]` `[structural]` `[read]` `[browser]` |
| a trace | each run writes `results/<date>.md` with the commit it ran against |

### The five methods

| Tag | How it is answered | Who |
|---|---|---|
| `[script]` | a check module in `scripts/eval/` | the runner |
| `[grep]` | a one-line search, written out in the assertion | anyone |
| `[structural]` | a search, then a look at what surrounds the hit | an agent |
| `[read]` | an agent reads the file against the rule | an agent |
| `[browser]` | the running app — contrast, both themes, focus, scrollbars | an agent with the preview |

### What the runner will NOT do

**It holds only L1 — the rules with exactly one correct answer.** A script that
reports L2 is a script one commit away from making a design decision, and the
first version of the boxed-table check proved it: it reported three violations
and two of them were correct code. It now surfaces those at L2 and asks a
person which variant it is.

The run ends by listing what no script covered, so a clean run is never
mistaken for a finished one.

## How a run measures CHANGE

A single run is a snapshot and says nothing about direction. Three things make
it a measurement:

1. **A baseline.** The first run writes `results/<date>.md` with a finding
   count in a machine-readable comment.
2. **A delta.** Every run after it prints `N findings · was M in <file>` and
   the difference. A number going up in a week nobody touched tokens is a
   check that has started matching something new.
3. **A census, not just a pass/fail.** `npm run eval -- --census` counts the
   VARIANTS — every sheet against every option it takes, every table against
   whether it is in a unit. Pass/fail cannot see a fifth width appearing or a
   second table quietly growing its own box; a census can, and that is how
   `docs/ds/ui/7-variants.md` stays true.

## When they run — the habit

- **Before any commit that changes a screen.** `npm run eval` takes under a
  second.
- **At the end of any stretch of work that settled a rule**, because the rule
  has to land in `docs/ds/` and the eval has to gain the assertion. A run that
  changes no document, over work that settled something, has left it in the
  wrong place.
- **Whole-set, on a schedule** — the scripted checks every time, and one manual
  segment each pass, in the order below, so all five come round.

| Kind | How |
|---|---|
| Countable — tokens, hex, icons, scale values, labels, imports | `npm run eval` |
| The boxed table unit on its own (§10f) | `npm run eval:boxed-tables` |
| Structural — zones in order, the three footer slots | grep-shaped assertions over the source |
| Judgement — does the board follow the board rules, is this colour binding right | an agent reading the file against the doc |
| Rendered — contrast, both themes, focus rings, no visible scrollbars | the running app in the browser pane |

## Recording a result

Each finding is one line:

```
[segment] [layer] file:line — what is wrong — the rule it breaks
```

Layer 2 findings end with a decision: **fix the code**, **fix the document**,
or **leave it and write down why**. A finding with no decision is a finding
that will be found again next time.

## The order to run them in

1. `1-components.md` — tokens and colour, because everything else sits on them
2. `2-layouts.md` — structure
3. `3-interactions.md` — behaviour
4. `4-content.md` — what the screens say
5. `5-data-and-state.md` — whether the screens are telling the truth
6. **the module evals** — `../3pl/evals-creation.md`, and one per module job
   after it

## Module evals, and the one rule they add

A module eval lives beside its rules file, not here — `../3pl/evals-creation.md`
is the first. It runs last, because it assumes the five segments above have
already passed: a module's assembly cannot be judged while its tokens are still
wrong.

> **EVERY MODULE ASSERTION CITES THE DS.** Checking a module against its own
> document proves that document is self-consistent and nothing else — and a
> module document is the likeliest file in this set to have drifted, because it
> is written fastest and read least. The DS is the authority in every row.
> **An assertion with no DS citation is itself a finding**: either the rule
> belongs upstairs and should be promoted, or it is a genuine module binding
> and the row should say so.

**And the traffic goes both ways.** A module finding that turns out to be
general does not get fixed in the module — it is written into `docs/ds/`, and
the module file is cut down to a pointer. A run that changes no DS file, over a
stretch of work that settled real rules, has almost certainly left something
sitting in the wrong document.
