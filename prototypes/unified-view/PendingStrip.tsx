import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CircleCheck, Info } from "lucide-react";

/**
 * THE PENDING STRIP — what a sheet's next act is still waiting on.
 *
 * SHARED, BECAUSE THE SECOND SHEET TO NEED IT IS THE PROMOTION SIGNAL. It was
 * written twice — once for the 3PL order and once for the service order — and
 * two copies of something this fiddly would have drifted in whichever half
 * gets opened less.
 *
 * It goes in `RecordSheet`'s `footerBanner`: the reason a primary is dead
 * belongs beside it, and beside it there is room for a clause, not for a list.
 * Each caller supplies its own items and its own section ids.
 */

export interface PendingItem {
  key: string;
  /** The INSTRUCTION — "Choose a customer", not "Customer". */
  label: string;
  /** The `id` of the section this item is about. Omitted = not pressable. */
  target?: string;
}

/**
 * SEND THE READER TO THE SECTION, and say which one it was.
 *
 * A strip that names a missing field and cannot take you to it is a label for
 * a hunt. The press scrolls the section into view and then blinks its outline
 * — because after a scroll the eye is on the MOVEMENT, not on the thing that
 * moved, and "it is this one" is a different statement from "here is some of
 * the form".
 *
 * ONCE, AND IT LEAVES NO TRACE (Pavan, 2026-09-22 — it was twice). Two flashes
 * is a thing asking to be watched; one is a thing pointing at itself and then
 * getting out of the way, and the reader is already looking because the scroll
 * took them there. Three times reads as an error, and a ring that stays is a
 * state — nothing about the record changed, so nothing about it should still
 * look different in a second.
 */
