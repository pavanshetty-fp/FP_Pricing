import { X } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import * as React from "react";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { SheetSection } from "./parts";

interface Shortcut {
  action: string;
  keys: string[];
  /** Keys pressed one after another ("G then T") rather than together. */
  sequence?: boolean;
}

/**
 * Placeholder shortcut set — generic actions, as the DS ships generically
 * labelled templates. Swap for the real key map when the bindings exist.
 */
const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: "General",
    items: [
      { action: "Open global search", keys: ["⌘", "K"] },
      { action: "Open keyboard shortcuts", keys: ["⌘", "/"] },
      { action: "Toggle theme", keys: ["⌘", "⇧", "L"] },
      { action: "Open settings", keys: ["⌘", ","] },
      { action: "Close panel or menu", keys: ["Esc"] },
    ],
  },
  {
    title: "Navigation",
    items: [
      { action: "Go to dashboard", keys: ["G", "D"], sequence: true },
      { action: "Go to tables", keys: ["G", "T"], sequence: true },
      { action: "Toggle the drawer", keys: ["⌘", "B"] },
      { action: "Next page", keys: ["→"] },
      { action: "Previous page", keys: ["←"] },
    ],
  },
  {
    title: "Table",
    items: [
      { action: "Select all rows", keys: ["⌘", "A"] },
      { action: "Clear selection", keys: ["Esc"] },
      { action: "Edit the focused cell", keys: ["Enter"] },
      { action: "Commit an edit", keys: ["Enter"] },
      { action: "Revert an edit", keys: ["Esc"] },
      { action: "Move between cells", keys: ["Tab"] },
    ],
  },
  {
    title: "Actions",
    items: [
      { action: "Create new record", keys: ["⌘", "N"] },
      { action: "Save current view", keys: ["⌘", "S"] },
      { action: "Export as CSV", keys: ["⌘", "E"] },
      { action: "Delete selected", keys: ["⌘", "⌫"] },
    ],
  },
];

function ShortcutRow({ action, keys, sequence }: Shortcut) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="min-w-0 truncate text-sm text-foreground">{action}</span>
      <KbdGroup className="shrink-0">
        {keys.map((k, i) => (
          <React.Fragment key={`${k}-${i}`}>
            {sequence && i > 0 && (
              <span className="px-0.5 text-xs text-muted-foreground">then</span>
            )}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </KbdGroup>
    </div>
  );
}

/**
 * Side sheet — keyboard shortcuts. Opened from the top bar's shortcuts CTA;
 * lists actions with their bindings, grouped by area and filterable by name.
 */
export function SheetShortcuts({
  title = "Keyboard shortcuts",
}: {
  title?: string;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const groups = React.useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: q
          ? g.items.filter((i) => i.action.toLowerCase().includes(q))
          : g.items,
      })).filter((g) => g.items.length > 0),
    [q]
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="flex flex-col gap-0.5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription>
            Every action available from the keyboard.
          </SheetDescription>
        </div>
        <SheetClose className="rounded-sm p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-auto p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions…"
            aria-label="Search actions"
            className="h-9 pl-8"
          />
        </div>

        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No actions match “{query}”.
          </p>
        ) : (
          groups.map((g) => (
            <SheetSection key={g.title} title={g.title}>
              <div className="flex flex-col">
                {g.items.map((item) => (
                  <ShortcutRow key={item.action} {...item} />
                ))}
              </div>
            </SheetSection>
          ))
        )}
      </div>
    </>
  );
}
