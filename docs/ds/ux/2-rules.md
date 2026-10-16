# UX · Rules & behaviour  *(canonical)*

The normative rules for structure, flow, and grouping. **Single source** — the
Do's/Don'ts, Common mistakes, and Checks in this folder derive from these.

## Shell & spacing
- **Tier-0 global top bar:** a full-width app-chrome band across the very top,
  above the rail + content (`bg-background`, bottom `border-border`, ~48px). Carries
  the **brand logo** (left), **global search** (⌘K, centered), and **notifications
  + account menu** (right). Exactly one, app-level (see L1).
- **Tier-1 rail:** 52px icon rail (`bg-rail`), flush with the background, hover-
  expands to a 256px overlay that **stays `bg-rail`** (colour unchanged on expand).
  One item per top-level screen. **Navigation only** — the brand logo lives in the
  top bar; a **module switcher** sits at the top of the rail.
- **Tier-2 drawer (optional):** contextual sub-nav for the active rail item, a
  `rounded-lg bg-sidebar shadow-fp-surface` panel (256px). It is where **section
  headings** and **collapsible sub-categories** live — `NavigationDrawer`
  renders a group's `label` as a heading and an item's `children` as a
  dropdown. Present it only when the active rail item genuinely has a second
  level; where it does not, omit it and let the content layer take the width.
- **Content layer:** fills the rest — `rounded-md bg-fp-surface-1b shadow-fp-surface`,
  **no outer border**. A compact header (L2), then a scrolling body.
- **Spacing laws:** **8px** gaps between rail ↔ drawer ↔ content + an **8px** outer
  margin (`p-2` + `gap-2`); **16px** inset inside the content-layer body.

## Side-sheet anatomy
- **A SIDE SHEET WITH EDITABLE FIELDS AUTOSAVES. Always, and whether it is
  creating or editing.** This is the default, not a choice per sheet. A reader
  who has to remember to press Save is a reader who loses work, and a record
  that is half-filled is still worth keeping — a service call somebody started
  typing and abandoned is a service call, and the next person can finish it.
  Three consequences, and all three are part of the rule:
  - **Say it out loud.** `useDraftSaveState` + `DraftStatusChip` beside the
    title: `saving` while a change settles, `saved` once it has, nothing at all
    before the first keystroke. A sheet that keeps a draft silently is one
    people behave as though it does not — they finish fields they meant to
    return to, and they hesitate to close. The feedback IS the feature.
  - **Cancel comes off.** "Cancel" promises to undo, and a sheet that has
    already kept everything typed cannot keep that promise. Close is the honest
    exit.
  - **There is no Save button, and no `Update`.** The footer's primary is the
    NEXT ACT on the record — the one thing that moves it on from where it is.
    A primary that says "Update" on a sheet that has already updated is a
    button for a job that is done.
- **CREATE AND EDIT ARE THE SAME SHEET.** `mode="create"` swaps the title and
  the primary's label and the caller seeds a blank draft; everything else is
  the edit sheet. One layout to learn, and no create form that can drift from
  the record it makes. A separate create screen is how two descriptions of one
  record come to exist. (Promoted from Unified View, 2026-09-22.)
- **A SHEET OPENED OVER A SHEET TAKES THE GAP TWICE** — `level={2}`, so
  `100vw − 112px`. The 56px is what tells a reader a sheet is over something; a
  second sheet at the same inset covers the first exactly and reads as the SAME
  sheet having changed its contents. The extra 56 leaves a strip of the sheet
  underneath showing, which says "there is one of these behind this one" in the
  only language the stack has. (Added 2026-09-22.)
- **A MEMBERSHIP GATE LIVES IN THE PICKER, AND NOWHERE ELSE.** When an earlier
  choice decides what may be added — a partner's service area deciding which
  ship-tos exist — the picker offers nothing outside it, and **its empty state
  names the gate**: "Nothing matches inside this partner's area" is a different
  sentence from "No results", and only one of them tells the reader why. A gate
  enforced after the press, by an error, is a gate that let somebody do the
  work first.
  - **A COLLISION IS FLAGGED, NOT BLOCKED.** Something already claimed
    elsewhere shows the clash inline on its own row, and its add drops from
    `default` to `outline` — still pressable. The system knows the fact; only
    the person knows whether it is a mistake. Blocking here is the system
    overruling a judgement it does not have the information to make.
  (Both promoted from Unified View, 2026-09-22.)
- **The width follows the content** (Pavan, 2026-10-15 — replaces the fixed
  560 / 864 / 1120 caps). A form of fields is **600**. A sheet carrying tables is
  as wide as its widest table's columns at a comfortable width (`CELL`), plus
  padding, plus the rail beside it — never under 600. Every order sheet —
  3PL Delivery Order, Service Order, Sales Order / Quote, the portal's Order
  Request — fits its tables plus its rail; the form side never drops below a
  600 form's. A
  DATA-INTENSIVE record's detail (many fields, several related tables) is
  **data** — 1200, fields three across — so it reads easily. A sheet sized
  for more than it holds reads as empty.
  DS ui/7-variants §1.
- **The gap is 56px and it is the one constant.** Every size clamps to
  `100vw − 56px`, so no sheet reaches the edge and none overflows a small
  screen. Changed from 60 on 2026-09-21; one number, every sheet, every nested
  drawer.
