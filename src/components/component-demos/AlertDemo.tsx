import { Info, TriangleAlert } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/** Alert showcase — inline contextual callouts (default / destructive). */
export function AlertDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Alert</code> — inline callouts for
        contextual messages, with an icon, title and description.
      </p>
      <Stack space="title">
        <SectionHeading as="h3" title="Variants" />
        <Alert>
          <Info />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>A default alert with an icon, title and description.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>Your changes could not be saved. Try again.</AlertDescription>
        </Alert>
        <Alert>
          <Info />
          <AlertTitle>Title only</AlertTitle>
        </Alert>
      </Stack>
    </Stack>
  );
}
