# Design system — where the visual and interaction rules live

> **Load this when:** building or changing any screen, component, token, layout, motion or copy rule. **Not for:** business facts (the domain docs) or how Pavan works (`working-agreements.md`).
> **Sources:** `docs/fpds/README.md`, `docs/unified-view/map.md`, memory `project_fp_ds_foundation`. **Last updated:** 2026-11-08.

The design system is already split into small files; this page is a router into them, not a copy. **Do not restate design rules in the domain docs** — point here.

## Which file to open

| You are… | Open |
|---|---|
| Building anything at all | `docs/fpds/00-protocol.md` (five checks and the gap message), then the card for the part you need |
| Picking a color, type size, spacing, radius, motion | `docs/fpds/01-foundations.md`; tokens in `src/index.css` |
| Using a button, input, pill, status chip | `docs/fpds/02-atoms.md` |
| Using a search field, filter chip, date field, stat tile | `docs/fpds/03-molecules.md` |
| Laying out a region (table, board, map, toolbar, filter panel, record sheet, lines table, timeline, list view…) | `docs/fpds/units/<unit>.md` |
| Building a whole page or sheet | `docs/fpds/05-templates.md`; real screens to copy in `06-pages.md` |
| Asking "why is it this way?" | `docs/fpds/07-ux-rules.md` (decisions with reasons), `08-interaction-rules.md` (hover, autosave, motion) |
| Something nobody designed yet (copy, empty pages, illustrations) | `docs/fpds/09-later.md` |
| A design that was retired | `docs/fpds/10-archive.md` → `docs/archive/*` |
| Checking work | `docs/fpds/evals/README.md`; misses `evals/misses.md`; scripts `npm run eval` |
| Everything in one file (to hand another tool) | `docs/fpds/FPDS.md` (generated); the older bundle `docs/apply-design-system.md` from `docs/ds/` |
| How the Unified View app binds the system | `docs/unified-view/map.md` (router) → `1-components`, `2-layouts`, `3-interactions` |

## Which wins when two disagree

1. `docs/ds/` (ui · ux · interactions · 00-meta) — the rulebook.
2. `docs/fpds/` — the same system as spec cards (built from what the screens do).
3. `docs/unified-view/` — how this app uses the system; never redefines it.
4. Module notes (`prototypes/unified-view/*/README.md`, `docs/unified-view/3pl/creation.md`, `docs/unified-view/service/PRD.md`).

A newer instruction from Pavan beats any of them — follow it and update the rule.

## Rules most often needed (full text in the files above)

- Tokens only; two themes (light and FP-dark); Lucide icons only; brand orange is `--color-brand` only; violet accent for highlights only.
- Side sheets autosave; a read-only sheet has no footer; sheet width follows its content.
- Tables are the full unit at any row count (fill the height, pagination at the foot); every column sorts; Search by column is a row under the header.
- Every chip/badge and status column is a pill; status colored by kind (waiting · true · done · warning · neutral).
- One fact, one form: the same fact uses the same component and color everywhere.
- Detail pages open as Side sheet (default), Modal or Full page — one app-wide choice in the Settings gear's Detail page view tab; no ··· entry (IX-92, 2026-11-12).
- Export sheet: summary on the sheet (no card) + applied filters as chips by category, only when some are on; calendar and filter icons beside the count open the page's own date and Filters popovers (IX-17, 2026-11-12).
- Every list: one Settings gear (Table · Board · Detail page view) and Search by column as a header hover tab (IX-93, IX-94; all lists since 2026-11-12, guarded by parity-lists G2).
- Hand cursor = navigation only (links, record cards/rows/tiles); in-place controls keep the arrow (IX-95).
- Views arrive by kind: board from the right, table settles up from below, list and map from the left (map zooms in).
