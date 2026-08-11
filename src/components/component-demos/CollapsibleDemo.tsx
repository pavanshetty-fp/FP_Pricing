import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

/** Collapsible showcase — show/hide a region under a trigger. */
export function CollapsibleDemo() {
  const [open, setOpen] = React.useState(true);
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">Collapsible</code> — expand/collapse a region under a trigger.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-md rounded-lg border border-fp-outline-1 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">@fleetpanda starred 3 repositories</span>
            <CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Toggle"><ChevronsUpDown /></Button></CollapsibleTrigger>
          </div>
          <div className="mt-2 rounded-md bg-fp-card-1 px-3 py-2 text-sm text-foreground">@fleetpanda/dispatch</div>
          <CollapsibleContent className="mt-2 flex flex-col gap-2">
            <div className="rounded-md bg-fp-card-1 px-3 py-2 text-sm text-foreground">@fleetpanda/routing</div>
            <div className="rounded-md bg-fp-card-1 px-3 py-2 text-sm text-foreground">@fleetpanda/ui</div>
          </CollapsibleContent>
        </Collapsible>
      </Stack>
    </Stack>
  );
}
