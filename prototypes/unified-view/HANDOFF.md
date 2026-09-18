# Handoff — continue the Unified View prototype

Paste everything below the divider into a fresh chat opened at the repo root
(`/Users/pavanshetty/Documents/FP DS 2026/FP-DS-2026`). It is self-contained.

---

You are continuing work on the **Unified View** prototype in the FleetPanda
Design System repo (`git@github.com:pavanshetty-fp/FP-DS-2026.git`).

## First, get it on screen

```bash
git branch --show-current      # expect: feat/3pl-module (or main once merged)
npm run dev:unified            # serves the prototype at the ORIGIN of :4300
```

Open **http://localhost:4300/** — that is the prototype, from source, with HMR.

To look at the shipped artifact instead:

```bash
npm run build:unified          # -> dist-unified/index.html, one self-contained file
npm run preview:unified        # serves it at http://localhost:4173/
```

### Five things that will waste your time if you don't know them

1. **Never open the prototype as a path under the gallery's dev server**
   (`:5173/FP-DS-2026/prototypes/unified-view/index.html`). It renders, but Vite
   injects its HMR client and any dev-server restart reloads the tab to the
   server root — the DS gallery. "The wrong HTML keeps loading" was this.
   Port 4300 serves it at the origin, so there is nothing to lose.
2. **`navigate` with `force: true` does NOT bust the cache** on a static/preview
   server. It 304s and you keep looking at the old bundle. Append a changing
   query instead: `http://localhost:4173/?v=<anything>`. I lost a round of
   debugging to this — source, disk and wire all said the fix was there while the
   DOM showed the old classes.
3. **There are TWO `.claude/launch.json` files, and the harness reads the one in
   the PARENT folder** — `/Users/pavanshetty/Documents/FP DS 2026/.claude/`, not
   the repo's. Chat sessions are rooted at the parent directory, so that is the
   config `preview_start` and the pane's play button actually use.

   This was previously written up as "`preview_start` ignores the `name`". It
   does not. The parent config simply defined one entry — `fp-ds-dev`, running
   `npm run dev`, i.e. the GALLERY — so every server start produced the gallery
   whatever name was asked for, and the pane then rebound to it and reclaimed the
   tab on any pane operation (a `resize_window` was enough). That is the real
   cause of "the wrong HTML keeps loading".

   Both files now list **`unified-view` first**, so a bare `preview_start` and
   the play button both bring up the prototype on `:4300`. Note the parent file
   is OUTSIDE the repo and therefore not version-controlled — a fresh clone gets
   the repo's copy only, and the parent one has to be recreated by hand.

   Also: `UNIFIED=1 vite` runs with `strictPort: true` on 4300, so it fails
   rather than falling back if anything else holds that port. An orphaned dev
   server from an earlier session squatting on 4300 will block it; free the port
   before starting.
4. **`src/index.css` must keep its `@source "../src"` / `@source "../prototypes"`
   lines.** The prototype builds with Vite `root` set to its own folder, which
   re-anchors Tailwind v4's source detection. Without those lines every utility
   used only under `src/` is silently dropped: CSS falls ~136 KB → ~20 KB and the
   rail loses its width and background. If a merge ever drops them, that is the
   cause.
5. **`tsconfig.app.json` includes `"prototypes"`.** It used to be `["src"]` only,
   so prototype files were silently unchecked and `tsc` reported clean while
   nothing was verified.

## What this is

A standalone recreation of the FleetPanda console, built entirely from
design-system components. It is deliberately **not** a section of the FP DS 2026
gallery — it has its own entry point and ships as its own HTML. `src/App.tsx` is
untouched. Read `prototypes/unified-view/README.md` for the boundary.

**Three modules are built** — Sales, 3PL and Service Work — plus Lease and
Pricing, which have no destinations because their IA has never been specified.

**Shell:** Tier-0 top bar (Profile lives in the account menu) · Tier-1 52px rail
with the module switcher + that module's top-level areas · **Tier-2 drawer where
an area has a second nav level**, otherwise none and the content layer takes the
full width.

**READ THE DOCUMENTS BEFORE CHANGING ANYTHING.**
`docs/unified-view/map.md` routes to this app's own component, layout and
interaction documents and to the evals that check them;
`docs/ds/00-meta/map.md` routes to the design system, which is the parent and
wins every disagreement. Anything settled here that would be true in any
FleetPanda product is promoted UP into `docs/ds/`, never copied.

The drawer is **per rail item, not per module**. Sales' four destinations have no
second level, so Sales still renders with no drawer. 3PL's two areas — Orders and
Directory — each declare one in `SUB_NAV`, so selecting either brings up the
256px `NavigationDrawer` beside the rail.

**Do not put sub-categories in the rail.** That was tried on 2026-09-02 and is
wrong: the rail is one level per the shell rule (UX N1), and `NavigationDrawer`
already renders group headings and collapsible children. The mistake was easy to
make because the hover-expanded rail is also 256px wide — tell them apart by
surface, not width: rail = `bg-rail`, square, flush; drawer = `bg-sidebar`,
rounded, shadowed.

