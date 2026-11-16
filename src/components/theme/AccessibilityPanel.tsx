import * as React from "react";
import { Minus, Moon, Plus, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { COMPONENT_STEPS, DISPLAY_STEPS, RESET_SHORTCUT, SCREENS, TEXT_STEPS, WEIGHT_STEPS, textOfStep, textStepOf, isDefaultA11y, resetA11y, setA11y, setTheme, useA11y, useTheme, type A11y, type ScreenKey } from "./a11y";

/*
  THE ACCESSIBILITY PANEL (Pavan, 2026-10-21; DS ui §10n) — opened from the
  main navigation. Everything changes the page as it moves, is saved, and
  applies across every module. In this order (Pavan, 2026-10-21):

    Theme                 Light | Dark, on top
    Text size             six steps, 100% – 130%; only the text grows
    Text weight           on top — six steps, every weight up together
    Component width & space  100% – 150%; lanes and table columns widen
    Stroke contrast       rims, dividers, field borders — Default → Maximum
    Fill contrast         grays go darker, whites stay white, text follows
                          — Default → Maximum
                          (renamed and Text color removed, Pavan, 2026-10-24)
    ── divider ──
    Display size          50% – 150% in five steps, 100% in the middle —
                          scales every component and view

  THE TWO SIZES ARE STEPS, LIKE ANDROID'S "Display size and text" (Pavan,
  2026-10-23): − and + either side of a track with a dot on every step.

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

/** A STEPPED SIZE — − · a track with a dot per step · +. */
function StepRow({
  label,
  step,
  steps,
  shown,
  onChange,
  disabled,
}: {
  label: string;
  step: number;
  /** The last step's index (steps + 1 dots). */
  steps: number;
  shown: string;
  onChange: (step: number) => void;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="text-sm tabular-nums text-foreground">{shown}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label={`Smaller ${label.toLowerCase()}`} disabled={disabled || step <= 0} onClick={() => onChange(step - 1)}>
          <Minus />
        </Button>
        <div className="relative flex-1">
          <Slider aria-labelledby={id} min={0} max={steps} step={1} value={[step]} disabled={disabled} onValueChange={([v]) => onChange(v)} />
          {/* A DOT ON EVERY STEP, under the thumb's travel. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-1">
            {Array.from({ length: steps + 1 }, (_, i) => (
              <span key={i} className={i <= step ? "size-1 rounded-full bg-primary-foreground" : "size-1 rounded-full bg-muted-foreground"} />
            ))}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Larger ${label.toLowerCase()}`} disabled={disabled || step >= steps} onClick={() => onChange(step + 1)}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function AccessibilityPanel() {
  const theme = useTheme();
  const a = useA11y();
  const set = (k: keyof A11y) => (v: number) => setA11y({ [k]: v });
  const pct = (v: number) => (v === 0 ? "Default" : v === 100 ? "Maximum" : `${v}%`);
  return (
    /* ALWAYS FITS THE WINDOW, at any Display size — it scrolls inside. */
    <div className="flex max-h-[calc(var(--fp-vh)*0.85)] w-80 max-w-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">User view configuration</h2>
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

        {/* TEXT WEIGHT, ON TOP (Pavan, 2026-10-26) — every weight heavier by
            the same step, so the hierarchy between them holds. */}
        <StepRow
          label="Text weight"
          step={a.weight}
          steps={WEIGHT_STEPS}
          shown={a.weight === 0 ? "Default" : `+${a.weight}`}
          onChange={(v) => setA11y({ weight: v })}
        />
        <StepRow
          label="Text size"
          step={textStepOf(a.text)}
          steps={TEXT_STEPS}
          shown={`${Math.round(100 + a.text * 0.3)}%`}
          onChange={(v) => setA11y({ text: textOfStep(v) })}
        />
        {/* COMPONENT WIDTH & SPACE (Pavan, 2026-10-25; named 2026-10-26) —
            lanes and table columns get wider, the text stays; cut-off text
            shows in full once it fits. */}
        <StepRow
          label="Component width & space"
          step={COMPONENT_STEPS.indexOf(a.component)}
          steps={COMPONENT_STEPS.length - 1}
          shown={`${Math.round(a.component * 100)}%`}
          onChange={(v) => setA11y({ component: COMPONENT_STEPS[v] })}
        />

        {/* NO TEXT COLOR SLIDER (Pavan, 2026-10-24) — text contrast follows
            Contrast (a11y.ts), so the two never pull apart. */}
        <div className="flex flex-col gap-4">
          <Row label="Stroke contrast" value={a.stroke} shown={pct(a.stroke)} onChange={set("stroke")} ends={["Default", "Maximum"]} />
          <Row label="Fill contrast" value={a.background} shown={pct(a.background)} onChange={set("background")} ends={["Default", "Maximum"]} />
        </div>

        <Separator />

        {/* DISPLAY SIZE — 50% to 150%, 100% in the middle (Pavan, 2026-10-23). */}
        <StepRow
          label="Display size"
          step={DISPLAY_STEPS.indexOf(a.display)}
          steps={DISPLAY_STEPS.length - 1}
          shown={`${Math.round(a.display * 100)}%`}
          onChange={(v) => setA11y({ display: DISPLAY_STEPS[v] })}
        />
        {/* THE SCREEN (Pavan, 2026-10-26) — Default changes nothing; each
            screen sets the zoom it is read at, on top of Display size. */}
        <div className="flex flex-col gap-2">
          <span id="a11y-screen" className="text-sm font-medium text-foreground">
            Screen
          </span>
          <Select value={a.screen} onValueChange={(v) => setA11y({ screen: v as ScreenKey })}>
            <SelectTrigger aria-labelledby="a11y-screen" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCREENS.map((sc) => (
                <SelectItem key={sc.key} value={sc.key}>
                  {sc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
