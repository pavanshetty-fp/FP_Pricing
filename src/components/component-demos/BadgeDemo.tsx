import { BadgeCheck, ArrowRight } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Badge, BadgeNumber, CodeDisc } from "@/components/ui";

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
        <SectionHeading
          as="h3"
          title="Pastel variants"
          description="Soft fills that read as a pastel in both themes — one pair per hue, shared across Light and FP. The DS ships the hues; an application binds the meaning."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="pastel-blue">Pastel blue</Badge>
          <Badge variant="pastel-amber">Pastel amber</Badge>
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading
          as="h3"
          title="Code disc"
          description="A 16px pastel circle carrying an initial, for dense rows where a full pill will not fit. The full word is both the tooltip and the aria-label, so the letter is never the only carrier of meaning — hover or tab to one."
        />
        <div className="flex flex-wrap items-center gap-3">
          <CodeDisc code="D" label="Delivery" tone="pastel-blue" />
          <CodeDisc code="E" label="Extraction" tone="pastel-amber" />
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            inline in a row:
            <CodeDisc code="D" label="Delivery" />
            Table Cell Text
          </span>
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
