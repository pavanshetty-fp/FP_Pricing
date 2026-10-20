import * as React from "react";

/*
  OUTLINE SHINE (Pavan, 2026-10-15; a DS component 2026-10-20) — a soft band
  that sweeps LEFT TO RIGHT across an element on a slight diagonal, seen ONLY
  on its outline, never on its face: the outline is a ring masked out of a
  layer just inside the border, and the band moves inside it. One lap
  (~1.9 s) every 6 seconds; still for reduced motion.

    dashboard "Attention required"   red, a narrow band
    a nudge on a button              light grey, a wider band (Create order
                                     on the nearly-empty-tank alert)

    a pill's fill                    `fill`: no ring — the bar moves through
                                     the whole face ("Needs action")

  Place it inside a `relative` element; it takes that element's radius.
  `inset` −1 lays the ring ON a 1px border (a button's outline) rather than
  just inside it.
*/
export function OutlineShine({
  color = "var(--color-fp-lane-red)",
  band = "5%",
  thickness = 1.5,
  every = 6000,
  lap = 1900,
  delay = 1200,
  inset = 0,
  fill = false,
}: {
  /** The band's colour at its brightest. */
  color?: string;
  /** The band's width, as a share of the element. */
  band?: string;
  /** The ring's thickness, px — the outline's own width. */
  thickness?: number;
  every?: number;
  lap?: number;
  delay?: number;
  /** px — negative sits the ring on the element's own border. */
  inset?: number;
  /** The bar moves through the whole face, not only the outline. */
  fill?: boolean;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  /* Parked past the left edge by its own width and the skew's lean. */
  const rest = `calc(-1 * ${band} - 15%)`;
  React.useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* FROM WHOLLY OFF THE LEFT EDGE TO WHOLLY OFF THE RIGHT — whatever the
       band's width, none of it shows between laps (Pavan, 2026-10-20). */
    const run = () =>
      el.animate([{ left: rest }, { left: "calc(100% + 15%)" }], { duration: lap, easing: "cubic-bezier(0.45, 0, 0.55, 1)" });
    const first = window.setTimeout(run, delay);
    const loop = window.setInterval(run, every);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
  }, [every, lap, delay, rest]);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute overflow-hidden rounded-[inherit]"
      style={{
        inset,
        ...(fill
          ? {}
          : {
              padding: thickness,
              /* A MASK, not a colour — only its alpha is read. */
              mask: "linear-gradient(black 0 0) content-box, linear-gradient(black 0 0)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
            }),
      }}
    >
      <span
        ref={ref}
        className="absolute inset-y-0 -skew-x-[24deg]"
        style={{ left: rest, width: band, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </span>
  );
}
