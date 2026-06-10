export type RowStatus = "Success" | "Processing" | "Failed";

export interface TwoLineText {
  title: string;
  description: string;
}

/** One row of the data table. Each field maps to a Figma column. */
export interface TableRow {
  id: string;
  /** col "Static" — plain status label */
  status: RowStatus;
  /** col "Dropdown" — two-line text with a trailing chevron */
  dropdown: TwoLineText;
  /** col "Descriptive Text" — two-line text */
  descriptive: TwoLineText;
  /** col "Badge" — short badge label */
  badge: string;
  /** col "Badge" (avatar + status) */
  statusBadge: RowStatus;
  /** col "Switch" */
  switchOn: boolean;
  /** col "Progress" 0–100 */
  progress: number;
  /** col "Toggle Group" — selected toggle value */
  toggle: string;
  /** col "Amount" — currency value */
  amount: number;
}

export type ColumnKey =
  | "select"
  | "status"
  | "dropdown"
  | "descriptive"
  | "badge"
  | "statusBadge"
  | "switch"
  | "button"
  | "iconDropdown"
  | "progress"
  | "image"
  | "toggle"
  | "amount"
  | "actions";

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** px width, taken from Figma column frame widths */
  width: number;
  sortable?: boolean;
  align?: "left" | "right" | "center";
}

export type SortDir = "asc" | "desc";

export interface SortState {
  key: ColumnKey;
  dir: SortDir;
}
