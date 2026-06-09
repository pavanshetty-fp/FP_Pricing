import * as React from "react";
import { cn } from "@/lib/utils";

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  /** Renders the item in the destructive (red) style and after a separator. */
  destructive?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "start" | "end";
  className?: string;
}

/** Minimal click-to-open menu with outside-click + Escape dismissal. */
function DropdownMenu({ trigger, items, align = "end", className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const normalItems = items.filter((i) => !i.destructive);
  const destructiveItems = items.filter((i) => i.destructive);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <span
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-1 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {normalItems.map((item) => (
            <MenuRow key={item.label} item={item} onClose={() => setOpen(false)} />
          ))}
          {destructiveItems.length > 0 && (
            <div className="my-1 h-px bg-border" role="separator" />
          )}
          {destructiveItems.map((item) => (
            <MenuRow key={item.label} item={item} onClose={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({ item, onClose }: { item: DropdownMenuItem; onClose: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        item.onSelect?.();
        onClose();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4",
        item.destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      {item.icon}
      {item.label}
    </button>
  );
}

export { DropdownMenu };
