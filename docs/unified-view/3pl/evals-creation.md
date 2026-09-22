# Eval — 3PL creation

`creation.md` turned into assertions. Run it with the segment evals in
`../evals/`; `../evals/0-how-to-run.md` says what the two layers mean.

> **EVERY ASSERTION NAMES THE DS RULE IT TESTS.** A module eval that only
> checks a module against its own document proves the document is
> self-consistent and nothing else — and a module document is exactly the
> thing most likely to have drifted. **The DS is the authority in every row
> below.** Where a row has no DS citation, that is itself the finding: either
> the rule belongs upstairs, or it is a genuine module binding and should say
> so.

**Scope:** the eight surfaces in `creation.md` §1.

| Surface | File |
|---|---|
| Delivery order (draft) | `threepl/BrokerOrderSheet.tsx` |
| Recurring rule V1.1 | `threepl/RecurringProgramCreate.tsx` |
| Recurring rule V1 | `threepl/RecurringRuleSheet.tsx` |
| Invite a partner | `threepl/InvitePartnerSheet.tsx` |
| A partner's quote | `threepl/VendorQuoteSheet.tsx` |
| One delivery off a rule | `threepl/RecurringDeliverySheet.tsx` |
| Asset movement | `threepl/AssetMovementSheet.tsx` |
| A directory record | `threepl/DirectoryRecordSheet.tsx` |

---

## L0 — the sheet

- [ ] **L1** Every surface above renders through `RecordSheet`. A hand-rolled
      `SheetContent` is a fork. — *ux §Side-sheet anatomy*
- [ ] **L1** `mode="create"` is used; there is no separate create component for
      a record that also has an edit sheet. — *creation.md §1; promote to ux*
- [ ] **L1** Every create surface autosaves and shows it —
      `useDraftSaveState` + `DraftStatusChip`. — *ux §Side-sheet anatomy*
- [ ] **L1** No create surface shows **Cancel** (`showCancel={false}`).
      — *ux §Side-sheet anatomy: "Cancel comes off"*
- [ ] **L1** No footer primary reads *Save*, *Save Changes* or *Update*. It
      names the act. — *ux §"THE PRIMARY IS A LADDER, NOT A SAVE"*
- [ ] **L1** Exactly one primary per step. — *ux §Action placement*
- [ ] **L1** A disabled primary has a `footerBanner` giving the reason, and the
      reason is not also a permanent clause beside the button. — *ux
      §"WHAT THE RECORD IS MISSING GETS A STRIP"*
- [ ] **L1** Every pending item's label is an instruction, not a field name.
      — *ux, same rule*
- [ ] **L1** Every pending item with a `target` names an `id` that exists in
      the rendered tree. An item pointing at nothing fails silently. — *ux,
      same rule*
- [ ] **L2** The strip's subject word does not change as items are stepped.
      — *ux, same rule*
- [ ] **L1** A sheet opened over another passes `level={2}`. The invitation,
      the quote sheet and the delivery sheet all do — the last was fixed on
      2026-09-22, having covered the rule sheet exactly. — *ux §Side-sheet
      anatomy (gap taken twice)*
- [ ] **L1** Width is declared per STEP, not per sheet, and comes from the
      five-name set. — *ux §"Width is per STEP, not per sheet"*
- [ ] **L2** At 1900 an `xxwide` step leaves exactly 56px (112 at level 2) and
      no strip of the list behind it; at 760 it folds to one column with no
      sideways scroll. — *ux §Side-sheet anatomy*

## L1 — the step

- [ ] **L1** A step that cannot be entered is **disabled**, not rendered empty.
      — *interactions §the dead control says why on the press*
- [ ] **L2** Pressing a disabled step says why. — *same*
- [ ] **L2** A completed step shows a tick in the success channel in place of
      its numeral, and the numeral is not also shown. — *ui §9 visual restraint*
- [ ] **L2** A second step restates what the first settled in one line, with a
      *Change* back to it. — *creation.md §7; no DS rule yet — promote or bind*
- [ ] **L1** The strip is numbered STEPS, not a `StageBar`. A record's stages
      never appear on a create sheet. — *ux §"The strip under the header is a
      STAGE BAR, not a stepper"*

## L2 — the group

- [ ] **L1** Every group is `SheetSection`. **A locally defined card component
      is a finding, and `RecurringProgramCreate`'s `Card` is the open one** —
      see `creation.md` §8, gap #1. — *ux §"A section is a CARD"*
- [ ] **L1** Every field is `SheetField`. `RecurringProgramCreate`'s local
      `Field` is the open one — §8, gap #2. — *ux §Side-sheet anatomy*
- [ ] **L1** A step strip is `SheetSteps`, not hand-rolled — §8, gap #6.
      — *ux §"The strip under the header is a STAGE BAR, not a stepper"*
