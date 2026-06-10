import * as React from "react";
import { Columns3, ChevronDown, Search, Plus, User, Trash2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/*
  Saved Views menu — Figma "Saved views" (28030:1092). The Views button opens a
  388px panel that doubles as a search-or-add field: typing filters the saved
  views, and when the query matches no existing view an "add" affordance appears
  to create it. Each row selects a view; hovering reveals a delete (2nd-level
  hover) + pin control. Pinning floats the view to the top.

  Built on Popover rather than DropdownMenu: the panel hosts a free-text input,
  and Radix's DropdownMenu hijacks keystrokes for typeahead. (Figma labels it a
  dropdown; functionally it's a menu-styled popover.)
*/

interface SavedView {
  id: string;
  name: string;
  pinned: boolean;
  /** Disabled state from the Figma annotation (e.g. a view the user can't open). */
  disabled?: boolean;
}

const INITIAL_VIEWS: SavedView[] = [
  { id: "v1", name: "Saved View 1", pinned: false },
  { id: "v2", name: "Saved View 1", pinned: false },
  { id: "v3", name: "Saved View 1", pinned: false, disabled: true },
];

const DEFAULT_VIEW = "Default View";

export function SavedViewsMenu() {
  const [open, setOpen] = React.useState(false);
  const [views, setViews] = React.useState<SavedView[]>(INITIAL_VIEWS);
  const [active, setActive] = React.useState(DEFAULT_VIEW);
  const [query, setQuery] = React.useState("");
  const idRef = React.useRef(INITIAL_VIEWS.length);

  const trimmed = query.trim();
  const filtered = views.filter((v) =>
    v.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  // "Search or add": offer to create when the query is non-empty and matches no
  // existing view name exactly.
  const canAdd =
    trimmed.length > 0 &&
    !views.some((v) => v.name.toLowerCase() === trimmed.toLowerCase());

  // Pinned views float to the top, order otherwise preserved.
  const ordered = [...filtered].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned)
  );

  const addView = () => {
    if (!canAdd) return;
    const id = `v${++idRef.current}`;
    setViews((prev) => [...prev, { id, name: trimmed, pinned: false }]);
    setActive(trimmed);
    setQuery("");
    setOpen(false);
  };

  const selectView = (view: SavedView) => {
    if (view.disabled) return;
    setActive(view.name);
    setOpen(false);
  };

  const deleteView = (id: string) =>
    setViews((prev) => prev.filter((v) => v.id !== id));

  const togglePin = (id: string) =>
    setViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, pinned: !v.pinned } : v))
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 />
          Views: {active}
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[388px] p-2">
        {/* Search-or-add input */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAdd) {
                e.preventDefault();
                addView();
              }
            }}
            placeholder="Search or add a new view"
            aria-label="Search or add a new view"
            className="h-9 px-8"
          />
          {canAdd && (
            <button
              type="button"
              onClick={addView}
              aria-label={`Add view "${trimmed}"`}
              className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>

        {/* View list */}
        <div className="mt-1 flex flex-col">
          {ordered.length === 0 && !canAdd && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No views found
            </p>
          )}
          {ordered.map((view) => (
            <ViewRow
              key={view.id}
              view={view}
              active={view.name === active}
              onSelect={() => selectView(view)}
              onDelete={() => deleteView(view.id)}
              onTogglePin={() => togglePin(view.id)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ViewRow({
  view,
  active,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  view: SavedView;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={cn(
        "group/row flex h-9 items-center gap-2 rounded-md pr-1.5 pl-2 transition-colors",
        view.disabled
          ? "pointer-events-none opacity-50"
          : "hover:bg-accent/60",
        active && "bg-accent"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={view.disabled}
        className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <User className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{view.name}</span>
      </button>

      {/* Controls — revealed on row hover (and kept visible when this view is
          pinned so the pinned state reads at rest). */}
      <div
        className={cn(
          "flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100",
          view.pinned && "opacity-100"
        )}
      >
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete view"
          // 2nd-level hover: the delete control darkens to a destructive tint
          // on its own hover, distinct from the row hover.
          className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={view.pinned ? "Unpin view" : "Pin view"}
          aria-pressed={view.pinned}
          className={cn(
            "flex size-6 items-center justify-center rounded-sm outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            view.pinned ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Pin className={cn("size-4", view.pinned && "fill-current")} />
        </button>
      </div>
    </div>
  );
}
