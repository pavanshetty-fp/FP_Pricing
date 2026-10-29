import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b border-border px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/**
 * Command item — Figma "Command / Item" (430:20061). Beyond the raw cmdk item,
 * this surfaces the component's documented properties as ergonomic props:
 *   - `icon`        → leading slot (the "Icon" variant; an INSTANCE_SWAP in Figma)
 *   - `selected`    → ✓ right after the name, name in medium weight (the "Selected" variant)
 *   - `shortcut`    → trailing shortcut text (the "Shortcut Text" property)
 *   - `showShortcut`→ toggles the shortcut (the "Show Shortcut" BOOLEAN, default true)
 * The Default/Hover/Disabled "State" variant is left to cmdk (it drives
 * `data-[selected]`/`data-[disabled]`), so it isn't a manual prop. Passing only
 * `children` keeps the plain shadcn behaviour — every existing call still works.
 *
 * ⚠️ DO NOT hand-roll this row layout. Setting ANY of `icon` / `selected` /
 * `shortcut` switches the item into structured mode, which wraps `children` in a
 * single `flex-1 truncate` span. Flex children you pass inside `children` then
 * collapse onto one truncated line, silently — no error, just a broken row that
 * costs real debugging time. Use the slots:
 *
 * ```tsx
 * <CommandItem icon={<Truck />} shortcut="12 orders">Carrier name</CommandItem>
 * ```
 *
 * `selected` renders a trailing ✓, which marks *the* chosen row — correct for
 * SINGLE-select. For multi-select use `MultiSelectList` (checkbox rows): a ✓ on
 * a multi-select list reads as "this is the current value", and with nothing yet
 * chosen the list is indistinguishable from a single-select one.
 */
function CommandItem({
  className,
  children,
  icon,
  selected,
  shortcut,
  showShortcut = true,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item> & {
  icon?: React.ReactNode;
  selected?: boolean;
  shortcut?: React.ReactNode;
  showShortcut?: boolean;
}) {
  // Only compose the structured layout when an FP prop is supplied; otherwise
  // render children verbatim (backward-compatible with bare cmdk usage).
  const structured = icon != null || selected != null || shortcut != null;
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {structured ? (
        <>
          {icon}
          {/* THE TICKS STAND IN ONE COLUMN, 40 characters in from where the
              names start — a narrower list puts it at its right edge (Pavan,
              2026-10-29, after "right next to the name"). The chosen name is
              medium weight in full ink, the rest muted. */}
          <span
            className={cn(
              "min-w-0 shrink basis-[40ch] truncate",
              selected === true && "font-medium text-foreground",
              selected === false && "text-muted-foreground"
            )}
          >
            {children}
          </span>
          {selected && <CheckIcon className="size-4 text-foreground" />}
          <span aria-hidden className="flex-1" />
          {shortcut != null && showShortcut && (
            <CommandShortcut>{shortcut}</CommandShortcut>
          )}
        </>
      ) : (
        children
      )}
    </CommandPrimitive.Item>
  );
}

/**
 * Right-aligned meta slot in a `CommandItem`.
 *
 * `variant` exists because this slot has two jobs. `keycap` is the wide-tracked
 * treatment that suits `⌘K`; `meta` is plain, for the counts, dates and hints
 * that are just as natural on the right of a row and that wide tracking makes
 * look broken. `meta` is the default — wide tracking is the special case, so it
 * should be the one you opt into.
 */
function CommandShortcut({
  className,
  variant = "meta",
  ...props
}: React.ComponentProps<"span"> & { variant?: "meta" | "keycap" }) {
  return (
    <span
      data-slot="command-shortcut"
      data-variant={variant}
      className={cn(
        "ml-auto text-xs text-muted-foreground",
        variant === "keycap" && "tracking-widest",
        className
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
