import * as React from "react";
import { ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import type { NavGroup, NavItem, NavUser, NavBrand } from "./types";

function UserAvatar({ user }: { user: NavUser }) {
  return (
    <Avatar className="size-8">
      {user.avatarSrc && <AvatarImage src={user.avatarSrc} alt={user.name} />}
      <AvatarFallback>{user.fallback}</AvatarFallback>
    </Avatar>
  );
}

export interface NavigationDrawerProps {
  brand: NavBrand;
  groups: NavGroup[];
  user: NavUser;
  /** key of the active item / sub-item */
  activeKey?: string;
  /** Collapsed = 52px icon rail; expanded = 256px labeled drawer. */
  collapsed?: boolean;
  onNavigate?: (key: string) => void;
  /** Override the surface/shape — e.g. tier-2 contextual sidebar uses `bg-sidebar`. */
  className?: string;
}

/**
 * Figma "Navigation Drawer" (node 27634:24684) — supports the
 * Expanded (256px) and Default/collapsed (52px) states.
 */
export function NavigationDrawer({
  brand,
  groups,
  user,
  activeKey,
  collapsed = false,
  onNavigate,
  className,
}: NavigationDrawerProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex h-full shrink-0 flex-col bg-drawer text-sidebar-foreground",
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

      <UserFooter user={user} collapsed={collapsed} />
    </nav>
  );
}

function BrandHeader({ brand, collapsed }: { brand: NavBrand; collapsed: boolean }) {
  const tile = (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-white [&_svg]:size-5",
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
      <span className="truncate text-base font-semibold text-white">{brand.name}</span>
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
            active && "bg-sidebar-accent text-sidebar-foreground"
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
          "flex w-full items-center gap-3 rounded-lg px-4 py-1 text-sm font-medium outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-5",
          active
            ? "bg-sidebar-accent text-sidebar-foreground"
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
                    "flex w-full items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
                    subActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
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

function UserFooter({ user, collapsed }: { user: NavUser; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="mt-auto">
        <UserAvatar user={user} />
      </div>
    );
  }
  return (
    <button
      type="button"
      className="mt-auto flex w-full items-center gap-2 rounded-lg p-2 text-left outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <UserAvatar user={user} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-sidebar-foreground">
          {user.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </span>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
