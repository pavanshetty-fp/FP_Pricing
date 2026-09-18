# UI · Do's & don'ts

Quick pointers into [`2-rules.md`](2-rules.md). One line each.

## Do
- **Drive every color/radius/spacing from tokens.**
- **Use the neutral `bg-primary` for the primary CTA** (near-white FP / near-black Light).
- **Show status by soft tint** (`bg-status-*/10 text-status-*`).
- **Pick component variants by the data's meaning** (semantic).
- **Use Lucide icons only.**
- **Lift the content layer with `shadow-fp-surface`, no border.**
- **Land radii on the ramp** — buttons/inputs `md`, cards `lg`.
- **Give a board lane `bg-fp-board-lane`** — the one token every board shares.
- **Give a table header `bg-fp-table-header`** so it survives light mode.
- **Pick the stroke by its job** — card rim `--fp-outline-1`, divider `--border`,
  field boundary and hover rim `--input` / `--fp-outline-2`.
- **Keep the hover rim darker than the resting rim.**

## Don't
- **Don't hardcode hex** (`bg-[#fa6400]`) — use `bg-brand`.
- **Don't use `bg-brand` as the default CTA** — it's a special accent.
- **Don't use a saturated status fill** where a soft tint belongs.
- **Don't put an outer border on the content layer.**
- **Don't use arbitrary radii** (`rounded-[5px]`).
- **Don't add Tabler/Hugeicons/Phosphor/Remix/emoji.**
- **Don't trace a light/foreign mock** — re-map to FP tokens.
- **Don't paint a board lane with `bg-accent`** — that is control emphasis, not a
  surface, and the lane will move the next time selection is retuned.
- **Don't point a board lane at `--fp-lane`** — that is the grouped-table band;
  moving it drags every group header in the app.
- **Don't darken the hairline to make a boundary read** — reach for spacing or a
  surface step first. A divider is a separation, not a rule.
- **Don't give a field the divider's weight** — in light the border is the only
  thing that makes a field a field.

## Colour mapping *(§10b)*
### Do
- **Keep one colour-mapping table per application**, listing each hue against the single thing it means there.
- **Treat a mapping as a decision**, written down — not as something inherited from the swatch's name.

### Don't
- **Don't let a hue mean two things in two modules.**
- **Don't ship a chip every row carries** — it says nothing.
