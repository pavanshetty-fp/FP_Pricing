# Unified View — interactions

How it behaves. The DS's behaviour rules are in
`docs/ds/interactions/2-rules.md`; this file records what this application
settled.

---

## 1. Editing — a side sheet autosaves

**The rule is the DS's** (`docs/ds/ux/2-rules.md`, Side-sheet anatomy) and it is
not negotiable per sheet: **a side sheet with editable fields autosaves,
always, creating or editing.**

- Debounced **600ms** after a change settles.
- `useDraftSaveState` + `DraftStatusChip` beside the title: `saving`, then
  `saved`, and **nothing at all before the first keystroke** — a sheet that
  opens saying "Saved" is claiming to have done something it has not.
- **No Cancel, no Save, no Update.** Close is the exit; the primary is the next
  act.
- **The draft is built once per RECORD, not once per save.** The row coming
  back from the sheet's own save must not rebuild the form — it would move the
  caret and lose anything typed since.

### A record exists from the first thing typed into it

A draft is not a form waiting to be submitted; it is a record in its first
stage. The first change creates it, the sheet hands itself over to it, and the
footer's act is what moves it out of that stage later.

### What must NOT be silently dropped

Every field the sheet collects must have somewhere to live on the record and
must be carried by every path that writes one. The failure is invisible: the
sheet shows a default, takes what is typed, and hands back the default on the
next open. **Any new field on a sheet is a change to four places** — the model,
the draft builder, the save, and the create.

---

## 2. Feedback

- **Every act announces itself; typing does not.** A toast per pause while
  somebody fills in a form is the app narrating typing. The ACTS — sent,
  awarded, approved, created — earn a toast; the autosave earns the chip.
- **A toast says what happened; a second line only when it has a
  consequence** (Pavan, 2026-10-07). Title = the act. The second line exists
  only to warn what follows ("Paused R-1042 / 4 unfinished orders cancelled.")
  — never to repeat a name or number already on screen, nor to restate the
  obvious ("Exported 80 vendors / The filtered list…"). Most toasts are one line.
- **The audit trail records changes past the first stage only.** On a draft
  nobody has sent anywhere, every field is being typed for the first time, and
  an entry per pause buries the entries that matter.
- **A trail records that a note changed, not what it said.** Quoting both halves
  of a paragraph every time somebody fixes a typo buries everything else.

---

## 3. Controls that are not available

- **Disabled + a tooltip on the press.** One sentence, imperative. The wrapper
  carries the tooltip because a disabled control fires no pointer events.
- **Hide, never disable, a control that has nothing to point at.** A column
  menu on a board is not "disabled", it is absent.
- **Blocked ≠ disabled.** A primary that is waiting on something the reader can
  fix is disabled with a reason; a primary that is waiting on somebody ELSE
  still says the act and puts the waiting in the banner.

---

## 4. Pressing things

| Target | Does |
|---|---|
| a table row | opens the record (the pinned chevron is the affordance; the row is the target) |
| a board card | opens the record |
| a control ON a card | acts, and **stops** — the card is the button, so every control inside it calls `stopPropagation` or stepping a quote opens the order |
| a card's footer action | the named act, without opening the record |
| an underlined figure | reveals what it is made of — and the underline appears ONLY where something is actually hidden |

**An affordance is a promise.** A dotted underline on a price means there is
more behind it; on a card that already shows the breakdown, the figure is plain
text and presses nothing.

---

## 5. Hover

- **Row actions appear on hover and on focus**, never on hover alone.
- **Hover is not a way to see data.** On a board of forty cards a hover card
  fires on the way past; anything worth reading is a press.
- **The brand colour is not a hover state.** It is CTA fills, the active tab,
  the brand mark, and the search-match highlight at 25%.

---

## 6. The sheet's stage machine

- **One act moves one thing.** An act that both sends and advances is two acts
  wearing one label — the reader finds the record has left a stage underneath
  them.
- **A precondition is not the act.** "Assign technician" names the field the act
  needs; "Create Service Order" names what pressing it does.
