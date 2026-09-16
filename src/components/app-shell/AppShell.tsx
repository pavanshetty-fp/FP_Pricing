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
   * THE TIER-2 DRAWER IS NOT THERE UNTIL THE RAIL IS TOUCHED.
   *
   * A second nav level is READ ONCE — you pick the list you are working in and
   * then you work in it — and it charges 264px of every screen after that for
   * having been read. On a table that is two columns; on a board it is most of
   * a lane. It does not earn a resting footprint either: a 52px strip of
   * unlabelled icons beside a 52px strip of unlabelled icons is two things to
   * read where the rail is already the one you aim at.
   *
   * SO THE RAIL IS THE HANDLE FOR BOTH. Hover it and the pair comes out
   * together — the rail widens to its labels, the drawer arrives beside it.
   * One gesture, in the direction the nav has always been.
   *
   * THEY STACK PARENT OVER CHILD. The expanded rail lies over the expanded
   * drawer, because the rail is the level above: you went left to reach it,
   * and the thing you went past should not be drawn on top of where you
   * arrived. What is left showing is the drawer's right-hand edge, and that
   * edge is the way down a level — cross onto it and the rail falls back to
   * 52px on its own, leaving the drawer whole.
   *
   * IT FLOATS RATHER THAN PUSHES. Reflowing the content layer every time the
   * pointer crossed the rail would make the thing you are reading move while
   * you read it, and the drawer's whole argument is that the content should
   * have the width. The same call the rail already makes one level up.
   *
   * IT LEAVES ON ITS OWN, and not the instant you step off: a pointer on its
   * way to a row crosses the drawer, and one that shut on that would be a
   * drawer you had to chase. See `PEEK_HIDE_MS`.
   */
  sidebarPeek?: boolean;
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
  sidebarPeek = false,
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

  const peeking = sidebarPeek && sidebar != null;
  const [expanded, setExpanded] = React.useState(false);
  const railBox = React.useRef<HTMLDivElement>(null);
  const drawerBox = React.useRef<HTMLDivElement>(null);
  const hideAt = React.useRef<number | undefined>(undefined);

  const open = React.useCallback(() => {
    window.clearTimeout(hideAt.current);
    hideAt.current = undefined;
    setExpanded(true);
  }, []);

  /**
   * WHICH PANEL IS OUT IS DECIDED BY WHERE THE POINTER IS, NOT BY EVENTS THAT
   * WERE SUPPOSED TO FIRE.
   *
   * `mouseenter`/`mouseleave` are the obvious way to write this and they are
   * not dependable here. Both panels MOVE under the pointer — the rail grows
   * to 256, the drawer slides in from off-canvas — and a browser fires no
   * enter for an element that arrives under a cursor that is not moving, so it
   * owes no leave for it either. Hung on those, the drawer sometimes never
   * came out and, once out, sometimes never went back.
   *
   * Asking "what is under the pointer" on every move has no such hole: the
   * answer is the truth at that instant, however the pixels got there. On the
   * rail, the drawer comes out. On the drawer, it stays. On neither, ONE clock
   * starts — and is not restarted by further movement, or a pointer crossing
   * the table would keep postponing a retreat it is plainly not interested in.
   */
  React.useEffect(() => {
    if (!peeking) return;
    const arm = () => {
      if (hideAt.current !== undefined) return;
      hideAt.current = window.setTimeout(() => {
        hideAt.current = undefined;
        setExpanded(false);
      }, PEEK_HIDE_MS);
    };
    const stay = () => {
      window.clearTimeout(hideAt.current);
      hideAt.current = undefined;
    };
    const within = (box: HTMLDivElement | null, t: EventTarget | null) =>
      t instanceof Node && Boolean(box?.contains(t));
    const move = (e: PointerEvent) => {
      if (within(railBox.current, e.target)) {
        stay();
        setExpanded(true);
      } else if (within(drawerBox.current, e.target)) {
        stay();
      } else {
        arm();
      }
    };
    /* The pointer can also leave by leaving the WINDOW, which produces no
       further moves to ask. A `mouseout` with nothing on the other side of it
       is that, and only that. */
    const out = (e: MouseEvent) => {
      if (!e.relatedTarget) arm();
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("mouseout", out, true);
    return () => {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("mouseout", out, true);
    };
  }, [peeking]);

  React.useEffect(() => () => window.clearTimeout(hideAt.current), []);

  /* THE RAIL IS WRAPPED ONLY TO BE LISTENED TO — the wrapper is a flex box
     round a fixed-width child and changes no geometry. */
  const railEl =
    peeking && rail ? (
      <div ref={railBox} className="flex shrink-0">
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
        {/* `overflow-hidden` ONLY WHEN THE DRAWER PEEKS, and it is what the
            hiding IS: the drawer sits to the left of this box while it is away
            and the box clips it, so it reads as coming out from behind the
            rail rather than as fading in on top of the table. Overlays are
            portalled, so nothing that needs to escape this box is inside it. */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 gap-2 p-2",
            peeking && "overflow-hidden"
          )}
        >
          {peeking ? (
            /* z-20, one BELOW the rail's z-30 — that one digit is the whole of
               the parent-over-child stacking. `pointer-events-none` while away
               so a drawer nobody can see cannot eat a click on the column it
               is sitting over; focus still reaches it, and tabbing in brings
               it out, which is the keyboard's version of moving left. */
            <div
              ref={drawerBox}
              className={cn(
                "absolute inset-y-2 left-2 z-20 rounded-lg transition-transform duration-200 ease-out",
                expanded
                  ? "translate-x-0 shadow-xl"
                  : "pointer-events-none -translate-x-[calc(100%+0.75rem)]"
              )}
              /* Tabbing in brings it out — the keyboard's version of moving
                 left. Staying out is the pointer test above, not an event. */
              onFocusCapture={open}
            >
              {sidebar}
            </div>
          ) : (
            sidebar
          )}
        {/* Content Layer: FP/Surface 1b, rounded-md, no outer border and NO
            SHADOW. The shadow existed to lift it off a ground it was the same
            colour as; now that the app ground is the tinted surface-base, the
            step in value does that job on its own — and a shadow on top of a
            real value step is a second answer to a question already answered.
            (28679:1109 drew it when light's ground was #ffffff.) */}
        {/* `isolate` — THE CONTENT LAYER STACKS INSIDE ITSELF.
            Without it the layer is `relative` at `z-auto`, which makes no
            stacking context of its own, so every z-index inside it competes
            directly with the shell's: the data table's sticky header is `z-20`,
            the drawer is `z-20`, the table comes later in the document, and a
            column header painted over a navigation drawer. Neither number was
            wrong — they were never meant to be in the same conversation. A
            stacking context puts the whole layer at one depth and settles it
            for everything that will ever be built inside it. Overlays that must
            escape are portalled to the body and are not affected. */}
        <section className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-fp-surface-1b">
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
