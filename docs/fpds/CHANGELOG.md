# Changelog

Every published version of the FleetPanda Design System (FPDS), newest first. The line-by-line history is the GitHub repo `pavanshetty-fp/FP-DS-2026`, branch `main`; each version names the commit it was built from.

## v1.13 — 2026-11-13

Built from commit `e8d2ce4`.

- **Archive** is a new menu item. It holds the module pages whose records Master Data now holds: 3PL directory, Sales customers and Sales assets. Master Data stays its own menu item (IX-101).
- **No Archive action** on any record any more. It had been added without being asked.
- **Activity log is always on the right**, as on the 3PL delivery order, in every module, including the Directory and Customer Portal sheets that had it as a clock icon. The right column now scrolls all the way to its last card, and Activity alone fills the column top to bottom (IX-100).
- **Modal** is as wide as its content (756–1200px), 24px from the top and bottom. **Full page** keeps its content in a centred column of the same width.
- **Settings → Information page view** (was Detail page view) shows a small looping wireframe of how a record opens: side sheet, modal or full page (IX-102).
- **3PL Orders lane:** Invitations is a plain card reading "Vendor invites · Pending" until vendors are invited.

## v1.12 — 2026-11-13

Built from commit `192a083`.

- **Every list now has the 3PL Delivery Orders head:** Table, Board and Map are tabs on the views row (in place of "All"); the Settings gear and the collapse chevron sit at the end of the search row; the chevron folds the page title and the views row. Sales, Service Work, 3PL Recurring and Directory, Master Data and the Customer Portal (IX-98).
- **Full page detail view** no longer runs end to end: the content sits in a centred column as wide as the sheet's content, between 756px and 1200px (IX-99).

## v1.11 — 2026-11-12

Built from commit `d0c18ef`.

- **Export sheet:** the count large, with calendar and filter icons beside it that open the page's own pop-ups. Below it sit headed sections with no dividers: Overview, Gallons by product, By status and Orders. 3PL Delivery Orders and Sales Orders show this summary. Applied filters show only when some are on.
- **Detail page view** lives only in the Settings gear. The ··· menu entry is gone from every sheet. Every list has the gear and the header "Search by column" tab.
- **Tables that run off to the right** now show a thin scrollbar under them: drag it, or click the track (IX-97).
- **List view is removed** from 3PL, Sales and Service Work (archived).
- **Order lines:** Qty and Top off now come right after Product on the 3PL delivery order, the Customer Portal order and the 3PL recurring create. Top off is only as wide as its header, and "gal" sits right after the quantity.
- **Delivery window timeline:** every hour is labelled, from 12a to 12a.

## v1.10 — 2026-11-10

Built from commit `de2cadb`.

- **Fixed:** on 3PL Delivery Orders the top of Create Order and the ends of the views row's line were cut off by the collapse-header fold. They are whole again.
- **New clip check** (`scripts/eval/clip-check.browser.js`): it finds anything a clipping box cuts and now runs on every page before work is reported and on every push.

## v1.9 — 2026-11-10

Built from commit `e351d83`.

- **Settings sheet:** no "Show all" on the Board or Table tab. On 3PL Delivery Orders every column and every card field now starts shown, and you switch off what you don't want.

## v1.8 — 2026-11-10

Built from commit `3cade40`.

- **Settings sheet tabs** now sit on a full-width line, and the content starts 16px below it (was 40px). The Tabs spec gains rule 3: line tabs plus their content are one unit.

## v1.7 — 2026-11-10

Built from commit `0a094cb`.

- **Settings gear** is now an outlined button, set apart from the date by a thin divider (IX-96).
- **Collapse header:** a chevron beside the gear folds away the page title and views rows so the board or table gets the room. It shows in every view, and the header comes back when you leave the page.

## v1.6 — 2026-11-10

Built from commit `c642441`.

- **Dark theme swimlanes are clearly visible.** The lane is a step lighter than the board, and the cards are darker inside it. A hovered lane now goes a shade lighter instead of fading into the board.

## v1.5 — 2026-11-10

Built from commit `6be4369`.

- **Board cards are back to their full width** in every module. The 20% narrower card from v1.4 is reverted.

## v1.4 — 2026-11-10

Built from commit `342b4cb`.

- **Board cards are 20% narrower** in every module. The lane padding stays at 8px, and about six lanes now fit on a 1440px screen.

## v1.3 — 2026-11-10

Built from commit `f7f8c14`.

- **Cursors:** the hand cursor now means "this takes you somewhere": links, link-styled text, and cards, rows and tiles that open a record. Buttons, tabs, toggles and their labels, stage steps and tick-to-select rows keep the normal arrow (IX-95, with a check).

## v1.2 — 2026-11-10

Built from commit `fd5892f`.

- **Board lanes:** an even 8px inside every lane (top, header to cards, sides and bottom), and the lane tray a little darker. This applies in every module and to the list view's lane.

## v1.1 — 2026-11-08

Built from commit `6ee1977`.

- **3PL Delivery Orders uses Version 2 only.** The displays are tabs on the views row. Version 1 is archived as "Version 1: Separate Views".
- **Settings:** one gear beside the view tabs opens a narrow sheet with three tabs: Table (columns), Board (card fields) and Detail page view (IX-93).
- **Search by column** now lives in the table header. A darker grey tab slides in at the right edge when you hover the header row (IX-94).

## v1.0 — 2026-11-08

First version on DocsHub. Built from commit `dc67c48`.

- **Detail page view:** every detail page's ··· menu starts with "Detail page view": open detail pages as Side sheet (default), Modal or Full page. One choice for all modules (IX-92).
- **View motion:** the table settles up a few pixels as it arrives, list and map slide in from the left, and the map zooms in from 80%. The board still arrives from the right.
- **List view:** the cards sit in a lane like the board's, then a gap, then the record.
- **Master Data:** Customers, Ship-tos, Products, Vendors, Terminals and Suppliers pages, each with its 360 sheet.

## Before v1.0 — highlights

### 2026-11-03
- Master Data module with Assets and Asset 360: the journey timeline, a log of type tiles over a table, and details as one card per subject.
- Full table units inside sheets. A new check flags repeated wording.

### 2026-11-02
- One board in every module; the other board versions are archived.
- Banners sit above the toolbar everywhere.
- The add button sits on the saved-views row, and the view tools sit beside the view switch.
- Lanes collapse.

### 2026-10-27 – 10-29
- Geist is the only font.
- The 3PL board no longer has a Quoting lane (archived).
- New order types and the driver unit.
- POC details card. A tick column in every picker.
- The list view's rail is narrower (296px).

### 2026-10-20 – 10-26
- Accessibility panel in the main navigation: light/dark, text size, screen size, contrast.
- The misses log became a check.
- One highlighted card per sheet.
- The shared delivery timeline and recurring section are used in every module.
- Top off comes before Qty in every lines table.
