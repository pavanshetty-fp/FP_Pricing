# Service Work — handoff bundle

Everything needed to pick up the FleetPanda **Service Work** module and keep it
consistent with the design system: the prototype, the product document, and
every rule and eval that governs it.

## What's in here

| Path | What it is |
|---|---|
| `service-work.html` | the prototype, locked to Service Work. Opens by double-click, no install |
| `docs/unified-view/service/PRD.md` | **start here** — the product: users, settings, stages, screens, flows, decisions, working agreements, known gaps |
| `docs/unified-view/service/evals.md` | the PRD as yes/no assertions |
| `docs/unified-view/service/changes-2026-09-23.md` | decision history |
| `docs/apply-design-system.md` | the whole design system in one file (generated) |
| `docs/ds/` | the design system's source rules: `ui/`, `ux/`, `interactions/`, `00-meta/` |
| `docs/unified-view/` | how this product uses the DS: `map.md`, components, layouts, interactions, and the `evals/` segments (Service Work docs only — other modules' docs are left out) |
| `skills/` | packaged Claude skills for the DS and its heuristics eval — **older snapshots (June–August 2026); where they disagree with `docs/`, the docs win** |
| `VERSION.txt` | the source repository and commit this bundle was built from |

## Rules are locked — tweaks only

The design-system and Unified View rules in `docs/` are **read-only** for
anyone working from this bundle. Screens can be tweaked within them; a rule
cannot be changed. If something needs a rule changed, raise it with Pavan.

The code lives in **github.com/pavanshetty-fp/FP_Service-Work** (ask Pavan
for access) — its `GETTING-STARTED.md` sets up Claude Code, and it enforces
the lock.

## The order of authority

When two documents disagree, the higher one wins and the lower one is wrong:

1. **`docs/ds/`** — the design system (what a component *is*).
2. **`docs/unified-view/`** — how this product binds the DS (what a colour or
   column *means here*).
3. **`docs/unified-view/service/PRD.md`** — what Service Work does and why.

## If you're working with an AI assistant

Give it this whole folder, and tell it to read, in this order:

1. `docs/unified-view/map.md` — what each document may decide.
2. `docs/unified-view/service/PRD.md` — especially §6 (decisions) and §7 (working agreements).
3. `docs/apply-design-system.md` — before building any screen.
4. `docs/unified-view/service/evals.md` and `docs/unified-view/evals/` — to check work against.

The skills in `skills/` are older snapshots; use them only alongside the docs,
never instead of them.

## Changing the prototype

The HTML is a build. It isn't edited directly. The source is the repository
named in `VERSION.txt`:

```bash
npm install
npm run dev:unified        # work on it
npm run build:service      # rebuild service-work.html
npm run eval               # the scripted evals
bash scripts/bundle-service.sh   # rebuild this whole bundle
```

Write any decision back into `PRD.md` §6. Write any rule that turns out to be
true for every module into `docs/ds/`, and point to it from here, never copy it.
