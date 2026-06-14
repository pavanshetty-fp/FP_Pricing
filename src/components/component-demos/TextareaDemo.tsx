import { Stack, SectionHeading } from "@/components/typography";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** A labelled example. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * Textarea showcase — Figma "Textarea" (183:74). The documented states:
 * Default, Filled, Focus (interactive), Disabled and Error (aria-invalid).
 */
export function TextareaDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Textarea</code> is a multi-line text
        input. It grows with content and carries the same states as the input
        (default / filled / focus / disabled / error).
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="States" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label="Default">
            <Textarea placeholder="Placeholder" className="min-h-24" />
          </Row>
          <Row label="Filled">
            <Textarea
              defaultValue="The quick brown fox jumps over the lazy dog."
              className="min-h-24"
            />
          </Row>
          <Row label="Disabled">
            <Textarea placeholder="Placeholder" disabled className="min-h-24" />
          </Row>
          <Row label="Error">
            <Textarea
              defaultValue="Too short"
              aria-invalid
              className="min-h-24"
            />
          </Row>
        </div>
        <p className="text-xs text-muted-foreground">
          Focus state appears on click/tab (ring). The control auto-grows with
          content via <code className="text-foreground">field-sizing</code>.
        </p>
      </Stack>

      {/* With label */}
      <Stack space="title">
        <SectionHeading as="h3" title="With label" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ta-bio">Bio</Label>
          <Textarea
            id="ta-bio"
            placeholder="Tell us a little about yourself"
            className="min-h-28"
          />
          <span className="text-xs text-muted-foreground">
            Markdown is supported.
          </span>
        </div>
      </Stack>
    </Stack>
  );
}
