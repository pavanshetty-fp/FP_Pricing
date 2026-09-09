# Interactions · Do's & don'ts

Quick pointers into [`2-rules.md`](2-rules.md). One line each.

## Do
- **Give every action visible feedback** (toast / inline error / state change).
- **Guard destructive actions** (52px confirm or `AlertDialog`).
- **Show a visible focus ring** on every interactive element.
- **Keep hover subtle** — `bg-accent`, full-cell for table cells.
- **Give icon-only buttons an `aria-label`.**
- **Design every state** — resting / hover / focus / active / disabled / loading / empty.
- **Disable chart mount animation** and resolve tokens to hex for Recharts.
- **Put a table's total in a `<tfoot>` row**, in the column it sums (T1).
- **Keep "+ Add" attached to the table's squared bottom-left corner**, below the
  total — rows → total → add (T4).
- **Name a checkbox column** when the tick does one specific thing (T5).
- **Set helper text 4px under its control** (§2b).
- **Open a directory record in a side sheet, and let the sheet be the form** (§1).
- **Size a sheet by its content** — `wide` the moment it carries a table (§1).
- **Put a toggle's label left and its switch hard right**, helper under the label (§1).
- **Use a creatable combobox for a set that is known but not closed** (§1).
- **Let a field start with a capital** — `autoCapitalize` plus a first-character
  fix on blur (§1).
- **Render a stored enum in sentence case**, leaving the value alone (§1).
- **Keep `TablePagination`'s own page sizes and footer copy** (§4c).
- **Put a list's total beside the page title**, following the filtered rows (§4c).
- **Show active filters as chips with a Clear all** (§4c).
- **Write three empty states** — nothing yet / no search match / no filter match (§4c).
- **Load a list with skeleton rows**, never a spinner (§4c).
- **Print both `–` and `N/A`** — a blank cell hides an unfinished record (§4c).
- **Put the audit history behind a header icon**, in its own drawer (§8.4).
- **Make every dropdown searchable**, short lists included (§2a).
- **Drop a list below its field**, left-aligned (§2a).
- **Keep "none" as a real option** — "— Unassigned", "Not set" (§2a).
- **Show an already-used value ticked and unselectable**, not hidden (§2a).
- **Explain a section beside its heading, on click** (§3b).
- **Pass a list's own verbs into the DS bulk bar** (§4b).
- **Start a selection empty** — the bar arrives when someone means it (§4b).

## Don't
- **Don't fire a destructive action on one unguarded click.**
- **Don't ship a control with no visible focus state.**
- **Don't leave an action silent** (no loading / success / error).
- **Don't pass `var(--token)` to a Recharts `stroke`/`fill`** — it won't resolve.
- **Don't let a loading skeleton change the loaded shape** (layout jump).
- **Don't animate non-essential motion** without honoring `prefers-reduced-motion`.
- **Don't float a total outside the table** and align it to a column by hand (T1).
- **Don't show a total over an empty table** — "0" about work not started (T2).
- **Don't sum a row that states no value** just because a stale number sits behind
  its flag (T3).
- **Don't leave a checkbox column unlabelled** and explain it with a switch
  somewhere else (T5).
- **Don't set helper text at the field gap** — it reads as a label for the control
  below (§2b).
- **Don't lay a select's list over its own trigger** (§2a).
- **Don't gate search on a list's length** — the field then behaves differently
  depending on data you cannot see (§2a).
- **Don't build a second bulk bar** in place of passing actions to the DS one (§4b).
- **Don't tick rows on creation** (§4b).
- **Don't let one checkbox column mean two things** (§4b).
- **Don't override a section's gap per instance** — that is how a sheet drifts
  from the 40/16 rhythm (`ux/2-rules`).
- **Don't hand-roll a `<TableHead>`.** `TableColumnHeader` + `useTableColumns`
  is how a table gets moving and resizing columns, and it is the default —
  a table without them is a table whose columns the reader may not arrange
  (`ux/2-rules`).
- **Don't make hiding a column the only way to move one.** Headers drag, and
  ⌘/Ctrl + ← → moves a focused one (`ux/2-rules`).
- **Don't hang two gestures off one target.** The divider resizes; the header
  moves. Different cursors, so the pointer says which before the press
  (`ux/2-rules`).
- **Don't confirm an empty removal.** Ask before erasing filled rows; close an
  untouched section without a dialog (`ux/2-rules`).
- **Don't put a bin on a section heading.** Turning an optional section off is a
  minus — nothing is destroyed and one click brings it back (`ux/2-rules`).
- **Don't give a section heading a minimum height.** The 16 is measured from the
  title's own line; a padded row renders it as 20, and 22 once the heading
  carries an action (`ux/2-rules`).
- **Don't build a full-page detail with a separate editor beside it** — one sheet
  does both, and a page takes the list off screen (§1).
- **Don't override a table's page sizes or footer copy** — one list that counts
  differently is one list everybody has to re-read (§4c).
- **Don't paginate a grouped list** — a group straddling the boundary claims a
  count for rows that are not on screen (§4c).
- **Don't leave a filtered list unlabelled** — a quietly narrowed list reads as
  missing data (§4c).
- **Don't stack a toggle like an input** — it leaves a lone 20px control with a
  hole beside it (§1).
- **Don't capitalise an email, a URL or a password** — they carry case, and a
  silent edit there is a bounced invoice or a failed login (§1).
- **Don't use `text-transform: capitalize` on typed text** — it title-cases every
  word, not the first one (§1).
- **Don't rewrite a field while somebody is typing in it** — normalise on blur (§1).
- **Don't put the audit history at the foot of a record body** — it buries
  everything the record was opened for (§8.4).
