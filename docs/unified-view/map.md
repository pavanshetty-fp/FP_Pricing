# Unified View — module map

**Load this file first.** It says what these documents are for, what they may
and may not decide, and which one to open.

## The parent is FP-DS-2026. Always.

`docs/ds/` owns the **components themselves** — what a Button is, what the
tokens are, what the scales are, how a side sheet is built, how a table
behaves. Unified View is a **child**: it records how this application *uses*
the design system, and it may never redefine a component.

Three consequences, and they are the whole point of splitting the docs:

1. **A rule that would be true in any FleetPanda product belongs in `docs/ds/`,
   not here.** When something settled in Unified View turns out to be general —
   side sheets autosave, a board card is ruled units, a dead control says why
   on the press — it is promoted UP into the DS rules and this document points
   at it. It is never copied.
2. **What belongs here is the BINDING.** The DS ships ten lane colours and
   seven pastel discs and binds meaning to none of them; this application says
   which hue means which stage, which initial means which order type, which
   column set a table of orders has. Those are decisions, and they are decisions
   about this product.
3. **When the two disagree, the DS wins and this document is wrong.** The evals
   exist to catch exactly that.

## The documents

| File | Covers | Filing rule |
|---|---|---|
| `1-components.md` | every component this app uses, at which atomic level, with its spacing, padding, tokens and **colour mapping** | *"what a thing is made of, and what its colour means here"* |
| `2-layouts.md` | the shell, navigation, the content layer, list archetypes (table · board · map), the action unit, pagination, the side sheet's two columns | *"where things go"* |
| `3-interactions.md` | state, feedback, autosave, the next-act ladder, hover/press/keyboard, what a click does | *"how it behaves"* |

## The evals

`evals/` holds one file per segment, each a list of **verifiable assertions**
against the code — not prose. `evals/0-how-to-run.md` says how they run and
what the two layers are.

> **Two layers, and the second one is the important one.** Layer 1 repairs what
> has exactly one correct answer. Layer 2 surfaces everything else — including a
> document that claims something the code does not do, which is the failure mode
> a doc set is most prone to and least likely to notice.

## Where the modules' own records live

Module decisions — why 3PL's stages are named what they are, why an asset order
has four routes — stay in the module READMEs:

- `prototypes/unified-view/README.md` — the app
- `prototypes/unified-view/threepl/README.md`
- `prototypes/unified-view/service/README.md`

**These documents are for what is true across modules.** A decision that only
one module makes stays in its README; the second module to need it is the
signal to promote it here.
