# Recurring section

`id: unit.recurring-section` · `layer: unit` · `code: prototypes/unified-view/RecurringOrderSection.tsx, prototypes/unified-view/threepl/RuleFrequency.tsx (RuleFrequencyPicker, NextDeliveries, scheduleSummary, encodeFrequency), src/components/side-sheet/parts.tsx (SheetSection, SheetSectionRemove)` · `registry: fpds-recurring-section`

## Purpose
An optional section on any order that can repeat: a dashed "Add Recurring Order" row until it is asked for, then the recurring rule's own frequency unit in a box. It answers "does this order repeat, on which days or dates, how often, until when" — set the same way wherever a repeat is set.

## Use when / Don't use when
- Use on every order sheet whose order can repeat (3PL Delivery Order, Customer Portal order).
- Use the frequency unit alone (`RuleFrequencyPicker`, in a "Frequency" section) inside a recurring RULE form, where repeating is the whole point.
- Don't use on Service Work service orders (they don't repeat — Agreements/Maintenance do) or Sales orders.
- Don't use on 3PL movement (asset) orders, or on a portal order made by a rule (the rule owns the repeating).
- Don't use a checkbox + frequency dropdown or a list of cadences.

## Anatomy
1. **Section** — `SheetSection` titled "Recurring order" (3PL passes "Recurring Order"); header action = `SheetSectionRemove` (minus icon, label "Remove recurring order" slides out on hover/focus) once on.
2. **Off: dashed add row** — "Add Recurring Order" left · outline "+ Add" button right.
3. **On: bordered box** (`fieldset`) holding **`RuleFrequencyPicker`**:
   - **Days | Date** — DS segment control.
   - **Days basis** — left column: "Select day/s" + seven day badges S M T W T F S (or, in a custom cycle, one badge row per "Week N"); under them "Daily" + switch and "Custom cycle" + switch side by side. Right side, two equal fields: **Repeat** (Weekly · Monthly · Yearly) and its follow-up — **Times a day** (1–3; >1 shows "Drop N" time inputs), **Which part of the month** (checkbox dropdown: Every week · First–Fourth week + "of the month"), or **Which part of the year** (First month of every year · Specific months → month chips). Cycle on: **Cycle length** (2/3/4 weeks) + **Week 1 starts**, and a **Next 4 weeks** preview below.
   - **Date basis** — "Select dates" + day numbers 1–31 filling the row; **Repeat** at the row's right edge (Every month · Every 2/3/6 months · Every year · Does not repeat).
   - **End date** — ghost "+ Add an end date", then a date field + bin "Remove the end date".
4. (Rule forms only) **Next 4 deliveries** — `NextDeliveries` strip pinned above the form's Create button.

## Look
- Add row: `rounded-md border border-dashed border-fp-outline-1 px-4 py-3`, label `text-sm text-foreground`, button `variant="outline" size="sm"`.
- On box: `rounded-md border border-fp-outline-1 p-4`.
- Segment: DS `ToggleGroup` outline `sm`, `h-7`, items `text-xs`; selected is greyscale (the segment control's own selection), never brand or violet.
- Day badges / date numbers / month chips: picked = `bg-accent-violet text-accent-violet-foreground`; unpicked = `bg-fp-card-1 text-muted-foreground` (dates `text-foreground`), hover to `text-foreground` / `bg-accent`. Badges `h-8 rounded-md text-sm font-medium`, stretching to fill a 360px days column; dates `h-9`, auto-fill grid of ≥2.5rem.
- Field labels `text-sm font-medium text-foreground`; "Drop N" `text-xs font-medium text-muted-foreground`.
- Days column 360px, then `gap-15`, then Repeat + follow-up as a `grid-cols-2 gap-6` that fills the rest. Date basis: dates `flex-1`, Repeat `w-62`, `gap-12`. End date field `w-62` (as wide as the badges).
- Validation lines `text-xs text-status-failed`.
- Preview / next-deliveries tiles: `rounded-md border border-fp-outline-1`, four across.

## States
- **off** — dashed "Add Recurring Order" row.
- **on** — box with the picker; minus in the section header.
- **locked, off** — section not rendered.
- **locked, on** — picker shown disabled (`fieldset disabled`), no minus.
- **daily** — all seven badges lit; Daily switch on.
- **custom cycle** — week rows replace the badges; Daily switch disabled (faint); Cycle length + Week 1 starts replace Repeat; Next 4 weeks preview below ("No delivery" for an empty week).
- **weekly × 2–3** — Drop time inputs under Repeat.
- **yearly, specific months** — month chips row.
- **end date set** — date field + bin instead of "+ Add an end date".
- **error** — "Pick at least one day." / "Pick at least one date." / "Pick at least one week."

## Interactions
| Trigger | Result |
|---|---|
| Press "+ Add" | Section turns on with a weekly frequency on the planned date's weekday (today's if no date), or the previously stored schedule |
| Press the section minus | Section turns off (no confirm); recurring flag cleared |
| Press Days / Date | Switches the basis |
| Press a day badge | Toggles that day; all seven = daily |
| Turn Daily on | All seven lit; the previous pick is remembered |
| Turn Daily off | The previous pick comes back (or none) |
| Turn Custom cycle on | Current days become Week 1, Week 2 empty; cycle settings and preview appear |
| Turn Custom cycle off | Back to weekly |
| Change Cycle length | Week rows added/removed, existing picks kept |
| Choose Repeat | Shows its follow-up field (Times a day / Which part of the month / Which part of the year) |
| Choose Times a day > 1 | A time input per drop |
| Tick weeks in the month dropdown | Several weeks, menu stays open; "Every week" clears single weeks and vice versa |
| Press a date number | Toggles that date (stored as its next occurrence) |
| Choose date Repeat | Every N months, every year, or once |
| Press "+ Add an end date" | End date set one year ahead, editable |
| Press the end date's bin | End date cleared (no end) |

