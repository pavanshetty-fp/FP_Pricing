import { CalendarDays } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
        <SectionHeading as="h3" title="Trigger states" />
        <p className="text-sm text-muted-foreground">
          The link-style trigger (Figma "Hover Card / Trigger"): plain by
          default, underlined on hover, ring on keyboard focus. Hover the
          account handle for the canonical preview card.
        </p>
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger variant="link">@nextjs</HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex gap-4">
              <Avatar>
                <AvatarImage src="https://github.com/vercel.png" alt="@nextjs" />
                <AvatarFallback>VC</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">@nextjs</h4>
                <p className="text-sm">
                  The React Framework – created and maintained by @vercel.
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-4" />
                  Joined December 2021
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Amount breakdown trigger" />
        <p className="text-sm text-muted-foreground">
          The same link trigger wired to a currency amount — as used in the
          Tables amount column.
        </p>
        <HoverCard openDelay={120} closeDelay={80}>
          <HoverCardTrigger variant="link" className="tabular-nums">
            $2.90
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
