# FPDS — the FleetPanda Design System

FPDS is the design system distilled from what the **Unified View** (3PL, Sales, Service
Work) and the **Customer Portal** already do. Its one goal: **anyone who installs it — in
Lovable, Cursor, Claude or anywhere else — gets output that looks and behaves exactly
like those screens**, and is told clearly when what they want has no design yet.

Owner: Pavan Shetty · pavanshetty@fleetpanda.com

## The layers

| # | Layer | File | What it holds |
|---|---|---|---|
| 0 | Protocol | `00-protocol.md` | How to build anything: five checks (L1–L5) and the gap message |
| 1 | Foundations | `01-foundations.md` | Tokens — color, type, space, radius, stroke, elevation, motion, screen sizes, accessibility levels |
| 2 | Atoms | `02-atoms.md` | Single primitives — button, input, pill, status chip… |
| 3 | Molecules | `03-molecules.md` | Small parts with one job — search field, filter chip, date field, stat tile… |
| 4 | Units | `units/*.md` | Named regions of a screen, with names close to what you see — View row, Toolbar, Filter panel, Chip shelf, View bar, Data table, Board, Map, Record sheet, Lines table… |
| 5 | Templates | `05-templates.md` | Whole pages and sheets — List page, Record sheet, Directory record, Dashboard, Settings, App frame |
| 6 | Reference pages | `06-pages.md` | The real screens to copy |
| — | UX rules | `07-ux-rules.md` | Every decision, with its reason |
| — | Interaction rules | `08-interaction-rules.md` | How things respond — hover, staging, autosave, motion… |
| — | Not designed yet | `09-later.md` | UX copy, empty pages, highlight units, illustrations |
| — | Checks | `evals/README.md` | Five levels of evals, golden prompts |

Every atom, molecule, unit and template is a **spec card** with the same twelve sections
(`_spec-card-template.md`): Purpose · Use when / Don't use when · Anatomy · Look · States ·
Interactions · Outcomes · Data contract · Rules · Do / Don't · Checks · Reference.
`register.json` lists them all, generated from the cards.

## Install it

**Docs** — give the tool `docs/fpds/FPDS.md` (everything in one file) and its rules file:

| Tool | File |
|---|---|
| Cursor | `install/fpds.mdc` → `.cursor/rules/fpds.mdc` |
| Lovable | `install/lovable-knowledge.md` → Project settings › Knowledge |
| Claude / Claude Code | `install/CLAUDE.md` → project `CLAUDE.md` |
| Any other agent | `install/AGENTS.md` → project `AGENTS.md` |

**Code** — install from the registry (shadcn format), never re-create:

```bash
npx shadcn@latest add https://pavanshetty-rgb.github.io/FP-DS-2026/r/fpds-theme.json
npx shadcn@latest add https://pavanshetty-rgb.github.io/FP-DS-2026/r/fpds-data-table.json
```

Each card's id line names its registry item (`registry: fpds-…`).

## Working on FPDS (this repo)

```bash
npm run fpds:build     # cards → register.json, public/r registry, FPDS.md, install/
npm run eval           # all checks, incl. fpds-cards / -register / -units / -rules / -gaps
npm run fpds:resolve -- "describe a screen"   # what the protocol answers
```

The design reference page (`FP-DS-2026-design-reference.html`) is built from these same
files.
