import * as React from "react";

/**
 * Saved-view state for a list screen, generic over what a view captures.
 *
 * The interaction is the DS's finalized one (`data-action-control/
 * DataActionControl.tsx`): a Default tab plus saved tabs, a dirty dot when the
 * live state has drifted from the active view, and rename / update / delete on
 * each saved tab. Fuel Orders proved it; this hook is what lets Asset Orders and
 * Customers have the same thing without a third and fourth copy of the state.
 *
 * `keyOf` exists so drift detection cannot be fooled by key order — each screen
 * serialises its own state deterministically.
 */
/*
  A LIST REMEMBERS WHERE IT WAS LEFT (Pavan, 2026-10-09). Leaving a page and
  coming back finds the same filters, search, sort and view — still dirty if
  they were, still savable as a view, still clearable — until Clear all (or
  the view's own reset) takes them off. Kept for the session in memory, one
  entry per list (`storageKey`); a page reload starts clean.
*/
type Kept<S> = {
  views: { id: string; name: string; state: S }[];
  activeId: string | null;
  working: Record<string, S>;
  current: S;
  seq: number;
};
const KEPT = new Map<string, Kept<unknown>>();

export function useSavedViews<S>({
  current,
  defaultState,
  keyOf,
  apply,
  storageKey,
  restore = true,
}: {
  current: S;
  defaultState: S;
  keyOf: (s: S) => string;
  apply: (s: S) => void;
  /** Remembers this list across leaving and coming back — see `KEPT`. */
  storageKey?: string;
  /** False when the visit arrives with its own narrowing (a dashboard drill),
      which then wins over what was left. */
  restore?: boolean;
}) {
  const kept = storageKey ? (KEPT.get(storageKey) as Kept<S> | undefined) : undefined;
  const [views, setViews] = React.useState<{ id: string; name: string; state: S }[]>(
    () => kept?.views ?? []
  );
  const [activeId, setActiveId] = React.useState<string | null>(() => kept?.activeId ?? null);
  const seq = React.useRef(kept?.seq ?? 0);
  /* ON RETURN, PUT THE LIST BACK as it was left — once, after mount. */
  React.useEffect(() => {
    if (kept && restore && keyOf(kept.current) !== keyOf(current)) apply(kept.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* EACH VIEW KEEPS ITS UNSAVED CHANGES (Pavan, 2026-09-24) — leaving a view
     and coming back finds it as it was left, dirty dot and all. Keyed by view
     id, "" for Default. Saving or updating the view clears its entry. */
  const working = React.useRef<Record<string, S>>(kept?.working ?? {});
  /* KEEP EVERYTHING ON EVERY CHANGE, so leaving at any moment loses nothing. */
  React.useEffect(() => {
    if (!storageKey) return;
    KEPT.set(storageKey, {
      views,
      activeId,
      working: working.current,
      current,
      seq: seq.current,
    } as Kept<unknown>);
  });
  const DEFAULT_KEY = "";

  const activeView = views.find((v) => v.id === activeId) ?? null;
  const dirty = keyOf(current) !== keyOf(activeView ? activeView.state : defaultState);

  /** Park what is on screen against the view being left. */
  const park = () => {
    const key = activeId ?? DEFAULT_KEY;
    if (dirty) working.current[key] = current;
    else delete working.current[key];
  };

  return {
    views,
    activeId,
    dirty,
    /* PRESSING THE TAB YOU ARE ON puts it back to its saved state — the one
       way to drop what was changed. Pressing another tab keeps both. */
    onApply: (id: string) => {
      const v = views.find((x) => x.id === id);
      if (!v) return;
      if (id === activeId) {
        delete working.current[id];
        apply(v.state);
        return;
      }
      park();
      apply(working.current[id] ?? v.state);
      setActiveId(id);
    },
    onResetToDefault: () => {
      if (activeId === null) {
        delete working.current[DEFAULT_KEY];
        apply(defaultState);
        return;
      }
      park();
      apply(working.current[DEFAULT_KEY] ?? defaultState);
      setActiveId(null);
    },
    onCreate: (name: string) => {
      const id = `v-${++seq.current}`;
      /* The changes move INTO the new view, so the view left is clean again. */
      delete working.current[activeId ?? DEFAULT_KEY];
      setViews((prev) => [...prev, { id, name, state: current }]);
      setActiveId(id);
    },
    onRename: (id: string, name: string) =>
      setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v))),
    onUpdate: (id: string) => {
      delete working.current[id];
      setViews((prev) =>
        prev.map((v) => (v.id === id ? { ...v, state: current } : v))
      );
    },
    onDelete: (id: string) => {
      delete working.current[id];
      setViews((prev) => prev.filter((v) => v.id !== id));
      if (activeId === id) setActiveId(null);
    },
  };
}
