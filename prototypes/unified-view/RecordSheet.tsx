import * as React from "react";
import { Check, Loader2, X } from "lucide-react";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import type { PillColor } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { QuietPattern } from "@/components/ui/quiet-pattern";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SteppedFormBody } from "@/components/side-sheet/form-steps";
import { FormStepsContext } from "@/components/side-sheet/form-steps-context";
import { PendingStrip, attend, type PendingItem } from "./PendingStrip";

/**
 * Side-sheet shell for a single record — edit or create.
 *
 * Chrome is the DS's, taken from `side-sheet/SheetNarrow.tsx` (Figma "Side
 * Sheet" 27610:58293) and matched to the Fuel Orders order sheet so all three
 * sheets are identical where they should be:
 *   • SheetContent  w-560 (DS `narrow`), gap-0 p-0
 *   • header        border-b, p-4, items-start justify-between gap-4
 *   • body          p-4, flex-col gap-10   ← 40px between groups
 *   • footer        border-t, p-4, items-center justify-end gap-3
 *
 * The 40px group rhythm is the same deliberate override the order sheet
 * documents: these sheets carry far more fields than the DS reference, and at
 * the DS's gap-7 the groups stopped reading as groups. The 1:2 ratio against
 * SheetSection's gap-5 is preserved, so only the scale moved.
 *
 * CREATE AND EDIT ARE THE SAME SHEET. `mode="create"` swaps the title for the
 * create label and the submit button with it, and the caller seeds a blank
 * draft. One layout to learn, and no separate create form to drift.
 *
 * DS FOLLOW-UP: nothing here is screen-specific. This belongs beside
 * `side-sheet/` in the DS, with the order sheet moved onto it too.
 */
/**
 * A COLUMN'S COMFORTABLE WIDTH, by what it holds (Pavan, 2026-10-15). A
 * table-led sheet adds these up to find its width; one number per kind, so
 * the same column is the same width in every sheet.
 */
export const CELL = {
  /* TIGHTENED (Pavan, 2026-10-15): asset and product names are short, a
     quantity is at most six digits — the columns, and so the sheet, are only
     as wide as that. */
  /** A row's select checkbox, an expand chevron. */
  check: 44,
  /** "Top off" and other labelled checkboxes. */
  flag: 72,
  /** The row's own thing — an asset, a product, a partner, a document. */
  name: 200,
  /** A pick from a short list — type, unit, condition, terminal. */
  pick: 160,
  /** A quantity or an amount, with its unit — six digits. */
  number: 110,
  date: 140,
  status: 140,
  /** Free text — a fault, a note. */
  text: 240,
  /** The row bin / a row menu. */
  bin: 52,
} as const;

export interface SheetFit {
  /** Each table's columns, as `CELL` widths; the widest table decides. */
  tables: number[][];
  /** The 340px right rail (summary · activity) beside the tables. */
  rail?: boolean;
}

/*
  THE PATTERN UNDER A SHORT FORM (Pavan, 2026-10-16). When what the sheet
  holds takes HALF the visible height or less, the DS quiet pattern fills
  the rest — to the body's left, right and bottom edges. Taller than that,
  there is no pattern and no space kept for it. Measured live, so a form
  that grows as it is filled loses the pattern when it passes half.
*/
const BODY_GAP = 40;
const BODY_PAD = 16;
function SheetPattern() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const body = el?.parentElement;
    if (!el || !body) return;
    const measure = () => {
      const visible = body.clientHeight;
      if (!visible) return;
      const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
      /* Where the content ends — the pattern's own gap taken out. */
      const content = top - BODY_PAD - (el.dataset.shown === "true" ? BODY_GAP : 0);
      setShown(content <= visible / 2);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    for (const c of Array.from(body.children)) if (c !== el) ro.observe(c);
    const mo = new MutationObserver(() => {
      for (const c of Array.from(body.children)) if (c !== el) ro.observe(c);
      measure();
    });
    mo.observe(body, { childList: true });
    measure();
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return (
    <div
      ref={ref}
      data-shown={shown}
      aria-hidden
      /* Hidden, it takes no room: zero height, and the gap above cancelled. */
      className={cn(shown ? "-mx-4 -mb-4 flex min-h-24 flex-1" : "-mt-10 h-0 overflow-hidden")}
    >
      {shown && <QuietPattern className="flex-1" />}
    </div>
  );
}

