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

/* THE BANNER ON TOP (Pavan, 2026-11-13 — trial V1, chosen for every list):
   a list's banner sits first, right under the page title — above the views
   row, saved views, Create and Export — 8px from the title and 8px from what
   follows. The page header takes 8px off its bottom pad while one shows
   (`useTopBannerShown`, read by the shell), and the banner rises the content
   layer's 16px top pad — no further, or the layer's overflow cuts it (M-053). */
let topBanners = 0;
const bannerListeners = new Set<() => void>();
const bannerEmit = () => bannerListeners.forEach((l) => l());
export function useTopBanner(shown: boolean) {
  React.useEffect(() => {
    if (!shown) return;
    topBanners += 1;
    bannerEmit();
    return () => {
      topBanners -= 1;
      bannerEmit();
    };
  }, [shown]);
}
export function useTopBannerShown(): boolean {
  return React.useSyncExternalStore(
    (l) => {
      bannerListeners.add(l);
      return () => bannerListeners.delete(l);
    },
    () => topBanners > 0
  );
}
/** The banner's margins. `next` is what follows it: the views row (which
 *  pulls itself up 16 and puts its buttons 2 into that), or a plain block. */
export function topBannerClass(collapsed: boolean, next: "views" | "block" = "views") {
  if (collapsed) return "mb-4 shrink-0";
  return next === "views" ? "-mt-4 mb-5.5 shrink-0" : "-mt-4 mb-2 shrink-0";
}
