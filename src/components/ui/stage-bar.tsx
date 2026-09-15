import { cn } from "@/lib/utils";

/*
  StageBar — where a record IS in its lifecycle, as one line of chevrons.

  NOT A STEPPER, AND THE DIFFERENCE MATTERS. A stepper is a form split into
  parts you move between; a stage bar is a statement about the record that the
  reader does not author. Steps are numbered because you take them in order and
  you are the one taking them; stages are not, because the order takes them and
  you are watching.

  THE CHEVRON IS THE POINT. A row of equal boxes reads as a set of tabs; the
  notch makes each one point at the next and turns the row into a direction.

  SEPARATE SEGMENTS, NOT ONE CLIPPED STRIP. The first version butted the
  chevrons together so the row was a single continuous ribbon, and a continuous
  ribbon reads as one object with a fill level — a progress bar. Cut a hairline
  between them and each one goes back to being a thing in its own right: a
  named stage that is either reached or not. The gap is what makes the row
  countable, so it is constant, and it follows the diagonal rather than sitting
  square, which is why it is a negative margin against the notch rather than
  `gap`.

  ROUNDED, SHARP WHERE IT POINTS. `border-radius` rounds the element's box and
  `clip-path` cuts the arrow out of it, so the two compose: the corners that
  survive the cut come out soft and the tip stays a tip. The tip is the one
  thing carrying the direction — rounding that would cost the bar its arrow.

  THREE TONES AND NO MORE. Behind (done), here (current), ahead (not yet). A
  fourth would have to mean something, and the only extra meaning a lifecycle
  has is that it left the line — `ended`, below.
*/

export interface Stage {
  key: string;
  label: string;
  /**
   * OFF THE LINE. A stage the record can be AT but never passes THROUGH — a
   * cancellation, a hold. Two consequences, and they are the same fact stated
   * twice: it is drawn in the destructive tone when it is the current stage,
   * and it is set apart at the end of the bar behind a wider gap, outside the
   * run of stages that lead to each other. It is never "behind" — nothing is
   * further along than a cancellation, so a later stage does not make it done.
   */
  ended?: boolean;
}

/** Depth of the arrow, and of the bite the next segment takes out of it. */
const NOTCH = 12;
/** The hairline between two neighbours, measured horizontally. */
const GAP = 4;
/** What separates the run of real stages from the ones that left the line. */
const RUN_GAP = 16;

/** Points right; flat on the left because it starts a run. */
const HEAD = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;
/** Notched and pointed — the middle of a run. */
const MID = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
/** Notched only; flat on the right because the run ends here. */
const TAIL = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${NOTCH}px 50%)`;

export function StageBar({
  stages,
  current,
  onSelect,
  className,
}: {
  stages: Stage[];
  /** `key` of the stage the record is at. Everything before it reads as done. */
  current: string;
  /**
   * Optional: makes a stage clickable. A stage bar is a statement first, so a
   * bar with no handler is a perfectly good bar — pass one only where a stage
   * has somewhere to take the reader.
   */
  onSelect?: (key: string) => void;
  className?: string;
}) {
  /* PROGRESS IS MEASURED ON THE LINE ONLY. `ended` stages sit at the end of
     the array for layout, not because they come last in time, so counting the
     current stage's index straight off the array would make a cancellation the
     far end of the lifecycle and light every real stage behind it. */
  const line = stages.filter((s) => !s.ended);
  const at = line.findIndex((s) => s.key === current);
  /* Off the line entirely: nothing is "done", because the bar has no record of
     where the order stood when it stopped. Saying "ahead" of everything is the
     one reading that is not a guess. */
  const offLine = at < 0;

  return (
    <div className={cn("flex items-center overflow-x-auto", className)}>
      {stages.map((s, i) => {
        const prev = stages[i - 1];
        /* A run is an unbroken stretch of same-kind stages. The real stages
           are one run and the `ended` ones another, and a run's two outer
           edges are flat so the group reads as a group. */
        const startsRun = i === 0 || Boolean(prev?.ended) !== Boolean(s.ended);
        const endsRun =
          i === stages.length - 1 ||
          Boolean(stages[i + 1]?.ended) !== Boolean(s.ended);

        const here = s.key === current;
        const done = !s.ended && !offLine && line.indexOf(s) < at;
        const Tag = onSelect ? "button" : "div";

        return (
          <Tag
            key={s.key}
            {...(onSelect
              ? { type: "button" as const, onClick: () => onSelect(s.key) }
              : {})}
            aria-current={here ? "step" : undefined}
            title={s.label}
            style={{
              clipPath: startsRun
                ? endsRun
                  ? undefined
                  : HEAD
                : endsRun
                  ? TAIL
                  : MID,
              /* The neighbour's tip reaches into this one's notch and stops
                 GAP short of the bottom of it. A new run just gets air. */
              marginLeft: i === 0 ? undefined : startsRun ? RUN_GAP : GAP - NOTCH,
            }}
            className={cn(
              "flex h-9 min-w-[96px] flex-1 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors",
              /* Clears the notch, so the label is centred in the part of the
                 segment that is actually there. */
              !startsRun && "pl-5",
              onSelect &&
                "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              here && s.ended && "bg-destructive text-destructive-foreground",
              here && !s.ended && "bg-brand text-brand-foreground",
              done && "bg-status-success/15 text-status-success",
              !here && !done && "bg-accent text-muted-foreground",
              onSelect && !here && "hover:brightness-95 dark:hover:brightness-125"
            )}
          >
            <span className="truncate">{s.label}</span>
          </Tag>
        );
      })}
    </div>
  );
}
