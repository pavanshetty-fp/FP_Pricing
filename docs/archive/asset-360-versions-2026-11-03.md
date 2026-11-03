# Asset 360 — activity log and details card versions (2026-11-03)

On 2026-11-03 Pavan compared three versions each of Master Data › Asset 360's
**activity log** and **asset details card** (a V1 · V2 · V3 switch on each)
and chose **Log V3** and **Details V3**. The others are kept here.

## What was chosen

- **Log V3 — type tiles over the table.** A tile per type (Deliveries,
  Service, Billing, Lease, Movement, Equipment, Asset) with its count and the
  one figure that matters; a tile is a quick filter; the full table below.
- **Details V3 — a card per subject.** Placement, Contract (active lease,
  ends in N days, volume used), Tank and monitor (level first, gauge),
  each with Edit.

## What was archived

| | Activity log | Asset details card |
|---|---|---|
| V1 | The full table alone (sorting, column search, pages) | One long list, label over value |
| V2 | **Day feed** — the Activity card's timeline at full width, a sticky heading per day (Today, Yesterday, date), type mark, what happened, detail · who · time, status on the right | **One card, grouped** — Asset · Placement · Contract · Tank and monitor under small headings, label left / value right (`RailRow`) |

## Bring one back

All six, with both switches working, are in commit `9dbd7cc`:

```bash
git show 9dbd7cc:prototypes/unified-view/masterdata/AssetActivity.tsx   # ActivityFeed (log V2) + TypeTiles (V3)
git show 9dbd7cc:prototypes/unified-view/masterdata/AssetDetails.tsx    # DetailsGrouped (V2) + DetailsCards (V3)
git show 9dbd7cc:prototypes/unified-view/masterdata/AssetSheet.tsx      # details V1 (the long list) + the switch
git show 9dbd7cc:prototypes/unified-view/masterdata/VersionSwitch.tsx   # the V1 · V2 · V3 control
```
