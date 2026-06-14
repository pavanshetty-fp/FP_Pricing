import { Boxes, BookOpen, LifeBuoy, Rocket, Sparkles } from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const COMPONENTS = [
  { title: "Alert Dialog", description: "A modal dialog that interrupts with important content." },
  { title: "Hover Card", description: "Sighted users preview content on hover." },
  { title: "Progress", description: "Displays an indicator showing completion progress." },
  { title: "Tabs", description: "Layered sections of content shown one at a time." },
  { title: "Tooltip", description: "A popup with information related to an element." },
  { title: "Input Group", description: "An input fused with inline or block addons." },
];

const SIMPLE = ["Overview", "Pricing", "Changelog", "Roadmap"];

const WITH_ICONS = [
  { title: "Getting started", icon: <Rocket /> },
  { title: "Documentation", icon: <BookOpen /> },
  { title: "Support", icon: <LifeBuoy /> },
  { title: "What's new", icon: <Sparkles /> },
];

/** Default link: title + description (Figma "Menu Link / Default"). */
function ListItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <NavigationMenuLink href="#">
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {children}
        </p>
      </NavigationMenuLink>
    </li>
  );
}

/**
 * Navigation Menu showcase — Figma "Navigation Menu" (209:1883). Triggers open
 * dropdown popovers in the documented content types: Custom featured card,
 * List with descriptions, Simple list, and Simple list with icons; plus a plain
 * link trigger.
 */
export function NavigationMenuDemo() {
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        <code className="text-foreground">NavigationMenu</code> is a horizontal
        bar of triggers that open dropdown popovers of links — the standard
        marketing / app top-nav pattern.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Top navigation" />
        <NavigationMenu>
          <NavigationMenuList>
            {/* Custom — featured card + links */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-2 md:w-[420px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-3">
                    <NavigationMenuLink
                      href="#"
                      className="flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none select-none focus:shadow-md"
                    >
                      <Boxes className="size-6 text-foreground" />
                      <div className="mt-4 mb-2 text-lg font-medium">
                        FP Design System
                      </div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        FleetPanda's shadcn spinoff — tokens, primitives and
                        screens.
                      </p>
                    </NavigationMenuLink>
                  </li>
                  <ListItem title="Introduction">
                    Re-usable components built on Radix UI and Tailwind.
                  </ListItem>
                  <ListItem title="Installation">
                    How to install dependencies and structure your app.
                  </ListItem>
                  <ListItem title="Typography">
                    Styles for headings, paragraphs, lists, etc.
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* List — title + description, 2 columns */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Components</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-2 p-1 md:w-[500px] md:grid-cols-2">
                  {COMPONENTS.map((c) => (
                    <ListItem key={c.title} title={c.title}>
                      {c.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Simple list */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Product</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[220px] gap-1 p-1">
                  {SIMPLE.map((s) => (
                    <li key={s}>
                      <NavigationMenuLink href="#" className="font-medium">
                        {s}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Simple list with icon */}
            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[240px] gap-1 p-1">
                  {WITH_ICONS.map((r) => (
                    <li key={r.title}>
                      <NavigationMenuLink
                        href="#"
                        className="flex-row items-center gap-2 font-medium"
                      >
                        {r.icon}
                        {r.title}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Plain link (no dropdown) */}
            <NavigationMenuItem>
              <NavigationMenuLink href="#" className={cn(navigationMenuTriggerStyle())}>
                Docs
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Stack>
    </Stack>
  );
}
