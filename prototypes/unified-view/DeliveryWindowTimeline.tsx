import * as React from "react";
import { TriangleAlert, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SheetField } from "@/components/side-sheet/parts";
import { HangingAdd } from "./HangingAdd";
import { Slider } from "@/components/ui/slider";
import {
  formatSpan,
  formatWindow,
} from "@/components/form-layout/TimeWindowSlider";
import { cn } from "@/lib/utils";
/** A stretch of the day, minutes from midnight. */
export interface TimeSpan {
  start: number;
  end: number;
}

/*
  DELIVERY WINDOW & PREFERRED TIME (Pavan, 2026-10-20, after his reference;
  shared by every module's order sheet) —
  ONE day, drawn once, full width. The delivery window is the range on the
  track; each preferred time is a light-blue bar under it, on the same scale,
  with dashed lines up to the track and its two times under its ends. A bar
  is moved by dragging it, sized by dragging an end, and removed with its ✕;
  the + hanging off the box (as a table's add) puts a new one in the
  window's next free stretch.

  Keyboard: a bar takes focus — ← → move it half an hour, Shift + ← → move
  its end, Delete removes it.

  NEVER OVERLAPPING (Pavan, 2026-10-20) — a bar stops at its neighbours,
  whichever way it is dragged or typed; with no free half hour left in the
  window, + says to delete or adjust one first. PRESS A TIME under a bar to
  type its start and end to the minute — the slider and the box are the same
  value.
*/

