import * as React from "react";

/*
  COLUMN ORDER, AS A REORDERABLE THING.

  A table's column order is the reader's, not the schema's. Which two columns
  sit side by side is what makes a comparison possible at a glance, and the
  right pair differs by who is looking — dispatch wants Driver next to Planned
  Date, accounting wants Qty next to Status. Hiding the columns in between is
  the workaround people reach for when they cannot move them, and it costs them
  the columns.

  WHAT STAYS PUT. Some columns are structure rather than content: the leading
  select box and the trailing row-open control are the frame the row is read
  inside, and the trailing one is pinned to the right edge so it survives a
  sideways scroll. Those are `fixed` — not draggable, and not droppable either,
  so a column cannot be dropped outside the frame.

  DUAL MODE, like the rest of this folder: pass `value` + `onChange` to keep the
  order in a saved view; leave them off and the hook owns it.
*/

export interface UseColumnOrderOptions {
  /** Every column key, in the order the table declares them. */
  keys: string[];
  /** Keys that cannot move and cannot be moved past — e.g. select, actions. */
  fixed?: string[];
  /** Supply with `onChange` to control the order from outside. */
  value?: string[];
  onChange?: (next: string[]) => void;
}

export interface ColumnHeaderDragProps {
  draggable: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  title?: string;
  /** Set while this header is the one being dragged. */
  "data-dragging"?: "" | undefined;
  /** "before" | "after" — which edge the drop indicator sits on. */
  "data-drop"?: "before" | "after" | undefined;
}

export interface UseColumnOrderResult {
  order: string[];
  /** Sorts a column list into the current order. Unknown keys keep their place. */
  arrange: <T extends { key: string }>(cols: T[]) => T[];
  /** Everything a `<th>` needs. Spread it. */
  headerProps: (key: string) => ColumnHeaderDragProps;
  /** The key currently being dragged, or null. */
  dragging: string | null;
}

export function useColumnOrder({
  keys,
  fixed = [],
  value,
  onChange,
}: UseColumnOrderOptions): UseColumnOrderResult {
  const [own, setOwn] = React.useState<string[]>(keys);
  const controlled = value !== undefined;
  const order = controlled ? value : own;

  /* NEW COLUMNS ARE NOT LOST. A saved order predates any column added since,
     so anything the order does not mention is appended in its declared
     position rather than dropped — a stale view should cost you the ordering,
     never the column. */
  const effective = React.useMemo(() => {
    const known = order.filter((k) => keys.includes(k));
    const missing = keys.filter((k) => !known.includes(k));
    if (missing.length === 0) return known;
    const out = [...known];
    for (const k of missing) {
      const at = keys.indexOf(k);
      const before = keys.slice(0, at).reverse().find((p) => out.includes(p));
      out.splice(before ? out.indexOf(before) + 1 : 0, 0, k);
    }
    return out;
  }, [order, keys]);

  const commit = (next: string[]) => {
    if (!controlled) setOwn(next);
    onChange?.(next);
  };

  /* THE KEY LIVES IN A REF AS WELL AS IN STATE. `dragover` can arrive in the
     same tick as `dragstart` — a synthetic drag, or a fast pointer — and a
     handler closed over state that has not re-rendered yet would read null and
     ignore the whole drag. State drives the styling; the ref answers the
     handlers. */
  type Over = { key: string; side: "before" | "after" } | null;
  const dragRef = React.useRef<string | null>(null);
  const overRef = React.useRef<Over>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOverState] = React.useState<Over>(null);
  const setOver = (next: Over) => {
    overRef.current = next;
    setOverState(next);
  };

  const isFixed = (k: string) => fixed.includes(k);

  /** Puts `key` where `target` is, on the given side. */
  const move = (key: string, target: string, side: "before" | "after") => {
    if (key === target || isFixed(key) || isFixed(target)) return;
    const next = effective.filter((k) => k !== key);
    const at = next.indexOf(target);
    if (at === -1) return;
    next.splice(side === "before" ? at : at + 1, 0, key);
    commit(next);
  };

  /** One step left or right, skipping nothing — the keyboard equivalent. */
  const nudge = (key: string, delta: -1 | 1) => {
    const movable = effective.filter((k) => !isFixed(k));
    const at = movable.indexOf(key);
    const to = at + delta;
    if (at === -1 || to < 0 || to >= movable.length) return;
    const next = effective.filter((k) => k !== key);
    next.splice(next.indexOf(movable[to]) + (delta === 1 ? 1 : 0), 0, key);
    commit(next);
  };

  const headerProps = (key: string): ColumnHeaderDragProps => {
    if (isFixed(key)) return { draggable: false };
    return {
      draggable: true,
      tabIndex: 0,
      /* The only discoverable place to say so — a header that can be dragged
         looks exactly like one that cannot. */
      title: "Drag to reorder. ⌘/Ctrl + ← → moves it one column.",
      onDragStart: (e) => {
        dragRef.current = key;
        setDragging(key);
        e.dataTransfer.effectAllowed = "move";
        // Firefox refuses to start a drag without payload.
        e.dataTransfer.setData("text/plain", key);
      },
      onDragOver: (e) => {
        const from = dragRef.current;
        if (!from || from === key) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        /* WHICH SIDE depends on where in the header the pointer is, so the
           column lands where the indicator says it will rather than always
           on one side of the target. */
        const r = e.currentTarget.getBoundingClientRect();
        setOver({ key, side: e.clientX < r.left + r.width / 2 ? "before" : "after" });
      },
      onDragLeave: () => {
        if (overRef.current?.key === key) setOver(null);
      },
      onDrop: (e) => {
        e.preventDefault();
        const from = dragRef.current;
        const to = overRef.current;
        if (from && to?.key === key) move(from, key, to.side);
        dragRef.current = null;
        setDragging(null);
        setOver(null);
      },
      onDragEnd: () => {
        dragRef.current = null;
        setDragging(null);
        setOver(null);
      },
      onKeyDown: (e) => {
        /* WITH A MODIFIER, because a bare arrow on a focused header is how you
           get to the next one. */
        if (!e.metaKey && !e.ctrlKey) return;
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        nudge(key, e.key === "ArrowLeft" ? -1 : 1);
      },
      "data-dragging": dragging === key ? "" : undefined,
      "data-drop": over?.key === key ? over.side : undefined,
    };
  };

  return {
    order: effective,
    arrange: <T extends { key: string }>(cols: T[]) =>
      [...cols].sort((a, b) => effective.indexOf(a.key) - effective.indexOf(b.key)),
    headerProps,
    dragging,
  };
}
