# Archived — the step column (stepped form's left-hand step list)

**Archived 2026-10-06 (Pavan):** removed from the 3PL order detail page and the
create pages (Create Delivery Order, Asset Order). Kept here so it can come
back as it was. **The code is not deleted** — it lives in
`src/components/side-sheet/form-steps.tsx` (`FormStepsNav`, `SteppedFormBody`)
and is switched off per sheet.

## How to bring it back

- On a `RecordSheet`: remove `stepColumn={false}` (it defaults to on).
  Today it is off in `threepl/BrokerOrderSheet.tsx` and
  `threepl/AssetMovementSheet.tsx`.
- The order-form settings gear moved from the column to the sheet header
  (`headerActions`). To put it back on the column, pass it as `stepsAction`
  instead.
- Directly on `SteppedFormBody`: drop `hideColumn`.

## What it looked like

- **Three columns: steps · form · cards.** A **224px** column on the left
  (`w-56`, `border-r`, `p-4`, its own scroll), the form as ONE long scroll in
  the middle, the record's rail on the right where it has one. The sheet
  **filled** (`100vw − 56px`) whenever the column showed.
- **Header of the column:** "Step 3 of 6" (12px, muted, tabular numbers), then
  a **4px progress bar** (`bg-muted` track, `bg-foreground` fill, width =
  current ÷ total, animates). The bar could end in one quiet control
  (`headerAction`): a grey 24px ghost icon, white on hover — the order form's
  settings gear sat there.
- **The step list** was quiet: **13px**, a bare number **8px** from its name,
  no disc and no fill, flush with the column's left edge. The current step's
  number and name took the selection ink (`text-selected-foreground`; the brand
  in dark); the others grey, their numbers lighter (`muted-foreground/60`),
  turning foreground on hover.
- The column only showed with **two or more steps**.

## How it behaved

- **Steps came from the page, not a list.** Every top-level `SheetSection` was
  a step named by its title; `FormStep label="…"` grouped several sections
  under one name (Create Delivery Order: Order details · POC details ·
  Schedule · Products · Vendor · Notes). Re-read whenever the form changed
  shape, so a section appearing or disappearing (POC details, Vendor after
  Create) changed the list.
- **It followed the scroll** — the current step was the one the reader was in.
- **Pressing a step scrolled to it** (eased, 320ms, clear of anything pinned)
  and marked the section once with `.fp-attention-fill-subtle` (a 5%
  foreground wash, 800ms).
- **The pending bar** sat under the form column while the column showed
  (`footerBannerClassName` stopped it short of a rail); without the column it
  sits above the footer.
- The stage track sat over the FORM column only while the column showed;
  without it the track runs across the sheet under the header.

## What stays without it

The stepped form's look is kept: plain group headings
(`text-base font-medium text-muted-foreground`), field sections `plain`, table
sections `outline`, 40px between groups, one long scroll. Only the column goes.

**2026-10-07 (Pavan): off in EVERY module.** `RecordSheet`'s `stepColumn`
now defaults to `false`; no sheet passes it. To bring it back on one sheet,
pass `stepColumn`; everywhere, flip the default back to `true`.
