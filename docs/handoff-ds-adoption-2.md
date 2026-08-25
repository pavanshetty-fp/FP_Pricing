# Handoff prompt — promote the Unified View pass into FP-DS 2026

Paste everything below the line into a **fresh chat** rooted at the FP-DS-2026
repo. It is self-contained.

Origin: every change below was proven in `prototypes/unified-view` on branch
`feat/unified-view-prototype`. **One task is already done in `src/` on that
branch** (Task 1's tokens, commit `5e6a025`) — that branch is not on `main` yet,
so check before redoing it. Everything else lives only in the prototype folder
and needs promoting into the DS proper.

---

You are working in the **FleetPanda Design System (FP-DS-2026)** repo:
`git@github.com:pavanshetty-fp/FP-DS-2026.git`

Read `START-HERE.md`, `docs/apply-design-system.md` and
`02-rules/interaction-and-behavior.md` first. `git pull` before you touch
anything. Non-negotiables: **tokens, never raw hex**; **Lucide icons only**;
**both themes must work** (FP-dark is `.dark` and the default, Light is
`:root`); **one React app**, no new HTML entry points.

Six tasks, independent, one commit each. Tasks 1–3 are the bulk-action work,
Task 4 is the action bar, Task 5 is filters, Task 6 is small fixes.

> **Verify by measuring, not by looking.** Three bugs in this batch were
> invisible in a screenshot and only showed up as RGB deltas — one was a literal
> `[0,0,0]`. Read computed values and confirm a fill actually differs from the
> surface behind it. And when you flip themes to check, **wait for
> `transition-colors` to settle before reading** — reading immediately returns
> mid-transition values, which produced four separate false readings during this
> work, including two that looked like real contrast failures.

---

## Task 1 — overlay elevation tier (tokens)

**Status: already committed on `feat/unified-view-prototype` as `5e6a025`.**
If that branch is merged, skip to Task 2 and just apply the token in Task 2.
If you are on a `main` that lacks it, add it.

**The defect.** The bulk-action bar only ever appears **when rows are
selected**, so its real backdrop on three sides is selected rows. In FP-dark the
selected-row fill is `--accent` `#2a2f37`, byte-identical to the bar's own
`--fp-card-1`. Measured delta between bar and backdrop: **`[0,0,0]`**. With no
fill contrast available the shadow carries the entire separation — and the bar
used Tailwind `shadow-lg`, 10% black, which over `#2a2f37` composites to a delta
of **`[4,5,5]`**. Invisible. The DS's own spec (§4b) says `--shadow-md`, which is
*weaker still*.

**The fix.** The DS has exactly one shadow token, `--shadow-fp-surface`
(`0 4px 4px 0 rgb(0 0 0 / 0.15)`), for the content layer lifting off the app
background. It has no tier for elements that float **over their own content**.
Add one, with the alphas in per-theme vars because black on a dark surface reads
far weaker than the same alpha on white:

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

**⚠️ These numbers are DERIVED, not Figma-sourced.** The REST token had expired
and the Desktop Bridge was not connected when this was written. Confirm the
geometry and both alphas against `28679:1109` and correct them. Also correct
§4b, which currently names `--shadow-md` for this bar.

**Then apply it** to `tables-layout/BulkActionBar.tsx`, which today is
`bg-popover … shadow-lg`. Change to `bg-fp-card-1 … shadow-fp-overlay`.
`--popover` is byte-identical to `--fp-surface-1b` in **both** themes (`#1b2028`
dark, `#ffffff` light) — the content layer this bar floats over — so the fill was
the same collision one level up. This is the same `--<token> == surface` family
as the `--muted` bug in the previous handoff; it has now bitten four times
(`--muted`, `--popover`, `bg-muted` on the content layer, `--accent`).

---

## Task 2 — bulk-attribute editors become two-step dialogs

**The defect.** `BulkActionBar`'s field actions commit on click from a flat
popover. `02-rules/interaction-and-behavior.md` §4b (locked decision 11) says
they must not:

- **Three tiers by cardinality**, each opening a **dialog**:
  - Tier 1 scalar (one value for all) → single input dialog
  - Tier 2 one-value-per-row → searchable-select dialog
  - Tier 3 a collection per row → richer dialog with mode tabs
- **Two-step shape** for any bulk mutation that changes a computed value:
  "(1) input dialog (header leads with **scope + count**), (2) per-row
  **before/after preview** with `Go back` / `Confirm`, (3) commit"
- **Destructive bulk replace requires confirmation**
- **Apply → toast → recompute**

None of that was implemented. The worst case: a bulk Product change **replaces**
an order's product lines, and the Qty column is the *sum of those lines* — so one
click silently rewrote quantities with no confirmation at all.

**Build these as DS components.** They are generic Tier 1–3 primitives, not
Fuel-Orders-specific. Working implementations to port from
`prototypes/unified-view/BulkEditDialog.tsx`:

| Component | What it is |
|---|---|
| `BulkEditDialog` | The two-step shell. Step 1 = picker with a `{verb} selected {N} orders` scope line and a `Proceed and Confirm` gated on a value; step 2 = "View Summary" with `Go back` / `Confirm`. Resets to step 1 whenever it reopens. |
| `BeforeAfterTable` | Per-row `Order No / Current X / New X`. `before` is muted + `line-through`; an empty `before` falls back to an em-dash so "had nothing" and "had something" stay distinct. |
| `OrderMiniTable` | Plain identity table — the rows being acted on. |
| `StandingLoad` | Collapsible card showing the state that **already exists** on the target (e.g. a driver's current orders), collapsed by default, inner list capped at `max-h-56`. |

**Two deviations from `ui/dialog.tsx` that the DS should absorb**, both
structural:

1. **Width.** `DialogContent` is `sm:max-w-lg`. A per-row before/after table
   needs more; the summary step uses `sm:max-w-2xl`.
2. **Footer alignment.** `DialogFooter` is `sm:justify-end`. The summary step
   needs `sm:justify-between` — §4b names `Go back` / `Confirm` as a
   back/forward pair, not a cancel/confirm pair.

**Inner panels use `bg-fp-surface-1b`, not `bg-fp-card-1`.** Measured against the
dialog's own `bg-background`: card-1 is `[6,3,10]` away in light (`#e9ecf1` on
`#efefeb` — near-invisible), surface-1b is `[16,16,20]` light and `[19,24,32]`
dark. Check this before picking any inner surface.

**The point of the two steps** — worth keeping in the component docs, because it
is the reason the pattern exists: the operator needs to see the state that
already exists before piling onto it. A driver is typically mid-round with orders
already assigned; an order already carries product lines whose sum *is* the Qty
column. Step 1 surfaces the standing state, step 2 shows the delta.

**Still missing, please add:** §4b's **"Apply → toast"**. There is no `Toaster`
mounted anywhere in the prototype and no toast on commit.

---

## Task 3 — multi-select lists are checkbox rows, not check-marked items

**The defect.** `ui/command.tsx`'s `CommandItem` has a `selected` prop that
renders a small trailing `CheckIcon`. That is correct for a **single**-select
list — it marks *the* chosen row. On a **multi**-select list it reads as "this is
the current value" rather than "tick as many as you like", and with nothing yet
chosen the list is visually identical to a single-select one. Users read these
lists as single-select and do not discover they can pick more.

§2 of the rulebook already says the right answer and it was not being followed:

> "List presentation: standardize on **checkbox rows** for multi-select (chips
> above for what's chosen)." … "**Cardinality is explicit in the affordance**."

**The fix.** Add a `MultiSelectList` to the DS (port from
`prototypes/unified-view/FuelOrdersBulkBar.tsx`): checkbox rows via
`CommandItem`'s existing `icon` slot, with the current selection rendered above
as **removable chips**. The `Checkbox` must be `pointer-events-none` — the row
owns the click via `onSelect`, so letting the box take its own double-toggles
back to where it started.

---

## Task 4 — Data Action Control: date scope, and where the actions live

Three changes to `data-action-control/DataActionControl.tsx` and the page
skeleton around it. All three were driven by a real screen; the DS unit's demo
table simply never needed them.

**4a. A date-scope slot.** Add an optional slot at the **head of the right
cluster** for a scope control — a date stepper in this case (`‹ Tue, Aug 25, 2026
›`). Every row on a dispatch screen belongs to one delivery date, and the value
has to stay readable without opening a panel. Leading the cluster makes the row
read outward from what **scopes** the data → how it is **presented** (view,
columns) → the action that **adds** to it. Do not put it between the icon tools
and the CTA; that splits the tools from a button they have nothing to do with.

**4b. The primary CTA leaves the toolbar.** `Create Order` (the DS's
`Create Form`) moves out of the toolbar's right cluster and onto the
**preset-view row**, at the right end.

**4c. Export leaves the page header** and joins it, immediately **right** of the
CTA. Final order on that row: `Default · <saved views> · + View … [CTA] [Export]`.

**Three details that are load-bearing, not decoration:**

- **A 4px inset correction.** The preset-view row cancels the content layer's
  16px inset with `-mx-4` and re-pads at `px-3` (12px) so its hairline spans the
  full panel. Without an extra `mr-1` on the **rightmost** item, that item sits
  4px proud of every toolbar control below it. With it, both right edges land on
  the same x. If you reorder the trailing items, the `mr-1` moves with whichever
  is last.
- **Sizes.** The CTA is `size="xs"` (h-6/24px) and Export is `icon-xs` (24px).
  That row carries text tabs, not controls; a 32px `sm` button sits heavy on it.
- **`self-end mb-2.5`.** The row is `items-center`, so both actions opt out of
  centring and measure from the bottom: 10px margin + the row's 2px bottom
  padding puts them exactly **12px** above the hairline.

**⚠️ Two things to decide, don't just copy:**

1. **The CTA's corner radius is 4px, which is OFF the DS radius scale** — it runs
   `xs 2px / sm 6px / md 8px / lg 10px`, with no 4px step. It is currently a raw
   `rounded-[4px]` literal, the only raw value in that file. Either add a 4px
   step to the scale in Figma (`21322:119`) and use the token, or move the button
   to `rounded-sm` (6px).
2. **This contradicts locked decision 8**, which puts "title + primary CTA
   OUTSIDE the data container" — the preset-view row is *inside* it. The
   placement was requested directly, so the prototype follows it, but the two
   statements now disagree and one of them needs updating. Please resolve this
   rather than leaving both on record.

**Also remove** the `border-t` hairline above the pagination row. With the
table's own rules already closing the list, it read as a stray divider. (Note:
the last visible row now clips into the pagination with no boundary — if that
reads as unfinished, a fade is the fix, not restoring the full-strength rule.)

