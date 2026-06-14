import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDES = ["top", "bottom", "left", "right"] as const;

/**
 * Tooltip showcase — Figma "Tooltip" (17103:809). The four Side variants plus
 * the Show KbdGroup option (a tooltip with a keyboard-shortcut hint).
 */
export function TooltipDemo() {
  return (
    <TooltipProvider>
      <Stack space="section" className="max-w-xl overflow-auto pb-10">
        <p className="text-sm text-muted-foreground">
          <code className="text-foreground">Tooltip</code> shows a short hint on
          hover or focus, pointing at its trigger from any side.
        </p>

        {/* Sides */}
        <Stack space="title">
          <SectionHeading as="h3" title="Sides" />
          <div className="flex flex-wrap gap-3">
            {SIDES.map((side) => (
              <Tooltip key={side}>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="capitalize">
                    {side}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={side}>This is a tooltip</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Stack>

        {/* With KbdGroup */}
        <Stack space="title">
          <SectionHeading as="h3" title="With shortcut (KbdGroup)" />
          <div className="flex flex-wrap gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Save</Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                Save changes
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>S</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Search</Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                Open search
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
          </div>
        </Stack>
      </Stack>
    </TooltipProvider>
  );
}
