# App shell

`id: unit.app-shell` · `layer: unit` · `code: src/components/app-shell, prototypes/unified-view/ModuleSidebar.tsx, src/components/top-bar/TopBar.tsx, prototypes/unified-view/GlobalSearch.tsx, src/components/theme/AccessibilityPanel.tsx, src/components/theme/AccessibilityIcon.tsx, src/components/theme/a11y.ts, prototypes/unified-view/ModuleSkeleton.tsx` · `registry: fpds-app-shell`

## Purpose
The frame every page sits in: the top bar (brand, global search, notifications, account), the one-panel navigation (modules and their pages) and the content layer. It answers "where am I, where can I go, and how do I find anything".

## Use when / Don't use when
- Use when building any page of the Unified View (3PL, Sales, Service Work, Pricing, Lease) or the Customer Portal — the portal reuses `AppShell`, `TopBar` and `ModuleSidebar` with one module.
- Use `ModuleSkeleton` for a module's page while its data loads after a module switch.
- Don't use the two-layer rail + drawer (`NavRail` + `NavigationDrawer`) — it is kept behind `NAV_STYLE = "two-layer"` and comes back only when Pavan says "Bring in the two-layer navigation drawers".
- Don't put a theme toggle in the top bar — Light/Dark lives only in the User view configuration panel.
- Don't put Profile or Settings in the navigation — they are in the account menu.

## Anatomy
1. **`AppShell`** on the shell ground (`className="bg-fp-shell-ground"`), `headerDivider={false}`.
2. **`TopBar`** (full width, top): left — brand tile (`Boxes` icon) + "FleetPanda"; center — search field (`Search` icon, placeholder "Search everything", `⌘K` `Kbd`) + Keyboard shortcuts ghost icon (opens the shortcuts `SideSheet`); right — Notifications bell (brand dot when unread > 0) + Account menu (avatar + chevron → name/email label · Profile · Settings · separator · Log out).
3. **`ModuleSidebar`** (left, in a box): collapse button in the top-right corner · module rows (open module first, then the rest in `APP_MODULES` order: 3PL · Sales · Service Work · Pricing · Lease · Master Data) · under the open module its pages on a guide line — loose pages, small uppercase section headings for areas with sub-pages (3PL Orders, Directory), or a **tree** (`nested`) where a page keeps its row and its pages hang under it on bars (Customer Portal Orders; UV `SUB_NAV`) · nothing at the foot (User view configuration moved to the account menu, 2026-11-16).
4. **Collapsed rail**: expand button · rule · the open module's pages as icons (sections split by short rules) · rule · other modules as icons; every icon has a right-side tooltip.
5. **Module-switch progress**: a 2px bar along the bottom of the chosen row + "Loading data for this module." under it.
6. **User view configuration panel** (fixed, under the avatar; opened from the account menu, under Profile): header "User view configuration" + Reset icon · Theme (Light | Dark) · Text weight (steps) · Text size (steps, − / +) · Component width & space (steps 100–150%: lanes and table columns widen) · Stroke contrast · Fill contrast · divider · Display size (steps 50–150%, − / +) · Screen (Default / Laptop / Tablet / Monitor / Large monitor / TV).
7. **Content layer**: page title (`h1 text-xl font-semibold`) + muted count outside the container; the page body inside (see the page units).
8. **`GlobalSearch`** dialog (opens from the top-bar field or ⌘K): query row (`Search` icon · input · `Esc`) · scope tabs + live count · results grouped by kind (icon tile · title · subtitle · kind `Pill`) · keyboard-hint footer.
9. **`ModuleSkeleton`**: tabs + right controls · toolbar · table header + 9 rows, all shimmering `Skeleton` blocks; the page title is a `Skeleton` too.

