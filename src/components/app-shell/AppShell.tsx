import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Tier-1 icon rail (52px, flush, full height). Self-contained (owns its surface). */
  rail?: React.ReactNode;
  /** Tier-2 contextual sidebar (256px). Optional. Self-contained. */
  sidebar?: React.ReactNode;
  /** Content layer. Rendered with the 16px inset unless `inset={false}`. */
  children: React.ReactNode;
  /** The 16px content-layer inset is a hard layout rule — on by default. */
  inset?: boolean;
  className?: string;
}

/**
 * Canonical FleetPanda app shell — Figma "Layout Structure & Spacing"
 * (node 27634:21171). Encodes the two spacing laws:
 *   • 8px gap between panels (rail ↔ sidebar ↔ content) + 8px outer margin.
 *   • 16px inset on all four sides inside the content layer.
 *
 * Geometry: 52px rail (flush, full height) · 8px gap · 256px sidebar · 8px gap ·
 * fluid content · 8px right/top/bottom margin. Rail and sidebar use distinct
 * surfaces (`--color-rail` vs `--color-sidebar`).
 */
export function AppShell({
  rail,
  sidebar,
  children,
  inset = true,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {/* Tier-1 rail: flush left, full height (outside the padded region). */}
      {rail}

      {/* Padded region: p-2 = 8px outer margin (top/right/bottom) + 8px gap from
          the rail; gap-2 = 8px between the sidebar and the content layer. */}
      <div className="flex min-w-0 flex-1 gap-2 p-2">
        {sidebar}
        <section
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-hidden",
            inset && "p-4"
          )}
        >
          {children}
        </section>
      </div>
    </div>
  );
}
