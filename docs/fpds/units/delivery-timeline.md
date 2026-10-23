# Delivery window & preferred time

`id: unit.delivery-timeline` · `layer: unit` · `code: prototypes/unified-view/DeliveryWindowTimeline.tsx, src/components/form-layout/TimeWindowSlider.tsx (formatWindow, formatSpan, formatMinutes — and the retired slider), prototypes/unified-view/HangingAdd.tsx` · `registry: fpds-delivery-timeline`

## Purpose
One day drawn once, full width: the delivery window as a range on a 24-hour track, and the customer's preferred times as bars on the same scale beneath it. It answers "between when can we deliver, and when would they rather we came".

## Use when / Don't use when
- Use for every delivery or scheduling window in every module — order sheets, recurring rules, a ship-to's default hours, a service order's scheduling window.
- Don't use `TimeWindowSlider` for a new window — it remains only in the technician mobile app (`TechnicianHome`); its formatters are still shared.
- Don't use a dropdown of fixed windows — a window is two times, not a category.
- Don't use where a module has no window (Sales orders).
- Don't use for a single moment (a date) — use the DS date field in the record sheet's field row.

## Anatomy
1. **Label, outside the box** — `SheetField` label (each module words it: "Delivery Window & Preferred Time", "Scheduling window & preferred time", "Delivery hours & preferred time"; default "Delivery window & preferred time"), required mark when required.
2. **Outlined box** (input-style):
   - **Read-out line** — the window ("8:00 AM – 12:00 PM", `formatWindow`) left; the span ("4 hr window" / "All day", `formatSpan`) right.
   - **Track** — DS `Slider`, two thumbs, midnight to midnight, 30-minute steps, minimum one hour apart.
   - **Hour ticks** — 12a · 3a · 6a · 9a · 12p · 3p · 6p · 9p · 12a; end labels pinned to the edges.
   - **Preferred-time bars** — one per preferred time, under the track, each with dashed lines up to the track at its two ends, a resize grip at each end, and a ✕ just past its right end (on hover/focus).
   - **Time labels** — short times under each bar's ends ("8a", "1:30p"), dotted-underlined, pressable; a narrow bar shows one label "8a–9:20a"; where two bars meet the shared time prints once.
3. **Hanging add** — `HangingAdd` "Add preferred time" off the box's squared bottom-left corner.
4. **No-room alert** — beside the add: warning icon + "Delete or adjust the current preferred time to add a new one."
5. **Times editor** (popover from a time label) — Start and End time inputs to the minute, and the problem line when the pair doesn't fit.

## Look
- Box: `rounded-md border border-input bg-fp-surface-1b px-4 pt-3 pb-3`, dark `bg-fp-field-fill`; focus-within `border-ring` + `ring-2 ring-ring/50`; bottom-left corner squared (`rounded-bl-none`) while the add shows.
- Read-out: window `text-sm tabular-nums text-foreground`, never truncates; span `text-xs text-muted-foreground`, truncates first.
- Track: thumbs `size-5`, track `h-2.5`. Scale area `h-10`, `h-[78px]` once a bar exists.
- Ticks and time labels: `text-xs tabular-nums`; ticks `text-muted-foreground`, bar times `text-foreground`.
- Bars: `h-2.5 rounded-xs bg-fp-lane-blue/30`, hover `bg-fp-lane-blue/45`, 1px air each side so two touching bars stay two; dashed lines `border-dashed border-muted-foreground/60`.
- Bar ✕: `size-5`, `text-muted-foreground` → `text-foreground`.
- No-room line and editor problem text: `text-xs text-status-failed`.
- Times editor inputs: `w-[130px]` each (natural-size time control).

## States
- **default** — window range on the track, no bars, scale short (`h-10`).
- **with preferred times** — scale grows; bars, dashed guides and time labels show.
- **hover bar** — bar darkens, ✕ appears, cursor grab (grabbing while dragging); ends show resize cursor.
- **focus bar** — focus ring, ✕ visible; keyboard moves it.
- **narrow bar** — one combined label, no end label.
- **full** — + pressed with no free half hour: the alert line shows; clears on any change to window or times.
- **add hidden** — when disabled, or the window is shorter than 30 minutes.
- **disabled** — slider and bars inert, time labels plain text, no ✕, no add (locked records; 3PL rule tab until a ship-to is chosen).
- **editor error** — "Enter both times" · "End after the start" · "Inside the delivery window, …" · "Overlaps another preferred time".