- **A creation sheet has no right rail** (Summary · Associated records ·
  Activity) until the record exists. Its width follows the same content rule
  — the 756 floor is gone (Pavan, 2026-10-15).
- **Width is per STEP, not per sheet.** A sheet is only as wide as what is
  currently in it: a form of stacked fields must not inherit the width its
  pricing tables needed. `BulkEditDialog` already does this — `default` while
  you pick, `lg` for the summary — and a two-step sheet does the same. The
  symptom of getting it wrong is a heading that wraps onto a second line and
  stops sitting over the column it names, which reads as though the headers
  have slipped; a heading too long for its column is a column that is too
  narrow, so `TableRequiredLabel` never wraps and the fix belongs in the
  colgroup.
- **`full` FILLS — `100vw − 56px`, no cap** — for the intense forms only, and
  for any sheet while its step column shows. The rail is fixed at 340px plus a
  24px gap; everything else belongs to the form.
- **THE TWO-COLUMN SHEET, AND THE ONE RULE THAT DECIDES A CARD'S SIDE: can you
  type into it?** Editable sections go left, in the sequence you fill them.
  What the record HAS BECOME goes right — derived, read-only, true whether or
  not anyone is looking. Once an editable number and a computed one share a
  column they look identical and the reader stops knowing which is which.
  - The rail is `<aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0">`
    inside `grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]`.
  - **It stays put while the form scrolls.** The rail answers questions the
    reader has while looking at ANY part of the form; scrolled away with the
    sections it describes, a total is only visible next to the tables that
    produce it, which is where it is least needed.
  - It folds to one column below `lg`, where a 340px rail beside a form is two
    columns of nothing.
- **THE FOOTER HAS THREE SLOTS, and each answers a different question.**
  - `footerBanner` — a fixed strip spanning the sheet, directly above the
    footer: **what the primary is waiting on.** The reason a button is dead
    belongs beside it, and beside it there is room for a clause, not a list.
  - `footerAside` — decisions taken at the moment of committing (flags, the
    second outcome of the same act). They stay in view however far the body has
    scrolled.
  - `footerPrimary` — **the next act, and only ever one.**
- **THE PRIMARY IS A LADDER, NOT A SAVE.** Whatever the stage, it names the ONE
  thing that moves the record on from where it is, and it changes as the record
  does. Two consequences:
  - **The label is the ACT, never the state.** "Waiting on partners" on a
    button asks the reader to press a fact. What has not happened yet goes in
    the banner or the tooltip; the button says what pressing it does.
  - **A rung that cannot be taken is disabled, and says why on the press** —
    see the interactions rules on the disabled primary. A clause standing
    permanently beside the button is a sentence read on every visit, including
    the ones where nothing is wrong.
- **WHAT THE RECORD IS MISSING GETS A STRIP, NOT A LIST.** `PendingStrip`
  in `footerBanner`: one outstanding item at a time, with a counter and chevrons
  to step through them, so three missing fields cost one line rather than three.
  Each label is the INSTRUCTION — "Choose a customer", not "Customer" — because
  the reader is being told what to do, not what they are looking at. When
  nothing is outstanding it says so, in the success channel, rather than
  disappearing: an empty strip and a satisfied one are different states.
  An exception that STOPS the work (a hold, a credit block) takes the strip
  instead — it is the thing the reader has to act on, and the fields wait
  behind it.
  - **The word "Pending" does not move.** It is the strip's subject and it is
    true of every item under it; stepping swaps only the item. A label that
    changed with the content would make the reader re-read what KIND of line
    this is on every press.
  - **The item is pressable, and pressing it takes you there.** A banner that
    names a missing field and cannot reach it is a label for a hunt. The press
    scrolls the section into view and **blinks its outline once** — after a
    scroll the eye is on the movement, not on the thing that moved, and "it is
    this one" is a different statement from "here is some of the form".
    **Once, not twice** (changed 2026-09-22): two flashes is a thing asking to
    be watched, one is a thing pointing at itself and then getting out of the
    way — and the reader is already looking, because the scroll took them
    there. The ring leaves no trace, because nothing about the record changed.
  - **A thing that is not one box flashes a FILL, not an outline.** A column of
    a grid is a stack of separate cells, and an outline round each of them is a
    ladder rather than a column. Every cell carries `data-blink="<name>"` and
    they flash together — `blinkGroup`, `.fp-attention-fill`. (Added
    2026-09-22.)
- **A FORM'S STEPS AND A RECORD'S STAGE LOOK THE SAME (Pavan, 2026-10-16).**
  Every stepped create form (the DS `Steps` / `SheetSteps`) draws the same
  `StageTrack` as an order's detail page — done green with a white tick on a
  green line, the current step a BLACK-rimmed pill (green is done, black is
  in progress — Pavan, 2026-10-16), the rest
  hollow — drawn as RINGS by default, on create forms AND on a record's
  detail track, every module (Pavan, 2026-10-16 — the recurring rule's look;
  no rule under the track) — only COMPACT (the steps 48px apart, box to box, so it reads evenly
  whichever step is the wide pill) and PRESSABLE. **A stepped create form is
  ONE vertical scroll** (Pavan, 2026-10-16): every step's section is on the
  page, the track marks the one at the top of the view, pressing a step
  scrolls to it, nothing is gated — fill in any order; the create act is live
  once the required fields are, and the pending strip says what is missing.
  A detail page's track stays read-only and spread end to end.
