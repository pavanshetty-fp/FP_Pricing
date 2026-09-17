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
 *   text — the DEFAULT: the label alone, in the tone colour, on no fill.
 *   soft — soft tinted pill (`/10` fill + tone text). The DS's canonical
 *          treatment for states that need to be noticed, e.g. errors.
 *   dot  — token-coloured dot BESIDE a neutral label. Asked for by name and
 *          never arrived at by default: for a dense grid where many rows show
 *          a status and a column of coloured words would shout.
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
 * <StatusChip tone="success">Success</StatusChip>                  // the word, in tone
 * <StatusChip tone="failed" variant="soft">Failed</StatusChip>     // tinted pill
 * <StatusChip tone="neutral" variant="dot">Queued</StatusChip>     // dot + neutral word
 * ```
 *
 * CONTRAST — measured label-vs-fill ratios, both themes. `dot` keeps a
 * `foreground` label and is safe everywhere (14.6 dark / 20.5 light).
 *
 *   variant/tone          FP-dark      Light (was -> now)
 *   text/success          7.18  ok     3.30 FAILED -> 5.02  ok
 *   text/processing       7.62  ok     3.19 FAILED -> 5.02  ok
 *   text/failed           5.91  ok     4.83  ok    (unchanged)
 *   text/neutral          6.44  ok     5.99  ok    (unchanged)
 *   soft/success          6.04  ok     2.96 FAILED -> 4.38  ok for large only
 *   soft/processing       6.38  ok     2.86 FAILED -> 4.39  ok for large only
 *   soft/failed           5.15  ok     4.13 FAILED -> 4.13  still short
 *   soft/neutral          5.45  ok     5.24  ok    (unchanged)
 *
 * FIXED for `text`: the light `--status-success` / `--status-processing` values
 * moved one step down the ramp they already sit on (green-600 -> green-700,
 * amber-600 -> amber-700). Green and amber are far lighter than red/pink/blue at
 * the same step, which is why only those two needed it. See the note beside the
 * tokens in `src/index.css`.
 *
 * STILL SHORT for `soft` on light. A 10% tint of the label's own hue lifts the
 * background much faster than it darkens the text, so the pill lands at ~4.4
 * rather than 4.5 — fine for large text, short of AA for body. `soft/failed` is
 * unchanged at 4.13. It used to be described as tracking `--destructive`; the
 * 2026-08-27 Figma light sync moved that token to red/500 (#ef4444, 3.76 as text
 * on white) while `--status-failed` deliberately stayed at red-600, so the two
 * are now independent and the `destructive` Badge variant no longer shares this
 * chip's recipe in light. If `soft` needs to
 * carry body text on light surfaces, the tint has to stop being a straight alpha
 * of the label colour — it needs its own token pair (a fixed tint plus a
 * foreground measured against it), the way the pastel pairs are built. Until
 * then `dot` and `text` are both safe on light and `soft` is large-text only.
 */
export function StatusChip({
  tone = "neutral",
  variant = "text",
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
      {/* A STATUS IS ITS WORD. The dot now renders for the `dot` variant and
          nowhere else, because that variant is the one place it is the ONLY
          thing carrying the tone — its label is deliberately neutral.

          `soft` tints the whole shape and `text` colours the whole label, so
          in both a dot of the same colour said the tone a second time and ate
          12px of a chip whose whole job is to be small. Nothing is added to a
          status that the status has not been asked for: see
          `docs/ds/ui/2-rules.md` §11. */}
      {variant === "dot" && (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
        />
      )}
      {children}
    </span>
  );
}
