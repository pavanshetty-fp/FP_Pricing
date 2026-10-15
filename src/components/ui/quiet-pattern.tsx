import * as React from "react";
import { cn } from "@/lib/utils";

/*
  QUIET PATTERN — the DS's decorative fill for an empty stretch of a card
  (Pavan, 2026-10-15: "keep this pattern … consistent across our designs
  everywhere"). One pattern, one size, one pair of greys; place it as the
  last child of a flex column with `flex-1`, and bleed it to the card's
  edges with negative margins where it should run edge to edge. Decoration
  only — aria-hidden, no pointer events. DS ui/2-rules "Quiet pattern".
*/

/*
  A QUIET PATTERN for an empty stretch of a card (Pavan, 2026-10-15, after a
  quarter-circle tile reference). Built the way that pattern is made: a
  square grid where every cell is a QUARTER DISC — the circle's centre at one
  of its four corners — grouped so quarters meet as half discs and full
  circles; no cell left empty. TWO very light
  greys (the foreground at 5% and 3%), fading in from the top. Seeded, so it
  is the same every time. Decoration only.
*/
const QUARTER_N = 8;
/** The one size — Pavan, 2026-10-15. */
const QUIET_SCALE = 2.7;
const QUARTER_S = 16;

function quarterTiles(): { d: string; o: number }[] {
  let seed = 11;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const s = QUARTER_S;
  /* Corner codes: 0 top-left · 1 top-right · 2 bottom-right · 3 bottom-left. */
  const quarter = (gx: number, gy: number, corner: number) => {
    const x = gx * s;
    const y = gy * s;
    return [
      `M${x} ${y} H${x + s} A${s} ${s} 0 0 1 ${x} ${y + s} Z`,
      `M${x + s} ${y} V${y + s} A${s} ${s} 0 0 1 ${x} ${y} Z`,
      `M${x + s} ${y + s} H${x} A${s} ${s} 0 0 1 ${x + s} ${y} Z`,
      `M${x} ${y + s} V${y} A${s} ${s} 0 0 1 ${x + s} ${y + s} Z`,
    ][corner];
  };
  const out: { d: string; o: number }[] = [];
  const tone = () => (rand() < 0.5 ? 0.05 : 0.03);
  /*
    EVERY CELL FILLED, IN 2 × 2 GROUPS (Pavan, 2026-10-15 — "a lot of
    gaps"): each group is a full circle, two half discs (facing up/down or
    left/right), or four quarters turned freely — so most quarters meet a
    partner and read as a shape, as in the reference.
  */
  for (let by = 0; by < QUARTER_N; by += 2)
    for (let bx = 0; bx < QUARTER_N; bx += 2) {
      const kind = rand();
      const cells: [number, number, number, number][] = [];
      if (kind < 0.12) {
        /* a full circle — every quarter centred on the group's middle */
        const o = tone();
        cells.push([bx, by, 2, o], [bx + 1, by, 3, o], [bx + 1, by + 1, 0, o], [bx, by + 1, 1, o]);
      } else if (kind < 0.42) {
        /* two half discs, one above the other, each facing a random way */
        for (const row of [by, by + 1]) {
          const o = tone();
          const down = rand() < 0.5;
          cells.push(down ? [bx, row, 1, o] : [bx, row, 2, o], down ? [bx + 1, row, 0, o] : [bx + 1, row, 3, o]);
        }
      } else if (kind < 0.72) {
        /* two half discs, side by side, each facing a random way */
        for (const col of [bx, bx + 1]) {
          const o = tone();
          const right = rand() < 0.5;
          cells.push(right ? [col, by, 3, o] : [col, by, 2, o], right ? [col, by + 1, 0, o] : [col, by + 1, 1, o]);
        }
      } else {
        for (const [cx, cy] of [
          [bx, by],
          [bx + 1, by],
          [bx, by + 1],
          [bx + 1, by + 1],
        ])
          cells.push([cx, cy, Math.floor(rand() * 4), tone()]);
      }
      for (const [cx, cy, c, o] of cells) out.push({ d: quarter(cx, cy, c), o });
    }
  return out;
}
const TILES = quarterTiles();

export function QuietPattern({ className }: { className?: string }) {
  /* useId has colons, which break a url(#…) reference. */
  const id = `quiet-${React.useId().replace(/:/g, "")}`;
  /* ANCHORED BOTTOM-LEFT — whole tiles start at the bottom-left corner; the
     top and the right are where it may cut. The tile's offset is the box's
     height modulo the tile, measured. */
  const box = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const tile = QUARTER_N * QUARTER_S * QUIET_SCALE;
  return (
    <div
      ref={box}
      aria-hidden
      className={cn("pointer-events-none overflow-hidden text-foreground", className)}
      style={{
        /* HOW HIGH IT REACHES (Pavan, 2026-10-15): clear in the top eighth,
           building to full at the very bottom. */
        maskImage: "linear-gradient(to bottom, transparent 12%, currentColor 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 12%, currentColor 100%)",
      }}
    >
      <svg className="size-full">
        <defs>
          <pattern id={id} width={QUARTER_N * QUARTER_S} height={QUARTER_N * QUARTER_S} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${h % tile}) scale(${QUIET_SCALE})`}>
            {TILES.map((t, i) => (
              <path key={i} d={t.d} fill="currentColor" fillOpacity={t.o} />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
