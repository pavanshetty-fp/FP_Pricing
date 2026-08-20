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

## React vs standalone HTML

- **React components** (`src/components/*.tsx`) become permanent, reusable parts of
  the system — prefer these.
- **Standalone `.html` prototypes** are one-off explorations; keep them in a separate
  `prototypes/` folder. Once an idea is right, rebuild it as React components so it
  joins the toolkit.

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
