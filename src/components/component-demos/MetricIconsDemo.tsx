import { Stack, SectionHeading } from "@/components/typography";
import { MetricIcon, TERM_ICONS } from "@/components/ui/term-icons";

/**
 * Metric icons — one icon per term (deliveries, products, gallons, ship-tos),
 * one style, and the tile a figure card wears (DS ui §10k).
 */
export function MetricIconsDemo() {
  const items = [
    { key: "deliveries", label: "Deliveries", icon: TERM_ICONS.deliveries, value: "11" },
    { key: "products", label: "Products", icon: TERM_ICONS.products, value: "6" },
    { key: "gallons", label: "Gallons", icon: TERM_ICONS.gallons, value: "34,470" },
    { key: "shipTos", label: "Ship-tos", icon: TERM_ICONS.shipTos, value: "3" },
  ] as const;
  return (
    <Stack space="section" className="max-w-3xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        Wherever the app names <strong className="text-foreground">deliveries, products, gallons or ship-tos</strong>, it
        draws the same icon, in every module. One style: Lucide&apos;s 24 grid and round line, a soft fill of the
        icon&apos;s own colour, and a <strong className="text-foreground">wavy level</strong> for anything that holds
        liquid (the drum, the drop). On a metric card the icon sits in a 48px rounded tile of the accent at 6%,
        beside the figure, centred on it.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="The icons" />
        <div className="flex flex-wrap gap-6 text-accent-violet">
          {items.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <Icon className="size-12" strokeWidth={1.75} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="On a metric card" />
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-fp-surface-1b md:flex-row md:divide-x md:divide-y-0">
          {items.map(({ key, label, icon, value }) => (
            <section key={key} className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3">
              <h4 className="text-sm font-medium text-foreground">{label}</h4>
              <div className="flex items-center justify-between gap-3">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{value}</span>
                <MetricIcon icon={icon} />
              </div>
            </section>
          ))}
        </div>
      </Stack>
    </Stack>
  );
}
