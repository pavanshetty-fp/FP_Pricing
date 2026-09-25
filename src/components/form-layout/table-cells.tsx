import * as React from "react";
import { Check, ChevronDown, Trash2, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  /* NEVER WRAPS. A column heading that breaks onto a second line stops sitting
     over the column it names, and the table reads as though its headers have
     slipped — which is exactly what it looks like. A heading too long for its
     column is a column that is too narrow, and that is fixed in the colgroup. */
  return (
    <span className="text-sm font-medium whitespace-nowrap text-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

export interface TableCellSelectProps {
  value: string;
  options: string[];
  /**
   * Second line under the value. A NODE, not just a string: a cell's second
   * line is often a state — a chip saying this partner will never see the
   * invitation — and the alternative was floating that chip over the cell,
   * where a narrow column laid it on top of the name.
   */
  description?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Option count at or above which the search field appears. Default: always. */
  searchThreshold?: number;
  onChange: (v: string) => void;
  /**
   * Take focus when the cell MOUNTS — pass it to the first editable cell of a
   * row the reader has just added, so the add is followed by the answer and
   * not by a hunt for the row (DS ui §10f, "Rows"). Mount-only: rows already
   * on the table are never re-focused.
   */
  autoFocus?: boolean;
  "aria-label"?: string;
  /**
   * PICK SEVERAL AT ONCE, AND APPLY THEM.
   *
   * A list of rows you fill one at a time asks for the same three gestures per
   * row — open, choose, open the next — when the thing being said is "these
   * five". With this the options carry checkboxes and the list keeps a footer
   * with Apply: one open, one Apply, and the caller decides what several
   * choices mean (here: fill this row and add a row per extra).
   *
   * Pass it only where a row can legitimately become many. Left off, the cell
   * writes one value and closes, which is what a cell replacing its own
   * contents should do.
   */
  multiple?: {
    /** Already chosen elsewhere in the list — shown ticked and read-only. */
    taken?: string[];
    onApply: (picked: string[]) => void;
  };
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
  multiple,
  autoFocus,
}: TableCellSelectProps) {
  const [open, setOpen] = React.useState(false);
  const showSearch = options.length >= searchThreshold;
  /* THE TICKS ARE THE POPOVER'S, not the record's. Nothing is written until
     Apply, so closing the list without pressing it changes nothing — which is
     the difference between choosing and having chosen. */
  const [picked, setPicked] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!open) setPicked([]);
  }, [open]);
  const toggle = (opt: string) =>
    setPicked((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          autoFocus={autoFocus}
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
              /* `items-start` so a chip on this line keeps its own width
                 instead of stretching to the cell. */
              <span className="flex items-start truncate text-xs text-muted-foreground">
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
                    if (multiple) {
                      toggle(opt);
                      return;
                    }
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {multiple && (
                    <Checkbox
                      checked={picked.includes(opt)}
                      /* The row is the control; the box reports it. */
                      tabIndex={-1}
                      aria-hidden
                      className="pointer-events-none"
                    />
                  )}
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {multiple && (
            /* THE COUNT AND THE ACT, on one line. Apply is disabled with
               nothing ticked rather than hidden: a footer that appears and
               disappears makes the list jump as you choose. */
            <div className="flex items-center justify-between gap-2 border-t border-border p-1 pl-2.5">
              <span className="text-xs tabular-nums text-muted-foreground">
                {picked.length} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={picked.length === 0}
                onClick={() => {
                  multiple.onApply(picked);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          )}
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
  /**
   * Unit shown BEFORE the value, e.g. `$`. Not part of the value.
   *
   * It pins to the cell's left edge while the figure stays right-aligned,
   * which is how every ledger prints money: the symbol marks the column, the
   * digits line up for comparing. Stuck to the number it would move with the
   * number's length and stop marking anything.
   */
  prefix?: string;
  /**
   * Take focus when the cell MOUNTS — pass it to the first editable cell of a
   * row the reader has just added, so the add is followed by the answer and
   * not by a hunt for the row (DS ui §10f, "Rows"). Mount-only: rows already
   * on the table are never re-focused.
   */
  autoFocus?: boolean;
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
  prefix,
  "aria-label": ariaLabel,
  autoFocus,
}: TableCellInputProps) {
  /*
    WHAT WAS TYPED, UNTIL IT IS FINISHED BEING TYPED.

    These cells are controlled by a NUMBER upstream, and a number cannot hold a
    half-written one. Typing "1.4" sent "1." to the parent, which parsed it to
    1 and handed back "1" — so the decimal point was swallowed on every
    keystroke and no fractional rate could be entered at all. The same is true
    of a leading "0." or a trailing zero.

    While the cell has focus it shows the literal keystrokes and the parent
    still receives every one of them; on blur the buffer is dropped and the
    canonical value comes back, so "1.40" settles to "1.4" and "abc" to
    whatever the parent made of it. The parent stays the source of truth — this
    only stops it answering mid-word.
  */
  const [typed, setTyped] = React.useState<string | null>(null);
  const shown = typed ?? value;
  /*
    A CURRENCY MARK BELONGS TO ITS NUMBER, not to the cell.

    A numeric cell right-aligns its figure and the prefix was pinned to the left
    edge, so "$" and "3.57" sat at opposite ends of a 132px column with nothing
    between them — the mark read as a column header for the cell rather than as
    part of the amount. Right-align the pair instead and close the gap to 4px:
    the "$" travels with the first digit however long the number gets.

    `field-sizing-content` is what lets the input shrink to its own text so the
    prefix can sit against it; the LABEL is still the full-cell click target, so
    nothing is harder to hit. Only `numeric` cells with a prefix change — a text
    cell's input still fills the width, which is where typing should start.
  */
  const moneyish = Boolean(numeric && prefix);
  return (
    <label
      className={cn(
        "absolute inset-0 flex cursor-text items-center px-3 transition-colors",
        moneyish ? "justify-end gap-1" : "gap-1.5",
        "hover:bg-accent",
        "focus-within:bg-fp-surface-1a focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      {prefix && (
        <span className="shrink-0 text-sm text-muted-foreground">{prefix}</span>
      )}
      <input
        type="text"
        value={shown}
        onChange={(e) => {
          setTyped(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => setTyped(null)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        className={cn(
          "h-full min-w-0 bg-transparent text-sm text-foreground outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed",
          numeric && "text-right tabular-nums",
          moneyish ? "w-auto field-sizing-content" : "w-full"
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
  /** What the closed cell prints, when the caller shows the rest elsewhere (e.g. as sub-rows). */
  summary?: string;
  onChange: (next: string[]) => void;
  /**
   * Take focus when the cell MOUNTS — pass it to the first editable cell of a
   * row the reader has just added, so the add is followed by the answer and
   * not by a hunt for the row (DS ui §10f, "Rows"). Mount-only: rows already
   * on the table are never re-focused.
   */
  autoFocus?: boolean;
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
 * CHECKBOX ROWS AND AN APPLY (Pavan, 2026-09-24). A list with a trailing tick
 * reads as single-select — the reader picks one and stops (`MultiSelectList`
 * explains why). Ticks are a draft while the list is open; Apply commits them
 * in one go, and closing without it changes nothing.
 */
export function TableCellMultiSelect({
  values,
  options,
  placeholder = "Select",
  disabled,
  unitLabel = "selected",
  summary: summaryOverride,
  onChange,
  "aria-label": ariaLabel,
  autoFocus,
}: TableCellMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  /* THE DRAFT — what is ticked while the list is open. */
  const [draft, setDraft] = React.useState<string[]>(values);

  const summary =
    summaryOverride ??
    (values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
        : `${values.length} ${unitLabel}${unitLabel.endsWith("s") ? "" : "s"}`);

  const toggle = (opt: string) =>
    setDraft((d) => (d.includes(opt) ? d.filter((v) => v !== opt) : [...d, opt]));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(values);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          autoFocus={autoFocus}
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
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => toggle(opt)}
                  aria-checked={draft.includes(opt)}
                  icon={
                    <Checkbox
                      checked={draft.includes(opt)}
                      className="pointer-events-none"
                      tabIndex={-1}
                    />
                  }
                >
                  <span className="flex-1 truncate">{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <span className="text-xs text-muted-foreground">
            {draft.length} selected
          </span>
          <Button
            size="sm"
            onClick={() => {
              onChange(options.filter((o) => draft.includes(o)));
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
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
   * The words on the right of the typed-value row — "Add as fee". The typed
   * text sits on the left (Pavan, 2026-09-25). Default "Add".
   */
  createLabel?: string;
  /**
   * AN OPTIONAL CELL CAN BE EMPTIED AGAIN (DS ux §Forms, 2026-09-25) — the
   * empty choice, e.g. "No asset", shown first; picking it sets "".
   */
  clearLabel?: string;
  /**
   * Values already used by OTHER rows of the same table. Shown ticked and
   * unselectable rather than hidden: removing them would make the list change
   * length as you fill the table, and someone looking for an asset they already
   * added would conclude it does not exist. Ticked says "here, and already on
   * the order".
   */
  taken?: readonly string[];
  onChange: (v: string) => void;
  /**
   * Take focus when the cell MOUNTS — pass it to the first editable cell of a
   * row the reader has just added, so the add is followed by the answer and
   * not by a hunt for the row (DS ui §10f, "Rows"). Mount-only: rows already
   * on the table are never re-focused.
   */
  autoFocus?: boolean;
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
  createLabel = "Add",
  clearLabel,
  taken,
  onChange,
  "aria-label": ariaLabel,
  autoFocus,
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
          autoFocus={autoFocus}
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
              <CommandGroup>
                {/* WHAT WAS TYPED ON THE LEFT, THE ACT ON THE RIGHT (Pavan,
                    2026-09-25) — it read "Use “…”". */}
                <CommandItem value={query} onSelect={() => choose(query.trim())}>
                  <span className="min-w-0 flex-1 truncate">{query.trim()}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{createLabel}</span>
                </CommandItem>
              </CommandGroup>
            )}
            {clearLabel && !query.trim() && (
              <CommandGroup>
                <CommandItem value="__clear__" onSelect={() => choose("")}>
                  <span className="flex-1 truncate text-muted-foreground">{clearLabel}</span>
                  {!value && <Check className="size-4 shrink-0" />}
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

export interface TableRowRemoveProps {
  /** Runs only after the tick. */
  onRemove: () => void;
  /** The SUBJECT — "Remove Gas Pr 1", or "Remove fee 2" while the row is blank. */
  "aria-label": string;
  disabled?: boolean;
  /**
   * `cell` (default): the pair FILLS its `relative p-0` td, ✕ over ✓ — the DS
   * Figma 28133:1526. `inline`: the pair sits side by side, for a bin that
   * lives inside another cell's padding (a charge's type cell).
   */
  layout?: "cell" | "inline";
}

/**
 * A ROW'S DELETE ASKS FIRST (Pavan, 2026-09-23). The bin, quiet until the row
 * is reached for, swaps on press for ✕ cancel and ✓ confirm — the tick is the
 * "are you sure?". Nothing goes on one careless click, and there is no dialog:
 * the question is asked where the finger already is. DS ui §10f "Rows".
 *
 * Escape, ✕, or focus leaving the pair takes it back. The row needs
 * `group/row` for the bin's hover reveal; the armed pair ignores hover and
 * stays until answered.
 */
export function TableRowRemove({
  onRemove,
  "aria-label": ariaLabel,
  disabled,
  layout = "cell",
}: TableRowRemoveProps) {
  const [armed, setArmed] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (armed) cancelRef.current?.focus();
  }, [armed]);

  if (!armed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={ariaLabel}
        disabled={disabled}
        className="text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100 disabled:opacity-0"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(true);
        }}
      >
        <Trash2 />
      </Button>
    );
  }

  const inline = layout === "inline";
  const btn =
    "flex items-center justify-center outline-none transition-colors focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50";
  return (
    <div
      role="group"
      aria-label={`${ariaLabel}?`}
      className={cn(
        "flex overflow-hidden",
        inline ? "h-7 gap-1" : "absolute inset-0 flex-col"
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setArmed(false);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArmed(false);
      }}
    >
      <button
        ref={cancelRef}
        type="button"
        aria-label="Keep it"
        onClick={(e) => {
          e.stopPropagation();
          setArmed(false);
        }}
        className={cn(
          btn,
          "bg-fp-card-1 text-foreground hover:bg-accent",
          inline ? "size-7 rounded-sm" : "flex-1"
        )}
      >
        <X className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Yes, ${ariaLabel.charAt(0).toLowerCase()}${ariaLabel.slice(1)}`}
        onClick={(e) => {
          e.stopPropagation();
          setArmed(false);
          onRemove();
        }}
        className={cn(
          btn,
          "bg-destructive text-white hover:bg-destructive/90",
          inline ? "size-7 rounded-sm" : "flex-1"
        )}
      >
        <Check className="size-4" />
      </button>
    </div>
  );
}
