import { Stack, SectionHeading } from "@/components/typography";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const TAGS = Array.from({ length: 40 }).map((_, i) => `v1.2.0-beta.${40 - i}`);

/** ScrollArea showcase — a styled cross-browser scroll container. */
export function ScrollAreaDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">ScrollArea</code> — a styled, cross-browser scroll region.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Vertical list" />
        <ScrollArea className="h-64 w-56 rounded-md border border-fp-outline-1">
          <div className="p-3">
            <h4 className="mb-2 text-sm font-medium text-foreground">Tags</h4>
            {TAGS.map((t) => (
              <div key={t}>
                <div className="py-1.5 text-sm text-muted-foreground">{t}</div>
                <Separator />
              </div>
            ))}
          </div>
        </ScrollArea>
      </Stack>
    </Stack>
  );
}
