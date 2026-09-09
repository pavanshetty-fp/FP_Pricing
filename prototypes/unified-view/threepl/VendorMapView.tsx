import * as React from "react";
import { MapPin } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { PLACES, daysFromToday } from "./directoryCore";
import type { Vendor } from "./vendors";

/*
  Vendors on a map — list left, plot right.

  WHY A MAP AT ALL. Every other question about a vendor is answered by a
  column; "who is near this job" is not, because near is a relationship between
  two places and a table can only sort by one of them. A dispatcher looking for
  cover in Bakersfield is doing geometry, and a list of eighty rows sorted by
  name is the wrong instrument for it.

  IT IS NOT A REAL MAP, and it does not pretend to be. There is no tile
  provider in this prototype and adding one would put a network dependency and
  an API key into a file that is meant to open from disk. What this draws is
  the geography the data actually has: the seed's `PLACES` are real cities with
  real coordinates, so the plot is a true relative arrangement of the west
  coast — Fresno is south of Sacramento and inland of Salinas here, because it
  is. Swap the backdrop for tiles and the pins do not move.

  THE TWO HALVES ARE ONE SELECTION. Hovering a row lights its pin and hovering
  a pin lights its row; clicking either opens the vendor. A map beside a list
  that do not know about each other are two things on a screen, not a view.
*/

/** Latitude/longitude bounds of the seeded geography, with a little air. */
const BOUNDS = (() => {
  const lats = PLACES.map((p) => p.lat);
  const lngs = PLACES.map((p) => p.lng);
  const pad = 1.2;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
})();

/** A vendor's own city, from the `City, ST` its record carries. */
function placeOf(v: Vendor) {
  const city = (v.city ?? v.base.split(",")[0] ?? "").trim();
  return PLACES.find((p) => p.city === city) ?? null;
}

/** Percent from the left / top of the plot. Latitude runs the other way. */
function project(lat: number, lng: number) {
  return {
    left: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100,
    top: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100,
  };
}

/**
 * A pin's colour says whether the vendor is USABLE, which is the only thing
 * worth colouring on a map somebody opens to find cover: inactive or lapsed is
 * the answer that changes what they do next.
 */
function toneOf(v: Vendor): "success" | "processing" | "failed" | "neutral" {
  if (!v.active) return "neutral";
  const days = daysFromToday(v.complianceValidTo);
  if (days !== null && days < 0) return "failed";
  if (v.availabilityStatus !== "Available") return "processing";
  return "success";
}

const PIN_FILL: Record<string, string> = {
  success: "bg-status-success",
  processing: "bg-fp-banner-accent-caution",
  failed: "bg-status-failed",
  neutral: "bg-muted-foreground",
};

export function VendorMapView({
  vendors,
  onOpenVendor,
}: {
  vendors: Vendor[];
  onOpenVendor: (v: Vendor) => void;
}) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  /* Several vendors share a city, so pins are grouped by place and fanned —
     one dot per city with eight carriers under it is a map that hides the
     thing it was opened to show. */
  const groups = React.useMemo(() => {
    const by = new Map<string, { lat: number; lng: number; city: string; rows: Vendor[] }>();
    vendors.forEach((v) => {
      const p = placeOf(v);
      if (!p) return;
      const key = p.city;
      const g = by.get(key) ?? { lat: p.lat, lng: p.lng, city: p.city, rows: [] };
      g.rows.push(v);
      by.set(key, g);
    });
    return [...by.values()];
  }, [vendors]);

  const plotted = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* ── the list ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 w-[340px] shrink-0 flex-col overflow-hidden rounded-md border border-fp-outline-1">
        <div className="shrink-0 border-b border-fp-outline-1 bg-fp-table-header px-3 py-2 text-xs font-medium text-muted-foreground">
          {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}
          {plotted < vendors.length && ` · ${vendors.length - plotted} without a mapped city`}
        </div>
        <ul className="min-h-0 flex-1 overflow-auto">
          {vendors.map((v) => {
            const p = placeOf(v);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHovered(v.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(v.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onOpenVendor(v)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-fp-outline-1 px-3 py-2.5 text-left outline-none transition-colors last:border-b-0",
                    "hover:bg-fp-row-hover focus-visible:bg-fp-row-hover",
                    hovered === v.id && "bg-fp-row-hover"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn("size-2 shrink-0 rounded-full", PIN_FILL[toneOf(v)])}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {v.name}
                    </span>
                  </span>
                  <span className="truncate pl-4 text-xs text-muted-foreground">
                    {p ? v.base : `${v.base} · not on the map`} ·{" "}
                    {v.businessLines.join(", ") || "no business lines"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── the plot ─────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-fp-outline-1 bg-fp-board-lane">
        {/* A GRATICULE, NOT A DECORATION. Evenly spaced lines are what tells
            the eye this is a coordinate space rather than a diagram; without
            them the pins read as an arbitrary scatter. */}
        <svg aria-hidden className="absolute inset-0 size-full">
          <defs>
            <pattern id="fp-map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-fp-outline-1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fp-map-grid)" />
        </svg>

        {groups.map((g) => {
          const pos = project(g.lat, g.lng);
          return (
            <div
              key={g.city}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              <div className="flex flex-col items-center gap-1">
                {/* The carriers in this city, fanned so each is its own target. */}
                <div className="flex max-w-[168px] flex-wrap justify-center gap-1">
                  {g.rows.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      title={`${v.name} — ${v.base}`}
                      aria-label={`${v.name}, ${v.base}`}
                      onMouseEnter={() => setHovered(v.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(v.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => onOpenVendor(v)}
                      className={cn(
                        "grid size-5 place-items-center rounded-full border-2 border-fp-surface-1b outline-none transition-transform",
                        PIN_FILL[toneOf(v)],
                        "hover:scale-125 focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-ring/50",
                        hovered === v.id && "scale-150 ring-2 ring-ring/50"
                      )}
                    >
                      <MapPin className="size-2.5 text-fp-surface-1b" />
                    </button>
                  ))}
                </div>
                <span className="rounded-sm bg-fp-surface-1b/90 px-1.5 text-[11px] font-medium text-foreground">
                  {g.city}
                  <span className="ml-1 text-muted-foreground">{g.rows.length}</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* THE KEY IS PART OF THE MAP. Four colours with no legend is a puzzle. */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-fp-outline-1 bg-fp-surface-1b/95 px-3 py-2">
          {(
            [
              ["success", "Available"],
              ["processing", "Limited or unavailable"],
              ["failed", "Compliance expired"],
              ["neutral", "Inactive"],
            ] as const
          ).map(([tone, label]) => (
            <span key={tone} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className={cn("size-2 rounded-full", PIN_FILL[tone])} />
              {label}
            </span>
          ))}
        </div>

        {vendors.length === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <StatusChip tone="neutral" variant="soft">
              No vendors match the filters applied
            </StatusChip>
          </div>
        )}
      </div>
    </div>
  );
}
