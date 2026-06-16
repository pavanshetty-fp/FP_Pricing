import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Tier-1 icon rail (52px, flush, full height). Self-contained (owns its surface). */
  rail?: React.ReactNode;
  /** Tier-2 contextual sidebar (256px). Optional. Self-contained. */
  sidebar?: React.ReactNode;
  /**
   * Fixed page header at the top of the content layer — the name of the selected
   * menu (from the sub-nav drawer or the main nav). A string renders the 24px
   * semibold title; pass a node for custom header content.
   */
  title?: React.ReactNode;
  /**
   * Optional breadcrumb (the nav path) shown on a row above the title. When
   * present the header is two-row (~72px); when omitted it stays one-row (48px).
   * See `docs/content-layer.md`.
   */
  breadcrumb?: React.ReactNode;
  /** Optional right-aligned controls in the page header (e.g. theme toggle). */
  headerAction?: React.ReactNode;
  /** Content layer body. Rendered with the 16px inset unless `inset={false}`. */
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
 * fluid content · 8px right/top/bottom margin. The Content Layer (27634:23034)
 * is a distinct FP/Surface-1b panel (#1b2028, rounded-md) with a fixed 48px
 * page-header at its top (1px #363c45 bottom divider) showing the selected menu.
 */
export function AppShell({
  rail,
  sidebar,
  title,
  breadcrumb,
  headerAction,
  children,
  inset = true,
  className,
}: AppShellProps) {
  const titleEl =
    typeof title === "string" || typeof title === "number" ? (
      <h1 className="truncate text-2xl font-semibold leading-none text-foreground">
        {title}
      </h1>
    ) : (
      title
    );
  const hasHeader = title != null || headerAction != null || breadcrumb != null;
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
        {/* Content Layer: FP/Surface 1b (#1b2028), rounded-md, no outer border. */}
        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-fp-surface-1b">
          {hasHeader &&
            (breadcrumb != null ? (
              /* Multi-level path → two-row header (~72px): breadcrumb + title. */
              <header className="flex shrink-0 flex-col gap-1 border-b border-fp-outline-1 px-4 py-3">
                <div className="flex h-5 items-center">{breadcrumb}</div>
                <div className="flex items-center gap-6">
                  {titleEl}
                  {headerAction != null && (
                    <div className="ml-auto flex items-center gap-2">
                      {headerAction}
                    </div>
                  )}
                </div>
              </header>
            ) : (
              /* Single-level path → one-row header (48px). */
              <header className="flex h-12 shrink-0 items-center gap-6 border-b border-fp-outline-1 px-4">
                {titleEl}
                {headerAction != null && (
                  <div className="ml-auto flex items-center gap-2">
                    {headerAction}
                  </div>
                )}
              </header>
            ))}
          {/* Body: 16px inset (hard rule). Children manage their own scroll. */}
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden",
              inset && "p-4"
            )}
          >
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
