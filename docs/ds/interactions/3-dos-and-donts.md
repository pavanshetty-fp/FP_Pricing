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
- **Don't make hiding a column the only way to move one.** Headers drag, and
  ⌘/Ctrl + ← → moves a focused one (`ux/2-rules`).
- **Don't confirm an empty removal.** Ask before erasing filled rows; close an
  untouched section without a dialog (`ux/2-rules`).
- **Don't put a bin on a section heading.** Turning an optional section off is a
  minus — nothing is destroyed and one click brings it back (`ux/2-rules`).
- **Don't give a section heading a minimum height.** The 16 is measured from the
  title's own line; a padded row renders it as 20, and 22 once the heading
  carries an action (`ux/2-rules`).
