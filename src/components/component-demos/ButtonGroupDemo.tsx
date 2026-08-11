import { Bold, Italic, Underline } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";

/** ButtonGroup showcase — attached buttons acting as one control. */
export function ButtonGroupDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">ButtonGroup</code> — attached buttons that read as a single control.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Segmented" />
        <ButtonGroup>
          <Button variant="outline">Day</Button>
          <Button variant="outline">Week</Button>
          <Button variant="outline">Month</Button>
        </ButtonGroup>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Icons + separator" />
        <ButtonGroup>
          <Button variant="outline" size="icon" aria-label="Bold"><Bold /></Button>
          <Button variant="outline" size="icon" aria-label="Italic"><Italic /></Button>
          <ButtonGroupSeparator />
          <Button variant="outline" size="icon" aria-label="Underline"><Underline /></Button>
        </ButtonGroup>
      </Stack>
    </Stack>
  );
}
