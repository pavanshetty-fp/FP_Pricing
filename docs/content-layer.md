# Content Layer — behaviour & rules

> Status: **IMPLEMENTED** (2026-06-14) — breadcrumb header, width rule, and the
> FP accordion are live; this doc remains the source of truth and may still grow
> with new scenarios.
> Sources: Figma "Content Layer Behaviour and Rules" (`28106:2380`),
> "Accordion & Content Layer Behaviour" (`28099:192`).
> Built in: `AppShell` (two-row header + `breadcrumb` prop), `App.tsx`
> (path derivation), `ui/breadcrumb.tsx`, `component-demos/AccordionDemo.tsx`.

The **content layer** is the `bg-fp-surface-1b`, `rounded-md` panel that sits to
the right of the icon rail and the optional contextual drawer. It is where every
screen's content lives. This doc formalises three things: its **anatomy**, its
**header** (now with a breadcrumb), and its **responsive width**.

The two spacing laws are unchanged and still govern placement:
- **8px** gap between panels (rail ↔ drawer ↔ content) + **8px** outer margin.
- **16px** inset on all four sides inside the content layer body.

---

## 1. Anatomy

```
┌─ Content Layer (Surface-1b, rounded-md, no outer border) ──────────┐
│  Page Header  (fixed, does not scroll)                             │
│    • Breadcrumb row        Home › Settings › Profile details        │
│    • Title row             Title of The Menu        [headerAction]  │
│  ───────────────────────── 1px divider (--fp-outline-1) ────────── │
│  Body  (16px inset; owns its own scroll)                           │
│    …the screen's content arranges here…                            │
└────────────────────────────────────────────────────────────────────┘
```

- **Header** — fixed at the top, never scrolls.
- **Body** — everything below the divider; scrolls independently; carries the
  16px inset (the hard layout rule). Children manage their own internal scroll.

---

## 2. Page header

**Change from today:** the header was a single 48px row showing only the page
title. It becomes a **two-row** header — a breadcrumb line above the title line —
**but only on multi-level paths**. On a single-level (rail-only) screen the
breadcrumb row is **hidden** and the header stays one-row / 48px (see §2 rule).

### Rows
1. **Breadcrumb row** — the navigation path, e.g. `Home › Settings › Profile
   details`.
   - Separator icon: **Lucide `ChevronRight`** (the Figma offers it as a 5-set
     INSTANCE_SWAP; per the locked icon rule we use Lucide only).
   - Ancestor crumbs are muted (`text-muted-foreground`) and **link/navigate**;
     the **last crumb is the current page** — `text-foreground`, not a link
     (`aria-current="page"`).
