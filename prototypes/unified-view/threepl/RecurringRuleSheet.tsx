import * as React from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CELL, RecordSheet } from "../RecordSheet";
import { DATE_FMT, MONEY, dateKeyOf, startOfDay } from "../data";
import { BROKER_STATUS_TONE } from "./orders";
import { VENDORS } from "./vendors";
import {
  editDelivery,
  monthGrid,
  ruleGallons,
  ruleSentence,
  type DeliveryPatch,
  type DeliveryState,
  type RecurringRule,
  type RuleDelivery,
} from "./recurringRules";
import { RecurringDeliverySheet } from "./RecurringDeliverySheet";
import { SERIES_STATUS_MEANING, type SeriesStatus } from "./recurring";
import { statusTones } from "../statusKind";

/*
  THE RULE SHEET — V1's record, opened from the Recurring Orders list.

  THE CALENDAR IS THE FIRST CARD, and that ordering is the argument. A rule is a
  claim about DATES, and every question anyone brings to one is a date question:
  when is the next drop, did last Thursday go out, why is there nothing in the
  first week of November. A stack of field cards answers none of those; a month
  grid answers all three at a glance.

  FOUR STATES, AND THE FOURTH IS THE POINT.

    Delivered   it ran. Carries its order number and where the money got to.
    Created     an order exists and the work is ahead of us.
    Scheduled   THE RULE WANTS THIS DATE AND NOBODY HAS CUT AN ORDER FOR IT.
    Skipped     the rule wanted it; something stopped it.

  Only a rule can draw `scheduled`. In the parent/child model a date with no
  order behind it does not exist anywhere — the calendar would simply end a
  month out, and a broker asking "does this run through December" would have no
  way to find out but arithmetic. That is the clearest single thing this sheet
  shows that V2 cannot.

  TWEAKED IS A LABEL, NOT A STATE. A delivery can be created AND edited, or
  delivered AND edited. It is orthogonal, so it renders as a badge on the cell
  rather than as a fifth colour — and it is worth showing at all because a
  delivery that no longer matches the rule that made it is exactly the thing
  somebody is about to be surprised by.

  NO SAVE, NO CANCEL. Side sheets autosave, creating or editing, everywhere in
  this app.
*/

const WEEKDAY_HEADS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});



const DASH = "—";

/** Four tones, four states — and unlike the series words, these map cleanly. */
const STATE_TONE = statusTones<DeliveryState>({
  delivered: "success",
  /* The order exists and is on its way through. */
  created: "info",
  /* "Not created yet" — a date on a plan, not yet a state. */
  scheduled: "neutral",
  /* Skipped by decision. An absence, not a fault. */
  skipped: "neutral",
});

const STATE_LABEL: Record<DeliveryState, string> = {
  delivered: "Delivered",
  created: "Order created",
  scheduled: "Not created yet",
  skipped: "Skipped",
};

const SERIES_TONE = statusTones<SeriesStatus>({
  /* Set up, not yet running. True, and asks nothing. */
  Upcoming: "info",
  /* Running. Asks nothing — a series being live is not an achievement. */
  Active: "info",
  /* Waiting on somebody to resume it. NOT red: pausing is a decision. */
  Paused: "caution",
  Canceled: "neutral",
  Ended: "neutral",
  Expired: "neutral",
});

/**
 * The seam between what has run and what is coming — four behind, eight ahead.
 * A rule holds a year of dates, so both "oldest first" and "newest first" open
 * on a screenful of rows where nothing has happened.
 */
function aroundToday(
  deliveries: RuleDelivery[],
  todayKey: string
): RuleDelivery[] {
  const i = deliveries.findIndex((d) => d.dateKey >= todayKey);
  const at = i === -1 ? deliveries.length : i;
  return deliveries.slice(Math.max(0, at - 4), at + 8);
}

/* ---------------------------------------------------------------------------
 * Card chrome — shared by every card in the sheet
 * ------------------------------------------------------------------------ */

