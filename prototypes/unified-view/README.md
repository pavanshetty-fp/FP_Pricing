# Unified View

A **standalone prototype** of the FleetPanda console, recreated on FP-DS.

**Three modules are built**, switched from the module switcher at the top of the
rail — which drives real routing, not just its own label:

| Module | Destinations | State |
|---|---|---|
| **Sales** | Dashboard · Fuel Orders · Asset Orders · Quotes · Customers · Assets | all built; Quotes 2026-10-07 (`QuotesScreen`, `QuoteSheet`, `quotes.ts`, `quoteStore.ts`) |
| **3PL** (brokerage) | Orders · Directory | built; see [`threepl/README.md`](threepl/README.md) |
| **Service Work** | Service Orders · Technicians · Service Settings | built; see [`service/README.md`](service/README.md) |
| Lease, Pricing | — | no destinations; their IA has not been specified, and guessing it would put fake navigation on screen |

The module list is the APPLICATION's (`APP_MODULES` in `UnifiedView.tsx`), passed
to `ModuleSwitcher` as a prop. It used to be a constant inside the DS, so the
only way to add a module this product has was to edit the design system's own
data file — which would have put a FleetPanda module in the gallery's demo.

A module owns a destination list, and switching module swaps the list along with
the screen under it. Destination keys are globally unique (`3pl-customers`, not a
second `customers`) so a stale key surviving a switch cannot resolve into the
other module's screen. Global search spans both modules and carries the module in
each hit, so a 3PL result found from Sales switches module on the way to the
record.

It is deliberately **not** part of the FP DS 2026 gallery. The gallery showcases
the design system; this is an application built *with* it. Keeping them apart
means app-level decisions (this screen's columns, filters, sample data) never
get mistaken for design-system rules.

## Where the documents are

| Doc | For |
|---|---|
| [`docs/unified-view/map.md`](../../docs/unified-view/map.md) | **the router — read it first.** The app's own component / layout / interaction documents, and the evals that check them |
| [`docs/ds/00-meta/map.md`](../../docs/ds/00-meta/map.md) | the design system, which is the parent |
| `threepl/README.md`, `service/README.md` | each module's own decisions |

**The DS is the parent and wins every disagreement.** Anything settled here that
would be true in any FleetPanda product is promoted UP into `docs/ds/`, never
copied into the app's docs.

## It uses the design system, it does not fork it

| Comes from the DS | Owned by this prototype |
|---|---|
| `@/index.css` — every colour, radius, spacing token | the screens and their columns |
| `@/components/ui/*` — button, badge, table, popover, calendar… | the toolbar and filter composition |
| `@/components/app-shell`, `top-bar`, `navigation-drawer` | sample data, and which module owns which destination |
| `@/components/tables-layout` — pagination, bulk bar, Group By | the lifecycle each record type has |
| `@/components/kanban-board` — lane/card anatomy and colour taxonomy | |

**Five components are forked** from the DS, each because the DS version cannot be
pointed at another dataset, and each carrying a `DS FOLLOW-UP` header naming
exactly what to parameterise: `TokenMultiSelect`, `ProductTable`,
`FuelOrdersBulkBar`, `BreakdownCard`, and `threepl/BrokerBoard`. Delete a fork
when the DS version lands; do not maintain it in parallel.

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
