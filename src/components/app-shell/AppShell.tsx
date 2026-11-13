import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Global top bar — a full-width chrome band above the rail + content. Optional. */
  topBar?: React.ReactNode;
  /**
   * NO GAP UNDER THE TOP BAR (Pavan, 2026-10-27 — every app's shell): with the bar's hairline off, the panels start right under it, so
   * the content layer and the drawer gain its 8px. Pair with
   * `<TopBar divider={false}>`.
   */
  flushTop?: boolean;
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
   * ONE DRAWER AT A TIME (Pavan, 2026-10-01). Hovering the rail opens the
   * rail ONLY — the second drawer stays away, so the menu items can be read
   * and clicked with nothing sliding out beside them. CLICKING a menu item is
   * what brings the second drawer out, and the rail collapses back to 52px in
   * the same moment (NavRail's own "picking is finishing"). Hover the rail
   * again and the second drawer goes away: you are choosing again.
   *
   * IT FLOATS RATHER THAN PUSHES. Reflowing the content layer every time the
   * pointer crossed the rail would make the thing you are reading move while
   * you read it, and the drawer's whole argument is that the content should
   * have the width. The same call the rail already makes one level up.
   *
   * IT LEAVES ON ITS OWN, and not the instant you step off: a pointer on its
   * way to a row crosses the drawer, and one that shut on that would be a
   * drawer you had to chase. See `PEEK_HIDE_MS`.
   *
   * A PRESS OUTSIDE BOTH PANELS CLOSES THEM AT ONCE. The clock is grace for a
   * pointer that may come back; pressing on the work behind the panels is not
   * wandering past, it is saying the nav is finished with. Waiting the second
   * out there would leave two panels sitting over the thing the reader just
   * pressed.
   */
  sidebarPeek?: boolean;
  /**
   * Fixed page header at the top of the content layer — the name of the selected
   * menu (from the sub-nav drawer or the main nav). A string renders the 24px
   * semibold title; pass a node for custom header content.
   */
  title?: React.ReactNode;
  /** FOLDS THE HEADER AWAY (2026-11-10) — a list's head-collapse chevron;
   *  the header slides shut and the body takes the room. */
  headerCollapsed?: boolean;
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
  /** 8px under the title instead of 12 — for a page that puts a strip
   *  (a banner) right under its title (Pavan, 2026-11-13). */
  tightHeaderBottom?: boolean;
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
/**
 * How long the drawer stays out after the pointer leaves both it and the rail.
 *
 * 500ms, down from a second in two steps (2026-09-17). The delay exists only
 * to forgive the gap a pointer crosses on its way somewhere else — long enough
 * to cover the trip, short enough that a drawer you have finished with is gone
 * before you notice it is still sitting on your table. A full second was well
 * on the wrong side of that: the trip takes a fraction of it, and the rest was
 * the panel hanging about over work the reader had already turned back to.
 */
const PEEK_HIDE_MS = 500;

export function AppShell({
  topBar,
  rail,
  sidebar,
  sidebarPeek = false,
  title,
  headerCollapsed = false,
  breadcrumb,
  headerAction,
  children,
  inset = true,
  compactHeader = false,
  tightHeaderBottom = false,
  headerDivider = true,
  flushTop = false,
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
  /* TRUE FROM A CLICK ON A RAIL ITEM UNTIL THE POINTER LEAVES THE RAIL.
     The pointer is still on the rail just after the click, and without this
     the next move would read as "hovering the rail" and put the drawer away
     again. */
  const picked = React.useRef(false);

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
        /* On the rail: the rail is the only drawer — unless an item was
           just clicked and the pointer has not moved off yet. */
        stay();
        if (!picked.current) setExpanded(false);
        return;
      }
      picked.current = false;
      if (within(drawerBox.current, e.target)) {
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
    /* A CLICK OUTSIDE IS A DECISION, AND IT DOES NOT WAIT.
       The clock is for a pointer that has wandered off and may come back —
       one second of grace on the way past. Pressing on the work behind the
       panels is not wandering: it says the reader is done with the nav and is
       somewhere else now, and holding two panels over what they just pressed
       for another second is the shell arguing with them. Outside both boxes,
       it goes straight away. */
    const dismiss = (e: PointerEvent) => {
      if (within(drawerBox.current, e.target)) return;
      if (within(railBox.current, e.target)) {
        /* A MENU ITEM PRESSED — the second drawer's cue. The module switcher
           is not a menu item and leaves it alone. */
        const t = e.target as Element;
        if (t.closest("nav li button")) {
          stay();
          picked.current = true;
          setExpanded(true);
        }
        return;
      }
      stay();
      setExpanded(false);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("mouseout", out, true);
    document.addEventListener("pointerdown", dismiss, true);
    return () => {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("mouseout", out, true);
      document.removeEventListener("pointerdown", dismiss, true);
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
        "flex h-(--fp-vh) flex-col overflow-hidden bg-background text-foreground",
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
            flushTop && "pt-0",
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
                flushTop && "top-0",
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
            <div
              className="grid shrink-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: headerCollapsed ? "0fr" : "1fr" }}
              aria-hidden={headerCollapsed || undefined}
              inert={headerCollapsed || undefined}
            >
              <div className="min-h-0 overflow-hidden">
            <header className={cn("flex shrink-0 flex-col gap-1 px-4", compactHeader ? "py-1" : tightHeaderBottom ? "pt-3 pb-2" : "py-3", !compactHeader && headerDivider && "border-b border-fp-outline-1")}>
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
              </div>
            </div>
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