const DAY = 24 * 60;
const STEP = 30;
/** Every third hour labelled, as the reference. */
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const pct = (m: number) => `${(m / DAY) * 100}%`;
/** `4a`, `1:30p` — the reference's short times. */
const short = (m: number) => {
  const h24 = Math.floor((((m % DAY) + DAY) % DAY) / 60);
  const mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${mm ? `:${String(mm).padStart(2, "0")}` : ""}${h24 < 12 ? "a" : "p"}`;
};
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromHhmm = (v: string) => {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const tick = (h: number) =>
  h === 0 || h === 24
    ? "12a"
    : h === 12
      ? "12p"
      : h < 12
        ? `${h}a`
        : `${h - 12}p`;

type Drag = {
  i: number;
  mode: "move" | "start" | "end";
  grab: number;
  from: TimeSpan;
};

export function DeliveryWindowTimeline({
  start,
  end,
  onWindowChange,
  preferred,
  onPreferredChange,
  disabled,
  required,
  label = "Delivery window & preferred time",
}: {
  /** The field's label, outside the box — every module says it its own way. */
  label?: string;
  /** The delivery window, minutes from midnight. */
  start: number;
  end: number;
  onWindowChange: (start: number, end: number) => void;
  preferred: TimeSpan[];
  onPreferredChange: (next: TimeSpan[]) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const scale = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!scale.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(scale.current);
    return () => ro.disconnect();
  }, []);
  const drag = React.useRef<Drag | null>(null);
  /* THE NEW BAR TAKES FOCUS (DS ui §10f) — so ← → move it at once. */
  const [focusNew, setFocusNew] = React.useState<number | null>(null);
  /** The bar whose times are being typed, and which box opened it. */
  const [edit, setEdit] = React.useState<{
    i: number;
    field: "start" | "end";
  } | null>(null);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => setFull(false), [preferred, start, end]);

  /* THE ROOM A BAR HAS — from its neighbours (or the window) either side. */
  const room = (i: number, at: TimeSpan) => {
    const others = preferred.filter((_, j) => j !== i);
    return {
      lo: Math.max(
        start,
        ...others.filter((q) => q.end <= at.start).map((q) => q.end),
      ),
      hi: Math.min(
        end,
        ...others.filter((q) => q.start >= at.end).map((q) => q.start),
      ),
    };
  };

  const toMin = (clientX: number) => {
    const r = scale.current!.getBoundingClientRect();
    return Math.round((((clientX - r.left) / r.width) * DAY) / STEP) * STEP;
  };
  const clampSpan = (
    i: number,
    at: TimeSpan,
    s: number,
    e: number,
    mode: Drag["mode"],
  ): TimeSpan => {
    const { lo, hi } = room(i, at);
    if (mode === "move") {
      const len = e - s;
      const a = Math.min(Math.max(s, lo), hi - len);
      return { start: a, end: a + len };
    }
    if (mode === "start")
      return { start: Math.min(Math.max(s, lo), e - STEP), end: e };
    return { start: s, end: Math.max(Math.min(e, hi), s + STEP) };
  };
  const setAt = (i: number, p: TimeSpan) =>
    onPreferredChange(preferred.map((x, j) => (j === i ? p : x)));

  const onDown = (e: React.PointerEvent, i: number, mode: Drag["mode"]) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { i, mode, grab: toMin(e.clientX), from: preferred[i] };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = toMin(e.clientX) - d.grab;
    const s = d.mode === "end" ? d.from.start : d.from.start + delta;
    const en = d.mode === "start" ? d.from.end : d.from.end + delta;
    setAt(d.i, clampSpan(d.i, d.from, s, en, d.mode));
  };
  const onUp = () => (drag.current = null);

  const add = () => {
    /* THE FIRST FREE STRETCH OF HALF AN HOUR OR MORE, up to two hours. */
    const taken = [...preferred].sort((a, b) => a.start - b.start);
    let at = start;
    for (const q of [...taken, { start: end, end }]) {
      if (q.start - at >= STEP) {
        setFocusNew(preferred.length);
        onPreferredChange([
          ...preferred,
          { start: at, end: Math.min(q.start, at + 120) },
        ]);
        return;
      }
      at = Math.max(at, q.end);
    }
    setFull(true);
  };
  /* A TYPED PAIR — what's wrong with it, or null when it fits. */
  const problem = (i: number, s: number | null, e: number | null) => {
    if (s === null || e === null) return "Enter both times";
    if (e <= s) return "End after the start";
    if (s < start || e > end)
      return `Inside the delivery window, ${formatWindow(start, end)}`;
    if (preferred.some((q, j) => j !== i && s < q.end && e > q.start))
      return "Overlaps another preferred time";
    return null;
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const p = preferred[i];
    const by =
      e.key === "ArrowRight" ? STEP : e.key === "ArrowLeft" ? -STEP : 0;
    if (by) {
      e.preventDefault();
      setAt(
        i,
        e.shiftKey
          ? clampSpan(i, p, p.start, p.end + by, "end")
          : clampSpan(i, p, p.start + by, p.end + by, "move"),
      );
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onPreferredChange(preferred.filter((_, j) => j !== i));
    }
  };

  const has = preferred.length > 0;
  const canAdd = !disabled && end - start >= STEP;
  return (
    /* THE LABEL OUTSIDE, as every field's (Pavan, 2026-10-20); the unit in
       the input's own outline; the add hangs off its corner, as a table's. */
    <SheetField label={label} required={required}>
      <div className="flex flex-col">
        <div
          className={cn(
            "flex flex-col gap-2 rounded-md border border-input bg-fp-surface-1b px-4 pt-3 pb-3 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 dark:bg-fp-field-fill",
            canAdd && "rounded-bl-none",
          )}
        >
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="text-sm whitespace-nowrap tabular-nums text-foreground">
              {formatWindow(start, end)}
            </span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {formatSpan(start, end)}
            </span>
          </div>

          {/* THE SCALE — track, hours, then the preferred bars on the same day. */}
          <div
            ref={scale}
            className={cn("relative", has ? "h-[78px]" : "h-10")}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            <Slider
              className="absolute inset-x-0 top-0 h-5 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-track]]:h-2.5"
              aria-label="Delivery window"
              min={0}
              max={DAY}
              step={STEP}
              minStepsBetweenThumbs={60 / STEP}
              value={[start, end]}
              disabled={disabled}
              onValueChange={([a, b]) => onWindowChange(a, b)}
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-6 h-3.5 select-none"
            >
              {TICKS.map((h, i) => (
                <span
                  key={h}
                  className={cn(
                    "absolute top-0 text-xs leading-none tabular-nums text-muted-foreground",
                    i === 0 && "left-0",
                    i === TICKS.length - 1 && "right-0",
                    i > 0 && i < TICKS.length - 1 && "-translate-x-1/2",
                  )}
                  style={
                    i === 0 || i === TICKS.length - 1
                      ? undefined
                      : { left: `${(h / 24) * 100}%` }
                  }
                >
                  {tick(h)}
                </span>
              ))}
            </div>

            {preferred.map((p, i) => {
              /* A NARROW BAR PUTS ITS TIMES OUTSIDE ITS ENDS, so they never meet. */
              const narrow =
                width > 0 && ((p.end - p.start) / DAY) * width < 84;
              /* WHERE TWO BARS MEET, THE TIME IS PRINTED ONCE — by the later bar. */
              const shared = preferred.some(
                (q, j) => j !== i && q.start === p.end,
              );
              return (
                <React.Fragment key={i}>
                  {[p.start, p.end].map((m, k) => (
                    <span
                      key={k}
                      aria-hidden
                      className="absolute top-4 h-7 border-l border-dashed border-muted-foreground/60"
                      style={{ left: pct(m) }}
                    />
                  ))}
                  <div
                    role="group"
                    ref={(el) => {
                      if (el && i === focusNew) {
                        el.focus({ preventScroll: true });
                        setFocusNew(null);
                      }
                    }}
                    autoFocus={i === focusNew}
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Preferred time ${formatWindow(p.start, p.end)}`}
                    onKeyDown={(e) => !disabled && onKey(e, i)}
                    onPointerDown={(e) => onDown(e, i, "move")}
                    className={cn(
                      "group/bar absolute top-11 h-2.5 rounded-xs bg-fp-lane-blue/30 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      !disabled &&
                        "cursor-grab active:cursor-grabbing hover:bg-fp-lane-blue/45",
                    )}
                    /* 1px of air each side, so two bars that meet stay two. */
                    style={{
                      left: `calc(${pct(p.start)} + 1px)`,
                      width: `calc(${pct(p.end - p.start)} - 2px)`,
                    }}
                  >
                    {!disabled && (
                      <>
                        {/* THE ENDS SIZE IT — a grip wider than the line. */}
                        <span
                          onPointerDown={(e) => onDown(e, i, "start")}
                          className="absolute inset-y-[-4px] -left-1.5 w-3 cursor-ew-resize"
                        />
                        <span
                          onPointerDown={(e) => onDown(e, i, "end")}
                          className="absolute inset-y-[-4px] -right-1.5 w-3 cursor-ew-resize"
                        />
                        <button
                          type="button"
                          aria-label={`Remove preferred time ${formatWindow(p.start, p.end)}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() =>
                            onPreferredChange(
                              preferred.filter((_, j) => j !== i),
                            )
                          }
                          className="absolute top-1/2 -right-6 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none transition-opacity group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <X className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* A SHORT BAR CARRIES ONE LABEL, BOTH TIMES — two would run
                      into each other or into the next bar's. */}
                  <TimeLabel
                    m={p.start}
                    text={
                      narrow && !shared
                        ? `${short(p.start)}–${short(p.end)}`
                        : undefined
                    }
                    open={edit?.i === i && edit.field === "start"}
                    onOpenChange={(o) =>
                      setEdit(o ? { i, field: "start" } : null)
                    }
                    disabled={disabled}
                  >
                    <TimesEditor
                      p={p}
                      focus="start"
                      check={(a, b) => problem(i, a, b)}
                      onCommit={(np) => setAt(i, np)}
                    />
                  </TimeLabel>
                  {!shared && !narrow && (
                    <TimeLabel
                      m={p.end}
                      className="-translate-x-full"
                      open={edit?.i === i && edit.field === "end"}
                      onOpenChange={(o) =>
                        setEdit(o ? { i, field: "end" } : null)
                      }
                      disabled={disabled}
                    >
                      <TimesEditor
                        p={p}
                        focus="end"
                        check={(a, b) => problem(i, a, b)}
                        onCommit={(np) => setAt(i, np)}
                      />
                    </TimeLabel>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <div className="flex items-start gap-3">
          {canAdd && <HangingAdd label="Add preferred time" onClick={add} />}
          {/* NO ROOM LEFT (Pavan, 2026-10-20) — said where the add was pressed. */}
          {full && (
            <p
              role="alert"
              className="flex items-center gap-1.5 pt-1.5 text-xs text-status-failed"
            >
              <TriangleAlert className="size-3.5 shrink-0" />
              Delete or adjust the current preferred time to add a new one.
            </p>
          )}
        </div>
      </div>
    </SheetField>
  );
}

/** A bar's time under its end — pressed, it opens the typed times. */
function TimeLabel({
  m,
  text,
  className,
  open,
  onOpenChange,
  disabled,
  children,
}: {
  m: number;
  /** In place of the one time — a short bar's "8a–9:20a". */
  text?: string;
  className?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const label = (
    <span
      className={cn(
        "absolute top-[59px] text-xs leading-none tabular-nums text-foreground",
        className,
      )}
      style={{ left: pct(m) }}
    >
      {text ?? short(m)}
    </span>
  );
  if (disabled) return label;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Type the preferred time, ${short(m)}`}
          className={cn(
            "absolute top-[57px] -ml-0.5 rounded-sm px-0.5 py-0.5 text-xs leading-none tabular-nums text-foreground underline decoration-current/40 decoration-dotted underline-offset-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
          style={{ left: pct(m) }}
        >
          {text ?? short(m)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** START AND END TO THE MINUTE — each change that fits is kept at once. */
function TimesEditor({
  p,
  focus,
  check,
  onCommit,
}: {
  p: TimeSpan;
  focus: "start" | "end";
  check: (s: number | null, e: number | null) => string | null;
  onCommit: (p: TimeSpan) => void;
}) {
  const [a, setA] = React.useState(hhmm(p.start));
  const [b, setB] = React.useState(hhmm(p.end));
  const err = check(fromHhmm(a), fromHhmm(b));
  const put = (na: string, nb: string) => {
    const s = fromHhmm(na);
    const e = fromHhmm(nb);
    if (!check(s, e)) onCommit({ start: s!, end: e! });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Start
          <Input
            type="time"
            step={60}
            className="w-[130px]"
            value={a}
            autoFocus={focus === "start"}
            onChange={(e) => {
              setA(e.target.value);
              put(e.target.value, b);
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          End
          <Input
            type="time"
            step={60}
            className="w-[130px]"
            value={b}
            autoFocus={focus === "end"}
            onChange={(e) => {
              setB(e.target.value);
              put(a, e.target.value);
            }}
          />
        </label>
      </div>
      {err && <p className="text-xs text-status-failed">{err}</p>}
    </div>
  );
}