## Interactions
| Trigger | Result |
|---|---|
| Drag a window thumb | Window start/end moves in 30-min steps; read-out and span update; callers clamp existing preferred times into the new window and drop any under 30 min |
| Press "Add preferred time" | New bar in the window's first free stretch of ≥30 min, up to 2 h long; it takes focus |
| Press + with no free 30 min | Alert line: "Delete or adjust the current preferred time to add a new one." |
| Drag a bar | Moves in 30-min steps; stops at neighbours and the window edges |
| Drag a bar's end | Resizes; never shorter than 30 min, never past a neighbour or the window |
| ← / → on a focused bar | Moves it half an hour |
| Shift + ← / → | Moves its end half an hour |
| Delete / Backspace on a focused bar | Removes it |
| Press a bar's ✕ | Removes it |
| Press a time label | Popover with Start and End to the minute, the pressed one focused |
| Type a pair that fits | Kept at once; bar moves/resizes to match |
| Type a pair that doesn't fit | Problem line shows; value not kept |

## Outcomes
- A window set (start, end in minutes from midnight).
- Preferred times added, moved, resized, typed to the minute, or removed — never overlapping, always inside the window.
- The no-room message, and nothing added, when the window is full.
- Nothing changes while disabled.
- Autosaved with the record; a recurring rule's orders inherit its window and preferred times.

## Data contract
- In: `start`, `end` (minutes from midnight), `preferred` (list of `{start, end}`), `label`, `required`, `disabled`.
- Out: `onWindowChange(start, end)`; `onPreferredChange(nextList)`.
- The caller re-clamps preferred times when the window moves (all current callers do).
- Shared formatters: `formatWindow`, `formatSpan`, `formatMinutes` from `TimeWindowSlider.tsx`.

## Rules
1. **Every window field in every module is this timeline** — *Pavan: "apply wherever applicable, all modules and service work"* — `(source: ui §10m; memory feedback_delivery_timeline 2026-10-20)`
2. **Label outside, the unit inside an input-style outlined box** — *every field's label sits outside; the timeline is a field* — `(source: ui §10m; DeliveryWindowTimeline.tsx comment)`
3. **The add is the table's hanging + off the box corner** — *same affordance as adding a table row* — `(source: ui §10m; ui §10f)`
4. **Preferred times never overlap; a bar stops at its neighbours whichever way it is dragged or typed** — *Pavan, 2026-10-20* — `(source: ui §10m; memory project_customer_portal 2026-10-20)`
5. **With no free half hour, + says "Delete or adjust the current preferred time to add a new one." where it was pressed** — *the reader learns why nothing was added, at the press* — `(source: ui §10m; interactions §7b a dead control says why on the press)`
6. **A window is two times on a drawn day, in 30-minute steps** — *six fixed options could not say "7 to 11" or "all day"; delivery isn't scheduled to the minute* — `(source: TimeWindowSlider.tsx comment)`
7. **Pressing a bar's time opens start and end to the minute — the same value as the bars** — `(source: ui §10m)`
8. **The window read-out never truncates; the span note gives way** — *sheets fit their content, so a half-width field is narrow* — `(source: TimeWindowSlider.tsx 2026-10-15)`
9. **A new bar takes focus** — *so ← → move it at once* — `(source: DeliveryWindowTimeline.tsx; ui §10f)`

## Do / Don't
- ✅ Full width under the date row (portal: Ship-to · PO # · Planned date on one row, timeline below).
- ✅ Word the label for the module, keep the unit identical.
- ✅ Clamp preferred times into a moved window.
- ❌ A new `TimeWindowSlider`, a window dropdown, or separate start/end fields.
- ❌ A separate "Preferred windows" table.
- ❌ Helper text under the box.
- ❌ Overlapping bars, or a silent no-op on a full window.

## Checks
- `fields-fill` — the row it sits in fills its width.
- `tokens`, `wcag-contrast` — bar and box colors are tokens with WCAG pairs.
- `parity-sheets` — the same field on create and edit sheets.
- By eye: label outside, + joins the box corner, bars don't overlap, short bars carry one label, the window read-out is never cut.

## Reference
- 3PL › Delivery Orders › Delivery Order sheet — Schedule Details, "Delivery Window & Preferred Time".
- 3PL › Recurring Orders › Create rule — each ship-to tab.
- Service Work › Service Orders › service order sheet — "Scheduling window & preferred time".
- Customer Portal › Orders › order sheet (Delivery section); Customer Portal › Recurring Orders › rule sheet (Frequency section); Customer Portal › Sites & Assets › ship-to sheet — "Delivery hours & preferred time".
