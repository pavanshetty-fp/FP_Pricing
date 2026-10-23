# FPDS 08 — Interaction rules

> **How to read this**
> 1. Every rule here is **binding** for any builder — Lovable, Cursor, Claude or a person. None of them is a suggestion to improve on.
> 2. The **Why** is part of the rule: behavior that matches the words but defeats the Why breaks the rule.
> 3. Where sources disagreed, the **newer decision wins** and the older one is named as superseded; decisions marked **REVERTED** must not be rebuilt.
> 4. `Check` names the eval that catches a break (`review` = a person or agent reads it, often in the running app); `Source` says where the decision lives.
> 5. If you cannot satisfy a rule with existing units, **stop** and use the gap protocol in `docs/fpds/00-protocol.md` — never invent a gesture, state or motion.

Where things go and what they mean is in `07-ux-rules.md`. This file says **how it behaves**.

---

## 1. Hover, press, focus, keyboard

**IX-1. Every interactive element shows a visible focus ring (`focus-visible:ring-2 ring-ring/50`; `ring-inset` inside table cells), and the ring leads somewhere: anything with `role="button"` activates on Enter and Space.**
- **Why:** focus is always shown and a focusable thing that does nothing is a dead end for keyboard users.
- **Applies to:** every control, row and card.
- **Check:** review
- **Source:** `docs/ds/interactions/2-rules.md` Focus; `unified-view/3-interactions.md` §8; `unified-view/evals/3-interactions.md`

**IX-2. Hover is subtle and the same everywhere: `hover:bg-accent` (the gray hover); a table cell paints the full cell, no inset outline. The brand color is never a hover state.**
- **Why:** brand is CTA fills, the active tab, the brand mark and the search-match highlight at 25% — nothing else.
- **Applies to:** every control and editable cell.
- **Check:** review
- **Source:** `interactions/2-rules.md` Hover; `unified-view/3-interactions.md` §5

**IX-3. Row actions appear on hover AND on focus — never on hover alone.**
- **Why:** a keyboard user must reach the same acts.
- **Applies to:** row delete, row ⋯, any revealed action.
- **Check:** review (G38)
- **Source:** `unified-view/3-interactions.md` §5; `ux/2-rules.md` "Tables — delete on hover"

**IX-4. Hover is not a way to see data. Anything worth reading opens on a PRESS. The one sanctioned hover read-out is a map pin's primary details (the press opens the record).**
- **Why:** on a board of forty cards a hover card fires on the way past; the reader asks for this one.
- **Applies to:** cards, figures, breakdowns. Exception: CP/UV map pins.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §5; 3PL README "It is a press, not a hover"; CP README Orders (map)

**IX-5. An underline promises something hidden: a dotted underline appears on a figure only where pressing it reveals what it is made of, and never on a figure whose breakdown is already on screen. On a dashboard headline, the figure softens on hover (no underline) and opens its explanation on press.**
- **Why:** "An affordance is a promise", never made falsely.
- **Applies to:** board card prices, summary figures, CP dashboard headlines.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §4; CP README Dashboard (2026-10-14)

**IX-6. An explanation opens on CLICK from an ⓘ beside the heading, in a narrow popover of a few short lines — never on hover, never as a paragraph. An icon that is already the whole message (a copy glyph) gets no tooltip, only an `aria-label`.**
- **Why:** hover can't be reached by touch; a tooltip that appears while aiming at something else covers the next thing wanted.
- **Applies to:** section notes, chart explainers.
- **Check:** microcopy
- **Source:** `interactions/2-rules.md` §3b

**IX-7. Every icon-only control has an `aria-label` carrying its full phrase (a collapsed "+" says "Add product").**
- **Why:** the collapsed state is a visual economy, never a nameless control.
- **Applies to:** every icon button, hanging add, view-bar tool.
- **Check:** review
- **Source:** `interactions/2-rules.md` Accessibility; `ui/2-rules.md` §10f

**IX-8. A disabled control fires no pointer events, so its reason hangs on a wrapper (`<span tabIndex={0}>` around a `pointer-events-none` button) with a Tooltip of ONE imperative sentence ("Choose a technician before proceeding."). A control with nothing to point at is hidden, not disabled.**
- **Why:** a clause parked beside the button is read on every visit; a tooltip on the disabled element itself never opens — the feedback is silently deleted.
- **Applies to:** any control that can be dead for a reason the reader can fix.
- **Check:** review
- **Source:** `interactions/2-rules.md` §7b; `unified-view/3-interactions.md` §3

**IX-9. Keyboard paths for tables: a focused column header moves with ⌘/Ctrl + ← →; a focused resize divider nudges 16px with ← →; a row opens with Enter or Space; in a row delete, the cursor lands on ✕ and Escape or a click away takes it back.**
- **Why:** a header that only moves by mouse does not move for everyone; the question is asked where the finger already is.
- **Applies to:** every table.
- **Check:** review
- **Source:** `ux/2-rules.md` columns; `ui/2-rules.md` §10f "Rows"

**IX-10. Every list opens BELOW its trigger, left-aligned, 4px off — never laid over the field (no Radix `item-aligned`).**
- **Why:** laid over the trigger, the field disappears at the moment of choosing.
- **Applies to:** every select, combobox and menu.
- **Check:** review
- **Source:** `interactions/2-rules.md` §2a

**IX-11. In an empty Qty cell, the suggested quantity shows as the placeholder and → takes it.**
- **Why:** the suggestion is offered without being a column or a prefill the user didn't choose.
- **Applies to:** CP order lines; 3PL Delivery Order lines (Qty placeholder = suggested gal).
- **Check:** review
- **Source:** memory `project_customer_portal.md` (2026-10-20); `project_3pl.md` (2026-10-20)

---

## 2. Staging vs live

**IX-12. The Filters panel STAGES: ticks change nothing until Apply Filters. Its footer shows a live "N results" on the left (what Apply would show) and Clear All beside Apply Filters on the right; a panel that narrows nothing shows no count.**
- **Why:** a facet panel narrows across several facets; the count lets the reader see the result before committing.
- **Applies to:** every list's Filters panel.
- **Check:** parity-lists (G6)
- **Source:** `interactions/2-rules.md` §4 (2026-10-05); `unified-view/1-components.md` §6

