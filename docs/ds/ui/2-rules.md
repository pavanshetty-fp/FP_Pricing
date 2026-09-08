# UI · Rules & behaviour  *(canonical)*

The normative rules for the visual surface. **Single source** — Do's/Don'ts, Common
mistakes, and Checks derive from these.

## Token discipline
- **Use tokens, never raw hex.** `bg-background`, `text-foreground`, `bg-card`,
  `bg-brand`, `bg-fp-surface-1b`, etc. If a color you need isn't a token, **add it
  to the token layer** — don't hardcode.
- **Scale discipline.** Corners from the radius ramp (`sm 6 · md 8 · lg 10 · xl 14`;
  buttons/inputs → `md`, cards → `lg`), text from the type scale, spacing from the
  named steps. No one-off values.

## Strokes
**Three weights, three jobs.** In light:

| token | light | on `#ffffff` | job |
|---|---|---|---|
| `--fp-outline-1` | `#e2e5ea` | 1.26:1 | a card's own rim |
| `--border` (`--fp-stroke-hairline`) | `#d4d4d8` zinc/300 | 1.48:1 | a structural divider — page header, tab strip, table edge and row rules, sidebar edge |
| `--input` (`--fp-stroke-field`) · `--fp-outline-2` | `#c4c4c9` | 1.74:1 | a field's boundary, and the rim that has to beat a card's (hover / active) |

- **A field border does more work than a divider**, which is why they are not one
  value. In light an `Input` is `bg-transparent` — only dark gets `dark:bg-input/30`
  — so the border is the *only* thing that makes a field a field; a divider merely
  separates two things that exist anyway.
- **The hover rim must be darker than the resting rim.** `--fp-outline-2` was
  `#ededed` (1.17:1) against `--fp-outline-1`'s 1.26 — the "stronger" rim was the
  weaker one, and every Kanban card got *lighter* on hover. Any future retune keeps
  `outline-2` below `outline-1` on the contrast column above.
- **`--fp-stroke-field` and `--fp-outline-2` share a value and stay separate
  tokens** — the same discipline `--fp-lane` / `--fp-board-lane` follow. One is a
  field's only boundary, the other is a rim; retuning one must never drag the other.
- **`#c4c4c9` is deliberately off the Tailwind ramp.** The neutral ramps jump from
  ~1.48 at 300 to ~2.56 at 400, and a field border wants the gap between them. It
  keeps zinc's hue (B−R +5 vs zinc/300's +4) so the three read as one family.
- **Never raise a stroke to make something read.** If a boundary is not reading, the
  answer is nearly always spacing or a surface step, not a darker line.
- **3:1 is not reachable on this ramp.** WCAG 1.4.11 asks 3:1 for a control's
  boundary; on white that first happens at `#949494`. No neutral ramp value meets it
  — zinc/400 did not either. Closing it properly means giving inputs a *fill*, not a
  darker border.

## Color governance
- **`--brand` (`#fa6400`, orange) is the accent, not `--primary`.** Don't confuse
  the tokens.
- **The primary CTA is the neutral `bg-primary text-primary-foreground`** (near-white
  FP / near-black Light). `bg-brand` is a *special accent*, used only where a brand
  emphasis is specifically called for — never the default CTA. (Brand-as-CTA isn't a
  rule yet; revisit once enough patterns exist.) *(Emphasis-budget — one primary per
  view — is canonical in `ux/2-rules` H3.)*
- **Status is shown by soft tint**, not a saturated block: `bg-status-*/10
  text-status-*` (a highlighted "best" cell follows the same rule).
- **Semantic variants.** A component's variant follows the *meaning of the data*,
  never a hardcoded literal — e.g. `statusBadgeVariant(status)` maps Success→verified,
  Processing→secondary, Failed→destructive. Derive the variant from the value.
- **Add a status color** by joining the family: `--status-<name>` in `:root` *and*
  `.dark`, a `--color-status-<name>` mapping in `@theme inline`, a soft-tint badge
  variant, applied by data meaning.

## Icons
- **Lucide only** (`lucide-react`). Never Tabler / Hugeicons / Phosphor / Remix / emoji
  / one-off SVGs. When a glyph isn't in the Lucide bank, inline an SVG with
  `currentColor` — don't pull another set.

