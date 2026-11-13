# FPDS · 02 Atoms

Single primitives from `src/components/ui/`. Each card uses the spec-card
sections (`_spec-card-template.md`) at `###` level. Values are token names from
[`01-foundations.md`](01-foundations.md); a px size appears only where the code
fixes one.

**Shared by every focusable atom:** focus is `focus-visible:border-ring
focus-visible:ring-2 focus-visible:ring-ring/50` (brand-orange ring); disabled is
`opacity-50` + no pointer events; invalid (`aria-invalid`) is `border-destructive`
+ `ring-destructive/20` (`/40` dark). Controls cast no shadow.

---

# Actions

## Button

`id: atom.button` · `layer: atom` · `code: src/components/ui/button.tsx` · `registry: fpds-button`

### Purpose
The one pressable action. Says what happens next.

### Use when / Don't use when
- Use when a press does something: commit, open, add, export.
- Don't use for a two-state choice (→ `atom.toggle` / `atom.toggle-group`), a chip (→ `atom.pill`), or an add on a table (→ `molecule.hanging-add`).

### Anatomy
Optional leading Lucide icon (16px) · label · optional trailing icon. `asChild` renders the look on another element.

### Look
`rounded-md text-sm font-medium gap-2`, no shadow.

| Variant | Classes |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` — **the CTA** |
| `outline` | `border border-input bg-transparent hover:bg-accent`; dark `bg-fp-field-fill` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | no fill; `hover:bg-accent` (`/50` dark) |
| `destructive` | `bg-destructive text-destructive-foreground` (`/60` dark) — final guarded confirm only |
| `success` | `bg-status-success text-status-success-foreground` — the one act that moves something forward |
| `link` | `text-primary underline-offset-4 hover:underline` |

| Size | Height | Notes |
|---|---|---|
| `xs` | 24px (`h-6`) | `text-xs`, icon 12px |
| `sm` | 32px (`h-8`) | toolbars, dialog footers in panels |
| `default` | 36px (`h-9`) | forms, sheet footers |
| `lg` | 40px (`h-10`) | |
| `icon-xs` / `icon-sm` / `icon` / `icon-lg` | 24 / 32 / 36 / 40px square | icon only — needs `aria-label` |

### States
default · hover (variant hover fill) · focus (ring) · disabled (50%) · invalid (destructive rim).

### Interactions
| Trigger | Result |
|---|---|
| Click / Enter / Space | Runs `onClick` |
| Tab | Focus ring appears |

### Outcomes
The act runs; a toast may confirm it (`molecule.toast`). A primary that cannot act yet stays pressable and says why (pending bar), rather than going dead.

### Data contract
`variant`, `size`, `asChild`, native button props. Emits `onClick`.

### Rules
1. **One primary (`default`) per view; never `bg-brand` as a CTA.** — *Orange is the mark; the CTA is neutral.* `(constitution §2)`
2. **Outline buttons are `bg-transparent`, never `bg-background`.** — *`--background` is the gray app ground; on the white layer it painted 51 gray buttons.*
3. **Destructive fill only on the last, guarded confirm** (armed second press or AlertDialog). Menu rows and row actions color the label only. — *At that point the fill is the warning.* `(DS ui §9)`
4. **A sheet footer's primary is the next act** ("Create order"), never Save / Update / Cancel on an autosaving sheet. `(feedback_ui_rules)`

### Do / Don't
- ✅ `<Button>Create order</Button>` in the footer; `<Button variant="outline" size="sm">` in a toolbar.
- ❌ `className="bg-brand"` on a CTA; a red-filled Delete in a row menu.

### Checks
`tokens`. By eye: one primary per view; icon-only buttons have `aria-label` and a tooltip.

### Reference
3PL › Delivery Order sheet footer (Create order); every list toolbar (Export, Filters).

---

## Toggle

`id: atom.toggle` · `layer: atom` · `code: src/components/ui/toggle.tsx` · `registry: fpds-toggle`

### Purpose
A single on/off pressable — a button that stays pressed.

### Use when / Don't use when
- Use for a single view option that is on or off.
- Don't use for a setting in a form (→ `atom.switch` in a menu, `atom.checkbox` in a table/form); for one of several (→ `atom.toggle-group`).

### Anatomy
Icon and/or label inside a pressable box.

### Look
`rounded-md text-sm font-medium`. `default`: `bg-transparent`; `outline`: `border border-input`. Sizes `sm` 32px · `default` 36px · `lg` 40px (min-width = height). **On is greyscale:** `bg-muted text-foreground`, outline adds `border-foreground/25`.

### States
rest (bare) · hover (`bg-accent`) · on (`bg-muted`, unchanged on hover) · focus · disabled.

### Interactions
| Trigger | Result |
|---|---|
| Click / Space | Flips `pressed` |

### Outcomes
The option it names turns on or off.

### Data contract
`pressed`, `onPressedChange`, `variant`, `size`.

### Rules
1. **Segment and toggle "on" are greyscale — no brand, no accent.** — *Every segment control, every module (Pavan, 2026-10-16).*
2. **Hover and on never look the same.** — *They were pixel-identical once and neither read.*

### Do / Don't
- ✅ Gray on state.
- ❌ `data-[state=on]:bg-brand`.

### Checks
`tokens`. By eye: hover ≠ on.

### Reference
DS showcase › Toggle (no module uses a lone toggle today).

---

## Toggle group

`id: atom.toggle-group` · `layer: atom` · `code: src/components/ui/toggle-group.tsx` · `registry: fpds-toggle-group`

### Purpose
A segment control: pick one (or several) of a few short options that change a view.

### Use when / Don't use when
- Use for 2–5 short scopes on a dashboard or list (line of service, version).
- Don't use for a form field with many options (→ `atom.select` / `molecule.combobox`), or for switching between views of one record (→ `atom.tabs`). Not for line-of-service on lists — that is a filter.

### Anatomy
Root (`type="single" | "multiple"`) · items (`ToggleGroupItem`), joined when `spacing=0`.

### Look
Items take the Toggle recipe, `px-3`. `spacing=0`: inner corners square, first `rounded-l-md`, last `rounded-r-md`; outline items share borders (`border-l-0`, first keeps `border-l`). On = `bg-muted text-foreground` + `border-foreground/25` (outline).

### States
As Toggle; exactly one on for `single`.

### Interactions
| Trigger | Result |
|---|---|
| Click an item | It turns on; the previous turns off (`single`) |
| Arrow keys | Move focus between items |

### Outcomes
The view re-scopes.

### Data contract
`type`, `value`, `onValueChange` (guard empty: `v && set(v)`), `variant`, `size`, `spacing`.

### Rules
1. **Greyscale on state.** `(2026-10-16)`
2. **A single-select group never empties** — ignore the empty value. — *A segment with nothing chosen says nothing.*

### Do / Don't
- ✅ `<ToggleGroup type="single" size="sm" variant="outline">` for Transport / Tank wagon on the dashboard.
- ❌ A brand-filled active segment.

### Checks
`tokens`. By eye: one item always on.

### Reference
3PL › Dashboard (line scope); 3PL › Recurring Orders.

---

# Inputs

## Input

`id: atom.input` · `layer: atom` · `code: src/components/ui/input.tsx` · `registry: fpds-input`

### Purpose
A one-line text or number field.

### Use when / Don't use when
- Use for free text, a number, an email, a phone.
- Don't use for prose (→ `atom.textarea`), a fixed list (→ `atom.select` / `molecule.combobox`), a date (→ `molecule.date-field`), or a read-only value (→ `molecule.copy-value`). Inside an editable table use the `TableCell*` cells, never a bare Input.

### Anatomy
Box · value / placeholder. Leading icon and trailing clear are added by the molecule (`molecule.search-field`).

### Look
`h-9 w-full rounded-md border border-input bg-fp-surface-1b px-3 py-1`, `text-base` → `md:text-sm`, placeholder `text-muted-foreground`; dark `bg-fp-field-fill`. Filled white, not transparent.

### States
default · focus (`border-ring` + ring) · disabled (50%) · invalid (destructive rim) · placeholder.

### Interactions
| Trigger | Result |
|---|---|
| Type | Value changes |
| Tab | Focus ring |

### Outcomes
A value; on an existing record's sheet, autosaved.

### Data contract
Native input props. `autoCapitalize` defaults to `sentences`, `none` for email / url / password / number / tel / numeric `inputMode`.

### Rules
1. **Fields are filled white (`bg-fp-surface-1b`), never transparent.** — *Transparent fields were findable only by their border.*
2. **Fields in a row share the row** (`1fr`/`flex-1`, 24px gap). — *Fixed columns left a grown sheet a third empty.* `(DS ui §10e)`
3. **No helper text under a field.** Only text that reports state or warns of a consequence. — *Said three times, then made standing.* `(feedback_no_unrequested_ui)`
4. **An optional field keeps its empty choice; a required field is marked with the destructive asterisk.**

### Do / Don't
- ✅ `<Input className="h-8">` in a toolbar; full-width in a form row.
- ❌ `w-[240px]` on a field container without `FIXED WIDTH`; a "Enter the customer's name" hint below.

### Checks
`tokens`, `fields-fill`, `microcopy`.

### Reference
3PL › Delivery Order sheet (Order details); every list search (`h-8`).

---

## Textarea

`id: atom.textarea` · `layer: atom` · `code: src/components/ui/textarea.tsx` · `registry: fpds-textarea`

### Purpose
Multi-line prose — notes, instructions, reasons.

### Use when / Don't use when
- Use for notes and free-form text longer than a line.
- Don't use for a single value (→ `atom.input`).

### Anatomy
Box that grows with content (`field-sizing-content`).

### Look
Input's recipe: `min-h-16 rounded-md border border-input bg-fp-surface-1b px-3 py-2`, `text-base md:text-sm`; dark `bg-fp-field-fill`.

### States
As Input.

### Interactions
| Trigger | Result |
|---|---|
| Type / Enter | New line; box grows |

### Outcomes
Text saved with the record.

### Data contract
Native textarea props; `autoCapitalize="sentences"` by default.

### Rules
1. **A section's notes are their own unit below that section's table, inside the same group.** `(feedback_shared_sheet_cards, 2026-10-07)`

### Do / Don't
- ✅ Notes under the Products table, same heading.
- ❌ A notes box in a separate "Notes" card far from what it describes.

### Checks
`tokens`, `microcopy`.

### Reference
Sales › Order sheet (notes); 3PL › Recurring delivery sheet.

---

## Select

`id: atom.select` · `layer: atom` · `code: src/components/ui/select.tsx` · `registry: fpds-select`

### Purpose
Pick one value from a short fixed list.

### Use when / Don't use when
- Use for a short, closed list where search adds nothing.
- Don't use when the list can grow, needs search, a second line per option, an empty choice or create (→ `molecule.combobox` — every list searches by default). In a table cell use `TableCellSelect`.

### Anatomy
Trigger (value + `ChevronDown` at 50%) · content (popper, below trigger) · items (check at right) · optional label / separator / scroll buttons.

### Look
Trigger = `selectTriggerClasses`: `rounded-md border border-input bg-fp-surface-1b px-3 py-2 text-sm`, `h-9` (`sm` `h-8`), placeholder muted; dark `bg-fp-field-fill` / hover `-hover`. Content: `rounded-md border bg-popover shadow-md p-1`, min width = trigger. Item: `rounded-sm py-1.5 pl-2 pr-8 text-sm`, focus `bg-accent`.

### States
closed · open · item focused (`bg-accent`) · selected (check) · disabled · placeholder · invalid.

### Interactions
| Trigger | Result |
|---|---|
| Click / Enter / Space on trigger | Opens below (popper, `sideOffset 4`, `align start`) |
| Arrow keys / type-ahead | Moves through items |
| Enter / click item | Picks it, closes |
| Esc | Closes, no change |

### Outcomes
One value chosen.

### Data contract
`value`, `onValueChange`, `SelectTrigger size`. Width is set on the trigger.

### Rules
1. **The list drops below the field (popper), never over it.** — *Item-aligned covered the field you clicked.*
2. **Anything that passes for a select wears `selectTriggerClasses`.** — *Two triggers a pixel apart read as two controls.*

### Do / Don't
- ✅ Combobox for customers, products, vendors.
- ❌ A Select of 40 customers.

### Checks
`tokens`. By eye: trigger identical to a Combobox's.

### Reference
Sales › Order sheet (short pickers); Rows-per-page in every table footer.

---

## Checkbox

`id: atom.checkbox` · `layer: atom` · `code: src/components/ui/checkbox.tsx` · `registry: fpds-checkbox`

### Purpose
A boolean, or one pick in a multi-pick list.

### Use when / Don't use when
- Use for every boolean in a table or form (Top off, row select, facet options, multi-pick rows).
- Don't use a switch or toggle for a table boolean.

### Anatomy
16px box · `Check` or `Minus` (indeterminate) indicator, 14px.

### Look
`size-4 rounded-[4px] border border-input`; checked / indeterminate `bg-primary border-primary text-primary-foreground`; dark unchecked `bg-fp-field-fill`. Tick is `text-current` so a parent can't gray it.

### States
unchecked · checked · indeterminate · focus · disabled · invalid.

### Interactions
| Trigger | Result |
|---|---|
| Click / Space | Toggles |
| Header select-all | Ticks all; indeterminate when some |

### Outcomes
A boolean value; in a row-adding picker, rows.

### Data contract
`checked: boolean | "indeterminate"`, `onCheckedChange`.

### Rules
1. **Booleans are checkboxes, not toggles.** `(feedback_table_conventions, 2026-10-07)`
2. **Top off: select-all first, then the label, both at the left; row ticks left-aligned under the select-all (Pavan, 2026-11-13).** `(DS ui §10i)`
3. **The tick stays white on the filled box.** — *A muted parent once turned it gray.*

### Do / Don't
- ✅ A checkbox column for Top off.
- ❌ A switch in a table cell.

### Checks
`table-rows` (Top off before Qty). By eye: indeterminate in headers.

### Reference
3PL › Delivery Order › Products table (Top off); every list's select column.

---

## Radio group

`id: atom.radio-group` · `layer: atom` · `code: src/components/ui/radio-group.tsx` · `registry: fpds-radio-group`

### Purpose
Pick one of 2–4 options that each need their words visible.

### Use when / Don't use when
- Use when every option should be read before choosing (fill type, scope of an edit).
- Don't use for long lists (→ `atom.select` / `molecule.combobox`) or view scopes (→ `atom.toggle-group`).

### Anatomy
Group (`grid gap-3`) · items (16px circle, 8px filled dot) · labels.

### Look
`size-4 rounded-full border border-input text-primary`; indicator `size-2 fill-primary`; dark `bg-fp-field-fill`.

### States
unselected · selected · focus · disabled · invalid.

### Interactions
| Trigger | Result |
|---|---|
| Click item / label | Selects it |
| Arrow keys | Moves selection |

### Outcomes
One value chosen.

### Data contract
`value`, `onValueChange`; each `RadioGroupItem value`.

### Rules
1. **No em-dash clauses or sub-labels on options.** — *Ship the label, the value and the control.* `(feedback_no_unrequested_ui)`

### Do / Don't
- ✅ "This order" / "All orders".
- ❌ "All orders — changes every order that…" as the label.

### Checks
`microcopy`.

### Reference
3PL › Delivery Order sheet; Service › Service Order sheet.

---

## Switch

`id: atom.switch` · `layer: atom` · `code: src/components/ui/switch.tsx` · `registry: fpds-switch`

### Purpose
Turn a setting on or off immediately, outside a table.

### Use when / Don't use when
- Use in a menu of settings (card fields) or a settings row that applies at once.
- Don't use in a table cell or for a form boolean that a list compares (→ `atom.checkbox`).

### Anatomy
Track · thumb.

### Look
`default` 18×32px (`h-[1.15rem] w-8`), thumb 16px; `sm` 14×24px, thumb 12px. On `bg-primary`; off `bg-fp-switch-track`. Thumb `bg-background` (dark: on `bg-primary-foreground`, off `bg-foreground`).

### States
off · on · focus · disabled.

### Interactions
| Trigger | Result |
|---|---|
| Click / Space | Flips, applies now |

### Outcomes
The setting changes at once.

### Data contract
`checked`, `onCheckedChange`, `size`.

### Rules
1. **The off track is `bg-fp-switch-track`, never a stroke token.** `(2026-10-21)`
2. **No sub-label under a switch.** `(feedback_no_unrequested_ui)`

### Do / Don't
- ✅ `<Switch size="sm">` in the board's Card fields menu.
- ❌ Switches in a Setting · Value table (use checkboxes).

### Checks
`tokens`, `microcopy`.

### Reference
Lists › Board view › Card configuration menu; 3PL › Recurring rule frequency.

---

## Slider

`id: atom.slider` · `layer: atom` · `code: src/components/ui/slider.tsx` · `registry: fpds-slider`

### Purpose
Choose a value or range on a continuous scale.

### Use when / Don't use when
- Use for a level that is felt rather than typed (Accessibility sliders) or as the track inside a window control.
- Don't use for a delivery window in a form (→ `DeliveryWindowTimeline` unit), or an exact number (→ `atom.input`).

### Anatomy
Track · range · one thumb per value.

### Look
Track `h-1.5 rounded-full bg-accent`; range `bg-primary`; thumb `size-4 rounded-full border border-primary bg-white`, hover / focus `ring-4 ring-ring/50`.

### States
default · hover (ring) · focus (ring) · disabled (50%).

### Interactions
| Trigger | Result |
|---|---|
| Drag thumb / click track | Value moves |
| Arrow keys | Steps by `step` |

### Outcomes
A number or a pair.

### Data contract
`value[]`, `onValueChange`, `min`, `max`, `step`, `minStepsBetweenThumbs`.

### Rules
1. **A slider's value is printed beside it, never only implied by the handle.** — *A value that can only be estimated is distrusted.*

### Do / Don't
- ✅ Value read-out on the label line.
- ❌ A bare slider for a quantity.

### Checks
By eye: value visible.

### Reference
Accessibility panel (Text size, Stroke contrast…); `molecule.time-window-slider`.

---

## Label

`id: atom.label` · `layer: atom` · `code: src/components/ui/label.tsx` · `registry: fpds-label`

### Purpose
Names a field.

### Use when / Don't use when
- Use above (or beside) every field and for a checkbox / radio's words.
- Don't use for section headings or helper text.

### Anatomy
Text · optional required asterisk (`text-destructive`) supplied by the form.

### Look
`text-sm leading-none font-medium`, `gap-2`; disabled peer → 50%.

### States
default · disabled (via peer / group).

### Interactions
| Trigger | Result |
|---|---|
| Click | Focuses / toggles its control |

### Outcomes
—

### Data contract
`htmlFor`.

### Rules
1. **The label is the app's term, not the PRD's.** — *Same data, same control, same words.* `(feedback_ui_rules, 2026-10-13)`

### Do / Don't
- ✅ "Ship-to".
- ❌ "Delivery location (where the truck goes)".

### Checks
`microcopy`.

### Reference
Every sheet field.

---

## Calendar

`id: atom.calendar` · `layer: atom` · `code: src/components/ui/calendar.tsx` · `registry: fpds-calendar`

### Purpose
The month grid inside the date picker.

### Use when / Don't use when
- Use only inside `DatePickerPanel` (via `molecule.date-field`, `DateRangePopover`, `DatePanel`).
- Don't use a bare Popover + Calendar on a screen (→ `molecule.date-field`). Exception: the technician phone app's full-width calendar.

### Anatomy
Nav (prev / next ghost buttons) · month caption · weekdays · day buttons.

### Look
Cell `--cell-size` 32px; days are ghost icon buttons. Single / range ends `bg-primary text-primary-foreground`; days between `bg-accent`; today `bg-accent`; outside days muted. Transparent inside a popover.

### States
day: default · hover · focus (ring) · today · selected · range start / middle / end · outside · disabled.

### Interactions
| Trigger | Result |
|---|---|
| Click a day | Sets the draft (nothing applies until Apply) |
| Arrow keys | Move the focused day |
| Prev / next | Change month |

### Outcomes
A draft date / range inside the panel.

### Data contract
react-day-picker props: `mode`, `selected`, `onSelect`, `month`, `numberOfMonths`, `disabled`.

### Rules
1. **One date picker everywhere** (DS ui §10p, 2026-10-21).

### Do / Don't
- ✅ `DateField` in a form.
- ❌ Popover + Calendar hand-built in a sheet.

### Checks
By eye: no screen imports `Calendar` directly except the picker and the technician app.

### Reference
Lists › date filter panel; 3PL › Recurring delivery sheet (date fields).

---

# Display

## Badge

`id: atom.badge` · `layer: atom` · `code: src/components/ui/badge.tsx` · `registry: fpds-badge`

### Purpose
The DS's low-level chip geometry and the round counter (`BadgeNumber`).

### Use when / Don't use when
- Use `BadgeNumber` for a counter inside a button or nav item; `shape="disc"` only through `atom.code-disc`; `verified` for the verified mark.
- Don't use Badge for a status, tag, flag or "+N" (→ `atom.pill` / `atom.status-chip`).

### Anatomy
Badge: `rounded-full px-2 py-0.5 text-xs font-medium` (+ 12px icon). BadgeNumber: 20px circle, `max` → "99+".

### Look
Variants: `default` primary · `secondary` `bg-chip` · `outline` · `ghost` · `destructive` (`/10` soft) · `verified` (`bg-verified`, white) · `link` · `pastel-*` pairs. Disc: 22px (`size-5.5`), `text-xs font-semibold`.

### States
default · hover (fill /80–/90) · focus.

### Interactions
| Trigger | Result |
|---|---|
| — | Display only |

### Outcomes
—

### Data contract
`variant`, `shape`; `BadgeNumber count max`.

### Rules
1. **Chips and badges are pills** — Badge is not the chip. **Counters inside a button or nav item are `BadgeNumber`, not pills.** `(DS ui §11b)`

### Do / Don't
- ✅ `<BadgeNumber count={3} variant="secondary" />` beside a nav item.
- ❌ `<Badge>Assigned</Badge>` in a status column.

### Checks
`status-kinds`. By eye: no Badge in status / type / tag columns.

### Reference
Nav counters; DS showcase › Badge.

---

## Pill

`id: atom.pill` · `layer: atom` · `code: src/components/ui/pill.tsx` · `registry: fpds-pill`

### Purpose
The chip and badge of the system — a status, tag, flag, type or "+N".

### Use when / Don't use when
- Use for every chip/badge: status (via `atom.status-chip`), a table's Type column (full word), flags (Urgent, Over SLA), "+N".
- Don't use for plain text values (products, driver names), counters in buttons (→ `BadgeNumber`), board-card type initials (→ `atom.code-disc`).

### Anatomy
Rounded box · truncating label. `PillList`: first value pill + "+N" pill (hover card) — prefer `molecule.overflow-chip` in lists.

### Look
`PILL_SHAPE`: `inline-flex h-7 rounded-full px-3 text-xs font-normal`, no border.

| `kind` | Classes |
|---|---|
| neutral | `bg-muted text-muted-foreground` |
| info | `bg-fp-banner-accent-info/10 text-fp-banner-accent-info` |
| caution | `bg-fp-banner-accent-caution/10 text-fp-banner-accent-caution` |
| success | `bg-status-success/10 text-status-success` |
| critical | `bg-status-failed/10 text-status-failed` |

`color` (user-chosen, over kind): `bg-fp-lane-<hue>/12` (yellow `/18`, orange `/15`) with text = hue mixed 55–70% into `--foreground`; `violet` = `bg-accent-violet-soft text-accent-violet-ink`.

### States
default only (display). Pressable pills (+N) get the focus ring from their button.

### Interactions
| Trigger | Result |
|---|---|
| — | Display; a +N pill opens its breakdown (molecule) |

### Outcomes
—

### Data contract
`kind` (`neutral | info | caution | success | critical`), `color?` (`PillColor`), `children`.

### Rules
1. **One pill size, 28px, everywhere.** `(2026-10-09)`
2. **Color by kind; a user-chosen color overrides it** (Sales stages, order types). `(DS ui §11b)`
3. **A table's Type column is a pill with the full word**; the disc's hue carries over via `discTonePill`. `(2026-10-16)`
4. **Apply the pill only where chips already exist** — never turn plain text into pills. — *Pavan rejected that.*
5. **Red only for a warning;** the rose type maps to pink. `(2026-10-16)`

### Do / Don't
- ✅ `<Pill kind="caution">Needs approval</Pill>`, `<Pill color={discTonePill(tone)}>Delivery</Pill>`.
- ❌ `<Pill className="bg-amber-100">`; a red pill for a type.

### Checks
`status-kinds`, `tokens`.

### Reference
Sales › Orders table (Status, Type); 3PL › Delivery Orders (Type).

---

## Status chip

`id: atom.status-chip` · `layer: atom` · `code: src/components/ui/status-chip.tsx` · `registry: fpds-status-chip`

### Purpose
A status word, drawn as a pill in its kind's color.

### Use when / Don't use when
- Use in every status column, sheet header and board card.
- Don't use for tags / types (→ `atom.pill`). `variant="dot"` only for a dense grid where coloured words would shout.

### Anatomy
`text` / `soft`: the pill. `dot`: 6px dot (`aria-hidden`) + neutral `text-sm` word.

### Look
Tone → kind: `success→success`, `processing→caution`, `failed→critical`, `neutral→neutral`, `info→info` (pill classes as `atom.pill`). Dot fills: `bg-status-success`, `bg-status-processing`, `bg-status-failed`, `bg-muted-foreground`, `bg-fp-banner-accent-info`.

### States
display only.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`tone` from the module's map (`X_TONE[status]`, built by `statusTones(kinds)`), `variant`, `color?`.

### Rules
1. **A module declares kinds, never tones;** `statusKind.ts` is the only kind→tone map. — *Authors reaching for swatches made "Assigned" three colors.* `(DS ui §10b)`
2. **A status is its word — no dot beside a pill.** `(DS ui §11)`
3. **A status column always shows the pill, never coloured text alone.** `(2026-10-09)`
4. **Canceled is neutral; Paused is caution; active is info.**

### Do / Don't
- ✅ `const ORDER_TONE = statusTones({ Unassigned: "caution", Assigned: "info", Delivered: "success", Blocked: "critical", Cancelled: "neutral" })`.
- ❌ `<StatusChip tone="processing">` written at a call site.

### Checks
`status-kinds`.

### Reference
3PL › Delivery Orders (Status); Service › Service Orders board cards.

---

## Avatar

`id: atom.avatar` · `layer: atom` · `code: src/components/ui/avatar.tsx` · `registry: fpds-avatar`

### Purpose
A person's picture or initials.

### Use when / Don't use when
- Use for a person: profile, assignee stacks.
- Don't use as a type marker (→ `atom.code-disc`).

### Anatomy
Root · image · fallback (initials) · optional badge · group (`-space-x-2`, `ring-2 ring-background`) · group count.

### Look
`sm` 24px · `default` 32px · `lg` 40px, `rounded-full`. Fallback `bg-accent text-sm text-muted-foreground` (`text-xs` at sm).

### States
image · fallback.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`size`; `AvatarImage src`; `AvatarFallback` children.

### Rules
1. **Show only what was asked** — no avatar added to rows that didn't have one. `(feedback_no_unrequested_ui)`

### Do / Don't
- ✅ Initials fallback.
- ❌ Coloured initials circles per person.

### Checks
`tokens`.

### Reference
Profile screen; Fuel Orders bulk bar.

---

## Kbd

`id: atom.kbd` · `layer: atom` · `code: src/components/ui/kbd.tsx` · `registry: fpds-kbd`

### Purpose
Shows a keyboard key or shortcut.

### Use when / Don't use when
- Use beside a command that has a shortcut (global search).
- Don't use as a chip or tag.

### Anatomy
Key box; `KbdGroup` for combos.

### Look
`h-5 min-w-5 rounded-sm bg-accent px-1 text-xs font-medium text-muted-foreground`.

### States
display only.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
children.

### Rules
1. **`bg-accent`, not `bg-muted`** — *in dark a sheet's popover surface equals muted and the key vanished.*

### Do / Don't
- ✅ `<Kbd>⌘</Kbd><Kbd>K</Kbd>`.
- ❌ Shortcut text in brackets.

### Checks
`tokens`.

### Reference
Global search (⌘K).

---

## Code disc

`id: atom.code-disc` · `layer: atom` · `code: src/components/ui/code-disc.tsx` · `registry: fpds-code-disc`

### Purpose
A type's initial in a 22px pastel circle, where only a letter fits.

### Use when / Don't use when
- Use **only on board cards**.
- Don't use in a table (→ `atom.pill` with the full word and `discTonePill(tone)`).

### Anatomy
Disc (`Badge shape="disc"`) · tooltip with the full word.

### Look
22px circle, `text-xs font-semibold`, `bg-pastel-<hue> text-pastel-<hue>-foreground`.

### States
default · focus (tabbable, shows tooltip).

### Interactions
| Trigger | Result |
|---|---|
| Hover / focus | Tooltip with `label` |

### Outcomes
—

### Data contract
`code` (1–2 chars), `label` (required — tooltip + `aria-label`), `tone` (`pastel-*`).

### Rules
1. **The letter is never the only carrier of meaning** — label required. 
2. **Discs only on board cards; tables show the pill.** `(2026-10-16)`

### Do / Don't
- ✅ `<CodeDisc code="D" label="Delivery" tone="pastel-blue" />` on a card.
- ❌ A disc in a table's Type column.

### Checks
By eye: no discs in tables.

### Reference
3PL › Brokerage board cards.

---

## File type icon

`id: atom.file-type-icon` · `layer: atom` · `code: src/components/ui/file-type-icon.tsx` · `registry: fpds-file-type-icon`

### Purpose
Shows a file's format beside its name.

### Use when / Don't use when
- Use left of every uploaded file's name.
- Don't use as a generic document icon in menus.

### Anatomy
Document outline (folded corner, two lines) 24×28px · format tag over the left edge.

### Look
Outline `text-foreground/70`. Tag `text-[7px] font-bold text-white rounded-[3px]`: PDF `bg-fp-lane-red`; images `bg-fp-lane-violet`; docs/txt `bg-fp-lane-blue`; xls/csv `bg-fp-lane-green`; zip `bg-fp-lane-orange`; other `bg-foreground text-background`.

### States
display only.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`name` (extension read from it).

### Rules
1. **Every file name has its icon.** `(2026-10-14)`
2. **The tag's text carries the format; color only groups.**

### Do / Don't
- ✅ In `DocumentsTable`.
- ❌ A plain `FileText` icon.

### Checks
By eye.

### Reference
Shared Documents table (3PL Delivery Order › Documents & notes).

---

## Metric icon (term icons)

`id: atom.metric-icon` · `layer: atom` · `code: src/components/ui/term-icons.tsx` · `registry: fpds-metric-icon`

### Purpose
The tile a figure card wears, and the one icon per term.

### Use when / Don't use when
- Use `MetricIcon` on metric / figure cards and dashboard units; use `TERM_ICONS` wherever deliveries, products, gallons or ship-tos are named.
- Don't use trend lines on figure cards; don't draw a different icon for a term.

### Anatomy
48px tile · 28px term icon. Icons: `TruckIcon`, `DropIcon`, `DrumIcon`, `PinIcon`.

### Look
Tile `size-12 rounded-lg bg-accent-violet/6 text-accent-violet`; icon `size-7`, `strokeWidth 1.75`, soft fill 22%, liquid levels as a wave.

### States
display only.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`icon` (a `TERM_ICONS` entry).

### Rules
1. **Beside the figure, centred on the figure + change chip + "vs" line, not in the title row.** `(DS ui §10k, 2026-10-20)`
2. **Same term → same icon in every module.**
3. **The card's own design is unchanged — the icon is added.**

### Do / Don't
- ✅ `<MetricIcon icon={TERM_ICONS.gallons} />`.
- ❌ An arrow in a circle; a Lucide `Fuel` for gallons.

### Checks
By eye.

### Reference
Customer Portal › Dashboard (Schedule card figures); Orders overview.

---

## Quiet pattern

`id: atom.quiet-pattern` · `layer: atom` · `code: src/components/ui/quiet-pattern.tsx` · `registry: fpds-quiet-pattern`

### Purpose
The one decorative fill for an empty stretch of a card.

### Use when / Don't use when
- Use as the last child of a card's flex column with leftover space.
- Don't place it in sheets by hand (`RecordSheet` does it when content ≤ 50% of the body); never behind text.

### Anatomy
SVG grid of quarter discs in 2×2 groups; seeded.

### Look
Foreground at 5% and 3% only; scale 2.7; mask: clear top 12% → full at bottom; whole tiles anchored bottom-left. Bleed to the card edges (`-mx-4 -mb-4` in a 16px card).

### States
display only.

### Interactions
| Trigger | Result |
|---|---|
| — | none (`pointer-events-none`, `aria-hidden`) |

### Outcomes
—

### Data contract
`className` (`flex-1`, bleed margins).

### Rules
1. **One pattern, one size, two grays; never a hue.** — *"Keep this pattern consistent across our designs everywhere."* `(DS ui §11d, 2026-10-15)`

### Do / Don't
- ✅ Under Customer Portal "Saved vs market".
- ❌ A new pattern per card; resizing it.

### Checks
By eye.

### Reference
Customer Portal › Dashboard; short create sheets (via RecordSheet).

---

# Overlays

## Tooltip

`id: atom.tooltip` · `layer: atom` · `code: src/components/ui/tooltip.tsx` · `registry: fpds-tooltip`

### Purpose
Names an icon-only control, or why something is disabled.

### Use when / Don't use when
- Use on every icon-only button and on a disabled control with a reason.
- Don't use to repeat visible text, or over a value someone may copy (`molecule.copy-value` has none).

### Anatomy
Trigger · content · arrow.

### Look
`rounded-md bg-foreground px-3 py-1.5 text-xs text-background` (inverted), arrow same fill. Delay 0.

### States
closed · open.

### Interactions
| Trigger | Result |
|---|---|
| Hover / focus trigger | Opens immediately |
| Leave / Esc | Closes |

### Outcomes
—

### Data contract
`TooltipProvider delayDuration` (0); `TooltipContent side / sideOffset`.

### Rules
1. **Icon-only means tooltip + `aria-label`.**

### Do / Don't
- ✅ "Search by column" on its icon.
- ❌ A tooltip that says the button's visible label again.

### Checks
By eye.

### Reference
List toolbar view icons.

---

## Popover

`id: atom.popover` · `layer: atom` · `code: src/components/ui/popover.tsx` · `registry: fpds-popover`

### Purpose
A floating panel anchored to a control.

### Use when / Don't use when
- Use for pickers (combobox, date), breakdowns, filter panels.
- Don't use for a task that needs focus held (→ `atom.dialog`) or a record (→ `atom.sheet`). Not for the Accessibility panel (fixed, because zoom misplaces popovers).

### Anatomy
Trigger · content · optional header / title / description.

### Look
`w-72 rounded-md border bg-popover p-4 shadow-md`; opens fade + zoom-95 + slide from its side; `sideOffset 4`.

### States
closed · open.

### Interactions
| Trigger | Result |
|---|---|
| Click trigger | Opens |
| Outside click / Esc | Closes |

### Outcomes
Whatever it holds.

### Data contract
`open`, `onOpenChange`, `align`, `side`, `sideOffset`.

### Rules
1. **Floating things have a shadow; controls don't.** `(2026-10-14)`
2. **Width capped to the window:** `max-w-[calc(var(--fp-vw,100vw)-2rem)]` for wide panels.

### Do / Don't
- ✅ Combobox list matches its trigger width.
- ❌ `w-[100vw]`.

### Checks
`tokens`.

### Reference
"+N" breakdowns; date picker.

---

## Dropdown menu

`id: atom.dropdown-menu` · `layer: atom` · `code: src/components/ui/dropdown-menu.tsx` · `registry: fpds-dropdown-menu`

### Purpose
A list of actions (or checkable options) from one trigger.

### Use when / Don't use when
- Use for a row's ⋯ actions, Group By, Show / hide columns, a hanging add with a choice of row.
- Don't use to pick a field's value (→ `atom.select` / `molecule.combobox`).

### Anatomy
Trigger · content · items (icon + label) · checkbox / radio items · separators · sub-menus.

### Look
Content `rounded-md border bg-popover p-1 shadow-md`; item `rounded-sm px-2 py-1.5 text-sm`, focus `bg-accent`, icons 16px muted. Destructive item: label + icon `text-destructive`, focus `bg-destructive/10`.

### States
item: default · focus · disabled · checked.

### Interactions
| Trigger | Result |
|---|---|
| Click trigger | Opens below (`sideOffset 4`) |
| Arrows / Enter | Move / run |
| Esc | Closes |

### Outcomes
An action runs; a destructive one asks first (AlertDialog or ✕/✓).

### Data contract
Radix DropdownMenu; `DropdownMenuItem variant="destructive"`.

### Rules
1. **Only Delete's label is red;** never a red fill in a menu. `(DS ui §9)`

### Do / Don't
- ✅ Edit · Share · Delete (red label).
- ❌ "Edit customer" as an option inside a value picker.

### Checks
By eye.

### Reference
Row ⋯ menus on every list; Show / hide columns.

---

## Dialog

`id: atom.dialog` · `layer: atom` · `code: src/components/ui/dialog.tsx` · `registry: fpds-dialog`

### Purpose
A focused task over the page that must be finished or dismissed.

### Use when / Don't use when
- Use for a short decision with inputs (bulk edit, award a quote).
- Don't use for a record (→ `atom.sheet`) or a yes/no (→ `atom.alert-dialog`).

### Anatomy
Scrim · content · header (title, description) · body · footer · close ✕ (top-right).

### Look
Scrim `bg-black/50`. Content `rounded-lg border border-border bg-popover p-6 shadow-lg gap-4`, `sm:max-w-lg` (`size="lg"` `sm:max-w-2xl` for a table body). Title `text-lg font-semibold`; description `text-sm text-muted-foreground`. Footer `align="end"` (cancel / confirm) or `between` (back / forward).

### States
closed · open (200ms fade + zoom).

### Interactions
| Trigger | Result |
|---|---|
| Esc / ✕ / scrim | Closes |
| Footer primary | Commits |

### Outcomes
Committed or dismissed.

### Data contract
`open`, `onOpenChange`; `DialogContent size showCloseButton`; `DialogFooter align`.

### Rules
1. **Use `size`, never hand-set `max-w`.**
2. **A dialog body is not a card** — a table in it is boxed (T2). `(DS ui/7-variants §3)`

### Do / Don't
- ✅ `<DialogContent size="lg">` for a before/after table.
- ❌ `className="sm:max-w-[900px]"`.

### Checks
By eye.

### Reference
Fuel Orders › bulk edit; 3PL › award dialog.

---

## Alert dialog

`id: atom.alert-dialog` · `layer: atom` · `code: src/components/ui/alert-dialog.tsx` · `registry: fpds-alert-dialog`

### Purpose
A yes/no that guards an irreversible or lossy act.

### Use when / Don't use when
- Use for "Discard this order?" on closing an unsaved create, cancelling an order, deleting a record.
- Don't use for row deletes in editable tables (→ inline ✕/✓ `TableRowRemove`).

### Anatomy
Scrim · content · title · description · Cancel (outline) · Action.

### Look
As Dialog but `bg-background`, no ✕. Action defaults to `default`; may be `destructive` (the guarded final confirm).

### States
closed · open.

### Interactions
| Trigger | Result |
|---|---|
| Cancel / Esc | Closes, nothing changes |
| Action | Runs the act |

### Outcomes
The act happens, or nothing.

### Data contract
`open`, `onOpenChange`; `AlertDialogAction variant`.

### Rules
1. **Words are the act:** "Discard this order?" → *Keep editing* / *Discard*. `(DS ui/7-variants, 2026-10-06)`

### Do / Don't
- ✅ Specific verbs.
- ❌ "Are you sure?" with OK / Cancel.

### Checks
`microcopy`.

### Reference
3PL › Delivery Order (close while creating); Sales Settings deletes.

---

## Sheet

`id: atom.sheet` · `layer: atom` · `code: src/components/ui/sheet.tsx` · `registry: fpds-sheet`

### Purpose
The side panel primitive under every record sheet.

### Use when / Don't use when
- Use through `RecordSheet` (the unit), which sets width, depth, steps, footer and autosave.
- Don't build a record screen on a bare `SheetContent`.

### Anatomy
Scrim · content (side `right` default) · header · footer · close ✕.

### Look
`bg-popover shadow-lg`, `border-l border-border` (right). Open 500ms / close 300ms slide. Widths come from RecordSheet: form 600, fit (tables + 34, + 364 with rail), data 1200, compact 510; clamp `100vw − 56px` (112 at level 2).

### States
closed · open · level 1 / level 2.

### Interactions
| Trigger | Result |
|---|---|
| ✕ / Esc / scrim | Closes (a dirty create asks "Discard this order?") |

### Outcomes
—

### Data contract
`side`, `showCloseButton`.

### Rules
1. **Sheet width follows content.** `(DS ui/7-variants §1, 2026-10-15)`
2. **A sheet over a sheet is level 2** — always a strip of the one below shows.
3. **Existing records autosave; no Save / Cancel.**

### Do / Don't
- ✅ `RecordSheet fit={{ tables, rail }}`.
- ❌ `SheetContent className="w-[900px]"`.

### Checks
By eye; the `sheets` eval in `npm run eval`.

### Reference
3PL › Delivery Order sheet; Customer Portal › Order request sheet.

---

# Feedback

## Skeleton

`id: atom.skeleton` · `layer: atom` · `code: src/components/ui/skeleton.tsx` · `registry: fpds-skeleton`

### Purpose
Holds a part's place while it loads.

### Use when / Don't use when
- Use for each part of a loading page in its own place (title, tabs, toolbar, header, rows).
- Don't use a spinner for a page.

### Anatomy
A block sized like what it stands in for.

### Look
`rounded-md bg-accent` + `.fp-shimmer` (a light sweeping left → right, 1.4s).

### States
loading.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
The page arrives in the shape it is about to take.

### Data contract
`className` (size).

### Rules
1. **Shimmer, never pulse; off with reduced motion.** `(DS ui §11c, 2026-10-10)`

### Do / Don't
- ✅ `ModuleSkeleton` layout.
- ❌ `animate-pulse`.

### Checks
By eye.

### Reference
Module switch (ModuleSkeleton).

---

## Spinner

`id: atom.spinner` · `layer: atom` · `code: src/components/ui/spinner.tsx` · `registry: fpds-spinner`

### Purpose
A small in-place "working" mark.

### Use when / Don't use when
- Use inside a button or a toast while one act runs.
- Don't use for loading a page or list (→ `atom.skeleton`).

### Anatomy
`Loader2` icon, `role="status"`, `aria-label="Loading"`.

### Look
`size-4 animate-spin`, current color.

### States
spinning.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`className`.

### Rules
1. **Pages load as skeletons, not spinners.**

### Do / Don't
- ✅ In a pressed "Export" button.
- ❌ Centred over an empty table.

### Checks
By eye.

### Reference
Toaster loading icon.

---

## Progress

`id: atom.progress` · `layer: atom` · `code: src/components/ui/progress.tsx` · `registry: fpds-progress`

### Purpose
How far a known amount has got.

### Use when / Don't use when
- Use for a share of a whole with a known end.
- Don't use for a tank level (→ `molecule.level-gauge`) or a lifecycle (→ `molecule.stage-track`).

### Anatomy
Track · indicator.

### Look
`h-2 rounded-full bg-primary/20`; indicator `bg-primary`.

### States
0–100.

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`value` 0–100.

### Rules
1. **A value that means good/bad gets its own molecule, not a recoloured Progress.**

### Do / Don't
- ✅ Neutral primary bar.
- ❌ `bg-red-500` indicator.

### Checks
`tokens`.

### Reference
DS DataTable (progress column).

---

## Outline shine

`id: atom.outline-shine` · `layer: atom` · `code: src/components/ui/outline-shine.tsx` · `registry: fpds-outline-shine`

### Purpose
A soft band sweeping across an element's outline (or face) to draw the eye without changing it.

### Use when / Don't use when
- Use on AlertBanner CTAs (white) and pills (sweep, `fill`) — added by the banner; on the dashboard "Attention required" tile (red); a nudge on a single button.
- Don't add it from a screen to an AlertBanner (the banner does it); don't use on a ghost button with no outline.

### Anatomy
An absolutely-placed ring (mask) inside a `relative` parent, with a skewed gradient band moving through it.

### Look
Defaults: color `--color-fp-lane-red`, band 5%, thickness 1.5px, inset 0. Banner CTA: white, band 50%, thickness 2, inset −0.5. Pill sweep: `fill`, band 30%, a deeper shade of the pill's hue.

### States
running · still (reduced motion).

### Interactions
| Trigger | Result |
|---|---|
| — | One 1.9s lap every 6s, first after 1.2s |

### Outcomes
—

### Data contract
`color`, `band`, `thickness`, `every`, `lap`, `delay`, `inset`, `fill`.

### Rules
1. **Every AlertBanner pill sweeps (collapsed only) and every CTA it carries shines.** `(DS ui §10l, 2026-10-20)`
2. **Off with reduced motion.**

### Do / Don't
- ✅ Parent is `relative` with a radius.
- ❌ A shine on a primary filled button.

### Checks
By eye.

### Reference
Customer Portal › Dashboard (Attention required); Sales Orders / Portal Orders alert banner.

---

# Structure

## Separator

`id: atom.separator` · `layer: atom` · `code: src/components/ui/separator.tsx` · `registry: fpds-separator`

### Purpose
A structural divider.

### Use when / Don't use when
- Use between toolbar clusters and between menu groups.
- Don't use to separate stepped-form groups (the 40px gap does it) or as a card edge.

### Anatomy
1px line.

### Look
`bg-border`, `h-px w-full` or `w-px h-full`.

### States
—

### Interactions
| Trigger | Result |
|---|---|
| — | — |

### Outcomes
—

### Data contract
`orientation`, `decorative`.

### Rules
1. **Dividers use `--border`, rims use `--fp-outline-1`.**

### Do / Don't
- ✅ Between date scope and view switch.
- ❌ A separator under every field.

### Checks
`tokens`.

### Reference
List toolbar right cluster.

---

## Scroll area

`id: atom.scroll-area` · `layer: atom` · `code: src/components/ui/scroll-area.tsx` · `registry: fpds-scroll-area`

### Purpose
A scrolling region with a slim custom thumb.

### Use when / Don't use when
- Use rarely — the app hides scrollbars by default.
- Don't use to bring back visible scrollbars on lanes or lists.

### Anatomy
Viewport · scrollbar (10px) · thumb.

### Look
Thumb `rounded-full bg-border`.

### States
idle · scrolling · focus (ring).

### Interactions
| Trigger | Result |
|---|---|
| Wheel / drag | Scrolls |

### Outcomes
—

### Data contract
children; `ScrollBar orientation`.

### Rules
1. **No scrollbars by default** — the clipped edge says there is more. — *One visible bar teaches that others' absence means "doesn't scroll".*

### Do / Don't
- ✅ Native overflow with hidden bars.
- ❌ ScrollArea on board lanes.

### Checks
By eye.

### Reference
DS showcase › Scroll Area.

---

## Tabs

`id: atom.tabs` · `layer: atom` · `code: src/components/ui/tabs.tsx` · `registry: fpds-tabs`

### Purpose
Switch between views of one thing.

### Use when / Don't use when
- Use for views of one record or settings page; `line` variant for page-level tabs.
- Don't use for ordered steps (→ `molecule.stage-track` / Steps) or list views (the view row: All + saved views).

### Anatomy
List · triggers · content.

### Look
`default` list: `h-9 rounded-lg bg-accent p-[3px] text-muted-foreground`; active trigger `bg-background border-foreground/25 text-foreground` (greyscale). `line` list: transparent; active `text-selected-foreground` with a 2px `bg-selected-foreground` underline. Trigger `text-sm font-medium`, inactive `text-foreground/60`.

### States
inactive · hover (`text-foreground`) · active · focus · disabled.

### Interactions
| Trigger | Result |
|---|---|
| Click / arrows | Switch view |

### Outcomes
Another view of the same thing.

### Data contract
`value`, `onValueChange`; `TabsList variant`.

### Rules
1. **The segment look is greyscale; only the underline tabs keep the selection ink.** `(2026-10-16)`
2. **Tabs are not steps.** — *Tabs may be read in any order; steps can't.*
3. **Line tabs sit on a full-width hairline, and the tab's content starts 16px under it** (`border-b border-border` on the tabs' row; content `mt-4`). Tabs and their content are ONE unit — inside a sheet they are one child of the body, never two, so the body's 40px section gap never falls between them. `(2026-11-10)`

### Do / Don't
- ✅ Card / Banner switch in the order summary.
- ❌ Tabs labeled "1 Details · 2 Products".

### Checks
By eye.

### Reference
3PL › Delivery Order sheet (summary mode); Sales Settings.
