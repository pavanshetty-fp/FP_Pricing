import { Stack, SectionHeading } from "@/components/typography";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

/** Label showcase — accessible labels bound to a control. */
export function LabelDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Label</code> — bound to a control via{" "}
        <code>htmlFor</code>; clicking the label focuses/toggles the control.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="With input" />
        <div className="grid gap-2">
          <Label htmlFor="lbl-email">Email</Label>
          <Input id="lbl-email" type="email" placeholder="you@fleetpanda.com" />
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="With checkbox" />
        <label className="flex items-center gap-2">
          <Checkbox id="lbl-cb" defaultChecked /><Label htmlFor="lbl-cb">Remember me</Label>
        </label>
      </Stack>
    </Stack>
  );
}
