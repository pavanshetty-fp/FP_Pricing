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

  SEPARATE SEGMENTS, NOT ONE CLIPPED STRIP. Butted together the chevrons make a
  single continuous ribbon, and a continuous ribbon reads as one object with a
  fill level — a progress bar. A constant hairline between them makes each one
  a thing in its own right again: a named stage, reached or not. The gap
  follows the diagonal rather than sitting square, which is why it is a
  negative margin against the notch rather than `gap`.

  ROUNDED, SHARP WHERE IT POINTS. `border-radius` rounds the element's box and
  `clip-path` cuts the arrow out of it, so the two compose: the corners that
  survive the cut come out soft and the tip stays a tip. The tip is the one
  thing carrying the direction — rounding that would cost the bar its arrow.

  THE LINE ONLY. Every stage on the bar is one the record passes THROUGH.
  Canceled, blocked, on hold — the places a record can stop but never move
  through — are deliberately not here: they are conditions, not positions, and
  a bar that lists them turns a direction back into a set of states. A record
  in one of them renders with nothing current, which is the truthful reading:
  it is not standing at any of these. The status chip says which one it is in.

  THREE TONES AND NO MORE. Behind (done), here (current), ahead (not yet).
*/

export interface Stage {
  key: string;
  label: string;
}

/** Depth of the arrow, and of the bite the next segment takes out of it. */
const NOTCH = 12;
/** The hairline between two neighbours, measured horizontally. */
const GAP = 4;

/** Points right; flat on the left because the line starts here. */
const HEAD = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;
/** Notched and pointed — the middle of the line. */
const MID = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
/** Notched only; flat on the right because the line ends here. */
const TAIL = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${NOTCH}px 50%)`;

export function StageBar({
  stages,
  current,
  onSelect,
  className,
}: {
  stages: Stage[];
  /**
   * `key` of the stage the record is at. Everything before it reads as done.
   * A key that is not on the bar — a cancellation, a hold — leaves every stage
   * reading as ahead, because the bar has no record of where the record stood
   * when it stopped and "ahead of everything" is the one reading that is not a
   * guess.
   */
  current: string;
  /**
   * Optional: makes a stage clickable. A stage bar is a statement first, so a
   * bar with no handler is a perfectly good bar — pass one only where a stage
   * has somewhere to take the reader.
   */
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const at = stages.findIndex((s) => s.key === current);

  return (
    <div className={cn("flex items-center overflow-x-auto", className)}>
      {stages.map((s, i) => {
        const first = i === 0;
        const last = i === stages.length - 1;
        const here = i === at;
        const done = at >= 0 && i < at;
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
              clipPath: first ? (last ? undefined : HEAD) : last ? TAIL : MID,
              /* The neighbour's tip reaches into this one's notch and stops
                 GAP short of the bottom of it. */
              marginLeft: first ? undefined : GAP - NOTCH,
            }}
            className={cn(
              "flex h-9 min-w-[96px] flex-1 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors",
              /* Clears the notch, so the label is centred in the part of the
                 segment that is actually there. */
              !first && "pl-5",
              onSelect &&
                "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              here && "bg-brand text-brand-foreground",
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
