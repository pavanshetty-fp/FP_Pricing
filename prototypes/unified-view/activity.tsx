import * as React from "react";
import { CircleDot, Plus, Truck, UserRound, CalendarClock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetSection } from "@/components/side-sheet/parts";
import { DATE_FMT } from "./data";

/**
 * THE CHANGE LOG, for modules that did not have one — Sales today (Pavan,
 * 2026-09-23). The same shape as a 3PL order's `audit` and a service order's:
 * one entry per save that changed something MEANINGFUL, each change in words
 * with the old value and the new.
 *
 * WHAT COUNTS IS THE MODULE'S DIFF, NOT THIS FILE. Each module passes the
 * function that decides which changes are events (the approved list); typing
 * that changes nothing on that list writes nothing.
 */
export interface ActivityEntry {
  at: string;
  by: string;
  changes: string[];
}

type Logged = { id: string; audit?: ActivityEntry[] };

/** Who is making the change. The prototype has one signed-in dispatcher. */
const ACTOR = "Dana Whitfield";

/**
 * A row list whose setter writes the log. ONE WRAPPER ROUND THE ONLY SETTER,
 * so no path that edits a row — the sheet, a bulk edit, creation — can forget
 * to log: a new row starts with `createdText`, and a changed row gets an entry
 * listing whatever `diff` says changed.
 */
export function useLoggedRows<T extends Logged>(
  initial: T[],
  diff: (before: T, after: T) => string[],
  createdText = "Order created"
): [T[], (fn: (prev: T[]) => T[]) => void] {
  const [rows, setRaw] = React.useState<T[]>(initial);
  const setRows = React.useCallback(
    (fn: (prev: T[]) => T[]) =>
      setRaw((prev) => {
        const next = fn(prev);
        const at = new Date().toISOString();
        return next.map((r) => {
          const before = prev.find((x) => x.id === r.id);
          if (!before)
            return r.audit?.length
              ? r
              : { ...r, audit: [{ at, by: ACTOR, changes: [createdText] }] };
          if (before === r) return r;
          const changes = diff(before, r);
          return changes.length > 0
            ? { ...r, audit: [...(r.audit ?? []), { at, by: ACTOR, changes }] }
            : r;
        });
      }),
    [diff, createdText]
  );
  return [rows, setRows];
}

const STAMP_TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const stamp = (iso: string) => `${DATE_FMT.format(new Date(iso))} · ${STAMP_TIME.format(new Date(iso))}`;

function mark(text: string): { icon: React.ReactNode; tone: string } {
  const quiet = "border-border bg-card text-muted-foreground";
  if (/created/i.test(text))
    return { icon: <Plus />, tone: "border-status-success/30 bg-status-success/10 text-status-success" };
  if (/cancel/i.test(text))
    return { icon: <Ban />, tone: "border-status-failed/30 bg-status-failed/10 text-status-failed" };
  if (/^(Driver|Status)/.test(text)) return { icon: <UserRound />, tone: quiet };
  if (/^(Planned|Delivery date)/.test(text)) return { icon: <CalendarClock />, tone: quiet };
  if (/^Products/.test(text)) return { icon: <Truck />, tone: quiet };
  return { icon: <CircleDot />, tone: quiet };
}

/**
 * The log as a timeline — 3PL's shape: a line down the marks, most recent
 * first, the change leading and who/when under it. Rendered as its own
 * section at the foot of a sheet that has no rail.
 */
export function ActivitySection({ entries }: { entries: ActivityEntry[] | undefined }) {
  const rows = [...(entries ?? [])]
    .reverse()
    .flatMap((e, i) => e.changes.map((c, j) => ({ e, c, key: `${e.at}-${i}-${j}` })));
  return (
    <SheetSection title="Activity">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has changed yet.</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map(({ e, c, key }, idx) => {
            const m = mark(c);
            return (
              <li key={key} className="relative flex gap-3 pb-4 last:pb-0">
                {idx < rows.length - 1 && (
                  <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-border" />
                )}
                <span
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5",
                    m.tone
                  )}
                >
                  {m.icon}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                  <span className="text-sm break-words text-foreground">{c}</span>
                  <span className="text-xs text-muted-foreground">
                    {stamp(e.at)} · {e.by}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </SheetSection>
  );
}