## Outcomes
- The order carries `recurring: true` and a schedule (the frequency unit), plus its one-line summary ("Weekly · Tue, Fri", "Every month · 5th, 20th", "Every 2 weeks", "Every day") and the end date.
- Turning it off clears the recurring flag.
- Validation lines when nothing is picked; nothing blocks the sheet.
- Rule forms: the next four delivery dates update live; "—" when none.
- Autosaved with the record.

## Data contract
- `RecurringOrderSection` in: `on`, `schedule` (RuleFrequency or null), `plannedDay` (weekday 0–6), `locked`, `title`, `id`. Out: `onChange(frequency)` on turn-on and every edit; `onRemove()`.
- `RuleFrequency`: basis (days|date), dates, dateRepeat, dayMode (daily|specific), days, repeat (weekly|monthly|yearly|cycle), times, monthWeeks, yearlyMode, months, endKey (null = no end), cycleWeeks, cycleStartKey.
- Helpers: `blankFrequency()`, `scheduleSummary(f)`, `encodeFrequency(f)` (3PL stores it as text), `nextHits(f, 4)` → `NextDeliveries`.

## Rules
1. **Every order that can repeat uses this section: dashed "Add Recurring Order" → the frequency unit in a box; the minus removes it** — *Pavan, 2026-10-20: apply in all modules; the Load Order's optional-section shape* — `(source: ui §10m; memory feedback_delivery_timeline)`
2. **The frequency unit is the recurring rule's own `RuleFrequencyPicker`, never a frequency dropdown** — *one unit everywhere, so a repeat is set the same way wherever it is set* — `(source: RecurringOrderSection.tsx; ui §10m)`
3. **Two questions — which days, how it repeats — never one list of phrases** — *two lit badges and "monthly" are understood before they are read* — `(source: RuleFrequency.tsx header)`
4. **Picked days, dates and months are solid accent violet with white text** — *violet highlights; brand orange means "you chose this" for selection/focus* — `(source: ui §10c; memory feedback_accent_violet 2026-10-16)`
5. **The Days|Date segment is greyscale** — *segment controls are greyscale everywhere; the accent trial was "too much"* — `(source: memory feedback_ui_rules 2026-10-16; project_3pl_recurring)`
6. **Date basis = day numbers 1–31, no month to step; Repeat at the row's right edge** — *dates repeat every month or every N* — `(source: memory project_3pl_recurring 2026-10-20)`
7. **Days column wide, Repeat fields share the rest equally** — *the fixed 340px Repeat column left a third of the card empty* — `(source: ui §10e; memory feedback_fields_fill 2026-10-16)`
8. **No end date is the default; the offer to add one is the whole control** — `(source: RuleFrequency.tsx)`
9. **A new repeat starts on the planned date's weekday** — `(source: memory project_customer_portal 2026-10-20)`
10. **Off and locked → the section is not shown** — *a repeat that can't be added is not an option* — `(source: RecurringOrderSection.tsx)`

## Do / Don't
- ✅ Place it after the schedule/delivery section of the order sheet.
- ✅ Store the frequency itself and its `scheduleSummary` for lists.
- ✅ Use violet only for picks, the greyscale segment for Days|Date.
- ❌ A "Recurring order" checkbox with a Frequency dropdown beside it (the old pattern).
- ❌ A second violet, brand orange, or black for picked days.
- ❌ Fixed px widths on the Repeat fields.
- ❌ Showing it on service orders, Sales orders, movement orders, or portal orders made by a rule.

## Checks
- `fields-fill` — fixed-width containers holding the Repeat fields.
- `tokens`, `wcag-contrast` — accent-violet pair.
- `parity-sheets` — same section on create and edit.
- By eye: dashed add row when off, bordered box + minus when on, badges stretch across the days column, picks violet.

## Reference
- 3PL › Delivery Orders › Delivery Order sheet — "Recurring Order" section.
- Customer Portal › Orders › order sheet — "Recurring order" section.
- Frequency unit alone: 3PL › Recurring Orders › Create rule; Customer Portal › Recurring Orders › rule sheet ("Frequency", with Next 4 deliveries).
