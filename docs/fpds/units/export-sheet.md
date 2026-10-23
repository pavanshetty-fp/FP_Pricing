# Export sheet

`id: unit.export-sheet` · `layer: unit` · `code: prototypes/unified-view/ExportSheet.tsx (ExportSheet, ValueChip, ExportFilterRow), prototypes/unified-view/RecordSheet.tsx (size "compact")` · `registry: fpds-export-sheet`

## Purpose
The side sheet that opens from a list's Export button and shows exactly what is about to leave — the same rows you are looking at, the narrowings that made them, how many — before you pick a format and export. It answers "what am I exporting, and is that what I mean?"

## Use when / Don't use when
- Use for every list's Export (the `Upload` icon at the right end of `unit.view-row`).
- Don't export silently from the toolbar — the sheet is the only path.
- Don't use for importing, for printing a single record, or for downloading a document from a row (Customer Portal › Invoices' Download column is its own cell).
- Don't use as a place to build a different filter — it edits the list's own state.

## Anatomy
1. **Header** — title "Export {Noun}" (e.g. "Export Orders"), the sheet's close ✕. No step column.
2. **Date** section (only when the list is date-scoped) — the screen's own date control, full width (3PL: the ‹ range › stepper).
3. **Filters** section —
   - the screen's own **Filters** trigger, full width (opens `unit.filter-panel`);
   - under it, one **row per narrowing that is on**: label (140px column) · value chips (each with ✕) · **Clear** (only when the row holds several values). Rows are separated by a full-width rule. Narrowings include the search text and the column search, not only facets.
4. **Footer** — left: the **count** ("62 orders"); right: **format** select (.csv · .pdf · .doc) 12px off the **Export** button. No Cancel.

## Look
- Sheet: `RecordSheet` `size="compact"` (510px — controls, not a form), `stepNav={false}`, `mode="create"`.
- Sections: `SheetSection variant="plain"` (heading + content, no card box); control and its list 12px apart (`gap-3`).
- Narrowing rows: `flex items-start gap-3`; label `w-[140px] text-xs text-muted-foreground pt-0.5`; chips `flex-wrap gap-1.5`; separator `border-b border-border pb-3` (not after the last row).
- Value chip = removable pill: `h-7 rounded-full bg-muted pl-3 pr-1 text-xs`, ✕ 20px round `hover:bg-foreground/10`.
- Clear: `variant="ghost" size="xs"`, `h-5 px-1 text-[11px] text-muted-foreground`.
- Footer count: number `font-medium tabular-nums text-foreground`, noun `text-muted-foreground`, `text-sm`.
- Format select: `size="sm"`, `w-[92px]`, `aria-label` "File format". Export: primary button.

## States
- **default** — format .csv; Export enabled; Filters section shows only the trigger when nothing is on.
- **with narrowings** — one row per narrowing, chips removable.
- **open (nested)** — the Filters popover or date picker open over the sheet.
- **disabled** — Export disabled when the count is 0 (Enter does nothing either).
- **empty** — no narrowings: no rows under the Filters trigger; the count is the whole list.

## Interactions
| Trigger | Result |
|---|---|
| Press **Export** on the view row | Opens the sheet with the list's current narrowing. |
| Step / pick the date | Changes the LIST's date window (visible behind the sheet); count updates. |
| Press **Filters** → tick → **Apply Filters** | Changes the list's filters; rows and count update. |
| Press ✕ on a value chip | Removes that one value from the list's narrowing; count updates. |
| Press **Clear** on a row | Removes every value in that row. |
| Change the format | Sets .csv / .pdf / .doc for this export. |
| Press **Export** (or Enter) with count > 0 | Closes the sheet; toast "Exporting 62 orders as .csv". |
| Press ✕ / Esc / outside | Closes; any narrowing changed in the sheet stays on the list (they were the list's own). |

## Outcomes
- A one-line success toast naming count, noun and format ("Exporting 1 order as .pdf").
- A list narrowed or widened from inside the sheet — the same change is visible behind it and after it closes.
- Nothing exported when the count is 0 (button disabled).
- Close without exporting: no file; narrowings kept as edited.

## Data contract
- `open`, `onOpenChange(open)`, `title?` ("Export {Noun}"), `noun` (plural), `nounOne?` (defaults to `noun` minus a trailing s), `count` (rows the narrowing leaves).
- `date?` — the screen's own date control node (`fullWidth`).
- `filtersControl?` — the screen's own `ListFilters` with `fullWidth`.
- `filters: ExportFilterRow[]` — `{key, label, values: {value, onRemove}[], onRemoveAll?}`; rows with no values are skipped.
- `onExport(format)` — `"csv" | "pdf" | "doc"`; the screen closes the sheet and toasts.

## Rules
1. **The export is the list** — filtered, searched, sorted, all pages. — *the file is the rows you're looking at, narrowed by the same questions.* — `(source: ExportSheet.tsx; ui §10c "Export means the rows you are looking at")`
2. **Export always opens this sheet first.** — *exporting silently hid the narrowing at the one moment it matters — when data goes where it can't be corrected.* — `(source: ExportSheet.tsx)`
3. **The sheet's controls are the screen's controls** (same date stepper, same Filters panel, staging until Apply). — *one interaction to learn instead of three.* — `(source: ExportSheet.tsx; 3PL BrokerOrdersScreen.tsx)`
4. **It edits the list's own state, never a private copy.** — *two filter models that disagree is how you export one thing while looking at another.* — `(source: ExportSheet.tsx)`
5. **The count keeps the footer's left; the format travels with the Export button, 12px off it.** — *the count is what you're deciding about; the format is part of the act, not a fact about the list.* — `(source: ExportSheet.tsx)`
6. **No Cancel.** — *the sheet commits nothing on the way through; Close already does what Cancel would.* — `(source: ExportSheet.tsx)`
7. **Plain sections, not cards; the date is one line under its heading.** — *a box around one control is a third edge inside a bordered sheet.* — `(source: ExportSheet.tsx)`
8. **Clear appears only on a row with several values.** — *on one value it duplicates the chip's ✕.* — `(source: ExportSheet.tsx)`
9. **Width 510 (`compact`).** — *controls, not a two-column form.* — `(source: RecordSheet.tsx)`
10. **The toast is one line.** — `(source: memory feedback_toasts; docs/unified-view/3-interactions.md)`

## Do / Don't
- ✅ Pass the screen's own `ListFilters` (`fullWidth`) and date control.
- ✅ Include search and column search as narrowing rows.
- ✅ Title it "Export {Noun}".
- ❌ Lay out a flat calendar or a flat facet list in the sheet.
- ❌ Add a Cancel button or a second toast line ("The filtered list…").
- ❌ Keep a separate export filter state.

## Checks
- `fpds-units` — header · Date (when dated) · Filters + rows · footer (count left; format + Export right).
- `microcopy` — "Export {Noun}", "Date", "Filters", "Clear", "Export", ".csv / .pdf / .doc", toast "Exporting N {noun} as .{format}".
- By eye: removing a chip in the sheet changes the list behind it; Export disabled at 0.

## Reference
- 3PL › Delivery Orders (with Date), 3PL › Recurring Orders, 3PL › Directory.
- Sales › Orders, Sales › Quotes, Sales › Customers, Sales › Assets.
- Customer Portal › Orders, › Invoices, › Sites & Assets, › Team & Access; Service Work reference pages (via `unit.standard-list`).
