# Unified View — components

What this app is built from, at which level, and what its colours mean. The
components themselves are the DS's (`docs/ds/ui/6-execute.md` is the
inventory); this file records **how they are assembled and what has been bound
to them here**.

---

## 1. Atomic levels

Five levels. The rule for which level a thing is at is **what it can be used
for**, not how big it is.

| Level | What it is | Lives in | Examples |
|---|---|---|---|
| **Token** | a value with a name, and no opinion about where it is used | `src/index.css` | `--fp-surface-1a`, `--fp-lane-blue`, `--radius-lg` |
| **Atom** | one control, no knowledge of any dataset | `src/components/ui/` | `Button`, `Input`, `Pill`, `Badge`, `StatusChip`, `CodeDisc`, `Slider`, `Checkbox`, `Combobox`, `Popover`, `Tooltip` |
| **Molecule** | atoms arranged to answer one question | `src/components/` | `SheetSection`, `SheetField`, `RailCard`, `MeasureSlider`, `TableCellInput`, `MandatoryStepsBanner`, `LaneChip`, `FilterChips` |
| **Organism** | a molecule set that owns a region of a screen | `src/components/*-layout/`, `prototypes/unified-view/` | `AppShell`, `NavRail`, `NavigationDrawer`, `TopBar`, `ListToolbar`, `ListTable`, `ListFilters`, `BrokerBoard`, `RecordSheet`, `TablePagination` |
| **Screen** | an organism set bound to a dataset | `prototypes/unified-view/*/` | `BrokerOrdersScreen`, `ServiceWorkScreen`, `ServiceOrderSheet` |