- **ORDER DETAIL PAGES DRAW THE STAGE AS A TRACK (Pavan, 2026-10-05).**
  `StageTrack`: evenly spaced dots end to end on one line — a passed stage a
  16px GREEN disc with a WHITE tick on a GREEN travelled line, a stage ahead
  a hollow 12px dot, names 8px under the marks (2026-10-06) — and the current
  stage an outlined pill carrying its NAME with a BRAND-colour rim and label on a very light brand wash (10%;
  Pavan, 2026-10-16: done is green, in progress the brand colour; no count). Every other name sits under its dot on one baseline.
  In a stepped sheet it lives IN THE FORM COLUMN, pinned at its top
  (`data-form-sticky`, which the step list allows for), so it spans the form
  only and stops before the cards. The status chip beside the order number
  goes (`DraftStatusChip showStatus={false}`) — the track already says it.
  In the header that remains, anything about the order (Urgent) sits next to
  the number and the save state ("Draft saved") is always last.
- **The strip under the header is a STAGE BAR, not a stepper.** `StageBar` —
  one line of chevrons, three tones (behind / here / ahead) and a fourth only
  for a terminal exit. A stepper is a form split into parts you move between; a
  stage bar is a statement about the record that the reader does not author.
  Steps are numbered because you take them in order; stages are not, because the
  record takes them and you are watching. The one place everybody looks first
  must carry the fact everybody opens the record to learn — how far along is
  this — and not a table of contents. It scrolls rather than shrinks: a stage
  cut to four characters is worse than one you scroll to, and a chevron clipped
  mid-word says "there is more" without a scrollbar — which is the app-wide
  rule: **no scroller anywhere shows a bar, on either axis.** A single visible
  one teaches the reader that the absence of a bar means "this does not
  scroll". It may also be the navigation, where a stage has a screen its work
  is done on.
- **A section is a CARD.** `SheetSection` draws a bordered block with its title
  in a tinted header band, and that is the default — `variant="plain"` (heading
  over fields, no box) is the exception, for a sheet that is one continuous list
  rather than a set of groups. A sheet is a stack of questions about different
  things, and gaps alone were carrying the whole job of saying where one subject
  ended and the next began: at 40px they did it only while nothing in a section
  grew, and a section holding a table or a five-row picker swallowed the
  boundary. The border says it at any length. The title moves into the band
  because a heading inside a bordered block that shares the block's fill reads
  as the first row of content rather than as the name of what follows.
  **`shrink-0` is load-bearing on the card** — the sheet body is a flex column
  and `overflow-hidden` switches a flex item's automatic minimum size from its
  content to zero, so without it the whole card collapses to its 2px of border.
- **Section rhythm — 40 / 16.** Sections sit **40px** apart (the sheet body's own
  gap); on the `plain` variant a section's title sits **16px** from its content.
  The card variant needs neither number — the band's own edge is the separation
  — but the 40 between cards is unchanged.
  The outer gap being 2.5x the inner is what makes a heading read as belonging to
  the block beneath it. Measured alternatives: at **20** the title sits almost
  equidistant from the group above and below and stops binding to either; at **12**
  and **8** it welds to the first field and the whole section boundary rests on the
  40, leaving no room to tighten the outer gap later. Sections take the default —
  a per-instance gap is how a sheet drifts from the system.
  **The 16 is measured from the TITLE'S OWN LINE, not from a padded row around
  it** — which is why `SheetSection`'s heading row has no height of its own. It
  once had `min-h-7` (28px) around a 20px line, and `items-center` split the
  spare 8px evenly, so what anyone could see between the words and the content
  was **20px** — **22px** in a section whose heading also carried a 32px action.
  The rule said 16 and the screen said 20: the row was padding itself and calling
  it rhythm. An ACTION taller than the title hangs off the line instead of
  pushing the content down — its wrapper is fixed at the title's 20px and
  centres a taller child, which overflows the box without growing it. That holds
  for any control put there, so the 16 cannot drift again the next time a
  section gains an action. **Measure from the text, and measure it on screen.**
- **HELPER TEXT IS NOT A DEFAULT. IT IS EXCEPTIONAL, AND IT IS NOT A GUIDE.**
  (Pavan, 2026-09-23 — said more than once before it was written down, which
  is the reason it is written down.)
  - **A line of prose under a field is allowed for a STATE**: something is
    missing, something is wrong, something disagrees with something else, or a
    value came from somewhere the reader did not put it. Those are facts about
    THIS record at THIS moment, and they appear only while they are true.
  - **It is NOT allowed to explain how the field works.** "Timed from the
    moment work starts, or type it here." "Leave unassigned to route to the
    yard team's queue." Those teach the control, and **a control that needs
    teaching under every instance is a control that is wrong** — the label and
    the placeholder carry it, or the design does.
  - **Instructional copy is added when it is ASKED FOR, never on the way
    past.** A designer adding one line per field is adding a paragraph to the
    screen without ever deciding to.
  - **The sanctioned place for an explanation is behind an affordance** —
    `SheetSectionNote`, a popover on click. Read at the moment somebody
    wonders, which is rarely the moment they first arrive.
  - **A settings screen is the exception that proves it**: there, explaining
    what an option does IS the content, not a gloss on it.
