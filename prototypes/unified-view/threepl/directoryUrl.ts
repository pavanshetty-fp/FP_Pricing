/*
  The Directory's list state, in the address bar.

  WHY IT IS WORTH DOING IN A PROTOTYPE. Three of the reference behaviours only
  exist if the URL carries the state: a filtered list that survives a reload, a
  link somebody can paste into a ticket, and — the one people actually notice —
  coming back from a record and finding the list exactly as it was left, on the
  right page, with the same sort and the same filters.

  WRITES ARE `replaceState`, NOT `pushState`. Typing in a search box would
  otherwise stack thirty history entries and make Back useless. The one thing
  that DOES push is opening a record, because Back from a record should return
  to the list — and that push is the screen's call, not this module's.

  UNKNOWN PARAMS ARE LEFT ALONE. The prototype ships as one HTML file that other
  screens share; stamping the whole query string would silently drop anything
  they had put there.
*/

export type UrlState = Record<string, string | number | string[] | null | undefined>;

const OWNED = [
  "entity", "q", "page", "pageSize", "sortBy", "sortDir", "group", "cols",
  "colScope", "colQuery", "colFilters", "filters", "record",
] as const;

export function readUrl(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  OWNED.forEach((k) => {
    const v = p.get(k);
    if (v !== null) out[k] = v;
  });
  return out;
}

export function writeUrl(state: UrlState, { push = false } = {}): void {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams(window.location.search);
  Object.entries(state).forEach(([k, v]) => {
    const empty =
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (empty) p.delete(k);
    else p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  const qs = p.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  window.history[push ? "pushState" : "replaceState"](null, "", next);
}

/** Comma-joined lists — filter ids, hidden columns, grouping dimensions. */
export const packList = (xs: string[]): string => xs.join(",");
export const unpackList = (s: string | undefined): string[] =>
  s ? s.split(",").filter(Boolean) : [];

export const packInt = (n: number, fallback: number): number =>
  Number.isFinite(n) && n > 0 ? n : fallback;