**IX-13. The date picker STAGES too: nothing changes until Apply. The preset the draft is on is selected; one click + Apply = one day; typed start → end (MM/DD/YYYY); a live "N orders match"; Reset.**
- **Why:** a range is built in two clicks and must not fire half-made.
- **Applies to:** every date filter and date field (`date-picker.tsx`).
- **Check:** review
- **Source:** `ui/2-rules.md` §10p "One date picker"

**IX-14. Search and the column-search boxes are LIVE: rows narrow as you type. Column boxes are AND-ed; closing the filter row clears every box; the row stays open when nothing matches (the table shows no rows rather than an empty state).**
- **Why:** a narrowing with nothing on screen is not allowed; the boxes are what the reader must change to get the rows back.
- **Applies to:** every table (table view only).
- **Check:** parity-lists (G2)
- **Source:** `ui/2-rules.md` §10g

**IX-15. Applying any narrowing resets the list to page 1.**
- **Why:** a filter that leaves you on page 4 of a 2-page result is a list that appears empty.
- **Applies to:** every paged list.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §7; `unified-view/evals/3-interactions.md` Lists

**IX-16. A new record is revealed by WIDENING the list's window to take it in — never by moving the window. The same holds while a sheet is open, so a record cannot slip out from behind its own sheet.**
- **Why:** jumping to the new record's date takes away what was being watched.
- **Applies to:** every date-scoped list.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` §4; 3PL README

**IX-17. The Export sheet edits the list's own narrowings (already applied behind it); it commits nothing on the way through, so it has no Cancel. The format is chosen beside Export in the footer.**
- **Why:** the count in the footer is the count on the list; the format is part of the act.
- **Applies to:** `ExportSheet`.
- **Check:** review
- **Source:** 3PL README (Export)

**IX-18. The Accessibility panel changes the page LIVE and is saved; there is no Apply.**
- **Why:** contrast and size are judged by looking at the real page.
- **Applies to:** Accessibility panel.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n

---

## 3. Autosave & the draft chip

**IX-19. An existing record autosaves 600ms after a change settles. The draft chip beside the title shows "saving" while it settles and "saved" once it has — and NOTHING before the first change.**
- **Why:** a sheet that opens saying "Saved" claims something it has not done; a sheet that keeps a draft silently is one people behave as though it doesn't.
- **Applies to:** every editable sheet of an existing record.
- **Check:** parity-sheets (G22)
- **Source:** `unified-view/3-interactions.md` §1; `ux/2-rules.md` Side-sheet anatomy

**IX-20. The draft is built once per RECORD, not per save: the row coming back from the sheet's own save never rebuilds the form.**
- **Why:** a rebuild moves the caret and loses anything typed since.
- **Applies to:** every autosaving sheet.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §1

**IX-21. Every field a sheet collects is carried by all four places — the model, the draft builder, the save and the create — so nothing is silently dropped.**
- **Why:** the sheet shows a default, takes what is typed, and hands back the default on next open — invisible in review (3PL lost five fields this way).
- **Applies to:** every sheet field.
- **Check:** field-reach; review
- **Source:** `unified-view/3-interactions.md` §1; 3PL README "The sheet's last five orphans"

**IX-22. Before the create act nothing is saved and no save state shows. Pressing the create act creates the record, which reaches its list and re-opens with its rail. Closing with anything typed asks "Discard this order?" — Keep editing / Discard; closing an untouched create sheet just closes.**
- **Why:** Pavan, 2026-10-06 — autosave is for records that exist. Supersedes the 2026-09 "first keystroke creates the record" behavior.
- **Applies to:** every create sheet.
- **Check:** parity-sheets (G33)
- **Source:** `ui/7-variants.md` §1 "Nothing is kept before the create act"; G33

**IX-23. "Save as Draft" (only on a record still in Draft) closes the sheet with the record parked as a draft.**
- **Why:** the one exception to "no Save", for a record that is legitimately unfinished.
- **Applies to:** Service orders, CP order request.
- **Check:** parity-sheets (G23)
- **Source:** `ux/2-rules.md` "A new record's footer may carry Save as Draft" (2026-09-25)

**IX-24. The audit trail records changes only past the first stage; while a record is a draft, edits write no history. A changed note is logged as "changed", not quoted.**
- **Why:** on a draft every field is being typed for the first time; an entry per pause buries the ones that matter.
- **Applies to:** every record with an activity log.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §2; 3PL README

---

## 4. The primary, the pending strip, pointing

**IX-25. On a create or stepped form the primary is ALWAYS pressable. Pressed with something mandatory missing, it does not act — it raises the pending strip (soft caution tone) above the footer, under the form column. The strip resets each time a record opens.**
- **Why:** Pavan, 2026-10-05 (replaces the strip standing at the foot of the step column); G25 (2026-10-07) — "a dead primary says why on press" through the strip. This supersedes the older "disabled + tooltip" for primaries that have a section to point at; the tooltip remains for dead controls with nothing to scroll to.
- **Applies to:** every record sheet primary.
- **Check:** parity-sheets (G25)
- **Source:** `ui/7-variants.md` §1 "Pending appears on press"; G25

**IX-26. The pending strip steps one item at a time (counter + chevrons); "Pending" never changes; pressing an item scrolls its section into view and then blinks it ONCE.**
- **Why:** two flashes is a thing asking to be watched; one is a thing pointing at itself and getting out of the way. (Changed from twice on 2026-09-22.)
- **Applies to:** `PendingStrip` everywhere.
- **Check:** review
- **Source:** `ux/2-rules.md` "WHAT THE RECORD IS MISSING"; `interactions/2-rules.md` §3c

**IX-27. Travel, then point: the blink waits for the scroll to finish. Nothing takes focus during it (the scroll is a hand-run loop on the scrollport, because the sheet's focus trap cancels smooth scroll). A thing that is not one box (a column of cells) flashes a FILL across every cell marked `data-blink`, not an outline round each.**
- **Why:** overlapping, the flash reads as the scroll still going; an outline round each cell is a ladder, not a column.
- **Applies to:** pending strip, Review links, board-card "review pricing".
- **Check:** review
- **Source:** `interactions/2-rules.md` §3c

**IX-28. When the stage changes while a sheet is open, the sheet scrolls to the section that stage's work lives in — on a CHANGE, never on open — after a wait longer than the sheet's own opening (360ms vs 260ms).**
- **Why:** a stage that moves and leaves the reader on the same paragraph says something happened but not where; a sheet that jumps on open takes the reader's place away.
- **Applies to:** lifecycle record sheets.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §6; 3PL README "The stage moves, and the sheet follows it"

**IX-29. A press that asks for a part of a record (board card "Review", a "Review" link) opens the sheet at the top, waits out its opening, then travels to the section — it does not open already scrolled there.**
- **Why:** arriving mid-sheet looks like it opened somewhere strange; the travel says "this is the order, and the part you asked for is here".
- **Applies to:** board-card footer actions, in-sheet links.
- **Check:** review
- **Source:** 3PL README ("Review on the board card…")

---

## 5. Overlays — popover vs sheet vs dialog

**IX-30. A record — viewing, editing or creating — opens in a side sheet over the list. A sheet over a sheet is level 2 (window − 112). Closing a level-2 sheet returns to the sheet beneath.**
- **Why:** the list stays behind; the strip of the sheet below says there is one beneath.
- **Applies to:** every record, quote, activity log, nested ship-to/asset, dispute.
- **Check:** parity-sheets (G21)
- **Source:** `interactions/2-rules.md` §1; `ui/7-variants.md` §1 Depth

**IX-31. Sheet widths are chosen by content, per step: `form` 600 · `fit` (tables + rail) · `data` 1200 for data-intensive existing records · `compact` 510 for controls (facet list, Export) · `medium` 600 for a CP action sheet. A sheet holding a table must declare `fit`.**
- **Why:** a sheet sized for more than it holds reads as empty; per step, so a form of fields does not inherit a table's width.
- **Applies to:** every sheet.
- **Check:** sheets (G28)
- **Source:** `ui/7-variants.md` §1 Width; memory `project_customer_portal.md` (ActionSheet, 2026-10-15)

**IX-32. A popover is for a short read or pick anchored to what opened it: a "+N" BreakdownCard, an ⓘ explanation, an "Awaiting confirmation" pill's what/note/when, a date picker, a menu. It opens on press.**
- **Why:** a popover keeps the reader on the row they were reading.
- **Applies to:** cells, headings, pills, toolbar controls.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §5; `interactions/2-rules.md` §3b; memory `project_customer_portal.md` (2026-10-22)

**IX-33. A dialog (AlertDialog) is only for a short, single-purpose question with something to lose: removing a section with content, discarding an unsaved create, confirming a finalize or a destructive page-level act, choosing an asset-order route (a modal of four compact boxes).**
- **Why:** modals are reserved for short tasks; a dialog over nothing to lose teaches people to dismiss dialogs without reading.
- **Applies to:** destructive and confirm moments.
- **Check:** review
- **Source:** `interactions/2-rules.md` §1, Destructive actions; `ux/2-rules.md` "Confirm only when there is something to lose"; 3PL README (Create menu)

**IX-34. A row's own delete is never a dialog: the bin swaps in place for ✕ cancel over ✓ confirm (`TableRowRemove`).**
- **Why:** "the tick is the 'are you sure?'" — asked where the finger already is (Pavan, 2026-09-23).
- **Applies to:** every editable table row.
- **Check:** table-rows
- **Source:** `ui/2-rules.md` §10f "Rows"

**IX-35. "Things that open rather than change" — history, a preview, the order-form settings gear — sit in the sheet header (left of Close), not in the form.**
- **Why:** they neither scroll away nor get mistaken for part of the form.
- **Applies to:** every record sheet.
- **Check:** review
- **Source:** `interactions/2-rules.md` §1; 3PL README (gear moved to header)

**IX-36. The Accessibility panel is a fixed element pinned beside the nav at the window's foot — not a measured popover — and never wider or taller than the window.**
- **Why:** a zoomed page misplaces a popover; the panel must always be reachable.
- **Applies to:** Accessibility panel.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n; memory `feedback_wcag_modes.md`

---

## 6. Toasts

**IX-37. Every ACT raises a toast (sent, finalized, created, moved, saved a view); typing and autosave never do. Title = the act; a second line only to warn of a consequence.**
- **Why:** a toast per pause is the app narrating typing (Pavan, 2026-10-07).
- **Applies to:** every act in every module.
- **Check:** parity-shell (G49)
- **Source:** `unified-view/3-interactions.md` §2; memory `feedback_toasts.md`

**IX-38. An act that moves a record between lanes says so in its toast ("Moved to Quoting").**
- **Why:** the record has left what the reader was looking at.
- **Applies to:** lane moves (3PL).
- **Check:** review
- **Source:** 3PL README "The lane walk" (2026-10-06)

**IX-39. In the CP, events arrive as one-line toasts with a View action (and in the top bar's bell).**
- **Why:** the customer follows orders they didn't move themselves.
- **Applies to:** CP.
- **Check:** review
- **Source:** CP README Navigation; memory `project_customer_portal.md`

---

## 7. Motion

**IX-40. Every non-essential motion is off under `prefers-reduced-motion`. A pointing blink keeps its statement and drops the flash (the outline/fill arrives and fades).**
- **Why:** accessibility is the resting behavior, not a pass at the end.
- **Applies to:** every animation below.
- **Check:** review
- **Source:** `interactions/2-rules.md` Accessibility, §3c

**IX-41. In `AlertBanner`, EVERY pill sweeps (tag and count, any kind — a bar in a deeper shade of the pill's own color moves through the fill) and only while the banner is collapsed.**
- **Why:** Pavan, 2026-10-20 — opened, the list is the attention.
- **Applies to:** AlertBanner only (the banner adds it; screens don't).
- **Check:** review
- **Source:** `ui/2-rules.md` §10l

**IX-42. Every CTA an AlertBanner carries (its own action, each item's action) gets the white `OutlineShine` on its outline. The ghost "View details" / "Clear filter" has no outline, so no shine.**
- **Why:** Pavan, 2026-10-20 — the banner's acts draw the eye; added by the banner, never per screen.
- **Applies to:** AlertBanner CTAs.
- **Check:** review
- **Source:** `ui/2-rules.md` §10l

**IX-43. The CP dashboard's collapsed "Attention required" banner carries a red diagonal shine on its OUTLINE only, left to right, ~1.9s, every 6s; hidden when open and under reduced motion.**
- **Why:** Pavan, 2026-10-15 — the later shine supersedes the earlier comet trace (every 12s) of the same day.
- **Applies to:** CP Dashboard Attention required.
- **Check:** review
- **Source:** CP README PRD cross-check; memory `project_customer_portal.md`

**IX-44. View-bar tools are icon only; the name slides out on hover or focus and STAYS out while the tool is on (column search open, its menu open) — 12px muted gray, no fill or outline.**
- **Why:** Pavan, 2026-10-22 — quiet at rest, legible when reached for, honest about what is on.
- **Applies to:** the view bar on every list.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p "THE VIEW BAR"

**IX-45. A hanging add shows a "+" at rest and slides its words out on hover or keyboard focus; an optional section's minus is muted until reached for, then comes to full contrast and slides its label out.**
- **Why:** the row it adds is one of many; a bare glyph beside a table reads as though it might remove a row — the label makes it safe.
- **Applies to:** hanging adds, `SheetSectionRemove`.
- **Check:** review
- **Source:** `ui/2-rules.md` §10f; `ux/2-rules.md` "Removing an optional section is a MINUS"

**IX-46. Loading blocks SHIMMER (a light sweeping left to right, 1.4s) — never pulse, never a spinner. A loading page shows its own parts as skeletons in their places (title, tabs, toolbar, table header and rows).**
- **Why:** it arrives in the shape it is about to take; a spinner loses the list's height and the page jumps.
- **Applies to:** every loading state.
- **Check:** review
- **Source:** `ui/2-rules.md` §11c (2026-10-10); `interactions/2-rules.md` §4c

**IX-47. A module switch runs in sequence: a 2px brand bar fills the pressed row left to right over 3s (linear) with "Loading data for this module." under it and the page as skeletons; every other module row is disabled and faint; then the open module folds (200ms), rows move (260ms) and the new one unfolds (240ms). None with reduced motion.**
- **Why:** modules take 3–5s to load; all-at-once animation was rejected (2026-10-07); the lock stops a second press mid-switch (2026-10-16).
- **Applies to:** `ModuleSidebar`.
- **Check:** review
- **Source:** `ui/7-variants.md` §1 Navigation; memory `project_nav_style.md`

**IX-48. The stage track animates a stage change — the line runs on (~500ms), the stage left takes its tick, the new pill fades in — never on first paint; on Move to Assigned it waits for the sheet's scroll to stop.**
- **Why:** a change is shown as a change; animating on open would claim something just happened.
- **Applies to:** `StageTrack` on record sheets.
- **Check:** review
- **Source:** `ui/7-variants.md` §1; 3PL README "Summary option 2, and moving to Assigned"

**IX-49. Charts render without a mount animation.**
- **Why:** the reveal is rAF-driven and stalls headless; static charts should render whole.
- **Applies to:** every chart.
- **Check:** review
- **Source:** `interactions/2-rules.md` Charts

---

## 8. Drag, resize, reorder

**IX-50. A column header drags to reorder (`cursor-grab`, the grip fading in over its left padding); the divider resizes (`col-resize`, drawn as the rule with a bar either side). Two gestures, two targets, two cursors — never one target for both.**
- **Why:** both begin with a pointer held on a header; a table that guessed would turn a widen into a reorder.
- **Applies to:** every table header.
- **Check:** parity-lists (G4)
- **Source:** `ux/2-rules.md` "Every table's columns move and resize"

**IX-51. Both marks light only on the HOVERED header (the divider belonging to that column), and the grip steps aside as the pointer reaches the divider. Nothing is drawn on any other header.**
- **Why:** all eleven dividers lit at once read as a grid, not a control.
- **Applies to:** every table header.
- **Check:** review
- **Source:** `ux/2-rules.md` columns

**IX-52. Double-click a divider restores the declared width; 64px is the floor; a resize watches for release on the WINDOW too; the select-box column never moves and nothing drops past it.**
- **Why:** a release outside the window would strand the resize flag and refuse every column drag until reload.
- **Applies to:** every table.
- **Check:** review
- **Source:** `ux/2-rules.md` columns

**IX-53. Rows reorder only by their handle; every reorderable row has one.**
- **Why:** a row that drags with nothing saying so is a hidden gesture.
- **Applies to:** settings tables, workflow stages.
- **Check:** parity-tables (G42)
- **Source:** `ux/2-rules.md` "Tables — full width…"

**IX-54. No board card drags between lanes.**
- **Why:** a stage change is a workflow act with side effects; it comes from the record's own next act.
- **Applies to:** every board.
- **Check:** review
- **Source:** `interactions/2-rules.md` §8.1b

**IX-55. Preferred-time bars on the delivery timeline drag to move and drag an end to size; pressing a bar's time opens start/end boxes to the minute; bars never overlap (they stop at neighbours, a typed overlap is refused); with no free half hour, "+" says "Delete or adjust the current preferred time to add a new one."**
- **Why:** one timeline for every window, with one behavior.
- **Applies to:** `DeliveryWindowTimeline`.
- **Check:** review
- **Source:** `ui/2-rules.md` §10m; memory `project_customer_portal.md` (2026-10-20)

**IX-56. On a ship-to or asset map, pressing the map or dragging the pin places it; "Confirm location" fills the address fields; typing the address moves the pin; asset pins drag to set their position.**
- **Why:** place and address stay in agreement.
- **Applies to:** CP ship-to and asset sheets.
- **Check:** review
- **Source:** CP README Sites & Assets

---

## 9. Row opening

**IX-57. The WHOLE row opens the record — a click anywhere on it, or Enter / Space on a focused row (each row focusable, named "Open …"). There is no row-open chevron column, pinned or not, in any list or dashboard row.**
- **Why:** Pavan, 2026-10-19. Supersedes the "pinned chevron is the affordance" in `unified-view/3-interactions.md` §4 and `2-layouts.md` §5.
- **Applies to:** every list and clickable row, every module.
- **Check:** review
- **Source:** `ux/2-rules.md` "No row-open chevron"; memory `feedback_ui_rules.md` (2026-10-19)

**IX-58. A press on a control inside a row never also opens the row: buttons, links, inputs, labels, checkboxes and anything marked `data-no-row-open` keep the click. The "+N" chip and the Download icon act in place and never open the row.**
- **Why:** the click must do one thing; a breakdown press that also opens the record loses the reader's place.
- **Applies to:** every `ListTable` row.
- **Check:** review
- **Source:** `prototypes/unified-view/ListTable.tsx` (row-open guard); `unified-view/3-interactions.md` §5; CP README Invoices

**IX-59. A board card opens the record; every control ON a card acts and stops propagation; a card's footer action does its named act without opening the record.**
- **Why:** the card is the button — stepping a quote must not open the order.
- **Applies to:** every board card.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §4; `unified-view/evals/3-interactions.md` Pressing

**IX-60. A nested row's chevron (leading its first cell) expands the child layer; it turns down when open.**
- **Why:** expanding and opening are two different acts on one row.
- **Applies to:** expandable rows.
- **Check:** review
- **Source:** `ui/2-rules.md` §10j

---

## 10. Multi-select & bulk

**IX-61. A row picker in a row-adding table takes several: tick, Apply (footer shows the count); the first pick fills the row it was opened from; each other pick becomes its own row right under it, in the order picked, starting like the row it came from; from a filled row the picker is a single swap; picks on other rows are ticked and locked.**
- **Why:** the customer had to open the list once per tank (Pavan, 2026-10-15; "now absolute" 2026-10-16).
- **Applies to:** every row-adding table in UV, Service and CP.
- **Check:** table-rows
- **Source:** `ui/2-rules.md` §10f "Picking several makes rows"

**IX-62. A new row puts the cursor in its first editable cell; if an unfilled row already exists the add takes the cursor there instead of making a second blank row; new rows go at the bottom.**
- **Why:** after every add, focus stayed on the button in all seventeen tables — the add must be followed by the answer.
- **Applies to:** every editable table.
- **Check:** table-rows (G36)
- **Source:** `ui/2-rules.md` §10f "Rows"

**IX-63. A selection starts EMPTY and is transient — it resets when the sheet or screen opens; a row is never ticked on creation; a selection never carries a second meaning.**
- **Why:** a pre-ticked row puts a bulk bar on screen before anything is chosen; one checkbox column meaning two things makes one default wrong.
- **Applies to:** every selectable table.
- **Check:** review
- **Source:** `interactions/2-rules.md` §4b

**IX-64. Bulk acts use the one DS `BulkActionBar` with the list's own `actions` and `noun`: a compact neutral floating pill (count chip with ✕, equal-weight icon + label acts, More ▾ last with "Set or change" / "Apply an action", inapplicable options visible but disabled, destructive as a red icon only). Never a second bar built in the screen.**
- **Why:** a second bar is how a selection stops feeling like a selection everywhere else.
- **Applies to:** every list with bulk acts.
- **Check:** review (G18)
- **Source:** `interactions/2-rules.md` §4b

**IX-65. Bulk edits: a non-scalar edit offers Add vs Replace; a destructive replace confirms ("N … will be replaced by X"); an edit that changes a computed value shows a per-row before/after preview before commit; apply → toast → recompute every affected row.**
- **Why:** a bulk overwrite with no preview changes figures nobody looked at.
- **Applies to:** `BulkEditDialog` and bulk acts.
- **Check:** review
- **Source:** `interactions/2-rules.md` §4b

**IX-66. Where ticked rows choose the target of the footer's act (3PL vendor invitations), the footer speaks for the selection: one ticked → "Send invitation", several → "Send invitations to all", none → "Send invitations".**
- **Why:** one place to press for one decision; the floating bar above the footer was removed.
- **Applies to:** 3PL vendor table.
- **Check:** review
- **Source:** 3PL README ("The footer speaks for the selection")

---

## 11. Empty, loading and error

**IX-67. A list loads as skeleton rows that hold the loaded shape — never a spinner.**
- **Why:** a list that collapses to a spinner loses its height and the page jumps when rows land.
- **Applies to:** every list and loading region.
- **Check:** review
- **Source:** `interactions/2-rules.md` §4c; `ui/2-rules.md` §11c

**IX-68. An empty state names its cause and offers its one way out (Clear search, Go to today, clear a filter, the create act). A gated picker's empty state names the gate.**
- **Why:** the screen already knows which empty it is; "No results" doesn't say why.
- **Applies to:** lists, pickers.
- **Check:** review (G20)
- **Source:** `unified-view/2-layouts.md` §10; `ux/2-rules.md` membership gate

**IX-69. A table in a form never empties: a blank row waits to be typed into (not validated, not saved, no remove until it has content); a documents table's empty row opens the file picker when pressed anywhere.**
- **Why:** the blank row IS the invitation (2026-10-14).
- **Applies to:** every form table.
- **Check:** review
- **Source:** `ux/2-rules.md` "Tables — one row is always there"

**IX-70. Validation: nothing is red until the field has been left; after a failed submit everything validates live; a failed submit keeps every character and focuses the first problem.**
- **Why:** the validation contract is identical everywhere.
- **Applies to:** forms that validate.
- **Check:** review
- **Source:** `interactions/2-rules.md` §1

**IX-71. Error states, failed syncs and failed saves are not designed — every toast is a success today. A build that needs one hits the gap protocol.**
- **Why:** no failure path exists in any module; an invented one is new design.
- **Applies to:** every module.
- **Check:** review
- **Source:** memory `project_3pl.md` (Open); `service/PRD.md` §8

---

## 12. Routing & drill-through

**IX-72. Every dashboard tile, bar and row opens its list narrowed to exactly what it counts — facets, line, date range, column boxes — or opens the record. The drill's narrowing wins over the list's remembered state.**
- **Why:** a dashboard figure must be checkable; the drill is the visit's own question.
- **Applies to:** module dashboards; CP tank-health counts open the table filtered.
- **Check:** review (G51)
- **Source:** `unified-view/2-layouts.md` "Module dashboards"; `unified-view/3-interactions.md` "A list remembers"; CP README

**IX-73. A filter alert's "View details" applies its filter onto the list's own filters (chips show it, Clear all undoes it), widening the date range when the alert isn't about the dates on screen; it then reads "✕ Clear filter", which returns the list to its default; it reverts by itself if the filter is changed by hand. The banner stays until its own ✕.**
- **Why:** the banner must leave a visible, undoable narrowing — never a hidden one.
- **Applies to:** AlertBanner (filter mode).
- **Check:** review
- **Source:** `interactions/2-rules.md` §7a; `unified-view/3-interactions.md` (banner binding)

**IX-74. An alert with items (no filter): the count pill opens the item list under the line (chevron flips); an item's title narrows the list to that item; each item has its own action.**
- **Why:** the alert's things are reachable from where they are announced.
- **Applies to:** AlertBanner (item mode, e.g. CP empty tanks).
- **Check:** review
- **Source:** `interactions/2-rules.md` §7a "Expanded"

**IX-75. A CP Attention required tile opens a 600px action sheet whose one act is "View order details" → the full order sheet; closing that sheet returns to the dashboard.**
- **Why:** Pavan, 2026-10-15 — the action first, then the order; and he wants the return kept.
- **Applies to:** CP Dashboard.
- **Check:** review
- **Source:** CP README Dashboard; memory `project_customer_portal.md`

**IX-76. A CTA navigates to where creation actually happens rather than growing a second form (e.g. "Create order" in a ship-to's ⋯ opens Orders on a new draft for it; a recommendation's "Review and Create Rule" opens the rule form filled in).**
- **Why:** two forms making one record will drift.
- **Applies to:** cross-screen create acts.
- **Check:** review
- **Source:** `ui/2-rules.md` §10c; CP README Sites & Assets; 3PL README Recommendations

**IX-77. "+ New …" inside a picker opens that record's sheet over the current one (level 2) and comes back with it chosen.**
- **Why:** the reader never loses the form they were filling.
- **Applies to:** CP asset sheet "+ New ship-to" and similar.
- **Check:** review
- **Source:** CP README Sites & Assets

**IX-78. Linked records link both ways (invoice ↔ order).**
- **Why:** a reader on either should reach the other in one press.
- **Applies to:** CP invoices and orders.
- **Check:** review
- **Source:** CP README PRD cross-check

---

## 13. Saved views

**IX-79. A saved view with unsaved changes shows the update icon beside its name — `RefreshCw`, gray, tooltip "Update changes"; pressing it saves the changes into that view.**
- **Why:** Pavan, 2026-10-21 — the drift is visible and fixable in place. (Supersedes the older "brand dot on the active tab" marker in `unified-view/2-layouts.md` §3.)
- **Applies to:** every view row.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p

**IX-80. Each view keeps its own unsaved changes: pressing another tab parks what is on screen against the view being left, and coming back finds it as left. Pressing the tab you are ON puts it back to its saved state — the one way to drop changes.**
- **Why:** leaving a view must not cost the work done in it (2026-09-24); "click the active tab to revert".
- **Applies to:** every list with views (`useSavedViews`).
- **Check:** review
- **Source:** `prototypes/unified-view/useSavedViews.ts`; memory `project_3pl.md`

**IX-81. Saving a new view moves the current changes INTO it (the view left is clean again) and raises a toast; views can be renamed, updated and deleted from their tab.**
- **Why:** the narrowing belongs to the view that was made from it.
- **Applies to:** every view row.
- **Check:** review
- **Source:** `useSavedViews.ts`; `interactions/2-rules.md` §4

**IX-82. Opening a saved view restores its display (table / board / map), filters, column search (with the row showing), arrangement, card fields and lane sort. A saved column order that predates a new column keeps the new column in its declared position.**
- **Why:** a stale view may cost the ordering, never the data.
- **Applies to:** every list with views.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p, §10g; `ux/2-rules.md` columns

---

## 14. Recent history & suggested names

**IX-83. The Filters panel leads with "Recent history": every set applied on that list in the last 24 hours, by category, newest first (the same set again moves to the top, not twice). Pressing one puts its ticks back; Apply applies. Absent when there is none.**
- **Why:** Pavan, 2026-10-21 — "filters remember".
- **Applies to:** every list's Filters panel.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; `prototypes/unified-view/filterMemory.ts`

**IX-84. "Save view" suggests a name from the filters that are on, as the placeholder: the business (or the line of service when no business), then other facets in panel order, at most three parts joined " · " ("Transport · Priya Raman"). → or Tab takes it to type on; Save with the box empty saves the suggestion.**
- **Why:** Pavan, 2026-10-21 — "views name themselves". (The code comment in `filterMemory.ts` puts line of service before business; the DS doc is followed — report the difference.)
- **Applies to:** every Save view dialog.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; `filterMemory.ts`

---

## 15. Accessibility panel behavior

**IX-85. "Reset to default" (the icon at the top of the panel) resets every accessibility setting and keeps the theme. The same reset is ⌘⌥0 (Ctrl+Alt+0) anywhere and `?a11y=reset` in the address.**
- **Why:** Pavan, 2026-10-21 — always reachable, always resettable, even from a page made unreadable.
- **Applies to:** every module.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n; memory `feedback_wcag_modes.md`

**IX-86. Theme is the panel's first control (Light | Dark), and the panel is the only place it changes in the app (no header icon). Choices are saved per browser (`fp-theme-choice`, `fp-a11y`).**
- **Why:** one place for every display setting.
- **Applies to:** UV and CP (the DS gallery keeps its own toggle).
- **Check:** review
- **Source:** memory `feedback_wcag_modes.md`; `ui/2-rules.md` §10n

**IX-87. Screen size is a stepped slider (16″ · 24″ · 34″ · TV = 100 · 110 · 125 · 150%) or Auto, zooming the whole page; when the window ends up narrower than the 1280px layout, the page scrolls sideways instead of clipping.**
- **Why:** every control stays reachable at every zoom.
- **Applies to:** every page.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n

**IX-88. Contrast at 80% and above (light theme) JUMPS the frame dark — shell ground and selected/hovered nav item near black, what sits on them white — it does not fade.**
- **Why:** no gray between ~#5a and #95 reads at 7:1 with black or white.
- **Applies to:** shell ground, nav, top bar (anything new on the ground is marked `data-fp-on-frame`).
- **Check:** wcag-contrast
- **Source:** `ui/2-rules.md` §10n

**IX-89. Text on a color fill switches automatically between white and dark at a quarter of the slider, rather than blending; on the fixed brand orange it is held to AA.**
- **Why:** blended text passes through unreadable midpoints.
- **Applies to:** pills, buttons, filled chips.
- **Check:** wcag-contrast
- **Source:** `ui/2-rules.md` §10n

---

## 16. Navigation behavior

**IX-90. "Collapse navigation" (a quiet gray mark in the panel's top-right corner) folds the panel to an icon rail; the choice is remembered per browser.**
- **Why:** the reader decides how much room the menu takes, once.
- **Applies to:** `ModuleSidebar`.
- **Check:** review
- **Source:** `ui/7-variants.md` §1 Navigation

**IX-91. Pressing an area that has sub-pages opens its first page.**
- **Why:** an area row is a page, not just a folder.
- **Applies to:** nested nav areas.
- **Check:** review
- **Source:** `ui/7-variants.md` §1 Navigation (2026-10-15)

---

## Index

| Id | Rule |
|---|---|
| IX-1 | Every interactive element shows a visible focus ring (`focus-visible:ring-2 ring-ring/50`; `ring-inset` inside table cells), and the ring leads somewhere: anything wit… |
| IX-2 | Hover is subtle and the same everywhere: `hover:bg-accent` (the gray hover); a table cell paints the full cell, no inset outline |
| IX-3 | Row actions appear on hover AND on focus — never on hover alone |
| IX-4 | Hover is not a way to see data |
| IX-5 | An underline promises something hidden: a dotted underline appears on a figure only where pressing it reveals what it is made of, and never on a figure whose breakdown… |
| IX-6 | An explanation opens on CLICK from an ⓘ beside the heading, in a narrow popover of a few short lines — never on hover, never as a paragraph |
| IX-7 | Every icon-only control has an `aria-label` carrying its full phrase (a collapsed "+" says "Add product") |
| IX-8 | A disabled control fires no pointer events, so its reason hangs on a wrapper (`<span tabIndex={0}>` around a `pointer-events-none` button) with a Tooltip of ONE impera… |
| IX-9 | Keyboard paths for tables: a focused column header moves with ⌘/Ctrl + ← →; a focused resize divider nudges 16px with ← →; a row opens with Enter or Space; in a row de… |
| IX-10 | Every list opens BELOW its trigger, left-aligned, 4px off — never laid over the field (no Radix `item-aligned`) |
| IX-11 | In an empty Qty cell, the suggested quantity shows as the placeholder and → takes it |
| IX-12 | The Filters panel STAGES: ticks change nothing until Apply Filters |
| IX-13 | The date picker STAGES too: nothing changes until Apply |
| IX-14 | Search and the column-search boxes are LIVE: rows narrow as you type |
| IX-15 | Applying any narrowing resets the list to page 1 |
| IX-16 | A new record is revealed by WIDENING the list's window to take it in — never by moving the window |
| IX-17 | The Export sheet edits the list's own narrowings (already applied behind it); it commits nothing on the way through, so it has no Cancel |
| IX-18 | The Accessibility panel changes the page LIVE and is saved; there is no Apply |
| IX-19 | An existing record autosaves 600ms after a change settles |
| IX-20 | The draft is built once per RECORD, not per save: the row coming back from the sheet's own save never rebuilds the form |
| IX-21 | Every field a sheet collects is carried by all four places — the model, the draft builder, the save and the create — so nothing is silently dropped |
| IX-22 | Before the create act nothing is saved and no save state shows |
| IX-23 | "Save as Draft" (only on a record still in Draft) closes the sheet with the record parked as a draft |
| IX-24 | The audit trail records changes only past the first stage; while a record is a draft, edits write no history |
| IX-25 | On a create or stepped form the primary is ALWAYS pressable |
| IX-26 | The pending strip steps one item at a time (counter + chevrons); "Pending" never changes; pressing an item scrolls its section into view and then blinks it ONCE |
| IX-27 | Travel, then point: the blink waits for the scroll to finish |
| IX-28 | When the stage changes while a sheet is open, the sheet scrolls to the section that stage's work lives in — on a CHANGE, never on open — after a wait longer than the s… |
| IX-29 | A press that asks for a part of a record (board card "Review", a "Review" link) opens the sheet at the top, waits out its opening, then travels to the section — it doe… |
| IX-30 | A record — viewing, editing or creating — opens in a side sheet over the list |
| IX-31 | Sheet widths are chosen by content, per step: `form` 600 · `fit` (tables + rail) · `data` 1200 for data-intensive existing records · `compact` 510 for controls (facet… |
| IX-32 | A popover is for a short read or pick anchored to what opened it: a "+N" BreakdownCard, an ⓘ explanation, an "Awaiting confirmation" pill's what/note/when, a date pick… |
| IX-33 | A dialog (AlertDialog) is only for a short, single-purpose question with something to lose: removing a section with content, discarding an unsaved create, confirming a… |
| IX-34 | A row's own delete is never a dialog: the bin swaps in place for ✕ cancel over ✓ confirm (`TableRowRemove`) |
| IX-35 | "Things that open rather than change" — history, a preview, the order-form settings gear — sit in the sheet header (left of Close), not in the form |
| IX-36 | The Accessibility panel is a fixed element pinned beside the nav at the window's foot — not a measured popover — and never wider or taller than the window |
| IX-37 | Every ACT raises a toast (sent, finalized, created, moved, saved a view); typing and autosave never do |
| IX-38 | An act that moves a record between lanes says so in its toast ("Moved to Quoting") |
| IX-39 | In the CP, events arrive as one-line toasts with a View action (and in the top bar's bell) |
| IX-40 | Every non-essential motion is off under `prefers-reduced-motion`. A pointing blink keeps its statement and drops the flash (the outline/fill arrives and fades) |
| IX-41 | In `AlertBanner`, EVERY pill sweeps (tag and count, any kind — a bar in a deeper shade of the pill's own color moves through the fill) and only while the banner is co… |
| IX-42 | Every CTA an AlertBanner carries (its own action, each item's action) gets the white `OutlineShine` on its outline |
| IX-43 | The CP dashboard's collapsed "Attention required" banner carries a red diagonal shine on its OUTLINE only, left to right, ~1.9s, every 6s; hidden when open and under r… |
| IX-44 | View-bar tools are icon only; the name slides out on hover or focus and STAYS out while the tool is on (column search open, its menu open) — 12px muted gray, no fill o… |
| IX-45 | A hanging add shows a "+" at rest and slides its words out on hover or keyboard focus; an optional section's minus is muted until reached for, then comes to full contr… |
| IX-46 | Loading blocks SHIMMER (a light sweeping left to right, 1.4s) — never pulse, never a spinner |
| IX-47 | A module switch runs in sequence: a 2px brand bar fills the pressed row left to right over 3s (linear) with "Loading data for this module." under it and the page as sk… |
| IX-48 | The stage track animates a stage change — the line runs on (~500ms), the stage left takes its tick, the new pill fades in — never on first paint; on Move to Assigned i… |
| IX-49 | Charts render without a mount animation |
| IX-50 | A column header drags to reorder (`cursor-grab`, the grip fading in over its left padding); the divider resizes (`col-resize`, drawn as the rule with a bar either side) |
| IX-51 | Both marks light only on the HOVERED header (the divider belonging to that column), and the grip steps aside as the pointer reaches the divider |
| IX-52 | Double-click a divider restores the declared width; 64px is the floor; a resize watches for release on the WINDOW too; the select-box column never moves and nothing dr… |
| IX-53 | Rows reorder only by their handle; every reorderable row has one |
| IX-54 | No board card drags between lanes |
| IX-55 | Preferred-time bars on the delivery timeline drag to move and drag an end to size; pressing a bar's time opens start/end boxes to the minute; bars never overlap (they… |
| IX-56 | On a ship-to or asset map, pressing the map or dragging the pin places it; "Confirm location" fills the address fields; typing the address moves the pin; asset pins dr… |
| IX-57 | The WHOLE row opens the record — a click anywhere on it, or Enter / Space on a focused row (each row focusable, named "Open …") |
| IX-58 | A press on a control inside a row never also opens the row: buttons, links, inputs, labels, checkboxes and anything marked `data-no-row-open` keep the click |
| IX-59 | A board card opens the record; every control ON a card acts and stops propagation; a card's footer action does its named act without opening the record |
| IX-60 | A nested row's chevron (leading its first cell) expands the child layer; it turns down when open |
| IX-61 | A row picker in a row-adding table takes several: tick, Apply (footer shows the count); the first pick fills the row it was opened from; each other pick becomes its ow… |
| IX-62 | A new row puts the cursor in its first editable cell; if an unfilled row already exists the add takes the cursor there instead of making a second blank row; new rows g… |
| IX-63 | A selection starts EMPTY and is transient — it resets when the sheet or screen opens; a row is never ticked on creation; a selection never carries a second meaning |
| IX-64 | Bulk acts use the one DS `BulkActionBar` with the list's own `actions` and `noun`: a compact neutral floating pill (count chip with ✕, equal-weight icon + label acts,… |
| IX-65 | Bulk edits: a non-scalar edit offers Add vs Replace; a destructive replace confirms ("N … will be replaced by X"); an edit that changes a computed value shows a per-ro… |
| IX-66 | Where ticked rows choose the target of the footer's act (3PL vendor invitations), the footer speaks for the selection: one ticked → "Send invitation", several → "Send… |
| IX-67 | A list loads as skeleton rows that hold the loaded shape — never a spinner |
| IX-68 | An empty state names its cause and offers its one way out (Clear search, Go to today, clear a filter, the create act) |
| IX-69 | A table in a form never empties: a blank row waits to be typed into (not validated, not saved, no remove until it has content); a documents table's empty row opens the… |
| IX-70 | Validation: nothing is red until the field has been left; after a failed submit everything validates live; a failed submit keeps every character and focuses the first… |
| IX-71 | Error states, failed syncs and failed saves are not designed — every toast is a success today |
| IX-72 | Every dashboard tile, bar and row opens its list narrowed to exactly what it counts — facets, line, date range, column boxes — or opens the record |
| IX-73 | A filter alert's "View details" applies its filter onto the list's own filters (chips show it, Clear all undoes it), widening the date range when the alert isn't about… |
| IX-74 | An alert with items (no filter): the count pill opens the item list under the line (chevron flips); an item's title narrows the list to that item; each item has its ow… |
| IX-75 | A CP Attention required tile opens a 600px action sheet whose one act is "View order details" → the full order sheet; closing that sheet returns to the dashboard |
| IX-76 | A CTA navigates to where creation actually happens rather than growing a second form (e.g |
| IX-77 | "+ New …" inside a picker opens that record's sheet over the current one (level 2) and comes back with it chosen |
| IX-78 | Linked records link both ways (invoice ↔ order) |
| IX-79 | A saved view with unsaved changes shows the update icon beside its name — `RefreshCw`, gray, tooltip "Update changes"; pressing it saves the changes into that view |
| IX-80 | Each view keeps its own unsaved changes: pressing another tab parks what is on screen against the view being left, and coming back finds it as left |
| IX-81 | Saving a new view moves the current changes INTO it (the view left is clean again) and raises a toast; views can be renamed, updated and deleted from their tab |
| IX-82 | Opening a saved view restores its display (table / board / map), filters, column search (with the row showing), arrangement, card fields and lane sort |
| IX-83 | The Filters panel leads with "Recent history": every set applied on that list in the last 24 hours, by category, newest first (the same set again moves to the top, not… |
| IX-84 | "Save view" suggests a name from the filters that are on, as the placeholder: the business (or the line of service when no business), then other facets in panel order,… |
| IX-85 | "Reset to default" (the icon at the top of the panel) resets every accessibility setting and keeps the theme |
| IX-86 | Theme is the panel's first control (Light \| Dark), and the panel is the only place it changes in the app (no header icon) |
| IX-87 | Screen size is a stepped slider (16″ · 24″ · 34″ · TV = 100 · 110 · 125 · 150%) or Auto, zooming the whole page; when the window ends up narrower than the 1280px layou… |
| IX-88 | Contrast at 80% and above (light theme) JUMPS the frame dark — shell ground and selected/hovered nav item near black, what sits on them white — it does not… |
| IX-89 | Text on a color fill switches automatically between white and dark at a quarter of the slider, rather than blending; on the fixed brand orange it is held to AA |
| IX-90 | "Collapse navigation" (a quiet gray mark in the panel's top-right corner) folds the panel to an icon rail; the choice is remembered per browser |
| IX-91 | Pressing an area that has sub-pages opens its first page |