- **A FIGURE HAS A NAME.** A number at the edge of a card, level with the
  fields that produce it, makes the reader work out which of them it is the
  product of. Label it — `Total`, `Estimated`, `Owed` — in the muted channel,
  with the figure in the foreground one. (Added 2026-09-23.)
- **Helper text is 4px from its control**, not at the field gap — see
  `interactions/2-rules` §2b.
- **A table header has its own ground** — `bg-fp-table-header`, never
  `bg-fp-surface-1a`. In dark the inner panel already differs from the content
  layer so the header read; in light both are `#ffffff` and the header row had
  nothing but its hairline, and a header that is only a line stops being a header
  the moment the first row has a line too. The token is the faintest step the DS
  owns (`--fp-card-3`, #fafafa in light) and it sits ABOVE the row hover
  (`--fp-card-2`, #f4f5f8), so hovering a row still darkens against the header
  rather than matching it. Totals rows in a `tfoot` take the same fill: they are
  the header's counterpart at the other end.
- **Removing an optional section is a MINUS, never a bin** (`SheetSectionRemove`).
  A bin says a record is about to be destroyed; turning an optional section off
  destroys nothing — it collapses back to the "Add …" box it came from and is one
  click to restore. The two glyphs look alike at 16px and mean opposite things
  about whether the click can be taken back, so the bin stays where a row really
  does go: the delete at the end of a table ROW. The control is muted until
  reached for, coming to full contrast and sliding its label out on hover or
  focus — a bare glyph beside a table of rows reads as though it might remove a
  row, and the label is what makes it safe.
- **Confirm only when there is something to lose.** `SheetSectionRemove` takes
  `hasContent`: with rows filled in, the click opens an AlertDialog — *"Remove
  peripherals? Everything added here will be erased. This cannot be undone."* —
  and on an untouched section it simply closes it. A dialog over an empty table
  teaches people to dismiss dialogs without reading them, which is the habit that
  makes the one that matters useless. The CALLER answers `hasContent`, because
  only it knows what "filled in" means for its own rows: a starter row of blanks
  is not content, and neither is a prefilled default (the Load Order's product,
  the custom item's unit) that nobody chose.
- **Footer flags.** A decision about the RECORD (recurring, and the cadence it
  reveals) stays in the section it changes. A decision about the ACT of submitting
  (urgent, get a signature) rides in the sticky footer, in view at the moment of
  committing however far the body has scrolled.
- **Derived values are READ-OUTS, not disabled fields.** Facts that arrive with a
  choice made above them — a ship-to's coordinates, a contact's phone and email —
  render as a bordered card beside or beneath their source, never as an input.
  A disabled input still looks like a field promising an edit, and its dimming
  makes the value the hardest text in the section to read. Give each value its own
  copy button where it is something people carry elsewhere (a number to a dialler,
  an address to a mail client) — one control over a pair hands over both.

## Forms — an optional field can be emptied again

**Every optional picker offers its empty choice, first in the list, named for
what it means — "No asset", "No technician".** (Pavan, 2026-09-25.) A field that
starts empty must be able to go back to empty: once something is picked, the
list without an empty choice leaves no way to say "none" except deleting the
row or the record. `Combobox` and `TableCellCombobox` take `clearLabel` for
this. A **required** field gets no empty choice.

**A new record's footer may carry "Save as Draft".** (Pavan, 2026-09-25.) The
sheet still autosaves; on a record that is still a draft, *Save as Draft* is
the outline secondary to the LEFT of the commit act (e.g. *Move to Assigned*),
and it closes the sheet with the record parked as a draft. It is the one
exception to "no Save" in Side-sheet anatomy, and it exists only while the
record is a draft.

## Forms — like inputs are a table by default (Pavan, 2026-10-07)

**Whenever a form asks for the same kind of value more than once** — lines,
charges, rates, assets, contacts — it is an EDITABLE TABLE (the boxed unit,
ui §10f), not a row of separate fields. Every value cell is editable in
place. **A choice that qualifies a value lives INSIDE that value's cell** — a
unit ($/gal · $ · %), a currency — as a compact menu at the cell's end, never a
toggle or a second field beside it. Applies to every module, without being
asked; a stack of fields for a repeated thing is the exception and needs a
reason. First built: the Quote's Pricing breakdown (Margin · Fees · Tax, unit
in the Value cell).

**A unit is not a yes/no (Pavan, 2026-10-13).** The in-cell menu is for
several ways of STATING the same number. A choice that REPLACES the number —
top off, TBD, "decided later" — is a yes/no, so it is a **named checkbox
column** (interactions T5), the number cell shuts while it is ticked, and the
typed number is kept but never counted (T3). Fuel lines: **Top off**, as the
3PL Delivery Order. *Why this line exists:* this paragraph used to list "a
fill type" as an in-cell unit, and the Customer Portal's first order sheet
followed it and shipped a "Gal / Fill to full" menu where every other module
has the Top off checkbox.

## Same data, same control — look before building (Pavan, 2026-10-13)

**Before building any field, table or column, find where the same data
already lives in a built module and reuse its control, columns, order and
words.** A fuel order line is the 3PL Delivery Order's line table (Top off ·
Asset · Product · Qty (gal)); a delivery window is the `TimeWindowSlider`; a
recurring order is the "Recurring order" checkbox with Frequency beside it.
**A PRD's or reference's wording does not replace the app's term** ("fill to
full" in a PRD is Top off here). A new pattern is only right when no module
has the data yet — and then it is named in the reply as new, so it can be
ruled on, never shipped silently.

## Record sheets — one summary card, one activity card, everywhere (Pavan, 2026-10-07)

**What a form computes is shown in the SUMMARY CARD** — the 3PL order sheet's
"Quotation summary" shell (tinted frame, title, inner card of label · value
rows, the headline figure last). **The record's history is the ACTIVITY
CARD** — the 3PL rail card with the timeline (mark, what changed, then who ·
when). Every module's record sheet uses these two shared cards; never a
bespoke summary block or activity list. **A section's free text (notes) is its
own unit, outside the section's table but inside the same group** — under the
table, same heading. Applies without being asked.

## Side by side, lined up (Pavan, 2026-10-14)

Cards that sit in one row are the same height, and what repeats across them
lines up: a chart in each fills its card, so every **x-axis sits on the
cards' foot** whatever stands above it (a legend in one, none in the
other); figure rows share a height with their figures on the bottom; bars
that mean the same kind of thing share a height and a top. Check it by
measuring, not by eye.

