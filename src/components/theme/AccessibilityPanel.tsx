import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESET_SHORTCUT, SCREENS, autoScreen, isDefaultA11y, resetA11y, setA11y, setTheme, useA11y, useTheme, zoomOf, type A11y, type ScreenSize } from "./a11y";

/*
  THE ACCESSIBILITY PANEL (Pavan, 2026-10-21; DS ui §10n) — opened from the
  main navigation. Everything changes the page as it moves, is saved, and
  applies across every module:

    Theme          Light | Dark
    Text size      100% – 130%
    Screen size    Auto · Laptop · Monitor · Large monitor · TV or projector —
                   scales every component and view for the display it's on
                   (an extension or a mirror of the laptop)
    Contrast
      Stroke       rims, dividers, field borders — theme · WCAG (3:1+) · maximum
      Layers       foreground and background — theme · WCAG (text 7:1) · maximum
*/

function Row({
  label,
  sub,
  value,
  shown,
  onChange,
  ends,
  min = 0,
  max = 100,
  step = 5,
}: {
  label: string;
  sub?: string;
  value: number;
  shown: string;
  onChange: (v: number) => void;
  ends: string[];
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex flex-col">
          <span id={id} className="text-sm font-medium text-foreground">
            {label}
          </span>
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </span>
        <span className="text-sm tabular-nums text-foreground">{shown}</span>
      </div>
      <Slider aria-labelledby={id} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
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
  /* DEFAULT · WCAG AT THE MIDDLE · MAXIMUM (Pavan, 2026-10-21). */
  const pct = (v: number) => (v === 0 ? "Default" : v === 50 ? "WCAG" : v === 100 ? "Maximum" : `${v}%`);
  const auto = SCREENS.find((s) => s.key === autoScreen())!;
  return (
    /* ALWAYS FITS THE WINDOW, at any Screen size — it scrolls inside. */
    <div className="flex max-h-[calc(var(--fp-vh)*0.85)] w-80 max-w-full flex-col">
      {/* THE WAY BACK, ALWAYS IN VIEW at the top (Pavan, 2026-10-21). */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Accessibility</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={isDefaultA11y(a)}
          onClick={resetA11y}
          title={`Reset to default (${RESET_SHORTCUT})`}
        >
          <RotateCcw />
          Reset to default
        </Button>
      </div>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-4">

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Theme</span>
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
      </div>

      <Row
        label="Text size"
        value={a.text}
        shown={`${Math.round(100 + a.text * 0.3)}%`}
        onChange={set("text")}
        ends={["100%", "130%"]}
      />

      {/* THE DISPLAY IT'S ON — everything scales by one zoom. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Screen size</span>
          <span className="text-sm tabular-nums text-foreground">{Math.round(zoomOf(a.screen) * 100)}%</span>
        </div>
        <Select value={a.screen} onValueChange={(v) => setA11y({ screen: v as ScreenSize })}>
          <SelectTrigger className="w-full" aria-label="Screen size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto — {auto.label.toLowerCase()}</SelectItem>
            {SCREENS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label} · {s.hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-4">
        <span className="text-sm font-semibold text-foreground">Contrast</span>
        <Row label="Stroke" sub="Rims, dividers and field borders" value={a.stroke} shown={pct(a.stroke)} onChange={set("stroke")} ends={["Default", "WCAG", "Maximum"]} />
        <Row label="Layers" sub="Foreground and background" value={a.layers} shown={pct(a.layers)} onChange={set("layers")} ends={["Default", "WCAG", "Maximum"]} />
      </div>
      </div>
    </div>
  );
}
