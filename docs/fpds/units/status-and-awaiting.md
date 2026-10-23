# Status & awaiting pills

`id: unit.status-and-awaiting` · `layer: unit` · `code: prototypes/unified-view/statusKind.ts, src/components/ui/status-chip.tsx, src/components/ui/pill.tsx, prototypes/customer-portal/cells.tsx (AwaitingPill, FlagsCell, RulePill)` · `registry: fpds-status-and-awaiting`

## Purpose
Says what state a record is in, as its word in a pill coloured by what the reader should do about it. The Awaiting pill says a customer's ask (change or cancellation) is waiting on the tenant, without inventing a status. Flags say what is wrong or about to be.

## Use when / Don't use when
- Use the **status pill** (`StatusChip`, default variant) in every status column, sheet header, board card badge and map list row.
- Use a **badge pill** (`Pill kind=…`) for flags and tags on a card: Urgent, Over SLA, Needs approval, Recurring, "Best price", "+N".
- Use the **Awaiting pill** beside the status when a Customer Portal order carries a `changeRequest`.
- Use **Flags as plain coloured text** in the Customer Portal Orders Flags column.
- Don't use `variant="dot"` unless a dense grid is asked for it by name.
- Don't use a pill for button / nav counters (`BadgeNumber`), the board lane count, or type initials (`CodeDisc`).
- Don't make "Change requested" / "Cancellation requested" a status or a lane — use the Awaiting pill.

