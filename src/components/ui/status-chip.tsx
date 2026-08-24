import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Visual channel a status is rendered in. Deliberately NOT a list of domain
 * statuses: per the DS's colour governance a status carries no colour until a
 * usage rule binds it, so the DS ships the channels and each application
 * declares its own mapping (see `statusTone` in `tables-layout/data.ts` for the
 * table's mapping).
 */
export type StatusTone = "success" | "processing" | "failed" | "neutral";

/**
 * Which of the three status treatments to render.
 *   dot  — token-coloured dot, neutral label. The quietest; use in dense grids
 *          where many rows show a status and colour would shout.
 *   text — dot AND label both take the tone colour, on no fill. Use where the
 *          status is the point of the row.
 *   soft — soft tinted pill (`/10` fill + tone text). The DS's canonical
 *          treatment for states that need to be noticed, e.g. errors.
 */
export type StatusChipVariant = "dot" | "text" | "soft";

/** Foreground per tone — drives `text` and `soft`. */
const TONE_FG: Record<StatusTone, string> = {
  success: "text-status-success",
  processing: "text-status-processing",
  failed: "text-status-failed",
  neutral: "text-muted-foreground",
};

/** Dot fill per tone — only `dot` needs this; the others ride `bg-current`. */
const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-status-success",
  processing: "bg-status-processing",
  failed: "bg-status-failed",
  neutral: "bg-muted-foreground",
};

/** Soft tint per tone — `/10` fill, matching the destructive Badge recipe. */
const TONE_SOFT: Record<StatusTone, string> = {
  success: "bg-status-success/10",
  processing: "bg-status-processing/10",
  failed: "bg-status-failed/10",
  neutral: "bg-muted-foreground/10",
};

export interface StatusChipProps extends React.ComponentProps<"span"> {
  /** The colour channel. Caller-supplied — the DS ships no status→tone map. */
  tone?: StatusTone;
  variant?: StatusChipVariant;
}

/**
 * Status chip — one vocabulary for the three status treatments the system uses.
 *
 * The dot is `aria-hidden`: it repeats the label, so announcing it would just
 * add noise. Colour is never the only carrier of meaning — the label always
 * spells the status out.
 *
 * ```tsx
 * <StatusChip tone="success">Success</StatusChip>                  // dot
 * <StatusChip tone="failed" variant="text">Failed</StatusChip>     // dot + label
 * <StatusChip tone="failed" variant="soft">Failed</StatusChip>     // tinted pill
 * ```
 *
 * CONTRAST — measured label-vs-fill ratios, both themes. `dot` keeps a
 * `foreground` label and is safe everywhere (14.6 dark / 20.5 light). The
 * coloured treatments are NOT safe on light surfaces:
 *
 *   variant/tone          FP-dark      Light
 *   text/success          7.18  ok     3.30  FAILS AA
 *   text/processing       7.62  ok     3.19  FAILS AA
 *   text/failed           5.91  ok     4.83  ok
 *   text/neutral          6.44  ok     5.99  ok
 *   soft/success          6.04  ok     2.96  FAILS AA
 *   soft/processing       6.38  ok     2.86  FAILS AA
 *   soft/failed           5.15  ok     4.13  FAILS AA
 *   soft/neutral          5.45  ok     5.24  ok
 *
 * KNOWN GAP — this is NOT introduced here: the light `--status-*` values
 * (#16a34a / #d97706 / #dc2626) are simply too light to carry text on #ffffff,
 * and the existing `destructive` Badge variant already ships the same failing
 * recipe (`bg-destructive/10 text-destructive` = 4.13 in light). Fixing it needs
 * darker light-mode status values decided in Figma — do not invent them here.
 * Until then: prefer `dot` on light surfaces, and reserve `text`/`soft` for
 * FP-dark or for the `failed`/`neutral` tones.
 */
export function StatusChip({
  tone = "neutral",
  variant = "dot",
  className,
  children,
  ...props
}: StatusChipProps) {
  const isSoft = variant === "soft";
  return (
    <span
      data-slot="status-chip"
      data-tone={tone}
      data-variant={variant}
      className={cn(
        "inline-flex w-fit shrink-0 items-center whitespace-nowrap",
        isSoft
          ? cn(
              "gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              TONE_SOFT[tone],
              TONE_FG[tone]
            )
          : cn("gap-2 text-sm", variant === "text" && cn("font-medium", TONE_FG[tone])),
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          // `text` and `soft` colour the whole chip, so one class drives the
          // dot too; `dot` keeps a neutral label and needs the token directly.
          variant === "dot" ? TONE_DOT[tone] : "bg-current"
        )}
      />
      {children}
    </span>
  );
}
