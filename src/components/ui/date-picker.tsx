import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/*
  THE DATE PICKER — ONE FOR EVERY SCREEN THAT PICKS A DATE (Pavan, 2026-10-21;
  DS ui §10p). Built after his reference:

    ┌ presets ┬ month · month ────────────────────────────┐
    │ All     │  ends filled, the days between tinted      │
    │ Today … │                                            │
    ├─────────┴────────────────────────────────────────────┤
    │ [start] → [end]      N orders match   Reset  Apply   │
    └──────────────────────────────────────────────────────┘

  A RANGE PICKER PICKS ONE DAY TOO: click a day and Apply, or click it twice.
  Nothing changes until Apply — the presets, the calendar and the typed dates
  all edit a draft. Reset puts the draft back to where the screen starts.

  `select="single"` is the same panel for a field that holds one date (a
  planned date, an end date): day presets, one month, one typed date.
*/

export interface DateRange {
  from: Date;
  to: Date;
}

const DAY = 86_400_000;
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const plus = (d: Date, n: number) => sod(new Date(d.getTime() + n * DAY));
const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const same = (a: DateRange, b: DateRange) => keyOf(a.from) === keyOf(b.from) && keyOf(a.to) === keyOf(b.to);

export const DATE_LABEL_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** One day reads as a date; a span reads as a span. */
export function formatDateRange(r: DateRange): string {
  return keyOf(r.from) === keyOf(r.to)
    ? DATE_LABEL_FMT.format(r.from)
    : `${DATE_LABEL_FMT.format(r.from)} – ${DATE_LABEL_FMT.format(r.to)}`;
}

/* TYPED DATES are MM/DD/YYYY — what a US dispatcher writes on a form. */
const typed = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
function parseTyped(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[1] - 1, +m[2]);
  return d.getMonth() === +m[1] - 1 ? d : null;
}

interface Preset {
  label: string;
  range: DateRange;
}

function rangePresets(today: Date, all?: DateRange): Preset[] {
  const weekStart = plus(today, -today.getDay());
  const q = Math.floor(today.getMonth() / 3) * 3;
  return [
    ...(all ? [{ label: "All dates", range: all }] : []),
    { label: "Today", range: { from: today, to: today } },
    { label: "Yesterday", range: { from: plus(today, -1), to: plus(today, -1) } },
    { label: "This week", range: { from: weekStart, to: plus(weekStart, 6) } },
    { label: "Last week", range: { from: plus(weekStart, -7), to: plus(weekStart, -1) } },
    { label: "Last 7 days", range: { from: plus(today, -6), to: today } },
    { label: "Last 30 days", range: { from: plus(today, -29), to: today } },
    { label: "Next 7 days", range: { from: today, to: plus(today, 6) } },
    { label: "Month to date", range: { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today } },
    {
      label: "Last month",
      range: {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      },
    },
    {
      label: "This quarter",
      range: { from: new Date(today.getFullYear(), q, 1), to: new Date(today.getFullYear(), q + 3, 0) },
    },
  ];
}

function dayPresets(today: Date): Preset[] {
  return [
    { label: "Today", range: { from: today, to: today } },
    { label: "Tomorrow", range: { from: plus(today, 1), to: plus(today, 1) } },
    { label: "Yesterday", range: { from: plus(today, -1), to: plus(today, -1) } },
    { label: "In 7 days", range: { from: plus(today, 7), to: plus(today, 7) } },
  ];
}

/** Is this day ruled out by the caller's `disabled` matcher? Only the forms
 *  that pass a function or a before/after bound are checked. */
function isOff(d: Date, disabled?: Matcher | Matcher[]): boolean {
  const list = disabled === undefined ? [] : Array.isArray(disabled) ? disabled : [disabled];
  return list.some((m) => {
    if (typeof m === "function") return m(d);
    if (m && typeof m === "object" && "before" in m && m.before instanceof Date && d < sod(m.before)) return true;
    if (m && typeof m === "object" && "after" in m && m.after instanceof Date && d > sod(m.after)) return true;
    return false;
  });
}

export interface DatePickerPanelProps {
  /** What the screen holds now; the draft starts here. */
  value: DateRange | null;
  onApply: (next: DateRange | null) => void;
  /** A range (default) — which also picks one day — or one date only. */
  select?: "range" | "single";
  /** Shows "All dates" and what it means for this screen: the span of its records. */
  all?: DateRange;
  /** Where Reset goes. Defaults to the value the panel opened on. */
  resetTo?: DateRange | null;
  /** Live "N orders match" under the draft. */
  count?: (r: DateRange) => number;
  /** The record, plural — "orders". */
  noun?: string;
  disabled?: Matcher | Matcher[];
  className?: string;
}

