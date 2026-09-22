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
