import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { placeOf, reversePlace, searchPlaces, type NominatimPlace, type PlaceAddress } from "./geo";

/*
  THE SHIP-TO'S MAP (Pavan, 2026-10-13) — where the site is, found by search
  or by pressing the map, confirmed into the address fields; the address
  typed by hand moves the pin the other way. The geofence is drawn round the
  pin; the site's assets stand on it as small pins and can be dragged to
  where they really are.

  A REAL MAP, unlike the Unified View's schematic: OpenStreetMap tiles and
  its free address search (Nominatim) — no key, but it needs the internet.
  A production build would swap in a licensed provider; nothing else here
  would change.
*/

/* PINS ARE DS-COLOURED DIVS — Leaflet's own image pins break in a bundle. */
const sitePin = (pending: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `<div class="flex size-7 items-center justify-center rounded-full ${
      pending ? "bg-brand" : "bg-foreground"
    } text-white shadow-md ring-2 ring-white"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  });
const assetPin = (name: string, active = false) =>
  L.divIcon({
    className: "",
    iconSize: active ? [20, 20] : [14, 14],
    iconAnchor: active ? [10, 10] : [7, 7],
    html: `<div title="${name.replace(/"/g, "&quot;")}" class="${
      active ? "size-5 bg-brand" : "size-3.5 bg-fp-lane-violet"
    } rounded-full ring-2 ring-white shadow"></div>`,
  });