/**
 * THE SHEET UNDERNEATH, for a sheet opened over it (Pavan, 2026-10-15). Now
 * that widths follow content, two sheets can be the same width, and the top
 * one would cover the other exactly — reading as the SAME sheet having
 * changed. A level-2 sheet is therefore never wider than the one beneath it
 * less the 56px gap, so a strip of it always shows.
 */
const ParentSheetWidth = React.createContext<number | null>(null);

/** BODY PADDING (16 + 16) AND THE TABLE BOX'S BORDERS. */
const FIT_PAD = 34;
const RAIL = 340 + 24;
export const FORM_WIDTH = 600;
export const DATA_WIDTH = 1200;
/** A data-intensive sheet's field grid — three across, at 1200. */
export const DATA_FIELDS = "grid grid-cols-3 gap-4";

/**
 * The width a table-led sheet takes. THE FORM SIDE IS NEVER NARROWER THAN A
 * 600 FORM'S (Pavan, 2026-10-15): beside a rail, small tables still leave the
 * fields two across at a readable width; the rail adds its own 364.
 */
export function fitWidth(fit: SheetFit): number {
  const widest = Math.max(0, ...fit.tables.map((t) => t.reduce((n, w) => n + w, 0)));
  return Math.max(FORM_WIDTH - FIT_PAD, widest) + FIT_PAD + (fit.rail ? RAIL : 0);
}

