import { BadgeCheck, ArrowRight } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Badge, BadgeNumber } from "@/components/ui";

/** Badge playground — Figma "Badge" page (23:995). */
export function BadgeDemo() {
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        Displays a badge or a component that looks like a badge.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Variants" />
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="verified">
            <BadgeCheck />
            Verified
          </Badge>
          <Badge variant="link">
            Link
            <ArrowRight />
          </Badge>
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Badge Number" />
        <div className="flex flex-wrap items-center gap-3">
          <BadgeNumber count={8} />
          <BadgeNumber count={60} variant="secondary" />
          <BadgeNumber count={3} variant="destructive" />
          <BadgeNumber count={12} variant="verified" />
          <BadgeNumber count={120} max={99} variant="outline" />
          <BadgeNumber count={500} max={20} />
        </div>
      </Stack>
    </Stack>
  );
}