## Look
- **Shell tokens** (`--fp-shell-*`): ground `bg-fp-shell-ground` (everything but the content layer, top bar included), nav box `bg-fp-shell-panel`, selected/hover item `bg-fp-shell-selected`, guide line and dividers `bg-fp-shell-guide` / `border-fp-shell-guide`, current-page marker `bg-fp-shell-marker` (a 2px bar sitting on the guide line).
- **Nav box:** `rounded-lg`, no rim, 8px clear of the edges (`py-2 pl-2`); expanded width `w-(--fp-nav-width)` (`calc(15rem * var(--fp-nav-k))`), collapsed `w-14`.
- **Module row:** `h-10 rounded-lg px-2.5 text-sm`, icon 18px; open module = `font-medium`, no fill; others `text-sidebar-foreground/80`, hover `bg-fp-shell-selected`; disabled while switching `text-sidebar-foreground/35`.
- **Page row:** `h-9 rounded-lg px-2.5 text-[13px]`, icon 16px; current = `bg-fp-shell-selected font-medium` + marker; others `text-sidebar-foreground/70`. Section heading `text-[10px] font-medium tracking-wider uppercase text-muted-foreground`. Pages block `ml-5 border-l border-fp-shell-guide pl-2.5`.
- **Collapse/expand button:** `size-6`, `text-muted-foreground/40`, hover `text-muted-foreground`.
- **Progress bar:** `h-0.5 bg-brand`, CSS `.fp-nav-progress` 3000ms linear; note `text-xs text-muted-foreground`, flush with the row (`px-2.5`), no box.
- **Top bar:** `h-12`, NO hairline under it (`divider={false}`, 2026-10-27) — the drawer and the content layer start right under it (`AppShell flushTop`, `ModuleSidebar flushTop`: no 8px top gap), no fill of its own (`bg-transparent`, sits on the shell ground), `px-3 gap-3`; brand tile `size-8 rounded-lg bg-brand text-brand-foreground`; search `h-9 rounded-md`, no rim (`border-transparent`), `max-w-md`; unread dot `size-2 bg-brand ring-2 ring-background`. `data-fp-frame` on the bar, `data-fp-on-frame` on what sits straight on it.
- **Global search:** `Dialog` `sm:max-w-2xl`, `top-[12%]`, no padding; result icon tile `size-8 rounded-md bg-fp-card-1`; active scope `bg-accent font-medium`; list `max-h-[52vh]`.
- **User view configuration panel:** `rounded-md border border-border bg-popover shadow-md`, `w-80`, `max-h-[calc(var(--fp-vh)*0.85)]`, scrolls inside; rows `text-sm font-medium` label + value, slider, `text-xs` end labels; `gap-6` body `p-4`.
- **Skeleton:** DS `Skeleton` = `bg-accent` block with the `.fp-shimmer` sweep (1.4s), never a pulse; table header block on `bg-fp-table-header`, rows `h-14`.

## States
- **default** — open module at the top with its pages unfolded; current page marked.
- **hover** — rows `bg-fp-shell-selected`; top-bar icons ghost hover.
- **focus** — `ring-2 ring-ring/50` on every nav button.
- **selected** — current page `aria-current="page"`, fill + green marker (tree children show no guide marker).
- **collapsed** — icon rail; preference saved (`fp-unified-sidebar-collapsed`).
- **loading (module switch)** — chosen row runs the progress bar with "Loading data for this module." (`role="status"`); every other module row and the left module's pages are disabled and faint until the new module has unfolded; page title and content are `ModuleSkeleton`.
- **open** — the account menu; the User view configuration panel; search dialog.
- **disabled** — Reset icon disabled when all accessibility settings are default; Screen size slider disabled while Auto is on.
- **unread** — brand dot on the bell when `unread > 0`.
- **search empty** — no query: "Recent" (All scope only) + "Pages"; no match: "No results for "…"" (+ " in <scope>").

