# View row

`id: unit.view-row` · `layer: unit` · `code: prototypes/unified-view/FuelOrdersViewBar.tsx, prototypes/unified-view/useSavedViews.ts, prototypes/unified-view/filterMemory.ts` · `registry: fpds-view-row`

## Purpose
The first row of every list page: which saved narrowing you are on (All or a view you made), a way to save the current one, and the list's own actions (Create, Export). It answers "which version of this list am I looking at, and how do I add to it or take it out?"

## Use when / Don't use when
- Use when a page shows a list of records (table, board or map) — every list page has one, at the top of the content layer.
- Use the Create CTA as a **menu** (`createMenu`) only when Create means several different records that take different forms (Sales › Orders: Fuel Order / Asset Order / Quote; 3PL › Delivery Orders: Delivery Order / Asset Order).
- Don't use for page-level actions that no list control scopes — those stay in the page header (ux "Action placement").
- Don't use the row for business / line-of-service presets — those are filters in the `unit.filter-panel` (ui §10p).
- Don't build a whole list from parts by hand when it is a plain table page — use `unit.standard-list`, which already contains this row.

## Anatomy
1. **All** tab — the resting state; holds the underline when no saved view is on.
2. **Saved view tabs** — one per view, in creation order. Each wrapper (`group/tab`) holds:
   - the view name button;
   - **update icon** (`RefreshCw`) — only on the active view while it has unsaved changes;
   - **⋯ menu** (`MoreHorizontal`) — revealed on hover: *Update view* (only when changed), *Rename*, *Delete*.
3. **DirtyDot** — on All only, when All has unsaved changes.
4. **+ View** — opens the *Save current view* dialog.
5. *(optional)* **Segment** (`segments`) — a joined toggle group for two KINDS of record (Customer Portal › Invoices: Invoices · Statement), then a 12px spacer.
6. **Create CTA** — `Button size="xs"` with `Plus` + label; or the same button with `ChevronDown` opening a `w-80` menu (entries: label + optional `detail` line; an entry with `choices` becomes a heading over its own entries).
7. **Export** — ghost `icon-xs` button with the `Upload` icon and an "Export" tooltip; always the rightmost item.
8. **Dialog** — title *Save current view* / *Rename view*; field *View name*; footer *Cancel* (outline) + *Save view* / *Rename*.

Code-supported but switched off by rule: `presets` (business tabs before a vertical rule) — see Rules 2.