## Tables — one row is always there (Pavan, 2026-10-14)

A table in a form or sheet never shows an empty-state message in place of
its rows. With nothing in it, it still holds **one row**:

- **Editable table** (assets, lines): a blank row, ready to type into. It
  becomes a record only once something is entered — until then it is not
  checked by the pending strip and not saved, and it has no remove or log.
- **Documents table**: the empty row IS the upload — "Upload a document",
  pressing anywhere on it opens the file picker. Where the reader cannot
  upload, the row says what will arrive (3PL: "A BOL arrives when…").

## Documents — the format icon beside every file (Pavan, 2026-10-14)

Every uploaded file's name has its **format icon** on the left —
`FileTypeIcon` (`src/components/ui/file-type-icon.tsx`): a document outline
with a tag that names the format (PDF, PNG, SVG, JPG, DOC, XLS, CSV…). The
tag's colour groups the family (PDF red · images violet · documents blue ·
sheets green · archives orange · other ink); its text carries the format, so
colour is never the only cue. One documents table everywhere —
`prototypes/unified-view/DocumentsTable.tsx`: Document (icon + name) · Added
· By · download. **No Kind column** — the format icon says what it is.

## Tables — full width, checkboxes, delete on hover (Pavan, 2026-10-07)

- **A table takes the FULL content width.** No `max-w-*` cap on a page or
  section that holds a table; settings pages included. A table squeezed into
  a column with empty space beside it is a bug.
- **Every cell is editable in place** — names, sections, types included; a
  type or a fixed choice is a dropdown in the cell.
- **Booleans in a table are CHECKBOXES**, never switches/toggles.
- **Delete is its own last column, shown only on row hover** (and focus),
  with the ✕/✓ confirm (§10f). Rows that cannot go show nothing there.
- **Every reorderable row has a handle** — never a row without one.
- A list of single settings (Preferences) is a table too: Setting · Value.

## Mobile — the first five rules

Added 2026-09-23, from the technician's app, which is this system's **first
phone product**. Everything else in these documents assumes a pointer and a
wide viewport; none of it was written down as an assumption, which is how a
desktop rule comes to be applied to a phone by accident.

**These five are what one app settled.** They are not a mobile design system;
they are the floor, and the next phone screen either follows them or says why.

1. **ONE THING PER SCREEN.** A phone has no room for a form and its context at
   once, so a screen asks one question and the answer moves you on. The side
   sheet's stack of sections becomes a sequence, not a scroll — a scroll nobody
   reaches the end of is a form nobody finishes.
2. **THE ACT IS PINNED TO THE BOTTOM, FULL WIDTH.** The desktop rule holds —
   the primary is the next act and there is only ever one — and what changes is
   where it sits: the one place a thumb reaches without regripping. A second
   act goes ABOVE it, full width too, because two half-width buttons are two
   targets neither of which is comfortable.
3. **NOTHING DEPENDS ON HOVER.** There is no hover. Every state a control has
   must be reachable by press, and anything the desktop app reveals on hover —
   a label sliding out of a collapsed add, a row's delete — is permanent here
   or it does not exist.
4. **TARGETS ARE 44px** (`h-11`, `size-11`). Gloved hands, a truck cab,
   sunlight. A floor, not a preference.
5. **BACK IS IN THE HEADER, AND IT IS THE ONLY WAY BACK.** There is no browser
   chrome to escape with, so every screen past the first carries one.

**A phone product gets its own shell, not the app's.** The rail, the drawer and
the top bar are a desktop shell; a phone does not get a 56px rail. And when a
phone product is shown INSIDE the desktop app for review, it renders in a
device frame rather than stretching — stretched it stops being the thing it is,
and the first question anybody asks is about the layout instead of the flow.

## Layout laws

**L1 — Everything lives in the AppShell.** Every app screen is the global top bar
(Tier-0) + rail + optional drawer + one content layer. The **global top bar is
app-level chrome** — exactly one, full-width (brand · global search · account).
Beyond that one bar: no *page-owned* top chrome and no *per-screen* second
top-bar. (A lone standalone view may omit the shell but still uses the
surfaces/tokens.) *(Supersedes the archived L1 — see bottom.)*

