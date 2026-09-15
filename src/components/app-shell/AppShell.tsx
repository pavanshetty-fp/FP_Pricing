import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Global top bar — a full-width chrome band above the rail + content. Optional. */
  topBar?: React.ReactNode;
  /** Tier-1 icon rail (52px, flush, full height). Self-contained (owns its surface). */
  rail?: React.ReactNode;
  /**
   * Tier-2 contextual sidebar (256px). Optional. Self-contained.
   *
   * Pass a FUNCTION to get `collapsible` behaviour: it is called with whether
   * the drawer is currently expanded, so the caller can hand its own drawer
   * component the `collapsed` prop it already understands.
   */
  sidebar?: React.ReactNode | ((state: { expanded: boolean }) => React.ReactNode);
  /**
   * THE TIER-2 DRAWER RESTS AS A 52px RAIL AND OPENS ON ITS OWN HOVER.
   *
   * A second nav level is READ ONCE — you pick the list you are working in and
   * then you work in it — and at full width it charges 264px of every screen
   * after that for having been read. On a table that is two columns; on a
   * board it is most of a lane. Collapsed it costs 60, and it is still THERE:
   * a drawer that disappears entirely is one nobody finds, and the icons are
   * the handle.
   *
   * IT FLOATS RATHER THAN PUSHES. Reflowing the content layer every time the
   * pointer crossed it would make the thing you are reading move while you
   * read it — and the drawer's whole argument is that the content should have
   * the width. Over the top, the table underneath keeps its columns and its
   * scroll position. The same call the Tier-1 rail already makes.
   *
   * THE TWO ARE PARENT AND CHILD, AND THAT DECIDES THE EDGE CASES.
   *   · Each opens on its own hover — one gesture, whichever one you are on.
   *   · The expanded rail lies OVER the expanded drawer, because the rail is
   *     the level above: you went left to get to it, and the thing you went
   *     past should not be drawn on top of where you arrived.
   *   · Moving from the child onto the PARENT does not shut the child. Going
   *     up a level to check where you are is not leaving, and a sub-menu that
   *     vanished the moment you looked at its parent would make you do the
   *     whole trip again to get back. Only leaving BOTH starts the clock.
   *   · The parent never opens the child. "Remain" is not "appear".
   *
   * IT LEAVES ON ITS OWN, and not the instant you step off: a pointer on its
   * way to a row crosses the gap, and a drawer that shut on that would be a
   * drawer you had to chase. See `PEEK_HIDE_MS`.
   */
  sidebarCollapsible?: boolean;
  /**
   * Fixed page header at the top of the content layer — the name of the selected
   * menu (from the sub-nav drawer or the main nav). A string renders the 24px
   * semibold title; pass a node for custom header content.
   */
  title?: React.ReactNode;
  /**
   * Optional breadcrumb (the nav path). Rendered **inside the header, directly
   * below the title text** (above the header's bottom divider). Omit it (e.g. via
   * the Settings toggle) and the header collapses to the title row.
   * See `docs/content-layer.md`.
   */
  breadcrumb?: React.ReactNode;
  /** Optional right-aligned controls in the page header (e.g. theme toggle). */
  headerAction?: React.ReactNode;
  /** Content layer body. Rendered with the 16px inset unless `inset={false}`. */
  children: React.ReactNode;
  /** The 16px content-layer inset is a hard layout rule — on by default. */
  inset?: boolean;
  /** Tighter page header (less vertical padding) for dense, ClickUp-style tops. */
  compactHeader?: boolean;
  /** Bottom hairline under the (non-compact) header. On by default. */
  headerDivider?: boolean;
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
/** How long the drawer stays open after the pointer leaves the rail and it. */
const PEEK_HIDE_MS = 2000;

