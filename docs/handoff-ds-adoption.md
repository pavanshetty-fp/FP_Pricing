# Handoff prompt — promote three fixes into FP-DS 2026

Paste everything below the line into a **fresh chat** rooted at the FP-DS-2026
repo. It is self-contained.

Origin: these three changes were proven in the `prototypes/unified-view`
prototype on branch `feat/unified-view-prototype`. Task 1 is already committed
there as `bb807fd` for `ui/table.tsx` only — the sweep is what remains.

---

You are working in the **FleetPanda Design System (FP-DS-2026)** repo:
`git@github.com:pavanshetty-fp/FP-DS-2026.git`

Read `START-HERE.md` and `docs/apply-design-system.md` first. `git pull` before
you touch anything. Non-negotiables from that rulebook: **tokens, never raw hex**
(new colours go in the token layer in `src/index.css`), **Lucide icons only**,
**both themes must work** (FP-dark is `.dark` and the default; Light is `:root`),
and this is **one React app** — no new HTML entry points.

Three tasks. They are independent; do them as three separate commits.

---

## Task 1 — `--muted` is unusable as a fill on the content layer in dark mode

**The defect.** In the FP dark theme `--muted` is `#1b2028`, which is
*byte-identical* to `--fp-surface-1b` (`#1b2028`) — the content-layer surface
that tables, empty states and tab strips all sit on. Any `bg-muted` fill on that
surface composites to a **zero pixel change** and is completely invisible. Light
mode hides the bug because there `--muted` is `#cad1db` on a `#ffffff` surface.

**Already fixed** (commit `bb807fd`, do not redo): `TableRow` in
`src/components/ui/table.tsx` had `hover:bg-muted/50`,
`has-aria-expanded:bg-muted/50` and `data-[state=selected]:bg-muted` — so row
hover *and row selection* were both invisible in dark. All three now use
`--accent` (`#2a2f37` dark), which is distinct from the surface. Light is
pixel-identical because `--accent` and `--muted` are both `#cad1db` there.

**What you need to do:** audit and fix the remaining instances. Verified
locations:

| File | Line | What is invisible in dark |
|---|---|---|
| `src/components/ui/table.tsx` | ~47 | `TableFooter` background (`bg-muted/50`) |
| `src/components/tables-layout/DataTable.tsx` | ~671 | expanded-row parent tint (`bg-muted/40`) |
| `src/components/ui/empty.tsx` | ~50 | `EmptyMedia` icon tile (`bg-muted`) |
| `src/components/ui/tabs.tsx` | ~33 | `TabsList` default/segmented track (`bg-muted`) |
| `src/components/ui/slider.tsx` | ~40 | slider track (`bg-muted`) |
| `src/components/ui/item.tsx` | ~50, ~91 | `muted` item variant, item icon tile |
| `src/components/ui/button-group.tsx` | ~52 | group separator fill |
| `src/components/form-layout/MultiSelect.tsx` | ~21 | overflow-count circle |
| `src/components/modals-demo/ModalsDemo.tsx` | ~162, ~357 | modal icon circles |

**Judgement required per case — do not blanket-replace.** `bg-muted` is only
broken when the element sits on `--fp-surface-1b`. On `--card` (`#11161d`) or
`--fp-card-1` (`#2a2f37`) it may be fine or may need the opposite treatment.
For each one: determine the actual surface behind it, and only change the ones
that genuinely collide.

**Two candidate fixes — pick deliberately and say which you chose and why:**

- **(a) Per-component, muted → accent.** What `bb807fd` did. Low blast radius,
  light mode unaffected, but leaves the underlying trap in place for the next
  person who reaches for `bg-muted`.
- **(b) Token-level.** Give dark `--muted` its own value distinct from
  `--fp-surface-1b`. This is the real root fix, but dark `--muted` is currently
  mapped from the Figma variable collection (FP/Card 2), so it needs a design
  decision and a Figma change, and it ripples into every `bg-muted` and
  `text-muted-foreground` consumer. **If you choose this, verify the new value
  against the Figma file before writing it** (file key
  `PxzKUl6emRr8QQ5Nb0vlwT`) and do not invent a hex.

Whichever you choose, add a comment in `src/index.css` next to `--muted`
recording the constraint, so the collision can't be reintroduced silently.

---

## Task 2 — pastel "code disc" badge variants

**What was built in the prototype.** A 16px circular badge carrying a single
letter (`D` for Delivery, `E` for Extraction) in a pastel fill, with the full
word as a `Tooltip` **and** an `aria-label` so the letter is never the only
carrier of meaning:

```tsx
<Badge
  aria-label="Delivery"
  className="size-4 shrink-0 justify-center rounded-full p-0 text-[9px] font-semibold bg-order-delivery text-order-delivery-foreground"
>D</Badge>
```

backed by four tokens currently in `src/index.css`:

```css
--order-delivery: #a8c9ef;              --order-delivery-foreground: #16324f;
--order-extraction: #f0c9a4;            --order-extraction-foreground: #5a3313;
```

They are declared **only in `:root`** and deliberately *not* overridden in
`.dark` — a pastel should read as a pastel in both themes, so both modes share
one pair per type.

