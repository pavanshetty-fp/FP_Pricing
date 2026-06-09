import * as React from "react";
import { GalleryVerticalEnd, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { TablesLayout } from "@/components/tables-layout";
import { NavigationDrawer, PRICING_NAV } from "@/components/navigation-drawer";

type Demo = "tables" | "nav";

export function App() {
  const [demo, setDemo] = React.useState<Demo>("nav");
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Demo switcher (not part of the Figma frame) */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Button
          variant={demo === "nav" ? "default" : "outline"}
          onClick={() => setDemo("nav")}
        >
          Navigation Drawer
        </Button>
        <Button
          variant={demo === "tables" ? "default" : "outline"}
          onClick={() => setDemo("tables")}
        >
          Tables Layout
        </Button>
        {demo === "nav" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle drawer"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto"
          >
            <PanelLeft />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {demo === "tables" ? (
          <TablesLayout />
        ) : (
          <div className="flex h-full">
            <NavigationDrawer
              collapsed={collapsed}
              activeKey="pricing-setup"
              brand={{
                name: "Customer Pricing",
                icon: <GalleryVerticalEnd />,
                iconClassName: "bg-sidebar-primary",
              }}
              groups={[PRICING_NAV]}
              user={{
                name: "shadcn",
                email: "m@example.com",
                fallback: "SC",
              }}
            />
            <main className="min-w-0 flex-1 border-l border-border">
              <div className="flex h-12 items-center border-b border-border px-4">
                <h1 className="text-2xl font-semibold leading-none">Pricing Setup</h1>
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
