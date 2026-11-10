import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stage } from "@/components/ui/stage-bar";

/*
  StageTrack — where a record IS in its lifecycle, as dots on a line (Pavan,
  2026-10-05; replaces the chevron `StageBar` on order detail pages).

  Same statement as the stage bar, drawn quieter: stages behind are GREEN
  dots with a white tick on a GREEN line, stages ahead are hollow on a faint
  one, and the stage the record is in swells into a BRAND-outlined pill
  carrying its name (Pavan, 2026-10-16 — done is green, in progress the brand colour). Every other stage's
  name sits under its dot.

  THE LINE ONLY, as with `StageBar`: canceled, blocked and the like are not
  positions, so a record in one renders with nothing current.
*/
export function StageTrack({
  stages,
  current,
  className,
  onStageClick,
  disabledReason,
  compact,
  /* VIOLET BY DEFAULT (Pavan, 2026-10-19): the step in progress wears the
     accent wherever a stepper is drawn. */
  tone = "accent",
  variant = "rings",
}: {
  stages: Stage[];
  current: string;
  className?: string;
  /**
   * A CREATE FORM'S STEPS (Pavan, 2026-10-16 — one look for a record's stage
   * and a form's steps). Given, the marks and names are buttons that move to
   * that step; a record's detail page passes nothing and stays read-only.
   */
  onStageClick?: (key: string) => void;
  /**
   * THE CURRENT PILL'S COLOUR — the brand by default; `accent` (violet) where a
   * flow wears the accent (Pavan, 2026-10-16: tried on Create recurring rule).
   */
  tone?: "brand" | "accent" | "neutral";
  /**
   * RINGS — every step a circle, its name under it (Pavan, 2026-10-16, after a
   * stepper reference; tried on Create recurring rule): done a green disc with
   * a white tick and a green name, the current step a VIOLET ring and name
   * (the accent), the rest grey rings; the line GREEN up to the current step
   * — confirmed ground — grey on (Pavan, 2026-10-19; was blue).
   * Spread evenly, each step centred in an equal column. THE DEFAULT, for a
   * record's detail track and a form's steps alike, every module (Pavan,
   * 2026-10-16). `track` keeps the older dots-and-pill look.
   */
  variant?: "track" | "rings";
  /** Why a step cannot be opened yet — dimmed, said on hover, not pressable. */
  disabledReason?: (key: string) => string | undefined;
  /**
   * COMPACT — the steps at a fixed 180px apart from the left, for a form's two
   * or three steps; the default spreads a record's stages end to end.
   */
  compact?: boolean;
}) {
  const at = stages.findIndex((s) => s.key === current);
  /* The current pill: a light wash of the colour (opaque over the line), its
     rim and its label. */
  const pill =
    /* NEUTRAL — black and white: a create form's step in progress (Pavan,
       2026-10-16: green is done, black is in progress). */
    tone === "neutral"
      ? "border-foreground bg-fp-surface-1b text-foreground"
      : tone === "accent"
      ? "border-accent-violet bg-[color-mix(in_oklab,var(--color-accent-violet)_12%,var(--color-fp-surface-1b))] text-accent-violet-ink"
      : "border-brand bg-[color-mix(in_oklab,var(--color-brand)_10%,var(--color-fp-surface-1b))] text-brand";
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

  const press = (key: string, children: React.ReactNode, label: string) => {
    if (!onStageClick) return children;
    const why = disabledReason?.(key);
    return (
      <button
        type="button"
        disabled={Boolean(why)}
        title={why}
        aria-label={label}
        onClick={() => onStageClick(key)}
        className={cn(
          "rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          why ? "cursor-not-allowed opacity-50" : undefined
        )}
      >
        {children}
      </button>
    );
  };

  /* COMPACT — EQUAL GAPS BETWEEN THE STEPS THEMSELVES (Pavan, 2026-10-16):
     a fixed spacing between marks looked uneven once one step was the wide
     pill; here every step is a box, 48px apart, the line runs behind them
     from the first centre to the last, and the travelled part (green) to
     the current one's centre. */
  const box = React.useRef<HTMLOListElement>(null);
  const [span, setSpan] = React.useState<{ from: number; to: number; done: number } | null>(null);
  React.useLayoutEffect(() => {
    if (!compact) return;
    const ol = box.current;
    if (!ol) return;
    const measure = () => {
      const items = Array.from(ol.children).filter((c) => c.tagName === "LI") as HTMLElement[];
      if (items.length === 0) return;
      const centre = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2;
      setSpan({
        from: centre(items[0]),
        to: centre(items[items.length - 1]),
        done: at > 0 ? centre(items[Math.min(at, items.length - 1)]) : centre(items[0]),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ol);
    return () => ro.disconnect();
  }, [compact, at, n]);

  if (variant === "rings") {
    const centre = (i: number) => `${((i + 0.5) / n) * 100}%`;
    return (
      <div className={cn("relative", className)}>
        <ol aria-label="Steps" className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {/* The line between the first and the last centre; green up to the
              current step. */}
          <span
            aria-hidden
            className="absolute top-[11px] h-0.5 bg-border"
            style={{ left: centre(0), right: `${(0.5 / n) * 100}%` }}
          />
          {at > 0 && (
            <span
              aria-hidden
              className="absolute top-[11px] h-0.5 bg-status-success transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ left: centre(0), width: `${(at / n) * 100}%` }}
            />
          )}
          {stages.map((s, i) => {
            const here = i === at;
            const done = at >= 0 && i < at;
            const why = disabledReason?.(s.key);
            const body = (
              <>
                <span
                  className={cn(
                    "relative flex size-6 items-center justify-center rounded-full",
                    done
                      ? "bg-status-success text-status-success-foreground"
                      : here
                        ? "border-[5px] border-accent-violet bg-fp-surface-1b"
                        : "border-[5px] border-fp-outline-2 bg-fp-surface-1b"
                  )}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </span>
                <span
                  className={cn(
                    "text-sm whitespace-nowrap",
                    done
                      ? "text-status-success"
                      : here
                        ? "font-medium text-accent-violet-ink"
                        : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </>
            );
            return (
              <li key={s.key} aria-current={here ? "step" : undefined} className="flex justify-center">
                {onStageClick ? (
                  <button
                    type="button"
                    disabled={Boolean(why)}
                    title={why}
                    onClick={() => onStageClick(s.key)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      why ? "cursor-not-allowed opacity-50" : undefined
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  <span className="flex flex-col items-center gap-2">{body}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (compact)
    return (
      <div className={cn("relative w-fit", className)}>
        <ol ref={box} aria-label="Steps" className="relative flex items-start gap-12">
          {span && (
            <>
              <span
                aria-hidden
                className="absolute top-[17px] h-0.5 bg-border"
                style={{ left: span.from, width: span.to - span.from }}
              />
              <span
                aria-hidden
                className="absolute top-[17px] h-0.5 bg-status-success transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ left: span.from, width: Math.max(0, span.done - span.from) }}
              />
            </>
          )}
          {stages.map((s, i) => {
            const here = i === at;
            const done = at >= 0 && i < at;
            const why = disabledReason?.(s.key);
            const mark = here ? (
              <span className={cn("flex h-8 items-center rounded-full border-2 px-3.5 text-sm font-semibold whitespace-nowrap", pill)}>
                {s.label}
              </span>
            ) : done ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-status-success text-status-success-foreground">
                <Check className="size-2.5" strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <span className="block size-3 rounded-full border-2 border-fp-outline-2 bg-fp-surface-1b" />
            );
            const body = (
              <>
                <span className="flex h-9 items-center">{mark}</span>
                <span
                  className={cn(
                    "h-4 text-xs whitespace-nowrap",
                    here ? "invisible" : done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </>
            );
            return (
              <li key={s.key} aria-current={here ? "step" : undefined} className="relative flex flex-col items-center">
                {onStageClick ? (
                  <button
                    type="button"
                    disabled={Boolean(why)}
                    title={why}
                    onClick={() => onStageClick(s.key)}
                    className={cn(
                      "flex flex-col items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      why ? "cursor-not-allowed opacity-50" : "[&:hover>span:last-child]:text-foreground"
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );

  return (
    <div className={cn("relative", className)}>
      <ol aria-label="Order stage" className="relative h-9">
        {/* The line, then the part of it already travelled. */}
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-status-success transition-[width] duration-500 ease-out motion-reduce:transition-none"
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
              {press(s.key, here ? (
                /* THE CURRENT MARK — IN PROGRESS, IN THE BRAND COLOUR (Pavan,
                   2026-10-16): a very light brand wash (10%, opaque over the line), a brand rim and
                   label. */
                <span
                  className={cn(
                    "flex h-8 items-center rounded-full border-2 px-3.5 text-sm font-semibold whitespace-nowrap",
                    pill,
                    moved &&
                      "animate-in fade-in-0 zoom-in-75 delay-300 duration-300 fill-mode-backwards motion-reduce:animate-none"
                  )}
                >
                  {s.label}
                </span>
              ) : (
                done ? (
                  /* A STAGE PASSED CARRIES A TICK (Pavan, 2026-10-05) — DONE,
                     SO GREEN with a white tick (Pavan, 2026-10-16). */
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full bg-status-success text-status-success-foreground",
                      moved && i === at - 1 && "animate-in zoom-in-50 duration-300 motion-reduce:animate-none"
                    )}
                  >
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : (
                  <span className="block size-3 rounded-full border-2 border-fp-outline-2 bg-fp-surface-1b" />
                )
              ), s.label)}
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
              /* In a form the name moves to its step too. */
              onClick={
                onStageClick && !disabledReason?.(s.key) ? () => onStageClick(s.key) : undefined
              }
              className={cn(
                "absolute top-0 text-xs whitespace-nowrap",
                anchor(i),
                at >= 0 && i < at ? "text-foreground" : "text-muted-foreground",
                onStageClick && (disabledReason?.(s.key) ? "opacity-50" : "hover:text-foreground")
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