**L2 — Compact content header (default).** The content-layer header is compact
(ClickUp-style): the **breadcrumb path doubles as the title** — no separate big
title line, and **no bottom divider**. The tab row and the search/filter/action
toolbar sit **~12px** directly beneath. Global chrome belongs to the Tier-0 bar
(L1) — never add a per-screen full-width top-bar. *(Supersedes the archived L2 —
see bottom.)*

**L3 — Toolbar: filters left, actions right.** Filters are a left-aligned group of
identically-styled controls; view switches and the **one** primary action are
right-aligned. A toolbar carries a single primary action.

**L4 — Zone order inside the content body.** `header → toolbar → summary/insight
band → data region` — always that order, consistent gap between zones, tighter
(16px) inset within each.

**L5 — Header units, include by relevance.** The three units are *optional*, each
answering a distinct question — include one only when that question is real:
- **Breadcrumb** (*where am I?*) — only when nested ≥2 levels; every crumb a
  navigable ancestor; last crumb static.
- **Tabs** (*which slice?*) — only when ≥2 mutually-exclusive facets of the *same*
  dataset exist (switching filters the view, not the destination). Different pages
  are **navigation**, not tabs. One facet → drop the tab row.
- **Toolbar** (*act on this?*) — only when the dataset needs search / filter /
  action.

  The title is always present; dropped units keep the fixed order. Never ship a
  placeholder unit (one-level breadcrumb, lone tab, dead-control toolbar).

## Action placement — amends the "CTA outside the data container" decision

The primary CTA and the export control sit at the **right end of the preset-view
row**, which is *inside* the data container. That contradicts the earlier locked
decision putting "title + primary CTA outside the data container", and the two
should not both stand.

**Resolution: the CTA is placed relative to the data it acts on, not relative to
the container boundary.** A "Create" that adds a row to *this* list belongs with
that list's own controls; hoisting it to the page header separates it from the
scope (preset view, line of service, date) that determines what it will create.
The container boundary was a proxy for "give the action prominence", and the
preset row gives it that without the separation.

The earlier decision still holds for **page-level** actions — ones that are not
scoped by anything inside the container.

Row composition, left to right:
`Default · <saved views> · + View … [scope] [primary CTA] [export]`

Three details in that row are load-bearing rather than decorative:

- **4px inset correction.** The row cancels the content layer's 16px inset with
  `-mx-4` and re-pads at `px-3` (12px) so its hairline spans the full panel.
  Without an extra `mr-1` on the **rightmost** item, that item sits 4px proud of
  every toolbar control below it. Measured with it: both right edges land on the
  same x. **If you reorder the trailing items, the `mr-1` moves to whichever is
  last.**
- **Sizes.** CTA `xs` (24px), export `icon-xs` (24px). That row carries text
  tabs, not controls; a 32px `sm` button sits heavy on it.
- **`self-end mb-2.5`.** The row is `items-center`, so the actions opt out of
  centring and measure from the bottom: 10px margin + the row's own 2px bottom
  padding puts them exactly 12px above the hairline.

### Every table's columns move and resize. This is the default, not a feature.

**Render `TableColumnHeader` instead of `<TableHead>`, and call
`useTableColumns` once.** That is the whole of it — the header carries the drag
props, the keyboard, the drop indicator, both hover marks, and the guard that
stops a resize press starting a column drag. The DS's own `DataTable` uses it,
so a table copied from the gallery has the behaviour before anyone thinks about
it.

```tsx
const cols = useTableColumns({
  keys: COLUMNS.map((c) => c.key),
  // Structure, not content: the select box and the pinned row-open cell.
  fixed: ["select", "actions"],
  // Optional — supply these to keep the arrangement in a saved view.
  order, onOrderChange, widths, onWidthsChange,
});
const visible = cols.arrange(COLUMNS.filter((c) => !hidden.has(c.key)));
…
<col style={{ width: `${cols.widthOf(col)}px` }} />
…
<TableColumnHeader cols={cols} col={col}>{col.label}</TableColumnHeader>
```

**There is no enable flag, and there should not be one.** A table that opts out
is a table whose columns the reader may not arrange, and nobody should be able to
reach that by leaving a prop off. If a particular column must not move — because
it is the frame rather than the content — name it in `fixed`.

**The order and the widths belong in the saved view**, alongside the filters: a
view that restored the narrowing but not the arrangement rebuilds half the thing.
Leave `order`/`widths` off and the table remembers them for the session only,
which is the right default for a list with no views.

**Column order is the reader's, not the schema's** (`useColumnOrder`). Which two
columns sit side by side is what makes a comparison possible at a glance, and the
right pair differs by who is looking — dispatch wants Driver beside Planned Date,
accounting wants Qty beside Status. Every column header drags, and ⌘/Ctrl + ← →
moves a focused one a step, because a header that only moves by mouse does not
move for everyone. **Columns also RESIZE** (`useColumnWidths`), and the two
gestures get different targets and different cursors, because both begin with a
pointer held on a header and a table that guessed would guess wrong in the way
that costs most — you meant to widen a column and reordered the table instead.