export interface RecordSheetProps {
  /**
   * THE WIDTH FOLLOWS WHAT IS IN THE SHEET (Pavan, 2026-10-15 — replaces the
   * fixed 560 / 864 / 1120 tiers and the 756 creation floor). A sheet sized
   * for more than it holds reads as empty.
   *
   *   `form`     600 — fields and text, no table. The default.
   *   `compact`  510 — CONTROLS rather than a form (a facet list).
   *   `data`     1200 at least — a DATA-INTENSIVE record's detail: many
   *              fields and several related-records tables (a 3PL customer,
   *              vendor, product, rental asset). Fields go three across
   *              (`DATA_FIELDS`); with `fit`, the wider of the two. Pavan,
   *              2026-10-15: "cramped … should have more width so that
   *              information can be easily consumed".
   *   `full`     the viewport less the gap — no form uses it now: every
   *              order sheet fits its tables (Pavan, 2026-10-15). Kept for a
   *              sheet showing its step column.
   *
   * A sheet that carries TABLES passes `fit` instead, and is as wide as its
   * widest table's columns at a comfortable width (`CELL`), plus the body's
   * padding, plus the 340px rail and its gap when it has one — never under
   * 600. Per step: a stepped sheet passes the tables of the step on show.
   *
   * THE GAP IS 56px AND IT IS THE ONE CONSTANT. Every width is clamped to
   * `100vw - 56px`, so no sheet reaches the edge or overflows a small screen.
   * A sheet opened OVER another one takes that gap TWICE — see `level`.
   */
  size?: "compact" | "form" | "data" | "full";
  /** Width from the sheet's tables — see `size` and `fitWidth`. */
  fit?: SheetFit;
  /**
   * HOW DEEP IN THE STACK THIS SHEET IS. `2` is a sheet opened OVER another
   * one — the invitation over an order, a partner's quote over an order.
   *
   * IT TAKES A SECOND GAP (Pavan, 2026-09-22). The 56px is what tells a reader
   * a sheet is over something; a second sheet at the same inset covers the
   * first exactly and reads as the SAME sheet having changed its contents.
   * 112px leaves a 56px strip of the sheet underneath showing, which says
   * "there is one of these behind this one" in the only language the stack
   * has.
   */
  level?: 1 | 2;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "create";
  /** Header title when editing, e.g. `Order #: 6104420`. */
  editTitle: string;
  /** Header title when creating, e.g. `Create Asset Order`. */
  createTitle: string;
  /** Submit label when editing. Defaults to the DS's `Save Changes`. */
  /**
   * THE EDIT-MODE PRIMARY. "Confirm", not "Save Changes" — autosave is the
   * default now, so by the time anybody looks at the footer the change is
   * already written and a Save would be claiming credit for work already
   * done. What is left to do is agree that the record is right.
   *
   * It is a per-sheet word: a footer that commits the record to a NEXT ACT
   * should say that act instead. Changed 2026-09-22.
   */
  editAction?: string;
  /** Submit label when creating — usually the same words as `createTitle`. */
  createAction: string;
  /** Rendered beside the title, e.g. a StatusChip. */
  headerAside?: React.ReactNode;
  /**
   * A second line under the title, inside the sticky header.
   *
   * For a fact about the record that must not scroll away — "this partner
   * holds the order" is the answer to a question the reader has while they are
   * looking at any part of the sheet, and at the bottom of a long step it was
   * only true where nobody was looking.
   */
  headerSubtitle?: React.ReactNode;
  /**
   * DRAFT AUTOSAVE, SAID OUT LOUD.
   *
   * A sheet that keeps a draft has to tell the reader it is keeping it, or
   * they behave as though it does not — they finish fields they meant to come
   * back to, and they hesitate to close. Three states and nothing else:
   * `saving` while a change settles, `saved` once it has, and `idle` before
   * anything has been typed, which shows nothing at all because there is
   * nothing to reassure anybody about yet.
   *
   * It sits by the TITLE, not the footer: it is a statement about the record,
   * not a control, and beside Save it would read as a second button. The
   * caller passes it through `DraftStatusChip`, which on a Draft swaps the
   * chip for the line "Draft saved" rather than showing both.
   */
  /**
   * The ··· at the right of the header, between the history icon and Close.
   * For acts ON the record that are not part of filling it in — deleting it.
   */
  headerMenu?: React.ReactNode;
  /**
   * Cancel in the footer. OFF on a sheet that autosaves its draft: "Cancel"
   * promises to undo, and a sheet that has already kept everything typed
   * cannot keep that promise. Close is the honest exit there.
   */
  showCancel?: boolean;
  /**
   * Controls at the far right of the header, left of Close.
   *
   * For things that OPEN something rather than change the record — a history,
   * a preview, a related list. They live in the header because they are not
   * part of the form and must not scroll away with it, and left of Close
   * because Close is the last thing on that edge in every sheet.
   */
  headerActions?: React.ReactNode;
  /**
   * A step strip under the header — `SheetSteps`. It sits above the body and
   * outside its scroll, because which step you are on is not something that
   * should be able to scroll away from you.
   */
  steps?: React.ReactNode;
  /** Disable submit while the draft is incomplete. */
  canSubmit?: boolean;
  /**
   * WHAT THE DEFAULT PRIMARY IS WAITING ON (Pavan, 2026-10-07 — G25). Given,
   * the default primary never goes dead: it stays pressable, and a press while
   * anything is listed (or `canSubmit` is false) raises the pending strip above
   * the footer and takes the reader to the first gap — the 3PL order / Quote
   * pattern. Ignored when `footerPrimary` replaces the button, and the caller's
   * own `footerBanner` wins over the strip.
   */
  pending?: PendingItem[];
  /**
   * Replaces the footer's primary button — and `null` removes it entirely.
   *
   * THE FOOTER'S RIGHT EDGE IS "THE MAIN THING TO DO HERE", and on a
   * multi-step sheet that is not the same act on every step. A step whose work
   * ends in a decision — accept this price — has a better claim to that slot
   * than a generic Save, and a step with nothing left to commit has no claim
   * at all. Omit the prop for the default Save/Create.
   */
  footerPrimary?: React.ReactNode;
  /**
   * Controls that ride in the footer, left of Cancel/Submit. For decisions
   * taken at the moment of committing rather than while filling the form —
   * they stay in view no matter how far the body has scrolled.
   */
  footerAside?: React.ReactNode;
  onSubmit: () => void;
  /**
   * A FIXED STRIP DIRECTLY ABOVE THE FOOTER, spanning the sheet.
   *
   * For what the footer's act is waiting on. The reason a primary is disabled
   * belongs beside it, and beside it there is room for a clause — not for a
   * list. This is where a sheet says what is still outstanding, in the one
   * place that does not scroll away from the button it is about.
   */
  footerBanner?: React.ReactNode;
  /** Classes for the banner while it sits under a stepped form's column. */
  footerBannerClassName?: string;
  /** A control on the step column's "Step N of M" row — form settings. */
  stepsAction?: React.ReactNode;
  /**
   * THE FORM AS STEPS (Pavan, 2026-10-05) — a column on the left listing the
   * form's steps, the form as one long scroll beside it, and the pending strip
   * at the foot of that column instead of above the footer. On by default for
   * every first-level sheet; the sheet takes the full width while the column
   * shows. The column only shows when there are two or more steps — see
   * `components/side-sheet/form-steps`.
   */
  stepNav?: boolean;
  /**
   * The step column itself. Off = the stepped form without the column on the
   * left (Pavan, 2026-10-06 — removed from the 3PL order sheets, archived in
   * docs/ds/ui/archive/step-column.md). OFF IN EVERY MODULE since 2026-10-07
   * (Pavan): pass `true` to bring it back on one sheet.
   */
  stepColumn?: boolean;
  children: React.ReactNode;
}

