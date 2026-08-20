import * as React from "react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./types";
import { ModuleSwitcher } from "./ModuleSwitcher";

export interface NavRailProps {
  groups: NavGroup[];
  activeKey?: string;
  onNavigate?: (key: string) => void;
}

/**
 * Tier-1 icon rail that expands to a 256px labeled drawer on hover —
 * Figma "Main Navigation Menu Interaction" (node 27634:21171).
 *
 * Collapsed 52px (`bg-rail` #080808). On hover — or while the module switcher is
 * open — it expands to 256px as an **overlay**; the 52px footprint stays reserved
 * so content never reflows; icons keep position and labels fade in. The surface
 * stays `bg-rail` in both states (the colour does not change on expand).
 */
export function NavRail({
  groups,
  activeKey,
  onNavigate,
}: NavRailProps) {
  const [moduleOpen, setModuleOpen] = React.useState(false);
  return (
    // reserves the 52px footprint; the panel below overlays on hover
    <div className="relative h-full w-[52px] shrink-0">
      <nav
        aria-label="Primary"
        data-expanded={moduleOpen ? "true" : undefined}
        className={cn(
          "group absolute inset-y-0 left-0 z-30 flex w-[52px] flex-col overflow-hidden",
          "bg-rail py-3 shadow-none transition-[width,box-shadow] duration-200 ease-out",
          "hover:w-64 hover:shadow-xl",
          "data-[expanded=true]:w-64 data-[expanded=true]:shadow-xl"
        )}
      >
        {/* Module switcher — top: the selected module. Opening it pins the rail open. */}
        <ModuleSwitcher onOpenChange={setModuleOpen} />

        {/* Divider — clear separation between the module and its menus */}
        <div className="mx-2 my-3 h-px shrink-0 bg-sidebar-border" aria-hidden />

        {/* Nav groups — the menus for the selected module (nested children belong to tier-2) */}
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
                      <span className="truncate opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[expanded=true]:opacity-100">
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </nav>
    </div>
  );
}
