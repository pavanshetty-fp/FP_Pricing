# Version 1: Separate Views — 3PL Delivery Orders, retired (2026-11-08)

From 2026-11-02 the 3PL Delivery Orders screen had a **V1 · V2** switch beside
its title. On 2026-11-08 Pavan picked **Version 2** and retired Version 1 under
this name.

## What Version 1 was

- **The display was picked from a separate switch**: a segmented control of icons (Table · List · Board · Map) in the toolbar, at the right of the search row.
- **The saved-views row held only saved views** (Default, then the views people saved). The display was not a tab.
- **Default always opened on the Board.** Choosing Table was a change to the view (the saved state's `mode` stayed `"board"`).

## What Version 2 (current) does instead

- The displays are **tabs on the views row**, with their icons, and the saved views follow them. There is no display switch in the toolbar.
- **Each display tab is its own default**, so picking Table is not a change. A saved view still remembers the display it was saved in.

## Why it went

Two places to choose what you are looking at (the views row and the toolbar
switch) became one: the views row.

## How to bring it back

- `BrokerOrdersScreen` still takes `layout?: "1" | "2"` (default `"2"`). Pass `layout="1"` to get Version 1.
- The title switch and its stored choice (`fp-3pl-layout`) were removed from `UnifiedView.tsx`. The last commit with them is `487e083`: `git show 487e083:prototypes/unified-view/UnifiedView.tsx`.