- **A stage that has to wait on another system actually waits.** An invoice
  reaching accounting is a batch, so the prototype delays it rather than
  jumping to the final stage and making the distinction invisible.
- **Going backwards clears what the forward step stamped.** A completion time,
  a hold reason, an invoice flag — each is cleared when the record leaves the
  stage that set it, so the two can never disagree.

### The sheet follows the stage

When the stage changes while the sheet is open, the sheet scrolls to the
section that stage's work lives in — **on a change, never on open**. Opening a
record is not a claim that anything just happened, and a sheet that jumps every
time it is opened takes away the reader's own place in it. The wait before the
scroll is longer than the sheet's own opening, or the two animations read as
one thing stuttering.

---

## 7. Lists

- **Search matches the whole row; a column search matches one column.** Two
  different questions, two controls. **Search by column is a filter row under
  the header** in every table, every module — DS `ui/2-rules.md` §10g
  (2026-10-01).
- **Every column sorts**, asc → desc → unsorted.
- **One view, no view switch** — a table-only list shows no Table icon; the
  Board icon appears only where a board exists (DS §10h).
- **A narrowing that is on is visible as a chip**, and the chip removes it.
- **Applying a filter resets to page 1.** A filter that leaves you on page 4 of
  a 2-page result is a list that appears empty.
- **A saved view captures the narrowing AND the arrangement.** A view that
  restores the filters but not the columns rebuilds half the thing.
- **Grouping suspends pagination**, and a degenerate level (one group holding
  everything) is skipped rather than drawn.

---

## 8. Keyboard and accessibility

- **Anything that presses has a focus ring**, and the ring leads somewhere:
  a card that is `role="button" tabIndex={0}` must activate on Enter and Space.
- **A letter is never the only carrier of meaning.** A code disc has the full
  word as tooltip and `aria-label`.
- **A colour is never the only carrier.** The label always says the state.
- **No scroller shows a bar, on either axis.** A single visible one teaches the
  reader that the absence of a bar means "this does not scroll".
- **Contrast ≥ WCAG AA in both themes**, and both themes are checked — the FP
  dark theme is the default, so light is the one that gets forgotten.

---

## 9. Settings that change the flow

A module may carry switches that turn whole steps on or off. Three rules:

- **They are not preferences, and the screen says so.** Each description states
  what happens in BOTH positions; a switch whose off-state is unstated is one
  nobody dares move.
- **A nested switch cannot outlive its parent.** Turning the parent off turns
  it off and shows it disabled, rather than leaving it describing a step that
  no longer exists.
- **A setting that removes a step removes its UI.** A facet for a source
  nothing can arrive from is a filter that can only return zero.

## A list remembers where it was left (Pavan, 2026-10-09)

Leaving a list and coming back finds it as it was left: filters, column
search, filter boxes, search, sort, columns, date, the active view and any
unsaved changes (dirty dot and all) — still clearable, still savable as a
view. Nothing goes away until **Clear all** (or the view's own reset) takes it
off. Kept for the session per list (`useSavedViews` `storageKey`); a page
reload starts clean. A dashboard drill arriving with its own narrowing wins
over what was left.

## A list's alert banner sits above its controls (Pavan, 2026-10-11)

On a list page the alert banner ("2 urgent orders overdue for dispatch")
comes directly under the view-tabs row and ABOVE the toolbar — search,
Filters, Group By, date, view switch — so what needs attention is read before
the tools to act on it.


## The alert banner — the DS banner with interaction (Pavan, 2026-10-13)

**Promoted to the DS and final:** `AlertBanner` — anatomy, order and colour in
`docs/ds/interactions/2-rules.md` §7a, the two banner types in
`docs/ds/ui/7-variants.md` §6. Not repeated here.

**The binding in this app:** a list page shows its alerts as one
`AlertBanner` under the view row, above the toolbar; each kind's title applies
that list's own facets (and widens the date range when the kind is not about
the dates on screen). Sales Orders' overdue banner uses `BannerSnooze`; the
Customer Portal's Orders page runs six kinds (empty tanks, action needed,
invoices past due, partial deliveries, quotes to accept, at risk of late).