- **The divider resizes**, `col-resize`, the split every spreadsheet already
  taught. `ColumnResizeHandle` straddles the boundary and belongs to the column
  on its left; double-click restores the declared width, ← → nudge it 16px, and
  64px is the floor. While a divider is held, the reorder hook stands down. It
  draws `┆│┆` — **the boundary rule itself, with a short bar either side**. These
  headers carry no column rules otherwise, so the edge has to be drawn before it
  can be grabbed, and two bars alone read as the same six-dot mark the move grip
  uses; the rule between them is what makes the gesture legible as "this edge,
  left or right".
  **It lights with its HEADER, not with its own 12px zone**: hovering the Status
  cell shows the edge between Status and Customer and nothing else — the divider
  you are about to reach for is the one belonging to the column you are already
  on. Gated on the zone, the mark only appeared once the pointer had found a
  12px strip it had no reason to aim at; gated on nothing, all eleven dividers
  lit at once and the row read as a grid rather than as a control.
- **The header body moves**, `cursor-grab`, with `ColumnMoveGrip` fading in over
  the header's own 12px left padding — so the sign costs the label no room and
  nothing reflows. It is the sign, not the handle: the whole `<th>` is draggable.

Both marks come up together on the hovered header — one saying the column moves,
one showing the edge that resizes — and then the move grip **steps aside** as the
pointer reaches the divider: it is the handle's `peer`, and from there on the two
would be two answers to one press. Nothing is drawn on any other header. Always
on, they would be marks on every header at once, and a row of eleven reads as
decoration.

A resize watches for its release on the WINDOW as well as on the handle: a
pointer let go outside the window would otherwise strand the "resizing" flag and
silently refuse every column drag until reload — one control disabling another is
the worst kind of bug to find. Two things do NOT move: the leading select box and the
trailing row-open chevron are the FRAME a row is read inside, not content, and
the chevron is pinned to the right edge so it survives a sideways scroll —
neither is draggable and nothing can be dropped past them. The order belongs in
the saved view alongside the filters: a view that restored the narrowing but not
the arrangement rebuilds half the thing. A saved order that predates a new column
keeps the column, in its declared position — a stale view may cost you the
ordering, never the data.

**Scope controls lead the toolbar's right cluster**, so the row reads outward:
what *scopes* the view → how it is *presented* (view switch, column tools) → the
action that *adds* to it. A scope control placed between the icon tools and the
CTA splits the tools from a button they have nothing to do with.

*(DS FOLLOW-UP: the external `interaction-and-behavior.md` still carries the
superseded wording of locked decision 8 — that document is not in this repo and
must be amended to match.)*

## Molecule-hierarchy laws

**H1 — Five levels, one job each.** Page (shell) · Region (`bg-fp-surface-1b`) ·
Group (`bg-card`, radius lg) · Compound-row (a fixed set of ordered slots) · Atom
(token-driven control). A component declares its level; that fixes its surface
token, radius, and padding. Nothing floats between levels.

**H2 — Elevation steps once per level.** Nesting moves up exactly one surface
(`surface-1b → card → fp-card-1`). Never stack two fills of the same weight — a
same-fill-on-same-fill element flattens the hierarchy and vanishes. *(Surface
tokens: see `ui/2-rules`.)*

**H3 — Emphasis budget.** One primary action per view; status by **soft tint**, not
saturated fill; brand orange reserved for a deliberate accent. *(This is the
canonical home; the CTA-neutral facet is stated in `ui/2-rules`.)*

**H4 — Density via fixed slots.** A data-dense row is an ordered slot set (identity
· data grid · viz · action). Extra data extends a slot; it never adds an unaligned
element.

## Content-layer anatomy
- **Header band (compact, default):** the **breadcrumb path is the header** — it
  doubles as the title (no separate `text-2xl` title line) and there is **no bottom
  divider**; the tab row / toolbar sit ~12px beneath. Crumbs sit ~4px apart.
- **Breadcrumb source rule:** the trail reflects the real nav ancestry (rail screen
  → drawer sub-menu → current), not an invented path.
- **Stacking order inside the body:** action bar → tabs → accordions → content
  (a concrete instance of L4).
- **Responsive width** follows drawer presence (content reflows when the drawer is
  absent).

## Navigation — two tiers (+ global top bar)
Tier-0 **global top bar** = app chrome (brand · global search · account), spanning
full width above everything. Rail = tier-1 main nav (one item per screen); drawer =
tier-2 contextual sub-nav for the active screen. Content title = the breadcrumb path
(compact header). Tabs are **not** navigation (see L5).

**N1 — One level per tier. The rail is flat.** The Tier-1 rail carries one item
per top-level screen and nothing else: **no section headings, no nesting, no
sub-categories.** The moment a module needs a second level, that level goes in
the **Tier-2 drawer** — it does not become groups inside the rail. Two levels of
hierarchy in a 52px rail is the failure this rule exists to prevent, and it is
easy to reach for because the hover-expanded rail is also 256px wide and so
*looks* like somewhere headings could live. It isn't: the rail is `bg-rail`
(near-black, square, flush); the drawer is `bg-sidebar` (rounded, shadowed,
inset). If a design shows grouped items under a heading, it is describing the
drawer.

**N2 — A module's nav shape is re-derived, never inherited.** "This workspace
has no second nav level, so no drawer" is a statement about the destinations a
module has *today*. Adding a module, or sub-categories to an existing one,
invalidates it. Re-test the tier question whenever the destination list changes
rather than carrying the previous answer forward.

