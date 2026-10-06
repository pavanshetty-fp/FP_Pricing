import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stage } from "@/components/ui/stage-bar";

/*
  StageTrack — where a record IS in its lifecycle, as dots on a line (Pavan,
  2026-10-05; replaces the chevron `StageBar` on order detail pages).

  Same statement as the stage bar, drawn quieter: stages behind are filled dots
  on a filled line, stages ahead are hollow on a faint one, and the stage the
  record is in swells into an outlined pill carrying its name. Every other stage's
  name sits under its dot.

  THE LINE ONLY, as with `StageBar`: cancelled, blocked and the like are not
  positions, so a record in one renders with nothing current.
*/
export function StageTrack({
  stages,
  current,
  className,
}: {
  stages: Stage[];
  current: string;
  className?: string;
}) {
  const at = stages.findIndex((s) => s.key === current);
  const n = stages.length;
  /* A SMALL MOVE WHEN THE STAGE CHANGES (Pavan, 2026-10-06) — the travelled
     line runs on to the new stage, the stage just left takes its tick, and the
     new pill pops in as the line arrives. Never on first paint: opening a
     record is not a stage changing. */
  /* Held for the length of the move, so a re-render mid-way (an autosave)
     cannot cut it short; set before paint, so the pill never flashes in. */
  const seen = React.useRef(at);
  const [moved, setMoved] = React.useState(false);
  React.useLayoutEffect(() => {
    if (seen.current === at) return;
    seen.current = at;
    setMoved(true);
    const t = window.setTimeout(() => setMoved(false), 900);
    return () => window.clearTimeout(t);
  }, [at]);
  /* EVENLY SPACED, END TO END: stage i sits at i/(n-1) of the width, the
     first on the left edge and the last on the right. Each mark is anchored
     by its own left, centre or right so nothing hangs past the edges, and
     every name sits on one baseline under the line. */
  const pos = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 0);
  const anchor = (i: number) =>
    i === 0 ? "translate-x-0" : i === n - 1 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div className={cn("relative", className)}>
      <ol aria-label="Order stage" className="relative h-9">
        {/* The line, then the part of it already travelled. */}
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-foreground transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${at > 0 ? pos(at) : 0}%` }}
        />
        {stages.map((s, i) => {
          const here = i === at;
          const done = at >= 0 && i < at;
          return (
            <li
              key={s.key}
              aria-current={here ? "step" : undefined}
              className={cn("absolute top-1/2 -translate-y-1/2", anchor(i))}
              style={{ left: `${pos(i)}%` }}
            >
              {here ? (
                /* THE CURRENT MARK — neutral (Pavan, 2026-10-05): the content
                   layer with a foreground rim, so white with a black outline
                   in light and the reverse in dark. */
                <span
                  className={cn(
                    "flex h-8 items-center rounded-full border-2 border-foreground bg-fp-surface-1b px-3.5 text-sm font-semibold whitespace-nowrap text-foreground shadow-sm",
                    moved &&
                      "animate-in fade-in-0 zoom-in-75 delay-300 duration-300 fill-mode-backwards motion-reduce:animate-none"
                  )}
                >
                  {s.label}
                </span>
              ) : (
                done ? (
                  /* A STAGE PASSED CARRIES A TICK (Pavan, 2026-10-05). */
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full bg-foreground text-background",
                      moved && i === at - 1 && "animate-in zoom-in-50 duration-300 motion-reduce:animate-none"
                    )}
                  >
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : (
                  <span className="block size-3 rounded-full border-2 border-fp-outline-2 bg-fp-surface-1b" />
                )
              )}
            </li>
          );
        })}
      </ol>
      {/* NAMES ON ONE BASELINE, under their marks — the current one is in
          its pill, so it has none here. */}
      {/* 8px UNDER THE MARKS (Pavan, 2026-10-05): the line sits at 18px in the
          36px track and a passed stage's mark is 16px, so its foot is at 26 —
          the names start at 34, two above the track's own foot. */}
      <div aria-hidden className="relative -mt-0.5 h-4">
        {stages.map((s, i) =>
          i === at ? null : (
            <span
              key={s.key}
              className={cn(
                "absolute top-0 text-xs whitespace-nowrap",
                anchor(i),
                at >= 0 && i < at ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ left: `${pos(i)}%` }}
            >
              {s.label}
            </span>
          )
        )}
      </div>
    </div>
  );
}
