# FP DS 2026 — change bulletin #2 for downstream repos

**Base repo:** `pavanshetty-fp/FP-DS-2026`, branch **`feat/3pl-module`**
**Range:** `91dad88..fa572e0` — 2026-08-27 → 2026-09-08 · 90 commits
**Supersedes nothing.** This continues [`handoff-org-repo-tokens-components.md`](handoff-org-repo-tokens-components.md); read that one first if you have not applied it.
**Audience:** any repo that takes FP DS 2026 as its base and needs to pull these changes forward.

> ### Read this before anything else
>
> **Bulletin #1's stated range is understated.** It says `18a4a20..f18d030` (25 Aug), but its
> §1a documents the two-layer token restructure, which actually landed at `91dad88` on
> **27 Aug — twenty minutes after that bulletin was committed**. So it covers more than its
> label claims.
>
> **Work out where you actually are** rather than trusting either label:
> ```bash
> git remote add fpds git@github.com:pavanshetty-fp/FP-DS-2026.git
> git fetch fpds
> git diff <your-HEAD>..fpds/feat/3pl-module -- src/ docs/
> ```
> The histories are unrelated, which is fine — `git diff` and `git apply` both work across
> them. If `src/index.css` in your repo has no `--fp-ink-1`, you are before the restructure
> and bulletin #1 applies first.

**Everything here lives in `src/` and `docs/` and is meant to travel.
`prototypes/unified-view/` does NOT travel** — it is where patterns get proven, not where
they live. 51 files changed there in this range and none of them are your problem. Anything
worth keeping from it has already been promoted into `src/`.

---

## At a glance

| | |
|---|---|
| Commits | 90 |
| Files changed in `src/` + `docs/` | 57 (+4,854 / −395) |
| New components / modules in `src/` | **14** |
| New tokens | 14 — 2 semantic surfaces, 2 primitives, 5 pastel pairs (10 tokens) |
| Changed token values | 8 — light only |
| Tokens removed or renamed | none |
| Additive API changes | 4 |
| Default behaviour changed | 1 — `KanbanBoard` lane fill |
| DS rule files amended | 8 |
| Breaking changes | **none** |

Nothing in this range removes or renames a token or a prop. A repo that applies the token
block and nothing else gets the colour corrections with no code changes.

---

## 1 — Tokens (`src/index.css`)

Apply this section first. Everything in §3 assumes it.

### 1a. Changed values — light only

Dark is untouched throughout this range.

