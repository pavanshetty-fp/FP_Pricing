# Documents table

`id: unit.documents-table` · `layer: unit` · `code: prototypes/unified-view/DocumentsTable.tsx, src/components/ui/file-type-icon.tsx` · `registry: fpds-documents-table`

## Purpose
The one table for files kept on a record — BOLs, tickets, invoices, dispute evidence. It answers "what files does this record have, when did they arrive, who added them?" and, where allowed, lets the reader add one.

## Use when / Don't use when
- Use when any record keeps files (order, invoice dispute, order request).
- Don't use a gallery, a card grid or an empty-state panel for documents.
- Don't use it for lines or other editable rows — use `unit.lines-table` / the boxed table.

## Anatomy
1. **Section** — `SheetSection title="Documents" flush`; where the reader can add, a `HangingAdd` "Add document" off the bottom-left corner and a hidden multi-file input.
2. **Header row** — Document · Added · By · (blank download column).
3. **Rows** — Document cell: `FileTypeIcon` (format tag) then the name · Added (formatted date) · By · download icon button.
4. **Empty row** (always one row) — with upload: "Upload a document" (upload icon) · — · —; without upload: one cell with the caller's words.

## Look
- `table w-full table-fixed text-sm`; columns: Document takes the rest · Added 18% · By 20% · download `w-12`.
- Header: `border-b border-border bg-fp-table-header`, cells `px-3 py-2 text-left text-xs font-medium text-muted-foreground`.
- Rows `h-12`, `border-b border-border`, last without border; cells `px-3`. Name `text-foreground` truncated with full name as title; Added / By `text-muted-foreground`.
- Icon + name gap 2.5. Download: ghost `icon-sm` button, `text-muted-foreground`.
- Upload row: `cursor-pointer`, hover `bg-fp-row-hover`; label `text-muted-foreground` → `text-foreground` on hover; focus ring `ring-ring/50`.
- `FileTypeIcon`: document outline with a format tag (PDF, PNG, SVG, JPG, DOC, XLS, CSV…); tag color by family — PDF red · images violet · documents blue · sheets green · archives orange · other ink; the text carries the format so color is never the only cue.
- All left-aligned.

## States
- **empty, can upload** — one "Upload a document" row; the whole row is pressable.
- **empty, read-only** — one row stating what will arrive (3PL: "Nothing yet. A BOL arrives when the order is assigned; the ticket and the invoice follow the delivery.") or the default "No documents yet."
- **filled** — one row per file.
- **hover (upload row)** — row hover fill, label darkens.
- **focus** — ring on the upload button and download buttons.

## Interactions
| Trigger | Result |
|---|---|
| Press anywhere on the "Upload a document" row | Opens the file picker |
| Press "Add document" (hanging add) | Opens the file picker |
| Pick one file | Row added; toast "<name> added" (Customer Portal Invoices) / "Document added · <name>" (Customer Portal Orders) |
| Pick several files | One row each; toast "N documents added" |
| Cancel the picker / pick nothing | Nothing changes |
| Press the download icon | `onDownload(row)`; Customer Portal toast "<name> downloaded" |
| Hover a long name | Full name in the native title |

## Outcomes
- Files added to the record (and its activity, where the caller logs it).
- A file downloaded.
- Nothing, when the picker is canceled.
- The section never changes shape when the first file lands.

## Data contract
- `rows: { id, kind, name, added (already formatted), by }[]` — `kind` is carried but not shown.
- `onAdd?()` — given, the empty row is the upload slot.
- `emptyText?` — the empty row's words when there is no upload (default "No documents yet.").
- `onDownload?(row)`.

## Rules
1. **Always a table, never empty of rows** — empty with upload = the upload row; read-only = says what will arrive — *the section must not change shape when the first file lands; a table with columns says what a document is made of* — `(source: docs/ds/ux/2-rules.md "Tables — one row is always there", Pavan 2026-10-14)`.
2. **Every file name has its format icon on the left** — *the format is read at a glance; text in the tag means color is never the only cue* — `(source: ux/2-rules "Documents — the format icon beside every file", Pavan 2026-10-14)`.
3. **No Kind column** — *the format icon says what it is* — `(source: DocumentsTable.tsx; ux/2-rules, Pavan 2026-10-14)`.
4. **One shared documents table everywhere; the 3PL anatomy is the source of truth** — `(source: DocumentsTable.tsx; feedback_table_conventions 2026-10-14; feedback_uv_source_of_truth)`.
5. **Everything left-aligned; only the row action sits at the end** — `(source: ui/2-rules §10p; feedback_column_widths)`.
6. **A sheet holding it passes `fit`** — `(source: ui/7-variants §1; eval sheets)`.
7. **A toast is one line** — `(source: feedback_toasts; unified-view/3-interactions §2)`.

## Do / Don't
- ✅ Put it in a flush `SheetSection` titled "Documents".
- ✅ Give the empty row an upload where the reader may add; otherwise say what will arrive.
- ✅ Accept several files in one pick.
- ❌ A "No documents" panel or dashed box in place of the table.
- ❌ A Kind / Type column.
- ❌ A file name without its `FileTypeIcon`.

## Checks
- `sheets` — a sheet with `DocumentsTable` must pass `fit`.
- `boxed-tables`, `tokens`, `wcag-contrast`.
- By eye: one row is always present; icons left of every name; columns left-aligned.

## Reference
- 3PL › Delivery Orders — order sheet, Documents section, read-only (`threepl/BrokerOrderSheet.tsx`).
- Customer Portal › Orders — order sheet, Documents with upload, open in every status (`customer-portal/OrderRequestSheet.tsx`).
- Customer Portal › Invoices — dispute Documents (`customer-portal/InvoiceSheet.tsx`).
