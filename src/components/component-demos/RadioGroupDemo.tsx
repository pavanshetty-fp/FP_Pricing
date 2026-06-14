import * as React from "react";
import { cn } from "@/lib/utils";
import { Stack, SectionHeading } from "@/components/typography";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/** Default labelled radio: control + label + optional description. */
function RadioRow({
  value,
  label,
  description,
  end,
  disabled,
}: {
  value: string;
  label: string;
  description?: string;
  end?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        end && "flex-row-reverse justify-end"
      )}
    >
      <RadioGroupItem value={value} id={value} disabled={disabled} className="mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={value} className="font-normal">
          {label}
        </Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}

/** Box type: the whole bordered card is the control, highlighted when checked. */
function RadioCard({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <Label
      htmlFor={`box-${value}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-fp-surface-1a p-4 font-normal transition-colors",
        "has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-fp-surface-1b"
      )}
    >
      <RadioGroupItem value={value} id={`box-${value}`} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Label>
  );
}

/**
 * Radio Group showcase — Figma "RadioButton" (65:326). Covers the documented
 * axes: label + description, the Box (card) type, control placement
 * (start / end), and disabled / invalid states.
 */
export function RadioGroupDemo() {
  const [invalid, setInvalid] = React.useState("");

  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">RadioGroup</code> lets the user pick a
        single option. The bare control composes with a label and description;
        the Box type wraps it in a selectable card.
      </p>

      {/* Default + description */}
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <RadioGroup defaultValue="comfortable">
          <RadioRow value="default" label="Default" description="System default spacing." />
          <RadioRow value="comfortable" label="Comfortable" description="A little more breathing room." />
          <RadioRow value="compact" label="Compact" description="Denser rows, more on screen." />
        </RadioGroup>
      </Stack>

      {/* Box type */}
      <Stack space="title">
        <SectionHeading as="h3" title="Box type" />
        <RadioGroup defaultValue="card-2" className="md:grid-cols-2">
          <RadioCard value="card-1" label="Starter" description="For small fleets getting started." />
          <RadioCard value="card-2" label="Growth" description="Scaling operations and pricing." />
        </RadioGroup>
      </Stack>

      {/* Control placement */}
      <Stack space="title">
        <SectionHeading as="h3" title="Control placement" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Start</span>
            <RadioGroup defaultValue="s1">
              <RadioRow value="s1" label="Option A" />
              <RadioRow value="s2" label="Option B" />
            </RadioGroup>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">End</span>
            <RadioGroup defaultValue="e1">
              <RadioRow value="e1" label="Option A" end />
              <RadioRow value="e2" label="Option B" end />
            </RadioGroup>
          </div>
        </div>
      </Stack>

      {/* States */}
      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Disabled</span>
            <RadioGroup defaultValue="d1">
              <RadioRow value="d1" label="Enabled" />
              <RadioRow value="d2" label="Disabled" disabled />
            </RadioGroup>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Invalid (pick to clear)
            </span>
            <RadioGroup value={invalid} onValueChange={setInvalid}>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="i1" id="i1" aria-invalid={!invalid} />
                <Label htmlFor="i1" className="font-normal">
                  I agree
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="i2" id="i2" aria-invalid={!invalid} />
                <Label htmlFor="i2" className="font-normal">
                  I disagree
                </Label>
              </div>
            </RadioGroup>
            {!invalid && (
              <span className="text-xs text-destructive">
                Please select an option.
              </span>
            )}
          </div>
        </div>
      </Stack>
    </Stack>
  );
}
