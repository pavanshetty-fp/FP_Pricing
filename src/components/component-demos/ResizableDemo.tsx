import { Stack, SectionHeading } from "@/components/typography";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

/** Resizable showcase — draggable split panels (react-resizable-panels). */
export function ResizableDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">Resizable</code> — draggable split panels; drag a handle to resize.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Horizontal + nested" />
        <ResizablePanelGroup orientation="horizontal" className="h-48 w-full max-w-lg rounded-lg border border-fp-outline-1">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">One</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">Two</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">Three</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Stack>
    </Stack>
  );
}
