import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/*
  Editable table cells — Figma "Input / Dropdown Tables Layout"
  (27593:15012 / 27592:33634).

  THE RULE THESE ENCODE: a cell in an editable table has NO control chrome of
  its own. It fills the whole `td`, and its states are carried by the cell —
  hover lifts to `--accent`, focus washes to Surface-1a with an inset ring. A
  bordered input or select dropped inside a padded cell puts a box inside a box:
  the table already draws the grid, so the control redrawing it is the second
  border, and the cell's real edges stop being the thing you read.

  Extracted from `EditableTable`, which was the only place they existed, so a
  real form's table can follow the same idiom instead of nesting controls.

  The parent `td` must be `relative` and `p-0` — a table cell gives no definite
  height for `h-full` to resolve against, so `inset-0` is what makes the state
  surface span the cell.
*/

/** Required-column marker for a table header. */
export function TableRequiredLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

export interface TableCellSelectProps {
  value: string;
  options: string[];
  /** Second line under the value. Omit for a single-line cell. */
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  "aria-label"?: string;
}

/** A cell that opens a list and writes the choice back. No visible control. */
export function TableCellSelect({
  value,
  options,
  description,
  placeholder = "Select",
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: TableCellSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "absolute inset-0 flex items-center justify-between gap-2 px-3 text-left transition-colors outline-none",
            "hover:bg-accent focus-visible:bg-fp-surface-1a focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "truncate text-sm",
                value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {value || placeholder}
            </span>
            {description && (
              <span className="truncate text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {options.length === 0 ? (
          <DropdownMenuItem disabled>No options</DropdownMenuItem>
        ) : (
          options.map((opt) => (
            <DropdownMenuItem key={opt} onSelect={() => onChange(opt)}>
              {opt}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface TableCellInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Right-align and tabular-align digits, for a quantity or amount column. */
  numeric?: boolean;
  /** Unit shown after the value, e.g. `gal`. Not part of the value. */
  suffix?: string;
  "aria-label"?: string;
}

/** A free-text cell filling the whole td. Same states as the select. */
export function TableCellInput({
  value,
  onChange,
  placeholder,
  disabled,
  numeric,
  suffix,
  "aria-label": ariaLabel,
}: TableCellInputProps) {
  return (
    <label
      className={cn(
        "absolute inset-0 flex cursor-text items-center gap-1.5 px-3 transition-colors",
        "hover:bg-accent",
        "focus-within:bg-fp-surface-1a focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed",
          numeric && "text-right tabular-nums"
        )}
      />
      {suffix && (
        <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
      )}
    </label>
  );
}
