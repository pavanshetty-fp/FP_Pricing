import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OutlineShine } from "@/components/ui/outline-shine";
import { Button } from "@/components/ui/button";
import { PILL_SHAPE } from "@/components/ui/pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BANNER_SNOOZE_OPTIONS,
  inlineAccent,
  type BannerStatus,
} from "@/components/ui/banner";

/*
  THE ALERT BANNER (Pavan, 2026-10-13, after the Lovable customer portal) —
  the soft BannerCallout grown to carry SEVERAL KINDS of alert at once.

  ONE KIND AT A TIME, with ‹ 1 of 3 › to step through them — the same
  stepper as the sheet's Pending strip. Each kind is one line: on the left
  its tag with the icon in it ("Needs action"), what it is, then the count
  in a pill with the chevron that opens its list; on the right its action,
  the stepper, snooze, and ✕ last. The banner takes the kind's status, so a red kind and an amber one
  look like what they are.

  THE BANNER IS A FILTER. Pressing the line applies the narrowing it
  describes (the Sales "Show orders" rule, carried by the words themselves);
  pressing one of its items in Details narrows to that item.

  DETAILS opens the kind's items, each with its own detail and action, and
  folds back with Collapse. Snooze is `BANNER_SNOOZE_OPTIONS`, everywhere.

  THE BANNER IS BLUE; THE PILLS CARRY THE SEVERITY (Pavan, 2026-10-25): a
  banner is information, so its fill and rim are always the info blue, and
  each alert's tag/count pill keeps its own colour (red for overdue, amber
  for a caution…). VIEW ALL (same day) lays every alert out as its own
  banner, one under another; Collapse folds them back to one at a time.
*/

export interface BannerAlertItem {
  id: string;
  title: string;
  detail?: string;
  /** RICHER DETAIL than a line of text — the record's own readings, drawn as
      the app draws them elsewhere (Pavan, 2026-10-20: a tank's level,
      battery and gallons). Sits after the title, before the action. */
  facts?: React.ReactNode;
  action?: React.ReactNode;
  /** Narrow the list to this item. */
  onApply?: () => void;
}

export interface BannerAlert {
  id: string;
  status: BannerStatus;
  /** A short tag before the title — "Needs action". */
  tag?: string;
  title: string;
  detail?: string;
  count?: number;
  /** Narrow the list to what this alert is about. */
  onApply?: () => void;
  action?: React.ReactNode;
  items?: BannerAlertItem[];
}

/* THE BANNER'S TAG PILLS ARE WHITE AND OUTLINED (Pavan, 2026-10-26) — the
   severity is the words, the icon and a 1px rim in one ink; the fill is the
   content layer's white. */
const ALERT_PILL: Record<BannerStatus, string> = {
  warning: "border border-fp-alert-pill-warning-ink bg-fp-surface-1b text-fp-alert-pill-warning-ink",
  caution: "border border-fp-alert-pill-caution-ink bg-fp-surface-1b text-fp-alert-pill-caution-ink",
  info: "border border-fp-alert-pill-info-ink bg-fp-surface-1b text-fp-alert-pill-info-ink",
  success: "border border-fp-alert-pill-success-ink bg-fp-surface-1b text-fp-alert-pill-success-ink",
};

/* THE COUNT PILL IS A REGULAR PILL (Pavan, 2026-10-26) — neutral grey with
   dark text, no sweep: it counts, the tag already says how serious. */
const COUNT_PILL = "bg-muted text-foreground";

/* THE COUNT INSIDE THE TAG — a very light fill of the tag's own colour
   (Pavan, 2026-10-26). */
const TAG_COUNT: Record<BannerStatus, string> = {
  warning: "bg-fp-alert-pill-warning",
  caution: "bg-fp-alert-pill-caution",
  info: "bg-fp-alert-pill-info",
  success: "bg-fp-alert-pill-success",
};

/* THE SWEEP'S BAR PER KIND — a deeper shade of the pill's own colour
   (Pavan, 2026-10-20: every pill in the banner, not only Needs action). */
const SWEEP: Record<BannerStatus, string> = {
  warning: "color-mix(in oklab, var(--color-fp-lane-red) 30%, transparent)",
  caution: "color-mix(in oklab, var(--color-fp-lane-orange) 35%, transparent)",
  info: "color-mix(in oklab, var(--color-fp-lane-blue) 30%, transparent)",
  success: "color-mix(in oklab, var(--color-fp-lane-green) 30%, transparent)",
};

/** THE CTA SHINE (Pavan, 2026-10-20) — every button the banner carries gets
    the white sweep on its outline, the one first drawn on "Create Order
    Request". A ring 2px wide, centred on the button's 1px border. */
