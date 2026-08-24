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

This prototype has **its own server on its own port**, where it is the root — so
the bare origin can only ever resolve to the Unified View.

| Command | URL | Serves |
|---|---|---|
| `npm run dev:unified` | **http://localhost:4300/** | this prototype, from source |
| `npm run preview:unified` | **http://localhost:4173/** | the built `dist-unified` artifact |
| `npm run dev` | http://localhost:5173/FP-DS-2026/ | the DS gallery |

Both prototype ports are `strictPort`, so a clash fails loudly instead of
sliding to a free port and leaving you looking at whatever owns the one you
expected.

**Do not open the prototype as a path under the gallery's dev server**
(`.../FP-DS-2026/prototypes/unified-view/index.html`). It renders, but Vite
injects its HMR client into the page, and any dev-server restart makes that
client reload the tab to the server root — i.e. the gallery. That is what made
"the wrong HTML" keep appearing. Use port 4300.

Likewise, preview the built artifact with `preview:unified` rather than serving
`dist-unified/` through the dev server, for the same reason — `vite preview`
injects no HMR client.

## Build the standalone HTML

```bash
npm run build:unified
```

Writes a single self-contained file to `dist-unified/index.html` — all JS and CSS
inlined, so it opens by double-click and can be shared as one file.

## Why src/index.css declares @source roots

This prototype builds with Vite `root` pointed at its own folder, which anchors
Tailwind v4's automatic source detection here and silently drops every utility
used only under `src/` — the rail loses `bg-rail` and `w-[52px]`, the content
layer loses `bg-fp-surface-1b`, the brand tile loses `bg-brand`. The explicit
`@source "../src"` / `@source "../prototypes"` in `src/index.css` pins the roots
so the generated CSS is identical whichever entry is built. Don't remove them.
