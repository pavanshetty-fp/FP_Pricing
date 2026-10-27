import * as React from "react";
import { MapPin, Truck } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import type { PillColor } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { SHIP_TO_SITES } from "./threepl/orders";

/*
  Orders on a map — list left, plot right.

  WHY A MAP AT ALL. Every other question about an order is answered by a
  column; "what else is going out near this one" is not, because near is a
  relationship between two places and a table can only sort by one of them. A
  dispatcher deciding whether two drops can share a truck is doing geometry,
  and a list sorted by time is the wrong instrument for it.

  IT IS NOT A REAL MAP, and it does not pretend to be. There is no tile
  provider in this prototype and adding one would put a network dependency and
  an API key into a file that is meant to open from disk. What it draws is the
  geography the data actually has: every ship-to site carries its own latLng,
  so the arrangement is true. Swap the backdrop for tiles and the pins do not
  move.

  THE TWO HALVES ARE ONE SELECTION. Hovering a row lights its pin and hovering
  a pin lights its rows; clicking either opens the order.

  ONE MAP, EVERY ORDERS SCREEN. It takes `MapOrder`, not any module's row type:
  the four things a pin needs are an id, a number, a SITE and a status, and
  every orders list in the app can produce those. Forking it per module would
  mean the same screen behaving differently depending on which rail item you
  came in through, which is the one thing repeated patterns must not do.
*/

/** The least an order has to say to be a pin. Every orders list can say it. */
export interface MapOrder {
  id: string;
  /** Shown as the row's heading. */
  orderNo: string;
  /** Must match a `SHIP_TO_SITES` name, or the order is counted as unmapped. */
  site: string;
  /** The quieter second line — whose order this is. */
  subtitle: string;
  status: string;
  tone: StatusTone;
  /* A STAGE COLOUR THE USER CHOSE (Pavan, 2026-10-09) — Sales only. */
  color?: PillColor | null;
  /** Its own coordinates, for a site that is not one of `SHIP_TO_SITES`
      (the Customer Portal's ship-tos, 2026-10-13). */
  coords?: { lat: number; lng: number };
}

/*
  A TRUCK ON THE ROAD (Customer Portal, 2026-10-13 — live tracking). Drawn on
  the line from where it left to where it is going, `progress` of the way
  along; the caller moves it by handing a new progress.
*/
export interface MapTruck {
  id: string;
  /** The order it is carrying — pressing the truck opens it. */
  orderId: string;
  label: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  /** 0 at `from`, 1 at `to`. */
  progress: number;
  /** Where it left from — named beside a small mark there. */
  fromLabel?: string;
}

