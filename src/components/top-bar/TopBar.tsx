import * as React from "react";
import { Search, Bell, ChevronDown, UserRound, Settings, LogOut, Boxes, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SideSheet } from "@/components/side-sheet";
import { AccessibilityIcon } from "@/components/theme/AccessibilityIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface TopBarUser {
  name: string;
  email: string;
  /** Avatar fallback initials, e.g. "PS". */
  fallback: string;
  avatarSrc?: string;
}

export interface TopBarProps {
  user: TopBarUser;
  /** Unread notification count — shows a dot when > 0. */
  unread?: number;
  /**
   * Turn the search field into a trigger for a command palette. When supplied,
   * the field stops accepting inline typing and instead opens on click, focus or
   * ⌘K/Ctrl-K — the palette owns the query from there. Left out, the field stays
   * a plain input, so existing callers are unaffected.
   */
  onSearchActivate?: () => void;
  /** Placeholder for the search field. */
  searchPlaceholder?: string;
  /**
   * Account-menu destinations. The menu items render regardless; supplying a
   * handler is what makes one navigate. Left out, the item stays inert — which
   * is what every caller before these props got, so behaviour is unchanged.
   */
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  /** The hairline under the bar. Off = the bar runs straight into the panels below. */
  divider?: boolean;
  /**
   * USER VIEW CONFIGURATION (Pavan, 2026-11-16 — was "Accessibility", a row at
   * the foot of the sidebar). Given, the account menu offers it under Profile
   * and it opens as a panel under the avatar.
   */
  viewConfig?: React.ReactNode;
}

/**
 * Global application top bar — a full-width chrome band above the rail + content.
 * Centre: global search + the keyboard-shortcuts CTA. Right: notifications +
 * profile menu.
 */
export function TopBar({
  user,
  unread = 0,
  onSearchActivate,
  searchPlaceholder = "Search",
  onProfile,
  onSettings,
  onLogout,
  divider = true,
  viewConfig,
}: TopBarProps) {
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const configPanel = React.useRef<HTMLDivElement>(null);
  /* Escape or a press outside closes it; menus it opens live in a portal. */
  React.useEffect(() => {
    if (!configOpen) return;
    configPanel.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && setConfigOpen(false);
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (configPanel.current?.contains(t) || t.closest?.("[data-radix-popper-content-wrapper]")) return;
      setConfigOpen(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, [configOpen]);

  // ⌘K / Ctrl-K opens the palette from anywhere, which is what the field's own
  // hint promises. Only bound when there is a palette to open.
  React.useEffect(() => {
    if (!onSearchActivate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSearchActivate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearchActivate]);
  return (
    /* NO FILL OF ITS OWN — it sits on the shell's ground, so an app that tints
       its ground (Unified View, 2026-10-06) tints the bar with it. */
    /* `data-fp-frame` / `data-fp-on-frame` — at the far end of the
       Accessibility panel's Component background the shell ground goes near
       black, and what sits straight on it turns white (DS ui §10n). */
    <header data-fp-frame className={cn("flex h-12 shrink-0 items-center gap-3 bg-transparent px-3", divider && "border-b border-border")}>
      {/* Left — brand logo */}
      <div className="flex flex-1 items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground [&_svg]:size-5">
          <Boxes />
        </span>
        <span data-fp-on-frame className="truncate text-base font-semibold text-foreground">FleetPanda</span>
      </div>

      {/* Center — global search + keyboard shortcuts */}
      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              aria-label="Search"
              // As a palette trigger the field must not swallow the query: it is
              // read-only so typing goes to the palette's own input instead of
              // being lost here, and the caret is hidden to match.
              readOnly={Boolean(onSearchActivate)}
              onClick={onSearchActivate}
              onFocus={onSearchActivate}
              className={cn(
                /* NO RIM (Pavan, 2026-10-06) — the white field on the
                   shell ground is edge enough; the focus ring still shows. */
                "h-9 rounded-md border-transparent pl-8 shadow-none",
                onSearchActivate && "caret-transparent"
              )}
            />
            {onSearchActivate && (
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
                <Kbd>⌘K</Kbd>
              </span>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Keyboard shortcuts"
                  data-fp-on-frame
                  onClick={() => setShortcutsOpen(true)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Keyboard />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Right — notifications + profile */}
      <div className="flex flex-1 items-center justify-end gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications" data-fp-on-frame className="relative">
          <Bell />
          {unread > 0 && (
            <span
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-background"
              aria-label={`${unread} unread`}
            />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              data-fp-on-frame
              className="flex items-center gap-1.5 rounded-md p-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Avatar className="size-8">
                {user.avatarSrc && <AvatarImage src={user.avatarSrc} alt={user.name} />}
                <AvatarFallback>{user.fallback}</AvatarFallback>
              </Avatar>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onProfile}><UserRound /> Profile</DropdownMenuItem>
            {viewConfig && (
              <DropdownMenuItem onSelect={() => setConfigOpen(true)}>
                <AccessibilityIcon /> User view configuration
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onSettings}><Settings /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onLogout}><LogOut /> Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {configOpen && viewConfig && (
        <div
          ref={configPanel}
          role="dialog"
          aria-label="User view configuration"
          data-fp-panel
          tabIndex={-1}
          className="fixed top-14 right-2 z-50 max-w-[calc(var(--fp-vw)-1rem)] rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
        >
          {viewConfig}
        </div>
      )}

      <SideSheet
        variant="shortcuts"
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </header>
  );
}
