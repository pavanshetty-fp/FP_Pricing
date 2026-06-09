# Design notes — assumptions & open items

Built from Figma frame **"Tables Layout"** (`FP DS 2026`, node `27614:56562`).

## Token mapping
All tokens in [`src/index.css`](src/index.css) are mapped 1:1 from the frame's
Figma variable collection and each carries a source-name comment. Notable
Figma→Tailwind overrides:

| Figma var | Value | Note |
|---|---|---|
| `border-radius/rounded-md` | `8px` | overrides Tailwind default (6px) |
| `border-radius/rounded-lg` | `10px` | overrides Tailwind default (8px) |
| spacing / font sizes / heights | — | already match Tailwind's 4px scale and `sm/xs/2xl` sizes; used as-is |

## Assumptions (no token / value match in the frame)
1. **Status colors** (Success / Processing / Failed dots): the frame's variable
   set did **not** include status colors (only `Status/Pink #FF8080`). I used
   `--color-status-success #22c55e`, `--color-status-processing #f59e0b`,
   `--color-status-failed #f87171` (= `base/destructive`). **Confirm with design.**
2. **In-component text strings**: Figma `get_metadata` exposed only two literal
   text nodes — `"Sub Menu 2d"` and `"Showing  20-45 of 1,000"`. All other
   captions (tab labels `Tab 1–7`, column headers, `Filters`, `Group By`,
   `Views: Default View`, `Create Task`, badge labels, amounts, pagination
   digits, `25`, bulk-bar verbs, dropdown items) live inside component instances
   and were **read from the rendered screenshots**, not the file. They are
   faithful to the screenshots but were not machine-extracted.
3. **Column sort indicators**: which columns carry the ↕ sort glyph is a
   component variant prop not present in metadata. Per the screenshot I flagged
   Static, Switch, Button, Dropdown, Progress, Image, Amount as `sortable` in
   [`data.ts`](src/components/tables-layout/data.ts). Adjust as needed.
4. **Active tab**: not encoded in metadata; defaulted to **Tab 1** (leftmost).
5. **Icon glyphs**: the frame referenced mixed icon sets (Lucide / Tabler /
   HugeIcons). I used the closest **lucide-react** equivalents. The row
   "icon dropdown" cell uses `CirclePlay` and the toggle group uses
   Bold/Italic/Underline as representative icons — swap for the intended glyphs.
6. **Sidebar labels**: the rail is icon-only (52px). Labels (`Main Menu 1–4`,
   `FleetPanda`) come from the expanded-sidebar reference frame and are used as
   `aria-label`s.
7. **Sample data**: [`data.ts`](src/components/tables-layout/data.ts) holds 13
   representative rows mirroring the frame's status/amount patterns. Replace with
   real data via the `rows` prop on `<TablesLayout />` / `<DataTable />`.

## Not built (out of scope of the visible frame)
- The **expanded sidebar overlay** (`Sidebar 07.`, 256px) and its submenu — the
  target screen shows the collapsed 52px rail; the expanded panel is a separate
  hover/overlay state in the file.
- Real popovers for the column-header dropdowns and the rows-per-page select
  (rendered as static triggers).

## Verification
`npm install` ✓ · `tsc --noEmit` ✓ (0 errors) · `vite build` ✓ ·
`eslint .` ✓ (0 errors, 2 `react-refresh/only-export-components` warnings on
`button.tsx`/`badge.tsx` — idiomatic shadcn variant exports).
