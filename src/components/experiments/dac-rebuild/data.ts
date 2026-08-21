/**
 * Sample data for the DAC rebuild experiment. Self-contained on purpose — this
 * folder is a from-scratch rebuild that composes only `ui/*` primitives + tokens.
 */

export type DacStatus = "Success" | "Processing" | "Failed";

export interface DacRow {
  id: string;
  status: DacStatus;
  title: string;
  description: string;
  enabled: boolean;
}

/**
 * Status sequence for the first page — 25 long so page 1 reads exactly like the
 * reference screens, then cycles for the rest of the set.
 */
const STATUS_CYCLE: DacStatus[] = [
  "Success", "Success", "Processing", "Success", "Failed",
  "Failed", "Failed", "Failed", "Failed", "Failed",
  "Failed", "Failed", "Success", "Processing", "Success",
  "Failed", "Success", "Processing", "Failed", "Success",
  "Failed", "Processing", "Success", "Failed", "Processing",
];

/** Footer count in the reference screens. */
export const TOTAL_ROWS = 1000;

export const SAMPLE_ROWS: DacRow[] = Array.from({ length: TOTAL_ROWS }, (_, i) => ({
  id: `row-${i + 1}`,
  status: STATUS_CYCLE[i % STATUS_CYCLE.length],
  title: "Table Cell Text",
  description: "Description Text",
  // Every third row rides "on" — gives the Switch column both states per page.
  enabled: i % 3 === 0,
}));

/**
 * Semantic badge variant — driven by the meaning of the value, never a literal
 * (ui/2-rules "Semantic variants").
 */
export function statusBadgeVariant(
  status: DacStatus
): "verified" | "secondary" | "destructive" {
  switch (status) {
    case "Success":
      return "verified";
    case "Processing":
      return "secondary";
    case "Failed":
      return "destructive";
  }
}

/** Status dot fill — soft status tokens, one per meaning. */
export const STATUS_DOT: Record<DacStatus, string> = {
  Success: "bg-status-success",
  Processing: "bg-status-processing",
  Failed: "bg-status-failed",
};

/** The column slot set (H4: a fixed, ordered set of slots). */
export const DAC_COLUMNS = [
  { key: "static", label: "Static", sortable: true },
  { key: "dropdown", label: "Dropdown", sortable: false },
  { key: "descriptive", label: "Descriptive Text", sortable: false },
  { key: "badgeSolid", label: "Badge", sortable: false },
  { key: "badgeDot", label: "Badge", sortable: false },
  { key: "switch", label: "Switch", sortable: true },
  { key: "button", label: "Button", sortable: false },
  { key: "action", label: "Dropdown", sortable: false },
] as const;

export type DacColumnKey = (typeof DAC_COLUMNS)[number]["key"];

/** Columns the search-by-column control can scope to. */
export const SEARCH_SCOPES: { key: "all" | "static" | "descriptive"; label: string }[] = [
  { key: "all", label: "All columns" },
  { key: "static", label: "Static" },
  { key: "descriptive", label: "Descriptive Text" },
];

export type SearchScope = (typeof SEARCH_SCOPES)[number]["key"];

/** Group-by options for the toolbar's Group By control. */
export const GROUP_BY_OPTIONS: { key: "none" | "status"; label: string }[] = [
  { key: "none", label: "None" },
  { key: "status", label: "Static" },
];

export type GroupByKey = (typeof GROUP_BY_OPTIONS)[number]["key"];

export const PAGE_SIZES = [25, 50, 100];
