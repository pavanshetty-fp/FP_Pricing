import * as React from "react";

/*
  COLUMN WIDTH, AS A DRAGGABLE THING.

  Widths ship as a guess about content nobody has seen. A customer list where
  every name is thirty characters and a list where every name is eight want
  different columns, and the reader is the only one who knows which they have.
  Truncation is not a fit — it is the table telling you the value is there and
  you may not read it.

  THE DIVIDER RESIZES; THE HEADER MOVES. Both gestures start on a header and
  they must not compete, so they are given different targets and different
  cursors: the boundary between two columns is where every spreadsheet puts
  resize, so that is what it does here, and the header's body is what drags the
  column somewhere else. `canDrag` exists so the reorder hook can be told to
  stand down while a resize is in flight — a pointer held on the divider must
  not also start a column drag.

  DUAL MODE, like the rest of this folder: pass `value` + `onChange` to keep the
  widths in a saved view; leave them off and the hook owns them.
*/

export interface UseColumnWidthsOptions {
  /** Keys that cannot be resized — the select box and the pinned row-open cell. */
  fixed?: string[];
  /** Floor, in px. A column narrower than this holds nothing. Default 64. */
  min?: number;
  /** Supply with `onChange` to control the widths from outside. */
  value?: Record<string, number>;
  onChange?: (next: Record<string, number>) => void;
}

export interface ColumnResizeProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onLostPointerCapture: () => void;
  onDoubleClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
  role: "separator";
  "aria-orientation": "vertical";
  "aria-label": string;
  draggable: false;
  "data-resizing"?: "" | undefined;
}

export interface UseColumnWidthsResult {
  /** The width to render — the reader's if they set one, else the declared one. */
  widthOf: (col: { key: string; width: number }) => number;
  /** Everything the divider handle needs. Spread it. Null for a fixed column. */
  resizeProps: (col: { key: string; width: number }) => ColumnResizeProps | null;
  /** True while a pointer is dragging a divider — read it, do not render on it. */
  isResizing: () => boolean;
  /** The key being resized, for styling. */
  resizing: string | null;
}

export function useColumnWidths({
  fixed = [],
  min = 64,
  value,
  onChange,
}: UseColumnWidthsOptions = {}): UseColumnWidthsResult {
  const [own, setOwn] = React.useState<Record<string, number>>({});
  const controlled = value !== undefined;
  const widths = controlled ? value : own;

  const commit = (next: Record<string, number>) => {
    if (!controlled) setOwn(next);
    onChange?.(next);
  };

  /* A REF, NOT STATE, for the live drag: `pointermove` fires far faster than
     React re-renders, and a handler reading a stale start point would make the
     column jump back and forth as the two disagreed. */
  const drag = React.useRef<{ key: string; x: number; from: number } | null>(null);
  const [resizing, setResizing] = React.useState<string | null>(null);

  /* A MISSED POINTERUP MUST NOT STRAND THE FLAG. The pointer can be released
     outside the window, or the handle can unmount under it, and either way the
     element's own handler never runs — leaving `drag.current` set, which tells
     the reorder hook to refuse every column drag from then on. One control
     quietly disabling another until reload is the worst kind of bug to find, so
     the release is watched on the window too, for as long as a resize is live. */
  React.useEffect(() => {
    if (!resizing) return;
    const end = () => {
      drag.current = null;
      setResizing(null);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [resizing]);

  const setWidth = (key: string, px: number) =>
    commit({ ...widths, [key]: Math.max(min, Math.round(px)) });

  const resizeProps = (col: { key: string; width: number }) => {
    if (fixed.includes(col.key)) return null;
    const current = widths[col.key] ?? col.width;
    return {
      role: "separator" as const,
      "aria-orientation": "vertical" as const,
      "aria-label": "Resize column",
      tabIndex: 0,
      /* The handle sits inside a draggable `<th>`; without this the browser
         starts a column drag the moment the pointer moves. */
      draggable: false as const,
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { key: col.key, x: e.clientX, from: current };
        setResizing(col.key);
      },
      onPointerMove: (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || d.key !== col.key) return;
        setWidth(col.key, d.from + (e.clientX - d.x));
      },
      onPointerUp: (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        drag.current = null;
        setResizing(null);
      },
      onLostPointerCapture: () => {
        drag.current = null;
        setResizing(null);
      },
      /* BACK TO THE DECLARED WIDTH — the same double-click a spreadsheet gives
         you, and the only way back once a column has been dragged to nothing. */
      onDoubleClick: () => {
        const next = { ...widths };
        delete next[col.key];
        commit(next);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        setWidth(col.key, current + (e.key === "ArrowLeft" ? -16 : 16));
      },
      "data-resizing": resizing === col.key ? ("" as const) : undefined,
    };
  };

  return {
    widthOf: (col) => widths[col.key] ?? col.width,
    resizeProps,
    isResizing: () => drag.current !== null,
    resizing,
  };
}
