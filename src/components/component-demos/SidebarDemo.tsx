import {
  Boxes,
  Inbox,
  File,
  Send,
  ArchiveX,
  Trash2,
  Search,
  Sparkles,
  Home,
  ChevronsUpDown,
  MoreHorizontal,
} from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

/** A fixed-height frame so the full-height sidebar layout reads inside the page. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[560px] overflow-hidden rounded-lg border border-border">
      <SidebarProvider className="min-h-0 h-full">{children}</SidebarProvider>
    </div>
  );
}

/* ----------------------------- Sidebar 09 -------------------------------- */

const RAIL_ICONS = [
  { icon: <Inbox />, label: "Inbox", active: true },
  { icon: <File />, label: "Drafts" },
  { icon: <Send />, label: "Sent" },
  { icon: <ArchiveX />, label: "Junk" },
  { icon: <Trash2 />, label: "Trash" },
];

const MAILS = [
  { name: "William Smith", subject: "Meeting Tomorrow", time: "09:34 AM", preview: "Hi team, just a reminder about our meeting tomorrow at 10 AM." },
  { name: "Sarah Johnson", subject: "Project Update", time: "10:45 AM", preview: "Thanks for the update. The progress looks great so far." },
  { name: "Michael Brown", subject: "Client Presentation", time: "11:30 AM", preview: "Hey everyone! I'm thinking of organizing a team outing this weekend." },
  { name: "Emily Davis", subject: "Team Brainstorming", time: "02:15 PM", preview: "I've reviewed the budget numbers you sent over. Can we set up a call?" },
  { name: "Daniel Wilson", subject: "Product Design Review", time: "03:45 PM", preview: "Suspendisse varius non neque molestie, eget fermentum elit tincidunt." },
];

/** Sidebar 09 — Figma (5198:1863): icon rail + mail-list sidebar + content inset. */
function MailExample() {
  return (
    <Frame>
      {/* Icon rail (the "Sidebar 16" 48px column) */}
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <Boxes className="size-4" />
        </div>
        {RAIL_ICONS.map((r) => (
          <button
            key={r.label}
            aria-label={r.label}
            className={
              "flex size-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent-hover " +
              (r.active ? "bg-sidebar-accent" : "")
            }
          >
            <span className="[&_svg]:size-4">{r.icon}</span>
          </button>
        ))}
        <div className="mt-auto">
          <Avatar className="size-8">
            <AvatarFallback className="text-[10px]">PS</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mail-list sidebar */}
      <Sidebar collapsible="none" className="w-[280px] border-r border-sidebar-border">
        <SidebarHeader className="gap-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Inbox</span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Unreads
              <Switch className="scale-90" />
            </label>
          </div>
          <SidebarInput placeholder="Search" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              {MAILS.map((m) => (
                <button
                  key={m.name}
                  className="flex w-full flex-col items-start gap-1 border-b border-sidebar-border p-3 text-left text-sm leading-tight transition-colors hover:bg-sidebar-accent-hover"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.time}</span>
                  </div>
                  <span className="text-xs font-medium">{m.subject}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {m.preview}
                  </span>
                </button>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Content inset */}
      <SidebarInset className="hidden items-center justify-center text-sm text-muted-foreground lg:flex">
        Select a message to read
      </SidebarInset>
    </Frame>
  );
}

/* ----------------------------- Sidebar 10 -------------------------------- */

const PRIMARY = [
  { icon: <Search />, label: "Search" },
  { icon: <Sparkles />, label: "Ask AI" },
  { icon: <Home />, label: "Home", active: true },
  { icon: <Inbox />, label: "Inbox" },
];

const GROUP_ONE = [
  "📊 Project Management & Task Tracking",
  "🍳 Family Recipe Collection & Meal Planning",
  "💪 Fitness Tracker & Workout Routines",
  "📚 Book Notes & Reading List",
  "🌱 Sustainable Gardening Tips & Plant Care",
  "🗣️ Language Learning Progress & Resources",
];

const GROUP_TWO = [
  "🏠 Personal Life Management",
  "💼 Professional Development",
  "🎨 Creative Projects",
  "🧹 Home Management",
  "🧳 Travel & Adventure",
];

/** Sidebar 10 — Figma (5198:1894): team-switcher header + grouped content menus. */
function GroupedExample() {
  return (
    <Frame>
      <Sidebar collapsible="none" className="w-64 border-r border-sidebar-border">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
                  <Boxes className="size-4" />
                </div>
                <div className="flex flex-1 flex-col text-left leading-tight">
                  <span className="font-semibold">Acme Inc</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            {PRIMARY.map((p) => (
              <SidebarMenuItem key={p.label}>
                <SidebarMenuButton isActive={p.active}>
                  {p.icon}
                  <span>{p.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {[GROUP_ONE, GROUP_TWO].map((items, gi) => (
            <SidebarGroup key={gi}>
              <SidebarGroupLabel>Group title</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((label) => {
                    const [emoji, ...rest] = label.split(" ");
                    return (
                      <SidebarMenuItem key={label}>
                        <SidebarMenuButton>
                          <span aria-hidden>{emoji}</span>
                          <span>{rest.join(" ")}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  <SidebarMenuItem>
                    <SidebarMenuButton className="text-sidebar-foreground/70">
                      <MoreHorizontal />
                      <span>More</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="gap-2">
                <Avatar className="size-7">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col text-left text-xs leading-tight">
                  <span className="font-medium">shadcn</span>
                  <span className="text-muted-foreground">m@example.com</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </Frame>
  );
}

/**
 * Sidebar showcase — Figma "Sidebar 09 / 10" (5198:1863 / 5198:1894). Two
 * compositions of the shadcn Sidebar family: a mail layout (icon rail +
 * mail-list sidebar + content inset) and a content-rich grouped sidebar.
 * Rendered with collapsible="none" so the full-height layout reads inside the
 * page; the primitive also supports offcanvas / icon collapse + a mobile sheet
 * at app-shell scale.
 */
export function SidebarDemo() {
  return (
    <Stack space="section" className="overflow-auto pb-10">
      <p className="max-w-prose text-sm text-muted-foreground">
        The <code className="text-foreground">Sidebar</code> family — a
        collapsible, provider-driven shell with header / content / footer,
        grouped menus, a rail and a mobile sheet.
      </p>

      <Stack space="title">
        <SectionHeading as="h3" title="Sidebar 09 — mail" />
        <MailExample />
      </Stack>

      <Stack space="title">
        <SectionHeading as="h3" title="Sidebar 10 — grouped" />
        <GroupedExample />
      </Stack>
    </Stack>
  );
}
