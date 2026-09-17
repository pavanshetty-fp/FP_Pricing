import * as React from "react";
import { Check, ChevronDownIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectTriggerClasses } from "@/components/ui/select";
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
  Combobox — a select you can TYPE INTO.

  Composed, not invented: Popover + Command, which is exactly how the pattern
  was already shown in the showcase. This is that composition made reusable, so
  a real form gets search by naming a component instead of rebuilding thirty
  lines of it and drifting from the demo.

  IT WEARS THE SELECT'S TRIGGER, from `selectTriggerClasses`. A field that is a
  select in every way except that you can filter it must not announce itself as
  a different control; the search box appears inside the list, where the
  difference actually is.

  WHY NOT PUT SEARCH IN `Select` ITSELF: Radix Select owns every keystroke for
  its own type-ahead, so a text input cannot live in its list. The two are
  siblings, not a component and its variant.

  EVERY LIST SEARCHES. A field that behaves one way at five options and another
  at nine is a field you have to look at before you know how to use it, and the
  cost of guessing wrong — reaching for the keyboard and having it do nothing —
  is worse than a search box on a short list. `searchThreshold` remains for the
  rare list where the box genuinely costs more than it gives.

  `allowCreate` MAKES THE LIST A SUGGESTION RATHER THAN A LAW. Some fields have
  a known set that is nonetheless incomplete — a contact's role, a tag, a
  category somebody invented this morning. Forcing those into a fixed list
  makes people put the real answer in a notes field, where nothing can filter
  or group by it; leaving them a bare text input loses the consistency the list
  was giving. So: the options are offered first, and what is typed can become
  one. The new value is returned through `onValueChange` like any other, and
  `onCreate` fires alongside it for a caller that needs to persist it.
*/

export interface ComboboxOption {
  value: string;
  /** Shown instead of `value`. */
  label?: string;
  /** Second line, for the fact that tells two similar options apart. */
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (ComboboxOption | string)[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  /** Option count at or above which the search field appears. Default: always. */
  searchThreshold?: number;
  /**
   * Offer what has been typed as a new option when it matches nothing. The
   * search field becomes required for it — there is nowhere else to type.
   */
  allowCreate?: boolean;
  /** Fires with the new value when a create is chosen, before `onValueChange`. */
  onCreate?: (value: string) => void;
  /** Verb on the create row. Default: `Create "…"`. */
  createLabel?: (query: string) => string;
  /**
   * A control at the right of each option row, revealed on hover and on
   * keyboard focus of that row.
   *
   * IT IS NOT A MENU ITEM. An "Edit customer" row sitting IN the list is one
   * arrow-key from being chosen as a customer; an affordance ON the row is
   * unambiguously about that row, and it appears where the reader is already
   * looking — at the option they are considering. It must not select: the
   * handler stops the event before Command sees it.
   */
  optionAction?: (value: string) => React.ReactNode;
  /**
   * A node in the TRIGGER, between the selected value and the chevron.
   *
   * For something true of the thing currently chosen rather than of the control
   * — a status chip on the selected record. It sits inside the field because
   * that is what it is about: outside, beside the field, it reads as a fact
   * about the control and stops changing meaning when the selection does.
   *
   * It does not shrink, and the value truncates before it, so a long name never
   * pushes it out of the box.
   */
  trailing?: React.ReactNode;
  /** Trigger classes — width lives here, as it does on `SelectTrigger`. */
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  "aria-label"?: string;
  id?: string;
}

const normalise = (o: ComboboxOption | string): ComboboxOption =>
  typeof o === "string" ? { value: o } : o;

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  disabled,
  size = "default",
  searchThreshold = 1,
  allowCreate = false,
  onCreate,
  createLabel = (q) => `Create “${q}”`,
  optionAction,
  trailing,
  className,
  contentClassName,
  align = "start",
  "aria-label": ariaLabel,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const items = React.useMemo(() => options.map(normalise), [options]);
  const selected = items.find((o) => o.value === value);
  const showSearch = allowCreate || items.length >= searchThreshold;

  /* A value that is not in the list is still a value — one somebody created
     earlier. It shows on the trigger like any other, so a field does not go
     blank because its option came from outside the set. */
  const label = selected ? (selected.label ?? selected.value) : value || placeholder;

  const trimmed = query.trim();
  const canCreate =
    allowCreate &&
    trimmed.length > 0 &&
    !items.some((o) => (o.label ?? o.value).toLowerCase() === trimmed.toLowerCase());

  const choose = (next: string) => {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          data-slot="select-trigger"
          data-size={size}
          data-placeholder={selected ? undefined : ""}
          className={cn(selectTriggerClasses, className)}
        >
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {trailing && <span className="shrink-0">{trailing}</span>}
          <ChevronDownIcon className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={4}
        /* Matches the field it dropped from, so the list reads as that field
           opening rather than as a panel that happens to be nearby. */
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0",
          contentClassName
        )}
      >
        <Command>
          {showSearch && (
            <CommandInput
              placeholder={allowCreate ? "Search or type a new one…" : searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
          )}
          <CommandList>
            {/* With `allowCreate` the empty state never shows: whatever was
                typed is already offered as the create row above it. */}
            {!canCreate && <CommandEmpty>{emptyText}</CommandEmpty>}
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  /* `forceMount` and a value equal to the query: Command
                     filters its own items, and a create row filtered out by
                     the text that produced it would never be reachable. */
                  forceMount
                  value={trimmed}
                  onSelect={() => {
                    onCreate?.(trimmed);
                    choose(trimmed);
                  }}
                >
                  <Plus className="size-4 shrink-0" />
                  <span className="truncate">{createLabel(trimmed)}</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {items.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.value} ${o.description ?? ""}`}
                  disabled={o.disabled}
                  className="group/opt"
                  onSelect={() => choose(o.value)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      o.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label ?? o.value}</span>
                    {o.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {o.description}
                      </span>
                    )}
                  </span>
                  {optionAction && (
                    <span
                      className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/opt:opacity-100 group-focus-within/opt:opacity-100 group-data-[selected=true]/opt:opacity-100"
                      /* The row is the target for SELECTING; this corner of it
                         is not. Without this a click on the pencil would both
                         open the editor and pick the option under it. */
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {optionAction(o.value)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
