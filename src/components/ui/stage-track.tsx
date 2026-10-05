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
        {at > 0 && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-foreground"
            style={{ width: `${pos(at)}%` }}
          />
        )}
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
                <span className="flex h-8 items-center rounded-full border-2 border-foreground bg-fp-surface-1b px-3.5 text-sm font-semibold whitespace-nowrap text-foreground shadow-sm">
                  {s.label}
                </span>
              ) : (
                <span
                  className={cn(
                    "block size-3 rounded-full",
                    done ? "bg-foreground" : "border-2 border-fp-outline-2 bg-fp-surface-1b"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      {/* NAMES ON ONE BASELINE, under their marks — the current one is in
          its pill, so it has none here. */}
      <div aria-hidden className="relative mt-2 h-4">
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
