import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DATE_FMT, dateKeyOf, startOfDay } from "../data";

export interface DateRange {
  from: Date;
  to: Date;
}

const DAY = 86_400_000;

/**
 * The picker's BODY — mode toggle, calendar, presets, typed custom range.
 *
 * ONE DAY AND A SPAN ARE TWO DIFFERENT QUESTIONS, so it asks which one first.
 * A range calendar can express a single day — click the same date twice — but
 * it does not SAY it can, and a reader who wants Thursday has to work out that
 * a range of one is the way to ask for it.
 *
 * Split from the toolbar control so the same panel can be a popover up there
 * and a plain block inside the export sheet. It holds no `open` of its own: the
 * mode is seeded from the window it is given, so a caller that wants it re-read
 * (a popover opening, a sheet mounting) remounts it with a `key`.
 */
export function DateRangePicker({
  value,
  onChange,
  months = 2,
  className,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  /** Two months, or one where the space is tighter. */
  months?: 1 | 2;
  className?: string;
}) {
  const days = Math.round((value.to.getTime() - value.from.getTime()) / DAY) + 1;
  const today = startOfDay(new Date());

  /* THE MODE FOLLOWS THE WINDOW at mount, and is the reader's from then on.
     Derived outright it would snap back to "single" the moment they clicked the
     first day of a range they were halfway through picking. */
  const [mode, setMode] = React.useState<"single" | "range">(
    days === 1 ? "single" : "range"
  );
  /* The typed range, revealed by Custom range. Held as strings because a
     half-typed date is not a date, and parsing on every keystroke throws the
     caret around. */
  const [custom, setCustom] = React.useState<{ from: string; to: string } | null>(
    null
  );

  const apply = (from: Date, to: Date) =>
    onChange({ from: startOfDay(from), to: startOfDay(to) });

  /** Is the window exactly this one? Drives the pressed state on the presets. */
  const is = (from: Date, to: Date) =>
    dateKeyOf(value.from) === dateKeyOf(from) &&
    dateKeyOf(value.to) === dateKeyOf(to);

  const plus = (n: number) => startOfDay(new Date(today.getTime() + n * DAY));
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  /* THE PRESETS BELONG TO THE MODE. Each is the window it would set, so the row
     can both apply it and show which one is already on without the two
     definitions being able to drift apart.

     SINGLE DATE HAS NO PRESETS. Yesterday, Today and Tomorrow were three
     buttons for three clicks already on the calendar above them, and the
     calendar marks today anyway. A preset earns its place by saving work —
     "Next 30 days" is thirty clicks — and those saved none. */
  const presets: { label: string; from: Date; to: Date }[] =
    mode === "single"
      ? []
      : [
          { label: "Next 7 days", from: today, to: plus(6) },
          { label: "Next 30 days", from: today, to: plus(29) },
          { label: "This month", from: today, to: monthEnd },
        ];

  /** The typed range, once both boxes hold a real date and run forwards. */
  const customDates = (() => {
    if (!custom) return null;
    const from = custom.from ? new Date(`${custom.from}T00:00:00`) : null;
    const to = custom.to ? new Date(`${custom.to}T00:00:00`) : null;
    if (!from || !to || Number.isNaN(+from) || Number.isNaN(+to)) return null;
    return to < from ? null : { from, to };
  })();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* THE QUESTION BEFORE THE ANSWER. It sits above the calendar because it
          changes what the calendar is — one month or two, one click or two —
          and a control that reshapes what is under it cannot sit beneath it. */}
      <div className="px-2 pt-2">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(next) => {
            if (!next) return;
            setMode(next as "single" | "range");
            setCustom(null);
            /* SWITCHING TO A SINGLE DATE COLLAPSES THE WINDOW to its first day
               rather than leaving a span underneath a control that says one
               date. The other direction keeps the day as a range of one — it is
               already true, and widening it would be the picker choosing dates
               nobody asked for. */
            if (next === "single" && days > 1) apply(value.from, value.from);
          }}
          aria-label="Date selection"
          className="h-7 w-full"
        >
          <ToggleGroupItem
            value="single"
            className="h-7 flex-1 px-2.5 text-xs font-normal data-[state=on]:font-medium"
          >
            Single date
          </ToggleGroupItem>
          <ToggleGroupItem
            value="range"
            className="h-7 flex-1 px-2.5 text-xs font-normal data-[state=on]:font-medium"
          >
            Date range
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex justify-center">
        {mode === "single" ? (
          <Calendar
            mode="single"
            selected={value.from}
            onSelect={(d) => d && apply(d, d)}
            defaultMonth={value.from}
            autoFocus
          />
        ) : (
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={(r) => {
              if (!r?.from) return;
              /* A HALF-PICKED RANGE IS A DAY, not nothing: the first click
                 already means something, and waiting for the second leaves the
                 board unchanged under a calendar that looks like it worked. */
              apply(r.from, r.to ?? r.from);
            }}
            defaultMonth={value.from}
            numberOfMonths={months}
            autoFocus
          />
        )}
      </div>

      {presets.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center gap-1 p-2">
            {presets.map((p) => {
              const on = is(p.from, p.to);
              return (
                <Button
                  key={p.label}
                  variant="ghost"
                  size="sm"
                  className={cn("flex-1", on && "bg-accent text-accent-foreground")}
                  aria-pressed={on}
                  disabled={on}
                  onClick={() => {
                    setCustom(null);
                    apply(p.from, p.to);
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
            {/* CUSTOM RANGE IS FOR DATES YOU ALREADY KNOW — a quarter end, an
                audit window, something read off an email. Clicking two of them
                out of a calendar means paging months to reach dates you could
                have typed, so this opens two date boxes seeded with the window
                you are on. It is range-only: a single date is one click away in
                the calendar above, and a second way to say it would be a second
                way for the two to disagree. */}
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1", custom && "bg-accent text-accent-foreground")}
              aria-expanded={custom !== null}
              onClick={() =>
                setCustom((c) =>
                  c ? null : { from: dateKeyOf(value.from), to: dateKeyOf(value.to) }
                )
              }
            >
              Custom range
            </Button>
          </div>
        </>
      )}

      {custom && (
        <>
          <Separator />
          <div className="flex items-end gap-2 p-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="date-custom-from" className="text-xs">
                From
              </Label>
              <Input
                id="date-custom-from"
                type="date"
                className="h-8"
                value={custom.from}
                onChange={(e) =>
                  setCustom((c) => c && { ...c, from: e.target.value })
                }
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="date-custom-to" className="text-xs">
                To
              </Label>
              <Input
                id="date-custom-to"
                type="date"
                className="h-8"
                value={custom.to}
                onChange={(e) =>
                  setCustom((c) => c && { ...c, to: e.target.value })
                }
              />
            </div>
            {/* APPLY, NOT LIVE. Typing a date passes through years that are not
                the one being typed — "2" is the year 0002 — and a board that
                reloads on every keystroke shows six windows nobody asked for on
                the way to the one they did. */}
            <Button
              size="sm"
              className="h-8"
              disabled={!customDates}
              onClick={() => {
                if (!customDates) return;
                apply(customDates.from, customDates.to);
                setCustom(null);
              }}
            >
              Apply
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The toolbar control: a window you can step, and the picker behind its label.
 *
 * 3PL ONLY, and deliberately: a fuel dispatcher works one day and steps through
 * days, but a broker's orders sit against a delivery window that routinely runs
 * over a weekend, and a one-day view of those is a lane that keeps looking
 * empty. The arrows move by the length of the window you are on — a week steps
 * a week — so stepping never silently changes how much you are looking at.
 */
export function DateRangeFilter({
  value,
  onChange,
  fullWidth = false,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  /**
   * Stretch the control to its container, the LABEL taking the slack.
   *
   * On the toolbar it sits in a row of controls and is as wide as the date it
   * prints. Given a row of its own — the export sheet's Date line — that left
   * it huddled against one edge under a full-width heading. The arrows keep
   * their 32px either way: they are the same act at any width, and a stepper
   * that grows with the panel stops reading as one.
   */
  fullWidth?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const days = Math.round((value.to.getTime() - value.from.getTime()) / DAY) + 1;

  const step = (dir: -1 | 1) => {
    const shift = dir * days * DAY;
    onChange({
      from: startOfDay(new Date(value.from.getTime() + shift)),
      to: startOfDay(new Date(value.to.getTime() + shift)),
    });
  };

  /* ONE DAY READS AS ONE DAY. "Sep 7 – Sep 7" is a range only a computer would
     write, so a single-day window prints as a date. */
  const label =
    dateKeyOf(value.from) === dateKeyOf(value.to)
      ? DATE_FMT.format(value.from)
      : `${DATE_FMT.format(value.from)} – ${DATE_FMT.format(value.to)}`;

  return (
    <div className={cn("flex items-center gap-1", fullWidth && "w-full")}>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={days === 1 ? "Previous day" : `Previous ${days} days`}
        onClick={() => step(-1)}
      >
        <ChevronLeft />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(fullWidth && "h-8 flex-1")}
            aria-label={`Delivery dates: ${label}. Pick a date or range`}
          >
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          {/* MOUNTED ONLY WHILE OPEN, which is how the picker's mode re-reads
              the window. Kept alive it would still say Date range over a single
              day picked from somewhere else. */}
          {open && <DateRangePicker value={value} onChange={onChange} />}
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label={days === 1 ? "Next day" : `Next ${days} days`}
        onClick={() => step(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
