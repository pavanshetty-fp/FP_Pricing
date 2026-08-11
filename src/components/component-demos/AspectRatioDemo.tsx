import { Stack, SectionHeading } from "@/components/typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";

/** AspectRatio showcase — constrain content to a fixed ratio. */
export function AspectRatioDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">AspectRatio</code> — hold content to a ratio (media, embeds).</p>
      <Stack space="title">
        <SectionHeading as="h3" title="16 / 9" />
        <div className="w-full max-w-md">
          <AspectRatio ratio={16 / 9} className="rounded-lg bg-fp-card-1">
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">16 : 9</div>
          </AspectRatio>
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="1 / 1" />
        <div className="w-40">
          <AspectRatio ratio={1} className="rounded-lg bg-fp-card-1">
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">1 : 1</div>
          </AspectRatio>
        </div>
      </Stack>
    </Stack>
  );
}
