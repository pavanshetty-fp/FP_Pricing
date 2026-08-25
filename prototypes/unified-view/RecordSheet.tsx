import * as React from "react";
import { X } from "lucide-react";
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
  /** Disable submit while the draft is incomplete. */
  canSubmit?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}

export function RecordSheet({
  open,
  onOpenChange,
  mode,
  editTitle,
  createTitle,
  editAction = "Save Changes",
  createAction,
  headerAside,
  canSubmit = true,
  onSubmit,
  children,
}: RecordSheetProps) {
  const creating = mode === "create";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[560px] gap-0 p-0 sm:max-w-[560px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="text-base">
              {creating ? createTitle : editTitle}
            </SheetTitle>
            {headerAside}
          </div>
          <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-auto p-4">
          {children}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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
      </SheetContent>
    </Sheet>
  );
}
