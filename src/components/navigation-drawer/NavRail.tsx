import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import type { NavBrand, NavGroup, NavUser } from "./types";

export interface NavRailProps {
  brand: NavBrand;
  groups: NavGroup[];
  user: NavUser;
  activeKey?: string;
  onNavigate?: (key: string) => void;
}

/**
 * Tier-1 icon rail that expands to a 256px labeled drawer on hover —
 * Figma "Main Navigation Menu Interaction" (node 27634:21171).
 *
 * Collapsed 52px (`bg-rail` #080808). On hover it expands to 256px as an
 * **overlay** (`bg-drawer` #090c0f) — the 52px footprint stays reserved so the
 * content never reflows; icons keep their position and labels fade in.
 */
export function NavRail({
  brand,
  groups,
  user,
  activeKey,
  onNavigate,
}: NavRailProps) {
  return (
    // reserves the 52px footprint; the panel below overlays on hover
    <div className="relative h-full w-[52px] shrink-0">
      <nav
        aria-label="Primary"
        className={cn(
          "group absolute inset-y-0 left-0 z-30 flex w-[52px] flex-col overflow-hidden",
          "bg-rail py-3 shadow-none transition-[width,background-color,box-shadow] duration-200 ease-out",
          "hover:w-64 hover:bg-drawer hover:shadow-xl"
        )}
      >
        {/* Brand — tile (size-9) centered in 52px via px-2; wordmark fades in */}
        <div className="mb-7 flex h-9 shrink-0 items-center gap-3 px-2">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg text-white [&_svg]:size-5",
              brand.iconClassName ?? "bg-brand"
            )}
          >
            {brand.icon}
          </span>
          <span className="truncate text-base font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {brand.name}
          </span>
        </div>

        {/* Nav groups (tier-1 uses top-level items; nested children belong to tier-2) */}
        <div className="flex flex-1 flex-col gap-4">
          {groups.map((group, i) => (
            <ul key={group.label ?? i} className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = item.key === activeKey;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate?.(item.key)}
                      className={cn(
                        "relative flex h-9 w-full items-center gap-3 px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-5",
                        active
                          ? "text-sidebar-foreground before:absolute before:left-0 before:h-7 before:w-0.5 before:bg-brand"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                      )}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                      <span className="truncate opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>

        {/* User footer — avatar (size-8) centered via px-2.5; meta fades in */}
        <button
          type="button"
          className="mt-auto flex shrink-0 items-center gap-2 px-2.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Avatar className="size-8 shrink-0">
            {user.avatarSrc && <AvatarImage src={user.avatarSrc} alt={user.name} />}
            <AvatarFallback>{user.fallback}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </button>
      </nav>
    </div>
  );
}
