# UI · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Every color is a token (no raw hex / no foreign palette).
- [ ] The primary CTA is the neutral `bg-primary`; `bg-brand` appears only as a deliberate accent.
- [ ] Status shown by soft tint (`status-*/10`), not saturated fills.
- [ ] Component variants follow the data's meaning (semantic).
- [ ] All icons are Lucide.
- [ ] Both Light and FP render; FP is default; toggle persists to `fp-theme`.
- [ ] Surfaces layer correctly (ground → drawer → content, with cards and fields a step *under* the content layer; global top bar on `bg-background`). Nothing in the shell casts a shadow; the content layer has no outer border.
- [ ] Hover and selected use different tokens — `--accent` for *the pointer is here*, `--selected` for *this is the one*. They must never resolve to the same fill.
- [ ] Radii / type / spacing come from the scale, not one-off values.
- [ ] Text contrast ≥ WCAG AA in both modes.

## Fill-vs-surface check (run before shipping any new fill)

A fill is only a fill if it differs from what is behind it. Several DS tokens are
**byte-identical to a surface token in at least one theme**, so a fill that looks
fine in one theme can composite to a literal `[0,0,0]` in the other — it runs in
both directions, and since the 2026-08-27 light sync the largest such family is
in Light, not FP-dark:

| Token | Collides with | Where |
|---|---|---|
| `--muted` | `--fp-surface-1b`, `--popover` | FP-dark, both `#1b2028` |
| `--popover` | `--fp-surface-1b` | both themes (`#1b2028` / `#ffffff`) |
| `--accent` | `--fp-card-1` | FP-dark, both `#2a2f37` |
| ~~`--background`~~ | ~~`--card`, `--popover`, `--fp-surface-1a`, `--fp-surface-1b`~~ | Light — **resolved 2026-09-11**: `--background` went back to the tinted Surface Base (`#efefeb`), and `--fp-surface-1a` (and so `--card`) moved to the inner-panel step `#f4f5f8`. Only `--popover`/`--fp-surface-1b` are still white together, which is correct — a popover IS the content layer, lifted. |
| `--accent` | `--selected` | **FP-dark, both `#2a2f37`.** Deliberate: dark selects in grey, and the grey it selects in is the raised-surface step. They differ by what carries them — a hover is transient, a selection persists and takes `--selected-foreground` as well — but a fill that has to read as *chosen* against a *hovered* neighbour cannot rely on the fill alone in this theme. |
| ~~`--fp-outline-2`~~ | ~~`--accent`~~ | Light — **resolved** 2026-08-27, `--accent` moved to `#e5e7eb` |

This family has now caught nine token pairs, eight of them live: the same sync
that resolved `--fp-outline-2`/`--accent` opened four new ones by moving
`--background` onto white. Note that the colliding pair differs BY THEME —
`--accent`/`--fp-card-1` collide only in dark, the `--background` white family
only in light — so a single token chosen for one theme can silently fail in the
other. In light this now means a card separates from the app ground by border and
shadow alone; if you need the old tinted ground, name `--fp-surface-base`. Before shipping a fill:

1. Identify the **actual** surface behind the element — not the one you assume.
   For an overlay, that is whatever it floats over (for the bulk bar, selected
   rows, not the content layer).
2. Read both computed values and confirm the RGB delta is non-zero. **Do not
   judge from a screenshot** — a `[0,0,0]` delta looks like a plausible flat
   panel.
3. Check **both** themes. Every defect in this family was invisible in exactly
   one of them.
4. When flipping themes to measure, **wait for `transition-colors` to settle**
   before reading, or you will capture mid-transition values.
5. If no fill can separate (the overlay case), the shadow must carry it — use
   `--shadow-fp-overlay`, and verify the separation rather than assuming it.
6. **Do not borrow a control-emphasis token for a background wash.** `--accent`
   is sized to fill a button or a menu row; behind a full table row it reads as
   a block of colour. Measured, light rows on `--accent` sat `[53,46,36]` off
   `#ffffff` when selected. A wash needs its own token — see `--fp-row-hover`
   / `--fp-row-selected`. The tell is scale: the larger the painted area, the
   quieter the value has to be for the same perceived weight.
