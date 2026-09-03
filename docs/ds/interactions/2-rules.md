# Interactions · Rules & behaviour  *(canonical)*

The normative rules for behaviour, state, feedback, and accessibility. **Single
source** — Do's/Don'ts, Common mistakes, and Checks derive from these.

## Feedback & state
- **Feedback for every action** — loading, empty, success, error states exist. Use
  `sonner` toasts for confirmations, inline `field` errors for validation.
- **State completeness** — design resting / hover / focus / active / disabled /
  loading / empty. A loading skeleton preserves the loaded group's shape.

## Destructive actions
- **Reversible or guarded** — use the 52px stacked confirm (in a table action cell)
  or an `AlertDialog`. Never fire a destructive action on a single unguarded click.

## Focus
- **Every interactive element shows a visible ring:** `focus-visible:ring-2
  focus-visible:ring-ring/50` (add `ring-inset` inside table cells).

## Hover
- **Subtle:** `hover:bg-accent`. For table cells, hover paints the **full cell**
  (`bg-accent` across the whole `td`, no inset outline).

## Accessibility
- **Keyboard-operable** — every control reachable and operable by keyboard.
- **`aria-label` on icon-only buttons.**
- **Contrast ≥ WCAG AA** in both Light and FP.
- **Respect `prefers-reduced-motion`** — gate non-essential motion.

## Charts (Recharts)
- **`var(--token)` does NOT resolve in SVG presentation attributes** — resolve
  tokens to hex at runtime (`getComputedStyle` on an in-tree element, re-read on
  theme change via a `MutationObserver` on `documentElement.class`), or use the
  theme-independent `chart-1..5` hexes.
- **Disable the mount animation** (`isAnimationActive={false}`) — Recharts' reveal
  is rAF-driven and stalls headless; static template charts should render fully.
- Convention: `--brand`/`chart-1` primary series, `--fp-outline-1` gridlines,
  `--muted-foreground` axis ticks.

Build recipes for all of the above: [`6-execute.md`](6-execute.md).

---

# Interaction & behaviour — folded in from `02-rules/`

*Provenance: this ruleset previously lived at `02-rules/interaction-and-behavior.md`,
outside the repo, in two copies that had already drifted from each other. It was
the document handoffs cited as authoritative, which is why its stale rules kept
being carried forward — nobody edits an archived file. Folded in here so it is
versioned, regenerated into `apply-design-system.md`, and reviewed alongside the
code that implements it.*

*Corrections applied during the fold, each one deliberate rather than silent:*

1. *Bulk-action bar surface/radius/shadow — was `--color-popover` / `--color-card`,
   `--radius-md`, `--shadow-md`. `--popover` is byte-identical to
   `--fp-surface-1b` in both themes, and **FP DS 2026 has no `shadow/md` at
   all**. Now `--fp-card-1`, `rounded-lg`, `--shadow-fp-overlay`.*
2. *Data-container surface — was `--color-card`; the content layer is
   `--fp-surface-1b` with no outer border.*
3. *Primary-CTA placement — the "never inside the toolbar" rule is marked
   superseded and points at its replacement.*
4. *Destructive colour — a carve-out added for the final confirm in a guarded
   flow, which the shipped `BulkEditDialog` relies on.*

## 1. Editing model

- **One editable-table primitive**, distinguished by a `mode` prop:
  **static (read-only)** ↔ **dynamic (editable)**. Covers read-only and editable
  data tables, tier tables, and pickers. Cell editors: text,
  number(+unit), single-select, searchable-select, chip-multiselect.
- **Inline cell editing**: a cell expands in place (chevron) to its editor; edits
  save inline. Use for quick edits within a data table.
- **Full-page form** (not a modal) for create/edit of any non-trivial record.
  Header (title + context + close), stacked sections, **sticky footer** with the
  primary save ("Confirm and Save" / "Update and Save"). Modals are reserved for
  short, single-purpose tasks.

## 2. Selection & pickers (standardize ONE)

- Canonical picker: **empty-state CTA → search + option list → selected items
  become removable chips** ("N Added") → collapses to chips + "Add More".
- List presentation: standardize on **checkbox rows** for multi-select (chips
  above for what's chosen). (Flows showed both checkbox and per-row "+ Add";
  pick checkbox as the default.)