export function AppShell({
  topBar,
  rail,
  sidebar,
  sidebarCollapsible = false,
  title,
  breadcrumb,
  headerAction,
  children,
  inset = true,
  compactHeader = false,
  headerDivider = true,
  className,
}: AppShellProps) {
  const titleEl =
    typeof title === "string" || typeof title === "number" ? (
      <h1 className="truncate text-xl font-semibold leading-none text-foreground">
        {title}
      </h1>
    ) : (
      title
    );
  const hasHeader = title != null || headerAction != null || breadcrumb != null;

  const collapsible = sidebarCollapsible && sidebar != null;
  const [expanded, setExpanded] = React.useState(false);
  const hideAt = React.useRef<number | undefined>(undefined);
  /**
   * Arm the retreat. Called when the pointer leaves the pair AND at the moment
   * the drawer opens — which is the part that is not belt-and-braces.
   *
   * A DRAWER CAN OPEN UNDERNEATH A POINTER THAT IS NOT MOVING, and a browser
   * fires no `mouseenter` for an element that arrives under a stationary
   * cursor. No enter means no LEAVE either, so a close hung only on leaving
   * never came: the drawer stood open until something else happened to it.
   */
  const release = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    hideAt.current = window.setTimeout(() => setExpanded(false), PEEK_HIDE_MS);
  }, []);
  /** Pointer is on the drawer: open, and stay open while that is true. */
  const open = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    setExpanded(true);
  }, []);
  /** Pointer is on the RAIL: hold whatever the drawer is doing, open nothing. */
  const keep = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
  }, []);
  React.useEffect(() => () => window.clearTimeout(hideAt.current), []);

  const sidebarEl =
    typeof sidebar === "function" ? sidebar({ expanded: collapsible ? expanded : true }) : sidebar;

  /* THE RAIL IS WRAPPED ONLY TO BE LISTENED TO — the wrapper is a flex box
     round a fixed-width child and changes no geometry. */
  const railEl =
    collapsible && rail ? (
      <div className="flex shrink-0" onMouseEnter={keep} onMouseLeave={release}>
        {rail}
      </div>
    ) : (
      rail
    );

  return (
    <div
      className={cn(
        "flex h-screen flex-col overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {/* Global top bar: full-width chrome band above the rail + content. */}
      {topBar}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Tier-1 rail: flush left, full height (outside the padded region). */}
        {railEl}

        {/* Padded region: p-2 = 8px outer margin (top/right/bottom) + 8px gap from
            the rail; gap-2 = 8px between the sidebar and the content layer. */}
        <div className="relative flex min-w-0 flex-1 gap-2 p-2">
          {collapsible ? (
            /* THE COLLAPSED FOOTPRINT IS WHAT THE LAYOUT PAYS — 52px, held
               open whatever the drawer is doing, so nothing reflows when it
               expands. Same trick the rail plays one level up. */
            <div
              className="relative w-[52px] shrink-0"
              onMouseEnter={open}
              /* `onMouseMove` AS WELL: when a drawer arrives under a cursor
                 that is already there the enter never fires, and the first
                 flicker of movement is the only signal anybody is using it. */
              onMouseMove={open}
              onMouseLeave={release}
              onFocusCapture={open}
              onBlurCapture={release}
            >
              {/* z-20, one BELOW the rail's z-30, which is what puts the
                  expanded parent over the expanded child. */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 z-20",
                  expanded && "shadow-xl"
                )}
              >
                {sidebarEl}
              </div>
            </div>
          ) : (
            sidebarEl
          )}
        {/* Content Layer: FP/Surface 1b, rounded-md, no outer border and NO
            SHADOW. The shadow existed to lift it off a ground it was the same
            colour as; now that the app ground is the tinted surface-base, the
            step in value does that job on its own — and a shadow on top of a
            real value step is a second answer to a question already answered.
            (28679:1109 drew it when light's ground was #ffffff.) */}
        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-fp-surface-1b">
          {/* Page header. Title row (48px when alone); the optional breadcrumb
              sits directly beneath the title text, inside the header unit, above
              the divider. */}
          {hasHeader && (
            <header className={cn("flex shrink-0 flex-col gap-1 px-4", compactHeader ? "py-1" : "py-3", !compactHeader && headerDivider && "border-b border-fp-outline-1")}>
              <div className="flex items-center gap-6">
                {titleEl}
                {headerAction != null && (
                  <div className="ml-auto flex items-center gap-2">
                    {headerAction}
                  </div>
                )}
              </div>
              {breadcrumb != null && (
                <div className="flex items-center">{breadcrumb}</div>
              )}
            </header>
          )}
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
    </div>
  );
}
