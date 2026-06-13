import { CalendarDays } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InvoiceCard } from "@/components/info-cards";

/**
 * Hover Card showcase — Figma "Hover Card" (216:2886). The link-style trigger
 * states plus a canonical account-preview card and the amount-breakdown wiring.
 */
export function HoverCardDemo() {
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        A hover card surfaces contextual detail on pointer hover. The link-style
        trigger is plain by default, underlines on hover, and rings on keyboard
        focus.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Account preview" />
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
    </Stack>
  );
}
