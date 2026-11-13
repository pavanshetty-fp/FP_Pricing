import * as React from "react";
import { cn } from "@/lib/utils";
import { setHeadCollapsed, useHeadCollapsed } from "./pageHead";
import { DISPLAY_VIEWS, type ListView } from "./ListToolbar";

/* THE 3PL LIST HEAD, ON EVERY LIST (Pavan, 2026-11-13: "whatever we have done
   with 3PL delivery orders … needs to be applied to all the modules").
   Three parts, one per screen:
     · `useHeadFold()` — the page flag, the chevron's props for the toolbar,
       and the 16px above the search row that goes when the head folds;
     · `<HeadFold>` — the views row, folding with the page title;
     · `displayViewsFor()` — the displays as tabs in the views row, in place
       of "All", so the toolbar carries no switch. */
export function useHeadFold() {
  const collapsed = useHeadCollapsed();
  /* Leaving the page puts its head back. */
  React.useEffect(() => () => setHeadCollapsed(false), []);
  return {
    collapsed,
    headCollapse: { collapsed, onToggle: () => setHeadCollapsed(!collapsed) },
    /** The gap above the search row — gone with the head. */
    gap: cn("shrink-0 transition-[margin] duration-200 ease-out", collapsed ? "mt-0" : "mt-4"),
  };
}

/** The views row, folded away with the page title. THE CLIP BOX TAKES THE
 *  BAR'S BLEED (M-047): it reaches 16px out and pads back, so the fold cuts
 *  nothing; folded, the top pad goes too (M-048). */
export function HeadFold({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid shrink-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
      aria-hidden={collapsed || undefined}
      inert={collapsed || undefined}
    >
      <div className={cn("-mx-4 min-h-0 overflow-hidden px-4", collapsed ? "mt-0 pt-0" : "-mt-4 pt-4")}>
        {children}
      </div>
    </div>
  );
}

/** The display tabs for the views row — table always, then board and map
 *  where the list has them. Spread into `FuelOrdersViewBar`. */
export function displayViewsFor(
  { board = false, map = false }: { board?: boolean; map?: boolean },
  view: ListView,
  onViewChange: (v: ListView) => void
) {
  return {
    displayViews: DISPLAY_VIEWS.filter(
      (d) => d.key === "table" || (d.key === "board" && board) || (d.key === "map" && map)
    ),
    displayValue: view,
    onDisplayChange: (k: string) => onViewChange(k as ListView),
  };
}
