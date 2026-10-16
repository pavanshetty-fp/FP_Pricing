import * as React from "react";

import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

/*
  THE PILL — the DS's chip and badge (Pavan, 2026-10-09). Trialled on the
  Sales Orders table after the Lovable reference, approved, and promoted here
  as the default for every status, tag, flag and "+N" in Unified View.

  ONE RECIPE, every pill: fully rounded, 28px tall, 12px side padding, 12px
  regular text, no border, a faint tint of the hue behind text in that hue.
  `docs/ds/ui/2-rules.md` §11b.

  COLOUR IS BY KIND (the five kinds of §10b) unless a module lets the user
  choose one — then `color` takes the DS lane palette over the kind.
*/

/** What kind of state a pill says — §10b. The application binds its statuses
 *  to these; the DS never names a status. */
export type PillKind = "neutral" | "info" | "caution" | "success" | "critical";

const KIND_PILL: Record<PillKind, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-fp-banner-accent-info/10 text-fp-banner-accent-info",
  caution: "bg-fp-banner-accent-caution/10 text-fp-banner-accent-caution",
  success: "bg-status-success/10 text-status-success",
  critical: "bg-status-failed/10 text-status-failed",
};

/*
  A CHOSEN COLOUR (Pavan, 2026-10-09) — for tags whose colour is picked by the
  user (Sales stages, order types) rather than set by meaning. The DS lane
  palette: a faint tint of the hue behind text mixed from that hue and the
  body ink, so it reads in both themes.
*/
export type PillColor =
  | "grey" | "blue" | "yellow" | "green" | "cyan"
  | "purple" | "violet" | "pink" | "orange" | "red";

export const PILL_COLORS: { value: PillColor; label: string }[] = [
  { value: "grey", label: "Grey" },
  { value: "blue", label: "Blue" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
  { value: "cyan", label: "Cyan" },
  { value: "purple", label: "Purple" },
  { value: "violet", label: "Violet" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
];

const COLOR_PILL: Record<PillColor, string> = {
  grey: "bg-fp-lane-grey/12 text-[color-mix(in_oklab,var(--color-fp-lane-grey)_70%,var(--foreground))]",
  blue: "bg-fp-lane-blue/12 text-[color-mix(in_oklab,var(--color-fp-lane-blue)_70%,var(--foreground))]",
  yellow: "bg-fp-lane-yellow/18 text-[color-mix(in_oklab,var(--color-fp-lane-yellow)_55%,var(--foreground))]",
  green: "bg-fp-lane-green/12 text-[color-mix(in_oklab,var(--color-fp-lane-green)_60%,var(--foreground))]",
  cyan: "bg-fp-lane-cyan/12 text-[color-mix(in_oklab,var(--color-fp-lane-cyan)_60%,var(--foreground))]",
  purple: "bg-fp-lane-purple/12 text-[color-mix(in_oklab,var(--color-fp-lane-purple)_70%,var(--foreground))]",
  /* THE ACCENT (2026-10-16) — the violet pill is the accent's soft wash and ink. */
  violet: "bg-accent-violet-soft text-accent-violet-ink",
  pink: "bg-fp-lane-pink/12 text-[color-mix(in_oklab,var(--color-fp-lane-pink)_70%,var(--foreground))]",
  orange: "bg-fp-lane-orange/15 text-[color-mix(in_oklab,var(--color-fp-lane-orange)_60%,var(--foreground))]",
  red: "bg-fp-lane-red/12 text-[color-mix(in_oklab,var(--color-fp-lane-red)_70%,var(--foreground))]",
};

/** The shape every pill shares — exported so a chip drawn by another
 *  component (`StatusChip`) cannot drift from it. */
export const PILL_SHAPE =
  "inline-flex h-7 max-w-full shrink-0 items-center rounded-full px-3 text-xs font-normal whitespace-nowrap";

/** The colour classes for a kind, or for a chosen colour over it. */
export function pillColorClass(kind: PillKind = "neutral", color?: PillColor | null) {
  return color ? COLOR_PILL[color] : KIND_PILL[kind];
}

export interface PillProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "className" | "color"> {
  kind?: PillKind;
  /** A chosen colour, over the kind's. */
  color?: PillColor | null;
  className?: string;
  children: React.ReactNode;
}

export function Pill({ kind = "neutral", color, className, children, ...rest }: PillProps) {
  return (
    <span
      data-slot="pill"
      data-kind={color ? undefined : kind}
      {...rest}
      className={cn(PILL_SHAPE, pillColorClass(kind, color), className)}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * THE FIRST VALUE AS A PILL, the rest behind a "+N" pill that lists them on
 * hover — products and tags on a row.
 */
export function PillList({
  values,
  label,
  kind = "neutral",
}: {
  values: string[];
  label: string;
  kind?: PillKind;
}) {
  if (values.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  const [first, ...rest] = values;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Pill kind={kind} className="min-w-0 shrink">
        {first}
      </Pill>
      {rest.length > 0 && (
        <HoverCard openDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              aria-label={`Show all ${values.length} ${label}`}
              className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Pill kind={kind} className="tabular-nums">
                +{rest.length}
              </Pill>
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="start" className="w-auto max-w-72 p-2">
            <span className="flex flex-wrap gap-1.5">
              {values.map((v) => (
                <Pill key={v} kind={kind}>
                  {v}
                </Pill>
              ))}
            </span>
          </HoverCardContent>
        </HoverCard>
      )}
    </span>
  );
}
