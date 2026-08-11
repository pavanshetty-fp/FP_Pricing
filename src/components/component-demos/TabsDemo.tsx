import { Stack, SectionHeading } from "@/components/typography";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const TABS = [
  { value: "overview", label: "Overview", body: "A high-level summary of the account and recent activity." },
  { value: "analytics", label: "Analytics", body: "Charts and metrics for the selected period." },
  { value: "reports", label: "Reports", body: "Generated reports you can export or share." },
];

/**
 * Tabs showcase — Figma "Tabs" (21133:27311). Covers the documented Variant
 * (Default segmented / Line underline) and Orientation (horizontal / vertical).
 */
export function TabsDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Tabs</code> switch between sections of
        content. The list comes as a segmented pill (Default) or an underline
        (Line), in horizontal or vertical orientation.
      </p>

      {/* Default — segmented */}
      <Stack space="title">
        <SectionHeading as="h3" title="Default (segmented)" />
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
            {/* Disabled tab state */}
            <TabsTrigger value="archived" disabled>
              Archived
            </TabsTrigger>
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <p className="text-sm text-muted-foreground">{t.body}</p>
            </TabsContent>
          ))}
        </Tabs>
      </Stack>

      {/* Line — underline */}
      <Stack space="title">
        <SectionHeading as="h3" title="Line (underline)" />
        <Tabs defaultValue="overview" className="w-full">
          <TabsList variant="line" className="border-b border-border">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="pt-2">
              <p className="text-sm text-muted-foreground">{t.body}</p>
            </TabsContent>
          ))}
        </Tabs>
      </Stack>

      {/* Vertical */}
      <Stack space="title">
        <SectionHeading as="h3" title="Vertical" />
        <Tabs defaultValue="overview" orientation="vertical" className="w-full">
          <TabsList variant="line" className="border-r border-border">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="px-2">
              <p className="text-sm text-muted-foreground">{t.body}</p>
            </TabsContent>
          ))}
        </Tabs>
      </Stack>
    </Stack>
  );
}