function Card({
  title,
  aside,
  flush,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  /**
   * DROPS THE BODY'S PADDING so the content runs to the card's own edges.
   *
   * For content that is ITSELF a bordered grid — the calendar. Nesting one
   * bordered box 16px inside another draws two lines to say one thing, and the
   * gap between them belongs to neither: the card's edge is already the
   * calendar's edge, so the calendar should use it.
   */
  flush?: boolean;
  children: React.ReactNode;
}) {
  /*
    SHRINK-0, AND IT IS NOT COSMETIC. The sheet body is a flex column, so a card
    with no explicit basis is free to be squeezed below its content height. It
    used to overflow visibly and read as correct; the moment `overflow-hidden`
    arrived — needed so the flush calendar clips to the card's rounded corners —
    the squeeze started clipping instead, and four cards rendered as headers
    with nothing under them.
  */
  return (
    <section className="shrink-0 overflow-hidden rounded-md border border-fp-outline-1">
      <header className="flex items-center justify-between gap-3 border-b border-fp-outline-1 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {aside}
      </header>
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Fields({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-3 gap-x-6 gap-y-4">{children}</dl>;
}

/* ---------------------------------------------------------------------------
 * The calendar
 * ------------------------------------------------------------------------ */

function DayCell({
  day,
  inMonth,
  isToday,
  delivery,
  onOpen,
}: {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  delivery: RuleDelivery | null;
  onOpen?: () => void;
}) {
  /* A CELL WITH A DELIVERY IS A CONTROL; an empty one is not. The whole grid
     being clickable would promise a sheet behind every square, and five of
     seven squares in a week have nothing to open. */
  const pressable = Boolean(delivery && inMonth && onOpen);

  const body = (
    <div
      className={cn(
        "flex h-[92px] min-w-0 flex-col gap-1 border-b border-r border-fp-outline-1 p-2 text-left",
        !inMonth && "bg-fp-surface-1b/40",
        delivery && inMonth && "bg-fp-surface-1b",
        pressable && "transition-colors hover:bg-fp-row-hover"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-xs tabular-nums",
            inMonth ? "text-foreground" : "text-muted-foreground/50",
            /* TODAY IS A RING, NOT A FILL. A filled day competes with the
               delivery states for the same square inch, and the question
               "what is on this date" beats "which date is it". */
            isToday && "bg-primary text-primary-foreground"
          )}
        >
          {day}
        </span>
        {delivery && inMonth && (
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              delivery.state === "delivered" && "bg-status-success",
              delivery.state === "created" && "bg-status-processing",
              delivery.state === "scheduled" && "bg-muted-foreground",
              delivery.state === "skipped" && "bg-status-failed"
            )}
          />
        )}
      </div>

      {delivery && inMonth && (
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          {/* THE ORDER NUMBER IS THE CELL'S CONTENT. It is what a broker reads
              a date to find — the thing they will paste into a search box or
              read down a phone.

              A DATE WITH NO NUMBER GETS ONE LINE, NOT TWO. "Not created yet"
              IS the whole answer for that cell, and printing it as both the
              number and the state said the same thing twice in a 92px box. */}
          {delivery.orderNo ? (
            <>
              <span className="truncate text-xs tabular-nums text-foreground">
                {delivery.orderNo}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {STATE_LABEL[delivery.state]}
              </span>
            </>
          ) : (
            <span className="truncate text-xs text-muted-foreground">
              {STATE_LABEL[delivery.state]}
            </span>
          )}
          {delivery.tweak && (
            <Badge
              variant="secondary"
              className="mt-0.5 h-4 w-fit px-1 text-[10px] font-normal"
            >
              Tweaked
            </Badge>
          )}
        </div>
      )}
    </div>
  );

  const shell = pressable ? (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        delivery?.orderNo
          ? `Open order ${delivery.orderNo}`
          : `Open the delivery scheduled for day ${day}`
      }
      className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {body}
    </button>
  ) : (
    body
  );

  /* The tweak's DETAIL lives on hover. The cell has room for the fact that
     something changed, not for what; and "what" is a sentence, not a chip. */
  if (delivery?.tweak && inMonth) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(!pressable && "cursor-default")}>{shell}</div>
        </TooltipTrigger>
        <TooltipContent>{delivery.tweak}</TooltipContent>
      </Tooltip>
    );
  }
  return shell;
}

