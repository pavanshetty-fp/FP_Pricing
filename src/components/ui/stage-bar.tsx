import { cn } from "@/lib/utils";

/*
  StageBar — where a record IS in its lifecycle, as one line of chevrons.

  NOT A STEPPER, AND THE DIFFERENCE MATTERS. A stepper is a form split into
  parts you move between; a stage bar is a statement about the record that the
  reader does not author. Steps are numbered because you take them in order and
  you are the one taking them; stages are not, because the order takes them and
  you are watching. The two were sharing one strip at the top of the sheet and
  the strip was saying the wrong thing: "1 Order, 2 Quotes & pricing" told you
  which half of the form you were reading, and never told you the one fact
  anybody opens an order to learn.

  THE CHEVRON IS THE POINT. A row of equal boxes reads as a set of tabs; the
  notch makes each one point at the next and turns the row into a direction.
  It is drawn with `clip-path` and a negative margin rather than borders or
  pseudo-elements, so a segment stays one element that can be a button and take
  a focus ring.

  THREE TONES AND NO MORE. Behind (done), here (current), ahead (not yet). A
  fourth would have to mean something, and the only extra meaning a lifecycle
  has is that it ENDED somewhere it should not have — which is `tone="ended"`,
  for a cancellation, and it is only ever the current stage.
*/

export interface Stage {
  key: string;
  label: string;
  /** Marks a terminal exit — rendered in the destructive tone when current. */
  ended?: boolean;
}

const NOTCH = 12;
/** Points right; the first segment keeps a flat left edge. */
const POINTED = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
const POINTED_FIRST = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;
const FLAT = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${NOTCH}px 50%)`;
const FLAT_FIRST = "none";

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
  const at = Math.max(
    0,
    stages.findIndex((s) => s.key === current)
  );
  return (
    /* IT SCROLLS RATHER THAN SHRINKS. Nine stages in a 560px sheet would set
       every label to four characters, and a stage nobody can read is worse
       than a stage they have to scroll to. No visible bar: a chevron cut off
       mid-word at the edge says "there is more" louder than a scrollbar does,
       and this strip is 36px tall — a bar under it would be a third of it. */
    <div className={cn("flex items-center overflow-x-auto", className)}>
      {stages.map((s, i) => {
        const done = i < at;
        const here = i === at;
        const first = i === 0;
        const last = i === stages.length - 1;
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
              clipPath: last
                ? first
                  ? FLAT_FIRST
                  : FLAT
                : first
                  ? POINTED_FIRST
                  : POINTED,
            }}
            className={cn(
              "flex h-9 min-w-[112px] flex-1 shrink-0 items-center justify-center px-4 text-xs font-medium whitespace-nowrap transition-colors",
              /* The next segment's notch bites into this one's tail, so the
                 overlap is exactly the notch and the label is pushed clear of
                 it. `-ml-3` is NOTCH as a Tailwind literal — a template class
                 would never reach the stylesheet. */
              !first && "-ml-3 pl-6",
              onSelect && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
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