**TWO MODULES ARE BUILT**, and the module switcher does real routing — a module
owns a destination list, and switching swaps the list along with the screen under
it. Destination keys are globally unique (`3pl-customers`, not a second
`customers`) so a stale key cannot resolve into the other module's screen.

| Module | Destinations | State |
|---|---|---|
| **Sales** | Fuel Orders · Asset Orders · Customers · Assets | all four built |
| **3PL** (brokerage) | Orders · Vendors · Customers · Assets | Orders built |
| Lease, Pricing | — | no destinations; their IA has not been specified |

**Sales, built:** all four screens and their sheets. `prototypes/unified-view/` —
`UnifiedView` (shell + module routing), `FuelOrdersTable`, `FuelOrdersToolbar`,
`FuelOrdersFilters`, `FuelOrdersViewBar`, `DateFilter`, `FuelOrdersBulkBar`,
`OrderSheet`, `ProductTable`, `TokenMultiSelect`, `BreakdownCard`,
`AssetOrdersScreen`, `CustomersScreen`, `AssetsScreen`, the generic `ListTable` /
`ListToolbar` / `ListFilters` / `RecordSheet` / `useSavedViews`, `GlobalSearch`,
`data.ts`, `types.ts`.

**3PL, built:** the Order Dashboard. `prototypes/unified-view/threepl/` —
`BrokerOrdersScreen`, `BrokerBoard`, `BrokerOrderSheet`, `orders.ts`,
`vendors.ts`. **Read `threepl/README.md` before touching it** — it is the only
part of the prototype whose model is transcribed from a written spec rather than
screenshots, and it carries its own open questions.