function CalendarCard({
  rule,
  onOpenDelivery,
}: {
  rule: RecurringRule;
  onOpenDelivery: (dateKey: string) => void;
}) {
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const todayKey = dateKeyOf(today);

  /* Opens on the month the next delivery is in — which is the month somebody
     opening a rule is nearly always asking about. */
  const firstNext = rule.nextKey ?? rule.deliveries[0]?.dateKey ?? todayKey;
  const [cursor, setCursor] = React.useState(() => {
    const [y, m] = firstNext.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const cells = React.useMemo(
    () => monthGrid(rule, cursor.year, cursor.month),
    [rule, cursor]
  );

  const step = (n: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const inMonth = cells.filter((c) => c.inMonth && c.delivery);
  const created = inMonth.filter((c) => c.delivery?.orderNo).length;

  return (
    <Card
      title="Schedule"
      flush
      aside={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => step(-1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[128px] text-center text-sm font-medium tabular-nums text-foreground">
            {MONTH_FMT.format(new Date(cursor.year, cursor.month, 1))}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => step(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      }
    >
      {/* THE CARD'S BORDER IS THE CALENDAR'S BORDER. The grid used to sit in a
          second bordered box inset 16px inside this one — two lines saying one
          thing, with a strip of nothing between them. The cells keep their own
          right and bottom hairlines; the Saturday column drops its right one so
          it does not double the card's edge, and the last row's bottom hairline
          becomes the rule above the legend. */}
      <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
          {WEEKDAY_HEADS.map((w) => (
            <div
              key={w}
              className="border-b border-r border-fp-outline-1 bg-fp-table-header px-2 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {w}
            </div>
          ))}
          {cells.map((c) => (
            <DayCell
              key={c.dateKey}
              day={c.date.getDate()}
              inMonth={c.inMonth}
              isToday={c.dateKey === todayKey}
              delivery={c.delivery}
              onOpen={() => onOpenDelivery(c.dateKey)}
            />
          ))}
      </div>

      {/* THE LEGEND SAYS WHAT THE COLOURS MEAN AND THE LINE UNDER IT SAYS WHAT
          THE MONTH ADDS UP TO. Four dots with no count is a key to a chart
          nobody has read yet. It carries the padding the card body gave up. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-3">
        {(
          ["delivered", "created", "scheduled", "skipped"] as DeliveryState[]
        ).map((s) => (
          <span
            key={s}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                s === "delivered" && "bg-status-success",
                s === "created" && "bg-status-processing",
                s === "scheduled" && "bg-muted-foreground",
                s === "skipped" && "bg-status-failed"
              )}
            />
            {STATE_LABEL[s]}
          </span>
        ))}
      </div>
      <p className="px-4 pb-4 pt-2 text-xs text-muted-foreground">
        {inMonth.length} {inMonth.length === 1 ? "delivery" : "deliveries"} this
        month · {created} with an order cut
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * The sheet
 * ------------------------------------------------------------------------ */

export function RecurringRuleSheet({
  rule,
  open,
  onOpenChange,
  onChange,
}: {
  rule: RecurringRule | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Edits made to ONE delivery, handed back up. Never touches the rule. */
  onChange: (next: RecurringRule) => void;
}) {
  /* WHICH DAY IS OPEN, held by date rather than by object — an edit replaces
     the delivery, and a stale object would keep the second sheet showing the
     values the reader has just changed. A move replaces the key too, which is
     why the patch handler re-points it. */
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  if (!rule) return null;

  const patch = (dateKey: string, p: DeliveryPatch) => {
    onChange(editDelivery(rule, dateKey, p));
    if (p.dateKey && p.dateKey !== dateKey) setOpenKey(p.dateKey);
  };

  const openDelivery =
    rule.deliveries.find((d) => d.dateKey === openKey) ?? null;

  const vendor = VENDORS.find((v) => v.id === rule.vendorId) ?? null;
  const gal = ruleGallons(rule);
  const hasLoadOrder = (rule.loadOrder?.length ?? 0) > 0;

  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): lines = product pick, asset
         name, quantity; load order = product, terminal, supplier, loading
         account (picks); deliveries = date, order # (name), state and status,
         what changed (text). Deliveries is the widest. */
      fit={{
        tables: [
          [CELL.pick, CELL.name, CELL.number],
          [CELL.pick, CELL.pick, CELL.pick, CELL.pick],
          [CELL.date, CELL.name, CELL.status, CELL.status, CELL.text],
        ],
      }}
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={`Recurring rule ${rule.ruleNo}`}
      createTitle="New recurring rule"
      createAction="Create rule"
      onSubmit={() => undefined}
      /* AUTOSAVE — no Save, no Cancel. The footer carries the sentence the
         rule amounts to, because that is what a reader checks a schedule in. */
      showCancel={false}
      footerPrimary={null}
      footerAside={
        <span className="text-sm text-muted-foreground">
          {ruleSentence(rule)}
        </span>
      }
      headerAside={
        <StatusChip tone={SERIES_TONE[rule.status]} variant="soft">
          {rule.status}
        </StatusChip>
      }
      headerSubtitle={
        <span className="text-sm text-muted-foreground">
          {rule.customer.title} · {rule.shipTo}
        </span>
      }
    >
      {rule.stalledReason && (
        <div className="flex items-center gap-2 rounded-md border border-fp-outline-1 bg-fp-surface-1b px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          <span>{rule.stalledReason}</span>
          <span className="ml-auto text-xs">
            {SERIES_STATUS_MEANING[rule.status]}
          </span>
        </div>
      )}

      <CalendarCard rule={rule} onOpenDelivery={setOpenKey} />

      <Card title="Customer details">
        <Fields>
          <Field label="Customer">{rule.customer.title}</Field>
          <Field label="ERP ID">{rule.customer.description}</Field>
          <Field label="Ship to">{rule.shipTo}</Field>
        </Fields>
      </Card>

      <Card
        title="Delivery details"
        aside={
          <span className="text-xs tabular-nums text-muted-foreground">
            {gal > 0 ? `${gal.toLocaleString()} gal per delivery` : "Top-off"}
          </span>
        }
        flush
      >
        {/* THE CARD IS FLUSH FOR THE TABLE, so the fields above it bring back
            the inset the body gave up. */}
        <div className="p-4">
          <Fields>
            <Field label="Assets">
              {/* NOT MANDATORY, so an empty list is an ANSWER. "Any" is what
                  the rule actually means; an em-dash reads as a field nobody
                  filled in. */}
              {rule.assets.length > 0 ? (
                rule.assets.join(", ")
              ) : (
                <span className="text-muted-foreground">
                  Any — decided per delivery
                </span>
              )}
            </Field>
          </Fields>
        </div>

        <div className="overflow-hidden border-t border-fp-outline-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Product
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Asset
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Quantity (gal)
                </th>
              </tr>
            </thead>
            <tbody>
              {rule.lines.map((l, k) => (
                <tr key={k} className="border-b border-fp-outline-1 last:border-0">
                  <td className="px-3 py-2.5 text-foreground">{l.product}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {l.asset}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground">
                    {l.topOff ? (
                      <Pill>Top off</Pill>
                    ) : (
                      (l.gal ?? 0).toLocaleString()
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Vendor details"
        aside={
          <span className="text-xs text-muted-foreground">
            Load order {hasLoadOrder ? "with us" : "with the partner"}
          </span>
        }
        flush
      >
        {/* THE CARD IS FLUSH FOR THE TABLE, so the fields bring their own
            inset back. */}
        <div className="p-4">
          <Fields>
            <Field label="Partner">
              {vendor?.name ?? (
                <span className="text-muted-foreground">Not assigned</span>
              )}
            </Field>
            <Field label="Point of contact">
              {rule.vendorPoc ?? <span className="text-muted-foreground">{DASH}</span>}
            </Field>
            <Field label="Load order responsibility">
              {/* THE Y/N IS THE QUESTION "WHO BUYS THE PRODUCT", and the three
                  fields below only exist when the answer is us. Rendering them
                  empty on a partner-supplied rule would be three dead fields
                  asking a question that does not apply. */}
              {hasLoadOrder ? "Yes — we buy the product" : "No — partner supplies"}
            </Field>
          </Fields>
        </div>

        {hasLoadOrder && (
          <div className="overflow-hidden border-t border-fp-outline-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                  {["Product", "Terminal", "Supplier", "Loading account"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rule.loadOrder!.map((r, k) => (
                  <tr
                    key={k}
                    className="border-b border-fp-outline-1 last:border-0"
                  >
                    <td className="px-3 py-2.5 text-foreground">{r.product}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.terminal}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.supplier}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.loadingAccount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Pricing"
        aside={
          <span className="text-xs text-muted-foreground">Per delivery</span>
        }
      >
        <Fields>
          <Field label="Vendor pricing">
            {rule.vendorPrice !== null ? (
              <span className="tabular-nums">
                {MONEY(rule.vendorPrice)}
              </span>
            ) : (
              <span className="text-muted-foreground">Not priced yet</span>
            )}
          </Field>
          <Field label="Customer pricing">
            {rule.customerPrice !== null ? (
              <span className="tabular-nums">
                {MONEY(rule.customerPrice)}
              </span>
            ) : (
              <span className="text-muted-foreground">Not priced yet</span>
            )}
          </Field>
          <Field label="Margin">
            {/* BOTH SIDES OR NOTHING. A margin computed against a missing
                price is the rule's whole revenue, which is a number nobody
                should be shown. */}
            {rule.vendorPrice !== null && rule.customerPrice !== null ? (
              <span className="tabular-nums">
                {MONEY(rule.customerPrice - rule.vendorPrice)}
              </span>
            ) : (
              <span className="text-muted-foreground">{DASH}</span>
            )}
          </Field>
        </Fields>
      </Card>

      {/* AROUND TODAY, NOT NEWEST FIRST. The rule knows a year of dates, so
          "newest" is next September — a screenful of rows that say nothing has
          happened yet. What a reader wants is the seam: the last few that ran
          and the next few that will. */}
      <Card
        title="Deliveries"
        aside={
          <span className="text-xs text-muted-foreground">
            The last few and the next few
          </span>
        }
        flush
      >
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fp-outline-1 bg-fp-table-header">
                {["Date", "Order #", "State", "Status", "Changed"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aroundToday(rule.deliveries, dateKeyOf(startOfDay(new Date())))
                .map((d) => (
                  <tr
                    key={d.dateKey}
                    className="border-b border-fp-outline-1 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-foreground">
                      {DATE_FMT.format(new Date(`${d.dateKey}T00:00:00`))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
                      {d.orderNo ?? DASH}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <StatusChip tone={STATE_TONE[d.state]} variant="soft">
                        {STATE_LABEL[d.state]}
                      </StatusChip>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {d.status ? (
                        <StatusChip
                          tone={BROKER_STATUS_TONE[d.status]}
                          variant="text"
                        >
                          {d.status}
                        </StatusChip>
                      ) : (
                        <span className="text-muted-foreground">{DASH}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {d.tweak ?? DASH}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* THE SECOND SHEET, STACKED. It opens over this one rather than
          replacing it, because the calendar is the context for every change
          made in there — closing it puts the reader back on the month they
          were reading, not back on the list. */}
      <RecurringDeliverySheet
        rule={rule}
        delivery={openDelivery}
        open={openDelivery !== null}
        onOpenChange={(v) => !v && setOpenKey(null)}
        onPatch={patch}
      />
    </RecordSheet>
  );
}
