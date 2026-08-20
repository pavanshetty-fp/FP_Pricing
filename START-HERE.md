# START HERE — for every new chat/session

This repo is the **FleetPanda Design System (FP-DS-2026)**: a rulebook + a toolkit of
reusable React components used to build new screens and flows in a consistent style.
New work happens across many separate chat sessions — this note keeps them consistent.

## The loop (every session)

1. **Pull first.** Start from the newest version:
   ```bash
   git pull
   ```
2. **Follow the design system.** Before building UI, read the rulebook so screens
   stay on-style:
   - `docs/apply-design-system.md` — the whole system in one file (auto-generated).
   - Source of truth lives in `docs/ds/` (`ux/`, `ui/`, `interactions/`, `00-meta/`).
     If you change a rule there, regenerate the bundle:
     ```bash
     bash docs/ds/build-bundle.sh
     ```
3. **Build.** New reusable pieces go in `src/components/<name>/`; wire them into the
   gallery via `src/App.tsx`. All colors/spacing come from tokens in `src/index.css`
   — never hardcode hex.
4. **Check it.** Run the app and confirm it typechecks:
   ```bash
   npm run dev
   npx tsc -b --noEmit
   ```
5. **Save to GitHub.** When it's ready:
   ```bash
   git add -A
   git commit -m "Describe what you added"
   git push
   ```

## Working across many chats (recommended)

The **repo is the memory; chats are just workers.** Nothing important lives in a
conversation — components, tokens, and rules live in the files/docs — so any fresh
chat picks up the work by reading this repo. Prefer **short, focused chats** over one
long one (long chats get heavy, slow, and start to drift). Starting fresh loses
nothing.

> **One focused task → one fresh chat → pull, build, push.**

Suggested split (each chat owns its own folder, so they never collide):

| Chat | Owns | Mostly touches |
|---|---|---|
| Foundation / system | tokens, base `ui/` components, rules, docs, visual refs | `src/index.css`, `src/components/ui/`, `docs/` |
| Table layout | table screens + toolbar | `src/components/tables-layout/`, `data-action-control/` |
| Kanban layout | board view | `src/components/kanban-board/` |
| Dashboard | dashboard + charts | `src/components/dashboard/` |

Three rules that prevent almost all conflicts:
1. **Pull first, push when done** — the entire handoff between chats.
2. **One folder per chat** — layout chats stay in their own folder.
3. **Foundation changes go first** — tokens/base components ripple into every layout;
   change them in the foundation chat, push, *then* have layout chats pull.

Even foundation work should be **task-sized fresh chats** (e.g. "add a status token",
"build a date-picker"), not one everlasting chat. The persistent home is the repo.

## One app, not many HTML files

This is a **single React app with ONE `index.html`.** Categories (tables, kanban,
dashboard…) are **folders of components + gallery sections inside that one app** — do
**not** create a separate `.html` per category. Per-category HTML files would each
need their own copy of the shell + tokens + components, causing duplication and drift
— the exact opposite of a design system. Splitting happens at the **chat** level
(above), never at the app level. To share the whole gallery as one portable file, run
`npm run build:single` (bundles everything into a single self-contained HTML).

## React vs standalone HTML

- **React components** (`src/components/*.tsx`) become permanent, reusable parts of
  the system — prefer these.
- **Standalone `.html` prototypes** are one-off explorations only; keep them in a
  separate `prototypes/` folder. Once an idea is right, rebuild it as React components
  so it joins the toolkit.

## Ground rules (non-negotiable)

- **Icons: Lucide only** (`lucide-react`). No Tabler / Phosphor / Hugeicons / emoji.
- **Tokens, not raw hex.** Add new colors to the token layer in `src/index.css`.
- **Two themes**, FP-dark is default (`.dark`); ship Light (`:root`) too.
- Don't commit secrets or large data dumps (the Figma token lives outside the repo;
  `figma/*.json` and build output are gitignored).

## Where things are

| Path | What it is |
|---|---|
| `docs/ds/` | The rulebook (UX structure · UI look · interactions · meta) |
| `docs/apply-design-system.md` | All rules combined into one file (generated) |
| `src/components/ui/` | Base building blocks (buttons, inputs, menus) |
| `src/components/app-shell/` | The frame every screen sits in |
| `src/components/` (rest) | Larger pieces: tables, forms, kanban, dashboard, nav… |
| `src/App.tsx` | The gallery that wires every screen together |
| `src/index.css` | Color/spacing tokens — single source of truth for styling |
