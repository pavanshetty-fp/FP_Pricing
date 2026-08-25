# Handoff prompt — promote the Unified View UI pass into FP-DS 2026

Paste everything below the line into a **fresh chat** rooted at the FP-DS-2026
repo. It is self-contained.

Scope: **format, interaction and UI only.** Every item below is a change to how
a component looks, composes or behaves. Nothing here is about data shape,
wiring or business rules — those are handled separately and deliberately left
out.

Origin: all of it was proven in `prototypes/unified-view` on branch
`feat/unified-view-prototype`. **Task 1's tokens are already committed there**
(`5e6a025`); that branch is not on `main` yet, so check before redoing them.
Everything else lives only in the prototype folder and needs promoting into the
DS proper.

---

You are working in the **FleetPanda Design System (FP-DS-2026)** repo:
`git@github.com:pavanshetty-fp/FP-DS-2026.git`

Read `START-HERE.md`, `docs/apply-design-system.md` and
`02-rules/interaction-and-behavior.md` first. `git pull` before you touch
anything. Non-negotiables: **tokens, never raw hex**; **Lucide icons only**;
**both themes must work** (FP-dark is `.dark` and the default, Light is
`:root`); **one React app**, no new HTML entry points.

Six tasks, independent, one commit each.

> **Verify by measuring, not by looking.** Three defects in this batch were
> invisible in a screenshot and only showed up as RGB deltas — one was a literal
> `[0,0,0]`. Read computed values and confirm a fill actually differs from the
> surface behind it. And when you flip themes to check, **wait for
> `transition-colors` to settle before reading** — reading immediately returns
> mid-transition values, which produced four false readings during this work,
> two of which looked like real contrast failures.

---

## Task 1 — overlay elevation tier, and the bulk bar's surface

**Status: the token half is already committed on `feat/unified-view-prototype`
as `5e6a025`.** If that branch is merged, skip to the "then apply it" step.

**The defect.** The bulk-action bar only ever appears **when rows are
selected**, so its real backdrop on three sides is selected rows. In FP-dark the
selected-row fill is `--accent` `#2a2f37` — byte-identical to the bar's own
`--fp-card-1`. Measured delta between the bar and the surface behind it:
**`[0,0,0]`**. With no fill contrast available the shadow carries the entire
separation, and the bar used Tailwind `shadow-lg` (10% black), which over
`#2a2f37` composites to a delta of **`[4,5,5]`**. Invisible. §4b currently
specifies `--shadow-md`, which is *weaker still*.

**The fix.** The DS has one shadow token, `--shadow-fp-surface`
(`0 4px 4px 0 rgb(0 0 0 / 0.15)`), for the content layer lifting off the app
background. It has no tier for elements that float **over their own content**.
Add one, with the alphas in per-theme vars, because black on a dark surface
reads far weaker than the same alpha on white:

```css
/* in @theme inline, beside --shadow-fp-surface */
--shadow-fp-overlay:
  0 12px 28px -8px var(--fp-shadow-umbra),
  0 4px 10px -4px var(--fp-shadow-penumbra);

/* light :root */
--fp-shadow-umbra: rgb(0 0 0 / 0.18);
--fp-shadow-penumbra: rgb(0 0 0 / 0.1);

/* .dark */
--fp-shadow-umbra: rgb(0 0 0 / 0.55);
--fp-shadow-penumbra: rgb(0 0 0 / 0.35);
```

Measured over the selected-row backdrop: FP-dark `[4,5,5]` → **`[23,26,30]`**;
light `[20,21,22]` → **`[36,38,39]`**.

**⚠️ These values are DERIVED, not Figma-sourced.** The REST token had expired
and the Desktop Bridge was not connected when this was written. Confirm the
geometry and both alphas against `28679:1109` and correct them — and correct
§4b, which still names `--shadow-md` for this bar.

**Then apply it** to `tables-layout/BulkActionBar.tsx`, today
`bg-popover … shadow-lg` → `bg-fp-card-1 … shadow-fp-overlay`. `--popover` is
byte-identical to `--fp-surface-1b` in **both** themes (`#1b2028` dark,
`#ffffff` light) — the content layer this bar floats over — so the fill was the
same collision one level up.

This is the same `--<token> == surface` family as the `--muted` bug in the
previous handoff. It has now bitten four times: `--muted`, `--popover`,
`bg-muted` on the content layer, and `--accent`. **Worth a lint rule or a
documented check** rather than a fifth discovery.

---

## Task 2 — bulk-attribute editing is a two-step dialog

