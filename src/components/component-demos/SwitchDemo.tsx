import { cn } from "@/lib/utils";
import { Stack, SectionHeading } from "@/components/typography";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Default labelled switch: control + label + optional description. */
function SwitchRow({
  id,
  label,
  description,
  end,
  disabled,
  defaultChecked,
  size,
}: {
  id: string;
  label: string;
  description?: string;
  end?: boolean;
  disabled?: boolean;
  defaultChecked?: boolean;
  size?: "sm" | "default";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        end && "flex-row-reverse justify-end"
      )}
    >
      <Switch
        id={id}
        size={size}
        disabled={disabled}
        defaultChecked={defaultChecked}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="font-normal">
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
function SwitchCard({
  id,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border bg-fp-surface-1a p-4 font-normal transition-colors",
        "has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-fp-surface-1b"
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} defaultChecked={defaultChecked} className="mt-0.5" />
    </Label>
  );
}

/**
 * Switch showcase — Figma "Switch" (60:450). Covers the documented axes: sizes
 * (default / sm), label + description, the Box (card) type, control placement
 * (start / end), and disabled / invalid states.
 */
export function SwitchDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Switch</code> toggles a single setting
        on or off. The bare control composes with a label and description; the
        Box type wraps it in a selectable card.
      </p>

      {/* Sizes + on/off */}
      <Stack space="title">
        <SectionHeading as="h3" title="Sizes" />
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Switch id="sz-default" defaultChecked />
            <Label htmlFor="sz-default" className="font-normal">
              default
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="sz-sm" size="sm" defaultChecked />
            <Label htmlFor="sz-sm" className="font-normal">
              sm
            </Label>
          </div>
        </div>
      </Stack>

      {/* Label + description */}
      <Stack space="title">
        <SectionHeading as="h3" title="Label + description" />
        <div className="flex flex-col gap-4">
          <SwitchRow
            id="notif"
            label="Email notifications"
            description="Receive a summary of activity each morning."
            defaultChecked
          />
          <SwitchRow
            id="market"
            label="Marketing emails"
            description="Product news and occasional offers."
          />
        </div>
      </Stack>

      {/* Box type */}
      <Stack space="title">
        <SectionHeading as="h3" title="Box type" />
        <div className="flex flex-col gap-3">
          <SwitchCard
            id="box-2fa"
            label="Two-factor authentication"
            description="Add an extra layer of security at sign-in."
            defaultChecked
          />
          <SwitchCard
            id="box-beta"
            label="Beta features"
            description="Opt into features still in development."
          />
        </div>
      </Stack>

      {/* Control placement */}
      <Stack space="title">
        <SectionHeading as="h3" title="Control placement" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Start</span>
            <SwitchRow id="ps-1" label="Wi-Fi" defaultChecked />
            <SwitchRow id="ps-2" label="Bluetooth" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">End</span>
            <SwitchRow id="pe-1" label="Wi-Fi" defaultChecked end />
            <SwitchRow id="pe-2" label="Bluetooth" end />
          </div>
        </div>
      </Stack>

      {/* States */}
      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Disabled</span>
            <SwitchRow id="d-on" label="Disabled (on)" disabled defaultChecked />
            <SwitchRow id="d-off" label="Disabled (off)" disabled />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Invalid</span>
            <div className="flex items-center gap-3">
              <Switch id="inv" aria-invalid />
              <Label htmlFor="inv" className="font-normal">
                Accept terms
              </Label>
            </div>
            <span className="text-xs text-destructive">
              You must enable this to continue.
            </span>
          </div>
        </div>
      </Stack>
    </Stack>
  );
}
