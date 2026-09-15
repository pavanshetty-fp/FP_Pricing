import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Global top bar — a full-width chrome band above the rail + content. Optional. */
  topBar?: React.ReactNode;
  /** Tier-1 icon rail (52px, flush, full height). Self-contained (owns its surface). */
  rail?: React.ReactNode;
  /** Tier-2 contextual sidebar (256px). Optional. Self-contained. */
  sidebar?: React.ReactNode;
  /**
   * PUT THE TIER-2 DRAWER AWAY UNTIL IT IS WANTED.
   *
   * A second nav level is READ ONCE — you pick the list you are working in and
   * then you work in it — and it charges 264px of every screen after that for
   * the privilege of having been read. On a table that is two columns; on a
   * board it is most of a lane. Parked, it costs nothing and comes back on a
   * gesture nobody has to learn: move left, towards where the nav has always
   * been.
   *
   * IT FLOATS RATHER THAN PUSHES. Reflowing the content layer every time the
   * pointer crossed the rail would make the thing you are reading move while
   * you read it — and the drawer's whole argument is that the content should
   * have the width. Over the top, the table underneath keeps its columns and
   * its scroll position.
   *
   * IT LEAVES ON ITS OWN, and not the instant you step off it: a pointer on
   * its way from the rail to a row crosses the gap, and a drawer that shut on
   * that would be a drawer you had to chase. It waits — see `PEEK_HIDE_MS`.
   *
   * THE RAIL IS NOT THE HANDLE, AND THAT IS THE WHOLE OF WHY THIS WORKS. The
   * rail has its own hover — it expands to 256px and shows its labels — so
   * hanging the drawer off the same hover would be one gesture with two
   * answers, two 256px overlays landing on the same strip of screen. The
   * handle is the channel just to the RIGHT of the rail instead, which the
   * expanded rail sits on top of: while the rail is out it eats the pointer,
   * so leaving the rail rightwards can never trip the drawer. Arriving at that
   * channel from the content is the only way in, and it is the gesture the
   * drawer is for.
   */
  sidebarAutoHide?: boolean;
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
/** How long the drawer stays out after the pointer leaves it. */
const PEEK_HIDE_MS = 2000;
/**
 * How long the pointer has to REST on the channel before the drawer comes out.
 *
 * Without it, every trip from the content to a rail icon opens a drawer on the
 * way past — the channel is between the two, and crossing it is not asking for
 * anything. A quarter of a second is longer than a crossing and shorter than a
 * decision.
 */
const PEEK_SHOW_MS = 250;

export function AppShell({
  topBar,
  rail,
  sidebar,
  sidebarAutoHide = false,
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

  const peeking = sidebarAutoHide && sidebar != null;
  const [peek, setPeek] = React.useState(false);
  const hideAt = React.useRef<number | undefined>(undefined);
  const showAt = React.useRef<number | undefined>(undefined);
  /**
   * Arm the retreat. Called when the pointer leaves the drawer AND at the
   * moment it opens — which is the part that is not belt-and-braces.
   *
   * THE DRAWER OPENS UNDERNEATH A POINTER THAT IS NOT MOVING, and a browser
   * does not fire `mouseenter` for an element that arrives under a stationary
   * cursor. No enter means no LEAVE either, so a close hung only on leaving
   * never came: the drawer stood open until something else happened to it.
   * Arming at open time makes the two seconds a promise the drawer keeps on
   * its own; touching it is what postpones them.
   */
  const release = React.useCallback(() => {
    window.clearTimeout(showAt.current);
    window.clearTimeout(hideAt.current);
    hideAt.current = window.setTimeout(() => setPeek(false), PEEK_HIDE_MS);
  }, []);
  /** Pointer is on the drawer: it stays out for as long as that is true. */
  const hold = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    window.clearTimeout(showAt.current);
    setPeek(true);
  }, []);
  /** The channel's own opener: a dwell, not a crossing. */
  const dwell = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    window.clearTimeout(showAt.current);
    showAt.current = window.setTimeout(() => {
      setPeek(true);
      release();
    }, PEEK_SHOW_MS);
  }, [release]);
  const abandon = React.useCallback(() => {
    window.clearTimeout(showAt.current);
  }, []);
  React.useEffect(
    () => () => {
      window.clearTimeout(hideAt.current);
      window.clearTimeout(showAt.current);
    },
    []
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
        {rail}

        {/* Padded region: p-2 = 8px outer margin (top/right/bottom) + 8px gap from
            the rail; gap-2 = 8px between the sidebar and the content layer. */}
        {/* `overflow-hidden` ONLY WHEN THE DRAWER PARKS, and it is what the
            parking is: the drawer slides out to the left of this box and the
            box clips it, so it reads as going back in behind the rail rather
            than as sliding over it. Overlays are portalled, so nothing that
            needs to escape this box is inside it. */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 gap-2 p-2",
            peeking && "overflow-hidden"
          )}
        >
          {peeking ? (
            <>
              {/* THE CHANNEL IS THE HANDLE. No button, because a button for
                  this would be a control that exists to reveal a control. It
                  sits under the rail's own expanded footprint on purpose —
                  see the note on `sidebarAutoHide`. */}
              <div
                aria-hidden
                className="absolute inset-y-2 left-0 z-20 w-6"
                onMouseEnter={dwell}
                onMouseLeave={abandon}
              />
              {/* `pointer-events-none` while parked so the parked drawer does
                  not eat clicks on the column it is sitting over. Focus still
                  reaches it — tabbing in opens it, which is the keyboard's
                  version of moving left. */}
              <div
                className={cn(
                  "absolute inset-y-2 left-2 z-30 rounded-lg shadow-fp-surface transition-transform duration-200 ease-out",
                  peek
                    ? "translate-x-0"
                    : "pointer-events-none -translate-x-[calc(100%+0.75rem)]"
                )}
                /* `onMouseMove` AS WELL AS `onMouseEnter`: when the drawer
                   arrives under a cursor that is already there, the enter
                   never fires and the first flicker of movement is the only
                   signal that anybody is using it. */
                onMouseEnter={hold}
                onMouseMove={hold}
                onMouseLeave={release}
                onFocusCapture={hold}
                onBlurCapture={release}
              >
                {sidebar}
              </div>
            </>
          ) : (
            sidebar
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
