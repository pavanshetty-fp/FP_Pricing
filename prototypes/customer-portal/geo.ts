/*
  ADDRESS LOOKUP — OpenStreetMap's free search (Nominatim), forward and
  reverse. No key; needs the internet. A production build swaps in a
  licensed provider behind these two functions.
*/
export interface PlaceAddress {
  lat: number;
  lng: number;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

export function placeOf(p: NominatimPlace): PlaceAddress {
  const a = p.address ?? {};
  return {
    lat: Number(p.lat),
    lng: Number(p.lon),
    street: [a.house_number, a.road ?? a.pedestrian ?? a.industrial].filter(Boolean).join(" "),
    city: a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb ?? "",
    state: a.state ?? "",
    zip: a.postcode ?? "",
  };
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<NominatimPlace[]> {
  const r = await fetch(
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(q)}`,
    { signal, headers: { "Accept-Language": "en" } }
  );
  return r.ok ? r.json() : [];
}

export async function reversePlace(lat: number, lng: number, signal?: AbortSignal): Promise<NominatimPlace | null> {
  const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`, {
    signal,
    headers: { "Accept-Language": "en" },
  });
  return r.ok ? r.json() : null;
}