/**
 * Watch a draft and report whether it has been kept.
 *
 * ONE HOOK, SO EVERY DRAFT SHEET SAYS THE SAME THING. A sheet that autosaves
 * silently is a sheet people do not trust with unfinished work: they either
 * finish fields they meant to return to, or they hesitate to close. The
 * feedback is the feature.
 *
 * `saving` for 500ms after a change settles, then `saved`. It stays `idle`
 * until the FIRST change, because before anyone has typed there is nothing to
 * reassure them about — and a sheet that opens saying "Saved" is claiming to
 * have done something it has not.
 */
export function useDraftSaveState(draft: unknown, enabled = true) {
  const [state, setState] = React.useState<"idle" | "saving" | "saved">("idle");
  const serialised = React.useMemo(() => JSON.stringify(draft ?? null), [draft]);
  const first = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      first.current = null;
      setState("idle");
      return undefined;
    }
    /* A SHEET FILLS ITS DRAFT ONE RENDER AFTER IT OPENS, so the first value
       seen here is `null` and the second is the untouched form. Treating that
       as an edit made every sheet open saying "Saved" — claiming to have kept
       something nobody had typed. The baseline is the first REAL draft. */
    if (draft === null || draft === undefined) return undefined;
    if (first.current === null) {
      first.current = serialised;
      return undefined;
    }
    if (serialised === first.current) return undefined;
    setState("saving");
    const t = window.setTimeout(() => setState("saved"), 500);
    return () => window.clearTimeout(t);
  }, [serialised, enabled, draft]);

  return state;
}

