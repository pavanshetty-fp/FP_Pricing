import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AccessibilityIcon, AccessibilityPanel } from "@/components/theme";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavGroup, NavItem } from "@/components/navigation-drawer";

/*
  THE ONE-PANEL NAVIGATION (Pavan, 2026-10-06, after the Lovable "unified UI"
  reference — the navigation menu only).

  Every module is a row; the module you are in is open, and under it are its
  pages, grouped under small headings. A page that has pages of its own (3PL
  Orders, Directory) becomes a heading with those pages under it, so there is
  no second drawer. Collapsed, the panel is an icon rail: the open module's
  pages as icons, then the other modules.

  THE TWO-LAYER RAIL + DRAWER IS KEPT, not deleted — `NAV_STYLE` in
  UnifiedView switches back ("Bring in the two-layer navigation drawers").

  COLOURS (Pavan, 2026-10-06, after the AirOps reference) are the shell set,
  `--fp-shell-*`: the panel and its rim, a selected item's fill, the guide line
  down the open module's pages and the green marker on it beside the page you
  are on. The open module itself takes weight, not a fill.
*/

export interface SidebarModule {
  key: string;
  name: string;
  icon: React.ReactNode;
}

const COLLAPSED_KEY = "fp-unified-sidebar-collapsed";

/* THE NAVIGATION SITS IN A BOX (Pavan, 2026-10-06, after the AirOps
   reference) — its own panel on the shell ground, no rim (Pavan, 2026-10-06),
   8px clear of the edges like the content layer beside it. */
const BOX_WRAP = "flex h-full shrink-0 py-2 pl-2";
const BOX =
  "flex h-full shrink-0 flex-col overflow-hidden rounded-lg bg-fp-shell-panel";

/** A page in the open module, with where it sits: its area and, if any, its sub-page. */
interface Page {
  area: string;
  sub: string | null;
  label: string;
  icon: React.ReactNode;
  /** A NESTED page's own pages, drawn under it as a tree (`nested`). */
  children?: Page[];
}
interface Section {
  heading?: string;
  pages: Page[];
}

/** The open module's pages, as headed sections. Direct pages share one. */
function sectionsFor(
  items: NavItem[],
  subNav: Record<string, NavGroup[]>,
  nested: string[] = [],
): Section[] {
  const out: Section[] = [];
  let loose: Page[] = [];
  const flush = () => {
    if (loose.length) out.push({ pages: loose });
    loose = [];
  };
  for (const item of items) {
    const groups = subNav[item.key];
    if (!groups) {
      loose.push({
        area: item.key,
        sub: null,
        label: item.label,
        icon: item.icon,
      });
      continue;
    }
    /* A NESTED PAGE STAYS A PAGE, its pages under it (Customer Portal,
       Pavan 2026-10-15) — not a heading. */
    if (nested.includes(item.key)) {
      loose.push({
        area: item.key,
        sub: null,
        label: item.label,
        icon: item.icon,
        children: groups.flatMap((g) =>
          g.items.map((s) => ({ area: item.key, sub: s.key, label: s.label, icon: s.icon })),
        ),
      });
      continue;
    }
    flush();
    out.push({
      heading: item.label,
      pages: groups.flatMap((g) =>
        g.items.map((s) => ({
          area: item.key,
          sub: s.key,
          label: s.label,
          icon: s.icon,
        })),
      ),
    });
  }
  flush();
  return out;
}

/** The module switch's three steps, in order: fold · move · unfold. */
/* A MODULE TAKES 3–5s TO LOAD (Pavan, 2026-10-09); the bar runs for the
   short end of that, and must match `.fp-nav-progress` in src/index.css. */
const PROGRESS_MS = 3000;
const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};
const FOLD_MS = 200;
const MOVE_MS = 260;
const UNFOLD_MS = 240;
const EASE = "cubic-bezier(0.2, 0, 0, 1)";

