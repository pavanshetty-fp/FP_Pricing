import { Stack, SectionHeading } from "@/components/typography";
import { Separator } from "@/components/ui/separator";

/**
 * Separator showcase — Figma "Separator" (118:2690). The two orientations:
 * a full-width horizontal rule between blocks, and a vertical divider between
 * inline items.
 */
export function SeparatorDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Separator</code> visually or
        semantically divides content — horizontally between blocks or vertically
        between inline items.
      </p>

      {/* Horizontal */}
      <Stack space="title">
        <SectionHeading as="h3" title="Horizontal" />
        <div>
          <div className="space-y-1">
            <h4 className="text-sm leading-none font-medium">FP Design System</h4>
            <p className="text-sm text-muted-foreground">
              FleetPanda's shadcn spinoff.
            </p>
          </div>
          <Separator className="my-4" />
          <div className="flex h-5 items-center gap-4 text-sm">
            <span>Blog</span>
            <Separator orientation="vertical" />
            <span>Docs</span>
            <Separator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      </Stack>

      {/* Vertical */}
      <Stack space="title">
        <SectionHeading as="h3" title="Vertical" />
        <div className="flex h-16 items-center gap-4 rounded-md border border-border p-4 text-sm">
          <span className="text-muted-foreground">Left</span>
          <Separator orientation="vertical" />
          <span className="text-muted-foreground">Middle</span>
          <Separator orientation="vertical" />
          <span className="text-muted-foreground">Right</span>
        </div>
      </Stack>
    </Stack>
  );
}