export function attend(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  /* SCROLL THE CONTAINER, NOT THE ELEMENT. `scrollIntoView` picks its own
     ancestor and hands the animation to the browser. Finding the scrollport
     and setting its offset is deterministic. */
  let port: HTMLElement | null = el.parentElement;
  while (port && port.scrollHeight <= port.clientHeight + 4) {
    port = port.parentElement;
  }
  if (!port) return;
  /* 12px of air above the section, so it does not sit flush against the header
     and read as clipped. */
  const top =
    port.scrollTop +
    el.getBoundingClientRect().top -
    port.getBoundingClientRect().top -
    12;

  /* ANIMATED BY HAND, because `behavior: "smooth"` does not survive in here.
     MEASURED in the running sheet: an instant scroll to 400 lands at 400; the
     same call with `smooth` lands at 0 — the sheet's scroll lock cancels the
     browser's animation the frame after it starts. The rAF loop is not
     decoration: without it the section either does not move or teleports, and
     the travel is what tells the reader this is the same sheet they were
     already in rather than a new screen. */
  const from = port.scrollTop;
  const distance = top - from;
  const started = performance.now();
  const DURATION = 320;
  const scroller = port;
  const step = (now: number) => {
    const t = Math.min((now - started) / DURATION, 1);
    /* ease-out cubic — fast away, slow into place, which is what makes an
       arrival read as an arrival. */
    scroller.scrollTop = from + distance * (1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  /* NO FOCUS MOVE. Focusing the section, or a control inside it, was tried and
     dropped: inside a focus-trapped sheet the trap restores the scroll position
     of whatever it considers focused, which fights the travel. The blink is
     what says "this one", and focus stays on the strip — which is where the
     reader presses next if more than one item is outstanding.
     KEYBOARD GAP, KNOWN: a reader who presses this with the keyboard is shown
     the section but still has to Tab to it. */

  /* THE BLINK WAITS FOR THE SCROLL. Flashing a section that is still
     travelling spends the whole animation off screen. */
  window.setTimeout(() => blink(id), 320);
}

/** How long `blink` takes, start to finish — for anything sequencing after it. */
export const BLINK_MS = 800;

/**
 * THE FLASH ON ITS OWN, WITHOUT THE TRAVEL.
 *
 * FOR A SECOND, NARROWER "THIS ONE". After a section has been brought into
 * view and named, the thing actually worth reading inside it can be named
 * too — the Pricing unit, then the vendor's own column. Two statements, not
 * one longer one: "here" and then "this part of here". They must not overlap,
 * or the second reads as the first still going.
 */
export function blink(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("fp-attention");
  /* Re-adding in the same frame does not restart a CSS animation; the reflow
     between the two is what does. */
  void el.offsetWidth;
  el.classList.add("fp-attention");
  window.setTimeout(() => el.classList.remove("fp-attention"), BLINK_MS);
}

/**
 * THE SAME FLASH, ACROSS SOMETHING THAT IS NOT ONE BOX.
 *
 * A column of a grid is a stack of separate cells: an outline round each of
 * them is a ladder, not a column. Every cell that belongs to the thing carries
 * `data-blink="<name>"`, and they flash a FILL together — which reads as the
 * one unit it is. (Pavan, 2026-09-22 — "blink should happen through this whole
 * unit".)
 */
export function blinkGroup(name: string) {
  const els = document.querySelectorAll<HTMLElement>(`[data-blink="${name}"]`);
  els.forEach((el) => {
    el.classList.remove("fp-attention-fill");
    /* Re-adding in the same frame does not restart a CSS animation; the reflow
       between the two is what does. */
    void el.offsetWidth;
    el.classList.add("fp-attention-fill");
    window.setTimeout(() => el.classList.remove("fp-attention-fill"), BLINK_MS);
  });
}

/**
 * One outstanding item at a time, with a counter and a way to step through
 * them, so three missing fields cost one line rather than three.
 *
 * THE WORD "PENDING" DOES NOT MOVE. It is the strip's subject and it is true
 * of every item under it; stepping swaps only the item. A label that changed
 * with the content would make the reader re-read what KIND of line this is on
 * every press.
 *
 * WHEN NOTHING IS OUTSTANDING IT SAYS SO, in the success channel, rather than
 * disappearing: an empty strip and a satisfied one are different states.
 */
export function PendingStrip({
  pending,
  /** What the strip says when the list is empty. */
  clearLabel = "Everything this record needs is filled in",
  tone = "neutral",
}: {
  pending: PendingItem[];
  clearLabel?: string;
  /**
   * `caution` once the strip is raised by pressing the primary with
   * something missing (2026-10-05) — it is the answer to a press and has to
   * be noticed. `neutral` (grey) where it simply stands on the sheet.
   */
  tone?: "neutral" | "caution";
}) {
  const [at, setAt] = React.useState(0);
  /* The list shortens as items are cleared, so the cursor has to be pulled
     back with it rather than pointing past the end. */
  const i = Math.min(at, Math.max(pending.length - 1, 0));
  React.useEffect(() => {
    if (at > pending.length - 1) setAt(Math.max(pending.length - 1, 0));
  }, [at, pending.length]);

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-fp-banner-accent-success">
        <CircleCheck className="size-4 shrink-0" />
        {clearLabel}
      </div>
    );
  }

  const step = pending[i];
  const chevron =
    "rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30";

  return (
    /* IN THE STEP COLUMN (a narrow `@container`) the strip is two rows
       (Pavan, 2026-10-05): "Pending" on the left with the stepper on the
       right, and the item itself underneath, wrapping rather than truncating.
       No icon there. The first span dissolves (`contents`) so its pieces can
       be laid out against the counter. In the full-width footer band nothing
       changes. GREY, not caution orange (Pavan, 2026-10-05): what is left to
       do is information, not an alarm. */
    <div className="flex items-center justify-between gap-3 @max-[20rem]:flex-wrap @max-[20rem]:gap-y-1">
      <span
        className={cn(
          "flex min-w-0 items-center gap-2 text-sm @max-[20rem]:contents",
          tone === "caution" ? "text-fp-banner-accent-caution" : "text-muted-foreground"
        )}
      >
        <Info className="size-4 shrink-0 @max-[20rem]:hidden" />
        <span className="shrink-0 font-medium @max-[20rem]:order-1">Pending</span>
        {step.target ? (
          <button
            type="button"
            onClick={() => attend(step.target!)}
            className="min-w-0 truncate rounded-sm text-left @max-[20rem]:order-3 @max-[20rem]:basis-full @max-[20rem]:whitespace-normal underline decoration-current/40 underline-offset-4 outline-none transition-[text-decoration-color] hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {step.label}
          </button>
        ) : (
          <span className="truncate @max-[20rem]:order-3 @max-[20rem]:basis-full @max-[20rem]:whitespace-normal">{step.label}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-muted-foreground @max-[20rem]:order-2">
        <button
          type="button"
          aria-label="Previous pending item"
          disabled={i === 0}
          onClick={() => setAt(i - 1)}
          className={chevron}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {i + 1} of {pending.length}
        <button
          type="button"
          aria-label="Next pending item"
          disabled={i >= pending.length - 1}
          onClick={() => setAt(i + 1)}
          className={chevron}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