**The level tells you where a change goes.** A component that cannot be pointed
at another dataset is not an organism, it is a screen with the wrong name —
which is the defect every fork in this prototype was created by (see
`BrokerBoard`'s header, and the DS follow-up list in it).

### The promotion rule

A molecule written inside a screen and then wanted by a second screen is
promoted — to the prototype's shared layer if it is this app's, to `src/` if it
is the DS's. **Two copies is the signal, not a preference.** Outstanding:
`grouping.ts` / `useGrouping.ts` / `GroupHeaderRow` / `GroupedListFooter` are
still in `prototypes/unified-view/` and belong in
`src/components/tables-layout/`; `MeasureSlider` and `RailCard` are in
`prototypes/unified-view/service/sheet-parts.tsx` and belong beside
`TimeWindowSlider`.

---

## 2. Spacing

**One scale, and it is the 4px grid.** Every gap in this app is a multiple of
4, expressed as a Tailwind step — never a pixel value.

### The gaps that carry meaning

| Gap | Where | Why that number |
|---|---|---|
| **40px** (`gap-10`) | between sheet sections | 2.5× the inner gap, which is what makes a heading read as belonging to the block beneath it rather than floating between two |
| **24px** (`gap-6`) | between the sheet's two columns · between rail cards · between a pair of measure sliders | the widest gap that still reads as "these belong together" |
| **16px** (`gap-4`) | between fields in a row · between a section title and its content · inside a card | the form's unit |
| **12px** (`gap-3`) | between board cards in a lane | |
| **8px** (`gap-2`) | between chips, between a label and its icon | |
| **6px / 4px** | inside a control | |

**The 40/16 pair is a rule, not a rhythm.** The outer gap being 2.5× the inner
is the whole reason a section reads as one block. Anything between them —
20px, 24px — makes the title equidistant from both and the boundary collapses.

### Padding

| Surface | Padding | Note |
|---|---|---|
| Sheet body | `p-4` | the sheet's own frame |
| Section card body | `p-4` | `flush` drops it, for a section that IS a table |
| Rail card header band | `px-4 py-2.5` | |
| Rail card row | `px-4 py-2.5` | |
| Board card unit | `p-3.5` | |
| Board lane | `gap-3 px-3 pb-3` | the DS Kanban's, unchanged |
| Table cell | `px-3`, row height `h-11` | a cell's inset matches the Add row's, so the affordance lines up with the column above it |
| Toolbar / popover menu | `p-1` with `py-1.5` rows | |

**A table inside a card is `flush`.** A table already draws a border, a header
band and a rule between every row; set inside a padded card it is a box in a
box. Flush, the card's border IS the table's border.

---

## 3. Type

The scale is Tailwind's, and the app uses six steps. **Geist** throughout.

| Step | px | Used for |
|---|---|---|
| `text-xl` | 20 | page title |
| `text-lg` | 18 | **the one figure a card exists for** — a quote's total, a job's total. It was 13px and read as the same size as an asset name. |
| `text-sm` | 14 | body, labels, table cells, rail rows — the default |
| `text-[13px]` | 13 | dense card rows and table figures |
| `text-xs` | 12 | secondary lines, unit headings, hints |
| `text-[11px]` | 11 | tick labels, counters, the third level of a card stack |

> **The two arbitrary values are real and are recorded here rather than
> pretended away.** 13 and 11 sit between Tailwind's steps and are used only in
> DENSE surfaces — board cards and table cells — where 14 and 12 are one step
> too far apart. They are not to spread. Anything outside a card or a table
> row uses the named steps.

### Weights

Three, and each means one thing.

| Weight | Means |
|---|---|
| `font-semibold` (600) | a figure, a total, or a unit heading — the thing being read |
| `font-medium` (500) | a label, a name, the first level of a card stack |
| `font-normal` (400) | everything else |

**Hierarchy inside a card is weight and size, never a label.** A card's unit
heading names the unit; the lines under it are levels 1/2/3, and
"Customer / Bray, Raymond and Marks" spends a whole line saying what the reader
already knows from where it sits.

---

## 4. Tokens

Everything is a token. **No raw hex anywhere outside `src/index.css`.**

### Surfaces, in the order they stack

`--fp-surface-base` (the app ground) → `--rail` / `--sidebar` (chrome) →
`--fp-surface-1b` (the content layer) → `--card` → `--fp-surface-1a` (a header
band, a read-out inside a card) → `--fp-card-1` (an inset panel).

Elevation steps **once per level**. A same-weight fill nested on itself is the
commonest surface defect and it reads as a rendering bug.

### Lines

`--fp-outline-1` is the hairline inside a component; `--border` divides rows
and sections; `--fp-outline-2` is the rim that has to survive a hover fill.

### The rest

`--radius-sm|md|lg|xl` · `--brand` (CTA fills, the active tab, the brand mark,
and the search-match highlight at 25% — nothing else) · `--chip` ·
`--fp-table-header` · `--fp-row-hover` · `--ring`.

---

## 5. Colour mapping — the binding table

> **The DS ships hues and binds meaning to none of them.** This is where this
> product says what each one means. One table, so a hue cannot come to mean two
> things in two modules.

### Status kinds → every module's statuses

**The rule is DS §10b** (`docs/ds/ui/2-rules.md`): a status badge is coloured by
what the reader should do about it. This is the binding. The code is
`prototypes/unified-view/statusKind.ts`; each module declares kinds through
`statusTones()` or `kindTone()` and never names a tone. `npm run eval` holds
that. **A new module adds a row here before it ships a badge.**

| Kind | Sales | 3PL | Service |
|---|---|---|---|
| `caution` · waiting on somebody | Unassigned · Sent (quote) | Quoting · Partially Synced · Paused (series) · Invited · Quoted · Quotation received · Products updated · Awaiting Quotation · Credit on hold · Service due · Compliance expiring · Rental ends soon · In maintenance · Limited availability | Parts pending · Linked order · Needs approval · Yet to be reviewed |
| `info` · simply true | Assigned · Scheduled (asset order) · Active / In Use (asset) · Active (customer) | Assigned · Upcoming / Active (series) · Order created · Active (any record) · Available / On rent · Top-off | Assigned · Yet to start · Ongoing · Invoice raised · Active (technician) |
| `success` · done | Delivered · Accepted (quote) | Completed · Verified · Synced · Delivered · Accepted (lane) · Finalized (vendor) · Credit approved · Compliance valid | Completed · Completed — linked · Reviewed · Invoice synced |
| `critical` · a warning | — | Blocked · Declined · Out of area · Not approved · Compliance expired · Over limit · Credit rejected · No tax code · No vendor can fulfil · Out of service · Expired (document) | — *(none yet, deliberately)* |
| `neutral` · neither | Open · Cancelled (asset order) · Inactive · Terminated · Draft / Expired (quote) | Draft · Cancelled · Ended · Expired (series) · Not created yet · Skipped · Inactive · Maintenance OK | Drafted · Cancelled · Inactive |

**Changed by this binding (2026-09-23)** — each was the old channel reading as a
colour: sales *Assigned* green → blue; asset-order and 3PL *Cancelled* red →
grey; 3PL *Verified* amber → green; series *Paused* and delivery *Skipped* red →
amber / grey; the 3PL board's *N Quotations Received* green → amber; service
*Parts pending* red → amber, *Assigned/Ongoing* amber → blue.

> **The technician's mobile app is not bound yet** — it is out of scope until
> the web app is done, and the eval skips it rather than passing it.

### Lane fills → board stages

Ten hues, and a lane's fill is its position in the life of the record rather
than a mood. **Grey starts, red stops, green finishes, purple hands off.**

| Hue | Means | 3PL | Service Work |
|---|---|---|---|
| `grey` | nothing has happened yet | Draft, Cancelled | Open |
| `blue` | out of our hands, waiting on somebody | Quoting | Assigned |
| `cyan` | somebody has it and is working | Assigned | In progress |
| `yellow` | stalled, recoverable | Verified, Partially Synced | Parts-pending |
| `violet` | waiting on an internal decision | — | Needs approval |
| `green` | the work is done | Completed | Approved |
| `purple` | handed to another system | Synced | Completed |
| `red` | stopped | Blocked | Cancelled |
| `orange`, `pink` | unbound | | |

### Pastel discs → record type

A `CodeDisc` is an initial on a pastel circle, always with the full word as its
tooltip and `aria-label` — **the letter is never the only carrier**.

| Tone | 3PL order type | Service work type |
|---|---|---|
| `pastel-slate` | Core | Removal |
| `pastel-blue` | Delivery | Leak check |
| `pastel-amber` | Extraction | Nozzle replace |
| `pastel-rose` | Emergency | Pump replace |
| `pastel-violet` | Asset Movement | Monitor install |
| `pastel-teal` | Pump Out | Preventive / Hose swap |
| `pastel-green` | Transport | — |

> **D and E keep the Sales module's hues on purpose**, so a delivery means the
> same thing in both modules. Emergency is the one two-character code, because
> Extraction already owns the E.

### Pills — every chip and badge

**Chips and badges are pills** (DS §11b, `src/components/ui/pill.tsx`; Pavan,
2026-10-09). Every status cell in every list, every sheet-header status, every
board-card badge, tag and "+N" draws the one pill recipe. `StatusChip` draws it
too, for `text` and `soft` alike, so no status column shows coloured text alone.

| Pill | Means |
|---|---|
| `kind` from the table above | a status — the same kind is the same colour in every module |
| `kind="critical"` | the top priority only — Urgent, Emergency · Over SLA |
| `kind="caution"` | Needs approval |
| `kind="success"` | the one placing anybody acts on — "Best price" |
| `kind="neutral"` (default) | a neutral fact — Recurring, Rental, a tag, a skill, a middling priority, "+N" |
| `color` — chosen | **Sales only**: a stage's or an order type's colour picked in Sales Settings → Workflow; kept in the table, the map and the sheet header. 3PL's Asset Order route chip is `violet`, matching its M disc |

**Not pills:** button and nav counters (`BadgeNumber`), the board lane's count,
code discs (`CodeDisc`), and the filter shelf's removable chips (controls). The
technician's mobile app keeps its own badges until it is in scope.

**Render the absence.** A priority of Normal, a status repeating its own lane
heading, a placing on a board of one — a chip every row carries says nothing.

---

## 6. The components this app adds

Beyond the DS inventory. Each is listed with what it is FOR, because that is
what decides whether a new screen should reuse it.

| Component | Level | For |
|---|---|---|
| `ListToolbar` | organism | the one row of list controls: search · filters · date scope · view switch (only with 2+ views; `boardView` is opt-in) · column tools (table only; Search by column = the filter-row toggle) · card fields (board only) |
| `ListTable` | organism | every table in the app — movable, resizable columns, a pinned open-chevron, an optional column-filter row |
| `ListFilters` / `FilterChips` | organism | the facet panel that stages until Apply, and the shelf of what is currently on |
| `FuelOrdersViewBar` | organism | presets · saved views · the create menu · export |
| `BrokerBoard` | organism | every board in the app (forked from the DS Kanban — see its header for the DS follow-ups) |
| `RecordSheet` | organism | every side sheet: sizes, header, stage bar, the three footer slots |
| `DateRangeFilter` | molecule | the date scope every list carries |
| `MeasureSlider` | molecule | one MEASURE on one handle — hours, miles. A quantity you size, never a moment you choose |
| `Combobox` of `TIME_OPTIONS` | atom | a moment — an arrival, a window edge. A picker, not a track |
| `RailCard` / `RailRow` | molecule | a read-only card in a sheet's right-hand rail |
| `PendingStrip` (+ `attend`) | molecule | what the footer's act is waiting on, one item at a time — pressable, and it takes you to the section. **Shared by every sheet that has one.** |
| `StageBar` | molecule | where the record is in its life, under the sheet header (chevrons — no longer on order detail pages) |
| `StageTrack` | molecule | the order detail page's stage: dots on a line — passed stages green with a white tick on a green line, the current stage a brand-outlined pill with its name; pinned at the top of the form column |
| `FormStepsNav` / `FormStep` / `SteppedFormBody` | organism | the stepped form — step column, long scroll, pending at the foot (`components/side-sheet/form-steps.tsx`) |
| `OrderMapView` | organism | the map alternate of a list whose records have a place |
