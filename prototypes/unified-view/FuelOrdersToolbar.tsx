import { ListToolbar, ColumnSearchChip as GenericChip } from "./ListToolbar";
import { FuelOrdersFilters } from "./FuelOrdersFilters";
import type { ListFacet } from "./ListFilters";
import { FUEL_ORDER_SEARCH_FIELDS } from "./data";
import type { FuelOrderColumnKey } from "./types";
import type { ListToolbarProps, ListView } from "./ListToolbar";
import { DateRangeFilter, type DateRange } from "./threepl/DateRangeFilter";

/**
 * Fuel Orders action bar — a thin adapter over the generic `ListToolbar`.
 *
 * The composition, spacing and DS provenance all live there now; this file only
 * supplies what is specific to this list: its facet panel, its search-by-column
 * fields, its placeholder, and the delivery-date range. Asset Orders and
 * Customers do the same with their own, which is why the unit was parameterised
 * rather than copied a second and third time.
 */
export type FuelOrdersView = ListView;

export interface FuelOrdersToolbarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  columns: { key: FuelOrderColumnKey; label: string }[];
  hiddenColumns: Set<FuelOrderColumnKey>;
  onToggleColumn: (key: FuelOrderColumnKey) => void;
  onShowAllColumns: () => void;
  colScope: string;
  onColScopeChange: (v: string) => void;
  colQuery: string;
  onColQueryChange: (v: string) => void;
  view: FuelOrdersView;
  onViewChange: (v: FuelOrdersView) => void;
  /** Show the third switch position. Off unless a screen has a map to show. */
  mapView?: boolean;
  /** A RANGE, NOT A DAY — 3PL's control (Pavan, 2026-10-07). */
  range: DateRange;
  onRangeChange: (next: DateRange) => void;
  /** What a board card shows, per lane — see `ListToolbarProps.cardFields`. */
  cardFields?: ListToolbarProps<FuelOrderColumnKey>["cardFields"];
  /** Groupable dimensions for this list, plus the active ordered stack. */
  groupBy: ListToolbarProps<FuelOrderColumnKey>["groupBy"];
  /** The filter row under the headers — see `ListToolbarProps`. */
  columnFiltersOpen?: boolean;
  onToggleColumnFilters?: () => void;
  columnFilterCount?: number;
  /* THE PANEL'S APPLIED TICKS, kept by the screen (Pavan, 2026-10-07). */
  facets: ListFacet[];
  facetValue: ReadonlySet<string>;
  facetCountFor: (selected: ReadonlySet<string>) => number;
  onFacetsApply: (selected: ReadonlySet<string>) => void;
}

export function FuelOrdersToolbar({
  range,
  onRangeChange,
  facets,
  facetValue,
  facetCountFor,
  onFacetsApply,
  ...rest
}: FuelOrdersToolbarProps) {
  return (
    <ListToolbar
      boardView
      {...rest}
      searchPlaceholder="Search fuel orders, sites, drivers…"
      filters={
        <FuelOrdersFilters
          facets={facets}
          value={facetValue}
          countFor={facetCountFor}
          onApply={onFacetsApply}
        />
      }
      searchFields={FUEL_ORDER_SEARCH_FIELDS}
      dateControl={<DateRangeFilter value={range} onChange={onRangeChange} />}
    />
  );
}

export function ColumnSearchChip({
  colScope,
  colQuery,
  onClear,
  className,
}: {
  colScope: string;
  colQuery: string;
  onClear: () => void;
  /** "" when it joins the `FilterChips` shelf (Pavan, 2026-10-07). */
  className?: string;
}) {
  return (
    <GenericChip
      className={className}
      searchFields={FUEL_ORDER_SEARCH_FIELDS}
      colScope={colScope}
      colQuery={colQuery}
      onClear={onClear}
    />
  );
}

/** One chip per header box that has something typed in it. */
export function ColumnFilterChips({
  columns,
  filters,
  onClear,
}: {
  columns: { key: FuelOrderColumnKey; label: string }[];
  filters: [string, string][];
  onClear: (key: string) => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {filters.map(([key, value]) => (
        <GenericChip
          key={key}
          className=""
          searchFields={columns}
          colScope={key}
          colQuery={value.trim()}
          onClear={() => onClear(key)}
        />
      ))}
    </div>
  );
}