export function ModuleSidebar({
  modules,
  moduleNav,
  subNav,
  activeModule,
  activeArea,
  activeSub,
  onModuleChange,
  onLoadingChange,
  onNavigate,
  nested,
}: {
  modules: SidebarModule[];
  moduleNav: Record<string, NavItem[]>;
  subNav: Record<string, NavGroup[]>;
  activeModule: string;
  /** The area on show (`navKey`), and the page inside it (`subKey`). */
  activeArea: string;
  activeSub: string | null;
  onModuleChange: (key: string) => void;
  /** The module whose data is loading while its bar runs — null when done.
      The page shows its loading state meanwhile (Pavan, 2026-10-10). */
  onLoadingChange?: (key: string | null) => void;
  onNavigate: (area: string, sub: string | null) => void;
  /** Areas whose sub-pages hang under the page as a tree instead of turning
      it into a heading. Default none — 3PL's headings stay. */
  nested?: string[];
}) {
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        // Storage blocked — the toggle still works for this visit.
      }
      return !c;
    });
  };

  const sections = sectionsFor(moduleNav[activeModule] ?? [], subNav, nested);

  /*
    SWITCHING MODULES IS THREE STEPS, ONE AFTER ANOTHER (Pavan, 2026-10-07):
      1. FOLD — the open module's pages fold away, the list order unchanged;
      2. MOVE — the rows glide to the new order: the chosen module rises to
         the top, the old one settles back into its place (FLIP);
      3. UNFOLD — the chosen module's pages open.
    `view` is what the list is SHOWING, which trails `activeModule` through
    the steps. The click itself (bold, page content) lands at once.
  */
  const [view, setView] = React.useState<{
    first: string;
    mounted: string | null;
    unfolded: string | null;
  }>({ first: activeModule, mounted: activeModule, unfolded: activeModule });
  /* STEP 0 · PROGRESS (Pavan, 2026-10-08): a click first runs a thin bar
     across the chosen row, left to right; the switch — and the fold, move,
     unfold after it — starts when the bar arrives. */
  const [progress, setProgress] = React.useState<string | null>(null);
  const progressTimer = React.useRef<number | null>(null);
  const pick = (key: string) => {
    if (key === activeModule || progress) return;
    if (reducedMotion()) {
      onModuleChange(key);
      return;
    }
    setProgress(key);
    onLoadingChange?.(key);
    progressTimer.current = window.setTimeout(() => {
      setProgress(null);
      onLoadingChange?.(null);
      onModuleChange(key);
    }, PROGRESS_MS);
  };
  React.useEffect(
    () => () => {
      if (progressTimer.current) window.clearTimeout(progressTimer.current);
    },
    []
  );
  /* A MODULE IS LOADING (Pavan, 2026-10-16) — from the press until it has
     unfolded, the OTHER modules are disabled, so nothing suggests another
     can be picked meanwhile. */
  const busy = progress !== null || view.unfolded !== activeModule;
  const rowRefs = React.useRef(new Map<string, HTMLLIElement>());
  const fromTops = React.useRef<Map<string, number> | null>(null);
  const timers = React.useRef<number[]>([]);
  const reduced = () => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  };
  React.useEffect(() => {
    if (view.first === activeModule) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const target = activeModule;
    if (reduced()) {
      setView({ first: target, mounted: target, unfolded: target });
      return;
    }
    const later = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, ms));
    /* 1 · FOLD */
    setView((v) => ({ ...v, unfolded: null }));
    /* 2 · MOVE — measured with everything folded, then reordered. */
    later(FOLD_MS, () => {
      const tops = new Map<string, number>();
      rowRefs.current.forEach((el, key) => tops.set(key, el.getBoundingClientRect().top));
      fromTops.current = tops;
      setView({ first: target, mounted: null, unfolded: null });
    });
    /* 3 · UNFOLD — mounted folded, opened on the next frame. */
    later(FOLD_MS + MOVE_MS, () => {
      setView({ first: target, mounted: target, unfolded: null });
      /* A TIMER, NOT A FRAME — frames stall in a background tab and would
         leave the pages folded. */
      later(30, () => setView({ first: target, mounted: target, unfolded: target }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);
  React.useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    []
  );
  /* THE GLIDE — each row set back to where it was, then let go. */
  React.useLayoutEffect(() => {
    const from = fromTops.current;
    if (!from) return;
    fromTops.current = null;
    rowRefs.current.forEach((el, key) => {
      const was = from.get(key);
      if (was === undefined) return;
      const delta = was - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      void el.offsetHeight;
      el.style.transition = `transform ${MOVE_MS}ms ${EASE}`;
      el.style.transform = "";
    });
  }, [view.first]);
  const isActive = (p: Page) =>
    p.area === activeArea &&
    (p.sub === null ? activeSub === null : p.sub === activeSub);

  /* ── COLLAPSED — an icon rail ── */
  if (collapsed) {
    const tip = (label: string, node: React.ReactElement) => (
      <Tooltip key={label}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
    const iconBtn = (on: boolean) =>
      cn(
        "flex size-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-[18px]",
        on
          ? "bg-fp-shell-selected text-sidebar-foreground"
          : "text-sidebar-foreground/70 hover:bg-fp-shell-selected hover:text-sidebar-foreground",
      );
    return (
      <div className={BOX_WRAP}>
        <nav
          aria-label="Primary"
          className={cn(BOX, "w-14 items-center gap-1 overflow-y-auto py-3")}
        >
          {tip(
            "Expand navigation",
            <button
              type="button"
              aria-label="Expand navigation"
              onClick={toggle}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4"
            >
              <PanelLeftOpen />
            </button>,
          )}
          <div
            aria-hidden
            className="my-2 h-px w-7 shrink-0 bg-fp-shell-guide"
          />
          {sections.map((sec, i) => (
            <React.Fragment key={sec.heading ?? `loose-${i}`}>
              {i > 0 && (
                <div
                  aria-hidden
                  className="my-1 h-px w-5 shrink-0 bg-fp-shell-guide"
                />
              )}
              {sec.pages.flatMap((p) => [p, ...(p.children ?? [])]).map((p) =>
                tip(
                  p.label,
                  <button
                    type="button"
                    aria-label={p.label}
                    aria-current={isActive(p) ? "page" : undefined}
                    onClick={() => onNavigate(p.area, p.sub)}
                    className={iconBtn(isActive(p))}
                  >
                    {p.icon}
                  </button>,
                ),
              )}
            </React.Fragment>
          ))}
          <div
            aria-hidden
            className="my-2 h-px w-7 shrink-0 bg-fp-shell-guide"
          />
          {modules
            .filter((m) => m.key !== activeModule)
            .map((m) =>
              tip(
                m.name,
                <button
                  type="button"
                  aria-label={m.name}
                  disabled={busy}
                  onClick={() => onModuleChange(m.key)}
                  className={cn(iconBtn(false), busy && "pointer-events-none opacity-40")}
                >
                  {m.icon}
                </button>,
              ),
            )}
          <AccessibilityNav collapsed />
        </nav>
      </div>
    );
  }

  /* ── EXPANDED ── */
  return (
    <div className={BOX_WRAP}>
      <nav aria-label="Primary" className={cn(BOX, "relative w-(--fp-nav-width)")}>
        {/* IN THE CORNER, AND QUIET (Pavan, 2026-10-06) — a light grey mark
          that says the box folds, not a row of its own. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Collapse navigation"
              onClick={toggle}
              className="absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-md text-muted-foreground/40 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4"
            >
              <PanelLeftClose />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse navigation</TooltipContent>
        </Tooltip>
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5 pt-7 pb-3">
          {/* THE OPEN MODULE GOES FIRST (Pavan, 2026-10-06); the rest follow
            in their usual order. */}
          {[
            ...modules.filter((m) => m.key === view.first),
            ...modules.filter((m) => m.key !== view.first),
          ].map((m) => {
            const open = m.key === activeModule;
            return (
              <React.Fragment key={m.key}>
                <li
                  ref={(el) => {
                    if (el) rowRefs.current.set(m.key, el);
                    else rowRefs.current.delete(m.key);
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    disabled={busy && progress !== m.key}
                    onClick={() => !open && pick(m.key)}
                    className={cn(
                      "relative flex h-10 w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-[18px]",
                      busy && progress !== m.key && !(progress === null && open)
                        ? "cursor-not-allowed text-sidebar-foreground/35"
                        : open
                          ? "font-medium text-sidebar-foreground"
                            : "text-sidebar-foreground/80 hover:bg-fp-shell-selected hover:text-sidebar-foreground",
                    )}
                  >
                    <span className="flex shrink-0">{m.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-left">
                      {m.name}
                    </span>
                    {progress === m.key && (
                      <span
                        aria-hidden
                        className="fp-nav-progress absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand"
                      />
                    )}
                  </button>
                  {/* SAID UNDER THE BAR, in the same row's group, no box
                      (Pavan, 2026-10-09). */}
                  {progress === m.key && (
                    <p role="status" className="mt-1 px-2.5 text-xs text-muted-foreground">
                      Loading data for this module.
                    </p>
                  )}
                  {(() => {
                    const own =
                      m.key === view.mounted ? sectionsFor(moduleNav[m.key] ?? [], subNav, nested) : [];
                    if (own.length === 0) return null;
                    const unfolded = view.unfolded === m.key;
                    return (
                    /* THE FOLD — grid rows 0fr ↔ 1fr, so the height animates
                       to and from its natural size without being measured. */
                    <div
                      aria-hidden={!open}
                      inert={!open}
                      className="grid motion-reduce:transition-none"
                      style={{
                        gridTemplateRows: unfolded ? "1fr" : "0fr",
                        opacity: unfolded ? 1 : 0,
                        transition: unfolded
                          ? `grid-template-rows ${UNFOLD_MS}ms ${EASE}, opacity ${UNFOLD_MS}ms ${EASE}`
                          : `grid-template-rows ${FOLD_MS}ms ${EASE}, opacity ${FOLD_MS}ms ${EASE}`,
                      }}
                    >
                    <div className="min-h-0 overflow-hidden">
                    <div
                      className={cn(
                        "mt-1 mb-2 ml-5 flex flex-col gap-2 border-l border-fp-shell-guide pl-2.5",
                        /* The module being left — its pages wait too. */
                        progress !== null && "pointer-events-none opacity-40",
                      )}
                    >
                      {own.map((sec, i) => (
                        <div
                          key={sec.heading ?? `loose-${i}`}
                          className="flex flex-col gap-0.5"
                        >
                          {sec.heading && (
                            <span className="px-2 pt-1 pb-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                              {sec.heading}
                            </span>
                          )}
                          {sec.pages.map((p) => {
                            const row = (p: Page, child = false) => {
                            const on = isActive(p);
                            return (
                              <button
                                key={`${p.area}:${p.sub ?? ""}`}
                                type="button"
                                aria-current={on ? "page" : undefined}
                                onClick={() => onNavigate(p.area, p.sub)}
                                className={cn(
                                  "relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4",
                                  on
                                    ? /* THE MARKER sits ON the guide line, beside the page. */
                                      "bg-fp-shell-selected font-medium text-sidebar-foreground before:absolute before:inset-y-1 before:-left-[11px] before:w-0.5 before:rounded-full before:bg-fp-shell-marker"
                                    : "text-sidebar-foreground/70 hover:bg-fp-shell-selected hover:text-sidebar-foreground",
                                  /* A tree page's mark is its bar, not the guide's. */
                                  child && "before:hidden",
                                )}
                              >
                                <span className="flex shrink-0">{p.icon}</span>
                                <span className="truncate">{p.label}</span>
                              </button>
                            );
                            };
                            if (!p.children) return row(p);
                            /* THE TREE — a vertical bar down from the page, a
                               short horizontal one into each of its pages. */
                            return (
                              <React.Fragment key={`${p.area}:tree`}>
                                {row(p)}
                                <div className="flex flex-col gap-0.5 pl-6">
                                  {p.children.map((c, k) => (
                                    <div key={c.sub} className="relative pl-3">
                                      <span
                                        aria-hidden
                                        className={cn(
                                          "absolute -top-0.5 -left-1.5 w-px bg-fp-shell-guide",
                                          k === p.children!.length - 1 ? "h-[calc(50%+2px)]" : "-bottom-0.5",
                                        )}
                                      />
                                      <span aria-hidden className="absolute top-1/2 -left-1.5 h-px w-[18px] bg-fp-shell-guide" />
                                      {row(c, true)}
                                    </div>
                                  ))}
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    </div>
                    </div>
                    );
                  })()}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        {/* ALWAYS IN VIEW, UNDER THE MODULES. */}
        <div className="shrink-0 border-t border-fp-shell-guide px-2.5 py-2">
          <AccessibilityNav />
        </div>
      </nav>
    </div>
  );
}

/** THE ACCESSIBILITY ITEM (Pavan, 2026-10-21; DS ui §10n) — the last row of
    the main navigation. Its panel is PINNED beside the nav at the window's
    foot — not a measured popover — so it lands in the same place at every
    Screen size and is never pushed off the page. Escape or a press outside
    closes it. */
function AccessibilityNav({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const panel = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), trigger.current?.focus());
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      /* Menus the panel opens (Screen size) live in a portal — not "outside". */
      if (panel.current?.contains(t) || trigger.current?.contains(t) || (t as Element).closest?.("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, [open]);
  return (
    <>
      {collapsed ? (
        <button
          ref={trigger}
          type="button"
          aria-label="Accessibility"
          aria-expanded={open}
          title="Accessibility"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "mt-auto flex size-9 shrink-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-[18px]",
            open ? "bg-fp-shell-selected text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-fp-shell-selected hover:text-sidebar-foreground",
          )}
        >
          <AccessibilityIcon />
        </button>
      ) : (
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-[18px]",
            open ? "bg-fp-shell-selected text-sidebar-foreground" : "text-sidebar-foreground/80 hover:bg-fp-shell-selected hover:text-sidebar-foreground",
          )}
        >
          <span className="flex shrink-0">
            <AccessibilityIcon />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">Accessibility</span>
        </button>
      )}
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Accessibility"
          data-fp-panel
          tabIndex={-1}
          className={cn(
            "fixed bottom-2 z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none",
            /* NEVER WIDER THAN THE ROOM LEFT OF THE WINDOW. */
            collapsed
              ? "left-[calc(0.5rem+3.5rem+0.75rem)] max-w-[calc(var(--fp-vw)-4.75rem-0.5rem)]"
              : "left-[calc(0.5rem+var(--fp-nav-width)+0.75rem)] max-w-[calc(var(--fp-vw)-var(--fp-nav-width)-1.75rem)]",
          )}
        >
          <AccessibilityPanel />
        </div>
      )}
    </>
  );
}