## Anatomy
1. **Status pill** — the status word, truncating, inside the pill shape.
2. **Awaiting pill** — "Awaiting confirmation" or "Awaiting cancellation", a caution status pill that is a press target; opens a breakdown card:
   - Title "Change requested" / "Cancellation requested".
   - Row 1: what was asked (sub-line: the customer's note).
   - Row 2: "Sent to <tenant>" (sub-line: date · waiting for their confirmation).
3. **Flags cell** (CP) — most serious flag's word in its level color + a neutral "+N" pill; press opens "Flags (N)" with each flag and its detail.
4. **Rule pill** (CP) — repeat icon + rule number (R-xxxx) on an order a rule made.

## Look
- Pill shape (`PILL_SHAPE`): `inline-flex h-7 rounded-full px-3 text-xs font-normal whitespace-nowrap`, no border.
- Kind colors (`KIND_PILL`): neutral `bg-muted text-muted-foreground` · info `bg-fp-banner-accent-info/10 text-fp-banner-accent-info` · caution `bg-fp-banner-accent-caution/10 text-fp-banner-accent-caution` · success `bg-status-success/10 text-status-success` · critical `bg-status-failed/10 text-status-failed`.
- Chosen color (Sales stages / order types only): DS lane palette over the kind — `bg-fp-lane-<hue>/12` (yellow /18, orange /15) with text mixed from the hue and `--foreground`; violet = `bg-accent-violet-soft text-accent-violet-ink`.
- Dot variant: `size-1.5` dot (`bg-status-success` / `-processing` / `-failed` / `bg-muted-foreground` / `bg-fp-banner-accent-info`) beside a `text-sm` neutral word.
- Flags text: critical `text-status-failed` · warning `text-status-processing` · info `text-foreground`.
- Rule pill: `Pill color="purple"`, `Repeat` icon size-3.
- Awaiting breakdown card: 320px wide.

## States
- **Kinds** — caution (waiting on somebody, amber) · info (simply true, blue) · success (done, green) · critical (a warning, red) · neutral (neither; Draft, Canceled — gray).
- **Awaiting pill** — present only while the ask is open; hover = press target, focus ring from `BreakdownPopover`; open = card above the cell.
- **No flags** — the cell shows "—" in muted text.
- **Truncated** — long words truncate inside the pill (`max-w-full`).

## Interactions
| Trigger | Result |
|---|---|
| Press the Awaiting pill | Opens the card: what was asked, the note, when it was sent and that it waits for the tenant. Row is not opened. |
| Press the Flags cell | Opens "Flags (N)" with every flag (most serious first) and its detail. |
| Hover a "+N" pill in a `PillList` | Hover card lists every value as pills. |
| Customer sends "Request change" / "Cancel order" on a sent order | Order keeps its status (Unassigned / Scheduled) and gains the Awaiting pill in the table, a pill + caution strip ("View") on the board card, and a "… requested · awaiting confirmation" section in the sheet. |
| Status changes | The pill's word and kind color change with it; nothing else is added. |

## Outcomes
- The reader sees the state and whether it asks something of them, the same color in every module.
- An open customer ask is visible everywhere the order shows, without a new status.
- Late / at-risk / credit-hold / past-due facts show as flags (CP) or badges (board), not as statuses.
- Running late (CP) = planned date passed and not delivered (Unassigned, Scheduled, Out for delivery); it surfaces on the Dashboard as an Attention required tile, not as a status.

## Data contract
- `StatusChip` — `tone` (a DS channel: success · processing · failed · neutral · info; supplied from the module's kind map, never typed by hand), `variant` (`text` default = pill, `soft` = pill, `dot`), optional `color` (chosen hue, Sales).
- Modules declare `Record<Status, StatusKind>` through `statusTones()` (or `kindTone()`); `KIND_TONE` maps caution→processing, info→info, success→success, critical→failed, neutral→neutral. `ACTIVE_KIND(active)` → info / neutral.
- `Pill` — `kind` (neutral · info · caution · success · critical), optional `color`.
- `AwaitingPill({ r })` — needs `r.changeRequest {kind: change | cancel, what, note, at}` and `r.requestNo`; renders nothing without an ask. `awaitingLabel(r)` gives the label for board badges and strips.
- `FlagsCell({ r })` — `r.flags[] {kind, detail, level: critical | warning | info}`.

## Rules
1. **A status is coloured by its KIND — what the reader should do** — *a column is a place, not a state; every badge gray made a job waiting on parts look like a new job.* `(source: docs/ds/ui/2-rules.md §10b, 2026-09-23)`
2. **Modules declare kinds, never tones** — *a map written in tones is a map written in colors; that is how "Assigned" came out green, amber and blue in three modules.* `(source: ui §10b; statusKind.ts)`
3. **Being active is info, not success** — *nothing has been achieved by a customer existing; green stays for done.* `(source: ui §10b)`
4. **Canceled is not red; a decision is not a fault** — *Canceled is a terminal non-event; Paused is caution, Skipped neutral.* `(source: ui §10b)`
5. **Red only for a warning** — *types, categories, lanes and Canceled never red.* `(source: ui §11b, Pavan 2026-10-16)`
6. **A status is its word — no dot beside it** — *the dot repeats the tone and spends 12px of a control meant to be small; nothing is added to a status it was not asked for.* `(source: ui §11)`
7. **Every chip and badge is the one pill; every status column shows a pill** — *a status reads the same in a cell, a sheet header and a board card.* `(source: ui §11b, Pavan 2026-10-09)`
8. **Color is by kind except where the module lets the user choose** (Sales stages, order types) — *the chosen color is kept wherever the value shows.* `(source: ui §11b)`
9. **Render the absence** — *a chip every row carries ("Normal", a status repeating its lane) says nothing.* `(source: ui §10b; 1-components §5)`
10. **A change or cancellation ask is not a status** — *the order stays Unassigned / Scheduled and wears "Awaiting confirmation" / "Awaiting cancellation" until the tenant answers.* `(source: cells.tsx; memory project_customer_portal 2026-10-22)`
11. **CP flags are plain text coloured by level** (red critical · amber warning · plain note) — *Pavan's choice for the Flags column.* `(source: cells.tsx, Pavan 2026-10-13)`
12. **A new module adds its row to the binding table before it ships a badge** — *one table so a hue cannot mean two things.* `(source: docs/unified-view/1-components.md §5)`
13. **Don't style plain text as pills** (products, driver names) — *Pavan rejected that; apply the style only where chips already exist.* `(source: memory feedback_pills_default)`

## Do / Don't
- ✅ `<StatusChip tone={MODULE_STATUS_TONE[status]}>{status}</StatusChip>` with the map built by `statusTones()`.
- ✅ Put the Awaiting pill right after the status pill in the same cell.
- ✅ Keep the label spelling the status out — color is never the only carrier.
- ❌ `tone="processing"` or a ternary of tones written at a call site in Unified View.
- ❌ A dot + coloured word, or coloured text alone, in a status column.
- ❌ A red Canceled, a red type, a red lane that is just a place.
- ❌ A "Change requested" status, lane or filter value.

## Checks
- `status-kinds` — fails a Unified View chip or map that names a tone (scans `prototypes/unified-view`; the Customer Portal is not scanned, and `AwaitingPill` passes `tone="processing"` directly).
- `wcag-contrast` — pill text on its tint; `tokens`.
- By eye: same status, same color across 3PL, Sales, Service, CP; no dots; Awaiting pill opens its card; flags most-serious first.

## Reference
- 3PL › Delivery Orders — Status column, sheet header, board badges.
- Sales › Fuel Orders — chosen stage colors (Sales Settings → Workflow).
- Service Work › Service Orders — Status column, board.
- Customer Portal › Orders — Status column with Awaiting pill, Flags column, Repeats rule pill, board caution strip.
