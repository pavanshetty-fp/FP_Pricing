import * as React from "react";
import { Check, Loader2, X } from "lucide-react";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
export interface RecordSheetProps {
  /**
   * `narrow` is the DS's 560px side sheet — right for a form of stacked fields.
   * `wide` is for a sheet carrying TABLES — at 560 their columns had to be
   * scrolled sideways to be read, and a table you scroll to read is a table you
   * cannot compare rows in.
   *
   * `xwide` is 1120px, for a step whose tables run to eight columns. IT IS PER
   * STEP, NOT PER SHEET: a sheet is only as wide as what is currently in it, so
   * a form of stacked fields does not inherit the width its pricing tables
   * needed, and nobody reads a two-column form with a metre between a label and
   * its control. The same rule `BulkEditDialog` follows when its summary step
   * goes from `default` to `lg`.
   *
   * All three are CAPPED rather than filling the viewport. 60px-from-the-edge is
   * the most a sheet may take, not the width it should be; the viewport clamp
   * only bites on a narrow screen.
   */
  size?: "narrow" | "wide" | "xwide";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "create";
  /** Header title when editing, e.g. `Order #: 6104420`. */
  editTitle: string;
  /** Header title when creating, e.g. `Create Asset Order`. */
  createTitle: string;
  /** Submit label when editing. Defaults to the DS's `Save Changes`. */
  editAction?: string;
  /** Submit label when creating — usually the same words as `createTitle`. */
  createAction: string;
  /** Rendered beside the title, e.g. a StatusChip. */
  headerAside?: React.ReactNode;
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
   * caller folds it into its own status chip with `DraftStatusChip` — one chip
   * saying "Draft · Saved" rather than two elements sharing one meaning.
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
   * Controls that ride in the footer, left of Cancel/Submit. For decisions
   * taken at the moment of committing rather than while filling the form —
   * they stay in view no matter how far the body has scrolled.
   */
  footerAside?: React.ReactNode;
  onSubmit: () => void;
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
 * The status chip, with the draft's save state folded into it.
 *
 * ONE CHIP, NOT TWO THINGS SIDE BY SIDE. "Draft" and "Saved" were separate
 * elements saying one thing between them — what state this record is in — and
 * read as a status and an unrelated notice. `Draft · Saved` is the sentence
 * they were already trying to make.
 *
 * The save half is quieter than the status half, because the status is the
 * fact and the save is the reassurance.
 */
export function DraftStatusChip({
  tone,
  label,
  saveState = "idle",
}: {
  tone: StatusTone;
  label: string;
  saveState?: "idle" | "saving" | "saved";
}) {
  return (
    <StatusChip tone={tone} variant="soft">
      {label}
      {saveState !== "idle" && (
        <>
          <span aria-hidden className="opacity-40">
            ·
          </span>
          <span className="inline-flex items-center gap-1 opacity-80" aria-live="polite">
            {saveState === "saving" ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="size-3" />
                Saved
              </>
            )}
          </span>
        </>
      )}
    </StatusChip>
  );
}

export function RecordSheet({
  size = "narrow",
  open,
  onOpenChange,
  mode,
  editTitle,
  createTitle,
  editAction = "Save Changes",
  createAction,
  headerAside,
  headerActions,
  headerMenu,
  showCancel = true,
  steps,
  canSubmit = true,
  footerAside,
  onSubmit,
  children,
}: RecordSheetProps) {
  const creating = mode === "create";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "gap-0 p-0",
          size === "xwide"
            ? "w-[min(1120px,calc(100vw-60px))] sm:max-w-[min(1120px,calc(100vw-60px))]"
            : size === "wide"
              ? "w-[min(864px,calc(100vw-60px))] sm:max-w-[min(864px,calc(100vw-60px))]"
              : "w-[560px] sm:max-w-[560px]"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="text-base">
              {creating ? createTitle : editTitle}
            </SheetTitle>
            {headerAside}
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

        {steps && (
          <div className="shrink-0 border-b border-border px-4">{steps}</div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-auto p-4">
          {children}
        </div>

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
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onSubmit();
              onOpenChange(false);
            }}
          >
            {creating ? createAction : editAction}
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
