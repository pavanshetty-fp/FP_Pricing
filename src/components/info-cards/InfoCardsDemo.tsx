import { Stack, SectionHeading } from "@/components/typography";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { InvoiceCard } from "./InvoiceCard";
import { BarChartCard, DonutCard, PaybackCard } from "./ChartCards";

/*
  Info Cards — Figma "Information Card & tooltip" (27597:62089). Showcases the
  information-card variants that surface on hover. The Invoice card is wired to
  the table's amount column; the rest are here for other scenarios.
*/
export function InfoCardsDemo() {
  return (
    <Stack space="section" className="overflow-auto">
      <p className="max-w-prose text-sm text-muted-foreground">
        Information cards surface contextual detail on hover. The Invoice
        breakdown is wired to the Tables amount column; hover the trigger below
        to preview it, and see the other card variants for further scenarios.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Hover trigger" />
        <p className="text-sm text-muted-foreground">
          Hover the amount to reveal the breakdown card.
        </p>
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="w-fit cursor-default rounded-md px-2 py-1 text-sm font-medium tabular-nums underline decoration-dotted underline-offset-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              $2.90
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="start" className="w-[380px]">
            <InvoiceCard />
          </HoverCardContent>
        </HoverCard>
      </Stack>

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
