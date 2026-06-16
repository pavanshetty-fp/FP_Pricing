import { ChevronRight } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Stack, SectionHeading } from "@/components/typography";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  { q: "Is it accessible?", a: "Yes. It adheres to the WAI-ARIA design pattern." },
  { q: "Is it styled?", a: "Yes. It comes with default styles that match the rest of the DS." },
  { q: "Is it animated?", a: "Yes, with a smooth height transition you can disable." },
];

const ITEMS = [
  { title: "Shipment #SHP-20481", body: "Origin Chicago, IL → Atlanta, GA. Carrier XPO Logistics. ETA Jun 3." },
  { title: "Shipment #SHP-20482", body: "Origin Dallas, TX → Phoenix, AZ. Carrier Knight-Swift. ETA Jun 5." },
  { title: "Shipment #SHP-20483", body: "Origin Newark, NJ → Boston, MA. Carrier Old Dominion. ETA Jun 4." },
];

/** FP content-layer accordion item — card surface, leading chevron, inline metadata. */
function FpAccordionItem({
  value,
  title,
  body,
}: {
  value: string;
  title: string;
  body: string;
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="overflow-hidden rounded-md border border-border bg-fp-surface-1a"
    >
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
          className={cn(
            "group flex w-full items-center gap-2 px-4 py-4 text-left text-sm outline-none transition-colors",
            "hover:bg-fp-surface-1b focus-visible:ring-2 focus-visible:ring-ring/50"
          )}
        >
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
          <span className="font-semibold text-foreground">{title}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1 rounded-full bg-muted-foreground/60" />
            data 1
            <span className="size-1 rounded-full bg-muted-foreground/60" />
            data 2
          </span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="border-t border-border px-4 py-4 text-muted-foreground">
          {body}
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

/**
 * Accordion showcase — Figma "Accordion & Content Layer Behaviour" (28099:192).
 * The base shadcn accordion plus the FP content-layer variant: stacked cards
 * with a leading chevron, a title, and inline metadata points, collapsed by
 * default. In a real screen these sit below the action bar and tabs.
 */
export function AccordionDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Accordion</code> shows collapsible
        sections. The FP content-layer variant renders each section as a card
        with a title + inline summary data, collapsed by default.
      </p>

      {/* Base shadcn accordion */}
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Stack>

      {/* FP content-layer card variant */}
      <Stack space="title">
        <SectionHeading as="h3" title="Content-layer cards" />
        <p className="-mt-1 text-xs text-muted-foreground">
          Stacked cards; multiple can be open. In a screen these sit under the
          action bar and tabs.
        </p>
        <AccordionPrimitive.Root
          type="multiple"
          defaultValue={["card-0"]}
          className="flex flex-col gap-3"
        >
          {ITEMS.map((it, i) => (
            <FpAccordionItem
              key={i}
              value={`card-${i}`}
              title={it.title}
              body={it.body}
            />
          ))}
        </AccordionPrimitive.Root>
      </Stack>
    </Stack>
  );
}
