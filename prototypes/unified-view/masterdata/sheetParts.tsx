import * as React from "react";

/*
  THE PARTS EVERY 360 SHEET SHARES (Asset 360, Customer 360): the figures
  across the top and the docking work area.
*/

/** One of the figures across the top — one bordered strip, as the reference. */
export function Figure({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="truncate text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="truncate text-xs text-muted-foreground">{note}</span>
      {children}
    </div>
  );
}

/** A headline figure's money — whole dollars, as the dashboards' figures. */
const WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const wholeMoney = (n: number) => WHOLE.format(n);

/** A trend — a bordered box with its title and the dashboard's bars. */
export function Trend({ title, aside, children }: { title: string; aside: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{aside}</span>
      </header>
      {children}
    </section>
  );
}

export const FIGURE_STRIP =
  "grid shrink-0 grid-cols-2 divide-border overflow-hidden rounded-lg border border-border lg:grid-cols-4 lg:divide-x";

/** THE WORK AREA IS ONE SCREEN TALL (Pavan, 2026-11-03). The figures
 *  scroll away; once the tabs reach the top, the tabs, search, table and the
 *  cards on the right fill the sheet and stay — the page scrolls first,
 *  then the table. */
export const WORK_AREA =
  "grid h-full min-h-[560px] shrink-0 grid-rows-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_var(--fp-rail-w,340px)]";

/** THE PAGE SCROLLS BEFORE THE TABLE. A wheel down over the work area moves
 *  the sheet until the work area is docked at the top; only then do the
 *  table and the cards scroll. Up, they scroll back first, then the page. */
export function useDockedWorkArea() {
  /* A CALLBACK REF — the sheet's content mounts after this hook first runs
     (the sheet is a portal), so the listener attaches when the area does. */
  const [el, setEl] = React.useState<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!el) return undefined;
    let body: HTMLElement | null = el.parentElement;
    while (body && !/(auto|scroll)/.test(getComputedStyle(body).overflowY)) body = body.parentElement;
    if (!body) return undefined;
    const page = body;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) return;
      const left = page.scrollHeight - page.clientHeight - page.scrollTop;
      if (left <= 1) return;
      e.preventDefault();
      page.scrollTop += Math.min(e.deltaY, left);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [el]);
  return setEl;
}
