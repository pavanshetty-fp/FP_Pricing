import * as React from "react";
import { Check, CircleCheck } from "lucide-react";
import { MODULES } from "./data";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/** Completion celebration — a white check-circle that pops in. Linear/clean per the DS. */
function CompletionBurst() {
  return (
    <CircleCheck
      className="module-check-pop size-5 shrink-0 text-brand-foreground"
      strokeWidth={2.25}
    />
  );
}

export interface ModuleSwitcherProps {
  /** Pins the rail open while the menu is up. */
  onOpenChange?: (open: boolean) => void;
  /**
   * CONTROLLED mode — the active module key. Omit for the uncontrolled
   * behaviour (the switcher remembers its own selection, which is all the DS
   * gallery needs).
   */
  activeModule?: string;
  /**
   * Fires once the switch actually commits — i.e. AFTER the progress bar, at the
   * same moment the tick appears, not on click. An app that swaps its whole
   * navigation on this must not do it under the user's cursor mid-animation.
   */
  onModuleChange?: (key: string) => void;
}

/**
 * Tier-1 rail module switcher (top of the rail). Shows the active module —
 * icon-only when the rail is collapsed, icon + name when expanded. Opening it
 * pins the rail open (via `onOpenChange`) and drops a menu below the trigger, so
 * the switch happens inside the open rail.
 *
 * Controlled or uncontrolled. Pass `activeModule` + `onModuleChange` when the
 * module drives real routing (the Unified View prototype does); pass neither and
 * it keeps its own state, which is the gallery's case. The switch animation is
 * identical either way — only where the resulting selection is stored moves.
 */
export function ModuleSwitcher({
  onOpenChange,
  activeModule,
  onModuleChange,
}: ModuleSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const [ownKey, setOwnKey] = React.useState("sales");
  const [switchingKey, setSwitchingKey] = React.useState<string | null>(null);
  const [completedKey, setCompletedKey] = React.useState<string | null>(null);
  // Controlled when `activeModule` is supplied; otherwise the local key wins.
  const activeKey = activeModule ?? ownKey;
  const active = MODULES.find((m) => m.key === activeKey) ?? MODULES[0];

  const setMenuOpen = (o: boolean) => {
    setOpen(o);
    onOpenChange?.(o);
  };

  // On select: keep the menu open, run a quick left→right progress bar, then a
  // completion burst (circle + tick + slight confetti), then close the popup.
  const selectModule = (key: string) => (e: Event) => {
    e.preventDefault();
    if (switchingKey || completedKey) return;
    setSwitchingKey(key);
    window.setTimeout(() => {
      setOwnKey(key);
      onModuleChange?.(key);
      setSwitchingKey(null);
      setCompletedKey(key);
      window.setTimeout(() => {
        setCompletedKey(null);
        setMenuOpen(false);
      }, 750);
    }, 600);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Module: ${active.name}. Click to switch module`}
          className="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1 text-left outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-sidebar-accent/60"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground [&_svg]:size-5">
            {active.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[expanded=true]:opacity-100">
            {active.name}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {MODULES.map((m) => {
          const isSwitching = switchingKey === m.key;
          const isCompleting = completedKey === m.key;
          return (
            <DropdownMenuItem
              key={m.key}
              onSelect={selectModule(m.key)}
              className="relative gap-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-sidebar-accent text-sidebar-foreground [&_svg]:size-4">
                {m.icon}
              </span>
              <span className="flex-1 truncate">{m.name}</span>
              {isCompleting ? (
                <CompletionBurst />
              ) : m.key === activeKey && !isSwitching ? (
                <Check className="size-4 shrink-0 text-foreground duration-200 animate-in zoom-in-50 fade-in" />
              ) : null}
              {isSwitching && (
                <span
                  className="module-switch-progress pointer-events-none absolute inset-x-1 bottom-0.5 h-0.5 rounded-full bg-brand"
                  aria-hidden
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
