# Record sheet

`id: unit.record-sheet` · `layer: unit` · `code: prototypes/unified-view/RecordSheet.tsx, prototypes/unified-view/PendingStrip.tsx, src/components/side-sheet/parts.tsx, src/components/side-sheet/form-steps.tsx` · `registry: fpds-record-sheet`

## Purpose
The right-hand side sheet that creates or edits ONE record — an order, a quote, a customer, an asset, a rule. It answers "what is this record, what does it still need, and what is the next thing to do with it?" Create and edit are the same sheet.

## Use when / Don't use when
- Use when a single record is created, read or edited from a list, board, map or dashboard tile.
- Use `level={2}` when the sheet opens over another sheet (invite partner over an order, a vendor quote, a dispute over an invoice).
- Don't use for a bulk change across many records — use `unit.bulk-bar` (Bulk edit).
- Don't use for a list's filters/export controls as a form — those are a `compact` sheet of controls, not a record.
- Don't build a page or modal for a record's create form — a separate create screen is how two descriptions of one record come to exist.

## Anatomy
1. **Header** — `SheetTitle` (create title or edit title) · `headerAside` beside it (status chip / `DraftStatusChip`) · optional `headerSubtitle` line under the title · on the right `headerActions` (things that OPEN something: history, preview) · `headerMenu` (⋯ — acts ON the record, e.g. delete, duplicate) · Close ✕ last.
2. **Steps strip** (optional, `steps`) — `SheetSteps` / `StageTrack compact` under the header, outside the scroll, on the sheet's own white (`bg-popover`), no rule under it.
3. **Body** — one scroll; sections (`SheetSection`, card by default) 40px apart. Two-column variant: form (fills) + **rail** 340px, sticky (`unit.summary-rail`).
4. **Quiet pattern** — added by the sheet itself when the content is half the visible height or less.
5. **Footer banner** (`footerBanner`, optional) — fixed strip above the footer: what the primary is waiting on (`PendingStrip`) or an exception that stops the work.
6. **Footer** — left: `footerAside` (decisions taken at the moment of committing); right: Cancel (only where `showCancel`) · the primary (`footerPrimary`, the next act). A read-out sheet with nothing to commit has NO footer (`noFooter`) — Master Data › Asset 360.

## Look
- Sheet: `gap-0 p-0`, side `right`, overlay gap `--fp-sheet-gap` = 56px (level 1) / 112px (level 2); width `--fp-sheet-w` = content width × `var(--fp-scale, 1)`, clamped to `var(--fp-vw) − gap`.
- Widths: `form` 600 (default) · `compact` 510 · `data` 1200 min, fields three across (`DATA_FIELDS` = `grid grid-cols-3 gap-4`) · `fit` = widest table's `CELL` widths + 34, + 364 with rail (340 + 24), never under 600 · `full` = viewport less the gap (only while a step column shows).
- `CELL` widths (px): check 44 · flag 72 · topOff 104 · level 150 · battery 100 · name 200 · pick 160 · number 110 · date 140 · status 140 · text 240 · bin 52. A table's own colgroup uses the same numbers.
- Header: `border-b border-border p-4`, items-start, gap-4; title `text-base`; title row gap 2.5; Close `text-muted-foreground`, opacity 70 → 100 on hover.
- Body: `p-4`, `flex-col gap-10` (40px between groups); `plain` section title 16px from its content.
- Footer banner: `border-t border-border px-4 py-2.5`. Footer: `border-t border-border p-4`, gap-3; aside `gap-x-8`.
- Draft note: `text-xs text-muted-foreground`, `Loader2` spinning while saving, `Check` once saved; `aria-live="polite"`.
- Pending strip: neutral = `text-muted-foreground`; caution (raised by a press) = `text-fp-banner-accent-caution`; all-clear = `text-fp-banner-accent-success` with `CircleCheck`. Item label is underlined (`decoration-current/40`, full on hover). Counter `text-xs tabular-nums`.
- Section blink: `.fp-attention` (outline, once); a grid column blinks a fill `.fp-attention-fill` (`data-blink`).
- Rail: `grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]`, `aside` `flex min-w-0 flex-col gap-6 lg:sticky lg:top-0`.

