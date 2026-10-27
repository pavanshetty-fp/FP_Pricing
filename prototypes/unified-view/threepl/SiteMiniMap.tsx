import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

/*
  THE SHIP-TO IN MINIATURE (Pavan, 2026-10-27) — the board card's Delivery
  details hover card carries a small map: the ship-to's radius, and inside
  it every asset at the site at its own latitude and longitude — the ones on
  this order in violet, the rest dimmed. NO SITE PIN (Pavan, 2026-10-27):
  the radius already says where the ship-to is. Hover a dot for its name and
  coordinates.

  The same asset dots as the Customer Portal's LocationMap on the same OpenStreetMap tiles — it needs the internet; offline
  the pins still stand on a blank ground. It does not pan or zoom — it is a
  picture of where things stand, fitted to the radius — and it is built only
  once it is on screen.
*/

export interface MiniMapPoint {
  name: string;
  lat: number;
  lng: number;
  /** On this order — highlighted; the site's other assets are dimmed. */
  selected?: boolean;
}

const assetPin = L.divIcon({
  className: "",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  html: `<div class="size-2.5 rounded-full bg-fp-lane-violet ring-2 ring-white shadow"></div>`,
});
/* THE SITE'S OTHER ASSETS — there, but not on this order. */
const otherPin = L.divIcon({
  className: "",
  iconSize: [8, 8],
  iconAnchor: [4, 4],
  html: `<div class="size-2 rounded-full bg-muted-foreground opacity-50 ring-1 ring-white"></div>`,
});

const fmt = (n: number) => n.toFixed(5);

export function SiteMiniMap({
  site,
  points,
  className,
}: {
  site: { lat: number; lng: number };
  points: MiniMapPoint[];
  className?: string;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState(false);

  /* BUILT ON SIGHT — a lane can hold dozens of cards. */
  React.useEffect(() => {
    const el = box.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  const key = points.map((p) => `${p.name}${p.lat}${p.lng}`).join("|");
  React.useEffect(() => {
    if (!seen || !box.current) return;
    const m = L.map(box.current, {
      zoomControl: false,
      zoomSnap: 0.25,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    /* THE SHIP-TO'S RADIUS holds every asset on the order — the farthest
       one plus a margin, never under 100 m. The portal's geofence recipe.
       The view is fitted first: a circle needs a map with a view to draw. */
    const centre = L.latLng(site.lat, site.lng);
    const radius = Math.max(100, ...points.map((p) => centre.distanceTo([p.lat, p.lng]) + 30));
    const bounds = centre.toBounds(radius * 2);
    /* CENTRED ON THE SHIP-TO, zoomed to hold the whole radius — no animation,
       or the hover card's scale-in leaves it mid-pan. */
    const fit = () =>
      m.setView(centre, m.getBoundsZoom(bounds, false, L.point(16, 16)), { animate: false });
    fit();
    L.circle(centre, {
      radius,
      /* THE ACCENT VIOLET, READ FROM ITS TOKEN — Leaflet writes SVG
         attributes, which cannot take a CSS variable. */
      color: getComputedStyle(document.documentElement).getPropertyValue("--accent-violet").trim(),
      weight: 2,
      fillOpacity: 0.08,
      dashArray: "6 6",
      interactive: false,
    }).addTo(m);
    /* The dimmed ones first, so a highlighted dot is never under one. */
    for (const p of [...points].sort((a, b) => Number(!!a.selected) - Number(!!b.selected)))
      L.marker([p.lat, p.lng], { icon: p.selected ? assetPin : otherPin, keyboard: false })
        .bindTooltip(`${p.name} · ${fmt(p.lat)}, ${fmt(p.lng)}`, { direction: "top" })
        .addTo(m);
    /* The hover card opens with a scale-in; measure again once it settles. */
    const t = window.setTimeout(() => {
      m.invalidateSize({ pan: false });
      fit();
    }, 200);
    return () => {
      window.clearTimeout(t);
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, key, site.lat, site.lng]);

  return (
    <div
      ref={box}
      aria-label={`Map of the ship-to with ${points.length} ${points.length === 1 ? "asset" : "assets"}`}
      className={cn("isolate z-0 overflow-hidden rounded-md border border-border bg-fp-surface-1a", className)}
    />
  );
}