- [ ] **L1** Footer flags are `FlagRow`, not an inline label — §8, gap #7.
      — *ux §"Footer flags"*
- [ ] **L1** A group whose body is a table is `flush`; one whose body is a CTA
      panel or an empty state is not. — *ui §10f*
- [ ] **L1** No table draws its own rim inside a group. — *ui §10f*
- [ ] **L1** An empty table renders as padded text. A dashed box is reserved
      for an optional section's Add CTA. — *ui §10f; creation.md §5 A4*
- [ ] **L2** Everything in a `flush` group that is not the table brings its own
      16px and puts the rule on the boundary. — *ui §10f*
- [ ] **L1** No group sets its own gap to the next group. — *ux §"Section
      rhythm — 40 / 16"*
- [ ] **L1** `shrink-0` is present on every card. — *ux, same rule*
- [ ] **L2** A group's explanation is a `SheetSectionNote` popover, never a
      paragraph under the title. — *ux §Molecule-hierarchy laws; and the
      standing rule that the UI ships the label and the control, not the
      explanation*
- [ ] **L1** `npm run eval:boxed-tables` exits zero. — *ui §10f*

## L4 / L5 — field and control

- [ ] **L1** Required is marked on the L4 label and nowhere else. No field is
      coloured for being empty. — *ui §9*
- [ ] **L1** Label→control is `gap-1.5`; control→helper is `gap-1`. — *ux
      §"Helper text is 4px from its control"*
- [ ] **L2** The control matches the shape of the answer, per the fixed mapping
      in `creation.md` §7. Two answers are a `RadioGroup`, never a `Select`.
      — *no DS rule — module binding, and it should say so*
- [ ] **L1** No derived value is rendered as a disabled input. — *ux §"Derived
      values are READ-OUTS, not disabled fields"*
- [ ] **L1** An unpriced or unentered number renders the dash, never `0.00`.
      — *creation.md §7; promote*
- [ ] **L2** Every control reaches AA in both themes. Disabled controls are
      exempt (WCAG 1.4.3 excludes inactive components) but must stay legible.
      — *`../evals/3-interactions.md`*

## Addition

- [ ] **L1** Every add on a table that fills its card is `HangingAdd` through
      `SheetSection`'s `hanging`. — *ui §10f*
- [ ] **L1** No add is a full-width band inside a card. — *ui §10f*
- [ ] **L2** An add inside a multi-table card is a **cell of the matrix**,
      styled like its siblings, with the button carrying the padding. — *ui
      §10f*
- [ ] **L2** An add whose item must be CHOSEN opens a picker from the section's
      `action`; it does not append a blank row that then demands a search.
      — *creation.md §5 A3; promote*
- [ ] **L1** An add with nothing left to add is **not rendered**, rather than
      rendered dead. — *interactions §the dead control; ui §10f*
- [ ] **L2** A picker gated by an earlier choice offers nothing outside the
      gate, and its empty state names the gate — *"Nothing matches inside this
      partner's area"*, not *"No results"*. — *ux §content; promote*
- [ ] **L2** A collision is flagged inline on the offending option and stays
      pressable. — *creation.md §5; promote*

## Subtraction

- [ ] **L1** A **minus** removes an optional section; a **bin** removes a row.
      Neither glyph appears in the other's job. — *ux §"Removing an optional
      section is a MINUS, never a bin"*
- [ ] **L1** `SheetSectionRemove` is the component; no surface hand-rolls it.
      — *same*
- [ ] **L1** Confirmation appears only when `hasContent`, and the caller
      decides what content means. — *ux §"Confirm only when there is something
      to lose"*
- [ ] **L1** Every row delete carries its subject in the `aria-label`.
      — *ui §Icons / interactions §naming*
- [ ] **L2** Removing the last row of a table does not remove the section.
      — *creation.md §6; promote*

## Colour and spacing

- [ ] **L1** Every gap in a creation surface is on the 4px scale and appears in
      `creation.md` §3. — *ux §Shell & spacing*
- [ ] **L1** No raw hex and no arbitrary colour value in any surface above.
      — *ui §Token discipline*
- [ ] **L1** A card's rim is `--fp-outline-1`, never `--border`. Settled
      2026-09-22; `SheetSection` was corrected. — *ui §Strokes*
- [ ] **L1** A table header is `bg-fp-table-header`, never `bg-fp-surface-1a`.
      — *ux §"A table header has its own ground"*
- [ ] **L1** No dot beside a status label. — *ui §11*
- [ ] **L2** Colour is never the only carrier of a state. — *interactions
      §2-rules*

## What no document covers

The third result, and the one that matters. **Anything on a creation screen
that neither `creation.md` nor `docs/ds/` describes is written down here on the
run, not fixed:**

- _(2026-09-22 — first run pending)_