---

## Task 5 — filter facets: search is optional, per facet

**The defect.** `tables-layout/FilterPanel.tsx` renders a search field above the
options for **every** facet unconditionally. On a facet with two options
(Type: Delivery/Extraction; Status: Assigned/Unassigned) that is a control which
can only ever filter to one of the two — pure noise.

**The fix.** Make the field opt-in per facet, and give the facet list an
explicit flag rather than inferring it:

```ts
interface Facet {
  key: string;
  label: string;
  options?: string[];
  /** Whether the options pane gets a search field. */
  searchable?: boolean;
}
```

**The rule to document:** a facet gets a search field when its whole list
**cannot be seen at once**; it does not when the list is short enough to scan.
An explicit flag beats a length threshold, because a threshold silently changes
a facet's affordance when the underlying data grows or shrinks.

When the field is absent the option list needs its own top padding (`pt-2`), or
it starts flush against the panel edge.

**While you are in there:** `FilterPanel` hardcodes its facets and options, so it
cannot be pointed at another dataset — the prototype had to fork it. Take facets
and options as props.

---

## Task 6 — three small fixes

**6a. `CommandShortcut` letterspacing.** It is
`ml-auto text-xs tracking-widest text-muted-foreground`. `tracking-widest` is
sized for keycaps (`⌘K`); the slot is also the natural home for right-aligned
**meta text** ("23 orders assigned"), where that letterspacing looks wrong.
Either add a variant or drop `tracking-widest` and let keycap callers opt in.

