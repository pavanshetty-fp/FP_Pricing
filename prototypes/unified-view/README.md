# Unified View

A **standalone prototype** of the FleetPanda Sales Console, recreated on FP-DS.

It is deliberately **not** part of the FP DS 2026 gallery. The gallery showcases
the design system; this is an application built *with* it. Keeping them apart
means app-level decisions (this screen's columns, filters, sample data) never
get mistaken for design-system rules.

## It uses the design system, it does not fork it

| Comes from the DS | Owned by this prototype |
|---|---|
| `@/index.css` — every colour, radius, spacing token | the Fuel Orders screen + its columns |
| `@/components/ui/*` — button, badge, table, popover, calendar… | the toolbar and filter composition |
| `@/components/app-shell`, `top-bar`, `navigation-drawer` | sample order data |
| `@/components/tables-layout` — pagination, bulk bar, Group By | |

No hex is written here — colours resolve through DS tokens. Two order-type
pastels (`--order-delivery`, `--order-extraction`) live in the DS token layer
because that is where the DS says new colours go; both are marked `KNOWN GAP`
there, as they are not yet sourced from the Figma file.

## Run it

Dev server (the DS gallery and this prototype are served by the same Vite dev
server, on their own URLs):

```bash
npm run dev
```

then open, on whatever port Vite reports (the dev `base` is `/FP-DS-2026/`):

**http://localhost:5173/FP-DS-2026/prototypes/unified-view/index.html**

## Build the standalone HTML

```bash
npm run build:unified
```

Writes a single self-contained file to `dist-unified/` — all JS, CSS and assets
inlined, so it opens by double-click and can be shared as one file.
