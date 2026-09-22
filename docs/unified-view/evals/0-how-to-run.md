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

| Kind | How |
|---|---|
| Countable — tokens, hex, icons, scale values, labels, imports | a script over the source; fast, runs in CI |
| Scripted segments | `npm run eval:boxed-tables` — the boxed table unit (§10f) |
| Structural — does this screen have the zones in order, does this sheet have the three footer slots | grep-shaped assertions over the source |
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