## States
- **create** — create title and create action on the primary; no rail (Summary · Associated records · Activity) while creating (Customer Portal's order request keeps its summary on the right while creating).
- **edit** — edit title; primary defaults to "Confirm" or the record's next act.
- **draft idle** — nothing beside the title (no "Saved" before the first change).
- **draft saving** — "Draft saving…" with spinner (500ms after a change settles).
- **draft saved** — "Draft saved" ✓. On a Draft the status chip gives way to this line; on any other status the chip stays and the note sits beside it.
- **not ready** — primary still pressable; pressing raises the caution pending strip and travels to the first gap.
- **ready** — pending strip (if standing) shows "Everything this record needs is filled in" in success color.
- **short content** — quiet pattern fills the rest of the body; disappears once content passes half the height.
- **level 2** — never wider than the sheet beneath less 56px, so a strip of it always shows.

## Interactions
| Trigger | Result |
|---|---|
| Open from a row, card, pin or tile | Sheet slides in from the right at its content width |
| Type in any field (existing record) | Draft chip: "Draft saving…" → "Draft saved" |
| Press primary, everything filled | `onSubmit` runs and the sheet closes |
| Press primary with `pending` items / `canSubmit` false | Nothing is submitted; the caution `PendingStrip` rises above the footer; the body scrolls (320ms, ease-out) to the first item's section and blinks its outline once |
| Press the pending item's label | Scrolls to that section and blinks it once (800ms); focus stays on the strip |
| Press ‹ / › on the strip | Steps to the previous / next outstanding item; "Pending" stays put; chevron disabled at either end |
| Last pending item filled | Strip says "Everything this record needs is filled in" |
| Press a step in the steps strip | Scrolls to that step's section (one scroll; nothing gated) |
| Press ⋯ (`headerMenu`) | Menu of acts on the record (delete, duplicate, …) |
| Press a header action (e.g. history icon) | Opens that thing (often a level-2 sheet) |
| Press ✕ / overlay / Esc | Sheet closes; a raised pending strip resets |
| Close a NEW order with anything typed | "Discard this order?" — Keep editing / Discard |
| Press Cancel (only where `showCancel`) | Closes the sheet |
| Open a level-2 sheet from inside | It opens 112px from the edge, narrower than the sheet below |
| Stage changes while open | Sheet scrolls to the section that stage's work lives in — on a change, never on open |
| Form grows past half the visible height | Quiet pattern disappears and takes no space |

## Outcomes
- A record created (create action) — it appears in its list/board and the sheet re-opens on it with its rail (3PL orders).
- A record kept as it is typed (autosave) — no Save needed.
- A record moved on one stage by the primary (the ladder: e.g. Create Order → Quoting).
- A Draft parked with "Save as Draft" (outline, left of the commit act; only while it is a draft).
- Nothing submitted, and the reader taken to the first missing field.
- A discarded new order (Discard confirmed) — nothing kept.
- A closed sheet with no change — nothing logged, no toast.

## Data contract
- `mode` create | edit; `createTitle`, `editTitle`; `createAction`, `editAction` (default "Confirm").
- `size` form | compact | data | full, or `fit { tables: number[][] (CELL widths), rail?: boolean }` — per step.
- `level` 1 | 2; `open`, `onOpenChange(open)`.
- `headerAside`, `headerSubtitle`, `headerActions`, `headerMenu`.
- `steps` (SheetSteps / StageTrack node), `stepNav`, `stepColumn` (off everywhere; archived), `stepsAction`.
- `pending: { key, label (an instruction), target? (section id) }[]`, `canSubmit`.
- `footerPrimary` (replaces the primary; `null` removes it), `footerAside`, `footerBanner`, `showCancel`.
- `onSubmit()` — called on a ready press; the sheet then closes.
- `useDraftSaveState(draft)` → idle | saving | saved, fed into `DraftStatusChip { tone, color?, label, saveState, showStatus? }`.
- Exports for builders: `CELL`, `fitWidth`, `FORM_WIDTH` 600, `DATA_WIDTH` 1200, `DATA_FIELDS`; `attend(id)`, `blink(id)`, `blinkGroup(name)`, `BLINK_MS`.

## Rules
1. **A sheet with editable fields autosaves and says so** — *a reader who must remember Save loses work; a silent autosave is not trusted* — `(source: docs/ds/ux/2-rules.md Side-sheet anatomy; docs/unified-view/3-interactions.md §1)`.
2. **Nothing before the first change** — no "Saved" on open — *a sheet that opens saying "Saved" claims to have done something it has not* — `(source: RecordSheet.tsx useDraftSaveState; 3-interactions §1)`.
3. **No Save, no Update, no Cancel** — Close is the exit; the only "Save" allowed is "Save as Draft" on a draft — *Cancel promises an undo an autosaving sheet can't keep* — `(source: ux/2-rules Side-sheet anatomy, Forms 2026-09-25)`.
4. **The primary is the next act, one only, a ladder** — the label is the act, never the state — *what's not happened yet belongs in the banner, not on a button* — `(source: ux/2-rules; unified-view/2-layouts §8)`.
5. **A primary that isn't ready stays pressable and says why on the press** (pending strip, travel, one blink) — *a dead button with no reason is the commonest broken thing in a form* — `(source: G25, Pavan 2026-10-07; ui/7-variants §1 footer)`.
6. **Pending items are instructions** ("Choose a customer"), one at a time, under a fixed word "Pending" — *three missing fields cost one line, and the subject never changes* — `(source: ux/2-rules Side-sheet anatomy)`.
7. **Blink once, leave no trace** — *two flashes ask to be watched; a ring that stays reads as a state* — `(source: PendingStrip.tsx, Pavan 2026-09-22)`.
8. **Create and edit are the same sheet** — *one layout to learn, no create form to drift* — `(source: ux/2-rules, promoted 2026-09-22)`.
9. **Width follows content**: form 600, `fit` from `CELL` widths (+rail), data 1200, per step; clamp to viewport − 56 — *a sheet sized for more than it holds reads as empty* — `(source: ui/7-variants §1, Pavan 2026-10-15)`.
10. **Every order sheet fits its tables plus its rail**; no form uses `full` — `(source: ui/7-variants §1, Pavan 2026-10-15)`.
11. **A sheet over a sheet takes the gap twice** and is never wider than the one beneath less 56 — *otherwise it reads as the same sheet having changed* — `(source: ux/2-rules, Pavan 2026-09-22; RecordSheet ParentSheetWidth 2026-10-15)`.
12. **Editable left, derived right** — the rail is read-only and sticky — *once an editable and a computed number share a column they look identical* — `(source: ux/2-rules two-column sheet)`.
13. **No rail while creating** — *the record doesn't exist yet* — `(source: feedback_ui_rules; ux/2-rules)`.
14. **A section is a card, 40px apart** — *the border says where a subject ends at any length* — `(source: ux/2-rules Section rhythm)`.
15. **A stepped create form is ONE vertical scroll**, steps drawn as `StageTrack` rings, pressing a step scrolls, nothing gated — `(source: ux/2-rules, Pavan 2026-10-16)`.
16. **Step column is off in every module** — `(source: RecordSheet stepColumn, Pavan 2026-10-07; docs/ds/ui/archive/step-column.md)`.
17. **Quiet pattern only when content ≤ 50% of the visible body; the sheet places it, never by hand** — `(source: ui/2-rules §11d, Pavan 2026-10-16)`.
18. **Side-by-side fields fill their row** (fr / flex-1, 24px gap) — re-check every row after a width change — `(source: ui/2-rules §10e, Pavan 2026-10-16)`.
19. **Removing an optional section is a minus, never a bin**; confirm only when it has content — `(source: ux/2-rules SheetSectionRemove)`.
20. **No helper text that explains a control** — state and consequence only — `(source: ux/2-rules helper text; feedback_no_unrequested_ui)`.
21. **Closing a new order with anything typed asks "Discard this order?"** — `(source: ui/7-variants §1 stepped form, Pavan 2026-10-06)`.
22. **A read stage speaks quietly** (3PL from Assigned on): every unit heading 14px medium muted — the rail cards' voice — units 24px apart, heading → box 10px; facts, not disabled fields — `(source: Pavan 2026-10-26)`
23. **Order facts in three groups side by side, ruled top to bottom** — what kind (job type · order type · PO · urgent) | who and where (customer · hub · ship-to) | tags — `(source: Pavan 2026-10-26)`
24. **A full-width unit under the form + rail (Pricing) is preceded by an edge-to-edge rule** through the sheet padding — 40px from the form's last unit to the rule, 40px from the rule to the unit — `(source: Pavan 2026-10-26)`
25. **Several partners priced → saved-views underline tabs on the column header's bottom rule**, the label level with the sibling headings; Finalize takes the tab on show — `(source: Pavan 2026-10-26)`
26. **A total row draws `border-t` only** — `border-y` stacks on the card rim — `(source: misses M-017; eval double-stroke)`
27. **A field that IS a value is read until adjusted** — a pencil BEFORE the figure (tooltip "Make adjustments" + why), the figure on the same right edge as its siblings; pressed, the box replaces it, right-aligned; never the box and the same figure side by side — `(source: Pavan 2026-10-26; misses M-018)`
28. **A sheet with nothing to commit has no footer** — no rule, no Confirm; Close is the exit (`noFooter`) — `(source: Pavan 2026-11-02, Asset 360; misses M-041; eval read-sheet-footer)`
29. **A record's related lists that people search and filter are full list units inside the sheet** — tabs choose the view, one search + Filters under them, `ListTable` with pagination filling the height — `(source: Pavan 2026-11-02; misses M-039/M-040)`
30. **Directory record sheets may group their read sections under a line tab strip** (`RecordReadSection.tab`, counts from `tabCount`) and give a section a heading `action`; an entity can replace the record sheet with its own layout (`EntityConfig.renderRecord`) while creating still uses the form — `(source: Master Data, 2026-11-02)`
31. **A select shows its chosen value as the list does** — first letter capital only, never CSS `capitalize`; optional comboboxes offer their empty choice first (`clearLabel`) — `(source: 2026-11-02)`

## Do / Don't
- ✅ Pass `fit` with `CELL` widths whenever the sheet holds a table; pass the current step's tables.
- ✅ Put `DraftStatusChip` in `headerAside`; `showStatus={false}` when a stage track already shows the status.
- ✅ Pass `pending` with instruction labels and section `target` ids.
- ✅ `showCancel={false}` on every autosaving sheet.
- ✅ Use `level={2}` for any sheet opened over another.
- ❌ A Save / Update / Save Changes / Cancel button in the footer.
- ❌ A fixed px width or `size="full"` for an order sheet.
- ❌ A disabled primary with no reason.
- ❌ Hand-placing `QuietPattern` in a sheet.
- ❌ A bespoke summary or activity block in the rail (use `unit.summary-rail`).

## Checks
- `read-sheet-footer` — a sheet whose submit only closes it must pass `noFooter`.
- `sheets` — a RecordSheet carrying a table (`<table`, `ProductTable`, `DocumentsTable`, `ListTable`) without `fit`; census of sizes.
- `parity-sheets` — G22 draft chip shown, G23 no Cancel / Save / Update, G25 dead primary says why, G27 no step column, G28 no retired `fill`, G29/G30 shared cards.
- `fields-fill` — fixed-width field containers.
- `field-reach` — a new field reaches every create/edit/list screen of its record.
- `microcopy` — helper text.
- `tokens`, `wcag-contrast`.
- By eye: after any width change, screenshot the whole sheet and check every field row reaches its right edge; the level-2 strip shows; the pending travel lands with 12px air above the section.

## Reference
- 3PL › Delivery Orders — order sheet (`threepl/BrokerOrderSheet.tsx`): fit + rail, ⋯ menu, Quotation summary, Documents, Discard dialog.
- 3PL › Asset Orders (`threepl/AssetMovementSheet.tsx`); 3PL › Recurring rules (`threepl/RecurringRuleSheet.tsx`, `RecurringProgramCreate.tsx` with steps).
- Master Data › Assets — Asset 360 (`masterdata/AssetSheet.tsx`: `size="full"`, `noFooter`, Edit details and Create order sheets at level 2).
- 3PL › Directory — customer / vendor records (`threepl/DirectoryRecordSheet.tsx`); level 2: Invite partner (`InvitePartnerSheet.tsx`), Vendor quote (`VendorQuoteSheet.tsx`).
- Sales › Orders and Quotes (`OrderSheet.tsx`, `QuoteSheet.tsx`); Sales › Customers / Assets (`CustomerSheet.tsx`, `AssetSheet.tsx` — `data` when existing, `form` when creating); Export (`ExportSheet.tsx`, `compact`).
- Service Work › Service Orders (`service/ServiceOrderSheet.tsx`); dispatch at level 2 (`service/DispatchFlow.tsx`).
- Customer Portal › Orders — order sheet (`customer-portal/OrderRequestSheet.tsx`); Invoices (`InvoiceSheet.tsx`, dispute at level 2 `DisputeSheet.tsx`); Sites & Assets — two-step ship-to and asset sheets (`ShipToSheet.tsx`, `AssetSheet.tsx`); Recurring rule (`RuleSheet.tsx`, steps).
