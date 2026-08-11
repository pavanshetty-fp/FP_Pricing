import { Stack, SectionHeading } from "@/components/typography";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** Checkbox showcase — the full state set + a labelled example. */
export function CheckboxDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Checkbox</code> — unchecked / checked /
        indeterminate / disabled / invalid.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><Checkbox /> Unchecked</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Checked</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked="indeterminate" onCheckedChange={() => {}} /> Indeterminate</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox aria-invalid /> Invalid</label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox disabled /> Disabled</label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox disabled defaultChecked /> Disabled checked</label>
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="With label + description" />
        <div className="flex items-start gap-2">
          <Checkbox id="cb-terms" defaultChecked className="mt-0.5" />
          <div className="grid gap-0.5">
            <Label htmlFor="cb-terms">Accept terms</Label>
            <span className="text-xs text-muted-foreground">You agree to our terms and privacy policy.</span>
          </div>
        </div>
      </Stack>
    </Stack>
  );
}
