import * as React from "react";
import { Stack, SectionHeading } from "@/components/typography";
import { Slider } from "@/components/ui/slider";

/** A labelled example. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * Slider showcase — Figma "Slider" (17382:13106). Covers Range (single / dual
 * thumb), the Disabled state, a stepped slider, and a live value readout.
 */
export function SliderDemo() {
  const [single, setSingle] = React.useState([40]);
  const [range, setRange] = React.useState([25, 75]);

  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Slider</code> selects a value (or a
        range) along a track. One thumb for a value, two for a range.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Variants" />
        <div className="flex flex-col gap-8">
          <Row label="Single (Range = No)">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Value</span>
              <span className="tabular-nums text-foreground">{single[0]}</span>
            </div>
            <Slider value={single} onValueChange={setSingle} max={100} step={1} />
          </Row>

          <Row label="Range (Range = Yes)">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Range</span>
              <span className="tabular-nums text-foreground">
                {range[0]} – {range[1]}
              </span>
            </div>
            <Slider value={range} onValueChange={setRange} max={100} step={1} />
          </Row>

          <Row label="Stepped (step = 10)">
            <Slider defaultValue={[50]} max={100} step={10} />
          </Row>

          <Row label="Disabled">
            <Slider defaultValue={[40]} max={100} disabled />
          </Row>
        </div>
      </Stack>
    </Stack>
  );
}