export function LocationMap({
  location,
  geofence,
  assets,
  onConfirm,
  onAssetMove,
  onPress,
  className,
}: {
  /** The site's confirmed place — the dark pin. */
  location: { lat: number; lng: number } | null;
  /** Geofence radius in metres, or null for none. */
  geofence: number | null;
  /** `active` = the asset being placed (orange, larger); `fixed` = not draggable. */
  assets: { key: string; name: string; lat: number | null; lng: number | null; active?: boolean; fixed?: boolean }[];
  onConfirm?: (p: PlaceAddress) => void;
  /**
   * PLACING AN ASSET, not finding a site (Pavan, 2026-10-13): a press goes
   * straight here — no proposed pin, no address search, no Confirm.
   */
  onPress?: (lat: number, lng: number) => void;
  onAssetMove: (key: string, lat: number, lng: number) => void;
  className?: string;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<L.Map | null>(null);
  const layers = React.useRef<{ site?: L.Marker; pending?: L.Marker; fence?: L.Circle; assets: L.Marker[] }>({
    assets: [],
  });
  const [pending, setPending] = React.useState<PlaceAddress | null>(null);
  const [resolving, setResolving] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<NominatimPlace[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [offline, setOffline] = React.useState(false);
  const onAssetMoveRef = React.useRef(onAssetMove);
  onAssetMoveRef.current = onAssetMove;
  const onPressRef = React.useRef(onPress);
  onPressRef.current = onPress;

  /* A PRESS ON THE MAP is a proposed place: pin it, then look up its address. */
  const propose = React.useCallback(async (lat: number, lng: number) => {
    setPending({ lat, lng, street: "", city: "", state: "", zip: "" });
    setResolving(true);
    try {
      const p = await reversePlace(lat, lng);
      if (p) setPending({ ...placeOf(p), lat, lng });
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setResolving(false);
    }
  }, []);

  /* ONE MAP PER MOUNT. */
  React.useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView(
      location ? [location.lat, location.lng] : [29.76, -95.37],
      location ? 16 : 10
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) =>
      onPressRef.current
        ? onPressRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)))
        : propose(e.latlng.lat, e.latlng.lng)
    );
    map.current = m;
    /* THE SHEET SLIDES IN — measure again once it has. */
    const t = window.setTimeout(() => m.invalidateSize(), 350);
    return () => {
      window.clearTimeout(t);
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* THE CONFIRMED PIN AND ITS GEOFENCE follow the record — a typed address
     moves them, and the view goes with the pin. */
  React.useEffect(() => {
    const m = map.current;
    if (!m) return;
    const l = layers.current;
    l.site?.remove();
    l.fence?.remove();
    l.site = undefined;
    l.fence = undefined;
    if (!location) return;
    l.site = L.marker([location.lat, location.lng], { icon: sitePin(false) }).addTo(m);
    if (geofence)
      l.fence = L.circle([location.lat, location.lng], {
        radius: geofence,
        /* THE LANE VIOLET'S LITERAL — Leaflet writes SVG attributes, which
           cannot read a CSS variable; the token is the same in both themes. */
        color: "#8b5cf6",
        weight: 2,
        fillOpacity: 0.08,
        dashArray: "6 6",
      }).addTo(m);
    m.setView([location.lat, location.lng], Math.max(m.getZoom(), 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new object each render is not a move
  }, [location?.lat, location?.lng, geofence]);

  /* THE PROPOSED PIN — orange until confirmed. */
  React.useEffect(() => {
    const m = map.current;
    if (!m) return;
    layers.current.pending?.remove();
    layers.current.pending = undefined;
    if (pending) {
      layers.current.pending = L.marker([pending.lat, pending.lng], { icon: sitePin(true) }).addTo(m);
      m.setView([pending.lat, pending.lng], Math.max(m.getZoom(), 16));
    }
  }, [pending?.lat, pending?.lng, pending]);

  /* THE ASSETS — small violet pins, dragged to where each one stands. */
  const assetKey = assets.map((a) => `${a.key}:${a.lat}:${a.lng}:${a.name}:${a.active}:${a.fixed}`).join("|");
  React.useEffect(() => {
    const m = map.current;
    if (!m) return;
    layers.current.assets.forEach((x) => x.remove());
    layers.current.assets = assets
      .filter((a) => a.lat !== null && a.lng !== null)
      .map((a) => {
        const mk = L.marker([a.lat!, a.lng!], {
          icon: assetPin(a.name || "Asset", a.active),
          draggable: !a.fixed,
          zIndexOffset: a.active ? 1000 : 0,
        })
          .bindTooltip(a.name || "Asset", { direction: "top", offset: [0, -8] })
          .addTo(m);
        mk.on("dragend", () => {
          const p = mk.getLatLng();
          onAssetMoveRef.current(a.key, Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
        });
        return mk;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetKey]);

  /* SEARCH, DEBOUNCED — five places at most. A picked place's name in the
     box is not a new search. */
  const picked = React.useRef<string | null>(null);
  React.useEffect(() => {
    const q = query.trim();
    if (q === picked.current) return;
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchPlaces(q, ctl.signal));
        setOffline(false);
      } catch {
        if (!ctl.signal.aborted) setOffline(true);
      } finally {
        if (!ctl.signal.aborted) setSearching(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  return (
    <div className={cn("relative isolate overflow-hidden rounded-lg border border-border", className)}>
      <div ref={box} className="size-full" />

      {/* THE SEARCH, INSIDE THE MAP (Pavan, 2026-10-13) — finding a site only. */}
      {!onPress && <div className="absolute top-2 right-2 left-14 z-[1000]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a location or address"
            aria-label="Search a location or address"
            className="h-9 bg-background pr-8 pl-8 shadow-sm"
          />
          {searching ? (
            <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )
          )}
        </div>
        {results.length > 0 && (
          <ul className="mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    const name = r.display_name.split(",").slice(0, 2).join(",");
                    picked.current = name.trim();
                    setPending(placeOf(r));
                    setResults([]);
                    setQuery(name);
                  }}
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {offline && (
          <p className="mt-1 rounded-md bg-background/95 px-2 py-1 text-xs text-muted-foreground shadow-sm">
            Location search is unavailable offline.
          </p>
        )}
      </div>}

      {/* CONFIRM — the proposed place goes into the address fields. */}
      {pending && (
        <div className="absolute right-2 bottom-6 left-2 z-[1000] flex items-center gap-3 rounded-md border border-border bg-background/95 px-3 py-2 shadow-md">
          <MapPin className="size-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {resolving
              ? "Finding the address…"
              : [pending.street, pending.city, pending.state, pending.zip].filter(Boolean).join(", ") ||
                `${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={resolving}
            onClick={() => {
              onConfirm?.(pending);
              setPending(null);
            }}
          >
            <Check />
            Confirm location
          </Button>
        </div>
      )}
    </div>
  );
}
