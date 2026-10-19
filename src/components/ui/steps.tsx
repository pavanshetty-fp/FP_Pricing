import { StageTrack } from "@/components/ui/stage-track";

/*
  STEPS — the numbered progress indicator for work that has an order to it.

  Named after the DS library's "Pro Blocks / Buttons / Steps". Built from the
  repo's own tokens rather than lifted pixel-for-pixel, which is this project's
  standing rule for visual values.

  IT IS NOT A TAB STRIP, and that is the whole reason it exists. Tabs are views
  of one thing and may be read in any order; a step is a STAGE, and the second
  one exists because the first produced something. Two labels under an underline
  say "pick one"; numbered discs joined by a rule say "this, then that" — and
  the rule between them is what carries the sequence, so it is the part that
  cannot be dropped.

  THREE STATES, and each says something different about what has happened:
    complete  — filled disc, a tick instead of the number. It is done.
    current   — filled disc, the number. It is where you are.
    upcoming  — hollow disc. It is ahead of you.
  A step can also be UNREACHABLE, which is not the same as upcoming: upcoming is
  "not yet", unreachable is "not possible", and the second one owes an
  explanation. `disabledReason` is both the tooltip and the reason it is dimmed.
*/

export interface StepItem {
  value: string;
  label: string;
  /** Under the label — what this step is for. Optional. */
  description?: string;
  /**
   * Why this step cannot be opened. Present = disabled, and shown on hover:
   * a control that refuses a click without saying why just gets clicked again.
   */
  disabledReason?: string;
}

export function Steps({
  steps,
  value,
  onValueChange,
  className,
  tone,
  variant,
}: {
  steps: StepItem[];
  value: string;
  onValueChange?: (next: string) => void;
  className?: string;
  /** The current step's colour — see `StageTrack`. A create form's steps are
      NEUTRAL by default (Pavan, 2026-10-16): green done, black in progress. */
  tone?: "brand" | "accent" | "neutral";
  /** `rings` — see `StageTrack`. THE DEFAULT for every create form, in every
      module (Pavan, 2026-10-16 — the recurring rule's look, everywhere). */
  variant?: "track" | "rings";
}) {
  /* ONE LOOK FOR STEPS AND STAGES (Pavan, 2026-10-16): a form's steps are the
     record's stage track — done green with a white tick on a green line, the
     current step a black-rimmed pill, the rest hollow —
     compact and pressable. `description` is no longer drawn. */
  return (
    <StageTrack
      compact
      tone={tone ?? "accent"}
      variant={variant ?? "rings"}
      className={className}
      stages={steps.map((s) => ({ key: s.value, label: s.label }))}
      current={value}
      onStageClick={(k) => onValueChange?.(k)}
      disabledReason={(k) => steps.find((s) => s.value === k)?.disabledReason}
    />
  );
}