**N3 — Check the DS before extending a nav component.** `NavigationDrawer`
already does headings, collapsible children, and both the 52px and 256px states.
Adding one of those to `NavRail` duplicates a capability that exists and breaks
N1 at the same time.

## Archived rules *(superseded — kept for reference, not enforced)*
Superseded **2026-08-18**, when the Tier-0 global top bar and the compact content
header became canonical. Retained for context, not enforced.
- **L1 (archived):** *Every app screen is rail + optional drawer + one content
  layer. No full-bleed pages, no page-owned top chrome.* — superseded: the app now
  has exactly one canonical global top bar (Tier-0).
- **L2 (archived):** *One header stack, fixed order. The header carries title →
  breadcrumb; a tab row and the toolbar sit directly beneath. Collapse multiple
  source top-bars into this single stack — never a second full-width top-bar.* —
  superseded by the compact header (breadcrumb-as-title, no divider) + the Tier-0
  bar. (The "no per-screen duplicate top-bar" intent is retained in the new L1.)

---

*Folded in from `02-rules/interaction-and-behavior.md` — see the provenance note in `interactions/2-rules.md`.*

## 10. Page layout — title outside, container inside

Promoted from the smoke-test feedback (R1, R2, R3).

- **Every list/data page is laid out as: page header strip OUTSIDE the data
  container, content INSIDE one rounded bordered container.**
- The **page header strip** (above the container) carries:
  - left: page title (and optional breadcrumb)
  - right: the **single primary CTA for the page**, if any (e.g.
    `+ Create Order`, `+ Create Tax`) + utility icon buttons
- The **data container** (`--fp-surface-1b`, `rounded-md`, **no outer border** —
  it lifts on `--shadow-fp-surface`)
  holds, top-to-bottom:
  - section tabs (when present)
  - the standard toolbar (per §4)
  - the table body
  - the pagination row
- **SUPERSEDED — the primary CTA sits with the data it acts on.** This rule
  previously read "tables do not carry a redundant create CTA inside the
  toolbar; one primary CTA per page, at the page header." It is replaced by
  *Action placement* in `ux/2-rules.md`: a CTA scoped by something inside the
  container (preset view, line of service, date) belongs at the right end of
  the preset-view row, not hoisted to the page header where it is separated
  from the scope that determines what it creates. The page-header placement
  still holds for genuinely **page-level** actions. There is still exactly one
  primary CTA per view.
- **Pagination is mandatory** at the bottom of any paginated list, in three
  slots: `Showing N–N of N` (left) · page numbers `‹ 1 2 3 … N ›` (center) ·
  page-size selector `25 ▾` (right).
- Any editable region declares `mode` (static|dynamic) explicitly.
- Any aggregated value has an accessible breakdown affordance.
- Create/edit of non-trivial records uses a full-page form, not a modal.
- Every mutating action yields a toast + visible state propagation.
- Multi-select uses chips+checkbox picker; single-select uses Replace semantics.
- Lists expose: search, filters (with count badge), views, create CTA, pagination.
- Destructive or bulk-overwrite actions require an explicit confirmation step.
- Bulk multi-value edits offer an Add-vs-Replace choice.
- **State transitions are surface-agnostic** — board drag, detail dropdown,
  and bulk action share one state machine.
- **Detail / read views use Side Sheet or Modal**, never a full page.
- **Row action buttons that reflect a lifecycle state** must pair with a kebab
  that exposes the allowed transitions.
- **Outreach uses a message-composer dialog** with prefilled subject + body
  templated from the record.
- **Lists may expose an alternate-view toggle** (Board/Table, Table/Map);
  toolbar state is shared across views.
- **Bulk action bars use fast-path-inline + More-menu** structure when
  options exceed ~5; the More menu splits "Set or change" vs "Apply an
  action"; inapplicable options are visible-but-disabled.
- **Bulk mutations that change a computed value get a per-row before/after
  preview** before commit; pure replace-all may skip the preview.
- **Two-pane workspaces** declare per-pane drag/fullscreen/close controls.
- **Bulk-attribute editors pick a tier** by attribute cardinality (scalar /
  single-value-per-row / grouped multi-value); tier-3 dialogs always carry
  mode tabs + per-group scope label.
- **Diagnostic disclosure is non-blocking by default**: severity-coded banner
  with counts + Show Details expand-to-table; Confirm stays enabled. Block
  only for hard-safety / destructive cases.
- **Severity vocabulary is consistent**: amber=warning, red=error,
  yellow/neutral=info.
- **Color governance (§9)**: chips/badges/statuses render neutral until a
  Layer 2 usage rule binds a color to a meaning. Destructive color appears
  only on action labels, never as fills.
- **Brand orange is reserved** for primary CTA fills, active-tab indicator,
  and brand mark. Not used for hover, selected-row, or generic interactive
  states.
- **Page layout (§10)**: page title + single primary CTA live OUTSIDE the
  data container; tabs + toolbar + table + pagination live INSIDE one
  rounded bordered container.
- **Pagination is mandatory** at the bottom of any paginated list — three
  slots: showing-count · page numbers · page-size selector.
- **Rail and contextual sidebar use distinct surface tokens** (`--color-rail`
  vs `--color-sidebar`).
- **Bulk action bar** is a compact neutral floating pill — not a full
  toolbar. Equal-weight icon+label actions, no primary fills, destructive
  as small icon only.
