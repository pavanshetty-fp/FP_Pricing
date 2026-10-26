# FPDS 07 — UX rules

> **How to read this**
> 1. Every rule here is **binding** for any builder — Lovable, Cursor, Claude or a person. None of them is a suggestion to improve on.
> 2. The **Why** is part of the rule: output that matches the words but defeats the Why breaks the rule.
> 3. Where sources disagreed, the **newer decision wins** and the older one is named as superseded; decisions marked **REVERTED** must not be rebuilt.
> 4. `Check` names the eval that catches a break (`review` = a person or agent reads it); `Source` says where the decision lives (doc §, memory file, date).
> 5. If you cannot satisfy a rule with existing units, **stop** and use the gap protocol in `docs/fpds/00-protocol.md` — never invent a workaround.

Interaction behavior (hover, staging, autosave mechanics, motion, keyboard) is in
`08-interaction-rules.md`. This file says **where things go and what they mean**.

---

## 1. Information architecture & navigation

**UX-1. Every screen lives in the app shell: one global top bar (brand · global search · notifications + account), the left navigation, and one content layer. No page owns a top bar of its own.**
- **Why:** structure is learnt once and then read without thinking; a second top bar makes every screen a new layout.
- **Applies to:** every screen, every module (Unified View and Customer Portal share the shell).
- **Check:** review
- **Source:** `docs/ds/ux/2-rules.md` L1/L2; `docs/ds/00-meta/constitution.md`

**UX-2. Navigation is ONE left panel (`ModuleSidebar`): modules as rows, the open module's pages under it, collapsible to an icon rail (remembered per browser). Do not build the two-layer rail + drawer.**
- **Why:** Pavan chose the one-panel menu after the Lovable reference — "navigation menu ONLY", nothing else taken from it. The two-layer design is kept behind `NAV_STYLE` and comes back only when Pavan says "Bring in the two-layer navigation drawers". This supersedes the tier/peek rules in `ux/2-rules` N1–N3 and `unified-view/2-layouts.md` §2 for which shape is current.
- **Applies to:** Unified View and Customer Portal navigation.
- **Check:** review
- **Source:** memory `project_nav_style.md` (2026-10-06); `docs/ds/ui/7-variants.md` §1 Navigation

**UX-3. Module order is 3PL · Sales · Service Work · Pricing · Lease. The open module moves to the top; the rest keep this order. Nothing else marks the open module — no ring, dot, chevron or divider.**
- **Why:** a fixed order is findable by position; the dashed ring and dot were removed because position and weight already say it.
- **Applies to:** `ModuleSidebar`.
- **Check:** review
- **Source:** memory `project_nav_style.md` (2026-10-07, 2026-10-09); `ui/7-variants.md` §1

**UX-4. An area that has sub-pages stays a page row with its icon; its pages hang under it on tree bars; pressing the area opens its first page.**
- **Why:** one panel with no second drawer still needs a second level; tree bars show it without headings.
- **Applies to:** UV (3PL Orders, Directory…) and CP (Orders → Order Requests · Recurring Orders).
- **Check:** review
- **Source:** `ui/7-variants.md` §1 (Pavan, 2026-10-15)

**UX-5. Dashboard is the first nav item of a module that has one, but 3PL and Sales open on Orders. The Customer Portal opens on its Dashboard. Service Work has no dashboard yet; Lease and Pricing none; there is no cross-module dashboard.**
- **Why:** the daily work starts on the orders list; the dashboard is one press away and first in the menu.
- **Applies to:** module landing pages.
- **Check:** parity-shell (G52)
- **Source:** memory `project_fp_ds_foundation.md` (2026-10-05); `project_sales_lovable_gaps.md` (2026-10-07); `unified-view/evals/6-3pl-guardrails.md` G52; CP README Navigation

**UX-6. A module with no built screens shows the module-level empty state — never invented destinations.**
- **Why:** an invented menu becomes a promise nobody designed.
- **Applies to:** Lease, Pricing, CP Reports.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` §2 Current map, §10

**UX-7. Profile and Settings are account destinations: they live in the account menu, never in the module navigation. Module settings (Sales Settings, Service Settings) are the module's last page.**
- **Why:** they are about the person or the module's setup, not a workspace to work in.
- **Applies to:** top bar account menu; module navigation.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` §2; memory `project_sales_lovable_gaps.md` (Sales Settings, 2026-10-07)