**Not built:** the 3PL Vendors / Customers / Assets screens (honest "not built
yet" states), the Lease and Pricing modules entirely, and the Sales Create Order
**Extraction** tab, which was never captured.

### Behaviour worth knowing before you change things

- **Columns:** Order # · Type · Customer · Product · Qty (Gal) · Date of
  Delivery · Planned Date & Time · Status · Driver · Tags · sticky chevron.
- **Status is DERIVED from driver** — driver ⇒ Assigned — in `data.ts`, the
  sheet, and bulk edits. There is no status field anywhere. See the open question
  about this; it contradicts the source app.
- **Product and Tags cells truncate by MEASURED width**, not a fixed count: a
  hidden sibling measures the real string/badges and a ResizeObserver recomputes.
  Overflow goes behind a `+N` hover card.
- **The date filter scopes the list.** Row dates are derived as offsets from
  *today*, so the Today/Yesterday/Tomorrow labels stay correct on any day.
- **Views capture and restore state** (search, sort, hidden columns, page size,
  delivery date) with a dirty dot and rename/update/delete — this is the DS's
  finalized interaction from `data-action-control/DataActionControl.tsx`, NOT the
  `PresetTabs` helper in `experiments/dac-rebuild`, which is archived
  (`arc-rebuild-*` in App.tsx's ARCHIVE_KEYS) and only stubs view creation.
- **Qty is never an input** anywhere — it is the sum of the product lines.

## House rules

- **Visual values come from the DS, never invented.** Tokens in
  `src/index.css`; no raw hex in components. Structure and behaviour may come
  from the source app's screenshots, but never its pixel values.
- **A side sheet with editable fields AUTOSAVES** — always, creating or editing,
  with the draft chip and no Save, Update or Cancel. It is a DS rule
  (`docs/ds/ux/2-rules.md`), not a per-sheet choice.
- **A sheet's footer primary is the NEXT ACT on the record**, never Save. What
  it is waiting on goes in the strip above the footer; why it is dead goes in a
  tooltip on the press.
- **The second screen to need a component is the promotion signal.** Two copies
  is not a preference, it is a defect — `PendingStrip` was extracted the day the
  second sheet wanted it.
- **Verify in BOTH themes, and measure — don't eyeball.** Three separate bugs
  here existed only in dark mode, and one was a literal `[0,0,0]` RGB delta that
  looked perfectly fine in a screenshot. Read computed values and confirm a fill
  actually differs from the surface behind it.
- **Watch for `--<token> == --fp-surface-1b` collisions.** This has bitten three
  times: `--muted` (row hover + selection invisible), `--popover` (bulk bar
  invisible), and it is why `bg-muted` is unusable as a fill on the content
  layer. If something "has no contrast", check the token before picking a shade.
- `npx tsc -b --noEmit` and `npx eslint .` must pass. One pre-existing
  `react-refresh` warning in `FuelOrdersViewBar` is expected.
- Commit per logical change, and state in the message what was measured.

## Five components are FORKED from the DS — do not let them drift

Each exists only because the DS version cannot be pointed at another dataset.
All four carry a `DS FOLLOW-UP` comment naming exactly what to parameterise; when
the DS is fixed, the fork should be deleted, not maintained.

| Fork | DS original | Why it was copied |
|---|---|---|
| `TokenMultiSelect` | `form-layout/MultiSelect` (Figma 27593:15012) | hardcoded options + label, private state |
| `ProductTable` | `form-layout/EditableTable` (27593:15012 / 27592:33634) | hardcoded columns/options/rows, not in the barrel |
| `FuelOrdersBulkBar` | `tables-layout/BulkActionBar` (27631:11151) | hardcoded verb set; also fills with `bg-popover` |
| `BreakdownCard` | anatomy of `info-cards/InvoiceCard` (27599:62303) | the DS has no small breakdown card |
| `threepl/BrokerBoard` | `kanban-board/KanbanBoard` (27631:11154) | takes **no props at all** — lanes, colours, card fields and even the card title are module constants. Its header also documents **two measured DS bugs** the DS demo cannot show: cards collapse instead of the lane scrolling (34.4px box around 188px of content at 8 cards), and the lane count pill's `text-white` fails AA on five of ten lane colours (yellow 1.92) |

`CodeDisc` and `StatusChip` were the same story and the DS chat generalised them,
after which the local copies were deleted — that is the pattern to repeat. There
is a ready-made brief for the DS side at `docs/handoff-ds-adoption.md`.

## Open questions — do not silently decide these

1. **Status derived from driver contradicts the source app.** Two transcribed
   rows carried a driver AND "Unassigned" (source orders 4592861 "Shriya Test 2",
   4592860 "Shriya"), so real status looks like a separate lifecycle, not a
   function of driver presence. Those two seeds were made driverless to satisfy
   the requested rule. If status has its own lifecycle, it needs to go back to an
   explicit field.
2. **"Add tax" vs "Add tags"** in the bulk bar. The request said *tax*; it was
   built as *tags*, since nothing on the screen carries a tax field. Fuel tax is
   a real attribute — if tax was meant, the order needs a tax field first.
3. **The Delivery Ticket section (PO Type, PO #) was dropped** from the order
   sheet when the sections were re-specified and it was not in the new list.
4. **Tags are order-level**, not per product line. "add their quantity tags as
   well" was read that way to match the table's Tags column.
5. **Bulk Products collapses each order to one line**, keeping that order's own
   total. It does not rewrite quantities. Confirm that is the wanted semantic.
6. **Date of Delivery is not editable in the sheet** — it was removed on request,
   so only the planned date/time can be changed there.
7. ~~**`StatusChip variant="text"` fails AA on light surfaces**~~ — **RESOLVED.**
   The light `--status-*` step-down landed (green-600 -> green-700, amber-600 ->
   amber-700). Re-measured on the 3PL table: light **4.83–5.99**, dark
   **5.91–7.62** across all seven stages. `text` now measures 5.02 in light where
   it used to be 3.19.
8. **The order sheet overrides the DS sheet rhythm** — 20px between fields and
   40px between groups, versus the DS's 12/28 — because this sheet carries far
   more fields than the DS reference. Flagged in the file header. If more screens
   need it, that argues for a second sheet density in the DS rather than
   per-screen overrides.

## Sample data — real vs invented

Order numbers, customers, ship-tos, products, drivers, quantities and planned
times are **transcribed** from the source app. Invented, and flagged in
`data.ts`: per-product gallon splits (row totals are real, the splits are
apportioned), the tag values (the source tag control was empty in every capture),
two rows typed Extraction (all captures were Delivery), and the two rows made
driverless per open question 1. The **Category** filter facet renders an explicit
"options not captured" message rather than inventing options.

## Branch state

`feat/3pl-module`, **235 commits ahead of `main`, and pushed to origin.** Ask
before merging. The user works main-based per `START-HERE.md`, so a branch is a
deviation they should decide about; it exists because this pass changes a DS
component (`ModuleSwitcher`) as well as the prototype.

Three branches are in play, so be precise about which has what:

| Branch | Holds |
|---|---|
| `main` | the DS, and the Sales screens as of the last merge to it |
| `feat/unified-view-prototype` | further prototype commits that never reached `main` |
| `feat/3pl-module` | `main` + 3PL + Service Work + the doc set + the DS updates they produced |

**`main` is NOT a superset of `feat/unified-view-prototype`** — verify with
`git merge-base --is-ancestor feat/unified-view-prototype main`, which currently
returns false. `feat/3pl-module` is the only branch that has everything; treat it
as the tip and merge from it, not from either input.

**The shareable artifact is `../FP-DS-2026-unified-view.html`** — one level ABOVE
the repo, outside version control. `npm run build:unified` writes
`dist-unified/index.html`; that file then has to be copied up by hand. Send or
open the parent one, not `dist-unified/index.html`, or you will hand someone a
build from before the last merge. Confirm they match with
`cmp ../FP-DS-2026-unified-view.html dist-unified/index.html`.

### The DS-side change in that branch

`ModuleSwitcher` is now **controlled or uncontrolled**. Pass `activeModule` +
`onModuleChange` when the module drives real routing (the prototype does); pass
neither and it keeps its own state, which is all the gallery needs. `NavRail`
forwards both. `MODULES` moved from `ModuleSwitcher.tsx` to `data.tsx` — a
consumer routing on the module has to be able to name the keys, and exporting a
constant beside a component breaks Fast Refresh for that whole file. That keeps
the lint output at exactly one expected `react-refresh` warning.