## Look
- Row: full panel width (`-mx-4 -mt-4` cancels the content layer's 16px inset, re-padded `px-3`, `pt-0.5`), `border-b border-border` hairline, no bottom padding, `gap-1`.
- Tabs: `text-xs`, `px-3 py-2`, plain buttons with `border-b-2`. Active = `font-medium text-foreground` + `border-foreground` underline that lands ON the hairline (`self-end`). Inactive = `text-muted-foreground`, `hover:text-foreground`, transparent border.
- Update icon: 24px (`size-6`) square, `rounded-md`, icon `size-3.5`, `text-muted-foreground` (gray — never brand), `hover:bg-accent hover:text-foreground`; tooltip "Update changes".
- ⋯: `size-3.5` icon, `text-muted-foreground`, `opacity-0` until the tab is hovered, focused or its menu is open.
- DirtyDot: 6px (`size-1.5`) round, `bg-brand`.
- + View: `text-xs text-muted-foreground`, `Plus size-4`, `rounded-md px-2 py-1`, `hover:bg-accent`, 4px off the hairline (`mb-1`).
- Create CTA: `size="xs"` (24px tall), primary fill, radius a literal 4px (`rounded-[4px]` — the one value off the radius scale; flagged in code), 12px above the hairline (`self-end mb-3`).
- Export: `variant="ghost" size="icon-xs"` (24px), same baseline as the CTA, `ml-1.5` after the CTA, `mr-1` so its right edge lines up with the toolbar below.
- Segment (when used): `ToggleGroup variant="outline" size="sm"`, 28px (`h-7`), items `text-xs`, active `font-medium`.
- Dialog: `sm:max-w-sm`.

## States
- **default** — All underlined, no views.
- **hover** — inactive tab text goes to `text-foreground`; a saved tab reveals its ⋯.
- **focus** — `focus-visible:ring-2 ring-ring/50` on every button; ⋯ becomes visible on focus.
- **selected (active view)** — underline + medium weight on that tab only; only one tab is ever underlined.
- **dirty** — active saved view: gray update icon beside its name, *Update view* appears in its ⋯ menu. All: DirtyDot.
- **open** — ⋯ menu stays visible while open; Create menu open under the CTA, aligned to its end.
- **disabled** — dialog *Save view* is disabled when the box is empty AND there is no suggested name; *Rename* is disabled when the box is empty.
- **empty** — no saved views: All + "+ View" only. No CTA when the list has no create flow (no handler → no button).

## Interactions
| Trigger | Result |
|---|---|
| Press **All** while on a saved view | Parks the view's unsaved changes, restores All's own working state (or the default), All takes the underline. |
| Press **All** while already on All | Drops All's unsaved changes — the list returns to its default state. |
| Press a **saved view** tab (another one) | Parks the current tab's changes, applies that view's working copy (or its saved state), view takes the underline. |
| Press the **saved view you are on** | Puts it back to its saved state — the one way to drop its changes. |
| Press the **update icon** (RefreshCw) | Overwrites the view with what is on screen; icon disappears (view is clean). |
| Hover / focus a saved tab | ⋯ fades in. |
| ⋯ → **Update view** | Same as the update icon. Only listed when the active view has changes. |
| ⋯ → **Rename** | Opens the dialog in rename mode, box filled with the current name. |
| ⋯ → **Delete** | Removes the view at once (destructive item). If it was active, All takes over. |
| Press **+ View** | Opens *Save current view*; the box is empty with a **suggested name** as placeholder (from the filters on), or "e.g. Unassigned today" when nothing is filtered. |
| → or Tab in the empty name box (when a suggestion exists) | Takes the suggestion into the box, followed by a space, to type on from. |
| Enter / *Save view* with an empty box and a suggestion | Saves the view under the suggested name. |
| Enter / *Save view* with a typed name | Creates the view from what is on screen and makes it active; the tab you left becomes clean (its changes moved into the new view). |
| *Cancel*, Esc or outside click in the dialog | Closes; nothing saved. |
| Press **Create** (button) | Calls the screen's create handler — usually opens the record's create sheet. |
| Press **Create ▾** (menu) → an entry | Starts that record's create flow in one click (no selection is held). |
| Press **Export** | Opens `unit.export-sheet` (never exports silently). |
| Change a **segment** | Switches the record kind shown; pressing the active segment again does nothing (never empty). |

## Outcomes
- A list restored to All / default, or to a saved view's state (filters, search, sort, hidden columns, column order and widths, page size, column search and boxes, group-by, date, display mode — whatever that screen's `ViewState` captures).
- A new named view, active, with the screen's current state.
- A renamed view; an updated view; a deleted view (All becomes active if it was the one deleted).
- Unsaved changes kept per tab for the session — leaving a page and coming back finds the same tab, dirty or not (`storageKey`); a page reload starts clean; a dashboard drill arriving with its own narrowing wins (`restore=false`).
- Nothing, when the dialog is canceled or the name and suggestion are both empty.
- A create sheet or flow opening; the export sheet opening.

## Data contract
- `views` — `{id, name}[]` (state is opaque to the row). `activeId` — `null` = All. `dirty` — current state differs from the active view (or from default).
- Callbacks: `onApply(id)`, `onResetToDefault()`, `onCreate(name)`, `onRename(id, name)`, `onUpdate(id)`, `onDelete(id)` — all supplied by `useSavedViews`.
- `useSavedViews({current, defaultState, keyOf, apply, storageKey?, restore?})` — `keyOf` serialises state deterministically (sets sorted, group-by order kept) so drift is not fooled by key order.
- CTA: `onCreateOrder` + `ctaLabel` (default "Create Order"), or `createMenu` `{key, label, detail?, choices?}[]` + `onCreateSelect(key)`.
- `onExport()`. Optional `segments` / `segmentValue` / `onSegmentChange`.
- Suggested name: `suggestViewName()` reads the filters the toolbar's `ListFilters` registered via `setActiveFilters` — no wiring between the two on the screen.

