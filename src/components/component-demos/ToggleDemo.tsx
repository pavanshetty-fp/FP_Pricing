import { Bold, Italic, Underline } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Toggle } from "@/components/ui/toggle";

/** Toggle showcase — two-state button: off / on / disabled, default + outline. */
export function ToggleDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Toggle</code> — a two-state button
        (off / on / disabled), in default and outline variants.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <div className="flex items-center gap-3">
          <Toggle aria-label="Bold"><Bold /></Toggle>
          <Toggle aria-label="Italic" defaultPressed><Italic /></Toggle>
          <Toggle aria-label="Underline" disabled><Underline /></Toggle>
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Outline + with text" />
        <div className="flex items-center gap-3">
          <Toggle variant="outline"><Bold />Bold</Toggle>
          <Toggle variant="outline" defaultPressed><Italic />Italic</Toggle>
        </div>
      </Stack>
    </Stack>
  );
}
