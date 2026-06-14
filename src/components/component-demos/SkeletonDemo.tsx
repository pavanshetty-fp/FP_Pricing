import { Stack, SectionHeading } from "@/components/typography";
import { Skeleton } from "@/components/ui/skeleton";

/** A labelled example. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="rounded-lg border border-border p-4">{children}</div>
    </div>
  );
}

/**
 * Skeleton showcase — Figma "Skeleton" (295:462). The bare Skeleton composed
 * into the documented loading patterns: Default (avatar + lines), Card, Text,
 * Form and Table.
 */
export function SkeletonDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Skeleton</code> is a pulsing
        placeholder shown while content loads. Compose the bare block into
        layout-matching shapes.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Patterns" />
        <div className="grid grid-cols-1 gap-4">
          {/* Default — avatar + two lines */}
          <Row label="Default">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </div>
          </Row>

          {/* Card — two lines + media block */}
          <Row label="Card">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </Row>

          {/* Text — two text lines */}
          <Row label="Text">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Row>

          {/* Form — label + input */}
          <Row label="Form">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-9 w-1/2 rounded-md" />
            </div>
          </Row>

          {/* Table — header + rows */}
          <Row label="Table">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </Row>
        </div>
      </Stack>
    </Stack>
  );
}