**The defect.** `BulkActionBar`'s field actions commit on click, from a flat
popover. `02-rules/interaction-and-behavior.md` §4b (locked decision 11) already
says they must not:

- **Three tiers by cardinality**, each opening a **dialog**:
  - Tier 1 scalar (one value for all) → single input dialog
  - Tier 2 one-value-per-row → searchable-select dialog
  - Tier 3 a collection per row → richer dialog with mode tabs
- **Two-step shape**: "(1) input dialog (header leads with **scope + count**),
  (2) per-row **before/after preview** with `Go back` / `Confirm`, (3) commit"
- **Destructive bulk replace requires confirmation**
- **Apply → toast**

None of it was implemented, and the destructive actions had no confirmation of
any kind.

**Why both steps earn their keep** — keep this in the component docs, it is the
reason the pattern exists: the operator needs to see the state that **already
exists** on the target before piling onto it. Step 1 surfaces that standing
state; step 2 shows the delta it is about to become.

**Build these as DS components.** They are generic Tier 1–3 primitives. Working
implementations to port from `prototypes/unified-view/BulkEditDialog.tsx`:

| Component | Anatomy |
|---|---|
| `BulkEditDialog` | The two-step shell. Step 1: picker, a `{verb} selected {N} items` scope line, footer `Cancel` / `Proceed and Confirm` with the primary gated until a value is picked. Step 2: title becomes "View Summary", footer becomes `Go back` / `Confirm`. Always reopens on step 1 — a dialog that reopens mid-flow would commit a value the operator can no longer see. |
| `BeforeAfterTable` | Per-row `id / Current X / New X`. `before` renders muted with `line-through` so the row reads as a replacement; an empty `before` falls back to an em-dash, so "had nothing" and "had something" stay visually distinct. |
| `OrderMiniTable` | Plain identity table — the rows being acted on. Rename generically when promoting. |
| `StandingLoad` | Collapsible card showing what the target already holds. Collapsed by default with the count always visible; the inner list is capped at `max-h-56` so a heavily loaded target cannot push the section below it off the dialog. Rename generically when promoting. |

**Two deviations from `ui/dialog.tsx` the DS should absorb**, both structural:

1. **Width.** `DialogContent` is `sm:max-w-lg`. A per-row before/after table
   needs more; the summary step uses `sm:max-w-2xl`.
2. **Footer alignment.** `DialogFooter` is `sm:justify-end`. The summary step
   needs `sm:justify-between` — §4b names `Go back` / `Confirm` as a
   back/forward pair, not a cancel/confirm pair.

**Inner panels use `bg-fp-surface-1b`, not `bg-fp-card-1`.** Measured against the
dialog's own `bg-background`: card-1 is `[6,3,10]` away in light (`#e9ecf1` on
`#efefeb` — near-invisible), surface-1b is `[16,16,20]` light and `[19,24,32]`
dark. Check this before picking any inner surface.

**Body scroll.** The dialog body scrolls at `max-h-[55vh]`; header and footer
stay put however many rows the selection carries.

**Still missing, please add:** §4b's **"Apply → toast"**. No `Toaster` is mounted
and no toast fires on commit.

---

## Task 3 — multi-select lists are checkbox rows, not check-marked items

**The defect.** `ui/command.tsx`'s `CommandItem` has a `selected` prop that
renders a small trailing `CheckIcon`. That is right for a **single**-select list
— it marks *the* chosen row. On a **multi**-select list it reads as "this is the
current value" rather than "tick as many as you like", and with nothing yet
chosen the list is visually identical to a single-select one. People read these
as single-select and never discover they can pick more. Observed exactly that.

§2 already says the right answer and it was not being followed:

> "List presentation: standardize on **checkbox rows** for multi-select (chips
> above for what's chosen)." … "**Cardinality is explicit in the affordance.**"

**The fix.** Add a `MultiSelectList` to the DS (port from
`prototypes/unified-view/FuelOrdersBulkBar.tsx`): checkbox rows built on
`CommandItem`'s existing `icon` slot, with the current selection above as
**removable chips**.

The `Checkbox` must be `pointer-events-none` with `tabIndex={-1}` — the row owns
the click via `onSelect`, so letting the box take its own double-toggles straight
back to where it started.

---

## Task 4 — Data Action Control: composition and where the actions live

Four changes to `data-action-control/DataActionControl.tsx` and the page
skeleton around it.

**4a. A scope-control slot at the head of the right cluster.** Add an optional
slot for a scope control — a date stepper in this case (`‹ Tue, Aug 25, 2026 ›`).
Leading the cluster makes the row read outward from what **scopes** the view →
how it is **presented** (view switch, column tools) → the action that **adds** to
it. Do not place it between the icon tools and the CTA; that splits the tools
from a button they have nothing to do with.

