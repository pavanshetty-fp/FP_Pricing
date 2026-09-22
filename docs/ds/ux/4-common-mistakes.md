# UX · Common mistakes (❌ / ✅)

Anti-patterns for structure & grouping, each pointing back to a rule in
[`2-rules.md`](2-rules.md). (The in-app **Do's and Don'ts → Common Mistakes** page
renders these as visual pairs.)

## Shell & header
- **Page frame (L1/L2)** — ❌ a *page-owned* top-bar duplicating the global chrome · ✅ the AppShell: one Tier-0 global top bar (brand · search · account) + a compact content header (breadcrumb-as-title, no divider) → tabs → toolbar.
- **Header stack (L5)** — ❌ breadcrumb + tabs + a heavy toolbar on a three-row list · ✅ each unit earns its place; a simple screen is just title + a minimal toolbar.
- **Breadcrumb (L5)** — ❌ a one-item crumb on a top-level screen, or crumbs that don't navigate · ✅ show only ≥2 levels deep, every crumb navigable, last crumb static.
- **Tabs (L5)** — ❌ tabs used to jump between different pages, or a lone single tab · ✅ tabs = facets of one dataset; one facet → no tab row.
- **Toolbar (L5)** — ❌ search + filters + group-by on a trivial list, or two filled CTAs · ✅ only supported controls, filters left, one neutral primary right.

## Navigation
- **Rail depth (N1)** — ❌ section headings or grouped sub-categories inside the 52px Tier-1 rail · ✅ the rail stays flat, one item per top-level screen; groups and dropdowns go in the Tier-2 drawer.
- **Stale tier decision (N2)** — ❌ "this app has no drawer" carried forward after a module gained sub-categories · ✅ re-derive the tier question every time the destination list changes.
- **Duplicated nav capability (N3)** — ❌ teaching `NavRail` to render group labels · ✅ use `NavigationDrawer`, which already renders labels and collapsible children.
- **Reading a mock by width (N1)** — ❌ assuming a 256px grouped panel is the expanded rail · ✅ check the surface: rail = `bg-rail`, square, flush; drawer = `bg-sidebar`, rounded, shadowed.

## Side sheets
- **Saving (S1)** — ❌ a Save button, an Update, or a Cancel on a sheet that autosaves · ✅ autosave + the draft chip; Close is the exit and the primary is the next act.
- **Silent draft (S1)** — ❌ keeping a draft with nothing on screen saying so · ✅ `DraftStatusChip`: nothing before the first keystroke, then saving, then saved.
- **Primary's label (S2)** — ❌ "Waiting on partners" on a button · ✅ the act on the button, the waiting in the strip.
- **Dead primary (S2)** — ❌ a clause parked permanently beside it · ✅ disabled, with one imperative sentence on the press.
- **Width (S3)** — ❌ `xxwide` because the sheet is long · ✅ `xxwide` because the step is two columns; width is per step.
- **Column mixing (S3)** — ❌ a computed total sitting among the fields that produce it · ✅ editable left, derived right, so the reader can tell them apart.
- **Strip item (S4)** — ❌ "Customer", with no way to reach it · ✅ "Choose a customer", pressable, scrolling to the section and blinking it once.

## Hierarchy
- **Elevation (H2)** — ❌ same-weight fill nested on the same fill · ✅ step up one surface (`surface-1b → card → fp-card-1`).
- **Emphasis budget (H3)** — ❌ several groups/CTAs all emphasized · ✅ one primary per view; the rest quiet.
- **Dense row (H4)** — ❌ unaligned elements crammed into a row · ✅ a fixed set of ordered slots (identity · data grid · viz · action).

## Grouping *(reserved — pending)*
The 12-theme **grouping-failure catalog** (proximity/spacing, containment,
separation method, hierarchy, semantic grouping, action grouping, toolbar
composition, row/cell, labels, state, responsive, cross-zone) is being pruned. Once
finalized, its surviving scenarios land here as ❌/✅ pairs with their derived rules
in [`2-rules.md`](2-rules.md).
