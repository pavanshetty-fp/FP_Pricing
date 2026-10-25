# Board versions — archive (2026-10-25)

On 2026-10-25 Pavan compared four designs of the 3PL Delivery Orders board
side by side (a V1 | V2 | V3 | V4 switch next to the page title) and chose
**V4**. V4 is now the only board, in every module (3PL, Sales, Service Work,
Customer Portal). V1–V3 are kept here in case they are ever asked about.

## Bring one back

All four versions are in one commit, with the switch working:

```bash
git show e389e2e:prototypes/unified-view/threepl/BrokerBoard.tsx   # the board, all four versions
git checkout e389e2e -- prototypes/unified-view/threepl/BrokerBoard.tsx   # restore it (then re-add the switch)
```

The switch lived in `prototypes/unified-view/UnifiedView.tsx` (`boardVersion`,
the `ToggleGroup` beside the title) and was passed through
`BrokerOrdersScreen` (`boardVersion` prop) to `BrokerBoard` (`version` prop).
The lane widths were CSS tokens in `src/index.css`:
`--fp-board-lane-width` 400px (V1), `--fp-board-lane-width-v2` 300px (V2, V3),
`--fp-board-lane-width-v4` 340px (V4).

## The four versions

| | V1 — before | V2 | V3 | V4 — chosen |
|---|---|---|---|---|
| Lane width | 400px | 300px | 300px | 340px, 20px either side of the cards |
| Lane fill | cool grey `--fp-board-lane` | the nav menu's `--fp-shell-panel` (#fbfbfb) | white + surface shadow | white |
| Lanes | separate rounded boxes, 16px apart | same | same | one bordered box like a table; lanes edge to edge, 1px line between, 3px at a group break |
| Lane header | 4px colour strip on top, plain title | same | same | no strip; title is a pill in the lane colour (16% fill); line under the header |
| Card outline | yes | **none** | yes | yes |
| Card sections | ruled (a line between each) | spacing, no rules | spacing, no rules | spacing, no rules |
| Card spacing | 14px inset, rules | 12px inset, 16px between sections, 6px inside | same as V2 | same as V2 |
| Quote unit | "Best price" pill, stepper by the heading, alert row "N of N quotes — review pricing" + Review | as V1 | as V1 | light green band edge to edge (heading inside), placing as text, stepper centred at the bottom, no alert row, no Review — the card opens at Pricing |
| Group break | 3px rule with 12px air each side | same | same | the lane's own 3px left line |

### What was tried for V2's lane fill, in order

1. Warm main background one step darker, `#e5e5df` (1.26:1 against white).
2. Lighter — the warm main background itself, `#efefeb`.
3. Each lane its own strip colour at 6%, solid (color-mix over white).
4. All lanes the Orders grey at 6%.
5. The navigation menu's background, `--fp-shell-panel` — final V2.

## Kept from the comparison, for every board

- The view bar (count + Card fields) is the top strip of the board's box
  (`BoardWithBar`), like the table's.
- Clicking a card that carries quotes opens the order sheet at the Pricing
  heading.