## Interactions
| Trigger | Result |
|---|---|
| Press another module row | 2px brand bar fills the row L→R over 3s, "Loading data for this module." shows, page becomes `ModuleSkeleton`; then the module switches: pages fold (200ms) → rows glide to the new order (260ms) → new pages unfold (240ms) |
| Press a module row with reduced motion on | Switches at once, no bar or fold/move/unfold |
| Press another module while one is loading | Nothing — the other rows are disabled |
| Press a page row | Navigates to that page; it becomes current |
| Press a collapsed-rail module icon | Switches module (no progress bar) |
| Press the corner collapse / rail expand button | Collapses to / expands from the icon rail; remembered |
| Account menu → User view configuration | Opens the panel under the avatar; focus moves into it |
| Escape or press outside the panel | Closes it; focus returns to the item (menus the panel opens don't count as outside) |
| Change Theme / a slider in the panel | Page changes live, setting saved (`fp-theme-choice`, `fp-a11y`), applies in every module |
| Press Reset (or ⌘⌥0 / Ctrl+Alt+0, or `?a11y=reset`) | Every accessibility setting back to default; theme kept |
| Toggle Auto on Screen size | Zoom picked from this screen's width; slider disabled |
| Click/focus the top-bar search, or ⌘K / Ctrl-K | Opens `GlobalSearch` (the field itself is read-only) |
| Type in Global search | Results across every segment, grouped, ≤6 per group + "+N more in …"; count updates |
| Tab in Global search | Cycles the scope |
| ↑ ↓ / ↵ in Global search | Moves the active row / opens it: switches module + page, opens the record if any, closes the dialog |
| Esc in Global search | Closes; next open starts empty on All |
| Press Keyboard shortcuts | Opens the shortcuts side sheet |
| Press the avatar | Account menu: Profile · Settings · Log out |

## Outcomes
- A different page or module on screen (with its skeleton first after a module switch).
- A record's sheet opened from search.
- User view configuration saved and applied app-wide; or reset.
- Navigation collapsed/expanded and remembered.
- Nothing, when pressing a disabled module during a switch or the already-open module.

## Data contract
- `ModuleSidebar { modules[{key,name,icon}], moduleNav, subNav, activeModule, activeArea, activeSub, onModuleChange(key), onLoadingChange?(key|null), onNavigate(area, sub), nested?[] }`.
- `TopBar { user{name,email,fallback,avatarSrc?}, unread?, onSearchActivate?, searchPlaceholder?, onProfile?, onSettings?, onLogout? }` — without `onSearchActivate` the field is a plain input.
- `GlobalSearch { open, onOpenChange, onNavigate(moduleKey, navKey, recordId|null) }`; index from `searchIndex` (`searchAll`, `SEARCH_SCOPES`, `groupByKind`).
- `a11y.ts`: `useTheme`, `useA11y`, `setTheme`, `setA11y`, `resetA11y`, `A11y { text, stroke, background, ink, screen }`, `SCREENS` (Laptop 16″ 100% · Monitor 24″ 110% · Large monitor 34″ 125% · TV 150%).
- `ModuleSkeleton` — no props; shown while `onLoadingChange` reports a module.

## Rules
1. **One left panel** — modules as rows, the open module's pages under it, collapsible to an icon rail; the two-layer design stays archived behind `NAV_STYLE` — *after the Lovable reference, navigation menu only* — `(source: memory project_nav_style, 2026-10-06; ModuleSidebar.tsx)`. This supersedes the 52px rail + drawer in docs/ds/ux/2-rules.md "Navigation — two tiers".
2. **The open module sits first; nothing else marks it** (weight, no fill, no ring) — `(source: project_nav_style, 2026-10-07)`.
3. **Module switch is sequential: progress → fold → move → unfold** — *Pavan rejected all-at-once; modules take 3–5s to load* — `(source: project_nav_style 2026-10-07/08/09)`.
4. **While a module loads, everything else is locked and the page is a skeleton in its own shape** — *nothing should suggest another module can be picked; the page arrives in the shape it is about to take* — `(source: project_nav_style 2026-10-10, 2026-10-16; docs/ds/ui/2-rules.md §11c)`.
5. **Skeletons shimmer, never pulse** — `(source: ui §11c)`.
6. **A page with sub-pages stays a page row, its pages on tree bars** (`nested`) — `(source: project_nav_style 2026-10-15)`.
7. **Module order 3PL · Sales · Service Work · Pricing · Lease** — `(source: project_nav_style 2026-10-09)`.
8. **User view configuration lives in the account menu, under Profile, in every module (was "Accessibility" at the foot of the nav, renamed and moved 2026-11-16); no header theme icon** — `(source: ui §10n; memory feedback_wcag_modes)`.
9. **Panel order: Theme · Text weight · Text size · Component width & space · Stroke contrast · Fill contrast · divider · Display size · Screen; Reset is the icon alone** — no Text color slider (text follows Fill contrast) — `(source: ui §10n, Pavan 2026-10-21 → 2026-10-26)`
10. **Text size grows the text only** — no box widens; text wraps inside its box and the box grows taller; record numbers and dates never wrap — their table column widens just enough — *"only the text size should increase without the card size increasing"* — `(source: Pavan 2026-10-23)`
11. **Always reachable, always resettable** — panel pinned beside the nav, never wider/taller than the window; ⌘⌥0 and `?a11y=reset`; a narrow zoomed window scrolls sideways — `(source: ui §10n)`.
12. **The brand fill never moves** with Contrast — `(source: feedback_wcag_modes 2026-10-21)`.
13. **Anything sized to the window uses `var(--fp-vw)` / `var(--fp-vh)`** — *a zoomed page multiplies viewport units* — `(source: ui §10n)`.
14. **The top bar has no fill of its own and the search has no rim** — *it sits on the shell ground, which tints it* — `(source: TopBar.tsx, Pavan 2026-10-06)`.
15. **Anything new that sits straight on the shell ground gets `data-fp-on-frame`** — it turns white when the frame goes dark at Contrast ≥ 80 — `(source: ui §10n)`.
16. **Profile and Settings are account destinations** — in the account menu, never in the navigation — `(source: docs/unified-view/2-layouts.md §2)`.
17. **Title and primary CTA sit outside the content container; everything that acts on the data inside** — `(source: 2-layouts.md §1)`.
18. **Sizes are STEPS with − and +** (a dot per step), like Android's "Display size and text"; no preview card — the page is the preview — `(source: Pavan 2026-10-23)`
19. **Component width & space (100–150%, 10% steps) widens board lanes and table columns** — cards follow the lane and keep their padding; cut-off text shows once it fits; nav and sheets keep their width — `(source: Pavan 2026-10-25)`
20. **Display size (50 · 75 · 100 · 125 · 150%, 100 in the middle) zooms everything together; no Auto, not tied to monitors** — `(source: Pavan 2026-10-23)`
21. **Text weight sits on top: six steps, each adding 25 to every weight together** — regular, medium, semibold and bold rise by the same amount, so the hierarchy holds — `(source: Pavan 2026-10-26)`
22. **Screen (after Display size): Default · Laptop · Tablet · Monitor · Large monitor · TV or projector** — Default changes nothing; each screen sets the zoom it is read at (×1, ×1, ×0.9, ×1.1, ×1.25, ×1.5), multiplied with Display size — `(source: Pavan 2026-10-26)`

## Do / Don't
- ✅ Reuse `ModuleSidebar` + `TopBar` + `AppShell` for any new module, the portal included.
- ✅ Give a new color token WCAG light + dark values, an eval pair and a place in `a11y.ts` (Stroke / Background / Ink / `ON_FILL`).
- ✅ Write a new fixed width holding text as `w-[calc(Npx*var(--fp-scale))]` or with `--fp-nav-k` / `--fp-lane-k`.
- ❌ Don't add section headings inside a module's collapsed rail beyond the short rules, or a second drawer.
- ❌ Don't use `100vw`, `100vh` or `h-screen`.
- ❌ Don't make the User view configuration panel a Radix popover (CSS zoom misplaces it).
- ❌ Don't fill a surface with a stroke token.

## Checks
- `parity-shell` — G52 Dashboard first in the rail, module opens on Orders.
- `wcag-contrast` — every bg+text pairing and the hand list pass at the WCAG and Maximum ends.
- `tokens` — no raw hex.
- `fpds-cards`, `fpds-units` — this card's format.
- By eye: module switch runs bar → fold → move → unfold; other rows faint while loading; skeleton matches the page shape; panel opens beside the nav at every Screen size; text grows without cut-offs; frame turns dark at Contrast ≥ 80 with white text on it.

## Reference
- Unified View — every page (3PL › Delivery Orders, Sales › Orders, Service Work › Service Orders); switch modules from the sidebar to see the progress bar and skeleton.
- Customer Portal — same shell, one module, Orders as a tree (Order Requests · Recurring Orders).
- Top bar ⌘K → Global search (Unified View).
- Navigation foot › User view configuration panel (all modules).
