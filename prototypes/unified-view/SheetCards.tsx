import * as React from "react";
import {
  Ban,
  DollarSign,
  History as HistoryIcon,
  Layers,
  Mail,
  Pencil,
  Plus,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/*
  THE RECORD SHEET'S TWO SHARED CARDS (Pavan, 2026-10-07 — ux §Record sheets).
  Lifted out of the 3PL order sheet unchanged, so every module's sheet shows
  what its form computes in the SUMMARY CARD and its history in the ACTIVITY
  CARD, instead of each drawing its own. The 3PL sheet imports these back; a
  change here is a change there.
*/

/** The trail's clock: the day and the minute, which is the grain anyone asks
 *  a history in. Seconds would be precision nobody uses. */
const AUDIT_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * WHAT AN ACTIVITY ENTRY IS ABOUT, from what it says.
 *
 * The audit trail is one line of prose per change, which is the right thing to
 * store and the wrong thing to scan: six lines of identical grey text hide the
 * one that matters. A mark gives each entry a kind at a glance — money, a
 * message that left the building, something added, something that moved
 * backwards — and money and creation get a tint, because those are the two the
 * eye should catch on the way past.
 */
function auditMark(text: string): { icon: React.ReactNode; tone: string } {
  const t = text.toLowerCase();
  if (/\bquote|price|\$|margin|rate/.test(t))
    return {
      icon: <DollarSign />,
      tone: "border-status-success/30 bg-status-success/10 text-status-success",
    };
  if (/invit|sent|notif|email|acknowled/.test(t))
    return {
      icon: <Mail />,
      tone: "border-fp-banner-accent-info/30 bg-fp-banner-accent-info/10 text-fp-banner-accent-info",
    };
  if (/created/.test(t))
    return {
      icon: <Plus />,
      tone: "border-status-success/30 bg-status-success/10 text-status-success",
    };
  if (/cancel|remov|delet|block/.test(t))
    return {
      icon: <Ban />,
      tone: "border-status-failed/30 bg-status-failed/10 text-status-failed",
    };
  if (/load order|terminal|supplier/.test(t))
    return { icon: <Layers />, tone: "border-border bg-card text-muted-foreground" };
  if (/asset|product|gal/.test(t))
    return { icon: <Truck />, tone: "border-border bg-card text-muted-foreground" };
  return { icon: <Pencil />, tone: "border-border bg-card text-muted-foreground" };
}

/**
 * A label/value row in a rail card, and — where there is one — the ARITHMETIC
 * BEHIND THE FIGURE, on hover.
 *
 * A total in a summary is a claim, and the reader's next question is always
 * the same: made of what? Without it the answer is a table two sections away,
 * and comparing the two means holding one number in your head while you scroll
 * to the other. A tooltip puts the working where the claim is. It is NOT a
 * substitute for the tables — those are where the figures are TYPED — it is
 * the read-only account of how they add up.
 */
export function RailRow({
  label,
  value,
  breakdown,
  variant = "rail",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** One line per contribution. Rendered only when there is something to show. */
  breakdown?: { label: string; value: string }[];
  /** `line` / `total` — the Summary card's statement rows (2026-10-05). */
  variant?: "rail" | "line" | "total";
}) {
  const row = (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3",
        variant === "rail" ? "px-4 py-2.5" : "py-1",
        /* A TOTAL NEVER CUTS ITS LABEL (Pavan, 2026-10-20) — too long for
           one line, the figure drops under it, right-aligned. */
        variant === "total" && "flex-wrap gap-y-0.5",
        breakdown?.length && "cursor-help"
      )}
    >
      <dt
        className={cn(
          "min-w-0 truncate",
          variant === "rail" && "shrink-0 text-xs text-muted-foreground",
          variant === "line" && "text-sm text-foreground",
          variant === "total" && "shrink-0 overflow-visible text-base font-medium text-foreground"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 shrink-0 truncate tabular-nums",
          variant === "rail" && "text-sm text-foreground",
          variant === "line" && "text-sm text-muted-foreground",
          variant === "total" && "ml-auto text-base font-semibold text-foreground",
          /* THE DOTTED RULE IS THE WHOLE AFFORDANCE. A figure that explains
             itself has to say so without a second control beside it. */
          breakdown?.length &&
            "underline decoration-dotted decoration-muted-foreground underline-offset-4"
        )}
      >
        {value}
      </dd>
    </div>
  );
  if (!breakdown?.length) return row;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <span className="flex flex-col gap-1">
          {breakdown.map((b) => (
            <span key={b.label} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate">{b.label}</span>
              <span className="shrink-0 tabular-nums">{b.value}</span>
            </span>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A rail card: the same bordered block `SheetSection` draws, with its own
 * header band and a flush body — the rail is nothing but read-outs, so every
 * card in it is a list running edge to edge.
 */
export function RailCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="shrink-0 overflow-hidden rounded-lg border border-border">
      {/* A QUIET HEADER (Pavan, 2026-10-26) — the band's fill and the
          semibold made every read-out card shout as loud as the one that
          changes (Invitations); now the title sits on the card's own ground,
          medium weight, a hairline under it. */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          {icon && <span className="[&_svg]:size-3.5">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * THE SUMMARY CARD — the 3PL "Quotation summary" shell (Pavan, 2026-10-07):
 * a tinted frame, the title on the frame, and one inner card that holds the
 * label · value rows with the headline figure last.
 */
export function SummaryCard({
  title,
  children,
  fill = false,
}: {
  title: string;
  children: React.ReactNode;
  /** GROW TO THE COLUMN'S HEIGHT (Pavan, 2026-10-20) — when it's the only
      card in the rail; put `mt-auto` on what should sit at its bottom. */
  fill?: boolean;
}) {
  return (
    <section className={`${fill ? "flex min-h-64 flex-1 flex-col" : "shrink-0"} rounded-xl bg-fp-highlight p-1`}>
      <h3 className="px-3 pt-2 pb-2.5 text-base font-semibold text-foreground">{title}</h3>
      <div className={`flex flex-col gap-3 rounded-lg border border-border bg-fp-surface-1b p-3${fill ? " min-h-0 flex-1 overflow-auto" : ""}`}>
        {children}
      </div>
    </section>
  );
}

/** One entry of a record's history — every module's audit has this shape. */
export interface TimelineEntry {
  at: string;
  by: string;
  changes: string[];
}

/**
 * THE ACTIVITY CARD — the 3PL rail card with its timeline (Pavan,
 * 2026-10-07): the six latest saves, each change on its own mark.
 */
export function ActivityCard({
  entries,
  timeZone,
}: {
  entries?: TimelineEntry[];
  /** Print the stamps in this zone — Sales' Preferences (2026-10-07). */
  timeZone?: string;
}) {
  const fmt = timeZone
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      })
    : AUDIT_FMT;
  return (
    <RailCard title="Activity" icon={<HistoryIcon />}>
      {!entries || entries.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Nothing has changed yet.
        </p>
      ) : (
        /* A TIMELINE, NOT A LIST OF RULED ROWS. Six entries separated
           by hairlines is a table of one column; a line running down
           the marks says the obvious thing about an audit trail —
           these happened in an order, most recent first — without a
           word of chrome.

           WHAT CHANGED LEADS, WHO AND WHEN FOLLOWS. The reader is
           looking for the event; the name and the timestamp are what
           they check once they have found it. */
        <ol className="flex flex-col px-4 py-3">
          {[...entries]
            .reverse()
            .slice(0, 6)
            .flatMap((e, i) =>
              e.changes.map((c, j) => ({ e, c, key: `${e.at}-${i}-${j}` }))
            )
            .map(({ e, c, key }, idx, all) => {
              const mark = auditMark(c);
              return (
                <li key={key} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* The connector stops at the last mark rather than
                      running off the end of the list. */}
                  {idx < all.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-7 bottom-0 left-[13px] w-px bg-border"
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5",
                      mark.tone
                    )}
                  >
                    {mark.icon}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                    <span className="text-sm text-foreground">{c}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt.format(new Date(e.at))} · {e.by}
                    </span>
                  </span>
                </li>
              );
            })}
        </ol>
      )}
    </RailCard>
  );
}
