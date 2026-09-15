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
   * The Tier-1 rail is untouched by any of this. It is four items you aim at
   * by muscle memory, and it is 52px.
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
  const hold = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    setPeek(true);
  }, []);
  const release = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    hideAt.current = window.setTimeout(() => setPeek(false), PEEK_HIDE_MS);
  }, []);
  React.useEffect(() => () => window.clearTimeout(hideAt.current), []);

  /* THE RAIL OPENS IT TOO, because "where is the rest of the nav" is a
     question you ask with the pointer already on the nav. Wrapping it costs
     nothing: the wrapper is a flex box round a fixed-width child. */
  const railEl =
    peeking && rail ? (
      <div className="flex shrink-0" onMouseEnter={hold} onMouseLeave={release}>
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
              {/* THE EDGE IS THE HANDLE. No button, because a button for this
                  would be a control that exists to reveal a control — and the
                  8px channel between the rail and the content is already the
                  place the pointer passes through on its way to the nav. */}
              <div
                aria-hidden
                className="absolute inset-y-2 left-0 z-20 w-3"
                onMouseEnter={hold}
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
                onMouseEnter={hold}
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