export function DatePickerPanel({
  value,
  onApply,
  select = "range",
  all,
  resetTo,
  count,
  noun = "records",
  disabled,
  className,
}: DatePickerPanelProps) {
  const single = select === "single";
  /* The typed start's id, so Custom range can put the caret there. */
  const fromId = React.useId();
  const today = sod(new Date());
  const start = React.useRef(value);
  const [draft, setDraft] = React.useState<DateRange | null>(value);
  /* A range is picked in two clicks; between them the first day is a range of
     one, waiting for its other end. */
  const [pending, setPending] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(value?.from ?? today);
  const [text, setText] = React.useState({ from: value ? typed(value.from) : "", to: value ? typed(value.to) : "" });

  const put = (next: DateRange | null, jump = true) => {
    setDraft(next);
    setText({ from: next ? typed(next.from) : "", to: next ? typed(next.to) : "" });
    if (next && jump) setMonth(next.from);
  };

  const presets = (single ? dayPresets(today) : rangePresets(today, all)).filter(
    (p) => !isOff(p.range.from, disabled) && !isOff(p.range.to, disabled)
  );
  const onPreset = draft ? presets.find((p) => same(p.range, draft)) : undefined;

  const pick = (day: Date) => {
    const d = sod(day);
    if (single || !pending || !draft) {
      put({ from: d, to: d }, false);
      setPending(!single);
      return;
    }
    put(d < draft.from ? { from: d, to: draft.from } : { from: draft.from, to: d }, false);
    setPending(false);
  };

  const commitTyped = (end: "from" | "to") => {
    const d = parseTyped(text[end]);
    if (!d || isOff(d, disabled)) {
      setText({ from: draft ? typed(draft.from) : "", to: draft ? typed(draft.to) : "" });
      return;
    }
    if (single) return put({ from: d, to: d });
    const base = draft ?? { from: d, to: d };
    let next = end === "from" ? { from: d, to: base.to } : { from: base.from, to: d };
    if (next.to < next.from) next = { from: next.to, to: next.from };
    setPending(false);
    put(next);
  };

  const reset = resetTo !== undefined ? resetTo : start.current;
  const n = draft && count ? count(draft) : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex">
        {/* THE PRESETS — the windows people ask for by name. The one the
            draft is on wears the selection fill; anything else is Custom.
            AS TALL AS THE CALENDAR, NO TALLER (Pavan, 2026-10-22): the list
            scrolls inside that height, so the panel stays short. */}
        <div className="relative w-44 shrink-0 border-r border-border">
        <div aria-label="Presets" role="group" className="absolute inset-0 flex flex-col gap-0.5 overflow-y-auto p-2">
          {presets.map((p) => {
            const on = onPreset?.label === p.label;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPending(false);
                  put(p.range);
                }}
                className={cn(
                  "h-7 shrink-0 rounded-md px-2.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50",
                  on && "bg-selected font-medium text-selected-foreground hover:bg-selected"
                )}
              >
                {p.label}
              </button>
            );
          })}
          {!single && (
            <button
              type="button"
              aria-pressed={!onPreset && Boolean(draft)}
              onClick={() => document.getElementById(fromId)?.focus()}
              className={cn(
                "h-7 shrink-0 rounded-md px-2.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-fp-row-hover focus-visible:ring-2 focus-visible:ring-ring/50",
                !onPreset && draft && "bg-selected font-medium text-selected-foreground hover:bg-selected"
              )}
            >
              Custom range
            </button>
          )}
        </div>
        </div>

        <div className="px-3 py-1">
          {/* `onSelect` is what makes the calendar follow the draft; `pick`
              reads the day clicked, not the calendar's own idea of a range. */}
          {single ? (
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={draft?.from}
              onSelect={(_: unknown, d: Date) => pick(d)}
              disabled={disabled}
            />
          ) : (
            <Calendar
              mode="range"
              numberOfMonths={2}
              /* MORE AIR BETWEEN THE TWO MONTHS (Pavan, 2026-10-22). */
              classNames={{ months: "relative flex flex-col gap-12 md:flex-row" }}
              month={month}
              onMonthChange={setMonth}
              selected={draft ?? undefined}
              onSelect={(_: unknown, d: Date) => pick(d)}
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {/* THE FOOTER — the draft in words you can type over, how much it
          catches, and the two ways out. */}
      <div className="flex items-center gap-3 border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Input
            id={fromId}
            aria-label={single ? "Date" : "Start date"}
            placeholder="MM/DD/YYYY"
            value={text.from}
            onChange={(e) => setText((t) => ({ ...t, from: e.target.value }))}
            onBlur={() => commitTyped("from")}
            onKeyDown={(e) => e.key === "Enter" && commitTyped("from")}
            className="h-8 w-32 tabular-nums"
          />
          {!single && (
            <>
              <span aria-hidden className="text-muted-foreground">→</span>
              <Input
                aria-label="End date"
                placeholder="MM/DD/YYYY"
                value={text.to}
                onChange={(e) => setText((t) => ({ ...t, to: e.target.value }))}
                onBlur={() => commitTyped("to")}
                onKeyDown={(e) => e.key === "Enter" && commitTyped("to")}
                className="h-8 w-32 tabular-nums"
              />
            </>
          )}
        </div>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {n !== null && `${n.toLocaleString()} ${n === 1 ? noun.replace(/s$/, "") : noun} match`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={reset === draft || (reset !== null && draft !== null && same(reset, draft))}
          onClick={() => {
            setPending(false);
            put(reset);
          }}
        >
          Reset
        </Button>
        <Button size="sm" disabled={!draft && !single} onClick={() => onApply(draft)}>
          Apply
        </Button>
      </div>
    </div>
  );
}

/**
 * A FORM FIELD THAT HOLDS ONE DATE — the trigger reads like a field, the
 * panel is the shared picker in `single` mode. Apply closes it.
 */
export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  dayDisabled,
  className,
  id,
  align = "start",
  children,
}: {
  value: Date | null | undefined;
  onChange: (next: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Days that cannot be picked. */
  dayDisabled?: Matcher | Matcher[];
  className?: string;
  id?: string;
  align?: "start" | "center" | "end";
  /** A trigger of the caller's own, in place of the field-shaped button. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children ?? (
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
          >
            <CalendarIcon />
            {value ? DATE_LABEL_FMT.format(value) : placeholder}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto max-w-[calc(var(--fp-vw,100vw)-2rem)] p-0">
        {open && (
          <DatePickerPanel
            select="single"
            value={value ? { from: value, to: value } : null}
            resetTo={value ? { from: value, to: value } : null}
            disabled={dayDisabled}
            onApply={(r) => {
              onChange(r ? r.from : null);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * A FILTER OR FIELD THAT HOLDS A RANGE (one day is a range of one). The
 * caller brings the trigger; Apply closes it.
 */
export function DateRangePopover({
  value,
  onChange,
  children,
  align = "end",
  ...panel
}: Omit<DatePickerPanelProps, "value" | "onApply"> & {
  value: DateRange;
  onChange: (next: DateRange) => void;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto max-w-[calc(var(--fp-vw,100vw)-2rem)] p-0">
        {open && (
          <DatePickerPanel
            {...panel}
            value={value}
            onApply={(r) => {
              if (r) onChange(r);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * WHAT A LIST TELLS ITS PICKER, from its records' `YYYY-MM-DD` days: the span
 * "All dates" means, and how many records a draft window catches.
 */
export function dateWindowOf(keys: readonly string[]): {
  all?: DateRange;
  count: (r: DateRange) => number;
} {
  const sorted = keys.filter(Boolean).slice().sort();
  const day = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const k = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    all: sorted.length ? { from: day(sorted[0]), to: day(sorted[sorted.length - 1]) } : undefined,
    count: (r) => {
      const from = k(r.from);
      const to = k(r.to);
      return sorted.filter((x) => x >= from && x <= to).length;
    },
  };
}

/* APPLY CLOSES THE POPOVER IT SITS IN — when that popover is a DatePopover. */
const CloseCtx = React.createContext<(() => void) | null>(null);

/** A `Popover` that the date panel inside it can close on Apply. */
export function DatePopover({ children, ...props }: Omit<React.ComponentProps<typeof Popover>, "open" | "onOpenChange">) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <CloseCtx.Provider value={() => setOpen(false)}>{children}</CloseCtx.Provider>
    </Popover>
  );
}

/**
 * THE ONE-DATE PANEL with a Calendar's single-date props — `selected`,
 * `onSelect`, `disabled` — so a form's date field swaps its calendar for the
 * shared picker without changing what it stores. `onSelect` runs on Apply.
 */
export function DatePanel({
  selected,
  onSelect,
  disabled,
}: {
  selected?: Date;
  onSelect: (d: Date | undefined) => void;
  disabled?: Matcher | Matcher[];
}) {
  const close = React.useContext(CloseCtx);
  const value = selected ? { from: sod(selected), to: sod(selected) } : null;
  return (
    <DatePickerPanel
      select="single"
      value={value}
      resetTo={value}
      disabled={disabled}
      onApply={(r) => {
        onSelect(r?.from);
        close?.();
      }}
    />
  );
}

/** `DateField` for a value kept as a `YYYY-MM-DD` key; `min` rules out days before it. */
export function DateKeyField({
  value,
  onChange,
  min,
  ...rest
}: Omit<React.ComponentProps<typeof DateField>, "value" | "onChange" | "dayDisabled"> & {
  value: string | null | undefined;
  onChange: (key: string) => void;
  min?: string;
}) {
  const day = (k?: string | null) => {
    if (!k) return null;
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const k = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const floor = day(min);
  return (
    <DateField
      {...rest}
      value={day(value)}
      dayDisabled={floor ? { before: floor } : undefined}
      onChange={(d) => d && onChange(k(d))}
    />
  );
}
