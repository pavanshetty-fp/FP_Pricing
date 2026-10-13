import * as React from "react";

import { cn } from "@/lib/utils";
import {
  PILL_SHAPE,
  pillColorClass,
  type PillColor,
  type PillKind,
} from "@/components/ui/pill";

/**
 * Visual channel a status is rendered in. Deliberately NOT a list of domain
 * statuses: per the DS's colour governance a status carries no colour until a
 * usage rule binds it, so the DS ships the channels and each application
 * declares its own mapping (see `statusTone` in `tables-layout/data.ts` for the
 * table's mapping).
 *
 * `info` is the fifth channel (2026-09-23): blue, on `--fp-banner-accent-info`,
 * the one hue here that carries no verdict. A state that is simply TRUE —
 * assigned, under way — and asks nothing of anybody. Grey would say it is
 * unremarkable; amber would say somebody is waiting. How an application binds
 * statuses to these five is `docs/ds/ui/2-rules.md` §10b.
 */
export type StatusTone = "success" | "processing" | "failed" | "neutral" | "info";

/**
 * Which of the status treatments to render.
 *   text — the DEFAULT. Since 2026-10-09 it draws the PILL, as `soft` does.
 *   soft — the PILL (`ui/pill.tsx`): rounded-full, 28px, a faint tint of the
 *          tone's hue behind text in that hue.
 *   dot  — token-coloured dot BESIDE a neutral label. Asked for by name and
 *          never arrived at by default: for a dense grid where many rows show
 *          a status and a column of coloured words would shout.
 */
export type StatusChipVariant = "dot" | "text" | "soft";

/* EVERY STATUS IS A PILL (Pavan, 2026-10-09). `text` used to be the label
   alone in the tone colour and `soft` a smaller tinted chip; both now draw the
   DS pill, so a status reads the same in a table cell, a sheet header and on
   a board card. The tone is one of the DS's channels; the pill speaks in
   kinds, and this is the one place the two are matched. */
const TONE_KIND: Record<StatusTone, PillKind> = {
  success: "success",
  processing: "caution",
  failed: "critical",
  neutral: "neutral",
  info: "info",
};

/** Dot fill per tone — only `dot` needs this; the others ride `bg-current`. */
const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-status-success",
  processing: "bg-status-processing",
  failed: "bg-status-failed",
  neutral: "bg-muted-foreground",
  info: "bg-fp-banner-accent-info",
};

export interface StatusChipProps extends Omit<React.ComponentProps<"span">, "color"> {
  /** The colour channel. Caller-supplied — the DS ships no status→tone map. */
  tone?: StatusTone;
  variant?: StatusChipVariant;
  /** A colour the user chose (Sales stages), over the tone's — pill only. */
  color?: PillColor | null;
}

/**
 * Status chip — one vocabulary for the three status treatments the system uses.
 *
 * The dot is `aria-hidden`: it repeats the label, so announcing it would just
 * add noise. Colour is never the only carrier of meaning — the label always
 * spells the status out.
 *
 * ```tsx
 * <StatusChip tone="success">Success</StatusChip>                  // the pill
 * <StatusChip tone="failed" variant="soft">Failed</StatusChip>     // the pill too
 * <StatusChip tone="neutral" variant="dot">Queued</StatusChip>     // dot + neutral word
 * ```
 *
 * CONTRAST — measured before 2026-10-09, when `text` and `soft` both became
 * the pill; the pill's ratios are the `soft` rows below. Label-vs-fill, both themes. `dot` keeps a
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
  color,
  className,
  children,
  ...props
}: StatusChipProps) {
  const isPill = variant !== "dot";
  return (
    <span
      data-slot="status-chip"
      data-tone={tone}
      data-variant={variant}
      className={cn(
        isPill
          ? cn(PILL_SHAPE, "w-fit", pillColorClass(TONE_KIND[tone], color))
          : "inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap text-sm",
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
      {isPill ? <span className="truncate">{children}</span> : children}
    </span>
  );
}