- **Cardinality is explicit in the affordance:** multi → "Add"; single → "Replace".
- **Type/mode toggle** (radio-card group) may **swap the form body**: e.g.
  scalar input ↔ tiered/ranged editable table.

### 2b. Helper text
**Helper text sits 4px under the control it describes** — input, select,
dropzone, table, anything. It is part of that control, not the next thing down
the form: at a field gap it floats between two controls and gets read as a label
for the one below. Label→control keeps the field's own rhythm; control→helper is
4px, always.

## 3. Disclosure & feedback

- **Progressive disclosure**: start minimal (a selector or CTA); reveal detail on
  action. Don't render empty complex UI up front.
- **Save → toast → recompute → propagate.** On save: show a success toast,
  recompute derived values (effective price, sums, totals), and update related
  state. Observed propagations: scope badge **Customer → ShipTo**, pending
  **counter decrement**, **new row prepended** to its list (recency ordering).
- **Breakdown popover**: any aggregated/rolled-up value is clickable → a popover
  with its itemized breakdown. Covers calculation rollups (→ Grand Total),
  interval/tier tables, and **count → member list**.
- **The breakdown idiom extends to diagnostic disclosure**: a summary
  banner with severity-coded counts ("2 over capacity · 2 incompatible")
  expands via **Show Details** into a per-row issue table. Same shape, applied
  to validation problems rather than computed totals. Severity vocabulary:
  **amber = warning** (soft limit), **red = error** (hard mismatch),
  **yellow/neutral = info** (missing data). Diagnostics are **non-blocking**
  by default — Confirm stays enabled and the user proceeds on judgment;
  block only for hard-safety or destructive operations.

## 4. Tables (list & data)

- **Standard toolbar**: search · column filter · **Filters** (with active-count
  badge) · Group By · **saved Views** · primary **create CTA**. Views capture
  table state (filters/group/columns) under a name; the Views control splits
  **Preset** vs **Saved**, is searchable + reorderable, tracks an **Unsaved
  Changes** dirty state (Discard / Add New), and saving a view emits a toast.
- **Cell vocabulary**: value-only · **value+meta** ("$1.05 / 2 margins";
  "Volume Based / N intervals") · link (breakdown or navigate) · **count→popover**
  · status (Active/Inactive) · scope badge · trailing settings gear.
- **Row expansion / inline edit** via chevron.
- **Grouping**: a single-select Group By (e.g. Customer / Product / Index) turns
  the table into collapsible **group-header rows** with adaptive member-count
  summaries; expanding reveals the nested rows. The active dimension shows as a
  removable chip. Selection/inline-edit behave identically in grouped mode — the
  table is **one component with modes** (flat · grouped · selectable · editable),
  not separate components.
- **Bulk + context bar** (sticky bottom): select-all, count of filtered subset,
  clear-filters, bulk actions.
- **Faceted filtering**: a two-pane panel (facet list with per-facet counts +
  options) with Clear all / Apply. On apply → toast, a count badge on the Filters
  button, and an **applied-filter chip bar** (removable chips + "N More" overflow)
  below the toolbar. Hierarchical facets (e.g. Customer→ShipTos) use a **tree
  multi-select with tristate parent checkboxes**.
- **Empty-state rows**: NA cells + a per-row CTA (e.g. "Setup Pricing").
- **Pagination** footer.

### 4a. Totals and the add row — an editable table's two ends

**T1 — A total is a ROW of the table, never a caption under it.** Render it as a
`<tfoot>` row on the same grid as the body: the label right-aligned in the cells
before the measure, the sum in the measure's own column, action columns empty. A
total placed outside the table has to be aligned to that column by hand, drifts
the moment a column width changes, and reads as a note about the whole table
rather than the bottom of one column.

**T2 — The total appears only once a row carries real content.** A total over an
empty table says "0" about something that has not started. Where every row is
qualitative rather than numeric (all "top-off", all "TBD"), the total says that
word instead of a number, because there is nothing to add up.

**T3 — The measure excludes rows that state no value.** A row flagged as
"decided later" contributes nothing, even if it still carries a number typed
before the flag was set — that number is kept so unsetting the flag hands it
back, and must not leak into a sum nobody promised.

