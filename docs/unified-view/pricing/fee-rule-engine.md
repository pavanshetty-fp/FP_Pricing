# Fee rule engine — spec and build plan

Branch `fee-rule-engine` (cut from `bulk-rule`). Agreed with Yash 2026-11-23/24.
Hand-back: single HTML (`npm run build:single`) → mocks link → GitHub, each on Yash's OK.
Decisions move into `PRD.md` §6 as they are built.

**Built 2026-11-24** — code: `pricing/fees.ts` (data, scope, rule engine, removals, order fees), `pricing/FeeSetup.tsx` (Pricing setup › Fee), `pricing/FeeApplication.tsx` (Fee cell side sheet, Fees block); wired into `ConfigScreens.tsx`, `PricingSheet.tsx`, `orderTrace.ts`, `OrderTraceScreen.tsx`, `OrderTraceSheet.tsx`, `pricingNav.ts`, and (shared) `UnifiedView.tsx`.

## 1. The model

Two layers, the same for every pricing item (fees first; margin and tax later, not now).

| Layer | Page | Decides |
|---|---|---|
| Configuration | Pricing setup › Fee (record sheet) | Values, **scope** (who), **application** (when / how) |
| Application | Ship-to › Edit pricing · Customer pricing | **Remove / Put back** only. No editing, no hand-adding outside scope |

### 1.1 Scope (who the fee reaches)
- Targets: **customers, hubs, ship-tos**, plus **product categories / products**.
- Default: All customers · All hubs · All ship-tos · All products. "All" includes ones added later.
- Hierarchy: a ship-to belongs to one customer; a customer has many hubs; a hub can be shared by many customers. So a hub group is **customer + hub**. Scope rows read Customer | Hubs | Ship-tos, each list narrowing to the pick on its left.
- Include and exclude both possible; exclude wins. Exact UI decided while building.
- Applicable type (Delivery / Extraction) becomes a real check (it is stored but ignored in the old prototype).

### 1.2 Application (when and how)
Kept as the three choices people know, with the rule able to feed review:

| | Charged automatically | Offered for review on the order |
|---|---|---|
| Always | **Always applied** | **Review and apply** |
| When the rule matches | **By rule** | **By rule + review** (new: e.g. Rush) |

Rule UI: the bulk-rule condition table look (match all / any, add / remove rows), filled with fee conditions.

### 1.3 Rule conditions (from "Fee use cases.xlsx")
| Condition | Covers |
|---|---|
| Delivery day & time — days + window, may cross days; inside or outside | Weekend (Fri 17:00 – Mon 00:00), After-hours (outside 07–17) |
| Delivery date — holidays, specific dates, yearly season | Holiday, Winter peak (Dec 1 – Feb 28) |
| Lead time — delivered within X h of creation, or same day | Rush |
| Delivered quantity — below / between | Small-delivery |
| Order details — order type, asset type, number of assets | Per-asset fueling, Pump-out |

Timezone: ship-to (default) or tenant.
Out for v1: state in scope, site type (yard / job site), stacked-fee courtesy, vendor pass-through, dry-run signal, observed holidays.

### 1.4 Removals (application layer)
- Remove lasts until Put back. To stop a fee everywhere, change its scope.
- Customer page removal → all its ship-tos (tag Customer or Hub).
- Ship-to page removal → that ship-to only.
- Overridden ship-to (tag Ship-to) keeps the customer's removals as of the override; later customer removals don't reach it.
- **Reset pricing** (confirm) drops the ship-to's own removals and follows the customer (or hub) again.
- Hub tag = rate type + market only; no hub page for fees. The customer page's "source of margin & fee" choice (customer / ship-to / hub) goes away for fees.

### 1.5 On the order
- Applied and Review-and-apply fees always show.
- **Before delivery:** rule fees that match on planned facts (planned date / time) show; amounts fill once delivered values are entered. Rule + review fees that match sit in Review and apply and can be applied any time.
- **At delivery:** rules re-run on actuals (delivered quantity, actual time). A fee that no longer matches drops; one that now matches is added. Quantity rules decide only on delivered quantity.
- Conflicts: the bigger fee wins. Changes reach new and undelivered orders.

## 2. Screens

1. **Pricing setup › Fee** — list (shared list: views as tabs, Settings gear) + fee record sheet: Fee details · Application · Rule (By rule only) · Scope · Fee amount (flat / range; quantity, distance, time bands; charge per) · right column with reach ("N ship-tos") and Activity.
2. **Ship-to configuration › Fee cell** — side sheet, application only. Header: ship-to · product, Applied pricing tag. Groups: Always · By rule (rule in one line) · Offered on orders · Removed. Each line: name, rate, what brought it in (customer / hub / ship-to), ⋯ Remove / Put back / Open fee (**new tab**). Cell shows charged total + count; Review fees are not in the total.
3. **Edit pricing (ship-to) / Customer pricing** — the Fees block is the same groups with the same acts, in place (no read-only copy, no second drawer).
4. **Order** — fee lines (Applied, Review and apply, pending rule fees) on the shared order sheet.

## 3. Build plan

| # | Step | Where |
|---|---|---|
| 1 | Fee data: fee record (application, rule, scope, amount), seed from the use-case sheet, reach + removal store | `pricing/fees.ts` (new), `changeLog.ts` |
| 2 | Rule engine: condition types, match, planned-vs-actual, "why" text | `pricing/feeRules.ts` (new) |
| 3 | Pricing setup › Fee list + fee record sheet (details, application, rule table, scope, amount) | `pricing/SetupScreens.tsx`, `pricing/FeeSheet.tsx` (new) |
| 4 | Fee cell side sheet on Ship-to configuration (groups, remove / put back, open fee in new tab) | `pricing/ConfigScreens.tsx`, `pricing/FeeApplicationSheet.tsx` (new) |
| 5 | Fees block on Edit pricing / Customer pricing; drop the fee source choice; Reset pricing | `pricing/PricingSheet.tsx` |
| 6 | Order: fee lines, Review and apply, pending rule fees, recheck at delivery | shared `OrderSheet.tsx` — flag before changing |
| 7 | Change log entries for fee edits, removals, put-backs | `changeLog.ts`, `changeLogStore.ts` |
| 8 | Check: tsc, `npm run eval`, `npm run check:rules`, browser pass; PRD §6 entries | — |

Phase 2 (list cases when Yash asks): bulk rules and the bulk bar for fees — Add / Remove via scope vs removals, mixed selections, unselect-from-include vs exclude.

## 4. Open while building
- Include / exclude UI for scope.
- Shared-component changes (OrderSheet, list cells) go on the Pavan list.
- Visible "new customers, hubs and ship-tos get this fee" line vs ⓘ (UX-96) — ask Pavan.
