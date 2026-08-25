import { ListToolbar, ColumnSearchChip as GenericChip } from "./ListToolbar";
import { FuelOrdersFilters } from "./FuelOrdersFilters";
import { FUEL_ORDER_SEARCH_FIELDS } from "./data";
import type { FuelOrderColumnKey } from "./types";
import type { ListView } from "./ListToolbar";

/**
 * Fuel Orders action bar — a thin adapter over the generic `ListToolbar`.
 *
 * The composition, spacing and DS provenance all live there now; this file only
 * supplies what is specific to this list: its facet panel, its search-by-column
 * fields, its placeholder, and the delivery-date scope. Asset Orders and
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
  onHideAllColumns: () => void;
  colScope: string;
  onColScopeChange: (v: string) => void;
  colQuery: string;
  onColQueryChange: (v: string) => void;
  view: FuelOrdersView;
  onViewChange: (v: FuelOrdersView) => void;
  date: Date;
  onDateChange: (d: Date) => void;
}

export function FuelOrdersToolbar({
  date,
  onDateChange,
  ...rest
}: FuelOrdersToolbarProps) {
  return (
    <ListToolbar
      {...rest}
      searchPlaceholder="Search fuel orders, sites, drivers…"
      filters={<FuelOrdersFilters />}
      searchFields={FUEL_ORDER_SEARCH_FIELDS}
      dateScope={{ date, onDateChange }}
    />
  );
}

export function ColumnSearchChip({
  colScope,
  colQuery,
  onClear,
}: {
  colScope: string;
  colQuery: string;
  onClear: () => void;
}) {
  return (
    <GenericChip
      searchFields={FUEL_ORDER_SEARCH_FIELDS}
      colScope={colScope}
      colQuery={colQuery}
      onClear={onClear}
    />
  );
}
