import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const LEVELS = [0, 25, 50, 75, 100];

/**
 * Progress showcase — Figma "Progress" (296:4740). The Percent variants
 * (0/25/50/75/100) are just `value` levels of the same bar; plus a live
 * auto-advancing loader to show the fill transition.
 */
export function ProgressDemo() {
  const [value, setValue] = React.useState(15);

  // Auto-advance, looping 0→100. setInterval keeps running in the preview tab.
  React.useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => (v >= 100 ? 0 : v + 5));
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Progress</code> shows completion of a
        task. The fill is driven entirely by the <code>value</code> prop.
      </p>

      {/* Percent levels */}
      <Stack space="title">
        <SectionHeading as="h3" title="Percent levels" />
        <div className="flex flex-col gap-5">
          {LEVELS.map((p) => (
            <div key={p} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{p}%</span>
              </div>
              <Progress value={p} />
            </div>
          ))}
        </div>
      </Stack>

      {/* Live */}
      <Stack space="title">
        <SectionHeading as="h3" title="Live" />
        <div className="flex flex-col gap-3">
          <Progress value={value} />
          <div className="flex items-center justify-between">
            <span className="text-sm tabular-nums text-muted-foreground">
              {value}%
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setValue((v) => Math.max(0, v - 10))}
              >
                −10
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setValue((v) => Math.min(100, v + 10))}
              >
                +10
              </Button>
            </div>
          </div>
        </div>
      </Stack>
    </Stack>
  );
}
