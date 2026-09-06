import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  /** Option count at or above which the search field appears. Default: always. */
  searchThreshold?: number;
  onChange: (v: string) => void;
  "aria-label"?: string;
}

/**
 * A cell that opens a list and writes the choice back. No visible control.
 *
 * The list SEARCHES, like every other list in this system. Scrolling a cell's
 * popover for a name you already know is the slowest way to answer it, and a
 * cell that sometimes takes typing and sometimes does not is one you have to
 * open before you know which. `searchThreshold` can still suppress it.
 */
export function TableCellSelect({
  value,
  options,
  description,
  placeholder = "Select",
  disabled,
  searchThreshold = 1,
  onChange,
  "aria-label": ariaLabel,
}: TableCellSelectProps) {
  const [open, setOpen] = React.useState(false);
  const showSearch = options.length >= searchThreshold;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
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
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          {showSearch && <CommandInput placeholder="Search…" />}
          <CommandList>
            <CommandEmpty>No options.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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

export interface TableCellMultiSelectProps {
  values: string[];
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  /**
   * Singular noun for the count summary — "product" prints "3 products". The
   * count is what a narrow cell can hold; the names are in the list one click
   * away, and on the `title` for a pointer that hovers.
   */
  unitLabel?: string;
  onChange: (next: string[]) => void;
  "aria-label"?: string;
}

/**
 * A cell holding MORE THAN ONE choice — same borderless idiom as the others.
 *
 * It summarises rather than listing: one value prints itself, several print
 * their count. A cell that grew a chip per choice would change the table's row
 * height as it was filled, and a column whose rows are different heights stops
 * being scannable, which is the only reason to put this in a table at all.
 *
 * The popover STAYS OPEN on pick, because choosing several things one dismissal
 * at a time is the slowest possible way to choose several things.
 */
export function TableCellMultiSelect({
  values,
  options,
  placeholder = "Select",
  disabled,
  unitLabel = "selected",
  onChange,
  "aria-label": ariaLabel,
}: TableCellMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
        : `${values.length} ${unitLabel}${unitLabel.endsWith("s") ? "" : "s"}`;

  const toggle = (opt: string) =>
    onChange(
      values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          title={values.join(", ") || undefined}
          className={cn(
            "absolute inset-0 flex items-center justify-between gap-2 px-3 text-left transition-colors outline-none",
            "hover:bg-accent focus-visible:bg-fp-surface-1a focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
          )}
        >
          <span
            className={cn(
              "truncate text-sm",
              values.length > 0 ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {summary}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No options.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)}>
                  <span className="flex-1 truncate">{opt}</span>
                  {values.includes(opt) && <Check className="size-4 shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface TableCellComboboxProps {
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  /** Allow a value that is not in `options`, offered as its own item. */
  creatable?: boolean;
  /**
   * Values already used by OTHER rows of the same table. Shown ticked and
   * unselectable rather than hidden: removing them would make the list change
   * length as you fill the table, and someone looking for an asset they already
   * added would conclude it does not exist. Ticked says "here, and already on
   * the order".
   */
  taken?: readonly string[];
  onChange: (v: string) => void;
  "aria-label"?: string;
}

/**
 * A cell you can TYPE INTO or PICK FROM — same borderless idiom as the others.
 *
 * A plain select cannot reach a value the list has not caught up with; a plain
 * input cannot attach to a real record. `creatable` keeps whatever was typed
 * available as its own option, so a new name is one Enter away rather than a
 * second-class path.
 */
export function TableCellCombobox({
  value,
  options,
  placeholder = "Select",
  disabled,
  creatable,
  taken,
  onChange,
  "aria-label": ariaLabel,
}: TableCellComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const matches = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );
  const typedIsNew =
    Boolean(creatable) &&
    query.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  const choose = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "absolute inset-0 flex items-center justify-between gap-2 px-3 text-left transition-colors outline-none",
            "hover:bg-accent focus-visible:bg-fp-surface-1a focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
            disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
          )}
        >
          <span
            className={cn(
              "truncate text-sm",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {value || placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={creatable ? "Type or pick…" : "Search…"}
          />
          <CommandList>
            {typedIsNew && (
              <CommandGroup heading="New">
                <CommandItem value={query} onSelect={() => choose(query.trim())}>
                  Use “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
            {matches.length > 0 && (
              <CommandGroup>
                {matches.map((o) => {
                  const used = o !== value && Boolean(taken?.includes(o));
                  return (
                    <CommandItem
                      key={o}
                      value={o}
                      disabled={used}
                      onSelect={() => !used && choose(o)}
                    >
                      <span className="flex-1 truncate">{o}</span>
                      {(used || o === value) && (
                        <Check className="size-4 shrink-0" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandEmpty>
              {creatable ? "Type a name to add it." : "No matches."}
            </CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
