# FP DS 2026 — Tables Layout

React + TypeScript + Vite + Tailwind v4 component library, generated from the
Figma frame **"Tables Layout"** (`FP DS 2026`, node `27614:56562`).

## Stack
- React 19, TypeScript (strict)
- Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`), tokens in [`src/index.css`](src/index.css)
- `lucide-react` icons, `class-variance-authority` + `tailwind-merge` for variants

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