/** A site's own coordinates, parsed from the `lat, lng` its record carries. */
function siteCoords(shipTo: string) {
  const site = SHIP_TO_SITES.find((s) => s.name === shipTo);
  if (!site) return null;
  const [lat, lng] = site.latLng.split(",").map((n) => Number(n.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, city: site.city, state: site.state };
}

/** Percent from the left / top of the plot. Latitude runs the other way. */
function project(
  lat: number,
  lng: number,
  b: { minLat: number; maxLat: number; minLng: number; maxLng: number }
) {
  return {
    left: ((lng - b.minLng) / (b.maxLng - b.minLng)) * 100,
    top: ((b.maxLat - lat) / (b.maxLat - b.minLat)) * 100,
  };
}

const PIN_FILL: Record<string, string> = {
  success: "bg-status-success",
  processing: "bg-fp-banner-accent-caution",
  failed: "bg-status-failed",
  /* INFO IS BLUE, LIKE ITS CHIP (Pavan, 2026-10-07). It had no entry, so
     Scheduled and Dispatched fell through to neutral grey. */
  info: "bg-fp-banner-accent-info",
  neutral: "bg-muted-foreground",
};

export function OrderMapView({
  orders,
  onOpenOrder,
  hoverCard,
  trucks = [],
  minPad = 1.2,
}: {
  orders: MapOrder[];
  onOpenOrder: (id: string) => void;
  /** The pin's hover card — the orders at that site, primary details only.
      Left out, a pin has no hover card (every module before 2026-10-13). */
  hoverCard?: (rows: MapOrder[]) => React.ReactNode;
  trucks?: MapTruck[];
  /** The least margin round the pins, in degrees. 1.2 frames a region of a
      country; a customer's sites in one city want a few hundredths. */
  minPad?: number;
}) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  /* Several orders share a ship-to, so pins are grouped by site — one dot per
     site with six orders under it is a map that hides what it was opened to
     show. */
  const groups = React.useMemo(() => {
    const by = new Map<
      string,
      { lat: number; lng: number; site: string; city: string; rows: MapOrder[] }
    >();
    orders.forEach((o) => {
      const p = o.coords ? { ...o.coords, city: "" } : siteCoords(o.site);
      if (!p) return;
      const g =
        by.get(o.site) ??
        { lat: p.lat, lng: p.lng, site: o.site, city: p.city, rows: [] };
      g.rows.push(o);
      by.set(o.site, g);
    });
    return [...by.values()];
  }, [orders]);

  /* The frame is the ORDERS' OWN SPREAD, not a fixed continent: a day whose
     work is all in one valley should not be three pins in the corner of a map
     of the country. */
  const bounds = React.useMemo(() => {
    if (groups.length === 0) {
      return { minLat: 24, maxLat: 49, minLng: -125, maxLng: -67 };
    }
    /* A truck's start counts too, so its road is on the map. */
    const lats = [...groups.map((g) => g.lat), ...trucks.map((t) => t.from.lat)];
    const lngs = [...groups.map((g) => g.lng), ...trucks.map((t) => t.from.lng)];
    const padLat = Math.max(minPad, (Math.max(...lats) - Math.min(...lats)) * 0.15);
    const padLng = Math.max(minPad, (Math.max(...lngs) - Math.min(...lngs)) * 0.15);
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
    };
  }, [groups, trucks, minPad]);

  const plotted = groups.reduce((n, g) => n + g.rows.length, 0);
  const missing = orders.length - plotted;

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* ── the list ── */}
      <div className="flex min-h-0 w-[340px] shrink-0 flex-col overflow-auto rounded-md border border-border">
        {orders.map((o) => {
          const on = hovered === o.site;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onOpenOrder(o.id)}
              onMouseEnter={() => setHovered(o.site)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "flex flex-col gap-1 border-b border-border px-3 py-2.5 text-left outline-none transition-colors last:border-b-0",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                on ? "bg-selected" : "hover:bg-accent"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    on ? "text-selected-foreground" : "text-foreground"
                  )}
                >
                  {o.orderNo}
                </span>
                <StatusChip tone={o.tone} color={o.color} variant="soft">
                  {o.status}
                </StatusChip>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {o.subtitle}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{o.site}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── the plot ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-fp-surface-1a">
        {/* THE ROADS — a dashed line from where each truck left to where it
            is going, the part already driven solid. */}
        {trucks.length > 0 && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {trucks.map((t) => {
              const a = project(t.from.lat, t.from.lng, bounds);
              const b = project(t.to.lat, t.to.lng, bounds);
              const mx = a.left + (b.left - a.left) * t.progress;
              const my = a.top + (b.top - a.top) * t.progress;
              return (
                <g key={t.id} vectorEffect="non-scaling-stroke">
                  <line x1={a.left} y1={a.top} x2={b.left} y2={b.top} className="stroke-muted-foreground/50" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                  <line x1={a.left} y1={a.top} x2={mx} y2={my} className="stroke-fp-banner-accent-caution" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </svg>
        )}
        {groups.map((g) => {
          const pos = project(g.lat, g.lng, bounds);
          const on = hovered === g.site;
          const tone = g.rows[0].tone;
          const pin = (
            <button
              type="button"
              onClick={() => onOpenOrder(g.rows[0].id)}
              onMouseEnter={() => setHovered(g.site)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`${g.site}, ${g.rows.length} ${g.rows.length === 1 ? "order" : "orders"}`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-fp-surface-1a transition-all",
                    PIN_FILL[tone] ?? PIN_FILL.neutral,
                    on ? "size-7 scale-110" : "size-5"
                  )}
                >
                  {g.rows.length}
                </span>
                <span
                  className={cn(
                    "rounded-sm px-1 text-[10px] whitespace-nowrap transition-opacity",
                    on
                      ? "bg-selected text-selected-foreground opacity-100"
                      : "text-muted-foreground opacity-0"
                  )}
                >
                  {g.site}
                </span>
              </span>
            </button>
          );
          return hoverCard ? (
            <HoverCard key={g.site} openDelay={80} closeDelay={120}>
              <HoverCardTrigger asChild>{pin}</HoverCardTrigger>
              <HoverCardContent side="top" className="w-80 p-0">
                {hoverCard(g.rows)}
              </HoverCardContent>
            </HoverCard>
          ) : (
            <React.Fragment key={g.site}>{pin}</React.Fragment>
          );
        })}
        {/* WHERE THE TRUCKS LEFT FROM — one mark per place, named. */}
        {[...new Map(trucks.filter((t) => t.fromLabel).map((t) => [t.fromLabel, t])).values()].map((t) => {
          const a = project(t.from.lat, t.from.lng, bounds);
          return (
            <span
              key={`from-${t.fromLabel}`}
              style={{ left: `${a.left}%`, top: `${a.top}%` }}
              className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            >
              <span className="size-3 rounded-sm bg-foreground ring-2 ring-fp-surface-1a" />
              <span className="text-[10px] whitespace-nowrap text-muted-foreground">{t.fromLabel}</span>
            </span>
          );
        })}
        {trucks.map((t) => {
          const a = project(t.from.lat, t.from.lng, bounds);
          const b = project(t.to.lat, t.to.lng, bounds);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenOrder(t.orderId)}
              aria-label={t.label}
              title={t.label}
              style={{
                left: `${a.left + (b.left - a.left) * t.progress}%`,
                top: `${a.top + (b.top - a.top) * t.progress}%`,
              }}
              className="absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-fp-banner-accent-caution text-white shadow-md ring-2 ring-fp-surface-1a outline-none transition-[left,top] duration-1000 ease-linear focus-visible:ring-ring [&_svg]:size-3.5"
            >
              <span aria-hidden className="absolute inset-0 rounded-full bg-fp-banner-accent-caution/40 motion-safe:animate-ping" />
              <Truck className="relative" />
            </button>
          );
        })}
        {missing > 0 && (
          <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
            {missing} without a mapped site
          </span>
        )}
      </div>
    </div>
  );
}
