import * as React from "react";
import { MapPin } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { BROKER_STATUS_TONE, SHIP_TO_SITES, type BrokerOrder } from "./orders";

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
*/

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
  neutral: "bg-muted-foreground",
};

export function OrderMapView({
  orders,
  onOpenOrder,
}: {
  orders: BrokerOrder[];
  onOpenOrder: (id: string) => void;
}) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  /* Several orders share a ship-to, so pins are grouped by site — one dot per
     site with six orders under it is a map that hides what it was opened to
     show. */
  const groups = React.useMemo(() => {
    const by = new Map<
      string,
      { lat: number; lng: number; site: string; city: string; rows: BrokerOrder[] }
    >();
    orders.forEach((o) => {
      const p = siteCoords(o.shipTo);
      if (!p) return;
      const g =
        by.get(o.shipTo) ??
        { lat: p.lat, lng: p.lng, site: o.shipTo, city: p.city, rows: [] };
      g.rows.push(o);
      by.set(o.shipTo, g);
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
    const lats = groups.map((g) => g.lat);
    const lngs = groups.map((g) => g.lng);
    const padLat = Math.max(1.2, (Math.max(...lats) - Math.min(...lats)) * 0.15);
    const padLng = Math.max(1.2, (Math.max(...lngs) - Math.min(...lngs)) * 0.15);
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
    };
  }, [groups]);

  const plotted = groups.reduce((n, g) => n + g.rows.length, 0);
  const missing = orders.length - plotted;

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* ── the list ── */}
      <div className="flex min-h-0 w-[340px] shrink-0 flex-col overflow-auto rounded-md border border-border">
        {orders.map((o) => {
          const on = hovered === o.shipTo;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onOpenOrder(o.id)}
              onMouseEnter={() => setHovered(o.shipTo)}
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
                    "font-mono text-sm font-semibold",
                    on ? "text-selected-foreground" : "text-foreground"
                  )}
                >
                  {o.orderNo}
                </span>
                <StatusChip tone={BROKER_STATUS_TONE[o.status]} variant="soft">
                  {o.status}
                </StatusChip>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {o.customer.title}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{o.shipTo}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── the plot ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-fp-surface-1a">
        {groups.map((g) => {
          const pos = project(g.lat, g.lng, bounds);
          const on = hovered === g.site;
          const tone = BROKER_STATUS_TONE[g.rows[0].status];
          return (
            <button
              key={g.site}
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
