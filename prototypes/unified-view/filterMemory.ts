import type { ListFacet, ListOption } from "./ListFilters";

/*
  WHAT A LIST'S FILTERS REMEMBER (Pavan, 2026-10-21):

    RECENT HISTORY   every set of filters applied in the last 24 hours, per
                     list, newest first — the Filters panel offers them back
                     under "Recent history" (only when there are any).
    SUGGESTED NAME   what "Save view" proposes, read off the filters that are
                     on: the line of service first, then the business, then
                     the rest in panel order — "Transport · Priya Raman".

  The toolbar's Filters control registers the list's facets and applied ticks
  here as it renders, so the view row on the same screen can name a view
  without every screen wiring the two together.
*/

const DAY = 24 * 3_600_000;
const MAX_ENTRIES = 8;

export interface HistoryEntry {
  at: number;
  ids: string[];
}

const storeKey = (list: string) => `fp-filter-history:${list}`;

/** The list's applied filter sets from the last 24 hours, newest first. */
export function readHistory(list: string): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(storeKey(list));
    const all = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return all.filter((e) => Date.now() - e.at < DAY && e.ids.length > 0);
  } catch {
    return [];
  }
}

/** Keep an applied set — the same set again moves to the top, not twice. */
export function recordHistory(list: string, ids: Iterable<string>) {
  const sorted = [...ids].sort();
  if (sorted.length === 0) return;
  const key = sorted.join("|");
  const next = [{ at: Date.now(), ids: sorted }, ...readHistory(list).filter((e) => e.ids.join("|") !== key)].slice(
    0,
    MAX_ENTRIES
  );
  try {
    window.localStorage.setItem(storeKey(list), JSON.stringify(next));
  } catch {
    /* No storage — the history is simply not kept. */
  }
}

/** A list's identity for its history: which facets it has. */
export const listKeyOf = (facets: ListFacet[]) => facets.map((f) => f.key).join(",");

/* ------------------------------------------------- the active filters --- */

let active: { facets: ListFacet[]; ids: ReadonlySet<string> } | null = null;
export const setActiveFilters = (facets: ListFacet[], ids: ReadonlySet<string>) => {
  active = { facets, ids };
};
export const clearActiveFilters = (facets: ListFacet[]) => {
  if (active?.facets === facets) active = null;
};

/** The applied ticks, grouped by facet in panel order: label and values. */
export function groupIds(facets: ListFacet[], ids: Iterable<string>) {
  const set = new Set(ids);
  const value = (o: ListOption) => (typeof o === "string" ? o : o.value);
  return facets
    .map((f) => ({
      key: f.key,
      label: f.label,
      values: (f.options ?? f.sections?.flatMap((s) => s.options) ?? []).map(value).filter((v) => set.has(`${f.key}:${v}`)),
    }))
    .filter((g) => g.values.length > 0);
}

/* WHICH FACETS NAME A VIEW FIRST — the line of service, then the business. */
const LEADS = [["serviceLine", "line", "orderKind", "los"], ["business"]];

/**
 * THE SUGGESTED VIEW NAME (Pavan, 2026-10-21). From the filters on:
 *   - the line of service, then the business, then the other facets in panel
 *     order — a business stands in for its line ("Transport", not
 *     "Fuel · Transport");
 *   - a facet with one value gives that value, two give "A & B", more give
 *     the count and the facet's name ("3 Status");
 *   - at most three parts, joined with " · ".
 * Empty when nothing is filtered.
 */
export function suggestViewName(): string {
  if (!active || active.ids.size === 0) return "";
  const groups = groupIds(active.facets, active.ids);
  const rank = (key: string) => {
    const i = LEADS.findIndex((keys) => keys.includes(key));
    return i < 0 ? LEADS.length : i;
  };
  /* A BUSINESS SAYS ITS LINE — Transport is fuel — so the line drops. */
  const hasBusiness = groups.some((g) => LEADS[1].includes(g.key));
  const ordered = groups
    .filter((g) => !(hasBusiness && LEADS[0].includes(g.key)))
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g.key) - rank(b.g.key) || a.i - b.i)
    .map(({ g }) => g);
  return ordered
    .slice(0, 3)
    .map((g) =>
      g.values.length === 1 ? g.values[0] : g.values.length === 2 ? `${g.values[0]} & ${g.values[1]}` : `${g.values.length} ${g.label}`
    )
    .join(" · ");
}