**T4 — "+ Add" stays ATTACHED TO THE TABLE'S SQUARED BOTTOM-LEFT CORNER, below
the total.** `rounded-b-md border border-t-0`, h-8, muted label, on the table's
own bottom edge. It is chrome hanging off the table, not a row of it: a row
would sit inside the total's grid and be counted by the eye as data. The order
down the table is therefore *rows → total → add*, and the total keeps its place
as the table's last line whatever gets added next.

**T5 — A column of checkboxes is NAMED.** If the tick does something specific
("Top off", "Include"), the header says so and the tick means that one thing.
An unlabelled selection column needs a control elsewhere to explain it, and then
the same tick means different things depending on that control's state.

## 4b. Bulk operations

- **Row multi-select → sticky bulk-edit bar**: "N Selected" + per-attribute edit
  actions. Each action opens the **same editor primitive** used for single edits
  (searchable-select for single-value attributes; chip picker for multi-value).
- **Bar shape**: a small set of **fast-path actions inline** (the most-common
  operations for that record type) + a **`More ▾`** menu for the long tail.
  More is organised into two labelled groups: **"Set or change"** (attribute
  mutations, two-column layout for many attributes) and **"Apply an action"**
  (compound/state actions like Duplicate, Verify). Inapplicable options are
  **visible-but-disabled**, not hidden.
- A trailing **destructive (trash)** affordance + **dismiss (✕)** sit separate
  from the per-attribute mutations.
- **Three tiers of bulk-attribute editor** — pick by the attribute's cardinality:
  - *Tier 1 — scalar* (same value applies to all): single input dialog
    (e.g. Extend Planned Time). Optional two-step preview (see below).
  - *Tier 2 — single-value-per-row* (pick one value, applies to each row):
    searchable-select dialog (e.g. Driver, Truck).
  - *Tier 3 — multi-value-per-row* (each row carries a collection):
    a richer dialog with **mode tabs** (`Edit per <group>` vs `Replace all
    <attribute>`), **grouped sub-editors** (one mini-editor per existing
    value, scoped `N parents · N children`), and **inline diagnostic banners**
    (per §3) for per-row constraint problems.
- **Add vs Replace** is the underlying semantic for any non-scalar bulk edit
  — expressed as **radio cards** when each mode is light, or as **mode tabs**
  when each mode owns a non-trivial body. Same semantic, two layouts.
