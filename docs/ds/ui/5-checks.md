# UI · Checks

Verifiable assertions derived from [`2-rules.md`](2-rules.md). Part of the
[`00-meta/conformance.md`](../00-meta/conformance.md) ship-gate.

- [ ] Every color is a token (no raw hex / no foreign palette).
- [ ] The primary CTA is the neutral `bg-primary`; `bg-brand` appears only as a deliberate accent.
- [ ] Status shown by soft tint (`status-*/10`), not saturated fills.
- [ ] Component variants follow the data's meaning (semantic).
- [ ] All icons are Lucide.
- [ ] Both Light and FP render; FP is default; toggle persists to `fp-theme`.
- [ ] Surfaces layer correctly (background → sidebar → content; global top bar on `bg-background`) with `shadow-fp-surface` on floating chrome; content layer has no outer border.
- [ ] Radii / type / spacing come from the scale, not one-off values.
- [ ] Text contrast ≥ WCAG AA in both modes.