**4b. The primary CTA leaves the toolbar** for the **preset-view row**, at the
right end.

**4c. Export leaves the page header** and joins it, immediately **right** of the
CTA. Final order: `Default · <saved views> · + View … [CTA] [Export]`. The page
header then carries only the theme toggle.

**4d. Remove the `border-t` above the pagination row.** With the table's own
rules closing the list, it read as a stray divider. (Side effect to judge: the
last visible row now clips into the pagination with no boundary. If that reads as
unfinished, a fade is the fix — not restoring a full-strength rule.)

**Three details that are load-bearing, not decoration:**

- **A 4px inset correction.** The preset-view row cancels the content layer's
  16px inset with `-mx-4` and re-pads at `px-3` (12px) so its hairline spans the
  full panel. Without an extra `mr-1` on the **rightmost** item, that item sits
  4px proud of every toolbar control below it. With it, both right edges land on
  the same x. **If you reorder the trailing items, the `mr-1` moves with
  whichever is last.**
- **Sizes.** The CTA is `size="xs"` (h-6/24px), Export is `icon-xs` (24px). That
  row carries text tabs, not controls; a 32px `sm` button sits heavy on it.
- **`self-end mb-2.5`.** The row is `items-center`, so both actions opt out of
  centring and measure from the bottom instead: 10px margin + the row's own 2px
  bottom padding puts them exactly **12px** above the hairline.

**⚠️ Two UI decisions to make, not copy:**

1. **The CTA's corner radius is 4px, which is OFF the DS radius scale** — it runs
   `xs 2px / sm 6px / md 8px / lg 10px`, with no 4px step. It is currently a raw
   `rounded-[4px]` literal. Either add a 4px step to the scale in Figma
   (`21322:119`) and use the token, or move the button to `rounded-sm` (6px).
   **Do not let a raw value into the base** — everything downstream inherits it.
2. **This contradicts locked decision 8**, which puts "title + primary CTA
   OUTSIDE the data container" — the preset-view row is *inside* it. The
   placement was requested directly, so the prototype follows it, but the two
   statements now disagree. Resolve it rather than leaving both on record.

---

## Task 5 — filter facets: search is optional, per facet

**The defect.** `tables-layout/FilterPanel.tsx` renders a search field above the
options for **every** facet, unconditionally. On a two-option facet that is a
control which can only ever filter to one of the two — pure noise, and it pushes
the options down for nothing.

**The fix.** Make the field opt-in per facet:

```ts
interface Facet {
  key: string;
  label: string;
  options?: string[];
  /** Whether the options pane gets a search field. */
  searchable?: boolean;
}
```

**The rule to document — this is the point of the task:** a facet **may or may
not** carry a search field, depending on the facet. It gets one when its list
**cannot be taken in at once**; it does not when the list is short enough to
scan. Prefer an **explicit flag over a length threshold**: a threshold silently
changes a facet's affordance as its options grow or shrink, so the same facet
gains and loses a control without anyone deciding.

Two details:

- When the field is absent the option list needs its own top padding (`pt-2`), or
  it starts flush against the panel edge.
- Placeholder reads `Search {facet}…` with the ellipsis, matching the DS's own
  `Search…` convention elsewhere.

---

## Task 6 — two small component fixes

**6a. `CommandShortcut` letterspacing.** It is
`ml-auto text-xs tracking-widest text-muted-foreground`. `tracking-widest` is
sized for keycaps (`⌘K`), but the slot is also the natural home for right-aligned
**meta text**, where that letterspacing looks wrong. Either add a variant or drop
`tracking-widest` and let keycap callers opt in.

**6b. Document `CommandItem`'s `icon` / `shortcut` / `selected` slots.** They
already compose exactly the row layout people hand-roll — leading media, label,
right-aligned meta, trailing check. Hand-rolling flex children inside
`CommandItem` silently fails, because when any of those props is set it wraps
`children` in a single `flex-1 truncate` span, collapsing the layout onto one
line. This cost real debugging time; a line in the component docs prevents it.

---

## Constraints and verification (all tasks)

- `npx tsc -b --noEmit` and `npx eslint .` must pass. 12 pre-existing
  `react-refresh` warnings are the expected baseline — do not add a 13th.
- **Both themes**, measured, after the transition settles.
- Gallery CSS should stay around **146 kB**. If it collapses to ~20 kB, the
  `@source "../src"` / `@source "../prototypes"` lines in `src/index.css` have
  been dropped — that is always the cause.
- Commit per task, and state in the message **what was measured**.
