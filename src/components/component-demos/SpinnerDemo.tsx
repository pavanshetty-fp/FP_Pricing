import { Stack, SectionHeading } from "@/components/typography";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

/** Spinner showcase — an animated loading indicator. */
export function SpinnerDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">Spinner</code> — an animated loading indicator.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Sizes" />
        <div className="flex items-center gap-6 text-muted-foreground">
          <Spinner className="size-4" />
          <Spinner className="size-6" />
          <Spinner className="size-8" />
        </div>
      </Stack>
      <Stack space="title">
        <SectionHeading as="h3" title="In a button" />
        <div className="flex items-center gap-3">
          <Button disabled><Spinner />Loading…</Button>
          <Button variant="outline" disabled><Spinner />Please wait</Button>
        </div>
      </Stack>
    </Stack>
  );
}
