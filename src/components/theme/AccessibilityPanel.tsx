import * as React from "react";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RESET_SHORTCUT, SCREENS, autoScreen, isDefaultA11y, resetA11y, setA11y, setTheme, useA11y, useTheme, zoomOf, type A11y } from "./a11y";

/*
  THE ACCESSIBILITY PANEL (Pavan, 2026-10-21; DS ui §10n) — opened from the
  main navigation. Everything changes the page as it moves, is saved, and
  applies across every module. In this order (Pavan, 2026-10-21):

    Theme                 Light | Dark, on top
    Text size             100% – 130%
    Text colour           secondary and coloured text — Default → Maximum
    Component stroke      rims, dividers, field borders — Default → Maximum
    Component background  greys go darker, whites stay white — Default → Maximum
    ── divider ──
    Screen size           a stepped slider: up to 16″, 24″, 34″, a TV —
                          scales every component and view; Auto picks the step

  Reset is the icon in the header (⌘⌥0 too). Text on colour fills picks white
  or dark by itself.
*/

function Row({
  label,
  value,
  shown,
  onChange,
  ends,
  min = 0,
  max = 100,
  step = 5,
  disabled,
  aside,
}: {
  label: string;
  value: number;
  shown: string;
  onChange: (v: number) => void;
  ends: string[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  aside?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="flex items-center gap-3">
          {aside}
          <span className="text-sm tabular-nums text-foreground">{shown}</span>
        </span>
      </div>
      <Slider
        aria-labelledby={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        {ends.map((e) => (
          <span key={e}>{e}</span>
        ))}
      </div>
    </div>
  );
}

export function AccessibilityPanel() {
  const theme = useTheme();
  const a = useA11y();
  const set = (k: keyof A11y) => (v: number) => setA11y({ [k]: v });
  const pct = (v: number) => (v === 0 ? "Default" : v === 100 ? "Maximum" : `${v}%`);
  const auto = a.screen === "auto";
  const step = SCREENS.findIndex((s) => s.key === (auto ? autoScreen() : a.screen));
  return (
    /* ALWAYS FITS THE WINDOW, at any Screen size — it scrolls inside. */
    <div className="flex max-h-[calc(var(--fp-vh)*0.85)] w-80 max-w-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Accessibility</h2>
        {/* RESET — THE ICON ALONE (Pavan, 2026-10-21). */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Reset to default (${RESET_SHORTCUT})`}
                disabled={isDefaultA11y(a)}
                onClick={resetA11y}
              >
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset to default · {RESET_SHORTCUT}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-4">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={theme}
          onValueChange={(v) => v && setTheme(v as "light" | "dark")}
          aria-label="Theme"
          className="w-full"
        >
          <ToggleGroupItem value="light" className="flex-1 gap-1.5 font-normal data-[state=on]:font-medium">
            <Sun className="size-4" />
            Light
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" className="flex-1 gap-1.5 font-normal data-[state=on]:font-medium">
            <Moon className="size-4" />
            Dark
          </ToggleGroupItem>
        </ToggleGroup>

        {/* TEXT — size and colour together. */}
        <div className="flex flex-col gap-4">
          <Row label="Text size" value={a.text} shown={`${Math.round(100 + a.text * 0.3)}%`} onChange={set("text")} ends={["100%", "130%"]} />
          <Row label="Text colour" value={a.ink} shown={pct(a.ink)} onChange={set("ink")} ends={["Default", "Maximum"]} />
        </div>

        <div className="flex flex-col gap-4">
          <Row label="Component stroke" value={a.stroke} shown={pct(a.stroke)} onChange={set("stroke")} ends={["Default", "Maximum"]} />
          <Row label="Component background" value={a.background} shown={pct(a.background)} onChange={set("background")} ends={["Default", "Maximum"]} />
        </div>

        <Separator />

        {/* SCREEN SIZE — a stepped slider, each step the largest screen it's for. */}
        <Row
          label="Screen size"
          value={step}
          min={0}
          max={SCREENS.length - 1}
          step={1}
          disabled={auto}
          shown={`${Math.round(zoomOf(a.screen) * 100)}%`}
          onChange={(v) => setA11y({ screen: SCREENS[v].key })}
          ends={SCREENS.map((s) => s.max)}
          aside={
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Auto
              <Switch
                checked={auto}
                aria-label="Match this screen"
                onCheckedChange={(on) => setA11y({ screen: on ? "auto" : SCREENS[step].key })}
              />
            </label>
          }
        />
      </div>
    </div>
  );
}