**6b. Document `CommandItem`'s `icon` / `shortcut` / `selected` slots.** They
already compose exactly the row layout people hand-roll — avatar + label +
right-aligned meta + check. Hand-rolling flex children inside `CommandItem`
silently fails, because when any of those props is set it wraps `children` in a
single `flex-1 truncate` span. This cost real debugging time; a line in the
component docs prevents it.

**6c. Parameterise the forks.** Four components in `prototypes/unified-view`
exist only because the DS version cannot be pointed at another dataset. Each
carries a `DS FOLLOW-UP` comment naming what to parameterise. When fixed, the
fork is deleted, not maintained:

| Fork | DS original | Why |
|---|---|---|
| `TokenMultiSelect` | `form-layout/MultiSelect` (27593:15012) | hardcoded options + label, private state |
| `ProductTable` | `form-layout/EditableTable` (27593:15012 / 27592:33634) | hardcoded columns/options/rows, not in the barrel |
| `FuelOrdersBulkBar` | `tables-layout/BulkActionBar` (27631:11151) | hardcoded verb set (Assign/Unassign/Unblock/Verify/Unverify + Copy + More) |
| `BreakdownCard` | anatomy of `info-cards/InvoiceCard` (27599:62303) | the DS has no small breakdown card |

`CodeDisc` and `StatusChip` were the same story and were generalised into the DS,
after which the local copies were deleted. That is the pattern to repeat.

