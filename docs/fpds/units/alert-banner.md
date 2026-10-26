# Alert banner

`id: unit.alert-banner` · `layer: unit` · `code: src/components/ui/alert-banner.tsx, src/components/ui/banner.tsx` · `registry: fpds-alert-banner`

## Purpose
Tells the reader what on this list needs attention now, and lets them act on it in place: narrow the list to it, step through several kinds, act on an item, snooze or dismiss. Answers "what needs me on this page, and where is it?"

## Use when / Don't use when
- Use when a banner ACTS on the page: it applies a filter, holds several kinds of alert, or lists items each with its own action. That is the B2 banner, `AlertBanner`, and it carries the whole anatomy.
- Use on a list page for standing conditions (overdue, needs action, at risk, past due).
- Don't use when the banner only says one thing with at most one action or a ✕ — use the B1 banner without interaction, `BannerCallout` (solid · soft) or `BannerInline` (same files, `banner.tsx`).
- Don't dress a one-line message in B2 parts: no filter, no items and no stepping = B1.
- Don't use for the dashboard's **Attention required** tiles — a different pattern by design (red outline shine on the banner), not an `AlertBanner`.
- Don't use to explain why a control is disabled — that is a tooltip on the press (interactions §7b).

## Anatomy
One line (one alert KIND at a time), then an optional item list under it.

Left, in this order:
1. **Tag pill** — uppercase tag ("Needs action", "Overdue", "At risk", "Exception", "Due soon", "Disputed") with the `TriangleAlert` icon INSIDE it. The icon stands alone only when the alert has no tag.
2. **Count in the tag** — a small pill inside the tag pill (filtering alerts, `ctaMode`).
3. **Title** — what it is, one sentence, `font-medium`.
4. **Detail** (optional) — muted; gives way (truncates) first.
5. **"View details"** — ghost button with a dotted underline (filtering alerts); becomes **"✕ Clear filter"** while its filter is on.
   — or, for an alert with no filter: **count pill with the chevron inside** (opens the item list; chevron flips), no divider before it, no "Details" word. Without items, a plain count pill.

Right, in this order:
6. **The alert's own action** (optional) — a `bannerSoftAction` button, wrapped in the CTA shine.
7. **‹ 1 of N ›** — stepper between kinds; only when N > 1.
8. **Snooze** — clock icon button, tooltip "Remind me later" (`BannerSnooze`).
9. **✕ Dismiss** — always the LAST thing on the right.

Under the line (open, item alerts only): **item rows** — title (pressable when it can narrow), detail, optional `facts` (the record's own readings in equal columns, e.g. a tank's ship-to · level gauge · % · battery · gallons of capacity), item action (shined).

