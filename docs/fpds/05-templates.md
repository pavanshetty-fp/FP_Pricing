# FPDS — Templates

A template is a whole page or sheet: which units sit where, in what order, and what the
page as a whole does. Pick one in step **L2** of `00-protocol.md`; every region inside
it is a unit from `units/`. Each template names a **reference page** — the real screen
to copy when in doubt.

---

## List page

`id: template.list-page` · `layer: template` · `code: prototypes/unified-view/threepl/BrokerOrdersScreen.tsx, prototypes/unified-view/StandardList.tsx` · `registry: fpds-list-page`

### Purpose
Show many records of one kind, let the reader narrow, sort, group, save the narrowing as
a view, switch between table, board and map, open a record and act on many at once.

### Use when / Don't use when
- Use when the job is "find / scan / work through records of one kind" — orders, quotes,
  customers, vendors, parts, invoices, agreements, technicians…
- Use the **table-only** variant (`StandardList`) when the records have no lifecycle
  lanes or places (reference lists: Price Book, Parts, Invoices, Team & Access).
- Don't use for a single record (→ Record sheet) or for figures over time (→ Dashboard).

### Anatomy
Top to bottom, always in this order:
1. **Page title** (`h1`) — the page's nav name.
2. **View row** (`unit.view-row`) — All · saved views · + View … Create · Export.
3. **Toolbar** (`unit.toolbar`) — search · Filters · Group by (where grouping exists) …
   date control (date-scoped lists) · display switch (Table / Board / Map).
4. **Chip shelf** (`unit.chip-shelf`) — only while something narrows the list.
5. **Alert banner** (`unit.alert-banner`) — only while something needs attention.
6. **The view**, with its **View bar** (`unit.view-bar`) on top:
   table (`unit.data-table`) · board (`unit.board`) · map (`unit.map`).
7. **Pagination** (`unit.pagination`) — tables only; boards state their total in the view bar.
8. **Bulk bar** (`unit.bulk-bar`) — floats in while rows are selected.

### Look
Content layer white (`bg-fp-surface-1b`) on the app ground; 16px page inset; units
stacked with 12–16px between them; the view takes the remaining height and scrolls inside
itself — the page itself never scrolls.

### States
default · narrowed (chips shown) · empty (no records on the date / no match — the
Empty state names why and offers the way out) · loading (skeleton rows/cards) ·
selecting (bulk bar) · saved view active (its tab underlined; the update icon when changed).

### Interactions
| Trigger | Result |
|---|---|
| Type in search | List narrows as you type; page resets to 1 |
| Filters → tick → Apply | List narrows; chips appear; Recent history records the set |
| Display switch | Same records, other view; the view's own tools move into the view bar |
| Row / card press | The record opens in its Record sheet |
| + View → Save | The current filters, sort, columns and display become a named tab |
| Export | Export sheet with the current narrowing listed |

### Outcomes
A narrowed list; a saved view; an opened record; an export; a bulk change with a
one-line toast; an empty state that says why and how to undo it.

### Data contract
Records; columns (key, label, width from content); facets; what each column prints
(search and column boxes match it); sort values; the date window (if date-scoped);
lanes (if it has a board); places (if it has a map).

### Rules
1. **The order of the regions never changes** — *every list reads the same way, so a
   user who learnt one has learnt them all* (UX rules, Lists & views).
2. **No preset view tabs; All comes first** — *views are the user's, not the product's*
   (Pavan, 2026-10-21).
3. **A saved view stores its display** — *a board view opens as a board* (2026-10-21).
4. **The table always fills, everything left-aligned** — (DS ui §10p, 2026-10-22).

### Do / Don't
- ✅ Copy the reference page's spacing and order exactly.
- ❌ Don't add a second toolbar row, a tab strip of presets, or filters outside the panel.

### Checks
`parity-lists`, `parity-tables`, `fpds-units`, `table-rows`, `tokens`.

### Reference
3PL › Delivery Orders (table, board, map) · Sales › Orders · Service Work › Service Orders ·
Customer Portal › Orders · table-only: Service Work › Parts, Customer Portal › Invoices.

