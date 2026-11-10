import * as React from "react";

/* THE PAGE HEAD FOLDS AWAY (Pavan, 2026-11-10, after HubSpot) — a chevron
   beside a list's Settings gear collapses everything above the search row:
   the page title row and the views row. One flag for the page; the screen
   that offers the chevron puts it back when it unmounts. */
let collapsed = false;
const listeners = new Set<() => void>();

export function setHeadCollapsed(next: boolean) {
  collapsed = next;
  listeners.forEach((l) => l());
}

export function useHeadCollapsed(): boolean {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => collapsed
  );
}
