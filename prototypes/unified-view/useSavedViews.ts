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
export function useSavedViews<S>({
  current,
  defaultState,
  keyOf,
  apply,
}: {
  current: S;
  defaultState: S;
  keyOf: (s: S) => string;
  apply: (s: S) => void;
}) {
  const [views, setViews] = React.useState<{ id: string; name: string; state: S }[]>(
    []
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const seq = React.useRef(0);

  const activeView = views.find((v) => v.id === activeId) ?? null;
  const dirty = keyOf(current) !== keyOf(activeView ? activeView.state : defaultState);

  return {
    views,
    activeId,
    dirty,
    onApply: (id: string) => {
      const v = views.find((x) => x.id === id);
      if (!v) return;
      apply(v.state);
      setActiveId(id);
    },
    onResetToDefault: () => {
      apply(defaultState);
      setActiveId(null);
    },
    onCreate: (name: string) => {
      const id = `v-${++seq.current}`;
      setViews((prev) => [...prev, { id, name, state: current }]);
      setActiveId(id);
    },
    onRename: (id: string, name: string) =>
      setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v))),
    onUpdate: (id: string) =>
      setViews((prev) =>
        prev.map((v) => (v.id === id ? { ...v, state: current } : v))
      ),
    onDelete: (id: string) => {
      setViews((prev) => prev.filter((v) => v.id !== id));
      if (activeId === id) setActiveId(null);
    },
  };
}