---

## Record sheet

`id: template.record-sheet` · `layer: template` · `code: prototypes/unified-view/RecordSheet.tsx, prototypes/unified-view/threepl/BrokerOrderSheet.tsx` · `registry: fpds-record-sheet-page`

### Purpose
Create, edit or read ONE record in a side sheet over its list, without leaving the list.

### Use when / Don't use when
- Use for every create and every edit — orders, quotes, customers, assets, service
  orders, rules, users — even for a record the product has never had before.
- Don't use for a dashboard drill (→ List page narrowed) or a bulk change (→ Bulk edit).

### Anatomy
1. **Header** — title (`Order #: …` / `Create …`), status or draft chip, record pills,
   ⋯ menu, close.
2. **Body** — sections in a fixed order (who/where → what → when → documents → notes),
   each a titled section; tables for anything repeated (`unit.lines-table`,
   `unit.documents-table`); the delivery timeline and recurring section where the
   record has a window or repeats.
3. **Rail** (340px, right) — `unit.summary-rail`: the summary card and the activity card.
4. **Footer** — pending strip (what is still missing), Save as draft, the primary act.

### Look
Width from its widest table (`fit`), else `form`; never wider than the window less 56px;
a sheet over a sheet takes the gap twice. Fields fill their row (24px gap).

### States
create · draft (autosaving) · sent/locked (read-only) · with an ask awaiting the other
side · loading · error on submit (pending strip names the missing fields).

### Interactions
| Trigger | Result |
|---|---|
| Edit a field | Autosaves; the draft chip says so |
| Press the primary act with fields missing | The pending strip opens and names them; nothing is lost |
| ⋯ menu | Duplicate / order again, request change, cancel — whichever the record allows |
| Close | Closes; a new untouched draft is discarded, a touched one stays a draft |

### Outcomes
A record created or updated (one-line toast), a draft kept, an ask sent, a cancel.

### Data contract
The record; its sections; which tables it carries (`fit`); what is required; the acts
its status allows.

### Rules
1. **Every record sheet carries the summary card and the activity card** — *one shape
   for every record* (shared sheet cards, Pavan).
2. **Repeated inputs are a table, units inside the cell** — (table by default).
3. **A new field appears on every create, edit and list screen of that record** — (field reach).
4. **Lines tables end with Top off, then Qty** — (top off then qty).

### Do / Don't
- ✅ Open over the list it came from.
- ❌ Don't build a full-page form, a modal form, or a stepper outside the sheet.

### Checks
`sheets`, `parity-sheets`, `field-reach`, `fields-fill`, `boxed-tables`, `fpds-units`.

### Reference
3PL › Create Delivery Order · Service Work › Service order · Customer Portal › Order.

---

## Directory record

`id: template.directory-record` · `layer: template` · `code: prototypes/unified-view/threepl/DirectoryRecordSheet.tsx, prototypes/unified-view/threepl/CustomerRecord.tsx` · `registry: fpds-directory-record`

### Purpose
Read and keep one master-data record — a customer, vendor, product or rental asset —
with its properties, related records and activity.

### Use when / Don't use when
- Use for master data (customers, vendors, products, assets, ship-tos).
- Don't use for transactional records like orders (→ Record sheet).

### Anatomy
Header with name and status; property sections; related records (orders, ship-tos,
assets) as tables; the summary and activity cards in the rail.

### Look
As the Record sheet.

### States
read · editing a section · inactive record.

### Interactions
| Trigger | Result |
|---|---|
| Edit a section | Autosaves |
| Press a related record | Opens that record's sheet over this one (level 2) |

### Outcomes
An updated master record; navigation to a related record.

### Data contract
The record, its sections, its related lists.

### Rules
1. **Related records open over, not instead** — *the record you came from stays in reach.*

### Do / Don't
- ✅ Reuse the Record sheet's header, rail and sections.
- ❌ Don't add charts or metric widgets (V1 decision, call 2026-10-22).

### Checks
`sheets`, `parity-sheets`, `fpds-units`.

