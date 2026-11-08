import * as React from "react";

/* DETAIL PAGE VIEW (Pavan, 2026-11-08) — how every record's detail page
   opens, in every module: side sheet (default), modal, or full page. Full
   page is an overlay on the page, never a new tab. One choice for the whole
   app, kept in the browser. */
export type SheetPresentation = "sheet" | "modal" | "full";

export const PRESENTATION_LABEL: Record<SheetPresentation, string> = {
  sheet: "Side sheet",
  modal: "Modal",
  full: "Full page",
};

const KEY = "fp-detail-page-view";
const listeners = new Set<() => void>();
let current: SheetPresentation | null = null;

function read(): SheetPresentation {
  try {
    const v = localStorage.getItem(KEY);
    return v === "modal" || v === "full" ? v : "sheet";
  } catch {
    return "sheet";
  }
}

export function setSheetPresentation(value: SheetPresentation) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private window — the choice lasts this page only */
  }
  current = value;
  listeners.forEach((l) => l());
}

export function useSheetPresentation(): SheetPresentation {
  return React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (current ??= read())
  );
}