function Shined({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex rounded-md">
      {children}
      <OutlineShine color="var(--color-white)" band="50%" thickness={2} inset={-0.5} />
    </span>
  );
}

const ICON_BTN =
  "flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4";

/**
 * The standard "Remind me later" — a clock, a tooltip, the snooze menu, and
 * a CUSTOM duration (Pavan, 2026-10-13): hours and minutes from now.
 */
export function BannerSnooze({ onSnooze }: { onSnooze: (ms: number) => void }) {
  const [custom, setCustom] = React.useState(false);
  const wantsCustom = React.useRef(false);
  /* A DURATION, hours and minutes (Pavan, 2026-10-13 — no calendar). */
  const [hours, setHours] = React.useState("1");
  const [minutes, setMinutes] = React.useState("0");
  const ms = ((Number(hours) || 0) * 60 + (Number(minutes) || 0)) * 60_000;
  const digits = (v: string, max: number) => {
    const n = v.replace(/[^0-9]/g, "").slice(0, 3);
    return n === "" ? "" : String(Math.min(max, Number(n)));
  };
  return (
    <TooltipProvider>
      <Popover open={custom} onOpenChange={setCustom}>
        <DropdownMenu>
          {/* TOOLTIP OUTSIDE, MENU TRIGGER INSIDE — the only order that
              composes; the popover hangs off the same clock. */}
          <PopoverAnchor asChild>
            <span className="flex">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label="Remind me later" className={ICON_BTN}>
                      <Clock />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Remind me later</TooltipContent>
              </Tooltip>
            </span>
          </PopoverAnchor>
          <DropdownMenuContent
            align="end"
            /* CUSTOM OPENS ONCE THE MENU HAS CLOSED — an open menu holds
               focus, and handing it back would close the popover at once
               (the Quote sheet's Add charge rule). */
            onCloseAutoFocus={(e) => {
              if (!wantsCustom.current) return;
              e.preventDefault();
              wantsCustom.current = false;
              setCustom(true);
            }}
          >
            {BANNER_SNOOZE_OPTIONS.map((o) => (
              <DropdownMenuItem key={o.label} onSelect={() => onSnooze(o.ms)}>
                {o.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => (wantsCustom.current = true)}>Custom…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <PopoverContent align="end" className="w-auto p-3">
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Hours
              <Input
                inputMode="numeric"
                aria-label="Hours"
                value={hours}
                onChange={(e) => setHours(digits(e.target.value, 168))}
                className="h-8 w-16 tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Minutes
              <Input
                inputMode="numeric"
                aria-label="Minutes"
                value={minutes}
                onChange={(e) => setMinutes(digits(e.target.value, 59))}
                className="h-8 w-16 tabular-nums"
              />
            </label>
            <Button
              size="sm"
              disabled={ms <= 0}
              onClick={() => {
                onSnooze(ms);
                setCustom(false);
              }}
            >
              Snooze
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

/* PRESSABLE WITHOUT AN UNDERLINE (Pavan, 2026-10-13) — the pointer and a
   slight fade on hover say it acts. */
const PRESSABLE =
  "cursor-pointer rounded-sm text-left outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring/50";

export function AlertBanner({
  alerts,
  onSnooze,
  onDismiss,
  appliedId,
  onClearApplied,
  ctaMode = true,
  className,
}: {
  alerts: BannerAlert[];
  onSnooze?: (id: string, ms: number) => void;
  onDismiss?: (id: string) => void;
  /**
   * The alert whose filter the list is showing now. Its line gains "Clear
   * filter", which puts the list back to its default — the banner stays
   * until ✕ (Pavan, 2026-10-14).
   */
  appliedId?: string | null;
  onClearApplied?: () => void;
  /**
   * THE STANDARD SINCE 2026-10-15 (Pavan — tried on Invoices, then
   * everywhere): an alert that FILTERS carries its count INSIDE the tag
   * pill, has no count/chevron pill and no item list, and its filter is a
   * ghost CTA beside the words — "View details" (dotted underline), which
   * becomes "✕ Clear filter" while its filter is on. An alert with no
   * filter (only items, each with its own act) keeps the count pill and
   * its list. `ctaMode={false}` restores the old anatomy.
   */
  ctaMode?: boolean;
  className?: string;
}) {
  const [at, setAt] = React.useState(0);
  const [all, setAll] = React.useState(false);
  const i = Math.min(at, Math.max(alerts.length - 1, 0));
  React.useEffect(() => {
    if (at > alerts.length - 1) setAt(Math.max(alerts.length - 1, 0));
  }, [at, alerts.length]);
  /* One alert left — nothing to lay out; back to the single banner. */
  React.useEffect(() => {
    if (alerts.length < 2) setAll(false);
  }, [alerts.length]);
  if (alerts.length === 0) return null;
  const line = { onSnooze, onDismiss, appliedId, onClearApplied, ctaMode };
  const chevron =
    "rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30";
  const textBtn =
    "flex h-6 shrink-0 items-center gap-1 rounded-sm px-1.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5";

  /* VIEW ALL — every alert its own banner, one under another; the first
     carries Collapse where the stepper was. */
  if (all) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {alerts.map((a, n) => (
          <AlertLine
            key={a.id}
            a={a}
            {...line}
            nav={
              n === 0 ? (
                <button type="button" onClick={() => setAll(false)} className={textBtn}>
                  <ChevronUp />
                  Collapse
                </button>
              ) : undefined
            }
          />
        ))}
      </div>
    );
  }

  return (
    <AlertLine
      key={alerts[i].id}
      a={alerts[i]}
      {...line}
      className={className}
      nav={
        alerts.length > 1 && (
          <>
            {/* ONE KIND AT A TIME — the Pending strip's stepper. */}
            <span className="flex shrink-0 items-center gap-0.5 text-xs tabular-nums text-muted-foreground">
              <button type="button" aria-label="Previous alert" disabled={i === 0} onClick={() => setAt(i - 1)} className={chevron}>
                <ChevronLeft className="size-3.5" />
              </button>
              {i + 1} of {alerts.length}
              <button
                type="button"
                aria-label="Next alert"
                disabled={i >= alerts.length - 1}
                onClick={() => setAt(i + 1)}
                className={chevron}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </span>
            <button type="button" onClick={() => setAll(true)} className={textBtn}>
              View all
            </button>
          </>
        )
      }
    />
  );
}

/** ONE ALERT AS A BANNER — the info-blue banner with its severity pill. */
function AlertLine({
  a,
  nav,
  onSnooze,
  onDismiss,
  appliedId,
  onClearApplied,
  ctaMode = true,
  className,
}: {
  a: BannerAlert;
  /** The stepper and View all, or Collapse — sits before snooze and ✕. */
  nav?: React.ReactNode;
  onSnooze?: (id: string, ms: number) => void;
  onDismiss?: (id: string) => void;
  appliedId?: string | null;
  onClearApplied?: () => void;
  ctaMode?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const hasItems = Boolean(a.items && a.items.length > 0);
  /* THIS ALERT WEARS THE CTA ANATOMY — only when it has a filter to apply. */
  const cta = ctaMode && Boolean(a.onApply);

  return (
    <div
      role="status"
      data-status={a.status}
      /* ALWAYS THE INFO BLUE, SOLID AND LIGHT — the pills say how serious
         (2026-10-25). */
      className={cn("flex flex-col items-stretch rounded-md border border-fp-alert-banner-rim bg-fp-alert-banner", className)}
    >
      <div className="flex min-h-11 items-center gap-2.5 px-3 py-1.5">
        {/* THE ICON RIDES IN THE TAG (Pavan, 2026-10-13); alone only when
            there is no tag. */}
        {a.tag ? (
          /* THE PILL's SHAPE AND COLOUR, laid out as a row — the DS Pill
             wraps its children in one truncating span. */
          <span
            className={cn(
              PILL_SHAPE,
              ALERT_PILL[a.status],
              "relative h-6 gap-1.5 overflow-hidden px-2 text-[11px] font-medium tracking-wide uppercase [&_svg]:size-3.5 [&_svg]:shrink-0"
            )}
          >
            {/* A BAR THROUGH THE PILL (Pavan, 2026-10-20) — the outline
                shine's sweep, on the fill, in a deeper shade of the pill.
                Every kind, not only red ("Quote waiting" too). */}
            {/* …ONLY WHILE COLLAPSED (Pavan, 2026-10-20): opened, the list
                is the attention; closed again, the sweep comes back. */}
            {!open && <OutlineShine fill color={SWEEP[a.status]} band="30%" />}
            <TriangleAlert className="relative" />
            <span className="relative">{a.tag}</span>
            {/* THE COUNT IN THE TAG — a pill inside the pill (ctaMode). */}
            {cta && a.count != null && (
              <span className={cn("relative -mr-1 ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums tracking-normal", TAG_COUNT[a.status])}>
                {a.count}
              </span>
            )}
          </span>
        ) : (
          <span className={cn("shrink-0 [&_svg]:size-4", inlineAccent({ status: a.status }))}>
            <TriangleAlert />
          </span>
        )}
        {/* LEFT — what it is, and Details right beside it (Pavan,
            2026-10-13): opening the list belongs to the words it expands. */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="flex min-w-0 items-center gap-x-2 overflow-hidden py-1 text-sm leading-normal">
            {a.onApply && !cta ? (
              <button
                type="button"
                onClick={a.onApply}
                className={cn(PRESSABLE, "min-w-0 truncate font-medium text-foreground")}
              >
                {a.title}
              </button>
            ) : (
              <span className="min-w-0 truncate font-medium text-foreground">{a.title}</span>
            )}
            {/* THE DETAIL GIVES WAY FIRST — the title is what has to be read. */}
            {a.detail && <span className="min-w-0 shrink-[2] truncate text-muted-foreground">{a.detail}</span>}
          </p>
          {/* THE COUNT IN A PILL — with the chevron that opens
              the list beside it when there is one (Pavan, 2026-10-13). */}
          {!cta && (a.count != null || hasItems) && (
            <>
              {hasItems ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? "Collapse" : "Show details"}
                  onClick={() => setOpen((o) => !o)}
                  className={cn(
                    PILL_SHAPE,
                    COUNT_PILL,
                    "relative h-6 gap-1 overflow-hidden px-2 tabular-nums outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring/50"
                  )}
                >
                  <span className="relative">{a.count ?? a.items!.length}</span>
                  <ChevronDown className={cn("relative size-3.5 transition-transform", open && "rotate-180")} />
                </button>
              ) : (
                <span className={cn(PILL_SHAPE, COUNT_PILL, "relative h-6 overflow-hidden px-2 tabular-nums")}>
                  <span className="relative">{a.count}</span>
                </span>
              )}
            </>
          )}
          {/* THE WAY BACK FROM ITS FILTER — only while this alert's filter
              is on; the banner itself stays. */}
          {/* THE FILTER AS A GHOST CTA BESIDE THE WORDS (ctaMode, Pavan,
              2026-10-15) — View details, then Clear filter. */}
          {cta && a.onApply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 gap-1 px-2 text-xs font-medium text-foreground hover:bg-foreground/5"
              onClick={appliedId === a.id && onClearApplied ? onClearApplied : a.onApply}
            >
              {appliedId === a.id && <X className="size-3.5" />}
              {appliedId === a.id ? (
                "Clear filter"
              ) : (
                /* DOTTED UNDERLINE — says it acts (Pavan, 2026-10-15). */
                <span className="underline decoration-current/50 decoration-dotted underline-offset-4">View details</span>
              )}
            </Button>
          )}
          {!cta && onClearApplied && appliedId === a.id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={onClearApplied}
            >
              <X className="size-3.5" />
              Clear filter
            </Button>
          )}
        </div>
        {/* RIGHT — the action, snooze, the stepper, and ✕ LAST: dismissing
            is the way out, so it sits at the edge (Pavan, 2026-10-13). */}
        {a.action && (
          <div className="flex shrink-0 items-center gap-2">
            <Shined>{a.action}</Shined>
          </div>
        )}

        {nav}
        {/* SNOOZE BESIDE THE STEPPER (Pavan, 2026-10-13). */}
        {onSnooze && <BannerSnooze onSnooze={(ms) => onSnooze(a.id, ms)} />}
        {onDismiss && (
          <button type="button" aria-label="Dismiss" onClick={() => onDismiss(a.id)} className={ICON_BTN}>
            <X />
          </button>
        )}
      </div>

      {open && a.items && (
        /* THE OPENED ITEMS ON WHITE (Pavan, 2026-10-20) — the content layer
           inside the banner's own coloured outline. */
        <ul className="divide-y divide-current/10 rounded-b-[inherit] border-t border-current/10 bg-fp-surface-1b px-3">
          {a.items.map((it) => (
            <li key={it.id} className="flex min-h-11 items-center gap-3 py-1.5 pl-6.5 text-sm">
              <span className="flex min-w-0 flex-1 items-center gap-x-2">
                {it.onApply ? (
                  <button type="button" onClick={it.onApply} className={cn(PRESSABLE, "shrink-0 text-foreground", it.facts && "w-44 truncate text-left")}>
                    {it.title}
                  </button>
                ) : (
                  <span className={cn("shrink-0 text-foreground", it.facts && "w-44 truncate")}>{it.title}</span>
                )}
                {it.detail && <span className="min-w-0 truncate text-muted-foreground">{it.detail}</span>}
                {/* SPREAD ACROSS THE BANNER IN EQUAL COLUMNS (Pavan, 2026-10-20)
                    — each fact left-aligned, lined up from row to row. */}
                {it.facts && (
                  <span className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-center gap-x-4">{it.facts}</span>
                )}
              </span>
              {it.action && (
                <span className="flex shrink-0 items-center gap-2">
                  <Shined>{it.action}</Shined>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
