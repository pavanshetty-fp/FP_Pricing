import * as React from "react";
import { cn } from "@/lib/utils";

/* A SIDEWAYS SCROLLBAR FOR TABLES (Pavan, 2026-11-12) — the one exception to
   "no scrollbars" (index.css). Many users have a mouse, and a table wider than
   its box gave them no way to reach the columns on the right. (Replaced the
   hover arrows of the same day.)

   OURS, NOT THE BROWSER'S. A native bar would bring a vertical one with it on
   a frame that scrolls both ways (the gutter index.css removed), and looks
   different on every platform. This one is a strip UNDER the table, in the
   flow, only while the table is wider than its box: drag the thumb, or click
   the track to move a view's width. The wheel, Shift + wheel and the trackpad
   work as before. */
export function useScrollX(ref: React.RefObject<HTMLElement | null>) {
  const [m, setM] = React.useState({ client: 0, scroll: 0, left: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      /* A box set not to scroll (a frame outside scrolls for it) still
         reports the overflow — it is not ours to bar. */
      const scrolls = /(auto|scroll)/.test(getComputedStyle(el).overflowX);
      const next = scrolls
        ? { client: el.clientWidth, scroll: el.scrollWidth, left: el.scrollLeft }
        : { client: 0, scroll: 0, left: 0 };
      setM((p) => (p.client === next.client && p.scroll === next.scroll && p.left === next.left ? p : next));
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, [ref]);
  return m;
}

/** The bar. Render it right AFTER the scroller, in the flow. With no
 *  `target`, the nearest earlier sibling that scrolls is the scroller. */
export function ScrollXBar({
  target,
  className,
}: {
  target?: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const self = React.useRef<HTMLDivElement>(null);
  const found = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    if (target) return;
    let el = self.current?.previousElementSibling as HTMLElement | null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowX)) {
      el = el.previousElementSibling as HTMLElement | null;
    }
    found.current = el;
  }, [target]);
  const ref = target ?? found;
  const { client, scroll, left } = useScrollX(ref);
  const track = React.useRef<HTMLDivElement>(null);
  const over = scroll > client + 1;

  const max = Math.max(1, scroll - client);
  /* Thumb as fractions of the track: never shorter than 10%. */
  const size = over ? Math.max(0.1, client / scroll) : 1;
  const at = (Math.min(left, max) / max) * (1 - size);

  const drag = React.useRef<{ x: number; left: number } | null>(null);
  const onThumbDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, left: ref.current?.scrollLeft ?? 0 };
  };
  const onThumbMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    const tw = track.current?.clientWidth ?? 0;
    if (!d || !el || !tw) return;
    el.scrollLeft = d.left + (e.clientX - d.x) * (max / (tw * (1 - size)));
  };
  const onThumbUp = () => {
    drag.current = null;
  };
  const onTrackDown = (e: React.PointerEvent) => {
    const el = ref.current;
    const r = track.current?.getBoundingClientRect();
    if (!el || !r) return;
    const x = (e.clientX - r.left) / r.width;
    const dir = x < at ? -1 : x > at + size ? 1 : 0;
    if (dir) el.scrollBy({ left: dir * Math.max(120, el.clientWidth - 120), behavior: "smooth" });
  };

  return (
    <div ref={self} data-slot="scroll-x-bar" className={cn("shrink-0", !over && "hidden", className)}>
      {over && (
        <div className="px-1 py-1">
          <div
            ref={track}
            role="scrollbar"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((left / max) * 100)}
            aria-label="Scroll the table sideways"
            onPointerDown={onTrackDown}
            className="relative h-2 w-full rounded-full"
          >
            <div
              onPointerDown={onThumbDown}
              onPointerMove={onThumbMove}
              onPointerUp={onThumbUp}
              onPointerCancel={onThumbUp}
              className="absolute inset-y-0 rounded-full bg-muted-foreground/40 transition-colors hover:bg-muted-foreground/60 active:bg-muted-foreground/70"
              style={{ left: `${at * 100}%`, width: `${size * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** A horizontal scroller with the bar — the drop-in for
 *  `<div className="overflow-x-auto">`. */
export function ScrollX({
  className,
  outerClassName,
  children,
}: {
  className?: string;
  outerClassName?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <div className={outerClassName}>
      <div ref={ref} className={cn("overflow-x-auto", className)}>
        {children}
      </div>
      <ScrollXBar target={ref} />
    </div>
  );
}