## Look
- Shell: `calloutVariants({ status, variant: "soft" })` — `rounded-md`, 1px rim; fill and rim are alphas of the status's inline accent `--fp-banner-accent-{info|caution|warning|success}`: `/10` wash + `/30` rim; **warning in light is `/5` wash + `/20` rim** (dark keeps `/10` · `/30`).
- Line: `min-h-11`, padding `px-3 py-1.5` (12px sides / 6px top-bottom — settled, don't change), gap `gap-2.5`.
- Tag pill: DS pill shape (`PILL_SHAPE`) coloured by kind via `pillColorClass` — warning → `critical`, caution → `caution`, info → `info`, success → `success`; `h-6`, `px-2`, 11px uppercase `font-medium tracking-wide`, icon 14px. Count inside: `h-4` round, `bg-background/80`, 10px `font-semibold tabular-nums`.
- Title `text-sm font-medium text-foreground`; detail `text-muted-foreground`.
- Icon buttons (snooze, ✕): 28px square, `rounded-sm`, `text-muted-foreground`, hover `bg-accent` + `text-foreground`.
- Stepper: `text-xs tabular-nums text-muted-foreground`, chevrons 14px, disabled at the ends `opacity-30`.
- Item list: on white — `bg-fp-surface-1b`, `border-t` + row dividers `current/10`, rows `min-h-11`, indented to line up under the title.
- Item / own action button: `variant="outline" size="sm"` + `bannerSoftAction` (`bg-fp-surface-1b` light, `bg-fp-surface-base` dark).
- Motion (ui §10l): **every pill sweeps** — a bar through the fill in a deeper shade of its own kind (`--color-fp-lane-red` / `-orange` / `-blue` / `-green` mixed), **only while collapsed**. **Every CTA the banner carries shines** — white `OutlineShine` on its outline (2px ring centred on the 1px border, 50% band). The ghost "View details" / "Clear filter" has no outline, so no shine. Both are added by the banner, never by screens.

## States
- **collapsed (default)** — one line; pills sweep.
- **open** — item list shown on white under the line; chevron rotated; sweeps stop.
- **filter applied** — "View details" reads "✕ Clear filter" (non-CTA alerts with a filter also gain a muted "✕ Clear filter").
- **several kinds** — ‹ i of N ›; the whole banner takes the shown kind's status color; first/last chevron disabled at the ends.
- **hover** — pressable title/item: pointer + fade to 75% opacity, no underline; count pill `brightness-95`; icon buttons get `bg-accent`.
- **focus** — `ring-2 ring-ring/50` on every pressable part.
- **snooze custom** — popover with Hours (0–168) and Minutes (0–59) boxes and a Snooze button, disabled while the duration is 0.
- **empty** — no alerts left (all resolved, dismissed or snoozed) → renders nothing.

## Interactions
| Trigger | Result |
|---|---|
| Press "View details" (filtering alert) | The alert's filter is applied to the list's own filters (facets, flags, date range); the button turns into "✕ Clear filter" |
| Press "✕ Clear filter" | The list goes back to its default (e.g. portal Orders: today, nothing narrowed); the banner stays |
| Change the filter by hand after applying | "Clear filter" reverts to "View details" by itself |
| Press the title (alert with a filter, `ctaMode={false}`) | Applies the filter |
| Press the count pill with chevron | Opens the item list; chevron flips; press again folds it |
| Press an item's title | Narrows the list to that one record |
| Press an item's action ("Create Order", "Order the rest") | Runs that act — e.g. opens a new order sheet for that tank / for the undelivered rest |
| Press the banner's own action | Runs it |
| Press ‹ / › | Shows the previous / next kind; the item list closes |
| Press the clock | Menu: 1 hour · 2 hours · 4 hours · 8 hours · Tomorrow, same time · Custom… |
| Pick a snooze duration | That kind hides until the time passes, then returns |
| Pick Custom… → enter hours/minutes → Snooze | Same, for the typed duration |
| Press ✕ | That kind is dismissed for the visit; the next kind shows; last one gone → banner disappears |

## Outcomes
- A narrowed list (filter chips show it; Clear all also undoes it).
- A list narrowed to one record (item press).
- A record sheet opening from an item action (new order draft, order the rest).
- A kind hidden for a while (snooze) or for the visit (dismiss).
- No banner at all when nothing qualifies — never an empty banner.
- Nothing changes to data: the banner only filters and hands off to sheets.

## Data contract
- `alerts: BannerAlert[]` — each: `id`, `status` (info · caution · warning · success), `tag?`, `title`, `detail?`, `count?`, `onApply?` (its filter), `action?` (node), `items?` (`id`, `title`, `detail?`, `facts?`, `action?`, `onApply?`). Ordered most serious first.
- `appliedId?` — which alert's filter the list is showing now; `onClearApplied?` — puts the list back to its default.
- `onSnooze?(id, ms)`, `onDismiss?(id)` — the screen keeps snoozed/dismissed state and filters `alerts`.
- `ctaMode` (default true) — filtering alerts use the CTA anatomy; `false` restores the old one.
- Snooze set: `BANNER_SNOOZE_OPTIONS` (one set, every module); `BannerSnooze` is exported for standalone use.

## Rules
1. **The question is whether pressing it does something to the page** — yes = B2 `AlertBanner` with the whole anatomy; no = B1 `BannerCallout`/`BannerInline` — *two banners kept apart so a message never looks pressable and an alert never looks inert* — `(source: docs/ds/ui/7-variants.md §6; interactions §7, §7a; memory feedback_banner_final 2026-10-13)`
2. **The banner is a filter** — its CTA applies exactly the narrowing its words describe, onto the list's own filters — *so the chips show it and Clear all undoes it* — `(source: interactions §7a; alert-banner.tsx header)`
3. **Filtering alerts: count inside the tag, plain title, ghost "View details" → "✕ Clear filter"; no count pill, no list** — *tried on portal Invoices, then made standard everywhere* — `(source: interactions §7a, Pavan 2026-10-15)`
4. **Clear filter returns the list to its default and the banner stays until its own ✕** — *clearing the filter is not dismissing the alert* — `(source: alert-banner.tsx appliedId, Pavan 2026-10-14)`
5. **One kind at a time, most serious first, ‹ 1 of N ›; the banner wears the shown kind's color** — *a red kind and an amber one look like what they are; same stepper as the sheet's Pending strip* — `(source: interactions §7a)`
6. **✕ is always last on the right; snooze sits beside the stepper** — *dismissing is the way out, so it sits at the edge* — `(source: alert-banner.tsx, Pavan 2026-10-13)`
7. **Snooze = `BANNER_SNOOZE_OPTIONS` + Custom… (hours and minutes, no calendar)** — *the Sales Orders set became the one standard* — `(source: banner.tsx; interactions §7a)`
8. **Title pressable with no underline** (pointer + slight fade) — *the underline was rejected; pointer and fade say it acts* — `(source: alert-banner.tsx PRESSABLE, Pavan 2026-10-13)`
9. **Warning is half as loud in light (/5 wash, /20 rim)** — *a /10 red wash read as an alarm on white* — `(source: banner.tsx, Pavan 2026-10-13)`
10. **Padding stays 12px sides / 6px top-bottom** — *white fill and 6px/4px were tried and reverted* — `(source: memory feedback_banner_final 2026-10-14)`
11. **Every pill sweeps (collapsed only); every CTA shines — added by the banner, not by screens** — *one component, one behavior across modules; when open, the list is the attention* — `(source: ui §10l, Pavan 2026-10-20)`
12. **Opened items sit on white inside the banner's coloured outline; rich facts are the record's own readings in equal columns** — *a tank is drawn the way the app draws it everywhere* — `(source: alert-banner.tsx, Pavan 2026-10-20)`
13. **On every list the banner sits under the toolbar (search, Filters, chips), right above the table or board** — *the tools first, then what needs attention, then the list it narrows* — `(source: Pavan 2026-10-25)`.
14. **The banner is always the info blue; the pills carry the severity** (red Overdue/Needs action, amber caution…) — *a banner is information; the pill says how serious* — `(source: Pavan 2026-10-25)`.
15. **View all** beside ‹ 1 of N › lays every alert out as its own banner, one under another; the first carries **Collapse** to fold them back to one at a time — `(source: Pavan 2026-10-25)`.

## Do / Don't
- ✅ Pass `onApply` for every alert that is about a slice of the list; let the banner render "View details".
- ✅ Order alerts most serious first; let the screen filter out snoozed/dismissed ones.
- ✅ Give item actions `variant="outline" size="sm"` + `bannerSoftAction` — the banner adds the shine.
- ✅ Write the title as a sentence with the number: "2 invoices are past due".
- ❌ Add a "Details" word, an underline on the title, or a divider before the count pill.
- ❌ Hand-add sweeps or shines in a screen.
- ❌ Put anything after ✕.
- ❌ Use `AlertBanner` for a single static message (use `BannerCallout`/`BannerInline`).
- ❌ Use a calendar for custom snooze.

## Checks
- Eval: `tokens` (no raw colors), `wcag-contrast` (soft fills/ink pairs), `microcopy` (titles/labels), `parity-shell`.
- By eye: tag pill has icon inside; ✕ last; stepper only when N > 1; pills sweep only collapsed; every outline CTA shines; filtering alerts show "View details" → "✕ Clear filter"; banner position relative to the toolbar per module.

## Reference
- Customer Portal › Orders — four kinds: Needs action (nearly empty tanks, item list with tank facts + "Create Order"), Overdue (invoices past due), Exception (partial deliveries, "Order the rest"), At risk (late).
- Customer Portal › Invoices — Overdue · Disputed · Due soon.
- Sales › Orders — one kind: Overdue ("N urgent orders overdue for dispatch").
- Service Work › Service Orders — Needs action (urgent, no technician) · Needs action (needs approval) · Overdue (payment delayed), each a facet filter.
