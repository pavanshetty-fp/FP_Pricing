import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup, NavItem, NavBrand } from "./types";

export interface NavigationDrawerProps {
  brand: NavBrand;
  groups: NavGroup[];
  /** key of the active item / sub-item */
  activeKey?: string;
  /** Collapsed = 52px icon rail; expanded = 256px labeled drawer. */
  collapsed?: boolean;
  onNavigate?: (key: string) => void;
  /** Override the surface/shape — e.g. tier-2 contextual sidebar adds shadow + radius. */
  className?: string;
}

/**
 * Figma "Navigation Drawer" (node 27634:24684) — supports the
 * Expanded (256px) and Default/collapsed (52px) states.
 */
export function NavigationDrawer({
  brand,
  groups,
  activeKey,
  collapsed = false,
  onNavigate,
  className,
}: NavigationDrawerProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        collapsed ? "w-[52px] items-center py-3" : "w-64 p-2",
        className
      )}
    >
      <BrandHeader brand={brand} collapsed={collapsed} />

      <div
        className={cn(
          "flex flex-1 flex-col",
          collapsed ? "mt-7 gap-3.5" : "mt-2 gap-4"
        )}
      >
        {groups.map((group, i) => (
          <Group
            key={group.label ?? i}
            group={group}
            collapsed={collapsed}
            activeKey={activeKey}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function BrandHeader({ brand, collapsed }: { brand: NavBrand; collapsed: boolean }) {
  const tile = (
    /* THE TILE IS THE TITLE'S OWN LINE BOX — 24px, the height of the 16px name
       beside it. At 36 it was half again as tall as the word it belongs to and
       read as a separate object sitting next to the heading rather than as its
       mark. */
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-brand-foreground [&_svg]:size-3.5",
        brand.iconClassName ?? "bg-brand"
      )}
    >
      {brand.icon}
    </span>
  );
  if (collapsed) return tile;
  return (
    <div className="flex h-12 items-center gap-2 px-2">
      {tile}
      <span className="truncate text-base font-semibold text-sidebar-foreground">{brand.name}</span>
    </div>
  );
}

function Group({
  group,
  collapsed,
  activeKey,
  onNavigate,
}: {
  group: NavGroup;
  collapsed: boolean;
  activeKey?: string;
  onNavigate?: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {group.label && !collapsed && (
        <p className="px-2 py-1 text-xs font-medium text-foreground">{group.label}</p>
      )}
      <ul className={cn("flex flex-col", collapsed ? "items-center gap-3.5" : "gap-0.5")}>
        {group.items.map((item) => (
          <Item
            key={item.key}
            item={item}
            collapsed={collapsed}
            activeKey={activeKey}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}

function Item({
  item,
  collapsed,
  activeKey,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  activeKey?: string;
  onNavigate?: (key: string) => void;
}) {
  const hasChildren = !!item.children?.length;
  const childActive = item.children?.some((c) => c.key === activeKey);
  const [open, setOpen] = React.useState<boolean>(!!childActive);
  const active = item.key === activeKey;

  // Collapsed rail: icon-only button.
  if (collapsed) {
    return (
      <li>
        <button
          type="button"
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate?.(item.key)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-5",
            active && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          {item.icon}
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        aria-expanded={hasChildren ? open : undefined}
        onClick={() => (hasChildren ? setOpen((v) => !v) : onNavigate?.(item.key))}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-4 py-1 text-sm font-medium outline-none transition-colors hover:bg-sidebar-accent-hover focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-5",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:text-sidebar-foreground"
        )}
      >
        {item.icon}
        <span className="flex-1 truncate text-left">{item.label}</span>
        {hasChildren && (
          <ChevronRight
            className={cn("!size-4 transition-transform", open && "rotate-90")}
          />
        )}
      </button>

      {hasChildren && open && (
        <ul className="mt-0.5 flex flex-col gap-1 py-0.5 pl-6">
          {item.children!.map((sub) => {
            const subActive = sub.key === activeKey;
            return (
              <li key={sub.key}>
                <button
                  type="button"
                  aria-current={subActive ? "page" : undefined}
                  onClick={() => onNavigate?.(sub.key)}
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-sidebar-accent-hover focus-visible:ring-2 focus-visible:ring-ring/50",
                    subActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground"
                  )}
                >
                  {sub.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

