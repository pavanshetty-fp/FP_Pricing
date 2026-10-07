import { ListFilters, type ListFacet } from "./ListFilters";
import type { FuelOrder } from "./types";

/*
  Fuel Orders filters — the DS faceted Filter panel (Figma "Action Bar Unit ·
  Filter interactions", 27665:14074): facet side menu + options pane (search +
  checkbox list) + Clear All / Apply footer. Structure, sizes and classes are
  the DS panel's; only the facets and options are this screen's.

  The source Sales Console showed these as six standalone pills; they collapse in
  here, which is why this screen has no second toolbar row. Delivery Date is the
  exception — it lives in the toolbar as its own stepper (see DateFilter).
*/

/* WIRED (Pavan, 2026-10-07) — it narrowed nothing. Now the shared
   `ListFilters`, as Asset Orders: staged ticks, a live count, Apply. */

/** Options read off the dataset, so the facet lists can't drift from the rows. */
const uniq = (xs: string[]) => Array.from(new Set(xs));

/**
 * Category options, TRANSCRIBED from the source app's own picker — not invented
 * and not tidied.
 *
 * The casing really is inconsistent there: `aviation_fuel` is snake_case while
 * `Auto Engine Oil` is title case, and `bio` / `diesel` / `ethanol` are lower
 * case next to `Diesel Engine Oil` and `Fuel Oil`. Reproduced verbatim, because
 * normalising it here would hide a data-quality problem that belongs to the
 * source. Order is the source's: case-INSENSITIVE alphabetical, which is why
 * `aviation_fuel` sorts after `Auto Trans Fluid` and `bio` before `Brake Fluid`.
 *
 * INCOMPLETE — the captures scroll only as far as "Fuels", so this is the A–F
 * slice of a longer list; everything from G onward is still uncaptured. That
 * used to be stated in a note under the options, removed on request. The gap
 * is recorded here instead: add the rest when the remaining screens are
 * captured.
 *
 * NOT A FACET (Pavan, 2026-10-07). A fuel order's products carry a name and
 * gallons, no category, so ticking one could only ever narrow to nothing —
 * the facet is dropped until the data has it. The list stays for that day.
 */
export const FUEL_ORDER_CATEGORIES = [
  "Accessories",
  "Additive",
  "Antifreeze",
  "Auto Engine Oil",
  "Auto Trans Fluid",
  "aviation_fuel",
  "bio",
  "Brake Fluid",
  "Chemicals",
  "Container",
  "DEF",
  "DEF Pkd",
  "diesel",
  "Diesel Engine Oil",
  "ethanol",
  "Food Grade",
  "Fuel Oil",
  "Fuels",
];

/** The facets, with options read off the rows the screen holds. */
export function fuelOrderFacets(rows: FuelOrder[]): ListFacet[] {
  return [
    { key: "type", label: "Type", options: ["Delivery", "Extraction"] },
    { key: "status", label: "Status", options: ["Requested", "Scheduled", "Dispatched", "Delivered", "Cancelled"] },
    { key: "customer", label: "Customer", options: uniq(rows.map((o) => o.customer.title)), searchable: true },
    { key: "shipTo", label: "Ship-To", options: uniq(rows.map((o) => o.customer.description)), searchable: true },
    { key: "product", label: "Product", options: uniq(rows.flatMap((o) => o.products.map((p) => p.name))), searchable: true },
  ];
}

export function FuelOrdersFilters({
  facets,
  value,
  countFor,
  onApply,
}: {
  facets: ListFacet[];
  value: ReadonlySet<string>;
  countFor: (selected: ReadonlySet<string>) => number;
  onApply: (selected: ReadonlySet<string>) => void;
}) {
  return <ListFilters facets={facets} value={value} countFor={countFor} onApply={onApply} />;
}
