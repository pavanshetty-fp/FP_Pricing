import { Stack, SectionHeading } from "@/components/typography";
import {
  InvoiceCard,
  BarChartCard,
  DonutCard,
  PaybackCard,
} from "@/components/info-cards";

/**
 * Information Card showcase — Figma "Information Card & tooltip" (27597:62089).
 * The richer content cards that surface on hover or sit inline: the invoice
 * price breakdown and the chart cards.
 */
export function InformationCardDemo() {
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        Information cards present a structured detail panel — a price breakdown
        or a chart — inline or inside a hover card.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Invoice breakdown" />
        <div className="w-[412px] max-w-full rounded-lg border border-border bg-fp-surface-1b p-6">
          <InvoiceCard />
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Chart cards" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BarChartCard />
          <DonutCard />
          <PaybackCard className="lg:col-span-2" />
        </div>
      </Stack>
    </Stack>
  );
}
