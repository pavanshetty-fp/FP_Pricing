import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** ToggleGroup showcase — multiple (formatting) and single (alignment) selection. */
export function ToggleGroupDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">ToggleGroup</code> — a set of toggles:
        multiple selection (formatting) or single selection (alignment).
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Multiple" />
        <ToggleGroup type="multiple" defaultValue={["bold"]}>
          <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>
        </ToggleGroup>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="Single + outline" />
        <ToggleGroup type="single" defaultValue="center" variant="outline">
          <ToggleGroupItem value="left" aria-label="Left"><AlignLeft /></ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Center"><AlignCenter /></ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Right"><AlignRight /></ToggleGroupItem>
        </ToggleGroup>
      </Stack>
    </Stack>
  );
}
