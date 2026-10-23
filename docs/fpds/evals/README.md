# FPDS — checks (evals)

FPDS is checked at five levels. Levels 1–4 are scripts and run with `npm run eval`
(this repo) on every push; level 5 is run by a person in each tool.

| Level | Check id | What it proves | How |
|---|---|---|---|
| 1 · Tokens | `tokens`, `wcag-contrast` | No raw colors/sizes/radii; every theme and accessibility level keeps contrast | script |
| 2 · Cards & register | `fpds-cards`, `fpds-register` | Every atom, molecule, unit and template has the full spec card; its code exists; nothing the docs mention is missing; `register.json` is current | script |
| 3 · Units in code | `fpds-units`, `table-rows`, `fields-fill`, `boxed-tables`, `sheets`, `status-kinds`, `field-reach` | The units are used as their cards say — view bar on every list, left-aligned columns, one date picker, no preset view tabs, top off then qty, sheets carry the shared cards… | script |
| 4 · Pages & rules | `parity-lists`, `parity-tables`, `parity-sheets`, `parity-shell`, `fpds-rules`, `microcopy`, `fpds-gaps` | Pages match the reference pages; domain rules hold (Customer Portal: ORD numbers, no quotes, asks as pills); the golden prompts resolve to the right template/units and the gap message appears only for real gaps | script |
| 5 · Outcome | golden prompts, by tool | The same request gives the same screen in Lovable, Cursor and Claude | by hand, rubric below |

## Commands

```bash
npm run eval                       # every check; writes docs/unified-view/evals/results/<date>.md
npm run fpds:build                 # cards → register.json, registry (public/r), FPDS.md, install/
npm run fpds:resolve -- "a vendor list with filters"   # the protocol's first answer for a request
```

## Level 5 — the outcome rubric (run per tool)

For each prompt in `golden-prompts.json`, in a fresh project with FPDS installed
(`docs/fpds/install/` for the tool + `npx shadcn add …/fpds-theme.json`):

| # | Question | Pass |
|---|---|---|
| 1 | Did it name the template and units the protocol names (`npm run fpds:resolve`)? | same ids |
| 2 | Are the regions in the template's order? | yes |
| 3 | Is every unit installed from the registry, not re-drawn? | imports from `src/fpds/…` |
| 4 | Tokens only? | no raw hex/px outside the DS |
| 5 | Does it match the reference page side by side (spacing, type, states)? | no visible difference |
| 6 | For a gap prompt: is the gap message there, word for word, with use case, missing component, closest existing and checks run — and is everything else still built? | yes |
| 7 | For a non-gap prompt: is there NO gap message? | none |

A tool passes when every prompt scores 7/7. Record runs in `evals/runs/<tool>-<date>.md`.

## Adding a check

A rule with one right answer becomes a script check in `scripts/eval/fpds.mjs` (or the
existing check it belongs to). A rule that needs judgement stays in the cards and the
rubric — a script that judges is one commit away from making design decisions.