2. **Title row** — the **"Title of The Menu"**: the title of the page the user
   navigated to. Sourced from the **deepest selected nav item** — it can come
   from the **main menu (rail)** or the **secondary menu (drawer)**. Rendered as
   the 24px semibold heading (today's `text-2xl font-semibold`).
   - **`headerAction`** slot (e.g. the theme toggle) is **right-aligned on the
     title row** (decision c).

### Geometry (confirm exact px against Figma in build)
- **Multi-level path → two-row header, ~72px:** `~12px` top/bottom padding,
  `~16px` horizontal (matching the body inset edge), breadcrumb row `20px` +
  `4px` gap + title row `24px`.
- **Single-level path → one-row header, 48px** (today's header; no breadcrumb).
- 1px bottom divider (`--fp-outline-1`), unchanged.

### Breadcrumb source rule
The breadcrumb is **derived from the active nav path**, not authored per page.
The path is: **a fixed `Home` root → rail item → (drawer group, if any) → drawer
item/sub-item** (decision b). Each segment maps to a nav node; clicking an
ancestor navigates there; the last crumb is the current page (non-link).

**Single-level paths** (a rail-only screen with no drawer, e.g. Dashboard):
**hide the breadcrumb row** and keep the one-row 48px header (decision a). The
breadcrumb only appears once the path is 2+ levels deep (i.e. a drawer item or
sub-item is selected). `Home` counts as the root but does not, by itself, make a
path "multi-level" — the row shows when there is a real rail/drawer path beyond
the current screen.

---

## 3. Responsive width (follows drawer presence)

The content layer is **fluid** — it fills the horizontal space left after the
rail and the optional drawer. There is **no max-width column** and **no collapse
control**; width is purely a function of which nav surfaces are present.

| Nav state | Drawer shown? | Content width* |
|---|---|---|
| **Navigation Drawer expanded** (screen has a contextual drawer) | yes (256px) | narrower (~**1108**) |
| **Navigation Menu default** (rail only, no drawer) | no | wider (~**1372**) |

\* The Figma numbers are the **observed outcomes** at its canvas width, not fixed
breakpoints. The rule is relational: **content reclaims the drawer's width
(≈256px + 8px gap = 264px) whenever the drawer is not present.** This already
happens because content is `flex-1`; this doc just makes it an intentional,
documented rule rather than incidental.

---

## 4. Content-area composition & the Accordion

> Source: Figma "Accordion & Content Layer Behaviour" (node `28099:192`).

### Stacking order inside the body
When a screen stacks these elements, the vertical order inside the content-layer
body is fixed:

```
Page header (fixed)
─────────────────
Action bar
Tabs
Accordions          ← "Accordions come under the action bar and tabs"
…content…
```

i.e. **accordions sit below the action bar and the tabs**, above the rest of the
content. (Not every screen has all of these; the rule is about *order when
present*, not a requirement that all exist.)

### Accordion behaviour
An accordion is a **stacked set of collapsible cards** living in the content
area. Each item is independent (multiple can be open at once).

**Item header (~56px row):**
- Leading **triangle/chevron** (16px) — points right when collapsed, down when
  expanded (Lucide `ChevronRight` rotating, per the icon rule).
- **Title** (semibold) e.g. "Accordion Collapsed".
- Inline **metadata points** after the title: `• data 1 • data 2` — small dot
  (`Ellipse`) separators, muted text. These are summary fields shown on the row
  even while collapsed.

**States:**
- **Collapsed** → header row only (~56px).
- **Expanded** → header row + a **content region** beneath it that holds the
  item's content and grows to fit ("the area of the expanded accordion where the
  content will live").

**Styling:** each item is a bordered **card** on the content surface (distinct
from the bare shadcn accordion, which is just text rows + a bottom divider).

### Gap vs. today
We already have a bare `accordion` primitive (`src/components/ui/accordion.tsx`,
shadcn). To match this scenario it needs a **richer trigger** (title + inline
metadata points) and a **card/bordered surface** style — an FP wrapper or variant
over the existing primitive, decided at build time. No new dependency (Radix
Accordion is already in the unified package).

---

## 5. Out of scope (this round)

- **Collapsible drawer / toggle to reclaim width** — not now; width follows
  drawer *presence* only.
- **Content "layout types"** (full-width / centered / split / grid taxonomy) —
  the frame hints at "content arranges based on layout type"; deferred to a
  later foundation pass.

---

## 6. Implementation notes (for when this is approved)

- Port `breadcrumb.tsx` from the local shadcn clone (exists there; not yet in
  `src/components/ui`) → register in the `ui` barrel. Chevron = Lucide.
- `AppShell` gains a `breadcrumb?` prop (an array of `{ label, key/onNavigate }`
  segments, or a ready node). Header restructures into the two rows; `title` and
  `headerAction` stay as-is.
- `App.tsx` derives the breadcrumb from `MAIN_NAV` + the active screen's drawer
  path (rail label → drawer item/sub-item), passing it to `AppShell`.
- **Accordion:** build an FP wrapper/variant over the existing `accordion`
  primitive — a card-styled trigger with a title + inline metadata points
  (`• data 1 • data 2`) and the rotating chevron. Enforce the stacking order
  (action bar → tabs → accordions → content) at the screen-composition level.
- No change to the spacing laws, the body inset, or scroll ownership.

---

## Resolved decisions (2026-06-14)
- **(a) Single-level breadcrumb →** hide the breadcrumb row; one-row 48px header.
- **(b) Root crumb →** a fixed **`Home`** root, then the rail → drawer path.
- **(c) headerAction →** right-aligned to the **title row**.
- **(d) Exact header height** and breadcrumb type scale — finalise against the
  Figma page-header measurements during build. *(only remaining build-time
  detail)*
