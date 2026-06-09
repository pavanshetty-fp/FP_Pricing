# FP DS 2026 — Tables Layout

React + TypeScript + Vite + Tailwind v4 component library, generated from the
Figma frame **"Tables Layout"** (`FP DS 2026`, node `27614:56562`).

## Stack
- React 19, TypeScript (strict)
- Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`), tokens in [`src/index.css`](src/index.css)
- `radix-ui` (unified) primitives, `lucide-react` icons, `class-variance-authority` + `tailwind-merge`

## Spinoff architecture
This is a FleetPanda spinoff of **shadcn/ui**. The primitives in
[`src/components/ui/`](src/components/ui) are the **canonical `new-york-v4`
shadcn components, copied verbatim** (imports rewritten to `@/...`). FleetPanda
diverges only in:
- **Tokens** — shadcn's token *names* are kept so the components work unchanged;
  the *values* in `src/index.css` are FleetPanda's (dark-only). `--radius: 0.625rem`
  → `md=8px / lg=10px`. FP-only tokens: `--brand`, `--drawer`, FP surface/outline
  scale, status colors.
- **Composed components** — `tables-layout/` and `navigation-drawer/` are
  FleetPanda-specific compositions built on top of the canonical primitives.

To re-pull a fresh shadcn primitive: copy from
`../ui/apps/v4/registry/new-york-v4/ui/<name>.tsx` and rewrite
`@/registry/new-york-v4/...` → `@/...`.

## Getting started
```bash
npm install
npm run dev        # start the demo (renders <TablesLayout />)
npm run typecheck  # tsc --noEmit
npm run build      # tsc -b && vite build
npm run lint
```

## Structure
```
src/
  index.css                  Tailwind import + design tokens (mapped from Figma vars)
  components/
    ui/                      Primitives: Button, Badge, Checkbox, Switch, Input,
                             Progress, Avatar, ToggleGroup, Tabs, DropdownMenu
    tables-layout/           SideNav, PageHeader, ActionBar, DataTable,
                             BulkActionBar, Pagination, TablesLayout (composed)
```

Each barrel (`index.ts`) re-exports its folder. Import from the top:
```tsx
import { TablesLayout, DataTable, Button } from "@/components";
```

## Tokens
All colors / radii / typography in `src/index.css` are mapped 1:1 from the Figma
variable collection (shadcn semantic tokens + the FP brand/surface scale). Each
token carries a comment naming its source Figma variable. The design is dark-only.

See [`NOTES.md`](NOTES.md) for design assumptions and open items.
