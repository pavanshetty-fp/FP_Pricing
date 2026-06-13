import { FileText, Inbox, SearchX, Plus } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Empty state showcase — Figma "Empty" (18672:2962). The icon media variant
 * with the header (media + title + description) and content (actions) slots.
 * Also wired live into the Tables zero-results state.
 */
export function EmptyDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        A centred placeholder for a region with no content — icon media, title,
        description, and an actions slot.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="With actions" />
        <div className="rounded-lg border border-border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create your first project to start tracking shipments, pricing
                and assets in one place.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">
                <Plus />
                Create project
              </Button>
              <Button variant="link" size="sm">
                Learn more
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Title only" />
        <div className="rounded-lg border border-border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Your inbox is empty</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Search — no results" />
        <div className="rounded-lg border border-border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>No matching records</EmptyTitle>
              <EmptyDescription>
                Try a different term or clear the search. This is the same state
                used in the Tables zero-results view.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                Clear search
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </Stack>
    </Stack>
  );
}
