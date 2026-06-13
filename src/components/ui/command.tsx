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
 *   - `selected`    → trailing ✓ (the "Selected" variant)
 *   - `shortcut`    → trailing shortcut text (the "Shortcut Text" property)
 *   - `showShortcut`→ toggles the shortcut (the "Show Shortcut" BOOLEAN, default true)
 * The Default/Hover/Disabled "State" variant is left to cmdk (it drives
 * `data-[selected]`/`data-[disabled]`), so it isn't a manual prop. Passing only
 * `children` keeps the plain shadcn behaviour — every existing call still works.
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
          <span className="flex-1 truncate">{children}</span>
          {selected && <CheckIcon className="ml-auto size-4 text-foreground" />}
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

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
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
