import * as React from "react";
import { createPortal } from "react-dom";

/*
  THE PAGE HEADER'S RIGHT END, FOR A SCREEN (Yash, 2026-11-16 — to raise with
  Pavan). AppShell has `headerAction` (right-aligned controls in the page
  header); Unified View passes it this empty slot, and a screen that wants a
  control level with its title — Pricing's dashboard puts its date window
  there — portals into it with <HeaderAside>. A screen that renders none
  leaves the header as it was.
*/

let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function setHeaderSlot(el: HTMLElement | null) {
  slot = el;
  listeners.forEach((l) => l());
}

export function HeaderAside({ children }: { children: React.ReactNode }) {
  const el = React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => slot
  );
  return el ? createPortal(children, el) : null;
}