- **Destructive bulk replace requires confirmation** ("N … will be replaced by
  X" → Cancel / Confirm).
- **Bulk mutations that change a computed value across rows take a two-step
  shape**: (1) input dialog (header leads with scope + count), (2) **per-row
  before/after preview** with `Go back` / `Confirm`, (3) commit. Pure
  replace-all mutations (where a preview adds no information) stay
  single-step.
- **Apply → toast → recompute across every affected row.**
- One sticky-bottom bar component, two modes: **bulk-edit** (acting on a
  selection) and **context** (framing a filtered subset).
- **Visual treatment** (smoke-test corrected): the bar is a **compact
  neutral floating pill** — not a full-width toolbar.
  - Surface: `--fp-card-1`, 1px `--color-border`, `rounded-lg`,
    `--shadow-fp-overlay`. Centered horizontally above the pane
    footer, ~720px wide max (content-sized).
  - Left: a small **count chip** with an inline dismiss (`N Selected ✕`),
    visually a single token.
  - Actions: **icon + label, all equal visual weight**, neutral surface.
    No primary fills inside the bar. No ghost-vs-solid hierarchy. Apply
    spacing-2 between actions.
  - Destructive: a small icon glyph in `--color-destructive` — no fill, no
    tinted background.
  - `More ▾`: the same neutral icon+label as the others, last in the row.

## 5. Navigation & shell

- **Management hub**: back-nav header + **entity-type tabs**, each tab = a list +
  create/edit form for one reference entity.
- **Tabbed section pages** with right-aligned section links.
- App shell is always the **DS sidebar shell** (52px rail + 256px sidebar +
  content), never the legacy top-nav seen in the references.
- **Two-pane workspace** is a recognised page archetype for operations where
  two surfaces must be cross-referenced live (orders ↔ shift planner; pricing
  ↔ tank levels). Panes stack with a resizable divider and each carries its
  own drag-handle / fullscreen / close controls — independently dockable.

## 6. Status & lifecycle

- **Labelled toggle row** (label + helper + switch) controls active/inactive;
  reflected as a status value in lists. List fields are a **projection of form
  fields** (status toggle ↔ status column; picker count ↔ count cell).
- Records carry lifecycle states (e.g. shift **COMPLETED**) shown as a status
  control, sometimes with a dropdown to change state.

## 7. Banners & notes

- **Action/reminder banner**: pending-work summary + CTA ("49 pending · Show All").
- **Dismissible info note**: contextual, closeable.

## 8. Board / detail / outreach archetypes

### 8.1 Status Kanban board
- Lanes = states of one **status machine**; each lane has a colored header and
  a count badge.
- **Drag a card across lanes → transitions the record's status.** The same
  transition fires from anywhere else that can change status (see §8.5).
- Each lane can carry its own footer **`+ Create`** for in-place record
  creation in that initial state.
- **Card-level status decoration**: optional full-width ribbon at the bottom of
  a card for cross-cutting flags (Urgent, Overdue, At Risk).
- Page-level actions (e.g. Accounting Sync) live in the page header, not on
  cards or lanes.

### 8.2 Entity card
A reusable card molecule for a record summary:
header (id + small color-coded **stage badge**) → body of **label / value**
pairs → optional ribbon. The same card is used in Kanban lanes, related-record
sections, and search results.

### 8.3 Alternate-view toggle on a list
A segmented control next to the standard toolbar that flips the same dataset
between representations: **Board ⇄ Table**, **Table ⇄ Map**. The toolbar
(search, filters, views, date range) is shared across views; only the body
rendering changes. Group-by/saved-views still apply where they make sense for
the active view.

### 8.4 Record-detail overlay (read view with light inline edits)
Opens from a card or row click. **Default container = Side Sheet** for deep
detail next to the list, or **Modal** for peek. Structure:
- Header: title + record id + utility actions (Download, Share) + close.
- Collapsible **accordion sections** (Order Details · Delivery Partner · …).
- Inside a section, a **property grid** (§8.6) on top, **sub-entity tables**
  below, and a **document gallery** (§8.7) when relevant.

This is a **detail / read view**, distinct from the **full-page form** rule
for non-trivial create/edit (§1). Read-with-light-edit → overlay; substantive
create/edit → full page.

### 8.5 One state machine, many surfaces
A record's status transitions are defined once and exposed through *every*
surface that touches the record — board drag, status dropdown in the detail
overlay, bulk-edit on the list. Same allowed transitions, same side effects
(toast + propagation, §3). Surfaces never invent their own transitions.

### 8.6 Property grid with mixed-affordance rows
For detail views, use **one property-grid molecule** with row variants — *not*
seven separate field components:
- static value
- inline-edit (pencil) — opens a small inline editor on click
- link (opens a related view or external resource)
- dropdown (drives a state machine or enum)
- value-with-helper-note (small caption clarifies meaning/visibility)

Two-column layout on desktop; collapses to one column on narrow widths.

### 8.7 Attachment / document gallery
For records that carry files: thumbnail cards with name + kebab (preview,
download, rename, delete), an **Upload** affordance, and horizontal **carousel
arrows** for overflow. Same molecule for images, PDFs, contracts.

### 8.8 Row action with lifecycle state
A data-table row action can **double as a state indicator**: the button label
*is* the current state (`Invite` → `Invite Sent` → `Invite Re-sent`), and the
**kebab next to it exposes transitions** (Re-send · Acknowledge · Submit ·
Cancel). Generalizes far beyond invites — any per-row workflow with multiple
transitions follows this shape.

### 8.9 Message-composer dialog (outreach)
For sending a templated message about a record (invite a partner, escalate to
a customer, notify a driver):
- Fields: **To · Subject · Personal Message**, all required.
- Subject + Body are **prefilled from a template** that references the record
  (`"<Broker> | Delivery Order Request #<OrderNumber>"`).
- Sends to a real channel (email/SMS/in-app) — on success: toast +
  state-propagation on the originating row (§8.8).

Same composer shape applies regardless of the channel; the To field's input
type adapts (email vs phone vs user-picker).

---