**UX-8. The page title (with the list's total beside it) sits outside the data container. A CTA scoped by anything inside the container sits with the data it acts on, at the right end of the view row. One primary CTA per view.**
- **Why:** a Create hoisted to the page header is separated from the scope that decides what it creates; "the container boundary was a proxy for prominence".
- **Applies to:** every list page.
- **Check:** parity-lists
- **Source:** `ux/2-rules.md` "Action placement"; `ux/2-rules.md` §10 (superseded part marked there)

**UX-9. Header units only when their question is real: a breadcrumb only when nested two or more levels; tabs only for two or more facets of the SAME dataset (tabs are never navigation); a toolbar only when the data needs search, filter or action. No placeholder units.**
- **Why:** each unit answers one question (where am I · which slice · act on this); a lone tab or a one-crumb trail answers nothing.
- **Applies to:** every content header.
- **Check:** review
- **Source:** `ux/2-rules.md` L5

**UX-10. The zone order inside a list is fixed: view row (All · saved views · Export · create CTA) → search + Filters → chip shelf → the view bar → table / board / map → pagination or total. A zone with nothing to say is absent.**
- **Why:** readers learn one top-down sequence; a moved zone looks like a different product.
- **Applies to:** every list page (`StandardList`).
- **Check:** parity-lists
- **Source:** `ui/2-rules.md` §10p "Every table page is the standard list" (2026-10-22); `unified-view/2-layouts.md` §1

**UX-11. A phone product gets its own shell and follows the five mobile rules: one thing per screen · the act pinned to the bottom, full width · nothing depends on hover · 44px targets · Back in the header is the only way back. Shown inside the desktop app it renders in a device frame.**
- **Why:** desktop rules applied to a phone by accident were the failure; stretched, a phone screen stops being the thing it is.
- **Applies to:** the technician app and any future phone screen.
- **Check:** review
- **Source:** `ux/2-rules.md` "Mobile — the first five rules" (2026-09-23)

**UX-12. Take only structure and behavior from a reference (Lovable, competitor screens). Never its colors, and never its stage names or full-page detail pattern unless Pavan adopts them.**
- **Why:** "References do not inform color usage"; the Lovable nav was taken "navigation menu ONLY"; its stage names, cross-module dashboard and full-page detail conflict with settled decisions.
- **Applies to:** any work that starts from a reference image or app.
- **Check:** review
- **Source:** `ui/2-rules.md` §9; memory `project_nav_style.md`, `project_3pl_next_session.md`

---

## 2. Audience — tenant vs customer

**UX-13. Classify every screen by audience first: only the Customer Portal (CP) is customer-facing; 3PL, Sales, Service Work, Pricing and Lease are tenant-facing.**
- **Why:** Pavan, 2026-10-17 — "modules serve different audiences, so a pattern isn't automatically right for all of them."
- **Applies to:** every request (protocol step L1).
- **Check:** fpds-register
- **Source:** memory `feedback_audience_split.md` (2026-10-17); `00-protocol.md` L1

**UX-14. Customer-specific behavior stays in the CP unless Pavan brings it to the tenant side — tank-level views for the customer, preferred windows, estimate notes, rule drafts sent to the supplier, the summary card on the right while creating, the alert banner below the toolbar. When unsure whether a CP feature belongs in a tenant module, it is a gap: ask per module.**
- **Why:** shared visual patterns travel; audience behavior does not travel by default.
- **Applies to:** CP ↔ every tenant module.
- **Check:** review
- **Source:** memory `feedback_audience_split.md`; CP README "Open"

**UX-15. When a shared visual pattern changes in one module, apply it to the same column or control in EVERY module (3PL, Sales, Service, Portal) in the same change.**
- **Why:** Pavan found 3PL Delivery Orders' Type column still a disc after Sales got pills (2026-10-16) — old exceptions left standing are drift.
- **Applies to:** pills, steppers, Top off, widths, tables — any DS visual pattern.
- **Check:** review
- **Source:** memory `feedback_pills_default.md` (2026-10-16)

**UX-16. The Unified View is the source of truth. When the CP or any module needs UI the Unified View already has, reuse its design and shared parts. If they differ, the Unified View wins — unless Pavan makes the better one the standard, and then it changes in the shared part for all.**
- **Why:** the portal's "+N" breakdown drifted from the UV's `BreakdownCard`; the audit found five different idioms.
- **Applies to:** every cell, popover, card and banner in any module.
- **Check:** review
- **Source:** memory `feedback_uv_source_of_truth.md` (2026-10-14)

**UX-17. 3PL is the design guardrail for lists, sheets and tables. Before shipping a list, open the closest existing list (3PL Delivery Orders) and match it row for row.**
- **Why:** Pavan, 2026-10-07 — "whatever has been worked on in 3PL is the latest design guardrail". Three screens once shipped half the unit because it was defined from what had been built, not from the reference screen.
- **Applies to:** every list, record sheet and table in every module.
- **Check:** parity-lists, parity-sheets, parity-tables
- **Source:** `unified-view/evals/6-3pl-guardrails.md`; `ui/2-rules.md` §10c "How this was got wrong"

**UX-18. Consistency is required WITHIN a module (same kind of table = same columns, order and widths) and against DS rules. Differences BETWEEN modules that are domain choices (3PL fees vs Service fees columns) are not to be "unified".**
- **Why:** module differences are domain decisions, not drift; raising them wastes Pavan's review.
- **Applies to:** every table and form.
- **Check:** review (G44)
- **Source:** memory `feedback_communication.md`; `service/PRD.md` §7.4; G44

**UX-19. Customer Portal givens: no account switcher; notifications are the top bar's bell (no page); a user allowed to create an order sends it straight to the tenant (no customer-side approval); the customer edits ship-tos and assets directly (no tenant approval).**
- **Why:** reps order from their own apps; the tenant reads ship-tos and assets to take orders, so the customer must keep them right.
- **Applies to:** CP.
- **Check:** review
- **Source:** CP README Navigation, Orders, Sites & Assets (2026-10-13/14)

---

## 3. Lists & views

**UX-20. Every table page is the standard list (`StandardList`): view row, search + Filters, chip shelf, view bar, table, pagination. A table never ships without the whole unit.**
- **Why:** "A table is not a table plus optional chrome" — a list missing half the unit is a second thing for people to learn.
- **Applies to:** every list in UV, Service reference pages (Technicians, Price Book, Parts, Agreements, Maintenance, Compliance, Performance) and CP lists.
- **Check:** parity-lists, fpds-units
- **Source:** `ui/2-rules.md` §10p (2026-10-22), §10c

**UX-21. The first view tab is "All" — never "Default".**
- **Why:** it names what is shown: everything, nothing applied.
- **Applies to:** every list with views.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; memory `project_feedback_round_2026_10_21.md` point 3

**UX-22. REMOVED 2026-10-21 — no preset view tabs (Transport, Tank Wagon, Packaged Goods, Lubes…) and no line-of-service segment (All · Fuel · Lubricants · Propane) in any module. Line of Service, Business (3PL) and Order Kind (Sales) are filters in the Filters panel; users make their own views.**
- **Why:** Pavan's feedback round — users create their own views. This supersedes `ui/2-rules.md` §10 "Presets before views", `unified-view/2-layouts.md` §3, G15 and the CP README's LOS switch.
- **Applies to:** every module.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; memory `project_feedback_round_2026_10_21.md` point 3

**UX-23. A saved view stores the filters AND the display (table / board / map) AND the arrangement — column order and widths, column-search boxes, card fields, lane sort — and opens in that display.**
- **Why:** "a view that restored the narrowing but not the arrangement rebuilds half the thing."
- **Applies to:** every list with saved views.
- **Check:** parity-lists (G1, G4)
- **Source:** `ui/2-rules.md` §10p, §10g; `ux/2-rules.md` columns; memory `project_3pl.md`

**UX-24. A list remembers where it was left for the session — filters, column search, search, sort, columns, date, active view and unsaved changes. Nothing goes until Clear all or the view's own reset; a page reload starts clean; a dashboard drill arriving with its own narrowing wins.**
- **Why:** Pavan, 2026-10-09 — coming back to a list should find it as it was left.
- **Applies to:** every list (`useSavedViews` `storageKey`).
- **Check:** review
- **Source:** `unified-view/3-interactions.md` "A list remembers where it was left" (2026-10-09)

**UX-25. One view → no view switch. A table-only list shows no Table icon; the board icon appears only where a board exists, the map only where records have a place. The column tools stay.**
- **Why:** "a switch with one position switches nothing."
- **Applies to:** every list.
- **Check:** parity-lists (G11)
- **Source:** `ui/2-rules.md` §10h (2026-10-01)

**UX-26. Display icons are `Table2` · `KanbanSquare` · `Map`, the active one on the chip fill. REVERTED 2026-10-22: the redesigned "three shapes" display icons from the 2026-10-21 round are gone; the next design comes from Pavan — do not redesign them.**
- **Why:** Pavan reverted the round's icons to the pre-round design and owns the next one.
- **Applies to:** the display switch on every list.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; memory `project_feedback_round_2026_10_21.md` point 4; `feedback_service_repos.md` sync 2026-10-22

**UX-27. A control belongs to the view it acts on: Search by column and Show/hide columns only in table view; Card fields only on the board; Group By off on the board. A control never quietly changes its subject — it goes away and comes back with its view (not disabled).**
- **Why:** one icon with two meanings gives no way to tell which is live; a control on screen that does nothing teaches people to stop reaching for it.
- **Applies to:** every list toolbar / view bar.
- **Check:** parity-lists
- **Source:** `ui/2-rules.md` §10; `unified-view/2-layouts.md` §4

**UX-28. Every list carries the view bar ON the view (above the table header or the lanes): LEFT a statement ("62 orders · Thu, Oct 22, 2026"; board "62 orders across 9 of 9 lanes · …"; "150 customers" where a list has no date), RIGHT the active view's tools, icon only.**
- **Why:** Pavan, 2026-10-22, after a trial on 3PL Delivery Orders — the view's facts and tools belong to the view; the board's statement replaces its footer line.
- **Applies to:** every list.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p "THE VIEW BAR — every list"

**UX-29. A paged list has pagination in three slots (Showing N–N of N · page numbers · page size) using `TablePagination`'s own sizes and copy. A board gets a total that states its scope, not pagination. A grouped list suspends pagination.**
- **Why:** one list that counts differently is one everybody re-reads; a group straddling pages lies about its count; a number with no window is one nobody can check.
- **Applies to:** every list.
- **Check:** parity-lists (G19)
- **Source:** `ux/2-rules.md` §10; `interactions/2-rules.md` §4c; `unified-view/2-layouts.md` §9

**UX-30. A list's total sits beside the page title and follows the filtered rows — never under the footer.**
- **Why:** it is a fact about the whole list; under the footer it reads as a property of page 1.
- **Applies to:** every list.
- **Check:** review
- **Source:** `interactions/2-rules.md` §4c; 3PL README "The Directory"

**UX-31. Export means the rows you are looking at — filtered, searched, sorted, all pages — through `ExportSheet`, which shows the list's own date and Filters controls and every narrowing as a removable chip.**
- **Why:** a page boundary has no business deciding what ends up in a file; the sheet answers "what am I exporting".
- **Applies to:** every list that exports.
- **Check:** review (G10)
- **Source:** `ui/2-rules.md` §10c; `unified-view/2-layouts.md` §9; 3PL README (Export)

**UX-32. The create CTA goes where creation actually happens. When Create means several different records it is a menu of plain entries (no radios), each with a detail line.**
- **Why:** two forms making one record will drift; names alone do not separate "Asset Delivery" from "Asset Pickup".
- **Applies to:** list view rows (Sales Create Order menu, 3PL Delivery Order · Asset Order).
- **Check:** review (G16)
- **Source:** `ui/2-rules.md` §10c; `unified-view/2-layouts.md` §3; 3PL README "Shell, navigation and create menu"

**UX-33. Date scope: a list whose record IS a day opens on one day; records that outlive a day open on a week (today ±3). A new record outside the window WIDENS it — never moves it. Lists with no dated records (Directory) have no date control.**
- **Why:** creating a record and watching it not appear was the commonest failure; moving the window takes away what was being watched.
- **Applies to:** every date-scoped list.
- **Check:** review (G9)
- **Source:** `unified-view/2-layouts.md` §4; 3PL README (Directory, "A new order lands where the reader is looking")

**UX-34. An empty list says its cause: nothing in this date window · nothing matches the narrowing · nothing here yet · the module has no screens — each with its one way out. Never a single "No data".**
- **Why:** the screen already knows which of the four it is; making the reader work it out is the failure.
- **Applies to:** every list. Empty pages beyond this are a gap area (protocol).
- **Check:** review (G20)
- **Source:** `unified-view/2-layouts.md` §10; `interactions/2-rules.md` §4c

---

## 4. Filters & search

**UX-35. The Filters panel is a facet panel: within a facet OR, across facets AND. Line of Service, Business and Order Kind are facets. A reference list's facets come from its own category columns (2–12 shared values; not the first column, not numbers or dates).**
- **Why:** two statuses mean "either", a status and a technician mean "both"; since 2026-10-21 scope cuts are filters, not segments.
- **Applies to:** every list.
- **Check:** parity-lists (G6)
- **Source:** `unified-view/2-layouts.md` §4; `ui/2-rules.md` §10p

**UX-36. What is on is said out loud: applied facets and the column-search chip on ONE shelf below the toolbar, as removable pills, with Clear all right after the last chip.**
- **Why:** "a quietly narrowed list is the most common way people conclude their data is missing."
- **Applies to:** every list.
- **Check:** parity-lists (G7)
- **Source:** `interactions/2-rules.md` §4c; `ui/2-rules.md` §11b; memory `feedback_pills_default.md`

**UX-37. Search matches the whole row. Search by column is a filter row under the header — one box per column, AND-ed, matching what the column prints — never the old one-column popover.**
- **Why:** two different questions get two controls; the 3PL Delivery Orders row is the reference.
- **Applies to:** every table, every module (table view only).
- **Check:** parity-lists (G2)
- **Source:** `ui/2-rules.md` §10g (2026-10-01); `unified-view/3-interactions.md` §7

**UX-38. One date picker everywhere — `src/components/ui/date-picker.tsx` — for filters and form fields in every module: presets rail, two months, typed start → end, live match count, Reset, Apply; single mode for a one-date field. Only the technician phone app keeps its full-width calendar.**
- **Why:** there were several pickers in ~25 files; Pavan asked for one after his reference image (2026-10-21).
- **Applies to:** every date choice. Supersedes the older `DateRangeFilter` single-date/no-presets description in the 3PL README.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; memory `project_feedback_round_2026_10_21.md` point 4

**UX-39. Group By is offered only when it groups something — never a menu that groups nothing — and is off on the board.**
- **Why:** a dead menu teaches people to stop reaching for it; a board is already grouped by lane.
- **Applies to:** every list toolbar.
- **Check:** parity-lists (G8)
- **Source:** G8; `ui/2-rules.md` §10

**UX-40. A quick-filter segment (at the head of the toolbar) is allowed only when the split is exhaustive and short, flipped several times a session, and divides the list into different JOBS — never for Line of Service or Business, which are filters since 2026-10-21.**
- **Why:** a facet opened, ticked and closed is too much work for a split flipped often; but the 2026-10-21 round moved LOS and business into Filters.
- **Applies to:** list toolbars (e.g. First party · Third party on 3PL Recurring V1/V2).
- **Check:** review
- **Source:** `ui/2-rules.md` §10c "Quick filters" (2026-09-21), superseded in part by §10p (2026-10-21)

---

## 5. Tables

**UX-41. A table takes the full content width — no `max-w-*` cap on a page or section holding a table.**
- **Why:** Sales Settings copied Service's `max-w-4xl` and Pavan asked "why was it built without using the full space?"
- **Applies to:** every table, settings pages included.
- **Check:** parity-tables (G43)
- **Source:** memory `feedback_table_conventions.md` (2026-10-07); `ux/2-rules.md` "Tables — full width"

**UX-42. Every column sorts: asc → desc → unsorted. A lifecycle or priority sorts by POSITION, not the alphabet.**
- **Why:** a header that sorts on one column and not the next teaches the reader to stop trying; Urgent does not belong between two milder words.
- **Applies to:** every table.
- **Check:** parity-lists (G5)
- **Source:** `unified-view/2-layouts.md` §5; `interactions/2-rules.md` §4

**UX-43. Every table's columns move and resize (`TableColumnHeader` + `useTableColumns`); there is no enable flag. Only frame columns (the select box) are fixed. The column menu shows/hides AND reorders.**
- **Why:** column order is the reader's, not the schema's — dispatch wants Driver beside Planned Date, accounting wants Qty beside Status.
- **Applies to:** every table.
- **Check:** parity-lists (G3, G4)
- **Source:** `ux/2-rules.md` "Every table's columns move and resize"

**UX-44. Columns are flat — no column groups unless Pavan asks. When a group heading goes, the labels take its meaning back ("Vendor Price", "Customer Price").**
- **Why:** groups lock columns inside them, cost a header row forever and assert the author's model; Pavan flattened the last grouped table on 2026-10-01.
- **Applies to:** every table.
- **Check:** review
- **Source:** `ui/2-rules.md` §10e (group columns)

**UX-45. Column widths come from the widest RENDERED cell (text, "+N" chips, pills, day grids) + padding, never narrower than header + sort arrow, rounded up to 10px. The table always fills: spare width goes to columns in proportion to (width − 120px); never empty space on the right, never a filler column; wider than the frame → scroll. Customer starts 250, Ship-to 170; rule tables give Schedule and the column before it +20.**
- **Why:** Pavan saw too-wide Products/Next Delivery (old stretch), then an empty gap on the right (2026-10-22). Hand-tuned per-module widths come only from Pavan.
- **Applies to:** every table (`ListTable` does it for lists).
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; memory `feedback_column_widths.md` (2026-10-22); `docs/ds/ui/column-widths.md`

**UX-46. Everything in a table is LEFT-aligned — headers and cells, numbers and money included. Only row action buttons sit at the row's end. Never `align: "right"`.**
- **Why:** a right-aligned Qty sat misaligned with its header (2026-10-22). Supersedes the older "money right-aligned" line in `unified-view/evals/4-content.md`.
- **Applies to:** lists, nested and sheet tables, dashboard tables, statements.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p; memory `feedback_column_widths.md`

**UX-47. A sorted column is shown in grays: header a shade darker with a semibold full-ink label and an arrow; its cells a very light gray; unsorted columns a faint up-down mark. No brand color, no underline.**
- **Why:** the feedback round asked for a prominent sort; brand is reserved for "you chose this" elsewhere.
- **Applies to:** every table.
- **Check:** review
- **Source:** `ui/2-rules.md` §10p (2026-10-21)

**UX-48. Every status column shows a pill coloured by kind — never coloured text alone. A table's Type column is the type's full word in a pill of its color; round code discs stay only on board cards.**
- **Why:** a status must read the same in a cell, a sheet header and a card; a letter is a board-card space economy, not a table one (Pavan, 2026-10-16).
- **Applies to:** every table in every module.
- **Check:** status-kinds
- **Source:** `ui/2-rules.md` §11b; memory `feedback_pills_default.md`

**UX-49. Pills only where chips already exist. Don't turn plain text (products, driver names) into pills. Plain-text "+N" stays plain except in product columns, where "+N" is a pill.**
- **Why:** Pavan: "just the style, not its application to other columns" — he rejected pills on plain text.
- **Applies to:** every table and card.
- **Check:** review
- **Source:** memory `feedback_pills_default.md` (2026-10-09)

**UX-50. A cell with more values than it shows wears "+N"; pressing the chip (or the figure, when the whole cell is the figure) opens the shared `BreakdownCard`, grouped as a small table where the breakdown is grouped.**
- **Why:** one idiom everywhere; the portal had drifted into five.
- **Applies to:** UV and CP tables.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §5 (2026-10-14)

**UX-51. A missing value is printed: `–` when the field applies and nobody filled it, `N/A` when it does not apply, the word when it is a state ("Not scheduled"), and "Not priced"/dash for a price that does not exist — never `$0.00`.**
- **Why:** a blank cell makes an incomplete record look finished; $0 is the one wrong answer that looks real.
- **Applies to:** every table and read-out.
- **Check:** review
- **Source:** `interactions/2-rules.md` §4c; `unified-view/2-layouts.md` §5; 3PL README V1

**UX-52. Selection is opt-in: a list with nothing to do to a selection has no checkbox column.**
- **Why:** 44px of checkboxes for no act is cost without use.
- **Applies to:** every list.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` §5

**UX-53. Columns that answer questions nobody asks first are hidden by default and live in the column menu.**
- **Why:** a table that opens wider than the screen teaches scrolling before anything else.
- **Applies to:** every list.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` §5

**UX-54. A row that holds a child dataset opens one layer down (chevron leading the first cell, never its own column; white layer; one green rail). Where children are few and short (a portal order's tanks), they are stacked lines inside the row instead, the record's own cells shown once at the top.**
- **Why:** the nested layer reads as one unit; stacked lines were chosen over one band per child (Pavan, 2026-10-21).
- **Applies to:** expandable rows in every table.
- **Check:** review
- **Source:** `ui/2-rules.md` §10j (2026-10-17, 2026-10-21)

**UX-55. Tables in sheets are the boxed unit: in a card the table is flush (T1) with the add HANGING off the bottom-left corner — never a "last band" add; a standalone table draws its own box (T2); never a T2 inside a card.**
- **Why:** a table inside a padded card is a box in a box; the "last band" version was wrong for a month and its eval blessed it.
- **Applies to:** every table inside a sheet section or card.
- **Check:** boxed-tables (G35)
- **Source:** `ui/2-rules.md` §10f; `ui/7-variants.md` §3; `00-meta/conformance.md` 2026-09-23 lesson

**UX-56. Editable cells are the `TableCell*` controls filling the cell (`relative p-0`), never a bare form control; a read-only cell is plain text; a computed cell is never an input.**
- **Why:** a combobox dropped in a `<td>` brings its own border and makes the row a form pretending to be a table.
- **Applies to:** every editable table.
- **Check:** table-rows
- **Source:** `ui/2-rules.md` §10f "The cells"

**UX-57. A table always shows at least one row: an editable table a blank row (a record only once typed into — not checked, not saved before), a documents table an "Upload a document" row that opens the picker. Never an empty message in place of rows, never a dashed box.**
- **Why:** Pavan, 2026-10-14 — the blank row IS the invitation; a dashed box invites a click that does nothing.
- **Applies to:** every table in a form or sheet.
- **Check:** review
- **Source:** `ux/2-rules.md` "Tables — one row is always there"; `ui/7-variants.md` §5

**UX-58. Booleans in a table are checkboxes, never switches. A list of single settings is a Setting · Value table.**
- **Why:** consistency by default (Pavan reviewing Sales Settings, 2026-10-07).
- **Applies to:** every table; settings pages.
- **Check:** parity-tables (G39)
- **Source:** `ux/2-rules.md` "Tables — full width, checkboxes, delete on hover"

**UX-59. A row's delete is its own unnamed last column (52px), shown on row hover or focus, asking ✕/✓ in place (`TableRowRemove`), named for its subject ("Remove fee 2"). Rows that cannot go show nothing there.**
- **Why:** the question is asked where the finger already is; eleven identical "Remove row" announcements are eleven questions for a screen reader.
- **Applies to:** every editable table.
- **Check:** table-rows (G37, G38)
- **Source:** `ui/2-rules.md` §10f "Rows"; memory `feedback_table_conventions.md`

**UX-60. Last-row rule: a table the record cannot do without (products on an order, assets on a job) keeps no bin on its last row; a table that may be empty (fees, parts) lets it go, and the empty table is padded text.**
- **Why:** a record must not be put into a shape it cannot exist in.
- **Applies to:** every editable table.
- **Check:** review
- **Source:** `ui/2-rules.md` §10f "Rows"

**UX-61. Every reorderable row has a handle.**
- **Why:** a row that drags with nothing saying so is a hidden gesture.
- **Applies to:** settings tables, any reorderable list.
- **Check:** parity-tables (G42)
- **Source:** `ux/2-rules.md` "Tables — full width…"

**UX-62. A total is a `tfoot` row in the column it sums; it appears only once a row has real content; it excludes rows that state no value (Top off); down the table it is rows → total → add.**
- **Why:** a total outside the table drifts from its column; "Total 0 gal" talks about work not started; a stale number behind a flag must not leak into the sum.
- **Applies to:** every editable table with a measure.
- **Check:** review
- **Source:** `interactions/2-rules.md` §4a T1–T4

**UX-63. A column of checkboxes is NAMED for what the tick does ("Top off", "Include") — one tick, one meaning.**
- **Why:** an unlabelled tick whose meaning depends on a switch elsewhere means different things at different times.
- **Applies to:** every table.
- **Check:** review
- **Source:** `interactions/2-rules.md` T5

**UX-64. Documents use one `DocumentsTable` everywhere — Document (format icon + name) · Added · By · download — with `FileTypeIcon` left of every file name and no Kind column.**
- **Why:** the format tag says what it is; color groups the family, text carries the format.
- **Applies to:** every documents list in UV and CP.
- **Check:** review
- **Source:** `ux/2-rules.md` "Documents — the format icon beside every file" (2026-10-14)

**UX-65. A hanging add's label is singular ("Add product"). An add with nothing left to add is not rendered. In a card holding several tables (a matrix) the add becomes a cell of the matrix — one "Add charge" with a menu, not one add per kind.**
- **Why:** each press adds one row; a dead add with no reason is worse than none; a corner tab could only add to one of several tables.
- **Applies to:** every growing table.
- **Check:** boxed-tables
- **Source:** `ui/2-rules.md` §10f

---

## 6. Boards

**UX-66. A board exists only where there is a workflow: lanes are the lifecycle, in order. Lists without one (Customers, Assets, rules) have no board. Every board is `BrokerBoard`, with lane sort per lane and Card fields scoped per lane or All lanes.**
- **Why:** a column is a place in the work; a list of standing arrangements has no lane to sit in.
- **Applies to:** 3PL, Sales, Service, CP orders.
- **Check:** parity-lists (G12, G13)
- **Source:** `interactions/2-rules.md` §8.1b; memory `project_sales_lovable_gaps.md`

**UX-67. No card drags between lanes. A stage change is the record's own next act.**
- **Why:** a stage change has side effects (mail leaves the building, an accounting push); dragging would mean "do that on somebody's behalf" — a decision, not a gesture.
- **Applies to:** every board.
- **Check:** review
- **Source:** `interactions/2-rules.md` §8.1b (amends §8.1); `00-meta/conformance.md`

**UX-68. A lane that is not a step of the work (Canceled, Blocked) sits apart behind a 3px rule; a lane that is a normal state of the work (waiting on a part) stays in sequence.**
- **Why:** an exit is not a step; a tinted tray or an in-sequence exit misreads the lifecycle.
- **Applies to:** every board.
- **Check:** review
- **Source:** `interactions/2-rules.md` §8.1b

**UX-69. A card is ruled units (stack · inline · rows) with no field labels inside a unit; a unit with nothing under it is removed, heading and all; the card's field set is per lane and a lane is offered only the fields it can draw.**
- **Why:** the heading names the unit and weight carries the rest; a lone heading reads as a failure to load; a switch that does nothing is worse than a shorter menu.
- **Applies to:** every board card.
- **Check:** review
- **Source:** `interactions/2-rules.md` §8.1b; 3PL README "A card is not one design repeated eight times"

**UX-70. Only a card with something outstanding carries an alert.**
- **Why:** "an alert on every card is a border."
- **Applies to:** every board.
- **Check:** review
- **Source:** `interactions/2-rules.md` §8.1b

**UX-71. What a card leads with follows the stage: before the work — who it is for, what, when, who is taking it; after the work — "Completed on" (date and time) replaces the schedule as a separate field. A recurring order's card shows its scheduled date, not the cadence.**
- **Why:** a finished record is asked when it RAN; both dates must be readable on a late run.
- **Applies to:** every board card.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` §6; 3PL README (board cards 2026-10-05)

**UX-72. Lane colors are an application binding: gray starts, red stops, green finishes, purple hands off — one table per application, one meaning per hue. Service's Canceled lane is gray (red only for warnings, 2026-10-16 — supersedes the older binding table's red).**
- **Why:** a hue must not mean two things in two modules; Canceled is not a problem to solve.
- **Applies to:** board lanes.
- **Check:** review
- **Source:** `unified-view/1-components.md` §5; `ui/2-rules.md` §10b, §11b "Red is only for a warning"

---

## 7. Records & sheets

**UX-73. A record opens in a side sheet and the sheet IS the form — create and edit are the same sheet (`mode`). No separate read-only detail page with an editor beside it. A full page is only for a flow with no list behind it.**
- **Why:** a page takes the list off screen; two descriptions of one record drift. A full-page Directory detail was built and removed.
- **Applies to:** every record in every module (`RecordSheet`).
- **Check:** parity-sheets (G21)
- **Source:** `interactions/2-rules.md` §1, §8.4; `ux/2-rules.md` "CREATE AND EDIT ARE THE SAME SHEET"

**UX-74. An existing record's sheet autosaves: the draft chip beside the title (nothing before the first change, then saving, then saved), no Save, no Update, no Cancel. Close is the exit.**
- **Why:** "a reader who has to remember to press Save is a reader who loses work"; Cancel promises an undo the sheet cannot keep; "the feedback IS the feature".
- **Applies to:** every editable sheet of an existing record, every module.
- **Check:** parity-sheets (G22, G23)
- **Source:** `ux/2-rules.md` Side-sheet anatomy; `unified-view/3-interactions.md` §1

**UX-75. A NEW record is created by its create act: nothing is saved before it, no save state shows, and closing with anything typed asks "Discard this order?" (Keep editing / Discard). Then the sheet re-opens on the record and autosaves. A record still in Draft may show "Save as Draft" (outline, left of the commit act).**
- **Why:** Pavan, 2026-10-06 — "autosave is for records that exist." This supersedes the 2026-09 "a record exists from the first keystroke" wording in `ux/2-rules.md`, `unified-view/3-interactions.md` §1 and `service/PRD.md` §4.2. Save as Draft (2026-09-25) is the one Save allowed, only while the record is a draft (Service orders, CP order).
- **Applies to:** every create sheet (3PL Delivery/Asset order, Sales order/quote, Service order, CP order).
- **Check:** parity-sheets (G33)
- **Source:** `ui/7-variants.md` §1 "Nothing is kept before the create act"; `ux/2-rules.md` "Forms — Save as Draft"; G22, G33

**UX-76. The footer primary is the NEXT ACT on the record — one only, labeled as the act ("Move to Assigned", "Create Order"), never a state, never Save / Update / Confirm. It changes as the record moves. Other legitimate acts go in the ⋯ menu beside it.**
- **Why:** "A primary that says Update on a sheet that has already updated is a button for a job that is done"; "Waiting on partners" asks the reader to press a fact.
- **Applies to:** every record sheet.
- **Check:** parity-sheets (G24); sheets
- **Source:** `ux/2-rules.md` "THE PRIMARY IS A LADDER"; `unified-view/2-layouts.md` §8

**UX-77. What the primary is waiting on goes in the pending strip above the footer: one item at a time with a counter and chevrons, under the fixed word "Pending", each item an instruction ("Choose a customer"), pressing it takes you there. With nothing left it says so in the success channel. An exception that stops the work (a hold, a credit block) takes the strip.**
- **Why:** three missing fields cost one line, not three; a field name is not an instruction; an empty strip and a satisfied one are different states.
- **Applies to:** every record sheet with requirements.
- **Check:** parity-sheets (G25)
- **Source:** `ux/2-rules.md` "WHAT THE RECORD IS MISSING GETS A STRIP"; `ui/7-variants.md` §1 F1

**UX-78. Acts ON the record — Cancel order, Duplicate order, Delete, Discard draft, Download tickets — live in the header ⋯ menu, never in the footer or the form.**
- **Why:** none of them is ever the next act; in the reading path they compete with filling the form.
- **Applies to:** every record sheet.
- **Check:** review (G26)
- **Source:** G26; 3PL README ("Duplicate order and Download tickets live behind the ···"); `service/PRD.md` §6

**UX-79. One act moves one thing. A precondition is not the act ("Assign technician" names a field; "Create Service Order" names the act). Finalize and Confirm are two acts. A stage that waits on another system really waits. Going backwards clears what the forward step stamped.**
- **Why:** an act that both sends and advances moves the record out from under the reader.
- **Applies to:** every lifecycle record.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §6; memory `project_3pl.md` (settled)

**UX-80. Sheet width follows the content: `form` 600 for fields · `fit` = the widest table's columns at `CELL` widths + 34 (+364 with the rail), min 600 · `data` 1200, fields three across, for data-intensive EXISTING records · `compact` 510 for controls · `full` only while a step column shows (no form now). Per step, clamped to window − 56.**
- **Why:** "A sheet sized for more than it holds reads as empty"; data-intensive records were "cramped". Replaces 560/864/1120 caps and the 756 floor (2026-10-15) and the Service PRD's "creation sheets fill the screen".
- **Applies to:** every sheet in UV, Service and CP.
- **Check:** sheets (G28)
- **Source:** `ui/7-variants.md` §1 Width (2026-10-15); memory `feedback_ui_rules.md`

**UX-81. A sheet over a sheet is level 2: the gap twice (window − 112) and never wider than the sheet beneath less 56, so a strip of the one below always shows.**
- **Why:** at the same inset the second sheet reads as the first having changed its contents.
- **Applies to:** quotes over orders, activity logs, nested ship-to/asset sheets, dispute sheets.
- **Check:** review
- **Source:** `ux/2-rules.md`; `ui/7-variants.md` §1 Depth

**UX-82. A creation sheet has no right rail (Summary · Associated records · Activity) until the record exists. A Draft opened from a list is an existing record — full sheet with rail. CP exception: the Request summary card sits in the right column while creating (portal-only; whether it spreads is open).**
- **Why:** there is nothing derived to show before the record exists; Pavan corrected the Draft case on 2026-10-05.
- **Applies to:** every create sheet.
- **Check:** review (G32)
- **Source:** memory `feedback_ui_rules.md`; `ux/2-rules.md`; CP README Orders + Open

**UX-83. A two-column sheet puts what you can type into on the left, in filling order, and what the record has become on the right — a 340px read-only rail that stays put while the form scrolls; it folds to one column below `lg`. Existing lifecycle records have the rail.**
- **Why:** once an editable number and a computed one share a column they look identical.
- **Applies to:** every record sheet with a derived side.
- **Check:** review (G31)
- **Source:** `ux/2-rules.md` "THE TWO-COLUMN SHEET"; `ui/7-variants.md` §1 Body

**UX-84. Computed figures go in the shared Summary card (3PL "Quotation summary" shell); history in the shared Activity card (timeline). Never a bespoke summary or activity block. A section's notes are their own unit under that section's table, in the same group.**
- **Why:** Pavan (2026-10-07, on the Quote sheet) — the effective price and activity were rebuilt as new blocks; consistency is the default.
- **Applies to:** every module's record sheet.
- **Check:** parity-sheets (G29, G30)
- **Source:** `ux/2-rules.md` "Record sheets — one summary card, one activity card"; memory `feedback_shared_sheet_cards.md`

**UX-85. The activity log records meaningful events only — who, when, how much, what stage, old → new. Draft edits are not logged; a changed note is recorded as "changed", not quoted.**
- **Why:** an entry per pause buries the entries that matter.
- **Applies to:** every record with history.
- **Check:** review
- **Source:** memory `feedback_ui_rules.md`; `unified-view/3-interactions.md` §2; `service/PRD.md` §6

**UX-86. Audit history opens from an icon in the sheet header (activity · ⋯ · ✕) into its own drawer or level-2 sheet — never at the foot of the record body.**
- **Why:** it is the longest block and the least read; at the foot it buries what the sheet was opened for.
- **Applies to:** directory records, CP ship-to and asset sheets, any record with an audit trail.
- **Check:** review
- **Source:** `interactions/2-rules.md` §8.4; CP README Sites & Assets

**UX-87. A stepped create form is ONE vertical scroll: every step's section on the page, the compact `StageTrack` marks the section at the top of the view, pressing a step scrolls to it, nothing is gated, and the create act is live once the required fields are. The step column is archived (off everywhere) — restore only when Pavan says "Bring back the stepper".**
- **Why:** Pavan, 2026-10-16 — the recurring rule's look and flow made the standard. Where an older CP description (2026-10-14) gates ship-to/asset step 2, the newer one-scroll rule wins; a screen that still gates is drift to report.
- **Applies to:** every stepped create form, every module.
- **Check:** parity-sheets (G27)
- **Source:** `ux/2-rules.md` "A FORM'S STEPS AND A RECORD'S STAGE LOOK THE SAME"; memory `project_nav_style.md` (2026-10-07), `project_3pl_recurring.md` (2026-10-16 d)

**UX-88. A live record's detail shows its stage as a `StageTrack` pinned at the top of the form column; the status chip beside the number then goes. Header order: number · flags about the order (Urgent) · save state, always last.**
- **Why:** the track already says the status; the save state is about the sheet, not the order.
- **Applies to:** lifecycle record sheets (3PL Delivery Order is the reference).
- **Check:** review (G34)
- **Source:** `ux/2-rules.md` "ORDER DETAIL PAGES DRAW THE STAGE AS A TRACK" (2026-10-05); 3PL README "Detail page"

**UX-89. A sheet section is a card (`SheetSection`) by default; sections sit 40px apart with the title 16px from its content. An optional section collapses to an "Add …" box and is removed with a MINUS, never a bin; removal confirms only when the section has content.**
- **Why:** the border holds the boundary at any length; a bin says destroy, a minus says collapse; a dialog over an empty table teaches people to dismiss dialogs.
- **Applies to:** every sheet.
- **Check:** review
- **Source:** `ux/2-rules.md` "A section is a CARD", "Section rhythm", "Removing an optional section is a MINUS"

**UX-90. Derived values are read-outs, not disabled fields. A figure standing alone has a name (Total, Estimated, Owed).**
- **Why:** a disabled input promises an edit and dims the value; an unnamed number makes the reader work out what it is.
- **Applies to:** every sheet and card.
- **Check:** microcopy
- **Source:** `ux/2-rules.md` "Derived values are READ-OUTS", "A FIGURE HAS A NAME"

**UX-91. A membership gate lives in the picker, whose empty state names the gate ("Nothing matches inside this partner's area"). A collision is flagged inline on its row and stays pressable — not blocked.**
- **Why:** a gate enforced after the press let somebody do the work first; only the person knows whether a collision is a mistake.
- **Applies to:** pickers constrained by an earlier choice.
- **Check:** review
- **Source:** `ux/2-rules.md` "A MEMBERSHIP GATE LIVES IN THE PICKER"

**UX-92. A decision about the RECORD stays in the section it changes; a decision about the ACT of submitting (urgent, get a signature) rides in the footer aside.**
- **Why:** the commit-time decision must be in view however far the body has scrolled.
- **Applies to:** every record sheet.
- **Check:** review
- **Source:** `ux/2-rules.md` "Footer flags"; `ui/7-variants.md` F2

**UX-93. Empty card or form space uses the one `QuietPattern`. A sheet shows it automatically when its content takes half the visible height or less — never hand-placed in a sheet, never a new pattern per card.**
- **Why:** Pavan wants one decorative fill, consistent everywhere (2026-10-15/16).
- **Applies to:** sheets and cards.
- **Check:** review
- **Source:** `ui/2-rules.md` §11d

**UX-94. Settings that change the flow say what happens in BOTH positions; a nested switch goes off with its parent; a setting that removes a step removes its UI; every setting has a control.**
- **Why:** a switch whose off-state is unstated is one nobody dares move; a setting with no control is wrong everywhere at once (`returnMode` had no UI for days).
- **Applies to:** module settings (Service, Sales).
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §9; memory `project_service_work.md` (lessons)

---

## 8. Forms & fields

**UX-95. Build only what was asked. Anything extra — an alert line, a helper, a badge, a detail line, a read-out — is a question, not a screen element.**
- **Why:** said three times, then made standing; "Why are these details added without asking?" (2026-09-25).
- **Applies to:** every screen.
- **Check:** review
- **Source:** memory `feedback_no_unrequested_ui.md`; `service/PRD.md` §7.1

**UX-96. No explanatory microcopy: no helper text under fields, no em-dash clauses on option labels, no sub-labels under switches, no "Note: …". Text is allowed only for a STATE or a CONSEQUENCE. Explanations sit behind an ⓘ that opens on click. Settings pages are the exception (explaining the option is the content).**
- **Why:** "a control that needs teaching under every instance is a control that is wrong."
- **Applies to:** every form and sheet.
- **Check:** microcopy (G47)
- **Source:** `ux/2-rules.md` "HELPER TEXT IS NOT A DEFAULT" (2026-09-23); memory `feedback_no_unrequested_ui.md`

**UX-97. Every optional picker offers its empty choice first, named for what it means ("No asset", "No technician"); a required picker has none.**
- **Why:** a field that started empty must be able to go back to empty.
- **Applies to:** every optional select/combobox.
- **Check:** review (G46)
- **Source:** `ux/2-rules.md` "Forms — an optional field can be emptied again" (2026-09-25)

**UX-98. A row of fields fills its row: equal `1fr` / `flex-1` shares, 24px apart (16 in a dense grid), the last field ending at the container's padding. A fixed pixel width only for a natural-size control (date, time, DS search box) with a `FIXED WIDTH` comment. After any sheet-width change, re-read every row.**
- **Why:** 2026-10-16 the recurring rule's Repeat / Times a day sat in a fixed 340px column and a third of the card stood empty; Pavan had to ask why it wasn't caught.
- **Applies to:** every form.
- **Check:** fields-fill
- **Source:** `ui/2-rules.md` §10e "A row of fields fills its row"; memory `feedback_fields_fill.md`

**UX-99. Any input that repeats (lines, charges, rates, assets, contacts) is an editable TABLE by default; every cell editable in place; a qualifying unit ($/gal · $ · %, currency) is a compact menu inside the value cell.**
- **Why:** Pavan (2026-10-07): "I shouldn't be saying this needs a table… by default it should be the table view."
- **Applies to:** every form in every module.
- **Check:** review (G45)
- **Source:** `ux/2-rules.md` "Forms — like inputs are a table by default"; memory `feedback_table_by_default.md`

**UX-100. A unit is not a yes/no. The in-cell menu is only for ways of stating the same number; a choice that REPLACES the number (Top off, TBD) is a named checkbox column — the number cell shuts while ticked and the typed number is kept but never counted.**
- **Why:** the CP's first order sheet shipped a "Gal / Fill to full" menu where every other module has the Top off checkbox (2026-10-13).
- **Applies to:** every lines table.
- **Check:** review
- **Source:** `ux/2-rules.md` "A unit is not a yes/no"

**UX-101. Same data, same control: before building any field, table or column, find where the same data already lives in a built module and reuse its control, columns, order and words. A PRD's wording never replaces the app's term ("fill to full" is Top off). A genuinely new pattern is named as new so it can be ruled on.**
- **Why:** Pavan, 2026-10-13 — a new pattern shipped silently is drift.
- **Applies to:** every field and table.
- **Check:** review
- **Source:** `ux/2-rules.md` "Same data, same control"; memory `feedback_ui_rules.md`

**UX-102. Every delivery-window field is `DeliveryWindowTimeline` (label outside, outlined box, preferred-time bars) — never the old `TimeWindowSlider`. Sales orders have no window; the technician phone app keeps its slider.**
- **Why:** Pavan, 2026-10-20 — "apply wherever applicable, all modules and service work". Supersedes `TimeWindowSlider` in the 2026-10-13 "Same data" paragraph.
- **Applies to:** 3PL Delivery Order and Create rule, Service order scheduling window, CP order, ship-to and rule.
- **Check:** review
- **Source:** `ui/2-rules.md` §10m; memory `feedback_delivery_timeline.md`

**UX-103. Every dropdown searches, short lists included; "none" options ("— Unassigned", "Not set") are real options; a value used on another row shows ticked and unselectable, not hidden; a known-but-not-closed set is a creatable combobox.**
- **Why:** a field that ignores typing at five options must be opened before you know how to use it; a list that changes length makes people think a row doesn't exist.
- **Applies to:** every select/combobox.
- **Check:** review
- **Source:** `interactions/2-rules.md` §1, §2a

**UX-104. Sample pick lists never come up empty — 3 to 10 options wherever a choice is made.**
- **Why:** an empty pick list cannot be reviewed.
- **Applies to:** every prototype picker.
- **Check:** review
- **Source:** memory `feedback_ui_rules.md`

**UX-105. A toggle is a statement and an answer: label left, switch hard right against the container edge, full width — never stacked like an input. (Inside a table, booleans are checkboxes.)**
- **Why:** stacked, it leaves a 20px control alone on a line with a hole beside it.
- **Applies to:** settings and forms.
- **Check:** review
- **Source:** `interactions/2-rules.md` §1

**UX-106. Typed text starts with a capital (soft keyboard sentences; first character normalised on blur — never email, URL, password, phone, number, money, date or a chosen value). A stored enum shows in sentence case ("Active"); the value stays as stored.**
- **Why:** a field that rewrites itself mid-keystroke is one people fight; `capitalize` title-cases every word.
- **Applies to:** every text input.
- **Check:** review
- **Source:** `interactions/2-rules.md` §1

---

## 9. Orders domain

**UX-107. Use each module's locked status words. 3PL: lanes Orders (holds Draft + Awaiting Quotation) · Quoting · Assigned · Completed · Review · Verified · Synced ┃ Canceled · Blocked. Old Assigned → Quoting, old Accepted → Assigned, Accounting Sync Ready → Verified, Partial Accounting Synced → Partially Synced, Accounting Synced → Synced. Choosing a partner is "Finalize vendor" (state Finalized) — no UI says "Award". Movement orders are "Asset Orders" with four routes.**
- **Why:** vocabulary locked 2026-09-16 and 2026-09-23 ("ONE NAME FOR THE ACT"); careful with find/replace — Sales has its own unrelated Assigned.
- **Applies to:** 3PL.
- **Check:** review
- **Source:** memory `project_3pl.md`; 3PL README header and §"An asset order is a route"

**UX-108. Accounting states are set by accounting, not pressed. 3PL: Review is an optional reversible hold; Verified is the sync-ready queue; only accounting marks Synced; Partially Synced is an ERROR carrying the back office's message (Retry sync · Send to review · Mark synced). Service: payment statuses come only from accounting.**
- **Why:** from Aayush's engine doc (2026-09-24) and Deepika's calls — the app must not claim what another system decides.
- **Applies to:** 3PL, Service Work.
- **Check:** review
- **Source:** memory `project_3pl.md`; `service/PRD.md` §6

**UX-109. Sales stages are Requested · Scheduled · Dispatched · Delivered · Canceled (kinds caution · info · info · success · neutral). A driver pick moves Requested ↔ Scheduled; Cancel order is in ⋯. Sales stage and order-type colors are chosen in Sales Settings — the one exception to kind colouring.**
- **Why:** Pavan chose the five stages (2026-10-07) and Scheduled yellow / Dispatched blue (2026-10-09).
- **Applies to:** Sales.
- **Check:** status-kinds
- **Source:** memory `project_sales_lovable_gaps.md`; `ui/2-rules.md` §11b

**UX-110. Customer Portal orders (2026-10-21): no request number — the order the customer creates (ORD-…, with its planned date) IS the order the tenant works; no request↔order split; no quotes (pricing is agreed in the separate Pricing flow); no accept/decline/review. Statuses: Draft → Unassigned (sent, no driver) → Scheduled (driver assigned) → Out for delivery · Partial delivery · Delivered · Invoiced · Paid · Canceled. "Action needed" is gone; Credit hold is a flag with its reply panel on the order sheet.**
- **Why:** Pavan changed the model on 2026-10-21. This supersedes the CP README's REQ-/quote/In review statuses and the 2026-10-19 request→orders split.
- **Applies to:** CP Orders.
- **Check:** review
- **Source:** memory `project_customer_portal.md` (2026-10-21)

**UX-111. A change or cancellation request is NOT a status or a lane: the order keeps Unassigned/Scheduled and shows an "Awaiting confirmation" / "Awaiting cancellation" pill (popover: what, note, when) in the table, a pill + caution strip on the board card, and a section in the sheet. "Invoice disputed" is removed everywhere (dispute flow dormant).**
- **Why:** Pavan, 2026-10-22 — supersedes the 2026-10-21 list that had Change/Cancellation requested as statuses.
- **Applies to:** CP orders and invoices.
- **Check:** review
- **Source:** memory `project_customer_portal.md` (2026-10-22)

**UX-112. Status color is by KIND — caution (waiting on somebody), info (simply true), success (done), critical (a warning), neutral (neither). Applications declare kinds, never tones. Canceled is not red; being active is info; a decision (Paused) is not a fault; the normal state says nothing.**
- **Why:** declared as tones, "Assigned" came to be green, amber and blue in three modules; a dispatcher scans for the amber ones.
- **Applies to:** every status in every module; a new module adds its row to the binding table before it ships a badge.
- **Check:** status-kinds (G48)
- **Source:** `ui/2-rules.md` §10b (2026-09-23); `unified-view/1-components.md` §5

**UX-113. Red means only a warning — Urgent, Late, Overdue, Unpaid, Blocked, Over SLA. A type, a category, a lane that is a place, or Canceled is never red; a categorical color that would land on red takes another hue.**
- **Why:** Pavan, 2026-10-16 — red must mean something is wrong or about to be.
- **Applies to:** pills, discs, lane strips, words.
- **Check:** review
- **Source:** `ui/2-rules.md` §11b "Red is only for a warning"

**UX-114. Every lines table ends Top off · Qty: Asset · Product · (readings, accounts…) · Top off · Qty LAST · bin. The Top off header is the label plus a select-all checkbox (indeterminate when some); row ticks right-aligned under it.**
- **Why:** Top off replaces the number, so the two are never apart, and the figure ends the row. Pavan had to ask twice; final 2026-10-20 for EVERY module — supersedes "Top off after Qty" (2026-10-16) and the create-rule order Asset · Product · Qty · Top off.
- **Applies to:** 3PL, Sales, Service, CP lines tables.
- **Check:** table-rows
- **Source:** `ui/2-rules.md` §10i; memory `feedback_top_off_after_qty.md`

**UX-115. In ANY table that adds rows, the picker that names the row takes several at once: checkboxes + Apply; the first pick fills the row, each other becomes its own row under it; only from a BLANK row (a filled row is a single swap); picks on other rows show ticked and locked. In-row values carry a `ONE VALUE` note; several values that belong in one cell stay one cell.**
- **Why:** the order form made the customer open the list once per tank; Pavan's third reminder (2026-10-16): "it is still not happening" — assets, loading accounts, parts, fees, events, anything.
- **Applies to:** UV, Service Work and CP row-adding tables.
- **Check:** table-rows
- **Source:** `ui/2-rules.md` §10f "Picking several makes rows"; memory `feedback_multi_pick_rows.md`

**UX-116. Field reach: a field added to a record goes onto EVERY screen that creates, edits or lists that record — sheets, inline create tables, lists, nested breakdowns — in the same change. Skipping a screen needs a written reason in the registry.**
- **Why:** Pavan, 2026-10-14 — "this should actually go without saying"; the asset sheet got RFID/ERP ID but the ship-to's asset table did not.
- **Applies to:** every record type (registered: Asset, ShipTo, Invoice, PortalUser).
- **Check:** field-reach
- **Source:** memory `feedback_field_reach.md`; `unified-view/evals/5-data-and-state.md` "Field reach"

**UX-117. On a new CP order Top off is never pre-ticked (any entry point); Qty starts empty; the suggested quantity is the Qty placeholder, and there is no Suggested column.**
- **Why:** Pavan, 2026-10-20 — the user ticks Top off; supersedes the 2026-10-13 "Top-off draft per ship-to" from the tank banner.
- **Applies to:** CP order create (Create, tank alert, dashboard tank card).
- **Check:** review
- **Source:** memory `project_customer_portal.md` (2026-10-20)

**UX-118. Capacity is always ONE asset's (how much it holds) — never summed per ship-to or product. Orders show Quantity (requested).**
- **Why:** tanks do not pool into one tank (Pavan, 2026-10-14).
- **Applies to:** every capacity figure.
- **Check:** review
- **Source:** memory `project_customer_portal.md` (2026-10-14); 3PL README "What sums"

**UX-119. The repeat act is "Duplicate order" — never "Reorder" — and lives in ⋯.**
- **Why:** one word for one act across modules.
- **Applies to:** CP, 3PL.
- **Check:** review
- **Source:** CP README Orders + PRD cross-check; 3PL README

**UX-120. 3PL creation: Create Order needs customer + ship-to and a product line; the Vendor section shows on the create sheet too and its picks and sends carry into the created order. Assigned means a vendor is finalized; Assigned keeps Change vendor; any quote moves Orders → Quoting.**
- **Why:** lane walk 2026-10-06 (supersedes the earlier "partner invited" gate); 2026-10-20 reverses "no vendor before Create Order" — choosing partners is a creation step.
- **Applies to:** 3PL Delivery Order.
- **Check:** review
- **Source:** 3PL README "The lane walk"; memory `project_3pl.md` (2026-10-20)

**UX-121. Service Work words: quote answers are Approved · Approved on the customer's behalf · Rejected — never "skip"; a rejected quote stays open with a revision banner. Dispatcher jobs are skipped with a reason, never deleted. No mileage anywhere.**
- **Why:** Deepika's domain rulings (2026-09-24/25).
- **Applies to:** Service Work.
- **Check:** review
- **Source:** `service/PRD.md` §6; memory `project_service_work.md`

**UX-122. Do not suggest, ask about or build tank-monitor-driven features (level-triggered rules, "order when below X%"). Tank levels show only where a monitor is fitted, as a gauge in the band's color and the % — no band words.**
- **Why:** Pavan, 2026-10-16: "Tank monitors, we will handle separately. Don't ask me this again until I bring it up." Monitor readings came into scope 2026-10-17; auto rules did not.
- **Applies to:** CP and 3PL (and anywhere).
- **Check:** review
- **Source:** memory `feedback_no_tank_monitor_rules.md`; CP README "Tank monitors"

---

## 10. Recurring

**UX-123. Every order that can repeat uses `RecurringOrderSection`: an optional section like Load Order — a dashed "Add Recurring Order", then the frequency picker in a box; the section's minus removes it. No recurring checkbox.**
- **Why:** Pavan, 2026-10-20. Supersedes the "Recurring order checkbox" in `ux/2-rules.md` "Same data" and the CP README.
- **Applies to:** 3PL Delivery Order, CP order. Service orders don't repeat (Agreements/Maintenance do).
- **Check:** review
- **Source:** `ui/2-rules.md` §10m; memory `feedback_delivery_timeline.md`

**UX-124. One frequency picker (`RuleFrequencyPicker`) in all modules: Days | Date as a greyscale segment; Daily and Custom cycle as label-then-switch; the Date basis is "Select dates" with day numbers 1–31 only (no month, no stepping), Repeat at the row's right; end date below in both modes.**
- **Why:** 2026-10-20 (later) supersedes the calendar-grid Date basis of the same day and the older date strip.
- **Applies to:** 3PL rule, CP rule, order recurring sections.
- **Check:** review
- **Source:** memory `project_3pl_recurring.md` (2026-10-16, 2026-10-20)

**UX-125. Violet highlights a schedule: picked days, dates and months in every frequency picker AND the lit days in every schedule shown in a list (`ScheduleCell`) — the form and the list say it identically.**
- **Why:** violet is the one accent and it marks what to notice; brand orange means "you chose this".
- **Applies to:** every frequency picker and schedule cell.
- **Check:** review
- **Source:** `ui/2-rules.md` §10c (2026-10-16); memory `feedback_accent_violet.md`

**UX-126. A schedule in a list is a shape, not a sentence: seven day letters (lit / faint, unlit days keep their slot) with how often on the line under; a pattern that is not a weekday habit gets one word (Daily).**
- **Why:** seven marks compare instantly where "Monthly On First Thursday" has to be read.
- **Applies to:** every schedule column.
- **Check:** review
- **Source:** 3PL README V1 "The Schedule column is a shape"

**UX-127. 3PL Recurring works on V1.1 only (V1 and V2 are archived). The act is "Create rule". A rule is lane-first (partner first, then only ship-tos in its service area), one rule one partner, target = a ship-to. Frequency is constitutive; an edit never rewrites delivered work; a rule can be partly live; a generated order is a full independent order; changes flow downward; nothing generates until a vendor is locked. Series statuses: Upcoming · Active · Paused · Canceled · Ended · Expired.**
- **Why:** Pavan, 2026-09-23; Aayush's engine doc is the behavior to match.
- **Applies to:** 3PL Recurring Orders.
- **Check:** review
- **Source:** memory `project_3pl_recurring.md`; 3PL README V1.1

**UX-128. Create rule is three sections on ONE scroll — Rule and frequency · Partners and products · Ship-tos and assets — with the compact track following the scroll, no gating and no Next buttons; "Create rule" is live when nothing is pending. A rule stays editable (same form) while it has made no order.**
- **Why:** Pavan, 2026-10-16 d; supersedes the two-step gated create.
- **Applies to:** 3PL Create rule (and the CP rule form, "one scroll, rings steps").
- **Check:** review
- **Source:** memory `project_3pl_recurring.md`; CP README PRD cross-check

**UX-129. A clash between rules at one ship-to exists only on a day both run AND they fill the same asset or their delivery windows overlap — the same product into a different tank is not a clash. Clashes (16-week look-ahead) show subtly in a Conflicts table, two rows per clash, with Resolve.**
- **Why:** Pavan, 2026-10-01; a banner and row-per-day were both rejected; kept subtle on purpose.
- **Applies to:** 3PL Create rule.
- **Check:** review
- **Source:** memory `project_3pl_recurring.md`; 3PL README "Changes, 2026-10-01"

**UX-130. Recommendations are RULE-level (a frequency + every ship-to it fits); the act is "Review and Create Rule", which fills the form. A recommendation never says "or" — an or is a separate rule. A form opened from a recommendation shows no Recommendations button.**
- **Why:** Pavan, 2026-10-07.
- **Applies to:** 3PL and CP recurring lists.
- **Check:** review
- **Source:** memory `project_3pl_recurring.md`; 3PL README "Recommendations"

**UX-131. CP Recurring Orders lists the customer's RULES (one ship-to per rule). A rule makes Draft orders ahead of time that the customer sends; made orders carry a violet R-xxxx pill; editing a rule changes only orders not yet made; the supplier approves nothing about the rule.**
- **Why:** Pavan, 2026-10-16 — "set it once".
- **Applies to:** CP.
- **Check:** review
- **Source:** CP README PRD cross-check; memory `project_customer_portal.md`

---

## 11. Dashboards

**UX-132. Dashboards are built from `DashboardParts`, and every tile, bar and row drills to the list narrowed to exactly what it counts (or opens the record).**
- **Why:** a figure you cannot open is a number nobody can check.
- **Applies to:** 3PL, Sales dashboards; CP dashboard counts.
- **Check:** parity-shell (G50); review (G51)
- **Source:** G50–G51; `unified-view/2-layouts.md` "Module dashboards"

**UX-133. Charts: a count over stages or time is one series in slot-1 blue with the peak lit; a share of a whole is a segmented bar in the palette's fixed order with a coloured dot by each name; identity is the label, never color alone.**
- **Why:** color by the job it does; color is never the only carrier.
- **Applies to:** every dashboard chart.
- **Check:** review
- **Source:** `unified-view/2-layouts.md` "Restyled after a reference dashboard" (2026-10-05)

**UX-134. Every figure card and dashboard unit uses `MetricIcon` beside the figure (centred on figure + chip + "vs" line) with one icon per term from `TERM_ICONS` (deliveries truck, products drop, gallons drum, ship-tos pin), and ONE change marker, `TrendChip` (down always the trend-down red; `good` flips it). No arrows in circles, no orange, no trend lines on figure cards.**
- **Why:** Pavan iterated these on the CP Schedule card and wants them reused everywhere (2026-10-20); same term, same icon in every module.
- **Applies to:** every figure card in every module.
- **Check:** review
- **Source:** `ui/2-rules.md` §10k; memory `feedback_metric_icons.md`

**UX-135. Cards in one row are the same height; a chart in each fills its card (x-axis on the card's foot); figure rows share a height. Check by measuring.**
- **Why:** Pavan, 2026-10-14 — what repeats across cards must line up.
- **Applies to:** dashboards, overview cards.
- **Check:** review
- **Source:** `ux/2-rules.md` "Side by side, lined up"

**UX-136. No explainer lines on a dashboard: a headline figure opens its explanation on click; a chart's explainer is an ⓘ beside its title; a limit is drawn as a line, not captioned.**
- **Why:** Pavan, 2026-10-14 — the no-microcopy rule applied to dashboards.
- **Applies to:** CP dashboard (and any dashboard following it).
- **Check:** microcopy
- **Source:** CP README Dashboard

**UX-137. The CP dashboard (after the Anirudh review, 2026-10-19): Attention required → Schedule (next 7 days) → Tank levels → Spend → Billing & credit. No market comparison anywhere; delivery performance lives on Reports; Asset health removed. Attention tiles are titled with the ACTION required and open an action sheet first.**
- **Why:** Pavan's review decisions. The quote tile was removed with the no-quotes model (2026-10-21): the Customer Portal's attention kinds are credit hold, running late and no proof of delivery.
- **Applies to:** CP Dashboard.
- **Check:** review
- **Source:** CP README "Dashboard after the Anirudh review"; memory `project_customer_portal.md`

---

## 12. Alerts & attention

**UX-138. Two banners, chosen by one question — does pressing it do something to the page? B1 (`BannerCallout` / `BannerInline`) says one thing with at most one action or ✕. B2 (`AlertBanner`) is for alerts the reader acts on and carries its whole anatomy. Never dress a one-liner in B2 parts.**
- **Why:** final standard, iterated piece by piece on the CP (Pavan, 2026-10-13).
- **Applies to:** every module.
- **Check:** review
- **Source:** `ui/7-variants.md` §6; `interactions/2-rules.md` §7; memory `feedback_banner_final.md`

**UX-139. AlertBanner, filter alerts (standard since 2026-10-15): tag pill with its icon and the count inside · plain title · muted detail · ghost "View details" that applies the filter and becomes "✕ Clear filter". Right side: the alert's own action · ‹ 1 of N › · snooze · ✕ always last. One kind at a time, most serious first. An alert with no filter keeps the count pill with chevron and the item list.**
- **Why:** Pavan tried it on the portal's Invoices, then made it standard for every module.
- **Applies to:** Sales Orders, Service Orders, CP Orders and Invoices, any new list alert.
- **Check:** review
- **Source:** `interactions/2-rules.md` §7a; memory `feedback_banner_final.md`

**UX-140. Banner placement: in every module (UV and CP), under the toolbar — search, Filters, chips — and right above the table or board (Pavan, 2026-10-25). The banner is always the info blue; each alert's pill carries its severity colour. More than one alert: ‹ 1 of N › plus View all, which lays every alert out as its own banner, one under another; Collapse folds them back.**
- **Why:** UV (2026-10-11) — read what needs attention before the tools to act on it; Pavan moved the portal's down on 2026-10-14 and the difference is still open.
- **Applies to:** list pages.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` (2026-10-11); CP README Orders "Alerts"

**UX-141. One snooze set everywhere: 1 h · 2 h · 4 h · 8 h · Tomorrow, same time · Custom… (hours and minutes, no calendar).**
- **Why:** the Sales set was made the standard.
- **Applies to:** every AlertBanner.
- **Check:** review
- **Source:** `interactions/2-rules.md` §7a

**UX-142. A list gets an alert banner only for a time-critical condition on that list (Sales "N urgent orders overdue for dispatch"; Service urgent with no technician · needs approval · payment delayed). 3PL has none, on purpose.**
- **Why:** an alert nobody needs to act on now is noise; the 2026-10-07 parity pass left 3PL's out deliberately.
- **Applies to:** list pages.
- **Check:** review (G17)
- **Source:** G17; memory `project_3pl_guardrail_evals.md`, `feedback_banner_final.md`

**UX-143. The CP dashboard's "Attention required" tiles are a different pattern by design — not an AlertBanner and not a gap. Each tile's title is the action required; a tile opens a 600px action sheet, whose one act is "View order details".**
- **Why:** Pavan, 2026-10-15.
- **Applies to:** CP Dashboard.
- **Check:** review
- **Source:** `ui/2-rules.md` §10l; CP README Dashboard

**UX-144. Severity: amber = warning, red = error, neutral = info. Diagnostics are non-blocking by default (Confirm stays enabled); block only for hard-safety or destructive cases.**
- **Why:** the system knows the fact, the person decides.
- **Applies to:** diagnostic banners and bulk-edit warnings.
- **Check:** review
- **Source:** `interactions/2-rules.md` §3

---

## 13. Accessibility

**UX-145. Accessibility lives in the "Accessibility" item at the foot of the main navigation in every module (UV and CP). There is no header theme icon. Panel order: Theme · Text weight · Text size · Component width & space · Stroke contrast · Fill contrast · divider · Display size · Screen; Reset is the icon at its top.**
- **Why:** Pavan, 2026-10-21 — first theme modes, then "a lot more contrast" for external monitors, then one menu with sliders.
- **Applies to:** every module.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n; memory `feedback_wcag_modes.md`

**UX-146. Text size changes TEXT only. No box widens — nav, lanes, cards, sheets, table columns keep their width; text wraps onto the next line and the box grows taller. Record numbers and dates never break: their table column widens just enough. Text size and Display size are stepped sliders with − and +; Display size runs 50–150% with 100% in the middle, no Auto (2026-10-23).**
- **Why:** Pavan, 2026-10-21: "text size should increase text only".
- **Applies to:** every screen.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n

**UX-147. Neither color nor a letter is ever the only carrier: the label always says the state; a code disc has the full word as tooltip and `aria-label`; a file format tag carries its text.**
- **Why:** color-blind and screen-reader users must get the same fact.
- **Applies to:** statuses, discs, file icons, charts.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §8; `ux/2-rules.md` Documents

**UX-148. Contrast: the WCAG point (middle of each slider) gives text 7:1, controls and every rim/divider 3:1; Maximum goes past it. A new color token gets WCAG light and dark values, a pair in `wcag-contrast`, and a place in `a11y.ts`. Light/Dark's own known misses are reported, not changed.**
- **Why:** the contrast end must hold on mirrored or projected screens.
- **Applies to:** every color token.
- **Check:** wcag-contrast
- **Source:** `ui/2-rules.md` §10n; memory `feedback_wcag_modes.md`

**UX-149. The brand never moves: Contrast must not touch `--brand` (it recoloured the logo); orange TEXT uses `--fp-brand-ink`.**
- **Why:** Pavan, 2026-10-21 — identity stays fixed.
- **Applies to:** logo, brand buttons, orange text.
- **Check:** wcag-contrast
- **Source:** memory `feedback_wcag_modes.md`

**UX-150. Anything sized to the window uses `var(--fp-vw)` / `var(--fp-vh)`, never `100vw` / `100vh` / `h-screen`; a new fixed width that holds text is `calc(Npx*var(--fp-scale))`.**
- **Why:** a zoomed page multiplies viewport units; fixed text widths cut text at larger sizes.
- **Applies to:** sheets, panels, columns.
- **Check:** review
- **Source:** `ui/2-rules.md` §10n

**UX-151. No scroller shows a bar on either axis — except when a Display size leaves the window narrower than the 1280px layout: then the page scrolls sideways with a visible bar.**
- **Why:** one visible bar teaches that no bar means "doesn't scroll"; but every control must stay reachable when zoomed.
- **Applies to:** every scroll area.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §8; `ui/2-rules.md` §10n

---

## 14. Theming

**UX-152. Light is the default theme; Dark only when picked.**
- **Why:** Pavan, 2026-10-07 ("LIGHT BY DEFAULT"). Supersedes the constitution's "FP (dark) default" and `unified-view/3-interactions.md` §8.
- **Applies to:** UV and CP.
- **Check:** review
- **Source:** `prototypes/unified-view/index.html` comment (2026-10-07); memory `feedback_service_repos.md` (2026-10-07 sync)

**UX-153. Tokens, never raw hex. Prefer an existing token → a step on a ramp the DS uses → a value derived from two tokens → a new value with its reasoning written beside it. Never read colors or pixel values off screenshots; Figma only when Pavan asks.**
- **Why:** reading values off screenshots is what made earlier AI work hallucinate (2026-08-25).
- **Applies to:** every visual value.
- **Check:** tokens
- **Source:** memory `feedback_ds_sourcing_rule.md`; constitution

**UX-154. Brand orange says "you chose this" — selection, focus, the current step, the brand mark. Accent violet HIGHLIGHTS — schedule days, recommendations, CP attention. `--accent` is the gray hover, not the accent. The primary CTA is neutral `bg-primary`. One violet only.**
- **Why:** violet had been used ad hoc in two hues; Pavan wanted one accent used wherever it fits (2026-10-16).
- **Applies to:** every screen.
- **Check:** tokens
- **Source:** `ui/2-rules.md` §10c; memory `feedback_accent_violet.md`; constitution

**UX-155. Light mode stays exactly as it is; Dark uses the re-spaced ladder of 2026-10-21 (cards have rims again). Theme changes are made only with visible before/after for Pavan.**
- **Why:** a first try at three themes was rejected — "not working like desired", the changes were too subtle to see.
- **Applies to:** theme tokens.
- **Check:** wcag-contrast
- **Source:** memory `project_theme_lab.md`; `ui/2-rules.md` §10o

**UX-156. Segment controls and toggles are greyscale everywhere (no brand, no accent). Controls cast no shadow; only floating things (menus, popovers, dialogs, sheets, toasts) do.**
- **Why:** Pavan, 2026-10-14/16 — an accent trial on steps was "too much"; a control's border is its edge.
- **Applies to:** every control.
- **Check:** review
- **Source:** `ui/2-rules.md` "Surfaces & elevation"; memory `feedback_ui_rules.md`, `project_3pl_recurring.md` (trial reverted)

**UX-157. Icons are Lucide only. A new term icon follows the set's style (Lucide grid, 22% soft fill, a wavy level for liquids), and the same term draws the same icon everywhere.**
- **Why:** one icon language; one term, one picture.
- **Applies to:** every icon.
- **Check:** review
- **Source:** constitution; `ui/2-rules.md` Icons, §10k

---

## 15. Toasts

**UX-158. A toast's title is the act. A second line only warns of a consequence ("Paused R-1042 / 4 unfinished orders canceled.") — never one that repeats a value on screen or restates the obvious.**
- **Why:** Pavan chose this from three options on 2026-10-07; 22 second lines were removed that day.
- **Applies to:** every toast in every module.
- **Check:** parity-shell (G49)
- **Source:** memory `feedback_toasts.md`; `unified-view/3-interactions.md` §2

**UX-159. Every act announces itself with a toast; typing does not — the autosave earns the chip.**
- **Why:** a toast per pause is the app narrating typing.
- **Applies to:** every sheet and list act.
- **Check:** review
- **Source:** `unified-view/3-interactions.md` §2

**UX-160. Failure and error paths are not designed yet (today every toast is a success). A screen that needs an error state, error toast or validation failure path is a gap.**
- **Why:** no validation or failure paths exist anywhere; inventing one would be a new design.
- **Applies to:** every module.
- **Check:** review
- **Source:** memory `project_3pl.md` (Open); `service/PRD.md` §8 "Error states (none handled)"; `00-protocol.md`

---

**UX-161. One highlighted card per sheet.** The tinted SummaryCard marks the single most important read-out — the order or quote summary, or what needs attention — and nothing else wears it; every other rail card (trip, records, notes, activity, the order in short) is a plain RailCard. — *"The highlighted card should be only one… the one that is the most important in terms of seeing information."* (Pavan, 2026-10-26) · Check: eval `sheets` flags a file with two.

**UX-162. US English everywhere a user reads** (canceled, program, color, fulfillment, catalog, license…). — *"Let's go with US English."* (Pavan, 2026-10-23) · Check: eval `us-spelling`.

**UX-163. Reach for the closest pattern already in the product before any generic component** — partner tabs are the saved-views tabs, a read value with an edit is the pencil pattern. — *The vendor picker was first built as segmented tabs.* (Pavan, 2026-10-26)

**UX-164. A change is verified at every stage the screen appears in, with a blank and a filled row, in both themes; every miss is logged** (`evals/misses.json`) with its pattern and its guard. — *Most misses repeated one of nine patterns.* (Pavan, 2026-10-26) · Check: eval `misses`.

**UX-165. Icons never wear the accent.** Metric/figure icons, the AI sparkle and any decorative icon use the muted grey, quietly (status icons keep their status colour — green done, red failed) — a metric icon's line is the quiet icon ink (`text-fp-icon-quiet`, half the muted ink, a solid mix); the violet accent is for highlights (selected days, the current stage, recommendations' outline), never an icon's colour. — *"Everywhere else we have used accent color for icons should be replaced with the grayscale color."* (Pavan, 2026-10-26)

## Index

| Id | Rule |
|---|---|
| UX-1 | Every screen lives in the app shell: one global top bar (brand · global search · notifications + account), the left navigation, and one content layer |
| UX-2 | Navigation is ONE left panel (`ModuleSidebar`): modules as rows, the open module's pages under it, collapsible to an icon rail (remembered per browser) |
| UX-3 | Module order is 3PL · Sales · Service Work · Pricing · Lease; the open module moves to the top, unmarked |
| UX-4 | An area that has sub-pages stays a page row with its icon; its pages hang under it on tree bars; pressing the area opens its first page |
| UX-5 | Dashboard is the first nav item of a module that has one, but 3PL and Sales open on Orders |
| UX-6 | A module with no built screens shows the module-level empty state — never invented destinations |
| UX-7 | Profile and Settings are account destinations: they live in the account menu, never in the module navigation |
| UX-8 | Title (with list total) outside the data container; a scoped CTA sits with the data it acts on; one primary CTA per view |
| UX-9 | Header units only when their question is real: a breadcrumb only when nested two or more levels; tabs only for two or more facets of the SAME dataset (tabs are never n… |
| UX-10 | The zone order inside a list is fixed: view row (All · saved views · Export · create CTA) → search + Filters → chip shelf → the view bar → table / board / map → pagina… |
| UX-11 | A phone product gets its own shell and follows the five mobile rules: one thing per screen · the act pinned to the bottom, full width · nothing depends on hover · 44px… |
| UX-12 | Take only structure and behavior from a reference (Lovable, competitor screens) |
| UX-13 | Classify every screen by audience first: only the Customer Portal (CP) is customer-facing; 3PL, Sales, Service Work, Pricing and Lease are tenant-facing |
| UX-14 | Customer-specific behavior stays in the CP unless Pavan brings it to the tenant side — tank-level views for the customer, preferred windows, estimate notes, rule draf… |
| UX-15 | When a shared visual pattern changes in one module, apply it to the same column or control in EVERY module (3PL, Sales, Service, Portal) in the same change |
| UX-16 | The Unified View is the source of truth |
| UX-17 | 3PL is the design guardrail for lists, sheets and tables |
| UX-18 | Consistency is required WITHIN a module (same kind of table = same columns, order and widths) and against DS rules |
| UX-19 | Customer Portal givens: no account switcher; notifications are the top bar's bell (no page); a user allowed to create an order sends it straight to the tenant (no cust… |
| UX-20 | Every table page is the standard list (`StandardList`): view row, search + Filters, chip shelf, view bar, table, pagination |
| UX-21 | The first view tab is "All" — never "Default" |
| UX-22 | REMOVED 2026-10-21 — no preset view tabs (Transport, Tank Wagon, Packaged Goods, Lubes…) and no line-of-service segment (All · Fuel · Lubricants · Propane) in any module |
| UX-23 | A saved view stores the filters AND the display (table / board / map) AND the arrangement — column order and widths, column-search boxes, card fields, lane sort — and… |
| UX-24 | A list remembers where it was left for the session — filters, column search, search, sort, columns, date, active view and unsaved changes |
| UX-25 | One view → no view switch |
| UX-26 | Display icons are `Table2` · `KanbanSquare` · `Map`, the active one on the chip fill |
| UX-27 | A control belongs to the view it acts on: Search by column and Show/hide columns only in table view; Card fields only on the board; Group By off on the board |
| UX-28 | Every list carries the view bar ON the view (above the table header or the lanes): LEFT a statement ("62 orders · Thu, Oct 22, 2026"; board "62 orders across 9 of 9 la… |
| UX-29 | A paged list has pagination in three slots (Showing N–N of N · page numbers · page size) using `TablePagination`'s own sizes and copy |
| UX-30 | A list's total sits beside the page title and follows the filtered rows — never under the footer |
| UX-31 | Export means the rows you are looking at — filtered, searched, sorted, all pages — through `ExportSheet`, which shows the list's own date and Filters controls and ever… |
| UX-32 | The create CTA goes where creation actually happens |
| UX-33 | Date scope: a list whose record IS a day opens on one day; records that outlive a day open on a week (today ±3) |
| UX-34 | An empty list says its cause: nothing in this date window · nothing matches the narrowing · nothing here yet · the module has no screens — each with its one way out |
| UX-35 | The Filters panel is a facet panel: within a facet OR, across facets AND. Line of Service, Business and Order Kind are facets |
| UX-36 | What is on is said out loud: applied facets and the column-search chip on ONE shelf below the toolbar, as removable pills, with Clear all right after the last chip |
| UX-37 | Search matches the whole row; Search by column is a filter row under the header (one box per column, AND-ed) |
| UX-38 | One date picker everywhere — `src/components/ui/date-picker.tsx` — for filters and form fields in every module: presets rail, two months, typed start → end, live match… |
| UX-39 | Group By is offered only when it groups something — never a menu that groups nothing — and is off on the board |
| UX-40 | A quick-filter segment (at the head of the toolbar) is allowed only when the split is exhaustive and short, flipped several times a session, and divides the list into… |
| UX-41 | A table takes the full content width — no `max-w-*` cap on a page or section holding a table |
| UX-42 | Every column sorts: asc → desc → unsorted |
| UX-43 | Every table's columns move and resize (`TableColumnHeader` + `useTableColumns`); there is no enable flag |
| UX-44 | Columns are flat — no column groups unless Pavan asks |
| UX-45 | Column widths come from the widest RENDERED cell (text, "+N" chips, pills, day grids) + padding, never narrower than header + sort arrow, rounded up to 10px |
| UX-46 | Everything in a table is LEFT-aligned — headers and cells, numbers and money included |
| UX-47 | A sorted column is shown in grays: header a shade darker with a semibold full-ink label and an arrow; its cells a very light gray; unsorted columns a faint up-down mark |
| UX-48 | Every status column shows a pill coloured by kind — never coloured text alone |
| UX-49 | Pills only where chips already exist |
| UX-50 | A cell with more values than it shows wears "+N"; pressing the chip (or the figure, when the whole cell is the figure) opens the shared `BreakdownCard`, grouped as a s… |
| UX-51 | A missing value is printed: `–` when the field applies and nobody filled it, `N/A` when it does not apply, the word when it is a state ("Not scheduled"), and "Not pric… |
| UX-52 | Selection is opt-in: a list with nothing to do to a selection has no checkbox column |
| UX-53 | Columns that answer questions nobody asks first are hidden by default and live in the column menu |
| UX-54 | A row that holds a child dataset opens one layer down (chevron leading the first cell, never its own column; white layer; one green rail) |
| UX-55 | Tables in sheets are the boxed unit: in a card the table is flush (T1) with the add HANGING off the bottom-left corner — never a "last band" add; a standalone table dr… |
| UX-56 | Editable cells are the `TableCell*` controls filling the cell (`relative p-0`), never a bare form control; a read-only cell is plain text; a computed cell is never an… |
| UX-57 | A table always shows at least one row: an editable table a blank row (a record only once typed into — not checked, not saved before), a documents table an "Upload a do… |
| UX-58 | Booleans in a table are checkboxes, never switches |
| UX-59 | A row's delete is its own unnamed last column (52px), shown on row hover or focus, asking ✕/✓ in place (`TableRowRemove`), named for its subject ("Remove fee 2") |
| UX-60 | Last-row rule: a table the record cannot do without (products on an order, assets on a job) keeps no bin on its last row; a table that may be empty (fees, parts) lets… |
| UX-61 | Every reorderable row has a handle |
| UX-62 | A total is a `tfoot` row in the column it sums; it appears only once a row has real content; it excludes rows that state no value (Top off); down the table it is rows… |
| UX-63 | A column of checkboxes is NAMED for what the tick does ("Top off", "Include") — one tick, one meaning |
| UX-64 | Documents use one `DocumentsTable` everywhere — Document (format icon + name) · Added · By · download — with `FileTypeIcon` left of every file name and no Kind column |
| UX-65 | A hanging add's label is singular ("Add product") |
| UX-66 | A board exists only where there is a workflow: lanes are the lifecycle, in order |
| UX-67 | No card drags between lanes |
| UX-68 | A lane that is not a step of the work (Canceled, Blocked) sits apart behind a 3px rule; a lane that is a normal state of the work (waiting on a part) stays in sequence |
| UX-69 | A card is ruled units (stack · inline · rows) with no field labels inside a unit; a unit with nothing under it is removed, heading and all; the card's field set is per… |
| UX-70 | Only a card with something outstanding carries an alert |
| UX-71 | What a card leads with follows the stage: before the work — who it is for, what, when, who is taking it; after the work — "Completed on" (date and time) replaces the s… |
| UX-72 | Lane colors are an application binding: gray starts, red stops, green finishes, purple hands off — one table per application, one meaning per hue |
| UX-73 | A record opens in a side sheet and the sheet IS the form — create and edit are the same sheet (`mode`) |
| UX-74 | An existing record's sheet autosaves: the draft chip beside the title (nothing before the first change, then saving, then saved), no Save, no Update, no Cancel |
| UX-75 | A NEW record is created by its create act: nothing is saved before it, no save state shows, and closing with anything typed asks "Discard this order?" (Keep editing /… |
| UX-76 | The footer primary is the NEXT ACT on the record — one only, labeled as the act ("Move to Assigned", "Create Order"), never a state, never Save / Update / Confirm |
| UX-77 | What the primary is waiting on goes in the pending strip above the footer: one item at a time with a counter and chevrons, under the fixed word "Pending", each item an… |
| UX-78 | Acts ON the record — Cancel order, Duplicate order, Delete, Discard draft, Download tickets — live in the header ⋯ menu, never in the footer or the form |
| UX-79 | One act moves one thing |
| UX-80 | Sheet width follows the content: `form` 600 for fields · `fit` = the widest table's columns at `CELL` widths + 34 (+364 with the rail), min 600 · `data` 1200, fields t… |
| UX-81 | A sheet over a sheet is level 2: the gap twice (window − 112) and never wider than the sheet beneath less 56, so a strip of the one below always shows |
| UX-82 | A creation sheet has no right rail (Summary · Associated records · Activity) until the record exists |
| UX-83 | A two-column sheet puts what you can type into on the left, in filling order, and what the record has become on the right — a 340px read-only rail that stays put while… |
| UX-84 | Computed figures go in the shared Summary card (3PL "Quotation summary" shell); history in the shared Activity card (timeline) |
| UX-85 | The activity log records meaningful events only — who, when, how much, what stage, old → new |
| UX-86 | Audit history opens from an icon in the sheet header (activity · ⋯ · ✕) into its own drawer or level-2 sheet — never at the foot of the record body |
| UX-87 | A stepped create form is ONE vertical scroll: every step's section on the page, the compact `StageTrack` marks the section at the top of the view, pressing a step scro… |
| UX-88 | A live record's detail shows its stage as a `StageTrack` pinned at the top of the form column; the status chip beside the number then goes |
| UX-89 | A sheet section is a card (`SheetSection`) by default; sections sit 40px apart with the title 16px from its content |
| UX-90 | Derived values are read-outs, not disabled fields |
| UX-91 | A membership gate lives in the picker, whose empty state names the gate ("Nothing matches inside this partner's area") |
| UX-92 | A decision about the RECORD stays in the section it changes; a decision about the ACT of submitting (urgent, get a signature) rides in the footer aside |
| UX-93 | Empty card or form space uses the one `QuietPattern`. A sheet shows it automatically when its content takes half the visible height or less — never hand-placed in a sh… |
| UX-94 | Settings that change the flow say what happens in BOTH positions; a nested switch goes off with its parent; a setting that removes a step removes its UI; every setting… |
| UX-95 | Build only what was asked |
| UX-96 | No explanatory microcopy: no helper text under fields, no em-dash clauses on option labels, no sub-labels under switches, no "Note: …" |
| UX-97 | Every optional picker offers its empty choice first, named for what it means ("No asset", "No technician"); a required picker has none |
| UX-98 | A row of fields fills its row: equal `1fr` / `flex-1` shares, 24px apart (16 in a dense grid), the last field ending at the container's padding |
| UX-99 | Any input that repeats (lines, charges, rates, assets, contacts) is an editable TABLE by default; every cell editable in place; a qualifying unit ($/gal · $ · %, curre… |
| UX-100 | A unit is not a yes/no |
| UX-101 | Same data, same control: before building any field, table or column, find where the same data already lives in a built module and reuse its control, columns, order and… |
| UX-102 | Every delivery-window field is `DeliveryWindowTimeline` (label outside, outlined box, preferred-time bars) — never the old `TimeWindowSlider`. Sales orders have no win… |
| UX-103 | Every dropdown searches, short lists included; "none" options ("— Unassigned", "Not set") are real options; a value used on another row shows ticked and unselectable,… |
| UX-104 | Sample pick lists never come up empty — 3 to 10 options wherever a choice is made |
| UX-105 | A toggle is a statement and an answer: label left, switch hard right against the container edge, full width — never stacked like an input |
| UX-106 | Typed text starts with a capital (soft keyboard sentences; first character normalised on blur — never email, URL, password, phone, number, money, date or a chosen value) |
| UX-107 | Use each module's locked status words. 3PL: lanes Orders (holds Draft + Awaiting Quotation) · Quoting · Assigned · Completed · Review · Verified · Synced ┃ Canceled ·… |
| UX-108 | Accounting states are set by accounting, not pressed. 3PL: Review is an optional reversible hold; Verified is the sync-ready queue; only accounting marks Synced; Parti… |
| UX-109 | Sales stages are Requested · Scheduled · Dispatched · Delivered · Canceled (kinds caution · info · info · success · neutral) |
| UX-110 | Customer Portal orders (2026-10-21): no request number — the order the customer creates (ORD-…, with its planned date) IS the order the tenant works; no request↔order… |
| UX-111 | A change or cancellation request is NOT a status or a lane: the order keeps Unassigned/Scheduled and shows an "Awaiting confirmation" / "Awaiting cancellation" pill (p… |
| UX-112 | Status color is by KIND — caution (waiting on somebody), info (simply true), success (done), critical (a warning), neutral (neither) |
| UX-113 | Red means only a warning — Urgent, Late, Overdue, Unpaid, Blocked, Over SLA. A type, a category, a lane that is a place, or Canceled is never red; a categorical colou… |
| UX-114 | Every lines table ends Top off · Qty: Asset · Product · (readings, accounts…) · Top off · Qty LAST · bin |
| UX-115 | In ANY table that adds rows, the picker that names the row takes several at once: checkboxes + Apply; the first pick fills the row, each other becomes its own row unde… |
| UX-116 | Field reach: a field added to a record goes onto EVERY screen that creates, edits or lists that record — sheets, inline create tables, lists, nested breakdowns — in th… |
| UX-117 | On a new CP order Top off is never pre-ticked (any entry point); Qty starts empty; the suggested quantity is the Qty placeholder, and there is no Suggested column |
| UX-118 | Capacity is always ONE asset's (how much it holds) — never summed per ship-to or product |
| UX-119 | The repeat act is "Duplicate order" — never "Reorder" — and lives in ⋯ |
| UX-120 | 3PL creation: Create Order needs customer + ship-to and a product line; the Vendor section shows on the create sheet too and its picks and sends carry into the created… |
| UX-121 | Service Work words: quote answers are Approved · Approved on the customer's behalf · Rejected — never "skip"; a rejected quote stays open with a revision banner |
| UX-122 | Do not suggest, ask about or build tank-monitor-driven features (level-triggered rules, "order when below X%") |
| UX-123 | Every order that can repeat uses `RecurringOrderSection`: an optional section like Load Order — a dashed "Add Recurring Order", then the frequency picker in a box; the… |
| UX-124 | One frequency picker (`RuleFrequencyPicker`) in all modules: Days \| Date as a greyscale segment; Daily and Custom cycle as label-then-switch; the Date basis is "Select… |
| UX-125 | Violet highlights a schedule: picked days, dates and months in every frequency picker AND the lit days in every schedule shown in a list (`ScheduleCell`) — the form an… |
| UX-126 | A schedule in a list is a shape, not a sentence: seven day letters (lit / faint, unlit days keep their slot) with how often on the line under; a pattern that is not a… |
| UX-127 | 3PL Recurring works on V1.1 only (V1 and V2 are archived) |
| UX-128 | Create rule is three sections on ONE scroll — Rule and frequency · Partners and products · Ship-tos and assets — with the compact track following the scroll, no gating… |
| UX-129 | A clash between rules at one ship-to exists only on a day both run AND they fill the same asset or their delivery windows overlap — the same product into a different t… |
| UX-130 | Recommendations are RULE-level (a frequency + every ship-to it fits); the act is "Review and Create Rule", which fills the form |
| UX-131 | CP Recurring Orders lists the customer's RULES (one ship-to per rule) |
| UX-132 | Dashboards are built from `DashboardParts`, and every tile, bar and row drills to the list narrowed to exactly what it counts (or opens the record) |
| UX-133 | Charts: a count over stages or time is one series in slot-1 blue with the peak lit; a share of a whole is a segmented bar in the palette's fixed order with a coloured… |
| UX-134 | Every figure card and dashboard unit uses `MetricIcon` beside the figure (centred on figure + chip + "vs" line) with one icon per term from `TERM_ICONS` (deliveries tr… |
| UX-135 | Cards in one row are the same height; a chart in each fills its card (x-axis on the card's foot); figure rows share a height |
| UX-136 | No explainer lines on a dashboard: a headline figure opens its explanation on click; a chart's explainer is an ⓘ beside its title; a limit is drawn as a line, not capt… |
| UX-137 | The CP dashboard (after the Anirudh review, 2026-10-19): Attention required → Schedule (next 7 days) → Tank levels → Spend → Billing & credit |
| UX-138 | Two banners, chosen by one question — does pressing it do something to the page? B1 (`BannerCallout` / `BannerInline`) says one thing with at most one action or ✕. B2… |
| UX-139 | AlertBanner, filter alerts (standard since 2026-10-15): tag pill with its icon and the count inside · plain title · muted detail · ghost "View details" that applies th… |
| UX-140 | Banner under the toolbar, right above the list, in every module; always info blue, pills carry severity; View all stacks every alert, Collapse folds back |
| UX-141 | One snooze set everywhere: 1 h · 2 h · 4 h · 8 h · Tomorrow, same time · Custom… (hours and minutes, no calendar) |
| UX-142 | A list gets an alert banner only for a time-critical condition on that list (Sales "N urgent orders overdue for dispatch"; Service urgent with no technician · needs ap… |
| UX-143 | The CP dashboard's "Attention required" tiles are a different pattern by design — not an AlertBanner and not a gap |
| UX-144 | Severity: amber = warning, red = error, neutral = info |
| UX-145 | Accessibility lives in the "Accessibility" item at the foot of the main navigation in every module (UV and CP) |
| UX-146 | Text size changes TEXT only |
| UX-147 | Neither color nor a letter is ever the only carrier: the label always says the state; a code disc has the full word as tooltip and `aria-label`; a file format tag car… |
| UX-148 | Contrast: the WCAG point (middle of each slider) gives text 7:1, controls and every rim/divider 3:1; Maximum goes past it |
| UX-149 | The brand never moves: Contrast must not touch `--brand` (it recoloured the logo); orange TEXT uses `--fp-brand-ink` |
| UX-150 | Anything sized to the window uses `var(--fp-vw)` / `var(--fp-vh)`, never `100vw` / `100vh` / `h-screen`; a new fixed width that holds text is `calc(Npx*var(--fp-scale))` |
| UX-151 | No scroller shows a bar on either axis — except when a Display size leaves the window narrower than the 1280px layout: then the page scrolls sideways with a visible bar |
| UX-152 | Light is the default theme; Dark only when picked |
| UX-153 | Tokens, never raw hex |
| UX-154 | Brand orange says "you chose this" — selection, focus, the current step, the brand mark |
| UX-155 | Light mode stays exactly as it is; Dark uses the re-spaced ladder of 2026-10-21 (cards have rims again) |
| UX-156 | Segment controls and toggles are greyscale everywhere (no brand, no accent) |
| UX-157 | Icons are Lucide only |
| UX-158 | A toast's title is the act |
| UX-159 | Every act announces itself with a toast; typing does not — the autosave earns the chip |
| UX-160 | Failure and error paths are not designed yet (today every toast is a success) |
| UX-161 | One highlighted card per sheet — the most important read-out; the rest are plain RailCards |
| UX-162 | US English everywhere a user reads |
| UX-163 | Closest existing pattern before any generic component |
| UX-164 | Verify every stage, blank + filled row, both themes; log every miss |
| UX-165 | Icons never wear the violet accent (decorative icons grey; status icons keep status colour); the accent is for highlights only |