## Surfaces & elevation
- The **content layer** is `rounded-md bg-fp-surface-1b shadow-fp-surface` with **no
  outer border** — it lifts with shadow.
- Cards use `bg-card` (Surface 1a) + a `border-fp-outline-1` hairline to separate on
  the content layer.
- Inner cards step up to `bg-fp-card-1`.
- **A board lane's ground is `bg-fp-board-lane`** — one token, every board (the DS
  Kanban and the 3PL brokerage board both take it, so they move together). It is
  *not* `bg-accent`: `--accent` is the control-emphasis family (the fill behind a
  selected menu item), and a lane that borrows it moves whenever selection is
  retuned. Light resolves to `--fp-card-2`; measured, that is an 11/255 step under
  the content layer and 11/255 above the white cards on it — the lane reads as a
  column, and a card is still the lightest thing in it.
- **A board lane is not a row band.** `--fp-lane` is the fill behind a *grouped
  table's* header row; `--fp-board-lane` is the fill behind a *board column*. They
  stay two tokens even when they resolve to the same value, so retuning one never
  drags the other.
- **A table header needs its own ground in light** (`bg-fp-table-header`). Dark
  gets it from the panel fill; in light the layer and the header are both `#ffffff`
  and a header that is only a hairline stops being a header the moment the first
  row has one too.
- Apply `shadow-fp-surface` to floating chrome (drawer, content layer); the rail gets
  no shadow.
- **Elevation steps once per level** (`surface-1b → card → fp-card-1`) — *canonical in
  `ux/2-rules` H2, since it's a composition rule; the surface tokens live here.*

## Theming
- **Two modes**, FP default. Ship both Light (`:root`) and FP (`.dark`); the toggle
  flips `.dark` and persists to `fp-theme`. Translate a foreign/light mock to these
  tokens — never copy a literal palette (translate, don't trace).

---

*Folded in from `02-rules/interaction-and-behavior.md` — see the provenance note in `interactions/2-rules.md`.*

## 9. Visual restraint (color governance)

Promoted from the smoke-test feedback. The DS provides colored chips, badges,
ribbons and accents, but **color usage is governed, not free**.

- **Neutrals by default, everywhere.** Until a Layer 2 usage rule binds a
  color to a semantic role, every chip, badge, status, tag, and indicator
  renders neutral (surface = `--color-muted` / `--color-secondary`,
  foreground = `--color-foreground` or `--color-muted-foreground`).
- **Brand orange (`--color-brand` = #FA6400) is reserved for**: primary CTA
  fill, active-tab indicator, brand mark, and intentional brand-led moments
  (e.g. the FP logo tile). Not used for hover surfaces, selected-row tints,
  inline links, or generic interactive states.
- **Destructive color (`--color-destructive`) appears only on a destructive
  action's label text or icon glyph** — never as a button fill, never as a
  row tint. The Edit/Share/**Delete** row-action menu is the canonical
  example: only "Delete"'s label is red.
  - **Carve-out — the final confirm in a guarded destructive flow.** Where a
    destructive action has already been guarded (a second, armed press, or an
    `AlertDialog`), that last control MAY take the destructive fill: at that
    point the fill is the warning, and the user has passed a deliberate step to
    reach it. This is the only fill exception; menu rows and row actions keep
    label-only. *(Amended when this rule was folded into the repo — the shipped
    `BulkEditDialog` armed confirm relies on it.)*
- **Status semantics** (Success/Warning/Error etc.) exist as variants in the
  DS components, but render **neutral** in generated output until a usage
  rule defines which records get which color and why. This applies to:
  order statuses (Unassigned · Active · Blocked · Cancelled · etc.), tag
  chips (Gold/Silver/Platinum Customer, High/Less Priority, etc.), pricing
  flags (P/M), and severity banners (per §3 diagnostic disclosure — those
  WERE earned: warning/error/info already have a usage rule).
- **References do not inform color usage.** The reference screens are
  saturated with category-coded colors that have not been governed. Mining
  references for *structure* and *behavior* is encouraged; copying their
  color choices is not.
- When in doubt: **render neutral, flag a usage-rule gap.** Do not invent.