| token | was (27 Aug) | now | why |
|---|---|---|---|
| `--fp-stroke-hairline` | `#cdd4de` | `#d4d4d8` | structural divider. Went to zinc/400 `#a1a1aa` in the Figma sync mid-range, which measured 2.56:1 on white — a mid grey, ~5× the card rim, for a line doing less work. Now zinc/300, 1.48:1. |
| `--fp-stroke-field` | `#abb3c2` | `#c4c4c9` | a field's boundary, 1.74:1. Split from the divider because in light an `Input` is `bg-transparent` — the border is the *only* thing that makes a field a field. |
| `--fp-outline-2` | `#ededed` | `#c4c4c9` | **was a bug.** At 1.17:1 the "stronger" rim was *weaker* than `--fp-outline-1` (1.26:1), so every Kanban card got **lighter** on hover. Now 1.26 → 1.74, correct direction. |
| `--fp-emphasis` | `#ededed` | `#e5e7eb` | Figma sync, `base/accent` → gray/200. |
| `--muted`, `--secondary` | `var(--fp-emphasis)` | `var(--fp-emphasis-quiet)` | the sync split this family — see 1b. |
| `--destructive` | `var(--fp-danger)` | `#ef4444` | Figma sync, red/500. `--status-failed` keeps `--fp-danger` (#dc2626) because it carries body-sized text. |
| `--background` | `var(--fp-surface-base)` | `var(--fp-surface-1b)` | `base/background` is `#ffffff` now. Light therefore has **no ground/card fill step** — a card separates by border and shadow only, and `bg-background` on a card is a zero-pixel change. |
| `--sidebar`, `--sidebar-ring`, `--chart-1…5`, `--destructive-foreground` | — | — | straight Figma sync values, no reasoning of ours. |

`--border` and `--input` are unchanged as *aliases*; their rendered values move with the two
`--fp-stroke-*` primitives above. That is the point of the two-layer split.

**The resulting stroke system — three weights, three jobs, light:**

| token | value | on `#ffffff` | job |
|---|---|---|---|
| `--fp-outline-1` | `#e2e5ea` | 1.26:1 | a card's own rim |
| `--border` / `--fp-stroke-hairline` | `#d4d4d8` | 1.48:1 | structural divider — page header, tab strip, table edge and rules, sidebar edge |
| `--input` / `--fp-stroke-field` · `--fp-outline-2` | `#c4c4c9` | 1.74:1 | a field's boundary, and the rim that must beat a card's |

**Invariant to preserve on any future retune:** `--fp-outline-2` must stay *darker* than
`--fp-outline-1` in light. That is what makes a hover rim read as a hover.

**Known and deliberate:** none of this meets WCAG 1.4.11's 3:1 for a control boundary — on
white that first happens at `#949494`, and no neutral ramp value reaches it. zinc/400 did not
either, so nothing regressed. The real fix is giving inputs a *fill*, not a darker border.
A separate WCAG-compliant light set is planned and is **not** in this range.

### 1b. New primitives

```css
--fp-card-3: #fafafa;          /* the faintest card step */
--fp-emphasis-quiet: #f4f4f5;  /* zinc/100 — the sync split emphasis in two:
                                  --accent/--sidebar-accent on gray/200,
                                  --secondary/--muted on zinc/100. One primitive
                                  could not hold both. In dark both re-resolve. */
```

### 1c. New semantic tokens

```css
/* light */                          /* dark */
--fp-board-lane:   var(--fp-card-2); var(--fp-card-1);
--fp-table-header: var(--fp-card-3); var(--fp-surface-1a);
```

- **`--fp-board-lane`** — the ground behind a board column. It is **not** `--accent` (that is
  control emphasis, so the lane moved whenever selection was retuned) and **not** `--fp-lane`
  (that is the grouped-*table* header band; pointing a board at it drags every group header in
  the app). Two jobs, two tokens, even where they resolve alike.
- **`--fp-table-header`** — a table header's ground. Dark gets it free from the panel fill; in
  light the layer and the header are both `#ffffff`, and a header that is only a hairline stops
  being a header the moment the first row has one too.

Both need a `@theme inline` mapping (`--color-fp-board-lane`, `--color-fp-table-header`).

### 1d. New pastel pairs

Ten tokens — five pairs: `--pastel-violet / -rose / -slate / -teal / -green`, each with a
`-foreground` partner. Declared **once**, not overridden in `.dark`: measured 7.2–7.9:1 for
the foreground on its own fill, which holds in both themes. They back `CodeDisc` tones.

---

## 2 — New in `src/`

### 2a. The table column layer — `src/components/tables-layout/`

The largest addition. Column reorder and resize, as **default table behaviour**.

| file | what it is |
|---|---|
| `useColumnOrder.ts` | order state + `arrange()` + `headerProps` (drag, keyboard, drop indicator) |
| `useColumnWidths.ts` | `widthOf`, `resizeProps`, `isResizing`; min 64px, double-click resets, ←/→ nudge 16px |
| `useTableColumns.ts` | composes both, and guards them against each other |
| `TableColumnHeader.tsx` | replaces `<TableHead>`; carries the drag props and both handles |
| `ColumnHandles.tsx` | `ColumnResizeHandle` and `ColumnMoveGrip` |

**Two gestures on one target, and they must stay exclusive.** The divider resizes, the header
body moves — different cursors, different marks, and `canDrag` is gated on `!isResizing()`.
Both hooks are dual-mode (controlled or uncontrolled) so a saved view can own the state.

> **One bug to inherit the fix for:** `useColumnWidths` listens for `pointerup`/`pointercancel`
> on the **window**, not the element. Without it a pointer released outside the window strands
> the resize flag and silently disables all column dragging thereafter.

### 2b. Grouping — same folder

`grouping.ts` (engine + `GroupDim`), `useGrouping.ts`, `GroupHeaderRow.tsx`,
`GroupedListFooter.tsx`, and a rebuilt `GroupByMenu.tsx`.

**Adopt these together.** A list that takes the menu without the engine gets a control with
nothing behind it; one that takes the headers without the footer gets group counts that add up
past the list total with nothing saying why (a multi-value dimension puts a row in every group
it matches). `GroupedListFooter` is what stands in for pagination while grouped — **grouping
and pagination are exclusive**, because at 25 rows a page a group straddles the boundary and
its header claims a count for rows that are not on screen.

### 2c. New UI components

| component | what it is |
|---|---|
| `ui/steps.tsx` | the DS step indicator — `complete` (tick) / `current` (number) / `upcoming` (hollow); `disabledReason` renders disabled + tooltip; the connector fills behind you |
| `ui/combobox.tsx` | a select you can type into. Popover + Command wearing `selectTriggerClasses` |
| `ui/copy-value.tsx` | a value with a copy affordance |
| `form-layout/table-cells.tsx` | cell editors for editable tables — select, multi-select, required label |
| `component-demos/StepsDemo.tsx` | gallery entry |

---

## 3 — Changed in `src/`

### 3a. `KanbanBoard` — lane fill (**default behaviour change**)

`bg-accent` → `bg-fp-board-lane`. Visible on every board. See §1c for why. If you have your own
board, point it at the same token.

### 3b. `Combobox` — `allowCreate` (additive)

Type something the list does not have and it appears as the first row, `Create "…"`.

```tsx
<Combobox allowCreate onCreate={(v) => …} createLabel={(q) => `Add ${q}`} … />
```

Two details that are easy to get wrong, and were:
- The create row is **`forceMount`ed with its value equal to the query** — Command filters its
  own children, and a create row filtered out by the text that produced it is unreachable.
- The trigger **falls back to the raw value**, so a field does not go blank when its value came
  from outside the option set.

Use it for a set that is known but not closed. A locked list sends the real answer into a notes
field where nothing can filter it; a bare text input gives ten spellings of one thing.

### 3c. `side-sheet/parts.tsx`

- `SheetSection`'s heading row **has no height of its own**. It was `min-h-7` around a 20px
  line with `items-center`, which split the spare 8px and rendered the documented 16px gap as
  20 — the row was padding itself and calling it rhythm. A taller action now overflows instead
  of pushing content down.
- `SheetSectionRemove` — Minus, not a bin; label slides out on hover; `hasContent` gates a
  confirm.
- `SheetSteps` — a thin wrapper over `Steps`.

### 3d. `BulkActionBar`

Takes a caller-supplied `actions: BulkAction[]`. What can be done to a selection is a property
of the *records*, not of the bar — the same split `GroupByMenu` makes for dimensions. The
chrome (count chip, spacing, hairlines, confirm-on-destructive) is unchanged.

### 3e. Smaller

| file | change |
|---|---|
| `ui/dropdown-menu.tsx` | `DropdownMenuRadioItem` renders the DS radio dial — a 16px bordered circle always drawn, 8px `fill-primary` when checked |
| `ui/copy-value.tsx` call sites | inner gap removed; the 24px button box *is* the spacing |
| `ui/badge.tsx`, `ui/code-disc.tsx`, `ui/status-chip.tsx` | pastel tones |
| `ui/select.tsx` | `selectTriggerClasses` exported, so `Combobox` can wear it |
| `form-layout/FileUpload.tsx`, `MultiSelect.tsx` | states and spacing |
| `navigation-drawer/*`, `top-bar/TopBar.tsx` | module switcher and rail |
| `tables-layout/TablePagination.tsx` | band is `h-9` — exactly its controls; the page owns the rhythm |

---

## 4 — Rules changed (`docs/ds/`)

Eight rule files moved. These are the **canonical** source; the do's/don'ts and checks derive
from them. `docs/apply-design-system.md` is the generated bundle — regenerate with
`bash docs/ds/build-bundle.sh` rather than editing it.

**`ui/2-rules.md`** — a new **Strokes** section (the three-weight table above, the
outline-2 invariant, and the rule that a boundary which is not reading wants spacing or a
surface step rather than a darker line); the board-lane and table-header tokens.

**`interactions/2-rules.md`** — the editing model this range settled:

- **A directory record is a side sheet, and the sheet IS the form.** `mode` decides Edit vs
  Create; the body carries the fields; the footer carries Save Changes. **§8.4 is marked
  superseded in part** — it said substantive create/edit goes to a full page. That was built,
  it was wrong, and the reason is kept next to the rule that replaced it: a page is a second
  pattern for one job, and it takes the list off screen. Full pages stay right for a *flow*.
- Size a sheet by content — `wide` the moment it carries a table.
- Related records live in the same scroll, on the **40 / 16** rhythm.
- `headerActions` for things that *open* rather than change — a history, a preview.
- The **validation contract**: nothing red until the field is left; live after a failed
  submit; a failed submit keeps every character and focuses the first problem; cancelling with
  changes confirms, without them does not. Mark **both** required and optional.
- A toggle is a statement and an answer — label left, control hard right, helper under the
  label, full width.
- **New §4c** — what a list owes the reader: keep `TablePagination`'s own page sizes and
  footer copy; never paginate a grouped list; every column moves and resizes; the list total
  sits beside the page title following the *filtered* rows; active filters are said out loud as
  chips with a Clear all; three empty states (nothing yet / no search match / no filter match);
  skeleton rows, never a spinner; and **both** kinds of missing value — `–` for *not filled in*,
  `N/A` for *does not apply*.

**`docs/handoff-light-mode-tokens.md`** (new) — the Figma light sync, with the before/after
table and the reasoning. **`token-provenance.md`** and `apply-design-system.md` carry a
correction note above their sync tables saying the stroke primitives moved off zinc/400
afterwards and why.

---

## 5 — Apply order

1. **`src/index.css`** — §1, whole section. Nothing else works without it.
2. **New files** — §2. They are self-contained; `tables-layout/index.ts` is the barrel.
3. **Changed components** — §3. `KanbanBoard` is the only visible default change.
4. **Docs** — §4, then `bash docs/ds/build-bundle.sh`.

Steps 1 and 4 are safe on their own. Step 2 adds without touching anything. Step 3 is the
only one that can conflict, and only in files you have edited yourself.

---

## 6 — Verification after applying

```bash
npx tsc -b --noEmit          # expect clean
npx eslint src               # expect 0 errors (fast-refresh warnings are pre-existing)
```

Then, in light mode, check computed styles rather than looking — every bug in this range was
invisible in a screenshot and showed up only as an RGB delta:

| check | expect |
|---|---|
| any structural divider | `rgb(212, 212, 216)` |
| any `Input` border | `rgb(196, 196, 201)` |
| a card rim, resting → hover | `rgb(226,229,234)` → `rgb(196,196,201)` — **darker**, not lighter |
| a Kanban lane | `rgb(244, 245, 248)` |
| a table header row | a visible ground, not bare white |
| dark mode, all of the above | unchanged from before you applied this |

The last row is the important one. Nothing in this range touches dark.