## Rules
1. **The first tab is "All", never "Default".** — *it says what you see: everything, nothing applied.* — `(source: docs/ds/ui/2-rules.md §10p, 2026-10-21)`
2. **No preset view tabs and no line-of-service segment in any module.** Line of Service, Business (3PL) and Order Kind (Sales) are facets in the Filters panel. — *users create their own views; a scope you can't see on the chip shelf is a narrowing you forget.* — `(source: ui §10p; memory project_feedback_round_2026_10_21 point 3)`
3. **A saved view stores its filters AND its arrangement AND its display (table / board / map), and opens in it.** — *a view that restored the narrowing but not the columns rebuilds half the thing.* — `(source: ui §10p; docs/unified-view/3-interactions.md §7)`
4. **A changed view shows a gray `RefreshCw` update icon beside its name, tooltip "Update changes"** — one press saves. — *the update is one press beside the name, not a dot that sends you to ⋯.* — `(source: FuelOrdersViewBar.tsx comment, Pavan 2026-10-21/22; ui §10p)`
5. **Save view suggests a name from the filters on**: business (or line of service when no business), then other facets in panel order; one value = the value, two = "A & B", more = "3 Status"; at most three parts joined " · ". → or Tab takes it; Save with the box empty saves it. — *naming is the friction that stops people saving views.* — `(source: ui §10p "Filters remember; views name themselves", filterMemory.ts, 2026-10-21)`
6. **Each tab keeps its own unsaved changes; pressing the tab you are on is the reset.** — *leaving a view and coming back finds it as it was left.* — `(source: useSavedViews.ts, Pavan 2026-09-24)`
7. **A list remembers where it was left for the session** — filters, search, sort, columns, date, active view, dirty state; only Clear all (or the view's reset) removes them. — `(source: docs/unified-view/3-interactions.md "A list remembers where it was left", 2026-10-09)`
8. **No create handler → no CTA.** — *a button that does nothing when pressed teaches people to ignore it.* — `(source: FuelOrdersViewBar.tsx; ui §10c)`
9. **Create is a menu only when it means different records with different forms**; entries carry names (a `detail` line only where names alone don't separate them — Sales' menu is names only). — `(source: FuelOrdersViewBar.tsx, Pavan 2026-10-05 / 2026-10-07)`
10. **CTA and Export sit at the right end of this row**, Export rightmost carrying `mr-1`. — *the CTA belongs with the scope that decides what it creates; the 4px corrects the row's inset so right edges line up with the toolbar.* — `(source: docs/ds/ux/2-rules.md "Action placement")`
11. **Export always goes through the Export sheet.** — *the moment data leaves is the moment the narrowing must be visible.* — `(source: ExportSheet.tsx; ui §10c)`

## Do / Don't
- ✅ Wire the row to `useSavedViews` with a `storageKey` per list.
- ✅ Let the active tab's 2px underline land on the hairline (`self-end`, no bottom padding).
- ✅ Keep the update icon gray (`text-muted-foreground`).
- ❌ Label the first tab "Default", or add business/LOS preset tabs (the `presets` prop still exists in code — don't pass it).
- ❌ Stub views with no-op handlers or unnamed "View 1, View 2" (parity G1).
- ❌ Put a dot instead of the update icon on a saved view, or color the icon brand.
- ❌ Make the CTA `sm` (32px) — it sits heavy on a row of text tabs.
- ❌ Add a toast on view save beyond one line (toasts rule).

## Checks
- `parity-lists` G1 — the saved-views row is real (handlers wired, not stubbed).
- `fpds-units` — anatomy present in order: All · views · + View · [segment] · CTA · Export.
- `microcopy` — "All", "+ View", "Save current view", "Rename view", "View name", "Save view", "Update changes", "Export".
- By eye: underline sits on the hairline; CTA and Export right edges line up with the toolbar's right edge below; only one tab underlined; update icon appears only on a changed active view.

## Reference
- 3PL › Delivery Orders (create menu with details), 3PL › Recurring Orders ("Create Rule"), 3PL › Directory (Customers, Vendors, Products, Rental Assets — Vendors has no CTA).
- Sales › Orders (create menu, names only), Sales › Quotes, Sales › Customers, Sales › Assets.
- Service Work › Service Orders ("New service order").
- Customer Portal › Orders, › Invoices (segment Invoices · Statement), › Sites & Assets, › Team & Access ("Invite user").
- Service Work › Price Book / Parts / Agreements / Maintenance / Compliance / Performance / Technicians (via `unit.standard-list`).