/**
 * The record's state in the header: what it IS, and whether the draft is kept.
 *
 * ONE THING WHEN THEY ARE THE SAME WORD. On a Draft, a status dot, the word
 * "Draft", a separator dot and the word "Saved" were four marks for one fact.
 * Once typing starts the chip gives way to plain text — "Draft saving…", then
 * "Draft saved" — which carries the status and the reassurance in one line.
 *
 * TWO WHEN THEY ARE NOT. An Assigned order being edited still has a status
 * worth seeing, and "Assigned saved" is not a sentence — so the status keeps
 * its chip and the save note sits beside it. The word stays "Draft" either
 * way, because what is kept is the draft of the edit, not the order.
 */
export function DraftStatusChip({
  tone,
  color,
  label,
  saveState = "idle",
  showStatus = true,
}: {
  tone: StatusTone;
  /* A STAGE COLOUR THE USER CHOSE (Pavan, 2026-10-09) — Sales stages keep
     the colour set in Sales Settings, in the header as in the table. */
  color?: PillColor | null;
  label: string;
  saveState?: "idle" | "saving" | "saved";
  /**
   * False drops the status chip and keeps only the save note — for a sheet
   * whose stage is already shown on its own track (Pavan, 2026-10-05).
   */
  showStatus?: boolean;
}) {
  const note =
    saveState === "saving" ? (
      <>
        <Loader2 className="size-3 animate-spin" />
        Draft saving…
      </>
    ) : (
      <>
        <Check className="size-3" />
        Draft saved
      </>
    );

  if (!showStatus) {
    if (saveState === "idle") return null;
    return (
      <span
        className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {note}
      </span>
    );
  }

  if (saveState === "idle") {
    return (
      <StatusChip tone={tone} color={color} variant="soft">
        {label}
      </StatusChip>
    );
  }

  /* A DRAFT SAYS IT ONCE. "Draft saved" already contains the status, so the
     chip — its dot, its fill, its own word "Draft" — would be saying the same
     thing a second and third time. Plain text, one mark, one meaning. */
  if (label.toLowerCase() === "draft") {
    return (
      <span
        className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {note}
      </span>
    );
  }

  /* NOT A DRAFT, so two things are true at once. An Assigned order still has a
     status worth seeing, and "Assigned saved" is not a sentence — the status
     keeps its chip and the save note sits beside it. The word stays "Draft"
     because what is kept is the draft of the edit, not the order. */
  return (
    <span className="flex items-center gap-2">
      <StatusChip tone={tone} color={color} variant="soft">
        {label}
      </StatusChip>
      <span
        className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {note}
      </span>
    </span>
  );
}

