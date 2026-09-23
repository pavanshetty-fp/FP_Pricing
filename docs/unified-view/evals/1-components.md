# Eval — components, tokens and colour


> **METHOD TAGS.** Every assertion below carries one, because an assertion with
> no stated method is one each run measures differently and no two runs agree
> on. `npm run eval` executes the `[script]` ones and writes a results file;
> the rest are read by a person or an agent, against this file.
>
> `[script]` a check in `scripts/eval/` · `[grep]` a one-line search, written
> out · `[structural]` a search plus a look at the context · `[read]` an agent
> reads the file against the doc · `[browser]` the running app.

Against `../1-components.md` and `docs/ds/ui/2-rules.md`.
**L1** = fixable automatically. **L2** = surface only.

## Tokens

- [ ] **L1** No raw hex outside `src/index.css`.
      `grep -rnE "#[0-9a-fA-F]{3,8}\b" src prototypes --include=*.tsx --include=*.ts`
- [ ] **L1** No `rgb(`/`hsl(` literals outside `src/index.css`.
- [ ] **L1** Every colour class resolves to a token — no Tailwind default
      palette (`text-gray-500`, `bg-slate-800`, `border-zinc-*`).
- [ ] **L2** Every token used exists in `src/index.css`. A class naming a token
      that was never defined renders as nothing and is invisible in review.
- [ ] **L2** No token defined and never used. Either it is missing a binding or
      it should go.

## Spacing and radii

- [ ] **L1** Every gap/padding is a Tailwind step, not an arbitrary value.
      `grep -rnE "(gap|p|px|py|m|mx|my)-\[" src prototypes`
- [ ] **L1** Every radius is `rounded-sm|md|lg|xl|full`, never `rounded-[…]`.
- [ ] **L2** Sheet sections are 40px apart and 16px inside. The 2.5× ratio is
      the rule; anything between them collapses the boundary.
- [ ] **L2** A pair of fields answered together is 24px apart and finishes at
      the same height.
- [ ] **L2** A table inside a section card is `flush`. A padded card around a
      bordered table is a box in a box.

## Type

- [ ] **L1** No font family outside Geist.
- [ ] **L2** Every arbitrary text size is `text-[13px]` or `text-[11px]`, and
      only inside a board card or a table row. Any other arbitrary size, or
      either of these outside a dense surface, is a finding.
- [ ] **L2** Three weights only: 600 for a figure or a unit heading, 500 for a
      label or a name, 400 for everything else.
- [ ] **L2** The one figure a card exists for is `text-lg`.
- [ ] **L2** No field label inside a card unit. The heading names the unit.
- [ ] **L1** Every figure that is compared down a column is `tabular-nums`.

## Icons

- [ ] **L1** Every icon is from `lucide-react`. No inline SVG paths, no second
      icon set.
- [ ] **L2** No browser-drawn glyph the app cannot theme — in particular no
      `<input type="date">` / `datetime-local`; the DS date control instead.
      `grep -rn 'type="date' src prototypes`

## Colour mapping

- [ ] **L2** Every hue in use appears in the mapping table in
      `../1-components.md`, and means exactly one thing across the app.
- [ ] **L2** No hue means two different things in two modules.
- [ ] **L1** No status chip or map names a DS tone — every one is declared as a
      kind (DS §10b). `npm run eval` → `status-kinds`.
- [ ] **L2** Every status's KIND is right: amber waits on somebody, blue asks
      nothing, green is done, red is a warning, grey is neither. And every
      status appears in the §5 binding table.
- [ ] **L2** Every module's `*_LANE_COLOR` and `*_TYPE_CODE` map is reflected in
      the table. A binding in code and not in the doc is the doc being wrong.
- [ ] **L1** Every `CodeDisc` has a `label`. The letter is never the only
      carrier of meaning.
- [ ] **L2** No chip that every row carries. A priority of "Normal", a status
      repeating its own lane heading — render the absence.
- [ ] **L2** Brand orange appears only as a CTA fill, the active-tab indicator,
      the brand mark, and the search-match highlight. Never a hover, never a
      selected row.
- [ ] **L2** Status is shown as a soft tint, never a saturated fill, and
      **never with a dot** — a status is its word (DS §11).

## Atomic level

- [ ] **L2** Nothing in `src/components/ui/` imports from `prototypes/`.
- [ ] **L2** No component in `src/` hardcodes a dataset. A component that
      cannot be pointed at other data is a screen in the wrong folder.
- [ ] **L2** No molecule exists in two copies. Two copies is the promotion
      signal — list the outstanding ones.
- [ ] **L2** Every fork of a DS component carries a header saying what it
      forked, why, and what to parameterise to undo it.

## From Unified View — added 2026-09-22

The settled work of the last week, turned into checks. See
`docs/ds/ui/7-variants.md` and `docs/unified-view/3pl/creation.md`.

- [ ] **L1** `[script]` A card's rim is `--fp-outline-1`, never `--border`.
      Settled 2026-09-22 — `--border` is the divider weight and a card was
      wearing it on the outside. — *ui §Strokes*
- [ ] **L2** `[read]` The three stroke weights are each doing their own job:
      rim, divider, field boundary. A boundary that is not reading gets
      spacing or a surface step, never a darker line. — *ui §Strokes*
- [ ] **L1** `[script]` No raw hex, colour literal or Tailwind palette class
      outside `src/index.css`. — *ui §Token discipline*
- [ ] **L1** `[script]` No arbitrary spacing or radius value. Widths and
      heights are exempt: a 340px rail is a measured decision with no scale to
      be on. — *ui §Token discipline*
- [ ] **L2** `[read]` **The exemption list in `scripts/eval/tokens.mjs` is
      audited on every run.** A path is exempt because the rule does not apply
      to it, never because the finding was tedious. Three today: the
      anti-pattern reference, the chart colour bridge, the vendored shadcn
      primitives.
- [ ] **L1** `[grep]` The only attention animations are `fp-attention` and
      `fp-attention-fill`. A third would be a second vocabulary for one act.
      `grep -rn "fp-attention" src prototypes`
- [ ] **L2** `[read]` Every hue still means exactly one thing in this app, and
      the mapping table is the only place it is decided. — *ui §10b*