---

## Constraints and verification (all tasks)

- `npx tsc -b --noEmit` and `npx eslint .` must pass. 12 pre-existing
  `react-refresh` warnings are the expected baseline — do not add a 13th.
- **Both themes**, measured, after the transition settles.
- Gallery CSS should stay around **146 kB**. If it collapses to ~20 kB, the
  `@source "../src"` / `@source "../prototypes"` lines in `src/index.css` have
  been dropped — that is always the cause.
- Commit per task, and state in the message **what was measured**.

## Still open — decisions, not code

These came out of the same pass and need a person, not an implementation:

1. **Status derived from driver contradicts the source app.** Two transcribed
   rows carried a driver *and* "Unassigned", so real status looks like its own
   lifecycle, not a function of driver presence.
2. **Bulk Products gallon split.** Selecting several products divides the
   order's total evenly, remainder on the first line, so the sum (and the Qty
   column) is preserved. The even split is a **guess** — nothing on the order
   says how volume divides. It is printed per line in the confirm step so it is
   visible, but if products should carry explicit quantities that is a data
   change first.
3. **Add vs Replace on Tier 3 edits.** §4b wants it explicit. Products is
   replace-only and Tags is additive today, because an "add a product" mode has
   no defensible gallon value for the new line.
4. **`StatusChip variant="text"` fails AA on light surfaces** for success and
   processing (3.30 / 3.19) — the light `--status-*` values are too pale for text
   on white. Passes in FP-dark (7.18 / 7.62). Needs darker light-mode status
   values decided in Figma.
5. **Sheet density.** The order sheet runs 20px between fields / 40px between
   groups against the DS's 12/28, because it carries far more fields than the DS
   reference. If more screens need it, that argues for a second sheet density in
   the DS rather than per-screen overrides.
6. **The filter panel is presentational.** Its checked state does not filter the
   table — `Apply Filters` only closes the popover — and `FuelOrder` carries no
   `category` field for that facet to match against.