**What to build in the DS, and one thing to change while you do.**

The prototype's token names are **domain-specific**, which is wrong for the DS —
the constitution keeps DS labels generic (see the note in
`src/components/data-action-control/scope.ts`: *"Labels stay generic per the
constitution — this is a template, not a domain feature"*). So:

1. **Rename to generic pastel tokens** in `src/index.css`, e.g.
   `--pastel-blue` / `--pastel-blue-foreground`, `--pastel-amber` /
   `--pastel-amber-foreground`. Applications bind meaning; the DS only ships the
   hues.
2. **Add matching variants to `Badge`** in `src/components/ui/badge.tsx`. Its
   current variants are `default`, `secondary`, `outline`, `ghost`,
   `destructive`, `verified`, `link` — none is a pastel. Add the pastels there
   rather than making call sites hand-roll `className` fills.
3. **Add a documented "code disc" shape**, since `size-4 rounded-full p-0
   text-[9px]` is a recipe every call site would otherwise re-type. Either a
   `shape`/`size` prop on `Badge` or a small dedicated component — your call, but
   document it and add it to the component gallery in `src/App.tsx`.
4. **Consider a third and fourth pastel** so the set is usable beyond two order
   types.

**Flag this honestly:** these four hexes are **NOT sourced from the DS Figma
file** — the Figma badge palette has no pastel variants. They are currently
marked `KNOWN GAP` in `src/index.css`. Keep that marker, or replace the values
with real Figma-sourced pastels if they now exist (check with
`search_design_system` against file key `PxzKUl6emRr8QQ5Nb0vlwT`). Do not
silently drop the marker.

---

## Task 3 — status chip: dot + coloured label, no fill

**What exists today.** `StatusText`, buried as a private helper inside
`src/components/tables-layout/DataTable.tsx`: a 6px dot on a `status-*` token
beside the label, where **only the dot** is coloured and the label stays
`foreground`. Separately, `statusBadgeVariant()` in
`src/components/tables-layout/data.ts` maps statuses onto *filled* Badge
variants (`verified` / `secondary` / `destructive`). Two competing treatments,
neither exported.

**The variation to add.** Dot **and** label both take the status colour, on **no
fill**:

```tsx
<span className={cn("inline-flex items-center gap-2 text-sm font-medium", STATUS_COLOR[status])}>
  <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
  {status}
</span>
```

`bg-current` on the dot means one class drives the whole chip. Colours come from
existing DS tokens — **no new colour is needed**:

| Meaning | Token | dark | light |
|---|---|---|---|
| positive / assigned | `--status-success` | `#22c55e` | `#16a34a` |
| pending / attention | `--status-processing` | `#f59e0b` | `#d97706` |
| failure | `--status-failed` | `#f87171` | `#dc2626` |

**What to build:**

1. **Promote it to a real exported component** — `StatusChip` or similar, in
   `src/components/ui/` (or its own folder), out of `DataTable.tsx`.
2. **Give it the three treatments as variants**, because all three are already in
   use or requested across the system:
   - `dot` — coloured dot, neutral label (today's `StatusText`)
   - `text` — coloured dot **and** coloured label, no fill (the new one)
   - `soft` — soft tinted pill, e.g. `bg-status-failed/10 text-status-failed`,
     which is the recipe the existing `destructive` Badge variant already uses
     and the right treatment for error states
3. **Reconcile `statusBadgeVariant()`** in `tables-layout/data.ts` with the new
   component so there is one status vocabulary, not two.
4. **Respect colour governance.** Per the DS's locked decision, a status carries
   **no colour until a usage rule binds it**. The DS ships the variants and the
   tokens; each application declares its own mapping. Do not hardcode
   domain statuses like `Assigned` / `Unassigned` into the DS component — take
   the colour as a prop or a caller-supplied map.
5. Add it to the gallery in `src/App.tsx` and to `docs/ds/` where status
   treatments are documented.

---

## Constraints and verification (all three tasks)

- **Verify in both themes.** Every one of these bugs existed *only* in dark. For
  each change, read the computed value in dark and in light and confirm the fill
  actually differs from the surface behind it. Do not trust a screenshot alone —
  the row-hover bug was a literal `[0,0,0]` RGB delta that looked plausible.
- `npx tsc -b --noEmit` and `npx eslint .` must both pass.
- Run the app (`npm run dev`) and confirm the gallery renders.
- If you change anything under `docs/ds/`, regenerate the bundle:
  `bash docs/ds/build-bundle.sh`
- **Foundation changes ripple.** `ui/*` and `src/index.css` reach every screen in
  the system. Land them first, push, then have layout work pull.
- Commit each task separately with a message that states the defect, the
  measured evidence, and why you chose that fix over the alternative. Then push:
  `git push -u origin <branch>`

## Follow-up this unblocks

Once Tasks 2 and 3 land, `prototypes/unified-view/` should drop its local
implementations and consume the DS versions instead:
`FuelOrdersTable.tsx` currently owns a private `TYPE_CLASS` map and a private
`StatusBadge`, and `src/index.css` carries the four `--order-*` tokens that Task
2 replaces with generic ones.
