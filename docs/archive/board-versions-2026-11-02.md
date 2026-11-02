# 3PL board versions — archive (2026-11-02)

On 2026-11-02 Pavan kept two 3PL Delivery Orders boards — **V2** and **V4** —
and archived the rest: **V1, V1.1, V2.1, V3**.

- V2 — HubSpot-style trays: rounded lanes, V2 card, "Total amount" foot, 5.5 lanes in view.
- V4 — V2's board and card shell, with V3's card inside (`CardV4`). Has List view.

## Bring one back

Every version, with the switch working, is in commit `3ca7a27`:

```bash
git show 3ca7a27:prototypes/unified-view/UnifiedView.tsx          # the V1 · V2 · V3 · V4 switch + V1.1 / V2.1 behind the chevron
git show 3ca7a27:prototypes/unified-view/threepl/BrokerOrdersScreen.tsx   # boardVersion → BrokerBoard (V1, V1.1, V3) or BoardV2 (V2, V2.1, V4)
```

## What the archived ones were

| | Board | Card |
|---|---|---|
| V1 | `BrokerBoard`: one box, lanes edge to edge, coloured lane-title pill, per-lane sort | full card, unit headings |
| V1.1 | V1 | headings swapped for icons |
| V2.1 | V2 at 7.5 lanes | every line 14px regular |
| V3 | V1's board | bare card (`bare`): no labels, pin/truck lines, blue number + type initial |

Gone with them from 3PL: the per-lane sort menu (it lived on `BrokerBoard` only).
Sales and Service boards still use `BrokerBoard` and are unchanged.

## Later the same day — V1 chosen, V2 archived

Pavan picked **V1** (the HubSpot-style board, `BoardV2` with the V1 card) and
archived **V2** (V1's board with the bare V3 card inside, `CardV4`, and the
trial that put the view tools in a box beside the view switch, `toolsBox`).
The version switch is gone. V1 is now the board in **every module** — 3PL
Delivery Orders, Sales Orders, Service Work and the Customer Portal (and the
design reference sample). Per-lane sort moved onto V1's lanes (hover only,
unless a sort is on); the "Total amount" foot shows only where a lane has
prices.

Code with V1 and V2 switchable: commit `8e9ec6c`.

```bash
git show 8e9ec6c:prototypes/unified-view/UnifiedView.tsx               # the V1 · V2 switch
git show 8e9ec6c:prototypes/unified-view/threepl/BrokerOrdersScreen.tsx  # boardVersion, toolsBeside, v3Cards
```
