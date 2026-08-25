import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Attribute being edited, e.g. "Driver". Becomes the step-1 title. */
  title: string;
  /**
   * Verb phrase for the scope line, WITHOUT a trailing "selected" — the line is
   * composed as `{scopeVerb} selected {N items}`, so "Assign driver to" reads
   * "Assign driver to selected 25 orders".
   */
  scopeVerb: string;
  count: number;
  /** Noun for the count, pluralised automatically. */
  itemNoun?: string;
  /** Step 1 is only completable once the picker has a value. */
  canProceed: boolean;
  /** Step 1 body — the picker. */
  children: React.ReactNode;
  /** Step 2 body — what already exists, and what changes. */
  summary: React.ReactNode;
  /** One line under the "View Summary" title describing the commit. */
  summaryDescription: string;
  /** Commit. The dialog closes itself afterwards. */
  onConfirm: () => void;
  /**
   * Confirmation toast. A string overrides the default wording; `false`
   * suppresses it. Fired by the dialog rather than left to callers so the
   * "apply → toast" rule cannot be forgotten one call site at a time.
   */
  toastMessage?: string | false;
  /**
   * Mark the commit destructive. Adds a second confirmation press before the
   * mutation runs, for replaces that discard standing values.
   */
  destructive?: boolean;
}

/**
 * Two-step bulk-attribute editor.
 *
 * The shape is the DS's prescribed one: bulk-attribute editors come in three
 * tiers by cardinality (scalar → single input; one-value-per-row → searchable
 * select; a collection per row → richer picker), each opening a **dialog**, and
 * each taking a two-step shape — (1) input dialog whose header leads with
 * **scope + count**, (2) per-row **before/after preview** with `Go back` /
 * `Confirm`, (3) commit. This shell is tier-agnostic: the tier only changes what
 * you pass as `children`.
 *
 * WHY BOTH STEPS EARN THEIR KEEP — the reason the pattern exists, and the thing
 * to preserve if it is ever "simplified": the operator needs to see the state
 * that **already exists** on the target before piling onto it. A target is
 * typically mid-flight with values already on it. Step 1 surfaces that standing
 * state (see `StandingItems`); step 2 shows the delta it is about to become (see
 * `BeforeAfterTable`). Collapsing to one step removes the only chance to notice
 * you are about to replace something.
 *
 * The dialog ALWAYS reopens on step 1. Reopening mid-flow would present a
 * `Confirm` for a value the operator can no longer see.
 */
export function BulkEditDialog({
  open,
  onOpenChange,
  title,
  scopeVerb,
  count,
  itemNoun = "item",
  canProceed,
  children,
  summary,
  summaryDescription,
  onConfirm,
  toastMessage,
  destructive = false,
}: BulkEditDialogProps) {
  const [step, setStep] = React.useState<"pick" | "summary">("pick");
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep("pick");
      setArmed(false);
    }
  }, [open]);

  const items = `${count} ${count === 1 ? itemNoun : `${itemNoun}s`}`;

  const commit = () => {
    // A destructive replace discards standing values, so it takes a second
    // deliberate press rather than committing on the first.
    if (destructive && !armed) {
      setArmed(true);
      return;
    }
    onConfirm();
    if (toastMessage !== false) {
      toast.success(toastMessage ?? `Updated ${items}`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={step === "summary" ? "lg" : "default"}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{step === "pick" ? title : "View Summary"}</DialogTitle>
          <DialogDescription>
            {step === "pick" ? (
              <>
                {scopeVerb} selected{" "}
                <span className="font-medium text-foreground">{items}</span>
              </>
            ) : (
              summaryDescription
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Body scrolls; the header and footer stay put however many rows the
            selection carries. */}
        <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">
          {step === "pick" ? children : summary}
        </div>

        {step === "pick" ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canProceed} onClick={() => setStep("summary")}>
              Proceed and Confirm
            </Button>
          </DialogFooter>
        ) : (
          // `between`: Go back navigates, it does not dismiss — grouping it
          // against Confirm would read as a cancel.
          <DialogFooter align="between">
            <Button
              variant="outline"
              onClick={() => {
                setArmed(false);
                setStep("pick");
              }}
            >
              Go back
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={commit}
            >
              {destructive && armed ? `Yes, replace ${items}` : "Confirm"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
