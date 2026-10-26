import * as React from "react";
import { Truck } from "lucide-react";
import { SheetSection } from "@/components/side-sheet/parts";
import { formatMinutes } from "@/components/form-layout/TimeWindowSlider";
import { cn } from "@/lib/utils";
import { RecordSheet } from "../unified-view/RecordSheet";
import { formatFullDate, startOfDay } from "../unified-view/data";
import {
  DAY_TONE,
  DELIVERED,
  todayStats,
  tripProgress,
  type OrderRequest,
} from "./orders";

/*
  TODAY'S DELIVERIES — the overview cards' details (Pavan, 2026-10-13: "a
  very nice graphical representation"; more may be added).

    Orders            one stacked bar — delivered · out · yet to go — with a
                      legend that names each part, its count and share
    Delivery schedule each of today's orders as a bar across the day, from
                      its window's start to its end, in its part's colour,
                      with a line at now
    Gallons by product delivered of requested, per product: the track is
                      what was asked, the fill what has arrived

  Colours are the cards' (validated: dataviz checks, 2026-10-13); text stays
  in text tokens, and every mark has its label beside it, so nothing is
  carried by colour alone. Marks show their figures on hover.
*/

type Part = "delivered" | "out" | "pending";
const PART_LABEL: Record<Part, string> = {
  delivered: "Delivered",
  out: "Out for delivery",
  pending: "Yet to be delivered",
};
const partOf = (r: OrderRequest): Part =>
  DELIVERED.includes(r.status) ? "delivered" : r.status === "Out for delivery" ? "out" : "pending";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function OrdersSplit({ st }: { st: ReturnType<typeof todayStats> }) {
  const parts: { key: Part; n: number }[] = [
    { key: "delivered", n: st.delivered },
    { key: "out", n: st.out },
    { key: "pending", n: st.pending },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">{st.due}</span>
        <span className="text-sm text-muted-foreground">{st.due === 1 ? "order" : "orders"} today</span>
      </p>
      {/* PART TO WHOLE — one bar, a 2px gap between parts. */}
      <div className="flex h-3 w-full gap-0.5">
        {parts
          .filter((p) => p.n > 0)
          .map((p) => (
            <span
              key={p.key}
              title={`${PART_LABEL[p.key]}: ${p.n} (${pct(p.n, st.due)}%)`}
              className={cn("h-full rounded-sm", DAY_TONE[p.key])}
              style={{ flexGrow: p.n, flexBasis: 0 }}
            />
          ))}
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <div key={p.key} className="flex flex-col gap-1 rounded-lg bg-fp-surface-1a px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className={cn("size-2 rounded-full", DAY_TONE[p.key])} />
              {PART_LABEL[p.key]}
            </dt>
            <dd className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-foreground">{p.n}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{pct(p.n, st.due)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Schedule({ todays }: { todays: OrderRequest[] }) {
  const rows = [...todays].sort((a, b) => a.windowStart - b.windowStart);
  /* The day's frame: the earliest window's hour to the latest's, padded. */
  const from = Math.max(0, Math.floor(Math.min(...rows.map((r) => r.windowStart), 8 * 60) / 120) * 120);
  const to = Math.min(24 * 60, Math.ceil(Math.max(...rows.map((r) => r.windowEnd), 18 * 60) / 120) * 120);
  const at = (m: number) => `${((m - from) / (to - from)) * 100}%`;
  const ticks: number[] = [];
  for (let m = from; m <= to; m += 120) ticks.push(m);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const short = (m: number) => formatMinutes(m).replace(":00", "").replace(" ", "").toLowerCase();
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3">
      {/* the hour scale */}
      <span />
      <div className="relative mb-2 h-4">
        {ticks.map((m) => (
          <span
            key={m}
            className="absolute -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
            style={{ left: at(m) }}
          >
            {short(m)}
          </span>
        ))}
      </div>
      {rows.map((r) => {
        const part = partOf(r);
        return (
          <React.Fragment key={r.id}>
            <span className="flex min-w-0 flex-col justify-center py-1.5">
              <span className="truncate text-sm font-medium text-foreground">{r.requestNo}</span>
              <span className="truncate text-xs text-muted-foreground">{r.shipTo}</span>
            </span>
            <div className="relative border-l border-border">
              {/* recessive hour lines */}
              {ticks.map((m) => (
                <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-border/60" style={{ left: at(m) }} />
              ))}
              {nowMin > from && nowMin < to && (
                <span aria-hidden className="absolute inset-y-0 z-10 w-px bg-foreground" style={{ left: at(nowMin) }} />
              )}
              {part === "out" && r.trip ? (
                /* ON THE ROAD (Pavan, 2026-10-13) — the window as a track,
                   driven so far in violet, the truck where it is, and its
                   ETA after the window. */
                (() => {
                  const p = tripProgress(r.trip, Date.now());
                  const at2 = r.windowStart + p * (r.windowEnd - r.windowStart);
                  const eta = new Date(r.trip.eta);
                  const etaText = formatMinutes(eta.getHours() * 60 + eta.getMinutes());
                  return (
                    <>
                      <span
                        title={`${r.requestNo} · ${r.trip.truck} · ETA ${etaText}`}
                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-fp-lane-violet/25"
                        style={{ left: at(r.windowStart), width: `calc(${at(r.windowEnd)} - ${at(r.windowStart)})` }}
                      />
                      <span
                        aria-hidden
                        className={cn("absolute top-1/2 h-3 -translate-y-1/2 rounded-sm", DAY_TONE.out)}
                        style={{ left: at(r.windowStart), width: `calc(${at(at2)} - ${at(r.windowStart)})` }}
                      />
                      <span
                        aria-hidden
                        className="absolute top-1/2 z-20 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-fp-lane-violet text-white shadow-sm ring-2 ring-fp-surface-1b [&_svg]:size-3.5"
                        style={{ left: at(at2) }}
                      >
                        <Truck />
                      </span>
                      <span
                        className="absolute top-1/2 ml-2 -translate-y-1/2 text-xs font-medium whitespace-nowrap text-foreground"
                        style={{ left: at(r.windowEnd) }}
                      >
                        ETA {etaText}
                      </span>
                    </>
                  );
                })()
              ) : (
                <span
                  title={`${r.requestNo} · ${PART_LABEL[part]} · ${formatMinutes(r.windowStart)} – ${formatMinutes(r.windowEnd)}`}
                  className={cn("absolute top-1/2 h-3 -translate-y-1/2 rounded-sm", DAY_TONE[part])}
                  style={{ left: at(r.windowStart), width: `calc(${at(r.windowEnd)} - ${at(r.windowStart)})` }}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
      {/* NOW — one line down the whole schedule. */}
      {nowMin > from && nowMin < to && (
        <>
          <span />
          <div className="relative h-5">
            <span
              className="absolute -translate-x-1/2 text-[11px] font-medium text-foreground"
              style={{ left: at(nowMin) }}
            >
              Now · {formatMinutes(nowMin)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Products({ st }: { st: ReturnType<typeof todayStats> }) {
  const max = Math.max(1, ...st.products.map((p) => p.requested));
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {st.galDelivered.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">
          of {st.galRequested.toLocaleString()} gal delivered
        </span>
        {st.topOff > 0 && <span className="text-sm text-muted-foreground">· {st.topOff} top off</span>}
      </p>
      <ul className="flex flex-col gap-3">
        {st.products.map((p) => (
          <li key={p.product} className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-3">
            <span className="truncate text-sm text-foreground">{p.product}</span>
            {/* THE TRACK IS WHAT WAS ASKED, the fill what has arrived — the
                tracks share one scale, so products compare by length. */}
            <span className="h-2.5 w-full">
              <span
                className="block h-full overflow-hidden rounded-sm bg-muted"
                style={{ width: `${Math.max(2, (p.requested / max) * 100)}%` }}
                title={`${p.product}: ${p.delivered.toLocaleString()} of ${p.requested.toLocaleString()} gal`}
              >
                <span
                  className={cn("block h-full rounded-sm", DAY_TONE.delivered)}
                  style={{ width: `${pct(p.delivered, p.requested)}%` }}
                />
              </span>
            </span>
            <span className=" text-sm whitespace-nowrap tabular-nums text-foreground">
              {p.delivered.toLocaleString()}{" "}
              <span className="text-muted-foreground">of {p.requested.toLocaleString()} gal</span>
              {p.topOff > 0 && <span className="text-muted-foreground"> · {p.topOff} top off</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodaySheet({
  rows,
  about = "orders",
  open,
  onOpenChange,
}: {
  rows: OrderRequest[];
  /** ONE SHEET PER TILE (Pavan, 2026-10-26): today's orders — the split
      and the schedule — or today's gallons, by product. */
  about?: "orders" | "gallons";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const st = todayStats(rows);
  return (
    <RecordSheet
      /* WIDTH FROM ITS TABLES (Pavan, 2026-10-15): no table — counts, a
         schedule timeline and product bars — so the form's 600. */
      size="form"
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editTitle={about === "orders" ? "Today’s orders" : "Gallons to be delivered today"}
      createTitle=""
      createAction=""
      headerSubtitle={formatFullDate(startOfDay(new Date()))}
      showCancel={false}
      onSubmit={() => {}}
      footerPrimary={null}
    >
      {about === "orders" ? (
        <>
          <SheetSection title="Orders">
            <OrdersSplit st={st} />
          </SheetSection>
          <SheetSection title="Delivery schedule">
            {st.todays.length ? (
              <Schedule todays={st.todays} />
            ) : (
              <p className="text-sm text-muted-foreground">No orders today.</p>
            )}
          </SheetSection>
        </>
      ) : (
        <SheetSection title="Gallons by product">
          <Products st={st} />
        </SheetSection>
      )}
    </RecordSheet>
  );
}