### Reference
3PL › Directory › Customers / Vendors / Products / Rental Assets.

---

## Dashboard

`id: template.dashboard` · `layer: template` · `code: prototypes/unified-view/threepl/ThreePLDashboard.tsx, prototypes/unified-view/DashboardParts.tsx, prototypes/customer-portal/DashboardScreen.tsx` · `registry: fpds-dashboard-page`

### Purpose
Answer "how are we doing today, and what needs me" for one module, and send the reader
to the records behind every number.

### Use when / Don't use when
- Use for a module's landing figures.
- Don't use for one record's figures (→ Directory record) or for analytics (later phase).

### Anatomy
Date control top right; a row of stat tiles (`unit.dashboard`); "Attention required"
(`unit.alert-banner` / action tiles); cards with tables or charts below.

### Look
White cards on the dashboard ground; metric icon tiles; trend chips in the DS colors.

### States
today · another date · nothing needing attention (the section says so).

### Interactions
| Trigger | Result |
|---|---|
| Press a tile, a bar, a row | The list behind it opens, already narrowed (drill-through) |

### Outcomes
A narrowed list; an action sheet for the item that needs attention.

### Data contract
Figures with their previous period; the drill (list + narrowing) behind each.

### Rules
1. **Every number opens the records behind it** — *a number you can't check is not trusted.*

### Do / Don't
- ✅ Use MetricIcon tiles and trend chips.
- ❌ Don't add custom chart colors.

### Checks
`tokens`, `wcag-contrast`, `fpds-units`.

### Reference
3PL › Dashboard · Sales › Dashboard · Customer Portal › Dashboard.

---

## Settings page

`id: template.settings` · `layer: template` · `code: prototypes/unified-view/SettingsPage.tsx, prototypes/unified-view/SalesSettingsScreen.tsx` · `registry: fpds-settings`

### Purpose
Set how a module behaves for the whole tenant.

### Use when / Don't use when
- Use for module-wide configuration.
- Don't use for personal preferences (→ Accessibility panel) or one record (→ Record sheet).

### Anatomy
Section list; each section a titled group of fields or an editable table.

### Look
As record-sheet sections, full page width.

### States
default · edited (autosaved).

### Interactions
| Trigger | Result |
|---|---|
| Change a setting | Autosaves; one-line toast where the change has a consequence |

### Outcomes
A changed setting.

### Data contract
The settings and their allowed values.

### Rules
1. **Settings autosave** — *there is no "Save settings" to forget.*

### Do / Don't
- ✅ Use editable tables for repeated settings.
- ❌ Don't hide settings behind modals.

### Checks
`fields-fill`, `boxed-tables`, `fpds-units`.

### Reference
Sales › Sales Settings · Service Work › Service Settings.

---

## App frame

`id: template.app-frame` · `layer: template` · `code: prototypes/unified-view/UnifiedView.tsx, prototypes/customer-portal/CustomerPortal.tsx` · `registry: fpds-app-frame`

### Purpose
The frame every page sits in: top bar, navigation, content layer.

### Use when / Don't use when
- Use for every page.
- Don't build a page without it.

### Anatomy
Top bar (logo, global search, notifications, profile) · navigation (`unit.app-shell`:
module, pages, Accessibility at the foot) · the content layer.

### Look
App ground behind; the content layer is the white rounded panel; one-panel sidebar.

### States
module loading (skeleton) · collapsed navigation.

### Interactions
| Trigger | Result |
|---|---|
| Choose a module or page | The content layer changes; the list keeps where it was left |
| Accessibility | The panel opens pinned at the navigation's foot |

### Outcomes
Navigation; personal display settings.

### Data contract
Modules and their pages.

### Rules
1. **The navigation order and the shell are locked** — *people find things by place.*

### Do / Don't
- ✅ Keep Accessibility at the foot of the navigation.
- ❌ Don't add a second navigation level outside the sidebar.

### Checks
`parity-shell`, `fpds-units`.

### Reference
Unified View (any page) · Customer Portal (any page).
