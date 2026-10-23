# Date picker

`id: unit.date-picker` · `layer: unit` · `code: src/components/ui/date-picker.tsx (DatePickerPanel, DateRangePopover, DateField, DateKeyField, DatePopover, DatePanel, dateWindowOf, formatDateRange), prototypes/unified-view/threepl/DateRangeFilter.tsx, prototypes/unified-view/DateFilter.tsx` · `registry: fpds-date-picker`

## Purpose
The one date picker for every screen that picks a date — a list's date filter and a form's date field alike: named presets, a calendar, typed dates, a live count, and nothing changes until Apply. It answers "which day or window do I mean, and how many records fall in it?"

## Use when / Don't use when
- Use the **range** form (default) for a list's date window: toolbar stepper `DateRangeFilter` (3PL › Delivery Orders, Sales › Orders, Service Work › Service Orders, Customer Portal › Orders) or `DateRangePopover` behind your own trigger.
- Use the **single** form (`select="single"`) for a field that holds one date: `DateField` (a `Date`), `DateKeyField` (a `YYYY-MM-DD` key, optional `min`), or `DatePopover` + `DatePanel` as a drop-in for a Popover + single Calendar in an existing form.
- Use `DateFilter` (‹ one day ›) for a list scoped to one day (the toolbar's `dateScope`).
- Don't use a bare `Calendar` in a popover, or any other picker.
- Don't use in the technician phone app — it keeps its full-width calendar (no room for a rail).

## Anatomy
**Panel (`DatePickerPanel`)**
1. **Preset rail** (left) — range: *All dates* (only when the list passes `all`), Today, Yesterday, This week, Last week, Last 7 days, Last 30 days, Next 7 days, Month to date, Last month, This quarter, **Custom range**. Single: Today, Tomorrow, Yesterday, In 7 days.
2. **Calendar** — two months side by side (range) or one month (single).
3. **Footer** — typed **Start date → End date** (MM/DD/YYYY; one "Date" field in single) · live **"N {noun} match"** · **Reset** · **Apply**.

**Triggers**
- `DateRangeFilter`: ‹ previous · **label** (a date, a span, or "All dates") · next ›.
- `DateFilter`: ‹ previous day · **full date** · next day ›.
- `DateField` / `DateKeyField`: an outline, full-width field button with `CalendarIcon` and the date, or "Select date".

## Look
- Popover: `w-auto p-0`, never wider than the viewport minus 2rem.
- Rail: `w-44` (176px), `border-r border-border`, `p-2 gap-0.5`; exactly as tall as the calendar — it scrolls inside that height. Preset rows `h-7 rounded-md px-2.5 text-sm text-left`, hover `bg-fp-row-hover`; the preset the draft is on: `bg-selected text-selected-foreground font-medium`.
- Calendar: DS `Calendar`, `px-3 py-1`; two months with a wide gap (`gap-12`); range ends filled, days between tinted (DS range styles).
- Footer: `border-t border-border px-4 py-2.5 gap-3`; inputs `h-8 w-32 tabular-nums`, placeholder "MM/DD/YYYY", "→" muted between; count `ml-auto text-sm text-muted-foreground tabular-nums`; Reset `variant="ghost" size="sm"`; Apply `size="sm"` primary.
- Stepper: arrows `variant="outline" size="icon-sm"` (32px); label `variant="outline" size="sm"`; `gap-1`. In the Export sheet the label takes the slack (`fullWidth`), arrows stay 32px.
- Tokens only — the reference image's indigo is not used.

## States
- **default** — draft = the current value; its preset (if any) selected, else Custom range.
- **picking** — after the first click in range mode, that day is a one-day range waiting for its other end.
- **hover / focus** — preset hover tint; `focus-visible:ring-2 ring-ring/50`.
- **selected** — the preset matching the draft; range ends filled.
- **disabled** — days ruled out by `disabled` / `min` can't be picked, presets that fall on them are not listed, typed dates on them are rejected. Reset disabled while the draft equals the reset target. Apply disabled with no draft (range). Stepper arrows disabled while on "All dates".
- **empty** — single field with no value shows "Select date" in muted; no count when the screen passes no `count`.

## Interactions
| Trigger | Result |
|---|---|
| Press the trigger (label / field) | Opens the panel; the draft starts at the current value. |
| Press a preset | Draft = that window; the calendar jumps to it; count updates. |
| Press **Custom range** | Puts the caret in the typed start field. |
| Click a day (range) | First click: a one-day draft, waiting. Second click: the other end (earlier day becomes the start). |
| Click a day, then Apply | Applies that one day (a range of one). |
| Click a day (single) | Draft = that day. |
| Type a date + Enter or leave the field | Valid & allowed → draft updates (ends swapped if reversed); invalid or ruled out → the field reverts. |
| Press **Reset** | Draft back to the reset target (3PL's stepper: today; a form field: the value it opened with). |
| Press **Apply** | Commits the draft to the screen and closes the popover. |
| Esc / outside click | Closes; nothing changes. |
| ‹ / › on the stepper | Moves the window by its own length (a week steps a week; a day steps a day). |
| Month arrows in the calendar | Browse months; draft unchanged. |

## Outcomes
- A new window on the list (rows, view statement, export count follow) or a new date in a form field.
- "All dates" — the span of the list's own records — with the stepper arrows disabled.
- A one-day range printed as one date ("Oct 22, 2026"); a span as "Oct 20, 2026 – Oct 26, 2026".
- Nothing, when closed without Apply or when a typed date is invalid.
- "0 orders match" shown before applying, so the reader can widen the window first.

## Data contract
- `DatePickerPanel`: `value` (`{from, to}` or null), `onApply(next)`, `select?` ("range" | "single"), `all?` (span for "All dates"), `resetTo?`, `count?(range) => number`, `noun?` (plural, default "records"), `disabled?` (react-day-picker matcher).
- `DateRangePopover`: panel props + `value`, `onChange(range)`, `children` (the trigger), `align?` (default "end").
- `DateField`: `value: Date | null`, `onChange(date | null)`, `placeholder?` ("Select date"), `disabled?`, `dayDisabled?`, `align?`, `children?` (custom trigger). `DateKeyField`: `value: "YYYY-MM-DD"`, `onChange(key)`, `min?`.
- `DatePopover` + `DatePanel`: `selected`, `onSelect(date)` (runs on Apply), `disabled?`.
- `dateWindowOf(keys)` → `{all, count}` from a list's `YYYY-MM-DD` record days — feed both to the range picker.
- `DateRangeFilter`: `value`, `onChange`, `fullWidth?`, `all?`, `count?`, `noun?`. `DateFilter`: `value`, `onChange`.

## Rules
1. **One date picker, used by every screen that picks a date** (filters and form fields, every module). — *several pickers (DateRangeFilter, DateFilter, DateButton, Calendar in ~25 files) taught several interactions.* — `(source: ui §10p "One date picker", Pavan 2026-10-21; memory project_feedback_round_2026_10_21 point 4)`
2. **Nothing changes until Apply** — presets, calendar and typed dates all edit a draft. — `(source: date-picker.tsx; ui §10p)`
3. **The preset rail is fixed and in this order**; "All dates" only when the list passes `all`, meaning the span of its records. — `(source: ui §10p; memory execution notes 2026-10-21)`
4. **A range picker picks one day too** — one click + Apply. — `(source: date-picker.tsx; ui §10p)`
5. **Typed dates are MM/DD/YYYY.** — *what a US dispatcher writes on a form.* — `(source: date-picker.tsx)`
6. **Live "N {noun} match" in the footer** when the list can count. — *read the result before committing.* — `(source: ui §10p)`
7. **The rail is as tall as the calendar, no taller; more air between the two months.** — `(source: date-picker.tsx, Pavan 2026-10-22)`
8. **Single-date fields use the same panel in one-date mode** (day presets, one month, one typed date). — `(source: memory project_feedback_round_2026_10_21 execution notes; ui §10p)`
9. **One day reads as one day** — never "Sep 7 – Sep 7". — `(source: DateRangeFilter.tsx; formatDateRange)`
10. **The list's date sits in the toolbar, not in the Filters panel.** — *every row on screen is scoped by it; its value must stay legible.* — `(source: DateFilter.tsx)`
11. **3PL-style lists scope by a range, stepped by its own length.** — *a broker's delivery windows run over weekends; a one-day view keeps looking empty.* — `(source: DateRangeFilter.tsx)`

## Do / Don't
- ✅ Feed `dateWindowOf(keys)` → `all` + `count` on every dated list.
- ✅ Swap a form's Popover + Calendar for `DatePopover` + `DatePanel` (same stored value).
- ✅ Pass `min` / `dayDisabled` to rule out impossible days.
- ❌ Apply on preset press or on day click.
- ❌ Lay the calendar out flat in a sheet (the Export sheet uses the stepper).
- ❌ Brand/indigo fills from the reference image; raw colors.

## Checks
- `tokens` — no raw colors in the panel or triggers.
- `fpds-units` — rail · calendar · footer present; single mode shows day presets and one month.
- `microcopy` — preset labels exactly as listed; "Custom range", "MM/DD/YYYY", "N … match", "Reset", "Apply", "Select date".
- By eye: nothing moves until Apply; rail height equals calendar height; a one-day window prints as one date.

## Reference
- 3PL › Delivery Orders (toolbar range stepper and Export sheet Date), Sales › Orders, Service Work › Service Orders, Customer Portal › Orders (range, with "All dates" and live count).
- Sales dashboard (one-day `DateFilter`).
- Form fields: the order sheets in 3PL › Delivery Orders, Sales › Orders and Quotes, Service Work › Service Orders, Customer Portal › Orders (`DatePanel`); the recurring rule frequency picker shared by 3PL › Recurring Orders and Customer Portal › Recurring Orders (`DateKeyField`); Customer Portal › Orders sheet's "Paid on" field (`DateKeyField`).