export function RecordSheet({
  size = "form",
  fit,
  level = 1,
  open,
  onOpenChange,
  mode,
  editTitle,
  createTitle,
  editAction = "Confirm",
  createAction,
  headerAside,
  headerSubtitle,
  headerActions,
  headerMenu,
  showCancel = true,
  steps,
  canSubmit = true,
  pending,
  footerPrimary,
  footerAside,
  onSubmit,
  footerBanner,
  footerBannerClassName,
  stepsAction,
  stepNav,
  stepColumn = false,
  children,
}: RecordSheetProps) {
  const creating = mode === "create";
  const stepped = stepNav ?? level !== 2;
  const [navOn, setNavOn] = React.useState(false);
  const navShown = stepped && navOn;
  /* FULL WIDTH WHILE THE STEP COLUMN SHOWS (Pavan, 2026-10-05). */
  const fills = size === "full" || navShown;
  const parentWidth = React.useContext(ParentSheetWidth);
  const own =
    size === "data"
      ? Math.max(DATA_WIDTH, fit ? fitWidth(fit) : 0)
      : fit
        ? fitWidth(fit)
        : size === "compact"
          ? 510
          : FORM_WIDTH;
  const width = level === 2 && parentWidth !== null ? Math.min(own, parentWidth - 56) : own;
  /* WHY (Pavan, 2026-10-07). A dead primary says why on press (G25): the
     strip is raised by the press, not shown up front, and drops on close. */
  const [pendingRaised, setPendingRaised] = React.useState(false);
  React.useEffect(() => {
    if (!open) setPendingRaised(false);
  }, [open]);
  const saysWhy = pending !== undefined;
  const notReady = !canSubmit || (pending?.length ?? 0) > 0;
  const banner =
    footerBanner ??
    (saysWhy && pendingRaised ? <PendingStrip tone="caution" pending={pending} /> : undefined);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        /* THE GAP IS A VARIABLE, so one set of classes serves both levels. A
           second-level sheet takes 112 — the constant, twice — and the strip
           of the sheet beneath it is what says it is second. */
        style={
          {
            "--fp-sheet-gap": level === 2 ? "112px" : "56px",
            "--fp-sheet-w": `${width}px`,
          } as React.CSSProperties
        }
        className={cn(
          "gap-0 p-0",
          fills
            ? /* FULL — the intense forms, and any sheet showing its step column. */
              "w-[calc(100vw-var(--fp-sheet-gap))] sm:max-w-[calc(100vw-var(--fp-sheet-gap))]"
            : /* THE CONTENT'S WIDTH, clamped by the gap (`--fp-sheet-w`). */
              "w-[min(var(--fp-sheet-w),calc(100vw-var(--fp-sheet-gap)))] sm:max-w-[min(var(--fp-sheet-w),calc(100vw-var(--fp-sheet-gap)))]"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <SheetTitle className="text-base">
                {creating ? createTitle : editTitle}
              </SheetTitle>
              {headerAside}
            </div>
            {headerSubtitle}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            {headerMenu}
            <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </div>

        {/* ACROSS THE SHEET only without a step column; with one, the band
            starts where the form starts (Pavan, 2026-10-05). */}
        {steps && !navShown && (
          /* NO RULE UNDER THE STEPS (Pavan, 2026-10-16) — the strip keeps the
             sheet's own white, and the form scrolls under it. */
          <div className="shrink-0 bg-background px-4">{steps}</div>
        )}

        {stepped ? (
          <SteppedFormBody
            footer={navShown ? banner : undefined}
            footerClassName={footerBannerClassName}
            top={navShown ? steps : undefined}
            onShownChange={setNavOn}
            stepsAction={stepsAction}
            hideColumn={!stepColumn}
          >
            <ParentSheetWidth.Provider value={fills ? 99999 : width}>{children}</ParentSheetWidth.Provider>
            <SheetPattern />
          </SteppedFormBody>
        ) : (
          <FormStepsContext.Provider value={false}>
            <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-auto p-4">
              <ParentSheetWidth.Provider value={fills ? 99999 : width}>{children}</ParentSheetWidth.Provider>
            <SheetPattern />
            </div>
          </FormStepsContext.Provider>
        )}

        {banner && !navShown && (
          /* ABOVE THE FOOTER AND OUTSIDE THE SCROLL — the same reason the
             stage bar sits under the header: a strip that describes the
             footer's button has to be visible whenever the button is. */
          <div className="shrink-0 border-t border-border px-4 py-2.5">
            {banner}
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {footerAside}
          </div>
          <div className="flex items-center gap-3">
          {showCancel && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {/* `undefined` = the default Save/Create; anything else replaces it,
              and `null` leaves the slot empty on a step with nothing to
              commit. */}
          {footerPrimary !== undefined ? (
            footerPrimary
          ) : (
            /* WHY (Pavan, 2026-10-07). With `pending` the button is never
               disabled — a press while not ready names the gap (G25). Without
               it, the old `disabled` stays so no caller changes unasked. */
            <Button
              disabled={!saysWhy && !canSubmit}
              onClick={() => {
                if (saysWhy && notReady) {
                  setPendingRaised(true);
                  const first = pending?.find((p) => p.target);
                  if (first?.target) attend(first.target);
                  return;
                }
                onSubmit();
                onOpenChange(false);
              }}
            >
              {creating ? createAction : editAction}
            </Button>
          )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
