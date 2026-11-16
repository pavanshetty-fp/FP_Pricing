# FP_Pricing — instructions for Claude Code

This repo is the **Pricing** module of FleetPanda's Unified View prototype,
split off Pavan Shetty's FP-DS-2026 repo. The app opens on Pricing
(`prototypes/unified-view/main.tsx`, `landing="pricing"`); the other modules
stay reachable so their screens can be read and reused.

## Read before any change

1. `PRICING.md` — how to run it, where the code goes, how to hand back.
2. `docs/context/README.md` — the router: load only the docs a task needs.
3. `docs/fpds/` — the design system (FPDS). **Every rule in it applies.**
4. `docs/apply-design-system.md` and `docs/unified-view/map.md` — what each
   document may decide.
5. `docs/unified-view/pricing/PRD.md` — the product. §6 decisions and §7
   working agreements are binding.
6. Check work with `npm run eval` and `docs/unified-view/evals/`.

Authority when they disagree: `docs/fpds/` + `docs/ds/` > `docs/unified-view/` > `pricing/PRD.md`.

## RULES ARE LOCKED — a strict no to changing them

Design-system and Unified View **rules** — components, interactions, layout,
content, tokens, and the evals that check them — are owned by Pavan's
FP-DS-2026 repo. In this repo they are **read-only**.

- **Allowed: building Pricing within the rules** — its screens, flows, columns,
  sample data, and its own PRD.
- **Not allowed: changing a rule.** Never edit the locked files (listed in
  `scripts/rules-lock.mjs`: `docs/fpds/`, `docs/ds/`, `docs/context/`,
  `docs/apply-design-system.md`, the Unified View
  `map`/`components`/`layouts`/`interactions` docs, the 3PL and Service docs,
  all evals and eval scripts, this file, `.claude/`). A guard blocks Claude
  Code from editing them, and `npm run check:rules` fails if any changed.
- **A request that would break or change a rule** (e.g. "add a Save button to
  this sheet", "put helper text under the field", "use this hex colour"):
  **stop and tell the user** before doing anything — name the rule, quote where
  it is written, and suggest raising it with Pavan. Offer a tweak that stays
  within the rules if there is one.
- **Every time you hand back a change**, say in one line whether it touched
  any rule (it should not), and run `npm run check:rules`.

## Working agreements (short form)

- **Reuse before you build.** A Pricing list is the shared list (views as tabs,
  Settings gear, fold chevron, banner on top); a Pricing record is the shared
  `RecordSheet` with the shared right column (`SheetRail`, Activity card).
- **Build only what is asked.** No extra lines, hints, badges or read-outs.
  Suggest additions as questions instead.
- **No explanatory text on screen.** Label, value, control. Sentence case,
  one spelling per term (FPDS UX-167).
- **Tokens only** — no raw hex; derive from existing scales, never invent.
- **Side sheets autosave** — no Save/Cancel. The footer's primary is the next
  act; a dead button explains on press.
- **Check in the browser** after every change; run
  `npx tsc -p tsconfig.app.json --noEmit` and `npm run eval` before handing back.
- **Pricing code lives in `prototypes/unified-view/pricing/`.** Shared
  components (`src/components/`, `prototypes/unified-view/*.tsx`) are used by
  every module on `main` — change them sparingly and flag it.
- **Updates from FP-DS-2026 arrive here** whenever Pavan pushes; pull before
  starting work (`git pull`). **Work on a branch**, never directly on `main`.
- Replies to the team: short, plain language, in three parts —
  Done · Pending · Doubts.
