# UX · Do's & don'ts

Quick pointers into [`2-rules.md`](2-rules.md). One line each.

## Do
- **Put every screen in the AppShell** with one header stack. (L1/L2)
- **Include a header unit only when its question is real** — breadcrumb when nested, tabs for real facets, toolbar when the data needs it. (L5)
- **Keep the fixed zone order** — header → toolbar → summary → data — even when a unit is dropped. (L4)
- **Filters left, one primary action right** in the toolbar. (L3)
- **Compose in levels** (Page → Region → Group → Compound-row → Atom); step elevation once. (H1/H2)
- **Build dense rows as fixed ordered slots.** (H4)
- **Keep the Tier-1 rail flat** — one item per top-level screen. (N1)
- **Put sub-categories in the Tier-2 drawer**, as group labels or collapsible children. (N1)
- **Re-derive whether a module needs a drawer** whenever its destinations change. (N2)

## Don't
- **Don't ship a *page-owned* top-bar** that duplicates the global (Tier-0) chrome — the one global top bar (brand · search · account) is canonical; the content header is compact (breadcrumb-as-title, no divider). (L1/L2)
- **Don't use tabs to navigate** between different pages/objects — that's the rail's job. (L5)
- **Don't put section headings or nested groups in the rail** — the rail is one level; the drawer is the second. (N1)
- **Don't extend a nav component before checking the DS** — `NavigationDrawer` already does headings and dropdowns. (N3)
- **Don't render a lone tab, a one-level breadcrumb, or a dead-control toolbar** — no placeholder units. (L5)
- **Don't reorder the header stack.** (L2/L4)
- **Don't emphasize more than one group/action.** (H3)
- **Don't cram unaligned elements into a row.** (H4)
