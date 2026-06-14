import { toast } from "sonner";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";

/**
 * Sonner showcase — Figma "Sonner" (18482:48401). Buttons fire each toast type
 * (default / success / error / info / warning / loading) plus the description
 * and action variants. The <Toaster /> is mounted once at the app root.
 */
export function SonnerDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Sonner</code> renders stacked toast
        notifications. Trigger one with <code>toast()</code>; type, description
        and an action are all options.
      </p>

      {/* Types (Sonner / Icon variants) */}
      <Stack space="title">
        <SectionHeading as="h3" title="Types" />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toast("Event has been created")}
          >
            Default
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success("Changes saved successfully")}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Something went wrong")}
          >
            Error
          </Button>
          <Button variant="outline" onClick={() => toast.info("New update available")}>
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.warning("Your trial ends in 3 days")}
          >
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const id = toast.loading("Uploading…");
              setTimeout(() => toast.success("Uploaded", { id }), 1500);
            }}
          >
            Loading → Success
          </Button>
        </div>
      </Stack>

      {/* Description + Action */}
      <Stack space="title">
        <SectionHeading as="h3" title="Description & action" />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toast("Scheduled: Catch up", {
                description: "Friday, June 20 at 10:00 AM",
              })
            }
          >
            With description
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast("File deleted", {
                description: "report-q2.pdf was moved to trash.",
                action: {
                  label: "Undo",
                  onClick: () => toast.success("Restored report-q2.pdf"),
                },
              })
            }
          >
            With action
          </Button>
        </div>
      </Stack>
    </Stack>
  );
}
