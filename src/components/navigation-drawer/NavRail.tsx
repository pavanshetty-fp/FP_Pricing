import * as React from "react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./types";
import { ModuleSwitcher } from "./ModuleSwitcher";
import type { Module } from "./data";

export interface NavRailProps {
  groups: NavGroup[];
  activeKey?: string;
  onNavigate?: (key: string) => void;
  /**
   * Active module, forwarded to the `ModuleSwitcher`. Supply this together with
   * `onModuleChange` when the module drives which `groups` the rail is given —
   * i.e. when switching module swaps the whole destination list rather than just
   * relabelling the tile.
   */
  activeModule?: string;
  onModuleChange?: (key: string) => void;
  /** Passed straight through to `ModuleSwitcher` — see its `modules` prop. */
  modules?: Module[];
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
  activeModule,
  onModuleChange,
  modules,
}: NavRailProps) {
  const [moduleOpen, setModuleOpen] = React.useState(false);
  /**
   * PICKING SOMETHING IS FINISHING WITH THE RAIL.
   *
   * Hover alone cannot say that. The pointer is still on the rail the instant
   * after the click, so the panel stays open over the very thing the click
   * asked to see — the reader has to move away to find out whether anything
   * happened. Sticking there is the rail answering a question nobody asked
   * twice, and it is the one moment in the interaction where the system's
   * state and the reader's intent are plainly different.
   *
   * So a click puts the rail back to 52px and keeps it there until the pointer
   * leaves — hovering again is a new question and gets the panel back.
   */
  const [dismissed, setDismissed] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!dismissed) return;
    /* POSITION, NOT `mouseleave`. The rail collapses out from under the
       cursor, and a browser owes no leave for an element that shrank away from
       a pointer that never moved. */
    const move = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node) || !box.current?.contains(t)) setDismissed(false);
    };
    document.addEventListener("pointermove", move, true);
    return () => document.removeEventListener("pointermove", move, true);
  }, [dismissed]);

  return (
    // reserves the 52px footprint; the panel below overlays on hover
    <div ref={box} className="relative h-full w-[52px] shrink-0">
      <nav
        aria-label="Primary"
        data-expanded={moduleOpen ? "true" : undefined}
        className={cn(
          "group absolute inset-y-0 left-0 z-30 flex w-[52px] flex-col overflow-hidden",
          "bg-rail py-3 shadow-none transition-[width,box-shadow] duration-200 ease-out",
          !dismissed && "hover:w-64 hover:shadow-xl",
          "data-[expanded=true]:w-64 data-[expanded=true]:shadow-xl"
        )}
      >
        {/* Module switcher — top: the selected module. Opening it pins the rail open. */}
        <ModuleSwitcher
          onOpenChange={setModuleOpen}
          activeModule={activeModule}
          onModuleChange={onModuleChange}
          modules={modules}
        />

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
                      onClick={() => {
                        onNavigate?.(item.key);
                        setDismissed(true);
                      }}
                      className={cn(
                        "relative flex h-9 w-full items-center gap-1 px-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-5",
                        active
                          ? "text-sidebar-foreground before:absolute before:left-0 before:h-7 before:w-0.5 before:bg-brand"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                      )}
                    >
                      {/* THE SELECTED AREA KEEPS A TILE (Pavan, 2026-10-05) —
                          the same fill drawer 2 gives its selected item, so
                          with the rail collapsed the reader can still see
                          where they went. 36px, centred in the 52px rail. */}
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors",
                          active && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={cn(
                          "truncate opacity-0 transition-opacity duration-150 group-data-[expanded=true]:opacity-100",
                          !dismissed && "group-hover:opacity-100"
                        )}
                      >
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
